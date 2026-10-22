import { addRecord, buildRoundRecord, HISTORY_CAP, parseHistory, RoundRecord } from '../roundRecord';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteQuestion } from '../MadMinuteQuestion';
import { MadMinuteSettings } from '../MadMinuteSettings';

const { Addition, Subtraction, Multiplication } = MadMinuteOperator;

const question = (id: number, operator: MadMinuteOperator, answer: number, response?: string | null) =>
    new MadMinuteQuestion(id, 1, 1, operator, answer, response);

const settings = new MadMinuteSettings(0, 10, [Subtraction, Addition], 60);

const record = (id: string, playedAt = 0): RoundRecord => ({
    id,
    playedAt,
    operators: [Addition],
    minValue: 0,
    maxValue: 10,
    durationSeconds: 60,
    correct: 1,
    incorrect: 0,
    skipped: 0,
    byOperator: { [Addition]: { correct: 1, incorrect: 0, skipped: 0 } },
});

describe('buildRoundRecord', () => {
    it('tallies each operator and ignores the question still on screen', () => {
        const result = buildRoundRecord(settings, [
            question(0, Addition, 2, '2'),
            question(1, Addition, 2, '9'),
            question(2, Subtraction, 0, ''),
            question(3, Subtraction, 0, '0'),
            question(4, Multiplication, 1),
        ], 'r1', 1000);

        expect(result).toEqual({
            id: 'r1',
            playedAt: 1000,
            operators: [Addition, Subtraction],
            minValue: 0,
            maxValue: 10,
            durationSeconds: 60,
            correct: 2,
            incorrect: 1,
            skipped: 1,
            byOperator: {
                [Addition]: { correct: 1, incorrect: 1, skipped: 0 },
                [Subtraction]: { correct: 1, incorrect: 0, skipped: 1 },
            },
        });
    });

    it('returns null when nothing was attempted', () => {
        expect(buildRoundRecord(settings, [], 'r', 0)).toBeNull();
        expect(buildRoundRecord(settings, [question(0, Addition, 2)], 'r', 0)).toBeNull();
    });

    it('lists operators in a fixed order whatever order they were switched on', () => {
        const questions = [question(0, Addition, 2, '2'), question(1, Addition, 2)];
        const a = buildRoundRecord(new MadMinuteSettings(0, 10, [Multiplication, Addition]), questions, 'a', 0);
        const b = buildRoundRecord(new MadMinuteSettings(0, 10, [Addition, Multiplication]), questions, 'b', 0);
        expect(a?.operators).toEqual(b?.operators);
    });

    it('makes the per-operator tallies add up to the totals', () => {
        const result = buildRoundRecord(settings, [
            question(0, Addition, 2, '2'), question(1, Subtraction, 0, '5'), question(2, Addition, 2, ''), question(3, Addition, 2),
        ], 'r', 0)!;
        const tallies = Object.values(result.byOperator);
        expect(tallies.reduce((n, t) => n + t!.correct, 0)).toBe(result.correct);
        expect(tallies.reduce((n, t) => n + t!.incorrect, 0)).toBe(result.incorrect);
        expect(tallies.reduce((n, t) => n + t!.skipped, 0)).toBe(result.skipped);
    });
});

describe('addRecord', () => {
    it('puts the newest first', () => {
        expect(addRecord([record('a')], record('b')).map(r => r.id)).toEqual(['b', 'a']);
    });

    it('does not add the same round twice', () => {
        expect(addRecord([record('a')], record('a')).map(r => r.id)).toEqual(['a']);
    });

    it('keeps only the newest HISTORY_CAP records', () => {
        let history: RoundRecord[] = [];
        for (let i = 0; i < HISTORY_CAP + 5; i++) history = addRecord(history, record(`r${i}`));
        expect(history).toHaveLength(HISTORY_CAP);
        expect(history[0].id).toBe(`r${HISTORY_CAP + 4}`);
        expect(history.at(-1)!.id).toBe('r5');
    });
});

describe('parseHistory', () => {
    it('round-trips records through JSON', () => {
        const history = [record('b'), record('a')];
        expect(parseHistory(JSON.parse(JSON.stringify(history)))).toEqual(history);
    });

    it('returns null when the value is not a list', () => {
        expect(parseHistory(null)).toBeNull();
        expect(parseHistory({})).toBeNull();
        expect(parseHistory('x')).toBeNull();
    });

    it('drops bad or duplicate records and keeps the good ones', () => {
        const good = record('good');
        const parsed = parseHistory([
            good,
            { ...good, id: 'x', correct: -1 },
            { ...good, id: 'y', operators: ['%'] },
            { ...good, id: 'z', durationSeconds: 45 },
            { ...good, id: 'w', byOperator: { '%': { correct: 1, incorrect: 0, skipped: 0 } } },
            { ...good, id: 'v', byOperator: { '+': { correct: 'a' } } },
            { ...good, id: '' },
            null,
            'junk',
            good,
        ]);
        expect(parsed).toEqual([good]);
    });

    it('trims an over-long saved list to the cap', () => {
        const many = Array.from({ length: HISTORY_CAP + 10 }, (_, i) => record(`r${i}`));
        expect(parseHistory(many)).toHaveLength(HISTORY_CAP);
    });
});
