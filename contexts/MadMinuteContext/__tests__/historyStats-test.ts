import { bestRounds, operatorAccuracy, recentTrend, setupLabel, summarize } from '../historyStats';
import { RoundRecord } from '../roundRecord';
import { MadMinuteOperator } from '../MadMinuteOperator';

const { Addition, Subtraction, Multiplication } = MadMinuteOperator;

const round = (
    id: string,
    correct: number,
    incorrect = 0,
    skipped = 0,
    operators: MadMinuteOperator[] = [Addition],
    byOperator: RoundRecord['byOperator'] = {},
    playedAt = 0
): RoundRecord => ({ id, playedAt, operators, minValue: 0, maxValue: 10, durationSeconds: 60, correct, incorrect, skipped, byOperator });

describe('summarize', () => {
    it('totals rounds, answers and accuracy', () => {
        expect(summarize([round('a', 6, 2, 2), round('b', 4, 0, 0)])).toEqual({ rounds: 2, correct: 10, attempted: 14, accuracy: 71 });
    });

    it('has no accuracy for an empty history', () => {
        expect(summarize([])).toEqual({ rounds: 0, correct: 0, attempted: 0, accuracy: null });
    });
});

describe('operatorAccuracy', () => {
    it('adds up each operator across rounds and keeps the usual order', () => {
        const history = [
            round('a', 0, 0, 0, [Multiplication, Addition], {
                [Multiplication]: { correct: 1, incorrect: 1, skipped: 0 },
                [Addition]: { correct: 3, incorrect: 0, skipped: 1 },
            }),
            round('b', 0, 0, 0, [Addition], { [Addition]: { correct: 1, incorrect: 0, skipped: 0 } }),
        ];
        expect(operatorAccuracy(history)).toEqual([
            { operator: Addition, correct: 4, attempted: 5, accuracy: 80 },
            { operator: Multiplication, correct: 1, attempted: 2, accuracy: 50 },
        ]);
    });

    it('leaves out operators that were never played', () => {
        expect(operatorAccuracy([round('a', 0)])).toEqual([]);
    });
});

describe('recentTrend', () => {
    it('shows the newest rounds oldest first, sized against the best of them', () => {
        const newestFirst = [round('c', 10), round('b', 5, 5), round('a', 0, 4)];
        const bars = recentTrend(newestFirst);
        expect(bars.map(b => b.id)).toEqual(['a', 'b', 'c']);
        expect(bars.map(b => b.height)).toEqual([0, 0.5, 1]);
        expect(bars.map(b => b.accuracy)).toEqual([0, 50, 100]);
    });

    it('limits how many rounds it shows', () => {
        const many = Array.from({ length: 25 }, (_, i) => round(`r${i}`, 1));
        const bars = recentTrend(many, 10);
        expect(bars).toHaveLength(10);
        expect(bars.at(-1)!.id).toBe('r0');
    });

    it('does not divide by zero when every shown round scored zero', () => {
        expect(recentTrend([round('a', 0, 3)])[0].height).toBe(0);
    });
});

describe('setupLabel and bestRounds', () => {
    it('labels a setup with its symbols and length', () => {
        expect(setupLabel(round('a', 1, 0, 0, [Addition, Subtraction]))).toBe('+ −  ·  60 sec');
    });

    it('lists the best round of each setup, most recently played setup first', () => {
        const list = bestRounds([
            round('new-sub', 3, 0, 0, [Subtraction], {}, 300),
            round('old-add-best', 9, 0, 0, [Addition], {}, 100),
            round('add-weak', 2, 0, 0, [Addition], {}, 200),
        ]);
        expect(list.map(e => e.record.id)).toEqual(['new-sub', 'old-add-best']);
    });
});
