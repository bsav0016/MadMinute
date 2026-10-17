import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Colors } from "@/constants/Colors";

interface NumberPadProps {
    onDigit: (digit: string) => void;
    onBackspace: () => void;
    onClear: () => void;
}

const ROWS: string[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
];

// Answers are never negative or fractional, so the pad only needs digits, backspace and clear.
export function NumberPad({ onDigit, onBackspace, onClear }: NumberPadProps) {
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const text = useThemeColor({}, 'text');
    const muted = useThemeColor({}, 'muted');

    const press = (action: () => void) => () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        action();
    };

    const keyStyle = [styles.key, { backgroundColor: surface, borderColor: border }];

    return (
        <View style={styles.pad}>
            {ROWS.map((row) => (
                <View key={row.join("")} style={styles.row}>
                    {row.map((digit) => (
                        <TouchableOpacity key={digit} style={keyStyle} onPress={press(() => onDigit(digit))} activeOpacity={0.6}>
                            <Text style={[styles.keyText, { color: text }]}>{digit}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
            <View style={styles.row}>
                <TouchableOpacity style={keyStyle} onPress={press(onClear)} activeOpacity={0.6} accessibilityLabel="Clear answer">
                    <Text style={[styles.clearText, { color: muted }]}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={keyStyle} onPress={press(() => onDigit("0"))} activeOpacity={0.6}>
                    <Text style={[styles.keyText, { color: text }]}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={keyStyle} onPress={press(onBackspace)} activeOpacity={0.6} accessibilityLabel="Delete last digit">
                    <Ionicons name="backspace-outline" size={28} color={Colors.button.background} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    pad: {
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: 20,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    key: {
        flex: 1,
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyText: {
        fontSize: 26,
        fontWeight: '600',
    },
    clearText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
