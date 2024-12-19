import { MadMinuteSettings } from "./MadMinuteSettings";
import { MadMinuteQuestion } from "./MadMinuteQuestion";
import { MadMinuteOperator } from "./MadMinuteOperator";
import { getFirstDivisionInt, getRandomInt, getSecondDivisionInt, getSubtractionInt } from "./randomIntUtils";

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

    generateNewQuestion(): MadMinuteQuestion {
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
            answer
        )

        return question;
    }
}