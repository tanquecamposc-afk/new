"use strict";
/* =========================================================
   Mano secundaria como en Java (hueco 40 del inventario):
   · Tecla F para cambiar el objeto entre las dos manos.
   · Hueco con silueta de escudo en el inventario y a la
     izquierda de la barra rápida.
   · Se ve en la mano izquierda (primera persona y muñeco).
   · Escudo en la mano secundaria: con clic derecho se cubre
     si la principal no tiene otro uso; gasta su durabilidad.
   · Antorchas y bloques en la secundaria se colocan con clic
     derecho mientras llevas un pico, una espada o nada.
   · Las flechas de la secundaria se usan primero y el tótem
     también salva desde ella.
   ========================================================= */
const MANO2=40;
const secundaria=()=>inv[MANO2]||null;
Object.assign(SND,{cambioMano:v=>{ruidoSnd(.06,1400,.14*v,'bandpass');tonoSnd(420,520,.05,'triangle',.03*v);}});

function intercambiarManos(){
  if(estado!=='jugando')return;
  const a=inv[ranura]||null, b=inv[MANO2]||null; if(!a&&!b)return;
  inv[ranura]=b; inv[MANO2]=a;
  sonar('cambioMano',null,.6); if(typeof cambioMano!=='undefined')cambioMano=1; mano2Id=-2;
  actualizarHUD();
}

/* ---------- Escudo en la mano secundaria ---------- */
const usoPrincipal=p=>{if(!p)return false;const it=ITEMS[p.id];if(!it)return false;
  if(it.herr)return !(it.herr.tipo==='espada'||it.herr.tipo==='pico');
  return true;};
function escudoEnSecundaria(){const s=secundaria();return !!(s&&s.id===597)&&!(enMano()&&enMano().id===597)&&!usoPrincipal(enMano());}
const _escudoEnManoM2=escudoEnMano;
escudoEnMano=function(){return _escudoEnManoM2()||escudoEnSecundaria();};
// El golpe parado gasta el escudo de la mano que lo lleva
let gastoSecundaria=false;
const _gastarObjetoEnManoM2=gastarObjetoEnMano;
gastarObjetoEnMano=function(n=1){
  if(!gastoSecundaria)return _gastarObjetoEnManoM2(n);
  const p=secundaria(); if(!p||!supervivencia())return;
  const ir=nivelEnc(p,'irrompibilidad');for(let k=0;k<n;k++)if(!ir||prob(1/(ir+1)))p.dur--;
  if(p.dur<=0){inv[MANO2]=null;sonar('rompeHerr');}
  actualizarHUD();
};
const _danarJugadorM2=danarJugador;
danarJugador=function(n,tipo,dir){
  gastoSecundaria=escudoArriba&&escudoEnSecundaria();
  try{return _danarJugadorM2(n,tipo,dir);}finally{gastoSecundaria=false;}
};

/* ---------- Colocar con la mano secundaria ---------- */
const _usarDerechoM2=usarDerecho;
usarDerecho=function(){
  const p=enMano(), s=secundaria();
  const libre=!p||(ITEMS[p.id]&&ITEMS[p.id].herr&&(ITEMS[p.id].herr.tipo==='pico'||ITEMS[p.id].herr.tipo==='espada'));
  const interactua=apuntado&&!apuntadoEnt&&!jugador.agachado&&BLOQUES[apuntado.b]&&BLOQUES[apuntado.b].inter;
  if(libre&&s&&ITEMS[s.id]&&ITEMS[s.id].bloque&&apuntado&&!apuntadoEnt&&!interactua){
    // Se usa el objeto de la mano secundaria como si estuviera en la principal
    inv[ranura]=s; inv[MANO2]=p||null;
    try{_usarDerechoM2();}finally{const usado=inv[ranura];inv[ranura]=inv[MANO2];inv[MANO2]=usado&&usado.n>0?usado:null;}
    mano2Balanceo=1; actualizarHUD(); return;
  }
  return _usarDerechoM2();
};

/* ---------- Inventario: hueco de la mano secundaria ---------- */
const _construirUIM2=construirUI;
construirUI=function(){
  _construirUIM2();
  if(!ui||ui.tipo!=='inv')return;
  const z=document.querySelector('#zonaSuperior .zonaCraft'); if(!z)return;
  const col=document.createElement('div');col.className='colMano2';
  crearSlot(col,refArr(inv,MANO2,{shift:p=>insertar(p,inv,IDX_INV)}),false,'escudo');
  const et=document.createElement('div');et.className='etqMano2';et.textContent='Mano 2';col.appendChild(et);
  const craft=z.querySelector('.zonaCraft');
  if(craft)z.insertBefore(col,craft);else z.appendChild(col);
  refrescarUI();
};
// Mayús+clic sobre un escudo o un tótem desde el inventario los lleva a la mano secundaria si está libre
const _shiftJugadorM2=shiftJugador;
shiftJugador=function(i){const f=_shiftJugadorM2(i);
  return p=>{if(ui&&ui.tipo==='inv'&&i<36&&!inv[MANO2]&&(p.id===597||p.id===658)){inv[MANO2]=p;return null;}return f(p);};};

/* ---------- HUD: hueco a la izquierda de la barra ---------- */
const elMano2=document.createElement('div');elMano2.id='mano2';elMano2.className='slot';
elBarra.parentNode.insertBefore(elMano2,elBarra);
const _actualizarHUDM2=actualizarHUD;
actualizarHUD=function(){
  _actualizarHUDM2();
  const s=secundaria();
  elMano2.style.visibility=s?'visible':'hidden';
  elMano2.innerHTML=s&&typeof htmlPila==='function'?htmlPila(s):'';
};
{const st=document.createElement('style');st.textContent=`
#barra{position:relative}
#mano2{position:absolute;width:44px;height:44px;bottom:2px;left:calc(50% - 262px);background:rgba(0,0,0,.42);border:2px solid #111;
  box-shadow:inset 2px 2px 0 rgba(0,0,0,.45),inset -2px -2px 0 rgba(160,160,160,.35);pointer-events:none}
#mano2 img{width:32px;height:32px;margin:6px;image-rendering:pixelated}
.colMano2{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;margin:0 6px}
.etqMano2{font-size:10px;color:#444}
.slot.vacio[data-fondo="escudo"]::before{content:"🛡"!important;font-size:22px!important;opacity:.35;text-transform:none!important}
@media (max-width:640px){#mano2{display:none}}`;document.head.appendChild(st);}

/* ---------- Primera persona: la mano izquierda ---------- */
const mano2=new THREE.Group(); camara.add(mano2);
let mano2Obj=null, mano2Id=-1, mano2Balanceo=0;
function objetoMano2(id){
  if(id===597){const m=modeloEscudo();m.scale.setScalar(.7);m.rotation.set(0,.45,0);return m;}
  if(esCuboItem(id)){const m=new THREE.Mesh(geoCuboItem(id,.3),new THREE.MeshBasicMaterial({map:texIconos,alphaTest:.5}));m.userData.c0=new THREE.Color(1,1,1);m.rotation.set(.1,-.7,0);return m;}
  if(LIENZOS[id]&&LIENZOS[id].width===16){const herr=esHerramientaMano(id);const m=new THREE.Mesh(geoExtruida(id,herr?.44:.38),matExtruido());
    // Reflejado: en la izquierda la punta mira hacia dentro
    m.scale.x=-1; if(herr){m.rotation.set(.12,1.3,-.42);m.position.set(-.04,.12,.02);}else{m.rotation.set(0,.9,-.3);m.position.set(0,.08,0);}return m;}
  return null;
}
function actualizarMano2(brillo,dt){
  const s=secundaria(), id=s?s.id:0;
  mano2.visible=!!id&&mano.scale.x>0&&mano.visible!==false&&estado!=='muerto';
  if(id!==mano2Id){mano2Id=id;if(mano2Obj){mano2.remove(mano2Obj);mano2Obj=null;}if(id){mano2Obj=objetoMano2(id);if(mano2Obj)mano2.add(mano2Obj);}}
  if(!mano2Obj)return;
  // Luz del lugar sobre el color original de cada pieza (el escudo tiene piezas de colores)
  const b=clamp(brillo,.15,1);mano2Obj.traverse(o=>{if(!o.isMesh||!o.material||!o.material.color)return;
    if(!o.userData.c0)o.userData.c0=o.material.color.clone();o.material.color.copy(o.userData.c0).multiplyScalar(b);});
  mano2Balanceo=Math.max(0,mano2Balanceo-dt*3.4);
  const sw=mano2Balanceo>0?Math.sin(Math.sqrt(1-mano2Balanceo)*Math.PI):0;
  let px=-.5+sw*.2,py=-.5-sw*.1+Math.sin(tiempoJuego*1.6+1)*.005,pz=-.74-sw*.1,rx=-sw*.9,ry=-sw*.4;
  if(escudoArriba&&escudoEnSecundaria()){px=-.2;py=-.36;pz=-.6;rx=0;ry=-.25;}
  if(typeof faseCamara!=='undefined'&&jugador.suelo){px-=Math.cos(faseCamara)*.012;py+=Math.abs(Math.sin(faseCamara))*.012;}
  mano2.position.set(px,py,pz); mano2.rotation.set(rx,ry,0);
}
const _actualizarManoM2=actualizarMano;
actualizarMano=function(id,brillo,dt,agachado){_actualizarManoM2(id,brillo,dt,agachado);actualizarMano2(brillo,dt);};

/* ---------- Muñeco del inventario: escudo en la mano izquierda ---------- */
if(typeof dibujarMuneco==='function'){
  const _dibujarMunecoM2=dibujarMuneco;
  dibujarMuneco=function(c){_dibujarMunecoM2(c);const s=secundaria();if(!s||!LIENZOS[s.id])return;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(LIENZOS[s.id],c.width*.72,c.height*.42,28,28);};
}
