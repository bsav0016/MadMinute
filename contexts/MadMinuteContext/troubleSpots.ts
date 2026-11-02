import { displayOperator, MadMinuteOperator } from "./MadMinuteOperator";
import { MadMinuteQuestion } from "./MadMinuteQuestion";
import { factKey, factKeyOf, FactStats, MIN_ATTEMPTS_TO_JUDGE, overallAverageMs, ParsedFact, TROUBLE_THRESHOLD, TroubleSpot, weakness } from "./factStats";

// What the History screen shows about the per-fact record: a label for each trouble spot and a times-table grid.

export const GRID_SIZE = 12;

// How a fact on the grid looks, from its weakness (see factStats.weakness). A fact asked fewer than
// MIN_ATTEMPTS_TO_JUDGE times is "unseen": one answer says too little to colour it.
export type CellLevel = "unseen" | "solid" | "ok" | "trouble" | "bad";

const SOLID_BELOW = 0.08;
const BAD_FROM = 0.35;

export interface GridCell {
    row: number;
    col: number;
    level: CellLevel;
}

export function cellLevel(weaknessScore: number): CellLevel {
    if (weaknessScore < SOLID_BELOW) return "solid";
    if (weaknessScore < TROUBLE_THRESHOLD) return "ok";
    if (weaknessScore < BAD_FROM) return "trouble";
    return "bad";
}

/** The multiplication table from 1 x 1 to `size` x `size`, one cell per pair. 7 x 8 and 8 x 7 are one fact, so the
 *  grid mirrors itself across the diagonal. */
export function timesTableGrid(stats: FactStats, size: number = GRID_SIZE): GridCell[][] {
    const average = overallAverageMs(stats);
    const rows: GridCell[][] = [];
    for (let row = 1; row <= size; row++) {
        const cells: GridCell[] = [];
        for (let col = 1; col <= size; col++) {
            const stat = stats[factKey(MadMinuteOperator.Multiplication, row, col)];
            const level: CellLevel = stat && stat.attempts >= MIN_ATTEMPTS_TO_JUDGE ? cellLevel(weakness(stat, average)) : "unseen";
            cells.push({ row, col, level });
        }
        rows.push(cells);
    }
    return rows;
}

/** How many different facts on the grid need work. */
export function gridFactsNeedingWork(grid: GridCell[][]): number {
    let count = 0;
    for (const cells of grid) {
        for (const cell of cells) {
            if (cell.col >= cell.row && (cell.level === "trouble" || cell.level === "bad")) count += 1;
        }
    }
    return count;
}

/** "7 × 8", with the symbols the app shows elsewhere. */
export function factLabel(fact: ParsedFact): string {
    return `${fact.value1} ${displayOperator(fact.operator)} ${fact.value2}`;
}

/** "4.2 s", or null when there is no time. */
export function formatSeconds(ms: number | null): string | null {
    return ms === null ? null : `${(ms / 1000).toFixed(1)} s`;
}

/** "33% right · 4.2 s", the line under a trouble spot. The time is of correct answers, and is left out with none. */
export function spotDetail(spot: TroubleSpot): string {
    const percent = `${Math.round(spot.accuracy * 100)}% right`;
    const seconds = formatSeconds(spot.averageMs);
    return seconds ? `${percent} · ${seconds}` : percent;
}

/** How many missed facts the results screen names. */
export const WORTH_A_LOOK_SHOWN = 3;

/** The facts answered wrongly in a round, first miss first, each once. Skipped questions are not misses, and the
 *  last question is left out because it was on screen when time ran out and never attempted. */
export function worthAnotherLook(questions: MadMinuteQuestion[], limit: number = WORTH_A_LOOK_SHOWN): ParsedFact[] {
    const seen = new Set<string>();
    const facts: ParsedFact[] = [];
    for (const question of questions.slice(0, -1)) {
        if (!question.response || String(question.answer) === question.response) continue;
        const key = factKeyOf(question);
        if (seen.has(key)) continue;
        seen.add(key);
        facts.push({ operator: question.operator, value1: question.value1, value2: question.value2 });
        if (facts.length === limit) break;
    }
    return facts;
}
