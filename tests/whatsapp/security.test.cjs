const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../supabase/functions/_shared/whatsapp');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const module = { exports: {} }; cache.set(name, module.exports);
  const source = ts.transpileModule(fs.readFileSync(path.join(root, name), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mockRequire = (id) => {
    if (id.startsWith('https://esm.sh/')) return { createClient: () => { throw new Error('real DB forbidden in tests'); } };
    return load(path.posix.join(path.posix.dirname(name), id));
  };
  vm.runInNewContext(source, { module, exports: module.exports, require: mockRequire, URL, Request, Response, TextEncoder, TextDecoder, AbortSignal, Uint8Array, console: { warn() {} }, Deno: { env: { get: () => undefined } }, fetch: () => { throw new Error('real network forbidden in tests'); } }, { filename: name });
  cache.set(name, module.exports); return module.exports;
}
const { parseIncoming, eventName } = load('inbound.ts');
const { safeEqual, authorizeSalon } = load('auth.ts');
const { EvolutionClient } = load('evolution.ts');
const { readRequest, errorResponse, WhatsAppError } = load('errors.ts');
const message = (extra = {}) => ({ key: { fromMe: false, id: 'TEST123', remoteJid: '5511999999999@s.whatsapp.net', ...extra }, message: { conversation: 'Qual o preço?' }, pushName: 'Pessoa fictícia' });

test('inbound accepts only explicit individual inbound messages', () => {
  assert.equal(parseIncoming(message()).phone, '+5511999999999');
  for (const key of [{ fromMe: true }, { fromMe: undefined }, { remoteJid: '123@g.us' }, { remoteJid: 'status@broadcast' }, { remoteJid: '123@lid' }, { id: undefined }]) assert.equal(parseIncoming(message(key)), null);
  assert.equal(parseIncoming({ ...message(), message: { protocolMessage: {} } }), null);
  assert.equal(eventName('MESSAGES_UPSERT'), 'messages.upsert');
});
test('constant comparison checks equal, different length and content', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('abc', 'abd'), false);
});
function dbMock(owner, roles = [], validToken = true) {
  return {
    auth: { getUser: async () => ({ data: { user: validToken ? { id: 'user-A' } : null }, error: null }) },
    from(table) {
      const q = { select() { return q; }, eq() { return q; }, limit() { return Promise.resolve({ data: roles, error: null }); }, maybeSingle: async () => ({ data: { id: 'salon', owner_id: owner }, error: null }) };
      assert(['salons', 'user_roles'].includes(table)); return q;
    },
  };
}
const salonId = '00000000-0000-4000-8000-000000000010';
const req = () => new Request('https://local.invalid', { headers: { authorization: 'Bearer not-a-real-token' } });
test('salon authorization rejects anon, invalid token and other tenant', async () => {
  await assert.rejects(() => authorizeSalon(new Request('https://local.invalid'), dbMock('user-A'), salonId), /unauthorized/);
  await assert.rejects(() => authorizeSalon(req(), dbMock('user-A', [], false), salonId), /unauthorized/);
  await assert.rejects(() => authorizeSalon(req(), dbMock('user-B'), salonId), /forbidden/);
  assert.equal(await authorizeSalon(req(), dbMock('user-A'), salonId), 'user-A');
  assert.equal(await authorizeSalon(req(), dbMock('user-B', [{ id: 'role' }]), salonId), 'user-A');
});
test('Evolution allowlisted text request matches 2.3.7 DTO without real network', async () => {
  let call;
  const api = new EvolutionClient('test-only', 'https://provider.example.invalid', async (url, options) => { call = { url, options }; return new Response(JSON.stringify({ key: { id: 'TEST-ID' } }), { status: 201 }); });
  await api.request('text', 'salon_A', { number: '5511999999999', text: 'Teste' });
  assert.equal(call.url, 'https://provider.example.invalid/message/sendText/salon_A');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.redirect, 'error');
  assert.deepEqual(JSON.parse(call.options.body), { number: '5511999999999', text: 'Teste' });
  await assert.rejects(() => api.request('text', '../salon_B', {}), /invalid_request/);
});
test('Evolution timeout, server error and bad JSON remain uncertain for sends', async () => {
  for (const transport of [async () => { throw new Error('timeout'); }, async () => new Response('{}', { status: 500 }), async () => new Response('bad json', { status: 200 })]) {
    const api = new EvolutionClient('test-only', 'https://provider.example.invalid', transport);
    await assert.rejects(() => api.request('text', 'salon_A', {}), /send_uncertain/);
  }
  const api = new EvolutionClient('test-only', 'https://provider.example.invalid', async () => new Response('{}', { status: 429 }));
  await assert.rejects(() => api.request('text', 'salon_A', {}), /provider_rate_limited/);
  assert.throws(() => new EvolutionClient('test-only', 'http://localhost'), /configuration_missing/);
});
test('request validation rejects non-JSON and oversized chunked body', async () => {
  await assert.rejects(() => readRequest(new Request('https://local.invalid', { method: 'POST', body: '{}' })), /invalid_request/);
  await assert.rejects(() => readRequest(new Request('https://local.invalid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(512001) })), /invalid_request/);
  const response = errorResponse(new Error('secret-token-untrusted-stack'));
  assert.equal((await response.text()).includes('secret-token'), false);
  assert.equal(errorResponse(new WhatsAppError('forbidden', 403)).status, 403);
});
