import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import Mistake from '../models/Mistake.js';
import Mastery from '../models/Mastery.js';

async function testPipeline() {
  await connectDB();
  const user = await User.findOne({ email: 'free@studydeck.test' });
  const doc = await Document.findOne({ owner: user._id });
  const token = jwt.sign({ id: user._id, email: user.email, plan: user.plan }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const base = 'http://localhost:5000/api';
  console.log('Testing End-to-End Quiz Flow for:', user.email);

  // 1. Diagnose a wrong answer
  console.log('\n--- Step 1: Answering question wrong ---');
  const diagnoseRes = await fetch(`${base}/coach/diagnose-mistake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      question: 'What is the time complexity of binary search on a sorted array of size n?',
      studentAnswer: 'O(n)',
      correctAnswer: 'O(log n)',
      options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'],
      conceptName: doc.title, // Test that even if doc title is passed, fuzzy matching finds the concept!
      documentId: doc._id.toString(),
      difficulty: 'medium'
    })
  });

  const diagData = await diagnoseRes.json();
  console.log('Diagnose response status:', diagnoseRes.status);
  console.log('Mistake concept linked:', diagData.mistake?.concept ? 'YES (' + diagData.mistake.conceptName + ')' : 'NO');
  console.log('Misconception detected:', diagData.diagnosis?.misconception);

  // Verify DB record
  const savedMistake = await Mistake.findById(diagData.mistake?._id);
  console.log('Saved mistake in DB conceptId:', savedMistake?.concept, 'topic:', savedMistake?.topic);

  // 2. Submit finished quiz attempt
  console.log('\n--- Step 2: Saving quiz attempt with answers ---');
  const attemptRes = await fetch(`${base}/documents/${doc._id}/quiz-attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      score: 1,
      total: 2,
      answers: [
        {
          question: 'What is the time complexity of binary search on a sorted array of size n?',
          studentAnswer: 'O(n)',
          correctAnswer: 'O(log n)',
          isCorrect: false,
          concept: 'Space and Time Complexity'
        },
        {
          question: 'Which notation represents the tight asymptotic bound?',
          studentAnswer: 'Theta notation',
          correctAnswer: 'Theta notation',
          isCorrect: true,
          concept: 'Asymptotic Notation'
        }
      ]
    })
  });

  const attemptData = await attemptRes.json();
  console.log('Attempt saved:', attemptData._id, 'score:', attemptData.score + '/' + attemptData.total);

  // 3. Verify Mistake Book
  console.log('\n--- Step 3: Verifying Mistake Book ---');
  const mistakesRes = await fetch(`${base}/coach/mistakes?status=all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const mistakesData = await mistakesRes.json();
  console.log('Mistake book counts:', mistakesData.counts);
  console.log('Mistakes array length:', mistakesData.mistakes?.length);
  const foundOurMistake = mistakesData.mistakes?.some(m => m.question.includes('binary search'));
  console.log('Newly diagnosed mistake visible in list:', foundOurMistake ? 'YES' : 'NO');

  // 4. Verify Knowledge Map
  console.log('\n--- Step 4: Verifying Knowledge Map ---');
  const kmRes = await fetch(`${base}/coach/knowledge-map`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const kmData = await kmRes.json();
  console.log('Overall mastery score:', kmData.overallStats?.overallScore + '%');
  console.log('Total concepts:', kmData.overallStats?.totalConcepts);

  // 5. Verify Daily Review
  console.log('\n--- Step 5: Verifying Daily Review Queue ---');
  const drRes = await fetch(`${base}/coach/daily-review`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const drData = await drRes.json();
  console.log('Daily review total due:', drData.totalDue);
  const foundInDaily = drData.items?.some(i => i.question?.includes('binary search') || i.conceptName?.includes('Complexity'));
  console.log('Relevant item queued for Daily Review:', foundInDaily ? 'YES' : 'NO');

  // Clean up the test mistake
  if (diagData.mistake?._id) {
    await Mistake.findByIdAndDelete(diagData.mistake._id);
    console.log('\nCleaned up test mistake:', diagData.mistake._id);
  }

  process.exit(0);
}

testPipeline().catch(err => {
  console.error('Test pipeline error:', err);
  process.exit(1);
});

