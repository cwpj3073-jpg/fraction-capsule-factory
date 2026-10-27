import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gcd,
  lcm,
  simplifyFraction,
  areFractionsEqual,
  addFractions,
  subtractFractions,
  generateFractionProblem,
  fractionKey,
} from './fraction.ts';

test('gcd and lcm calculation', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(7, 13), 1);
  assert.equal(lcm(4, 6), 12);
  assert.equal(lcm(3, 5), 15);
});

test('fraction simplification and equality', () => {
  const f1 = simplifyFraction({ num: 4, den: 8 });
  assert.deepEqual(f1, { num: 1, den: 2 });

  const f2 = simplifyFraction({ num: 6, den: 9 });
  assert.deepEqual(f2, { num: 2, den: 3 });

  assert.equal(areFractionsEqual({ num: 2, den: 4 }, { num: 5, den: 10 }), true);
  assert.equal(areFractionsEqual({ num: 1, den: 3 }, { num: 2, den: 5 }), false);
});

test('fraction addition', () => {
  // 1/3 + 1/3 = 2/3
  const res1 = addFractions({ num: 1, den: 3 }, { num: 1, den: 3 });
  assert.deepEqual(res1, { num: 2, den: 3 });

  // 1/2 + 1/4 = 3/4
  const res2 = addFractions({ num: 1, den: 2 }, { num: 1, den: 4 });
  assert.deepEqual(res2, { num: 3, den: 4 });

  // 1/3 + 1/2 = 5/6
  const res3 = addFractions({ num: 1, den: 3 }, { num: 1, den: 2 });
  assert.deepEqual(res3, { num: 5, den: 6 });
});

test('fraction subtraction', () => {
  // 3/4 - 1/4 = 2/4 = 1/2
  const res1 = subtractFractions({ num: 3, den: 4 }, { num: 1, den: 4 });
  assert.deepEqual(res1, { num: 1, den: 2 });

  // 3/4 - 1/2 = 1/4
  const res2 = subtractFractions({ num: 3, den: 4 }, { num: 1, den: 2 });
  assert.deepEqual(res2, { num: 1, den: 4 });
});

test('problem generator generates exactly 6 unique options with correct answer', () => {
  for (let i = 0; i < 20; i++) {
    const p = generateFractionProblem(3);
    assert.equal(p.options.length, 6, 'Must generate exactly 6 options');

    // Check uniqueness
    const keys = new Set(p.options.map(fractionKey));
    assert.equal(keys.size, 6, 'All 6 options must be unique');

    // Check that correctIndex corresponds to answer
    assert.ok(p.correctIndex >= 0 && p.correctIndex < 6);
    assert.ok(areFractionsEqual(p.options[p.correctIndex], p.answer));

    // Verify mathematical correctness
    const expected =
      p.op === '+' ? addFractions(p.a, p.b) : subtractFractions(p.a, p.b);
    assert.deepEqual(p.answer, expected);
  }
});
