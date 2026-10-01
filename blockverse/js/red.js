"use strict";
/* =========================================================
   Multijugador (base): salas para jugar juntos en el mismo
   mundo. Se ven los demás jugadores (con su nombre y lo que
   llevan en la mano), se sincronizan los bloques que pone y
   rompe cada uno y el chat. Tres formas de conectarse:
   · Local: otra pestaña del mismo navegador (para probar).
   · Internet sin servidor: WebRTC con códigos de invitación
     que se copian y pegan (el anfitrión y el invitado).
   · Servidor: un servidor de retransmisión WebSocket
     (servidor/servidor-multijugador.js en el repositorio).
   El anfitrión manda su mundo (semilla y cambios) al entrar.
   ========================================================= */
const RED={conectado:false,rol:null,id:Math.random().toString(36).slice(2,8),nombre:'Jugador',sala:null,
  transporte:null,remotos:new Map(),pares:new Map(),aplicando:false,enviadoT:0,pc:null,canal:null,ws:null};
try{RED.nombre=localStorage.getItem('blockverse-nombre')||('Jugador'+Math.floor(Math.random()*900+100));}catch(e){}
const VERSION_RED=1;

/* ---------- Envío y recepción ---------- */
function enviarRed(msg){
  if(!RED.conectado&&msg.t!=='hola')return;
  msg.de=RED.id; msg.v=VERSION_RED; if(RED.sala)msg.sala=RED.sala; const s=JSON.stringify(msg);
  try{
    if(RED.transporte==='local'&&RED.bc)RED.bc.postMessage(s);
    else if(RED.transporte==='webrtc'&&RED.canal&&RED.canal.readyState==='open')RED.canal.send(s);
    else if(RED.transporte==='servidor'&&RED.ws&&RED.ws.readyState===1)RED.ws.send(JSON.stringify({sala:RED.sala,datos:s}));
  }catch(e){}
}
function recibirRed(texto){
  let m;try{m=JSON.parse(texto);}catch(e){return;}
  if(!m||m.de===RED.id)return;
  if(RED.sala&&m.sala&&m.sala!==RED.sala)return;
  RED.conectado=true;
  if(m.t==='adios')RED.pares.delete(m.de);else if(!RED.pares.has(m.de)||m.nombre)RED.pares.set(m.de,m.nombre||RED.pares.get(m.de)||'Jugador');
  switch(m.t){
    case 'hola':
      RED.conectado=true;
      escribirChat(`${m.nombre} se ha unido a la partida`);
      if(RED.rol==='anfitrion')enviarRed({t:'mundo',semilla,modo,tiempoDia,ediciones:DIMS.superficie.ediciones,spawn:spawnMundo,nombres:[[RED.id,RED.nombre]]});
      enviarRed({t:'estado',...estadoLocal()});
      break;
    case 'mundo':
      if(RED.rol!=='invitado'||RED.mundoRecibido)return;
      RED.mundoRecibido=true;
      cargarMundoRemoto(m);
      break;
    case 'estado': actualizarRemoto(m); break;
    case 'bloque':
      RED.aplicando=true;try{setBloque(m.x,m.y,m.z,m.b);}finally{RED.aplicando=false;}
      break;
    case 'chat': escribirChat(`<${m.nombre}> ${m.texto}`); break;
    case 'adios': quitarRemoto(m.de); escribirChat(`${m.nombre||'Un jugador'} ha salido`); break;
  }
}
function estadoLocal(){const j=jugador;return {nombre:RED.nombre,p:[+j.pos.x.toFixed(2),+j.pos.y.toFixed(2),+j.pos.z.toFixed(2),+j.yaw.toFixed(3),+j.pitch.toFixed(3)],mano:enManoId(),agachado:!!j.agachado,dim:dim.clave};}
function cargarMundoRemoto(m){
  window.semillaElegida=m.semilla; mundoId=null; metaMundo=null;
  nuevoMundo();
  DIMS.superficie.ediciones=m.ediciones||{};
  quitarTodasLasMallas(dim); DIMS.superficie.chunks.clear();
  modo=m.modo||'supervivencia'; tiempoDia=m.tiempoDia??tiempoDia;
  if(m.spawn){spawnMundo=m.spawn;aparecer();}
  gestionarChunks(150,jugador.pos.x,jugador.pos.z);
  escribirChat('Has entrado en el mundo del anfitrión');
}

/* ---------- Jugadores remotos ---------- */
function actualizarRemoto(m){
  let r=RED.remotos.get(m.de);
  if(!r){
    const mod=modeloMob('botBW',{color:0x3a7ad0});
    const s=cartelTexto(m.nombre||'Jugador','#fff',320);s.scale.multiplyScalar(.7);s.position.set(0,2.45,0);mod.g.add(s);
    escena.add(mod.g); r={g:mod.g,piernas:mod.piernas,brazos:mod.brazos,cabeza:mod.extra.cabeza,obj:new THREE.Vector3(),yaw:0,pitch:0,fase:0,nombre:m.nombre,t:0};
    RED.remotos.set(m.de,r); escribirChat(`${m.nombre} está en la partida`);
  }
  r.obj.set(m.p[0],m.p[1],m.p[2]); r.yaw=m.p[3]; r.pitch=m.p[4]; r.t=0; r.dim=m.dim;
  r.g.visible=!m.dim||m.dim===dim.clave;
}
function quitarRemoto(id){const r=RED.remotos.get(id);if(!r)return;escena.remove(r.g);RED.remotos.delete(id);}
function animarRemotos(dt){
  for(const [id,r] of RED.remotos){
    r.t+=dt; if(r.t>15){quitarRemoto(id);continue;}
    const antes=r.g.position.clone();
    r.g.position.lerp(r.obj,Math.min(1,dt*12));
    r.g.rotation.y=r.yaw+Math.PI; if(r.cabeza)r.cabeza.rotation.x=-r.pitch*.6;
    const v=antes.distanceTo(r.g.position)/Math.max(dt,1e-3); r.fase+=dt*Math.min(10,v*2.2);
    const a=Math.sin(r.fase)*Math.min(.8,v*.25);
    for(const p of r.piernas)p.rotation.x=a*(p.userData.s||1);for(const b of r.brazos)b.rotation.x=-a*(b.userData.s||1);
  }
}

/* ---------- Transportes ---------- */
function conectarLocal(sala,rol){
  desconectarRed();
  RED.transporte='local'; RED.rol=rol; RED.sala=sala;
  RED.bc=new BroadcastChannel('blockverse-sala-'+sala);
  RED.bc.onmessage=e=>recibirRed(e.data);
  RED.conectado=rol==='anfitrion';
  enviarRed({t:'hola',nombre:RED.nombre});
}
// WebRTC con señalización manual: el anfitrión genera una invitación, el invitado responde con otro código
const ICE_RED=[{urls:'stun:stun.l.google.com:19302'}];
const codificar=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decodificar=t=>JSON.parse(decodeURIComponent(escape(atob(t.trim()))));
function esperarIce(pc){return new Promise(r=>{if(pc.iceGatheringState==='complete')return r();const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);r();}};pc.addEventListener('icegatheringstatechange',f);setTimeout(r,4000);});}
function prepararCanal(c){RED.canal=c;c.onopen=()=>{RED.conectado=true;escribirChat('Conectado por WebRTC');enviarRed({t:'hola',nombre:RED.nombre});};c.onmessage=e=>recibirRed(e.data);c.onclose=()=>{RED.conectado=false;escribirChat('Conexión cerrada');};}
async function crearInvitacionWebRTC(){
  desconectarRed(); RED.transporte='webrtc'; RED.rol='anfitrion';
  const pc=new RTCPeerConnection({iceServers:ICE_RED}); RED.pc=pc;
  prepararCanal(pc.createDataChannel('blockverse'));
  await pc.setLocalDescription(await pc.createOffer()); await esperarIce(pc);
  return codificar(pc.localDescription);
}
async function aceptarInvitacionWebRTC(codigo){
  desconectarRed(); RED.transporte='webrtc'; RED.rol='invitado';
  const pc=new RTCPeerConnection({iceServers:ICE_RED}); RED.pc=pc;
  pc.ondatachannel=e=>prepararCanal(e.channel);
  await pc.setRemoteDescription(decodificar(codigo));
  await pc.setLocalDescription(await pc.createAnswer()); await esperarIce(pc);
  return codificar(pc.localDescription);
}
async function completarWebRTC(respuesta){if(RED.pc)await RED.pc.setRemoteDescription(decodificar(respuesta));}
function conectarServidor(url,sala,rol){
  desconectarRed(); RED.transporte='servidor'; RED.rol=rol; RED.sala=sala;
  const ws=new WebSocket(url); RED.ws=ws;
  ws.onopen=()=>{ws.send(JSON.stringify({unirse:sala}));RED.conectado=rol==='anfitrion';enviarRed({t:'hola',nombre:RED.nombre});escribirChat('Conectado al servidor');};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(_){return;}if(m.datos)recibirRed(m.datos);};
  ws.onclose=()=>{RED.conectado=false;escribirChat('Desconectado del servidor');};
  ws.onerror=()=>mostrarMensaje('No se pudo conectar con el servidor');
}
function desconectarRed(){
  if(RED.conectado)enviarRed({t:'adios',nombre:RED.nombre});
  try{RED.bc&&RED.bc.close();}catch(e){} try{RED.canal&&RED.canal.close();}catch(e){} try{RED.pc&&RED.pc.close();}catch(e){} try{RED.ws&&RED.ws.close();}catch(e){}
  RED.bc=RED.canal=RED.pc=RED.ws=null; RED.conectado=false; RED.mundoRecibido=false; RED.pares.clear();
  for(const id of [...RED.remotos.keys()])quitarRemoto(id);
}
addEventListener('beforeunload',()=>{if(RED.conectado)enviarRed({t:'adios',nombre:RED.nombre});});

/* ---------- Ganchos en el juego ---------- */
const _colocarBloqueRed=colocarBloque;
colocarBloque=function(id){
  const q=RED.conectado?posColocar():null, ok=_colocarBloqueRed(id);
  if(ok&&q)enviarRed({t:'bloque',x:q[0],y:q[1],z:q[2],b:getBloque(q[0],q[1],q[2])});
  return ok;
};
const _romperApuntadoRed=romperApuntado;
romperApuntado=function(){
  const a=RED.conectado&&apuntado?{...apuntado}:null; const r=_romperApuntadoRed();
  if(a&&getBloque(a.x,a.y,a.z)!==a.b)enviarRed({t:'bloque',x:a.x,y:a.y,z:a.z,b:getBloque(a.x,a.y,a.z)});
  return r;
};
const _ejecutarComandoRed=ejecutarComando;
ejecutarComando=function(t){
  if(!t.startsWith('/')){escribirChat(`<${RED.nombre}> ${t}`);enviarRed({t:'chat',nombre:RED.nombre,texto:t.slice(0,200)});return;}
  const a=t.slice(1).trim().split(/\s+/);
  if(a[0]==='nombre'&&a[1]){RED.nombre=a.slice(1).join(' ').slice(0,16);try{localStorage.setItem('blockverse-nombre',RED.nombre);}catch(e){}escribirChat('Ahora te llamas '+RED.nombre);return;}
  if(a[0]==='jugadores'){escribirChat(`En la sala: ${RED.nombre} (tú)${[...RED.remotos.values()].map(r=>', '+r.nombre).join('')}`);return;}
  return _ejecutarComandoRed(t);
};
const _actualizarFinalRed=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalRed(dt);
  if(RED.remotos.size)animarRemotos(dt);
  if(RED.conectado&&(RED.enviadoT-=dt)<=0){RED.enviadoT=.1;enviarRed({t:'estado',...estadoLocal()});}
};

/* ---------- Pantalla de multijugador ---------- */
(function menuRed(){
  const tarjeta=document.querySelector('#menu .pantallaTitulo'), ref=document.getElementById('btnBedwars')||document.getElementById('btnOpcionesTitulo');
  const b=document.createElement('button');b.id='btnMultijugador';b.textContent='Multijugador';ref.parentNode.insertBefore(b,ref);
  const capa=document.createElement('div');capa.id='pantallaRed';capa.className='capa oculto';
  capa.innerHTML=`<div class="tarjeta pantallaMC" style="max-width:560px"><h2>Multijugador</h2>
    <div class="opcion"><label for="redNombre">Tu nombre</label><input id="redNombre" maxlength="16"></div>
    <h3>En este ordenador (otra pestaña)</h3>
    <div class="fila"><button id="redCrearLocal">Crear sala</button><input id="redSalaLocal" placeholder="Código de sala" maxlength="8" style="width:120px"><button id="redUnirLocal" class="secundario">Unirse</button></div>
    <h3>Por internet sin servidor (WebRTC)</h3>
    <p class="pista">Anfitrión: «Crear invitación» y envía el código a tu amigo. Tu amigo pega la invitación, pulsa «Responder» y te devuelve su código; tú lo pegas y pulsas «Conectar».</p>
    <textarea id="redCodigo" rows="3" style="width:100%" placeholder="Pega aquí la invitación o la respuesta"></textarea>
    <div class="fila"><button id="redInvitar">Crear invitación</button><button id="redResponder" class="secundario">Responder</button><button id="redConectar" class="secundario">Conectar</button></div>
    <h3>Servidor (opcional)</h3>
    <div class="fila"><input id="redUrl" placeholder="wss://tu-servidor" style="flex:1"><input id="redSalaSrv" placeholder="Sala" maxlength="12" style="width:90px"><button id="redCrearSrv">Crear</button><button id="redUnirSrv" class="secundario">Unirse</button></div>
    <p id="redEstado" class="pista">Sin conectar.</p>
    <button id="redJugar">Jugar</button><button id="redVolver" class="secundario">Volver</button></div>`;
  document.body.appendChild(capa);
  const $r=id=>capa.querySelector('#'+id), est=t=>$r('redEstado').textContent=t;
  $r('redNombre').value=RED.nombre;
  $r('redNombre').onchange=()=>{RED.nombre=$r('redNombre').value.trim().slice(0,16)||RED.nombre;try{localStorage.setItem('blockverse-nombre',RED.nombre);}catch(e){}};
  const asegurarMundo=()=>{if(!semilla||!DIMS.superficie.chunks.size){window.semillaElegida=0;mundoId=null;metaMundo=null;nuevoMundo();}};
  b.onclick=()=>{document.getElementById('menu').classList.add('oculto');capa.classList.remove('oculto');};
  $r('redVolver').onclick=()=>{capa.classList.add('oculto');document.getElementById('menu').classList.remove('oculto');};
  $r('redJugar').onclick=()=>{capa.classList.add('oculto');asegurarMundo();empezar();};
  $r('redCrearLocal').onclick=()=>{asegurarMundo();const s=Math.random().toString(36).slice(2,7).toUpperCase();$r('redSalaLocal').value=s;conectarLocal(s,'anfitrion');est(`Sala ${s} creada. Abre el juego en otra pestaña y únete con ese código.`);};
  $r('redUnirLocal').onclick=()=>{const s=$r('redSalaLocal').value.trim().toUpperCase();if(!s)return est('Escribe el código de la sala.');conectarLocal(s,'invitado');est(`Uniéndote a la sala ${s}…`);};
  $r('redInvitar').onclick=async()=>{asegurarMundo();est('Creando invitación…');try{$r('redCodigo').value=await crearInvitacionWebRTC();est('Invitación lista: cópiala y envíasela. Después pega aquí su respuesta y pulsa «Conectar».');}catch(e){est('WebRTC no está disponible en este navegador.');}};
  $r('redResponder').onclick=async()=>{try{$r('redCodigo').value=await aceptarInvitacionWebRTC($r('redCodigo').value);est('Respuesta lista: cópiala y devuélvesela al anfitrión.');}catch(e){est('Ese código de invitación no es válido.');}};
  $r('redConectar').onclick=async()=>{try{await completarWebRTC($r('redCodigo').value);est('Conectando…');}catch(e){est('Ese código de respuesta no es válido.');}};
  $r('redCrearSrv').onclick=()=>{asegurarMundo();const u=$r('redUrl').value.trim(),s=($r('redSalaSrv').value.trim()||Math.random().toString(36).slice(2,7)).toUpperCase();$r('redSalaSrv').value=s;if(!u)return est('Escribe la dirección del servidor.');conectarServidor(u,s,'anfitrion');est(`Sala ${s} en el servidor.`);};
  $r('redUnirSrv').onclick=()=>{const u=$r('redUrl').value.trim(),s=$r('redSalaSrv').value.trim().toUpperCase();if(!u||!s)return est('Escribe el servidor y la sala.');conectarServidor(u,s,'invitado');est('Conectando…');};
  setInterval(()=>{if(!capa.classList.contains('oculto')&&RED.conectado)est(`Conectado (${RED.transporte}) · ${RED.remotos.size+1} jugador(es)`);},1000);
})();
