"use strict";
/* =========================================================
   Arreglos de controles y Bed Wars
   - Ya no te quedas saltando sin parar. Pasaba cuando una
     tecla se soltaba sin que el juego se enterara (sobre
     todo Ctrl+Espacio en Chromebook, que cambia el idioma
     del teclado y se queda con el «soltar» del Espacio, o al
     cambiar de ventana). Ahora las teclas se sueltan solas si
     no llegan pulsaciones, al perder el ratón o la ventana.
   - Bed Wars: los recursos del generador se comparten.
     Si un compañero (bot o jugador en red) coge hierro u oro
     del generador de tu equipo y tú estás en la base, a ti
     también te llega lo mismo (como en Hypixel).
   ========================================================= */

/* ---------- Teclas que se quedan pulsadas ---------- */
const ultimaPulsacion41={};
window.addEventListener('keydown',e=>{ultimaPulsacion41[e.code]=performance.now();},true);
// El «soltar» se procesa siempre, aunque otro manejador corte el evento
window.addEventListener('keyup',e=>{teclas[e.code]=false;},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof soltarControles==='function')soltarControles();});
document.addEventListener('pointerlockchange',()=>{
  if(!document.pointerLockElement)for(const k of ['Space','ControlLeft','ControlRight','KeyW','KeyA','KeyS','KeyD'])teclas[k]=false;
});
(function vigilante41(){
  requestAnimationFrame(vigilante41);
  if(!teclas.Space)return;
  const tactil=document.getElementById('tSaltar'); if(tactil&&tactil.classList.contains('on'))return;
  // Mientras se mantiene una tecla el teclado repite la pulsación; si dejan de llegar, ya no está pulsada
  if(performance.now()-(ultimaPulsacion41.Space||0)>1200)teclas.Space=false;
})();
// Con Ctrl pulsado, Espacio no debe hacer nada raro en el navegador
window.addEventListener('keydown',e=>{if(e.code==='Space'&&estado==='jugando')e.preventDefault();},true);

/* ---------- Bed Wars: recursos compartidos en la base ---------- */
const RADIO_BASE41=8;
function genEquipo41(eq){return typeof BW!=='undefined'&&BW&&BW.gens?BW.gens.find(g=>g.tipo==='equipo'&&g.equipo===eq):null;}
function estoyEnBase41(){
  if(!(typeof BW!=='undefined'&&BW&&BW.activo&&BW.yo&&BW.yo.vivo)||BW.yo.espectador||estado==='muerto')return false;
  const g=genEquipo41(BW.yo.equipo); if(!g)return false;
  return Math.hypot(jugador.pos.x-g.x,jugador.pos.z-g.z)<RADIO_BASE41&&Math.abs(jugador.pos.y-BW_Y)<5;
}
const esMoneda41=id=>id===I.lingoteHierro||id===I.lingoteOro;
function recibirCompartido41(id,n,de){
  if(!estoyEnBase41())return;
  darBW(id,n);
  if(typeof sonar==='function')sonar('recoger',null,.25);
}
// Tú coges lingotes del generador de tu equipo: tus compañeros en la base también los reciben
const _actualizarItem41=actualizarItem;
actualizarItem=function(e,dt){
  const antes=e.recogiendo, pila=e.pila, id=pila&&pila.id, n=pila&&pila.n;
  const r=_actualizarItem41(e,dt);
  if(antes===undefined&&e.recogiendo!==undefined&&esMoneda41(id)&&typeof BW!=='undefined'&&BW&&BW.activo&&BW.yo&&!BW.yo.espectador){
    const g=genEquipo41(BW.yo.equipo);
    if(g&&Math.hypot(e.pos.x-g.x,e.pos.z-g.z)<3.5){
      for(const m of BW.bots||[])if(!m.muerto&&m.bw&&m.bw.equipo===BW.yo.equipo&&Math.hypot(m.pos.x-g.x,m.pos.z-g.z)<RADIO_BASE41){
        if(id===I.lingoteHierro)m.bw.res.h+=n;else m.bw.res.o+=n;}
      if(typeof RED!=='undefined'&&RED.conectado)enviarRed({t:'bwComparte',equipo:BW.yo.equipo,id,n,nombre:RED.nombre});
    }
  }
  return r;
};
if(typeof ACT_ENT!=='undefined')ACT_ENT.item=actualizarItem;
// Un bot compañero cobra del generador: si estás en la base te llega lo mismo
const _actualizarGensBW41=actualizarGensBW;
actualizarGensBW=function(dt){
  const antes=new Map();
  for(const m of BW.bots||[])if(m.bw&&!m.muerto)antes.set(m,[m.bw.res.h,m.bw.res.o]);
  _actualizarGensBW41(dt);
  if(!BW.yo||!BW.yo.vivo)return;
  for(const [m,[h,o]] of antes){
    if(m.bw.equipo!==BW.yo.equipo)continue;
    const g=genEquipo41(m.bw.equipo); if(!g||Math.hypot(m.pos.x-g.x,m.pos.z-g.z)>=5)continue;
    const dh=m.bw.res.h-h, dor=m.bw.res.o-o;
    if(dh>0)recibirCompartido41(I.lingoteHierro,dh,m);
    if(dor>0)recibirCompartido41(I.lingoteOro,dor,m);
  }
};
// En red: lo que coge un compañero también te llega si estás en la base
if(typeof recibirRed==='function'){
  const _recibirRed41=recibirRed;
  recibirRed=function(texto){
    let m=null;try{m=JSON.parse(texto);}catch(e){}
    if(m&&m.t==='bwComparte'&&m.de!==RED.id){
      if(typeof BW!=='undefined'&&BW&&BW.activo&&BW.yo&&m.equipo===BW.yo.equipo&&esMoneda41(m.id))recibirCompartido41(m.id,Math.min(64,m.n|0));
      return;
    }
    return _recibirRed41(texto);
  };
}
