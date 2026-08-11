module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }], // WatermelonDB decorators
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      // Reanimated plugin MUST be listed last
      // It transforms worklet functions to run on the UI thread
      'react-native-reanimated/plugin',
    ],
  };
};
