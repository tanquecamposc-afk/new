"use strict";
/* =========================================================
   Modo espectador
   - Al quedar eliminado en Bed Wars (y con /gamemode
     espectador en cualquier mundo) ya no juegas: vuelas
     libremente atravesando bloques y no puedes pegar, romper,
     poner, usar ni recoger nada. Los mobs y los bots te ignoran
     y los demás jugadores no te ven.
   - Puedes ver a cada persona: clic izquierdo / derecho para
     pasar al siguiente o al anterior jugador vivo (bots y
     jugadores en red), números 1–9 para elegir uno de la
     lista y Mayús para volver a volar libre. Se ve desde sus
     ojos (o en tercera persona con F5) y un panel muestra su
     vida, su equipo y lo que lleva en la mano.
   - Rueda del ratón: velocidad de vuelo.
   ========================================================= */
function esEspectador(){return (typeof BW!=='undefined'&&BW&&BW.activo&&BW.yo&&BW.yo.espectador)||modo==='espectador';}
const ESP={sig:null,velocidad:12,ocultado:null,panelT:0};

/* ---------- Nada de interactuar ---------- */
const _atacar39=atacar;
atacar=function(){if(esEspectador())return false;return _atacar39.apply(this,arguments);};
const _romperApuntado39=romperApuntado;
romperApuntado=function(){if(esEspectador())return;return _romperApuntado39.apply(this,arguments);};
const _colocarBloque39=colocarBloque;
colocarBloque=function(){if(esEspectador())return false;return _colocarBloque39.apply(this,arguments);};
const _usarDerecho39=usarDerecho;
usarDerecho=function(){if(esEspectador())return;return _usarDerecho39.apply(this,arguments);};
const _abrirUI39=abrirUI;
abrirUI=function(){if(esEspectador())return;return _abrirUI39.apply(this,arguments);};
if(typeof tirarEnMano==='function'){const _tirar39=tirarEnMano;tirarEnMano=function(){if(esEspectador())return;return _tirar39.apply(this,arguments);};}
const _danarJugador39=danarJugador;
danarJugador=function(){if(esEspectador())return;return _danarJugador39.apply(this,arguments);};
// Los mobs no persiguen al espectador
const _objetivoValido39=objetivoValido;
objetivoValido=function(){return !esEspectador()&&_objetivoValido39.apply(this,arguments);};
if(typeof objetivoValido2==='function'){const _ov2=objetivoValido2;objetivoValido2=function(){return !esEspectador()&&_ov2.apply(this,arguments);};}
// Objetos, experiencia, flechas y placas de presión no notan al espectador
function sinJugador39(fn){
  return function(){
    if(!esEspectador())return fn.apply(this,arguments);
    const p=jugador.pos, x=p.x,y=p.y,z=p.z; p.set(x,-1e5,z);
    try{return fn.apply(this,arguments);}finally{p.set(x,y,z);}
  };
}
actualizarEntidades=sinJugador39(actualizarEntidades);
if(typeof actualizarPlacas==='function')actualizarPlacas=sinJugador39(actualizarPlacas);

/* ---------- Vuelo libre atravesando bloques, o siguiendo a alguien ---------- */
const _fisicaJugador39=fisicaJugador;
fisicaJugador=function(dt,entrada){
  if(!esEspectador())return _fisicaJugador39.apply(this,arguments);
  const j=jugador;
  j.vuela=true; j.suelo=false; j.enAgua=false; j.enLava=false; j.ojosAgua=false; j.agachado=false; j.maxY=j.pos.y; fuegoJ=0;
  const o=objetivoActual();
  if(o){
    const d=datosObjetivo(o); j.pos.copy(d.pos); j.vel.set(0,0,0);
    if(!vistaTercera){j.yaw=d.yaw;j.pitch=d.pitch;}
    if(entrada&&(teclas.ShiftLeft||teclas.ShiftRight))dejarDeSeguir();
    return;
  }
  if(!entrada){j.vel.set(0,0,0);return;}
  const f=(teclas.KeyW?1:0)-(teclas.KeyS?1:0), l=(teclas.KeyD?1:0)-(teclas.KeyA?1:0);
  const u=(teclas.Space?1:0)-((teclas.ShiftLeft||teclas.ShiftRight)?1:0);
  const v=ESP.velocidad*((teclas.ControlLeft||teclas.ControlRight||j.corriendo)?2:1);
  const s=Math.sin(j.yaw), c=Math.cos(j.yaw);
  const obj=new THREE.Vector3((-s*f+c*l)*v,u*v,(-c*f-s*l)*v);
  j.vel.lerp(obj,Math.min(1,dt*10));
  j.pos.addScaledVector(j.vel,dt);
  j.pos.y=clamp(j.pos.y,-40,CY+60);
};

/* ---------- A quién se puede mirar ---------- */
function objetivosEspectador(){
  const l=[];
  if(typeof BW!=='undefined'&&BW&&BW.activo){
    for(const m of BW.bots||[])if(!m.muerto&&mobs.includes(m)&&m.bw&&m.pos.y>BW_VACIO)l.push({tipo:'bot',m,id:'b'+m.bw.k+'_'+m.bw.equipo});
  }
  if(typeof RED!=='undefined')for(const [id,r] of RED.remotos)if(r.g&&r.vivoBW!==false&&!r.espectador&&(r.dim==null||r.dim===dim.clave))l.push({tipo:'red',r,id:'r'+id});
  return l;
}
function objetivoActual(){
  if(!ESP.sig)return null;
  const l=objetivosEspectador(), o=l.find(x=>x.id===ESP.sig);
  if(!o){dejarDeSeguir(true);return null;}
  return o;
}
function datosObjetivo(o){
  if(o.tipo==='bot'){const m=o.m, cab=m.extra&&m.extra.cabeza;
    return {pos:m.pos,yaw:m.yaw+Math.PI+(cab?cab.rotation.y:0),pitch:clamp(-(cab?cab.rotation.x:0),-1.4,1.4),g:m.grupo,
      nombre:m.bw.nombre||'Bot',equipo:m.bw.equipo,vida:m.vida,vidaMax:m.def.vida||20,mano:typeof ESPADAS38!=='undefined'?idClave(ESPADAS38[m.bw.espada]||'espada_madera'):0};}
  const r=o.r; return {pos:r.g.position,yaw:r.yaw,pitch:r.pitch||0,g:r.g,nombre:r.nombre||'Jugador',equipo:r.equipo,vida:null,mano:r.mano||0};
}
function seguir(o){
  restaurarOcultado();
  ESP.sig=o?o.id:null;
  if(o){const d=datosObjetivo(o);mostrarMensaje(`Mirando a ${d.nombre}`);sonar('clic',null,.5);}
}
function dejarDeSeguir(silencio){
  if(!ESP.sig)return;
  restaurarOcultado(); ESP.sig=null;
  jugador.pos.y+=.5; jugador.vel.set(0,0,0);
  if(!silencio)mostrarMensaje('Vuelo libre');
}
function siguienteObjetivo(paso){
  const l=objetivosEspectador();
  if(!l.length){mostrarMensaje('No hay nadie a quien mirar');return;}
  let i=l.findIndex(x=>x.id===ESP.sig);
  i=i<0?(paso>0?0:l.length-1):(i+paso+l.length)%l.length;
  seguir(l[i]);
}
function restaurarOcultado(){if(ESP.ocultado){ESP.ocultado.visible=true;ESP.ocultado=null;}}

/* ---------- Teclas: números para elegir, rueda para la velocidad ---------- */
window.addEventListener('keydown',e=>{
  if(!esEspectador()||estado!=='jugando')return;
  const m=/^Digit([1-9])$/.exec(e.code);
  if(m){e.stopImmediatePropagation();const l=objetivosEspectador(),o=l[+m[1]-1];if(o)seguir(o);else mostrarMensaje('No hay nadie con ese número');}
  if(e.code==='KeyQ'||e.code==='KeyE'||e.code==='KeyF')e.stopImmediatePropagation();
},true);
// Clics: siguiente (izquierdo) o anterior (derecho); nunca llegan al juego
window.addEventListener('mousedown',e=>{
  if(!esEspectador()||estado!=='jugando'||document.pointerLockElement!==lienzo)return;
  e.stopImmediatePropagation();
  if(e.button===0)siguienteObjetivo(1);else if(e.button===2)siguienteObjetivo(-1);
},true);
window.addEventListener('wheel',e=>{
  if(!esEspectador()||estado!=='jugando')return;
  e.stopImmediatePropagation();
  ESP.velocidad=clamp(ESP.velocidad*(e.deltaY>0?.85:1.18),2,60);
  mostrarMensaje(`Velocidad de vuelo: ${Math.round(ESP.velocidad)}`);
},{capture:true,passive:true});

/* ---------- Cámara: sin mano, sin tu modelo y sin el cuerpo de a quien miras ---------- */
const _aplicarCamaraTercera39=aplicarCamaraTercera;
aplicarCamaraTercera=function(){
  const r=_aplicarCamaraTercera39.apply(this,arguments);
  const esp=esEspectador();
  document.body.classList.toggle('espectador39',esp&&estado!=='menu');
  if(!esp){restaurarOcultado();if(ESP.sig)ESP.sig=null;return r;}
  mano.visible=false; if(typeof mano2!=='undefined')mano2.visible=false;
  modeloJugador.g.visible=false;
  const o=objetivoActual();
  if(o&&!vistaTercera){const g=datosObjetivo(o).g;if(g){if(ESP.ocultado&&ESP.ocultado!==g)restaurarOcultado();g.visible=false;ESP.ocultado=g;}}
  else restaurarOcultado();
  return r;
};

/* ---------- Panel del espectador ---------- */
const panel39=document.createElement('div'); panel39.id='panelEspectador'; document.body.appendChild(panel39);
{const st=document.createElement('style');st.textContent=`
#panelEspectador{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;display:none;
  background:rgba(0,0,0,.55);color:#fff;font:13px monospace;padding:6px 12px;text-align:center;text-shadow:1px 1px 0 #000;min-width:280px;border:1px solid rgba(255,255,255,.15)}
body.espectador39 #panelEspectador{display:block}
body.espectador39 #hud,body.espectador39 #indicadorAtaque,body.espectador39 #mano2{display:none!important}
#panelEspectador b{color:#ff5}#panelEspectador .nom{font-size:15px;font-weight:bold}#panelEspectador .ayudaE{color:#aaa;font-size:11px;margin-top:3px}
#panelEspectador .lista{color:#ccc;font-size:11px;margin-top:2px}#panelEspectador img{width:16px;height:16px;image-rendering:pixelated;vertical-align:middle}`;
document.head.appendChild(st);}
function pintarPanel39(dt){
  if(!esEspectador()||estado==='menu')return;
  ESP.panelT-=dt; if(ESP.panelT>0)return; ESP.panelT=.2;
  const o=objetivoActual(), l=objetivosEspectador();
  const col=eq=>typeof EQUIPOS_BW!=='undefined'&&eq!=null&&EQUIPOS_BW[eq]?EQUIPOS_BW[eq].col:'#fff';
  let h='<b>👁 ESPECTADOR</b>';
  if(o){const d=datosObjetivo(o);
    h+=`<div class="nom" style="color:${col(d.equipo)}">${d.nombre.replace(/</g,'&lt;')}${d.equipo!=null&&typeof EQUIPOS_BW!=='undefined'&&EQUIPOS_BW[d.equipo]?' · '+EQUIPOS_BW[d.equipo].nombre:''}</div>`;
    const partes=[];
    if(d.vida!=null)partes.push(`<span style="color:#f55">❤</span> ${Math.max(0,Math.ceil(d.vida))}/${d.vidaMax}`);
    if(d.mano&&ICONOS[d.mano])partes.push(`<img src="${ICONOS[d.mano]}" alt=""> ${ITEMS[d.mano].nombre}`);
    if(partes.length)h+=`<div>${partes.join(' · ')}</div>`;
  }else h+=`<div>Vuelo libre · ${l.length?l.length+' jugador(es) para mirar':'nadie a quien mirar'}</div>`;
  if(l.length)h+=`<div class="lista">${l.slice(0,9).map((x,i)=>{const d=datosObjetivo(x);return `<span style="color:${x.id===ESP.sig?'#ff5':col(d.equipo)}">${i+1}·${d.nombre.replace(/</g,'&lt;')}</span>`;}).join('  ')}</div>`;
  h+=`<div class="ayudaE">Clic izq./der.: siguiente/anterior · 1–9: elegir · Mayús: volar libre · Rueda: velocidad · F5: cámara</div>`;
  panel39.innerHTML=h;
}
const _actualizarFinal39=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinal39(dt);pintarPanel39(dt);};

/* ---------- Bed Wars: al quedar eliminado, a mirar ---------- */
if(typeof hacerEspectador==='function'){
  const _hacerEspectador39=hacerEspectador;
  hacerEspectador=function(){
    const r=_hacerEspectador39.apply(this,arguments);
    ESP.sig=null; setTimeout(()=>{if(esEspectador()&&!ESP.sig)siguienteObjetivo(1);},1200);
    escribirChat('Eres espectador: clic para ir mirando a cada jugador, Mayús para volar libre.');
    return r;
  };
}
// Los demás jugadores no ven al espectador
if(typeof estadoLocal==='function'){
  const _estadoLocal39=estadoLocal;
  estadoLocal=function(){const o=_estadoLocal39();o.espectador=esEspectador();return o;};
}
if(typeof actualizarRemoto==='function'){
  const _actualizarRemoto39=actualizarRemoto;
  actualizarRemoto=function(m){
    _actualizarRemoto39(m);
    const r=RED.remotos.get(m.de); if(!r)return;
    r.espectador=!!m.espectador; r.vivoBW=m.bwVivo; r.mano=m.mano; r.equipo=m.equipo??r.equipo;
    if(r.espectador&&r.g)r.g.visible=false;
  };
}

/* ---------- /gamemode espectador ---------- */
const _ejecutarComando39=ejecutarComando;
ejecutarComando=function(t){
  const a=t.trim().replace(/^\//,'').split(/\s+/);
  if((a[0]==='gamemode'||a[0]==='gm')&&['sp','3','spectator','espectador'].includes((a[1]||'').toLowerCase())){
    modo='espectador'; jugador.vuela=true; actualizarHUD(); escribirChat('Modo: Espectador (vuela atravesando bloques; /gamemode survival para volver)'); return;}
  return _ejecutarComando39(t);
};
