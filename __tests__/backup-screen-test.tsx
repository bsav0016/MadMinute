import React from 'react';
import { act, create } from 'react-test-renderer';
import { Alert, Modal, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '@/app/(screens)/homescreen';
import { MadMinuteProvider } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { buildBackupText, readBackup } from '@/contexts/MadMinuteContext/backup';
import { saveHistory } from '@/contexts/MadMinuteContext/historyStorage';
import { buildRoundRecord } from '@/contexts/MadMinuteContext/roundRecord';
import { MadMinuteSettings } from '@/contexts/MadMinuteContext/MadMinuteSettings';
import { MadMinuteQuestion } from '@/contexts/MadMinuteContext/MadMinuteQuestion';
import { MadMinuteOperator } from '@/contexts/MadMinuteContext/MadMinuteOperator';
import { addProfile, AVATARS, defaultRegistry, loadRegistry, MAX_PROFILES, saveRegistry, TITLES } from '@/storage/profiles';
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
const has = (tree: Tree, label: string) => byLabel(tree, label).length > 0;
const sheetOpen = (tree: Tree) => tree.root.findByType(Modal).props.visible === true;

async function press(tree: Tree, label: string) {
    const matches = byLabel(tree, label);
    expect(matches.length).toBeGreaterThan(0);
    await act(async () => { matches[0].props.onPress(); });
    await settle();
}

const pasteBox = (tree: Tree) =>
    tree.root.find(n => n.props.accessibilityLabel === 'Backup text' && typeof n.type === 'string');

async function paste(tree: Tree, text: string) {
    await act(async () => { pasteBox(tree).props.onChangeText(text); });
}

const textOf = (tree: Tree) => JSON.stringify(tree.toJSON());

const record = () => buildRoundRecord(
    new MadMinuteSettings(0, 10, [MadMinuteOperator.Addition], 60, false),
    [new MadMinuteQuestion(0, 1, 2, MadMinuteOperator.Addition, 3, '3'), new MadMinuteQuestion(1, 2, 2, MadMinuteOperator.Addition, 4)],
    'r1', 5)!;

const owlBackup = () => buildBackupText({
    exportedAt: 1,
    profile: { id: 'powl', avatar: 'owl', title: 'Brave' },
    settings: null,
    history: [record()],
    facts: {},
});

async function openSheet(tree: Tree) {
    await press(tree, 'Add another player');
}

describe('backing up and restoring from the player sheet', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
    });

    it('offers to back up and restore, saying whose progress it is', async () => {
        const tree = await render();
        await openSheet(tree);
        expect(has(tree, 'Back up progress')).toBe(true);
        expect(has(tree, 'Restore progress')).toBe(true);
        expect(textOf(tree)).toContain("Swift Fox");
        expectControlsNamed(tree.root);
    });

    it("shares the active player's backup text through the share sheet", async () => {
        await saveHistory([record()], 'default');
        const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
        const tree = await render();
        await openSheet(tree);
        await press(tree, 'Back up progress');
        expect(share).toHaveBeenCalledTimes(1);
        const message = (share.mock.calls[0][0] as { message: string }).message;
        const read = readBackup(message);
        expect(read.ok && read.backup.profile.id).toBe('default');
        expect(read.ok && read.backup.history).toHaveLength(1);
        expect(message).toContain('Swift Fox');
    });

    it('says so, without crashing, if the share sheet cannot open', async () => {
        jest.spyOn(Share, 'share').mockRejectedValue(new Error('no share sheet'));
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const tree = await render();
        await openSheet(tree);
        await press(tree, 'Back up progress');
        expect(alert).toHaveBeenCalledWith('Could not share', expect.any(String));
    });

    it('restores a pasted backup as a new player and switches to them', async () => {
        const tree = await render();
        await openSheet(tree);
        await press(tree, 'Restore progress');
        expectControlsNamed(tree.root);
        expect(byLabel(tree, 'Restore')[0].props.disabled).toBe(true); // nothing pasted yet
        await paste(tree, `Here it is:\n\n${owlBackup()}\n\nThanks`);
        expect(byLabel(tree, 'Restore')[0].props.disabled).toBeFalsy();
        await press(tree, 'Restore');
        expect(sheetOpen(tree)).toBe(false);
        expect(has(tree, 'Playing as Brave Owl. Change player')).toBe(true);
        expect((await loadRegistry())?.active).toBe('powl');
    });

    it('says what is wrong with text that is not a backup, and clears the message once they edit it', async () => {
        const tree = await render();
        await openSheet(tree);
        await press(tree, 'Restore progress');
        await paste(tree, 'my homework answers');
        await press(tree, 'Restore');
        expect(sheetOpen(tree)).toBe(true);
        expect(textOf(tree)).toContain("doesn't look like a Mad Minute backup");
        await paste(tree, 'my homework answers 2');
        expect(textOf(tree)).not.toContain("doesn't look like a Mad Minute backup");
        expect((await loadRegistry())).toBeNull(); // nothing was added
    });

    it('says when a backup was cut off', async () => {
        const tree = await render();
        await openSheet(tree);
        await press(tree, 'Restore progress');
        const text = owlBackup();
        await paste(tree, text.slice(0, text.length - 50));
        await press(tree, 'Restore');
        expect(textOf(tree)).toContain('damaged or was cut off');
    });

    it('shows the reason when the player cannot be added', async () => {
        let registry = defaultRegistry(1);
        for (let i = 1; i < MAX_PROFILES; i++) {
            registry = addProfile(registry, AVATARS[i % AVATARS.length].id, TITLES[i], 1 + i, `p${i}`);
        }
        await saveRegistry(registry);
        const tree = await render();
        await press(tree, `Playing as ${TITLES[MAX_PROFILES - 1]} ${AVATARS[(MAX_PROFILES - 1) % AVATARS.length].label}. Change player`);
        await press(tree, 'Restore progress');
        await paste(tree, owlBackup());
        await press(tree, 'Restore');
        expect(textOf(tree)).toContain(`already has ${MAX_PROFILES} players`);
        expect(sheetOpen(tree)).toBe(true);
    });

    it('goes back to the list from the restore form', async () => {
        const tree = await render();
        await openSheet(tree);
        await press(tree, 'Restore progress');
        await press(tree, 'Back');
        expect(has(tree, 'Back up progress')).toBe(true);
    });
});
