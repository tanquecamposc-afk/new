"use strict";
/* =========================================================
   Kits de Bed Wars al estilo del Bed Wars de Roblox
   - 18 kits en cuatro rarezas (común, raro, épico y legendario),
     con habilidades pasivas y, los legendarios, una habilidad
     activa con la tecla G (o el botón táctil).
   - Indicador del kit en pantalla durante la partida (furia,
     recarga de la habilidad, etc.).
   ========================================================= */
const RAREZAS46={comun:['Común','#9aa4b4'],raro:['Raro','#4aa3ff'],epico:['Épico','#b46bff'],legendario:['Legendario','#ffb300']};
KITS45.length=0;
KITS45.push(
  {id:'ninguno',n:'Sin kit',p:0,r:'comun',ico:['espada_madera'],d:'Empiezas solo con la espada de madera.'},
  {id:'constructor',n:'Constructor',p:150,r:'comun',ico:['lana','lana_naranja'],d:'Apareces con 24 de lana y recibes 2 más cada 10 s (hasta 64).'},
  {id:'saltarin',n:'Saltarín',p:150,r:'comun',ico:['pluma'],d:'Doble salto: pulsa Espacio otra vez en el aire. Además saltas más alto.'},
  {id:'velocista',n:'Velocista',p:200,r:'comun',ico:['azucar'],d:'Rapidez durante toda la partida.'},
  {id:'minero',n:'Minero',p:200,r:'comun',ico:['pico_madera'],d:'Pico de madera gratis y Prisa: rompes bloques y camas más rápido.'},
  {id:'arquero',n:'Arquero',p:300,r:'raro',ico:['arco'],d:'Arco con Poder I y 8 flechas. Recuperas 1 flecha cada 8 s (hasta 16).'},
  {id:'medico',n:'Médico',p:350,r:'raro',ico:['manzanaDorada'],d:'Te curas medio corazón cada 3 s y curas también a tus compañeros cercanos.'},
  {id:'guerrero',n:'Guerrero',p:350,r:'raro',ico:['espada_piedra'],d:'Empiezas con espada de piedra en vez de la de madera.'},
  {id:'tanque',n:'Tanque',p:400,r:'raro',ico:['escudo'],d:'Pantalones y botas de cobre desde el inicio y recibes un 15 % menos de daño.'},
  {id:'cazarrecompensas',n:'Cazarrecompensas',p:400,r:'raro',ico:['esmeralda'],d:'Cada baja te paga 8 de hierro y 3 de oro.'},
  {id:'barbaro',n:'Bárbaro',p:600,r:'epico',ico:['hacha_hierro'],d:'Furia: con 3 bajas tu espada sube a piedra, con 6 a hierro y con 10 a diamante. No se pierde al morir.'},
  {id:'segador',n:'Segador',p:600,r:'epico',ico:['azada_diamante'],d:'Al eliminar a alguien recoges su alma: te curas 3 corazones y corres más rápido 3 s.'},
  {id:'escarcha',n:'Escarcha',p:650,r:'epico',ico:['hieloAzul','hielo'],d:'Tus golpes congelan: el enemigo se mueve a la mitad de velocidad durante 2 s.'},
  {id:'piro',n:'Piro',p:650,r:'epico',ico:['mechero'],d:'Tus golpes prenden fuego al enemigo durante 3 s.'},
  {id:'planeador',n:'Planeador',p:550,r:'epico',ico:['elitros'],d:'Mantén Espacio en el aire para planear y caer despacio. ¡Te salva del vacío!'},
  {id:'vampiro',n:'Vampiro',p:700,r:'epico',ico:['frasco'],d:'Recuperas vida: un 25 % del daño que haces.'},
  {id:'ejecutor',n:'Ejecutor',p:900,r:'legendario',ico:['hacha_diamante'],d:'Tus golpes hacen el triple de daño a enemigos con menos del 30 % de vida.'},
  {id:'ninja',n:'Ninja',p:900,r:'legendario',ico:['perlaEnder'],d:'Habilidad (G): embestida rápida hacia delante, sin recibir daño mientras dura. Recarga 6 s.'},
  {id:'martillo',n:'Martillo',p:1000,r:'legendario',ico:['maza'],d:'Habilidad (G): saltas muy alto y al caer golpeas a todos los enemigos cercanos. Recarga 12 s.'}
);
const HABILIDAD46=Object.assign(Object.create(null),{ninja:6,martillo:12});
const K46={cd:0,rellenoT:0,flechaT:0,dobleUsado:false,cayendoMartillo:false,dash:0};
const kit46=()=>kitActual45().id;
const enBW46=()=>typeof BW!=='undefined'&&BW&&BW.activo&&!BW.fin&&BW.yo&&BW.yo.vivo&&!BW.yo.espectador&&estado==='jugando';
const esEnemigo46=m=>m&&!m.muerto&&m!==jugador&&!(m.bw&&m.bw.equipo===BW.yo.equipo)&&!(m.bwAliado!==undefined&&m.bwAliado===BW.yo.equipo)&&(m.bw||m.def&&m.def.tipo==='hostil');
const vidaMax46=m=>m.vidaMax||(m.def&&m.def.vida)||20;
const ESPADAS46=()=>ARMAS_BW.map(c=>idClave(c));
function nivelBarbaro46(){const b=BW.yo.bajas;return b>=10?3:b>=6?2:b>=3?1:0;}

/* ---------- Objetos del kit al aparecer ---------- */
const _kitBW46=kitBW;
kitBW=function(inicio){
  const k=kit46();
  if(k==='arquero'){ // el arco del arquero lleva Poder I (lo da esta versión, no la anterior)
    _kitBW46.call(this,inicio);
    const i=inv.findIndex(p=>p&&p.id===I.arco);if(i>=0)inv[i].enc=Object.assign({},inv[i].enc,{poder:1});
    darBW(I.flecha,2);
  }else _kitBW46.call(this,inicio);
  if(BW&&BW.yo&&!BW.yo.espectador&&k==='barbaro')subirEspada46();
  K46.dobleUsado=false;K46.cayendoMartillo=false;
  actualizarHUD();
};
function subirEspada46(){
  const nv=nivelBarbaro46();if(!nv)return;
  const ids=ESPADAS46();
  for(let i=0;i<36;i++){const p=inv[i];if(!p)continue;const t=ids.indexOf(p.id);
    if(t>=0&&t<nv){const enc=p.enc;inv[i]=crearPila(ids[nv]);if(enc)inv[i].enc=enc;
      emitirParticulas(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z,0xff5533,14,2.5,.6,-1);sonar('critico');
      mostrarAvisoBW&&mostrarAvisoBW(`¡FURIA! Espada de ${['madera','piedra','hierro','diamante'][nv]}`,'#ff7744');return;}}
}

/* ---------- Golpes que das ---------- */
const _herirMob46=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  if(!(enBW46()&&(fuente==='jugador'||fuente==='flechaJugador')&&m&&!m.muerto))return _herirMob46.apply(this,arguments);
  const k=kit46(), vidaAntes=m.vida;
  if(k==='ejecutor'&&m.vida<vidaMax46(m)*.3){d*=3;emitirParticulas(m.pos.x,m.pos.y+m.alto*.6,m.pos.z,0xff2222,10,2.5,.5,-1);}
  const r=_herirMob46.call(this,m,d,dir,fuente,empuje);
  const hecho=Math.max(0,vidaAntes-Math.max(0,m.vida));
  if(hecho<=0)return r;
  if(k==='vampiro'&&salud<20){salud=Math.min(20,salud+hecho*.25);actualizarHUD();emitirParticulas(jugador.pos.x,jugador.pos.y+1.4,jugador.pos.z,0xcc1133,4,1,.5,-1);}
  if(k==='escarcha'){m.lento46=2;emitirParticulas(m.pos.x,m.pos.y+m.alto*.5,m.pos.z,0xaee8ff,10,1.8,.6,2);}
  if(k==='piro')m.fuego=Math.max(m.fuego||0,3);
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
    if(kit46()==='tanque'&&tipo!=='vacio')n*=.85;
    if(kit46()==='ninja'&&K46.dash>0)return;
  }
  return _danarJugador46.call(this,n,tipo,dir);
};

/* ---------- Habilidades activas (G) ---------- */
function usarHabilidad46(){
  if(!enBW46())return;
  const k=kit46();if(!HABILIDAD46[k])return;
  if(K46.cd>0){mostrarAvisoBW&&mostrarAvisoBW(`Habilidad lista en ${Math.ceil(K46.cd)} s`,'#aaa');return;}
  const fx=-Math.sin(jugador.yaw),fz=-Math.cos(jugador.yaw);
  if(k==='ninja'){
    jugador.vel.x=fx*17;jugador.vel.z=fz*17;jugador.vel.y=Math.max(jugador.vel.y,2.5);K46.dash=.35;
    emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x8844ff,16,2,.5,0);sonar('embestida',null,.6);
  }else if(k==='martillo'){
    if(!jugador.suelo){mostrarAvisoBW&&mostrarAvisoBW('Tienes que estar en el suelo','#aaa');return;}
    jugador.vel.y=12;jugador.vel.x+=fx*3;jugador.vel.z+=fz*3;K46.cayendoMartillo=true;
    emitirParticulas(jugador.pos.x,jugador.pos.y,jugador.pos.z,0xbbbbbb,14,3,.5,6);sonar('embestida',null,.6);
  }
  K46.cd=HABILIDAD46[k];
}
function golpeMartillo46(){
  const p=jugador.pos;let n=0;
  for(const m of mobs){if(!esEnemigo46(m))continue;const dx=m.pos.x-p.x,dz=m.pos.z-p.z,d=Math.hypot(dx,dz);
    if(d<4.5&&Math.abs(m.pos.y-p.y)<3){herirMob(m,5,{x:dx/(d||1),z:dz/(d||1)},'jugador',1);n++;}}
  for(let a=0;a<6.28;a+=.4)emitirParticulas(p.x+Math.cos(a)*2.5,p.y+.2,p.z+Math.sin(a)*2.5,0x9a8a7a,3,2,.5,8);
  sonar('explosion',{x:p.x,y:p.y,z:p.z},.5);
  if(typeof sacudida!=='undefined')sacudida=Math.max(sacudida,.6);
  if(n)mostrarAvisoBW&&mostrarAvisoBW(`¡Golpe de martillo! ×${n}`,'#ffb300');
}
document.addEventListener('keydown',e=>{
  if(e.repeat||estado!=='jugando')return;
  if(e.code==='KeyG'){usarHabilidad46();return;}
  // Doble salto del Saltarín
  if(e.code==='Space'&&enBW46()&&kit46()==='saltarin'&&!jugador.suelo&&!jugador.vuela&&!jugador.enAgua&&!K46.dobleUsado){
    K46.dobleUsado=true;jugador.vel.y=7.8;
    emitirParticulas(jugador.pos.x,jugador.pos.y,jugador.pos.z,0xffffff,10,1.5,.4,2);sonar('recoger',null,.3);
  }
});

/* ---------- Cada fotograma ---------- */
const bajasPrevias46={n:0};
const _actualizarFinal46=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal46(dt);
  K46.cd=Math.max(0,K46.cd-dt);K46.dash=Math.max(0,K46.dash-dt);
  if(!(typeof BW!=='undefined'&&BW&&BW.activo&&!BW.fin&&BW.yo)){pintarHudKit46(false);return;}
  const yo=BW.yo, k=kit46();
  // Bajas: recompensas de kit
  if(BW.bajas46===undefined)BW.bajas46=yo.bajas;
  const nuevas=yo.bajas-BW.bajas46;BW.bajas46=yo.bajas;
  if(nuevas>0&&yo.vivo){
    if(k==='cazarrecompensas'){darBW(I.lingoteHierro,8*nuevas);darBW(I.lingoteOro,3*nuevas);mostrarAvisoBW&&mostrarAvisoBW(`Recompensa: +${8*nuevas} hierro +${3*nuevas} oro`,'#ffd84a');}
    if(k==='segador'){salud=Math.min(20,salud+6);efectos.rapidez={t:3,n:2};actualizarHUD();
      emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x66ffdd,18,2,.8,-2);sonar('recoger',null,.6);}
    if(k==='barbaro')subirEspada46();
  }
  if(!enBW46()){pintarHudKit46(true);return;}
  if(jugador.suelo){K46.dobleUsado=false;
    if(K46.cayendoMartillo&&jugador.vel.y<=0){K46.cayendoMartillo=false;golpeMartillo46();}}
  if(k==='saltarin'&&(!efectos.salto||efectos.salto.t<1))efectos.salto={t:2,n:1};
  if(k==='planeador'&&!jugador.suelo&&!jugador.vuela&&teclas.Space&&jugador.vel.y<-2.4){
    jugador.vel.y=-2.4;if(Math.random()<dt*10)emitirParticulas(jugador.pos.x,jugador.pos.y+1.8,jugador.pos.z,0xffffff,1,.4,.5,0);}
  if(k==='constructor'){K46.rellenoT+=dt;if(K46.rellenoT>=10){K46.rellenoT=0;if(contarInv(lanaYo())<64)darBW(lanaYo(),2);}}
  if(k==='arquero'){K46.flechaT+=dt;if(K46.flechaT>=8){K46.flechaT=0;if(contarInv(I.flecha)<16)darBW(I.flecha,1);}}
  if(k==='medico'&&(K46.curaAliados=(K46.curaAliados||0)+dt)>=3){K46.curaAliados=0;
    for(const m of BW.bots||[])if(!m.muerto&&m.bw&&m.bw.equipo===yo.equipo&&m.pos.distanceTo(jugador.pos)<6&&m.vida<vidaMax46(m)){
      m.vida=Math.min(vidaMax46(m),m.vida+2);emitirParticulas(m.pos.x,m.pos.y+m.alto,m.pos.z,0xff6688,3,.8,.6,-1);}}
  if(K46.dash>0&&Math.random()<.6)emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x8844ff,2,.4,.35,0);
  pintarHudKit46(true);
};

/* ---------- Indicador del kit en pantalla ---------- */
{const st=document.createElement('style');st.textContent=`
#kitHud46{position:fixed;left:calc(50% - 300px);bottom:12px;transform:translateX(-100%);z-index:4;pointer-events:none;display:none;align-items:center;gap:8px;
  background:rgba(10,12,20,.6);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:5px 10px 5px 5px;font:12px system-ui,sans-serif;color:#eee}
#kitHud46 img{width:30px;height:30px;image-rendering:pixelated;background:rgba(0,0,0,.3);border-radius:5px;padding:2px}
#kitHud46 b{display:block;font-size:13px}
#kitHud46 .barra46{width:90px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin-top:3px;overflow:hidden}
#kitHud46 .barra46 i{display:block;height:100%}
#btnKit46{position:fixed;right:150px;bottom:150px;z-index:5;width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:rgba(0,0,0,.35);color:#fff;font:bold 18px system-ui;display:none}
@media (max-width:900px){#kitHud46{left:8px;transform:none;bottom:70px}}
#bwKits45 .rareza46{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:1px 7px;border-radius:9px;color:#111}
#bwKits45 .activa46{font-size:10px;color:#ffd84a;font-weight:700}
#bwKits45 .seccion46{grid-column:1/-1;margin:6px 0 0;font:700 13px system-ui;letter-spacing:1px;text-transform:uppercase}`;document.head.appendChild(st);}
let hudKitPrevio46='';
function pintarHudKit46(v){
  let el=document.getElementById('kitHud46');
  if(!el){el=document.createElement('div');el.id='kitHud46';document.body.appendChild(el);}
  const kit=kitActual45(), mostrar=v&&kit.id!=='ninguno';
  el.style.display=mostrar?'flex':'none';
  const bt=document.getElementById('btnKit46');
  if(bt)bt.style.display=mostrar&&HABILIDAD46[kit.id]&&(document.getElementById('tactil')&&!document.getElementById('tactil').classList.contains('oculto'))?'block':'none';
  if(!mostrar)return;
  let estadoTxt='Pasivo',prog=1,col=RAREZAS46[kit.r||'comun'][1];
  if(HABILIDAD46[kit.id]){prog=1-K46.cd/HABILIDAD46[kit.id];estadoTxt=K46.cd>0?`G · ${Math.ceil(K46.cd)} s`:'G · ¡Lista!';col=K46.cd>0?'#888':'#7f7';}
  else if(kit.id==='barbaro'){const nv=nivelBarbaro46(),sig=[3,6,10][nv];estadoTxt=sig?`Furia ${BW.yo.bajas}/${sig}`:'Furia máxima';prog=sig?BW.yo.bajas/sig:1;col='#ff6633';}
  else if(kit.id==='constructor'){prog=K46.rellenoT/10;estadoTxt='+2 lana';}
  else if(kit.id==='arquero'){prog=K46.flechaT/8;estadoTxt='+1 flecha';}
  const h=`<img src="${iconoKit45(kit)}" alt=""><div><b>${kit.n}</b>${estadoTxt}<div class="barra46"><i style="width:${(Math.max(0,Math.min(1,prog))*100).toFixed(0)}%;background:${col}"></i></div></div>`;
  if(h!==hudKitPrevio46){el.innerHTML=h;hudKitPrevio46=h;}
}
// Botón táctil para la habilidad
{const b=document.createElement('button');b.id='btnKit46';b.textContent='G';
  b.addEventListener('touchstart',e=>{e.preventDefault();usarHabilidad46();},{passive:false});b.onclick=usarHabilidad46;document.body.appendChild(b);}

/* ---------- Pantalla de kits: ordenada por rareza ---------- */
const _pintarKits46=pintarKits45;
pintarKits45=function(){
  const capa=_pintarKits46.apply(this,arguments);
  const grid=capa.querySelector('.grid45');if(!grid)return capa;
  const tarjetas=[...grid.querySelectorAll('.kit45')];
  grid.innerHTML='';
  for(const r of Object.keys(RAREZAS46)){
    const [nom,col]=RAREZAS46[r];
    const sec=document.createElement('div');sec.className='seccion46';sec.style.color=col;sec.textContent=nom;grid.appendChild(sec);
    KITS45.forEach((k,i)=>{if((k.r||'comun')!==r||!tarjetas[i])return;const t=tarjetas[i];
      if(!t.classList.contains('equipado45'))t.style.borderColor=col+'88';
      const chip=document.createElement('span');chip.className='rareza46';chip.style.background=col;chip.textContent=nom;
      t.insertBefore(chip,t.querySelector('p'));
      if(HABILIDAD46[k.id]){const a=document.createElement('span');a.className='activa46';a.textContent='HABILIDAD ACTIVA · G';t.insertBefore(a,t.querySelector('p'));}
      grid.appendChild(t);});
  }
  return capa;
};
