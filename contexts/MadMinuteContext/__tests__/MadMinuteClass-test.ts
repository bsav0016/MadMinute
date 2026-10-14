import { MadMinuteClass } from '../MadMinuteClass';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteSettings } from '../MadMinuteSettings';

const RUNS = 500;

const generate = (operator: MadMinuteOperator, min: number, max: number) => {
    const game = new MadMinuteClass(new MadMinuteSettings(min, max, [operator]));
    return Array.from({ length: RUNS }, () => game.generateNewQuestion());
};

describe('MadMinuteClass.generateNewQuestion', () => {
    it('numbers questions by how many already exist', () => {
        const game = new MadMinuteClass();
        expect(game.generateNewQuestion().id).toBe(0);
        game.questions.push(game.generateNewQuestion());
        expect(game.generateNewQuestion().id).toBe(1);
    });

    it('only uses the operators that were selected', () => {
        const operators = [MadMinuteOperator.Addition, MadMinuteOperator.Multiplication];
        const game = new MadMinuteClass(new MadMinuteSettings(1, 12, operators));
        for (let i = 0; i < RUNS; i++) {
            expect(operators).toContain(game.generateNewQuestion().operator);
        }
    });

    it('adds correctly and stays inside the range', () => {
        for (const q of generate(MadMinuteOperator.Addition, 2, 15)) {
            expect(q.answer).toBe(q.value1 + q.value2);
            expect(q.value1).toBeGreaterThanOrEqual(2);
            expect(q.value1).toBeLessThanOrEqual(15);
            expect(q.value2).toBeGreaterThanOrEqual(2);
            expect(q.value2).toBeLessThanOrEqual(15);
        }
    });

    it('multiplies correctly', () => {
        for (const q of generate(MadMinuteOperator.Multiplication, 1, 12)) {
            expect(q.answer).toBe(q.value1 * q.value2);
        }
    });

    it('never produces a negative subtraction answer', () => {
        for (const q of generate(MadMinuteOperator.Subtraction, 0, 20)) {
            expect(q.answer).toBe(q.value1 - q.value2);
            expect(q.answer).toBeGreaterThanOrEqual(0);
            expect(q.value1).toBeLessThanOrEqual(20);
        }
    });

    it('produces exact whole-number division with no divide-by-zero', () => {
        for (const q of generate(MadMinuteOperator.Division, 0, 20)) {
            expect(q.value2).toBeGreaterThan(0);
            expect(q.value1 % q.value2).toBe(0);
            expect(q.answer).toBe(q.value1 / q.value2);
        }
    });

    it('still produces valid division when the minimum is above 1', () => {
        for (const q of generate(MadMinuteOperator.Division, 4, 24)) {
            expect(Number.isInteger(q.value1)).toBe(true);
            expect(Number.isInteger(q.value2)).toBe(true);
            expect(q.value1 % q.value2).toBe(0);
        }
    });
});

describe('MadMinuteQuestion', () => {
    it('stores the response it is given', () => {
        const q = new MadMinuteClass().generateNewQuestion();
        q.updateResponse('42');
        expect(q.response).toBe('42');
    });
});
