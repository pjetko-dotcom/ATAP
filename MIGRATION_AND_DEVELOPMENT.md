# Migrating and Developing ATAP

This document covers the practical steps for cloning the repository, moving user data, and understanding deployment boundaries. The maintained setup, commands, source layout, tests, and release procedure are documented in the [Developer Guide](./DEVELOPMENT_GUIDE.md). Windows Electron packaging details are in [BUILD_ELECTRON.md](./BUILD_ELECTRON.md).

## Set up a fresh clone

Install the Node.js and npm versions required by the `engines` field in `package.json`, then run:

```sh
git clone <repository-url> atap
cd atap
npm ci
npm run lint
npm test
npm run dev
```

## What belongs in Git

Commit source code, configuration, lockfiles, and documentation. Do not copy or commit generated dependencies/builds (`node_modules/`, `dist/`, `release/`) or local secrets (`.env`). Check `.gitignore` for the current exclusions. Use `npm ci` to recreate dependencies from the lockfile rather than copying `node_modules` between machines.

## Moving analysis data

Analysis workspaces are stored primarily in browser or Electron `localStorage`; they are not automatically synchronized between browsers, machines, or the web and desktop versions. Use the application's JSON backup/export and restore/import flow to transfer workspace data. Treat backups as sensitive: they may contain architecture, threat, evidence, and activity-log data.

The activity log and version history are client-side data and can be edited by a user. They are useful for traceability but are not an immutable security audit.

## Environment and deployment boundaries

The `.env.example` file contains AI Studio placeholders and is not a complete server or PostgreSQL configuration. Do not commit credentials. PostgreSQL settings, when needed, use `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME`; Drizzle configuration can additionally use `SQL_ADMIN_USER` and `SQL_ADMIN_PASSWORD`.

The Express server reads `HOST` and `PORT` from its environment and defaults to `0.0.0.0:3000`. Its API has no authentication or authorization. Bind to `127.0.0.1` for local-only use; do not expose it to an untrusted network without adding appropriate access controls. The database/API integration does not make the local-storage workspace a synchronized multi-user application.

For versioning and release builds, update both `package.json` and `package-lock.json`; see the release instructions in the [Developer Guide](./DEVELOPMENT_GUIDE.md).
