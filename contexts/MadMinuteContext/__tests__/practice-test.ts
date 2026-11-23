import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { FactStat, FactStats } from '../factStats';
import {
    allTableStatuses, dayNumber, dayString, emptyPractice, goalProgress, KNOWN_SHARE, levelUps, MAX_CLOCK_SKEW_DAYS,
    nextPractice, nextTable, parsePractice, PracticeRecord, recordPracticeRound, streakView, TABLE_FACTS, tableMastery,
    tableStatus, withGoal,
} from '../practice';

// A moment on the device calendar, so the tests mean the same in any time zone.
const at = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour).getTime();
const play = (record: PracticeRecord, ...times: number[]) => times.reduce(recordPracticeRound, record);

describe('days', () => {
    it('are written in the device calendar', () => {
        expect(dayString(at(2026, 11, 23, 23))).toBe('2026-11-23');
        expect(dayString(at(2026, 11, 24, 0))).toBe('2026-11-24');
        expect(dayString(at(2026, 1, 5, 9))).toBe('2026-01-05');
    });

    it('are counted one apart across a daylight saving change', () => {
        for (const [y, m, d] of [[2026, 3, 8], [2026, 11, 1], [2026, 3, 29], [2026, 10, 25]]) {
            const a = dayNumber(dayString(at(y, m, d, 12)))!;
            const b = dayNumber(dayString(at(y, m, d + 1, 12)))!;
            expect(b - a).toBe(1);
        }
    });

    it('refuse text that is not a real date', () => {
        for (const bad of ['', '2026-13-01', '2026-02-30', '26-11-23', '2026-11-3', 'today', '2026/11/23']) {
            expect(dayNumber(bad)).toBeNull();
        }
        expect(dayNumber('2028-02-29')).not.toBeNull();
    });
});

// 23 November 2026 is a Monday, so Mon 23 / Tue 24 / Wed 25 / Thu 26 / Fri 27 / Sat 28 / Sun 29 are one week.
describe('the streak', () => {
    it('starts at one with the first round and counts a second round the same day once', () => {
        const record = play(emptyPractice(), at(2026, 11, 23, 8), at(2026, 11, 23, 20));
        expect(record.streak).toEqual({ current: 1, longest: 1, lastDay: '2026-11-23' });
        expect(record.today).toEqual({ day: '2026-11-23', rounds: 2 });
    });

    it('grows by one for each day in a row, including across a month end', () => {
        const record = play(emptyPractice(), at(2026, 10, 30), at(2026, 10, 31), at(2026, 11, 1), at(2026, 11, 2));
        expect(record.streak.current).toBe(4);
        expect(record.streak.longest).toBe(4);
        expect(record.today).toEqual({ day: '2026-11-02', rounds: 1 });
    });

    it('treats a round just before midnight and one just after as two days', () => {
        const record = play(emptyPractice(), new Date(2026, 10, 23, 23, 59).getTime(), new Date(2026, 10, 24, 0, 1).getTime());
        expect(record.streak.current).toBe(2);
    });

    it('is carried over one missed day by the rest day, and keeps going', () => {
        const record = play(emptyPractice(), at(2026, 11, 23), at(2026, 11, 25));
        expect(record.streak.current).toBe(2);
        expect(record.restWeek).not.toBeNull();
    });

    it('gives only one rest day a week: a second missed day in the same week starts again', () => {
        // Mon played, Tue missed (rest), Wed played, Thu missed (no rest left), Fri played.
        const record = play(emptyPractice(), at(2026, 11, 23), at(2026, 11, 25), at(2026, 11, 27));
        expect(record.streak.current).toBe(1);
        expect(record.streak.longest).toBe(2);
    });

    it('gives the rest day back in the next week', () => {
        // Fri 20 -> Sun 22 misses Sat 21 (rest used for that week). Sun 22 -> Tue 24 misses Mon 23, a new week: rest again.
        const record = play(emptyPractice(), at(2026, 11, 20), at(2026, 11, 22), at(2026, 11, 24));
        expect(record.streak.current).toBe(3);
        // Tue 24 -> Thu 26 would miss Wed 25, the same week as Mon 23, whose rest day is used.
        expect(play(record, at(2026, 11, 26)).streak.current).toBe(1);
    });

    it('is reset by two or more missed days in a row, and the longest is kept', () => {
        const record = play(emptyPractice(), at(2026, 11, 2), at(2026, 11, 3), at(2026, 11, 4), at(2026, 11, 8));
        expect(record.streak.current).toBe(1);
        expect(record.streak.longest).toBe(3);
        expect(record.today).toEqual({ day: '2026-11-08', rounds: 1 });
    });

    it('is not reduced by a clock set back', () => {
        const record = play(emptyPractice(), at(2026, 11, 2), at(2026, 11, 3), at(2026, 11, 1));
        expect(record.streak).toEqual({ current: 2, longest: 2, lastDay: '2026-11-03' });
        expect(record.today).toEqual({ day: '2026-11-03', rounds: 2 });
    });

    it('does not freeze for good after a clock set far forward', () => {
        const record = play(emptyPractice(), at(2026, 11, 2), at(2026, 11, 3));
        const ahead = play(record, at(2026, 11, 3 + MAX_CLOCK_SKEW_DAYS + 5));
        expect(ahead.streak.lastDay).toBe('2026-11-15');
        // The clock goes back to the real date: too far behind to be a small slip, so the streak starts again.
        const back = play(ahead, at(2026, 11, 4));
        expect(back.streak).toMatchObject({ current: 1, lastDay: '2026-11-04' });
    });

    it('does not change the record it was given', () => {
        const before = emptyPractice();
        const frozen = JSON.stringify(before);
        play(before, at(2026, 11, 2), at(2026, 11, 3));
        expect(JSON.stringify(before)).toBe(frozen);
    });
});

describe('how the streak looks now', () => {
    const record = play(emptyPractice(), at(2026, 11, 23), at(2026, 11, 24));

    it('is none before any round', () => {
        expect(streakView(emptyPractice(), at(2026, 11, 24))).toEqual({ days: 0, state: 'none' });
    });

    it('is kept on a day a round was played', () => {
        expect(streakView(record, at(2026, 11, 24, 22))).toEqual({ days: 2, state: 'kept' });
    });

    it('is ready the day after, with the streak still showing', () => {
        expect(streakView(record, at(2026, 11, 25, 7))).toEqual({ days: 2, state: 'ready' });
    });

    it('is resting after one missed day when the week still has its rest day', () => {
        expect(streakView(record, at(2026, 11, 26))).toEqual({ days: 2, state: 'resting' });
    });

    it('is none after the rest day is used up or too many days pass', () => {
        expect(streakView(record, at(2026, 11, 27))).toEqual({ days: 0, state: 'none' });
        const used = play(emptyPractice(), at(2026, 11, 23), at(2026, 11, 25));
        expect(streakView(used, at(2026, 11, 27))).toEqual({ days: 0, state: 'none' });
    });

    it('does not change the record (it only resets when the next round is played)', () => {
        const frozen = JSON.stringify(record);
        streakView(record, at(2026, 12, 25));
        expect(JSON.stringify(record)).toBe(frozen);
    });

    it('is kept when the clock is behind the last day', () => {
        expect(streakView(record, at(2026, 11, 20)).state).toBe('kept');
    });
});

describe('the daily goal', () => {
    it('counts only the rounds of today', () => {
        const record = withGoal(play(emptyPractice(), at(2026, 11, 23), at(2026, 11, 24, 8)), 2);
        expect(goalProgress(record, at(2026, 11, 24, 20))).toEqual({ done: 1, goal: 2, met: false });
        expect(goalProgress(play(record, at(2026, 11, 24, 9)), at(2026, 11, 24, 20))).toEqual({ done: 2, goal: 2, met: true });
        expect(goalProgress(record, at(2026, 11, 25))).toEqual({ done: 0, goal: 2, met: false });
    });

    it('is met by one round by default, and keeps the choice of the player as days pass', () => {
        expect(goalProgress(play(emptyPractice(), at(2026, 11, 23)), at(2026, 11, 23)).met).toBe(true);
        const chosen = play(withGoal(emptyPractice(), 3), at(2026, 11, 23), at(2026, 11, 24));
        expect(chosen.goal).toBe(3);
    });
});

describe('parsePractice', () => {
    const good = play(withGoal(emptyPractice(), 2), at(2026, 11, 23), at(2026, 11, 25));

    it('reads what was saved', () => {
        expect(parsePractice(JSON.parse(JSON.stringify(good)))).toEqual(good);
    });

    it('refuses anything that is not an object', () => {
        for (const bad of [null, 5, 'x', [], undefined]) expect(parsePractice(bad)).toBeNull();
    });

    it('falls back to the defaults for an empty object', () => {
        expect(parsePractice({})).toEqual(emptyPractice());
    });

    it('resets a goal that is not one of the options', () => {
        for (const goal of [0, 4, 1.5, '2', null]) expect(parsePractice({ ...good, goal })!.goal).toBe(1);
    });

    it('drops a streak that cannot be right', () => {
        const bad = [
            { current: 3, longest: 2, lastDay: '2026-11-23' },
            { current: -1, longest: 5, lastDay: '2026-11-23' },
            { current: 2, longest: 5, lastDay: '2026-02-30' },
            { current: 2, longest: 5, lastDay: 20261123 },
            { current: 2.5, longest: 5, lastDay: '2026-11-23' },
        ];
        for (const streak of bad) {
            const parsed = parsePractice({ ...good, streak })!;
            expect(parsed.streak.current).toBe(0);
            expect(parsed.streak.lastDay).toBeNull();
        }
        expect(parsePractice({ ...good, streak: { current: 2, longest: 1e9, lastDay: '2026-11-23' } })!.streak.longest).toBe(0);
    });

    it('drops a today entry that is not real', () => {
        for (const today of [{ day: 'x', rounds: 1 }, { day: '2026-11-23', rounds: 0 }, { day: '2026-11-23', rounds: -2 }, 'a', { day: '2026-11-23' }]) {
            expect(parsePractice({ ...good, today })!.today).toBeNull();
        }
    });

    it('drops a rest week that is not a whole number', () => {
        for (const restWeek of [-1, 1.5, '3', 1e12, null]) expect(parsePractice({ ...good, restWeek })!.restWeek).toBeNull();
    });
});

// ---------------------------------------------------------------------------------------------------------------

const stat = (attempts: number, correct = attempts, timedCorrect = correct, correctMs = timedCorrect * 2000): FactStat =>
    ({ attempts, correct, timedCorrect, correctMs, lastSeen: 1 });
const tableFacts = (table: number, make: (n: number) => FactStat | null): FactStats => {
    const facts: FactStats = {};
    for (let n = 1; n <= TABLE_FACTS; n++) {
        const a = Math.min(table, n);
        const b = Math.max(table, n);
        const s = make(n);
        if (s) facts[`x:${a}:${b}`] = s;
    }
    return facts;
};

describe('times-table levels', () => {
    it('are new with no record of the table', () => {
        expect(tableMastery({}, 7)).toBe('new');
        expect(tableMastery({ '+:1:1': stat(5) }, 7)).toBe('new');
    });

    it('are learning once some facts have been asked', () => {
        expect(tableMastery(tableFacts(7, n => (n < 3 ? stat(1) : null)), 7)).toBe('learning');
    });

    it('count a fact asked as 8 x 7 or 7 x 8 as one fact of both tables', () => {
        const facts = { 'x:7:8': stat(3) };
        expect(tableStatus(facts, 7).started).toBe(1);
        expect(tableStatus(facts, 8).started).toBe(1);
        expect(tableStatus(facts, 9).started).toBe(0);
    });

    it('are known when enough facts are solid, and not before', () => {
        const need = Math.ceil(TABLE_FACTS * KNOWN_SHARE);
        expect(tableMastery(tableFacts(6, n => (n <= need ? stat(2) : null)), 6)).toBe('known');
        expect(tableMastery(tableFacts(6, n => (n <= need - 1 ? stat(2) : null)), 6)).toBe('learning');
    });

    it('are not known when the facts are missed', () => {
        expect(tableMastery(tableFacts(6, () => stat(5, 1)), 6)).toBe('learning');
    });

    it('are mastered when every fact has been asked three times and answered well', () => {
        expect(tableMastery(tableFacts(4, () => stat(3)), 4)).toBe('mastered');
    });

    it('are known, not mastered, with one fact missing or asked only twice or answered slowly', () => {
        expect(tableMastery(tableFacts(4, n => (n === 5 ? null : stat(3))), 4)).toBe('known');
        expect(tableMastery(tableFacts(4, n => stat(n === 5 ? 2 : 3)), 4)).toBe('known');
        // One fact is answered right every time but far slower than the rest.
        const slow = tableFacts(4, n => (n === 5 ? stat(3, 3, 3, 3 * 20_000) : stat(3, 3, 3, 3 * 1000)));
        expect(tableMastery(slow, 4)).toBe('known');
    });

    it('judges all eleven tables at once', () => {
        const facts = { ...tableFacts(2, () => stat(3)), ...tableFacts(3, n => (n === 5 || n === 12 ? stat(1) : null)) };
        const levels = Object.fromEntries(allTableStatuses(facts).map(s => [s.table, s.level]));
        expect(levels[2]).toBe('mastered');
        expect(levels[3]).toBe('learning');
        expect(levels[12]).toBe('learning'); // 3 x 12 is a fact of both tables
        expect(levels[5]).toBe('learning');
        expect(Object.keys(levels)).toHaveLength(11);
    });

    it('report a rise and nothing else', () => {
        const before = tableFacts(7, n => (n < 4 ? stat(1) : null));
        const after = tableFacts(7, () => stat(3));
        expect(levelUps(before, after).map(s => [s.table, s.level])).toContainEqual([7, 'mastered']);
        expect(levelUps(after, before)).toEqual([]);
        expect(levelUps(after, after)).toEqual([]);
    });
});

describe('practice for today', () => {
    const settings = (operators: MadMinuteOperator[], min = 0, max = 20, duration = 60) =>
        new MadMinuteSettings(min, max, operators, duration);
    const { Addition, Multiplication, Division } = MadMinuteOperator;

    it('leaves the setup of the player alone when they do not play with multiplication', () => {
        const setup = nextPractice({}, settings([Addition], 0, 10, 30));
        expect(setup).toEqual({ minValue: 0, maxValue: 10, availableOperators: [Addition], durationSeconds: 30, table: null });
    });

    it('starts a new multiplication player on the 2s and keeps their round length', () => {
        const setup = nextPractice({}, settings([Multiplication, Division], 1, 12, 120));
        expect(setup).toEqual({ minValue: 1, maxValue: 12, availableOperators: [Multiplication], durationSeconds: 120, table: 2 });
    });

    it('finishes a table that is started before opening a new one, the most solid first', () => {
        const facts = { ...tableFacts(7, n => (n < 4 ? stat(2) : null)), ...tableFacts(9, n => (n < 9 ? stat(2) : null)) };
        expect(nextTable(facts)).toBe(9);
    });

    it('moves to the next new table in teaching order when the tables so far are known', () => {
        // 2 and 5 are mastered; their facts also count towards 3, 4, 6... but only a little, so 10 comes next in order.
        const facts = { ...tableFacts(2, () => stat(3)), ...tableFacts(5, () => stat(3)), ...tableFacts(10, () => stat(3)) };
        const next = nextTable(facts);
        expect(next).not.toBeNull();
        expect([2, 5, 10]).not.toContain(next);
    });

    it('has no table to suggest when every table is known', () => {
        let facts: FactStats = {};
        for (let table = 2; table <= 12; table++) facts = { ...facts, ...tableFacts(table, () => stat(3)) };
        expect(nextTable(facts)).toBeNull();
        expect(nextPractice(facts, settings([Multiplication], 1, 12)).table).toBeNull();
    });
});
