# 🚀 StudyDeck Production Deployment Guide

This guide covers deploying StudyDeck with:
- **Backend API Server**: [Render](https://render.com) (or Railway / Fly.io)
- **Frontend Client**: [Vercel](https://vercel.com) (or Netlify)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas)
- **AI Processing**: Google Gemini API
- **Billing**: Stripe (Test / Live Mode)
- **Transactional Email**: SMTP (Mailtrap, SendGrid, Postmark, AWS SES, or Gmail)

---

## 1. Database Setup (MongoDB Atlas)

1. Log into your MongoDB Atlas console and create a new cluster (M0 Free tier is sufficient to start).
2. Under **Security** > **Database Access**, create a database user (e.g. `studydeck_prod`) with read/write privileges.
3. Under **Security** > **Network Access**, add IP Access List entry `0.0.0.0/0` (Allow access from anywhere) so cloud server instances can connect.
4. Click **Connect** > **Drivers** > copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/studydeck?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment (Render)

A `render.yaml` blueprint is already included in the repository.

### Option A: Via Render Blueprint (Recommended)
1. In Render Dashboard, click **New +** > **Blueprint**.
2. Connect your Git repository. Render will automatically read `render.yaml`.
3. In the Render Dashboard under **Environment**, supply the required values for the environment variables listed below.

### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `studydeck-server`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Add the following **Environment Variables**:

| Variable Name | Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | Server listening port | `5000` (Render binds automatically) |
| `MONGO_URI` | MongoDB Atlas URI | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for signing auth tokens | 64+ char random string |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | From Google AI Studio |
| `CLIENT_ORIGIN` | Allowed client origin(s) for CORS | `https://your-app.vercel.app` |
| `STRIPE_SECRET_KEY` | Stripe Secret Key | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook signing secret | `whsec_...` (from Stripe dashboard) |
| `STRIPE_MONTHLY_PRICE_ID` | Monthly plan price ID | `price_...` |
| `STRIPE_YEARLY_PRICE_ID` | Yearly plan price ID | `price_...` |
| `SMTP_HOST` | Outgoing SMTP host | e.g. `smtp.sendgrid.net` |
| `SMTP_PORT` | Outgoing SMTP port | `587` or `465` |
| `SMTP_USER` | SMTP username / API key | e.g. `apikey` |
| `SMTP_PASS` | SMTP password / API secret | Provider password |
| `SMTP_FROM` | Sender address | `"StudyDeck" <noreply@yourdomain.com>` |

---

## 3. Frontend Deployment (Vercel)

The repository includes `client/vercel.json` with SPA route rewrites configured.

1. In Vercel Dashboard, click **Add New...** > **Project**.
2. Import your Git repository.
3. Configure the build settings:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variable**:

| Variable Name | Description | Example |
|---|---|---|
| `VITE_API_URL` | Full URL to your deployed backend API | `https://studydeck-server.onrender.com/api` |

5. Deploy! Once deployed, copy your production frontend URL (e.g. `https://studydeck.vercel.app`) and update the backend's `CLIENT_ORIGIN` environment variable on Render.

---

## 4. Stripe Webhook Configuration

1. In the [Stripe Dashboard](https://dashboard.stripe.com), navigate to **Developers** > **Webhooks**.
2. Click **Add destination / Add endpoint**.
3. **Endpoint URL**: `https://studydeck-server.onrender.com/api/payment/webhook`
4. **Events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Reveal the **Signing Secret** (`whsec_...`) and paste it as `STRIPE_WEBHOOK_SECRET` in your backend environment variables.

---

## 5. Post-Deployment Verification

Walk through `docs/SMOKE_TEST.md` to verify all end-to-end user journeys on production.

