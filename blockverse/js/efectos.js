"use strict";
/* =========================================================
   Efectos: rayos y truenos, nieve, pasos, balanceo de la
   cámara, sacudida por daño y partículas del entorno.
   ========================================================= */
let tormenta=false, rayoT=8, destelloRayo=0, sacudida=0, faseCamara=0, pasoT=0, ambienteT=0, cuevaT=30, lluviaSndT=0;
const efectoCam={x:0,y:0,rz:0};

/* ---------- Partículas con los colores reales de la textura ---------- */
const pixelesTile=[];
(function(){const ctx=atlasIconos.getContext('2d');for(let t=0;t<NT;t++){const d=ctx.getImageData((t%ATW)*TS,Math.floor(t/ATW)*TS,TS,TS).data;
  const lista=[];for(let i=0;i<d.length;i+=16)if(d[i+3]>100)lista.push((d[i]<<16)|(d[i+1]<<8)|d[i+2]);pixelesTile[t]=lista.length?lista:[0x888888];}})();
function particulasBloque(x,y,z,tile,n,vel=2.5,vida=.7){
  const lista=pixelesTile[tile]||[0x888888];
  for(let i=0;i<n;i++)emitirParticulas(x,y,z,lista[Math.floor(Math.random()*lista.length)],1,vel,vida);
}

/* ---------- Pasos ---------- */
function grupoSonido(b){
  if(!b)return null;
  if(b===B.cesped||b===B.tierra||b===B.cultivo||b===B.senda||esHojas(b)||b===B.heno)return 'pasoPasto';
  if(b===B.arena||b===B.arenaRoja||b===B.arenaAlmas||b===B.lana||b===B.arcilla)return 'pasoArena';
  if(b===B.grava)return 'pasoGrava';
  if(b===B.nieve||b===B.bloqueNieve||b===B.capaNieve||b===B.cespedNevado)return 'pasoNieve';
  const def=BLOQUES[b];
  if(def.herr==='hacha')return 'pasoMadera';
  return 'pasoPiedra';
}
function pasoSonido(b,vol=.8){const g=grupoSonido(b);if(g)sonar(g,null,vol);}
function actualizarPasos(dt){
  const j=jugador, vh=Math.hypot(j.vel.x,j.vel.z);
  if(j.suelo&&vh>.8&&!j.vuela&&estado==='jugando'){
    faseCamara+=vh*dt*1.9;
    pasoT-=dt*vh/(j.corriendo?5.6:4.3);
    if(pasoT<=0){pasoT=.42;
      let b=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y-.05),Math.floor(j.pos.z));
      if(!b)b=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y-.6),Math.floor(j.pos.z));
      if(!j.agachado)pasoSonido(b,j.corriendo?.9:.65);}
  }else faseCamara+=(Math.round(faseCamara/Math.PI)*Math.PI-faseCamara)*Math.min(1,dt*8);
  const amp=j.suelo&&!j.vuela?Math.min(1,vh/4.3):0;
  efectoCam.y=-Math.abs(Math.sin(faseCamara))*.07*amp;
  efectoCam.x=Math.cos(faseCamara)*.035*amp;
  sacudida=Math.max(0,sacudida-dt*3);
  efectoCam.rz=Math.cos(faseCamara)*.006*amp+Math.sin(sacudida*20)*sacudida*.12;
}

/* ---------- Clima: rayos, truenos y nieve ---------- */
const matRayo=new THREE.LineBasicMaterial({color:0xe8eeff,transparent:true,opacity:1,fog:false});
let rayoMalla=null, rayoVida=0;
function caerRayo(x,z){
  let y=CY-1; while(y>0&&!getBloque(x,y,z))y--;
  const pts=[];let px=x+.5,pz=z+.5;
  for(let h=OY+128+40;h>y+1;h-=3){pts.push(new THREE.Vector3(px,h,pz));px+=(Math.random()-.5)*2.2;pz+=(Math.random()-.5)*2.2;}
  pts.push(new THREE.Vector3(x+.5,y+1,z+.5));
  if(rayoMalla){escena.remove(rayoMalla);rayoMalla.geometry.dispose();}
  rayoMalla=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),matRayo);rayoMalla.frustumCulled=false;escena.add(rayoMalla);
  rayoVida=.35; destelloRayo=1;
  const d=Math.hypot(x-jugador.pos.x,z-jugador.pos.z);
  sonar('rayo',null,clamp(1-d/120,.2,1));
  setTimeout(()=>sonar('trueno',null,clamp(1-d/160,.25,1)),Math.min(3500,d*9));
  if(supervivencia()||true){
    if(BLOQUES[getBloque(x,y,z)]&&SOLIDO[getBloque(x,y,z)]&&!getBloque(x,y+1,z)&&prob(.6))setBloque(x,y+1,z,B.fuego);
    const p=new THREE.Vector3(x+.5,y+1,z+.5);
    if(jugador.pos.distanceTo(p)<3){danarJugador(5,'rayo',null);encenderJugador(8);}
    for(const m of mobs.slice()){if(m.pos.distanceTo(p)>3)continue;
      if(m.tipo==='cerdo'){const n=crearMob('piglin',m.pos.x,m.pos.y,m.pos.z);quitarMob(m);continue;}
      herirMob(m,5,null,'rayo');m.fuego=8;}
  }
}
function actualizarClimaEfectos(dt){
  if(rayoVida>0){rayoVida-=dt;matRayo.opacity=Math.random()<.5?1:.4;if(rayoVida<=0&&rayoMalla){escena.remove(rayoMalla);rayoMalla.geometry.dispose();rayoMalla=null;}}
  destelloRayo=Math.max(0,destelloRayo-dt*2.5);
  if(dim!==DIMS.superficie||!lloviendo){return;}
  if(tormenta){rayoT-=dt;if(rayoT<=0){rayoT=6+Math.random()*18;
    const a=Math.random()*Math.PI*2,d=10+Math.random()*80;caerRayo(Math.floor(jugador.pos.x+Math.cos(a)*d),Math.floor(jugador.pos.z+Math.sin(a)*d));}}
  lluviaSndT-=dt;
  if(lluviaSndT<=0&&lluvia.visible){lluviaSndT=.45;sonar('lluvia',null,tormenta?1.4:1);}
}
function biomaEnJugador(){
  if(dim!==DIMS.superficie)return -1;
  const x=Math.floor(jugador.pos.x),z=Math.floor(jugador.pos.z),ch=chunkSiExiste(Math.floor(x/CX),Math.floor(z/CZ));
  return ch&&ch.bioma?ch.bioma[(z-ch.cz*CZ)*CX+x-ch.cx*CX]:2;
}

/* ---------- Partículas del entorno ---------- */
function actualizarAmbiente(dt){
  ambienteT-=dt;
  const j=jugador.pos;
  if(ambienteT<=0){
    ambienteT=.12;
    // Muestreo aleatorio de bloques cercanos
    for(let k=0;k<70;k++){
      const x=Math.floor(j.x+(Math.random()-.5)*20),y=Math.floor(j.y+(Math.random()-.5)*12),z=Math.floor(j.z+(Math.random()-.5)*20);
      const b=getBloqueSiCargado(x,y,z); if(b<=0)continue;
      if(b===B.antorcha||(b>=165&&b<=168)||b===B.fuego){
        let px=x+.5,pz=z+.5,py=y+.7;
        if(b>=165){const [dx,dz]=DIRF[b-165];px+=dx*.12;pz+=dz*.12;py=y+.95;}
        emitirParticulas(px,py,pz,0xffc040,1,.15,.35,-1.5);
        if(Math.random()<.5)emitirParticulas(px,py+.15,pz,0x505050,1,.12,.9,-1.2);
      }else if(b===B.lava&&!getBloque(x,y+1,z)&&Math.random()<.1){
        emitirParticulas(x+Math.random(),y+.95,z+Math.random(),0xff9020,3,2,.9,9);
        if(Math.random()<.3)sonar('lava',{x,y,z},.25);
      }else if(b===B.portalNether){
        emitirParticulas(x+Math.random(),y+Math.random(),z+Math.random(),0x9a40e0,2,.8,1.1,-.6);
      }else if(b===B.portalEnd){
        emitirParticulas(x+Math.random(),y+1,z+Math.random(),0xffffff,1,.2,.8,-1);
      }else if(b===B.generador){
        emitirParticulas(x+Math.random(),y+Math.random(),z+Math.random(),0x444444,1,.3,.8,-1);
      }else if((b===B.hojas||b===B.hojasJungla)&&lloviendo&&dim===DIMS.superficie&&!getBloque(x,y-1,z)&&Math.random()<.2){
        emitirParticulas(x+Math.random(),y-.05,z+Math.random(),0x5080e0,1,.05,.7,12);
      }
    }
    if(jugador.ojosAgua&&Math.random()<.6){emitirParticulas(j.x+(Math.random()-.5),j.y+1.3,j.z+(Math.random()-.5),0xbfe0ff,1,.3,1.2,-3);if(Math.random()<.1)sonar('burbuja',null,.6);}
    if(dim===DIMS.nether)for(let k=0;k<4;k++)emitirParticulas(j.x+(Math.random()-.5)*16,j.y+(Math.random()-.2)*8,j.z+(Math.random()-.5)*16,Math.random()<.5?0x6a5a5a:0x9a3020,1,.2,2.5,.3);
    if(dim===DIMS.end&&Math.random()<.3)emitirParticulas(j.x+(Math.random()-.5)*16,j.y+Math.random()*6,j.z+(Math.random()-.5)*16,0xb080f0,1,.1,2,-.2);
  }
  // Sonidos de cueva cuando estás a oscuras bajo tierra
  cuevaT-=dt;
  if(cuevaT<=0){cuevaT=40+Math.random()*80;
    const l=luzEn(Math.floor(j.x),Math.floor(j.y+1),Math.floor(j.z));
    if(dim===DIMS.superficie&&(l>>4)<4&&(l&15)<4&&j.y<NIVEL_MAR-10)sonar('cueva');}
}
// Salpicadura al entrar en el agua
let estabaEnAgua=false;
function comprobarSalpicadura(){
  const j=jugador;
  if(j.enAgua&&!estabaEnAgua&&j.vel.y<-4){sonar('chapoteo');for(let k=0;k<14;k++)emitirParticulas(j.pos.x+(Math.random()-.5),j.pos.y+.9,j.pos.z+(Math.random()-.5),0xdfeeff,1,3,.6,12);}
  estabaEnAgua=j.enAgua;
}
