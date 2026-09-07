import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import Document from './models/Document.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/documents.routes.js';
import coachRoutes from './routes/coach.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { webhookHandler } from './controllers/payment.controller.js';

const app = express();

const rawOrigins = process.env.CLIENT_ORIGIN || '';
const configuredOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, mobile)
    if (!origin) return callback(null, true);
    // In development or if CLIENT_ORIGIN is unset, reflect origin
    if (configuredOrigins.length === 0 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production with CLIENT_ORIGIN configured, verify against allowlist
    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  credentials: true
}));

// Stripe Webhook MUST receive raw Buffer body for signature verification before express.json()
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), webhookHandler);
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/payment', paymentRoutes);

// Central error handler — multer file-filter rejections land here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;

// Startup reconciliation: a document can only be in "pending" or "processing"
// while a job is actively running. If the server is just starting up and finds
// documents in these states, that job died with the previous process — most
// commonly `node --watch` (or nodemon) restarting mid-upload/mid-analysis
// during development, or a crash in production. Nothing else will ever move
// these documents forward, so mark them failed with a clear, honest reason
// instead of leaving them stuck on a spinner forever.
async function reconcileOrphanedJobs() {
  const result = await Document.updateMany(
    { status: { $in: ['pending', 'processing'] } },
    { status: 'failed', error: 'Interrupted by a server restart. Please re-analyze.' }
  );
  if (result.modifiedCount > 0) {
    console.log(`Reconciled ${result.modifiedCount} document(s) orphaned by a previous server restart.`);
  }
}

connectDB()
  .then(reconcileOrphanedJobs)
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });