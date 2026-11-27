import test from 'node:test';
import assert from 'node:assert/strict';
import {routeFields, routeQrUrl, validateRoute} from '../route-tools.mjs';

test('copies parameters but strips route identity and legacy QR tokens', () => {
  const fields = {name: 'Noční', depot: 'depot', shift: 'Noc', plannedArrival: '23:30',
    plannedDeparture: '01:15', disabledFrom: '2026-11-28', archived: true, extra: 42};
  assert.deepEqual(routeFields({...fields, id: 'old', qr: 'token', arrival: 'legacy-a', departure: 'legacy-d'}), fields);
});
test('QR URL retains the hosting path and uses the actual token', () => {
  assert.equal(routeQrUrl({qr: 'a/b?č'}, 'https://example.org/route-monitor/index.html?old=1#hash'),
    'https://example.org/route-monitor/index.html?qr=a%2Fb%3F%C4%8D');
  assert.throws(() => routeQrUrl({name: 'A'}, 'https://example.org/'), /nemá QR token/);
});
test('supports blank schedules and overnight routes, rejects invalid dates and times', () => {
  const route = {name: 'A', depot: 'D', plannedArrival: '23:30', plannedDeparture: '01:00'};
  validateRoute(route);
  validateRoute({...route, plannedArrival: '', plannedDeparture: '', disabledFrom: ''});
  for (const disabledFrom of ['2026-02-30', '2026-13-01', 'bad']) assert.throws(() => validateRoute({...route, disabledFrom}));
  assert.throws(() => validateRoute({...route, plannedArrival: '24:00'}));
  assert.throws(() => validateRoute({...route, name: ' '}));
});
