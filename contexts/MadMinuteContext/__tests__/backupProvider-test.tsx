import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { loadHistory } from '../historyStorage';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { Backup, readBackup } from '../backup';
import {
    addProfile, AVATARS, defaultRegistry, loadRegistry, MAX_PROFILES, profileKeys, profileLabel, saveRegistry, TITLES,
} from '@/storage/profiles';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

type Api = ReturnType<typeof useMadMinute>;
type Imported = Awaited<ReturnType<Api['importProgress']>>;

function mount() {
    let latest!: Api;
    const Probe = () => {
        latest = useMadMinute();
        return null;
    };
    act(() => { create(<MadMinuteProvider><Probe /></MadMinuteProvider>); });
    return () => latest;
}

// Storage reads and writes finish on later turns of the event loop, so give them a few.
async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

async function setup() {
    const api = mount();
    await settle();
    return api;
}

// Plays two questions that are not random (0 + 0, one right and one wrong) and saves the round.
async function playRound(api: () => Api) {
    await act(async () => { api().addQuestion(); });
    await act(async () => { api().submitResponse('0', 0); });
    await act(async () => { api().submitResponse('9', 1); });
    await act(async () => { api().recordRound(); });
}

const settingsOf = (max: number) => new MadMinuteSettings(0, max, [MadMinuteOperator.Addition], 60, false);

const exported = (api: () => Api): Backup => {
    const result = readBackup(api().exportProgress());
    if (!result.ok) throw new Error(result.reason);
    return result.backup;
};

async function restore(api: () => Api, backup: Backup): Promise<Imported> {
    let result!: Imported;
    await act(async () => { result = await api().importProgress(backup); });
    await settle();
    return result;
}

describe('backing up and restoring a player', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        let tick = 1_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => tick++);
    });
    afterEach(() => jest.restoreAllMocks());

    it("exports the active player's rounds, record of problems, settings and identity", async () => {
        const api = await setup();
        await act(async () => { api().updateSettings(settingsOf(9)); });
        await playRound(api);
        const backup = exported(api);
        expect(backup.profile).toEqual({ id: 'default', avatar: 'fox', title: 'Swift' });
        expect(backup.history).toHaveLength(1);
        expect(backup.facts['+:0:0'].attempts).toBe(2);
        expect(backup.settings?.maxValue).toBe(9);
    });

    it('exports only the player who is active', async () => {
        const api = await setup();
        await playRound(api);
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await settle();
        const backup = exported(api);
        expect(backup.profile.avatar).toBe('owl');
        expect(backup.history).toEqual([]);
        expect(backup.facts).toEqual({});
    });

    it('restores on a new phone as the same player, with everything back', async () => {
        const first = await setup();
        await act(async () => { first().addProfile('owl', 'Brave'); });
        await settle();
        const owlId = first().activeProfile.id;
        await act(async () => { first().updateSettings(settingsOf(7)); });
        await playRound(first);
        const text = first().exportProgress();

        await AsyncStorage.clear(); // a different phone, or a reinstall
        const second = await setup();
        const read = readBackup(text);
        if (!read.ok) throw new Error(read.reason);
        const result = await restore(second, read.backup);

        expect(result).toEqual({ ok: true, label: 'Brave Owl' });
        expect(second().activeProfile).toMatchObject({ id: owlId, avatar: 'owl', title: 'Brave' });
        expect(second().history).toHaveLength(1);
        expect(second().facts['+:0:0'].attempts).toBe(2);
        expect(second().madMinute.settings.maxValue).toBe(7);
        // it is what is saved, not just what is on screen
        expect(await loadHistory(owlId)).toHaveLength(1);
        expect((await loadRegistry())?.active).toBe(owlId);
    });

    it('adds a copy as a new player when this device already has that player, leaving the original alone', async () => {
        const api = await setup();
        await playRound(api);
        const result = await restore(api, exported(api));
        expect(result.ok).toBe(true);
        expect(api().profiles).toHaveLength(2);
        expect(api().activeProfile.id).not.toBe('default');
        expect(api().history).toHaveLength(1);
        await act(async () => { api().switchProfile('default'); });
        await settle();
        expect(api().history).toHaveLength(1);
        expect(await loadHistory('default')).toHaveLength(1);
    });

    it('gives the copy a different word when its name is taken', async () => {
        const api = await setup();
        const result = await restore(api, exported(api)); // Swift Fox, which this device has
        expect(result.ok && result.label).toBe('Brave Fox');
        const names = api().profiles.map(profileLabel);
        expect(new Set(names).size).toBe(names.length);
    });

    it('refuses when the device is full, and saves nothing', async () => {
        let registry = defaultRegistry(1);
        for (let i = 1; i < MAX_PROFILES; i++) {
            registry = addProfile(registry, AVATARS[i % AVATARS.length].id, TITLES[i], 1 + i, `p${i}`);
        }
        await saveRegistry(registry);
        const api = await setup();
        const backup: Backup = { ...exported(api), profile: { id: 'pnew', avatar: 'owl', title: 'Epic' } };
        const result = await restore(api, backup);
        expect(result).toEqual({ ok: false, reason: expect.stringContaining(`${MAX_PROFILES} players`) });
        expect(await AsyncStorage.getItem(profileKeys('pnew').history)).toBeNull();
        expect(api().profiles).toHaveLength(MAX_PROFILES);
    });

    it('leaves nothing behind if the data cannot be saved', async () => {
        const api = await setup();
        await playRound(api);
        const backup: Backup = { ...exported(api), profile: { id: 'pnew', avatar: 'owl', title: 'Epic' } };
        const setItem = AsyncStorage.setItem as jest.Mock;
        const original = setItem.getMockImplementation()!;
        setItem.mockImplementation(async (key: string, value: string) => {
            if (key === profileKeys('pnew').facts) throw new Error('disk full');
            return original(key, value);
        });
        try {
            const result = await restore(api, backup);
            expect(result.ok).toBe(false);
            expect(!result.ok && result.reason).toMatch(/Could not save/);
            expect(api().profiles.map(p => p.id)).toEqual(['default']);
            expect(await AsyncStorage.getItem(profileKeys('pnew').history)).toBeNull();
        } finally {
            setItem.mockImplementation(original);
        }
    });

    it('asks to try again if it is used before the saved players have loaded', async () => {
        const api = mount();
        const backup: Backup = { exportedAt: 1, profile: { id: 'pnew', avatar: 'owl', title: 'Epic' }, settings: null, history: [], facts: {}, practice: null };
        let result!: Imported;
        await act(async () => { result = await api().importProgress(backup); });
        expect(result.ok).toBe(false);
        await settle();
        expect(api().profiles).toHaveLength(1);
    });
});
