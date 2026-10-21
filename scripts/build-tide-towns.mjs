// Tide constants for coastal towns without a tide gauge, from the EOT20 global ocean tide model
// (Hart-Davis et al. 2021, DGFI-TUM, CC BY 4.0, https://doi.org/10.17882/79489), and writes
// src/lib/calendar/tideTowns.json. EOT20 is a 2 GB download, so it is not kept in the repo:
//   1. Download https://www.seanoe.org/data/00683/79489/data/85762.zip and unzip it anywhere.
//   2. npm run tide-towns -- <unzipped folder>
//   npm run tide-towns -- <folder> --check   also predicts the gauge ports from EOT20 and scores them
//                                             against their gauge records, like build-tides.mjs --check.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import h5wasm from 'h5wasm/node';
import { between, mllw, records, score, STATIONS, YEAR } from './build-tides.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
const check = process.argv.includes('--check');
if (!dir) throw new Error('Usage: npm run tide-towns -- <unzipped EOT20 folder> [--check]');

/** id, name shown in the studio, latitude, longitude of the town's waterfront or port. */
const TOWNS = [
  // Negros Occidental
  ['bacolod', 'Bacolod, Negros Occidental', 10.676, 122.942],
  ['silay', 'Silay, Negros Occidental', 10.802, 122.966],
  ['victorias', 'Victorias, Negros Occidental', 10.927, 123.047],
  ['cadiz', 'Cadiz, Negros Occidental', 10.958, 123.307],
  ['sagay', 'Sagay, Negros Occidental', 10.975, 123.415],
  ['escalante', 'Escalante, Negros Occidental', 10.847, 123.503],
  ['san-carlos', 'San Carlos, Negros Occidental', 10.485, 123.423],
  ['pulupandan', 'Pulupandan, Negros Occidental', 10.520, 122.797],
  ['hinigaran', 'Hinigaran, Negros Occidental', 10.270, 122.843],
  ['himamaylan', 'Himamaylan, Negros Occidental', 10.100, 122.863],
  ['sipalay', 'Sipalay, Negros Occidental', 9.750, 122.398],
  ['hinoba-an', 'Hinoba-an, Negros Occidental', 9.597, 122.470],
  // Negros Oriental
  ['dumaguete', 'Dumaguete, Negros Oriental', 9.307, 123.310],
  ['sibulan', 'Sibulan, Negros Oriental', 9.355, 123.288],
  ['bais', 'Bais, Negros Oriental', 9.592, 123.150],
  ['tanjay', 'Tanjay, Negros Oriental', 9.518, 123.163],
  ['guihulngan', 'Guihulngan, Negros Oriental', 10.120, 123.276],
  ['dauin', 'Dauin, Negros Oriental', 9.190, 123.268],
  ['siaton', 'Siaton, Negros Oriental', 9.060, 123.035],
  ['bayawan', 'Bayawan, Negros Oriental', 9.370, 122.800],
  // Rest of the Visayas
  ['iloilo', 'Iloilo City', 10.693, 122.580],
  ['guimaras', 'Jordan, Guimaras', 10.658, 122.597],
  ['estancia', 'Estancia, Iloilo', 11.452, 123.152],
  ['roxas', 'Roxas City, Capiz', 11.592, 122.752],
  ['kalibo', 'Kalibo, Aklan', 11.712, 122.375],
  ['caticlan', 'Caticlan / Boracay, Aklan', 11.930, 121.950],
  ['san-jose-antique', 'San Jose de Buenavista, Antique', 10.745, 121.937],
  ['tagbilaran', 'Tagbilaran, Bohol', 9.648, 123.850],
  ['panglao', 'Panglao, Bohol', 9.580, 123.750],
  ['talibon', 'Talibon, Bohol', 10.150, 124.330],
  ['toledo', 'Toledo, Cebu', 10.378, 123.636],
  ['bantayan', 'Bantayan, Cebu', 11.168, 123.722],
  ['danao', 'Danao, Cebu', 10.520, 124.030],
  ['moalboal', 'Moalboal, Cebu', 9.950, 123.393],
  ['oslob', 'Oslob, Cebu', 9.520, 123.430],
  ['camotes', 'Poro, Camotes Islands', 10.630, 124.410],
  ['siquijor', 'Siquijor', 9.214, 123.513],
  ['tacloban', 'Tacloban, Leyte', 11.245, 125.005],
  ['ormoc', 'Ormoc, Leyte', 11.003, 124.607],
  ['maasin', 'Maasin, Southern Leyte', 10.130, 124.842],
  ['catbalogan', 'Catbalogan, Samar', 11.777, 124.880],
  ['calbayog', 'Calbayog, Samar', 12.067, 124.597],
  ['borongan', 'Borongan, Eastern Samar', 11.607, 125.437],
  ['guiuan', 'Guiuan, Eastern Samar', 11.033, 125.725],
  ['masbate', 'Masbate City', 12.370, 123.623],
  ['romblon', 'Romblon, Romblon', 12.577, 122.270],
  // Luzon, Mindoro and Palawan
  ['batangas', 'Batangas City', 13.755, 121.045],
  ['nasugbu', 'Nasugbu, Batangas', 14.072, 120.627],
  ['puerto-galera', 'Puerto Galera, Oriental Mindoro', 13.510, 120.955],
  ['calapan', 'Calapan, Oriental Mindoro', 13.412, 121.180],
  ['san-jose-mindoro', 'San Jose, Occidental Mindoro', 12.352, 121.065],
  ['coron', 'Coron, Palawan', 11.998, 120.204],
  ['el-nido', 'El Nido, Palawan', 11.180, 119.392],
  ['mariveles', 'Mariveles, Bataan', 14.433, 120.488],
  ['iba', 'Iba, Zambales', 15.330, 119.968],
  ['bolinao', 'Bolinao, Pangasinan', 16.390, 119.895],
  ['dagupan', 'Dagupan / Lingayen, Pangasinan', 16.063, 120.335],
  ['san-fernando-lu', 'San Fernando, La Union', 16.617, 120.310],
  ['aparri', 'Aparri, Cagayan', 18.360, 121.640],
  ['basco', 'Basco, Batanes', 20.450, 121.968],
  ['baler', 'Baler, Aurora', 15.760, 121.570],
  ['real', 'Real, Quezon', 14.665, 121.610],
  ['lucena', 'Lucena, Quezon', 13.920, 121.620],
  ['daet', 'Mercedes / Daet, Camarines Norte', 14.110, 123.010],
  ['pasacao', 'Pasacao, Camarines Sur', 13.510, 123.040],
  ['virac', 'Virac, Catanduanes', 13.578, 124.232],
  ['sorsogon', 'Sorsogon City', 12.967, 124.008],
  ['matnog', 'Matnog, Sorsogon', 12.587, 124.088],
  // Mindanao
  ['cagayan-de-oro', 'Cagayan de Oro', 8.495, 124.660],
  ['iligan', 'Iligan, Lanao del Norte', 8.232, 124.232],
  ['ozamiz', 'Ozamiz, Misamis Occidental', 8.150, 123.848],
  ['dapitan', 'Dapitan / Dipolog, Zamboanga del Norte', 8.657, 123.423],
  ['camiguin', 'Mambajao, Camiguin', 9.252, 124.717],
  ['nasipit', 'Nasipit / Butuan, Agusan del Norte', 8.990, 125.340],
  ['surigao', 'Surigao City', 9.787, 125.497],
  ['siargao', 'General Luna, Siargao', 9.785, 126.160],
  ['tandag', 'Tandag, Surigao del Sur', 9.078, 126.198],
  ['bislig', 'Bislig, Surigao del Sur', 8.212, 126.360],
  ['mati', 'Mati, Davao Oriental', 6.952, 126.218],
  ['general-santos', 'General Santos', 6.100, 125.152],
  ['cotabato', 'Polloc / Cotabato City', 7.350, 124.220],
  ['pagadian', 'Pagadian, Zamboanga del Sur', 7.822, 123.440],
  ['zamboanga', 'Zamboanga City', 6.903, 122.072],
  ['isabela-basilan', 'Isabela City, Basilan', 6.703, 121.970],
  ['bongao', 'Bongao, Tawi-Tawi', 5.030, 119.772],
];

/** EOT20 file prefix → our constituent name. S1 is left out: it is mostly the weather, and EOT20's does not match the gauges'. */
const NAMES = { '2N2': '2N2', J1: 'J1', K1: 'K1', K2: 'K2', M2: 'M2', M4: 'M4', MF: 'Mf', MM: 'Mm', N2: 'N2', O1: 'O1', P1: 'P1', Q1: 'Q1', S2: 'S2', SA: 'Sa', SSA: 'Ssa', T2: 'T2' };
/** The Philippines and its seas, in grid rows and columns (the grid is every 1/8° from 90°S and 0°E). */
const LAT0 = 3, LAT1 = 22, LON0 = 115, LON1 = 128, CELL = 0.125;
const rows = [(LAT0 + 90) / CELL, (LAT1 + 90) / CELL + 1], cols = [LON0 / CELL, LON1 / CELL + 1];
const W = cols[1] - cols[0];

/** Each constituent's amplitude (m) and phase (degrees) over the region, row by row. */
async function grids() {
  await h5wasm.ready;
  const folder = [dir, join(dir, 'ocean_tides')].find((d) => readdirSync(d).some((f) => f.endsWith('_ocean_eot20.nc')));
  if (!folder) throw new Error(`No *_ocean_eot20.nc files in ${dir}`);
  const out = {};
  for (const [file, name] of Object.entries(NAMES)) {
    const f = new h5wasm.File(join(folder, `${file}_ocean_eot20.nc`), 'r');
    out[name] = { amp: f.get('amplitude').slice([rows, cols]), pha: f.get('phase').slice([rows, cols]) };
    f.close();
  }
  return out;
}

const km = (lat1, lon1, lat2, lon2) => {
  const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180)), y = lat2 - lat1;
  return Math.hypot(x, y) * 111.2;
};

/**
 * Constants at a point: the sea cells nearest it, weighted by inverse distance squared, averaged as
 * complex numbers so phases near 0°/360° blend properly. Also says how far the nearest sea cell is.
 */
function at(g, lat, lon) {
  const cells = [];
  const r0 = Math.round((lat - LAT0) / CELL), c0 = Math.round((lon - LON0) / CELL);
  for (let r = r0 - 4; r <= r0 + 4; r++) {
    for (let c = c0 - 4; c <= c0 + 4; c++) {
      const i = r * W + c, a = g.M2.amp[i];
      if (!(a > 0)) continue;
      cells.push({ i, d: km(lat, lon, LAT0 + r * CELL, LON0 + c * CELL) });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  if (!cells.length || cells[0].d > 30) return null;
  const use = cells.filter((x) => x.d <= cells[0].d + 8).slice(0, 4);
  const w = use.map((x) => 1 / Math.max(x.d, 1) ** 2), sw = w.reduce((a, b) => a + b, 0);
  const c = {};
  for (const name of Object.values(NAMES)) {
    let re = 0, im = 0;
    use.forEach((x, k) => {
      const A = g[name].amp[x.i] / 100, p = g[name].pha[x.i] * (Math.PI / 180);
      re += (w[k] / sw) * A * Math.cos(p);
      im += (w[k] / sw) * A * Math.sin(p);
    });
    c[name] = [Math.round(Math.hypot(re, im) * 1e4) / 1e4, Math.round((((Math.atan2(im, re) * 180) / Math.PI + 360) % 360) * 100) / 100];
  }
  return { c, km: Math.round(cells[0].d * 10) / 10 };
}

const g = await grids();
const out = [];
for (const [id, name, lat, lon] of TOWNS) {
  const p = at(g, lat, lon);
  if (!p) throw new Error(`${name}: no EOT20 sea cell within 30 km`);
  const st = { id, name, z0: 0, datum: 0, c: p.c };
  st.datum = mllw(st);
  out.push(st);
  console.log(`${name.padEnd(42)} nearest sea cell ${String(p.km).padStart(4)} km, M2 ${p.c.M2[0].toFixed(2)} m, K1 ${p.c.K1[0].toFixed(2)} m`);
}
writeFileSync(join(root, 'src/lib/calendar/tideTowns.json'), `[\n${out.map((s) => JSON.stringify(s)).join(',\n')}\n]\n`);
console.log(`Wrote src/lib/calendar/tideTowns.json (${out.length} towns)`);

if (check) {
  // How EOT20 does where we know the answer: each gauge port, predicted from EOT20 and from its own gauge fit,
  // both scored against the gauge's last year of records.
  const gauges = JSON.parse(readFileSync(join(root, 'src/lib/calendar/tideStations.json'), 'utf8'));
  for (const [code, id, name, lat, lon] of STATIONS) {
    const p = at(g, lat, lon);
    if (!p) { console.log(`${name}: no EOT20 sea cell within 30 km`); continue; }
    const model = { id, name, z0: 0, datum: 0, c: p.c };
    const obs = await records(code);
    const last = obs[obs.length - 1][0];
    const test = between(obs, last - YEAR, last + 1);
    const gauge = gauges.find((s) => s.id === id);
    const dg = (k) => ((((p.c[k][1] - gauge.c[k][1]) % 360) + 540) % 360) - 180;
    console.log(`${name} (sea cell ${p.km} km away; EOT20 vs gauge: M2 ${p.c.M2[0].toFixed(2)}/${gauge.c.M2[0].toFixed(2)} m ${dg('M2').toFixed(0)}°, K1 ${p.c.K1[0].toFixed(2)}/${gauge.c.K1[0].toFixed(2)} m ${dg('K1').toFixed(0)}°)`);
    console.log(`  gauge fit: ${score(gauge, test)}`);
    console.log(`  EOT20:     ${score(model, test)}`);
  }
}
