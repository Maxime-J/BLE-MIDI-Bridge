import terser from '@rollup/plugin-terser';

export default {
  input: 'build-src/bridge/bridge.js',
  output: {
    file: 'app/bridge.js',
    format: 'iife',
    name: 'bridge'
  },
  plugins: [
    terser({ compress: false })
  ]
};