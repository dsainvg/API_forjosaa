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
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`CSV file not found at path: ${filePath}`);
      console.error(`Current directory: ${__dirname}`);
      console.error(`Available files: ${fs.readdirSync(__dirname).join(', ')}`);
      return reject(new Error(`CSV file not found at path: ${filePath}`));
    }
    
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`Loaded ${results.length} records from CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`Error reading CSV: ${error.message}`);
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
    console.log('Starting data initialization...');
    console.log(`Current directory: ${__dirname}`);
    console.log(`Looking for CSV file: ${CSV_FILE_PATH}`);
    
    // For Vercel deployment - handle both absolute and relative paths
    let dataFile;
    if (path.isAbsolute(CSV_FILE_PATH)) {
      dataFile = CSV_FILE_PATH;
    } else {
      dataFile = path.join(__dirname, CSV_FILE_PATH);
    }
    
    console.log(`Full path to data file: ${dataFile}`);
    
    const startTime = Date.now();
    records = await loadCSVData(dataFile);
    const endTime = Date.now();
    
    memoryUsage = calculateMemoryUsage();
    dataStats = calculateDataStats();
    dataLoaded = true;
    
    console.log('Data initialized successfully');
    console.log('Data loading time:', `${(endTime - startTime) / 1000} seconds`);
    console.log('Memory usage:', memoryUsage);
    console.log('Data stats:', dataStats);
  } catch (error) {
    console.error('Failed to initialize data:', error);
    console.error(error.stack);
    // Set dataLoaded to false so it will try again on next request
    dataLoaded = false;
    // Still throw the error to be caught by error handlers
    throw error;
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

app.get('/api/check', async (req, res) => {
  try{
    if (!dataLoaded) {
      await initData();
    }
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Please provide an ID to check.' });
    }
    const result = records.filter(r => r['Id'] === id);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to initialize data' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    // Ensure data is loaded before proceeding
    if (!dataLoaded) {
      await initData();
    }
    
    // Explicitly parse integer query parameters
    const resver = req.query.resver || 'O';
    const gend = req.query.gend || 'M';
    const stid = req.query.stid !== undefined ? parseInt(req.query.stid) : 0;
    const adv = req.query.adv !== undefined ? parseInt(req.query.adv) : 0;
    const tolaran = req.query.tolaran !== undefined ? parseFloat(req.query.tolaran) : 2.5;
    const main = req.query.main;
    const reqlen = req.query.reqlen !== undefined ? parseInt(req.query.reqlen) : 20;

    if (!resver || !gend || isNaN(stid) || isNaN(adv) || isNaN(tolaran) || !main || isNaN(reqlen)) {
      return res.status(400).json({ error: 'Please provide valid query parameters.' });
    }

    let mainrank = parseInt(main);
    if (isNaN(mainrank)) {
      return res.status(400).json({ error: 'Value must be a number.' });
    }
    
    let mainrankcorrected; // Calculate tolerance-adjusted value
    let advrankcorrected ;
    if (gend === "F"){
      mainrankcorrected = parseInt(mainrank*(100-2*tolaran)/100);
      advrankcorrected = parseInt(adv*(100-2*tolaran)/100);
    }
    else{
      mainrankcorrected = parseInt(mainrank*(100-tolaran)/100);
      advrankcorrected = parseInt(adv*(100-tolaran)/100);
    }
    
    const reservations = {
      'O':'OPEN',
      'E': 'EWS', 
      'ON':'OBC-NCL',
      'SC': 'SC', 
      'ST':'ST', 
      'OP':'OPEN (PwD)',
      'ONP':'OBC-NCL (PwD)',
      'EP': 'EWS (PwD)', 
      'SCP':'SC (PwD)',
      'STP': 'ST (PwD)'
    };
    
    const genders = {
      'M' : 'Gender-Neutral',
      'F' : "Female-only (including Supernumerary)"
    };
    
    let results = {"adv": [], "mains": []};
    
    // Filter according to the logic using the in-memory records
    if (adv) { // Advanced institutions (IITs)
      results['adv'] = records.filter(row => {
        return row['Type'] === 'IIT' && 
              row['Quota'] === 'AI' &&
              row['SeatType'] === reservations[resver] &&
              (gend === 'F' || row['Gender'] === genders[gend]) &&
              parseInt(row['ClosingRank']) >= advrankcorrected;
      });
    }
    results['mains'] = records.filter(row => {
        const rowStateId = parseInt(row['StateId']);
        return row['Type'] !== 'IIT' && 
              (row['Quota'] === 'AI' || rowStateId === stid) &&
              row['SeatType'] === reservations[resver] &&
              (gend === 'F' || row['Gender'] === genders[gend]) &&
              parseInt(row['ClosingRank']) >= mainrankcorrected;
      });
    
    
    // Sort results by ClosingRank (ascending), then OpeningRank (ascending) for tiebreakers
    results['adv'].sort((a, b) => {
      const aClosing = parseInt(a['ClosingRank']);
      const bClosing = parseInt(b['ClosingRank']);
      if (aClosing !== bClosing) return aClosing - bClosing;
      const aOpening = parseInt(a['OpeningRank']);
      const bOpening = parseInt(b['OpeningRank']);
      return aOpening - bOpening;
    });
    results['mains'].sort((a, b) => {
      const aClosing = parseInt(a['ClosingRank']);
      const bClosing = parseInt(b['ClosingRank']);
      if (aClosing !== bClosing) return aClosing - bClosing;
      const aOpening = parseInt(a['OpeningRank']);
      const bOpening = parseInt(b['OpeningRank']);
      return aOpening - bOpening;
    });
    const len1 = Math.min(reqlen, results['adv'].length); // Limit to top results
    const len2 = Math.min(reqlen, results['mains'].length); // Limit to top results
    if (len1 + len2 === 0) {
      return res.status(404).json({ error: 'No results found for the given criteria.' });
    }
    // Return top results
    return res.json({
      adv: results['adv'].slice(0, len1),
      mains: results['mains'].slice(0, len2)
    });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined 
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.path} does not exist`
  });
});

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initData().catch(err => {
      console.error('Failed to initialize data during startup:', err);
    });
  });
}

// For Vercel serverless deployment
module.exports = app;