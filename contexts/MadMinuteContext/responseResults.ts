import { MadMinuteQuestion } from "./MadMinuteQuestion";

export interface ResponseResults {
    correct: number;
    incorrect: number;
    skipped: number;
}

// Tallies how the player did. The game generates the next question as soon as one is answered, so the last question
// in the list is the one still on screen when time ran out. It was never attempted, so it is not counted.
export function getResponseResults(questions: MadMinuteQuestion[]): ResponseResults {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    for (let i = 0; i < questions.length - 1; i++) {
        const question = questions[i];
        if (!question.response) {
            skipped += 1;
        } else if (String(question.answer) === question.response) {
            correct += 1;
        } else {
            incorrect += 1;
        }
    }

    return { correct, incorrect, skipped };
}
