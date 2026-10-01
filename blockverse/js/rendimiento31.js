"use strict";
/* =========================================================
   Rendimiento: más FPS sin perder calidad
   - Sombras del sol en caché: el mapa de sombras (2048²) ya
     no se redibuja en cada fotograma, solo cuando cambia el
     terreno, el sol se mueve un poco o el jugador se aleja.
   - Los chunks que quedan del todo dentro de la niebla no se
     dibujan (ni en la vista ni en el reflejo del agua).
   - Los mobs y entidades más allá de la niebla no se dibujan.
   - Reflejo del agua a un tercio de resolución.
   - Resolución dinámica: si los FPS bajan de 48 se reduce un
     poco la resolución de la imagen interna (sin tocar el
     lienzo, así no parpadea), y vuelve a subir cuando hay
     margen. Se puede desactivar en Opciones.
   - Contador de FPS opcional en pantalla.
   ========================================================= */

/* ---------- Sombras en caché ---------- */
let sombraSucia=true, sombraUltima=-1, sombraActiva=false;
const _sombraCentro=new THREE.Vector3(1e9,0,0), _sombraSol=new THREE.Vector3(), _sombraMat=new THREE.Matrix4();
const _construirMallaChunk31=construirMallaChunk;
construirMallaChunk=function(ch){_construirMallaChunk31(ch);sombraSucia=true;};
const _quitarMallaChunk31=quitarMallaChunk;
quitarMallaChunk=function(ch){_quitarMallaChunk31(ch);sombraSucia=true;};
pasoSombras=function(){
  const U=[matOpaco.uniforms,matTrans.uniforms], sup=dim===DIMS.superficie;
  for(const u of U)u.uVibrante.value=graficosVibrantes?1:0;
  const ocaso=sup?clamp(1-Math.abs(sol)/.28,0,1):0, diaF=sup?clamp((sol+.1)/.3,0,1):0;
  const ojo=getBloque(Math.floor(camara.position.x),Math.floor(camara.position.y),Math.floor(camara.position.z));
  const k=esAgua(ojo)||esLava(ojo)?0:(.16*diaF+.5*ocaso)*(lloviendo?.2:1)*(graficosVibrantes?1:.5);
  _glow.setRGB(1,.93,.78).lerp(_tc.setRGB(1,.55,.28),ocaso).multiplyScalar(k);
  for(const u of U)u.uNieblaSol.value.copy(_glow);
  const sd=matOpaco.uniforms.uSolDir.value;
  const activas=graficosVibrantes&&sup&&sd.y>.06&&estado!=='menu';
  if(!activas){for(const u of U)u.uTexelSombra.value=-1;sombraActiva=false;return;}
  // Centro encajado a una rejilla de ~2 bloques (múltiplo del texel: las sombras no tiemblan)
  const texel=R_SOMBRA*2/TAM_SOMBRA, paso=texel*32;
  const cx=Math.round(camara.position.x/paso)*paso, cy=Math.round(camara.position.y/paso)*paso, cz=Math.round(camara.position.z/paso)*paso;
  const movido=cx!==_sombraCentro.x||cy!==_sombraCentro.y||cz!==_sombraCentro.z;
  const giroSol=_sombraSol.dot(sd)<.99999;   // ~0,25° de recorrido del sol
  const ahora=performance.now();
  const animando=typeof subiendo!=='undefined'&&subiendo.length>0;
  const toca=!sombraActiva||movido||giroSol||((sombraSucia||animando)&&ahora-sombraUltima>120);
  if(!toca){for(const u of U){u.uTexelSombra.value=1/TAM_SOMBRA;u.uMapaSombra.value=rtSombra.texture;}return;}
  sombraSucia=false; sombraUltima=ahora; sombraActiva=true;
  _sombraCentro.set(cx,cy,cz); _sombraSol.copy(sd);
  camSombra.position.copy(_sombraCentro).addScaledVector(sd,220);
  camSombra.up.set(0,1,0); if(Math.abs(sd.y)>.99)camSombra.up.set(0,0,1);
  camSombra.lookAt(_sombraCentro); camSombra.updateMatrixWorld(); camSombra.updateProjectionMatrix();
  const prevFondo=escena.background, prevNiebla=escena.fog;
  renderer.getClearColor(_colClear); const prevAlfa=renderer.getClearAlpha();
  escena.background=null; escena.fog=null; escena.overrideMaterial=matProfSombra;
  renderer.setRenderTarget(rtSombra); renderer.setClearColor(0xffffff,1); renderer.clear(); renderer.render(escena,camSombra);
  renderer.setRenderTarget(null); renderer.setClearColor(_colClear,prevAlfa);
  escena.overrideMaterial=null; escena.background=prevFondo; escena.fog=prevNiebla;
  _sombraMat.multiplyMatrices(camSombra.projectionMatrix,camSombra.matrixWorldInverse);
  for(const u of U){u.uSombraMat.value.copy(_sombraMat);u.uMapaSombra.value=rtSombra.texture;u.uTexelSombra.value=1/TAM_SOMBRA;}
};

/* ---------- Ocultar lo que la niebla tapa del todo ---------- */
const _dir31=new THREE.Vector3(), _esq31=new THREE.Vector3(), ocultos31=[];
// Profundidad mínima (a lo largo de la vista) de una caja: si supera el final de la niebla, no se ve nada de ella
function profMin31(bb,ox,oz,c,d,espejoY){
  let mn=Infinity;
  for(let i=0;i<8;i++){
    const x=(i&1?bb.max.x:bb.min.x)+ox, y=(i&2?bb.max.y:bb.min.y), z=(i&4?bb.max.z:bb.min.z)+oz;
    const yy=espejoY===undefined?y:2*espejoY-y;
    const p=(x-c.x)*d.x+(yy-c.y)*d.y+(z-c.z)*d.z; if(p<mn)mn=p;
  }
  return mn;
}
function ocultarTrasNiebla(){
  ocultos31.length=0;
  if(!escena.fog||!OPC.cullNiebla)return;
  const lim=escena.fog.far+2, c=camara.position;
  camara.getWorldDirection(_dir31);
  // El reflejo del agua mira con la vista invertida en altura
  const refl=OPC.reflejos&&OPC.shaders&&dim===DIMS.superficie&&typeof aguaY!=='undefined'&&c.y>aguaY&&c.y-aguaY<80;
  for(const ch of dim.chunks.values()){
    for(const k of ['mallaO','mallaT']){const m=ch[k]; if(!m||!m.visible)continue;
      const g=m.geometry; if(!g.boundingBox)g.computeBoundingBox();
      if(profMin31(g.boundingBox,m.position.x,m.position.z,c,_dir31)<=lim)continue;
      if(refl&&profMin31(g.boundingBox,m.position.x,m.position.z,c,_dir31,aguaY)<=lim+4)continue;
      m.visible=false; ocultos31.push(m);}
  }
  // Mobs y entidades lejanas
  const lim2=lim*lim;
  for(const m of mobs){const gr=m.grupo;if(!gr||!gr.visible||m.def&&(m.def.vuela&&m.tipo==='ghast'))continue;
    const dx=m.pos.x-c.x,dz=m.pos.z-c.z;if(dx*dx+dz*dz>lim2){gr.visible=false;ocultos31.push(gr);}}
}
function restaurarOcultos(){for(const o of ocultos31)o.visible=true;ocultos31.length=0;}
const _renderizarFinal31=renderizarFinal;
renderizarFinal=function(){
  ocultarTrasNiebla();
  try{_renderizarFinal31();}finally{restaurarOcultos();}
};

/* ---------- Reflejo del agua más ligero (un tercio de resolución) ---------- */
pasoReflejo=function(){
  const mats=[matOpaco,matTrans];
  mats.forEach(m=>m.uniforms.uUsaReflejo.value=0);
  if(!OPC.reflejos||dim!==DIMS.superficie)return;
  aguaBuscarT-=1; if(aguaBuscarT<=0){aguaBuscarT=20;buscarAgua();}
  const cy=camara.position.y;
  if(cy<aguaY+.05||cy-aguaY>80)return;
  const w=Math.max(1,Math.round(PP.rtEscena.width/3)), h=Math.max(1,Math.round(PP.rtEscena.height/3));
  if(rtRefl.width!==w||rtRefl.height!==h)rtRefl.setSize(w,h);
  camRefl.copy(camara); camRefl.position.y=2*aguaY-cy;
  camRefl.rotation.set(-camara.rotation.x,camara.rotation.y,-camara.rotation.z,'YXZ'); camRefl.updateMatrixWorld(true);
  const manoV=mano.visible; mano.visible=false; const m2=typeof mano2!=='undefined'?mano2:null, mano2V=m2&&m2.visible; if(m2)m2.visible=false;
  mats.forEach(m=>m.uniforms.uClipY.value=aguaY+.06);
  planoRefl.constant=-(aguaY+.06); renderer.clippingPlanes=[planoRefl];
  renderer.setRenderTarget(rtRefl); renderer.render(escena,camRefl);
  renderer.clippingPlanes=[]; mano.visible=manoV; if(m2)m2.visible=mano2V;
  mats.forEach(m=>{m.uniforms.uClipY.value=-1e5;m.uniforms.uReflTex.value=rtRefl.texture;m.uniforms.uAguaY.value=aguaY;m.uniforms.uUsaReflejo.value=1;
    m.uniforms.uReflMat.value.multiplyMatrices(camRefl.projectionMatrix,camRefl.matrixWorldInverse);});
};

/* ---------- Resolución dinámica ---------- */
if(OPC.resDinamica===undefined)OPC.resDinamica=true;
if(OPC.cullNiebla===undefined)OPC.cullNiebla=true;
let escalaDin=1, _fpsVent=[], _resT=0, _ultFrame=performance.now(), fpsMedio=60, _bajos=0, _altos=0;
// La escala solo cambia el tamaño de la imagen interna de los shaders: el lienzo no se
// redimensiona nunca, así que no hay fotogramas en negro al cambiarla
PP.ajustar=function(){
  renderer.getDrawingBufferSize(PP.tam);
  const k=OPC.resDinamica?escalaDin:1;
  const w=Math.max(1,Math.round(PP.tam.x*k)), h=Math.max(1,Math.round(PP.tam.y*k));
  if(PP.rtEscena.width!==w||PP.rtEscena.height!==h){
    PP.rtEscena.setSize(w,h);
    const w4=Math.max(1,Math.floor(w/4)),h4=Math.max(1,Math.floor(h/4));
    for(const r of [PP.rtBri,PP.rtA,PP.rtB,PP.rtRay])r.setSize(w4,h4);
  }
};
function ajustarResolucion(){
  const ahora=performance.now(), dt=ahora-_ultFrame; _ultFrame=ahora;
  if(dt>0&&dt<1000)_fpsVent.push(dt);
  if(_fpsVent.length>240)_fpsVent.shift();
  _resT+=dt; if(_resT<1500)return; _resT=0;
  if(!_fpsVent.length)return;
  const orden=[..._fpsVent].sort((a,b)=>a-b), med=orden[Math.floor(orden.length/2)];
  fpsMedio=1000/med; _fpsVent.length=0;
  if(!OPC.resDinamica||!OPC.shaders||estado!=='jugando'){_bajos=_altos=0;if(!OPC.resDinamica)escalaDin=1;return;}
  // Solo cambia si la tendencia se mantiene (evita subir y bajar sin parar)
  if(fpsMedio<48){_bajos++;_altos=0;}else if(fpsMedio>57){_altos++;_bajos=0;}else{_bajos=_altos=0;}
  if(_bajos>=2&&escalaDin>.6){escalaDin=+Math.max(.6,escalaDin-(fpsMedio<30?.15:.1)).toFixed(2);_bajos=0;}
  else if(_altos>=3&&escalaDin<1){escalaDin=+Math.min(1,escalaDin+.05).toFixed(2);_altos=0;}
}

/* ---------- Contador de FPS ---------- */
if(OPC.verFps===undefined)OPC.verFps=false;
const elFps31=document.createElement('div');
elFps31.id='contadorFps';
elFps31.style.cssText='position:fixed;top:6px;right:8px;z-index:30;font:bold 13px monospace;color:#fff;text-shadow:1px 1px 0 #000;pointer-events:none;display:none';
document.body.appendChild(elFps31);
let _fpsTxtT=0;
(function bucleRend(){
  requestAnimationFrame(bucleRend);
  ajustarResolucion();
  const ver=OPC.verFps&&estado!=='menu';
  elFps31.style.display=ver?'block':'none';
  if(ver&&(_fpsTxtT-=1)<=0){_fpsTxtT=20;
    elFps31.textContent=`${Math.round(fpsMedio)} FPS${escalaDin<1?' · res '+Math.round(escalaDin*100)+'%':''}`;}
})();

/* ---------- Opciones ---------- */
(function(){
  const rej=document.querySelector('.rejillaOpc'); if(!rej||typeof botonOpc!=='function')return;
  const b1=botonOpc(()=>OPC.resDinamica,()=>{OPC.resDinamica=!OPC.resDinamica;if(!OPC.resDinamica)escalaDin=1;},v=>'Resolución dinámica: '+(v?'Sí':'No'));
  b1.dataset.tip='Baja un poco la resolución cuando los FPS caen y la recupera cuando hay margen';
  const b2=botonOpc(()=>OPC.verFps,()=>{OPC.verFps=!OPC.verFps;},v=>'Mostrar FPS: '+(v?'Sí':'No'));
  const b3=botonOpc(()=>OPC.cullNiebla,()=>{OPC.cullNiebla=!OPC.cullNiebla;},v=>'No dibujar tras la niebla: '+(v?'Sí':'No'));
  b3.dataset.tip='Los chunks y criaturas tapados del todo por la niebla no se dibujan';
  const ref=rej.children[1]||null;
  rej.insertBefore(b1,ref); rej.insertBefore(b2,ref); rej.insertBefore(b3,ref);
})();
