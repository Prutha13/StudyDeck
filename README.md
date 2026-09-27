# 📚 StudyDeck — Project Structure & Developer Guide

StudyDeck is a full-stack MERN application that transforms documents and lecture notes into AI-generated summaries, action items, and interactive quizzes using Google Gemini AI.

---

## 🗂️ Folder Structure Overview

```text
StudyDeck/
├── client/                     # Frontend (React 19 + Vite + Tailwind CSS v4)
│   ├── public/                 # Static assets (favicons, icons)
│   └── src/
│       ├── api/                # API client & backend service integration (client.js)
│       ├── assets/             # Images, logos, SVG files
│       ├── components/         # Reusable UI components (AppShell, StatusDot, etc.)
│       ├── context/            # React global state (AuthContext for user/JWT)
│       ├── pages/              # Route views (Login, Register, Dashboard, etc.)
│       ├── App.jsx             # Route definitions & PrivateRoute guards
│       ├── index.css           # Global design tokens (@theme colors & fonts)
│       └── main.jsx            # Application entry point
│
├── server/                     # Backend (Node.js + Express 5 + MongoDB Mongoose)
│   ├── .env                    # Environment variables (private, not committed)
│   ├── .env.example            # Template for required environment variables
│   └── src/
│       ├── app.js              # Express app entry point & route registration
│       ├── db.js               # MongoDB connection helper
│       ├── models/             # Mongoose schemas (User, Document, Summary)
│       ├── controllers/        # Request handlers (auth, documents, export)
│       ├── middleware/         # Custom middlewares (auth verification via JWT)
│       ├── services/           # Business logic & 3rd party APIs (Gemini, PDF, SSE)
│       ├── jobs/               # Background task pipelines (processDocument)
│       └── routes/             # Express API endpoint definitions
│
├── .gitignore                  # Git ignore rules for the root project
└── README.md                   # Project documentation & folder roadmap
```

---

## 🚀 How to Run the Project

### 1. Backend Setup
```bash
cd server
npm install
# Ensure .env has MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev              # starts on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev              # starts on http://localhost:5173
```
> **Note**: In local development, `client/vite.config.js` uses Vite's `server.proxy` to transparently route `/api` requests to `http://localhost:5000`. This proxy is strictly dev-only and is excluded from production static builds.

---

## 🔐 Authentication Setup

StudyDeck uses email and password authentication for user registration and sign in.

---

## 🌐 Production Deployment

Deploying StudyDeck involves hosting the backend API server, client static assets, and MongoDB database.

### 1. Client Build
Build the client into static HTML/CSS/JS assets:
```bash
cd client
npm install
npm run build
```
This generates the optimized bundle in `client/dist/`.
Set `VITE_API_URL=https://your-api-domain.com/api` in your frontend build environment (e.g. on Vercel) so API calls reach your hosted backend.

### 2. Server Deployment
- Recommended platform: [Render](https://render.com) (a `render.yaml` blueprint is included), [Railway](https://railway.app), or [Fly.io].
- Set `CLIENT_ORIGIN=https://your-frontend-domain.com` in server environment variables to enforce production CORS protection.
- Ensure all environment variables documented in `server/.env.example` (Database, JWT, Gemini, Stripe, and SMTP) are populated with real values.
- Comprehensive guides and checklists:
  - **[Deployment Guide](docs/DEPLOYMENT.md)**: Full step-by-step instructions.
  - **[Post-Deploy Smoke Test Checklist](docs/SMOKE_TEST.md)**: Manual verification flow for all features.
  - **[Stripe Test Mode Checklist](docs/STRIPE_TEST_CHECKLIST.md)**: Step-by-step payment verification.

---

## ⚠️ Known Limitations & Design Decisions

1. **Password Reset / Forgot Password**: Currently, only registration OTP verification is implemented. A dedicated forgot password flow (`POST /api/auth/forgot-password` and `POST /api/auth/reset-password`) is planned for a future release. Users needing password resets currently require manual administrative intervention.
2. **CORS Configuration**: By default in development, CORS reflects the incoming origin. When `CLIENT_ORIGIN` is configured in production, only the specified frontend origin is permitted to make cross-origin browser requests.
3. **Daily AI Coach Usage Quota Tracking**: While `maxDocumentsMonth: 5` is strictly enforced for Free users on upload, the `aiCoachDailyRequests: 15` limit is defined in `config/plans.js` but is currently not actively rate-limiting AI Coach interactions.

