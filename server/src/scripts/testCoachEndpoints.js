import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { connectDB } from '../db.js';
import User from '../models/User.js';

async function testEndpoints() {
  await connectDB();
  const user = await User.findOne({ email: 'free@studydeck.test' });
  const token = jwt.sign({ id: user._id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const base = 'http://localhost:5000/api';
  console.log('Testing endpoints with token for:', user.email);

  try {
    // 1. Mistake book with status=all and status=undefined and no query
    const res1 = await fetch(`${base}/coach/mistakes`, { headers: { Authorization: `Bearer ${token}` } });
    const data1 = await res1.json();
    console.log('GET /coach/mistakes:');
    console.log('  Count:', data1.counts, 'Items returned:', data1.mistakes?.length);

    const res2 = await fetch(`${base}/coach/mistakes?status=all`, { headers: { Authorization: `Bearer ${token}` } });
    const data2 = await res2.json();
    console.log('GET /coach/mistakes?status=all:');
    console.log('  Count:', data2.counts, 'Items returned:', data2.mistakes?.length);

    const res3 = await fetch(`${base}/coach/mistakes?status=undefined`, { headers: { Authorization: `Bearer ${token}` } });
    const data3 = await res3.json();
    console.log('GET /coach/mistakes?status=undefined:');
    console.log('  Count:', data3.counts, 'Items returned:', data3.mistakes?.length);

    // 2. Knowledge Map
    const resKm = await fetch(`${base}/coach/knowledge-map`, { headers: { Authorization: `Bearer ${token}` } });
    const dataKm = await resKm.json();
    console.log('GET /coach/knowledge-map:');
    console.log('  Overall score:', dataKm.overallStats?.overallScore + '% across ' + dataKm.overallStats?.totalConcepts + ' concepts');
    console.log('  Subjects:', dataKm.subjects?.length);
    const sampleTopic = dataKm.subjects?.[0]?.topics?.[0];
    console.log('  Sample topic mastery:', sampleTopic?.name, '->', sampleTopic?.averageMastery + '%');

    // 3. Daily review
    const resDr = await fetch(`${base}/coach/daily-review`, { headers: { Authorization: `Bearer ${token}` } });
    const dataDr = await resDr.json();
    console.log('GET /coach/daily-review:');
    console.log('  Total due:', dataDr.totalDue, 'Estimated minutes:', dataDr.estimatedMinutes);
    console.log('  Items count:', dataDr.items?.length);

  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  process.exit(0);
}

testEndpoints();

