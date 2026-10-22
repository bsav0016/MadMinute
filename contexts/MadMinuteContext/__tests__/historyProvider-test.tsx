import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { loadHistory } from '../historyStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

type Api = ReturnType<typeof useMadMinute>;

// Renders the provider and hands back a getter for the latest context value.
async function setup() {
    let latest: Api;
    const Probe = () => {
        latest = useMadMinute();
        return null;
    };
    await act(async () => {
        create(<MadMinuteProvider><Probe /></MadMinuteProvider>);
    });
    return () => latest;
}

// Answers a couple of questions so there is something to record.
async function playRound(api: () => Api) {
    await act(async () => { api().addQuestion(); });
    await act(async () => { api().submitResponse('1', 0); });
    await act(async () => { api().submitResponse('2', 1); });
}

describe('round history in the provider', () => {
    beforeEach(() => AsyncStorage.clear());

    it('saves a finished round once, however many times the results screen asks', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => {
            api().recordRound();
            api().recordRound();
        });
        await act(async () => { api().recordRound(); });
        expect(api().history).toHaveLength(1);
        expect(await loadHistory()).toHaveLength(1);
    });

    it('saves each new round separately', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().recordRound(); });
        await act(async () => { api().resetMadMinute(); });
        await playRound(api);
        await act(async () => { api().recordRound(); });
        expect(api().history).toHaveLength(2);
        expect(new Set(api().history.map(r => r.id)).size).toBe(2);
    });

    it('does not record a round nothing was attempted in', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        let result: unknown = 'unset';
        await act(async () => { result = api().recordRound(); });
        expect(result).toBeNull();
        expect(api().history).toHaveLength(0);
    });

    it('restores saved history at launch and can clear it', async () => {
        const first = await setup();
        await playRound(first);
        await act(async () => { first().recordRound(); });

        const second = await setup();
        expect(second().history).toHaveLength(1);

        await act(async () => { second().clearHistory(); });
        expect(second().history).toHaveLength(0);
        expect(await loadHistory()).toBeNull();
    });
});
