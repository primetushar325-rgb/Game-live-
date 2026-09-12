/* BATTLELOOP LIVE logo — original SVG (full, icon-only, mono). */

export function logoFull(size = 220) {
  return `
  <svg viewBox="0 0 320 200" width="${size}" height="${size * 0.625}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blr" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#38b6ff"/>
        <stop offset="1" stop-color="#8b5cf6"/>
      </linearGradient>
      <radialGradient id="blb" cx="0.38" cy="0.32" r="0.9">
        <stop offset="0" stop-color="#cfe9ff"/>
        <stop offset="0.45" stop-color="#38b6ff"/>
        <stop offset="1" stop-color="#4330a8"/>
      </radialGradient>
    </defs>
    <g transform="translate(100 78)">
      <circle r="52" stroke="url(#blr)" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="270 54" transform="rotate(118)"/>
      <circle r="52" stroke="rgba(56,182,255,0.25)" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="270 54" transform="rotate(118)"/>
      <circle r="26" fill="url(#blb)"/>
      <circle r="26" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    </g>
    <text x="172" y="82" font-family="system-ui,'Segoe UI',Roboto,sans-serif" font-size="34" font-weight="900" letter-spacing="3" fill="#f2f6ff">BATTLELOOP</text>
    <text x="173" y="118" font-family="system-ui,'Segoe UI',Roboto,sans-serif" font-size="22" font-weight="800" letter-spacing="10" fill="url(#blr)">LIVE</text>
    <circle cx="176" cy="137" r="3" fill="#ff3d5a">
      <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <text x="184" y="142" font-family="system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#ff3d5a">LIVE</text>
  </svg>`;
}

export function logoIcon(size = 96) {
  return `
  <svg viewBox="0 0 120 120" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blr2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#38b6ff"/>
        <stop offset="1" stop-color="#8b5cf6"/>
      </linearGradient>
      <radialGradient id="blb2" cx="0.38" cy="0.32" r="0.9">
        <stop offset="0" stop-color="#cfe9ff"/>
        <stop offset="0.45" stop-color="#38b6ff"/>
        <stop offset="1" stop-color="#4330a8"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="44" stroke="url(#blr2)" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="228 45" transform="rotate(118 60 60)"/>
    <circle cx="60" cy="60" r="20" fill="url(#blb2)"/>
    <circle cx="60" cy="60" r="20" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>
  </svg>`;
}

export function logoMono(size = 96) {
  return `
  <svg viewBox="0 0 320 200" width="${size}" height="${size * 0.625}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(100 78)">
      <circle r="52" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="270 54" transform="rotate(118)"/>
      <circle r="26" fill="#fff"/>
    </g>
    <text x="172" y="82" font-family="system-ui,sans-serif" font-size="34" font-weight="900" letter-spacing="3" fill="#fff">BATTLELOOP</text>
    <text x="173" y="118" font-family="system-ui,sans-serif" font-size="22" font-weight="800" letter-spacing="10" fill="#fff">LIVE</text>
  </svg>`;
}

export const LOGO_ICON_FILE =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="26" fill="#04050d"/><circle cx="60" cy="60" r="44" stroke="url(#g)" stroke-width="8" stroke-linecap="round" stroke-dasharray="228 45" transform="rotate(118 60 60)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38b6ff"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><circle cx="60" cy="60" r="20" fill="#7fb8ff"/></svg>`
  );
