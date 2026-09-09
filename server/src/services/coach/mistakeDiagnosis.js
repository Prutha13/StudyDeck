import { GoogleGenAI } from '@google/genai';
import Mistake from '../../models/Mistake.js';
import Concept from '../../models/Concept.js';
import { recordConceptAttempt } from './masteryCalculator.js';
import { shuffleQuestionOptions, isMetaStatement } from '../llm.service.js';

// Google Deprecations Ref: https://ai.google.dev/gemini-api/docs/deprecations
const PREFERRED_MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest'];
const GEMINI_TIMEOUT_MS = 30000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isKeyPresent(apiKey) {
  return Boolean(apiKey && apiKey.trim().length >= 20 && !/your_gemini_api_key|changeme|xxx|placeholder/i.test(apiKey));
}

async function callWithRetries(fn, retries = 0, label = 'Gemini call') {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status ?? err?.code;
      const msg = err?.message || '';

      const isQuotaExhausted = /QuotaFailure|GenerateRequestsPerDay|RESOURCE_EXHAUSTED|quota/i.test(msg);
      if (isQuotaExhausted) {
        throw err;
      }

      const isTransient = status === 503 || /timed out|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!isTransient || attempt === retries) throw err;
      console.warn(`${label} attempt ${attempt + 1} failed transiently, retrying:`, msg);
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function diagnoseAndRecordMistake({
  userId,
  question,
  studentAnswer,
  correctAnswer,
  options = [],
  conceptName = 'Core Concept',
  documentId = null,
  difficulty = 'medium'
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  let diagnosis = null;

  // Lookup matching concept in DB
  let conceptDoc = null;
  if (conceptName && conceptName !== 'Core Concept' && conceptName !== 'General Knowledge') {
    conceptDoc = await Concept.findOne({
      owner: userId,
      name: { $regex: new RegExp(`^${conceptName.trim()}$`, 'i') }
    });
  }

  // If not found by exact name, look up among the user's concepts (by document or owner)
  if (!conceptDoc && (documentId || userId)) {
    const query = { owner: userId };
    if (documentId) query.documents = documentId;
    let userConcepts = await Concept.find(query);
    if (userConcepts.length === 0 && documentId) {
      userConcepts = await Concept.find({ owner: userId });
    }

    if (userConcepts.length > 0) {
      const textToSearch = `${conceptName || ''} ${question || ''} ${correctAnswer || ''} ${studentAnswer || ''} ${(options || []).join(' ')}`.toLowerCase();

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

      conceptDoc = bestScore > 0 && bestConcept ? bestConcept : userConcepts[0];
    }
  }

  if (isKeyPresent(apiKey)) {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an expert personal learning coach and diagnostic teacher.
A student answered a question INCORRECTLY. Analyze their answer to pinpoint the exact conceptual misunderstanding or confusion.

Context:
- Subject / Concept: "${conceptName}"
- Question: "${question}"
- Available Options: ${JSON.stringify(options)}
- Student's INCORRECT Choice: "${studentAnswer}"
- True CORRECT Answer: "${correctAnswer}"

Tasks:
1. Detect the specific "misconception" (e.g. "Confused Hold and Wait with Circular Wait condition" or "Misunderstood base case termination in recursion").
2. "whyChosen": Analyze why the student likely selected their answer. What partial truth or similar term confused them?
3. "conceptToRevise": The exact concept/topic name they should revise.
4. "miniFix": A targeted, crystal-clear 2-3 sentence explanation directly resolving this specific misconception.
5. "tryAgainQuestion": A fresh, similar multiple-choice practice question targeting the same concept so the student can immediately verify their understanding.

Return ONLY valid JSON matching this schema:
{
  "misconception": "Precise name of the conceptual confusion",
  "whyChosen": "Your answer suggests that you understand X, but confused it with Y...",
  "conceptToRevise": "Concept name",
  "miniFix": "Clear 2-3 sentence targeted explanation...",
  "severity": "minor | moderate | high",
  "tryAgainQuestion": {
    "question": "A fresh practice question testing the repaired concept",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this correct answer is right"
  }
}
`;

    for (const modelName of PREFERRED_MODELS) {
      try {
        const result = await callWithRetries(
          () =>
            withTimeout(
              ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.3
                }
              }),
              GEMINI_TIMEOUT_MS,
              `Mistake Diagnosis (${modelName})`
            ),
          1,
          `Mistake Diagnosis (${modelName})`
        );

        let cleaned = (result.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
        diagnosis = JSON.parse(cleaned);

        if (diagnosis?.misconception && diagnosis?.miniFix && diagnosis?.tryAgainQuestion) {
          if (Array.isArray(diagnosis.tryAgainQuestion.options) && !diagnosis.tryAgainQuestion.options.some(isMetaStatement)) {
            diagnosis.tryAgainQuestion = shuffleQuestionOptions(diagnosis.tryAgainQuestion);
            break;
          }
        }
      } catch (err) {
        console.warn(`Diagnosis call failed on ${modelName}:`, err.message);
      }
    }
  }

  // Fallback if AI call was unavailable
  if (!diagnosis || !diagnosis.misconception) {
    console.info('Using smart local mistake diagnosis fallback...');
    diagnosis = generateLocalDiagnosis(question, studentAnswer, correctAnswer, conceptName);
  }

  // Persist mistake into Mistake Book
  let mistake = await Mistake.findOne({
    user: userId,
    question: question.trim(),
    studentAnswer: studentAnswer.trim()
  });

  const resolvedConceptName = conceptDoc?.name || diagnosis.conceptToRevise || conceptName || 'Key Concept';

  if (mistake) {
    mistake.occurrences += 1;
    mistake.lastOccurredAt = new Date();
    mistake.status = 'needs_revision';
    if (!mistake.concept && conceptDoc) {
      mistake.concept = conceptDoc._id;
      mistake.conceptName = resolvedConceptName;
      mistake.subject = conceptDoc.subject || mistake.subject;
      mistake.topic = conceptDoc.topic || mistake.topic;
    }
    mistake.misconception = diagnosis.misconception;
    mistake.whyChosen = diagnosis.whyChosen;
    mistake.miniFix = diagnosis.miniFix;
    mistake.tryAgainQuestion = diagnosis.tryAgainQuestion;
    await mistake.save();
  } else {
    mistake = await Mistake.create({
      user: userId,
      concept: conceptDoc?._id || null,
      conceptName: resolvedConceptName,
      subject: conceptDoc?.subject || null,
      topic: conceptDoc?.topic || null,
      document: documentId,
      question,
      options,
      studentAnswer,
      correctAnswer,
      misconception: diagnosis.misconception,
      whyChosen: diagnosis.whyChosen,
      conceptToRevise: resolvedConceptName,
      miniFix: diagnosis.miniFix,
      tryAgainQuestion: diagnosis.tryAgainQuestion,
      difficulty,
      severity: diagnosis.severity || 'moderate',
      occurrences: 1,
      status: 'needs_revision'
    });
  }

  // Automatically update concept mastery if concept exists
  if (conceptDoc) {
    await recordConceptAttempt({
      userId,
      conceptId: conceptDoc._id,
      isCorrect: false,
      source: 'quiz',
      difficulty
    }).catch((err) => console.warn('Mastery deduction error on mistake:', err.message));
  }

  return {
    mistake,
    diagnosis
  };
}

function generateLocalDiagnosis(question, studentAnswer, correctAnswer, conceptName) {
  return {
    misconception: `Confusion regarding ${conceptName || 'the core concept'}`,
    whyChosen: `Your answer "${studentAnswer}" represents a related term but does not satisfy the specific condition required by the question.`,
    conceptToRevise: conceptName || 'Underlying Principle',
    miniFix: `The correct answer is "${correctAnswer}". Pay close attention to how this condition is uniquely defined compared to alternative options.`,
    severity: 'moderate',
    tryAgainQuestion: shuffleQuestionOptions({
      question: `Reviewing ${conceptName || 'this principle'}: Which statement accurately describes ${correctAnswer}?`,
      options: [
        `${correctAnswer} is the verified standard definition for this concept.`,
        `It acts strictly as an alternative configuration not applicable to this question's requirements.`,
        `It represents an obsolete method superseded by modern protocols.`,
        `It applies solely as a formatting parameter without influencing conceptual operations.`
      ],
      correctIndex: 0,
      explanation: `${correctAnswer} directly satisfies the conceptual rule.`
    })
  };
}

export async function submitMistakeRetest({ userId, mistakeId, selectedIndex, selectedAnswer }) {
  const mistake = await Mistake.findOne({ _id: mistakeId, user: userId });
  if (!mistake) {
    throw new Error('Mistake record not found');
  }

  const tryAgain = mistake.tryAgainQuestion;
  if (!tryAgain) {
    throw new Error('No re-test question found for this mistake');
  }

  const isCorrect = selectedIndex === tryAgain.correctIndex || selectedAnswer === tryAgain.options[tryAgain.correctIndex];

  // Update re-test history
  mistake.retestHistory.push({
    retestAt: new Date(),
    isCorrect,
    answer: selectedAnswer || tryAgain.options[selectedIndex]
  });

  if (isCorrect) {
    mistake.status = mistake.retestHistory.filter((r) => r.isCorrect).length >= 2 ? 'fixed' : 'improving';
  } else {
    mistake.status = 'needs_revision';
  }

  await mistake.save();

  // If concept is linked, update student mastery positively on fix
  if (mistake.concept && isCorrect) {
    await recordConceptAttempt({
      userId,
      conceptId: mistake.concept,
      isCorrect: true,
      source: 'retest',
      difficulty: mistake.difficulty
    }).catch(() => {});
  }

  return {
    isCorrect,
    status: mistake.status,
    explanation: tryAgain.explanation,
    correctIndex: tryAgain.correctIndex
  };
}