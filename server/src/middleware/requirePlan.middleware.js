import User from '../models/User.js';

/**
 * Reusable backend middleware that verifies the user's plan meets the required tier.
 * Usage:
 *   router.post('/pro-route', authMiddleware, requirePlan('pro'), handler);
 *   // Or directly:
 *   router.post('/pro-route', authMiddleware, requirePlan, handler);
 */
export function requirePlan(required = 'pro', res = null, next = null) {
  // If used directly as middleware without calling requirePlan(): e.g. router.get('/', requirePlan, handler)
  if (typeof next === 'function' && required && typeof required === 'object' && typeof res?.status === 'function') {
    return checkPlan('pro', required, res, next);
  }

  return (req, res, next) => {
    return checkPlan(required, req, res, next);
  };
}

async function checkPlan(requiredTier, req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Determine current plan from req.user (populated by authMiddleware) or fallback to DB lookup
    let currentPlan = req.user.plan;
    let isPro = req.user.isPremium;

    if (!currentPlan) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'User account not found' });
      }
      currentPlan = user.plan;
      isPro = user.isPremium();
    }

    const normalizedRequired = (requiredTier || 'pro').toLowerCase();
    const meetsRequirement =
      normalizedRequired === 'free' ||
      (normalizedRequired === 'pro' && (currentPlan === 'pro' || currentPlan === 'premium' || isPro));

    if (!meetsRequirement) {
      return res.status(403).json({
        error: 'This feature is exclusive to StudyDeck Pro members. Please upgrade to access it.',
        upgradeRequired: true,
        requiredPlan: normalizedRequired,
        currentPlan: currentPlan || 'free',
        pricingUrl: '/pricing'
      });
    }

    next();
  } catch (err) {
    console.error('requirePlan error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify plan permissions' });
  }
}

export default requirePlan;
