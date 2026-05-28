# API for JOSAA

This is a comprehensive backend API serving JOSAA cutoff dataset efficiently.

## Features
- Provides REST endpoints to query and filter large datasets of opening and closing ranks for various institutes (IITs, NITs, IIITs, GFTIs) and academic programs.
- Integrates historical data and predicted 2026 data.
- Built with Express.js to be fully serverless-ready and easy to deploy on Vercel.

## Quick Start
You can run `npm install` followed by running `node app.js`.

By default, the API binds to port 3000 and serves from `2024_data0.csv`.

## Using Predicted 2026 Data
This repository includes a migration script that transforms the `unipillar-backend` predicted datasets into the standardized format this API uses.

1. Ensure the predicted dataset (`JOSAA_2026_Predicted_Cutoffs.csv`) is present in the root folder alongside `2024_data0.csv`.
2. Run the provided Python migration script (requires `pandas`):
   `pip install pandas`
   `python scripts/migrate_data.py`
   *This outputs a clean `2026_Predicted_Cutoffs.csv`.*

3. Start the API using the newly processed dataset:
   `export CSV_FILE_PATH="2026_Predicted_Cutoffs.csv"`
   `node app.js`

*See `scripts/README.md` for complete mapping and integration details.*

## Endpoints
- `/api/records` - Fetch raw records with pagination.
- `/api/institutes` - List all unique institutes.
- `/api/programs` - List all unique academic programs.
- `/api/search` - Robust querying based on rank constraints and demographics.
- `/api/stats` - Summary counts of institutions, programs, and quotas.

## License
MIT License. See [LICENSE.md](LICENSE.md) for more details.
