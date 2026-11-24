import { MadMinuteClass } from '../MadMinuteClass';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteQuestion } from '../MadMinuteQuestion';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { tablePool } from '../focus';
import { FactStat, FactStats, factKeyOf, parseFactKey } from '../factStats';
import { buildRoundRecord, parseHistory } from '../roundRecord';
import { bestBySetup, getBestInfo, setupKey } from '../personalBest';
import { setupLabel } from '../historyStats';
import { resultMessage } from '../shareResult';
import { practiceHint } from '../practiceText';
import { nextPractice } from '../practice';

const { Addition, Multiplication } = MadMinuteOperator;

// A small repeatable stream of numbers between 0 and 1, so a "random" test is the same every time.
function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// The usual setup of the player is addition up to 5, to show that a round of a table does not use it.
const usual = new MadMinuteSettings(0, 5, [Addition], 30, true);

function drawMany(round: MadMinuteClass, count: number, random: () => number, weak = [] as ReturnType<typeof tablePool>) {
    let current = round;
    for (let i = 0; i < count; i++) {
        const question = current.generateNewQuestion(1000 + i, weak, random);
        current = new MadMinuteClass(current.settings, [...current.questions, question], current.table);
    }
    return current.questions;
}

describe('a round of one times table', () => {
    const round = new MadMinuteClass(usual, [], 7);

    it('asks only multiplication of that table, whatever the usual setup is', () => {
        const questions = drawMany(round, 300, seeded(1));
        for (const q of questions) {
            expect(q.operator).toBe(Multiplication);
            expect([q.value1, q.value2]).toContain(7);
            const other = q.value1 === 7 ? q.value2 : q.value1;
            expect(other).toBeGreaterThanOrEqual(1);
            expect(other).toBeLessThanOrEqual(12);
            expect(q.answer).toBe(q.value1 * q.value2);
        }
    });

    it('reaches every fact of the table, shown both ways round', () => {
        const questions = drawMany(round, 600, seeded(2));
        const others = new Set(questions.map(q => (q.value1 === 7 ? q.value2 : q.value1)));
        expect([...others].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect(questions.some(q => q.value1 === 7 && q.value2 !== 7)).toBe(true);
        expect(questions.some(q => q.value2 === 7 && q.value1 !== 7)).toBe(true);
    });

    it('never asks the same fact twice in a row', () => {
        const questions = drawMany(round, 400, seeded(3));
        for (let i = 1; i < questions.length; i++) {
            expect(factKeyOf(questions[i])).not.toBe(factKeyOf(questions[i - 1]));
        }
    });

    it('works for the 12s and the 2s, the ends of the range', () => {
        for (const table of [2, 12]) {
            const questions = drawMany(new MadMinuteClass(usual, [], table), 200, seeded(table));
            expect(questions.every(q => [q.value1, q.value2].includes(table))).toBe(true);
        }
    });

    it('asks the weak facts of the table more often when there are some', () => {
        const stat = (attempts: number, correct: number): FactStat => ({ attempts, correct, timedCorrect: correct, correctMs: correct * 2000, lastSeen: 1 });
        const facts: FactStats = { 'x:7:8': stat(6, 1), 'x:3:7': stat(6, 1), 'x:5:9': stat(6, 1) };
        const pool = tablePool(facts, 7);
        expect(pool.map(f => `${f.value1}x${f.value2}`).sort()).toEqual(['3x7', '7x8']);
        const questions = drawMany(round, 600, seeded(4), pool);
        const weakShare = questions.filter(q => [factKeyOf(q)].some(k => k === 'x:7:8' || k === 'x:3:7')).length / questions.length;
        // Half come from the weak facts and the rest from all twelve, so these two are well over their even share of 2/12.
        expect(weakShare).toBeGreaterThan(0.4);
        expect(weakShare).toBeLessThan(0.7);
    });

    it('is played with the usual setup left alone, and records the setup it really used', () => {
        expect(round.settings).toBe(usual);
        const effective = round.effectiveSettings();
        expect(effective).toMatchObject({ minValue: 1, maxValue: 12, availableOperators: [Multiplication], durationSeconds: 30 });
        expect(new MadMinuteClass(usual).effectiveSettings()).toBe(usual);
        expect(usual).toEqual(new MadMinuteSettings(0, 5, [Addition], 30, true));
    });
});

describe('the pool of weak facts for a table', () => {
    const stat = (attempts: number, correct: number): FactStat => ({ attempts, correct, timedCorrect: correct, correctMs: correct * 2000, lastSeen: 1 });

    it('holds only multiplication facts that include the table', () => {
        const facts: FactStats = {
            'x:7:8': stat(6, 1), '+:7:8': stat(6, 1), '÷:56:7': stat(6, 1), 'x:2:9': stat(6, 1), 'x:7:7': stat(6, 1),
        };
        const keys = tablePool(facts, 7).map(f => `${f.operator}:${f.value1}:${f.value2}`).sort();
        expect(keys).toEqual(['x:7:7', 'x:7:8']);
    });

    it('is empty with nothing weak, or no record yet', () => {
        expect(tablePool({}, 7)).toEqual([]);
        expect(tablePool({ 'x:7:8': stat(10, 10) }, 7)).toEqual([]);
    });

    it('is used without waiting for the 50 answers focus mode needs', () => {
        expect(tablePool({ 'x:7:8': stat(3, 0) }, 7)).toHaveLength(1);
    });
});

describe('a round of a table in the history', () => {
    const answered = (v1: number, v2: number, response: string) =>
        new MadMinuteQuestion(0, v1, v2, Multiplication, v1 * v2, response);
    const questions = [answered(7, 3, '21'), answered(7, 8, '54'), new MadMinuteQuestion(2, 7, 2, Multiplication, 14, undefined, 1000)];
    const settings = new MadMinuteSettings(1, 12, [Multiplication], 30, false);

    it('keeps the table on the record, and nothing extra for an ordinary round', () => {
        expect(buildRoundRecord(settings, questions, 'a', 1, 7)).toMatchObject({ table: 7, minValue: 1, maxValue: 12 });
        expect(buildRoundRecord(settings, questions, 'a', 1)).not.toHaveProperty('table');
        expect(buildRoundRecord(settings, questions, 'a', 1, null)).not.toHaveProperty('table');
    });

    it('survives being saved and read back', () => {
        const record = buildRoundRecord(settings, questions, 'a', 1, 7)!;
        expect(parseHistory(JSON.parse(JSON.stringify([record])))).toEqual([record]);
    });

    it('drops a table that is not a whole number from 1 to 12, and keeps the round', () => {
        const record = buildRoundRecord(settings, questions, 'a', 1, 7)!;
        for (const table of [0, 13, 7.5, '7', null, -3]) {
            const parsed = parseHistory([{ ...record, table }])!;
            expect(parsed).toHaveLength(1);
            expect(parsed[0]).not.toHaveProperty('table');
        }
    });

    it('is old data that has no table at all', () => {
        const record = buildRoundRecord(settings, questions, 'a', 1)!;
        expect(parseHistory([record])![0]).not.toHaveProperty('table');
    });

    it('has its own personal bests, apart from rounds of every table', () => {
        const table = buildRoundRecord(settings, questions, 'a', 1, 7)!;
        const all = buildRoundRecord(settings, questions, 'b', 2)!;
        const other = buildRoundRecord(settings, questions, 'c', 3, 8)!;
        expect(setupKey(table)).not.toBe(setupKey(all));
        expect(setupKey(table)).not.toBe(setupKey(other));
        expect(bestBySetup([table, all, other]).size).toBe(3);
        expect(getBestInfo([all, other], table).previousBest).toBeNull();
        expect(getBestInfo([table], { ...table, id: 'z' }).previousBest?.id).toBe('a');
    });

    it('is named for the table in the list of bests and in a shared score', () => {
        const record = buildRoundRecord(settings, questions, 'a', 1, 7)!;
        expect(setupLabel(record)).toBe('7s table  ·  30 sec');
        expect(resultMessage(record, false, 'ios')).toContain('the 7 times table');
        expect(resultMessage(record, false, 'ios')).not.toContain('numbers 1 to 12');
    });
});

describe('the line under the button', () => {
    it('names the table, or says the usual setup', () => {
        expect(practiceHint(nextPractice({}, new MadMinuteSettings(1, 12, [Multiplication], 60)))).toBe('The 2 times table');
        expect(practiceHint(nextPractice({}, usual))).toBe('Your usual setup');
    });
});

describe('parsing a fact key made for a table', () => {
    it('still reads back', () => {
        expect(parseFactKey('x:7:12')).toEqual({ operator: Multiplication, value1: 7, value2: 12 });
    });
});
