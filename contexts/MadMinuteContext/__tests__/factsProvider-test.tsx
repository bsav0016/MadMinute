import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { loadFacts, saveFacts } from '../factStorage';
import { loadHistory } from '../historyStorage';
import { FactStats } from '../factStats';

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
    await act(async () => {}); // let the saved settings, history and facts finish loading
    return api;
}

// Plays two questions that are not random: 0 + 0 answered right, and 0 + 0 answered wrong. A third is left on screen.
async function playRound(api: () => Api, responses: string[] = ['0', '9']) {
    await act(async () => { api().addQuestion(); });
    for (let i = 0; i < responses.length; i++) {
        await act(async () => { api().submitResponse(responses[i], i); });
    }
}

const SAVED: FactStats = { 'x:7:8': { attempts: 4, correct: 3, timedCorrect: 3, correctMs: 6000, lastSeen: 100 } };

describe('the record of each problem in the provider', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        // Every question is 0 + 0 (the no-repeat guard gives up after 25 draws and accepts it), so the key is known.
        jest.spyOn(Math, 'random').mockReturnValue(0);
        // Round ids come from the clock and Math.random, so with random fixed the clock has to keep moving.
        let tick = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => tick++);
    });
    afterEach(() => jest.restoreAllMocks());

    it('starts empty', async () => {
        const api = await setup();
        expect(api().facts).toEqual({});
    });

    it('adds a finished round to the facts and saves them', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().recordRound(); });
        expect(api().facts['+:0:0']).toMatchObject({ attempts: 2, correct: 1 });
        expect(await loadFacts()).toEqual(api().facts);
    });

    it('counts a round once, however many times the results screen asks', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => {
            api().recordRound();
            api().recordRound();
        });
        await act(async () => { api().recordRound(); });
        expect(api().facts['+:0:0'].attempts).toBe(2);
        expect((await loadFacts())!['+:0:0'].attempts).toBe(2);
    });

    it('adds each new round to the last', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().recordRound(); });
        await act(async () => { api().resetMadMinute(); });
        await playRound(api, ['0']);
        await act(async () => { api().recordRound(); });
        expect(api().facts['+:0:0']).toMatchObject({ attempts: 3, correct: 2 });
    });

    it('records no facts for a round nothing was attempted in', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        await act(async () => { api().recordRound(); });
        expect(api().facts).toEqual({});
        expect(await loadFacts()).toBeNull();
    });

    it('times only the correct answers, from the round start, and counts a skip as a miss', async () => {
        let now = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        now += 2000;
        await act(async () => { api().submitResponse('0', 0); });   // right, 2 s
        now += 500;
        await act(async () => { api().submitResponse('7', 1); });   // wrong
        now += 500;
        await act(async () => { api().submitResponse('', 2); });    // skipped
        await act(async () => { api().recordRound(); });
        expect(api().facts['+:0:0']).toMatchObject({ attempts: 3, correct: 1, timedCorrect: 1, correctMs: 2000, lastSeen: now });
    });

    it('restores saved facts at launch', async () => {
        await saveFacts(SAVED);
        const api = await setup();
        expect(api().facts).toEqual(SAVED);
    });

    it('adds to restored facts', async () => {
        await saveFacts(SAVED);
        const api = await setup();
        await playRound(api);
        await act(async () => { api().recordRound(); });
        expect(api().facts['x:7:8']).toEqual(SAVED['x:7:8']);
        expect(api().facts['+:0:0'].attempts).toBe(2);
    });

    it('survives a round finishing before the saved facts have loaded', async () => {
        await saveFacts(SAVED);
        const api = mount(); // the load is still running
        act(() => { api().addQuestion(); });
        act(() => { api().submitResponse('0', 0); });
        act(() => { api().submitResponse('0', 1); });
        act(() => { api().recordRound(); });
        await act(async () => {});
        expect(api().facts['x:7:8']).toEqual(SAVED['x:7:8']);
        expect(api().facts['+:0:0'].attempts).toBe(2);
        const stored = await loadFacts();
        expect(stored!['x:7:8']).toEqual(SAVED['x:7:8']);
        expect(stored!['+:0:0'].attempts).toBe(2);
    });

    it('does not overwrite the saved facts before they have loaded', async () => {
        await saveFacts(SAVED);
        const api = mount();
        act(() => { api().addQuestion(); });
        act(() => { api().submitResponse('0', 0); });
        act(() => { api().submitResponse('0', 1); });
        const setItem = jest.spyOn(AsyncStorage, 'setItem');
        setItem.mockClear(); // the mock keeps the calls other tests made
        act(() => { api().recordRound(); });
        const writesToFacts = setItem.mock.calls.filter(([key]) => key === 'madminute.facts');
        expect(writesToFacts).toHaveLength(0);
        await act(async () => {});
    });
});

describe('clearing the history also clears the facts', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        let tick = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => tick++);
    });
    afterEach(() => jest.restoreAllMocks());

    it('empties them in the app and in storage, and leaves later rounds free to start again', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().recordRound(); });
        await act(async () => { api().clearHistory(); });
        expect(api().facts).toEqual({});
        expect(await loadFacts()).toBeNull();
        expect(await loadHistory()).toBeNull();

        await act(async () => { api().resetMadMinute(); });
        await playRound(api, ['0']);
        await act(async () => { api().recordRound(); });
        expect(api().facts['+:0:0'].attempts).toBe(1);
    });

    it('is not undone by facts that were still loading', async () => {
        await saveFacts(SAVED);
        const api = mount();
        act(() => { api().clearHistory(); });
        await act(async () => {});
        expect(api().facts).toEqual({});
        expect(await loadFacts()).toBeNull();
    });

    it('drops a round that was waiting for the load', async () => {
        await saveFacts(SAVED);
        const api = mount();
        act(() => { api().addQuestion(); });
        act(() => { api().submitResponse('0', 0); });
        act(() => { api().submitResponse('0', 1); });
        act(() => { api().recordRound(); });
        act(() => { api().clearHistory(); });
        await act(async () => {});
        expect(api().facts).toEqual({});
        expect(await loadFacts()).toBeNull();
    });
});
