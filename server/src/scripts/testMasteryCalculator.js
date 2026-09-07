import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Concept from '../models/Concept.js';
import Mastery from '../models/Mastery.js';
import { recordConceptAttempt, getUserOverallMastery } from '../services/coach/masteryCalculator.js';

async function runTest() {
  console.log('--- Testing Phase 3 Student Mastery Tracking ---');
  await connectDB();

  const user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    throw new Error('Test user not found');
  }

  const concept = await Concept.findOne({ owner: user._id });
  if (!concept) {
    throw new Error('No test concept found. Run Phase 2 test first.');
  }

  console.log(`Testing mastery tracking on concept: ${concept.name} (${concept._id})`);

  // Clear previous test mastery
  await Mastery.deleteMany({ user: user._id, concept: concept._id });

  // 1. First attempt: Correct answer
  console.log('Step 1: Submitting correct answer...');
  let m1 = await recordConceptAttempt({
    userId: user._id,
    conceptId: concept._id,
    isCorrect: true,
    source: 'quiz',
    difficulty: 'medium'
  });
  console.log(`Result 1 -> Score: ${m1.score}%, Status: ${m1.status}, Attempts: ${m1.attempts}, Interval: ${m1.intervalDays} days`);

  // 2. Second attempt: Correct answer (should approach mastered)
  console.log('Step 2: Submitting second consecutive correct answer...');
  let m2 = await recordConceptAttempt({
    userId: user._id,
    conceptId: concept._id,
    isCorrect: true,
    source: 'quiz',
    difficulty: 'medium'
  });
  console.log(`Result 2 -> Score: ${m2.score}%, Status: ${m2.status}, Consecutive: ${m2.consecutiveCorrect}, Interval: ${m2.intervalDays} days`);

  // 3. Third attempt: Incorrect answer (should penalize and reset streak)
  console.log('Step 3: Submitting incorrect answer...');
  let m3 = await recordConceptAttempt({
    userId: user._id,
    conceptId: concept._id,
    isCorrect: false,
    source: 'quiz',
    difficulty: 'hard'
  });
  console.log(`Result 3 -> Score: ${m3.score}%, Status: ${m3.status}, Consecutive: ${m3.consecutiveCorrect}, Interval: ${m3.intervalDays} days`);

  // 4. Overall stats
  const overall = await getUserOverallMastery(user._id);
  console.log('User Overall Stats:', overall);

  console.log('--- Phase 3 Test Completed Successfully ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});

