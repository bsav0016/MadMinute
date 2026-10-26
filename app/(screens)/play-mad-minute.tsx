import { CustomHeaderView } from "@/components/CustomHeaderView";
import { ThemedView } from "@/components/ThemedView";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { useRouteTo } from "@/contexts/RouteContext";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Routes } from "@/constants/Routes";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { FormattedQuestion } from "@/components/FormattedQuestion";
import { MadMinuteQuestion } from "@/contexts/MadMinuteContext/MadMinuteQuestion";
import { useThemeColor } from "@/hooks/useThemeColor";
import { NumberPad } from "@/components/NumberPad";
import { Colors } from "@/constants/Colors";

export default function PlayMadMinute() {
    const { madMinute, addQuestion, submitResponse } = useMadMinute();
    const { routeTo } = useRouteTo();
    const color = useThemeColor({}, 'text');
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const tint = useThemeColor({}, 'tint');

    const countdownSeconds = 3
    const roundSeconds = madMinute.settings.durationSeconds
    const startTimeRemaining: number = roundSeconds + countdownSeconds
    const maxAnswerLength = 6
    const lowTimeSeconds = 10

    const [timeRemaining, setTimeRemaining] = useState<number>(startTimeRemaining);
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

    // The question on screen is always the newest one.
    const currentQuestion: MadMinuteQuestion | undefined = madMinute.questions.at(-1);

    useEffect(() => {
        if (madMinute.questions.length === 0) {
            addQuestion();
        }
    }, [madMinute.questions.length])

    const submitQuestion = (answer: string) => {
        if (currentQuestion) {
            submitResponse(answer, currentQuestion.id);
            setResponse('');
        } else {
            addQuestion();
        }
    }

    const addDigit = (digit: string) => {
        setResponse((current) => current.length >= maxAnswerLength ? current : current + digit);
    }

    const lowOnTime = timeRemaining <= lowTimeSeconds;
    const timerColor = lowOnTime ? Colors.results.incorrectStrong : tint;

    return (
        <>
            {timeRemaining > roundSeconds ?
            <ThemedView style={styles.countdownContainer}>
                <ThemedText type="countdown">{timeRemaining - roundSeconds}</ThemedText>
            </ThemedView>
            :
            <View style={styles.screenView}>
                <CustomHeaderView header="Mad Minute" canGoBack={true}>
                    <ThemedView style={styles.timeRemainingContainer}>
                        <ThemedView style={[styles.timePill, { backgroundColor: surface, borderColor: border }]}>
                            <ThemedText style={[styles.timeText, { backgroundColor: 'transparent', color: lowOnTime ? timerColor : color }]}>Time: {timeRemaining}</ThemedText>
                        </ThemedView>
                        <View style={[styles.timeTrack, { backgroundColor: border }]}>
                            <View style={[styles.timeFill, { backgroundColor: timerColor, width: `${Math.min(timeRemaining / roundSeconds, 1) * 100}%` }]} />
                        </View>
                    </ThemedView>
                    { currentQuestion &&
                        <ThemedView style={styles.questionContainer}>
                            <ThemedView style={[styles.questionCard, { backgroundColor: surface, borderColor: border }]}>
                                <FormattedQuestion question={currentQuestion} />
                            </ThemedView>
                            <View style={[styles.input, { borderColor: tint, backgroundColor: surface }]}>
                                <Text style={[styles.inputText, { color: color }]}>{response}</Text>
                            </View>
                        </ThemedView>
                    }
                    <ThemedView style={styles.buttonsContainer}>
                        <ThemedView style={styles.buttonContainer}>
                            <GeneralButton title="Skip" onPress={() => submitQuestion('')} variant="secondary" />
                        </ThemedView>
                        <ThemedView style={styles.buttonContainer}>
                            <GeneralButton title="Next" onPress={() => submitQuestion(response)} disabled={response === ''} />
                        </ThemedView>
                    </ThemedView>
                    <NumberPad
                        onDigit={addDigit}
                        onBackspace={() => setResponse((current) => current.slice(0, -1))}
                        onClear={() => setResponse('')}
                    />
                </CustomHeaderView>
            </View>
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
        marginTop: 8,
        marginBottom: 4,
        alignItems: 'center',
        gap: 10,
    },

    timeTrack: {
        width: '80%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },

    timeFill: {
        height: '100%',
        borderRadius: 3,
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
        alignItems: 'center',
        justifyContent: 'center',
    },

    inputText: {
        fontSize: 32,
    },

    buttonsContainer: {
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 12,
        paddingBottom: 8,
        gap: 8,
    },

    buttonContainer: {
        flex: 1,
        alignSelf: 'center'
    },
})