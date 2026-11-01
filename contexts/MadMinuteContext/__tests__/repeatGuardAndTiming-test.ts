import { MadMinuteClass } from '../MadMinuteClass';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteQuestion, isSameFact } from '../MadMinuteQuestion';
import { MadMinuteSettings } from '../MadMinuteSettings';

const ask = (operator: MadMinuteOperator, value1: number, value2: number, answer: number) =>
    new MadMinuteQuestion(0, value1, value2, operator, answer);

describe('isSameFact', () => {
    it('treats adding or multiplying the other way round as the same fact', () => {
        expect(isSameFact(ask(MadMinuteOperator.Addition, 3, 4, 7), ask(MadMinuteOperator.Addition, 4, 3, 7))).toBe(true);
        expect(isSameFact(ask(MadMinuteOperator.Multiplication, 7, 8, 56), ask(MadMinuteOperator.Multiplication, 8, 7, 56))).toBe(true);
    });

    it('keeps subtraction and division in order', () => {
        expect(isSameFact(ask(MadMinuteOperator.Subtraction, 9, 4, 5), ask(MadMinuteOperator.Subtraction, 4, 9, -5))).toBe(false);
        expect(isSameFact(ask(MadMinuteOperator.Division, 12, 3, 4), ask(MadMinuteOperator.Division, 3, 12, 0))).toBe(false);
    });

    it('tells apart different numbers and different operators', () => {
        expect(isSameFact(ask(MadMinuteOperator.Addition, 3, 4, 7), ask(MadMinuteOperator.Addition, 3, 5, 8))).toBe(false);
        expect(isSameFact(ask(MadMinuteOperator.Addition, 2, 2, 4), ask(MadMinuteOperator.Multiplication, 2, 2, 4))).toBe(false);
    });
});

describe('the no-repeat guard', () => {
    const next = (game: MadMinuteClass) => {
        const question = game.generateNewQuestion();
        game.questions.push(question);
        return question;
    };

    it('never asks the same fact twice in a row', () => {
        const operators = [MadMinuteOperator.Addition, MadMinuteOperator.Multiplication, MadMinuteOperator.Subtraction, MadMinuteOperator.Division];
        const game = new MadMinuteClass(new MadMinuteSettings(1, 6, operators));
        let previous = next(game);
        for (let i = 0; i < 3000; i++) {
            const question = next(game);
            expect(isSameFact(previous, question)).toBe(false);
            previous = question;
        }
    });

    it('also avoids the swapped version, in a range so small repeats would be common', () => {
        const game = new MadMinuteClass(new MadMinuteSettings(0, 1, [MadMinuteOperator.Multiplication]));
        let previous = next(game);
        for (let i = 0; i < 2000; i++) {
            const question = next(game);
            expect(isSameFact(previous, question)).toBe(false);
            previous = question;
        }
    });

    it('still ends, repeating, when only one question is possible', () => {
        const game = new MadMinuteClass(new MadMinuteSettings(5, 5, [MadMinuteOperator.Addition]));
        const first = next(game);
        const second = next(game);
        expect([first.value1, first.value2, second.value1, second.value2]).toEqual([5, 5, 5, 5]);
    });
});

describe('question timing', () => {
    it('stamps the moment a question was made as the moment it was shown', () => {
        expect(new MadMinuteClass().generateNewQuestion(123456).shownAt).toBe(123456);
    });

    it('measures how long an answer took', () => {
        const question = new MadMinuteQuestion(0, 7, 8, MadMinuteOperator.Multiplication, 56, undefined, 1000)
            .withResponse('56', 3500);
        expect(question.responseMs()).toBe(2500);
    });

    it('has no time for a skip, a question still on screen, or one with no timing', () => {
        const shown = new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, undefined, 1000);
        expect(shown.responseMs()).toBeNull();
        expect(shown.withResponse('', 2000).responseMs()).toBeNull();
        expect(new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, '3').responseMs()).toBeNull();
    });

    it('never reports a negative time if the clock moved back', () => {
        const question = new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, undefined, 5000).withResponse('3', 4000);
        expect(question.responseMs()).toBe(0);
    });

    it('keeps the other fields when it is copied', () => {
        const copy = new MadMinuteQuestion(4, 6, 7, MadMinuteOperator.Multiplication, 42).withShownAt(10).withResponse('42', 20);
        expect([copy.id, copy.value1, copy.value2, copy.operator, copy.answer, copy.response, copy.shownAt, copy.answeredAt])
            .toEqual([4, 6, 7, MadMinuteOperator.Multiplication, 42, '42', 10, 20]);
    });
});
