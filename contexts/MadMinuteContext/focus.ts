import { MadMinuteOperator } from "./MadMinuteOperator";
import { MadMinuteQuestion } from "./MadMinuteQuestion";
import { MadMinuteSettings } from "./MadMinuteSettings";
import { FactStats, hasEnoughData, ParsedFact, weakestFacts } from "./factStats";

// "Focus on my weak spots": about half the questions come from the facts the player finds hardest, the rest from the
// normal draw, so a round still feels like the setup they chose.

/** The share of questions drawn from the weak spots. */
export const FOCUS_SHARE = 0.5;

/** How many of the weakest facts are drawn from. Enough that a round does not repeat the same few every time. */
export const FOCUS_POOL_SIZE = 12;

/** Whether a fact is one the current settings could ask: an operator that is switched on, with numbers inside the
 *  range, in a shape the normal draw would produce (no negative answers, no division with a remainder). */
export function fitsSettings(fact: ParsedFact, settings: MadMinuteSettings): boolean {
    const { operator, value1, value2 } = fact;
    if (!settings.availableOperators.includes(operator)) return false;
    const { minValue, maxValue } = settings;
    const inRange = (n: number) => n >= minValue && n <= maxValue;
    if (!inRange(value1) || !inRange(value2)) return false;
    if (operator === MadMinuteOperator.Subtraction) return value2 <= value1;
    if (operator === MadMinuteOperator.Division) return value2 >= 1 && value1 % value2 === 0;
    return true;
}

/** The weak spots to draw from, worst first, or none when focus is off or there is too little on record to go on. */
export function focusPool(stats: FactStats, settings: MadMinuteSettings): ParsedFact[] {
    if (!settings.focusOnWeakSpots || !hasEnoughData(stats)) return [];
    return weakestFacts(stats, Infinity)
        .map((spot) => spot.fact)
        .filter((fact) => fitsSettings(fact, settings))
        .slice(0, FOCUS_POOL_SIZE);
}

/** A question asking the given fact. Addition and multiplication are stored in order, so they are shown either way
 *  round at random. */
export function questionForFact(
    fact: ParsedFact, id: number, now: number, random: () => number = Math.random
): MadMinuteQuestion {
    const { operator } = fact;
    const commutative = operator === MadMinuteOperator.Addition || operator === MadMinuteOperator.Multiplication;
    const swap = commutative && random() < 0.5;
    const value1 = swap ? fact.value2 : fact.value1;
    const value2 = swap ? fact.value1 : fact.value2;

    let answer: number;
    if (operator === MadMinuteOperator.Addition) answer = value1 + value2;
    else if (operator === MadMinuteOperator.Subtraction) answer = value1 - value2;
    else if (operator === MadMinuteOperator.Multiplication) answer = value1 * value2;
    else answer = value1 / value2;

    return new MadMinuteQuestion(id, value1, value2, operator, answer, undefined, now);
}
