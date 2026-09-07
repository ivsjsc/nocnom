import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { stripUndefinedFields } from '../lib/firestoreData';
import type {
  Category,
  Dish,
  LogEntry,
  Timetable
} from '../lib/db';
import type { UserMealAddon } from '../domain/meal/addonNormalizer';

export type UserStateDomain =
  | 'timetable'
  | 'dishes'
  | 'categories'
  | 'logs'
  | 'mealAddons';

export type UserStateSnapshot = {
  timetable: Timetable;
  dishes: Dish[];
  categories: Category[];
  logs: LogEntry[];
  mealAddons: UserMealAddon[];
};

export const USER_STATE_SCHEMA_VERSION = 2;
export const USER_STATE_DOMAINS: readonly UserStateDomain[] = [
  'timetable',
  'dishes',
  'categories',
  'logs',
  'mealAddons'
] as const;

type MigrationSource = 'appState-v1' | 'new-user' | 'v2';

const stateDoc = (uid: string, domain: UserStateDomain | 'meta') =>
  doc(db, 'users', uid, 'state', domain);

const legacyStateDoc = (uid: string) =>
  doc(db, 'users', uid, 'data', 'appState');

const normalizeDomains = (
  domains?: Iterable<UserStateDomain>
): UserStateDomain[] => {
  if (!domains) return [...USER_STATE_DOMAINS];
  return [...new Set(domains)].filter(
    (domain): domain is UserStateDomain =>
      USER_STATE_DOMAINS.includes(domain as UserStateDomain)
  );
};

const serializeDomain = (
  domain: UserStateDomain,
  state: UserStateSnapshot
) => {
  switch (domain) {
    case 'timetable':
      return {
        value: stripUndefinedFields(state.timetable),
        schemaVersion: USER_STATE_SCHEMA_VERSION,
        updatedAt: serverTimestamp()
      };
    case 'dishes':
      return {
        items: stripUndefinedFields(state.dishes),
        schemaVersion: USER_STATE_SCHEMA_VERSION,
        updatedAt: serverTimestamp()
      };
    case 'categories':
      return {
        items: stripUndefinedFields(state.categories),
        schemaVersion: USER_STATE_SCHEMA_VERSION,
        updatedAt: serverTimestamp()
      };
    case 'logs':
      return {
        items: stripUndefinedFields(state.logs),
        schemaVersion: USER_STATE_SCHEMA_VERSION,
        updatedAt: serverTimestamp()
      };
    case 'mealAddons':
      return {
        items: stripUndefinedFields(state.mealAddons),
        schemaVersion: USER_STATE_SCHEMA_VERSION,
        updatedAt: serverTimestamp()
      };
  }
};

export const persistUserStateDomains = async ({
  uid,
  state,
  domains,
  migrationSource = 'v2'
}: {
  uid: string;
  state: UserStateSnapshot;
  domains?: Iterable<UserStateDomain>;
  migrationSource?: MigrationSource;
}) => {
  const selectedDomains = normalizeDomains(domains);
  if (selectedDomains.length === 0) return;

  const batch = writeBatch(db);

  selectedDomains.forEach(domain => {
    batch.set(
      stateDoc(uid, domain),
      serializeDomain(domain, state),
      { merge: true }
    );
  });

  batch.set(
    stateDoc(uid, 'meta'),
    {
      schemaVersion: USER_STATE_SCHEMA_VERSION,
      migrationSource,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await batch.commit();
};

const readV2Snapshot = async (
  uid: string,
  fallback: UserStateSnapshot
): Promise<{
  state: UserStateSnapshot;
  exists: boolean;
}> => {
  const [
    timetableSnapshot,
    dishesSnapshot,
    categoriesSnapshot,
    logsSnapshot,
    mealAddonsSnapshot
  ] = await Promise.all([
    getDoc(stateDoc(uid, 'timetable')),
    getDoc(stateDoc(uid, 'dishes')),
    getDoc(stateDoc(uid, 'categories')),
    getDoc(stateDoc(uid, 'logs')),
    getDoc(stateDoc(uid, 'mealAddons'))
  ]);

  const exists =
    timetableSnapshot.exists() ||
    dishesSnapshot.exists() ||
    categoriesSnapshot.exists() ||
    logsSnapshot.exists() ||
    mealAddonsSnapshot.exists();

  const timetableData = timetableSnapshot.data();
  const dishesData = dishesSnapshot.data();
  const categoriesData = categoriesSnapshot.data();
  const logsData = logsSnapshot.data();
  const mealAddonsData = mealAddonsSnapshot.data();

  return {
    exists,
    state: {
      timetable:
        timetableData?.value &&
        typeof timetableData.value === 'object'
          ? (timetableData.value as Timetable)
          : fallback.timetable,
      dishes: Array.isArray(dishesData?.items)
        ? (dishesData.items as Dish[])
        : fallback.dishes,
      categories: Array.isArray(categoriesData?.items)
        ? (categoriesData.items as Category[])
        : fallback.categories,
      logs: Array.isArray(logsData?.items)
        ? (logsData.items as LogEntry[])
        : fallback.logs,
      mealAddons: Array.isArray(mealAddonsData?.items)
        ? (mealAddonsData.items as UserMealAddon[])
        : fallback.mealAddons
    }
  };
};

const readLegacySnapshot = async (
  uid: string,
  fallback: UserStateSnapshot
) => {
  const snapshot = await getDoc(legacyStateDoc(uid));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    timetable:
      data.timetable && typeof data.timetable === 'object'
        ? (data.timetable as Timetable)
        : fallback.timetable,
    dishes: Array.isArray(data.dishes)
      ? (data.dishes as Dish[])
      : fallback.dishes,
    categories: Array.isArray(data.categories)
      ? (data.categories as Category[])
      : fallback.categories,
    logs: Array.isArray(data.logs)
      ? (data.logs as LogEntry[])
      : fallback.logs,
    mealAddons: fallback.mealAddons
  } satisfies UserStateSnapshot;
};

/**
 * Loads schema v2 state. If the user only has the legacy appState document,
 * it is copied into v2 without deleting or modifying the legacy document.
 */
export const loadOrMigrateUserState = async ({
  uid,
  fallback
}: {
  uid: string;
  fallback: UserStateSnapshot;
}): Promise<{
  state: UserStateSnapshot;
  source: MigrationSource;
}> => {
  const v2 = await readV2Snapshot(uid, fallback);
  if (v2.exists) {
    return {
      state: v2.state,
      source: 'v2'
    };
  }

  const legacy = await readLegacySnapshot(uid, fallback);
  if (legacy) {
    await persistUserStateDomains({
      uid,
      state: legacy,
      migrationSource: 'appState-v1'
    });

    return {
      state: legacy,
      source: 'appState-v1'
    };
  }

  await persistUserStateDomains({
    uid,
    state: fallback,
    migrationSource: 'new-user'
  });

  return {
    state: fallback,
    source: 'new-user'
  };
};

export const subscribeUserStateDomains = ({
  uid,
  onDomain,
  onError
}: {
  uid: string;
  onDomain: (
    domain: UserStateDomain,
    value:
      | Timetable
      | Dish[]
      | Category[]
      | LogEntry[]
      | UserMealAddon[]
  ) => void;
  onError: (domain: UserStateDomain, error: Error) => void;
}): Unsubscribe => {
  const unsubscribers = USER_STATE_DOMAINS.map(domain =>
    onSnapshot(
      stateDoc(uid, domain),
      snapshot => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (domain === 'timetable') {
          if (data.value && typeof data.value === 'object') {
            onDomain(domain, data.value as Timetable);
          }
          return;
        }

        if (Array.isArray(data.items)) {
          onDomain(
            domain,
            data.items as
              | Dish[]
              | Category[]
              | LogEntry[]
              | UserMealAddon[]
          );
        }
      },
      error => {
        onError(
          domain,
          error instanceof Error
            ? error
            : new Error(String(error))
        );
      }
    )
  );

  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};
