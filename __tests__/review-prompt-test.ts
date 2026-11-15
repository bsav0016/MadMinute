jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(async () => true), requestReview: jest.fn(async () => {}) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { BestInfo } from '@/contexts/MadMinuteContext/personalBest';
import { RoundRecord } from '@/contexts/MadMinuteContext/roundRecord';
import {
    MAX_ASKS, MIN_DAYS_BETWEEN_ASKS, MIN_ROUNDS, maybeRequestReview, parseReviewState, shouldAskForReview,
} from '@/contexts/MadMinuteContext/reviewPrompt';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const round = (playedAt: number): RoundRecord => ({
    id: String(playedAt), playedAt, operators: [], minValue: 1, maxValue: 10, durationSeconds: 60,
    correct: 10, incorrect: 0, skipped: 0, byOperator: {},
});
const historyOf = (n: number, firstDaysAgo = 10) => Array.from({ length: n }, (_, i) => round(NOW - (firstDaysAgo - i * 0.1) * DAY));
const newBest: BestInfo = { previousBest: round(NOW - 5 * DAY), isNewBest: true };

describe('shouldAskForReview', () => {
    it('asks after beating a real earlier score once the player has played enough', () => {
        expect(shouldAskForReview(historyOf(MIN_ROUNDS), newBest, { askedAt: [] }, NOW)).toBe(true);
    });

    it('does not ask without a new personal best, or when the first score is trivially a best', () => {
        expect(shouldAskForReview(historyOf(10), { previousBest: null, isNewBest: false }, { askedAt: [] }, NOW)).toBe(false);
        expect(shouldAskForReview(historyOf(10), { previousBest: round(NOW), isNewBest: false }, { askedAt: [] }, NOW)).toBe(false);
        expect(shouldAskForReview(historyOf(10), null, { askedAt: [] }, NOW)).toBe(false);
    });

    it('waits for enough rounds and a couple of days of play', () => {
        expect(shouldAskForReview(historyOf(MIN_ROUNDS - 1), newBest, { askedAt: [] }, NOW)).toBe(false);
        expect(shouldAskForReview(historyOf(MIN_ROUNDS, 0.5), newBest, { askedAt: [] }, NOW)).toBe(false);
    });

    it('does not nag: spaced out and capped', () => {
        const h = historyOf(10, 400);
        expect(shouldAskForReview(h, newBest, { askedAt: [NOW - (MIN_DAYS_BETWEEN_ASKS - 1) * DAY] }, NOW)).toBe(false);
        expect(shouldAskForReview(h, newBest, { askedAt: [NOW - (MIN_DAYS_BETWEEN_ASKS + 1) * DAY] }, NOW)).toBe(true);
        const used = Array.from({ length: MAX_ASKS }, (_, i) => NOW - (1000 + i) * DAY);
        expect(shouldAskForReview(h, newBest, { askedAt: used }, NOW)).toBe(false);
    });
});

describe('parseReviewState', () => {
    it('accepts a list of timestamps and rejects anything else', () => {
        expect(parseReviewState({ askedAt: [1, 2] })).toEqual({ askedAt: [1, 2] });
        expect(parseReviewState({ askedAt: ['x'] })).toBeNull();
        expect(parseReviewState({})).toBeNull();
        expect(parseReviewState(null)).toBeNull();
    });
});

describe('maybeRequestReview', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.clearAllMocks();
        jest.mocked(StoreReview.isAvailableAsync).mockResolvedValue(true);
    });

    it('requests once and then not again soon', async () => {
        expect(await maybeRequestReview(historyOf(6), newBest, NOW)).toBe(true);
        expect(await maybeRequestReview(historyOf(6), newBest, NOW + DAY)).toBe(false);
        expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the store review is unavailable or the moment is wrong', async () => {
        jest.mocked(StoreReview.isAvailableAsync).mockResolvedValue(false);
        expect(await maybeRequestReview(historyOf(6), newBest, NOW)).toBe(false);
        jest.mocked(StoreReview.isAvailableAsync).mockResolvedValue(true);
        expect(await maybeRequestReview(historyOf(2), newBest, NOW)).toBe(false);
        expect(StoreReview.requestReview).not.toHaveBeenCalled();
    });

    it('never throws if the store call fails', async () => {
        jest.mocked(StoreReview.requestReview).mockRejectedValueOnce(new Error('boom'));
        await expect(maybeRequestReview(historyOf(6), newBest, NOW)).resolves.toBe(false);
    });
});
