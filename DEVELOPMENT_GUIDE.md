# ATAP Developer Guide

This guide is the practical reference for setting up, running, testing, and releasing ATAP from a fresh clone. For the product overview see [README.md](./README.md); for Windows Electron packaging see [BUILD_ELECTRON.md](./BUILD_ELECTRON.md).

## Requirements

Use the Node.js and npm versions declared in [`package.json`](./package.json): Node.js `>=22.12.0` and npm `>=10.0.0`. Electron is a development/build dependency and is packaged with the desktop app.

## Start from a fresh clone

```sh
git clone <repository-url> atap
cd atap
npm ci
npm run lint
npm test
npm run dev
```

The development server normally listens on `http://localhost:3000`. To run the desktop development app instead:

```sh
npm run electron:dev
```

Do not copy `node_modules/`, `dist/`, or `release/` between machines. They are generated locally and ignored by Git.

## Supported project commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Express with Vite middleware for web development. |
| `npm run lint` | Type-check the TypeScript project (`tsc --noEmit`). |
| `npm test` | Run the Node test suite in `src/utils/security.test.ts`. |
| `npm run build` | Create the production web assets and bundle the Express server into `dist/`. |
| `npm run start` | Serve the production build; run `npm run build` first. |
| `npm run electron:dev` | Run the web dev server and Electron together. |
| `npm run electron:preview` | Build and open the production renderer in Electron without making installers. |
| `npm run electron:build` | Build and package the Electron application for the host platform. |

Before submitting changes, run `npm run lint`, `npm test`, and `npm run build`. For changes to Electron startup, routing, or packaging, also use `npm run electron:preview` or `npm run electron:build`.

## Source layout

- `src/App.tsx`: routes; screen modules are loaded lazily.
- `src/components/`: application screens and shared UI.
- `src/hooks/`: local workspace and analysis state.
- `src/context/`: version history and snapshot navigation state.
- `src/data/asvsData.ts`: ASVS 5.0.0 catalog and triage data used by the UI. The source CSV is `asvs_5.0.0_en.csv`.
- `src/utils/`: backup/restore, exports, CSV sanitization, findings, version comparisons, and other shared logic.
- `src/db/` and `server.ts`: Drizzle/PostgreSQL schema and the Express server/API.
- `electron/`: Electron main process and preload bridge.
- `contentSecurityPolicy.ts`: shared Content Security Policy construction.
- `dist/` and `release/`: generated build output; never edit or commit these as source.

## Data and persistence

The interactive workspace currently persists primarily in browser/Electron `localStorage`, scoped by analysis ID. Browser data is origin-specific; web and Electron data stores are not automatically synchronized.

Important keys include:

- `atap_analyses`: analysis metadata and version snapshots.
- `atap_asvs_v5_<id>`: ASVS requirement status, evidence, and traceability. The legacy `atap_asvs_<id>` key is read in selected compatibility paths.
- `atap_threats_<id>` and `atap_architecture_<id>`: threat register and DFD model.
- `atap_context_<id>`: application context.
- `atap_triage_v5_<id>`, `atap_asvs_target_level_<id>`, and `atap_logs_v5_<id>`: triage, target level, and activity history.
- `atap_findings_<id>`: findings derived from ASVS requirements marked Missing or Partial.

Use the JSON backup/restore feature when moving local workspace data between browsers or machines. A production deployment of the Express API is not, by itself, a synchronized multi-user workspace: the React workspace uses local storage, and the API/database integration is limited. The API has no authentication or authorization and must not be exposed to an untrusted network without adding them.

## Environment and database

`PORT`, `HOST`, and `NODE_ENV` control the Express server. The server defaults to port `3000` and host `0.0.0.0`; its API is unauthenticated. For a local-only server, explicitly bind `HOST=127.0.0.1`. Review the deployment and security implications before using a network-reachable host.

The optional PostgreSQL connection uses `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME`; Drizzle configuration may also use `SQL_ADMIN_USER` and `SQL_ADMIN_PASSWORD`. Database schema lives in `src/db/schema.ts`. The current package scripts do not provide a database migration command. The `.env.example` contains AI Studio placeholders and is not a complete PostgreSQL setup guide; do not put real secrets in tracked files.

## Tests and changes

The current automated suite is intentionally focused on backup validation/rollback, CSV sanitization, CSP behavior, local profile/activity data, findings generation, and version diffs. Add a regression test when changing these utilities. For UI work, also test the affected route and interaction in a browser; a successful TypeScript check alone does not verify user behavior.

Keep changes focused. Do not edit generated output under `dist/` or `release/`. Preserve local-storage compatibility and backup import compatibility when changing persisted data shapes.

## Versioning and releases

The application version is stored in both `package.json` and the root entry in `package-lock.json`. The UI reads the package version; Electron Builder uses it in the generated product filenames.

For a patch release, update both manifests together, for example:

```sh
npm version patch --no-git-tag-version
```

Then run the checks above and build:

```sh
npm run build
npm run electron:build
```

The configured release targets are NSIS installer and portable executable for Windows, DMG for macOS, and AppImage for Linux. Native packaging/signing requirements vary by operating system. Unsigned Windows binaries can trigger SmartScreen warnings. Build output is placed in the ignored `release/` directory; attach release artifacts through the project’s chosen distribution mechanism rather than committing generated binaries.
