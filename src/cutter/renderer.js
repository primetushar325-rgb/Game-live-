/* Canvas pseudo-3D renderer for CUTTER ROAD 3D.
 * It deliberately uses procedural geometry rather than external 3D models:
 * fast on mobile, offline-safe and visually depth-correct through perspective
 * projection, road recycling, layered shadows, lighting and camera smoothing. */

import { createCutterParticles } from './particles.js';
import { CUTTER_TUNING } from './config.js';
import { MATERIAL_STYLE } from './data.js';

const W = 1080;
const H = 1920;
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createCutterRenderer(canvas) {
  const g = canvas.getContext('2d', { alpha: false });
  canvas.width = W; canvas.height = H;
  const particles = createCutterParticles(CUTTER_TUNING.maxParticles);
  let time = 0;
  let shakeX = 0;
  let shakeY = 0;

  function project(z, lane = 0) {
    const t = clamp(1 - z / CUTTER_TUNING.spawnZ, 0, 1.12);
    const curve = Math.pow(t, 1.75);
    const y = 405 + curve * 1305;
    const halfRoad = 150 + curve * 430;
    return { t, x: 540 + lane * halfRoad * .56, y, scale: .18 + curve * 1.08, halfRoad };
  }
  function effect(type, data, game) {
    if (type === 'cut') {
      const p = project(data.object.z, data.object.lane);
      const style = MATERIAL_STYLE[data.object.material] || MATERIAL_STYLE.plastic;
      particles.burst(p.x, p.y, style.particles, data.critical ? 24 : 12, data.object.material === 'metal' ? 'spark' : 'fragment');
      if (data.critical || data.perfect) particles.burst(p.x, p.y, '#ffffff', 7, 'spark');
      return;
    }
    if (type === 'damage') {
      particles.burst(540 + game.lane * 220, 1510, '#ff4267', 28, 'spark');
      return;
    }
    if (type === 'gate') particles.burst(540 + game.lane * 220, 1460, data.choice.color, 18, 'spark');
    if (type === 'super') particles.burst(540, 1530, '#4dfff1', 36, 'spark');
  }

  function drawBackground(game) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#07152b'); sky.addColorStop(.3, '#17345a'); sky.addColorStop(.51, '#141f39'); sky.addColorStop(1, '#060913');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(540, 300, 15, 540, 300, 420);
    glow.addColorStop(0, 'rgba(117,208,255,.42)'); glow.addColorStop(1, 'rgba(117,208,255,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, 800);
    // Recycled distant skyline / mountains
    g.fillStyle = '#101b31'; g.beginPath(); g.moveTo(0, 495);
    for (let x = 0; x <= W; x += 68) g.lineTo(x, 450 + ((x * 17) % 83));
    g.lineTo(W, 610); g.lineTo(0, 610); g.closePath(); g.fill();
    for (let i = 0; i < 20; i++) {
      const x = (i * 97 + 19) % W;
      const height = 48 + ((i * 31) % 120);
      g.fillStyle = i % 3 ? '#111c32' : '#162846';
      g.fillRect(x, 505 - height, 43 + (i % 4) * 12, height);
      g.fillStyle = 'rgba(73,192,255,.25)';
      for (let y = 520 - height; y < 500; y += 18) g.fillRect(x + 8, y, 5, 5);
    }
  }

  function drawRoad(game) {
    const horizon = 407;
    const bottom = 1915;
    const road = g.createLinearGradient(0, horizon, 0, bottom);
    road.addColorStop(0, '#303a4d'); road.addColorStop(1, '#121827');
    g.fillStyle = '#09101b'; g.fillRect(0, horizon, W, H - horizon);
    g.fillStyle = road;
    g.beginPath(); g.moveTo(390, horizon); g.lineTo(690, horizon); g.lineTo(1085, bottom); g.lineTo(-5, bottom); g.closePath(); g.fill();
    // Road edge glows
    g.lineCap = 'round';
    for (const side of [-1, 1]) {
      const xTop = 540 + side * 150; const xBottom = 540 + side * 540;
      g.strokeStyle = 'rgba(56,182,255,.34)'; g.lineWidth = 18; g.beginPath(); g.moveTo(xTop, horizon); g.lineTo(xBottom, bottom); g.stroke();
      g.strokeStyle = '#8edfff'; g.lineWidth = 3; g.beginPath(); g.moveTo(xTop, horizon); g.lineTo(xBottom, bottom); g.stroke();
    }
    // Perspective lane marks and road-section seams, continuously recycled by distance.
    const phase = (game.distance * 9) % 1;
    for (let i = -1; i < 16; i++) {
      const t0 = clamp((i + phase) / 15, 0, 1);
      const t1 = clamp((i + .38 + phase) / 15, 0, 1);
      if (t1 <= 0 || t0 >= 1) continue;
      const y0 = horizon + Math.pow(t0, 1.75) * 1510;
      const y1 = horizon + Math.pow(t1, 1.75) * 1510;
      const w0 = 150 + Math.pow(t0, 1.75) * 430;
      const w1 = 150 + Math.pow(t1, 1.75) * 430;
      g.fillStyle = 'rgba(230,244,255,.72)';
      for (const lane of [-.33, .33]) {
        g.beginPath();
        g.moveTo(540 + lane * w0 - 2, y0); g.lineTo(540 + lane * w0 + 2, y0);
        g.lineTo(540 + lane * w1 + 14, y1); g.lineTo(540 + lane * w1 - 14, y1); g.closePath(); g.fill();
      }
    }
    // Side lighting / small environmental detail.
    for (let i = 0; i < 10; i++) {
      const t = ((i / 10 + phase * .55) % 1);
      const y = horizon + Math.pow(t, 1.68) * 1470;
      const spread = 178 + Math.pow(t, 1.68) * 470;
      const h = 14 + t * 95;
      for (const side of [-1, 1]) {
        const x = 540 + side * spread;
        g.strokeStyle = 'rgba(125,190,233,.48)'; g.lineWidth = 2 + t * 3;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke();
        const lamp = g.createRadialGradient(x, y - h, 0, x, y - h, 15 + t * 22);
        lamp.addColorStop(0, 'rgba(180,245,255,.95)'); lamp.addColorStop(1, 'rgba(70,192,255,0)');
        g.fillStyle = lamp; g.beginPath(); g.arc(x, y - h, 15 + t * 22, 0, TAU); g.fill();
      }
    }
  }

  function shadow(x, y, scale) {
    g.save(); g.globalAlpha = .28; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y + 25 * scale, 46 * scale, 13 * scale, 0, 0, TAU); g.fill(); g.restore();
  }
  function outline(color, width = 3) { g.strokeStyle = color; g.lineWidth = width; g.stroke(); }
  function fillShape(object, x, y, s) {
    const c = object.color || '#8cb4e8';
    const dark = 'rgba(5,10,22,.4)';
    g.save(); g.translate(x, y); g.rotate(object.spin || 0);
    const grad = g.createRadialGradient(-12 * s, -14 * s, 3, 0, 0, 56 * s);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(.12, c); grad.addColorStop(1, dark);
    g.fillStyle = grad;
    const r = 39 * s;
    switch (object.shape) {
      case 'apple':
      case 'melon': g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); outline('rgba(255,255,255,.5)', 2*s); g.fillStyle = '#3bc76d'; g.fillRect(-4*s, -r*1.2, 8*s, 16*s); break;
      case 'football': case 'tennis': case 'ball': case 'baseball': case 'basketball':
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); outline('rgba(12,20,32,.65)', 2*s);
        g.strokeStyle = object.shape === 'football' ? '#111827' : 'rgba(45,29,20,.55)'; g.lineWidth = 2.5*s; g.beginPath(); g.arc(0,0,r*.62,0,TAU); g.stroke();
        if (object.shape === 'football') { g.fillStyle = '#131827'; g.beginPath(); g.arc(0,0,r*.29,0,TAU); g.fill(); } break;
      case 'burger':
        g.fillStyle = '#f1ae4c'; g.beginPath(); g.ellipse(0,-18*s,r,24*s,0,Math.PI,TAU); g.fill(); g.fillStyle='#6c3a25';g.fillRect(-r,0,r*2,14*s);g.fillStyle='#65bd5b';g.fillRect(-r,14*s,r*2,8*s);g.fillStyle='#f2ab40';g.beginPath();g.ellipse(0,23*s,r,12*s,0,0,TAU);g.fill();break;
      case 'pizza': g.beginPath(); g.moveTo(-r,-r*.65);g.lineTo(r,r*.7);g.lineTo(-r,r*.7);g.closePath();g.fill();g.fillStyle='#d84639';g.beginPath();g.arc(-r*.2,r*.2,6*s,0,TAU);g.fill();break;
      case 'cake': g.fillRect(-r,-r*.55,r*2,r*1.25);g.fillStyle='#fff0f5';g.fillRect(-r,-r*.25,r*2,12*s);break;
      case 'bat': case 'plank': case 'pipe':
        g.fillRect(-12*s,-r*1.25,24*s,r*2.5);g.fillStyle='rgba(255,255,255,.3)';g.fillRect(-6*s,-r*1.16,5*s,r*2.2);break;
      case 'car': g.fillRect(-r,-r*.35,r*2,r*.82);g.beginPath();g.moveTo(-r*.45,-r*.35);g.lineTo(-r*.1,-r*.85);g.lineTo(r*.55,-r*.85);g.lineTo(r*.82,-r*.35);g.fill();g.fillStyle='#101827';g.beginPath();g.arc(-r*.55,r*.47,r*.26,0,TAU);g.arc(r*.55,r*.47,r*.26,0,TAU);g.fill();break;
      case 'robot': g.fillRect(-r*.72,-r*.8,r*1.44,r*1.6);g.fillStyle='#0c1528';g.fillRect(-r*.46,-r*.45,r*.92,r*.33);g.fillStyle='#66f7ff';g.fillRect(-r*.29,-r*.35,r*.18,r*.12);g.fillRect(r*.1,-r*.35,r*.18,r*.12);break;
      case 'gear':
        for(let i=0;i<10;i++){g.save();g.rotate(i*TAU/10);g.fillRect(-r*.18,-r*1.05,r*.36,r*.44);g.restore();}g.beginPath();g.arc(0,0,r*.72,0,TAU);g.fill();g.fillStyle='#0c1528';g.beginPath();g.arc(0,0,r*.25,0,TAU);g.fill();break;
      case 'crystal': case 'diamond': g.beginPath();g.moveTo(0,-r);g.lineTo(r*.68,0);g.lineTo(0,r);g.lineTo(-r*.68,0);g.closePath();g.fill();outline('rgba(255,255,255,.66)',2*s);break;
      case 'chest': g.fillRect(-r,-r*.2,r*2,r*.95);g.fillStyle='#704125';g.beginPath();g.ellipse(0,-r*.2,r,r*.52,0,Math.PI,TAU);g.fill();g.fillStyle='#ffcf4d';g.fillRect(-5*s,-r*.25,10*s,r*1.1);break;
      case 'plate': case 'block': case 'blocks': case 'puzzle': case 'crate': default:
        g.fillRect(-r,-r,r*2,r*2); g.fillStyle='rgba(255,255,255,.2)';g.fillRect(-r*.74,-r*.75,r*1.48,9*s);break;
    }
    g.restore();
  }
  function drawGate(object) {
    const p = project(object.z);
    const h = 130 * p.scale; const width = p.halfRoad * .92;
    for (const choice of object.choices) {
      const x = 540 + choice.lane * p.halfRoad * .48;
      const w = width * .42;
      g.fillStyle = choice.color + '35'; g.fillRect(x - w/2, p.y - h, w, h);
      g.strokeStyle = choice.color; g.lineWidth = Math.max(2, 5*p.scale); g.strokeRect(x-w/2,p.y-h,w,h);
      g.fillStyle = '#ffffff';g.font=`800 ${Math.max(9,18*p.scale)}px system-ui`;g.textAlign='center';g.fillText(choice.label,x,p.y-h*.48);
    }
  }
  function drawObstacle(object) {
    const p = project(object.z, object.lane);
    const w=75*p.scale*object.size,h=55*p.scale*object.size;
    shadow(p.x,p.y,p.scale);
    g.fillStyle='#ff385e';g.fillRect(p.x-w,p.y-h,p.scale*150*object.size,h*.8);
    g.fillStyle='#fff1e9'; for(let i=-2;i<=2;i++) g.fillRect(p.x+i*w*.7,p.y-h,p.scale*16,h*.8);
    g.strokeStyle='rgba(255,220,225,.7)';g.lineWidth=2*p.scale;g.strokeRect(p.x-w,p.y-h,p.scale*150*object.size,h*.8);
  }
  function drawObjects(game) {
    const list = [...game.objects].sort((a,b) => b.z-a.z);
    for (const object of list) {
      if (object.kind === 'gate') { drawGate(object); continue; }
      if (object.kind === 'obstacle') { drawObstacle(object); continue; }
      const p = project(object.z, object.lane);
      if (p.y < 380 || p.y > 1830) continue;
      shadow(p.x, p.y, p.scale * object.size);
      fillShape(object,p.x,p.y,p.scale*object.size);
      if (object.rare) { g.strokeStyle='#fff7a0';g.lineWidth=3*p.scale;g.beginPath();g.arc(p.x,p.y,53*p.scale*object.size,0,TAU);g.stroke(); }
    }
  }
  function drawCutter(game) {
    const x = 540 + game.lane * 235;
    const y = 1570;
    const size = 112 * game.size;
    // Ground shadow and energized glow
    shadow(x,y+22,1.6*game.size);
    if (game.superT > 0) {
      const glow=g.createRadialGradient(x,y,8,x,y,size*1.9);glow.addColorStop(0,'rgba(49,255,236,.42)');glow.addColorStop(1,'rgba(49,255,236,0)');g.fillStyle=glow;g.beginPath();g.arc(x,y,size*1.9,0,TAU);g.fill();
    }
    g.save();g.translate(x,y);g.rotate(game.cutterAngle);
    for(let i=0;i<18;i++) {g.save();g.rotate(i*TAU/18);g.fillStyle=game.superT>0?'#4dfff1':'#c4d8ed';g.beginPath();g.moveTo(size*.6,-size*.16);g.lineTo(size*1.13,0);g.lineTo(size*.6,size*.16);g.closePath();g.fill();g.restore();}
    const metal=g.createRadialGradient(-size*.26,-size*.3,3,0,0,size*.92);metal.addColorStop(0,'#ffffff');metal.addColorStop(.32,game.superT>0?'#6afff2':'#93b0ca');metal.addColorStop(1,'#26334a');g.fillStyle=metal;g.beginPath();g.arc(0,0,size*.84,0,TAU);g.fill();g.strokeStyle=game.superT>0?'#6cfff4':'#e4f5ff';g.lineWidth=7;g.stroke();
    g.fillStyle='#121c2d';g.beginPath();g.arc(0,0,size*.25,0,TAU);g.fill();g.fillStyle=game.superT>0?'#eaffff':'#5dc9ff';g.beginPath();g.arc(0,0,size*.11,0,TAU);g.fill();g.restore();
    // Cutter chassis and power readout.
    g.fillStyle='rgba(11,19,38,.9)';g.fillRect(x-size*.58,y+size*.72,size*1.16,28);g.fillStyle=game.superT>0?'#52fff0':'#54bfff';g.fillRect(x-size*.5,y+size*.8,size*Math.min(1,game.power/6),6);
  }
  function drawVignette() { const vg=g.createRadialGradient(540,920,500,540,960,1250);vg.addColorStop(.55,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.58)');g.fillStyle=vg;g.fillRect(0,0,W,H); }

  return {
    effect,
    frame(game, dt) {
      time += dt;
      shakeX = (Math.random()-.5) * game.cameraShake * 18;
      shakeY = (Math.random()-.5) * game.cameraShake * 12;
      g.save();g.translate(shakeX,shakeY);
      drawBackground(game); drawRoad(game); drawObjects(game); drawCutter(game); particles.update(dt); particles.draw(g); drawVignette();
      g.restore();
    },
    destroy() { particles.clear(); },
  };
}
