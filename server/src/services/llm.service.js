import { GoogleGenAI } from '@google/genai';
import { cleanPdfText } from './extract.service.js';

// Google deprecates Gemini models on a rolling schedule.
// Official deprecations & active models list: https://ai.google.dev/gemini-api/docs/deprecations
// Primary: 'gemini-3.1-flash-lite' (fastest & lowest cost for free-tier / portfolio use)
// Fallbacks: 'gemini-3-flash-preview', 'gemini-flash-latest'
const PREFERRED_MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-flash-latest'];
const GEMINI_TIMEOUT_MS = 45000; // 45s per model call to allow rich structured synthesis

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isKeyPresent(apiKey) {
  return Boolean(
    apiKey &&
    apiKey.trim().length >= 20 &&
    !/your_gemini_api_key|changeme|xxx|placeholder/i.test(apiKey)
  );
}

// Fast fail on quota exhaustion; retry only transient hiccups (503, brief timeout)
async function callWithRetries(fn, retries = 0, label = 'Gemini call') {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status ?? err?.code;
      const msg = err?.message || '';

      // If quota is exhausted or daily limit reached, do NOT retry this model in a loop
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

// Sample text intelligently if very long to stay within context and represent the whole document
function prepareDocumentText(transcript, maxChars = 32000) {
  if (!transcript || transcript.length <= maxChars) return transcript || '';
  const headLen = Math.floor(maxChars * 0.45);
  const midLen = Math.floor(maxChars * 0.25);
  const tailLen = Math.floor(maxChars * 0.30);
  const midStart = Math.floor((transcript.length - midLen) / 2);

  return [
    transcript.slice(0, headLen),
    '\n\n[... middle section omitted for length ...]\n\n',
    transcript.slice(midStart, midStart + midLen),
    '\n\n[... later section omitted for length ...]\n\n',
    transcript.slice(-tailLen)
  ].join('');
}

// Safe JSON parser that strips markdown code blocks and matches outer JSON braces
function parseStructuredJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response from LLM');
  }

  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[LLMService] Failed to parse JSON from model output:', text);
    throw new Error(`Failed to parse structured JSON from model response: ${parseErr.message}`);
  }
}

export function isTopicListOrHeadingPattern(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (/[,–—\-:]$/.test(t)) return true;
  const parts = t.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const hasExplanatoryVerb = /\b(is|are|was|were|refers to|defined as|means|process of|technique of|method for|algorithm that|used to|used for|consists of visiting|involves)\b/i.test(t);
    const avgWordsPerPart = parts.reduce((acc, p) => acc + p.split(/\s+/).length, 0) / parts.length;
    if (avgWordsPerPart <= 5 && !hasExplanatoryVerb) {
      return true;
    }
  }
  return false;
}

export function isDefinitionQuestion(front) {
  if (!front || typeof front !== 'string') return false;
  return /\b(definition of|what is|what are|define)\b/i.test(front.trim());
}

export function isValidFlashcardAnswer(answer) {
  if (!answer || typeof answer !== 'string') return false;
  const trimmed = answer.trim();
  if (trimmed.length < 20) return false;
  return /[.!?]$/.test(trimmed);
}

export function isMetaStatement(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 5) return true;
  return (
    /\b(identified in (the|this|our)?\s*(study\s*material|document|text|notes))\b/i.test(t) ||
    /\b(concept (from|in|of) (the|this|our)?\s*(study\s*material|document|text|notes))\b/i.test(t) ||
    /\b(mentioned in (the|this|our)?\s*(study\s*material|document|text|notes))\b/i.test(t) ||
    /\b(found in (the|this|our)?\s*(study\s*material|document|text|notes))\b/i.test(t) ||
    /\b(described in (the|this|our)?\s*(study\s*material|document|text|notes))\b/i.test(t) ||
    /\b(covered in (the|this|our)?\s*(study\s*material|document|text|notes))\b/i.test(t) ||
    /\b(key concept regarding .* identified in)\b/i.test(t) ||
    /\b(core concept relates to (the|this)?\s*document)\b/i.test(t) ||
    /\b(unrelated to system (state|resource|execution))\b/i.test(t) ||
    /\b(only applies in single-threaded architectures)\b/i.test(t) ||
    /\b(obsolete in modern systems)\b/i.test(t) ||
    /\b(deprecated in modern architectures)\b/i.test(t) ||
    /\b(only operates under uniprocessor constraints)\b/i.test(t) ||
    /\b(only relevant for theoretical models)\b/i.test(t) ||
    /\b(superseded by legacy protocols)\b/i.test(t)
  );
}

export function shuffleQuestionOptions(item) {
  if (!item || !Array.isArray(item.options) || item.options.length <= 1) {
    return item;
  }

  const options = [...item.options];
  const origIndex = typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < options.length
    ? item.correctIndex
    : 0;
  const correctAnswer = options[origIndex];

  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = options[i];
    options[i] = options[j];
    options[j] = temp;
  }

  const newIndex = options.indexOf(correctAnswer);

  return {
    ...item,
    options,
    correctIndex: newIndex >= 0 ? newIndex : 0
  };
}

export async function extractInsights(transcript, quizCount = 5, retries = 1) {
  const cleanTranscript = cleanPdfText(transcript || '');
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = isKeyPresent(apiKey);

  if (isKeyConfigured && cleanTranscript && cleanTranscript.trim().length >= 20) {
    const ai = new GoogleGenAI({ apiKey });
    const preparedText = prepareDocumentText(cleanTranscript, 32000);

    const prompt = `
You are an expert study assistant. You will be given the extracted text of a real uploaded document. Extracted text can be messy — repeated headers/footers, broken line breaks, OCR noise. Ignore that noise and reconstruct the underlying content from context.

STEP 1 — CLASSIFY the document into exactly one docType before writing anything else:
- "practical": lab manuals, programming exercises, tool/software how-tos, installation or setup guides, API/CLI references, step-by-step procedures, or any document built around code, commands, or a sequence of actions to perform.
- "theory": lecture notes, textbook chapters, slide decks, academic subject notes — content built around concepts, definitions, mechanisms, and relationships to be understood rather than performed.
- "other": anything that is neither of the above (reports, contracts, meeting notes, articles, business/planning documents, general reading material).

Let this classification drive the STYLE of every question you generate:

IF docType = "practical":
- Ask questions that test the practical/coding skill itself: syntax constructs, function outputs, procedure steps, debugging.
- Every explanation must teach the underlying concept.

IF docType = "theory":
- Ask questions that test definitions, mechanisms, concept comparisons, and cause/effect relationships.
- Wrong options must be plausible distractors from the same subject domain.

IF docType = "other":
- Ask questions testing comprehension of key facts, relationships, and decisions.

STRICT RULES FOR ALL GENERATIONS:
1. Never test the wording or punctuation of the text itself.
2. Ignore titles, course codes, syllabus tables, section numbering, and page headers/footers.
3. The answer to every question must directly and concisely answer the question asked.

FLASHCARD GENERATION RULES:
1. For each flashcard, write the answer ("back") as a complete, self-contained explanation in your own words — 2 to 4 full sentences. Do not copy sentences verbatim from the source text.
2. Never end an answer mid-sentence. Every answer must end with proper punctuation (a period, exclamation mark, or question mark).
3. Do not produce partial or truncated answers under any circumstances. If you are unsure of the full explanation, write a shorter but COMPLETE answer rather than a longer incomplete one.
4. Output strict JSON matching the schema below.

WORKED EXAMPLE FOR FLASHCARDS:
BAD Answer (Truncated / Verbatim fragment - DO NOT DO THIS):
{
  "front": "What is unit testing?",
  "back": "Performed to verify the interface and the"
}

GOOD Answer (Complete, explanatory, in plain language, 2-4 sentences - DO THIS):
{
  "front": "What is unit testing?",
  "back": "Unit testing is a software engineering practice where individual units or components of code are tested in isolation. It verifies that each function or module behaves correctly according to its specifications. By catching defects early in development, unit tests reduce integration issues later in the project."
}

Extract:
1. "summary": A concise executive summary of what the document actually covers.
2. "actionItems": Key actionable items (assignments, deadlines, setup steps), or [] if none exist.
3. "quiz": ${
  quizCount > 0
    ? `Generate exactly ${quizCount} multiple-choice quiz questions testing concepts in the document.`
    : `Return an empty array [] for "quiz".`
}
4. "flashcards": 4 to 8 flashcards in question-and-answer format for active recall practice ("front" is a short question, "back" is a 2 to 4 sentence complete explanation).

Return ONLY valid JSON matching exactly this schema with no markdown formatting, no code fences, and no surrounding text:
{
  "docType": "practical | theory | other",
  "summary": "A clear, well-structured overview of the document's core content.",
  "actionItems": [
    { "task": "Actionable task or follow-up item", "owner": "Assigned person or 'Self'", "dueDate": "e.g. Next week or 'ASAP'" }
  ],
  "quiz": [
    {
      "question": "A question in the style dictated by docType",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ],
  "flashcards": [
    {
      "front": "A short question about a key concept, syntax element, or process",
      "back": "A complete, self-contained 2-4 sentence explanation in plain language ending with proper punctuation"
    }
  ]
}

Document Content:
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
                  temperature: 0.3,
                  maxOutputTokens: 4096
                }
              }),
              GEMINI_TIMEOUT_MS,
              `Gemini ${modelName} generateContent`
            ),
          retries,
          `Gemini ${modelName} generateContent`
        );

        const responseText = result.text || '';
        const candidate = result.candidates?.[0];
        const finishReason = candidate?.finishReason;
        console.log(`[LLMService] Gemini model ${modelName} finishReason: ${finishReason || 'STOP'}`);
        if (finishReason === 'MAX_TOKENS') {
          throw new Error(`Gemini response truncated due to MAX_TOKENS limit (finishReason: ${finishReason})`);
        }

        const parsed = parseStructuredJson(responseText);

        // Validate Flashcards: length >= 20 and ends with punctuation (. ! ?)
        if (Array.isArray(parsed.flashcards)) {
          for (const card of parsed.flashcards) {
            const back = String(card?.back || card?.answer || '').trim();
            if (!isValidFlashcardAnswer(back)) {
              console.warn(`[LLMService] Flashcard answer validation failed (length < 20 or missing ending punctuation): "${back}"`);
              throw new Error(`Flashcard answer validation failed: answer is incomplete or missing ending punctuation ("${back}")`);
            }
          }
        }

        // Post-generation sanity filters
        const isBannedQuestion = (q) => {
          if (!q || typeof q !== 'string') return true;
          const s = q.toLowerCase();
          return (
            s.includes('which term matches') ||
            s.includes('matches this description') ||
            s.includes('which core concept relates') ||
            s.includes('which phrase matches') ||
            s.includes('which word matches') ||
            /what does .* stand for/i.test(s)
          );
        };

        const isCourseCodeOrLabel = (str) => {
          if (!str || typeof str !== 'string') return false;
          const s = str.trim();
          if (/\bL\s*T\s*[\/\s]*P\s*[\/\s]*D\s+C\b/i.test(s) || /\bL\s+T\s+P\s+C\b/i.test(s)) return true;
          if (/^[\d\s\-/–—,.:|]{3,}$/.test(s)) return true;
          if (/^\(?[A-Z0-9]{4,12}\)?[\s\w]*$/i.test(s) && /\d/.test(s) && s.length < 35) return true;
          if (/\b(B\.?Tech|M\.?Tech|II Year|Sem|Semester|Syllabus|Unit\s*[0-9ivx]+)\b/i.test(s) && s.length < 50) return true;
          return false;
        };

        const isHeadingQuestion = (q) => {
          if (!q || typeof q !== 'string') return false;
          return /^What is (introduction|overview|objectives?|outcomes?|unit\s*[0-9ivx]+|ii year|b\.?tech|syllabus)\b/i.test(q.trim());
        };

        // Filter and sanitize quiz items
        let sanitizedQuiz = [];
        if (quizCount > 0 && Array.isArray(parsed.quiz)) {
          sanitizedQuiz = parsed.quiz.filter((item) => {
            if (!item || !item.question || !Array.isArray(item.options)) return false;
            const answer = String(item.options[item.correctIndex] ?? '').trim();
            const words = answer.split(/\s+/).filter(Boolean);

            if (isBannedQuestion(item.question)) return false;
            if (isHeadingQuestion(item.question) || isCourseCodeOrLabel(item.question)) return false;
            if (isCourseCodeOrLabel(answer)) return false;
            if (words.length < 3 && isCourseCodeOrLabel(answer)) return false;
            if (item.options.some(isMetaStatement)) return false;

            return true;
          });
        }

        // Filter and sanitize flashcards (4 to 8 range)
        let sanitizedCards = [];
        if (Array.isArray(parsed.flashcards)) {
          sanitizedCards = parsed.flashcards.filter((card) => {
            if (!card || !card.front || !card.back) return false;
            const front = String(card.front).trim();
            const back = String(card.back).trim();
            const backWords = back.split(/\s+/).filter(Boolean);

            if (backWords.length < 4 || isCourseCodeOrLabel(back)) return false;
            if (isHeadingQuestion(front) || isCourseCodeOrLabel(front)) return false;
            if (isDefinitionQuestion(front) && isTopicListOrHeadingPattern(back)) return false;
            if (isMetaStatement(back)) return false;

            return true;
          });
        }

        // Enforce exact quizCount, shuffle options, and slice cards
        sanitizedQuiz = quizCount > 0 ? sanitizedQuiz.slice(0, quizCount).map(shuffleQuestionOptions) : [];
        sanitizedCards = sanitizedCards.slice(0, 8);

        return {
          docType: ['practical', 'theory', 'other'].includes(parsed.docType) ? parsed.docType : 'other',
          summary: parsed.summary || 'Summary could not be generated.',
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          quiz: sanitizedQuiz,
          flashcards: sanitizedCards
        };
      } catch (err) {
        console.warn(`[LLMService] Gemini model ${modelName} call failed [status=${err?.status ?? err?.code ?? 'n/a'}]:`, err.message);
        // If quota exhausted, don't keep churning through remaining models with the same exhausted quota key
        if (/QuotaFailure|GenerateRequestsPerDay|RESOURCE_EXHAUSTED/i.test(err?.message || '')) {
          console.info('[LLMService] Gemini quota limit reached for project key. Proceeding to smart local NLP fallback.');
          break;
        }
      }
    }
  }

  // Fallback: Generate structured insights using local smart NLP text processing
  console.info('[LLMService] Using local smart NLP summary extractor fallback...');
  return generateLocalInsights(cleanTranscript, quizCount);
}

// Local smart NLP extractor for offline / unconfigured API keys
function generateLocalInsights(transcript, quizCount = 5) {
  const cleanTranscript = cleanPdfText(transcript || '');
  const sentences = cleanTranscript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 300);

  const looksLikeProse = (s) => {
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length < 6) return false;
    const lettersOnly = words.filter((w) => /^[A-Za-z][A-Za-z.,'-]*$/.test(w));
    return lettersOnly.length / words.length >= 0.7;
  };
  const proseSentences = sentences.filter(looksLikeProse);

  if (proseSentences.length < 2) {
    return {
      docType: 'other',
      summary:
        "This document doesn't contain enough real prose/subject matter to summarize or quiz on — it looks like a form, certificate, or data sheet (names, IDs, scores, dates) rather than study content. Try uploading the actual course material instead.",
      actionItems: [],
      quiz: [],
      flashcards: []
    };
  }

  const total = proseSentences.length;
  let selected = [];
  if (total <= 6) {
    selected = proseSentences;
  } else {
    const step = Math.floor(total / 6);
    for (let i = 0; i < 6; i++) {
      const idx = Math.min(i * step, total - 1);
      selected.push(proseSentences[idx]);
    }
  }

  const p1 = selected.slice(0, 2).join(' ');
  const p2 = selected.slice(2, 4).join(' ');
  const p3 = selected.slice(4, 6).join(' ');

  const summary = [p1, p2, p3].filter(Boolean).join('\n\n') || cleanTranscript.slice(0, 600);

  const bannedKeywords = /\b(introduction|overview|objectives?|outcomes?|unit|chapter|section|note|notes|example|examples?|ex|e\.g|i\.e|describe|step|task|index|syllabus|contents?|course|department|college|university|b\.?tech|m\.?tech|semester|year|credits?|lecture|tutorial|practical|l\s*t|page|reference|text\s*book|hall\s*ticket|score|form|figure|fig|table)\b/i;

  const termDefLines = cleanTranscript
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*\u2022\d.)]+/, '').trim())
    .map((line) => {
      const m = line.match(/^([A-Za-z][A-Za-z0-9+#./ ]{1,40}?)\s*[:\u2013\u2014-]\s+(.{10,250})$/);
      return m ? { term: m[1].trim(), def: m[2].trim() } : null;
    })
    .filter(Boolean)
    .filter(({ term, def }) => {
      if (term.length < 3 || term.split(/\s+/).length > 4) return false;
      if (bannedKeywords.test(term)) return false;
      if (/[\/\\]/.test(term) || /\d/.test(term)) return false;
      if (bannedKeywords.test(def) && def.split(/\s+/).length < 8) return false;
      if (/\bL\s*T\s*[\/\s]*P\s*[\/\s]*D\s+C\b/i.test(def)) return false;
      if (/^[\d\s\-/–—,.:|]{3,}$/.test(def)) return false;
      if (isTopicListOrHeadingPattern(def)) return false;
      return true;
    });

  const uniqueTermDefs = [];
  const seenTerms = new Set();
  for (const td of termDefLines) {
    const key = td.term.toLowerCase();
    if (!seenTerms.has(key)) {
      seenTerms.add(key);
      uniqueTermDefs.push(td);
    }
  }

  let flashcards = [];
  let quiz = [];

  const formatLocalAnswer = (text) => {
    let t = String(text || '').trim();
    if (t.length > 250) {
      const lastPunct = Math.max(t.lastIndexOf('.', 250), t.lastIndexOf('!', 250), t.lastIndexOf('?', 250));
      if (lastPunct > 20) {
        t = t.slice(0, lastPunct + 1);
      } else {
        const lastSpace = t.lastIndexOf(' ', 245);
        t = (lastSpace > 20 ? t.slice(0, lastSpace) : t.slice(0, 245)) + '.';
      }
    }
    if (!/[.!?]$/.test(t)) {
      t += '.';
    }
    return t;
  };

  if (uniqueTermDefs.length >= 2) {
    const picked = uniqueTermDefs.slice(0, 8);
    flashcards = picked.map(({ term, def }) => ({
      front: `What is the primary role and definition of ${term}?`,
      back: formatLocalAnswer(def)
    }));

    if (quizCount > 0) {
      for (let i = 0; i < Math.min(quizCount, picked.length); i++) {
        const { term, def } = picked[i % picked.length];
        const otherDefs = picked
          .filter((td) => td.term.toLowerCase() !== term.toLowerCase())
          .map((td) => td.def);

        const correctAns = def.length > 130 ? def.slice(0, 127) + '…' : def;
        const distractor1 = otherDefs[0] ? (otherDefs[0].length > 130 ? otherDefs[0].slice(0, 127) + '…' : otherDefs[0]) : `It defines execution parameters independently of ${term}.`;
        const distractor2 = otherDefs[1] ? (otherDefs[1].length > 130 ? otherDefs[1].slice(0, 127) + '…' : otherDefs[1]) : `It acts as an auxiliary utility strictly for output formatting.`;
        const distractor3 = 'It is an unrelated auxiliary component not covered in the core principles.';
        const rawQ = {
          question: `In the context of the study material, which statement accurately explains "${term}"?`,
          options: [correctAns, distractor1, distractor2, distractor3],
          correctIndex: 0
        };
        quiz.push(shuffleQuestionOptions(rawQ));
      }
    }
  } else {
    const validSentences = proseSentences.filter((s) => !bannedKeywords.test(s));

    flashcards = validSentences.slice(0, 6).map((s) => {
      const words = s.split(/\s+/).filter((w) => w.length > 4 && /^[a-zA-Z]+$/.test(w) && !bannedKeywords.test(w));
      const topic = words[0] || 'Key Concept';
      return {
        front: `What key concept is described regarding ${topic}?`,
        back: formatLocalAnswer(s)
      };
    });

    if (quizCount > 0 && validSentences.length > 0) {
      for (let i = 0; i < Math.min(quizCount, validSentences.length); i++) {
        const sent = validSentences[i % validSentences.length];
        const keyWordsInSent = sent.split(/\s+/).filter((w) => w.length > 4 && /^[a-zA-Z]+$/.test(w) && !bannedKeywords.test(w));
        const targetConcept = keyWordsInSent[0] || 'this concept';

        const correctAns = sent.length > 130 ? sent.slice(0, 127) + '…' : sent;
        const otherSentences = validSentences.filter((s) => s !== sent);
        const distractor1 = otherSentences[0] ? (otherSentences[0].length > 130 ? otherSentences[0].slice(0, 127) + '…' : otherSentences[0]) : 'It is an unrelated auxiliary component not covered in the core principles.';
        const distractor2 = otherSentences[1] ? (otherSentences[1].length > 130 ? otherSentences[1].slice(0, 127) + '…' : otherSentences[1]) : 'It outlines external dependencies rather than internal behavioral mechanisms.';
        const distractor3 = 'It represents diagnostic checks executed only during system maintenance.';

        const rawQ = {
          question: `Which statement accurately reflects the document's explanation regarding "${targetConcept}"?`,
          options: [correctAns, distractor1, distractor2, distractor3],
          correctIndex: 0
        };
        quiz.push(shuffleQuestionOptions(rawQ));
      }
    }
  }

  // Extract Action Items
  const actionVerbs = /\b(must|should|need to|will|action|task|prepare|review|submit|complete|due)\b/i;
  const actionItems = proseSentences
    .filter((s) => actionVerbs.test(s))
    .slice(0, 4)
    .map((task) => ({
      task: task.length > 120 ? task.slice(0, 117) + '…' : task,
      owner: 'Self',
      dueDate: 'ASAP'
    }));

  return {
    docType: 'other',
    summary,
    actionItems,
    quiz,
    flashcards
  };
}

// Chat / Q&A with document context
export async function chatWithDocument(transcript, history = [], userMessage, retries = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = isKeyPresent(apiKey);

  if (isKeyConfigured) {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are a helpful study tutor helping a student understand their document.
Answer questions accurately based on the provided document content.
If the answer is not in the document, use your general knowledge but clearly state that it's outside the provided text.
Keep answers concise, clear, and easy to study.

Document text:
"""
${transcript.slice(0, 30000)}
"""`;

    for (const modelName of PREFERRED_MODELS) {
      try {
        const chat = ai.chats.create({
          model: modelName,
          history: [
            {
              role: 'user',
              parts: [{ text: systemInstruction }]
            },
            {
              role: 'model',
              parts: [{ text: "Understood! I'm ready to answer any questions about this document." }]
            },
            ...history.map((msg) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            }))
          ]
        });

        const result = await callWithRetries(
          () => withTimeout(chat.sendMessage({ message: userMessage }), GEMINI_TIMEOUT_MS, `Gemini ${modelName} sendMessage`),
          retries,
          `Gemini ${modelName} sendMessage`
        );
        return result.text;
      } catch (err) {
        console.warn(`[LLMService] Chat model ${modelName} failed [status=${err?.status ?? err?.code ?? 'n/a'}]:`, err.message);
      }
    }
  }

  // Local fallback response for chat
  const sentences = transcript.split(/(?<=[.!?])\s+/);
  const relevantSentence = sentences.find((s) =>
    userMessage.toLowerCase().split(' ').some((w) => w.length > 3 && s.toLowerCase().includes(w))
  );

  if (relevantSentence) {
    return `Based on your document: "${relevantSentence}"`;
  }
  return `Based on the uploaded document, here is a key excerpt: "${transcript.slice(0, 250)}…"`;
}

// ---------------------------------------------------------------------------
// Concept-targeted Question Generator for Daily Review & Spaced Repetition
// ---------------------------------------------------------------------------
const DOMAIN_CONCEPT_KNOWLEDGE = {
  encryption: {
    definition: 'The cryptographic process of converting plaintext into ciphertext to prevent unauthorized access and protect confidentiality.',
    distractors: [
      'The algorithmic compression of data files to reduce transmission bandwidth without cryptographic security.',
      'The mathematical computation of fixed-length message digests used strictly to verify data integrity.',
      'The network protocol used to dynamically route packets across distributed autonomous systems.'
    ],
    explanation: 'Encryption ensures confidentiality by transforming readable data into ciphertext using cryptographic ciphers.'
  },
  cryptography: {
    definition: 'The discipline and practice of developing secure communications techniques that protect information from adversaries.',
    distractors: [
      'The physical shielding of transmission cables to prevent electromagnetic eavesdropping.',
      'The automated backup and synchronization of database transactions across remote servers.',
      'The process of compiling high-level source code into machine-executable binary instructions.'
    ],
    explanation: 'Cryptography provides information security services including confidentiality, integrity, authentication, and non-repudiation.'
  },
  confidentiality: {
    definition: 'The security principle ensuring that sensitive information is accessible only to authorized entities and kept secret from others.',
    distractors: [
      'The guarantee that transmitted data has not been modified or corrupted in transit.',
      'The requirement that authorized users have uninterrupted access to system resources.',
      'The mechanism that prevents a sender from denying having sent a message.'
    ],
    explanation: 'Confidentiality guarantees that unauthorized parties cannot inspect or read private information.'
  },
  'active attack': {
    definition: 'A security breach attempt where the adversary alters system resources or affects their operation, such as modifying transmitted data.',
    distractors: [
      'A passive surveillance attempt that monitors data traffic without modifying the transmitted content.',
      'A scheduled penetration test conducted by certified administrators during maintenance windows.',
      'A hardware failure caused by electrical fluctuations in network switches.'
    ],
    explanation: 'Active attacks involve tampering, message fabrication, or denial of service, unlike passive attacks which only intercept data.'
  }
};

export function generateLocalConceptQuestion(concept, documentContext = '') {
  const cName = (concept.name || 'Core Concept').trim();
  const lowerName = cName.toLowerCase();

  if (DOMAIN_CONCEPT_KNOWLEDGE[lowerName]) {
    const k = DOMAIN_CONCEPT_KNOWLEDGE[lowerName];
    return shuffleQuestionOptions({
      conceptName: cName,
      question: `What is the primary definition and role of ${cName}?`,
      options: [k.definition, ...k.distractors],
      correctIndex: 0,
      explanation: k.explanation
    });
  }

  let correctAns = concept.definition && !isMetaStatement(concept.definition)
    ? concept.definition.trim()
    : null;

  if (!correctAns && documentContext) {
    const regex = new RegExp(`(?:${cName})\\s+(?:is|are|refers to|means|defined as|consists of|involves)\\s+([^.!?\\n]{15,200})[.!?\\n]`, 'i');
    const match = documentContext.match(regex);
    if (match && match[0]) {
      correctAns = match[0].trim();
    } else {
      const sentences = documentContext.split(/(?<=[.!?])\s+/);
      const relevant = sentences.find((s) => s.toLowerCase().includes(lowerName) && s.length > 25 && s.length < 250);
      if (relevant) correctAns = relevant.trim();
    }
  }

  if (!correctAns) {
    correctAns = `${cName} is a foundational mechanism used to manage, process, or secure operations within the domain.`;
  }

  const distractors = [
    `It acts strictly as an auxiliary presentation filter rather than modifying core operations of ${cName}.`,
    `It defines an external environment configuration superseded by modern runtime specifications.`,
    `It represents a temporary caching mechanism discarded immediately following routine execution.`
  ];

  return shuffleQuestionOptions({
    conceptName: cName,
    question: `What is the primary role and definition of ${cName}?`,
    options: [correctAns, ...distractors],
    correctIndex: 0,
    explanation: concept.keyTakeaway && !isMetaStatement(concept.keyTakeaway)
      ? concept.keyTakeaway
      : `${cName} is defined as: ${correctAns}`
  });
}

export async function generateConceptReviewQuestions(concepts = [], documentContext = '') {
  if (!Array.isArray(concepts) || concepts.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = isKeyPresent(apiKey);

  if (isKeyConfigured) {
    const ai = new GoogleGenAI({ apiKey });
    const conceptsSummary = concepts
      .map((c, i) => `${i + 1}. Concept: "${c.name}" | Subject: "${c.subjectName || 'General'}" | Topic: "${c.topicName || 'Core Topic'}"`)
      .join('\n');

    const prompt = `
You are an expert learning scientist and tutor. Generate high-quality multiple-choice review questions for active recall practice, testing conceptual mastery of these specific concepts:

${conceptsSummary}

${documentContext ? `Reference Study Context:\n"""\n${documentContext.slice(0, 15000)}\n"""\n` : ''}

STRICT RULES:
1. Never test wording of the text itself. Never test course codes, syllabus tables, section numbers, or page headers.
2. The correct answer MUST be an actual, specific definition or explanation of the concept itself.
3. Distractors MUST be plausible-but-wrong statements specifically about that concept.
4. For each concept, generate exactly one question with 4 options (1 correct answer and 3 specific distractors).

Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "conceptName": "Exact Concept Name",
      "question": "Clear question testing the definition, role, or mechanism of the concept",
      "options": ["Correct Answer", "Plausible Distractor 1", "Plausible Distractor 2", "Plausible Distractor 3"],
      "correctIndex": 0,
      "explanation": "Clear 1-2 sentence explanation of why the correct answer is right."
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
              `Gemini ${modelName} concept review`
            ),
          0,
          `Gemini ${modelName} concept review`
        );

        const responseText = result.text || '';
        const parsed = parseStructuredJson(responseText);

        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const validQuestions = [];
          for (const q of parsed.questions) {
            if (!q || !q.question || !Array.isArray(q.options) || q.options.length < 4) continue;
            if (q.options.some(isMetaStatement)) continue;
            validQuestions.push(shuffleQuestionOptions(q));
          }
          if (validQuestions.length > 0) {
            return validQuestions;
          }
        }
      } catch (err) {
        console.warn(`[LLMService] Concept review generation failed on Gemini ${modelName}:`, err.message);
        if (/QuotaFailure|GenerateRequestsPerDay|RESOURCE_EXHAUSTED/i.test(err?.message || '')) {
          break;
        }
      }
    }
  }

  // Fallback: Smart local domain synthesis
  return concepts.map((c) => generateLocalConceptQuestion(c, documentContext));
}