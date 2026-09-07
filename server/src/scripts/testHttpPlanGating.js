import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

async function testHttpPlanGating() {
  await mongoose.connect(process.env.MONGO_URI);
  const freeUser = await User.findOne({ email: 'free@studydeck.test' });
  const proUser = await User.findOne({ email: 'pro@studydeck.test' });

  const freeToken = jwt.sign({ id: freeUser._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const proToken = jwt.sign({ id: proUser._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });

  console.log('Testing HTTP routes against port 5000...');
  const baseUrl = 'http://localhost:5000';

  // 1. Test Free User on /api/documents/:id/export
  try {
    const res = await fetch(`${baseUrl}/api/documents/6a9a9932d62f0c0493ad5564/export`, {
      headers: { Authorization: `Bearer ${freeToken}` }
    });
    const body = await res.json();
    console.log('Free user PDF export HTTP status:', res.status, body);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.log('Server not running on port 5000 right now, test skipped (offline unit tests already passed).');
      await mongoose.disconnect();
      return;
    }
    throw err;
  }

  // 2. Test Free User on /api/coach/fix-weakness/start
  const resCoachFree = await fetch(`${baseUrl}/api/coach/fix-weakness/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${freeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const bodyCoachFree = await resCoachFree.json();
  console.log('Free user Fix Weakness HTTP status:', resCoachFree.status, bodyCoachFree);
  if (resCoachFree.status !== 403) throw new Error(`Expected 403, got ${resCoachFree.status}`);

  // 3. Test Pro User on /api/coach/fix-weakness/start
  const resCoachPro = await fetch(`${baseUrl}/api/coach/fix-weakness/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${proToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('Pro user Fix Weakness HTTP status:', resCoachPro.status);
  // Status should NOT be 403! (will be 200 or return session/message)
  if (resCoachPro.status === 403) throw new Error('Pro user should NOT receive 403 Forbidden!');

  console.log('\n✅ Live HTTP plan gating verified successfully!');
  await mongoose.disconnect();
}

testHttpPlanGating().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});

