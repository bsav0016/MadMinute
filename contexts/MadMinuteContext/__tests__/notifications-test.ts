// The wrapper loads expo-notifications when first used, so each test gets a fresh copy of it with its own mock.
type Wrapper = typeof import('../notifications');

const fakeModule = () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
});

function load(module: ReturnType<typeof fakeModule> | 'missing'): Wrapper {
    // The wrapper requires expo-notifications later, when a function is called, so the mock has to stay in place after
    // this returns: reset the registry and register the mock for this test only.
    jest.resetModules();
    if (module === 'missing') {
        jest.doMock('expo-notifications', () => { throw new Error('Cannot find module'); });
    } else {
        jest.doMock('expo-notifications', () => module);
    }
    return require('../notifications');
}

afterEach(() => {
    jest.dontMock('expo-notifications');
});

// The wrapper and these tests share the react-native module of the registry made by load(), so the platform is set on that one.
function onPlatform(os: 'android' | 'ios') {
    require('react-native').Platform.OS = os;
}

describe('asking for permission', () => {
    it('is granted without asking when the phone already allows it', async () => {
        const mock = fakeModule();
        mock.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
        expect(await load(mock).reminderPermission(true)).toBe('granted');
        expect(mock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('shows the phone question when it is allowed to and the player turned the reminder on', async () => {
        const mock = fakeModule();
        mock.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
        mock.requestPermissionsAsync.mockResolvedValue({ granted: true });
        expect(await load(mock).reminderPermission(true)).toBe('granted');
        expect(mock.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('is denied when the player says no', async () => {
        const mock = fakeModule();
        mock.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
        mock.requestPermissionsAsync.mockResolvedValue({ granted: false });
        expect(await load(mock).reminderPermission(true)).toBe('denied');
    });

    it('does not ask again when the phone will not show the question any more', async () => {
        const mock = fakeModule();
        mock.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
        expect(await load(mock).reminderPermission(true)).toBe('denied');
        expect(mock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('never asks when it was told not to', async () => {
        const mock = fakeModule();
        mock.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
        expect(await load(mock).reminderPermission(false)).toBe('denied');
        expect(mock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('is unavailable when the module is missing or the phone call fails', async () => {
        expect(await load('missing').reminderPermission(true)).toBe('unavailable');
        const mock = fakeModule();
        mock.getPermissionsAsync.mockRejectedValue(new Error('boom'));
        expect(await load(mock).reminderPermission(true)).toBe('unavailable');
    });
});

describe('scheduling', () => {
    const times = [1_000_000, 2_000_000, 3_000_000];

    it('replaces every earlier reminder with one for each time', async () => {
        const mock = fakeModule();
        expect(await load(mock).setScheduledReminders(times)).toBe(true);
        expect(mock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
        expect(mock.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
        const calls = mock.scheduleNotificationAsync.mock.calls.map(([request]) => request);
        expect(calls.map(r => r.trigger.date)).toEqual(times);
        for (const request of calls) {
            expect(request.trigger.type).toBe('date');
            expect(request.content.title).toBe('Mad Minute');
            expect(request.content.body).toBe('Ready for a minute of math practice?');
        }
    });

    it('says nothing about the player in a notification', async () => {
        const mock = fakeModule();
        await load(mock).setScheduledReminders(times);
        for (const [request] of mock.scheduleNotificationAsync.mock.calls) {
            expect(Object.keys(request.content).sort()).toEqual(['body', 'title']);
            expect(request.content.body).not.toMatch(/streak|lose|lost|miss|don't|hurry|only/i);
        }
    });

    it('switches them all off with an empty list', async () => {
        const mock = fakeModule();
        expect(await load(mock).setScheduledReminders([])).toBe(true);
        expect(mock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
        expect(mock.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('uses the default channel of the library on every platform, and makes none of its own', async () => {
        for (const os of ['android', 'ios'] as const) {
            const mock = fakeModule();
            const wrapper = load(mock);
            onPlatform(os);
            await wrapper.setScheduledReminders([1_000_000]);
            expect(mock.setNotificationChannelAsync).not.toHaveBeenCalled();
            expect(mock.scheduleNotificationAsync.mock.calls[0][0].trigger).toEqual({ type: 'date', date: 1_000_000 });
        }
    });

    it('reports failure, quietly, when the module is missing or the phone call fails', async () => {
        expect(await load('missing').setScheduledReminders(times)).toBe(false);
        const mock = fakeModule();
        mock.scheduleNotificationAsync.mockRejectedValue(new Error('boom'));
        expect(await load(mock).setScheduledReminders(times)).toBe(false);
    });

    it('does not load the module until it is used', () => {
        const factory = jest.fn(() => fakeModule());
        jest.resetModules();
        jest.doMock('expo-notifications', factory);
        require('../notifications');
        expect(factory).not.toHaveBeenCalled();
    });
});
