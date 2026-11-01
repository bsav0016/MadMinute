import { MadMinuteSettings } from "./MadMinuteSettings";
import { MadMinuteQuestion, isSameFact } from "./MadMinuteQuestion";
import { MadMinuteOperator } from "./MadMinuteOperator";
import { getFirstDivisionInt, getRandomInt, getSecondDivisionInt, getSubtractionInt } from "./randomIntUtils";

// How many times to draw again when the draw repeats the previous question. A range with only one possible question
// (every number the same) can only repeat it, so the loop has to end.
const MAX_REDRAWS = 25;

export class MadMinuteClass {
    settings: MadMinuteSettings;
    questions: MadMinuteQuestion[];

    constructor(
        settings: MadMinuteSettings = new MadMinuteSettings(), 
        questions: MadMinuteQuestion[] = []
    ) {
        this.settings = settings
        this.questions = questions
    }

    /** The next question. It is never the same fact as the one before it unless no other question is possible. */
    generateNewQuestion(now: number = Date.now()): MadMinuteQuestion {
        const previous = this.questions.at(-1);
        let question = this.drawQuestion(now);
        for (let tries = 1; previous && isSameFact(previous, question) && tries < MAX_REDRAWS; tries++) {
            question = this.drawQuestion(now);
        }
        return question;
    }

    private drawQuestion(now: number): MadMinuteQuestion {
        const id = this.questions.length;

        const operatorIndex = 
            Math.floor(Math.random() * this.settings.availableOperators.length);
        const operator = this.settings.availableOperators[operatorIndex];
        
        let value1: number;
        let value2: number;
        let answer: number;

        if (operator === MadMinuteOperator.Subtraction) {
            value1 = getSubtractionInt(this.settings.minValue, this.settings.maxValue);
            value2 = getRandomInt(this.settings.minValue, value1);
            answer = value1 - value2;
        }
        else if (operator === MadMinuteOperator.Division) {
            value1 = getFirstDivisionInt(this.settings.minValue, this.settings.maxValue);
            value2 = getSecondDivisionInt(this.settings.minValue, value1);
            answer = Math.floor(value1 / value2);
        }
        else {
            value1 = getRandomInt(this.settings.minValue, this.settings.maxValue);
            value2 = getRandomInt(this.settings.minValue, this.settings.maxValue);
            
            if (operator === MadMinuteOperator.Addition) {
                answer = value1 + value2
            } else {
                answer = value1 * value2
            }
        }

        const question = new MadMinuteQuestion(
            id,
            value1,
            value2,
            operator,
            answer,
            undefined,
            now
        )

        return question;
    }
}