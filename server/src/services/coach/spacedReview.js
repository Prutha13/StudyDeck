import Mastery from '../../models/Mastery.js';
import Concept from '../../models/Concept.js';
import Mistake from '../../models/Mistake.js';
import Subject from '../../models/Subject.js';
import Topic from '../../models/Topic.js';
import Document from '../../models/Document.js';
import { recordConceptAttempt } from './masteryCalculator.js';
import {
  generateConceptReviewQuestions,
  shuffleQuestionOptions,
  isMetaStatement
} from '../llm.service.js';

export async function getDailyReviewQueue(userId, documentId = null) {
  const now = new Date();

  const masteryQuery = {
    user: userId,
    $or: [
      { nextReviewDue: { $lte: now } },
      { status: 'struggling' },
      { score: { $lt: 50 }, attempts: { $gt: 0 } }
    ]
  };

  const mistakeQuery = {
    user: userId,
    status: { $ne: 'fixed' }
  };

  if (documentId && documentId !== 'all' && documentId !== 'undefined') {
    const docConcepts = await Concept.find({ owner: userId, documents: documentId }).select('_id');
    const conceptIds = docConcepts.map((c) => c._id);
    masteryQuery.$and = [{ $or: [{ document: documentId }, { concept: { $in: conceptIds } }] }];
    mistakeQuery.document = documentId;
  }

  // Find concepts where nextReviewDue <= now OR status is struggling
  const dueMasteryRecords = await Mastery.find(masteryQuery)
    .sort({ score: 1, nextReviewDue: 1 })
    .populate('concept')
    .populate('subject')
    .populate('topic')
    .lean();

  const openMistakes = await Mistake.find(mistakeQuery)
    .sort({ lastOccurredAt: -1 })
    .lean();

  // Find any related document text to provide rich context to the question generator
  const docIds = [
    ...dueMasteryRecords.map((m) => m.document || m.concept?.documents?.[0]),
    ...openMistakes.map((m) => m.document)
  ].filter(Boolean);

  let documentContext = '';
  if (docIds.length > 0) {
    const docs = await Document.find({ _id: { $in: docIds } }).select('rawText').lean();
    documentContext = docs.map((d) => d.rawText || '').filter(Boolean).join('\n\n').slice(0, 25000);
  }

  // Identify concepts that need fresh, high-quality question generation
  const conceptsNeedingGen = [];
  const conceptGenMap = new Map();

  for (const m of dueMasteryRecords) {
    if (!m.concept) continue;
    const matchingMistake = openMistakes.find((mist) => String(mist.concept) === String(m.concept._id));
    const hasValidMistakeQuestion =
      matchingMistake?.tryAgainQuestion?.question &&
      Array.isArray(matchingMistake.tryAgainQuestion.options) &&
      matchingMistake.tryAgainQuestion.options.length >= 4 &&
      !matchingMistake.tryAgainQuestion.options.some(isMetaStatement);

    if (!hasValidMistakeQuestion) {
      conceptsNeedingGen.push({
        _id: m.concept._id,
        name: m.concept.name,
        definition: m.concept.definition,
        keyTakeaway: m.concept.keyTakeaway,
        subjectName: m.subject?.name || 'General Studies',
        topicName: m.topic?.name || 'Core Topics'
      });
    }
  }

  // Generate real, high-quality conceptual questions for all needed concepts in batch
  if (conceptsNeedingGen.length > 0) {
    const generatedQuestions = await generateConceptReviewQuestions(conceptsNeedingGen, documentContext);
    for (const q of generatedQuestions) {
      conceptGenMap.set(q.conceptName.toLowerCase(), q);
    }
  }

  // Build review items
  const reviewItems = [];
  const reviewedConceptIds = new Set();

  for (const m of dueMasteryRecords) {
    if (!m.concept) continue;
    reviewedConceptIds.add(String(m.concept._id));

    const matchingMistake = openMistakes.find((mist) => String(mist.concept) === String(m.concept._id));
    const hasValidMistakeQuestion =
      matchingMistake?.tryAgainQuestion?.question &&
      Array.isArray(matchingMistake.tryAgainQuestion.options) &&
      matchingMistake.tryAgainQuestion.options.length >= 4 &&
      !matchingMistake.tryAgainQuestion.options.some(isMetaStatement);

    let itemQuestion = null;
    let rawOptions = null;
    let itemCorrectIndex = 0;
    let itemExplanation = null;
    let itemDefinition = m.concept.definition;

    if (hasValidMistakeQuestion) {
      const shuffled = shuffleQuestionOptions(matchingMistake.tryAgainQuestion);
      itemQuestion = shuffled.question;
      rawOptions = shuffled.options;
      itemCorrectIndex = shuffled.correctIndex;
      itemExplanation = shuffled.explanation || matchingMistake.tryAgainQuestion.explanation;
    } else {
      const generated = conceptGenMap.get(m.concept.name.toLowerCase());
      if (generated) {
        // Shuffling is already applied by generateConceptReviewQuestions
        itemQuestion = generated.question;
        rawOptions = generated.options;
        itemCorrectIndex = generated.correctIndex;
        itemExplanation = generated.explanation;
        const correctOpt = generated.options[generated.correctIndex];
        if (correctOpt && isMetaStatement(m.concept.definition)) {
          itemDefinition = correctOpt;
          // Asynchronously repair the concept's definition in the database
          Concept.updateOne(
            { _id: m.concept._id },
            { $set: { definition: correctOpt, description: correctOpt, keyTakeaway: itemExplanation } }
          ).catch(() => {});
        }
      } else {
        // Fallback if not found in map
        const correct = !isMetaStatement(m.concept.definition)
          ? m.concept.definition
          : `${m.concept.name} is a fundamental mechanism utilized in this domain.`;
        const rawItem = {
          question: `What is the primary role and definition of ${m.concept.name}?`,
          options: [
            correct,
            `It acts as an auxiliary presentation filter rather than modifying core operations of ${m.concept.name}.`,
            `It defines an external environment configuration superseded by modern specifications.`,
            `It represents a temporary caching mechanism discarded immediately following execution.`
          ],
          correctIndex: 0,
          explanation: m.concept.keyTakeaway && !isMetaStatement(m.concept.keyTakeaway)
            ? m.concept.keyTakeaway
            : `${m.concept.name} is defined as: ${correct}`
        };
        const shuffled = shuffleQuestionOptions(rawItem);
        itemQuestion = shuffled.question;
        rawOptions = shuffled.options;
        itemCorrectIndex = shuffled.correctIndex;
        itemExplanation = shuffled.explanation;
      }
    }

    reviewItems.push({
      conceptId: m.concept._id,
      conceptName: m.concept.name,
      documentId: m.document || m.concept.documents?.[0] || matchingMistake?.document || null,
      definition: itemDefinition || m.concept.description,
      keyTakeaway: m.concept.keyTakeaway,
      subjectName: m.subject?.name || 'General',
      topicName: m.topic?.name || 'Core Topic',
      currentScore: m.score,
      status: m.status,
      intervalDays: m.intervalDays,
      hasOpenMistake: Boolean(matchingMistake),
      question: itemQuestion,
      options: rawOptions,
      correctIndex: itemCorrectIndex,
      explanation: itemExplanation || m.concept.keyTakeaway || itemDefinition
    });
  }

  // Also include any standalone open mistakes whose concept wasn't already added
  for (const mist of openMistakes) {
    const mistKey = mist.concept ? String(mist.concept) : String(mist._id);
    if (!reviewedConceptIds.has(mistKey)) {
      let qObj = mist.tryAgainQuestion;
      if (!qObj || !Array.isArray(qObj.options) || qObj.options.length < 4 || qObj.options.some(isMetaStatement)) {
        const correct = mist.correctAnswer || mist.miniFix || 'The standard conceptual solution.';
        qObj = {
          question: mist.question || `Reviewing this concept: which statement accurately reflects ${mist.conceptName || 'the topic'}?`,
          options: [
            correct,
            `It is an alternative configuration not applicable to ${mist.conceptName || 'this scenario'}.`,
            `It describes an obsolete protocol superseded by modern specifications.`,
            `It applies strictly as a formatting parameter without operational effect.`
          ],
          correctIndex: 0,
          explanation: mist.miniFix || `${correct} directly addresses this requirement.`
        };
      }

      const shuffled = shuffleQuestionOptions(qObj);

      reviewItems.push({
        conceptId: mist.concept || mist._id,
        conceptName: mist.conceptName || 'Concept Review',
        documentId: mist.document || null,
        definition: mist.miniFix || mist.misconception,
        keyTakeaway: mist.miniFix,
        subjectName: mist.subjectName || mist.subject?.name || 'General',
        topicName: mist.topicName || mist.topic?.name || 'Core Topic',
        currentScore: 40,
        status: 'needs_revision',
        intervalDays: 1,
        hasOpenMistake: true,
        question: shuffled.question,
        options: shuffled.options,
        correctIndex: shuffled.correctIndex,
        explanation: shuffled.explanation || mist.miniFix
      });
      reviewedConceptIds.add(mistKey);
    }
  }

  const estimatedMinutes = Math.max(3, Math.round(reviewItems.length * 2.5));

  return {
    totalDue: reviewItems.length,
    estimatedMinutes,
    items: reviewItems
  };
}

export async function submitDailyReviewItem({ userId, conceptId, isCorrect }) {
  let updated = null;
  const concept = await Concept.findById(conceptId);
  if (concept) {
    updated = await recordConceptAttempt({
      userId,
      conceptId,
      isCorrect: Boolean(isCorrect),
      source: 'quiz',
      difficulty: 'medium'
    });
  }

  if (isCorrect) {
    await Mistake.updateMany(
      {
        user: userId,
        $or: [{ concept: conceptId }, { _id: conceptId }],
        status: 'needs_revision'
      },
      { $set: { status: 'improving' } }
    );
  }

  return updated;
}

