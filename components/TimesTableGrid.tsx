import { Colors } from "@/constants/Colors";
import { CellLevel, GridCell, gridFactsNeedingWork } from "@/contexts/MadMinuteContext/troubleSpots";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// The multiplication table coloured by how well each fact is known. Plain Views, like the trend bars on the History
// screen. The cells carry no labels of their own: a screen reader gets one summary for the whole grid.
export function TimesTableGrid({ grid }: { grid: GridCell[][] }) {
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');

    const colors: Record<CellLevel, string> = {
        unseen: border,
        solid: Colors.results.correct,
        ok: Colors.results.skipped,
        trouble: Colors.results.incorrect,
        bad: Colors.results.incorrectStrong,
    };

    const needWork = gridFactsNeedingWork(grid);
    const summary = needWork === 0
        ? "Times table grid. No multiplication facts need work yet."
        : `Times table grid. ${needWork} multiplication ${needWork === 1 ? "fact needs" : "facts need"} work.`;

    return (
        <View accessible accessibilityLabel={summary} style={styles.grid}>
            <View style={styles.row}>
                <View style={styles.cell} />
                {grid[0]?.map((cell) => (
                    <View key={cell.col} style={styles.cell}>
                        <Text style={[styles.header, { color: muted }]}>{cell.col}</Text>
                    </View>
                ))}
            </View>
            {grid.map((cells) => (
                <View key={cells[0].row} style={styles.row}>
                    <View style={styles.cell}>
                        <Text style={[styles.header, { color: muted }]}>{cells[0].row}</Text>
                    </View>
                    {cells.map((cell) => (
                        <View key={cell.col} style={styles.cell}>
                            <View style={[styles.fill, { backgroundColor: colors[cell.level] }]} />
                        </View>
                    ))}
                </View>
            ))}
            <View style={styles.legend}>
                {([["solid", "Quick and right"], ["ok", "Fine"], ["trouble", "Needs work"], ["bad", "Often missed"], ["unseen", "Not enough yet"]] as [CellLevel, string][]).map(([level, label]) => (
                    <View key={level} style={styles.legendItem}>
                        <View style={[styles.swatch, { backgroundColor: colors[level] }]} />
                        <Text style={[styles.legendText, { color: muted }]}>{label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        width: '100%',
    },

    row: {
        flexDirection: 'row',
    },

    cell: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 1,
    },

    fill: {
        width: '100%',
        height: '100%',
        borderRadius: 3,
    },

    header: {
        fontSize: 10,
    },

    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },

    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    swatch: {
        width: 10,
        height: 10,
        borderRadius: 3,
    },

    legendText: {
        fontSize: 11,
    },
});
