import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { loadPractice, savePractice } from '../practiceStorage';
import { emptyPractice, PracticeRecord, recordPracticeRound, withGoal } from '../practice';
import { DEFAULT_PROFILE_ID, profileKeys } from '@/storage/profiles';

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

async function setup() {
    const api = mount();
    await act(async () => {}); // let the saved settings, history, facts and practice finish loading
    return api;
}

async function playRound(api: () => Api) {
    await act(async () => { api().resetMadMinute(); });
    await act(async () => { api().addQuestion(); });
    await act(async () => { api().submitResponse('0', 0); });
    await act(async () => { api().recordRound(); });
}

const day = (d: number, hour = 12) => new Date(2026, 10, d, hour).getTime();

// A clock the test moves by hand. Math.random is fixed, so round ids come from the clock and it has to keep moving.
let now = day(23);
const goTo = (ms: number) => { now = ms; };

describe('the daily goal and streak in the provider', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        now = day(23);
        jest.spyOn(Date, 'now').mockImplementation(() => (now += 1));
    });
    afterEach(() => jest.restoreAllMocks());

    it('starts with no streak and a goal of one round', async () => {
        const api = await setup();
        expect(api().practice).toEqual(emptyPractice());
        expect(await loadPractice()).toBeNull();
    });

    it('counts a finished round and saves it', async () => {
        const api = await setup();
        await playRound(api);
        expect(api().practice.streak.current).toBe(1);
        expect(api().practice.today).toEqual({ day: '2026-11-23', rounds: 1 });
        expect(await loadPractice()).toEqual(api().practice);
    });

    it('counts a round once, however many times the results screen asks', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        await act(async () => { api().submitResponse('0', 0); });
        await act(async () => {
            api().recordRound();
            api().recordRound();
        });
        await act(async () => { api().recordRound(); });
        expect(api().practice.today!.rounds).toBe(1);
    });

    it('does not count a round nothing was attempted in', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        await act(async () => { api().recordRound(); });
        expect(api().practice).toEqual(emptyPractice());
        expect(await loadPractice()).toBeNull();
    });

    it('grows the streak over days', async () => {
        const api = await setup();
        await playRound(api);
        goTo(day(24));
        await playRound(api);
        expect(api().practice.streak).toEqual({ current: 2, longest: 2, lastDay: '2026-11-24' });
    });

    it('restores the saved record at launch', async () => {
        const saved = recordPracticeRound(withGoal(emptyPractice(), 3), day(22));
        await savePractice(saved);
        const api = await setup();
        expect(api().practice).toEqual(saved);
    });

    it('adds to a saved streak', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), day(22)));
        const api = await setup();
        await playRound(api);
        expect(api().practice.streak.current).toBe(2);
    });

    it('keeps a chosen goal and saves it', async () => {
        const api = await setup();
        await act(async () => { api().setGoal(3); });
        expect(api().practice.goal).toBe(3);
        expect((await loadPractice())!.goal).toBe(3);
        await playRound(api);
        expect(api().practice.goal).toBe(3);
    });

    it('survives a round finishing before the saved record has loaded', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), day(22)));
        const api = mount(); // the load is still running
        act(() => { api().addQuestion(); });
        act(() => { api().submitResponse('0', 0); });
        act(() => { api().recordRound(); });
        await act(async () => {});
        expect(api().practice.streak.current).toBe(2);
        expect((await loadPractice())!.streak.current).toBe(2);
    });

    it('does not overwrite the saved record before it has loaded', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), day(22)));
        const api = mount();
        act(() => { api().addQuestion(); });
        act(() => { api().submitResponse('0', 0); });
        const setItem = jest.spyOn(AsyncStorage, 'setItem');
        setItem.mockClear();
        act(() => { api().recordRound(); });
        expect(setItem.mock.calls.filter(([key]) => key === profileKeys(DEFAULT_PROFILE_ID).practice)).toHaveLength(0);
        await act(async () => {});
    });

    it('lets a goal picked before the load finishes win over the saved one', async () => {
        await savePractice(withGoal(recordPracticeRound(emptyPractice(), day(22)), 2));
        const api = mount();
        act(() => { api().setGoal(3); });
        await act(async () => {});
        expect(api().practice.goal).toBe(3);
        expect(api().practice.streak.current).toBe(1);
        expect((await loadPractice())!.goal).toBe(3);
    });

    it('ignores a saved record that is not valid', async () => {
        await AsyncStorage.setItem(profileKeys(DEFAULT_PROFILE_ID).practice, '{"v":1,"data":"nonsense"}');
        const api = await setup();
        expect(api().practice).toEqual(emptyPractice());
    });
});

describe('clearing the history', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        now = day(23);
        jest.spyOn(Date, 'now').mockImplementation(() => (now += 1));
    });
    afterEach(() => jest.restoreAllMocks());

    it('starts the streak again but keeps the goal the player chose', async () => {
        const api = await setup();
        await act(async () => { api().setGoal(2); });
        await playRound(api);
        await act(async () => { api().clearHistory(); });
        expect(api().practice).toEqual(withGoal(emptyPractice(), 2));
        expect(await loadPractice()).toEqual(withGoal(emptyPractice(), 2));
    });

    it('removes the saved record when the goal is the default', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().clearHistory(); });
        expect(await loadPractice()).toBeNull();
    });

    it('is not undone by a record that was still loading', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), day(22)));
        const api = mount();
        act(() => { api().clearHistory(); });
        await act(async () => {});
        expect(api().practice).toEqual(emptyPractice());
        expect(await loadPractice()).toBeNull();
    });
});

describe('players', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0.3);
        now = day(23);
        jest.spyOn(Date, 'now').mockImplementation(() => (now += 1));
    });
    afterEach(() => jest.restoreAllMocks());

    it('each have their own streak and goal', async () => {
        const api = await setup();
        await act(async () => { api().setGoal(3); });
        await playRound(api);
        const first = api().activeProfile.id;

        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        expect(api().activeProfile.id).not.toBe(first);
        expect(api().practice).toEqual(emptyPractice());

        goTo(day(24));
        await playRound(api);
        expect(api().practice.streak.current).toBe(1);

        await act(async () => { api().switchProfile(first); });
        await act(async () => {});
        expect(api().practice.goal).toBe(3);
        expect(api().practice.streak).toEqual({ current: 1, longest: 1, lastDay: '2026-11-23' });
    });

    it('does not show the last player\'s streak while the next one loads', async () => {
        const saved: PracticeRecord = recordPracticeRound(emptyPractice(), day(22));
        const api = await setup();
        await playRound(api);
        await act(async () => { api().addProfile('fox', 'Calm'); });
        const second = api().activeProfile.id;
        await savePractice(saved, second);
        await act(async () => { api().switchProfile(api().profiles[0].id); });
        await act(async () => { api().switchProfile(second); });
        await act(async () => {});
        expect(api().practice).toEqual(saved);
    });

    it('never get the streak of the player who was loading when they switched', async () => {
        const api = await setup();
        const first = api().activeProfile.id;
        await savePractice(recordPracticeRound(emptyPractice(), day(22)), first);
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        const second = api().activeProfile.id;
        // Back to the first player and on to the second before the first one's record has loaded.
        act(() => { api().switchProfile(first); });
        act(() => { api().switchProfile(second); });
        await act(async () => {});
        expect(api().activeProfile.id).toBe(second);
        expect(api().practice).toEqual(emptyPractice());
    });

    it('lose their record when the player is deleted', async () => {
        const api = await setup();
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        const second = api().activeProfile.id;
        await playRound(api);
        expect(await loadPractice(second)).not.toBeNull();
        await act(async () => { api().removeProfile(second); });
        expect(await loadPractice(second)).toBeNull();
    });
});
