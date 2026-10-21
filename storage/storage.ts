import AsyncStorage from "@react-native-async-storage/async-storage";

// Everything is stored as { v, data } so a later release can change the shape of its data without misreading old saves.
export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
    settings: "madminute.settings",
} as const;

// Returns the stored data, or null if it is missing, unreadable or from another version.
export function parseStored(raw: string | null): unknown | null {
    if (raw === null) return null;
    try {
        const envelope = JSON.parse(raw);
        if (envelope === null || typeof envelope !== "object" || envelope.v !== STORAGE_VERSION) return null;
        return envelope.data ?? null;
    } catch {
        return null;
    }
}

// Storage can fail (full disk, corrupt value, web private mode), and none of that should ever break the game, so
// reads fall back to null and writes report whether they worked.
export async function loadStored<T>(key: string, validate: (data: unknown) => T | null): Promise<T | null> {
    try {
        const data = parseStored(await AsyncStorage.getItem(key));
        return data === null ? null : validate(data);
    } catch {
        return null;
    }
}

export async function saveStored(key: string, data: unknown): Promise<boolean> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, data }));
        return true;
    } catch {
        return false;
    }
}

export async function removeStored(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch {
        // nothing useful to do
    }
}
