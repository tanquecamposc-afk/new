"use strict";
/* =========================================================
   Estado general, HUD, cielo, entrada, guardado y bucle
   ========================================================= */
let estado='menu'; // menu | jugando | ui | muerto | durmiendo | creditos | chat
let tiempoDia=.02, sol=1, lloviendo=false, climaT=900;
const DURACION_DIA=1200;
const $=id=>document.getElementById(id);

/* ---------- HUD ---------- */
const elBarra=$('barra'), elNombre=$('nombreBloque'), elHud=$('hud'), elInfo=$('info');
const slotsBarra=[];
for(let i=0;i<9;i++){const d=document.createElement('div');d.className='slot';elBarra.appendChild(d);slotsBarra.push(d);}
const filas={};
for(const f of ['armadura','corazones','comida','burbujas']){filas[f]=[];for(let i=0;i<10;i++){const im=document.createElement('img');im.alt='';$(f).appendChild(im);filas[f].push(im);}}
let firmaBarra='', ultimoNombre='', temporizadorNombre=0;
function pintarFila(f,val,ic,visible=true){
  $(f).style.visibility=visible?'visible':'hidden';
  filas[f].forEach((im,i)=>{const v=val-i*2;const s=v>=2?ic.lleno:v>=1?ic.medio:ic.vacio;if(im.getAttribute('src')!==s)im.setAttribute('src',s);});
}
function actualizarHUD(){
  const firma=inv.slice(0,9).map(p=>p?p.id+':'+p.n+':'+(p.dur||'')+(p.enc?'e':''):'').join('|')+'#'+ranura;
  if(firma!==firmaBarra){
    firmaBarra=firma;
    slotsBarra.forEach((d,i)=>{d.className='slot'+(i===ranura?' activa':'');d.innerHTML=`<span class="num">${i+1}</span>`+htmlPila(inv[i]);});
  }
  const p=inv[ranura], nom=p?ITEMS[p.id].nombre:'';
  if(nom+ranura!==ultimoNombre){ultimoNombre=nom+ranura;elNombre.textContent=nom;elNombre.style.opacity=1;
    clearTimeout(temporizadorNombre);temporizadorNombre=setTimeout(()=>elNombre.style.opacity=0,1600);}
  const sup=supervivencia();
  $('filasEstado').style.visibility=sup?'visible':'hidden';
  $('barraXP').style.visibility=sup?'visible':'hidden';
  if(sup){
    const arm=armaduraTotal().def;
    pintarFila('armadura',arm,IC_ARMADURA,arm>0);
    pintarFila('corazones',Math.ceil(salud),efectos.veneno?IC_VENENO:IC_VIDA);
    pintarFila('comida',hambre,efectos.hambre?IC_HAMBRE:IC_COMIDA);
    const b=Math.ceil(aire/1.5);
    filas.burbujas.forEach((im,i)=>{im.style.visibility=aire<15&&i<b?'visible':'hidden';if(!im.getAttribute('src'))im.setAttribute('src',IC_BURBUJA);});
    $('barraXP').firstChild.style.width=(xp.puntos/xpNecesaria(xp.nivel)*100)+'%';
    $('nivelXP').textContent=xp.nivel>0?xp.nivel:'';
  }
}
function mostrarHud(v){
  [$('mira'),elHud].forEach(e=>e.classList.toggle('oculto',!v));
  $('cargaAtaque').classList.toggle('oculto',!v);
  elInfo.classList.toggle('oculto',!v||!infoVisible);
}
let temporizadorMensaje=0;
function mostrarMensaje(t){
  const m=$('mensaje');m.textContent=t;m.style.opacity=1;
  clearTimeout(temporizadorMensaje);temporizadorMensaje=setTimeout(()=>m.style.opacity=0,3500);
}
function destelloDano(){const f=$('flash');f.style.transition='none';f.style.opacity=1;requestAnimationFrame(()=>{f.style.transition='opacity .45s';f.style.opacity=0;});}
function efectoPortal(f){$('velPortal').style.opacity=clamp(f,0,1)*.8;}
function mostrarJefe(){
  const j=$('jefe');
  if(!dragon||dim!==DIMS.end){j.classList.add('oculto');return;}
  j.classList.remove('oculto');j.querySelector('i').style.width=(dragon.vida/VIDA_DRAGON*100)+'%';
}
function mostrarCreditos(){
  estado='creditos';soltarControles();mostrarHud(false);
  if(document.pointerLockElement)document.exitPointerLock();
  $('creditos').classList.remove('oculto');mundoEstado.fin=true;guardarPartida();
}
$('btnCreditos').onclick=()=>{
  $('creditos').classList.add('oculto');
  let destino=null;
  if(spawnCama)destino=spawnCama;
  cambiarDimension(DIMS.superficie,0,0,0,true);
  if(destino&&getBloque(...destino)===B.cama){jugador.pos.set(destino[0]+.5,destino[1]+.6,destino[2]+.5);}else aparecer();
  jugador.bloqueoPortal=false; empezar();
};

/* ---------- Chat y comandos ---------- */
const elChatLog=$('chatLog'), elChatIn=$('chatEntrada');
function escribirChat(t){
  const d=document.createElement('div');d.textContent=t;elChatLog.appendChild(d);
  while(elChatLog.children.length>8)elChatLog.firstChild.remove();
  setTimeout(()=>{d.style.opacity=0;setTimeout(()=>d.remove(),700);},9000);
}
function abrirChat(inicial){
  if(estado!=='jugando')return;
  estado='chat';soltarControles();elChatIn.classList.remove('oculto');elChatIn.value=inicial||'';
  if(document.pointerLockElement)document.exitPointerLock();
  setTimeout(()=>elChatIn.focus(),30);
}
function cerrarChat(){elChatIn.classList.add('oculto');elChatIn.blur();if(estado==='chat')empezar();}
const CLAVE_A_ID={};ITEMS.forEach((it,i)=>{if(it)CLAVE_A_ID[it.clave.toLowerCase()]=i;});
function ejecutarComando(t){
  const [cmd,...a]=t.trim().replace(/^\//,'').split(/\s+/);
  const ok=m=>escribirChat(m);
  switch((cmd||'').toLowerCase()){
    case 'help':ok('Comandos: /gamemode survival|creative · /time set day|night|<0-24000> · /tp x y z · /give objeto [cantidad] · /kill · /weather clear|rain · /xp n · /locate stronghold|fortress · /seed · /effect clear · /spawnpoint · /summon criatura');break;
    case 'gamemode':case 'gm':{const m=(a[0]||'').toLowerCase();
      if(['s','0','survival','supervivencia'].includes(m))modo='supervivencia';else if(['c','1','creative','creativo'].includes(m))modo='creativo';else{ok('Modo desconocido.');break;}
      selModo.value=modo;if(!supervivencia())darKitCreativo();actualizarHUD();ok('Modo: '+(supervivencia()?'Supervivencia':'Creativo'));break;}
    case 'time':{let v=a[1]||a[0];const m={day:1000,dia:1000,noon:6000,night:13000,noche:13000,midnight:18000};
      const n=m[v]!==undefined?m[v]:parseInt(v,10);if(isNaN(n)){ok('Uso: /time set day');break;}
      tiempoDia=(n/24000)%1;ok('Hora cambiada.');break;}
    case 'tp':{const [x,y,z]=a.map(Number);if([x,y,z].some(isNaN)){ok('Uso: /tp x y z');break;}
      jugador.pos.set(x,y+OY,z);jugador.vel.set(0,0,0);jugador.maxY=jugador.pos.y;ok(`Teletransportado a ${x} ${y} ${z}`);break;}
    case 'give':{const id=CLAVE_A_ID[(a[0]||'').toLowerCase()];if(id===undefined){ok('Objeto desconocido. Ejemplos: diamante, pico_diamante, ojoEnder, obsidiana');break;}
      let n=parseInt(a[1]||'1',10);while(n>0){const k=Math.min(n,maxPila(id));n-=k;const r=insertarInv(crearPila(id,k));if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}
      ok('Recibiste '+ITEMS[id].nombre+'.');break;}
    case 'kill':danarJugador(1000,'vacio',null);break;
    case 'weather':lloviendo=(a[0]||'')==='rain';climaT=600;ok(lloviendo?'Empieza a llover.':'El cielo se despeja.');break;
    case 'xp':ganarXP(parseInt(a[0]||'0',10));ok('Experiencia añadida.');break;
    case 'seed':ok('Semilla: '+semilla);break;
    case 'effect':efectos={};ok('Efectos eliminados.');break;
    case 'spawnpoint':spawnCama=null;spawnMundo=[jugador.pos.x,jugador.pos.z];ok('Punto de aparición fijado.');break;
    case 'locate':{
      if((a[0]||'').startsWith('str')){const f=posFortaleza();ok(`Fortaleza cerca de X ${f.x}, Z ${f.z} (bajo tierra, Y ${f.y-OY}).`);}
      else{const fs=fortalezasCerca(jugador.pos.x,jugador.pos.z).sort((p,q)=>Math.hypot(p.x-jugador.pos.x,p.z-jugador.pos.z)-Math.hypot(q.x-jugador.pos.x,q.z-jugador.pos.z));
        ok(fs.length?`Fortaleza del Nether cerca de X ${fs[0].x}, Z ${fs[0].z} (coordenadas del Nether).`:'No hay fortalezas cerca.');}
      break;}
    case 'summon':{const t=(a[0]||'').toLowerCase();if(!DEF_MOB[t]){ok('Criaturas: '+Object.keys(DEF_MOB).join(', '));break;}
      camara.getWorldDirection(dirVista);crearMob(t,jugador.pos.x+dirVista.x*3,jugador.pos.y+.2,jugador.pos.z+dirVista.z*3);ok(NOMBRE_MOB[t]+' invocado.');break;}
    default:ok('Comando desconocido. Escribe /help');
  }
}
elChatIn.addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.code==='Enter'){const t=elChatIn.value.trim();if(t)ejecutarComando(t);cerrarChat();}
  else if(e.code==='Escape')cerrarChat();
});

/* ---------- Cielo, clima y niebla ---------- */
const tmpC=new THREE.Color();
function actualizarCielo(dt){
  const c=camara.position;
  const sup=dim===DIMS.superficie;
  sol3d.visible=luna3d.visible=estrellas.visible=nubes.visible=sup;
  cieloEnd.visible=dim===DIMS.end;
  let uDia=0;
  if(sup){
    const a=tiempoDia*Math.PI*2;
    sol=Math.sin(a);
    const luzDia=.2+.8*clamp((sol+.2)/.5,0,1);
    factorCielo=luzDia*(lloviendo?.7:1);
    uDia=factorCielo;
    const fDia=clamp((sol+.15)/.45,0,1);
    cielo.copy(CIELO_NOCHE).lerp(CIELO_DIA,fDia);
    const ocaso=clamp(1-Math.abs(sol)/.22,0,1)*.45;
    if(ocaso>0&&!lloviendo)cielo.lerp(CIELO_OCASO,ocaso);
    if(lloviendo)cielo.lerp(tmpC.copy(CIELO_LLUVIA).multiplyScalar(.3+fDia*.7),.7);
    const dx=Math.cos(a),dy=Math.sin(a);
    sol3d.position.set(c.x+dx*350,c.y+dy*350,c.z+40); sol3d.lookAt(c);
    luna3d.position.set(c.x-dx*350,c.y-dy*350,c.z-40); luna3d.lookAt(c);
    estrellas.position.copy(c); estrellas.material.opacity=clamp(-sol*3,0,1)*(lloviendo?0:1);
    nubes.material.color.setScalar(.25+.75*luzDia*(lloviendo?.6:1));
    nubes.position.x=c.x; nubes.position.z=c.z;
    texNubes.offset.set((c.x+tiempoJuego*1.5)/(64*4),-(c.z)/(64*4));
    escena.fog.near=radio*CX*.55; escena.fog.far=radio*CX;
  }else{
    sol=0; factorCielo=0;
    cielo.setHex(dim.niebla);
    escena.fog.near=dim===DIMS.nether?8:radio*CX*.5; escena.fog.far=dim===DIMS.nether?radio*CX*.8:radio*CX*1.2;
    cieloEnd.position.copy(c);
  }
  // Bajo el agua o la lava
  const ojo=getBloque(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z));
  if(esAgua(ojo)){cielo.setHex(0x14306a);escena.fog.near=.5;escena.fog.far=14;}
  else if(esLava(ojo)){cielo.setHex(0xc04010);escena.fog.near=0;escena.fog.far=1.5;}
  escena.fog.color.copy(cielo);
  for(const m of [matOpaco,matTrans]){m.uniforms.uDia.value=uDia;m.uniforms.uAmb.value=dim.amb;}
  matTrans.uniforms.uTiempo.value=tiempoJuego;
  // Lluvia
  const llueveAqui=sup&&lloviendo&&!OPACO[getBloque(Math.floor(c.x),Math.min(CY-1,Math.floor(c.y)+6),Math.floor(c.z))];
  lluvia.visible=llueveAqui;
  if(llueveAqui){
    const pos=lluvia.geometry.attributes.position;
    for(let i=0;i<N_GOTAS;i++){const g=gotas[i];g.y-=dt*22;if(g.y<-12){g.y=18;g.x=(Math.random()-.5)*40;g.z=(Math.random()-.5)*40;}
      pos.setXYZ(i*2,c.x+g.x,c.y+g.y,c.z+g.z);pos.setXYZ(i*2+1,c.x+g.x,c.y+g.y-.7,c.z+g.z);}
    pos.needsUpdate=true;
  }
}
function textoHora(){
  const h=(tiempoDia*24+6)%24;
  return `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor((h%1)*60)).padStart(2,'0')}`;
}
function actualizarClima(dt){
  if(dim!==DIMS.superficie)return;
  tiempoDia=(tiempoDia+dt/DURACION_DIA)%1;
  climaT-=dt;
  if(climaT<=0){lloviendo=!lloviendo;climaT=lloviendo?150+Math.random()*300:500+Math.random()*1200;}
}

/* ---------- Guardado ---------- */
const CLAVE_GUARDADO='blockverse-mundo-v3';
let guardado=null, temporizadorGuardado=0;
function cargarPartida(){
  try{const s=JSON.parse(localStorage.getItem(CLAVE_GUARDADO)||'null');if(s&&s.semilla)guardado=s;}catch(e){guardado=null;}
}
function guardarPartida(){
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado=setTimeout(()=>{try{
    const j=jugador;
    localStorage.setItem(CLAVE_GUARDADO,JSON.stringify({semilla,modo,dim:dim.clave,
      ediciones:{superficie:DIMS.superficie.ediciones,nether:DIMS.nether.ediciones,end:DIMS.end.ediciones},
      hornos,cofres,mundoEstado,inv,tiempoDia,lloviendo,climaT,
      j:{pos:[j.pos.x,j.pos.y,j.pos.z,j.yaw,j.pitch,j.vuela],salud,hambre,saturacion,aire,xp,efectos,spawnMundo,spawnCama}}));
  }catch(e){}},300);
}
function aplicarGuardado(s){
  semilla=s.semilla; modo=s.modo||'supervivencia';
  for(const k of ['superficie','nether','end'])DIMS[k].ediciones=(s.ediciones&&s.ediciones[k])||{};
  hornos=s.hornos||{}; cofres=s.cofres||{}; mundoEstado=Object.assign({dragonMuerto:false,cristalesRotos:[],fin:false},s.mundoEstado||{});
  inv=(s.inv||[]).slice(0,40); while(inv.length<40)inv.push(null);
  tiempoDia=s.tiempoDia??.02; lloviendo=!!s.lloviendo; climaT=s.climaT||900;
  const j=s.j||{};
  salud=j.salud??20; hambre=j.hambre??20; saturacion=j.saturacion??5; aire=j.aire??15;
  xp=j.xp||{nivel:0,puntos:0}; efectos=j.efectos||{}; spawnMundo=j.spawnMundo||null; spawnCama=j.spawnCama||null;
  dim=DIMS[s.dim]||DIMS.superficie;
  if(j.pos){jugador.pos.set(j.pos[0],j.pos[1],j.pos[2]);jugador.yaw=j.pos[3]||0;jugador.pitch=j.pos[4]||0;jugador.vuela=!!j.pos[5];jugador.maxY=j.pos[1];}
  else aparecer();
  if(!spawnMundo){const p=jugador.pos.clone();aparecer();jugador.pos.copy(p);}
  if(dim===DIMS.end&&!mundoEstado.dragonMuerto){crearCristales();crearDragon();}
}
function darKitCreativo(){[B.cesped,B.tierra,B.piedra,B.roca,B.tablones,B.tronco,B.vidrio,B.antorcha,B.mesa].forEach((id,i)=>{if(!inv[i])inv[i]=crearPila(id,64);});}

/* ---------- Estados ---------- */
const elMenu=$('menu'), selModo=$('selModo'), selDist=$('selDistancia');
function bloquear(){try{const r=lienzo.requestPointerLock&&lienzo.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}
function soltarControles(){for(const k in teclas)teclas[k]=false;clicIzq=clicDer=false;comiendo=-1;minado=null;if(arcoCarga>=0)arcoCarga=-1;jugador.corriendo=false;}
function empezar(){
  iniciarAudio();
  estado='jugando'; elMenu.classList.add('oculto'); $('muerte').classList.add('oculto');
  mostrarHud(true); actualizarHUD(); bloquear();
}
function pausar(){
  if(estado!=='jugando')return;
  estado='menu'; soltarControles(); elMenu.classList.remove('oculto');
  $('btnJugar').textContent='Continuar'; guardarPartida();
}
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==lienzo&&estado==='jugando')pausar();});
$('btnReaparecer').onclick=()=>{reaparecer();empezar();};
$('btnJugar').onclick=()=>{
  if(salud<=0&&supervivencia()){elMenu.classList.add('oculto');estado='muerto';$('muerte').classList.remove('oculto');return;}
  empezar();
};
const btnNuevo=$('btnNuevo');
let confirmarNuevo=0;
btnNuevo.onclick=()=>{
  if(guardado&&!confirmarNuevo){
    btnNuevo.textContent='Pulsa otra vez: se borrará este mundo';
    confirmarNuevo=setTimeout(()=>{confirmarNuevo=0;btnNuevo.textContent='Nuevo mundo';},3000);return;}
  clearTimeout(confirmarNuevo);confirmarNuevo=0;btnNuevo.textContent='Nuevo mundo';
  nuevoMundo(); empezar();
};
function nuevoMundo(){
  quitarTodasLasMallas(dim); for(const d of Object.values(DIMS)){d.chunks.clear();d.ediciones={};}
  chunksSucios.clear(); limpiarMobs(); limpiarEntidades(); limpiarSimulacion(); quitarDragon();
  semilla=1+Math.floor(Math.random()*1e6); hornos={}; cofres={}; mundoEstado={dragonMuerto:false,cristalesRotos:[],fin:false};
  dim=DIMS.superficie; spawnMundo=null; spawnCama=null;
  inv=new Array(40).fill(null); modo=selModo.value; if(!supervivencia())darKitCreativo();
  salud=20;hambre=20;saturacion=5;agotamiento=0;aire=15;xp={nivel:0,puntos:0};efectos={};fuegoJ=0;
  tiempoDia=.02; lloviendo=false; climaT=900;
  aparecer(); jugador.vuela=false; jugador.yaw=0; jugador.pitch=0;
  gestionarChunks(150,jugador.pos.x,jugador.pos.z);
  guardado=true; guardarPartida();
}
selModo.onchange=()=>{modo=selModo.value;if(!supervivencia())darKitCreativo();else jugador.vuela=false;actualizarHUD();guardarPartida();};
try{const r=localStorage.getItem('blockverse-radio');if(r)selDist.value=r;}catch(e){}
radio=+selDist.value;
selDist.onchange=()=>{radio=+selDist.value;calcularOffsets();try{localStorage.setItem('blockverse-radio',radio);}catch(e){}};
lienzo.addEventListener('click',()=>{if(estado==='jugando'&&document.pointerLockElement!==lienzo)bloquear();});
document.addEventListener('pointerlockerror',()=>{if(estado==='jugando'&&!document.pointerLockElement){}});

/* ---------- Entrada ---------- */
let ultimoEspacio=0, clicIzq=false, clicDer=false, repetir=0, minado=null, sonidoMinar=0, infoVisible=false;
document.addEventListener('keydown',e=>{
  if(estado==='chat')return;
  if(e.code==='KeyE'&&!e.repeat){if(estado==='jugando')abrirUI(supervivencia()?'inv':'paleta');else if(estado==='ui')cerrarUI();return;}
  if(e.code==='Escape'&&estado==='ui'){cerrarUI();return;}
  if(estado!=='jugando')return;
  if(e.code==='F3'){e.preventDefault();infoVisible=!infoVisible;elInfo.classList.toggle('oculto',!infoVisible);return;}
  if((e.code==='KeyT'||e.code==='Slash')&&!e.repeat){e.preventDefault();abrirChat(e.code==='Slash'?'/':'');return;}
  teclas[e.code]=true;
  if(e.code==='Space'){e.preventDefault();
    const ahora=performance.now();
    if(!e.repeat&&!supervivencia()){if(ahora-ultimoEspacio<280){jugador.vuela=!jugador.vuela;jugador.vel.y=0;}ultimoEspacio=ahora;}}
  if(e.code==='KeyW'&&!e.repeat){const ahora=performance.now();if(ahora-ultimaW<300&&!(supervivencia()&&hambre<=6))jugador.corriendo=true;ultimaW=ahora;}
  if(e.code==='KeyF'&&!e.repeat&&!supervivencia()){jugador.vuela=!jugador.vuela;jugador.vel.y=0;}
  if(e.code==='KeyQ'&&!e.repeat)tirarEnMano(e.shiftKey);
  if(/^Digit[1-9]$/.test(e.code)){ranura=+e.code.slice(5)-1;comiendo=-1;arcoCarga=-1;actualizarHUD();}
});
document.addEventListener('keyup',e=>{teclas[e.code]=false;if(e.code==='KeyW')jugador.corriendo=jugador.corriendo&&false;});
window.addEventListener('blur',soltarControles);
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==lienzo||estado!=='jugando')return;
  jugador.yaw-=e.movementX*0.0022; jugador.pitch-=e.movementY*0.0022;
  jugador.pitch=Math.max(-Math.PI/2+.001,Math.min(Math.PI/2-.001,jugador.pitch));
});
document.addEventListener('mousedown',e=>{
  if(document.pointerLockElement!==lienzo||estado!=='jugando')return;
  actualizarApuntado();
  if(e.button===0){clicIzq=true;
    if(apuntadoEnt)atacar();
    else{balancearMano();if(!supervivencia()){romperApuntado();repetir=.28;}}
  }
  if(e.button===1&&!supervivencia()&&apuntado&&ITEMS[apuntado.b]){inv[ranura]=crearPila(apuntado.b,maxPila(apuntado.b));actualizarHUD();}
  if(e.button===2){clicDer=true;usarDerecho();repetir=.25;}
});
document.addEventListener('mouseup',e=>{
  if(e.button===0){clicIzq=false;minado=null;}
  if(e.button===2){clicDer=false;comiendo=-1;if(arcoCarga>=0)soltarArco();}
});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('wheel',e=>{if(estado!=='jugando')return;ranura=(ranura+(e.deltaY>0?1:-1)+9)%9;comiendo=-1;arcoCarga=-1;actualizarHUD();},{passive:true});
window.addEventListener('resize',()=>{camara.aspect=innerWidth/innerHeight;camara.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function tirarEnMano(todo){
  const p=enMano(); if(!p)return;
  camara.getWorldDirection(dirVista);
  const n=todo?p.n:1, uno={...p,n};
  if((p.n-=n)<=0)inv[ranura]=null;
  soltarItem(uno,camara.position.x+dirVista.x*.5,camara.position.y-.3+dirVista.y*.5,camara.position.z+dirVista.z*.5,false,
    new THREE.Vector3(dirVista.x*5,dirVista.y*5+1.5,dirVista.z*5));
  actualizarHUD();
}
function manejarClics(dt){
  cdUso-=dt;
  const elUso=$('barraUso');
  if(comiendo>=0){
    if(!clicDer||!puedeComer())comiendo=-1;
    else{const antes=comiendo;comiendo+=dt;if(Math.floor(antes/.3)!==Math.floor(comiendo/.3))sonar('comer');
      if(comiendo>=1.6){terminarComer();comiendo=puedeComer()&&clicDer?0:-1;}}
  }
  if(arcoCarga>=0)arcoCarga+=dt;
  const uso=comiendo>=0?comiendo/1.6:arcoCarga>=0?Math.min(1,arcoCarga):-1;
  elUso.classList.toggle('oculto',uso<0); if(uso>=0)elUso.firstChild.style.width=(uso*100)+'%';
  $('cargaAtaque').firstChild.style.width=(cargaAtaque()*100)+'%';
  $('cargaAtaque').style.visibility=cargaAtaque()<1?'visible':'hidden';
  if(clicIzq){
    if(apuntadoEnt){minado=null;if(cargaAtaque()>=1)atacar();}
    else if(!supervivencia()){repetir-=dt;if(repetir<=0){repetir=.2;romperApuntado();}}
    else if(apuntado){
      if(!minado||minado.x!==apuntado.x||minado.y!==apuntado.y||minado.z!==apuntado.z)minado={x:apuntado.x,y:apuntado.y,z:apuntado.z,prog:0};
      const t=tiempoRomper(apuntado.b,enMano());
      minado.prog+=t===0?1:dt/t;
      sonidoMinar-=dt;if(sonidoMinar<=0){sonidoMinar=.24;sonar('golpeBloque');balancearMano();
        emitirParticulas(apuntado.x+.5+apuntado.n[0]*.5,apuntado.y+.5+apuntado.n[1]*.5,apuntado.z+.5+apuntado.n[2]*.5,colorTile[BLOQUES[apuntado.b].lado],2,1.2,.4);}
      if(minado.prog>=1){romperApuntado();minado=null;}
    }else minado=null;
  }
  if(clicDer&&comiendo<0&&arcoCarga<0&&cdUso<=0){
    const p=enMano();
    if(p&&ITEMS[p.id].bloque&&(!apuntado||!BLOQUES[apuntado.b].inter)){repetir-=dt;if(repetir<=0){repetir=.22;usarDerecho();}}
  }
  grietas.visible=!!minado&&minado.prog>0;
  if(grietas.visible){grietas.position.set(minado.x+.5,minado.y+.5,minado.z+.5);
    grietas.material.map=texGrietas[Math.min(9,Math.floor(minado.prog*10))];}
}

/* ---------- Inicio ---------- */
cargarPartida();
if(guardado){aplicarGuardado(guardado);$('btnJugar').textContent='Continuar';}
else{semilla=1+Math.floor(Math.random()*1e6);aparecer();if(!supervivencia())darKitCreativo();}
selModo.value=modo;
calcularOffsets();
gestionarChunks(250,jugador.pos.x,jugador.pos.z);
actualizarHUD();

let previo=performance.now(), fpsT=0, fpsN=0, fps=0, guardadoT=0, despawnT=0, hornoUIT=0;
function bucle(ahora){
  requestAnimationFrame(bucle);
  const dt=Math.min(.05,(ahora-previo)/1000); previo=ahora;
  const activo=estado!=='menu'&&estado!=='creditos';
  if(activo){
    tiempoJuego+=dt;
    actualizarClima(dt);
    if(estado!=='muerto')fisicaJugador(dt,estado==='jugando');
    if(estado!=='muerto')actualizarEstadoJugador(dt);
    if(estado==='jugando'||estado==='ui')comprobarPortales(dt);
    for(let i=mobs.length-1;i>=0;i--){const m=mobs[i];if(m&&!m.muerto)actualizarMob(m,dt);}
    generarMobs(dt); actualizarGeneradores(dt);
    despawnT-=dt; if(despawnT<=0){despawnT=2;despawnMobs();}
    actualizarDragon(dt);
    actualizarEntidades(dt);
    actualizarHornos(dt);
    if(ui&&ui.horno){hornoUIT-=dt;if(hornoUIT<=0){hornoUIT=.2;refrescarUI();}}
    procesarLiquidos(); procesarHojas(); ticksAleatorios(dt,jugador.pos.x,jugador.pos.z);
    guardadoT+=dt; if(guardadoT>10){guardadoT=0;guardarPartida();}
  }
  actualizarParticulas(dt);
  gestionarChunks(estado==='menu'?20:7,jugador.pos.x,jugador.pos.z);
  const agachado=jugador.agachado;
  camara.position.set(jugador.pos.x,jugador.pos.y+(agachado?1.32:1.62),jugador.pos.z);
  camara.rotation.set(jugador.pitch,jugador.yaw,0);
  camara.fov+=(((jugador.corriendo&&estado==='jugando')?84:75)-camara.fov)*Math.min(1,dt*8); camara.updateProjectionMatrix();
  oyente=camara.position;
  actualizarApuntado();
  if(estado==='jugando')manejarClics(dt);else{grietas.visible=false;$('barraUso').classList.add('oculto');}
  actualizarCielo(dt);
  const brillo=brilloEn(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z);
  actualizarMano(enManoId(),brillo,dt,agachado);
  $('fuegoVista').style.opacity=fuegoJ>0?.9:0;
  renderer.render(escena,camara);
  fpsN++; fpsT+=dt;
  if(fpsT>=.5){fps=Math.round(fpsN/fpsT);fpsN=0;fpsT=0;
    if(infoVisible){
      const p=jugador.pos, l=luzEn(Math.floor(p.x),Math.floor(p.y+.5),Math.floor(p.z));
      const bio=dim===DIMS.superficie?NOMBRES_BIOMA[infoColumna(Math.floor(p.x),Math.floor(p.z)).bioma]:'—';
      elInfo.textContent=`Blockverse  ${fps} FPS\nXYZ: ${p.x.toFixed(1)} / ${(p.y-OY).toFixed(1)} / ${p.z.toFixed(1)}\n`+
        `Dimensión: ${dim.nombre} · Bioma: ${bio}\nLuz: cielo ${l>>4}, bloque ${l&15}\n`+
        `${supervivencia()?'Supervivencia':'Creativo'}${jugador.vuela?' (vuelo)':''} · ${textoHora()}${lloviendo&&dim===DIMS.superficie?' · lluvia':''}\n`+
        `Criaturas: ${mobs.length} · Entidades: ${entidades.length} · Chunks: ${dim.chunks.size}`;
    }
  }
}
requestAnimationFrame(bucle);
