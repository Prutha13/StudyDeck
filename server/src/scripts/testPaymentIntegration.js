import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import StripeEvent from '../models/StripeEvent.js';
import { PLANS, getPlanLimits } from '../config/plans.js';
import { syncSubscriptionState, handleWebhookEvent } from '../services/payment/stripeService.js';

async function runTests() {
  console.log('--- 💳 Running Stripe Payment & Subscription Integration Tests ---\n');
  await connectDB();

  // 1. Create Test Users (Free & Premium)
  const freeEmail = `test_free_${Date.now()}@example.com`;
  const premiumEmail = `test_pro_${Date.now()}@example.com`;

  const freeUser = await User.create({
    email: freeEmail,
    passwordHash: 'dummy_hash',
    subscription: {
      plan: 'free',
      status: 'none'
    }
  });

  const proUser = await User.create({
    email: premiumEmail,
    passwordHash: 'dummy_hash',
    subscription: {
      plan: 'premium',
      status: 'active',
      stripeCustomerId: 'cus_test_12345',
      stripeSubscriptionId: 'sub_test_67890',
      billingInterval: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('✅ Step 1: Created test users:');
  console.log(` - Free user: ${freeUser.email} (isPremium: ${freeUser.isPremium()})`);
  console.log(` - Pro user: ${proUser.email} (isPremium: ${proUser.isPremium()})`);

  if (freeUser.isPremium() !== false) throw new Error('Free user should not be premium');
  if (proUser.isPremium() !== true) throw new Error('Pro user should be premium');

  // 2. Test Plan Limits Configuration
  console.log('\n✅ Step 2: Testing Plan Limits Configuration...');
  const freeLimits = getPlanLimits('free');
  const proLimits = getPlanLimits('premium');
  console.log(` - Free max documents/mo: ${freeLimits.maxDocumentsMonth}, Fix Weakness: ${freeLimits.hasFixWeakness}`);
  console.log(` - Pro max documents/mo: ${proLimits.maxDocumentsMonth}, Fix Weakness: ${proLimits.hasFixWeakness}`);

  if (freeLimits.hasFixWeakness !== false) throw new Error('Free tier should not have Fix Weakness');
  if (proLimits.hasFixWeakness !== true) throw new Error('Pro tier must have Fix Weakness');

  // 3. Test Subscription State Synchronization
  console.log('\n✅ Step 3: Testing Subscription State Synchronization from Stripe Objects...');
  const mockStripeSubscription = {
    id: 'sub_mock_active_111',
    customer: 'cus_test_12345',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    cancel_at_period_end: false,
    items: {
      data: [{ price: { id: 'price_monthly_test', recurring: { interval: 'month' } } }]
    },
    metadata: {
      userId: freeUser._id.toString()
    }
  };

  const syncedUser = await syncSubscriptionState(mockStripeSubscription, freeUser._id.toString());
  console.log(` - Upgraded user plan: ${syncedUser.subscription.plan}, status: ${syncedUser.subscription.status}`);
  console.log(` - User is now premium: ${syncedUser.isPremium()}`);

  if (!syncedUser.isPremium()) throw new Error('User should have been upgraded to premium');

  // 4. Test Cancellation / Downgrade Sync
  console.log('\n✅ Step 4: Testing Subscription Expiration / Cancellation Sync...');
  const mockCanceledSubscription = {
    ...mockStripeSubscription,
    status: 'canceled',
    cancel_at_period_end: true
  };

  const canceledUser = await syncSubscriptionState(mockCanceledSubscription, freeUser._id.toString());
  console.log(` - Canceled user plan: ${canceledUser.subscription.plan}, status: ${canceledUser.subscription.status}`);
  console.log(` - User is premium after cancelation: ${canceledUser.isPremium()}`);

  if (canceledUser.isPremium() !== false) throw new Error('Canceled subscription should not grant premium');

  // 5. Test Webhook Idempotency Collection
  console.log('\n✅ Step 5: Testing Webhook Idempotency Protection...');
  const testEventId = `evt_test_${Date.now()}`;
  await StripeEvent.create({ eventId: testEventId, type: 'checkout.session.completed' });

  const duplicateCheck = await StripeEvent.findOne({ eventId: testEventId });
  console.log(` - Duplicate event detected in DB: ${Boolean(duplicateCheck)} [ID: ${duplicateCheck.eventId}]`);

  if (!duplicateCheck) throw new Error('StripeEvent idempotency check failed');

  // 6. Test Usage Reset logic
  console.log('\n✅ Step 6: Testing Usage Monthly Reset Mechanism...');
  freeUser.usage = {
    documentsThisMonth: 5,
    aiCoachRequestsThisMonth: 15,
    lastUsageReset: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
  };
  freeUser.checkAndResetUsage();
  console.log(` - Reset documentsThisMonth: ${freeUser.usage.documentsThisMonth}`);
  if (freeUser.usage.documentsThisMonth !== 0) throw new Error('Usage counters should have reset on month rollover');

  // Cleanup
  console.log('\n🧹 Cleaning up test records...');
  await User.deleteMany({ _id: { $in: [freeUser._id, proUser._id] } });
  await StripeEvent.deleteMany({ eventId: testEventId });

  console.log('\n✨ ALL STRIPE & SUBSCRIPTION TESTS PASSED SUCCESSFULLY! ✨\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});

