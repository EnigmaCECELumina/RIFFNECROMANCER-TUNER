# Tone Lab Riff

Tone Lab Riff is a React + FastAPI app for guitar/vocal practice, premium lessons, Stripe checkout, and a community-style dashboard.

## Local development

### Frontend

```bash
cd frontend
npm install
npm start
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

## Render deployment

This repository includes a Render blueprint for a backend service and a static frontend service.

1. Create a new Render project and connect this repository.
2. Render will read the included render.yaml file and create the services automatically.
3. Set the required environment variables for the backend service in Render:
   - MONGO_URL
   - DB_NAME
   - JWT_SECRET
   - STRIPE_SECRET_KEY
   - STRIPE_API_KEY
   - STRIPE_LOOKUP_KEY
   - STRIPE_WEBHOOK_SECRET
   - CORS_ORIGINS
4. The frontend service uses REACT_APP_BACKEND_URL at build time. Render sets this automatically in the blueprint.

## Notes

- Keep secrets in environment variables; do not commit real credentials.
- The frontend falls back to a same-origin /api path when no backend URL is supplied.
