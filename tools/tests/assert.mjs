/** کمک‌تابع کوچک آزمون: بدون وابستگی، خروجی PASS/FAIL و کد خروج درست. */

let failed = 0;
let passed = 0;

export function check(condition, label) {
  if (condition) passed += 1;
  else failed += 1;
  console.log(condition ? 'PASS' : 'FAIL', label);
}

export function summary(name) {
  console.log(`\n${name}: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
