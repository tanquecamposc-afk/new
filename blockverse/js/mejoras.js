"use strict";
/* =========================================================
   Mejoras: cielo con degradado y ocasos, nubes en 3D, luz
   de color según la hora, escudo, caballos con silla y
   setas gigantes con harina de hueso.
   ========================================================= */
Object.assign(SND,{
  escudo:v=>{tonoSnd(260,120,.12,'square',.12*v);ruidoSnd(.1,900,.2*v);},
  caballo:v=>{tonoSnd(520,300,.18,'sawtooth',.05*v);tonoSnd(600,360,.25,'sawtooth',.05*v,.16);},
  encabritar:v=>{tonoSnd(700,260,.4,'sawtooth',.07*v);ruidoSnd(.2,500,.15*v);},
});

/* ---------- Cúpula del cielo: degradado, halo del sol y ocasos ---------- */
const cupula=new THREE.Mesh(new THREE.SphereGeometry(450,32,16),new THREE.ShaderMaterial({
  uniforms:{uHor:{value:new THREE.Color()},uCen:{value:new THREE.Color()},uSol:{value:new THREE.Vector3(0,1,0)},
    uOcaso:{value:new THREE.Color(0xff6a2a)},uOcasoF:{value:0},uSolF:{value:0}},
  vertexShader:`varying vec3 vDir; void main(){vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform vec3 uHor,uCen,uSol,uOcaso; uniform float uOcasoF,uSolF; varying vec3 vDir;
  void main(){
    vec3 d=normalize(vDir); float y=d.y;
    vec3 col=mix(uHor,uCen,pow(clamp(y,0.0,1.0),0.55));
    float s=max(dot(d,uSol),0.0), banda=exp(-abs(y-0.03)*4.5);
    col=mix(col,uOcaso,clamp(uOcasoF*(pow(s,4.0)*0.85+0.16)*banda,0.0,1.0));
    col+=vec3(1.0,0.86,0.62)*uSolF*(pow(s,90.0)*0.7+pow(s,12.0)*0.16);
    gl_FragColor=vec4(col,1.0);
  }`,
  side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false}));
cupula.renderOrder=-10; cupula.frustumCulled=false; escena.add(cupula);

// Sol y luna con halo (texturas de 32x32)
(function(){
  const lienzo=(dibujar)=>{const c=document.createElement('canvas');c.width=c.height=32;dibujar(c.getContext('2d'));
    const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return t;};
  sol3d.material.map=lienzo(x=>{
    for(let k=0;k<6;k++){x.fillStyle=`rgba(255,${230-k*10},${150-k*18},${.07+k*.03})`;x.fillRect(k*2,k*2,32-k*4,32-k*4);}
    x.fillStyle='#fff3a8';x.fillRect(9,9,14,14);x.fillStyle='#fffbe0';x.fillRect(11,11,10,10);x.fillStyle='#ffffff';x.fillRect(13,13,6,6);});
  luna3d.material.map=lienzo(x=>{
    for(let k=0;k<4;k++){x.fillStyle=`rgba(190,210,255,${.04+k*.03})`;x.fillRect(4+k*2,4+k*2,24-k*4,24-k*4);}
    x.fillStyle='#e6ebf5';x.fillRect(11,11,10,10);x.fillStyle='#b4bccb';x.fillRect(12,12,3,3);x.fillRect(17,15,2,3);x.fillRect(13,18,3,2);x.fillStyle='#cfd6e2';x.fillRect(18,12,2,2);});
  sol3d.geometry=new THREE.PlaneGeometry(95,95); luna3d.geometry=new THREE.PlaneGeometry(70,70);
  sol3d.material.needsUpdate=luna3d.material.needsUpdate=true;
})();

// Color de la luz del cielo sobre los bloques (cálida al atardecer, azulada de noche)
const _cen=new THREE.Color(), _tc=new THREE.Color(), _colSol=new THREE.Vector3(1,1,1), _tv=new THREE.Vector3();
for(const m of [matOpaco,matTrans])m.uniforms.uColSol={value:new THREE.Vector3(1,1,1)};
function mejorarCielo(sup,ojo,oscuro){
  cupula.visible=sup&&!esAgua(ojo)&&!esLava(ojo)&&oscuro<.05;
  _colSol.set(1,1,1);
  if(sup){
    const a=tiempoDia*Math.PI*2, u=cupula.material.uniforms;
    cupula.position.copy(camara.position);
    u.uSol.value.set(Math.cos(a)*350,Math.sin(a)*350,40).normalize();
    const fDia=clamp((sol+.15)/.45,0,1), ocaso=clamp(1-Math.abs(sol)/.28,0,1)*(lloviendo?.12:1);
    u.uHor.value.copy(cielo);
    _cen.copy(cielo).multiply(_tc.setRGB(.55,.72,.95));
    if(!lloviendo)_cen.lerp(_tc.setRGB(.24,.45,.9),.22*fDia);
    u.uCen.value.copy(_cen);
    u.uOcasoF.value=ocaso*.9; u.uSolF.value=clamp((sol+.08)/.25,0,1)*(lloviendo?.12:1);
    _colSol.lerp(_tv.set(1,.8,.62),ocaso*.75).lerp(_tv.set(.62,.72,1),(1-fDia)*.85);
    luzAmb.color.setRGB(_colSol.x,_colSol.y,_colSol.z);
  }else luzAmb.color.setRGB(1,1,1);
  for(const m of [matOpaco,matTrans]){const u=m.uniforms;u.uColSol.value.copy(_colSol);u.uTiempo.value=tiempoJuego;
    if(sup){const a=tiempoDia*Math.PI*2,sd=Math.sin(a)>-.05?1:-1;u.uSolDir.value.set(Math.cos(a)*350*sd,Math.sin(a)*350*sd,40*sd).normalize();}
    u.uReflejo.value.copy(cielo).lerp(_tc.setRGB(1,1,1),.12);}
}

/* ---------- Nubes en 3D (bloques de 8x4x8 con caras sombreadas) ---------- */
const NUBE_C=12, NUBE_H=4, NUBE_T=64*NUBE_C, NUBE_Y=NIVEL_MAR+108;
const matNubes=new THREE.ShaderMaterial({
  uniforms:{uBr:{value:1},uLuz:{value:new THREE.Vector3(1,1,1)},uHor:{value:new THREE.Color()},uCam:{value:new THREE.Vector3()},uOpac:{value:.82}},
  vertexShader:`attribute float tono; varying float vTono; varying float vDist; uniform vec3 uCam;
    void main(){vTono=tono; vec4 w=modelMatrix*vec4(position,1.0); vDist=length(w.xz-uCam.xz); gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uBr,uOpac; uniform vec3 uHor,uLuz; varying float vTono; varying float vDist;
    void main(){vec3 col=vTono*uBr*uLuz; col=mix(col,uHor,smoothstep(220.0,700.0,vDist)*0.8);
      float a=uOpac*(1.0-smoothstep(520.0,740.0,vDist)); if(a<0.01)discard; gl_FragColor=vec4(col,a);}`,
  transparent:true,depthWrite:true,fog:false});
const geoNubes3D=(()=>{
  // Mapa propio de nubes (periódico cada 64 celdas), menos cubierto que el de la textura plana
  const m=v=>((v%64)+64)%64, per=(x,z,p,sd)=>{const x0=Math.floor(x),z0=Math.floor(z),fx=smooth(x-x0),fz=smooth(z-z0),w=v=>((v%p)+p)%p;
    const a=hash2(w(x0),w(z0),sd),b=hash2(w(x0+1),w(z0),sd),c=hash2(w(x0),w(z0+1),sd),e=hash2(w(x0+1),w(z0+1),sd);const ab=a+(b-a)*fx;return ab+((c+(e-c)*fx)-ab)*fz;};
  const mapa=new Uint8Array(64*64);
  for(let j=0;j<64;j++)for(let i=0;i<64;i++)mapa[j*64+i]=per(i/8,j/8,8,4242)*.65+per(i/4,j/4,16,4343)*.35>.585?1:0;
  const op=(i,j)=>mapa[m(j)*64+m(i)]===1, pos=[], tono=[], C=NUBE_C, H=NUBE_H;
  const q=(a,b,c,e,k)=>{pos.push(...a,...b,...c,...a,...c,...e);for(let n=0;n<6;n++)tono.push(k);};
  for(let j=0;j<64;j++)for(let i=0;i<64;i++){
    if(!op(i,j))continue;
    const x0=i*C,x1=x0+C,z0=j*C,z1=z0+C;
    q([x0,H,z0],[x0,H,z1],[x1,H,z1],[x1,H,z0],1);
    q([x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1],.72);
    if(!op(i+1,j))q([x1,0,z0],[x1,H,z0],[x1,H,z1],[x1,0,z1],.88);
    if(!op(i-1,j))q([x0,0,z1],[x0,H,z1],[x0,H,z0],[x0,0,z0],.88);
    if(!op(i,j+1))q([x1,0,z1],[x1,H,z1],[x0,H,z1],[x0,0,z1],.8);
    if(!op(i,j-1))q([x0,0,z0],[x0,H,z0],[x1,H,z0],[x1,0,z0],.8);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('tono',new THREE.Float32BufferAttribute(tono,1));
  return g;
})();
for(let k=0;k<9;k++){const t=new THREE.Mesh(geoNubes3D,matNubes);t.frustumCulled=false;nubes.add(t);}
let nubesOff=0;
function actualizarNubes(c,brillo,dt){
  nubesOff=(nubesOff+dt*1.6)%NUBE_T;
  const gx=Math.floor((c.x-nubesOff)/NUBE_T)*NUBE_T+nubesOff, gz=Math.floor(c.z/NUBE_T)*NUBE_T;
  let k=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)nubes.children[k++].position.set(gx+a*NUBE_T-NUBE_T/2,0,gz+b*NUBE_T-NUBE_T/2);
  nubes.position.set(0,NUBE_Y,0);
  const u=matNubes.uniforms; u.uBr.value=brillo; u.uLuz.value.copy(_colSol); u.uHor.value.copy(cielo); u.uCam.value.copy(c);
  u.uOpac.value=lloviendo?.95:.82;
}

// Viñeta suave en los bordes de la pantalla
(function(){const v=document.createElement('div');v.id='vineta';
  v.style.cssText='position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 58%,rgba(0,0,0,.32) 100%);';
  const c=document.getElementById('vista');c.parentNode.insertBefore(v,c.nextSibling);})();

/* ---------- Escudo ---------- */
let escudoArriba=false, escudoT=0;
function modeloEscudo(){
  const g=new THREE.Group(), M=c=>new THREE.MeshBasicMaterial({color:c});
  const caja=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);g.add(m);return m;};
  caja(.44,.66,.05,0x8a6238,0,0,0);
  for(let k=-2;k<=2;k++)caja(.006,.64,.052,0x6e4c2a,k*.09,0,0);
  caja(.46,.03,.06,0x9aa0a6,0,.33,0); caja(.46,.03,.06,0x9aa0a6,0,-.33,0);
  caja(.03,.68,.06,0x9aa0a6,-.225,0,0); caja(.03,.68,.06,0x9aa0a6,.225,0,0);
  caja(.08,.6,.062,0xb0b6bc,0,0,0); caja(.14,.14,.07,0xc8ced4,0,.04,0);
  caja(.06,.2,.06,0x5a3a1a,0,0,-.06);
  return g;
}
function escudoEnMano(){const p=enMano();return !!(p&&p.id===597);}
function actualizarEscudo(dt){
  const quiere=escudoEnMano()&&clicDer&&estado==='jugando'&&comiendo<0&&arcoCarga<0;
  escudoT=quiere?escudoT+dt:0;
  escudoArriba=escudoT>.2;
}
const _danarBase=danarJugador;
danarJugador=function(n,tipo,dir){
  if(escudoArriba&&dir&&(tipo==='mob'||tipo==='flecha')&&estado!=='muerto'){
    const fx=-Math.sin(jugador.yaw), fz=-Math.cos(jugador.yaw);
    if(fx*dir.x+fz*dir.z<-.2){
      sonar('escudo'); balancearMano();
      jugador.vel.x+=dir.x*2; jugador.vel.z+=dir.z*2;
      if(supervivencia())gastarObjetoEnMano(1+Math.floor(n));
      emitirParticulas(jugador.pos.x-dir.x*.6,jugador.pos.y+1.2,jugador.pos.z-dir.z*.6,0xc8b890,5,1.5,.3,6);
      return;
    }
  }
  return _danarBase(n,tipo,dir);
};

/* ---------- Caballos ---------- */
const COLORES_CABALLO=[[0xc9a27a,0xf0e6d6],[0x8a5a30,0x2a1a10],[0x4a2e1a,0x1a100a],[0x2a2a2c,0x101012],[0xd8d6d2,0x9a9894],[0xa8643a,0x6a3a1a],[0x6a6a70,0x303034]];
DEF_MOB.caballo={vida:22,ancho:.7,alto:1.6,vel:1.1,tipo:'pasivo',ia:'caballo',comida:I.manzanaDorada,xp:[1,3],sonido:'caballo',montable:true,
  dims:['superficie'],suelta:()=>[[I.cuero,azar(0,2)]]};
NOMBRE_MOB.caballo='Caballo';
MODELOS_EXTRA.caballo=({g,pon,parte,cuadrupedo,extra,opc})=>{
  const [col,crin]=COLORES_CABALLO[opc.variante??0]||COLORES_CABALLO[0];
  cuadrupedo(.2,.5,.82,col,.21);
  pon(parte(.64,.62,1.42,col,false,'pelo'),0,1.12,0);
  const cuello=pon(parte(.34,.72,.42,col),0,1.56,.62); cuello.rotation.x=.55;
  extra.cabeza=pon(parte(.32,.34,.64,col),0,1.94,.9);
  pon(parte(.26,.22,.2,0x2a2018),0,1.86,1.2);
  pon(parte(.08,.14,.06,col),-.1,2.16,.72); pon(parte(.08,.14,.06,col),.1,2.16,.72);
  const melena=pon(parte(.1,.74,.18,crin,false,'pelo'),0,1.68,.5); melena.rotation.x=.55;
  const cola=pon(parte(.14,.62,.14,crin,false,'pelo'),0,1.0,-.74); cola.rotation.x=-.35;
  pon(parte(.06,.06,.02,0x111111),-.17,2.0,1.02); pon(parte(.06,.06,.02,0x111111),.17,2.0,1.02);
  const silla=new THREE.Group();
  const s1=parte(.66,.1,.52,0x5a3218);s1.position.set(0,1.46,-.02);silla.add(s1);
  const s2=parte(.3,.12,.1,0x4a2a14);s2.position.set(0,1.55,.22);silla.add(s2);
  for(const x of [-.34,.34]){const e=parte(.03,.4,.06,0x3a2a1a);e.position.set(x,1.22,-.02);silla.add(e);
    const est=parte(.08,.06,.1,0xa0a0a8);est.position.set(x,1.0,-.02);silla.add(est);}
  silla.visible=!!opc.silla; g.add(silla); extra.silla=silla;
  // Armadura (barda): cubre lomo, cuello y cabeza; se colorea al ponerla
  const barda=new THREE.Group();
  for(const [w,h,d,x,y,z,rx] of [[.7,.34,1.2,0,1.3,0,0],[.72,.3,.3,0,1.1,.56,0],[.4,.62,.46,0,1.6,.62,.55],[.36,.2,.56,0,2.06,.9,0]]){
    const q=parte(w,h,d,0xcccccc,false,null);q.position.set(x,y,z);q.rotation.x=rx;barda.add(q);}
  barda.visible=false; g.add(barda); extra.barda=barda;
};
IA_EXTRA.caballo=(m,dt)=>{
  if(m===jugador.montura){
    if(!m.domado){
      // Sin domar se encabrita: cada intento sube su paciencia hasta que acepta al jinete
      m.mover=false; m.domarT=(m.domarT||0)+dt;
      if(m.extra.cabeza)m.extra.cabeza.rotation.x=Math.sin(tiempoJuego*18)*.25;
      if(m.domarT>1.4){
        m.domarT=0;
        if(Math.random()*100<(m.temple||0)){m.domado=true;sonar('caballo',m.pos);
          emitirParticulas(m.pos.x,m.pos.y+2,m.pos.z,0xff5070,8,1,.9,-1);mostrarMensaje('¡Has domado al caballo! Ponle una silla de montar para dirigirlo.');}
        else{m.temple=Math.min(95,(m.temple||0)+10);sonar('encabritar',m.pos);desmontar();
          jugador.vel.x+=(Math.random()-.5)*6;jugador.vel.z+=(Math.random()-.5)*6;jugador.vel.y=6;
          emitirParticulas(m.pos.x,m.pos.y+1.8,m.pos.z,0x606060,6,1.2,.6,-1);}
      }
      return true;
    }
    if(!m.silla){m.mover=false;return true;}
    const d=dirEntradaCamara();
    if((d.x||d.z)&&estado==='jugando')mover(m,d.x,d.z,m.rapidez*(jugador.corriendo?1.2:1));else m.mover=false;
    if(teclas.Space&&m.suelo&&estado==='jugando'){m.vel.y=m.salto;sonar('caballo',m.pos,.5);}
    return true;
  }
  m.domarT=0;
  m.t-=dt;if(m.t<=0){m.t=3+Math.random()*7;m.mover=Math.random()<.4;m.yawObj=Math.random()*Math.PI*2;}
  m.velObj=m.huir>0?4:1.1;
  if(m.huir>0){m.huir-=dt;m.mover=true;}
  return true;
};
function crearCaballo(x,y,z,variante){
  const m=crearMob('caballo',x,y,z,{variante});
  m.variante=variante; m.rapidez=6.5+Math.random()*4; m.salto=7+Math.random()*3.5; m.vida=15+Math.floor(Math.random()*8);
  m.temple=0; return m;
}
function aparicionMejoras(x,z){
  if(Math.random()>.04)return false;
  const inf=infoColumna(x,z);
  if(![BIOMA.llanura,BIOMA.sabana,BIOMA.prado].includes(inf.bioma))return false;
  if(mobs.filter(m=>m.tipo==='caballo').length>=5)return false;
  let y=CY-1; while(y>0&&!getBloque(x,y,z))y--;
  if(getBloque(x,y,z)!==B.cesped)return false;
  const v=Math.floor(Math.random()*COLORES_CABALLO.length), n=azar(2,4);
  for(let k=0;k<n;k++){const ox=x+azar(-3,3),oz=z+azar(-3,3),oy=buscarSuelo(ox,y+3,oz,6,1);if(oy>0)crearCaballo(ox+.5,oy,oz+.5,Math.random()<.8?v:azar(0,COLORES_CABALLO.length-1));}
  return true;
}
const _aparicionFinalBase=aparicionFinal;
aparicionFinal=function(x,z){if(aparicionMejoras(x,z))return true;return _aparicionFinalBase(x,z);};
const _asientoBase=asientoJinete;
asientoJinete=function(e){
  if(e.tipo==='caballo'&&jugador.montura===e){jugador.pos.set(e.pos.x,e.pos.y+.78,e.pos.z);jugador.vel.set(0,0,0);jugador.maxY=jugador.pos.y;return;}
  _asientoBase(e);
};
// Los huevos generadores crean caballos con estadísticas propias
const _crearMobBase=crearMob;
crearMob=function(tipo,x,y,z,opc={}){
  if(tipo==='caballo'&&opc.variante===undefined){opc=Object.assign({},opc,{variante:Math.floor(Math.random()*COLORES_CABALLO.length)});
    const m=_crearMobBase(tipo,x,y,z,opc);m.variante=opc.variante;m.rapidez=6.5+Math.random()*4;m.salto=7+Math.random()*3.5;m.temple=0;return m;}
  return _crearMobBase(tipo,x,y,z,opc);
};

function pintarBarda(m){
  const b=m.extra.barda; if(!b)return;
  b.visible=!!m.barda; if(!m.barda)return;
  const [r,g,bb]=ITEMS[m.barda].bardaCaballo.col, c=new THREE.Color(r/255,g/255,bb/255);
  b.traverse(o=>{if(o.isMesh){o.material.color.copy(c);o.userData.base=c.clone();}});
}
// La armadura reduce el daño que recibe el caballo
const _herirMobBase=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  if(m&&m.tipo==='caballo'&&m.barda)d*=1-Math.min(20,ITEMS[m.barda].bardaCaballo.def)*.04;
  return _herirMobBase(m,d,dir,fuente,empuje);
};
// Al morir suelta la silla y la armadura
const _alMorirMejoras=alMorirMob;
alMorirMob=function(m){
  if(m.tipo==='caballo'){if(m.silla)soltarItem(crearPila(598),m.pos.x,m.pos.y+1,m.pos.z,true);if(m.barda)soltarItem(crearPila(m.barda),m.pos.x,m.pos.y+1,m.pos.z,true);}
  return _alMorirMejoras(m);
};

/* ---------- Clic derecho: caballos y setas gigantes ---------- */
function usarDerechoMejoras(p,id,it){
  const m=apuntadoEnt&&apuntadoEnt.mob;
  if(m&&m.tipo==='caballo'){
    if(id===598){
      if(!m.domado){mostrarMensaje('Primero tienes que domar al caballo: móntalo varias veces.');return true;}
      if(!m.silla){m.silla=true;m.extra.silla.visible=true;consumirEnMano();sonar('poner',m.pos);balancearMano();}
      return true;
    }
    if(it&&it.bardaCaballo){
      if(!m.domado){mostrarMensaje('Primero tienes que domar al caballo.');return true;}
      if(m.barda&&supervivencia())soltarItem(crearPila(m.barda),m.pos.x,m.pos.y+1,m.pos.z,true);
      m.barda=id; consumirEnMano(); sonar('poner',m.pos); balancearMano(); pintarBarda(m); return true;
    }
    if(!m.domado&&[I.manzana,I.trigo,I.azucar||516,I.pan].includes(id)){
      m.temple=Math.min(95,(m.temple||0)+(id===I.pan?6:3)); m.vida=Math.min(m.def.vida,m.vida+2);
      consumirEnMano(); sonar('comer',m.pos,.6); emitirParticulas(m.pos.x,m.pos.y+1.6,m.pos.z,0x60c040,5,1,.6,-1); balancearMano(); return true;
    }
    if(!jugador.agachado){montar(m);if(m.domado&&!m.silla)mostrarMensaje('Sin silla de montar no puedes dirigirlo.');return true;}
  }
  if(id===I.harinaHueso&&apuntado&&(apuntado.b===B.champinonRojo||apuntado.b===B.champinonMarron)){
    const {x,y,z}=apuntado; if(supervivencia())consumirEnMano(); balancearMano();
    emitirParticulas(x+.5,y+.5,z+.5,0x80e060,8,1,.8,-1);
    if(Math.random()<.45){
      for(let k=1;k<=7;k++)if(SOLIDO[getBloque(x,y+k,z)])return true;
      const tipo=apuntado.b===B.champinonRojo?'setaRoja':'setaMarron';
      setBloque(x,y,z,0,{sinAviso:true});
      const poner=(px,py,pz,b,soloAire)=>{if(py<0||py>=CY)return;const a=getBloque(px,py,pz);if(soloAire&&a&&!REEMPL[a])return;if(!soloAire&&a&&SOLIDO[a])return;setBloque(px,py,pz,b,{sinAviso:true});};
      ponerArbolTipo(poner,tipo,x,y-1,z,mulberry32(Math.floor(Math.random()*1e9)));
    }
    return true;
  }
  return false;
}
const _usarDerechoCompletoBase=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){if(usarDerechoMejoras(p,id,it))return true;return _usarDerechoCompletoBase(p,id,it);};

/* ---------- Actualización por fotograma ---------- */
function actualizarMejoras(dt){
  actualizarEscudo(dt);
  for(const m of mobs)if(m.tipo==='caballo'&&m.extra.silla)m.extra.silla.visible=!!m.silla;
}
const _actualizarFinalBase=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalBase(dt);actualizarMejoras(dt);};
