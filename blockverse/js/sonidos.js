"use strict";
/* =========================================================
   Sonidos para todo:
   · Cada material suena distinto al romper, poner, golpear y
     pisar: piedra, madera, tierra, arena, grava, nieve, lana,
     vidrio, metal, plantas, hojas, netherrack, sculk,
     amatista, cobre, miel, slime, hueso, barro, musgo…
   · Todas las criaturas tienen sonido propio, de daño y de
     muerte (más grave cuanto más grandes son).
   · Ambiente: pájaros de día, grillos de noche, viento en las
     alturas, olas en la costa, burbujeo del agua, crepitar del
     fuego y de los hornos, zumbido de portales, Nether y End
     con su propio fondo, y el agua amortiguada al bucear.
   · Música tranquila generada al momento (como la de C418).
   · Acciones: abrir el inventario, ponerse armadura, tirar
     objetos, nadar, caer desde alto, respirar bajo el agua.
   ========================================================= */
const VOL=()=>window.VOLUMEN??1;
function volEn(pos,rango=24){if(!pos)return 1;const d=Math.hypot(pos.x-oyente.x,pos.y-oyente.y,pos.z-oyente.z);return clamp(1-d/rango,0,1);}
function tocar(pos,fn,vol=1,rango=24){if(!actx)return;const v=vol*volEn(pos,rango)*VOL();if(v>.01)fn(v);}
const variar=(f,k=.12)=>f*(1+(Math.random()-.5)*k*2);

/* ---------- Materiales ---------- */
const MAT={
  piedra:{romper:v=>{ruidoSnd(.22,variar(1100),.38*v,'bandpass');tonoSnd(variar(160),90,.12,'square',.04*v);},paso:v=>ruidoSnd(.06,variar(2200),.08*v,'bandpass'),golpe:v=>ruidoSnd(.06,variar(1600),.12*v,'bandpass')},
  madera:{romper:v=>{ruidoSnd(.18,variar(700),.35*v,'bandpass');tonoSnd(variar(200),120,.14,'triangle',.08*v);},paso:v=>{ruidoSnd(.05,variar(1200),.07*v,'bandpass');tonoSnd(variar(220),160,.05,'triangle',.04*v);},golpe:v=>{ruidoSnd(.05,variar(900),.14*v,'bandpass');tonoSnd(variar(240),170,.05,'triangle',.05*v);}},
  tierra:{romper:v=>ruidoSnd(.2,variar(650),.35*v),paso:v=>ruidoSnd(.08,variar(800),.07*v),golpe:v=>ruidoSnd(.06,variar(700),.12*v)},
  pasto:{romper:v=>{ruidoSnd(.18,variar(900),.3*v);ruidoSnd(.1,variar(2600),.1*v,'highpass');},paso:v=>ruidoSnd(.09,variar(900),.07*v),golpe:v=>ruidoSnd(.06,variar(1000),.12*v)},
  arena:{romper:v=>ruidoSnd(.25,variar(500),.3*v),paso:v=>ruidoSnd(.1,variar(500),.07*v),golpe:v=>ruidoSnd(.07,variar(600),.12*v)},
  grava:{romper:v=>{ruidoSnd(.25,variar(1300),.35*v,'bandpass');ruidoSnd(.15,variar(3000),.1*v,'highpass');},paso:v=>ruidoSnd(.1,variar(1400),.09*v,'bandpass'),golpe:v=>ruidoSnd(.07,variar(1400),.14*v,'bandpass')},
  nieve:{romper:v=>ruidoSnd(.2,variar(1800),.2*v,'highpass'),paso:v=>ruidoSnd(.1,variar(1600),.05*v,'highpass'),golpe:v=>ruidoSnd(.06,variar(1800),.08*v,'highpass')},
  lana:{romper:v=>ruidoSnd(.18,variar(400),.25*v),paso:v=>ruidoSnd(.1,variar(350),.05*v),golpe:v=>ruidoSnd(.06,variar(400),.08*v)},
  vidrio:{romper:v=>{for(let i=0;i<5;i++)tonoSnd(variar(2600+i*500,.2),variar(1800),.12,'triangle',.05*v,i*.03);ruidoSnd(.25,5000,.25*v,'highpass');},paso:v=>{ruidoSnd(.05,variar(3000),.06*v,'bandpass');tonoSnd(variar(1800),1600,.04,'sine',.02*v);},golpe:v=>tonoSnd(variar(2200),2000,.05,'sine',.04*v)},
  metal:{romper:v=>{tonoSnd(variar(900),600,.4,'square',.06*v);ruidoSnd(.2,3000,.2*v,'bandpass');},paso:v=>{tonoSnd(variar(600),500,.06,'square',.03*v);ruidoSnd(.04,2500,.05*v,'bandpass');},golpe:v=>tonoSnd(variar(1200),900,.08,'square',.05*v)},
  planta:{romper:v=>{ruidoSnd(.1,variar(2200),.18*v,'bandpass');ruidoSnd(.08,variar(1000),.1*v);},paso:v=>ruidoSnd(.07,variar(1800),.05*v,'bandpass'),golpe:v=>ruidoSnd(.05,variar(2000),.08*v,'bandpass')},
  hojas:{romper:v=>{ruidoSnd(.18,variar(2600),.2*v,'bandpass');ruidoSnd(.12,variar(1200),.1*v);},paso:v=>ruidoSnd(.08,variar(2400),.06*v,'bandpass'),golpe:v=>ruidoSnd(.06,variar(2400),.1*v,'bandpass')},
  netherrack:{romper:v=>{ruidoSnd(.2,variar(800),.35*v,'bandpass');tonoSnd(variar(120),70,.15,'sawtooth',.04*v);},paso:v=>ruidoSnd(.07,variar(1000),.08*v,'bandpass'),golpe:v=>ruidoSnd(.06,variar(900),.12*v,'bandpass')},
  almas:{romper:v=>{ruidoSnd(.3,variar(400),.3*v);tonoSnd(300,150,.3,'sine',.02*v);},paso:v=>{ruidoSnd(.12,variar(450),.07*v);if(Math.random()<.1)tonoSnd(500,250,.5,'sine',.015*v);},golpe:v=>ruidoSnd(.07,variar(500),.1*v)},
  sculk:{romper:v=>{ruidoSnd(.25,variar(600),.3*v,'bandpass');tonoSnd(variar(180),90,.25,'sine',.06*v);},paso:v=>{ruidoSnd(.08,variar(700),.06*v,'bandpass');tonoSnd(variar(240),200,.06,'sine',.02*v);},golpe:v=>tonoSnd(variar(200),150,.08,'sine',.05*v)},
  amatista:{romper:v=>{for(let i=0;i<4;i++)tonoSnd(variar(1500+i*400,.25),variar(1400+i*400),.5,'sine',.05*v,i*.05);},paso:v=>tonoSnd(variar(1800,.3),1700,.35,'sine',.025*v),golpe:v=>tonoSnd(variar(2000,.3),1900,.3,'sine',.04*v)},
  cobre:{romper:v=>{tonoSnd(variar(700),500,.3,'triangle',.07*v);ruidoSnd(.15,2400,.15*v,'bandpass');},paso:v=>tonoSnd(variar(520),480,.07,'triangle',.03*v),golpe:v=>tonoSnd(variar(800),700,.08,'triangle',.05*v)},
  miel:{romper:v=>{ruidoSnd(.3,variar(300),.25*v);tonoSnd(200,120,.3,'sine',.04*v);},paso:v=>ruidoSnd(.15,variar(260),.07*v),golpe:v=>ruidoSnd(.1,variar(300),.1*v)},
  slime:{romper:v=>{tonoSnd(variar(260),140,.2,'sine',.08*v);ruidoSnd(.15,500,.15*v,'bandpass');},paso:v=>tonoSnd(variar(300),200,.1,'sine',.04*v),golpe:v=>tonoSnd(variar(320),220,.1,'sine',.06*v)},
  hueso:{romper:v=>{for(let i=0;i<3;i++)ruidoSnd(.05,variar(2600),.2*v,'bandpass');tonoSnd(variar(700),500,.08,'square',.04*v);},paso:v=>ruidoSnd(.05,variar(2800),.07*v,'bandpass'),golpe:v=>ruidoSnd(.05,variar(2600),.12*v,'bandpass')},
  barro:{romper:v=>{ruidoSnd(.3,variar(350),.3*v);tonoSnd(140,90,.2,'sine',.04*v);},paso:v=>ruidoSnd(.12,variar(380),.08*v),golpe:v=>ruidoSnd(.08,variar(400),.12*v)},
  musgo:{romper:v=>ruidoSnd(.2,variar(700),.25*v),paso:v=>ruidoSnd(.1,variar(650),.05*v),golpe:v=>ruidoSnd(.07,variar(700),.09*v)},
  coral:{romper:v=>{ruidoSnd(.2,variar(1400),.25*v,'bandpass');tonoSnd(variar(500),400,.1,'sine',.03*v);},paso:v=>ruidoSnd(.07,variar(1500),.06*v,'bandpass'),golpe:v=>ruidoSnd(.06,variar(1500),.1*v,'bandpass')},
};
function materialDe(b){
  if(!b||!BLOQUES[b])return null;
  const d=BLOQUES[b], k=d.clave||'';
  if(esHojas(b)||/hojas|Hojas|azalea/.test(k))return 'hojas';
  if(d.forma==='cruz'||/trigo|zanahorias|patatas|remolachas|tallo|arbustoBayas|alga|bambu|cana|nenufar|petalos|musgoColgante|raices|flor/i.test(k))return 'planta';
  if(/cristal|vidrio|panel|hielo|farol|lampara|bombilla|faro|portalAcceso/i.test(k)||d.trans&&/vidrio/.test(k))return 'vidrio';
  if(/amatista|Amatista/.test(k))return 'amatista';
  if(/sculk|Sculk|catalizador|chillador/.test(k))return 'sculk';
  if(/cobre|Cobre/.test(k))return 'cobre';
  if(/bloqueHierro|bloqueOro|bloqueDiamante|bloqueEsmeralda|bloqueNetherite|yunque|caldero|campana|cadena|barrotes|tolva|nucleo|bloqueRedstone|magnetita|ancla/i.test(k))return 'metal';
  if(/lana|alfombra|cama/i.test(k))return 'lana';
  if(/miel|panal|Panal/.test(k))return 'miel';
  if(/[sS]lime/.test(k))return 'slime';
  if(/[hH]ueso/.test(k))return 'hueso';
  if(/barro|Barro/.test(k))return 'barro';
  if(/[mM]usgo/.test(k))return 'musgo';
  if(/[cC]oral/.test(k))return 'coral';
  if(/[aA]lmas/.test(k))return 'almas';
  if(/netherrack|nilio|verruga|luzHongo/i.test(k))return 'netherrack';
  if(/nieve|Nieve/.test(k))return 'nieve';
  if(/^arena|Arena|polvoHormigon/.test(k))return 'arena';
  if(/grava|Grava/.test(k))return 'grava';
  if(b===B.cesped||b===B.cespedNevado||b===B.micelio||b===B.podzol||b===B.heno)return 'pasto';
  if(b===B.tierra||b===B.cultivo||b===B.cultivoHumedo||b===B.senda||b===B.arcilla||/tierra/i.test(k))return 'tierra';
  if(d.herr==='hacha'||d.inflamable)return 'madera';
  return 'piedra';
}
Object.entries(MAT).forEach(([m,s])=>{SND['rompe_'+m]=s.romper;SND['paso_'+m]=s.paso;SND['golpe_'+m]=s.golpe;});
// Los pasos y el sonido al poner usan el material
const _grupoSonidoSon=grupoSonido;
grupoSonido=function(b){const m=materialDe(b);return m?'paso_'+m:_grupoSonidoSon(b);};
// Romper y golpear: el sonido depende del bloque
let matRomper=null;
const _romperApuntadoSon=romperApuntado;
romperApuntado=function(){matRomper=apuntado?materialDe(apuntado.b):null;try{return _romperApuntadoSon();}finally{matRomper=null;}};
const _sonarSon=sonar;
sonar=function(nombre,pos,vol=1){
  if(nombre==='romper'&&matRomper)return _sonarSon('rompe_'+matRomper,pos,vol*1.1);
  if(nombre==='golpeBloque'&&apuntado){const m=materialDe(apuntado.b);if(m)return _sonarSon('golpe_'+m,apuntado,vol*1.3);}
  return _sonarSon(nombre,pos,vol);
};

/* ---------- Criaturas: voz, daño y muerte ---------- */
Object.assign(SND,{
  ajolote:v=>tonoSnd(variar(1400),1800,.08,'sine',.03*v),
  tortuga:v=>tonoSnd(variar(160),130,.2,'sine',.04*v),
  armadillo:v=>{ruidoSnd(.06,1600,.06*v,'bandpass');tonoSnd(variar(600),500,.05,'square',.02*v);},
  golemNieve:v=>ruidoSnd(.2,1400,.08*v,'highpass'),
  calamarSnd:v=>ruidoSnd(.3,300,.05*v),
});
for(const [t,s] of [['ajolote','ajolote'],['tortuga','tortuga'],['armadillo','armadillo'],['golemNieve','golemNieve'],['calamar','calamarSnd']])if(DEF_MOB[t]&&!DEF_MOB[t].sonido)DEF_MOB[t].sonido=s;
function tamanoMob(m){return clamp((m.alto||1)*(m.ancho||.4)*2.2,.15,6);}
function sonidoDanoMob(m){
  const t=tamanoMob(m), f=280/Math.sqrt(t);
  tocar(m.pos,v=>{
    if(m.tipo==='esqueleto'||m.tipo==='esqueletoErrante'||m.tipo==='esqueletoWither'||m.tipo==='golemNieve')ruidoSnd(.12,variar(3200),.2*v,'bandpass');
    else if(m.def&&m.def.ia==='cubo')tonoSnd(variar(f*1.5),f,.15,'sine',.08*v);
    else if(m.tipo==='golem'||m.tipo==='golemCobre')tonoSnd(variar(160),100,.2,'square',.07*v);
    else tonoSnd(variar(f*1.3),f*.8,.16,m.def.tipo==='hostil'?'sawtooth':'triangle',.07*v);
    ruidoSnd(.06,1200,.12*v,'bandpass');
  });
}
function sonidoMuerteMob(m){
  const t=tamanoMob(m), f=240/Math.sqrt(t);
  tocar(m.pos,v=>{
    if(m.tipo==='creeper'){ruidoSnd(.4,2000,.15*v,'highpass');return;}
    if(m.tipo.startsWith('esqueleto')){for(let i=0;i<4;i++)ruidoSnd(.06,variar(2600),.18*v,'bandpass');return;}
    tonoSnd(variar(f),f*.45,.45,m.def.tipo==='hostil'?'sawtooth':'triangle',.07*v);tonoSnd(variar(f*.7),f*.3,.5,'sine',.05*v,.08);
  },1,28);
}
const _herirMobSon=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  const antes=m&&!m.muerto?m.vida:null;
  const r=_herirMobSon(m,d,dir,fuente,empuje);
  if(antes!==null&&m.vida<antes){if(m.muerto||m.vida<=0)sonidoMuerteMob(m);else if(m.def&&m.def.sonido)sonidoDanoMob(m);else sonidoDanoMob(m);}
  return r;
};

/* ---------- Jugador: nadar, caída fuerte, armadura, inventario, tirar ---------- */
Object.assign(SND,{
  nadar:v=>{ruidoSnd(.25,variar(700),.12*v,'bandpass');ruidoSnd(.15,variar(1600),.05*v,'bandpass');},
  caidaFuerte:v=>{ruidoSnd(.25,300,.5*v);tonoSnd(90,50,.2,'sine',.2*v);},
  armadura:v=>{ruidoSnd(.15,variar(2400),.15*v,'bandpass');tonoSnd(variar(700),600,.1,'square',.03*v);},
  abrirInv:v=>{ruidoSnd(.06,1800,.08*v,'bandpass');tonoSnd(500,700,.05,'sine',.02*v);},
  cerrarInv:v=>{ruidoSnd(.06,1400,.06*v,'bandpass');tonoSnd(700,500,.05,'sine',.02*v);},
  tirar:v=>{ruidoSnd(.1,2600,.1*v,'highpass');tonoSnd(600,300,.08,'sine',.02*v);},
  burbujaAire:v=>tonoSnd(variar(900),1600,.05,'sine',.03*v),
  aldeanoSi:v=>{tonoSnd(variar(240),300,.18,'sawtooth',.05*v);tonoSnd(300,340,.12,'sawtooth',.04*v,.16);},
  aldeanoNo:v=>{tonoSnd(variar(260),180,.2,'sawtooth',.05*v);tonoSnd(220,150,.2,'sawtooth',.04*v,.18);},
  aldeanoHmm:v=>tonoSnd(variar(210),230,.35,'sawtooth',.04*v),
  aldeanoTrabajo:v=>{ruidoSnd(.1,1500,.1*v,'bandpass');tonoSnd(variar(400),380,.08,'triangle',.03*v);},
});
let nadoT=0, armPrev='', airePrev=15;
function sonidosJugador(dt){
  const j=jugador;
  if(estado!=='jugando')return;
  if(j.enAgua&&!j.suelo&&Math.hypot(j.vel.x,j.vel.z)>1){nadoT-=dt;if(nadoT<=0){nadoT=.7;sonar('nadar',null,.6);}}
  const arm=[36,37,38,39].map(i=>inv[i]?inv[i].id:0).join(',');
  if(armPrev&&arm!==armPrev&&arm.replace(/0,?/g,'').length>=armPrev.replace(/0,?/g,'').length)sonar('armadura');
  armPrev=arm;
  if(aire<airePrev&&j.ojosAgua)sonar('burbujaAire',null,.7);
  airePrev=aire;
}
const _danarJugadorSon=danarJugador;
danarJugador=function(n,tipo,dir){if(tipo==='caida'&&n>=4&&supervivencia())sonar('caidaFuerte');return _danarJugadorSon(n,tipo,dir);};
const _abrirUISon=abrirUI;
abrirUI=function(tipo,pos,extra){const r=_abrirUISon(tipo,pos,extra);if(ui&&['inv','creativo','mesa','paleta'].includes(ui.tipo))sonar('abrirInv');return r;};
const _cerrarUISon=cerrarUI;
cerrarUI=function(){const habia=ui&&['inv','creativo','mesa'].includes(ui.tipo);const r=_cerrarUISon();if(habia)sonar('cerrarInv');return r;};
document.addEventListener('keydown',e=>{if(e.code==='KeyQ'&&!e.repeat&&estado==='jugando'&&inv[ranura])sonar('tirar');});

/* ---------- Ambiente ---------- */
Object.assign(SND,{
  pajaro:v=>{const f=variar(2600,.3),n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)tonoSnd(f*(1+(i%2)*.15),f*(1.2-(i%2)*.1),.07,'sine',.025*v,i*.11);},
  pajaroCanto:v=>{const f=variar(1800,.2);tonoSnd(f,f*1.5,.25,'sine',.02*v);tonoSnd(f*1.5,f*1.1,.3,'sine',.02*v,.28);},
  grillo:v=>{for(let i=0;i<3;i++)tonoSnd(4400,4300,.04,'square',.006*v,i*.07);},
  rana:v=>tonoSnd(variar(180),150,.15,'square',.02*v),
  viento:v=>ruidoSnd(2.5,variar(400,.3),.05*v),
  olas:v=>{ruidoSnd(2.2,variar(600),.08*v);ruidoSnd(1.2,1800,.03*v,'highpass');},
  burbujeoAgua:v=>{for(let i=0;i<3;i++)tonoSnd(variar(400,.4),variar(900,.3),.08,'sine',.012*v,i*.12);},
  crepitar:v=>{for(let i=0;i<3;i++)ruidoSnd(.03,variar(3500,.3),.08*v,'highpass');},
  zumbidoPortal:v=>{tonoSnd(variar(110,.05),112,2.6,'sawtooth',.012*v);tonoSnd(165,168,2.6,'sine',.015*v);},
  fondoNether:v=>{tonoSnd(variar(55,.1),50,4,'sawtooth',.03*v);ruidoSnd(3,200,.04*v);},
  quejidoNether:v=>{tonoSnd(variar(300),150,1.5,'sine',.02*v);tonoSnd(variar(420),200,1.4,'triangle',.012*v,.2);},
  fondoEnd:v=>{tonoSnd(variar(82,.05),80,4,'sine',.04*v);tonoSnd(123,121,4,'triangle',.015*v);},
  bajoAgua:v=>{tonoSnd(70,65,3,'sine',.05*v);ruidoSnd(2.5,250,.05*v);},
  goteo:v=>tonoSnd(variar(1800,.2),1200,.06,'sine',.03*v),
});
let ambT={pajaro:3,grillo:2,viento:6,olas:4,agua:3,fuego:1,portal:2,dim:1,bajoAgua:0,goteo:5};
const BIOMAS_PAJAROS=new Set([BIOMA.llanura,BIOMA.bosque,BIOMA.abedul,BIOMA.jungla,BIOMA.junglaBambu,BIOMA.bosqueFlores,BIOMA.llanuraGirasoles,BIOMA.cerezo,BIOMA.prado,BIOMA.taiga,BIOMA.taigaGigante,BIOMA.bosqueOscuro,BIOMA.sabana]);
function bloqueCercano(fn,r=8,paso=2){const j=jugador.pos;for(let k=0;k<14;k++){const x=Math.floor(j.x+(Math.random()-.5)*r*2),y=Math.floor(j.y+(Math.random()-.5)*r),z=Math.floor(j.z+(Math.random()-.5)*r*2);const b=getBloqueSiCargado(x,y,z);if(b>0&&fn(b,x,y,z))return {x:x+.5,y:y+.5,z:z+.5};}return null;}
function ambiente(dt){
  if(estado==='menu'||!actx)return;
  for(const k in ambT)ambT[k]-=dt;
  const j=jugador.pos, c=camara.position, sup=dim===DIMS.superficie;
  const ojo=getBloque(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z)), bajoAgua=esAgua(ojo)||ACUATICO[ojo];
  if(bajoAgua){if(ambT.bajoAgua<=0){ambT.bajoAgua=2.4;tocar(null,SND.bajoAgua,.8);}return;}
  let cielo=15; try{cielo=luzEn(Math.floor(j.x),Math.floor(j.y+1),Math.floor(j.z))>>4;}catch(e){}
  const fuera=cielo>=12;
  if(sup){
    const bio=biomaEnJugador(), dia=sol>.05, noche=sol<-.08;
    if(fuera&&!lloviendo&&dia&&BIOMAS_PAJAROS.has(bio)&&ambT.pajaro<=0){ambT.pajaro=2+Math.random()*6;tocar(null,Math.random()<.3?SND.pajaroCanto:SND.pajaro,.7+Math.random()*.3);}
    if(fuera&&noche&&!lloviendo&&(BIOMAS_PAJAROS.has(bio)||bio===BIOMA.pantano)&&ambT.grillo<=0){ambT.grillo=.8+Math.random()*1.6;tocar(null,SND.grillo,.6+Math.random()*.4);if((bio===BIOMA.pantano||bio===BIOMA.manglar)&&Math.random()<.4)tocar(null,SND.rana,.8);}
    if(fuera&&(j.y>OY+100||bio===BIOMA.picosNevados||bio===BIOMA.picosPiedra||bio===BIOMA.espigasHielo||tormenta)&&ambT.viento<=0){ambT.viento=2;tocar(null,SND.viento,j.y>OY+100?1:.6);}
    if(ambT.olas<=0){ambT.olas=2+Math.random()*2;if(bio===BIOMA.playa||esOceano(bio))tocar(null,SND.olas,fuera?.8:.3);}
    if(!fuera&&cielo<4&&ambT.goteo<=0){ambT.goteo=3+Math.random()*8;tocar(null,SND.goteo,.6);}
  }else if(dim===DIMS.nether){
    if(ambT.dim<=0){ambT.dim=3.2;tocar(null,SND.fondoNether,1);if(Math.random()<.25)tocar(null,SND.quejidoNether,.8);}
  }else if(dim===DIMS.end){
    if(ambT.dim<=0){ambT.dim=3.4;tocar(null,SND.fondoEnd,1);}
  }
  if(ambT.agua<=0){ambT.agua=1.5+Math.random()*2;const a=bloqueCercano(b=>esAgua(b)&&nivelLiquido(b)>0,6);if(a)tocar(a,SND.burbujeoAgua,1,10);}
  if(ambT.fuego<=0){ambT.fuego=.3+Math.random()*.5;const f=bloqueCercano(b=>b===B.fuego||b===B.fogata||b===B.fuegoAlmas||b===B.fogataAlmas,6);if(f)tocar(f,SND.crepitar,1,10);
    for(const k in hornos){const h=hornos[k];if(h&&h.quema>0){const p=k.split(':')[1];if(!p)continue;const [x,y,z]=p.split(',').map(Number);if(Math.hypot(x-j.x,y-j.y,z-j.z)<10){tocar({x,y,z},SND.crepitar,.6,10);break;}}}}
  if(ambT.portal<=0){ambT.portal=2.4;const p=bloqueCercano(b=>b===B.portalNether,6);if(p)tocar(p,SND.zumbidoPortal,1,10);}
}

/* ---------- Música generativa ---------- */
if(OPC.musica===undefined)OPC.musica=true;
const ESCALAS_MUS={superficie:[0,2,4,7,9,12,14,16],noche:[0,3,5,7,10,12,15],nether:[0,1,5,6,8,12,13],end:[0,2,3,7,8,12,14]};
let musicaT=60+Math.random()*60, sonando=null;
function piano(f,t0,dur,g){
  if(!actx)return;const t=actx.currentTime+t0;
  for(const [m,a] of [[1,1],[2,.35],[3,.12]]){const o=actx.createOscillator(),gn=actx.createGain();o.type='sine';o.frequency.value=f*m;
    gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(g*a,t+.012);gn.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(gn);gn.connect(actx.destination);o.start(t);o.stop(t+dur+.05);}
}
function tocarPieza(){
  const clave=dim===DIMS.nether?'nether':dim===DIMS.end?'end':sol<-.05?'noche':'superficie', esc=ESCALAS_MUS[clave];
  const base=[196,220,174.6,261.6][Math.floor(Math.random()*4)]*(clave==='nether'?.75:1), g=.035*VOL();
  let t=0; const notas=18+Math.floor(Math.random()*16);
  const acordes=[[0,4,7],[5,9,12],[7,11,14],[-3,0,4]];
  for(let i=0;i<notas;i++){
    if(i%6===0){const a=acordes[Math.floor(Math.random()*acordes.length)];for(const s of a)piano(base/2*Math.pow(2,s/12),t,3.5,g*.55);}
    const s=esc[Math.floor(Math.random()*esc.length)];
    piano(base*Math.pow(2,s/12),t,2.4,g*(.6+Math.random()*.4));
    if(Math.random()<.25)piano(base*Math.pow(2,(s+12)/12),t+.25,1.6,g*.35);
    t+=[.5,.75,1,1,1.5][Math.floor(Math.random()*5)];
  }
  return t;
}
function musica(dt){
  if(!OPC.musica||!actx||estado==='menu'||VOL()<.01)return;
  musicaT-=dt; if(musicaT>0)return;
  const dur=tocarPieza(); musicaT=dur+120+Math.random()*240;
}
(function(){
  const rej=document.querySelector('.rejillaOpc'); if(!rej||typeof botonOpc!=='function')return;
  const b=botonOpc(()=>OPC.musica,()=>{OPC.musica=!OPC.musica;if(OPC.musica)musicaT=3;},v=>'Música: '+(v?'Sí':'No'));
  b.dataset.tip='Melodías tranquilas de piano de vez en cuando'; rej.insertBefore(b,rej.children[5]||null);
})();

/* ---------- Cada fotograma ---------- */
const _actualizarFinalSon=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalSon(dt);sonidosJugador(dt);ambiente(dt);musica(dt);};
