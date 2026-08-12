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

module.exports = config;
