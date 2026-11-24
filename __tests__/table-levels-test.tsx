import React, { useEffect } from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import History from '@/app/(screens)/history';
import Results from '@/app/(screens)/results';
import { MadMinuteProvider, useMadMinute } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { saveFacts } from '@/contexts/MadMinuteContext/factStorage';
import { saveHistory } from '@/contexts/MadMinuteContext/historyStorage';
import { saveSettings } from '@/contexts/MadMinuteContext/settingsStorage';
import { MadMinuteSettings } from '@/contexts/MadMinuteContext/MadMinuteSettings';
import { FactStats } from '@/contexts/MadMinuteContext/factStats';
import { MadMinuteOperator } from '@/contexts/MadMinuteContext/MadMinuteOperator';
import { Routes } from '@/constants/Routes';
import { expectControlsNamed } from '@/test-utils/a11y';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/contexts/MadMinuteContext/reviewPrompt', () => ({ maybeRequestReview: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
const mockRoute = { routeBack: jest.fn(), routeTo: jest.fn(), routeReplace: jest.fn() };
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => mockRoute }));

jest.setTimeout(30000);

const { Multiplication } = MadMinuteOperator;
const ROUND = {
    id: 'r1', playedAt: 1_700_000_000_000, operators: [Multiplication], minValue: 1, maxValue: 12,
    durationSeconds: 60, correct: 20, incorrect: 5, skipped: 1,
    byOperator: { [Multiplication]: { correct: 20, incorrect: 5, skipped: 1 } },
};
const stat = (attempts: number, correct = attempts) =>
    ({ attempts, correct, timedCorrect: correct, correctMs: correct * 2000, lastSeen: 1 });

const textOf = (node: ReactTestInstance | string): string =>
    typeof node === 'string' ? node : node.children.map(textOf).join('');

let api!: ReturnType<typeof useMadMinute>;
const Probe = () => {
    api = useMadMinute();
    return null;
};

async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

async function renderHistory() {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
        tree = create(<MadMinuteProvider><History /><Probe /></MadMinuteProvider>);
    });
    await settle();
    return { tree, texts: () => tree.root.findAllByType(Text).map(textOf) };
}

// The 2s: eight facts asked three times and answered well; 2 x 9 asked once. One more good answer to 2 x 9 makes nine.
const nearlyKnown = (): FactStats => {
    const facts: FactStats = {};
    for (let n = 1; n <= 8; n++) facts[`x:${Math.min(2, n)}:${Math.max(2, n)}`] = stat(3);
    facts['x:2:9'] = stat(1);
    return facts;
};

describe('the times table levels on the History screen', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
        mockRoute.routeTo.mockClear();
    });

    it('is not shown when no multiplication has been played', async () => {
        await saveHistory([{ ...ROUND, operators: [MadMinuteOperator.Addition] }]);
        const { texts } = await renderHistory();
        expect(texts()).not.toContain('Times table levels');
    });

    it('has a row for each table from 2 to 12, with the level in words and a mark', async () => {
        await saveHistory([ROUND]);
        await saveFacts(nearlyKnown());
        const { texts, tree } = await renderHistory();
        const shown = texts();
        expect(shown).toContain('Times table levels');
        for (let table = 2; table <= 12; table++) expect(shown).toContain(`${table}s`);
        expect(shown).toContain('• Learning');
        expect(shown).toContain('– Not started');
        // The 2s have eight solid facts (the counts are the second text of each row).
        expect(shown).toContain('8/12');
        const rows = tree.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('2s:'));
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].props.accessibilityLabel).toBe('2s: Learning, 8 of 12 facts solid');
    });

    it('says known and mastered with their own marks', async () => {
        const facts: FactStats = {};
        for (let n = 1; n <= 9; n++) facts[`x:${Math.min(9, n)}:${Math.max(9, n)}`] = stat(2);
        for (let n = 1; n <= 12; n++) facts[`x:${Math.min(5, n)}:${Math.max(5, n)}`] = stat(3); // after, so the shared 5 x 9 is strong
        await saveHistory([ROUND]);
        await saveFacts(facts);
        const { texts } = await renderHistory();
        expect(texts()).toContain('★ Mastered');
        expect(texts()).toContain('✓ Known');
    });

    it('starts a round of one table from its Practice button, without touching the usual setup', async () => {
        const usual = new MadMinuteSettings(0, 10, [MadMinuteOperator.Addition], 30);
        await saveSettings(usual);
        await saveHistory([ROUND]);
        await saveFacts(nearlyKnown());
        const { tree } = await renderHistory();
        const button = tree.root.findAll(n => n.props.accessibilityLabel === 'Practice the 7s' && typeof n.props.onPress === 'function');
        await act(async () => { button[0].props.onPress(); });
        expect(api.madMinute.table).toBe(7);
        expect(api.madMinute.settings).toEqual(usual);
        expect(mockRoute.routeTo).toHaveBeenCalledWith(Routes.PlayMadMinute);
    });

    it('has every control named and with a role', async () => {
        await saveHistory([ROUND]);
        await saveFacts(nearlyKnown());
        const { tree } = await renderHistory();
        expectControlsNamed(tree.root);
        const names = tree.root.findAll(n => typeof n.type === 'string' && n.props.accessibilityRole === 'button')
            .map(n => n.props.accessibilityLabel);
        for (let table = 2; table <= 12; table++) expect(names).toContain(`Practice the ${table}s`);
    });
});

describe('the level-up line on the results screen', () => {
    // Plays a round of the 2s that ends with 2 x 9 answered right, then shows the results.
    async function playAndShowResults() {
        jest.spyOn(Math, 'random').mockReturnValue(0.67); // 2 x 9 every time
        let tick = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => tick++);
        let show!: () => void;
        const Gate = () => {
            const [shown, setShown] = React.useState(false);
            useEffect(() => { show = () => setShown(true); }, []);
            return shown ? <Results /> : null;
        };
        let tree!: ReturnType<typeof create>;
        await act(async () => { tree = create(<MadMinuteProvider><Probe /><Gate /></MadMinuteProvider>); });
        await settle();
        await act(async () => { api.startPractice(2); });
        await act(async () => { api.addQuestion(); });
        await act(async () => { api.submitResponse('18', 0); });
        await act(async () => { show(); });
        await settle();
        return () => tree.root.findAllByType(Text).map(textOf);
    }

    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
    });

    it('says when a table is now known', async () => {
        await saveFacts(nearlyKnown());
        const shown = (await playAndShowResults())();
        expect(shown).toContain('You know your 2s now!');
    });

    it('says nothing when no table moved up', async () => {
        await saveFacts({ 'x:2:9': stat(1) });
        const shown = (await playAndShowResults())();
        expect(shown.some(t => /You know|mastered/.test(t))).toBe(false);
    });

    it('says nothing a second time for the same round', async () => {
        await saveFacts(nearlyKnown());
        const first = await playAndShowResults();
        expect(first().filter(t => t === 'You know your 2s now!')).toHaveLength(1);
        await act(async () => { api.recordRound(); });
        expect(api.latestLevelUps()).toHaveLength(1);
    });

    it('is cleared when the next round starts', async () => {
        await saveFacts(nearlyKnown());
        await playAndShowResults();
        expect(api.latestLevelUps().length).toBeGreaterThan(0);
        await act(async () => { api.resetMadMinute(); });
        expect(api.latestLevelUps()).toEqual([]);
    });

    it('does not claim a level-up before the saved facts have loaded', async () => {
        await saveFacts(nearlyKnown());
        jest.spyOn(Math, 'random').mockReturnValue(0.67);
        act(() => { create(<MadMinuteProvider><Probe /></MadMinuteProvider>); });
        act(() => { api.startPractice(2); }); // the 2s, before their saved record has loaded
        act(() => { api.addQuestion(); });
        act(() => { api.submitResponse('18', 0); });
        act(() => { api.recordRound(); });
        expect(api.latestLevelUps()).toEqual([]);
        await act(async () => {});
        await settle();
    });
});
