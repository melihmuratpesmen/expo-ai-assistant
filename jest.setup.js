// Icon fonts need native modules; render icons as inert views in tests.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = ({ name, ...rest }) =>
    React.createElement(View, { ...rest, testID: rest.testID ?? `icon-${name}` });
  Icon.glyphMap = {};
  return { Ionicons: Icon };
});

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest')
);
