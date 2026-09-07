import 'dotenv/config';
import { connectDB } from '../db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import Summary from '../models/Summary.js';
import { processDocument } from '../jobs/processDocument.js';
import { extractInsights } from '../services/llm.service.js';
import { extractKnowledgeHierarchy } from '../services/coach/knowledgeExtractor.js';

async function run() {
  console.log('--- Debugging Document Analysis Pipeline ---');
  await connectDB();

  let user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    user = await User.create({ email: 'test@example.com', passwordHash: 'dummy' });
  }

  // 1. Test short text
  console.log('\n[TEST 1] Short Document');
  const shortDoc = await Document.create({
    owner: user._id,
    title: 'Short Test Document',
    rawText: 'This is a brief test document about Operating System Process Scheduling algorithms such as Round Robin and First Come First Served.',
    sourceType: 'pasted',
    quizCount: 3
  });

  console.log('Processing shortDoc:', shortDoc._id);
  await processDocument(shortDoc._id);

  const finalShortDoc = await Document.findById(shortDoc._id);
  const shortSummary = await Summary.findOne({ document: shortDoc._id });
  console.log('Short Doc Status:', finalShortDoc.status, 'Error:', finalShortDoc.error);
  console.log('Short Summary exists:', Boolean(shortSummary), 'Quiz items:', shortSummary?.quiz?.length);

  // 2. Test large text (e.g. 50,000 characters)
  console.log('\n[TEST 2] Large Document (60,000 chars)');
  const sampleChunk = `
Computer Networks and Protocols.
The Transmission Control Protocol (TCP) is one of the main protocols of the Internet protocol suite. It originated in the initial network implementation in which it complemented the Internet Protocol. Therefore, the entire suite is commonly referred to as TCP/IP. TCP provides reliable, ordered, and error-checked delivery of a stream of octets between applications running on hosts communicating via an IP network. Major internet applications such as the World Wide Web, email, remote administration, and file transfer rely on TCP.
Flow control is a technique for managing the rate of data transmission on a network so that a fast sender does not overwhelm a slow receiver. It provides a mechanism for the receiver to control the transmission speed.
The sliding window technique is used for flow control. TCP uses a sliding window protocol to achieve flow control. The receiver advertises a receive window (rwnd) in every acknowledgment segment.
Congestion control is used to prevent the network from becoming overloaded. TCP uses algorithms such as Slow Start, Congestion Avoidance, Fast Retransmit, and Fast Recovery.
`;
  const largeText = sampleChunk.repeat(80); // ~60k characters
  const largeDoc = await Document.create({
    owner: user._id,
    title: 'Large Network Lecture Notes',
    rawText: largeText,
    sourceType: 'pasted',
    quizCount: 5
  });

  console.log('Processing largeDoc:', largeDoc._id, 'Length:', largeText.length);
  await processDocument(largeDoc._id);

  const finalLargeDoc = await Document.findById(largeDoc._id);
  const largeSummary = await Summary.findOne({ document: largeDoc._id });
  console.log('Large Doc Status:', finalLargeDoc.status, 'Error:', finalLargeDoc.error);
  console.log('Large Summary exists:', Boolean(largeSummary), 'Quiz items:', largeSummary?.quiz?.length);

  // Cleanup
  await Document.findByIdAndDelete(shortDoc._id);
  await Document.findByIdAndDelete(largeDoc._id);
  await Summary.deleteMany({ document: { $in: [shortDoc._id, largeDoc._id] } });

  console.log('\n--- Debug Pipeline Test Complete ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal debug error:', err);
  process.exit(1);
});

