"use strict";
/* =========================================================
   Atajos para teclados sin teclas de función (Chromebook):
   F + 5 cuenta como F5 (tercera persona) y F + 3 como F3
   (información de depuración). Vale mantener F y pulsar el
   número, o pulsar F y justo después el número. La F sola
   sigue cambiando el objeto de mano (al soltarla).
   ========================================================= */
const ATAJOS_F={Digit5:'F5',Numpad5:'F5',Digit3:'F3',Numpad3:'F3'};
let fAbajo=false, fUsada=false, fSoltadaT=-1e9, fCambio=false;
function lanzarTeclaF(code){
  document.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));
  document.dispatchEvent(new KeyboardEvent('keyup',{code,key:code,bubbles:true,cancelable:true}));
}
window.addEventListener('keydown',e=>{
  if(estado!=='jugando')return;
  if(e.code==='KeyF'){
    e.stopImmediatePropagation();
    if(!e.repeat){fAbajo=true;fUsada=false;}
    return;
  }
  const f=ATAJOS_F[e.code];
  if(!f||e.repeat)return;
  // F mantenida + número
  if(fAbajo){e.stopImmediatePropagation();e.preventDefault();fUsada=true;lanzarTeclaF(f);return;}
  // F pulsada y soltada justo antes: se deshace el cambio de manos que hizo al soltarla
  if(performance.now()-fSoltadaT<650){e.stopImmediatePropagation();e.preventDefault();
    if(fCambio&&typeof intercambiarManos==='function')intercambiarManos();
    fSoltadaT=-1e9;lanzarTeclaF(f);}
},true);
window.addEventListener('keyup',e=>{
  if(e.code!=='KeyF'||!fAbajo)return;
  fAbajo=false; fCambio=false;
  if(estado!=='jugando')return;
  if(!fUsada){if(typeof intercambiarManos==='function'){intercambiarManos();fCambio=true;}fSoltadaT=performance.now();}
},true);
window.addEventListener('blur',()=>{fAbajo=false;});

/* ---------- Correr con Ctrl ----------
   Ctrl + W cierra la pestaña en Chrome. Para que no pase:
   - Mientras juegas se bloquean los atajos del navegador con Ctrl (Ctrl+S, Ctrl+D…).
   - En pantalla completa se bloquea el teclado (Keyboard Lock) y Ctrl+W ya no cierra.
   - Si aun así el navegador intenta cerrar la pestaña, pregunta antes de salir. */
window.addEventListener('keydown',e=>{
  if(estado!=='jugando')return;
  if(e.ctrlKey&&!/^F\d+$/.test(e.code))e.preventDefault();
},true);
function bloquearTeclado(){
  try{if(document.fullscreenElement&&navigator.keyboard&&navigator.keyboard.lock)
    navigator.keyboard.lock(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR','KeyT','KeyN','Space']).catch(()=>{});}catch(e){}
}
document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement)bloquearTeclado();else{try{navigator.keyboard&&navigator.keyboard.unlock&&navigator.keyboard.unlock();}catch(e){}}});
window.addEventListener('beforeunload',e=>{
  if(estado!=='jugando'&&estado!=='ui')return;
  try{if(typeof guardarPartida==='function')guardarPartida();}catch(err){}
  e.preventDefault(); e.returnValue='';
});
