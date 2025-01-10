# Grail Meter App

An AI-powered web application that evaluates the value and demand of thrifted clothing items using Google Gemini AI, Google Trends data, and marketplace analytics.

## Features

- Image upload/capture functionality
- AI-powered item recognition using Google Gemini
- Real-time trend analysis using Google Trends API
- Poshmark market analysis
- Dynamic Grail Score calculation
- Interactive visualizations and metrics

## Tech Stack

- Frontend: React with Material-UI
- Backend: FastAPI
- AI: Google Gemini API
- Data Storage: Redis for caching
- APIs: Google Trends, Poshmark scraping

## Project Structure
```
grail-meter/
├── frontend/           # React frontend application
│   ├── src/
│   └── package.json
├── backend/            # FastAPI backend application
│   ├── app/
│   ├── requirements.txt
│   └── .env
└── README.md
```

## Deployment Instructions

### Backend Deployment (Railway)

1. Create a Railway account at https://railway.app
2. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```
3. Login to Railway:
   ```bash
   railway login
   ```
4. Initialize Railway project in the backend directory:
   ```bash
   cd backend
   railway init
   ```
5. Add environment variables in Railway dashboard:
   - GEMINI_API_KEY
   - REDIS_URL (optional)
   - CORS_ORIGINS (your frontend URL)

6. Deploy to Railway:
   ```bash
   railway up
   ```

### Frontend Deployment (Vercel)

1. Create a Vercel account at https://vercel.com
2. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
3. Login to Vercel:
   ```bash
   vercel login
   ```
4. Deploy to Vercel from the frontend directory:
   ```bash
   cd frontend
   vercel
   ```
5. Add environment variables in Vercel dashboard:
   - VITE_API_URL (your Railway backend URL)

6. For production deployment:
   ```bash
   vercel --prod
   ```

## Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=your_redis_url
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.railway.app
