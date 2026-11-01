import { MadMinuteClass } from '../MadMinuteClass';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { FactStat, FactStats } from '../factStats';
import { FOCUS_POOL_SIZE, fitsSettings, focusPool, questionForFact } from '../focus';

const { Addition, Subtraction, Multiplication, Division } = MadMinuteOperator;

const stat = (attempts: number, correct: number): FactStat =>
    ({ attempts, correct, timedCorrect: correct, correctMs: correct * 2000, lastSeen: 1 });

// 60 answers on record, so focus mode has enough to go on, and 7 x 8 is the clear weak spot.
const statsWithWeakSpot = (): FactStats => ({
    'x:2:3': stat(50, 50),
    'x:7:8': stat(10, 2),
});

const focused = (min = 1, max = 12, operators = [Multiplication]) =>
    new MadMinuteSettings(min, max, operators, 60, true);

// A repeatable stand-in for Math.random.
function seeded(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

describe('fitsSettings', () => {
    const settings = new MadMinuteSettings(2, 12, [Multiplication, Subtraction, Division], 60, true);

    it('needs an operator that is switched on', () => {
        expect(fitsSettings({ operator: Multiplication, value1: 7, value2: 8 }, settings)).toBe(true);
        expect(fitsSettings({ operator: Addition, value1: 7, value2: 8 }, settings)).toBe(false);
    });

    it('needs both numbers inside the range', () => {
        expect(fitsSettings({ operator: Multiplication, value1: 1, value2: 8 }, settings)).toBe(false);
        expect(fitsSettings({ operator: Multiplication, value1: 7, value2: 13 }, settings)).toBe(false);
        expect(fitsSettings({ operator: Multiplication, value1: 2, value2: 12 }, settings)).toBe(true);
    });

    it('keeps subtraction from going negative', () => {
        expect(fitsSettings({ operator: Subtraction, value1: 9, value2: 4 }, settings)).toBe(true);
        expect(fitsSettings({ operator: Subtraction, value1: 4, value2: 9 }, settings)).toBe(false);
    });

    it('keeps division exact', () => {
        expect(fitsSettings({ operator: Division, value1: 12, value2: 4 }, settings)).toBe(true);
        expect(fitsSettings({ operator: Division, value1: 12, value2: 5 }, settings)).toBe(false);
    });
});

describe('focusPool', () => {
    it('lists the weak spots when focus is on and there is enough on record', () => {
        expect(focusPool(statsWithWeakSpot(), focused())).toEqual([{ operator: Multiplication, value1: 7, value2: 8 }]);
    });

    it('is empty when focus is off', () => {
        const off = new MadMinuteSettings(1, 12, [Multiplication], 60, false);
        expect(focusPool(statsWithWeakSpot(), off)).toEqual([]);
    });

    it('is empty with too little on record, however weak the facts', () => {
        expect(focusPool({ 'x:7:8': stat(10, 2) }, focused())).toEqual([]);
    });

    it('leaves out weak spots the settings could not ask', () => {
        const stats = { ...statsWithWeakSpot(), '+:4:5': stat(10, 2) };
        expect(focusPool(stats, focused())).toHaveLength(1);
        expect(focusPool(stats, focused(1, 12, [Multiplication, Addition]))).toHaveLength(2);
        expect(focusPool(stats, focused(8, 12))).toEqual([]);
    });

    it('is capped, keeping the worst', () => {
        const stats: FactStats = { 'x:2:3': stat(50, 50) };
        for (let b = 2; b <= 12; b++) stats[`+:1:${b}`] = stat(10, 5);
        stats['x:7:8'] = stat(10, 0);
        for (let b = 2; b <= 12; b++) stats[`-:12:${b}`] = stat(10, 5);
        const pool = focusPool(stats, focused(1, 12, [Multiplication, Addition, Subtraction]));
        expect(pool).toHaveLength(FOCUS_POOL_SIZE);
        expect(pool[0]).toEqual({ operator: Multiplication, value1: 7, value2: 8 });
    });
});

describe('questionForFact', () => {
    it('asks addition and multiplication either way round', () => {
        const fact = { operator: Multiplication, value1: 7, value2: 8 };
        const random = seeded(3);
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
            const q = questionForFact(fact, 0, 0, random);
            expect(q.answer).toBe(56);
            seen.add(`${q.value1}x${q.value2}`);
        }
        expect([...seen].sort()).toEqual(['7x8', '8x7']);
    });

    it('keeps subtraction and division in their stored order', () => {
        const sub = questionForFact({ operator: Subtraction, value1: 15, value2: 8 }, 4, 99, () => 0);
        expect([sub.value1, sub.value2, sub.answer, sub.id]).toEqual([15, 8, 7, 4]);
        const div = questionForFact({ operator: Division, value1: 56, value2: 7 }, 0, 0, () => 0);
        expect([div.value1, div.value2, div.answer]).toEqual([56, 7, 8]);
    });

    it('records when it was made', () => {
        expect(questionForFact({ operator: Addition, value1: 3, value2: 4 }, 0, 1234).shownAt).toBe(1234);
    });
});

describe('generateNewQuestion with weak spots', () => {
    const weak = [{ operator: Multiplication, value1: 7, value2: 8 }];
    const isWeak = (q: { value1: number; value2: number }) => q.value1 * q.value2 === 56 && [q.value1, q.value2].sort().join() === '7,8';

    it('draws about half its questions from the weak spots', () => {
        const random = seeded(42);
        const game = new MadMinuteClass(focused());
        let hits = 0;
        const N = 2000;
        for (let i = 0; i < N; i++) {
            if (isWeak(game.generateNewQuestion(0, weak, random))) hits += 1;
        }
        // The normal draw lands on 7 x 8 now and then, which adds a little to the 50%.
        expect(hits / N).toBeGreaterThan(0.45);
        expect(hits / N).toBeLessThan(0.6);
    });

    it('draws normally when there are no weak spots', () => {
        const game = new MadMinuteClass(focused());
        let hits = 0;
        for (let i = 0; i < 2000; i++) if (isWeak(game.generateNewQuestion(0, []))) hits += 1;
        expect(hits / 2000).toBeLessThan(0.05);
    });

    it('still never repeats the previous question, even when it is the only weak spot', () => {
        const random = seeded(7);
        let game = new MadMinuteClass(focused());
        for (let i = 0; i < 300; i++) {
            const q = game.generateNewQuestion(0, weak, random);
            const prev = game.questions.at(-1);
            if (prev) {
                expect(`${prev.operator}${[prev.value1, prev.value2].sort()}`).not.toBe(`${q.operator}${[q.value1, q.value2].sort()}`);
            }
            game = new MadMinuteClass(game.settings, [...game.questions, q]);
        }
    });
});
