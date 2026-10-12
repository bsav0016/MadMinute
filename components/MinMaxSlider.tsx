import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';

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

    const { width } = useWindowDimensions();
    const sliderLength = Math.min(300, width - 100);

    return (
        <ThemedView style={styles.container}>
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
                min={0}
                max={20}
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
