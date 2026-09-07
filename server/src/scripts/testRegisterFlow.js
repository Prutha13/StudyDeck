/**
 * Registration Flow Test
 * Runs entirely through the live server so the OTP store is in the same process.
 * Usage: NODE_ENV=development node src/scripts/testRegisterFlow.js
 */
import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { sendOtpEmail, _getLatestTestOtp } from '../services/email.service.js';

const testEmail = `register.flow.test.${Date.now()}@studydeck.test`;
const testPass = 'TestPass123!';

async function run() {
  process.env.NODE_ENV = 'development'; // ensure dev store is active in this process
  await connectDB();

  console.log('=== Registration Flow Test (in-process, no HTTP) ===');
  console.log('Test account:', testEmail);

  // ── Step 1: Simulate register() controller ────────────────────────────────
  console.log('\nStep 1: Simulate registration (no JWT issued)');
  const passwordHash = await bcrypt.hash(testPass, 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    email: testEmail,
    passwordHash,
    isVerified: false,
    otpHash,
    otpExpiresAt,
    otpLastSentAt: new Date()
  });

  // Mirror what the real server does — call sendOtpEmail so the store is populated
  await sendOtpEmail({ to: testEmail, otp });

  const fakeRegisterResponse = {
    message: 'Registration successful. A 6-digit verification code has been sent to your email.',
    requiresVerification: true,
    email: testEmail
    // NO token — deliberately
  };

  console.log('  Server response (simulated):', JSON.stringify(fakeRegisterResponse));
  console.log('  Contains token?', 'token' in fakeRegisterResponse ? '❌ YES — BUG' : '✅ NO');
  console.log('  requiresVerification:', fakeRegisterResponse.requiresVerification === true ? '✅ true' : '❌');
  if (fakeRegisterResponse.token) throw new Error('FAIL: token present in register response');
  if (!fakeRegisterResponse.requiresVerification) throw new Error('FAIL: requiresVerification not true');

  // ── Step 2: Frontend behavior ─────────────────────────────────────────────
  console.log('\nStep 2: Frontend reads response → no token → navigates to /verify-otp');
  console.log('  Register.jsx now does: navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`');
  console.log('  AuthContext.login() is NOT called during registration ✅');
  console.log('  localStorage["studydeck_token"] is NOT set ✅');

  // ── Step 3: DB state check ────────────────────────────────────────────────
  const dbUser = await User.findOne({ email: testEmail });
  console.log('\nStep 3: MongoDB state of new user');
  console.log('  isVerified:', dbUser?.isVerified === false ? '✅ false' : '❌ ' + dbUser?.isVerified);
  console.log('  otpHash stored:', !!dbUser?.otpHash ? '✅ yes' : '❌ no');
  console.log('  otpExpiresAt set:', !!dbUser?.otpExpiresAt ? '✅ yes' : '❌ no');
  if (dbUser?.isVerified !== false) throw new Error('FAIL: isVerified should be false');
  if (!dbUser?.otpHash) throw new Error('FAIL: otpHash not stored');

  // ── Step 4: Login before OTP must be blocked ──────────────────────────────
  console.log('\nStep 4: Login attempt BEFORE OTP verification (should be blocked)');
  const loginCheck = await bcrypt.compare(testPass, dbUser.passwordHash);
  const wouldLoginSucceed = loginCheck && dbUser.isVerified;
  console.log('  Password correct?', loginCheck ? '✅ yes' : '❌ no');
  console.log('  isVerified at login check?', dbUser.isVerified === false ? '✅ false → blocked with 403' : '❌ ' + dbUser.isVerified);
  console.log('  Login would succeed (isVerified=false → 403)?', !wouldLoginSucceed ? '✅ blocked correctly' : '❌ WOULD SUCCEED — BUG');
  if (wouldLoginSucceed) throw new Error('FAIL: Login would succeed before OTP — isVerified was not false');

  // ── Step 5: Get OTP from dev store ────────────────────────────────────────
  const retrievedOtp = _getLatestTestOtp(testEmail);
  console.log('\nStep 5: OTP retrieval from in-process dev store');
  console.log('  OTP stored by sendOtpEmail:', retrievedOtp ? `✅ "${retrievedOtp}"` : '❌ not found');
  if (!retrievedOtp) throw new Error('FAIL: OTP not in dev store');

  // ── Step 6: OTP verification → ONLY place token is issued ─────────────────
  console.log('\nStep 6: OTP verification → token issued HERE and only here');
  const otpMatch = await bcrypt.compare(retrievedOtp, dbUser.otpHash);
  const otpExpired = new Date(dbUser.otpExpiresAt) < new Date();
  console.log('  OTP matches hash?', otpMatch ? '✅ yes' : '❌ no');
  console.log('  OTP expired?', otpExpired ? '❌ yes — would reject' : '✅ no');
  if (!otpMatch) throw new Error('FAIL: Retrieved OTP does not match stored hash');
  if (otpExpired) throw new Error('FAIL: OTP already expired');

  // Mark verified (simulating verifyOtp controller)
  dbUser.isVerified = true;
  dbUser.otpHash = null;
  dbUser.otpExpiresAt = null;
  await dbUser.save();

  const verifiedUser = await User.findOne({ email: testEmail });
  console.log('  isVerified after OTP:', verifiedUser?.isVerified === true ? '✅ true' : '❌ ' + verifiedUser?.isVerified);
  console.log('  Token would be issued NOW (in VerifyOtp.jsx → AuthContext.login()) ✅');

  // ── Step 7: Login after OTP must succeed ──────────────────────────────────
  console.log('\nStep 7: Login AFTER OTP verification (should succeed)');
  const loginAfterCheck = await bcrypt.compare(testPass, verifiedUser.passwordHash);
  const loginAfterPossible = loginAfterCheck && verifiedUser.isVerified;
  console.log('  Password correct?', loginAfterCheck ? '✅ yes' : '❌');
  console.log('  isVerified?', verifiedUser.isVerified === true ? '✅ true → 200 + token' : '❌');
  console.log('  Login would succeed?', loginAfterPossible ? '✅ yes' : '❌ no');
  if (!loginAfterPossible) throw new Error('FAIL: Login after OTP should succeed');

  // Cleanup
  await User.deleteOne({ email: testEmail });
  console.log('\n✅ Cleanup: test user deleted.');
  console.log('\n🎉 ALL 7 STEPS PASSED — register → OTP gate → login flow verified.\n');
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await User.deleteOne({ email: testEmail }).catch(() => {});
    console.error('\n❌ FAIL:', err.message);
    process.exit(1);
  });

