import { MadMinuteOperator } from "./MadMinuteOperator";

export interface Preset {
    label: string;
    minValue: number;
    maxValue: number;
    availableOperators: MadMinuteOperator[];
}

// The number range slider tops out at 20, so every preset has to fit inside 0 to 20.
export const PRESETS: Preset[] = [
    { label: "Easy +/−", minValue: 0, maxValue: 10, availableOperators: [MadMinuteOperator.Addition, MadMinuteOperator.Subtraction] },
    { label: "Times tables", minValue: 1, maxValue: 12, availableOperators: [MadMinuteOperator.Multiplication, MadMinuteOperator.Division] },
    { label: "Mixed", minValue: 0, maxValue: 20, availableOperators: [MadMinuteOperator.Addition, MadMinuteOperator.Subtraction, MadMinuteOperator.Multiplication, MadMinuteOperator.Division] },
];

export const DURATION_OPTIONS_SECONDS = [30, 60, 120];

export function matchesPreset(
    preset: Preset,
    settings: { minValue: number; maxValue: number; availableOperators: MadMinuteOperator[] }
): boolean {
    return preset.minValue === settings.minValue
        && preset.maxValue === settings.maxValue
        && preset.availableOperators.length === settings.availableOperators.length
        && preset.availableOperators.every(op => settings.availableOperators.includes(op));
}
