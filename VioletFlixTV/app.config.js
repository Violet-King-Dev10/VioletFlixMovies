const { ensureLogo } = require('./scripts/generate-logo');

ensureLogo();

module.exports = ({ config }) => ({
  ...config,
  icon: './assets/generated/violetflixtv-logo.png',
  android: {
    ...config.android,
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      foregroundImage: './assets/generated/violetflixtv-logo.png',
    },
  },
  web: {
    ...config.web,
    favicon: './assets/generated/violetflixtv-logo.png',
  },
  plugins: config.plugins?.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      return [
        plugin[0],
        {
          ...plugin[1],
          image: './assets/generated/violetflixtv-logo.png',
        },
      ];
    }
    return plugin;
  }),
});
