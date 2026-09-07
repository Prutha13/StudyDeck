import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { PDFParse } from 'pdf-parse';
import { extractInsights } from '../services/llm.service.js';

async function main() {
  const pdfPath = 'C:/Users/dhruvraj/.gemini/antigravity/brain/553ff3fe-670f-4070-9303-7daa8710f5b5/.user_uploaded/media_1788583630064.pdf';
  console.log('Reading PDF:', pdfPath);
  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data });
  const parsed = await parser.getText();
  if (parser && parser.destroy) await parser.destroy();

  console.log('PDF extracted characters:', parsed.text.length);

  console.log('\nCalling extractInsights() with Gemini...');
  const result = await extractInsights(parsed.text, 5);

  console.log('\n=== GENERATED FLASHCARDS ===');
  console.log(JSON.stringify(result.flashcards, null, 2));

  console.log('\n=== GENERATED QUIZ (Sample items 1-3) ===');
  console.log(JSON.stringify(result.quiz.slice(0, 3), null, 2));

  console.log('\n=== CHECKING FOR TRAVERSALS CARD ===');
  const traversalCards = result.flashcards.filter((c) => /traversal/i.test(c.front) || /traversal/i.test(c.back));
  if (traversalCards.length > 0) {
    console.log('Found Traversal card(s):', JSON.stringify(traversalCards, null, 2));
    for (const tc of traversalCards) {
      if (/Breadth first search and Depth first search, AND/i.test(tc.back) && !/visiting|exploring|process|systematic/i.test(tc.back)) {
        throw new Error('FAILED: Traversal card still contains table of contents fragment!');
      }
    }
  } else {
    console.log('No card specifically named traversals, checking other definition cards...');
  }

  // Ensure all definition cards have actual definitions, not topic lists
  for (const c of result.flashcards) {
    const isTopicList = /[,–—\-:]$/.test(c.back.trim()) || (c.back.split(',').length >= 3 && !/\b(is|are|process|technique|method|algorithm|used)\b/i.test(c.back));
    if (isTopicList) {
      throw new Error(`FAILED: Flashcard back looks like a topic list: ${c.front} -> ${c.back}`);
    }
  }

  console.log('\n✅ ALL FLASHCARDS VALIDATED: Definition cards directly answer questions with actual definitions!');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
