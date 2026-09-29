"use strict";
/* =========================================================
   Controles táctiles: joystick para moverse, arrastrar para
   mirar, tocar para usar/colocar, mantener para romper y
   botones para saltar, agacharse, atacar e inventario.
   ========================================================= */
const TACTIL=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||('ontouchstart' in window&&navigator.maxTouchPoints>0);
(function(){
  if(!TACTIL)return;
  const css=document.createElement('style');
  css.textContent=`
#tactil{position:fixed;inset:0;z-index:4;touch-action:none;user-select:none;-webkit-user-select:none}
#tactil.oculto{display:none}
#joy{position:absolute;left:24px;bottom:28px;width:132px;height:132px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.25)}
#joyP{position:absolute;left:41px;top:41px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.35)}
.tbtn{position:absolute;width:58px;height:58px;border-radius:50%;background:rgba(20,24,34,.55);border:2px solid rgba(255,255,255,.3);
  color:#fff;font:600 13px/54px system-ui,sans-serif;text-align:center}
.tbtn.on{background:rgba(255,255,255,.35)}
#tSaltar{right:28px;bottom:40px;width:70px;height:70px;line-height:66px}
#tAgachar{right:110px;bottom:24px}
#tAtacar{right:28px;bottom:124px}
#tUsar{right:100px;bottom:98px}
#tInv{right:16px;top:14px;width:46px;height:46px;line-height:42px;border-radius:10px}
#tPausa{left:16px;top:14px;width:46px;height:46px;line-height:42px;border-radius:10px}
#tTirar{right:70px;top:14px;width:46px;height:46px;line-height:42px;border-radius:10px}
@media (pointer:coarse){#barra .slot,#barra>*{touch-action:none}}`;
  document.head.appendChild(css);
  const cont=document.createElement('div'); cont.id='tactil'; cont.className='oculto';
  cont.innerHTML=`<div id="joy"><div id="joyP"></div></div>
    <div class="tbtn" id="tSaltar">▲</div><div class="tbtn" id="tAgachar">⇩</div>
    <div class="tbtn" id="tAtacar">⚔</div><div class="tbtn" id="tUsar">✋</div>
    <div class="tbtn" id="tInv">☰</div><div class="tbtn" id="tPausa">❚❚</div><div class="tbtn" id="tTirar">⤓</div>`;
  document.body.appendChild(cont);
  const $t=id=>document.getElementById(id);
  // Tocar la barra rápida selecciona la ranura
  const barra=$('barra');
  function tocaBarra(t){
    const r=barra.getBoundingClientRect(); if(t.clientY<r.top||t.clientY>r.bottom||t.clientX<r.left||t.clientX>r.right)return false;
    const i=[...barra.children].findIndex(s=>{const q=s.getBoundingClientRect();return t.clientX>=q.left&&t.clientX<=q.right;});
    if(i>=0&&i<9){ranura=i;comiendo=-1;arcoCarga=-1;actualizarHUD();}
    return true;
  }

  // Joystick
  let joyId=null, joyC=null;
  const joy=$t('joy'), joyP=$t('joyP');
  function moverJoy(t){
    const dx=t.clientX-joyC.x, dy=t.clientY-joyC.y, d=Math.hypot(dx,dy), m=Math.min(d,56), a=Math.atan2(dy,dx);
    joyP.style.transform=`translate(${Math.cos(a)*m}px,${Math.sin(a)*m}px)`;
    const nx=d>12?dx/d:0, ny=d>12?dy/d:0;
    teclas.KeyW=ny<-.38; teclas.KeyS=ny>.38; teclas.KeyA=nx<-.38; teclas.KeyD=nx>.38;
    if(d>60&&ny<-.7&&!(supervivencia()&&hambre<=6))jugador.corriendo=true;
  }
  joy.addEventListener('touchstart',e=>{const t=e.changedTouches[0];joyId=t.identifier;const r=joy.getBoundingClientRect();
    joyC={x:r.left+r.width/2,y:r.top+r.height/2};moverJoy(t);e.preventDefault();},{passive:false});

  // Mirar / tocar / mantener en el resto de la pantalla
  const miradas=new Map();
  cont.addEventListener('touchstart',e=>{
    if(estado!=='jugando')return;
    for(const t of e.changedTouches){
      if(t.target!==cont||tocaBarra(t))continue;
      miradas.set(t.identifier,{x:t.clientX,y:t.clientY,x0:t.clientX,y0:t.clientY,t0:performance.now(),mov:0,largo:false});
    }
    e.preventDefault();
  },{passive:false});
  cont.addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===joyId){moverJoy(t);continue;}
      const m=miradas.get(t.identifier); if(!m)continue;
      const dx=t.clientX-m.x, dy=t.clientY-m.y; m.x=t.clientX; m.y=t.clientY; m.mov+=Math.abs(dx)+Math.abs(dy);
      if(estado==='jugando'){jugador.yaw-=dx*.006;jugador.pitch=clamp(jugador.pitch-dy*.006,-Math.PI/2+.001,Math.PI/2-.001);}
    }
    e.preventDefault();
  },{passive:false});
  const fin=e=>{
    for(const t of e.changedTouches){
      if(t.identifier===joyId){joyId=null;joyP.style.transform='';teclas.KeyW=teclas.KeyS=teclas.KeyA=teclas.KeyD=false;jugador.corriendo=false;continue;}
      const m=miradas.get(t.identifier); if(!m)continue; miradas.delete(t.identifier);
      if(m.largo){clicIzq=false;minado=null;}
      else if(m.mov<14&&performance.now()-m.t0<300&&estado==='jugando'){actualizarApuntado();if(apuntadoEnt)atacar();else usarDerecho();}
    }
  };
  cont.addEventListener('touchend',fin); cont.addEventListener('touchcancel',fin);
  // Mantener pulsado sin mover = romper
  setInterval(()=>{
    for(const m of miradas.values())if(!m.largo&&m.mov<14&&performance.now()-m.t0>320&&estado==='jugando'){
      m.largo=true;actualizarApuntado();clicIzq=true;if(apuntadoEnt)atacar();else balancearMano();}
  },50);

  // Botones
  function boton(id,abajo,arriba){
    const el=$t(id);
    el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();el.classList.add('on');abajo();},{passive:false});
    const up=e=>{e.preventDefault();el.classList.remove('on');if(arriba)arriba();};
    el.addEventListener('touchend',up); el.addEventListener('touchcancel',up);
  }
  let ultimoSalto=0;
  boton('tSaltar',()=>{teclas.Space=true;const a=performance.now();
    if(!supervivencia()&&a-ultimoSalto<280){jugador.vuela=!jugador.vuela;jugador.vel.y=0;}ultimoSalto=a;},()=>{teclas.Space=false;});
  boton('tAgachar',()=>{teclas.ShiftLeft=!teclas.ShiftLeft;$t('tAgachar').style.background=teclas.ShiftLeft?'rgba(255,255,255,.4)':'';});
  boton('tAtacar',()=>{actualizarApuntado();clicIzq=true;if(apuntadoEnt)atacar();else balancearMano();},()=>{clicIzq=false;minado=null;});
  boton('tUsar',()=>{actualizarApuntado();clicDer=true;usarDerecho();repetir=.25;},()=>{clicDer=false;comiendo=-1;if(arcoCarga>=0)soltarArco();});
  boton('tInv',()=>{if(estado==='jugando')abrirUI(supervivencia()?'inv':'paleta');else if(estado==='ui')cerrarUI();});
  boton('tPausa',()=>{if(estado==='jugando')pausar();});
  boton('tTirar',()=>{if(estado==='jugando')tirarEnMano(false);});

  // Mostrar solo mientras se juega; en táctil no hay bloqueo del puntero
  setInterval(()=>{
    const jugando=estado==='jugando';
    cont.classList.toggle('oculto',!jugando);
    if(!jugando&&teclas.ShiftLeft&&estado!=='ui'){teclas.ShiftLeft=false;$t('tAgachar').style.background='';}
  },100);
  // Botón de cerrar en las pantallas de inventario (no hay tecla E)
  const cerrar=document.createElement('div'); cerrar.className='tbtn'; cerrar.textContent='✕';
  cerrar.style.cssText='position:fixed;right:14px;top:14px;z-index:30;width:46px;height:46px;line-height:42px;border-radius:10px;display:none';
  document.body.appendChild(cerrar);
  cerrar.addEventListener('touchstart',e=>{e.preventDefault();if(estado==='ui')cerrarUI();},{passive:false});
  setInterval(()=>{cerrar.style.display=estado==='ui'?'block':'none';},150);
})();
