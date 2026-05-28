# API_forjosaa

A backend API service providing JOSAA cutoff data.

## Features
- Provides queryable endpoints for historical JOSAA data.
- Includes a dedicated `/api/predicted-cutoffs` endpoint for ML predicted JOSAA cutoffs for 2026.

## Installation & Usage
1. Clone the repository.
2. Install dependencies via `npm install`.
3. Start the server with `npm start` or `npm run dev`.

## Data
The data has been meticulously migrated, maintaining zero data loss.
The `/api/predicted-cutoffs` endpoint dynamically loads and queries the ML predicted dataset from the newly structured `data/predicted_cutoffs_cleaned.csv`.

## License
MIT
