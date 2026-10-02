"use strict";
/* =========================================================
   Shaders que afectan a todo (no solo al terreno y al sol)
   - Sombras del sol también para criaturas, jugadores,
     objetos tirados, bots, la tapa de los cofres…: proyectan
     sombra sobre el suelo y se oscurecen al pasar a la sombra
     de un árbol o un techo (igual que los bloques). Tu propio
     personaje proyecta sombra aunque juegues en primera persona.
   - La mano y lo que llevas en ella también se oscurecen en
     la sombra.
   - La luz direccional de las criaturas sigue al sol y a la
     luna, con su color (dorada al atardecer, azulada de noche).
   - Luz dinámica: una antorcha, un farol, lava o cualquier
     bloque que dé luz en tu mano ilumina el terreno y las
     criaturas a tu alrededor mientras lo llevas.
   - Con sombras reales activas desaparecen los círculos negros
     bajo las criaturas (no hacen falta).
   Todo depende de las opciones: «Gráficos: Vibrantes» para las
   sombras y la luz del sol, y «Shaders» para la luz dinámica.
   ========================================================= */
const TAM_SE48=1024;
const rtSombraEnt48=new THREE.WebGLRenderTarget(TAM_SE48,TAM_SE48,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
const matProfEnt48=new THREE.ShaderMaterial({
  vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'#include <packing>\nvoid main(){gl_FragColor=packDepthToRGBA(gl_FragCoord.z);}',
  side:THREE.DoubleSide});
// Uniformes compartidos por todos los materiales que reciben sombra (se actualizan en un solo sitio)
const U48={uSombraMat48:{value:new THREE.Matrix4()},uMapa48:{value:null},uMapaEnt48:{value:rtSombraEnt48.texture},
  uTexel48:{value:-1},uEntOn48:{value:0},uSolFuerza48:{value:0},uLuzMano48:{value:new THREE.Vector4(0,0,0,0)}};

/* ---------- Terreno: recibe las sombras de las entidades y la luz de la mano ---------- */
function parchearTerreno48(m){
  if(!m||m.userData.p48)return;
  let fs=m.fragmentShader;
  const muestra='suma+=(c.z-bias>unpackRGBAToDepth(texture2D(uMapaSombra,c.xy+o)))?0.0:1.0;';
  const luz='float b=curva(vLuz.g);';
  if(!fs.includes(muestra)||!fs.includes(luz))return;
  fs='uniform sampler2D uMapaEnt48; uniform float uEntOn48; uniform vec4 uLuzMano48;\n'+fs
    .replace(muestra,'float dT=unpackRGBAToDepth(texture2D(uMapaSombra,c.xy+o)); if(uEntOn48>0.5)dT=min(dT,unpackRGBAToDepth(texture2D(uMapaEnt48,c.xy+o))+0.0015); suma+=(c.z-bias>dT)?0.0:1.0;')
    .replace(luz,luz+' if(uLuzMano48.w>0.0){float dm=distance(vWPos,uLuzMano48.xyz); b=max(b,curva(clamp((uLuzMano48.w-dm*0.7)/15.0,0.0,1.0)));}');
  m.fragmentShader=fs;
  m.uniforms.uMapaEnt48=U48.uMapaEnt48; m.uniforms.uEntOn48=U48.uEntOn48; m.uniforms.uLuzMano48=U48.uLuzMano48;
  m.userData.p48=true; m.needsUpdate=true;
}
parchearTerreno48(matOpaco); parchearTerreno48(matTrans);

/* ---------- Criaturas, objetos y la mano: reciben sombra ---------- */
const FS_SOMBRA48=`
uniform mat4 uSombraMat48; uniform sampler2D uMapa48; uniform sampler2D uMapaEnt48; uniform float uTexel48; uniform float uEntOn48; uniform float uSolFuerza48;
varying vec4 vSombra48;
const vec4 UF48=(255.0/256.0)/vec4(256.0*256.0*256.0,256.0*256.0,256.0,1.0);
float sombra48(){
  if(uTexel48<0.0||uSolFuerza48<=0.0)return 1.0;
  vec3 c=vSombra48.xyz/vSombra48.w*0.5+0.5;
  if(c.x<0.0||c.x>1.0||c.y<0.0||c.y>1.0||c.z>1.0)return 1.0;
  float s=0.0;
  for(int i=0;i<4;i++){vec2 o=vec2(i==1?1.0:i==2?-1.0:0.0,i==3?1.0:i==0?-1.0:0.0)*uTexel48*1.2;
    float dT=dot(texture2D(uMapa48,c.xy+o),UF48);
    float dE=uEntOn48>0.5?dot(texture2D(uMapaEnt48,c.xy+o),UF48):1.0;
    s+=(c.z-0.0022>dT||c.z-0.0065>dE)?0.0:1.0;}
  float borde=smoothstep(0.0,0.08,min(min(c.x,1.0-c.x),min(c.y,1.0-c.y)));
  return mix(1.0,s*0.25,borde);
}`;
function parchearMaterial48(mat){
  if(!mat||mat.userData.p48||!(mat.isMeshLambertMaterial||mat.isMeshBasicMaterial||mat.isMeshPhongMaterial||mat.isMeshStandardMaterial))return;
  if(typeof matSombra!=='undefined'&&mat===matSombra)return;
  mat.userData.p48=true;
  const previo=mat.onBeforeCompile;
  mat.onBeforeCompile=function(sh,r){
    if(previo)previo.call(this,sh,r);
    Object.assign(sh.uniforms,U48);
    sh.vertexShader='uniform mat4 uSombraMat48; varying vec4 vSombra48;\n'+sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vSombra48=uSombraMat48*(modelMatrix*vec4(transformed,1.0));');
    sh.fragmentShader=FS_SOMBRA48+'\n'+sh.fragmentShader.replace('#include <envmap_fragment>',
      '#include <envmap_fragment>\n  outgoingLight*=mix(1.0,0.58,(1.0-sombra48())*uSolFuerza48);');
  };
  const k=mat.customProgramCacheKey?mat.customProgramCacheKey.bind(mat):null;
  mat.customProgramCacheKey=()=>(k?k():'')+'|s48';
  mat.needsUpdate=true;
}
// Marca un objeto (y sus hijos) para que proyecte sombra (capa 2) y reciba sombra
function prepararObjeto48(obj,proyecta){
  obj.traverse(o=>{
    if(o.isSprite||o.isPoints||o.isLine)return;
    if(!o.isMesh)return;
    if(typeof matSombra!=='undefined'&&o.material===matSombra)return;
    if(proyecta)o.layers.enable(2);
    for(const m of [].concat(o.material))parchearMaterial48(m);
  });
}

/* ---------- Qué objetos cuentan ---------- */
function objetosEntidad48(){
  const l=[];
  for(const m of mobs)if(m&&!m.muerto&&m.grupo)l.push(m.grupo);
  for(const e of entidades){const o=e.grupo||e.malla;if(o&&!e.muerta)l.push(o);}
  if(typeof modeloJugador!=='undefined'&&modeloJugador&&modeloJugador.g)l.push(modeloJugador.g);
  if(typeof RED!=='undefined'&&RED.remotos)for(const r of RED.remotos.values())if(r&&r.g)l.push(r.g);
  if(typeof tapa!=='undefined'&&tapa&&tapa.g)l.push(tapa.g);
  return l;
}
let repasoT48=0;
function repasarObjetos48(){
  for(const o of objetosEntidad48())prepararObjeto48(o,true);
  prepararObjeto48(mano,false);
  if(typeof mano2!=='undefined')prepararObjeto48(mano2,false);
}

/* ---------- Cada fotograma: sol, sombras de entidades y luz de la mano ---------- */
const _pasoSombras48=pasoSombras;
const _colLuzDir48=new THREE.Color(), _dirLuz48=new THREE.Vector3();
let blobVisible48=true;
function nivelLuzMano48(){
  let L=0;
  for(const p of [inv[ranura],typeof secundaria==='function'?secundaria():null]){
    if(!p)continue;const def=BLOQUES[p.id];if(def&&def.luz)L=Math.max(L,def.luz);
    if(typeof I!=='undefined'&&(p.id===I.cuboLava))L=Math.max(L,15);
  }
  return L;
}
pasoSombras=function(){
  _pasoSombras48();
  const U=matOpaco.uniforms, sup=dim===DIMS.superficie, vib=typeof graficosVibrantes==='undefined'||graficosVibrantes;
  const activas=vib&&sup&&U.uTexelSombra.value>0&&estado!=='menu';
  // Luz del sol en las criaturas: dirección y color del sol o de la luna
  const sd=U.uSolDir.value, dia=sup?clamp((sol+.1)/.3,0,1):0;
  if(vib&&sup){
    _dirLuz48.copy(sd);if(_dirLuz48.y<.05)_dirLuz48.y=.05;
    luzDir.position.copy(_dirLuz48);
    _colLuzDir48.setRGB(U.uColSol.value.x,U.uColSol.value.y,U.uColSol.value.z);
    luzDir.color.copy(_colLuzDir48);luzDir.intensity=.22+.3*dia;
    luzAmb.color.setRGB(U.uCieloAmb.value.x,U.uCieloAmb.value.y,U.uCieloAmb.value.z).multiplyScalar(.95);
  }else{luzDir.position.set(.4,1,.3);luzDir.color.setRGB(1,1,1);luzDir.intensity=.45;luzAmb.color.setRGB(1,1,1);}
  // Repaso periódico de los objetos (aparecen criaturas, se ponen armaduras…)
  const ahora48=performance.now();if(ahora48-repasoT48>500){repasoT48=ahora48;repasarObjetos48();}
  if(!activas){
    U48.uTexel48.value=-1;U48.uEntOn48.value=0;U48.uSolFuerza48.value=0;
    if(!blobVisible48&&typeof matSombra!=='undefined'){matSombra.visible=true;blobVisible48=true;}
  }else{
    U48.uSombraMat48.value.copy(U.uSombraMat.value);U48.uMapa48.value=U.uMapaSombra.value;U48.uTexel48.value=U.uTexelSombra.value;
    U48.uSolFuerza48.value=clamp((sd.y-.06)*6,0,1);
    // Sombras de las entidades: se dibujan desde el sol en su propio mapa, cada fotograma
    const M=typeof modeloJugador!=='undefined'?modeloJugador:null, propio=M&&M.g&&!M.g.visible&&estado==='jugando'&&!(typeof esEspectador==='function'&&esEspectador());
    if(propio){M.g.visible=true;M.g.position.set(jugador.pos.x,jugador.pos.y,jugador.pos.z);M.g.rotation.y=jugador.yaw+Math.PI;}
    const prevFondo=escena.background,prevNiebla=escena.fog,col=new THREE.Color();renderer.getClearColor(col);const alfa=renderer.getClearAlpha();
    escena.background=null;escena.fog=null;escena.overrideMaterial=matProfEnt48;camSombra.layers.set(2);
    renderer.setRenderTarget(rtSombraEnt48);renderer.setClearColor(0xffffff,1);renderer.clear();renderer.render(escena,camSombra);
    renderer.setRenderTarget(null);renderer.setClearColor(col,alfa);
    camSombra.layers.set(1);escena.overrideMaterial=null;escena.background=prevFondo;escena.fog=prevNiebla;
    if(propio)M.g.visible=false;
    U48.uEntOn48.value=1;
    if(blobVisible48&&typeof matSombra!=='undefined'){matSombra.visible=false;blobVisible48=false;}
  }
  // Luz dinámica de lo que llevas en la mano
  const L=OPC.shaders&&estado!=='menu'&&!(typeof esEspectador==='function'&&esEspectador())?nivelLuzMano48():0;
  U48.uLuzMano48.value.set(jugador.pos.x,jugador.pos.y+1.3,jugador.pos.z,L);
};
// Las criaturas y la mano también se iluminan con la luz que llevas
const _brilloEn48=brilloEn;
brilloEn=function(x,y,z){
  const b=_brilloEn48(x,y,z), L=U48.uLuzMano48.value.w;
  if(L<=0)return b;
  const p=U48.uLuzMano48.value, d=Math.hypot(x-p.x,y-p.y,z-p.z), n=Math.max(0,Math.min(15,Math.round(L-d*.7)));
  return n>0?Math.max(b,Math.pow(curvaLuz(n),.72)):b;
};
// Cada criatura nueva se prepara en cuanto aparece
const _crearMob48=crearMob;
crearMob=function(){const m=_crearMob48.apply(this,arguments);if(m&&m.grupo)prepararObjeto48(m.grupo,true);return m;};
repasarObjetos48();
