import terser from '@rollup/plugin-terser';

export default {
  input: 'app-build/bridge/bridge.js',
  output: {
    file: 'app/bridge.js',
    format: 'iife',
    name: 'bridge'
  },
  plugins: [
    terser({ compress: false })
  ]
};