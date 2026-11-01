import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteQuestion } from '../MadMinuteQuestion';
import {
    DECAY_CAP, ENOUGH_ATTEMPTS, FactStat, FactStats, applyRound, factKey, factKeyOf, hasEnoughData, overallAverageMs,
    parseFactKey, parseFacts, smoothedAccuracy, totalAttempts, weakestFacts, weakness,
} from '../factStats';

const { Addition, Subtraction, Multiplication, Division } = MadMinuteOperator;

// A question the player answered. `ms` is how long it took; omit it for a question with no timing.
const answered = (operator: MadMinuteOperator, v1: number, v2: number, response: string, ms?: number) => {
    const answer = operator === Addition ? v1 + v2 : operator === Subtraction ? v1 - v2
        : operator === Multiplication ? v1 * v2 : v1 / v2;
    const question = new MadMinuteQuestion(0, v1, v2, operator, answer, undefined, 1000);
    return ms === undefined ? new MadMinuteQuestion(0, v1, v2, operator, answer, response) : question.withResponse(response, 1000 + ms);
};

// The question on screen when time ran out: never attempted, and always last.
const unattempted = () => new MadMinuteQuestion(99, 1, 1, Addition, 2, undefined, 1000);

const stat = (attempts: number, correct: number, timedCorrect = 0, correctMs = 0): FactStat =>
    ({ attempts, correct, timedCorrect, correctMs, lastSeen: 1 });

describe('fact keys', () => {
    it('treat adding and multiplying the other way round as one fact', () => {
        expect(factKey(Addition, 3, 4)).toBe(factKey(Addition, 4, 3));
        expect(factKey(Multiplication, 8, 7)).toBe('x:7:8');
    });

    it('keep subtraction and division in order', () => {
        expect(factKey(Subtraction, 9, 4)).toBe('-:9:4');
        expect(factKey(Subtraction, 9, 4)).not.toBe(factKey(Subtraction, 4, 9));
        expect(factKey(Division, 56, 7)).toBe('÷:56:7');
    });

    it('come from a question', () => {
        expect(factKeyOf(answered(Multiplication, 12, 3, '36'))).toBe('x:3:12');
    });

    it('turn back into the fact they stand for', () => {
        expect(parseFactKey('x:7:8')).toEqual({ operator: Multiplication, value1: 7, value2: 8 });
        expect(parseFactKey('÷:56:7')).toEqual({ operator: Division, value1: 56, value2: 7 });
        expect(parseFactKey('-:0:0')).toEqual({ operator: Subtraction, value1: 0, value2: 0 });
    });

    it('are refused when they are not exactly what factKey would make', () => {
        for (const bad of ['', 'x:7', 'x:7:8:9', 'x:8:7', '+:5:2', '?:1:2', 'x:-1:2', 'x:1.5:2', 'x:a:2', 'x::2', ' x:1:2', 'x:01:2']) {
            expect(parseFactKey(bad)).toBeNull();
        }
    });
});

describe('applyRound', () => {
    it('counts attempts and correct answers per fact', () => {
        const stats = applyRound({}, [
            answered(Multiplication, 7, 8, '56', 1500),
            answered(Multiplication, 7, 8, '54', 2000),
            answered(Multiplication, 8, 7, '56', 2500),
            unattempted(),
        ], 5000);
        expect(stats['x:7:8']).toEqual({ attempts: 3, correct: 2, timedCorrect: 2, correctMs: 4000, lastSeen: 5000 });
    });

    it('counts a skip as a miss with no time', () => {
        const stats = applyRound({}, [answered(Addition, 2, 3, ''), unattempted()], 1);
        expect(stats['+:2:3']).toMatchObject({ attempts: 1, correct: 0, timedCorrect: 0, correctMs: 0 });
    });

    it('does not time a wrong answer, however fast, or a correct one with no timing', () => {
        const stats = applyRound({}, [
            answered(Addition, 2, 3, '9', 100),
            answered(Addition, 2, 3, '5'),
            unattempted(),
        ], 1);
        expect(stats['+:2:3']).toMatchObject({ attempts: 2, correct: 1, timedCorrect: 0, correctMs: 0 });
    });

    it('leaves out the last question, which was never attempted', () => {
        expect(applyRound({}, [unattempted()], 1)).toEqual({});
        expect(applyRound({}, [], 1)).toEqual({});
        const stats = applyRound({}, [answered(Addition, 1, 1, '2', 500), answered(Addition, 4, 4, '8', 500)], 1);
        expect(Object.keys(stats)).toEqual(['+:1:1']);
    });

    it('adds to what is already known and does not change the stats it was given', () => {
        const before: FactStats = { 'x:7:8': stat(4, 3, 3, 6000) };
        const snapshot = JSON.parse(JSON.stringify(before));
        const after = applyRound(before, [answered(Multiplication, 7, 8, '56', 1000), unattempted()], 9);
        expect(before).toEqual(snapshot);
        expect(after['x:7:8']).toEqual({ attempts: 5, correct: 4, timedCorrect: 4, correctMs: 7000, lastSeen: 9 });
    });

    it('halves a fact\'s counts once its attempts pass the cap, keeping its average time', () => {
        const questions = Array.from({ length: DECAY_CAP + 1 }, () => answered(Multiplication, 6, 7, '42', 3000));
        const stats = applyRound({}, [...questions, unattempted()], 1);
        const fact = stats['x:6:7'];
        expect(fact.attempts).toBe((DECAY_CAP + 1) / 2);
        expect(fact.correct).toBe((DECAY_CAP + 1) / 2);
        expect(fact.correctMs / fact.timedCorrect).toBe(3000);
    });

    it('does not halve at exactly the cap', () => {
        const questions = Array.from({ length: DECAY_CAP }, () => answered(Multiplication, 6, 7, '42', 3000));
        expect(applyRound({}, [...questions, unattempted()], 1)['x:6:7'].attempts).toBe(DECAY_CAP);
    });

    it('lets old mistakes fade as the player improves', () => {
        let stats: FactStats = {};
        const miss = Array.from({ length: 10 }, () => answered(Addition, 8, 9, '0', 1000));
        stats = applyRound(stats, [...miss, unattempted()], 1);
        const before = smoothedAccuracy(stats['+:8:9']);
        for (let round = 0; round < 4; round++) {
            const right = Array.from({ length: 10 }, () => answered(Addition, 8, 9, '17', 1000));
            stats = applyRound(stats, [...right, unattempted()], 2 + round);
        }
        expect(smoothedAccuracy(stats['+:8:9'])).toBeGreaterThan(0.8);
        expect(before).toBeLessThan(0.2);
    });

    it('keeps weak spots through a long break, because decay follows attempts and not days', () => {
        const stats = applyRound({}, [answered(Division, 56, 7, '9', 4000), answered(Division, 56, 7, '9', 4000), unattempted()], 1);
        const later = applyRound(stats, [answered(Addition, 1, 1, '2', 500), unattempted()], 1 + 90 * 24 * 3600 * 1000);
        expect(later['÷:56:7']).toEqual(stats['÷:56:7']);
    });
});

describe('weakness', () => {
    it('is low for a fact that is always right and quick', () => {
        expect(weakness(stat(10, 10, 10, 20000), 2000)).toBeLessThan(0.1);
    });

    it('is high for a fact that is always missed', () => {
        expect(weakness(stat(4, 0), null)).toBeGreaterThan(0.5);
    });

    it('is not carried away by a single miss', () => {
        const oneMiss = weakness(stat(1, 0), null);
        expect(oneMiss).toBeLessThan(weakness(stat(4, 0), null));
        expect(oneMiss).toBeGreaterThan(0.2);
    });

    it('counts a correct answer that is much slower than the player\'s own average', () => {
        const quick = weakness(stat(5, 5, 5, 5 * 2000), 2000);
        const slow = weakness(stat(5, 5, 5, 5 * 4000), 2000);
        expect(slow).toBeGreaterThan(quick + 0.25);
    });

    it('does not mark a fact down for being faster than average', () => {
        expect(weakness(stat(5, 5, 5, 5 * 500), 2000)).toBe(weakness(stat(5, 5), null));
    });

    it('trusts slowness more as timed answers build up', () => {
        const one = weakness(stat(1, 1, 1, 6000), 2000);
        const three = weakness(stat(3, 3, 3, 18000), 2000);
        const smoothedOne = 0.7 * (1 - smoothedAccuracy(stat(1, 1)));
        expect(one - smoothedOne).toBeCloseTo(0.3 / 3, 5);
        expect(three - 0.7 * (1 - smoothedAccuracy(stat(3, 3)))).toBeCloseTo(0.3, 5);
    });

    it('ignores speed when the player has no average yet', () => {
        expect(weakness(stat(5, 5, 5, 50000), null)).toBeCloseTo(0.7 * (1 - smoothedAccuracy(stat(5, 5))), 10);
    });

    it('stays between 0 and 1', () => {
        for (const s of [stat(1, 0), stat(100, 0), stat(100, 100, 100, 1e9), stat(0, 0)]) {
            const value = weakness(s, 1000);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
    });
});

describe('averages and totals', () => {
    it('averages the time of correct answers over every fact', () => {
        expect(overallAverageMs({ 'x:2:3': stat(2, 2, 2, 3000), '+:1:1': stat(1, 1, 1, 1000) })).toBeCloseTo(4000 / 3);
    });

    it('has no average before any timed answer', () => {
        expect(overallAverageMs({})).toBeNull();
        expect(overallAverageMs({ 'x:2:3': stat(3, 0) })).toBeNull();
    });

    it('offers focus mode once enough has been played', () => {
        expect(hasEnoughData({ 'x:2:3': stat(ENOUGH_ATTEMPTS - 1, 10) })).toBe(false);
        expect(hasEnoughData({ 'x:2:3': stat(ENOUGH_ATTEMPTS - 10, 10), '+:1:1': stat(10, 10) })).toBe(true);
        expect(totalAttempts({ 'x:2:3': stat(3, 1), '+:1:1': stat(4, 4) })).toBe(7);
    });
});

describe('weakestFacts', () => {
    const stats: FactStats = {
        'x:7:8': stat(6, 2),                    // often missed
        'x:6:7': stat(4, 3),                    // sometimes missed
        'x:2:3': stat(10, 10, 10, 10 * 1500),   // solid and quick
        '+:5:5': stat(1, 0),                    // one miss: too early to judge
        '÷:56:7': stat(5, 5, 5, 5 * 6000),      // always right but very slow
    };

    it('lists the worst first, leaving out solid facts and facts asked too few times', () => {
        const keys = weakestFacts(stats, 10).map((spot) => spot.key);
        expect(keys[0]).toBe('x:7:8');
        expect(keys).toContain('x:6:7');
        expect(keys).toContain('÷:56:7');
        expect(keys).not.toContain('x:2:3');
        expect(keys).not.toContain('+:5:5');
    });

    it('includes slow-but-correct facts', () => {
        const spot = weakestFacts(stats, 10).find((s) => s.key === '÷:56:7')!;
        expect(spot.accuracy).toBe(1);
        expect(spot.averageMs).toBe(6000);
    });

    it('stops at the limit', () => {
        expect(weakestFacts(stats, 2)).toHaveLength(2);
        expect(weakestFacts(stats, 0)).toEqual([]);
    });

    it('reports plain accuracy and the fact itself', () => {
        const spot = weakestFacts(stats, 1)[0];
        expect(spot.accuracy).toBeCloseTo(2 / 6);
        expect(spot.fact).toEqual({ operator: Multiplication, value1: 7, value2: 8 });
        expect(spot.attempts).toBe(6);
    });

    it('is the same every time when two facts tie', () => {
        const tied: FactStats = { 'x:3:4': stat(4, 2), 'x:2:5': stat(4, 2) };
        expect(weakestFacts(tied, 2).map((s) => s.key)).toEqual(['x:2:5', 'x:3:4']);
    });

    it('ignores entries that are not facts', () => {
        expect(weakestFacts({ 'nonsense': stat(9, 0) }, 5)).toEqual([]);
    });

    it('is empty with nothing recorded', () => {
        expect(weakestFacts({}, 5)).toEqual([]);
    });

    it('calls 3 of 4 right a trouble spot, but not 4 of 4 or 9 of 10', () => {
        const keysFor = (s: FactStat) => weakestFacts({ 'x:3:4': s }, 5).map((spot) => spot.key);
        expect(keysFor(stat(4, 3))).toEqual(['x:3:4']);
        expect(keysFor(stat(4, 4))).toEqual([]);
        expect(keysFor(stat(10, 9))).toEqual([]);
        expect(keysFor(stat(3, 2))).toEqual(['x:3:4']);
    });
});

describe('parseFacts', () => {
    const good = { attempts: 4, correct: 3, timedCorrect: 3, correctMs: 6000, lastSeen: 100 };

    it('keeps valid data as it is', () => {
        expect(parseFacts({ 'x:7:8': good })).toEqual({ 'x:7:8': good });
        expect(parseFacts({})).toEqual({});
    });

    it('keeps fractional counts, which decay produces', () => {
        const halved = { attempts: 10.5, correct: 10.5, timedCorrect: 10.5, correctMs: 31500, lastSeen: 1 };
        expect(parseFacts({ 'x:6:7': halved })).toEqual({ 'x:6:7': halved });
    });

    it('is null when the data is not an object', () => {
        for (const bad of [null, undefined, 'text', 5, [], [good]]) {
            expect(parseFacts(bad)).toBeNull();
        }
    });

    it('drops only the entries that are bad', () => {
        const parsed = parseFacts({
            'x:7:8': good,
            'x:8:7': good,                                   // not the normal form
            'nonsense': good,
            '+:1:2': { ...good, attempts: -1 },
            '+:1:3': { ...good, attempts: 'many' },
            '+:1:4': { ...good, correctMs: Number.NaN },
            '+:1:5': { ...good, attempts: Infinity },
            '+:1:6': { ...good, correct: 5 },                // more right than asked
            '+:1:7': { ...good, timedCorrect: 4 },           // more timed than right
            '+:1:8': { attempts: 1 },
            '+:1:9': null,
            '+:2:2': 'text',
        });
        expect(parsed).toEqual({ 'x:7:8': good });
    });

    it('never returns more facts than the biggest range could make', () => {
        const many: Record<string, unknown> = {};
        for (let a = 0; a < 90; a++) for (let b = 0; b < 90; b++) many[`-:${a}:${b}`] = good;
        expect(Object.keys(parseFacts(many)!).length).toBeLessThanOrEqual(5000);
    });
});
