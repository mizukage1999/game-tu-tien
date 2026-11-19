import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cuuhuyen.game',
  appName: 'Cửu Huyền',
  webDir: 'dist-android',
  loggingBehavior: 'debug',
  android: {
    backgroundColor: '#071522',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
