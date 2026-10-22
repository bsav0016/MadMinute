import { CustomHeaderView } from "@/components/CustomHeaderView";
import { GeneralButton } from "@/components/GeneralButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { bestRounds, operatorAccuracy, recentTrend, summarize } from "@/contexts/MadMinuteContext/historyStats";
import { displayOperator } from "@/contexts/MadMinuteContext/MadMinuteOperator";
import { scoreText } from "@/contexts/MadMinuteContext/personalBest";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

const BAR_AREA_HEIGHT = 90;

export default function History() {
    const { history, clearHistory } = useMadMinute();
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');
    const tint = useThemeColor({}, 'tint');

    const summary = summarize(history);
    const trend = recentTrend(history);
    const bests = bestRounds(history);
    const operators = operatorAccuracy(history);

    const confirmClear = () => {
        Alert.alert(
            "Clear all history?",
            "This deletes your past rounds and personal bests from this device. It cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: clearHistory },
            ]
        );
    };

    const card = [styles.card, { backgroundColor: surface, borderColor: border }];
    const cardTitle = [styles.cardTitle, { color: muted }];

    return (
        <CustomHeaderView header="History" canGoBack={true}>
            {history.length === 0 ? (
                <ThemedView style={styles.empty}>
                    <ThemedText type="subtitle">No rounds yet</ThemedText>
                    <ThemedText style={{ color: muted, textAlign: 'center' }}>
                        Finish a round and it will show up here, along with your personal bests.
                    </ThemedText>
                </ThemedView>
            ) : (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    <ThemedView style={card}>
                        <ThemedText style={cardTitle}>Overall</ThemedText>
                        <ThemedText type="subtitle">
                            {summary.rounds} {summary.rounds === 1 ? "round" : "rounds"} · {summary.accuracy ?? 0}% correct
                        </ThemedText>
                        <ThemedText style={{ color: muted }}>{summary.correct} of {summary.attempted} answers right</ThemedText>
                    </ThemedView>

                    <ThemedView style={card}>
                        <ThemedText style={cardTitle}>Last {trend.length} {trend.length === 1 ? "round" : "rounds"} (correct answers)</ThemedText>
                        <View style={styles.bars}>
                            {trend.map((bar) => (
                                <View key={bar.id} style={styles.barColumn}>
                                    <ThemedText style={[styles.barValue, { color: muted }]}>{bar.correct}</ThemedText>
                                    <View style={[styles.bar, { backgroundColor: tint, height: Math.max(4, bar.height * BAR_AREA_HEIGHT) }]} />
                                </View>
                            ))}
                        </View>
                        <ThemedText style={[styles.barCaption, { color: muted }]}>Oldest on the left, newest on the right</ThemedText>
                    </ThemedView>

                    <ThemedView style={card}>
                        <ThemedText style={cardTitle}>Accuracy by operation</ThemedText>
                        {operators.map((entry) => (
                            <View key={entry.operator} style={styles.row}>
                                <ThemedText style={styles.rowLabel}>{displayOperator(entry.operator)}</ThemedText>
                                <View style={[styles.track, { backgroundColor: border }]}>
                                    <View style={[styles.fill, { backgroundColor: tint, width: `${entry.accuracy ?? 0}%` }]} />
                                </View>
                                <ThemedText style={styles.rowValue}>{entry.accuracy ?? 0}%</ThemedText>
                            </View>
                        ))}
                    </ThemedView>

                    <ThemedView style={card}>
                        <ThemedText style={cardTitle}>Personal bests</ThemedText>
                        {bests.map((entry) => (
                            <View key={entry.record.id} style={styles.bestRow}>
                                <ThemedText style={styles.bestLabel}>{entry.label}</ThemedText>
                                <ThemedText type="defaultSemiBold">{scoreText(entry.record)}</ThemedText>
                            </View>
                        ))}
                    </ThemedView>

                    <View style={styles.clearButton}>
                        <GeneralButton title="Clear all history" onPress={confirmClear} variant="secondary" fontSize={16} />
                    </View>
                </ScrollView>
            )}
        </CustomHeaderView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 14,
    },

    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
    },

    card: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 4,
        backgroundColor: 'transparent',
    },

    cardTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 4,
    },

    bars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: BAR_AREA_HEIGHT + 22,
        gap: 6,
    },

    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },

    bar: {
        width: '100%',
        borderRadius: 5,
    },

    barValue: {
        fontSize: 12,
        lineHeight: 18,
    },

    barCaption: {
        fontSize: 12,
        marginTop: 4,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 4,
    },

    rowLabel: {
        width: 24,
        fontSize: 20,
        textAlign: 'center',
    },

    track: {
        flex: 1,
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
    },

    fill: {
        height: '100%',
        borderRadius: 5,
    },

    rowValue: {
        width: 48,
        textAlign: 'right',
    },

    bestRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },

    bestLabel: {
        flexShrink: 1,
    },

    clearButton: {
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 12,
    },
});
