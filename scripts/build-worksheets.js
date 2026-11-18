#!/usr/bin/env node
/**
 * Builds printable "mad minute" worksheets (100 problems and an answer key) into docs/worksheets/, plus docs/index.html
 * and docs/sitemap.xml. Teachers and parents search for these ("addition mad minute worksheet"); every page points to the
 * app, which does the same drill with a timer, a review and your trouble spots.
 *
 *   node scripts/build-worksheets.js           # write the files
 *   node scripts/build-worksheets.js --check   # exit 1 if the committed files are out of date
 *
 * The files are committed and served by GitHub Pages from docs/. The problems follow the app's rules: no negative answers,
 * no division with a remainder, never a divisor of zero. They come from a fixed seed, so a rebuild changes nothing.
 */
const fs = require('fs');
const path = require('path');
const { appStoreLink, playStoreLink } = require('./growthLinks');

const SITE_URL = 'https://bsav0016.github.io/MadMinute';
const DOCS = path.join(__dirname, '..', 'docs');
const PROBLEMS = 100;
const VERSIONS = 3;

const SHEETS = [
  { key: 'addition-0-10', op: 'add', min: 0, max: 10, name: 'Addition', range: 'numbers 0 to 10' },
  { key: 'addition-0-20', op: 'add', min: 0, max: 20, name: 'Addition', range: 'numbers 0 to 20' },
  { key: 'subtraction-0-10', op: 'sub', min: 0, max: 10, name: 'Subtraction', range: 'numbers 0 to 10' },
  { key: 'subtraction-0-20', op: 'sub', min: 0, max: 20, name: 'Subtraction', range: 'numbers 0 to 20' },
  { key: 'multiplication-1-5', op: 'mul', min: 1, max: 5, name: 'Multiplication', range: 'factors 1 to 5' },
  { key: 'multiplication-1-10', op: 'mul', min: 1, max: 10, name: 'Multiplication', range: 'factors 1 to 10' },
  { key: 'multiplication-1-12', op: 'mul', min: 1, max: 12, name: 'Multiplication', range: 'factors 1 to 12' },
  { key: 'division-1-10', op: 'div', min: 1, max: 10, name: 'Division', range: 'facts up to 10 x 10' },
  { key: 'division-1-12', op: 'div', min: 1, max: 12, name: 'Division', range: 'facts up to 12 x 12' },
  { key: 'mixed-0-12', op: 'mix', min: 0, max: 12, name: 'Mixed operations', range: 'numbers 0 to 12' },
];

const SYMBOL = { add: '+', sub: '&minus;', mul: '&times;', div: '&divide;' };

// A small seeded generator (mulberry32), so the same sheet comes out every time.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (random, min, max) => min + Math.floor(random() * (max - min + 1));

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** One problem for an operation: { a, b, op, answer }. */
function problem(random, op, min, max) {
  if (op === 'add') {
    const a = between(random, min, max);
    const b = between(random, min, max);
    return { a, b, op, answer: a + b };
  }
  if (op === 'sub') {
    const a = between(random, min, max);
    const b = between(random, min, a); // never larger than a, so no negative answers
    return { a, b, op, answer: a - b };
  }
  if (op === 'mul') {
    const a = between(random, min, max);
    const b = between(random, min, max);
    return { a, b, op, answer: a * b };
  }
  // Division: pick the divisor and the answer, show their product, so there is never a remainder.
  const divisor = between(random, Math.max(min, 1), max);
  const answer = between(random, Math.max(min, 1), max);
  return { a: divisor * answer, b: divisor, op: 'div', answer };
}

/** The 100 problems for a sheet and version, no problem repeated within the sheet when the range allows. */
function problemsFor(sheet, version) {
  const random = rng(hash(`${sheet.key}:${version}`));
  const ops = sheet.op === 'mix' ? ['add', 'sub', 'mul', 'div'] : [sheet.op];
  const seen = new Set();
  const list = [];
  let guard = 0;
  while (list.length < PROBLEMS) {
    const op = ops[between(random, 0, ops.length - 1)];
    const p = problem(random, op, sheet.min, sheet.max);
    const id = `${p.a}${p.op}${p.b}`;
    // A small range has fewer than 100 distinct problems, so repeats are allowed once the pool is used up.
    if (seen.has(id) && guard++ < 2000) continue;
    seen.add(id);
    list.push(p);
  }
  return list;
}

const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
  :root { --bg:#f6f8fb; --card:#fff; --ink:#16202e; --muted:#5d6b7e; --brand:#1d5fd1; --line:#dde3ec; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  main { max-width:860px; margin:0 auto; padding:20px 16px 56px; }
  nav { display:flex; gap:6px 18px; flex-wrap:wrap; margin-bottom:14px; font-weight:600; } nav a { text-decoration:none; }
  a { color:var(--brand); }
  h1 { font-size:26px; margin:8px 0; } h2 { font-size:19px; margin:26px 0 6px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:6px 20px 20px; }
  .cta { border:1px solid var(--line); border-radius:12px; padding:2px 16px 12px; margin:22px 0; background:var(--bg); }
  .button { display:inline-block; margin:4px 8px 4px 0; padding:9px 16px; border-radius:10px; background:var(--brand); color:#fff; font-weight:700; text-decoration:none; }
  .sheet-head { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px 24px; margin:12px 0 10px; font-weight:600; }
  .grid { display:grid; grid-template-columns:repeat(5, 1fr); gap:10px 8px; font-variant-numeric:tabular-nums; font-size:17px; }
  .grid div { border-bottom:1px solid var(--line); padding:5px 2px; white-space:nowrap; }
  .grid small { color:var(--muted); font-size:12px; margin-right:4px; }
  .key { margin-top:28px; } .key .grid div { border-bottom:none; }
  footer { color:var(--muted); font-size:13px; margin-top:22px; }
  ul.links { columns:2; padding-left:20px; } ul.links li { margin:2px 0; }
  @media (max-width:560px) { .grid { grid-template-columns:repeat(3, 1fr); font-size:15px; } ul.links { columns:1; } }
  @media print {
    body { background:#fff; font-size:12pt; } main { max-width:none; padding:0; }
    nav, .cta, .noprint, footer, .related { display:none !important; }
    .card { border:none; padding:0; }
    .grid { grid-template-columns:repeat(5, 1fr); font-size:12pt; gap:2px 8px; }
    .grid div { padding:2px 2px; }
    h1 { font-size:18pt; margin:0 0 4px; }
    .sheet-head { margin:4px 0 6px; }
    .key { break-before:page; margin-top:0; }
    h2 { margin-top:10px; }
  }
`;

function layout({ title, description, canonical, depth, body }) {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="apple-itunes-app" content="app-id=6739588575">
<style>${CSS}</style>
</head>
<body>
<main>
<nav><a href="${up}index.html">Math Mad Minute</a><a href="${depth ? '' : 'worksheets/'}index.html">Worksheets</a><a href="${up}privacy.html">Privacy Policy</a></nav>
${body}
<footer>Math Mad Minute by Savidge Apps. Free to print and copy for your classroom or home.</footer>
</main>
</body>
</html>
`;
}

function ctaBox(campaign) {
  const play = playStoreLink(campaign);
  return `<div class="cta">
<h2>Practise it on a phone or tablet</h2>
<p>The free Math Mad Minute app runs the same drill with a timer (30, 60 or 120 seconds), shows every answer afterwards, and keeps track of the facts you miss. No ads, no account, and everything stays on the device.</p>
<p><a class="button" href="${esc(appStoreLink(campaign))}">Get it on the App Store</a>${play ? ` <a class="button" href="${esc(play)}">Get it on Google Play</a>` : ''}</p>
</div>`;
}

const sheetLabel = (sheet) => `${sheet.name}, ${sheet.range}`;

function renderProblem(p, i) {
  return `<div><small>${i + 1}.</small>${p.a} ${SYMBOL[p.op]} ${p.b} =</div>`;
}

function sheetPage(sheet, version) {
  const list = problemsFor(sheet, version);
  const name = `${sheet.key}-${version}`;
  const title = `${sheet.name} Mad Minute Worksheet, ${sheet.range} (Sheet ${version}) with Answer Key`;
  const description = `Printable ${sheet.name.toLowerCase()} mad minute worksheet: 100 problems, ${sheet.range}, with an answer key. Free to print; time it for one minute.`;

  const others = Array.from({ length: VERSIONS }, (_, i) => i + 1)
    .filter((v) => v !== version)
    .map((v) => `<a href="${sheet.key}-${v}.html">Sheet ${v}</a>`)
    .join(', ');

  const body = `<div class="card">
<h1>${esc(sheet.name)} mad minute worksheet: ${esc(sheet.range)}</h1>
<p class="noprint">A mad minute is a timed drill: answer as many of the 100 problems as you can in one minute (or give a younger child two or three), then check the answers on the next page. Print this page for the worksheet and the page after it for the answer key. Sheet ${version} of ${VERSIONS}.</p>
<div class="sheet-head"><span>Name: ____________________</span><span>Date: ____________</span><span>Score: ______ / ${PROBLEMS}</span></div>
<div class="grid">
${list.map(renderProblem).join('\n')}
</div>
<div class="key">
<h2>Answer key: ${esc(sheetLabel(sheet))}, sheet ${version}</h2>
<div class="grid">
${list.map((p, i) => `<div><small>${i + 1}.</small>${p.answer}</div>`).join('\n')}
</div>
</div>
</div>
${ctaBox(`web-${name}`)}
<p class="related">Other versions: ${others}. <a href="index.html">All worksheets</a></p>`;

  return { file: `worksheets/${name}.html`, html: layout({ title, description, canonical: `${SITE_URL}/worksheets/${name}.html`, depth: 1, body }) };
}

function worksheetIndex() {
  const rows = SHEETS.map((sheet) => {
    const links = Array.from({ length: VERSIONS }, (_, i) => i + 1)
      .map((v) => `<a href="${sheet.key}-${v}.html">Sheet ${v}</a>`)
      .join(' &middot; ');
    return `<li><strong>${esc(sheetLabel(sheet))}</strong>: ${links}</li>`;
  }).join('\n');
  const body = `<div class="card">
<h1>Free printable mad minute worksheets</h1>
<p>100 problems on a page with an answer key, for addition, subtraction, multiplication, division and mixed practice. Each worksheet comes in ${VERSIONS} versions, so a class or a child can do a fresh sheet each day. Print the page, set a timer for one minute, and count the right answers.</p>
<ul class="links">
${rows}
</ul>
<h2>How to use a mad minute</h2>
<p>Start with a range the child can mostly answer, and have them beat their own score rather than anyone else's. Practise a little every day. When a few facts keep going wrong, drill those on their own instead of repeating the whole sheet.</p>
</div>
${ctaBox('web-worksheets-index')}`;
  return {
    file: 'worksheets/index.html',
    html: layout({
      title: 'Free Printable Mad Minute Worksheets with Answer Keys | Math Mad Minute',
      description: 'Free printable mad minute math worksheets: addition, subtraction, multiplication, division and mixed, 100 problems each with an answer key.',
      canonical: `${SITE_URL}/worksheets/`,
      depth: 1,
      body,
    }),
  };
}

function homePage() {
  const body = `<div class="card">
<h1>Math Mad Minute</h1>
<p>The classic timed arithmetic drill, on your phone. Answer as many problems as you can in 30, 60 or 120 seconds, choose which operations and number ranges to practise, then review every answer. It keeps your personal bests, your accuracy for each operation and a times table coloured by the facts you know. No ads, no account, and your history stays on your device.</p>
${ctaBox('web-home').replace('<h2>Practise it on a phone or tablet</h2>\n', '')}
<h2>Printable worksheets</h2>
<p>Prefer paper? There are <a href="worksheets/index.html">free printable mad minute worksheets</a> with answer keys for every operation.</p>
<h2>More</h2>
<p><a href="privacy.html">Privacy Policy</a> &middot; savidgeapps@gmail.com</p>
</div>`;
  return {
    file: 'index.html',
    html: layout({
      title: 'Math Mad Minute: timed arithmetic drills for iPhone and iPad',
      description: 'Timed arithmetic drills in 30, 60 or 120 seconds. Choose the operations and number ranges, review every answer and track your trouble spots. Free, no ads, no account.',
      canonical: `${SITE_URL}/`,
      depth: 0,
      body,
    }),
  };
}

function sitemap(pages) {
  const urls = pages.map((p) => `  <url><loc>${SITE_URL}/${p.file === 'index.html' ? '' : p.file}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Every generated file as { file, html }, paths relative to docs/. */
function buildAll() {
  const pages = [homePage(), worksheetIndex()];
  for (const sheet of SHEETS) for (let v = 1; v <= VERSIONS; v++) pages.push(sheetPage(sheet, v));
  return [...pages, { file: 'sitemap.xml', html: sitemap(pages) }];
}

function main() {
  const check = process.argv.includes('--check');
  const stale = [];
  for (const { file, html } of buildAll()) {
    const target = path.join(DOCS, file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current === html) continue;
    stale.push(file);
    if (!check) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html);
    }
  }
  if (check && stale.length) {
    console.error(`Out of date, run: node scripts/build-worksheets.js\n${stale.join('\n')}`);
    process.exit(1);
  }
  console.log(check ? 'Worksheets are up to date.' : `Wrote ${stale.length} file(s).`);
}

if (require.main === module) main();

module.exports = { SHEETS, VERSIONS, PROBLEMS, problemsFor, buildAll };
