import { loadStored, removeStored, saveStored, STORAGE_KEYS } from "@/storage/storage";
import { FactStats, parseFacts } from "./factStats";

export function loadFacts(): Promise<FactStats | null> {
    return loadStored(STORAGE_KEYS.facts, parseFacts);
}

export function saveFacts(facts: FactStats): Promise<boolean> {
    return saveStored(STORAGE_KEYS.facts, facts);
}

export function clearFacts(): Promise<void> {
    return removeStored(STORAGE_KEYS.facts);
}
