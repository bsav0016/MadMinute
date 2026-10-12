import { CustomHeaderView } from "@/components/CustomHeaderView";
import React, { useState, useEffect } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TouchableWithoutFeedback, Switch } from "react-native";
import { MinMaxSlider } from "@/components/MinMaxSlider";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { MadMinuteSettings } from "@/contexts/MadMinuteContext/MadMinuteSettings";
import { MadMinuteOperator } from "@/contexts/MadMinuteContext/MadMinuteOperator";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouteTo } from "@/contexts/RouteContext";
import { GeneralButton } from "@/components/GeneralButton";
import { Routes } from "./Routes";
import { useToast } from "@/contexts/ToastContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Colors } from "@/constants/Colors";

export default function CreateMadMinute() {
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');
    const { madMinute, updateSettings, resetMadMinute } = useMadMinute();
    const { routeTo } = useRouteTo();
    const { addToast } = useToast();
    const [localSettings, setLocalSettings] = useState<MadMinuteSettings>(madMinute.settings);

    useEffect(() => {
        updateSettings(localSettings);
    }, [localSettings])

    const setMinMax = (value: number, isMin: boolean) => {
        let newLocalSettings: MadMinuteSettings;
        if (isMin) {
            newLocalSettings = new MadMinuteSettings(
                value,
                localSettings.maxValue,
                localSettings.availableOperators
            );
        } else {
            newLocalSettings = new MadMinuteSettings(
                localSettings.minValue,
                value,
                localSettings.availableOperators
            );
        }
        setLocalSettings(newLocalSettings);
    }

    const toggleOperator = (operator: MadMinuteOperator) => {
        if (localSettings.availableOperators.includes(operator)) {
            setLocalSettings({
                ...localSettings,
                availableOperators: localSettings.availableOperators.filter(op => op !== operator),
            })
        }
        else {
            setLocalSettings({
                ...localSettings,
                availableOperators: [...localSettings.availableOperators, operator],
            })
        }
    }

    const startMadMinute = () => {
        if (localSettings.availableOperators.length === 0) {
            addToast('At least one operator must be selected!')
        } else {
            resetMadMinute();
            routeTo(Routes.PlayMadMinute)
        }
    }

    const displayOperators = [
        { text: 'Addition', value: MadMinuteOperator.Addition },
        { text: 'Subtraction', value: MadMinuteOperator.Subtraction },
        { text: 'Multiplication', value: MadMinuteOperator.Multiplication },
        { text: 'Division', value: MadMinuteOperator.Division }
    ]

    return (
        <CustomHeaderView header={"Mad Minute Settings"} canGoBack={true}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <>
                    <KeyboardAvoidingView
                        style={styles.sliderContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <ThemedView style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                            <ThemedText style={[styles.cardTitle, { color: muted }]}>Number range</ThemedText>
                            <MinMaxSlider
                                min={localSettings.minValue}
                                max={localSettings.maxValue}
                                setMinMax={setMinMax}
                            />
                        </ThemedView>
                    </KeyboardAvoidingView>
                    <ThemedView style={styles.buttonsContainer}>
                        <ThemedView style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                            <ThemedText style={[styles.cardTitle, { color: muted }]}>Operations</ThemedText>
                            { displayOperators.map((displayOperator, index) => (
                                <ThemedView
                                    style={[
                                        styles.buttonContainer,
                                        { backgroundColor: surface },
                                        index > 0 && { borderTopWidth: 1, borderTopColor: border },
                                    ]}
                                    key={displayOperator.value}
                                >
                                    <ThemedText style={[styles.operatorLabel, { backgroundColor: 'transparent' }]}>{displayOperator.text}</ThemedText>
                                    <Switch
                                        value={localSettings.availableOperators.includes(displayOperator.value)}
                                        onValueChange={() => toggleOperator(displayOperator.value)}
                                        thumbColor={localSettings.availableOperators.includes(displayOperator.value) ? Colors.button.background : '#ccc'}
                                        trackColor={{ false: '#ddd', true: '#b9c4f7' }}
                                    />
                                </ThemedView>
                            ))}
                        </ThemedView>
                    </ThemedView>
                    <ThemedView style={styles.startButtonContainer}>
                        <GeneralButton title="Start Mad Minute" onPress={startMadMinute} />
                    </ThemedView>
                </>
            </TouchableWithoutFeedback>
        </CustomHeaderView>
    )
}

const styles = StyleSheet.create({
    sliderContainer: {
        flex: 2,
        justifyContent: 'flex-end',
        paddingHorizontal: 16
    },

    buttonsContainer: {
        flex: 3,
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        marginTop: 16,
    },

    card: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: '#1c2a6b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },

    cardTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 4,
    },

    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },

    operatorLabel: {
        fontSize: 18,
    },

    startButtonContainer: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        marginBottom: 16
    }
})