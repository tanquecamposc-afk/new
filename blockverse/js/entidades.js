"use strict";
/* =========================================================
   Entidades que no son criaturas: objetos en el suelo,
   orbes de experiencia, flechas, bolas de fuego, perlas,
   ojos de ender, bloques que caen y dinamita activada.
   ========================================================= */
const entidades=[];
function agregarEnt(e){entidades.push(e);if(e.malla)escena.add(e.malla);return e;}
function limpiarEntidades(){for(const e of entidades)if(e.malla)escena.remove(e.malla);entidades.length=0;}

/* ---------- Objetos ---------- */
function soltarItem(pila,x,y,z,esparcir,vel){
  if(!pila||pila.n<=0)return;
  let malla;
  if(esCuboItem(pila.id))malla=new THREE.Mesh(geoCuboItem(pila.id),matItemBloque.clone());
  else{malla=new THREE.Sprite(matSprite(pila.id).clone());malla.scale.set(.42,.42,.42);}
  const v=vel||new THREE.Vector3(esparcir?(Math.random()-.5)*4:0,esparcir?3+Math.random()*2:2,esparcir?(Math.random()-.5)*4:0);
  agregarEnt({tipo:'item',pila:{...pila},pos:new THREE.Vector3(x,y,z),vel:v,edad:0,malla,propio:true,espera:vel?1.5:.4});
  let n=0;for(const e of entidades)if(e.tipo==='item')n++;
  if(n>400){const e=entidades.find(e=>e.tipo==='item');if(e)e.muerta=true;}
}
function soltarXP(total,x,y,z){
  while(total>0){
    const v=total>=37?37:total>=17?17:total>=7?7:total>=3?3:1; total-=v;
    const s=new THREE.Sprite(matOrbe);s.scale.set(.18+v*.006,.18+v*.006,1);
    agregarEnt({tipo:'xp',valor:v,pos:new THREE.Vector3(x+(Math.random()-.5),y+.5,z+(Math.random()-.5)),
      vel:new THREE.Vector3((Math.random()-.5)*3,3+Math.random()*2,(Math.random()-.5)*3),edad:0,malla:s});
  }
}
const matOrbe=(()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');
  x.fillStyle='#3c7a10';x.fillRect(1,1,6,6);x.fillStyle='#b8f040';x.fillRect(2,2,4,4);x.fillStyle='#f0ff90';x.fillRect(3,3,2,2);
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return new THREE.SpriteMaterial({map:t,alphaTest:.5});})();
function fisicaSimple(e,dt,grav=18,rebote=0){
  const p=e.pos,v=e.vel;
  v.y=Math.max(-40,v.y-grav*dt);
  const nx=p.x+v.x*dt; if(SOLIDO[getBloque(Math.floor(nx),Math.floor(p.y),Math.floor(p.z))])v.x*=-rebote;else p.x=nx;
  const nz=p.z+v.z*dt; if(SOLIDO[getBloque(Math.floor(p.x),Math.floor(p.y),Math.floor(nz))])v.z*=-rebote;else p.z=nz;
  const ny=p.y+v.y*dt;
  const bajo=getBloque(Math.floor(p.x),Math.floor(ny),Math.floor(p.z));
  if(v.y<0&&SOLIDO[bajo]){p.y=Math.floor(ny)+BLOQUES[bajo].altura;v.y=0;v.x*=.5;v.z*=.5;e.suelo=true;}
  else{p.y=ny;e.suelo=false;}
  const aqui=getBloque(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z));
  if(SOLIDO[aqui])p.y=Math.floor(p.y)+1;
  if(esAgua(aqui)){v.y=Math.min(v.y+30*dt,1.5);v.x*=.9;v.z*=.9;}
  if(e.suelo){const f=Math.pow(.05,dt);v.x*=f;v.z*=f;}
  return aqui;
}
let _fusionT=0;
function actualizarItem(e,dt){
  e.edad+=dt;
  const aqui=fisicaSimple(e,dt);
  if(ITEMS[e.pila.id].ignifugo){if(esLava(aqui)){e.vel.y=Math.min(3,e.vel.y+40*dt);}}
  else if(esLava(aqui)||aqui===B.fuego){e.muerta=true;emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0x444444,4,1,.5,-2);return;}
  e.malla.position.set(e.pos.x,e.pos.y+.18+Math.sin(e.edad*3)*.05,e.pos.z);
  e.malla.rotation&&(e.malla.rotation.y=e.edad*1.6);
  if(e.edad%0.5<dt)e.malla.material.color.setScalar(brilloEn(e.pos.x,e.pos.y+.3,e.pos.z));
  if(e.edad>e.espera&&estado!=='muerto'){
    const d=Math.hypot(e.pos.x-jugador.pos.x,e.pos.y-(jugador.pos.y+.8),e.pos.z-jugador.pos.z);
    if(d<1.7){
      const resto=insertarInv(e.pila);
      if(!resto){e.muerta=true;sonar('recoger');return;}
      e.pila=resto;
    }
  }
  if(e.edad>300||e.pos.y<-40)e.muerta=true;
}
function fusionarItems(){
  const lista=entidades.filter(e=>e.tipo==='item'&&!e.muerta&&e.suelo);
  for(let i=0;i<lista.length;i++){const a=lista[i];if(a.muerta)continue;
    for(let j=i+1;j<lista.length;j++){const b=lista[j];
      if(b.muerta||!mismaPila(a.pila,b.pila)||a.pos.distanceTo(b.pos)>1.2)continue;
      if(a.pila.n+b.pila.n<=maxPila(a.pila.id)){a.pila.n+=b.pila.n;b.muerta=true;}}}
}
function actualizarXP(e,dt){
  e.edad+=dt;
  const obj=new THREE.Vector3(jugador.pos.x,jugador.pos.y+.6,jugador.pos.z), d=e.pos.distanceTo(obj);
  if(d<8&&e.edad>.5&&estado!=='muerto'){const dir=obj.clone().sub(e.pos).normalize();e.vel.addScaledVector(dir,dt*(20-d*2));e.vel.multiplyScalar(Math.pow(.2,dt));}
  if(d<8&&e.edad>.5)e.pos.addScaledVector(e.vel,dt);else fisicaSimple(e,dt,10);
  e.malla.position.copy(e.pos);
  if(d<1&&e.edad>.5&&estado!=='muerto'){e.muerta=true;ganarXP(e.valor);sonar('xp',null,.6);}
  if(e.edad>300)e.muerta=true;
}

/* ---------- Proyectiles ---------- */
const matFlecha=new THREE.MeshBasicMaterial({color:0x8a6a40});
function dispararFlecha(pos,dir,vel,opc){
  const g=new THREE.Group();
  const cuerpo=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.6),matFlecha);g.add(cuerpo);
  const punta=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.1),new THREE.MeshBasicMaterial({color:0xaaaaaa}));punta.position.z=.32;g.add(punta);
  return agregarEnt(Object.assign({tipo:'flecha',pos:pos.clone(),vel:dir.clone().multiplyScalar(vel),edad:0,malla:g,clavada:false},opc));
}
function dispararBola(tipo,pos,dir,vel,opc){
  const s=new THREE.Sprite(tipo==='bolaDragon'?matBolaDragon:matBolaFuego);
  const tam=tipo==='bolaGhast'?1:tipo==='bolaDragon'?1:.4; s.scale.set(tam,tam,tam);
  return agregarEnt(Object.assign({tipo,pos:pos.clone(),vel:dir.clone().multiplyScalar(vel),edad:0,malla:s},opc));
}
const matBolaFuego=(()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');
  x.fillStyle='#ff7a10';x.fillRect(1,1,6,6);x.fillStyle='#ffd040';x.fillRect(2,2,4,4);x.fillStyle='#fff6c0';x.fillRect(3,3,2,2);
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return new THREE.SpriteMaterial({map:t,fog:false});})();
const matBolaDragon=(()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');
  x.fillStyle='#6a1aa0';x.fillRect(1,1,6,6);x.fillStyle='#c060f0';x.fillRect(2,2,4,4);x.fillStyle='#f0c0ff';x.fillRect(3,3,2,2);
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return new THREE.SpriteMaterial({map:t,fog:false});})();
// Recorre el segmento y devuelve el primer choque con un bloque o entidad
function trazarProyectil(e,dt,radio){
  const paso=e.vel.clone().multiplyScalar(dt), dist=paso.length(), n=Math.max(1,Math.ceil(dist/.2));
  const d=paso.clone().divideScalar(n);
  for(let i=0;i<n;i++){
    e.pos.add(d);
    const b=getBloque(Math.floor(e.pos.x),Math.floor(e.pos.y),Math.floor(e.pos.z));
    if(SOLIDO[b]&&e.pos.y-Math.floor(e.pos.y)<BLOQUES[b].altura)return {bloque:[Math.floor(e.pos.x),Math.floor(e.pos.y),Math.floor(e.pos.z)],b};
    if(e.dueno!=='jugador'||e.edad>.1){
      const pj=jugador.pos;
      if(estado!=='muerto'&&e.dueno!=='jugador'&&Math.abs(e.pos.x-pj.x)<.3+radio&&Math.abs(e.pos.z-pj.z)<.3+radio&&e.pos.y>pj.y-radio&&e.pos.y<pj.y+1.8+radio)return {jugador:true};
    }
    for(const m of mobs){
      if(m===e.duenoMob||m.muerto)continue;
      if(Math.abs(e.pos.x-m.pos.x)<m.ancho+radio&&Math.abs(e.pos.z-m.pos.z)<m.ancho+radio&&e.pos.y>m.pos.y-radio&&e.pos.y<m.pos.y+m.alto+radio)return {mob:m};
    }
    if(dragon&&!dragon.muerto&&e.dueno==='jugador'&&dragon.golpeado(e.pos,radio))return {dragon:true};
    for(const c of entidades)if(c.tipo==='cristal'&&!c.muerta&&c.pos.distanceTo(e.pos)<1.2+radio)return {cristal:c};
  }
  return null;
}
function actualizarFlecha(e,dt){
  e.edad+=dt;
  if(e.clavada){
    if(e.edad>60)e.muerta=true;
    if(e.recogible&&estado!=='muerto'&&e.pos.distanceTo(new THREE.Vector3(jugador.pos.x,jugador.pos.y+.5,jugador.pos.z))<1.4){
      if(!insertarInv(crearPila(I.flecha))){e.muerta=true;sonar('recoger');}}
    return;
  }
  e.vel.y-=20*dt; e.vel.multiplyScalar(Math.pow(.8,dt));
  if(esAgua(getBloque(Math.floor(e.pos.x),Math.floor(e.pos.y),Math.floor(e.pos.z))))e.vel.multiplyScalar(Math.pow(.05,dt));
  const choque=trazarProyectil(e,dt,.1);
  e.malla.position.copy(e.pos); e.malla.lookAt(e.pos.clone().add(e.vel));
  if(!choque){if(e.edad>30)e.muerta=true;return;}
  const vel=e.vel.length();
  let dano=Math.ceil(vel/10*(e.dano||1));
  if(e.critico)dano+=azar(0,Math.floor(dano/2)+1);
  const dir={x:e.vel.x/vel,z:e.vel.z/vel};
  if(choque.bloque){
    e.clavada=true; e.edad=0; e.vel.set(0,0,0); sonar('flecha',e.pos,.6);
    if(choque.b===B.tnt&&e.fuego){setBloque(...choque.bloque,0);activarTNT(...choque.bloque,4);}
    return;
  }
  e.muerta=true;
  if(choque.jugador){danarJugador(dano,'flecha',dir);if(e.fuego)encenderJugador(5);}
  else if(choque.mob){
    if(choque.mob.tipo==='enderman'){teletransportarMob(choque.mob);e.muerta=false;e.vel.multiplyScalar(-.1);return;}
    herirMob(choque.mob,dano,dir,e.dueno==='jugador'?'jugador':'flecha',e.retroceso||0);
    if(e.fuego)choque.mob.fuego=Math.max(choque.mob.fuego,5);
  }
  else if(choque.dragon)dragon.herir(dano,'flecha');
  else if(choque.cristal)romperCristal(choque.cristal);
}
function actualizarBola(e,dt){
  e.edad+=dt;
  if(e.tipo==='bolaFuego')e.vel.y-=0;
  const choque=trazarProyectil(e,dt,e.tipo==='bolaGhast'?.5:.3);
  e.malla.position.copy(e.pos);
  if(e.edad>12){e.muerta=true;return;}
  if(!choque)return;
  e.muerta=true;
  const p=e.pos;
  if(e.tipo==='bolaGhast')explosion(p.x,p.y,p.z,1,{fuego:true,fuente:e.duenoMob});
  else if(e.tipo==='bolaFuego'){
    if(choque.jugador){danarJugador(5,'fuego',null);encenderJugador(5);}
    else if(choque.mob){herirMob(choque.mob,5,null,'fuego');choque.mob.fuego=5;}
    else if(choque.bloque){const [x,y,z]=choque.bloque;if(!getBloque(x,y+1,z))setBloque(x,y+1,z,B.fuego);}
  }else if(e.tipo==='bolaDragon'){
    agregarEnt({tipo:'nube',pos:new THREE.Vector3(p.x,Math.floor(p.y)+.5,p.z),edad:0,malla:null});
  }
}
function actualizarNube(e,dt){
  e.edad+=dt;
  if(Math.random()<dt*30)emitirParticulas(e.pos.x+(Math.random()-.5)*5,e.pos.y+Math.random(),e.pos.z+(Math.random()-.5)*5,0xb050f0,1,.5,1,-1);
  const d=Math.hypot(jugador.pos.x-e.pos.x,jugador.pos.z-e.pos.z);
  if(d<3&&Math.abs(jugador.pos.y-e.pos.y)<2){e.tic=(e.tic||0)+dt;if(e.tic>.5){e.tic=0;danarJugador(3,'magia',null);}}
  if(e.edad>6)e.muerta=true;
}
function lanzarDesdeJugador(tipo,vel){
  const dir=new THREE.Vector3(); camara.getWorldDirection(dir);
  const p=camara.position.clone().addScaledVector(dir,.4);
  const s=new THREE.Sprite(matSprite(tipo==='perla'?I.perlaEnder:I.ojoEnder));s.scale.set(.3,.3,.3);
  return agregarEnt({tipo,pos:p,vel:dir.multiplyScalar(vel),edad:0,malla:s,dueno:'jugador'});
}
function actualizarPerla(e,dt){
  e.edad+=dt; e.vel.y-=18*dt;
  const choque=trazarProyectil(e,dt,.1);
  e.malla.position.copy(e.pos);
  if(!choque&&e.edad<20)return;
  e.muerta=true;
  if(estado==='muerto')return;
  emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0x6030a0,12,2,.8,0);
  let y=Math.floor(e.pos.y); if(choque&&choque.bloque)y=choque.bloque[1]+1;
  jugador.pos.set(e.pos.x,y+.01,e.pos.z); jugador.vel.set(0,0,0); jugador.maxY=jugador.pos.y;
  danarJugador(5,'caida',null); sonar('portal',null,.4);
}
function actualizarOjo(e,dt){
  e.edad+=dt;
  if(!e.destino){
    const f=posFortaleza(), dx=f.x+.5-e.pos.x, dz=f.z+.5-e.pos.z, d=Math.hypot(dx,dz)||1, k=Math.min(12,d);
    e.destino=new THREE.Vector3(e.pos.x+dx/d*k,e.pos.y+(d>12?6:-1),e.pos.z+dz/d*k);
    e.origen=e.pos.clone();
  }
  const t=Math.min(1,e.edad/2.2);
  e.pos.lerpVectors(e.origen,e.destino,t);
  if(Math.random()<dt*20)emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0x9050d0,1,.4,.6,0);
  e.malla.position.copy(e.pos);
  if(e.edad>3.2){
    e.muerta=true;
    if(Math.random()<.8)soltarItem(crearPila(I.ojoEnder),e.pos.x,e.pos.y,e.pos.z,false,new THREE.Vector3(0,0,0));
    else{emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0x40a060,10,2,.8,5);sonar('romper',e.pos,.6);}
  }
}

/* ---------- Bloques que caen y dinamita ---------- */
function crearBloqueCayendo(id,x,y,z){
  const m=new THREE.Mesh(geoCuboItem(id,1),matItemBloque.clone());
  agregarEnt({tipo:'cayendo',id,pos:new THREE.Vector3(x+.5,y,z+.5),vel:new THREE.Vector3(),edad:0,malla:m,propio:true});
}
function actualizarCayendo(e,dt){
  e.edad+=dt; e.vel.y=Math.max(-40,e.vel.y-30*dt);
  const ny=e.pos.y+e.vel.y*dt, bx=Math.floor(e.pos.x), bz=Math.floor(e.pos.z);
  const bajo=getBloque(bx,Math.floor(ny),bz);
  if(SOLIDO[bajo]||ny<0){
    const y=Math.floor(ny)+1, aqui=getBloque(bx,y,bz);
    if(aqui===0||REEMPL[aqui])setBloque(bx,y,bz,e.id);else soltarItem(crearPila(e.id),bx+.5,y+.5,bz+.5,true);
    e.muerta=true; sonar('poner',e.pos,.7); return;
  }
  e.pos.y=ny; e.malla.position.set(e.pos.x,e.pos.y+.5,e.pos.z);
  if(e.edad%0.3<dt)e.malla.material.color.setScalar(brilloEn(e.pos.x,e.pos.y+.5,e.pos.z));
  // aplasta al jugador si cae encima
  if(Math.abs(jugador.pos.x-e.pos.x)<.8&&Math.abs(jugador.pos.z-e.pos.z)<.8&&e.pos.y<jugador.pos.y+1.8&&e.pos.y>jugador.pos.y+1.2)danarJugador(1,'asfixia',null);
}
function activarTNT(x,y,z,mecha=4){
  const m=new THREE.Mesh(geoCuboItem(B.tnt,1),matItemBloque.clone());
  agregarEnt({tipo:'tnt',pos:new THREE.Vector3(x+.5,y,z+.5),vel:new THREE.Vector3((Math.random()-.5)*.8,2,(Math.random()-.5)*.8),edad:0,mecha,malla:m,propio:true});
  sonar('mechero',{x,y,z});
}
function actualizarTNT(e,dt){
  e.edad+=dt; fisicaSimple(e,dt,20);
  e.malla.position.set(e.pos.x,e.pos.y+.5,e.pos.z);
  const s=1+Math.max(0,e.edad-e.mecha+.4)*.3;
  e.malla.scale.setScalar(s);
  e.malla.material.color.setScalar(Math.floor(e.edad*5)%2?2.2:brilloEn(e.pos.x,e.pos.y+.5,e.pos.z));
  if(e.edad>=e.mecha){e.muerta=true;explosion(e.pos.x,e.pos.y+.5,e.pos.z,4);}
}

const ACT_ENT={item:actualizarItem,xp:actualizarXP,flecha:actualizarFlecha,bolaGhast:actualizarBola,bolaFuego:actualizarBola,
  bolaDragon:actualizarBola,nube:actualizarNube,perla:actualizarPerla,ojo:actualizarOjo,cayendo:actualizarCayendo,tnt:actualizarTNT,
  cristal:(e,dt)=>actualizarCristal(e,dt)};
function actualizarEntidades(dt){
  _fusionT-=dt; if(_fusionT<=0){_fusionT=1;fusionarItems();}
  for(let i=0;i<entidades.length;i++){const e=entidades[i];if(!e.muerta)ACT_ENT[e.tipo](e,dt);}
  for(let i=entidades.length-1;i>=0;i--){const e=entidades[i];
    if(e.muerta){if(e.malla){escena.remove(e.malla);if(e.propio)e.malla.material.dispose();}
      entidades.splice(i,1);}}
}
