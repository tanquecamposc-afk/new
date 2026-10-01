"use strict";
/* =========================================================
   Sonido mejorado (todo sigue siendo sintetizado)
   - Sonido en 3D: cada sonido con posición se oye por el lado
     de donde viene (izquierda/derecha) y más apagado cuanto
     más lejos está.
   - Eco según el lugar: mucho en cuevas, Nether y End; poco al
     aire libre. Bajo el agua todo suena amortiguado.
   - Sin chasquidos ni saturación: cada sonido entra suave y
     un compresor general iguala el volumen.
   - Ruido rosa más natural (en vez de ruido blanco) y cada
     sonido varía un poco de tono cada vez que suena.
   - Voces nuevas con formantes para las criaturas: zombi,
     aldeano, cerdo, vaca, oveja, gallina, lobo, gato, piglin,
     gólem, enderman, ghast, blaze, esqueleto, araña, slime…
   - Romper bloques suena con su golpe y con los trocitos
     cayendo; golpes con más cuerpo; explosiones y truenos
     con un estruendo grave que se va apagando.
   - La música de piano suena con eco suave.
   ========================================================= */
const AU={ctx:null};
function busAudio(){
  if(!actx)return null;
  if(AU.ctx===actx)return AU;
  const c=actx; AU.ctx=c;
  // Ruido rosa (3 s) y marrón (3 s)
  const n=c.sampleRate*3;
  AU.rosa=c.createBuffer(1,n,c.sampleRate); AU.marron=c.createBuffer(1,n,c.sampleRate);
  {const d=AU.rosa.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<n;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}}
  {const d=AU.marron.getChannelData(0);let u=0;for(let i=0;i<n;i++){u=(u+.02*(Math.random()*2-1))/1.02;d[i]=u*3.5;}}
  // Cadena principal: entrada → filtro (agua) → compresor → salida; y envío de eco
  AU.entrada=c.createGain();
  AU.filtro=c.createBiquadFilter(); AU.filtro.type='lowpass'; AU.filtro.frequency.value=20000; AU.filtro.Q.value=.5;
  AU.comp=c.createDynamicsCompressor(); AU.comp.threshold.value=-16; AU.comp.knee.value=10; AU.comp.ratio.value=4; AU.comp.attack.value=.004; AU.comp.release.value=.2;
  AU.salida=c.createGain(); AU.salida.gain.value=1.15;
  AU.entrada.connect(AU.filtro); AU.filtro.connect(AU.comp); AU.comp.connect(AU.salida); AU.salida.connect(c.destination);
  AU.eco=c.createConvolver();
  {const len=Math.floor(c.sampleRate*2.4), ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,3.2)*(i<c.sampleRate*.01?i/(c.sampleRate*.01):1);}}
    AU.eco.buffer=ir;}
  AU.ecoGan=c.createGain(); AU.ecoGan.gain.value=.08;
  AU.entrada.connect(AU.eco); AU.eco.connect(AU.ecoGan); AU.ecoGan.connect(AU.filtro);
  // Música: su propio volumen y algo más de eco
  AU.musica=c.createGain(); AU.musica.gain.value=1; AU.musica.connect(AU.filtro);
  AU.musicaEco=c.createGain(); AU.musicaEco.gain.value=.35; AU.musica.connect(AU.eco);
  AU.voces=0;
  return AU;
}
// Destino y variación de la llamada en curso (los pone sonar/tocar)
let destino44=null, var44=1;
const MAX_VOCES=72;
function salidaDe44(){const A=busAudio();return destino44||(A?A.entrada:actx.destination);}
function contarVoz44(nodo){const A=AU;A.voces++;nodo.onended=()=>{A.voces--;};}
ruidoSnd=function(dur,frec,gan,tipo='lowpass'){
  if(!actx||gan<.002)return;
  const A=busAudio(); if(A.voces>MAX_VOCES&&gan<.15)return;
  const t=actx.currentTime, s=actx.createBufferSource(), f=actx.createBiquadFilter(), g=actx.createGain();
  s.buffer=tipo==='lowpass'&&frec<450?A.marron:A.rosa; f.type=tipo; f.frequency.value=Math.min(18000,frec*var44); f.Q.value=tipo==='bandpass'?1.1:.7;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gan*1.25,t+.004); g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  s.connect(f); f.connect(g); g.connect(salidaDe44());
  s.start(t,Math.random()*2.2); s.stop(t+dur+.02); contarVoz44(s);
};
tonoSnd=function(f1,f2,dur,tipo,gan,retraso=0){
  if(!actx||gan<.002)return;
  const A=busAudio(); if(A.voces>MAX_VOCES&&gan<.06)return;
  const t=actx.currentTime+retraso, o=actx.createOscillator(), g=actx.createGain();
  o.type=tipo; o.frequency.setValueAtTime(Math.max(1,f1*var44),t); o.frequency.exponentialRampToValueAtTime(Math.max(1,f2*var44),t+dur);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gan,t+Math.min(.01,dur*.15)); g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  // Las ondas cuadradas y de sierra se suavizan un poco (menos zumbido de videojuego antiguo)
  if(tipo==='square'||tipo==='sawtooth'){const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.max(1200,f1*6);o.connect(lp);lp.connect(g);}else o.connect(g);
  g.connect(salidaDe44()); o.start(t); o.stop(t+dur+.03); contarVoz44(o);
};
// Voz con formantes: una onda rica filtrada por las «vocales» (a, o, u…), con vibrato
const VOCALES={a:[730,1090,2440],o:[570,840,2410],u:[300,870,2240],e:[530,1840,2480],i:[270,2290,3010],m:[250,1200,2600],ee:[400,1900,2600]};
function voz44(f0,f1,dur,vocal,gan,retraso=0,vib=0,tipo='sawtooth'){
  if(!actx||gan<.002)return;
  const A=busAudio(); if(A.voces>MAX_VOCES)return;
  const t=actx.currentTime+retraso, o=actx.createOscillator(), g=actx.createGain(), sal=salidaDe44();
  o.type=tipo; o.frequency.setValueAtTime(f0*var44,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1*var44),t+dur);
  if(vib){const l=actx.createOscillator(),lg=actx.createGain();l.frequency.value=vib;lg.gain.value=f0*.04;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.05);}
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gan,t+.03); g.gain.setValueAtTime(gan,t+dur*.6); g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  const fs=Array.isArray(vocal)?vocal:(VOCALES[vocal]||VOCALES.a);
  fs.forEach((fr,i)=>{const b=actx.createBiquadFilter();b.type='bandpass';b.frequency.value=fr;b.Q.value=8+i*2;const bg=actx.createGain();bg.gain.value=[1,.6,.3][i]*3;o.connect(b);b.connect(bg);bg.connect(g);});
  g.connect(sal); o.start(t); o.stop(t+dur+.05); contarVoz44(o);
}

/* ---------- Sonido en 3D: lado y distancia ---------- */
function cadenaEspacial44(pos){
  const A=busAudio(); if(!A||!pos)return null;
  const c=camara.position, dx=pos.x-c.x, dy=(pos.y||c.y)-c.y, dz=pos.z-c.z, d=Math.hypot(dx,dy,dz);
  if(d<1.2)return null;
  const yaw=jugador.yaw, dh=Math.hypot(dx,dz)||1;
  const pan=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/dh,-1,1)*.8*Math.min(1,d/3);
  const p=actx.createStereoPanner?actx.createStereoPanner():null;
  const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=clamp(22000-d*900,1800,22000);
  if(p){p.pan.value=pan;p.connect(lp);}
  lp.connect(A.entrada);
  return p||lp;
}
function conContexto44(pos,fn){
  const antesD=destino44, antesV=var44;
  destino44=cadenaEspacial44(pos)||antesD; var44=antesV===1?1+(Math.random()-.5)*.1:antesV;
  try{return fn();}finally{destino44=antesD;var44=antesV;}
}
const _sonar44=sonar;
sonar=function(nombre,pos,vol){return conContexto44(pos,()=>_sonar44(nombre,pos,vol));};
if(typeof tocar==='function'){const _tocar44=tocar;tocar=function(pos,fn,vol,rango){return conContexto44(pos,()=>_tocar44(pos,fn,vol,rango));};}

/* ---------- Eco y agua según dónde estés ---------- */
let ambienteAudioT=0;
function actualizarAudio44(dt){
  const A=busAudio(); if(!A)return;
  if((ambienteAudioT-=dt)>0)return; ambienteAudioT=.25;
  const c=camara.position;
  const ojo=getBloque(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z)), agua=esAgua(ojo)||(typeof ACUATICO!=='undefined'&&ACUATICO[ojo]);
  let cielo=15; try{cielo=luzEn(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z))>>4;}catch(e){}
  let eco=dim===DIMS.nether?.32:dim===DIMS.end?.4:cielo<4?.5:cielo<10?.22:.07;
  if(agua)eco=.25;
  const t=actx.currentTime;
  A.ecoGan.gain.setTargetAtTime(eco,t,.4);
  A.filtro.frequency.setTargetAtTime(agua?650:20000,t,.08);
  A.salida.gain.setTargetAtTime(estado==='menu'?.9:1.15,t,.3);
}
const _actualizarFinal44=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinal44(dt);actualizarAudio44(dt);};

/* ---------- Voces de las criaturas ---------- */
const r44=(a,b)=>a+Math.random()*(b-a);
Object.assign(SND,{
  zombi:v=>{const f=r44(85,110);voz44(f,f*.75,r44(.7,1.1),Math.random()<.5?'u':'o',.09*v,0,5);ruidoSnd(.6,300,.04*v);},
  cerdo:v=>{const n=Math.random()<.5?1:2;for(let i=0;i<n;i++){const f=r44(380,460);voz44(f,f*.8,.18,'ee',.07*v,i*.22,0,'square');ruidoSnd(.12,1400,.05*v,'bandpass');}},
  vaca:v=>{const f=r44(120,145);voz44(f,f*.85,r44(.9,1.3),[350,800,2400],.12*v,0,4);voz44(f*2,f*1.6,.8,'u',.03*v,.05);},
  oveja:v=>{const f=r44(300,360);voz44(f,f*.9,r44(.55,.75),'e',.08*v,0,13);},
  gallina:v=>{const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++)voz44(r44(850,1050),r44(700,900),.09,'i',.05*v,i*.12,0,'square');},
  aldeano:v=>{const f=r44(180,220);voz44(f,f*1.15,.2,'m',.08*v,0,0);voz44(f*1.2,f*.9,.28,'m',.07*v,.18,0);},
  aldeanoSi:v=>{const f=r44(200,230);voz44(f,f*1.25,.16,'m',.08*v);voz44(f*1.25,f*1.4,.18,'m',.07*v,.15);},
  aldeanoNo:v=>{const f=r44(230,260);voz44(f,f*.75,.2,'m',.08*v);voz44(f*.85,f*.6,.22,'m',.07*v,.18);},
  aldeanoHmm:v=>{const f=r44(190,215);voz44(f,f*1.08,.45,'m',.07*v,0,5);},
  piglin:v=>{const f=r44(150,190);voz44(f,f*.85,.3,'o',.08*v,0,8,'square');ruidoSnd(.2,800,.05*v,'bandpass');},
  golem:v=>{voz44(70,55,.5,'u',.08*v,0,3,'square');ruidoSnd(.3,500,.08*v);},
  golemCobre:v=>{tonoSnd(r44(900,1100),r44(700,900),.12,'triangle',.05*v);tonoSnd(r44(1300,1500),1200,.1,'triangle',.03*v,.1);},
  enderman:v=>{voz44(r44(180,240),r44(60,90),.9,'o',.06*v,0,22,'sawtooth');ruidoSnd(.8,600,.05*v,'bandpass');},
  ghast:v=>{const f=r44(550,700);voz44(f,f*.5,1.3,'i',.1*v,0,6,'triangle');voz44(f*1.5,f*.7,1.1,'e',.04*v,.1,7,'triangle');},
  ghastFeliz:v=>{const f=r44(650,800);voz44(f,f*1.2,.8,'i',.06*v,0,5,'triangle');},
  blaze:v=>{ruidoSnd(.7,r44(350,500),.12*v,'bandpass');voz44(r44(110,140),90,.6,'o',.04*v,0,9);},
  esqueleto:v=>{const n=3+Math.floor(Math.random()*3);for(let i=0;i<n;i++){ruidoSnd(.04,r44(2200,3600),.14*v,'bandpass');tonoSnd(r44(500,800),400,.03,'square',.02*v,i*.05);}},
  arana:v=>{ruidoSnd(.35,r44(3000,4000),.07*v,'highpass');for(let i=0;i<4;i++)ruidoSnd(.03,r44(1500,2500),.06*v,'bandpass');},
  slime:v=>{voz44(r44(220,280),r44(120,160),.18,'u',.06*v,0,0,'sine');ruidoSnd(.15,600,.08*v,'bandpass');},
  lobo:v=>{if(Math.random()<.5){for(let i=0;i<2;i++)voz44(r44(380,450),r44(300,350),.12,'a',.08*v,i*.2,0,'sawtooth');}else voz44(r44(500,600),r44(700,800),.5,'u',.06*v,0,6,'triangle');},
  gato:v=>{const f=r44(500,620);voz44(f,f*1.3,.18,'i',.06*v);voz44(f*1.3,f*.8,.35,'a',.06*v,.15,6);},
  zorro:v=>{voz44(r44(700,900),r44(500,600),.2,'a',.05*v,0,0,'square');},
  conejo:v=>tonoSnd(r44(1400,1700),1200,.05,'sine',.02*v),
  llama:v=>{voz44(r44(300,360),r44(250,280),.5,'e',.06*v,0,9);},
  panda:v=>{voz44(r44(160,200),r44(140,170),.4,'o',.06*v,0,4);},
  oso:v=>{voz44(r44(90,120),r44(70,90),.7,'a',.1*v,0,5,'sawtooth');ruidoSnd(.5,400,.06*v);},
  vindicador:v=>{voz44(r44(170,210),r44(140,170),.3,'m',.07*v,0,4);},
  evocador:v=>{voz44(r44(150,190),r44(120,150),.4,'o',.07*v,0,5);},
  murcielago:v=>{for(let i=0;i<3;i++)tonoSnd(r44(5500,7000),r44(4500,5500),.03,'sine',.02*v,i*.07);},
  loro:v=>{voz44(r44(1200,1600),r44(1600,2000),.15,'i',.04*v,0,0,'square');},
  delfin:v=>{for(let i=0;i<4;i++)tonoSnd(r44(2500,4000),r44(3000,5000),.06,'sine',.03*v,i*.08);},
});
// Daño y muerte de criaturas: con voz
if(typeof sonidoDanoMob==='function'){
  sonidoDanoMob=function(m){
    const t=tamanoMob(m), f=280/Math.sqrt(t);
    tocar(m.pos,v=>{
      if(/^esqueleto/.test(m.tipo)||m.tipo==='golemNieve'){for(let i=0;i<3;i++)ruidoSnd(.05,r44(2400,3600),.16*v,'bandpass');}
      else if(m.def&&m.def.ia==='cubo')voz44(f*1.4,f,.15,'u',.07*v,0,0,'sine');
      else if(m.tipo==='golem'||m.tipo==='golemCobre')tonoSnd(r44(150,180),100,.2,'square',.07*v);
      else voz44(f*1.25,f*.85,.22,m.def&&m.def.tipo==='hostil'?'a':'e',.09*v,0,0,m.def&&m.def.tipo==='hostil'?'sawtooth':'triangle');
      ruidoSnd(.07,1100,.14*v,'bandpass');
    });
  };
}
if(typeof sonidoMuerteMob==='function'){
  sonidoMuerteMob=function(m){
    const t=tamanoMob(m), f=240/Math.sqrt(t);
    tocar(m.pos,v=>{
      if(m.tipo==='creeper'){ruidoSnd(.4,2000,.15*v,'highpass');return;}
      if(/^esqueleto/.test(m.tipo)){for(let i=0;i<5;i++)ruidoSnd(.05,r44(2200,3400),.16*v,'bandpass');for(let i=0;i<4;i++)tonoSnd(r44(500,900),300,.04,'square',.02*v,.05+i*.06);return;}
      voz44(f,f*.45,.6,m.def&&m.def.tipo==='hostil'?'o':'u',.09*v,0,4);ruidoSnd(.3,250,.12*v);
    },1,28);
  };
}

/* ---------- Golpes, romper, explosiones ---------- */
const golpeAntes44=SND.golpe, critAntes44=SND.critico;
SND.golpe=v=>{ruidoSnd(.07,r44(2000,2800),.22*v,'highpass');tonoSnd(r44(130,160),60,.12,'sine',.18*v);ruidoSnd(.05,400,.15*v);};
SND.critico=v=>{ruidoSnd(.12,r44(3500,4500),.28*v,'highpass');tonoSnd(r44(170,200),70,.14,'sine',.2*v);for(let i=0;i<3;i++)tonoSnd(r44(2400,3200),2000,.05,'triangle',.03*v,.02+i*.03);};
SND.dano=v=>{voz44(r44(230,260),r44(150,170),.22,'o',.12*v,0,0,'sawtooth');ruidoSnd(.08,700,.12*v);};
SND.explosion=v=>{ruidoSnd(1.8,300,.9*v);ruidoSnd(.25,3000,.4*v,'highpass');tonoSnd(70,25,1.2,'sine',.55*v);for(let i=0;i<6;i++)ruidoSnd(.08,r44(800,2400),.12*v,'bandpass');};
SND.trueno=v=>{ruidoSnd(3.2,160,.9*v);tonoSnd(55,22,2.6,'sine',.5*v);ruidoSnd(.6,1800,.15*v,'bandpass');};
// Al romper un bloque: después del golpe caen los trocitos
for(const k of Object.keys(SND))if(k.startsWith('rompe_')||k==='romper'){
  const orig=SND[k];
  SND[k]=v=>{orig(v);const n=3+Math.floor(Math.random()*3);for(let i=0;i<n;i++)setTimeout(()=>ruidoSnd(.035,r44(1200,3200),.07*v*(1-i*.15),'bandpass'),40+i*r44(25,55));tonoSnd(r44(90,130),60,.08,'sine',.08*v);};
}

/* ---------- Música con eco suave ---------- */
if(typeof piano==='function'){
  piano=function(f,t0,dur,g){
    const A=busAudio(); if(!A)return; const t=actx.currentTime+t0;
    for(const [m,a] of [[1,1],[2,.32],[3,.1],[4,.04]]){const o=actx.createOscillator(),gn=actx.createGain();o.type=m===1?'triangle':'sine';o.frequency.value=f*m*(1+(Math.random()-.5)*.002);
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(g*a,t+.008);gn.gain.exponentialRampToValueAtTime(g*a*.4,t+.25);gn.gain.exponentialRampToValueAtTime(.0004,t+dur);
      o.connect(gn);gn.connect(A.musica);o.start(t);o.stop(t+dur+.05);}
  };
}
