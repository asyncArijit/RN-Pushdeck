# rn-pushdeck

> Self-hosted over-the-air (OTA) JavaScript updates for React Native — an open-source replacement for Microsoft CodePush (retired March 2025).

[![SDK on npm](https://img.shields.io/npm/v/@asyncarijit/rn-pushdeck.svg?label=%40asyncarijit%2Frn-pushdeck)](https://www.npmjs.com/package/@asyncarijit/rn-pushdeck)
[![CLI on npm](https://img.shields.io/npm/v/@asyncarijit/pushdeck-cli.svg?label=%40asyncarijit%2Fpushdeck-cli)](https://www.npmjs.com/package/@asyncarijit/pushdeck-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Dashboard:** https://rn-pushdeck.vercel.app · **API:** https://rn-pushdeck-api.asyncarijit.workers.dev

---

## What it does

Most React Native code lives in a JavaScript bundle. With the right native override, that bundle can be swapped at runtime — no app store submission, no review, no waiting.

`rn-pushdeck` provides the full infrastructure for that:

- **Backend API** — stores project metadata and serves update manifests
- **R2-backed CDN** — hosts JS bundles globally with free egress
- **Dashboard** — manage projects, channels, bundles, and deployment history
- **CLI** — upload bundles and promote them between channels from your terminal
- **Mobile SDK** — checks, downloads, and applies updates on device

```bash
# One-time setup:
npm install @asyncarijit/rn-pushdeck        # SDK
# + 8 lines of Kotlin in MainApplication.kt
# + configure({ projectKey }) in App.tsx
# + ship the APK once

# Every release after that:
pushdeck deploy --version 1.0.5 --bundle ./bundle.js --promote production
```

Within seconds, every user on that channel gets the new code.

---

## Architecture

```
                   Internet
                      ↓
        Dashboard (Next.js 16 + Tailwind + shadcn/ui + Clerk)
                      ↓
        API (Cloudflare Workers — Hono + Drizzle)
                      ↓
         ┌────────────┼────────────┐
         ↓            ↓            ↓
   Neon Postgres   R2 Storage    Clerk Auth
   (metadata)    (bundle CDN)    (managed)
                      ↓
              React Native app
        (@asyncarijit/rn-pushdeck SDK)
```

---

## Repository structure

```
rn-pushdeck/
├── backend/      # Hono API on Cloudflare Workers (22 REST endpoints)
├── frontend/     # Next.js 16 dashboard
├── cli/          # `pushdeck` CLI (Node, tsup-bundled)
├── sdk/          # React Native SDK (@asyncarijit/rn-pushdeck)
└── examples/     # Demo app wired up end-to-end
```

Each package has its own README with setup instructions.

---

## Quick start

1. Sign up at https://rn-pushdeck.vercel.app
2. Create a project — copy the `psh_xxx` project key
3. Generate an API token in **Settings → API tokens**
4. In your React Native app:
   ```bash
   npm install @asyncarijit/rn-pushdeck \
     react-native-fs react-native-restart \
     @react-native-async-storage/async-storage \
     react-native-device-info
   ```
5. Add the `getJSBundleFile()` override to `MainApplication.kt` — see [`sdk/INSTALL_ANDROID.md`](./sdk/INSTALL_ANDROID.md)
6. In `App.tsx`:
   ```ts
   import { configure, checkForUpdate } from '@asyncarijit/rn-pushdeck';

   configure({ projectKey: 'psh_xxx' });

   useEffect(() => { checkForUpdate(); }, []);
   ```
7. Build and ship your APK once
8. Deploy updates from your terminal:
   ```bash
   pushdeck login --token pdkt_xxx
   pushdeck deploy --project psh_xxx --version 1.0.1 --bundle ./bundle.js --promote production
   ```

---

## Tech stack

| Layer | Choice | Why |
|--|--|--|
| Backend framework | Hono | Web-standards-compatible, runs on Cloudflare Workers |
| Backend runtime | Cloudflare Workers | Edge-deployed, generous free tier, fast cold starts |
| Database | Neon Postgres | HTTP driver works from Workers |
| ORM | Drizzle | Small bundle, TypeScript-native, edge-compatible |
| Storage | Cloudflare R2 | S3-compatible with free egress |
| Auth | Clerk (web) + hashed personal access tokens (CLI) | Managed auth for users, token auth for machines |
| Frontend | Next.js 16 + Tailwind v4 + shadcn/ui | — |
| Validation | Zod | Runtime validation + static types from one schema |
| CLI bundler | tsup | esbuild-based, ESM output |

---

## Status & roadmap

| Component | Status |
|--|--|
| Backend API | ✅ 22 endpoints live in production |
| Dashboard | ✅ Live |
| CLI | ✅ [`@asyncarijit/pushdeck-cli`](https://www.npmjs.com/package/@asyncarijit/pushdeck-cli) on npm |
| Android SDK | ✅ [`@asyncarijit/rn-pushdeck`](https://www.npmjs.com/package/@asyncarijit/rn-pushdeck) on npm |
| iOS SDK support | ⏳ Planned |
| Expo config plugin | ⏳ Planned |

---

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss the approach.

## License

[MIT](./LICENSE)
