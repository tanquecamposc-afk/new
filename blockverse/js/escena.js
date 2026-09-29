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
attribute vec3 luz;
varying vec2 vUv; varying vec3 vLuz;
#include <fog_pars_vertex>
void main(){ vUv=uv; vLuz=luz; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const FS_BLOQUES=`
uniform sampler2D mapa; uniform float uDia; uniform float uAmb; uniform float uAlpha; uniform float uOpac; uniform float uTiempo;
varying vec2 vUv; varying vec3 vLuz;
#include <fog_pars_fragment>
float curva(float l){ return l<0.01 ? 0.0 : pow(0.8,(1.0-l)*15.0); }
void main(){
  vec4 t=texture2D(mapa,vUv);
  if(t.a<uAlpha) discard;
  float s=curva(vLuz.r)*uDia; float b=curva(vLuz.g);
  vec3 l=max(vec3(s),vec3(b,b*0.92,b*0.78));
  l=pow(max(l,vec3(uAmb)),vec3(0.72));
  gl_FragColor=vec4(t.rgb*l*vLuz.b,t.a*uOpac);
  #include <fog_fragment>
}`;
function materialBloques(transparente){
  const m=new THREE.ShaderMaterial({
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{mapa:{value:null},uDia:{value:1},uAmb:{value:.02},uAlpha:{value:transparente?.02:.5},uOpac:{value:1},uTiempo:{value:0}}]),
    vertexShader:VS_BLOQUES, fragmentShader:FS_BLOQUES, fog:true, transparent:transparente, depthWrite:!transparente,
    side:transparente?THREE.DoubleSide:THREE.FrontSide});
  m.uniforms.mapa.value=texAtlas;
  return m;
}
const matOpaco=materialBloques(false), matTrans=materialBloques(true);
const matItemBloque=new THREE.MeshBasicMaterial({map:texAtlas,alphaTest:.5});
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
const nubes=new THREE.Mesh(new THREE.PlaneGeometry(64*12*4,64*12*4),
  new THREE.MeshBasicMaterial({map:texNubes,transparent:true,opacity:.85,fog:false,depthWrite:false,side:THREE.DoubleSide}));
nubes.rotation.x=-Math.PI/2; nubes.position.y=OY+128+4; escena.add(nubes);

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

/* ---------- Mano / objeto sostenido ---------- */
const mano=new THREE.Group(); camara.add(mano);
mano.position.set(.48,-.46,-.72);
const brazo=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.6),new THREE.MeshBasicMaterial({color:0xd8a47a}));
brazo.position.set(.05,-.05,.15); brazo.rotation.set(.2,-.2,0);
let manoObjeto=null, manoId=-1, balanceo=0;
function actualizarMano(id,brillo,dt,agachado){
  if(id!==manoId){
    manoId=id; if(manoObjeto){mano.remove(manoObjeto);manoObjeto=null;}
    mano.remove(brazo);
    if(id<=0)mano.add(brazo);
    else if(esCuboItem(id)){manoObjeto=new THREE.Mesh(geoCuboItem(id,.3),new THREE.MeshBasicMaterial({map:texAtlas,alphaTest:.5}));
      manoObjeto.rotation.set(.1,.7,0);mano.add(manoObjeto);}
    else{const t=new THREE.CanvasTexture(LIENZOS[id]);t.magFilter=t.minFilter=THREE.NearestFilter;
      manoObjeto=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),new THREE.MeshBasicMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide}));
      manoObjeto.rotation.set(0,-.9,.3);manoObjeto.position.set(0,.08,0);mano.add(manoObjeto);}
  }
  const m=manoObjeto||brazo; if(m.material.color)m.material.color.setScalar(clamp(brillo,.15,1));
  if(!manoObjeto)brazo.material.color.setRGB(.85*clamp(brillo,.15,1),.64*clamp(brillo,.15,1),.48*clamp(brillo,.15,1));
  balanceo=Math.max(0,balanceo-dt*4);
  const s=Math.sin(balanceo*Math.PI);
  mano.rotation.set(-s*.9,s*.3,0);
  mano.position.set(.48,-.46-(agachado?.03:0)-s*.1,-.72+s*.1);
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
