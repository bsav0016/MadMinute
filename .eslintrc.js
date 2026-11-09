// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  plugins: ['react-native-a11y'],
  ignorePatterns: ['/dist/*'],
  rules: {
    // Every touchable must say what it is and what it is called, so a screen reader can use it.
    'react-native-a11y/has-valid-accessibility-descriptors': 'error',
    'react-native-a11y/has-valid-accessibility-role': 'error',
    'react-native-a11y/has-valid-accessibility-state': 'error',
    'react-native-a11y/has-valid-accessibility-actions': 'error',
    'react-native-a11y/has-valid-accessibility-value': 'error',
    'react-native-a11y/no-nested-touchables': 'error',
  },
};
