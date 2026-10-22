import { displayOperator, MadMinuteOperator } from "./MadMinuteOperator";
import { bestBySetup } from "./personalBest";
import { RoundRecord } from "./roundRecord";

export const TREND_ROUNDS = 10;

const attempted = (record: { correct: number; incorrect: number; skipped: number }) =>
    record.correct + record.incorrect + record.skipped;

// Whole-number percentage, or null when there is nothing to divide.
function percent(correct: number, total: number): number | null {
    return total === 0 ? null : Math.round((correct / total) * 100);
}

export interface HistorySummary {
    rounds: number;
    correct: number;
    attempted: number;
    accuracy: number | null;
}

export function summarize(history: RoundRecord[]): HistorySummary {
    let correct = 0;
    let total = 0;
    for (const record of history) {
        correct += record.correct;
        total += attempted(record);
    }
    return { rounds: history.length, correct, attempted: total, accuracy: percent(correct, total) };
}

export interface OperatorAccuracy {
    operator: MadMinuteOperator;
    correct: number;
    attempted: number;
    accuracy: number | null;
}

// Accuracy per operator across the whole history, for the operators that have been played, in the usual order.
export function operatorAccuracy(history: RoundRecord[]): OperatorAccuracy[] {
    const totals = new Map<MadMinuteOperator, { correct: number; attempted: number }>();
    for (const record of history) {
        for (const [operator, tally] of Object.entries(record.byOperator)) {
            const current = totals.get(operator as MadMinuteOperator) ?? { correct: 0, attempted: 0 };
            current.correct += tally.correct;
            current.attempted += attempted(tally);
            totals.set(operator as MadMinuteOperator, current);
        }
    }
    return Object.values(MadMinuteOperator)
        .filter(operator => (totals.get(operator)?.attempted ?? 0) > 0)
        .map(operator => {
            const { correct, attempted: total } = totals.get(operator)!;
            return { operator, correct, attempted: total, accuracy: percent(correct, total) };
        });
}

export interface TrendBar {
    id: string;
    correct: number;
    accuracy: number | null;
    height: number; // 0 to 1, relative to the best round shown
}

// The last few rounds, oldest first, as bars sized by correct answers.
export function recentTrend(history: RoundRecord[], count = TREND_ROUNDS): TrendBar[] {
    const recent = history.slice(0, count).reverse();
    const most = Math.max(1, ...recent.map(record => record.correct));
    return recent.map(record => ({
        id: record.id,
        correct: record.correct,
        accuracy: percent(record.correct, attempted(record)),
        height: record.correct / most,
    }));
}

// For example "+ −  ·  60 sec".
export function setupLabel(record: Pick<RoundRecord, "operators" | "durationSeconds">): string {
    return `${record.operators.map(displayOperator).join(" ")}  ·  ${record.durationSeconds} sec`;
}

export interface BestEntry {
    label: string;
    record: RoundRecord;
}

// The best round for each setup, the most recently played setup first.
export function bestRounds(history: RoundRecord[]): BestEntry[] {
    return [...bestBySetup(history).values()]
        .sort((a, b) => b.playedAt - a.playedAt)
        .map(record => ({ label: setupLabel(record), record }));
}
