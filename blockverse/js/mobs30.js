"use strict";
/* =========================================================
   Mobs, animales y skin mejorados
   - Texturas pixeladas pintadas cara a cara (como las hojas
     de textura del original): caras con ojos, hocicos,
     manchas de vaca, lana esponjosa, camuflaje del creeper,
     costillas del esqueleto, hierro agrietado del gólem…
   - Ojos que brillan en la oscuridad (araña y enderman),
     parpadeo, colas que se mueven, cabezas grandes en las
     crías y cabeceo al andar.
   - Ovejas de colores naturales, se tiñen con tinte y se
     esquilan con las tijeras nuevas.
   - Skins del jugador con el formato 64×64 del original
     (capa base y capa exterior): Steve, Alex y más, o sube
     tu propio PNG. Se ven en tercera persona, en el brazo,
     en el muñeco del inventario y en el multijugador.
   ========================================================= */

/* ---------- Utilidades de pintado ---------- */
function hash30(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const rgb30=c=>typeof c==='number'?[(c>>16)&255,(c>>8)&255,c&255]:c;
const css30=(c,f=1)=>{const [r,g,b]=rgb30(c);return `rgb(${clamp(Math.round(r*f),0,255)},${clamp(Math.round(g*f),0,255)},${clamp(Math.round(b*f),0,255)})`;};
const mezcla30=(a,b,t)=>{a=rgb30(a);b=rgb30(b);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];};
function pincel30(g,x0,y0,w,h,rnd){
  const P={w,h,rnd,ri:n=>Math.floor(rnd()*n),
    px(x,y,c,f=1){if(x<0||y<0||x>=w||y>=h||c==null)return;g.fillStyle=css30(c,f);g.fillRect(x0+x,y0+y,1,1);},
    rect(x,y,a,b,c,f=1){for(let j=y;j<y+b;j++)for(let i=x;i<x+a;i++)P.px(i,j,c,f);},
    ruido(c,amp=.07,x=0,y=0,a=w,b=h){for(let j=y;j<y+b;j++)for(let i=x;i<x+a;i++)P.px(i,j,c,1+(rnd()-.5)*2*amp);},
    borrar(x,y,a=1,b=1){g.clearRect(x0+x,y0+y,a,b);},
  };
  return P;
}
// Distribución del original: arriba/abajo en la fila 0, y der·frente·izq·atrás en la fila D
function rectsCaja(u,v,W,H,D){return {px:[u+D+W,v+D,D,H],nx:[u,v+D,D,H],py:[u+D,v,W,D],ny:[u+D+W,v,W,D],pz:[u+D,v+D,W,H],nz:[u+2*D+W,v+D,W,H]};}
function uvCaja(geo,u,v,W,H,D,TW,TH){
  const R=rectsCaja(u,v,W,H,D), orden=['px','nx','py','ny','pz','nz'], uv=geo.attributes.uv, e=.02;
  for(let f=0;f<6;f++){const [x,y,w,h]=R[orden[f]];
    for(let k=0;k<4;k++){const i=f*4+k,a=uv.getX(i),b=uv.getY(i);
      uv.setXY(i,(x+e+a*(w-2*e))/TW,1-(y+e+(1-b)*(h-2*e))/TH);}}
  uv.needsUpdate=true; return geo;
}
function texLienzo30(c){const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;}
const CACHE30=new Map();
// Textura de una caja: pint(cara,P) pinta cada cara con su pincel
function texCaja30(clave,W,H,D,pint,semilla=clave){
  const k=clave+'|'+W+'x'+H+'x'+D; let t=CACHE30.get(k); if(t)return t;
  const c=document.createElement('canvas'); c.width=2*D+2*W; c.height=D+H;
  const g=c.getContext('2d'), rnd=mulberry32(hash30(semilla)), R=rectsCaja(0,0,W,H,D);
  for(const f of ['py','ny','nx','pz','px','nz']){const [x,y,w,h]=R[f];pint(f,pincel30(g,x,y,w,h,rnd));}
  t={tex:texLienzo30(c),W,H,D,cw:c.width,ch:c.height,lienzo:c}; CACHE30.set(k,t); return t;
}
const px30=v=>Math.max(1,Math.round(v*16));
function cajaPintada(clave,w,h,d,pint,piv=false,semilla){
  const t=texCaja30(clave,px30(w),px30(h),px30(d),pint,semilla);
  const geo=new THREE.BoxGeometry(w,h,d); if(piv)geo.translate(0,-h/2,0);
  uvCaja(geo,0,0,t.W,t.H,t.D,t.cw,t.ch);
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:t.tex,color:0xffffff}));
  m.userData.base=new THREE.Color(0xffffff); m.userData.pintado=true; m.userData.caja30={w,h,d,clave}; return m;
}
// Cabeza que parpadea: guarda las dos texturas (abierta y cerrada)
function cabezaParpadeo(extra,clave,w,h,d,pint){
  const m=cajaPintada(clave,w,h,d,(f,P)=>pint(f,P,false),false,clave);
  const b=texCaja30(clave+'#c',px30(w),px30(h),px30(d),(f,P)=>pint(f,P,true),clave);
  extra.parp={mesh:m,a:m.material.map,b:b.tex}; return m;
}
// Ojos que brillan: un plano sin iluminación pegado a la cara
function ojosBrillantes(cab,clave,w,h,d,pint){
  const W=px30(w),H=px30(h), k='ojos|'+clave;
  let t=CACHE30.get(k);
  if(!t){const c=document.createElement('canvas');c.width=W;c.height=H;pint(pincel30(c.getContext('2d'),0,0,W,H,mulberry32(hash30(k))));t={tex:texLienzo30(c)};CACHE30.set(k,t);}
  const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t.tex,alphaTest:.5,transparent:false}));
  p.position.z=d/2+.004; cab.add(p); return p;
}
const ojo30=(P,x,y,blanco,iris,cerrado,piel)=>{if(cerrado){P.px(x,y,piel,.82);P.px(x+1,y,piel,.82);return;}P.px(x,y,blanco);P.px(x+1,y,iris);};

/* ---------- Skins del jugador (formato 64×64) ---------- */
// [u,v,W,H,D] de cada pieza; los brazos finos miden 3 de ancho
const PIEZAS_SKIN={cabeza:[0,0,8,8,8],sombrero:[32,0,8,8,8],cuerpo:[16,16,8,12,4],chaqueta:[16,32,8,12,4],
  brazoD:[40,16,4,12,4],mangaD:[40,32,4,12,4],brazoI:[32,48,4,12,4],mangaI:[48,48,4,12,4],
  piernaD:[0,16,4,12,4],pantD:[0,32,4,12,4],piernaI:[16,48,4,12,4],pantI:[0,48,4,12,4]};
function pintarPieza30(g,pieza,fino,rnd,fn){
  let [u,v,W,H,D]=PIEZAS_SKIN[pieza]; if(fino&&/^(brazo|manga)/.test(pieza))W=3;
  const R=rectsCaja(u,v,W,H,D);
  for(const f of ['py','ny','nx','pz','px','nz']){const [x,y,w,h]=R[f];fn(f,pincel30(g,x,y,w,h,rnd));}
}
// Genera una skin a partir de una descripción
function pintarSkin30(d){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'), rnd=mulberry32(hash30(d.id||JSON.stringify(d)));
  const fino=!!d.fino, piel=d.piel, pelo=d.pelo, camisa=d.camisa, pant=d.pant, zap=d.zap||[60,60,60];
  // Cabeza
  pintarPieza30(g,'cabeza',fino,rnd,(f,P)=>{
    P.ruido(piel,.04);
    if(f==='py')P.ruido(pelo,.1);
    else if(f==='nz')P.ruido(pelo,.1,0,0,8,d.largo?8:6);
    else if(f==='nx'||f==='px'){P.ruido(pelo,.1,0,0,8,2);P.ruido(pelo,.1,f==='nx'?0:4,2,4,d.largo?6:1);if(d.largo)P.ruido(pelo,.1,f==='nx'?0:6,2,2,6);}
    else if(f==='pz'){
      P.ruido(pelo,.1,0,0,8,d.flequillo??2); P.px(0,2,pelo);P.px(7,2,pelo); if(d.largo){P.rect(0,2,1,6,pelo);P.rect(7,2,1,6,pelo);}
      ojo30(P,1,4,[255,255,255],d.ojos,false,piel);P.px(5,4,d.ojos);P.px(6,4,[255,255,255]);
      P.rect(3,5,2,1,piel,.86);
      if(d.barba){P.rect(2,6,4,1,d.barba);P.rect(1,7,6,1,d.barba,.9);}else P.rect(3,6,2,1,d.boca||mezcla30(piel,[120,50,40],.45));
      if(d.cara)d.cara(P);
    }
    if(f==='ny')P.ruido(piel,.04);
  });
  // Cuerpo
  pintarPieza30(g,'cuerpo',fino,rnd,(f,P)=>{P.ruido(camisa,.06);
    if(f==='pz'){if(d.cuello!==false){P.rect(3,0,2,1,piel);P.px(4,1,piel);} if(d.cinturon)P.rect(0,10,8,1,d.cinturon);}
    if(f!=='py'&&f!=='ny'&&d.cinturon)P.rect(0,10,P.w,1,d.cinturon);
    if(d.cuerpo)d.cuerpo(f,P);});
  // Brazos
  for(const [b,] of [['brazoD'],['brazoI']])pintarPieza30(g,b,fino,rnd,(f,P)=>{
    P.ruido(piel,.04); const m=d.mangas??4; if(f!=='ny')P.ruido(camisa,.06,0,0,P.w,f==='py'?P.h:m); else if(m>=12)P.ruido(piel,.04);
    if(m<12&&f!=='py'&&f!=='ny')P.rect(0,m-1,P.w,1,camisa,.82);
    if(d.guantes&&f!=='py'){P.ruido(d.guantes,.05,0,f==='ny'?0:9,P.w,f==='ny'?P.h:3);}
    if(d.brazo)d.brazo(f,P);});
  // Piernas
  for(const p of ['piernaD','piernaI'])pintarPieza30(g,p,fino,rnd,(f,P)=>{
    P.ruido(pant,.06); if(f==='ny')P.ruido(zap,.05); else if(f!=='py')P.ruido(zap,.05,0,P.h-(d.botas||2),P.w,d.botas||2);
    if(f==='pz'&&d.costura!==false)P.rect(p==='piernaD'?3:0,0,1,P.h-(d.botas||2),pant,.88);
    if(d.pierna)d.pierna(f,P);});
  if(d.encima)d.encima(g,rnd,fino);
  return c;
}
const SKINS30=[
  {id:'steve',nombre:'Steve',piel:[198,146,108],pelo:[52,36,24],ojos:[72,64,180],camisa:[0,170,170],pant:[58,58,160],zap:[80,80,80],barba:[110,72,48],mangas:4},
  {id:'alex',nombre:'Alex',fino:true,piel:[234,190,152],pelo:[222,118,44],ojos:[46,140,60],camisa:[100,160,70],pant:[110,74,44],zap:[70,54,40],largo:true,flequillo:2,mangas:8,cinturon:[90,60,36]},
  {id:'exploradora',nombre:'Exploradora',fino:true,piel:[176,120,88],pelo:[40,28,22],ojos:[96,60,30],camisa:[196,176,120],pant:[96,80,56],zap:[70,46,28],largo:true,botas:4,mangas:5,cinturon:[80,52,30],
    encima:(g,rnd)=>{pintarPieza30(g,'sombrero',false,rnd,(f,P)=>{if(f==='py')P.ruido([150,104,60],.08);else if(f!=='ny'){P.ruido([150,104,60],.08,0,0,P.w,3);P.rect(0,2,P.w,1,[90,58,30]);}});}},
  {id:'caballero',nombre:'Caballero',piel:[214,170,130],pelo:[120,80,40],ojos:[60,110,200],camisa:[176,180,188],pant:[150,154,162],zap:[90,92,100],mangas:12,botas:3,guantes:[120,124,132],cuello:false,cinturon:[120,80,40],
    cuerpo:(f,P)=>{if(f==='pz'){P.rect(3,2,2,6,[200,40,40]);P.rect(2,3,4,2,[200,40,40]);}},
    encima:(g,rnd)=>{pintarPieza30(g,'sombrero',false,rnd,(f,P)=>{if(f==='ny')return;P.ruido([186,190,198],.06);if(f==='pz'){P.borrar(1,3,6,3);P.rect(1,4,6,1,[40,40,46]);P.borrar(1,4,6,1);P.rect(3,6,2,2,[150,154,162]);}
      if(f==='py'){P.rect(3,0,2,8,[200,40,40]);}});}},
  {id:'ninja',nombre:'Ninja',piel:[220,176,140],pelo:[24,24,28],ojos:[30,30,30],camisa:[30,30,36],pant:[30,30,36],zap:[18,18,20],mangas:12,cuello:false,cinturon:[180,30,30],
    cara:P=>{P.rect(0,0,8,3,[24,24,28]);P.rect(0,6,8,2,[24,24,28]);P.rect(0,5,8,1,[24,24,28]);P.rect(0,2,8,1,[190,30,30]);},
    guantes:[24,24,28]},
  {id:'sudadera',nombre:'Sudadera',piel:[150,100,70],pelo:[30,22,16],ojos:[50,30,20],camisa:[120,70,190],pant:[60,80,140],zap:[230,230,230],mangas:12,cuello:false,
    cuerpo:(f,P)=>{if(f==='pz'){P.rect(1,6,6,3,[100,56,160]);P.px(3,0,[230,230,230]);P.px(4,1,[230,230,230]);P.px(3,1,[230,230,230]);}},
    encima:(g,rnd)=>{pintarPieza30(g,'sombrero',false,rnd,(f,P)=>{if(f==='ny')return;if(f==='pz'){P.rect(0,0,8,2,[120,70,190]);P.rect(0,0,1,8,[120,70,190]);P.rect(7,0,1,8,[120,70,190]);}else P.ruido([120,70,190],.06);});}},
  {id:'astronauta',nombre:'Astronauta',piel:[230,190,160],pelo:[90,60,30],ojos:[40,90,160],camisa:[236,236,240],pant:[226,226,232],zap:[120,120,130],mangas:12,cuello:false,guantes:[200,200,210],botas:3,
    cuerpo:(f,P)=>{if(f==='pz'){P.rect(1,2,3,2,[210,60,60]);P.rect(5,2,2,1,[60,90,200]);P.rect(2,6,4,3,[180,180,190]);}if(f==='nz')P.ruido([200,200,210],.05,1,1,6,8);},
    encima:(g,rnd)=>{pintarPieza30(g,'sombrero',false,rnd,(f,P)=>{if(f==='ny')return;P.ruido([236,236,240],.04);if(f==='pz'){P.borrar(1,2,6,5);}});}},
];
const SKIN_POR_ID=Object.fromEntries(SKINS30.map(s=>[s.id,s]));
const CACHE_SKIN=new Map();
function lienzoSkin30(id){
  if(CACHE_SKIN.has(id))return CACHE_SKIN.get(id);
  const d=SKIN_POR_ID[id]||SKIN_POR_ID.steve; const s={lienzo:pintarSkin30(d),fino:!!d.fino};
  s.tex=texLienzo30(s.lienzo); CACHE_SKIN.set(id,s); return s;
}
// Skin hecha con los colores de un mob humanoide (sin cara: el mob pone la suya)
function skinColores30(piel,camisa,pant,brazo){
  const id='col|'+[piel,camisa,pant,brazo].join(','); if(CACHE_SKIN.has(id))return CACHE_SKIN.get(id);
  const d={id,piel:rgb30(piel),pelo:rgb30(piel),ojos:rgb30(piel),camisa:rgb30(camisa),pant:rgb30(pant),zap:mezcla30(rgb30(pant),[30,30,30],.5),
    mangas:brazo===piel?3:12,cara:P=>{P.ruido(rgb30(piel),.05);P.rect(3,5,2,1,rgb30(piel),.88);},boca:rgb30(piel)};
  if(brazo!==piel&&brazo!==camisa)d.camisa=rgb30(camisa),d.brazo=(f,P)=>{if(f!=='py')P.ruido(rgb30(brazo),.05);};
  const s={lienzo:pintarSkin30(d),fino:false}; s.tex=texLienzo30(s.lienzo); CACHE_SKIN.set(id,s); return s;
}
// Modelo humanoide a partir de una skin; devuelve las piezas en el formato de los mobs
function piezaSkin30(pieza,w,h,d,fino,mat,piv){
  let [u,v,W,H,D]=PIEZAS_SKIN[pieza]; if(fino&&/^(brazo|manga)/.test(pieza))W=3;
  const geo=new THREE.BoxGeometry(w,h,d); if(piv)geo.translate(0,-h/2,0); uvCaja(geo,u,v,W,H,D,64,64);
  const m=new THREE.Mesh(geo,mat); m.userData.base=new THREE.Color(0xffffff); m.userData.pintado=true; return m;
}
function materialesSkin30(s){
  return {base:new THREE.MeshLambertMaterial({map:s.tex,color:0xffffff}),
    capa:new THREE.MeshLambertMaterial({map:s.tex,color:0xffffff,alphaTest:.5,transparent:false,side:THREE.DoubleSide})};
}
function modeloSkin30(s,{g,piernas,brazos,extra}){
  const M=materialesSkin30(s), fino=s.fino, aw=fino?.1875:.25, ex=.03;
  const con=(m,capa)=>{m.add(capa);return m;};
  [['piernaD','pantD',-1],['piernaI','pantI',1]].forEach(([a,b,sx])=>{
    const p=con(piezaSkin30(a,.25,.75,.25,fino,M.base,true),piezaSkin30(b,.25+ex,.75+ex,.25+ex,fino,M.capa,true));
    p.children[0].position.y=ex/2; p.position.set(sx*.125,.75,0); p.userData.s=sx; g.add(p); piernas.push(p);});
  const cu=con(piezaSkin30('cuerpo',.5,.75,.25,fino,M.base),piezaSkin30('chaqueta',.5+ex,.75+ex,.25+ex,fino,M.capa)); cu.position.set(0,1.125,0); g.add(cu); extra.torso=cu;
  const cab=new THREE.Group(); cab.position.set(0,1.5,0); g.add(cab);
  const cm=con(piezaSkin30('cabeza',.5,.5,.5,fino,M.base),piezaSkin30('sombrero',.56,.56,.56,fino,M.capa)); cm.position.y=.25; cab.add(cm);
  cab.userData.caja30={x:0,y:1.75,z:0,w:.5,h:.5,d:.5}; extra.cabeza=cab;
  [['brazoD','mangaD',-1],['brazoI','mangaI',1]].forEach(([a,b,sx])=>{
    const p=con(piezaSkin30(a,aw,.75,.25,fino,M.base,true),piezaSkin30(b,aw+ex,.75+ex,.25+ex,fino,M.capa,true));
    p.children[0].position.y=ex/2; p.position.set(sx*(.25+aw/2),1.5,0); p.userData.s=sx; g.add(p); brazos.push(p);});
  g.userData.partes={cabeza:cab,torso:cu,piernas,brazos,fino};
  return M;
}

/* ---------- Modelos nuevos ---------- */
let _tipoCreando30=null, _skinRemoto30=null;
const BLANCO30=[248,248,246], NEGRO30=[20,20,20];
const piel30=(c,amp=.06,motas=14)=>P=>{P.ruido(c,amp);for(let i=0;i<P.w*P.h/motas;i++)P.px(P.ri(P.w),P.ri(P.h),c,.9);};
const MODELOS30={
  cerdo(C,opc){
    const [base,osc]={calida:[[168,100,58],[110,64,36]],fria:[[214,200,186],[170,140,128]]}[opc.variante]||[[240,164,160],[214,118,118]];
    const k='cerdo'+(opc.variante||''), pi=piel30(base);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=C.pon(cajaPintada(k+'pata',.25,.375,.25,(f,P)=>{pi(P);if(f==='ny')P.ruido(osc,.05,0,0,P.w,P.h);else if(f!=='py')P.rect(0,P.h-1,P.w,1,osc,.75);},true),a*.19,.375,b*.3);p.userData.s=a*b;C.piernas.push(p);});
    C.pon(cajaPintada(k+'cuerpo',.625,.5,1,(f,P)=>{pi(P);if(f==='ny')P.ruido(mezcla30(base,BLANCO30,.15),.05);
      if(opc.variante==='calida'&&f==='py')P.ruido(osc,.1,Math.floor(P.w/2)-1,0,3,P.h);
      if(opc.variante==='fria'&&f!=='ny')for(let i=0;i<P.w*P.h/6;i++)P.px(P.ri(P.w),P.ri(P.h),osc,1);}),0,.625,0);
    const cab=C.extra.cabeza=C.pon(cabezaParpadeo(C.extra,k+'cab',.5,.5,.5,(f,P,c)=>{pi(P);if(f==='pz'){ojo30(P,1,3,BLANCO30,NEGRO30,c,base);if(c)P.rect(5,3,2,1,base,.82);else{P.px(5,3,NEGRO30);P.px(6,3,BLANCO30);}}}),0,.75,.6);
    const h=cajaPintada(k+'hocico',.25,.19,.07,(f,P)=>{P.ruido(mezcla30(base,osc,.4),.05);if(f==='pz'){P.px(0,1,osc,.6);P.px(3,1,osc,.6);}});h.position.set(0,-.09,.28);cab.add(h);
    for(const s of [-1,1]){const o=cajaPintada(k+'oreja',.14,.12,.05,(f,P)=>pi(P));o.position.set(s*.18,.27,-.05);o.rotation.z=s*-.3;cab.add(o);}
    C.extra.cola30=C.pon(cajaPintada(k+'cola',.06,.12,.06,(f,P)=>P.ruido(osc,.06)),0,.82,-.53);
  },
  vaca(C,opc){
    const v=opc.variante, roja=_tipoCreando30==='champinaca';
    const [base,mancha]=roja?[[176,30,30],[236,232,226]]:v==='calida'?[[150,72,32],[200,128,70]]:v==='fria'?[[70,46,30],[110,76,52]]:[[66,44,30],[238,236,232]];
    const k='vaca'+(v||'')+(roja?'R':''), pi=piel30(base,.07), pelo=v==='fria';
    const manchas=(P,n=3)=>{for(let i=0;i<n;i++){const cx=P.ri(P.w),cy=P.ri(P.h),rx=1+P.ri(3),ry=1+P.ri(3);
      for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++)if((x*x)/(rx*rx+.5)+(y*y)/(ry*ry+.5)<1&&P.rnd()>.08)P.px(cx+x,cy+y,mancha,1+(P.rnd()-.5)*.08);}};
    const conM=v!=='calida'&&v!=='fria';
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=C.pon(cajaPintada(k+'pata',.22,.55,.22,(f,P)=>{pi(P);if(conM&&f!=='py')P.ruido(mancha,.05,0,Math.floor(P.h*.55),P.w,P.h);
      if(f==='ny')P.ruido([50,40,34],.05);else if(f!=='py')P.rect(0,P.h-1,P.w,1,[50,40,34]);},true,k+'pata'+a+b),a*.22,.55,b*.36);p.userData.s=a*b;C.piernas.push(p);});
    C.pon(cajaPintada(k+'cuerpo',.72,.62,1.08,(f,P)=>{pi(P);if(pelo)for(let i=0;i<P.w*P.h/4;i++)P.px(P.ri(P.w),P.ri(P.h),base,1.25);
      if(conM||roja)manchas(P,f==='py'||f==='nx'||f==='px'?4:2);}),0,.86,0);
    if(pelo)C.pon(cajaPintada(k+'flecos',.78,.16,1.12,(f,P)=>{P.ruido(base,.12);for(let x=0;x<P.w;x+=2)P.px(x,P.h-1,base,.7);}),0,.6,0);
    C.pon(cajaPintada('ubre',.26,.1,.24,(f,P)=>{P.ruido([236,170,170],.05);if(f==='ny'){P.px(1,1,[200,120,120]);P.px(2,2,[200,120,120]);}}),0,.5,-.24);
    const cab=C.extra.cabeza=C.pon(cabezaParpadeo(C.extra,k+'cab',.46,.46,.36,(f,P,c)=>{pi(P);
      if(f==='pz'){if(conM||roja)P.ruido(mancha,.04,3,0,2,4);ojo30(P,1,3,BLANCO30,NEGRO30,c,base);if(c)P.rect(4,3,2,1,base,.82);else{P.px(4,3,NEGRO30);P.px(5,3,BLANCO30);}}}),0,1.12,.68);
    const h=cajaPintada(k+'morro',.3,.18,.07,(f,P)=>{P.ruido(roja?[230,200,190]:[200,168,140],.05);if(f==='pz'){P.px(1,1,[70,50,40]);P.px(3,1,[70,50,40]);P.rect(1,2,3,1,[150,110,90]);}});h.position.set(0,-.13,.21);cab.add(h);
    const ch=v==='calida'?.24:.12;
    for(const s of [-1,1]){const c=cajaPintada('cuerno'+ch,.08,ch,.08,(f,P)=>{P.ruido([232,224,204],.04);if(f!=='py'&&f!=='ny')P.px(0,0,[170,160,140]);});c.position.set(s*.2,.23+ch/2,0);cab.add(c);
      const o=cajaPintada(k+'oreja',.1,.08,.04,(f,P)=>pi(P));o.position.set(s*.28,.1,-.04);cab.add(o);}
    const cola=C.extra.cola30=C.pon(cajaPintada(k+'cola',.06,.42,.06,(f,P)=>{P.ruido(base,.06);P.ruido([40,30,24],.05,0,P.h-2,P.w,2);},true),0,1.14,-.55); cola.userData.colgante=true;
  },
  oveja(C,opc){
    const k0=opc.variante|0, lana=COLORES16[k0]?COLORES16[k0][3]:BLANCO30, cara=[224,203,176], pi=piel30(cara,.05);
    C.extra.lanas=[]; C.extra.lanaK=k0;
    const lanaM=(nombre,w,h,d,x,y,z,padre,piv)=>{const m=cajaPintada(nombre,w,h,d,pintarLana30(lana),piv,'lana'+nombre);m.userData.lana30={nombre,w,h,d};m.position.set(x,y,z);(padre||C.g).add(m);C.extra.lanas.push(m);return m;};
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=C.pon(cajaPintada('ovejaPata',.2,.5,.2,(f,P)=>{pi(P);if(f!=='py')P.rect(0,P.h-1,P.w,1,[120,100,80]);},true),a*.2,.5,b*.3);
      p.userData.s=a*b;C.piernas.push(p);lanaM('lanaPata'+k0,.26,.24,.26,0,-.1,0,p);});
    C.pon(cajaPintada('ovejaPiel',.6,.56,.96,(f,P)=>pi(P)),0,.88,0);
    lanaM('lanaCuerpo'+k0,.8,.72,1.12,0,.92,0);
    const cab=C.extra.cabeza=C.pon(cabezaParpadeo(C.extra,'ovejaCab',.4,.42,.46,(f,P,c)=>{pi(P);
      if(f==='pz'){ojo30(P,0,3,BLANCO30,NEGRO30,c,cara);if(c)P.rect(4,3,2,1,cara,.82);else{P.px(4,3,NEGRO30);P.px(5,3,BLANCO30);}P.rect(2,5,2,1,[200,150,150]);P.px(2,6,[160,120,110]);P.px(3,6,[160,120,110]);}}),0,1.15,.62);
    lanaM('lanaCab'+k0,.46,.2,.3,0,.18,-.1,cab);
    for(const s of [-1,1]){const o=cajaPintada('ovejaOreja',.12,.07,.06,(f,P)=>pi(P));o.position.set(s*.24,.1,-.05);o.rotation.z=s*.4;cab.add(o);}
  },
  gallina(C,opc){
    const pl={calida:[208,138,68],fria:[154,160,168]}[opc.variante]||[246,246,244], k='gallina'+(opc.variante||'');
    [-1,1].forEach(s=>{const p=C.pon(cajaPintada('gallinaPata',.06,.3,.06,(f,P)=>P.ruido([240,180,50],.06),true),s*.1,.3,0);
      const pie=cajaPintada('gallinaPie',.14,.03,.14,(f,P)=>P.ruido([230,170,40],.06));pie.position.set(0,-.29,.03);p.add(pie);p.userData.s=s;C.piernas.push(p);});
    C.pon(cajaPintada(k+'cuerpo',.36,.34,.48,(f,P)=>{P.ruido(pl,.05);for(let i=0;i<P.w*P.h/5;i++)P.px(P.ri(P.w),P.ri(P.h),pl,.88);}),0,.45,0);
    C.extra.cola30=C.pon(cajaPintada(k+'cola',.26,.16,.08,(f,P)=>P.ruido(pl,.08)),0,.62,-.25);
    const cab=C.extra.cabeza=C.pon(cabezaParpadeo(C.extra,k+'cab',.22,.3,.18,(f,P,c)=>{P.ruido(pl,.04);if(f==='pz'){P.px(0,1,c?mezcla30(pl,NEGRO30,.3):NEGRO30);P.px(3,1,c?mezcla30(pl,NEGRO30,.3):NEGRO30);}
      if(f==='nx'||f==='px')P.px(f==='nx'?2:0,1,c?mezcla30(pl,NEGRO30,.3):NEGRO30);}),0,.75,.24);
    const pico=cajaPintada('pico',.16,.08,.1,(f,P)=>P.ruido([240,160,40],.06));pico.position.set(0,-.01,.13);cab.add(pico);
    const cr=cajaPintada('barbilla',.08,.1,.06,(f,P)=>P.ruido([210,30,30],.06));cr.position.set(0,-.11,.1);cab.add(cr);
    const cresta=cajaPintada('cresta',.04,.08,.14,(f,P)=>P.ruido([220,40,40],.06));cresta.position.set(0,.19,0);cab.add(cresta);
    [-1,1].forEach(s=>{const b=C.pon(cajaPintada(k+'ala',.06,.26,.34,(f,P)=>{P.ruido(pl,.06);for(let y=1;y<P.h;y+=2)P.rect(0,y,P.w,1,pl,.9);},true),s*.21,.58,0);b.userData.s=s;C.brazos.push(b);});
  },
  zombi(C,opc){
    let d=SKIN_ZOMBI;
    if(_tipoCreando30==='momia')d=SKIN_MOMIA; else if(_tipoCreando30==='aldeanoZombi')d=SKIN_ZOMBI_ALDEANO;
    const s=CACHE_SKIN.get(d.id)||(()=>{const r={lienzo:pintarSkin30(d),fino:false};r.tex=texLienzo30(r.lienzo);CACHE_SKIN.set(d.id,r);return r;})();
    modeloSkin30(s,C);
  },
  esqueleto(C,opc){
    const hueso=[206,206,200], osc=[120,120,116], k='esq';
    const pintH=(f,P)=>{P.ruido(hueso,.05);for(let i=0;i<P.w*P.h/9;i++)P.px(P.ri(P.w),P.ri(P.h),hueso,.86);};
    [-1,1].forEach(s=>{const p=C.pon(cajaPintada(k+'pierna',.125,.75,.125,(f,P)=>{pintH(f,P);if(f!=='py'&&f!=='ny')P.px(0,6,osc);},true),s*.125,.75,0);p.userData.s=s;C.piernas.push(p);});
    C.pon(cajaPintada(k+'torso',.5,.75,.25,(f,P)=>{P.ruido([46,44,42],.08);
      if(f==='pz'||f==='nz'){for(let y=1;y<9;y+=2)P.rect(1,y,P.w-2,1,hueso,1-(y%4)*.03);P.rect(3,0,2,P.h,hueso,.95);P.rect(1,10,P.w-2,2,hueso,.9);}
      else if(f==='py'||f==='ny')P.ruido(hueso,.06);else{for(let y=1;y<9;y+=2)P.rect(0,y,P.w,1,hueso,.92);}}),0,1.125,0);
    const cab=C.extra.cabeza=C.pon(cajaPintada(k+'craneo',.5,.5,.5,(f,P)=>{pintH(f,P);
      if(f==='pz'){P.rect(1,3,2,2,NEGRO30);P.rect(5,3,2,2,NEGRO30);P.px(2,4,[70,70,70]);P.px(5,4,[70,70,70]);P.rect(3,5,2,1,[40,40,40]);for(let x=1;x<7;x++)P.px(x,6,x%2?NEGRO30:hueso,x%2?1:.85);}}),0,1.75,0);
    [-1,1].forEach(s=>{const b=C.pon(cajaPintada(k+'brazo',.125,.75,.125,(f,P)=>{pintH(f,P);if(f!=='py'&&f!=='ny')P.px(0,5,osc);},true),s*.3125,1.5,0);b.userData.s=s;C.brazos.push(b);});
    C.extra.arco=C.pon(parte(.05,.7,.05,0x7a5a30),.36,1.0,.45);
  },
  creeper(C,opc){
    const camo=(P)=>{for(let y=0;y<P.h;y++)for(let x=0;x<P.w;x++){const r=P.rnd();P.px(x,y,r<.12?[30,120,30]:r<.3?[60,160,50]:r<.5?[96,200,80]:r<.56?[180,220,170]:[80,180,64]);}};
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=C.pon(cajaPintada('creeperPie'+a+b,.24,.4,.24,(f,P)=>{camo(P);if(f==='ny')P.ruido([40,100,36],.06);},true),a*.13,.4,b*.18);p.userData.s=a*b;C.piernas.push(p);});
    C.pon(cajaPintada('creeperCuerpo',.5,.8,.28,(f,P)=>camo(P)),0,.8,0);
    C.extra.cabeza=C.pon(cajaPintada('creeperCab',.5,.5,.5,(f,P)=>{camo(P);if(f==='pz'){const N=[16,22,16];
      P.rect(1,2,2,2,N);P.rect(5,2,2,2,N);P.rect(3,4,2,1,N);P.rect(2,5,4,2,N);P.px(2,7,N);P.px(5,7,N);P.px(2,3,[40,40,40]);P.px(6,3,[40,40,40]);}}),0,1.45,0);
  },
  arana(C,opc){
    const cav=_tipoCreando30==='aranaCueva', b0=cav?[20,60,70]:[44,36,32], pelo=(P)=>{P.ruido(b0,.12);for(let i=0;i<P.w*P.h/5;i++)P.px(P.ri(P.w),P.ri(P.h),b0,1.4);};
    const k=cav?'aranaC':'arana';
    C.pon(cajaPintada(k+'abdomen',.75,.6,.8,(f,P)=>{pelo(P);if(f==='py'){P.ruido([110,30,26],.1,4,2,4,8);P.ruido([110,30,26],.1,2,6,8,2);}}),0,.55,-.45);
    C.pon(cajaPintada(k+'torax',.5,.45,.5,(f,P)=>pelo(P)),0,.5,.15);
    const cab=C.extra.cabeza=C.pon(cajaPintada(k+'cab',.5,.42,.4,(f,P)=>{pelo(P);if(f==='pz')P.rect(2,4,4,2,[30,24,22]);}),0,.5,.55);
    ojosBrillantes(cab,k,.5,.42,.4,P=>{const R=[220,30,30],R2=[255,90,80];P.rect(2,2,1,1,R);P.rect(5,2,1,1,R);P.rect(1,3,2,1,R2);P.rect(5,3,2,1,R2);P.px(3,3,R);P.px(4,3,R);P.px(0,2,R);P.px(7,2,R);});
    for(let i=0;i<4;i++)[-1,1].forEach(s=>{const p=new THREE.Group();const l=cajaPintada(k+'pata',.9,.08,.08,(f,P)=>{P.ruido(b0,.1);for(let x=4;x<P.w;x+=5)P.px(x,0,b0,1.6);});l.position.x=s*.45;p.add(l);
      p.position.set(s*.2,.55,.3-i*.2);p.rotation.z=s*.35;p.userData.s=(i%2?1:-1)*s;p.userData.pata=true;C.g.add(p);C.piernas.push(p);});
  },
  enderman(C,opc){
    const N=[18,16,20], neg=(P)=>{P.ruido(N,.15);for(let i=0;i<P.w*P.h/12;i++)P.px(P.ri(P.w),P.ri(P.h),[40,24,50]);};
    [-1,1].forEach(s=>{const p=C.pon(cajaPintada('enderPierna',.14,1.5,.14,(f,P)=>neg(P),true),s*.1,1.5,0);p.userData.s=s;C.piernas.push(p);});
    C.pon(cajaPintada('enderCuerpo',.46,.75,.24,(f,P)=>neg(P)),0,1.875,0);
    const cab=C.extra.cabeza=C.pon(cajaPintada('enderCab',.5,.5,.5,(f,P)=>neg(P)),0,2.5,0);
    ojosBrillantes(cab,'ender',.5,.5,.5,P=>{const M=[204,0,250],W=[240,170,255];P.rect(0,4,3,1,M);P.px(1,4,W);P.rect(5,4,3,1,M);P.px(6,4,W);});
    [-1,1].forEach(s=>{const b=C.pon(cajaPintada('enderBrazo',.14,1.5,.14,(f,P)=>neg(P),true),s*.3,2.25,0);b.userData.s=s;C.brazos.push(b);});
  },
  aldeano(C,opc){
    const pr=PROFESIONES[opc.profesion||'granjero']||PROFESIONES.granjero, ropa=rgb30(pr.ropa), ex=rgb30(pr.extra), piel=[200,154,120], k='ald'+(opc.profesion||'granjero');
    [-1,1].forEach(s=>{const p=C.pon(cajaPintada('aldPierna',.22,.7,.22,(f,P)=>{P.ruido([90,58,38],.06);if(f!=='py')P.rect(0,P.h-2,P.w,2,[50,36,26]);},true),s*.12,.7,0);p.userData.s=s;C.piernas.push(p);});
    C.pon(cajaPintada(k+'tunica',.52,.95,.34,(f,P)=>{P.ruido(ropa,.06);for(let y=0;y<P.h;y+=3)P.rect(0,y,P.w,1,ropa,.93);
      if(f!=='py'&&f!=='ny'){P.rect(0,P.h-2,P.w,2,ex);P.rect(0,5,P.w,1,ex,.9);}
      if(f==='pz'){P.rect(Math.floor(P.w/2)-1,0,2,5,piel,.92);if(opc.profesion==='herrero'||opc.profesion==='armero'||opc.profesion==='carnicero')P.ruido(opc.profesion==='carnicero'?[236,236,232]:[40,40,40],.05,1,6,P.w-2,P.h-8);
        if(opc.profesion==='bibliotecario'||opc.profesion==='cartografo')P.rect(2,7,3,4,[150,60,40]);}}),0,1.18,0);
    const cab=C.extra.cabeza=C.pon(cabezaParpadeo(C.extra,k+'cab',.46,.56,.46,(f,P,c)=>{P.ruido(piel,.05);
      if(f==='py'||f==='nz'||((f==='nx'||f==='px')))P.ruido(pr.extra===pr.ropa?[90,60,40]:mezcla30(ex,[70,50,40],.4),.08,0,0,P.w,f==='py'?P.h:2);
      if(f==='pz'){P.rect(1,3,5,1,[70,50,30]);ojo30(P,1,4,BLANCO30,[40,140,60],c,piel);if(c)P.rect(4,4,2,1,piel,.82);else{P.px(4,4,[40,140,60]);P.px(5,4,BLANCO30);}P.rect(2,7,3,1,[120,80,60]);}}),0,1.93,0);
    const n=cajaPintada('aldNariz',.12,.24,.1,(f,P)=>{P.ruido([186,138,104],.05);if(f==='ny')P.ruido([160,110,80],.05);});n.position.set(0,-.09,.28);cab.add(n);
    C.pon(cajaPintada(k+'brazos',.62,.22,.26,(f,P)=>{P.ruido(ropa,.06);if(f==='pz')P.rect(3,0,4,P.h,piel);}),0,1.42,.2);
    const sombrero=(w,h,col,y)=>{const s=cajaPintada('somb'+w+h+col,w,h,w,(f,P)=>{P.ruido(col,.08);});s.position.y=y;cab.add(s);};
    if(opc.profesion==='granjero'){sombrero(.7,.05,[214,190,100],.3);sombrero(.48,.14,[220,196,110],.38);}
    else if(opc.profesion==='pescador'){sombrero(.6,.05,[200,170,90],.3);sombrero(.48,.1,[200,170,90],.36);}
    else if(opc.profesion==='bibliotecario')sombrero(.5,.12,[176,48,48],.33);
    else if(opc.profesion==='pastor')sombrero(.5,.1,[236,236,232],.33);
    else if(opc.profesion==='flechero'){const p=cajaPintada('pluma',.04,.18,.12,(f,P)=>P.ruido([236,236,236],.05));p.position.set(.2,.36,0);cab.add(p);sombrero(.5,.1,[110,130,70],.33);}
    else if(opc.profesion==='cartografo'){const m=cajaPintada('monoculo',.1,.1,.02,(f,P)=>{P.ruido([200,170,60],.05);P.px(0,0,[230,240,250]);});m.position.set(-.1,.0,.24);cab.add(m);}
  },
  golem(C,opc){
    const H=[216,212,200], hierro=(P)=>{P.ruido(H,.05);for(let i=0;i<P.w*P.h/18;i++){let x=P.ri(P.w),y=P.ri(P.h);for(let k=0;k<3;k++){P.px(x,y,[150,146,136]);x+=P.ri(3)-1;y++;}}};
    const enred=(P,n)=>{for(let i=0;i<n;i++){let x=P.ri(P.w);for(let y=0;y<P.h*.6;y++){if(P.rnd()<.8)P.px(x,y,[60,130,40],1+(P.rnd()-.5)*.3);if(P.rnd()<.3)x+=P.ri(3)-1;}}};
    [-1,1].forEach(s=>{const p=C.pon(cajaPintada('golemPierna',.42,1.05,.42,(f,P)=>hierro(P),true),s*.26,1.05,0);p.userData.s=s;C.piernas.push(p);});
    C.pon(cajaPintada('golemPecho',1.1,.85,.7,(f,P)=>{hierro(P);if(f==='pz'||f==='py')enred(P,3);}),0,1.7,0);
    C.pon(cajaPintada('golemCintura',.7,.35,.5,(f,P)=>hierro(P)),0,1.1,0);
    const cab=C.extra.cabeza=C.pon(cajaPintada('golemCab',.5,.6,.5,(f,P)=>{hierro(P);if(f==='pz'){P.rect(1,3,6,1,[150,146,136]);P.px(2,4,[150,20,20]);P.px(5,4,[150,20,20]);}}),0,2.42,.05);
    const n=cajaPintada('golemNariz',.14,.3,.12,(f,P)=>hierro(P));n.position.set(0,-.12,.3);cab.add(n);
    [-1,1].forEach(s=>{const b=C.pon(cajaPintada('golemBrazo',.36,1.6,.36,(f,P)=>{hierro(P);if(f!=='py'&&f!=='ny')P.rect(0,P.h-3,P.w,3,[176,172,160]);},true),s*.74,2.1,0);b.userData.s=s;C.brazos.push(b);});
  },
  lobo(C,opc){
    const c=rgb30(COL_LOBO[opc.variante]||COL_LOBO.palido), o=mezcla30(c,NEGRO30,.2), cl=mezcla30(c,BLANCO30,.35), k='lobo'+(opc.variante||'');
    const pelo=(P,col=c)=>{P.ruido(col,.08);for(let i=0;i<P.w*P.h/5;i++)P.px(P.ri(P.w),P.ri(P.h),col,.85);};
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=C.pon(cajaPintada(k+'pata',.14,.42,.14,(f,P)=>pelo(P),true),a*.12,.42,b*.26);p.userData.s=a*b;C.piernas.push(p);});
    C.pon(cajaPintada(k+'cuerpo',.34,.32,.62,(f,P)=>{pelo(P);if(f==='ny')pelo(P,cl);}),0,.56,-.06);
    C.pon(cajaPintada(k+'melena',.46,.42,.34,(f,P)=>pelo(P,o)),0,.62,.2);
    const cab=C.extra.cabeza=C.pon(cabezaParpadeo(C.extra,k+'cab',.36,.34,.3,(f,P,ce)=>{pelo(P);if(f==='pz'){P.ruido(cl,.05,1,3,4,2);
      if(ce){P.px(1,2,c,.7);P.px(4,2,c,.7);}else{P.px(1,2,NEGRO30);P.px(4,2,NEGRO30);}}}),0,.74,.48);
    const h=cajaPintada(k+'hocico',.18,.14,.16,(f,P)=>{pelo(P,cl);if(f==='pz')P.rect(1,0,1,1,[26,26,26]);});h.position.set(0,-.08,.22);cab.add(h);
    for(const s of [-1,1]){const or=cajaPintada(k+'oreja',.1,.12,.06,(f,P)=>pelo(P,o));or.position.set(s*.12,.22,-.04);cab.add(or);}
    const cola=C.pon(cajaPintada(k+'cola',.1,.1,.44,(f,P)=>pelo(P)),0,.6,-.46); cola.rotation.x=.7; C.extra.cola=cola;
    C.extra.collar=C.pon(parte(.48,.1,.36,0xc02020,false,null),0,.5,.22); C.extra.collar.visible=false;
  },
};
function pintarLana30(col){
  return (f,P)=>{const s=hash30(String(col))&1023;
    for(let y=0;y<P.h;y++)for(let x=0;x<P.w;x++){const v=1+(hash2(x>>1,y>>1,s+f.length)-.5)*.2+(P.rnd()-.5)*.08+((x+y*2)%5===0?-.06:0);P.px(x,y,col,v);}};
}
const SKIN_ZOMBI={id:'zombi',piel:[94,156,74],pelo:[50,100,40],ojos:[20,30,20],camisa:[0,160,170],pant:[60,60,150],zap:[40,40,50],mangas:3,cuello:false,
  cara:P=>{P.rect(1,3,2,2,[20,40,20]);P.rect(5,3,2,2,[20,40,20]);P.px(3,5,[70,120,56]);P.px(4,5,[70,120,56]);P.rect(2,6,4,1,[50,90,40]);},
  cuerpo:(f,P)=>{if(f==='pz'||f==='nz'){P.px(1,11,[94,156,74]);P.px(6,10,[94,156,74]);P.px(5,11,[94,156,74]);}}};
const SKIN_MOMIA={id:'momia',piel:[196,172,120],pelo:[176,152,100],ojos:[20,20,20],camisa:[176,156,110],pant:[150,130,96],zap:[130,110,80],mangas:12,cuello:false,
  cara:P=>{for(let y=0;y<8;y+=2)P.rect(0,y,8,1,[176,152,100]);P.rect(1,3,2,2,[30,24,18]);P.rect(5,3,2,2,[30,24,18]);},
  cuerpo:(f,P)=>{for(let y=0;y<P.h;y+=3)P.rect(0,y,P.w,1,[150,130,96]);}};
const SKIN_ZOMBI_ALDEANO={id:'zombiAld',piel:[94,156,74],pelo:[70,110,50],ojos:[200,40,30],camisa:[106,74,48],pant:[74,48,32],zap:[40,30,24],mangas:12,cuello:false,
  cara:P=>{P.rect(1,3,5,1,[40,70,30]);P.px(1,4,[200,40,30]);P.px(4,4,[200,40,30]);P.rect(2,7,3,1,[50,80,40]);}};

/* ---------- Constructor: modelos nuevos y adopción de caras ---------- */
const TIPOS_BASE30=new Set(['cerdo','vaca','oveja','gallina','zombi','esqueleto','creeper','arana','enderman','piglin','hoglin','slime','cuboMagma','golem','aldeano','ghast','blaze']);
function ayudantes30(g,piernas,brazos,extra){
  const pon=(m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m;};
  const ojos=(y,z,sep,col=0x111111,t=.09)=>{
    if(col===0x111111||col===0x2a6a2a){pon(parte(t*1.9,t*1.1,.02,0xf4f4f0),-sep-t*.45,y,z-.003);pon(parte(t*1.9,t*1.1,.02,0xf4f4f0),sep+t*.45,y,z-.003);}
    pon(parte(t,t,.025,col),-sep,y,z);pon(parte(t,t,.025,col),sep,y,z);};
  const cuadrupedo=(ancho,largo,altP,colP,grosor=.22)=>[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{
    const p=pon(parte(grosor,altP,grosor,colP,true),a*ancho,altP,b*largo);p.userData.s=a*b;piernas.push(p);});
  const humanoide=(piel,camisa,pant,brazoCol,delgado=.25)=>{
    if(delgado!==.25){
      [-1,1].forEach(s=>{const p=pon(parte(delgado,.75,delgado,pant,true),s*.125,.75,0);p.userData.s=s;piernas.push(p);});
      pon(parte(.5,.75,.28,camisa),0,1.125,0); extra.cabeza=pon(parte(.5,.5,.5,piel),0,1.75,0);
      [-1,1].forEach(s=>{const b=pon(parte(delgado,.75,delgado,brazoCol,true),s*(.25+delgado/2),1.5,0);b.userData.s=s;brazos.push(b);});
      return;}
    modeloSkin30(skinColores30(piel,camisa,pant,brazoCol),{g,piernas,brazos,extra});
  };
  return {g,pon,parte,ojos,cuadrupedo,humanoide,piernas,brazos,extra};
}
// Las piezas pequeñas que están dentro de la cabeza (ojos, hocicos, orejas, sombreros) pasan a ser hijas
// de la cabeza, así giran con ella al mirar
function adoptarCara30(r){
  const cab=r.extra.cabeza; if(!cab||!cab.parent||cab.parent!==r.g)return;
  let c=cab.userData.caja30;
  if(!c||c.x===undefined){const p=cab.geometry&&cab.geometry.parameters;if(!p)return;c={x:cab.position.x,y:cab.position.y,z:cab.position.z,w:p.width,h:p.height,d:p.depth};}
  const prot=new Set([cab,...r.piernas,...r.brazos]);
  for(const v of Object.values(r.extra))if(v&&v.isObject3D)prot.add(v);
  const mx=Math.max(c.w,c.h,c.d), mg=.07;
  for(const o of r.g.children.slice()){
    if(prot.has(o)||!o.isMesh||!o.geometry.parameters||o.geometry.type!=='BoxGeometry')continue;
    const p=o.geometry.parameters; if(Math.max(p.width,p.height,p.depth)>mx*1.45)continue;
    const q=o.position;
    if(Math.abs(q.x-c.x)<=c.w/2+mg&&Math.abs(q.y-c.y)<=c.h/2+mg&&Math.abs(q.z-c.z)<=c.d/2+mg){
      r.g.remove(o); o.position.set(q.x-cab.position.x,q.y-cab.position.y,q.z-cab.position.z); cab.add(o);}
  }
}
const _modeloMob30=modeloMob;
modeloMob=function(tipo,opc={}){
  let r;
  if(MODELOS30[tipo]&&!(opc&&opc.clasico)){
    const g=new THREE.Group(),piernas=[],brazos=[],extra={};
    const C=ayudantes30(g,piernas,brazos,extra);
    MODELOS30[tipo](C,opc||{}); r={g,piernas,brazos,extra};
  }else if(!TIPOS_BASE30.has(tipo)&&typeof MODELOS_EXTRA!=='undefined'&&MODELOS_EXTRA[tipo]){
    const g=new THREE.Group(),piernas=[],brazos=[],extra={};
    MODELOS_EXTRA[tipo](Object.assign(ayudantes30(g,piernas,brazos,extra),{opc:opc||{}})); r={g,piernas,brazos,extra};
  }else r=_modeloMob30(tipo,opc);
  try{adoptarCara30(r);}catch(e){}
  return r;
};
// Bots de Bed Wars y jugadores remotos: skin propia o del color de su equipo
function skinEquipo30(hex){
  const id='bw|'+hex; if(CACHE_SKIN.has(id))return CACHE_SKIN.get(id);
  const c=rgb30(hex), d={id,piel:[214,164,122],pelo:[60,40,26],ojos:[60,80,170],camisa:c,pant:[44,44,68],zap:[30,30,36],mangas:4,cinturon:mezcla30(c,NEGRO30,.4),
    cuerpo:(f,P)=>{if(f==='pz')P.rect(2,3,4,3,mezcla30(c,BLANCO30,.45));}};
  const s={lienzo:pintarSkin30(d),fino:false};s.tex=texLienzo30(s.lienzo);CACHE_SKIN.set(id,s);return s;
}
MODELOS_EXTRA.botBW=(C)=>{
  const opc=C.opc||{}; const s=_skinRemoto30&&SKIN_POR_ID[_skinRemoto30]?lienzoSkin30(_skinRemoto30):skinEquipo30(opc.color??0xd03030);
  modeloSkin30(s,C);
};

/* ---------- Creación: tipo de variante, colores de oveja y cabezas de cría ---------- */
const LANAS_NATURALES=[[0,.818],[8,.05],[7,.05],[15,.05],[12,.03],[6,.002]];
const _crearMob30=crearMob;
crearMob=function(tipo,x,y,z,opc={}){
  const prev=_tipoCreando30; _tipoCreando30=tipo;
  if(tipo==='oveja'&&(opc.variante===undefined||opc.variante===null)){let r=Math.random(),k=0;for(const [c,p] of LANAS_NATURALES){if(r<p){k=c;break;}r-=p;}opc=Object.assign({},opc,{variante:k});}
  let m;
  try{m=_crearMob30(tipo,x,y,z,opc);}finally{_tipoCreando30=prev;}
  if(!m)return m;
  // Las variantes dibujadas a mano no se recolorean encima
  if(tipo==='momia'||tipo==='aldeanoZombi'||tipo==='champinaca')m.grupo.traverse(o=>{if(o.isMesh&&o.userData.pintado){o.userData.base=new THREE.Color(0xffffff);o.material.color.setHex(0xffffff);}});
  if(m.tipo==='oveja'){m.lanaK=opc.variante|0;actualizarDefOveja30(m);}
  return m;
};
function actualizarDefOveja30(m){
  const k=m.lanaK|0, esq=!!m.esquilada;
  m.def=Object.assign({},DEF_MOB.oveja,{suelta:b=>[[LANA_COLOR[k]||B.lana,esq?0:1],[I.corderoCrudo,azar(1,2+b)]]});
  m._defOveja=k+'|'+esq;
}
function teñirOveja30(m,k){
  m.lanaK=k; m.variante=k; const col=COLORES16[k][3];
  for(const o of (m.extra.lanas||[])){const L=o.userData.lana30;const nombre=L.nombre.replace(/\d+$/,'')+k;
    o.material.map=texCaja30(nombre,px30(L.w),px30(L.h),px30(L.d),pintarLana30(col),'lana'+nombre).tex;o.material.needsUpdate=true;}
  actualizarDefOveja30(m);
}

/* ---------- Animación extra ---------- */
const _animarMobExtra30=animarMobExtra;
animarMobExtra=function(m,dt,sp,dist3){
  _animarMobExtra30(m,dt,sp,dist3);
  const E=m.extra, cab=E.cabeza;
  // Parpadeo
  if(E.parp){m.parpT=(m.parpT??(1+Math.random()*4))-dt;
    const cerrado=m.parpT<0||m.durmiendo; if(m.parpT<-.14)m.parpT=2+Math.random()*5;
    const t=cerrado?E.parp.b:E.parp.a; if(E.parp.mesh.material.map!==t)E.parp.mesh.material.map=t;}
  // Colas
  if(E.cola30){const c=E.cola30;
    if(c.userData.colgante)c.rotation.x=.25+Math.sin(tiempoJuego*2.4+m.origen.x)*.12,c.rotation.z=Math.sin(tiempoJuego*1.7+m.origen.z)*.25;
    else c.rotation.y=Math.sin(tiempoJuego*(sp>.3?10:3))*(sp>.3?.5:.2);}
  // Cabeceo al andar y cabeza grande de las crías
  if(cab){
    if(cab.userData.y0===undefined){cab.userData.y0=cab.position.y;cab.userData.z0=cab.position.z;}
    const anda=Math.min(1,sp);
    if(m.tipo==='gallina'){cab.position.z=cab.userData.z0+Math.sin(m.fase*2)*.05*anda;}
    else if(m.piernas.length>=4&&!m.piernas[0].userData.pata)cab.position.y=cab.userData.y0+Math.sin(m.fase*2)*.025*anda;
    const sc=m.bebe>0?1.45:1; if(cab.scale.x!==sc)cab.scale.setScalar(sc);
  }
  // Lana: se ve si no está esquilada
  if(E.lanas){const v=!m.esquilada;if(E.lanas[0]&&E.lanas[0].visible!==v)E.lanas.forEach(o=>o.visible=v);
    const k=(m.lanaK|0)+'|'+!!m.esquilada; if(m._defOveja!==k)actualizarDefOveja30(m);}
  // Los zombis tambalean los brazos
  if((m.tipo==='zombi'||m.tipo==='momia'||m.tipo==='aldeanoZombi'||m.tipo==='ahogado')&&m.brazos.length===2&&!(m.golpeT>0)){
    m.brazos[0].rotation.z=Math.sin(tiempoJuego*1.3+m.origen.x)*.06;m.brazos[1].rotation.z=-Math.sin(tiempoJuego*1.3+m.origen.x+1)*.06;}
};

/* ---------- Tijeras y tintes en las ovejas ---------- */
const _usarDerechoCompleto30=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){
  const m=apuntadoEnt&&apuntadoEnt.mob;
  if(m&&m.tipo==='oveja'&&!m.muerto){
    if(id===I.tijeras&&!m.esquilada&&!(m.bebe>0)){
      m.esquilada=true; const n=azar(1,3);
      soltarItem(crearPila(LANA_COLOR[m.lanaK|0]||B.lana,n),m.pos.x,m.pos.y+1,m.pos.z,true);
      sonar('esquilar',m.pos); if(supervivencia())gastarObjetoEnMano(1); balancearMano(); return true;}
    if(it&&it.tinte!==undefined&&!m.esquilada&&(m.lanaK|0)!==it.tinte){
      teñirOveja30(m,it.tinte); emitirParticulas(m.pos.x,m.pos.y+1,m.pos.z,new THREE.Color(...COLORES16[it.tinte][3].map(v=>v/255)),8,1,.6,-1);
      sonar('tinte',m.pos); if(supervivencia())consumirEnMano(); balancearMano(); return true;}
  }
  return _usarDerechoCompleto30(p,id,it);
};
if(typeof SND!=="undefined"){
  if(!SND.esquilar)SND.esquilar=v=>{tonoSnd(900,500,.08,'square',.03*v);setTimeout(()=>tonoSnd(1000,520,.08,'square',.03*v),90);};
  if(!SND.tinte)SND.tinte=v=>tonoSnd(500,700,.15,'sine',.04*v);
}

/* ---------- Skin del jugador ---------- */
const SKIN={id:'steve',fino:false,datos:null,lienzo:null,tex:null};
function cargarSkinGuardada(){
  try{const s=JSON.parse(localStorage.getItem('blockverse-skin')||'null');if(s){SKIN.id=s.id||'steve';SKIN.fino=!!s.fino;SKIN.datos=s.datos||null;}}catch(e){}
}
function guardarSkin(){try{localStorage.setItem('blockverse-skin',JSON.stringify({id:SKIN.id,fino:SKIN.fino,datos:SKIN.id==='propia'?SKIN.datos:null}));}catch(e){}}
// Convierte una imagen (64×64 o la antigua 64×32) al formato 64×64
function normalizarSkin(img){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  if(img.height===img.width/2){g.drawImage(img,0,0,64,32);
    const copia=(sx,sy,dx,dy)=>{for(const [ox,oy,w,h] of [[4,0,4,4],[8,0,4,4],[0,4,4,12],[4,4,4,12],[8,4,4,12],[12,4,4,12]]){g.save();g.translate(dx+ox+w,dy+oy);g.scale(-1,1);g.drawImage(c,sx+ox,sy+oy,w,h,0,0,w,h);g.restore();}};
    copia(0,16,16,48); copia(40,16,32,48);
  }else g.drawImage(img,0,0,64,64);
  return c;
}
function skinActual(){
  if(SKIN.lienzo)return SKIN;
  if(SKIN.id==='propia'&&SKIN.img){SKIN.lienzo=normalizarSkin(SKIN.img);}
  else{const s=lienzoSkin30(SKIN_POR_ID[SKIN.id]?SKIN.id:'steve');SKIN.lienzo=s.lienzo;SKIN.fino=s.fino;}
  SKIN.tex=texLienzo30(SKIN.lienzo); return SKIN;
}
function elegirSkin(id,fino){
  SKIN.id=id; SKIN.lienzo=null; if(SKIN.tex)SKIN.tex.dispose(); SKIN.tex=null;
  if(id!=='propia'){SKIN.datos=null;SKIN.img=null;}
  if(fino!==undefined)SKIN.fino=fino;
  skinActual(); if(id!=='propia')SKIN.fino=!!(SKIN_POR_ID[id]||{}).fino;
  guardarSkin(); aplicarSkinJugador();
}
function cargarSkinPropia(dataURL,fino,cb){
  const img=new Image();
  img.onload=()=>{if(img.width!==64||(img.height!==64&&img.height!==32)){cb&&cb('La skin debe medir 64×64 o 64×32 píxeles');return;}
    SKIN.img=img;SKIN.datos=dataURL;SKIN.id='propia';SKIN.lienzo=null;if(fino!==undefined)SKIN.fino=fino;skinActual();guardarSkin();aplicarSkinJugador();cb&&cb(null);};
  img.onerror=()=>cb&&cb('No se pudo leer la imagen');
  img.src=dataURL;
}
// Tercera persona: cambia las piezas del modelo por las de la skin
function aplicarSkinJugador(){
  const S=skinActual(), M=modeloJugador, p=M.p, fino=S.fino, aw=fino?.1875:.25, ex=.03;
  const mats={base:new THREE.MeshLambertMaterial({map:S.tex,color:0xffffff}),capa:new THREE.MeshLambertMaterial({map:S.tex,color:0xffffff,alphaTest:.5,side:THREE.DoubleSide})};
  const pieza=(nom,w,h,d,mat,piv)=>{let [u,v,W,H,D]=PIEZAS_SKIN[nom];if(fino&&/^(brazo|manga)/.test(nom))W=3;const geo=new THREE.BoxGeometry(w,h,d);if(piv)geo.translate(0,-h/2,0);return uvCaja(geo,u,v,W,H,D,64,64);};
  const vestir=(mesh,nom,capa,w,h,d,piv)=>{
    for(const ch of mesh.children.slice())if(ch.isMesh)mesh.remove(ch);
    mesh.geometry.dispose(); mesh.geometry=pieza(nom,w,h,d,null,piv); mesh.material=mats.base;
    const c=new THREE.Mesh(pieza(capa,w+ex,h+ex,d+ex,null,piv),mats.capa); if(piv)c.position.y=ex/2; mesh.add(c);};
  vestir(p.torso,'cuerpo','chaqueta',.5,.75,.26);
  // El brazo principal (el del objeto) es el derecho, como en el original
  vestir(p.brazoD,'brazoD','mangaD',aw,.75,.25,true); p.brazoD.position.x=-(.25+aw/2);
  vestir(p.brazoI,'brazoI','mangaI',aw,.75,.25,true); p.brazoI.position.x=.25+aw/2;
  vestir(p.piernaI,'piernaD','pantD',.25,.75,.25,true); vestir(p.piernaD,'piernaI','pantI',.25,.75,.25,true);
  for(const ch of p.cabeza.children.slice())if(ch.isMesh)p.cabeza.remove(ch);
  const cab=new THREE.Mesh(pieza('cabeza',.5,.5,.5),mats.base); cab.position.y=.25; p.cabeza.add(cab);
  const hat=new THREE.Mesh(pieza('sombrero',.56,.56,.56),mats.capa); hat.position.y=.25; p.cabeza.add(hat);
  M.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.map===S.tex)o.userData.c0=new THREE.Color(0xffffff);});
  M.brillo=-1;
  // Brazo en primera persona
  if(typeof brazo!=='undefined'){
    const geo=pieza('brazoD',fino?.135:.18,.6,.18); geo.rotateX(Math.PI/2); brazo.geometry.dispose(); brazo.geometry=geo;
    brazo.material=new THREE.MeshBasicMaterial({map:S.tex,color:0xffffff});
    for(const ch of brazo.children.slice())brazo.remove(ch);
    const g2=pieza('mangaD',(fino?.135:.18)+.02,.62,.2); g2.rotateX(Math.PI/2);
    brazo.add(new THREE.Mesh(g2,new THREE.MeshBasicMaterial({map:S.tex,color:0xffffff,alphaTest:.5,side:THREE.DoubleSide})));
  }
  const c=document.getElementById('muneco'); if(c)dibujarMuneco(c);
}
const _actualizarMano30=actualizarMano;
actualizarMano=function(id,brillo,dt,agachado){
  _actualizarMano30(id,brillo,dt,agachado);
  if(!manoObjeto&&brazo.material.map){const b=clamp(brillo,.15,1);brazo.material.color.setScalar(b);if(brazo.children[0])brazo.children[0].material.color.setScalar(b);}
};
// Muñeco del inventario dibujado con la skin
dibujarMuneco=function(c){
  const S=skinActual(), sk=S.lienzo, g=c.getContext('2d'), s=4, W=c.width; g.imageSmoothingEnabled=false;
  g.clearRect(0,0,W,c.height);
  const ox=Math.round(W/2/s)-8, oy=3, aw=S.fino?3:4;
  const mx=Math.max(-1,Math.min(1,Math.round(munecoMira.x))), my=Math.max(-1,Math.min(1,Math.round(munecoMira.y)));
  const D=(sx,sy,w,h,dx,dy)=>g.drawImage(sk,sx,sy,w,h,(ox+dx)*s,(oy+dy)*s,w*s,h*s);
  const arm=k=>{const p=inv[36+k];return p&&ITEMS[p.id].armadura?'rgb('+ARM_MATS[ITEMS[p.id].armadura.mat].col.join(',')+')':null;};
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect((ox+x)*s,(oy+y)*s,w*s,h*s);};
  // Piernas, cuerpo y brazos (capa base y exterior)
  D(4,20,4,12,4,20); D(4,36,4,12,4,20); D(20,52,4,12,8,20); D(4,52,4,12,8,20);
  if(arm(2))R(4,20,8,7,arm(2)); if(arm(3)){R(4,28,4,4,arm(3));R(8,28,4,4,arm(3));}
  D(20,20,8,12,4,8); D(20,36,8,12,4,8);
  D(44,20,aw,12,4-aw,8); D(44,36,aw,12,4-aw,8); D(36,52,aw,12,12,8); D(52,52,aw,12,12,8);
  if(arm(1)){R(4,8,8,11,arm(1));R(4-aw,8,aw,5,arm(1));R(12,8,aw,5,arm(1));}
  const p=inv[ranura];
  if(p&&LIENZOS[p.id])g.drawImage(LIENZOS[p.id],(ox+11)*s,(oy+14)*s,8*s,8*s);
  // Cabeza: mira hacia el ratón
  const hx=4+mx*.5, hy=my*.5;
  g.save(); g.translate(mx*s*.5,hy*s);
  D(8,8,8,8,4,0); D(40,8,8,8,4,0);
  if(mx!==0){g.globalAlpha=.55;const lado=mx>0?[16,8]:[0,8];g.drawImage(sk,lado[0],lado[1],8,8,(ox+(mx>0?12:3))*s,oy*s,1*s,8*s);g.globalAlpha=1;}
  if(arm(0)){R(3.5,-.5,9,3,arm(0));R(3.5,2.5,1,4,arm(0));R(11.5,2.5,1,4,arm(0));}
  g.restore();
};

/* ---------- Multijugador: cada jugador lleva su skin (las predefinidas) ---------- */
if(typeof estadoLocal==='function'){
  const _estadoLocal30=estadoLocal;
  estadoLocal=function(){const o=_estadoLocal30();o.skin=SKIN.id==='propia'?'steve':SKIN.id;return o;};
}
if(typeof actualizarRemoto==='function'){
  const _actualizarRemoto30=actualizarRemoto;
  actualizarRemoto=function(m){
    if(m&&m.skin&&RED.remotos.has(m.de)&&RED.remotos.get(m.de).skin!==m.skin&&!RED.remotos.get(m.de).colEquipo)quitarRemoto(m.de);
    _skinRemoto30=m&&m.skin||null;
    try{_actualizarRemoto30(m);}finally{_skinRemoto30=null;}
    const r=RED.remotos.get(m.de); if(r)r.skin=m.skin;
  };
}

/* ---------- Pantalla de skins ---------- */
(function(){
  const ref=document.getElementById('btnOpcionesTitulo'); if(!ref)return;
  const b=document.createElement('button');b.id='btnSkins';b.className='secundario';b.textContent='Skins…';ref.parentNode.insertBefore(b,ref);
  const capa=document.createElement('div');capa.id='pantallaSkins';capa.className='capa oculto';
  capa.innerHTML=`<div class="tarjeta pantallaMC"><h2>Skins</h2>
    <div style="display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap">
      <canvas id="skinVista" width="176" height="152" style="image-rendering:pixelated;background:rgba(0,0,0,.25);border:2px solid #000"></canvas>
      <div id="skinLista" style="display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:6px;max-width:300px"></div></div>
    <p class="pista" id="skinPista">Elige una skin o sube la tuya (PNG de 64×64 o 64×32, el formato del original).</p>
    <div class="filaBotones"><button id="skinSubir" class="secundario">Subir skin PNG…</button><button id="skinBrazos" class="secundario"></button></div>
    <input id="skinArchivo" type="file" accept="image/png" style="display:none">
    <button id="skinListo">Listo</button></div>`;
  document.body.appendChild(capa);
  const $s=id=>capa.querySelector('#'+id), lista=$s('skinLista');
  const vista=()=>{
    const S=skinActual(),c=$s('skinVista'),g=c.getContext('2d'),s=4,aw=S.fino?3:4,sk=S.lienzo;g.imageSmoothingEnabled=false;g.clearRect(0,0,c.width,c.height);
    const D=(sx,sy,w,h,dx,dy,ox)=>g.drawImage(sk,sx,sy,w,h,(ox+dx)*s,(3+dy)*s,w*s,h*s);
    // Frente
    let o=2; D(4,20,4,12,4,20,o);D(4,36,4,12,4,20,o);D(20,52,4,12,8,20,o);D(4,52,4,12,8,20,o);D(20,20,8,12,4,8,o);D(20,36,8,12,4,8,o);
    D(44,20,aw,12,4-aw,8,o);D(44,36,aw,12,4-aw,8,o);D(36,52,aw,12,12,8,o);D(52,52,aw,12,12,8,o);D(8,8,8,8,4,0,o);D(40,8,8,8,4,0,o);
    // Espalda
    o=24; D(12,20,4,12,8,20,o);D(12,36,4,12,8,20,o);D(28,52,4,12,4,20,o);D(12,52,4,12,4,20,o);D(32,20,8,12,4,8,o);D(32,36,8,12,4,8,o);
    D(44+aw+4,20,aw,12,12,8,o);D(44+aw+4,36,aw,12,12,8,o);D(36+aw+4,52,aw,12,4-aw,8,o);D(52+aw+4,52,aw,12,4-aw,8,o);D(24,8,8,8,4,0,o);D(56,8,8,8,4,0,o);
  };
  const pintar=()=>{
    lista.innerHTML='';
    for(const d of SKINS30){const bt=document.createElement('button');bt.className=SKIN.id===d.id?'':'secundario';
      const cv=document.createElement('canvas');cv.width=cv.height=16;cv.style.cssText='width:20px;height:20px;image-rendering:pixelated;vertical-align:middle;margin-right:6px';
      const cg=cv.getContext('2d');cg.imageSmoothingEnabled=false;const L=lienzoSkin30(d.id).lienzo;cg.drawImage(L,8,8,8,8,0,0,16,16);cg.drawImage(L,40,8,8,8,0,0,16,16);
      if(SKIN.id===d.id)bt.style.outline='3px solid #fff';
      bt.append(cv,document.createTextNode(d.nombre));bt.onclick=()=>{elegirSkin(d.id);pintar();};lista.appendChild(bt);}
    if(SKIN.datos){const bt=document.createElement('button');bt.className=SKIN.id==='propia'?'':'secundario';bt.textContent='Mi skin';if(SKIN.id==='propia')bt.style.outline='3px solid #fff';bt.onclick=()=>{cargarSkinPropia(SKIN.datos,SKIN.fino,()=>pintar());};lista.appendChild(bt);}
    $s('skinBrazos').textContent='Brazos: '+(SKIN.fino?'finos (Alex)':'normales (Steve)');
    $s('skinBrazos').disabled=SKIN.id!=='propia';
    vista();
  };
  const abrir=(desde)=>{capa.dataset.desde=desde;document.getElementById(desde).classList.add('oculto');capa.classList.remove('oculto');pintar();};
  b.onclick=()=>abrir('menu');
  const pausa=document.getElementById('btnOpcionesPausa');
  if(pausa){const b2=document.createElement('button');b2.className='secundario';b2.id='btnSkinsPausa';b2.textContent='Skins…';pausa.parentNode.insertBefore(b2,pausa);
    b2.onclick=()=>{const cp=pausa.closest('.capa');if(cp&&cp.id)abrir(cp.id);};}
  $s('skinListo').onclick=()=>{capa.classList.add('oculto');const d=document.getElementById(capa.dataset.desde||'menu');if(d)d.classList.remove('oculto');};
  $s('skinSubir').onclick=()=>$s('skinArchivo').click();
  $s('skinArchivo').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=()=>cargarSkinPropia(r.result,SKIN.fino,err=>{$s('skinPista').textContent=err||'¡Skin cargada! Si tu skin es de brazos finos, cambia el botón de brazos.';pintar();});r.readAsDataURL(f);e.target.value='';};
  $s('skinBrazos').onclick=()=>{SKIN.fino=!SKIN.fino;SKIN.lienzo=null;guardarSkin();skinActual();aplicarSkinJugador();pintar();};
})();

cargarSkinGuardada();
if(SKIN.id==='propia'&&SKIN.datos)cargarSkinPropia(SKIN.datos,SKIN.fino,err=>{if(err)elegirSkin('steve');});
else{if(!SKIN_POR_ID[SKIN.id])SKIN.id='steve';aplicarSkinJugador();}
