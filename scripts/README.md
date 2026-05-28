# JOSAA Data Migration

This folder contains a Python script `migrate_data.py` designed to process `JOSAA_2026_Predicted_Cutoffs.csv` (from the unipillar-backend repository) and restructure it to perfectly match the target schema format of `2024_data0.csv` in `API_forjosaa`.

## Migration Rules (Old to New mapping)
- `Institute` -> `Institute`
- `branch_shortcut` & `degree_type` -> `AcademicProgramName`
- `Quota` -> `Quota`
- `Seat Type` -> `SeatType`
- `Gender` -> `Gender`
- `predicted_closing_rank_2026` -> `ClosingRank`
- `institute_type` -> `Type`
- `college_state` -> mapped to `State` and `StateId` using internal translation dictionary built from `2024_data0.csv`
- Empty or missing `OpeningRank` fields are set to `0`

## Execution Instructions
Ensure you have `pandas` installed:
`pip install pandas`

Then run the migration script:
`python scripts/migrate_data.py`

*(Note: During development the predicted file path inside `migrate_data.py` was set to `/tmp/unipillar-backend/data/JOSAA_2026_Predicted_Cutoffs.csv`. Adjust the input file path in the python script to wherever your source predicted cutoff CSV is located)*

## API Integration
To query the new predictions dataset instead of the default 2024 data:
Set the environment variable `CSV_FILE_PATH` to point to the new CSV.
For instance:
`export CSV_FILE_PATH="2026_Predicted_Cutoffs.csv"`

Or if deploying on Vercel, simply update `vercel.json`:
```json
  "env": {
    "CSV_FILE_PATH": "2026_Predicted_Cutoffs.csv",
    "NODE_ENV": "production"
  }
```
