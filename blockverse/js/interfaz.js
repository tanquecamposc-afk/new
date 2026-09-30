"use strict";
/* =========================================================
   Menús renovados al estilo del original: pantalla de título
   sin marco con el logotipo de piedra en 3D, frase amarilla
   que late, botones de piedra con borde blanco al pasar el
   ratón y sonido de clic; pantallas a pantalla completa con
   la panorámica desenfocada; opciones con deslizadores
   (campo de visión, distancia, brillo, sensibilidad, volumen)
   y botones (partículas, nubes, movimiento de cámara,
   animación de chunks); pantalla de controles; pantalla de
   carga con el mapa de chunks; miniaturas de los mundos;
   captura de pantalla y pantalla completa.
   ========================================================= */
Object.assign(SND,{clic:v=>{tonoSnd(1300,900,.05,'square',.03*v);ruidoSnd(.03,3000,.05*v,'highpass');}});

/* ---------- Opciones guardadas ---------- */
const OPC=Object.assign({fov:70,brillo:.5,sensib:1,volumen:1,particulas:2,nubes:true,movCamara:true,animChunks:true},
  (()=>{try{return JSON.parse(localStorage.getItem('blockverse-opciones')||'{}');}catch(e){return {};}})());
function guardarOpc(){try{localStorage.setItem('blockverse-opciones',JSON.stringify(OPC));}catch(e){}}
function aplicarOpc(){
  window.FOV_BASE=OPC.fov; window.BRILLO=OPC.brillo; window.SENSIB=OPC.sensib; window.VOLUMEN=OPC.volumen;
  window.MOV_CAMARA=OPC.movCamara; window.FACTOR_PARTICULAS=[.2,.5,1][OPC.particulas];
}
aplicarOpc();
// Menos partículas si se pide
const _emitirParticulasInt=emitirParticulas;
emitirParticulas=function(x,y,z,color,n,...r){
  const f=window.FACTOR_PARTICULAS??1;
  if(f<1){n=n*f;n=Math.floor(n)+(Math.random()<n%1?1:0);if(n<=0)return;}
  return _emitirParticulasInt(x,y,z,color,n,...r);
};

/* ---------- Estilo ---------- */
const texPiedraBoton=(()=>{const c=document.createElement('canvas');c.width=64;c.height=20;const x=c.getContext('2d'),r=mulberry32(77);
  for(let j=0;j<20;j++)for(let i=0;i<64;i++){const v=110+Math.floor(r()*28)-(r()<.08?22:0);x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(i,j,1,1);}
  return c.toDataURL();})();
{const s=document.createElement('style');s.textContent=`
.capa:not(.oculto){animation:aparecerCapa .18s ease-out;}
.capa:not(.oculto) .tarjeta{animation:aparecerTarjeta .22s ease-out;}
@keyframes aparecerCapa{from{opacity:0}to{opacity:1}}
@keyframes aparecerTarjeta{from{transform:translateY(8px) scale(.985)}to{transform:none}}
.capa button:not(.opcionEnc):not(.oferta):not(.mundo){background:#6f6f6f url(${texPiedraBoton}) 0 0/128px 40px;image-rendering:pixelated;
  border:2px solid #000;border-radius:0;box-shadow:inset 2px 2px 0 rgba(255,255,255,.35),inset -2px -3px 0 rgba(0,0,0,.45);color:#fff;text-shadow:2px 2px 0 #383838;min-height:40px;}
.capa button:not(.opcionEnc):not(.oferta):hover:not(:disabled){background-color:#8a8a8a;filter:brightness(1.12);outline:2px solid #fff;outline-offset:-2px;color:#ffffa0;}
.capa button:disabled{filter:brightness(.55);color:#a0a0a0;opacity:1;}
#btnJugar{background-color:#6f6f6f!important;}
/* Título */
#menu{background:radial-gradient(ellipse at center,rgba(0,0,0,0) 40%,rgba(0,0,0,.45) 100%);backdrop-filter:none;}
#menu > .tarjeta{display:none;}
.tituloJava{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(420px,calc(100vw - 32px));margin-top:-4vh;}
.logoCaja{position:relative;margin-bottom:26px;animation:entradaLogo .9s cubic-bezier(.2,1.4,.4,1) both;}
#logoBV{width:min(600px,calc(100vw - 32px));image-rendering:pixelated;display:block;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45));}
@keyframes entradaLogo{from{transform:translateY(-40px) scale(.9);opacity:0}to{transform:none;opacity:1}}
.logoCaja .edicion{position:absolute;left:50%;bottom:-18px;transform:translateX(-50%);font:bold 13px var(--pixel);letter-spacing:6px;color:#e8e8e8;text-shadow:2px 2px 0 #3a3a3a;}
.logoCaja .splash{position:absolute;right:-6px;top:auto;bottom:4px;font-size:clamp(12px,2.2vw,17px);transform-origin:center;animation:latidoSplash2 .45s ease-in-out infinite alternate;}
@keyframes latidoSplash2{from{transform:rotate(-20deg) scale(1)}to{transform:rotate(-20deg) scale(1.1)}}
.tituloJava button{margin:0;width:100%;white-space:nowrap;font-size:15px;padding-left:6px;padding-right:6px;}
.filaT{display:flex;gap:8px;width:100%;} .filaT button{flex:1;}
.pieIzq,.pieDer{position:fixed;bottom:6px;font:13px var(--pixel);color:#fff;text-shadow:2px 2px 0 #3a3a3a;opacity:.9;}
.pieIzq{left:8px;} .pieDer{right:8px;}
/* Pantallas a pantalla completa con la panorámica desenfocada */
#pantallaMundos,#pantallaCrear,#pantallaOpciones,#pausa,#pantallaPacks,#pantallaMods,#pantallaControles{background:rgba(0,0,0,.42);backdrop-filter:blur(5px);}
#pantallaMundos .tarjeta,#pantallaCrear .tarjeta,#pantallaOpciones .tarjeta,#pausa .tarjeta,#pantallaPacks .tarjeta,#pantallaMods .tarjeta,#pantallaControles .tarjeta{
  background:transparent!important;border:0!important;box-shadow:none!important;width:min(640px,100%);max-height:100vh;overflow:auto;}
.pantallaMC h2{border-bottom:2px solid rgba(255,255,255,.18);padding-bottom:10px;margin-bottom:14px;font-size:21px;}
#listaMundos,#listaMods{background:rgba(0,0,0,.55);}
.mundo .miniatura{width:64px;height:64px;image-rendering:auto;border:1px solid #000;object-fit:cover;}
/* Pantalla de muerte: velo rojo sin marco */
#muerte{background:linear-gradient(180deg,rgba(120,0,0,.35),rgba(80,0,0,.6));backdrop-filter:none;}
#muerte .tarjeta{background:transparent!important;border:0!important;box-shadow:none!important;}
#muerte .titulo{font-size:clamp(34px,7vw,56px);white-space:nowrap;}
#muerte .tarjeta{width:auto!important;max-width:100%;}
/* Opciones */
.rejillaOpc{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
@media (max-width:520px){.rejillaOpc{grid-template-columns:1fr;}}
.rejillaOpc button{margin:0;width:100%;font-size:15px;}
.deslizador{position:relative;height:40px;border:2px solid #000;background:#1e1e1e;box-shadow:inset 2px 2px 0 rgba(0,0,0,.6);}
.deslizador input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;}
.deslizador .asa{position:absolute;top:-2px;bottom:-2px;width:14px;background:#6f6f6f url(${texPiedraBoton}) 0 0/128px 40px;border:2px solid #000;box-shadow:inset 2px 2px 0 rgba(255,255,255,.35),inset -2px -2px 0 rgba(0,0,0,.45);pointer-events:none;}
.deslizador:hover .asa{outline:2px solid #fff;outline-offset:-2px;}
.deslizador span{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:15px var(--pixel);text-shadow:2px 2px 0 #383838;pointer-events:none;}
#pantallaOpciones .opcion,#pantallaOpciones > .tarjeta > .controles,#pantallaOpciones .ayudaGraf{display:none!important;}
#pantallaControles .controles{text-align:left;background:rgba(0,0,0,.55);border:2px solid #000;padding:10px;margin-bottom:12px;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;}
/* Carga */
#pantallaCarga{background:#1d1b19 url(${texPiedraBoton}) 0 0/256px 80px;backdrop-filter:none;}
#pantallaCarga::before{content:"";position:absolute;inset:0;background:rgba(0,0,0,.7);}
.cajaCarga{position:relative;text-align:center;color:#fff;font:18px var(--pixel);text-shadow:2px 2px 0 #3a3a3a;display:flex;flex-direction:column;align-items:center;gap:12px;}
#mapaCarga{image-rendering:pixelated;width:132px;height:132px;}
.barraCarga{width:min(320px,70vw);height:8px;border:2px solid #fff;padding:1px;} .barraCarga i{display:block;height:100%;width:0;background:#fff;transition:width .15s;}
`;document.head.appendChild(s);}

/* ---------- Logotipo de piedra en 3D ---------- */
const LETRAS={B:['11110','10001','10001','11110','10001','10001','11110'],L:['10000','10000','10000','10000','10000','10000','11111'],
  O:['01110','10001','10001','10001','10001','10001','01110'],C:['01111','10000','10000','10000','10000','10000','01111'],
  K:['10001','10010','10100','11000','10100','10010','10001'],V:['10001','10001','10001','10001','10001','01010','00100'],
  E:['11111','10000','10000','11110','10000','10000','11111'],R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110']};
function dibujarLogo(texto){
  const P=4, prof=4, px=[];   // cada píxel del logotipo son 4×4 texeles de piedra
  let cx=0; for(const ch of texto){const L=LETRAS[ch];L.forEach((f,y)=>[...f].forEach((b,x)=>{if(b==='1')px.push([cx+x,y]);}));cx+=6;}
  const W=(cx-1)*P+prof+2, H=7*P+prof+2;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),r=mulberry32(4242);
  const lleno=new Set(px.map(([x,y])=>x+','+y));
  // Laterales (extrusión hacia abajo a la derecha)
  for(let d=prof;d>=1;d--)for(const [x,y] of px){const v=62+d*6;g.fillStyle=`rgb(${v},${v-2},${v-4})`;g.fillRect(1+x*P+d,1+y*P+d,P,P);}
  // Cara con textura de piedra, borde claro arriba/izquierda y oscuro abajo/derecha
  for(const [x,y] of px)for(let j=0;j<P;j++)for(let i=0;i<P;i++){
    let v=150+Math.floor(r()*40)-(r()<.12?30:0);
    if(j===0&&!lleno.has(x+','+(y-1)))v+=45; if(i===0&&!lleno.has((x-1)+','+y))v+=25;
    if(j===P-1&&!lleno.has(x+','+(y+1)))v-=45; if(i===P-1&&!lleno.has((x+1)+','+y))v-=25;
    v=Math.max(40,Math.min(250,v)); g.fillStyle=`rgb(${v},${v},${v})`; g.fillRect(1+x*P+i,1+y*P+j,1,1);}
  // Contorno negro
  const d=g.getImageData(0,0,W,H), o=g.createImageData(W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4;
    if(d.data[k+3]){o.data.set(d.data.subarray(k,k+4),k);continue;}
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+a,yy=y+b;if(xx>=0&&yy>=0&&xx<W&&yy<H&&d.data[(yy*W+xx)*4+3]){o.data[k+3]=255;break;}}}
  g.putImageData(o,0,0);
  return c;
}

/* ---------- Pantalla de título ---------- */
(function(){
  const menu=$('menu'), vieja=menu.querySelector('.tarjeta');
  const t=document.createElement('div');t.className='tituloJava';
  const caja=document.createElement('div');caja.className='logoCaja';
  const logo=dibujarLogo('BLOCKVERSE');logo.id='logoBV';caja.appendChild(logo);
  const ed=document.createElement('div');ed.className='edicion';ed.textContent='EDICIÓN 26.1';caja.appendChild(ed);
  caja.appendChild($('splash'));
  t.appendChild(caja);
  const btn=(id,txt,f)=>{const b=document.createElement('button');if(id)b.id=id;b.textContent=txt;if(f)b.onclick=f;return b;};
  const multi=btn('btnMultijugador','Multijugador');multi.disabled=true;multi.dataset.tip='Necesita un servidor: no está disponible en el navegador';
  const fila1=document.createElement('div');fila1.className='filaT';
  fila1.append(btn(null,'Paquetes de recursos…',()=>{$('btnOpcionesTitulo').click();$('btnPacks').click();}),btn(null,'Mods…',()=>{$('btnOpcionesTitulo').click();$('btnMods').click();}));
  const fila2=document.createElement('div');fila2.className='filaT';
  const opc=$('btnOpcionesTitulo'); opc.classList.remove('secundario');
  fila2.append(opc,btn('btnCompleta','Pantalla completa',alternarCompleta));
  const jugar=$('btnJugar'); jugar.textContent='Un jugador';
  t.append(jugar,multi,fila1,fila2);
  menu.appendChild(t);
  const pi=document.createElement('div');pi.className='pieIzq';pi.textContent='Blockverse 26.1';
  const pd=document.createElement('div');pd.className='pieDer';pd.textContent='Juego de fans · no es un producto oficial';
  menu.append(pi,pd);
  vieja.style.display='none';   // queda oculta con los controles antiguos (nuevo mundo, modo…)
})();
function alternarCompleta(){
  try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen();}catch(e){}
}
document.addEventListener('fullscreenchange',()=>{const b=$('btnCompleta');if(b)b.textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
// Sonido de clic en los botones de los menús
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.capa button');if(b&&!b.disabled)sonar('clic');},true);

/* ---------- Opciones ---------- */
function deslizador(etq,min,max,paso,get,set,fmt){
  const d=document.createElement('div');d.className='deslizador';
  const i=document.createElement('input');i.type='range';i.min=min;i.max=max;i.step=paso;
  const asa=document.createElement('div');asa.className='asa';const s=document.createElement('span');
  const pintar=()=>{const v=get();i.value=v;const f=(v-min)/(max-min);asa.style.left=`calc(${f*100}% - ${f*14}px)`;s.textContent=`${etq}: ${fmt(v)}`;};
  i.oninput=()=>{set(+i.value);pintar();};
  i.onchange=()=>{guardarOpc();};
  d.append(i,asa,s);d.pintar=pintar;pintar();return d;
}
function botonOpc(get,set,texto){
  const b=document.createElement('button');b.className='secundario';
  const pintar=()=>{b.textContent=texto(get());};
  b.onclick=()=>{set();guardarOpc();aplicarOpc();pintar();};
  b.pintar=pintar;pintar();return b;
}
(function(){
  const cont=$('pantallaOpciones').querySelector('.tarjeta');
  const listo=$('btnListoOpciones');
  const rej=document.createElement('div');rej.className='rejillaOpc';
  const pct=v=>Math.round(v*100)+'%';
  const graf=$('btnGraficos'); const ayudaGraf=graf&&graf.nextElementSibling&&graf.nextElementSibling.tagName!=='BUTTON'?graf.nextElementSibling:null;
  if(ayudaGraf){ayudaGraf.classList.add('ayudaGraf');graf.dataset.tip=ayudaGraf.textContent;}
  const controles=document.createElement('button');controles.className='secundario';controles.textContent='Controles…';
  controles.onclick=()=>mostrarPantalla('pantallaControles');
  const elems=[
    deslizador('Campo de visión',30,110,1,()=>OPC.fov,v=>{OPC.fov=v;aplicarOpc();},v=>v===70?'Normal':v>=110?'¡Máximo!':v),
    deslizador('Distancia de visión',2,12,1,()=>radio,v=>{const s=$('selDistancia');s.value=String(v);s.onchange();},v=>v+' chunks'),
    deslizador('Brillo',0,1,.01,()=>OPC.brillo,v=>{OPC.brillo=v;aplicarOpc();},v=>v<=.02?'Oscuro':v>=.98?'Brillante':v===.5?'Normal':'+'+Math.round(v*100)+'%'),
    deslizador('Sensibilidad',.3,2.5,.05,()=>OPC.sensib,v=>{OPC.sensib=v;aplicarOpc();},v=>Math.round(v*100)+'%'),
    deslizador('Música y sonidos',0,1,.01,()=>OPC.volumen,v=>{OPC.volumen=v;aplicarOpc();},v=>v?pct(v):'No'),
    botonOpc(()=>OPC.particulas,()=>{OPC.particulas=(OPC.particulas+2)%3;},v=>'Partículas: '+['Mínimas','Reducidas','Todas'][v]),
    botonOpc(()=>OPC.nubes,()=>{OPC.nubes=!OPC.nubes;},v=>'Nubes: '+(v?'Sí':'No')),
    botonOpc(()=>OPC.movCamara,()=>{OPC.movCamara=!OPC.movCamara;},v=>'Movimiento de cámara: '+(v?'Sí':'No')),
    botonOpc(()=>OPC.animChunks,()=>{OPC.animChunks=!OPC.animChunks;},v=>'Animación de chunks: '+(v?'Sí':'No')),
  ];
  if(graf)elems.push(graf);
  elems.push(controles);
  for(const id of ['btnPacks','btnMods'])if($(id))elems.push($(id));
  elems.forEach(e=>rej.appendChild(e));
  cont.insertBefore(rej,listo);
  listo.classList.remove('secundario');
  // Pantalla de controles
  const pc=document.createElement('div');pc.id='pantallaControles';pc.className='capa oculto';
  pc.innerHTML='<div class="tarjeta pantallaMC"><h2>Controles</h2></div>';
  const tc=pc.querySelector('.tarjeta');tc.appendChild(cont.querySelector('.controles'));
  const volver=document.createElement('button');volver.textContent='Listo';volver.onclick=()=>mostrarPantalla('pantallaOpciones');tc.appendChild(volver);
  document.body.appendChild(pc); PANTALLAS.push('pantallaControles');
  // Al volver a abrir las opciones, refrescar los valores
  const _abrir=$('btnOpcionesTitulo').onclick, _abrirP=$('btnOpcionesPausa').onclick;
  const refrescar=()=>rej.querySelectorAll('.deslizador,button').forEach(e=>e.pintar&&e.pintar());
  $('btnOpcionesTitulo').onclick=()=>{_abrir();refrescar();};
  $('btnOpcionesPausa').onclick=()=>{_abrirP();refrescar();};
})();
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('pantallaControles').classList.contains('oculto'))mostrarPantalla('pantallaOpciones');});

/* ---------- Pausa: captura de pantalla ---------- */
(function(){
  const t=$('pausa').querySelector('.tarjeta'), opc=$('btnOpcionesPausa'), salir=$('btnSalirTitulo');
  const fila=document.createElement('div');fila.className='filaBotones';
  const cap=document.createElement('button');cap.className='secundario';cap.textContent='Captura de pantalla';
  cap.onclick=()=>{try{const c=capturarImagen(1);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='blockverse-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.png';a.click();mostrarMensaje('Captura guardada.');}catch(e){}};
  opc.parentNode.insertBefore(fila,opc); fila.append(opc,cap);
  opc.style.margin=cap.style.margin='0'; salir.style.marginTop='8px';
})();

/* ---------- Miniaturas de los mundos ---------- */
function capturarImagen(escala){
  const vis=mano.visible; mano.visible=false;
  if(typeof renderizarFinal==='function')renderizarFinal();else renderer.render(escena,camara);
  const src=renderer.domElement, c=document.createElement('canvas');
  if(escala===1){c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);}
  else{const s=Math.min(src.width,src.height);c.width=c.height=escala;c.getContext('2d').drawImage(src,(src.width-s)/2,(src.height-s)/2,s,s,0,0,escala,escala);}
  mano.visible=vis; return c;
}
function capturarMiniatura(){
  if(!mundoId||dim!==DIMS.superficie&&dim!==DIMS.nether&&dim!==DIMS.end)return;
  try{localStorage.setItem('blockverse-mini-'+mundoId,capturarImagen(64).toDataURL('image/jpeg',.85));}catch(e){}
}
let miniT=8;
const _actualizarFinalInt=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalInt(dt);
  if(estado==='jugando'&&mundoId){miniT-=dt;if(miniT<=0){miniT=120;let hay=null;try{hay=localStorage.getItem('blockverse-mini-'+mundoId);}catch(e){}if(!hay)capturarMiniatura();}}
  if(!OPC.nubes)nubes.visible=false;
};

/* ---------- Pantalla de carga con el mapa de chunks ---------- */
(function(){
  const d=document.createElement('div');d.id='pantallaCarga';d.className='capa oculto';
  d.innerHTML='<div class="cajaCarga"><div id="textoCarga">Cargando el terreno</div><canvas id="mapaCarga" width="11" height="11"></canvas><div class="barraCarga"><i id="barraCargaI"></i></div><div id="pctCarga">0%</div></div>';
  document.body.appendChild(d); PANTALLAS.push('pantallaCarga');
})();
function mostrarCarga(texto){$('textoCarga').textContent=texto||'Cargando el terreno';$('barraCargaI').style.width='0';$('pctCarga').textContent='0%';mostrarPantalla('pantallaCarga');}
function cargarTerreno(fin){
  if($('pantallaCarga').classList.contains('oculto'))mostrarCarga('Cargando el terreno');
  const R=Math.min(2,radio), t0=performance.now(), ctx=$('mapaCarga').getContext('2d');
  const pcx=Math.floor(jugador.pos.x/CX), pcz=Math.floor(jugador.pos.z/CZ);
  const lista=[];for(let a=-R;a<=R;a++)for(let b=-R;b<=R;b++)lista.push([a,b]);
  const paso=()=>{
    gestionarChunks(45,jugador.pos.x,jugador.pos.z);
    let hechos=0;
    ctx.fillStyle='#000';ctx.fillRect(0,0,11,11);
    for(let a=-5;a<=5;a++)for(let b=-5;b<=5;b++){
      const ch=chunkSiExiste(pcx+a,pcz+b);
      ctx.fillStyle=!ch?'#1a1a1a':ch.malla?(a===0&&b===0?'#ffffff':'#6fd14a'):'#7a7a7a';ctx.fillRect(a+5,b+5,1,1);}
    for(const [a,b] of lista){const ch=chunkSiExiste(pcx+a,pcz+b);if(ch&&ch.malla)hechos++;}
    const f=hechos/lista.length;
    $('barraCargaI').style.width=(f*100)+'%'; $('pctCarga').textContent=Math.round(f*100)+'%';
    if(f>=1||performance.now()-t0>12000){setTimeout(fin,120);return;}
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
