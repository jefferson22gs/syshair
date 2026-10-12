const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { Temporal } = require('@js-temporal/polyfill');
const root = path.resolve(__dirname, '../../supabase/functions/_shared/whatsapp');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const text = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(text, { exports, require: n => n.startsWith('https://') ? {} : n.startsWith('npm:@js-temporal') ? { Temporal } : load(n.replace('./', '')), crypto: require('node:crypto').webcrypto, Deno: { env: { get: () => undefined } }, TextEncoder, TextDecoder, Response, Request, URL, console: { warn() {} } });
  return exports;
}
const { executeBotTool } = load('chatbot-domain.ts');
const salon = '00000000-0000-4000-8000-000000000010', appt = '00000000-0000-4000-8000-000000000050', other = '00000000-0000-4000-8000-000000000051';
const phone = '+5511912345678';
const daysAhead = n => Temporal.Now.plainDateISO('America/Sao_Paulo').add({ days: n }).toString();

// Banco simulado: só devolve o agendamento se salão + telefone + id baterem.
function mockDb({ apptDate = daysAhead(3), apptStart = '10:00:00', slots = ['15:00'] } = {}) {
  const calls = [];
  const row = { id: appt, date: apptDate, start_time: apptStart, status: 'confirmed', service_id: 's', professional_id: 'p', services: { name: 'Corte' }, professionals: { name: 'Ana' } };
  return {
    calls,
    from(table) {
      const filters = []; calls.push({ table, filters });
      const q = {
        select() { return q; }, eq(k, v) { filters.push([k, v]); return q; }, in(k, v) { filters.push([k, v]); return q; },
        gte() { return q; }, order() { return q; }, limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => {
          const f = Object.fromEntries(filters.filter(([k]) => typeof k === 'string'));
          return { data: table === 'appointments' && f.id === appt && f.salon_id === salon && f.client_phone === phone ? row : null, error: null };
        },
        single: async () => ({ data: { timezone: 'America/Sao_Paulo' }, error: null }),
        upsert: async (v) => { calls.push({ upsert: table, v }); return { error: null }; },
      };
      return q;
    },
    rpc: async (name, args) => { calls.push({ name, args }); return { data: slots, error: null }; },
  };
}
const ctx = db => ({ db, salonId: salon, phone, preview: false, eventId: 'e' });

test('cancel prepares proposal only; never mutates appointment directly', async () => {
  const db = mockDb();
  const r = await executeBotTool(ctx(db), 'prepare_cancel', { appointmentId: appt });
  assert.equal(r.proposal, true);
  assert.match(r.summary, /Corte com Ana/);
  const saved = db.calls.find(c => c.upsert === 'whatsapp_conversation_state');
  assert.equal(saved.v.pending_action.kind, 'cancel');
  assert(!db.calls.some(c => c.name === 'whatsapp_change_appointment'));
});

test('cannot cancel appointment of another phone/id', async () => {
  const db = mockDb();
  const r = await executeBotTool(ctx(db), 'prepare_cancel', { appointmentId: other });
  assert.ok(r.error);
  assert(!db.calls.some(c => c.upsert));
});

test('model cannot inject phone or salon into change tools', async () => {
  const db = mockDb();
  await assert.rejects(() => executeBotTool(ctx(db), 'prepare_cancel', { appointmentId: appt, phone: '+5500000000000' }));
  await assert.rejects(() => executeBotTool(ctx(db), 'prepare_reschedule', { appointmentId: appt, date: daysAhead(4), start: '15:00', salon_id: 'x' }));
});

test('change inside 24h is refused and handed to staff', async () => {
  const db = mockDb({ apptDate: Temporal.Now.plainDateISO('America/Sao_Paulo').toString(), apptStart: '23:59:00' });
  const r = await executeBotTool(ctx(db), 'prepare_cancel', { appointmentId: appt });
  assert.match(r.error, /24h/);
});

test('reschedule requires real free slot excluding own appointment', async () => {
  const db = mockDb({ slots: ['15:00'] });
  const bad = await executeBotTool(ctx(db), 'prepare_reschedule', { appointmentId: appt, date: daysAhead(4), start: '09:00' });
  assert.ok(bad.error);
  const good = await executeBotTool(ctx(db), 'prepare_reschedule', { appointmentId: appt, date: daysAhead(4), start: '15:00' });
  assert.equal(good.proposal, true);
  const slotCall = db.calls.find(c => c.name === 'get_available_time_slots');
  assert.equal(slotCall.args.p_exclude_appointment_id, appt);
  const saved = db.calls.filter(c => c.upsert).pop();
  assert.equal(saved.v.pending_action.kind, 'reschedule');
});

test('reschedule target also respects 24h notice', async () => {
  const db = mockDb();
  const r = await executeBotTool(ctx(db), 'prepare_reschedule', { appointmentId: appt, date: Temporal.Now.plainDateISO('America/Sao_Paulo').toString(), start: '23:59' });
  assert.match(r.error, /24h/);
});

test('preview mode never touches client appointments', async () => {
  const db = mockDb();
  const r = await executeBotTool({ ...ctx(db), preview: true }, 'prepare_cancel', { appointmentId: appt });
  assert.ok(r.notice);
  assert.equal(db.calls.length, 0);
});
