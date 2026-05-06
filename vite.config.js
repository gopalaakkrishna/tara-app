import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// V8.8.4 — minification disabled to eliminate any minifier-induced TDZ.
// The deployed V8.8.2 bundle was crashing with `Cannot access 'ee' before
// initialization`. Static analysis on the source was clean (no forward refs
// in any let/const). The crash only fires in real browsers with real state,
// suggesting the issue is either (a) a minifier name-reuse edge case where
// esbuild collapses scopes incorrectly, or (b) a runtime path triggered by
// stored localStorage data that no static analysis can see.
//
// Killing minification eliminates (a) entirely and gives us readable variable
// names if (b) ever fires — turning "Cannot access 'ee'" into "Cannot access
// '<actualVariableName>'", which lets us fix the real bug in seconds.
//
// Cost: bundle goes from ~1.5MB minified to ~2.5MB unminified, gzip stays
// around 520KB. Negligible for a single-user dashboard. Source maps still
// shipped for stack-frame mapping in DevTools.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
    minify: false,
  },
});
