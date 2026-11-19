import React from 'react';
import { act, create } from 'react-test-renderer';
import { Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '@/app/(screens)/homescreen';
import { MadMinuteProvider } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { saveHistory, loadHistory } from '@/contexts/MadMinuteContext/historyStorage';
import { buildRoundRecord } from '@/contexts/MadMinuteContext/roundRecord';
import { MadMinuteSettings } from '@/contexts/MadMinuteContext/MadMinuteSettings';
import { MadMinuteQuestion } from '@/contexts/MadMinuteContext/MadMinuteQuestion';
import { MadMinuteOperator } from '@/contexts/MadMinuteContext/MadMinuteOperator';
import { AVATARS, addProfile, defaultRegistry, loadRegistry, saveRegistry } from '@/storage/profiles';
import { expectControlsNamed } from '@/test-utils/a11y';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockRoute = { routeBack: jest.fn(), routeTo: jest.fn(), routeReplace: jest.fn() };
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => mockRoute }));

jest.setTimeout(30000);

async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

async function render() {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
        tree = create(<MadMinuteProvider><HomeScreen /></MadMinuteProvider>);
    });
    await settle();
    return tree;
}

type Tree = Awaited<ReturnType<typeof render>>;

const byLabel = (tree: Tree, label: string) =>
    tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');

async function press(tree: Tree, label: string) {
    const matches = byLabel(tree, label);
    expect(matches.length).toBeGreaterThan(0);
    await act(async () => { matches[0].props.onPress(); });
    await settle();
}

const has = (tree: Tree, label: string) => byLabel(tree, label).length > 0;
const sheetOpen = (tree: Tree) => tree.root.findByType(Modal).props.visible === true;

describe('switching players from the home screen', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
    });

    it('shows no chip for one player, only a small link to add another', async () => {
        const tree = await render();
        expect(has(tree, 'Add another player')).toBe(true);
        expect(tree.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Playing as ')).length).toBe(0);
        expect(sheetOpen(tree)).toBe(false);
        expectControlsNamed(tree.root);
    });

    it('adds a player, switches to them and shows the chip', async () => {
        const tree = await render();
        await press(tree, 'Add another player');
        expect(sheetOpen(tree)).toBe(true);
        expect(has(tree, 'Fox, playing now')).toBe(true);
        await press(tree, 'Add a player');
        expectControlsNamed(tree.root);
        await press(tree, 'Owl');
        expect(sheetOpen(tree)).toBe(false);
        expect(has(tree, 'Playing as Owl. Change player')).toBe(true);
        expect(has(tree, 'Add another player')).toBe(false);
        expect((await loadRegistry())?.active).not.toBe('default');
    });

    it('lists the players, marks who is playing, and switches on a tap', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 2, 'powl'));
        const tree = await render();
        expect(has(tree, 'Playing as Owl. Change player')).toBe(true);
        await press(tree, 'Playing as Owl. Change player');
        expect(has(tree, 'Owl, playing now')).toBe(true);
        expect(has(tree, 'Play as Fox')).toBe(true);
        expectControlsNamed(tree.root);
        await press(tree, 'Play as Fox');
        expect(sheetOpen(tree)).toBe(false);
        expect(has(tree, 'Playing as Fox. Change player')).toBe(true);
    });

    it('shows each player only their own history after a switch', async () => {
        const record = buildRoundRecord(
            new MadMinuteSettings(0, 10, [MadMinuteOperator.Addition], 60, false),
            [new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, '3'), new MadMinuteQuestion(1, 2, 2, MadMinuteOperator.Addition, 4)],
            'r1', 5)!;
        await saveHistory([record], 'default');
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Owl. Change player');
        await press(tree, 'Play as Fox');
        expect(await loadHistory('powl')).toBeNull();
        expect(await loadHistory('default')).toHaveLength(1);
    });

    it('offers only avatars nobody uses, and says why the others are off', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Owl. Change player');
        await press(tree, 'Add a player');
        const fox = byLabel(tree, 'Fox')[0];
        const frog = byLabel(tree, 'Frog')[0];
        expect(fox.props.disabled).toBe(true);
        expect(fox.props.accessibilityHint).toBe('Already used by another player');
        expect(frog.props.disabled).toBeFalsy();
    });

    it('changes a player\'s avatar from the edit view', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Owl. Change player');
        await press(tree, 'Edit Owl');
        await press(tree, 'Panda');
        expect(has(tree, 'Owl, playing now')).toBe(false);
        expect(has(tree, 'Panda, playing now')).toBe(true);
        expect((await loadRegistry())?.profiles.find(p => p.id === 'powl')?.avatar).toBe('panda');
    });

    it('deletes a player only after confirming, and takes their data with them', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 2, 'powl'));
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const tree = await render();
        await press(tree, 'Playing as Owl. Change player');
        await press(tree, 'Edit Owl');
        await press(tree, 'Delete Owl');
        expect(alert).toHaveBeenCalledTimes(1);
        expect(alert.mock.calls[0][0]).toBe('Delete Owl?');
        expect((await loadRegistry())?.profiles).toHaveLength(2); // nothing happens until confirmed

        const buttons = alert.mock.calls[0][2]!;
        await act(async () => { buttons.find(b => b.text === 'Delete')!.onPress!(); });
        await settle();
        expect((await loadRegistry())?.profiles.map(p => p.id)).toEqual(['default']);
        expect(has(tree, 'Fox, playing now')).toBe(true);
    });

    it('does not offer to delete the only player', async () => {
        const tree = await render();
        await press(tree, 'Add another player');
        await press(tree, 'Edit Fox');
        expect(has(tree, 'Delete Fox')).toBe(false);
    });

    it('stops offering to add players at the limit', async () => {
        let registry = defaultRegistry(1);
        AVATARS.slice(1).forEach((a, i) => { registry = addProfile(registry, a.id, 2 + i, `p${i}`); });
        await saveRegistry(registry);
        const tree = await render();
        await press(tree, `Playing as ${AVATARS[AVATARS.length - 1].label}. Change player`);
        expect(has(tree, 'Add a player')).toBe(false);
    });

    it('reopens on the list after being closed from another view', async () => {
        const tree = await render();
        await press(tree, 'Add another player');
        await press(tree, 'Add a player');
        await press(tree, 'Close'); // tapping outside the sheet
        expect(sheetOpen(tree)).toBe(false);
        await press(tree, 'Add another player');
        expect(has(tree, 'Fox, playing now')).toBe(true);
    });
});
