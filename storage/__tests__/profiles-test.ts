import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    addProfile, AVATARS, changeAvatar, DEFAULT_PROFILE_ID, defaultRegistry, freeAvatars, loadRegistry, MAX_PROFILES,
    parseRegistry, profileKeys, profileLabel, removeProfile, removeProfileData, saveRegistry, switchProfile,
} from '../profiles';
import { STORAGE_KEYS } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const start = defaultRegistry(1000);

describe('profile keys', () => {
    it('keeps the default profile on the keys used before profiles existed', () => {
        expect(profileKeys(DEFAULT_PROFILE_ID)).toEqual({
            settings: STORAGE_KEYS.settings, history: STORAGE_KEYS.history, facts: STORAGE_KEYS.facts,
        });
        expect(STORAGE_KEYS.settings).toBe('madminute.settings');
        expect(STORAGE_KEYS.history).toBe('madminute.history');
        expect(STORAGE_KEYS.facts).toBe('madminute.facts');
    });

    it('gives every other profile keys of its own', () => {
        const a = profileKeys('pa1');
        const b = profileKeys('pb2');
        const all = [...Object.values(a), ...Object.values(b), ...Object.values(profileKeys(DEFAULT_PROFILE_ID))];
        expect(new Set(all).size).toBe(9);
    });
});

describe('the profile list', () => {
    it('starts as one default profile that is active', () => {
        expect(start.active).toBe(DEFAULT_PROFILE_ID);
        expect(start.profiles).toHaveLength(1);
    });

    it('adds a profile with a free avatar and makes it active', () => {
        const next = addProfile(start, 'owl', 2000, 'p2');
        expect(next.active).toBe('p2');
        expect(next.profiles.map(p => p.avatar)).toEqual(['fox', 'owl']);
        expect(profileLabel(next.profiles[1])).toBe('Owl');
    });

    it('refuses an avatar that is already taken', () => {
        expect(addProfile(start, 'fox', 2000, 'p2')).toBe(start);
    });

    it('refuses an id that is already used or not valid', () => {
        expect(addProfile(start, 'owl', 2000, DEFAULT_PROFILE_ID)).toBe(start);
        expect(addProfile(start, 'owl', 2000, 'Bad Id!')).toBe(start);
    });

    it('stops at the number of avatars', () => {
        let registry = start;
        AVATARS.slice(1).forEach((avatar, i) => { registry = addProfile(registry, avatar.id, 2000 + i, `p${i}`); });
        expect(registry.profiles).toHaveLength(MAX_PROFILES);
        expect(freeAvatars(registry)).toEqual([]);
        expect(addProfile(registry, 'fox', 3000, 'extra')).toBe(registry);
    });

    it('switches to a profile that exists and ignores one that does not', () => {
        const two = addProfile(start, 'owl', 2000, 'p2');
        expect(switchProfile(two, DEFAULT_PROFILE_ID).active).toBe(DEFAULT_PROFILE_ID);
        expect(switchProfile(two, 'nobody')).toBe(two);
        expect(switchProfile(two, 'p2')).toBe(two);
    });

    it('changes an avatar to a free one only', () => {
        const two = addProfile(start, 'owl', 2000, 'p2');
        expect(changeAvatar(two, 'p2', 'frog').profiles[1].avatar).toBe('frog');
        expect(changeAvatar(two, 'p2', 'fox')).toBe(two);
        expect(changeAvatar(two, 'nobody', 'frog')).toBe(two);
    });

    it('removes a profile, and hands over to the one before it when the active one goes', () => {
        const three = addProfile(addProfile(start, 'owl', 2000, 'p2'), 'frog', 3000, 'p3');
        const gone = removeProfile(three, 'p3');
        expect(gone.profiles.map(p => p.id)).toEqual([DEFAULT_PROFILE_ID, 'p2']);
        expect(gone.active).toBe('p2');
        const middle = removeProfile(switchProfile(three, 'p3'), 'p2');
        expect(middle.active).toBe('p3');
    });

    it('never removes the last profile', () => {
        expect(removeProfile(start, DEFAULT_PROFILE_ID)).toBe(start);
    });

    it('lets the default profile be removed once there are others', () => {
        const two = addProfile(start, 'owl', 2000, 'p2');
        const gone = removeProfile(two, DEFAULT_PROFILE_ID);
        expect(gone.profiles.map(p => p.id)).toEqual(['p2']);
        expect(gone.active).toBe('p2');
    });
});

describe('parseRegistry', () => {
    const good = { active: 'p2', profiles: [
        { id: 'default', avatar: 'fox', createdAt: 1 },
        { id: 'p2', avatar: 'owl', createdAt: 2 },
    ] };

    it('accepts a valid list', () => {
        expect(parseRegistry(good)).toEqual(good);
    });

    it('drops fields it does not know', () => {
        const withExtra = { ...good, profiles: [{ ...good.profiles[0], name: 'Sam' }, good.profiles[1]] };
        expect(parseRegistry(withExtra)?.profiles[0]).toEqual({ id: 'default', avatar: 'fox', createdAt: 1 });
    });

    it.each([
        ['not an object', 'x'],
        ['null', null],
        ['no profiles', { active: 'default', profiles: [] }],
        ['active profile missing', { ...good, active: 'zzz' }],
        ['duplicate id', { ...good, profiles: [good.profiles[0], { ...good.profiles[1], id: 'default' }] }],
        ['duplicate avatar', { ...good, profiles: [good.profiles[0], { ...good.profiles[1], avatar: 'fox' }] }],
        ['unknown avatar', { ...good, profiles: [good.profiles[0], { ...good.profiles[1], avatar: 'dragon' }] }],
        ['id that would be a key mess', { ...good, active: 'a.b', profiles: [{ ...good.profiles[0], id: 'a.b' }] }],
        ['bad createdAt', { ...good, profiles: [{ ...good.profiles[0], createdAt: 'yesterday' }, good.profiles[1]] }],
        ['too many profiles', { active: 'default', profiles: Array.from({ length: MAX_PROFILES + 1 }, (_, i) =>
            ({ id: i === 0 ? 'default' : `p${i}`, avatar: AVATARS[i % AVATARS.length].id, createdAt: i })) }],
    ])('rejects %s', (_name, data) => {
        expect(parseRegistry(data)).toBeNull();
    });
});

describe('saving the list and deleting a profile', () => {
    beforeEach(() => AsyncStorage.clear());

    it('round-trips through storage', async () => {
        const two = addProfile(start, 'owl', 2000, 'p2');
        expect(await saveRegistry(two)).toBe(true);
        expect(await loadRegistry()).toEqual(two);
    });

    it('loads null when nothing is saved or the saved list is damaged', async () => {
        expect(await loadRegistry()).toBeNull();
        await AsyncStorage.setItem(STORAGE_KEYS.profiles, '{"v":1,"data":{"active":"x","profiles":[]}}');
        expect(await loadRegistry()).toBeNull();
    });

    it('removes only that profile\'s data', async () => {
        const keys = profileKeys('p2');
        await AsyncStorage.multiSet([
            [keys.settings, 'a'], [keys.history, 'b'], [keys.facts, 'c'],
            [STORAGE_KEYS.history, 'keep'], [STORAGE_KEYS.review, 'keep'],
        ]);
        await removeProfileData('p2');
        expect(await AsyncStorage.getItem(keys.history)).toBeNull();
        expect(await AsyncStorage.getItem(keys.settings)).toBeNull();
        expect(await AsyncStorage.getItem(keys.facts)).toBeNull();
        expect(await AsyncStorage.getItem(STORAGE_KEYS.history)).toBe('keep');
        expect(await AsyncStorage.getItem(STORAGE_KEYS.review)).toBe('keep');
    });
});
