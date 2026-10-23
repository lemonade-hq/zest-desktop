# Tracking upstream Bruno

Zest Desktop is a fork of [usebruno/bruno](https://github.com/usebruno/bruno) (MIT). We keep merging upstream `main`; Lemonade-specific code lives in `packages/zest-core` where possible, so it never collides with Bruno's files.

## Last merged upstream commit

`24c14af168d030b52f7769fc5b2a3a06e7ac42bc` (upstream `main`)

Update this line in the same commit as every upstream merge.

## Add the upstream remote

```sh
git remote add upstream https://github.com/usebruno/bruno
```

## Merge procedure

```sh
git fetch upstream && git merge upstream/main
```

1. Resolve conflicts. Expect them only in the files listed below.
2. `npm ci --legacy-peer-deps`, then the same checks as `.github/workflows/zest-build.yml`: unit tests for `bruno-common`, `bruno-lang`, `bruno-schema`, `zest-core`, `bruno-electron`.
3. Regenerate `package-lock.json` only if it conflicted; keep the `packages/zest-core` entries and the `zest` name for `packages/bruno-electron`.
4. Update the sha above.

Prefer small string edits inside upstream files over renames or moves, so merges stay cheap.

## Files we intentionally patch

Conflicts are expected here.

| Path | Why we patch it | Patched by |
|---|---|---|
| `packages/bruno-electron/electron-builder-config.js` | appId, productName, Bruno's signing identity removed, `ZEST_MAC_TARGETS` / `ZEST_MAC_ARCH` knobs | bootstrap |
| `packages/bruno-electron/package.json` | `name: zest`, `@lemonade-hq/zest-core` dependency | bootstrap |
| `packages/bruno-electron/notarize.js` | appId; no-op without `APPLE_ID` | bootstrap |
| `packages/bruno-electron/src/index.js` | window title | bootstrap |
| `packages/bruno-electron/src/app/about-bruno.js`, `menu-template.js` | about text and menu label | bootstrap |
| `packages/bruno-app/rsbuild.config.mjs` | page / window title | bootstrap |
| `package.json`, `package-lock.json`, `scripts/setup.js`, `eslint.config.js`, `.github/actions/common/setup-node-deps/action.yml` | `packages/zest-core` workspace wiring | bootstrap |
| `.github/workflows/tests-linux.yml`, `tests-macos.yml`, `tests-windows.yml`, `benchmarks.yml` | every job guarded with `if: github.repository == 'usebruno/bruno'` (self-hosted runners, cost) | bootstrap |
| `packages/bruno-electron/resources/icons/**` | Zest icons | branding task |
| `packages/bruno-electron/src/ipc/network/prepare-request.js` | `lemonade-partner` / `lemonade-agent` auth | auth-mode tasks |
| `packages/bruno-app/src/components/RequestPane/Auth/AuthMode/**` | new auth modes in the UI | auth-mode tasks |
| `packages/bruno-schema/src/collections/index.js`, `packages/bruno-lang/v2/src/*.js`, `packages/bruno-filestore/src/formats/yml/common/auth.ts` | auth definitions in schema and both file formats | auth-mode tasks |

## Kept as Bruno on purpose

- The `bruno://` URL scheme (`src/index.js`, `utils/deeplink.js`): OAuth2 callbacks arrive as `bruno://app/oauth2/callback`.
- Directory and file names such as `packages/bruno-electron` and `about-bruno.js`.
- Upstream workflows `lint-checks.yml`, `flaky-test-detector.yml`, `npm-bru-cli.yml` stay enabled.
