import Document from '../models/Document.js';
import Summary from '../models/Summary.js';

// In-memory map of docId -> Set of Express response objects currently listening.
const listeners = new Map();

export async function subscribe(docId, res) {
  if (!listeners.has(docId)) listeners.set(docId, new Set());
  listeners.get(docId).add(res);

  // Immediately send initial document status and result on connection
  try {
    const doc = await Document.findById(docId);
    if (doc) {
      const summary = await Summary.findOne({ document: docId });
      const payload = { status: doc.status, error: doc.error, result: summary || null };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  } catch (err) {
    console.error('Error sending initial SSE payload:', err);
  }
}

export function unsubscribe(docId, res) {
  const subs = listeners.get(docId);
  if (subs) {
    subs.delete(res);
    if (subs.size === 0) {
      listeners.delete(docId);
    }
  }
}

export function emitStatus(docId, payload) {
  const subs = listeners.get(docId);
  if (!subs || subs.size === 0) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of Array.from(subs)) {
    try {
      res.write(data);
    } catch (err) {
      subs.delete(res);
    }
  }
  if (subs.size === 0) {
    listeners.delete(docId);
  }
}