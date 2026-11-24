// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/**'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/supabase/functions/**', '!**/supabase/functions/_shared/domain/**'], message: 'App code may only import isomorphic code via @shared/* (supabase/functions/_shared/domain).' }],
      }],
    },
  },
]);
