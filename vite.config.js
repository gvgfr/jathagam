import { defineConfig } from 'vite';

// GitHub Actions builds into dist/ and publishes it to GitHub Pages.
// A relative base works both at gvgfr.github.io/jathagam/ and on a custom domain.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  test: { include: ['test/**/*.test.js'] },
});
