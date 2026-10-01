"use strict";
/* =========================================================
   Opciones, paquetes de recursos y mods que funcionan
   - Opciones ordenadas en pantallas (como el original):
     Gráficos y rendimiento, Música y sonidos, Controles,
     Interfaz y Personaje. Todas caben en pantallas bajas
     (Chromebook) y se pueden desplazar.
   - Nuevo: tamaño de la interfaz.
   - Arreglado: «Nubes: No» ya quita las nubes.
   - Arreglado: el botón «Multijugador» repetido (y apagado)
     de la pantalla de título.
   - Mods: si el navegador no deja guardar, siguen instalados
     durante la partida; si no deja ejecutar código con
     new Function se prueban otras formas; se pueden pegar
     mods escribiendo el código; y se puede arrastrar un .js
     o un .zip/.mcpack a la ventana para instalarlo.
   ========================================================= */

/* ---------- Nubes: la opción manda sobre el cielo ---------- */
const _actualizarCielo40=actualizarCielo;
actualizarCielo=function(dt){_actualizarCielo40(dt);if(!OPC.nubes&&typeof nubes!=='undefined')nubes.visible=false;};

/* ---------- Tamaño de la interfaz ---------- */
if(OPC.escalaUI===undefined)OPC.escalaUI=1;
const ESCALAS_UI=[.8,.9,1,1.15,1.3];
function aplicarEscalaUI(){
  let st=document.getElementById('estiloEscalaUI');
  if(!st){st=document.createElement('style');st.id='estiloEscalaUI';document.head.appendChild(st);}
  const z=OPC.escalaUI||1;
  st.textContent=z===1?'':`#hud,#chat,#mano2,#hudOneBlock,#bwMarcador,.capa>.tarjeta,.capa>#libroRecetas,#panelEspectador{zoom:${z}}`;
}
const _aplicarOpc40=aplicarOpc;
aplicarOpc=function(){_aplicarOpc40();aplicarEscalaUI();};
aplicarEscalaUI();

/* ---------- Pantallas de opciones ---------- */
(function(){
  const pOpc=document.getElementById('pantallaOpciones'); if(!pOpc)return;
  const tarjeta=pOpc.querySelector('.tarjeta'), rej=tarjeta.querySelector('.rejillaOpc'), listo=document.getElementById('btnListoOpciones');
  if(!rej)return;
  const st=document.createElement('style');st.textContent=`
.capa>.tarjeta{max-height:94vh;overflow-y:auto}
.subOpc .rejillaOpc{margin-bottom:12px}
.subOpc h3.secOpc{margin:8px 0 6px;font-size:14px;color:#bbb;text-align:left}
#pantallaOpciones .ayudaOpc{font-size:12px;color:#aaa;margin:-4px 0 10px}`;
  document.head.appendChild(st);
  const texto=e=>(e.querySelector&&e.querySelector('span')&&e.classList.contains('deslizador')?e.querySelector('span').textContent:e.textContent)||'';
  const grupos={graficos:[],sonido:[],controles:[],interfaz:[],otros:[]};
  for(const e of [...rej.children]){
    const t=texto(e);
    if(/^(Campo de visión|Distancia de visión)/.test(t))continue;   // se quedan en la pantalla principal
    if(/^(Calidad gráfica|Resolución dinámica|No dibujar tras la niebla|Mostrar FPS|Shaders|Reflejos|Brillo|Partículas|Nubes|Animación de chunks|Gráficos:)/.test(t))grupos.graficos.push(e);
    else if(/^(Música|Sonido)/.test(t))grupos.sonido.push(e);
    else if(/^(Sensibilidad|Movimiento de cámara|Controles)/.test(t))grupos.controles.push(e);
    else if(/^(Números de daño)/.test(t))grupos.interfaz.push(e);
    else if(/^(Paquetes de recursos|Mods)/.test(t))grupos.otros.push(e);
    else grupos.interfaz.push(e);
  }
  // Nuevo: tamaño de la interfaz
  const bEsc=botonOpc(()=>OPC.escalaUI,()=>{const i=ESCALAS_UI.indexOf(OPC.escalaUI);OPC.escalaUI=ESCALAS_UI[(i+1)%ESCALAS_UI.length];},v=>'Tamaño de la interfaz: '+Math.round(v*100)+'%');
  bEsc.dataset.tip='Agranda o achica la barra de objetos, los menús y los textos';
  grupos.interfaz.unshift(bEsc);
  const pantallas=[['graficos','Gráficos y rendimiento…','Gráficos y rendimiento'],['sonido','Música y sonidos…','Música y sonidos'],['controles','Controles y cámara…','Controles y cámara'],['interfaz','Interfaz…','Interfaz']];
  const volverA=()=>{for(const [k] of pantallas)document.getElementById('opc_'+k).classList.add('oculto');pOpc.classList.remove('oculto');};
  for(const [k,boton,titulo] of pantallas){
    const capa=document.createElement('div');capa.id='opc_'+k;capa.className='capa oculto subOpc';
    capa.innerHTML=`<div class="tarjeta pantallaMC"><h2>${titulo}</h2></div>`;
    const t=capa.querySelector('.tarjeta'), r=document.createElement('div');r.className='rejillaOpc';
    grupos[k].forEach(e=>r.appendChild(e)); t.appendChild(r);
    const ok=document.createElement('button');ok.textContent='Listo';ok.onclick=volverA;t.appendChild(ok);
    document.body.appendChild(capa);
    if(typeof PANTALLAS!=='undefined')PANTALLAS.push(capa.id);
    const b=document.createElement('button');b.className='secundario';b.textContent=boton;
    b.onclick=()=>{pOpc.classList.add('oculto');capa.classList.remove('oculto');r.querySelectorAll('button,.deslizador').forEach(x=>x.pintar&&x.pintar());};
    rej.appendChild(b);
  }
  // Skins, paquetes y mods en la pantalla principal
  const bSkins=document.createElement('button');bSkins.className='secundario';bSkins.textContent='Skins…';
  bSkins.onclick=()=>{const s=document.getElementById('btnSkins'),cap=document.getElementById('pantallaSkins');if(!s||!cap)return;
    s.click(); cap.dataset.desde='pantallaOpciones'; pOpc.classList.add('oculto');};
  rej.appendChild(bSkins);
  grupos.otros.forEach(e=>rej.appendChild(e));
  // Los «Controles…» de su pantalla deben volver a ella
  const bc=grupos.controles.find(e=>/^Controles/.test(e.textContent));
  if(bc){const old=bc.onclick;bc.onclick=()=>{document.getElementById('opc_controles').classList.add('oculto');old&&old();
    const pc=document.getElementById('pantallaControles');if(pc){const v=pc.querySelector('.tarjeta>button:last-child');if(v)v.onclick=()=>{pc.classList.add('oculto');document.getElementById('opc_controles').classList.remove('oculto');};}};}
})();

/* ---------- Pantalla de título: un solo botón de Multijugador ---------- */
(function(){
  const todos=[...document.querySelectorAll('#btnMultijugador')];
  const malo=todos.find(b=>b.disabled), bueno=todos.find(b=>!b.disabled);
  if(malo&&bueno){malo.replaceWith(bueno);bueno.classList.remove('secundario');}
})();

/* ---------- Mods: guardado de respaldo, otras formas de ejecutarlos y pegar código ---------- */
let modsMemoria=null;
const _leerMods40=leerMods, _guardarMods40=guardarMods;
leerMods=function(){if(modsMemoria)return modsMemoria;return _leerMods40();};
guardarMods=function(l){modsMemoria=l;try{localStorage.setItem('blockverse-mods',JSON.stringify(l));}catch(e){mostrarMensaje('Este navegador no deja guardar el mod: funcionará hasta que cierres el juego.');}};
const _ejecutarMod40=ejecutarMod;
ejecutarMod=function(m){
  _ejecutarMod40(m);
  const err=errorMod[m.nombre];
  // Si la página no permite «new Function» (política de seguridad), se prueba con un script
  if(err&&/unsafe-eval|EvalError|Content Security|not allowed|Refused/i.test(err)){
    errorMod[m.nombre]='cargando…';
    const codigo=`(function(Blockverse){try{${m.codigo}\n}catch(e){window.__errorMod&&window.__errorMod(${JSON.stringify(m.nombre)},e);}})(window.Blockverse);window.__modListo&&window.__modListo(${JSON.stringify(m.nombre)});`;
    window.__errorMod=(n,e)=>{errorMod[n]=e&&e.message||String(e);pintarMods();};
    window.__modListo=n=>{if(errorMod[n]==='cargando…')errorMod[n]=null;pintarMods();};
    const probar=urls=>{
      if(!urls.length){errorMod[m.nombre]='Este sitio no deja ejecutar mods. Descarga el juego (blockverse-un-archivo.html) y ábrelo en tu navegador para usarlos.';pintarMods();return;}
      const s=document.createElement('script');s.src=urls[0];
      s.onerror=()=>{s.remove();probar(urls.slice(1));};
      document.head.appendChild(s);
    };
    let blob=null;try{blob=URL.createObjectURL(new Blob([codigo],{type:'text/javascript'}));}catch(e){}
    probar([blob,'data:text/javascript;charset=utf-8,'+encodeURIComponent(codigo)].filter(Boolean));
  }
};
function instalarMod40(nombre,codigo){
  const m={nombre:(nombre||'Mod').slice(0,40),codigo,activo:true};
  const l=leerMods().filter(x=>x.nombre!==m.nombre); l.push(m); guardarMods(l); ejecutarMod(m); pintarMods();
  mostrarMensaje('Mod instalado: '+m.nombre);
}
(function(){
  const pm=document.getElementById('pantallaMods'); if(!pm)return;
  const fila=pm.querySelector('.filaBotones');
  const b=document.createElement('button');b.className='secundario';b.id='btnPegarMod';b.textContent='Escribir o pegar código…';
  fila.appendChild(b);
  const caja=document.createElement('div');caja.id='cajaPegarMod';caja.className='oculto';caja.style.cssText='margin:6px 0;text-align:left';
  caja.innerHTML=`<input id="nombreModPegado" placeholder="Nombre del mod" style="width:100%;box-sizing:border-box;margin-bottom:4px">
    <textarea id="codigoModPegado" rows="7" spellcheck="false" style="width:100%;box-sizing:border-box;font:12px monospace;background:#000;color:#ddd;border:2px solid #a0a0a0" placeholder="Blockverse.comando('hola', () => 'Hola mundo');"></textarea>
    <button id="btnInstalarPegado">Instalar este mod</button>`;
  fila.parentNode.insertBefore(caja,fila.nextSibling);
  for(const el of caja.querySelectorAll('input,textarea'))el.addEventListener('keydown',e=>e.stopPropagation());
  b.onclick=()=>caja.classList.toggle('oculto');
  caja.querySelector('#btnInstalarPegado').onclick=()=>{
    const cod=caja.querySelector('#codigoModPegado').value.trim(); if(!cod){mostrarMensaje('Escribe el código del mod');return;}
    instalarMod40(caja.querySelector('#nombreModPegado').value.trim()||'Mod escrito',cod);
    caja.querySelector('#codigoModPegado').value='';caja.classList.add('oculto');
  };
})();

/* ---------- Arrastrar archivos a la ventana: .zip/.mcpack = paquete, .js = mod ---------- */
async function cargarArchivoPack40(f){
  const info=document.getElementById('infoPack'); if(info)info.textContent='Cargando '+f.name+'…';
  try{const buf=await f.arrayBuffer();await aplicarPack(buf,f.name.replace(/\.(zip|mcpack)$/i,''));
    try{await guardarPackIDB(packActivo.nombre,buf);}catch(err){mostrarMensaje('El paquete funciona, pero este navegador no deja guardarlo para la próxima vez.');}
    mostrarMensaje('Paquete aplicado: '+packActivo.nombre);
  }catch(err){if(info)info.textContent='No se pudo cargar: '+err.message;mostrarMensaje('No se pudo cargar el paquete: '+err.message);return;}
  pintarPacks();
}
document.addEventListener('dragover',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
document.addEventListener('drop',async e=>{
  if(!e.dataTransfer||!e.dataTransfer.files.length)return;
  e.preventDefault();
  for(const f of e.dataTransfer.files){
    if(/\.(zip|mcpack)$/i.test(f.name))await cargarArchivoPack40(f);
    else if(/\.js$/i.test(f.name))instalarMod40(f.name.replace(/\.js$/i,''),await f.text());
    else if(/\.png$/i.test(f.name)&&typeof cargarSkinPropia==='function'){const r=new FileReader();r.onload=()=>cargarSkinPropia(r.result,undefined,err=>mostrarMensaje(err||'Skin cargada'));r.readAsDataURL(f);}
    else mostrarMensaje('Arrastra un paquete (.zip o .mcpack), un mod (.js) o una skin (.png)');
  }
});
// El botón de elegir paquete usa el mismo cargador (con avisos claros)
(function(){
  const inp=document.getElementById('archivoPack'); if(!inp)return;
  inp.onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)await cargarArchivoPack40(f);};
  const ay=document.querySelector('#pantallaPacks .ayuda'); if(ay)ay.textContent+=' También puedes arrastrar el archivo a la ventana del juego.';
  const am=document.querySelector('#pantallaMods .ayuda'); if(am)am.insertAdjacentHTML('beforeend',' También puedes arrastrar un .js a la ventana o escribir el código.');
})();
