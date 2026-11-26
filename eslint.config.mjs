import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'frontend/out/**',
      'frontend/.next/**',
      'frontend/next-env.d.ts',
      'data/**',
      'frontend/public/data/**',
      'node_modules/**',
    ],
  },
  ...tseslint.configs.strict,
  ...nextVitals.map((c) => ({ ...c, files: ['frontend/**/*.{ts,tsx,js,jsx}'] })),
  {
    settings: { next: { rootDir: 'frontend' } },
  },
  prettier,
];
