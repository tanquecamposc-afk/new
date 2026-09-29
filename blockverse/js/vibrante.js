"use strict";
/* =========================================================
   Gráficos vibrantes (al estilo de Vibrant Visuals): sombras
   reales proyectadas por el sol o la luna, luz direccional
   por cara, luz azulada del cielo en la sombra, niebla que
   brilla hacia el sol y colores más vivos. Se puede cambiar
   a «Rápidos» en Opciones.
   ========================================================= */
let graficosVibrantes=true;
try{graficosVibrantes=localStorage.getItem('blockverse-graficos')!=='rapidos';}catch(e){}
const TAM_SOMBRA=2048, R_SOMBRA=56;
const rtSombra=new THREE.WebGLRenderTarget(TAM_SOMBRA,TAM_SOMBRA,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
const camSombra=new THREE.OrthographicCamera(-R_SOMBRA,R_SOMBRA,R_SOMBRA,-R_SOMBRA,1,460);
camSombra.layers.set(1);
// Profundidad vista desde el sol: las hojas recortan por su textura y el agua y la lava no hacen sombra
const matProfSombra=new THREE.ShaderMaterial({
  uniforms:{mapa:{value:texAtlas}},
  vertexShader:`attribute vec4 tinte; varying vec2 vUv; varying float vModo;
    void main(){vUv=uv; vModo=mod(tinte.w,10.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`#include <packing>
    uniform sampler2D mapa; varying vec2 vUv; varying float vModo;
    void main(){ if(vModo>2.5&&vModo<4.5)discard; if(texture2D(mapa,vUv).a<0.5)discard; gl_FragColor=packDepthToRGBA(gl_FragCoord.z); }`,
  side:THREE.DoubleSide});
const _centroS=new THREE.Vector3(), _colClear=new THREE.Color(), _glow=new THREE.Color();
function pasoSombras(){
  const U=[matOpaco.uniforms,matTrans.uniforms], sup=dim===DIMS.superficie;
  for(const u of U)u.uVibrante.value=graficosVibrantes?1:0;
  // Resplandor de la niebla hacia el sol (más intenso al atardecer)
  const ocaso=sup?clamp(1-Math.abs(sol)/.28,0,1):0, diaF=sup?clamp((sol+.1)/.3,0,1):0;
  const ojo=getBloque(Math.floor(camara.position.x),Math.floor(camara.position.y),Math.floor(camara.position.z));
  const k=esAgua(ojo)||esLava(ojo)?0:(.16*diaF+.5*ocaso)*(lloviendo?.2:1)*(graficosVibrantes?1:.5);
  _glow.setRGB(1,.93,.78).lerp(_tc.setRGB(1,.55,.28),ocaso).multiplyScalar(k);
  for(const u of U)u.uNieblaSol.value.copy(_glow);
  const sd=matOpaco.uniforms.uSolDir.value;
  const activas=graficosVibrantes&&sup&&sd.y>.06&&estado!=='menu';
  if(!activas){for(const u of U)u.uTexelSombra.value=-1;return;}
  // Cámara del sol centrada en el jugador (encajada a una rejilla para que las sombras no tiemblen)
  const paso=R_SOMBRA*2/TAM_SOMBRA*4;
  _centroS.set(Math.round(camara.position.x/paso)*paso,Math.round(camara.position.y/paso)*paso,Math.round(camara.position.z/paso)*paso);
  camSombra.position.copy(_centroS).addScaledVector(sd,220);
  camSombra.up.set(0,1,0); if(Math.abs(sd.y)>.99)camSombra.up.set(0,0,1);
  camSombra.lookAt(_centroS); camSombra.updateMatrixWorld(); camSombra.updateProjectionMatrix();
  const prevFondo=escena.background, prevNiebla=escena.fog;
  renderer.getClearColor(_colClear); const prevAlfa=renderer.getClearAlpha();
  escena.background=null; escena.fog=null; escena.overrideMaterial=matProfSombra;
  renderer.setRenderTarget(rtSombra); renderer.setClearColor(0xffffff,1); renderer.clear(); renderer.render(escena,camSombra);
  renderer.setRenderTarget(null); renderer.setClearColor(_colClear,prevAlfa);
  escena.overrideMaterial=null; escena.background=prevFondo; escena.fog=prevNiebla;
  const mat=new THREE.Matrix4().multiplyMatrices(camSombra.projectionMatrix,camSombra.matrixWorldInverse);
  for(const u of U){u.uSombraMat.value.copy(mat);u.uMapaSombra.value=rtSombra.texture;u.uTexelSombra.value=1/TAM_SOMBRA;}
}

// Botón en Opciones
(function(){
  const listo=document.getElementById('btnListoOpciones'); if(!listo)return;
  const b=document.createElement('button'); b.id='btnGraficos'; b.className='secundario';
  const ayuda=document.createElement('div'); ayuda.className='ayuda';
  const pintar=()=>{b.textContent='Gráficos: '+(graficosVibrantes?'Vibrantes':'Rápidos');
    ayuda.textContent=graficosVibrantes?'Sombras del sol, luz direccional, niebla luminosa y colores vivos.':'Iluminación clásica, más rápida en equipos modestos.';};
  b.onclick=()=>{graficosVibrantes=!graficosVibrantes;try{localStorage.setItem('blockverse-graficos',graficosVibrantes?'vibrantes':'rapidos');}catch(e){}pintar();};
  listo.parentNode.insertBefore(b,listo); listo.parentNode.insertBefore(ayuda,listo); pintar();
})();
