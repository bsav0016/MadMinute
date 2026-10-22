import { MadMinuteOperator } from "./MadMinuteOperator";
import { MadMinuteQuestion } from "./MadMinuteQuestion";
import { MadMinuteSettings } from "./MadMinuteSettings";
import { DURATION_OPTIONS_SECONDS } from "./presets";

// Only finished rounds are kept, and only the newest ones.
export const HISTORY_CAP = 200;

const OPERATORS = Object.values(MadMinuteOperator) as string[];

export interface OperatorTally {
    correct: number;
    incorrect: number;
    skipped: number;
}

// A small summary of one finished round. The questions themselves are not kept.
export interface RoundRecord {
    id: string;
    playedAt: number; // ms since 1970
    operators: MadMinuteOperator[]; // in the fixed order of the enum, so the same setup always looks the same
    minValue: number;
    maxValue: number;
    durationSeconds: number;
    correct: number;
    incorrect: number;
    skipped: number;
    byOperator: Partial<Record<MadMinuteOperator, OperatorTally>>;
}

// Orders operators the same way every time, so records of the same setup can be compared.
export function sortOperators(operators: MadMinuteOperator[]): MadMinuteOperator[] {
    const order = Object.values(MadMinuteOperator);
    return order.filter(op => operators.includes(op));
}

// Builds the record for a finished round. Like the results screen, it ignores the last question, which was on screen
// when time ran out and never attempted. Returns null when nothing was attempted, since that is not worth keeping.
export function buildRoundRecord(
    settings: MadMinuteSettings,
    questions: MadMinuteQuestion[],
    id: string,
    playedAt: number
): RoundRecord | null {
    const byOperator: Partial<Record<MadMinuteOperator, OperatorTally>> = {};
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    for (let i = 0; i < questions.length - 1; i++) {
        const question = questions[i];
        const tally = byOperator[question.operator] ?? (byOperator[question.operator] = { correct: 0, incorrect: 0, skipped: 0 });
        if (!question.response) {
            skipped += 1;
            tally.skipped += 1;
        } else if (String(question.answer) === question.response) {
            correct += 1;
            tally.correct += 1;
        } else {
            incorrect += 1;
            tally.incorrect += 1;
        }
    }

    if (correct + incorrect + skipped === 0) return null;

    return {
        id,
        playedAt,
        operators: sortOperators(settings.availableOperators),
        minValue: settings.minValue,
        maxValue: settings.maxValue,
        durationSeconds: settings.durationSeconds,
        correct,
        incorrect,
        skipped,
        byOperator,
    };
}

// Adds a record to the history (newest first), without duplicating an id and keeping only the newest HISTORY_CAP.
export function addRecord(history: RoundRecord[], record: RoundRecord): RoundRecord[] {
    return [record, ...history.filter(existing => existing.id !== record.id)].slice(0, HISTORY_CAP);
}

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

function parseTally(data: unknown): OperatorTally | null {
    if (data === null || typeof data !== "object") return null;
    const { correct, incorrect, skipped } = data as Record<string, unknown>;
    if (!isCount(correct) || !isCount(incorrect) || !isCount(skipped)) return null;
    return { correct, incorrect, skipped };
}

function parseRecord(data: unknown): RoundRecord | null {
    if (data === null || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;

    if (typeof d.id !== "string" || d.id === "") return null;
    if (typeof d.playedAt !== "number" || !Number.isFinite(d.playedAt)) return null;
    if (!Number.isInteger(d.minValue) || !Number.isInteger(d.maxValue)) return null;
    if (typeof d.durationSeconds !== "number" || !DURATION_OPTIONS_SECONDS.includes(d.durationSeconds)) return null;
    if (!isCount(d.correct) || !isCount(d.incorrect) || !isCount(d.skipped)) return null;

    if (!Array.isArray(d.operators) || d.operators.length === 0) return null;
    if (!d.operators.every(op => typeof op === "string" && OPERATORS.includes(op))) return null;

    const byOperator: Partial<Record<MadMinuteOperator, OperatorTally>> = {};
    if (d.byOperator === null || typeof d.byOperator !== "object") return null;
    for (const [op, value] of Object.entries(d.byOperator as Record<string, unknown>)) {
        const tally = parseTally(value);
        if (!OPERATORS.includes(op) || tally === null) return null;
        byOperator[op as MadMinuteOperator] = tally;
    }

    return {
        id: d.id,
        playedAt: d.playedAt,
        operators: sortOperators(d.operators as MadMinuteOperator[]),
        minValue: d.minValue as number,
        maxValue: d.maxValue as number,
        durationSeconds: d.durationSeconds,
        correct: d.correct,
        incorrect: d.incorrect,
        skipped: d.skipped,
        byOperator,
    };
}

// Reads saved history. One bad record is dropped rather than losing the rest; a value that is not a list gives null.
export function parseHistory(data: unknown): RoundRecord[] | null {
    if (!Array.isArray(data)) return null;
    const records: RoundRecord[] = [];
    for (const item of data) {
        const record = parseRecord(item);
        if (record !== null && !records.some(existing => existing.id === record.id)) records.push(record);
    }
    return records.slice(0, HISTORY_CAP);
}
