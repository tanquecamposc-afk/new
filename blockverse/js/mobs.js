"use strict";
/* =========================================================
   Criaturas
   ========================================================= */
const mobs=[];
const DEF_MOB={
  cerdo:{vida:10,ancho:.45,alto:.9,vel:1.2,tipo:'pasivo',comida:I.trigo,xp:[1,3],sonido:'cerdo',dims:['superficie'],
    suelta:b=>[[I.cerdoCrudo,azar(1,3+b)]]},
  vaca:{vida:10,ancho:.45,alto:1.4,vel:1.1,tipo:'pasivo',comida:I.trigo,xp:[1,3],sonido:'vaca',dims:['superficie'],
    suelta:b=>[[I.resCruda,azar(1,3+b)],[I.cuero,azar(0,2+b)]]},
  oveja:{vida:8,ancho:.45,alto:1.3,vel:1.1,tipo:'pasivo',comida:I.trigo,xp:[1,3],sonido:'oveja',dims:['superficie'],
    suelta:b=>[[B.lana,1],[I.corderoCrudo,azar(1,2+b)]]},
  gallina:{vida:4,ancho:.2,alto:.7,vel:1.1,tipo:'pasivo',comida:I.semillas,xp:[1,3],sonido:'gallina',planea:true,dims:['superficie'],
    suelta:b=>[[I.pluma,azar(0,2+b)],[I.polloCrudo,1]]},
  zombi:{vida:20,ancho:.3,alto:1.95,vel:2.3,tipo:'hostil',ia:'melee',dano:3,xp:[5,5],sonido:'zombi',quemaSol:true,
    suelta:b=>[[I.carnePodrida,azar(0,2+b)],[I.lingoteHierro,prob(.025)?1:0]]},
  esqueleto:{vida:20,ancho:.3,alto:1.99,vel:2.5,tipo:'hostil',ia:'arquero',xp:[5,5],sonido:'esqueleto',quemaSol:true,
    suelta:b=>[[I.hueso,azar(0,2+b)],[I.flecha,azar(0,2+b)]]},
  creeper:{vida:20,ancho:.3,alto:1.7,vel:2.2,tipo:'hostil',ia:'creeper',xp:[5,5],sonido:'creeper',
    suelta:b=>[[I.polvora,azar(0,2+b)]]},
  arana:{vida:16,ancho:.7,alto:.9,vel:3,tipo:'hostil',ia:'melee',dano:2,trepa:true,neutralDia:true,xp:[5,5],sonido:'arana',
    suelta:b=>[[I.cuerda,azar(0,2+b)],[I.ojoArana,prob(.33)?1:0]]},
  enderman:{vida:40,ancho:.3,alto:2.9,vel:3,tipo:'neutral',ia:'enderman',dano:7,xp:[5,5],sonido:'enderman',odiaAgua:true,
    suelta:b=>[[I.perlaEnder,azar(0,1+b)]]},
  piglin:{vida:20,ancho:.3,alto:1.95,vel:2.3,tipo:'neutral',ia:'melee',dano:8,xp:[5,5],sonido:'piglin',inmuneFuego:true,
    suelta:b=>[[I.carnePodrida,azar(0,1+b)],[I.pepitaOro,azar(0,1+b)],[330+3,prob(.08)?1:0]]},
  aldeano:{vida:20,ancho:.3,alto:1.95,vel:1.3,tipo:'pasivo',ia:'aldeano',xp:[0,0],sonido:'aldeano',suelta:()=>[]},
  hoglin:{vida:40,ancho:.7,alto:1.4,vel:2.4,tipo:'hostil',ia:'melee',dano:6,xp:[5,5],sonido:'cerdo',inmuneFuego:true,
    suelta:b=>[[I.cerdoCrudo,azar(2,4+b)],[I.cuero,azar(0,1+b)]]},
  slime:{vida:16,ancho:.5,alto:1,vel:2,tipo:'hostil',ia:'cubo',dano:[0,2,4],xp:[1,4],sonido:'slime',
    suelta:b=>[[525,azar(0,2+b)]]},
  cuboMagma:{vida:16,ancho:.5,alto:1,vel:2.2,tipo:'hostil',ia:'cubo',dano:[3,4,6],xp:[1,4],sonido:'slime',inmuneFuego:true,
    suelta:b=>[[518,prob(.25+b*.1)?1:0]]},
  golem:{vida:100,ancho:.7,alto:2.7,vel:1.6,tipo:'neutral',ia:'golem',dano:15,xp:[0,0],sonido:'golem',
    suelta:b=>[[I.lingoteHierro,azar(3,5)],[B.florRoja,azar(0,2)]]},
  ghast:{vida:10,ancho:2,alto:4,vel:2,tipo:'hostil',ia:'ghast',vuela:true,xp:[5,5],sonido:'ghast',inmuneFuego:true,
    suelta:b=>[[I.lagrimaGhast,azar(0,1+b)],[I.polvora,azar(0,2+b)]]},
  blaze:{vida:20,ancho:.3,alto:1.8,vel:2.3,tipo:'hostil',ia:'blaze',vuela:true,xp:[10,10],sonido:'blaze',inmuneFuego:true,odiaAgua:true,
    suelta:b=>[[I.varaBlaze,azar(0,1+b)]]},
};
const NOMBRE_MOB={cerdo:'Cerdo',vaca:'Vaca',oveja:'Oveja',gallina:'Gallina',zombi:'Zombi',esqueleto:'Esqueleto',creeper:'Creeper',
  arana:'Araña',enderman:'Enderman',aldeano:'Aldeano',hoglin:'Hoglin',slime:'Slime',cuboMagma:'Cubo de magma',golem:'Gólem de hierro',piglin:'Piglin zombificado',ghast:'Ghast',blaze:'Blaze'};
const COCINADO={[I.cerdoCrudo]:I.cerdoAsado,[I.resCruda]:I.filete,[I.corderoCrudo]:I.corderoAsado,[I.polloCrudo]:I.polloAsado};

/* ---------- Modelos ---------- */
function parte(w,h,d,color,pivoteArriba){
  const g=new THREE.BoxGeometry(w,h,d); if(pivoteArriba)g.translate(0,-h/2,0);
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color}));m.userData.base=new THREE.Color(color);return m;
}
const PROFESIONES={
  granjero:{nombre:'Granjero',ropa:0x7a5a32,extra:0xd8c070},
  bibliotecario:{nombre:'Bibliotecario',ropa:0xe8e8e0,extra:0xb03030},
  herrero:{nombre:'Herrero',ropa:0x3a3a3a,extra:0x222222},
  clerigo:{nombre:'Clérigo',ropa:0x7a3a9a,extra:0xd0b040},
};
function ofertasProfesion(pr,r){
  const T={
    granjero:[[[I.trigo,20],[I.esmeralda,1]],[[I.esmeralda,1],[I.pan,6]],[[B.calabaza,6],[I.esmeralda,1]],[[I.esmeralda,1],[I.manzana,4]],[[I.esmeralda,3],[I.polloAsado,8]]],
    bibliotecario:[[[I.papel,24],[I.esmeralda,1]],[[I.libro,4],[I.esmeralda,1]],[[I.esmeralda,9],[B.estanteria,1]],[[I.esmeralda,1],[B.vidrio,4]],[[I.esmeralda,5],[B.mesaEncantar,1]]],
    herrero:[[[I.carbon,15],[I.esmeralda,1]],[[I.lingoteHierro,4],[I.esmeralda,1]],[[I.esmeralda,5],[400+2,1]],[[I.esmeralda,9],[410+2,1]],[[I.esmeralda,3],[312,1]],[[I.diamante,1],[I.esmeralda,1]]],
    clerigo:[[[I.carnePodrida,32],[I.esmeralda,1]],[[I.esmeralda,1],[I.redstone,2]],[[I.esmeralda,1],[I.lapis,1]],[[I.esmeralda,5],[I.perlaEnder,1]],[[I.esmeralda,4],[B.piedraLuminosa,1]]],
  }[pr];
  const lista=T.slice(); const n=3+Math.floor(r()*2);
  while(lista.length>n)lista.splice(Math.floor(r()*lista.length),1);
  return lista.map(([c,d])=>({costo:c,da:d,usos:0,max:8+Math.floor(r()*5)}));
}
function modeloMob(tipo,opc={}){
  const g=new THREE.Group(), piernas=[], brazos=[], extra={};
  const pon=(m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m;};
  const ojos=(y,z,sep,col=0x111111,t=.09)=>{pon(parte(t,t,.02,col),-sep,y,z);pon(parte(t,t,.02,col),sep,y,z);};
  const cuadrupedo=(ancho,largo,altP,colP,grosor=.22)=>[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{
    const p=pon(parte(grosor,altP,grosor,colP,true),a*ancho,altP,b*largo);p.userData.s=a*b;piernas.push(p);});
  const humanoide=(piel,camisa,pant,brazoCol,delgado=.25)=>{
    [-1,1].forEach(s=>{const p=pon(parte(delgado,.75,delgado,pant,true),s*.125,.75,0);p.userData.s=s;piernas.push(p);});
    pon(parte(.5,.75,.28,camisa),0,1.125,0);
    extra.cabeza=pon(parte(.5,.5,.5,piel),0,1.75,0);
    [-1,1].forEach(s=>{const b=pon(parte(delgado,.75,delgado,brazoCol,true),s*(.25+delgado/2),1.5,0);b.userData.s=s;brazos.push(b);});
  };
  switch(tipo){
    case 'cerdo':
      cuadrupedo(.16,.26,.32,0xe79a9a,.2);
      pon(parte(.58,.46,.86,0xf0a9a9),0,.55,0); extra.cabeza=pon(parte(.46,.44,.4,0xf0a9a9),0,.72,.58);
      pon(parte(.24,.15,.06,0xd98585),0,.66,.8); ojos(.8,.785,.13); break;
    case 'vaca':
      cuadrupedo(.22,.36,.55,0x3b2718);
      pon(parte(.72,.62,1.08,0x4a3222),0,.86,0); pon(parte(.74,.3,.42,0xeeeeee),0,.9,.12);
      extra.cabeza=pon(parte(.46,.46,.36,0x4a3222),0,1.12,.68); pon(parte(.3,.18,.06,0xc9a58a),0,1.0,.87);
      pon(parte(.08,.12,.08,0xdddddd),-.2,1.4,.66); pon(parte(.08,.12,.08,0xdddddd),.2,1.4,.66); ojos(1.2,.865,.14); break;
    case 'oveja':
      cuadrupedo(.2,.3,.5,0xe0cbb0,.2);
      pon(parte(.8,.7,1.1,0xf4f4f4),0,.9,0); extra.cabeza=pon(parte(.4,.42,.46,0xe0cbb0),0,1.15,.62);
      pon(parte(.46,.2,.3,0xf4f4f4),0,1.34,.56); ojos(1.18,.855,.12); break;
    case 'gallina':
      [-1,1].forEach(s=>{const p=pon(parte(.06,.3,.06,0xf0c040,true),s*.1,.3,0);p.userData.s=s;piernas.push(p);});
      pon(parte(.36,.34,.48,0xf6f6f6),0,.45,0); extra.cabeza=pon(parte(.22,.3,.18,0xf6f6f6),0,.75,.24);
      pon(parte(.16,.08,.1,0xf0a030),0,.74,.37); pon(parte(.08,.1,.06,0xd02020),0,.64,.34);
      [-1,1].forEach(s=>{const b=pon(parte(.06,.26,.34,0xeeeeee,true),s*.2,.58,0);b.userData.s=s;brazos.push(b);}); ojos(.8,.335,.07,0x111111,.05); break;
    case 'zombi':
      humanoide(0x5e9c4a,0x2f8f9d,0x3a3f8f,0x5e9c4a); ojos(1.78,.26,.12); break;
    case 'esqueleto':
      humanoide(0xc8c8c8,0xb8b8b8,0xb0b0b0,0xc0c0c0,.13); ojos(1.78,.26,.12,0x222222);
      extra.arco=pon(parte(.05,.7,.05,0x7a5a30),.36,1.0,.45); break;
    case 'creeper':
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=pon(parte(.24,.4,.24,0x3ea83e,true),a*.13,.4,b*.18);p.userData.s=a*b;piernas.push(p);});
      pon(parte(.5,.8,.28,0x4cbb4c),0,.8,0); extra.cabeza=pon(parte(.5,.5,.5,0x57c957),0,1.45,0);
      pon(parte(.12,.12,.02,0x111111),-.12,1.52,.26); pon(parte(.12,.12,.02,0x111111),.12,1.52,.26);
      pon(parte(.12,.2,.02,0x111111),0,1.38,.26); pon(parte(.26,.08,.02,0x111111),0,1.3,.26); break;
    case 'arana':
      pon(parte(.75,.6,.8,0x2a2420),0,.55,-.45); pon(parte(.5,.45,.5,0x3a3430),0,.5,.15);
      extra.cabeza=pon(parte(.5,.42,.4,0x2a2420),0,.5,.55); ojos(.58,.755,.12,0xff2020,.08); ojos(.5,.755,.2,0xff2020,.06);
      for(let i=0;i<4;i++)[-1,1].forEach(s=>{const p=new THREE.Group();const l=parte(.9,.08,.08,0x2a2420);l.position.x=s*.45;p.add(l);
        p.position.set(s*.2,.55,.3-i*.2);p.rotation.z=s*.35;p.userData.s=(i%2?1:-1)*s;p.userData.pata=true;g.add(p);piernas.push(p);});
      break;
    case 'enderman':
      [-1,1].forEach(s=>{const p=pon(parte(.14,1.5,.14,0x111111,true),s*.1,1.5,0);p.userData.s=s;piernas.push(p);});
      pon(parte(.46,.75,.24,0x161616),0,1.875,0); extra.cabeza=pon(parte(.5,.5,.5,0x111111),0,2.5,0);
      ojos(2.47,.26,.13,0xd060ff,.1);
      [-1,1].forEach(s=>{const b=pon(parte(.14,1.5,.14,0x111111,true),s*.3,2.25,0);b.userData.s=s;brazos.push(b);}); break;
    case 'piglin':
      humanoide(0xe8a0a0,0x9a6a50,0x6a4a30,0xe8a0a0); pon(parte(.3,.2,.08,0xd88888),0,1.66,.27); ojos(1.82,.26,.13,0x111111);
      pon(parte(.15,.22,.15,0x6aa84a),-.18,1.9,.2);
      extra.espada=pon(parte(.06,.7,.06,0xf0d040),.38,1.0,.4); break;
    case 'hoglin':
      cuadrupedo(.3,.45,.6,0x8a5a44,.3);
      pon(parte(1.2,.95,1.6,0xb07860),0,1.05,0); extra.cabeza=pon(parte(.9,.75,.8,0xb07860),0,1.05,1.1);
      pon(parte(.6,.3,.08,0x9a6450),0,.9,1.52); pon(parte(.1,.35,.1,0xf0f0e0),-.35,.95,1.5); pon(parte(.1,.35,.1,0xf0f0e0),.35,.95,1.5);
      pon(parte(.3,.3,.9,0xd8c090),0,1.6,.1); ojos(1.2,1.51,.25); break;
    case 'slime': case 'cuboMagma':{
      const t=[.5,1,2][opc.tam??1], magma=tipo==='cuboMagma';
      const cuerpo=parte(t,t,t,magma?0x5a1a0a:0x6cc050); if(!magma){cuerpo.material.transparent=true;cuerpo.material.opacity=.72;}
      pon(cuerpo,0,t/2,0); extra.cuerpo=cuerpo;
      if(magma){for(let k=0;k<3;k++)pon(parte(t*1.01,t*.08,t*1.01,0xff8a20),0,t*(.25+k*.25),0);}
      else pon(parte(t*.55,t*.55,t*.55,0x4a9a38),0,t/2,0);
      pon(parte(t*.16,t*.16,.02,magma?0xffd040:0x1a3a10),-t*.2,t*.62,t/2+.011); pon(parte(t*.16,t*.16,.02,magma?0xffd040:0x1a3a10),t*.2,t*.62,t/2+.011);
      if(!magma)pon(parte(t*.1,t*.06,.02,0x1a3a10),0,t*.35,t/2+.011);
      break;}
    case 'golem':
      [-1,1].forEach(s=>{const p=pon(parte(.42,1.05,.42,0xc8c6bc,true),s*.26,1.05,0);p.userData.s=s;piernas.push(p);});
      pon(parte(1.1,.85,.7,0xd8d6cc),0,1.7,0); pon(parte(.7,.35,.5,0xd0cec4),0,1.1,0);
      extra.cabeza=pon(parte(.5,.6,.5,0xd8d6cc),0,2.42,.05); pon(parte(.14,.3,.12,0xc0beb4),0,2.3,.34); ojos(2.5,.31,.12,0x8a1010,.08);
      [-1,1].forEach(s=>{const b=pon(parte(.36,1.6,.36,0xd8d6cc,true),s*.74,2.1,0);b.userData.s=s;brazos.push(b);});
      pon(parte(.3,.5,.05,0x4a8a2a),.25,1.7,.36); pon(parte(.2,.4,.05,0x4a8a2a),-.3,1.9,.36); break;
    case 'aldeano':{
      const pr=PROFESIONES[opc.profesion||'granjero'];
      [-1,1].forEach(s=>{const p=pon(parte(.22,.7,.22,0x5a3a26,true),s*.12,.7,0);p.userData.s=s;piernas.push(p);});
      pon(parte(.52,.95,.34,pr.ropa),0,1.18,0);
      extra.cabeza=pon(parte(.46,.56,.46,0xc89a78),0,1.93,0);
      pon(parte(.12,.24,.1,0xb08060),0,1.84,.28); ojos(1.98,.235,.1,0x2a6a2a);
      pon(parte(.36,.08,.06,0x6a4a30),0,2.08,.23);
      pon(parte(.62,.22,.26,pr.ropa),0,1.42,.2);
      if(opc.profesion==='herrero')pon(parte(.54,.6,.02,0x222222),0,1.1,.18);
      if(opc.profesion==='granjero')pon(parte(.62,.1,.62,0xd8c070),0,2.24,0);
      if(opc.profesion==='bibliotecario')pon(parte(.5,.14,.5,0xb03030),0,2.26,0);
      break;}
    case 'ghast':
      extra.cabeza=pon(parte(4,4,4,0xf2f2f2),0,2.6,0);
      pon(parte(.5,.2,.05,0x444444),-.9,3.1,2.01); pon(parte(.5,.2,.05,0x444444),.9,3.1,2.01); pon(parte(.8,.4,.05,0x444444),0,2.2,2.01);
      for(let i=0;i<9;i++){const p=pon(parte(.3,1.2+(i%3)*.5,.3,0xe8e8e8,true),(i%3-1)*1.2,.6,(Math.floor(i/3)-1)*1.2);p.userData.s=i%2?1:-1;piernas.push(p);}
      break;
    default:
      if(typeof MODELOS_EXTRA!=='undefined'&&MODELOS_EXTRA[tipo])MODELOS_EXTRA[tipo]({g,pon,parte,ojos,cuadrupedo,humanoide,piernas,brazos,extra,opc});
      break;
    case 'blaze':
      extra.cabeza=pon(parte(.5,.5,.5,0xf0c030),0,1.45,0); ojos(1.47,.26,.12,0x3a2000);
      extra.varas=[];for(let i=0;i<12;i++){const r=parte(.12,.5,.12,0xf09a20);g.add(r);extra.varas.push(r);}
      break;
  }
  return {g,piernas,brazos,extra};
}
function crearMob(tipo,x,y,z,opc={}){
  const def=DEF_MOB[tipo], mod=modeloMob(tipo,opc);
  const m={tipo,def,pos:new THREE.Vector3(x,y,z),vel:new THREE.Vector3(),ancho:def.ancho,alto:def.alto,vida:def.vida,
    yaw:Math.random()*6.28,yawObj:0,grupo:mod.g,piernas:mod.piernas,brazos:mod.brazos,extra:mod.extra,fase:0,t:0,mover:false,
    huir:0,flash:0,cd:Math.random(),fuego:0,fuegoT:0,inv:0,suelo:false,chocoH:false,sonidoT:4+Math.random()*10,luzT:0,
    vuela:!!def.vuela,enfadado:0,mecha:0,amor:0,bebe:opc.bebe?300:0,origen:new THREE.Vector3(x,y,z),ataqueT:0,rafaga:0,generador:opc.generador,golpeT:0,profesion:opc.profesion,ofertas:opc.ofertas};
  if(m.bebe)m.grupo.scale.setScalar(.5),m.ancho*=.5,m.alto*=.5;
  if(def.ia==='cubo'){const t=[.5,1,2][opc.tam??1];m.tam=opc.tam??1;m.ancho=t/2*.98;m.alto=t;m.vida=[1,4,16][m.tam];}
  escena.add(m.grupo); mobs.push(m); return m;
}
function quitarMob(m){
  if(m.muerto&&!mobs.includes(m))return;
  m.muerto=true;
  escena.remove(m.grupo);
  m.grupo.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  const i=mobs.indexOf(m); if(i>=0)mobs.splice(i,1);
}
function limpiarMobs(){while(mobs.length)quitarMob(mobs[0]);for(const c of cadaveres){escena.remove(c.m.grupo);}cadaveres.length=0;}

/* ---------- Daño y muerte ---------- */
function herirMob(m,d,dir,fuente,empuje=0){
  if(m.muerto)return;
  if(m.inv>0&&fuente!=='fuego')return;
  if(m.def.inmuneFuego&&(fuente==='fuego'||fuente==='lava'))return;
  m.vida-=d; m.flash=.3; m.inv=fuente==='fuego'?0:.5;
  if(dir){const k=7+empuje*5;m.vel.x+=dir.x*k;m.vel.z+=dir.z*k;m.vel.y=Math.max(m.vel.y,5.5);}
  if(m.def.tipo==='pasivo')m.huir=5;
  if(fuente==='jugador'||fuente==='flechaJugador'){
    m.ultimoGolpeJugador=tiempoJuego;
    if(m.def.tipo==='neutral'){m.enfadado=30;
      if(m.tipo==='piglin')for(const o of mobs)if(o.tipo==='piglin'&&o.pos.distanceTo(m.pos)<24)o.enfadado=30;}
  }
  sonar('golpe',m.pos,.8);
  if(m.tipo==='enderman'&&fuente!=='jugador'&&m.vida>0&&prob(.7))teletransportarMob(m);
  if(m.vida<=0)matarMob(m,fuente);
}
function matarMob(m,fuente){
  const botin=fuente==='jugador'?nivelEnc(enMano(),'botin'):0;
  if(!m.bebe&&!(m.def.ia==='cubo'&&m.tam>0)){
    for(const [id,n] of m.def.suelta(botin)){
      if(n<=0)continue;
      const real=m.fuego>0&&COCINADO[id]?COCINADO[id]:id;
      soltarItem(crearPila(real,n),m.pos.x,m.pos.y+.5,m.pos.z,true);
    }
    if(fuente==='jugador'||tiempoJuego-(m.ultimoGolpeJugador||-99)<5)soltarXP(azar(m.def.xp[0],m.def.xp[1]),m.pos.x,m.pos.y,m.pos.z);
  }
  if(m.def.ia==='cubo'&&m.tam>0){const n=azar(2,4);for(let k=0;k<n;k++)crearMob(m.tipo,m.pos.x+(Math.random()-.5),m.pos.y+.3,m.pos.z+(Math.random()-.5),{tam:m.tam-1});}
  m.muerto=true;
  if(typeof alMorirMob==='function')alMorirMob(m);
  const i=mobs.indexOf(m); if(i>=0)mobs.splice(i,1);
  m.grupo.traverse(o=>{if(o.isMesh&&o.material.emissive)o.material.emissive.setRGB(.55,0,0);});
  cadaveres.push({m,t:0,lado:Math.random()<.5?1:-1});
}
const cadaveres=[];
function actualizarCadaveres(dt){
  for(let i=cadaveres.length-1;i>=0;i--){
    const c=cadaveres[i]; c.t+=dt; const m=c.m;
    m.grupo.rotation.z=c.lado*Math.min(1,c.t/.45)*Math.PI/2;
    m.grupo.position.y=m.pos.y+Math.min(1,c.t/.45)*m.ancho*.8;
    if(c.t>1){
      emitirParticulas(m.pos.x,m.pos.y+.4,m.pos.z,0xdddddd,12,1.6,.7,-2);
      escena.remove(m.grupo); m.grupo.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
      cadaveres.splice(i,1);
    }
  }
}
function teletransportarMob(m){
  for(let k=0;k<16;k++){
    const x=Math.floor(m.pos.x+(Math.random()-.5)*32),z=Math.floor(m.pos.z+(Math.random()-.5)*32);
    let y=Math.floor(m.pos.y+(Math.random()-.5)*16);
    for(let s=0;s<16&&y>1;s++,y--){
      if(SOLIDO[getBloque(x,y-1,z)]&&!getBloque(x,y,z)&&!getBloque(x,y+1,z)&&!getBloque(x,y+2,z)&&!esLiquido(getBloque(x,y-1,z))){
        emitirParticulas(m.pos.x,m.pos.y+1.5,m.pos.z,0x9030c0,12,1.5,.8,0);
        m.pos.set(x+.5,y,z+.5);m.vel.set(0,0,0);sonar('enderman',m.pos,.6);return true;}
    }
  }
  return false;
}
function hayLineaVision(a,b){
  const d=b.clone().sub(a), l=d.length(); if(l<.01)return true; d.divideScalar(l);
  const r=lanzarRayo(a,d,l);
  return !r||r.t>=l-.3;
}

/* ---------- IA ---------- */
function objetivoValido(){return estado!=='muerto'&&supervivencia();}
function mover(m,dirX,dirZ,vel){if(dirX||dirZ){m.yawObj=Math.atan2(dirX,dirZ);m.mover=true;m.velObj=vel;}else m.mover=false;}
function actualizarMob(m,dt){
  const j=jugador, def=m.def;
  const dx=j.pos.x-m.pos.x, dz=j.pos.z-m.pos.z, dy=j.pos.y-m.pos.y, dist=Math.hypot(dx,dz), dist3=Math.hypot(dx,dy,dz);
  m.cd-=dt; m.inv=Math.max(0,m.inv-dt); m.velObj=def.vel;
  if(m.enfadado>0)m.enfadado-=dt;
  if(m.bebe>0){m.bebe-=dt;if(m.bebe<=0){m.grupo.scale.setScalar(1);m.ancho=def.ancho;m.alto=def.alto;}}
  const esNoche=sol<-.05;
  let hostil=def.tipo==='hostil'||(def.tipo==='neutral'&&m.enfadado>0);
  if(def.neutralDia&&!esNoche&&brilloEn(m.pos.x,m.pos.y+.5,m.pos.z)>.5&&!(m.enfadado>0))hostil=false;
  const persigue=hostil&&objetivoValido()&&dist3<(def.ia==='ghast'?64:m.enfadado>0?40:24);
  const eye=new THREE.Vector3(m.pos.x,m.pos.y+m.alto*.85,m.pos.z), ojoJ=new THREE.Vector3(j.pos.x,j.pos.y+1.5,j.pos.z);
  if(def.ia==='enderman'&&!(m.enfadado>0)&&objetivoValido()&&dist3<40){
    m.miradaT=(m.miradaT||0)-dt;
    if(m.miradaT<=0){m.miradaT=.25;
      const dv=new THREE.Vector3();camara.getWorldDirection(dv);
      const aCabeza=new THREE.Vector3(m.pos.x,m.pos.y+2.5,m.pos.z).sub(camara.position);
      const l=aCabeza.length();aCabeza.divideScalar(l);
      if(dv.dot(aCabeza)>1-.025/l*10&&hayLineaVision(camara.position,new THREE.Vector3(m.pos.x,m.pos.y+2.5,m.pos.z))){m.enfadado=30;sonar('enderman',m.pos);}
    }
  }
  if(m.amor>0)m.amor-=dt;
  if(persigue&&def.ia==='arquero'){
    m.yawObj=Math.atan2(dx,dz);
    if(dist<6)mover(m,-dx,-dz,def.vel);else if(dist>12)mover(m,dx,dz,def.vel);else{m.mover=true;m.yawObj+=Math.PI/2;m.velObj=def.vel*.5;}
    if(m.cd<=0&&dist3<16&&hayLineaVision(eye,ojoJ)){
      m.cd=1.5+Math.random();
      const dir=new THREE.Vector3(dx,dy+1.1-m.alto*.85+dist*.12,dz).normalize();
      dir.x+=(Math.random()-.5)*.06;dir.z+=(Math.random()-.5)*.06;
      dispararFlecha(eye,dir.normalize(),30,{dueno:'mob',duenoMob:m,dano:1});sonar('arco',m.pos,.8);
    }
  }else if(persigue&&def.ia==='creeper'){
    mover(m,dx,dz,def.vel);
    const cerca=dist3<3&&hayLineaVision(eye,ojoJ);
    if(cerca||m.mecha>0&&dist3<7){if(m.mecha===0)sonar('creeper',m.pos);m.mecha+=dt;m.mover=false;}
    else m.mecha=Math.max(0,m.mecha-dt);
    if(m.mecha>=1.5){explosion(m.pos.x,m.pos.y+.8,m.pos.z,3,{fuente:m});quitarMob(m);return;}
  }else if(persigue&&def.ia==='ghast'){
    const obj=new THREE.Vector3(j.pos.x,j.pos.y+8,j.pos.z);
    if(dist>16){const v=obj.clone().sub(m.pos).normalize().multiplyScalar(def.vel);m.vel.lerp(v,dt);}
    else m.vel.multiplyScalar(Math.pow(.3,dt));
    m.yawObj=Math.atan2(dx,dz);
    if(m.cd<=0&&hayLineaVision(eye,ojoJ)){m.cd=3;sonar('ghast',m.pos);
      const dir=new THREE.Vector3(dx,dy+1-m.alto*.6,dz).normalize();
      dispararBola('bolaGhast',new THREE.Vector3(m.pos.x+dir.x*2.5,m.pos.y+2,m.pos.z+dir.z*2.5),dir,14,{dueno:'mob',duenoMob:m});}
  }else if(def.ia==='ghast'){
    m.t-=dt;if(m.t<=0){m.t=3+Math.random()*4;m.objetivo=new THREE.Vector3(m.origen.x+(Math.random()-.5)*30,m.origen.y+(Math.random()-.5)*10,m.origen.z+(Math.random()-.5)*30);}
    if(m.objetivo){const v=m.objetivo.clone().sub(m.pos);if(v.length()>1)m.vel.lerp(v.normalize().multiplyScalar(def.vel),dt);m.yawObj=Math.atan2(v.x,v.z);}
  }else if(persigue&&def.ia==='blaze'){
    const obj=j.pos.y+2.5-m.pos.y;
    m.vel.y+=(clamp(obj,-2,2)-m.vel.y)*dt*2;
    if(dist>8)mover(m,dx,dz,def.vel);else m.mover=false;
    m.yawObj=Math.atan2(dx,dz);
    m.ataqueT-=dt;
    if(m.ataqueT<=0&&hayLineaVision(eye,ojoJ)&&dist3<40){m.ataqueT=5;m.rafaga=3;}
    if(m.rafaga>0&&m.cd<=0){m.rafaga--;m.cd=.35;sonar('blaze',m.pos,.6);
      const dir=new THREE.Vector3(dx+(Math.random()-.5)*dist*.1,dy+1-m.alto*.8,dz+(Math.random()-.5)*dist*.1).normalize();
      dispararBola('bolaFuego',eye.clone().addScaledVector(dir,.6),dir,16,{dueno:'mob',duenoMob:m});}
  }else if(def.ia==='cubo'){
    m.mover=false;
    if(m.suelo){m.vel.x*=.5;m.vel.z*=.5;
      if(m.cd<=0){m.cd=.8+Math.random()*1.4;
        let ang=Math.random()*Math.PI*2;if(persigue)ang=Math.atan2(dx,dz);
        m.yawObj=ang;const f=persigue?3.4:1.6;m.vel.x=Math.sin(ang)*f;m.vel.z=Math.cos(ang)*f;m.vel.y=5+m.tam*1.2;sonar('slime',m.pos,.5);}}
    const dano=def.dano[m.tam];
    if(persigue&&dano>0&&dist<m.ancho+.55&&Math.abs(dy)<m.alto&&(m.ataqueT-=0)<=0&&m.golpeT<=0){m.golpeT=1;danarJugador(dano,'mob',{x:dx/(dist||1),z:dz/(dist||1)});}
  }else if(def.ia==='golem'){
    let obj=null,dmin=18;
    if(m.enfadado>0&&objetivoValido())obj={pos:jugador.pos,jugador:true};
    else for(const o of mobs)if(o.def.tipo==='hostil'){const d=o.pos.distanceTo(m.pos);if(d<dmin){dmin=d;obj=o;}}
    if(obj){const ox=obj.pos.x-m.pos.x,oz=obj.pos.z-m.pos.z,d=Math.hypot(ox,oz);
      mover(m,d>1.6?ox:0,d>1.6?oz:0,def.vel*1.3);if(d<=1.6)m.yawObj=Math.atan2(ox,oz);
      if(d<2.2&&m.cd<=0){m.cd=1.2;m.golpeT=.35;sonar('golpe',m.pos);
        if(obj.jugador){danarJugador(azar(7,21),'mob',{x:ox/(d||1),z:oz/(d||1)});jugador.vel.y=9;}
        else{herirMob(obj,azar(7,21),{x:ox/(d||1),z:oz/(d||1)},'golem');obj.vel.y=9;}}}
    else{const ox=m.origen.x-m.pos.x,oz=m.origen.z-m.pos.z;m.t-=dt;
      if(m.t<=0){m.t=3+Math.random()*6;if(Math.hypot(ox,oz)>16){m.mover=true;m.yawObj=Math.atan2(ox,oz);}else{m.mover=Math.random()<.4;m.yawObj=Math.random()*Math.PI*2;}}}
  }else if(IA_EXTRA[def.ia]){
    if(IA_EXTRA[def.ia](m,dt,{dx,dz,dy,dist,dist3,persigue,eye,ojoJ})===false)return;
  }else if(def.ia==='aldeano'){
    let zombi=null,dz2=8;
    for(const o of mobs)if(o.tipo==='zombi'){const d=o.pos.distanceTo(m.pos);if(d<dz2){dz2=d;zombi=o;}}
    if(zombi){mover(m,m.pos.x-zombi.pos.x,m.pos.z-zombi.pos.z,def.vel*1.8);}
    else if(m.huir>0){m.huir-=dt;mover(m,-dx,-dz,def.vel*1.8);}
    else if(ui&&ui.aldeano===m){m.mover=false;m.yawObj=Math.atan2(dx,dz);}
    else{const ox=m.origen.x-m.pos.x,oz=m.origen.z-m.pos.z;
      m.t-=dt;if(m.t<=0){m.t=2+Math.random()*5;
        if(Math.hypot(ox,oz)>14){m.mover=true;m.yawObj=Math.atan2(ox,oz);}else{m.mover=Math.random()<.5;m.yawObj=Math.random()*Math.PI*2;}}}
  }else if(persigue){ // cuerpo a cuerpo
    mover(m,dx,dz,def.vel*(m.enfadado>0&&m.tipo==='enderman'?1.4:1));
    if(def.trepa&&m.chocoH)m.vel.y=Math.max(m.vel.y,3);
    if(m.tipo==='arana'&&m.suelo&&dist<3.5&&dist>1.4&&m.cd<=0&&Math.random()<dt*2){m.vel.y=5;m.vel.x+=dx/dist*4;m.vel.z+=dz/dist*4;}
    if(dist<m.ancho+1.1&&Math.abs(dy)<1.8&&m.cd<=0){m.cd=1;m.golpeT=.35;danarJugador(def.dano,'mob',{x:dx/(dist||1),z:dz/(dist||1)});}
    if(m.tipo==='enderman'&&dist>12&&prob(dt*.3))teletransportarMob(m);
  }else if(m.huir>0){m.huir-=dt;mover(m,-dx,-dz,def.vel*2.2);}
  else if(def.tipo==='pasivo'&&objetivoValido2()&&dist<10&&enManoId()===def.comida){mover(m,dist>2?dx:0,dist>2?dz:0,def.vel);if(dist<=2)m.yawObj=Math.atan2(dx,dz);}
  else if(m.amor>0&&(m.pareja=buscarPareja(m))){
    const p=m.pareja, ddx=p.pos.x-m.pos.x, ddz=p.pos.z-m.pos.z, d2=Math.hypot(ddx,ddz);
    mover(m,d2>1?ddx:0,d2>1?ddz:0,def.vel);
    if(d2<1.3&&m.amor>0&&p.amor>0){m.amor=p.amor=0;m.cria=p.cria=300;crearMob(m.tipo,m.pos.x,m.pos.y+.2,m.pos.z,{bebe:true});
      soltarXP(azar(1,7),m.pos.x,m.pos.y,m.pos.z);emitirParticulas(m.pos.x,m.pos.y+1,m.pos.z,0xff6080,8,1,.8,-1);}
  }else if(!def.vuela){
    m.t-=dt;if(m.t<=0){m.t=2+Math.random()*5;m.mover=Math.random()<.5;m.yawObj=Math.random()*Math.PI*2;
      if(m.tipo==='enderman'&&prob(.15))teletransportarMob(m);}
  }else if(def.ia==='blaze'){m.vel.y*=Math.pow(.5,dt);m.mover=false;}
  // Giro y movimiento
  const giro=((m.yawObj-m.yaw+Math.PI*3)%(Math.PI*2))-Math.PI; m.yaw+=giro*Math.min(1,dt*8);
  const vel=m.velObj||def.vel;
  const vx=m.mover?Math.sin(m.yawObj)*vel:0, vz=m.mover?Math.cos(m.yawObj)*vel:0;
  const bloqueAqui=getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+.2),Math.floor(m.pos.z));
  const enAgua=esAgua(bloqueAqui), enLava=esLava(bloqueAqui);
  if(!def.vuela||def.ia==='blaze'){
    const k=Math.min(1,dt*(m.suelo?10:(m.mover&&m.flash<=0?6:2))); m.vel.x+=(vx-m.vel.x)*k; m.vel.z+=(vz-m.vel.z)*k;
  }
  if(!def.vuela){
    if(enAgua||enLava){m.vel.y=Math.min(m.vel.y+28*dt,2);m.vel.x*=.9;m.vel.z*=.9;}
    else{m.vel.y=Math.max(-50,m.vel.y-30*dt);if(def.planea&&m.vel.y<-2)m.vel.y=-2;}
  }
  pasoFisico(m,dt);
  if(m.chocoH&&m.suelo&&m.mover&&!def.vuela){m.vel.y=8.2;m.vel.x=vx;m.vel.z=vz;}
  // Fuego, lava, agua y sol
  m.fuegoT-=dt;
  if(m.fuegoT<=0){m.fuegoT=1;
    if(def.quemaSol&&sol>.15&&!enAgua&&dim.cielo&&expuestoAlCielo(m))m.fuego=Math.max(m.fuego,8);
    if(m.fuego>0){herirMob(m,1,null,'fuego');if(m.muerto)return;}
    if(def.odiaAgua&&enAgua){herirMob(m,1,null,'agua');if(m.muerto)return;if(m.tipo==='enderman')teletransportarMob(m);}
  }
  if(enLava&&!def.inmuneFuego){m.fuego=15;herirMob(m,4,null,'lava');if(m.muerto)return;}
  if(enAgua)m.fuego=0;
  if(m.fuego>0){m.fuego-=dt;if(Math.random()<dt*12)emitirParticulas(m.pos.x,m.pos.y+Math.random()*m.alto,m.pos.z,0xff8020,1,.5,.4,-3);}
  if(m.pos.y<-20){quitarMob(m);return;}
  // Sonidos
  m.sonidoT-=dt; if(m.sonidoT<=0){m.sonidoT=6+Math.random()*12;if(dist3<16)sonar(def.sonido,m.pos,.8);}
  // Animación
  const sp=Math.hypot(m.vel.x,m.vel.z); m.fase+=sp*dt*3.2;
  const a=Math.sin(m.fase)*Math.min(1,sp)*.7;
  for(const p of m.piernas){if(p.userData.pata)p.rotation.y=a*.5*p.userData.s;else p.rotation.x=m.tipo==='ghast'?Math.sin(tiempoJuego*2+p.userData.s)*.2:a*p.userData.s;}
  const brazosArriba=m.tipo==='zombi'||m.tipo==='piglin'&&m.enfadado>0||m.tipo==='esqueleto'&&persigue||m.tipo==='enderman'&&m.enfadado>0;
  m.golpeT=Math.max(0,m.golpeT-dt);
  const golpe=Math.sin(Math.min(1,m.golpeT/.35)*Math.PI)*.9;
  for(const b of m.brazos){if(m.tipo==='gallina')b.rotation.z=b.userData.s*(m.suelo?0:Math.sin(tiempoJuego*30)*.6);
    else b.rotation.x=(brazosArriba?-Math.PI/2:0)+a*.3*b.userData.s-golpe;}
  // La cabeza mira al jugador cuando está cerca
  const cab=m.extra.cabeza;
  if(cab&&m.tipo!=='ghast'&&m.tipo!=='blaze'){
    let ry=0,rx=0;
    if(dist3<10&&estado!=='muerto'&&!(m.huir>0)){const rel=((Math.atan2(dx,dz)-m.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
      ry=clamp(rel,-1.1,1.1);rx=clamp(-Math.atan2(dy+1.5-m.alto*.9,dist),-.6,.6);}
    cab.rotation.y+=(ry-cab.rotation.y)*Math.min(1,dt*6); cab.rotation.x+=(rx-cab.rotation.x)*Math.min(1,dt*6);
  }
  if(m.extra.varas){m.extra.varas.forEach((r,i)=>{const ang=tiempoJuego*(i<4?2:i<8?-1.5:1.2)+i*Math.PI/2,rad=i<4?.7:i<8?.55:.4,h=i<4?1.2:i<8?.8:.4;
    r.position.set(Math.cos(ang)*rad,h+Math.sin(tiempoJuego*3+i)*.1,Math.sin(ang)*rad);});}
  if(m.tipo==='creeper'){const s=1+m.mecha*.12;m.grupo.scale.set(s,1+m.mecha*.05,s);}
  if(def.ia==='cubo'){const sq=m.suelo?1-Math.min(.25,Math.max(0,m.cd-.6)*.2):1.15;m.grupo.scale.set(2-sq,sq,2-sq);}
  m.grupo.position.copy(m.pos);
  if(m.suelo&&m.piernas.length===2&&sp>.3)m.grupo.position.y+=Math.abs(Math.sin(m.fase))*.05;
  if(def.ia==='ghast'||m.tipo==='blaze')m.grupo.position.y+=Math.sin(tiempoJuego*2+m.origen.x)*.1;
  m.grupo.rotation.y=m.yaw;
  // Color: luz del entorno, destello rojo al recibir daño y blanco al explotar
  m.luzT-=dt;
  if(m.luzT<=0||m.flash>0||m.mecha>0){
    m.luzT=.3; const l=Math.max(brilloEn(m.pos.x,m.pos.y+m.alto*.6,m.pos.z),m.tipo==='blaze'?1:0);
    if(m.flash>0)m.flash-=dt;
    const rojo=m.flash>0, blanco=m.mecha>0&&Math.floor(m.mecha*6)%2===0;
    m.grupo.traverse(o=>{if(o.isMesh&&o.userData.base){
      if(blanco)o.material.color.setRGB(1.6,1.6,1.6);
      else o.material.color.copy(o.userData.base).multiplyScalar(l);
      o.material.emissive.setRGB(rojo?.5:0,0,0);}});
  }
}
function objetivoValido2(){return estado!=='muerto';}
function buscarPareja(m){let mejor=null,md=8;for(const o of mobs)if(o!==m&&o.tipo===m.tipo&&o.amor>0&&!o.bebe){const d=o.pos.distanceTo(m.pos);if(d<md){md=d;mejor=o;}}return mejor;}
function expuestoAlCielo(m){
  const x=Math.floor(m.pos.x),z=Math.floor(m.pos.z);
  for(let y=Math.floor(m.pos.y+m.alto);y<CY;y++){const b=getBloque(x,y,z);if(b&&OPAC_LUZ[b]>0)return false;}
  return true;
}

/* ---------- Aparición de criaturas ---------- */
let spawnT=0;
function contar(f){let n=0;for(const m of mobs)if(f(m))n++;return n;}
function elegirPeso(lista){const t=lista.reduce((a,e)=>a+e[1],0);let r=Math.random()*t;for(const e of lista){r-=e[1];if(r<=0)return e[0];}return lista[0][0];}
function buscarSuelo(x,y0,z,rango,altoNec){
  for(let y=y0;y>y0-rango&&y>1;y--){
    const s=getBloqueSiCargado(x,y-1,z);if(s<0)return -1;
    if(SOLIDO[s]&&OPACO[s]&&s!==B.lecho){let libre=true;for(let k=0;k<altoNec;k++){const b=getBloque(x,y+k,z);if(b&&(SOLIDO[b]||esLiquido(b))){libre=false;break;}}
      if(libre)return y;}
  }
  return -1;
}
function generarMobs(dt){
  spawnT-=dt; if(spawnT>0)return; spawnT=.5;
  for(let k=0;k<4;k++)intentoAparicion();
}
function intentoAparicion(){
  const j=jugador.pos;
  const ang=Math.random()*Math.PI*2, d=24+Math.random()*24;
  const x=Math.floor(j.x+Math.cos(ang)*d), z=Math.floor(j.z+Math.sin(ang)*d);
  const ch=chunkSiExiste(Math.floor(x/CX),Math.floor(z/CZ)); if(!ch||!ch.malla)return;
  if(dim===DIMS.superficie&&Math.random()<.25){
    for(const al of aldeasCerca(j.x,j.z)){
      if(Math.hypot(al.x-j.x,al.z-j.z)>90)continue;
      const cap=Math.min(10,al.edificios.length+2);
      if(contar(m=>m.tipo==='aldeano'&&Math.hypot(m.pos.x-al.x,m.pos.z-al.z)<60)>=cap)continue;
      const e=al.edificios[Math.floor(Math.random()*al.edificios.length)]||{x0:al.x+2,z0:al.z+2,w:1,p:1};
      const [ddx,ddz]=DIRF[e.puerta||0];
      const x=Math.floor(e.x0+e.w/2)+ddx*(Math.floor(Math.max(e.w,e.p)/2)+2),z=Math.floor(e.z0+e.p/2)+ddz*(Math.floor(Math.max(e.w,e.p)/2)+2);
      const ch=chunkSiExiste(Math.floor(x/CX),Math.floor(z/CZ)); if(!ch||!ch.malla)continue;
      let y=CY-1;while(y>0&&(!SOLIDO[getBloque(x,y,z)]||esHojas(getBloque(x,y,z))))y--;
      if(getBloque(x,y+1,z)&&!REEMPL[getBloque(x,y+1,z)])continue;
      if(al.edificios.length>=3&&contar(m=>m.tipo==='golem'&&Math.hypot(m.pos.x-al.x,m.pos.z-al.z)<60)<1&&Math.random()<.3){const g=crearMob('golem',x+.5,y+1,z+.5);g.origen.set(al.x,y+1,al.z);return;}
      const prof=Object.keys(PROFESIONES)[Math.floor(Math.random()*4)];
      const m=crearMob('aldeano',x+.5,y+1,z+.5,{profesion:prof,ofertas:ofertasProfesion(prof,Math.random)});
      m.origen.set(al.x,y+1,al.z);
      return;
    }
  }
  if(dim===DIMS.superficie&&aparicionExtra(x,z))return;
  if(dim===DIMS.superficie){
    const pasivos=contar(m=>m.def.tipo==='pasivo'&&m.tipo!=='aldeano'), hostiles=contar(m=>m.def.tipo!=='pasivo');
    if(Math.random()<.08&&pasivos<10){
      let y=CY-1;while(y>0&&!getBloque(x,y,z))y--;
      if(getBloque(x,y,z)!==B.cesped||(luzEn(x,y+1,z)>>4)<9)return;
      const tipo=elegirPeso([['cerdo',25],['vaca',20],['oveja',25],['gallina',20]]);
      const n=azar(2,4);for(let k=0;k<n;k++){const ox=x+azar(-2,2),oz=z+azar(-2,2),oy=buscarSuelo(ox,y+3,oz,6,2);if(oy>0&&getBloque(ox,oy-1,oz)===B.cesped)crearMob(tipo,ox+.5,oy,oz+.5);}
      return;
    }
    if(hostiles>=20)return;
    const y=buscarSuelo(x,clamp(Math.floor(j.y+(Math.random()-.4)*40),6,CY-4),z,20,3);
    if(y<0||(y<OY&&esDeepDark(x,z)))return;
    const l=luzEn(x,y,z), cieloEf=(l>>4)-Math.round((1-factorCielo)*11/0.8);
    if((l&15)>0||Math.max(0,cieloEf)>7)return;
    if(Math.hypot(x-j.x,y-j.y,z-j.z)<24)return;
    const bioSp=infoColumna(x,z).bioma;
    const pesos=[['zombi',95],['esqueleto',100],['creeper',100],['arana',100],['enderman',10]];
    if(bioSp===BIOMA.pantano||y<OY+40)pesos.push(['slime',bioSp===BIOMA.pantano?80:30]);
    const tipo=elegirPeso(pesos);
    if(tipo==='slime'){crearMob('slime',x+.5,y,z+.5,{tam:azar(0,2)});return;}
    if(tipo==='enderman'&&getBloque(x,y+2,z))return;
    crearMob(tipo,x+.5,y,z+.5);
  }else if(dim===DIMS.nether){
    if(mobs.length>=18)return;
    const bn=biomaNether(x,z);
    if(bn!==BN.desierto&&Math.random()<.7){
      const y2=buscarSuelo(x,clamp(Math.floor(j.y+(Math.random()-.4)*40),OY+6,CY-8),z,24,3); if(y2<0)return;
      const tipo=bn===BN.carmesi?(Math.random()<.6?'hoglin':'piglin'):bn===BN.distorsionado?'enderman':bn===BN.valle?(Math.random()<.7?'esqueleto':'ghast'):(Math.random()<.8?'cuboMagma':'ghast');
      if(tipo==='ghast'){if(contar(m=>m.tipo==='ghast')<3)crearMob('ghast',x+.5,y2+6,z+.5);return;}
      if(contar(m=>m.tipo===tipo)>=8)return;
      crearMob(tipo,x+.5,y2,z+.5,{tam:azar(0,2)});return;
    }
    const y=buscarSuelo(x,clamp(Math.floor(j.y+(Math.random()-.4)*40),OY+6,CY-8),z,24,3); if(y<0)return;
    const enFort=fortalezasCerca(x,z).some(f=>Math.abs(x-f.x)<50&&Math.abs(z-f.z)<50&&Math.abs(y-f.y)<12);
    if(enFort&&contar(m=>m.tipo==='blaze')<6&&prob(.5)){crearMob('blaze',x+.5,y+.5,z+.5);return;}
    if(prob(.15)&&contar(m=>m.tipo==='ghast')<3){
      const gy=y+6;let libre=true;for(const [a,b,c] of [[0,0,0],[2,2,2],[-2,2,-2],[2,4,-2],[-2,4,2],[0,5,0]])if(getBloque(x+a,gy+b,z+c)){libre=false;break;}
      if(libre)crearMob('ghast',x+.5,gy,z+.5);return;}
    if(contar(m=>m.tipo==='piglin')<12){const n=azar(2,4);for(let k=0;k<n;k++){const oy=buscarSuelo(x+k,y+2,z,6,2);if(oy>0)crearMob('piglin',x+k+.5,oy,z+.5);}}
  }else if(dim===DIMS.end){
    if(contar(m=>m.tipo==='enderman')>=12)return;
    const y=buscarSuelo(x,END_TOP+10,z,40,3); if(y<0)return;
    crearMob('enderman',x+.5,y,z+.5);
  }
}
// Generadores de criaturas (mazmorras y fortalezas)
const temporizadoresGen=new Map();
function actualizarGeneradores(dt){
  const j=jugador.pos, pcx=Math.floor(j.x/CX), pcz=Math.floor(j.z/CZ);
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
    const ch=chunkSiExiste(pcx+a,pcz+b); if(!ch)continue;
    for(const [lx,y,lz] of ch.generadores){
      const x=ch.cx*CX+lx,z=ch.cz*CZ+lz;
      if(ch.datos[idx(lx,y,lz)]!==B.generador)continue;
      if(Math.hypot(x+.5-j.x,y-j.y,z+.5-j.z)>16)continue;
      const k=clavePos(x,y,z); let t=temporizadoresGen.get(k)??(5+Math.random()*10);
      t-=dt; if(Math.random()<dt*8)emitirParticulas(x+.5,y+.5,z+.5,0xff6020,1,.4,.4,-1);
      if(t<=0){
        t=10+Math.random()*30;
        const tipo=dim===DIMS.nether?'blaze':['zombi','esqueleto','arana'][Math.floor(hash3(x,y,z,semilla)*3)];
        if(contar(m=>m.tipo===tipo&&m.pos.distanceTo(new THREE.Vector3(x,y,z))<9)<6){
          const n=azar(1,4);
          for(let q=0;q<n;q++){const ox=x+azar(-3,3),oz=z+azar(-3,3),oy=buscarSuelo(ox,y+2,oz,5,2);
            if(oy>0){crearMob(tipo,ox+.5,oy+(tipo==='blaze'?.5:0),oz+.5,{generador:k});emitirParticulas(ox+.5,oy+.5,oz+.5,0xffffff,6,1,.5,0);}}
        }
      }
      temporizadoresGen.set(k,t);
    }
  }
}
function despawnMobs(){
  const j=jugador.pos;
  for(const m of mobs.slice()){const d=m.pos.distanceTo(j);
    if(m===jugador.montura||m.domado)continue;
    if((m.def.tipo==='hostil'&&d>80)||d>(m.tipo==='aldeano'||m.tipo==='golem'?110:140))quitarMob(m);}
}
