import { REMINDER_BODY, REMINDER_TITLE } from "./reminder";

// The only place that talks to expo-notifications. The module is loaded when it is first needed, not when the app
// starts, so a player who never turns reminders on never loads it, and a build or runtime that lacks it cannot stop
// the app from opening. Everything here fails quietly: a reminder that cannot be set is not worth interrupting a child.

type NotificationsModule = typeof import("expo-notifications");

let cached: NotificationsModule | null | undefined;

function notifications(): NotificationsModule | null {
    if (cached === undefined) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            cached = require("expo-notifications") as NotificationsModule;
        } catch {
            cached = null;
        }
    }
    return cached;
}

// Failures are not shown to the player, but a developer should be able to see why a reminder did not arrive.
function warn(what: string, error: unknown) {
    if (__DEV__) console.warn(`[reminders] ${what}:`, error);
}

export type PermissionState = "granted" | "denied" | "unavailable";

/** Whether notifications are allowed, asking only if `ask` is true and the phone still lets the app ask. The system
 *  prompt is the player's choice, and it is shown only when they turn the reminder on. */
export async function reminderPermission(ask: boolean): Promise<PermissionState> {
    const module = notifications();
    if (!module) return "unavailable";
    try {
        const current = await module.getPermissionsAsync();
        if (current.granted) return "granted";
        if (!ask || current.canAskAgain === false) return "denied";
        const asked = await module.requestPermissionsAsync();
        return asked.granted ? "granted" : "denied";
    } catch (error) {
        warn("could not read or ask for the permission", error);
        return "unavailable";
    }
}

/** Replaces every scheduled reminder with one at each given time. An empty list switches them all off. */
export async function setScheduledReminders(times: number[]): Promise<boolean> {
    const module = notifications();
    if (!module) return false;
    try {
        await module.cancelAllScheduledNotificationsAsync();
        if (times.length === 0) return true;
        for (const time of times) {
            await module.scheduleNotificationAsync({
                content: { title: REMINDER_TITLE, body: REMINDER_BODY },
                trigger: { type: module.SchedulableTriggerInputTypes.DATE, date: time },
            });
        }
        return true;
    } catch (error) {
        warn("could not schedule reminders", error);
        return false;
    }
}
