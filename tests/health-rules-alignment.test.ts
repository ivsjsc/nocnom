import fs from 'node:fs';
import { HEALTH_LIMITS } from '../src/lib/healthUtils';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const rules = fs.readFileSync('firestore.rules', 'utf8');

assert(
  rules.includes(`request.resource.data.heightCm >= ${HEALTH_LIMITS.heightCm.min}`) &&
    rules.includes(`request.resource.data.heightCm <= ${HEALTH_LIMITS.heightCm.max}`),
  'Firestore height limits match health domain constants'
);
assert(
  rules.includes(`request.resource.data.weightKg >= ${HEALTH_LIMITS.weightKg.min}`) &&
    rules.includes(`request.resource.data.weightKg <= ${HEALTH_LIMITS.weightKg.max}`),
  'Firestore weight limits match health domain constants'
);

if (failures > 0) process.exit(1);
console.log('Health rules alignment tests: PASS');
