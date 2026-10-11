const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../../src/features/whatsapp/schedule.ts');
const moduleData = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { module:moduleData, exports:moduleData.exports, require });
const { localToInstant, nextOccurrence, validTimezone } = moduleData.exports;
test('Brazil zones convert explicitly; browser zone is irrelevant', () => {
 assert.equal(localToInstant('2026-10-15T10:30','America/Sao_Paulo'),'2026-10-15T13:30:00Z');
 assert.equal(localToInstant('2026-10-15T10:30','America/Manaus'),'2026-10-15T14:30:00Z');
 assert.equal(validTimezone('invalid'),false);
});
test('monthly anchor 31 clamps leap February and returns to March 31', () => {
 const rule={type:'monthly',timezone:'America/Sao_Paulo',localTime:'09:00',anchorDay:31};
 const feb=nextOccurrence('2028-01-31T12:00:00Z','2028-02-01T00:00:00Z',rule);
 assert.equal(feb,'2028-02-29T12:00:00Z');
 assert.equal(nextOccurrence(feb,'2028-03-01T00:00:00Z',rule),'2028-03-31T12:00:00Z');
});
test('late worker skips past repeats and end date includes full local day', () => {
 const rule={type:'daily',timezone:'America/Sao_Paulo',localTime:'20:00',endDate:'2026-10-15'};
 assert.equal(nextOccurrence('2026-10-10T23:00:00Z','2026-10-15T12:00:00Z',rule),'2026-10-15T23:00:00Z');
 assert.equal(nextOccurrence('2026-10-15T23:00:00Z','2026-10-16T00:00:00Z',rule),null);
});
test('weekly repeats use local weekdays, never UTC day', () => {
 assert.equal(nextOccurrence('2026-10-12T12:00:00Z','2026-10-13T00:00:00Z',{type:'weekly',timezone:'America/Sao_Paulo',localTime:'09:00',weekdays:[1,3,5]}),'2026-10-14T12:00:00Z');
});
test('DST nonexistent and ambiguous times rejected explicitly', () => {
 assert.throws(()=>localToInstant('2026-03-08T02:30','America/New_York'));
 assert.throws(()=>localToInstant('2026-11-01T01:30','America/New_York'));
});
