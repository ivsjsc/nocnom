import assert from 'node:assert/strict';
import { stripUndefinedFields } from '../src/lib/firestoreData';

const source = {
  id: 'd1',
  name: 'Cơm gà',
  imageUrl: undefined,
  nutrition: {
    calories: 780,
    sourceUrl: undefined
  },
  vendors: [
    {
      name: 'Quán A',
      link: undefined
    },
    undefined,
    {
      name: 'Quán B',
      link: 'https://example.com'
    }
  ]
};

const cleaned = stripUndefinedFields(source);

assert.deepEqual(cleaned, {
  id: 'd1',
  name: 'Cơm gà',
  nutrition: {
    calories: 780
  },
  vendors: [
    {
      name: 'Quán A'
    },
    {
      name: 'Quán B',
      link: 'https://example.com'
    }
  ]
});

assert.ok('imageUrl' in source, 'sanitizer must not mutate source objects');
assert.equal(source.vendors.length, 3, 'sanitizer must not mutate source arrays');

console.log('Firestore data serialization tests: PASS');
