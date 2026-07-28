import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.co.mcateeragricultural.agricore',
  appName: 'AgriCore',
  webDir: 'out',

  server: {
    url: 'http://192.168.1.44:3000',
    cleartext: true,
  },

  android: {
    allowMixedContent: true,
  },
};

export default config;