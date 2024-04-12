import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const config = {
  input: 'lib/material-web.js',
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

export default config;