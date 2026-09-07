import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Concept from '../models/Concept.js';
import { generateAdaptiveQuiz } from '../services/coach/adaptiveQuizEngine.js';
import { startFixWeaknessSession, submitFixWeaknessStep } from '../services/coach/fixWeakness.js';

async function runTest() {
  console.log('--- Testing Phase 6 & 7 Adaptive Quiz & Fix My Weakness ---');
  await connectDB();

  const user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    throw new Error('Test user not found');
  }

  // 1. Test Adaptive Quiz Engine
  console.log('Step 1: Generating adaptive quiz tailored to user mastery gaps...');
  const adaptiveResult = await generateAdaptiveQuiz({
    userId: user._id,
    count: 3
  });

  console.log('Adaptive Rationale:', adaptiveResult.adaptiveRationale);
  console.log(`Generated ${adaptiveResult.quiz?.length || 0} targeted questions`);
  for (const q of adaptiveResult.quiz || []) {
    console.log(` - Concept: ${q.conceptName} [Diff: ${q.difficulty}] -> ${q.question}`);
  }

  // 2. Test Fix My Weakness Session
  console.log('\nStep 2: Starting Fix My Weakness 5-step remediation session...');
  const weaknessResult = await startFixWeaknessSession(user._id);

  console.log(`Target Weakness Concept: ${weaknessResult.concept?.name}`);
  if (weaknessResult.prerequisiteAdvisory) {
    console.log(`Prerequisite Alert: ${weaknessResult.prerequisiteAdvisory.message}`);
  }

  console.log('Step 1 Misconception Pitfalls:', weaknessResult.session?.step1_diagnosis?.slice(0, 100) + '...');
  console.log('Step 2 Mental Model Explanation:', weaknessResult.session?.step2_explanation?.slice(0, 100) + '...');
  console.log(`Question ladder items: ${weaknessResult.session?.questions?.length || 0}`);

  // 3. Test Step Submission
  console.log('\nStep 3: Submitting successful remediation step answer...');
  const stepRes = await submitFixWeaknessStep({
    userId: user._id,
    conceptId: weaknessResult.concept._id,
    stepIndex: 3,
    isCorrect: true
  });
  console.log('Step submit result:', stepRes);

  console.log('--- Phase 6 & 7 Test Completed Successfully ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Phase 6 & 7 test failed:', err);
  process.exit(1);
});

