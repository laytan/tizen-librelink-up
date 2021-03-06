import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const plugins = [
  nodeResolve({
    browser: true,
  }),
  babel({
    babelHelpers: 'bundled',
    presets: ["@babel/preset-env"],
    plugins: [
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-proposal-private-methods",
      "@babel/plugin-transform-classes"
    ],
  }),
];

if (process.env.NODE_ENV === 'production') {
  plugins.push(terser());
}

export default {
  input: 'src/js/main.js',
  output: {
    file: 'src/js/bundle.js',
    format: 'iife',
  },
  plugins,
};
