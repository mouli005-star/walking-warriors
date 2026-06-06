# BloodBridge

BloodBridge is an AI-powered blood coordination platform focused on managing blood donations and emergency transfusion cascades for Thalassemia patients.

## Current Status

This repository is currently in initial setup phase. The following elements have been created so far:

- `docker-compose.yml` for local development with PostgreSQL, LocalStack, and the FastAPI backend
- `backend/requirements.txt` with project Python dependencies
- `.env` for local environment variables
- `.gitignore` to exclude generated and sensitive files
- `backend/Dockerfile` for building the backend container
- `backend/app/models/models.py` with SQLAlchemy database models
- `backend/app/core/database.py` for SQLAlchemy engine and session configuration
- `backend/main.py` FastAPI entrypoint with health and root endpoints
- `scripts/seed_database.py` to seed the database from CSV data files

## Repository Structure

- `backend/`
  - `Dockerfile`
  - `requirements.txt`
  - `main.py`
  - `app/`
    - `core/database.py`
    - `models/models.py`
    - `api/` (empty starter package)
    - `services/` (empty starter package)
- `data/` - expected dataset files used by the seeding script
- `docker-compose.yml`
- `.env`
- `.gitignore`
- `scripts/seed_database.py`

## Local Development

1. Ensure Docker is running.
2. Create or verify `.env` is present with the required local values.
3. Start containers:

```bash
docker compose up --build
```

4. The backend should be available at `http://localhost:8000`.
5. Seed the database after the PostgreSQL container is ready:

```bash
python scripts/seed_database.py
```

6. Verify backend health:

```bash
curl http://localhost:8000/health
```

## Notes

- The backend currently creates database tables on startup.
- The seed script expects CSV files under `data/` such as `patients_clean.csv`, `donors_clean.csv`, `bridge_relationships.csv`, and `city_coverage.csv`.
- Future updates will expand APIs, backend services, and frontend integration.

## What’s Next

This README will be updated as development progresses to document completed features, architecture decisions, and usage instructions more fully.
