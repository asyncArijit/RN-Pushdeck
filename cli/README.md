# @asyncarijit/pushdeck-cli

[![npm](https://img.shields.io/npm/v/@asyncarijit/pushdeck-cli.svg)](https://www.npmjs.com/package/@asyncarijit/pushdeck-cli)
[![license](https://img.shields.io/npm/l/@asyncarijit/pushdeck-cli.svg)](./LICENSE)

CLI for [rn-pushdeck](https://rn-pushdeck.vercel.app) — ship JavaScript updates to React Native apps without going through the Play Store.

## Install

```bash
npm install -g @asyncarijit/pushdeck-cli
# then anywhere: pushdeck <command>
```

Or use without installing:

```bash
npx @asyncarijit/pushdeck-cli deploy --version 1.0.1 --bundle ./bundle.js --promote production
```

## Build from source

```bash
cd D:\codex\rn-pushdeck\cli
npm install
npm run build
```

Run via:
```bash
node dist/index.js <command>
```

Or link globally so `pushdeck` works anywhere:
```bash
npm link
# now: pushdeck <command>
```

## Usage

### 1. Get a token

In the dashboard at `/dashboard/settings/tokens`, click **New token**. Copy the value once — you can't see it again.

### 2. Sign in

```bash
pushdeck login --token pdkt_xxxxxxxxxxxxx
```

The token is saved to `~/.pushdeck/config.json` (or `%USERPROFILE%\.pushdeck\config.json` on Windows).

Or skip the config and use an env var:
```bash
export PUSHDECK_TOKEN=pdkt_xxx
```

### 3. Deploy

```bash
pushdeck deploy \
  --project psh_xxxxxxxx \
  --version 1.0.1 \
  --bundle ./index.android.bundle \
  --promote production \
  --notes "Fixed login bug"
```

| Flag | Required | Description |
|--|--|--|
| `-p, --project <key-or-id>` | yes | Project key (`psh_xxx`) or UUID |
| `-v, --version <semver>` | yes | Bundle version (`1.0.1`) |
| `-b, --bundle <path>` | yes | Path to the built bundle file |
| `-a, --assets <path>` | no | Path to the assets zip |
| `--min-native <semver>` | no | Minimum APK version this bundle supports (default: `--version`) |
| `--notes <text>` | no | Release notes |
| `--promote <channel>` | no | Promote to this channel after upload (e.g., `production`) |

### Other commands

```bash
pushdeck whoami     # verify your token works
pushdeck projects   # list projects + current versions
pushdeck logout     # delete saved token
```

## Building bundles

The CLI uploads pre-built bundles. To build one in a React Native app:

```bash
# Expo
npx expo export:embed --platform android --bundle-output index.android.bundle

# Bare React Native
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output index.android.bundle
```

Then pass that file path to `pushdeck deploy --bundle`.
