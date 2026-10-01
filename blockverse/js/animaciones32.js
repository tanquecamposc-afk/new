"use strict";
/* =========================================================
   Animaciones de espadas y herramientas
   - Cada herramienta tiene su golpe: la espada da tajos que
     alternan derecha→izquierda y revés, con una estela; el
     hacha un hachazo de arriba abajo; la maza un mazazo
     cargado; el pico y la azada pican; la pala palea; la
     lanza y el tridente dan estocadas; la mano vacía da un
     puñetazo; usar o colocar es un pequeño gesto.
   - Preparación, impacto y recuperación con curvas suaves.
   - Al picar un bloque el golpe se repite en bucle sin saltos.
   - La cámara da un pequeño cabeceo al impactar (más fuerte
     con hacha, maza y críticos) y el barrido de la espada
     deja una estela ancha.
   - En tercera persona el brazo y el torso hacen lo mismo.
   ========================================================= */
const GOLPES={
  // [t, x,y,z, rx,ry,rz] en el espacio de la cámara (sumado a la pose de la mano)
  tajo:{dur:.32,imp:.42,k:[[0,0,0,0,0,0,0],[.18,.06,.07,.04,.25,-.35,-.35],[.45,-.34,-.06,-.14,-.55,.95,.45],[1,0,0,0,0,0,0]]},
  reves:{dur:.32,imp:.42,k:[[0,0,0,0,0,0,0],[.18,-.2,-.09,-.06,-.35,.6,.45],[.45,.1,.1,-.12,-.15,-.5,-.5],[1,0,0,0,0,0,0]]},
  hachazo:{dur:.44,imp:.47,k:[[0,0,0,0,0,0,0],[.28,0,.14,.06,.65,0,-.1],[.47,-.08,-.2,-.16,-1.25,.25,0],[.6,-.07,-.18,-.14,-1.15,.22,0],[1,0,0,0,0,0,0]]},
  mazazo:{dur:.55,imp:.55,k:[[0,0,0,0,0,0,0],[.35,0,.22,.1,.9,0,-.15],[.55,-.06,-.3,-.2,-1.5,.2,0],[.7,-.05,-.28,-.18,-1.4,.18,0],[1,0,0,0,0,0,0]]},
  picar:{dur:.26,imp:.45,k:[[0,0,0,0,0,0,0],[.15,0,.06,0,.35,0,0],[.45,-.1,-.12,-.12,-.95,.3,0],[1,0,0,0,0,0,0]]},
  palear:{dur:.3,imp:.45,k:[[0,0,0,0,0,0,0],[.2,0,-.02,.06,.2,0,0],[.45,-.05,-.08,-.2,-.6,.15,0],[.7,0,-.02,-.08,.25,0,0],[1,0,0,0,0,0,0]]},
  estocada:{dur:.3,imp:.45,k:[[0,0,0,0,0,0,0],[.25,0,-.02,.12,.15,0,0],[.45,-.1,.03,-.36,-.15,.1,0],[1,0,0,0,0,0,0]]},
  punetazo:{dur:.24,imp:.3,k:[[0,0,0,0,0,0,0],[.3,-.14,.04,-.3,-.25,.45,0],[1,0,0,0,0,0,0]]},
  usar:{dur:.22,imp:.35,k:[[0,0,0,0,0,0,0],[.35,-.06,-.06,-.06,-.45,.25,0],[1,0,0,0,0,0,0]]},
};
// Tercera persona: [t, brazo x, brazo z, giro del torso]
const GOLPES3P={
  tajo:[[0,0,0,0],[.18,-2.0,.6,.35],[.45,-.9,-.5,-.45],[1,0,0,0]],
  reves:[[0,0,0,0],[.18,-1.0,-.5,-.4],[.45,-2.0,.6,.35],[1,0,0,0]],
  hachazo:[[0,0,0,0],[.28,-2.9,.1,.1],[.47,-.4,0,-.15],[1,0,0,0]],
  mazazo:[[0,0,0,0],[.35,-3.0,.15,.15],[.55,-.3,0,-.2],[1,0,0,0]],
  picar:[[0,0,0,0],[.15,-2.2,0,.1],[.45,-.6,0,-.15],[1,0,0,0]],
  palear:[[0,0,0,0],[.2,-.6,0,0],[.45,-1.4,0,-.15],[1,0,0,0]],
  estocada:[[0,0,0,0],[.25,-1.1,0,.25],[.45,-1.6,0,-.35],[1,0,0,0]],
  punetazo:[[0,0,0,0],[.3,-1.5,0,-.35],[1,0,0,0]],
  usar:[[0,0,0,0],[.35,-1.0,0,-.1],[1,0,0,0]],
};
const suave32=t=>t*t*(3-2*t);
function interpolar32(K,t,n){
  const r=new Array(n).fill(0);
  for(let i=0;i<K.length-1;i++){const a=K[i],b=K[i+1];
    if(t>=a[0]&&t<=b[0]){const u=suave32((t-a[0])/Math.max(1e-6,b[0]-a[0]));for(let j=0;j<n;j++)r[j]=a[j+1]+(b[j+1]-a[j+1])*u;return r;}}
  return r;
}
let kickUlt32=performance.now(), golpe32=null, comboT=-9, comboLado=0, ataque32=null, kick32=0, kickT32=9, kickZ32=0;

function tipoGolpe32(ataque){
  const p=enMano(), it=p&&ITEMS[p.id], h=it&&it.herr, t=h?h.tipo:(it&&it.tipoHerr);
  if(ataque){
    if(t==='espada'){const r=tiempoJuego-comboT<1.1?(comboLado^=1):(comboLado=0);comboT=tiempoJuego;return r?'reves':'tajo';}
    if(t==='hacha')return 'hachazo';
    if(t==='maza')return 'mazazo';
    if(t==='lanza'||t==='tridente')return 'estocada';
    if(!p)return 'punetazo';
    return h?'picar':'punetazo';
  }
  if(typeof clicIzq!=='undefined'&&clicIzq&&typeof minado!=='undefined'&&minado){
    if(t==='pala')return 'palear';
    if(t==='hacha')return 'hachazo';
    if(t==='espada')return 'tajo';
    if(!p)return 'punetazo';
    return 'picar';
  }
  return 'usar';
}
const _atacar32=atacar;
atacar=function(){
  const carga=cargaAtaque(), critico=carga>.9&&!jugador.suelo&&jugador.vel.y<0&&!jugador.enAgua&&!jugador.vuela;
  ataque32={carga,critico};
  try{return _atacar32.apply(this,arguments);}finally{ataque32=null;}
};
balancearMano=function(){
  const tipo=tipoGolpe32(!!ataque32), G=GOLPES[tipo];
  // Picando: el golpe nuevo empieza cuando el anterior ya se está recuperando, así el bucle no salta
  if(golpe32&&golpe32.tipo===tipo&&golpe32.t<G.dur*.62&&!ataque32)return;
  const p=enMano(), h=p&&ITEMS[p.id]&&ITEMS[p.id].herr;
  const fuerza=ataque32?(.35+.65*ataque32.carga):.6;
  golpe32={tipo,t:0,dur:G.dur*(ataque32&&ataque32.carga<.6?.85:1),fuerza,ataque:!!ataque32,critico:!!(ataque32&&ataque32.critico),
    estela:!!ataque32&&ataque32.carga>.8&&h&&['espada','hacha','maza'].includes(h.tipo),impacto:false,barrido:false};
};
// Barrido de la espada: estela ancha
if(typeof ataqueBarrido==='function'){
  const _barrido32=ataqueBarrido;
  ataqueBarrido=function(){const r=_barrido32.apply(this,arguments);if(golpe32)golpe32.barrido=true;return r;};
}

/* ---------- Estela del golpe ---------- */
const estela32=(()=>{
  const g=new THREE.RingGeometry(.66,.8,28,1,0,1.9);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false}));
  m.renderOrder=999; m.frustumCulled=false; m.visible=false; camara.add(m); return m;
})();
function actualizarEstela32(){
  const e=estela32, G=golpe32;
  if(!G||!(G.estela||G.barrido)||vistaTercera){e.visible=false;return;}
  const f=G.t/G.dur, a=clamp((f-.22)/.2,0,1)*clamp((.75-f)/.3,0,1);
  if(a<=0){e.visible=false;return;}
  e.visible=true;
  const ancho=G.barrido?1.5:1;
  const tipo=G.tipo, vertical=tipo==='hachazo'||tipo==='mazazo';
  if(vertical){e.position.set(-.3,-.15,-1.15);e.rotation.set(0,0,.95);e.scale.set(ancho,-ancho,1);}
  else{e.position.set(tipo==='reves'?-.05:.05,-.62,-1.15);e.rotation.set(0,0,tipo==='reves'?-.35:.55);e.scale.set(tipo==='reves'?-ancho:ancho,ancho,1);}
  // La estela sigue al arma: aparece desde donde empieza el golpe y se borra por detrás
  const pr=clamp((f-.2)/.3,0,1), seg=28, cab=Math.max(1,Math.round(pr*seg)), cola=Math.max(0,Math.round((pr-.65)*seg/.35*.8));
  e.geometry.setDrawRange(cola*6,Math.max(0,cab-cola)*6);
  e.material.color.setHex(G.critico?0xfff0a0:G.barrido?0xe8f0ff:0xffffff);
  e.material.opacity=a*(G.barrido?.45:.24)*(G.critico?1.4:1);
}

/* ---------- Primera persona ---------- */
const _actualizarMano32=actualizarMano;
actualizarMano=function(id,brillo,dt,agachado){
  balanceo=0;   // el golpe antiguo queda sustituido por el nuevo
  _actualizarMano32(id,brillo,dt,agachado);
  if(!golpe32)return actualizarEstela32();
  const G=golpe32, D=GOLPES[G.tipo];
  G.t+=dt;
  const f=Math.min(1,G.t/G.dur);
  if(!G.impacto&&f>=D.imp){G.impacto=true;
    if(G.ataque||G.tipo==='picar'||G.tipo==='palear'||G.tipo==='hachazo'){
      const base={tajo:.012,reves:.012,hachazo:.03,mazazo:.055,picar:.008,palear:.008,estocada:.015,punetazo:.01,usar:0}[G.tipo]||0;
      kick32=base*(G.ataque?G.fuerza:.7)+(G.critico?.025:0); kickT32=0; kickUlt32=performance.now(); kickZ32=(G.tipo==='reves'?1:-1)*kick32*.6;}}
  const comiendoO=typeof comiendo!=='undefined'&&comiendo>=0, arco=typeof arcoCarga!=='undefined'&&arcoCarga>=0, escudo=typeof escudoArriba!=='undefined'&&escudoArriba;
  if(!comiendoO&&!arco&&!escudo){
    const [x,y,z,rx,ry,rz]=interpolar32(D.k,f,6), s=G.fuerza*.55+.45;
    mano.position.x+=x*s; mano.position.y+=y*s; mano.position.z+=z*s;
    mano.rotation.x+=rx*s; mano.rotation.y+=ry*s; mano.rotation.z+=rz*s;
  }
  actualizarEstela32();
  if(G.t>=G.dur){golpe32=null;estela32.visible=false;}
};
// Cabeceo de la cámara al impactar
const _aplicarCamaraTercera32=aplicarCamaraTercera;
aplicarCamaraTercera=function(){
  const r=_aplicarCamaraTercera32.apply(this,arguments);
  if(kick32>0&&!vistaTercera){
    const ah=performance.now(); kickT32+=Math.min(.05,(ah-kickUlt32)/1000); kickUlt32=ah;
    const k=kick32*(1-Math.exp(-kickT32*55))*Math.exp(-kickT32*9);
    camara.rotation.x-=k; camara.rotation.z+=kickZ32*Math.exp(-kickT32*9)*(1-Math.exp(-kickT32*55));
    if(kickT32>.6)kick32=0;
  }
  return r;
};

/* ---------- Tercera persona ---------- */
const _modeloJugador32=actualizarModeloJugador;
actualizarModeloJugador=function(dt){
  _modeloJugador32(dt);
  const M=modeloJugador, p=M.p; if(!M.g.visible)return;
  let giro=0;
  if(golpe32&&GOLPES3P[golpe32.tipo]&&!(typeof arcoCarga!=='undefined'&&arcoCarga>=0)){
    const f=Math.min(1,golpe32.t/golpe32.dur), [ax,az,ty]=interpolar32(GOLPES3P[golpe32.tipo],f,3), s=golpe32.fuerza*.5+.5;
    p.brazoD.rotation.x+=ax*s; p.brazoD.rotation.z+=az*s; giro=ty*s;
    p.brazoI.rotation.x+=-ax*.15*s;
  }
  p.cuerpo.rotation.y=giro; p.cabeza.rotation.y=-giro;
};
