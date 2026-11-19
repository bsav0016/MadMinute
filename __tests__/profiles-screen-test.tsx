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
import { AVATARS, addProfile, defaultRegistry, loadRegistry, MAX_PROFILES, saveRegistry, TITLES } from '@/storage/profiles';
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
        jest.spyOn(Math, 'random').mockReturnValue(0); // the first word on the list
        const tree = await render();
        await press(tree, 'Add another player');
        expect(sheetOpen(tree)).toBe(true);
        expect(has(tree, 'Swift Fox, playing now')).toBe(true);
        await press(tree, 'Add a player');
        expectControlsNamed(tree.root);
        await press(tree, 'Owl');
        expect(sheetOpen(tree)).toBe(true); // choosing an animal does not add anyone yet
        expect((await loadRegistry())).toBeNull();
        await press(tree, 'Add Swift Owl');
        expect(sheetOpen(tree)).toBe(false);
        expect(has(tree, 'Playing as Swift Owl. Change player')).toBe(true);
        expect(has(tree, 'Add another player')).toBe(false);
        expect((await loadRegistry())?.active).not.toBe('default');
    });

    it('lists the players, marks who is playing, and switches on a tap', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        expect(has(tree, 'Playing as Brave Owl. Change player')).toBe(true);
        await press(tree, 'Playing as Brave Owl. Change player');
        expect(has(tree, 'Brave Owl, playing now')).toBe(true);
        expect(has(tree, 'Play as Swift Fox')).toBe(true);
        expectControlsNamed(tree.root);
        await press(tree, 'Play as Swift Fox');
        expect(sheetOpen(tree)).toBe(false);
        expect(has(tree, 'Playing as Swift Fox. Change player')).toBe(true);
    });

    it('shows each player only their own history after a switch', async () => {
        const record = buildRoundRecord(
            new MadMinuteSettings(0, 10, [MadMinuteOperator.Addition], 60, false),
            [new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, '3'), new MadMinuteQuestion(1, 2, 2, MadMinuteOperator.Addition, 4)],
            'r1', 5)!;
        await saveHistory([record], 'default');
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Play as Swift Fox');
        expect(await loadHistory('powl')).toBeNull();
        expect(await loadHistory('default')).toHaveLength(1);
    });

    it('starts the add form on the first animal nobody has, so Add works straight away', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const tree = await render();
        await press(tree, 'Add another player');
        await press(tree, 'Add a player');
        expect(byLabel(tree, 'Owl')[0].props.accessibilityState.selected).toBe(true);
        expect(byLabel(tree, 'Fox')[0].props.accessibilityState.selected).toBe(false);
        await press(tree, 'Add Swift Owl');
        expect(has(tree, 'Playing as Swift Owl. Change player')).toBe(true);
    });

    it('lets an edit pick an animal another player has, as long as the name is free', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Edit Brave Owl');
        expect(byLabel(tree, 'Fox')[0].props.disabled).toBeFalsy();
        await press(tree, 'Fox');
        await press(tree, 'Save');
        expect(has(tree, 'Brave Fox, playing now')).toBe(true);
        expect(has(tree, 'Play as Swift Fox')).toBe(true);
    });

    it('gives an edit a different word when the name it would make is taken', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Swift', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Swift Owl. Change player');
        await press(tree, 'Edit Swift Owl');
        await press(tree, 'Fox'); // Swift Fox already exists
        await press(tree, 'Save');
        expect(has(tree, 'Swift Fox, playing now')).toBe(false);
        expect(has(tree, 'Brave Fox, playing now')).toBe(true);
        expect(has(tree, 'Play as Swift Fox')).toBe(true);
    });

    it('shuffles the word until the player likes the name, and adds that', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const tree = await render();
        await press(tree, 'Add another player');
        await press(tree, 'Add a player');
        await press(tree, 'Panda');
        expect(has(tree, 'Add Swift Panda')).toBe(true);
        await press(tree, 'Shuffle word');
        expect(has(tree, 'Add Swift Panda')).toBe(false);
        expect(has(tree, 'Add Brave Panda')).toBe(true);
        await press(tree, 'Add Brave Panda');
        expect(has(tree, 'Playing as Brave Panda. Change player')).toBe(true);
        const saved = await loadRegistry();
        expect(saved?.profiles.find(p => p.avatar === 'panda')?.title).toBe('Brave');
    });

    it('keeps the player\'s id, and so their progress, when the name changes', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Edit Brave Owl');
        await press(tree, 'Shuffle word'); // random 0 skips Brave and lands on Swift
        await press(tree, 'Save');
        expect(has(tree, 'Swift Owl, playing now')).toBe(true);
        const owl = (await loadRegistry())?.profiles.find(p => p.avatar === 'owl');
        expect(owl).toMatchObject({ id: 'powl', title: 'Swift' });
    });

    it('lets a new player share an animal, with a word that makes the name free', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Add a player');
        expect(byLabel(tree, 'Fox')[0].props.disabled).toBeFalsy();
        expect(byLabel(tree, 'Frog')[0].props.accessibilityState.selected).toBe(true); // no one has Frog yet
        await press(tree, 'Fox'); // Swift Fox exists, so the word moves on
        expect(has(tree, 'Add Swift Fox')).toBe(false);
        expect(has(tree, 'Add Brave Fox')).toBe(true);
        await press(tree, 'Add Brave Fox');
        const labels = (await loadRegistry())!.profiles.map(p => `${p.title} ${p.avatar}`);
        expect(labels).toEqual(['Swift fox', 'Brave owl', 'Brave fox']);
    });

    it('starts on a free name even when every animal is already in use', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        let registry = defaultRegistry(1); // Swift Fox
        AVATARS.slice(1).forEach((a, i) => { registry = addProfile(registry, a.id, 'Brave', 2 + i, `p${i}`); });
        await saveRegistry(registry);
        const tree = await render();
        await press(tree, 'Playing as Brave Unicorn. Change player');
        await press(tree, 'Add a player');
        expect(byLabel(tree, 'Fox')[0].props.accessibilityState.selected).toBe(true);
        expect(has(tree, 'Add Swift Fox')).toBe(false); // that name is taken
        expect(has(tree, 'Add Brave Fox')).toBe(true);
    });

    it('never shuffles to a name another player has', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Add a player');
        await press(tree, 'Fox');
        await press(tree, 'Shuffle word'); // not Brave (current) and not Swift (taken)
        expect(has(tree, 'Add Clever Fox')).toBe(true);
    });

    it('changes a player\'s avatar from the edit view', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Edit Brave Owl');
        await press(tree, 'Panda');
        await press(tree, 'Save');
        expect(has(tree, 'Brave Owl, playing now')).toBe(false);
        expect(has(tree, 'Brave Panda, playing now')).toBe(true);
        expect((await loadRegistry())?.profiles.find(p => p.id === 'powl')?.avatar).toBe('panda');
    });

    it('deletes a player only after confirming, and takes their data with them', async () => {
        await saveRegistry(addProfile(defaultRegistry(1), 'owl', 'Brave', 2, 'powl'));
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const tree = await render();
        await press(tree, 'Playing as Brave Owl. Change player');
        await press(tree, 'Edit Brave Owl');
        await press(tree, 'Delete Brave Owl');
        expect(alert).toHaveBeenCalledTimes(1);
        expect(alert.mock.calls[0][0]).toBe('Delete Brave Owl?');
        expect((await loadRegistry())?.profiles).toHaveLength(2); // nothing happens until confirmed

        const buttons = alert.mock.calls[0][2]!;
        await act(async () => { buttons.find(b => b.text === 'Delete')!.onPress!(); });
        await settle();
        expect((await loadRegistry())?.profiles.map(p => p.id)).toEqual(['default']);
        expect(has(tree, 'Swift Fox, playing now')).toBe(true);
    });

    it('does not offer to delete the only player', async () => {
        const tree = await render();
        await press(tree, 'Add another player');
        await press(tree, 'Edit Swift Fox');
        expect(has(tree, 'Delete Swift Fox')).toBe(false);
    });

    it('stops offering to add players at the limit', async () => {
        let registry = defaultRegistry(1);
        for (let i = 1; i < MAX_PROFILES; i++) {
            registry = addProfile(registry, AVATARS[i % AVATARS.length].id, TITLES[i], 1 + i, `p${i}`);
        }
        await saveRegistry(registry);
        const tree = await render();
        const last = MAX_PROFILES - 1;
        await press(tree, `Playing as ${TITLES[last]} ${AVATARS[last % AVATARS.length].label}. Change player`);
        expect(has(tree, 'Add a player')).toBe(false);
    });

    it('reopens on the list after being closed from another view', async () => {
        const tree = await render();
        await press(tree, 'Add another player');
        await press(tree, 'Add a player');
        await press(tree, 'Close'); // tapping outside the sheet
        expect(sheetOpen(tree)).toBe(false);
        await press(tree, 'Add another player');
        expect(has(tree, 'Swift Fox, playing now')).toBe(true);
    });
});
