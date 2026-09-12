/* Generate PNG app icons from the original SVG logo (sharp/librsvg). */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

/* App icon: square dark tile, glowing gapped ring + battle ball. */
const iconSvg = (maskable) => {
  const pad = maskable ? 0.78 : 1; // maskable: keep art inside safe zone
  const t = `translate(60 60) scale(${pad}) translate(-60 -60)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#38b6ff"/>
        <stop offset="1" stop-color="#8b5cf6"/>
      </linearGradient>
      <radialGradient id="b" cx="0.38" cy="0.32" r="0.9">
        <stop offset="0" stop-color="#eaf6ff"/>
        <stop offset="0.45" stop-color="#38b6ff"/>
        <stop offset="1" stop-color="#3b2a9e"/>
      </radialGradient>
      <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.55" stop-color="rgba(56,182,255,0)"/>
        <stop offset="0.8" stop-color="rgba(56,182,255,0.25)"/>
        <stop offset="1" stop-color="rgba(56,182,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="120" height="120" rx="${maskable ? 0 : 26}" fill="#04050d"/>
    <g transform="${t}">
      <circle cx="60" cy="60" r="46" fill="url(#halo)"/>
      <circle cx="60" cy="60" r="44" stroke="url(#g)" stroke-width="9" fill="none"
        stroke-linecap="round" stroke-dasharray="228 45" transform="rotate(118 60 60)"/>
      <circle cx="60" cy="60" r="44" stroke="rgba(56,182,255,0.28)" stroke-width="16" fill="none"
        stroke-linecap="round" stroke-dasharray="228 45" transform="rotate(118 60 60)"/>
      <circle cx="60" cy="60" r="20" fill="url(#b)"/>
      <circle cx="60" cy="60" r="20" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" fill="none"/>
      <circle cx="68" cy="16" r="5" fill="#ff3d5a"/>
    </g>
  </svg>`;
};

const jobs = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'icon-96.png', size: 96, maskable: false },
  { file: 'favicon-48.png', size: 48, maskable: false },
];

for (const j of jobs) {
  const png = await sharp(Buffer.from(iconSvg(j.maskable)), { density: 300 })
    .resize(j.size, j.size)
    .png()
    .toBuffer();
  writeFileSync(join(outDir, j.file), png);
  console.log('wrote', j.file, j.size);
}
console.log('icons done');
