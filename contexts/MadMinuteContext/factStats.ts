import { MadMinuteOperator } from "./MadMinuteOperator";
import { MadMinuteQuestion } from "./MadMinuteQuestion";

// A "fact" is one problem such as 7 x 8. Adding and multiplying are the same fact whichever way round the numbers
// come (3 + 4 and 4 + 3), while subtraction and division keep their order. The player's record of each fact lives
// here, on the device only. These are pure functions: nothing here reads a clock or storage.

export interface FactStat {
    attempts: number;     // times the fact was asked and answered or skipped (a skip counts as a miss)
    correct: number;      // of those, answered correctly
    timedCorrect: number; // correct answers that also have a response time
    correctMs: number;    // the total of those times; speed is judged on correct answers only
    lastSeen: number;     // ms since 1970 of the round it was last in
}

export type FactStats = Record<string, FactStat>;

// Counts are halved when a fact's attempts pass this, so recent play outweighs old play. It counts attempts and not
// days on purpose: a player who takes a break keeps their weak spots, and a fact asked often forgets faster.
export const DECAY_CAP = 20;

// Prior for accuracy: a fact starts out as if answered 2 times at 75%, so one miss does not make it a trouble spot.
const PRIOR_ATTEMPTS = 2;
const PRIOR_CORRECT = 1.5;

// How much a fact's slowness and its inaccuracy count towards its weakness.
const ACCURACY_WEIGHT = 0.7;
const SPEED_WEIGHT = 0.3;
// A correct answer this many times slower than the player's average counts as fully slow.
const FULLY_SLOW_RATIO = 2;
// Slowness is trusted fully only with this many timed answers.
const SPEED_SAMPLES = 3;

// A fact needs at least this much weakness to be called a trouble spot, and at least this many attempts to be judged.
export const TROUBLE_THRESHOLD = 0.15;
export const MIN_ATTEMPTS_TO_JUDGE = 2;
// Focus mode is offered once this many attempts are on record (counts after decay, so it is a rough gate).
export const ENOUGH_ATTEMPTS = 50;

const OPERATORS = Object.values(MadMinuteOperator) as string[];
const isCommutative = (operator: MadMinuteOperator) =>
    operator === MadMinuteOperator.Addition || operator === MadMinuteOperator.Multiplication;

export function factKey(operator: MadMinuteOperator, value1: number, value2: number): string {
    const [a, b] = isCommutative(operator) && value1 > value2 ? [value2, value1] : [value1, value2];
    return `${operator}:${a}:${b}`;
}

export function factKeyOf(question: MadMinuteQuestion): string {
    return factKey(question.operator, question.value1, question.value2);
}

export interface ParsedFact {
    operator: MadMinuteOperator;
    value1: number;
    value2: number;
}

/** The fact a key stands for, or null if it is not a key `factKey` would make. */
export function parseFactKey(key: string): ParsedFact | null {
    const parts = key.split(":");
    if (parts.length !== 3 || !OPERATORS.includes(parts[0])) return null;
    const value1 = Number(parts[1]);
    const value2 = Number(parts[2]);
    if (!Number.isInteger(value1) || !Number.isInteger(value2) || value1 < 0 || value2 < 0) return null;
    const operator = parts[0] as MadMinuteOperator;
    return factKey(operator, value1, value2) === key ? { operator, value1, value2 } : null;
}

const EMPTY: FactStat = { attempts: 0, correct: 0, timedCorrect: 0, correctMs: 0, lastSeen: 0 };

function decayed(stat: FactStat): FactStat {
    if (stat.attempts <= DECAY_CAP) return stat;
    return {
        attempts: stat.attempts / 2,
        correct: stat.correct / 2,
        timedCorrect: stat.timedCorrect / 2,
        correctMs: stat.correctMs / 2,
        lastSeen: stat.lastSeen,
    };
}

/** The stats after one finished round. Like the round record, it leaves out the last question, which was on screen
 *  when time ran out and never attempted. Returns a new object; `stats` is not changed. */
export function applyRound(stats: FactStats, questions: MadMinuteQuestion[], playedAt: number): FactStats {
    const next: FactStats = { ...stats };
    for (let i = 0; i < questions.length - 1; i++) {
        const question = questions[i];
        const key = factKeyOf(question);
        const before = next[key] ?? EMPTY;
        const right = !!question.response && String(question.answer) === question.response;
        const ms = right ? question.responseMs() : null;
        next[key] = decayed({
            attempts: before.attempts + 1,
            correct: before.correct + (right ? 1 : 0),
            timedCorrect: before.timedCorrect + (ms === null ? 0 : 1),
            correctMs: before.correctMs + (ms ?? 0),
            lastSeen: playedAt,
        });
    }
    return next;
}

/** The player's average time for a correct answer across every fact, or null with no timed answers yet. */
export function overallAverageMs(stats: FactStats): number | null {
    let ms = 0;
    let count = 0;
    for (const stat of Object.values(stats)) {
        ms += stat.correctMs;
        count += stat.timedCorrect;
    }
    return count > 0 ? ms / count : null;
}

/** Accuracy smoothed with the prior, 0 to 1. */
export function smoothedAccuracy(stat: FactStat): number {
    return (stat.correct + PRIOR_CORRECT) / (stat.attempts + PRIOR_ATTEMPTS);
}

/** How much work a fact needs, 0 (solid and quick) to 1 (always missed, or very slow). Slow answers count even when
 *  correct, judged against the player's own average, so it suits any age and skill. */
export function weakness(stat: FactStat, averageMs: number | null): number {
    const inaccuracy = 1 - smoothedAccuracy(stat);
    let slowness = 0;
    if (averageMs !== null && averageMs > 0 && stat.timedCorrect > 0) {
        const ratio = stat.correctMs / stat.timedCorrect / averageMs;
        const raw = Math.min(Math.max((ratio - 1) / (FULLY_SLOW_RATIO - 1), 0), 1);
        slowness = raw * Math.min(stat.timedCorrect / SPEED_SAMPLES, 1);
    }
    return ACCURACY_WEIGHT * inaccuracy + SPEED_WEIGHT * slowness;
}

export interface TroubleSpot {
    key: string;
    fact: ParsedFact;
    attempts: number;
    accuracy: number;       // plain correct / attempts, 0 to 1
    averageMs: number | null; // of correct answers
    weakness: number;
}

/** The facts that most need work, worst first. Only facts asked enough times, and weak enough, are listed. */
export function weakestFacts(stats: FactStats, limit: number): TroubleSpot[] {
    const average = overallAverageMs(stats);
    const spots: TroubleSpot[] = [];
    for (const [key, stat] of Object.entries(stats)) {
        const fact = parseFactKey(key);
        if (!fact || stat.attempts < MIN_ATTEMPTS_TO_JUDGE) continue;
        const score = weakness(stat, average);
        if (score < TROUBLE_THRESHOLD) continue;
        spots.push({
            key,
            fact,
            attempts: stat.attempts,
            accuracy: stat.correct / stat.attempts,
            averageMs: stat.timedCorrect > 0 ? stat.correctMs / stat.timedCorrect : null,
            weakness: score,
        });
    }
    spots.sort((a, b) => b.weakness - a.weakness || b.attempts - a.attempts || a.key.localeCompare(b.key));
    return spots.slice(0, limit);
}

export function totalAttempts(stats: FactStats): number {
    return Object.values(stats).reduce((sum, stat) => sum + stat.attempts, 0);
}

/** Whether there is enough on record for focus mode to mean anything. */
export function hasEnoughData(stats: FactStats): boolean {
    return totalAttempts(stats) >= ENOUGH_ATTEMPTS;
}

// Far more than the 4 operators x 21 x 21 facts the largest range can make, so only corrupt data reaches it.
const MAX_FACTS = 5000;

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Validates stored data. Entries that are not a real fact with sensible numbers are dropped, and the rest are kept.
 *  Returns null only when the data is not an object at all. */
export function parseFacts(data: unknown): FactStats | null {
    if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
    const result: FactStats = {};
    for (const [key, raw] of Object.entries(data as Record<string, unknown>).slice(0, MAX_FACTS)) {
        if (parseFactKey(key) === null || raw === null || typeof raw !== "object") continue;
        const { attempts, correct, timedCorrect, correctMs, lastSeen } = raw as Record<string, unknown>;
        if (!isCount(attempts) || !isCount(correct) || !isCount(timedCorrect) || !isCount(correctMs) || !isCount(lastSeen)) continue;
        if (correct > attempts || timedCorrect > correct) continue;
        result[key] = { attempts, correct, timedCorrect, correctMs, lastSeen };
    }
    return result;
}
