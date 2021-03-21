import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/js/main.js',
  output: {
    file: 'src/js/bundle.js',
    format: 'iife',
  },
  plugins: [
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
    terser(),
  ],
};
