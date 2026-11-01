import { MadMinuteOperator } from "./MadMinuteOperator";

export const DEFAULT_DURATION_SECONDS = 60;

export class MadMinuteSettings {
    minValue: number;
    maxValue: number;
    availableOperators: MadMinuteOperator[];
    durationSeconds: number;
    // Off by default. Asks the player's weakest problems more often (see focus.ts).
    focusOnWeakSpots: boolean;

    constructor(
        minValue: number = 0, 
        maxValue: number = 20, 
        availableOperators: MadMinuteOperator[] = [MadMinuteOperator.Addition],
        durationSeconds: number = DEFAULT_DURATION_SECONDS,
        focusOnWeakSpots: boolean = false
    ) {
        this.minValue = minValue
        this.maxValue = maxValue
        this.availableOperators = availableOperators
        this.durationSeconds = durationSeconds
        this.focusOnWeakSpots = focusOnWeakSpots
    }
}
