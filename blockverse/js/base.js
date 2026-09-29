"use strict";
/* =========================================================
   Constantes del mundo
   La Y interna va de 0 a 191; la Y que ve el jugador es Y-64
   (igual que las capas de -64 a 127).
   ========================================================= */
const CX=16, CZ=16, CY=192, OY=64, NIVEL_MAR=126;

/* ---------- PRNG, hash y ruido ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(x,z,s){let h=Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(s,1442695041)|0;
  h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function hash3(x,y,z,s){let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,1274126177)+Math.imul(s,1442695041)|0;
  h=Math.imul(h^(h>>>13),1103515245);h^=h>>>16;h=Math.imul(h^(h>>>15),2246822519);h^=h>>>13;return (h>>>0)/4294967296;}
function smooth(t){return t*t*(3-2*t);}
function valueNoise(x,z,s){
  const x0=Math.floor(x), z0=Math.floor(z), fx=smooth(x-x0), fz=smooth(z-z0);
  const a=hash2(x0,z0,s), b=hash2(x0+1,z0,s), c=hash2(x0,z0+1,s), d=hash2(x0+1,z0+1,s);
  const ab=a+(b-a)*fx; return ab+((c+(d-c)*fx)-ab)*fz;
}
function valueNoise3(x,y,z,s){
  const x0=Math.floor(x),y0=Math.floor(y),z0=Math.floor(z),fx=smooth(x-x0),fy=smooth(y-y0),fz=smooth(z-z0);
  const c=(i,j,k)=>hash3(x0+i,y0+j,z0+k,s), L=(a,b,t)=>a+(b-a)*t;
  return L(L(L(c(0,0,0),c(1,0,0),fx),L(c(0,1,0),c(1,1,0),fx),fy),
           L(L(c(0,0,1),c(1,0,1),fx),L(c(0,1,1),c(1,1,1),fx),fy),fz);
}
function fbm(x,z,s,oct){let v=0,amp=1,tot=0,f=1;
  for(let i=0;i<oct;i++){v+=valueNoise(x*f,z*f,s+i*101)*amp;tot+=amp;amp*=0.5;f*=2;}return v/tot;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rango=(a,b)=>Array.from({length:b-a},(_,i)=>a+i);
const azar=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const prob=p=>Math.random()<p;
function triangular(v,a,b){if(v<a||v>b)return 0;const m=(a+b)/2;return 1-Math.abs(v-m)/(m-a||1);}
const clavePos=(x,y,z)=>x+','+y+','+z;

/* =========================================================
   Sonido (WebAudio, todo sintetizado)
   ========================================================= */
let actx=null, bufRuido=null, oyente={x:0,y:0,z:0};
function iniciarAudio(){
  if(actx)return; try{actx=new (window.AudioContext||window.webkitAudioContext)();
    bufRuido=actx.createBuffer(1,actx.sampleRate*.6,actx.sampleRate);const d=bufRuido.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}catch(e){actx=null;}
}
function ruidoSnd(dur,frec,gan,tipo='lowpass'){
  if(!actx||gan<.002)return;const t=actx.currentTime,s=actx.createBufferSource(),f=actx.createBiquadFilter(),g=actx.createGain();
  s.buffer=bufRuido;f.type=tipo;f.frequency.value=frec;g.gain.setValueAtTime(gan,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(actx.destination);s.start(t);s.stop(t+dur);
}
function tonoSnd(f1,f2,dur,tipo,gan,retraso=0){
  if(!actx||gan<.002)return;const t=actx.currentTime+retraso,o=actx.createOscillator(),g=actx.createGain();
  o.type=tipo;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(gan,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+dur);
}
const SND={
  romper:v=>ruidoSnd(.18,900,.35*v), golpeBloque:v=>ruidoSnd(.06,1400,.12*v), poner:v=>ruidoSnd(.08,600,.3*v),
  golpe:v=>{ruidoSnd(.08,2500,.25*v,'highpass');tonoSnd(220,110,.1,'square',.06*v);},
  critico:v=>{ruidoSnd(.1,4000,.3*v,'highpass');tonoSnd(600,300,.12,'square',.05*v);},
  dano:v=>tonoSnd(260,110,.2,'sawtooth',.12*v), comer:v=>ruidoSnd(.1,1800,.2*v,'bandpass'),
  recoger:v=>tonoSnd(700,1400,.08,'sine',.08*v), xp:v=>tonoSnd(1200+Math.random()*600,1800,.08,'sine',.05*v),
  zombi:v=>tonoSnd(95,70,.5,'sawtooth',.05*v), cerdo:v=>tonoSnd(420,300,.18,'square',.03*v),
  vaca:v=>tonoSnd(140,110,.45,'sawtooth',.04*v), oveja:v=>{tonoSnd(330,300,.35,'triangle',.05*v);},
  gallina:v=>{tonoSnd(900,1100,.08,'square',.03*v);tonoSnd(1000,800,.08,'square',.03*v,.1);},
  esqueleto:v=>ruidoSnd(.15,3000,.1*v,'bandpass'), arana:v=>ruidoSnd(.25,700,.08*v,'bandpass'),
  creeper:v=>ruidoSnd(1.4,5000,.2*v,'highpass'), enderman:v=>tonoSnd(300,80,.6,'sawtooth',.05*v),
  piglin:v=>tonoSnd(160,120,.3,'square',.04*v), ghast:v=>tonoSnd(700,300,.8,'sine',.08*v), blaze:v=>ruidoSnd(.5,400,.12*v),
  explosion:v=>{ruidoSnd(1.2,300,.9*v);tonoSnd(80,30,.8,'sine',.5*v);},
  arco:v=>ruidoSnd(.12,2500,.2*v,'bandpass'), flecha:v=>ruidoSnd(.05,3000,.15*v,'highpass'),
  fuego:v=>ruidoSnd(.4,1200,.2*v,'bandpass'), mechero:v=>ruidoSnd(.08,5000,.3*v,'highpass'),
  agua:v=>ruidoSnd(.3,800,.15*v,'bandpass'), lava:v=>ruidoSnd(.4,300,.2*v),
  portal:v=>{tonoSnd(200,600,1.5,'sine',.1*v);tonoSnd(300,150,1.5,'triangle',.06*v);},
  rompeHerr:v=>{tonoSnd(900,200,.25,'square',.08*v);ruidoSnd(.2,3000,.2*v,'highpass');},
  nivel:v=>{tonoSnd(600,900,.15,'triangle',.12*v);tonoSnd(900,1300,.2,'triangle',.12*v,.12);},
  dragon:v=>{tonoSnd(120,60,1.2,'sawtooth',.2*v);ruidoSnd(1,500,.2*v);},
  encantar:v=>{for(let i=0;i<4;i++)tonoSnd(800+i*200,1200+i*200,.2,'sine',.05*v,i*.08);},
  mensaje:v=>tonoSnd(880,880,.06,'sine',.04*v),
  puerta:v=>{ruidoSnd(.12,700,.3*v,'bandpass');tonoSnd(180,120,.12,'square',.05*v);},
  pasoPasto:v=>ruidoSnd(.09,900,.07*v), pasoPiedra:v=>ruidoSnd(.05,2200,.08*v,'bandpass'), pasoArena:v=>ruidoSnd(.1,500,.07*v),
  pasoMadera:v=>{ruidoSnd(.05,1200,.06*v,'bandpass');tonoSnd(220,160,.05,'triangle',.04*v);}, pasoNieve:v=>ruidoSnd(.1,1600,.05*v,'highpass'),
  pasoGrava:v=>ruidoSnd(.1,1400,.09*v,'bandpass'), chapoteo:v=>ruidoSnd(.35,700,.25*v,'bandpass'),
  trueno:v=>{ruidoSnd(2.5,180,.9*v);tonoSnd(60,25,2,'sine',.6*v);}, rayo:v=>{ruidoSnd(.4,5000,.5*v,'highpass');ruidoSnd(1.8,250,.8*v);},
  cueva:v=>{tonoSnd(90+Math.random()*60,40,3,'sine',.07*v);tonoSnd(140,70,2.5,'triangle',.04*v,.4);},
  burbuja:v=>tonoSnd(500+Math.random()*400,1200,.08,'sine',.03*v),
  lluvia:v=>ruidoSnd(.6,2400,.035*v,'highpass'),
  aldeano:v=>{tonoSnd(220,170,.25,'sawtooth',.05*v);tonoSnd(260,200,.2,'sawtooth',.04*v,.2);},
};
function sonar(nombre,pos,vol=1){
  if(!actx)return;
  let v=vol;
  if(pos){const d=Math.hypot(pos.x-oyente.x,pos.y-oyente.y,pos.z-oyente.z);v*=clamp(1-d/24,0,1);}
  if(v>.01&&SND[nombre])SND[nombre](v);
}
