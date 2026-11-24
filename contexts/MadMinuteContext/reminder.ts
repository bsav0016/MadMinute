// The optional daily reminder: a local notification on this device, off until a grown-up or the player turns it on.
// Pure functions: the clock is passed in and nothing here talks to the phone (see notifications.ts for that).
//
// Reminders are not one repeating notification but the next few days scheduled one by one. That lets today's be skipped
// when the goal is already done, and means a phone nobody opens for a week stops reminding on its own.

export interface Reminder {
    enabled: boolean;
    hour: number;   // 0 to 23, the device's local time
    minute: number; // 0 to 59
}

export const DEFAULT_REMINDER: Reminder = { enabled: false, hour: 16, minute: 0 };

/** How many days ahead are scheduled. They are scheduled again whenever the app opens or a round is finished. */
export const REMINDER_DAYS = 7;

/** A reminder this soon is not scheduled, so one never goes off while the app is being switched on. */
const MIN_LEAD_MS = 60_000;

export const REMINDER_TITLE = "Mad Minute";
export const REMINDER_BODY = "Ready for a minute of math practice?";

const isInt = (value: unknown, min: number, max: number): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/** Validates stored data. Anything that is not a reminder gives null; a bad time falls back to the default time, and a
 *  reminder is only on when the saved value is exactly true. */
export function parseReminder(data: unknown): Reminder | null {
    if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
    const { enabled, hour, minute } = data as Record<string, unknown>;
    const validTime = isInt(hour, 0, 23) && isInt(minute, 0, 59);
    return {
        enabled: enabled === true && validTime,
        hour: validTime ? hour : DEFAULT_REMINDER.hour,
        minute: validTime ? minute : DEFAULT_REMINDER.minute,
    };
}

/** "4:00 pm". */
export function reminderTimeText(reminder: Pick<Reminder, "hour" | "minute">): string {
    const hour12 = reminder.hour % 12 === 0 ? 12 : reminder.hour % 12;
    return `${hour12}:${String(reminder.minute).padStart(2, "0")} ${reminder.hour < 12 ? "am" : "pm"}`;
}

/** The reminder moved by some minutes (negative for earlier), wrapping round midnight. */
export function stepReminder(reminder: Reminder, minutes: number): Reminder {
    const total = (((reminder.hour * 60 + reminder.minute + minutes) % 1440) + 1440) % 1440;
    return { ...reminder, hour: Math.floor(total / 60), minute: total % 60 };
}

/** When the reminders should go off, as times in ms, earliest first: the chosen time on each of the next days. Today's
 *  is left out when it has passed or when the goal is already done today. Each is built from the calendar day, so a
 *  daylight saving change moves no reminder off its time. */
export function upcomingReminders(
    reminder: Reminder, now: number, goalMetToday: boolean, days: number = REMINDER_DAYS
): number[] {
    if (!reminder.enabled) return [];
    const start = new Date(now);
    const times: number[] = [];
    for (let i = 0; i < days; i++) {
        if (i === 0 && goalMetToday) continue;
        const at = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, reminder.hour, reminder.minute, 0, 0).getTime();
        if (at > now + MIN_LEAD_MS) times.push(at);
    }
    return times;
}
