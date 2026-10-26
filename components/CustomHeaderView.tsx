import React, { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useRouteTo } from "@/contexts/RouteContext";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { Routes } from "@/constants/Routes";


interface CustomHeaderProps {
    header: string;
    children: ReactNode;
    canGoBack?: Boolean;
    goBack?: () => void,
    style?: StyleProp<ViewStyle>;
    goProfile?: Boolean;
}

export function CustomHeaderView({ 
    header, 
    children, 
    canGoBack=false,
    goBack,
    style,
}: CustomHeaderProps) {
    const router = useRouter();
    const handleBackPress = goBack || (() => router.back())

    return (
        <ThemedView style={[styles.screenView, style]}>
            <ThemedView style={styles.headerView}>
                {canGoBack &&
                    <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color={Colors.button.text} />
                        <ThemedText style={styles.backText}>Back</ThemedText>
                    </TouchableOpacity>
                }

                <ThemedText style={[styles.headerText, canGoBack && styles.headerTextWithBack]}>
                    {header}
                </ThemedText>
            </ThemedView>
            <ThemedView style={styles.contentView}>
                {children}
            </ThemedView>
        </ThemedView>
    )
}

const fontSize: number = 20;

const styles = StyleSheet.create({
    screenView: {
        flex: 1,
        flexDirection: 'column'
    },

    headerView: {
        width: '100%',
        height: 64,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },

    backButton: {
        position: 'absolute',
        left: 12,
        top: 14,
        backgroundColor: Colors.button.background,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        width: 'auto',
        height: 36,
        paddingLeft: 8,
        paddingRight: 14,
        borderRadius: 18
    },

    backText: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 2,
        color: Colors.button.text
    },

    headerTextWithBack: {
        marginHorizontal: 80,
    },

    headerText: {
        flex: 1,
        textAlign: "center",
        fontSize: fontSize,
        fontWeight: '700'
    },

    contentView: {
        flex: 1
    }
})