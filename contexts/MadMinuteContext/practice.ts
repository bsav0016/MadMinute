import { MadMinuteOperator } from "./MadMinuteOperator";
import { MadMinuteSettings } from "./MadMinuteSettings";
import {
    factKey, FactStat, FactStats, MIN_ATTEMPTS_TO_JUDGE, overallAverageMs, TROUBLE_THRESHOLD, weakness,
} from "./factStats";

// The practice path: a gentle daily goal, a streak with a built-in rest day, and a level for each times table. Like
// factStats.ts these are pure functions. Nothing here reads a clock or storage; the day and the facts are passed in.

// ---------------------------------------------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------------------------------------------

/** The day on the device's own calendar as "2026-11-23". Days are the player's local days, so a round at 11 pm and one
 *  at 7 am the next morning are different days whatever the time zone. */
export function dayString(ms: number): string {
    const date = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Days since 1970 for a day string, or null if it is not a real date. Counted in UTC, so daylight saving cannot make
 *  a day 23 or 25 hours long. */
export function dayNumber(day: string): number | null {
    const match = DAY_PATTERN.exec(day);
    if (!match) return null;
    const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const ms = Date.UTC(year, month - 1, date);
    const check = new Date(ms);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== date) return null;
    return Math.round(ms / MS_PER_DAY);
}

/** The Monday of the week a day number falls in, as a day number. Used to give each week one rest day. */
function weekStart(dayNum: number): number {
    // Day 0 (1 January 1970) was a Thursday, so Monday is 4 days before it.
    return dayNum - ((dayNum + 3) % 7);
}

// ---------------------------------------------------------------------------------------------------------------
// Goal and streak
// ---------------------------------------------------------------------------------------------------------------

export const GOAL_OPTIONS = [1, 2, 3] as const;
export type Goal = (typeof GOAL_OPTIONS)[number];
export const DEFAULT_GOAL: Goal = 1;

export interface PracticeRecord {
    goal: Goal;                 // rounds to play a day
    streak: {
        current: number;        // days in a row, counting a rest day as a day kept
        longest: number;
        lastDay: string | null; // the last day a round was finished
    };
    today: { day: string; rounds: number } | null; // rounds finished on the latest day
    restWeek: number | null;    // the week (as the day number of its Monday) whose rest day has been used
}

export function emptyPractice(): PracticeRecord {
    return { goal: DEFAULT_GOAL, streak: { current: 0, longest: 0, lastDay: null }, today: null, restWeek: null };
}

/** How the streak moves between the last day played and a new one: the days in between and whether a rest day covers them. */
function gapOutcome(lastNum: number, dayNum: number, restWeek: number | null): "same" | "next" | "rest" | "broken" {
    const gap = dayNum - lastNum;
    if (gap <= 0) return "same";
    if (gap === 1) return "next";
    // One missed day is covered if that day's week has not used its rest day yet.
    if (gap === 2 && restWeek !== weekStart(lastNum + 1)) return "rest";
    return "broken";
}

/** How far ahead of the clock the last day can be before it is treated as a clock set wrongly, not as a clock moved back. */
export const MAX_CLOCK_SKEW_DAYS = 7;

/** The record after a round finished at `playedAt`. Returns a new object. A clock set back does not take anything
 *  away: a day before the last one counts as the last one. */
export function recordPracticeRound(record: PracticeRecord, playedAt: number): PracticeRecord {
    const today = dayString(playedAt);
    const todayNum = dayNumber(today);
    if (todayNum === null) return record;

    const lastDay = record.streak.lastDay;
    const lastNum = lastDay === null ? null : dayNumber(lastDay);
    // Never go back in time: a round "before" the last day is counted on the last day. A last day more than a week
    // ahead can only come from a clock that was set far forward, and holding to it would freeze the streak for good.
    const clamped = lastNum !== null && lastNum > todayNum && lastNum - todayNum <= MAX_CLOCK_SKEW_DAYS;
    const effectiveNum = clamped ? lastNum! : todayNum;
    const effectiveDay = clamped ? lastDay! : today;
    const restartedByClock = lastNum !== null && lastNum - todayNum > MAX_CLOCK_SKEW_DAYS;

    let current: number;
    let restWeek = record.restWeek;
    if (lastNum === null || restartedByClock) {
        current = 1;
    } else {
        switch (gapOutcome(lastNum, effectiveNum, record.restWeek)) {
            case "same":
                current = Math.max(record.streak.current, 1);
                break;
            case "next":
                current = record.streak.current + 1;
                break;
            case "rest":
                current = record.streak.current + 1;
                restWeek = weekStart(lastNum + 1);
                break;
            default:
                current = 1;
        }
    }

    const sameDay = record.today !== null && record.today.day === effectiveDay;
    return {
        goal: record.goal,
        streak: { current, longest: Math.max(record.streak.longest, current), lastDay: effectiveDay },
        today: { day: effectiveDay, rounds: sameDay ? record.today!.rounds + 1 : 1 },
        restWeek,
    };
}

export type StreakState = "none" | "kept" | "resting" | "ready";

export interface StreakView {
    days: number;       // the streak to show
    state: StreakState; // kept: played today; ready: played yesterday, today keeps it going; resting: a rest day is covering a missed day; none: no streak
}

/** The streak as it should look right now. It is read, not changed: a streak that has run out shows as none (quietly,
 *  with no message), and is only reset in the record when the next round is finished. */
export function streakView(record: PracticeRecord, now: number): StreakView {
    const { lastDay, current } = record.streak;
    const lastNum = lastDay === null ? null : dayNumber(lastDay);
    const todayNum = dayNumber(dayString(now));
    if (lastNum === null || todayNum === null || current <= 0) return { days: 0, state: "none" };
    const gap = todayNum - lastNum;
    if (gap <= 0) return { days: current, state: "kept" };
    if (gap === 1) return { days: current, state: "ready" };
    // Two days on, yesterday is the missed day. A rest day covers it, and playing today keeps the streak.
    if (gap === 2 && record.restWeek !== weekStart(lastNum + 1)) return { days: current, state: "resting" };
    return { days: 0, state: "none" };
}

export interface GoalProgress {
    done: number;
    goal: Goal;
    met: boolean;
}

/** Rounds finished today against the goal. */
export function goalProgress(record: PracticeRecord, now: number): GoalProgress {
    const done = record.today !== null && record.today.day === dayString(now) ? record.today.rounds : 0;
    return { done, goal: record.goal, met: done >= record.goal };
}

/** The goal after this one when the player taps to change it: 1, 2, 3, then 1 again. */
export function nextGoal(goal: Goal): Goal {
    return GOAL_OPTIONS[(GOAL_OPTIONS.indexOf(goal) + 1) % GOAL_OPTIONS.length];
}

export function withGoal(record: PracticeRecord, goal: Goal): PracticeRecord {
    return { ...record, goal };
}

const MAX_STREAK = 100_000;
const isGoal = (value: unknown): value is Goal => GOAL_OPTIONS.some(option => option === value);
const isDays = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_STREAK;

/** Validates stored data, or returns null if it is not a practice record. Parts that cannot be trusted are reset
 *  rather than failing the whole record. */
export function parsePractice(data: unknown): PracticeRecord | null {
    if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
    const { goal, streak, today, restWeek } = data as Record<string, unknown>;
    const record = emptyPractice();
    if (isGoal(goal)) record.goal = goal;

    if (streak !== null && typeof streak === "object") {
        const { current, longest, lastDay } = streak as Record<string, unknown>;
        if (isDays(current) && isDays(longest) && current <= longest && typeof lastDay === "string" && dayNumber(lastDay) !== null) {
            record.streak = { current, longest, lastDay };
        } else if (isDays(longest)) {
            record.streak = { current: 0, longest, lastDay: null };
        }
    }
    if (today !== null && typeof today === "object") {
        const { day, rounds } = today as Record<string, unknown>;
        if (typeof day === "string" && dayNumber(day) !== null && isDays(rounds) && rounds > 0) record.today = { day, rounds };
    }
    if (typeof restWeek === "number" && Number.isInteger(restWeek) && restWeek >= 0 && restWeek < 1_000_000) {
        record.restWeek = restWeek;
    }
    return record;
}

// ---------------------------------------------------------------------------------------------------------------
// Times-table levels
// ---------------------------------------------------------------------------------------------------------------

export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
/** Each table is judged on its facts from 1 times the table to 12 times it. */
export const TABLE_FACTS = 12;

export type TableLevel = "new" | "learning" | "known" | "mastered";

/** A table is known when this share of its facts are solid (asked enough and not a trouble spot). */
export const KNOWN_SHARE = 0.75;
/** A table is mastered when every fact has been asked this often and is this strong. */
export const MASTERED_ATTEMPTS = 3;
export const MASTERED_WEAKNESS = 0.1;

export interface TableStatus {
    table: number;
    level: TableLevel;
    solid: number;   // facts asked enough and not trouble spots
    started: number; // facts asked at all
}

export const LEVEL_ORDER: TableLevel[] = ["new", "learning", "known", "mastered"];

/** The facts of a table in the order the stats store them (multiplication is the same either way round). */
function tableKeys(table: number): string[] {
    const keys: string[] = [];
    for (let n = 1; n <= TABLE_FACTS; n++) keys.push(factKey(MadMinuteOperator.Multiplication, table, n));
    return keys;
}

export function tableStatus(facts: FactStats, table: number, averageMs: number | null = overallAverageMs(facts)): TableStatus {
    let solid = 0;
    let started = 0;
    let allMastered = true;
    for (const key of tableKeys(table)) {
        const stat: FactStat | undefined = facts[key];
        if (!stat || stat.attempts <= 0) {
            allMastered = false;
            continue;
        }
        started++;
        const score = weakness(stat, averageMs);
        if (stat.attempts >= MIN_ATTEMPTS_TO_JUDGE && score < TROUBLE_THRESHOLD) solid++;
        if (stat.attempts < MASTERED_ATTEMPTS || score >= MASTERED_WEAKNESS) allMastered = false;
    }
    let level: TableLevel;
    if (started === 0) level = "new";
    else if (allMastered) level = "mastered";
    else if (solid >= Math.ceil(TABLE_FACTS * KNOWN_SHARE)) level = "known";
    else level = "learning";
    return { table, level, solid, started };
}

/** The level of every table from 2 to 12. */
export function allTableStatuses(facts: FactStats): TableStatus[] {
    const average = overallAverageMs(facts);
    return TABLES.map(table => tableStatus(facts, table, average));
}

export function tableMastery(facts: FactStats, table: number): TableLevel {
    return tableStatus(facts, table).level;
}

/** Tables whose level went up between two records of the facts, for "You know your 7s now". Only a rise counts. */
export function levelUps(before: FactStats, after: FactStats): TableStatus[] {
    const was = allTableStatuses(before);
    return allTableStatuses(after).filter((status, i) =>
        LEVEL_ORDER.indexOf(status.level) > LEVEL_ORDER.indexOf(was[i].level));
}

// ---------------------------------------------------------------------------------------------------------------
// Today's practice
// ---------------------------------------------------------------------------------------------------------------

/** The order new tables are offered in: the easy ones first, the way they are usually taught. */
export const TABLE_ORDER = [2, 5, 10, 3, 4, 6, 9, 7, 8, 11, 12] as const;

export interface PracticeSetup {
    minValue: number;
    maxValue: number;
    availableOperators: MadMinuteOperator[];
    durationSeconds: number;
    // The times table to work on, or null for the player's usual mix.
    table: number | null;
}

/** The table to work on next: one already started and not yet known (the most solid first, so a nearly-known table is
 *  finished), otherwise the next new table in teaching order, otherwise none. */
export function nextTable(facts: FactStats): number | null {
    const statuses = allTableStatuses(facts);
    const learning = statuses
        .filter(s => s.level === "learning")
        .sort((a, b) => b.solid - a.solid || b.started - a.started || a.table - b.table);
    if (learning.length > 0) return learning[0].table;
    const fresh = TABLE_ORDER.find(table => statuses.find(s => s.table === table)?.level === "new");
    return fresh ?? null;
}

/** A setup for one tap. It starts from what the player last chose, and only adds a table to work on when they are
 *  already playing with multiplication, so the suggestion is never a surprise. */
export function nextPractice(facts: FactStats, settings: MadMinuteSettings): PracticeSetup {
    const base: PracticeSetup = {
        minValue: settings.minValue,
        maxValue: settings.maxValue,
        availableOperators: [...settings.availableOperators],
        durationSeconds: settings.durationSeconds,
        table: null,
    };
    if (!settings.availableOperators.includes(MadMinuteOperator.Multiplication)) return base;
    const table = nextTable(facts);
    if (table === null) return base;
    return {
        // The table's facts run from 1 to 12 times it, so the range has to cover them.
        minValue: 1,
        maxValue: 12,
        availableOperators: [MadMinuteOperator.Multiplication],
        durationSeconds: settings.durationSeconds,
        table,
    };
}
