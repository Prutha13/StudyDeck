import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import Concept from '../models/Concept.js';
import ConceptDependency from '../models/ConceptDependency.js';
import { extractKnowledgeHierarchy } from '../services/coach/knowledgeExtractor.js';

async function runTest() {
  console.log('--- Testing Phase 2 Knowledge Extraction ---');
  await connectDB();

  // Find or create test user
  let user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    user = await User.create({ email: 'test@example.com', passwordHash: 'dummy' });
  }

  const sampleMaterial = `
Operating Systems: Process Synchronization and Deadlocks

A deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process.

There are four necessary conditions for Deadlock (Coffman Conditions):
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process must be holding at least one resource and waiting to acquire additional resources that are currently being held by other processes.
3. No Preemption: Resources cannot be preempted; a resource can be released only voluntarily by the process holding it.
4. Circular Wait: A closed chain of processes exists, such that each process holds at least one resource needed by the next process in the chain.

Prerequisites for understanding deadlocks include Process Management, Resource Allocation Graphs, and Multithreading Basics.
`;

  // Create test document
  const doc = await Document.create({
    owner: user._id,
    title: 'OS Deadlocks Lecture Notes',
    rawText: sampleMaterial,
    sourceType: 'pasted'
  });

  console.log(`Created test document: ${doc._id}`);

  // Test extractKnowledgeHierarchy
  console.log('Extracting knowledge hierarchy...');
  const hierarchy = await extractKnowledgeHierarchy(doc.rawText, doc._id, user._id);

  console.log('Extracted Subject:', hierarchy.subject.name);
  console.log(`Extracted ${hierarchy.topics.length} Topics`);

  for (const t of hierarchy.topics) {
    console.log(` - Topic: ${t.name} (${t.concepts.length} concepts)`);
    for (const c of t.concepts) {
      console.log(`    * Concept: ${c.name} [Diff: ${c.difficulty}, Imp: ${c.importance}]`);
      if (c.prerequisites && c.prerequisites.length > 0) {
        console.log(`      Prereqs: ${c.prerequisites.join(', ')}`);
      }
    }
  }

  // Verify records in DB
  const subjectsCount = await Subject.countDocuments({ owner: user._id });
  const topicsCount = await Topic.countDocuments({ owner: user._id });
  const conceptsCount = await Concept.countDocuments({ owner: user._id });
  const depsCount = await ConceptDependency.countDocuments({ owner: user._id });

  console.log(`DB Counts -> Subjects: ${subjectsCount}, Topics: ${topicsCount}, Concepts: ${conceptsCount}, Dependencies: ${depsCount}`);

  // Cleanup test document
  await Document.findByIdAndDelete(doc._id);
  console.log('--- Phase 2 Test Completed Successfully ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

