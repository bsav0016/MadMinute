import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    addProfile, AVATARS, changeProfile, DEFAULT_PROFILE_ID, defaultRegistry, loadRegistry, MAX_PROFILES,
    parseRegistry, profileKeys, profileLabel, randomTitle, removeProfile, removeProfileData, saveRegistry, switchProfile, TITLES, titlesTaken,
} from '../profiles';
import { STORAGE_KEYS } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const start = defaultRegistry(1000);

describe('profile keys', () => {
    it('keeps the default profile on the keys used before profiles existed', () => {
        expect(profileKeys(DEFAULT_PROFILE_ID)).toEqual({
            settings: STORAGE_KEYS.settings, history: STORAGE_KEYS.history, facts: STORAGE_KEYS.facts, practice: STORAGE_KEYS.practice,
        });
        expect(STORAGE_KEYS.settings).toBe('madminute.settings');
        expect(STORAGE_KEYS.history).toBe('madminute.history');
        expect(STORAGE_KEYS.facts).toBe('madminute.facts');
        expect(STORAGE_KEYS.practice).toBe('madminute.practice');
    });

    it('gives every other profile keys of its own', () => {
        const a = profileKeys('pa1');
        const b = profileKeys('pb2');
        const all = [...Object.values(a), ...Object.values(b), ...Object.values(profileKeys(DEFAULT_PROFILE_ID))];
        expect(new Set(all).size).toBe(12);
    });
});

describe('the profile list', () => {
    it('starts as one default profile that is active', () => {
        expect(start.active).toBe(DEFAULT_PROFILE_ID);
        expect(start.profiles).toHaveLength(1);
    });

    it('adds a profile with a free avatar and makes it active', () => {
        const next = addProfile(start, 'owl', 'Brave', 2000, 'p2');
        expect(next.active).toBe('p2');
        expect(next.profiles.map(p => p.avatar)).toEqual(['fox', 'owl']);
        expect(profileLabel(next.profiles[1])).toBe('Brave Owl');
    });

    it('lets two players share an animal when their words differ', () => {
        const next = addProfile(start, 'fox', 'Brave', 2000, 'p2');
        expect(next.profiles.map(profileLabel)).toEqual(['Swift Fox', 'Brave Fox']);
        expect(next.active).toBe('p2');
    });

    it('refuses a name another player already has', () => {
        expect(addProfile(start, 'fox', 'Swift', 2000, 'p2')).toBe(start);
    });

    it('lists the words other players already have with an animal', () => {
        const two = addProfile(start, 'fox', 'Brave', 2000, 'p2');
        expect(titlesTaken(two, 'fox')).toEqual(['Swift', 'Brave']);
        expect(titlesTaken(two, 'fox', 'p2')).toEqual(['Swift']);
        expect(titlesTaken(two, 'owl')).toEqual([]);
    });

    it('refuses an id that is already used or not valid', () => {
        expect(addProfile(start, 'owl', 'Brave', 2000, DEFAULT_PROFILE_ID)).toBe(start);
        expect(addProfile(start, 'owl', 'Brave', 2000, 'Bad Id!')).toBe(start);
    });

    it('stops at the limit', () => {
        let registry = start;
        for (let i = 1; i < MAX_PROFILES; i++) {
            registry = addProfile(registry, AVATARS[i % AVATARS.length].id, TITLES[i], 2000 + i, `p${i}`);
        }
        expect(registry.profiles).toHaveLength(MAX_PROFILES);
        expect(addProfile(registry, 'owl', 'Epic', 3000, 'extra')).toBe(registry);
    });

    it('switches to a profile that exists and ignores one that does not', () => {
        const two = addProfile(start, 'owl', 'Brave', 2000, 'p2');
        expect(switchProfile(two, DEFAULT_PROFILE_ID).active).toBe(DEFAULT_PROFILE_ID);
        expect(switchProfile(two, 'nobody')).toBe(two);
        expect(switchProfile(two, 'p2')).toBe(two);
    });

    it('refuses a word that is not on the list', () => {
        expect(addProfile(start, 'owl', 'Grumpy' as never, 2000, 'p2')).toBe(start);
    });

    it('changes the animal, keeping the id', () => {
        const two = addProfile(start, 'owl', 'Brave', 2000, 'p2');
        const changed = changeProfile(two, 'p2', 'frog', 'Brave');
        expect(changed.profiles[1]).toMatchObject({ id: 'p2', avatar: 'frog', title: 'Brave' });
        expect(changeProfile(two, 'nobody', 'frog', 'Brave')).toBe(two);
    });

    it('lets a change share an animal, but not take a name another player has', () => {
        const two = addProfile(start, 'owl', 'Brave', 2000, 'p2');
        expect(changeProfile(two, 'p2', 'fox', 'Brave').profiles[1]).toMatchObject({ avatar: 'fox', title: 'Brave' });
        expect(changeProfile(two, 'p2', 'fox', 'Swift')).toBe(two);
    });

    it('changes the word on its own, and refuses one that is not on the list', () => {
        const two = addProfile(start, 'owl', 'Brave', 2000, 'p2');
        expect(changeProfile(two, 'p2', 'owl', 'Clever').profiles[1]).toMatchObject({ avatar: 'owl', title: 'Clever' });
        expect(changeProfile(two, 'p2', 'owl', 'Brave')).toBe(two);
        expect(changeProfile(two, 'p2', 'owl', 'Grumpy' as never)).toBe(two);
    });

    it('removes a profile, and hands over to the one before it when the active one goes', () => {
        const three = addProfile(addProfile(start, 'owl', 'Brave', 2000, 'p2'), 'frog', 'Clever', 3000, 'p3');
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
        const two = addProfile(start, 'owl', 'Brave', 2000, 'p2');
        const gone = removeProfile(two, DEFAULT_PROFILE_ID);
        expect(gone.profiles.map(p => p.id)).toEqual(['p2']);
        expect(gone.active).toBe('p2');
    });
});

describe('names', () => {
    it('shows the word and the animal', () => {
        expect(profileLabel({ avatar: 'fox', title: 'Swift' })).toBe('Swift Fox');
    });

    it('has no repeated words, so every combination is different', () => {
        expect(new Set(TITLES).size).toBe(TITLES.length);
        expect(TITLES.length).toBeGreaterThanOrEqual(30);
    });

    it('shuffles to a different word every time', () => {
        for (let i = 0; i < 40; i++) {
            const random = () => i / 40;
            expect(randomTitle(['Swift'], random)).not.toBe('Swift');
        }
        expect(randomTitle(['Swift'], () => 0.9999999)).toBe(TITLES[TITLES.length - 1]);
        expect(randomTitle(['Swift', 'Brave'], () => 0)).toBe(TITLES[2]);
        expect(randomTitle([], () => 0)).toBe(TITLES[0]);
    });

    it('starts the first player as Swift Fox', () => {
        expect(profileLabel(start.profiles[0])).toBe('Swift Fox');
    });
});

describe('parseRegistry', () => {
    const good = { active: 'p2', profiles: [
        { id: 'default', avatar: 'fox', title: 'Swift', createdAt: 1 },
        { id: 'p2', avatar: 'owl', title: 'Brave', createdAt: 2 },
    ] };

    it('accepts a valid list', () => {
        expect(parseRegistry(good)).toEqual(good);
    });

    it('accepts two players with the same animal and different words', () => {
        const shared = { ...good, profiles: [good.profiles[0], { ...good.profiles[1], avatar: 'fox' }] };
        expect(parseRegistry(shared)?.profiles.map(profileLabel)).toEqual(['Swift Fox', 'Brave Fox']);
    });

    it('drops fields it does not know', () => {
        const withExtra = { ...good, profiles: [{ ...good.profiles[0], name: 'Sam' }, good.profiles[1]] };
        expect(parseRegistry(withExtra)?.profiles[0]).toEqual({ id: 'default', avatar: 'fox', title: 'Swift', createdAt: 1 });
    });

    it('gives a profile saved without a word the same word every time', () => {
        const noWord = { active: 'p2', profiles: [{ id: 'p2', avatar: 'owl', createdAt: 2 }] };
        const first = parseRegistry(noWord)!.profiles[0].title;
        expect(TITLES).toContain(first);
        expect(parseRegistry(noWord)!.profiles[0].title).toBe(first);
    });

    it('replaces a word that is not on the list', () => {
        const odd = { ...good, profiles: [{ ...good.profiles[0], title: 'Grumpy' }, good.profiles[1]] };
        expect(TITLES).toContain(parseRegistry(odd)!.profiles[0].title);
    });

    it.each([
        ['not an object', 'x'],
        ['null', null],
        ['no profiles', { active: 'default', profiles: [] }],
        ['active profile missing', { ...good, active: 'zzz' }],
        ['duplicate id', { ...good, profiles: [good.profiles[0], { ...good.profiles[1], id: 'default' }] }],
        ['a name used twice', { ...good, profiles: [good.profiles[0], { ...good.profiles[1], avatar: 'fox', title: 'Swift' }] }],
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
        const two = addProfile(start, 'owl', 'Brave', 2000, 'p2');
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
