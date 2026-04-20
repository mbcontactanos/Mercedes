# Mobile Camera White Screen Fix

Date: 2026-04-20

## Summary

This fix addresses the mobile white-screen issue affecting the camera view after deployment and during PWA usage.

## Root Causes

1. `vite.config.ts` used `manualChunks` as an object. With Bun + Rolldown, production build expects `manualChunks` to be a function.
2. Production build used `minify: "esbuild"` without `esbuild` installed, which broke `bun run build`.
3. `public/sw.js` returned `/` as a fallback for any failed request, including JS and CSS assets. After a deploy or cache mismatch, that could serve HTML where the browser expected JavaScript and leave the app on a white screen.
4. `index.html` referenced `/manifest.json` while the static manifest file is `manifest.webmanifest`.
5. Mobile camera startup relied on a single `getUserMedia` constraint set, which is fragile on Safari/iOS and some Android devices.

## Changes Applied

- Updated `vite.config.ts`:
  - `manualChunks` now uses a function compatible with Bun/Rolldown.
  - `minify` was changed to `false` to keep Bun builds stable without adding `esbuild`.
- Updated `public/sw.js`:
  - bumped cache version to `mercedes-ops-pwa-v3`
  - added navigation-specific fallback behavior
  - stopped returning `index.html` for failed asset requests
  - kept static asset caching isolated to same-origin assets
- Updated `index.html`:
  - manifest now points to `/manifest.webmanifest`
- Updated `src/components/dashboard/MobileOperatorConsole.jsx`:
  - camera open now retries with multiple constraint sets
  - preview video explicitly calls `play()` after attaching the stream
  - stream acquisition now uses video-only fallbacks for broader mobile compatibility

## Validation

- Local production build command:

```bash
bun run build
```

- Result:
  - Build completes successfully.
  - `dist/` assets are generated correctly.

## Deployment Notes

- After this fix, deploy using Vercel preview first.
- Because the service worker cache name changed, clients should fetch the new PWA shell after the new deployment activates.
