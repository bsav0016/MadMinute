/**
 * Colors used in the app, defined for light and dark mode.
 */

const tintColorLight = '#4263eb';
const tintColorDark = '#748ffc';

export const Colors = {
  light: {
    text: '#111827',
    background: '#f5f7fb',
    surface: '#ffffff',
    border: '#e3e7ef',
    muted: '#6b7280',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#f3f4f6',
    background: '#0f1115',
    surface: '#1a1d24',
    border: '#2a2f3a',
    muted: '#9ca3af',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  button: {
    text: 'white',
    background: '#4263eb',
    disabled: '#c5cad6',
  },
  results: {
    correct: '#8fd694',
    incorrect: '#f2a1a1',
    skipped: '#efe3a8'
  }
};
