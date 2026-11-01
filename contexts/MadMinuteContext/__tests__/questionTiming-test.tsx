import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

type Api = ReturnType<typeof useMadMinute>;

async function setup() {
    let latest!: Api;
    const Probe = () => {
        latest = useMadMinute();
        return null;
    };
    await act(async () => {
        create(<MadMinuteProvider><Probe /></MadMinuteProvider>);
    });
    return () => latest;
}

describe('answer timing in the provider', () => {
    let now = 1_000_000;
    beforeEach(async () => {
        now = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        await AsyncStorage.clear();
    });
    afterEach(() => jest.restoreAllMocks());

    it('records when a question was answered and how long it took', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        now += 2500;
        await act(async () => { api().submitResponse('7', 0); });
        const [answered, next] = api().madMinute.questions;
        expect(answered.shownAt).toBe(1_000_000);
        expect(answered.answeredAt).toBe(1_002_500);
        expect(answered.responseMs()).toBe(2500);
        // The next question is shown the moment the last was answered.
        expect(next.shownAt).toBe(1_002_500);
        expect(next.answeredAt).toBeUndefined();
    });

    it('records no time for a skip', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        now += 900;
        await act(async () => { api().submitResponse('', 0); });
        expect(api().madMinute.questions[0].responseMs()).toBeNull();
    });

    it('restamps the question on screen when the round really starts', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        now += 3000; // the countdown
        await act(async () => { api().markQuestionShown(); });
        expect(api().madMinute.questions[0].shownAt).toBe(1_003_000);
        now += 1200;
        await act(async () => { api().submitResponse('5', 0); });
        expect(api().madMinute.questions[0].responseMs()).toBe(1200);
    });

    it('only restamps a question that has not been answered', async () => {
        const api = await setup();
        await act(async () => { api().addQuestion(); });
        await act(async () => { api().submitResponse('5', 0); });
        const before = api().madMinute.questions[0].shownAt;
        now += 5000;
        await act(async () => { api().markQuestionShown(); });
        expect(api().madMinute.questions[0].shownAt).toBe(before); // answered: untouched
        expect(api().madMinute.questions[1].shownAt).toBe(1_005_000); // the one on screen
    });

    it('does nothing when there is no question yet', async () => {
        const api = await setup();
        await act(async () => { api().markQuestionShown(); });
        expect(api().madMinute.questions).toEqual([]);
    });
});
