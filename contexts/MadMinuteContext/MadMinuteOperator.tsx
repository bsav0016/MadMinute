export enum MadMinuteOperator {
    Addition = "+",
    Subtraction = "-",
    Multiplication = "x",
    Division = "÷"
}

// The enum values are plain ASCII; this gives the symbols to show on screen.
export function displayOperator(operator: MadMinuteOperator): string {
    switch (operator) {
        case MadMinuteOperator.Subtraction:
            return "−";
        case MadMinuteOperator.Multiplication:
            return "×";
        default:
            return operator;
    }
}

// Screen readers say "−" and "×" unreliably (or not at all), so spoken text spells the operators out.
export function spokenOperator(operator: MadMinuteOperator): string {
    switch (operator) {
        case MadMinuteOperator.Addition:
            return "plus";
        case MadMinuteOperator.Subtraction:
            return "minus";
        case MadMinuteOperator.Multiplication:
            return "times";
        default:
            return "divided by";
    }
}

export function spokenQuestion(value1: number, operator: MadMinuteOperator, value2: number): string {
    return `${value1} ${spokenOperator(operator)} ${value2}`;
}
