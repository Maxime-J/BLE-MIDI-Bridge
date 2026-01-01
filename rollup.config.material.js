import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'build-src/material-web.js',
  output: {
    file: 'app/material.js'
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