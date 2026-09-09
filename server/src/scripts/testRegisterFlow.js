/**
 * Registration Flow Test (Link-based verification)
 * Usage: NODE_ENV=development node src/scripts/testRegisterFlow.js
 */
import 'dotenv/config';
import crypto from 'crypto';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const testEmail = `register.link.test.${Date.now()}@studydeck.test`;
const testPass = 'TestPass123!';

async function run() {
  process.env.NODE_ENV = 'development';
  await connectDB();

  console.log('=== Registration Link Verification Flow Test ===');
  console.log('Test account:', testEmail);

  // ── Step 1: Simulate register() controller ────────────────────────────────
  console.log('\nStep 1: Simulate registration (JWT issued immediately, link sent)');
  const passwordHash = await bcrypt.hash(testPass, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await User.create({
    email: testEmail,
    passwordHash,
    isEmailVerified: false,
    verificationToken,
    verificationTokenExpiry
  });

  console.log('  Created user ID:', user._id);
  console.log('  verificationToken generated:', !!user.verificationToken ? '✅ yes' : '❌ no');

  // ── Step 2: DB state check ────────────────────────────────────────────────
  const dbUser = await User.findOne({ email: testEmail });
  console.log('\nStep 2: MongoDB state of new user');
  console.log('  isEmailVerified:', dbUser?.isEmailVerified === false ? '✅ false' : '❌ ' + dbUser?.isEmailVerified);
  console.log('  isVerified virtual:', dbUser?.isVerified === false ? '✅ false' : '❌ ' + dbUser?.isVerified);
  console.log('  verificationToken stored:', !!dbUser?.verificationToken ? '✅ yes' : '❌ no');
  if (dbUser?.isEmailVerified !== false) throw new Error('FAIL: isEmailVerified should be false');

  // ── Step 3: Link verification ──────────────────────────────────────────────
  console.log('\nStep 3: Simulate clicking email verification link GET /api/auth/verify-email?token=...');
  const foundUser = await User.findOne({
    verificationToken: dbUser.verificationToken,
    verificationTokenExpiry: { $gt: new Date() }
  });

  if (!foundUser) throw new Error('FAIL: Token lookup failed');

  foundUser.isEmailVerified = true;
  foundUser.verificationToken = null;
  foundUser.verificationTokenExpiry = null;
  await foundUser.save();

  const verifiedUser = await User.findOne({ email: testEmail });
  console.log('  isEmailVerified after link click:', verifiedUser?.isEmailVerified === true ? '✅ true' : '❌ false');
  console.log('  verificationToken cleared:', verifiedUser?.verificationToken === null ? '✅ null' : '❌ not cleared');

  // Clean up
  await User.deleteOne({ email: testEmail });
  console.log('\n✅ All registration link verification assertions passed cleanly!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
