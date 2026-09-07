# nOcnOm Firebase Boundary Audit

Status: production hardening  
Firebase project: `cocoa-35632`  
Hosting target: `nocnom`  
Media policy: `PUBLIC_URL_ONLY`

## 1. Runtime Firebase boundary

nOcnOm uses Firebase Authentication and Firestore for authenticated application state.

Primary runtime binding:

- `src/lib/firebase.ts`
- project: `cocoa-35632`
- auth domain: `cocoa-35632.firebaseapp.com`
- hosting target: `nocnom`

The Firebase web configuration is public client configuration. Authorization is enforced by Firebase Authentication and Firestore Rules.

## 2. Repository/project binding

The following sources must remain consistent:

| Source | Expected binding |
| --- | --- |
| `.firebaserc` | default project `cocoa-35632` |
| `.firebaserc` | hosting target `nocnom` |
| `firebase.json` | `firestore.rules` |
| `firebase.json` | `firestore.indexes.json` |
| client config | project `cocoa-35632` |
| PR workflow | project `cocoa-35632` |
| production workflow | project `cocoa-35632` |

`npm run firebase:audit` checks the binding and fails CI if it drifts.

## 3. nOcnOm Firestore ownership

Current nOcnOm-owned private paths:

- `users/{uid}/profile/main`
- legacy compatibility: `users/{uid}/data/appState`
- schema v2:
  - `users/{uid}/state/timetable`
  - `users/{uid}/state/dishes`
  - `users/{uid}/state/categories`
  - `users/{uid}/state/logs`
  - `users/{uid}/state/meta`

The schema-v2 migration remains copy-forward and backward-compatible:

1. read schema v2 first;
2. if absent, read legacy `appState`;
3. copy legacy state into v2;
4. do not delete the legacy document during migration.

Authenticated local browser cache is scoped by Firebase `uid` so one signed-in account does not reuse another account's private application state.

## 4. Media architecture

nOcnOm deliberately uses public image URLs rather than Firebase Storage for dish media.

Supported sources in the Add Dish flow:

- Wikimedia Commons image suggestions;
- manually supplied public HTTPS image URLs.

The application persists metadata only, for example:

- `imageUrl`;
- `imageSource`;
- `imageSourcePageUrl`;
- `imageLicense`;
- `imageAttribution`.

The Add Dish UI does not offer a local-file upload action and does not call Firebase Storage.

This design keeps dish media compatible with the Firebase Spark plan and avoids Storage billing as an application requirement.

## 5. Public image URL constraints

Public URL media has different operational risks from managed object storage:

- the remote host can delete or move an image;
- a host can block hotlinking;
- a temporary or signed URL can expire;
- remote content can change without nOcnOm controlling it.

Therefore the preferred order is:

1. stable Wikimedia Commons URL with attribution metadata;
2. stable public HTTPS CDN/static URL;
3. manual public URL only when the user has verified it loads reliably.

Do not persist `blob:`, `data:`, local filesystem paths, private Drive links, or expiring signed URLs as dish image URLs.

## 6. Legacy Storage compatibility

The repository may still contain Firebase Storage configuration, rules, and cleanup code for historical records created before the public-URL-only decision.

Those compatibility artifacts must not be interpreted as an active media dependency.

Rules must not be opened to bypass the Spark-plan limitation. New dish creation must remain URL-only unless the product architecture is explicitly changed later.

## 7. Firestore Rules inventory outside nOcnOm

`firestore.rules` also contains rules for paths named:

- `dishes`;
- `timetable`;
- `messages`;
- `rooms`;
- `calls`;
- `fcmTokens`;
- `ledgers`.

Current nOcnOm source does not use those top-level collections for its active private state flow. They may belong to another application or an earlier/shared architecture.

Do not delete those rules solely because nOcnOm does not reference them. Their ownership must be confirmed at Firebase-project level first.

Long-term preferred boundary:

- nOcnOm owns only documented nOcnOm paths; or
- nOcnOm moves to a dedicated Firebase project if `cocoa-35632` is shared by unrelated applications.

## 8. App Check

No active App Check client initialization was found during the audit.

Before enabling enforcement:

1. choose the Web provider;
2. register production domains;
3. support localhost/dev tokens;
4. verify valid Firestore traffic;
5. enable enforcement only after observing correct client behavior.

Do not enable enforcement without client integration because it could block legitimate users.

## 9. Firestore indexes

The schema-v2 state flow uses direct document reads/writes and does not add a new composite query.

The production workflow guards `firestore.indexes.json`. If that file changes, deployment must use an explicit index migration/deployment workflow.

## 10. Production deployment gates

Required sequence:

1. install dependencies;
2. TypeScript/lint gate;
3. Firebase config audit;
4. unit/domain tests;
5. Firebase emulator rules tests;
6. production build;
7. project binding verification;
8. index-change guard;
9. deploy required Firebase rules;
10. deploy Hosting;
11. run isolated production Firebase smoke.

The production smoke creates only temporary test-owned data and cleans it up.

The active smoke verifies:

- `users/{uid}/profile/main`;
- all five schema-v2 state documents;
- logout/login persistence;
- public image URL metadata persistence;
- media policy `PUBLIC_URL_ONLY`.

It does not upload, read, replace, or delete Firebase Storage objects.

## 11. Cost-control decision

Firebase Storage is not required by the active nOcnOm dish-image flow.

The previous `storage/quota-exceeded` result is therefore no longer a release blocker after the public-URL-only media policy is merged and the production workflow uses the public-URL smoke test.

The intended cost posture is:

- remain on Firebase Spark where feasible;
- do not require a billing account solely for dish images;
- never silently fall back to paid object storage;
- if a future feature requires a paid Firebase service, make that an explicit product and cost decision before implementation.

## 12. Acceptance

The media feature is production-accepted when:

- public image suggestions render;
- a manually entered public HTTPS image URL can be saved;
- saved image metadata survives refresh and logout/login;
- invalid/non-public URL inputs are rejected;
- account ownership isolation remains intact;
- no Firebase Storage upload is triggered by Add Dish;
- production workflow succeeds.
