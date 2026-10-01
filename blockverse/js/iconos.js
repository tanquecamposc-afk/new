"use strict";
/* =========================================================
   Iconos de todos los objetos
   ========================================================= */
const PALO=[124,90,50];
const sombra=(c,f)=>c.map(v=>v*f);
// Dibuja una plantilla de 16 filas: cada letra es un color; con espejo se completa la mitad derecha
function plantilla(P,filas,cols,espejo){
  filas.forEach((f,y)=>{for(let x=0;x<f.length;x++){const c=cols[f[x]];if(!c)continue;P(x,y,c);if(espejo)P(15-x,y,cols[f[x]==='l'?'m':f[x]]||c);}});
}
const PALO_OSC=[84,60,32];
const PL_ESPADA=[
"................",
"............llm.",
"...........lmmd.",
"..........lmmd..",
".........lmmd...",
"........lmmd....",
".......lmmd.....",
"..g...lmmd......",
"..gg.lmmd.......",
"...ggmmd........",
"....ggd.........",
"...hHgg.........",
"..hH..gg........",
".hH.............",
"pp..............",
"pp.............."];
const PL_PICO=[
"................",
"....dmmmmmd.....",
"..dmllllllmmd...",
".dml.....hHdmd..",
".md.....hH...md.",
".d.....hH.....d.",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"hH..............",
"................",
"................",
"................"];
const PL_HACHA=[
"................",
".....dmmmd......",
"....dmlllmd.....",
"...dmlllllmd....",
"...mllllmhHd....",
"...mlllmhHmd....",
"...dmlmhHmd.....",
"....dmhHdd......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"hH..............",
"................"];
const PL_PALA=[
"................",
"..........dmmd..",
".........dmllmd.",
".........mllmmd.",
"..........mmmd..",
".........hHdd...",
"........hH......",
".......hH.......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"................",
"................"];
const PL_AZADA=[
"................",
"......dmmmd.....",
".....dmllmmhH...",
"......dd..hH....",
"..........hH....",
".........hH.....",
"........hH......",
".......hH.......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"................",
"................"];
const PL_LANZA=[
"................",
"............dml.",
"...........dmlm.",
"..........dmlmd.",
"...........hmd..",
"..........hH....",
".........hH.....",
"........hH......",
".......hH.......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"................"];
/* ---------- Herramientas y armas al estilo del original ----------
   Sprites de 16x16 con contorno de 1 píxel del tono más oscuro de cada pieza
   (el metal con su color, el palo marrón), cuatro tonos por material y el
   mango en diagonal de abajo a la izquierda hacia arriba a la derecha. */
const PALO_T={l:[150,114,62],m:[124,92,50],d:[94,70,36],o:[42,29,14]};
const mezclaCol=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
function tonosMat(c){const lum=(c[0]+c[1]+c[2])/3;
  return {w:mezclaCol(c,[255,255,255],lum>150?.5:.35),l:mezclaCol(sombra(c,1.12),[255,255,255],.12),m:c,d:sombra(c,.74),o:lum<100?sombra(c,.42):sombra(c,.3)};}
function sprite16(fn){
  const G=new Array(256).fill(null), OL=new Array(256).fill(null);
  const P=(x,y,c,o)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<16&&y<16&&c){G[y*16+x]=c;OL[y*16+x]=o;}};
  // Pinta con una paleta: P(x,y,'l',T) usa el tono l de T y su contorno
  const Q=(x,y,k,T)=>P(x,y,T[k],T.o);
  const palo=(x0,y0,n)=>{for(let i=0;i<n;i++)Q(x0+i,y0-i,i%3===1?'l':i%3===2?'d':'m',PALO_T);};
  fn({P,Q,palo});
  const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d'),img=ctx.createImageData(16,16);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=y*16+x;let col=G[i];
    if(!col){let mejor=null,lm=1e9;for(const [a,b] of [[0,-1],[-1,0],[1,0],[0,1]]){const X=x+a,Y=y+b;if(X<0||Y<0||X>15||Y>15)continue;const o=OL[Y*16+X];
        if(G[Y*16+X]&&o){const l=o[0]+o[1]+o[2];if(l<lm){lm=l;mejor=o;}}}col=mejor;}
    if(col){img.data[i*4]=clamp(col[0],0,255);img.data[i*4+1]=clamp(col[1],0,255);img.data[i*4+2]=clamp(col[2],0,255);img.data[i*4+3]=255;}}
  ctx.putImageData(img,0,0);return c;
}
// Rota coordenadas al eje del mango: a a lo largo (hacia arriba a la derecha), b de través
const ejeMango=(x,y,cx,cy)=>[((x-cx)-(y-cy))/Math.SQRT2,((x-cx)+(y-cy))/Math.SQRT2];
function dibujarHerramienta(it){
  const h=it.herr, T=tonosMat(MATS[h.mat].col), madera=h.mat===0;
  return sprite16(({P,Q,palo})=>{
    if(h.tipo==='espada'){
      // Hoja en diagonal con filo claro, lomo oscuro y punta brillante
      for(let t=0;t<9;t++){const cx=13-t,cy=2+t;Q(cx,cy,t<2?'w':t%4===1?'w':'l',T);Q(cx+1,cy,t>5?'d':'m',T);Q(cx+1,cy+1,t===8?'d':'d',T);}
      Q(14,1,'w',T);Q(15,1,'m',T);Q(14,2,'m',T);
      const G=madera?PALO_T:tonosMat(sombra(MATS[h.mat].col,h.mat===2?.62:.7));
      for(const [x,y,k] of [[2,8,'m'],[3,9,'l'],[4,10,'m'],[5,11,'m'],[6,12,'d'],[7,13,'d']])Q(x,y,k,G);
      Q(4,11,'d',G);
      palo(3,12,2); Q(1,14,'m',T);Q(2,14,'d',T);Q(1,13,'l',T);Q(2,13,'m',PALO_T);
    }else if(h.tipo==='pico'){
      palo(1,14,11);
      // Cabeza en arco (Bézier) de dos píxeles de grosor: canto claro por fuera y sombra por dentro
      const B=(t)=>[(1-t)*(1-t)*1.5+2*(1-t)*t*14.5+t*t*14.5,(1-t)*(1-t)*1.5+2*(1-t)*t*1.5+t*t*14.5];
      for(let k=0;k<=40;k++){const t=k/40,[x,y]=B(t),[nx,ny]=[1-x+ (x<1?0:0),14-y];const L=Math.hypot(nx,ny)||1,px=Math.round(x),py=Math.round(y);
        const punta=t<.08||t>.92,centro=t>.25&&t<.75;Q(px,py,punta?'m':centro&&t>.4&&t<.6?'w':'l',T);
        if(!punta)Q(Math.round(x+nx/L),Math.round(y+ny/L),centro?'m':'d',T);if(centro)Q(Math.round(x+2*nx/L),Math.round(y+2*ny/L),'d',T);}
      Q(11,4,'m',PALO_T);
    }else if(h.tipo==='hacha'){
      palo(1,14,11);
      // Cabeza: bloque ancho a la izquierda de la punta del mango, con el filo claro a la izquierda
      const filas=[[1,6,9],[2,5,10],[3,4,11],[4,4,10],[5,4,9],[6,5,8],[7,6,7]];
      for(const [y,x0,x1] of filas)for(let x=x0;x<=x1;x++){const k=x===x0?(y>=3&&y<=5?'w':'l'):y===1||x===x0+1?'l':x===x1||y===7?'d':'m';Q(x,y,k,T);}
    }else if(h.tipo==='pala'){
      palo(1,14,9);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){const [a,b]=ejeMango(x,y,11.5,4.5);
        if((a/3.8)**2+(b/2.7)**2<=1){const k=b<-1.2?'l':b>1.1?'d':a>2.2&&b<0?'w':'m';Q(x,y,k,T);}}
      Q(9,6,'d',PALO_T);
    }else if(h.tipo==='azada'){
      palo(1,14,11);
      for(let x=7;x<=12;x++){Q(x,2,x===12?'m':'l',T);Q(x,3,x>=11?'d':'m',T);}
      Q(6,3,'l',T);Q(6,4,'m',T);Q(7,4,'d',T);Q(13,3,'d',T);Q(12,1,'w',T);Q(8,2,'w',T);
    }else{ // lanza
      palo(0,15,12);
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){const [a,b]=ejeMango(x,y,13,2.6);
        if(Math.abs(a)/3.2+Math.abs(b)/1.6<=1&&a>-3){Q(x,y,b<-.3?'l':b>.4?'d':a>1?'w':'m',T);}}
      Q(11,4,'d',tonosMat([150,150,156]));
    }
  });
}
const PL_ARM=[
 ["","","....dmmm","...dmlll","..dmlmmm","..mlmmmm","..mld...","..mld...","..mm....","..dd....","","","","","",""],
 ["","",".dmmd...",".mlmmd..",".mlmmmmm",".dlmllmm","..dmlmmm","...mlmmm","...mlmmm","...mlmmm","...mlmmm","...dmmmm","...ddddd","","",""],
 ["","","...dmmmm","...mllll","...mlmmm","...mlmd.","...mlm..","...mlm..","...mlm..","...mlm..","...mlm..","...mlm..","...ddd..","","",""],
 ["","","","","","","..dmmd..","..mllm..","..mlmm..","..mlmm..",".dmlmm..",".mllmmd.",".mlmmmd.",".dddddd.","",""]];
function dibujarArmadura(it){
  const a=it.armadura,m=ARM_MATS[a.mat].col,osc=sombra(m,.7),cla=sombra(m,1.22);
  return lienzo16(400+a.pieza*10+a.mat,({P})=>plantilla(P,PL_ARM[a.pieza],{m,l:cla,d:osc},true));
}
const PL_POCION=["","......gg","......gw","......gw",".....gLL","....gLLL","...gLwLL","..gLwLLL","..gLLLLL","..gLLLLL","..gLLLLL","...gLLLL","....gggg","","",""];
const PL_POCION_ARROJ=["","......gg","......gw",".....gww","....gLLL","...gLLLL","..gLwLLL",".gLwLLLL",".gLLLLLL",".gLLLLLL","..gLLLLL","...ggggg","","","",""];
// Ballesta: culata, arco de madera y cuerda; cargada lleva la flecha puesta
function dibujarBallesta(P,linea,cargada){
  linea(3,13,11,5,[104,74,40]); linea(4,13,11,6,[80,56,30]);
  linea(5,4,13,12,[120,86,50]); linea(6,4,13,11,[150,110,64]); P(5,4,[90,90,96]); P(13,12,[90,90,96]);
  if(cargada){linea(6,6,11,11,[222,222,222]); linea(4,12,11,5,[140,104,62]); P(11,4,[200,200,210]); P(12,4,[170,170,180]); P(11,3,[170,170,180]);}
  else{linea(7,5,12,10,[222,222,222]);}
  P(3,13,[90,90,96]); P(2,14,[90,90,96]);
}
// Arco con la cuerda tensada según la fase (0 en reposo, 1-3 cargando con la flecha)
function dibujarArco(fase){
  return lienzo16(225+fase*7,({P,linea})=>{
    const S1=[3,2],S2=[13,12],C=[15-fase*.4,0+fase*.3];
    const q=(t)=>[(1-t)*(1-t)*S1[0]+2*(1-t)*t*C[0]+t*t*S2[0],(1-t)*(1-t)*S1[1]+2*(1-t)*t*C[1]+t*t*S2[1]];
    const tir=[8-fase*1.3,7+fase*1.3];
    linea(S1[0],S1[1],Math.round(tir[0]),Math.round(tir[1]),[222,222,222]); linea(Math.round(tir[0]),Math.round(tir[1]),S2[0],S2[1],[222,222,222]);
    if(fase>0){const [x0,y0]=tir.map(Math.round);linea(x0,y0,x0+7,y0-7,[150,112,68]);P(x0+7,y0-7,[190,190,200]);P(x0+8,y0-8,[220,220,230]);P(x0+7,y0-8,[160,160,170]);P(x0+8,y0-7,[160,160,170]);
      P(x0,y0,[240,240,240]);P(x0-1,y0,[240,240,240]);P(x0,y0+1,[240,240,240]);}
    for(let k=0;k<=24;k++){const t=k/24,[x,y]=q(t);P(x,y,t>.4&&t<.6?[90,62,34]:[140,98,54]);const [x2,y2]=q(Math.min(1,t+.02));P(x2+1,y2,[112,78,42]);}
  });
}
function polvo(P,rnd,col,col2){for(let i=0;i<34;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*5;P(8+Math.cos(a)*d*1.1,10+Math.sin(a)*d*.55-(5-d)*.4,rnd()<.3?col2:col);}}
function lingote(P,rect,c){rect(4,6,11,6,sombra(c,1.15));rect(3,7,12,9,c);rect(3,10,12,10,sombra(c,.7));}
function gema(P,c,c2){for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(Math.abs(x+.5-8)/6+Math.abs(y+.5-8)/6.5<=1)P(x,y,y<8?c:c2);P(6,5,[240,255,255]);P(7,4,[240,255,255]);}
function carne(elipse,linea,P,c,c2,hueso){elipse(8.5,8,6,4.2,c,14);linea(5,7,12,9,c2);if(hueso){P(2,10,[236,230,214]);P(1,11,[236,230,214]);P(2,12,[236,230,214]);}}
function muslo(elipse,linea,P,c){elipse(9,7,4.5,4,c,12);linea(5,10,3,13,[236,230,214]);P(2,13,[236,230,214]);P(3,14,[236,230,214]);}
// Armas y utensilios dibujados con el mismo estilo que las herramientas
const DIBUJOS_ARMAS={
  224:({Q})=>{ // flecha: punta de pedernal, astil y plumas
    const Pd=tonosMat([150,150,158]),F=tonosMat([232,232,232]);
    for(let i=0;i<9;i++)Q(3+i,12-i,i%2?'l':'m',PALO_T);
    Q(12,3,'m',Pd);Q(13,2,'l',Pd);Q(14,1,'w',Pd);Q(12,2,'l',Pd);Q(13,3,'d',Pd);Q(11,2,'w',Pd);Q(13,4,'d',Pd);
    Q(2,13,'m',F);Q(1,14,'l',F);Q(1,12,'w',F);Q(2,12,'l',F);Q(3,14,'d',F);Q(3,13,'m',F);Q(1,13,'m',F);Q(2,14,'d',F);},
  612:({Q})=>{ // tridente: mango de prismarina y tres puntas
    const M=tonosMat([74,120,108]),H=tonosMat([120,200,180]);
    for(let i=0;i<10;i++)Q(1+i,14-i,i%2?'l':'m',M);
    for(const [x,y] of [[8,3],[9,4],[10,5],[11,6],[12,7]])Q(x,y,'m',H);
    for(const [x,y,k] of [[9,2,'l'],[10,1,'w'],[13,6,'l'],[14,5,'w'],[11,4,'m'],[12,3,'l'],[13,2,'l'],[14,1,'w']])Q(x,y,k,H);
    Q(9,3,'d',H);Q(12,6,'d',H);},
  613:({Q,P})=>{ // caña de pescar: vara curvada, sedal y anzuelo
    const pts=[[1,14],[2,13],[3,12],[4,11],[5,10],[6,9],[7,8],[8,7],[9,6],[10,5],[11,4],[12,3],[13,2]];
    pts.forEach(([x,y],i)=>Q(x,y,i%3===1?'l':i%3===2?'d':'m',PALO_T));
    for(let y=3;y<=11;y++)P(14,y,[228,228,228],[90,90,90]);
    const G=tonosMat([160,160,170]);Q(14,12,'m',G);Q(13,13,'l',G);Q(12,12,'d',G);},
  540:({Q})=>{ // maza: mango de vara de breeze y cabeza pesada con pinchos
    const V=tonosMat([150,196,226]),Mz=tonosMat([92,94,104]);
    for(let i=0;i<7;i++)Q(1+i,14-i,i%2?'l':'m',V);
    for(let y=3;y<=8;y++)for(let x=8;x<=13;x++)Q(x,y,x===8||y===3?'l':x===13||y===8?'d':(x+y)%3===0?'w':'m',Mz);
    for(const [x,y] of [[7,2],[14,2],[14,9],[10,1],[15,5],[11,10]])Q(x,y,'w',Mz);Q(10,5,'w',V);Q(11,6,'l',V);},
  229:({Q})=>{ // mechero: anillo de acero y pedernal
    const A=tonosMat([160,160,168]),Pd=tonosMat([60,60,66]);
    for(const [x,y,k] of [[3,4,'l'],[4,3,'w'],[5,3,'l'],[6,3,'m'],[7,4,'m'],[8,5,'d'],[8,6,'d'],[2,5,'l'],[2,6,'m'],[2,7,'m'],[3,8,'d'],[4,9,'d'],[5,9,'d']])Q(x,y,k,A);
    for(let y=8;y<=13;y++)for(let x=8;x<=13;x++)if(Math.abs(x-10.5)+Math.abs(y-10.5)<=3.2)Q(x,y,x+y<20?'l':x+y>22?'d':'m',Pd);},
};
/* ---------- Objetos comunes al estilo del original ----------
   Formas sólidas con relieve de cuatro tonos (canto claro arriba a la izquierda,
   sombra abajo a la derecha) y contorno del color oscuro del material. */
function solidoT(Q,dentro,T,brillo){
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){if(!dentro(x,y))continue;
    const arriba=!dentro(x,y-1),izq=!dentro(x-1,y),abajo=!dentro(x,y+1),der=!dentro(x+1,y);
    let k=(arriba||izq)?'l':(abajo||der)?'d':'m';
    if(arriba&&izq)k='w';
    if(brillo&&brillo(x,y))k='w';
    Q(x,y,k,T);}
}
const enElipse=(cx,cy,rx,ry)=>(x,y)=>((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1;
const enElipseRot=(cx,cy,a,b,ang)=>(x,y)=>{const dx=x+.5-cx,dy=y+.5-cy,c=Math.cos(ang),s=Math.sin(ang),u=dx*c+dy*s,v=-dx*s+dy*c;return (u/a)**2+(v/b)**2<=1;};
function lingoteT(Q,c){ // barra vista desde arriba: cara superior clara, frente y lateral oscuro
  const T=tonosMat(c), top=(x,y)=>y>=4&&y<=7&&x>=5-(y-4)&&x<=14-(y-4);
  for(let y=4;y<=11;y++)for(let x=0;x<16;x++){
    if(top(x,y)){Q(x,y,(y===4||x===5-(y-4))?'w':'l',T);continue;}
    let ext=false;for(let k=1;k<=4;k++)if(top(x,y-k))ext=true; if(!ext)continue;
    Q(x,y,y===11?'d':x<=11?'m':'d',T);}
}
function gemaT(Q,c){ // diamante tallado
  const T=tonosMat(c), W=[0,0,0,3,5,6,6,6,5,4,3,2,1,0,0,0];
  for(let y=3;y<=12;y++){const w=W[y];for(let x=8-w;x<8+w;x++){
    let k=y<=4?'w':x<8?'l':'m';if(y>=9)k=x<8?'m':'d';if(x===8-w||x===8+w-1)k=y<=5?'l':'d';if(y===5&&(x===6||x===9))k='w';Q(x,y,k,T);}}
}
function esmeraldaT(Q,c){
  const T=tonosMat(c);for(let y=1;y<15;y++)for(let x=0;x<16;x++){const d=Math.abs(x+.5-8)/4.6+Math.abs(y+.5-8)/7;if(d>1)continue;
    Q(x,y,Math.abs(x+.5-8)<1.2?(y<8?'w':'l'):x<8?(y<8?'l':'m'):(y<8?'m':'d'),T);}
}
function polvoT(Q,c,sem){ // montoncito de polvo con granos sueltos
  const T=tonosMat(c),r=mulberry32(sem);
  for(let y=7;y<=13;y++){const w=Math.round((y-6)*.95+1);for(let x=8-w;x<=7+w;x++)if(r()<.82)Q(x,y,y===7?'w':r()<.3?'l':r()<.3?'d':'m',T);}
  for(let k=0;k<6;k++)Q(2+Math.floor(r()*12),3+Math.floor(r()*4),'l',T);
}
function brutoT(Q,c,sem){ // mineral en bruto: tres pepitas juntas con motas
  const T=tonosMat(c),r=mulberry32(sem);
  const d=(x,y)=>enElipse(6,9.5,3.6,3.3)(x,y)||enElipse(10.5,8,3.4,3.4)(x,y)||enElipse(8.5,5,2.8,2.6)(x,y);
  solidoT(Q,d,T,(x,y)=>r()<.08);
}
function esferaT(Q,c,cx=8,cy=8,rr=5.2){
  const T=tonosMat(c);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dx=x+.5-cx,dy=y+.5-cy,d=Math.hypot(dx,dy);if(d>rr)continue;
    const luz=(-dx-dy)/rr;Q(x,y,d<rr*.35&&dx<0&&dy<0?'w':luz>.35?'l':luz<-.45||d>rr-1&&luz<0?'d':'m',T);}
}
function carneT(Q,c,cocida,hueso){ // filete con vetas de grasa (cruda) o marcas de parrilla (cocinada)
  const T=tonosMat(c),G=tonosMat(cocida?sombra(c,.62):mezclaCol(c,[255,240,230],.55)),dentro=enElipseRot(8,8.5,6.4,4.3,-.35);
  solidoT(Q,dentro,T);
  for(let x=3;x<14;x++){const y=Math.round(8.5-(x-8)*.36+(cocida?0:Math.sin(x*.9)));if(cocida){if(x%3===0)for(let k=-2;k<=2;k++)if(dentro(x+k,y+k))Q(x+k,y+k,'m',G);}else if(dentro(x,y))Q(x,y,'l',G);}
  if(hueso){const H=tonosMat([236,230,214]);Q(2,11,'l',H);Q(1,12,'w',H);Q(2,12,'m',H);Q(1,13,'m',H);}
}
function musloT(Q,c){const T=tonosMat(c),H=tonosMat([236,230,214]);solidoT(Q,enElipse(9.5,6.5,4.6,4.2),T);
  for(const [x,y] of [[5,10],[4,11],[3,12]])Q(x,y,'l',H);Q(2,12,'w',H);Q(2,13,'m',H);Q(3,13,'d',H);}
function varaT(Q,c,n=12){const T=tonosMat(c);for(let i=0;i<n;i++){const x=2+i,y=13-i;Q(x,y,i%3===0?'w':'l',T);Q(x+1,y,'m',T);}}
function cuboT(Q,liquido){ // cubo de hierro con asa y el contenido dentro
  const T=tonosMat([198,198,202]);
  for(let y=5;y<=13;y++){const w=y<=6?6:Math.max(3,6-Math.floor((y-6)*.45));for(let x=8-w;x<8+w;x++){
    const k=y===5?'l':x===8-w?'l':x===8+w-1?'d':y===13?'d':'m';Q(x,y,k,T);}}
  for(let x=3;x<=12;x++)Q(x,2+Math.round(Math.abs(x-7.5)*.5),'d',T);
  if(liquido){const L=tonosMat(liquido);for(let x=3;x<=12;x++){Q(x,6,x<6?'w':'l',L);}for(let x=4;x<=11;x++)Q(x,7,'m',L);}
  else for(let x=3;x<=12;x++){Q(x,6,'d',T);}
}
const DIBUJOS_OBJETOS={
  200:({palo})=>palo(2,13,12),
  201:({Q})=>{const T=tonosMat([48,48,52]),r=mulberry32(201);solidoT(Q,(x,y)=>enElipse(8,8.5,5.4,4.8)(x,y)&&!(x+y===5)&&!(x===13&&y<7),T,()=>r()<.07);},
  202:({Q})=>brutoT(Q,[212,170,140],202), 209:({Q})=>brutoT(Q,[240,190,50],209), 212:({Q})=>brutoT(Q,[204,112,74],212),
  203:({Q})=>lingoteT(Q,[220,220,222]), 210:({Q})=>lingoteT(Q,[250,212,62]), 213:({Q})=>lingoteT(Q,[228,132,92]),
  535:({Q})=>lingoteT(Q,[78,70,74]), 250:({Q})=>lingoteT(Q,[176,86,64]), 544:({Q})=>lingoteT(Q,[226,120,40]),
  204:({Q})=>gemaT(Q,[96,232,222]), 216:({Q})=>esmeraldaT(Q,[58,206,108]),
  215:({Q})=>{const T=tonosMat([38,78,196]),r=mulberry32(215);solidoT(Q,(x,y)=>Math.abs(x+.5-8)+Math.abs(y+.5-8)*1.2<=6.2&&!(x>10&&y<6),T,()=>r()<.1);},
  217:({Q})=>{const T=tonosMat([236,230,222]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,8,8);return Math.abs(b)<=2.2-Math.max(0,Math.abs(a)-4)*.9&&Math.abs(a)<=6;},T);},
  661:({Q})=>{const T=tonosMat([168,112,220]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,8,8);return Math.abs(b)<=2.6-Math.max(0,Math.abs(a)-3)*.8&&Math.abs(a)<=6;},T);},
  218:({Q})=>{const T=tonosMat([74,72,76]);solidoT(Q,(x,y)=>y>=3&&y<=13&&x>=4+Math.floor((13-y)*.3)&&x<=12-Math.floor(Math.abs(y-7)*.6),T);},
  211:({Q})=>{const T=tonosMat([250,214,70]);for(const [cx,cy] of [[6,9],[10,8],[8,11]])solidoT(Q,enElipse(cx,cy,1.9,1.7),T);},
  205:({Q})=>{const T=tonosMat([214,34,40]),V=tonosMat([80,160,50]),P=PALO_T;solidoT(Q,(x,y)=>enElipse(8,9.5,5.4,5)(x,y)&&!(y<6&&x>=7&&x<=8),T,(x,y)=>x===5&&y===7);Q(8,3,'d',P);Q(8,4,'m',P);Q(9,3,'l',V);Q(10,3,'m',V);Q(10,2,'l',V);},
  242:({Q})=>{const T=tonosMat([250,210,60]),V=tonosMat([80,160,50]),P=PALO_T;solidoT(Q,(x,y)=>enElipse(8,9.5,5.4,5)(x,y)&&!(y<6&&x>=7&&x<=8),T,(x,y)=>x===5&&y===7);Q(8,3,'d',P);Q(8,4,'m',P);Q(9,3,'l',V);Q(10,3,'m',V);Q(10,2,'l',V);},
  237:({Q})=>{const T=tonosMat([196,138,64]),dentro=enElipseRot(8,8,6.6,3.3,-.6);solidoT(Q,dentro,T);const C=tonosMat([228,190,120]);
    for(let k=0;k<3;k++){const cx=5.5+k*2.6,cy=10-k*2.2;for(let q=-1;q<=1;q++)if(dentro(Math.round(cx+q),Math.round(cy+q)))Q(Math.round(cx+q),Math.round(cy+q),'l',C);}},
  206:({Q})=>carneT(Q,[238,148,150],false,true), 207:({Q})=>carneT(Q,[196,128,86],true,true),
  244:({Q})=>carneT(Q,[204,60,58],false,false), 245:({Q})=>carneT(Q,[138,78,46],true,false),
  240:({Q})=>carneT(Q,[222,94,92],false,false), 241:({Q})=>carneT(Q,[168,98,62],true,false),
  208:({Q})=>carneT(Q,[146,118,70],false,false),
  238:({Q})=>musloT(Q,[242,204,184]), 239:({Q})=>musloT(Q,[206,138,70]),
  214:({Q})=>polvoT(Q,[210,24,24],214), 246:({Q})=>polvoT(Q,[250,220,90],246), 221:({Q})=>polvoT(Q,[90,90,92],221),
  516:({Q})=>polvoT(Q,[244,244,248],516), 231:({Q})=>polvoT(Q,[240,150,30],231), 223:({Q})=>polvoT(Q,[236,234,226],223),
  222:({Q})=>{const H=tonosMat([236,232,218]);for(let i=0;i<8;i++){Q(4+i,11-i,'l',H);Q(5+i,11-i,'m',H);}
    for(const [x,y,k] of [[2,11,'w'],[3,10,'l'],[2,12,'l'],[3,13,'m'],[4,13,'d'],[12,2,'w'],[13,2,'l'],[13,3,'m'],[14,4,'d'],[12,3,'m']])Q(x,y,k,H);},
  219:({Q})=>{const T=tonosMat([230,230,230]);for(let t=0;t<=40;t++){const a=t/40,x=2+a*12,y=8+Math.sin(a*Math.PI*3)*3.2;Q(x,y,a<.3?'w':'l',T);}},
  220:({Q})=>{const T=tonosMat([238,238,238]),C=tonosMat([150,150,150]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,8.5,7.5);return a>-5&&a<6&&Math.abs(b)<=2.6*Math.sin((a+5)/11*Math.PI);},T);for(let i=0;i<12;i++)Q(2+i,13-i,i<3?'d':'m',C);},
  232:({Q})=>esferaT(Q,[34,110,100]), 525:({Q})=>esferaT(Q,[120,200,90]), 666:({Q})=>esferaT(Q,[240,248,250]), 251:({Q})=>esferaT(Q,[160,166,182],8,8.5,4.6),
  233:({Q})=>{esferaT(Q,[70,150,90]);const O=tonosMat([30,50,40]);for(let y=6;y<=10;y++)Q(8,y,'m',O);Q(7,8,'m',O);Q(9,8,'m',O);},
  677:({Q})=>{const T=tonosMat([236,222,190]);solidoT(Q,enElipse(8,8.8,4.3,5.6),T);},
  230:({Q})=>varaT(Q,[250,196,60]), 539:({Q})=>varaT(Q,[150,200,230]),
  236:({Q})=>{const T=tonosMat([214,178,76]),V=tonosMat([150,140,60]);for(const [x0,d] of [[5,-1],[8,0],[11,1]]){for(let y=8;y<=14;y++)Q(x0+Math.round((14-y)*d*.3),y,'d',V);
      for(let y=2;y<=8;y++){const x=x0+Math.round((8-y)*d*.4);Q(x,y,'l',T);Q(x+1,y,y%2?'m':'d',T);}}},
  235:({Q})=>{const T=tonosMat([80,150,50]);for(const [x,y] of [[5,6],[9,5],[7,9],[11,9],[4,11],[9,12]]){Q(x,y,'l',T);Q(x+1,y,'m',T);Q(x,y+1,'d',T);}},
  243:({Q})=>{const T=tonosMat([150,92,52]);solidoT(Q,(x,y)=>x>=2&&x<=13&&y>=3&&y<=13&&!((x<=3||x>=12)&&(y<=4||y>=12))&&!(y===8&&(x<=2||x>=13)),T,(x,y)=>(x*7+y*3)%11===0);},
  247:({Q})=>{const T=tonosMat([244,244,236]),L=tonosMat([200,200,190]);solidoT(Q,(x,y)=>y>=2&&y<=13&&x>=3+Math.floor((13-y)*.2)&&x<=12+Math.floor((13-y)*.2)-2,T);for(const y of [5,8,11])for(let x=5;x<=10;x++)Q(x+Math.floor((13-y)*.2),y,'m',L);},
  248:({Q})=>{const T=tonosMat([124,54,34]),Pg=tonosMat([240,236,220]);solidoT(Q,(x,y)=>x>=3&&x<=12&&y>=2&&y<=13,T);for(let y=3;y<=13;y++){Q(12,y,'l',Pg);Q(13,y,'m',Pg);}for(let x=4;x<=12;x++)Q(x,13,'l',Pg);Q(4,4,'w',tonosMat([230,200,90]));},
  640:({Q})=>{const T=tonosMat([240,140,30]),V=tonosMat([70,160,40]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,7.5,8.5);return a>-6.5&&a<4.5&&Math.abs(b)<=.6+(a+6.5)*.22;},T,(x,y)=>(x+y)%4===0&&x>5);
    for(const [x,y] of [[11,4],[12,3],[12,2],[13,4],[13,5],[11,2],[14,5]])Q(x,y,'l',V);},
  641:({Q})=>{const T=tonosMat([204,160,84]),r=mulberry32(641);solidoT(Q,enElipseRot(8,8.5,5.6,4.2,-.4),T,()=>r()<.07);},
  642:({Q})=>{const T=tonosMat([214,150,60]),r=mulberry32(642);solidoT(Q,enElipseRot(8,8.5,5.6,4.2,-.4),T,()=>r()<.07);},
  644:({Q})=>{const T=tonosMat([160,30,50]),V=tonosMat([60,140,40]);solidoT(Q,enElipse(8,10,4.4,4),T);Q(8,14,'d',T);for(const [x,y] of [[7,5],[6,4],[9,5],[10,4],[8,4],[8,3]])Q(x,y,'l',V);},
  648:({Q})=>{const T=tonosMat([206,140,74]),C=tonosMat([70,40,20]);solidoT(Q,enElipse(8,8,5.4,5.4),T);for(const [x,y] of [[6,6],[9,7],[7,10],[10,10],[5,9]])Q(x,y,'m',C);},
  226:({Q})=>cuboT(Q,null), 227:({Q})=>cuboT(Q,[50,100,230]), 228:({Q})=>cuboT(Q,[250,130,20]),
  653:({Q})=>{const T=tonosMat([150,150,158]),F=tonosMat([236,236,230]),R=tonosMat([220,40,40]);solidoT(Q,enElipse(8,8,6,6),T);solidoT(Q,enElipse(8,8,4.2,4.2),F);Q(9,6,'m',R);Q(10,5,'l',R);Q(7,9,'d',tonosMat([60,60,70]));Q(6,10,'d',tonosMat([60,60,70]));},
  654:({Q})=>{const T=tonosMat([240,200,60]),F=tonosMat([120,170,230]);solidoT(Q,enElipse(8,8,6,6),T);solidoT(Q,enElipse(8,8,4.2,4.2),F);for(let x=5;x<=11;x++)Q(x,x<8?9:9,'m',tonosMat([60,110,40]));Q(8,5,'w',tonosMat([250,240,150]));},
};
/* ---------- Armaduras, pociones, tintes, huevos y más objetos al estilo original ---------- */
const MASCARA_ARM=[
  (x,y)=>y>=3&&y<=10&&x>=3&&x<=12&&!(y===3&&(x<5||x>10))&&!(y>=7&&x>=5&&x<=10),                                   // casco
  (x,y)=>y>=2&&y<=13&&((y<=4&&x>=1&&x<=14&&!(y<=3&&x>=6&&x<=9))||(y>=5&&y<=8&&(x<=2&&x>=1||x>=13&&x<=14))||(y>=5&&x>=3&&x<=12)),  // pechera
  (x,y)=>y>=2&&y<=13&&x>=3&&x<=12&&(y<=5||x<=6||x>=9),                                                              // pantalones
  (x,y)=>y>=7&&y<=13&&((x>=2&&x<=5&&y<=10)||(x>=1&&x<=6&&y>=11)||(x>=10&&x<=13&&y<=10)||(x>=9&&x<=14&&y>=11)),     // botas
];
function armaduraT(Q,pieza,c){const T=tonosMat(c),m=MASCARA_ARM[pieza];
  solidoT(Q,m,T,(x,y)=>pieza===1?(x===5&&y>=6&&y<=11):pieza===2?((x===4||x===10)&&y>=6&&y<=11):false);
  if(pieza===1)for(let x=4;x<=11;x++)if(m(x,5))Q(x,5,'d',T);   // costura del cuello
}
function frascoT(Q,liquido,arrojadiza){ // frasco redondo con tapón, vidrio claro y líquido con brillo
  const V=tonosMat([214,226,240]),L=liquido?tonosMat(liquido):null,C=tonosMat([150,108,62]);
  Q(7,1,'l',C);Q(8,1,'m',C);
  const cuello=arrojadiza?[[6,2],[7,2],[8,2],[9,2],[6,3],[9,3],[5,4],[10,4]]:[[7,2],[8,2],[7,3],[8,3],[7,4],[8,4]];
  for(const [x,y] of cuello)Q(x,y,'l',V);
  const dentro=(x,y)=>((x+.5-8)/(arrojadiza?5.8:5.2))**2+((y+.5-9.8)/(arrojadiza?4.6:5))**2<=1;
  for(let y=4;y<16;y++)for(let x=0;x<16;x++){if(!dentro(x,y))continue;const borde=!dentro(x-1,y)||!dentro(x+1,y)||!dentro(x,y-1)||!dentro(x,y+1);
    if(borde)Q(x,y,x<8?'l':'m',V);else if(L&&y>=7)Q(x,y,(x===5&&y===9)||(x===6&&y===8)?'w':y===7?'l':x>10||y>12?'d':'m',L);else Q(x,y,(x+y)%6===0?'w':'l',V);}
}
function tinteT(Q,c){const T=tonosMat(c);solidoT(Q,(x,y)=>enElipse(8,9.5,4.8,4.2)(x,y)||enElipse(7,5.5,2.4,2)(x,y),T);}
function huevoT(Q,a,b){const T=tonosMat(a),M=tonosMat(b),dentro=enElipse(8,8.8,4.6,6);solidoT(Q,dentro,T);
  for(const [x,y] of [[6,5],[9,6],[10,7],[5,9],[8,10],[11,11],[6,12],[7,12]])if(dentro(x,y))Q(x,y,(x+y)%3?'m':'l',M);}
function pezT(Q,cuerpo,vientre,aleta){const T=tonosMat(cuerpo),V=tonosMat(vientre),A=tonosMat(aleta);const d=enElipse(7,8,5.4,3);
  solidoT(Q,d,T);for(let x=3;x<=11;x++)if(d(x,10))Q(x,10,'l',V);for(const [x,y] of [[12,6],[13,5],[12,10],[13,11],[12,8],[13,8],[14,7],[14,9]])Q(x,y,'m',A);Q(4,7,'d',tonosMat([20,20,20]));}
Object.assign(DIBUJOS_OBJETOS,{
  249:({Q})=>{const T=tonosMat([160,34,44]);solidoT(Q,enElipse(8,8,4.6,4.6),T);for(const [x,y] of [[6,7],[9,7],[7,9],[8,6]])Q(x,y,'d',tonosMat([60,0,10]));},
  252:({Q})=>{const T=tonosMat([150,108,62]);solidoT(Q,(x,y)=>y>=7&&y<=12&&Math.abs(x+.5-8)<=6.2-(y-7)*.6,T);for(let x=3;x<=12;x++)Q(x,7,'d',T);},
  253:({Q})=>{const T=tonosMat([150,108,62]),S=tonosMat([196,150,110]);solidoT(Q,(x,y)=>y>=7&&y<=12&&Math.abs(x+.5-8)<=6.2-(y-7)*.6,T);for(let x=3;x<=12;x++)Q(x,7,x%3?'l':'m',S);Q(6,6,'l',tonosMat([200,40,40]));Q(10,6,'l',tonosMat([180,130,90]));},
  645:({Q})=>{const T=tonosMat([150,108,62]),S=tonosMat([160,36,56]);solidoT(Q,(x,y)=>y>=7&&y<=12&&Math.abs(x+.5-8)<=6.2-(y-7)*.6,T);for(let x=3;x<=12;x++)Q(x,7,x%3?'l':'m',S);},
  652:({Q})=>{const T=tonosMat([150,108,62]),S=tonosMat([170,110,60]);solidoT(Q,(x,y)=>y>=7&&y<=12&&Math.abs(x+.5-8)<=6.2-(y-7)*.6,T);for(let x=3;x<=12;x++)Q(x,7,x%3?'l':'m',S);Q(6,6,'l',tonosMat([240,140,30]));Q(9,6,'l',tonosMat([200,160,90]));},
  254:({Q})=>{const R=tonosMat([222,54,50]),V=tonosMat([80,150,40]),N=tonosMat([30,20,20]);for(let y=4;y<=12;y++){const w=Math.round((y-3)*.75);for(let x=8-w;x<=7+w;x++)Q(x,y,y===12?'m':'l',y>=11?V:R);}
    for(const [x,y] of [[6,8],[9,8],[8,10],[5,10],[10,10]])Q(x,y,'m',N);},
  517:({Q})=>{const R=tonosMat([250,200,80]),V=tonosMat([200,170,40]);for(let y=4;y<=12;y++){const w=Math.round((y-3)*.75);for(let x=8-w;x<=7+w;x++)Q(x,y,(x+y)%5===0?'w':'l',y>=11?V:R);}},
  650:({Q})=>{const T=tonosMat([250,200,60]),V=tonosMat([70,160,40]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,7.5,8.5);return a>-6.5&&a<4.5&&Math.abs(b)<=.6+(a+6.5)*.22;},T,(x,y)=>(x+y)%4===0&&x>5);for(const [x,y] of [[11,4],[12,3],[12,2],[13,4],[13,5],[11,2],[14,5]])Q(x,y,'l',V);},
  234:({Q})=>{const T=tonosMat([200,236,240]);solidoT(Q,(x,y)=>enElipse(8,10,3.4,3.4)(x,y)||(y>=3&&y<=8&&Math.abs(x+.5-8)<=(y-2)*.5),T);},
  518:({Q})=>{const T=tonosMat([214,110,30]),M=tonosMat([250,210,80]);solidoT(Q,enElipse(8,8.5,5.2,4.8),T);for(const [x,y] of [[6,6],[9,7],[7,9],[10,10]])Q(x,y,'l',M);},
  515:({Q})=>{const T=tonosMat([172,30,36]);for(const [cx,cy] of [[5.5,10],[8.5,8.5],[11,10.5],[7.5,12]])solidoT(Q,enElipse(cx,cy,1.9,1.9),T);Q(8,5,'d',tonosMat([90,60,30]));Q(8,6,'d',tonosMat([90,60,30]));},
  519:({Q})=>{const T=tonosMat([150,110,160]);solidoT(Q,(x,y)=>enElipse(8,8.5,4.6,4.6)(x,y)&&!((x+y)%5===0&&Math.hypot(x-8,y-8.5)>3.4),T);},
  547:({Q})=>{const T=tonosMat([100,168,152]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,8,8);return Math.abs(a)<=5.5&&Math.abs(b)<=1.8-Math.max(0,Math.abs(a)-3)*.5;},T);},
  548:({Q})=>{const T=tonosMat([210,236,226]);for(const [cx,cy] of [[6,7],[10,6],[8,11]])solidoT(Q,(x,y)=>Math.abs(x+.5-cx)+Math.abs(y+.5-cy)<=2.2,T);},
  549:({Q})=>{const T=tonosMat([150,100,150]);solidoT(Q,(x,y)=>y>=4&&y<=12&&x>=2&&x<=13&&!(y===4&&(x<4||x>11)),T);for(let x=3;x<=12;x++)Q(x,8,'d',T);},
  663:({Q})=>{const T=tonosMat([40,120,190]),C=tonosMat([120,220,250]);solidoT(Q,enElipse(8,8,5.2,5.2),T);solidoT(Q,enElipse(8,8,2.6,2.6),C);},
  664:({Q})=>{const T=tonosMat([80,170,70]);solidoT(Q,(x,y)=>Math.abs(x+.5-8)/5+Math.abs(y+.5-8)/5.6<=1,T);for(let y=4;y<=12;y++)Q(8,y,'d',T);},
  665:({Q})=>{const T=tonosMat([180,170,150]);solidoT(Q,(x,y)=>y>=4&&y<=12&&x>=2&&x<=13&&y<=4+Math.abs(x-7.5)*.9+4,T);},
  624:({Q})=>{const T=tonosMat([36,34,46]);solidoT(Q,enElipse(8,9.5,4.6,4.4),T);for(const [x,y] of [[7,3],[8,3],[7,4],[8,4]])Q(x,y,'m',T);},
  622:({Q})=>{const T=tonosMat([200,170,130]);solidoT(Q,(x,y)=>enElipse(8,10,3.6,3.4)(x,y)||(x>=7&&x<=9&&y>=3&&y<=8),T);},
  623:({Q})=>{const T=tonosMat([196,150,108]);solidoT(Q,(x,y)=>x>=3&&x<=12&&y>=4&&y<=12&&!((x<=3||x>=12)&&(y<=4||y>=12)),T,(x,y)=>(x*5+y*7)%13===0);},
  614:({Q})=>pezT(Q,[176,140,96],[220,200,170],[140,110,70]), 615:({Q})=>pezT(Q,[200,150,90],[236,210,170],[160,120,70]),
  616:({Q})=>pezT(Q,[200,80,70],[230,160,140],[120,60,50]), 617:({Q})=>pezT(Q,[190,110,70],[230,170,130],[140,80,50]),
  618:({Q})=>{pezT(Q,[240,130,40],[250,240,230],[240,130,40]);const B=tonosMat([250,250,250]);for(let y=6;y<=10;y++)Q(8,y,'l',B);},
  619:({Q})=>{const T=tonosMat([230,200,60]);solidoT(Q,enElipse(8,8,5,5),T);for(const [x,y] of [[3,4],[12,4],[2,9],[13,9],[5,13],[10,13],[8,2]])Q(x,y,'l',tonosMat([240,230,190]));Q(6,7,'d',tonosMat([20,20,20]));},
  656:({Q})=>{const T=tonosMat([226,210,170]),H=tonosMat([150,150,158]);solidoT(Q,(x,y)=>x>=3&&x<=13&&y>=6&&y<=11&&!(x===3&&(y===6||y===11)),T);Q(4,8,'d',H);Q(4,9,'d',H);for(let i=0;i<4;i++)Q(2-0+i*0,5-i,'m',H);},
  657:({Q})=>{const T=tonosMat([150,108,62]);for(let t=0;t<=40;t++){const a=t/40*Math.PI*1.6;Q(8+Math.cos(a)*5*(1-t/80),8+Math.sin(a)*5*(1-t/80),t%4?'l':'m',T);}Q(12,12,'d',tonosMat([150,150,158]));},
  598:({Q})=>{const T=tonosMat([128,78,40]),M=tonosMat([160,160,168]);solidoT(Q,(x,y)=>y>=5&&y<=9&&x>=3&&x<=12,T);for(let y=4;y<=6;y++){Q(4,y,'m',T);Q(5,y,'m',T);}for(let y=10;y<=13;y++){Q(6,y,'d',T);Q(10,y,'d',T);}Q(6,14,'l',M);Q(10,14,'l',M);},
  655:({Q})=>{const T=tonosMat([226,210,160]),V=tonosMat([90,150,70]),A=tonosMat([80,120,200]);solidoT(Q,(x,y)=>x>=2&&x<=13&&y>=2&&y<=13,T);
    for(let y=4;y<=11;y++)for(let x=4;x<=11;x++){const n=Math.sin(x*.9)+Math.cos(y*.8);Q(x,y,'m',n>.4?V:n<-.6?A:T);}},
  658:({Q})=>{const T=tonosMat([236,200,70]),V=tonosMat([60,170,90]);solidoT(Q,(x,y)=>(x>=5&&x<=10&&y>=2&&y<=13)||(y>=6&&y<=8&&x>=2&&x<=13),T);Q(6,4,'m',V);Q(9,4,'m',V);for(let x=6;x<=9;x++)Q(x,10,'d',T);},
  646:({Q})=>{const T=tonosMat([200,40,50]),V=tonosMat([60,130,40]);for(const [cx,cy] of [[6,10],[10,9],[8,12]])solidoT(Q,enElipse(cx,cy,1.9,1.9),T);Q(8,5,'m',V);Q(7,6,'m',V);Q(9,6,'m',V);Q(8,7,'d',V);},
  647:({Q})=>{const T=tonosMat([250,190,60]),V=tonosMat([60,130,40]);for(const [cx,cy] of [[6,10],[10,9],[8,12]])solidoT(Q,enElipse(cx,cy,1.9,1.9),T);Q(8,5,'m',V);Q(7,6,'m',V);Q(9,6,'m',V);Q(8,7,'d',V);},
  651:({Q})=>frascoT(Q,[240,170,40],false), 500:({Q})=>frascoT(Q,null,false), 501:({Q})=>frascoT(Q,[56,92,220],false), 502:({Q})=>frascoT(Q,[56,92,220],false),
  649:({Q})=>{const T=tonosMat([214,150,70]),R=tonosMat([240,150,40]);solidoT(Q,(x,y)=>y>=5&&y<=12&&x>=2+Math.max(0,8-y)&&x<=13,T);for(let x=4;x<=12;x++)Q(x,6,'l',R);},
  676:({Q})=>{const Pd=tonosMat([240,210,80]),F=tonosMat([240,220,120]);for(let i=0;i<9;i++)Q(3+i,12-i,i%2?'l':'m',PALO_T);Q(12,3,'m',Pd);Q(13,2,'l',Pd);Q(14,1,'w',Pd);Q(12,2,'l',Pd);Q(13,3,'d',Pd);Q(2,13,'m',F);Q(1,14,'l',F);Q(1,12,'w',F);Q(2,12,'l',F);Q(3,14,'d',F);},
  523:({Q})=>{const T=tonosMat([200,60,60]),P2=tonosMat([240,240,236]);solidoT(Q,(x,y)=>{const [a,b]=ejeMango(x,y,9,7);return a>-3&&a<5&&Math.abs(b)<=1.8;},T);Q(12,3,'l',P2);Q(13,2,'w',P2);for(let i=0;i<5;i++)Q(2+i,13-i,'m',PALO_T);},
  714:({Q})=>{esferaT(Q,[230,90,30],8,8,5);const N=tonosMat([60,40,30]);for(const [x,y] of [[6,6],[9,9],[10,6],[6,10]])Q(x,y,'m',N);Q(7,5,'w',tonosMat([255,220,120]));},
  715:({Q})=>{const T=tonosMat([236,236,236]),L=tonosMat([210,60,60]);solidoT(Q,enElipse(8,8.8,4.3,5.6),T);for(const [x,y] of [[6,8],[7,9],[8,8],[9,9],[10,8]])Q(x,y,'m',L);},
  716:({Q})=>{const L=tonosMat([200,60,60]),E=PALO_T;solidoT(Q,(x,y)=>x>=3&&x<=12&&y>=2&&y<=14&&!(x>=5&&x<=10&&y>=4),L);for(let y=4;y<=14;y+=2){Q(7,y,'l',E);Q(8,y,'l',E);}for(let y=3;y<=14;y++){Q(6,y,'d',E);Q(9,y,'d',E);}},
  717:({Q})=>{const T=tonosMat([214,206,196]),V=tonosMat([90,150,60]);solidoT(Q,(x,y)=>(x>=5&&x<=10&&y>=2&&y<=6)||(x>=3&&x<=12&&y>=7&&y<=11)||((x>=4&&x<=6||x>=9&&x<=11)&&y>=12&&y<=14),T);Q(6,4,'d',tonosMat([180,30,30]));Q(9,4,'d',tonosMat([180,30,30]));for(const [x,y] of [[4,8],[11,9],[7,10]])Q(x,y,'m',V);},
  718:({Q})=>{const T=tonosMat([240,240,240]),C=tonosMat([150,150,158]);for(let y=4;y<=13;y++){const w=y<6?3:5;for(let x=8-w;x<8+w;x++)Q(x,y,y<6?'m':x===8-w?'l':x===8+w-1?'d':'w',y<6?C:T);}Q(7,3,'d',C);Q(8,3,'d',C);for(const [x,y] of [[6,8],[9,10],[7,11]])Q(x,y,'m',tonosMat([150,120,220]));},
  720:({Q})=>{const M=tonosMat([210,214,220]);for(let i=0;i<7;i++){Q(8+i,7-i,i<2?'d':'l',M);Q(7+i,7-i,'m',M);Q(9+i,8-i,'w',M);}for(let i=0;i<4;i++){Q(5+i,10-i,'d',M);}for(const [x,y] of [[3,10],[4,9],[2,11],[3,12],[4,12],[5,11],[6,12],[7,11],[8,10],[6,13],[5,13],[7,13]])Q(x,y,'d',M);},
  719:({Q})=>{esferaT(Q,[236,244,248]);for(const [x,y] of [[6,7],[9,8],[7,10]])Q(x,y,'d',tonosMat([120,120,130]));},
  546:({Q})=>{const T=tonosMat([100,46,120]),Pg=tonosMat([240,236,220]),G=tonosMat([230,190,250]);solidoT(Q,(x,y)=>x>=3&&x<=12&&y>=2&&y<=13,T);for(let y=3;y<=13;y++){Q(12,y,'l',Pg);Q(13,y,'m',Pg);}for(let x=4;x<=12;x++)Q(x,13,'l',Pg);for(const [x,y] of [[6,5],[9,7],[5,9],[8,10],[10,4]])Q(x,y,'w',G);},
});
function dibujarItem(id){
  const it=ITEMS[id];
  if(DIBUJOS_ARMAS[id])return sprite16(DIBUJOS_ARMAS[id]);
  if(DIBUJOS_OBJETOS[id])return sprite16(DIBUJOS_OBJETOS[id]);
  // Armaduras, pociones, tintes y huevos generadores con el estilo nuevo
  if(it.armadura&&!it.elitros)return sprite16(({Q})=>armaduraT(Q,it.armadura.pieza,ARM_MATS[it.armadura.mat].col));
  if(it.pocion){const c=it.pocion.color;return sprite16(({Q})=>frascoT(Q,[(c>>16)&255,(c>>8)&255,c&255],!!it.pocion.arrojadiza));}
  if(it.tinte!==undefined&&COLORES16[it.tinte])return sprite16(({Q})=>tinteT(Q,COLORES16[it.tinte][3]));
  if(it.huevo&&typeof HUEVOS!=='undefined'&&HUEVOS[it.huevo]){const [a,b]=HUEVOS[it.huevo].map(h=>[(h>>16)&255,(h>>8)&255,h&255]);return sprite16(({Q})=>huevoT(Q,a,b));}
  if(it.herr&&!it.iconoPropio)return dibujarHerramienta(it);
  if(it.armadura&&!it.elitros)return dibujarArmadura(it);
  return lienzo16(id*31,({P,linea,elipse,rect,rnd})=>{
    switch(id){
      case I.palo: linea(4,12,12,4,PALO); linea(4,11,11,4,[156,116,66]); break;
      case I.carbon: elipse(8,8.5,5.5,4.5,[44,44,50],18); for(let k=0;k<5;k++)P(5+rnd()*6,6+rnd()*5,[100,100,108]); break;
      case I.hierroBruto: elipse(8,8.5,5,4.5,[206,176,146],18); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[158,118,88]); break;
      case I.oroBruto: elipse(8,8.5,5,4.5,[240,200,60],18); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[190,140,30]); break;
      case I.cobreBruto: elipse(8,8.5,5,4.5,[216,130,80],18); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[110,190,150]); break;
      case I.lingoteHierro: lingote(P,rect,[210,210,212]); break;
      case I.lingoteOro: lingote(P,rect,[250,210,60]); break;
      case I.lingoteCobre: lingote(P,rect,[216,120,74]); break;
      case I.pepitaOro: elipse(8,9,2.6,2.2,[250,214,70],20); break;
      case I.diamante: gema(P,[150,248,242],[58,196,190]); break;
      case I.esmeralda: gema(P,[120,240,150],[30,160,80]); break;
      case I.lapis: gema(P,[80,120,240],[30,50,160]); break;
      case I.cuarzo: for(let k=0;k<3;k++)linea(5+k*3,12,6+k*3,4+k,[240,236,228]); linea(4,13,12,13,[200,190,180]); break;
      case I.redstone: polvo(P,rnd,[200,20,20],[255,80,80]); break;
      case I.polvora: polvo(P,rnd,[90,90,90],[140,140,140]); break;
      case I.harinaHueso: polvo(P,rnd,[236,236,230],[200,200,190]); break;
      case I.polvoLuminoso: polvo(P,rnd,[240,200,80],[255,240,160]); break;
      case I.polvoBlaze: polvo(P,rnd,[250,150,30],[255,220,80]); break;
      case I.pedernal: for(let y=3;y<=12;y++){const a=Math.floor(Math.abs(y-7)/2);for(let x=5+a;x<=10-a;x++)P(x,y,y<7?[80,80,86]:[50,50,56]);} break;
      case I.cuerda: for(let x=2;x<=13;x++)P(x,8+Math.round(Math.sin(x*.9)*2),[240,240,240]); break;
      case I.pluma: linea(3,13,12,3,[220,220,220]); for(let k=0;k<7;k++){P(6+k,8-k+1,[250,250,250]);P(5+k,8-k,[235,235,235]);} break;
      case I.hueso: linea(4,11,11,4,[236,230,214]); P(3,12,[236,230,214]);P(3,10,[236,230,214]);P(12,5,[236,230,214]);P(12,3,[236,230,214]); break;
      case I.flecha: linea(3,12,12,3,[140,110,70]); linea(11,2,13,4,[180,180,190]); P(13,2,[180,180,190]); linea(2,11,2,13,[240,240,240]); linea(2,13,4,13,[240,240,240]); break;
      case I.cubo: case I.cuboAgua: case I.cuboLava:
        for(let y=4;y<=13;y++){const a=Math.floor((y-4)/4);for(let x=3+a;x<=12-a;x++)P(x,y,[170,170,176]);} rect(3,4,12,4,[210,210,214]);
        if(id!==I.cubo)rect(4,5,11,6,id===I.cuboAgua?[50,90,220]:[240,120,20]); break;
      case I.mechero: elipse(6,7,3.5,3.5,[150,150,156],8); elipse(6,7,1.8,1.8,[0,0,0],0); for(let x=4;x<=8;x++)for(let y=5;y<=9;y++)if(Math.hypot(x-6,y-7)<1.8)P(x,y,null);
        rect(9,9,12,13,[70,70,76]); break;
      case I.varaBlaze: linea(4,12,12,4,[250,190,40]); linea(5,12,12,5,[220,120,20]); break;
      case I.perlaEnder: elipse(8,8,5,5,[20,90,80],14); P(6,6,[120,220,200]); P(7,6,[80,180,160]); break;
      case I.ojoEnder: elipse(8,8,5,5,[40,120,60],14); elipse(8,8,2.2,3,[20,40,20],4); P(6,6,[160,230,140]); break;
      case I.lagrimaGhast: for(let y=3;y<=13;y++){const w=y<8?(y-3)*.6:4-(y-8)*.5;for(let x=Math.round(8-w);x<=Math.round(8+w);x++)P(x,y,[200,236,250]);} P(7,9,[255,255,255]); break;
      case I.semillas: for(let k=0;k<7;k++)P(4+rnd()*8,6+rnd()*6,[70+rnd()*40,150,50]); break;
      case I.trigo: for(let k=0;k<4;k++){linea(4+k*2,14,6+k*2,3,[200,170,60]);P(6+k*2,3,[230,200,90]);} break;
      case I.pan: elipse(8,9,6,3.5,[190,130,60],12); linea(4,8,12,8,[220,170,90]); break;
      case I.manzana: case I.manzanaDorada: {const c=id===I.manzana?[214,36,36]:[250,210,60];
        elipse(8,9.5,5,4.8,c,20); P(6,7,[255,240,200]); linea(8,2,8,5,[100,70,30]); P(9,3,[60,160,40]);P(10,3,[60,160,40]);P(10,2,[60,160,40]); break;}
      case I.cerdoCrudo: carne(elipse,linea,P,[236,140,140],[250,190,180],false); break;
      case I.cerdoAsado: carne(elipse,linea,P,[170,100,60],[210,150,90],false); break;
      case I.resCruda: carne(elipse,linea,P,[200,50,50],[240,160,150],true); break;
      case I.filete: carne(elipse,linea,P,[120,70,40],[170,110,60],true); break;
      case I.corderoCrudo: carne(elipse,linea,P,[210,80,80],[245,190,180],true); break;
      case I.corderoAsado: carne(elipse,linea,P,[140,80,50],[190,130,80],true); break;
      case I.polloCrudo: muslo(elipse,linea,P,[240,200,180]); break;
      case I.polloAsado: muslo(elipse,linea,P,[190,120,60]); break;
      case I.carnePodrida: elipse(8.5,8,6,4.2,[126,116,66],18); for(let k=0;k<6;k++)P(4+rnd()*9,6+rnd()*4,[84,100,44]); break;
      case I.ojoArana: elipse(8,8,4.5,4.5,[150,30,40],10); elipse(8,8,1.5,1.5,[40,0,0],0); break;
      case I.cuero: rect(4,4,11,12,[150,94,56]); rect(3,6,3,10,[150,94,56]); rect(12,6,12,10,[150,94,56]); rect(5,5,10,5,[180,120,70]); break;
      case I.papel: for(let y=3;y<=12;y++)for(let x=4+(y%3===0?1:0);x<=12;x++)P(x,y,[240,240,236]); break;
      case I.libro: rect(4,3,11,12,[110,60,30]); rect(11,4,12,12,[240,240,236]); rect(5,4,6,11,[140,80,40]); break;
      case 500: case 501: case 502: case 503: case 504: case 505: case 506: case 507: case 510: case 511: case 512: case 513: case 514:{
        const it=ITEMS[id], col=it.pocion?[(it.pocion.color>>16)&255,(it.pocion.color>>8)&255,it.pocion.color&255]:id===501||id===502?[56,92,220]:[196,214,232];
        plantilla(P,it.pocion&&it.pocion.arrojadiza?PL_POCION_ARROJ:PL_POCION,{g:[212,224,240],w:[250,252,255],L:col},true);
        if(id===500)for(let y=4;y<=11;y++)for(let x=4;x<=11;x++)if((x+y)%5===0)P(x,y,[236,244,252]);
        break;}
      case 515: for(let k=0;k<4;k++)elipse(5+k*2,9+(k%2)*2,1.8,1.8,[170,30,30],10); break;
      case 516: polvo(P,rnd,[248,248,248],[220,220,230]); break;
      case 517: for(let y=4;y<=12;y++){const w=Math.floor((y-3)*.8);for(let x=8-w;x<=7+w;x++)P(x,y,y>=11?[240,200,60]:y>=10?[255,240,150]:[230,120,60]);} P(7,7,[255,230,90]); break;
      case 518: elipse(8,9,4.5,3.5,[230,120,30],12); P(7,8,[255,220,80]); P(9,10,[255,200,60]); break;
      case 519: elipse(8,9,4.5,4.5,[140,90,150],14); P(6,7,[200,160,210]); break;
      case 526: elipse(8,9,4.5,4.5,[190,140,190],10); P(6,7,[230,200,235]); break;
      case 525: elipse(8,8.5,4.5,4,[110,200,90],10); P(6,7,[180,255,160]); break;
      case 520: rect(2,7,13,12,[110,110,116]); rect(3,8,12,11,[60,60,64]); P(4,13,[40,40,40]);P(11,13,[40,40,40]); break;
      case 521: for(let y=8;y<=12;y++){const w=y<12?6:5;for(let x=8-w;x<8+w;x++)P(x,y,y===8?[190,150,90]:[150,110,60]);} break;
      case 522: // élitros: dos alas membranosas grises con nervios
        for(const s of [-1,1])for(let y=1;y<=14;y++){const ancho=Math.round(1+Math.min(y,9)*.55-(y>11?(y-11)*.9:0));
          for(let k=0;k<ancho;k++){const x=s<0?6-k:9+k;const nervio=k===Math.floor(ancho*.5)||y%4===0;P(x,y,nervio?[112,112,140]:k===ancho-1?[190,192,210]:[152,154,178]);}}
        linea(7,1,7,6,[90,90,110]); linea(8,1,8,6,[90,90,110]); break;
      case 523: linea(7,14,7,4,[180,40,40]); rect(6,4,8,8,[200,50,50]); P(7,3,[240,240,240]); linea(7,14,7,15,[120,90,50]); break;
      case I.ladrillo: for(let y=6;y<=10;y++)for(let x=3;x<=12;x++)P(x,y,y===6?[200,110,90]:y===10?[120,50,40]:[170,76,58]); break;
      case I.bolaArcilla: elipse(8,8.5,4.5,4,[160,168,182],12); break;
      case I.cuenco: for(let y=7;y<=11;y++){const w=6-Math.floor((y-7)*1.2);for(let x=8-w;x<=7+w;x++)P(x,y,y===7?[150,110,70]:[124,90,52]);} break;
      case I.estofado: for(let y=7;y<=11;y++){const w=6-Math.floor((y-7)*1.2);for(let x=8-w;x<=7+w;x++)P(x,y,y===7?[190,140,90]:[124,90,52]);} rect(4,6,11,7,[170,120,80]); P(6,6,[210,40,40]); P(9,6,[160,120,80]); break;
      case I.rodajaSandia: for(let y=4;y<=12;y++){const w=Math.floor((y-3)*.8);for(let x=8-w;x<=7+w;x++)P(x,y,y>=11?[70,150,50]:y>=10?[230,240,200]:[220,50,60]);} P(7,7,[20,20,20]);P(9,8,[20,20,20]);P(6,9,[20,20,20]); break;
      case 528: linea(3,13,9,7,[140,100,60]); linea(4,13,9,8,[110,78,44]); rect(9,4,12,7,[200,120,70]); for(let x=8;x<=13;x++)linea(x,1,x+1,4,[240,236,220]); break;
      case 529: case 530: case 531: case 532:{const c=[[170,90,60],[180,100,64],[160,84,56],[176,96,62]][id-529];
        for(let y=3;y<=12;y++)for(let x=3+(y%4===0?1:0);x<=12-(y===3?2:0);x++)P(x,y,c);
        const d=[[50,30,20]]; if(id===529){linea(5,6,10,6,d[0]);linea(6,9,9,9,d[0]);linea(7,5,7,10,d[0]);}
        else if(id===530){elipse(8,8,2.5,2.5,d[0],0);P(8,8,c);}else if(id===531){linea(5,10,8,5,d[0]);linea(8,5,11,10,d[0]);linea(5,10,11,10,d[0]);}
        else{elipse(6,7,1,1,d[0],0);elipse(10,7,1,1,d[0],0);linea(5,10,11,10,d[0]);} break;}
      case 533: rect(3,2,12,13,[50,60,70]); rect(4,3,11,12,[80,88,96]); rect(6,5,9,10,[110,70,60]); P(7,6,[220,120,80]); break;
      case 534: elipse(8,9,5,4,[92,70,64],16); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[140,110,96]); break;
      case 535: lingote(P,rect,[82,74,80]); break;
      case 536: for(let y=3;y<=13;y++){const w=Math.round(3-Math.abs(y-8)*.5);for(let x=8-w;x<=8+w;x++)P(x,y,[20,60+y*6,80+y*6]);} P(8,6,[140,250,255]); break;
      case 542: elipse(8,10,5.5,4.5,[150,94,56],12); rect(6,3,10,5,[170,110,66]); linea(6,5,10,5,[230,220,200]); P(8,4,[120,70,40]); break;
      case 543: elipse(8,9,4.5,4,[236,120,30],14); P(6,7,[255,200,120]); P(10,11,[190,80,20]); break;
      case 544: for(let y=6;y<=10;y++)for(let x=3;x<=12;x++)P(x,y,y===6?[240,150,70]:y===10?[150,70,20]:[214,110,36]); break;
      case 545: rect(3,5,12,10,[150,94,56]); rect(4,6,11,9,[120,70,40]); rect(6,4,9,5,[180,200,220]); rect(2,7,3,8,[200,200,210]); rect(12,7,13,8,[200,200,210]); break;
      case 538: elipse(8,8,5,5,[190,230,240],10); elipse(8,8,3,3,[120,190,220],8); linea(5,8,11,8,[240,255,255]); P(8,5,[240,255,255]); break;
      case 539: linea(4,12,12,4,[210,240,250]); linea(5,12,12,5,[140,190,220]); break;
      case 540: // maza: mango de vara de breeze y cabeza pesada con pinchos
        linea(2,14,8,8,[120,170,210]); linea(3,14,8,9,[80,120,160]); P(2,13,[60,60,70]);P(3,13,[60,60,70]);
        rect(8,3,13,8,[70,72,80]); rect(9,4,12,7,[110,114,124]); rect(9,4,10,5,[160,164,176]);
        for(const [x,y] of [[7,5],[11,2],[14,5],[11,9],[7,3],[14,8],[7,8],[14,2]])P(x,y,[190,194,204]); P(10,5,[120,200,230]); break;
      case 547: for(let k=0;k<3;k++){const x=4+k*3,y=5+(k%2)*3;for(let q=0;q<3;q++)P(x+q,y+2-q,[110,190,170]);P(x,y+2,[70,140,130]);} break;
      case 548: for(const [x,y] of [[5,6],[8,4],[10,8],[6,10],[9,11]]){P(x,y,[220,240,230]);P(x+1,y,[180,230,220]);P(x,y+1,[160,220,210]);} break;
      case 549: for(let y=4;y<=12;y++){const w=Math.round(5-Math.abs(y-8)*.4);for(let x=8-w;x<=8+w;x++)P(x,y,y<8?[160,100,160]:[130,80,130]);} linea(3,8,13,8,[90,50,90]); break;
      case 597: for(let y=2;y<=14;y++){const w=y<11?5:Math.max(1,5-(y-10)*1.4|0);for(let x=8-w;x<=8+w-1;x++){const borde=x===8-w||x===8+w-1||y===2||y===14;
          P(x,y,borde?[150,156,162]:(x===7||x===8)?[176,182,188]:((x+y)%4===0?[120,84,48]:[140,98,56]));}} P(7,6,[210,214,220]);P(8,6,[210,214,220]); break;
      case 598: for(let x=3;x<=12;x++)for(let y=6;y<=9;y++)P(x,y,y===6?[128,78,40]:[104,62,30]); for(let y=4;y<=6;y++){P(4,y,[92,54,26]);P(5,y,[92,54,26]);}
        for(let y=10;y<=13;y++){P(6,y,[70,44,22]);P(10,y,[70,44,22]);} P(6,14,[170,170,178]);P(10,14,[170,170,178]); break;
      case 607: case 608: case 609: case 610:{const c=ITEMS[id].bardaCaballo.col,o=sombra(c,.7);
        rect(3,5,12,9,c); rect(2,6,2,8,o); rect(4,10,5,13,o); rect(10,10,11,13,o); rect(11,3,13,6,c); rect(12,2,13,2,o); rect(4,5,12,5,sombra(c,1.15)); break;}
      case 611: dibujarBallesta(P,linea,false); break;
      case 612: // tridente: tres puntas de prismarina y mango largo
        linea(2,14,11,5,[70,110,100]); linea(3,14,11,6,[50,84,76]);
        linea(10,2,13,5,[120,200,180]); linea(11,6,14,9,[120,200,180]); linea(9,3,12,6,[150,226,206]); P(13,1,[180,240,224]); P(14,2,[150,226,206]);
        P(9,1,[120,200,180]); P(15,7,[120,200,180]); P(10,2,[180,240,224]); P(14,8,[180,240,224]); break;
      case 613: linea(2,14,12,2,[118,82,44]); linea(3,14,12,3,[90,62,32]); linea(13,2,13,12,[220,220,220]); P(13,13,[160,160,170]); P(12,13,[160,160,170]); P(12,12,[200,40,40]); break;
      case 614: case 615:{const c=id===614?[170,140,100]:[150,110,70]; for(let x=3;x<=11;x++){const w=Math.round(2.4*Math.sin((x-2)/10*Math.PI));for(let y=8-w;y<=8+w;y++)P(x,y,y<8?sombra(c,1.15):c);}
        for(const [x,y] of [[12,6],[13,5],[12,10],[13,11],[12,8]])P(x,y,sombra(c,.8)); P(5,7,[30,30,30]); break;}
      case 616: case 617:{const c=id===616?[190,80,70]:[160,90,60]; for(let x=3;x<=11;x++){const w=Math.round(2.6*Math.sin((x-2)/10*Math.PI));for(let y=8-w;y<=8+w;y++)P(x,y,y<8?[90,110,120]:c);}
        for(const [x,y] of [[12,6],[13,5],[12,10],[13,11],[12,8]])P(x,y,[80,90,100]); P(5,7,[20,20,20]); break;}
      case 618: for(let x=4;x<=11;x++){const w=Math.round(3*Math.sin((x-3)/9*Math.PI));for(let y=8-w;y<=8+w;y++)P(x,y,(x+y)%4<2?[240,120,40]:[250,240,230]);} P(12,6,[240,120,40]);P(12,10,[240,120,40]);P(6,7,[20,20,20]); break;
      case 619: elipse(8,8.5,4.5,4.5,[220,200,80],10); for(const [x,y] of [[3,5],[13,5],[3,12],[13,12],[8,3],[8,14],[2,8],[14,8]])P(x,y,[230,230,200]); P(6,7,[20,20,20]);P(10,7,[20,20,20]); break;
      case 640: case 650:{const c=id===640?[240,140,30]:[250,210,60];linea(4,12,11,5,c);linea(5,12,11,6,sombra(c,.85));linea(4,11,10,5,sombra(c,1.1));P(3,13,sombra(c,.8));
        for(const [x,y] of [[11,4],[12,3],[12,5],[13,4],[11,2]])P(x,y,[80,170,50]);break;}
      case 641: case 642: case 643:{const c=id===641?[200,160,90]:id===642?[220,170,70]:[170,190,90];elipse(8,8.5,4.5,3.8,c,12);P(6,7,sombra(c,.7));P(10,10,sombra(c,.7));if(id===642)for(const [x,y] of [[6,6],[9,7],[7,10]])P(x,y,[250,230,160]);break;}
      case 644:{elipse(8,9,4,4,[160,30,50],10);for(const [x,y] of [[8,4],[7,3],[9,3],[8,2]])P(x,y,[80,160,60]);P(8,13,[120,20,40]);break;}
      case 645: case 652:{elipse(8,10,5.5,3,[130,90,50],0);elipse(8,8.5,4.5,1.5,id===645?[170,30,50]:[190,120,60],6);if(id===652){P(6,8,[240,140,30]);P(10,8,[220,190,120]);}break;}
      case 646: case 647:{const c=id===646?[200,30,50]:[250,190,40];for(const [x,y] of [[6,8],[9,7],[8,10],[5,11],[10,11]])elipse(x,y,1.4,1.4,c,8);linea(7,3,8,7,[70,110,40]);P(9,3,[70,110,40]);break;}
      case 648:{elipse(8,8,5,5,[200,140,70],10);for(const [x,y] of [[6,6],[10,7],[7,10],[10,10],[8,8]])P(x,y,[80,50,30]);break;}
      case 649:{rect(3,8,13,12,[200,130,60]);rect(3,7,13,8,[230,170,90]);rect(4,9,12,11,[240,150,60]);break;}
      case 651:{rect(6,6,10,13,[250,200,60]);rect(5,7,11,13,[240,170,40]);rect(7,3,9,5,[200,200,210]);rect(6,6,10,7,[255,230,140]);break;}
      case 653: case 654:{const c=id===653?[190,190,200]:[250,210,60];elipse(8,8,5.5,5.5,sombra(c,.75),0);elipse(8,8,4.3,4.3,id===653?[220,220,210]:[80,120,200],0);
        if(id===653){linea(8,8,8,4,[220,40,40]);linea(8,8,8,12,[60,60,70]);}else{rect(4,8,12,12,[60,120,60]);elipse(10,6,1.4,1.4,[250,240,120],0);}P(8,8,[40,40,40]);break;}
      case 655:{rect(3,3,13,13,[220,210,170]);rect(4,4,12,12,[120,170,90]);rect(5,6,8,9,[70,120,200]);linea(4,4,12,12,[190,170,120]);P(10,6,[200,40,40]);break;}
      case 656:{rect(4,6,12,10,[210,200,170]);linea(12,8,14,6,[150,150,150]);P(5,8,[120,100,80]);linea(7,8,10,8,[120,110,90]);break;}
      case 657:{for(let k=0;k<10;k++)P(3+k,12-Math.round(Math.sin(k*.6)*3)-k*.6,[170,130,80]);elipse(12,4,2,2,[120,200,80],0);break;}
      case 658:{rect(5,3,11,13,[240,200,60]);rect(6,4,10,6,[250,230,140]);P(6,5,[40,120,60]);P(9,5,[40,120,60]);rect(3,7,13,9,[220,180,40]);rect(6,10,10,12,[200,160,40]);break;}
      case 659:{linea(4,12,11,5,[200,120,70]);linea(5,12,12,5,[170,90,50]);elipse(12,4,1.8,1.8,[180,220,240],0);P(3,13,[120,70,40]);break;}
      case 660:{for(const [x,y] of [[5,6],[9,6],[7,9],[11,9],[5,12],[9,12]]){elipse(x,y,1.8,1.6,[240,170,40],6);P(x,y,[250,210,90]);}break;}
      case 661:{linea(5,12,10,4,[170,120,230]);linea(6,12,11,4,[130,90,190]);linea(7,12,11,6,[200,160,250]);break;}
      case 662:{elipse(8,9,5,4.5,[230,210,190],10);for(let a=0;a<14;a++){const t=a*.45;P(8+Math.cos(t)*a*.3,9+Math.sin(t)*a*.3,[190,120,100]);}break;}
      case 663:{elipse(8,8,4.5,4.5,[40,120,200],12);elipse(8,8,2.5,2.5,[120,200,240],0);P(7,7,[240,250,255]);break;}
      case 664:{elipse(8,9,5,4,[80,160,60],10);for(const [x,y] of [[6,8],[9,8],[8,10]])P(x,y,[50,110,40]);break;}
      case 665:{for(let y=4;y<13;y++)for(let x=4;x<13;x++)if(x+y>9&&x+y<22&&Math.abs(x-y)<6)P(x,y,(x+y)%3?[190,200,200]:[140,160,180]);break;}
      case 666:{elipse(8,8,4,4,[245,250,255],10);P(7,6,[255,255,255]);break;}
      case 667:{elipse(8,9,4.5,4.5,[30,120,120],10);rect(7,3,9,5,[60,190,180]);P(6,7,[120,250,240]);break;}
      case 668: case 669: case 670: case 671: case 672: case 673: case 674: case 675:{const cs=[[230,190,60],[90,200,60],[220,110,40],[200,50,50],[120,220,120],[150,110,220],[120,190,240],[240,240,240]];
        elipse(8,8,6,6,[30,30,36],0);elipse(8,8,2.2,2.2,cs[id-668],0);P(8,8,[20,20,20]);P(5,5,[70,70,80]);P(11,11,[60,60,70]);break;}
      case 676:{linea(3,13,11,5,[150,110,60]);for(const [x,y] of [[11,4],[12,4],[12,3],[11,3],[13,2]])P(x,y,[250,220,90]);for(const [x,y] of [[3,11],[4,12],[2,12]])P(x,y,[240,240,240]);break;}
      case 678:{for(let y=4;y<13;y++){const w=Math.round(Math.sin((y-3)/10*Math.PI)*5);for(let x=8-w;x<=7+w;x++)P(x,y,(y%3===0)?[150,90,80]:[190,120,110]);}break;}
      case 679: case 712: case 713:{const c=id===679?[120,40,40]:id===712?[40,30,20]:[230,220,170];for(const [x,y] of [[5,6],[9,5],[7,9],[11,9],[6,12],[10,12]]){P(x,y,c);P(x+1,y,c.map(v=>v*.8));}break;}
      case 677:{elipse(8,9,3.8,4.8,[240,230,200],10);P(7,7,[255,250,235]);break;}
      case 620: case 621:{const c=id===620?[222,150,140]:[190,120,80]; elipse(8,9,5,3.5,c,10); rect(4,6,6,8,sombra(c,1.1)); rect(11,10,13,12,sombra(c,.8)); P(6,12,[240,236,226]);P(7,13,[240,236,226]); break;}
      case 622: rect(6,3,9,10,[200,160,110]); rect(5,10,10,13,[220,190,150]); P(5,13,[120,90,60]);P(7,13,[120,90,60]);P(9,13,[120,90,60]); rect(7,4,8,8,[230,200,160]); break;
      case 623: rect(3,4,12,11,[180,130,90]); rect(4,5,11,10,[200,150,108]); P(12,11,[150,104,70]); rect(5,6,7,7,[220,176,130]); break;
      case 624: elipse(8,9,4.5,4.5,[30,28,40],10); rect(7,3,9,5,[60,56,72]); P(6,7,[90,90,110]); P(10,12,[20,20,26]); break;
      case 625: linea(4,12,11,4,[200,190,170]); linea(5,12,12,4,[170,160,140]); linea(4,13,6,11,[120,110,96]); P(12,3,[230,224,210]); P(11,4,[230,224,210]); break;
      case 541: elipse(5,6,3,3,[230,160,70],8); for(let x=7;x<=13;x++)P(x,9,[230,160,70]); P(12,10,[230,160,70]); P(10,10,[230,160,70]); P(5,6,[60,40,20]); break;
      default:
        if(it.tinte!==undefined){const c=COLORES16[it.tinte][3];elipse(8,9,4.5,4,c,16);P(6,7,c.map(v=>Math.min(255,v+60)));linea(6,4,9,4,[200,200,200]);P(10,5,[200,200,200]);}
        else if(it.huevo){const [a,b2]=HUEVOS[it.huevo].map(h=>[(h>>16)&255,(h>>8)&255,h&255]);
          for(let y=2;y<=14;y++){const w=Math.round(Math.sqrt(Math.max(0,1-((y-9)/7)**2))*5*(y<9?.85:1));for(let x=8-w;x<8+w;x++)P(x,y,a);}
          for(const [x,y] of [[6,6],[9,8],[7,11],[10,12],[5,9]])P(x,y,b2),P(x+1,y,b2);}
        else if(id===546){rect(3,3,11,13,[90,40,110]);rect(11,4,12,13,[240,236,220]);rect(4,4,5,12,[120,60,150]);P(7,6,[220,160,255]);P(9,9,[220,160,255]);P(6,11,[220,160,255]);}
        else elipse(8,8,4,4,[200,0,200],0);
    }
  });
}
const LIENZOS=[], ICONOS=[];
// Fotogramas del arco tensándose (se usan en la mano)
const ARCO_FASES=[1,2,3].map(dibujarArco);
const ICONO_BALLESTA_CARGADA=lienzo16(6111,({P,linea})=>dibujarBallesta(P,linea,true));
ITEMS.forEach((it,id)=>{
  if(!it)return;
  const bq=BLOQUES[id];
  if(it.bloque){const f=FORMA[id];
    if(bq.texCaras)LIENZOS[id]=iconoCubo(bq.texCaras[3],bq.texCaras[1]);
    else if(f===0||f===1)LIENZOS[id]=iconoCubo(bq.arriba,bq.lado,f===1?bq.altura:1);
    else if(f===6&&!bq.trepable&&id!==B.nenufar){const alto=Math.max(...bq.cajas.map(c=>c[4]));LIENZOS[id]=iconoCubo(bq.arriba,bq.lado,alto);}
    else if(id===B.valla)LIENZOS[id]=lienzo16(id,({rect})=>{rect(3,2,5,15,[168,133,84]);rect(10,2,12,15,[168,133,84]);rect(5,5,10,6,[150,118,72]);rect(5,10,10,11,[150,118,72]);});
    else LIENZOS[id]=lienzoTile(bq.lado);}
  else if(it.coloca==='puerta'){const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');
    x.drawImage(atlasIconos,(T.doorTop%ATW)*TS,Math.floor(T.doorTop/ATW)*TS,TS,TS,4,0,8,8);x.drawImage(atlasIconos,(T.doorBottom%ATW)*TS,Math.floor(T.doorBottom/ATW)*TS,TS,TS,4,8,8,8);LIENZOS[id]=c;}
  else if(id===I.arco)LIENZOS[id]=dibujarArco(0);
  else LIENZOS[id]=dibujarItem(id);
  ICONOS[id]=LIENZOS[id].toDataURL();
});
function iconoEstado(plantilla,colores){
  const c=document.createElement('canvas');c.width=c.height=9;const x=c.getContext('2d');
  plantilla.forEach((fila,y)=>[...fila].forEach((ch,i)=>{const col=colores(ch,i);if(col){x.fillStyle=col;x.fillRect(i,y,1,1);}}));
  return c.toDataURL();
}
const P_CORAZON=['.kk...kk.','krrk.krrk','krwrkrrrk','krrrrrrrk','krrrrrrrk','.krrrrrk.','..krrrk..','...krk...','....k....'];
const P_COMIDA=['....kkk..','...kbbbk.','..kbbbbbk','..kbbbbbk','..kbbbbk.','.kkkkkk..','kwk......','kwk......','.k.......'];
const P_ARMADURA=['kk.....kk','kbbk.kbbk','kbbbkbbbk','.kbbbbbk.','.kbbbbbk.','.kbwbbbk.','.kbbbbbk.','.kbbbbbk.','..kkkkk..'];
const P_BURBUJA=['.........','..kkkk...','.kwwbbk..','.kwbbbk..','.kbbbbk..','.kbbbbk..','..kkkk...','.........','.........'];
function tresIconos(p,lleno,brillo){
  const vacio='#3a3434';
  const f=(modo)=>iconoEstado(p,(ch,i)=>{if(ch==='.')return null;if(ch==='k')return '#141010';
    const on=modo==='lleno'||(modo==='medio'&&i<=4);return on?(ch==='w'?brillo:lleno):vacio;});
  return {lleno:f('lleno'),medio:f('medio'),vacio:f('vacio')};
}
const IC_VIDA=tresIconos(P_CORAZON,'#e0202c','#ffc8c8'), IC_VENENO=tresIconos(P_CORAZON,'#8a9a2a','#d8e8a0'),
  IC_COMIDA=tresIconos(P_COMIDA,'#b8703a','#f0f0e8'), IC_HAMBRE=tresIconos(P_COMIDA,'#6a8a3a','#d0e0a0'),
  IC_ARMADURA=tresIconos(P_ARMADURA,'#c8c8d0','#ffffff'),
  IC_BURBUJA=iconoEstado(P_BURBUJA,ch=>ch==='.'?null:ch==='k'?'#1c3a6a':ch==='w'?'#ffffff':'#6ab0ff');
