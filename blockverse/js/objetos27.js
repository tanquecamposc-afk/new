"use strict";
/* =========================================================
   Objetos y bloques de la edición 27 con su función:
   tótem de la inmortalidad, catalejo, brújula, reloj, mapa
   en la mano, etiqueta, rienda, bolas de nieve y huevos que
   se lanzan (a veces nace un pollito), gallinas que ponen
   huevos, tocadiscos con discos, campana, compostador,
   llamas en velas y fogatas, y cada objeto en su pestaña
   del creativo.
   ========================================================= */
Object.assign(SND,{
  totem:v=>{[523,659,784,1046,1318].forEach((f,i)=>tonoSnd(f,f*1.02,.35,'triangle',.09*v,i*.07));ruidoSnd(.5,2500,.15*v,'highpass');},
  campana:v=>{tonoSnd(1320,1300,2.2,'sine',.12*v);tonoSnd(2640,2600,1.2,'sine',.05*v);tonoSnd(660,655,2.5,'sine',.06*v);},
  lanzar:v=>ruidoSnd(.12,3000,.12*v,'highpass'),
  compost:v=>ruidoSnd(.15,900,.15*v,'bandpass'),
});

Object.assign(NOMBRE_EFECTO,{absorcion:'Absorción'});Object.assign(COLOR_EFECTO,{absorcion:'#2552a5'});
/* ---------- Tótem de la inmortalidad ---------- */
const elTotem=document.createElement('img');
elTotem.style.cssText='position:fixed;left:50%;top:45%;width:128px;height:128px;margin:-64px 0 0 -64px;image-rendering:pixelated;pointer-events:none;opacity:0;z-index:6;';
document.body.appendChild(elTotem);
const _morirObj=morir;
morir=function(causa){
  const i=[ranura,...Array.from({length:9},(_,k)=>k)].find(k=>inv[k]&&inv[k].id===658);
  if(i!==undefined&&causa!=='vacio'&&supervivencia()){
    inv[i]=null; salud=1; efectos.regeneracion={t:45,n:2}; efectos.absorcion={t:5,n:2,puntos:4}; efectos.resistenciaFuego={t:40,n:1};
    sonar('totem'); actualizarHUD();
    emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0xf0d040,30,4,1.4,-1);
    emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x50d060,30,4,1.4,-1);
    elTotem.src=ICONOS[658];
    elTotem.animate([{opacity:1,transform:'scale(.4) rotate(-20deg)'},{opacity:1,transform:'scale(1.4) rotate(8deg)'},{opacity:0,transform:'scale(2.2) rotate(0)'}],{duration:1400,easing:'ease-out'});
    return;
  }
  return _morirObj(causa);
};

/* ---------- Catalejo ---------- */
const miraCatalejo=document.createElement('div');
miraCatalejo.style.cssText='position:fixed;inset:0;pointer-events:none;opacity:0;transition:opacity .15s;z-index:2;background:radial-gradient(circle at center,transparent 0,transparent 32vmin,#000 33vmin);';
document.body.appendChild(miraCatalejo);
function actualizarCatalejo(){
  const usa=estado==='jugando'&&clicDer&&enManoId()===659;
  window.FOV_ZOOM=usa?12:0; miraCatalejo.style.opacity=usa?1:0; mano.visible=mano.visible&&!usa;
}

/* ---------- Mapa en la mano ---------- */
const elMapa=document.createElement('canvas'); elMapa.width=elMapa.height=128;
elMapa.style.cssText='position:fixed;left:12px;top:12px;width:192px;height:192px;image-rendering:pixelated;pointer-events:none;display:none;z-index:2;border:6px solid #d8c8a0;box-shadow:0 0 0 2px #6a5a3a,0 6px 16px rgba(0,0,0,.5);background:#d8c8a0;';
document.body.appendChild(elMapa);
let mapaT=0;
function colorMapa(b){
  if(!b)return null;
  if(esAgua(b))return [64,100,220]; if(esLava(b))return [220,90,20];
  if(esHojas(b))return [40,110,30]; if(b===B.cesped)return [110,170,60]; if(b===B.arena||b===B.arenisca)return [220,210,160];
  if(b===B.nieve||b===B.bloqueNieve||b===B.capaNieve||b===B.cespedNevado)return [240,240,245]; if(b===B.hielo||b===B.hieloCompacto)return [160,180,250];
  if(esTronco(b)||b===B.tablones)return [130,100,60]; if(b===B.tierra||b===B.senda)return [150,110,70];
  return [120,120,120];
}
function pintarMapa(){
  const g=elMapa.getContext('2d'), img=g.createImageData(128,128), d=img.data;
  const cx=Math.floor(jugador.pos.x/128)*128, cz=Math.floor(jugador.pos.z/128)*128;
  let prevH=null;
  for(let z=0;z<128;z++){prevH=null;for(let x=0;x<128;x++){
    const wx=cx+x, wz=cz+z; let y=Math.min(CY-2,Math.floor(jugador.pos.y)+40), b=0, c=null;
    for(;y>0;y--){b=getBloqueSiCargado(wx,y,wz);if(b<0){b=-1;break;}if(b&&(SOLIDO[b]||esLiquido(b)||esHojas(b)))break;}
    const i=(z*128+x)*4;
    if(b<0){d[i]=216;d[i+1]=200;d[i+2]=160;d[i+3]=255;continue;}
    c=colorMapa(b)||[216,200,160];
    const sombra=prevH===null?1:y>prevH?1.12:y<prevH?.84:1; prevH=y;
    d[i]=c[0]*sombra;d[i+1]=c[1]*sombra;d[i+2]=c[2]*sombra;d[i+3]=255;}}
  g.putImageData(img,0,0);
  const px=jugador.pos.x-cx, pz=jugador.pos.z-cz;
  g.save();g.translate(px,pz);g.rotate(-jugador.yaw+Math.PI);g.fillStyle='#fff';g.strokeStyle='#000';
  g.beginPath();g.moveTo(0,-4);g.lineTo(3,3);g.lineTo(0,1.5);g.lineTo(-3,3);g.closePath();g.fill();g.stroke();g.restore();
}
function actualizarMapaMano(dt){
  const ver=estado==='jugando'&&enManoId()===655&&dim!==DIMS.end;
  elMapa.style.display=ver?'block':'none';
  if(ver){mapaT-=dt;if(mapaT<=0){mapaT=1;pintarMapa();}}else mapaT=0;
}

/* ---------- Etiquetas con nombre ---------- */
function ponerNombre(m,texto){
  m.nombre=texto; if(m.etiqueta){m.grupo.remove(m.etiqueta);m.etiqueta.material.map.dispose();}
  const c=document.createElement('canvas');c.width=256;c.height=48;const g=c.getContext('2d');
  g.font='28px "Pixelify Sans",sans-serif';const w=Math.min(250,g.measureText(texto).width+16);
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect((256-w)/2,6,w,36);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(texto,128,25);
  const t=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));
  s.scale.set(1.6,.3,1);s.position.y=m.alto/(m.grupo.scale.y||1)+.45;s.renderOrder=10;m.grupo.add(s);m.etiqueta=s;
}

/* ---------- Riendas ---------- */
const matRienda=new THREE.LineBasicMaterial({color:0x6a4a28});
function atar(m){
  m.atado=true;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(10*3),3));
  m.lineaRienda=new THREE.Line(g,matRienda);m.lineaRienda.frustumCulled=false;escena.add(m.lineaRienda);
}
function desatar(m,soltar){
  m.atado=false; if(m.lineaRienda){escena.remove(m.lineaRienda);m.lineaRienda.geometry.dispose();m.lineaRienda=null;}
  if(soltar)soltarItem(crearPila(657),m.pos.x,m.pos.y+.5,m.pos.z,true);
}
function actualizarRiendas(){
  const j=jugador.pos;
  for(const m of mobs){if(!m.atado)continue;
    const dx=j.x-m.pos.x,dy=j.y-m.pos.y,dz=j.z-m.pos.z,d=Math.hypot(dx,dy,dz);
    if(d>12||estado==='muerto'){desatar(m,true);continue;}
    if(d>4){m.vel.x+=dx/d*(d-4)*.6;m.vel.z+=dz/d*(d-4)*.6;if(dy>1&&m.suelo)m.vel.y=5;m.yawObj=Math.atan2(dx,dz);}
    const a=new THREE.Vector3(m.pos.x,m.pos.y+m.alto*.7,m.pos.z), b=new THREE.Vector3(j.x,j.y+1.1,j.z), pos=m.lineaRienda.geometry.attributes.position;
    for(let i=0;i<10;i++){const t=i/9;pos.setXYZ(i,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*Math.max(0,.6-d*.05),a.z+(b.z-a.z)*t);}
    pos.needsUpdate=true;
  }
}
const _quitarMobObj=quitarMob;
quitarMob=function(m){if(m&&m.lineaRienda)desatar(m,false);return _quitarMobObj(m);};
const _alMorirObj=alMorirMob;
alMorirMob=function(m){if(m.atado)desatar(m,true);return _alMorirObj(m);};

/* ---------- Proyectiles: bola de nieve y huevo ---------- */
function lanzarProyectilSimple(id){
  const e=lanzarDesdeJugador('perla',22); e.tipo='proyectilSimple'; e.idObjeto=id;
  e.malla.material=matSprite(id); sonar('lanzar'); balancearMano();
}
ACT_ENT.proyectilSimple=(e,dt)=>{
  e.edad+=dt; e.vel.y-=18*dt;
  const c=trazarProyectil(e,dt,.12); e.malla.position.copy(e.pos);
  if(!c&&e.edad<15)return;
  e.muerta=true;
  emitirParticulas(e.pos.x,e.pos.y,e.pos.z,e.idObjeto===666?0xf4f8ff:0xf0e6c8,8,1.8,.5,8);
  if(c&&c.mob){const vl=e.vel.length()||1;herirMob(c.mob,e.idObjeto===666&&c.mob.tipo==='blaze'?3:0,{x:e.vel.x/vl*.4,z:e.vel.z/vl*.4},'jugador',0);}
  if(c&&c.dragon)dragon.herir(0,'jugador');
  if(e.idObjeto===677&&Math.random()<.125){const n=Math.random()<1/32?4:1;for(let k=0;k<n;k++)crearMob('gallina',e.pos.x,e.pos.y+.2,e.pos.z,{bebe:true});}
};

/* ---------- Tocadiscos: melodías de cada disco ---------- */
const tocadiscos=new Map();
const ESCALAS=[[0,3,5,7,10],[0,2,4,7,9],[0,2,3,7,8],[0,4,5,7,11],[0,2,5,7,9],[0,3,5,6,10],[0,2,4,5,9],[0,1,5,7,8]];
function sonarDisco(t){
  if(!tocadiscos.has(t.clave))return;
  const d=Math.hypot(t.x+.5-jugador.pos.x,t.z+.5-jugador.pos.z);
  if(d<48&&actx){
    const r=t.r, esc=ESCALAS[t.disco], base=[196,220,247,262,294,330,349,392][t.disco];
    const nota=esc[Math.floor(r()*esc.length)]+(r()<.3?12:0), f=base*Math.pow(2,nota/12), v=clamp(1-d/48,0,1)*(window.VOLUMEN??1);
    tonoSnd(f,f,.45,t.disco%2?'triangle':'sine',.07*v); if(r()<.5)tonoSnd(f/2,f/2,.6,'sine',.04*v);
    if(r()<.3){const f2=base*Math.pow(2,esc[Math.floor(r()*esc.length)]/12);tonoSnd(f2,f2,.3,'triangle',.04*v,.2);}
    emitirParticulas(t.x+.5,t.y+1.2,t.z+.5,[0x40e040,0xe04040,0x4080ff,0xffd040][Math.floor(r()*4)],1,.4,.8,-1);
  }
  t.pasos++; setTimeout(()=>sonarDisco(t),t.disco%3===0?420:330);
}
function usarTocadiscos(x,y,z,p){
  const k=clavePos(x,y,z), t=tocadiscos.get(k);
  if(t){tocadiscos.delete(k);soltarItem(crearPila(668+t.disco),x+.5,y+1.1,z+.5,true);return true;}
  if(p&&ITEMS[p.id].disco!==undefined){const disco=ITEMS[p.id].disco;consumirEnMano();
    const nt={clave:k,x,y,z,disco,r:mulberry32(disco*999+7),pasos:0};tocadiscos.set(k,nt);
    mostrarMensaje('Suena: '+ITEMS[p.id].nombre.replace(/^Disco de música \((.*)\)$/,'$1'));sonarDisco(nt);return true;}
  return false;
}

/* ---------- Compostador ---------- */
const compost=new Map();
const esCompostable=id=>{const it=ITEMS[id];if(!it)return false;const b=BLOQUES[id];
  return !!(it.comida&&!it.bebida)||id===I.semillas||id===I.trigo||(b&&(b.forma==='cruz'&&!b.luz||esHojas(id)))||id===B.cactus||id===B.calabaza||id===B.sandia;};

/* ---------- Clic derecho ---------- */
function usarDerechoObj(p,id){
  const a=apuntado&&!apuntadoEnt?apuntado:null;
  if(a&&a.b===B.tocadiscos&&!jugador.agachado)return usarTocadiscos(a.x,a.y,a.z,p);
  if(a&&a.b===B.campana){sonar('campana',a);balancearMano();for(const m of mobs)if(m.tipo==='aldeano'&&m.pos.distanceTo(jugador.pos)<32)m.huir=4;return true;}
  if(a&&a.b===B.compostador&&p&&esCompostable(id)){
    const k=clavePos(a.x,a.y,a.z), n=compost.get(k)||0;
    consumirEnMano(); sonar('compost',a); emitirParticulas(a.x+.5,a.y+1,a.z+.5,0x70a030,5,1,.5,4);
    if(Math.random()<.65){if(n+1>=7){compost.delete(k);soltarItem(crearPila(I.harinaHueso),a.x+.5,a.y+1.1,a.z+.5,true);sonar('nivel',a,.4);}else compost.set(k,n+1);}
    return true;}
  const m=apuntadoEnt&&apuntadoEnt.mob;
  if(m&&id===656){const t=window.prompt('Nombre para '+(NOMBRE_MOB[m.tipo]||'la criatura')+':',m.nombre||'');
    if(t&&t.trim()){ponerNombre(m,t.trim().slice(0,24));m.domado=m.domado||false;m.conNombre=true;consumirEnMano();}
    if(estado==='jugando')try{lienzo.requestPointerLock();}catch(e){}
    return true;}
  if(m&&id===657&&!m.atado&&m.def.tipo!=='hostil'){atar(m);consumirEnMano();sonar('poner',m.pos);return true;}
  if(m&&m.atado&&!p){desatar(m,true);return true;}
  if(id===653){const s=spawnMundo||[0,0],dx=s[0]-jugador.pos.x,dz=s[1]-jugador.pos.z,dist=Math.round(Math.hypot(dx,dz));
    const rumbos=['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste'];const ang=(Math.atan2(dx,-dz)+Math.PI*2)%(Math.PI*2);
    mostrarMensaje(dim!==DIMS.superficie?'La aguja gira sin parar…':dist<3?'Estás en el punto de aparición.':`Punto de aparición: ${dist} bloques al ${rumbos[Math.round(ang/(Math.PI/4))%8]}`);return true;}
  if(id===654){mostrarMensaje(dim!==DIMS.superficie?'Las agujas giran sin sentido…':'Son las '+textoHora()+'.');return true;}
  if(id===666||id===677){lanzarProyectilSimple(id);consumirEnMano();cdUso=.25;return true;}
  if(id===659)return true;
  return false;
}
const _usarDerechoCompletoObj=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){if(usarDerechoObj(p,id))return true;return _usarDerechoCompletoObj(p,id,it);};
// Romper el tocadiscos suelta el disco
const _setBloqueObj=setBloque;
setBloque=function(x,y,z,id,opc){
  const k=clavePos(x,y,z);
  if(tocadiscos.has(k)&&id!==B.tocadiscos){const t=tocadiscos.get(k);tocadiscos.delete(k);soltarItem(crearPila(668+t.disco),x+.5,y+.6,z+.5,true);}
  if(compost.has(k)&&id!==B.compostador)compost.delete(k);
  return _setBloqueObj(x,y,z,id,opc);
};

// Las criaturas con nombre o atadas no desaparecen
const _despawnMobsObj=despawnMobs;
despawnMobs=function(){const guard=mobs.filter(m=>m.conNombre||m.atado);guard.forEach(m=>{m._d=m.domado;m.domado=true;});
  try{_despawnMobsObj();}finally{guard.forEach(m=>{m.domado=m._d;delete m._d;});}};

/* ---------- Gallinas que ponen huevos ---------- */
function ponerHuevos(dt){
  for(const m of mobs)if(m.tipo==='gallina'&&!m.bebe){
    if(m.huevoT===undefined)m.huevoT=300+Math.random()*300;
    m.huevoT-=dt; if(m.huevoT<=0){m.huevoT=300+Math.random()*300;soltarItem(crearPila(677),m.pos.x,m.pos.y+.3,m.pos.z,false);sonar('poner',m.pos,.4);}
  }
}

/* ---------- Pestañas del creativo ---------- */
const HERR_EXTRA=new Set([653,654,655,656,657,659,668,669,670,671,672,673,674,675]);
const _categoriaItemObj=categoriaItem;
categoriaItem=function(id){
  if(HERR_EXTRA.has(id))return 'herramientas';
  if(id===658||id===676)return 'combate';
  if(id===666||id===677)return 'combate';
  const b=BLOQUES[id];
  if(b&&b.clave){
    if(/^(esmaltada_|terracota_|polvoHormigon_|vela_)/.test(b.clave))return 'colores';
    if(/Coral|coral_|Amatista|amatista|Espeleotema|espeleotema|azalea|Azalea|alga|pastoMarino|pepinoMar|floresEsporas|raicesColgantes|hieloAzul|nievePolvo|calcita|bambu|panalAbejas/.test(b.clave))return 'naturaleza';
    if(/campana|fogata|mesaCartografia|telar|ahumador|altoHorno|compostador|cortapiedras|atril|mesaFlechas|caldero|tocadiscos|magnetita|anclaReaparicion|andamio|colmena|cadena|^vela$/.test(b.clave))return 'utiles';
    if(b.clave==='diana')return 'redstone';
  }
  return _categoriaItemObj(id);
};

/* ---------- Llamas en velas y fogatas ---------- */
if(typeof TIPO_FUENTE!=='undefined'){
  TIPO_FUENTE[B.fogata]='fuego'; TIPO_FUENTE[B.fogataAlmas]='fuegoAlmas';
  for(let id=1528;id<=1544;id++)if(BLOQUES[id])TIPO_FUENTE[id]='antorcha';
}

/* ---------- Cada fotograma ---------- */
const _actualizarFinalObj=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalObj(dt);
  actualizarCatalejo(); actualizarMapaMano(dt); actualizarRiendas(); ponerHuevos(dt);
};
