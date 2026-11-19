import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cuuhuyen.game',
  appName: 'Cửu Huyền',
  webDir: process.env.CUU_HUYEN_NATIVE_PLATFORM === 'ios' ? 'dist-ios' : 'dist-android',
  loggingBehavior: 'debug',
  android: {
    backgroundColor: '#071522',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: '#071522',
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    webContentsDebuggingEnabled: false,
  },
};

export default config;
