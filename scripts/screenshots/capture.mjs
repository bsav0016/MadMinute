// Regenerates docs/screenshots/*.png from the Android emulator.
//
//   1. Start an emulator (any AVD) and run the app:  npx expo start --port 8081
//   2. node scripts/screenshots/capture.mjs
//
// It opens the dev server in Expo Go, plays a short round (a mix of correct, wrong and
// skipped answers so the results screen shows all three) and saves four screenshots.
// Buttons on the home, settings and results screens are found by their text in the UI
// hierarchy. During the round uiautomator cannot dump the screen (the timer keeps it
// "busy"), so the question is read from a screenshot with OCR (tesseract.js) and the number
// pad is tapped at positions given as fractions of the screen (measured on a Pixel 8).
// Android demo mode gives a clean status bar (09:00, full battery and signal).
//
// Environment: NIGHT=1 (capture in dark mode), SHOT_DIR (write somewhere other than
// docs/screenshots), ADB (path to adb, default: platform-tools in ANDROID_HOME), ANDROID_SERIAL (device, default: the only one),
// METRO_PORT (default 8081).
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createWorker } from 'tesseract.js';

const OUT = process.env.SHOT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/screenshots');
const PORT = process.env.METRO_PORT || '8081';
const SDK = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const ADB = process.env.ADB || path.join(SDK, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const SERIAL = process.env.ANDROID_SERIAL ? ['-s', process.env.ANDROID_SERIAL] : [];

const adb = (...args) => execFileSync(ADB, [...SERIAL, ...args], { maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shell = (...args) => adb('shell', ...args).toString();

async function nodes() {
  // uiautomator refuses to dump while the screen is animating (the round timer), so retry.
  for (let i = 0; ; i++) {
    try {
      shell('rm', '-f', '/sdcard/ui.xml');
      const out = shell('uiautomator', 'dump', '/sdcard/ui.xml');
      if (/ERROR/.test(out)) throw new Error(out.trim());
      break;
    } catch (e) {
      if (i === 8) throw e;
      await sleep(250);
    }
  }
  const xml = adb('exec-out', 'cat', '/sdcard/ui.xml').toString();
  const out = [];
  for (const m of xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
    const [, text, x1, y1, x2, y2] = m;
    out.push({ text: text.replace(/&amp;/g, '&'), x: (+x1 + +x2) / 2, y: (+y1 + +y2) / 2 });
  }
  return out;
}

async function waitFor(text, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const n = (await nodes()).find((e) => e.text === text || (text instanceof RegExp && text.test(e.text)));
    if (n) return n;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for "${text}"`);
}

async function tap(text) {
  const n = await waitFor(text);
  shell('input', 'tap', String(Math.round(n.x)), String(Math.round(n.y)));
  if (process.env.DEBUG) console.log(`tapped "${n.text}" at ${n.x},${n.y}`);
  await sleep(400);
}

function shot(name) {
  writeFileSync(path.join(OUT, `${name}.png`), adb('exec-out', 'screencap', '-p'));
  console.log(`wrote docs/screenshots/${name}.png`);
}

function demoMode(on) {
  if (on) shell('settings', 'put', 'global', 'sysui_demo_allowed', '1');
  const cmd = (command, ...extra) =>
    shell('am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', command, ...extra);
  if (!on) return void cmd('exit');
  cmd('enter');
  cmd('clock', '-e', 'hhmm', '0900');
  cmd('battery', '-e', 'level', '100', '-e', 'plugged', 'false');
  cmd('network', '-e', 'wifi', 'show', '-e', 'level', '4', '-e', 'fully', 'true');
  cmd('network', '-e', 'mobile', 'show', '-e', 'datatype', 'lte', '-e', 'level', '4', '-e', 'fully', 'true');
  cmd('notifications', '-e', 'visible', 'false');
}

const [SCREEN_W, SCREEN_H] = shell('wm', 'size').match(/(\d+)x(\d+)/).slice(1).map(Number);
const at = (fx, fy) => [Math.round(fx * SCREEN_W), Math.round(fy * SCREEN_H)];
const tapAt = (fx, fy) => shell('input', 'tap', ...at(fx, fy).map(String));
// Number pad (1 2 3 / 4 5 6 / 7 8 9 / Clear 0 delete) and the Skip / Next buttons.
const KEY_X = [0.185, 0.5, 0.813];
const KEY_Y = [0.72, 0.79, 0.86, 0.93];
const DIGIT_KEY = { 1: [0, 0], 2: [1, 0], 3: [2, 0], 4: [0, 1], 5: [1, 1], 6: [2, 1], 7: [0, 2], 8: [1, 2], 9: [2, 2], 0: [1, 3] };
const NEXT = [0.741, 0.645];
const SKIP = [0.259, 0.645];

async function typeNumber(value) {
  for (const digit of String(value)) {
    const [col, row] = DIGIT_KEY[digit];
    tapAt(KEY_X[col], KEY_Y[row]);
    await sleep(150);
  }
}

const ocr = await createWorker('eng', 1, { cachePath: path.join(tmpdir(), 'madminute-tesseract') });
await ocr.setParameters({ tessedit_char_whitelist: '0123456789x×÷+-−', tessedit_pageseg_mode: '6' });

// The question card shows the first number, then the operator and the second number below it.
async function readQuestion() {
  const png = adb('exec-out', 'screencap', '-p');
  const { data } = await ocr.recognize(png, {
    rectangle: { left: SCREEN_W * 0.24, top: SCREEN_H * 0.29, width: SCREEN_W * 0.52, height: SCREEN_H * 0.19 },
  });
  const lines = data.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (process.env.DEBUG) console.log('question OCR:', JSON.stringify(lines));
  if (lines.length < 2) return null;
  const a = Number(lines[0].replace(/\D/g, ''));
  const m = lines[1].match(/^([^0-9]*)\s*(\d+)$/);
  if (!lines[0].match(/^\d+$/) || !m) return null;
  const b = Number(m[2]);
  // OCR often misreads the division sign, and the Times tables preset only has x and division.
  const answer = /x|×/.test(m[1]) ? a * b : b ? a / b : NaN;
  return Number.isInteger(answer) ? answer : null;
}

mkdirSync(OUT, { recursive: true });
if (process.env.NIGHT) shell('cmd', 'uimode', 'night', 'yes');
demoMode(true);
try {
  adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);
  // Expo Go sometimes drops back to the launcher on the first open, so retry a few times.
  for (let attempt = 1; ; attempt++) {
    shell('am', 'force-stop', 'host.exp.exponent');
    await sleep(1000);
    shell('am', 'start', '-a', 'android.intent.action.VIEW', '-d', `exp://localhost:${PORT}`, 'host.exp.exponent');
    try { await waitFor('Start', 90000); break; } catch (e) { if (attempt === 3) throw e; }
  }
  await sleep(1500);
  // Expo Go shows a one-time developer-menu sheet the first time it opens a project.
  if ((await nodes()).some((n) => n.text === 'Continue')) await tap('Continue');
  await sleep(1000);
  shot('home');

  await tap('Start');
  await tap('Times tables');
  await tap('30 sec');
  await sleep(500);
  shot('settings');

  await tap('Start Mad Minute');
  const roundEnds = Date.now() + 30000 + 4000; // 30 second round plus the 3 second countdown
  await sleep(3500);
  // Seven questions: mostly right, one wrong, one skipped, so the results screen shows all
  // three row colours and the whole list fits. The first answer is typed for the question shot.
  const plan = ['correct', 'correct', 'wrong', 'correct', 'skip', 'correct', 'correct'];
  for (let i = 0; i < plan.length && Date.now() < roundEnds - 1500; ) {
    const answer = await readQuestion();
    if (answer === null) { await sleep(300); continue; }   // countdown or unreadable: look again
    if (plan[i] === 'skip') { tapAt(...SKIP); i++; await sleep(500); continue; }
    await typeNumber(plan[i] === 'correct' ? answer : answer + 1);
    if (i === 0) { await sleep(300); shot('question'); }
    tapAt(...NEXT);
    i++;
    await sleep(500);
  }
  // The last question is left unanswered; the round ends on its own timer.
  await sleep(Math.max(0, roundEnds - Date.now()));

  await waitFor('Results', 60000);
  await sleep(800);
  shot('results');
} finally {
  await ocr.terminate();
  demoMode(false);
  if (process.env.NIGHT) shell('cmd', 'uimode', 'night', 'no');
}
