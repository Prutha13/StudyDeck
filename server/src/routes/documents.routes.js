import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkDocumentLimit } from '../middleware/requirePremium.js';
import { requirePlan } from '../middleware/requirePlan.middleware.js';
import {
  uploadDocument,
  listDocuments,
  getDocument,
  regenerateDocument,
  deleteDocument,
  saveQuizAttempt,
  getQuizAttempts,
  chatDocument,
  streamStatus
} from '../controllers/documents.controller.js';
import { exportPdf } from '../controllers/export.controller.js';

const upload = multer({
  storage: multer.memoryStorage(), // no temp files written to disk
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    cb(null, allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt)$/i));
  }
});

const router = Router();

router.post('/', authMiddleware, checkDocumentLimit, upload.single('file'), uploadDocument);
router.get('/', authMiddleware, listDocuments);
router.get('/:id', authMiddleware, getDocument);
router.post('/:id/regenerate', authMiddleware, regenerateDocument);
router.delete('/:id', authMiddleware, deleteDocument);
router.post('/:id/quiz-attempts', authMiddleware, saveQuizAttempt);
router.get('/:id/quiz-attempts', authMiddleware, getQuizAttempts);
router.post('/:id/chat', authMiddleware, chatDocument);
router.get('/:id/events', authMiddleware, streamStatus);
router.get('/:id/export', authMiddleware, requirePlan('pro'), exportPdf);

export default router;
