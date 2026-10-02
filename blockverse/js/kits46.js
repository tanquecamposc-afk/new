"use strict";
/* =========================================================
   Kits de Bed Wars al estilo del Bed Wars de Roblox
   - 18 kits en cuatro rarezas (común, raro, épico y legendario)
     con habilidades pasivas y, los legendarios, una habilidad
     activa con la tecla G (o el botón táctil).
   - Cada kit comprado se puede MEJORAR hasta el nivel 3 con
     monedas: sus números suben (más lana, más daño, menos
     recarga…).
   - Kits gratis del día: cada día rotan 3 kits que puedes
     probar sin comprarlos.
   - Los bots también llevan kits (Tanque, Piro, Escarcha o
     Vampiro) y se ve cuál debajo de su nombre.
   - Indicador del kit en pantalla durante la partida.
   ========================================================= */
const RAREZAS46={comun:['Común','#9aa4b4'],raro:['Raro','#4aa3ff'],epico:['Épico','#b46bff'],legendario:['Legendario','#ffb300']};
const ROM46=n=>['','I','II','III'][n]||n;
KITS45.length=0;
KITS45.push(
  {id:'ninguno',n:'Sin kit',p:0,r:'comun',ico:['espada_madera'],niv:{},d:()=>'Empiezas solo con la espada de madera.'},
  {id:'constructor',n:'Constructor',p:150,r:'comun',ico:['lana','lana_naranja'],niv:{lana:[24,32,48],cada:[10,8,6]},
    d:v=>`Apareces con ${v.lana} de lana y recibes 2 más cada ${v.cada} s (hasta 64).`},
  {id:'saltarin',n:'Saltarín',p:150,r:'comun',ico:['pluma'],niv:{extra:[1,1,2],fuerza:[9,10,10]},
    d:v=>`${v.extra>1?'Triple':'Doble'} salto: pulsa Espacio otra vez en el aire${v.fuerza>9?' (más alto)':''}. Además saltas más.`},
  {id:'velocista',n:'Velocista',p:200,r:'comun',ico:['azucar'],niv:{rapidez:[1,1,2],salto:[0,1,1]},
    d:v=>`Rapidez ${ROM46(v.rapidez)}${v.salto?' y Salto':''} durante toda la partida.`},
  {id:'minero',n:'Minero',p:200,r:'comun',ico:['pico_madera'],niv:{prisa:[1,2,2],pico:[1,1,2]},
    d:v=>`Pico de ${v.pico>1?'hierro':'madera'} gratis y Prisa ${ROM46(v.prisa)}: rompes bloques y camas más rápido.`},
  {id:'arquero',n:'Arquero',p:300,r:'raro',ico:['arco'],niv:{flechas:[8,12,16],cada:[8,6,4],poder:[1,1,2]},
    d:v=>`Arco con Poder ${ROM46(v.poder)} y ${v.flechas} flechas. Recuperas 1 flecha cada ${v.cada} s (hasta 24).`},
  {id:'medico',n:'Médico',p:350,r:'raro',ico:['manzanaDorada'],niv:{cada:[3,2.5,2]},
    d:v=>`Te curas medio corazón cada ${v.cada} s y curas también a tus compañeros cercanos.`},
  {id:'guerrero',n:'Guerrero',p:350,r:'raro',ico:['espada_piedra'],niv:{espada:[1,1,2],filo:[0,1,1]},
    d:v=>`Empiezas con espada de ${v.espada>1?'hierro':'piedra'}${v.filo?' con Filo I':''} en vez de la de madera.`},
  {id:'tanque',n:'Tanque',p:400,r:'raro',ico:['escudo'],niv:{red:[15,20,25]},
    d:v=>`Pantalones y botas de cobre desde el inicio y recibes un ${v.red} % menos de daño.`},
  {id:'cazarrecompensas',n:'Cazarrecompensas',p:400,r:'raro',ico:['esmeralda'],niv:{hierro:[8,12,16],oro:[3,4,6]},
    d:v=>`Cada baja te paga ${v.hierro} de hierro y ${v.oro} de oro.`},
  {id:'barbaro',n:'Bárbaro',p:600,r:'epico',ico:['hacha_hierro'],niv:{u1:[3,2,2],u2:[6,5,4],u3:[10,8,6]},
    d:v=>`Furia: con ${v.u1} bajas tu espada sube a piedra, con ${v.u2} a hierro y con ${v.u3} a diamante. No se pierde al morir.`},
  {id:'segador',n:'Segador',p:600,r:'epico',ico:['azada_diamante'],niv:{cura:[6,8,10],seg:[3,4,5]},
    d:v=>`Al eliminar a alguien recoges su alma: te curas ${v.cura/2} corazones y corres más rápido ${v.seg} s.`},
  {id:'escarcha',n:'Escarcha',p:650,r:'epico',ico:['hieloAzul','hielo'],niv:{seg:[2,2.5,3]},
    d:v=>`Tus golpes congelan: el enemigo se mueve a la mitad de velocidad durante ${v.seg} s.`},
  {id:'piro',n:'Piro',p:650,r:'epico',ico:['mechero'],niv:{seg:[3,4,5]},
    d:v=>`Tus golpes prenden fuego al enemigo durante ${v.seg} s.`},
  {id:'planeador',n:'Planeador',p:550,r:'epico',ico:['elitros'],niv:{caida:[2.4,2,1.6]},
    d:v=>`Mantén Espacio en el aire para planear (caes como mucho a ${v.caida} bloques/s). ¡Te salva del vacío!`},
  {id:'vampiro',n:'Vampiro',p:700,r:'epico',ico:['frasco'],niv:{robo:[25,30,35]},
    d:v=>`Recuperas vida: un ${v.robo} % del daño que haces.`},
  {id:'ejecutor',n:'Ejecutor',p:900,r:'legendario',ico:['hacha_diamante'],niv:{umbral:[30,35,40]},
    d:v=>`Tus golpes hacen el triple de daño a enemigos con menos del ${v.umbral} % de vida.`},
  {id:'ninja',n:'Ninja',p:900,r:'legendario',ico:['perlaEnder'],niv:{cd:[6,5,4]},act:true,
    d:v=>`Habilidad (G): embestida rápida hacia delante, sin recibir daño mientras dura. Recarga ${v.cd} s.`},
  {id:'martillo',n:'Martillo',p:1000,r:'legendario',ico:['maza'],niv:{cd:[12,10,8],dano:[5,6,7]},act:true,
    d:v=>`Habilidad (G): saltas muy alto y al caer golpeas a los enemigos cercanos (${v.dano/2} corazones). Recarga ${v.cd} s.`}
);

/* ---------- Propiedad, niveles y kits gratis del día ---------- */
const _estadoKits46=estadoKits45;
const nivelesKits46=()=>Object.assign(Object.create(null),leer45('blockverse-bw-kitniv',{})||{});
function gratisHoy46(){
  const dia=Math.floor(Date.now()/864e5), pool=KITS45.filter(k=>k.p>0).map(k=>k.id);
  let s=(dia*9301+49297)%233280;const rnd=()=>(s=(s*9301+49297)%233280)/233280;
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,3);
}
const tieneKit46=id=>id==='ninguno'||_estadoKits46().tengo.includes(id);
const disponible46=id=>tieneKit46(id)||gratisHoy46().includes(id);
estadoKits45=function(){const s=_estadoKits46();if(!KITS45.some(k=>k.id===s.equipado)||!disponible46(s.equipado))s.equipado='ninguno';return s;};
function nivelKit46(id){if(!tieneKit46(id))return 1;return Math.max(1,Math.min(3,nivelesKits46()[id]|0||1));}
function valoresKit46(k,nivel){const v={};for(const c in k.niv)v[c]=k.niv[c][Math.min(k.niv[c].length,nivel||nivelKit46(k.id))-1];return v;}
const val46=(id,c)=>valoresKit46(kitPorId45(id))[c];
const costeMejora46=(k,nivel)=>nivel>=3?0:Math.max(60,Math.round(k.p*(nivel===1?.6:1)/10)*10);
const HABILIDAD46=Object.assign(Object.create(null),{ninja:1,martillo:1});
const recarga46=id=>HABILIDAD46[id]?val46(id,'cd'):0;

/* ---------- Estado de la partida ---------- */
const K46={cd:0,rellenoT:0,flechaT:0,curaT:0,curaAliados:0,saltosUsados:0,cayendoMartillo:false,dash:0};
const kit46=()=>kitActual45().id;
const enBW46=()=>typeof BW!=='undefined'&&BW&&BW.activo&&!BW.fin&&BW.yo&&BW.yo.vivo&&!BW.yo.espectador&&estado==='jugando';
const esEnemigo46=m=>m&&!m.muerto&&!(m.bw&&m.bw.equipo===BW.yo.equipo)&&!(m.bwAliado!==undefined&&m.bwAliado===BW.yo.equipo)&&(m.bw||m.def&&m.def.tipo==='hostil');
const vidaMax46=m=>m.vidaMax||(m.def&&m.def.vida)||20;
const ESPADAS46=()=>ARMAS_BW.map(c=>idClave(c));
function nivelBarbaro46(){const b=BW.yo.bajas,v=valoresKit46(kitPorId45('barbaro'));return b>=v.u3?3:b>=v.u2?2:b>=v.u1?1:0;}

/* ---------- Objetos del kit al aparecer ---------- */
const _kitBW46=kitBW;
kitBW=function(inicio){
  const k=kit46(), yo=BW&&BW.yo, v=valoresKit46(kitPorId45(k));
  if(yo){if(k==='minero')yo.pico=Math.max(yo.pico,v.pico);if(k==='tanque')yo.armadura=Math.max(yo.armadura,1);}
  _kitBW46.apply(this,arguments);
  K46.saltosUsados=0;K46.cayendoMartillo=false;K46.dash=0;
  if(!yo||yo.espectador){actualizarHUD();return;}
  if(k==='guerrero'){const i=inv.findIndex(p=>p&&p.id===idClave('espada_madera'));
    if(i>=0){inv[i]=crearPila(idClave(ARMAS_BW[v.espada]));if(v.filo)inv[i].enc={filo:1};}}
  if(k==='constructor')darBW(lanaYo(),v.lana);
  if(k==='arquero'){darBW(I.arco,1,{poder:v.poder});darBW(I.flecha,v.flechas);}
  if(k==='barbaro')subirEspada46(false);
  actualizarHUD();
};
function subirEspada46(avisar){
  const nv=nivelBarbaro46();if(!nv)return;
  const ids=ESPADAS46();
  for(let i=0;i<36;i++){const p=inv[i];if(!p)continue;const t=ids.indexOf(p.id);
    if(t>=0&&t<nv){const enc=p.enc;inv[i]=crearPila(ids[nv]);if(enc)inv[i].enc=enc;
      if(avisar){emitirParticulas(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z,0xff5533,14,2.5,.6,-1);sonar('critico');
        mostrarAvisoBW(`¡FURIA! Espada de ${['madera','piedra','hierro','diamante'][nv]}`,'#ff7744');}
      actualizarHUD();return;}}
}

/* ---------- Golpes que das ---------- */
const _herirMob46=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  if(!(m&&!m.muerto&&typeof BW!=='undefined'&&BW&&BW.activo))return _herirMob46.apply(this,arguments);
  if(m.kit46==='tanque')d*=.85;  // bot con kit Tanque
  if(!(enBW46()&&(fuente==='jugador'||fuente==='flechaJugador')))return _herirMob46.call(this,m,d,dir,fuente,empuje);
  const k=kit46(), v=valoresKit46(kitPorId45(k)), vidaAntes=m.vida;
  if(k==='ejecutor'&&m.vida<vidaMax46(m)*v.umbral/100){d*=3;emitirParticulas(m.pos.x,m.pos.y+m.alto*.6,m.pos.z,0xff2222,10,2.5,.5,-1);}
  const r=_herirMob46.call(this,m,d,dir,fuente,empuje);
  const hecho=Math.max(0,vidaAntes-Math.max(0,m.vida));
  if(hecho<=0)return r;
  if(k==='vampiro'&&salud<20){salud=Math.min(20,salud+hecho*v.robo/100);actualizarHUD();emitirParticulas(jugador.pos.x,jugador.pos.y+1.4,jugador.pos.z,0xcc1133,4,1,.5,-1);}
  if(k==='escarcha'&&!m.muerto){m.lento46=v.seg;emitirParticulas(m.pos.x,m.pos.y+m.alto*.5,m.pos.z,0xaee8ff,10,1.8,.6,2);}
  if(k==='piro'&&!m.muerto)m.fuego=Math.max(m.fuego||0,v.seg);
  return r;
};
// Enemigos congelados van a la mitad de velocidad
const _actualizarMob46=actualizarMob;
actualizarMob=function(m,dt){
  if(!(m&&m.lento46>0))return _actualizarMob46.apply(this,arguments);
  const x=m.pos.x,z=m.pos.z;
  const r=_actualizarMob46.apply(this,arguments);
  m.lento46-=dt;
  m.pos.x=x+(m.pos.x-x)*.5;m.pos.z=z+(m.pos.z-z)*.5;
  if(m.grupo){m.grupo.position.x=m.pos.x;m.grupo.position.z=m.pos.z;}
  if(Math.random()<dt*6)emitirParticulas(m.pos.x,m.pos.y+m.alto*.5,m.pos.z,0xcfefff,1,.6,.6,1);
  return r;
};

/* ---------- Golpes que recibes ---------- */
const _danarJugador46=danarJugador;
danarJugador=function(n,tipo,dir){
  if(enBW46()){
    const k=kit46();
    if(k==='ninja'&&K46.dash>0&&tipo!=='vacio')return;
    if(k==='tanque'&&tipo!=='vacio')n*=1-val46('tanque','red')/100;
    // Kit del bot que te golpea
    const g=BW.yo.ultimoGolpe, bot=g&&g.m&&tiempoJuego-g.t<.05?g.m:null;
    if(bot&&bot.kit46&&tipo==='mob'){
      if(bot.kit46==='piro')encenderJugador(3);
      if(bot.kit46==='escarcha'){efectos.lentitud={t:2,n:1};emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0xaee8ff,8,1.5,.5,2);}
      if(bot.kit46==='vampiro'&&!bot.muerto)bot.vida=Math.min(vidaMax46(bot),bot.vida+n*.25);
    }
  }
  return _danarJugador46.call(this,n,tipo,dir);
};

/* ---------- Bots con kit ---------- */
const KITS_BOT46=['tanque','piro','escarcha','vampiro'];
function etiquetaKitBot46(m){
  if(!m||!m.kit46||!m.grupo)return;
  const kit=kitPorId45(m.kit46);
  try{const s=cartelTexto(kit.n,RAREZAS46[kit.r][1],220);s.scale.multiplyScalar(.45);s.position.set(0,2.12,0);s.userData.kit46=true;m.grupo.add(s);}catch(e){}
}
const _crearBotBW46=crearBotBW;
crearBotBW=function(equipo,k,dificultad){
  const m=_crearBotBW46.apply(this,arguments);
  if(!m||!BW)return m;
  // Cada bot conserva su kit al reaparecer
  BW.kitsBots46=BW.kitsBots46||{};
  const clave=equipo+':'+k;
  if(!(clave in BW.kitsBots46))BW.kitsBots46[clave]=Math.random()<.75?KITS_BOT46[Math.floor(Math.random()*KITS_BOT46.length)]:null;
  m.kit46=BW.kitsBots46[clave];
  etiquetaKitBot46(m);
  return m;
};
// Al cambiarle el nombre se borran sus carteles: se vuelve a poner el del kit
const _renombrarBot46=renombrarBot;
renombrarBot=function(m){const r=_renombrarBot46.apply(this,arguments);etiquetaKitBot46(m);return r;};

/* ---------- Habilidades activas (G) ---------- */
function usarHabilidad46(){
  if(!enBW46())return;
  const k=kit46();if(!HABILIDAD46[k])return;
  if(K46.cd>0){mostrarAvisoBW(`Habilidad lista en ${Math.ceil(K46.cd)} s`,'#aaa');return;}
  const fx=-Math.sin(jugador.yaw),fz=-Math.cos(jugador.yaw);
  if(k==='ninja'){
    K46.dir=[fx,fz];jugador.vel.x=fx*17;jugador.vel.z=fz*17;jugador.vel.y=Math.max(jugador.vel.y,2.5);K46.dash=.35;
    emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x8844ff,16,2,.5,0);sonar('embestida',null,.6);
  }else if(k==='martillo'){
    if(!jugador.suelo){mostrarAvisoBW('Tienes que estar en el suelo','#aaa');return;}
    jugador.vel.y=18;jugador.vel.x+=fx*3;jugador.vel.z+=fz*3;K46.cayendoMartillo=true;
    emitirParticulas(jugador.pos.x,jugador.pos.y,jugador.pos.z,0xbbbbbb,14,3,.5,6);sonar('embestida',null,.6);
  }
  K46.cd=recarga46(k);
}
function golpeMartillo46(){
  const p=jugador.pos,dano=val46('martillo','dano');let n=0;
  for(const m of mobs){if(!esEnemigo46(m))continue;const dx=m.pos.x-p.x,dz=m.pos.z-p.z,d=Math.hypot(dx,dz);
    if(d<4.5&&Math.abs(m.pos.y-p.y)<3){m.inv=0;herirMob(m,dano,{x:dx/(d||1),z:dz/(d||1)},'jugador',1);n++;}}
  for(let a=0;a<6.28;a+=.4)emitirParticulas(p.x+Math.cos(a)*2.5,p.y+.2,p.z+Math.sin(a)*2.5,0x9a8a7a,3,2,.5,8);
  sonar('explosion',{x:p.x,y:p.y,z:p.z},.5);
  if(typeof sacudida!=='undefined')sacudida=Math.max(sacudida,.6);
  if(n)mostrarAvisoBW(`¡Golpe de martillo! ×${n}`,'#ffb300');
}
document.addEventListener('keydown',e=>{
  if(e.repeat||estado!=='jugando')return;
  if(e.code==='KeyG'){usarHabilidad46();return;}
  // Saltos extra del Saltarín
  if(e.code==='Space'&&enBW46()&&kit46()==='saltarin'&&!jugador.suelo&&!jugador.vuela&&!jugador.enAgua){
    const v=valoresKit46(kitPorId45('saltarin'));
    if(K46.saltosUsados<v.extra){K46.saltosUsados++;jugador.vel.y=v.fuerza;
      emitirParticulas(jugador.pos.x,jugador.pos.y,jugador.pos.z,0xffffff,10,1.5,.4,2);sonar('recoger',null,.3);}
  }
});

// La embestida mantiene la velocidad mientras dura (si no, el suelo la frena al instante)
const _fisicaJugador46=fisicaJugador;
fisicaJugador=function(dt,entrada){
  if(K46.dash>0&&K46.dir&&enBW46()){jugador.vel.x=K46.dir[0]*17;jugador.vel.z=K46.dir[1]*17;}
  return _fisicaJugador46.apply(this,arguments);
};
// Al salir de la partida o al terminar, el indicador del kit se oculta
const _salirDeBedwars46=salirDeBedwars;
salirDeBedwars=function(){K46.dash=0;K46.cayendoMartillo=false;const r=_salirDeBedwars46.apply(this,arguments);pintarHudKit46(false);return r;};
const _terminarBW46=terminarBW;
terminarBW=function(){const r=_terminarBW46.apply(this,arguments);pintarHudKit46(false);return r;};

/* ---------- Cada fotograma ---------- */
const _actualizarFinal46=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal46(dt);
  K46.cd=Math.max(0,K46.cd-dt);K46.dash=Math.max(0,K46.dash-dt);
  if(!(typeof BW!=='undefined'&&BW&&BW.activo&&!BW.fin&&BW.yo)){pintarHudKit46(false);return;}
  const yo=BW.yo, k=kit46(), v=valoresKit46(kitPorId45(k));
  // Bajas: recompensas del kit
  if(BW.bajas46===undefined)BW.bajas46=yo.bajas;
  const nuevas=yo.bajas-BW.bajas46;BW.bajas46=yo.bajas;
  if(nuevas>0&&yo.vivo&&!yo.espectador){
    if(k==='cazarrecompensas'){darBW(I.lingoteHierro,v.hierro*nuevas);darBW(I.lingoteOro,v.oro*nuevas);mostrarAvisoBW(`Recompensa: +${v.hierro*nuevas} hierro +${v.oro*nuevas} oro`,'#ffd84a');}
    if(k==='segador'){salud=Math.min(20,salud+v.cura);efectos.rapidez={t:v.seg,n:2};actualizarHUD();
      emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x66ffdd,18,2,.8,-2);sonar('recoger',null,.6);}
    if(k==='barbaro')subirEspada46(true);
  }
  if(!enBW46()){pintarHudKit46(true);return;}
  if(jugador.suelo){K46.saltosUsados=0;
    if(K46.cayendoMartillo&&jugador.vel.y<=0){K46.cayendoMartillo=false;golpeMartillo46();}}
  const perm=(ef,n)=>{if(n&&(!efectos[ef]||efectos[ef].t<1||efectos[ef].n<n))efectos[ef]={t:2,n};};
  if(k==='saltarin')perm('salto',1);
  if(k==='velocista'){perm('rapidez',v.rapidez);perm('salto',v.salto);}
  if(k==='minero')perm('prisa',v.prisa);
  if(k==='planeador'&&!jugador.suelo&&!jugador.vuela&&teclas.Space&&jugador.vel.y<-v.caida){
    jugador.vel.y=-v.caida;if(Math.random()<dt*10)emitirParticulas(jugador.pos.x,jugador.pos.y+1.8,jugador.pos.z,0xffffff,1,.4,.5,0);}
  if(k==='constructor'){K46.rellenoT+=dt;if(K46.rellenoT>=v.cada){K46.rellenoT=0;if(contarInv(lanaYo())<64)darBW(lanaYo(),2);}}
  if(k==='arquero'){K46.flechaT+=dt;if(K46.flechaT>=v.cada){K46.flechaT=0;if(contarInv(I.flecha)<24)darBW(I.flecha,1);}}
  if(k==='medico'){
    K46.curaT+=dt;if(K46.curaT>=v.cada){K46.curaT=0;if(salud<20){salud=Math.min(20,salud+1);actualizarHUD();}}
    K46.curaAliados+=dt;if(K46.curaAliados>=v.cada){K46.curaAliados=0;
      for(const m of BW.bots||[])if(!m.muerto&&m.bw&&m.bw.equipo===yo.equipo&&m.pos.distanceTo(jugador.pos)<6&&m.vida<vidaMax46(m)){
        m.vida=Math.min(vidaMax46(m),m.vida+2);emitirParticulas(m.pos.x,m.pos.y+m.alto,m.pos.z,0xff6688,3,.8,.6,-1);}}}
  if(K46.dash>0&&Math.random()<.6)emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x8844ff,2,.4,.35,0);
  pintarHudKit46(true);
};

/* ---------- Estilos ---------- */
{const st=document.createElement('style');st.textContent=`
#kitHud46{position:fixed;left:calc(50% - 300px);bottom:12px;transform:translateX(-100%);z-index:4;pointer-events:none;display:none;align-items:center;gap:8px;
  background:rgba(10,12,20,.6);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:5px 10px 5px 5px;font:12px system-ui,sans-serif;color:#eee}
#kitHud46 img{width:30px;height:30px;image-rendering:pixelated;background:rgba(0,0,0,.3);border-radius:5px;padding:2px}
#kitHud46 b{display:block;font-size:13px}
#kitHud46 .nv46{color:#ffd84a;font-size:11px;margin-left:4px}
#kitHud46 .barra46{width:90px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin-top:3px;overflow:hidden}
#kitHud46 .barra46 i{display:block;height:100%}
#btnKit46{position:fixed;right:150px;bottom:150px;z-index:5;width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:rgba(0,0,0,.35);color:#fff;font:bold 18px system-ui;display:none}
@media (max-width:900px){#kitHud46{left:8px;transform:none;bottom:70px}}
#bwKits45 .rareza46{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:1px 7px;border-radius:9px;color:#111}
#bwKits45 .activa46{font-size:10px;color:#ffd84a;font-weight:700}
#bwKits45 .gratis46{font-size:10px;font-weight:700;color:#111;background:#6f6;padding:1px 7px;border-radius:9px}
#bwKits45 .seccion46{grid-column:1/-1;margin:6px 0 0;font:700 13px system-ui;letter-spacing:1px;text-transform:uppercase}
#bwKits45 .estrellas46{color:#ffd84a;letter-spacing:2px;font-size:13px}
#bwKits45 .estrellas46 i{color:#555;font-style:normal}
#bwKits45 .sig46{font-size:11px;color:#8fd18f;margin:0}
#bwKits45 .botones46{display:flex;flex-direction:column;gap:5px;width:100%;margin-top:auto}`;document.head.appendChild(st);}

/* ---------- Indicador del kit en pantalla ---------- */
let hudKitPrevio46='';
function pintarHudKit46(v){
  let el=document.getElementById('kitHud46');
  if(!el){el=document.createElement('div');el.id='kitHud46';document.body.appendChild(el);}
  const kit=kitActual45(), mostrar=v&&kit.id!=='ninguno'&&!(BW&&BW.yo&&BW.yo.espectador);
  el.style.display=mostrar?'flex':'none';
  const bt=document.getElementById('btnKit46'), tactil=document.getElementById('tactil');
  if(bt)bt.style.display=mostrar&&HABILIDAD46[kit.id]&&tactil&&!tactil.classList.contains('oculto')?'block':'none';
  if(!mostrar)return;
  const vals=valoresKit46(kit);
  let estadoTxt='Pasivo',prog=1,col=RAREZAS46[kit.r][1];
  if(HABILIDAD46[kit.id]){const cd=recarga46(kit.id);prog=1-K46.cd/cd;estadoTxt=K46.cd>0?`G · ${Math.ceil(K46.cd)} s`:'G · ¡Lista!';col=K46.cd>0?'#888':'#7f7';}
  else if(kit.id==='barbaro'){const nv=nivelBarbaro46(),sig=[vals.u1,vals.u2,vals.u3][nv];estadoTxt=sig?`Furia ${BW.yo.bajas}/${sig}`:'Furia máxima';prog=sig?BW.yo.bajas/sig:1;col='#ff6633';}
  else if(kit.id==='constructor'){prog=K46.rellenoT/vals.cada;estadoTxt='+2 lana';}
  else if(kit.id==='arquero'){prog=K46.flechaT/vals.cada;estadoTxt='+1 flecha';}
  else if(kit.id==='medico'){prog=K46.curaT/vals.cada;estadoTxt='Curación';}
  else if(kit.id==='saltarin'){estadoTxt=`Saltos extra: ${vals.extra-K46.saltosUsados}`;prog=1-K46.saltosUsados/vals.extra;}
  const h=`<img src="${iconoKit45(kit)}" alt=""><div><b>${kit.n}<span class="nv46">Nv.${nivelKit46(kit.id)}</span></b>${estadoTxt}<div class="barra46"><i style="width:${(Math.max(0,Math.min(1,prog))*100).toFixed(0)}%;background:${col}"></i></div></div>`;
  if(h!==hudKitPrevio46){el.innerHTML=h;hudKitPrevio46=h;}
}
{const b=document.createElement('button');b.id='btnKit46';b.textContent='G';
  b.addEventListener('touchstart',e=>{e.preventDefault();usarHabilidad46();},{passive:false});b.onclick=usarHabilidad46;document.body.appendChild(b);}

/* ---------- Pantalla de kits ---------- */
pintarKits45=function(){
  let capa=document.getElementById('bwKits45');
  if(!capa){capa=document.createElement('div');capa.id='bwKits45';capa.className='oculto';document.body.appendChild(capa);}
  const s=estadoKits45(), m=monedas45(), gratis=gratisHoy46();
  const tarjeta=k=>{
    const tengo=tieneKit46(k.id), gratisK=!tengo&&gratis.includes(k.id), eq=s.equipado===k.id, nv=nivelKit46(k.id), [rn,rc]=RAREZAS46[k.r];
    const est=k.p>0&&tengo?`<span class="estrellas46">${'★'.repeat(nv)}<i>${'★'.repeat(3-nv)}</i></span>`:'';
    let btns='';
    if(eq)btns+='<button disabled>Equipado ✔</button>';
    else if(tengo||gratisK)btns+=`<button data-eq="${k.id}">${gratisK?'Probar gratis hoy':'Equipar'}</button>`;
    if(!tengo)btns+=`<button data-comprar="${k.id}" ${m<k.p?'disabled':''}>Comprar · ${k.p}</button>`;
    else if(k.p>0&&nv<3){const c=costeMejora46(k,nv);btns+=`<button data-mejorar="${k.id}" ${m<c?'disabled':''}>Mejorar a Nv.${nv+1} · ${c}</button>`;}
    const sig=tengo&&k.p>0&&nv<3?`<p class="sig46">Nv.${nv+1}: ${k.d(valoresKit46(k,nv+1))}</p>`:'';
    return `<div class="kit45${eq?' equipado45':''}" style="${eq?'':`border-color:${rc}88`}"><img src="${iconoKit45(k)}" alt=""><b>${k.n}</b>
      <span class="rareza46" style="background:${rc}">${rn}</span>${gratisK?'<span class="gratis46">GRATIS HOY</span>':''}${est}
      ${k.act?'<span class="activa46">HABILIDAD ACTIVA · G</span>':''}<p>${k.d(valoresKit46(k))}</p>${sig}<div class="botones46">${btns}</div></div>`;};
  let h=`<div class="caja45"><h2>KITS</h2><div class="saldo45">Tienes ${htmlMoneda45(m)} monedas</div><div class="grid45">`;
  h+=`<div class="seccion46" style="color:#6f6">Gratis hoy</div>`+gratis.map(id=>tarjeta(kitPorId45(id))).join('');
  for(const r of Object.keys(RAREZAS46)){const [nom,col]=RAREZAS46[r];
    h+=`<div class="seccion46" style="color:${col}">${nom}</div>`+KITS45.filter(k=>k.r===r).map(tarjeta).join('');}
  h+=`</div><div class="pista45">Ganas monedas jugando: baja +${PREMIO45.bajas} · baja final +${PREMIO45.finales} · cama rota +${PREMIO45.camas} · partida +${PREMIO45.base} · victoria +${PREMIO45.victoria}. Los kits gratis cambian cada día.</div>
    <button id="bwKitsVolver" class="secundario">Volver</button></div>`;
  const scroll=capa.querySelector('.caja45')?.scrollTop||0;
  capa.innerHTML=h;
  capa.querySelector('.caja45').scrollTop=scroll;
  const guardarEst=e=>guardar45('blockverse-bw-kits',{tengo:e.tengo,equipado:e.equipado});
  capa.querySelectorAll('[data-comprar]').forEach(b=>b.onclick=()=>{const k=kitPorId45(b.dataset.comprar),e=_estadoKits46();
    if(monedas45()<k.p||e.tengo.includes(k.id))return;sumarMonedas45(-k.p);e.tengo.push(k.id);e.equipado=k.id;guardarEst(e);
    sonar('comprarBW');pintarKits45();pintarSaldoMenu45();});
  capa.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{const e=_estadoKits46();e.equipado=b.dataset.eq;guardarEst(e);sonar('recoger');pintarKits45();pintarSaldoMenu45();});
  capa.querySelectorAll('[data-mejorar]').forEach(b=>b.onclick=()=>{const k=kitPorId45(b.dataset.mejorar),nv=nivelKit46(k.id),c=costeMejora46(k,nv);
    if(nv>=3||monedas45()<c)return;sumarMonedas45(-c);const n=nivelesKits46();n[k.id]=nv+1;guardar45('blockverse-bw-kitniv',Object.assign({},n));
    sonar('comprarBW');pintarKits45();pintarSaldoMenu45();});
  capa.querySelector('#bwKitsVolver').onclick=()=>capa.classList.add('oculto');
  return capa;
};
pintarSaldoMenu45=function(){
  const el=document.getElementById('bwMonedas45');if(!el)return;
  const k=kitActual45();
  el.innerHTML=`${htmlMoneda45(monedas45())} monedas · Kit: <b>${k.n}</b>${k.p>0?` <span style="color:#ffd84a">Nv.${nivelKit46(k.id)}</span>`:''}`;
};
pintarSaldoMenu45();
