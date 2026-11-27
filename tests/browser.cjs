const {chromium} = require('playwright');
const {createServer} = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {PDFDocument} = require('../vendor/pdf-lib-1.17.1.min.js');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css'};
(async () => {
  await fs.mkdir(output, {recursive: true});
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const target = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try { res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream'); res.end(await fs.readFile(target)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const mock = await fs.readFile(path.join(__dirname, 'firebase-mock.mjs'), 'utf8');
    // One shared mock module keeps all Firebase SDK imports on the same in-memory database.
    await page.route('https://www.gstatic.com/firebasejs/**', route => route.fulfill({
      contentType: 'text/javascript', body: `export * from '/tests/firebase-mock.mjs';`,
    }));
    await page.route('**/tests/firebase-mock.mjs', route => route.fulfill({contentType: 'text/javascript', body: mock}));
    const base = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(base);
    await page.getByRole('button', {name: 'Depa a trasy', exact: true}).click();
    const north = page.locator('section').filter({has: page.getByRole('heading', {name: 'Severní Čechy', exact: true})}).last();
    await north.locator('tbody tr').first().waitFor();
    assert.equal(await page.locator('canvas,img').count(), 0, 'No inline QR previews');
    assert.equal(await north.locator('tbody tr').count(), 3);
    assert.equal(await page.getByRole('button', {name: 'Export QR kódů', exact: true}).count(), 4);
    const original = north.locator('tbody tr').filter({has: page.getByRole('rowheader', {name: 'Trasa A', exact: true})});
    await original.getByRole('button', {name: 'Kopírovat', exact: true}).click();
    let dialog = page.getByRole('dialog');
    assert.equal(await dialog.getByLabel('Trasa', {exact: true}).inputValue(), 'Trasa A');
    assert.equal(await dialog.getByLabel('Přistavení', {exact: true}).inputValue(), '23:30');
    assert.equal(await dialog.getByLabel('Výjezd', {exact: true}).inputValue(), '01:15');
    assert.equal(await dialog.getByLabel('Směna / časové označení').inputValue(), 'Ráno');
    await dialog.getByLabel('Trasa', {exact: true}).fill('Trasa B');
    await dialog.getByLabel('Depo', {exact: true}).selectOption('south');
    await dialog.getByLabel('Přistavení', {exact: true}).fill('22:15');
    await dialog.getByLabel('Výjezd', {exact: true}).fill('02:00');
    await dialog.getByLabel('Směna / časové označení').fill('Noc');
    await dialog.getByLabel('Deaktivovat od data (včetně)').fill('2026-12-01');
    await dialog.getByLabel('Archivovaná trasa').check();
    await dialog.getByRole('button', {name: 'Vytvořit kopii trasy'}).click();
    await dialog.waitFor({state: 'detached'});
    let db = await page.evaluate(() => window.testDb);
    const [copyId, copy] = Object.entries(db.routes).find(([, route]) => route.name === 'Trasa B');
    assert.notEqual(copyId, 'original'); assert.notEqual(copy.qr, 'original-token');
    assert.equal(copy.depot, 'south'); assert.equal(copy.shift, 'Noc');
    assert.equal(copy.plannedArrival, '22:15'); assert.equal(copy.plannedDeparture, '02:00');
    assert.equal(copy.disabledFrom, '2026-12-01'); assert.equal(copy.archived, true);
    assert.equal(copy.customSetting, 'preserve-me');
    assert.equal(db.qr[copy.qr].route, copyId); assert.equal(db.qr[copy.qr].enabled, false);
    assert.equal(db.qr['original-token'].enabled, true);
    assert.equal(db.states[copyId], undefined); assert.equal(db.states.original.loading, 'existing-loading');
    await original.getByRole('button', {name: 'Editovat', exact: true}).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Depo', {exact: true}).selectOption('south');
    await dialog.getByRole('button', {name: 'Uložit trasu'}).click();
    await dialog.getByRole('status').filter({hasText: 'Nejprve ukončete nakládku.'}).waitFor();
    await dialog.getByLabel('Depo', {exact: true}).selectOption('north');
    await dialog.getByLabel('Směna / časové označení').fill('Ráno upraveno');
    await dialog.getByRole('button', {name: 'Uložit trasu'}).click();
    await dialog.waitFor({state: 'detached'});
    db = await page.evaluate(() => window.testDb);
    assert.equal(db.routes.original.qr, 'original-token');
    assert.equal(db.routes.original.customSetting, 'preserve-me');
    await original.getByRole('button', {name: 'Zobrazit náhled QR'}).click();
    dialog = page.getByRole('dialog');
    await dialog.locator('canvas').waitFor();
    assert.equal(await dialog.getByRole('link').getAttribute('href'), base + '?qr=original-token');
    await fs.writeFile(path.join(output, 'expected-qr.json'), JSON.stringify(['original-token', 'inactive-token', 'archive-token'].map(token => base + '?qr=' + token)));
    const previewPng = await dialog.locator('canvas').evaluate(canvas => canvas.toDataURL().split(',')[1]);
    await fs.writeFile(path.join(output, 'preview-qr.png'), Buffer.from(previewPng, 'base64'));
    await dialog.screenshot({path: path.join(output, 'qr-preview.png')});
    await dialog.getByRole('button', {name: 'Zavřít', exact: true}).click();
    const downloadEvent = page.waitForEvent('download');
    await north.getByRole('button', {name: 'Export QR kódů', exact: true}).click();
    const download = await downloadEvent;
    const pdfPath = path.join(output, 'depot-qr.pdf');
    await download.saveAs(pdfPath);
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    assert.equal(pdf.getPageCount(), 3);
    for (const p of pdf.getPages()) { assert.ok(Math.abs(p.getWidth() - 595.28) < .01); assert.ok(Math.abs(p.getHeight() - 841.89) < .01); }
    // Missing QR data and empty depots fail explicitly instead of producing partial PDFs.
    await page.evaluate(async () => {
      const {buildDepotQrPdf} = await import('/route-tools.mjs?v=3.1');
      for (const routes of [[], [{name: 'Chybí token'}]]) {
        try { await buildDepotQrPdf({name: 'Test'}, routes); throw Error('Expected failure'); }
        catch (e) { if (e.message === 'Expected failure') throw e; }
      }
    });
    await page.screenshot({path: path.join(output, 'route-list.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    await original.getByRole('button', {name: 'Kopírovat', exact: true}).click();
    await page.getByRole('dialog').screenshot({path: path.join(output, 'copy-mobile.png')});
    await page.getByRole('dialog').getByRole('button', {name: 'Zavřít', exact: true}).click();
    for (const [routeName, disabledFrom, archived] of [['Odpolední', '2026-11-28', false], ['Archivovaná', '', true]]) {
      await north.locator('tbody tr').filter({has: page.getByRole('rowheader', {name: routeName, exact: true})})
        .getByRole('button', {name: 'Kopírovat', exact: true}).click();
      const copyDialog = page.getByRole('dialog');
      assert.equal(await copyDialog.getByLabel('Deaktivovat od data (včetně)').inputValue(), disabledFrom);
      assert.equal(await copyDialog.getByLabel('Archivovaná trasa').isChecked(), archived);
      await copyDialog.getByRole('button', {name: 'Zavřít', exact: true}).click();
    }
    // Regression: the unchanged driver flow can finish an existing loading and start a new one.
    await page.goto(base + '?qr=original-token');
    await page.getByRole('button', {name: 'Odjezd', exact: true}).click();
    await page.getByRole('heading', {name: 'Odjezd uložen', exact: true}).waitFor();
    assert.equal(await page.evaluate(() => window.testDb.states.original.active), false);
    await page.getByRole('button', {name: 'Zpět', exact: true}).click();
    await page.getByRole('button', {name: 'Příjezd', exact: true}).click();
    await page.getByLabel('SPZ (nepovinná)').fill('1ab 2345');
    await page.getByRole('button', {name: 'Potvrdit příjezd a SPZ'}).click();
    await page.getByRole('heading', {name: 'Příjezd uložen', exact: true}).waitFor();
    db = await page.evaluate(() => window.testDb);
    const loading = db.loadings[db.states.original.loading];
    assert.equal(loading.plate, '1AB 2345'); assert.equal(loading.token, 'original-token');
    assert.equal(loading.route, 'original'); assert.equal(loading.depot, 'north');
    assert.equal(loading.plannedArrival, '23:30'); assert.equal(loading.plannedDeparture, '01:15');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('Browser tests passed: compact rows, copy/edit, active-loading guard, stable QR, Unicode preview, 3-page A4 PDF, mobile form, inactive/archived copies, driver arrival/departure.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
