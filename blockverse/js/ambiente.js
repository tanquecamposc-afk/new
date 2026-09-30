"use strict";
/* =========================================================
   Más vida en pantalla: llamas y humo en antorchas y fuego,
   chispas de lava, remolinos del portal del Nether, halos de
   luz cálida alrededor de las fuentes de luz de noche y en
   cuevas, salpicaduras de lluvia, chunks que suben al
   cargarse; y animaciones: agacharse suave, la cámara se
   hunde al caer desde alto, la vista cae de lado al morir,
   las ovejas comen hierba y la barra salta al cambiar de
   objeto.
   ========================================================= */

/* ---------- Cámara: agacharse suave, caída y muerte ---------- */
let ojoSuave=1.62, sueloPrevio=true, velPrevia=0, caidaT=1, caidaAmp=0, muerteT=0;
function alturaOjos(agachado,dt){
  const j=jugador;
  ojoSuave+=((agachado?1.32:1.62)-ojoSuave)*Math.min(1,dt*14);
  if(j.suelo&&!sueloPrevio&&velPrevia<-9&&!j.vuela&&!j.enAgua&&window.MOV_CAMARA!==false){caidaT=0;caidaAmp=Math.min(.3,.06+(-velPrevia-9)*.012);}
  sueloPrevio=j.suelo; velPrevia=j.suelo?0:j.vel.y;
  let y=ojoSuave;
  if(caidaT<1){caidaT=Math.min(1,caidaT+dt/.38);y-=Math.sin(caidaT*Math.PI)*caidaAmp*(1-caidaT*.3);}
  if(estado==='muerto'){muerteT=Math.min(1,muerteT+dt*2.2);const e=1-Math.pow(1-muerteT,3);efectoCam.rz=e*1.25;y+=(0.25-y)*e;}
  else muerteT=0;
  return y;
}

/* ---------- Fuentes de luz y partículas de ambiente ---------- */
const matHalo=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,220,150,1)');g.addColorStop(.25,'rgba(255,170,70,.55)');g.addColorStop(1,'rgba(255,120,30,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);
  return new THREE.SpriteMaterial({map:t,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:true});})();
const halos=[];
for(let i=0;i<48;i++){const s=new THREE.Sprite(matHalo.clone());s.visible=false;s.renderOrder=5;escena.add(s);halos.push(s);}
const TIPO_FUENTE={};
{
  for(const [id,d] of BLOQUES.entries()){
    if(!d)continue;
    if(d.forma==='antorcha'&&d.luz)TIPO_FUENTE[id]=d.redstone?'antorchaR':'antorcha';
  }
  TIPO_FUENTE[B.fuego]='fuego'; TIPO_FUENTE[B.fuegoAlmas]='fuegoAlmas';
  if(B.farol)TIPO_FUENTE[B.farol]='farol'; if(B.farolAlmas)TIPO_FUENTE[B.farolAlmas]='farolAlmas';
  TIPO_FUENTE[B.linternaCalabaza]='calabaza'; TIPO_FUENTE[B.portalNether]='portal';
  for(let id=0;id<BLOQUES.length;id++)if(BLOQUES[id]&&esLava(id))TIPO_FUENTE[id]='lava';
}
const COLOR_HALO={antorcha:[1,.75,.45],antorchaR:[1,.25,.15],fuego:[1,.6,.3],fuegoAlmas:[.35,.8,1],farol:[1,.8,.5],farolAlmas:[.4,.85,1],calabaza:[1,.7,.35]};
let fuentes=[], escanearFuentesT=0;
function puntoLlama(x,y,z,b){
  const d=BLOQUES[b];
  if(d.forma==='antorcha'){
    if(d.cara!==undefined){const [dx,dz]=DIRF[d.cara];return [x+.5+dx*.42-dx*.625*.45,y+.625+.24,z+.5+dz*.42-dz*.625*.45];}
    return [x+.5,y+.7,z+.5];
  }
  if(d.cajas){const c=d.cajas[0];return [x+(c[0]+c[3])/2,y+c[4]*.6,z+(c[2]+c[5])/2];}
  return [x+.5,y+.5,z+.5];
}
function escanearFuentes(){
  const j=jugador.pos, px=Math.floor(j.x), py=Math.floor(j.y), pz=Math.floor(j.z), res=[];
  for(let x=px-12;x<=px+12;x++)for(let z=pz-12;z<=pz+12;z++)for(let y=py-8;y<=py+8;y++){
    const b=getBloqueSiCargado(x,y,z); if(b<=0)continue;
    const t=TIPO_FUENTE[b]; if(!t)continue;
    if(t==='lava'&&(nivelLiquido(b)!==0||getBloque(x,y+1,z)))continue;   // solo lava quieta con aire encima
    if(t==='portal'&&Math.random()<.6)continue;
    const [fx,fy,fz]=puntoLlama(x,y,z,b);
    res.push({t,x,y,z,fx,fy,fz,d:(fx-j.x)**2+(fy-j.y-1.6)**2+(fz-j.z)**2,fase:Math.random()*6});
  }
  res.sort((a,b)=>a.d-b.d);
  fuentes=res.slice(0,90);
}
function actualizarFuentes(dt){
  escanearFuentesT-=dt; if(escanearFuentesT<=0){escanearFuentesT=.6;escanearFuentes();}
  const part=estado==='jugando'&&(OPC.particulas>0);
  const dia=Math.max(0,Math.min(1,(sol+.1)*2.2));
  let h=0;
  for(const f of fuentes){
    const t=f.t;
    if(part&&f.d<400){
      if(t==='antorcha'&&Math.random()<dt*7)emitirParticulas(f.fx,f.fy,f.fz,Math.random()<.5?0xffc040:0xff8a20,1,.04,.35,-1.2);
      if(t==='antorcha'&&Math.random()<dt*1.6)emitirParticulas(f.fx,f.fy+.1,f.fz,0x404040,1,.12,1.3,-1.6);
      if(t==='antorchaR'&&Math.random()<dt*3)emitirParticulas(f.fx,f.fy,f.fz,0xff2a10,1,.08,.6,-.5);
      if((t==='fuego'||t==='fuegoAlmas')&&Math.random()<dt*10)
        emitirParticulas(f.x+Math.random(),f.y+.2+Math.random()*.6,f.z+Math.random(),t==='fuego'?(Math.random()<.5?0xffb040:0xff6010):0x40c8ff,1,.1,.4,-2);
      if((t==='fuego'||t==='fuegoAlmas')&&Math.random()<dt*3)emitirParticulas(f.x+Math.random(),f.y+.9,f.z+Math.random(),0x303030,1,.2,1.6,-1.8);
      if(t==='lava'&&Math.random()<dt*.35){emitirParticulas(f.x+Math.random(),f.y+.95,f.z+Math.random(),0xff9a20,2,2.2,.9,9);sonar('lava',{x:f.x,y:f.y,z:f.z},.25);}
      if(t==='portal'&&Math.random()<dt*4)emitirParticulas(f.x+Math.random(),f.y+Math.random(),f.z+Math.random(),Math.random()<.5?0x9a40e0:0x6020b0,1,.9,1.1,0);
    }
    // Halos de luz: más fuertes de noche o bajo tierra
    const col=COLOR_HALO[t];
    if(col&&h<halos.length&&f.d<900){
      let cielo=15; try{cielo=luzEn(f.x,f.y,f.z)>>4;}catch(e){}
      const oscuridad=dim===DIMS.superficie?1-(cielo/15)*dia:1;
      if(oscuridad>.15){
        const s=halos[h++], k=Math.min(1,oscuridad)*(.5+.05*Math.sin(tiempoJuego*9+f.fase)+.04*Math.sin(tiempoJuego*23+f.fase));
        s.visible=true; s.position.set(f.fx,f.fy,f.fz);
        const tam=(t==='fuego'||t==='fuegoAlmas'?2.6:t==='calabaza'?2.2:1.7)*(1+.04*Math.sin(tiempoJuego*11+f.fase));
        s.scale.set(tam,tam,tam); s.material.color.setRGB(col[0]*k,col[1]*k,col[2]*k);
        if(t==='calabaza'){s.position.set(f.x+.5,f.y+.5,f.z+.5);}
      }
    }
  }
  for(;h<halos.length;h++)halos[h].visible=false;
}

/* ---------- Salpicaduras de lluvia ---------- */
function salpicadurasLluvia(dt){
  if(!lloviendo||dim!==DIMS.superficie||estado!=='jugando'||OPC.particulas===0)return;
  const j=jugador.pos, n=Math.random()<(dt*45*(tormenta?1.6:1))%1?Math.ceil(dt*45):Math.floor(dt*45);
  for(let k=0;k<n;k++){
    const x=Math.floor(j.x+(Math.random()-.5)*16), z=Math.floor(j.z+(Math.random()-.5)*16);
    if(esBiomaFrio(infoColumna(x,z).bioma))continue;
    let y=Math.floor(j.y)+14, top=-1;
    for(;y>Math.floor(j.y)-10;y--){const b=getBloqueSiCargado(x,y,z);if(b<0)break;if(b&&(SOLIDO[b]||esLiquido(b)||esHojas(b))){top=y;break;}}
    if(top<0)continue;
    const b=getBloque(x,top,z), alto=esLiquido(b)?.9:(BLOQUES[b]&&BLOQUES[b].altura)||1;
    emitirParticulas(x+Math.random(),top+alto+.02,z+Math.random(),esLiquido(b)?0xd8e8ff:0xb8ccf0,esLiquido(b)?1:2,.9,.22,12);
  }
}

/* ---------- Chunks que suben al aparecer ---------- */
const subiendo=[];
const _construirMallaChunkAmb=construirMallaChunk;
construirMallaChunk=function(ch){
  const nuevo=!ch.malla&&!ch.mallaO&&!ch.mallaT;
  _construirMallaChunkAmb(ch);
  if(nuevo&&OPC.animChunks&&estado==='jugando'&&ch.dim===dim)
    for(const k of ['mallaO','mallaT'])if(ch[k]){ch[k].position.y=-14;subiendo.push({m:ch[k],t:0});}
};
function animarChunks(dt){
  for(let i=subiendo.length-1;i>=0;i--){const s=subiendo[i];s.t+=dt/.55;
    const e=s.t>=1?1:1-Math.pow(1-s.t,3); s.m.position.y=-14*(1-e);
    if(s.t>=1||!s.m.parent){s.m.position.y=0;subiendo.splice(i,1);}}
}

/* ---------- Las ovejas comen hierba ---------- */
const _actualizarMobAmb=actualizarMob;
actualizarMob=function(m,dt){
  const oveja=m.tipo==='oveja';
  if(oveja){
    if(m.comeT>0){m.comeT-=dt;m.mover=false;m.t=Math.max(m.t||0,.3);
      if(m.comeT<=0){const x=Math.floor(m.pos.x),y=Math.floor(m.pos.y),z=Math.floor(m.pos.z);
        if(getBloque(x,y,z)===B.hierbaAlta)setBloque(x,y,z,0);
        else if(getBloque(x,y-1,z)===B.cesped)setBloque(x,y-1,z,B.tierra);
        particulasBloque&&particulasBloque(x+.5,y+.05,z+.5,BLOQUES[B.cesped].arriba,6,1,.4);
        if(m.esquilada)m.esquilada=false; if(m.bebe>0)m.bebe=Math.max(0,m.bebe-60);}}
    else if(m.suelo&&!m.mover&&!(m.huir>0)&&!(m.amor>0)&&Math.random()<dt*.025){
      const x=Math.floor(m.pos.x),y=Math.floor(m.pos.y),z=Math.floor(m.pos.z);
      if(getBloque(x,y-1,z)===B.cesped||getBloque(x,y,z)===B.hierbaAlta){m.comeT=2;m.t=2.3;}}
  }
  _actualizarMobAmb(m,dt);
  if(oveja&&m.comeT>0&&m.extra.cabeza){const c=m.extra.cabeza;c.rotation.x=.95+Math.sin(tiempoJuego*18)*.12;c.rotation.y=0;}
};

/* ---------- La barra de objetos salta al cambiar ---------- */
let ranuraPrevia=-1;
function saltoBarra(){
  if(ranura===ranuraPrevia)return; ranuraPrevia=ranura;
  const el=typeof slotsBarra!=='undefined'&&slotsBarra[ranura];
  if(el&&el.animate)el.animate([{transform:'scale(1.16)'},{transform:'scale(1)'}],{duration:170,easing:'ease-out'});
}

/* ---------- Cada fotograma ---------- */
const _actualizarFinalAmb=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalAmb(dt);
  actualizarFuentes(dt);
  salpicadurasLluvia(dt);
  saltoBarra();
};
// Los chunks siguen subiendo aunque el juego esté en pausa o en el menú
(function bucleAmb(){let t=performance.now();const f=a=>{const dt=Math.min(.05,(a-t)/1000);t=a;animarChunks(dt);mano.scale.setScalar(estado==='menu'&&!mundoId?0:1);requestAnimationFrame(f);};requestAnimationFrame(f);})();
