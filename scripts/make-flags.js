/* Rasterize the bundled MIT-licensed flag set (lipis/flag-icons, see
   public/flags/LICENSE) into PNGs the game ships with.
   Input : /tmp/flag-icons/flags/4x3/*.svg  (re-clone if missing:
           git clone --depth 1 --filter=blob:none --sparse https://github.com/lipis/flag-icons && git -C flag-icons sparse-checkout set flags)
   Output: public/flags/{iso}.png  (320x192, circular-crop friendly)
   Run   : node scripts/make-flags.js */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SRC = process.env.FLAG_SRC || '/tmp/flag-icons/flags/4x3';
const OUT = path.join(root, 'public', 'flags');

if (!fs.existsSync(SRC)) {
  console.error('Flag source not found at', SRC);
  console.error('Clone it first:');
  console.error('  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/lipis/flag-icons.git /tmp/flag-icons');
  console.error('  git -C /tmp/flag-icons sparse-checkout set flags');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, 'LICENSE'),
  'Country flag graphics from lipis/flag-icons (https://github.com/lipis/flag-icons).\n' +
  'MIT License, Copyright (c) 2013 Panayiotis Lipiridis.\n' +
  'Rasterized for BattleLoop Live. Flag designs themselves are public domain.\n'
);

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort();
let ok = 0;
for (const f of files) {
  const iso = f.replace(/\.svg$/, '');
  try {
    await sharp(path.join(SRC, f), { density: 96 })
      .resize(320, 192)
      .png()
      .toFile(path.join(OUT, `${iso}.png`));
    ok++;
  } catch (e) {
    console.error('  skip', iso, e.message.slice(0, 80));
  }
}
console.log(`flags rasterized: ${ok}/${files.length} -> public/flags/`);
