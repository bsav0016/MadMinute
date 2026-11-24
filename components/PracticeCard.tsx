import React, { useEffect, useState } from "react";
import { AppState, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ReminderSheet } from "@/components/ReminderSheet";
import { reminderTimeText } from "@/contexts/MadMinuteContext/reminder";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { goalProgress, nextGoal } from "@/contexts/MadMinuteContext/practice";
import { goalMarks, goalText, hasPlayed, practiceSummary, streakText } from "@/contexts/MadMinuteContext/practiceText";

const roundsADay = (n: number) => `${n} ${n === 1 ? "round" : "rounds"} a day`;

// Today's goal and the streak, under the title. It appears once the player has finished a round.
export function PracticeCard() {
    const { practice, setGoal, reminder } = useMadMinute();
    const [reminderOpen, setReminderOpen] = useState(false);
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');
    const tint = useThemeColor({}, 'tint');

    // The clock is read when the card shows, when the record changes and when the app comes back to the front, so a
    // phone left open overnight shows the new day.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setTimeout(() => setNow(Date.now()), 0);
        return () => clearTimeout(timer);
    }, [practice]);
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") setNow(Date.now());
        });
        return () => subscription.remove();
    }, []);

    if (!hasPlayed(practice)) return null;

    const progress = goalProgress(practice, now);
    const streak = streakText(practice, now);
    const next = nextGoal(practice.goal);

    return (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <View accessible accessibilityLabel={practiceSummary(practice, now)} style={styles.summary}>
                <ThemedText type="defaultSemiBold" style={styles.line}>{goalText(progress)}</ThemedText>
                <ThemedText style={[styles.marks, { color: tint }]} importantForAccessibility="no" accessibilityElementsHidden>
                    {goalMarks(progress)}
                </ThemedText>
                {streak && <ThemedText style={[styles.line, { color: muted }]}>{streak}</ThemedText>}
            </View>
            <TouchableOpacity
                onPress={() => setGoal(next)}
                accessibilityRole="button"
                accessibilityLabel={`Daily goal: ${roundsADay(practice.goal)}. Change`}
                accessibilityHint={`Changes the goal to ${roundsADay(next)}`}
                style={styles.change}
            >
                <ThemedText style={[styles.changeText, { color: muted }]}>{`Goal: ${roundsADay(practice.goal)} (change)`}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => setReminderOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Daily reminder: ${reminder.enabled ? `on at ${reminderTimeText(reminder)}` : "off"}. Change`}
                style={styles.change}
            >
                <ThemedText style={[styles.changeText, { color: muted }]}>
                    {`Reminder: ${reminder.enabled ? reminderTimeText(reminder) : "off"} (change)`}
                </ThemedText>
            </TouchableOpacity>
            <ReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 18,
        borderWidth: 1,
        gap: 4,
        maxWidth: '88%',
    },
    summary: { alignItems: 'center', gap: 2 },
    line: { textAlign: 'center' },
    marks: { fontSize: 22, lineHeight: 28, letterSpacing: 2 },
    change: { minHeight: 44, justifyContent: 'center' },
    changeText: { fontSize: 14, textDecorationLine: 'underline' },
});
