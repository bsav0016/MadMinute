import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings, parseSettings, saveSettings } from '../settingsStorage';
import { MadMinuteSettings } from '../MadMinuteSettings';
import { MadMinuteOperator } from '../MadMinuteOperator';
import { STORAGE_KEYS } from '@/storage/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const valid = () => ({ minValue: 1, maxValue: 12, availableOperators: ['x', '÷'], durationSeconds: 120 });

describe('parseSettings', () => {
    it('accepts what the settings screen can produce', () => {
        const settings = parseSettings(valid());
        expect(settings).toEqual(new MadMinuteSettings(1, 12, [MadMinuteOperator.Multiplication, MadMinuteOperator.Division], 120));
    });

    it('drops duplicate operators', () => {
        expect(parseSettings({ ...valid(), availableOperators: ['+', '+'] })?.availableOperators).toEqual(['+']);
    });

    it.each([
        ['null', null],
        ['a string', 'x'],
        ['min not a number', { ...valid(), minValue: '1' }],
        ['min fractional', { ...valid(), minValue: 1.5 }],
        ['min below the slider', { ...valid(), minValue: -1 }],
        ['max above the slider', { ...valid(), maxValue: 21 }],
        ['min equal to max', { ...valid(), minValue: 5, maxValue: 5 }],
        ['min above max', { ...valid(), minValue: 9, maxValue: 3 }],
        ['no operators', { ...valid(), availableOperators: [] }],
        ['operators not an array', { ...valid(), availableOperators: '+' }],
        ['unknown operator', { ...valid(), availableOperators: ['+', '%'] }],
        ['duration not offered', { ...valid(), durationSeconds: 45 }],
        ['duration missing', { ...valid(), durationSeconds: undefined }],
    ])('rejects %s', (_name, data) => {
        expect(parseSettings(data)).toBeNull();
    });
});

describe('loadSettings / saveSettings', () => {
    beforeEach(() => AsyncStorage.clear());

    it('round-trips settings', async () => {
        const settings = new MadMinuteSettings(2, 15, [MadMinuteOperator.Addition, MadMinuteOperator.Subtraction], 30);
        await saveSettings(settings);
        expect(await loadSettings()).toEqual(settings);
    });

    it('returns null when nothing is saved or the saved value is corrupt', async () => {
        expect(await loadSettings()).toBeNull();
        await AsyncStorage.setItem(STORAGE_KEYS.settings, '{broken');
        expect(await loadSettings()).toBeNull();
    });
});
