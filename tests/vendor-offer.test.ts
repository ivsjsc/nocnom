import {
  MAX_PRICE_VND,
  normalizePriceVnd
} from '../src/domain/menu/vendorOffer';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

assert(normalizePriceVnd(35000) === 35000, 'Integer VND price is accepted');
assert(normalizePriceVnd(35000.5) === null, 'Fractional VND price is rejected');
assert(normalizePriceVnd('35000') === null, 'String is not a business VND value');
assert(normalizePriceVnd(Number.NaN) === null, 'NaN VND price is rejected');
assert(normalizePriceVnd(-1) === null, 'Negative VND price is rejected');
assert(normalizePriceVnd(MAX_PRICE_VND + 1) === null, 'Extreme VND price is rejected');

if (failures > 0) process.exit(1);
console.log('Vendor offer tests: PASS');
