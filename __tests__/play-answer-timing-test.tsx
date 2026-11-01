import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PlayMadMinute from '@/app/(screens)/play-mad-minute';
import { MadMinuteProvider, useMadMinute } from '@/contexts/MadMinuteContext/MadMinuteContext';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
// One stable function: a new one each render would restart the screen's timer effect every time.
const mockRouteTo = jest.fn();
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => ({ routeTo: mockRouteTo }) }));

const COUNTDOWN = 3;

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
    const textOf = (node: ReactTestInstance | string): string =>
        typeof node === 'string' ? node : node.children.map(textOf).join('');
    const find = (label: string): ReactTestInstance =>
        tree.root.findAllByType(TouchableOpacity).find((b) =>
            b.props.accessibilityLabel === label || b.findAllByType(Text).some((t) => textOf(t) === label))!;
    const tap = async (target: ReactTestInstance) => { await act(async () => { target.props.onPress(); }); };
    const advance = async (seconds: number) => { await act(async () => { jest.advanceTimersByTime(seconds * 1000); }); };
    return { api: () => latest, find, tap, advance };
}

describe('answer timing on the play screen', () => {
    beforeEach(async () => {
        jest.useFakeTimers();
        // Every question is 0 + 0, so the answer is typed with the 0 key.
        jest.spyOn(Math, 'random').mockReturnValue(0);
        await AsyncStorage.clear();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('does not count the 3-2-1 countdown as thinking time for the first question', async () => {
        const { api, advance, tap, find } = await render();
        await advance(COUNTDOWN); // the round starts now
        await advance(2); // the player thinks for two seconds
        await tap(find('0'));
        await tap(find('Next'));
        expect(api().madMinute.questions[0].responseMs()).toBe(2000);
    });

    it('times the second question from the moment the first was answered', async () => {
        const { api, advance, tap, find } = await render();
        await advance(COUNTDOWN);
        await advance(1);
        await tap(find('0'));
        await tap(find('Next'));
        await advance(4);
        await tap(find('0'));
        await tap(find('Next'));
        expect(api().madMinute.questions[1].responseMs()).toBe(4000);
    });
});
