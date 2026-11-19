import { loadStored, removeStored, saveStored } from "@/storage/storage";
import { DEFAULT_PROFILE_ID, profileKeys } from "@/storage/profiles";
import { FactStats, parseFacts } from "./factStats";

export function loadFacts(profileId: string = DEFAULT_PROFILE_ID): Promise<FactStats | null> {
    return loadStored(profileKeys(profileId).facts, parseFacts);
}

export function saveFacts(facts: FactStats, profileId: string = DEFAULT_PROFILE_ID): Promise<boolean> {
    return saveStored(profileKeys(profileId).facts, facts);
}

export function clearFacts(profileId: string = DEFAULT_PROFILE_ID): Promise<void> {
    return removeStored(profileKeys(profileId).facts);
}
