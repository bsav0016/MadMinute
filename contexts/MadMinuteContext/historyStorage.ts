import { loadStored, removeStored, saveStored } from "@/storage/storage";
import { DEFAULT_PROFILE_ID, profileKeys } from "@/storage/profiles";
import { parseHistory, RoundRecord } from "./roundRecord";

export function loadHistory(profileId: string = DEFAULT_PROFILE_ID): Promise<RoundRecord[] | null> {
    return loadStored(profileKeys(profileId).history, parseHistory);
}

export function saveHistory(history: RoundRecord[], profileId: string = DEFAULT_PROFILE_ID): Promise<boolean> {
    return saveStored(profileKeys(profileId).history, history);
}

export function clearHistory(profileId: string = DEFAULT_PROFILE_ID): Promise<void> {
    return removeStored(profileKeys(profileId).history);
}
