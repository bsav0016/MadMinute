import { CustomHeaderView } from "@/components/CustomHeaderView";
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity } from "react-native";
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
import { DURATION_OPTIONS_SECONDS, matchesPreset, Preset, PRESETS } from "@/contexts/MadMinuteContext/presets";

export default function CreateMadMinute() {
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const muted = useThemeColor({}, 'muted');
    const text = useThemeColor({}, 'text');
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
                localSettings.availableOperators,
                localSettings.durationSeconds
            );
        } else {
            newLocalSettings = new MadMinuteSettings(
                localSettings.minValue,
                value,
                localSettings.availableOperators,
                localSettings.durationSeconds
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

    const applyPreset = (preset: Preset) => {
        setLocalSettings(new MadMinuteSettings(
            preset.minValue,
            preset.maxValue,
            preset.availableOperators,
            localSettings.durationSeconds
        ));
    }

    const setDuration = (durationSeconds: number) => {
        setLocalSettings(new MadMinuteSettings(
            localSettings.minValue,
            localSettings.maxValue,
            localSettings.availableOperators,
            durationSeconds
        ));
    }

    const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
        <TouchableOpacity
            style={[
                styles.chip,
                selected
                    ? { backgroundColor: Colors.button.background, borderColor: Colors.button.background }
                    : { backgroundColor: surface, borderColor: border },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.chipText, { color: selected ? Colors.button.text : text }]}>{label}</Text>
        </TouchableOpacity>
    );

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
        <CustomHeaderView header={"Settings"} canGoBack={true}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <ThemedView style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                    <ThemedText style={[styles.cardTitle, { color: muted }]}>Quick start</ThemedText>
                    <ThemedView style={styles.chipRow}>
                        {PRESETS.map((preset) => (
                            <Chip
                                key={preset.label}
                                label={preset.label}
                                selected={matchesPreset(preset, localSettings)}
                                onPress={() => applyPreset(preset)}
                            />
                        ))}
                    </ThemedView>
                </ThemedView>
                <ThemedView style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                    <ThemedText style={[styles.cardTitle, { color: muted }]}>Number range</ThemedText>
                    <MinMaxSlider
                        min={localSettings.minValue}
                        max={localSettings.maxValue}
                        setMinMax={setMinMax}
                    />
                </ThemedView>
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
                <ThemedView style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                    <ThemedText style={[styles.cardTitle, { color: muted }]}>Round length</ThemedText>
                    <ThemedView style={styles.chipRow}>
                        {DURATION_OPTIONS_SECONDS.map((seconds) => (
                            <Chip
                                key={seconds}
                                label={`${seconds} sec`}
                                selected={localSettings.durationSeconds === seconds}
                                onPress={() => setDuration(seconds)}
                            />
                        ))}
                    </ThemedView>
                </ThemedView>
            </ScrollView>
            <ThemedView style={styles.startButtonContainer}>
                <GeneralButton title="Start Mad Minute" onPress={startMadMinute} />
            </ThemedView>
        </CustomHeaderView>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 14,
    },

    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        backgroundColor: 'transparent',
        paddingTop: 4,
    },

    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1.5,
    },

    chipText: {
        fontSize: 15,
        fontWeight: '600',
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