import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2020',
  clean: true,
  external: [
    'react-native',
    'react-native-fs',
    'react-native-restart',
    '@react-native-async-storage/async-storage',
    'react-native-device-info',
    'react-native-zip-archive',
  ],
});
