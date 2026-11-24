import { emptyPractice, goalProgress, nextGoal, PracticeRecord, recordPracticeRound, withGoal } from '../practice';
import { goalMarks, goalText, hasPlayed, practiceSummary, streakText } from '../practiceText';

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime();
const play = (record: PracticeRecord, ...times: number[]) => times.reduce(recordPracticeRound, record);

describe('the words for the goal', () => {
    it('say how far along today is', () => {
        const record = withGoal(play(emptyPractice(), at(23)), 3);
        expect(goalText(goalProgress(record, at(23)))).toBe('1 of 3 rounds today');
        expect(goalText(goalProgress(withGoal(emptyPractice(), 1), at(23)))).toBe('0 of 1 round today');
    });

    it('say the goal is done, and count rounds beyond it', () => {
        const done = play(emptyPractice(), at(23), at(23, 15));
        expect(goalText(goalProgress(done, at(23)))).toBe("Today's goal is done: 2 rounds played");
        expect(goalText(goalProgress(play(emptyPractice(), at(23)), at(23)))).toBe("Today's goal is done: 1 round played");
    });

    it('draw a mark for each round of the goal, a tick when played and a circle when not', () => {
        const record = withGoal(play(emptyPractice(), at(23)), 3);
        expect(goalMarks(goalProgress(record, at(23)))).toBe('✓ ○ ○');
        expect(goalMarks(goalProgress(record, at(24)))).toBe('○ ○ ○');
        expect(goalMarks(goalProgress(play(record, at(23, 14), at(23, 15), at(23, 16)), at(23)))).toBe('✓ ✓ ✓');
    });

    it('cycle the goal 1, 2, 3 and back to 1', () => {
        expect([nextGoal(1), nextGoal(2), nextGoal(3)]).toEqual([2, 3, 1]);
    });
});

describe('the words for the streak', () => {
    const record = play(emptyPractice(), at(23), at(24));

    it('say the days in a row, with one day in the singular', () => {
        expect(streakText(record, at(24))).toBe('2 days in a row');
        expect(streakText(play(emptyPractice(), at(23)), at(23))).toBe('1 day in a row');
    });

    it('invite the player to carry on the day after', () => {
        expect(streakText(record, at(25))).toBe('2 days in a row. Play today to keep it going.');
    });

    it('call a missed day a rest day, and never say a streak was lost', () => {
        expect(streakText(record, at(26))).toBe('Yesterday was a rest day. Play today to keep your 2 days in a row going.');
        expect(streakText(record, at(30))).toBeNull();
        expect(streakText(emptyPractice(), at(23))).toBeNull();
        for (const day of [24, 25, 26, 30]) {
            expect(`${streakText(record, at(day))} ${practiceSummary(record, at(day))}`).not.toMatch(/lost|broke|miss|fail|reset/i);
        }
    });
});

describe('the summary a screen reader says', () => {
    it('joins the goal and the streak', () => {
        const record = withGoal(play(emptyPractice(), at(23), at(24)), 2);
        expect(practiceSummary(record, at(24))).toBe('1 of 2 rounds today. 2 days in a row');
    });

    it('is only the goal when there is no streak to show', () => {
        const record = play(emptyPractice(), at(23));
        expect(practiceSummary(record, at(30))).toBe('0 of 1 round today');
    });
});

describe('hasPlayed', () => {
    it('is false until a round has been finished', () => {
        expect(hasPlayed(emptyPractice())).toBe(false);
        expect(hasPlayed(withGoal(emptyPractice(), 3))).toBe(false);
        expect(hasPlayed(play(emptyPractice(), at(23)))).toBe(true);
    });
});
