/**
 * The extra pages under docs/resources/: a printable multiplication chart, a page for each times table (the table, a
 * practice sheet and its key, and a tip), a worksheet maker that runs in the browser, a progress tracker and a short guide
 * to running a mad minute. Built by build-worksheets.js, which owns the layout, the links and the sitemap.
 */

const TIPS = {
  2: 'Double the number. Every answer is even.',
  3: 'Add the digits of any answer up to 3 x 12 and you get 3, 6 or 9. If you do not, check it again.',
  4: 'Double it, then double again.',
  5: 'Every answer ends in 0 or 5. For an even number, halve it and add a zero: 5 x 8 is half of 80.',
  6: 'Think 5 x the number, then add one more of the number. For an even number the answer ends in the same digit: 6 x 4 = 24, 6 x 8 = 48.',
  7: 'The hard one. Learn 7 x 6 = 42 and 7 x 8 = 56 ("5, 6, 7, 8": 56 = 7 x 8), then the rest come from the facts you already know.',
  8: 'Double, double and double again: 8 x 3 is 3, 6, 12, 24.',
  9: 'For 9 x 1 up to 9 x 10 the digits of the answer add up to 9 (9 x 7 = 63, 6 + 3 = 9). Or take the number times 10, then subtract the number.',
  10: 'Add a zero.',
  11: 'Up to 11 x 9 the answer is the digit twice: 11 x 6 = 66. Then 11 x 10 = 110, 11 x 11 = 121, 11 x 12 = 132.',
  12: 'Do 10 x the number, then add 2 x the number: 12 x 7 is 70 + 14 = 84.',
};

const TABLES = Object.keys(TIPS).map(Number);

function resourcePages(h) {
  const { layout, ctaBox, esc, rng, between, hash, SITE_URL } = h;

  const page = (file, title, description, body) => ({
    file: `resources/${file}`,
    html: layout({ title, description, canonical: `${SITE_URL}/resources/${file}`, depth: 1, body }),
  });

  // ---- multiplication chart ----
  function chart() {
    const nums = Array.from({ length: 12 }, (_, i) => i + 1);
    const head = `<tr><th scope="col">&times;</th>${nums.map((n) => `<th scope="col">${n}</th>`).join('')}</tr>`;
    const rows = nums
      .map((r) => `<tr><th scope="row">${r}</th>${nums.map((c) => `<td${r === c ? ' class="sq"' : ''}>${r * c}</td>`).join('')}</tr>`)
      .join('\n');
    const links = TABLES.map((n) => `<a href="times-table-${n}.html">${n}</a>`).join(' &middot; ');
    const body = `<div class="card">
<h1>Multiplication chart 1 to 12</h1>
<p>A free printable multiplication table from 1 x 1 to 12 x 12. Find a row and a column; the answer is where they meet. The shaded squares are the square numbers (1 x 1, 2 x 2 and so on). Print it landscape for the best fit.</p>
<table class="chart mchart">
<thead>${head}</thead>
<tbody>
${rows}
</tbody>
</table>
<h2>Practise one table at a time</h2>
<p>${links}</p>
</div>
${ctaBox('web-resources-chart')}`;
    return page('multiplication-chart.html', 'Printable Multiplication Chart 1 to 12 (Free)',
      'Free printable multiplication chart, 1 x 1 to 12 x 12, with square numbers shaded. Print it landscape and use it for times table practice.', body);
  }

  // ---- one times table ----
  function timesTable(n) {
    const facts = Array.from({ length: 12 }, (_, i) => i + 1);
    const random = rng(hash(`times-table:${n}`));
    // 12 multiplications (the table in a shuffled order, the table number first or second) then 12 divisions.
    const shuffle = (list) => {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = between(random, 0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    const order = shuffle(facts);
    const problems = order.map((k) => (between(random, 0, 1) ? { text: `${n} &times; ${k} =`, answer: n * k } : { text: `${k} &times; ${n} =`, answer: n * k }));
    shuffle(facts).forEach((k) => problems.push({ text: `${n * k} &divide; ${n} =`, answer: k }));

    const cell = (p, i, answer) => `<div><small>${i + 1}.</small>${answer ? p.answer : p.text}</div>`;
    const prev = TABLES[TABLES.indexOf(n) - 1];
    const next = TABLES[TABLES.indexOf(n) + 1];
    const body = `<div class="card">
<h1>${n} times table</h1>
<p><strong>Tip:</strong> ${esc(TIPS[n])}</p>
<div class="grid tt">
${facts.map((k) => `<div>${n} &times; ${k} = <strong>${n * k}</strong></div>`).join('\n')}
</div>
<h2>Practice sheet</h2>
<p class="noprint">Cover the table above and answer all 24, then check the key. Time it, and try to beat your time tomorrow.</p>
<div class="sheet-head"><span>Name: ____________________</span><span>Date: ____________</span><span>Score: ______ / ${problems.length}</span></div>
<div class="grid">
${problems.map((p, i) => cell(p, i, false)).join('\n')}
</div>
<div class="key">
<h2>Answer key</h2>
<div class="grid">
${problems.map((p, i) => cell(p, i, true)).join('\n')}
</div>
</div>
</div>
${ctaBox(`web-resources-times-${n}`)}
<p class="related">${prev ? `<a href="times-table-${prev}.html">${prev} times table</a> &middot; ` : ''}${next ? `<a href="times-table-${next}.html">${next} times table</a> &middot; ` : ''}<a href="multiplication-chart.html">Multiplication chart</a> &middot; <a href="index.html">All resources</a></p>`;
    return page(`times-table-${n}.html`, `${n} Times Table: Chart, Tips and Free Practice Sheet`,
      `The ${n} times table up to ${n} x 12, a tip for remembering it, and a free printable practice sheet with multiplication and division questions and an answer key.`, body);
  }

  // ---- worksheet maker ----
  function maker() {
    const body = `<div class="card">
<h1>Make your own mad minute worksheet</h1>
<p class="noprint">Choose the operation and the range of numbers, then print. Every click makes a fresh sheet. Nothing you choose is sent anywhere; it all happens in your browser.</p>
<form id="maker" class="maker">
<label>Operation
<select name="op">
<option value="add">Addition</option>
<option value="sub">Subtraction</option>
<option value="mul">Multiplication</option>
<option value="div">Division</option>
<option value="mix">Mixed</option>
</select></label>
<label>Smallest number <input type="number" name="min" value="0" min="0" max="100"></label>
<label>Largest number <input type="number" name="max" value="12" min="0" max="100"></label>
<label>Problems <input type="number" name="count" value="100" min="10" max="100"></label>
<label class="check"><input type="checkbox" name="key" checked> Include answer key</label>
<button class="button" type="submit">Make a new sheet</button>
<button class="button secondary" type="button" id="print">Print</button>
</form>
<p class="noprint">Subtraction never gives a negative answer and division always comes out even, like the app. For division, the numbers are the facts you want to practise: 1 to 12 gives everything up to 12 x 12.</p>
<div id="sheet" aria-live="polite"><noscript><p>The worksheet maker needs JavaScript. The <a href="../worksheets/index.html">ready-made worksheets</a> work without it.</p></noscript></div>
</div>
${ctaBox('web-resources-maker')}`;
    const p = page('worksheet-maker.html', 'Free Math Worksheet Maker: Mad Minute Sheets for Any Numbers',
      'Make a printable mad minute worksheet with the operation and number range you choose: addition, subtraction, multiplication, division or mixed, with an answer key.', body);
    p.html = p.html.replace('</body>', '<script src="../maker.js"></script>\n</body>');
    return p;
  }

  // ---- progress tracker ----
  function tracker() {
    const rowsHtml = Array.from({ length: 20 }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('\n');
    const body = `<div class="card">
<h1>Mad minute progress tracker</h1>
<p class="noprint">Print this and fill in one row each time you do a mad minute. Seeing the score climb is the point: a child is only ever racing their own last score.</p>
<div class="sheet-head"><span>Name: ____________________</span><span>Goal: ______ correct in ______ minute(s)</span></div>
<table class="chart track">
<thead><tr><th scope="col">Date</th><th scope="col">Sheet</th><th scope="col">Time</th><th scope="col">Correct</th><th scope="col">Notes</th></tr></thead>
<tbody>
${rowsHtml}
</tbody>
</table>
</div>
${ctaBox('web-resources-tracker')}`;
    return page('progress-tracker.html', 'Printable Mad Minute Progress Tracker',
      'A free printable tracker for mad minute scores: date, sheet, time, number correct and notes, with a goal line.', body);
  }

  // ---- guide ----
  function guide() {
    const body = `<div class="card">
<h1>How to run a mad minute</h1>
<p>A mad minute is a short timed drill: answer as many arithmetic problems as you can in one minute. It builds fluency, meaning answering a fact without working it out, which frees up thinking for harder maths later. Here is a simple way to run one at home or in a classroom.</p>

<h2>Before you start</h2>
<ul>
<li>Pick a range the child can mostly answer. If they are stuck on most of it, step down to an easier sheet; the drill is for facts they nearly know.</li>
<li>Use a <a href="../worksheets/index.html">ready-made worksheet</a> or <a href="worksheet-maker.html">make one</a> for the exact numbers you want to practise.</li>
<li>Print the answer key on its own page so marking takes seconds.</li>
</ul>

<h2>Running it</h2>
<ol>
<li>Sheets face down, pencils ready. Say "go" and start the timer.</li>
<li>Work in order and skip anything that takes too long, then come back if there is time.</li>
<li>When the minute ends, pencils down. Mark together, and count the correct answers (not how far they got).</li>
<li>Write the score on the <a href="progress-tracker.html">progress tracker</a>.</li>
</ol>

<h2>Keeping it useful</h2>
<ul>
<li><strong>Compete against yesterday, not each other.</strong> Comparing children's scores turns a confidence builder into a source of dread.</li>
<li><strong>Little and often.</strong> A minute a day beats a long session once a week.</li>
<li><strong>Look at the misses.</strong> If the same facts keep going wrong, practise those alone with the <a href="multiplication-chart.html">chart</a> and a <a href="times-table-7.html">single times table page</a> before another full sheet.</li>
<li><strong>Move up when it is easy.</strong> When most of a sheet is right before time runs out, widen the range or add an operation.</li>
</ul>

<h2>Use the app for the same thing</h2>
<p>Math Mad Minute runs the drill on a phone or tablet, with a timer, an instant review of every answer, personal bests, and a times table coloured by the facts you know and the ones to practise.</p>
</div>
${ctaBox('web-resources-guide')}`;
    return page('how-to-run-a-mad-minute.html', 'How to Run a Mad Minute: A Simple Guide for Parents and Teachers',
      'How to run a mad minute drill: choosing the range, timing it, marking, tracking progress and keeping it encouraging.', body);
  }

  // ---- index ----
  function index() {
    const tables = TABLES.map((n) => `<a href="times-table-${n}.html">${n}</a>`).join(' &middot; ');
    const body = `<div class="card">
<h1>Free math resources</h1>
<ul class="links one">
<li><a href="worksheet-maker.html"><strong>Worksheet maker</strong></a>: choose the operation and numbers, print a fresh sheet with a key.</li>
<li><a href="multiplication-chart.html"><strong>Multiplication chart 1 to 12</strong></a>: printable, square numbers shaded.</li>
<li><a href="progress-tracker.html"><strong>Progress tracker</strong></a>: record each mad minute score.</li>
<li><a href="how-to-run-a-mad-minute.html"><strong>How to run a mad minute</strong></a>: a short guide for parents and teachers.</li>
<li><a href="../worksheets/index.html"><strong>Ready-made worksheets</strong></a>: 30 sheets with answer keys.</li>
</ul>
<h2>Times tables</h2>
<p>A tip, the full table and a practice sheet with an answer key: ${tables}</p>
</div>
${ctaBox('web-resources-index')}`;
    return page('index.html', 'Free Math Resources: Worksheets, Multiplication Chart and Times Tables | Math Mad Minute',
      'Free printable math resources: a worksheet maker, multiplication chart, times table practice sheets, a progress tracker and a guide to running a mad minute.', body);
  }

  return [index(), maker(), chart(), tracker(), guide(), ...TABLES.map(timesTable)];
}

module.exports = { resourcePages, TABLES, TIPS };
