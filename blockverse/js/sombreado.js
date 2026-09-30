"use strict";
/* =========================================================
   Sombreado cinematográfico (como los shaders del original):
   la escena se dibuja en una textura y se le aplica resplandor
   (bloom) en lo brillante (sol, lava, piedra luminosa,
   antorchas), rayos de sol que atraviesan los árboles, color
   según la hora y la dimensión (amaneceres dorados, noches
   azuladas, Nether rojizo con calor que ondula el aire, End
   violáceo), contraste, saturación y viñeta. Además: cielo
   del End con su textura de siempre, ojos que brillan en la
   oscuridad (enderman, araña, ahogado), partículas flotantes
   en cada bioma del Nether y partículas moradas de los
   enderman.
   ========================================================= */
if(OPC.shaders===undefined)OPC.shaders=!('ontouchstart' in window&&navigator.maxTouchPoints>0);

const PP=(()=>{
  const opcRT={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,depthBuffer:false,stencilBuffer:false};
  const rtEscena=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat});
  const rtBri=new THREE.WebGLRenderTarget(4,4,opcRT), rtA=new THREE.WebGLRenderTarget(4,4,opcRT), rtB=new THREE.WebGLRenderTarget(4,4,opcRT), rtRay=new THREE.WebGLRenderTarget(4,4,opcRT);
  const camPP=new THREE.OrthographicCamera(-1,1,1,-1,0,1), escPP=new THREE.Scene();
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null); quad.frustumCulled=false; escPP.add(quad);
  const vs='varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}';
  const mat=(u,fs)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,depthTest:false,depthWrite:false});
  const matBri=mat({t:{value:null},uUmbral:{value:.8}},`uniform sampler2D t; uniform float uUmbral; varying vec2 vUv;
    void main(){vec3 c=texture2D(t,vUv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); float k=smoothstep(uUmbral,uUmbral+.18,l);
      gl_FragColor=vec4(c*k,1.0);}`);
  const matBlur=mat({t:{value:null},uDir:{value:new THREE.Vector2()}},`uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
    void main(){vec3 s=texture2D(t,vUv).rgb*.227;
      s+=(texture2D(t,vUv+uDir*1.385).rgb+texture2D(t,vUv-uDir*1.385).rgb)*.316;
      s+=(texture2D(t,vUv+uDir*3.231).rgb+texture2D(t,vUv-uDir*3.231).rgb)*.070;
      gl_FragColor=vec4(s,1.0);}`);
  const matRayos=mat({t:{value:null},uSol:{value:new THREE.Vector2(.5,.5)},uAspecto:{value:1}},`uniform sampler2D t; uniform vec2 uSol; uniform float uAspecto; varying vec2 vUv;
    void main(){vec2 d=(vUv-uSol)*(1.0/28.0)*.92; vec2 p=vUv; float peso=1.0; vec3 s=vec3(0.0);
      for(int i=0;i<28;i++){p-=d; vec2 q=(p-uSol)*vec2(uAspecto,1.0); float cerca=exp(-dot(q,q)*5.0);
        s+=texture2D(t,clamp(p,0.0,1.0)).rgb*peso*cerca; peso*=.955;}
      gl_FragColor=vec4(s/14.0,1.0);}`);
  const matFinal=mat({tEsc:{value:null},tBloom:{value:null},tRay:{value:null},uBloom:{value:.4},uRayos:{value:0},uColRayo:{value:new THREE.Color(1,.85,.6)},
      uTinte:{value:new THREE.Vector3(1,1,1)},uSat:{value:1.1},uContraste:{value:1.05},uVineta:{value:.35},uCalor:{value:0},uTiempo:{value:0},uExpo:{value:1}},
    `uniform sampler2D tEsc,tBloom,tRay; uniform float uBloom,uRayos,uSat,uContraste,uVineta,uCalor,uTiempo,uExpo; uniform vec3 uColRayo,uTinte; varying vec2 vUv;
    void main(){
      vec2 uv=vUv;
      if(uCalor>0.0){uv.x+=sin(uv.y*55.0+uTiempo*3.1)*.0011*uCalor; uv.y+=cos(uv.x*48.0+uTiempo*2.3)*.0009*uCalor;}
      vec3 c=texture2D(tEsc,uv).rgb*uExpo;
      c+=texture2D(tBloom,vUv).rgb*uBloom;
      c+=texture2D(tRay,vUv).rgb*uColRayo*uRayos;
      c*=uTinte;
      float l=dot(c,vec3(.2126,.7152,.0722));
      c=mix(vec3(l),c,uSat);
      c=(c-.5)*uContraste+.5;
      c=c/(1.0+max(c-1.0,0.0)*.5);                 // compresión suave de las luces altas
      vec2 v=vUv-.5; c*=1.0-dot(v,v)*uVineta*1.6;
      gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}`);
  const tam=new THREE.Vector2();
  function pase(m,destino){quad.material=m;renderer.setRenderTarget(destino);renderer.render(escPP,camPP);}
  function ajustar(){
    renderer.getDrawingBufferSize(tam);
    if(rtEscena.width!==tam.x||rtEscena.height!==tam.y){
      rtEscena.setSize(tam.x,tam.y);
      const w=Math.max(1,Math.floor(tam.x/4)),h=Math.max(1,Math.floor(tam.y/4));
      for(const r of [rtBri,rtA,rtB,rtRay])r.setSize(w,h);
    }
  }
  return {rtEscena,rtBri,rtA,rtB,rtRay,matBri,matBlur,matRayos,matFinal,pase,ajustar,tam};
})();

// Ajustes de color según la hora, el clima y la dimensión (se suavizan con el tiempo)
const gradoObj={bloom:.35,umbral:.82,sat:1.12,con:1.05,tinte:new THREE.Vector3(1,1,1),calor:0,expo:1,vineta:.35};
const gradoAct={bloom:.35,umbral:.82,sat:1.12,con:1.05,tinte:new THREE.Vector3(1,1,1),calor:0,expo:1,vineta:.35};
const _v3=new THREE.Vector3(), _dirCam=new THREE.Vector3();
function calcularGrado(){
  const g=gradoObj, c=camara.position;
  const ojo=getBloque(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z));
  g.calor=0; g.expo=1; g.vineta=.35;
  if(esAgua(ojo)){g.bloom=.25;g.umbral=.8;g.sat=1.05;g.con=1.02;g.tinte.set(.85,.97,1.12);g.vineta=.6;return;}
  if(dim===DIMS.nether){g.bloom=.9;g.umbral=.58;g.sat=1.08;g.con=1.12;g.tinte.set(1.02,.98,.97);g.calor=1;g.vineta=.5;return;}
  if(dim===DIMS.end){g.bloom=.6;g.umbral=.62;g.sat=1.15;g.con=1.08;g.tinte.set(1.02,.95,1.12);g.vineta=.5;return;}
  const dia=clamp((sol+.1)/.4,0,1), ocaso=clamp(1-Math.abs(sol)/.28,0,1)*(lloviendo?.2:1);
  g.bloom=.3+ocaso*.35+(1-dia)*.35; g.umbral=.84-(1-dia)*.3-ocaso*.08; g.sat=1.08+ocaso*.12-(lloviendo?.15:0); g.con=1.06;
  g.tinte.set(1,1,1).lerp(_v3.set(.86,.93,1.16),(1-dia)*.8).lerp(_v3.set(1.16,1.0,.82),ocaso*.8);
  if(lloviendo)g.tinte.lerp(_v3.set(.95,.98,1.02),.5);
  // Bajo tierra y en cuevas: más resplandor para las antorchas y la lava
  let cielo=15; try{cielo=luzEn(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z))>>4;}catch(e){}
  if(cielo<6){const k=1-cielo/6;g.bloom+=k*.45;g.umbral-=k*.22;g.vineta+=k*.2;}
}
function suavizarGrado(dt){
  const k=Math.min(1,dt*2.5), a=gradoAct, o=gradoObj;
  for(const p of ['bloom','umbral','sat','con','calor','expo','vineta'])a[p]+=(o[p]-a[p])*k;
  a.tinte.lerp(o.tinte,k);
}
const _solPant=new THREE.Vector3();
let rayosAct=0, ultimoRender=performance.now();
function renderizarFinal(){
  if(!OPC.shaders){renderer.setRenderTarget(null);renderer.render(escena,camara);return;}
  const ahora=performance.now(), dt=Math.min(.1,(ahora-ultimoRender)/1000); ultimoRender=ahora;
  calcularGrado(); suavizarGrado(dt);
  PP.ajustar();
  renderer.setRenderTarget(PP.rtEscena); renderer.render(escena,camara);
  const g=gradoAct, w=PP.rtA.width, h=PP.rtA.height;
  PP.matBri.uniforms.t.value=PP.rtEscena.texture; PP.matBri.uniforms.uUmbral.value=g.umbral; PP.pase(PP.matBri,PP.rtBri);
  const blur=(src,dst,dx,dy)=>{PP.matBlur.uniforms.t.value=src.texture;PP.matBlur.uniforms.uDir.value.set(dx/w,dy/h);PP.pase(PP.matBlur,dst);};
  blur(PP.rtBri,PP.rtA,1,0); blur(PP.rtA,PP.rtB,0,1); blur(PP.rtB,PP.rtA,2.2,0); blur(PP.rtA,PP.rtB,0,2.2);
  // Rayos de sol (o de luna, más tenues)
  let rayos=0;
  const mf=PP.matFinal.uniforms;
  if(dim===DIMS.superficie&&!lloviendo&&typeof sol3d!=='undefined'){
    const esSol=sol>-.08, astro=esSol?sol3d:luna3d;
    camara.getWorldDirection(_dirCam); _solPant.copy(astro.position).sub(camara.position).normalize();
    const frente=_dirCam.dot(_solPant);
    if(frente>0){
      _solPant.copy(astro.position).project(camara);
      const sx=_solPant.x*.5+.5, sy=_solPant.y*.5+.5;
      const borde=clamp(1-Math.max(Math.abs(sx-.5),Math.abs(sy-.5))*1.4+.2,0,1);
      rayos=frente*borde*(esSol?clamp((sol+.08)*4,0,1)*(1.1-clamp(sol,0,1)*.45):.35);
      PP.matRayos.uniforms.uSol.value.set(sx,sy); PP.matRayos.uniforms.uAspecto.value=PP.tam.x/PP.tam.y;
      mf.uColRayo.value.setRGB(...(esSol?[1,.82+clamp(sol,0,1)*.15,.55+clamp(sol,0,1)*.35]:[.55,.65,1]));
    }
  }
  rayosAct+=(rayos-rayosAct)*Math.min(1,dt*4);
  if(rayosAct>.01){PP.matRayos.uniforms.t.value=PP.rtBri.texture;PP.pase(PP.matRayos,PP.rtRay);}
  mf.tEsc.value=PP.rtEscena.texture; mf.tBloom.value=PP.rtB.texture; mf.tRay.value=PP.rtRay.texture;
  mf.uBloom.value=g.bloom; mf.uRayos.value=rayosAct*.9; mf.uTinte.value.copy(g.tinte); mf.uSat.value=g.sat; mf.uContraste.value=g.con;
  mf.uVineta.value=g.vineta; mf.uCalor.value=g.calor; mf.uTiempo.value=tiempoJuego; mf.uExpo.value=g.expo;
  PP.pase(PP.matFinal,null);
}

/* ---------- Cielo del End ---------- */
const cieloEndTex=(()=>{
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),r=mulberry32(909);
  x.fillStyle='#231a28';x.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){const v=r();const s=1+Math.floor(r()*3);
    x.fillStyle=v<.5?`rgba(12,8,16,${.3+r()*.5})`:`rgba(${70+r()*40|0},${55+r()*30|0},${80+r()*40|0},${.25+r()*.4})`;
    x.fillRect(Math.floor(r()*128),Math.floor(r()*128),s*2,s);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);t.magFilter=THREE.NearestFilter;return t;})();
const cajaEnd=new THREE.Mesh(new THREE.BoxGeometry(700,700,700),new THREE.MeshBasicMaterial({map:cieloEndTex,side:THREE.BackSide,fog:false,depthWrite:false}));
cajaEnd.renderOrder=-9; cajaEnd.visible=false; escena.add(cajaEnd);

/* ---------- Ojos que brillan ---------- */
const OJOS_BRILLAN={enderman:0xd060ff,arana:0xff2020,ahogado:0x7ff0ff};
const _crearMobSomb=crearMob;
crearMob=function(tipo,x,y,z,opc){
  const m=_crearMobSomb(tipo,x,y,z,opc);
  const col=OJOS_BRILLAN[tipo];
  if(col&&m&&m.grupo)m.grupo.traverse(o=>{if(o.isMesh&&o.userData.base&&o.userData.base.getHex()===col){
    delete o.userData.base; o.material.color.setHex(col); if(o.material.emissive)o.material.emissive.setHex(col);}});
  return m;
};

/* ---------- Partículas flotantes del Nether y del End ---------- */
const PART_NETHER={[BN.carmesi]:[0xc0202a,.5,-.15],[BN.distorsionado]:[0x3ad8c8,.5,-.15],[BN.valle]:[0x9ab8c8,.6,-.4],[BN.deltas]:[0xeaeaea,.9,.6],[BN.desierto]:[0xff8a3a,.3,-.3]};
function particulasDimension(dt){
  if(estado!=='jugando'||OPC.particulas===0)return;
  const j=jugador.pos;
  if(dim===DIMS.nether){
    const bio=biomaNether(Math.floor(j.x),Math.floor(j.z)), p=PART_NETHER[bio]||PART_NETHER[BN.desierto];
    const n=Math.random()<(dt*(bio===BN.desierto?8:30))%1?Math.ceil(dt*(bio===BN.desierto?8:30)):Math.floor(dt*(bio===BN.desierto?8:30));
    for(let k=0;k<n;k++){const x=j.x+(Math.random()-.5)*20,y=j.y+(Math.random()-.3)*10,z=j.z+(Math.random()-.5)*20;
      if(getBloque(Math.floor(x),Math.floor(y),Math.floor(z)))continue;
      emitirParticulas(x,y,z,p[0],1,p[1]*.4,3.5,p[2]);}
    // Almas que suben del valle
    if(bio===BN.valle&&Math.random()<dt*.8){const x=Math.floor(j.x+(Math.random()-.5)*16),z=Math.floor(j.z+(Math.random()-.5)*16);
      for(let y=Math.floor(j.y)+6;y>Math.floor(j.y)-8;y--){const b=getBloque(x,y,z);if(b===B.arenaAlmas||b===B.sueloAlmas){if(!getBloque(x,y+1,z))emitirParticulas(x+.5,y+1.1,z+.5,0x80d8ff,1,.2,2.5,-.8);break;}}}
  }
  // Los enderman sueltan partículas moradas
  for(const m of mobs)if(m.tipo==='enderman'&&!m.muerto&&Math.random()<dt*5&&m.pos.distanceTo(j)<32)
    emitirParticulas(m.pos.x+(Math.random()-.5)*.8,m.pos.y+Math.random()*2.8,m.pos.z+(Math.random()-.5)*.8,Math.random()<.5?0xb040ff:0x7a20c0,1,.6,1,0);
}

/* ---------- Cada fotograma ---------- */
const _actualizarFinalSomb=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalSomb(dt);
  particulasDimension(dt);
};
(function bucleSomb(){
  requestAnimationFrame(bucleSomb);
  const enEnd=dim===DIMS.end;
  cajaEnd.visible=enEnd; if(enEnd){cajaEnd.position.copy(camara.position);if(typeof cieloEnd!=='undefined')cieloEnd.visible=false;}
})();

/* ---------- Opción en el menú ---------- */
(function(){
  const rej=document.querySelector('.rejillaOpc'); if(!rej)return;
  const b=botonOpc(()=>OPC.shaders,()=>{OPC.shaders=!OPC.shaders;},v=>'Shaders: '+(v?'Sí':'No'));
  b.dataset.tip='Resplandor, rayos de sol, color cinematográfico y calor en el Nether';
  rej.insertBefore(b,rej.firstChild.nextSibling.nextSibling);
})();
