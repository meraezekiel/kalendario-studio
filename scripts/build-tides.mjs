// Fits tide harmonic constants for Philippine ports to the University of Hawaii Sea Level Center's
// research-quality hourly tide gauge records (https://uhslc.soest.hawaii.edu, free to use with credit)
// and writes src/lib/calendar/tideStations.json. Run with: npm run tides
//   npm run tides -- --check   also fits on older years and reports how well it predicts later ones.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { args, CONSTITUENTS, tideHeight, tideTurns } from '../src/lib/calendar/tide.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

/** UHSLC id + version letter, and the name shown in the studio. */
const STATIONS = [
  ['370a', 'manila', 'Manila'],
  ['382a', 'subic', 'Subic Bay'],
  ['655a', 'lubang', 'Lubang'],
  ['654a', 'currimao', 'Currimao, Ilocos Norte'],
  ['371a', 'legazpi', 'Legazpi'],
  ['379a', 'cebu', 'Cebu'],
  ['380a', 'puerto-princesa', 'Puerto Princesa'],
  ['372b', 'davao', 'Davao'],
  ['373a', 'jolo', 'Jolo'],
];
/** Years of records to fit: enough to separate K1 from P1 and S2 from T2, and to average out the weather. */
const FIT_YEARS = 4;
const NAMES = Object.keys(CONSTITUENTS);

async function records(id) {
  const res = await fetch(`https://uhslc.soest.hawaii.edu/data/csv/rqds/pacific/hourly/h${id}.csv`);
  if (!res.ok) throw new Error(`UHSLC ${id}: HTTP ${res.status}`);
  const out = [];
  for (const line of (await res.text()).split('\n')) {
    const [y, mo, d, h, mm] = line.split(',').map(Number);
    if (mm > -32000 && !Number.isNaN(mm)) out.push([Date.UTC(y, mo - 1, d, h), mm / 1000]);
  }
  return out;
}

/** Least squares for z0 and each constituent's cos/sin parts, then amplitude and phase. */
function fit(obs) {
  const n = 1 + 2 * NAMES.length;
  const A = Array.from({ length: n }, () => new Float64Array(n)), b = new Float64Array(n);
  const row = new Float64Array(n);
  for (const [t, z] of obs) {
    row[0] = 1;
    args(NAMES, t).forEach(([f, vu], i) => {
      row[1 + 2 * i] = f * Math.cos(vu);
      row[2 + 2 * i] = f * Math.sin(vu);
    });
    for (let i = 0; i < n; i++) {
      b[i] += row[i] * z;
      for (let j = i; j < n; j++) A[i][j] += row[i] * row[j];
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  const x = solve(A, b);
  const c = {};
  NAMES.forEach((name, i) => {
    const a = x[1 + 2 * i], s = x[2 + 2 * i];
    const g = ((Math.atan2(s, a) * 180) / Math.PI + 360) % 360;
    c[name] = [Math.round(Math.hypot(a, s) * 1e4) / 1e4, Math.round(g * 100) / 100];
  });
  return { z0: Math.round(x[0] * 1e4) / 1e4, c };
}

function solve(A, b) {
  const n = b.length;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    [A[k], A[p]] = [A[p], A[k]];
    [b[k], b[p]] = [b[p], b[k]];
    for (let i = k + 1; i < n; i++) {
      const m = A[i][k] / A[k][k];
      for (let j = k; j < n; j++) A[i][j] -= m * A[k][j];
      b[i] -= m * b[k];
    }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}

/** Least-squares z = a + b·x + c·x². */
function quadratic(pts) {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [0, 0, 0];
  for (const [x, z] of pts) {
    const p = [1, x, x * x];
    for (let i = 0; i < 3; i++) {
      r[i] += p[i] * z;
      for (let j = 0; j < 3; j++) A[i][j] += p[i] * p[j];
    }
  }
  return solve(A, r);
}

const YEAR = 365.25 * 86400000;
const between = (obs, from, to) => obs.filter(([t]) => t >= from && t < to);

/** RMS height error, and how far off the predicted times of high and low water are (minutes, median and 90th percentile). */
function score(st, obs) {
  let se = 0;
  for (const [t, z] of obs) se += (tideHeight(st, t) - z) ** 2;
  // For each predicted high and low, fit a parabola to the gauge's hourly heights within 3 hours of it.
  const at = new Map(obs.map(([t, z]) => [t, z]));
  const from = new Date(obs[0][0]), to = new Date(obs[obs.length - 1][0]);
  const diffs = [];
  let missed = 0;
  for (let y = from.getUTCFullYear(), m = from.getUTCMonth(); y * 12 + m <= to.getUTCFullYear() * 12 + to.getUTCMonth(); m === 11 ? (y++, (m = 0)) : m++) {
    for (const [day, turns] of Object.entries(tideTurns(st, y, m, 0))) {
      for (const turn of turns) {
        const t0 = Date.UTC(y, m, +day) + turn.min * 60000, hour = Math.round(t0 / 3600000) * 3600000;
        const pts = [];
        for (let k = -3; k <= 3; k++) if (at.has(hour + k * 3600000)) pts.push([(hour + k * 3600000 - t0) / 3600000, at.get(hour + k * 3600000)]);
        if (pts.length < 7) continue;
        const [, b, c] = quadratic(pts);
        const v = -b / (2 * c);
        if ((turn.high ? c >= 0 : c <= 0) || Math.abs(v) > 3) missed++;
        else diffs.push(Math.abs(v) * 60);
      }
    }
  }
  diffs.sort((x, y) => x - y);
  const q = (p) => Math.round(diffs[Math.floor(p * (diffs.length - 1))] ?? NaN);
  return `rms ${(Math.sqrt(se / obs.length) * 100).toFixed(1)} cm, turn times median ${q(0.5)} min off, 90% within ${q(0.9)} min, ${missed} of ${missed + diffs.length} not seen by the gauge`;
}

const out = [];
for (const [code, id, name] of STATIONS) {
  const obs = await records(code);
  const last = obs[obs.length - 1][0];
  const st = { id, name, ...fit(between(obs, last - FIT_YEARS * YEAR, last + 1)) };
  const years = `${new Date(last - FIT_YEARS * YEAR).getUTCFullYear()}–${new Date(last).getUTCFullYear()}`;
  console.log(`${name}: fitted ${years}, M2 ${st.c.M2[0]} m, K1 ${st.c.K1[0]} m, O1 ${st.c.O1[0]} m`);
  if (check) {
    // Fit on the first years only, then predict the last year, as far apart as the records allow.
    const first = obs[0][0];
    if (last - first > (FIT_YEARS + 3) * YEAR) {
      const old = { id, name, ...fit(between(obs, first, first + FIT_YEARS * YEAR)) };
      const test = between(obs, last - YEAR, last + 1);
      console.log(`  same years:   ${score(st, test)}`);
      console.log(`  ${Math.round((last - first) / YEAR - 1)} years later: ${score(old, test)}`);
    }
  }
  out.push(st);
}
writeFileSync(join(root, 'src/lib/calendar/tideStations.json'), `[\n${out.map((s) => JSON.stringify(s)).join(',\n')}\n]\n`);
console.log('Wrote src/lib/calendar/tideStations.json');
