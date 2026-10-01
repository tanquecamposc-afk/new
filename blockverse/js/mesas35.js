"use strict";
/* =========================================================
   Mesas de trabajo, fabricación y hornos mejorados
   - Números de las pilas nítidos: fuente de píxeles propia
     (como la del original) dibujada a la resolución real de
     la pantalla, sin bordes borrosos.
   - Libro de recetas en el inventario y la mesa de trabajo:
     muestra lo que puedes fabricar con lo que llevas, con
     buscador. Clic: coloca los ingredientes; Mayús+clic:
     coloca para fabricar todo lo posible.
   - Arrastrar una pila sobre varias casillas la reparte a
     partes iguales (clic derecho: una en cada casilla), y
     doble clic junta todas las del mismo tipo.
   - Sonido al fabricar.
   - Horno con la llama y la flecha del original, hornos
     encendidos que dan luz y echan humo, y ahumador / alto
     horno: el doble de rápidos con comida / minerales.
   ========================================================= */

/* ---------- Números nítidos ---------- */
const DIGITOS_PX={
  '0':['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],
  '1':['..#..','.##..','..#..','..#..','..#..','..#..','#####'],
  '2':['.###.','#...#','....#','..##.','.#...','#...#','#####'],
  '3':['.###.','#...#','....#','..##.','....#','#...#','.###.'],
  '4':['...##','..#.#','.#..#','#...#','#####','....#','....#'],
  '5':['#####','#....','####.','....#','....#','#...#','.###.'],
  '6':['..##.','.#...','#....','####.','#...#','#...#','.###.'],
  '7':['#####','#...#','....#','...#.','..#..','..#..','..#..'],
  '8':['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],
  '9':['.###.','#...#','#...#','.####','....#','...#.','.##..'],
};
const CACHE_NUM={};
// Cada píxel de la fuente mide 2 px de pantalla (como el original a escala 2); se dibuja a la densidad real
function imagenNumero(txt){
  const dpr=Math.max(1,window.devicePixelRatio||1), k=Math.max(2,Math.round(1.8*dpr)), clave=txt+'|'+k;
  if(CACHE_NUM[clave])return CACHE_NUM[clave];
  const ch=[...String(txt)], w=ch.length*6, h=8;   // 5 de ancho + 1 de separación; +1 por la sombra
  const c=document.createElement('canvas'); c.width=w*k; c.height=h*k; const g=c.getContext('2d');
  const pinta=(dx,dy,col)=>{g.fillStyle=col;ch.forEach((d,i)=>{const m=DIGITOS_PX[d];if(!m)return;
    for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(m[y][x]==='#')g.fillRect((i*6+x+dx)*k,(y+dy)*k,k,k);});};
  pinta(1,1,'#3f3f3f'); pinta(0,0,'#ffffff');
  return CACHE_NUM[clave]={url:c.toDataURL(),w:c.width/dpr,h:c.height/dpr};
}
function htmlNumero(n){const im=imagenNumero(n);return `<b class="numPx"><img src="${im.url}" style="width:${im.w}px;height:${im.h}px" alt="${n}"></b>`;}
const _htmlPila35=htmlPila;
htmlPila=function(p){
  let h=_htmlPila35(p);
  if(p&&p.n>1)h=h.replace(`<b>${p.n}</b>`,htmlNumero(p.n));
  return h;
};
(function(){const st=document.createElement('style');st.textContent=`
.slot b.numPx{right:1px!important;bottom:1px!important;font-size:0!important;line-height:0;text-shadow:none!important}
.slot b.numPx img{width:auto;height:auto;image-rendering:pixelated;image-rendering:crisp-edges;display:block}
.slot.arrastre35{box-shadow:inset 0 0 0 40px rgba(255,255,255,.28)!important}
#libroRecetas{margin-right:10px;align-self:center;border:2px solid #000;background:#8b8b8b;box-shadow:inset 2px 2px 0 #c6c6c6,inset -2px -2px 0 #555;padding:6px;width:232px;box-sizing:border-box}
@media (max-width:820px){#libroRecetas{position:fixed;left:4px;top:4px;z-index:6;margin:0}#libroRecetas .lista{max-height:30vh!important}}
#libroRecetas .cab{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;margin-bottom:5px}
#libroRecetas h4{margin:0 0 4px;font-size:13px;color:#222}
#libroRecetas input[type=text]{width:100%;box-sizing:border-box;font-size:13px;padding:3px 6px}
#libroRecetas label{font-size:12px;color:#222;white-space:nowrap;cursor:pointer}
#libroRecetas .lista{display:grid;grid-template-columns:repeat(5,40px);gap:3px;max-height:min(360px,60vh);overflow-y:auto}
#libroRecetas .rec{width:40px;height:40px;position:relative;cursor:pointer;background:#c6c6c6;box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #555;display:flex;align-items:center;justify-content:center}
#libroRecetas .rec img{width:28px;height:28px;image-rendering:pixelated;pointer-events:none}
#libroRecetas .rec.falta{background:#b25b5b}
#libroRecetas .rec:hover{outline:2px solid #fff}
#libroRecetas .rec b.numPx{position:absolute;right:1px;bottom:1px;line-height:0}
#libroRecetas .rec b.numPx img{width:auto;height:auto}
#libroRecetas .vacioL{font-size:12px;color:#333;padding:4px}
.capa button.btnLibro{width:auto!important;display:inline-block;margin:0 0 6px;padding:3px 12px;font-size:13px;min-height:0}
.hornoIcono{image-rendering:pixelated;display:block}
`;document.head.appendChild(st);})();

/* ---------- Libro de recetas ---------- */
let libroVisible=(()=>{try{return localStorage.getItem('blockverse-libro')!=='no';}catch(e){return true;}})();
let libroSoloPosibles=true, libroFiltro='';
const coincide35=(id,q)=>id===q||EQUIV_RECETA[id]===q;
// Ingredientes que pide una receta: lista de ids (uno por casilla)
function ingredientes35(r){
  if(r.sin)return r.sin.slice();
  const l=[];for(const fila of r.patron)for(const ch of fila)if(ch!=='.')l.push(r.clave[ch]);return l;
}
function cabeEn35(r,w){if(r.sin)return r.sin.length<=w*w;return r.patron.length<=w&&r.patron[0].length<=w;}
// Cuántas veces se puede fabricar con lo que hay en el inventario (y en la rejilla)
function vecesPosible35(r,w){
  const cuenta=new Map();
  const sumar=p=>{if(p&&!p.enc)cuenta.set(p.id,(cuenta.get(p.id)||0)+p.n);};
  for(let i=0;i<36;i++)sumar(inv[i]); if(ui&&ui.craft)ui.craft.forEach(sumar);
  const pide=new Map();for(const q of ingredientes35(r))pide.set(q,(pide.get(q)||0)+1);
  let veces=Infinity;
  for(const [q,n] of pide){let hay=0;for(const [id,c] of cuenta)if(coincide35(id,q))hay+=c;veces=Math.min(veces,Math.floor(hay/n));}
  return veces===Infinity?0:veces;
}
function recetasDelLibro35(w){
  const vistos=new Set(), res=[];
  for(const r of RECETAS){
    if(!ITEMS[r.id]||!cabeEn35(r,w))continue;
    const veces=vecesPosible35(r,w), clave=r.id;
    if(libroSoloPosibles&&!veces)continue;
    if(libroFiltro&&!ITEMS[r.id].nombre.toLowerCase().includes(libroFiltro))continue;
    if(vistos.has(clave)){const o=res.find(x=>x.r.id===clave);if(o&&!o.veces&&veces){o.r=r;o.veces=veces;}continue;}
    vistos.add(clave); res.push({r,veces});
  }
  res.sort((a,b)=>(b.veces>0)-(a.veces>0)||a.r.id-b.r.id);
  return res.slice(0,240);
}
// Devuelve la rejilla al inventario y coloca la receta (veces=cuántas fabricaciones)
function colocarReceta35(r,maxVeces){
  if(!ui||!ui.craft)return;
  const w=ui.w||2;
  for(let i=0;i<ui.craft.length;i++)if(ui.craft[i]){const q=insertar(ui.craft[i],inv,IDX_INV);ui.craft[i]=q;}
  const posible=vecesPosible35(r,w); if(!posible){refrescarUI();return;}
  // Casillas que hay que llenar y con qué
  const celdas=[];
  if(r.sin)r.sin.forEach((q,i)=>celdas.push([i,q]));
  else r.patron.forEach((fila,y)=>[...fila].forEach((ch,x)=>{if(ch!=='.')celdas.push([y*w+x,r.clave[ch]]);}));
  const tope=Math.min(maxVeces,posible,...celdas.map(([,q])=>maxPila(q)));
  for(const [i,q] of celdas){
    if(ui.craft[i])continue;
    let falta=tope;
    // Primero el mismo objeto exacto, luego sus variantes equivalentes
    for(const pasada of [0,1])for(let k=0;k<36&&falta>0;k++){const s=inv[k];
      if(!s||s.enc)continue;
      if(pasada===0?s.id!==q:!(EQUIV_RECETA[s.id]===q))continue;
      const c=ui.craft[i];
      if(c&&c.id!==s.id)continue;
      const n=Math.min(falta,s.n);s.n-=n;falta-=n;
      if(c)c.n+=n;else ui.craft[i]=crearPila(s.id,n);
      if(s.n<=0)inv[k]=null;}
  }
  sonar('poner',null,.25); actualizarHUD(); refrescarUI();
}
function pintarLibro35(){
  const caja=document.getElementById('libroRecetas'); if(!caja||!ui||!ui.craft)return;
  caja.style.display=libroVisible?'':'none'; if(!libroVisible)return;
  const lista=caja.querySelector('.lista'), w=ui.w||2, recs=recetasDelLibro35(w);
  const firma=recs.map(o=>o.r.id+':'+o.veces).join(',')+'|'+libroSoloPosibles+'|'+libroFiltro;
  if(lista.dataset.firma===firma)return; lista.dataset.firma=firma;
  lista.innerHTML='';
  if(!recs.length){lista.innerHTML=`<div class="vacioL">${libroSoloPosibles?'No puedes fabricar nada con lo que llevas. Desmarca «Solo posibles» para ver todas.':'Nada coincide con la búsqueda.'}</div>`;return;}
  for(const {r,veces} of recs){
    const d=document.createElement('div'); d.className='rec'+(veces?'':' falta');
    d.innerHTML=`<img src="${ICONOS[r.id]}" alt="">`+(r.n>1?htmlNumero(r.n):'');
    const ing=new Map();for(const q of ingredientes35(r))ing.set(q,(ing.get(q)||0)+1);
    d.dataset.tip=`${ITEMS[r.id].nombre}${r.n>1?' ×'+r.n:''}\n`+[...ing].map(([q,n])=>`${n} × ${ITEMS[q]?ITEMS[q].nombre:'?'}`).join('\n')+
      (veces?`\nClic: colocar · Mayús+clic: todo (${veces})`:'\nTe faltan ingredientes');
    d.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();if(!veces)return;colocarReceta35(r,e.shiftKey?64:1);});
    lista.appendChild(d);
  }
}
function montarLibro35(){
  const viejo=document.getElementById('libroRecetas'); if(viejo)viejo.remove();
  if(!ui||!(ui.tipo==='mesa'||ui.tipo==='inv')||!ui.craft)return;
  const btn=document.createElement('button'); btn.className='secundario btnLibro'; btn.id='btnLibro';
  const pintarBtn=()=>btn.textContent=libroVisible?'Ocultar recetas':'Libro de recetas';
  pintarBtn();
  btn.onclick=e=>{e.preventDefault();libroVisible=!libroVisible;try{localStorage.setItem('blockverse-libro',libroVisible?'si':'no');}catch(_){}pintarBtn();pintarLibro35();};
  const caja=document.createElement('div'); caja.id='libroRecetas';
  caja.innerHTML=`<h4>Libro de recetas</h4><div class="cab"><input type="text" placeholder="Buscar receta…" autocomplete="off" spellcheck="false"><label><input type="checkbox" ${libroSoloPosibles?'checked':''}> Solo posibles</label></div><div class="lista"></div>`;
  const inp=caja.querySelector('input[type=text]'), chk=caja.querySelector('input[type=checkbox]');
  inp.value=libroFiltro;
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){inp.blur();}});
  inp.addEventListener('input',()=>{libroFiltro=inp.value.trim().toLowerCase();pintarLibro35();});
  chk.addEventListener('change',()=>{libroSoloPosibles=chk.checked;pintarLibro35();});
  elSup.prepend(btn); elUI.insertBefore(caja,elUI.querySelector('.tarjeta'));
  pintarLibro35();
}

/* ---------- Horno: llama y flecha del original ---------- */
const LLAMA35=['......#.......','.....##.......','.....###......','....####.#....','....#####..#..','...######.##..','..#########...','..##########..','.###########..','.############.','.############.','.############.','..##########..','...########...'];
const FLECHA35=['..............#.......','..............##......','..............###.....','..............####....','..............#####...','######################','#######################','######################','..............#####...','..............####....','..............###.....','..............##......','..............#.......'];
function dibujarIcono35(c,mascara,frac,eje,colLleno,colVacio){
  const g=c.getContext('2d'), h=mascara.length, w=mascara[0].length, k=c.width/w;
  g.clearRect(0,0,c.width,c.height);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(mascara[y][x]!=='#')continue;
    const lleno=eje==='y'?(h-y)/h<=frac+1e-6&&frac>0:x/w<frac;
    const col=lleno?(typeof colLleno==='function'?colLleno(x,y,w,h):colLleno):colVacio;
    g.fillStyle=col; g.fillRect(x*k,y*k,k,k);}
}
const colFuego35=(x,y,w,h)=>{const t=y/h;return t<.3?'#ffe27a':t<.6?'#ffb030':'#e8601c';};
function montarHorno35(){
  if(!ui||ui.tipo!=='horno')return;
  const bf=document.getElementById('barFuego'), bp=document.getElementById('barFundir'); if(!bf||!bp)return;
  const pf=bf.parentNode, pp=bp.parentNode;
  pf.style.display='none'; pp.style.display='none';
  const cf=document.createElement('canvas'); cf.width=28; cf.height=28; cf.className='hornoIcono'; cf.id='llamaHorno'; cf.style.cssText='width:28px;height:28px;margin:4px auto';
  const cp=document.createElement('canvas'); cp.width=44; cp.height=26; cp.className='hornoIcono'; cp.id='flechaHorno'; cp.style.cssText='width:44px;height:26px;margin:0 8px';
  pf.parentNode.insertBefore(cf,pf); pp.parentNode.insertBefore(cp,pp);
  const tipo=bloqueHorno35(ui.clave);
  if(tipo!=='horno'){const t=elSup.querySelector('h3');if(t)t.textContent=tipo==='ahumador'?'AHUMADOR':'ALTO HORNO';}
  const p=document.createElement('div');p.className='pista';p.id='pistaHorno';p.style.cssText='font-size:12px;margin-top:4px';
  p.textContent=tipo==='ahumador'?'Solo comida, el doble de rápido.':tipo==='alto'?'Solo minerales, metales y armaduras, el doble de rápido.':'';
  if(p.textContent)elSup.appendChild(p);
  actualizarIconosHorno35();
}
function actualizarIconosHorno35(){
  if(!ui||ui.tipo!=='horno')return;
  const cf=document.getElementById('llamaHorno'), cp=document.getElementById('flechaHorno'), h=ui.horno; if(!cf||!cp||!h)return;
  const ff=h.quemaMax>0?Math.max(0,h.quema)/h.quemaMax:0, fp=Math.min(1,h.prog/TIEMPO_FUNDIR);
  const firma=Math.round(ff*14)+'|'+Math.round(fp*22);
  if(cf.dataset.f===firma)return; cf.dataset.f=firma;
  dibujarIcono35(cf,LLAMA35,Math.round(ff*14)/14,'y',colFuego35,'#5a5a5a');
  dibujarIcono35(cp,FLECHA35,Math.round(fp*22)/22,'x','#ffffff','#5a5a5a');
}

/* ---------- Hornos: encendidos, ahumador y alto horno ---------- */
const ENCENDIDO35={17:1662,1608:1663,1609:1664}, APAGADO35={1662:17,1663:1608,1664:1609};
function posHorno35(k){const i=k.indexOf(':');if(i<0)return null;const [x,y,z]=k.slice(i+1).split(',').map(Number);return {dim:k.slice(0,i),x,y,z};}
function bloqueHorno35(k){
  const p=posHorno35(k); if(!p||p.dim!==dim.clave)return 'horno';
  const b=getBloque(p.x,p.y,p.z);
  return b===1608||b===1663?'ahumador':b===1609||b===1664?'alto':'horno';
}
const esComida35=id=>!!(ITEMS[id]&&ITEMS[id].comida);
// Encender o apagar no es romper: el contenido se queda dentro. Romper cualquier horno (también
// el ahumador, el alto horno y los encendidos) suelta lo que tenga.
const FAMILIA_HORNO35=new Set([17,1608,1609,1662,1663,1664]);
let cambiandoHorno35=false;
const _vaciarContenedor35=vaciarContenedor;
vaciarContenedor=function(){if(cambiandoHorno35)return;return _vaciarContenedor35.apply(this,arguments);};
const _setBloque35=setBloque;
setBloque=function(x,y,z,id,opc){
  const ant=cambiandoHorno35?0:getBloque(x,y,z);
  const r=_setBloque35.apply(this,arguments);
  if(ant&&ant!==17&&FAMILIA_HORNO35.has(ant)&&!FAMILIA_HORNO35.has(id)&&getBloque(x,y,z)===id)_vaciarContenedor35(x,y,z);
  return r;
};
function cambiarHorno35(x,y,z,id){cambiandoHorno35=true;try{setBloque(x,y,z,id);}finally{cambiandoHorno35=false;}}
actualizarHornos=function(dt){
  for(const k in hornos){
    const h=hornos[k], tipo=bloqueHorno35(k), res=h.entrada&&FUNDIR[h.entrada.id];
    // El ahumador solo cocina comida; el alto horno solo funde lo que no es comida
    const vale=res!==undefined&&res!==null&&(tipo==='horno'||(tipo==='ahumador'?esComida35(res):!esComida35(res)));
    const f=tipo==='horno'?1:2;
    const cabe=vale&&(!h.salida||(h.salida.id===res&&h.salida.n<maxPila(res)));
    if(h.quema>0)h.quema-=dt*f;
    if(h.quema<=0&&cabe&&h.combustible&&COMBUSTIBLE[h.combustible.id]){
      h.quema=h.quemaMax=COMBUSTIBLE[h.combustible.id];
      if(h.combustible.id===I.cuboLava)h.combustible=crearPila(I.cubo);
      else if(--h.combustible.n<=0)h.combustible=null;
    }
    if(h.quema>0&&cabe){
      h.prog+=dt*f;
      if(h.prog>=TIEMPO_FUNDIR){h.prog=0;
        if(--h.entrada.n<=0)h.entrada=null;
        if(h.salida)h.salida.n++;else h.salida=crearPila(res);
        h.xp=(h.xp||0)+.35;}
    }else h.prog=Math.max(0,h.prog-dt*2);
    if(h.quema<0)h.quema=0;
    // Bloque encendido o apagado según queme
    const p=posHorno35(k);
    if(p&&p.dim===dim.clave){
      const b=getBloqueSiCargado(p.x,p.y,p.z);
      if(b>0){
        if(h.quema>0&&ENCENDIDO35[b])cambiarHorno35(p.x,p.y,p.z,ENCENDIDO35[b]);
        else if(h.quema<=0&&APAGADO35[b])cambiarHorno35(p.x,p.y,p.z,APAGADO35[b]);
        // Humo y chispas
        if(h.quema>0&&Math.random()<dt*2.5&&Math.hypot(p.x-jugador.pos.x,p.z-jugador.pos.z)<24){
          emitirParticulas(p.x+.5,p.y+1.05,p.z+.5,0x777777,1,.25,1.4,-1.2);
          if(Math.random()<.4){const lado=Math.floor(Math.random()*4),ox=[.5,1.05,.5,-.05][lado],oz=[1.05,.5,-.05,.5][lado];emitirParticulas(p.x+ox,p.y+.3,p.z+oz,0xffa030,1,.2,.4,-.5);}
        }
      }
    }
  }
};

/* ---------- Arrastrar para repartir y doble clic para juntar ---------- */
let arrastre35=null, ultimoClic35={t:0,el:null};
function refDe35(el){const r=refsUI.find(o=>o.el===el);return r?r.ref:null;}
function aceptaPila35(ref,p){
  if(!ref||ref.tipo==='resultado'||ref.tipo==='salida')return false;
  if(ref.acepta&&!ref.acepta(p))return false;
  const s=ref.get(); return !s||mismaPila(s,p);
}
document.addEventListener('mousedown',e=>{
  if(!ui||ui.tipo==='paleta')return;
  const el=e.target.closest&&e.target.closest('.slot'); if(!el||!elUI.contains(el))return;
  const ref=refDe35(el); if(!ref)return;
  // Doble clic con algo en el cursor: junta todas las pilas iguales
  const ahora=performance.now();
  if(e.button===0&&!e.shiftKey&&cursor&&ultimoClic35.el===el&&ahora-ultimoClic35.t<350&&ref.tipo!=='resultado'){
    e.preventDefault();e.stopImmediatePropagation();
    const max=maxPila(cursor.id);
    for(const pasada of [0,1])for(const {ref:r} of refsUI){if(cursor.n>=max)break;
      if(r.tipo==='resultado')continue;const s=r.get();if(!s||!mismaPila(s,cursor))continue;
      if(pasada===0&&s.n>=maxPila(s.id))continue;   // primero las pilas incompletas
      const n=Math.min(max-cursor.n,s.n);cursor.n+=n;s.n-=n;r.set(s.n?s:null);}
    ultimoClic35={t:0,el:null}; refrescarUI(); return;
  }
  ultimoClic35={t:ahora,el};
  if(!cursor||e.shiftKey||(e.button!==0&&e.button!==2)||!aceptaPila35(ref,cursor))return;
  e.preventDefault();e.stopImmediatePropagation();
  arrastre35={boton:e.button,refs:[ref],els:[el],pila:{...cursor}};
  el.classList.add('arrastre35');
},true);
document.addEventListener('mouseover',e=>{
  if(!arrastre35)return;
  const el=e.target.closest&&e.target.closest('.slot'); if(!el||arrastre35.els.includes(el))return;
  const ref=refDe35(el); if(!ref||!aceptaPila35(ref,arrastre35.pila))return;
  if(arrastre35.boton===2&&arrastre35.refs.length>=arrastre35.pila.n)return;
  arrastre35.refs.push(ref); arrastre35.els.push(el); el.classList.add('arrastre35');
},true);
document.addEventListener('mouseup',e=>{
  const A=arrastre35; if(!A)return; arrastre35=null;
  A.els.forEach(el=>el.classList.remove('arrastre35'));
  if(!ui||!cursor)return;
  if(A.refs.length===1){clicSlot(A.refs[0],A.boton,false);refrescarUI();return;}
  const total=cursor.n, porSlot=A.boton===2?1:Math.max(1,Math.floor(total/A.refs.length));
  for(const ref of A.refs){
    if(!cursor||cursor.n<=0)break;
    const s=ref.get(), max=Math.min(ref.max||64,maxPila(cursor.id)), ya=s?s.n:0;
    const n=Math.min(porSlot,max-ya,cursor.n); if(n<=0)continue;
    if(s){s.n+=n;ref.set(s);}else ref.set({...cursor,n});
    cursor.n-=n;
  }
  if(cursor&&cursor.n<=0)cursor=null;
  refrescarUI();
},true);

/* ---------- Sonido al fabricar ---------- */
if(typeof SND!=='undefined'&&!SND.fabricar)SND.fabricar=v=>{tonoSnd(520,780,.07,'square',.035*v);setTimeout(()=>tonoSnd(700,980,.06,'square',.03*v),55);};
const _clicResultado35=clicResultado;
clicResultado=function(shift){
  const suma=()=>ui&&ui.craft?ui.craft.reduce((t,p)=>t+(p?p.n:0),0):0;
  const antes=suma(); const r=_clicResultado35(shift);
  if(suma()<antes)sonar('fabricar',null,.7);
  return r;
};

/* ---------- Montaje en las pantallas ---------- */
const _construirUI35=construirUI;
construirUI=function(){
  _construirUI35();
  try{montarLibro35();montarHorno35();}catch(e){console.error(e);}
};
const _refrescarUI35=refrescarUI;
refrescarUI=function(){
  _refrescarUI35();
  try{pintarLibro35();actualizarIconosHorno35();}catch(e){}
};
const _actualizarFinal35=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinal35(dt);if(ui&&ui.tipo==='horno')actualizarIconosHorno35();};
