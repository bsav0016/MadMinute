import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PlayMadMinute from '../play-mad-minute';
import { Routes } from '../Routes';
import { MadMinuteProvider, useMadMinute } from '@/contexts/MadMinuteContext/MadMinuteContext';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

const mockRouteTo = jest.fn();
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => ({ routeTo: mockRouteTo }) }));

const COUNTDOWN = 3;
const ROUND = 60;

type Api = ReturnType<typeof useMadMinute>;

async function render() {
    let latest!: Api;
    const Probe = () => {
        latest = useMadMinute();
        return null;
    };
    let tree!: ReturnType<typeof create>;
    await act(async () => {
        tree = create(<MadMinuteProvider><Probe /><PlayMadMinute /></MadMinuteProvider>);
    });
    // The text a node shows, however many wrappers (ThemedText, the Text mock) sit around it.
    const textOf = (node: ReactTestInstance | string): string =>
        typeof node === 'string' ? node : node.children.map(textOf).join('');
    const texts = () => tree.root.findAllByType(Text).map(textOf);
    const find = (label: string): ReactTestInstance =>
        tree.root.findAllByType(TouchableOpacity).find((b) =>
            b.props.accessibilityLabel === label || b.findAllByType(Text).some((t) => textOf(t) === label))!;
    const tap = async (target: ReactTestInstance) => { await act(async () => { target.props.onPress(); }); };
    const type = async (digits: string) => { for (const d of digits) await tap(find(d)); };
    const advance = async (seconds: number) => { await act(async () => { jest.advanceTimersByTime(seconds * 1000); }); };
    return { tree, api: () => latest, texts, find, tap, type, advance };
}

describe('the play screen', () => {
    beforeEach(async () => {
        jest.useFakeTimers();
        mockRouteTo.mockClear();
        // Every question is 0 + 0, so the numbers on screen can never be mistaken for a typed answer.
        jest.spyOn(Math, 'random').mockReturnValue(0);
        await AsyncStorage.clear();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('counts down 3, 2, 1 before the round and shows no question until then', async () => {
        const { texts, advance } = await render();
        expect(texts()).toContain(String(COUNTDOWN));
        expect(texts().some((t) => t.startsWith('Time:'))).toBe(false);
        await advance(1);
        expect(texts()).toContain(String(COUNTDOWN - 1));
        await advance(1);
        expect(texts()).toContain(String(COUNTDOWN - 2));
    });

    it('starts the round at the full time once the countdown ends', async () => {
        const { texts, advance, find } = await render();
        await advance(COUNTDOWN);
        expect(texts()).toContain(`Time: ${ROUND}`);
        expect(find('Next')).toBeDefined();
    });

    it('counts the round time down second by second', async () => {
        const { texts, advance } = await render();
        await advance(COUNTDOWN + 10);
        expect(texts()).toContain(`Time: ${ROUND - 10}`);
        await advance(25);
        expect(texts()).toContain(`Time: ${ROUND - 35}`);
    });

    it('does not go to the results before the round is over', async () => {
        const { advance } = await render();
        await advance(COUNTDOWN + ROUND - 1);
        expect(mockRouteTo).not.toHaveBeenCalled();
    });

    it('goes to the results once, when the time reaches zero', async () => {
        const { texts, advance } = await render();
        await advance(COUNTDOWN + ROUND + 1);
        expect(texts()).toContain('Time: 0');
        expect(mockRouteTo).toHaveBeenCalledTimes(1);
        expect(mockRouteTo).toHaveBeenCalledWith(Routes.Results);
        await advance(10);
        expect(mockRouteTo).toHaveBeenCalledTimes(1);
    });

    it('stops the clock when the screen is closed', async () => {
        const { tree, advance } = await render();
        await advance(COUNTDOWN + 5);
        act(() => { tree.unmount(); });
        await advance(ROUND + 10);
        expect(mockRouteTo).not.toHaveBeenCalled();
    });

    it('shows a question and keeps Next off until something is typed', async () => {
        const { api, advance, find } = await render();
        await advance(COUNTDOWN);
        expect(api().madMinute.questions).toHaveLength(1);
        expect(find('Next').props.disabled).toBe(true);
    });

    it('types digits into the answer, deletes the last one and clears the rest', async () => {
        const { texts, advance, type, tap, find } = await render();
        await advance(COUNTDOWN);
        await type('123');
        expect(texts()).toContain('123');
        expect(find('Next').props.disabled).toBe(false);
        await tap(find('Delete last digit'));
        expect(texts()).toContain('12');
        await tap(find('Clear answer'));
        expect(texts()).not.toContain('12');
        expect(find('Next').props.disabled).toBe(true);
    });

    it('limits an answer to six digits', async () => {
        const { texts, advance, type } = await render();
        await advance(COUNTDOWN);
        await type('12345678');
        expect(texts()).toContain('123456');
        expect(texts()).not.toContain('1234567');
    });

    it('submits the typed answer, adds the next question and empties the box', async () => {
        const { api, texts, advance, type, tap, find } = await render();
        await advance(COUNTDOWN);
        await type('42');
        await tap(find('Next'));
        const questions = api().madMinute.questions;
        expect(questions).toHaveLength(2);
        expect(questions[0].response).toBe('42');
        expect(questions[1].response).toBeUndefined();
        expect(texts()).not.toContain('42');
        expect(find('Next').props.disabled).toBe(true);
    });

    it('records a skipped question with an empty answer, even if something was typed, and moves on', async () => {
        const { api, advance, type, tap, find } = await render();
        await advance(COUNTDOWN);
        await type('7');
        await tap(find('Skip'));
        const questions = api().madMinute.questions;
        expect(questions[0].response).toBe('');
        expect(questions).toHaveLength(2);
    });
});
