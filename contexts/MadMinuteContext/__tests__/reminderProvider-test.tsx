import React from 'react';
import { AppState } from 'react-native';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MadMinuteProvider, useMadMinute } from '../MadMinuteContext';
import { loadReminder, saveReminder } from '../reminderStorage';
import { DEFAULT_REMINDER, REMINDER_DAYS } from '../reminder';
import { reminderPermission, setScheduledReminders } from '../notifications';
import { STORAGE_KEYS } from '@/storage/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../notifications', () => ({
    reminderPermission: jest.fn(),
    setScheduledReminders: jest.fn(),
}));

const askPermission = reminderPermission as jest.Mock;
const schedule = setScheduledReminders as jest.Mock;

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

const at = (day: number, hour: number) => new Date(2026, 10, day, hour).getTime();
let now = at(23, 9);
let foreground: ((state: string) => void) | null = null;

const lastTimes = (): number[] => schedule.mock.calls.at(-1)![0];

async function playRound(api: () => Api) {
    await act(async () => { api().resetMadMinute(); });
    await act(async () => { api().addQuestion(); });
    await act(async () => { api().submitResponse('0', 0); });
    await act(async () => { api().recordRound(); });
}

describe('the daily reminder in the provider', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        askPermission.mockReset().mockResolvedValue('granted');
        schedule.mockReset().mockResolvedValue(true);
        jest.spyOn(Math, 'random').mockReturnValue(0);
        now = at(23, 9);
        jest.spyOn(Date, 'now').mockImplementation(() => (now += 1));
        foreground = null;
        jest.spyOn(AppState, 'addEventListener').mockImplementation(((type: string, listener: (state: string) => void) => {
            if (type === 'change') foreground = listener;
            return { remove: () => { foreground = null; } };
        }) as never);
    });
    afterEach(() => jest.restoreAllMocks());

    it('is off, and never touches the notifications module, for a player who does not use it', async () => {
        const api = await setup();
        expect(api().reminder).toEqual(DEFAULT_REMINDER);
        await playRound(api);
        expect(askPermission).not.toHaveBeenCalled();
        expect(schedule).not.toHaveBeenCalled();
        expect(await loadReminder()).toBeNull();
    });

    it('asks the phone for permission when it is turned on, then saves and schedules the next seven days', async () => {
        const api = await setup();
        let result!: Awaited<ReturnType<Api['setReminder']>>;
        await act(async () => { result = await api().setReminder({ ...DEFAULT_REMINDER, enabled: true }); });
        await settle();
        expect(result).toEqual({ ok: true });
        expect(askPermission).toHaveBeenCalledTimes(1);
        expect(askPermission).toHaveBeenCalledWith(true);
        expect(api().reminder).toEqual({ enabled: true, hour: 16, minute: 0 });
        expect(await loadReminder()).toEqual({ enabled: true, hour: 16, minute: 0 });
        expect(lastTimes()).toHaveLength(REMINDER_DAYS);
        expect(lastTimes()[0]).toBe(at(23, 16));
    });

    it('stays off, saves nothing and schedules nothing when the player says no', async () => {
        askPermission.mockResolvedValue('denied');
        const api = await setup();
        let result!: Awaited<ReturnType<Api['setReminder']>>;
        await act(async () => { result = await api().setReminder({ ...DEFAULT_REMINDER, enabled: true }); });
        await settle();
        expect(result).toEqual({ ok: false, reason: 'denied' });
        expect(api().reminder.enabled).toBe(false);
        expect(await loadReminder()).toBeNull();
        expect(schedule).not.toHaveBeenCalled();
    });

    it('says so when the phone cannot do reminders', async () => {
        askPermission.mockResolvedValue('unavailable');
        const api = await setup();
        let result!: Awaited<ReturnType<Api['setReminder']>>;
        await act(async () => { result = await api().setReminder({ ...DEFAULT_REMINDER, enabled: true }); });
        expect(result).toEqual({ ok: false, reason: 'unavailable' });
        expect(api().reminder.enabled).toBe(false);
    });

    it('cancels everything, once, when it is turned off', async () => {
        const api = await setup();
        await act(async () => { await api().setReminder({ ...DEFAULT_REMINDER, enabled: true }); });
        await settle();
        schedule.mockClear();
        await act(async () => { await api().setReminder({ ...DEFAULT_REMINDER, enabled: false }); });
        await settle();
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(lastTimes()).toEqual([]);
        expect((await loadReminder())!.enabled).toBe(false);
        await playRound(api);
        expect(schedule).toHaveBeenCalledTimes(1); // a round finishing later does not schedule anything
    });

    it('does not ask again to change the time, and schedules the new one', async () => {
        const api = await setup();
        await act(async () => { await api().setReminder({ ...DEFAULT_REMINDER, enabled: true }); });
        await act(async () => { await api().setReminder({ enabled: true, hour: 17, minute: 30 }); });
        await settle();
        expect(askPermission).toHaveBeenCalledTimes(1);
        expect(lastTimes()[0]).toBe(new Date(2026, 10, 23, 17, 30).getTime());
    });

    it('comes back on at launch, schedules without asking, and keeps the saved time', async () => {
        await saveReminder({ enabled: true, hour: 7, minute: 15 });
        const api = await setup();
        expect(api().reminder).toEqual({ enabled: true, hour: 7, minute: 15 });
        expect(askPermission).not.toHaveBeenCalled();
        expect(lastTimes()[0]).toBe(new Date(2026, 10, 24, 7, 15).getTime()); // 7:15 has passed today
    });

    it('ignores a saved reminder that is not valid', async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.reminder, '{"v":1,"data":{"enabled":true,"hour":99,"minute":0}}');
        const api = await setup();
        expect(api().reminder).toEqual(DEFAULT_REMINDER);
        expect(schedule).not.toHaveBeenCalled();
    });

    it('is skipped today once the goal is done, and comes back tomorrow', async () => {
        await saveReminder({ enabled: true, hour: 16, minute: 0 });
        const api = await setup();
        expect(lastTimes()[0]).toBe(at(23, 16));
        await playRound(api);
        await settle();
        expect(lastTimes()[0]).toBe(at(24, 16));
        expect(lastTimes()).toHaveLength(REMINDER_DAYS - 1);
    });

    it('is not skipped by a goal that has not been met', async () => {
        await saveReminder({ enabled: true, hour: 16, minute: 0 });
        const api = await setup();
        await act(async () => { api().setGoal(2); });
        await playRound(api);
        await settle();
        expect(lastTimes()[0]).toBe(at(23, 16));
    });

    it('is scheduled again when the app comes back to the front, so the week keeps rolling on', async () => {
        await saveReminder({ enabled: true, hour: 16, minute: 0 });
        await setup();
        schedule.mockClear();
        now = at(26, 9);
        await act(async () => { foreground!('active'); });
        await settle();
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(lastTimes()[0]).toBe(at(26, 16));
        schedule.mockClear();
        await act(async () => { foreground!('background'); });
        await settle();
        expect(schedule).not.toHaveBeenCalled();
    });

    it('belongs to the phone: another player sees the same reminder', async () => {
        await saveReminder({ enabled: true, hour: 16, minute: 0 });
        const api = await setup();
        await act(async () => { api().addProfile('owl', 'Brave'); });
        await settle();
        expect(api().reminder).toEqual({ enabled: true, hour: 16, minute: 0 });
    });

    it('a reminder chosen before the saved one has loaded is not overwritten by it', async () => {
        await saveReminder({ enabled: true, hour: 7, minute: 0 });
        const api = mount(); // still loading
        await act(async () => { await api().setReminder({ enabled: true, hour: 18, minute: 0 }); });
        await settle();
        expect(api().reminder.hour).toBe(18);
    });
});
