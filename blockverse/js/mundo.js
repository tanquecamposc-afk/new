"use strict";
/* =========================================================
   Dimensiones y chunks
   ========================================================= */
const DIMS={
  superficie:{clave:'superficie',nombre:'Superficie',cielo:true,amb:.018,chunks:new Map(),ediciones:{}},
  nether:{clave:'nether',nombre:'El Nether',cielo:false,amb:.28,niebla:0x3a100a,chunks:new Map(),ediciones:{}},
  end:{clave:'end',nombre:'El End',cielo:false,amb:.48,niebla:0x0c0a16,chunks:new Map(),ediciones:{}},
};
let dim=DIMS.superficie;
let semilla=1+Math.floor(Math.random()*1e6);
let hornos={}, cofres={};          // "dim:x,y,z" -> estado
let mundoEstado={dragonMuerto:false,cristalesRotos:[],fin:false};
const idx=(x,y,z)=>x+z*CX+y*CX*CZ;
const claveChunk=(cx,cz)=>cx+','+cz;
const claveCont=(x,y,z)=>dim.clave+':'+clavePos(x,y,z);

function obtenerChunkD(d,cx,cz){return d.chunks.get(claveChunk(cx,cz))||generarChunk(d,cx,cz);}
function obtenerChunk(cx,cz){return obtenerChunkD(dim,cx,cz);}
function chunkSiExiste(cx,cz){return dim.chunks.get(claveChunk(cx,cz));}
function getBloque(x,y,z){
  if(y<0)return B.lecho; if(y>=CY)return 0;
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ);
  return obtenerChunk(cx,cz).datos[idx(x-cx*CX,y,z-cz*CZ)];
}
function getBloqueSiCargado(x,y,z){
  if(y<0||y>=CY)return 0;
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ), ch=chunkSiExiste(cx,cz);
  return ch?ch.datos[idx(x-cx*CX,y,z-cz*CZ)]:-1;
}

function generarChunk(d,cx,cz){
  const datos=new Uint8Array(CX*CY*CZ);
  const ch={cx,cz,dim:d,datos,luz:null,malla:null,mallaT:null,sucio:false,ymin:0,ymax:CY-1,generadores:[]};
  if(d===DIMS.superficie)generarSuperficie(ch);
  else if(d===DIMS.nether)generarNether(ch);
  else generarEnd(ch);
  const ed=d.ediciones[claveChunk(cx,cz)];
  if(ed)for(const k in ed){const [x,y,z]=k.split(',').map(Number);datos[idx(x,y,z)]=ed[k];}
  let ymin=CY,ymax=0;
  for(let y=0;y<CY;y++){const o=y*CX*CZ;for(let i=0;i<256;i++){const b=datos[o+i];if(b){if(y<ymin)ymin=y;ymax=y;if(b===B.generador)ch.generadores.push([i&15,y,i>>4]);}}}
  ch.ymin=ymin===CY?0:ymin; ch.ymax=ymax;
  d.chunks.set(claveChunk(cx,cz),ch);
  return ch;
}

/* ---------- Colocar bloques ---------- */
let chunksSucios=new Set();
function marcarSucio(ch){if(ch&&ch.malla){ch.sucio=true;chunksSucios.add(ch);}}
function marcarSucioPos(x,z){
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ), lx=x-cx*CX, lz=z-cz*CZ;
  marcarSucio(chunkSiExiste(cx,cz));
  const bx=lx===0?-1:lx===CX-1?1:0, bz=lz===0?-1:lz===CZ-1?1:0;
  if(bx)marcarSucio(chunkSiExiste(cx+bx,cz)); if(bz)marcarSucio(chunkSiExiste(cx,cz+bz)); if(bx&&bz)marcarSucio(chunkSiExiste(cx+bx,cz+bz));
}
function setBloque(x,y,z,id,opc={}){
  if(y<0||y>=CY)return;
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ), lx=x-cx*CX, lz=z-cz*CZ;
  const ch=obtenerChunk(cx,cz), i=idx(lx,y,lz), anterior=ch.datos[i];
  if(anterior===id)return;
  ch.datos[i]=id;
  if(id&&y>ch.ymax)ch.ymax=y; if(id&&y<ch.ymin)ch.ymin=y;
  if(id===B.generador)ch.generadores.push([lx,y,lz]);
  if(anterior===B.horno||anterior===B.cofre)vaciarContenedor(x,y,z);
  const k=claveChunk(cx,cz); (dim.ediciones[k]||(dim.ediciones[k]={}))[lx+','+y+','+lz]=id;
  marcarSucioPos(x,z);
  if(ch.luz)actualizarLuz(x,y,z);
  if(!opc.sinAviso)notificarCambio(x,y,z,anterior,id);
}

/* ---------- Contenedores ---------- */
function obtenerHorno(k){return hornos[k]||(hornos[k]={entrada:null,combustible:null,salida:null,quema:0,quemaMax:0,prog:0});}
function obtenerCofre(k){return cofres[k]||(cofres[k]=new Array(27).fill(null));}
function vaciarContenedor(x,y,z){
  const k=claveCont(x,y,z), pilas=[];
  if(hornos[k]){const h=hornos[k];pilas.push(h.entrada,h.combustible,h.salida);delete hornos[k];}
  if(cofres[k]){pilas.push(...cofres[k]);delete cofres[k];}
  if(typeof ui!=='undefined'&&ui&&ui.clave===k)cerrarUI();
  for(const p of pilas)if(p)soltarItem(p,x+.5,y+.5,z+.5,true);
}
function actualizarHornos(dt){
  for(const k in hornos){
    const h=hornos[k], res=h.entrada&&FUNDIR[h.entrada.id];
    const cabe=res&&(!h.salida||(h.salida.id===res&&h.salida.n<maxPila(res)));
    if(h.quema>0)h.quema-=dt;
    if(h.quema<=0&&cabe&&h.combustible&&COMBUSTIBLE[h.combustible.id]){
      h.quema=h.quemaMax=COMBUSTIBLE[h.combustible.id];
      if(h.combustible.id===I.cuboLava)h.combustible=crearPila(I.cubo);
      else if(--h.combustible.n<=0)h.combustible=null;
    }
    if(h.quema>0&&cabe){
      h.prog+=dt;
      if(h.prog>=TIEMPO_FUNDIR){h.prog=0;
        if(--h.entrada.n<=0)h.entrada=null;
        if(h.salida)h.salida.n++;else h.salida=crearPila(res);
        h.xp=(h.xp||0)+.35;}
    }else h.prog=Math.max(0,h.prog-dt*2);
    if(h.quema<0)h.quema=0;
  }
}
/* Botín de cofres generados */
function generarBotin(tipo,rnd){
  const tablas={
    mazmorra:[[I.pan,1,3,15],[I.lingoteHierro,1,4,10],[I.lingoteOro,1,4,5],[I.carnePodrida,1,8,10],[I.hueso,1,8,10],[I.polvora,1,8,10],
      [I.cuerda,1,8,10],[I.trigo,1,4,10],[I.cubo,1,1,5],[I.manzanaDorada,1,1,2],[I.redstone,1,4,5],[I.diamante,1,2,2],[I.semillas,2,4,8]],
    fortaleza:[[I.perlaEnder,1,2,10],[I.pan,1,3,15],[I.manzana,1,3,15],[I.lingoteHierro,1,5,10],[I.lingoteOro,1,3,5],[I.redstone,4,9,5],
      [I.diamante,1,3,3],[I.lingoteHierro+0,1,1,0],[410+2,1,1,2],[300+2,1,1,3],[330+2,1,1,3],[I.libro,1,3,5]],
    fortalezaNether:[[I.diamante,1,3,5],[I.lingoteHierro,1,5,5],[I.lingoteOro,1,3,15],[330+3,1,1,5],[410+1,1,1,5],[I.mechero,1,1,5],
      [B.obsidiana,2,4,2],[I.polvoBlaze,1,3,6],[I.cuerda,2,6,6]],
  }[tipo];
  const cofre=new Array(27).fill(null), total=tablas.reduce((a,t)=>a+t[3],0);
  const n=4+Math.floor(rnd()*5);
  for(let i=0;i<n;i++){
    let r=rnd()*total,t=tablas[0];
    for(const e of tablas){r-=e[3];if(r<=0){t=e;break;}}
    const p=crearPila(t[0],t[1]+Math.floor(rnd()*(t[2]-t[1]+1)));
    cofre[Math.floor(rnd()*27)]=p;
  }
  return cofre;
}
function registrarCofre(d,x,y,z,tipo){
  const k=d.clave+':'+clavePos(x,y,z);
  if(!cofres[k])cofres[k]=generarBotin(tipo,mulberry32(Math.floor(hash3(x,y,z,semilla)*1e9)));
}

/* =========================================================
   Generación de la Superficie
   ========================================================= */
const BIOMA={oceano:0,playa:1,llanura:2,bosque:3,desierto:4,nevado:5,montana:6};
const NOMBRES_BIOMA=['Océano','Playa','Llanura','Bosque','Desierto','Nevado','Montañas'];
function infoColumna(x,z){
  const s=semilla;
  const c=fbm(x*.0025,z*.0025,s,4);
  const colinas=fbm(x*.012,z*.012,s+50,4);
  const montes=clamp((fbm(x*.005,z*.005,s+90,3)-.52)*3.2,0,1);
  let h;
  if(c<.44)h=NIVEL_MAR-3-(.44-c)*120+colinas*5;
  else h=NIVEL_MAR+1+(c-.44)*50+colinas*10+montes*montes*62;
  h=Math.round(clamp(h,70,186));
  const temp=fbm(x*.0016,z*.0016,s+500,2), hum=fbm(x*.0016,z*.0016,s+600,2);
  let bioma;
  if(h<NIVEL_MAR-1)bioma=BIOMA.oceano;
  else if(h<=NIVEL_MAR+1&&c<.47)bioma=BIOMA.playa;
  else if(montes>.45&&h>150)bioma=BIOMA.montana;
  else if(temp<.38)bioma=BIOMA.nevado;
  else if(temp>.6&&hum<.52)bioma=BIOMA.desierto;
  else if(hum>.53)bioma=BIOMA.bosque;
  else bioma=BIOMA.llanura;
  return {h,bioma,montes};
}
function alturaSuperficie(x,z){return infoColumna(x,z).h;}
// Cuevas: se muestrea en una rejilla gruesa (4x4x4) y se interpola
const GR=4, GNY=CY/GR+1;
const _rejA=new Float32Array(5*5*GNY), _rejV=new Float32Array(5*5*GNY);
function prepararCuevas(bx,bz,s){
  for(let gx=0;gx<5;gx++)for(let gz=0;gz<5;gz++)for(let gy=0;gy<GNY;gy++){
    const x=bx+gx*GR,z=bz+gz*GR,y=gy*GR, i=(gy*5+gz)*5+gx;
    _rejA[i]=valueNoise3(x/30,y/18,z/30,s+300)*.65+valueNoise3(x/11,y/11,z/11,s+301)*.35;
    const b=valueNoise3(x/26,y/15,z/26,s+302), c=valueNoise3(x/26,y/15,z/26,s+303);
    _rejV[i]=.5-Math.max(Math.abs(b-.5),Math.abs(c-.5));
  }
}
function muestraRejilla(rej,x,y,z){
  const gx=x/GR,gy=y/GR,gz=z/GR,x0=Math.min(3,gx|0),y0=Math.min(GNY-2,gy|0),z0=Math.min(3,gz|0);
  const fx=gx-x0,fy=gy-y0,fz=gz-z0;
  const v=(i,j,k)=>rej[((y0+j)*5+z0+k)*5+x0+i];
  const a=lerp(lerp(v(0,0,0),v(1,0,0),fx),lerp(v(0,0,1),v(1,0,1),fx),fz);
  const b=lerp(lerp(v(0,1,0),v(1,1,0),fx),lerp(v(0,1,1),v(1,1,1),fx),fz);
  return lerp(a,b,fy);
}
function esCuevaLocal(lx,y,lz,h,oceano){
  if(y<5)return false;
  if(oceano&&y>h-6)return false;
  const a=muestraRejilla(_rejA,lx,y,lz), v=muestraRejilla(_rejV,lx,y,lz);
  if(y>h-4)return a>.76||v>.48;
  return a>.675||v>.462;
}
// Menas: probabilidad por capa (Y del jugador)
const MENAS=[
  {id:B.menaCarbon,ds:B.pCarbon,sal:12,p:my=>my>=0&&my<=127?.019*(.45+.55*triangular(my,0,190)):0},
  {id:B.menaCobre,ds:B.pCobre,sal:13,p:my=>.008*triangular(my,-16,112)},
  {id:B.menaHierro,ds:B.pHierro,sal:14,p:my=>.011*triangular(my,-24,56)+(my<72?.002:0)},
  {id:B.menaOro,ds:B.pOro,sal:15,p:my=>.0024*triangular(my,-64,32)},
  {id:B.menaRedstone,ds:B.pRedstone,sal:16,p:my=>my<=15?.0065*clamp((15-my)/60,.15,1):0},
  {id:B.menaLapis,ds:B.pLapis,sal:17,p:my=>.0012*triangular(my,-32,32)+(my<64?.0002:0)},
  {id:B.menaDiamante,ds:B.pDiamante,sal:18,p:my=>my<=16?.0009*clamp((16-my)/70,.1,1):0},
];
function elegirMena(x,y,z,s,esPizarra){
  const my=y-OY, r=hash3(x,y,z,s+11);
  if(r>.6)return 0;
  for(const m of MENAS){
    const p=m.p(my); if(p<=0)continue;
    if(hash3(x>>1,y>>1,z>>1,s+m.sal)<p)return esPizarra?m.ds:m.id;
  }
  return 0;
}
function generarSuperficie(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla;
  prepararCuevas(bx,bz,s);
  const info=[];
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)info.push(infoColumna(bx+x,bz+z));
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x, wz=bz+z, {h,bioma,montes}=info[z*CX+x];
    const oceano=h<NIVEL_MAR;
    const top=Math.max(h,NIVEL_MAR);
    for(let y=0;y<=top;y++){
      let id;
      if(y<=4&&(y===0||hash3(wx,y,wz,s+5)<(5-y)/5))id=B.lecho;
      else if(y>h)id=(bioma===BIOMA.nevado&&y===NIVEL_MAR)?B.hielo:B.agua;
      else if(esCuevaLocal(x,y,z,h,oceano))id=y<=10?B.lava:0;
      else if(y===h){
        if(bioma===BIOMA.desierto||bioma===BIOMA.playa)id=B.arena;
        else if(oceano)id=h<NIVEL_MAR-8?B.grava:B.arena;
        else if(bioma===BIOMA.montana)id=h>172?B.bloqueNieve:B.piedra;
        else if(bioma===BIOMA.nevado)id=B.cespedNevado;
        else id=B.cesped;
      }else if(y>h-4){
        if(bioma===BIOMA.desierto)id=y>h-3?B.arena:B.arenisca;
        else if(bioma===BIOMA.playa||oceano)id=B.arena;
        else if(bioma===BIOMA.montana)id=B.piedra;
        else id=B.tierra;
      }else{
        const pizarra=y<OY||(y<OY+8&&hash3(wx,y,wz,s+6)<(OY+8-y)/8);
        id=pizarra?B.pizarra:B.piedra;
        const m=elegirMena(wx,y,wz,s,pizarra);
        if(m)id=m;
        else if(bioma===BIOMA.montana&&y>OY+50&&hash3(wx,y,wz,s+19)<.004)id=B.menaEsmeralda;
        else if(!pizarra&&valueNoise3(wx/7,y/7,wz/7,s+20)>.83)id=hash3(wx>>2,y>>2,wz>>2,s+21)<.5?B.grava:B.tierra;
      }
      if(id)datos[idx(x,y,z)]=id;
    }
  }
  // Vegetación y árboles
  const densArbol=[0,0,.004,.035,0,.012,0];
  for(let wx=bx-2;wx<bx+CX+2;wx++)for(let wz=bz-2;wz<bz+CZ+2;wz++){
    const dentro=wx>=bx&&wx<bx+CX&&wz>=bz&&wz<bz+CZ;
    const inf=dentro?info[(wz-bz)*CX+wx-bx]:infoColumna(wx,wz);
    const {h,bioma}=inf;
    if(h<=NIVEL_MAR)continue;
    if(dentro&&datos[idx(wx-bx,h,wz-bz)]===0)continue;
    const r=hash2(wx,wz,s+777);
    if(r<densArbol[bioma]){ponerArbol(ch,wx,h,wz);continue;}
    if(!dentro)continue;
    const lx=wx-bx,lz=wz-bz,sup=datos[idx(lx,h,lz)];
    const r2=hash2(wx,wz,s+779);
    const poner=(y,id)=>{if(y<CY&&!datos[idx(lx,y,lz)])datos[idx(lx,y,lz)]=id;};
    if(sup===B.cesped){
      if(r2<(bioma===BIOMA.llanura?.18:.08))poner(h+1,B.hierbaAlta);
      else if(r2<(bioma===BIOMA.llanura?.2:.09))poner(h+1,hash2(wx,wz,s+780)<.5?B.florAmarilla:B.florRoja);
    }
    if(bioma===BIOMA.desierto&&sup===B.arena&&r2<.006){const a=1+Math.floor(hash2(wx,wz,s+781)*3);for(let k=1;k<=a;k++)poner(h+k,B.cactus);}
    if(h===NIVEL_MAR+1&&(sup===B.arena||sup===B.cesped)&&r2<.12){
      const cerca=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>alturaSuperficie(wx+a,wz+b)<NIVEL_MAR+1);
      if(cerca){const a=1+Math.floor(hash2(wx,wz,s+782)*3);for(let k=1;k<=a;k++)poner(h+k,B.cana);}
    }
  }
  estructurasSuperficie(ch);
}
function ponerArbol(ch,wx,h,wz){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ;
  const alto=4+Math.floor(hash2(wx,wz,semilla+778)*3), cima=h+alto;
  const poner=(x,y,z,id,soloAire)=>{const lx=x-bx,lz=z-bz;
    if(lx<0||lz<0||lx>=CX||lz>=CZ||y<0||y>=CY)return;const i=idx(lx,y,lz);if(soloAire&&datos[i])return;datos[i]=id;};
  for(let y=cima-2;y<=cima+1;y++){const rad=y>=cima?1:2;
    for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++){
      if(Math.abs(dx)===rad&&Math.abs(dz)===rad&&(y===cima+1||hash2(wx+dx*7,wz+dz*13+y,semilla)<.5))continue;
      poner(wx+dx,y,wz+dz,B.hojas,true);}}
  for(let y=h+1;y<=cima;y++)poner(wx,y,wz,B.tronco,false);
  poner(wx,h,wz,B.tierra,false);
}
/* ---------- Fortaleza (con el portal del End) y mazmorras ---------- */
function posFortaleza(){
  const a=hash2(1,2,semilla)*Math.PI*2, d=520+hash2(3,4,semilla)*260;
  return {x:Math.round(Math.cos(a)*d),y:40,z:Math.round(Math.sin(a)*d)};
}
function bloqueFortaleza(x,y,z,f,s){
  const rx=x-f.x, ry=y-f.y, rz=z-f.z;
  const piedra=()=>{const h=hash3(x,y,z,s+40);return h<.25?B.ladrillosMusgo:B.ladrillosPiedra;};
  // Sala del portal: interior x[-4,4] z[-7,7] y[1,6]
  if(Math.abs(rx)<=5&&Math.abs(rz)<=8&&ry>=0&&ry<=7){
    const borde=Math.abs(rx)===5||Math.abs(rz)===8||ry===0||ry===7;
    const puerta=(Math.abs(rz)===8||Math.abs(rx)===5)&&ry>=1&&ry<=3&&(Math.abs(rx)<=1&&Math.abs(rz)===8||Math.abs(rz)<=1&&Math.abs(rx)===5);
    if(borde&&!puerta)return piedra();
    if(ry===1&&Math.abs(rx)<=2&&rz>=1&&rz<=5){
      if(Math.abs(rx)<=1&&rz>=2&&rz<=4)return B.lava;
      return piedra();
    }
    if(ry===2){
      const marco=(Math.abs(rx)===2&&rz>=2&&rz<=4)||((rz===1||rz===5)&&Math.abs(rx)<=1);
      if(marco)return hash3(x,y,z,s+41)<.1?B.marcoEndOjo:B.marcoEnd;
    }
    if(ry===1&&rz===-5&&rx===3)return B.generador;
    return 0;
  }
  // Pasillos: hacia -z, +x y -x
  const pasillo=(u,v,len)=>{ // u: eje a lo largo, v: eje transversal
    if(u<0||u>len)return -1;
    if(Math.abs(v)>2||ry<0||ry>4)return -1;
    // sala final
    return (Math.abs(v)===2||ry===0||ry===4)?piedra():0;
  };
  const salaFinal=(u,v,len)=>{
    const du=u-len-3;
    if(Math.abs(du)>3||Math.abs(v)>3||ry<0||ry>5)return -1;
    if(Math.abs(du)===3||Math.abs(v)===3||ry===0||ry===5){
      if(du===-3&&Math.abs(v)<=1&&ry>=1&&ry<=3)return 0;
      return piedra();
    }
    if(du===2&&v===0&&ry===1)return B.cofre;
    return 0;
  };
  for(const [u,v,len] of [[-rz-9,rx,26],[rx-6,rz,22],[-rx-6,rz,30]]){
    let b=pasillo(u,v,len); if(b>=0)return b;
    b=salaFinal(u,v,len); if(b>=0)return b;
  }
  return -1;
}
function estructurasSuperficie(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla;
  const f=posFortaleza();
  if(bx+CX>f.x-45&&bx<f.x+45&&bz+CZ>f.z-45&&bz<f.z+45){
    for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)for(let y=f.y;y<=f.y+7;y++){
      const b=bloqueFortaleza(bx+x,y,bz+z,f,s);
      if(b>=0){datos[idx(x,y,z)]=b;if(b===B.cofre)registrarCofre(DIMS.superficie,bx+x,y,bz+z,'fortaleza');}
    }
  }
  // Mazmorra
  if(hash2(cx,cz,s+900)<.035){
    const cy=18+Math.floor(hash2(cx,cz,s+901)*50), ox=bx+8, oz=bz+8;
    for(let z=3;z<=13;z++)for(let x=3;x<=13;x++)for(let y=cy;y<=cy+5;y++){
      const rx=x-8,rz=z-8,ry=y-cy,i=idx(x,y,z);
      const borde=Math.abs(rx)===5||Math.abs(rz)===5||ry===0||ry===5;
      if(borde){if(datos[i])datos[i]=ry===0&&hash3(x,y,z,s+44)<.5?B.ladrillosMusgo:B.roca;}
      else datos[i]=0;
    }
    datos[idx(8,cy+1,8)]=B.generador;
    datos[idx(4,cy+1,8)]=B.cofre; registrarCofre(DIMS.superficie,bx+4,cy+1,oz,'mazmorra');
    if(hash2(cx,cz,s+902)<.5){datos[idx(12,cy+1,8)]=B.cofre;registrarCofre(DIMS.superficie,bx+12,cy+1,oz,'mazmorra');}
  }
}

/* =========================================================
   Generación del Nether
   ========================================================= */
const _rejN=new Float32Array(5*5*GNY);
function generarNether(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla+7000;
  for(let gx=0;gx<5;gx++)for(let gz=0;gz<5;gz++)for(let gy=0;gy<GNY;gy++){
    const x=bx+gx*GR,z=bz+gz*GR,y=gy*GR;
    _rejN[(gy*5+gz)*5+gx]=valueNoise3(x/26,y/16,z/26,s)*.7+valueNoise3(x/9,y/9,z/9,s+1)*.3;
  }
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x,wz=bz+z;
    const almas=fbm(wx*.04,wz*.04,s+5,2)>.6;
    for(let y=OY;y<CY;y++){
      let id=0;
      if(y<=OY+4&&(y===OY||hash3(wx,y,wz,s+2)<(OY+5-y)/5))id=B.lecho;
      else if(y>=CY-5&&(y===CY-1||hash3(wx,y,wz,s+3)<(y-(CY-6))/5))id=B.lecho;
      else{
        const t=(y-OY)/127;
        const d=muestraRejilla(_rejN,x,y,z)+Math.max(0,.24-t)*3+Math.max(0,t-.8)*3;
        if(d>.6){
          id=B.netherrack;
          if(almas&&y<OY+45)id=B.arenaAlmas;
          else{const r=hash3(wx,y,wz,s+4);
            if(hash3(wx>>1,y>>1,wz>>1,s+6)<.03&&r<.6)id=B.menaCuarzo;
            else if(hash3(wx>>1,y>>1,wz>>1,s+7)<.012&&r<.5)id=B.menaOroNether;}
        }else if(y<=OY+31)id=B.lava;
      }
      if(id)datos[idx(x,y,z)]=id;
    }
  }
  // Piedra luminosa colgando del techo
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)for(let y=OY+80;y<CY-6;y++){
    const i=idx(x,y,z);
    if(datos[i]===0&&datos[idx(x,y+1,z)]===B.netherrack&&hash3(bx+x,y,bz+z,s+8)<.006){
      const n=2+Math.floor(hash3(bx+x,y,bz+z,s+9)*5);
      for(let k=0;k<n;k++){
        const dx=k?Math.floor(hash3(k,x,y,s)*3)-1:0,dz=k?Math.floor(hash3(k,z,y,s+1)*3)-1:0,dy=-Math.floor(k/2);
        const X=x+dx,Z=z+dz,Y=y+dy; if(X<0||Z<0||X>=CX||Z>=CZ)continue;
        if(!datos[idx(X,Y,Z)])datos[idx(X,Y,Z)]=B.piedraLuminosa;}
    }
  }
  estructurasNether(ch);
}
function fortalezaNetherEn(rx,rz){
  const s=semilla+8000;
  if(hash2(rx,rz,s)>.8)return null;
  return {x:rx*176+40+Math.floor(hash2(rx,rz,s+1)*96),y:OY+64,z:rz*176+40+Math.floor(hash2(rx,rz,s+2)*96)};
}
function fortalezasCerca(x,z){
  const rx=Math.floor(x/176),rz=Math.floor(z/176),res=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const f=fortalezaNetherEn(rx+a,rz+b);if(f)res.push(f);}
  return res;
}
function bloqueFortalezaNether(x,y,z,f){
  const rx=x-f.x, ry=y-f.y, rz=z-f.z;
  const L=46;
  const enX=Math.abs(rz)<=2&&Math.abs(rx)<=L, enZ=Math.abs(rx)<=2&&Math.abs(rz)<=L;
  const plaza=Math.abs(rx)<=7&&Math.abs(rz)<=7;
  if(!(enX||enZ||plaza))return -1;
  if(ry===0)return B.ladrilloNether;
  if(ry<0){
    const pilar=(enX&&Math.abs(rz)<=1&&((rx%8)+8)%8===0)||(enZ&&Math.abs(rx)<=1&&((rz%8)+8)%8===0)||(plaza&&Math.abs(rx)===7&&Math.abs(rz)===7);
    return pilar&&ry>-60?B.ladrilloNether:-1;
  }
  if(ry>5)return -1;
  if(plaza){
    const borde=Math.abs(rx)===7||Math.abs(rz)===7;
    const abertura=(Math.abs(rx)<=2&&Math.abs(rz)===7)||(Math.abs(rz)<=2&&Math.abs(rx)===7);
    if(borde&&!abertura)return ry<=2?B.ladrilloNether:0;
    if(ry===1&&rx===0&&rz===0)return B.generador;
    if(ry===1&&rx===5&&rz===5)return B.cofre;
    if(ry===5)return B.ladrilloNether;
    return 0;
  }
  const lado=enX?Math.abs(rz)===2:Math.abs(rx)===2;
  if(lado)return ry===1?B.ladrilloNether:0;
  const extremo=enX?Math.abs(rx)===L:Math.abs(rz)===L;
  if(extremo&&ry===1&&(rx===0||rz===0))return B.generador;
  return 0;
}
function estructurasNether(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ;
  for(const f of fortalezasCerca(bx+8,bz+8)){
    if(bx+CX<f.x-50||bx>f.x+50||bz+CZ<f.z-50||bz>f.z+50)continue;
    for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)for(let y=f.y-60;y<=f.y+5;y++){
      const b=bloqueFortalezaNether(bx+x,y,bz+z,f);
      if(b>=0){datos[idx(x,y,z)]=b;if(b===B.cofre)registrarCofre(DIMS.nether,bx+x,y,bz+z,'fortalezaNether');}
    }
  }
}

/* =========================================================
   Generación del End
   ========================================================= */
const END_TOP=OY+60;   // superficie de la isla (Y 60)
const EPY=END_TOP+3;   // base del portal de salida
const PILARES=Array.from({length:10},(_,i)=>{const a=Math.PI*2*i/10+.3;
  return {x:Math.round(Math.cos(a)*42),z:Math.round(Math.sin(a)*42),r:2+(i*7)%4,alto:OY+76+3*((i*3)%10)};});
function generarEnd(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla+9000;
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x,wz=bz+z,d=Math.hypot(wx,wz);
    const R=76+fbm(wx*.02,wz*.02,s,2)*26;
    if(d<R){
      const f=1-d/R;
      const top=END_TOP+Math.round(f*3+fbm(wx*.08,wz*.08,s+1,2)*2);
      const bot=top-Math.round(4+f*46*(.6+.4*fbm(wx*.05,wz*.05,s+2,2)));
      for(let y=bot;y<=top;y++)datos[idx(x,y,z)]=B.piedraEnd;
    }
    for(const p of PILARES){
      const dd=(wx-p.x)**2+(wz-p.z)**2;
      if(dd<=p.r*p.r+p.r*.5)for(let y=END_TOP-20;y<=p.alto;y++)datos[idx(x,y,z)]=B.obsidiana;
      if(wx===p.x&&wz===p.z)datos[idx(x,p.alto+1,z)]=B.lecho;
    }
    // Portal de salida (inactivo hasta vencer al dragón)
    const r=Math.hypot(wx,wz);
    if(r<3.5){
      datos[idx(x,EPY,z)]=B.lecho;
      for(let y=EPY+1;y<=EPY+8;y++)datos[idx(x,y,z)]=0;
      if(r>=2.5)datos[idx(x,EPY+1,z)]=B.lecho;
      if(wx===0&&wz===0)for(let y=EPY+1;y<=EPY+4;y++)datos[idx(x,y,z)]=B.lecho;
    }
    // Plataforma de obsidiana de llegada
    if(Math.abs(wx-100)<=2&&Math.abs(wz)<=2){
      datos[idx(x,OY+48,z)]=B.obsidiana;
      for(let y=OY+49;y<=OY+51;y++)datos[idx(x,y,z)]=0;
    }
  }
}

/* =========================================================
   Carga y descarga alrededor del jugador
   ========================================================= */
let radio=6, offsets=[];
function calcularOffsets(){
  offsets=[];for(let x=-radio;x<=radio;x++)for(let z=-radio;z<=radio;z++)if(x*x+z*z<=radio*radio+1)offsets.push([x,z,x*x+z*z]);
  offsets.sort((a,b)=>a[2]-b[2]);
}
function gestionarChunks(presupuestoMs,px,pz){
  const pcx=Math.floor(px/CX), pcz=Math.floor(pz/CZ);
  const t0=performance.now();
  for(const [ox,oz] of offsets){
    const ch=obtenerChunk(pcx+ox,pcz+oz);
    if(!ch.malla){construirMallaChunk(ch);if(performance.now()-t0>presupuestoMs)break;}
  }
  // Chunks sucios (bloques cambiados)
  if(chunksSucios.size){
    const lista=[...chunksSucios].sort((a,b)=>((a.cx-pcx)**2+(a.cz-pcz)**2)-((b.cx-pcx)**2+(b.cz-pcz)**2));
    for(const ch of lista){
      chunksSucios.delete(ch);
      if(ch.malla&&ch.dim===dim)construirMallaChunk(ch);
      if(performance.now()-t0>presupuestoMs+8)break;
    }
  }
  const lim=radio+2;
  for(const [k,ch] of dim.chunks){
    const dx=Math.abs(ch.cx-pcx),dz=Math.abs(ch.cz-pcz);
    if(ch.malla&&(dx>lim||dz>lim))quitarMallaChunk(ch);
    if(dx>lim+3||dz>lim+3){quitarMallaChunk(ch);dim.chunks.delete(k);chunksSucios.delete(ch);}
  }
}
