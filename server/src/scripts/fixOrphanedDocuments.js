// One-off maintenance script.
//
// Finds every Document whose status is "done" but has no matching Summary
// (the exact symptom caused by the getDocument race-condition bug), and
// repairs each one by re-running the real LLM pipeline — the same
// extractInsights() used by jobs/processDocument.js, including its local
// fallback if Gemini is unavailable.
//
// Usage:
//   cd server
//   node src/scripts/fixOrphanedDocuments.js          # dry run (reports only)
//   node src/scripts/fixOrphanedDocuments.js --fix     # actually repairs
//
// Safe to re-run — it only touches documents that are genuinely orphaned.

import 'dotenv/config';
import { connectDB } from '../db.js';
import Document from '../models/Document.js';
import Summary from '../models/Summary.js';
import { extractInsights } from '../services/llm.service.js';
import mongoose from 'mongoose';

const APPLY_FIX = process.argv.includes('--fix');

async function main() {
  await connectDB();

  const doneDocs = await Document.find({ status: 'done' });
  console.log(`Checking ${doneDocs.length} document(s) marked "done"...\n`);

  let orphanCount = 0;

  for (const doc of doneDocs) {
    const summary = await Summary.findOne({ document: doc._id });
    if (summary) continue; // healthy, skip

    orphanCount++;
    console.log(`Orphaned: "${doc.title}" (${doc._id})`);

    if (!APPLY_FIX) {
      console.log('  -> dry run, no changes made (re-run with --fix to repair)\n');
      continue;
    }

    try {
      if (!doc.rawText) throw new Error('Document has no rawText to analyze');

      const result = await extractInsights(doc.rawText, doc.quizCount ?? 5);

      // Upsert, not create — matches the fix applied to processDocument.js,
      // and is safe under the new unique index on Summary.document even if
      // this script is run more than once concurrently.
      await Summary.findOneAndUpdate(
        { document: doc._id },
        { document: doc._id, ...result, modelUsed: 'gemini-flash' },
        { upsert: true, returnDocument: 'after' }
      );

      doc.status = 'done';
      doc.error = null;
      await doc.save();
      console.log('  -> repaired\n');
    } catch (err) {
      doc.status = 'failed';
      doc.error = `Auto-repair failed: ${err.message}`;
      await doc.save();
      console.log(`  -> could not repair, marked failed: ${err.message}\n`);
    }
  }

  console.log(`Done. ${orphanCount} orphaned document(s) found${APPLY_FIX ? ', repair attempted on each' : ' (dry run only)'}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});