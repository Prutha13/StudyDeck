import { GoogleGenAI } from '@google/genai';
import Concept from '../../models/Concept.js';
import Mastery from '../../models/Mastery.js';
import Mistake from '../../models/Mistake.js';
import Summary from '../../models/Summary.js';
import Document from '../../models/Document.js';
import { shuffleQuestionOptions, isMetaStatement } from '../llm.service.js';

const PREFERRED_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
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

export async function generateAdaptiveQuiz({ userId, documentId = null, count = 5 }) {
  // 1. Fetch user's concepts, mastery, and active mistakes
  const conceptFilter = { owner: userId };
  if (documentId) conceptFilter.documents = documentId;

  const concepts = await Concept.find(conceptFilter).lean();
  const masteryRecords = await Mastery.find({ user: userId }).lean();
  const masteryMap = new Map(masteryRecords.map((m) => [String(m.concept), m]));

  const openMistakes = await Mistake.find({ user: userId, status: { $ne: 'fixed' } }).lean();

  // 2. Score and rank concepts by priority (weakest & mistakes first)
  const prioritizedConcepts = concepts.map((c) => {
    const m = masteryMap.get(String(c._id));
    const score = m ? m.score : 0;
    const attempts = m ? m.attempts : 0;
    const hasOpenMistake = openMistakes.some((mist) => String(mist.concept) === String(c._id));

    // Priority formula: Low score + has mistakes + due review = Highest priority
    let priorityWeight = 100 - score;
    if (hasOpenMistake) priorityWeight += 40;
    if (attempts === 0) priorityWeight += 20; // unseen concepts also need testing

    return {
      concept: c,
      masteryScore: score,
      attempts,
      priorityWeight,
      difficulty: score >= 75 ? 'hard' : score >= 45 ? 'medium' : 'easy'
    };
  }).sort((a, b) => b.priorityWeight - a.priorityWeight);

  const targetConcepts = prioritizedConcepts.slice(0, Math.min(count, prioritizedConcepts.length));

  if (targetConcepts.length === 0) {
    // If no concepts yet, pull questions from standard document summaries
    if (documentId) {
      const summary = await Summary.findOne({ document: documentId }).lean();
      if (summary?.quiz?.length > 0) {
        return {
          quiz: summary.quiz.slice(0, count),
          adaptiveRationale: 'Standard practice set (no mastery data yet).'
        };
      }
    }
    return { quiz: [], adaptiveRationale: 'No concepts available to generate quiz.' };
  }

  // 3. Generate adaptive targeted questions via Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  let adaptiveQuestions = null;

  if (isKeyPresent(apiKey)) {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an Adaptive Learning Engine. Generate an intelligent adaptive practice quiz tailored specifically to this student's knowledge profile.

Target Concepts & Mastery State:
${targetConcepts
  .map(
    (tc, i) =>
      `${i + 1}. Concept: "${tc.concept.name}" | Definition: "${tc.concept.definition}" | Current Mastery: ${tc.masteryScore}% | Target Difficulty: ${tc.difficulty}`
  )
  .join('\n')}

Generate exactly ${targetConcepts.length} multiple-choice questions. For each question:
- Target the assigned concept at the indicated difficulty.
- Ensure distractors are subject-plausible common misconceptions.
- "conceptName" must match the concept's exact name.

Return ONLY valid JSON matching this schema:
{
  "adaptiveRationale": "Short 1-sentence note explaining why these questions were selected for this student.",
  "quiz": [
    {
      "conceptName": "Concept Name",
      "question": "Clear question text testing real conceptual understanding",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "easy | medium | hard",
      "explanation": "Why the correct answer is right"
    }
  ]
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
              `Adaptive Quiz (${modelName})`
            ),
          1,
          `Adaptive Quiz (${modelName})`
        );

        let cleaned = (result.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
          const valid = parsed.quiz
            .filter((q) => q && q.question && Array.isArray(q.options) && !q.options.some(isMetaStatement))
            .map(shuffleQuestionOptions);
          if (valid.length > 0) {
            adaptiveQuestions = {
              adaptiveRationale: parsed.adaptiveRationale || 'Targeted practice set tailored to your learning profile.',
              quiz: valid
            };
            break;
          }
        }
      } catch (err) {
        console.warn(`Adaptive quiz model call failed on ${modelName}:`, err.message);
      }
    }
  }

  // Fallback if AI call fails
  if (!adaptiveQuestions || !Array.isArray(adaptiveQuestions.quiz)) {
    adaptiveQuestions = {
      adaptiveRationale: 'Targeted practice for your lowest mastery topics.',
      quiz: targetConcepts.map((tc) => {
        const correct = tc.concept.definition && !isMetaStatement(tc.concept.definition)
          ? tc.concept.definition
          : `${tc.concept.name} is a fundamental component of the system.`;
        return shuffleQuestionOptions({
          conceptName: tc.concept.name,
          question: `Regarding ${tc.concept.name}: What is the primary characteristic or role of this concept?`,
          options: [
            correct,
            `It acts as an auxiliary presentation filter rather than modifying core operations.`,
            `It defines an external environment configuration superseded by modern specifications.`,
            `It represents a temporary caching mechanism discarded immediately following routine execution.`
          ],
          correctIndex: 0,
          difficulty: tc.difficulty,
          explanation: `${tc.concept.name} is defined as: ${correct}`
        });
      })
    };
  }

  return adaptiveQuestions;
}