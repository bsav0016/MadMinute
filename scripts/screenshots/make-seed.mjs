// Writes storage/seed.local.json: a made-up player's history, per-problem record and settings, for the History and
// focus-mode screenshots. The app does not read it by itself; see "Regenerating the screenshots" in the README.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storage/seed.local.json');
const envelope = (data) => JSON.stringify({ v: 1, data });

// A repeatable pseudo-random source, so the same image comes out every time.
let state = 12345;
const random = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

// Multiplication facts, 1 to 12. The 6s to 9s are the player's trouble: more misses and slower answers.
const facts = {};
for (let a = 1; a <= 12; a++) {
  for (let b = a; b <= 12; b++) {
    const hard = (n) => n >= 6 && n <= 9;
    const difficulty = (hard(a) ? 1 : 0) + (hard(b) ? 1 : 0) + (a >= 7 && b >= 7 ? 1 : 0);
    const attempts = 2 + Math.floor(random() * 6) + (difficulty > 1 ? 3 : 0);
    const accuracy = [0.98, 0.9, 0.72, 0.5][Math.min(difficulty, 3)];
    const correct = Math.min(attempts, Math.round(attempts * (accuracy + (random() - 0.5) * 0.1)));
    const typical = 1800 + difficulty * 1700;
    facts[`x:${a}:${b}`] = {
      attempts, correct, timedCorrect: correct, correctMs: Math.round(correct * typical * (0.85 + random() * 0.3)), lastSeen: now - Math.floor(random() * 20) * DAY,
    };
  }
}
// A few division and subtraction facts that the player also finds hard.
facts['÷:56:7'] = { attempts: 5, correct: 2, timedCorrect: 2, correctMs: 2 * 6200, lastSeen: now - 2 * DAY };
facts['-:15:8'] = { attempts: 4, correct: 2, timedCorrect: 2, correctMs: 2 * 5100, lastSeen: now - 3 * DAY };

// Twelve finished rounds over the last three weeks, improving a little.
const tally = (correct, incorrect, skipped) => ({ correct, incorrect, skipped });
const history = [];
for (let i = 0; i < 12; i++) {
  const times = i % 3 !== 2;
  const correct = 11 + Math.round(i * 0.9 + random() * 3);
  const incorrect = 2 + Math.floor(random() * 3);
  const skipped = Math.floor(random() * 2);
  const operators = times ? ['x', '÷'] : ['+', '-', 'x', '÷'];
  const split = operators.map((_, k) => Math.floor(correct / operators.length) + (k < correct % operators.length ? 1 : 0));
  history.unshift({
    id: `seed-${i}`,
    playedAt: now - (i * 1.7 + 0.2) * DAY,
    operators, minValue: times ? 1 : 0, maxValue: times ? 12 : 20, durationSeconds: 60,
    correct, incorrect, skipped,
    byOperator: Object.fromEntries(operators.map((op, k) => [op, tally(split[k], k === 0 ? incorrect : 0, k === 1 ? skipped : 0)])),
  });
}
history.reverse(); // newest first, as the app keeps it
history.sort((x, y) => y.playedAt - x.playedAt);

const settings = { minValue: 1, maxValue: 12, availableOperators: ['x', '÷'], durationSeconds: 30, focusOnWeakSpots: true };

writeFileSync(out, JSON.stringify({
  'madminute.facts': envelope(facts),
  'madminute.history': envelope(history),
  'madminute.settings': envelope(settings),
}));
console.log(`wrote ${path.relative(process.cwd(), out)}: ${Object.keys(facts).length} facts, ${history.length} rounds`);
