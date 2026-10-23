/**
 * همهٔ آزمون‌های بی‌نیاز از ورودی را پشت سر هم اجرا می‌کند.
 *
 *     node tools/tests/run-all.mjs
 *
 * news.test.mjs بیرون می‌ماند چون یک فایل خوراک واقعی به‌عنوان ورودی می‌خواهد.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const suites = ['jalali.test.mjs', 'libs.test.mjs', 'sw.test.mjs', 'updates.test.mjs'];

let failed = 0;
for (const suite of suites) {
  const run = spawnSync(process.execPath, [join(here, suite)], { encoding: 'utf8' });
  const ok = run.status === 0;
  if (!ok) failed += 1;
  const lines = run.stdout.trim().split('\n');
  console.log(`${ok ? 'PASS' : 'FAIL'} ${suite} — ${lines.at(-1)}`);
  if (!ok) console.log(lines.filter((line) => line.startsWith('FAIL')).join('\n'), run.stderr);
}
process.exit(failed ? 1 : 0);
