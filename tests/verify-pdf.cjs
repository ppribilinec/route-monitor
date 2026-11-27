const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const {createCanvas, DOMMatrix, ImageData, Path2D} = require('@napi-rs/canvas');
Object.assign(globalThis, {DOMMatrix, ImageData, Path2D});
// jsQR may also be supplied as an absolute path for a one-off local verification.
const decode = require(process.env.JSQR_PATH || 'jsqr');
(async () => {
  const pdfjsPath = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'legacy/build/pdf.mjs');
  const {getDocument} = await import(pathToFileURL(pdfjsPath));
  const directory = path.resolve(__dirname, '../test-results');
  const pdf = await getDocument({data: new Uint8Array(await fs.readFile(path.join(directory, 'depot-qr.pdf'))),
    useSystemFonts: true, isEvalSupported: false}).promise;
  const tokens = ['original-token', 'inactive-token', 'archive-token'];
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({scale: 2});
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    await page.render({canvasContext: context, viewport}).promise;
    await fs.writeFile(path.join(directory, `pdf-page-${number}.png`), canvas.toBuffer('image/png'));
    // Decode the poster's QR area, excluding the large headings below it.
    const pixels = context.getImageData(155, 203, 882, 882);
    const qr = decode(pixels.data, pixels.width, pixels.height);
    assert.ok(qr, `Page ${number} must contain a readable QR`);
    assert.equal(new URL(qr.data).searchParams.get('qr'), tokens[number - 1]);
    assert.equal(new URL(qr.data).pathname, '/');
    console.log(`PDF page ${number}: decoded correct route token; A4 page rendered.`);
  }
  await pdf.destroy();
})().catch(error => {console.error(error); process.exitCode = 1;});
