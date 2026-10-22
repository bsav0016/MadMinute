import { loadStored, removeStored, saveStored, STORAGE_KEYS } from "@/storage/storage";
import { parseHistory, RoundRecord } from "./roundRecord";

export function loadHistory(): Promise<RoundRecord[] | null> {
    return loadStored(STORAGE_KEYS.history, parseHistory);
}

export function saveHistory(history: RoundRecord[]): Promise<boolean> {
    return saveStored(STORAGE_KEYS.history, history);
}

export function clearHistory(): Promise<void> {
    return removeStored(STORAGE_KEYS.history);
}
