import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import Results from '@/app/(screens)/results';
import { CELL_MARKS } from '@/components/TimesTableGrid';
import { Colors } from '@/constants/Colors';
import { MadMinuteClass } from '@/contexts/MadMinuteContext/MadMinuteClass';
import { MadMinuteQuestion } from '@/contexts/MadMinuteContext/MadMinuteQuestion';
import { MadMinuteOperator } from '@/contexts/MadMinuteContext/MadMinuteOperator';

let mockGame: MadMinuteClass;
jest.mock('@/contexts/MadMinuteContext/MadMinuteContext', () => ({
    useMadMinute: () => ({ madMinute: mockGame, resetMadMinute: jest.fn(), recordRound: () => null, history: [] }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/contexts/RouteContext', () => ({ useRouteTo: () => ({ routeBack: jest.fn(), routeReplace: jest.fn() }) }));

jest.setTimeout(30000);

const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

const q = (id: number, a: number, b: number, response?: string) =>
    new MadMinuteQuestion(id, a, b, MadMinuteOperator.Multiplication, a * b, response);

const textOf = (node: ReactTestInstance | string): string =>
    typeof node === 'string' ? node : node.children.map(textOf).join('');

describe('Results rows do not rely on colour', () => {
    it('gives each row a mark and one spoken sentence', async () => {
        mockGame = new MadMinuteClass(undefined, [q(0, 7, 8, '56'), q(1, 6, 9, '52'), q(2, 2, 3, ''), q(3, 1, 1)]);
        let tree!: ReturnType<typeof create>;
        await act(async () => { tree = create(<Results />); });
        const rows = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string'
            && n.props.accessibilityLabel.includes('Correct answer'));
        expect(rows.map((r) => r.props.accessibilityLabel)).toEqual([
            '7 × 8. Correct answer 56. Your response 56. Correct.',
            '6 × 9. Correct answer 54. Your response 52. Incorrect.',
            '2 × 3. Correct answer 6. No response. Skipped.',
        ]);
        const shown = tree.root.findAllByType(Text).map(textOf);
        expect(shown).toEqual(expect.arrayContaining(['✓', '✗', '–']));
    });
});

describe('Times table marks', () => {
    const fills: Record<string, string> = {
        solid: Colors.results.correct, ok: Colors.results.skipped,
        trouble: Colors.results.incorrect, bad: Colors.results.incorrectStrong,
    };

    it.each(Object.keys(fills))('the %s mark reads on its fill', (level) => {
        const { markColor } = CELL_MARKS[level as keyof typeof CELL_MARKS];
        expect(contrast(markColor, fills[level])).toBeGreaterThanOrEqual(4.5);
    });

    it('every level has its own mark', () => {
        const marks = Object.values(CELL_MARKS).map((m) => m.mark);
        expect(new Set(marks).size).toBe(marks.length);
    });
});
