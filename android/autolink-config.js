const path = require('path');

const origLog = console.log;
console.log = (msg) => {
  try {
    const parsed = JSON.parse(msg);
    if (parsed && parsed.dependencies) {
      delete parsed.dependencies.expo;
      delete parsed.dependencies['react-native-safe-area-context'];
      delete parsed.dependencies['react-native-svg'];
    }
    origLog(JSON.stringify(parsed));
  } catch {
    origLog(msg);
  }
};

const autolinking = require(
  require.resolve('expo-modules-autolinking', {
    paths: [require.resolve('expo/package.json', { paths: [path.resolve(__dirname, '..')] })],
  })
);

autolinking(['react-native-config', '--json', '--platform', 'android', '--project-root', path.resolve(__dirname, '..')]);
