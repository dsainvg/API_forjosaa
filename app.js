const express = require('express');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Use CORS middleware
app.use(cors());

// Use a relative path that works both locally and in deployment
const file = path.join(__dirname, process.env.CSV_FILE || '2024_data0.csv');
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

// Add a root route to check if the API is running
app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

app.get('/search', (req, res) => {
  // Explicitly parse integer query parameters
  const resver = req.query.resver || 'O';
  const gend = req.query.gend || 'M';
  const stid = req.query.stid !== undefined ? parseInt(req.query.stid) : 0;
  const adv = req.query.adv !== undefined ? parseInt(req.query.adv) : 1;
  const tolaran = req.query.tolaran !== undefined ? parseInt(req.query.tolaran) : 5;
  const value = req.query.value;


  if (!resver || !gend || isNaN(stid) || isNaN(adv) || isNaN(tolaran) || !value) {
    return res.status(400).json({ error: 'Please provide valid query parameters.' });
  }

  let valuerange = parseInt(value);
  if (isNaN(valuerange)) {
    return res.status(400).json({ error: 'Value must be a number.' });
  }
  
  let valuemax; // Declare valuemax here
  if (gend === "F"){
    valuemax = parseInt(valuerange*(100-3*tolaran)/100);
  }
  else{
    valuemax = parseInt(valuerange*(100-tolaran)/100);
  }
  const reservations = {'O':'OPEN',
                  'E': 'EWS', 
                  'ON':'OBC-NCL',
                  'SC': 'SC', 
                  'ST':'ST', 
                  'OP':'OPEN (PwD)',
                  'ONP':'OBC-NCL (PwD)',
                  'EP': 'EWS (PwD)', 
                  'SCP':'SC (PwD)',
                  'STP': 'ST (PwD)'};
  const genders = {
    'M' : 'Gender-Neutral',
    'F' : "Female-only (including Supernumerary)"
  }
  const results = [];

  fs.createReadStream(file)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      if(adv){ // Now adv will be 0 or 1 (or other integer), so if(0) is false, if(1) is true
        if(row['Type']==='IIT' && row['Quota']==='AI'){
          if(row['Seat-Type']===reservations[resver]){
            if(gend==='F' || row['Gender']===genders[gend]){
              const closingRank = parseInt(row['Closing-Rank']);
              if(closingRank>=valuemax){
                results.push(row)
              }
            }
          }
        }
      }
      else{
        // Ensure row['StateId'] is compared with stid as a number
        const rowStateId = parseInt(row['StateId']);
        if(row['Type']!=='IIT' && ( row['Quota']==='AI' || (rowStateId===stid))){
          if(row['Seat-Type']===reservations[resver]){
            if(gend==='F' || row['Gender']===genders[gend]){
              const closingRank = parseInt(row['Closing-Rank']);
              if(closingRank>=valuemax){
                results.push(row)
              }
            }
          }
        }
      }
    })
    .on('end', () => {
      // Sort results by Closing-Rank (ascending), then Opening-Rank (ascending) for tie-breakers
      results.sort((a, b) => {
        const aClosing = parseInt(a['Closing-Rank']);
        const bClosing = parseInt(b['Closing-Rank']);
        if (aClosing !== bClosing) return aClosing - bClosing;
        const aOpening = parseInt(a['Opening-Rank']);
        const bOpening = parseInt(b['Opening-Rank']);
        return aOpening - bOpening;
      });
      results.splice(0, 50); // Limit to top 50 results
      res.json(results);
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
