import { MadMinuteOperator } from '../MadMinuteOperator';
import { FactStat, FactStats, TroubleSpot } from '../factStats';
import { MadMinuteQuestion } from '../MadMinuteQuestion';
import {
    GRID_SIZE, cellLevel, factLabel, formatSeconds, gridFactsNeedingWork, spotDetail, timesTableGrid, worthAnotherLook,
} from '../troubleSpots';

const stat = (attempts: number, correct: number, timedCorrect = 0, correctMs = 0): FactStat =>
    ({ attempts, correct, timedCorrect, correctMs, lastSeen: 1 });

const at = (grid: ReturnType<typeof timesTableGrid>, row: number, col: number) => grid[row - 1][col - 1];

describe('cellLevel', () => {
    it('steps from solid to bad as weakness rises', () => {
        expect(cellLevel(0)).toBe('solid');
        expect(cellLevel(0.079)).toBe('solid');
        expect(cellLevel(0.08)).toBe('ok');
        expect(cellLevel(0.149)).toBe('ok');
        expect(cellLevel(0.15)).toBe('trouble');
        expect(cellLevel(0.349)).toBe('trouble');
        expect(cellLevel(0.35)).toBe('bad');
        expect(cellLevel(1)).toBe('bad');
    });
});

describe('timesTableGrid', () => {
    it('is 12 by 12 with every cell unseen when nothing is recorded', () => {
        const grid = timesTableGrid({});
        expect(grid).toHaveLength(GRID_SIZE);
        for (const cells of grid) {
            expect(cells).toHaveLength(GRID_SIZE);
            for (const cell of cells) expect(cell.level).toBe('unseen');
        }
        expect(at(grid, 1, 1)).toEqual({ row: 1, col: 1, level: 'unseen' });
        expect(at(grid, 12, 12)).toEqual({ row: 12, col: 12, level: 'unseen' });
    });

    it('can be a different size', () => {
        expect(timesTableGrid({}, 3)).toHaveLength(3);
        expect(timesTableGrid({}, 3)[0]).toHaveLength(3);
    });

    it('colours a fact in both places it appears, since 7 x 8 and 8 x 7 are one fact', () => {
        const grid = timesTableGrid({ 'x:7:8': stat(6, 2, 2, 12000) });
        expect(at(grid, 7, 8).level).toBe(at(grid, 8, 7).level);
        expect(at(grid, 7, 8).level).not.toBe('unseen');
    });

    it('shows a well-known quick fact as solid and a often-missed one as bad', () => {
        const grid = timesTableGrid({
            'x:2:3': stat(10, 10, 10, 10 * 1500),
            'x:7:8': stat(6, 1, 1, 3000),
        });
        expect(at(grid, 2, 3).level).toBe('solid');
        expect(at(grid, 7, 8).level).toBe('bad');
    });

    it('leaves a fact asked only once unseen, because one answer says too little', () => {
        const grid = timesTableGrid({ 'x:4:5': stat(1, 0) });
        expect(at(grid, 4, 5).level).toBe('unseen');
    });

    it('colours a slow but correct fact', () => {
        const grid = timesTableGrid({
            'x:2:3': stat(10, 10, 10, 10 * 1500),
            'x:9:9': stat(5, 5, 5, 5 * 6000),
        });
        expect(['trouble', 'bad']).toContain(at(grid, 9, 9).level);
    });

    it('ignores other operations and anything outside the grid', () => {
        const stats: FactStats = {
            '+:3:4': stat(10, 0),
            '-:9:4': stat(10, 0),
            '÷:56:7': stat(10, 0),
            'x:13:14': stat(10, 0),
        };
        for (const cells of timesTableGrid(stats)) {
            for (const cell of cells) expect(cell.level).toBe('unseen');
        }
    });
});

describe('gridFactsNeedingWork', () => {
    it('counts each fact once, not once for each side of the diagonal', () => {
        const grid = timesTableGrid({
            'x:7:8': stat(6, 1, 1, 3000), // off the diagonal: two cells
            'x:9:9': stat(6, 1, 1, 3000), // on the diagonal: one cell
        });
        expect(gridFactsNeedingWork(grid)).toBe(2);
    });

    it('is zero when nothing needs work', () => {
        expect(gridFactsNeedingWork(timesTableGrid({}))).toBe(0);
        expect(gridFactsNeedingWork(timesTableGrid({ 'x:2:3': stat(10, 10, 10, 15000) }))).toBe(0);
    });
});

describe('labels', () => {
    it('writes a fact with the symbols the app shows elsewhere', () => {
        expect(factLabel({ operator: MadMinuteOperator.Multiplication, value1: 7, value2: 8 })).toBe('7 × 8');
        expect(factLabel({ operator: MadMinuteOperator.Subtraction, value1: 15, value2: 8 })).toBe('15 − 8');
        expect(factLabel({ operator: MadMinuteOperator.Division, value1: 56, value2: 7 })).toBe('56 ÷ 7');
        expect(factLabel({ operator: MadMinuteOperator.Addition, value1: 3, value2: 4 })).toBe('3 + 4');
    });

    it('writes a time in seconds to one decimal, or nothing', () => {
        expect(formatSeconds(4250)).toBe('4.3 s');
        expect(formatSeconds(900)).toBe('0.9 s');
        expect(formatSeconds(null)).toBeNull();
    });

    it('describes a trouble spot with its accuracy and time', () => {
        const spot: TroubleSpot = {
            key: 'x:7:8', fact: { operator: MadMinuteOperator.Multiplication, value1: 7, value2: 8 },
            attempts: 6, accuracy: 2 / 6, averageMs: 5200, weakness: 0.4,
        };
        expect(spotDetail(spot)).toBe('33% right · 5.2 s');
        expect(spotDetail({ ...spot, averageMs: null, accuracy: 0 })).toBe('0% right');
    });
});

describe('worthAnotherLook', () => {
    const q = (id: number, a: number, b: number, response?: string, operator = MadMinuteOperator.Multiplication) =>
        new MadMinuteQuestion(id, a, b, operator, operator === MadMinuteOperator.Multiplication ? a * b : a + b, response);

    it('lists wrong answers in the order they were missed, ignoring right ones and skips', () => {
        const questions = [q(0, 7, 8, '54'), q(1, 2, 3, '6'), q(2, 6, 9, ''), q(3, 4, 4, '15'), q(4, 5, 5)];
        expect(worthAnotherLook(questions).map(factLabel)).toEqual(['7 × 8', '4 × 4']);
    });

    it('names a fact once, even when 7 x 8 and 8 x 7 were both missed', () => {
        const questions = [q(0, 7, 8, '54'), q(1, 8, 7, '48'), q(2, 7, 8, '1'), q(3, 1, 1)];
        expect(worthAnotherLook(questions)).toHaveLength(1);
    });

    it('stops at the limit', () => {
        const questions = [2, 3, 4, 5, 6].map((n, i) => q(i, n, 7, '0')).concat(q(9, 1, 1));
        expect(worthAnotherLook(questions)).toHaveLength(3);
        expect(worthAnotherLook(questions, 5)).toHaveLength(5);
    });

    it('leaves out the last question, which was never attempted', () => {
        expect(worthAnotherLook([q(0, 7, 8, '54')])).toEqual([]);
        expect(worthAnotherLook([])).toEqual([]);
    });

    it('is empty when nothing was missed', () => {
        expect(worthAnotherLook([q(0, 2, 3, '6'), q(1, 4, 5, ''), q(2, 1, 1)])).toEqual([]);
    });
});
