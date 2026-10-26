import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NumberPad } from '../NumberPad';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 'light' },
}));

function setup() {
    const onDigit = jest.fn();
    const onBackspace = jest.fn();
    const onClear = jest.fn();
    let tree!: ReturnType<typeof create>;
    act(() => {
        tree = create(<NumberPad onDigit={onDigit} onBackspace={onBackspace} onClear={onClear} />);
    });
    const keys = tree.root.findAllByType(TouchableOpacity);
    const byDigit = (digit: string) =>
        keys.find((key) => key.findAll((n: ReactTestInstance) => n.children.length === 1 && n.children[0] === digit).length > 0)!;
    const byLabel = (label: string) => keys.find((key) => key.props.accessibilityLabel === label)!;
    const press = (key: ReactTestInstance) => act(() => { key.props.onPress(); });
    return { onDigit, onBackspace, onClear, keys, byDigit, byLabel, press };
}

describe('NumberPad', () => {
    beforeEach(() => jest.clearAllMocks());

    it('has the ten digits plus clear and delete, and nothing else', () => {
        const { keys, byDigit, byLabel } = setup();
        expect(keys).toHaveLength(12);
        for (const digit of '0123456789') expect(byDigit(digit)).toBeDefined();
        expect(byLabel('Clear answer')).toBeDefined();
        expect(byLabel('Delete last digit')).toBeDefined();
    });

    it('reports the digit that was pressed', () => {
        const { byDigit, press, onDigit } = setup();
        for (const digit of '0123456789') press(byDigit(digit));
        expect(onDigit.mock.calls.map(([d]) => d)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });

    it('sends backspace and clear to their own handlers, not as digits', () => {
        const { byLabel, press, onDigit, onBackspace, onClear } = setup();
        press(byLabel('Delete last digit'));
        expect(onBackspace).toHaveBeenCalledTimes(1);
        expect(onClear).not.toHaveBeenCalled();
        press(byLabel('Clear answer'));
        expect(onClear).toHaveBeenCalledTimes(1);
        expect(onBackspace).toHaveBeenCalledTimes(1);
        expect(onDigit).not.toHaveBeenCalled();
    });

    it('gives haptic feedback on every key', () => {
        const { keys, press } = setup();
        keys.forEach(press);
        expect(Haptics.impactAsync).toHaveBeenCalledTimes(12);
    });

    it('still reports the press when the haptics call fails', async () => {
        (Haptics.impactAsync as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('no motor')));
        const { byDigit, press, onDigit } = setup();
        press(byDigit('5'));
        await act(async () => {});
        expect(onDigit).toHaveBeenCalledWith('5');
    });
});
