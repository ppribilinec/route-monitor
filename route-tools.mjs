// Pure route data helpers are shared by the editor, preview and PDF export.
const routeCollator = new Intl.Collator('cs', {numeric: true, sensitivity: 'base'});
export function compareRouteNames(a, b) {
  return routeCollator.compare(String(a || '').trim(), String(b || '').trim());
}

export function sortRoutes(routes) {
  return [...routes].sort((a, b) => compareRouteNames(a.name, b.name) ||
    String(a.id || '').localeCompare(String(b.id || '')));
}

export function normalizedRouteName(name) {
  return String(name || '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('cs');
}

export function assertUniqueRouteName(route, routes, ownId) {
  const name = normalizedRouteName(route.name);
  if (routes.some(other => other.id !== ownId && other.depot === route.depot && normalizedRouteName(other.name) === name)) {
    throw Error('V tomto depu již existuje trasa se stejným názvem. Zadejte jiný název (platí i pro archivované a deaktivované trasy).');
  }
}

export function routeFields(route = {}) {
  const {id, qr, arrival, departure, createdAt, updatedAt, ...fields} = route;
  return fields;
}

export function routeQrUrl(route, base = location.href) {
  if (!route.qr) throw Error(`Trasa „${route.name}“ nemá QR token. Nejprve ji uložte v editoru.`);
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('qr', route.qr);
  return url.href;
}

export function validateRoute(route) {
  if (!route.name.trim()) throw Error('Zadejte název trasy.');
  if (!route.depot) throw Error('Vyberte depo.');
  for (const time of [route.plannedArrival, route.plannedDeparture]) {
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Neplatný plánovaný čas.');
  }
  const date = route.disabledFrom;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    throw Error('Neplatné datum deaktivace.');
  }
}

export function routeStatus(route) {
  return route.archived ? 'Archivovaná trasa' : route.disabledFrom ? `Deaktivace od ${route.disabledFrom}` : 'Aktivní';
}

export function openDialog(title) {
  const dialog = document.createElement('dialog');
  dialog.className = 'route-dialog';
  const heading = document.createElement('h2');
  heading.id = 'route-dialog-title';
  heading.textContent = title;
  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.append(heading);
  const close = document.createElement('button');
  close.textContent = 'Zavřít';
  close.type = 'button';
  close.onclick = () => dialog.close();
  dialog.append(close);
  dialog.addEventListener('close', () => dialog.remove(), {once: true});
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

export function openRouteEditor({source, copy = false, depotId, depots, onSave}) {
  const dialog = openDialog(copy ? 'Kopírovat trasu' : source ? 'Editovat trasu' : 'Nová trasa');
  const form = document.createElement('form');
  form.className = 'route-form';
  dialog.append(form);
  function field(label, type, value = '') {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    const control = document.createElement(type === 'select' ? 'select' : 'input');
    control.setAttribute('aria-label', label);
    if (type !== 'select') control.type = type;
    if (type === 'checkbox') control.checked = Boolean(value);
    else control.value = value;
    wrapper.append(control);
    form.append(wrapper);
    return control;
  }
  const name = field('Trasa', 'text', source?.name || '');
  name.required = true;
  const depot = field('Depo', 'select');
  for (const item of depots.filter(item => !item.archived || item.id === source?.depot)) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name + (item.archived ? ' (archiv)' : '');
    depot.append(option);
  }
  depot.value = source?.depot || depotId;
  depot.required = true;
  const arrival = field('Přistavení', 'time', source?.plannedArrival || '');
  const departure = field('Výjezd', 'time', source?.plannedDeparture || '');
  const shift = field('Směna / časové označení', 'text', source?.shift || '');
  const disabled = field('Deaktivovat od data (včetně)', 'date', source?.disabledFrom || '');
  const archived = field('Archivovaná trasa', 'checkbox', source?.archived || false);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  form.append(status);
  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = copy ? 'Vytvořit kopii trasy' : 'Uložit trasu';
  form.append(save);
  form.onsubmit = async event => {
    event.preventDefault();
    save.disabled = true;
    status.textContent = '';
    try {
      const fields = {...routeFields(source), name: name.value.trim(), depot: depot.value,
        plannedArrival: arrival.value, plannedDeparture: departure.value, shift: shift.value.trim(),
        disabledFrom: disabled.value, archived: archived.checked};
      validateRoute(fields);
      // Never pass a source identity to a copy: saveRoute creates a fresh QR token.
      await onSave(copy ? undefined : source?.id, fields, copy ? undefined : source);
      dialog.close();
    } catch (error) { status.textContent = error.message; }
    finally { save.disabled = false; }
  };
  return dialog;
}

export async function previewRouteQr(depot, route) {
  if (!window.QRCode) throw Error('Generátor QR kódů není dostupný. Obnovte stránku.');
  const url = routeQrUrl(route);
  // Render before opening, so a failed QR operation does not leave an empty dialog.
  const canvas = document.createElement('canvas');
  await window.QRCode.toCanvas(canvas, url, {width: 800, margin: 4, errorCorrectionLevel: 'M'});
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `QR kód trasy ${route.name}`);
  const dialog = openDialog('Náhled QR');
  const poster = document.createElement('div');
  poster.className = 'qr-poster';
  for (const [tag, text] of [['h3', depot.name], ['canvas', ''], ['strong', route.name],
    ['p', route.shift || ''], ['p', plannedTimes(route)], ['small', routeStatus(route)]]) {
    const element = tag === 'canvas' ? canvas : document.createElement(tag);
    if (tag !== 'canvas') element.textContent = text;
    poster.append(element);
  }
  dialog.append(poster);
  const link = document.createElement('a');
  link.textContent = 'Otevřít QR stránku';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  dialog.append(link);
  const download = document.createElement('button');
  download.textContent = 'Stáhnout PDF trasy';
  download.onclick = async () => {
    download.disabled = true;
    try { await exportDepotQr(depot, [route]); }
    catch (error) { dialog.querySelector('[role="status"]').textContent = error.message; }
    finally { download.disabled = false; }
  };
  dialog.append(download);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  dialog.append(status);
}

function plannedTimes(route) {
  return [route.plannedArrival && `Přistavení ${route.plannedArrival}`,
    route.plannedDeparture && `Výjezd ${route.plannedDeparture}`].filter(Boolean).join(' · ');
}

// Rasterize only text (at 4x resolution) for Czech/Unicode font support.
// The QR itself stays vector sharp at every print size, with a four-module quiet zone.
async function drawTextBand(pdf, page, text, y, height, fontSize, color = '#111111') {
  if (!text) return;
  const width = 515, scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  let lines;
  for (let size = fontSize; size >= 6; size -= 1) {
    ctx.font = `700 ${size}px Arial, sans-serif`;
    lines = [''];
    for (const character of String(text)) {
      const index = lines.length - 1;
      if (ctx.measureText(lines[index] + character).width > width - 12) lines.push(character);
      else lines[index] += character;
    }
    if (lines.length * size * 1.2 <= height - 4) {
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, index) => ctx.fillText(line, width / 2,
        height / 2 + (index - (lines.length - 1) / 2) * size * 1.2));
      const png = await pdf.embedPng(canvas.toDataURL('image/png'));
      page.drawImage(png, {x: 40, y, width, height});
      return;
    }
  }
  throw Error('Popisek je příliš dlouhý pro tisk. Zkraťte název nebo směnu.');
}

export async function buildDepotQrPdf(depot, routes, base = location.href) {
  if (!routes.length) throw Error('Depo nemá žádné trasy k exportu.');
  if (!window.PDFLib || !window.QRCode) throw Error('Knihovna pro PDF nebo QR není dostupná. Obnovte stránku.');
  routes = sortRoutes(routes);
  const urls = routes.map(route => routeQrUrl(route, base));
  const {PDFDocument, rgb} = window.PDFLib;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`QR kódy – ${depot.name}`);
  pdf.setCreator('Route Monitor');
  for (const [index, route] of routes.entries()) {
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait, points
    const qr = window.QRCode.create(urls[index], {errorCorrectionLevel: 'M'});
    const count = qr.modules.size, unit = 440 / (count + 8);
    let path = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.modules.get(row, col)) path += `M${(col + 4) * unit} ${(row + 4) * unit}h${unit}v${unit}h${-unit}z`;
      }
    }
    // A single filled path avoids pale seams between adjacent black modules in PDF viewers.
    page.drawSvgPath(path, {x: 77.64, y: 740, color: rgb(0, 0, 0), borderWidth: 0});
    await drawTextBand(pdf, page, depot.name, 748, 65, 26);
    await drawTextBand(pdf, page, route.name, 197, 90, 46, '#e60000');
    await drawTextBand(pdf, page, route.shift, 140, 50, 28);
    await drawTextBand(pdf, page, plannedTimes(route), 94, 40, 18);
    if (route.archived || route.disabledFrom) await drawTextBand(pdf, page, routeStatus(route), 48, 35, 13, '#555555');
  }
  return pdf.save();
}

export async function exportDepotQr(depot, routes) {
  const bytes = await buildDepotQrPdf(depot, routes);
  const url = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `QR-${depot.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
