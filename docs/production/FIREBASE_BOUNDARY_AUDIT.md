# nOcnOm Firebase Boundary Audit

Status: production hardening  
Firebase project: `cocoa-35632`  
Hosting target: `nocnom`  
Primary Storage bucket: `cocoa-35632.firebasestorage.app`

## 1. Runtime Firebase initialization

nOcnOm has one client initialization layer:

- `src/lib/firebase.ts`
- one `initializeApp(firebaseConfig)`
- Auth, Firestore, Storage and Analytics are created from that same Firebase App
- `projectId`: `cocoa-35632`
- `authDomain`: `cocoa-35632.firebaseapp.com`
- `storageBucket`: `cocoa-35632.firebasestorage.app`

The web Firebase config is public client configuration. It is not treated as a secret. Production authorization is enforced by Firebase Authentication, Firestore Rules and Storage Rules.

## 2. Repository/project binding

The following sources must remain consistent:

| Source | Expected binding |
| --- | --- |
| `.firebaserc` | default project `cocoa-35632` |
| `.firebaserc` | hosting target `nocnom` |
| `firebase.json` | `firestore.rules` |
| `firebase.json` | `firestore.indexes.json` |
| `firebase.json` | `storage.rules` |
| client config | project `cocoa-35632` |
| client config | bucket `cocoa-35632.firebasestorage.app` |
| PR workflow | project `cocoa-35632` |
| production workflow | project `cocoa-35632` |
| production workflow | bucket `cocoa-35632.firebasestorage.app` |

`npm run firebase:audit` checks this boundary and fails CI if the bindings drift.

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

The schema-v2 migration is copy-forward and backward-compatible:

1. read schema v2 first;
2. if absent, read legacy `appState`;
3. copy legacy state into v2;
4. do not delete or overwrite the legacy document during migration.

Authenticated local browser cache is scoped by Firebase `uid` so one signed-in account does not reuse another account's cached Home/History state.

## 4. nOcnOm Storage ownership

User-uploaded food images use:

`users/{uid}/foods/{foodId}/{uuid}.{ext}`

Storage Rules require:

- authenticated user;
- path UID equals `request.auth.uid`;
- MIME is JPEG, PNG or WebP;
- upload size is greater than zero and no more than 5 MB.

Firestore stores image metadata, not binary image content:

- `imageUrl`
- `imagePath`
- `imageContentType`
- `imageSize`
- `imageSource`
- `imageUpdatedAt`

Replacement order is:

1. upload new object;
2. get download URL;
3. persist Firestore metadata;
4. only after Firestore succeeds, delete the previous Storage object.

If Firestore persistence fails after upload, the newly uploaded object is deleted as rollback.

## 5. Media optimization

Before Storage upload:

- original MIME/size validation runs first;
- large images are resized to a maximum side of 1600 px when browser APIs support it;
- WebP quality target is 0.82;
- optimized output is used only when smaller than the original;
- optimization failure falls back to the original valid file;
- upload is resumable and reports progress.

A local `blob:` preview URL is never persisted as an image URL.

## 6. Firestore Rules inventory outside nOcnOm

`firestore.rules` currently also contains rules for paths named:

- `dishes`
- `timetable`
- `messages`
- `rooms`
- `calls`
- `fcmTokens`
- `ledgers`

Current nOcnOm source does not use those top-level collections for its active private state flow. They may belong to another application or an earlier/shared architecture.

**Do not delete those rules solely because nOcnOm does not reference them.** Their ownership must be confirmed at Firebase-project level first. Removing them without that confirmation could break another application sharing `cocoa-35632`.

Long-term preferred boundary:

- nOcnOm owns only documented nOcnOm paths; or
- nOcnOm moves to a dedicated Firebase project if `cocoa-35632` is shared by unrelated applications.

## 7. App Check

No active App Check client initialization was found in the nOcnOm runtime source during this audit.

This is not automatically a defect. Before enabling App Check enforcement:

1. choose the Web provider;
2. register production domains;
3. support localhost/dev tokens;
4. verify Firestore and Storage traffic;
5. enable enforcement only after observed valid traffic.

Do not enable enforcement without client integration because it would block legitimate production requests.

## 8. Firestore indexes

The nOcnOm schema-v2 state flow uses direct document reads/writes and does not add a new composite query.

The production workflow guards `firestore.indexes.json`. If that file changes, deployment must use an explicit index migration/deployment workflow rather than silently ignoring the change.

## 9. Production deployment gates

Required sequence:

1. install dependencies;
2. TypeScript/lint gate;
3. Firebase config audit;
4. unit/domain tests;
5. Firestore + Storage Emulator rules tests;
6. production build;
7. project binding verification;
8. index-change guard;
9. deploy Firestore + Storage Rules;
10. deploy Hosting;
11. run isolated production Firebase smoke.

The production smoke creates only temporary test-owned data and cleans it up.

## 10. Current external blocker

The live production smoke has reached real Firebase Storage and returned:

`storage/quota-exceeded`

This means the code path and deployed rules progressed far enough to attempt a real bucket upload. The remaining live acceptance blocker is Storage quota/billing availability for `cocoa-35632.firebasestorage.app`.

Do not bypass this by:

- opening Storage Rules;
- storing images as Firestore base64;
- treating local preview URLs as persistent;
- silently skipping the live Storage smoke.

Once quota is available, rerun the failed production workflow and require the full smoke to pass.

## 11. Acceptance after quota restoration

The Firebase image feature is production-accepted only when all of these pass:

- authenticated upload;
- object exists in Storage;
- `getDownloadURL`;
- Firestore image metadata write;
- UI refresh persistence;
- logout/login persistence;
- image replacement;
- old-object cleanup;
- owner isolation;
- no unhandled permission error;
- production workflow success.
