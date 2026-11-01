import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, STORAGE_VERSION } from '@/storage/storage';
import { clearFacts, loadFacts, saveFacts } from '../factStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const fact = { attempts: 4, correct: 3, timedCorrect: 3, correctMs: 6000, lastSeen: 100 };

describe('fact storage', () => {
    beforeEach(() => AsyncStorage.clear());

    it('has its own key, apart from settings and history', () => {
        expect(STORAGE_KEYS.facts).toBe('madminute.facts');
        expect(new Set(Object.values(STORAGE_KEYS)).size).toBe(Object.keys(STORAGE_KEYS).length);
    });

    it('saves facts and loads them back', async () => {
        expect(await saveFacts({ 'x:7:8': fact })).toBe(true);
        expect(await loadFacts()).toEqual({ 'x:7:8': fact });
    });

    it('stores them in the versioned envelope the other data uses', async () => {
        await saveFacts({ 'x:7:8': fact });
        const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.facts))!);
        expect(raw).toEqual({ v: STORAGE_VERSION, data: { 'x:7:8': fact } });
    });

    it('loads null when nothing is saved', async () => {
        expect(await loadFacts()).toBeNull();
    });

    it('loads null for unreadable or other-version data instead of throwing', async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.facts, 'not json');
        expect(await loadFacts()).toBeNull();
        await AsyncStorage.setItem(STORAGE_KEYS.facts, JSON.stringify({ v: STORAGE_VERSION + 1, data: { 'x:7:8': fact } }));
        expect(await loadFacts()).toBeNull();
        await AsyncStorage.setItem(STORAGE_KEYS.facts, JSON.stringify({ v: STORAGE_VERSION, data: [1, 2] }));
        expect(await loadFacts()).toBeNull();
    });

    it('drops bad entries on load and keeps the good ones', async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.facts, JSON.stringify({
            v: STORAGE_VERSION,
            data: { 'x:7:8': fact, 'x:6:7': { ...fact, attempts: -5 }, 'junk': fact },
        }));
        expect(await loadFacts()).toEqual({ 'x:7:8': fact });
    });

    it('clears them without touching the history', async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.history, 'keep me');
        await saveFacts({ 'x:7:8': fact });
        await clearFacts();
        expect(await loadFacts()).toBeNull();
        expect(await AsyncStorage.getItem(STORAGE_KEYS.history)).toBe('keep me');
    });

    it('reports a failed save instead of throwing', async () => {
        const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
        expect(await saveFacts({ 'x:7:8': fact })).toBe(false);
        spy.mockRestore();
    });
});
