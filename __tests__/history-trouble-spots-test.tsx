import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import History from '@/app/(screens)/history';
import { MadMinuteProvider } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { saveFacts } from '@/contexts/MadMinuteContext/factStorage';
import { saveHistory } from '@/contexts/MadMinuteContext/historyStorage';
import { FactStats } from '@/contexts/MadMinuteContext/factStats';
import { MadMinuteOperator } from '@/contexts/MadMinuteContext/MadMinuteOperator';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => ({ routeBack: jest.fn(), routeTo: jest.fn() }) }));

// Loading the screen compiles a lot on a cold CI machine.
jest.setTimeout(30000);

const ROUND = {
    id: 'r1', playedAt: 1_700_000_000_000, operators: [MadMinuteOperator.Multiplication], minValue: 1, maxValue: 12,
    durationSeconds: 60, correct: 20, incorrect: 5, skipped: 1,
    byOperator: { [MadMinuteOperator.Multiplication]: { correct: 20, incorrect: 5, skipped: 1 } },
};

const stat = (attempts: number, correct: number, timedCorrect: number, correctMs: number) =>
    ({ attempts, correct, timedCorrect, correctMs, lastSeen: 1 });

async function render() {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
        tree = create(<MadMinuteProvider><History /></MadMinuteProvider>);
    });
    await act(async () => {}); // saved history and facts finish loading
    const textOf = (node: ReactTestInstance | string): string =>
        typeof node === 'string' ? node : node.children.map(textOf).join('');
    const texts = () => tree.root.findAllByType(Text).map(textOf);
    return { tree, texts };
}

describe('Trouble spots on the History screen', () => {
    beforeEach(async () => { await AsyncStorage.clear(); });

    it('lists the weakest facts, worst first, with accuracy and time', async () => {
        const facts: FactStats = {
            'x:7:8': stat(6, 2, 2, 2 * 6400),
            'x:6:7': stat(4, 3, 3, 3 * 4400),
            'x:2:3': stat(10, 10, 10, 10 * 1500),
        };
        await saveHistory([ROUND]);
        await saveFacts(facts);
        const { texts } = await render();
        const shown = texts();
        expect(shown).toContain('Trouble spots');
        expect(shown).toContain('7 × 8');
        expect(shown).toContain('33% right · 6.4 s');
        expect(shown).toContain('6 × 7');
        expect(shown).not.toContain('2 × 3');
        expect(shown.indexOf('7 × 8')).toBeLessThan(shown.indexOf('6 × 7'));
    });

    it('shows at most five', async () => {
        const facts: FactStats = {};
        for (const b of [3, 4, 5, 6, 7, 8, 9]) facts[`x:2:${b}`] = stat(5, 1, 1, 5000);
        await saveHistory([ROUND]);
        await saveFacts(facts);
        const { texts } = await render();
        expect(texts().filter((t) => /^2 × \d$/.test(t))).toHaveLength(5);
    });

    it('lists trouble spots from other operations too', async () => {
        await saveHistory([ROUND]);
        await saveFacts({ '÷:56:7': stat(4, 1, 1, 6000), '-:15:8': stat(5, 2, 2, 8000) });
        const { texts } = await render();
        expect(texts()).toContain('56 ÷ 7');
        expect(texts()).toContain('15 − 8');
    });

    it('says nothing stands out, rather than showing an empty list, when there are no trouble spots', async () => {
        await saveHistory([ROUND]);
        await saveFacts({ 'x:2:3': stat(10, 10, 10, 10 * 1500) });
        const { texts } = await render();
        expect(texts().some((t) => t.startsWith('Nothing stands out yet'))).toBe(true);
    });

    it('says the same before any facts have been recorded', async () => {
        await saveHistory([ROUND]);
        const { texts } = await render();
        expect(texts().some((t) => t.startsWith('Nothing stands out yet'))).toBe(true);
    });

    it('shows the times table once multiplication facts exist, with a summary for screen readers', async () => {
        await saveHistory([ROUND]);
        await saveFacts({ 'x:7:8': stat(6, 1, 1, 6000), 'x:2:3': stat(10, 10, 10, 15000) });
        const { tree, texts } = await render();
        expect(texts()).toContain('Times table');
        const labels = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string')
            .map((n) => n.props.accessibilityLabel as string);
        expect(labels).toContain('Times table grid. 1 multiplication fact needs work.');
    });

    it('leaves the times table out when only other operations have been practised', async () => {
        await saveHistory([ROUND]);
        await saveFacts({ '+:3:4': stat(5, 5, 5, 5000) });
        const { texts } = await render();
        expect(texts()).not.toContain('Times table');
    });

    it('shows nothing of this when there is no history at all', async () => {
        const { texts } = await render();
        expect(texts()).toContain('No rounds yet');
        expect(texts()).not.toContain('Trouble spots');
    });
});
