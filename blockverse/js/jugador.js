"use strict";
/* =========================================================
   Jugador: física, estado, daño, experiencia e interacción
   ========================================================= */
const jugador={pos:new THREE.Vector3(),vel:new THREE.Vector3(),ancho:.3,alto:1.8,yaw:0,pitch:0,suelo:false,vuela:false,
  maxY:0,chocoH:false,agachado:false,corriendo:false,subir:true,enAgua:false,ojosAgua:false,enLava:false,bloqueoPortal:false};
let modo='supervivencia';
const supervivencia=()=>modo==='supervivencia';
let salud=20, hambre=20, saturacion=5, agotamiento=0, aire=15, fuegoJ=0, invuln=0, ultimoDano=0;
let xp={nivel:0,puntos:0}, efectos={};
let spawnMundo=null, spawnCama=null;
let inv=new Array(40).fill(null), ranura=0;
const teclas={};
const enMano=()=>inv[ranura];
const enManoId=()=>inv[ranura]?inv[ranura].id:0;

/* ---------- Colisiones ---------- */
function choca(p,a,h){
  const x0=Math.floor(p.x-a),x1=Math.floor(p.x+a-1e-7),y0=Math.floor(p.y-.5),y1=Math.floor(p.y+h-1e-7),z0=Math.floor(p.z-a),z1=Math.floor(p.z+a-1e-7);
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
    const b=getBloque(x,y,z); if(!SOLIDO[b])continue;
    const alt=BLOQUES[b].altura;
    if(p.y<y+alt-1e-7&&p.y+h>y)return [x,y,z,alt];
  }
  return null;
}
function moverEje(e,eje,d){
  const p=e.pos; p[eje]+=d;
  let hubo=false;
  for(let n=0;n<4;n++){
    const c=choca(p,e.ancho,e.alto); if(!c)return hubo;
    // subir escalones bajos (tierra de cultivo, losas)
    if(eje!=='y'&&e.suelo&&e.subir){const sub=c[1]+c[3]-p.y;if(sub>0&&sub<=.6){const py=p.y;p.y+=sub+1e-4;if(!choca(p,e.ancho,e.alto))return hubo;p.y=py;}}
    hubo=true;
    if(eje==='y')p.y=d>0?c[1]-e.alto-1e-4:c[1]+c[3]+1e-4;
    else{const b=c[eje==='x'?0:2];p[eje]=d>0?b-e.ancho-1e-4:b+1+e.ancho+1e-4;}
  }
  return hubo;
}
function haySoporte(e,x,z){return !!choca({x,y:e.pos.y-.1,z},e.ancho,.1);}
function pasoFisico(e,dt){
  const pasos=Math.ceil(Math.max(Math.abs(e.vel.x),Math.abs(e.vel.y),Math.abs(e.vel.z))*dt/0.25)||1;
  const h=dt/pasos; let suelo=false; e.chocoH=false;
  for(let i=0;i<pasos;i++){
    const ox=e.pos.x, oz=e.pos.z;
    if(moverEje(e,'x',e.vel.x*h))e.chocoH=true;
    if(e.agachado&&e.suelo&&!haySoporte(e,e.pos.x,e.pos.z)){e.pos.x=ox;e.vel.x=0;}
    if(moverEje(e,'z',e.vel.z*h))e.chocoH=true;
    if(e.agachado&&e.suelo&&!haySoporte(e,e.pos.x,e.pos.z)){e.pos.z=oz;e.vel.z=0;}
    const vy=e.vel.y;
    if(moverEje(e,'y',vy*h)){if(vy<0)suelo=true;e.vel.y=0;}
  }
  e.suelo=suelo||(!e.vuela&&e.vel.y<=0&&!!choca({x:e.pos.x,y:e.pos.y-0.02,z:e.pos.z},e.ancho,e.alto));
}

/* ---------- Movimiento del jugador ---------- */
let ultimaW=0;
function fisicaJugador(dt,entrada){
  const j=jugador, sup=supervivencia();
  if(sup)j.vuela=false;
  const bPies=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y+.1),Math.floor(j.pos.z));
  const bCuerpo=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y+.8),Math.floor(j.pos.z));
  const bOjos=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y+1.62),Math.floor(j.pos.z));
  j.enAgua=esAgua(bPies)||esAgua(bCuerpo); j.enLava=esLava(bPies)||esLava(bCuerpo); j.ojosAgua=esAgua(bOjos);
  const shift=entrada&&(teclas.ShiftLeft||teclas.ShiftRight);
  j.agachado=shift&&!j.vuela&&!j.enAgua;
  const puedeCorrer=entrada&&teclas.KeyW&&!j.agachado&&!(sup&&hambre<=6);
  if(!puedeCorrer)j.corriendo=false;
  if(puedeCorrer&&teclas.KeyR)j.corriendo=true;
  let rapidez=j.vuela?(j.corriendo?21:11):j.corriendo?5.6:4.3;
  if(j.agachado)rapidez=1.3;
  if(comiendo>=0||arcoCarga>=0)rapidez*=.35;
  if(j.enAgua&&!j.vuela)rapidez*=.5; if(j.enLava)rapidez*=.3;
  if(getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y-.2),Math.floor(j.pos.z))===B.arenaAlmas)rapidez*=.45;
  let fx=0,fz=0;
  if(entrada){if(teclas.KeyW)fz-=1; if(teclas.KeyS)fz+=1; if(teclas.KeyA)fx-=1; if(teclas.KeyD)fx+=1;}
  const len=Math.hypot(fx,fz)||1; fx/=len; fz/=len;
  const s=Math.sin(j.yaw), c=Math.cos(j.yaw);
  const wx=(fx*c+fz*s)*rapidez, wz=(-fx*s+fz*c)*rapidez;
  const hielo=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y-.2),Math.floor(j.pos.z))===B.hielo;
  const k=Math.min(1,dt*(j.vuela?8:j.suelo?(hielo?1.5:14):(j.enAgua?6:4)));
  j.vel.x+=(wx-j.vel.x)*k; j.vel.z+=(wz-j.vel.z)*k;
  if(j.vuela){
    let vy=0; if(entrada&&teclas.Space)vy+=1; if(shift)vy-=1;
    j.vel.y+=(vy*9-j.vel.y)*Math.min(1,dt*12);
  }else if(j.enAgua||j.enLava){
    j.vel.y=Math.max(j.vel.y-(j.enLava?6:8)*dt,-3);
    if(entrada&&teclas.Space){j.vel.y=Math.min(j.vel.y+22*dt,j.chocoH?6:2.8);}
    j.vel.y*=Math.pow(j.enLava?.2:.5,dt);
  }else{
    j.vel.y-=32*dt; if(j.vel.y<-78)j.vel.y=-78;
    if(entrada&&teclas.Space&&j.suelo){j.vel.y=8.9;if(sup)agotamiento+=j.corriendo?.2:.05;
      if(j.corriendo){j.vel.x+=Math.sin(j.yaw)*-1.8;j.vel.z+=Math.cos(j.yaw)*-1.8;}}
  }
  const x0=j.pos.x,z0=j.pos.z;
  pasoFisico(j,dt);
  if(j.suelo&&j.vuela)j.vuela=false;
  if(j.suelo||j.vuela||j.enAgua||j.enLava){
    const caida=j.maxY-j.pos.y;
    if(sup&&j.suelo&&!j.vuela&&!j.enAgua&&caida>3.2){
      const bajo=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y-.2),Math.floor(j.pos.z));
      const f=bajo===B.heno?.2:bajo===B.cama?.5:1;
      danarJugador(Math.ceil((caida-3)*f),'caida',null);
    }
    j.maxY=j.pos.y;
  }else j.maxY=Math.max(j.maxY,j.pos.y);
  const recorrido=Math.hypot(j.pos.x-x0,j.pos.z-z0);
  if(sup){if(j.corriendo&&j.suelo)agotamiento+=recorrido*.1;if(j.enAgua)agotamiento+=recorrido*.01;}
  if(j.pos.y<-40){if(sup||dim===DIMS.end)danarJugador(4,'vacio',null);if(!sup&&dim!==DIMS.end)aparecer();}
}
function aparecer(){
  if(!spawnMundo){
    let x=8.5,z=8.5;
    for(let r=0;r<2000;r+=8){const inf=infoColumna(Math.floor(x+r),Math.floor(z));if(inf.h>NIVEL_MAR+1&&inf.bioma!==BIOMA.montana){x+=r;break;}}
    spawnMundo=[x,z];
  }
  let [x,z]=spawnMundo, y;
  y=CY-1; while(y>0&&(!SOLIDO[getBloque(Math.floor(x),y,Math.floor(z))]||getBloque(Math.floor(x),y,Math.floor(z))===B.hojas))y--;
  jugador.pos.set(x,y+1.01,z); jugador.vel.set(0,0,0); jugador.maxY=jugador.pos.y;
}

/* ---------- Estado: salud, hambre, aire, fuego, efectos ---------- */
function armaduraTotal(){let def=0,dur=0;for(let i=36;i<40;i++){const p=inv[i];if(p){const a=ITEMS[p.id].armadura;def+=a.def;dur+=a.dureza;}}return {def,dur};}
function desgastarArmadura(dano){
  const n=Math.max(1,Math.floor(dano/4));
  for(let i=36;i<40;i++){const p=inv[i];if(!p)continue;
    if(prob(1/(1+nivelEnc(p,'irrompibilidad'))*(.6+.4)))p.dur-=n;
    if(p.dur<=0){inv[i]=null;sonar('rompeHerr');}}
}
function danarJugador(n,tipo,dir){
  if(estado==='muerto'||n<=0)return;
  if(!supervivencia()&&tipo!=='vacio')return;
  if(invuln>0&&tipo!=='vacio'){if(n<=ultimoDano)return;n-=ultimoDano;}
  let d=n;
  if(['mob','flecha','explosion','magia2'].includes(tipo)){
    const {def,dur}=armaduraTotal();
    d=d*(1-Math.min(20,Math.max(def/5,def-d/(2+dur/4)))/25);
    desgastarArmadura(n);
  }
  if(tipo!=='vacio'&&tipo!=='hambre'){
    let epf=0;for(let i=36;i<40;i++)epf+=nivelEnc(inv[i],'proteccion');
    if(tipo==='caida')epf+=nivelEnc(inv[39],'caidaPluma')*3;
    d*=1-Math.min(20,epf)*.04;
  }
  if(invuln<=0)ultimoDano=n;
  salud=Math.max(0,salud-d); invuln=.5; agotamiento+=.1;
  sonar('dano');
  destelloDano();
  if(dir){jugador.vel.x+=dir.x*6;jugador.vel.z+=dir.z*6;jugador.vel.y=Math.max(jugador.vel.y,4.5);}
  actualizarHUD();
  if(salud<=0)morir(tipo);
}
function encenderJugador(seg){if(!supervivencia())return;fuegoJ=Math.max(fuegoJ,seg);}
let regenT=0,hambreT=0,aireT=0,fuegoTick=0,contactoT=0,efectoT=0;
function actualizarEstadoJugador(dt){
  invuln=Math.max(0,invuln-dt);
  const sup=supervivencia();
  // Contacto con bloques peligrosos
  contactoT-=dt;
  if(contactoT<=0){
    contactoT=.5;
    const p=jugador.pos, a=jugador.ancho+.02;
    let cactus=false,fuego=false;
    for(let x=Math.floor(p.x-a);x<=Math.floor(p.x+a);x++)for(let y=Math.floor(p.y);y<=Math.floor(p.y+1.7);y++)for(let z=Math.floor(p.z-a);z<=Math.floor(p.z+a);z++){
      const b=getBloque(x,y,z);if(b===B.cactus)cactus=true;if(b===B.fuego)fuego=true;}
    if(cactus)danarJugador(1,'cactus',null);
    if(fuego){danarJugador(1,'fuego',null);encenderJugador(8);}
    if(jugador.enLava){danarJugador(4,'lava',null);encenderJugador(15);}
  }
  if(jugador.enAgua)fuegoJ=0;
  if(fuegoJ>0){fuegoJ-=dt;fuegoTick-=dt;if(fuegoTick<=0){fuegoTick=1;danarJugador(1,'fuego',null);}}
  // Aire
  if(jugador.ojosAgua&&sup){
    aire-=dt/(1+nivelEnc(inv[36],'respiracion'));
    if(aire<=0){aire=0;aireT-=dt;if(aireT<=0){aireT=1;danarJugador(2,'ahogo',null);}}
  }else aire=Math.min(15,aire+dt*6);
  // Efectos
  for(const k in efectos){efectos[k].t-=dt;if(efectos[k].t<=0)delete efectos[k];}
  efectoT-=dt;
  if(efectoT<=0){efectoT=.5;
    if(efectos.regeneracion&&salud<20){salud=Math.min(20,salud+(efectos.regeneracion.n>1?1:.5));actualizarHUD();}
    if(efectos.veneno&&salud>1)danarJugador(.5,'veneno',null);
    if(efectos.hambre)agotamiento+=.05;
  }
  if(!sup)return;
  // Hambre y saturación
  while(agotamiento>=4){agotamiento-=4;if(saturacion>0)saturacion=Math.max(0,saturacion-1);else if(hambre>0)hambre--;actualizarHUD();}
  if(hambre>=20&&saturacion>0&&salud<20){regenT+=dt;if(regenT>=.5){regenT=0;const s=Math.min(saturacion,6);salud=Math.min(20,salud+s/6);agotamiento+=s;actualizarHUD();}}
  else if(hambre>=18&&salud<20){regenT+=dt;if(regenT>=4){regenT=0;salud=Math.min(20,salud+1);agotamiento+=6;actualizarHUD();}}
  else regenT=0;
  if(hambre<=0){hambreT+=dt;if(hambreT>=4){hambreT=0;if(salud>1)danarJugador(1,'hambre',null);}}else hambreT=0;
}

/* ---------- Experiencia ---------- */
const xpNecesaria=n=>n<=15?2*n+7:n<=30?5*n-38:9*n-158;
function ganarXP(v){
  xp.puntos+=v;
  let subio=false;
  while(xp.puntos>=xpNecesaria(xp.nivel)){xp.puntos-=xpNecesaria(xp.nivel);xp.nivel++;subio=true;}
  if(subio&&xp.nivel%5===0)sonar('nivel');
  actualizarHUD();
}
function gastarNiveles(n){xp.nivel=Math.max(0,xp.nivel-n);xp.puntos=0;actualizarHUD();}

/* ---------- Muerte ---------- */
function morir(causa){
  estado='muerto'; if(ui)cerrarUI(); soltarControles();
  const {x,y,z}=jugador.pos;
  inv.forEach(p=>{if(p)soltarItem(p,x,y+1,z,true);}); inv=new Array(40).fill(null);
  soltarXP(Math.min(100,xp.nivel*7),x,y,z); xp={nivel:0,puntos:0};
  efectos={}; fuegoJ=0;
  const textos={caida:'Caíste desde muy alto.',mob:'Una criatura acabó contigo.',flecha:'Te dispararon una flecha.',hambre:'Moriste de hambre.',
    vacio:'Caíste al vacío.',lava:'Intentaste nadar en lava.',fuego:'Ardiste hasta morir.',ahogo:'Te ahogaste.',explosion:'Volaste por los aires.',
    cactus:'Te pinchaste hasta morir.',magia:'El aliento del dragón te alcanzó.',veneno:'El veneno pudo contigo.',asfixia:'Te aplastó un bloque.'};
  document.getElementById('textoMuerte').textContent=(textos[causa]||'')+' Tus objetos quedaron donde caíste.';
  document.getElementById('muerte').classList.remove('oculto'); mostrarHud(false);
  if(document.pointerLockElement)document.exitPointerLock();
  guardarPartida();
}
function reaparecer(){
  salud=20;hambre=20;saturacion=5;agotamiento=0;aire=15;
  let destino=DIMS.superficie, pos=null;
  if(spawnCama){
    const [cx,cy,cz]=spawnCama;
    if(dim!==DIMS.superficie)cambiarDimension(DIMS.superficie,cx+.5,cy+1,cz+.5,true);
    if(getBloque(cx,cy,cz)===B.cama)pos=[cx+.5,cy+.6,cz+.5];
    else{spawnCama=null;mostrarMensaje('Tu cama no existía o estaba obstruida.');}
  }
  if(dim!==destino)cambiarDimension(destino,0,0,0,true);
  if(pos){jugador.pos.set(...pos);jugador.vel.set(0,0,0);jugador.maxY=jugador.pos.y;}else aparecer();
  jugador.vuela=false;
  actualizarHUD();
}

/* =========================================================
   Apuntar y actuar
   ========================================================= */
function lanzarRayo(o,d,max,liquidos){
  let x=Math.floor(o.x),y=Math.floor(o.y),z=Math.floor(o.z);
  const sx=Math.sign(d.x),sy=Math.sign(d.y),sz=Math.sign(d.z);
  const tdx=sx?Math.abs(1/d.x):Infinity,tdy=sy?Math.abs(1/d.y):Infinity,tdz=sz?Math.abs(1/d.z):Infinity;
  let tx=sx>0?(x+1-o.x)*tdx:sx<0?(o.x-x)*tdx:Infinity;
  let ty=sy>0?(y+1-o.y)*tdy:sy<0?(o.y-y)*tdy:Infinity;
  let tz=sz>0?(z+1-o.z)*tdz:sz<0?(o.z-z)*tdz:Infinity;
  let n=[0,0,0],t=0;
  while(t<=max){
    const b=getBloque(x,y,z);
    if(b&&(!esLiquido(b)||(liquidos&&nivelLiquido(b)===0))&&b!==B.portalNether&&b!==B.portalEnd)return {x,y,z,n,b,t};
    if(tx<ty&&tx<tz){x+=sx;t=tx;tx+=tdx;n=[-sx,0,0];}
    else if(ty<tz){y+=sy;t=ty;ty+=tdy;n=[0,-sy,0];}
    else{z+=sz;t=tz;tz+=tdz;n=[0,0,-sz];}
  }
  return null;
}
function rayoCaja(o,d,mn,mx){
  let t0=0,t1=Infinity;
  for(const e of ['x','y','z']){
    if(Math.abs(d[e])<1e-9){if(o[e]<mn[e]||o[e]>mx[e])return null;continue;}
    let a=(mn[e]-o[e])/d[e],b=(mx[e]-o[e])/d[e]; if(a>b)[a,b]=[b,a];
    t0=Math.max(t0,a); t1=Math.min(t1,b); if(t0>t1)return null;
  }
  return t0;
}
let apuntado=null, apuntadoEnt=null;
const dirVista=new THREE.Vector3();
function actualizarApuntado(){
  camara.getWorldDirection(dirVista);
  const alcance=supervivencia()?4.5:5;
  apuntado=lanzarRayo(camara.position,dirVista,alcance);
  apuntadoEnt=null; let mejor=Math.min(3.2,apuntado?apuntado.t:Infinity);
  for(const m of mobs){
    const t=rayoCaja(camara.position,dirVista,{x:m.pos.x-m.ancho,y:m.pos.y,z:m.pos.z-m.ancho},{x:m.pos.x+m.ancho,y:m.pos.y+m.alto,z:m.pos.z+m.ancho});
    if(t!==null&&t<mejor){mejor=t;apuntadoEnt={mob:m};}
  }
  for(const e of entidades){
    if(e.muerta||(e.tipo!=='cristal'&&e.tipo!=='bolaGhast'))continue;
    const r=e.tipo==='cristal'?1:.6;
    const t=rayoCaja(camara.position,dirVista,{x:e.pos.x-r,y:e.pos.y-r,z:e.pos.z-r},{x:e.pos.x+r,y:e.pos.y+r,z:e.pos.z+r});
    if(t!==null&&t<Math.max(mejor,e.tipo==='cristal'?6:3.2)){mejor=t;apuntadoEnt={ent:e};}
  }
  if(dragon&&!dragon.muerto){
    for(let t=.5;t<6;t+=.5){const p=camara.position.clone().addScaledVector(dirVista,t);
      if(t<mejor+.5&&dragon.golpeado(p,.3)){apuntadoEnt={dragon:true};break;}}
  }
  contorno.visible=!!apuntado&&!apuntadoEnt;
  if(apuntado){
    const b=BLOQUES[apuntado.b],alt=b.forma==='losa'?b.altura:(b.forma==='cruz'||b.forma==='antorcha')?.8:1;
    contorno.scale.set(1,alt,1); contorno.position.set(apuntado.x+.5,apuntado.y+alt/2,apuntado.z+.5);
  }
}

/* ---------- Minar ---------- */
function puedeCosechar(b,pila){const def=BLOQUES[b],h=pila&&ITEMS[pila.id].herr;return !def.nivel||(h&&h.tipo==='pico'&&h.nivel>=def.nivel);}
function tiempoRomper(b,pila){
  const def=BLOQUES[b]; if(def.dureza===Infinity)return Infinity; if(def.dureza===0)return 0;
  const h=pila&&ITEMS[pila.id].herr;
  let vel=1;
  const correcta=h&&(def.herr===h.tipo||(h.tipo==='espada'&&(b===B.hojas)));
  if(correcta){vel=h.vel;const ef=nivelEnc(pila,'eficiencia');if(ef)vel+=ef*ef+1;}
  if(h&&h.tipo==='espada'&&b!==B.hojas)vel=1;
  const puede=puedeCosechar(b,pila);
  if(jugador.ojosAgua)vel/=5;
  if(!jugador.suelo&&!jugador.vuela&&!jugador.enAgua)vel/=5;
  const porTick=vel/def.dureza/(puede?30:100);
  if(porTick>1)return 0;
  return Math.ceil(1/porTick)/20;
}
function gastarObjetoEnMano(n=1){
  const p=enMano(); if(!p||!supervivencia())return;
  const it=ITEMS[p.id];
  if(it.dur){
    const ir=nivelEnc(p,'irrompibilidad');
    for(let k=0;k<n;k++)if(!ir||prob(1/(ir+1)))p.dur--;
    if(p.dur<=0){inv[ranura]=null;sonar('rompeHerr');}
  }
  actualizarHUD();
}
function romperApuntado(){
  if(!apuntado)return;
  const {x,y,z,b}=apuntado;
  if(BLOQUES[b].dureza===Infinity&&supervivencia())return;
  if(b===B.lecho&&y===0)return;
  const p=enMano();
  if(supervivencia()){
    if(puedeCosechar(b,p)){
      if(b===B.hielo&&!nivelEnc(p,'toqueSeda')&&SOLIDO[getBloque(x,y-1,z)]){setBloque(x,y,z,B.agua);terminarRomper(x,y,z,b);return;}
      soltarDropsBloque(b,x,y,z,p);
      const xpB=BLOQUES[b].xp; if(xpB&&!nivelEnc(p,'toqueSeda'))soltarXP(azar(xpB[0],xpB[1]),x+.5,y+.5,z+.5);
    }
    const h=p&&ITEMS[p.id].herr; if(h&&BLOQUES[b].dureza>0)gastarObjetoEnMano(h.tipo==='espada'?2:1);
    agotamiento+=.005;
  }
  if(b===B.tnt&&supervivencia()&&false)activarTNT(x,y,z);
  setBloque(x,y,z,0);
  terminarRomper(x,y,z,b);
}
function terminarRomper(x,y,z,b){
  sonar('romper',{x:x+.5,y:y+.5,z:z+.5});
  emitirParticulas(x+.5,y+.5,z+.5,colorTile[BLOQUES[b].lado],10,2.5,.6);
}

/* ---------- Atacar ---------- */
let ultimoAtaque=-10;
function cadenciaMano(){const p=enMano(),h=p&&ITEMS[p.id].herr;return h?h.cad:4;}
function cargaAtaque(){return clamp((tiempoJuego-ultimoAtaque)*cadenciaMano(),0,1);}
function atacar(){
  if(!apuntadoEnt)return false;
  const carga=cargaAtaque(); ultimoAtaque=tiempoJuego;
  balancearMano();
  if(apuntadoEnt.ent){
    const e=apuntadoEnt.ent;
    if(e.tipo==='cristal')romperCristal(e);
    else if(e.tipo==='bolaGhast'){e.vel.multiplyScalar(-1.2);e.dueno='jugador';e.duenoMob=null;}
    return true;
  }
  const p=enMano(), h=p&&ITEMS[p.id].herr;
  let dano=(h?h.dano:1)*(.2+.8*carga*carga);
  const filo=nivelEnc(p,'filo'); if(filo)dano+=(.5*filo+.5)*carga;
  const critico=carga>.9&&!jugador.suelo&&jugador.vel.y<0&&!jugador.enAgua&&!jugador.vuela;
  if(critico){dano*=1.5;sonar('critico');}
  if(!supervivencia()&&h&&h.tipo==='espada')dano=Math.max(dano,1);
  agotamiento+=.1;
  if(apuntadoEnt.dragon){dragon.herir(dano,'jugador');gastarObjetoEnMano(h&&h.tipo==='espada'?1:2);return true;}
  const m=apuntadoEnt.mob;
  const dx=m.pos.x-jugador.pos.x, dz=m.pos.z-jugador.pos.z, l=Math.hypot(dx,dz)||1;
  const emp=nivelEnc(p,'retroceso')+(jugador.corriendo&&carga>.9?1:0);
  herirMob(m,dano,{x:dx/l*(carga>.5?1:.4),z:dz/l*(carga>.5?1:.4)},'jugador',emp);
  if(critico)emitirParticulas(m.pos.x,m.pos.y+m.alto*.7,m.pos.z,0xffffff,8,2,.5,-2);
  const fuego=nivelEnc(p,'aspectoIgneo'); if(fuego)m.fuego=Math.max(m.fuego,4*fuego);
  if(jugador.corriendo&&carga>.9)jugador.corriendo=false;
  if(h)gastarObjetoEnMano(h.tipo==='espada'?1:2);
  return true;
}

/* ---------- Usar (clic derecho) ---------- */
function puedeColocarEn(id,x,y,z){
  const sop=NECESITA_SOPORTE[id];
  if(sop&&!sop(getBloque(x,y-1,z)))return false;
  if(id===B.cactus)for(const [dx,,dz] of DIR6.slice(0,4))if(SOLIDO[getBloque(x+dx,y,z+dz)])return false;
  if(id===B.cana&&getBloque(x,y-1,z)!==B.cana&&![[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>esAgua(getBloque(x+a,y-1,z+b))))return false;
  return true;
}
function posColocar(){
  if(!apuntado)return null;
  if(REEMPL[apuntado.b]&&!esLiquido(apuntado.b)&&apuntado.b!==B.fuego)return [apuntado.x,apuntado.y,apuntado.z];
  return [apuntado.x+apuntado.n[0],apuntado.y+apuntado.n[1],apuntado.z+apuntado.n[2]];
}
function colocarBloque(id){
  const q=posColocar(); if(!q)return false;
  const [x,y,z]=q;
  if(y<0||y>=CY)return false;
  const actual=getBloque(x,y,z);
  if(actual&&!(REEMPL[actual]))return false;
  if(!puedeColocarEn(id,x,y,z))return false;
  if(SOLIDO[id]){
    const alt=BLOQUES[id].altura;
    const cubre=e=>x+1>e.pos.x-e.ancho&&x<e.pos.x+e.ancho&&y+alt>e.pos.y&&y<e.pos.y+e.alto&&z+1>e.pos.z-e.ancho&&z<e.pos.z+e.ancho;
    if(cubre(jugador)||mobs.some(cubre))return false;
  }
  setBloque(x,y,z,id);
  sonar('poner',{x,y,z}); balancearMano();
  return true;
}
function consumirEnMano(n=1){if(!supervivencia())return;const p=enMano();if(p&&(p.n-=n)<=0)inv[ranura]=null;actualizarHUD();}
let comiendo=-1, arcoCarga=-1, cdUso=0;
function puedeComer(){const p=enMano();if(!p)return false;const it=ITEMS[p.id];return !!it.comida&&(hambre<20||it.siempre||!supervivencia());}
function terminarComer(){
  const p=enMano(); if(!p)return;
  const it=ITEMS[p.id];
  hambre=Math.min(20,hambre+it.comida[0]); saturacion=Math.min(hambre,saturacion+it.comida[1]);
  if(it.efecto&&prob(it.efecto[2]||1)){const [nombre,seg]=it.efecto;efectos[nombre]={t:seg,n:it.id===I.manzanaDorada?2:1};}
  consumirEnMano(); sonar('recoger'); actualizarHUD();
}
function soltarArco(){
  if(arcoCarga<0)return;
  const carga=Math.min(1,arcoCarga);
  arcoCarga=-1;
  const p=enMano(); if(!p||p.id!==I.arco)return;
  if(carga<.1)return;
  const inf=nivelEnc(p,'infinidad');
  const idxFlecha=inv.findIndex((s,i)=>s&&s.id===I.flecha&&i<36);
  if(supervivencia()&&idxFlecha<0)return;
  const f=(carga*carga+carga*2)/3;
  camara.getWorldDirection(dirVista);
  const poder=nivelEnc(p,'poder');
  dispararFlecha(camara.position.clone().addScaledVector(dirVista,.4),dirVista.clone(),55*f,
    {dueno:'jugador',critico:f>=1,dano:1+(poder?.25*(poder+1):0),fuego:!!nivelEnc(p,'llama'),recogible:supervivencia()&&!inf});
  sonar('arco');
  if(supervivencia()){if(!inf){const s=inv[idxFlecha];if(--s.n<=0)inv[idxFlecha]=null;}gastarObjetoEnMano(1);}
  actualizarHUD();
}
function usarDerecho(){
  cdUso=.25;
  const p=enMano(), id=p?p.id:0, it=id?ITEMS[id]:null;
  // Criaturas: alimentar para criar
  if(apuntadoEnt&&apuntadoEnt.mob){
    const m=apuntadoEnt.mob;
    if(m.def.comida===id&&!m.bebe&&!(m.cria>0)&&!(m.amor>0)){m.amor=30;consumirEnMano();emitirParticulas(m.pos.x,m.pos.y+m.alto,m.pos.z,0xff6080,5,1,.8,-1);return;}
  }
  // Bloques con los que se interactúa
  if(apuntado&&!apuntadoEnt&&!jugador.agachado){
    const b=apuntado.b, inter=BLOQUES[b].inter;
    if(inter==='cama'){dormir(apuntado);return;}
    if(inter){abrirUI(inter,apuntado);return;}
    if(b===B.tnt&&(id===I.mechero)){setBloque(apuntado.x,apuntado.y,apuntado.z,0);activarTNT(apuntado.x,apuntado.y,apuntado.z);gastarObjetoEnMano();return;}
    if(b===B.marcoEnd&&id===I.ojoEnder){setBloque(apuntado.x,apuntado.y,apuntado.z,B.marcoEndOjo);consumirEnMano();sonar('portal',null,.5);
      comprobarPortalEnd(apuntado.x,apuntado.y,apuntado.z);return;}
  }
  if(!it)return;
  if(it.comida&&puedeComer()){comiendo=0;return;}
  if(id===I.arco){if(!supervivencia()||inv.some((s,i)=>s&&s.id===I.flecha&&i<36)||nivelEnc(p,'infinidad'))arcoCarga=0;return;}
  if(it.armadura){const slot=36+it.armadura.pieza;const prev=inv[slot];inv[slot]=p;inv[ranura]=prev;sonar('poner');actualizarHUD();return;}
  if(id===I.perlaEnder){if(supervivencia()){lanzarDesdeJugador('perla',28);consumirEnMano();}else lanzarDesdeJugador('perla',28);cdUso=1;return;}
  if(id===I.ojoEnder){if(dim===DIMS.superficie){lanzarDesdeJugador('ojo',0);consumirEnMano();sonar('portal',null,.3);}return;}
  if(id===I.cubo){
    camara.getWorldDirection(dirVista);
    const r=lanzarRayo(camara.position,dirVista,5,true);
    if(r&&esLiquido(r.b)&&nivelLiquido(r.b)===0){
      setBloque(r.x,r.y,r.z,0);sonar(esAgua(r.b)?'agua':'lava',{x:r.x,y:r.y,z:r.z});
      const lleno=crearPila(esAgua(r.b)?I.cuboAgua:I.cuboLava);
      if(!supervivencia())return;
      if(p.n===1)inv[ranura]=lleno;else{p.n--;const resto=insertarInv(lleno);if(resto)soltarItem(resto,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}
      actualizarHUD();
    }
    return;
  }
  if(id===I.cuboAgua||id===I.cuboLava){
    const q=posColocar(); if(!q)return;
    const [x,y,z]=q, act=getBloque(x,y,z);
    if(act&&!REEMPL[act])return;
    if(id===I.cuboAgua&&dim===DIMS.nether){emitirParticulas(x+.5,y+.5,z+.5,0xdddddd,12,1.5,1,-3);sonar('lava',{x,y,z});}
    else{if(act&&!esLiquido(act))soltarDropsBloque(act,x,y,z,null);setBloque(x,y,z,id===I.cuboAgua?B.agua:B.lava);sonar(id===I.cuboAgua?'agua':'lava',{x,y,z});}
    if(supervivencia())inv[ranura]=crearPila(I.cubo);
    actualizarHUD();balancearMano();return;
  }
  if(id===I.mechero){
    const q=posColocar(); if(!q)return;
    const [x,y,z]=q;
    if(getBloque(x,y,z))return;
    sonar('mechero',{x,y,z});
    if(!intentarPortalNether(x,y,z)&&(SOLIDO[getBloque(x,y-1,z)]||DIR6.some(([a,b,c])=>BLOQUES[getBloque(x+a,y+b,z+c)].inflamable)))setBloque(x,y,z,B.fuego);
    gastarObjetoEnMano();balancearMano();return;
  }
  if(id===I.harinaHueso&&apuntado){
    const {x,y,z,b}=apuntado;
    let usado=false;
    if(b>=B.trigo0&&b<B.trigo0+7){setBloque(x,y,z,Math.min(B.trigo0+7,b+azar(2,5)));usado=true;}
    else if(b===B.brote){if(prob(.45))crecerArbol(x,y,z);usado=true;}
    else if(b===B.cesped&&!getBloque(x,y+1,z)){
      for(let k=0;k<12;k++){const nx=x+azar(-3,3),nz=z+azar(-3,3);let ny=y+1;
        if(getBloque(nx,ny-1,nz)===B.cesped&&!getBloque(nx,ny,nz))setBloque(nx,ny,nz,prob(.85)?B.hierbaAlta:prob(.5)?B.florAmarilla:B.florRoja);}
      usado=true;}
    if(usado){consumirEnMano();emitirParticulas(x+.5,y+1,z+.5,0x60ff60,8,1,.8,-1);balancearMano();}
    return;
  }
  if(it.tipoHerr==='azada'&&apuntado){
    const {x,y,z,b}=apuntado;
    if((b===B.cesped||b===B.tierra)&&!getBloque(x,y+1,z)){setBloque(x,y,z,B.cultivo);gastarObjetoEnMano();sonar('poner',{x,y,z});balancearMano();}
    return;
  }
  if(id===I.semillas&&apuntado){
    if(apuntado.b===B.cultivo&&!getBloque(apuntado.x,apuntado.y+1,apuntado.z)){setBloque(apuntado.x,apuntado.y+1,apuntado.z,B.trigo0);consumirEnMano();balancearMano();}
    return;
  }
  if(it.bloque){if(colocarBloque(id))consumirEnMano();return;}
}

/* ---------- Camas y sueño ---------- */
function dormir(a){
  if(dim!==DIMS.superficie){setBloque(a.x,a.y,a.z,0);explosion(a.x+.5,a.y+.5,a.z+.5,5,{fuego:true});return;}
  spawnCama=[a.x,a.y,a.z];
  if(sol>-.02&&!lloviendo){mostrarMensaje('Solo puedes dormir de noche. Punto de reaparición guardado.');return;}
  if(mobs.some(m=>m.def.tipo==='hostil'&&m.pos.distanceTo(jugador.pos)<8)){mostrarMensaje('No puedes descansar ahora, hay monstruos cerca.');return;}
  estado='durmiendo'; soltarControles();
  const velo=document.getElementById('velo'); velo.classList.remove('oculto'); velo.style.opacity=0;
  requestAnimationFrame(()=>{velo.style.opacity=1;});
  setTimeout(()=>{tiempoDia=.0;lloviendo=false;climaT=600+Math.random()*1200;velo.style.opacity=0;
    setTimeout(()=>{velo.classList.add('oculto');if(estado==='durmiendo'){estado='jugando';bloquear();}},700);
    mostrarMensaje('Buenos días. Punto de reaparición guardado.');guardarPartida();},2200);
}

/* =========================================================
   Portales y cambio de dimensión
   ========================================================= */
function intentarPortalNether(x,y,z){
  if(dim===DIMS.end)return false;
  const OBS=B.obsidiana;
  for(const eje of ['x','z']){
    const g=(a,yy)=>eje==='x'?getBloque(a,yy,z):getBloque(x,yy,a);
    const c=eje==='x'?x:z;
    let y0=y; while(g(c,y0-1)===0&&y-y0<22)y0--;
    if(g(c,y0-1)!==OBS)continue;
    let a0=c; while((g(a0-1,y0)===0||g(a0-1,y0)===B.fuego)&&c-a0<22)a0--;
    if(g(a0-1,y0)!==OBS)continue;
    let a1=c; while((g(a1+1,y0)===0||g(a1+1,y0)===B.fuego)&&a1-c<22)a1++;
    if(g(a1+1,y0)!==OBS)continue;
    const ancho=a1-a0+1; if(ancho<2||ancho>21)continue;
    let h=0; while((g(a0,y0+h)===0||g(a0,y0+h)===B.fuego)&&h<22)h++;
    if(h<3||h>21)continue;
    let ok=true;
    for(let a=a0;a<=a1&&ok;a++){if(g(a,y0-1)!==OBS||g(a,y0+h)!==OBS)ok=false;
      for(let yy=y0;yy<y0+h&&ok;yy++){const b=g(a,yy);if(b!==0&&b!==B.fuego)ok=false;}}
    for(let yy=y0;yy<y0+h&&ok;yy++)if(g(a0-1,yy)!==OBS||g(a1+1,yy)!==OBS)ok=false;
    if(!ok)continue;
    for(let a=a0;a<=a1;a++)for(let yy=y0;yy<y0+h;yy++){if(eje==='x')setBloque(a,yy,z,B.portalNether,{sinAviso:true});else setBloque(x,yy,a,B.portalNether,{sinAviso:true});}
    sonar('portal');
    return true;
  }
  return false;
}
function comprobarPortalEnd(x,y,z){
  // Busca un anillo de 12 marcos con ojo alrededor de un hueco de 3x3
  for(let cx=x-4;cx<=x+4;cx++)for(let cz=z-4;cz<=z+4;cz++){
    let ok=true;
    for(let a=-1;a<=1&&ok;a++){
      for(const [px,pz] of [[cx+a,cz-2],[cx+a,cz+2],[cx-2,cz+a],[cx+2,cz+a]])if(getBloque(px,y,pz)!==B.marcoEndOjo)ok=false;}
    if(!ok)continue;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)setBloque(cx+a,y,cz+b,B.portalEnd,{sinAviso:true});
    sonar('portal');sonar('explosion',null,.3);
    mostrarMensaje('El portal del End se ha activado.');
    return true;
  }
  return false;
}
let portalT=0;
function comprobarPortales(dt){
  const p=jugador.pos;
  let enNether=false,enEnd=false;
  for(const dy of [.1,1]){const b=getBloque(Math.floor(p.x),Math.floor(p.y+dy),Math.floor(p.z));if(b===B.portalNether)enNether=true;if(b===B.portalEnd)enEnd=true;}
  if(!enNether&&!enEnd){jugador.bloqueoPortal=false;portalT=0;efectoPortal(0);return;}
  if(jugador.bloqueoPortal)return;
  if(enEnd){
    jugador.bloqueoPortal=true;
    if(dim===DIMS.end){mostrarCreditos();return;}
    cambiarDimension(DIMS.end,100.5,OY+49,.5);
    return;
  }
  portalT+=dt; efectoPortal(portalT/(supervivencia()?4:1));
  if(portalT>=(supervivencia()?4:1)){
    portalT=0;jugador.bloqueoPortal=true;efectoPortal(0);
    viajarNether();
  }
}
function viajarNether(){
  const p=jugador.pos, aNether=dim===DIMS.superficie;
  const destino=aNether?DIMS.nether:DIMS.superficie, f=aNether?1/8:8;
  const tx=Math.floor(p.x*f), tz=Math.floor(p.z*f);
  cambiarDimension(destino,tx+.5,p.y,tz+.5,true);
  // ¿Hay un portal cerca?
  let mejor=null,md=1e9;
  const r=aNether?16:64;
  for(let x=tx-r;x<=tx+r;x++)for(let z=tz-r;z<=tz+r;z++){
    if((x-tx)**2+(z-tz)**2>r*r)continue;
    const ch=obtenerChunk(Math.floor(x/CX),Math.floor(z/CZ)),lx=x-ch.cx*CX,lz=z-ch.cz*CZ;
    for(let y=ch.ymin;y<=ch.ymax;y++)if(ch.datos[idx(lx,y,lz)]===B.portalNether){
      const d=(x-tx)**2+(z-tz)**2+(y-p.y)**2; if(d<md){md=d;mejor=[x,y,z];}break;}
  }
  if(mejor){
    let [x,y,z]=mejor; while(getBloque(x,y-1,z)===B.portalNether)y--;
    jugador.pos.set(x+.5,y,z+.5);
  }else{
    const [x,y,z]=construirPortal(tx,tz,destino);
    jugador.pos.set(x+.5,y,z+.5);
  }
  jugador.vel.set(0,0,0); jugador.maxY=jugador.pos.y; jugador.bloqueoPortal=true;
  gestionarChunks(60,jugador.pos.x,jugador.pos.z);
}
function construirPortal(tx,tz,d){
  const ymin=d===DIMS.nether?OY+34:OY+2, ymax=d===DIMS.nether?OY+110:CY-8;
  let mejorY=-1;
  for(let y=ymax;y>=ymin&&mejorY<0;y--){
    let ok=SOLIDO[getBloque(tx,y-1,tz)]&&!esLiquido(getBloque(tx,y-1,tz));
    for(let a=-1;a<=2&&ok;a++)for(let h=0;h<4&&ok;h++)if(getBloque(tx+a,y+h,tz))ok=false;
    if(ok)mejorY=y;
  }
  const y0=mejorY>0?mejorY:(d===DIMS.nether?OY+70:NIVEL_MAR+10);
  for(let a=-1;a<=2;a++)for(let h=-1;h<=3;h++)for(let dz=-1;dz<=1;dz++){
    const x=tx+a,y=y0+h,z=tz+dz;
    if(h===-1)setBloque(x,y,z,B.obsidiana,{sinAviso:true});
    else if(dz===0){
      const marco=a===-1||a===2||h===3;
      setBloque(x,y,z,marco?B.obsidiana:B.portalNether,{sinAviso:true});
    }else if(h<3)setBloque(x,y,z,0,{sinAviso:true});
  }
  return [tx,y0,tz];
}
function cambiarDimension(nueva,x,y,z,sinPlataforma){
  if(ui)cerrarUI();
  guardarPartida();
  quitarTodasLasMallas(dim); dim.chunks.clear(); chunksSucios.clear();
  limpiarMobs(); limpiarEntidades(); limpiarSimulacion(); quitarDragon();
  dim=nueva;
  jugador.pos.set(x,y,z); jugador.vel.set(0,0,0); jugador.maxY=y; portalT=0;
  if(nueva===DIMS.end){
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){setBloque(100+a,OY+48,b,B.obsidiana,{sinAviso:true});for(let h=1;h<=3;h++)setBloque(100+a,OY+48+h,b,0,{sinAviso:true});}
    if(!mundoEstado.dragonMuerto){crearCristales();crearDragon();}
  }
  gestionarChunks(80,x,z);
  sonar('portal',null,.6);
  mostrarMensaje(nueva.nombre);
}
