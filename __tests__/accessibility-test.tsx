import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { AccessibilityInfo, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PlayMadMinute from '@/app/(screens)/play-mad-minute';
import CreateMadMinute from '@/app/(screens)/create-mad-minute';
import HomeScreen from '@/app/(screens)/homescreen';
import History from '@/app/(screens)/history';
import Results from '@/app/(screens)/results';
import { MinMaxSlider } from '@/components/MinMaxSlider';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { MadMinuteProvider } from '@/contexts/MadMinuteContext/MadMinuteContext';
import { MadMinuteClass } from '@/contexts/MadMinuteContext/MadMinuteClass';
import { MadMinuteQuestion } from '@/contexts/MadMinuteContext/MadMinuteQuestion';
import { MadMinuteOperator, spokenOperator, spokenQuestion } from '@/contexts/MadMinuteContext/MadMinuteOperator';
import { saveHistory } from '@/contexts/MadMinuteContext/historyStorage';
import { controlProblems, expectControlsNamed } from '@/test-utils/a11y';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@ptomasroos/react-native-multi-slider', () => () => null);

// Only the results screen test sets this; every other screen uses the real provider.
let mockGame: MadMinuteClass | undefined;
jest.mock('@/contexts/MadMinuteContext/MadMinuteContext', () => {
    const actual = jest.requireActual('@/contexts/MadMinuteContext/MadMinuteContext');
    return {
        ...actual,
        useMadMinute: () => mockGame
            ? { madMinute: mockGame, resetMadMinute: jest.fn(), recordRound: () => null, history: [] }
            : actual.useMadMinute(),
    };
});
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
// Stable functions: the play screen restarts its clock when routeTo changes.
const mockRoute = { routeBack: jest.fn(), routeTo: jest.fn(), routeReplace: jest.fn() };
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => mockRoute }));

// Loading the screens compiles a lot on a cold CI machine.
jest.setTimeout(30000);

const textOf = (node: ReactTestInstance | string): string =>
    typeof node === 'string' ? node : node.children.map(textOf).join('');

async function render(element: React.ReactElement) {
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(element); });
    await act(async () => {}); // saved settings and history finish loading
    return tree;
}

const labelled = (tree: ReturnType<typeof create>, label: string) =>
    tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.type === 'string');

describe('the test guard itself', () => {
    it('reports a control with no name and one with no role', async () => {
        const tree = await render(
            <>
                <TouchableOpacity onPress={() => {}} accessibilityRole="button"><Text> </Text></TouchableOpacity>
                <TouchableOpacity onPress={() => {}}><Text>Go</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => {}} accessibilityRole="button"><Text>Fine</Text></TouchableOpacity>
            </>,
        );
        expect(controlProblems(tree.root)).toEqual([
            'TouchableOpacity has no accessible name',
            'TouchableOpacity "Go" has no accessibilityRole',
        ]);
    });
});

describe('every control has a name and a role', () => {
    beforeEach(async () => { await AsyncStorage.clear(); });

    it('home', async () => {
        const tree = await render(<HomeScreen />);
        expect(tree.root.findAllByType(TouchableOpacity).length).toBeGreaterThan(0);
        expectControlsNamed(tree.root);
    });

    it('settings', async () => {
        const tree = await render(<MadMinuteProvider><ToastProvider><CreateMadMinute /></ToastProvider></MadMinuteProvider>);
        expect(tree.root.findAllByType(TouchableOpacity).length).toBeGreaterThan(5);
        expectControlsNamed(tree.root);
    });

    it('play, including the number pad', async () => {
        jest.useFakeTimers();
        const tree = await render(<MadMinuteProvider><PlayMadMinute /></MadMinuteProvider>);
        await act(async () => { jest.advanceTimersByTime(3500); }); // past the countdown, so the keys exist
        expect(tree.root.findAllByType(TouchableOpacity).length).toBeGreaterThanOrEqual(14);
        expectControlsNamed(tree.root);
        jest.useRealTimers();
    });

    it('history', async () => {
        await saveHistory([]);
        const tree = await render(<MadMinuteProvider><History /></MadMinuteProvider>);
        expectControlsNamed(tree.root);
    });

    it('results', async () => {
        mockGame = new MadMinuteClass(undefined, [
            new MadMinuteQuestion(0, 7, 8, MadMinuteOperator.Multiplication, 56, '54'),
        ]);
        const tree = await render(<MadMinuteProvider><Results /></MadMinuteProvider>);
        mockGame = undefined;
        expectControlsNamed(tree.root);
    });

    it('toasts', async () => {
        const Trigger = () => {
            const { addToast } = useToast();
            React.useEffect(() => { addToast('Pick one', [{ label: 'Do it', callback: () => {} }]); }, [addToast]);
            return null;
        };
        const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
        const tree = await render(<ToastProvider><Trigger /></ToastProvider>);
        expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(2);
        expectControlsNamed(tree.root);
        expect(announce).toHaveBeenCalledWith('Pick one');
        announce.mockRestore();
    });
});

describe('spoken text', () => {
    it('spells operators out', () => {
        expect(spokenOperator(MadMinuteOperator.Addition)).toBe('plus');
        expect(spokenOperator(MadMinuteOperator.Subtraction)).toBe('minus');
        expect(spokenOperator(MadMinuteOperator.Multiplication)).toBe('times');
        expect(spokenOperator(MadMinuteOperator.Division)).toBe('divided by');
        expect(spokenQuestion(12, MadMinuteOperator.Division, 4)).toBe('12 divided by 4');
    });
});

describe('the number range slider', () => {
    function setup(min: number, max: number) {
        const setMinMax = jest.fn();
        let tree!: ReturnType<typeof create>;
        act(() => { tree = create(<MinMaxSlider min={min} max={max} setMinMax={setMinMax} />); });
        const node = tree.root.findAll((n) => n.props.accessibilityLabel === 'Number range' && n.props.onAccessibilityAction)[0];
        const run = (actionName: string) => act(() => { node.props.onAccessibilityAction({ nativeEvent: { actionName } }); });
        return { node, setMinMax, run };
    }

    it('says its value and offers an action for each end', () => {
        const { node } = setup(2, 12);
        expect(node.props.accessibilityValue).toEqual({ text: 'from 2 to 12' });
        expect(node.props.accessibilityRole).toBe('adjustable');
        expect(node.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(['minUp', 'minDown', 'maxUp', 'maxDown']);
    });

    it('moves each end by one and keeps them in range and apart', () => {
        const a = setup(2, 12);
        a.run('minUp'); a.run('minDown'); a.run('maxUp'); a.run('maxDown');
        expect(a.setMinMax.mock.calls).toEqual([[3, true], [1, true], [13, false], [11, false]]);

        const edges = setup(0, 20);
        edges.run('minDown'); edges.run('maxUp');
        expect(edges.setMinMax).not.toHaveBeenCalled();

        const touching = setup(5, 6);
        touching.run('minUp'); touching.run('maxDown');
        expect(touching.setMinMax).not.toHaveBeenCalled();
    });
});

describe('the play screen', () => {
    beforeEach(async () => { await AsyncStorage.clear(); });

    it('reads the question, the answer and the time as sentences', async () => {
        jest.useFakeTimers();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const tree = await render(<MadMinuteProvider><PlayMadMinute /></MadMinuteProvider>);
        await act(async () => { jest.advanceTimersByTime(4500); });
        expect(labelled(tree, 'Your answer')[0].props.accessibilityValue).toEqual({ text: 'empty' });
        expect(labelled(tree, 'Time remaining, 59 seconds')).toHaveLength(1);
        const question = tree.root.findAll((n) => typeof n.type === 'string' && /^\d+ (plus|minus|times|divided by) \d+$/.test(n.props.accessibilityLabel ?? ''));
        expect(question).toHaveLength(1);
        const keys = tree.root.findAllByType(TouchableOpacity).map((k) => k.props.accessibilityLabel);
        expect(keys).toEqual(expect.arrayContaining(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear answer', 'Delete last digit', 'Skip', 'Next']));
        jest.useRealTimers();
        jest.restoreAllMocks();
    });
});
