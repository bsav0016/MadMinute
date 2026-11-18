// The worksheet maker's code (docs/resources/worksheet-maker.html). Plain browser JavaScript with no dependencies and no
// network calls: nothing typed or generated leaves the page. Also loadable from Node so the rules can be unit tested.
//
// The rules are the app's: no negative answers, no division with a remainder, never a divisor of zero.
(function (root) {
  var OPS = ['add', 'sub', 'mul', 'div', 'mix'];
  var SYMBOL = { add: '+', sub: '−', mul: '×', div: '÷' };

  function between(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
  }

  function one(random, op, min, max) {
    if (op === 'add') {
      var a = between(random, min, max), b = between(random, min, max);
      return { a: a, b: b, op: op, answer: a + b };
    }
    if (op === 'sub') {
      var x = between(random, min, max), y = between(random, min, x);
      return { a: x, b: y, op: op, answer: x - y };
    }
    if (op === 'mul') {
      var m = between(random, min, max), n = between(random, min, max);
      return { a: m, b: n, op: op, answer: m * n };
    }
    var divisor = between(random, Math.max(min, 1), max);
    var quotient = between(random, Math.max(min, 1), max);
    return { a: divisor * quotient, b: divisor, op: 'div', answer: quotient };
  }

  /** Clamp what a person typed to something safe: whole numbers, 0 to 100, min no larger than max, 10 to 100 problems. */
  function clean(options) {
    var op = OPS.indexOf(options.op) >= 0 ? options.op : 'add';
    var min = Math.max(0, Math.min(100, Math.floor(Number(options.min)) || 0));
    var max = Math.max(0, Math.min(100, Math.floor(Number(options.max)) || 0));
    if (min > max) { var t = min; min = max; max = t; }
    if ((op === 'div' || op === 'mix') && max < 1) max = 1;
    var count = Math.max(10, Math.min(100, Math.floor(Number(options.count)) || 100));
    return { op: op, min: min, max: max, count: count };
  }

  /** `count` problems. Repeats are avoided until the range runs out of distinct problems. */
  function makeProblems(options, random) {
    var o = clean(options);
    random = random || Math.random;
    var ops = o.op === 'mix' ? ['add', 'sub', 'mul', 'div'] : [o.op];
    var seen = {}, list = [], guard = 0;
    while (list.length < o.count) {
      var p = one(random, ops[between(random, 0, ops.length - 1)], o.min, o.max);
      var id = p.a + p.op + p.b;
      if (seen[id] && guard++ < 3000) continue;
      seen[id] = true;
      list.push(p);
    }
    return list;
  }

  function render(list, showKey) {
    function cells(fn) {
      return list.map(function (p, i) { return '<div><small>' + (i + 1) + '.</small>' + fn(p) + '</div>'; }).join('');
    }
    var html = '<div class="sheet-head"><span>Name: ____________________</span><span>Date: ____________</span><span>Score: ______ / ' + list.length + '</span></div>' +
      '<div class="grid">' + cells(function (p) { return p.a + ' ' + SYMBOL[p.op] + ' ' + p.b + ' ='; }) + '</div>';
    if (showKey) {
      html += '<div class="key"><h2>Answer key</h2><div class="grid">' + cells(function (p) { return String(p.answer); }) + '</div></div>';
    }
    return html;
  }

  var api = { OPS: OPS, clean: clean, makeProblems: makeProblems, render: render };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MadMinuteMaker = api;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      var form = document.getElementById('maker');
      var out = document.getElementById('sheet');
      if (!form || !out) return;
      function make() {
        out.innerHTML = render(makeProblems({
          op: form.op.value, min: form.min.value, max: form.max.value, count: form.count.value,
        }), form.key.checked);
      }
      form.addEventListener('submit', function (e) { e.preventDefault(); make(); });
      document.getElementById('print').addEventListener('click', function () { window.print(); });
      make();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
