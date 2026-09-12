/* Brand the Capacitor Android shell with BATTLELOOP LIVE assets:
   - dark theme + colors.xml (template referenced @color/* without defining it)
   - launcher icons (legacy + adaptive) from public/icons/icon-512.png
   - branded portrait/landscape splash screens (dark, logo, title, tagline) */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');
const icon = path.join(root, 'public', 'icons', 'icon-512.png');

const BG = '#05060f';
const NEON = '#00e5ff';

const writeXml = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log('  wrote', path.relative(root, file));
};

/* ---------- 1. theme + colors ---------- */
writeXml(path.join(res, 'values', 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#10142a</color>
    <color name="colorPrimaryDark">${BG}</color>
    <color name="colorAccent">${NEON}</color>
</resources>
`);

writeXml(path.join(res, 'values', 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>

    <!-- Dark esports theme (no action bar). -->
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
        <item name="android:statusBarColor">@color/colorPrimaryDark</item>
        <item name="android:navigationBarColor">@color/colorPrimaryDark</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowBackground">@color/colorPrimaryDark</item>
        <item name="postSplashScreenTheme">@style/AppTheme</item>
    </style>
</resources>
`);

writeXml(path.join(res, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG}</color>
</resources>
`);

/* ---------- 2. launcher icons ---------- */
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [dens, scale] of Object.entries(DENS)) {
  // legacy square launcher (full-bleed tile)
  const legacy = Math.round(48 * scale);
  await sharp(icon).resize(legacy, legacy).png().toFile(path.join(res, `mipmap-${dens}`, 'ic_launcher.png'));
  const round = path.join(res, `mipmap-${dens}`, 'ic_launcher_round.png');
  if (fs.existsSync(round)) await sharp(icon).resize(legacy, legacy).png().toFile(round);

  // adaptive foreground: logo scaled to the safe zone (66dp of 108dp) on transparent
  const canvas = Math.round(108 * scale);
  const logo = Math.round(canvas * 0.62);
  const fg = await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(icon).resize(logo, logo).png().toBuffer(), top: Math.round((canvas - logo) / 2), left: Math.round((canvas - logo) / 2) }])
    .png();
  await fg.toFile(path.join(res, `mipmap-${dens}`, 'ic_launcher_foreground.png'));
}
console.log('  launcher + adaptive icons written (5 densities)');

/* ---------- 3. splash screens ---------- */
const glow = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <radialGradient id="g" cx="50%" cy="42%" r="60%">
    <stop offset="0%" stop-color="#1b2450" stop-opacity="0.9"/>
    <stop offset="55%" stop-color="#0a0f26" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w / 2}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.30}" fill="none" stroke="${NEON}" stroke-opacity="0.14" stroke-width="${Math.min(w, h) * 0.02}"/>
</svg>`;

const makeSplash = async (w, h, out, landscape = false) => {
  const logo = Math.round(Math.min(w, h) * (landscape ? 0.34 : 0.38));
  const cx = w / 2;
  const cy = landscape ? h * 0.5 : h * 0.40;
  const svgTitle = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="${cx}" y="${cy + logo / 2 + Math.min(w, h) * 0.16}" font-family="sans-serif" font-weight="bold"
      font-size="${Math.min(w, h) * 0.075}" fill="#ffffff" text-anchor="middle" letter-spacing="${Math.min(w, h) * 0.012}">BATTLELOOP LIVE</text>
    <text x="${cx}" y="${cy + logo / 2 + Math.min(w, h) * 0.235}" font-family="sans-serif"
      font-size="${Math.min(w, h) * 0.038}" fill="${NEON}" text-anchor="middle" letter-spacing="${Math.min(w, h) * 0.018}">WHO WILL SURVIVE?</text>
  </svg>`;
  await sharp(Buffer.from(glow(w, h)))
    .composite([
      { input: await sharp(icon).resize(logo, logo).png().toBuffer(), top: Math.round(cy - logo / 2), left: Math.round(cx - logo / 2) },
      { input: Buffer.from(svgTitle) },
    ])
    .png()
    .toFile(out);
  console.log('  splash', path.relative(root, out), `${w}x${h}`);
};

const PORT = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
for (const [dens, [w, h]] of Object.entries(PORT)) {
  await makeSplash(w, h, path.join(res, `drawable-port-${dens}`, 'splash.png'));
}
for (const [dens, [w, h]] of Object.entries(PORT)) {
  await makeSplash(h, w, path.join(res, `drawable-land-${dens}`, 'splash.png'), true);
}

console.log('\nAndroid shell branded ✅');
