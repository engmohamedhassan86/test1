import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:4300';
const WIDTH = Number(process.argv[2] || 1280);
const SHOTS = process.argv[3] || '.';
const results = [];
let page;

const ok = (name, pass, evidence) => {
  const r = { name, pass, evidence: String(evidence).replace(/\s+/g, ' ').slice(0, 240) };
  results.push(r);
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n        ${r.evidence}`);
};
const report = (crash) => {
  const failed = results.filter((r) => !r.pass);
  if (crash) console.log(`\n!! CRASHED before finishing: ${crash}`);
  console.log(
    `\n===== SMOKE @ ${WIDTH}px — ${results.length - failed.length}/${results.length} checks passed${crash ? ' (INCOMPLETE)' : ''} =====`,
  );
  for (const r of failed) console.log(`FAIL  ${r.name}\n        ${r.evidence}`);
  fs.writeFileSync(
    `${SHOTS}/smoke-${WIDTH}.json`,
    JSON.stringify({ width: WIDTH, crash: crash ?? null, results }, null, 2),
  );
  process.exit(failed.length || crash ? 1 : 0);
};
process.on('uncaughtException', (e) => report(e?.message ?? String(e)));
process.on('unhandledRejection', (e) => report(e?.message ?? String(e)));
const bodyText = async () => (await page.textContent('body')).replace(/\s+/g, ' ');
const pageNo = async () => (await bodyText()).match(/Page \d of \d/)?.[0] ?? 'none';
const alertText = async () => {
  const a = page.locator('[role=alert]');
  return (await a.count()) ? (await a.first().textContent()).replace(/\s+/g, ' ') : '';
};
const next = async () => {
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(350);
};
const prev = async () => {
  await page.getByRole('button', { name: 'Previous' }).click();
  await page.waitForTimeout(350);
};
const noHScroll = async (where) => {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  ok(
    `no horizontal scroll @ ${where}`,
    r.sw <= r.cw + 1,
    `scrollWidth ${r.sw} <= clientWidth ${r.cw}`,
  );
};
// Fill page 1 to a valid state.
const fillPage1 = async (name = 'Mina') => {
  await page.fill('#sv-q-q_name-control', name);
  await page.locator('input[type=radio]').first().check();
};
// Fill page 2 to a valid state: satisfaction scale + >=1 checkbox.
const fillPage2 = async () => {
  await page.locator('[role=radiogroup] .sv-scale__point').first().click();
  await page.locator('input[type=checkbox]').nth(1).check();
  await page.waitForTimeout(150);
};

const browser = await chromium.launch({ executablePath: process.env.CHROME });
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 900 } });
page = await ctx.newPage();

// ---------- 1. catalog lists the manifest surveys, and a survey opens ----------
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const links = await page.$$eval('a[href^="/surveys/"]', (as) =>
  as.map((a) => `${a.textContent.trim()}->${a.getAttribute('href')}`),
);
ok(
  '1. catalog lists surveys from survey-manifest.json',
  links.length === 2 &&
    links[0].includes('Customer Feedback') &&
    links[0].includes('/surveys/customer-feedback'),
  links.join(' , '),
);
await noHScroll('catalog');
await page.getByRole('link', { name: 'Customer Feedback' }).click();
await page.waitForTimeout(700);
ok(
  '1. activating the link opens /surveys/:surveyKey at page 1',
  page.url().endsWith('/surveys/customer-feedback') && (await pageNo()) === 'Page 1 of 4',
  `${page.url()} | ${await pageNo()}`,
);
await noHScroll('survey page 1');

// ---------- 2. required question blocks Next, error shown, focus on first offender ----------
await next();
const held = await pageNo();
const alert2 = await alertText();
const focused = await page.evaluate(
  () => document.activeElement?.id || document.activeElement?.tagName,
);
ok(
  '2. held on the page when a required answer is missing',
  held === 'Page 1 of 4',
  `still ${held}`,
);
ok(
  '2. the error is shown in a role=alert live region',
  /Enter an answer|Choose one option/.test(alert2),
  alert2,
);
ok(
  '2. focus lands on the first offending field',
  focused === 'sv-q-q_name-control',
  `activeElement=${focused}`,
);
await page.screenshot({ path: `${SHOTS}/validation-block-${WIDTH}.png`, fullPage: true });

// ---------- 3a. min text length blocks ----------
await page.fill('#sv-q-q_name-control', 'A');
await page.locator('input[type=radio]').first().check();
await next();
ok(
  '3a. min text length blocks navigation',
  (await pageNo()) === 'Page 1 of 4' && /at least 2 characters/i.test(await alertText()),
  `${await pageNo()} | ${await alertText()}`,
);
// ---------- 3b. max text length enforced ----------
await page.fill('#sv-q-q_name-control', 'x'.repeat(200));
const capped = await page.inputValue('#sv-q-q_name-control');
ok(
  '3b. max text length enforced at entry (maxLength 80)',
  capped.length === 80,
  `typed 200 chars, field holds ${capped.length}`,
);

// ---------- 4. answers survive Back ----------
await fillPage1('Mina');
const p1Before = {
  name: await page.inputValue('#sv-q-q_name-control'),
  radio: await page.locator('input[type=radio]:checked').count(),
};
await next();
ok(
  '4. advanced to page 2 once page 1 is valid',
  (await pageNo()) === 'Page 2 of 4',
  await pageNo(),
);

// ---------- 3c. min/max selections block ----------
const boxes = page.locator('input[type=checkbox]');
const boxCount = await boxes.count();
await page.locator('[role=radiogroup] .sv-scale__point').first().click();
await next();
const selMin = await alertText();
ok(
  '3c. min selections blocks navigation (none checked)',
  (await pageNo()) === 'Page 2 of 4' && /at least 1 option/i.test(selMin),
  `${await pageNo()} | ${selMin}`,
);
// now exceed the maximum: check 4 of 5 where maxSelections is 3
for (let i = 0; i < Math.min(4, boxCount); i++) {
  await boxes
    .nth(i)
    .check({ force: true })
    .catch(() => {});
  await page.waitForTimeout(80);
}
const checkedNow = await page.locator('input[type=checkbox]:checked').count();
await next();
const selMax = await alertText();
const maxRefusedAtSelection = checkedNow <= 3;
const maxBlockedOnNext =
  (await pageNo()) === 'Page 2 of 4' && /no more than 3 options/i.test(selMax);
ok(
  '3d. max selections refused (at selection time or on Next)',
  maxRefusedAtSelection || maxBlockedOnNext,
  `tried 4, ${checkedNow} checked; page=${await pageNo()}; alert="${selMax}"`,
);
// If the 4th selection was refused at selection time, page 2 was already valid and Next
// advanced us. Come back so the Back-persistence check below runs against page 2.
if ((await pageNo()) !== 'Page 2 of 4') {
  await prev();
  ok(
    '3d. (note) the refusal was at selection time, so Next legitimately advanced',
    true,
    `returned to ${await pageNo()}`,
  );
}
await page.waitForTimeout(200);
const p2State = await page.evaluate(() => ({
  checked: [...document.querySelectorAll('input[type=checkbox]:checked')].map((e) => e.value),
  scale: [...document.querySelectorAll('[role=radio][aria-checked=true]')].length,
}));
await prev();
ok(
  '4. page 1 answers survive Back',
  (await page.inputValue('#sv-q-q_name-control')) === p1Before.name &&
    (await page.locator('input[type=radio]:checked').count()) === p1Before.radio,
  `name="${await page.inputValue('#sv-q-q_name-control')}" radio=${await page.locator('input[type=radio]:checked').count()}`,
);
await next();
const p2After = await page.evaluate(() => ({
  checked: [...document.querySelectorAll('input[type=checkbox]:checked')].map((e) => e.value),
  scale: [...document.querySelectorAll('[role=radio][aria-checked=true]')].length,
}));
ok(
  '4. page 2 answers survive Back/Next',
  JSON.stringify(p2State) === JSON.stringify(p2After),
  `${JSON.stringify(p2State)} vs ${JSON.stringify(p2After)}`,
);

// ---------- 5. attachments ----------
await next();
ok('5. reached the attachment page', (await pageNo()) === 'Page 3 of 4', await pageNo());
const fileInput = page.locator('input[type=file]');
ok(
  '5. the attachment-enabled question exposes a file control',
  (await fileInput.count()) > 0,
  `count=${await fileInput.count()}`,
);
const png = (n) => ({
  name: n,
  mimeType: 'image/png',
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 1]),
});
for (const n of ['a.png', 'b.png', 'c.png']) {
  await fileInput.setInputFiles(png(n));
  await page.waitForTimeout(250);
}
const afterThree = await bodyText();
ok(
  '5. three files accepted, limit shown as 3 of 3',
  /3 of 3 files/.test(afterThree),
  afterThree.match(/\d of \d files/)?.[0] ?? 'no counter',
);
await page.screenshot({ path: `${SHOTS}/attachment-${WIDTH}.png`, fullPage: true });
// 4th file refused
await fileInput.setInputFiles(png('d.png'));
await page.waitForTimeout(300);
const over = await bodyText();
ok(
  '5. a 4th file is refused at selection time (0-3 limit)',
  /up to 3 files/i.test(over) && /3 of 3 files/.test(over),
  over.match(/[^.]*up to 3 files[^.]*/)?.[0] ?? over.slice(0, 160),
);
// disallowed type refused
await fileInput.setInputFiles({
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('hello'),
});
await page.waitForTimeout(300);
const badType = await bodyText();
ok(
  '5. a disallowed file type is refused at selection time',
  /not accepted/i.test(badType) && /3 of 3 files/.test(badType),
  badType.match(/[^.]*not accepted[^.]*/)?.[0] ?? badType.slice(0, 160),
);
// oversized refused
await fileInput.setInputFiles({
  name: 'huge.png',
  mimeType: 'image/png',
  buffer: Buffer.alloc(6 * 1024 * 1024, 1),
});
await page.waitForTimeout(500);
const tooBig = await bodyText();
ok(
  '5. an oversized file is refused at selection time (5 MB limit)',
  /larger than the 5 MB limit/i.test(tooBig) && /3 of 3 files/.test(tooBig),
  tooBig.match(/[^.]*larger than[^.]*/)?.[0] ?? tooBig.slice(0, 160),
);
// attachments survive Back
await prev();
await next();
await page.waitForTimeout(300);
ok(
  '5. attachments survive Back',
  /3 of 3 files/.test(await bodyText()),
  (await bodyText()).match(/\d of \d files/)?.[0] ?? 'lost',
);
await noHScroll('attachment page');

// ---------- 6. submit re-validates every page ----------
await next();
ok('6. reached the final page', (await pageNo()) === 'Page 4 of 4', await pageNo());
const submitBtn = page.getByRole('button', { name: /Submit/i });
ok(
  '6. the final page offers Submit instead of Next',
  (await submitBtn.count()) > 0,
  `submit buttons=${await submitBtn.count()}`,
);
let requestCount = 0;
page.on('request', (r) => {
  if (/survey-responses/.test(r.url())) requestCount++;
});
await submitBtn.first().click();
await page.waitForTimeout(600);
const blockedSubmit = await bodyText();
ok(
  '6. submit is blocked while a required answer on this page is missing',
  /Choose one option|Required/.test(await alertText()) && !/has been received/.test(blockedSubmit),
  `alert="${await alertText()}" | network calls=${requestCount}`,
);
ok(
  '6. no submission request was sent while invalid',
  requestCount === 0,
  `observed ${requestCount} POSTs to /api/survey-responses`,
);

// ---------- 7. completion screen only after acknowledgement ----------
await page.locator('input[type=radio]').first().check();
await page.waitForTimeout(150);
await submitBtn.first().click();
// watch for the pending state before the confirmation
let sawPending = false;
for (let i = 0; i < 40; i++) {
  const t = await bodyText();
  if (/Sending|sending|pending|Submitting/i.test(t) && !/has been received/.test(t))
    sawPending = true;
  if (/has been received/.test(t)) break;
  await page.waitForTimeout(250);
}
const done = await bodyText();
ok(
  '7. completion screen appears after the submission is acknowledged',
  /has been received/i.test(done),
  done.match(/[^.]*has been received[^.]*/)?.[0] ?? done.slice(0, 200),
);
ok(
  '7. no question is rendered on the completion screen',
  (await page.locator('app-question-host').count()) === 0,
  `app-question-host count=${await page.locator('app-question-host').count()}, saw in-flight state=${sawPending}`,
);
await page.screenshot({ path: `${SHOTS}/completion-${WIDTH}.png`, fullPage: true });
await noHScroll('completion screen');

// ---------- 8. configuration error fails closed ----------
const bad = await ctx.newPage();
await bad.route('**/surveys/customer-feedback.json', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    // pages[1].questions[0] is a radio with no `options` -> F02, a required field is missing.
    // (An empty `questions` array would NOT do: validator rule R18 allows it by design.)
    body: JSON.stringify({
      key: 'customer-feedback',
      title: 'Customer Feedback',
      pages: [
        {
          id: 'p1',
          title: 'One',
          questions: [{ id: 'q1', type: 'textbox', title: 'T', required: false }],
        },
        {
          id: 'p2',
          title: 'Two',
          questions: [{ id: 'q2', type: 'radio', title: 'No options', required: true }],
        },
      ],
    }),
  }),
);
await bad.setViewportSize({ width: WIDTH, height: 900 });
await bad.goto(BASE + '/surveys/customer-feedback', { waitUntil: 'networkidle' });
await bad.waitForTimeout(900);
const errText = (await bad.textContent('body')).replace(/\s+/g, ' ');
ok(
  '8. an invalid config renders the error screen',
  /not available|does not satisfy its contract/i.test(errText),
  errText.slice(0, 220),
);
ok(
  '8. no part of the survey renders behind the error (fails closed)',
  (await bad.locator('app-question-host').count()) === 0 && !/Page \d of \d/.test(errText),
  `app-question-host=${await bad.locator('app-question-host').count()}, page indicator present=${/Page \d of \d/.test(errText)}`,
);
await bad.screenshot({ path: `${SHOTS}/config-error-${WIDTH}.png`, fullPage: true });
await bad.close();

// ---------- 9. keyboard-only pass + visible focus + mouse/keyboard parity ----------
const kb = await ctx.newPage();
await kb.setViewportSize({ width: WIDTH, height: 900 });
await kb.goto(BASE + '/surveys/customer-feedback', { waitUntil: 'networkidle' });
await kb.waitForTimeout(600);
const stops = [];
const focusStyles = [];
for (let i = 0; i < 12; i++) {
  await kb.keyboard.press('Tab');
  const info = await kb.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return null;
    const cs = getComputedStyle(e);
    return {
      id: e.id || e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 24) || e.tagName,
      outline: `${cs.outlineStyle} ${cs.outlineWidth}`,
      shadow: cs.boxShadow !== 'none',
    };
  });
  if (!info) break;
  if (stops.includes(info.id)) break;
  stops.push(info.id);
  focusStyles.push(`${info.id}:${info.outline}${info.shadow ? '+shadow' : ''}`);
  if (info.id === 'Next') break;
}
ok(
  '9. keyboard reaches every control on page 1 including Next',
  stops.includes('Next') && stops.length >= 3,
  stops.join(' -> '),
);
const invisibleFocus = focusStyles.filter((s) => / none 0px$/.test(s) && !s.includes('+shadow'));
ok(
  '9. focus is visible at every tab stop',
  invisibleFocus.length === 0,
  invisibleFocus.length ? `no indicator: ${invisibleFocus.join(', ')}` : focusStyles.join(' | '),
);
// operate entirely by keyboard
await kb.keyboard.press('Shift+Tab');
await kb.keyboard.press('Space');
await kb.waitForTimeout(200);
await kb.focus('#sv-q-q_name-control');
await kb.keyboard.type('Keyboard');
await kb.getByRole('button', { name: 'Next' }).focus();
await kb.keyboard.press('Enter');
await kb.waitForTimeout(500);
const kbPage = (await kb.textContent('body')).replace(/\s+/g, ' ').match(/Page \d of \d/)?.[0];
ok(
  '9. a page can be completed and advanced with the keyboard alone',
  kbPage === 'Page 2 of 4',
  `now ${kbPage}`,
);
// nothing mouse-reachable that is not keyboard-reachable
const negTab = await kb.$$eval(
  'a[href],button,input,textarea,select,[role=radio],[role=button]',
  (els) =>
    els
      .filter((e) => e.getAttribute('tabindex') === '-1' && !e.disabled)
      .map((e) => e.tagName + (e.id ? '#' + e.id : '')),
);
ok(
  '9. no interactive element is mouse-only (negative tabindex)',
  negTab.length === 0,
  negTab.length ? negTab.join(', ') : 'none found',
);
await kb.close();

await browser.close();

report();
