const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../src/features/whatsapp/contacts');
const cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const exports={};const text=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(text,{exports,require:(name)=>name.startsWith('.')?load(name.replace('./','')+'.ts'):require(name),TextEncoder,TextDecoder,Uint8Array,atob});cache.set(file,exports);return exports;}
const {normalizePhone}=load('phone.ts'),{parseVcf,readCsv,mapCsv,contactPreview}=load('parse.ts');
test('phone normalization preserves international and rejects ambiguous/group/LID',()=>{
 assert.equal(normalizePhone('(11) 91234-5678'),'+5511912345678');
 assert.equal(normalizePhone('5511912345678'),'+5511912345678');
 assert.equal(normalizePhone('+14155552671'),'+14155552671');
 assert.equal(normalizePhone('91234-5678'),null);
 assert.equal(normalizePhone('123@g.us'),null);assert.equal(normalizePhone('123@lid'),null);
});
test('VCF 2.1 quoted printable, 3.0 folded and 4.0 multiple TEL URI',()=>{
 const raw=parseVcf('BEGIN:VCARD\r\nVERSION:2.1\r\nFN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jo=C3=A3o\r\nTEL:+5511912345678\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ana\\, De\r\n mo\r\nTEL:+5511987654321\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:4.0\r\nFN:Carlos\r\nTEL;VALUE=uri:tel:+14155552671\r\nTEL:+5511912345678\r\nEND:VCARD');
 assert.equal(raw[0].name,'João');assert.equal(raw[1].name,'Ana, Demo');assert.equal(raw[2].phones.length,2);
 const preview=contactPreview(raw,[]);assert.equal(preview.length,4);assert.equal(preview[3].status,'duplicate');
});
test('no phone and unsupported charset reported invalid not silently imported',()=>{
 const raw=parseVcf('BEGIN:VCARD\nVERSION:3.0\nFN:Sem telefone\nEND:VCARD\nBEGIN:VCARD\nVERSION:2.1\nFN;ENCODING=QUOTED-PRINTABLE;CHARSET=UNKNOWN:=FF\nTEL:+5511912345678\nEND:VCARD');
 const preview=contactPreview(raw,[]);assert.equal(preview[0].status,'invalid');assert.equal(preview[1].status,'invalid');
});
test('CSV semicolon quoted comma name and explicit field mapping',()=>{
 const data=readCsv('Pessoa;Celular;Outro\n"Demo, Ana";"(11) 91234-5678";x\n');
 assert.equal(data.detected.phone,'Celular');const rows=mapCsv(data,{name:'Pessoa',phone:'Celular'});assert.equal(rows[0].name,'Demo, Ana');
 assert.equal(contactPreview(rows,['+5511912345678'])[0].status,'existing');
 assert.throws(()=>mapCsv(data,{name:'Pessoa',phone:'Inexistente'}));
});
