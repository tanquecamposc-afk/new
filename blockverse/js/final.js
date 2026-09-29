"use strict";
/* =========================================================
   Bruja, monumento oceánico con guardianes, shulkers,
   exhibidor de élitros en los barcos del End, cofres y
   puertas animados, maza en 3D, esponjas y vista en
   tercera persona con el modelo del jugador (F5).
   ========================================================= */
Object.assign(SND,{
  bruja:v=>{tonoSnd(420,300,.25,'square',.04*v);tonoSnd(500,380,.2,'square',.03*v,.25);},
  guardian:v=>{tonoSnd(220,120,.5,'sine',.08*v);},
  laser:v=>tonoSnd(300,1200,1.8,'sawtooth',.05*v),
  shulker:v=>ruidoSnd(.25,900,.15*v,'bandpass'),
  cofreAbrir:v=>{ruidoSnd(.18,700,.2*v,'bandpass');tonoSnd(160,120,.15,'triangle',.05*v);},
  cofreCerrar:v=>{ruidoSnd(.12,500,.22*v);tonoSnd(120,90,.1,'square',.05*v);},
});
Object.assign(NOMBRE_EFECTO,{lentitud:'Lentitud',debilidad:'Debilidad',levitacion:'Levitación',fatigaMinera:'Fatiga minera'});
Object.assign(COLOR_EFECTO,{lentitud:'#5a6c81',debilidad:'#484d48',levitacion:'#ceffff',fatigaMinera:'#4a4217'});

/* ---------- Efectos negativos ---------- */
function efectoJugador(ef,seg){if(!supervivencia()||estado==='muerto')return;if(!efectos[ef]||efectos[ef].t<seg)efectos[ef]={t:seg,n:1};}

/* =========================================================
   Bruja
   ========================================================= */
Object.assign(DEF_MOB,{bruja:{vida:26,ancho:.3,alto:1.95,vel:2.2,tipo:'hostil',ia:'bruja',xp:[5,5],sonido:'bruja',
  suelta:b=>[[I.redstone,prob(.3)?azar(1,2+b):0],[I.polvoLuminoso,prob(.3)?azar(1,2):0],[516,prob(.3)?azar(1,2):0],[I.ojoArana,prob(.25)?1:0],
    [500,prob(.3)?azar(1,2):0],[I.palo,prob(.3)?azar(1,2):0],[I.polvora,prob(.3)?azar(1,2):0]]}});
NOMBRE_MOB.bruja='Bruja';
MODELOS_EXTRA.bruja=({pon,parte,piernas,brazos,extra})=>{
  [-1,1].forEach(s=>{const p=pon(parte(.22,.7,.22,0x3a2a3a,true),s*.12,.7,0);p.userData.s=s;piernas.push(p);});
  pon(parte(.52,.95,.34,0x4a2a6a),0,1.18,0);
  extra.cabeza=pon(parte(.46,.56,.46,0xa8c090),0,1.93,0);
  pon(parte(.12,.26,.12,0x98b080),0,1.82,.28); pon(parte(.05,.05,.03,0x406030),.04,1.74,.35);
  pon(parte(.08,.08,.02,0x80e060),-.11,1.98,.235); pon(parte(.08,.08,.02,0x80e060),.11,1.98,.235);
  pon(parte(.6,.08,.6,0x2a3a2a),0,2.24,0); pon(parte(.4,.2,.4,0x2a3a2a),0,2.38,0); pon(parte(.24,.2,.24,0x2a3a2a),0,2.56,-.04); pon(parte(.1,.16,.1,0x2a3a2a),0,2.72,-.1);
  pon(parte(.42,.04,.42,0x7a9a3a),0,2.3,0);
  pon(parte(.62,.22,.26,0x4a2a6a),0,1.42,.2);
  extra.frasco=pon(parte(.12,.2,.12,0x8a40c0),0,1.3,.4); extra.frasco.visible=false;
};
const POCIONES_BRUJA={veneno:0x4e9331,lentitud:0x5a6c81,debilidad:0x484d48,dano:0x430a09};
IA_EXTRA.bruja=(m,dt,c)=>{
  if(m.bebiendo>0){m.bebiendo-=dt;m.mover=false;if(m.extra.frasco)m.extra.frasco.visible=true;
    if(m.bebiendo<=0){m.vida=Math.min(m.def.vida,m.vida+6);m.extra.frasco.visible=false;emitirParticulas(m.pos.x,m.pos.y+1.6,m.pos.z,0xf82423,8,1,.6,-1);sonar('beber',m.pos);}
    return true;}
  if(m.vida<m.def.vida*.5&&!(m.bebioT>0)){m.bebiendo=1.6;m.bebioT=12;return true;}
  m.bebioT=(m.bebioT||0)-dt;
  if(c.persigue){
    m.yawObj=Math.atan2(c.dx,c.dz);
    if(c.dist<4)mover(m,-c.dx,-c.dz,m.def.vel);else if(c.dist>9)mover(m,c.dx,c.dz,m.def.vel);else m.mover=false;
    if(m.cd<=0&&c.dist3<12&&hayLineaVision(c.eye,c.ojoJ)){
      m.cd=3+Math.random()*1.5;
      const tipo=!efectos.veneno&&c.dist3<8?'veneno':c.dist3>=8&&!efectos.lentitud?'lentitud':Math.random()<.25&&!efectos.debilidad?'debilidad':'dano';
      const dir=new THREE.Vector3(c.dx,c.dy+c.dist*.35,c.dz).normalize();
      const s=new THREE.Sprite(matSprite(510));s.material=s.material.clone();s.material.color.setHex(POCIONES_BRUJA[tipo]);s.scale.set(.3,.3,.3);
      agregarEnt({tipo:'pocionBruja',efecto:tipo,pos:c.eye.clone().addScaledVector(dir,.5),vel:dir.multiplyScalar(11),edad:0,malla:s,dueno:'mob',duenoMob:m,propio:true});
      m.golpeT=.35; sonar('bruja',m.pos,.8);
    }
  }else{m.t-=dt;if(m.t<=0){m.t=3+Math.random()*4;m.mover=Math.random()<.4;m.yawObj=Math.random()*6.28;}}
  return true;
};
ACT_ENT.pocionBruja=(e,dt)=>{
  e.edad+=dt; e.vel.y-=18*dt;
  const ch=trazarProyectil(e,dt,.2); e.malla.position.copy(e.pos); e.malla.material.rotation=e.edad*9;
  if(!ch&&e.edad<8)return;
  e.muerta=true; const p=e.pos;
  sonar('cristal',p); emitirParticulas(p.x,p.y,p.z,POCIONES_BRUJA[e.efecto],26,3,1,2);
  const d=Math.hypot(jugador.pos.x-p.x,jugador.pos.y+1-p.y,jugador.pos.z-p.z);
  if(d<4){const f=1-d/4*.6;
    if(e.efecto==='dano')danarJugador(6*f,'magia2',null);
    else efectoJugador(e.efecto,Math.round((e.efecto==='veneno'?45:e.efecto==='lentitud'?90:90)*f));}
};
// Cabañas de bruja: las brujas aparecen allí
function cabanasCerca(x,z){
  const cx0=Math.floor(x/CX),cz0=Math.floor(z/CZ),res=[];
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){const cx=cx0+a,cz=cz0+b;
    if(hash2(cx,cz,semilla+9920)>=.018)continue;
    const inf=infoColumna(cx*CX+8,cz*CZ+8);
    if(inf.bioma===BIOMA.pantano||inf.bioma===BIOMA.manglar)res.push({x:cx*CX+7.5,z:cz*CZ+7.5,y:Math.max(inf.h,NIVEL_MAR)+4});}
  return res;
}

/* =========================================================
   Monumento oceánico
   ========================================================= */
const R_MON=448, _monCache=new Map();
function monumentoEn(rx,rz){
  const k=rx+','+rz; if(_monCache.has(k))return _monCache.get(k);
  let res=null;
  if(hash2(rx,rz,semilla+9800)<.6){
    const x=rx*R_MON+60+Math.floor(hash2(rx,rz,semilla+9801)*(R_MON-120)), z=rz*R_MON+60+Math.floor(hash2(rx,rz,semilla+9802)*(R_MON-120));
    let ok=true, hmin=999;
    for(const [dx,dz] of [[0,0],[-18,-18],[18,-18],[-18,18],[18,18]]){const inf=infoColumna(x+dx,z+dz);if(inf.bioma!==BIOMA.oceano||inf.h>NIVEL_MAR-12)ok=false;hmin=Math.min(hmin,inf.h);}
    if(ok){const F=Math.max(hmin+1,NIVEL_MAR-24);res={x,z,F,H:NIVEL_MAR-2-F,clave:'mon:'+x+','+z};}
  }
  _monCache.set(k,res); return res;
}
function monumentosCerca(x0,z0,x1,z1){
  const res=[];
  for(let rx=Math.floor((x0-24)/R_MON);rx<=Math.floor((x1+24)/R_MON);rx++)for(let rz=Math.floor((z0-24)/R_MON);rz<=Math.floor((z1+24)/R_MON);rz++){
    const m=monumentoEn(rx,rz); if(m)res.push(m);}
  return res;
}
function bloqueMonumento(dx,y,dz,M){
  const rel=y-M.F, ax=Math.abs(dx), az=Math.abs(dz), H=M.H;
  if(ax>20||az>20)return -1;
  if(rel===-1)return B.ladrillosPrismarina;
  if(rel<0)return -1;
  const alaTecho=8, salaTecho=Math.min(H-5,14);
  let techo;
  if(ax<=5&&az<=5)techo=H;else if(ax<=11&&az<=16)techo=salaTecho;else techo=alaTecho;
  if(rel>techo)return -1;
  const agua=y<=NIVEL_MAR?B.agua:0;
  // Entrada
  if(dz<=-15&&ax<=2&&rel<=4)return agua;
  // Núcleo de oro
  if(ax<=2&&az<=2&&rel<=2){if(dx>=-1&&dx<=0&&dz>=-1&&dz<=0&&rel<=1)return B.bloqueOro;return B.prismarinaOscura;}
  const muro=(ax===20||az===20)||(rel>alaTecho&&((ax===11&&az<=16)||(az===16&&ax<=11)))||(rel>salaTecho&&((ax===5&&az<=5)||(az===5&&ax<=5)));
  if(rel===techo){if(((dx+dz)%5+5)%5===0&&(ax+az)%2===0)return B.farolMarino;return techo===H?B.prismarinaOscura:B.prismarina;}
  if(muro){
    if(ax%5===0&&az%5===0)return B.prismarinaOscura;
    if(rel%4===2&&(dx%3===0||dz%3===0)&&!(ax===20&&az===20))return agua;
    return (rel+dx+dz)%3===0?B.ladrillosPrismarina:B.prismarina;
  }
  // Pisos interiores y columnas
  if(rel===6&&ax<=11&&az<=16&&!(ax<=3&&az<=3)&&!(dx%7===0&&dz%5===0))return B.ladrillosPrismarina;
  if(rel<techo&&ax%6===3&&az%6===3&&ax<=17)return B.prismarinaOscura;
  if(rel===techo-1&&ax%4===0&&az%4===0)return B.farolMarino;
  // Salas de esponjas
  if(rel===7&&ax>=13&&ax<=16&&az<=2)return B.esponjaMojada;
  return agua;
}
function construirMonumentos(ch){
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  for(const M of monumentosCerca(bx,bz,bx+CX-1,bz+CZ-1)){
    if(bx+CX<M.x-21||bx>M.x+21||bz+CZ<M.z-21||bz>M.z+21)continue;
    for(let x=Math.max(bx,M.x-20);x<=Math.min(bx+CX-1,M.x+20);x++)for(let z=Math.max(bz,M.z-20);z<=Math.min(bz+CZ-1,M.z+20);z++){
      const lx=x-bx,lz=z-bz;
      for(let y=M.F-1;y<=M.F+M.H;y++){const b=bloqueMonumento(x-M.x,y,z-M.z,M);if(b>=0)ch.datos[idx(lx,y,lz)]=b;}
      for(let y=M.F-2;y>M.F-14&&y>1;y--){const b=ch.datos[idx(lx,y,lz)];if(b&&!esLiquido(b))break;ch.datos[idx(lx,y,lz)]=B.prismarina;}
    }
  }
}
// Guardianes
Object.assign(DEF_MOB,{
  guardian:{vida:30,ancho:.45,alto:.85,vel:2.4,tipo:'hostil',ia:'guardian',vuela:true,xp:[10,10],sonido:'guardian',
    suelta:b=>[[547,azar(0,2+b)],[548,prob(.4)?1:0]]},
  guardianAnciano:{vida:80,ancho:1,alto:2,vel:1.2,tipo:'hostil',ia:'guardian',vuela:true,xp:[10,10],sonido:'guardian',anciano:true,
    suelta:b=>[[B.esponjaMojada,1],[547,azar(0,2+b)],[548,prob(.5)?azar(1,2):0]]},
});
Object.assign(NOMBRE_MOB,{guardian:'Guardián',guardianAnciano:'Guardián anciano'});
const modeloGuardian=(t,col,espina)=>({g,pon,parte,extra})=>{
  const cuerpo=pon(parte(t,t*.8,t,col),0,t*.5,0);
  extra.ojo=pon(parte(t*.34,t*.34,.03,0xf0f0e0),0,t*.5,t*.5+.01); const pupila=pon(parte(t*.14,t*.14,.03,0x6a2a10),0,t*.5,t*.5+.03); extra.pupila=pupila;
  extra.espinas=[];
  for(const [x,y,z] of [[1,1,0],[-1,1,0],[0,1,1],[0,1,-1],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[1,-1,0],[-1,-1,0],[0,-1,1],[0,-1,-1]]){
    const e=pon(parte(t*.1,t*.35,t*.1,espina),x*t*.52,t*.5+y*t*.45,z*t*.52);e.rotation.set(z*.8,0,-x*.8);extra.espinas.push(e);}
  extra.cola=[pon(parte(t*.3,t*.3,t*.5,col),0,t*.5,-t*.7),pon(parte(t*.2,t*.2,t*.4,col),0,t*.5,-t*1.1),pon(parte(t*.3,t*.05,t*.3,0xd08040),0,t*.5,-t*1.4)];
};
MODELOS_EXTRA.guardian=modeloGuardian(.85,0x6a9a8a,0xd8c8a8);
MODELOS_EXTRA.guardianAnciano=modeloGuardian(1.9,0xc8c8b8,0x8a8078);
const matLaser=new THREE.LineBasicMaterial({color:0x60e0ff});
IA_EXTRA.guardian=(m,dt,c)=>{
  const enAgua=esAgua(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+m.alto*.5),Math.floor(m.pos.z)));
  if(m.extra.espinas)m.extra.espinas.forEach((e,i)=>e.scale.y=.8+Math.sin(tiempoJuego*3+i)*.25);
  if(m.extra.cola)m.extra.cola.forEach((e,i)=>e.rotation.y=Math.sin(tiempoJuego*4-i)*.4);
  if(!enAgua){m.vel.y-=25*dt;if(m.suelo&&Math.random()<dt*2){m.vel.y=5;m.vel.x=(Math.random()-.5)*3;m.vel.z=(Math.random()-.5)*3;}quitarLaser(m);return true;}
  // Fatiga minera del anciano
  if(m.def.anciano){m.fatigaT=(m.fatigaT||0)-dt;if(m.fatigaT<=0&&c.dist3<50&&objetivoValido()){m.fatigaT=30;
    if(!efectos.fatigaMinera){efectoJugador('fatigaMinera',300);sonar('guardian',null,1);mostrarMensaje('El guardián anciano te ha maldecido: fatiga minera');}}}
  const puedeVer=c.dist3<(m.def.anciano?14:16)&&objetivoValido()&&hayLineaVision(c.eye,c.ojoJ);
  if(puedeVer&&(jugador.enAgua||jugador.ojosAgua||c.dist3<6)){
    m.yawObj=Math.atan2(c.dx,c.dz);
    m.vel.multiplyScalar(Math.pow(.2,dt));
    m.cargaLaser=(m.cargaLaser||0)+dt;
    if(!m.laser){m.laser=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),matLaser.clone());escena.add(m.laser);sonar('laser',m.pos,.8);}
    const a=new THREE.Vector3(m.pos.x,m.pos.y+m.alto*.5,m.pos.z), b=new THREE.Vector3(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z);
    m.laser.geometry.setFromPoints([a,b]); const f=Math.min(1,m.cargaLaser/2);
    m.laser.material.color.setRGB(.3+f*.7,.8+f*.2,1-f*.6);
    if(m.cargaLaser>=2){m.cargaLaser=0;danarJugador(m.def.anciano?8:6,'magia2',null);emitirParticulas(b.x,b.y,b.z,0x80f0ff,8,1.5,.4,0);}
  }else{
    quitarLaser(m); m.cargaLaser=0;
    m.t-=dt;if(m.t<=0){m.t=2+Math.random()*3;const a=Math.random()*6.28;m.dirNado=new THREE.Vector3(Math.cos(a),(Math.random()-.5)*.6,Math.sin(a));}
    if(m.dirNado){m.vel.lerp(m.dirNado.clone().multiplyScalar(m.def.vel),dt*2);m.yawObj=Math.atan2(m.dirNado.x,m.dirNado.z);}
    if(m.origen&&m.pos.distanceTo(m.origen)>18){const v=m.origen.clone().sub(m.pos).normalize();m.vel.lerp(v.multiplyScalar(m.def.vel),dt*2);}
  }
  if(m.extra.pupila){const t=m.def.anciano?1.9:.85;m.extra.pupila.position.x=clamp(Math.sin(tiempoJuego)*.05,-.1,.1)*t;}
  return true;
};
function quitarLaser(m){if(m.laser){escena.remove(m.laser);m.laser.geometry.dispose();m.laser=null;}}
const _quitarMobBase=quitarMob;
quitarMob=function(m){quitarLaser(m);_quitarMobBase(m);};
const _alMorirBase=alMorirMob;
alMorirMob=function(m){
  quitarLaser(m);
  if(m.tipo==='guardianAnciano'&&m.monumento){const e=mundoEstado.ancianos||(mundoEstado.ancianos={});e[m.monumento]=(e[m.monumento]||0)+1;}
  _alMorirBase(m);
};

/* =========================================================
   Shulkers y élitros de los barcos del End
   ========================================================= */
Object.assign(DEF_MOB,{shulker:{vida:30,ancho:.5,alto:1,vel:0,tipo:'hostil',ia:'shulker',xp:[5,5],sonido:'shulker',
  suelta:b=>[[549,prob(.5+b*.06)?1:0]]}});
NOMBRE_MOB.shulker='Shulker';
MODELOS_EXTRA.shulker=({g,pon,parte,extra})=>{
  pon(parte(1,.5,1,0x8a5a8a),0,.25,0);
  extra.tapa=new THREE.Group(); extra.tapa.position.y=.5; g.add(extra.tapa);
  const t=parte(1.02,.52,1.02,0x9a6a9a); t.position.y=.24; extra.tapa.add(t);
  extra.cabeza=pon(parte(.5,.5,.5,0xe0d080),0,.55,0);
  pon(parte(.1,.1,.02,0x202020),-.1,.6,.26); pon(parte(.1,.1,.02,0x202020),.1,.6,.26);
};
IA_EXTRA.shulker=(m,dt,c)=>{
  m.vel.set(0,0,0); m.mover=false;
  const activo=c.dist3<16&&objetivoValido()&&hayLineaVision(c.eye,c.ojoJ);
  m.apertura=clamp((m.apertura||0)+(activo?dt*2:-dt*2),0,1);
  if(m.extra.tapa)m.extra.tapa.position.y=.5+m.apertura*.35;
  m.yawObj=Math.atan2(c.dx,c.dz);
  if(activo&&m.cd<=0&&m.apertura>.8){m.cd=2+Math.random()*3;
    const s=new THREE.Sprite(matBolaDragon);s.material=s.material.clone();s.material.color.setHex(0xfff0ff);s.scale.set(.3,.3,.3);
    agregarEnt({tipo:'balaShulker',pos:new THREE.Vector3(m.pos.x,m.pos.y+.9,m.pos.z),vel:new THREE.Vector3(0,3,0),edad:0,malla:s,dueno:'mob',duenoMob:m,propio:true});
    sonar('shulker',m.pos);}
  return false;
};
ACT_ENT.balaShulker=(e,dt)=>{
  e.edad+=dt;
  const obj=new THREE.Vector3(jugador.pos.x,jugador.pos.y+1,jugador.pos.z), dir=obj.sub(e.pos).normalize();
  e.vel.lerp(dir.multiplyScalar(6),dt*2.5);
  const ch=trazarProyectil(e,dt,.2); e.malla.position.copy(e.pos);
  if(Math.random()<dt*20)emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0xf0e0ff,1,.2,.4,0);
  if(!ch&&e.edad<10)return;
  e.muerta=true;
  if(ch&&ch.jugador){danarJugador(4,'mob',null);efectoJugador('levitacion',10);}
  emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0xffffff,8,1.5,.4,0);
};
// Aparición de shulkers en las ciudades y exhibidor de élitros
function actualizarEnd(dt){
  if(dim!==DIMS.end)return;
  const j=jugador.pos;
  for(const c of ciudadesCerca(Math.floor(j.x/CX),Math.floor(j.z/CZ))){
    if(Math.hypot(c.x-j.x,c.z-j.z)>70)continue;
    const D=datosCiudadEnd(c), k='c'+c.x+','+c.z;
    // Shulkers sobre los muros
    if(contar(m=>m.tipo==='shulker'&&m.ciudad===k)<5&&Math.random()<dt*.5){
      const pos=[[c.x-5,D.t+7,c.z-5],[c.x+5,D.t+7,c.z+5],[c.x-5,c.y+5,c.z+5],[c.x+5,c.y+5,c.z-5],[c.x+3+12,D.t-2,c.z],[c.x,D.t+1,c.z-3]];
      const p=pos[Math.floor(Math.random()*pos.length)];
      if(!getBloque(p[0],p[1],p[2])&&SOLIDO[getBloque(p[0],p[1]-1,p[2])]){const m=crearMob('shulker',p[0]+.5,p[1],p[2]+.5);m.ciudad=k;}
    }
    // Élitros expuestos en la proa del barco
    if(D.barco){
      const tomados=mundoEstado.elitrosTomados||(mundoEstado.elitrosTomados={});
      const ex=entidades.find(e=>e.tipo==='exhibidor'&&e.clave===k);
      if(!tomados[k]&&!ex){
        const g=new THREE.Group();const m=new THREE.Mesh(geoExtruida(I.elitros,.9),matExtruido());g.add(m);
        const marco=new THREE.Mesh(new THREE.BoxGeometry(1,1,.06),new THREE.MeshLambertMaterial({color:0x8a5a34}));marco.position.z=-.06;g.add(marco);
        agregarEnt({tipo:'exhibidor',clave:k,pos:new THREE.Vector3(D.bx-10+12+.5,D.by-1.7,D.bz+2-.05),edad:0,malla:g});
      }
    }
  }
}
ACT_ENT.exhibidor=(e,dt)=>{
  e.edad+=dt; e.malla.position.copy(e.pos); e.malla.children[0].rotation.y=Math.sin(e.edad*.8)*.4;
  e.malla.rotation.y=Math.PI;
  const d=Math.hypot(jugador.pos.x-e.pos.x,jugador.pos.y+1-e.pos.y,jugador.pos.z-e.pos.z);
  if(d<2.2&&estado!=='muerto'){
    const r=insertarInv(crearPila(I.elitros));
    if(!r){(mundoEstado.elitrosTomados||(mundoEstado.elitrosTomados={}))[e.clave]=true;e.muerta=true;sonar('nivel');mostrarMensaje('¡Has conseguido los élitros! Póntelos en el pecho y pulsa Espacio en el aire.');guardarPartida();}
  }
};

/* =========================================================
   Aparición: brujas, guardianes y guardianes ancianos
   ========================================================= */
function aparicionFinal(x,z){
  const j=jugador.pos;
  if(Math.random()<.15){
    for(const cb of cabanasCerca(j.x,j.z)){
      if(Math.hypot(cb.x-j.x,cb.z-j.z)>48)continue;
      if(contar(m=>m.tipo==='bruja'&&Math.hypot(m.pos.x-cb.x,m.pos.z-cb.z)<20)>=1)continue;
      const y=buscarSuelo(Math.floor(cb.x),cb.y+2,Math.floor(cb.z),4,2);
      if(y>0){const m=crearMob('bruja',cb.x,y,cb.z);m.origen.set(cb.x,y,cb.z);return true;}
    }
  }
  for(const M of monumentosCerca(j.x-60,j.z-60,j.x+60,j.z+60)){
    const d=Math.hypot(M.x-j.x,M.z-j.z); if(d>70)continue;
    const muertos=(mundoEstado.ancianos||{})[M.clave]||0;
    if(contar(m=>m.tipo==='guardianAnciano'&&m.monumento===M.clave)<3-muertos&&Math.random()<.3){
      const p=[[0,M.H-3,0],[-15,4,0],[15,4,0]][contar(m=>m.tipo==='guardianAnciano'&&m.monumento===M.clave)%3];
      const m=crearMob('guardianAnciano',M.x+p[0]+.5,M.F+p[1],M.z+p[2]+.5);m.monumento=M.clave;m.origen.copy(m.pos);return true;}
    if(contar(m=>m.tipo==='guardian')<7&&Math.random()<.5){
      const gx=M.x+azar(-18,18),gz=M.z+azar(-18,18),gy=M.F+azar(1,10);
      if(esAgua(getBloque(gx,gy,gz))){const m=crearMob('guardian',gx+.5,gy,gz+.5);m.origen.set(M.x,M.F+6,M.z);return true;}
    }
  }
  // Brujas por la noche en los pantanos
  if(sol<-.05&&Math.random()<.04){const bio=infoColumna(x,z).bioma;
    if(bio===BIOMA.pantano||bio===BIOMA.manglar){const y=buscarSuelo(x,Math.floor(j.y)+10,z,30,2);if(y>0&&Math.hypot(x-j.x,z-j.z)>20){crearMob('bruja',x+.5,y,z+.5);return true;}}}
  return false;
}

/* =========================================================
   Cofres y puertas animados
   ========================================================= */
const texCache={};
function texTile(nombre){if(texCache[nombre])return texCache[nombre];const t=new THREE.CanvasTexture(lienzoTile(T[nombre]));t.magFilter=t.minFilter=THREE.NearestFilter;return texCache[nombre]=t;}
let tapa=null;
function abrirTapaCofre(x,y,z){
  cerrarTapaCofre(true);
  if(getBloque(x,y,z)!==B.cofre)return;
  setBloque(x,y,z,B.cofreAbierto,{sinAviso:true});
  const g=new THREE.Group();
  // Bisagra en el lado opuesto al jugador
  const dx=jugador.pos.x-(x+.5), dz=jugador.pos.z-(z+.5);
  const ang=Math.abs(dx)>Math.abs(dz)?(dx>0?Math.PI/2:-Math.PI/2):(dz>0?0:Math.PI);
  g.position.set(x+.5,y+.625,z+.5); g.rotation.y=ang;
  const piv=new THREE.Group(); piv.position.z=-.4375; g.add(piv);
  const mats=[texTile('chestSide'),texTile('chestSide'),texTile('chestTop'),texTile('chestTop'),texTile('chestSide'),texTile('chestSide')].map(t=>new THREE.MeshLambertMaterial({map:t}));
  const l=new THREE.Mesh(new THREE.BoxGeometry(.875,.25,.875),mats); l.position.set(0,.125,.4375); piv.add(l);
  const cerrojo=new THREE.Mesh(new THREE.BoxGeometry(.14,.2,.06),new THREE.MeshLambertMaterial({color:0xb0b0b8})); cerrojo.position.set(0,.02,.89); piv.add(cerrojo);
  escena.add(g);
  const br=Math.max(.25,brilloEn(x+.5,y+1,z+.5)); g.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(m=>m.color.setScalar(br));});
  tapa={g,piv,x,y,z,t:0,abierta:true};
  sonar('cofreAbrir',{x,y,z});
}
function cerrarTapaCofre(inmediato){
  if(!tapa)return;
  if(inmediato){escena.remove(tapa.g);if(getBloque(tapa.x,tapa.y,tapa.z)===B.cofreAbierto)setBloque(tapa.x,tapa.y,tapa.z,B.cofre,{sinAviso:true});tapa=null;return;}
  tapa.abierta=false;
}
const puertasAnim=[];
function animarPuerta(x,yb,z,idViejo,idNuevo){
  const pv=BLOQUES[idViejo].puerta, pn=BLOQUES[idNuevo].puerta;
  const cajaV=BLOQUES[idViejo].cajas[0], cajaN=BLOQUES[idNuevo].cajas[0];
  // La bisagra es la columna que comparten la puerta cerrada y la abierta
  const hx=(Math.max(cajaV[0],cajaN[0])+Math.min(cajaV[3],cajaN[3]))/2, hz=(Math.max(cajaV[2],cajaN[2])+Math.min(cajaV[5],cajaN[5]))/2;
  const g=new THREE.Group(); g.position.set(x+hx,yb,z+hz);
  const w=cajaV[3]-cajaV[0], d=cajaV[5]-cajaV[2];
  const cx=(cajaV[0]+cajaV[3])/2-hx, cz=(cajaV[2]+cajaV[5])/2-hz;
  for(const [tile,yy] of [['doorBottom',.5],['doorTop',1.5]]){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,1,d),new THREE.MeshLambertMaterial({map:texTile(tile),transparent:true,alphaTest:.5}));
    m.position.set(cx,yy,cz); g.add(m);
  }
  const nx=(cajaN[0]+cajaN[3])/2-hx, nz=(cajaN[2]+cajaN[5])/2-hz;
  const a0=Math.atan2(cx,cz), a1=Math.atan2(nx,nz); let delta=a1-a0; while(delta>Math.PI)delta-=Math.PI*2; while(delta<-Math.PI)delta+=Math.PI*2;
  const br=Math.max(.25,brilloEn(x+.5,yb+1,z+.5)); g.traverse(o=>{if(o.isMesh)o.material.color.setScalar(br);});
  escena.add(g);
  setBloque(x,yb,z,B.puertaAnim,{sinAviso:true}); setBloque(x,yb+1,z,B.puertaAnim,{sinAviso:true});
  puertasAnim.push({g,x,yb,z,idNuevo,t:0,delta});
}
alternarPuerta=function(x,y,z){
  const b=getBloque(x,y,z), pu=BLOQUES[b].puerta; if(!pu)return;
  const yb=pu.m?y-1:y, viejo=getBloque(x,yb,z);
  if(!BLOQUES[viejo].puerta)return;
  const base=149+pu.f*4+(1-pu.ab)*2;
  animarPuerta(x,yb,z,viejo,base);
  sonar('puerta',{x,y,z});
};
function actualizarAnimaciones(dt){
  if(tapa){
    tapa.t=clamp(tapa.t+(tapa.abierta?dt:-dt)*5,0,1);
    const e=tapa.t<.5?2*tapa.t*tapa.t:1-Math.pow(-2*tapa.t+2,2)/2;
    tapa.piv.rotation.x=-e*1.25;
    if(!tapa.abierta&&tapa.t<=0){sonar('cofreCerrar',{x:tapa.x,y:tapa.y,z:tapa.z});cerrarTapaCofre(true);}
  }
  for(let i=puertasAnim.length-1;i>=0;i--){
    const a=puertasAnim[i]; a.t+=dt*5;
    const e=Math.min(1,a.t), s=1-Math.pow(1-e,3);
    a.g.rotation.y=a.delta*s;
    if(a.t>=1){escena.remove(a.g);
      if(getBloque(a.x,a.yb,a.z)===B.puertaAnim){setBloque(a.x,a.yb,a.z,a.idNuevo,{sinAviso:true});setBloque(a.x,a.yb+1,a.z,a.idNuevo+1,{sinAviso:true});}
      puertasAnim.splice(i,1);}
  }
}
const _abrirUIBase=abrirUI;
abrirUI=function(tipo,pos,extra){
  if(pos&&getBloque(pos.x,pos.y,pos.z)===B.cofreAbierto&&!tapa)setBloque(pos.x,pos.y,pos.z,B.cofre,{sinAviso:true});
  _abrirUIBase(tipo,pos,extra);
  if(tipo==='cofre'&&pos&&ui&&getBloque(pos.x,pos.y,pos.z)===B.cofre)abrirTapaCofre(pos.x,pos.y,pos.z);
};
const _cerrarUIBase=cerrarUI;
cerrarUI=function(){_cerrarUIBase();cerrarTapaCofre(false);};

/* =========================================================
   Esponjas
   ========================================================= */
function absorberAgua(x,y,z){
  let n=0; const cola=[[x,y,z,0]], vistos=new Set([clavePos(x,y,z)]);
  while(cola.length&&n<65){
    const [cx,cy,cz,d]=cola.shift();
    for(const [dx,dy,dz] of DIR6){const nx=cx+dx,ny=cy+dy,nz=cz+dz,k=clavePos(nx,ny,nz);if(vistos.has(k))continue;vistos.add(k);
      if(esAgua(getBloque(nx,ny,nz))&&d<6){setBloque(nx,ny,nz,0,{sinAviso:true});n++;cola.push([nx,ny,nz,d+1]);}}
  }
  if(n){setBloque(x,y,z,B.esponjaMojada);emitirParticulas(x+.5,y+.5,z+.5,0x6090e0,14,2,.6,4);sonar('agua',{x,y,z});}
}

/* =========================================================
   Maza en 3D
   ========================================================= */
function modeloMaza(){
  const g=new THREE.Group();
  const m=(w,h,d,c,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:c}));b.position.set(x,y,z);g.add(b);return b;};
  m(.05,.42,.05,0x7ab0d8,0,-.12,0); for(let k=0;k<4;k++)m(.062,.03,.062,0x4a7aa0,0,-.26+k*.1,0);
  m(.07,.04,.07,0x3a3a44,0,-.34,0);
  m(.2,.18,.2,0x5a5c66,0,.17,0); m(.22,.06,.22,0x8a8e9a,0,.24,0); m(.16,.03,.16,0x3a3c44,0,.08,0);
  for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=m(.05,.05,.1,0xc0c4cc,x*.12,.17,z*.12);if(x)p.rotation.y=Math.PI/2;}
  for(const [x,z] of [[1,1],[-1,1],[1,-1],[-1,-1]])m(.04,.08,.04,0xb0b4bc,x*.08,.3,z*.08);
  m(.04,.04,.04,0x9fe0ff,0,.28,.105);
  return g;
}

/* =========================================================
   Vista en tercera persona (F5) con el modelo del jugador
   ========================================================= */
let vistaTercera=0;
const modeloJugador=(()=>{
  const g=new THREE.Group(), p={};
  const caja=(w,h,d,c,x,y,z,pivArriba)=>{const geo=new THREE.BoxGeometry(w,h,d);if(pivArriba)geo.translate(0,-h/2,0);
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:c,map:TEX_MOB.piel}));m.position.set(x,y,z);return m;};
  p.cuerpo=new THREE.Group(); p.cuerpo.position.y=.75; g.add(p.cuerpo);
  p.torso=caja(.5,.75,.26,0x2aa0b0,0,.375,0); p.cuerpo.add(p.torso);
  p.cabeza=new THREE.Group(); p.cabeza.position.y=.75; p.cuerpo.add(p.cabeza);
  p.cabeza.add(caja(.5,.5,.5,0xc8966e,0,.25,0)); p.cabeza.add(caja(.52,.14,.52,0x3a2a1a,0,.44,0));
  for(const s of [-1,1]){const o=caja(.1,.06,.02,0xffffff,s*.12,.24,.26);p.cabeza.add(o);const q=caja(.05,.06,.02,0x3a4ac0,s*.14,.24,.27);p.cabeza.add(q);}
  p.brazoI=caja(.25,.75,.25,0xc8966e,-.375,.75,0,true); p.brazoD=caja(.25,.75,.25,0xc8966e,.375,.75,0,true);
  p.brazoI.add(caja(.26,.3,.26,0x2aa0b0,0,-.14,0)); p.brazoD.add(caja(.26,.3,.26,0x2aa0b0,0,-.14,0));
  p.cuerpo.add(p.brazoI,p.brazoD);
  p.piernaI=caja(.25,.75,.25,0x3a3aa0,-.125,.75,0,true); p.piernaD=caja(.25,.75,.25,0x3a3aa0,.125,.75,0,true);
  g.add(p.piernaI,p.piernaD);
  // Élitros
  p.alas=new THREE.Group(); p.alas.position.set(0,.72,-.16); p.cuerpo.add(p.alas);
  p.alaI=new THREE.Group(); p.alaD=new THREE.Group(); p.alas.add(p.alaI,p.alaD);
  const matAla=new THREE.MeshLambertMaterial({color:0x9aa0b8,map:TEX_MOB.pelo});
  const ala=(s)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.5,1.1,.08),matAla);m.position.set(s*.25,-.5,0);return m;};
  p.alaI.add(ala(-1)); p.alaD.add(ala(1));
  // Objeto en la mano
  p.mano=new THREE.Group(); p.mano.position.set(0,-.7,.08); p.brazoD.add(p.mano);
  g.rotation.order='YXZ'; g.visible=false; escena.add(g);
  return {g,p,objId:-1};
})();
function actualizarModeloJugador(dt){
  const M=modeloJugador, p=M.p, j=jugador;
  M.g.visible=vistaTercera>0&&estado!=='menu';
  if(!M.g.visible)return;
  M.g.position.set(j.pos.x,j.pos.y+(j.montura?.1:0),j.pos.z);
  M.g.rotation.y=j.yaw+Math.PI;
  const sp=Math.hypot(j.vel.x,j.vel.z), fase=(typeof faseCamara!=='undefined'?faseCamara:tiempoJuego*6);
  const a=Math.sin(fase)*Math.min(1,sp/4)*.8;
  const planea=!!j.planeando, montado=!!j.montura;
  p.piernaI.rotation.x=montado?-1.3:planea?0:a; p.piernaD.rotation.x=montado?-1.3:planea?0:-a;
  const golpe=Math.sin(Math.min(1,balanceo)*Math.PI);
  p.brazoI.rotation.x=planea?0:-a*.8; p.brazoD.rotation.x=planea?0:a*.8-golpe*1.6;
  p.brazoI.rotation.z=planea?-.25:0; p.brazoD.rotation.z=planea?.25:0;
  p.cuerpo.rotation.x=j.agachado?.4:0; p.cuerpo.position.y=j.agachado?.62:.75;
  M.g.rotation.x=planea?Math.PI/2-.2+j.pitch*.5:0;
  if(planea)M.g.position.y+=.9;
  p.cabeza.rotation.x=planea?-1:-j.pitch*.8;
  // Élitros: plegados al caminar, abiertos al planear
  const el=inv[37]&&ITEMS[inv[37].id].elitros;
  p.alas.visible=!!el;
  const abre=planea?1:j.suelo?0:.3;
  p.alaI.rotation.z=-(.15+abre*1.05); p.alaD.rotation.z=.15+abre*1.05;
  p.alaI.rotation.x=p.alaD.rotation.x=.25+abre*.1;
  // Objeto en la mano
  const id=enManoId();
  if(id!==M.objId){M.objId=id;p.mano.clear();
    if(id>0){let o;if(id===540)o=modeloMaza();else if(esCuboItem(id))o=new THREE.Mesh(geoCuboItem(id,.3),new THREE.MeshBasicMaterial({map:texIconos,alphaTest:.5}));
      else if(LIENZOS[id]&&LIENZOS[id].width===16)o=new THREE.Mesh(geoExtruida(id,.55),matExtruido());
      if(o){o.rotation.set(-Math.PI/2,0,Math.PI/4);if(id===540){o.rotation.set(.3,0,0);o.scale.setScalar(1.3);}p.mano.add(o);}}}
  const br=Math.max(.2,brilloEn(j.pos.x,j.pos.y+1.2,j.pos.z));
  if(M.brillo!==br){M.brillo=br;M.g.traverse(o=>{if(o.isMesh&&o.material.isMeshLambertMaterial){if(!o.userData.c0)o.userData.c0=o.material.color.clone();o.material.color.copy(o.userData.c0).multiplyScalar(br);}});}
}
function aplicarCamaraTercera(){
  if(!vistaTercera||estado==='menu')return;
  const j=jugador, dir=new THREE.Vector3(); camara.getWorldDirection(dir);
  const ojo=new THREE.Vector3(j.pos.x,j.pos.y+(j.agachado?1.32:1.62),j.pos.z);
  const atras=vistaTercera===1?dir.clone().negate():dir.clone();
  const r=lanzarRayo(ojo,atras,4.2);
  camara.updateMatrixWorld();
  const dist=r?Math.max(.4,r.t-.3):4;
  camara.position.copy(ojo).addScaledVector(atras,dist);
  if(vistaTercera===2){camara.lookAt(ojo);}
}
document.addEventListener('keydown',e=>{if(e.code==='F5'&&estado==='jugando'){e.preventDefault();vistaTercera=(vistaTercera+1)%3;
  mostrarMensaje(['Vista en primera persona','Vista en tercera persona (detrás)','Vista en tercera persona (delante)'][vistaTercera]);}});

/* ---------- Bucle ---------- */
function actualizarFinal(dt){
  actualizarAnimaciones(dt);
  actualizarEnd(dt);
}
