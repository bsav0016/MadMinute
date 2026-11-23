import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { Backup, BACKUP_PREFIX, BACKUP_VERSION, buildBackupText, checksum, readBackup } from '../backup';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { emptyPractice, PracticeRecord, recordPracticeRound, withGoal } from '../practice';
import { loadPractice } from '../practiceStorage';
import { buildRoundRecord, RoundRecord } from '../roundRecord';
import { MadMinuteQuestion } from '../MadMinuteQuestion';
import { profileKeys } from '@/storage/profiles';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const day = (d: number) => new Date(2026, 10, d, 12).getTime();
const streak = (): PracticeRecord => recordPracticeRound(withGoal(recordPracticeRound(emptyPractice(), day(22)), 3), day(23));

const tableRound = (): RoundRecord => buildRoundRecord(
    new MadMinuteSettings(1, 12, [MadMinuteOperator.Multiplication], 60, false),
    [new MadMinuteQuestion(0, 7, 3, MadMinuteOperator.Multiplication, 21, '21'), new MadMinuteQuestion(1, 7, 2, MadMinuteOperator.Multiplication, 14)],
    'tr1', 5, 7)!;

const base = (): Backup => ({
    exportedAt: 5000,
    profile: { id: 'pabc', avatar: 'owl', title: 'Brave' },
    settings: null,
    history: [tableRound()],
    facts: {},
    practice: streak(),
});

// Re-encodes edited data with a matching checksum, to test what is inside rather than the wrapper.
function wrap(data: unknown): string {
    const json = JSON.stringify(data);
    const encoded = btoa(json);
    return `${BACKUP_PREFIX}.${checksum(json)}.${encoded.length}.${encoded}`;
}
const inner = (over: Record<string, unknown> = {}) => ({
    v: BACKUP_VERSION, exportedAt: 5000, profile: { id: 'pabc', avatar: 'owl', title: 'Brave' },
    settings: null, history: [], facts: {}, ...over,
});

describe('the practice record in a backup', () => {
    it('is on version 2', () => {
        expect(BACKUP_VERSION).toBe(2);
    });

    it('goes into the text and comes back, with the goal, the streak and a round of one table', () => {
        const result = readBackup(buildBackupText(base()));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.backup.practice).toEqual(streak());
        expect(result.backup.practice?.goal).toBe(3);
        expect(result.backup.practice?.streak.current).toBe(2);
        expect(result.backup.history[0].table).toBe(7);
    });

    it('is kept as nothing for a player who has not played', () => {
        const result = readBackup(buildBackupText({ ...base(), practice: null }));
        expect(result.ok && result.backup.practice).toBeNull();
    });

    it('still restores a backup made before it existed (version 1)', () => {
        const result = readBackup(wrap(inner({ v: 1 })));
        expect(result.ok).toBe(true);
        expect(result.ok && result.backup.practice).toBeNull();
    });

    it('still refuses a backup from a newer version', () => {
        const result = readBackup(wrap(inner({ v: BACKUP_VERSION + 1 })));
        expect(result.ok).toBe(false);
        expect(!result.ok && result.reason).toMatch(/newer version/);
    });

    it('leaves out a streak that cannot be read and restores the rest', () => {
        for (const practice of ['nonsense', 5, [], { goal: 'x', streak: 'y' }]) {
            const result = readBackup(wrap(inner({ practice, history: [tableRound()] })));
            expect(result.ok).toBe(true);
            if (!result.ok) continue;
            expect(result.backup.history).toHaveLength(1);
            // A value that is not an object is left out; an object with bad parts is reset to its defaults.
            expect(result.backup.practice === null || result.backup.practice.streak.current === 0).toBe(true);
        }
    });

    it('does not trust a streak that is too long or in the wrong shape', () => {
        const bad = { goal: 2, streak: { current: 5, longest: 1, lastDay: '2026-11-23' }, today: { day: 'x', rounds: -1 }, restWeek: 'y' };
        const result = readBackup(wrap(inner({ practice: bad })));
        expect(result.ok && result.backup.practice).toEqual({ ...emptyPractice(), goal: 2, streak: { current: 0, longest: 1, lastDay: null } });
    });
});

type Api = ReturnType<typeof useMadMinute>;

function mount() {
    let latest!: Api;
    const Probe = () => {
        latest = useMadMinute();
        return null;
    };
    act(() => { create(<MadMinuteProvider><Probe /></MadMinuteProvider>); });
    return () => latest;
}

async function settle() {
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

async function setup() {
    const api = mount();
    await settle();
    return api;
}

describe('backing up and restoring the practice record of a player', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        let tick = day(23);
        jest.spyOn(Date, 'now').mockImplementation(() => (tick += 1));
    });
    afterEach(() => jest.restoreAllMocks());

    async function playRound(api: () => Api) {
        await act(async () => { api().resetMadMinute(); });
        await act(async () => { api().addQuestion(); });
        await act(async () => { api().submitResponse('0', 0); });
        await act(async () => { api().recordRound(); });
    }

    it('exports the goal and the streak', async () => {
        const api = await setup();
        await act(async () => { api().setGoal(2); });
        await playRound(api);
        const result = readBackup(api().exportProgress());
        if (!result.ok) throw new Error(result.reason);
        expect(result.backup.practice?.goal).toBe(2);
        expect(result.backup.practice?.streak.current).toBe(1);
    });

    it('brings the goal and the streak back on a new phone, saved as well as shown', async () => {
        const first = await setup();
        await act(async () => { first().addProfile('owl', 'Brave'); });
        await settle();
        const owlId = first().activeProfile.id;
        await act(async () => { first().setGoal(3); });
        await playRound(first);
        const text = first().exportProgress();

        await AsyncStorage.clear(); // a different phone, or a reinstall
        const second = await setup();
        const read = readBackup(text);
        if (!read.ok) throw new Error(read.reason);
        let result!: Awaited<ReturnType<Api['importProgress']>>;
        await act(async () => { result = await second().importProgress(read.backup); });
        await settle();

        expect(result.ok).toBe(true);
        expect(second().activeProfile.id).toBe(owlId);
        expect(second().practice.goal).toBe(3);
        expect(second().practice.streak.current).toBe(1);
        expect((await loadPractice(owlId))?.goal).toBe(3);
    });

    it('restoring an old backup writes no practice record', async () => {
        const api = await setup();
        const old = readBackup(wrap(inner({ v: 1, profile: { id: 'pold', avatar: 'owl', title: 'Epic' } })));
        if (!old.ok) throw new Error(old.reason);
        await act(async () => { await api().importProgress(old.backup); });
        await settle();
        expect(api().activeProfile.id).toBe('pold');
        expect(api().practice).toEqual(emptyPractice());
        expect(await AsyncStorage.getItem(profileKeys('pold').practice)).toBeNull();
    });

    it('leaves nothing behind if the practice record cannot be saved', async () => {
        const api = await setup();
        const backup: Backup = { ...base(), profile: { id: 'pnew', avatar: 'owl', title: 'Epic' } };
        const setItem = AsyncStorage.setItem as jest.Mock;
        const original = setItem.getMockImplementation()!;
        setItem.mockImplementation(async (key: string, value: string) => {
            if (key === profileKeys('pnew').practice) throw new Error('disk full');
            return original(key, value);
        });
        try {
            let result!: Awaited<ReturnType<Api['importProgress']>>;
            await act(async () => { result = await api().importProgress(backup); });
            expect(result.ok).toBe(false);
            expect(api().profiles.map(p => p.id)).toEqual(['default']);
            expect(await AsyncStorage.getItem(profileKeys('pnew').history)).toBeNull();
            expect(await AsyncStorage.getItem(profileKeys('pnew').practice)).toBeNull();
        } finally {
            setItem.mockImplementation(original);
        }
    });

    it('keeps the copy of a player apart from the original when it is restored on the same phone', async () => {
        const api = await setup();
        await act(async () => { api().setGoal(2); });
        await playRound(api);
        const read = readBackup(api().exportProgress());
        if (!read.ok) throw new Error(read.reason);
        await act(async () => { await api().importProgress(read.backup); });
        await settle();
        expect(api().activeProfile.id).not.toBe('default');
        expect(api().practice.goal).toBe(2);
        await act(async () => { api().setGoal(1); });
        await act(async () => { api().switchProfile('default'); });
        await settle();
        expect(api().practice.goal).toBe(2);
    });
});
