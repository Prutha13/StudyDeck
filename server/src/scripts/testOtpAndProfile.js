import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../db.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Auth & Profile Tests ---');
  await connectDB();

  // 1. Backfill any existing test users
  const backfillResult = await User.updateMany(
    { isVerified: { $exists: false } },
    { $set: { isVerified: true } }
  );
  console.log(`[Backfill] Updated ${backfillResult.modifiedCount} legacy users to isVerified: true`);

  const testEmail = `student_${Date.now()}@studydeck.test`;
  const testPassword = 'SecurePassword123!';

  // 2. Test Registration flow
  console.log(`\n[Test 1] Registering user: ${testEmail}`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const regData = await regRes.json();

  console.log('Registration response status:', regRes.status);
  console.log('Registration response body:', regData);

  if (regRes.status !== 201) throw new Error(`Expected 201, got ${regRes.status}`);
  if (!regData.token) throw new Error('Expected JWT token to be issued on registration');
  if (!regData.user || regData.user.email !== testEmail) throw new Error('Expected user data in registration response');

  // Verify User document state in MongoDB
  const createdUser = await User.findOne({ email: testEmail });
  if (!createdUser) throw new Error('User not found in MongoDB');
  if (createdUser.isVerified !== true) throw new Error('User.isVerified should be true');
  console.log('✔ MongoDB User verified: isVerified=true, account created');

  const authToken = regData.token;

  // 3. Test Login
  console.log('\n[Test 2] Logging in with email and password');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();

  console.log('Login status:', loginRes.status);
  if (loginRes.status !== 200) throw new Error(`Expected 200 OK, got ${loginRes.status}`);
  if (!loginData.token) throw new Error('Expected JWT token on login');
  console.log('✔ Email and password login verified successfully with 200');

  // 8. Test Profile Validation (Feature 2)
  console.log('\n[Test 7] Testing profile validation rules');

  // 8a. Name too short
  const shortNameRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ fullName: 'A', dob: '2000-01-01', educationLevel: 'Undergraduate' })
  });
  const shortNameData = await shortNameRes.json();
  console.log('Short name status:', shortNameRes.status, shortNameData.error);
  if (shortNameRes.status !== 400) throw new Error('Expected 400 for short name');

  // 8b. Numeric name
  const numericNameRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ fullName: '12345678', dob: '2000-01-01', educationLevel: 'Undergraduate' })
  });
  const numericNameData = await numericNameRes.json();
  console.log('Numeric name status:', numericNameRes.status, numericNameData.error);
  if (numericNameRes.status !== 400) throw new Error('Expected 400 for numeric name');

  // 8c. Underage DOB (e.g. 5 years old)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const underageRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fullName: 'Young Prodigy',
      dob: fiveYearsAgo.toISOString().slice(0, 10),
      educationLevel: 'Undergraduate'
    })
  });
  const underageData = await underageRes.json();
  console.log('Underage status:', underageRes.status, underageData.error);
  if (underageRes.status !== 400) throw new Error('Expected 400 for age < 13');

  // 8d. Invalid education level
  const invalidEduRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fullName: 'Alex Scholar',
      dob: '2001-03-20',
      educationLevel: 'Kindergarten'
    })
  });
  const invalidEduData = await invalidEduRes.json();
  console.log('Invalid education status:', invalidEduRes.status, invalidEduData.error);
  if (invalidEduRes.status !== 400) throw new Error('Expected 400 for invalid education level');

  // 8e. Valid profile update
  console.log('\n[Test 8] Submitting valid profile update');
  const validProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fullName: 'Alex Scholar',
      dob: '2002-04-12',
      educationLevel: 'Undergraduate',
      institution: 'Carnegie Mellon University'
    })
  });
  const validProfileData = await validProfileRes.json();
  console.log('Valid profile status:', validProfileRes.status);
  console.log('Valid profile user:', validProfileData.user);
  if (validProfileRes.status !== 200) throw new Error(`Expected 200 for valid profile, got ${validProfileRes.status}`);
  if (validProfileData.user.fullName !== 'Alex Scholar') throw new Error('fullName mismatch');
  if (validProfileData.user.educationLevel !== 'Undergraduate') throw new Error('educationLevel mismatch');
  if (validProfileData.user.institution !== 'Carnegie Mellon University') throw new Error('institution mismatch');

  // 8f. Check GET /api/auth/me returns the extended profile fields
  console.log('\n[Test 9] Verifying GET /api/auth/me returns extended profile fields');
  const getMeRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  const getMeData = await getMeRes.json();
  console.log('getMe status:', getMeRes.status);
  console.log('getMe profile:', {
    email: getMeData.user.email,
    isVerified: getMeData.user.isVerified,
    fullName: getMeData.user.fullName,
    dob: getMeData.user.dob,
    educationLevel: getMeData.user.educationLevel,
    institution: getMeData.user.institution
  });
  if (getMeRes.status !== 200) throw new Error('Expected 200 from getMe');
  if (getMeData.user.fullName !== 'Alex Scholar') throw new Error('fullName mismatch in getMe');
  if (getMeData.user.dob !== '2002-04-12') throw new Error('dob mismatch in getMe');
  if (getMeData.user.educationLevel !== 'Undergraduate') throw new Error('educationLevel mismatch in getMe');

  console.log('\n🎉 ALL AUTH & PROFILE TESTS PASSED SUCCESSFULLY! 🎉\n');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
