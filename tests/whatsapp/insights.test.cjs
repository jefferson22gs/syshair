const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { Temporal } = require('@js-temporal/polyfill');
const root = path.resolve(__dirname, '../../supabase/functions/_shared');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const text = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = path.dirname(file);
  vm.runInNewContext(text, { exports, require: n => n.startsWith('https://') ? {} : n.startsWith('npm:@js-temporal') ? { Temporal } : load(path.join(dir, n).replace(/\\/g, '/')), crypto: require('node:crypto').webcrypto, Deno: { env: { get: () => undefined } }, TextEncoder, TextDecoder, Response, Request, URL, console: { warn() {} } });
  return exports;
}
const core = load('insights/core.ts');
const D = s => Temporal.PlainDate.from(s);
const base = { completed: 0, scheduled_total: 0, cuts: 0, cancelled: 0, no_show: 0, open: 0, revenue: 0, expected_revenue: 0, unique_clients: 0, new_clients: 0, unclassified_services: 0, by_dow: [], by_hour: [], by_service: [], top_professional: null, by_month: null, first_data_date: null };
const M = o => ({ ...base, ...o });

test('weekly period is last closed Mon-Sun, exclusive end, no overlap', () => {
  const p = core.lastClosedPeriod('weekly', D('2026-10-14')); // quarta
  assert.equal(p.start, '2026-10-05'); assert.equal(p.endExclusive, '2026-10-12');
  const prev = core.previousPeriod('weekly', p);
  assert.equal(prev.endExclusive, p.start); assert.equal(prev.start, '2026-09-28');
});

test('month turn and year turn', () => {
  const m = core.lastClosedPeriod('monthly', D('2026-03-01'));
  assert.equal(m.start, '2026-02-01'); assert.equal(m.endExclusive, '2026-03-01');
  const y = core.lastClosedPeriod('yearly', D('2027-01-01'));
  assert.equal(y.start, '2026-01-01'); assert.equal(y.endExclusive, '2027-01-01');
  assert.equal(core.lastClosedPeriod('weekly', D('2027-01-01')).start, '2026-12-21');
});

test('leap year February', () => {
  const m = core.lastClosedPeriod('monthly', D('2028-03-10'));
  assert.equal(m.start, '2028-02-01'); assert.equal(m.endExclusive, '2028-03-01');
  assert.equal(D(m.endExclusive).subtract({ days: 1 }).day, 29);
});

test('variation never shows misleading % when previous is zero', () => {
  assert.equal(core.variation(10, 0), 'sem base de comparação no período anterior');
  assert.equal(core.variation(0, 0), 'sem movimento nos dois períodos');
  assert.equal(core.variation(15, 10), '+50% vs período anterior');
  assert.equal(core.variation(5, 10), '-50% vs período anterior');
});

test('week with no completed appointments says so instead of zeros', () => {
  const t = core.renderReport('weekly', 'Studio', core.lastClosedPeriod('weekly', D('2026-10-14')), M({}), M({}), true);
  assert.match(t, /Ainda não há atendimentos concluídos/);
  assert.doesNotMatch(t, /R\$\s*0/);
});

test('weekly report uses real values; expected revenue shown separately', () => {
  const m = M({ completed: 12, cuts: 8, revenue: 960, expected_revenue: 300, unique_clients: 10, by_dow: [{ dow: 6, n: 5 }], by_hour: [{ hour: 14, n: 4 }], by_service: [{ name: 'Corte masculino', cat: 'corte', n: 8 }] });
  const t = core.renderReport('weekly', 'Studio Beleza', core.lastClosedPeriod('weekly', D('2026-10-14')), m, M({ completed: 10 }), true);
  assert.match(t, /Faturamento: R\$\s*960,00/);
  assert.match(t, /Cortes realizados: 8/);
  assert.match(t, /Atendimentos: 12/);
  assert.match(t, /\+20% vs período anterior/);
  assert.match(t, /sábado/);
  assert.match(t, /14h–15h/);
  assert.doesNotMatch(t, /Sem baixa/); // open=0 neste cenário
  const withOpen = core.renderReport('weekly', 'S', core.lastClosedPeriod('weekly', D('2026-10-14')), M({ ...m, open: 3 }), M({}), true);
  assert.match(withOpen, /Sem baixa na agenda: 3 horário\(s\), R\$\s*300,00 \(não somado ao faturamento\)/);
  assert.match(withOpen, /Faturamento: R\$\s*960,00/);
  assert.doesNotMatch(t, /\{\{/);
});

test('period with only open appointments asks owner to close them, revenue stays zero', () => {
  const t = core.renderReport('monthly', 'S', core.lastClosedPeriod('monthly', D('2026-03-05')), M({ open: 16, expected_revenue: 740, cancelled: 5 }), M({}), true);
  assert.match(t, /Faturamento: R\$\s*0,00/);
  assert.match(t, /16 horário\(s\) do período ainda como pendente\/confirmado/);
});

test('cancelled do not count as attendance; cancel rate uses decided appointments', () => {
  const m = M({ completed: 6, cancelled: 4 });
  assert.equal(core.cancelRate(m), 0.4);
  assert.equal(core.ticket(M({ completed: 4, revenue: 200 })), 50);
});

test('yearly with partial history states available period', () => {
  const p = core.lastClosedPeriod('yearly', D('2027-01-02'));
  const t = core.renderReport('yearly', 'S', p, M({ completed: 50, revenue: 3000, first_data_date: '2026-01-28', by_month: [{ month: '2026-03', n: 30, revenue: 2000 }, { month: '2026-05', n: 20, revenue: 1000 }] }), M({}), true);
  assert.match(t, /dados disponíveis a partir de 28\/01\/2026/);
  assert.match(t, /Melhor mês: março\/2026/);
  assert.match(t, /Média mensal: R\$\s*1\.500,00 \(2 meses/);
});

test('alerts need minimum volume and respect thresholds', () => {
  const cfg = { alert_drop_pct: 30, alert_growth_pct: 40, alert_cancel_rate_pct: 25 };
  assert.equal(core.detectAlerts(M({ completed: 1 }), M({ completed: 3 }), cfg, []).length, 0);
  const drop = core.detectAlerts(M({ completed: 5 }), M({ completed: 10 }), cfg, []);
  assert.equal(drop[0].code, 'drop');
  const canc = core.detectAlerts(M({ completed: 6, cancelled: 4 }), M({ completed: 6 }), cfg, []);
  assert(canc.some(a => a.code === 'cancellations'));
  for (const a of [...drop, ...canc]) assert.doesNotMatch(a.text, /porque|devido|causa/i);
});

test('low occupancy alert compares same weekday', () => {
  const hist = ['2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06'].map((d, i) => ({ date: d, dow: 2, n: i < 3 ? 8 : 2 }));
  const a = core.detectAlerts(M({}), M({}), { alert_drop_pct: 30, alert_growth_pct: 40, alert_cancel_rate_pct: 25 }, hist);
  assert.equal(a[0].code, 'low_dow_2');
  assert.match(a[0].text, /Terça-feira.*Considere/);
});

test('due window boundaries', () => {
  const p = core.lastClosedPeriod('weekly', D('2026-10-12'));
  const at = (iso, tz) => Temporal.Instant.from(iso).toZonedDateTimeISO(tz);
  assert.equal(core.isDue('weekly', at('2026-10-12T10:59:00Z', 'America/Sao_Paulo'), p, 1, '08:00'), false);
  assert.equal(core.isDue('weekly', at('2026-10-12T11:00:00Z', 'America/Sao_Paulo'), p, 1, '08:00'), true);
  assert.equal(core.isDue('weekly', at('2026-10-12T11:00:00Z', 'America/Manaus'), p, 1, '08:00'), false); // 07:00 em Manaus
  assert.equal(core.isDue('weekly', at('2026-10-14T20:00:00Z', 'America/Sao_Paulo'), p, 1, '08:00'), true); // worker atrasado
  assert.equal(core.isDue('weekly', at('2026-10-16T20:00:00Z', 'America/Sao_Paulo'), p, 1, '08:00'), false); // fora da janela
});

test('admin commands parsed with accents; unknown text is not a command', () => {
  assert.equal(core.parseAdminCommand('MÊS'), 'mes');
  assert.equal(core.parseAdminCommand(' resumo '), 'resumo');
  assert.equal(core.parseAdminCommand('ajuda'), 'menu');
  assert.equal(core.parseAdminCommand('quanto custa corte'), null);
});
