import {
    GoalProgress, goalProgress, PracticeRecord, PracticeSetup, streakView, TABLE_FACTS, TableLevel, TableStatus,
} from "./practice";

// The words for the goal and streak on the home screen. Calm on purpose: it never says a streak was lost, and a missed
// day is "a rest day", not a failure.

const rounds = (n: number) => `${n} ${n === 1 ? "round" : "rounds"}`;
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function goalText(progress: GoalProgress): string {
    if (progress.met) return `Today's goal is done: ${rounds(progress.done)} played`;
    return `${progress.done} of ${rounds(progress.goal)} today`;
}

/** One mark per round of the goal: a tick for each one played and an empty circle for each one to go. */
export function goalMarks(progress: GoalProgress): string {
    return Array.from({ length: progress.goal }, (_, i) => (i < progress.done ? "✓" : "○")).join(" ");
}

/** The streak line, or null when there is no streak to show. */
export function streakText(record: PracticeRecord, now: number): string | null {
    const view = streakView(record, now);
    switch (view.state) {
        case "kept":
            return `${days(view.days)} in a row`;
        case "ready":
            return `${days(view.days)} in a row. Play today to keep it going.`;
        case "resting":
            return `Yesterday was a rest day. Play today to keep your ${days(view.days)} in a row going.`;
        default:
            return null;
    }
}

/** What a screen reader says for the whole card. */
export function practiceSummary(record: PracticeRecord, now: number): string {
    const parts = [goalText(goalProgress(record, now))];
    const streak = streakText(record, now);
    if (streak) parts.push(streak);
    return parts.join(". ");
}

/** Whether to show the card at all: not until the player has finished a round, so a new install looks the same as ever. */
export function hasPlayed(record: PracticeRecord): boolean {
    return record.streak.lastDay !== null;
}

/** The line under the "Today's practice" button: what the round will be. */
export function practiceHint(setup: PracticeSetup): string {
    return setup.table === null ? "Your usual setup" : `The ${setup.table} times table`;
}

const LEVEL_WORDS: Record<TableLevel, string> = {
    new: "Not started",
    learning: "Learning",
    known: "Known",
    mastered: "Mastered",
};

/** The level in words. Words and a mark always go together, so colour is never the only signal. */
export function levelWord(level: TableLevel): string {
    return LEVEL_WORDS[level];
}

const LEVEL_MARKS: Record<TableLevel, string> = { new: "–", learning: "•", known: "✓", mastered: "★" };

export function levelMark(level: TableLevel): string {
    return LEVEL_MARKS[level];
}

/** For a row of the table levels, as a screen reader should say it: "7s: Learning, 8 of 12 facts solid". */
export function tableRowText(status: TableStatus): string {
    const facts = status.started === 0 ? "" : `, ${status.solid} of ${TABLE_FACTS} facts solid`;
    return `${status.table}s: ${levelWord(status.level)}${facts}`;
}

/** The line on the results screen for a table that moved up, or null for a move that is not worth a line (starting a table). */
export function levelUpText(status: TableStatus): string | null {
    if (status.level === "mastered") return `You have mastered the ${status.table}s!`;
    if (status.level === "known") return `You know your ${status.table}s now!`;
    return null;
}
