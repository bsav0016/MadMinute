import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { allTableStatuses, TABLE_FACTS, TableLevel } from "@/contexts/MadMinuteContext/practice";
import { levelMark, levelWord, tableRowText } from "@/contexts/MadMinuteContext/practiceText";
import { FactStats } from "@/contexts/MadMinuteContext/factStats";

// One row for each times table from 2 to 12: its level in words and a mark (never colour alone), how many of its 12
// facts are solid, and a button to practise just that table.
export function TableLevels({ facts, onPractice }: { facts: FactStats; onPractice: (table: number) => void }) {
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');
    const text = useThemeColor({}, 'text');
    const tint = useThemeColor({}, 'tint');

    const fills: Record<TableLevel, string> = {
        new: 'transparent',
        learning: Colors.results.skipped,
        known: Colors.results.correct,
        mastered: Colors.results.correct,
    };

    return (
        <View>
            {allTableStatuses(facts).map((status) => (
                <View key={status.table} style={[styles.row, { borderTopColor: border }]}>
                    <View accessible accessibilityLabel={tableRowText(status)} style={styles.info}>
                        <Text style={[styles.table, { color: text }]}>{status.table}s</Text>
                        <View style={[styles.badge, status.level === "new" && { borderWidth: 1, borderColor: border }, { backgroundColor: fills[status.level] }]}>
                            <Text style={[styles.badgeText, status.level === "new" && { color: text }]}>{`${levelMark(status.level)} ${levelWord(status.level)}`}</Text>
                        </View>
                        <ThemedText style={[styles.count, { color: muted }]}>
                            {status.started === 0 ? "" : `${status.solid}/${TABLE_FACTS}`}
                        </ThemedText>
                    </View>
                    <TouchableOpacity
                        onPress={() => onPractice(status.table)}
                        accessibilityRole="button"
                        accessibilityLabel={`Practice the ${status.table}s`}
                        style={styles.practice}
                    >
                        <Text style={[styles.practiceText, { color: tint }]}>Practice</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        minHeight: 48,
    },
    info: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    table: { fontSize: 18, fontWeight: '700', minWidth: 40 },
    badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
    // The fills are light, so the text on them is dark; "Not started" has no fill and uses the text colour of the theme.
    badgeText: { color: '#111827', fontSize: 14, fontWeight: '600' },
    count: { fontSize: 14 },
    practice: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
    practiceText: { fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
