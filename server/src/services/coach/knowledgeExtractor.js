import { GoogleGenAI } from '@google/genai';
import Subject from '../../models/Subject.js';
import Topic from '../../models/Topic.js';
import Concept from '../../models/Concept.js';
import ConceptDependency from '../../models/ConceptDependency.js';

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

function prepareDocumentText(transcript, maxChars = 30000) {
  if (!transcript || transcript.length <= maxChars) return transcript || '';
  const headLen = Math.floor(maxChars * 0.5);
  const tailLen = Math.floor(maxChars * 0.5);
  return [
    transcript.slice(0, headLen),
    '\n\n[... middle section omitted for analysis ...]\n\n',
    transcript.slice(-tailLen)
  ].join('');
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

export async function extractKnowledgeHierarchy(rawText, docId, userId) {
  const apiKey = process.env.GEMINI_API_KEY;
  let rawHierarchy = null;

  if (isKeyPresent(apiKey) && rawText && rawText.trim().length >= 20) {
    const ai = new GoogleGenAI({ apiKey });
    const preparedText = prepareDocumentText(rawText, 30000);

    const prompt = `
You are a master curriculum architect and learning scientist. Analyze the uploaded study material and extract a structured knowledge hierarchy and concept dependency graph.

Tasks:
1. Identify the primary subject domain (e.g. "Operating Systems", "Data Structures & Algorithms", "Distributed Systems", "General Biology", etc.).
2. Extract the key Topics covered under this Subject.
3. For each Topic, extract individual granular, testable Concepts.
4. For each Concept:
   - "name": Concise standard concept name (e.g. "Hold and Wait Condition", "Sliding Window Protocol", "B-Tree Balancing").
   - "definition": Clear, precise 1-2 sentence definition.
   - "keyTakeaway": What a student must understand to master this concept.
   - "difficulty": "easy" | "medium" | "hard" | "advanced"
   - "importance": "core" | "supporting" | "advanced"
   - "prerequisites": List of 0-3 prerequisite concept names that must be understood *before* this concept (can reference other concepts in this document or fundamental building blocks).

Return ONLY valid JSON matching this schema:
{
  "subject": {
    "name": "Subject Name",
    "description": "Short 1-sentence description of the subject area"
  },
  "topics": [
    {
      "name": "Topic Name",
      "description": "Short topic overview",
      "concepts": [
        {
          "name": "Concept Name",
          "definition": "Clear concise definition",
          "keyTakeaway": "Key principle or rule",
          "difficulty": "easy | medium | hard | advanced",
          "importance": "core | supporting | advanced",
          "prerequisites": ["Prerequisite Concept 1"]
        }
      ]
    }
  ]
}

Study Material:
"""
${preparedText}
"""
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
                  temperature: 0.2
                }
              }),
              GEMINI_TIMEOUT_MS,
              `Knowledge Extraction (${modelName})`
            ),
          0,
          `Knowledge Extraction (${modelName})`
        );

        let cleaned = (result.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
        rawHierarchy = JSON.parse(cleaned);
        if (rawHierarchy?.subject?.name && Array.isArray(rawHierarchy?.topics)) {
          break;
        }
      } catch (err) {
        console.warn(`Knowledge extraction failed with model ${modelName}:`, err.message);
        if (/QuotaFailure|GenerateRequestsPerDay|RESOURCE_EXHAUSTED/i.test(err?.message || '')) {
          console.info('Gemini quota limit reached for project key in knowledge extraction. Using smart local extractor.');
          break;
        }
      }
    }
  }

  // Fallback to local heuristic extractor if Gemini fails or is not configured
  if (!rawHierarchy || !rawHierarchy.subject?.name || !Array.isArray(rawHierarchy.topics)) {
    console.info('Using smart local knowledge hierarchy fallback extractor...');
    rawHierarchy = generateLocalHierarchy(rawText);
  }

  // Persist into MongoDB with deduplication and cross-linking
  return await persistKnowledgeGraph(rawHierarchy, docId, userId);
}

function generateLocalHierarchy(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0]?.slice(0, 50) || 'General Study Material';

  // Extract key capitalized phrases or frequent terms
  const words = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || ['Core Principles', 'Foundational Concepts'];
  const termCounts = {};
  for (const w of words) {
    if (w.length > 3 && !/^(The|This|That|These|Those|When|What|Where|Which|Who|Why|How|And|For|With|From|Into|About)$/i.test(w)) {
      termCounts[w] = (termCounts[w] || 0) + 1;
    }
  }

  const sortedTerms = Object.entries(termCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);

  const topConcepts = sortedTerms.slice(0, 6);
  if (topConcepts.length === 0) {
    topConcepts.push('Fundamentals', 'Key Applications');
  }

  return {
    subject: {
      name: title.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'General Studies',
      description: 'Extracted study domain overview.'
    },
    topics: [
      {
        name: 'Core Concepts',
        description: 'Primary topics covered in the study document.',
        concepts: topConcepts.map((name, idx) => {
          let def = null;
          if (text) {
            const regex = new RegExp(`(?:${name})\\s+(?:is|are|refers to|means|defined as|consists of|involves)\\s+([^.!?\\n]{15,200})[.!?\\n]`, 'i');
            const match = text.match(regex);
            if (match && match[0]) {
              def = match[0].trim();
            } else {
              const sentences = text.split(/(?<=[.!?])\s+/);
              const relevant = sentences.find((s) => s.toLowerCase().includes(name.toLowerCase()) && s.length > 20 && s.length < 250);
              if (relevant) def = relevant.trim();
            }
          }
          if (!def) {
            def = `${name} is a foundational principle and operational mechanism in this domain.`;
          }

          return {
            name,
            definition: def,
            keyTakeaway: `Accurately understanding ${name} is essential for solving core subject problems.`,
            difficulty: idx === 0 ? 'easy' : idx > 3 ? 'hard' : 'medium',
            importance: idx < 2 ? 'core' : 'supporting',
            prerequisites: idx > 0 ? [topConcepts[0]] : []
          };
        })
      }
    ]
  };
}

async function persistKnowledgeGraph(hierarchy, docId, userId) {
  const subjectName = (hierarchy.subject?.name || 'General Studies').trim();
  const subjectDesc = hierarchy.subject?.description || '';

  // 1. Upsert Subject
  const subject = await Subject.findOneAndUpdate(
    { owner: userId, name: subjectName },
    {
      $set: { description: subjectDesc },
      $addToSet: { documents: docId }
    },
    { upsert: true, returnDocument: 'after' }
  );

  const savedTopics = [];
  const conceptNameMap = new Map(); // Name -> Concept doc

  // 2. Upsert Topics and Concepts
  for (const t of hierarchy.topics || []) {
    const topicName = (t.name || 'General Topic').trim();
    if (!topicName) continue;

    const topic = await Topic.findOneAndUpdate(
      { owner: userId, subject: subject._id, name: topicName },
      {
        $set: { description: t.description || '' },
        $addToSet: { documents: docId }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const savedConcepts = [];

    for (const c of t.concepts || []) {
      const conceptName = (c.name || '').trim();
      if (!conceptName) continue;

      const concept = await Concept.findOneAndUpdate(
        { owner: userId, topic: topic._id, name: conceptName },
        {
          $set: {
            subject: subject._id,
            description: c.definition || '',
            definition: c.definition || '',
            keyTakeaway: c.keyTakeaway || '',
            prerequisiteNames: Array.isArray(c.prerequisites) ? c.prerequisites : [],
            difficulty: ['easy', 'medium', 'hard', 'advanced'].includes(c.difficulty) ? c.difficulty : 'medium',
            importance: ['core', 'supporting', 'advanced'].includes(c.importance) ? c.importance : 'core'
          },
          $addToSet: { documents: docId }
        },
        { upsert: true, returnDocument: 'after' }
      );

      conceptNameMap.set(conceptName.toLowerCase(), concept);
      savedConcepts.push(concept);
    }

    savedTopics.push({
      ...topic.toObject(),
      concepts: savedConcepts
    });
  }

  // 3. Resolve Prerequisites and ConceptDependency edges
  for (const topic of savedTopics) {
    for (const concept of topic.concepts) {
      if (concept.prerequisiteNames && concept.prerequisiteNames.length > 0) {
        const prereqIds = [];
        for (const pName of concept.prerequisiteNames) {
          const match = conceptNameMap.get(pName.toLowerCase().trim());
          if (match && String(match._id) !== String(concept._id)) {
            prereqIds.push(match._id);

            // Record directed edge
            await ConceptDependency.findOneAndUpdate(
              { owner: userId, concept: concept._id, prerequisite: match._id },
              {
                $set: {
                  relationshipType: 'requires',
                  strength: 0.85
                }
              },
              { upsert: true }
            );
          }
        }

        if (prereqIds.length > 0) {
          await Concept.findByIdAndUpdate(concept._id, {
            $addToSet: { prerequisites: { $each: prereqIds } }
          });
        }
      }
    }
  }

  return {
    subject,
    topics: savedTopics
  };
}