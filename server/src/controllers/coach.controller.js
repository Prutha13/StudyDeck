import Document from '../models/Document.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import Concept from '../models/Concept.js';
import Mastery from '../models/Mastery.js';
import Mistake from '../models/Mistake.js';
import ConceptDependency from '../models/ConceptDependency.js';
import { extractKnowledgeHierarchy } from '../services/coach/knowledgeExtractor.js';
import {
  recordConceptAttempt,
  getConceptMasteryMap,
  getUserOverallMastery
} from '../services/coach/masteryCalculator.js';
import {
  diagnoseAndRecordMistake,
  submitMistakeRetest
} from '../services/coach/mistakeDiagnosis.js';
import { generateAdaptiveQuiz } from '../services/coach/adaptiveQuizEngine.js';
import {
  startFixWeaknessSession,
  submitFixWeaknessStep
} from '../services/coach/fixWeakness.js';
import {
  getDailyReviewQueue,
  submitDailyReviewItem
} from '../services/coach/spacedReview.js';

export async function extractDocumentKnowledge(req, res) {
  try {
    const { documentId } = req.params;
    const doc = await Document.findOne({ _id: documentId, owner: req.user.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const hierarchy = await extractKnowledgeHierarchy(doc.rawText, doc._id, req.user.id);
    res.json({
      message: 'Knowledge extraction successful',
      hierarchy
    });
  } catch (err) {
    console.error('Knowledge extraction endpoint error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract knowledge hierarchy' });
  }
}

export async function getDocumentKnowledge(req, res) {
  try {
    const { documentId } = req.params;
    const doc = await Document.findOne({ _id: documentId, owner: req.user.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const subjects = await Subject.find({ owner: req.user.id, documents: doc._id }).lean();
    const topics = await Topic.find({ owner: req.user.id, documents: doc._id }).lean();
    const concepts = await Concept.find({ owner: req.user.id, documents: doc._id })
      .populate('prerequisites', 'name difficulty')
      .lean();

    const masteryMap = await getConceptMasteryMap(req.user.id);

    // Group concepts under their respective topics with mastery stats
    const topicMap = new Map();
    for (const t of topics) {
      topicMap.set(String(t._id), { ...t, concepts: [] });
    }

    for (const c of concepts) {
      const topicEntry = topicMap.get(String(c.topic));
      const m = masteryMap.get(String(c._id));
      const conceptWithMastery = {
        ...c,
        mastery: m || { score: 0, status: 'unseen', attempts: 0 }
      };

      if (topicEntry) {
        topicEntry.concepts.push(conceptWithMastery);
      }
    }

    res.json({
      subjects,
      topics: Array.from(topicMap.values()),
      totalConcepts: concepts.length
    });
  } catch (err) {
    console.error('Get document knowledge error:', err);
    res.status(500).json({ error: err.message || 'Failed to load document knowledge graph' });
  }
}

export async function getFullKnowledgeMap(req, res) {
  try {
    const { documentId } = req.query;
    const filter = { owner: req.user.id };
    if (documentId && documentId !== 'all' && documentId !== 'undefined') {
      filter.documents = documentId;
    }

    const subjects = await Subject.find(filter).lean();
    const topics = await Topic.find(filter).lean();
    const concepts = await Concept.find(filter)
      .populate('prerequisites', 'name difficulty')
      .lean();

    const conceptIds = new Set(concepts.map((c) => String(c._id)));

    const allDependencies = await ConceptDependency.find({ owner: req.user.id })
      .populate('concept', 'name')
      .populate('prerequisite', 'name')
      .lean();

    const dependencies = (documentId && documentId !== 'all' && documentId !== 'undefined')
      ? allDependencies.filter((d) => conceptIds.has(String(d.concept?._id || d.concept)))
      : allDependencies;

    const masteryMap = await getConceptMasteryMap(req.user.id, documentId);
    const overallStats = await getUserOverallMastery(req.user.id, documentId);

    const topicMap = new Map();
    for (const t of topics) {
      topicMap.set(String(t._id), { ...t, concepts: [], averageMastery: 0 });
    }

    for (const c of concepts) {
      const topicEntry = topicMap.get(String(c.topic));
      const m = masteryMap.get(String(c._id));
      const conceptWithMastery = {
        ...c,
        mastery: m || { score: 0, status: 'unseen', attempts: 0 }
      };

      if (topicEntry) {
        topicEntry.concepts.push(conceptWithMastery);
      }
    }

    // Calculate Topic average mastery
    for (const t of topicMap.values()) {
      if (t.concepts.length > 0) {
        const total = t.concepts.reduce((acc, c) => acc + (c.mastery?.score || 0), 0);
        t.averageMastery = Math.round(total / t.concepts.length);
      }
    }

    const subjectMap = new Map();
    for (const s of subjects) {
      subjectMap.set(String(s._id), { ...s, topics: [], averageMastery: 0, totalConcepts: 0 });
    }

    for (const t of topicMap.values()) {
      const subjectEntry = subjectMap.get(String(t.subject));
      if (subjectEntry) {
        subjectEntry.topics.push(t);
      }
    }

    // Calculate Subject average mastery
    for (const s of subjectMap.values()) {
      const allConcepts = s.topics.flatMap((t) => t.concepts);
      s.totalConcepts = allConcepts.length;
      if (allConcepts.length > 0) {
        const total = allConcepts.reduce((acc, c) => acc + (c.mastery?.score || 0), 0);
        s.averageMastery = Math.round(total / allConcepts.length);
      }
    }

    res.json({
      subjects: Array.from(subjectMap.values()),
      totalSubjects: subjects.length,
      totalTopics: topics.length,
      totalConcepts: concepts.length,
      overallStats,
      dependencies
    });
  } catch (err) {
    console.error('Get full knowledge map error:', err);
    res.status(500).json({ error: err.message || 'Failed to load user knowledge map' });
  }
}

export async function submitConceptAttempt(req, res) {
  try {
    const { conceptId } = req.params;
    const { isCorrect, source = 'quiz', difficulty = 'medium' } = req.body;

    if (isCorrect === undefined) {
      return res.status(400).json({ error: 'isCorrect boolean is required' });
    }

    const updatedMastery = await recordConceptAttempt({
      userId: req.user.id,
      conceptId,
      isCorrect: Boolean(isCorrect),
      source,
      difficulty
    });

    res.json({
      message: 'Mastery updated successfully',
      mastery: updatedMastery
    });
  } catch (err) {
    console.error('Submit concept attempt error:', err);
    res.status(500).json({ error: err.message || 'Failed to update concept mastery' });
  }
}

// ---- Mistake Book & AI Diagnosis ----
export async function diagnoseMistake(req, res) {
  try {
    const {
      question,
      studentAnswer,
      correctAnswer,
      options = [],
      conceptName,
      documentId,
      difficulty = 'medium'
    } = req.body;

    if (!question || !studentAnswer || !correctAnswer) {
      return res.status(400).json({ error: 'Question, studentAnswer, and correctAnswer are required' });
    }

    const result = await diagnoseAndRecordMistake({
      userId: req.user.id,
      question,
      studentAnswer,
      correctAnswer,
      options,
      conceptName,
      documentId,
      difficulty
    });

    res.json(result);
  } catch (err) {
    console.error('Diagnose mistake error:', err);
    res.status(500).json({ error: err.message || 'Failed to diagnose mistake' });
  }
}

export async function getMistakes(req, res) {
  try {
    const { status, subject, topic, severity, documentId } = req.query;
    const filter = { user: req.user.id };

    if (status && status !== 'all' && status !== 'undefined') {
      filter.status = status;
    }
    if (subject && subject !== 'all' && subject !== 'undefined') {
      filter.subject = subject;
    }
    if (topic && topic !== 'all' && topic !== 'undefined') {
      filter.topic = topic;
    }
    if (severity && severity !== 'all' && severity !== 'undefined') {
      filter.severity = severity;
    }
    if (documentId && documentId !== 'all' && documentId !== 'undefined') {
      filter.document = documentId;
    }

    const mistakes = await Mistake.find(filter)
      .sort({ lastOccurredAt: -1 })
      .populate('concept', 'name difficulty')
      .lean();

    const countFilter = { user: req.user.id };
    if (documentId && documentId !== 'all' && documentId !== 'undefined') {
      countFilter.document = documentId;
    }

    const counts = {
      total: await Mistake.countDocuments(countFilter),
      needs_revision: await Mistake.countDocuments({ ...countFilter, status: 'needs_revision' }),
      improving: await Mistake.countDocuments({ ...countFilter, status: 'improving' }),
      fixed: await Mistake.countDocuments({ ...countFilter, status: 'fixed' })
    };

    res.json({
      mistakes,
      counts
    });
  } catch (err) {
    console.error('Get mistakes error:', err);
    res.status(500).json({ error: err.message || 'Failed to load mistake book' });
  }
}

export async function retestMistake(req, res) {
  try {
    const { mistakeId } = req.params;
    const { selectedIndex, selectedAnswer } = req.body;

    if (selectedIndex === undefined && !selectedAnswer) {
      return res.status(400).json({ error: 'selectedIndex or selectedAnswer is required' });
    }

    const result = await submitMistakeRetest({
      userId: req.user.id,
      mistakeId,
      selectedIndex,
      selectedAnswer
    });

    res.json(result);
  } catch (err) {
    console.error('Retest mistake error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit mistake re-test' });
  }
}

// ---- Adaptive Quiz Engine ----
export async function getAdaptiveQuiz(req, res) {
  try {
    const { documentId, count = 5 } = req.query;
    const result = await generateAdaptiveQuiz({
      userId: req.user.id,
      documentId: documentId || null,
      count: parseInt(count, 10) || 5
    });

    res.json(result);
  } catch (err) {
    console.error('Get adaptive quiz error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate adaptive quiz' });
  }
}

// ---- Fix My Weakness ----
export async function startWeaknessSession(req, res) {
  try {
    const { conceptId } = req.body;
    const result = await startFixWeaknessSession(req.user.id, conceptId || null);
    res.json(result);
  } catch (err) {
    console.error('Start weakness session error:', err);
    res.status(500).json({ error: err.message || 'Failed to start weakness remediation session' });
  }
}

export async function submitWeaknessStep(req, res) {
  try {
    const { conceptId, stepIndex, isCorrect } = req.body;
    if (!conceptId || stepIndex === undefined || isCorrect === undefined) {
      return res.status(400).json({ error: 'conceptId, stepIndex, and isCorrect are required' });
    }

    const result = await submitFixWeaknessStep({
      userId: req.user.id,
      conceptId,
      stepIndex,
      isCorrect: Boolean(isCorrect)
    });

    res.json(result);
  } catch (err) {
    console.error('Submit weakness step error:', err);
    res.status(500).json({ error: err.message || 'Failed to update weakness step' });
  }
}

// ---- Spaced Repetition & Daily Review ----
export async function getDailyReview(req, res) {
  try {
    const { documentId } = req.query;
    const queue = await getDailyReviewQueue(req.user.id, documentId);
    res.json(queue);
  } catch (err) {
    console.error('Get daily review error:', err);
    res.status(500).json({ error: err.message || 'Failed to load daily review' });
  }
}

export async function submitDailyReview(req, res) {
  try {
    const { conceptId, isCorrect } = req.body;
    if (!conceptId || isCorrect === undefined) {
      return res.status(400).json({ error: 'conceptId and isCorrect are required' });
    }

    const updated = await submitDailyReviewItem({
      userId: req.user.id,
      conceptId,
      isCorrect: Boolean(isCorrect)
    });

    res.json({ success: true, mastery: updated });
  } catch (err) {
    console.error('Submit daily review error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit daily review answer' });
  }
}
