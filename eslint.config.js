import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared base config. Each app extends this in its own eslint.config.js
 * so environment-specific rules (browser vs node) stay local.
 */
export const baseConfig = tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
);

export default baseConfig;
