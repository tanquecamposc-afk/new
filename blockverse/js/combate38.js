"use strict";
/* =========================================================
   Combate mejorado
   - Golpe crítico como en el original: salta y golpea
     mientras caes con la barra de ataque cargada (×1,5 de
     daño). Ahora se nota: estrellas de crítico, chispas
     azules si el arma está encantada, sonido y número de
     daño dorado. También funciona contra otros jugadores
     en red.
   - Indicador de ataque bajo la mira con forma de espada:
     se va llenando y se ilumina cuando el golpe está listo
     y tienes a alguien al alcance.
   - Números de daño flotantes (se pueden quitar en Opciones).
   - Los bots de Bed Wars saltan para dar críticos.
   - Armadura con textura (cuero del color del equipo,
     cobre, hierro, oro, diamante y netherite) y el objeto de
     la mano visibles en los bots, en los demás jugadores,
     en los zombis con armadura y en tu personaje (F5).
   ========================================================= */
if(OPC.numerosDano===undefined)OPC.numerosDano=true;

/* ---------- ¿Es un golpe crítico? ---------- */
function esCritico38(carga){
  const j=jugador;
  return carga>.9&&!j.suelo&&j.vel.y<0&&!j.enAgua&&!j.vuela&&!j.montura&&!(typeof j.escalando!=='undefined'&&j.escalando);
}

/* ---------- Partículas de crítico (estrellas) ---------- */
const texEstrella38=(()=>{const c=document.createElement('canvas');c.width=c.height=8;const g=c.getContext('2d');g.fillStyle='#fff';
  for(const [x,y] of [[3,0],[4,0],[3,1],[4,1],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[3,6],[4,6],[3,7],[4,7],[3,2],[4,2],[3,5],[4,5]])g.fillRect(x,y,1,1);
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return t;})();
const chispas38=[];
function chispasCritico(x,y,z,magia,n=14){
  for(let i=0;i<n;i++){
    const col=magia&&i%2?0x7fd0ff:(Math.random()<.5?0xffffff:0xd8d8d8);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texEstrella38,color:col,transparent:true,depthWrite:false,fog:false}));
    const t=.09+Math.random()*.07; s.scale.set(t,t,1);
    s.position.set(x+(Math.random()-.5)*.5,y+(Math.random()-.5)*.6,z+(Math.random()-.5)*.5);
    const a=Math.random()*Math.PI*2, v=1.5+Math.random()*2.5;
    escena.add(s); chispas38.push({s,v:new THREE.Vector3(Math.cos(a)*v,(Math.random()-.2)*v,Math.sin(a)*v),vida:.5+Math.random()*.35,t:0});
  }
}
/* ---------- Números de daño ---------- */
const numeros38=[];
function numeroDano(x,y,z,dano,critico){
  if(!OPC.numerosDano)return;
  const txt=(critico?'✦ ':'')+(Math.round(dano*10)/10).toString().replace('.',',');
  const c=document.createElement('canvas'), g=c.getContext('2d'); g.font='bold 40px monospace';
  const w=Math.ceil(g.measureText(txt).width)+12; c.width=w; c.height=52;
  g.font='bold 40px monospace'; g.textBaseline='middle';
  g.fillStyle='#3f2a00'; g.fillText(txt,7,29); g.fillStyle=critico?'#ffd23c':'#ff5555'; g.fillText(txt,4,26);
  const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,depthWrite:false,fog:false}));
  const k=critico?.0105:.0085; s.scale.set(w*k,52*k,1); s.renderOrder=998;
  s.position.set(x+(Math.random()-.5)*.4,y,z+(Math.random()-.5)*.4);
  escena.add(s); numeros38.push({s,t:0,vida:.9,vy:critico?1.6:1.2});
}
function actualizarEfectos38(dt){
  for(let i=chispas38.length-1;i>=0;i--){const c=chispas38[i];c.t+=dt;c.v.y-=6*dt;c.v.multiplyScalar(Math.pow(.25,dt));c.s.position.addScaledVector(c.v,dt);
    c.s.material.opacity=1-c.t/c.vida; if(c.t>=c.vida){escena.remove(c.s);c.s.material.dispose();chispas38.splice(i,1);}}
  for(let i=numeros38.length-1;i>=0;i--){const n=numeros38[i];n.t+=dt;n.s.position.y+=n.vy*dt;n.vy*=Math.pow(.2,dt);
    n.s.material.opacity=n.t<n.vida*.6?1:1-(n.t-n.vida*.6)/(n.vida*.4);
    if(n.t>=n.vida){escena.remove(n.s);n.s.material.map.dispose();n.s.material.dispose();numeros38.splice(i,1);}}
}

/* ---------- El golpe del jugador ---------- */
let ataque38=null;
const _atacar38=atacar;
atacar=function(){
  const carga=cargaAtaque(), critico=esCritico38(carga), p=enMano();
  // Contra otros jugadores en red (Bed Wars): mismo cálculo de daño, con crítico
  if(typeof BW!=='undefined'&&BW&&BW.activo&&typeof RED!=='undefined'&&RED.conectado&&!apuntadoEnt&&!BW.yo.espectador&&typeof remotoApuntado==='function'){
    const o=remotoApuntado();
    if(o&&o.r.equipo!==BW.yo.equipo&&o.r.equipo!=null){
      ultimoAtaque=tiempoJuego; balancearMano();
      const h=p&&ITEMS[p.id].herr; let dano=(h?h.dano:1)*(.2+.8*carga*carga);
      const filo=nivelEnc(p,'filo')+(BW.equipos[BW.yo.equipo].mejoras.filo?1:0); if(filo)dano+=(.5*filo+.5)*carga;
      if(critico)dano*=1.5;
      const gp=o.r.g.position, dx=gp.x-jugador.pos.x, dz=gp.z-jugador.pos.z, l=Math.hypot(dx,dz)||1;
      const emp=(jugador.corriendo&&carga>.9?1.6:1)*(1+nivelEnc(p,'retroceso')*.6);
      if(o.r.esBot)enviarRed({t:'bwGolpeBot',id:+String(o.id).slice(4),dano,dx:dx/l*emp,dz:dz/l*emp,equipo:BW.yo.equipo,nombre:RED.nombre});
      else enviarRed({t:'bwGolpe',a:o.id,dano,dx:dx/l*emp,dz:dz/l*emp,por:RED.nombre,critico});
      sonar(critico?'critico':'golpe',gp,.9);
      if(critico)chispasCritico(gp.x,gp.y+1.3,gp.z,!!filo);
      numeroDano(gp.x,gp.y+2.2,gp.z,dano,critico);
      if(jugador.corriendo&&carga>.9)jugador.corriendo=false;
      if(h)gastarObjetoEnMano(h.tipo==='espada'?1:2);
      return true;
    }
  }
  const m=apuntadoEnt&&apuntadoEnt.mob;
  ataque38={m,critico,vida:m?m.vida:0,magia:!!(p&&p.enc&&(p.enc.filo||p.enc.castigo||p.enc.perdicion))};
  let r;
  try{r=_atacar38.apply(this,arguments);}
  finally{
    const A=ataque38; ataque38=null;
    if(A&&A.m){const M=A.m, hecho=Math.max(0,A.vida-Math.max(0,M.vida));
      if(A.critico){chispasCritico(M.pos.x,M.pos.y+M.alto*.65,M.pos.z,A.magia);}
      else if(A.magia&&hecho>0)chispasCritico(M.pos.x,M.pos.y+M.alto*.65,M.pos.z,true,6);
      if(hecho>0)numeroDano(M.pos.x,M.pos.y+M.alto+.35,M.pos.z,hecho,A.critico);}
  }
  return r;
};

/* ---------- Indicador de ataque bajo la mira ---------- */
const ESPADA38=['.........##','........#.#','.......#..#','......#..#.','.##..#..#..','..##..##...','...####....','....##.....','...#..#....','..#....#...','.#.........'];
const indicador38=document.createElement('canvas');
indicador38.id='indicadorAtaque'; indicador38.width=11*2; indicador38.height=11*2;
indicador38.style.cssText='position:fixed;left:50%;top:calc(50% + 14px);transform:translateX(-50%);width:22px;height:22px;image-rendering:pixelated;pointer-events:none;z-index:3;display:none';
document.body.appendChild(indicador38);
{const st=document.createElement('style');st.textContent='#cargaAtaque{display:none!important}';document.head.appendChild(st);}
let firma38='';
function pintarIndicador38(){
  const ver=estado==='jugando'&&!vistaTercera;
  const carga=typeof cargaAtaque==='function'?cargaAtaque():1;
  const listo=carga>=1&&!!(apuntadoEnt&&(apuntadoEnt.mob||apuntadoEnt.dragon));
  const mostrar=ver&&(carga<1||listo);
  indicador38.style.display=mostrar?'block':'none'; if(!mostrar)return;
  const f=Math.round(carga*11), firma=f+'|'+listo; if(firma===firma38)return; firma38=firma;
  const g=indicador38.getContext('2d'); g.clearRect(0,0,22,22);
  for(let y=0;y<11;y++)for(let x=0;x<11;x++){if(ESPADA38[y][x]!=='#')continue;
    // Se llena de la empuñadura (abajo-izquierda) a la punta (arriba-derecha)
    const lleno=(x+(10-y))/20<=carga+1e-6;
    g.fillStyle=listo?'#ffffff':lleno?'#e8e8e8':'rgba(70,70,70,.75)'; g.fillRect(x*2,y*2,2,2);}
  if(listo){g.globalCompositeOperation='destination-over';g.fillStyle='rgba(0,0,0,.45)';for(let y=0;y<11;y++)for(let x=0;x<11;x++)if(ESPADA38[y][x]==='#')g.fillRect(x*2+1,y*2+1,2,2);g.globalCompositeOperation='source-over';}
}

/* ---------- Armadura con textura ---------- */
const CACHE_ARM38=new Map();
function colorArmadura38(k,tinte){const m=ARM_MATS[k]||ARM_MATS[0];return k===0&&tinte?rgb30(tinte):m.col;}
// Pinta una pieza de armadura (0 casco, 1 pechera, 2 pantalones, 3 botas) con la distribución de las skins
function texArmadura38(k,pieza,tinte){
  const clave=k+'|'+pieza+'|'+(k===0&&tinte?tinte:''); if(CACHE_ARM38.has(clave))return CACHE_ARM38.get(clave);
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),rnd=mulberry32(hash30(clave));
  const col=colorArmadura38(k,tinte), nombre=(ARM_MATS[k]||{}).n;
  const base=(P,f,filas)=>{
    for(let y=0;y<P.h;y++)for(let x=0;x<P.w;x++){
      if(filas&&!filas(y,x,f,P))continue;
      let v=1+(P.rnd()-.5)*.12;
      if(x===0||x===P.w-1)v*=.78; if(y===0)v*=1.12;
      if(nombre==='diamante'&&P.rnd()<.06)v*=1.35;
      if(nombre==='oro'&&(x+y)%5===0)v*=1.15;
      if(nombre==='netherite'&&P.rnd()<.08)v*=.75;
      if(nombre==='cuero'&&P.rnd()<.1)v*=.88;
      if(nombre==='cobre'&&(x+y)%4===0)v*=.85;
      P.px(x,y,col,v);}};
  const lados=f=>f==='px'||f==='nx'||f==='pz'||f==='nz';
  if(pieza===0)pintarPieza30(g,'cabeza',false,rnd,(f,P)=>{
    if(f==='ny')return;
    base(P,f,(y,x)=>f==='py'||f==='nz'?true:f==='pz'?(y<=2||((x===0||x===P.w-1)&&y<=5)):y<=5);});
  if(pieza===1){
    pintarPieza30(g,'cuerpo',false,rnd,(f,P)=>{if(f==='ny')return;base(P,f,(y,x)=>f==='py'||y<=10);});
    for(const b of ['brazoD','brazoI'])pintarPieza30(g,b,false,rnd,(f,P)=>{if(f==='ny')return;base(P,f,(y)=>f==='py'||y<=4);});
  }
  if(pieza===2){
    pintarPieza30(g,'cuerpo',false,rnd,(f,P)=>{if(!lados(f))return;base(P,f,(y)=>y>=8);});
    for(const l of ['piernaD','piernaI'])pintarPieza30(g,l,false,rnd,(f,P)=>{if(f==='ny')return;base(P,f,(y)=>f==='py'||y<=8);});
  }
  if(pieza===3)for(const l of ['piernaD','piernaI'])pintarPieza30(g,l,false,rnd,(f,P)=>{if(f==='py')return;base(P,f,(y)=>f==='ny'||y>=8);});
  const t=texLienzo30(c); CACHE_ARM38.set(clave,t); return t;
}
function malla38(region,w,h,d,tex,piv,fino){
  const m=piezaSkin30(region,w,h,d,!!fino,new THREE.MeshLambertMaterial({map:tex,color:0xffffff,alphaTest:.5,side:THREE.DoubleSide}),piv);
  m.userData.arm38=true; m.userData.base=new THREE.Color(0xffffff); return m;
}
// arm: [casco,pechera,pantalones,botas] con el índice de material (o null); tinte: color del cuero
function vestirArmadura38(partes,arm,tinte){
  if(!partes)return;
  const firma=arm.join(',')+'|'+(tinte||'');
  if(partes._firmaArm===firma)return; partes._firmaArm=firma;
  for(const o of partes._arm||[]){if(o.parent)o.parent.remove(o);o.geometry.dispose();o.material.dispose();}
  partes._arm=[];
  const pon=(padre,m,y=0)=>{if(!padre)return;m.position.y+=y;padre.add(m);partes._arm.push(m);};
  const aw=partes.fino?.1875:.25;
  const [ca,pe,pa,bo]=arm;
  if(ca!=null)pon(partes.cabeza,malla38('cabeza',.62,.62,.62,texArmadura38(ca,0,tinte)),partes.cabezaY??.25);
  if(pe!=null){const t=texArmadura38(pe,1,tinte);
    pon(partes.torso,malla38('cuerpo',.58,.83,.34,t));
    partes.brazos.forEach((b,i)=>pon(b,malla38(i?'brazoI':'brazoD',aw+.08,.83,.33,t,true),.05));}
  if(pa!=null){const t=texArmadura38(pa,2,tinte);
    pon(partes.torso,malla38('cuerpo',.54,.79,.3,t));
    partes.piernas.forEach((l,i)=>pon(l,malla38(i?'piernaI':'piernaD',.3,.78,.3,t,true),.015));}
  if(bo!=null){const t=texArmadura38(bo,3,tinte);
    partes.piernas.forEach((l,i)=>pon(l,malla38(i?'piernaI':'piernaD',.33,.8,.33,t,true),.025));}
}
const matArm38=id=>{const a=id&&ITEMS[id]&&ITEMS[id].armadura;return a?a.mat:null;};
// Objeto en la mano derecha de un modelo humanoide
function ponerEnMano38(partes,id){
  if(!partes||!partes.brazos||!partes.brazos[0])return;
  if(partes._idMano===id)return; partes._idMano=id;
  if(partes._mano){partes._mano.parent&&partes._mano.parent.remove(partes._mano);partes._mano=null;}
  if(!id||id<=0||typeof objetoTercera34!=='function')return;
  const g=new THREE.Group(); g.position.set(0,-.7,.08);
  const o=objetoTercera34(id,false); if(!o)return;
  o.traverse(m=>{if(m.isMesh&&m.material&&m.material.color&&m.material.emissive&&!m.userData.base)m.userData.base=m.material.color.clone();});
  g.add(o); partes.brazos[0].add(g); partes._mano=g;
}

/* ---------- Bots de Bed Wars: armadura, espada y saltos críticos ---------- */
const ESPADAS38=['espada_madera','espada_piedra','espada_hierro','espada_diamante'];
let botAtacando38=null;
function equipoVisualBot38(m){
  const P=m.grupo&&m.grupo.userData.partes; if(!P||!m.bw)return;
  const E=EQUIPOS_BW[m.bw.equipo], mat=['cuero','cobre','hierro','diamante'][m.bw.armadura]||'cuero';
  const k=ARM_MATS.findIndex(a=>a.n===mat);
  vestirArmadura38(P,[0,0,k,k],E?E.hex:null);
  ponerEnMano38(P,idClave(ESPADAS38[m.bw.espada]||'espada_madera'));
}
if(typeof IA_EXTRA!=='undefined'&&IA_EXTRA.botBW){
  const _iaBot38=IA_EXTRA.botBW;
  IA_EXTRA.botBW=function(m,dt){
    if(m.bw){
      equipoVisualBot38(m);
      // Si hay un enemigo cerca y el golpe está casi listo, salta para dar un crítico
      if(m.suelo&&m.bw.golpeT<.35&&m.bw.golpeT>0&&Math.random()<dt*2.2*(m.bw.nivel||1)&&typeof enemigosDe==='function'){
        for(const e of enemigosDe(m)){const d=Math.hypot(e.pos.x-m.pos.x,e.pos.z-m.pos.z);if(d<3.4&&Math.abs(e.pos.y-m.pos.y)<1.5){m.vel.y=6.4;break;}}
      }
    }
    botAtacando38=m;
    try{return _iaBot38.apply(this,arguments);}finally{botAtacando38=null;}
  };
}
const esCriticoBot38=m=>m&&!m.suelo&&m.vel.y<0;
const _danarJugador38=danarJugador;
danarJugador=function(n,tipo,dir){
  const m=botAtacando38;
  if(m&&tipo==='mob'&&esCriticoBot38(m)){n*=1.5;sonar('critico',m.pos,.8);chispasCritico(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z,false,10);}
  return _danarJugador38.apply(this,[n,tipo,dir]);
};
const _herirMob38=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  const b=botAtacando38;
  if(b&&fuente==='botBW'&&esCriticoBot38(b)){d*=1.5;chispasCritico(m.pos.x,m.pos.y+m.alto*.6,m.pos.z,false,10);}
  return _herirMob38.apply(this,[m,d,dir,fuente,empuje]);
};

/* ---------- Zombis con armadura: con textura ---------- */
if(typeof ponerArmaduraMob==='function'){
  const _ponerArmaduraMob38=ponerArmaduraMob;
  ponerArmaduraMob=function(m){
    const P=m.grupo&&m.grupo.userData.partes;
    if(!P)return _ponerArmaduraMob38(m);
    let r=Math.random(),mat=MAT_ARM_MOB[0];for(const x of MAT_ARM_MOB){if(r<x[1]){mat=x;break;}r-=x[1];}
    const k=mat[0], piezas=[0]; for(let p=1;p<4&&Math.random()<.5;p++)piezas.push(p);
    m.equipo=piezas.map(p=>400+p*10+k);
    vestirArmadura38(P,[0,1,2,3].map(p=>piezas.includes(p)?k:null),null);
    m.armadura=(ARMADURA_MOB[m.tipo]||0)+piezas.reduce((a,p)=>a+ARM_MATS[k].def[p],0);
  };
}

/* ---------- Jugadores en red: armadura y objeto en la mano ---------- */
if(typeof estadoLocal==='function'){
  const _estadoLocal38=estadoLocal;
  estadoLocal=function(){const o=_estadoLocal38();o.arm=[36,37,38,39].map(i=>inv[i]?inv[i].id:0);return o;};
}
if(typeof actualizarRemoto==='function'){
  const _actualizarRemoto38=actualizarRemoto;
  actualizarRemoto=function(m){
    _actualizarRemoto38(m);
    const r=RED.remotos.get(m.de); if(!r||!r.g)return;
    const P=r.g.userData.partes; if(!P)return;
    const tinte=r.colEquipo!=null?r.colEquipo:(typeof BW!=='undefined'&&BW&&BW.activo&&m.equipo!=null&&EQUIPOS_BW[m.equipo]?EQUIPOS_BW[m.equipo].hex:null);
    if(Array.isArray(m.arm))vestirArmadura38(P,m.arm.map(matArm38),tinte);
    ponerEnMano38(P,m.mano||0);
  };
}

/* ---------- Tu personaje en tercera persona ---------- */
const _modeloJugador38=actualizarModeloJugador;
actualizarModeloJugador=function(dt){
  _modeloJugador38(dt);
  const M=modeloJugador; if(!M.g.visible)return;
  const p=M.p;
  if(!M.partes38)M.partes38={cabeza:p.cabeza,torso:p.torso,brazos:[p.brazoD,p.brazoI],piernas:[p.piernaI,p.piernaD],cabezaY:.25};
  M.partes38.fino=typeof SKIN!=='undefined'&&SKIN.fino;
  const tinte=typeof BW!=='undefined'&&BW&&BW.activo&&BW.yo?EQUIPOS_BW[BW.yo.equipo].hex:null;
  const antes=M.partes38._firmaArm;
  vestirArmadura38(M.partes38,[36,37,38,39].map(i=>matArm38(inv[i]&&inv[i].id)),tinte);
  if(M.partes38._firmaArm!==antes)M.brillo=-1;
};
// Si cambia la skin (brazos finos), la armadura se vuelve a hacer
if(typeof aplicarSkinJugador==='function'){
  const _aplicarSkin38=aplicarSkinJugador;
  aplicarSkinJugador=function(){const r=_aplicarSkin38.apply(this,arguments);if(modeloJugador.partes38)modeloJugador.partes38._firmaArm=null;return r;};
}

/* ---------- Cada fotograma ---------- */
const _actualizarFinal38=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinal38(dt);actualizarEfectos38(dt);pintarIndicador38();};

/* ---------- Opción ---------- */
(function(){
  const rej=document.querySelector('.rejillaOpc'); if(!rej||typeof botonOpc!=='function')return;
  const b=botonOpc(()=>OPC.numerosDano,()=>{OPC.numerosDano=!OPC.numerosDano;},v=>'Números de daño: '+(v?'Sí':'No'));
  b.dataset.tip='Muestra el daño de cada golpe sobre el enemigo (dorado y con ✦ si es crítico)';
  rej.appendChild(b);
})();
