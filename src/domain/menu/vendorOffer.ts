export const MAX_PRICE_VND = 100_000_000;

export type VendorOffer = {
  vendorId: string;
  dishId: string;
  priceVnd: number;
  portion?: 'S' | 'M' | 'L' | 'standard';
  availability?: 'available' | 'unavailable' | 'unknown';
};

export const normalizePriceVnd = (
  value: unknown
): number | null => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_PRICE_VND
  ) {
    return null;
  }

  return value;
};
