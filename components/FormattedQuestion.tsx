import React from "react";
import { ThemedView } from "./ThemedView";
import { MadMinuteQuestion } from "@/contexts/MadMinuteContext/MadMinuteQuestion";
import { StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";

interface FormattedQuestionProps {
    question: MadMinuteQuestion
}

export function FormattedQuestion({question}: FormattedQuestionProps) {  
    return (
        <ThemedView style={styles.questionContainer}>
            <ThemedView style={styles.line1Container}>
                <ThemedText type="subtitle" style={styles.valueText}>{question.value1}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.line2Container}>
                <ThemedView style={styles.operatorContainer}>
                    <ThemedText type="subtitle">{question.operator}</ThemedText>
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
        width: 60,
        borderBottomWidth: 4,
        borderBottomColor: 'black',
    },

    line1Container: {
        width: '100%'
    },

    valueText: {
        textAlign: 'right'
    },

    line2Container: {
        flexDirection: 'row'
    },

    operatorContainer: {
        flex: 1
    },

    value2Container: {
        flex: 2
    },
})