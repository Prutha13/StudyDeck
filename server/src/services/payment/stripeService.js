import Stripe from 'stripe';
import User from '../../models/User.js';
import StripeEvent from '../../models/StripeEvent.js';
import { PLANS } from '../../config/plans.js';

let stripeInstance = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured in server environment variables.');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia'
    });
  }
  return stripeInstance;
}

/**
 * Find or create a Stripe Customer for the authenticated user.
 */
export async function getOrCreateCustomer(user) {
  const stripe = getStripe();

  if (user.subscription?.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.subscription.stripeCustomerId);
      if (existing && !existing.deleted) {
        return existing.id;
      }
    } catch (err) {
      console.warn(`Could not retrieve existing Stripe customer (${user.subscription.stripeCustomerId}), creating fresh:`, err.message);
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      userId: user._id.toString(),
      appName: 'StudyDeck'
    }
  });

  user.subscription = user.subscription || {};
  user.subscription.stripeCustomerId = customer.id;
  await user.save();

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession({ user, planInterval = 'monthly', clientOrigin }) {
  const stripe = getStripe();
  const origin = clientOrigin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  if (!['monthly', 'yearly'].includes(planInterval)) {
    throw new Error('Invalid plan interval. Must be "monthly" or "yearly".');
  }

  const customerId = await getOrCreateCustomer(user);

  // Check for configured price IDs in env, or fallback to auto-pricing
  const priceId =
    planInterval === 'yearly'
      ? process.env.STRIPE_YEARLY_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

  let lineItem;
  if (priceId && !priceId.includes('placeholder') && !priceId.includes('your_')) {
    lineItem = {
      price: priceId,
      quantity: 1
    };
  } else {
    // Dynamic price data for test mode if price IDs are not yet created in Stripe dashboard
    const isYearly = planInterval === 'yearly';
    lineItem = {
      price_data: {
        currency: 'inr',
        product_data: {
          name: isYearly ? 'StudyDeck Pro (Yearly Plan)' : 'StudyDeck Pro (Monthly Plan)',
          description: isYearly
            ? 'Full access to AI Personal Learning Coach, unlimited documents, and deep remediation (Billed yearly).'
            : 'Full access to AI Personal Learning Coach, unlimited documents, and deep remediation (Billed monthly).'
        },
        unit_amount: isYearly ? PLANS.PREMIUM.priceINR.yearly * 100 : PLANS.PREMIUM.priceINR.monthly * 100,
        recurring: {
          interval: isYearly ? 'year' : 'month'
        }
      },
      quantity: 1
    };
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    billing_address_collection: 'auto',
    line_items: [lineItem],
    client_reference_id: user._id.toString(),
    success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel`,
    subscription_data: {
      metadata: {
        userId: user._id.toString(),
        planInterval
      }
    },
    metadata: {
      userId: user._id.toString(),
      planInterval
    }
  });

  return {
    sessionId: session.id,
    url: session.url
  };
}

/**
 * Create a Stripe Customer Billing Portal session for managing subscriptions & cards
 */
export async function createCustomerPortalSession({ user, clientOrigin }) {
  const stripe = getStripe();
  const origin = clientOrigin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  if (!user.subscription?.stripeCustomerId) {
    throw new Error('No Stripe billing profile found for this account. Please upgrade to a paid plan first.');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: `${origin}/settings/billing`
  });

  return {
    url: portalSession.url
  };
}

/**
 * Synchronize subscription status from a Stripe Subscription object
 */
export async function syncSubscriptionState(stripeSubscription, userIdHint = null) {
  let userId = stripeSubscription.metadata?.userId || userIdHint;

  let user;
  if (userId) {
    user = await User.findById(userId);
  } else if (stripeSubscription.customer) {
    user = await User.findOne({ 'subscription.stripeCustomerId': stripeSubscription.customer });
  }

  if (!user) {
    console.warn(`[STRIPE SYNC] No user found for subscription ${stripeSubscription.id} (customer: ${stripeSubscription.customer})`);
    return null;
  }

  const status = stripeSubscription.status; // 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'
  const isGoodStanding = ['active', 'trialing'].includes(status);

  // Safe timestamps
  const currentPeriodStart = stripeSubscription.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const planInterval =
    stripeSubscription.items?.data?.[0]?.price?.recurring?.interval === 'year'
      ? 'yearly'
      : 'monthly';

  const stripePriceId = stripeSubscription.items?.data?.[0]?.price?.id || null;

  user.subscription = {
    plan: isGoodStanding ? 'premium' : 'free',
    status: status,
    stripeCustomerId: stripeSubscription.customer,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: stripePriceId,
    billingInterval: planInterval,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end)
  };

  await user.save();
  console.log(`[STRIPE SYNC] Updated user ${user._id} subscription: plan=${user.subscription.plan}, status=${status}, cancelAtPeriodEnd=${user.subscription.cancelAtPeriodEnd}`);
  return user;
}

/**
 * Handle incoming Stripe Webhook events with signature verification & idempotency
 */
export async function handleWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    const error = new Error(`Webhook Signature Error: ${err.message}`);
    error.status = 400;
    throw error;
  }

  console.log(`[STRIPE WEBHOOK] Received event: ${event.type} [ID: ${event.id}]`);

  // Idempotency check: avoid double processing if Stripe redelivers
  const alreadyProcessed = await StripeEvent.findOne({ eventId: event.id });
  if (alreadyProcessed) {
    console.log(`[STRIPE WEBHOOK] Event ${event.id} was already processed at ${alreadyProcessed.processedAt}. Skipping.`);
    return { received: true, alreadyProcessed: true };
  }

  // Record event before processing
  await StripeEvent.create({
    eventId: event.id,
    type: event.type
  });

  const dataObject = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (dataObject.mode === 'subscription') {
        const subscriptionId = dataObject.subscription;
        const userId = dataObject.client_reference_id || dataObject.metadata?.userId;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionState(subscription, userId);
        }
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await syncSubscriptionState(dataObject);
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription was canceled/ended
      const customerId = dataObject.customer;
      const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
      if (user) {
        user.subscription.plan = 'free';
        user.subscription.status = 'canceled';
        user.subscription.cancelAtPeriodEnd = false;
        await user.save();
        console.log(`[STRIPE WEBHOOK] Subscription deleted for user ${user._id}. Downgraded to free.`);
      }
      break;
    }

    case 'invoice.paid': {
      const subscriptionId = dataObject.subscription;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionState(subscription);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const subscriptionId = dataObject.subscription;
      if (subscriptionId) {
        const customerId = dataObject.customer;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (user) {
          user.subscription.status = 'past_due';
          await user.save();
          console.warn(`[STRIPE WEBHOOK] Invoice payment failed for user ${user._id}. Status set to past_due.`);
        }
      }
      break;
    }

    default:
      console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
  }

  return { received: true, eventType: event.type };
}

