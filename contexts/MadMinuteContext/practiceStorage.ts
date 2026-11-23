import { loadStored, removeStored, saveStored } from "@/storage/storage";
import { DEFAULT_PROFILE_ID, profileKeys } from "@/storage/profiles";
import { parsePractice, PracticeRecord } from "./practice";

export function loadPractice(profileId: string = DEFAULT_PROFILE_ID): Promise<PracticeRecord | null> {
    return loadStored(profileKeys(profileId).practice, parsePractice);
}

export function savePractice(practice: PracticeRecord, profileId: string = DEFAULT_PROFILE_ID): Promise<boolean> {
    return saveStored(profileKeys(profileId).practice, practice);
}

export function clearPractice(profileId: string = DEFAULT_PROFILE_ID): Promise<void> {
    return removeStored(profileKeys(profileId).practice);
}
