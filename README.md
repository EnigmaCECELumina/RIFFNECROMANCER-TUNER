# RiffNecromancer

RiffNecromancer is a premium Drop D guitar training toolkit for alt-rock, grunge, and metal players. Built with React + FastAPI, featuring real-time tuning, drill mechanics, vocal control, and a live Tone Lab with WaveShaper distortion.

## Features

- **Real-time Tuner**: Drop D pitch detection via device microphone
- **Practice Drills**: Chug to gallop mechanics with progress tracking
- **Vocal Training**: Pitch and control exercises
- **Tone Lab**: WaveShaper distortion with live audio processing
- **Progress Altar**: Visual progress tracking and motivation
- **Premium Subscription**: Stripe checkout for premium content
- **Accessibility**: WCAG 2.1 Level AA compliant with visual modes for deaf/HoH musicians

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 24+
- MongoDB (local or cloud instance)

### Frontend

```bash
cd frontend
npm install
npm start
```

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your environment variables to .env
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables

Backend `.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=riffnecromancer
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Frontend `.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Authentication

- **Email/Password**: JWT-based authentication
- **Google OAuth**: Direct Google OAuth 2.0 integration
- **Forgot Password**: Secure password reset flow with time-limited tokens

## Deployment

### Render

This repository includes a Render blueprint for automated deployment.

1. Create a new Render project and connect this repository
2. Render will read the included `render.yaml` file and create services automatically
3. Set required environment variables in Render dashboard

### Manual Deployment

- **Frontend**: `npm run build` then deploy `build/` folder to any static host
- **Backend**: Deploy as a FastAPI application (e.g., Heroku, Railway, Render)

## Security Notes

- Never commit real credentials to the repository
- All secrets must be stored in environment variables
- `.env` files are gitignored
- JWT tokens are signed with a strong secret
- Passwords are hashed using bcrypt
- Stripe webhooks are validated with webhook secret

## Accessibility

RiffNecromancer is committed to WCAG 2.1 Level AA compliance:
- Screen-reader friendly navigation
- High-contrast visual modes for low-vision users
- Visual pitch indicators for deaf musicians
- Customizable audio/visual feedback for hard-of-hearing players

## License

© 2026 RIFFNECROMANCER. All Rights Reserved.
