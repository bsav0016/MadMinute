import { CustomHeaderView } from "@/components/CustomHeaderView";
import { GeneralButton } from "@/components/GeneralButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { useRouteTo } from "@/contexts/RouteContext";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Routes } from "./Routes";

export default function Results() {
    const { madMinute } = useMadMinute();
    const { routeReplace } = useRouteTo();

    interface ResponseResults {
        correct: number;
        incorrect: number;
        skipped: number;
    }
    const {correct, incorrect, skipped}: ResponseResults = getResponseResults()

    function getResponseResults(): ResponseResults {
        let correct = 0;
        let incorrect = 0;
        let skipped = 0;

        for (let i = 0; i < madMinute.questions.length - 1; i++) {
            const question = madMinute.questions[i];
            if (!question.response) {
                skipped += 1;
            } else if (String(question.answer) === question.response) {
                correct += 1;
            } else {
                incorrect += 1;
            }
        }

        return {correct, incorrect, skipped}
    }

    const displayFields = [
        { text: 'Incorrect', value: incorrect },
        { text: 'Skipped', value: skipped },
    ]

    interface QuestionResultProps {
        question: string;
        answer: string;
        response: string;
        header?: boolean
    }

    const QuestionResult = ({question, answer, response, header=false}: QuestionResultProps) => {
        let backgroundColor;
        if (header) {
            backgroundColor = 'none'
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

        return (
            <ThemedView style={[styles.resultContainer, {backgroundColor: backgroundColor}]}>
                <View style={styles.questionLabelContainer}>
                    <Text style={styles.resultsText}>{question}</Text>
                </View>

                <View style={styles.answerLabelContainer}>
                    <Text style={styles.resultsText}>{answer}</Text>
                </View>

                <View style={styles.responseLabelContainer}>
                    <Text style={styles.resultsText}>{response}</Text>
                </View>
            </ThemedView>
        )
    }

    return(
        <CustomHeaderView header="Results">
            <ThemedView style={styles.summaryContainer}>
                <ThemedText type="subtitle">Overall Score: {correct}/{correct + incorrect + skipped}</ThemedText>

                {displayFields.map((field) => (
                    <ThemedText type="default" key={field.text}>{field.text}: {field.value}</ThemedText>
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
                        question={`${question.value1}${question.operator}${question.value2}`}
                        answer={String(question.answer)}
                        response={question.response ?? ''} 
                        key={question.id} 
                    />
                ))}
            </ScrollView>

            <ThemedView style={styles.returnHomeContainer}>
                <GeneralButton title="Return Home" onPress={() => routeReplace(Routes.HomeScreen)} />
            </ThemedView>
        </CustomHeaderView>
    )
}

const styles = StyleSheet.create({
    summaryContainer: {
        marginVertical: 10,
        gap: 2,
        alignItems: 'center'
    },

    resultContainer: {
        flexDirection: 'row',
        margin: 5,
        paddingHorizontal: 10,
        paddingVertical: 5
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
        marginVertical: 10
    }
})