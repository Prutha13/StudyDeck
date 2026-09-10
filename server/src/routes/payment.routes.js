import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getPlans,
  getSubscription,
  createCheckout,
  verifySession,
  createPortal,
  webhookHandler
} from '../controllers/payment.controller.js';

const router = express.Router();

// Public / info
router.get('/plans', getPlans);

// Webhook endpoint (unauthenticated, raw body required for Stripe signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// Authenticated user subscription management
router.get('/subscription', authMiddleware, getSubscription);
router.get('/verify-session', authMiddleware, verifySession);
router.post('/create-checkout-session', authMiddleware, createCheckout);
router.post('/create-portal-session', authMiddleware, createPortal);

export default router;

