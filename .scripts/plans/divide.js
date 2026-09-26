/* The Readings: divide a work into days.

   Dynamic programming over the allowed cuts:
     f(0) = 0
     f(j) = min over allowed i < j of f(i) + (W(i,j) - TARGET)^2 + pen(j)
   where W(i,j) is the words of atoms i..j-1. A day may not pass `max`
   words unless it is a single atom; a short work's day stays inside one
   group. All arithmetic is on integers, and ties are settled one way only:
   i is scanned from j-1 down and replaced only on a strict improvement, so
   the same text always gives the same days.

   A long work's days must also average within 3% of the target. When the
   free division misses that (the Zhuangzi: its short chapters cannot be
   split, and the free optimum is 45 days averaging 2,226 words), the same
   recurrence is run again with the number of days fixed, over every count
   whose average lands inside the band, and the cheapest is kept (on a tie,
   the count nearest the free one, then the smaller).

   Returns days as [first atom, last atom, words] triples. */
'use strict';
const C = require('./config');

function prefix(atoms) {
  const pre = new Array(atoms.length + 1);
  pre[0] = 0;
  for (let k = 0; k < atoms.length; k++) pre[k + 1] = pre[k] + atoms[k].w;
  return pre;
}

function divide(built, target) {
  const T = target || C.TARGET;
  const days = divideFree(built, T);
  if (built.kind !== 'long') return days;
  const total = days.reduce((s, d) => s + d[2], 0);
  const inBand = k => Math.abs(total / k - T) <= C.MEAN_TOLERANCE * T;
  if (inBand(days.length)) return days;
  let best = null;
  const lo = Math.ceil(total / (T * (1 + C.MEAN_TOLERANCE))), hi = Math.floor(total / (T * (1 - C.MEAN_TOLERANCE)));
  for (let k = lo; k <= hi; k++) {
    if (!inBand(k)) continue;
    const r = divideFixed(built, T, k);
    if (!r) continue;
    const better = !best || r.cost < best.cost ||
      (r.cost === best.cost && (Math.abs(k - days.length) < Math.abs(best.k - days.length) ||
        (Math.abs(k - days.length) === Math.abs(best.k - days.length) && k < best.k)));
    if (better) best = { cost: r.cost, k: k, days: r.days };
  }
  if (!best) throw new Error(built.id + ': no division averages within the band');
  return best.days;
}

/* The same recurrence with the number of days fixed at K:
   f_k(j) = min over allowed i of f_{k-1}(i) + (W(i,j) - T)^2 + pen(j). */
function divideFixed(built, T, K) {
  const atoms = built.atoms, n = atoms.length, cut = built.cut, pen = built.pen, max = built.max;
  const pre = prefix(atoms);
  let f = new Array(n + 1).fill(Infinity);
  f[0] = 0;
  const back = [];
  for (let k = 1; k <= K; k++) {
    const g = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(-1);
    for (let j = 1; j <= n; j++) {
      if (!cut[j]) continue;
      for (let i = j - 1; i >= 0; i--) {
        const W = pre[j] - pre[i];
        if (W > max && j - i > 1) break;
        if (built.oneGroup && atoms[i].g !== atoms[j - 1].g) break;
        if (!cut[i] || f[i] === Infinity) continue;
        const d = W - T;
        const cost = f[i] + d * d + pen[j];
        if (cost < g[j]) { g[j] = cost; from[j] = i; }
      }
    }
    back.push(from);
    f = g;
  }
  if (f[n] === Infinity) return null;
  if (!Number.isSafeInteger(f[n])) throw new Error(built.id + ': cost left the safe integers');
  const days = [];
  for (let k = K - 1, j = n; k >= 0; k--) {
    const i = back[k][j];
    days.push([i, j - 1, pre[j] - pre[i]]);
    j = i;
  }
  days.reverse();
  return { cost: f[n], days: days };
}

function divideFree(built, T) {
  const atoms = built.atoms, n = atoms.length, cut = built.cut, pen = built.pen, max = built.max;
  const pre = prefix(atoms);

  const f = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(-1);
  f[0] = 0;
  for (let j = 1; j <= n; j++) {
    if (!cut[j]) continue;
    for (let i = j - 1; i >= 0; i--) {
      const W = pre[j] - pre[i];
      if (W > max && j - i > 1) break;                          /* only grows as i falls */
      if (built.oneGroup && atoms[i].g !== atoms[j - 1].g) break;
      if (!cut[i] || f[i] === Infinity) continue;
      const d = W - T;
      const cost = f[i] + d * d + pen[j];
      if (cost < f[j]) { f[j] = cost; from[j] = i; }
    }
    if (f[j] === Infinity) throw new Error(built.id + ': no allowed division reaches atom ' + j);
  }
  if (!Number.isSafeInteger(f[n])) throw new Error(built.id + ': cost left the safe integers');

  const days = [];
  for (let j = n; j > 0; j = from[j]) days.push([from[j], j - 1, pre[j] - pre[from[j]]]);
  days.reverse();
  return days;
}

module.exports = { divide, divideFree, divideFixed };
