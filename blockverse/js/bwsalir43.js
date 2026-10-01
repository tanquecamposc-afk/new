"use strict";
/* =========================================================
   Salir de Bed Wars sin fallos
   - «Guardar y salir al título», «Abandonar Bed Wars» (pausa)
     y «Salir al menú» (al terminar) cierran la partida del
     todo: se quitan los bots, tenderos, carteles, hologramas,
     el marcador y los avisos; se acaban las reglas de Bed Wars
     (límite de construcción, espectador…), se vacía el
     inventario de la partida y se vuelve al título con un
     mundo de fondo nuevo, sin recargar la página.
   - Al empezar otra partida se limpia lo que quedara de la
     anterior (antes quedaban hologramas flotando).
   - Al morir ya no salen dos letreros a la vez.
   ========================================================= */
function limpiarVisualesBW(bw){
  if(!bw)return;
  for(const s of bw.carteles||[]){escena.remove(s);}
  for(const g of bw.gens||[]){for(const k of ['holo','bloque','cartel'])if(g[k]){escena.remove(g[k]);g[k]=null;}}
  for(const m of [...(bw.bots||[]),...(bw.tenderos||[]),...(bw.aliados||[]).map(a=>a.m||a)])if(m&&m.grupo&&!m.muerto)quitarMob(m);
  if(bw.cola)bw.cola.length=0;
}
function salirDeBedwars(){
  const bw=typeof BW!=='undefined'?BW:null;
  if(!bw)return;
  const enRed=typeof RED!=='undefined'&&RED.conectado;
  bw.activo=false; bw.fin=true;
  limpiarVisualesBW(bw);
  document.getElementById('bwFin')?.remove();
  mostrarMarcadorBW(false);
  const av=document.getElementById('bwAviso'); if(av){av.style.opacity=0;av.textContent='';}
  if(typeof tituloEl!=='undefined')tituloEl.style.opacity=0;
  clearTimeout(tituloBW._t);
  if(enRed)desconectarRed();
  // Lo propio de la partida se va con ella
  if(ui)cerrarUI();
  soltarControles(); efectos={}; fuegoJ=0; inv=new Array(41).fill(null); cursor=null;
  salud=20; hambre=20; jugador.vuela=false; vistaTercera=0; modo=selModo.value==='creativo'?'creativo':'supervivencia';
  if(typeof ESP!=='undefined'){ESP.sig=null;}
  document.body.classList.remove('espectador39');
  limpiarMobs();
  // Al título con un mundo de fondo nuevo (no se guarda)
  mundoId=null; metaMundo=null;
  window.semillaElegida=1+Math.floor(Math.random()*1e6);
  try{nuevoMundo();}catch(e){console.error(e);}
  mundoId=null; metaMundo=null;
  estado='menu'; mostrarHud(false);
  $('muerte').classList.add('oculto');
  document.getElementById('pantallaBedwars')?.classList.add('oculto');
  mostrarPantalla('menu');
  if(document.pointerLockElement)try{document.exitPointerLock();}catch(e){}
  actualizarHUD();
}
// «Guardar y salir al título» dentro de Bed Wars: salir de la partida (no hay nada que guardar)
const _salirAlTitulo43=salirAlTitulo;
salirAlTitulo=function(){
  if(typeof BW!=='undefined'&&BW&&(BW.activo||mundoEstado&&mundoEstado.bedwars))return salirDeBedwars();
  return _salirAlTitulo43.apply(this,arguments);
};
for(const id of ['btnSalirTitulo','btnMuerteTitulo']){const b=document.getElementById(id);if(b)b.onclick=()=>salirAlTitulo();}
{const b=document.getElementById('btnSalirBW');if(b)b.onclick=()=>salirDeBedwars();}
// «Salir al menú» de la pantalla final
const _terminarBW43=terminarBW;
terminarBW=function(){
  const r=_terminarBW43.apply(this,arguments);
  const s=document.getElementById('bwSalir'); if(s)s.onclick=()=>salirDeBedwars();
  return r;
};
// Una partida nueva limpia lo que quedara de la anterior
const _iniciarBedwars43=iniciarBedwars;
iniciarBedwars=function(){
  if(typeof BW!=='undefined'&&BW){BW.activo=false;limpiarVisualesBW(BW);}
  document.getElementById('bwFin')?.remove();
  if(typeof ESP!=='undefined')ESP.sig=null;
  vistaTercera=0;
  return _iniciarBedwars43.apply(this,arguments);
};
// Al morir, la cuenta atrás ya sale en el título grande: el aviso pequeño no se repite
const _mostrarAvisoBW43=mostrarAvisoBW;
mostrarAvisoBW=function(t,col){if(/^Reapareces en/.test(String(t)))return;return _mostrarAvisoBW43.apply(this,arguments);};
// Un mundo normal nunca debe heredar el estado de una partida de Bed Wars
const _nuevoMundo43=nuevoMundo;
nuevoMundo=function(){
  const r=_nuevoMundo43.apply(this,arguments);
  if(typeof BW!=='undefined'&&BW&&BW.activo&&!(typeof bwPendiente!=='undefined'&&bwPendiente)){BW.activo=false;limpiarVisualesBW(BW);mostrarMarcadorBW(false);}
  return r;
};
