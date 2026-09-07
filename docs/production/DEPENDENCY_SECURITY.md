# Dependency Security Baseline — Issue #39

## Scope

This document records the dependency audit and remediation performed for GitHub issue #39.

The application is a Vite-built React client deployed as static Firebase Hosting output. Runtime dependencies are therefore limited to packages bundled into the browser application. Build, test, lint and Firebase verification tools are development-only and must not be classified as production runtime dependencies.

## Baseline finding

The locked dependency tree originally reported:

- 16 total advisories;
- 3 low;
- 2 moderate;
- 9 high;
- 2 critical.

The same findings appeared under `npm audit --omit=dev` because several build-only and unused packages were incorrectly declared in `dependencies`.

High/critical findings included vulnerable transitive versions of:

- `@grpc/grpc-js`;
- `brace-expansion`;
- `browserslist`;
- `nanoid`;
- `path-to-regexp`;
- `picomatch`;
- `postcss`;
- `protobufjs`;
- `vite`;
- `websocket-driver`;
- `ws`.

The direct dependency boundary also contained unused packages that increased attack surface and audit noise:

- `@google/genai`;
- `better-sqlite3`;
- `dotenv`;
- `express`;
- `@types/express`.

Repository search confirmed they were not imported by application, scripts or tests.

## Remediation

1. Removed unused direct packages listed above.
2. Moved build-only packages to `devDependencies`:
   - `@tailwindcss/vite`;
   - `@vitejs/plugin-react`;
   - `tailwindcss`;
   - `vite`.
3. Raised the Vite compatible floor to `^6.4.3`, above the audited vulnerable `<=6.4.2` range.
4. Regenerated the lockfile and applied compatible, non-forced `npm audit fix --package-lock-only` updates.
5. Added a production dependency gate:
   - `npm run audit:prod`
   - command: `npm audit --omit=dev --audit-level=high`.
6. Added that gate before lint/test/build/deploy in both PR and main deployment workflows.
7. Pinned temporary Firebase verification tooling used by CI:
   - `@firebase/rules-unit-testing@5.0.2`;
   - `firebase-tools@15.29.0`.

No `npm audit fix --force` or blind major-version upgrade was used.

## Verification result

After remediation:

### Production dependency tree

`npm audit --omit=dev --json`:

- low: 0
- moderate: 0
- high: 0
- critical: 0
- total: 0

This is the production acceptance boundary.

### Locked development tree

The committed dependency tree reports one low-severity development-only advisory:

- `tsx@4.21.0 -> esbuild@0.27.3`;
- advisory: GHSA-g7r4-m6w7-qqqr;
- affected behavior is the esbuild development server on Windows;
- nOcnOm production is static Firebase Hosting output and does not run the esbuild development server.

Risk decision: **accepted temporarily as development-only low severity**. It has no production runtime exposure and is below the CI production high/critical blocking threshold. Upgrade when `tsx` resolves its `~0.27.0` esbuild constraint or after compatibility testing of a safe replacement.

### Firebase verification tooling

A diagnostic install of the pinned verification tools reports no high or critical advisories. The install currently reports development/test-only moderate findings, so these tools remain outside the production runtime boundary and their versions are pinned to prevent unreviewed drift.

## CI policy

A PR or production deployment must fail before build/deploy when the production dependency tree contains a high or critical npm advisory.

Required regression sequence remains:

1. `npm ci`
2. `npm run audit:prod`
3. `npm run lint`
4. `npm test`
5. Firebase Firestore/Storage emulator rules tests
6. `npm run build`

This decision satisfies issue #39 acceptance: there is no unresolved production high/critical vulnerability and any residual non-production risk is explicitly documented.
