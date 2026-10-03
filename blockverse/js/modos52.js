"use strict";
/* =========================================================
   Dos modos nuevos (inspirados en los spin-off del original)
   · MAZMORRAS (acción y rol con cámara desde arriba): niveles
     de salas y pasillos generados al azar, oleadas de
     enemigos al entrar en cada sala, cofres con botín (armas,
     armaduras, artefactos, pociones y flechas), esquiva,
     artefactos con recarga, esmeraldas, 3 vidas por nivel y
     un jefe al final. Al vencerlo se abre la salida al
     siguiente nivel, más difícil.
   · LEYENDAS (acción y estrategia): defiende la aldea de los
     piglins. Junta madera y piedra (G), construye generadores
     de golems, torres de flechas y muros (1-5), da órdenes a
     tus golems (R: ¡al ataque!, F: seguidme) y destruye los
     tres portales piglin. Por la noche llegan asaltos.
   ========================================================= */
const MZ={activo:false,pendiente:false,nivel:1,salas:[],mapa:null,vidas:3,esm:0,atk:0,def:0,flechas:20,pociones:1,
  artefactos:[{id:'cuerno',cd:0}],dir:[0,-1],cdGolpe:0,cdArco:0,cdRoll:0,cdPocion:0,roll:0,enemigos:[],jefe:null,salida:null,sala:0,fin:false};
const LY={activo:false,madera:20,piedra:20,oro:0,aldea:null,bases:[],golems:[],spawners:[],torres:[],orden:'seguir',raidT:150,cdG:0,cosechado:new Set(),fin:false};
const MZ_Y=100, CAM_AZ52=Math.PI/4;
const enModo52=()=>MZ.activo||LY.activo;

/* ---------- Utilidades ---------- */
function aviso52(arriba,grande,col,seg){if(typeof tituloOB==='function')tituloOB(arriba,grande,col||'#fff',seg||2.5);}
function particulasArco52(x,y,z,dx,dz,col){for(let k=-3;k<=3;k++){const a=Math.atan2(dx,dz)+k*.28;emitirParticulas(x+Math.sin(a)*1.6,y+1,z+Math.cos(a)*1.6,col,2,.6,.25,0);}}
function rayo52(a,b,col){const n=Math.max(2,Math.round(a.distanceTo(b)*2));for(let i=0;i<=n;i++){const t=i/n;emitirParticulas(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t,col,1,.05,.25,0);}}
const blq52=(...ks)=>{for(const k of ks)if(B[k])return B[k];return B.piedra;};
function salirModo52(){
  MZ.activo=false;LY.activo=false;MZ.pendiente=false;
  for(const id of ['hudMZ52','hudLY52','jefeMZ52','finModo52'])document.getElementById(id)?.remove();
  if(ui)cerrarUI();soltarControles();efectos={};limpiarMobs();vistaTercera=0;inv=new Array(41).fill(null);
  mundoId=null;metaMundo=null;window.semillaElegida=1+Math.floor(Math.random()*1e6);
  try{nuevoMundo();}catch(e){console.error(e);}
  mundoId=null;metaMundo=null;estado='menu';mostrarHud(false);mostrarPantalla('menu');
  if(document.pointerLockElement)try{document.exitPointerLock();}catch(e){}
}
function pantallaFin52(titulo,texto,col,botones){
  document.getElementById('finModo52')?.remove();
  const d=document.createElement('div');d.id='finModo52';d.className='capa';
  d.innerHTML=`<div class="tarjeta pantallaMC"><h2 style="color:${col}">${titulo}</h2><p>${texto}</p>${botones.map((b,i)=>`<button data-i="${i}" ${i?'class="secundario"':''}>${b[0]}</button>`).join('')}</div>`;
  document.body.appendChild(d);estado='menu';if(document.pointerLockElement)document.exitPointerLock();
  d.querySelectorAll('button').forEach(b=>b.onclick=()=>{d.remove();botones[+b.dataset.i][1]();});
}

/* =========================================================
   MAZMORRAS
   ========================================================= */
function generarMazmorra52(nivel){
  const r=mulberry32(nivel*7919+Math.floor(Math.random()*1e6));
  const M=new Map(), pon=(x,y,z,b)=>M.set(x+','+y+','+z,b), quita=(x,y,z)=>M.delete(x+','+y+','+z);
  const SUELO=[blq52('ladrillosPiedra'),blq52('ladrillosPiedra'),blq52('ladrillosMusgo','ladrillosPiedra'),blq52('roca'),blq52('grava')];
  const PARED=[blq52('ladrillosPiedra'),blq52('ladrillosPiedra'),blq52('ladrillosMusgo','ladrillosPiedra'),blq52('roca')];
  const elige=a=>a[Math.floor(r()*a.length)];
  // Camino de salas por una rejilla (cada celda 26 bloques)
  const n=5+Math.min(nivel,5), celdas=[[0,0]], usadas=new Set(['0,0']);
  while(celdas.length<n){const [cx,cz]=celdas[celdas.length-1];const op=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>!usadas.has((cx+a)+','+(cz+b)));
    if(!op.length)break;const [a,b]=op[Math.floor(r()*op.length)];celdas.push([cx+a,cz+b]);usadas.add((cx+a)+','+(cz+b));}
  const salas=celdas.map(([i,j],k)=>({x:i*26,z:j*26,r:k===celdas.length-1?9:5+Math.floor(r()*3),tipo:k===0?'inicio':k===celdas.length-1?'jefe':'normal',activada:k===0,limpia:k===0,cofre:null}));
  const suelo=(x,z)=>{pon(x,MZ_Y,z,elige(SUELO));pon(x,MZ_Y-1,z,B.piedra);pon(x,MZ_Y-2,z,B.piedra);};
  for(const s of salas){
    for(let dx=-s.r-1;dx<=s.r+1;dx++)for(let dz=-s.r-1;dz<=s.r+1;dz++){
      const borde=Math.max(Math.abs(dx),Math.abs(dz))===s.r+1;suelo(s.x+dx,s.z+dz);
      if(borde)for(let y=1;y<=4;y++)pon(s.x+dx,MZ_Y+y,s.z+dz,elige(PARED));}
    // Columnas, antorchas y algo de decoración
    if(s.r>=6)for(const [a,b] of [[-3,-3],[3,3],[-3,3],[3,-3]])for(let y=1;y<=3;y++)pon(s.x+a,MZ_Y+y,s.z+b,elige(PARED));
    for(const [a,b] of [[-s.r,-s.r],[s.r,s.r],[-s.r,s.r],[s.r,-s.r]])pon(s.x+a,MZ_Y+1,s.z+b,B.antorcha);
    if(s.tipo!=='inicio'&&(s.tipo==='jefe'||r()<.65)){const cx=s.x+(r()<.5?-1:1)*(s.r-1),cz=s.z+Math.floor(r()*3)-1;pon(cx,MZ_Y+1,cz,B.cofre);s.cofre=[cx,MZ_Y+1,cz];}
    if(s.tipo==='jefe')for(const [a,b] of [[-2,0],[2,0],[0,-2],[0,2]])pon(s.x+a,MZ_Y+1,s.z+b,blq52('piedraLuminosa'));
  }
  // Pasillos de 3 de ancho entre salas seguidas
  for(let k=1;k<salas.length;k++){const a=salas[k-1],b=salas[k];
    const pasos=Math.abs(b.x-a.x)+Math.abs(b.z-a.z),sx=Math.sign(b.x-a.x),sz=Math.sign(b.z-a.z);
    for(let t=0;t<=pasos;t++){const x=a.x+sx*t,z=a.z+sz*t;
      for(let w=-2;w<=2;w++){const X=x+(sz?w:0),Z=z+(sx?w:0);
        if(Math.abs(w)<=1){suelo(X,Z);for(let y=1;y<=4;y++)quita(X,MZ_Y+y,Z);}
        else if(![...salas].some(s=>Math.abs(X-s.x)<=s.r&&Math.abs(Z-s.z)<=s.r)){suelo(X,Z);for(let y=1;y<=3;y++)pon(X,MZ_Y+y,Z,elige(PARED));}}
      if(t%6===3)pon(x+(sz?2:0),MZ_Y+4,z+(sx?2:0),B.antorcha);}}
  const porChunk=new Map();
  for(const [k,b] of M){const [x,y,z]=k.split(',').map(Number);const c=Math.floor(x/CX)+','+Math.floor(z/CZ);if(!porChunk.has(c))porChunk.set(c,[]);porChunk.get(c).push([x,y,z,b]);}
  return {salas,porChunk};
}
const _generarSuperficie52=generarSuperficie;
generarSuperficie=function(ch){
  if(!(MZ.pendiente||MZ.activo))return _generarSuperficie52(ch);
  ch.bioma=new Uint8Array(256).fill(BIOMA.llanura);
  const l=MZ.mapa&&MZ.mapa.porChunk.get(ch.cx+','+ch.cz);if(!l)return;
  for(const [x,y,z,b] of l)ch.datos[idx(x-ch.cx*CX,y,z-ch.cz*CZ)]=b;
};
const _generarMobs52=generarMobs;
generarMobs=function(dt){if(enModo52())return;return _generarMobs52(dt);};
const _aparecer52=aparecer;
aparecer=function(){if(MZ.pendiente||MZ.activo){spawnMundo=[.5,.5];}return _aparecer52.apply(this,arguments);};

function iniciarMazmorras52(nivel,conservar){
  if(typeof BW!=='undefined'&&BW&&BW.activo&&typeof salirDeBedwars==='function')salirDeBedwars();
  for(const id of ['jefeMZ52','finModo52'])document.getElementById(id)?.remove();
  if(!conservar)Object.assign(MZ,{esm:0,atk:0,def:0,flechas:20,pociones:1,artefactos:[{id:'cuerno',cd:0}]});
  Object.assign(MZ,{nivel,vidas:3,enemigos:[],jefe:null,salida:null,sala:0,fin:false,roll:0});
  MZ.mapa=generarMazmorra52(nivel);MZ.salas=MZ.mapa.salas;
  mundoId=null;metaMundo=null;selModo.value='supervivencia';MZ.pendiente=true;LY.activo=false;
  try{nuevoMundo();}finally{MZ.pendiente=false;}
  MZ.activo=true;spawnMundo=null;
  mundoEstado.mazmorras=true;tiempoDia=.3;lloviendo=false;modo='supervivencia';
  inv=new Array(41).fill(null);inv[0]=crearPila(idClave('espada_hierro'));ranura=0;salud=20;hambre=20;
  jugador.pos.set(.5,MZ_Y+1.01,.5);jugador.vel.set(0,0,0);jugador.vuela=false;vistaTercera=1;
  empezar();pintarHudMZ52();
  aviso52(`MAZMORRA · NIVEL ${nivel}`,nivel===1?'¡Adelante, héroe!':'Más profundo…','#ffd84a',3);
}
function enemigoMZ52(tipo,x,z){
  const m=crearMob(tipo,x+.5,MZ_Y+1.05,z+.5);if(!m)return null;
  const k=1+(MZ.nivel-1)*.22;m.vida*=k;m.vidaMax=m.vida;m.mz52=true;m.enfadado=999;m.domado=true;m.def={...m.def,quemaSol:false,neutralDia:false};MZ.enemigos.push(m);
  emitirParticulas(x+.5,MZ_Y+1.5,z+.5,0x553366,10,2,.6,-1);return m;
}
function activarSala52(s){
  s.activada=true;
  const tipos=MZ.nivel>=3?['zombi','zombi','esqueleto','arana','vindicador']:['zombi','zombi','esqueleto','arana'];
  if(s.tipo==='jefe'){
    const j=enemigoMZ52('vindicador',s.x,s.z-3);
    if(j){j.vida=j.vidaMax=90+45*MZ.nivel;j.def={...j.def,dano:5+MZ.nivel,vel:(j.def.vel||2.4)*1.1};j.grupo.scale.setScalar(1.7);j.alto*=1.7;j.ancho*=1.4;j.jefe52=true;MZ.jefe=j;}
    for(let k=0;k<2+MZ.nivel;k++)enemigoMZ52(tipos[k%tipos.length],s.x+(k%2?3:-3),s.z+2);
    aviso52('¡JEFE!','Archi-ilusor de las profundidades','#ff5555',3);
  }else{
    const n=3+MZ.nivel+Math.floor(Math.random()*2);
    for(let k=0;k<n;k++)enemigoMZ52(tipos[Math.floor(Math.random()*tipos.length)],s.x+Math.floor((Math.random()-.5)*s.r*1.6),s.z+Math.floor((Math.random()-.5)*s.r*1.6));
  }
}
const ARTEFACTOS52={
  cuerno:{n:'Cuerno de explosión',cd:8,col:'#ffcc66',usar(){const p=jugador.pos;let n=0;for(const m of MZ.enemigos)if(!m.muerto&&m.pos.distanceTo(p)<5){const dx=m.pos.x-p.x,dz=m.pos.z-p.z,d=Math.hypot(dx,dz)||1;m.inv=0;herirMob(m,4+MZ.atk,{x:dx/d*1.8,z:dz/d*1.8},'jugador',2);n++;}
    for(let a=0;a<6.28;a+=.35)emitirParticulas(p.x+Math.cos(a)*2.5,p.y+.6,p.z+Math.sin(a)*2.5,0xffd080,2,2.5,.4,0);sonar('explosion',{x:p.x,y:p.y,z:p.z},.5);}},
  botas:{n:'Botas de velocidad',cd:10,col:'#7fd8ff',usar(){efectos.rapidez={t:5,n:3};emitirParticulas(jugador.pos.x,jugador.pos.y+.3,jugador.pos.z,0x9fe8ff,14,1.5,.5,0);}},
  fuegos:{n:'Flecha de fuegos artificiales',cd:9,col:'#ff7fd0',usar(){const o=objetivoMZ52(16,true);if(!o)return false;rayo52(jugador.pos.clone().setY(jugador.pos.y+1.2),o.pos.clone().setY(o.pos.y+1),0xff80d0);
    for(const m of MZ.enemigos)if(!m.muerto&&m.pos.distanceTo(o.pos)<3.2){m.inv=0;herirMob(m,9+MZ.atk*2,null,'jugador');}
    const cols=[0xff5555,0x55ff55,0x5577ff,0xffff55];for(let k=0;k<4;k++)emitirParticulas(o.pos.x,o.pos.y+1.2,o.pos.z,cols[k],10,4,.8,2);sonar('fuegoArtificial',o.pos,.7);}},
  totem:{n:'Tótem de regeneración',cd:18,col:'#8fff8f',usar(){salud=Math.min(20,salud+8);efectos.regeneracion={t:5,n:1};actualizarHUD();emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0x66ff88,20,1.5,.8,-1);}},
};
function objetivoMZ52(rango,cualquiera){
  let mejor=null,dm=rango;const p=jugador.pos,[fx,fz]=MZ.dir;
  for(const m of MZ.enemigos){if(m.muerto)continue;const dx=m.pos.x-p.x,dz=m.pos.z-p.z,d=Math.hypot(dx,dz);if(d>=dm)continue;
    if(!cualquiera&&d>1.2&&(dx*fx+dz*fz)/d<.35)continue;dm=d;mejor=m;}
  return mejor;
}
function golpeMZ52(){
  if(MZ.cdGolpe>0||estado!=='jugando')return;MZ.cdGolpe=.42;
  const p=jugador.pos;let o=objetivoMZ52(5,true);
  if(o&&o.pos.distanceTo(p)<5){const dx=o.pos.x-p.x,dz=o.pos.z-p.z,d=Math.hypot(dx,dz)||1;MZ.dir=[dx/d,dz/d];}
  const [fx,fz]=MZ.dir;particulasArco52(p.x,p.y,p.z,fx,fz,0xffffff);sonar('golpe',null,.6);
  for(const m of MZ.enemigos){if(m.muerto)continue;const dx=m.pos.x-p.x,dz=m.pos.z-p.z,d=Math.hypot(dx,dz);
    if(d<3.3&&(d<1.3||(dx*fx+dz*fz)/d>.2)){const crit=Math.random()<.2,dan=(4+MZ.atk*1.6)*(crit?2:1);m.inv=0;herirMob(m,dan,{x:dx/(d||1),z:dz/(d||1)},'jugador',1);
      if(crit){emitirParticulas(m.pos.x,m.pos.y+m.alto*.7,m.pos.z,0xffee55,10,2,.5,-1);sonar('critico');}}}
}
function disparoMZ52(){
  if(MZ.cdArco>0||estado!=='jugando')return;if(MZ.flechas<=0){aviso52('','Sin flechas','#aaa',1);return;}
  const o=objetivoMZ52(18,false)||objetivoMZ52(10,true);MZ.cdArco=.75;MZ.flechas--;sonar('arco',null,.6);
  const a=jugador.pos.clone();a.y+=1.3;
  if(!o){const [fx,fz]=MZ.dir;rayo52(a,a.clone().add(new THREE.Vector3(fx*10,0,fz*10)),0xd8c8a0);return;}
  const dx=o.pos.x-jugador.pos.x,dz=o.pos.z-jugador.pos.z,d=Math.hypot(dx,dz)||1;MZ.dir=[dx/d,dz/d];
  rayo52(a,o.pos.clone().setY(o.pos.y+1),0xd8c8a0);o.inv=0;herirMob(o,3+MZ.atk*1.2,{x:dx/d*.5,z:dz/d*.5},'flechaJugador');
}
function esquivaMZ52(){
  if(MZ.cdRoll>0||estado!=='jugando')return;MZ.cdRoll=1.1;MZ.roll=.32;invuln=Math.max(invuln,.45);
  emitirParticulas(jugador.pos.x,jugador.pos.y+.3,jugador.pos.z,0xcccccc,10,1.2,.4,0);sonar('embestida',null,.5);
}
function abrirCofreMZ52(s){
  const [x,y,z]=s.cofre;s.cofre=null;if(B.cofreAbierto)setBloque(x,y,z,B.cofreAbierto,{sinAviso:true});
  const premios=[];const e=3+Math.floor(Math.random()*6)+MZ.nivel;MZ.esm+=e;premios.push(`+${e} esmeraldas`);
  const t=Math.random(), jefe=s.tipo==='jefe';
  if(t<.4||jefe){MZ.atk++;premios.push(`Arma mejorada (ataque ${MZ.atk})`);}
  if(t>=.4&&t<.65||jefe){MZ.def++;premios.push(`Armadura mejorada (defensa ${MZ.def})`);}
  if(t>=.65&&t<.85){const faltan=Object.keys(ARTEFACTOS52).filter(k=>!MZ.artefactos.some(a=>a.id===k));
    if(faltan.length&&MZ.artefactos.length<3){const k=faltan[Math.floor(Math.random()*faltan.length)];MZ.artefactos.push({id:k,cd:0});premios.push('Artefacto: '+ARTEFACTOS52[k].n);}
    else{MZ.pociones++;premios.push('Poción de curación');}}
  if(t>=.85){MZ.pociones++;premios.push('Poción de curación');}
  MZ.flechas+=8;premios.push('+8 flechas');
  emitirParticulas(x+.5,y+1,z+.5,0xffd84a,20,2,.7,-1);sonar('cofreAbrir',{x,y,z});
  aviso52('¡BOTÍN!',premios.join(' · '),'#ffd84a',3.5);
}
function siguienteNivel52(){aviso52('','¡Nivel superado!','#7fff7f',2);setTimeout(()=>iniciarMazmorras52(MZ.nivel+1,true),400);}
function actualizarMZ52(dt){
  hambre=20;saturacion=5;
  for(const k of ['cdGolpe','cdArco','cdRoll','cdPocion'])MZ[k]=Math.max(0,MZ[k]-dt);
  for(const a of MZ.artefactos)a.cd=Math.max(0,a.cd-dt);
  // Dirección de la mirada según el movimiento
  const vx=jugador.vel.x,vz=jugador.vel.z,v=Math.hypot(vx,vz);if(v>.8)MZ.dir=[vx/v,vz/v];
  if(MZ.roll>0)MZ.roll-=dt;
  if(jugador.pos.y<MZ_Y-12&&estado==='jugando')morir('vacio');
  // Salas: se activan al entrar
  const p=jugador.pos;
  for(let i=0;i<MZ.salas.length;i++){const s=MZ.salas[i];
    if(Math.abs(p.x-s.x)<=s.r&&Math.abs(p.z-s.z)<=s.r){MZ.sala=i;if(!s.activada)activarSala52(s);
      if(s.cofre&&Math.hypot(p.x-s.cofre[0]-.5,p.z-s.cofre[2]-.5)<1.8&&(s.limpia||s.tipo!=='jefe'))abrirCofreMZ52(s);}}
  // Enemigos muertos: esmeraldas
  for(const m of MZ.enemigos)if(m.muerto&&!m.cobrado52){m.cobrado52=true;const e=1+Math.floor(Math.random()*2);MZ.esm+=e;emitirParticulas(m.pos.x,m.pos.y+.8,m.pos.z,0x44ff66,6,1.2,.6,-1);}
  MZ.enemigos=MZ.enemigos.filter(m=>!m.muerto||!m.cobrado52);
  for(const s of MZ.salas)if(s.activada&&!s.limpia&&!MZ.enemigos.some(m=>!m.muerto&&Math.abs(m.pos.x-s.x)<=s.r+2&&Math.abs(m.pos.z-s.z)<=s.r+2))s.limpia=true;
  // Jefe
  let barra=document.getElementById('jefeMZ52');
  if(MZ.jefe&&!MZ.jefe.muerto){if(!barra){barra=document.createElement('div');barra.id='jefeMZ52';document.body.appendChild(barra);}
    barra.innerHTML=`<b>Archi-ilusor · Nivel ${MZ.nivel}</b><div><i style="width:${Math.max(0,MZ.jefe.vida/MZ.jefe.vidaMax*100).toFixed(1)}%"></i></div>`;}
  else if(barra)barra.remove();
  if(MZ.jefe&&MZ.jefe.muerto&&!MZ.salida){const s=MZ.salas[MZ.salas.length-1];MZ.salida=[s.x,s.z];
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)setBloque(s.x+a,MZ_Y,s.z+b,blq52('bloqueEsmeralda','bloqueOro'),{sinAviso:true});
    aviso52('¡JEFE DERROTADO!','Pisa la plataforma verde para bajar al siguiente nivel','#7fff7f',4);sonar('totem');}
  if(MZ.salida){emitirParticulas(MZ.salida[0]+.5,MZ_Y+1.2,MZ.salida[1]+.5,0x66ff99,1,.6,1,-2);
    if(Math.hypot(p.x-MZ.salida[0]-.5,p.z-MZ.salida[1]-.5)<1.6&&Math.abs(p.y-MZ_Y-1)<1.5&&!MZ.fin){MZ.fin=true;siguienteNivel52();}}
  pintarHudMZ52();
}
function pintarHudMZ52(){
  let el=document.getElementById('hudMZ52');if(!el){el=document.createElement('div');el.id='hudMZ52';el.className='hud52';document.body.appendChild(el);}
  const vivos=MZ.enemigos.filter(m=>!m.muerto).length;
  el.innerHTML=`<b class="tit52">MAZMORRA · NIVEL ${MZ.nivel}</b>
    <div>❤ Vidas: <b>${'♥'.repeat(MZ.vidas)}</b></div><div><span class="moneda45" style="background:radial-gradient(circle at 35% 30%,#bfffcf 0 18%,#3ad16a 45%,#1a7a3a)"></span>Esmeraldas: <b>${MZ.esm}</b></div>
    <div>⚔ Ataque <b>${MZ.atk}</b> · 🛡 Defensa <b>${MZ.def}</b></div><div>🏹 Flechas <b>${MZ.flechas}</b> · 🧪 Pociones <b>${MZ.pociones}</b> (E)</div>
    <div class="arts52">${MZ.artefactos.map((a,i)=>{const A=ARTEFACTOS52[a.id];return `<span style="border-color:${A.col}"><b>${i+1}</b> ${A.n}${a.cd>0?` · ${Math.ceil(a.cd)}s`:''}</span>`;}).join('')}</div>
    <div class="pista52">${vivos?`Enemigos cerca: ${vivos}`:'Explora: cada sala trae enemigos y botín'}<br>Clic/J: espada · Clic dcho/K: arco · Espacio: esquivar</div>`;
}

/* ---------- Cámara desde arriba y controles ---------- */
const _aplicarCamaraTercera52=aplicarCamaraTercera;
aplicarCamaraTercera=function(){
  if(!MZ.activo||estado==='menu')return _aplicarCamaraTercera52.apply(this,arguments);
  const p=jugador.pos;camara.position.set(p.x+Math.sin(CAM_AZ52)*10,p.y+13,p.z+Math.cos(CAM_AZ52)*10);
  camara.lookAt(p.x,p.y+1,p.z);mano.visible=false;if(typeof mano2!=='undefined')mano2.visible=false;
};
const _fisicaJugador52=fisicaJugador;
fisicaJugador=function(){if(MZ.activo){jugador.yaw=CAM_AZ52;jugador.pitch=0;teclas.Space=false;
  if(MZ.roll>0){jugador.vel.x=MZ.dir[0]*15;jugador.vel.z=MZ.dir[1]*15;}}return _fisicaJugador52.apply(this,arguments);};
const _actualizarModeloJugador52=actualizarModeloJugador;
actualizarModeloJugador=function(){const r=_actualizarModeloJugador52.apply(this,arguments);
  if(MZ.activo&&modeloJugador&&modeloJugador.g)modeloJugador.g.rotation.y=Math.atan2(-MZ.dir[0],-MZ.dir[1])+Math.PI;return r;};
// En los dos modos no se rompen ni se ponen bloques con el ratón
const _romperApuntado52=romperApuntado;romperApuntado=function(){if(enModo52())return;return _romperApuntado52.apply(this,arguments);};
const _usarDerecho52=usarDerecho;usarDerecho=function(){if(enModo52())return;return _usarDerecho52.apply(this,arguments);};
document.addEventListener('mousedown',e=>{
  if(estado!=='jugando')return;
  if(MZ.activo){if(e.button===0)golpeMZ52();else if(e.button===2)disparoMZ52();}
  else if(LY.activo&&e.button===0)golpeBaseLY52();
});
document.addEventListener('keydown',e=>{
  if(estado!=='jugando'||e.repeat)return;
  if(MZ.activo){
    if(e.code==='KeyJ')golpeMZ52();else if(e.code==='KeyK')disparoMZ52();else if(e.code==='Space')esquivaMZ52();
    else if(/^Digit[1-9]$/.test(e.code)){e.stopImmediatePropagation();const a=MZ.artefactos[+e.code.slice(5)-1];if(a&&a.cd<=0){if(ARTEFACTOS52[a.id].usar()!==false)a.cd=ARTEFACTOS52[a.id].cd;}}
    else if(e.code==='KeyE'){e.stopImmediatePropagation();e.preventDefault();
      if(MZ.pociones>0&&MZ.cdPocion<=0&&salud<20){MZ.pociones--;MZ.cdPocion=2;salud=Math.min(20,salud+10);actualizarHUD();sonar('beber');emitirParticulas(jugador.pos.x,jugador.pos.y+1,jugador.pos.z,0xff5577,12,1,.6,-1);}}
  }else if(LY.activo){
    if(e.code==='KeyG')cosecharLY52();else if(e.code==='KeyR'){LY.orden='atacar';aviso52('','¡Golems, al ataque!','#ff9955',1.5);}
    else if(e.code==='KeyF'){LY.orden='seguir';aviso52('','¡Golems, seguidme!','#99ddff',1.5);}
    else if(/^Digit[1-9]$/.test(e.code)){e.stopImmediatePropagation();construirLY52(+e.code.slice(5));}
  }
},true);
// Muerte en los modos: vidas en la mazmorra, reaparecer en la aldea en Leyendas
const _morir52=morir;
morir=function(causa){
  if(MZ.activo&&!MZ.fin){
    MZ.vidas--;salud=20;efectos={};
    if(MZ.vidas<=0){MZ.fin=true;pantallaFin52('HAS CAÍDO',`Llegaste al nivel ${MZ.nivel} con ${MZ.esm} esmeraldas.`,'#f55',
      [['Reintentar nivel',()=>iniciarMazmorras52(MZ.nivel,true)],['Salir al menú',salirModo52]]);return;}
    const s=MZ.salas[Math.max(0,MZ.salas.findIndex((x,i)=>i>=MZ.sala)||0)]||MZ.salas[0];
    jugador.pos.set(s.x+.5,MZ_Y+1.01,s.z+.5);jugador.vel.set(0,0,0);invuln=2;actualizarHUD();
    aviso52('','Te quedan '+MZ.vidas+(MZ.vidas===1?' vida':' vidas'),'#ff8888',2);return;
  }
  if(LY.activo&&!LY.fin){const a=LY.aldea;salud=20;efectos={};jugador.pos.set(a.x+.5,a.y+1.01,a.z+3.5);jugador.vel.set(0,0,0);invuln=2;actualizarHUD();
    aviso52('','Vuelves a la aldea','#ff8888',2);return;}
  return _morir52.apply(this,arguments);
};
// En la mazmorra la defensa reduce el daño
const _danarJugador52=danarJugador;
danarJugador=function(n,tipo,dir){if(MZ.activo&&tipo!=='vacio')n*=Math.max(.3,1-MZ.def*.08);return _danarJugador52.call(this,n,tipo,dir);};

/* =========================================================
   LEYENDAS
   ========================================================= */
Object.assign(VARIANTES,{
  golemPiedraLY:{base:'golem',escala:.62,color:h=>{const c=new THREE.Color(h),g=(c.r+c.g+c.b)/3;return new THREE.Color(g*.9,g*.9,g*.95).getHex();},def:()=>({...DEF_MOB.golem,ia:'aliadoLY',tipo:'aliado',vida:40,vel:2.5,dano:6})},
  golemTablaLY:{base:'golem',escala:.55,color:h=>{const c=new THREE.Color(h),g=(c.r+c.g+c.b)/3;return new THREE.Color(g*1.1,g*.82,g*.5).getHex();},def:()=>({...DEF_MOB.golem,ia:'aliadoLY',tipo:'aliado',vida:26,vel:2.6,dano:3,arquero52:true})},
  piglinLY:{base:'piglin',def:()=>({...DEF_MOB.piglin,ia:'piglinLY',tipo:'hostil',vida:18,vel:2.3,dano:4})},
  piglinBrutoLY:{base:'piglin',escala:1.25,color:h=>new THREE.Color(h).multiplyScalar(.8).getHex(),def:()=>({...DEF_MOB.piglin,ia:'piglinLY',tipo:'hostil',vida:40,vel:2,dano:7})},
});
for(const t of ['golemPiedraLY','golemTablaLY','piglinLY','piglinBrutoLY'])if(!DEF_MOB[t])DEF_MOB[t]={...DEF_MOB[VARIANTES[t].base]};
const esPiglinLY=m=>m&&!m.muerto&&(m.tipo==='piglinLY'||m.tipo==='piglinBrutoLY');
const esGolemLY=m=>m&&!m.muerto&&(m.tipo==='golemPiedraLY'||m.tipo==='golemTablaLY');
function golpearLY52(m,o,dano,dist){
  if(m.cd>0)return;m.cd=m.def.arquero52?1.4:1;m.golpeT=.35;
  if(m.def.arquero52){rayo52(m.pos.clone().setY(m.pos.y+1.4),(o.pos||o).clone().setY((o.pos||o).y+1),0xd8c8a0);sonar('arco',m.pos,.4);}else sonar('golpe',m.pos,.5);
  if(o.jugador){danarJugador(dano,'mob',{x:(jugador.pos.x-m.pos.x)/(dist||1),z:(jugador.pos.z-m.pos.z)/(dist||1)});}
  else if(o.def){o.inv=0;herirMob(o,dano,{x:(o.pos.x-m.pos.x)/(dist||1)*.6,z:(o.pos.z-m.pos.z)/(dist||1)*.6},'golem');}
}
IA_EXTRA.aliadoLY=(m,dt)=>{
  if(!LY.activo)return;
  let obj=null,dmin=11;for(const o of mobs)if(esPiglinLY(o)){const d=o.pos.distanceTo(m.pos);if(d<dmin){dmin=d;obj=o;}}
  const alcance=m.def.arquero52?9:1.8;
  if(obj){const ox=obj.pos.x-m.pos.x,oz=obj.pos.z-m.pos.z,d=Math.hypot(ox,oz);mover(m,d>alcance*.9?ox:0,d>alcance*.9?oz:0,m.def.vel*1.2);m.yawObj=Math.atan2(ox,oz);
    if(d<=alcance+.4)golpearLY52(m,obj,m.def.dano,d);return;}
  if(LY.orden==='atacar'){const b=LY.bases.filter(b=>b.vida>0).sort((a,c)=>Math.hypot(a.x-m.pos.x,a.z-m.pos.z)-Math.hypot(c.x-m.pos.x,c.z-m.pos.z))[0];
    if(b){const ox=b.x-m.pos.x,oz=b.z-m.pos.z,d=Math.hypot(ox,oz);mover(m,d>3?ox:0,d>3?oz:0,m.def.vel);
      if(d<=Math.max(4,alcance)&&m.cd<=0){m.cd=1;m.golpeT=.35;b.vida-=m.def.arquero52?2:4;emitirParticulas(b.x+.5,b.y+2,b.z+.5,0xaa2222,6,2,.5,0);sonar('golpe',m.pos,.4);}return;}}
  const ox=jugador.pos.x-m.pos.x,oz=jugador.pos.z-m.pos.z,d=Math.hypot(ox,oz);
  mover(m,d>4?ox:0,d>4?oz:0,m.def.vel*(d>12?1.5:1));
};
IA_EXTRA.piglinLY=(m,dt)=>{
  if(!LY.activo)return;
  let obj=null,dmin=8;
  for(const o of mobs)if(esGolemLY(o)||(o.tipo==='aldeano'&&!o.muerto)){const d=o.pos.distanceTo(m.pos);if(d<dmin){dmin=d;obj=o;}}
  const dj=jugador.pos.distanceTo(m.pos);if(dj<dmin&&estado==='jugando'){dmin=dj;obj={pos:jugador.pos,jugador:true};}
  if(obj){const ox=obj.pos.x-m.pos.x,oz=obj.pos.z-m.pos.z,d=Math.hypot(ox,oz);mover(m,d>1.6?ox:0,d>1.6?oz:0,m.def.vel*1.15);m.yawObj=Math.atan2(ox,oz);
    if(d<=2)golpearLY52(m,obj,m.def.dano,d);return;}
  const a=LY.aldea,ox=a.x-m.pos.x,oz=a.z-m.pos.z,d=Math.hypot(ox,oz);
  mover(m,d>2.5?ox:0,d>2.5?oz:0,m.def.vel);
  if(d<=3.2&&m.cd<=0){m.cd=1.2;a.vida-=m.tipo==='piglinBrutoLY'?6:3;emitirParticulas(a.x+.5,a.y+2,a.z+.5,0xff4444,5,1.5,.5,0);sonar('golpe',m.pos,.4);}
};
function sueloLY52(x,z){for(let y=CY-2;y>2;y--){const b=getBloque(x,y,z);if(b&&SOLIDO[b]&&!esHojas(b))return y;}return NIVEL_MAR;}
// Busca tierra firme (no agua) para un portal piglin a unos 50-95 bloques de la aldea
function sitioTierraLY52(x0,z0,ang){
  for(const d of [70,60,80,90,50,95])for(const da of [0,.3,-.3,.6,-.6,.9,-.9]){
    const X=Math.round(x0+Math.cos(ang+da)*d),Z=Math.round(z0+Math.sin(ang+da)*d),Y=sueloLY52(X,Z);
    if(Y>=NIVEL_MAR&&!esAgua(getBloque(X,Y+1,Z))&&!esAgua(getBloque(X+4,Y+1,Z+4))&&!esAgua(getBloque(X-4,Y+1,Z-4)))return [X,Y,Z];}
  const X=Math.round(x0+Math.cos(ang)*70),Z=Math.round(z0+Math.sin(ang)*70),Y=NIVEL_MAR;   // sin tierra: plataforma sobre el agua
  for(let a=-5;a<=5;a++)for(let b=-5;b<=5;b++)for(let y=Y-4;y<Y;y++)setBloque(X+a,y,Z+b,B.netherrack);
  return [X,Y,Z];
}
// Quita lava (y agua) alrededor de un sitio para que la aldea y los portales sean seguros
function limpiarZonaLY52(x,y,z,r){
  for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)for(let dy=-4;dy<=6;dy++){const k=getBloque(x+a,y+dy,z+b);
    if(esLava(k)||(esAgua(k)&&Math.hypot(a,b)<r*.7))setBloque(x+a,y+dy,z+b,dy>0?0:(dy===0?B.cesped:B.tierra),{sinAviso:true});
    else if(k===B.fuego)setBloque(x+a,y+dy,z+b,0,{sinAviso:true});}
}
function iniciarLeyendas52(){
  if(typeof BW!=='undefined'&&BW&&BW.activo&&typeof salirDeBedwars==='function')salirDeBedwars();
  document.getElementById('finModo52')?.remove();
  MZ.activo=false;mundoId=null;metaMundo=null;selModo.value='supervivencia';
  window.semillaElegida=1+Math.floor(Math.random()*1e6);
  nuevoMundo();
  Object.assign(LY,{activo:true,madera:20,piedra:20,oro:0,bases:[],golems:[],spawners:[],torres:[],orden:'seguir',raidT:150,cdG:0,cosechado:new Set(),fin:false,piglinT:12});
  modo='supervivencia';tiempoDia=.27;lloviendo=false;mundoEstado.leyendas=true;
  const x0=Math.floor(jugador.pos.x),z0=Math.floor(jugador.pos.z),y0=sueloLY52(x0,z0);
  // La aldea: fuente central (el corazón que hay que proteger), casas y aldeanos
  LY.aldea={x:x0,y:y0,z:z0,vida:100};
  limpiarZonaLY52(x0,y0,z0,16);
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){setBloque(x0+a,y0,z0+b,B.ladrillosPiedra);for(let y=1;y<5;y++)setBloque(x0+a,y0+y,z0+b,0);}
  for(const [a,b] of [[-2,-2],[2,2],[-2,2],[2,-2]]){setBloque(x0+a,y0+1,z0+b,B.ladrillosPiedra);setBloque(x0+a,y0+2,z0+b,B.antorcha);}
  setBloque(x0,y0+1,z0,blq52('bloqueOro'));setBloque(x0,y0+2,z0,blq52('piedraLuminosa'));
  for(const [cx,cz] of [[9,0],[-9,2],[1,10],[-2,-10]]){const X=x0+cx,Z=z0+cz,Y=sueloLY52(X,Z);
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){setBloque(X+a,Y,Z+b,B.tablones);for(let y=1;y<=4;y++){const borde=Math.abs(a)===2||Math.abs(b)===2;
      setBloque(X+a,Y+y,Z+b,y===4?B.tablones:borde&&!(a===0&&b===2&&y<3)?(Math.abs(a)===2&&Math.abs(b)===2?B.tronco:B.tablones):0);}}
    setBloque(X,Y+3,Z,B.antorcha);crearMob('aldeano',X+.5,Y+1.1,Z+.5);}
  // Tres portales piglin a unos 70 bloques
  for(let k=0;k<3;k++){const [X,Y,Z]=sitioTierraLY52(x0,z0,k/3*Math.PI*2+Math.random()*.5);limpiarZonaLY52(X,Y,Z,8);
    for(let a=-5;a<=5;a++)for(let b=-5;b<=5;b++){setBloque(X+a,Y,Z+b,(a+b)%3?B.netherrack:blq52('bloqueMagma'));for(let y=1;y<=7;y++)setBloque(X+a,Y+y,Z+b,0);}
    for(let y=1;y<=5;y++)for(const a of [-2,2])setBloque(X+a,Y+y,Z,blq52('obsidiana'));for(const a of [-1,0,1]){setBloque(X+a,Y+1,Z,blq52('obsidiana'));setBloque(X+a,Y+5,Z,blq52('obsidiana'));}
    for(let y=2;y<=4;y++)for(const a of [-1,0,1])setBloque(X+a,Y+y,Z,blq52('verrugaBloque','netherrack'));
    for(const [a,b] of [[-4,-4],[4,4],[-4,4],[4,-4]])setBloque(X+a,Y+1,Z+b,blq52('bloqueOro'));
    LY.bases.push({x:X,y:Y,z:Z,vida:80,vidaMax:80});}
  inv=new Array(41).fill(null);inv[0]=crearPila(idClave('espada_hierro'));ranura=0;salud=20;hambre=20;
  jugador.pos.set(x0+.5,y0+1.01,z0+4.5);jugador.vel.set(0,0,0);vistaTercera=1;fuegoJ=0;efectos={};
  empezar();pintarHudLY52();
  aviso52('LEYENDAS','Protege la aldea y destruye los 3 portales piglin','#ffd84a',4);
}
function cosecharLY52(){
  if(LY.cdG>0){aviso52('','Los ayudantes vuelven en '+Math.ceil(LY.cdG)+' s','#aaa',1);return;}
  LY.cdG=4;const p=jugador.pos,X=Math.floor(p.x),Y=Math.floor(p.y),Z=Math.floor(p.z);let m=0,s=0;
  for(let dx=-10;dx<=10;dx++)for(let dz=-10;dz<=10;dz++)for(let dy=-4;dy<=10;dy++){const k=(X+dx)+','+(Y+dy)+','+(Z+dz);if(LY.cosechado.has(k))continue;
    const b=getBloqueSiCargado(X+dx,Y+dy,Z+dz);if(!b||b<0)continue;const nm=BLOQUES[b]&&BLOQUES[b].clave||'';
    if(m<14&&/^tronco/.test(nm)){m++;LY.cosechado.add(k);if(m%2)rayo52(new THREE.Vector3(X+dx+.5,Y+dy+.5,Z+dz+.5),p.clone().setY(p.y+1.2),0x9fd8ff);}
    else if(s<14&&(nm==='piedra'||nm==='roca'||nm==='andesita'||nm==='diorita'||nm==='granito')&&!getBloqueSiCargado(X+dx,Y+dy+1,Z+dz)){s++;LY.cosechado.add(k);if(s%2)rayo52(new THREE.Vector3(X+dx+.5,Y+dy+1,Z+dz+.5),p.clone().setY(p.y+1.2),0x9fd8ff);}}
  LY.madera+=m;LY.piedra+=s;sonar('recoger',null,.6);
  aviso52('Ayudantes',m||s?`+${m} madera · +${s} piedra`:'No queda nada cerca: muévete a otra zona','#9fd8ff',1.8);
}
const CONSTRUCCIONES52={
  1:{n:'Generador de golems de piedra',m:5,p:15},2:{n:'Generador de golems de tablas',m:15,p:5},
  3:{n:'Torre de flechas',m:10,p:10},4:{n:'Muro',m:0,p:6},5:{n:'Reparar la aldea',m:8,p:8}};
function construirLY52(k){
  const C=CONSTRUCCIONES52[k];if(!C)return;
  if(LY.madera<C.m||LY.piedra<C.p){aviso52('',`Falta: ${C.m} madera y ${C.p} piedra`,'#f88',1.5);return;}
  if(k===5){const a=LY.aldea;if(Math.hypot(jugador.pos.x-a.x,jugador.pos.z-a.z)>12){aviso52('','Acércate a la aldea para repararla','#f88',1.5);return;}
    if(a.vida>=100)return;a.vida=Math.min(100,a.vida+25);}
  else{
    const fx=-Math.sin(jugador.yaw),fz=-Math.cos(jugador.yaw),X=Math.floor(jugador.pos.x+fx*4),Z=Math.floor(jugador.pos.z+fz*4),Y=sueloLY52(X,Z);
    if(k===1||k===2){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){setBloque(X+a,Y+1,Z+b,k===1?B.roca:B.tablones);}setBloque(X,Y+2,Z,k===1?B.ladrillosPiedra:B.tronco);setBloque(X,Y+3,Z,B.antorcha);
      LY.spawners.push({x:X,y:Y+3,z:Z,tipo:k===1?'golemPiedraLY':'golemTablaLY',t:2,hechos:[]});}
    else if(k===3){for(let y=1;y<=4;y++)for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(y<4||Math.abs(a)+Math.abs(b)===1||(a===0&&b===0))setBloque(X+a,Y+y,Z+b,y===4?B.tablones:(Math.abs(a)===1&&Math.abs(b)===1?B.tronco:B.roca));
      setBloque(X,Y+5,Z,B.antorcha);LY.torres.push({x:X,y:Y+4,z:Z,cd:0});}
    else if(k===4){const px=-fz,pz=fx;for(let w=-2;w<=2;w++){const XX=Math.floor(jugador.pos.x+fx*3+px*w),ZZ=Math.floor(jugador.pos.z+fz*3+pz*w),YY=sueloLY52(XX,ZZ);for(let y=1;y<=3;y++)setBloque(XX,YY+y,ZZ,B.roca);}}
    emitirParticulas(X+.5,Y+1.5,Z+.5,0xdddddd,20,2,.6,0);
  }
  LY.madera-=C.m;LY.piedra-=C.p;sonar('colocar',null,.6);aviso52('',C.n,'#9fe0a0',1.4);
}
function golpeBaseLY52(){
  const p=jugador.pos;for(const b of LY.bases)if(b.vida>0&&Math.hypot(p.x-b.x,p.z-b.z)<5.5){b.vida-=4;emitirParticulas(b.x+.5,b.y+3,b.z+.5,0xaa2222,8,2,.5,0);sonar('golpe',null,.5);return;}
}
function actualizarLY52(dt){
  hambre=20;saturacion=5;LY.cdG=Math.max(0,LY.cdG-dt);
  // Generadores de golems
  LY.golems=mobs.filter(esGolemLY);
  for(const s of LY.spawners){s.hechos=s.hechos.filter(m=>!m.muerto);s.t-=dt;
    if(s.t<=0&&s.hechos.length<(s.tipo==='golemPiedraLY'?4:3)&&LY.golems.length<14){s.t=12;const m=crearMob(s.tipo,s.x+.5,s.y-1,s.z+1.5);if(m){m.domado=true;s.hechos.push(m);emitirParticulas(s.x+.5,s.y,s.z+.5,0xffffff,10,2,.5,0);}}}
  // Torres de flechas
  for(const t of LY.torres){t.cd-=dt;if(t.cd>0)continue;let o=null,dm=15;for(const m of mobs)if(esPiglinLY(m)){const d=Math.hypot(m.pos.x-t.x,m.pos.z-t.z);if(d<dm){dm=d;o=m;}}
    if(o){t.cd=1.4;rayo52(new THREE.Vector3(t.x+.5,t.y+1,t.z+.5),o.pos.clone().setY(o.pos.y+1),0xd8c8a0);o.inv=0;herirMob(o,4,null,'golem');}}
  // Portales piglin: generan piglins; de noche, asaltos
  LY.piglinT-=dt;LY.raidT-=dt;
  const vivas=LY.bases.filter(b=>b.vida>0);
  const nPig=mobs.filter(esPiglinLY).length;
  if(LY.piglinT<=0){LY.piglinT=20;if(nPig<18)for(const b of vivas)for(let k=0;k<2;k++){const m=crearMob(Math.random()<.2?'piglinBrutoLY':'piglinLY',b.x+.5+(k?2:-2),b.y+1.1,b.z+3.5);if(m){m.enfadado=999;m.domado=true;}}}
  if(LY.raidT<=0){LY.raidT=150;if(vivas.length){aviso52('¡ASALTO PIGLIN!','Defiende la aldea','#ff5555',3);sonar('eventoBW');
    for(const b of vivas)for(let k=0;k<4;k++){const m=crearMob(k===0?'piglinBrutoLY':'piglinLY',b.x+.5+k-1.5,b.y+1.1,b.z+3.5);if(m){m.enfadado=999;m.domado=true;}}}}
  for(const b of LY.bases){
    if(b.vida<=0&&!b.rota){b.rota=true;LY.oro+=10;
      for(let a=-2;a<=2;a++)for(let y=1;y<=5;y++)setBloque(b.x+a,b.y+y,b.z,0);
      for(let k=0;k<6;k++)emitirParticulas(b.x+.5,b.y+2+k*.5,b.z+.5,0xff6622,14,4,.9,2);sonar('explosion',{x:b.x,y:b.y,z:b.z},.8);
      aviso52('¡PORTAL DESTRUIDO!',`Quedan ${LY.bases.filter(c=>c.vida>0).length}`,'#ffd84a',3);}
    if(b.vida>0&&Math.random()<dt*3)emitirParticulas(b.x+.5,b.y+3,b.z+.5,0xa040ff,1,.6,1,-1);}
  for(const m of mobs)if(esPiglinLY(m)===false&&(m.tipo==='piglinLY'||m.tipo==='piglinBrutoLY')&&m.muerto&&!m.cobrado52){m.cobrado52=true;LY.oro++;}
  if(!LY.fin&&LY.bases.every(b=>b.vida<=0)){LY.fin=true;sonar('victoriaBW');
    pantallaFin52('¡VICTORIA!','Has destruido los tres portales piglin. ¡La aldea está a salvo!','#ffd84a',[['Jugar otra vez',iniciarLeyendas52],['Salir al menú',salirModo52]]);}
  if(!LY.fin&&LY.aldea.vida<=0){LY.fin=true;sonar('derrotaBW');
    pantallaFin52('LA ALDEA HA CAÍDO',`Destruiste ${LY.bases.filter(b=>b.vida<=0).length} de 3 portales.`,'#f55',[['Reintentar',iniciarLeyendas52],['Salir al menú',salirModo52]]);}
  pintarHudLY52();
}
function pintarHudLY52(){
  let el=document.getElementById('hudLY52');if(!el){el=document.createElement('div');el.id='hudLY52';el.className='hud52';document.body.appendChild(el);}
  const a=LY.aldea,vivas=LY.bases.filter(b=>b.vida>0),cerca=vivas.find(b=>Math.hypot(jugador.pos.x-b.x,jugador.pos.z-b.z)<20);
  el.innerHTML=`<b class="tit52">LEYENDAS</b>
    <div>Aldea <div class="barra52"><i style="width:${Math.max(0,a?a.vida:0)}%;background:${a&&a.vida<35?'#f55':'#6f6'}"></i></div></div>
    ${cerca?`<div>Portal piglin <div class="barra52"><i style="width:${Math.max(0,cerca.vida/cerca.vidaMax*100)}%;background:#c4f"></i></div></div>`:''}
    <div>🪵 Madera <b>${LY.madera}</b> · 🪨 Piedra <b>${LY.piedra}</b> · 🟡 Oro <b>${LY.oro}</b></div>
    <div>Portales: <b>${vivas.length}</b>/3 · Golems: <b>${LY.golems.length}</b> (${LY.orden==='atacar'?'atacando':'siguiéndote'})</div>
    <div class="arts52">${Object.entries(CONSTRUCCIONES52).map(([k,C])=>`<span class="${LY.madera>=C.m&&LY.piedra>=C.p?'':'no52'}"><b>${k}</b> ${C.n} <i>${C.m?C.m+'🪵':''}${C.p?' '+C.p+'🪨':''}</i></span>`).join('')}</div>
    <div class="pista52">G: ayudantes (recoger) · R: ¡al ataque! · F: seguidme · Clic junto a un portal: golpearlo<br>Asalto en ${Math.ceil(LY.raidT)} s</div>`;
}

/* ---------- Bucle y estilos ---------- */
const _actualizarFinal52=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinal52(dt);if(estado!=='jugando'&&estado!=='ui')return;if(MZ.activo)actualizarMZ52(dt);else if(LY.activo)actualizarLY52(dt);};
const _salirAlTitulo52=salirAlTitulo;
salirAlTitulo=function(){if(enModo52())return salirModo52();return _salirAlTitulo52.apply(this,arguments);};
for(const id of ['btnSalirTitulo','btnMuerteTitulo']){const b=document.getElementById(id);if(b)b.onclick=()=>salirAlTitulo();}
{const st=document.createElement('style');st.textContent=`
.hud52{position:fixed;left:10px;top:10px;z-index:5;pointer-events:none;background:rgba(10,12,20,.62);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:8px 12px;
  font:13px/1.45 system-ui,sans-serif;color:#eee;max-width:330px}
.hud52 .tit52{display:block;font:15px monospace;letter-spacing:2px;color:#ffd84a;margin-bottom:3px}
.hud52 .arts52{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}
.hud52 .arts52 span{border:1px solid #888;border-radius:6px;padding:1px 6px;font-size:11px;background:rgba(0,0,0,.25)}
.hud52 .arts52 span.no52{opacity:.45}
.hud52 .arts52 i{font-style:normal;color:#ccc}
.hud52 .pista52{font-size:11px;color:#aab;margin-top:3px}
.hud52 .barra52{display:inline-block;width:150px;height:7px;background:rgba(255,255,255,.15);border-radius:4px;vertical-align:middle;overflow:hidden;margin-left:6px}
.hud52 .barra52 i{display:block;height:100%}
#jefeMZ52{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;text-align:center;font:14px system-ui;color:#fdd;text-shadow:0 1px 2px #000}
#jefeMZ52 div{width:340px;height:10px;background:rgba(0,0,0,.5);border:1px solid #a33;border-radius:5px;margin-top:4px;overflow:hidden}
#jefeMZ52 i{display:block;height:100%;background:linear-gradient(90deg,#c22,#f55)}
@media (max-width:700px){.hud52{font-size:11px;max-width:230px}}`;document.head.appendChild(st);}
/* ---------- Menú ---------- */
(function(){
  const ref=document.getElementById('btnBedwars')||document.getElementById('btnOpcionesTitulo');if(!ref)return;
  const crear=(id,txt,fn,tip)=>{const b=document.createElement('button');b.id=id;b.textContent=txt;b.dataset.tip=tip;b.onclick=()=>{document.getElementById('menu').classList.add('oculto');fn();};ref.parentNode.insertBefore(b,ref.nextSibling);return b;};
  crear('btnLeyendas','Leyendas',iniciarLeyendas52,'Estrategia y acción: defiende la aldea, construye y manda a tus golems');
  crear('btnMazmorras','Mazmorras',()=>iniciarMazmorras52(1,false),'Acción y rol con cámara desde arriba: salas, botín y jefes');
})();
// Las criaturas de Leyendas nacen con la vida de su tipo (no la del modelo en que se basan)
const _crearMob52=crearMob;
crearMob=function(tipo){const m=_crearMob52.apply(this,arguments);if(m&&/LY$/.test(tipo)&&m.def&&m.def.vida){m.vida=m.vidaMax=m.def.vida;}return m;};
