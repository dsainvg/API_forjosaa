const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_FILE_PATH = path.join(__dirname, 'data', 'predicted_cutoffs_cleaned.csv');
let predictedRecords = [];
let loadPromise = null;

function loadPredictedData() {
  if (loadPromise) {
    return loadPromise;
  }

  console.log(`Loading predicted data from: ${CSV_FILE_PATH}`);

  loadPromise = new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => records.push(data))
      .on('end', () => {
        predictedRecords = records;
        console.log(`Loaded ${predictedRecords.length} predicted records from CSV`);
        resolve(predictedRecords);
      })
      .on('error', (error) => {
        console.error(`Error reading predicted CSV: ${error.message}`);
        loadPromise = null; // allow retry
        reject(error);
      });
  });

  return loadPromise;
}

module.exports = {
  loadPredictedData
};
