import { createRequire } from 'node:module';
import { createConfig } from '../shared.ts';

const require = createRequire(import.meta.url);

export default createConfig('app', {
  resolve: {
    // Resolve from the private preview workspace so imports in compiled packages use the adapter.
    alias: [
      { find: /^react-native$/, replacement: require.resolve('react-native-web/dist/index.js') },
    ],
    dedupe: ['react', 'react-dom'],
  },
});
