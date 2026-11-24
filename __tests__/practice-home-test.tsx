import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '@/app/(screens)/homescreen';
import { MadMinuteProvider, useMadMinute } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { savePractice, loadPractice } from '@/contexts/MadMinuteContext/practiceStorage';
import { emptyPractice, recordPracticeRound, withGoal } from '@/contexts/MadMinuteContext/practice';
import { expectControlsNamed } from '@/test-utils/a11y';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockRoute = { routeBack: jest.fn(), routeTo: jest.fn(), routeReplace: jest.fn() };
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => mockRoute }));

jest.setTimeout(30000);

async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

let api!: ReturnType<typeof useMadMinute>;
const Probe = () => {
    api = useMadMinute();
    return null;
};

async function render() {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
        tree = create(<MadMinuteProvider><HomeScreen /><Probe /></MadMinuteProvider>);
    });
    await settle();
    return tree;
}

type Tree = Awaited<ReturnType<typeof render>>;

const texts = (tree: Tree) => JSON.stringify(tree.toJSON());
const goalButton = (tree: Tree) =>
    tree.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Daily goal') && typeof n.props.onPress === 'function');

const NOW = new Date(2026, 10, 23, 12).getTime();
const DAY = 86_400_000;

describe('the goal and streak on the home screen', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
    });

    it('is not there for a player who has not finished a round, so a new install looks as it did', async () => {
        const tree = await render();
        expect(texts(tree)).not.toMatch(/in a row|rounds? today|Daily goal/);
        expect(goalButton(tree)).toHaveLength(0);
    });

    it('shows the goal, the marks and the streak once a round is done', async () => {
        await savePractice(withGoal(recordPracticeRound(recordPracticeRound(emptyPractice(), NOW - DAY), NOW), 2));
        const tree = await render();
        const json = texts(tree);
        expect(json).toContain('1 of 2 rounds today');
        expect(json).toContain('✓ ○');
        expect(json).toContain('2 days in a row');
    });

    it('is read as one line by a screen reader', async () => {
        await savePractice(withGoal(recordPracticeRound(emptyPractice(), NOW), 2));
        const tree = await render();
        const summary = tree.root.findAll(n => n.props.accessibilityLabel === '1 of 2 rounds today. 1 day in a row');
        expect(summary.length).toBeGreaterThan(0);
    });

    it('shows no streak, and no message, once the streak has run out', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), NOW - 10 * DAY));
        const tree = await render();
        const json = texts(tree);
        expect(json).toContain('0 of 1 round today');
        expect(json).not.toMatch(/in a row|lost|broke|reset/i);
    });

    it('changes the goal with the button, and keeps it', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), NOW));
        const tree = await render();
        expect(goalButton(tree)[0].props.accessibilityLabel).toBe('Daily goal: 1 round a day. Change');
        await act(async () => { goalButton(tree)[0].props.onPress(); });
        await settle();
        expect(api.practice.goal).toBe(2);
        expect(texts(tree)).toContain('Goal: 2 rounds a day');
        expect((await loadPractice())!.goal).toBe(2);
        await act(async () => { goalButton(tree)[0].props.onPress(); });
        await act(async () => { goalButton(tree)[0].props.onPress(); });
        expect(api.practice.goal).toBe(1);
    });

    it('has every control named and with a role', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), NOW));
        const tree = await render();
        expectControlsNamed(tree.root);
    });

    it('still has the Start and History buttons', async () => {
        await savePractice(recordPracticeRound(emptyPractice(), NOW));
        const tree = await render();
        for (const label of ['Start', 'History']) {
            expect(tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
        }
    });
});
