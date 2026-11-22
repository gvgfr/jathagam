import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

let version = 'dev';
try {
  version = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a git checkout */
}

// GitHub Actions builds into dist/ and publishes it to GitHub Pages.
// A relative base works both at gvgfr.github.io/jathagam/ and on a custom domain.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  test: { include: ['test/**/*.test.js'] },
});
