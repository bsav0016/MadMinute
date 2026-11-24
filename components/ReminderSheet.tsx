import React, { useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Switch, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { reminderTimeText, stepReminder } from "@/contexts/MadMinuteContext/reminder";

const STEPS = [
    { label: "1 hour earlier", minutes: -60 },
    { label: "15 minutes earlier", minutes: -15 },
    { label: "15 minutes later", minutes: 15 },
    { label: "1 hour later", minutes: 60 },
];

// The optional daily reminder: a switch and a time. The phone's own permission question is asked when the switch is
// turned on, never before.
export function ReminderSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { reminder, setReminder } = useMadMinute();
    const background = useThemeColor({}, "background");
    const muted = useThemeColor({}, "muted");
    const tint = useThemeColor({}, "tint");
    const [problem, setProblem] = useState<"denied" | "unavailable" | null>(null);

    const toggle = async (enabled: boolean) => {
        setProblem(null);
        const result = await setReminder({ ...reminder, enabled });
        if (!result.ok) setProblem(result.reason);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
            <View style={[styles.sheet, { backgroundColor: background }]}>
                <ThemedText type="subtitle" accessibilityRole="header">Daily reminder</ThemedText>

                <View style={styles.row}>
                    <ThemedText style={styles.rowLabel}>Remind me every day</ThemedText>
                    <Switch
                        value={reminder.enabled}
                        onValueChange={toggle}
                        accessibilityLabel="Daily reminder"
                    />
                </View>

                {reminder.enabled && (
                    <View style={styles.time}>
                        <ThemedText type="subtitle" style={[styles.timeText, { color: tint }]} accessibilityLabel={`Reminder time ${reminderTimeText(reminder)}`}>
                            {reminderTimeText(reminder)}
                        </ThemedText>
                        <View style={styles.steps}>
                            {STEPS.map((step) => (
                                <GeneralButton
                                    key={step.label}
                                    title={step.label}
                                    onPress={() => setReminder(stepReminder(reminder, step.minutes))}
                                    variant="secondary"
                                    fontSize={16}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {problem === "denied" && (
                    <View style={styles.problem}>
                        <ThemedText style={{ color: muted }}>
                            Notifications are turned off for Mad Minute on this phone. Turn them on in the phone settings to get a reminder.
                        </ThemedText>
                        <GeneralButton title="Open phone settings" onPress={() => { Linking.openSettings().catch(() => {}); }} variant="secondary" fontSize={16} />
                    </View>
                )}
                {problem === "unavailable" && (
                    <ThemedText style={{ color: muted }}>Reminders are not available on this phone.</ThemedText>
                )}

                <ThemedText style={[styles.note, { color: muted }]}>
                    One notification a day at about this time, on this phone only. It is skipped on a day the goal is already done.
                    Nothing is sent to anyone.
                </ThemedText>

                <GeneralButton title="Done" onPress={onClose} fontSize={18} />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, gap: 12 },
    rowLabel: { flexShrink: 1 },
    time: { alignItems: "center", gap: 8 },
    timeText: { fontSize: 32, lineHeight: 40 },
    steps: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
    problem: { gap: 8 },
    note: { fontSize: 14 },
});
