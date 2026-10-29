const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../progresso.js'),'utf8'),ctx);
function setup(){const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};return {p:new ctx.window.CorretorProgresso(storage),storage};}
test('busca ignora acentos e filtra apenas pendentes',()=>{
 const {p}=setup();p.atualizar('Filosofia','Turma A',{'JOÃO':'hash'});
 assert.equal(p.filtrar(['JOÃO','MARIA'],'Filosofia','Turma A','joao',false).join(),'JOÃO');
 assert.equal(p.filtrar(['JOÃO','MARIA'],'Filosofia','Turma A','',true).join(),'MARIA');
});
test('desmarcar é reversível, sobrevive à consulta e não modifica os registros',()=>{
 const {p,storage}=setup(),r={ANA:'hash1'};
 p.atualizar('Filosofia','A',r);assert.equal(p.corrigido('Filosofia','A','ANA'),true);
 p.alternar('Filosofia','A','ANA');assert.equal(p.corrigido('Filosofia','A','ANA'),false);assert.deepEqual(r,{ANA:'hash1'});
 const again=new ctx.window.CorretorProgresso(storage);again.atualizar('Filosofia','A',r);assert.equal(again.corrigido('Filosofia','A','ANA'),false);
 again.alternar('Filosofia','A','ANA');assert.equal(again.corrigido('Filosofia','A','ANA'),true);
});
test('nova gravação e planilha zerada não herdam desmarcações antigas',()=>{
 const {p}=setup();p.atualizar('Filosofia','A',{ANA:'hash1'});p.alternar('Filosofia','A','ANA');
 p.atualizar('Filosofia','A',{ANA:'hash2'});assert.equal(p.corrigido('Filosofia','A','ANA'),true);
 p.alternar('Filosofia','A','ANA');p.atualizar('Filosofia','A',{});assert.equal(p.corrigido('Filosofia','A','ANA'),false);
 p.atualizar('Filosofia','A',{ANA:'hash1'});assert.equal(p.corrigido('Filosofia','A','ANA'),true);
});
test('turmas e disciplinas independentes; próximo pula corrigidos e não repete atual',()=>{
 const {p}=setup();p.atualizar('Filosofia','A',{ANA:'hash',BIA:'hash'});
 assert.equal(p.corrigido('Sociologia','A','ANA'),false);assert.equal(p.corrigido('Filosofia','B','ANA'),false);
 assert.equal(p.proximo(['ANA','BIA','CARLA'],'Filosofia','A','ANA'),'CARLA');
 assert.equal(p.proximo(['ANA'],'Filosofia','A','ANA'),'');
 p.salvo('Filosofia','A','CARLA','id');assert.equal(p.proximo(['ANA','BIA','CARLA'],'Filosofia','A','CARLA'),'');
 p.limpar();assert.equal(p.corrigido('Filosofia','A','ANA'),false);
});
