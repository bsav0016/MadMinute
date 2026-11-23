import React, { useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouteTo } from "@/contexts/RouteContext";
import { Routes } from "@/constants/Routes";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { PracticeCard } from "@/components/PracticeCard";
import { ProfileSheet } from "@/components/ProfileSheet";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { avatarInfo, profileLabel } from "@/storage/profiles";
import { nextPractice } from "@/contexts/MadMinuteContext/practice";
import { hasPlayed, practiceHint } from "@/contexts/MadMinuteContext/practiceText";

const PRIVACY_POLICY_URL = "https://bsav0016.github.io/MadMinute/privacy";

export default function HomeScreen() {
  const { routeTo } = useRouteTo();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const { profiles, activeProfile, practice, facts, madMinute, startPractice } = useMadMinute();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Someone playing alone sees no extra controls beyond a small link to add a second player.
  const shared = profiles.length > 1;

  // "Today's practice" is offered once the player has finished a round, like the goal card, so a new install looks as ever.
  const todaysPractice = hasPlayed(practice) ? nextPractice(facts, madMinute.settings) : null;
  const playToday = () => {
    startPractice();
    routeTo(Routes.PlayMadMinute);
  };

  const homeButtons = [
    { title: "Start", route: Routes.CreateMadMinute, variant: 'primary' as const },
    { title: "History", route: Routes.History, variant: 'secondary' as const },
  ]

  return (
    <ThemedView style={styles.homeView}>
      {shared && (
        <TouchableOpacity
          style={[styles.chip, { backgroundColor: surface, borderColor: border }]}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Playing as ${profileLabel(activeProfile)}. Change player`}
        >
          <Text style={styles.chipEmoji}>{avatarInfo(activeProfile.avatar).emoji}</Text>
          <ThemedText type="defaultSemiBold">{profileLabel(activeProfile)}</ThemedText>
        </TouchableOpacity>
      )}

      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title' accessibilityRole="header">
          Mad Minute
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: muted }]}>
          How many can you solve before time runs out?
        </ThemedText>
      </ThemedView>

      <ThemedView
        style={[styles.sampleCard, { backgroundColor: surface, borderColor: border }]}
        accessible
        accessibilityLabel="Example question: 7 times 8"
      >
        <ThemedText style={[styles.sampleText, { color: tint }]}>7 × 8 = ?</ThemedText>
      </ThemedView>

      <PracticeCard />

      <ThemedView style={styles.homeButtonView}>
        {todaysPractice && (
          <>
            <GeneralButton title="Today's practice" onPress={playToday} autoWidth={false} variant="primary" />
            <ThemedText style={[styles.hint, { color: muted }]}>{practiceHint(todaysPractice)}</ThemedText>
          </>
        )}
        {homeButtons.map((homeButton) => (
          <GeneralButton
            key={homeButton.title}
            title={homeButton.title}
            onPress={() => routeTo(homeButton.route)}
            autoWidth={false}
            variant={todaysPractice && homeButton.title === "Start" ? 'secondary' : homeButton.variant}
          />
        ))
        }
      </ThemedView>

      {!shared && (
        <TouchableOpacity onPress={() => setSheetOpen(true)} accessibilityRole="button" accessibilityLabel="Add another player">
          <ThemedText style={[styles.privacyLink, { color: muted }]}>Add another player</ThemedText>
        </TouchableOpacity>
      )}

      <ProfileSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />

      <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})} accessibilityRole="link" accessibilityLabel="Privacy Policy">
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

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
  },

  chipEmoji: {
    fontSize: 22,
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

  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
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
