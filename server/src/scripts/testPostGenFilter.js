// Test post-generation sanity filter logic
const mockParsed = {
  docType: 'theory',
  summary: 'A study of algorithms and performance analysis.',
  actionItems: [],
  quiz: [
    {
      question: 'What is II Year B.Tech IT and what is it used for?',
      options: ['II Sem L T/P/D C', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0
    },
    {
      question: 'What is Introduction and what is it used for?',
      options: ['Algorithm, Psuedo code for expressing algorithms, Performance Analysis', 'Opt 2', 'Opt 3', 'Opt 4'],
      correctIndex: 0
    },
    {
      question: 'What is the time complexity of Merge Sort in the worst case?',
      options: ['O(n log n)', 'O(n^2)', 'O(n)', 'O(1)'],
      correctIndex: 0
    },
    {
      question: 'Which algorithmic paradigm divides a problem into subproblems, solves them recursively, and combines their solutions?',
      options: ['Divide and Conquer', 'Greedy Method', 'Dynamic Programming', 'Backtracking'],
      correctIndex: 0
    },
    {
      question: 'What is asymptotic notation used for in algorithm analysis?',
      options: ['Describing the rate of growth of running time as input size increases', 'Syntax checking', 'Compiler optimization', 'Hardware diagnostics'],
      correctIndex: 0
    }
  ],
  flashcards: [
    {
      front: 'What is II Year B.Tech IT and what is it used for?',
      back: 'II Sem L T/P/D C'
    },
    {
      front: 'What is Introduction and what is it used for?',
      back: 'Algorithm, Psuedo code for expressing algorithms, Performance Analysis'
    },
    {
      front: 'What is an algorithm?',
      back: 'A finite sequence of unambiguous instructions designed to solve a specific computational problem.'
    },
    {
      front: 'What is space complexity?',
      back: 'The total amount of memory space required by an algorithm to execute to completion as a function of input size.'
    },
    {
      front: 'What is the divide and conquer paradigm?',
      back: 'A strategy that divides a problem into smaller subproblems of the same type, solves them recursively, and combines the solutions.'
    },
    {
      front: 'What is asymptotic upper bound represented by Big-O notation?',
      back: 'A mathematical boundary that characterizes the maximum growth rate of an algorithm running time for sufficiently large inputs.'
    }
  ]
};

const isCourseCodeOrLabel = (str) => {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  if (/\bL\s*T\s*\/?\s*P\s*\/?\s*D\s+C\b/i.test(s) || /\bL\s+T\s+P\s+C\b/i.test(s)) return true;
  if (/^[\d\s\-/–—,]{3,}$/.test(s)) return true;
  if (/^\(?[A-Z0-9]{4,12}\)?[\s\w]*$/i.test(s) && /\d/.test(s) && s.length < 35) return true;
  if (/\b(B\.?Tech|M\.?Tech|II Year|Sem|Semester|Syllabus|Unit\s*[0-9ivx]+)\b/i.test(s) && s.length < 40) return true;
  return false;
};

const isHeadingQuestion = (q) => {
  if (!q || typeof q !== 'string') return false;
  return /^What is (introduction|overview|objectives?|outcomes?|unit\s*[0-9ivx]+|ii year|b\.?tech|syllabus)\b/i.test(q.trim());
};

const quizCount = 3;

// Filter and sanitize quiz items
let sanitizedQuiz = mockParsed.quiz.filter((item) => {
  if (!item || !item.question || !Array.isArray(item.options)) return false;
  const answer = String(item.options[item.correctIndex] ?? '').trim();
  const words = answer.split(/\s+/).filter(Boolean);

  if (isCourseCodeOrLabel(answer)) return false;
  if (words.length < 4 && (/[\/\\–—\-]/.test(answer) || /\d/.test(answer)) && isCourseCodeOrLabel(answer)) return false;
  if (isHeadingQuestion(item.question) || isCourseCodeOrLabel(item.question)) return false;

  return true;
});

// Filter and sanitize flashcards (4 to 8 range)
let sanitizedCards = mockParsed.flashcards.filter((card) => {
  if (!card || !card.front || !card.back) return false;
  const front = String(card.front).trim();
  const back = String(card.back).trim();
  const backWords = back.split(/\s+/).filter(Boolean);

  if (backWords.length < 4 || isCourseCodeOrLabel(back)) return false;
  if (isHeadingQuestion(front) || isCourseCodeOrLabel(front)) return false;

  return true;
});

sanitizedQuiz = quizCount > 0 ? sanitizedQuiz.slice(0, quizCount) : [];
sanitizedCards = sanitizedCards.slice(0, 8);

console.log('Sanitized Quiz Count:', sanitizedQuiz.length, '(Requested:', quizCount, ')');
console.log('Sanitized Quiz Questions:');
sanitizedQuiz.forEach((q, idx) => console.log(` ${idx + 1}.`, q.question));

console.log('\nSanitized Flashcards Count:', sanitizedCards.length, '(Range 4-8)');
console.log('Sanitized Flashcards:');
sanitizedCards.forEach((c, idx) => console.log(` ${idx + 1}.`, c.front, '->', c.back));

// Assertions
if (sanitizedQuiz.length !== quizCount) {
  throw new Error(`Expected exactly ${quizCount} quiz questions, got ${sanitizedQuiz.length}`);
}
if (sanitizedCards.length < 4 || sanitizedCards.length > 8) {
  throw new Error(`Expected flashcards between 4 and 8, got ${sanitizedCards.length}`);
}
for (const q of sanitizedQuiz) {
  if (/II Year|Introduction and what is it used for/i.test(q.question)) {
    throw new Error('Bogus question passed through!');
  }
}
for (const c of sanitizedCards) {
  if (/II Year|Introduction and what is it used for/i.test(c.front) || /II Sem L T\/P\/D C/i.test(c.back)) {
    throw new Error('Bogus card passed through!');
  }
}

console.log('\n✅ Post-generation sanity filter successfully dropped front-matter questions and enforced count constraints!');

