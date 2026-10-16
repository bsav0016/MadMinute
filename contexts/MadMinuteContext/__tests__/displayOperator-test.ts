import { MadMinuteOperator, displayOperator } from '../MadMinuteOperator';

describe('displayOperator', () => {
    it('uses typographic symbols for subtraction and multiplication', () => {
        expect(displayOperator(MadMinuteOperator.Subtraction)).toBe('−');
        expect(displayOperator(MadMinuteOperator.Multiplication)).toBe('×');
    });

    it('leaves addition and division as they are', () => {
        expect(displayOperator(MadMinuteOperator.Addition)).toBe('+');
        expect(displayOperator(MadMinuteOperator.Division)).toBe('÷');
    });
});
