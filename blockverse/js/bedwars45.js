"use strict";
/* =========================================================
   Bed Wars: marcador nuevo, minerales, monedas y kits,
   y combate con menos sacudida de cámara
   - Marcador lateral rediseñado: evento con barra de progreso,
     equipos en filas con su color, cama y jugadores vivos,
     tus estadísticas, monedas ganadas y kit.
   - Los minerales salen del generador con un pequeño salto,
     brillo del color del mineral y se apilan en un solo
     montón que se ve más grande cuantos más hay.
   - Monedas: se ganan en las partidas (bajas, bajas finales,
     camas, victoria) y se gastan en kits en el menú de Bed
     Wars. El kit equipado se aplica al empezar y al reaparecer.
   - Al recibir un golpe la cámara solo se inclina un poco hacia
     un lado, sin temblar, y el empuje de los golpes es menor.
   ========================================================= */

/* ---------- Guardado (con respaldo en memoria si el navegador no deja guardar) ---------- */
const MEM45={};
function leer45(k,def){try{const v=localStorage.getItem(k);if(v!=null)return JSON.parse(v);}catch(e){}return k in MEM45?MEM45[k]:def;}
function guardar45(k,v){MEM45[k]=v;try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
const monedas45=()=>Math.max(0,leer45('blockverse-bw-monedas',0)|0);
function sumarMonedas45(n){guardar45('blockverse-bw-monedas',monedas45()+n);}
function estadoKits45(){const s=leer45('blockverse-bw-kits',null)||{};return {tengo:Array.isArray(s.tengo)?s.tengo:['ninguno'],equipado:s.equipado||'ninguno'};}
const htmlMoneda45=n=>`<span class="moneda45"></span><b style="color:#ffd84a">${n}</b>`;

/* ---------- Kits ---------- */
const KITS45=[
  {id:'ninguno',n:'Sin kit',p:0,ico:['espada_madera'],d:'Empiezas solo con la espada de madera.'},
  {id:'constructor',n:'Constructor',p:150,ico:['lana_blanco'],d:'Apareces con 24 bloques de lana extra para hacer puentes rápido.'},
  {id:'saltarin',n:'Saltarín',p:150,ico:['botas_cuero'],d:'Salto mejorado durante toda la partida.'},
  {id:'minero',n:'Minero',p:200,ico:['pico_madera'],d:'Pico de madera gratis y Prisa: rompes bloques y camas más rápido.'},
  {id:'arquero',n:'Arquero',p:300,ico:['arco'],d:'Apareces con un arco y 6 flechas.'},
  {id:'velocista',n:'Velocista',p:300,ico:['azucar','botas_cuero'],d:'Rapidez durante toda la partida.'},
  {id:'medico',n:'Médico',p:350,ico:['manzana_dorada','manzanaDorada'],d:'Te curas medio corazón cada 3 segundos.'},
  {id:'guerrero',n:'Guerrero',p:400,ico:['espada_piedra'],d:'Empiezas con espada de piedra en vez de la de madera.'},
  {id:'tanque',n:'Tanque',p:450,ico:['botas_cobre','pantalones_cobre'],d:'Pantalones y botas de cobre desde el principio.'},
];
const kitPorId45=id=>KITS45.find(k=>k.id===id)||KITS45[0];
const kitActual45=()=>kitPorId45(estadoKits45().equipado);
function iconoKit45(k){
  for(const c of k.ico){const id=idClave(c)||(I[c]||0);if(id&&ICONOS[id])return ICONOS[id];}
  const id=idClave('espada_madera');return ICONOS[id]||'';
}
// La lógica de cada kit (objetos, efectos y niveles) está en kits46.js

/* ---------- Monedas durante la partida ---------- */
const PREMIO45={bajas:5,finales:15,camas:30,base:15,victoria:100};
function avisoMonedas45(n,motivo){
  const d=document.createElement('div');d.className='aviso45';
  d.innerHTML=`+${n} <span class="moneda45"></span> <span style="opacity:.8">${motivo}</span>`;
  document.body.appendChild(d);setTimeout(()=>d.remove(),1900);
}
const _actualizarFinal45=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal45(dt);
  if(typeof BW==='undefined'||!BW||!BW.activo||BW.fin||!BW.yo)return;
  const yo=BW.yo;
  // Monedas al conseguir bajas, bajas finales y camas
  if(!BW.cuenta45)BW.cuenta45={bajas:yo.bajas,finales:yo.finales,camas:yo.camas,ganadas:0};
  const c=BW.cuenta45;
  for(const [k,motivo] of [['bajas','baja'],['finales','baja final'],['camas','cama rota']]){
    const d=yo[k]-c[k];
    if(d>0){const n=d*PREMIO45[k];c.ganadas+=n;sumarMonedas45(n);avisoMonedas45(n,motivo);}
    c[k]=yo[k];
  }
};

/* ---------- Recompensas al terminar ---------- */
const _terminarBW45=terminarBW;
terminarBW=function(g){
  const yaFin=BW&&BW.fin;
  const r=_terminarBW45.apply(this,arguments);
  if(yaFin||!BW)return r;
  const gano=g===BW.yo.equipo, c=BW.cuenta45||{ganadas:0};
  const extra=PREMIO45.base+(gano?PREMIO45.victoria:0);
  sumarMonedas45(extra);
  const total=c.ganadas+extra;
  const t=document.querySelector('#bwFin .tarjeta');
  if(t){const p=document.createElement('p');p.className='premio45';
    p.innerHTML=`Monedas ganadas: ${htmlMoneda45('+'+total)} <span style="opacity:.75">(${gano?'victoria +100 · ':''}partida +15${c.ganadas?` · combate +${c.ganadas}`:''})</span><br>Tienes ${htmlMoneda45(monedas45())} · Gástalas en <b>Kits</b> en el menú de Bed Wars`;
    t.insertBefore(p,t.querySelector('button'));}
  return r;
};

/* ---------- Marcador lateral nuevo ---------- */
{const st=document.createElement('style');st.textContent=`
#bwMarcador{position:fixed;right:12px;top:50%;transform:translateY(-50%);min-width:216px;max-width:250px;padding:0;background:rgba(10,12,20,.62);
  border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.35);backdrop-filter:blur(3px);
  font:13px/1.35 system-ui,Segoe UI,Roboto,sans-serif;color:#eee;text-shadow:none;overflow:hidden;pointer-events:none;z-index:4}
#bwMarcador .cab45{padding:8px 12px 6px;background:linear-gradient(90deg,rgba(255,200,40,.25),rgba(255,80,60,.12));border-bottom:1px solid rgba(255,255,255,.1)}
#bwMarcador .cab45 b{display:block;font:15px/1.2 monospace;letter-spacing:2px;color:#ffd84a;text-shadow:1px 1px 0 #000}
#bwMarcador .cab45 span{font-size:11px;color:#aab}
#bwMarcador .ev45{padding:7px 12px 8px;border-bottom:1px solid rgba(255,255,255,.08)}
#bwMarcador .ev45 .fila45{display:flex;justify-content:space-between}
#bwMarcador .ev45 .t45{font-variant-numeric:tabular-nums;color:#7f7;font-weight:600}
#bwMarcador .barra45{height:4px;margin-top:5px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}
#bwMarcador .barra45 i{display:block;height:100%;background:linear-gradient(90deg,#4fd,#7f7)}
#bwMarcador .eqs45{padding:5px 6px}
#bwMarcador .eq45{display:flex;align-items:center;gap:7px;padding:3px 6px;border-radius:5px}
#bwMarcador .eq45.yo45{background:rgba(255,255,255,.1);box-shadow:inset 3px 0 0 #ffd84a}
#bwMarcador .eq45.fuera45{opacity:.4}
#bwMarcador .eq45.fuera45 .nom45{text-decoration:line-through}
#bwMarcador .cuad45{min-width:16px;padding:0 2px;box-sizing:border-box;height:16px;border-radius:3px;display:flex;align-items:center;justify-content:center;font:bold 10px monospace;color:#000;flex:none}
#bwMarcador .nom45{flex:1;white-space:nowrap}
#bwMarcador .tu45{font-size:10px;color:#ffd84a;font-weight:700;margin-left:4px}
#bwMarcador .est45{font-weight:700;min-width:18px;text-align:right}
#bwMarcador .stats45{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:7px 10px;border-top:1px solid rgba(255,255,255,.08);text-align:center}
#bwMarcador .stats45 div{background:rgba(255,255,255,.06);border-radius:5px;padding:3px 0}
#bwMarcador .stats45 b{display:block;font-size:15px;color:#fff}
#bwMarcador .stats45 span{font-size:10px;color:#aab;text-transform:uppercase;letter-spacing:.5px}
#bwMarcador .pie45{display:flex;justify-content:space-between;align-items:center;padding:6px 12px 8px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#ccd}
.moneda45{display:inline-block;width:.95em;height:.95em;border-radius:50%;vertical-align:-.12em;margin-right:3px;
  background:radial-gradient(circle at 35% 30%,#fff6b0 0 18%,#ffd84a 40%,#d99a00 100%);box-shadow:0 0 0 1px #8a5a00 inset}
.aviso45{position:fixed;right:24px;top:calc(50% - 190px);z-index:6;pointer-events:none;font:700 17px system-ui,sans-serif;color:#ffd84a;
  text-shadow:0 2px 4px #000;animation:subir45 1.9s ease-out forwards}
@keyframes subir45{0%{opacity:0;transform:translateY(14px) scale(.8)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}
.premio45{font-size:15px}
@media (max-width:640px){#bwMarcador{min-width:150px;max-width:170px;font-size:11px;top:auto;bottom:92px;transform:none;right:6px}
  #bwMarcador .stats45,#bwMarcador .cab45 span{display:none}#bwMarcador .eq45{padding:1px 4px}.aviso45{top:auto;bottom:300px}}
#bwKits45{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72)}
#bwKits45.oculto{display:none}
#bwKits45 .caja45{width:min(760px,94vw);max-height:90vh;overflow:auto;background:#1c1f2a;border:2px solid #000;box-shadow:inset 0 0 0 2px #555;border-radius:6px;padding:16px;color:#eee;font:14px system-ui,sans-serif}
#bwKits45 h2{margin:0 0 4px;color:#ffd84a;font:22px monospace;letter-spacing:2px;text-align:center}
#bwKits45 .saldo45{text-align:center;margin-bottom:12px;font-size:16px}
#bwKits45 .grid45{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
#bwKits45 .kit45{background:#2a2e3d;border:2px solid #3a3f52;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center}
#bwKits45 .kit45.equipado45{border-color:#ffd84a;box-shadow:0 0 0 2px rgba(255,216,74,.25)}
#bwKits45 .kit45 img{width:48px;height:48px;image-rendering:pixelated;background:rgba(0,0,0,.25);border-radius:6px;padding:4px}
#bwKits45 .kit45 b{font-size:15px}
#bwKits45 .kit45 p{margin:0;font-size:12px;color:#bbc;min-height:3.2em}
#bwKits45 .kit45 button{width:100%;margin:0;padding:6px 0;font-size:13px}
#bwKits45 .kit45 button:disabled{opacity:.45;cursor:default}
#bwKits45 .pista45{font-size:12px;color:#99a;text-align:center;margin:12px 0 8px}
#bwMonedas45{margin:6px 0 2px;font-size:15px}`;document.head.appendChild(st);}

pintarMarcadorBW=function(){
  const el=document.getElementById('bwMarcador');if(!el||!BW)return;
  const fmt=s=>`${Math.floor(Math.max(0,s)/60)}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
  const ev=EVENTOS_BW[BW.ev], t0=BW.ev>0?EVENTOS_BW[BW.ev-1][0]:0;
  let h=`<div class="cab45"><b>BED WARS</b><span>${typeof TEMA_BW!=='undefined'&&TEMA_BW?TEMA_BW.nombre:''} · ${fmt(BW.t)} jugado</span></div>`;
  if(BW.lobby>0)h+=`<div class="ev45"><div class="fila45"><span>Empieza en</span><span class="t45">${Math.ceil(BW.lobby)}</span></div></div>`;
  else if(ev){const prog=Math.min(100,Math.max(0,(BW.t-t0)/(ev[0]-t0)*100));
    h+=`<div class="ev45"><div class="fila45"><span>${ev[1]}</span><span class="t45">${fmt(ev[0]-BW.t)}</span></div><div class="barra45"><i style="width:${prog.toFixed(1)}%"></i></div></div>`;}
  h+='<div class="eqs45">';
  for(const q of BW.equipos){const E=EQUIPOS_BW[q.id],yoAqui=q.id===BW.yo.equipo;
    const vivos=Math.max(q.vivos,yoAqui&&BW.yo.vivo?1:0), fuera=!q.cama&&vivos<=0;
    const est=q.cama?'<span style="color:#6f6" title="Cama">✔</span>':fuera?'<span style="color:#f66">✘</span>':`<span style="color:#ffd84a">${vivos}</span>`;
    h+=`<div class="eq45${yoAqui?' yo45':''}${fuera?' fuera45':''}"><span class="cuad45" style="background:${E.col}">${E.letra}</span><span class="nom45">${E.nombre}${yoAqui?'<span class="tu45">TÚ</span>':''}</span><span class="est45">${est}</span></div>`;}
  h+='</div>';
  h+=`<div class="stats45"><div><b>${BW.yo.bajas}</b><span>Bajas</span></div><div><b>${BW.yo.finales}</b><span>Finales</span></div><div><b>${BW.yo.camas}</b><span>Camas</span></div></div>`;
  const ganadas=BW.cuenta45?BW.cuenta45.ganadas:0;
  h+=`<div class="pie45"><span>${htmlMoneda45('+'+ganadas)}</span><span>Kit: <b style="color:#fff">${kitActual45().n}</b></span></div>`;
  el.innerHTML=h;
};

/* ---------- Pantalla de kits en el menú de Bed Wars ---------- */
function pintarKits45(){
  let capa=document.getElementById('bwKits45');
  if(!capa){capa=document.createElement('div');capa.id='bwKits45';capa.className='oculto';document.body.appendChild(capa);}
  const s=estadoKits45(), m=monedas45();
  capa.innerHTML=`<div class="caja45"><h2>KITS</h2><div class="saldo45">Tienes ${htmlMoneda45(m)} monedas</div><div class="grid45">${KITS45.map(k=>{
    const tengo=k.p===0||s.tengo.includes(k.id), eq=s.equipado===k.id;
    const btn=eq?'<button disabled>Equipado ✔</button>':tengo?`<button data-eq="${k.id}">Equipar</button>`:`<button data-comprar="${k.id}" ${m<k.p?'disabled':''}>Comprar · ${k.p}</button>`;
    return `<div class="kit45${eq?' equipado45':''}"><img src="${iconoKit45(k)}" alt=""><b>${k.n}</b><p>${k.d}</p>${btn}</div>`;}).join('')}</div>
    <div class="pista45">Ganas monedas jugando: baja +${PREMIO45.bajas} · baja final +${PREMIO45.finales} · cama rota +${PREMIO45.camas} · partida +${PREMIO45.base} · victoria +${PREMIO45.victoria}</div>
    <button id="bwKitsVolver" class="secundario">Volver</button></div>`;
  capa.querySelectorAll('[data-comprar]').forEach(b=>b.onclick=()=>{const k=kitPorId45(b.dataset.comprar),e=estadoKits45();
    if(monedas45()<k.p)return;sumarMonedas45(-k.p);if(!e.tengo.includes(k.id))e.tengo.push(k.id);e.equipado=k.id;guardar45('blockverse-bw-kits',e);
    sonar('comprarBW')||0;pintarKits45();pintarSaldoMenu45();});
  capa.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{const e=estadoKits45();e.equipado=b.dataset.eq;guardar45('blockverse-bw-kits',e);sonar('recoger')||0;pintarKits45();pintarSaldoMenu45();});
  capa.querySelector('#bwKitsVolver').onclick=()=>capa.classList.add('oculto');
  return capa;
}
function pintarSaldoMenu45(){
  const el=document.getElementById('bwMonedas45');
  if(el)el.innerHTML=`${htmlMoneda45(monedas45())} monedas · Kit: <b>${kitActual45().n}</b>`;
}
(function(){
  const capa=document.getElementById('pantallaBedwars');if(!capa)return;
  const tar=capa.querySelector('.tarjeta'), stats=tar&&tar.querySelector('#bwStats'), jugar=tar&&tar.querySelector('#bwEmpezar');
  if(!tar||!jugar)return;
  const saldo=document.createElement('div');saldo.id='bwMonedas45';saldo.className='pista';
  (stats||jugar).insertAdjacentElement(stats?'afterend':'beforebegin',saldo);
  const b=document.createElement('button');b.id='bwKits';b.textContent='Kits…';
  tar.insertBefore(b,jugar);
  b.onclick=()=>pintarKits45().classList.remove('oculto');
  pintarSaldoMenu45();
  document.getElementById('btnBedwars')?.addEventListener('click',pintarSaldoMenu45);
})();

/* ---------- Minerales: salen con un salto y se apilan en un montón ---------- */
const COLOR_MINERAL45=()=>({[I.lingoteHierro]:0xe8e8e8,[I.lingoteOro]:0xffcc33,[I.diamante]:0x55ffff,[I.esmeralda]:0x44ff66});
const _soltarGen45=soltarGen;
soltarGen=function(g,id,max){
  if(contarCerca(g,id)>=max)return;
  const col=COLOR_MINERAL45()[id]||0xffffff;
  // Si ya hay un montón de ese mineral en el generador, se suma a él
  let mont=null;
  for(const e of entidades)if(e.tipo==='item'&&!e.muerta&&e.recogiendo===undefined&&e.pila.id===id&&Math.abs(e.pos.x-g.x)<1.1&&Math.abs(e.pos.z-g.z)<1.1){mont=e;break;}
  if(mont&&mont.pila.n<maxPila(id)){mont.pila.n++;mont.pulso45=.28;mont.vel.y=Math.max(mont.vel.y,1.6);}
  else{
    const antes=entidades.length;
    _soltarGen45(g,id,max);
    const e=entidades[entidades.length-1];
    if(entidades.length>antes&&e&&e.tipo==='item'){e.vel.set((Math.random()-.5)*.5,3.2,(Math.random()-.5)*.5);e.pulso45=.28;}
  }
  emitirParticulas(g.x,g.y+.2,g.z,col,id===I.lingoteHierro?3:8,1.4,.45,-1.5);
  const raro=id===I.diamante||id===I.esmeralda;
  if(typeof tocar==='function')tocar({x:g.x,y:g.y,z:g.z},v=>{
    tonoSnd(raro?1500:2200,raro?2300:2600,raro?.18:.05,'sine',(raro?.07:.018)*v);
    if(raro)tonoSnd(2300,3100,.16,'sine',.05*v,.07);
  },1,raro?24:7);
};
// Un montón se ve con varias copias según cuántos hay, y da un pequeño bote al crecer
const OFS45=[[.11,.05,.08],[-.1,.1,-.07],[.04,.16,-.11]];
const _actualizarItem45=actualizarItem;
actualizarItem=function(e,dt){
  const r=_actualizarItem45(e,dt);
  if(e.muerta||e.recogiendo!==undefined||!e.malla)return r;
  const n=e.pila.n, copias=n>=16?4:n>=6?3:n>=2?2:1;
  if(e.copias45!==copias){
    if(e.extra45)for(const c of e.extra45)e.malla.remove(c);
    e.extra45=[];
    const esSprite=e.malla.isSprite;
    for(let k=1;k<copias;k++){
      const c=esSprite?new THREE.Sprite(e.malla.material):new THREE.Mesh(e.malla.geometry,e.malla.material);
      const o=OFS45[k-1], f=esSprite?1/Math.max(.01,e.malla.scale.x):1;
      c.position.set(o[0]*f,o[1]*f,o[2]*f);if(!esSprite)c.rotation.y=k*.9;
      e.malla.add(c);e.extra45.push(c);
    }
    e.copias45=copias;
  }
  if(e.esc45===undefined)e.esc45=e.malla.scale.x;
  if(e.pulso45>0){e.pulso45=Math.max(0,e.pulso45-dt);const k=1+.35*Math.sin((1-e.pulso45/.28)*Math.PI);e.malla.scale.setScalar(e.esc45*k);
    if(e.malla.isSprite)e.malla.scale.z=1;}
  return r;
};
if(typeof ACT_ENT!=='undefined')ACT_ENT.item=actualizarItem;

/* ---------- Golpes: la cámara se inclina un poco, sin temblar ---------- */
let ladoGolpe45=1, golpe45=null;
const _danarJugador45=danarJugador;
danarJugador=function(n,tipo,dir){
  if(dir&&(dir.x||dir.z)){
    const rx=Math.cos(jugador.yaw), rz=-Math.sin(jugador.yaw);
    ladoGolpe45=(dir.x*rx+dir.z*rz)>=0?1:-1;
    if(tipo==='mob'||tipo==='flecha')golpe45={t:tiempoJuego,vx:jugador.vel.x,vz:jugador.vel.z};
  }else ladoGolpe45=Math.random()<.5?1:-1;
  return _danarJugador45.apply(this,arguments);
};
const _actualizarPasos45=actualizarPasos;
actualizarPasos=function(dt){
  _actualizarPasos45(dt);
  const s=sacudida;
  efectoCam.rz-=Math.sin(s*20)*s*.12;          // quita el temblor antiguo
  efectoCam.rz+=-ladoGolpe45*.04*s*s;           // inclinación suave hacia el lado del golpe
};
// Empuje de los golpes más corto: los bots ya no te lanzan tan lejos
const _fisicaJugador45=fisicaJugador;
fisicaJugador=function(dt,entrada){
  if(golpe45){
    if(tiempoJuego-golpe45.t<.1){
      const dx=jugador.vel.x-golpe45.vx, dz=jugador.vel.z-golpe45.vz, l=Math.hypot(dx,dz), max=5.2;
      if(l>max){jugador.vel.x=golpe45.vx+dx/l*max;jugador.vel.z=golpe45.vz+dz/l*max;}
      jugador.vel.y=Math.min(jugador.vel.y,4.2);
    }
    golpe45=null;
  }
  return _fisicaJugador45.apply(this,arguments);
};
