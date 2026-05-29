# API for JOSAA

This is a comprehensive backend API serving JOSAA cutoff dataset efficiently.

## Features
- Provides REST endpoints to query and filter large datasets of opening and closing ranks for various institutes (IITs, NITs, IIITs, GFTIs) and academic programs.
- Integrates historical data and predicted 2026 data.
- Built with Express.js to be fully serverless-ready and easy to deploy on Vercel.

## Quick Start
You can run `npm install` followed by running `node app.js`.

By default, the API binds to port 3000 and serves from `2026_Predicted_Cutoffs.csv`.

## Endpoints
- `/api/records` - Fetch raw records with pagination.
- `/api/institutes` - List all unique institutes.
- `/api/programs` - List all unique academic programs.
- `/api/search` - Robust querying based on rank constraints and demographics.
- `/api/stats` - Summary counts of institutions, programs, and quotas.

## License
MIT License. See [LICENSE.md](LICENSE.md) for more details.
