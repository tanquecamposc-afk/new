"use strict";
/* =========================================================
   Renderizador, cámara, materiales y cielo
   ========================================================= */
const lienzo=document.getElementById('vista');
const renderer=new THREE.WebGLRenderer({canvas:lienzo,antialias:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
const escena=new THREE.Scene();
const CIELO_DIA=new THREE.Color(0x8ecbff), CIELO_NOCHE=new THREE.Color(0x070b1c), CIELO_OCASO=new THREE.Color(0xf2945a), CIELO_LLUVIA=new THREE.Color(0x6d7a88);
const cielo=CIELO_DIA.clone();
escena.background=cielo;
escena.fog=new THREE.Fog(cielo,40,96);
const camara=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.05,1000);
camara.rotation.order='YXZ';
escena.add(camara);

const texAtlas=new THREE.CanvasTexture(atlas);
texAtlas.magFilter=THREE.NearestFilter; texAtlas.minFilter=THREE.NearestFilter; texAtlas.generateMipmaps=false;

const VS_BLOQUES=`
attribute vec3 luz; attribute vec4 tinte;
uniform float uTiempo;
varying vec2 vUv; varying vec3 vLuz; varying vec4 vTinte; varying vec3 vWPos;
#include <fog_pars_vertex>
void main(){
  vUv=uv; vLuz=luz; vTinte=vec4(tinte.rgb,mod(tinte.w,10.0));
  vec3 p=position;
  vec3 w=p+vec3(modelMatrix[3][0],modelMatrix[3][1],modelMatrix[3][2]);
  if(tinte.w>19.5){ // hojas: vaivén suave con el viento
    p.x+=sin(uTiempo*1.3+w.x*.9+w.y*.6)*.035; p.z+=cos(uTiempo*1.1+w.z*.8+w.y*.5)*.035; p.y+=sin(uTiempo*1.7+w.x+w.z)*.015; }
  else if(tinte.w>9.5){
    p.x+=sin(uTiempo*1.8+w.x*.7+w.z*.5)*.06; p.z+=cos(uTiempo*1.4+w.x*.4+w.z*.8)*.06; }
  vWPos=(modelMatrix*vec4(p,1.0)).xyz;
  vec4 mvPosition=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const FS_BLOQUES=`
uniform sampler2D mapa; uniform vec3 uColSol; uniform vec3 uSolDir; uniform vec3 uReflejo; uniform float uDia; uniform float uAmb; uniform float uAlpha; uniform float uOpac; uniform float uTiempo; uniform vec2 uAtlas;
varying vec2 vUv; varying vec3 vLuz; varying vec4 vTinte; varying vec3 vWPos;
#include <fog_pars_fragment>
float curva(float l){ return l<0.01 ? 0.0 : pow(0.8,(1.0-l)*15.0); }
void main(){
  vec2 uv=vUv; float m=vTinte.w;
  if(m>2.5){
    vec2 celda=floor(vUv*uAtlas), loc=fract(vUv*uAtlas);
    if(m<3.5) loc=fract(loc+vec2(uTiempo*.025,uTiempo*.05));
    else if(m<4.5) loc=fract(loc+vec2(sin(uTiempo*.25)*.06,uTiempo*.018));
    else if(m<5.5) loc=fract(loc+vec2(sin(uTiempo*1.3+loc.y*6.0)*.07,uTiempo*.12));
    else loc=fract(loc+vec2(uTiempo*.01,uTiempo*.02));
    uv=(celda+clamp(loc,.03,.97))/uAtlas;
  }
  vec4 t=texture2D(mapa,uv);
  if(t.a<uAlpha) discard;
  vec3 col=t.rgb;
  if(m>.5&&m<1.5){ if(t.a>.97&&t.a<.995) col*=vTinte.rgb; }
  else if(m>1.5&&m<3.5) col*=vTinte.rgb;
  float s=curva(vLuz.r)*uDia; float b=curva(vLuz.g);
  b*=0.95+0.05*sin(uTiempo*7.0+vWPos.x*2.3+vWPos.z*1.7)*step(0.3,vLuz.g);  // parpadeo de antorchas
  vec3 l=max(vec3(s)*uColSol,vec3(b,b*0.92,b*0.78));
  l=pow(max(l,vec3(uAmb)),vec3(0.72));
  if(m>3.5&&m<4.5) l=vec3(1.0);
  vec4 salida=vec4(col*l*vLuz.b,t.a*uOpac);
  if(m>2.5&&m<3.5){  // agua: reflejo del cielo según el ángulo y brillo del sol
    vec3 n=normalize(cross(dFdx(vWPos),dFdy(vWPos))); if(n.y<0.0)n=-n;
    float dist=length(cameraPosition-vWPos), ola=1.0-smoothstep(12.0,48.0,dist);
    if(n.y>0.9)n=normalize(vec3((sin(vWPos.x*1.7+uTiempo*1.3)*.06+sin(vWPos.z*2.9-uTiempo*1.7)*.04)*ola,1.0,(cos(vWPos.z*1.9+uTiempo*1.1)*.06+cos(vWPos.x*2.6+uTiempo)*.04)*ola));
    vec3 v=normalize(cameraPosition-vWPos);
    float fres=pow(1.0-clamp(dot(n,v),0.0,1.0),3.0)*curva(vLuz.r);
    salida.rgb=mix(salida.rgb,uReflejo*max(uDia,.15),fres*.65);
    float spec=pow(max(dot(reflect(-v,n),uSolDir),0.0),mix(24.0,90.0,ola))*s*mix(.35,1.0,ola);
    salida.rgb+=vec3(1.0,.93,.78)*spec*1.4;
    salida.a=clamp(salida.a+fres*.35+spec,0.0,1.0);
  }
  gl_FragColor=salida;
  #include <fog_fragment>
}`;
function materialBloques(transparente){
  const m=new THREE.ShaderMaterial({
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{mapa:{value:null},uDia:{value:1},uAmb:{value:.02},uAlpha:{value:transparente?.02:.5},uOpac:{value:1},uColSol:{value:new THREE.Vector3(1,1,1)},uSolDir:{value:new THREE.Vector3(0,1,0)},uReflejo:{value:new THREE.Color(0x8ecbff)},uTiempo:{value:0},uAtlas:{value:new THREE.Vector2(ATW,ATH)}}]),
    vertexShader:VS_BLOQUES, fragmentShader:FS_BLOQUES, fog:true, transparent:transparente, depthWrite:!transparente,
    side:transparente?THREE.DoubleSide:THREE.FrontSide});
  m.extensions={derivatives:true};
  m.uniforms.mapa.value=texAtlas;
  return m;
}
const matOpaco=materialBloques(false), matTrans=materialBloques(true);
const texIconos=new THREE.CanvasTexture(atlasIconos);
texIconos.magFilter=THREE.NearestFilter; texIconos.minFilter=THREE.NearestFilter; texIconos.generateMipmaps=false;
const matItemBloque=new THREE.MeshBasicMaterial({map:texIconos,alphaTest:.5});
// Luces para criaturas y dragón (el brillo del entorno se aplica en su color)
const luzAmb=new THREE.AmbientLight(0xffffff,.72), luzDir=new THREE.DirectionalLight(0xffffff,.45);
luzDir.position.set(.4,1,.3); escena.add(luzAmb,luzDir);

/* ---------- Nubes ---------- */
const nubesCanvas=document.createElement('canvas');nubesCanvas.width=nubesCanvas.height=64;
(function(){const x=nubesCanvas.getContext('2d'),img=x.createImageData(64,64);
  const periodico=(x,z,p,s)=>{const x0=Math.floor(x),z0=Math.floor(z),fx=smooth(x-x0),fz=smooth(z-z0),m=v=>((v%p)+p)%p;
    const a=hash2(m(x0),m(z0),s),b=hash2(m(x0+1),m(z0),s),c=hash2(m(x0),m(z0+1),s),d=hash2(m(x0+1),m(z0+1),s);
    const ab=a+(b-a)*fx;return ab+((c+(d-c)*fx)-ab)*fz;};
  for(let j=0;j<64;j++)for(let i=0;i<64;i++){
    const v=periodico(i/8,j/8,8,4242)*.7+periodico(i/4,j/4,16,4343)*.3;
    const a=v>.56?235:0, k=(j*64+i)*4; img.data[k]=img.data[k+1]=img.data[k+2]=255; img.data[k+3]=a;}
  x.putImageData(img,0,0);})();
const texNubes=new THREE.CanvasTexture(nubesCanvas);
texNubes.magFilter=THREE.NearestFilter;texNubes.minFilter=THREE.NearestFilter;
texNubes.wrapS=texNubes.wrapT=THREE.RepeatWrapping;texNubes.repeat.set(12,12);
const nubes=new THREE.Group(); nubes.position.y=OY+128+4; escena.add(nubes);

/* ---------- Sol, luna y estrellas ---------- */
function texAstro(fn){const c=document.createElement('canvas');c.width=c.height=16;fn(c.getContext('2d'));
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return t;}
const texSol=texAstro(x=>{x.fillStyle='#fff6b0';x.fillRect(2,2,12,12);x.fillStyle='#ffe066';x.fillRect(4,4,8,8);});
const texLuna=texAstro(x=>{x.fillStyle='#e8ecf4';x.fillRect(3,3,10,10);x.fillStyle='#b9c0cf';x.fillRect(5,5,3,3);x.fillRect(9,8,2,3);x.fillRect(6,10,2,1);});
const matAstro=t=>new THREE.MeshBasicMaterial({map:t,fog:false,transparent:true,depthWrite:false});
const sol3d=new THREE.Mesh(new THREE.PlaneGeometry(60,60),matAstro(texSol));
const luna3d=new THREE.Mesh(new THREE.PlaneGeometry(45,45),matAstro(texLuna));
sol3d.renderOrder=luna3d.renderOrder=-1; escena.add(sol3d,luna3d);
const estrellas=(()=>{const g=new THREE.BufferGeometry(),p=[],r=mulberry32(99);
  for(let i=0;i<600;i++){const u=r()*2-1,a=r()*Math.PI*2,s=Math.sqrt(1-u*u);p.push(Math.cos(a)*s*400,Math.abs(u)*400-20,Math.sin(a)*s*400);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  return new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,fog:false,transparent:true,depthWrite:false}));})();
escena.add(estrellas);
// Estrellas moradas del End
const cieloEnd=(()=>{const g=new THREE.BufferGeometry(),p=[],r=mulberry32(5);
  for(let i=0;i<900;i++){const u=r()*2-1,a=r()*Math.PI*2,s=Math.sqrt(1-u*u);p.push(Math.cos(a)*s*400,u*400,Math.sin(a)*s*400);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  return new THREE.Points(g,new THREE.PointsMaterial({color:0xb48cff,size:2,sizeAttenuation:false,fog:false,transparent:true,opacity:.7,depthWrite:false}));})();
cieloEnd.visible=false; escena.add(cieloEnd);

/* ---------- Lluvia ---------- */
const N_GOTAS=700;
const lluvia=(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(N_GOTAS*6),3));
  const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9fb6d8,transparent:true,opacity:.55,fog:false}));
  l.frustumCulled=false;l.visible=false;return l;})();
escena.add(lluvia);
const gotas=Array.from({length:N_GOTAS},()=>({x:(Math.random()-.5)*40,y:Math.random()*30,z:(Math.random()-.5)*40}));

/* ---------- Contorno y grietas ---------- */
const contorno=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004,1.004,1.004)),
  new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:.55}));
contorno.visible=false; escena.add(contorno);
const texGrietas=(()=>{const r=mulberry32(7),segs=[];
  for(let k=0;k<5;k++){let x=7+r()*2,y=7+r()*2;for(let s=0;s<8;s++){const a=r()*Math.PI*2;const nx=clamp(x+Math.cos(a)*2.4,0,15),ny=clamp(y+Math.sin(a)*2.4,0,15);segs.push([x,y,nx,ny]);x=nx;y=ny;}}
  const res=[];
  for(let e=0;e<10;e++){const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='rgba(0,0,0,.75)';
    const n=Math.ceil(segs.length*(e+1)/10);
    for(let i=0;i<n;i++){const [x0,y0,x1,y1]=segs[i];const m=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
      for(let t=0;t<=m;t++)x.fillRect(Math.round(x0+(x1-x0)*t/m),Math.round(y0+(y1-y0)*t/m),1,1);}
    const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;res.push(t);}
  return res;})();
const grietas=new THREE.Mesh(new THREE.BoxGeometry(1.006,1.006,1.006),
  new THREE.MeshBasicMaterial({map:texGrietas[0],transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
grietas.visible=false; escena.add(grietas);

/* ---------- Cubos y sprites de objetos (compartidos) ---------- */
const geoCubos={}, matSprites={};
function geoCuboItem(id,tam=.26){
  const k=id+':'+tam; if(geoCubos[k])return geoCubos[k];
  const g=new THREE.BoxGeometry(tam,tam,tam), uv=g.attributes.uv, b=BLOQUES[id];
  for(let f=0;f<6;f++){const t=f===2?b.arriba:f===3?b.abajo:b.lado, q=uvTile(t);
    for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,lerp(q.u0,q.u1,uv.getX(i)),lerp(q.v0,q.v1,uv.getY(i)));}}
  return geoCubos[k]=g;
}
function matSprite(id){
  if(matSprites[id])return matSprites[id];
  const t=new THREE.CanvasTexture(LIENZOS[id]);t.magFilter=t.minFilter=THREE.NearestFilter;
  return matSprites[id]=new THREE.SpriteMaterial({map:t,alphaTest:.5});
}
const esCuboItem=id=>ITEMS[id]&&ITEMS[id].bloque&&(FORMA[id]===0||FORMA[id]===1);
// Objeto en 3D: cada píxel del icono se convierte en un bloquecito con grosor
const geoExtr={};
function geoExtruida(id,tam=.42){
  const k=id+':'+tam; if(geoExtr[k])return geoExtr[k];
  const c=LIENZOS[id], w=c.width, h=c.height, d=c.getContext('2d').getImageData(0,0,w,h).data;
  const pos=[],col=[], px=tam/w, gz=tam/16/2;
  const op=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&d[(y*w+x)*4+3]>100;
  const quad=(a,b,c2,e,r,g,bb)=>{pos.push(...a,...b,...c2,...a,...c2,...e);for(let i=0;i<6;i++)col.push(r,g,bb);};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(!op(x,y))continue;
    const i=(y*w+x)*4, r=d[i]/255, g=d[i+1]/255, b=d[i+2]/255;
    const x0=-tam/2+x*px, x1=x0+px, y1=tam/2-y*px, y0=y1-px;
    quad([x0,y0,gz],[x1,y0,gz],[x1,y1,gz],[x0,y1,gz],r,g,b);
    quad([x1,y0,-gz],[x0,y0,-gz],[x0,y1,-gz],[x1,y1,-gz],r*.78,g*.78,b*.78);
    if(!op(x-1,y))quad([x0,y0,-gz],[x0,y0,gz],[x0,y1,gz],[x0,y1,-gz],r*.66,g*.66,b*.66);
    if(!op(x+1,y))quad([x1,y0,gz],[x1,y0,-gz],[x1,y1,-gz],[x1,y1,gz],r*.66,g*.66,b*.66);
    if(!op(x,y-1))quad([x0,y1,gz],[x1,y1,gz],[x1,y1,-gz],[x0,y1,-gz],r*.9,g*.9,b*.9);
    if(!op(x,y+1))quad([x0,y0,-gz],[x1,y0,-gz],[x1,y0,gz],[x0,y0,gz],r*.55,g*.55,b*.55);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return geoExtr[k]=geo;
}
const matExtruido=()=>new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
const esHerramientaMano=id=>{const it=ITEMS[id];return !!(it&&(it.herr||it.tipoHerr==='arco'||it.tipoHerr==='mechero'||it.tipoHerr==='pincel'));};

/* ---------- Mano / objeto sostenido ---------- */
const mano=new THREE.Group(); camara.add(mano);
mano.position.set(.48,-.46,-.72);
const brazo=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.6),new THREE.MeshBasicMaterial({color:0xd8a47a}));
brazo.position.set(.05,-.05,.15); brazo.rotation.set(.2,-.2,0);
let manoObjeto=null, manoId=-1, balanceo=0, cambioMano=0, yawMano=0, pitchMano=0, swayX=0, swayY=0;
function actualizarMano(id,brillo,dt,agachado){
  if(id!==manoId){
    manoId=id; cambioMano=1; if(manoObjeto){mano.remove(manoObjeto);manoObjeto=null;}
    mano.remove(brazo);
    if(id<=0)mano.add(brazo);
    else if(esCuboItem(id)){manoObjeto=new THREE.Mesh(geoCuboItem(id,.3),new THREE.MeshBasicMaterial({map:texIconos,alphaTest:.5}));
      manoObjeto.rotation.set(.1,.7,0);mano.add(manoObjeto);}
    else if(id===597){manoObjeto=modeloEscudo();manoObjeto.scale.setScalar(.7);manoObjeto.rotation.set(0,-.45,0);manoObjeto.position.set(-.02,.02,0);mano.add(manoObjeto);}
    else if(id===540){manoObjeto=modeloMaza();manoObjeto.scale.setScalar(1.25);manoObjeto.rotation.set(-.35,-.6,.25);manoObjeto.position.set(0,.1,0);mano.add(manoObjeto);}
    else if(LIENZOS[id]&&LIENZOS[id].width===16){
      const herr=esHerramientaMano(id);
      manoObjeto=new THREE.Mesh(geoExtruida(id,herr?.44:.38),matExtruido());
      if(herr){manoObjeto.rotation.set(.12,-1.3,.42);manoObjeto.position.set(.04,.12,.02);}
      else{manoObjeto.rotation.set(0,-.9,.3);manoObjeto.position.set(0,.08,0);}
      mano.add(manoObjeto);}
    else{const t=new THREE.CanvasTexture(LIENZOS[id]);t.magFilter=t.minFilter=THREE.NearestFilter;
      manoObjeto=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),new THREE.MeshBasicMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide}));
      manoObjeto.rotation.set(0,-.9,.3);manoObjeto.position.set(0,.08,0);mano.add(manoObjeto);}
  }
  const m=manoObjeto||brazo, b=clamp(brillo,.15,1);
  if(manoObjeto){if(m.material)m.material.color.setScalar(b);}else brazo.material.color.setRGB(.85*b,.64*b,.48*b);
  balanceo=Math.max(0,balanceo-dt*3.4); cambioMano=Math.max(0,cambioMano-dt*5);
  // Golpe en arco como en el original: el brazo baja, gira y vuelve
  const t=1-balanceo, sw=balanceo>0?Math.sin(Math.sqrt(t)*Math.PI):0, sw2=balanceo>0?Math.sin(t*Math.PI):0;
  const recarga=(typeof cargaAtaque==='function'&&esHerramientaMano(id))?(1-cargaAtaque())*.14:0;
  // Balanceo al girar la cámara
  const dYaw=((jugador.yaw-yawMano+Math.PI*3)%(Math.PI*2))-Math.PI, dPitch=jugador.pitch-pitchMano;
  yawMano=jugador.yaw; pitchMano=jugador.pitch;
  swayX+=(clamp(dYaw*2.2,-.12,.12)-swayX)*Math.min(1,dt*8); swayY+=(clamp(-dPitch*2.2,-.1,.1)-swayY)*Math.min(1,dt*8);
  let px=.48-sw*.26+swayX,py=-.46-(agachado?.03:0)+sw2*.14-sw*.12-cambioMano*.35-recarga+swayY+Math.sin(tiempoJuego*1.6)*.005,pz=-.72-sw*.16,
    rx=-sw*1.15+sw2*.25+Math.sin(tiempoJuego*1.1)*.01, ry=sw*.55, rz=-sw2*.3;
  if(typeof comiendo!=='undefined'&&comiendo>=0){px=.18;py=-.36+Math.abs(Math.sin(comiendo*14))*.05;pz=-.5;rx=.3;ry=.6;}
  if(typeof arcoCarga!=='undefined'&&arcoCarga>=0){const c=Math.min(1,arcoCarga);px=.2;py=-.3;pz=-.55+c*.12;rz=-.4;ry=.2;
    if(manoObjeto)manoObjeto.position.x=Math.sin(tiempoJuego*40)*.004*c;}
  if(typeof escudoArriba!=='undefined'&&escudoArriba){px=.2;py=-.36;pz=-.6;rx=0;ry=.25;rz=0;}
  if(typeof faseCamara!=='undefined'&&jugador.suelo){px+=Math.cos(faseCamara)*.012;py+=Math.abs(Math.sin(faseCamara))*.012;}
  mano.rotation.set(rx,ry,rz);
  mano.position.set(px,py,pz);
}
function balancearMano(){if(balanceo<=.3)balanceo=1;}

/* ---------- Partículas ---------- */
const particulas=[];
const geoPart=new THREE.BoxGeometry(.08,.08,.08);
const colorTile=[];
(function(){const ctx=atlas.getContext('2d');for(let t=0;t<NT;t++){const d=ctx.getImageData((t%ATW)*TS,Math.floor(t/ATW)*TS,TS,TS).data;
  let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>100){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
  colorTile[t]=new THREE.Color(r/(n||1)/255,g/(n||1)/255,b/(n||1)/255);}})();
function emitirParticulas(x,y,z,color,n,vel=2.5,vida=.7,grav=12){
  for(let i=0;i<n;i++){
    if(particulas.length>260)break;
    const m=new THREE.Mesh(geoPart,new THREE.MeshBasicMaterial({color}));
    m.position.set(x+(Math.random()-.5)*.6,y+(Math.random()-.5)*.6,z+(Math.random()-.5)*.6);
    escena.add(m);
    particulas.push({m,v:new THREE.Vector3((Math.random()-.5)*vel,Math.random()*vel,(Math.random()-.5)*vel),vida:vida*(.6+Math.random()*.6),grav});
  }
}
function actualizarParticulas(dt){
  for(let i=particulas.length-1;i>=0;i--){
    const p=particulas[i]; p.vida-=dt; p.v.y-=p.grav*dt; p.m.position.addScaledVector(p.v,dt);
    if(p.vida<=0){escena.remove(p.m);p.m.material.dispose();particulas.splice(i,1);}
  }
}
