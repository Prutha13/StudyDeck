import { GoogleGenAI } from '@google/genai';
import Concept from '../../models/Concept.js';
import Mastery from '../../models/Mastery.js';
import Mistake from '../../models/Mistake.js';
import ConceptDependency from '../../models/ConceptDependency.js';
import { recordConceptAttempt } from './masteryCalculator.js';
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

export async function startFixWeaknessSession(userId, preferredConceptId = null) {
  let targetConcept = null;

  if (preferredConceptId) {
    targetConcept = await Concept.findOne({ _id: preferredConceptId, owner: userId });
  }

  if (!targetConcept) {
    // Find the weakest concept with mistakes
    const openMistakes = await Mistake.find({ user: userId, status: { $ne: 'fixed' } })
      .sort({ occurrences: -1, lastOccurredAt: -1 })
      .lean();

    if (openMistakes.length > 0 && openMistakes[0].concept) {
      targetConcept = await Concept.findById(openMistakes[0].concept);
    }

    if (!targetConcept) {
      // Find lowest mastery concept
      const lowestMastery = await Mastery.findOne({ user: userId })
        .sort({ score: 1, attempts: -1 })
        .lean();

      if (lowestMastery) {
        targetConcept = await Concept.findById(lowestMastery.concept);
      }
    }

    if (!targetConcept) {
      targetConcept = await Concept.findOne({ owner: userId });
    }
  }

  if (!targetConcept) {
    return {
      session: null,
      message: 'No concepts found in your knowledge map yet. Please upload study material first.'
    };
  }

  // Prerequisite check: check if any prerequisite concept is weak
  let prerequisiteAdvisory = null;
  const dependencies = await ConceptDependency.find({
    owner: userId,
    concept: targetConcept._id
  }).populate('prerequisite').lean();

  for (const dep of dependencies) {
    if (dep.prerequisite) {
      const prereqMastery = await Mastery.findOne({ user: userId, concept: dep.prerequisite._id });
      if (prereqMastery && prereqMastery.score < 50) {
        prerequisiteAdvisory = {
          prerequisiteId: dep.prerequisite._id,
          prerequisiteName: dep.prerequisite.name,
          message: `You are struggling with "${targetConcept.name}". Your learning history indicates that the underlying foundation "${dep.prerequisite.name}" needs reinforcement first.`
        };
        break;
      }
    }
  }

  // Generate 5-step remediation session
  const session = await generateRemediationSession(targetConcept, prerequisiteAdvisory);

  return {
    concept: targetConcept,
    prerequisiteAdvisory,
    session
  };
}

async function generateRemediationSession(concept, prerequisiteAdvisory) {
  const apiKey = process.env.GEMINI_API_KEY;
  let sessionData = null;

  if (isKeyPresent(apiKey)) {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an expert 1-on-1 teacher guiding a student through a "Fix My Weakness" concept remediation session.

Target Concept: "${concept.name}"
Definition: "${concept.definition}"
Key Takeaway: "${concept.keyTakeaway}"
${prerequisiteAdvisory ? `Prerequisite Context: ${prerequisiteAdvisory.message}` : ''}

Create a structured 5-step learning repair session:
- Step 1: "misconceptionDiagnosis" (Explain why students commonly struggle or confuse this concept).
- Step 2: "intuitiveExplanation" (Provide an alternative, intuitive explanation with a real-world mental model or analogy).
- Step 3: "easyQuestion" (A simple diagnostic multiple choice question to confirm foundational understanding).
- Step 4: "mediumQuestion" (An application question testing the concept in practice).
- Step 5: "masteryQuestion" (A challenging question to verify complete mastery).

Return ONLY valid JSON matching this schema:
{
  "conceptName": "${concept.name}",
  "step1_diagnosis": "Clear breakdown of common pitfalls and confusion points...",
  "step2_explanation": "Intuitive mental model and core rule explained simply...",
  "questions": [
    {
      "step": 3,
      "level": "Easy Check",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why correct"
    },
    {
      "step": 4,
      "level": "Medium Application",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why correct"
    },
    {
      "step": 5,
      "level": "Mastery Verification",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why correct"
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
              `Fix Weakness Session (${modelName})`
            ),
          1,
          `Fix Weakness Session (${modelName})`
        );

        let cleaned = (result.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
        sessionData = JSON.parse(cleaned);

        if (sessionData?.step1_diagnosis && Array.isArray(sessionData?.questions)) {
          const valid = sessionData.questions
            .filter((q) => q && q.question && Array.isArray(q.options) && !q.options.some(isMetaStatement))
            .map(shuffleQuestionOptions);
          if (valid.length >= 3) {
            sessionData.questions = valid;
            break;
          }
        }
      } catch (err) {
        console.warn(`Fix weakness model call failed on ${modelName}:`, err.message);
      }
    }
  }

  if (!sessionData || !Array.isArray(sessionData.questions)) {
    const correct1 = concept.definition && !isMetaStatement(concept.definition)
      ? concept.definition
      : `${concept.name} is a foundational mechanism utilized in this domain.`;

    sessionData = {
      conceptName: concept.name,
      step1_diagnosis: `Students often confuse ${concept.name} with related principles or overlook its key preconditions.`,
      step2_explanation: `${correct1} Remember: ${concept.keyTakeaway && !isMetaStatement(concept.keyTakeaway) ? concept.keyTakeaway : 'Review the core rules.'}`,
      questions: [
        shuffleQuestionOptions({
          step: 3,
          level: 'Easy Check',
          question: `What is the core definition of ${concept.name}?`,
          options: [
            correct1,
            `It acts strictly as an auxiliary presentation filter rather than modifying core operations.`,
            `It defines an external environment configuration superseded by modern specifications.`,
            `It represents a temporary caching mechanism discarded immediately following execution.`
          ],
          correctIndex: 0,
          explanation: `${correct1}`
        }),
        shuffleQuestionOptions({
          step: 4,
          level: 'Medium Application',
          question: `In what scenario is ${concept.name} directly relevant?`,
          options: [
            `When ensuring system correctness and resource allocation constraints.`,
            `Only during static file compilation.`,
            `Exclusively on mobile operating systems without network connectivity.`,
            `Never in production environments.`
          ],
          correctIndex: 0,
          explanation: `It is essential for ensuring correctness and resource allocation constraints.`
        }),
        shuffleQuestionOptions({
          step: 5,
          level: 'Mastery Verification',
          question: `Which of the following demonstrates advanced mastery of ${concept.name}?`,
          options: [
            `Correctly applying the principle to resolve edge cases and prevent systemic failures.`,
            `Ignoring prerequisite relationships.`,
            `Assuming all resources are infinitely shareable without validation.`,
            `Disabling synchronization checks during peak concurrent throughput.`
          ],
          correctIndex: 0,
          explanation: `Advanced mastery means accurately applying the concept to prevent system failure modes.`
        })
      ]
    };
  }

  return sessionData;
}

export async function submitFixWeaknessStep({ userId, conceptId, stepIndex, isCorrect }) {
  if (isCorrect) {
    await recordConceptAttempt({
      userId,
      conceptId,
      isCorrect: true,
      source: 'fix_weakness',
      difficulty: stepIndex === 5 ? 'hard' : stepIndex === 4 ? 'medium' : 'easy'
    });

    // Mark any open mistakes for this concept as improving or fixed
    await Mistake.updateMany(
      { user: userId, concept: conceptId, status: 'needs_revision' },
      { $set: { status: 'improving' } }
    );
  }

  return { success: true };
}