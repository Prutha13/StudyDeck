import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getPlans,
  getSubscription,
  createCheckout,
  createPortal
} from '../controllers/payment.controller.js';

const router = express.Router();

// Public / info
router.get('/plans', getPlans);

// Authenticated user subscription management
router.get('/subscription', authMiddleware, getSubscription);
router.post('/create-checkout-session', authMiddleware, createCheckout);
router.post('/create-portal-session', authMiddleware, createPortal);

export default router;

