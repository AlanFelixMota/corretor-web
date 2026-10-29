const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const pause=()=>new Promise(resolve=>setTimeout(resolve,30));
function setup() {
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://professor.example/',runScripts:'outside-only'}),w=dom.window,$=id=>w.document.getElementById(id);
 w.CORRETOR_CONFIG={apiBase:'https://api-corretor-provas.onrender.com'};w.Headers=Headers;w.AbortController=AbortController;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.confirm=()=>true;
 w.URL.createObjectURL=()=> 'blob:imagem-ficticia';w.URL.revokeObjectURL=()=>{};
 w.Image=class {constructor(){this.naturalWidth=1000;this.naturalHeight=1000;}decode(){return Promise.resolve();}};
 let clock=0,detect=false,frames=0,stopped=0,allowCamera;
 const calls=[],records={},settings={readError:null,saveError:null,progressError:false,pendingPermission:false};
 const stream=()=>{const track={stop(){stopped++;},addEventListener(){}};return {getTracks:()=>[track],getVideoTracks:()=>[track]};};
 Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:()=>settings.pendingPermission?new Promise(r=>allowCamera=r):Promise.resolve(stream())}});
 w.HTMLMediaElement.prototype.play=async()=>{};
 Object.defineProperties($('cameraVideo'),{videoWidth:{value:1080},videoHeight:{value:1920},readyState:{value:4}});
 w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},translate(){},rotate(){},setTransform(){},getImageData(){return {};},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){}});
 w.HTMLCanvasElement.prototype.toBlob=cb=>cb(new w.Blob(['imagem'],{type:'image/jpeg'}));
 const nativeTimeout=w.setTimeout.bind(w);
 w.setTimeout=(cb,delay,...args)=>nativeTimeout(()=>{if(delay===180)clock+=200;cb(...args);},delay===180?0:delay);
 Object.defineProperty(w.performance,'now',{value:()=>clock});
 w.fetch=async(url,options)=>{
  calls.push({url,options});let status=200,data;
  if(url.endsWith('/login'))data={token:'token-ficticio',expires_at:Date.now()/1000+3600};
  else if(url.includes('/alunos'))data={turmas:{'Turma A':['ALUNO UM','ALUNO DOIS','JOÃO']},disciplinas:['Filosofia','Sociologia'],aviso:''};
  else if(url.includes('/progresso?')){if(settings.progressError){status=503;data={mensagem:'Progresso indisponível'};}else data={registros:{...records}};}
  else if(url.endsWith('/processar_gabarito')){
   if(settings.readError){status=422;data=settings.readError;}
   else data={leitura_id:'rascunho-'+calls.length,disciplina:options.body.get('disciplina'),turma:options.body.get('turma'),aluno:options.body.get('aluno'),imagem_revisao:'data:image/jpeg;base64,AA==',orientacao:{origem:'numeracao',rotacao:0},detalhes:[{questao:1,resposta:'A',motivo:'Uma marca'},{questao:2,resposta:'REVISAR',motivo:'Rasura'},{questao:3,resposta:'DUPLA',motivo:'Duas marcas'},{questao:4,resposta:'BRANCO',motivo:'Sem marca'},{questao:5,resposta:'E',motivo:'Uma marca'}]};
  }else if(url.endsWith('/salvar_gabarito')){
   if(settings.saveError){status=settings.saveError;data={mensagem:'Gravação não confirmada'};}
   else {records[$('aluno').value]='hash-'+calls.length;data={status:'sucesso',mensagem:'Respostas salvas no Google Sheets.'};}
  }else if(url.endsWith('/logout'))data={status:'sucesso'};else throw new Error('URL inesperada '+url);
  return {ok:status===200,status,json:async()=>data};
 };
 for(const file of ['camera.js','progresso.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 // Integrar o contador real com posições que oscilam. Testes separados exercitam
 // a detecção real nos pixels; aqui câmera, canvas e rede são simulados.
 w.CorretorCamera.detect=()=>{
  frames++;const dx=frames%2?.018:-.018;
  return {box:detect?{corners:[{x:.2+dx,y:.2},{x:.8+dx,y:.2},{x:.8+dx,y:.7},{x:.2+dx,y:.7}]}:null};
 };
 w.eval(fs.readFileSync(path.join(root,'app.js'),'utf8'));
 const change=async(id,value)=>{if(typeof value==='boolean')$(id).checked=value;else $(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));await pause();};
 const login=async()=>{$('senha').value='senha-ficticia-apenas-para-teste';$('loginForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();};
 const photo=async()=>{Object.defineProperty($('cameraInput'),'files',{value:[new w.File(['imagem'],'foto.jpg',{type:'image/jpeg'})],configurable:true});$('cameraInput').dispatchEvent(new w.Event('change',{bubbles:true}));await pause();};
 return {w,$,calls,records,settings,change,login,photo,close:()=>w.close(),detect:value=>detect=value,stopped:()=>stopped,allow:()=>allowCamera(stream())};
}

test('busca, desmarcação reversível, troca de unidade e próximo pendente',async()=>{
 const h=setup(),{$,w,calls,records,change}=h;try{
 await pause();await h.login();await change('turma','Turma A');
 records['ALUNO DOIS']='registro-existente';$('btnAtualizarProgresso').click();await pause();
 await change('aluno','ALUNO DOIS');assert.equal($('btnDesmarcar').textContent,'Desmarcar na lista');
 const writes=()=>calls.filter(c=>c.url.endsWith('/salvar_gabarito')).length;
 $('btnDesmarcar').click();assert.match($('status').textContent,/respostas continuam/);assert.equal(writes(),0);
 $('btnAtualizarProgresso').click();await pause();assert.equal($('btnDesmarcar').textContent,'Restaurar marcação');
 $('btnDesmarcar').click();assert.equal($('btnDesmarcar').textContent,'Desmarcar na lista');assert.equal(writes(),0);
 $('buscaAluno').value='joao';$('buscaAluno').dispatchEvent(new w.Event('input'));assert.equal($('aluno').options.length,2);assert.equal($('aluno').options[1].value,'JOÃO');
 $('buscaAluno').value='';$('buscaAluno').dispatchEvent(new w.Event('input'));await change('somentePendentes',true);
 assert.ok(![...$('aluno').options].some(o=>o.value==='ALUNO DOIS'));
 await change('aluno','ALUNO UM');await h.photo();$('btnLer').click();await pause();
 assert.equal($('revisaoPanel').hidden,false);assert.equal(writes(),0);assert.equal($('identificacao').disabled,true);
 await change('confirmado',true);assert.equal($('btnSalvar').disabled,true);
 await change('q2','C');assert.equal($('confirmado').checked,false);await change('confirmado',true);
 $('btnSalvar').click();await pause();assert.equal(writes(),1);assert.equal($('aluno').value,'JOÃO');assert.match($('alunoEmFoco').textContent,/JOÃO/);
 assert.equal($('disciplina').value,'Filosofia');assert.equal($('turma').value,'Turma A');assert.equal($('quantidade').value,'5');
 delete records['ALUNO UM'];delete records['ALUNO DOIS'];$('btnAtualizarProgresso').click();await pause();assert.match($('progressoTurma').textContent,/0 de 3/);assert.equal($('aluno').options.length,4);
 const saved=JSON.parse(calls.find(c=>c.url.endsWith('/salvar_gabarito')).options.body);assert.deepEqual(saved.respostas,['A','C','DUPLA','BRANCO','E']);
 }finally{h.close();}
});

test('câmera captura sozinha com tremulação e envia uma única leitura',async()=>{
 const h=setup(),{$,calls,change}=h;try{
 await pause();await h.login();await change('turma','Turma A');await change('aluno','ALUNO UM');
 h.detect(true);$('btnCamera').click();await new Promise(r=>setTimeout(r,100));
 assert.equal($('revisaoPanel').hidden,false);assert.equal($('cameraPanel').hidden,true);
 assert.equal(h.stopped(),1);assert.equal(calls.filter(c=>c.url.endsWith('/processar_gabarito')).length,1);assert.equal(calls.filter(c=>c.url.endsWith('/salvar_gabarito')).length,0);
 await pause();assert.equal(calls.filter(c=>c.url.endsWith('/processar_gabarito')).length,1);
 }finally{h.close();}
});

test('cancelar permissão pendente e sair da página fecham a câmera',async()=>{
 const h=setup(),{$,w,change}=h;try{
 await pause();await h.login();await change('turma','Turma A');await change('aluno','ALUNO UM');
 h.settings.pendingPermission=true;$('btnCamera').click();await pause();$('btnFecharCamera').click();h.allow();await pause();assert.equal(h.stopped(),1);assert.equal($('cameraPanel').hidden,true);
 h.settings.pendingPermission=false;$('btnCamera').click();await pause();Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(h.stopped(),2);assert.equal($('btnCamera').disabled,false);
 }finally{h.close();}
});

test('orientação duvidosa exige conferência; falha de gravação preserva revisão',async()=>{
 const h=setup(),{$,calls,change}=h;try{
 await pause();await h.login();await change('turma','Turma A');await change('aluno','ALUNO UM');await h.photo();
 h.settings.readError={codigo:'ORIENTACAO_DUVIDOSA',mensagem:'Confira a orientação'};$('btnLer').click();await pause();assert.equal($('orientacaoPanel').hidden,false);assert.equal($('revisaoPanel').hidden,true);
 await change('orientacaoManual',true);h.settings.readError=null;$('btnLer').click();await pause();assert.equal(calls.filter(c=>c.url.endsWith('/processar_gabarito')).at(-1).options.body.get('orientacao_confirmada'),'true');
 await change('q2','B');await change('confirmado',true);h.settings.saveError=503;$('btnSalvar').click();await pause();assert.equal($('revisaoPanel').hidden,false);assert.equal($('btnSalvar').disabled,false);
 h.settings.saveError=409;$('btnSalvar').click();await pause();assert.equal($('btnSalvar').disabled,true);
 }finally{h.close();}
});

test('modo manual não escolhe próximo aluno; falha de progresso não repete gravação',async()=>{
 const h=setup(),{$,calls,change}=h;try{
 await pause();await h.login();await change('turma','Turma A');await change('aluno','ALUNO UM');await change('modoSequencia',false);await h.photo();$('btnLer').click();await pause();await change('q2','C');await change('confirmado',true);
 assert.equal($('btnSalvar').textContent,'Salvar na planilha');
 h.settings.progressError=true;$('btnSalvar').click();await pause();
 assert.equal($('aluno').value,'');assert.equal($('status').className,'sucesso');assert.match($('status').textContent,/progresso não pôde/);
 assert.equal(calls.filter(c=>c.url.endsWith('/salvar_gabarito')).length,1);
 assert.equal($('btnDesmarcar').disabled,true);
 }finally{h.close();}
});

test('quantidade inválida é bloqueada antes de enviar a foto',async()=>{
 const h=setup(),{$,calls,change}=h;try{
 await pause();await h.login();await change('turma','Turma A');await change('aluno','ALUNO UM');await h.photo();
 $('quantidade').value='0';$('btnLer').click();await pause();
 assert.equal(calls.filter(c=>c.url.endsWith('/processar_gabarito')).length,0);assert.match($('status').textContent,/quantidade correta/);
 }finally{h.close();}
});
