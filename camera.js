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
    reset(){this.previous=null;this.anchor=null;this.since=null;this.count=0;this.lastTime=null;}
    update(result,now){
      const previous=this.previous,box=result.box;
      let stable=Boolean(box&&previous?.box&&this.lastTime!==null&&now-this.lastTime<=900);
      if(stable) {
        const drift=Math.max(...box.corners.map((p,i)=>distance(p,previous.box.corners[i])));
        let delta=0,n=0;for(let i=0;i<result.gray.length;i+=16){delta+=Math.abs(result.gray[i]-previous.gray[i]);n++;}
        const totalDrift=Math.max(...box.corners.map((p,i)=>distance(p,this.anchor.corners[i])));
        stable=drift<.018&&totalDrift<.025&&delta/Math.max(1,n)<7;
      }
      if(!stable){this.since=box?now:null;this.count=box?1:0;this.anchor=box;}else this.count++;
      this.previous=result;this.lastTime=now;
      const progress=box&&this.since!==null?Math.min(1,(now-this.since)/1100):0;
      return {progress,ready:progress>=1&&this.count>=6};
    }
  }
  window.CorretorCamera={detect,Stability};
})();
