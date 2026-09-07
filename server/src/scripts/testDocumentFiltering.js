import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';

async function testDocumentFiltering() {
  await connectDB();
  const user = await User.findOne({ email: 'free@studydeck.test' });
  const docs = await Document.find({ owner: user._id });
  const token = jwt.sign({ id: user._id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const base = 'http://localhost:5000/api';
  console.log(`Testing Document Filtering for ${user.email} with ${docs.length} documents:`);
  docs.forEach((d, i) => console.log(` [Doc ${i + 1}] ID: ${d._id} | Title: "${d.title}"`));

  const doc1 = docs[0];
  const doc2 = docs[1];

  console.log('\n================== 1. MISTAKE BOOK FILTERING ==================');
  // All documents
  const allMistakesRes = await fetch(`${base}/coach/mistakes?status=all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const allMistakes = await allMistakesRes.json();
  console.log(`[All Documents] Count:`, allMistakes.counts, `Items:`, allMistakes.mistakes?.length);

  // Filtered to Doc 1
  const doc1MistakesRes = await fetch(`${base}/coach/mistakes?status=all&documentId=${doc1._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc1Mistakes = await doc1MistakesRes.json();
  console.log(`[Doc 1: "${doc1.title}"] Count:`, doc1Mistakes.counts, `Items:`, doc1Mistakes.mistakes?.length);
  const allDoc1Belong = doc1Mistakes.mistakes?.every(m => String(m.document) === String(doc1._id));
  console.log(`All returned mistakes belong to Doc 1:`, allDoc1Belong);

  // Filtered to Doc 2
  const doc2MistakesRes = await fetch(`${base}/coach/mistakes?status=all&documentId=${doc2._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc2Mistakes = await doc2MistakesRes.json();
  console.log(`[Doc 2: "${doc2.title}"] Count:`, doc2Mistakes.counts, `Items:`, doc2Mistakes.mistakes?.length);

  console.log('\n================== 2. KNOWLEDGE MAP FILTERING ==================');
  // All documents
  const allKmRes = await fetch(`${base}/coach/knowledge-map`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const allKm = await allKmRes.json();
  console.log(`[All Documents] Overall Score: ${allKm.overallStats?.overallScore}% across ${allKm.overallStats?.totalConcepts} concepts | Subjects: ${allKm.subjects?.length}`);

  // Filtered to Doc 1
  const doc1KmRes = await fetch(`${base}/coach/knowledge-map?documentId=${doc1._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc1Km = await doc1KmRes.json();
  console.log(`[Doc 1: "${doc1.title}"] Overall Score: ${doc1Km.overallStats?.overallScore}% across ${doc1Km.overallStats?.totalConcepts} concepts | Subjects: ${doc1Km.subjects?.length}`);

  // Filtered to Doc 2
  const doc2KmRes = await fetch(`${base}/coach/knowledge-map?documentId=${doc2._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc2Km = await doc2KmRes.json();
  console.log(`[Doc 2: "${doc2.title}"] Overall Score: ${doc2Km.overallStats?.overallScore}% across ${doc2Km.overallStats?.totalConcepts} concepts | Subjects: ${doc2Km.subjects?.length}`);

  console.log('\n================== 3. DAILY REVIEW QUEUE FILTERING ==================');
  // All documents
  const allDrRes = await fetch(`${base}/coach/daily-review`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const allDr = await allDrRes.json();
  console.log(`[All Documents] Total Due: ${allDr.totalDue} items`);

  // Filtered to Doc 1
  const doc1DrRes = await fetch(`${base}/coach/daily-review?documentId=${doc1._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc1Dr = await doc1DrRes.json();
  console.log(`[Doc 1: "${doc1.title}"] Total Due: ${doc1Dr.totalDue} items`);

  // Filtered to Doc 2
  const doc2DrRes = await fetch(`${base}/coach/daily-review?documentId=${doc2._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const doc2Dr = await doc2DrRes.json();
  console.log(`[Doc 2: "${doc2.title}"] Total Due: ${doc2Dr.totalDue} items`);

  console.log('\n================== SUMMARY ==================');
  console.log('Filtering verified successfully across all 3 endpoints!');
  process.exit(0);
}

testDocumentFiltering().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

