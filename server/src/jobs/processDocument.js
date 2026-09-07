import Document from '../models/Document.js';
import Summary from '../models/Summary.js';
import { extractInsights } from '../services/llm.service.js';
import { extractKnowledgeHierarchy } from '../services/coach/knowledgeExtractor.js';
import { emitStatus } from '../services/sse.service.js';

// 120s timeout allows sufficient headroom for ~10MB PDF synthesis and model fallback cascades
const JOB_TIMEOUT_MS = 120000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function processDocument(docId) {
  console.log(`[DOC_JOB] [${docId}] Processing started`);
  try {
    await Document.findByIdAndUpdate(docId, { status: 'processing', error: null });
    emitStatus(docId, { status: 'processing', stage: 'analyzing' });

    const doc = await Document.findById(docId);
    if (!doc) {
      console.warn(`[DOC_JOB] [${docId}] Document not found in database, aborting`);
      return;
    }

    const rawText = (doc.rawText || '').trim();
    if (rawText.length < 20) {
      const emptyError = 'Document does not contain sufficient readable text (minimum 20 characters required). Please upload a text-based document.';
      console.warn(`[DOC_JOB] [${docId}] Text extraction validation failed: rawText length = ${rawText.length}`);
      await Document.findByIdAndUpdate(docId, { status: 'failed', error: emptyError });
      emitStatus(docId, { status: 'failed', error: emptyError });
      return;
    }

    console.log(`[DOC_JOB] [${docId}] Analyzing text (length: ${rawText.length} chars, quizCount: ${doc.quizCount ?? 5})`);
    
    // 1. Generate Executive Summary, Action Items, Quiz, and Flashcards
    const result = await withTimeout(
      extractInsights(rawText, doc.quizCount ?? 5),
      JOB_TIMEOUT_MS,
      `processDocument(${docId})`
    );

    emitStatus(docId, { status: 'processing', stage: 'saving' });

    const summary = await Summary.findOneAndUpdate(
      { document: docId },
      { document: docId, ...result, modelUsed: 'gemini-flash' },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`[DOC_JOB] [${docId}] Summary persisted: ${summary.flashcards?.length || 0} flashcards, ${summary.quiz?.length || 0} quiz questions`);

    // 2. Extract Knowledge Graph Hierarchy (Subject -> Topic -> Concept) in background
    try {
      await extractKnowledgeHierarchy(rawText, docId, doc.owner);
      console.log(`[DOC_JOB] [${docId}] Knowledge hierarchy extracted successfully`);
    } catch (coachErr) {
      console.warn(`[DOC_JOB] [${docId}] Non-fatal knowledge extraction warning:`, coachErr.message);
    }

    // Mark done
    await Document.findByIdAndUpdate(docId, { status: 'done', error: null });
    emitStatus(docId, { status: 'done', result: summary });
    console.log(`[DOC_JOB] [${docId}] Finished processing successfully`);
  } catch (err) {
    console.error(`[DOC_JOB] [${docId}] Processing failed:`, err.message);
    await Document.findByIdAndUpdate(docId, { status: 'failed', error: err.message });
    emitStatus(docId, { status: 'failed', error: err.message });
  }
}