/**
 * Fraction Capsule Factory - Exact Fractional Arithmetic & Problem Generator
 * Strictly integer-based rational number operations for elementary math education.
 */

export interface Fraction {
  num: number;
  den: number;
}

export type ProblemType = 'like_add' | 'like_sub' | 'unlike_add' | 'unlike_sub';

export interface Problem {
  id: string;
  type: ProblemType;
  a: Fraction;
  b: Fraction;
  op: '+' | '-';
  answer: Fraction; // Simplified irreducible fraction
  options: Fraction[]; // 6 distinct options (1 correct, 5 distractors)
  correctIndex: number;
  typeDescription: string;
  hint: string;
}

/** Greatest Common Divisor */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Least Common Multiple */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/** Simplifies fraction to lowest terms with positive denominator */
export function simplifyFraction(f: Fraction): Fraction {
  if (f.den === 0) throw new Error('Denominator cannot be zero');
  if (f.num === 0) return { num: 0, den: 1 };

  const g = gcd(f.num, f.den);
  let num = f.num / g;
  let den = f.den / g;

  if (den < 0) {
    num = -num;
    den = -den;
  }
  return { num, den };
}

/** Checks exact equality between two fractions */
export function areFractionsEqual(a: Fraction, b: Fraction): boolean {
  const sa = simplifyFraction(a);
  const sb = simplifyFraction(b);
  return sa.num === sb.num && sa.den === sb.den;
}

/** Adds two fractions */
export function addFractions(a: Fraction, b: Fraction): Fraction {
  const num = a.num * b.den + b.num * a.den;
  const den = a.den * b.den;
  return simplifyFraction({ num, den });
}

/** Subtracts two fractions (a - b) */
export function subtractFractions(a: Fraction, b: Fraction): Fraction {
  const num = a.num * b.den - b.num * a.den;
  const den = a.den * b.den;
  return simplifyFraction({ num, den });
}

/** Converts fraction to string key "num/den" */
export function fractionKey(f: Fraction): string {
  const s = simplifyFraction(f);
  return `${s.num}/${s.den}`;
}

/** Shuffles an array in place using Fisher-Yates */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Common denominators used in elementary school */
const COMMON_LIKE_DENOMS = [3, 4, 5, 6, 7, 8, 9, 10, 12];
const COMMON_UNLIKE_PAIRS: [number, number][] = [
  [2, 4],
  [2, 6],
  [2, 8],
  [3, 6],
  [3, 9],
  [4, 8],
  [4, 12],
  [2, 3],
  [2, 5],
  [3, 4],
  [3, 5],
  [4, 5],
  [5, 6],
  [6, 8],
];

/**
 * Generates elementary fraction problem with realistic student error distractors.
 * @param preferredType Optional specific problem type or random
 * @param difficultyLevel 1 = like denoms only, 2 = unlike denoms only, 3 = mixed
 */
export function generateFractionProblem(
  difficultyLevel: 1 | 2 | 3 = 3,
  preferredType?: ProblemType
): Problem {
  let type: ProblemType;

  if (preferredType) {
    type = preferredType;
  } else if (difficultyLevel === 1) {
    type = Math.random() < 0.5 ? 'like_add' : 'like_sub';
  } else if (difficultyLevel === 2) {
    type = Math.random() < 0.5 ? 'unlike_add' : 'unlike_sub';
  } else {
    const types: ProblemType[] = ['like_add', 'like_sub', 'unlike_add', 'unlike_sub'];
    type = types[Math.floor(Math.random() * types.length)];
  }

  let a: Fraction;
  let b: Fraction;
  let op: '+' | '-';
  let ans: Fraction;
  let typeDesc: string;
  let hintMsg: string;

  if (type === 'like_add') {
    op = '+';
    typeDesc = '분모가 같은 분수의 덧셈';
    hintMsg = '분모가 같을 때는 분모는 그대로 두고 분자끼리만 더해요!';
    const den = COMMON_LIKE_DENOMS[Math.floor(Math.random() * COMMON_LIKE_DENOMS.length)];
    // Ensure proper fractions for elementary grades, sum <= den + 3
    const num1 = Math.floor(Math.random() * (den - 1)) + 1;
    const num2 = Math.floor(Math.random() * (den - 1)) + 1;
    a = { num: num1, den };
    b = { num: num2, den };
    ans = addFractions(a, b);
  } else if (type === 'like_sub') {
    op = '-';
    typeDesc = '분모가 같은 분수의 뺄셈';
    hintMsg = '분모가 같을 때는 분모는 그대로 두고 분자끼리 빼요!';
    const den = COMMON_LIKE_DENOMS[Math.floor(Math.random() * COMMON_LIKE_DENOMS.length)];
    // a > b so result > 0
    let num1 = Math.floor(Math.random() * (den - 1)) + 2;
    let num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
    a = { num: num1, den };
    b = { num: num2, den };
    ans = subtractFractions(a, b);
  } else if (type === 'unlike_add') {
    op = '+';
    typeDesc = '분모가 다른 분수의 덧셈';
    hintMsg = '분모가 다를 때는 공통분모로 통분한 다음 분자를 더해요!';
    const pair = COMMON_UNLIKE_PAIRS[Math.floor(Math.random() * COMMON_UNLIKE_PAIRS.length)];
    const den1 = pair[0];
    const den2 = pair[1];
    const num1 = Math.floor(Math.random() * (den1 - 1)) + 1;
    const num2 = Math.floor(Math.random() * (den2 - 1)) + 1;
    a = { num: num1, den: den1 };
    b = { num: num2, den: den2 };
    ans = addFractions(a, b);
  } else {
    // unlike_sub
    op = '-';
    typeDesc = '분모가 다른 분수의 뺄셈';
    hintMsg = '분모가 다를 때는 공통분모로 통분한 다음 분자를 빼요!';
    const pair = COMMON_UNLIKE_PAIRS[Math.floor(Math.random() * COMMON_UNLIKE_PAIRS.length)];
    const den1 = pair[0];
    const den2 = pair[1];

    let num1 = Math.floor(Math.random() * (den1 - 1)) + 1;
    let num2 = Math.floor(Math.random() * (den2 - 1)) + 1;

    // Ensure a > b
    if (num1 * den2 <= num2 * den1) {
      // Swap or adjust
      if (den1 === den2) {
        num1 = Math.max(num2 + 1, num1);
      } else {
        num1 = den1 - 1;
        num2 = 1;
        if (num1 * den2 <= num2 * den1) {
          num1 = den1; // 1
        }
      }
    }
    a = { num: num1, den: den1 };
    b = { num: num2, den: den2 };
    ans = subtractFractions(a, b);
  }

  // Generate realistic student error distractors
  const distractorsSet = new Set<string>();
  distractorsSet.add(fractionKey(ans));

  const candidateDistractors: Fraction[] = [];

  // Common Misconception 1: Add/sub numerators AND denominators directly
  // e.g. a/b + c/d => (a+c)/(b+d) or (a-c)/(b-d)
  if (op === '+') {
    candidateDistractors.push({ num: a.num + b.num, den: a.den + b.den });
  } else if (a.den !== b.den && a.den - b.den > 0 && a.num - b.num > 0) {
    candidateDistractors.push({ num: a.num - b.num, den: a.den - b.den });
  }

  // Common Misconception 2: Keep first or second denominator without LCM
  // e.g. 1/2 + 1/4 => (1+1)/4 = 2/4 or (1+1)/2 = 2/2
  if (op === '+') {
    candidateDistractors.push({ num: a.num + b.num, den: a.den });
    candidateDistractors.push({ num: a.num + b.num, den: b.den });
  } else {
    if (a.num - b.num > 0) {
      candidateDistractors.push({ num: a.num - b.num, den: a.den });
      candidateDistractors.push({ num: a.num - b.num, den: b.den });
    }
  }

  // Common Misconception 3: Off-by-one in numerator or wrong sign
  if (ans.num > 1) {
    candidateDistractors.push({ num: ans.num - 1, den: ans.den });
  }
  candidateDistractors.push({ num: ans.num + 1, den: ans.den });
  candidateDistractors.push({ num: ans.num + 2, den: ans.den });

  // Common Misconception 4: Denominator multiplied, but numerators simply added without cross-multiplying
  const commonDen = lcm(a.den, b.den);
  candidateDistractors.push({ num: a.num + b.num, den: commonDen });

  // Additional variations using common denominators
  const extraDenoms = [ans.den, 2, 3, 4, 6, 8, 10, 12];
  for (const d of extraDenoms) {
    for (let n = 1; n <= Math.max(d * 2, 10); n++) {
      candidateDistractors.push({ num: n, den: d });
    }
  }

  // Collect exactly 5 unique distractors (so 6 total options)
  const options: Fraction[] = [ans];

  for (const cand of candidateDistractors) {
    if (cand.den <= 0 || cand.num <= 0) continue;
    const simp = simplifyFraction(cand);
    const key = fractionKey(simp);
    if (!distractorsSet.has(key)) {
      distractorsSet.add(key);
      options.push(simp);
      if (options.length === 6) break;
    }
  }

  // If still fewer than 6, fill with random positive fractions
  let fillNum = 1;
  while (options.length < 6) {
    const simp = simplifyFraction({ num: fillNum, den: ans.den });
    const key = fractionKey(simp);
    if (!distractorsSet.has(key)) {
      distractorsSet.add(key);
      options.push(simp);
    }
    fillNum++;
  }

  // Shuffle the 6 options
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.findIndex((f) => areFractionsEqual(f, ans));

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    a,
    b,
    op,
    answer: ans,
    options: shuffledOptions,
    correctIndex,
    typeDescription: typeDesc,
    hint: hintMsg,
  };
}
