import { MadMinuteOperator } from "./MadMinuteOperator";

export class MadMinuteQuestion {
    id: number;
    value1: number;
    value2: number;
    operator: MadMinuteOperator;
    answer: number;
    response?: string | null;

    constructor(
        id: number,
        value1: number, 
        value2: number, 
        operator: MadMinuteOperator, 
        answer: number, 
        response?: string | null
    ) {
        this.id = id
        this.value1 = value1
        this.value2 = value2
        this.operator = operator
        this.answer = answer
        this.response = response
    }

    updateResponse(response: string) {
        this.response = response
    }
}