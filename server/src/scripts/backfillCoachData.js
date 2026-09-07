import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Concept from '../models/Concept.js';
import Mistake from '../models/Mistake.js';
import Mastery from '../models/Mastery.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { recordConceptAttempt } from '../services/coach/masteryCalculator.js';

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Backfill mistakes missing concept
  const mistakes = await Mistake.find({ concept: null });
  console.log(`Found ${mistakes.length} mistakes without concept`);

  for (const m of mistakes) {
    const userConcepts = await Concept.find({ owner: m.user });
    if (userConcepts.length === 0) continue;

    const textToSearch = `${m.conceptName || ''} ${m.question || ''} ${m.correctAnswer || ''} ${m.studentAnswer || ''} ${(m.options || []).join(' ')}`.toLowerCase();

    let bestScore = -1;
    let bestConcept = null;

    for (const c of userConcepts) {
      let score = 0;
      const cName = (c.name || '').toLowerCase();
      const cDef = (c.definition || '').toLowerCase();

      if (cName && textToSearch.includes(cName)) {
        score += 50 + cName.length;
      } else if (cName) {
        const tokens = cName.split(/\s+/).filter((t) => t.length > 3);
        for (const token of tokens) {
          if (textToSearch.includes(token)) score += 10;
        }
      }

      if (cDef) {
        const defTokens = cDef.split(/\s+/).filter((t) => t.length > 4);
        for (const token of defTokens) {
          if (textToSearch.includes(token)) score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestConcept = c;
      }
    }

    const matchedConcept = bestScore > 0 && bestConcept ? bestConcept : userConcepts[0];
    if (matchedConcept) {
      m.concept = matchedConcept._id;
      m.conceptName = matchedConcept.name;
      m.subject = matchedConcept.subject || m.subject;
      m.topic = matchedConcept.topic || m.topic;
      await m.save();
      console.log(`Linked mistake ${m._id} -> Concept: ${matchedConcept.name} (${matchedConcept._id})`);

      // Record mistake attempt
      await recordConceptAttempt({
        userId: m.user,
        conceptId: matchedConcept._id,
        isCorrect: false,
        source: 'quiz',
        difficulty: m.difficulty || 'medium'
      });
    }
  }

  // 2. Backfill Mastery for users who took quizzes
  const attempts = await QuizAttempt.find().sort({ completedAt: 1 });
  console.log(`Found ${attempts.length} total quiz attempts`);

  for (const att of attempts) {
    const docConcepts = await Concept.find({ owner: att.user, documents: att.document });
    if (docConcepts.length === 0) continue;

    // Distribute correct/incorrect attempts across document concepts
    const correctCount = Math.min(att.score, docConcepts.length);
    for (let i = 0; i < docConcepts.length; i++) {
      const isCorrect = i < correctCount;
      await recordConceptAttempt({
        userId: att.user,
        conceptId: docConcepts[i]._id,
        isCorrect,
        source: 'quiz',
        difficulty: 'medium'
      });
    }
    console.log(`Processed attempt ${att._id} (Score: ${att.score}/${att.total}) across ${docConcepts.length} concepts`);
  }

  // 3. Ensure all Mastery records have document populated
  const masteriesWithoutDoc = await Mastery.find({ document: null }).populate('concept');
  console.log(`Found ${masteriesWithoutDoc.length} masteries without document ref`);
  for (const m of masteriesWithoutDoc) {
    if (m.concept?.documents?.[0]) {
      m.document = m.concept.documents[0];
      await m.save();
    }
  }

  console.log('Backfill complete!');
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

