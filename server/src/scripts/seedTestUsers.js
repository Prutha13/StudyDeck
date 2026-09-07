import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

async function seedTestUsers() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/studydeck';
  console.log('Connecting to MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);

  const testPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testPassword, salt);

  const now = new Date();
  const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  const usersToSeed = [
    {
      email: 'free@studydeck.test',
      passwordHash,
      isVerified: true,
      subscription: {
        plan: 'free',
        status: 'none',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        billingInterval: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      },
      usage: {
        documentsThisMonth: 0,
        aiCoachRequestsThisMonth: 0,
        lastUsageReset: now
      }
    },
    {
      email: 'pro@studydeck.test',
      passwordHash,
      isVerified: true,
      subscription: {
        plan: 'premium',
        status: 'active',
        stripeCustomerId: 'cus_test_pro_local',
        stripeSubscriptionId: 'sub_test_pro_local',
        stripePriceId: 'price_test_pro_monthly',
        billingInterval: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: futureExpiry,
        cancelAtPeriodEnd: false
      },
      usage: {
        documentsThisMonth: 0,
        aiCoachRequestsThisMonth: 0,
        lastUsageReset: now
      }
    }
  ];

  console.log('\n--- Seeding Test Users ---');
  for (const userData of usersToSeed) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      existing.passwordHash = userData.passwordHash;
      existing.isVerified = true;
      existing.subscription = userData.subscription;
      existing.usage = userData.usage;
      await existing.save();
      console.log(`Updated existing user: ${userData.email} (Plan: ${userData.subscription.plan}, Status: ${userData.subscription.status})`);
    } else {
      const created = await User.create(userData);
      console.log(`Created new user: ${created.email} (Plan: ${created.subscription.plan}, Status: ${created.subscription.status})`);
    }
  }

  // Verify accounts using the model's isPremium() method
  console.log('\n--- Verifying Access Control on Seeded Users ---');
  for (const u of usersToSeed) {
    const userDoc = await User.findOne({ email: u.email });
    console.log(`User: ${userDoc.email}`);
    console.log(`  - subscription.plan: "${userDoc.subscription.plan}"`);
    console.log(`  - subscription.status: "${userDoc.subscription.status}"`);
    console.log(`  - subscription.currentPeriodEnd: ${userDoc.subscription.currentPeriodEnd ? userDoc.subscription.currentPeriodEnd.toISOString() : 'null'}`);
    console.log(`  - isPremium(): ${userDoc.isPremium() ? 'YES (Pro Access)' : 'NO (Free Access)'}`);
  }

  console.log('\nSeed completed successfully!');
  await mongoose.disconnect();
}

seedTestUsers().catch((err) => {
  console.error('Failed to seed test users:', err);
  process.exit(1);
});

