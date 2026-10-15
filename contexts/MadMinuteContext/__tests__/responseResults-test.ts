import { getResponseResults } from '../responseResults';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteQuestion } from '../MadMinuteQuestion';

// A question 1 + 1 = 2 with the given response (undefined = not answered yet).
const question = (id: number, response?: string | null, answer = 2) =>
    new MadMinuteQuestion(id, 1, 1, MadMinuteOperator.Addition, answer, response);

describe('getResponseResults', () => {
    it('counts correct, incorrect and skipped answers', () => {
        const results = getResponseResults([
            question(0, '2'),          // correct
            question(1, '5'),          // wrong
            question(2, ''),           // skipped (submitted blank)
            question(3, '2'),          // correct
            question(4, null),         // skipped
            question(5),               // the question still on screen when time ran out
        ]);
        expect(results).toEqual({ correct: 2, incorrect: 1, skipped: 2 });
    });

    it('does not count the final question, which was shown but never attempted', () => {
        expect(getResponseResults([question(0, '2'), question(1)])).toEqual({ correct: 1, incorrect: 0, skipped: 0 });
        // even if something had been typed into it
        expect(getResponseResults([question(0, '2'), question(1, '9')])).toEqual({ correct: 1, incorrect: 0, skipped: 0 });
    });

    it('is all zeros before any question has been attempted', () => {
        expect(getResponseResults([])).toEqual({ correct: 0, incorrect: 0, skipped: 0 });
        expect(getResponseResults([question(0)])).toEqual({ correct: 0, incorrect: 0, skipped: 0 });
    });

    it('judges a response against the numeric answer, including answers of 0 and negative answers', () => {
        const results = getResponseResults([
            question(0, '0', 0),       // a correct answer of zero is not "skipped"
            question(1, '-4', -4),
            question(2, '4', -4),
            question(3),
        ]);
        expect(results).toEqual({ correct: 2, incorrect: 1, skipped: 0 });
    });

    it('always accounts for every attempted question exactly once', () => {
        const questions = [question(0, '2'), question(1, 'x'), question(2, ''), question(3, '2'), question(4)];
        const { correct, incorrect, skipped } = getResponseResults(questions);
        expect(correct + incorrect + skipped).toBe(questions.length - 1);
    });
});
