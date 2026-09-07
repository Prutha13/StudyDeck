import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import Summary from '../models/Summary.js';
import { processDocument } from '../jobs/processDocument.js';

async function testPipelineEndToEnd() {
  console.log('=== StudyDeck End-to-End Pipeline Verification ===');
  await connectDB();

  // 1. Locate or create test user
  let user = await User.findOne({ email: 'pipeline.test@studydeck.test' });
  if (!user) {
    user = await User.create({
      email: 'pipeline.test@studydeck.test',
      passwordHash: 'test-hash-deploy-ready',
      isVerified: true
    });
  }

  // 2. Prepare sample educational content
  const sampleContent = `
Operating System Memory Management: Virtual Memory and Paging

Virtual memory is a memory management technique that provides an idealized abstraction of the storage resources that are actually available on a given machine. It creates the illusion to users of a very large (main) memory.

1. Paging:
Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. The physical memory is divided into fixed-size blocks called frames, and logical memory is divided into blocks of the same size called pages.
When a process is to be executed, its pages are loaded into any available memory frames from the backing store.

2. Page Faults:
A page fault occurs when a program attempts to access data or code that is in its address space, but is not currently located in the system RAM. The operating system handles this by:
- Trapping to the kernel.
- Checking that the memory reference was valid.
- Finding an empty frame in physical memory.
- Reading the desired page from disk into the frame.
- Updating the internal page table to indicate the page is now in RAM.
- Restarting the instruction that was interrupted by the trap.

3. Page Replacement Algorithms:
When no frame is free, a page replacement algorithm must select a victim frame to page out to disk:
- FIFO (First-In, First-Out): Replaces the oldest page. Suffers from Belady's Anomaly.
- Optimal Algorithm: Replaces the page that will not be used for the longest period in the future.
- LRU (Least Recently Used): Replaces the page that has not been used for the longest period of time.
  `.trim();

  console.log('[1/4] Creating test document in MongoDB...');
  const doc = await Document.create({
    owner: user._id,
    title: 'E2E Memory Management Lecture Notes',
    rawText: sampleContent,
    sourceType: 'pasted',
    quizCount: 5
  });

  try {
    console.log(`[2/4] Executing processDocument(${doc._id})...`);
    await processDocument(doc._id);

    console.log('[3/4] Fetching final Document and Summary records...');
    const processedDoc = await Document.findById(doc._id);
    const summary = await Summary.findOne({ document: doc._id });

    if (!processedDoc) {
      throw new Error(`Document ${doc._id} was unexpectedly deleted during processing.`);
    }

    if (processedDoc.status !== 'done') {
      throw new Error(`Expected document status 'done', but got '${processedDoc.status}'. Error: ${processedDoc.error}`);
    }

    if (!summary) {
      throw new Error(`Summary document was not persisted for document ${doc._id}`);
    }

    console.log('[4/4] Validating Summary contents:');
    console.log(`  - Summary text length: ${summary.summary?.length || 0} chars`);
    console.log(`  - Quiz questions: ${summary.quiz?.length || 0}`);
    console.log(`  - Flashcards: ${summary.flashcards?.length || 0}`);
    console.log(`  - Action items: ${summary.actionItems?.length || 0}`);

    if (!summary.summary || summary.summary.trim().length === 0) {
      throw new Error('Summary text is empty');
    }

    if (!Array.isArray(summary.quiz) || summary.quiz.length === 0) {
      throw new Error(`Expected non-empty quiz array, but got ${summary.quiz?.length}`);
    }

    if (!Array.isArray(summary.flashcards) || summary.flashcards.length === 0) {
      throw new Error(`Expected non-empty flashcards array, but got ${summary.flashcards?.length}`);
    }

    // Verify questions have valid options and a valid correctIndex
    for (const [i, q] of summary.quiz.entries()) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Quiz item ${i} is missing question or options`);
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error(`Quiz item ${i} has invalid correctIndex: ${q.correctIndex}`);
      }
    }

    console.log('\n✅ PASS: End-to-end pipeline succeeded! Document processed, Summary generated with valid quiz and flashcards.');
  } finally {
    // Cleanup test artifacts
    await Document.findByIdAndDelete(doc._id);
    await Summary.deleteMany({ document: doc._id });
    console.log('Cleanup: Test document and summary removed.');
  }

  process.exit(0);
}

testPipelineEndToEnd().catch((err) => {
  console.error('\n❌ FAIL: Pipeline end-to-end test error:', err);
  process.exit(1);
});
