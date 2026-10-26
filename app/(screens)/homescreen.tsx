import React from "react";
import { Linking, StyleSheet, TouchableOpacity } from "react-native";
import { useRouteTo } from "@/contexts/RouteContext";
import { Routes } from "@/constants/Routes";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { useThemeColor } from "@/hooks/useThemeColor";

const PRIVACY_POLICY_URL = "https://frameonapp.weebly.com/math-mad-minute-privacy-policy.html";

export default function HomeScreen() {
  const { routeTo } = useRouteTo();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  const homeButtons = [
    { title: "Start", route: Routes.CreateMadMinute, variant: 'primary' as const },
    { title: "History", route: Routes.History, variant: 'secondary' as const },
  ]

  return (
    <ThemedView style={styles.homeView}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>
          Mad Minute
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: muted }]}>
          How many can you solve before time runs out?
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.sampleCard, { backgroundColor: surface, borderColor: border }]}>
        <ThemedText style={[styles.sampleText, { color: tint }]}>7 × 8 = ?</ThemedText>
      </ThemedView>

      <ThemedView style={styles.homeButtonView}>
        {homeButtons.map((homeButton) => (
          <GeneralButton
            key={homeButton.title}
            title={homeButton.title}
            onPress={() => routeTo(homeButton.route)}
            autoWidth={false}
            variant={homeButton.variant}
          />
        ))
        }
      </ThemedView>

      <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
        <ThemedText style={[styles.privacyLink, { color: muted }]}>Privacy Policy</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  homeView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  tagline: {
    fontSize: 17,
    textAlign: 'center',
  },

  sampleCard: {
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#1c2a6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },

  sampleText: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
  },

  privacyLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },

  homeButtonView: {
    width: '70%',
    alignItems: 'center',
    gap: 10,
  },
})
