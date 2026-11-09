import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';

const MIN = 0;
const MAX = 20;
const ACTIONS = [
    { name: 'minUp', label: 'Raise the smallest number' },
    { name: 'minDown', label: 'Lower the smallest number' },
    { name: 'maxUp', label: 'Raise the largest number' },
    { name: 'maxDown', label: 'Lower the largest number' },
];

interface MinMaxSliderProps {
    min: number;
    max: number;
    setMinMax: (value: number, isMin: boolean) => void;
}

export const MinMaxSlider: React.FC<MinMaxSliderProps> = ({
    min,
    max,
    setMinMax
}) => {
    const handleValuesChange = (values: number[]) => {
        let [newMin, newMax] = values;

        if (newMin >= newMax) {
            newMin = newMax - 1;
        } else if (newMax <= newMin) {
            newMax = newMin + 1;
        }

        if (newMin !== min) {
            setMinMax(newMin, true);
        }
        else if (newMax !== max) {
            setMinMax(newMax, false);
        }
    };

    // A slider cannot be dragged with a screen reader, so each end is also moved by named actions.
    const onAction = (event: { nativeEvent: { actionName: string } }) => {
        switch (event.nativeEvent.actionName) {
            case 'minUp': if (min + 1 < max) setMinMax(min + 1, true); break;
            case 'minDown': if (min > MIN) setMinMax(min - 1, true); break;
            case 'maxUp': if (max < MAX) setMinMax(max + 1, false); break;
            case 'maxDown': if (max - 1 > min) setMinMax(max - 1, false); break;
        }
    };

    const { width } = useWindowDimensions();
    const sliderLength = Math.min(300, width - 100);

    return (
        <ThemedView
            style={styles.container}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Number range"
            accessibilityValue={{ text: `from ${min} to ${max}` }}
            accessibilityActions={ACTIONS}
            onAccessibilityAction={onAction}
        >
            <ThemedView style={styles.minMaxLabels}>
                <ThemedText style={styles.label}>
                    Min Value: {min}
                </ThemedText>
                <ThemedText style={styles.label}>
                    Max Value: {max}
                </ThemedText>
            </ThemedView>
            <MultiSlider
                values={[min, max]}
                sliderLength={sliderLength}
                onValuesChange={handleValuesChange}
                min={MIN}
                max={MAX}
                step={1}
                snapped
                selectedStyle={{ backgroundColor: Colors.button.background }}
                unselectedStyle={{ backgroundColor: '#d9deea' }}
                markerStyle={styles.marker}
            />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },

    minMaxLabels: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: 'transparent',
    },

    label: {
        flex: 1,
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '700',
        textAlign: 'center',
        backgroundColor: 'transparent',
    },

    marker: {
        backgroundColor: Colors.button.background,
        height: 28,
        width: 28,
        borderRadius: 14,
    },
});
