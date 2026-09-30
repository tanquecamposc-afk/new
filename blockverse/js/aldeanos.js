"use strict";
/* =========================================================
   Aldeanos y criaturas mejorados:
   · 13 profesiones (granjero, bibliotecario, herrero, clérigo,
     pescador, carnicero, cartógrafo, flechero, armero, pastor,
     albañil, curtidor y herramientero) con su ropa y sus
     ofertas, que suben de nivel (novato → maestro) y
     desbloquean más ofertas al comerciar.
   · Reabastecen dos veces al día, duermen de noche junto al
     centro de la aldea, los granjeros cosechan y replantan,
     los niños corretean, tienen hijos, saludan y protestan.
   · Si les pegas se enfadan y los gólems te persiguen.
   · Los zombis cazan aldeanos y pueden convertirlos en
     aldeanos zombi; las crías siguen a sus padres y los
     esqueletos huyen de los lobos.
   ========================================================= */
const K=k=>I[k]!==undefined?I[k]:B[k]!==undefined?B[k]:null;
const ESM=I.esmeralda;
Object.assign(PROFESIONES,{
  pescador:{nombre:'Pescador',ropa:0x3a6a8a,extra:0xd8c070},
  carnicero:{nombre:'Carnicero',ropa:0xe8e8e0,extra:0xb03030},
  cartografo:{nombre:'Cartógrafo',ropa:0x6a5a3a,extra:0xd0b040},
  flechero:{nombre:'Flechero',ropa:0x7a8a4a,extra:0xe8e8e8},
  armero:{nombre:'Armero',ropa:0x4a4a4a,extra:0x222222},
  pastor:{nombre:'Pastor',ropa:0xd8d8d8,extra:0x6a4a30},
  albanil:{nombre:'Albañil',ropa:0x8a6a4a,extra:0x9a9a9a},
  curtidor:{nombre:'Curtidor',ropa:0x8a5a30,extra:0x5a3a20},
  herramientero:{nombre:'Herramientero',ropa:0x3a3a3a,extra:0x2a2a2a},
  ninio:{nombre:'Niño',ropa:0x6a4a3a,extra:0x6a4a3a},
});
// Ofertas por nivel: [pagaId, pagaN, daId, daN]
const OFERTAS_NIVEL={
  granjero:[[['trigo',20,ESM,1],['patata',26,ESM,1],['zanahoria',22,ESM,1],['remolacha',15,ESM,1],[ESM,1,'pan',6]],
    [['calabaza',6,ESM,1],[ESM,1,'pastelCalabaza',4],[ESM,1,'manzana',4]],[['sandia',4,ESM,1],[ESM,3,'galleta',18]],
    [[ESM,1,'pastelCalabaza',1],[ESM,1,'estofado',1]],[[ESM,3,'zanahoriaDorada',3],[ESM,4,'melonBrillante',3]]],
  bibliotecario:[[['papel',24,ESM,1],[ESM,9,'estanteria',1]],[['libro',4,ESM,1],[ESM,1,'farol',1]],[['bolsaTinta',5,ESM,1],[ESM,1,'vidrio',4]],
    [[ESM,5,'reloj',1],[ESM,4,'brujula',1]],[[ESM,20,'etiqueta',1]]],
  herrero:[[['carbon',15,ESM,1],[ESM,5,'hacha_hierro',1]],[['lingoteHierro',4,ESM,1],[ESM,1,'espada_hierro',1]],[['pedernal',24,ESM,1],[ESM,7,'hacha_diamante',1]],
    [['diamante',1,ESM,1],[ESM,13,'espada_diamante',1]],[[ESM,17,'hacha_diamante',1]]],
  clerigo:[[['carnePodrida',32,ESM,1],[ESM,1,'redstone',2]],[['lingoteOro',3,ESM,1],[ESM,1,'lapis',1]],[['pataConejo',2,ESM,1],[ESM,4,'piedraLuminosa',1]],
    [['escamaTortuga',4,ESM,1],[ESM,5,'perlaEnder',1]],[['verrugaNether',22,ESM,1],[ESM,3,'botellaXP',1]]],
  pescador:[[['cuerda',20,ESM,1],['carbon',10,ESM,1],[ESM,1,'bacalaoCocinado',6]],[['bacalaoCrudo',15,ESM,1],[ESM,1,'salmonCocinado',6]],
    [['salmonCrudo',13,ESM,1],[ESM,3,'canaPescar',1]],[['pezTropical',6,ESM,1]],[['pezGlobo',4,ESM,1],[ESM,1,'barco',1]]],
  carnicero:[[['polloCrudo',14,ESM,1],['cerdoCrudo',7,ESM,1],['conejoCrudo',4,ESM,1]],[['carbon',15,ESM,1],[ESM,1,'cerdoAsado',5],[ESM,1,'polloAsado',8]],
    [['corderoCrudo',7,ESM,1],['resCruda',10,ESM,1]],[['bayasDulces',10,ESM,1]],[[ESM,1,'estofadoConejo',1]]],
  cartografo:[[['papel',24,ESM,1],[ESM,7,'mapa',1]],[['panel',11,ESM,1],[ESM,4,'brujula',1]],[['brujula',1,ESM,1],[ESM,10,'mapa',1]],
    [[ESM,2,'mesaCartografia',1]],[[ESM,8,'etiqueta',1]]],
  flechero:[[['palo',32,ESM,1],[ESM,1,'flecha',16]],[['pedernal',26,ESM,1],[ESM,2,'arco',1]],[['cuerda',14,ESM,1],[ESM,3,'ballesta',1]],
    [['pluma',24,ESM,1],[ESM,2,'flechaEspectral',5]],[[ESM,2,'mesaFlechas',1]]],
  armero:[[['carbon',15,ESM,1],[ESM,5,'casco_hierro',1],[ESM,9,'pechera_hierro',1]],[['lingoteHierro',4,ESM,1],[ESM,7,'pantalones_hierro',1],[ESM,4,'botas_hierro',1]],
    [['cubo',1,ESM,1],[ESM,5,'escudo',1]],[['diamante',1,ESM,1],[ESM,13,'casco_diamante',1]],[[ESM,21,'pechera_diamante',1]]],
  pastor:[[['lana',18,ESM,1],[ESM,2,'lana',1]],[['tinte_negro',12,ESM,1],['tinte_blanco',12,ESM,1]],[[ESM,3,'cama',1],[ESM,1,'alfombra_blanco',4]],
    [['tinte_amarillo',12,ESM,1],[ESM,2,'telar',1]],[[ESM,3,'cama',1]]],
  albanil:[[['bolaArcilla',10,ESM,1],[ESM,1,'ladrillo',10]],[['piedra',20,ESM,1],[ESM,1,'piedraCincelada',4]],[['granito',16,ESM,1],['diorita',16,ESM,1],['andesita',16,ESM,1]],
    [[ESM,1,'terracota_rojo',1],[ESM,1,'esmaltada_azul',1]],[['cuarzo',12,ESM,1],[ESM,1,'bloqueCuarzo',1]]],
  curtidor:[[['cuero',6,ESM,1],[ESM,3,'pantalones_cuero',1],[ESM,7,'pechera_cuero',1]],[['pedernal',26,ESM,1],[ESM,5,'casco_cuero',1],[ESM,4,'botas_cuero',1]],
    [['pielConejo',9,ESM,1],[ESM,7,'pechera_cuero',1]],[['escamaTortuga',4,ESM,1],[ESM,6,'silla',1]],[[ESM,5,'silla',1]]],
  herramientero:[[['carbon',15,ESM,1],[ESM,1,'hacha_piedra',1],[ESM,1,'pala_piedra',1],[ESM,1,'pico_piedra',1]],[['lingoteHierro',4,ESM,1],[ESM,1,'campana',1]],
    [['pedernal',30,ESM,1],[ESM,1,'pico_hierro',1]],[['diamante',1,ESM,1],[ESM,12,'hacha_diamante',1]],[[ESM,13,'pico_diamante',1]]],
};
const XP_NIVEL=[0,10,70,150,250], NOMBRE_NIVEL=['Novato','Aprendiz','Oficial','Experto','Maestro'], XP_OFERTA=[2,10,20,30,30];
const COLOR_NIVEL=['#8a8a8a','#d8d8d8','#f0c030','#40d060','#60e0e0'];
function ofertaDe(o,nivel){
  const [a,na,b,nb]=o, ia=typeof a==='string'?K(a):a, ib=typeof b==='string'?K(b):b;
  if(ia==null||ib==null||!ITEMS[ia]||!ITEMS[ib])return null;
  return {costo:[ia,na],da:[ib,nb],usos:0,max:ib===ESM?16:12,xp:XP_OFERTA[nivel-1]};
}
function ofertasNivel(pr,nivel,n=2){
  const pool=(OFERTAS_NIVEL[pr]&&OFERTAS_NIVEL[pr][nivel-1]||[]).map(o=>ofertaDe(o,nivel)).filter(Boolean);
  const res=[];while(pool.length&&res.length<n)res.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  return res;
}
const PROF_TODAS=Object.keys(OFERTAS_NIVEL);

/* ---------- Crear: profesión, ropa y ofertas ---------- */
function vestir(m){
  const g=m.grupo, pr=m.profesion, c=(w,h,d,x,y,z,col)=>{const p=parte(w,h,d,col,false,null);p.position.set(x,y,z);g.add(p);return p;};
  switch(pr){
    case 'pescador':c(.72,.06,.72,0,2.24,0,0xd8c070);c(.4,.16,.4,0,2.32,0,0xd8c070);break;
    case 'carnicero':c(.54,.7,.02,0,1.1,.18,0xf4f4f4);c(.5,.1,.5,0,2.24,0,0xb03030);break;
    case 'cartografo':c(.1,.1,.02,-.11,1.98,.24,0xf0d040);break;
    case 'flechero':c(.5,.12,.5,0,2.24,0,0x6a8a3a);c(.04,.34,.04,.16,2.4,0,0xf0f0f0);break;
    case 'armero':c(.48,.3,.04,0,1.95,.25,0x2a2a2a);c(.34,.06,.02,0,1.99,.275,0x40a0ff);break;
    case 'pastor':c(.56,.12,.56,0,2.24,0,0x6a4a30);break;
    case 'albanil':c(.54,.7,.02,0,1.1,.18,0x8a7a6a);break;
    case 'curtidor':c(.54,.7,.02,0,1.1,.18,0x6a3a1a);break;
    case 'herramientero':c(.54,.7,.02,0,1.1,.18,0x1a1a1a);c(.1,.2,.06,.24,1.0,.2,0x9a9aa4);break;
  }
  // Insignia de nivel en el cinturón
  m.insignia=c(.12,.12,.02,.15,1.42,.35,parseInt(COLOR_NIVEL[(m.nivelA||1)-1].slice(1),16));
}
const _crearMobAld=crearMob;
crearMob=function(tipo,x,y,z,opc={}){
  if(tipo==='aldeano'){
    opc={...opc};
    if(opc.bebe){opc.profesion='ninio';opc.ofertas=null;}
    else if(!opc.profesionFija){opc.profesion=PROF_TODAS[Math.floor(Math.random()*PROF_TODAS.length)];
      const base=opc.profesion==='bibliotecario'&&opc.ofertas?opc.ofertas.filter(o=>o.enc):[];
      opc.ofertas=[...ofertasNivel(opc.profesion,1,2),...base];}
  }
  const m=_crearMobAld(tipo,x,y,z,opc);
  if(tipo==='aldeano'){m.nivelA=1;m.xpA=0;if(m.profesion!=='ninio')vestir(m);}
  return m;
};

/* ---------- Comercio: nivel, experiencia y reabastecimiento ---------- */
function subirNivel(m){
  if(m.nivelA>=5)return;
  m.nivelA++; m.ofertas.push(...ofertasNivel(m.profesion,m.nivelA,2));
  if(m.insignia)m.insignia.material.color.set(COLOR_NIVEL[m.nivelA-1]);
  sonar('nivel',m.pos); sonar('aldeanoSi',m.pos);
  emitirParticulas(m.pos.x,m.pos.y+2,m.pos.z,0x40ff60,14,1.4,1.2,-1); emitirParticulas(m.pos.x,m.pos.y+2,m.pos.z,0xb070ff,8,1.2,1.2,-1);
  mostrarMensaje(`${PROFESIONES[m.profesion].nombre} sube a ${NOMBRE_NIVEL[m.nivelA-1]}`);
}
const _pintarOfertasAld=pintarOfertas;
pintarOfertas=function(){
  _pintarOfertasAld();
  const m=ui&&ui.aldeano, cont=document.getElementById('ofertas'); if(!m||!cont)return;
  if(m.nivelA===undefined){m.nivelA=1;m.xpA=0;}
  const niv=m.nivelA, sig=XP_NIVEL[niv]??XP_NIVEL[4], ant=XP_NIVEL[niv-1];
  const cab=document.createElement('div');cab.className='nivelAldeano';
  cab.innerHTML=`<span style="color:${COLOR_NIVEL[niv-1]}">● ${NOMBRE_NIVEL[niv-1]}</span><div class="barraNivelA"><i style="width:${niv>=5?100:Math.round((m.xpA-ant)/(sig-ant)*100)}%"></i></div>`;
  cont.prepend(cab);
  [...cont.querySelectorAll('.oferta')].forEach((b,i)=>{
    const o=(m.ofertas||[])[i], orig=b.onmousedown; if(!o||!orig)return;
    b.onmousedown=e=>{const antes=o.usos;orig(e);
      if(o.usos>antes){m.xpA+=o.xp||2;sonar('aldeanoSi',m.pos,.8);emitirParticulas(m.pos.x,m.pos.y+2.1,m.pos.z,0x40ff60,5,.8,.8,-1);
        while(m.nivelA<5&&m.xpA>=XP_NIVEL[m.nivelA])subirNivel(m);
        setTimeout(()=>{if(ui&&ui.aldeano===m)pintarOfertas();},0);}
      else sonar('aldeanoNo',m.pos,.8);};
  });
};
{const s=document.createElement('style');s.textContent=`.nivelAldeano{display:flex;align-items:center;gap:10px;font:14px var(--pixel);margin-bottom:4px;color:#404040;}
.barraNivelA{flex:1;height:6px;background:#555;border:1px solid #222;} .barraNivelA i{display:block;height:100%;background:#60e060;}`;document.head.appendChild(s);}
let franjaPrev=-1;
function reabastecer(){
  const franja=tiempoDia<.1?0:tiempoDia<.3?1:2;
  if(franja!==franjaPrev&&franjaPrev!==-1&&franja!==2)for(const m of mobs)if(m.tipo==='aldeano'&&m.ofertas){m.ofertas.forEach(o=>o.usos=0);if(m.pos.distanceTo(jugador.pos)<16)sonar('aldeanoTrabajo',m.pos);}
  franjaPrev=franja;
}

/* ---------- Comportamiento: noche, trabajo, niños y familia ---------- */
const MADURO=()=>new Set([B.trigo0+7,B.zanahorias0+3,B.patatas0+3,B.remolachas0+3]);
let _maduros=null;
function cultivoMaduroCerca(m){
  _maduros=_maduros||MADURO();
  for(let k=0;k<20;k++){const x=Math.floor(m.pos.x+(Math.random()-.5)*16),z=Math.floor(m.pos.z+(Math.random()-.5)*16);
    for(let y=Math.floor(m.pos.y)+2;y>=Math.floor(m.pos.y)-2;y--){const b=getBloque(x,y,z);if(_maduros.has(b))return {x,y,z,b};}}
  return null;
}
IA_EXTRA.aldeanoNoche=(m,dt,c)=>{
  const ox=m.origen.x-m.pos.x,oz=m.origen.z-m.pos.z,d=Math.hypot(ox,oz);
  if(d>4&&!m.durmiendo){mover(m,ox,oz,m.def.vel);return true;}
  m.mover=false; m.durmiendo=true; return true;
};
IA_EXTRA.aldeanoTrabajo=(m,dt,c)=>{
  const t=m.tarea; if(!t){m.mover=false;return true;}
  const dx=t.x+.5-m.pos.x,dz=t.z+.5-m.pos.z,d=Math.hypot(dx,dz);
  m.tareaT=(m.tareaT||0)+dt;
  if(d>2.6&&m.tareaT<12){mover(m,dx,dz,m.def.vel);return true;}
  m.tareaT=0; if(d>2.6){m.tarea=null;return true;}
  m.mover=false; m.yawObj=Math.atan2(dx,dz); m.golpeT=.35;
  const b=getBloque(t.x,t.y,t.z);
  if(_maduros.has(b)){const base=b-(b===B.trigo0+7?7:3);setBloque(t.x,t.y,t.z,base);sonar('cosechar',t,.8);sonar('aldeanoTrabajo',m.pos,.6);
    particulasBloque(t.x+.5,t.y+.4,t.z+.5,BLOQUES[b].lado,6,1,.4);m.cosecha=(m.cosecha||0)+1;}
  m.tarea=null; return true;
};
IA_EXTRA.aldeanoNinio=(m,dt,c)=>{
  m.t-=dt; if(m.t<=0){m.t=.6+Math.random()*1.5;m.mover=Math.random()<.8;m.yawObj=Math.random()*Math.PI*2;}
  m.velObj=m.def.vel*1.9; if(m.suelo&&Math.random()<dt*.6)m.vel.y=5; return true;
};
IA_EXTRA.cazaAldeano=(m,dt,c)=>{
  const v=m.presaAld; if(!v||v.muerto){m.presaAld=null;return true;}
  const dx=v.pos.x-m.pos.x,dz=v.pos.z-m.pos.z,d=Math.hypot(dx,dz);
  mover(m,dx,dz,m.def.vel*1.05);
  if(d<m.ancho+v.ancho+.8&&Math.abs(v.pos.y-m.pos.y)<1.5&&m.cd<=0){m.cd=1;m.golpeT=.35;v.mordidoZombi=tiempoJuego;herirMob(v,m.def.dano||3,{x:dx/(d||1),z:dz/(d||1)},'zombi');}
  return true;
};
IA_EXTRA.sigueMadre=(m,dt,c)=>{const p=m.madre;if(!p||p.muerto)return true;const dx=p.pos.x-m.pos.x,dz=p.pos.z-m.pos.z;mover(m,dx,dz,m.def.vel*1.2);return true;};
IA_EXTRA.huyeLobo=(m,dt,c)=>{const w=m.loboCerca;if(w)mover(m,m.pos.x-w.pos.x,m.pos.z-w.pos.z,m.def.vel*1.3);return true;};
const conIA=(m,ia)=>{const d=m.def;const k='_ia_'+ia;return d[k]||(d[k]={...d,ia});};
const ZOMBIS=new Set(['zombi','aldeanoZombi','momia','ahogado']);
let familiaT=10;
const _actualizarMobAld=actualizarMob;
actualizarMob=function(m,dt){
  let defOrig=null;
  const cambiar=ia=>{defOrig=m.def;m.def=conIA(m,ia);};
  const noche=sol<-.05&&dim===DIMS.superficie;
  if(m.tipo==='aldeano'&&!(ui&&ui.aldeano===m)){
    const zombiCerca=mobs.some(o=>ZOMBIS.has(o.tipo)&&o.pos.distanceTo(m.pos)<8);
    if(zombiCerca)m.durmiendo=false;
    else if(m.profesion==='ninio'&&!noche&&!(m.huir>0))cambiar('aldeanoNinio');
    else if(noche&&!(m.huir>0))cambiar('aldeanoNoche');
    else{m.durmiendo=false;
      if(m.profesion==='granjero'){m.buscarT=(m.buscarT||0)-dt;if(!m.tarea&&m.buscarT<=0){m.buscarT=3;m.tarea=cultivoMaduroCerca(m);}if(m.tarea)cambiar('aldeanoTrabajo');}}
  }else if(ZOMBIS.has(m.tipo)){
    const jd=m.pos.distanceTo(jugador.pos);
    if(jd>12||!supervivencia()||estado==='muerto'){
      if(!m.presaAld||m.presaAld.muerto||Math.random()<dt*.2)m.presaAld=masCercano(m,o=>o.tipo==='aldeano'||o.tipo==='golem'&&false,16);
      if(m.presaAld)cambiar('cazaAldeano');
    }
  }else if(m.tipo==='esqueleto'||m.tipo==='esqueletoErrante'){
    if(Math.random()<dt*2)m.loboCerca=masCercano(m,o=>o.tipo==='lobo',7);
    if(m.loboCerca&&!m.loboCerca.muerto)cambiar('huyeLobo');
  }else if(m.bebe>0&&m.def&&m.def.tipo==='pasivo'&&!m.domado&&!(m.huir>0)){
    if(!m.madre||m.madre.muerto||Math.random()<dt*.1)m.madre=masCercano(m,o=>o.tipo===m.tipo&&!o.bebe,12);
    if(m.madre&&distMob(m,m.madre)>3.5)cambiar('sigueMadre');
  }
  try{_actualizarMobAld(m,dt);}finally{if(defOrig)m.def=defOrig;}
  if(m.muerto)return;
  // Pose de dormir y "Zzz"
  if(m.tipo==='aldeano'){
    if(m.durmiendo){m.grupo.rotation.z=Math.PI/2;m.grupo.position.y+=.25;if(m.extra.cabeza)m.extra.cabeza.rotation.set(0,0,0);
      if(Math.random()<dt*.8)emitirParticulas(m.pos.x,m.pos.y+.9,m.pos.z,0xffffff,1,.2,1.6,-.6);}
    else if(m.grupo.rotation.z>1)m.grupo.rotation.z=0;
    // Mira al jugador y murmura si se acerca
    const d=m.pos.distanceTo(jugador.pos);
    if(d<4&&!m.durmiendo&&estado==='jugando'){m.hmmT=(m.hmmT||0)-dt;if(m.hmmT<=0){m.hmmT=6+Math.random()*8;sonar('aldeanoHmm',m.pos,.8);}}
  }
};
// Familias: dos aldeanos adultos cerca, de día y con pocas crías, tienen un hijo
function familias(dt){
  familiaT-=dt; if(familiaT>0)return; familiaT=20;
  if(dim!==DIMS.superficie||sol<0)return;
  const ald=mobs.filter(m=>m.tipo==='aldeano'&&!m.bebe&&!m.durmiendo);
  for(const a of ald){if(a.hijoT>tiempoJuego)continue;
    const b=ald.find(o=>o!==a&&o.pos.distanceTo(a.pos)<3&&!(o.hijoT>tiempoJuego));
    if(!b)continue;
    if(contar(m=>m.tipo==='aldeano'&&m.pos.distanceTo(a.pos)<40)>=12)continue;
    a.hijoT=b.hijoT=tiempoJuego+300;
    emitirParticulas(a.pos.x,a.pos.y+2,a.pos.z,0xff6080,8,1,.9,-1);emitirParticulas(b.pos.x,b.pos.y+2,b.pos.z,0xff6080,8,1,.9,-1);
    const h=crearMob('aldeano',(a.pos.x+b.pos.x)/2,a.pos.y+.2,(a.pos.z+b.pos.z)/2,{bebe:true});h.origen.copy(a.origen);
    sonar('aldeanoSi',a.pos);break;
  }
}

/* ---------- Daño, enfado y conversión en zombi ---------- */
const _herirMobAld=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  const r=_herirMobAld(m,d,dir,fuente,empuje);
  if(m&&m.tipo==='aldeano'&&(fuente==='jugador'||fuente==='flechaJugador')){
    m.durmiendo=false; sonar('aldeanoNo',m.pos);
    emitirParticulas(m.pos.x,m.pos.y+2,m.pos.z,0x404040,8,1,.8,-1);
    for(const g of mobs)if(g.tipo==='golem'&&!g.construido&&g.pos.distanceTo(m.pos)<24)g.enfadado=30;
  }
  return r;
};
const _alMorirAld=alMorirMob;
alMorirMob=function(m){
  if(m.tipo==='aldeano'&&m.mordidoZombi&&tiempoJuego-m.mordidoZombi<2&&Math.random()<.5){
    const pos=m.pos.clone();setTimeout(()=>{const z=crearMob('aldeanoZombi',pos.x,pos.y,pos.z);sonar('zombi',pos);},50);}
  return _alMorirAld(m);
};
// Clic derecho sobre un niño o sin ofertas: niega con la cabeza
const _usarDerechoCompletoAld=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){
  const m=apuntadoEnt&&apuntadoEnt.mob;
  if(m&&m.tipo==='aldeano'&&(!m.ofertas||!m.ofertas.length)){sonar('aldeanoNo',m.pos);if(m.extra.cabeza)m.cabezaNo=.6;return true;}
  if(m&&m.tipo==='aldeano'&&m.durmiendo){m.durmiendo=false;sonar('aldeanoHmm',m.pos);}
  return _usarDerechoCompletoAld(p,id,it);
};

/* ---------- Cada fotograma ---------- */
const _actualizarFinalAld=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalAld(dt);reabastecer();familias(dt);
  for(const m of mobs)if(m.cabezaNo>0&&m.extra.cabeza){m.cabezaNo-=dt;m.extra.cabeza.rotation.y=Math.sin(m.cabezaNo*25)*.5;}};
