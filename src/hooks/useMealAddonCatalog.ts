import { useEffect, useMemo, useState } from 'react';
import {
  loadNutritionAddons,
  mergeNutritionAddons,
  type NutritionAddonOption
} from '../lib/nutritionKnowledge';
import { mockDb } from '../lib/db';
import type { UserMealAddon } from '../domain/meal/addonNormalizer';

export const useMealAddonCatalog = () => {
  const [baseItems, setBaseItems] = useState<NutritionAddonOption[]>([]);
  const [customItems, setCustomItems] = useState<UserMealAddon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = mockDb.subscribeMealAddons(setCustomItems);

    void loadNutritionAddons()
      .then(rows => {
        if (!active) return;
        setBaseItems(rows);
      })
      .catch(error => {
        console.warn('[meal-addons] Unable to load nutrition addon catalog', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const items = useMemo(
    () => mergeNutritionAddons(baseItems, customItems),
    [baseItems, customItems]
  );

  return {
    items,
    loading
  };
};
