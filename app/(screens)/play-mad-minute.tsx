import { CustomHeaderView } from "@/components/CustomHeaderView";
import { ThemedView } from "@/components/ThemedView";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { useRouteTo } from "@/contexts/RouteContext";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from "react-native";
import { Routes } from "./Routes";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { FormattedQuestion } from "@/components/FormattedQuestion";
import { MadMinuteQuestion } from "@/contexts/MadMinuteContext/MadMinuteQuestion";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function PlayMadMinute() {
    const { madMinute, addQuestion, submitResponse } = useMadMinute();
    const { routeTo } = useRouteTo();
    const color = useThemeColor({}, 'text');

    const startTimeRemaining: number = 63

    const [timeRemaining, setTimeRemaining] = useState<number>(startTimeRemaining);
    const [currentQuestion, setCurrentQuestion] = useState<MadMinuteQuestion | undefined>(undefined);
    const [response, setResponse] = useState<string>('');

    const startTimeRef = useRef(0);
    const timeRemainingRef = useRef(timeRemaining);
    
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const tick = () => {
            const now = performance.now();
            const elapsedTime = Math.floor((now - startTimeRef.current) / 1000);
            const newTimeRemaining = Math.max(startTimeRemaining - elapsedTime, 0);
            timeRemainingRef.current = newTimeRemaining;

            setTimeRemaining(newTimeRemaining);

            if (newTimeRemaining <= 0) {
                routeTo(Routes.Results);
            } else {
                requestAnimationFrame(tick);
            }
        };

        startTimeRef.current = performance.now();
        requestAnimationFrame(tick);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [routeTo]);

    useEffect(() => {
        if (madMinute.questions.length > 0) {
            setCurrentQuestion(madMinute.questions.at(-1));
        } else {
            addQuestion();
        }
    }, [madMinute.questions.length])

    const submitQuestion = () => {
        if (currentQuestion) {
            submitResponse(response, currentQuestion.id);
            setResponse('');
        } else {
            addQuestion();
        }
    }

    return (
        <>
            {timeRemaining > 60 ?
            <ThemedView style={styles.countdownContainer}>
                <ThemedText type="countdown">{timeRemaining - 60}</ThemedText>
            </ThemedView>
            :
            <KeyboardAvoidingView
                style={styles.screenView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <CustomHeaderView header="Mad Minute" canGoBack={true}>
                    <ThemedView style={styles.timeRemainingContainer}>
                        <ThemedText type="title">Time: {timeRemaining}</ThemedText>
                    </ThemedView>
                    { currentQuestion &&                    
                        <ThemedView style={styles.questionContainer}>
                            <FormattedQuestion question={currentQuestion} />
                            <TextInput
                                style={[styles.input, { color: color, borderColor: color }]}
                                onChangeText={setResponse}
                                value={response}
                                keyboardType="numeric"
                                autoFocus={true}
                            />
                        </ThemedView>
                    }
                    <ThemedView style={styles.buttonsContainer}>
                        <ThemedView style={styles.buttonContainer}>
                            <GeneralButton title="Skip" onPress={submitQuestion} />
                        </ThemedView>
                        <ThemedView style={styles.buttonContainer}>
                            <GeneralButton title="Next" onPress={submitQuestion} />
                        </ThemedView>
                    </ThemedView>
                </CustomHeaderView>
            </KeyboardAvoidingView>
            }
        </>
    )
}

const styles = StyleSheet.create({
    countdownContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    screenView: {
        flex: 1,
    },

    timeRemainingContainer: {
        marginVertical: 20,
        alignItems: 'center'
    },

    timeRemainingText: {
        fontSize: 36
    },

    questionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },

    input: {
        fontSize: 28,
        minWidth: 80,
        borderWidth: 1,
        borderRadius: 3,
        textAlign: 'center'
    },

    buttonsContainer: {
        flex: 1,
        flexDirection: 'row',
        width: '100%'
    },

    buttonContainer: {
        flex: 1,
        alignSelf: 'center'
    },
})