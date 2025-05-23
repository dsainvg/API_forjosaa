const express = require('express');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5895;

const file = path.join(__dirname, '2024_data0.csv');
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}
app.get('/search', (req, res) => {
  const {resver='O',gend = 'M',stid = 0 ,adv = 1, tolaran = 5 , value } = req.query;
  
  console.log(resver,gend,stid,adv,tolaran,value);
  if (!resver || !gend || isNaN(stid) || isNaN(adv) || isNaN(tolaran) || !value) {
    return res.status(400).json({ error: 'Please provide valid query parameters.' });
  }

  let valuerange = parseInt(value);
  if (isNaN(valuerange)) {
    return res.status(400).json({ error: 'Value must be a number.' });
  }
  let valuemax = parseInt(valuerange*(100-tolaran)/100);
  const reservations = {'O':['OPEN'],
                  'E': ['EWS','OPEN'], 
                  'ON':['OBC-NCL', 'OPEN'],
                  'SC': ['SC', 'OPEN'],
                  'ST':['ST', 'OPEN'],
                  'OP':['OPEN (PwD)', 'OPEN'],
                  'ONP':['OBC-NCL (PwD)','OBC-NCL', 'OPEN'],
                  'EP': ['EWS (PwD)', 'EWS', 'OPEN'],
                  'SCP':['SC (PwD)', 'SC', 'OPEN'],
                  'STP': ['ST (PwD)', 'ST', 'OPEN']};
  const genders = {
    'M' : 'Gender-Neutral',
    'F' : "Female-only (including Supernumerary)"
  }
  const results = {};
  for (let i = 0; i < reservations[resver].length; i++) {
    results[reservations[resver][i]] = [];
  }
  if (gend == 'F'){
    const resultsf = {};
  for (let i = 0; i < reservations[resver].length; i++) {
    resultsf[reservations[resver][i]] = [];
  }
  }

  fs.createReadStream(file)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      if(adv){
        if(row['Type']=='IIT' & row['Quota']=='AI'){
          if(row['Seat-Type'] in reservations[resver]){
            if(row['Gender']==genders[gend]){
              if(row['Opening-Rank']<valuerange & row['Closing-Rank']>=valuemax){
                results[row['Seat-Type']].push(row)
              }
            }
          }
        }
      }
      else{
        if(row['Type']!='IIT' &( row['Quota']=='AI' | (row['StateId']==stid))){
          if(row['Seat-Type'] in reservations[resver]){
            if(row['Gender']==genders[gend]){
              if(row['Opening-Rank']<valuerange & row['Closing-Rank']>=valuemax){
                results[row['Seat-Type']].push(row)
              }
            }
          }
        }
      }
      results.sort((a, b) => {
      const aRank = parseInt(a['Closing-Rank']);
      const bRank = parseInt(b['Closing-Rank']);
      return aRank - bRank;
    });
    })
    .on('end', () => {
      res.json(results);
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
