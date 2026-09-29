"use strict";
/* =========================================================
   Animaciones que faltaban: el arco se tensa con su cuerda
   y la flecha (y la vista se acerca), migas al comer, brillo
   de encantamiento en la mano, trozos al romperse una
   herramienta, poses en tercera persona (comer, tensar el
   arco, cubrirse con el escudo y nadar) y la mano que baja
   al cambiar de objeto.
   ========================================================= */
const ID_ARCO_FASE=9900;
ARCO_FASES.forEach((c,i)=>{LIENZOS[ID_ARCO_FASE+1+i]=c;});
function faseArco(){return arcoCarga<0?0:arcoCarga<.3?1:arcoCarga<.75?2:3;}

// Color medio de un icono (para las partículas)
const _colIcono={};
function colorIcono(id){
  if(_colIcono[id])return _colIcono[id];
  const c=LIENZOS[id]; if(!c)return 0x888888;
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let r=0,g=0,b=0,n=0;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>100){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
  return _colIcono[id]=n?new THREE.Color(r/n/255,g/n/255,b/n/255):0x888888;
}

/* ---------- Primera persona ---------- */
let faseArcoMano=0, migasT=0;
const _actualizarManoBase=actualizarMano;
actualizarMano=function(id,brillo,dt,agachado){
  _actualizarManoBase(id,brillo,dt,agachado);
  if(!manoObjeto||!manoObjeto.isMesh)return;
  // Arco: cambia de fotograma según lo tensado
  if(id===I.arco){const f=faseArco();
    if(f!==faseArcoMano){faseArcoMano=f;manoObjeto.geometry=geoExtruida(f?ID_ARCO_FASE+f:I.arco,.44);}}
  if(id===I.arco)manoObjeto.scale.setScalar(arcoCarga>=0?.78:1);
  else faseArcoMano=0;
  // Brillo de encantamiento que recorre el objeto
  const p=enMano();
  if(p&&p.enc&&Object.keys(p.enc).length&&manoObjeto.material&&manoObjeto.material.color){
    const s=(Math.sin(tiempoJuego*3.2)+1)/2*.45, b=clamp(brillo,.15,1);
    manoObjeto.material.color.setRGB(b*(1+.35*s),b*(1-.08*s),b*(1+.7*s));
  }
};
// Migas al comer o beber
function migasComer(dt){
  if(comiendo<0||estado!=='jugando'||vistaTercera)return;
  migasT-=dt; if(migasT>0)return; migasT=.12;
  const id=enManoId(); if(!id)return;
  camara.getWorldDirection(_dirMig);
  const p=camara.position;
  emitirParticulas(p.x+_dirMig.x*.45,p.y-.22+_dirMig.y*.45,p.z+_dirMig.z*.45,colorIcono(id),2,1.2,.45,9);
}
const _dirMig=new THREE.Vector3();

// Trozos del objeto al romperse una herramienta
const _gastarBase=gastarObjetoEnMano;
gastarObjetoEnMano=function(n){
  const p=enMano(), id=p&&p.id;
  _gastarBase(n);
  if(p&&!enMano()&&ITEMS[id]&&ITEMS[id].dur){
    camara.getWorldDirection(_dirMig);const c=camara.position;
    emitirParticulas(c.x+_dirMig.x*.6,c.y-.25,c.z+_dirMig.z*.6,colorIcono(id),12,2.2,.6,10);
  }
};

/* ---------- Tercera persona ---------- */
const _modeloJugadorBase=actualizarModeloJugador;
actualizarModeloJugador=function(dt){
  _modeloJugadorBase(dt);
  const M=modeloJugador, p=M.p, j=jugador;
  if(!M.g.visible)return;
  if(arcoCarga>=0){p.brazoD.rotation.x=-1.45;p.brazoI.rotation.x=-1.45;p.brazoI.rotation.y=.5;p.brazoD.rotation.y=.1;}
  else{p.brazoI.rotation.y=0;p.brazoD.rotation.y=0;}
  if(comiendo>=0){p.brazoD.rotation.x=-1.2+Math.sin(tiempoJuego*16)*.12;p.cabeza.rotation.x=.15+Math.sin(tiempoJuego*16)*.08;}
  if(typeof escudoArriba!=='undefined'&&escudoArriba){p.brazoD.rotation.x=-.9;p.brazoD.rotation.y=-.5;}
  // Nadar: el cuerpo se tumba en el agua al nadar rápido
  if(j.enAgua&&j.corriendo&&!j.montura&&!j.planeando){
    M.g.rotation.x=Math.PI/2-.3+j.pitch*.4; M.g.position.y+=.4;
    const b=Math.sin(tiempoJuego*6)*.5; p.piernaI.rotation.x=b*.6; p.piernaD.rotation.x=-b*.6;
    p.brazoI.rotation.x=-2.6+b*.4; p.brazoD.rotation.x=-2.6-b*.4;
  }
  // Arco en tercera persona con su fotograma
  if(M.objId===I.arco&&p.mano.children[0]&&p.mano.children[0].isMesh){const f=faseArco();
    if(M.faseArco!==f){M.faseArco=f;p.mano.children[0].geometry=geoExtruida(f?ID_ARCO_FASE+f:I.arco,.55);}}
};

const _actualizarFinalAnim=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalAnim(dt);migasComer(dt);};
