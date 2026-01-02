import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'app-build/material-web.js',
  output: {
    file: 'app/material.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    terser({
      format: {
        comments: false
      }
    })
  ]
};