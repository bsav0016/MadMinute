import { loadStored, saveStored, STORAGE_KEYS } from "@/storage/storage";
import { MadMinuteOperator } from "./MadMinuteOperator";
import { MadMinuteSettings } from "./MadMinuteSettings";
import { DURATION_OPTIONS_SECONDS } from "./presets";

// The number range slider runs from 0 to 20 and keeps min below max.
const SLIDER_MIN = 0;
const SLIDER_MAX = 20;

// Turns saved data back into settings, or null if any part of it is not something the settings screen could produce.
export function parseSettings(data: unknown): MadMinuteSettings | null {
    if (data === null || typeof data !== "object") return null;
    const { minValue, maxValue, availableOperators, durationSeconds } = data as Record<string, unknown>;

    if (!Number.isInteger(minValue) || !Number.isInteger(maxValue)) return null;
    const min = minValue as number;
    const max = maxValue as number;
    if (min < SLIDER_MIN || max > SLIDER_MAX || min >= max) return null;

    const validOperators = Object.values(MadMinuteOperator) as string[];
    if (!Array.isArray(availableOperators) || availableOperators.length === 0) return null;
    if (!availableOperators.every(op => typeof op === "string" && validOperators.includes(op))) return null;

    if (typeof durationSeconds !== "number" || !DURATION_OPTIONS_SECONDS.includes(durationSeconds)) return null;

    return new MadMinuteSettings(
        min,
        max,
        Array.from(new Set(availableOperators)) as MadMinuteOperator[],
        durationSeconds
    );
}

export function loadSettings(): Promise<MadMinuteSettings | null> {
    return loadStored(STORAGE_KEYS.settings, parseSettings);
}

export function saveSettings(settings: MadMinuteSettings): Promise<boolean> {
    return saveStored(STORAGE_KEYS.settings, {
        minValue: settings.minValue,
        maxValue: settings.maxValue,
        availableOperators: settings.availableOperators,
        durationSeconds: settings.durationSeconds,
    });
}
