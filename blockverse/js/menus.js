"use strict";
/* =========================================================
   Pantallas del menú como en el original: título, seleccionar
   mundo, crear nuevo mundo, opciones y menú de pausa. Cada
   mundo se guarda por separado con su nombre, modo y tipo;
   el modo de juego se elige al crear el mundo.
   ========================================================= */
const IDX_MUNDOS='blockverse-mundos';
const PANTALLAS=['menu','pantallaMundos','pantallaCrear','pantallaOpciones','pausa'];
function leerIndice(){try{const l=JSON.parse(localStorage.getItem(IDX_MUNDOS)||'[]');return Array.isArray(l)?l:[];}catch(e){return [];}}
function escribirIndice(l){try{localStorage.setItem(IDX_MUNDOS,JSON.stringify(l));}catch(e){}}
let metaMundo=null;
function actualizarIndiceMundo(){
  if(!mundoId)return;
  const l=leerIndice(); let m=l.find(w=>w.id===mundoId); if(!m){m={id:mundoId,creado:Date.now()};l.push(m);}
  const ob=mundoEstado&&mundoEstado.oneBlock;
  Object.assign(m,metaMundo||{},{modo,semilla,jugado:Date.now(),tipo:ob?'oneblock':'normal',fase:ob?FASES_OB[ob.fase].nombre:null,bloques:ob?ob.n:null});
  metaMundo=Object.assign(metaMundo||{},{nombre:m.nombre});
  escribirIndice(l);
}
// La partida guardada con la versión anterior pasa a ser un mundo más de la lista
(function migrar(){
  try{
    if(localStorage.getItem('blockverse-migrado'))return;
    const viejo=localStorage.getItem(CLAVE_GUARDADO);
    if(viejo){const s=JSON.parse(viejo);if(s&&s.semilla){
      const id='m'+Date.now().toString(36);
      localStorage.setItem('blockverse-mundo-'+id,viejo);
      const ob=s.mundoEstado&&s.mundoEstado.oneBlock;
      const l=leerIndice(); l.push({id,nombre:ob?'One Block':'Mi mundo',modo:s.modo||'supervivencia',semilla:s.semilla,creado:Date.now(),jugado:Date.now(),tipo:ob?'oneblock':'normal'});
      escribirIndice(l);}}
    localStorage.setItem('blockverse-migrado','1');
  }catch(e){}
})();

function mostrarPantalla(id){for(const p of PANTALLAS)$(p).classList.toggle('oculto',p!==id);}
function ocultarPantallas(){for(const p of PANTALLAS)$(p).classList.add('oculto');}
const _empezarBase=empezar;
empezar=function(){ocultarPantallas();_empezarBase();};
pausar=function(){
  if(estado!=='jugando')return;
  estado='menu'; soltarControles(); mostrarPantalla('pausa');
  if(document.pointerLockElement)try{document.exitPointerLock();}catch(e){}
  $('infoPausa').textContent=metaMundo?`${metaMundo.nombre} · ${modo==='creativo'?'Creativo':'Supervivencia'}${mundoEstado.oneBlock?' · One Block':''}`:'';
  if(typeof capturarMiniatura==='function')capturarMiniatura();
  guardarYa();
};
document.addEventListener('keydown',e=>{
  if(e.code!=='Escape'||e.repeat)return;
  if(!$('pausa').classList.contains('oculto')){e.preventDefault();empezar();}
  else if(!$('pantallaCrear').classList.contains('oculto'))abrirSeleccion();
  else if(!$('pantallaMundos').classList.contains('oculto'))mostrarPantalla('menu');
  else if(!$('pantallaOpciones').classList.contains('oculto'))$('btnListoOpciones').click();
});

/* ---------- Pantalla de título: panorámica que gira ---------- */
const SPLASHES=['¡Ahora con One Block!','¡Con caballos!','¡Lanzas!','¡100% hecho a mano!','¡Mira, un creeper!','¡Nubes en 3D!','¡Atardeceres!','¡Ahora con agua brillante!','¡No te caigas al vacío!','¡Élitros!'];
$('splash').textContent=SPLASHES[Math.floor(Math.random()*SPLASHES.length)];
(function panoramica(){
  requestAnimationFrame(panoramica);
  if(estado==='menu'&&!mundoId){jugador.yaw+=.0012;jugador.pitch+=(-.08-jugador.pitch)*.05;}
})();

/* ---------- Seleccionar mundo ---------- */
let mundoSel=null, confirmarBorrar=0;
function fechaCorta(t){if(!t)return '';const d=new Date(t);return d.toLocaleDateString('es',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});}
function pintarLista(){
  const filtro=$('buscarMundo').value.trim().toLowerCase();
  const l=leerIndice().sort((a,b)=>(b.jugado||0)-(a.jugado||0)).filter(w=>!filtro||(w.nombre||'').toLowerCase().includes(filtro));
  const cont=$('listaMundos'); cont.innerHTML='';
  if(!l.length){cont.innerHTML='<div class="vacioMundos">No hay mundos todavía. Pulsa «Crear nuevo mundo».</div>';}
  for(const w of l){
    const d=document.createElement('div'); d.className='mundo'+(w.id===mundoSel?' sel':'');
    const img=document.createElement('img'); img.className='miniatura'; img.alt='';
    let mini=null; try{mini=localStorage.getItem('blockverse-mini-'+w.id);}catch(e){}
    img.src=mini||ICONOS[w.tipo==='oneblock'?B.cofre:B.cesped]||'';
    const t=document.createElement('div');
    const nombre=document.createElement('b'); nombre.textContent=w.nombre||'Mundo';
    const f=document.createElement('small'); f.textContent=`Última partida: ${fechaCorta(w.jugado)}`;
    const k=document.createElement('small'); k.className='tipo';
    k.textContent=`${w.modo==='creativo'?'Creativo':'Supervivencia'} · ${w.tipo==='oneblock'?`One Block${w.fase?` (${w.fase}, ${w.bloques||0} ${w.bloques===1?"bloque":"bloques"})`:''}`:'Normal'}`;
    t.append(nombre,f,k); d.append(img,t);
    d.onclick=()=>{mundoSel=w.id;confirmarBorrar=0;$('btnBorrarMundo').textContent='Borrar';pintarLista();};
    d.ondblclick=()=>abrirMundo(w.id);
    cont.appendChild(d);
  }
  $('btnJugarMundo').disabled=!mundoSel; $('btnBorrarMundo').disabled=!mundoSel;
}
function abrirSeleccion(){mundoSel=null;$('buscarMundo').value='';mostrarPantalla('pantallaMundos');pintarLista();}
$('btnJugar').onclick=abrirSeleccion;
$('buscarMundo').oninput=pintarLista;
$('btnCancelarMundos').onclick=()=>mostrarPantalla('menu');
$('btnJugarMundo').onclick=()=>{if(mundoSel)abrirMundo(mundoSel);};
$('btnBorrarMundo').onclick=()=>{
  if(!mundoSel)return;
  const b=$('btnBorrarMundo');
  if(!confirmarBorrar){confirmarBorrar=1;b.textContent='¿Seguro? Pulsa otra vez';return;}
  try{localStorage.removeItem('blockverse-mundo-'+mundoSel);localStorage.removeItem('blockverse-mini-'+mundoSel);}catch(e){}
  escribirIndice(leerIndice().filter(w=>w.id!==mundoSel));
  mundoSel=null; confirmarBorrar=0; b.textContent='Borrar'; pintarLista();
};
function limpiarMundoActual(){
  quitarTodasLasMallas(dim); for(const d of Object.values(DIMS)){d.chunks.clear();d.ediciones={};}
  chunksSucios.clear(); limpiarMobs(); limpiarEntidades(); limpiarSimulacion(); quitarDragon();
  hornos={}; cofres={}; mundoEstado={dragonMuerto:false,cristalesRotos:[],fin:false};
}
function abrirMundo(id){
  let s=null; try{s=JSON.parse(localStorage.getItem('blockverse-mundo-'+id)||'null');}catch(e){}
  if(!s||!s.semilla){mostrarMensaje('No se pudo cargar ese mundo.');return;}
  limpiarMundoActual();
  mundoId=id; metaMundo=Object.assign({},leerIndice().find(w=>w.id===id)||{id,nombre:'Mundo'});
  aplicarGuardado(s); selModo.value=modo; guardado=true;
  actualizarHUD(); actualizarIndiceMundo();
  const fin=()=>{if(salud<=0){ocultarPantallas();estado='muerto';mostrarHud(true);$('muerte').classList.remove('oculto');}else empezar();};
  if(typeof cargarTerreno==='function')cargarTerreno(fin);else{gestionarChunks(150,jugador.pos.x,jugador.pos.z);fin();}
}

/* ---------- Crear nuevo mundo ---------- */
let modoCrear='supervivencia', tipoCrear='normal';
const TEXTO_MODO={supervivencia:['Supervivencia','Busca recursos, fabrica, gana niveles, vida y hambre.'],creativo:['Creativo','Recursos ilimitados, vuelo libre y destruye bloques al instante.']};
const TEXTO_TIPO={normal:['Normal','Un mundo infinito con biomas, cuevas y estructuras.'],oneblock:['One Block','Empiezas sobre un solo bloque en el vacío que cambia cada vez que lo rompes. Si caes, mueres.']};
function pintarCrear(){
  $('btnModoMundo').textContent='Modo de juego: '+TEXTO_MODO[modoCrear][0]; $('ayudaModo').textContent=TEXTO_MODO[modoCrear][1];
  $('btnTipoMundo').textContent='Tipo de mundo: '+TEXTO_TIPO[tipoCrear][0]; $('ayudaTipo').textContent=TEXTO_TIPO[tipoCrear][1];
}
$('btnCrearMundo').onclick=()=>{
  modoCrear='supervivencia'; tipoCrear='normal';
  const n=leerIndice().length; $('nombreMundo').value=n?`Nuevo mundo (${n+1})`:'Nuevo mundo'; $('semillaMundo').value='';
  pintarCrear(); mostrarPantalla('pantallaCrear'); setTimeout(()=>$('nombreMundo').select(),30);
};
$('btnModoMundo').onclick=()=>{modoCrear=modoCrear==='supervivencia'?'creativo':'supervivencia';pintarCrear();};
$('btnTipoMundo').onclick=()=>{tipoCrear=tipoCrear==='normal'?'oneblock':'normal';pintarCrear();
  const nm=$('nombreMundo'); if(/^Nuevo mundo/.test(nm.value)&&tipoCrear==='oneblock')nm.value='One Block';else if(nm.value==='One Block'&&tipoCrear==='normal')nm.value='Nuevo mundo';};
$('btnCancelarCrear').onclick=abrirSeleccion;
function semillaDeTexto(t){
  t=t.trim(); if(!t)return 0;
  if(/^-?\d+$/.test(t))return Math.abs(parseInt(t,10))%1e9+1;
  let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%1e9+1;
}
$('btnConfirmarCrear').onclick=()=>{
  const nombre=$('nombreMundo').value.trim()||'Nuevo mundo';
  window.semillaElegida=semillaDeTexto($('semillaMundo').value);
  selModo.value=modoCrear;
  mundoId='m'+Date.now().toString(36); metaMundo={id:mundoId,nombre,creado:Date.now()};
  const generar=()=>{if(tipoCrear==='oneblock')nuevoOneBlock(); else nuevoMundo(); guardarYa();};
  if(typeof cargarTerreno==='function'){mostrarCarga('Generando el mundo');setTimeout(()=>{generar();cargarTerreno(empezar);},40);}
  else{generar();empezar();}
};
$('nombreMundo').addEventListener('keydown',e=>{if(e.key==='Enter')$('btnConfirmarCrear').click();});

/* ---------- Opciones ---------- */
let opcionesDesde='menu';
$('btnOpcionesTitulo').onclick=()=>{opcionesDesde='menu';mostrarPantalla('pantallaOpciones');};
$('btnOpcionesPausa').onclick=()=>{opcionesDesde='pausa';mostrarPantalla('pantallaOpciones');};
$('btnListoOpciones').onclick=()=>mostrarPantalla(opcionesDesde);

/* ---------- Pausa y salir al título ---------- */
function salirAlTitulo(){
  if(typeof capturarMiniatura==='function'&&estado!=='muerto')capturarMiniatura();
  guardarYa(); mundoId=null; metaMundo=null;
  estado='menu'; soltarControles(); if(ui)cerrarUI();
  $('muerte').classList.add('oculto'); mostrarHud(false); mostrarPantalla('menu');
  if(document.pointerLockElement)try{document.exitPointerLock();}catch(e){}
}
$('btnVolverJuego').onclick=()=>empezar();
$('btnSalirTitulo').onclick=salirAlTitulo;
$('btnMuerteTitulo').onclick=salirAlTitulo;
mostrarPantalla('menu');
