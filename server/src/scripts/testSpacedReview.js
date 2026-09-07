import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import { getDailyReviewQueue, submitDailyReviewItem } from '../services/coach/spacedReview.js';

async function runTest() {
  console.log('--- Testing Phase 8 Spaced Repetition & Daily Review ---');
  await connectDB();

  const user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    throw new Error('Test user not found');
  }

  // 1. Fetch Daily Review Queue
  console.log('Step 1: Fetching daily review queue for user...');
  const queue = await getDailyReviewQueue(user._id);

  console.log(`Queue: ${queue.totalDue} items due today (~${queue.estimatedMinutes} mins)`);
  for (const item of queue.items) {
    console.log(` - Concept: ${item.conceptName} [Score: ${item.currentScore}%, Interval: ${item.intervalDays}d]`);
  }

  // 2. Submit a review answer if items exist
  if (queue.items.length > 0) {
    const targetItem = queue.items[0];
    console.log(`\nStep 2: Submitting review answer for ${targetItem.conceptName}...`);
    const updated = await submitDailyReviewItem({
      userId: user._id,
      conceptId: targetItem.conceptId,
      isCorrect: true
    });
    console.log(`Updated Mastery -> Score: ${updated.score}%, Interval: ${updated.intervalDays} days, NextDue: ${updated.nextReviewDue}`);
  }

  console.log('--- Phase 8 Test Completed Successfully ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Phase 8 test failed:', err);
  process.exit(1);
});

