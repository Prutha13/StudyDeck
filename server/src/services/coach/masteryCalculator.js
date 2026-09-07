import Mastery from '../../models/Mastery.js';
import Concept from '../../models/Concept.js';

const DIFFICULTY_WEIGHTS = {
  easy: 1.0,
  medium: 1.25,
  hard: 1.5,
  advanced: 1.8
};

export async function recordConceptAttempt({
  userId,
  conceptId,
  isCorrect,
  source = 'quiz',
  difficulty = 'medium',
  documentId = null
}) {
  const concept = await Concept.findById(conceptId);
  if (!concept) {
    throw new Error(`Concept with ID ${conceptId} not found`);
  }

  let mastery = await Mastery.findOne({ user: userId, concept: conceptId });
  const targetDocId = documentId || concept.documents?.[0] || null;

  if (!mastery) {
    mastery = new Mastery({
      user: userId,
      concept: conceptId,
      document: targetDocId,
      subject: concept.subject,
      topic: concept.topic,
      score: 0,
      status: 'unseen',
      attempts: 0,
      correctAttempts: 0,
      incorrectAttempts: 0,
      consecutiveCorrect: 0,
      difficultyFactor: 2.5,
      intervalDays: 1
    });
  } else if (!mastery.document && targetDocId) {
    mastery.document = targetDocId;
  }

  const prevScore = mastery.score;
  const weight = DIFFICULTY_WEIGHTS[difficulty] || 1.25;

  mastery.attempts += 1;
  mastery.lastAttemptAt = new Date();
  mastery.lastReviewedAt = new Date();

  if (isCorrect) {
    mastery.correctAttempts += 1;
    mastery.consecutiveCorrect += 1;

    // Diminishing returns formula to smoothly approach 100
    const headroom = 100 - mastery.score;
    const gain = Math.max(8, Math.round(headroom * 0.35 * weight));
    mastery.score = Math.min(100, mastery.score + gain);

    // SM-2 Spaced repetition interval progression
    if (mastery.consecutiveCorrect === 1) {
      mastery.intervalDays = 1;
    } else if (mastery.consecutiveCorrect === 2) {
      mastery.intervalDays = 3;
    } else {
      mastery.intervalDays = Math.min(60, Math.round(mastery.intervalDays * mastery.difficultyFactor));
    }
  } else {
    mastery.incorrectAttempts += 1;
    mastery.consecutiveCorrect = 0;

    // Penalty for wrong answer
    const penalty = Math.max(15, Math.round(mastery.score * 0.35 + 10));
    mastery.score = Math.max(0, mastery.score - penalty);

    // Reset spaced repetition interval for immediate review
    mastery.intervalDays = 1;
    mastery.difficultyFactor = Math.max(1.3, mastery.difficultyFactor - 0.2);
  }

  // Determine qualitative status
  if (mastery.score >= 80 && mastery.attempts >= 2) {
    mastery.status = 'mastered';
  } else if (mastery.score >= 50) {
    mastery.status = 'improving';
  } else if (mastery.attempts > 0) {
    mastery.status = 'struggling';
  } else {
    mastery.status = 'learning';
  }

  // Set next spaced review due date
  const due = new Date();
  due.setDate(due.getDate() + mastery.intervalDays);
  mastery.nextReviewDue = due;
  mastery.lastAttemptScore = mastery.score;

  // Append history entry
  mastery.history.push({
    attemptAt: new Date(),
    isCorrect,
    scoreDelta: mastery.score - prevScore,
    source
  });

  // Keep history compact
  if (mastery.history.length > 50) {
    mastery.history = mastery.history.slice(-50);
  }

  await mastery.save();
  return mastery;
}

export async function getConceptMasteryMap(userId, documentId = null) {
  let filter = { user: userId };
  if (documentId && documentId !== 'all' && documentId !== 'undefined') {
    const docConcepts = await Concept.find({ owner: userId, documents: documentId }).select('_id');
    const conceptIds = docConcepts.map((c) => c._id);
    filter = {
      user: userId,
      $or: [{ document: documentId }, { concept: { $in: conceptIds } }]
    };
  }
  const records = await Mastery.find(filter).lean();
  const map = new Map();
  for (const r of records) {
    map.set(String(r.concept), r);
  }
  return map;
}

export async function getUserOverallMastery(userId, documentId = null) {
  let conceptFilter = { owner: userId };
  let masteryFilter = { user: userId };

  if (documentId && documentId !== 'all' && documentId !== 'undefined') {
    conceptFilter.documents = documentId;
    const docConcepts = await Concept.find(conceptFilter).select('_id');
    const conceptIds = docConcepts.map((c) => c._id);
    masteryFilter = {
      user: userId,
      $or: [{ document: documentId }, { concept: { $in: conceptIds } }]
    };
  }

  const totalConceptCount = await Concept.countDocuments(conceptFilter);
  const records = await Mastery.find(masteryFilter).lean();
  if (records.length === 0) {
    return {
      overallScore: 0,
      totalConcepts: totalConceptCount,
      masteredCount: 0,
      improvingCount: 0,
      strugglingCount: 0,
      unseenCount: totalConceptCount
    };
  }

  let totalScore = 0;
  let masteredCount = 0;
  let improvingCount = 0;
  let strugglingCount = 0;

  for (const r of records) {
    totalScore += r.score;
    if (r.status === 'mastered') masteredCount++;
    else if (r.status === 'improving') improvingCount++;
    else if (r.status === 'struggling') strugglingCount++;
  }

  const denominator = Math.max(totalConceptCount, records.length);
  return {
    overallScore: denominator > 0 ? Math.round(totalScore / denominator) : 0,
    totalConcepts: denominator,
    masteredCount,
    improvingCount,
    strugglingCount,
    unseenCount: Math.max(0, denominator - records.length)
  };
}

