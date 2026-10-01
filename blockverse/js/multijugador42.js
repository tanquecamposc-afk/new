"use strict";
/* =========================================================
   Multijugador fácil: jugar con amigos por internet con un
   código de 5 letras, sin servidor propio.
   1. El anfitrión pulsa «Crear partida» y le sale un código.
   2. Se lo pasa a sus amigos (por WhatsApp, en voz…).
   3. Cada amigo escribe el código y pulsa «Unirse».
   Usa PeerJS (incluido en js/lib) para conectar los
   navegadores directamente (WebRTC); el servidor público
   gratuito de PeerJS solo sirve para que se encuentren. El
   anfitrión reenvía los mensajes entre todos los invitados,
   así que pueden entrar varios amigos a la vez.
   Las formas antiguas (otra pestaña, códigos largos de
   WebRTC y servidor propio) siguen en «Otras formas».
   ========================================================= */
const PREFIJO_PEER='blockverse-v1-';
const LETRAS_SALA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function codigoSala42(){let s='';for(let i=0;i<5;i++)s+=LETRAS_SALA[Math.floor(Math.random()*LETRAS_SALA.length)];return s;}
function opcionesPeer42(){return Object.assign({debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:global.stun.twilio.com:3478'}]}},window.PEER_OPC||{});}
const MENSAJE_ERROR_PEER={
  'peer-unavailable':'No hay ninguna partida con ese código. Revisa las letras o pide al anfitrión que la cree de nuevo.',
  'unavailable-id':'Ese código ya está en uso. Pulsa «Crear partida» otra vez.',
  'network':'No se pudo conectar a internet (o la red del colegio/trabajo lo bloquea).',
  'server-error':'El servicio de conexión no responde. Prueba dentro de un rato.',
  'socket-error':'No se pudo conectar a internet (o la red lo bloquea).',
  'browser-incompatible':'Este navegador no permite jugar en red (WebRTC).',
  'webrtc':'No se pudo conectar con el otro jugador (vuestras redes no se dejan conectar entre sí).',
};
function textoError42(err){return MENSAJE_ERROR_PEER[err&&err.type]||('Error de conexión: '+(err&&(err.message||err.type)||err));}

// Conexión de datos: lo que llega se procesa y, si soy anfitrión, se reenvía al resto
function prepararConexion42(conn,estadoCb){
  conn.on('data',d=>{
    const texto=typeof d==='string'?d:String(d);
    if(!conn.idJugador){try{const m=JSON.parse(texto);if(m&&m.de){conn.idJugador=m.de;conn.nombre=m.nombre||conn.nombre;}}catch(e){}}
    recibirRed(texto);
    if(RED.rol==='anfitrion')for(const c of RED.conns)if(c!==conn&&c.open)try{c.send(texto);}catch(e){}
    if(estadoCb)estadoCb();
  });
  conn.on('close',()=>{
    RED.conns=(RED.conns||[]).filter(c=>c!==conn);
    if(RED.rol==='anfitrion'){if(conn.idJugador){quitarRemoto(conn.idJugador);RED.pares.delete(conn.idJugador);}
      escribirChat(`${conn.nombre||'Un jugador'} se ha desconectado`);}
    else{RED.conectado=false;escribirChat('Se ha perdido la conexión con el anfitrión');mostrarMensaje('Se ha perdido la conexión con el anfitrión');}
    if(estadoCb)estadoCb();
  });
  conn.on('error',()=>{});
}
function crearPartida42(alListo){
  if(typeof Peer==='undefined'){alListo&&alListo(null,'No se pudo cargar la conexión (falta js/lib/peerjs.min.js).');return;}
  desconectarRed();
  const codigo=codigoSala42();
  RED.transporte='peer'; RED.rol='anfitrion'; RED.sala=codigo; RED.conns=[]; RED.codigo=codigo;
  const peer=new Peer(PREFIJO_PEER+codigo,opcionesPeer42()); RED.peer=peer;
  peer.on('open',()=>{RED.conectado=true;escribirChat(`Partida creada. Código: ${codigo}`);alListo&&alListo(codigo,null);});
  peer.on('connection',conn=>{
    conn.on('open',()=>{RED.conns.push(conn);alListo&&alListo(codigo,null);});
    prepararConexion42(conn,()=>alListo&&alListo(codigo,null));
  });
  peer.on('error',err=>{if(err&&err.type==='unavailable-id'){peer.destroy();crearPartida42(alListo);return;}alListo&&alListo(null,textoError42(err));});
  peer.on('disconnected',()=>{try{peer.reconnect();}catch(e){}});
}
function unirsePartida42(codigo,alListo){
  if(typeof Peer==='undefined'){alListo&&alListo(false,'No se pudo cargar la conexión (falta js/lib/peerjs.min.js).');return;}
  codigo=String(codigo||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
  if(codigo.length!==5){alListo&&alListo(false,'El código tiene 5 letras o números.');return;}
  desconectarRed();
  RED.transporte='peer'; RED.rol='invitado'; RED.sala=codigo; RED.conns=[]; RED.codigo=codigo;
  const peer=new Peer(opcionesPeer42()); RED.peer=peer;
  let hecho=false;
  const t=setTimeout(()=>{if(!hecho)alListo&&alListo(false,'No responde nadie con ese código. ¿El anfitrión tiene la partida abierta?');},15000);
  peer.on('open',()=>{
    const conn=peer.connect(PREFIJO_PEER+codigo,{reliable:true,metadata:{nombre:RED.nombre}});
    prepararConexion42(conn);
    conn.on('open',()=>{hecho=true;clearTimeout(t);RED.conns=[conn];RED.conectado=true;enviarRed({t:'hola',nombre:RED.nombre});alListo&&alListo(true,null);});
  });
  peer.on('error',err=>{hecho=true;clearTimeout(t);alListo&&alListo(false,textoError42(err));});
}
const _desconectarRed42=desconectarRed;
desconectarRed=function(){
  const r=_desconectarRed42.apply(this,arguments);
  for(const c of RED.conns||[])try{c.close();}catch(e){}
  RED.conns=[]; if(RED.peer){try{RED.peer.destroy();}catch(e){}RED.peer=null;} RED.codigo=null;
  return r;
};
// Al recibir el mundo del anfitrión, el invitado entra directamente a jugar
const _cargarMundoRemoto42=cargarMundoRemoto;
cargarMundoRemoto=function(m){
  const r=_cargarMundoRemoto42.apply(this,arguments);
  const capa=document.getElementById('pantallaRed');
  if(RED.transporte==='peer'&&capa&&!capa.classList.contains('oculto')){capa.classList.add('oculto');setTimeout(()=>{if(estado==='menu')empezar();},300);}
  return r;
};

/* ---------- Pantalla nueva, sencilla ---------- */
(function(){
  const capa=document.getElementById('pantallaRed'); if(!capa)return;
  const t=capa.querySelector('.tarjeta');
  const st=document.createElement('style');st.textContent=`
#redFacil{background:rgba(0,0,0,.35);border:2px solid #000;padding:10px;margin:6px 0 10px;text-align:left}
#redFacil h3{margin:0 0 6px}#redFacil ol{margin:4px 0 8px 18px;padding:0;font-size:13px;color:#ddd;line-height:1.5}
#redFacil .filaF{display:flex;gap:8px;align-items:center;margin:6px 0}
#redFacil .filaF button{margin:0;width:auto;flex:1}
#redCodigoUnirse{font:bold 22px monospace;letter-spacing:6px;text-transform:uppercase;width:150px;text-align:center}
#redCodigoGrande{display:none;align-items:center;gap:10px;justify-content:center;margin:8px 0;padding:8px;background:#111;border:2px solid #555}
#redCodigoGrande b{font:bold 34px monospace;letter-spacing:8px;color:#ff5}
#redCodigoGrande button{width:auto;margin:0;padding:4px 10px;font-size:13px}
#redEstadoFacil{font-size:13px;color:#aaa;min-height:18px}
#redEstadoFacil.ok{color:#7f7}#redEstadoFacil.mal{color:#f77}
#redJugadores{font-size:13px;color:#ddd;margin-top:4px}
#redAvanzado{margin-top:6px;text-align:left}#redAvanzado summary{cursor:pointer;color:#aaa;font-size:13px;margin-bottom:6px}`;
  document.head.appendChild(st);
  const caja=document.createElement('div');caja.id='redFacil';
  caja.innerHTML=`<h3>Jugar con amigos por internet</h3>
    <ol><li><b>Uno crea la partida</b> (el anfitrión): pulsa «Crear partida» y le sale un <b>código de 5 letras</b>. Se juega en su mundo.</li>
      <li><b>Le pasa el código</b> a sus amigos (por mensaje o en voz).</li>
      <li><b>Cada amigo</b> abre el juego, entra en Multijugador, escribe el código y pulsa «Unirse». ¡Y a jugar!</li></ol>
    <div class="filaF"><button id="redCrearFacil">Crear partida</button></div>
    <div id="redCodigoGrande"><span>Código:</span><b id="redCodigoTexto">-----</b><button id="redCopiar" class="secundario">Copiar</button></div>
    <div class="filaF"><input id="redCodigoUnirse" maxlength="5" placeholder="CÓDIGO" autocomplete="off" spellcheck="false"><button id="redUnirFacil" class="secundario">Unirse</button></div>
    <div id="redEstadoFacil"></div><div id="redJugadores"></div>
    <div class="pista" style="font-size:12px;margin-top:6px">Hace falta internet. Si estáis en la misma casa también funciona. Algunas redes (colegio, trabajo) bloquean las conexiones entre jugadores: si no conecta, probad con los datos del móvil o en otra red. Para Bed Wars en equipo, el anfitrión entra en Bed Wars y pulsa «¡Jugar!» cuando estéis todos.</div>`;
  const h2=t.querySelector('h2'); h2.insertAdjacentElement('afterend',caja);
  // Las formas antiguas, dentro de «Otras formas de conectar»
  const det=document.createElement('details');det.id='redAvanzado';det.innerHTML='<summary>Otras formas de conectar (avanzado)</summary>';
  const moverDesde=[...t.children].filter(e=>e!==h2&&e!==caja&&!['redEstado','redJugar','redVolver'].includes(e.id)&&!e.querySelector('#redNombre'));
  moverDesde.forEach(e=>det.appendChild(e));
  const est=t.querySelector('#redEstado'); t.insertBefore(det,est);
  const $r=id=>capa.querySelector('#'+id), estado42=(txt,cls)=>{const e=$r('redEstadoFacil');e.textContent=txt;e.className=cls||'';};
  const pintarJugadores=()=>{const n=RED.transporte==='peer'?(RED.rol==='anfitrion'?RED.conns.length:(RED.conectado?1:0)):0;
    const nombres=[...RED.remotos.values()].map(r=>r.nombre).filter(Boolean);
    $r('redJugadores').textContent=RED.conectado&&RED.transporte==='peer'?(RED.rol==='anfitrion'?`Conectados: ${n} amigo(s)${nombres.length?' — '+nombres.join(', '):''}`:'Conectado a la partida'):'';};
  const asegurarMundo=()=>{if(!semilla||!DIMS.superficie.chunks.size){window.semillaElegida=0;mundoId=null;metaMundo=null;nuevoMundo();}};
  $r('redCrearFacil').onclick=()=>{
    asegurarMundo(); estado42('Creando partida…');
    crearPartida42((codigo,err)=>{
      if(err){estado42(err,'mal');$r('redCodigoGrande').style.display='none';return;}
      $r('redCodigoGrande').style.display='flex'; $r('redCodigoTexto').textContent=codigo;
      estado42(RED.conns.length?'¡Ya hay amigos conectados! Pulsa «Jugar» para entrar.':'Partida creada. Pasa el código a tus amigos y pulsa «Jugar».','ok'); pintarJugadores();
    });
  };
  $r('redCopiar').onclick=()=>{const c=$r('redCodigoTexto').textContent;try{navigator.clipboard.writeText(c);estado42('Código copiado: '+c,'ok');}catch(e){estado42('Código: '+c);}};
  const unir=()=>{
    const c=$r('redCodigoUnirse').value; estado42('Conectando…');
    unirsePartida42(c,(ok,err)=>{if(!ok){estado42(err,'mal');return;}estado42('¡Conectado! Cargando el mundo del anfitrión…','ok');pintarJugadores();});
  };
  $r('redUnirFacil').onclick=unir;
  $r('redCodigoUnirse').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')unir();});
  $r('redCodigoUnirse').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
  setInterval(()=>{if(!capa.classList.contains('oculto'))pintarJugadores();},1000);
})();

// /codigo: muestra el código de la partida en el chat
const _ejecutarComando42=ejecutarComando;
ejecutarComando=function(t){
  if(/^\/(codigo|código|code)\b/i.test(t.trim())){escribirChat(RED.codigo?`Código de la partida: ${RED.codigo}`:'No estás en una partida con código.');return;}
  return _ejecutarComando42(t);
};
