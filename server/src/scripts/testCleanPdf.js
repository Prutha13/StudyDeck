const sampleText = `
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

UNIT I:
Introduction: Algorithm, Psuedo code for expressing algorithms, Performance Analysis.

INTRODUCTION TO ALGORITHM
History of Algorithm
• The word algorithm comes from the name of a Persian author, Abu Ja’far Mohammed ibn Musa al Khowarizmi.
`;

export function cleanPdfText(text) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);

  // 1. Detect repeated running headers/footers across pages (lines occurring >= 3 times, or >= 2 in shorter samples)
  const lineCounts = new Map();
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length >= 4 && trimmed.length <= 100) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }

  const threshold = lines.length > 50 ? 3 : 2;

  const cleanedLines = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }

    // Repeated running headers/footers
    if ((lineCounts.get(trimmed) || 0) >= threshold) {
      continue;
    }

    // Page number patterns: e.g. "Page 1", "Page 1 of 50", "12 | Page", or isolated numbers
    if (/\bPage\s+\d+\b/i.test(trimmed) || /^\d+\s*\|\s*Page/i.test(trimmed) || /^\d+$/.test(trimmed) || /^-\s*\d+\s*-$/.test(trimmed)) {
      continue;
    }

    // Course credit table headers (e.g. "L T /P/D C", "L T P C", "Lecture Tutorial Practical Credits")
    if (/\bL\s*T\s*\/?\s*P\s*\/?\s*D\s+C\b/i.test(trimmed) || /\bL\s+T\s+P\s+C\b/i.test(trimmed)) {
      continue;
    }

    // Standalone credit distribution lines (e.g. "4 - / - / - 3", "3 - - 3")
    if (/^[\d\s\-/–—,]{4,}$/.test(trimmed)) {
      continue;
    }

    // Standalone course/syllabus codes (e.g. "(R15A0508)DESIGN AND ANALYSIS OF ALGORITHMS", "CS601-A")
    if (/^\(?[A-Z0-9]{4,10}\)?[\s\w]*$/i.test(trimmed) && trimmed.length < 50 && /\d/.test(trimmed)) {
      continue;
    }

    // Standalone academic year / semester lines (e.g. "B.TECH II YEAR - II SEM", "II Year B.Tech IT – II Sem", "(2017-18)")
    if (/\b(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|B\.?E|M\.?E|BCA|MCA|MBA)\b/i.test(trimmed)) {
      continue;
    }
    if (/^(II|III|IV|I|1st|2nd|3rd|4th)\s+(Year|Sem|Semester)\b/i.test(trimmed)) {
      continue;
    }
    if (/^\(\d{4}[-–]\d{2,4}\)$/.test(trimmed)) {
      continue;
    }

    // College / Department / Administrative headers & addresses
    if (/\b(Department of|College of|School of|Faculty of|University of)\b/i.test(trimmed) && trimmed.length < 90) {
      continue;
    }
    if (/\b(Autonomous Institution|Affiliated to|Approved by|Accredited by|ISO \d+|NAAC|AICTE|UGC)\b/i.test(trimmed)) {
      continue;
    }
    if (/\b(Post Via|Hakimpet|Secunderabad|Telangana|Hyderabad|Pin Code|\b\d{6}\b)\b/i.test(trimmed) && trimmed.length < 120) {
      continue;
    }
    if (/^(SYLLABUS|INDEX|TEXT BOOKS?:|REFERENCES?:|COURSE STRUCTURE|DIGITAL NOTES|LECTURE NOTES)\s*$/i.test(trimmed)) {
      continue;
    }
    if (/^S\.?\s*No\.?\s+Unit\s+Topic\s+Page/i.test(trimmed)) {
      continue;
    }

    cleanedLines.push(raw);
  }

  // Collapse excess blank lines
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

console.log('--- CLEANED RESULT ---');
const cleaned = cleanPdfText(sampleText);
console.log(cleaned);
