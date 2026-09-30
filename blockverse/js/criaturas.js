"use strict";
/* =========================================================
   Criaturas: lobos (se doman con huesos, se sientan, te
   defienden), gatos (se doman con pescado y asustan a los
   creepers), zorros, conejos, calamares, murciélagos, cabras
   (embisten y pierden los cuernos) y osos polares. Mejor IA:
   las criaturas evitan precipicios, lava y cactus y buscan
   otro camino si se atascan; zombis bebé y zombis/esqueletos
   con armadura. Las mascotas se guardan con el mundo.
   También: inventario en creativo y repartir objetos
   arrastrando el ratón por las ranuras (clic izquierdo reparte
   a partes iguales, clic derecho pone uno en cada una).
   ========================================================= */
Object.assign(SND,{
  lobo:v=>{tonoSnd(520,380,.09,'sawtooth',.06*v);tonoSnd(500,360,.09,'sawtooth',.06*v,.16);},
  loboGrune:v=>tonoSnd(140,110,.5,'sawtooth',.06*v),
  gato:v=>{tonoSnd(700,1000,.12,'triangle',.05*v);tonoSnd(1000,600,.25,'triangle',.05*v,.12);},
  ronroneo:v=>tonoSnd(70,60,.6,'sawtooth',.03*v),
  zorro:v=>{tonoSnd(900,1300,.08,'square',.03*v);tonoSnd(1200,700,.12,'square',.03*v,.09);},
  conejo:v=>tonoSnd(1500,1900,.05,'sine',.03*v),
  cabra:v=>{tonoSnd(420,380,.35,'sawtooth',.05*v);tonoSnd(430,360,.2,'square',.02*v,.05);},
  embestida:v=>{ruidoSnd(.2,500,.35*v);tonoSnd(120,60,.2,'square',.08*v);},
  oso:v=>{tonoSnd(110,80,.6,'sawtooth',.08*v);ruidoSnd(.4,300,.1*v);},
  murcielago:v=>{tonoSnd(2600,3200,.04,'square',.02*v);tonoSnd(2800,2400,.04,'square',.02*v,.07);},
  domar:v=>{[660,880,1100].forEach((f,i)=>tonoSnd(f,f*1.05,.12,'sine',.06*v,i*.09));},
});

/* ---------- Definiciones ---------- */
const COL_LOBO={palido:0xd7d3d3,bosque:0x8a6a4a,ceniza:0x9a9aa0,manchado:0xc8a070,nevado:0xf2f2f2,negro:0x3a3634};
const COL_GATO=[0xc89a60,0x2a2a2e,0xeeeeee,0xe8dcc8,0xe08a3a,0x8a8a8a,0x6a4a30];
const COL_CONEJO={marron:0x8a6a4a,blanco:0xeeeeee,negro:0x2e2a28,dorado:0xe0c080,sal:0xc8b8a0,manchado:0xdcdcdc};
Object.assign(DEF_MOB,{
  lobo:{vida:8,ancho:.3,alto:.85,vel:3,tipo:'neutral',ia:'lobo',dano:4,xp:[1,3],sonido:'lobo',suelta:()=>[]},
  gato:{vida:10,ancho:.3,alto:.7,vel:3.2,tipo:'pasivo',ia:'gato',xp:[1,3],sonido:'gato',suelta:b=>[[I.cuerda,azar(0,2)]]},
  zorro:{vida:10,ancho:.3,alto:.7,vel:3.4,tipo:'pasivo',ia:'zorro',dano:2,xp:[1,3],sonido:'zorro',suelta:()=>[]},
  conejo:{vida:3,ancho:.2,alto:.5,vel:2.6,tipo:'pasivo',ia:'conejo',xp:[1,3],sonido:'conejo',
    suelta:b=>[[620,azar(0,1)],[623,azar(0,1)],[622,prob(.1+.03*b)?1:0]]},
  calamar:{vida:10,ancho:.4,alto:.8,vel:2,tipo:'pasivo',ia:'calamar',vuela:true,xp:[1,3],suelta:b=>[[624,azar(1,3+b)]]},
  murcielago:{vida:6,ancho:.25,alto:.9,vel:3,tipo:'pasivo',ia:'murcielago',vuela:true,xp:[0,0],sonido:'murcielago',suelta:()=>[]},
  cabra:{vida:10,ancho:.45,alto:1.3,vel:2.2,tipo:'pasivo',ia:'cabra',xp:[1,3],sonido:'cabra',suelta:()=>[]},
  osoPolar:{vida:30,ancho:.7,alto:1.4,vel:2.5,tipo:'neutral',dano:6,xp:[1,3],sonido:'oso',
    suelta:b=>[[614,prob(.75)?azar(0,2+b):0],[616,prob(.25)?azar(0,2+b):0]]},
});
Object.assign(NOMBRE_MOB,{lobo:'Lobo',gato:'Gato',zorro:'Zorro',conejo:'Conejo',calamar:'Calamar',murcielago:'Murciélago',cabra:'Cabra',osoPolar:'Oso polar'});

/* ---------- Modelos ---------- */
Object.assign(MODELOS_EXTRA,{
  lobo({pon,parte,cuadrupedo,ojos,extra,opc}){
    const c=COL_LOBO[opc.variante]||COL_LOBO.palido, o=new THREE.Color(c).multiplyScalar(.8).getHex();
    cuadrupedo(.12,.26,.42,c,.14);
    pon(parte(.34,.32,.62,c,false,'pelo'),0,.56,-.06);
    pon(parte(.46,.42,.34,o,false,'pelo'),0,.62,.2);
    extra.cabeza=pon(parte(.36,.34,.3,c,false,'pelo'),0,.74,.48);
    pon(parte(.18,.14,.16,0xc8b8a8),0,.66,.68); pon(parte(.07,.05,.03,0x1a1a1a),0,.71,.76);
    pon(parte(.1,.12,.06,o),-.12,.95,.44); pon(parte(.1,.12,.06,o),.12,.95,.44);
    ojos(.79,.635,.08,0x111111,.06);
    const cola=pon(parte(.1,.1,.44,c,false,'pelo'),0,.6,-.46); cola.rotation.x=.7; extra.cola=cola;
    extra.collar=pon(parte(.48,.1,.36,0xc02020,false,null),0,.5,.22); extra.collar.visible=false;
  },
  gato({pon,parte,cuadrupedo,ojos,extra,opc}){
    const c=COL_GATO[opc.variante|0];
    cuadrupedo(.08,.2,.3,c,.1);
    pon(parte(.24,.24,.62,c,false,'pelo'),0,.4,0);
    extra.cabeza=pon(parte(.3,.26,.26,c,false,'pelo'),0,.52,.4);
    pon(parte(.14,.08,.06,new THREE.Color(c).multiplyScalar(1.15).getHex()),0,.46,.54);
    pon(parte(.08,.08,.06,c),-.1,.69,.38); pon(parte(.08,.08,.06,c),.1,.69,.38);
    ojos(.55,.533,.07,0x3aa040,.05);
    const cola=pon(parte(.06,.06,.5,c,false,null),0,.5,-.52); cola.rotation.x=-.6; extra.cola=cola;
    extra.collar=pon(parte(.3,.06,.26,0xc02020,false,null),0,.42,.3); extra.collar.visible=false;
  },
  zorro({pon,parte,cuadrupedo,ojos,extra,opc}){
    const nieve=opc.variante==='nieve', c=nieve?0xf2f2f2:0xe0782a, b=nieve?0xd8d8d8:0xf4f0ea;
    cuadrupedo(.1,.2,.26,nieve?0xe0e0e0:0x2a2420,.1);
    pon(parte(.3,.28,.6,c,false,'pelo'),0,.42,0);
    extra.cabeza=pon(parte(.38,.3,.28,c,false,'pelo'),0,.54,.4);
    pon(parte(.16,.12,.18,b),0,.48,.6); pon(parte(.06,.05,.03,0x1a1a1a),0,.52,.7);
    pon(parte(.1,.12,.05,c),-.12,.74,.38); pon(parte(.1,.12,.05,c),.12,.74,.38);
    extra.ojosZ=[pon(parte(.07,.04,.02,0x111111,false,null),-.1,.57,.545),pon(parte(.07,.04,.02,0x111111,false,null),.1,.57,.545)];
    const cola=pon(parte(.2,.2,.5,c,false,'pelo'),0,.42,-.52); cola.rotation.x=-.3; extra.cola=cola;
    pon(parte(.12,.12,.1,0xfafafa),0,.34,-.78);
  },
  conejo({pon,parte,piernas,extra,opc}){
    const c=COL_CONEJO[opc.variante]||COL_CONEJO.marron;
    [-1,1].forEach(s=>{const p=pon(parte(.08,.12,.22,c,true),s*.1,.12,-.08);p.userData.s=s;piernas.push(p);});
    pon(parte(.26,.24,.36,c,false,'pelo'),0,.2,0);
    extra.cabeza=pon(parte(.22,.22,.22,c,false,'pelo'),0,.36,.2);
    pon(parte(.06,.24,.04,c),-.06,.58,.18); pon(parte(.06,.24,.04,c),.06,.58,.18);
    pon(parte(.04,.04,.02,0x111111,false,null),-.07,.39,.312); pon(parte(.04,.04,.02,0x111111,false,null),.07,.39,.312);
    pon(parte(.08,.08,.06,0xf4f4f4),0,.24,-.2);
  },
  calamar({g,pon,parte,extra}){
    pon(parte(.5,.62,.5,0x2c4560),0,.55,0);
    pon(parte(.06,.1,.02,0xe8e8e8,false,null),-.13,.62,.26); pon(parte(.06,.1,.02,0xe8e8e8,false,null),.13,.62,.26);
    extra.tentaculos=[];
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2,t=pon(parte(.07,.5,.07,0x355270,true),Math.cos(a)*.2,.26,Math.sin(a)*.2);t.userData.a=a;extra.tentaculos.push(t);}
  },
  murcielago({pon,parte,extra}){
    pon(parte(.2,.3,.16,0x4c3e30),0,.5,0); extra.cabeza=pon(parte(.2,.18,.18,0x4c3e30),0,.72,0);
    pon(parte(.05,.08,.02,0x3a2e24),-.07,.84,0); pon(parte(.05,.08,.02,0x3a2e24),.07,.84,0);
    extra.alas=[-1,1].map(s=>{const w=new THREE.Group();w.position.set(s*.1,.58,0);const m=parte(.4,.3,.02,0x2a2018);m.position.x=s*.2;w.add(m);w.userData.s=s;pon(w,s*.1,.58,0);return w;});
  },
  cabra({pon,parte,cuadrupedo,ojos,extra,opc}){
    cuadrupedo(.14,.26,.5,0xd8d0c0,.16);
    pon(parte(.5,.5,.86,0xece6da,false,'pelo'),0,.8,0);
    extra.cabeza=pon(parte(.3,.34,.46,0xece6da,false,'pelo'),0,1.12,.52);
    pon(parte(.12,.2,.08,0xd8d0c0),0,.92,.72);
    extra.cuernos=[-1,1].map(s=>{const h=pon(parte(.07,.34,.07,0x9a9080,false,null),s*.1,1.4,.46);h.rotation.x=-.4;return h;});
    ojos(1.16,.755,.1,0x2a2010,.06);
  },
  osoPolar({pon,parte,cuadrupedo,ojos,extra}){
    cuadrupedo(.26,.46,.55,0xecece6,.3);
    pon(parte(.9,.8,1.5,0xf4f4f0,false,'pelo'),0,1.0,0);
    extra.cabeza=pon(parte(.56,.5,.5,0xf4f4f0,false,'pelo'),0,1.2,.94);
    pon(parte(.3,.24,.2,0xe4e4de),0,1.08,1.25); pon(parte(.12,.08,.04,0x1a1a1a),0,1.14,1.36);
    pon(parte(.12,.12,.06,0xe0e0da),-.2,1.5,.9); pon(parte(.12,.12,.06,0xe0e0da),.2,1.5,.9);
    ojos(1.28,1.195,.14,0x111111,.07);
  },
});

/* ---------- Utilidades ---------- */
const distMob=(a,b)=>Math.hypot(a.pos.x-b.pos.x,a.pos.z-b.pos.z);
function masCercano(m,f,rango){let mejor=null,d=rango;for(const o of mobs){if(o===m||o.muerto||!f(o))continue;const e=o.pos.distanceTo(m.pos);if(e<d){d=e;mejor=o;}}return mejor;}
function vagar(m,dt,vel,prob=.5){m.t-=dt;if(m.t<=0){m.t=2+Math.random()*5;m.mover=Math.random()<prob;m.yawObj=Math.random()*Math.PI*2;}m.velObj=vel;}
function morder(m,o,dano){
  const dx=o.pos.x-m.pos.x,dz=o.pos.z-m.pos.z,l=Math.hypot(dx,dz)||1;
  m.cd=1; m.golpeT=.35; sonar('lobo',m.pos,.5);
  if(m.domado)o.ultimoGolpeJugador=tiempoJuego;
  herirMob(o,dano,{x:dx/l,z:dz/l},m.domado?'mascota':'lobo');
}
function perseguir(m,o,vel){const dx=o.pos.x-m.pos.x,dz=o.pos.z-m.pos.z;mover(m,dx,dz,vel);return Math.hypot(dx,dz);}
function tpJunto(m){
  const j=jugador.pos;
  for(let k=0;k<10;k++){const x=Math.floor(j.x)+azar(-2,2),z=Math.floor(j.z)+azar(-2,2);if(Math.abs(x-j.x)<1&&Math.abs(z-j.z)<1)continue;
    const y=buscarSuelo(x,Math.floor(j.y)+2,z,5,1);if(y>0&&!esLiquido(getBloque(x,y-1,z))){m.pos.set(x+.5,y,z+.5);m.vel.set(0,0,0);return true;}}
  return false;
}
// Mascotas: siguen al jugador, se sientan y se teletransportan si se quedan lejos
function seguirDueno(m,dt,vel){
  const j=jugador, d=Math.hypot(j.pos.x-m.pos.x,j.pos.z-m.pos.z)+Math.abs(j.pos.y-m.pos.y)*.5;
  if(d>14&&(j.suelo||j.enAgua)&&!j.vuela&&estado!=='muerto'){if(tpJunto(m))return;}
  if(d>4)mover(m,j.pos.x-m.pos.x,j.pos.z-m.pos.z,vel*(d>8?1.4:1));
  else vagar(m,dt,vel*.4,.2);
}
function domar(m,vida){
  m.domado=true; m.sentado=true; m.vidaMax=vida; m.vida=vida; m.enfadado=0;
  if(m.extra.collar)m.extra.collar.visible=true;
  sonar('domar',m.pos); emitirParticulas(m.pos.x,m.pos.y+m.alto,m.pos.z,0xff5070,10,1.2,1,-1);
}
const esCarne=id=>[I.cerdoCrudo,I.cerdoAsado,I.resCruda,I.filete,I.polloCrudo,I.polloAsado,I.corderoCrudo,I.corderoAsado,I.carnePodrida,620,621].includes(id);
const esPescado=id=>id===614||id===616;

/* ---------- IA ---------- */
function poseSentado(m,s){m.sentado=s;m.mover=false;}
IA_EXTRA.lobo=(m,dt,c)=>{
  if(m.domado){
    if(m.objetivo&&(m.objetivo.muerto||!mobs.includes(m.objetivo)||m.objetivo.domado||distMob(m,m.objetivo)>24))m.objetivo=null;
    if(!m.sentado&&!m.objetivo){const e=masCercano(m,o=>o.tipo==='esqueleto',10);if(e)m.objetivo=e;}
    if(m.sentado){m.mover=false;return true;}
    if(m.objetivo){const d=perseguir(m,m.objetivo,m.def.vel*1.3);if(d<m.ancho+m.objetivo.ancho+.7&&m.cd<=0)morder(m,m.objetivo,4);return true;}
    seguirDueno(m,dt,m.def.vel);
    return true;
  }
  if(m.enfadado>0&&c.persigue){
    mover(m,c.dx,c.dz,m.def.vel*1.3);
    if(c.dist<m.ancho+1&&Math.abs(c.dy)<1.5&&m.cd<=0){m.cd=1;m.golpeT=.35;danarJugador(m.def.dano,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});sonar('lobo',m.pos);}
    return true;
  }
  // Los lobos salvajes cazan ovejas, conejos y zorros
  if(!m.presa&&Math.random()<dt*.02)m.presa=masCercano(m,o=>o.tipo==='oveja'||o.tipo==='conejo'||o.tipo==='zorro',12);
  if(m.presa){if(m.presa.muerto||distMob(m,m.presa)>16)m.presa=null;
    else{const d=perseguir(m,m.presa,m.def.vel*1.2);if(d<m.ancho+m.presa.ancho+.6&&m.cd<=0)morder(m,m.presa,4);return true;}}
  vagar(m,dt,m.def.vel*.5);
  return true;
};
IA_EXTRA.gato=(m,dt,c)=>{
  if(m.domado){if(m.sentado){m.mover=false;return true;}seguirDueno(m,dt,m.def.vel);return true;}
  // Los gatos salvajes huyen del jugador salvo que lleve pescado y vaya agachado
  if(c.dist<7&&!(jugador.agachado&&esPescado(enManoId()))&&estado!=='muerto'){mover(m,-c.dx,-c.dz,m.def.vel*1.2);return true;}
  if(m.huir>0){m.huir-=dt;mover(m,-c.dx,-c.dz,m.def.vel*1.3);return true;}
  vagar(m,dt,m.def.vel*.4);
  return true;
};
IA_EXTRA.zorro=(m,dt,c)=>{
  const dia=sol>.1;
  // De día duermen, salvo que el jugador se acerque sin agacharse
  if(dia&&!(m.huir>0)&&!(c.dist<4&&!jugador.agachado)){if(!m.durmiendo){m.durmiendo=true;}m.mover=false;return true;}
  m.durmiendo=false;
  if(m.huir>0){m.huir-=dt;mover(m,-c.dx,-c.dz,m.def.vel*1.3);return true;}
  if(c.dist<8&&!jugador.agachado&&estado!=='muerto'){mover(m,-c.dx,-c.dz,m.def.vel*1.2);return true;}
  if(!m.presa&&Math.random()<dt*.05)m.presa=masCercano(m,o=>o.tipo==='gallina'||o.tipo==='conejo',12);
  if(m.presa){if(m.presa.muerto||distMob(m,m.presa)>16)m.presa=null;
    else{const d=perseguir(m,m.presa,m.def.vel);
      if(d<2.5&&d>1&&m.suelo&&m.cd<=0){m.vel.y=6;m.cd=.8;}   // salto sobre la presa
      if(d<m.ancho+m.presa.ancho+.5&&m.cd<=.5){m.cd=1;herirMob(m.presa,2,null,'zorro');}
      return true;}}
  vagar(m,dt,m.def.vel*.5);
  return true;
};
IA_EXTRA.conejo=(m,dt,c)=>{
  m.mover=false;
  const peligro=(c.dist<5&&estado!=='muerto'&&!jugador.agachado)||m.huir>0?{pos:jugador.pos}:masCercano(m,o=>o.tipo==='lobo'&&!o.domado||o.tipo==='zorro',8);
  if(m.huir>0)m.huir-=dt;
  if(m.suelo&&m.cd<=0){
    let a=null;
    if(peligro){a=Math.atan2(m.pos.x-peligro.pos.x,m.pos.z-peligro.pos.z)+(Math.random()-.5)*.8;m.cd=.25;}
    else if(Math.random()<.5){a=Math.random()*Math.PI*2;m.cd=.6+Math.random()*1.5;}else m.cd=.5+Math.random();
    if(a!==null){m.yawObj=a;m.vel.x=Math.sin(a)*(peligro?4.5:2.2);m.vel.z=Math.cos(a)*(peligro?4.5:2.2);m.vel.y=peligro?5.5:4.5;}
  }
  return true;
};
IA_EXTRA.calamar=(m,dt)=>{
  const agua=esAgua(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+.4),Math.floor(m.pos.z)));
  if(!agua){m.vel.y=Math.max(-30,m.vel.y-25*dt);m.vel.x*=.9;m.vel.z*=.9;m.ahogoT=(m.ahogoT||0)+dt;
    if(m.ahogoT>1){m.ahogoT=0;herirMob(m,1,null,'asfixia');}return true;}
  m.ahogoT=0;
  m.vel.multiplyScalar(Math.pow(.35,dt));
  if(m.cd<=0){m.cd=1.2+Math.random()*2.5;
    const a=Math.random()*Math.PI*2, v=new THREE.Vector3(Math.sin(a),(Math.random()-.45)*.8,Math.cos(a)).normalize();
    const p=m.pos.clone().addScaledVector(v,2);
    if(esAgua(getBloque(Math.floor(p.x),Math.floor(p.y+.4),Math.floor(p.z)))){m.vel.addScaledVector(v,m.huir>0?6:3);m.yawObj=a;m.impulso=.5;}}
  if(m.huir>0)m.huir-=dt;
  return true;
};
IA_EXTRA.murcielago=(m,dt)=>{
  m.t-=dt;
  if(m.t<=0||!m.destino){m.t=.8+Math.random()*1.5;
    for(let k=0;k<6;k++){const d=new THREE.Vector3(m.pos.x+(Math.random()-.5)*10,m.pos.y+(Math.random()-.45)*5,m.pos.z+(Math.random()-.5)*10);
      if(!getBloque(Math.floor(d.x),Math.floor(d.y),Math.floor(d.z))&&!getBloque(Math.floor(d.x),Math.floor(d.y+1),Math.floor(d.z))){m.destino=d;break;}}}
  if(m.destino){const v=m.destino.clone().sub(m.pos);if(v.length()>.3){v.normalize().multiplyScalar(m.def.vel);m.vel.lerp(v,Math.min(1,dt*3));m.yawObj=Math.atan2(v.x,v.z);}}
  return true;
};
IA_EXTRA.cabra=(m,dt,c)=>{
  if(m.cuernos===undefined)m.cuernos=2;
  m.embisteCD=(m.embisteCD===undefined?10+Math.random()*30:m.embisteCD)-dt;
  if(m.embiste){ // carrera
    const e=m.embiste; e.t-=dt;
    if(e.t>0&&e.prep>0){e.prep-=dt;m.mover=false;m.yawObj=Math.atan2(e.dx,e.dz);return true;}
    m.mover=true; m.yawObj=Math.atan2(e.dx,e.dz); m.velObj=8;
    if(estado!=='muerto'&&Math.hypot(jugador.pos.x-m.pos.x,jugador.pos.z-m.pos.z)<1.1+m.ancho&&Math.abs(jugador.pos.y-m.pos.y)<1.5){
      danarJugador(2,'mob',{x:e.dx,z:e.dz}); jugador.vel.x+=e.dx*14; jugador.vel.z+=e.dz*14; jugador.vel.y=6; sonar('embestida',m.pos); m.embiste=null; return true;}
    if(m.chocoH){
      const bx=Math.floor(m.pos.x+e.dx*.9),bz=Math.floor(m.pos.z+e.dz*.9),b=getBloque(bx,Math.floor(m.pos.y+.5),bz);
      const duro=esTronco(b)||b===B.piedra||b===B.roca||b===B.hieloCompacto||(BLOQUES[b]&&/mena/.test(BLOQUES[b].clave||''));
      sonar('embestida',m.pos,.8);
      if(duro&&m.cuernos>0){m.cuernos--;if(m.extra.cuernos&&m.extra.cuernos[m.cuernos])m.extra.cuernos[m.cuernos].visible=false;
        soltarItem(crearPila(625),m.pos.x,m.pos.y+1,m.pos.z,true);}
      m.embiste=null; return true;}
    if(e.t<=0)m.embiste=null;
    return true;
  }
  if(m.embisteCD<=0&&c.dist>3&&c.dist<12&&Math.abs(c.dy)<2&&estado!=='muerto'&&supervivencia()&&hayLineaVision(c.eye,c.ojoJ)){
    m.embisteCD=20+Math.random()*40; m.embiste={dx:c.dx/c.dist,dz:c.dz/c.dist,prep:.8,t:2.3}; sonar('cabra',m.pos); return true;}
  if(m.huir>0){m.huir-=dt;mover(m,-c.dx,-c.dz,m.def.vel*1.6);return true;}
  if(m.suelo&&Math.random()<dt*.15){m.vel.y=9;const a=Math.random()*Math.PI*2;m.vel.x=Math.sin(a)*2;m.vel.z=Math.cos(a)*2;}  // grandes saltos
  vagar(m,dt,m.def.vel*.5,.4);
  return true;
};
// Creepers: huyen de los gatos
IA_EXTRA.huyeGato=(m,dt)=>{const g=m.gatoHuir;if(g)mover(m,m.pos.x-g.pos.x,m.pos.z-g.pos.z,m.def.vel*1.3);return true;};

/* ---------- Envoltorio de la actualización de criaturas ---------- */
let mobActual=null;
const _actualizarMobCri=actualizarMob;
actualizarMob=function(m,dt){
  let defOrig=null;
  if(m.tipo==='creeper'){const g=masCercano(m,o=>o.tipo==='gato',6);
    if(g){defOrig=m.def;m.def=m.def._huye||(m.def._huye={...m.def,ia:'huyeGato'});m.gatoHuir=g;m.mecha=Math.max(0,m.mecha-dt*2);}}
  if(m.tipo==='osoPolar'&&!m.bebe&&estado!=='muerto'&&supervivencia()){  // protege a sus crías
    for(const o of mobs)if(o.tipo==='osoPolar'&&o.bebe&&o.pos.distanceTo(m.pos)<16&&o.pos.distanceTo(jugador.pos)<5){m.enfadado=Math.max(m.enfadado,6);break;}}
  mobActual=m;
  try{_actualizarMobCri(m,dt);}finally{mobActual=null;if(defOrig)m.def=defOrig;}
  if(m.muerto)return;
  evitarPeligros(m,dt);
  animarCriatura(m,dt);
};
// Mira un poco por delante: si hay un precipicio, lava, fuego o un cactus, da la vuelta
function peligroEn(x,y,z){
  const b=getBloque(x,y,z), d=getBloque(x,y-1,z);
  if(esLava(b)||esLava(d)||b===B.fuego||b===B.cactus||d===B.cactus||d===B.bloqueMagma||b===B.fuegoAlmas)return true;
  if(SOLIDO[b])return false;
  for(let k=1;k<=3;k++){const q=getBloque(x,y-k,z);if(SOLIDO[q]||esAgua(q))return false;}
  return true;  // más de 3 bloques de caída
}
function evitarPeligros(m,dt){
  if(m.def.vuela||!m.mover||!m.suelo||m===jugador.montura||m.embiste)return;
  const persiguiendo=(m.def.tipo==='hostil'||m.enfadado>0)&&estado!=='muerto'&&m.pos.distanceTo(jugador.pos)<24;
  if(persiguiendo&&!(m.objetivo))return;
  const s=Math.sin(m.yawObj),c=Math.cos(m.yawObj), r=m.ancho+.7;
  if(peligroEn(Math.floor(m.pos.x+s*r),Math.floor(m.pos.y+.1),Math.floor(m.pos.z+c*r))){
    m.yawObj+=Math.PI*(.6+Math.random()*.8); m.t=1+Math.random()*2; m.vel.x*=.2; m.vel.z*=.2;
    if(m.presa)m.presa=null;
  }
  // Atascado contra una pared de dos bloques: prueba otra dirección
  if(m.chocoH){m.atascoT=(m.atascoT||0)+dt;if(m.atascoT>1.2){m.atascoT=0;m.yawObj+=(Math.random()<.5?1:-1)*Math.PI/2;m.t=1.5;}}
  else m.atascoT=0;
}
function animarCriatura(m,dt){
  const E=m.extra;
  if(E.collar)E.collar.visible=!!m.domado;
  if(m.tipo==='lobo'||m.tipo==='gato'){
    if(m.sentado){m.grupo.rotation.x=-.45;m.grupo.position.y-=.12;m.piernas.forEach(p=>{p.rotation.x=p.position.z<0?1.2:0;});}
    if(E.cola)E.cola.rotation.x=m.tipo==='lobo'?(m.enfadado>0?.1:.4+(m.domado?Math.min(1,m.vida/m.vidaMax)*.6:.2))+Math.sin(tiempoJuego*(m.domado?9:3))*.05:-.6+Math.sin(tiempoJuego*2)*.2;
    if(m.tipo==='lobo'&&m.sentado&&E.cola)E.cola.rotation.x=-.2;
  }
  if(m.tipo==='zorro'){
    const d=!!m.durmiendo; if(E.ojosZ)E.ojosZ.forEach(o=>o.scale.y=d?.3:1);
    if(d){m.grupo.position.y-=.18;m.piernas.forEach(p=>p.rotation.x=p.position.z<0?1.4:-1.4);}
    if(E.cola)E.cola.rotation.x=d?.1:-.3+Math.sin(tiempoJuego*3)*.08;
  }
  if(m.tipo==='calamar'&&E.tentaculos){
    const imp=m.impulso>0?(m.impulso-=dt,1):0;
    E.tentaculos.forEach(t=>{const a=.25+Math.sin(tiempoJuego*3+t.userData.a)*.12+imp*.5;t.rotation.x=Math.sin(t.userData.a)*a;t.rotation.z=-Math.cos(t.userData.a)*a;});
    m.grupo.rotation.x=Math.sin(tiempoJuego*.8+m.origen.x)*.15;
  }
  if(m.tipo==='murcielago'&&E.alas){E.alas.forEach(w=>w.rotation.y=w.userData.s*Math.sin(tiempoJuego*28)*.9);m.grupo.position.y+=Math.sin(tiempoJuego*8)*.04;}
  if(m.tipo==='cabra'&&E.cabeza&&m.embiste)E.cabeza.rotation.x=m.embiste.prep>0?.6:.35;
}

/* ---------- Daño: mascotas que defienden, manadas y tinta ---------- */
const _herirMobCri=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  const antes=m&&m.enfadado;
  const r=_herirMobCri(m,d,dir,fuente,empuje);
  if(!m)return r;
  if((fuente==='jugador'||fuente==='flechaJugador')){
    if(m.domado){m.enfadado=antes||0;if(m.sentado)m.sentado=false;}
    else{
      for(const w of mobs)if(w.tipo==='lobo'&&w.domado&&!w.sentado&&w!==m&&w.pos.distanceTo(jugador.pos)<24)w.objetivo=m;
      if(m.tipo==='lobo')for(const w of mobs)if(w.tipo==='lobo'&&!w.domado&&w.pos.distanceTo(m.pos)<16)w.enfadado=30;
      if(m.tipo==='osoPolar')for(const w of mobs)if(w.tipo==='osoPolar'&&!w.bebe&&w.pos.distanceTo(m.pos)<20)w.enfadado=30;
    }
  }
  if(m.tipo==='calamar'&&!m.muerto){emitirParticulas(m.pos.x,m.pos.y+.4,m.pos.z,0x101014,24,2.5,1.2,0);m.huir=3;}
  if(m.tipo==='zorro'||m.tipo==='gato'||m.tipo==='conejo'||m.tipo==='cabra'){m.huir=5;m.durmiendo=false;}
  return r;
};
const _danarJugadorCri=danarJugador;
danarJugador=function(n,tipo,dir){
  if(mobActual&&tipo==='mob'&&!mobActual.domado)for(const w of mobs)if(w.tipo==='lobo'&&w.domado&&!w.sentado&&w.pos.distanceTo(jugador.pos)<24)w.objetivo=mobActual;
  return _danarJugadorCri(n,tipo,dir);
};

/* ---------- Zombis bebé y enemigos con armadura ---------- */
const MAT_ARM_MOB=[[0,.37,0x96603a],[1,.49,0xfad650],[2,.14,0xa8a8a8]];  // cuero, oro, hierro
const _crearMobCri=crearMob;
crearMob=function(tipo,x,y,z,opc={}){
  if(tipo==='lobo'&&opc.variante===undefined)opc={...opc,variante:'palido'};
  if(tipo==='gato'&&opc.variante===undefined)opc={...opc,variante:Math.floor(Math.random()*COL_GATO.length)};
  if(tipo==='conejo'&&opc.variante===undefined)opc={...opc,variante:['marron','negro','sal','manchado'][Math.floor(Math.random()*4)]};
  const m=_crearMobCri(tipo,x,y,z,opc);
  if((tipo==='zombi'||tipo==='ahogado')&&!opc.adulto&&Math.random()<.05){
    m.zombiBebe=true; m.def={...m.def,vel:m.def.vel*1.6}; m.grupo.scale.setScalar(.5); m.ancho*=.6; m.alto*=.5;
  }
  if((tipo==='zombi'||tipo==='esqueleto'||tipo==='ahogado')&&!m.zombiBebe&&!opc.sinArmadura&&Math.random()<.15)ponerArmaduraMob(m);
  if(tipo==='osoPolar'&&m.bebe)m.enfadado=0;
  return m;
};
function ponerArmaduraMob(m){
  let r=Math.random(),mat=MAT_ARM_MOB[0];for(const x of MAT_ARM_MOB){if(r<x[1]){mat=x;break;}r-=x[1];}
  const [k,,col]=mat, piezas=[0]; for(let p=1;p<4&&Math.random()<.5;p++)piezas.push(p);
  m.equipo=piezas.map(p=>400+p*10+k);
  const g=m.grupo, caja=(w,h,d,x,y,z,padre)=>{const b=parte(w,h,d,col,false,null);b.position.set(x,y,z);(padre||g).add(b);return b;};
  for(const p of piezas){
    if(p===0){caja(.56,.2,.56,0,1.96,0);caja(.56,.34,.06,0,1.78,-.27);caja(.06,.3,.54,-.28,1.8,0);caja(.06,.3,.54,.28,1.8,0);}
    if(p===1){caja(.56,.62,.34,0,1.18,0);m.brazos.forEach(b=>caja(.29,.3,.29,0,-.14,0,b));}
    if(p===2){caja(.54,.16,.32,0,.8,0);m.piernas.forEach(l=>caja(.29,.42,.29,0,-.22,0,l));}
    if(p===3)m.piernas.forEach(l=>caja(.3,.2,.3,0,-.64,0,l));
  }
  m.armadura=(ARMADURA_MOB[m.tipo]||0)+piezas.reduce((a,p)=>a+ARM_MATS[k].def[p],0);
}
const _alMorirCri=alMorirMob;
alMorirMob=function(m){
  if(m.equipo&&m.ultimoGolpeJugador&&tiempoJuego-m.ultimoGolpeJugador<5)
    for(const id of m.equipo)if(Math.random()<.085){const p=crearPila(id);p.dur=Math.max(1,Math.floor(p.dur*(.2+Math.random()*.6)));soltarItem(p,m.pos.x,m.pos.y+1,m.pos.z,true);}
  if(m.domado&&(m.tipo==='lobo'||m.tipo==='gato'))mostrarMensaje(`Tu ${m.tipo==='lobo'?'lobo':'gato'} ha muerto.`);
  return _alMorirCri(m);
};

/* ---------- Clic derecho sobre criaturas y cuerno de cabra ---------- */
let cuernoCD=0;
function usarDerechoCriaturas(p,id){
  if(id===625){if(cuernoCD<=0){cuernoCD=7;sonar('cuerno',null,1.2);balancearMano();}return true;}
  const m=apuntadoEnt&&apuntadoEnt.mob; if(!m)return false;
  if(m.tipo==='lobo'||m.tipo==='gato'){
    const domaCon=m.tipo==='lobo'?id===I.hueso:esPescado(id);
    if(!m.domado){
      if(!domaCon||m.enfadado>0)return false;
      consumirEnMano(); balancearMano();
      if(Math.random()<1/3)domar(m,m.tipo==='lobo'?40:10);
      else emitirParticulas(m.pos.x,m.pos.y+m.alto,m.pos.z,0x707070,6,1,.8,-1);
      return true;
    }
    const cura=m.tipo==='lobo'?esCarne(id):esPescado(id);
    if(cura&&m.vida<m.vidaMax){m.vida=Math.min(m.vidaMax,m.vida+(ITEMS[id].comida?ITEMS[id].comida[0]*2:4));consumirEnMano();balancearMano();
      emitirParticulas(m.pos.x,m.pos.y+m.alto,m.pos.z,0xff5070,5,1,.8,-1);sonar('comer',m.pos);return true;}
    m.sentado=!m.sentado; m.objetivo=null; sonar(m.tipo,m.pos,.6);
    return true;
  }
  return false;
}
const _usarDerechoCompletoCri=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){if(usarDerechoCriaturas(p,id))return true;return _usarDerechoCompletoCri(p,id,it);};

/* ---------- Aparición por biomas ---------- */
function aparicionCriaturas(x,z){
  if(dim!==DIMS.superficie||(mundoEstado&&mundoEstado.oneBlock)||Math.random()>.14)return false;
  if(Math.hypot(x-jugador.pos.x,z-jugador.pos.z)<20)return false;
  const bio=infoColumna(x,z).bioma;
  let y=CY-1; while(y>0&&!getBloque(x,y,z))y--;
  const sup=getBloque(x,y,z), n=t=>contar(m=>m.tipo===t);
  const grupo=(tipo,cant,opc)=>{let k=0;for(let i=0;i<cant;i++){const ox=x+azar(-2,2),oz=z+azar(-2,2),oy=buscarSuelo(ox,y+3,oz,6,1);
    if(oy>0&&!esLiquido(getBloque(ox,oy-1,oz))){crearMob(tipo,ox+.5,oy,oz+.5,typeof opc==='function'?opc(i):opc);k++;}}return k>0;};
  const tierra=sup===B.cesped||sup===B.cespedNevado||sup===B.tierra||sup===B.bloqueNieve||sup===B.capaNieve||sup===B.arena||sup===B.nieve;
  // Murciélagos en cuevas oscuras
  if(Math.random()<.25&&n('murcielago')<4){
    const yy=Math.floor(jugador.pos.y)+azar(-12,6);
    if(yy<y-6&&yy>2&&!getBloque(x,yy,z)&&!getBloque(x,yy+1,z)&&SOLIDO[getBloque(x,yy-1,z)]&&luzEn(x,yy,z)<4){crearMob('murcielago',x+.5,yy+.2,z+.5);return true;}
  }
  if(esAgua(sup)){
    if((esOceano(bio)||bio===BIOMA.rio)&&n('calamar')<5){let yy=y;while(yy>1&&esAgua(getBloque(x,yy-1,z))&&y-yy<3)yy--;
      if(y-yy>=1){for(let k=azar(1,3);k>0;k--)crearMob('calamar',x+.5+Math.random(),yy,z+.5+Math.random());return true;}}
    if(bio===BIOMA.oceanoHelado&&n('osoPolar')<2)return false;
    return false;
  }
  if(!tierra&&sup!==B.hielo&&sup!==B.hieloCompacto)return false;
  const lobo={[BIOMA.taiga]:'palido',[BIOMA.bosque]:'bosque',[BIOMA.taigaNevada]:'ceniza',[BIOMA.sabana]:'manchado',[BIOMA.picosNevados]:'nevado',[BIOMA.bosqueOscuro]:'negro'}[bio];
  if(lobo&&n('lobo')<8&&Math.random()<.35)return grupo('lobo',azar(2,4),{variante:lobo});
  if((bio===BIOMA.taiga||bio===BIOMA.taigaNevada)&&n('zorro')<5&&Math.random()<.4)return grupo('zorro',azar(1,3),{variante:bio===BIOMA.taigaNevada?'nieve':undefined});
  const conejo={[BIOMA.desierto]:'dorado',[BIOMA.nevado]:'blanco',[BIOMA.taigaNevada]:'blanco',[BIOMA.taiga]:'marron',[BIOMA.prado]:'marron',[BIOMA.cerezo]:'manchado',[BIOMA.bosque]:'negro'}[bio];
  if(conejo&&n('conejo')<8&&Math.random()<.4)return grupo('conejo',azar(2,3),{variante:conejo});
  if((bio===BIOMA.montana||bio===BIOMA.picosNevados)&&n('cabra')<4&&Math.random()<.5)return grupo('cabra',azar(1,3));
  if((bio===BIOMA.nevado||bio===BIOMA.oceanoHelado)&&n('osoPolar')<2&&Math.random()<.3)return grupo('osoPolar',azar(1,2),i=>({bebe:i>0}));
  // Gatos callejeros en las aldeas
  if(n('gato')<3&&Math.random()<.3)for(const al of aldeasCerca(x,z))if(Math.hypot(al.x-x,al.z-z)<40)return grupo('gato',1);
  return false;
}
const _aparicionFinalCri=aparicionFinal;
aparicionFinal=function(x,z){if(aparicionCriaturas(x,z))return true;return _aparicionFinalCri(x,z);};

/* ---------- Mascotas guardadas con el mundo ---------- */
const CAMPOS_MASCOTA=['variante','domado','sentado','vida','vidaMax','silla','barda','arnes','temple','cuernos','equipo'];
let mundoMascotas=null, dimMascotas=null, mascotasPend=[], mascotasT=0;
function sincronizarMascotas(dt){
  if(typeof mundoEstado==='undefined'||!mundoEstado||estado==='menu')return;
  if(mundoEstado!==mundoMascotas||dim.clave!==dimMascotas){
    mundoMascotas=mundoEstado; dimMascotas=dim.clave;
    mascotasPend=(mundoEstado.mascotas||[]).filter(p=>p.dim===dim.clave&&!mobs.some(m=>m.idMascota===p.id));
  }
  for(let i=mascotasPend.length-1;i>=0;i--){const p=mascotasPend[i];
    const ch=chunkSiExiste(Math.floor(p.x/CX),Math.floor(p.z/CZ)); if(!ch||!ch.malla||!DEF_MOB[p.tipo])continue;
    const m=crearMob(p.tipo,p.x,p.y+.05,p.z,{variante:p.variante,sinArmadura:true,adulto:true});
    for(const k of CAMPOS_MASCOTA)if(p[k]!==undefined)m[k]=p[k];
    m.idMascota=p.id; mascotasPend.splice(i,1);
  }
  mascotasT-=dt; if(mascotasT>0)return; mascotasT=2;
  const otras=(mundoEstado.mascotas||[]).filter(p=>p.dim!==dim.clave);
  const aqui=mobs.filter(m=>m.domado&&!m.muerto).map(m=>{
    if(!m.idMascota)m.idMascota=Math.random().toString(36).slice(2,10);
    const o={id:m.idMascota,tipo:m.tipo,dim:dim.clave,x:+m.pos.x.toFixed(2),y:+m.pos.y.toFixed(2),z:+m.pos.z.toFixed(2)};
    for(const k of CAMPOS_MASCOTA)if(m[k]!==undefined)o[k]=m[k];return o;});
  mundoEstado.mascotas=otras.concat(aqui,mascotasPend);
}

/* ---------- Inventario en creativo ---------- */
function cambiarUI(tipo){
  estado='cambiandoUI'; try{cerrarUI();}finally{estado='jugando';}
  abrirUI(tipo);
}
(function(){
  const barra=document.getElementById('pestanas'); if(!barra)return;
  const b=document.createElement('button'); b.textContent='🎒'; b.dataset.tip='Inventario de supervivencia';
  b.style.cssText='width:auto;margin:0 0 0 auto;padding:6px 10px;font-size:15px';
  b.onmousedown=e=>{e.preventDefault();cambiarUI('inv');};
  barra.appendChild(b);
})();
const _construirUICri=construirUI;
construirUI=function(){
  _construirUICri();
  if(!ui||ui.tipo!=='inv'||supervivencia())return;
  const z=document.createElement('div');z.className='zonaCraft';z.style.alignItems='center';
  const volver=document.createElement('button');volver.className='secundario';volver.textContent='◀ Objetos del creativo';
  volver.style.cssText='width:auto;margin:0';volver.onmousedown=e=>{e.preventDefault();e.stopPropagation();cambiarUI('paleta');};
  const t=document.createElement('div');t.className='pista';t.textContent='Destruir objeto:';t.style.margin='0 0 0 12px';
  z.append(volver,t);
  crearSlot(z,{tipo:'normal',papelera:true,get:()=>null,set:()=>{sonar('romper',null,.3);},acepta:()=>true,shift:()=>null},false,'papelera');
  elSup.appendChild(z);
};

/* ---------- Repartir arrastrando por las ranuras ---------- */
let arrastreInv=null;
const copiaPila=p=>p?{...p}:null;
function puedeRepartir(ref,pila){
  if(!ref||ref.tipo!=='normal'||ref.armadura||ref.papelera||!pila)return false;
  if(pila.id===542)return false;
  const s=ref.get();
  if(s&&(s.id===542||!mismaPila(s,pila)))return false;
  return ref.acepta(pila);
}
function aplicarReparto(){
  const a=arrastreInv, P=a.pila;
  a.refs.forEach((r,i)=>r.set(copiaPila(a.orig[i])));
  let resto=P.n;
  const tope=r=>Math.min(r.max||64,maxPila(P.id));
  if(a.boton===2){
    for(const r of a.refs){if(resto<=0)break;const s=r.get(),n=s?s.n:0;if(n<tope(r)){r.set({...P,n:n+1});resto--;}}
  }else{
    const k=Math.max(1,Math.floor(P.n/a.refs.length));
    for(const r of a.refs){if(resto<=0)break;const s=r.get(),n=s?s.n:0,add=Math.min(k,tope(r)-n,resto);if(add>0){r.set({...P,n:n+add});resto-=add;}}
  }
  cursor=resto>0?{...P,n:resto}:null;
  a.els.forEach(el=>el.classList.add('repartida'));
}
const _clicSlotCri=clicSlot;
clicSlot=function(ref,boton,shift){
  if(!shift&&cursor&&(boton===0||boton===2)&&puedeRepartir(ref,cursor)){
    arrastreInv={boton,pila:{...cursor},refs:[ref],orig:[copiaPila(ref.get())],els:[]};
    const el=refsUI.find(o=>o.ref===ref); if(el)arrastreInv.els.push(el.el);
    aplicarReparto(); return;
  }
  return _clicSlotCri(ref,boton,shift);
};
const _crearSlotCri=crearSlot;
crearSlot=function(cont,ref,grande,fondo){
  const el=_crearSlotCri(cont,ref,grande,fondo);
  el.addEventListener('mouseenter',e=>{
    const a=arrastreInv; if(!a)return;
    if(!e.buttons){terminarReparto();return;}
    if(a.refs.includes(ref)||!puedeRepartir(ref,a.pila))return;
    if(a.boton===0&&a.refs.length>=a.pila.n)return;   // no hay objetos para más ranuras
    a.refs.push(ref); a.orig.push(copiaPila(ref.get())); a.els.push(el);
    aplicarReparto(); refrescarUI();
  });
  return el;
};
function terminarReparto(){if(!arrastreInv)return;arrastreInv.els.forEach(el=>el.classList.remove('repartida'));arrastreInv=null;}
document.addEventListener('mouseup',terminarReparto);
{const s=document.createElement('style');s.textContent='.slot.repartida{outline:2px solid #fff;outline-offset:-3px;}.slot[data-fondo="papelera"]::after{content:"🗑";opacity:.55;font-size:22px;display:grid;place-items:center;position:absolute;inset:0;}';document.head.appendChild(s);}

/* ---------- Cada fotograma ---------- */
const _actualizarFinalCri=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalCri(dt);
  if(cuernoCD>0)cuernoCD-=dt;
  sincronizarMascotas(dt);
};
