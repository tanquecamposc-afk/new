"use strict";
/* =========================================================
   Criaturas (2): ajolotes, abejas, loros, pandas, llamas,
   tortugas, delfines, bacalaos, salmones, peces tropicales,
   peces globo, champiñacas, ocelotes, striders, sniffers,
   armadillos, calamares brillantes, burros, mulas, esqueletos
   errantes, momias, esqueletos wither, piglins brutos,
   evocadores con vex, devastadores, phantoms, lepismas,
   endermitas, gólems de nieve (y de hierro) que se construyen,
   allays y aldeanos zombi que se pueden curar.
   ========================================================= */
Object.assign(SND,{
  zumbido:v=>tonoSnd(220,230,.3,'sawtooth',.012*v),
  loro:v=>{tonoSnd(1200,1600,.08,'square',.03*v);tonoSnd(1500,1100,.08,'square',.03*v,.1);},
  panda:v=>tonoSnd(300,240,.25,'triangle',.05*v),
  llama:v=>tonoSnd(600,400,.3,'sawtooth',.04*v),
  delfin:v=>{tonoSnd(1800,2400,.1,'sine',.04*v);tonoSnd(2200,1600,.1,'sine',.04*v,.12);},
  strider:v=>tonoSnd(180,120,.3,'square',.04*v),
  sniffer:v=>{ruidoSnd(.3,500,.12*v,'bandpass');tonoSnd(140,100,.4,'sine',.05*v);},
  evocador:v=>{tonoSnd(300,600,.5,'sawtooth',.06*v);tonoSnd(450,900,.5,'triangle',.04*v,.1);},
  vex:v=>tonoSnd(1500,2200,.15,'square',.03*v),
  devastador:v=>{tonoSnd(90,60,.6,'sawtooth',.1*v);ruidoSnd(.4,300,.2*v);},
  phantom:v=>{tonoSnd(500,250,.5,'sawtooth',.05*v);tonoSnd(700,350,.4,'square',.02*v,.1);},
  lepisma:v=>ruidoSnd(.1,5000,.06*v,'highpass'),
  allay:v=>{[1000,1250,1500].forEach((f,i)=>tonoSnd(f,f*1.05,.12,'sine',.04*v,i*.08));},
  colmillos:v=>{ruidoSnd(.2,1400,.25*v,'bandpass');tonoSnd(200,90,.2,'square',.05*v);},
});

/* ---------- Definiciones ---------- */
const COL_AJOLOTE=[[0xf2a6c8,0xd8568a],[0xf0c040,0xd08a20],[0xa8e8f0,0x5ab8d0],[0x8a5a3a,0x5a3a20],[0x4a6ae0,0x2a3ab0]];
const COL_LORO=[[0xe02020,0x2040e0],[0x2050e0,0xe8d020],[0x40c030,0x2080e0],[0x30d0e0,0xe8e020],[0xb0b0b0,0xe8e8e8]];
const COL_LLAMA=[0xe8d8b8,0xf4f4f0,0x8a6a4a,0x9a9a9a];
const peces=(col,vida,suelta)=>({vida,ancho:.25,alto:.4,vel:2.2,tipo:'pasivo',ia:'pez',vuela:true,xp:[1,3],suelta});
Object.assign(DEF_MOB,{
  ajolote:{vida:14,ancho:.35,alto:.42,vel:1.6,tipo:'pasivo',ia:'ajolote',xp:[1,3],suelta:()=>[]},
  abeja:{vida:10,ancho:.3,alto:.6,vel:2.6,tipo:'neutral',ia:'abeja',vuela:true,dano:2,xp:[1,3],sonido:'zumbido',suelta:()=>[]},
  loro:{vida:6,ancho:.25,alto:.9,vel:2.4,tipo:'pasivo',ia:'loro',vuela:true,xp:[1,3],sonido:'loro',suelta:b=>[[I.pluma,azar(1,2+b)]]},
  panda:{vida:20,ancho:.65,alto:1.25,vel:1,tipo:'neutral',ia:'panda',dano:6,xp:[1,3],sonido:'panda',comida:1594,suelta:()=>[[1594,azar(0,2)]]},
  llama:{vida:22,ancho:.45,alto:1.87,vel:1.3,tipo:'pasivo',ia:'llama',xp:[1,3],sonido:'llama',comida:I.trigo,suelta:b=>[[I.cuero,azar(0,2+b)]]},
  tortuga:{vida:30,ancho:.6,alto:.4,vel:.8,tipo:'pasivo',xp:[1,3],comida:1596,suelta:()=>[[1596,azar(0,2)],[664,prob(.08)?1:0]]},
  delfin:{vida:10,ancho:.45,alto:.6,vel:4,tipo:'pasivo',ia:'pez',vuela:true,xp:[1,3],sonido:'delfin',suelta:()=>[[614,azar(0,1)]]},
  bacalao:peces(0,3,()=>[[614,1],[I.harinaHueso,prob(.05)?1:0]]),
  salmon:peces(0,3,()=>[[616,1],[I.harinaHueso,prob(.05)?1:0]]),
  pezTropical:peces(0,3,()=>[[618,1]]),
  pezGlobo:{...peces(0,3,()=>[[619,1]]),ia:'pezGlobo'},
  ocelote:{vida:10,ancho:.3,alto:.7,vel:3.4,tipo:'pasivo',ia:'ocelote',xp:[1,3],sonido:'gato',suelta:()=>[]},
  strider:{vida:20,ancho:.45,alto:1.7,vel:1.4,tipo:'pasivo',ia:'strider',inmuneFuego:true,xp:[1,3],sonido:'strider',dims:['nether'],suelta:b=>[[I.cuerda,azar(2,5)]]},
  sniffer:{vida:14,ancho:.95,alto:1.75,vel:.8,tipo:'pasivo',ia:'sniffer',xp:[1,3],sonido:'sniffer',comida:I.semillas,suelta:()=>[]},
  armadillo:{vida:12,ancho:.35,alto:.65,vel:1.2,tipo:'pasivo',ia:'armadillo',xp:[1,3],suelta:()=>[[678,prob(.3)?1:0]]},
  devastador:{vida:100,ancho:.95,alto:2.2,vel:2.8,tipo:'hostil',dano:12,xp:[20,20],sonido:'devastador',suelta:()=>[[598,1]]},
  phantom:{vida:20,ancho:.45,alto:.5,vel:6,tipo:'hostil',ia:'phantom',vuela:true,dano:4,quemaSol:true,xp:[5,5],sonido:'phantom',suelta:b=>[[665,azar(0,1+b)]]},
  lepisma:{vida:8,ancho:.2,alto:.3,vel:3,tipo:'hostil',dano:1,xp:[5,5],sonido:'lepisma',suelta:()=>[]},
  endermita:{vida:8,ancho:.2,alto:.3,vel:3,tipo:'hostil',dano:2,xp:[3,3],sonido:'lepisma',suelta:()=>[]},
  golemNieve:{vida:4,ancho:.35,alto:1.9,vel:1.6,tipo:'pasivo',ia:'golemNieve',xp:[0,0],suelta:()=>[[666,azar(0,15)]]},
  allay:{vida:20,ancho:.3,alto:.6,vel:3,tipo:'pasivo',ia:'allay',vuela:true,xp:[0,0],sonido:'allay',suelta:()=>[]},
  vex:{vida:14,ancho:.2,alto:.8,vel:5,tipo:'hostil',ia:'vex',vuela:true,dano:9,xp:[3,3],sonido:'vex',suelta:()=>[]},
  evocador:{vida:24,ancho:.3,alto:1.95,vel:2.6,tipo:'hostil',ia:'evocador',xp:[10,10],sonido:'evocador',suelta:b=>[[658,1],[I.esmerald||216,azar(0,1+b)]]},
});
Object.assign(NOMBRE_MOB,{ajolote:'Ajolote',abeja:'Abeja',loro:'Loro',panda:'Panda',llama:'Llama',tortuga:'Tortuga',delfin:'Delfín',bacalao:'Bacalao',
  salmon:'Salmón',pezTropical:'Pez tropical',pezGlobo:'Pez globo',ocelote:'Ocelote',strider:'Strider',sniffer:'Sniffer',armadillo:'Armadillo',
  devastador:'Devastador',phantom:'Phantom',lepisma:'Lepisma',endermita:'Endermita',golemNieve:'Gólem de nieve',allay:'Allay',vex:'Vex',evocador:'Evocador',
  champinaca:'Champiñaca',calamarBrillante:'Calamar brillante',burro:'Burro',mula:'Mula',esqueletoErrante:'Esqueleto errante',momia:'Momia',
  esqueletoWither:'Esqueleto wither',piglinBruto:'Piglin bruto',aldeanoZombi:'Aldeano zombi'});

/* ---------- Variantes que reutilizan un modelo (se recolorean) ---------- */
const escalaColor=(hex,f,tinte)=>{const c=new THREE.Color(hex);if(tinte)c.lerp(new THREE.Color(tinte[0]),tinte[1]);return c.multiplyScalar(f).getHex();};
const VARIANTES={
  esqueletoErrante:{base:'esqueleto',color:h=>escalaColor(h,.95,[0x8aa0a4,.35]),def:()=>({...DEF_MOB.esqueleto,especie:'errante'})},
  momia:{base:'zombi',mapa:{0x5e9c4a:0xc0a878,0x2f8f9d:0x8a7a50,0x3a3f8f:0x6a5a40},def:()=>({...DEF_MOB.zombi,quemaSol:false,especie:'momia'})},
  aldeanoZombi:{base:'zombi',mapa:{0x2f8f9d:0x6a4a30,0x3a3f8f:0x4a3020},extra:(m)=>{const n=parte(.12,.24,.1,0x4e8a3e);n.position.set(0,1.66,.28);m.grupo.add(n);},def:()=>({...DEF_MOB.zombi,especie:'aldeanoZombi'})},
  esqueletoWither:{base:'esqueleto',color:h=>escalaColor(h,.18),escala:1.2,sinArco:true,
    extra:(m)=>{const e=parte(.06,.8,.06,0x707070);e.position.set(.36,1.1,.4);e.rotation.x=.5;m.grupo.add(e);},
    def:()=>({...DEF_MOB.zombi,vida:20,dano:8,vel:2.6,inmuneFuego:true,quemaSol:false,especie:'wither',ia:undefined,alto:2.4,
      suelta:b=>[[I.carbon,prob(.33)?azar(1,1+b):0],[I.hueso,azar(0,2+b)]]})},
  piglinBruto:{base:'piglin',color:h=>h===0x9a6a50?0x2a2a2a:h===0x6a4a30?0x1a1a1a:h,
    extra:(m)=>{const h=parte(.05,.6,.05,0x6a4a2a);h.position.set(.36,1.0,.35);m.grupo.add(h);const f=parte(.05,.25,.22,0xe0c040);f.position.set(.36,1.25,.45);m.grupo.add(f);},
    def:()=>({...DEF_MOB.piglin,tipo:'hostil',vida:50,dano:7,vel:2.8,especie:'bruto',suelta:()=>[[I.lingoteOro,prob(.08)?1:0]]})},
  champinaca:{base:'vaca',color:h=>h===0xeeeeee?0xe8e8e8:escalaColor(h,1,[0xa01818,.85]),
    extra:(m)=>{for(const [x,y,z] of [[-.15,1.2,.1],[.2,1.2,-.25],[0,1.5,.68]]){const t=parte(.08,.14,.08,0xe8e0d0);t.position.set(x,y,z);m.grupo.add(t);
      const s=parte(.26,.12,.26,0xd02020);s.position.set(x,y+.12,z);m.grupo.add(s);}},
    def:()=>({...DEF_MOB.vaca,especie:'champinaca'})},
  calamarBrillante:{base:'calamar',color:h=>escalaColor(h,1.6,[0x2aa8a8,.8]),brilla:true,def:()=>({...DEF_MOB.calamar,suelta:b=>[[667,azar(1,3+b)]]})},
  burro:{base:'caballo',mismoTipo:true,opc:{variante:6},extra:m=>orejasLargas(m,0x6a6a70)},
  mula:{base:'caballo',mismoTipo:true,opc:{variante:2},extra:m=>orejasLargas(m,0x4a2e1a)},
  evocador:{base:'vindicador',color:h=>h===0x2a3a3c||h===0x1f2d2f?0x1c1c22:h,sinHacha:true,
    extra:m=>{const b=parte(.56,.08,.3,0xd0b040);b.position.set(0,1.45,0);m.grupo.add(b);},def:()=>DEF_MOB.evocador},
};
function orejasLargas(m,col){for(const x of [-.1,.1]){const o=parte(.08,.3,.06,col);o.position.set(x,2.25,.72);m.grupo.add(o);}}
for(const t of Object.keys(VARIANTES))if(!DEF_MOB[t])DEF_MOB[t]={...DEF_MOB[VARIANTES[t].base]};
function recolorear(m,v){
  m.grupo.traverse(o=>{if(!o.isMesh||!o.userData.base)return;const h=o.userData.base.getHex();
    let n=h; if(v.mapa&&v.mapa[h]!==undefined)n=v.mapa[h]; else if(v.color)n=v.color(h);
    if(n!==h){o.userData.base=new THREE.Color(n);o.material.color.setHex(n);}
    if(v.brilla&&o.material.emissive){o.material.emissive.copy(o.userData.base).multiplyScalar(.35);}});
}

/* ---------- Modelos nuevos ---------- */
Object.assign(MODELOS_EXTRA,{
  ajolote({pon,parte,cuadrupedo,extra,opc}){
    const [c,b]=COL_AJOLOTE[opc.variante|0]||COL_AJOLOTE[0];
    cuadrupedo(.14,.2,.12,c,.08);
    pon(parte(.3,.2,.62,c,false,'piel'),0,.2,0);
    extra.cabeza=pon(parte(.42,.26,.34,c),0,.24,.45);
    for(const s of [-1,1])for(let k=0;k<3;k++){const q=pon(parte(.05,.18,.05,b),s*(.24),.28+k*.08,.4);q.rotation.z=s*.6;}
    pon(parte(.05,.05,.02,0x111111,false,null),-.12,.28,.62); pon(parte(.05,.05,.02,0x111111,false,null),.12,.28,.62);
    const cola=pon(parte(.05,.2,.46,c),0,.22,-.5); extra.cola=cola;
  },
  abeja({pon,parte,extra}){
    pon(parte(.36,.34,.52,0xe8c030),0,.4,0);
    for(const z of [-.12,.08])pon(parte(.37,.35,.08,0x3a2410),0,.4,z);
    extra.cabeza=pon(parte(.3,.3,.08,0xe8c030),0,.42,.28);
    pon(parte(.07,.1,.02,0x111111,false,null),-.1,.44,.325); pon(parte(.07,.1,.02,0x111111,false,null),.1,.44,.325);
    pon(parte(.03,.03,.1,0x222222,false,null),0,.36,-.3);
    extra.alas=[-1,1].map(s=>{const w=new THREE.Group();const a=new THREE.Mesh(new THREE.BoxGeometry(.3,.02,.24),new THREE.MeshLambertMaterial({color:0xddeeff,transparent:true,opacity:.6}));a.position.x=s*.15;w.add(a);w.userData.s=s;pon(w,s*.06,.6,0);return w;});
  },
  loro({pon,parte,extra,opc}){
    const [c,a]=COL_LORO[opc.variante|0]||COL_LORO[0];
    pon(parte(.22,.36,.24,c),0,.42,0); extra.cabeza=pon(parte(.2,.2,.2,c),0,.7,.04);
    pon(parte(.06,.1,.08,0x303030),0,.66,.16); pon(parte(.04,.04,.02,0x111111,false,null),-.09,.73,.1); pon(parte(.04,.04,.02,0x111111,false,null),.09,.73,.1);
    pon(parte(.1,.3,.06,a),0,.2,-.14); pon(parte(.1,.08,.02,0xe8d020),0,.8,-.02);
    extra.alas=[-1,1].map(s=>{const w=pon(parte(.04,.3,.2,a,true),s*.13,.56,0);w.userData.s=s;return w;});
  },
  panda({pon,parte,cuadrupedo,extra}){
    cuadrupedo(.3,.45,.45,0x1a1a1a,.3);
    pon(parte(.9,.8,1.3,0xf0f0f0,false,'pelo'),0,.95,0); pon(parte(.92,.4,.5,0x1a1a1a,false,'pelo'),0,.95,.3);
    extra.cabeza=pon(parte(.7,.6,.55,0xf0f0f0,false,'pelo'),0,1.05,.85);
    for(const x of [-.18,.18]){pon(parte(.18,.16,.02,0x1a1a1a,false,null),x,1.1,1.13);pon(parte(.06,.06,.02,0xffffff,false,null),x,1.1,1.14);pon(parte(.16,.14,.1,0x1a1a1a),x*1.6,1.4,.8);}
    pon(parte(.16,.1,.08,0x1a1a1a),0,.94,1.13);
  },
  llama({pon,parte,cuadrupedo,extra,opc}){
    const c=COL_LLAMA[opc.variante|0]||COL_LLAMA[0];
    cuadrupedo(.18,.3,.8,c,.2);
    pon(parte(.6,.6,1.0,c,false,'pelo'),0,1.1,-.05);
    const cu=pon(parte(.3,.9,.3,c,false,'pelo'),0,1.75,.4);
    extra.cabeza=pon(parte(.3,.3,.46,c),0,2.25,.5);
    pon(parte(.07,.16,.06,c),-.1,2.46,.42); pon(parte(.07,.16,.06,c),.1,2.46,.42);
    pon(parte(.05,.05,.02,0x111111,false,null),-.1,2.3,.735); pon(parte(.05,.05,.02,0x111111,false,null),.1,2.3,.735);
  },
  tortuga({pon,parte,cuadrupedo,extra}){
    cuadrupedo(.35,.42,.12,0x8ab060,.26);
    pon(parte(1.0,.34,1.1,0x3a7a30),0,.34,0); pon(parte(.84,.1,.94,0x5a9a40),0,.54,0);
    extra.cabeza=pon(parte(.3,.24,.3,0x9ac070),0,.32,.65);
    pon(parte(.04,.04,.02,0x111111,false,null),-.1,.36,.8); pon(parte(.04,.04,.02,0x111111,false,null),.1,.36,.8);
  },
  delfin({pon,parte,extra}){
    pon(parte(.5,.46,1.3,0x8aa0b8),0,.35,0); pon(parte(.46,.18,1.2,0xd8e0e8),0,.16,.02);
    extra.cabeza=pon(parte(.46,.4,.34,0x8aa0b8),0,.36,.78); pon(parte(.2,.14,.34,0x9ab0c4),0,.28,1.08);
    pon(parte(.06,.34,.3,0x7a90a8),0,.66,-.1); const cola=pon(parte(.6,.06,.26,0x7a90a8),0,.36,-.78); extra.cola=cola;
    pon(parte(.05,.05,.02,0x111111,false,null),-.2,.42,.92); pon(parte(.05,.05,.02,0x111111,false,null),.2,.42,.92);
  },
  bacalao({pon,parte,extra}){pon(parte(.22,.3,.56,0xb8a078),0,.2,0);pon(parte(.2,.26,.2,0xa89068),0,.2,.34);extra.cola=pon(parte(.04,.26,.2,0xc8b088),0,.2,-.38);pon(parte(.03,.03,.02,0x111111,false,null),.1,.25,.4);},
  salmon({pon,parte,extra}){pon(parte(.24,.32,.64,0xa03a30),0,.2,0);pon(parte(.25,.1,.5,0x3a6a60),0,.36,0);pon(parte(.2,.26,.2,0x904030),0,.2,.38);extra.cola=pon(parte(.04,.3,.22,0xa03a30),0,.2,-.42);},
  pezTropical({pon,parte,extra,opc}){const c=[0xf07020,0x3070e0,0xe0d030,0xe03080][opc.variante|0]||0xf07020;
    pon(parte(.12,.36,.36,c),0,.25,0);pon(parte(.13,.37,.08,0xfafafa),0,.25,.06);pon(parte(.13,.2,.06,0xfafafa),0,.25,-.1);extra.cola=pon(parte(.03,.3,.14,c),0,.25,-.24);},
  pezGlobo({pon,parte,extra}){extra.cuerpo=pon(parte(.3,.26,.3,0xe0c040),0,.2,0);extra.puas=[];
    for(const [x,y,z] of [[.2,.2,0],[-.2,.2,0],[0,.38,0],[0,.02,0],[0,.2,.2],[0,.2,-.2]]){const p=pon(parte(.06,.06,.06,0xf0f0e0,false,null),x,y,z);p.visible=false;extra.puas.push(p);}
    pon(parte(.04,.04,.02,0x111111,false,null),.08,.24,.16);},
  ocelote(args){MODELOS_EXTRA.gato({...args,opc:{variante:7}});
    for(const [x,y,z] of [[-.08,.5,.1],[.06,.52,-.1],[0,.5,-.24],[.08,.5,.18]])args.pon(args.parte(.06,.03,.08,0x5a3a20,false,null),x,y,z);},
  strider({pon,parte,piernas,extra}){
    [-1,1].forEach(s=>{const p=pon(parte(.18,1.05,.18,0x6a2a38,true),s*.2,1.05,0);p.userData.s=s;piernas.push(p);});
    extra.cabeza=pon(parte(.8,.7,.8,0xa03040,false,'pelo'),0,1.35,0);
    for(let k=0;k<6;k++){const h=pon(parte(.06,.3,.06,0x5a2a2a,false,null),-.3+k*.12,1.82,((k%2)-.5)*.3);h.rotation.z=(k-2.5)*.1;}
    pon(parte(.18,.12,.02,0xf0e0d0,false,null),-.18,1.45,.405); pon(parte(.18,.12,.02,0xf0e0d0,false,null),.18,1.45,.405);
  },
  sniffer({pon,parte,cuadrupedo,extra}){
    cuadrupedo(.45,.65,.5,0x7a2a24,.3);
    pon(parte(1.3,1.0,2.0,0x9a3a30,false,'pelo'),0,1.1,0); pon(parte(1.32,.2,1.9,0x4a8a30,false,'pelo'),0,1.65,0);
    extra.cabeza=pon(parte(.9,.62,.8,0x9a3a30),0,1.0,1.3); pon(parte(.5,.3,.3,0xd09060),0,.84,1.72);
    pon(parte(.1,.1,.02,0x111111,false,null),-.3,1.15,1.705); pon(parte(.1,.1,.02,0x111111,false,null),.3,1.15,1.705);
  },
  armadillo({pon,parte,cuadrupedo,extra}){
    cuadrupedo(.18,.26,.2,0xc89080,.12);
    extra.caparazon=pon(parte(.6,.45,.8,0xb07860),0,.42,0);
    for(let k=0;k<4;k++)pon(parte(.62,.47,.04,0x8a5a48),0,.42,-.3+k*.2);
    extra.cabeza=pon(parte(.24,.28,.3,0xd8a090),0,.42,.5);
    pon(parte(.06,.14,.04,0xd8a090),-.08,.62,.46); pon(parte(.06,.14,.04,0xd8a090),.08,.62,.46);
  },
  devastador({pon,parte,cuadrupedo,extra}){
    cuadrupedo(.42,.62,.95,0x5a5a56,.36);
    pon(parte(1.2,1.1,2.0,0x6a6a66,false,'pelo'),0,1.55,-.05);
    extra.cabeza=pon(parte(.8,.9,.9,0x6a6a66),0,1.75,1.3);
    for(const s of [-1,1]){const c=pon(parte(.14,.5,.14,0xd8d0b8),s*.46,2.2,1.2);c.rotation.z=-s*.5;}
    pon(parte(.5,.2,.2,0x3a3a3a),0,1.45,1.78);
    pon(parte(.12,.1,.02,0x111111,false,null),-.22,1.9,1.755); pon(parte(.12,.1,.02,0x111111,false,null),.22,1.9,1.755);
  },
  phantom({pon,parte,extra}){
    pon(parte(.6,.2,1.0,0x3a4a8a),0,.25,0); extra.cabeza=pon(parte(.5,.2,.4,0x3a4a8a),0,.26,.6);
    pon(parte(.12,.05,.02,0x80ff40,false,null),-.14,.3,.805); pon(parte(.12,.05,.02,0x80ff40,false,null),.14,.3,.805);
    extra.alas=[-1,1].map(s=>{const w=new THREE.Group();const a=parte(1.3,.05,.7,0x4a5a9a);a.position.x=s*.65;w.add(a);w.userData.s=s;pon(w,s*.3,.3,0);return w;});
    extra.cola=pon(parte(.3,.1,.6,0x3a4a8a),0,.25,-.7);
  },
  lepisma({pon,parte,extra}){for(let k=0;k<4;k++)pon(parte(.28-k*.04,.2-k*.03,.16,0x7a7a7a),0,.12,.24-k*.16);extra.cabeza=pon(parte(.22,.16,.12,0x6a6a6a),0,.11,.36);},
  endermita({pon,parte,extra}){for(let k=0;k<4;k++)pon(parte(.26-k*.03,.18,.14,0x2a1a3a),0,.12,.2-k*.14);extra.cabeza=pon(parte(.2,.16,.1,0x1a1026),0,.12,.32);},
  golemNieve({pon,parte,brazos,extra}){
    pon(parte(.72,.72,.72,0xf4f8f8,false,'lana'),0,.36,0); pon(parte(.6,.6,.6,0xf4f8f8,false,'lana'),0,1.02,0);
    extra.cabeza=pon(parte(.5,.5,.5,0xd88a28,false,null),0,1.6,0);
    pon(parte(.36,.14,.02,0x3a2410,false,null),0,1.52,.255); pon(parte(.08,.08,.02,0x3a2410,false,null),-.12,1.68,.255); pon(parte(.08,.08,.02,0x3a2410,false,null),.12,1.68,.255);
    [-1,1].forEach(s=>{const b=pon(parte(.06,.06,.7,0x6a4a2a,false,null),s*.46,1.2,0);b.rotation.z=s*.9;b.rotation.x=0;});
  },
  allay({pon,parte,extra}){
    pon(parte(.24,.28,.2,0x40d0ff),0,.3,0); extra.cabeza=pon(parte(.3,.3,.3,0x60e0ff),0,.6,0);
    pon(parte(.06,.06,.02,0x1a3aa0,false,null),-.07,.62,.155); pon(parte(.06,.06,.02,0x1a3aa0,false,null),.07,.62,.155);
    extra.alas=[-1,1].map(s=>{const w=new THREE.Group();const a=new THREE.Mesh(new THREE.BoxGeometry(.02,.3,.28),new THREE.MeshLambertMaterial({color:0xbff4ff,transparent:true,opacity:.65}));a.position.z=-.1;w.add(a);w.userData.s=s;pon(w,s*.1,.36,-.08);return w;});
    extra.objeto=null;
  },
  vex({pon,parte,extra}){
    pon(parte(.24,.3,.14,0x9ab0c8),0,.45,0); extra.cabeza=pon(parte(.26,.26,.26,0xb8c8d8),0,.75,0);
    pon(parte(.05,.04,.02,0x2a2a2a,false,null),-.06,.77,.135); pon(parte(.05,.04,.02,0x2a2a2a,false,null),.06,.77,.135);
    extra.alas=[-1,1].map(s=>{const w=new THREE.Group();const a=new THREE.Mesh(new THREE.BoxGeometry(.02,.32,.36),new THREE.MeshLambertMaterial({color:0xe8f0ff,transparent:true,opacity:.55}));a.position.z=-.14;w.add(a);w.userData.s=s;pon(w,s*.08,.55,-.06);return w;});
    const e=pon(parte(.03,.36,.03,0xc0c8d0,false,null),.16,.45,.18); e.rotation.x=.6;
  },
});
COL_GATO[7]=0xe8c050;

/* ---------- Comportamientos ---------- */
const enAguaMob=(m,dy=.3)=>esAgua(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+dy),Math.floor(m.pos.z)));
IA_EXTRA.pez=(m,dt,c)=>{
  if(!enAguaMob(m)){m.vel.y=Math.max(-30,m.vel.y-25*dt);m.vel.x*=.9;m.vel.z*=.9;
    if(m.suelo&&Math.random()<dt*3){m.vel.y=3;m.vel.x=(Math.random()-.5)*2;m.vel.z=(Math.random()-.5)*2;}
    if(m.tipo!=='delfin'||!enAguaMob(m,-1)){m.ahogoT=(m.ahogoT||0)+dt;if(m.ahogoT>1){m.ahogoT=0;herirMob(m,1,null,'asfixia');}}return true;}
  m.ahogoT=0;
  const huye=m.huir>0||(c.dist3<4&&m.tipo!=='delfin');
  if(m.huir>0)m.huir-=dt;
  m.t-=dt;
  if(m.t<=0||huye){m.t=1+Math.random()*3;
    let a=huye?Math.atan2(-c.dx,-c.dz)+(Math.random()-.5):Math.random()*Math.PI*2;
    if(m.tipo==='delfin'&&c.dist<14&&!huye&&Math.random()<.5)a=Math.atan2(c.dx,c.dz);
    m.dirPez=new THREE.Vector3(Math.sin(a),(Math.random()-.5)*.6,Math.cos(a));}
  if(m.dirPez){const obj=m.pos.clone().addScaledVector(m.dirPez,1.2);
    if(!esAgua(getBloque(Math.floor(obj.x),Math.floor(obj.y+.3),Math.floor(obj.z)))){m.dirPez.multiplyScalar(-1);m.dirPez.y=-.3;}
    const v=m.def.vel*(huye?1.8:1);m.vel.x+=(m.dirPez.x*v-m.vel.x)*Math.min(1,dt*3);m.vel.y+=(m.dirPez.y*v-m.vel.y)*Math.min(1,dt*3);m.vel.z+=(m.dirPez.z*v-m.vel.z)*Math.min(1,dt*3);
    m.yawObj=Math.atan2(m.vel.x,m.vel.z);}
  // Los delfines saltan fuera del agua
  if(m.tipo==='delfin'&&Math.random()<dt*.3&&!esAgua(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+1.2),Math.floor(m.pos.z))))m.vel.y=7;
  if(m.extra.cola)m.extra.cola.rotation.y=Math.sin(tiempoJuego*12)*.5;
  return true;
};
IA_EXTRA.pezGlobo=(m,dt,c)=>{
  IA_EXTRA.pez(m,dt,c);
  const hinchado=c.dist3<3&&estado!=='muerto';
  const s=hinchado?1.8:1; if(m.extra.cuerpo){m.extra.cuerpo.scale.setScalar(s);m.extra.puas.forEach(p=>{p.visible=hinchado;});}
  if(hinchado&&c.dist3<1.6&&m.cd<=0&&supervivencia()){m.cd=1;danarJugador(2,'mob',null);efectoJugador('veneno',6);}
  return true;
};
IA_EXTRA.ajolote=(m,dt,c)=>{
  if(enAguaMob(m)){IA_EXTRA.pez(m,dt,c);m.huir=0;
    // Ataca a los peces y calamares cercanos
    const p=masCercano(m,o=>['bacalao','salmon','pezTropical','calamar','ahogado'].includes(o.tipo),8);
    if(p&&m.cd<=0){perseguir(m,p,2);if(m.pos.distanceTo(p.pos)<1){m.cd=1;herirMob(p,2,null,'ajolote');}}
    return true;}
  vagar(m,dt,m.def.vel*.5); return true;
};
IA_EXTRA.abeja=(m,dt,c)=>{
  if(m.picado){m.vidaPicada=(m.vidaPicada||0)+dt;if(m.vidaPicada>30){herirMob(m,99,null,'asfixia');return false;}}
  if(m.enfadado>0&&c.persigue&&!m.picado){
    const v=new THREE.Vector3(c.dx,c.dy+1-m.alto*.5,c.dz).normalize().multiplyScalar(m.def.vel*1.3);m.vel.lerp(v,Math.min(1,dt*4));m.yawObj=Math.atan2(c.dx,c.dz);
    if(c.dist3<1.2&&m.cd<=0){m.cd=1;danarJugador(2,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});efectoJugador('veneno',10);m.picado=true;m.enfadado=0;}
    return true;}
  // Revolotea cerca de las flores
  m.t-=dt;
  if(m.t<=0||!m.destino){m.t=1.5+Math.random()*3;
    let f=null;for(let k=0;k<8&&!f;k++){const x=Math.floor(m.pos.x+(Math.random()-.5)*14),z=Math.floor(m.pos.z+(Math.random()-.5)*14);
      for(let y=Math.floor(m.pos.y)+3;y>Math.floor(m.pos.y)-5;y--){const b=getBloque(x,y,z);if(b&&BLOQUES[b].forma==='cruz'&&/flor|margarita|aciano|orquidea|petalos/i.test(BLOQUES[b].clave)){f=new THREE.Vector3(x+.5,y+.6,z+.5);break;}}}
    m.destino=f||new THREE.Vector3(m.pos.x+(Math.random()-.5)*8,m.pos.y+(Math.random()-.5)*2,m.pos.z+(Math.random()-.5)*8);}
  const v=m.destino.clone().sub(m.pos); if(v.length()>.4){v.normalize().multiplyScalar(m.def.vel*.6);m.vel.lerp(v,Math.min(1,dt*2));m.yawObj=Math.atan2(v.x,v.z);}
  else m.vel.multiplyScalar(.8);
  m.vel.y+=Math.sin(tiempoJuego*4+m.origen.x)*.02;
  return true;
};
IA_EXTRA.loro=(m,dt,c)=>{
  if(m.suelo&&Math.random()>dt*.4){vagar(m,dt,1,.3);m.vel.y=Math.min(m.vel.y,0);m.vel.y-=18*dt;return true;}
  m.t-=dt; if(m.t<=0||!m.destino){m.t=1+Math.random()*2;m.destino=new THREE.Vector3(m.pos.x+(Math.random()-.5)*10,m.pos.y+(Math.random()-.4)*4,m.pos.z+(Math.random()-.5)*10);}
  const v=m.destino.clone().sub(m.pos); if(v.length()>.5){v.normalize().multiplyScalar(m.def.vel);m.vel.lerp(v,Math.min(1,dt*2));m.yawObj=Math.atan2(v.x,v.z);}
  if(Math.random()<dt*.5)m.vel.y-=4;
  return true;
};
IA_EXTRA.panda=(m,dt,c)=>{
  if(m.enfadado>0&&c.persigue){mover(m,c.dx,c.dz,m.def.vel*1.6);if(c.dist<m.ancho+1.2&&m.cd<=0){m.cd=1.2;danarJugador(m.def.dano,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});}return true;}
  m.rodarT=(m.rodarT||0)-dt;
  if(m.rodarT>0){m.mover=true;m.velObj=2;m.grupo.rotation.x=(m.rodarT*6)%(Math.PI*2);return true;}
  if(Math.random()<dt*.02){m.rodarT=1.1;m.yawObj=Math.random()*Math.PI*2;}
  if(m.huir>0){m.huir-=dt;mover(m,-c.dx,-c.dz,m.def.vel*1.8);return true;}
  vagar(m,dt,m.def.vel,.35); return true;
};
IA_EXTRA.llama=(m,dt,c)=>{
  if(m.escupir&&m.cd<=0&&!m.escupir.muerto&&m.escupir.pos.distanceTo(m.pos)<16){
    m.cd=2;const o=m.escupir, obj=o.pos||o, dir=new THREE.Vector3(obj.x-m.pos.x,(obj.y+1.2)-(m.pos.y+2.2),obj.z-m.pos.z).normalize();
    m.yawObj=Math.atan2(dir.x,dir.z); sonar('llama',m.pos);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({color:0xf0f0e0}));s.scale.setScalar(.2);
    agregarEnt({tipo:'escupitajo',pos:new THREE.Vector3(m.pos.x,m.pos.y+2.2,m.pos.z).addScaledVector(dir,.6),vel:dir.multiplyScalar(18),edad:0,malla:s,dueno:'mob',duenoMob:m,propio:true});
    if(Math.random()<.3)m.escupir=null; return true;}
  if(m.huir>0){m.huir-=dt;mover(m,-c.dx,-c.dz,m.def.vel*1.6);return true;}
  vagar(m,dt,m.def.vel*.8,.35); return true;
};
ACT_ENT.escupitajo=(e,dt)=>{e.edad+=dt;e.vel.y-=6*dt;const c=trazarProyectil(e,dt,.1);e.malla.position.copy(e.pos);
  if(!c&&e.edad<4)return;e.muerta=true;emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0xf0f0e0,5,1,.4,6);
  if(c&&c.jugador)danarJugador(1,'mob',null);if(c&&c.mob)herirMob(c.mob,1,null,'llama');};
IA_EXTRA.ocelote=(m,dt,c)=>{
  if(c.dist<10&&!(jugador.agachado&&esPescado(enManoId()))&&estado!=='muerto'){mover(m,-c.dx,-c.dz,m.def.vel*1.3);return true;}
  const p=masCercano(m,o=>o.tipo==='gallina',12);
  if(p&&Math.random()<.5){const d=perseguir(m,p,m.def.vel);if(d<1&&m.cd<=0){m.cd=1;herirMob(p,3,null,'ocelote');}return true;}
  vagar(m,dt,m.def.vel*.4); return true;
};
IA_EXTRA.strider=(m,dt,c)=>{
  const lava=esLava(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y-.1),Math.floor(m.pos.z)))||esLava(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+.2),Math.floor(m.pos.z)));
  if(lava){m.vel.y=Math.max(m.vel.y,0);const ly=Math.floor(m.pos.y+.2);if(esLava(getBloque(Math.floor(m.pos.x),ly,Math.floor(m.pos.z))))m.pos.y+=Math.min(.5,dt*3);}
  m.frio=!lava; m.fuego=0;
  if(m.extra.cabeza)m.extra.cabeza.rotation.z=m.frio?Math.sin(tiempoJuego*30)*.04:0;
  vagar(m,dt,m.def.vel*(m.frio?.5:1),.5); return true;
};
IA_EXTRA.sniffer=(m,dt,c)=>{
  m.olerT=(m.olerT===undefined?20+Math.random()*40:m.olerT)-dt;
  if(m.cavarT>0){m.cavarT-=dt;m.mover=false;if(m.extra.cabeza)m.extra.cabeza.rotation.x=.6+Math.sin(tiempoJuego*14)*.1;
    if(Math.random()<dt*6)particulasBloque(m.pos.x,m.pos.y+.1,m.pos.z+.9,BLOQUES[B.tierra].lado,2,1.2,.4);
    if(m.cavarT<=0){soltarItem(crearPila(Math.random()<.5?I.semillas:B.florAmarilla),m.pos.x,m.pos.y+.5,m.pos.z+1,true);sonar('sniffer',m.pos);}return true;}
  if(m.olerT<=0&&m.suelo){const b=getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y-.5),Math.floor(m.pos.z));if(b===B.cesped||b===B.tierra||b===B.musgoPalido){m.olerT=60+Math.random()*60;m.cavarT=4;return true;}}
  vagar(m,dt,m.def.vel,.4); return true;
};
IA_EXTRA.armadillo=(m,dt,c)=>{
  const peligro=(c.dist<4&&(jugador.corriendo||m.huir>0))||masCercano(m,o=>o.def.tipo==='hostil',5);
  m.enrollado=!!peligro||(m.enrolladoT=(m.enrolladoT||0)-dt)>0;
  if(peligro)m.enrolladoT=2;
  if(m.enrollado){m.mover=false;return true;}
  if(m.huir>0)m.huir-=dt;
  vagar(m,dt,m.def.vel,.35); return true;
};
IA_EXTRA.phantom=(m,dt,c)=>{
  const j=jugador.pos;
  m.ataqueT=(m.ataqueT===undefined?4+Math.random()*4:m.ataqueT)-dt;
  let obj;
  if(m.bajando){obj=new THREE.Vector3(j.x,j.y+1,j.z);if(c.dist3<1.4&&m.cd<=0&&supervivencia()){m.cd=1;danarJugador(m.def.dano,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});m.bajando=false;m.ataqueT=5+Math.random()*4;}
    if(m.pos.y<j.y-1||m.ataqueT<-3){m.bajando=false;m.ataqueT=5+Math.random()*4;}}
  else{const a=tiempoJuego*.7+m.origen.x;obj=new THREE.Vector3(j.x+Math.cos(a)*10,j.y+10,j.z+Math.sin(a)*10);
    if(m.ataqueT<=0&&estado!=='muerto'&&supervivencia()){m.bajando=true;sonar('phantom',m.pos);}}
  const v=obj.sub(m.pos); if(v.length()>.3){v.normalize().multiplyScalar(m.def.vel*(m.bajando?1.5:1));m.vel.lerp(v,Math.min(1,dt*2.2));m.yawObj=Math.atan2(v.x,v.z);}
  return true;
};
IA_EXTRA.golemNieve=(m,dt,c)=>{
  const bio=dim===DIMS.superficie?infoColumna(Math.floor(m.pos.x),Math.floor(m.pos.z)).bioma:-1;
  const calor=dim===DIMS.nether||bio===BIOMA.desierto||bio===BIOMA.sabana||bio===BIOMA.jungla||bio===BIOMA.badlands||(lloviendo&&dim===DIMS.superficie&&expuestoAlCielo(m));
  m.calorT=(m.calorT||0)+(calor?dt:0); if(m.calorT>1){m.calorT=0;herirMob(m,1,null,'fuego');if(m.muerto)return false;}
  // Deja nieve donde pisa (si no hace calor)
  if(!calor&&m.suelo&&B.capaNieve){const x=Math.floor(m.pos.x),y=Math.floor(m.pos.y),z=Math.floor(m.pos.z);if(!getBloque(x,y,z)&&SOLIDO[getBloque(x,y-1,z)]&&OPACO[getBloque(x,y-1,z)])setBloque(x,y,z,B.capaNieve);}
  const e=masCercano(m,o=>o.def.tipo==='hostil'&&!o.domado,10);
  if(e){m.yawObj=Math.atan2(e.pos.x-m.pos.x,e.pos.z-m.pos.z);m.mover=false;
    if(m.cd<=0){m.cd=1;const dir=new THREE.Vector3(e.pos.x-m.pos.x,e.pos.y+e.alto*.6-(m.pos.y+1.6),e.pos.z-m.pos.z);const d=dir.length();dir.y+=d*.12;dir.normalize();
      const s=new THREE.Sprite(matSprite(666));s.scale.setScalar(.25);
      agregarEnt({tipo:'proyectilSimple',idObjeto:666,pos:new THREE.Vector3(m.pos.x,m.pos.y+1.6,m.pos.z).addScaledVector(dir,.6),vel:dir.multiplyScalar(18),edad:0,malla:s,dueno:'mob',duenoMob:m});sonar('lanzar',m.pos,.6);}
    return true;}
  vagar(m,dt,m.def.vel*.6,.4); return true;
};
IA_EXTRA.allay=(m,dt,c)=>{
  const j=jugador.pos;
  // Recoge los objetos iguales al que lleva y te los trae
  let obj=null;
  if(m.objeto){let mejor=null,d=16;for(const e of entidades)if(e.tipo==='item'&&!e.muerta&&e.pila.id===m.objeto&&e.pos.distanceTo(m.pos)<d){d=e.pos.distanceTo(m.pos);mejor=e;}
    if(mejor){obj=mejor.pos.clone();if(d<1){m.carga=(m.carga||0)+mejor.pila.n;mejor.muerta=true;sonar('allay',m.pos,.6);}}}
  if(!obj){obj=new THREE.Vector3(j.x+Math.sin(tiempoJuego*.8)*1.5,j.y+2,j.z+Math.cos(tiempoJuego*.8)*1.5);
    if(m.carga&&m.pos.distanceTo(new THREE.Vector3(j.x,j.y+1,j.z))<2.5){const r=insertarInv(crearPila(m.objeto,m.carga));if(r)soltarItem(r,j.x,j.y+1,j.z,false);m.carga=0;sonar('allay',m.pos);}}
  const v=obj.clone().sub(m.pos);if(v.length()>.4){v.normalize().multiplyScalar(m.def.vel);m.vel.lerp(v,Math.min(1,dt*2.5));m.yawObj=Math.atan2(v.x,v.z);}else m.vel.multiplyScalar(.8);
  return true;
};
IA_EXTRA.vex=(m,dt,c)=>{
  m.vidaVex=(m.vidaVex||0)+dt; if(m.vidaVex>30){herirMob(m,99,null,'asfixia');return false;}
  if(c.persigue){const v=new THREE.Vector3(c.dx,c.dy+1-m.alto*.5,c.dz).normalize().multiplyScalar(m.def.vel);
    m.pos.addScaledVector(v,dt); m.vel.set(0,0,0); m.yawObj=Math.atan2(c.dx,c.dz);   // atraviesa las paredes
    if(c.dist3<1.2&&m.cd<=0){m.cd=1;danarJugador(m.def.dano,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});}}
  return true;
};
IA_EXTRA.evocador=(m,dt,c)=>{
  if(!c.persigue){vagar(m,dt,m.def.vel*.5);return true;}
  m.yawObj=Math.atan2(c.dx,c.dz);
  if(c.dist<6)mover(m,-c.dx,-c.dz,m.def.vel);else m.mover=false;
  m.hechizoT=(m.hechizoT===undefined?2:m.hechizoT)-dt;
  if(m.hechizoT<=0){m.golpeT=.6;sonar('evocador',m.pos);
    if(Math.random()<.4&&contar(o=>o.tipo==='vex')<6){m.hechizoT=8;for(let k=0;k<3;k++){const v=crearMob('vex',m.pos.x+(Math.random()-.5)*2,m.pos.y+1.5,m.pos.z+(Math.random()-.5)*2);v.enfadado=99;}}
    else{m.hechizoT=5;const n=12,dx=c.dx/(c.dist||1),dz=c.dz/(c.dist||1);
      for(let k=1;k<=n;k++)setTimeout(()=>{if(m.muerto)return;const x=m.pos.x+dx*k*1.25,z=m.pos.z+dz*k*1.25;
        emitirParticulas(x,m.pos.y+.4,z,0xe8e0c0,6,1.8,.4,6);sonar('colmillos',{x,y:m.pos.y,z},.6);
        const j=jugador.pos;if(Math.hypot(j.x-x,j.z-z)<.9&&Math.abs(j.y-m.pos.y)<2&&supervivencia())danarJugador(6,'magia',null);
        for(const o of mobs)if(o!==m&&o.def.tipo!=='hostil'&&Math.hypot(o.pos.x-x,o.pos.z-z)<.9)herirMob(o,6,null,'magia');},k*60);}}
  return true;
};

/* ---------- Crear: variantes y detalles ---------- */
const _crearMobCri2=crearMob;
crearMob=function(tipo,x,y,z,opc={}){
  const v=VARIANTES[tipo];
  if(v){
    const m=_crearMobCri2(v.base,x,y,z,Object.assign({},v.opc||{},opc,{sinArmadura:true,adulto:true}));
    if(!v.mismoTipo){m.tipo=tipo;m.def=v.def?v.def():DEF_MOB[tipo];}
    else m.especie=tipo;
    recolorear(m,v);
    if(v.escala){m.grupo.scale.setScalar(v.escala);m.alto*=v.escala;}
    if(v.sinArco&&m.extra.arco)m.extra.arco.visible=false;
    if(v.sinHacha&&m.extra.hacha)m.extra.hacha.visible=false;
    if(v.extra)v.extra(m);
    return m;
  }
  if(tipo==='ajolote'&&opc.variante===undefined)opc={...opc,variante:Math.random()<.001?4:Math.floor(Math.random()*4)};
  if(tipo==='loro'&&opc.variante===undefined)opc={...opc,variante:Math.floor(Math.random()*5)};
  if(tipo==='llama'&&opc.variante===undefined)opc={...opc,variante:Math.floor(Math.random()*4)};
  if(tipo==='pezTropical'&&opc.variante===undefined)opc={...opc,variante:Math.floor(Math.random()*4)};
  // Esqueletos en la nieve y zombis en el desierto cambian de especie
  if((tipo==='esqueleto'||tipo==='zombi')&&!opc.puro&&dim===DIMS.superficie&&estado==='jugando'){
    const bio=infoColumna(Math.floor(x),Math.floor(z)).bioma;
    if(tipo==='esqueleto'&&(bio===BIOMA.nevado||bio===BIOMA.taigaNevada||bio===BIOMA.picosNevados)&&Math.random()<.8)return crearMob('esqueletoErrante',x,y,z,opc);
    if(tipo==='zombi'&&bio===BIOMA.desierto&&Math.random()<.8)return crearMob('momia',x,y,z,opc);
    if(tipo==='zombi'&&Math.random()<.05)return crearMob('aldeanoZombi',x,y,z,opc);
  }
  return _crearMobCri2(tipo,x,y,z,opc);
};
// Las variantes de caballo guardan su especie (para las mascotas guardadas y los huevos)
CAMPOS_MASCOTA.push('especie');

/* ---------- Animaciones y efectos por especie ---------- */
const _actualizarMobCri2=actualizarMob;
actualizarMob=function(m,dt){
  _actualizarMobCri2(m,dt);
  if(m.muerto)return;
  const E=m.extra;
  if(E.alas)E.alas.forEach(w=>{const f=m.tipo==='phantom'?Math.sin(tiempoJuego*4+m.origen.x)*.35:Math.sin(tiempoJuego*(m.tipo==='abeja'?60:24))*.7;
    if(m.tipo==='loro'){w.rotation.z=w.userData.s*(m.suelo?.1:.9+f*.5);}else w.rotation.z=w.userData.s*f;});
  if(m.tipo==='armadillo'){const r=!!m.enrollado;if(E.cabeza)E.cabeza.visible=!r;m.piernas.forEach(p=>p.visible=!r);if(r)m.grupo.position.y-=.12;}
  if(m.tipo==='delfin'&&E.cola)E.cola.rotation.x=Math.sin(tiempoJuego*8)*.3;
  if(m.tipo==='ajolote'&&E.cola)E.cola.rotation.y=Math.sin(tiempoJuego*6)*.4;
  if(m.tipo==='allay'&&E.cabeza)m.grupo.position.y+=Math.sin(tiempoJuego*3+m.origen.x)*.08;
  if(m.tipo==='vex')m.grupo.position.y+=Math.sin(tiempoJuego*4)*.06;
  if(m.tipo==='endermita'&&Math.random()<dt*4)emitirParticulas(m.pos.x,m.pos.y+.2,m.pos.z,0x9a40e0,1,.4,.6,0);
  if(m.def&&m.def.especie==='wither'&&Math.random()<dt*2)emitirParticulas(m.pos.x,m.pos.y+1.6,m.pos.z,0x222222,1,.3,.8,-.5);
};
// Golpes con efectos: momia da hambre, esqueleto wither pudre y el errante ralentiza
const _danarJugadorCri2=danarJugador;
danarJugador=function(n,tipo,dir){
  const m=mobActual, antes=salud;
  const r=_danarJugadorCri2(n,tipo,dir);
  if(m&&salud<antes&&m.def){if(m.def.especie==='momia')efectoJugador('hambre',7*1.5);if(m.def.especie==='wither')efectoJugador('wither',10);}
  return r;
};
if(!NOMBRE_EFECTO.wither){NOMBRE_EFECTO.wither='Descomposición';COLOR_EFECTO.wither='#352a27';}
const _actFlechaCri2=ACT_ENT.flecha;
ACT_ENT.flecha=(e,dt)=>{
  if(e.lentitud===undefined)e.lentitud=!!(e.duenoMob&&e.duenoMob.def&&e.duenoMob.def.especie==='errante');
  const antes=salud; _actFlechaCri2(e,dt);
  if(e.lentitud&&salud<antes)efectoJugador('lentitud',30);
};
// Efecto de descomposición: quita vida poco a poco (como el veneno pero puede matar)
let witherT=0;
function aplicarWither(dt){
  if(!efectos.wither||estado!=='jugando')return;
  witherT+=dt; if(witherT>=2){witherT=0;danarJugador(1,'magia',null);}
}

/* ---------- Clic derecho: champiñaca, aldeano zombi, allay, tortuga ---------- */
function usarDerechoCri2(p,id){
  const m=apuntadoEnt&&apuntadoEnt.mob; if(!m)return false;
  if(m.tipo==='champinaca'&&id===252){consumirEnMano();const r=insertarInv(crearPila(253));if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);sonar('comer',m.pos);return true;}
  if(m.tipo==='aldeanoZombi'&&id===I.manzanaDorada&&!m.curando){consumirEnMano();m.curando=5;sonar('portal',m.pos,.3);emitirParticulas(m.pos.x,m.pos.y+1.5,m.pos.z,0xe0d040,12,1,1,-1);return true;}
  if(m.tipo==='allay'&&p&&!m.objeto){m.objeto=id;const q={...p,n:1};consumirEnMano();m.carga=1;sonar('allay',m.pos);mostrarMensaje('El allay recogerá: '+ITEMS[id].nombre);return true;}
  if(m.tipo==='allay'&&!p&&m.objeto){const r=insertarInv(crearPila(m.objeto,Math.max(1,m.carga||1)));m.objeto=null;m.carga=0;return true;}
  return false;
}
const _usarDerechoCompletoCri2=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){if(usarDerechoCri2(p,id))return true;return _usarDerechoCompletoCri2(p,id,it);};
function curarZombis(dt){
  for(const m of mobs.slice())if(m.curando>0){m.curando-=dt;if(Math.random()<dt*6)emitirParticulas(m.pos.x,m.pos.y+1.2,m.pos.z,0xe06080,1,.6,.8,-1);
    if(m.curando<=0){const prof=Object.keys(PROFESIONES)[Math.floor(Math.random()*4)];crearMob('aldeano',m.pos.x,m.pos.y,m.pos.z,{profesion:prof,ofertas:ofertasProfesion(prof,Math.random)});quitarMob(m);sonar('aldeano');}}
}
// La llama escupe a quien la ataca
const _herirMobCri2=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  const r=_herirMobCri2(m,d,dir,fuente,empuje);
  if(m&&!m.muerto&&m.tipo==='llama'&&(fuente==='jugador'||fuente==='flechaJugador'))m.escupir=jugador;
  if(m&&!m.muerto&&m.tipo==='abeja'&&fuente==='jugador')for(const o of mobs)if(o.tipo==='abeja'&&o.pos.distanceTo(m.pos)<16)o.enfadado=30;
  if(m&&!m.muerto&&m.tipo==='panda'&&fuente==='jugador')m.enfadado=20;
  return r;
};
// Endermitas al lanzar perlas
const _actPerlaCri2=ACT_ENT.perla;
ACT_ENT.perla=(e,dt)=>{_actPerlaCri2(e,dt);if(e.muerta&&!e._endermita){e._endermita=true;if(Math.random()<.05&&dim!==DIMS.end)crearMob('endermita',e.pos.x,e.pos.y+.2,e.pos.z);}};

/* ---------- Construir gólems de nieve y de hierro ---------- */
const _setBloqueCri2=setBloque;
setBloque=function(x,y,z,id,opc){
  const r=_setBloqueCri2(x,y,z,id,opc);
  if((id===B.calabaza||id===B.linternaCalabaza)&&!(opc&&opc.sinAviso)&&estado==='jugando'){
    if(getBloque(x,y-1,z)===B.bloqueNieve&&getBloque(x,y-2,z)===B.bloqueNieve){
      for(let k=0;k<3;k++)_setBloqueCri2(x,y-k,z,0);crearMob('golemNieve',x+.5,y-2,z+.5);emitirParticulas(x+.5,y-1,z+.5,0xffffff,20,2,.8,4);}
    else if(getBloque(x,y-1,z)===B.bloqueHierro&&getBloque(x,y-2,z)===B.bloqueHierro)
      for(const [ax,az] of [[1,0],[0,1]])if(getBloque(x+ax,y-1,z+az)===B.bloqueHierro&&getBloque(x-ax,y-1,z-az)===B.bloqueHierro){
        for(const [a,b,c] of [[0,0,0],[0,-1,0],[0,-2,0],[ax,-1,az],[-ax,-1,-az]])_setBloqueCri2(x+a,y+b,z+c,0);
        const g=crearMob('golem',x+.5,y-2,z+.5);g.origen.set(x,y,z);g.construido=true;emitirParticulas(x+.5,y-1,z+.5,0xc8c8c8,20,2,.8,4);break;}
  }
  return r;
};

/* ---------- Aparición ---------- */
function aparicionCriaturas2(x,z){
  if(dim===DIMS.nether){
    if(Math.random()<.2&&contar(m=>m.tipo==='strider')<4){for(let y=OY+40;y>OY+20;y--)if(esLava(getBloque(x,y,z))&&!getBloque(x,y+1,z)){crearMob('strider',x+.5,y+1,z+.5);return true;}}
    // Esqueletos wither en las fortalezas
    if(Math.random()<.3&&contar(m=>m.tipo==='esqueletoWither')<5){for(const f of fortalezasCerca(x,z))if(Math.abs(x-f.x)<50&&Math.abs(z-f.z)<50){
      const y=buscarSuelo(x,f.y+8,z,12,3);if(y>0){crearMob('esqueletoWither',x+.5,y,z+.5);return true;}}}
    return false;
  }
  if(dim!==DIMS.superficie||(mundoEstado&&mundoEstado.oneBlock)||Math.random()>.2)return false;
  if(Math.hypot(x-jugador.pos.x,z-jugador.pos.z)<20)return false;
  const bio=infoColumna(x,z).bioma, n=t=>contar(m=>m.tipo===t);
  let y=CY-1; while(y>0&&!getBloque(x,y,z))y--;
  const sup=getBloque(x,y,z);
  const grupo=(tipo,cant,opc,dy=0)=>{let k=0;for(let i=0;i<cant;i++){const ox=x+azar(-2,2),oz=z+azar(-2,2),oy=buscarSuelo(ox,y+3,oz,6,1);
    if(oy>0&&!esLiquido(getBloque(ox,oy-1,oz))){crearMob(tipo,ox+.5,oy+dy,oz+.5,opc);k++;}}return k>0;};
  const agua=(tipo,cant,limite)=>{if(n(tipo)>=limite)return false;let yy=y;while(yy>1&&esAgua(getBloque(x,yy-1,z))&&y-yy<4)yy--;
    if(y-yy<1)return false;for(let k=0;k<cant;k++)crearMob(tipo,x+.3+Math.random()*.4,yy+Math.random(),z+.3+Math.random()*.4);return true;};
  const noche=sol<-.05;
  // Phantoms de noche sobre los jugadores al aire libre
  if(noche&&Math.random()<.04&&n('phantom')<3&&supervivencia()&&expuestoAlCielo({pos:jugador.pos,alto:1.8})){crearMob('phantom',jugador.pos.x+(Math.random()-.5)*20,jugador.pos.y+20,jugador.pos.z+(Math.random()-.5)*20);return true;}
  if(esAgua(sup)){
    if(bio===BIOMA.oceanoCalido)return Math.random()<.5?agua('pezTropical',azar(3,5),10):agua('pezGlobo',1,3);
    if(bio===BIOMA.rio)return agua('salmon',azar(2,4),8);
    if(esOceano(bio)){const r=Math.random();if(r<.2&&bio!==BIOMA.oceanoHelado)return agua('delfin',azar(2,3),5);if(r<.6)return agua('bacalao',azar(3,5),10);return bio===BIOMA.oceanoHelado?agua('salmon',azar(2,3),8):false;}
    return false;
  }
  // Ajolotes y calamares brillantes en el agua de las cuevas
  if(Math.random()<.15){const yy=Math.floor(jugador.pos.y)+azar(-14,4);
    if(yy<y-8&&esAgua(getBloque(x,yy,z))&&(luzEn(x,yy,z)>>4)===0){crearMob(Math.random()<.6&&n('ajolote')<5?'ajolote':'calamarBrillante',x+.5,yy,z+.5);return true;}}
  if(bio===BIOMA.playa&&sup===B.arena&&n('tortuga')<5&&Math.random()<.3)return grupo('tortuga',azar(1,3));
  if(bio===BIOMA.jungla){const r=Math.random();
    if(r<.25&&n('loro')<4)return grupo('loro',azar(1,2),undefined,1);
    if(r<.4&&n('panda')<3)return grupo('panda',azar(1,2));
    if(r<.5&&n('ocelote')<2)return grupo('ocelote',1);}
  if((bio===BIOMA.sabana||bio===BIOMA.montana)&&n('llama')<6&&Math.random()<.25)return grupo('llama',azar(2,4),{variante:Math.floor(Math.random()*4)});
  if((bio===BIOMA.sabana||bio===BIOMA.badlands)&&n('armadillo')<3&&Math.random()<.25)return grupo('armadillo',azar(1,2));
  if((bio===BIOMA.llanura||bio===BIOMA.prado||bio===BIOMA.cerezo||bio===BIOMA.bosque)&&!noche&&n('abeja')<6&&Math.random()<.2)return grupo('abeja',azar(2,3),undefined,1.5);
  if((bio===BIOMA.llanura||bio===BIOMA.sabana)&&n('caballo')<5&&Math.random()<.08)return grupo('burro',azar(1,2));
  if(bio===BIOMA.bosqueOscuro&&n('champinaca')<3&&Math.random()<.1)return grupo('champinaca',azar(2,3));
  // Lepismas bajo tierra cerca de la fortaleza
  if(typeof posFortaleza==='function'&&Math.random()<.2&&n('lepisma')<4){const f=posFortaleza();if(Math.hypot(x-f.x,z-f.z)<45){const yy=buscarSuelo(x,f.y+6,z,10,1);if(yy>0){crearMob('lepisma',x+.5,yy,z+.5);return true;}}}
  return false;
}
const _aparicionFinalCri2=aparicionFinal;
aparicionFinal=function(x,z){if(aparicionCriaturas2(x,z))return true;return _aparicionFinalCri2(x,z);};
// En el Nether también se llama a la aparición extra
const _intentoAparicionCri2=intentoAparicion;
intentoAparicion=function(){
  if(dim===DIMS.nether&&Math.random()<.3){const j=jugador.pos,a=Math.random()*Math.PI*2,d=20+Math.random()*24;
    const x=Math.floor(j.x+Math.cos(a)*d),z=Math.floor(j.z+Math.sin(a)*d),ch=chunkSiExiste(Math.floor(x/CX),Math.floor(z/CZ));
    if(ch&&ch.malla&&aparicionCriaturas2(x,z))return;}
  return _intentoAparicionCri2();
};
// Los devastadores se unen a las invasiones
if(typeof lanzarOla==='function'){const _lanzarOlaCri2=lanzarOla;lanzarOla=function(){_lanzarOlaCri2();
  if(invasion&&invasion.ola>=2){const m0=invasion.mobs[0];if(m0){const d=crearMob('devastador',m0.pos.x+2,m0.pos.y,m0.pos.z);d.invasion=true;d.enfadado=9999;d.origen.copy(m0.origen);invasion.mobs.push(d);invasion.total++;}
    if(invasion.ola===invasion.olas&&m0){const e=crearMob('evocador',m0.pos.x-2,m0.pos.y,m0.pos.z);e.invasion=true;e.origen.copy(m0.origen);invasion.mobs.push(e);invasion.total++;}}};}

/* ---------- Cada fotograma ---------- */
const _actualizarFinalCri2=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalCri2(dt);aplicarWither(dt);curarZombis(dt);};
