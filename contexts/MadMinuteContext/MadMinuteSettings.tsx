import { MadMinuteOperator } from "./MadMinuteOperator";

export class MadMinuteSettings {
    minValue: number;
    maxValue: number;
    availableOperators: MadMinuteOperator[];

    constructor(
        minValue: number = 0, 
        maxValue: number = 20, 
        availableOperators: MadMinuteOperator[] = [MadMinuteOperator.Addition]
    ) {
        this.minValue = minValue
        this.maxValue = maxValue
        this.availableOperators = availableOperators
    }
}