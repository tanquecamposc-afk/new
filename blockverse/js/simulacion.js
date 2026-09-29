"use strict";
/* =========================================================
   Simulación del mundo: líquidos, gravedad, soporte de
   plantas, ticks aleatorios, fuego y explosiones.
   ========================================================= */
let tiempoJuego=0;
const colaAgua=[], colaLava=[], enCola=new Set();
function retrasoLiquido(agua){return agua?.25:(dim===DIMS.nether?.5:1.5);}
function programarLiquido(x,y,z,agua){
  const k=clavePos(x,y,z); if(enCola.has(k))return; enCola.add(k);
  (agua?colaAgua:colaLava).push({x,y,z,k,t:tiempoJuego+retrasoLiquido(agua)});
}
function limpiarSimulacion(){colaAgua.length=0;colaLava.length=0;enCola.clear();colaHojas.length=0;}
function procesarLiquidos(){
  let n=0;
  for(const cola of [colaAgua,colaLava]){
    let i=0;
    while(i<cola.length&&cola[i].t<=tiempoJuego&&n<400){const e=cola[i++];enCola.delete(e.k);n++;tickLiquido(e.x,e.y,e.z);}
    if(i)cola.splice(0,i);
  }
}
function puedeFluir(n,agua){return n===0||(REEMPL[n]&&!esLiquido(n))||(esLiquido(n)&&esAgua(n)!==agua);}
function fluirA(x,y,z,id,agua,vertical){
  const prev=getBloque(x,y,z);
  if(esLiquido(prev)&&esAgua(prev)!==agua){
    if(agua)setBloque(x,y,z,nivelLiquido(prev)===0?B.obsidiana:B.roca);
    else setBloque(x,y,z,vertical?B.piedra:B.roca);
    sonar('lava',{x,y,z},.6); emitirParticulas(x+.5,y+.8,z+.5,0xcccccc,6,1.5,.8,-2);
    return;
  }
  if(prev&&REEMPL[prev]&&!esLiquido(prev))soltarDropsBloque(prev,x,y,z,null);
  setBloque(x,y,z,id);
}
function tickLiquido(x,y,z){
  const id=getBloqueSiCargado(x,y,z); if(id<0||!esLiquido(id))return;
  const agua=esAgua(id), base=agua?B.agua:B.lava, nivel=nivelLiquido(id);
  const paso=agua||dim===DIMS.nether?1:2;
  if(!agua){
    for(const [dx,dy,dz] of DIR6){if(dy<0)continue;
      if(esAgua(getBloque(x+dx,y+dy,z+dz))){setBloque(x,y,z,nivel===0?B.obsidiana:B.roca);sonar('lava',{x,y,z},.6);return;}}
  }
  if(nivel>0){
    const arriba=getBloque(x,y+1,z);
    let esperado;
    if(esLiquido(arriba)&&esAgua(arriba)===agua)esperado=1;
    else{
      let min=99,fuentes=0;
      for(const [dx,,dz] of DIR6.slice(0,4)){const n=getBloque(x+dx,y,z+dz);
        if(esLiquido(n)&&esAgua(n)===agua){const ln=nivelLiquido(n);if(ln===0)fuentes++;if(ln<min)min=ln;}}
      esperado=min===99?99:min+paso;
      if(agua&&fuentes>=2){const ab=getBloque(x,y-1,z);if(SOLIDO[ab]||ab===B.agua)esperado=0;}
    }
    if(esperado>7){setBloque(x,y,z,0);return;}
    if(esperado!==nivel){setBloque(x,y,z,esperado===0?base:base+esperado);return;}
  }
  if(y>0){
    const abajo=getBloque(x,y-1,z);
    if(puedeFluir(abajo,agua)){fluirA(x,y-1,z,base+1,agua,true);return;}
    if(esLiquido(abajo)&&esAgua(abajo)===agua){if(nivelLiquido(abajo)>1)setBloque(x,y-1,z,base+1);return;}
  }
  const sig=nivel+paso; if(sig>7)return;
  for(const [dx,,dz] of DIR6.slice(0,4)){
    const nx=x+dx,nz=z+dz,n=getBloque(nx,y,nz);
    if(puedeFluir(n,agua))fluirA(nx,y,nz,base+sig,agua,false);
    else if(esLiquido(n)&&esAgua(n)===agua&&nivelLiquido(n)>sig)setBloque(nx,y,nz,base+sig);
  }
}

/* ---------- Cambios de bloque: avisar a los vecinos ---------- */
const NECESITA_SOPORTE={};
[B.hierbaAlta,B.florAmarilla,B.florRoja,B.brote].forEach(b=>NECESITA_SOPORTE[b]=s=>s===B.cesped||s===B.tierra||s===B.cultivo||s===B.cespedNevado);
for(let e=0;e<8;e++)NECESITA_SOPORTE[B.trigo0+e]=s=>s===B.cultivo;
NECESITA_SOPORTE[B.cana]=s=>s===B.cana||s===B.cesped||s===B.tierra||s===B.arena;
NECESITA_SOPORTE[B.cactus]=s=>s===B.cactus||s===B.arena;
NECESITA_SOPORTE[B.antorcha]=s=>SOLIDO[s]&&FORMA[s]===0;
NECESITA_SOPORTE[B.cama]=s=>s!==0&&!esLiquido(s);
const TIERRAS=s=>s===B.cesped||s===B.tierra||s===B.cultivo||s===B.cespedNevado||s===B.senda||s===B.barro||s===B.musgoPalido;
[B.broteRobleOscuro,B.girasol,B.broteAbedul,B.broteAbeto,B.broteJungla,B.broteAcacia,B.helecho,B.aciano,B.orquidea,B.margarita,B.broteCerezo,B.propagulo,B.petalos,B.brotePalido,B.floresOjo,B.floresOjoOn,B.hojarasca,B.floresSilvestres,B.arbustoLuciernagas,B.arbusto,B.alfombraMusgo].forEach(b=>NECESITA_SOPORTE[b]=TIERRAS);
NECESITA_SOPORTE[B.vetaSculk]=s=>SOLIDO[s]&&OPACO[s];
[B.champinonRojo,B.champinonMarron].forEach(b=>NECESITA_SOPORTE[b]=s=>SOLIDO[s]&&OPACO[s]);
NECESITA_SOPORTE[B.arbustoSeco]=s=>s===B.arena||s===B.arenaRoja||s===B.tierra||(s>=B.terracota&&s<=B.terracota5);
NECESITA_SOPORTE[B.cactus]=s=>s===B.cactus||s===B.arena||s===B.arenaRoja;
NECESITA_SOPORTE[B.cana]=s=>s===B.cana||s===B.cesped||s===B.tierra||s===B.arena||s===B.arenaRoja;
NECESITA_SOPORTE[B.nenufar]=s=>s===B.agua||s===B.hielo;
for(let e=0;e<4;e++)NECESITA_SOPORTE[B.verruga0+e]=s=>s===B.arenaAlmas;
const SUELO_NETHER=s=>s===B.nilioCarmesi||s===B.nilioDistorsionado||s===B.netherrack||s===B.sueloAlmas||s===B.arenaAlmas||TIERRAS(s);
[B.raicesCarmesi,B.raicesDist,B.hongoCarmesi,B.hongoDist].forEach(b=>NECESITA_SOPORTE[b]=SUELO_NETHER);
NECESITA_SOPORTE[B.fuegoAlmas]=s=>s===B.arenaAlmas||s===B.sueloAlmas;
[...Array(16).keys()].forEach(q=>NECESITA_SOPORTE[B.cable0+q]=s=>SOLIDO[s]&&OPACO[s]);
[B.antorchaR,B.antorchaROff,B.palanca,B.palancaOn,B.boton,B.botonOn,B.placa,B.placaOn].forEach(b=>NECESITA_SOPORTE[b]=s=>SOLIDO[s]&&(OPACO[s]||FORMA[s]===6));
for(let i=1260;i<=1273;i++)NECESITA_SOPORTE[i]=s=>SOLIDO[s]&&OPACO[s];
NECESITA_SOPORTE[B.capaNieve]=s=>SOLIDO[s]&&(OPACO[s]||esHojas(s));
function notificarCambio(x,y,z,anterior,nuevo){
  for(let k=-1;k<6;k++){
    const [dx,dy,dz]=k<0?[0,0,0]:DIR6[k];
    const px=x+dx,py=y+dy,pz=z+dz;
    if(py<0||py>=CY)continue;
    const id=getBloqueSiCargado(px,py,pz); if(id<=0)continue;
    if(esLiquido(id))programarLiquido(px,py,pz,esAgua(id));
    if(BLOQUES[id].gravedad)comprobarCaida(px,py,pz,id);
    const sop=NECESITA_SOPORTE[id];
    if(sop&&!(k===-1)&&dy>=0){const s=getBloque(px,py-1,pz);if(!sop(s)){romperBloqueNatural(px,py,pz);continue;}}
    const def=BLOQUES[id];
    if(def.cara!==undefined&&k!==-1){const [dx2,dz2]=DIRF[def.cara];const pared=getBloque(px+dx2,py,pz+dz2);if(!SOLIDO[pared]||FORMA[pared]!==0){romperBloqueNatural(px,py,pz);continue;}}
    if(def.puerta&&k!==-1){const pu=def.puerta,otro=getBloque(px,py+(pu.m?-1:1),pz);
      const bo=BLOQUES[otro];
      if(!bo||!bo.puerta||bo.puerta.m===pu.m)romperBloqueNatural(px,py,pz);
      else if(!pu.m&&!SOLIDO[getBloque(px,py-1,pz)])romperBloqueNatural(px,py,pz);}
    if(id===B.fuego&&k>=0&&dy===1&&!SOLIDO[getBloque(px,py-1,pz)])setBloque(px,py,pz,0);
    if(k>=0&&(def.piston||def.cabezaPiston))comprobarPiston(px,py,pz);
  }
  avisarRedstone(x,y,z,anterior,nuevo);
  if((nuevo===B.sensorSculk&&anterior!==B.sensorSculkOn)||nuevo===B.chillador)registrarSculk(x,y,z);
  if(anterior!==B.sensorSculk&&anterior!==B.sensorSculkOn&&!esLiquido(anterior)&&!esLiquido(nuevo))registrarVibracion(x+.5,y+.5,z+.5,'bloque');
  if((anterior===B.obsidiana||anterior===B.portalNether)&&nuevo!==B.portalNether)romperPortal(x,y,z);
  if(esTronco(anterior)&&!nuevo)programarHojas(x,y,z);
}
function romperBloqueNatural(x,y,z){
  const id=getBloque(x,y,z);
  soltarDropsBloque(id,x,y,z,null);
  setBloque(x,y,z,0);
}
function soltarDropsBloque(id,x,y,z,herr){
  const def=BLOQUES[id]; if(!def)return;
  let s=def.suelta;
  const ctx={fortuna:nivelEnc(herr,'fortuna')};
  let lista;
  if(nivelEnc(herr,'toqueSeda')&&ITEMS[id]&&s!==undefined&&id!==B.generador)lista=[[id,1]];
  else if(typeof s==='function')lista=s(ctx);
  else if(s===undefined)lista=ITEMS[id]?[[id,1]]:[];
  else lista=s?[[s,1]]:[];
  for(const [i,n] of lista)if(n>0&&ITEMS[i])soltarItem(crearPila(i,n),x+.5,y+.3,z+.5,true);
  return lista;
}
function comprobarCaida(x,y,z,id){
  const ab=getBloque(x,y-1,z);
  if(y>0&&(ab===0||(REEMPL[ab]&&!SOLIDO[ab]))){
    setBloque(x,y,z,0);
    crearBloqueCayendo(id,x,y,z);
  }
}
function romperPortal(x,y,z){
  const pila=[[x,y,z]],vistos=new Set();
  let n=0;
  for(const [dx,dy,dz] of DIR6)pila.push([x+dx,y+dy,z+dz]);
  while(pila.length&&n<500){
    const [px,py,pz]=pila.pop(),k=clavePos(px,py,pz);
    if(vistos.has(k))continue; vistos.add(k);
    if(getBloqueSiCargado(px,py,pz)!==B.portalNether)continue;
    n++; setBloque(px,py,pz,0,{sinAviso:true});
    for(const [dx,dy,dz] of DIR6)pila.push([px+dx,py+dy,pz+dz]);
  }
}
/* ---------- Hojas que se secan al talar ---------- */
const colaHojas=[];
function programarHojas(x,y,z){
  for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++)for(let dz=-4;dz<=4;dz++)
    if(esHojas(getBloqueSiCargado(x+dx,y+dy,z+dz)))colaHojas.push({x:x+dx,y:y+dy,z:z+dz,t:tiempoJuego+1+Math.random()*8});
}
function procesarHojas(){
  for(let i=colaHojas.length-1;i>=0;i--){
    const h=colaHojas[i]; if(h.t>tiempoJuego)continue;
    colaHojas.splice(i,1);
    if(!esHojas(getBloqueSiCargado(h.x,h.y,h.z)))continue;
    let tronco=false;
    for(let dx=-4;dx<=4&&!tronco;dx++)for(let dy=-4;dy<=4&&!tronco;dy++)for(let dz=-4;dz<=4;dz++)
      if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)<=5&&esTronco(getBloqueSiCargado(h.x+dx,h.y+dy,h.z+dz))){tronco=true;break;}
    if(!tronco)romperBloqueNatural(h.x,h.y,h.z);
  }
}

/* ---------- Ticks aleatorios ---------- */
let acumTick=0;
function ticksAleatorios(dt,px,pz){
  acumTick+=dt;
  while(acumTick>=.05){
    acumTick-=.05;
    const pcx=Math.floor(px/CX),pcz=Math.floor(pz/CZ);
    for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++){
      const ch=chunkSiExiste(pcx+a,pcz+b); if(!ch||!ch.malla)continue;
      const secciones=Math.ceil((ch.ymax-ch.ymin+1)/16);
      for(let s=0;s<secciones;s++){
        const lx=Math.floor(Math.random()*16),lz=Math.floor(Math.random()*16),y=ch.ymin+s*16+Math.floor(Math.random()*16);
        if(y>=CY)continue;
        const id=ch.datos[idx(lx,y,lz)]; if(!id)continue;
        if(id===B.floresOjo||id===B.floresOjoOn){const noche=sol<-.05;if(noche!==(id===B.floresOjoOn))setBloque(ch.cx*CX+lx,y,ch.cz*CZ+lz,noche?B.floresOjoOn:B.floresOjo);continue;}
        tickBloque(ch.cx*CX+lx,y,ch.cz*CZ+lz,id);
      }
    }
  }
}
function luzCieloBloque(x,y,z){const l=luzEn(x,y,z);return Math.max((l>>4)*(factorCielo>.5?1:0),l&15);}
function tickBloque(x,y,z,id){
  if(id>=B.trigo0&&id<B.trigo0+7){
    const suelo=getBloque(x,y-1,z);
    if(luzCieloBloque(x,y,z)>=9&&prob(suelo===B.cultivo&&aguaCerca(x,y-1,z)?.2:.1))setBloque(x,y,z,id+1);
  }else if(id>=B.verruga0&&id<B.verruga0+3){
    if(prob(.08))setBloque(x,y,z,id+1);
  }else if(esBrote(id)){
    if(luzCieloBloque(x,y,z)>=9&&prob(.12))crecerArbol(x,y,z);
  }else if(id===B.cana||id===B.cactus){
    if(getBloque(x,y+1,z)===0&&prob(.1)){let h=1;while(getBloque(x,y-h,z)===id)h++;if(h<3)setBloque(x,y+1,z,id);}
  }else if(id===B.tierra){
    if(!OPACO[getBloque(x,y+1,z)]&&(luzEn(x,y+1,z)>>4)>=4){
      for(let k=0;k<4;k++){const nx=x+azar(-1,1),ny=y+azar(-2,1),nz=z+azar(-1,1);if(getBloque(nx,ny,nz)===B.cesped){setBloque(x,y,z,B.cesped);break;}}
    }
  }else if(id===B.cesped){
    if(OPACO[getBloque(x,y+1,z)])setBloque(x,y,z,B.tierra);
  }else if(id===B.fuego){
    const eterno=getBloque(x,y-1,z)===B.netherrack;
    if(!eterno&&prob(.35)){setBloque(x,y,z,0);return;}
    for(const [dx,dy,dz] of DIR6){
      const nx=x+dx,ny=y+dy,nz=z+dz,n=getBloque(nx,ny,nz);
      if(BLOQUES[n]&&BLOQUES[n].inflamable&&prob(.12)){
        if(n===B.tnt){setBloque(nx,ny,nz,0);activarTNT(nx,ny,nz,.5);}
        else setBloque(nx,ny,nz,prob(.5)?B.fuego:0);
      }
    }
  }else if(id===B.cultivo){
    if(OPACO[getBloque(x,y+1,z)])setBloque(x,y,z,B.tierra);
  }else if(id===B.hielo){
    if((luzEn(x,y,z)&15)>11)setBloque(x,y,z,B.agua);
  }
}
function aguaCerca(x,y,z){
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)if(esAgua(getBloqueSiCargado(x+dx,y,z+dz)))return true;
  return false;
}
const TIPO_BROTE={1466:'robleOscuro',88:'roble',102:'abedul',103:'abeto',104:'jungla',105:'acacia',1297:'cerezo',1304:'mangle',1339:'palido'};
const esBrote=id=>TIPO_BROTE[id]!==undefined;
function crecerArbol(x,y,z){
  const id=getBloque(x,y,z), tipo=TIPO_BROTE[id]||'roble';
  for(let k=1;k<=5;k++)if(SOLIDO[getBloque(x,y+k,z)])return;
  const r=mulberry32(Math.floor(Math.random()*1e9));
  setBloque(x,y,z,0,{sinAviso:true});
  const poner=(px,py,pz,b,soloAire)=>{if(py<0||py>=CY)return;const a=getBloque(px,py,pz);
    if(soloAire&&a&&!REEMPL[a])return;if(!soloAire&&a&&SOLIDO[a]&&!esHojas(a)&&a!==B.tierra&&a!==B.cesped)return;setBloque(px,py,pz,b,{sinAviso:true});};
  ponerArbolTipo(poner,tipo==='roble'&&r()<.1?'robleGrande':tipo,x,y-1,z,r);
  if(getBloque(x,y-1,z)===B.cesped)setBloque(x,y-1,z,B.tierra,{sinAviso:true});
}

/* ---------- Explosiones ---------- */
const RAYOS_EXP=(()=>{const r=[];for(let i=0;i<16;i++)for(let j=0;j<16;j++)for(let k=0;k<16;k++){
  if(i&&j&&k&&i<15&&j<15&&k<15)continue;const x=i/15*2-1,y=j/15*2-1,z=k/15*2-1,l=Math.hypot(x,y,z);r.push([x/l,y/l,z/l]);}return r;})();
function explosion(x,y,z,potencia,opc={}){
  sonar('explosion',{x,y,z});
  emitirParticulas(x,y,z,0x9a9a9a,26,5,1.1,-1);
  emitirParticulas(x,y,z,0xffd070,10,6,.4,0);
  const romper=new Map();
  if(!opc.sinBloques)for(const [dx,dy,dz] of RAYOS_EXP){
    let I=potencia*(.7+Math.random()*.6),px=x,py=y,pz=z;
    while(I>0){
      const bx=Math.floor(px),by=Math.floor(py),bz=Math.floor(pz);
      const id=getBloqueSiCargado(bx,by,bz); if(id<0)break;
      if(id){I-=(BLOQUES[id].resistencia+.3)*.3;if(I>0&&!esLiquido(id))romper.set(clavePos(bx,by,bz),[bx,by,bz,id]);}
      px+=dx*.3;py+=dy*.3;pz+=dz*.3;I-=.225;
    }
  }
  for(const [bx,by,bz,id] of romper.values()){
    if(getBloqueSiCargado(bx,by,bz)!==id)continue;
    if(id===B.tnt){setBloque(bx,by,bz,0);activarTNT(bx,by,bz,.5+Math.random());continue;}
    if(Math.random()<1/potencia)soltarDropsBloque(id,bx,by,bz,null);
    setBloque(bx,by,bz,0);
  }
  if(opc.fuego)for(const [bx,by,bz] of romper.values())
    if(Math.random()<.33&&!getBloque(bx,by,bz)&&SOLIDO[getBloque(bx,by-1,bz)])setBloque(bx,by,bz,B.fuego);
  // Daño a entidades
  const alcance=potencia*2;
  const danarEnt=(pos,alto,fn)=>{
    const cx=pos.x,cy=pos.y+alto/2,cz=pos.z,d=Math.hypot(cx-x,cy-y,cz-z);
    if(d>alcance)return;
    const imp=1-d/alcance, dano=Math.floor(((imp*imp+imp)/2)*7*alcance+1);
    const l=d||1; fn(dano,{x:(cx-x)/l*imp,y:(cy-y)/l*imp,z:(cz-z)/l*imp});
  };
  if(opc.fuente!=='jugador'||true)danarEnt(jugador.pos,jugador.alto,(dano,dir)=>{danarJugador(dano,'explosion',null);
    jugador.vel.x+=dir.x*10;jugador.vel.y+=dir.y*8+2;jugador.vel.z+=dir.z*10;});
  for(const m of mobs.slice())if(m!==opc.fuente)danarEnt(m.pos,m.alto,(dano,dir)=>{herirMob(m,dano,{x:dir.x,z:dir.z},'explosion');
    m.vel.y+=dir.y*6+2;});
  for(const e of entidades)if(e.tipo==='cristal'&&!e.muerta)danarEnt(e.pos,2,()=>romperCristal(e));
  for(const e of entidades)if(e.tipo==='item'&&!e.muerta&&e.pos.distanceTo(new THREE.Vector3(x,y,z))<potencia)e.muerta=true;
}
