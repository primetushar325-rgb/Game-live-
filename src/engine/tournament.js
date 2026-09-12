/* Qualification tournament: build round chain from a preset + start count.
   FULL  = 195 -> 70 -> 30 -> 10 -> 1 (spec template, scaled proportionally)
   SCALE = proportional [36%, 15%, 5%] then 1
   SINGLE= one round straight to a winner
 */

export function buildRounds(preset, startCount, poolSize) {
  const start = Math.max(2, Math.min(Math.round(startCount) || 2, poolSize));
  let qs;
  if (preset === 'SINGLE') {
    qs = [1];
  } else if (preset === 'SCALE') {
    qs = [0.36, 0.15, 0.051].map((f) => Math.max(2, Math.round(start * f)));
    qs.push(1);
  } else { // FULL (default)
    const k = start / 195;
    qs = [70, 30, 10, 1].map((q) => Math.max(1, Math.round(q * k)));
  }

  // sanitize: strictly decreasing, each in [1, prev-1]
  const clean = [];
  let prev = start;
  for (const q of qs) {
    const v = Math.max(1, Math.min(q, prev - 1));
    clean.push(v);
    prev = v;
  }

  const rounds = [];
  let s = start;
  for (const q of clean) {
    rounds.push({ start: s, qualify: q });
    s = q;
  }
  // drop degenerate rounds (need >=2 contestants and a real elimination)
  const valid = rounds.filter((r) => r.start >= 2 && r.qualify >= 1 && r.qualify < r.start);
  if (valid.length === 0) return null;
  return valid;
}

export function roundLabel(i, total) {
  if (total <= 1) return 'FINAL MATCH';
  if (i === total - 1) return `FINAL`;
  return `ROUND ${i + 1}`;
}

export function phaseLabel(i, total) {
  if (total <= 1) return 'TO THE WINNER';
  if (i === total - 1) return 'THE FINAL';
  return `ROUND ${i + 1} • QUALIFYING`;
}
