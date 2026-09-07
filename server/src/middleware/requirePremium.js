import User from '../models/User.js';
import { PLANS } from '../config/plans.js';

/**
 * Middleware that restricts route access strictly to active StudyDeck Pro / Premium users.
 * Must be preceded by authMiddleware.
 */
export async function requirePremium(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    if (!user.isPremium()) {
      return res.status(403).json({
        error: 'This feature is exclusive to StudyDeck Pro members. Please upgrade to access it.',
        upgradeRequired: true,
        plan: user.subscription?.plan || 'free',
        pricingUrl: '/pricing'
      });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to verify subscription status' });
  }
}

/**
 * Middleware that enforces monthly document upload limits for Free tier users.
 */
export async function checkDocumentLimit(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    user.checkAndResetUsage();

    if (!user.isPremium()) {
      const freeLimit = PLANS.FREE.limits.maxDocumentsMonth;
      if ((user.usage?.documentsThisMonth || 0) >= freeLimit) {
        return res.status(403).json({
          error: `You have reached your Free tier limit of ${freeLimit} document uploads this month. Upgrade to StudyDeck Pro for unlimited uploads.`,
          upgradeRequired: true,
          limitReached: 'documents',
          currentUsage: user.usage.documentsThisMonth,
          limit: freeLimit,
          pricingUrl: '/pricing'
        });
      }
    }

    req.currentUser = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to check document limits' });
  }
}

