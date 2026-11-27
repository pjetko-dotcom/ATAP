# AVERT Developer Guide

This guide is the practical reference for setting up, running, testing, and releasing AVERT from a fresh clone. For the product overview see [README.md](./README.md); for the product and UX rules see [PRODUCT_DESIGN_MANUAL.md](./PRODUCT_DESIGN_MANUAL.md) and [UX_RECOMMENDATIONS.md](./UX_RECOMMENDATIONS.md); for release security see [RELEASE_SECURITY_CHECKLIST.md](./RELEASE_SECURITY_CHECKLIST.md); for Windows Electron packaging see [BUILD_ELECTRON.md](./BUILD_ELECTRON.md).

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

Before submitting changes, run `npm run lint`, `npm test`, and `npm run build`. For changes to Electron startup, routing, or packaging, also use `npm run electron:preview` or `npm run electron:build`. Before distribution, complete the [release security checklist](./RELEASE_SECURITY_CHECKLIST.md).

## Source layout

- `src/App.tsx`: routes; screen modules are loaded lazily.
- `src/components/`: application screens and shared UI.
- `src/hooks/`: local workspace and analysis state.
- `src/context/`: version history and snapshot navigation state.
- `src/data/asvsData.ts`: ASVS 5.0.0 catalog and triage data used by the UI. The source CSV is `asvs_5.0.0_en.csv`.
- `src/utils/`: backup/restore, exports, CSV sanitization, findings, version comparisons, and other shared logic.
- `src/db/` and `server.ts`: Drizzle/PostgreSQL schema and the Express server/API.
- `start.cjs`: forces production mode before loading the bundled server for `npm run start`.
- `electron/`: Electron main process and preload bridge.
- `contentSecurityPolicy.ts`: shared Content Security Policy construction.
- `PRODUCT_DESIGN_MANUAL.md`, `UX_RECOMMENDATIONS.md`, and `RELEASE_SECURITY_CHECKLIST.md`: product behavior, interaction principles, and release gates.
- `dist/` and `release/`: generated build output; never edit or commit these as source.

## Data and persistence

The interactive workspace currently persists primarily in browser/Electron `localStorage`, scoped by analysis ID. Browser data is origin-specific; web and Electron data stores are not automatically synchronized.

AVERT 1.0 retains the legacy `atap_*` storage keys, Electron `appId` (`com.atap.threatanalysis`), and previous ATAP `userData` directory so upgrades keep existing analysis data. Backup filenames use AVERT branding, while their internal `atap_full_backup` type remains unchanged for import compatibility. See the [migration guide](./MIGRATION_AND_DEVELOPMENT.md) before changing these identifiers.

Important keys include:

- `atap_analyses`: analysis metadata and version snapshots.
- `atap_asvs_v5_<id>`: ASVS requirement status, evidence, and traceability. The legacy `atap_asvs_<id>` key is read in selected compatibility paths.
- `atap_threats_<id>` and `atap_architecture_<id>`: threat register and DFD model.
- `atap_context_<id>`: application context.
- `atap_triage_v5_<id>`, `atap_asvs_target_level_<id>`, and `atap_logs_v5_<id>`: triage, target level, and activity history.
- `atap_findings_<id>`: findings derived from ASVS requirements marked Missing or Partial.

In the Threat Register, ASVS links are suggested from a threat's STRIDE category, title, and description. Suggestions are heuristic and require review; users can edit the references directly or append suggestions without replacing existing links. The free-text mitigation plan is stored separately from ASVS references.

### Architecture model and trust zones

The Architecture Model stores components, data flows, and trust zones together in `atap_architecture_<id>`. The four starter zones are defaults for a new model; users can add, rename, recolor, move, resize, and remove zones. At least one zone must remain. Removing a zone moves its components to another zone. Components are positioned and dragged within their assigned zone; changing a component's zone places it inside the new boundary.

Flows can be created or edited with their protocol, synchronous/asynchronous transfer type, data description and classification, encryption, and sender authentication. Protocols and component technology stacks use alphabetized selectors with native keyboard type-to-select; custom values and older saved values remain supported. TLS flows can additionally record an NIST-listed AES-GCM cipher suite and a separate NIST key-exchange/KEM proposal. The PQC design status is derived as unknown, classical, or post-quantum; it records intent only and does not verify the deployed TLS configuration. See [NIST SP 800-52 Rev. 2](https://csrc.nist.gov/pubs/sp/800/52/r2/final) and [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) for the algorithm basis.

Protocol labels distinguish plaintext `HTTP / REST` from `HTTPS` carried over TLS. Mutual TLS is represented as `mTLS` on a TLS-based protocol (for example, `Internal HTTPS / mTLS` or `gRPC over mTLS (HTTP/2)`); it is TLS handshake authentication, not an HTTP header. Legacy labels that incorrectly described mTLS as an HTTP header, or conflated a protocol with application-level token/HMAC behavior, are normalized when saved models are loaded.

Clicking a flow connector opens its editor; the connector is also keyboard-accessible with Enter or Space. The canvas supports horizontal/vertical scrolling, 50–200% zoom, and Ctrl+mouse-wheel zooming. An optional, on-demand DFD review reports encryption/authentication concerns and unspecified TLS/PQC proposal details. It never blocks editing or saving; its findings are prompts, not confirmed vulnerabilities, and can be dismissed with Cancel or Escape.

Older saved flows remain readable; missing security attributes are treated as unknown/unset rather than assumed secure. Parallel connections are curved apart, and the renderer tries alternate curves to route around intervening components. Flows crossing between trust zones are highlighted in orange. The canvas reports and highlights overlapping zones/components and reports any remaining flow obstructions.

A flow crosses a trust boundary when its source and target components belong to different zones. Each such flow gets STRIDE scenario suggestions linked to both component IDs in `atap_threats_<id>`. Suggestions adapt to encryption, authentication, classification, and transfer type; they are review prompts, not confirmed vulnerabilities. The Threat Register marks them as needing review and allows marking them reviewed. Editing a generated scenario preserves its link and status and marks it as customized, so synchronization will not overwrite the user's changes. Unmodified generated scenarios track the current flow details and are removed when the flow is deleted, no longer crosses zones, or no longer warrants that STRIDE category. Removing a component also removes its connected flows; manually entered threats are not removed by DFD synchronization.

Threat metrics use one shared definition: **open** means status `Open`; **open high/critical** additionally requires a `High` or `Critical` risk. `Mitigated`, `Remediated`, and `Accepted` threats do not contribute to open-risk totals. The seeded example analysis (`id=1`) has sample threats; newly created analyses start without sample threats. See the [product manual](./PRODUCT_DESIGN_MANUAL.md) for risk and ASVS formulas.

Use the JSON backup/restore feature when moving local workspace data between browsers or machines. A production deployment of the Express API is not, by itself, a synchronized multi-user workspace: the React workspace uses local storage, and the API/database integration is limited. The API has no authentication or authorization and must not be exposed to an untrusted network without adding them.

## Environment and database

`PORT`, `HOST`, and `NODE_ENV` control the Express server. The server defaults to port `3000` and host `0.0.0.0`; its API is unauthenticated. For a local-only server, explicitly bind `HOST=127.0.0.1`. Review the deployment and security implications before using a network-reachable host.

The optional PostgreSQL connection uses `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME`; Drizzle configuration may also use `SQL_ADMIN_USER` and `SQL_ADMIN_PASSWORD`. Database schema lives in `src/db/schema.ts`. The current package scripts do not provide a database migration command. The `.env.example` contains server, host, and optional PostgreSQL placeholders; it is not a complete deployment guide. Do not put real secrets in tracked files.

## Tests and changes

The current automated suite covers backup validation/rollback, CSV sanitization, CSP behavior, local profile/activity data, findings generation, version diffs, DFD flow geometry/overlaps, and architecture STRIDE synchronization. Add a regression test when changing these utilities. For UI work, also test the affected route and interaction in a browser; a successful TypeScript check alone does not verify user behavior.

Keep changes focused. Do not edit generated output under `dist/` or `release/`. Preserve local-storage compatibility and backup import compatibility when changing persisted data shapes.

## Verzia 1.1

The 1.1 release adds centralized local-storage helpers, a workspace schema migration marker, save-status/error feedback, guided assessment progress, threat bulk-review controls, component/ASVS/threat traceability links, and keyboard/zoom improvements for the DFD. Bundle splitting for ExcelJS remains out of scope.

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
