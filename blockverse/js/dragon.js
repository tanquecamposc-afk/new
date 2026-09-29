"use strict";
/* =========================================================
   El Ender Dragon y los cristales del End
   ========================================================= */
let dragon=null;
const VIDA_DRAGON=200;
function crearModeloDragon(){
  const g=new THREE.Group(), mat=c=>new THREE.MeshLambertMaterial({color:c});
  const caja=(w,h,d,c,x,y,z,padre=g)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.userData.base=new THREE.Color(c);padre.add(m);return m;};
  const cuerpo=caja(3,2.4,7,0x1a1a1f,0,0,0);
  for(let i=0;i<4;i++)caja(.4,.7,.8,0x2a2a33,0,1.5,2.5-i*1.8);
  const cuello=[];let prev=g;
  for(let i=0;i<5;i++){const s=caja(1.1,1.1,1.1,0x1f1f25,0,.6,3.9+i*1.1);cuello.push(s);}
  const cabeza=new THREE.Group();cabeza.position.set(0,.7,9.8);g.add(cabeza);
  caja(2,1.6,2.8,0x1a1a1f,0,0,0,cabeza); caja(1.6,.6,1.8,0x222228,0,-.7,.6,cabeza);
  caja(.5,.18,.05,0xd050ff,-.55,.25,1.41,cabeza); caja(.5,.18,.05,0xd050ff,.55,.25,1.41,cabeza);
  caja(.3,.6,.3,0x444450,-.6,1,-.8,cabeza); caja(.3,.6,.3,0x444450,.6,1,-.8,cabeza);
  const cola=[];for(let i=0;i<10;i++){cola.push(caja(1-i*.06,1-i*.06,1.1,0x1f1f25,0,0,-4-i*1.1));}
  const alas=[-1,1].map(s=>{const a=new THREE.Group();a.position.set(s*1.5,.9,1);g.add(a);
    caja(6,.25,.5,0x2a2a33,s*3,0,0,a);
    const mem=new THREE.Mesh(new THREE.PlaneGeometry(6,4.5),new THREE.MeshLambertMaterial({color:0x333344,side:THREE.DoubleSide}));
    mem.rotation.x=-Math.PI/2;mem.position.set(s*3,0,-2.3);mem.userData.base=new THREE.Color(0x333344);a.add(mem);return a;});
  [-1,1].forEach(s=>{caja(.6,1.8,.6,0x1a1a1f,s*1.1,-1.8,2);caja(.6,1.8,.6,0x1a1a1f,s*1.1,-1.8,-2);});
  g.scale.setScalar(1);
  return {g,cabeza,alas,cola,cuello};
}
function crearDragon(){
  if(dragon||mundoEstado.dragonMuerto)return;
  const mod=crearModeloDragon();
  dragon={vida:mundoEstado.vidaDragon||VIDA_DRAGON,pos:new THREE.Vector3(0,END_TOP+40,-40),vel:new THREE.Vector3(),yaw:0,fase:'rodear',faseT:12,
    ang:0,mod,muerto:false,muerteT:0,cdAtaque:0,cdBola:6,flash:0,haz:null,
    herir(d,fuente){
      if(this.muerto||this.inv>0)return;
      this.vida-=d;this.flash=.3;this.inv=.4;sonar('dragon',this.pos,.8);
      if(fuente==='jugador'||fuente==='flecha'){if(this.fase==='posado')this.faseT=Math.min(this.faseT,1.5);}
      if(this.vida<=0){this.vida=0;this.muerto=true;this.muerteT=0;}
      mostrarJefe();
    },
    golpeado(p,r){
      const c=this.mod.g.localToWorld(new THREE.Vector3(0,0,0)), h=this.mod.cabeza.getWorldPosition(new THREE.Vector3());
      return p.distanceTo(c)<3.6+r||p.distanceTo(h)<2+r;
    },
  };
  escena.add(mod.g);
  const barra=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),
    new THREE.LineBasicMaterial({color:0xff80ff,fog:false}));
  barra.frustumCulled=false;barra.visible=false;escena.add(barra);dragon.haz=barra;
  mostrarJefe();
}
function quitarDragon(){
  if(!dragon)return;
  escena.remove(dragon.mod.g);escena.remove(dragon.haz);
  dragon.mod.g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  dragon=null; mostrarJefe();
}
/* ---------- Cristales ---------- */
function crearCristales(){
  PILARES.forEach((p,i)=>{
    if(mundoEstado.cristalesRotos.includes(i))return;
    const g=new THREE.Group();
    const nucleo=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7),new THREE.MeshBasicMaterial({color:0xff80d0}));g.add(nucleo);
    const marco=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4,1.4,1.4)),new THREE.LineBasicMaterial({color:0xe0e0ff}));g.add(marco);
    const marco2=marco.clone();marco2.scale.setScalar(.8);g.add(marco2);
    agregarEnt({tipo:'cristal',indice:i,pos:new THREE.Vector3(p.x+.5,p.alto+2,p.z+.5),edad:Math.random()*5,malla:g,partes:[nucleo,marco,marco2]});
  });
}
function actualizarCristal(e,dt){
  e.edad+=dt;
  e.malla.position.set(e.pos.x,e.pos.y+Math.sin(e.edad*2)*.3,e.pos.z);
  e.partes[1].rotation.set(e.edad,e.edad*1.3,0); e.partes[2].rotation.set(-e.edad*1.2,0,e.edad);
  e.partes[0].rotation.y=e.edad*2;
}
function romperCristal(e){
  if(e.muerta)return;
  e.muerta=true; mundoEstado.cristalesRotos.push(e.indice);
  if(dragon&&dragon.cristal===e){dragon.herir(10,'cristal');dragon.cristal=null;}
  explosion(e.pos.x,e.pos.y,e.pos.z,6,{fuego:true});
}
/* ---------- Comportamiento ---------- */
function actualizarDragon(dt){
  if(!dragon)return;
  const d=dragon, j=jugador.pos, g=d.mod.g;
  d.inv=Math.max(0,(d.inv||0)-dt);
  if(d.muerto){
    d.muerteT+=dt;
    g.rotation.y+=dt*.5; d.pos.y+=dt*2;
    if(Math.random()<dt*25)emitirParticulas(d.pos.x+(Math.random()-.5)*8,d.pos.y+(Math.random()-.5)*4,d.pos.z+(Math.random()-.5)*8,0xffe0ff,3,3,.8,0);
    g.position.copy(d.pos);
    g.traverse(o=>{if(o.isMesh&&o.userData.base)o.material.color.copy(o.userData.base).lerp(new THREE.Color(0xffffff),Math.min(1,d.muerteT/5));});
    if(d.muerteT>6){
      sonar('explosion',null,1);
      soltarXP(12000,0,EPY+4,0);
      mundoEstado.dragonMuerto=true;
      activarPortalSalida();
      quitarDragon();
      mostrarMensaje('¡Has derrotado al Ender Dragon! Se abrió el portal de salida.');
    }
    return;
  }
  d.faseT-=dt; d.cdAtaque-=dt; d.cdBola-=dt; if(d.flash>0)d.flash-=dt;
  let objetivo;
  const alturaVuelo=END_TOP+22+Math.sin(tiempoJuego*.4)*6;
  if(d.fase==='rodear'){
    d.ang+=dt*.18;
    objetivo=new THREE.Vector3(Math.cos(d.ang)*45,alturaVuelo,Math.sin(d.ang)*45);
    if(d.faseT<=0&&objetivoValido()){const r=Math.random();
      if(r<.45){d.fase='embestir';d.faseT=7;}else if(r<.75){d.fase='posar';d.faseT=14;}else{d.faseT=6+Math.random()*6;}}
    if(d.cdBola<=0&&objetivoValido()&&d.pos.distanceTo(j)<70){d.cdBola=8+Math.random()*6;
      const dir=new THREE.Vector3(j.x-d.pos.x,j.y+1-d.pos.y,j.z-d.pos.z).normalize();
      dispararBola('bolaDragon',d.mod.cabeza.getWorldPosition(new THREE.Vector3()),dir,18,{dueno:'dragon'});sonar('dragon',d.pos,.6);}
  }else if(d.fase==='embestir'){
    objetivo=new THREE.Vector3(j.x,j.y+1.5,j.z);
    if(d.faseT<=0||d.pos.distanceTo(objetivo)<3){d.fase='rodear';d.faseT=10+Math.random()*8;}
  }else{ // posado sobre el portal
    objetivo=new THREE.Vector3(0,EPY+6,0);
    if(d.pos.distanceTo(objetivo)<3){
      d.vel.multiplyScalar(Math.pow(.1,dt));
      if(Math.random()<dt*3){const h=d.mod.cabeza.getWorldPosition(new THREE.Vector3());
        agregarEnt({tipo:'nube',pos:new THREE.Vector3(h.x+(Math.random()-.5)*4,EPY+1.5,h.z+(Math.random()-.5)*4),edad:3,malla:null});}
    }
    if(d.faseT<=0){d.fase='rodear';d.faseT=10;}
  }
  // Volar hacia el objetivo
  const hacia=objetivo.clone().sub(d.pos), dist=hacia.length();
  const velMax=d.fase==='embestir'?19:d.fase==='posar'?10:13;
  if(dist>.5)d.vel.lerp(hacia.normalize().multiplyScalar(velMax),Math.min(1,dt*1.5));
  d.pos.addScaledVector(d.vel,dt);
  const yawObj=Math.atan2(d.vel.x,d.vel.z);
  const giro=((yawObj-d.yaw+Math.PI*3)%(Math.PI*2))-Math.PI; d.yaw+=giro*Math.min(1,dt*3);
  g.position.copy(d.pos); g.rotation.set(-clamp(d.vel.y/velMax,-.6,.6)*.6,d.yaw,-giro*.4);
  // Animación
  const aleteo=Math.sin(tiempoJuego*(d.fase==='embestir'?5:3));
  d.mod.alas[0].rotation.z=aleteo*.6; d.mod.alas[1].rotation.z=-aleteo*.6;
  d.mod.cola.forEach((c,i)=>{c.position.x=Math.sin(tiempoJuego*2-i*.5)*i*.15;c.position.y=Math.sin(tiempoJuego*1.5-i*.4)*i*.08;});
  d.mod.cabeza.rotation.x=Math.sin(tiempoJuego*2)*.1;
  // Daño por contacto
  if(objetivoValido()&&d.cdAtaque<=0&&d.golpeado(new THREE.Vector3(j.x,j.y+1,j.z),.5)){
    d.cdAtaque=1; const dv=new THREE.Vector3(j.x-d.pos.x,0,j.z-d.pos.z).normalize();
    danarJugador(10,'mob',{x:dv.x*1.6,z:dv.z*1.6}); jugador.vel.y=9;
    if(d.fase==='embestir'){d.fase='rodear';d.faseT=10;}
  }
  // Curación con cristales
  let mejor=null,md=32;
  for(const e of entidades)if(e.tipo==='cristal'&&!e.muerta){const dd=e.pos.distanceTo(d.pos);if(dd<md){md=dd;mejor=e;}}
  d.cristal=mejor;
  if(mejor){d.vida=Math.min(VIDA_DRAGON,d.vida+dt*2);
    const pos=d.haz.geometry.attributes.position;pos.setXYZ(0,mejor.malla.position.x,mejor.malla.position.y,mejor.malla.position.z);
    pos.setXYZ(1,d.pos.x,d.pos.y,d.pos.z);pos.needsUpdate=true;d.haz.visible=true;}
  else d.haz.visible=false;
  // Color
  const l=Math.max(.45,brilloEn(d.pos.x,d.pos.y,d.pos.z));
  g.traverse(o=>{if(o.isMesh&&o.userData.base){o.material.color.copy(o.userData.base).multiplyScalar(l);if(o.material.emissive)o.material.emissive.setRGB(d.flash>0?.6:0,0,0);}});
  mundoEstado.vidaDragon=d.vida;
  mostrarJefe();
}
function activarPortalSalida(){
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
    const r=Math.hypot(x,z);
    if(r<2.5&&!(x===0&&z===0))setBloque(x,EPY+1,z,B.portalEnd);
  }
  setBloque(0,EPY+5,0,B.huevoDragon);
  crearAccesoPrincipal();
}
