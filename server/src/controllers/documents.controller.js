import Document from '../models/Document.js';
import Summary from '../models/Summary.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import Concept from '../models/Concept.js';
import { recordConceptAttempt } from '../services/coach/masteryCalculator.js';
import { extractText } from '../services/extract.service.js';
import { processDocument } from '../jobs/processDocument.js';
import { chatWithDocument } from '../services/llm.service.js';
import { subscribe, unsubscribe } from '../services/sse.service.js';
import { getPlanLimits } from '../config/plans.js';

export async function uploadDocument(req, res) {
  try {
    let rawText, sourceType, originalFileName;

    if (req.file) {
      // File upload path (PDF/DOCX/TXT via multer)
      const extracted = await extractText(req.file);
      rawText = extracted.text;
      sourceType = extracted.sourceType;
      originalFileName = req.file.originalname;
    } else if (req.body.rawText) {
      // Pasted-text path
      rawText = req.body.rawText;
      sourceType = 'pasted';
    } else {
      return res.status(400).json({ error: 'Provide either a file or rawText' });
    }

    if (!rawText || rawText.length < 20) {
      return res.status(400).json({ error: 'Could not extract enough text from the input (min 20 characters)' });
    }

    const user = await User.findById(req.user.id);
    const planLimits = getPlanLimits(user?.subscription?.plan || 'free');

    const requestedQuizCount =
      req.body.quizCount !== undefined && req.body.quizCount !== null && req.body.quizCount !== ''
        ? parseInt(req.body.quizCount, 10)
        : 5;
    const quizCount = Math.max(0, Math.min(planLimits.maxQuizCountPerDoc, requestedQuizCount || 5));

    const doc = await Document.create({
      owner: req.user.id,
      title: req.body.title || originalFileName || 'Untitled',
      rawText,
      sourceType,
      originalFileName,
      quizCount
    });

    // Increment user usage counter
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'usage.documentsThisMonth': 1 }
    });

    processDocument(doc._id); // fire and forget — do not await

    res.status(202).json({ id: doc._id, status: doc.status, title: doc.title, sourceType, quizCount: doc.quizCount });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

export async function listDocuments(req, res) {
  try {
    const { q } = req.query;
    const filter = { owner: req.user.id };

    if (q && q.trim()) {
      filter.title = { $regex: q.trim(), $options: 'i' };
    }

    const docs = await Document.find(filter).sort({ createdAt: -1 }).select('title status createdAt sourceType quizCount').lean();

    // One extra query beats N+1: pull quiz/flashcard counts for every
    // document in this page so list cards show real generated totals.
    const docIds = docs.map((d) => d._id);
    const summaries = await Summary.find({ document: { $in: docIds } }, 'document flashcards quiz').lean();
    const summaryByDoc = new Map(summaries.map((s) => [String(s.document), s]));

    res.json(docs.map((d) => {
      const summary = summaryByDoc.get(String(d._id));
      return {
        id: d._id,
        title: d.title,
        status: d.status,
        createdAt: d.createdAt,
        sourceType: d.sourceType,
        quizCount: summary?.quiz?.length ?? (d.status === 'done' ? 0 : d.quizCount),
        flashcardsCount: summary?.flashcards?.length ?? 0
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list documents' });
  }
}

export async function getDocument(req, res) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const summary = await Summary.findOne({ document: doc._id });

    // If status says "done" but we somehow have no Summary (e.g. old/corrupt data,
    // or a job crashed after flipping status), don't silently regenerate inside a
    // GET — flag it as failed so the frontend shows "Try Again" instead of a
    // permanently blank success state.
    if (doc.status === 'done' && !summary) {
      doc.status = 'failed';
      doc.error = 'Summary missing for a document marked done. Please re-analyze.';
      await doc.save();
    }

    res.json({
      id: doc._id,
      title: doc.title,
      status: doc.status,
      error: doc.error,
      sourceType: doc.sourceType,
      quizCount: doc.quizCount,
      createdAt: doc.createdAt,
      result: summary || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load document' });
  }
}

export async function regenerateDocument(req, res) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (req.body.quizCount !== undefined) {
      doc.quizCount = Math.max(0, Math.min(20, parseInt(req.body.quizCount, 10)));
    }

    doc.status = 'pending';
    doc.error = null;
    await doc.save();

    await Summary.deleteMany({ document: doc._id });

    processDocument(doc._id);

    res.json({ message: 'Document re-analysis started', status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to re-generate document' });
  }
}

export async function deleteDocument(req, res) {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await Summary.deleteMany({ document: doc._id });
    await QuizAttempt.deleteMany({ document: doc._id });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete document' });
  }
}

export async function saveQuizAttempt(req, res) {
  try {
    const { score, total, answers = [] } = req.body;
    if (score === undefined || total === undefined || total === 0) {
      return res.status(400).json({ error: 'Valid score and total are required' });
    }

    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const percentage = Math.round((score / total) * 100);
    const attempt = await QuizAttempt.create({
      user: req.user.id,
      document: doc._id,
      score,
      total,
      percentage
    });

    // Update Concept Mastery from Quiz Results
    try {
      let docConcepts = await Concept.find({ owner: req.user.id, documents: doc._id });
      if (docConcepts.length === 0) {
        docConcepts = await Concept.find({ owner: req.user.id });
      }

      if (docConcepts.length > 0) {
        if (Array.isArray(answers) && answers.length > 0) {
          for (const ans of answers) {
            // Match concept for this answer
            let matchedConcept = null;
            if (ans.concept) {
              matchedConcept = docConcepts.find((c) => c.name.toLowerCase() === ans.concept.toLowerCase());
            }
            if (!matchedConcept) {
              const textToSearch = `${ans.concept || ''} ${ans.question || ''} ${ans.correctAnswer || ''} ${ans.studentAnswer || ''}`.toLowerCase();
              let bestScore = -1;
              for (const c of docConcepts) {
                let s = 0;
                const cName = (c.name || '').toLowerCase();
                if (cName && textToSearch.includes(cName)) s += 50 + cName.length;
                else if (cName) {
                  const tokens = cName.split(/\s+/).filter((t) => t.length > 3);
                  for (const t of tokens) {
                    if (textToSearch.includes(t)) s += 10;
                  }
                }
                if (s > bestScore) {
                  bestScore = s;
                  matchedConcept = c;
                }
              }
            }
            const targetConcept = matchedConcept || docConcepts[0];
            if (targetConcept) {
              await recordConceptAttempt({
                userId: req.user.id,
                conceptId: targetConcept._id,
                isCorrect: Boolean(ans.isCorrect),
                source: 'quiz',
                difficulty: 'medium'
              }).catch((e) => console.warn('Record quiz answer concept attempt error:', e.message));
            }
          }
        } else {
          // If no detailed answers array was provided, distribute attempts proportionally across concepts
          const correctCount = Math.min(score, docConcepts.length);
          for (let i = 0; i < docConcepts.length; i++) {
            const isCorrect = i < correctCount;
            await recordConceptAttempt({
              userId: req.user.id,
              conceptId: docConcepts[i]._id,
              isCorrect,
              source: 'quiz',
              difficulty: 'medium'
            }).catch((e) => console.warn('Record general concept attempt error:', e.message));
          }
        }
      }
    } catch (masteryErr) {
      console.warn('Failed to update concept mastery on quiz save:', masteryErr.message);
    }

    res.status(201).json(attempt);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save quiz attempt' });
  }
}

export async function getQuizAttempts(req, res) {
  try {
    const attempts = await QuizAttempt.find({
      user: req.user.id,
      document: req.params.id
    }).sort({ completedAt: -1 }).limit(10);

    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load quiz history' });
  }
}

export async function chatDocument(req, res) {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const reply = await chatWithDocument(doc.rawText, history, message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
}

export async function streamStatus(req, res) {
  // Ownership check — every other route on this document scopes by owner,
  // this one must too, or any authenticated user can read anyone else's
  // document status + summary just by guessing/incrementing a Mongo ID.
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  subscribe(req.params.id, res);

  req.on('close', () => unsubscribe(req.params.id, res));
}