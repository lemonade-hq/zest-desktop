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
| `packages/bruno-electron/notarize.js` | appId; no-op without `APPLE_ID` + `APPLE_TEAM_ID` | bootstrap |
| `packages/bruno-electron/src/index.js` | window title | bootstrap |
| `packages/bruno-electron/src/app/about-bruno.js`, `menu-template.js` | about text and menu label | bootstrap |
| `packages/bruno-app/rsbuild.config.mjs` | page / window title | bootstrap |
| `package.json`, `package-lock.json`, `scripts/setup.js`, `eslint.config.js`, `.github/actions/common/setup-node-deps/action.yml` | `packages/zest-core` workspace wiring | bootstrap |
| `.gitignore` | `packages/zest-core/dist` ignored — dist is built by `scripts/setup.js` and CI, never committed | zest-core auth port |
| `.github/workflows/tests-linux.yml`, `tests-macos.yml`, `tests-windows.yml`, `benchmarks.yml` | every job guarded with `if: github.repository == 'usebruno/bruno'` (self-hosted runners, cost) | bootstrap |
| `packages/bruno-electron/resources/icons/**` | Zest icons | branding task |
| `packages/bruno-electron/src/ipc/network/prepare-request.js` | `lemonade-partner` / `lemonade-agent` auth | auth-mode tasks |
| `packages/bruno-app/src/components/RequestPane/Auth/AuthMode/**` | new auth modes in the UI | auth-mode tasks |
| `packages/bruno-electron/src/ipc/network/index.js`, `packages/bruno-electron/src/ipc/network/interpolate-vars.js`, `packages/bruno-electron/src/index.js` | `lemonade-partner`: token minted in `configureRequest`, `{{vars}}` interpolated, `registerZestIpc` | lemonade-partner |
| `packages/bruno-app/src/components/CollectionSettings/Auth/AuthMode/index.js`, `packages/bruno-app/src/components/CollectionSettings/Auth/index.js`, `packages/bruno-app/src/components/FolderSettings/AuthMode/index.js`, `packages/bruno-app/src/components/FolderSettings/Auth/index.js`, `packages/bruno-app/src/components/RequestPane/Auth/AuthFields/index.js` | Lemonade Partner dropdown entry, form and production badge at collection, folder and request level | lemonade-partner |
| `packages/bruno-app/src/components/Git/VisualDiffViewer/VisualDiffAuth.js` | label for the `lemonadePartner` auth block in diffs | lemonade-partner |
| `packages/bruno-app/src/providers/ReduxStore/slices/collections/index.js`, `packages/bruno-app/src/utils/collections/index.js`, `packages/bruno-app/src/utils/common/constants.js` | `lemonade-partner` auth reducers, export transform, label, defaults | lemonade-partner |
| `packages/bruno-schema-types/src/common/auth.ts` | `AuthLemonadePartner` type and mode | lemonade-partner |
| `packages/bruno-schema/src/collections/index.js`, `packages/bruno-lang/v2/src/*.js`, `packages/bruno-filestore/src/formats/yml/common/auth.ts` | auth definitions in schema and both file formats | auth-mode tasks |
| `packages/bruno-electron/electron-builder-config.js` | `resources/data/zest` (bundled public-apis snapshot) in `extraResources` | public-apis spec task |
| `packages/bruno-electron/src/index.js` | registers `ipc/zest-api-specs.js` | public-apis spec task |
| `packages/bruno-electron/src/utils/workspace-config.js` | keeps the optional `source` block of a spec entry (`src/zest/api-spec-source.js`) | public-apis spec task |
| `packages/bruno-electron/src/ipc/workspace.js` | adds sync state / `stale` to `renderer:load-workspace-apispecs` | public-apis spec task |
| `packages/bruno-electron/src/store/default-workspace.js` | `runZestHooks`: first-launch preload and launch-time sync | public-apis spec task |
| `packages/bruno-app/src/components/Sidebar/ApiSpecs/**` | "Sync from source", stale pill, source URL recorded on create, "Zest" strings | public-apis spec task |
| `packages/bruno-app/src/components/ApiSpecPanel/SpecViewer.js`, `Renderers/Swagger/index.js`, `Renderers/Swagger/StyledWrapper.js`, `components/ApiSpecTab/index.js` | "New request" button per operation | public-apis spec task |

## Kept as Bruno on purpose

- The `bruno://` URL scheme (`src/index.js`, `utils/deeplink.js`): OAuth2 callbacks arrive as `bruno://app/oauth2/callback`.
- Directory and file names such as `packages/bruno-electron` and `about-bruno.js`.
- Upstream workflows `lint-checks.yml`, `flaky-test-detector.yml`, `npm-bru-cli.yml` stay enabled.
