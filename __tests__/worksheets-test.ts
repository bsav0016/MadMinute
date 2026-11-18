import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SHEETS, VERSIONS, PROBLEMS, problemsFor, buildAll } = require("../scripts/build-worksheets");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { appStoreLink, playStoreLink } = require("../scripts/growthLinks");

type Problem = { a: number; b: number; op: "add" | "sub" | "mul" | "div"; answer: number };
type Sheet = { key: string; op: string; min: number; max: number };

const evaluate = ({ a, b, op }: Problem) => ({ add: a + b, sub: a - b, mul: a * b, div: a / b })[op];

describe("worksheet problems follow the app's rules", () => {
  for (const sheet of SHEETS as Sheet[]) {
    test(`${sheet.key}: ${PROBLEMS} correct problems in range, same every time`, () => {
      for (let version = 1; version <= VERSIONS; version++) {
        const list: Problem[] = problemsFor(sheet, version);
        expect(list).toHaveLength(PROBLEMS);
        expect(problemsFor(sheet, version)).toEqual(list);
        for (const p of list) {
          expect(evaluate(p)).toBe(p.answer);
          expect(Number.isInteger(p.answer)).toBe(true);
          expect(p.answer).toBeGreaterThanOrEqual(0);
          if (p.op === "div") {
            expect(p.b).toBeGreaterThanOrEqual(1);
            expect(p.b).toBeLessThanOrEqual(sheet.max);
            expect(p.answer).toBeLessThanOrEqual(sheet.max);
          } else {
            expect(p.a).toBeGreaterThanOrEqual(sheet.min);
            expect(p.a).toBeLessThanOrEqual(sheet.max);
            expect(p.b).toBeGreaterThanOrEqual(sheet.min);
            expect(p.b).toBeLessThanOrEqual(sheet.max);
          }
        }
      }
    });
  }

  test("the versions of a sheet differ from each other", () => {
    const first = JSON.stringify(problemsFor(SHEETS[1], 1));
    expect(JSON.stringify(problemsFor(SHEETS[1], 2))).not.toBe(first);
  });

  test("a wide sheet has no repeated problem", () => {
    const list: Problem[] = problemsFor(SHEETS.find((s: Sheet) => s.key === "multiplication-1-12"), 1);
    expect(new Set(list.map((p) => `${p.a}${p.op}${p.b}`)).size).toBe(PROBLEMS);
  });

  test("mixed sheets use every operation", () => {
    const ops = new Set((problemsFor(SHEETS.find((s: Sheet) => s.op === "mix"), 1) as Problem[]).map((p) => p.op));
    expect([...ops].sort()).toEqual(["add", "div", "mul", "sub"]);
  });
});

describe("the published pages", () => {
  const pages: { file: string; html: string }[] = buildAll();

  test("the committed pages are exactly what the generator produces", () => {
    for (const { file, html } of pages) {
      const committed = fs.readFileSync(path.join(__dirname, "..", "docs", file), "utf8").replace(/\r\n/g, "\n");
      expect({ file, same: committed === html }).toEqual({ file, same: true });
    }
  });

  test("every sheet has all its versions, plus the home page, index and sitemap", () => {
    expect(pages).toHaveLength(SHEETS.length * VERSIONS + 3);
  });

  test("each page links to the App Store with its own campaign and has a canonical link", () => {
    for (const { file, html } of pages.filter((p) => p.file.endsWith(".html"))) {
      expect(html).toContain('rel="canonical"');
      expect(html).toMatch(/apps\.apple\.com[^"]*ct=web-/);
      expect(file).toBeTruthy();
    }
  });

  test("each worksheet carries an answer key with one answer per problem", () => {
    const html = pages.find((p) => p.file === "worksheets/addition-0-20-1.html")!.html;
    const key = html.slice(html.indexOf('<div class="key">'));
    expect((key.match(/<small>\d+\.<\/small>/g) || []).length).toBe(PROBLEMS);
  });
});

describe("tagged links", () => {
  test("campaign names are checked", () => {
    expect(appStoreLink("web-test")).toContain("ct=web-test");
    expect(() => appStoreLink("Bad Name")).toThrow();
    expect(() => appStoreLink("a".repeat(41))).toThrow();
  });

  test("there is no Play link until there is a Play listing", () => {
    expect(playStoreLink("web-test")).toBeNull();
  });
});
