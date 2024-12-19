import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

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
                sliderLength={300}
                onValuesChange={handleValuesChange}
                min={0}
                max={20}
                step={1}
                snapped
                selectedStyle={{ backgroundColor: '#007bff' }}
                unselectedStyle={{ backgroundColor: '#ddd' }}
                markerStyle={styles.marker}
            />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    minMaxLabels: {
        flexDirection: 'row',
        width: '100%',
    },

    label: {
        flex: 1,
        fontSize: 16,
        marginBottom: 10,
        fontWeight: 'bold',
        textAlign: 'center'
    },

    marker: {
        backgroundColor: '#007bff',
        height: 25,
        width: 25,
        borderRadius: 12,
    },
});
