import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { loadFacts, saveFacts } from '../factStorage';
import { loadHistory, saveHistory } from '../historyStorage';
import { loadSettings, saveSettings } from '../settingsStorage';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { buildRoundRecord } from '../roundRecord';
import { MadMinuteQuestion } from '../MadMinuteQuestion';
import { FactStats } from '../factStats';
import { addProfile, defaultRegistry, loadRegistry, profileKeys, saveRegistry } from '@/storage/profiles';
import { STORAGE_KEYS } from '@/storage/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

type Api = ReturnType<typeof useMadMinute>;

function mount() {
    let latest!: Api;
    const Probe = () => {
        latest = useMadMinute();
        return null;
    };
    act(() => { create(<MadMinuteProvider><Probe /></MadMinuteProvider>); });
    return () => latest;
}

// Storage reads and writes finish on later turns of the event loop, so give them a few.
async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

async function setup() {
    const api = mount();
    await act(async () => {}); // let the saved profiles, settings, history and facts finish loading
    return api;
}

// Plays two questions that are not random (0 + 0, one right and one wrong) and saves the round.
async function playRound(api: () => Api) {
    await act(async () => { api().addQuestion(); });
    await act(async () => { api().submitResponse('0', 0); });
    await act(async () => { api().submitResponse('9', 1); });
    await act(async () => { api().recordRound(); });
}

const SAVED_FACTS: FactStats = { 'x:7:8': { attempts: 4, correct: 3, timedCorrect: 3, correctMs: 6000, lastSeen: 100 } };
const settingsOf = (max: number) => new MadMinuteSettings(0, max, [MadMinuteOperator.Addition], 60, false);

// A round saved in an earlier session: two questions, the second one the unattempted last on screen.
function savedRound(id: string) {
    const questions = [
        new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, '3'),
        new MadMinuteQuestion(1, 2, 2, MadMinuteOperator.Addition, 4),
    ];
    return buildRoundRecord(settingsOf(10), questions, id, 5);
}

describe('learner profiles in the provider', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        let tick = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => tick++);
    });
    afterEach(() => jest.restoreAllMocks());

    it('starts with one profile and shows data saved before profiles existed, with nothing moved', async () => {
        await saveFacts(SAVED_FACTS);
        await saveSettings(settingsOf(12));
        const api = await setup();
        expect(api().profiles).toHaveLength(1);
        expect(api().activeProfile.id).toBe('default');
        expect(api().facts).toEqual(SAVED_FACTS);
        expect(api().madMinute.settings.maxValue).toBe(12);
        expect(await AsyncStorage.getItem(STORAGE_KEYS.facts)).not.toBeNull();
        expect(await loadRegistry()).toBeNull(); // nothing is written until someone adds a profile
    });

    it('gives a new profile its own empty record and settings', async () => {
        await saveFacts(SAVED_FACTS);
        await saveSettings(settingsOf(12));
        const api = await setup();
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        expect(api().activeProfile.avatar).toBe('owl');
        expect(api().profiles).toHaveLength(2);
        expect(api().facts).toEqual({});
        expect(api().history).toEqual([]);
        expect(api().madMinute.settings.maxValue).not.toBe(12);
    });

    it('keeps each profile\'s rounds and facts apart', async () => {
        const api = await setup();
        await playRound(api); // default profile
        expect(api().history).toHaveLength(1);
        const defaultId = api().activeProfile.id;

        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        const owlId = api().activeProfile.id;
        await playRound(api);
        await act(async () => { api().resetMadMinute(); }); // a second round, so a new round id
        await playRound(api);
        expect(api().history).toHaveLength(2);
        expect(api().facts['+:0:0'].attempts).toBe(4);

        await act(async () => { api().switchProfile(defaultId); });
        await act(async () => {});
        expect(api().history).toHaveLength(1);
        expect(api().facts['+:0:0'].attempts).toBe(2);

        // and what is on disk matches
        expect(await loadHistory(defaultId)).toHaveLength(1);
        expect(await loadHistory(owlId)).toHaveLength(2);
        expect((await loadFacts(owlId))!['+:0:0'].attempts).toBe(4);
        expect(await AsyncStorage.getItem(profileKeys(owlId).history)).not.toBeNull();
    });

    it('keeps settings apart', async () => {
        const api = await setup();
        await act(async () => { api().updateSettings(settingsOf(7)); });
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        await act(async () => { api().updateSettings(settingsOf(15)); });
        const owlId = api().activeProfile.id;
        expect((await loadSettings('default'))!.maxValue).toBe(7);
        expect((await loadSettings(owlId))!.maxValue).toBe(15);

        await act(async () => { api().switchProfile('default'); });
        await act(async () => {});
        expect(api().madMinute.settings.maxValue).toBe(7);
    });

    it('opens on the profile that was active last time', async () => {
        const registry = addProfile(defaultRegistry(1), 'frog', 'Clever', 2, 'pfrog');
        await saveRegistry(registry);
        await saveFacts(SAVED_FACTS); // the default profile has facts, the active one does not
        const api = await setup();
        expect(api().activeProfile.id).toBe('pfrog');
        expect(api().facts).toEqual({});
        await act(async () => { api().switchProfile('default'); });
        await act(async () => {});
        expect(api().facts).toEqual(SAVED_FACTS);
    });

    it('remembers a switch for the next launch', async () => {
        const api = await setup();
        await act(async () => { api().addProfile('owl', 'Brave'); });
        const owlId = api().activeProfile.id;
        const registry = await loadRegistry();
        expect(registry?.active).toBe(owlId);
        const next = await setup();
        expect(next().activeProfile.id).toBe(owlId);
    });

    it('clears only the active profile\'s history and facts', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        const owlId = api().activeProfile.id;
        await playRound(api);
        await act(async () => { api().clearHistory(); });
        expect(await loadHistory(owlId)).toBeNull();
        expect(await loadFacts(owlId)).toBeNull();
        expect(await loadHistory('default')).toHaveLength(1);
        expect(await loadFacts('default')).not.toBeNull();
    });

    it('deletes a profile\'s data with it and moves to another profile', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        const owlId = api().activeProfile.id;
        await playRound(api);
        await act(async () => { api().removeProfile(owlId); });
        await act(async () => {});
        expect(api().profiles.map(p => p.id)).toEqual(['default']);
        expect(api().activeProfile.id).toBe('default');
        expect(api().history).toHaveLength(1);
        expect(await AsyncStorage.getItem(profileKeys(owlId).history)).toBeNull();
        expect(await AsyncStorage.getItem(profileKeys(owlId).facts)).toBeNull();
        expect(await AsyncStorage.getItem(profileKeys(owlId).settings)).toBeNull();
        expect(await loadHistory('default')).toHaveLength(1);
    });

    it('will not remove the only profile', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().removeProfile('default'); });
        expect(api().profiles).toHaveLength(1);
        expect(await loadHistory('default')).toHaveLength(1);
    });

    it('does not let a slow load for one profile fill in another', async () => {
        await saveHistory([savedRound('old')!], 'default');
        await saveFacts(SAVED_FACTS, 'default');
        // The storage mock is a jest.fn that restoreAllMocks does not put back, so its own behaviour is restored by hand.
        const getItem = AsyncStorage.getItem as jest.Mock;
        const original = getItem.getMockImplementation()!;
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        getItem.mockImplementation(async (key: string) => {
            if (key === STORAGE_KEYS.history || key === STORAGE_KEYS.facts) await gate;
            return original(key);
        });
        try {
            const api = await setup(); // the default history is still loading
            await act(async () => { api().addProfile('owl', 'Brave'); });
            await act(async () => {});
            await act(async () => { release(); });
            await settle();
            expect(api().activeProfile.avatar).toBe('owl');
            expect(api().history).toEqual([]);
            expect(api().facts).toEqual({});
        } finally {
            getItem.mockImplementation(original);
        }
    });

    it('keeps a round finished before the profiles loaded, and the history saved before it', async () => {
        await saveHistory([savedRound('old')!], 'default');
        const api = mount(); // loads are still running
        act(() => { api().addQuestion(); });
        act(() => { api().submitResponse('0', 0); });
        act(() => { api().recordRound(); });
        await settle();
        expect(api().history).toHaveLength(2);
        expect(await loadHistory('default')).toHaveLength(2);
    });

    it('ignores profile changes made before the saved profiles have loaded', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'frog', 'Clever', 2, 'pfrog'));
        const api = mount();
        act(() => { api().addProfile('owl', 'Brave'); });
        await settle();
        expect(api().profiles.map(p => p.id)).toEqual(['default', 'pfrog']);
        expect(api().activeProfile.id).toBe('pfrog');
        const stored = await loadRegistry();
        expect(stored?.profiles.map(p => p.id)).toEqual(['default', 'pfrog']);
        expect(stored?.active).toBe('pfrog');
    });
});
