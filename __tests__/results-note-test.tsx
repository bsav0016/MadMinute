import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import Results from '@/app/(screens)/results';
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

// Loading the screen compiles a lot on a cold CI machine.
jest.setTimeout(30000);

const { Multiplication } = MadMinuteOperator;
const q = (id: number, a: number, b: number, response?: string) => new MadMinuteQuestion(id, a, b, Multiplication, a * b, response);

const textOf = (node: ReactTestInstance | string): string =>
    typeof node === 'string' ? node : node.children.map(textOf).join('');

async function texts(questions: MadMinuteQuestion[]) {
    mockGame = new MadMinuteClass(undefined, questions);
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<Results />); });
    return tree.root.findAllByType(Text).map(textOf);
}

describe('Results: worth another look', () => {
    it('names the facts missed in the round', async () => {
        const shown = await texts([q(0, 7, 8, '54'), q(1, 2, 3, '6'), q(2, 6, 9, '52'), q(3, 1, 1)]);
        expect(shown).toContain('Worth another look: 7 × 8, 6 × 9');
    });

    it('says nothing when nothing was missed', async () => {
        const shown = await texts([q(0, 2, 3, '6'), q(1, 4, 5, ''), q(2, 1, 1)]);
        expect(shown.some((t) => t.startsWith('Worth another look'))).toBe(false);
    });
});
