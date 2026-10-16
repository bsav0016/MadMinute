import { CustomHeaderView } from "@/components/CustomHeaderView";
import { GeneralButton } from "@/components/GeneralButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { getResponseResults } from "@/contexts/MadMinuteContext/responseResults";
import { displayOperator } from "@/contexts/MadMinuteContext/MadMinuteOperator";
import { useRouteTo } from "@/contexts/RouteContext";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Routes } from "./Routes";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function Results() {
    const { madMinute, resetMadMinute } = useMadMinute();
    const { routeReplace } = useRouteTo();
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');

    const {correct, incorrect, skipped} = getResponseResults(madMinute.questions)

    const attempted = correct + incorrect + skipped;
    const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

    const displayFields = [
        { text: 'Accuracy', value: `${accuracy}%` },
        { text: 'Incorrect', value: incorrect },
        { text: 'Skipped', value: skipped },
    ]

    const playAgain = () => {
        resetMadMinute();
        routeReplace(Routes.PlayMadMinute);
    }

    interface QuestionResultProps {
        question: string;
        answer: string;
        response: string;
        header?: boolean
    }

    const QuestionResult = ({question, answer, response, header=false}: QuestionResultProps) => {
        const themedText = useThemeColor({}, 'text');
        const pageBackground = useThemeColor({}, 'background');
        let backgroundColor;
        if (header) {
            backgroundColor = pageBackground
        }
        else if (!response) {
            backgroundColor = Colors.results.skipped
        }
        else if (answer === response) {
            backgroundColor = Colors.results.correct
        }
        else {
            backgroundColor = Colors.results.incorrect
        }

        const textColor = header ? themedText : '#111827';

        return (
            <ThemedView style={[styles.resultContainer, header && styles.headerRow, {backgroundColor: backgroundColor}]}>
                <View style={styles.questionLabelContainer}>
                    <Text style={[styles.resultsText, header && styles.headerText, { color: textColor }]}>{question}</Text>
                </View>

                <View style={styles.answerLabelContainer}>
                    <Text style={[styles.resultsText, header && styles.headerText, { color: textColor }]}>{answer}</Text>
                </View>

                <View style={styles.responseLabelContainer}>
                    <Text style={[styles.resultsText, header && styles.headerText, { color: textColor }]}>{response}</Text>
                </View>
            </ThemedView>
        )
    }

    return(
        <CustomHeaderView header="Results">
            <ThemedView style={[styles.summaryContainer, { backgroundColor: surface, borderColor: border }]}>
                <ThemedText type="subtitle" style={styles.scoreText}>Overall Score: {correct}/{attempted}</ThemedText>

                {displayFields.map((field) => (
                    <ThemedText type="default" key={field.text} style={{ color: muted }}>{field.text}: {field.value}</ThemedText>
                ))}

            </ThemedView>
            <QuestionResult 
                question='Question'
                answer='Correct Answer'
                response='Your Response'
                header={true}
            />

            <ScrollView style={styles.resultsContainer}> 
                {madMinute.questions.slice(0, -1).map((question) => (
                    <QuestionResult 
                        question={`${question.value1} ${displayOperator(question.operator)} ${question.value2}`}
                        answer={String(question.answer)}
                        response={question.response ?? ''} 
                        key={question.id} 
                    />
                ))}
            </ScrollView>

            <ThemedView style={styles.returnHomeContainer}>
                <GeneralButton title="Play Again" onPress={playAgain} />
                <GeneralButton title="Return Home" onPress={() => routeReplace(Routes.HomeScreen)} variant="secondary" />
            </ThemedView>
        </CustomHeaderView>
    )
}

const styles = StyleSheet.create({
    summaryContainer: {
        marginVertical: 12,
        marginHorizontal: 16,
        paddingVertical: 16,
        gap: 2,
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
    },

    scoreText: {
        fontSize: 28,
        marginBottom: 4,
    },

    resultContainer: {
        flexDirection: 'row',
        marginVertical: 3,
        marginHorizontal: 16,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 12,
    },

    headerRow: {
        paddingVertical: 4,
    },

    headerText: {
        fontSize: 15,
        opacity: 0.7,
    },

    questionLabelContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },

    responseLabelContainer: {
        flex: 1,
        alignItems: 'center',
    },

    answerLabelContainer: {
        flex: 1,
        alignItems: 'center'
    },

    resultsContainer: {
        flex: 1
    },

    resultsText: {
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold'
    },

    returnHomeContainer: {
        alignItems: 'center',
        marginVertical: 10,
        gap: 4
    }
})