// Flat ESLint config. Two rules here are load-bearing rather than stylistic:
//
//   1. Nothing under src/providers or src/runner may import a `node:` builtin
//      or touch process.env. Those modules have to run unchanged in a browser
//      for the "run your own benchmark" feature, so the boundary is enforced
//      by lint rather than by good intentions.
//   2. No lint suppressions. If a rule fires, fix the code.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/** Files that must stay runtime-agnostic: no Node builtins, no process.env. */
const RUNTIME_AGNOSTIC = ['src/providers/**/*.ts', 'src/runner/**/*.ts', 'src/schema/**/*.ts']

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'src/site/dist/**',
      'src/site/.astro/**',
      'coverage/**',
      '.rex/**',
      '.hench/**',
      '.sourcevision/**',
      '.claude/**',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },
  {
    files: RUNTIME_AGNOSTIC,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message:
                'Runtime-agnostic code must not import Node builtins. Move filesystem or process work into src/cli.ts or src/data/.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Runtime-agnostic code must not read process.env. Credentials arrive through AdapterContext; the CLI reads the environment.',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Plain-JS build scripts: not covered by the TypeScript program, so the
    // Node and web globals they use have to be declared.
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
  },
)
