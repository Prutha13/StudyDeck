import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="amber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <!-- Outer border gradient container -->
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#amber-grad)" />
  <!-- Inner dark background square -->
  <rect x="3.5" y="3.5" width="57" height="57" rx="14.5" fill="#080b11" />
  <!-- BookOpen Lucide Icon -->
  <g transform="translate(14, 14) scale(1.5)" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M12 5v16" />
    <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
  </g>
  <!-- Sparkle Accent in top-right -->
  <g transform="translate(45, 5)">
    <circle cx="8" cy="8" r="7.5" fill="#080b11" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
    <path d="M8 3.5L9.2 6.8L12.5 8L9.2 9.2L8 12.5L6.8 9.2L3.5 8L6.8 6.8Z" fill="#fbbf24" />
  </g>
</svg>`;

async function main() {
  const svgPath = path.join(publicDir, 'favicon.svg');
  const png32Path = path.join(publicDir, 'favicon-32x32.png');
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');

  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log('Created:', svgPath);

  const svgBuffer = Buffer.from(svg);

  await sharp(svgBuffer).resize(32, 32).png().toFile(png32Path);
  console.log('Created:', png32Path);

  await sharp(svgBuffer).resize(180, 180).png().toFile(appleTouchPath);
  console.log('Created:', appleTouchPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
