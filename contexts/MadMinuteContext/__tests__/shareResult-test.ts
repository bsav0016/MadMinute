import { MadMinuteOperator as Op } from "../MadMinuteOperator";
import { RoundRecord } from "../roundRecord";
import { operatorWords, resultMessage, shareLink, WEBSITE_URL } from "../shareResult";

const record = (overrides: Partial<RoundRecord> = {}): RoundRecord => ({
    id: "r1", playedAt: 0, operators: [Op.Addition, Op.Subtraction], minValue: 0, maxValue: 20, durationSeconds: 60,
    correct: 18, incorrect: 3, skipped: 1, byOperator: {}, ...overrides,
});

describe("operatorWords", () => {
    it("reads naturally for one, two and more operators", () => {
        expect(operatorWords([Op.Addition])).toBe("addition");
        expect(operatorWords([Op.Addition, Op.Subtraction])).toBe("addition and subtraction");
        expect(operatorWords([Op.Addition, Op.Subtraction, Op.Division])).toBe("addition, subtraction and division");
    });
});

describe("resultMessage", () => {
    it("says the score out of what was attempted, the setup and the length", () => {
        const message = resultMessage(record(), false, "ios")!;
        expect(message).toContain("I got 18/22 in a 60-second Math Mad Minute (addition and subtraction, numbers 0 to 20).");
        expect(message).not.toContain("personal best");
    });

    it("mentions a new personal best", () => {
        expect(resultMessage(record(), true, "ios")).toContain("A new personal best!");
    });

    it("links to the App Store with a campaign on iPhone and to the website otherwise", () => {
        expect(shareLink("ios")).toMatch(/apps\.apple\.com\/us\/app\/math-mad-minute\/id6739588575\?pt=\d+&ct=share-result-ios&mt=8/);
        expect(shareLink("android")).toBe(WEBSITE_URL);
        expect(resultMessage(record(), false, "android")).toContain(WEBSITE_URL);
    });

    it("shares nothing when nothing was attempted", () => {
        expect(resultMessage(record({ correct: 0, incorrect: 0, skipped: 0 }), false, "ios")).toBeNull();
    });

    it("holds only the score, the setup and the link", () => {
        const message = resultMessage(record({ id: "secret-id", playedAt: 1234567 }), false, "ios")!;
        expect(message).not.toMatch(/secret-id|1234567/);
    });
});
