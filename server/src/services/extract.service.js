import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Lightweight cleanup pass for PDF extracted text:
 * Strips running page headers/footers, course codes, syllabus credit tables,
 * standalone semester/year designations, and institution headers.
 */
export function cleanPdfText(text) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);

  // Detect repeated running headers/footers across pages
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

    // 1. Repeated running headers/footers
    if ((lineCounts.get(trimmed) || 0) >= threshold) {
      continue;
    }

    // 2. Page number patterns: e.g. "Page 1", "12 | Page", or standalone page numbers
    if (
      /\bPage\s+\d+\b/i.test(trimmed) ||
      /^\d+\s*\|\s*Page/i.test(trimmed) ||
      /^\d+$/.test(trimmed) ||
      /^-\s*\d+\s*-$/.test(trimmed)
    ) {
      continue;
    }

    // 3. Course credit table headers (e.g. "L T /P/D C", "L T P C", "L T/P/D C", with or without prefixes)
    if (
      /\bL\s*T\s*[\/\s]*P\s*[\/\s]*D\s+C\b/i.test(trimmed) ||
      /\bL\s+T\s+P\s+C\b/i.test(trimmed) ||
      /\b(Lectures?|Tutorials?|Practicals?)\s*[:\-\/]/i.test(trimmed)
    ) {
      continue;
    }

    // 4. Standalone credit distribution lines (e.g. "4 - / - / - 3", "3 - - 3", "4 0 0 4")
    if (/^[\d\s\-/–—,.:|]{3,}$/.test(trimmed) && /\d/.test(trimmed) && trimmed.length < 25) {
      continue;
    }

    // 5. Standalone course/syllabus codes (e.g. "(R15A0508)DESIGN AND ANALYSIS OF ALGORITHMS")
    if (/^\(?[A-Z0-9]{4,12}\)?[\s\w–—\-:.]*$/i.test(trimmed) && trimmed.length < 60 && /\d/.test(trimmed) && /\([A-Z0-9]+\)/i.test(trimmed)) {
      continue;
    }

    // 6. Academic year / semester lines (e.g. "B.TECH II YEAR - II SEM", "II Year B.Tech IT – II Sem", "(2017-18)")
    if (
      /\b(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|B\.?E|M\.?E|BCA|MCA|MBA)\b/i.test(trimmed) ||
      /\b(II|III|IV|I|1st|2nd|3rd|4th)\s+(Year|Sem|Semester)\b/i.test(trimmed) ||
      /^\(\d{4}[-–]\d{2,4}\)$/.test(trimmed) ||
      /\bAcademic\s+Year\b/i.test(trimmed)
    ) {
      continue;
    }

    // 7. College / Department / Administrative headers & addresses
    if (/\b(Department of|College of|School of|Faculty of|University of|Institute of)\b/i.test(trimmed) && trimmed.length < 100) {
      continue;
    }
    if (/\b(Autonomous Institution|Affiliated to|Approved by|Accredited by|ISO \d+|NAAC|AICTE|UGC|NBA)\b/i.test(trimmed)) {
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

  const cleaned = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return cleaned.length >= 20 ? cleaned : text;
}

// Given a multer file buffer + mimetype, return plain text plus a normalized sourceType.
export async function extractText(file) {
  const { buffer, mimetype, originalname } = file;

  if (mimetype === 'application/pdf' || (originalname && originalname.match(/\.pdf$/i))) {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      if (parser && parser.destroy) await parser.destroy();
      if (result && result.text && result.text.trim().length > 0) {
        const cleaned = cleanPdfText(result.text.trim());
        return { text: cleaned, sourceType: 'pdf' };
      }
    } catch (err) {
      console.warn('PDFParse primary extraction failed, attempting fallback text extraction:', err.message);
    }

    const rawString = buffer.toString('utf-8');
    const cleaned = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 20) {
      return { text: cleanPdfText(cleaned), sourceType: 'pdf' };
    }
    throw new Error('Could not extract readable text from PDF file. Please ensure document contains selectable text.');
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    (originalname && originalname.match(/\.docx$/i))
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result?.value || '').trim();
      if (text.length >= 20) {
        return { text, sourceType: 'docx' };
      }
      throw new Error('Document does not contain sufficient readable text (minimum 20 characters required).');
    } catch (docxErr) {
      throw new Error(`Could not extract readable text from DOCX file: ${docxErr.message}`);
    }
  }

  if (mimetype === 'text/plain' || (originalname && originalname.match(/\.txt$/i))) {
    return { text: buffer.toString('utf-8').trim(), sourceType: 'txt' };
  }

  throw new Error(`Unsupported file type: ${mimetype || originalname}`);
}

