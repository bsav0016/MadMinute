import { GoalProgress, goalProgress, PracticeRecord, PracticeSetup, streakView } from "./practice";

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
