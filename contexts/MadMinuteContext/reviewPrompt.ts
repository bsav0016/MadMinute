import * as StoreReview from "expo-store-review";
import { loadStored, saveStored, STORAGE_KEYS } from "@/storage/storage";
import { BestInfo } from "./personalBest";
import { RoundRecord } from "./roundRecord";

// The app asks for a rating at a good moment only: right after the player beats their own best score, once they have
// played enough to have an opinion, and rarely. The OS limits requests as well (iOS shows the dialog at most three
// times a year), so this is deliberately more careful than it has to be.
export const MIN_ROUNDS = 5;
export const MIN_DAYS_SINCE_FIRST_ROUND = 2;
export const MIN_DAYS_BETWEEN_ASKS = 120;
export const MAX_ASKS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewState {
    askedAt: number[]; // ms since 1970, oldest first
}

export const EMPTY_REVIEW_STATE: ReviewState = { askedAt: [] };

export function parseReviewState(data: unknown): ReviewState | null {
    if (data === null || typeof data !== "object") return null;
    const askedAt = (data as { askedAt?: unknown }).askedAt;
    if (!Array.isArray(askedAt) || !askedAt.every((t) => typeof t === "number" && Number.isFinite(t))) return null;
    return { askedAt: askedAt.slice(-MAX_ASKS) };
}

export function shouldAskForReview(history: RoundRecord[], best: BestInfo | null, state: ReviewState, now: number): boolean {
    // A first-ever score is always a "best", so only beating a real earlier score counts as a good moment.
    if (!best?.isNewBest || best.previousBest === null) return false;
    if (history.length < MIN_ROUNDS) return false;
    const firstPlayed = Math.min(...history.map((r) => r.playedAt));
    if (now - firstPlayed < MIN_DAYS_SINCE_FIRST_ROUND * DAY_MS) return false;
    if (state.askedAt.length >= MAX_ASKS) return false;
    const last = state.askedAt[state.askedAt.length - 1];
    return last === undefined || now - last >= MIN_DAYS_BETWEEN_ASKS * DAY_MS;
}

// Asks the OS to show its rating dialog if the moment is right. The OS decides whether it really appears, so the ask is
// counted as soon as it is made. Never throws: a rating prompt must not be able to break the results screen.
export async function maybeRequestReview(history: RoundRecord[], best: BestInfo | null, now = Date.now()): Promise<boolean> {
    try {
        const state = (await loadStored(STORAGE_KEYS.review, parseReviewState)) ?? EMPTY_REVIEW_STATE;
        if (!shouldAskForReview(history, best, state, now)) return false;
        if (!(await StoreReview.isAvailableAsync())) return false;
        await saveStored(STORAGE_KEYS.review, { askedAt: [...state.askedAt, now].slice(-MAX_ASKS) });
        await StoreReview.requestReview();
        return true;
    } catch {
        return false;
    }
}
