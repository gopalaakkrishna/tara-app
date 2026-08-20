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
// V13.4.217 — dev-only mirror of the vercel.json rewrites.
//
// Those rewrites are applied by Vercel, not by Vite, so under `npm run dev`
// every /api/kalshi/* call fell through to the SPA fallback and came back as
// HTTP 200 with index.html. That is worse than a clean failure: any code that
// trusts the status code sees success and then chokes on HTML. It is why the
// BTC lane reports "all proxies failed" locally and why the weather ladder
// could not be checked without deploying first.
//
// Mirroring the rewrites here makes local dev behave like production. Build
// output is untouched; `server` only exists while the dev server runs.
const kalshiProxy = (target) => ({
  target,
  changeOrigin: true,
  secure: true,
  rewrite: (p) => p.replace(/^\/api\/kalshi(-public)?/, '/trade-api/v2'),
});

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/kalshi-public': kalshiProxy('https://external-api.kalshi.com'),
      '/api/kalshi': kalshiProxy('https://api.elections.kalshi.com'),
      '/api/okx': { target: 'https://www.okx.com', changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/okx/, '/api/v5') },
      '/api/bybit': { target: 'https://api.bybit.com', changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/bybit/, '/v5') },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    minify: false,
  },
});
