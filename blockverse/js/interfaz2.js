"use strict";
/* =========================================================
   Interfaz al estilo del original (2):
   · Inventario creativo con pestañas arriba y abajo, título,
     rejilla de 9 columnas con barra de desplazamiento,
     buscador, barra de objetos y papelera.
   · Barra de vida: los corazones parpadean al recibir daño,
     ola de regeneración, corazones de wither y de absorción,
     el hambre tiembla sin saturación y, a caballo, la vida
     de la montura sustituye a la comida.
   · Inventario de supervivencia con el muñeco del jugador
     que mira al ratón y lleva puesta la armadura.
   ========================================================= */
const idClave=c=>{const i=ITEMS.findIndex(it=>it&&it.clave===c);return i>0?i:0;};

/* ---------- Inventario creativo ---------- */
const PESTANAS_C=[
  ['construccion','Bloques de construcción',()=>B.ladrillos,'arriba'],
  ['colores','Bloques de colores',()=>HORMIGON[6]||B.lana,'arriba'],
  ['naturaleza','Bloques naturales',()=>B.cesped,'arriba'],
  ['utiles','Bloques útiles',()=>B.mesa,'arriba'],
  ['redstone','Redstone',()=>I.redstone,'arriba'],
  ['buscar','Buscar objetos',()=>idClave('brujula')||I.ojoEnder,'arriba'],
  ['herramientas','Herramientas y utilidades',()=>idClave('pico_diamante')||I.cubo,'abajo'],
  ['combate','Combate',()=>idClave('espada_oro')||I.arco,'abajo'],
  ['comida','Comida y bebida',()=>I.manzanaDorada,'abajo'],
  ['ingredientes','Ingredientes',()=>I.lingoteHierro,'abajo'],
  ['huevos','Huevos generadores',()=>idClave('huevo_cerdo')||I.huevo,'abajo'],
  ['inventario','Inventario de supervivencia',()=>B.cofre,'abajo'],
];
let pestanaC='construccion', textoBusqueda='';
const celdasC=new Map();
function celdaCreativo(id){
  let d=celdasC.get(id); if(d)return d;
  d=document.createElement('div'); d.className='slot celdaC'; d.dataset.tip=ITEMS[id].nombre;
  d.innerHTML=`<img src="${ICONOS[id]}" alt="">`;
  d.onmousedown=e=>{e.preventDefault();e.stopPropagation();
    if(cursor){cursor=null;sonar('romper',null,.2);}
    else if(e.shiftKey){insertarInv(crearPila(id,maxPila(id)));sonar('recoger',null,.5);}
    else cursor=crearPila(id,e.button===2?1:maxPila(id));
    refrescarUI();};
  d.oncontextmenu=e=>e.preventDefault();
  celdasC.set(id,d); return d;
}
function idsPestana(k){
  const res=[];
  const t=textoBusqueda.trim().toLowerCase();
  ITEMS.forEach((it,i)=>{if(!it||!ICONOS[i])return;
    if(k==='buscar'){if(!t||it.nombre.toLowerCase().includes(t)||(it.clave||'').toLowerCase().includes(t))res.push(i);}
    else if(categoriaItem(i)===k)res.push(i);});
  return res;
}
function pintarRejillaC(){
  const g=document.getElementById('rejillaC'); if(!g)return;
  g.textContent='';
  const ids=idsPestana(pestanaC);
  for(const i of ids)g.appendChild(celdaCreativo(i));
  const hueco=(9-ids.length%9)%9+Math.max(0,45-ids.length-((9-ids.length%9)%9));
  for(let k=0;k<hueco;k++){const v=document.createElement('div');v.className='slot celdaC vacia';g.appendChild(v);}
  g.scrollTop=0;
}
function botonPestana(p){
  const [k,nom,ic]=p, b=document.createElement('div');
  b.className='pestC'+(k===pestanaC?' sel':''); b.dataset.tip=nom;
  b.innerHTML=`<img src="${ICONOS[ic()]||''}" alt="">`;
  b.onmousedown=e=>{e.preventDefault();e.stopPropagation();
    if(k==='inventario'){cambiarUI('inv');return;}
    pestanaC=k; if(k==='buscar')textoBusqueda=''; construirUI();};
  return b;
}
UI_EXTRA.creativo={
  abrir(u){},
  construir(titulo){
    const arriba=document.createElement('div');arriba.className='filaPestC';
    PESTANAS_C.filter(p=>p[3]==='arriba').forEach(p=>arriba.appendChild(botonPestana(p)));
    elSup.appendChild(arriba);
    const cab=document.createElement('div');cab.className='cabC';
    const t=document.createElement('span');t.textContent=PESTANAS_C.find(p=>p[0]===pestanaC)[1];cab.appendChild(t);
    if(pestanaC==='buscar'){
      const inp=document.createElement('input');inp.type='text';inp.id='buscarC';inp.placeholder='Buscar…';inp.value=textoBusqueda;inp.autocomplete='off';
      inp.oninput=()=>{textoBusqueda=inp.value;pintarRejillaC();};
      inp.onkeydown=e=>{e.stopPropagation();if(e.code==='Escape')cerrarUI();};
      cab.appendChild(inp); setTimeout(()=>inp.focus(),30);
    }
    elSup.appendChild(cab);
    const g=document.createElement('div');g.id='rejillaC';elSup.appendChild(g);
    pintarRejillaC();
  },
  cerrar(){document.getElementById('pantallaUI').classList.remove('modoCreativo');},
};
// Abrir el creativo nuevo en lugar de la paleta antigua
const _abrirUIInt2=abrirUI;
abrirUI=function(tipo,pos,extra){return _abrirUIInt2(tipo==='paleta'?'creativo':tipo,pos,extra);};
const _construirUIInt2=construirUI;
construirUI=function(){
  const pUI=document.getElementById('pantallaUI');
  {const f=document.querySelector('.filaBarraC'),gb=document.getElementById('gridBarra');if(f&&gb)f.parentNode.insertBefore(gb,f);}
  document.querySelectorAll('.pieC').forEach(e=>e.remove());
  pUI.classList.toggle('modoCreativo',!!ui&&ui.tipo==='creativo');
  pUI.classList.toggle('modoInv',!!ui&&ui.tipo==='inv');
  _construirUIInt2();
  if(!ui)return;
  if(ui.tipo==='creativo'){
    const gb=document.getElementById('gridBarra');
    const pie=document.createElement('div');pie.className='pieC';
    const fila=document.createElement('div');fila.className='filaBarraC';
    gb.parentNode.insertBefore(fila,gb); fila.appendChild(gb);
    crearSlot(fila,{tipo:'normal',papelera:true,get:()=>null,set:()=>{sonar('romper',null,.3);},acepta:()=>true,shift:()=>null},false,'papelera');
    const abajo=document.createElement('div');abajo.className='filaPestC abajo pieC';
    PESTANAS_C.filter(p=>p[3]==='abajo').forEach(p=>abajo.appendChild(botonPestana(p)));
    fila.parentNode.insertBefore(abajo,fila.nextSibling);
    fila.classList.add('pieC');
    refrescarUI();
  }
  if(ui.tipo==='inv')montarMuneco();
};
// Al cerrar, deshacer el envoltorio de la barra
const _cerrarUIInt2=cerrarUI;
cerrarUI=function(){
  const fila=document.querySelector('.filaBarraC'), gb=document.getElementById('gridBarra');
  if(fila&&gb){fila.parentNode.insertBefore(gb,fila);}
  document.querySelectorAll('.pieC').forEach(e=>e.remove());
  const pUI=document.getElementById('pantallaUI'); pUI.classList.remove('modoCreativo','modoInv');
  return _cerrarUIInt2();
};

/* ---------- Muñeco del jugador en el inventario ---------- */
const PIEL={pelo:'#3b2a1a',piel:'#c8966e',pielS:'#a87a58',ojo:'#ffffff',iris:'#3a4ac0',boca:'#7a4a38',camisa:'#2aa0b0',camisaS:'#1f8090',pant:'#3a4ac0',pantS:'#2c3a9a',zap:'#5a5a5a'};
let munecoMira={x:0,y:0};
function dibujarMuneco(c){
  const g=c.getContext('2d'), s=4, W=c.width;
  g.clearRect(0,0,W,c.height);
  const ox=Math.round(W/2/s)-8, oy=3;
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect((ox+x)*s,(oy+y)*s,w*s,h*s);};
  const mx=Math.max(-1,Math.min(1,Math.round(munecoMira.x))), my=Math.max(-1,Math.min(1,Math.round(munecoMira.y)));
  const arm=k=>{const p=inv[36+k];return p&&ITEMS[p.id].armadura?'rgb('+ARM_MATS[ITEMS[p.id].armadura.mat].col.join(',')+')':null;};
  // Piernas
  R(4,20,4,12,PIEL.pant);R(8,20,4,12,PIEL.pantS);R(4,30,4,2,PIEL.zap);R(8,30,4,2,PIEL.zap);
  if(arm(2)){R(4,20,8,7,arm(2));}
  if(arm(3)){R(4,28,4,4,arm(3));R(8,28,4,4,arm(3));}
  // Cuerpo y brazos
  R(4,8,8,12,PIEL.camisa);R(0,8,4,12,PIEL.camisaS);R(12,8,4,12,PIEL.camisaS);R(0,16,4,4,PIEL.piel);R(12,16,4,4,PIEL.pielS);
  if(arm(1)){R(4,8,8,11,arm(1));R(0,8,4,5,arm(1));R(12,8,4,5,arm(1));}
  // Objeto en la mano
  const p=inv[ranura];
  if(p&&LIENZOS[p.id]){g.imageSmoothingEnabled=false;g.drawImage(LIENZOS[p.id],(ox+11)*s,(oy+14)*s,8*s,8*s);}
  // Cabeza (mira al ratón desplazando la cara)
  const hx=4+mx*.5, hy=my*.5;
  g.save(); g.translate(0,hy*s);
  R(hx,0,8,8,PIEL.piel);R(hx,0,8,2,PIEL.pelo);R(hx,2,1,1,PIEL.pelo);R(hx+7,2,1,1,PIEL.pelo);
  const fx=hx+mx*.6;
  R(fx+1,4,2,1,PIEL.ojo);R(fx+5,4,2,1,PIEL.ojo);R(fx+(mx<0?1:2),4,1,1,PIEL.iris);R(fx+(mx<0?5:6),4,1,1,PIEL.iris);
  R(fx+3,5,2,1,PIEL.pielS);R(fx+2,6,4,1,PIEL.boca);
  if(arm(0)){R(hx-.5,-.5,9,3,arm(0));R(hx-.5,2.5,1,4,arm(0));R(hx+7.5,2.5,1,4,arm(0));}
  g.restore();
}
function montarMuneco(){
  const perfil=document.querySelector('#zonaSuperior .perfil'); if(!perfil)return;
  const caja=document.createElement('div');caja.className='cajaMuneco';
  const c=document.createElement('canvas');c.width=104;c.height=144;c.id='muneco';caja.appendChild(c);
  const txt=document.createElement('div');txt.className='datosMuneco';
  txt.innerHTML=`Nivel <b>${xp.nivel}</b> · Armadura <b>${armaduraTotal().def}</b>`;
  const col=document.createElement('div');col.className='colMuneco';col.append(caja,txt);
  perfil.replaceWith(col);
  dibujarMuneco(c);
}
document.addEventListener('mousemove',e=>{
  const c=document.getElementById('muneco'); if(!c||!ui||ui.tipo!=='inv')return;
  const r=c.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height*.18;
  munecoMira={x:(e.clientX-cx)/120,y:(e.clientY-cy)/120};
  dibujarMuneco(c);
});
const _refrescarUIInt2=refrescarUI;
refrescarUI=function(){_refrescarUIInt2();const c=document.getElementById('muneco');if(c&&ui&&ui.tipo==='inv')dibujarMuneco(c);};

/* ---------- Barra de vida ---------- */
const IC_WITHER=tresIconos(P_CORAZON,'#2a2a2a','#6a6a6a'), IC_ABSORCION=tresIconos(P_CORAZON,'#e8c020','#fff4a0'),
  IC_MONTURA=tresIconos(P_CORAZON,'#e8703a','#ffd0b0');
let saludPrev=null, parpadeoT=null;
const _actualizarHUDInt2=actualizarHUD;
actualizarHUD=function(){
  _actualizarHUDInt2();
  if(!supervivencia())return;
  const cor=$('corazones');
  if(efectos.wither)pintarFila('corazones',Math.ceil(salud),IC_WITHER);
  cor.classList.toggle('regen',!!efectos.regeneracion);
  if(saludPrev!==null&&salud<saludPrev){cor.classList.remove('parpadeo');void cor.offsetWidth;cor.classList.add('parpadeo');
    clearTimeout(parpadeoT);parpadeoT=setTimeout(()=>cor.classList.remove('parpadeo'),650);}
  saludPrev=salud;
  // Absorción: corazones dorados encima
  const abs=efectos.absorcion?Math.ceil((efectos.absorcion.puntos??4)):0, fa=$('absorcion');
  if(fa){fa.style.display=abs?'flex':'none';if(abs)fa.querySelectorAll('img').forEach((im,i)=>{const v=abs-i*2;im.style.visibility=v>0?'visible':'hidden';im.src=v>=2?IC_ABSORCION.lleno:IC_ABSORCION.medio;});}
  // Montura: su vida en lugar de la comida
  const m=jugador.montura;
  if(m&&m.vida!==undefined&&m.def){const max=Math.min(20,m.vidaMax||m.def.vida);
    pintarFila('comida',Math.min(20,Math.ceil(m.vida/(m.vidaMax||m.def.vida)*max)),IC_MONTURA);}
  $('comida').classList.toggle('temblor',!m&&saturacion<=0&&hambre<20);
};
(function(){
  const col=$('corazones').parentNode, f=document.createElement('div');f.className='fila';f.id='absorcion';f.style.display='none';
  for(let i=0;i<10;i++){const im=document.createElement('img');im.alt='';f.appendChild(im);}
  col.insertBefore(f,$('corazones'));
  $('corazones').querySelectorAll('img').forEach((im,i)=>im.style.setProperty('--i',i));
  $('comida').querySelectorAll('img').forEach((im,i)=>im.style.setProperty('--i',i));
})();

/* ---------- Estilos ---------- */
{const s=document.createElement('style');s.textContent=`
#pantallaUI.modoCreativo #gridPrincipal,#pantallaUI.modoCreativo .tarjeta > h3,#pantallaUI.modoCreativo .tarjeta > .pista{display:none;}
#pantallaUI.modoCreativo .tarjeta{padding:10px 14px 12px;}
.filaPestC{display:flex;gap:2px;margin:-4px 0 6px;}
.filaPestC.abajo{margin:8px 0 -4px;}
.pestC{width:46px;height:42px;display:grid;place-items:center;cursor:pointer;background:#a0a0a0;border:2px solid #000;
  box-shadow:inset 2px 2px 0 #d8d8d8,inset -2px -2px 0 #555;}
.pestC img{width:28px;height:28px;image-rendering:pixelated;pointer-events:none;}
.pestC.sel{background:#c6c6c6;box-shadow:inset 2px 2px 0 #fff,inset -2px 0 0 #555;transform:translateY(2px);}
.pestC:hover:not(.sel){background:#b4b4b4;}
.pestC:last-child{margin-left:auto;}
.cabC{display:flex;align-items:center;justify-content:space-between;gap:8px;height:30px;color:#404040;font:15px var(--pixel);}
.cabC input{width:170px;height:24px;padding:2px 6px;margin:0;font-size:14px;}
#rejillaC{display:grid;grid-template-columns:repeat(9,48px);gap:2px;height:${48*5+2*4+4}px;overflow-y:scroll;padding-right:4px;align-content:start;}
#rejillaC::-webkit-scrollbar{width:18px;} #rejillaC::-webkit-scrollbar-track{background:#8b8b8b;box-shadow:inset 2px 2px 0 #373737,inset -2px -2px 0 #fff;}
#rejillaC::-webkit-scrollbar-thumb{background:#c6c6c6;border:2px solid #000;box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #555;}
.slot[data-fondo="papelera"]::before{content:none!important;}
.celdaC{cursor:pointer;} .celdaC.vacia{cursor:default;}
.celdaC:hover:not(.vacia){background:#a8a8a8;box-shadow:inset 2px 2px 0 var(--mc-slotSombra),inset -2px -2px 0 var(--mc-slotLuz),inset 0 0 0 40px rgba(255,255,255,.2);}
.filaBarraC{display:flex;gap:12px;align-items:center;margin-top:8px;}
/* Inventario con muñeco */
.cajaMuneco{width:104px;height:144px;background:#000;box-shadow:inset 2px 2px 0 #373737,inset -2px -2px 0 #fff;border:2px solid #373737;}
#muneco{image-rendering:pixelated;display:block;}
.colMuneco{display:flex;flex-direction:column;align-items:center;gap:4px;}
.datosMuneco{font:12px var(--pixel);color:#404040;white-space:nowrap;}
/* Vida */
#corazones.parpadeo img{animation:parpadeoVida .16s steps(1) 4;}
@keyframes parpadeoVida{50%{filter:brightness(2.4) saturate(.2);}}
#corazones.regen img{animation:olaVida 1.2s infinite;animation-delay:calc(var(--i)*.06s);}
@keyframes olaVida{0%,12%,100%{transform:none}6%{transform:translateY(-3px)}}
#comida.temblor img{animation:temblorComida .5s infinite;animation-delay:calc(var(--i)*.07s);}
@keyframes temblorComida{0%,100%{transform:none}25%{transform:translateY(-1px)}75%{transform:translateY(1px)}}
#absorcion img{width:18px;height:18px;image-rendering:pixelated;}
/* Barra de objetos como la original */
#barra{background:rgba(0,0,0,.42)!important;border:2px solid #111!important;padding:0!important;gap:0!important;
  box-shadow:inset 0 0 0 2px #6b6b6b,0 0 0 1px rgba(0,0,0,.5)!important;}
#barra .slot{background:transparent!important;box-shadow:inset 2px 2px 0 rgba(0,0,0,.45),inset -2px -2px 0 rgba(160,160,160,.35)!important;border-right:2px solid #6b6b6b!important;}
#barra .slot:last-child{border-right:0!important;}
#barra .slot.activa{box-shadow:0 0 0 3px #fff,0 0 0 5px #111,inset 0 0 0 2px #fff!important;background:rgba(255,255,255,.12)!important;}
`;document.head.appendChild(s);}
