// Load environment variables from .env file in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_FILE_PATH = process.env.CSV_FILE_PATH || '2024_data0.csv';

// Enable CORS with configuration from env variable
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));

// Apply rate limiting if configured
if (process.env.RATE_LIMIT) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT, 10), // limit each IP to defined number of requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.use(limiter);
}

// Store parsed data
let records = [];
let dataStats = {};
let memoryUsage = {};
let dataLoaded = false;

// Load and parse CSV data
function loadCSVData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`Loaded ${results.length} records from CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Calculate memory usage
function calculateMemoryUsage() {
  const usage = process.memoryUsage();
  
  return {
    rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`, // Resident Set Size
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`, // Total Size of Heap
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`, // Heap actually used
    external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`, // C++ objects bound to JS
    arrayBuffers: `${Math.round((usage.arrayBuffers || 0) / 1024 / 1024 * 100) / 100} MB`, // ArrayBuffers
    recordCount: records.length,
    estimatedRecordSize: records.length > 0 ? 
      `${Math.round((usage.heapUsed / records.length))} bytes per record (average)` : 
      'N/A'
  };
}

// Get data statistics
function calculateDataStats() {
  if (records.length === 0) return {};
  
  const institutes = new Set();
  const programs = new Set();
  const quotas = new Set();
  const genders = new Set();
  const states = new Set();
  
  records.forEach(record => {
    institutes.add(record.Institute);
    programs.add(record['Academic-Program-Name']);
    quotas.add(record.Quota);
    genders.add(record.Gender);
    if (record.State) states.add(record.State);
  });
  
  return {
    totalRecords: records.length,
    uniqueInstitutes: institutes.size,
    uniquePrograms: programs.size,
    uniqueQuotas: quotas.size,
    uniqueGenders: genders.size,
    uniqueStates: states.size
  };
}

// Initialize data
async function initData() {
  if (dataLoaded) return;
  
  try {
    const dataFile = path.join(__dirname, CSV_FILE_PATH);
    const startTime = Date.now();
    records = await loadCSVData(dataFile);
    const endTime = Date.now();
    
    memoryUsage = calculateMemoryUsage();
    dataStats = calculateDataStats();
    dataLoaded = true;
    
    console.log('Data initialized');
    console.log('Data loading time:', `${(endTime - startTime) / 1000} seconds`);
    console.log('Memory usage:', memoryUsage);
    console.log('Data stats:', dataStats);
  } catch (error) {
    console.error('Failed to initialize data:', error);
  }
}

// Middleware to ensure data is loaded
const ensureDataLoaded = async (req, res, next) => {
  if (!dataLoaded) {
    await initData();
  }
  next();
};

// API endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'JOSAA CSV API is running',
    endpoints: [
      '/api/memory-usage',
      '/api/stats',
      '/api/records/count',
      '/api/records',
      '/api/institutes',
      '/api/programs',
      '/api/search'
    ]
  });
});

app.get('/api/memory-usage', ensureDataLoaded, (req, res) => {
  memoryUsage = calculateMemoryUsage();
  res.json(memoryUsage);
});

app.get('/api/stats', ensureDataLoaded, (req, res) => {
  res.json(dataStats);
});

app.get('/api/records/count', ensureDataLoaded, (req, res) => {
  res.json({ count: records.length });
});

app.get('/api/records', ensureDataLoaded, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const page = parseInt(req.query.page) || 1;
  const start = (page - 1) * limit;
  const end = start + limit;
  
  res.json({
    total: records.length,
    page,
    limit,
    data: records.slice(start, end)
  });
});

app.get('/api/institutes', ensureDataLoaded, (req, res) => {
  const institutes = [...new Set(records.map(record => record.Institute))].sort();
  res.json(institutes);
});

app.get('/api/programs', ensureDataLoaded, (req, res) => {
  const programs = [...new Set(records.map(record => record['Academic-Program-Name']))].sort();
  res.json(programs);
});

app.get('/api/search', ensureDataLoaded, (req, res) => {
  let results = [...records];
  
  // Filter by various parameters if provided
  if (req.query.institute) {
    results = results.filter(r => r.Institute.toLowerCase().includes(req.query.institute.toLowerCase()));
  }
  
  if (req.query.program) {
    results = results.filter(r => r['Academic-Program-Name'].toLowerCase().includes(req.query.program.toLowerCase()));
  }
  
  if (req.query.quota) {
    results = results.filter(r => r.Quota === req.query.quota);
  }
  
  if (req.query.gender) {
    results = results.filter(r => r.Gender === req.query.gender);
  }
  
  if (req.query.state) {
    results = results.filter(r => r.State && r.State.toLowerCase().includes(req.query.state.toLowerCase()));
  }
  
  if (req.query.rank) {
    const rank = parseInt(req.query.rank);
    if (!isNaN(rank)) {
      results = results.filter(r => {
        const openingRank = parseFloat(r['Opening-Rank']) || Infinity;
        const closingRank = parseFloat(r['Closing-Rank']) || 0;
        return rank >= openingRank && rank <= closingRank;
      });
    }
  }
  
  const limit = parseInt(req.query.limit) || 100;
  const page = parseInt(req.query.page) || 1;
  const start = (page - 1) * limit;
  const end = start + limit;
  
  res.json({
    total: results.length,
    page,
    limit,
    data: results.slice(start, end)
  });
});

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initData();
  });
}

// For Vercel serverless deployment
module.exports = app;