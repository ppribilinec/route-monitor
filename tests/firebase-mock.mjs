// Browser-only fixture. Never imported by the application or deployed pages.
const source = {
  name: 'Trasa A', depot: 'north', plannedArrival: '23:30', plannedDeparture: '01:15',
  shift: 'Ráno', archived: false, disabledFrom: '', qr: 'original-token', customSetting: 'preserve-me',
};
const seed = {
  users: {admin: {role: 'admin', name: 'Test admin'}},
  depots: {north: {name: 'Severní Čechy', archived: false}, south: {name: 'Jižní Čechy', archived: false},
    empty: {name: 'Prázdné depo', archived: false}, archive: {name: 'Archiv', archived: true}},
  routes: {original: source, inactive: {...source, name: 'Odpolední', qr: 'inactive-token', disabledFrom: '2026-11-28'},
    archived: {...source, name: 'Archivovaná', qr: 'archive-token', archived: true}},
  qr: Object.fromEntries(['original', 'inactive', 'archive'].map(key => [`${key}-token`, {
    ...source, route: key === 'archive' ? 'archived' : key, name: key === 'original' ? source.name : key,
    enabled: key !== 'archive', kind: 'both', disabledFrom: key === 'inactive' ? '2026-11-28' : '',
  }])),
  states: {original: {active: true, loading: 'existing-loading', token: 'original-token'}},
  loadings: {}, settings: {global: {refresh: 60}},
};
window.testDb = structuredClone(seed);
window.testWrites = [];
export const initializeApp = () => ({});
const user = {uid: 'admin', email: 'test@example.invalid'};
export const getAuth = () => ({currentUser: user});
export const onAuthStateChanged = (auth, callback) => { queueMicrotask(() => callback(user)); };
export const signInWithEmailAndPassword = async () => {};
export const signOut = async () => {};
export const signInAnonymously = async () => {};
export const createUserWithEmailAndPassword = async () => ({user});
export const updatePassword = async () => {};
export const reauthenticateWithCredential = async () => {};
export const EmailAuthProvider = {credential: () => ({})};
export const getFunctions = () => ({});
export const httpsCallable = () => async () => {};
export const getFirestore = () => ({});
export const doc = (db, collection, id) => ({collection, id});
export const collection = (db, name) => ({collection: name});
export const where = (field, op, value) => ({field, value});
export const query = (reference, ...filters) => ({...reference, filters});
function snapshot(id, fields) { return {id, data: () => structuredClone(fields), exists: () => fields !== undefined}; }
export const getDoc = async ref => snapshot(ref.id, window.testDb[ref.collection]?.[ref.id]);
export const getDocs = async ref => ({docs: Object.entries(window.testDb[ref.collection] || {})
  .filter(([, fields]) => (ref.filters || []).every(filter => fields[filter.field] === filter.value))
  .map(([id, fields]) => snapshot(id, fields))});
export const setDoc = async (ref, fields, options) => {
  window.testDb[ref.collection] ||= {};
  window.testDb[ref.collection][ref.id] = {...(options?.merge ? window.testDb[ref.collection][ref.id] : {}), ...structuredClone(fields)};
  window.testWrites.push({ref, fields: structuredClone(fields)});
};
export const writeBatch = () => {
  const writes = [];
  return {set: (...args) => writes.push(args), commit: async () => { for (const args of writes) await setDoc(...args); }};
};
export const serverTimestamp = () => 'server-time';
export const runTransaction = async (db, callback) => callback({get: getDoc, set: setDoc,
  update: (ref, fields) => setDoc(ref, fields, {merge: true})});
