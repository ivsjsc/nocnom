# nOcnOm — KTX Khu B

React + TypeScript + Vite application for weekly meal planning and food/vendor management.

## Local development

Prerequisites: Node.js 22 and npm.

```bash
npm ci
npm run lint
npm run dev
```

No private API key is required by the frontend.

## Validation

```bash
npm run lint
npm run build
```

## Firebase

The repository is configured for Firebase project `cocoa-35632` and Hosting target `nocnom`.

Production Hosting is deployed by GitHub Actions after a merge to `main`. Firestore rules are **not** deployed by the Hosting workflow; review them separately before running a manual Firestore rules deployment.

## Data model note

The current meal/menu data layer is browser-local (`localStorage`). This means changes are device-specific. Cloud synchronization should be implemented only together with explicit administrator RBAC; do not expose Firestore writes broadly.
