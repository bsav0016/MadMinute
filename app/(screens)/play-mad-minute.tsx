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
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const tint = useThemeColor({}, 'tint');

    const startTimeRemaining: number = 63

    const [timeRemaining, setTimeRemaining] = useState<number>(startTimeRemaining);
    const [currentQuestion, setCurrentQuestion] = useState<MadMinuteQuestion | undefined>(undefined);
    const [response, setResponse] = useState<string>('');

    const startTimeRef = useRef(0);
    const timeRemainingRef = useRef(timeRemaining);
    
    useEffect(() => {
        let frameId = 0;

        const tick = () => {
            const now = performance.now();
            const elapsedTime = Math.floor((now - startTimeRef.current) / 1000);
            const newTimeRemaining = Math.max(startTimeRemaining - elapsedTime, 0);
            timeRemainingRef.current = newTimeRemaining;

            setTimeRemaining(newTimeRemaining);

            if (newTimeRemaining <= 0) {
                routeTo(Routes.Results);
            } else {
                frameId = requestAnimationFrame(tick);
            }
        };

        startTimeRef.current = performance.now();
        frameId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frameId);
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
                        <ThemedView style={[styles.timePill, { backgroundColor: surface, borderColor: border }]}>
                            <ThemedText style={[styles.timeText, { backgroundColor: 'transparent' }]}>Time: {timeRemaining}</ThemedText>
                        </ThemedView>
                    </ThemedView>
                    { currentQuestion &&
                        <ThemedView style={styles.questionContainer}>
                            <ThemedView style={[styles.questionCard, { backgroundColor: surface, borderColor: border }]}>
                                <FormattedQuestion question={currentQuestion} />
                            </ThemedView>
                            <TextInput
                                style={[styles.input, { color: color, borderColor: tint, backgroundColor: surface }]}
                                onChangeText={setResponse}
                                value={response}
                                keyboardType="numeric"
                                autoFocus={true}
                            />
                        </ThemedView>
                    }
                    <ThemedView style={styles.buttonsContainer}>
                        <ThemedView style={styles.buttonContainer}>
                            <GeneralButton title="Skip" onPress={submitQuestion} variant="secondary" />
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
        marginVertical: 16,
        alignItems: 'center'
    },

    timePill: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 1,
    },

    timeText: {
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '800',
    },

    questionContainer: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14
    },

    questionCard: {
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: '#1c2a6b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 3,
    },

    input: {
        fontSize: 32,
        minWidth: 160,
        height: 58,
        borderWidth: 2,
        borderRadius: 16,
        textAlign: 'center'
    },

    buttonsContainer: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 12,
        gap: 8,
    },

    buttonContainer: {
        flex: 1,
        alignSelf: 'center'
    },
})