import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Switch, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateMadMinute from '@/app/(screens)/create-mad-minute';
import { MadMinuteProvider, useMadMinute } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { saveFacts } from '@/contexts/MadMinuteContext/factStorage';
import { saveSettings } from '@/contexts/MadMinuteContext/settingsStorage';
import { MadMinuteSettings } from '@/contexts/MadMinuteContext/MadMinuteSettings';
import { MadMinuteOperator } from '@/contexts/MadMinuteContext/MadMinuteOperator';
import { FactStats } from '@/contexts/MadMinuteContext/factStats';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => ({ routeBack: jest.fn(), routeTo: jest.fn() }) }));
jest.mock('@/components/MinMaxSlider', () => ({ MinMaxSlider: () => null }));
jest.mock('@/contexts/ToastContext', () => ({ useToast: () => ({ addToast: jest.fn() }) }));

// Loading the screen compiles a lot on a cold CI machine.
jest.setTimeout(30000);

const { Multiplication } = MadMinuteOperator;
const stat = (attempts: number, correct: number) =>
    ({ attempts, correct, timedCorrect: correct, correctMs: correct * 2000, lastSeen: 1 });

const ENOUGH: FactStats = { 'x:2:3': stat(50, 50), 'x:7:8': stat(10, 2) };
const TOO_LITTLE: FactStats = { 'x:7:8': stat(10, 2) };

const textOf = (node: ReactTestInstance | string): string =>
    typeof node === 'string' ? node : node.children.map(textOf).join('');

async function renderScreen() {
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<MadMinuteProvider><CreateMadMinute /></MadMinuteProvider>); });
    await act(async () => {}); // saved settings and facts finish loading
    const focusSwitch = () => tree.root.findAllByType(Switch).find((s) => s.props.accessibilityLabel === 'Focus on my weak spots')!;
    const texts = () => tree.root.findAllByType(Text).map(textOf);
    return { tree, focusSwitch, texts };
}

describe('Focus on my weak spots setting', () => {
    beforeEach(async () => { await AsyncStorage.clear(); });

    it('is off and disabled, with a hint, until there are enough answers on record', async () => {
        await saveFacts(TOO_LITTLE);
        const { focusSwitch, texts } = await renderScreen();
        expect(focusSwitch().props.value).toBe(false);
        expect(focusSwitch().props.disabled).toBe(true);
        expect(texts().some((t) => t.startsWith('Available after you have answered 50 questions'))).toBe(true);
    });

    it('can be turned on once there is enough, and is remembered', async () => {
        await saveFacts(ENOUGH);
        const { focusSwitch } = await renderScreen();
        expect(focusSwitch().props.disabled).toBe(false);
        expect(focusSwitch().props.value).toBe(false);

        await act(async () => { focusSwitch().props.onValueChange(true); });
        expect(focusSwitch().props.value).toBe(true);

        const saved = JSON.parse((await AsyncStorage.getItem('madminute.settings'))!);
        expect(saved.data.focusOnWeakSpots).toBe(true);
    });

    it('shows as off, rather than stuck on, if the record is cleared afterwards', async () => {
        await saveSettings(new MadMinuteSettings(1, 12, [Multiplication], 60, true));
        const { focusSwitch } = await renderScreen();
        expect(focusSwitch().props.disabled).toBe(true);
        expect(focusSwitch().props.value).toBe(false);
    });
});

describe('questions in focus mode', () => {
    beforeEach(async () => { await AsyncStorage.clear(); });

    async function playQuestions(count: number) {
        let latest!: ReturnType<typeof useMadMinute>;
        const Probe = () => { latest = useMadMinute(); return null; };
        await act(async () => { create(<MadMinuteProvider><Probe /></MadMinuteProvider>); });
        await act(async () => {});
        for (let i = 0; i < count; i++) {
            await act(async () => { latest.addQuestion(); });
        }
        return latest.madMinute.questions;
    }

    const isWeak = (q: { value1: number; value2: number }) => [q.value1, q.value2].sort().join() === '7,8';

    it('asks the weak fact far more often when on, with enough on record', async () => {
        await saveFacts(ENOUGH);
        await saveSettings(new MadMinuteSettings(1, 12, [Multiplication], 60, true));
        const questions = await playQuestions(150);
        expect(questions.filter(isWeak).length).toBeGreaterThan(40);
    });

    it('draws as usual when off', async () => {
        await saveFacts(ENOUGH);
        await saveSettings(new MadMinuteSettings(1, 12, [Multiplication], 60, false));
        const questions = await playQuestions(150);
        expect(questions.filter(isWeak).length).toBeLessThan(15);
    });
});
