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

export default function CreateMadMinute() {
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
                        <MinMaxSlider 
                            min={localSettings.minValue} 
                            max={localSettings.maxValue}
                            setMinMax={setMinMax}
                        />
                    </KeyboardAvoidingView>
                    <ThemedView style={styles.buttonsContainer}>
                        { displayOperators.map((displayOperator) => (
                            <ThemedView style={styles.buttonContainer} key={displayOperator.value}>
                                <ThemedText>{displayOperator.text}: </ThemedText>
                                <Switch
                                    value={localSettings.availableOperators.includes(displayOperator.value)}
                                    onValueChange={() => toggleOperator(displayOperator.value)}
                                    thumbColor={localSettings.availableOperators.includes(displayOperator.value) ? '#007bff' : '#ccc'}
                                    trackColor={{ false: '#ddd', true: '#007bff' }}
                                />
                            </ThemedView>
                        ))}
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
        justifyContent: 'flex-end'
    },

    buttonsContainer: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10
    },

    buttonContainer: {
        flexDirection: 'row'
    },

    startButtonContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 10
    }
})