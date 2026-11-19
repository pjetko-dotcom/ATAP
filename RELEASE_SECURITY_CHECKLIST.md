# Build and Release Security Checklist

Use this checklist for release candidates and when moving the repository to a new development or CI environment. Record the reviewer, date, commit, build environment, and exceptions in the release record. Do not put credentials, private analysis data, or signing secrets in that record.

## 1. Source and repository readiness

- [ ] Build from the intended reviewed commit; confirm the worktree and release branch contain only expected changes.
- [ ] Transfer tracked source, lockfiles, required source assets/data, and product/security documentation. Do not transfer `node_modules/`, `dist/`, `release/`, unpacked installers, or local user data as source.
- [ ] Confirm `package.json` and `package-lock.json` agree; install with `npm ci`.
- [ ] Review all changed scripts, dependency manifests, configuration, Electron main/preload code, CSP, and server routes.
- [ ] Run the organization's approved secret scanner on the repository and history. Keep `.env`, signing keys/passwords, API credentials, and production data outside Git.
- [ ] Review dependency advisories with an approved scanner. Investigate transitive and direct findings; do not apply unreviewed forced upgrades.
- [ ] Confirm the project has an approved license before redistribution and that bundled datasets, icons, fonts, and other third-party materials may be redistributed.

## 2. Required verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] For Electron changes, test `npm run electron:preview`; for a release candidate, package on the intended host and smoke-test the installer/portable app.
- [ ] Verify routes, backup/restore, report/export, and DFD-to-threat links in the built application, not only in development mode.
- [ ] Check the actual release output for source maps, debug/dev-only endpoints, unexpected files, and accidental configuration or secrets.

## 3. Web/server deployment boundary

- [ ] The Express server defaults to `0.0.0.0:3000`; bind `HOST=127.0.0.1` for local-only use.
- [ ] The API currently has no authentication or authorization. Do not expose it to an untrusted or shared network. A public deployment requires an explicit security design, authentication, authorization, input/rate controls, TLS termination, and operational monitoring before exposure.
- [ ] Verify production CSP and HTTP security headers. Add external origins only after review and test both CSP header and HTML meta-policy behavior.
- [ ] Start production deployments with `npm run start`, which sets `NODE_ENV=production`; do not launch `dist/server.cjs` directly with an unset environment.
- [ ] Keep production secrets in the deployment secret manager; do not rely on client-side storage for secrets or multi-user authorization.
- [ ] Treat browser/Electron `localStorage`, JSON backups, activity logs, and version history as user-controlled and potentially sensitive. They are not a server-enforced audit system.

## 4. Electron and artifact checks

- [ ] Confirm `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true` remain enabled.
- [ ] Confirm production navigation is restricted to the application; external links open only approved HTTPS URLs in the system browser; DevTools are disabled outside development.
- [ ] Check the production CSP, preload bridge, packaged file list, and offline behavior. Do not add broad IPC APIs or trust renderer-provided paths/URLs.
- [ ] Store code-signing certificates and passwords in a protected secret store or secure release environment. Never commit them or place them in command history/logs.
- [ ] Sign and timestamp distributable binaries when the release policy requires it. Verify signatures and hashes after packaging.
- [ ] Generate release notes and an artifact inventory; scan and smoke-test the exact files that will be distributed.
- [ ] Publish artifacts through the approved distribution channel with access controls and integrity hashes; retain source commit and build provenance.

## 5. Release decision

- [ ] All required checks passed, or every exception has an owner, rationale, and explicit release approval.
- [ ] Confirm the version in `package.json` and `package-lock.json`, product name, release notes, and artifact filenames.
- [ ] Confirm the final artifacts contain no project workspaces, credentials, local logs, development configuration, or unreviewed files.
