import terser from '@rollup/plugin-terser';

const config = {
  input: 'parser/parser.js',
  output: {
    file: 'app/parser.js',
    format: 'umd',
    name: 'Parser'
  },
  plugins: [
    terser()
  ]
};

export default config;