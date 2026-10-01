"use strict";
/* =========================================================
   Tienda de Bed Wars mejorada (al estilo de Hypixel)
   - Cuadrícula de objetos con iconos, pestañas con iconos y
     tu dinero (hierro, oro, diamantes, esmeraldas) arriba.
   - Cada objeto muestra su precio con el icono de la moneda;
     en rojo si no te llega, con ✔ si ya lo tienes y el nivel
     en pico y hacha. Descripción al pasar el ratón.
   - Clic: comprar · Mayús+clic: comprar varias veces (hasta
     64) · Clic derecho: añadir o quitar de Compra rápida
     (se guarda).
   - Destello verde al comprar y rojo si no te alcanza.
   - Objetos nuevos: tijeras permanentes (rápidas con la lana).
   - Mejoras del equipo en cuadrícula con sus niveles y la
     cola de trampas a la vista.
   ========================================================= */
const DESC_BW={
  'Lana':'Bloque básico para hacer puentes. Del color de tu equipo.',
  'Terracota endurecida':'Más resistente que la lana. Buena para proteger la cama.',
  'Vidrio a prueba de explosiones':'Las explosiones no lo rompen.',
  'Piedra del End':'Sólida y resistente a las explosiones.',
  'Escalera de mano':'Para trepar o tapar la cama.',
  'Tablones de roble':'Aguantan las explosiones; se rompen rápido con hacha.',
  'Obsidiana':'Lo más resistente para proteger la cama.',
  'Espada de piedra':'Sustituye a tu espada de madera.',
  'Espada de hierro':'Sustituye a tu espada de madera.',
  'Espada de diamante':'La mejor espada.',
  'Palo de empuje (Empuje I)':'Manda a los enemigos al vacío.',
  'Armadura de cota (permanente)':'Pantalones y botas. No la pierdes al morir.',
  'Armadura de hierro (permanente)':'Pantalones y botas. No la pierdes al morir.',
  'Armadura de diamante (permanente)':'Pantalones y botas. No la pierdes al morir.',
  'Pico (mejora)':'Cada compra lo mejora un nivel. Al morir baja uno.',
  'Hacha (mejora)':'Cada compra la mejora un nivel. Al morir baja uno.',
  'Tijeras (permanentes)':'Cortan la lana al instante. No las pierdes al morir.',
  'Flechas':'Munición para el arco.',
  'Arco':'Ataca de lejos.',
  'Arco (Poder I)':'Más daño a distancia.',
  'Arco (Poder I, Impacto I)':'Más daño y empuja al enemigo.',
  'Rapidez II (45 s, al momento)':'Corres mucho más rápido.',
  'Supersalto V (45 s, al momento)':'Saltas muy alto.',
  'Invisibilidad (30 s, al momento)':'Los enemigos no te ven (salvo la armadura).',
  'Manzana dorada':'Cura y da absorción.',
  'Bola de fuego':'Clic derecho para lanzarla: explota al chocar.',
  'Dinamita (se enciende sola)':'Se enciende al colocarla.',
  'Perla de ender':'Lánzala para teletransportarte.',
  'Cubo de agua':'Frena las caídas y empuja a los enemigos.',
  'Huevo puente':'Deja un puente de lana por donde vuela.',
  'Esponja':'Absorbe el agua.',
  'Torre compacta':'Construye al instante una torre con escalera.',
  'Chinche (lepisma aliada)':'Invoca una lepisma que ataca a los enemigos.',
  'Defensor de los sueños (gólem)':'Invoca un gólem de hierro que defiende tu base.',
  'Leche mágica (sin trampas 30 s)':'Durante 30 s no activas las trampas enemigas.',
};
const ICONO_TAB_BW={'Compra rápida':()=>I.estrellaNether||idClave('estrella_nether')||I.esmeralda,'Bloques':()=>lanaYo(),'Combate':()=>idClave('espada_oro'),'Armadura':()=>idClave('botas_cobre'),
  'Herramientas':()=>idClave('pico_piedra'),'Arcos':()=>I.arco,'Pociones':()=>505,'Utilidad':()=>B.tnt};
const MONEDA_ID=k=>I[k];

/* ---------- Objetos nuevos: tijeras permanentes ---------- */
(function(){
  const herr=TIENDA_BW.find(t=>t[0]==='Herramientas');
  if(herr&&I.tijeras&&!herr[1].some(o=>o.tijeras))herr[1].push({n:'Tijeras (permanentes)',id:()=>I.tijeras,c:1,p:[MH,20],tijeras:true});
})();
const _comprarBW37=comprarBW;
comprarBW=function(o){
  if(o.tijeras){
    if(BW.yo.tijeras){mostrarMensaje('Ya tienes las tijeras');return;}
    if(!pagarBW(o.p[0],o.p[1])){sonar('sinDinero');mostrarMensaje(`Te faltan ${o.p[1]-contarInv(I[o.p[0]])} de ${NOMBRE_MONEDA[o.p[0]]}`);return;}
    BW.yo.tijeras=true; darBW(I.tijeras,1); sonar('compraBW'); mostrarMensaje('Has comprado: Tijeras'); actualizarHUD(); if(ui)refrescarUI(); return;
  }
  return _comprarBW37(o);
};
const _kitBW37=kitBW;
kitBW=function(inicio){_kitBW37(inicio);if(BW&&BW.yo&&BW.yo.tijeras&&I.tijeras&&!contarInv(I.tijeras))darBW(I.tijeras,1);};
// Las tijeras cortan la lana al momento
const _tiempoRomper37=tiempoRomper;
tiempoRomper=function(b,pila){
  const t=_tiempoRomper37(b,pila);
  if(pila&&pila.id===I.tijeras&&BLOQUES[b]&&/^lana/.test(BLOQUES[b].clave))return Math.min(t,.12);
  return t;
};

/* ---------- Compra rápida personalizable ---------- */
const LIMITE_RAPIDA=21;
function todasOfertasBW(){const r=[];for(const [nom,l] of TIENDA_BW)if(nom!=='Compra rápida')for(const o of l)if(!r.includes(o))r.push(o);return r;}
function rapidaBW(){return TIENDA_BW[0]&&TIENDA_BW[0][0]==='Compra rápida'?TIENDA_BW[0][1]:null;}
(function(){
  try{const g=JSON.parse(localStorage.getItem('blockverse-bw-rapida')||'null');const l=rapidaBW();
    if(Array.isArray(g)&&l){const todas=todasOfertasBW();const nueva=g.map(n=>todas.find(o=>o.n===n)).filter(Boolean);if(nueva.length){l.length=0;l.push(...nueva);}}}catch(e){}
})();
function alternarRapida(o){
  const l=rapidaBW(); if(!l)return;
  const i=l.indexOf(o);
  if(i>=0){l.splice(i,1);mostrarMensaje(`Quitado de Compra rápida: ${o.n}`);}
  else{if(l.length>=LIMITE_RAPIDA){mostrarMensaje('La Compra rápida está llena');return;}l.push(o);mostrarMensaje(`Añadido a Compra rápida: ${o.n}`);}
  try{localStorage.setItem('blockverse-bw-rapida',JSON.stringify(l.map(x=>x.n)));}catch(e){}
  sonar('poner',null,.4);
}

/* ---------- Estado de cada oferta ---------- */
function estadoOferta(o){
  const yo=BW.yo, p=typeof o.p==='function'?o.p():o.p;
  if(o.armadura!==undefined&&yo.armadura>=o.armadura)return {p,tiene:true};
  if(o.tijeras&&yo.tijeras)return {p,tiene:true};
  if(o.pico&&yo.pico>=4||o.hacha&&yo.hacha>=4)return {p,max:true};
  return {p,puede:contarInv(I[p[0]])>=p[1]};
}
const NIVELES_ROM=['I','II','III','IV','V'];
function tipOferta(o,E){
  const p=E.p, mon=NOMBRE_MONEDA[p[0]], col={lingoteHierro:'§f',lingoteOro:'§6',diamante:'§b',esmeralda:'§a'}[p[0]];
  let t=`${o.n}${o.c>1?' ×'+o.c:''}\n§7${DESC_BW[o.n]||''}\n§7Coste: ${col}${p[1]} ${mon}`;
  if(o.pico||o.hacha){const n=o.pico?BW.yo.pico:BW.yo.hacha;t+=`\n§7Nivel actual: §e${n?NIVELES_ROM[n-1]:'ninguno'}`;}
  t+=E.tiene?'\n§a¡Ya lo tienes!':E.max?'\n§a¡Nivel máximo!':E.puede?'\n§e¡Clic para comprar!':`\n§c¡No tienes suficiente ${mon}!`;
  if(!E.tiene&&!E.max&&o.c>0&&o.armadura===undefined&&!o.pico&&!o.hacha&&!o.tijeras&&!o.espada)t+='\n§7Mayús+clic: comprar varias veces';
  t+=`\n§8Clic derecho: ${rapidaBW()&&rapidaBW().includes(o)?'quitar de':'añadir a'} Compra rápida`;
  return t;
}
// Descripciones emergentes con colores (§a, §c, §e…)
const COLORES_TIP={'0':'#000','7':'#aaa','8':'#666','a':'#5f5','b':'#5ff','c':'#f55','e':'#ff5','f':'#fff','6':'#fa0','9':'#55f','d':'#f5f'};
if(typeof pintarTip==='function'){
  const _pintarTip37=pintarTip;
  pintarTip=function(texto){
    if(!/§/.test(texto))return _pintarTip37(texto);
    elTip.innerHTML=texto.split('\n').filter(l=>l!=='§7').map((l,i)=>{let col=null;const m=l.match(/^§(.)/);if(m){col=COLORES_TIP[m[1]];l=l.slice(2);}
      l=l.replace(/§(.)/g,(_,c)=>`\u0000${c}`);
      const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const partes=l.split('\u0000');let h=esc(partes[0]);for(let k=1;k<partes.length;k++){h+=`<span style="color:${COLORES_TIP[partes[k][0]]||'inherit'}">${esc(partes[k].slice(1))}</span>`;}
      return `<div class="${i===0?'t1':'t2'}"${col?` style="color:${col}"`:''}>${h}</div>`;}).join('');
  };
}

/* ---------- Pantalla ---------- */
let destelloBW=null;
function monederoBW(){
  const d=document.createElement('div'); d.className='monederoBW';
  for(const k of [MH,MO,MD,ME]){const n=contarInv(I[k]);
    const s=document.createElement('span');s.className='monedaBW'+(n?'':' cero');s.dataset.tip=`${NOMBRE_MONEDA[k][0].toUpperCase()+NOMBRE_MONEDA[k].slice(1)}: ${n}`;
    s.innerHTML=`<img src="${ICONOS[I[k]]}" alt=""><b style="color:${COLOR_MONEDA[k]}">${n}</b>`;d.appendChild(s);}
  return d;
}
function celdaOferta(o){
  const E=estadoOferta(o), id=o.id(), d=document.createElement('div');
  d.className='celdaBW'+(E.tiene||E.max?' tiene':E.puede?'':' falta');
  if(destelloBW&&destelloBW.o===o&&performance.now()-destelloBW.t<450)d.classList.add(destelloBW.ok?'okBW':'malBW');
  const n=o.c>1&&typeof htmlNumero==='function'?htmlNumero(o.c):o.c>1?`<b>${o.c}</b>`:'';
  const nivel=(o.pico||o.hacha)?`<i class="nivelBW">${NIVELES_ROM[Math.min(3,(o.pico?BW.yo.pico:BW.yo.hacha))]||''}</i>`:'';
  d.innerHTML=`<div class="iconoBW"><img src="${ICONOS[id]||''}" alt="">${n}${nivel}${E.tiene||E.max?'<i class="checkBW">✔</i>':''}</div>`+
    `<div class="precioBW" style="color:${E.tiene||E.max?'#5f5':E.puede?COLOR_MONEDA[E.p[0]]:'#f66'}">${E.tiene||E.max?'✔':`<img src="${ICONOS[MONEDA_ID(E.p[0])]}" alt="">${E.p[1]}`}</div>`;
  d.dataset.tip=tipOferta(o,E);
  d.addEventListener('contextmenu',e=>e.preventDefault());
  d.addEventListener('mousedown',e=>{
    e.preventDefault();e.stopPropagation();
    if(e.button===2){alternarRapida(o);construirUI();return;}
    const antes=contarInv(I[E.p[0]]);
    let veces=1;
    if(e.shiftKey&&o.c>0&&o.armadura===undefined&&!o.pico&&!o.hacha&&!o.tijeras&&!o.espada&&!o.efecto)veces=Math.max(1,Math.floor(64/Math.max(1,o.c)));
    for(let k=0;k<veces;k++){const a=contarInv(I[E.p[0]]);if(k>0&&a<E.p[1])break;comprarBW(o);if(contarInv(I[E.p[0]])===a)break;}
    destelloBW={o,ok:contarInv(I[E.p[0]])<antes,t:performance.now()};
    construirUI();
  });
  return d;
}
UI_EXTRA.tiendaBW.construir=function(titulo){
  titulo('TIENDA DE OBJETOS');
  if(!BW||!BW.activo)return;
  const caja=document.createElement('div');caja.className='tienda37';elSup.appendChild(caja);
  caja.appendChild(monederoBW());
  const tabs=document.createElement('div');tabs.className='tabs37';caja.appendChild(tabs);
  TIENDA_BW.forEach(([nom],i)=>{const t=document.createElement('div');t.className='tabBW'+(i===pestanaBW?' activa':'');
    const ic=ICONO_TAB_BW[nom]?ICONO_TAB_BW[nom]():0;
    t.innerHTML=`<img src="${ICONOS[ic]||''}" alt=""><span>${nom}</span>`; t.dataset.tip=nom;
    t.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();pestanaBW=i;sonar('poner',null,.25);construirUI();});tabs.appendChild(t);});
  const lista=TIENDA_BW[pestanaBW][1];
  const rej=document.createElement('div');rej.className='rejilla37';caja.appendChild(rej);
  for(const o of lista)rej.appendChild(celdaOferta(o));
  if(!lista.length){const v=document.createElement('div');v.className='pista';v.textContent='Vacía: haz clic derecho en cualquier objeto de otra pestaña para añadirlo.';caja.appendChild(v);}
  const pie=document.createElement('div');pie.className='pista pie37';
  pie.textContent=pestanaBW===0?'Clic: comprar · Mayús+clic: comprar varias · Clic derecho: quitar de Compra rápida':'Clic: comprar · Mayús+clic: comprar varias · Clic derecho: añadir a Compra rápida';
  caja.appendChild(pie);
};

/* ---------- Mejoras del equipo ---------- */
const ICONO_MEJORA={filo:()=>idClave('espada_diamante'),prot:()=>idClave('pechera_hierro'),prisa:()=>idClave('pico_oro'),forja:()=>B.horno,curacion:()=>I.manzanaDorada};
const ICONO_TRAMPA={trampa:()=>I.cuerda||I.hilo,contra:()=>I.pluma,alarma:()=>I.redstone,fatiga:()=>idClave('pico_hierro')};
UI_EXTRA.mejorasBW.construir=function(titulo){
  titulo('MEJORAS DEL EQUIPO');
  if(!BW||!BW.activo)return;
  const eq=BW.equipos[BW.yo.equipo];
  const caja=document.createElement('div');caja.className='tienda37';elSup.appendChild(caja);
  caja.appendChild(monederoBW());
  const h=document.createElement('h4');h.className='sub37';h.textContent='Mejoras';caja.appendChild(h);
  const rej=document.createElement('div');rej.className='rejilla37';caja.appendChild(rej);
  for(const M of MEJORAS_BW){
    const nv=eq.mejoras[M.k], max=nv>=M.precios.length, coste=max?0:M.precios[nv], puede=contarInv(I.diamante)>=coste;
    const d=document.createElement('div'); d.className='celdaBW'+(max?' tiene':puede?'':' falta');
    if(destelloBW&&destelloBW.o===M&&performance.now()-destelloBW.t<450)d.classList.add(destelloBW.ok?'okBW':'malBW');
    const puntos=M.precios.length>1?`<div class="puntosBW">${M.precios.map((_,i)=>`<i class="${i<nv?'si':''}"></i>`).join('')}</div>`:'';
    const ic=ICONO_MEJORA[M.k]?ICONO_MEJORA[M.k]():0;
    d.innerHTML=`<div class="iconoBW"><img src="${ICONOS[ic]||''}" alt="">${max?'<i class="checkBW">✔</i>':''}</div>${puntos}`+
      `<div class="precioBW" style="color:${max?'#5f5':puede?'#5ff':'#f66'}">${max?'✔':`<img src="${ICONOS[I.diamante]}" alt="">${coste}`}</div>`;
    d.dataset.tip=`${M.n}${M.precios.length>1?' '+(NIVELES_ROM[Math.min(nv,M.precios.length-1)]):''}\n§7${M.d}\n`+
      (M.precios.length>1?M.precios.map((c,i)=>`${i<nv?'§a':'§7'}Nivel ${NIVELES_ROM[i]}: ${c} diamante(s)`).join('\n')+'\n':`§7Coste: §b${coste} diamante(s)\n`)+
      (max?'§a¡Comprada!':puede?'§e¡Clic para comprar!':'§c¡No tienes suficientes diamantes!');
    d.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();if(max)return;
      if(!pagarBW(MD,coste)){sonar('sinDinero');mostrarMensaje('Te faltan diamantes');destelloBW={o:M,ok:false,t:performance.now()};construirUI();return;}
      eq.mejoras[M.k]++;sonar('compraBW');mostrarMensaje(`Mejora comprada: ${M.n}`);if(M.k==='filo')aplicarFilo();if(M.k==='prot')aplicarMejorasArmadura();
      destelloBW={o:M,ok:true,t:performance.now()};construirUI();});
    rej.appendChild(d);
  }
  const h2=document.createElement('h4');h2.className='sub37';h2.textContent='Trampas';caja.appendChild(h2);
  const cola=document.createElement('div');cola.className='cola37';
  for(let i=0;i<3;i++){const k=eq.trampas[i],T=k&&TRAMPAS_BW.find(t=>t.k===k);const s=document.createElement('div');s.className='huecoBW';
    if(T){const ic=ICONO_TRAMPA[T.k]?ICONO_TRAMPA[T.k]():0;s.innerHTML=`<img src="${ICONOS[ic]||''}" alt="">`;s.dataset.tip=`Trampa ${i+1}: ${T.n}\n§7${T.d}`;}
    else s.dataset.tip=`Trampa ${i+1}: vacía`;
    cola.appendChild(s);}
  const lbl=document.createElement('span');lbl.className='lblCola';lbl.textContent=eq.trampas.length>=3?'Cola llena':`Siguiente: ${1<<eq.trampas.length} diamante(s)`;cola.appendChild(lbl);
  caja.appendChild(cola);
  const rej2=document.createElement('div');rej2.className='rejilla37';caja.appendChild(rej2);
  for(const T of TRAMPAS_BW){
    const llena=eq.trampas.length>=3, coste=1<<eq.trampas.length, puede=contarInv(I.diamante)>=coste;
    const d=document.createElement('div');d.className='celdaBW'+(llena?' tiene':puede?'':' falta');
    if(destelloBW&&destelloBW.o===T&&performance.now()-destelloBW.t<450)d.classList.add(destelloBW.ok?'okBW':'malBW');
    const ic=ICONO_TRAMPA[T.k]?ICONO_TRAMPA[T.k]():0;
    d.innerHTML=`<div class="iconoBW"><img src="${ICONOS[ic]||''}" alt=""></div><div class="precioBW" style="color:${llena?'#888':puede?'#5ff':'#f66'}">${llena?'—':`<img src="${ICONOS[I.diamante]}" alt="">${coste}`}</div>`;
    d.dataset.tip=`${T.n}\n§7${T.d}\n§7Se activa cuando un enemigo entra en tu base.\n`+(llena?'§cLa cola de trampas está llena':puede?`§e¡Clic para comprar! (${coste} diamante(s))`:'§c¡No tienes suficientes diamantes!');
    d.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();if(llena)return;
      if(!pagarBW(MD,coste)){sonar('sinDinero');destelloBW={o:T,ok:false,t:performance.now()};construirUI();return;}
      eq.trampas.push(T.k);sonar('compraBW');mostrarMensaje(`Trampa preparada: ${T.n}`);destelloBW={o:T,ok:true,t:performance.now()};construirUI();});
    rej2.appendChild(d);
  }
};

/* ---------- Estilos ---------- */
{const st=document.createElement('style');st.textContent=`
.tienda37{display:flex;flex-direction:column;gap:6px}
.monederoBW{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:-30px;min-height:24px}
.monedaBW{display:flex;align-items:center;gap:3px;font:bold 15px monospace;text-shadow:1px 1px 0 #000}
.monedaBW img{width:20px;height:20px;image-rendering:pixelated}.monedaBW.cero{opacity:.45}
.tabs37{display:flex;gap:3px;flex-wrap:wrap}
.tabBW{width:48px;height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#8b8b8b;
  box-shadow:inset 2px 2px 0 #c6c6c6,inset -2px -2px 0 #555;border:2px solid #000;position:relative}
.tabBW img{width:26px;height:26px;image-rendering:pixelated;pointer-events:none}.tabBW span{display:none}
.tabBW.activa{background:#c6c6c6;box-shadow:inset 2px 2px 0 #fff,inset -2px -2px 0 #888;border-bottom:4px solid #4caf50;transform:translateY(-2px)}
.tabBW:hover{filter:brightness(1.12)}
.rejilla37{display:grid;grid-template-columns:repeat(7,62px);gap:5px}
.celdaBW{width:62px;height:66px;background:#8b8b8b;border:2px solid #222;box-shadow:inset 2px 2px 0 #c6c6c6,inset -2px -2px 0 #555;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4px 0 2px;box-sizing:border-box;cursor:pointer;position:relative;transition:transform .06s}
.celdaBW:hover{background:#a6a6a6;outline:2px solid #fff;outline-offset:-2px}
.celdaBW:active{transform:scale(.94)}
.celdaBW.falta{background:#7a5c5c}.celdaBW.falta .iconoBW img{filter:grayscale(.55) brightness(.85)}
.celdaBW.tiene{background:#5f8f5f}
.iconoBW{position:relative;width:36px;height:36px}.iconoBW img{width:36px;height:36px;image-rendering:pixelated;pointer-events:none}
.iconoBW b.numPx{position:absolute;right:-6px;bottom:-4px;line-height:0}.iconoBW b.numPx img{width:auto;height:auto}
.iconoBW>b:not(.numPx){position:absolute;right:-4px;bottom:-4px;color:#fff;font:bold 12px monospace;text-shadow:1px 1px 0 #000}
.checkBW{position:absolute;left:-6px;top:-6px;color:#5f5;font-style:normal;font-weight:bold;font-size:15px;text-shadow:1px 1px 0 #000}
.nivelBW{position:absolute;left:-6px;top:-6px;color:#ff5;font:bold 12px monospace;font-style:normal;text-shadow:1px 1px 0 #000}
.precioBW{display:flex;align-items:center;gap:2px;font:bold 13px monospace;text-shadow:1px 1px 0 #000;line-height:1}
.precioBW img{width:14px;height:14px;image-rendering:pixelated}
.puntosBW{display:flex;gap:2px}.puntosBW i{width:7px;height:7px;background:#444;border:1px solid #000}.puntosBW i.si{background:#5f5}
.celdaBW.okBW{animation:okBW .45s}.celdaBW.malBW{animation:malBW .4s}
@keyframes okBW{0%{background:#7fff7f;transform:scale(1.08)}100%{}}
@keyframes malBW{0%,100%{transform:none}20%{transform:translateX(-4px);background:#ff6b6b}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
.sub37{margin:4px 0 0;font-size:14px;color:#333}
.cola37{display:flex;gap:4px;align-items:center}
.huecoBW{width:40px;height:40px;background:#555;border:2px solid #000;box-shadow:inset 2px 2px 0 #333;display:flex;align-items:center;justify-content:center}
.huecoBW img{width:28px;height:28px;image-rendering:pixelated}
.lblCola{font-size:12px;color:#333;margin-left:6px}
.pie37{font-size:11px;margin-top:2px}
@media (max-width:640px){.rejilla37{grid-template-columns:repeat(5,56px)}.celdaBW{width:56px}}
`;document.head.appendChild(st);}
