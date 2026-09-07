import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePlan } from '../middleware/requirePlan.middleware.js';
import {
  extractDocumentKnowledge,
  getDocumentKnowledge,
  getFullKnowledgeMap,
  submitConceptAttempt,
  diagnoseMistake,
  getMistakes,
  retestMistake,
  getAdaptiveQuiz,
  startWeaknessSession,
  submitWeaknessStep,
  getDailyReview,
  submitDailyReview
} from '../controllers/coach.controller.js';

const router = Router();

// Knowledge Extraction & Knowledge Map
router.post('/extract/:documentId', authMiddleware, extractDocumentKnowledge);
router.get('/documents/:documentId/knowledge', authMiddleware, getDocumentKnowledge);
router.get('/knowledge-map', authMiddleware, getFullKnowledgeMap);
router.post('/concepts/:conceptId/attempt', authMiddleware, submitConceptAttempt);

// Mistake Book & AI Diagnosis
router.post('/diagnose-mistake', authMiddleware, diagnoseMistake);
router.get('/mistakes', authMiddleware, getMistakes);
router.post('/mistakes/:mistakeId/retest', authMiddleware, retestMistake);

// Adaptive Learning & Remediation
router.get('/adaptive-quiz', authMiddleware, getAdaptiveQuiz);
router.post('/fix-weakness/start', authMiddleware, requirePlan('pro'), startWeaknessSession);
router.post('/fix-weakness/step', authMiddleware, requirePlan('pro'), submitWeaknessStep);

// Spaced Repetition & Daily Review
router.get('/daily-review', authMiddleware, getDailyReview);
router.post('/daily-review/submit', authMiddleware, submitDailyReview);

export default router;
