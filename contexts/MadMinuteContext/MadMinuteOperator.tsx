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
