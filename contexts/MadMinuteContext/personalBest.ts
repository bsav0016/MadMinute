import { RoundRecord } from "./roundRecord";

// A personal best is kept per mix of operations and round length. The number range is left out on purpose, so
// changing it a little does not start a new set of bests.
export function setupKey(record: Pick<RoundRecord, "operators" | "durationSeconds">): string {
    return `${[...record.operators].sort().join("")}|${record.durationSeconds}`;
}

function attempted(record: RoundRecord): number {
    return record.correct + record.incorrect + record.skipped;
}

function accuracy(record: RoundRecord): number {
    const total = attempted(record);
    return total === 0 ? 0 : record.correct / total;
}

// Positive when a is the better round: more correct answers, then better accuracy. Zero means a tie.
export function compareRounds(a: RoundRecord, b: RoundRecord): number {
    if (a.correct !== b.correct) return a.correct - b.correct;
    return accuracy(a) - accuracy(b);
}

export interface BestInfo {
    // The best earlier round with the same setup, or null if this is the first one.
    previousBest: RoundRecord | null;
    isNewBest: boolean;
}

// How a round compares with the earlier rounds of the same setup. The round itself may already be in the history.
export function getBestInfo(history: RoundRecord[], record: RoundRecord): BestInfo {
    const key = setupKey(record);
    let previousBest: RoundRecord | null = null;
    for (const other of history) {
        if (other.id === record.id || setupKey(other) !== key) continue;
        if (previousBest === null || compareRounds(other, previousBest) > 0) previousBest = other;
    }
    return {
        previousBest,
        isNewBest: previousBest !== null && compareRounds(record, previousBest) > 0,
    };
}

// The best round for each setup, for the history screen.
export function bestBySetup(history: RoundRecord[]): Map<string, RoundRecord> {
    const best = new Map<string, RoundRecord>();
    for (const record of history) {
        const key = setupKey(record);
        const current = best.get(key);
        if (current === undefined || compareRounds(record, current) > 0) best.set(key, record);
    }
    return best;
}

export function scoreText(record: RoundRecord): string {
    return `${record.correct}/${attempted(record)}`;
}
