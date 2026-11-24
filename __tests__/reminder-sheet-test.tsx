import React from 'react';
import { Linking, Modal, Switch } from 'react-native';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '@/app/(screens)/homescreen';
import { MadMinuteProvider, useMadMinute } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { savePractice } from '@/contexts/MadMinuteContext/practiceStorage';
import { emptyPractice, recordPracticeRound } from '@/contexts/MadMinuteContext/practice';
import { loadReminder } from '@/contexts/MadMinuteContext/reminderStorage';
import { reminderPermission, setScheduledReminders } from '@/contexts/MadMinuteContext/notifications';
import { expectControlsNamed } from '@/test-utils/a11y';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/contexts/MadMinuteContext/notifications', () => ({
    reminderPermission: jest.fn(),
    setScheduledReminders: jest.fn(),
}));
const mockRoute = { routeBack: jest.fn(), routeTo: jest.fn(), routeReplace: jest.fn() };
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => mockRoute }));

jest.setTimeout(30000);

const askPermission = reminderPermission as jest.Mock;
const schedule = setScheduledReminders as jest.Mock;
const NOW = new Date(2026, 10, 23, 9).getTime();

let api!: ReturnType<typeof useMadMinute>;
const Probe = () => {
    api = useMadMinute();
    return null;
};

async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

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
const sheetOpen = (tree: Tree) => tree.root.findAllByType(Modal).some(m => m.props.visible === true);
const buttons = (tree: Tree, label: string) =>
    tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
const press = async (tree: Tree, label: string) => {
    const matches = buttons(tree, label);
    expect(matches.length).toBeGreaterThan(0);
    await act(async () => { matches[0].props.onPress(); });
    await settle();
};
const toggle = async (tree: Tree, on: boolean) => {
    await act(async () => { tree.root.findByType(Switch).props.onValueChange(on); });
    await settle();
};

describe('the daily reminder on the home screen', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.restoreAllMocks();
        askPermission.mockReset().mockResolvedValue('granted');
        schedule.mockReset().mockResolvedValue(true);
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        await savePractice(recordPracticeRound(emptyPractice(), NOW));
    });

    it('is not offered to a player who has not finished a round', async () => {
        await AsyncStorage.clear();
        const tree = await render();
        expect(texts(tree)).not.toContain('Reminder:');
    });

    it('starts off, with the question closed and nothing asked of the phone', async () => {
        const tree = await render();
        expect(texts(tree)).toContain('Reminder: off (change)');
        expect(buttons(tree, 'Daily reminder: off. Change').length).toBeGreaterThan(0);
        expect(sheetOpen(tree)).toBe(false);
        await press(tree, 'Daily reminder: off. Change');
        expect(sheetOpen(tree)).toBe(true);
        expect(askPermission).not.toHaveBeenCalled();
        expect(tree.root.findByType(Switch).props.value).toBe(false);
    });

    it('turns on from the sheet: asks, shows the time and the card says when', async () => {
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await toggle(tree, true);
        expect(askPermission).toHaveBeenCalledTimes(1);
        expect(api.reminder).toEqual({ enabled: true, hour: 16, minute: 0 });
        expect(texts(tree)).toContain('4:00 pm');
        expect(texts(tree)).toContain('Reminder: 4:00 pm (change)');
        expect(buttons(tree, 'Daily reminder: on at 4:00 pm. Change').length).toBeGreaterThan(0);
        expect((await loadReminder())!.enabled).toBe(true);
        expect(schedule).toHaveBeenCalled();
    });

    it('moves the time with the four buttons', async () => {
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await toggle(tree, true);
        await press(tree, '1 hour later');
        expect(api.reminder).toMatchObject({ hour: 17, minute: 0 });
        await press(tree, '15 minutes earlier');
        expect(api.reminder).toMatchObject({ hour: 16, minute: 45 });
        await press(tree, '15 minutes later');
        await press(tree, '1 hour earlier');
        expect(api.reminder).toMatchObject({ hour: 16, minute: 0 });
        expect(texts(tree)).toContain('4:00 pm');
        expect(askPermission).toHaveBeenCalledTimes(1);
    });

    it('turns off again', async () => {
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await toggle(tree, true);
        await toggle(tree, false);
        expect(api.reminder.enabled).toBe(false);
        expect(texts(tree)).toContain('Reminder: off (change)');
        expect(schedule.mock.calls.at(-1)![0]).toEqual([]);
    });

    it('explains, and offers the phone settings, when the player said no', async () => {
        askPermission.mockResolvedValue('denied');
        const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await toggle(tree, true);
        expect(api.reminder.enabled).toBe(false);
        expect(texts(tree)).toContain('Notifications are turned off for Mad Minute on this phone');
        await press(tree, 'Open phone settings');
        expect(openSettings).toHaveBeenCalledTimes(1);
        expect(schedule).not.toHaveBeenCalled();
    });

    it('says so when the phone cannot do reminders', async () => {
        askPermission.mockResolvedValue('unavailable');
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await toggle(tree, true);
        expect(texts(tree)).toContain('Reminders are not available on this phone');
        expect(api.reminder.enabled).toBe(false);
    });

    it('says plainly what a reminder is, and that nothing is sent to anyone', async () => {
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        expect(texts(tree)).toContain('One notification a day at about this time, on this phone only');
        expect(texts(tree)).toContain('Nothing is sent to anyone');
    });

    it('closes with Done', async () => {
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await press(tree, 'Done');
        expect(sheetOpen(tree)).toBe(false);
    });

    it('has every control named and with a role, switch included', async () => {
        const tree = await render();
        await press(tree, 'Daily reminder: off. Change');
        await toggle(tree, true);
        expectControlsNamed(tree.root);
        expect(tree.root.findByType(Switch).props.accessibilityLabel).toBe('Daily reminder');
    });
});
