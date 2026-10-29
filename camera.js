"use strict";
// Local framing only. The server still validates the bubbles and reads answers.
(() => {
  const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function hull(points) {
    points.sort((a,b)=>a.x-b.x||a.y-b.y);
    const half = (list) => { const out=[]; for(const p of list) { while(out.length>1 && cross(out.at(-2),out.at(-1),p)<=0) out.pop(); out.push(p); } return out; };
    const a=half(points), b=half([...points].reverse()); a.pop(); b.pop(); return a.concat(b);
  }
  function detect(image) {
    const {width:w,height:h,data}=image;
    const gray=new Uint8Array(w*h), integral=new Float64Array((w+1)*(h+1));
    for(let y=0;y<h;y++) { let sum=0; for(let x=0;x<w;x++) { const i=y*w+x,j=i*4; gray[i]=(data[j]*77+data[j+1]*150+data[j+2]*29)>>8; sum+=gray[i]; integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+sum; } }
    const mask=new Uint8Array(w*h), radius=12;
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1);
      const mean=(integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0])/((x1-x0)*(y1-y0));
      if(gray[y*w+x]<mean-18) mask[y*w+x]=1;
    }
    const seen=new Uint8Array(w*h), queue=new Int32Array(w*h); let best=null;
    for(let start=0;start<mask.length;start++) {
      if(!mask[start]||seen[start]) continue;
      let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0; queue[0]=start; seen[start]=1;
      const boundary=[];
      while(head<tail) {
        const i=queue[head++],x=i%w,y=(i/w)|0; minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        if(!mask[i-1]||!mask[i+1]||!mask[i-w]||!mask[i+w]) boundary.push({x,y});
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) { const nx=x+dx,ny=y+dy,n=ny*w+nx; if(nx>0&&nx<w-1&&ny>0&&ny<h-1&&mask[n]&&!seen[n]) {seen[n]=1;queue[tail++]=n;} }
      }
      const bw=maxX-minX,bh=maxY-minY;
      if(tail<150||bw<w*.25||bh<h*.12||bw*bh<w*h*.12||minX<5||minY<5||maxX>w-6||maxY>h-6||bw/bh<.16||bw/bh>3.5) continue;
      const polygon=hull(boundary);
      // Remove the least significant convex vertices, retaining the four corners.
      while(polygon.length>4) {let idx=0,area=Infinity;for(let j=0;j<polygon.length;j++){const a=Math.abs(cross(polygon[(j+polygon.length-1)%polygon.length],polygon[j],polygon[(j+1)%polygon.length]));if(a<area){area=a;idx=j;}}polygon.splice(idx,1);}
      if(polygon.length!==4) continue;
      const area=Math.abs(polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%4];return s+p.x*q.y-p.y*q.x;},0))/2;
      if(area<w*h*.16||area<bw*bh*.65) continue;
      let supported=true,contrast=0;
      for(let k=0;k<4;k++) {
        const a=polygon[k],b=polygon[(k+1)%4],c=polygon[(k+2)%4];
        const cosine=Math.abs(((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y))/(distance(a,b)*distance(b,c)));
        if(cosine>.65||distance(a,b)<55){supported=false;break;}
        let hits=0,delta=0; const length=distance(a,b),nx=-(b.y-a.y)/length,ny=(b.x-a.x)/length;
        for(let s=1;s<40;s++) {
          const x=Math.round(a.x+(b.x-a.x)*s/40),y=Math.round(a.y+(b.y-a.y)*s/40);let darkest=255,nearDark=false;
          for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++) {const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h){darkest=Math.min(darkest,gray[yy*w+xx]);if(mask[yy*w+xx])nearDark=true;}}
          if(nearDark) hits++;
          const ox=Math.max(0,Math.min(w-1,Math.round(x+nx*9))),oy=Math.max(0,Math.min(h-1,Math.round(y+ny*9)));
          delta+=Math.max(0,gray[oy*w+ox]-darkest);
        }
        if(hits/39<.85){supported=false;break;} contrast+=delta/39;
      }
      if(!supported||contrast/4<35) continue;
      // Detail inside the box must survive downsampling (reject defocus/blank panels).
      let energy=0,n=0;
      for(let y=minY+8;y<maxY-8;y+=2) for(let x=minX+8;x<maxX-8;x+=2) {
        if(polygon.some((p,k)=>cross(p,polygon[(k+1)%4],{x,y})<0))continue;
        const i=y*w+x,lap=gray[i-1]+gray[i+1]+gray[i-w]+gray[i+w]-4*gray[i];energy+=lap*lap;n++;
      }
      const sharpness=energy/Math.max(1,n);
      if(sharpness<65) continue;
      // Canonical first corner prevents tiny changes on the left edge from
      // rotating the corner indices between otherwise stable observations.
      let first=0;for(let i=1;i<4;i++)if(polygon[i].x+polygon[i].y<polygon[first].x+polygon[first].y)first=i;
      if(!best||area>best.area)best={corners:Array.from({length:4},(_,i)=>polygon[(first+i)%4]).map(p=>({x:p.x/w,y:p.y/h})),area,sharpness};
    }
    return {box:best,gray};
  }
  class Stability {
    constructor(){this.reset();}
    reset(){this.samples=[];this.lastValid=null;this.progress=0;}
    update(result,now){
      const box=result.box;
      if(!box) {
        // A single missed outline can occur during autofocus or hand tremor.
        // Preserve brief progress, but never capture a frame without a box.
        if(this.lastValid!==null&&now-this.lastValid>650)this.reset();
        return {progress:this.progress,ready:false,phase:"searching"};
      }
      if(this.lastValid!==null&&now-this.lastValid>2000)this.reset();
      this.lastValid=now;
      this.samples.push({corners:box.corners,time:now});
      this.samples=this.samples.filter(s=>now-s.time<=5000).slice(-6);

      // Compare the outline over a short window. Raw pixel differences across
      // the whole video made normal hand tremor and background changes reset
      // the old counter, even when the answer box remained sharp and readable.
      const median=values=>{const a=values.sort((a,b)=>a-b),n=a.length;return (a[(n-1)>>1]+a[n>>1])/2;};
      const center=Array.from({length:4},(_,i)=>({
        x:median(this.samples.map(s=>s.corners[i].x)),
        y:median(this.samples.map(s=>s.corners[i].y))
      }));
      const spread=Math.max(...this.samples.flatMap(s=>s.corners.map((p,i)=>distance(p,center[i]))));
      const split=Math.floor(this.samples.length/2);
      const average=list=>Array.from({length:4},(_,i)=>({
        x:list.reduce((sum,s)=>sum+s.corners[i].x,0)/list.length,
        y:list.reduce((sum,s)=>sum+s.corners[i].y,0)/list.length
      }));
      let drift=0;
      if(this.samples.length>=4) {
        const before=average(this.samples.slice(0,split)),after=average(this.samples.slice(split));
        drift=Math.max(...before.map((p,i)=>distance(p,after[i])));
      }
      if(spread>.045||drift>.03) {
        this.samples=[{corners:box.corners,time:now}];this.progress=0;
        return {progress:0,ready:false,phase:"moving"};
      }
      const elapsed=now-this.samples[0].time;
      this.progress=Math.min(1,elapsed/900,(this.samples.length-1)/3);
      return {progress:this.progress,ready:this.progress>=1,phase:"steady"};
    }
  }
  window.CorretorCamera={detect,Stability};
})();
