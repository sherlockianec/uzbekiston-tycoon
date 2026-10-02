import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// VITE_BASE_PATH lets CI set the correct GitHub Pages sub-path
// (e.g. "/your-repo-name/") without editing this file. Locally it
// defaults to "/uzbekiston-tycoon/" — change that default if you
// rename the repo and aren't relying on the CI override.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/uzbekiston-tycoon/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
