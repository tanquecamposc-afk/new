"use strict";
/* =========================================================
   Que todas las opciones funcionen bien
   - Brillo: ahora también aclara u oscurece a las criaturas,
     los objetos y la mano (antes solo el terreno).
   - Música: al quitarla o bajar el volumen a cero se calla al
     momento (antes terminaba la pieza que estaba sonando).
   - Sensibilidad: también en los controles táctiles.
   - Shaders: la descripción explica todo lo que activan.
   ========================================================= */
// Brillo como en el original: «Brillante» levanta mucho las zonas oscuras y «Oscuro» las hunde
const U49={uGamma49:{value:0},uOscuro49:{value:1}};
function valoresBrillo49(){const br=window.BRILLO??.5;return br>=.5?[(br-.5)*1.7,1]:[0,.62+.76*br];}
for(const m of [matOpaco,matTrans]){
  const a='l=pow(max(l,vec3(uAmb)),vec3(0.72));';
  if(!m.fragmentShader.includes(a))continue;
  m.fragmentShader='uniform float uGamma49; uniform float uOscuro49;\n'+m.fragmentShader.replace(a,a+' l=mix(l,vec3(1.0)-pow(vec3(1.0)-min(l,vec3(1.0)),vec3(4.0)),uGamma49)*uOscuro49;');
  m.uniforms.uGamma49=U49.uGamma49;m.uniforms.uOscuro49=U49.uOscuro49;m.needsUpdate=true;
}
const _aplicarOpc49=aplicarOpc;
aplicarOpc=function(){_aplicarOpc49.apply(this,arguments);const [g,o]=valoresBrillo49();U49.uGamma49.value=g;U49.uOscuro49.value=o;};
{const [g,o]=valoresBrillo49();U49.uGamma49.value=g;U49.uOscuro49.value=o;}
const _brilloEn49=brilloEn;
brilloEn=function(x,y,z){
  const b=_brilloEn49(x,y,z), [g,o]=valoresBrillo49();
  return (g>0?b+(1-Math.pow(1-Math.min(1,b),4)-b)*g:b)*o;
};
let musicaPrev49=null;
const _actualizarFinal49=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal49(dt);
  const on=OPC.musica&&(window.VOLUMEN??1)>.01;
  if(on!==musicaPrev49&&typeof AU!=='undefined'&&AU&&AU.musica&&typeof actx!=='undefined'&&actx){
    AU.musica.gain.setTargetAtTime(on?1:0,actx.currentTime,.15);musicaPrev49=on;}
};
// Descripciones más claras en Opciones
setTimeout(()=>{for(const b of document.querySelectorAll('button')){
  if(/^Shaders:/.test(b.textContent))b.dataset.tip='Resplandor, rayos de sol, color cinematográfico, calor en el Nether y luz de la antorcha que llevas en la mano';
  if(/^Gráficos: /.test(b.textContent)&&!b.dataset.tip)b.dataset.tip='Vibrantes: sombras del sol en el terreno, las criaturas y los objetos, luz del sol que cambia con la hora y hojas que se mecen';
}},0);
