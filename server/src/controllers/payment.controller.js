import User from '../models/User.js';
import { PLANS, getPlanLimits } from '../config/plans.js';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  handleWebhookEvent,
  getStripe,
  syncSubscriptionState
} from '../services/payment/stripeService.js';

export async function getPlans(req, res) {
  try {
    res.json({ plans: PLANS });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get plans' });
  }
}

export async function getSubscription(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.checkAndResetUsage();
    await user.save();

    const plan = user.subscription?.plan || 'free';
    const isPremium = user.isPremium();

    res.json({
      plan,
      status: user.subscription?.status || 'none',
      isPremium,
      billingInterval: user.subscription?.billingInterval || null,
      currentPeriodStart: user.subscription?.currentPeriodStart || null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
      hasStripeCustomerId: Boolean(user.subscription?.stripeCustomerId),
      usage: user.usage,
      limits: getPlanLimits(plan)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch subscription' });
  }
}

export async function createCheckout(req, res) {
  try {
    const { planInterval = 'monthly' } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const clientOrigin = req.headers.origin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

    const { sessionId, url } = await createCheckoutSession({
      user,
      planInterval,
      clientOrigin
    });

    res.json({ sessionId, url });
  } catch (err) {
    console.error('Create checkout failed:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create checkout session' });
  }
}

export async function verifySession(req, res) {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    const sessionUserId = session.client_reference_id || session.metadata?.userId;
    if (sessionUserId && sessionUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Checkout session does not belong to the authenticated user' });
    }

    let subscriptionActive = false;

    if (session.subscription) {
      const subscriptionObj = typeof session.subscription === 'object' && session.subscription !== null
        ? session.subscription
        : await stripe.subscriptions.retrieve(session.subscription);

      await syncSubscriptionState(subscriptionObj, req.user.id);

      const status = subscriptionObj.status;
      subscriptionActive = ['active', 'trialing'].includes(status);
    }

    res.json({
      verified: true,
      status: session.payment_status,
      subscriptionActive
    });
  } catch (err) {
    console.error('Verify session failed:', err.message);
    res.status(400).json({ error: err.message || 'Failed to verify checkout session' });
  }
}

export async function createPortal(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const clientOrigin = req.headers.origin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

    const { url } = await createCustomerPortalSession({
      user,
      clientOrigin
    });

    res.json({ url });
  } catch (err) {
    console.error('Create customer portal failed:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create billing portal session' });
  }
}

export async function webhookHandler(req, res) {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    const result = await handleWebhookEvent(req.body, signature);
    res.status(200).json(result);
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    res.status(err.status || 400).json({ error: err.message || 'Webhook processing failed' });
  }
}

