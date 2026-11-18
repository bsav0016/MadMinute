const fs = require("fs");
const path = require("path");

const { buildAll } = require("../scripts/build-worksheets");
const { TABLES, TIPS } = require("../scripts/resources");
const maker = require("../docs/maker.js");

const pages = buildAll();
const page = (file) => pages.find((p) => p.file === file);

describe("times table pages", () => {
  test("there is a page for every table from 2 to 12, with a tip", () => {
    expect(TABLES).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const n of TABLES) {
      expect(TIPS[n].length).toBeGreaterThan(10);
      expect(page(`resources/times-table-${n}.html`)).toBeDefined();
    }
  });

  test("every fact and every answer on a table page is right", () => {
    for (const n of TABLES) {
      const html = page(`resources/times-table-${n}.html`).html;
      for (let k = 1; k <= 12; k++) expect(html).toContain(`${n} &times; ${k} = <strong>${n * k}</strong>`);
      const practice = html.slice(html.indexOf("Practice sheet"), html.indexOf('<div class="key">'));
      const key = html.slice(html.indexOf('<div class="key">'));
      const questions = [...practice.matchAll(/<small>\d+\.<\/small>([^<]*)</g)].map((m) => m[1]);
      const answers = [...key.matchAll(/<small>\d+\.<\/small>([^<]*)</g)].map((m) => Number(m[1]));
      expect(questions).toHaveLength(24);
      expect(answers).toHaveLength(24);
      questions.forEach((q, i) => {
        const [a, op, b] = q.replace("&times;", "x").replace("&divide;", "/").replace(" =", "").split(" ");
        const value = op === "x" ? Number(a) * Number(b) : Number(a) / Number(b);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBe(answers[i]);
        expect([a, b].map(Number)).toContain(n);
      });
    }
  });

  test("the multiplication chart has 144 correct cells", () => {
    const html = page("resources/multiplication-chart.html").html;
    const body = html.slice(html.indexOf("<tbody>"));
    const rows = [...body.matchAll(/<tr><th scope="row">(\d+)<\/th>(.*?)<\/tr>/g)];
    expect(rows).toHaveLength(12);
    rows.forEach((row, r) => {
      const cells = [...row[2].matchAll(/<td[^>]*>(\d+)<\/td>/g)].map((m) => Number(m[1]));
      expect(cells).toEqual(Array.from({ length: 12 }, (_, c) => (r + 1) * (c + 1)));
    });
  });
});

describe("the worksheet maker", () => {
  const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  test("follows the app's rules for every operation and range", () => {
    for (const op of ["add", "sub", "mul", "div", "mix"]) {
      for (const [min, max] of [[0, 10], [0, 20], [1, 12], [3, 3], [0, 0], [50, 100]]) {
        const list = maker.makeProblems({ op, min, max, count: 100 }, seeded(7));
        expect(list).toHaveLength(100);
        for (const p of list) {
          const value = { add: p.a + p.b, sub: p.a - p.b, mul: p.a * p.b, div: p.a / p.b }[p.op];
          expect(value).toBe(p.answer);
          expect(Number.isInteger(p.answer)).toBe(true);
          expect(p.answer).toBeGreaterThanOrEqual(0);
          if (p.op === "div") expect(p.b).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  test("clamps anything a person types", () => {
    expect(maker.clean({ op: "x", min: "abc", max: -5, count: 9999 })).toEqual({ op: "add", min: 0, max: 0, count: 100 });
    expect(maker.clean({ op: "div", min: 12, max: 1, count: 3 })).toEqual({ op: "div", min: 1, max: 12, count: 10 });
    expect(maker.clean({ op: "div", min: 0, max: 0, count: 50 }).max).toBe(1);
  });

  test("renders only numbers and fixed text, with an optional key", () => {
    const list = maker.makeProblems({ op: "mix", min: 0, max: 12, count: 20 }, seeded(3));
    const html = maker.render(list, true);
    expect(html).toContain("Answer key");
    expect(maker.render(list, false)).not.toContain("Answer key");
    expect(html).not.toMatch(/<script|onerror/i);
  });

  test("the maker page loads the script and a form the script expects", () => {
    const html = page("resources/worksheet-maker.html").html;
    expect(html).toContain('<script src="../maker.js"></script>');
    for (const id of ['id="maker"', 'id="sheet"', 'id="print"', 'name="op"', 'name="min"', 'name="max"', 'name="count"', 'name="key"']) {
      expect(html).toContain(id);
    }
  });
});

describe("the site", () => {
  test("every page is in the sitemap and the navigation reaches the resources", () => {
    const sitemap = page("sitemap.xml").html;
    for (const { file } of pages.filter((p) => p.file.endsWith(".html") && p.file !== "index.html")) {
      expect(sitemap).toContain(`${file}</loc>`);
    }
    expect(page("index.html").html).toContain("resources/index.html");
    expect(page("worksheets/addition-0-10-1.html").html).toContain('href="../resources/index.html"');
  });

  test("every internal link on every page points at a page that exists", () => {
    const files = new Set(pages.map((p) => p.file));
    files.add("maker.js");
    files.add("privacy.html");
    for (const { file, html } of pages.filter((p) => p.file.endsWith(".html"))) {
      const dir = path.posix.dirname(file);
      for (const [, href] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
        if (/^(https?:|mailto:|diagonalduel:)/.test(href)) continue;
        expect({ file, href, ok: files.has(path.posix.normalize(path.posix.join(dir, href))) }).toEqual({ file, href, ok: true });
      }
    }
  });

  test("the committed maker script is the one the pages load", () => {
    expect(fs.existsSync(path.join(__dirname, "..", "docs", "maker.js"))).toBe(true);
  });
});
