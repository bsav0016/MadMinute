import { DURATION_OPTIONS_SECONDS, matchesPreset, PRESETS } from '../presets';
import { MadMinuteClass } from '../MadMinuteClass';
import { MadMinuteSettings } from '../MadMinuteSettings';

describe('presets', () => {
    it('fit the 0 to 20 range of the number slider', () => {
        for (const preset of PRESETS) {
            expect(preset.minValue).toBeGreaterThanOrEqual(0);
            expect(preset.maxValue).toBeLessThanOrEqual(20);
            expect(preset.minValue).toBeLessThan(preset.maxValue);
            expect(preset.availableOperators.length).toBeGreaterThan(0);
        }
    });

    it('generate questions without errors', () => {
        for (const preset of PRESETS) {
            const game = new MadMinuteClass(new MadMinuteSettings(preset.minValue, preset.maxValue, preset.availableOperators));
            for (let i = 0; i < 200; i++) {
                const q = game.generateNewQuestion();
                expect(Number.isFinite(q.answer)).toBe(true);
                expect(Number.isInteger(q.answer)).toBe(true);
            }
        }
    });

    it('matches a preset regardless of operator order and detects changes', () => {
        const preset = PRESETS[0];
        expect(matchesPreset(preset, { ...preset, availableOperators: [...preset.availableOperators].reverse() })).toBe(true);
        expect(matchesPreset(preset, { ...preset, maxValue: preset.maxValue + 1 })).toBe(false);
    });

    it('offers a default-length round', () => {
        expect(DURATION_OPTIONS_SECONDS).toContain(60);
    });
});
