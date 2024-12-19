import React from "react";
import { StyleSheet } from "react-native";
import { useRouteTo } from "@/contexts/RouteContext";
import { Routes } from "@/app/(screens)/Routes";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";

export default function HomeScreen() {
  const { routeTo } = useRouteTo();

  const homeButtons = [
    { title: "Start", route: Routes.CreateMadMinute },
  ]

  return (
    <ThemedView style={styles.homeView}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>
          Mad Minute
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.homeButtonView}>
        {homeButtons.map((homeButton) => (
          <GeneralButton 
            key={homeButton.title}
            title={homeButton.title} 
            onPress={() => routeTo(homeButton.route)}
            autoWidth={false}
          />
        ))
        }
      </ThemedView>
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
    justifyContent: 'center',
  },

  homeButtonView: {
    width: '50%',
    alignItems: 'center',
    gap: 10,
  },
})
