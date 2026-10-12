import React from "react";
import { ThemedView } from "./ThemedView";
import { MadMinuteQuestion } from "@/contexts/MadMinuteContext/MadMinuteQuestion";
import { StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";

interface FormattedQuestionProps {
    question: MadMinuteQuestion
}

export function FormattedQuestion({question}: FormattedQuestionProps) {
    const ruleColor = useThemeColor({}, 'text');

    return (
        <ThemedView style={[styles.questionContainer, { borderBottomColor: ruleColor }]}>
            <ThemedView style={styles.line1Container}>
                <ThemedText type="subtitle" style={styles.valueText}>{question.value1}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.line2Container}>
                <ThemedView style={styles.operatorContainer}>
                    <ThemedText type="subtitle" style={styles.operatorText}>{question.operator}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.value2Container}>
                    <ThemedText type="subtitle" style={styles.valueText}>{question.value2}</ThemedText>
                </ThemedView>
            </ThemedView>
        </ThemedView>
    )
}

const styles = StyleSheet.create({
    questionContainer: {
        width: 120,
        borderBottomWidth: 4,
        backgroundColor: 'transparent',
    },

    line1Container: {
        width: '100%',
        backgroundColor: 'transparent',
    },

    valueText: {
        textAlign: 'right',
        fontSize: 40,
        lineHeight: 46,
    },

    operatorText: {
        fontSize: 40,
        lineHeight: 46,
    },

    line2Container: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
    },

    operatorContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },

    value2Container: {
        flex: 2,
        backgroundColor: 'transparent',
    },
})
