"use strict";
/* =========================================================
   Redstone: el polvo lleva energía (0-15, pierde 1 por
   bloque); fuentes: bloque de redstone, antorchas, palancas,
   botones y placas; consumidores: lámparas, puertas,
   dinamita, pistones y raíles propulsores.
   ========================================================= */
const RS=new Uint8Array(BLOQUES.length);
BLOQUES.forEach((b,i)=>{if(b&&(b.redstone||b.puerta||i===B.tnt||b.cabezaPiston))RS[i]=1;});
const esCable=id=>id>=B.cable0&&id<=B.cable0+15;
const potenciaCable=id=>id-B.cable0;
function esFuente(id){
  const b=BLOQUES[id]; if(!b||!b.redstone)return false;
  return id===B.bloqueRedstone||id===B.antorchaR||((b.redstone==='palanca'||b.redstone==='boton'||b.redstone==='placa'||b.redstone==='sensor')&&b.on);
}
const colaRS=new Map(); let rsT=0;
function avisarRedstone(x,y,z,anterior,nuevo){
  let rel=RS[anterior]||RS[nuevo];
  if(!rel)for(const [dx,dy,dz] of DIR6){const b=getBloqueSiCargado(x+dx,y+dy,z+dz);if(b>0&&RS[b]){rel=true;break;}}
  if(rel)colaRS.set(clavePos(x,y,z),[x,y,z]);
}
function procesarRedstone(dt){
  rsT-=dt; if(rsT>0||!colaRS.size)return; rsT=.1;
  const puntos=[...colaRS.values()]; colaRS.clear();
  let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;
  for(const [x,y,z] of puntos){x0=Math.min(x0,x);y0=Math.min(y0,y);z0=Math.min(z0,z);x1=Math.max(x1,x);y1=Math.max(y1,y);z1=Math.max(z1,z);}
  const R=16;
  x0-=R;z0-=R;x1+=R;z1+=R;y0=Math.max(0,y0-6);y1=Math.min(CY-1,y1+6);
  if(x1-x0>80||z1-z0>80){for(const p of puntos)colaRS.set(clavePos(...p),p);x1=x0+80;z1=z0+80;}
  calcularRedstone(x0,y0,z0,x1,y1,z1);
}
function calcularRedstone(x0,y0,z0,x1,y1,z1){
  const W=x1-x0+1,H=y1-y0+1,D=z1-z0+1, N=W*H*D;
  const blq=new Uint16Array(N), ix=(x,y,z)=>((y-y0)*D+(z-z0))*W+(x-x0);
  const dentro=(x,y,z)=>x>=x0&&x<=x1&&y>=y0&&y<=y1&&z>=z0&&z<=z1;
  const cables=[],antorchas=[],consumidores=[];
  for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
    const b=getBloqueSiCargado(x,y,z); if(b<=0)continue;
    blq[ix(x,y,z)]=b;
    if(!RS[b])continue;
    if(esCable(b))cables.push([x,y,z]);
    else if(b===B.antorchaR||b===B.antorchaROff)antorchas.push([x,y,z]);
    else if(!esFuente(b)||BLOQUES[b].redstone==='lampara')consumidores.push([x,y,z]);
  }
  const get=(x,y,z)=>dentro(x,y,z)?blq[ix(x,y,z)]:Math.max(0,getBloqueSiCargado(x,y,z));
  const nivel=new Uint8Array(N);
  let potFuerte, potDebil;
  const esSolido=b=>SOLIDO[b]&&OPACO[b];
  for(let vuelta=0;vuelta<6;vuelta++){
    // Bloques con energía fuerte: bajo palancas/botones/placas activas y encima de antorchas encendidas
    potFuerte=new Set();
    for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
      const b=blq[ix(x,y,z)]; if(!b||!RS[b])continue;
      const d=BLOQUES[b];
      if(d.on&&(d.redstone==='palanca'||d.redstone==='boton'||d.redstone==='placa'))potFuerte.add(clavePos(x,y-1,z));
      if(b===B.antorchaR)potFuerte.add(clavePos(x,y+1,z));
    }
    // Propagación por el polvo
    nivel.fill(0);
    const cola=[];
    for(const [x,y,z] of cables){
      let src=false;
      for(const [dx,dy,dz] of DIR6){const n=get(x+dx,y+dy,z+dz);
        if(esFuente(n)&&!(n===B.antorchaR&&dy===1)){src=true;break;}
        if(esSolido(n)&&potFuerte.has(clavePos(x+dx,y+dy,z+dz))){src=true;break;}}
      if(src){nivel[ix(x,y,z)]=15;cola.push([x,y,z]);}
    }
    while(cola.length){
      const [x,y,z]=cola.shift(), l=nivel[ix(x,y,z)]; if(l<=1)continue;
      for(const [dx,,dz] of DIR6.slice(0,4)){
        for(const dy of [0,1,-1]){
          const nx=x+dx,ny=y+dy,nz=z+dz; if(!dentro(nx,ny,nz))continue;
          if(!esCable(blq[ix(nx,ny,nz)]))continue;
          if(dy===1&&esSolido(get(x,y+1,z)))continue;
          if(dy===-1&&esSolido(get(nx,y,nz)))continue;
          const k=ix(nx,ny,nz); if(nivel[k]<l-1){nivel[k]=l-1;cola.push([nx,ny,nz]);}
        }
      }
    }
    // Bloques con energía débil: bajo el polvo y a su lado
    potDebil=new Set(potFuerte);
    for(const [x,y,z] of cables){if(!nivel[ix(x,y,z)])continue;
      potDebil.add(clavePos(x,y-1,z));for(const [dx,,dz] of DIR6.slice(0,4))if(esSolido(get(x+dx,y,z+dz)))potDebil.add(clavePos(x+dx,y,z+dz));}
    // Antorchas: se apagan si el bloque en el que están tiene energía
    let cambio=false;
    for(const [x,y,z] of antorchas){
      const k=ix(x,y,z), b=blq[k], apagar=potDebil.has(clavePos(x,y-1,z));
      const nuevo=apagar?B.antorchaROff:B.antorchaR;
      if(b!==nuevo){blq[k]=nuevo;cambio=true;}
    }
    if(!cambio)break;
  }
  // Aplicar antorchas y cables
  for(const [x,y,z] of antorchas){const b=blq[ix(x,y,z)];if(getBloque(x,y,z)!==b){setBloque(x,y,z,b,{sinAviso:true});emitirParticulas(x+.5,y+.8,z+.5,0xff2020,2,.3,.4,-1);}}
  for(const [x,y,z] of cables){const b=B.cable0+nivel[ix(x,y,z)];if(getBloque(x,y,z)!==b)setBloque(x,y,z,b,{sinAviso:true});}
  // Consumidores
  const recibe=(x,y,z)=>{
    for(const [dx,dy,dz] of DIR6){const nx=x+dx,ny=y+dy,nz=z+dz,n=get(nx,ny,nz);
      if(esFuente(n))return true;
      if(esCable(n)&&(dentro(nx,ny,nz)?nivel[ix(nx,ny,nz)]:potenciaCable(n))>0)return true;
      if(potDebil.has(clavePos(nx,ny,nz)))return true;}
    return false;
  };
  for(const [x,y,z] of consumidores){
    const b=getBloque(x,y,z), d=BLOQUES[b]; if(!d)continue;
    if(d.redstone==='lampara'){const on=recibe(x,y,z);const nuevo=on?B.lamparaOn:B.lampara;if(b!==nuevo)setBloque(x,y,z,nuevo,{sinAviso:true});}
    else if(d.puerta&&!d.puerta.m){
      const on=recibe(x,y,z)||recibe(x,y+1,z), pu=d.puerta;
      if(!!pu.ab!==on){const base=149+pu.f*4+(on?1:0)*2;setBloque(x,y,z,base,{sinAviso:true});setBloque(x,y+1,z,base+1,{sinAviso:true});sonar('puerta',{x,y,z});}
    }else if(b===B.tnt){if(recibe(x,y,z)){setBloque(x,y,z,0,{sinAviso:true});activarTNT(x,y,z);}}
    else if(d.piston){const on=recibe(x,y,z);if(on&&!d.piston.ext)extenderPiston(x,y,z,d.piston);else if(!on&&d.piston.ext)retraerPiston(x,y,z,d.piston);}
    else if(d.propulsor){const on=recibe(x,y,z);if(on!==!!d.encendido){const recto=d.riel[0]===0||d.riel[0]===2;setBloque(x,y,z,on?(recto?B.riel12:B.riel13):(recto?B.riel10:B.riel11),{sinAviso:true});}}
  }
}

/* ---------- Palancas, botones y placas ---------- */
const botonesActivos=[];
function usarRedstone(x,y,z,b){
  const d=BLOQUES[b];
  if(d.redstone==='palanca'){setBloque(x,y,z,d.on?B.palanca:B.palancaOn);sonar('puerta',{x,y,z},.6);return true;}
  if(d.redstone==='boton'&&!d.on){setBloque(x,y,z,B.botonOn);botonesActivos.push({x,y,z,t:1});sonar('puerta',{x,y,z},.5);return true;}
  return false;
}
const placasActivas=new Map(); let placaT=0;
function actualizarPlacas(dt){
  for(let i=botonesActivos.length-1;i>=0;i--){const b=botonesActivos[i];b.t-=dt;
    if(b.t<=0){if(getBloque(b.x,b.y,b.z)===B.botonOn)setBloque(b.x,b.y,b.z,B.boton);botonesActivos.splice(i,1);}}
  placaT-=dt; if(placaT>0)return; placaT=.15;
  const ocupadas=new Set();
  const marcar=e=>{const x=Math.floor(e.pos.x),y=Math.floor(e.pos.y+.05),z=Math.floor(e.pos.z);const b=getBloqueSiCargado(x,y,z);
    if(b===B.placa||b===B.placaOn)ocupadas.add(clavePos(x,y,z));};
  if(estado!=='muerto')marcar(jugador);
  for(const m of mobs)marcar(m);
  for(const e of entidades)if(e.tipo==='item'||e.tipo==='vagoneta')marcar(e);
  for(const k of ocupadas){if(!placasActivas.has(k)){const [x,y,z]=k.split(',').map(Number);if(getBloque(x,y,z)===B.placa){setBloque(x,y,z,B.placaOn);sonar('puerta',{x,y,z},.4);}placasActivas.set(k,[x,y,z]);}}
  for(const [k,[x,y,z]] of placasActivas)if(!ocupadas.has(k)){placasActivas.delete(k);if(getBloque(x,y,z)===B.placaOn)setBloque(x,y,z,B.placa);}
}

/* ---------- Pistones ---------- */
const INAMOVIBLE=new Set([B.obsidiana,B.lecho,B.portalNether,B.portalEnd,B.marcoEnd,B.marcoEndOjo,B.cofre,B.horno,B.soporte,B.mesaEncantar,B.generador,B.obsidianaLlorosa,B.portalAcceso]);
const inamovible=id=>INAMOVIBLE.has(id)||!!(BLOQUES[id]&&(BLOQUES[id].cabezaPiston||(BLOQUES[id].piston&&BLOQUES[id].piston.ext)))||BLOQUES[id].dureza===Infinity&&!esLiquido(id);
function extenderPiston(x,y,z,pi){
  const [dx,dy,dz]=VEC6[pi.d], linea=[];
  let cx=x+dx,cy=y+dy,cz=z+dz;
  for(let k=0;k<=12;k++){
    const b=getBloque(cx,cy,cz);
    if(!b||REEMPL[b])break;
    if(k===12||inamovible(b)||cy<=0||cy>=CY-1)return;
    linea.push([cx,cy,cz,b]); cx+=dx;cy+=dy;cz+=dz;
  }
  const fin=getBloque(cx,cy,cz); if(fin&&REEMPL[fin])soltarDropsBloque(fin,cx,cy,cz,null);
  for(let k=linea.length-1;k>=0;k--){const [bx,by,bz,b]=linea[k];setBloque(bx+dx,by+dy,bz+dz,b,{sinAviso:true});}
  const base=pi.peg?1224+18:1224;
  setBloque(x+dx,y+dy,z+dz,base+12+pi.d,{sinAviso:true});
  setBloque(x,y,z,base+6+pi.d,{sinAviso:true});
  for(const e of [jugador,...mobs]){
    if(Math.floor(e.pos.x)===x+dx&&Math.floor(e.pos.z)===z+dz&&Math.abs(e.pos.y-(y+dy))<1.5||linea.some(([bx,by,bz])=>Math.floor(e.pos.x)===bx+dx&&Math.floor(e.pos.z)===bz+dz&&Math.abs(e.pos.y-(by+dy))<1.5)){
      e.pos.x+=dx;e.pos.y+=Math.max(0,dy)*1.01;e.pos.z+=dz;}
  }
  sonar('piston',{x,y,z});
  for(const [bx,by,bz] of linea)notificarCambio(bx+dx,by+dy,bz+dz,0,1);
}
function retraerPiston(x,y,z,pi){
  const [dx,dy,dz]=VEC6[pi.d], base=pi.peg?1224+18:1224;
  const cab=getBloque(x+dx,y+dy,z+dz);
  if(BLOQUES[cab]&&BLOQUES[cab].cabezaPiston)setBloque(x+dx,y+dy,z+dz,0,{sinAviso:true});
  setBloque(x,y,z,base+pi.d,{sinAviso:true});
  if(pi.peg){const b=getBloque(x+2*dx,y+2*dy,z+2*dz);
    if(b&&!REEMPL[b]&&!inamovible(b)){setBloque(x+2*dx,y+2*dy,z+2*dz,0,{sinAviso:true});setBloque(x+dx,y+dy,z+dz,b);}}
  sonar('piston',{x,y,z},.8);
}
// La cabeza se rompe si falta la base y viceversa
function comprobarPiston(x,y,z){
  const b=getBloque(x,y,z), d=BLOQUES[b]; if(!d)return;
  if(d.cabezaPiston){const [dx,dy,dz]=VEC6[d.cabezaPiston.d];const base=BLOQUES[getBloque(x-dx,y-dy,z-dz)];
    if(!base||!base.piston||!base.piston.ext)setBloque(x,y,z,0,{sinAviso:true});}
  else if(d.piston&&d.piston.ext){const [dx,dy,dz]=VEC6[d.piston.d];const c=BLOQUES[getBloque(x+dx,y+dy,z+dz)];
    if(!c||!c.cabezaPiston){setBloque(x,y,z,(d.piston.peg?1242:1224)+d.piston.d,{sinAviso:true});}}
}

/* ---------- Forma automática de los raíles ---------- */
const esRiel=id=>id>=1260&&id<=1273;
function conexionesRiel(id){const d=BLOQUES[id];return d&&d.riel?[d.riel[0],d.riel[1]]:[];}
function rielEn(x,y,z){for(const dy of [0,-1,1]){const b=getBloque(x,y+dy,z);if(esRiel(b))return [y+dy,b];}return null;}
function formaRiel(x,y,z,dirPreferida){
  const b=getBloque(x,y,z); if(!esRiel(b))return;
  const prop=BLOQUES[b].propulsor;
  const vecinos=[];
  for(let d=0;d<4;d++){const [dx,dz]=DIRF[d];const r=rielEn(x+dx,y,z+dz);if(r)vecinos.push({d,y:r[0]});}
  let id;
  const sube=v=>v.y>y;
  if(vecinos.length>=2){
    let a=vecinos[0],c=vecinos[1];
    for(let i=0;i<vecinos.length;i++)for(let j=i+1;j<vecinos.length;j++)if((vecinos[i].d+2)%4===vecinos[j].d){a=vecinos[i];c=vecinos[j];}
    if((a.d+2)%4===c.d){const up=sube(a)?a:sube(c)?c:null;
      id=up&&!prop?1266+up.d:(a.d%2===0?1260:1261);}
    else if(prop)id=a.d%2===0?1260:1261;
    else{const par=[a.d,c.d].sort().join('');id={'01':1262,'12':1263,'23':1264,'03':1265}[par];}
  }else if(vecinos.length===1){const v=vecinos[0];id=sube(v)&&!prop?1266+v.d:(v.d%2===0?1260:1261);}
  else id=(dirPreferida??0)%2===0?1260:1261;
  if(prop){const recto=id===1260||(id>=1266&&(id-1266)%2===0);id=recto?1270:1271;if(BLOQUES[b].encendido)id+=2;}
  if(id!==b)setBloque(x,y,z,id,{sinAviso:true});
}
function colocarRiel(x,y,z){
  formaRiel(x,y,z,facingJugador());
  for(let d=0;d<4;d++){const [dx,dz]=DIRF[d];const r=rielEn(x+dx,y,z+dz);
    if(r){const [ry,rb]=r;const cn=conexionesRiel(rb);const [ddx,ddz]=DIRF[cn[0]],[edx,edz]=DIRF[cn[1]];
      const conectado=(x+dx+ddx===x&&z+dz+ddz===z)||(x+dx+edx===x&&z+dz+edz===z);
      if(!conectado)formaRiel(x+dx,ry,z+dz);}}
}
