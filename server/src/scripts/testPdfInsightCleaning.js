import { cleanPdfText } from '../services/extract.service.js';
import { extractInsights } from '../services/llm.service.js';

// Text from OCR of pages 1, 2, 5 of Design_and_Analysis_Algorithms.pdf
const rawPdfSample = `
DESIGN AND ANALYSIS OF ALGORITHMS Page 1
 
DIGITAL NOTES 
ON 
DESIGN AND ANALYSIS OF ALGORITHMS
B.TECH II YEAR - II SEM
(2017-18) 
DEPARTMENT OF INFORMATION TECHNOLO
MALLA REDDY COLLEGE OF ENGINEERING & TECHNOLOGY
(Autonomous Institution – UGC, Govt. of India)
(Affiliated to JNTUH, Hyderabad, Approved by AICTE - Accredited by NBA & NAAC – ‘A’ Grade - ISO 9001:2015 Certified)
Maisammaguda, Dhulapally (Post Via. Hakimpet), Secunderabad – 500100, Telangana State, INDIA. 

DESIGN AND ANALYSIS OF ALGORITHMS Page 2
MALLA REDDY COLLEGE OF ENGINEERING & TECHNOLOGY
DEPARTMENT OF INFORMATION TECHNOLOGY
 
SYLLABUS
MALLA REDDY COLLEGE OF ENGINEERING AND 
TECHNOLOGY 
II Year B.Tech IT – II Sem L T /P/D C
 4 - / - / - 3
(R15A0508)DESIGN AND ANALYSIS OF ALGORITHMS
Objectives:
 To analyze performance of algorithms.
 To choose the appropriate data structure and algorithm design method for a specified application.
 To understand how the choice of data structures and algorithm design methods impacts the performance of programs.
 To solve problems using algorithm design methods such as the greedy method, divide and conquer, dynamic programming, backtracking and branch and bound.
 Prerequisites (Subjects) Data structures, Mathematical foundations of computer science.

UNIT I:
Introduction: Algorithm, Psuedo code for expressing algorithms, Performance Analysis Space complexity, Time complexity, Asymptotic Notation- Big oh notation, Omega notation, Theta notation and Little oh notation, Probabilistic analysis, Amortized analysis.
Divide and conquer: General method, applications-Binary search, Quick sort, Merge sort, Strassen’s matrix multiplication.

DESIGN AND ANALYSIS OF ALGORITHMS Page 5
MALLA REDDY COLLEGE OF ENGINEERING & TECHNOLOGY
DEPARTMENT OF INFORMATION TECHNOLOGY

UNIT I:
Introduction: Algorithm, Psuedo code for expressing algorithms, Performance Analysis Space complexity, Time complexity, Asymptotic Notation- Big oh notation, Omega notation, Theta notation and Little oh notation, Probabilistic analysis, Amortized analysis.
Divide and conquer: General method, applications-Binary search, Quick sort, Merge sort, Strassen’s matrix multiplication.

INTRODUCTION TO ALGORITHM
History of Algorithm
• The word algorithm comes from the name of a Persian author, Abu Ja’far Mohammed ibn Musa al Khowarizmi (c. 825 A.D.), who wrote a textbook on mathematics. 
• He is credited with providing the step-by-step rules for adding, subtracting, multiplying, and dividing ordinary decimal numbers. 
• When written in Latin, the name became Algorismus, from which algorithm is but a small step.
• This word has taken on a special significance in computer science, where “algorithm” has come to refer to a method that can be used by a computer for the solution of a problem.
• Between 400 and 300 B.C., the great Greek mathematician Euclid invented an algorithm.
• Finding the greatest common divisor (gcd) of two positive integers. 
• The gcd of X and Y is the largest integer that exactly divides both X and Y. 
• Eg., the gcd of 80 and 32 is 16. 
• The Euclidian algorithm, as it is called, is considered to be the first non-trivial algorithm ever devised.

What is an Algorithm?
Algorithm: A finite set of instructions that, if followed, accomplishes a particular task.
`;

async function runTest() {
  console.log('--- 1. Testing cleanPdfText ---');
  const cleaned = cleanPdfText(rawPdfSample);
  console.log('Cleaned text length:', cleaned.length, 'vs original:', rawPdfSample.length);
  console.log('Cleaned text preview:\n', cleaned.slice(0, 500));

  // Verify that course code and front-matter lines are removed
  const containsLTDC = /L\s*T\s*\/?\s*P\s*\/?\s*D\s+C/.test(cleaned);
  const containsBTechYear = /II Year B\.Tech/.test(cleaned);
  const containsPageNumbers = /Page\s+\d+/.test(cleaned);

  console.log('\n--- Front-matter leak checks in cleaned text ---');
  console.log('Contains "L T/P/D C":', containsLTDC);
  console.log('Contains "II Year B.Tech":', containsBTechYear);
  console.log('Contains "Page X":', containsPageNumbers);

  if (containsLTDC || containsBTechYear || containsPageNumbers) {
    throw new Error('Front-matter leaked into cleaned text!');
  }

  console.log('\n--- 2. Testing extractInsights Generation (Passing raw uncleaned sample) ---');
  const insights = await extractInsights(rawPdfSample, 3);
  console.log('Generated Summary:\n', insights.summary);
  console.log('\nGenerated Flashcards:');
  console.dir(insights.flashcards, { depth: null });
  console.log('\nGenerated Quiz:');
  console.dir(insights.quiz, { depth: null });

  for (const card of insights.flashcards) {
    if (/II Year|B\.Tech|L T\/P\/D|Introduction and what is it used for/i.test(card.front) || /II Sem L T\/P\/D/i.test(card.back)) {
      throw new Error(`Invalid flashcard generated: ${card.front} -> ${card.back}`);
    }
  }

  for (const q of insights.quiz) {
    if (/which term matches/i.test(q.question) || /matches this description/i.test(q.question) || /what does .* stand for/i.test(q.question)) {
      throw new Error(`Banned question template detected: ${q.question}`);
    }
    const ans = q.options[q.correctIndex] || '';
    if (/II Year|B\.Tech|L T\/P\/D|II Sem/i.test(ans)) {
      throw new Error(`Front-matter answer detected in quiz: ${ans}`);
    }
  }

  console.log('\n✅ Flashcard and quiz generation test passed with zero front-matter leakage and zero banned templates!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

