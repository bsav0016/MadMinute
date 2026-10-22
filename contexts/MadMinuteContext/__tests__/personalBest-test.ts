import { bestBySetup, compareRounds, getBestInfo, scoreText, setupKey } from '../personalBest';
import { RoundRecord } from '../roundRecord';
import { MadMinuteOperator } from '../MadMinuteOperator';

const { Addition, Subtraction } = MadMinuteOperator;

const round = (
    id: string,
    correct: number,
    incorrect = 0,
    skipped = 0,
    operators: MadMinuteOperator[] = [Addition],
    durationSeconds = 60
): RoundRecord => ({
    id,
    playedAt: 0,
    operators,
    minValue: 0,
    maxValue: 10,
    durationSeconds,
    correct,
    incorrect,
    skipped,
    byOperator: {},
});

describe('setupKey', () => {
    it('is the same for the same operators and length, in any order, whatever the range', () => {
        const a = round('a', 1, 0, 0, [Addition, Subtraction]);
        const b = { ...round('b', 1, 0, 0, [Subtraction, Addition]), minValue: 3, maxValue: 17 };
        expect(setupKey(a)).toBe(setupKey(b));
    });

    it('differs by operators and by round length', () => {
        expect(setupKey(round('a', 1))).not.toBe(setupKey(round('b', 1, 0, 0, [Subtraction])));
        expect(setupKey(round('a', 1))).not.toBe(setupKey(round('b', 1, 0, 0, [Addition], 30)));
    });
});

describe('compareRounds', () => {
    it('ranks by correct answers first', () => {
        expect(compareRounds(round('a', 10, 5), round('b', 9))).toBeGreaterThan(0);
    });

    it('breaks a tie on accuracy', () => {
        expect(compareRounds(round('a', 10, 0), round('b', 10, 4))).toBeGreaterThan(0);
        expect(compareRounds(round('a', 10, 2), round('b', 10, 2))).toBe(0);
    });
});

describe('getBestInfo', () => {
    it('has no previous best for the first round of a setup', () => {
        const current = round('now', 8);
        expect(getBestInfo([current], current)).toEqual({ previousBest: null, isNewBest: false });
    });

    it('flags a round that beats the earlier best, and reports that best', () => {
        const old = round('old', 8);
        const current = round('now', 10);
        const info = getBestInfo([current, old, round('older', 5)], current);
        expect(info.isNewBest).toBe(true);
        expect(info.previousBest?.id).toBe('old');
    });

    it('does not flag a round that ties or falls short', () => {
        const old = round('old', 10);
        expect(getBestInfo([round('tie', 10), old], round('tie', 10)).isNewBest).toBe(false);
        expect(getBestInfo([round('low', 4), old], round('low', 4))).toMatchObject({ isNewBest: false, previousBest: { id: 'old' } });
    });

    it('only compares with the same setup', () => {
        const other = round('other', 50, 0, 0, [Subtraction]);
        const current = round('now', 5);
        expect(getBestInfo([current, other], current).previousBest).toBeNull();
    });

    it('works whether or not the round is already in the history', () => {
        const old = round('old', 8);
        const current = round('now', 10);
        expect(getBestInfo([old], current)).toEqual(getBestInfo([current, old], current));
    });
});

describe('bestBySetup', () => {
    it('keeps the best round for each setup', () => {
        const best = bestBySetup([round('a', 5), round('b', 9), round('c', 20, 0, 0, [Subtraction])]);
        expect(best.size).toBe(2);
        expect(best.get(setupKey(round('x', 0)))?.id).toBe('b');
    });
});

describe('scoreText', () => {
    it('shows correct over attempted', () => {
        expect(scoreText(round('a', 7, 2, 1))).toBe('7/10');
    });
});
