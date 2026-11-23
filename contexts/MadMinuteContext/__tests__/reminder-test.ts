import {
    DEFAULT_REMINDER, parseReminder, Reminder, REMINDER_DAYS, reminderTimeText, stepReminder, upcomingReminders,
} from '../reminder';

const at = (month: number, day: number, hour = 12, minute = 0) => new Date(2026, month - 1, day, hour, minute).getTime();
const on = (hour: number, minute = 0): Reminder => ({ enabled: true, hour, minute });

describe('reminder defaults', () => {
    it('is off, at 4 in the afternoon', () => {
        expect(DEFAULT_REMINDER).toEqual({ enabled: false, hour: 16, minute: 0 });
    });
});

describe('parseReminder', () => {
    it('reads what was saved', () => {
        expect(parseReminder({ enabled: true, hour: 7, minute: 45 })).toEqual({ enabled: true, hour: 7, minute: 45 });
        expect(parseReminder({ enabled: false, hour: 0, minute: 0 })).toEqual({ enabled: false, hour: 0, minute: 0 });
    });

    it('refuses anything that is not an object', () => {
        for (const bad of [null, undefined, 5, 'on', [], true]) expect(parseReminder(bad)).toBeNull();
    });

    it('is on only when the saved value is exactly true', () => {
        for (const enabled of ['true', 1, 'yes', null, undefined, {}]) {
            expect(parseReminder({ enabled, hour: 8, minute: 0 })!.enabled).toBe(false);
        }
    });

    it('turns itself off and uses the default time when the time is not a real time', () => {
        for (const time of [{ hour: 24, minute: 0 }, { hour: -1, minute: 0 }, { hour: 8, minute: 60 }, { hour: 8.5, minute: 0 }, { hour: '8', minute: 0 }, {}]) {
            expect(parseReminder({ enabled: true, ...time })).toEqual({ enabled: false, hour: 16, minute: 0 });
        }
    });
});

describe('reminderTimeText', () => {
    it('writes the time the way people say it', () => {
        expect(reminderTimeText({ hour: 16, minute: 0 })).toBe('4:00 pm');
        expect(reminderTimeText({ hour: 7, minute: 5 })).toBe('7:05 am');
        expect(reminderTimeText({ hour: 0, minute: 0 })).toBe('12:00 am');
        expect(reminderTimeText({ hour: 12, minute: 30 })).toBe('12:30 pm');
        expect(reminderTimeText({ hour: 23, minute: 59 })).toBe('11:59 pm');
    });
});

describe('stepReminder', () => {
    it('moves by an hour or a quarter of an hour', () => {
        expect(stepReminder(on(16), 60)).toEqual(on(17));
        expect(stepReminder(on(16), -15)).toEqual(on(15, 45));
        expect(stepReminder(on(16, 45), 15)).toEqual(on(17));
    });

    it('wraps round midnight in both directions', () => {
        expect(stepReminder(on(23, 45), 15)).toEqual(on(0));
        expect(stepReminder(on(0), -15)).toEqual(on(23, 45));
        expect(stepReminder(on(23), 60)).toEqual(on(0));
        expect(stepReminder(on(0), -60)).toEqual(on(23));
    });

    it('keeps whether it is on, and does not change the reminder it was given', () => {
        const before = { enabled: false, hour: 9, minute: 0 };
        expect(stepReminder(before, 60).enabled).toBe(false);
        expect(before).toEqual({ enabled: false, hour: 9, minute: 0 });
    });
});

describe('upcomingReminders', () => {
    it('is nothing when the reminder is off', () => {
        expect(upcomingReminders({ ...on(16), enabled: false }, at(11, 23, 9), false)).toEqual([]);
    });

    it('is the chosen time on each of the next seven days, starting today when it is still ahead', () => {
        const times = upcomingReminders(on(16), at(11, 23, 9), false);
        expect(times).toHaveLength(REMINDER_DAYS);
        expect(times[0]).toBe(at(11, 23, 16));
        expect(times[6]).toBe(at(11, 29, 16));
        expect([...times].sort((a, b) => a - b)).toEqual(times);
    });

    it('leaves out today once the time has passed, and starts tomorrow', () => {
        const times = upcomingReminders(on(16), at(11, 23, 17), false);
        expect(times[0]).toBe(at(11, 24, 16));
        expect(times).toHaveLength(REMINDER_DAYS - 1);
    });

    it('leaves out a time less than a minute away', () => {
        expect(upcomingReminders(on(16), at(11, 23, 15, 59) + 30_000, false)[0]).toBe(at(11, 24, 16));
        expect(upcomingReminders(on(16), at(11, 23, 15, 57), false)[0]).toBe(at(11, 23, 16));
    });

    it('leaves out today when the goal is already done, whatever the time', () => {
        const times = upcomingReminders(on(16), at(11, 23, 9), true);
        expect(times[0]).toBe(at(11, 24, 16));
        expect(times).toHaveLength(REMINDER_DAYS - 1);
    });

    it('goes over a month end and a year end', () => {
        const times = upcomingReminders(on(8), new Date(2026, 11, 29, 20).getTime(), false);
        expect(times.map(t => new Date(t).toDateString())).toEqual([
            new Date(2026, 11, 30).toDateString(), new Date(2026, 11, 31).toDateString(), new Date(2027, 0, 1).toDateString(),
            new Date(2027, 0, 2).toDateString(), new Date(2027, 0, 3).toDateString(), new Date(2027, 0, 4).toDateString(),
        ]);
    });

    it('keeps the same time on the clock across a daylight saving change', () => {
        // The weeks around the spring and autumn changes in the US and in Europe: every reminder is at 8:00 local.
        for (const [month, day] of [[3, 5], [10, 28], [3, 25], [11, 1]]) {
            const times = upcomingReminders(on(8), new Date(2026, month - 1, day, 20).getTime(), false);
            expect(times.length).toBeGreaterThan(0);
            for (const time of times) {
                expect(new Date(time).getHours()).toBe(8);
                expect(new Date(time).getMinutes()).toBe(0);
            }
        }
    });

    it('runs from the day it is asked, not a fixed length of time ahead', () => {
        const times = upcomingReminders(on(0), at(11, 23, 9), false, 3);
        expect(times).toEqual([at(11, 24, 0), at(11, 25, 0)]);
    });
});
