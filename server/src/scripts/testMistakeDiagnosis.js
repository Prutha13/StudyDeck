import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Concept from '../models/Concept.js';
import Mistake from '../models/Mistake.js';
import { diagnoseAndRecordMistake, submitMistakeRetest } from '../services/coach/mistakeDiagnosis.js';

async function runTest() {
  console.log('--- Testing Phase 4 & 5 Mistake Book & AI Diagnosis ---');
  await connectDB();

  const user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    throw new Error('Test user not found');
  }

  // Clear previous test mistakes
  await Mistake.deleteMany({ user: user._id });

  console.log('Step 1: Diagnosing a student mistake on Deadlock conditions...');
  const { mistake, diagnosis } = await diagnoseAndRecordMistake({
    userId: user._id,
    question: 'Which condition is necessary for deadlock where a process holds resources while waiting for more?',
    studentAnswer: 'Circular Wait',
    correctAnswer: 'Hold and Wait',
    options: ['Hold and Wait', 'Circular Wait', 'Mutual Exclusion', 'No Preemption'],
    conceptName: 'Deadlock Conditions',
    difficulty: 'medium'
  });

  console.log('Detected Misconception:', diagnosis.misconception);
  console.log('Why Chosen Analysis:', diagnosis.whyChosen);
  console.log('Mini-Fix Explanation:', diagnosis.miniFix);
  console.log('Generated Try Again Question:', diagnosis.tryAgainQuestion?.question);

  console.log(`Saved Mistake ID: ${mistake._id}, Status: ${mistake.status}`);

  // Step 2: Test Retest Submission
  console.log('Step 2: Submitting correct answer to the Try Again question...');
  const retestResult = await submitMistakeRetest({
    userId: user._id,
    mistakeId: mistake._id,
    selectedIndex: diagnosis.tryAgainQuestion.correctIndex
  });

  console.log('Retest Result:', retestResult);

  const updatedMistake = await Mistake.findById(mistake._id);
  console.log(`Updated Mistake Status: ${updatedMistake.status} (History entries: ${updatedMistake.retestHistory.length})`);

  console.log('--- Phase 4 & 5 Test Completed Successfully ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Phase 4 & 5 test failed:', err);
  process.exit(1);
});

