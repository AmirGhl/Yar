import { toJalali, fromJalali, jalaliMonthLength, isJalaliLeapYear, persianWeekday, JALALI_MONTHS, JALALI_WEEKDAYS } from '../../src/lib/jalali.js';
const cases = [
  ['2026-08-21', [1405, 5, 30]],
  ['2026-03-21', [1405, 1, 1]],
  ['2025-03-21', [1404, 1, 1]],
  ['2024-03-20', [1403, 1, 1]],
  ['2000-01-01', [1378, 10, 11]],
  ['1979-02-11', [1357, 11, 22]],
];
let ok = true;
for (const [g, exp] of cases) {
  const [y,m,d] = g.split('-').map(Number);
  const j = toJalali(new Date(y, m-1, d));
  const got = [j.jy, j.jm, j.jd];
  const pass = got.join()===exp.join();
  ok &&= pass;
  console.log(pass?'PASS':'FAIL', g, '->', got.join('/'), 'expected', exp.join('/'));
}
// round-trip 40 years
let rt = 0;
for (let jy=1380; jy<1420; jy++) for (let jm=1; jm<=12; jm++) {
  const len = jalaliMonthLength(jy, jm);
  for (let jd=1; jd<=len; jd++) {
    const b = toJalali(fromJalali(jy,jm,jd));
    if (b.jy!==jy||b.jm!==jm||b.jd!==jd) { rt++; if(rt<4) console.log('RT FAIL', jy,jm,jd,'->',b); }
  }
}
console.log(rt===0?'PASS round-trip 40y':'FAIL round-trip: '+rt);
const now = new Date(2026,7,21);
console.log('today:', JALALI_WEEKDAYS[persianWeekday(now)], toJalali(now).jd, JALALI_MONTHS[toJalali(now).jm-1], toJalali(now).jy);
console.log('leap 1403:', isJalaliLeapYear(1403), '| 1404:', isJalaliLeapYear(1404), '| 1408:', isJalaliLeapYear(1408));
process.exit(ok && rt===0 ? 0 : 1);
