"use strict";
/* =========================================================
   Inventario y pantallas (fabricación, horno, cofre,
   encantamientos y paleta creativa)
   ========================================================= */
const IDX_INV=rango(0,36);
function insertar(pila,arr,indices){
  const max=maxPila(pila.id);
  if(max>1&&!pila.enc)for(const i of indices){const s=arr[i];
    if(s&&mismaPila(s,pila)&&s.n<max){const k=Math.min(max-s.n,pila.n);s.n+=k;pila.n-=k;if(!pila.n)return null;}}
  for(const i of indices)if(!arr[i]){arr[i]=pila;return null;}
  return pila;
}
function insertarInv(p){const r=insertar(p,inv,IDX_INV);actualizarHUD();if(ui)refrescarUI();return r;}
function insertarEn(obj,k,p){
  const s=obj[k];
  if(!s){obj[k]=p;return null;}
  if(mismaPila(s,p)){const n=Math.min(maxPila(p.id)-s.n,p.n);s.n+=n;p.n-=n;return p.n?p:null;}
  return p;
}
function espacioPara(id){let e=0;const m=maxPila(id);for(let i=0;i<36;i++){const s=inv[i];e+=!s?m:(s.id===id&&m>1&&!s.enc?m-s.n:0);}return e;}
function nombrePila(p){
  if(!p)return '';
  let t=ITEMS[p.id].nombre;
  if(p.enc)for(const k in p.enc)t+='\n'+ENCANTOS[k].nombre+' '+ROMANOS[p.enc[k]];
  if(p.contenido&&p.contenido.length)t+='\n'+p.contenido.map(c=>ITEMS[c.id].nombre+' ×'+c.n).join('\n')+`\n${pesoSaquito(p)}/64`;
  else if(p.id===542)t+='\nVacío · clic derecho para guardar objetos';
  const it=ITEMS[p.id];
  if(it.dur)t+=`\nDurabilidad: ${p.dur} / ${it.dur}`;
  if(it.armadura)t+=`\n+${it.armadura.def} de armadura`;
  if(it.herr)t+=`\n${it.herr.dano} de daño de ataque`;
  return t;
}
function htmlPila(p){
  if(!p)return '';
  let h=`<img src="${ICONOS[p.id]}" alt="">`;
  if(p.n>1)h+=`<b>${p.n}</b>`;
  const it=ITEMS[p.id];
  if(it.dur&&p.dur<it.dur){const f=Math.max(0,p.dur/it.dur);h+=`<i style="--f:${f};--c:hsl(${f*120},80%,50%)"></i>`;}
  if(p.enc)h+='<u></u>';
  if(p.id===542&&p.contenido&&p.contenido.length)h+=`<i style="--f:${pesoSaquito(p)/64};--c:#6a7aff"></i>`;
  return h;
}

let ui=null, cursor=null, refsUI=[];
const elUI=document.getElementById('pantallaUI'), elSup=document.getElementById('zonaSuperior'),
  elCursor=document.getElementById('cursorPila'), elPaleta=document.getElementById('paleta');
function refArr(arr,i,extra){return Object.assign({tipo:'normal',get:()=>arr[i],set:v=>{arr[i]=v&&v.n>0?v:null;},acepta:()=>true},extra);}
function refObj(obj,k,extra){return Object.assign({tipo:'normal',get:()=>obj[k],set:v=>{obj[k]=v&&v.n>0?v:null;},acepta:()=>true},extra);}
function crearSlot(cont,ref,grande,fondo){
  const el=document.createElement('div'); el.className='slot'+(grande?' grande':'');
  if(fondo)el.dataset.fondo=fondo;
  el.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();clicSlot(ref,e.button,e.shiftKey);refrescarUI();});
  el.addEventListener('contextmenu',e=>e.preventDefault());
  cont.appendChild(el); refsUI.push({el,ref}); return el;
}
function clicSlot(ref,boton,shift){
  if(ref.armadura&&nivelEnc(ref.get(),'ligamiento')&&supervivencia()){sonar('rompeHerr',null,.3);return;}
  if(ref.tipo==='normal'&&clicSaquito(ref,boton))return;
  if(ref.tipo==='resultado')return clicResultado(shift);
  const s=ref.get();
  if(shift){if(!s)return;ref.set(null);const r=ref.shift(s);if(r)ref.set(r);return;}
  if(ref.tipo==='salida'){
    if(!s)return;
    if(!cursor){cursor=s;ref.set(null);}
    else if(mismaPila(cursor,s)&&cursor.n+s.n<=maxPila(s.id)){cursor.n+=s.n;ref.set(null);}
    if(ref.alTomar)ref.alTomar();
    return;
  }
  const maxRef=ref.max||64;
  if(boton===0){
    if(!cursor){if(s){cursor=s;ref.set(null);}}
    else if(!s){if(ref.acepta(cursor)){if(cursor.n>maxRef){ref.set({...cursor,n:maxRef});cursor.n-=maxRef;}else{ref.set(cursor);cursor=null;}}}
    else if(mismaPila(s,cursor)){const k=Math.min(cursor.n,Math.min(maxRef,maxPila(s.id))-s.n);s.n+=k;cursor.n-=k;if(!cursor.n)cursor=null;ref.set(s);}
    else if(ref.acepta(cursor)&&cursor.n<=maxRef){ref.set(cursor);cursor=s;}
  }else if(boton===2){
    if(!cursor){if(s){const k=Math.ceil(s.n/2);cursor={...s,n:k};s.n-=k;ref.set(s.n?s:null);}}
    else if(!s){if(ref.acepta(cursor)){ref.set({...cursor,n:1});if(--cursor.n<=0)cursor=null;}}
    else if(mismaPila(s,cursor)&&s.n<Math.min(maxRef,maxPila(s.id))){s.n++;ref.set(s);if(--cursor.n<=0)cursor=null;}
  }
}
function resultadoCraft(){
  if(!ui||!ui.craft)return null;
  const r=buscarReceta(ui.craft.map(s=>s?s.id:0),ui.w);
  return r?crearPila(r.id,r.n):null;
}
function consumirCraft(){ui.craft.forEach((s,i)=>{if(s&&--s.n<=0)ui.craft[i]=null;});}
function clicResultado(shift){
  let r=resultadoCraft(); if(!r)return;
  if(shift){for(let v=0;v<64&&r;v++){if(espacioPara(r.id)<r.n)break;insertar(r,inv,IDX_INV);consumirCraft();r=resultadoCraft();}}
  else if(!cursor){cursor=r;consumirCraft();}
  else if(mismaPila(cursor,r)&&cursor.n+r.n<=maxPila(r.id)){cursor.n+=r.n;consumirCraft();}
}
function shiftJugador(i){
  return p=>{
    if(ui.tipo==='cofre')return insertar(p,ui.cofre,rango(0,27));
    if(ui.tipo==='horno'){
      if(FUNDIR[p.id]!==undefined){p=insertarEn(ui.horno,'entrada',p);if(!p)return null;}
      else if(COMBUSTIBLE[p.id]){p=insertarEn(ui.horno,'combustible',p);if(!p)return null;}
    }
    if(ui.tipo==='encantar'){
      if(p.id===I.lapis){p=insertarEn(ui.enc,'lapis',p);if(!p)return null;}
      else if(encantabilidad(p.id)&&!ui.enc.item&&!p.enc){ui.enc.item=p;return null;}
    }
    if(UI_EXTRA[ui.tipo]&&UI_EXTRA[ui.tipo].shift&&i<36){p=UI_EXTRA[ui.tipo].shift(p);if(!p)return null;}
    const a=ITEMS[p.id].armadura;
    if(a&&!inv[36+a.pieza]&&i<36){inv[36+a.pieza]=p;return null;}
    if(i>=36)return insertar(p,inv,IDX_INV);
    return insertar(p,inv,i<9?rango(9,36):rango(0,9));
  };
}
const aJugador=p=>insertar(p,inv,IDX_INV);
function construirUI(){
  refsUI=[]; elSup.innerHTML='';
  const titulo=(t,cont=elSup)=>{const h=document.createElement('h3');h.textContent=t;cont.appendChild(h);};
  const fila=()=>{const d=document.createElement('div');d.className='zonaCraft';elSup.appendChild(d);return d;};
  if(ui.tipo==='inv'){
    titulo('INVENTARIO');
    const z=fila();
    const arm=document.createElement('div');arm.className='columnaArm';
    ['casco','pechera','pantalones','botas'].forEach((n,k)=>crearSlot(arm,refArr(inv,36+k,{armadura:true,acepta:p=>ITEMS[p.id].armadura&&ITEMS[p.id].armadura.pieza===k,max:1,shift:shiftJugador(36+k)}),false,n));
    const perfil=document.createElement('div');perfil.className='perfil';
    perfil.innerHTML=`<div>Nivel <b>${xp.nivel}</b></div><div>Armadura <b>${armaduraTotal().def}</b></div>`;
    z.append(arm,perfil);
    const craft=document.createElement('div');craft.className='zonaCraft';
    const g=document.createElement('div');g.className='rejillaSlots';g.style.gridTemplateColumns='repeat(2,48px)';
    ui.craft.forEach((_,i)=>crearSlot(g,refArr(ui.craft,i,{shift:aJugador})));
    const fl=document.createElement('div');fl.className='flecha';fl.textContent='➜';
    craft.append(g,fl); crearSlot(craft,{tipo:'resultado',get:resultadoCraft},true);
    z.appendChild(craft);
  }else if(ui.tipo==='mesa'){
    titulo('MESA DE TRABAJO');
    const z=fila();
    const g=document.createElement('div');g.className='rejillaSlots';g.style.gridTemplateColumns='repeat(3,48px)';
    ui.craft.forEach((_,i)=>crearSlot(g,refArr(ui.craft,i,{shift:aJugador})));
    const fl=document.createElement('div');fl.className='flecha';fl.textContent='➜';
    z.append(g,fl); crearSlot(z,{tipo:'resultado',get:resultadoCraft},true);
  }else if(ui.tipo==='horno'){
    titulo('HORNO');
    const h=ui.horno, z=fila();
    const col=document.createElement('div');col.className='hornoCol';
    crearSlot(col,refObj(h,'entrada',{shift:aJugador}));
    const fuego=document.createElement('div');fuego.className='progreso fuego';fuego.innerHTML='<i id="barFuego"></i>';col.appendChild(fuego);
    crearSlot(col,refObj(h,'combustible',{shift:aJugador,acepta:p=>!!COMBUSTIBLE[p.id]}));
    const pr=document.createElement('div');pr.className='progreso';pr.innerHTML='<i id="barFundir"></i>';
    z.append(col,pr);
    crearSlot(z,refObj(h,'salida',{tipo:'salida',shift:p=>{soltarXPHorno(h);return aJugador(p);},alTomar:()=>soltarXPHorno(h)}),true);
  }else if(ui.tipo==='cofre'){
    titulo('COFRE');
    const g=document.createElement('div');g.className='rejillaSlots';elSup.appendChild(g);
    ui.cofre.forEach((_,i)=>crearSlot(g,refArr(ui.cofre,i,{shift:aJugador})));
  }else if(ui.tipo==='comercio'){
    const m=ui.aldeano;
    titulo((PROFESIONES[m.profesion]||{nombre:'Aldeano'}).nombre.toUpperCase());
    const lista=document.createElement('div');lista.className='ofertas';lista.id='ofertas';elSup.appendChild(lista);
  }else if(UI_EXTRA[ui.tipo]){UI_EXTRA[ui.tipo].construir(titulo,fila);
  }else if(ui.tipo==='encantar'){
    titulo('MESA DE ENCANTAMIENTOS');
    const z=fila();
    const nl=contarLibrerias(ui.clave);if(nl){const d=document.createElement('div');d.className='pista';d.textContent=`Librerías alrededor: ${nl} de 15`;elSup.insertBefore(d,z);}
    const col=document.createElement('div');col.className='hornoCol';
    crearSlot(col,refObj(ui.enc,'item',{max:1,acepta:p=>encantabilidad(p.id)>0&&!p.enc,shift:aJugador}),false,'objeto');
    crearSlot(col,refObj(ui.enc,'lapis',{acepta:p=>p.id===I.lapis,shift:aJugador}),false,'lapis');
    const ops=document.createElement('div');ops.className='opcionesEnc';ops.id='opcionesEnc';
    z.append(col,ops);
  }
  const gp=document.getElementById('gridPrincipal'), gb=document.getElementById('gridBarra');
  gp.innerHTML='';gb.innerHTML='';
  for(let i=9;i<36;i++)crearSlot(gp,refArr(inv,i,{shift:shiftJugador(i)}));
  for(let i=0;i<9;i++)crearSlot(gb,refArr(inv,i,{shift:shiftJugador(i)}));
  refrescarUI();
}
function soltarXPHorno(h){if(h.xp>=1){soltarXP(Math.floor(h.xp),jugador.pos.x,jugador.pos.y+.5,jugador.pos.z);h.xp-=Math.floor(h.xp);}}
function refrescarUI(){
  if(!ui||ui.tipo==='paleta')return;
  for(const {el,ref} of refsUI){const p=ref.get();el.innerHTML=htmlPila(p);el.dataset.tip=nombrePila(p);el.removeAttribute('title');el.classList.toggle('vacio',!p);}
  elCursor.innerHTML=htmlPila(cursor); elCursor.classList.toggle('oculto',!cursor);
  if(ui.horno){const h=ui.horno;
    document.getElementById('barFuego').style.width=(h.quemaMax?h.quema/h.quemaMax*100:0)+'%';
    document.getElementById('barFundir').style.width=(h.prog/TIEMPO_FUNDIR*100)+'%';}
  if(ui.tipo==='encantar')pintarOpcionesEnc();
  if(ui.tipo==='comercio')pintarOfertas();
  if(UI_EXTRA[ui.tipo]&&UI_EXTRA[ui.tipo].refrescar)UI_EXTRA[ui.tipo].refrescar();
  actualizarHUD();
}
document.addEventListener('mousemove',e=>{if(estado==='ui'){elCursor.style.left=e.clientX+'px';elCursor.style.top=e.clientY+'px';}});

/* ---------- Encantamientos ---------- */
let semillaEnc=Math.floor(Math.random()*1e9);
function contarLibrerias(clave){
  if(!clave)return 0;
  const [x,y,z]=clave.split(':')[1].split(',').map(Number);let n=0;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){if(Math.max(Math.abs(dx),Math.abs(dz))!==2)continue;
    for(let dy=0;dy<=1;dy++){const mx=Math.sign(dx),mz=Math.sign(dz);
      if(getBloque(x+dx,y+dy,z+dz)===B.estanteria&&!getBloque(x+(Math.abs(dx)===2?mx:0),y+dy,z+(Math.abs(dz)===2?mz:0)))n++;}}
  return Math.min(15,n);
}
function opcionesEncantar(p){
  const r=mulberry32(semillaEnc^(p.id*7919));
  const libs=contarLibrerias(ui&&ui.clave);
  const b=1+Math.floor(r()*8)+Math.floor(libs/2)+Math.floor(r()*(libs+1));
  const costes=[Math.max(1,Math.floor(b/3)),Math.floor(b*2/3)+1,Math.max(b,libs*2)];
  return costes.map((c,i)=>({coste:c,lapis:i+1,niveles:i+1,enc:generarEncantos(p.id,c,r)}));
}
function generarEncantos(id,coste,r){
  const cats=categoriasItem(id), e=encantabilidad(id);
  let poder=coste+1+Math.floor(r()*(e/4+1))+Math.floor(r()*(e/4+1));
  const posibles=Object.keys(ENCANTOS).filter(k=>!ENCANTOS[k].tesoro&&!ENCANTOS[k].maldicion&&(cats.includes('libro')||ENCANTOS[k].para.some(c=>cats.includes(c))));
  const res={};
  if(!posibles.length)return res;
  let intentos=0;
  do{
    const lista=posibles.filter(k=>!res[k]&&!Object.keys(res).some(o=>conflictoEnc(o,k)));
    if(!lista.length)break;
    const k=lista[Math.floor(r()*lista.length)], def=ENCANTOS[k];
    res[k]=clamp(Math.ceil(poder/(30/def.max)),1,def.max);
    poder=Math.floor(poder/2);
  }while(r()<(poder+1)/50&&++intentos<4);
  return res;
}
function pintarOpcionesEnc(){
  const cont=document.getElementById('opcionesEnc'); if(!cont)return;
  const p=ui.enc.item; cont.innerHTML='';
  if(!p){cont.innerHTML='<div class="pista">Coloca una herramienta, arma o armadura y lapislázuli.</div>';return;}
  const ops=opcionesEncantar(p), lapis=ui.enc.lapis?ui.enc.lapis.n:0;
  ops.forEach(o=>{
    const b=document.createElement('button');b.className='opcionEnc';
    const k=Object.keys(o.enc)[0];
    const puede=(xp.nivel>=o.coste&&lapis>=o.lapis)||!supervivencia();
    b.disabled=!puede;
    b.innerHTML=`<span>${k?ENCANTOS[k].nombre+' '+ROMANOS[o.enc[k]]+(Object.keys(o.enc).length>1?' …':''):'—'}</span><em>Nivel ${o.coste} · ${o.lapis} lapislázuli</em>`;
    b.onmousedown=e=>{e.preventDefault();e.stopPropagation();if(!puede||!k)return;
      p.enc=o.enc; if(p.id===248)p.id=546; if(supervivencia()){ui.enc.lapis.n-=o.lapis;if(ui.enc.lapis.n<=0)ui.enc.lapis=null;gastarNiveles(o.niveles);}
      semillaEnc=Math.floor(Math.random()*1e9); sonar('encantar'); refrescarUI();};
    cont.appendChild(b);
  });
}

/* ---------- Comercio con aldeanos ---------- */
function contarEnInv(id){let n=0;for(let i=0;i<36;i++)if(inv[i]&&inv[i].id===id)n+=inv[i].n;return n;}
function quitarDeInv(id,n){for(let i=0;i<36&&n>0;i++){const p=inv[i];if(p&&p.id===id){const k=Math.min(n,p.n);p.n-=k;n-=k;if(!p.n)inv[i]=null;}}}
function pintarOfertas(){
  const cont=document.getElementById('ofertas'); if(!cont)return;
  cont.innerHTML='';
  for(const o of ui.aldeano.ofertas||[]){
    const agotada=o.usos>=o.max, tiene=contarEnInv(o.costo[0])>=o.costo[1];
    const b=document.createElement('button');b.className='oferta';b.disabled=agotada||!tiene;
    b.innerHTML=`<span class="pila"><img src="${ICONOS[o.costo[0]]}" alt=""><b>${o.costo[1]}</b></span><span class="flechita">➜</span>`+
      `<span class="pila"><img src="${ICONOS[o.da[0]]}" alt=""><b>${o.da[1]>1?o.da[1]:''}</b></span><em>${agotada?'Agotado':ITEMS[o.da[0]].nombre}</em>`;
    b.title=`${o.costo[1]} × ${ITEMS[o.costo[0]].nombre} por ${o.da[1]} × ${ITEMS[o.da[0]].nombre}`;
    b.onmousedown=e=>{e.preventDefault();e.stopPropagation();
      if(agotada||contarEnInv(o.costo[0])<o.costo[1])return;
      quitarDeInv(o.costo[0],o.costo[1]);
      let n=o.da[1];while(n>0){const k=Math.min(n,maxPila(o.da[0]));n-=k;const r=insertar(crearPila(o.da[0],k),inv,IDX_INV);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}
      o.usos++; soltarXP(azar(1,3),ui.aldeano.pos.x,ui.aldeano.pos.y+1,ui.aldeano.pos.z); sonar('aldeano',ui.aldeano.pos); refrescarUI();};
    cont.appendChild(b);
  }
}
/* ---------- Abrir y cerrar ---------- */
function abrirUI(tipo,pos,extra){
  if(estado!=='jugando')return;
  ui={tipo};
  if(extra)Object.assign(ui,extra);
  if(pos)ui.clave=claveCont(pos.x,pos.y,pos.z);
  if(tipo==='inv'){ui.w=2;ui.craft=new Array(4).fill(null);}
  else if(tipo==='mesa'){ui.w=3;ui.craft=new Array(9).fill(null);}
  else if(tipo==='horno')ui.horno=obtenerHorno(ui.clave);
  else if(tipo==='cofre')ui.cofre=obtenerCofre(ui.clave);
  else if(tipo==='encantar')ui.enc={item:null,lapis:null};
  else if(UI_EXTRA[tipo])UI_EXTRA[tipo].abrir(ui);
  estado='ui'; soltarControles();
  if(tipo==='paleta'){elPaleta.classList.remove('oculto');const b=document.getElementById('buscarPaleta');b.value='';filtrarPaleta('');setTimeout(()=>b.focus(),50);}
  else{construirUI();elUI.classList.remove('oculto');}
  if(document.pointerLockElement)document.exitPointerLock();
}
function cerrarUI(){
  if(!ui)return;
  const devolver=p=>{if(!p)return;const r=insertar(p,inv,IDX_INV);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z,true);};
  if(ui.craft)ui.craft.forEach(devolver);
  if(ui.enc){devolver(ui.enc.item);devolver(ui.enc.lapis);}
  if(UI_EXTRA[ui.tipo]&&UI_EXTRA[ui.tipo].cerrar)UI_EXTRA[ui.tipo].cerrar(ui,devolver);
  devolver(cursor); cursor=null;
  ui=null; elUI.classList.add('oculto'); elPaleta.classList.add('oculto'); elCursor.classList.add('oculto');
  actualizarHUD(); guardarPartida();
  if(estado==='ui')empezar();
}

/* ---------- Paleta del modo creativo ---------- */
const rejillaPaleta=document.getElementById('rejillaPaleta');
const celdasPaleta=[];
ITEMS.forEach((it,i)=>{if(!it)return;const d=document.createElement('div');d.className='celda';d.dataset.id=i;d.dataset.tip=it.nombre;
  d.innerHTML=`<img src="${ICONOS[i]}" alt=""><span>${it.nombre}</span>`;
  d.onmousedown=e=>{e.preventDefault();const p=crearPila(i,e.button===2?1:maxPila(i));
    if(e.shiftKey){insertarInv(p);sonar('recoger');}else{inv[ranura]=p;actualizarHUD();cerrarUI();}};
  d.oncontextmenu=e=>e.preventDefault();
  rejillaPaleta.appendChild(d);celdasPaleta.push([d,it.nombre.toLowerCase()]);});
let pestanaPaleta='todo';
function filtrarPaleta(t){t=(t??document.getElementById('buscarPaleta').value).toLowerCase().trim();for(const [d,n] of celdasPaleta)d.classList.toggle('oculto',(!!t&&!n.includes(t))||(!t&&pestanaPaleta!=='todo'&&d.dataset.cat!==pestanaPaleta));}
document.getElementById('buscarPaleta').addEventListener('input',e=>filtrarPaleta(e.target.value));
document.getElementById('buscarPaleta').addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='Escape')cerrarUI();});
document.getElementById('btnCerrarPaleta').onclick=cerrarUI;
