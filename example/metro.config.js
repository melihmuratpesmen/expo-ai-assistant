const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [libraryRoot];

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

config.resolver.blockList = [
  new RegExp(
    `${path.resolve(libraryRoot, 'node_modules').replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`
  ),
];

config.resolver.extraNodeModules = {
  'expo-ai-assistant': libraryRoot,
};

// Resolve the library's TypeScript source (package.json "exports" condition)
// so the demo does not need a `bob build` after every change.
config.resolver.unstable_conditionNames = [
  'expo-ai-assistant-source',
  ...(config.resolver.unstable_conditionNames ?? []),
];

module.exports = config;
