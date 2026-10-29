const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../camera.js'),'utf8'),sandbox);
const {detect,Stability}=sandbox.window.CorretorCamera;
function sheet({dark=1,cut=false,empty=false}={}) {
  const width=360,height=480,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    let v=235;
    const left=cut?-5:55,right=310,top=120,bottom=350;
    if(x>=left&&x<=right&&y>=top&&y<=bottom&&(x<left+4||x>right-4||y<top+4||y>bottom-4)) v=20;
    if(!empty)for(let row=0;row<5;row++)for(let col=0;col<5;col++) {
      const d=Math.hypot(x-(95+col*42),y-(155+row*36));
      if(d<8&&(d>5||col===0))v=25;
    }
    const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=v*dark;data[i+3]=255;
  }
  return {width,height,data};
}
test('quadro completo com marcas, inclusive com menos luz',()=>{
 for(const dark of [1,.6])assert.ok(detect(sheet({dark})).box);
});
test('não captura borda cortada, quadro vazio ou página branca',()=>{
 assert.equal(detect(sheet({cut:true})).box,null);
 assert.equal(detect(sheet({empty:true})).box,null);
 const blank=sheet();blank.data.fill(255);assert.equal(detect(blank).box,null);
});
test('exige estabilidade contínua e reinicia após movimento, perda ou pausa',()=>{
 const result=detect(sheet()),stable=new Stability();
 assert.equal(stable.update(result,0).ready,false);
 let state;for(let t=200;t<=1200;t+=200)state=stable.update(result,t);
 assert.equal(state.ready,true);
 const moved={...result,box:{...result.box,corners:result.box.corners.map(p=>({x:p.x+.04,y:p.y}))}};
 assert.equal(stable.update(moved,1400).progress,0);
 assert.equal(stable.update({box:null,gray:result.gray},1600).ready,false);
 for(let t=1800;t<=3000;t+=200)state=stable.update(result,t);
 assert.equal(state.ready,true);
 assert.equal(stable.update(result,4200).ready,false);
});
test('mudança de exposição e deslocamento gradual impedem captura',()=>{
 const original=detect(sheet()),stable=new Stability();
 stable.update(original,0);
 const exposed={...original,gray:original.gray.map(v=>Math.min(255,v+20))};
 assert.equal(stable.update(exposed,200).progress,0);
 stable.reset();stable.update(original,0);
 for(let i=1;i<=6;i++) {
  const moving={...original,box:{...original.box,corners:original.box.corners.map(p=>({x:p.x+i*.012,y:p.y}))}};
  assert.equal(stable.update(moving,i*200).ready,false);
 }
});
