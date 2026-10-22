import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStored, parseStored, removeStored, saveStored, STORAGE_VERSION } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const isNumber = (data: unknown) => (typeof data === 'number' ? data : null);

describe('parseStored', () => {
    it('returns the data of a current-version envelope', () => {
        expect(parseStored(JSON.stringify({ v: STORAGE_VERSION, data: { a: 1 } }))).toEqual({ a: 1 });
    });

    it('returns null for missing, corrupt, wrong-version or malformed values', () => {
        expect(parseStored(null)).toBeNull();
        expect(parseStored('not json {')).toBeNull();
        expect(parseStored('"just a string"')).toBeNull();
        expect(parseStored('null')).toBeNull();
        expect(parseStored(JSON.stringify({ v: STORAGE_VERSION + 1, data: 1 }))).toBeNull();
        expect(parseStored(JSON.stringify({ data: 1 }))).toBeNull();
        expect(parseStored(JSON.stringify({ v: STORAGE_VERSION }))).toBeNull();
    });
});

describe('loadStored / saveStored / removeStored', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
    });

    it('round-trips a value', async () => {
        expect(await saveStored('k', 5)).toBe(true);
        expect(await loadStored('k', isNumber)).toBe(5);
    });

    it('returns null when nothing is stored or the validator rejects it', async () => {
        expect(await loadStored('k', isNumber)).toBeNull();
        await saveStored('k', 'five');
        expect(await loadStored('k', isNumber)).toBeNull();
    });

    it('removes a value', async () => {
        await saveStored('k', 5);
        await removeStored('k');
        expect(await loadStored('k', isNumber)).toBeNull();
    });

    it('never throws when storage fails', async () => {
        jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('boom'));
        jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('boom'));
        jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('boom'));
        expect(await loadStored('k', isNumber)).toBeNull();
        expect(await saveStored('k', 5)).toBe(false);
        await expect(removeStored('k')).resolves.toBeUndefined();
    });
});
