import { MadMinuteOperator } from "./MadMinuteOperator";
import { RoundRecord } from "./roundRecord";

// The text shared from the results screen: the score, the setup and a link to the app. Plain text through the phone's share
// sheet, so it needs no native module (an over-the-air update can carry it). It holds nothing but what the player
// chooses to send: no name, no history, no per-question detail.
export const WEBSITE_URL = "https://bsav0016.github.io/MadMinute/";
export const APP_STORE_URL = "https://apps.apple.com/us/app/math-mad-minute/id6739588575";

// Public identifier of the developer account, which the App Store needs in order to report a campaign link.
// The same value is in every campaign link (and in scripts/growthLinks.js).
const APP_STORE_PROVIDER_TOKEN = "122126127";

/** The store link for this phone, tagged so installs that came from a shared score can be counted. */
export function shareLink(os: string): string {
    return os === "ios" ? `${APP_STORE_URL}?pt=${APP_STORE_PROVIDER_TOKEN}&ct=share-result-ios&mt=8` : WEBSITE_URL;
}

const NAMES: Record<MadMinuteOperator, string> = {
    [MadMinuteOperator.Addition]: "addition",
    [MadMinuteOperator.Subtraction]: "subtraction",
    [MadMinuteOperator.Multiplication]: "multiplication",
    [MadMinuteOperator.Division]: "division",
};

/** "addition", "addition and subtraction", "addition, subtraction and division". */
export function operatorWords(operators: MadMinuteOperator[]): string {
    const words = operators.map((op) => NAMES[op]);
    if (words.length <= 1) return words.join("");
    return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The message for a finished round, or null when nothing was attempted. */
export function resultMessage(record: RoundRecord, isNewBest: boolean, os: string): string | null {
    const attempted = record.correct + record.incorrect + record.skipped;
    if (attempted === 0) return null;
    const seconds = record.durationSeconds;
    const setup = `${operatorWords(record.operators)}, numbers ${record.minValue} to ${record.maxValue}`;
    return [
        `I got ${record.correct}/${attempted} in a ${seconds}-second Math Mad Minute (${setup}).${isNewBest ? " A new personal best!" : ""}`,
        `Think you can beat it? ${shareLink(os)}`,
    ].join("\n");
}
