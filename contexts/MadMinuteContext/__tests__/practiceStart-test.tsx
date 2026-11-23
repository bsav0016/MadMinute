import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { loadSettings, saveSettings } from '../settingsStorage';
import { loadHistory } from '../historyStorage';
import { loadFacts, saveFacts } from '../factStorage';
import { profileKeys, DEFAULT_PROFILE_ID } from '@/storage/profiles';
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
    await act(async () => {});
    return api;
}

const { Addition, Multiplication, Division } = MadMinuteOperator;
const times = new MadMinuteSettings(1, 12, [Multiplication, Division], 120, true);

const stat = (attempts: number, correct = attempts) =>
    ({ attempts, correct, timedCorrect: correct, correctMs: correct * 2000, lastSeen: 1 });

describe("starting today's practice", () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0.3);
        let tick = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => tick++);
    });
    afterEach(() => jest.restoreAllMocks());

    it('starts a round of the next table for a player who practises multiplication', async () => {
        await saveSettings(times);
        const api = await setup();
        let setup2!: ReturnType<Api['startPractice']>;
        await act(async () => { setup2 = api().startPractice(); });
        expect(setup2.table).toBe(2);
        expect(api().madMinute.table).toBe(2);
        expect(api().madMinute.questions).toEqual([]);
    });

    it('asks only that table', async () => {
        await saveSettings(times);
        const api = await setup();
        await act(async () => { api().startPractice(); });
        await act(async () => { api().addQuestion(); });
        for (let i = 0; i < 8; i++) await act(async () => { api().submitResponse('1', i); });
        for (const q of api().madMinute.questions) {
            expect(q.operator).toBe(Multiplication);
            expect([q.value1, q.value2]).toContain(2);
        }
    });

    it('leaves the usual setup of the player as it was, in the app and in storage', async () => {
        await saveSettings(times);
        const api = await setup();
        const setItem = jest.spyOn(AsyncStorage, 'setItem');
        setItem.mockClear();
        await act(async () => { api().startPractice(); });
        await act(async () => { api().addQuestion(); });
        expect(api().madMinute.settings).toEqual(times);
        expect(await loadSettings()).toEqual(times);
        expect(setItem.mock.calls.filter(([key]) => key === profileKeys(DEFAULT_PROFILE_ID).settings)).toHaveLength(0);
    });

    it('keeps the player usual setup, with no table, when they do not practise multiplication', async () => {
        await saveSettings(new MadMinuteSettings(0, 10, [Addition], 30));
        const api = await setup();
        let started!: ReturnType<Api['startPractice']>;
        await act(async () => { started = api().startPractice(); });
        expect(started.table).toBeNull();
        expect(api().madMinute.table).toBeNull();
        expect(api().madMinute.settings.availableOperators).toEqual([Addition]);
    });

    it('moves on to the table that is half learned, from the record of the player', async () => {
        await saveSettings(times);
        const facts: FactStats = { 'x:7:8': stat(2), 'x:3:7': stat(2), 'x:5:7': stat(2) };
        await saveFacts(facts);
        const api = await setup();
        let started!: ReturnType<Api['startPractice']>;
        await act(async () => { started = api().startPractice(); });
        expect(started.table).toBe(7);
    });

    it('records the finished round as a round of that table, and adds to the facts', async () => {
        await saveSettings(times);
        const api = await setup();
        await act(async () => { api().startPractice(); });
        await act(async () => { api().addQuestion(); });
        await act(async () => { api().submitResponse(String(api().madMinute.questions[0].answer), 0); });
        let record: ReturnType<Api['recordRound']> = null;
        await act(async () => { record = api().recordRound(); });
        expect(record).toMatchObject({ table: 2, minValue: 1, maxValue: 12, operators: [Multiplication], durationSeconds: 120, correct: 1 });
        expect((await loadHistory())![0]).toMatchObject({ table: 2 });
        const stored = await loadFacts();
        expect(Object.keys(stored!).every(key => key.startsWith('x:'))).toBe(true);
        expect(api().practice.today?.rounds).toBe(1);
    });

    it('goes on with the same table when the round is played again', async () => {
        await saveSettings(times);
        const api = await setup();
        await act(async () => { api().startPractice(); });
        await act(async () => { api().resetMadMinute(); });
        expect(api().madMinute.table).toBe(2);
    });

    it('is ended by choosing settings, so the Start button plays the setup the player picked', async () => {
        await saveSettings(times);
        const api = await setup();
        await act(async () => { api().startPractice(); });
        await act(async () => { api().updateSettings(new MadMinuteSettings(0, 9, [Addition], 60)); });
        expect(api().madMinute.table).toBeNull();
    });

    it('is not carried over to another player', async () => {
        await saveSettings(times);
        const api = await setup();
        await act(async () => { api().startPractice(); });
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await act(async () => {});
        expect(api().madMinute.table).toBeNull();
    });
});
