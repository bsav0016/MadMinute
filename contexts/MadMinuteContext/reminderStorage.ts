import { loadStored, saveStored, STORAGE_KEYS } from "@/storage/storage";
import { parseReminder, Reminder } from "./reminder";

// The reminder belongs to the device, not to a player: one notification a day, whoever is playing.
export function loadReminder(): Promise<Reminder | null> {
    return loadStored(STORAGE_KEYS.reminder, parseReminder);
}

export function saveReminder(reminder: Reminder): Promise<boolean> {
    return saveStored(STORAGE_KEYS.reminder, reminder);
}
