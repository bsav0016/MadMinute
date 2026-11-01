import { MadMinuteOperator } from "./MadMinuteOperator";

export class MadMinuteQuestion {
    id: number;
    value1: number;
    value2: number;
    operator: MadMinuteOperator;
    answer: number;
    response?: string | null;
    shownAt?: number;    // ms since 1970 when the question appeared on screen
    answeredAt?: number; // ms since 1970 when the player answered or skipped it

    constructor(
        id: number,
        value1: number, 
        value2: number, 
        operator: MadMinuteOperator, 
        answer: number, 
        response?: string | null,
        shownAt?: number,
        answeredAt?: number
    ) {
        this.id = id
        this.value1 = value1
        this.value2 = value2
        this.operator = operator
        this.answer = answer
        this.response = response
        this.shownAt = shownAt
        this.answeredAt = answeredAt
    }

    updateResponse(response: string) {
        this.response = response
    }

    /** A copy with the moment it was shown set, for when the question only appears some time after it was made. */
    withShownAt(shownAt: number): MadMinuteQuestion {
        return new MadMinuteQuestion(this.id, this.value1, this.value2, this.operator, this.answer, this.response, shownAt, this.answeredAt)
    }

    /** A copy with the player's response and the moment they gave it. */
    withResponse(response: string, answeredAt: number): MadMinuteQuestion {
        return new MadMinuteQuestion(this.id, this.value1, this.value2, this.operator, this.answer, response, this.shownAt, answeredAt)
    }

    /** How long the player took to answer, in ms. Null for a skipped question, one still on screen, or one with
     *  no timing. Reading time and typing time are both included. */
    responseMs(): number | null {
        if (!this.response || this.shownAt === undefined || this.answeredAt === undefined) return null
        return Math.max(this.answeredAt - this.shownAt, 0)
    }
}

/** True when two questions ask for the same fact: the same operator and numbers, where adding or multiplying the
 *  numbers the other way round (3 + 4 and 4 + 3) is the same fact. */
export function isSameFact(a: MadMinuteQuestion, b: MadMinuteQuestion): boolean {
    if (a.operator !== b.operator) return false
    if (a.value1 === b.value1 && a.value2 === b.value2) return true
    const commutative = a.operator === MadMinuteOperator.Addition || a.operator === MadMinuteOperator.Multiplication
    return commutative && a.value1 === b.value2 && a.value2 === b.value1
}