import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { RouteProvider } from '@/contexts/RouteContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Routes } from './Routes';
import { ThemedView } from '@/components/ThemedView';
import { ToastProvider } from '@/contexts/ToastContext';
import { MadMinuteProvider } from '@/contexts/MadMinuteContext/MadMinuteContext';

export default function PagesLayout() {
  return (
    <ToastProvider>
      <LoadingProvider>
        <RouteProvider>
          <MadMinuteProvider>
            <ThemedView style={styles.fullScreenArea}>
              <SafeAreaView style={styles.safeArea}>
                <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
                  <Stack.Screen name={Routes.HomeScreen} options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name={Routes.CreateMadMinute} options={{ headerShown: false }} />
                  <Stack.Screen name={Routes.PlayMadMinute} options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name={Routes.Results} options={{ headerShown: false, gestureEnabled: false }} />
                </Stack>
              </SafeAreaView>
            </ThemedView>
          </MadMinuteProvider>
        </RouteProvider>
      </LoadingProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  fullScreenArea: {
    flex: 1
  },
  
  safeArea: {
      flex: 1
  },
});