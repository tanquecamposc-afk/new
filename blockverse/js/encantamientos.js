"use strict";
/* =========================================================
   Encantamientos como en el original (Java 1.21): cada
   encantamiento tiene su peso y su rango de poder, la mesa
   calcula los tres costes con las librerías, muestra la
   pista "Filo III . . . ?" en alfabeto galáctico y gasta
   1-3 niveles y lapislázuli. El libro flota sobre la mesa,
   se abre y mira al jugador, y de las librerías salen runas.
   Además: afiladora, yunque con penalización por uso previo,
   libros encantados de los bibliotecarios, ballesta (carga
   rápida, multidisparo, perforación), tridente (lealtad,
   conductividad, propulsión acuática, empalamiento), caña de
   pescar (suerte marina, atracción) y el ahogado.
   ========================================================= */
Object.assign(SND,{
  ballestaCarga:v=>{ruidoSnd(.18,1800,.12*v,'bandpass');tonoSnd(300,420,.18,'triangle',.03*v);},
  ballestaLista:v=>{ruidoSnd(.06,3200,.2*v,'highpass');tonoSnd(900,700,.06,'square',.04*v);},
  ballesta:v=>{ruidoSnd(.1,2800,.28*v,'bandpass');tonoSnd(500,200,.08,'square',.05*v);},
  tridente:v=>{ruidoSnd(.25,1500,.2*v,'bandpass');tonoSnd(700,300,.25,'sine',.05*v);},
  tridenteGolpe:v=>{ruidoSnd(.1,2600,.25*v,'highpass');tonoSnd(260,120,.12,'square',.06*v);},
  tridenteVuelve:v=>{tonoSnd(400,900,.4,'sine',.06*v);tonoSnd(600,1200,.4,'triangle',.03*v,.1);},
  impulso:v=>{ruidoSnd(.6,700,.3*v,'bandpass');tonoSnd(200,600,.5,'sine',.08*v);},
  lanzarCana:v=>ruidoSnd(.15,3500,.15*v,'highpass'),
  recogerCana:v=>{ruidoSnd(.12,1200,.15*v,'bandpass');tonoSnd(500,700,.08,'triangle',.03*v);},
  pica:v=>{ruidoSnd(.25,900,.3*v,'bandpass');tonoSnd(300,160,.15,'sine',.05*v);},
  afiladora:v=>{ruidoSnd(.45,2200,.18*v,'bandpass');tonoSnd(180,140,.4,'sawtooth',.03*v);},
  pagina:v=>ruidoSnd(.12,4200,.06*v,'highpass'),
});

/* ---------- Encantamientos que faltaban ---------- */
Object.assign(ENCANTOS,{
  cargaRapida:{nombre:'Carga rápida',max:3,para:['ballesta']},
  multidisparo:{nombre:'Multidisparo',max:1,para:['ballesta'],excluye:'perforacion'},
  perforacion:{nombre:'Perforación',max:4,para:['ballesta'],excluye:'multidisparo'},
  lealtad:{nombre:'Lealtad',max:3,para:['tridente'],excluye:'impulso'},
  canalizacion:{nombre:'Conductividad',max:1,para:['tridente'],excluye:'impulso'},
  impulso:{nombre:'Propulsión acuática',max:3,para:['tridente'],excluye:['lealtad','canalizacion']},
  empalamiento:{nombre:'Empalamiento',max:5,para:['tridente']},
  suerteMarina:{nombre:'Suerte marina',max:3,para:['cana']},
  atraccion:{nombre:'Atracción',max:3,para:['cana']},
  brecha:{nombre:'Brecha',max:4,para:['maza'],excluye:['densidad','castigo','perdicion']},
  estocada:{nombre:'Embestida',max:3,para:['lanza']},
});
ENCANTOS.densidad.excluye=['brecha','castigo','perdicion'];
ENCANTOS.infinidad.excluye='reparacion';
ENCANTOS.pasoHelado.excluye='agilidadAcuatica';
{ // qué objetos admite cada encantamiento (mesa o yunque)
  const mas=(k,...c)=>{for(const x of c)if(!ENCANTOS[k].para.includes(x))ENCANTOS[k].para.push(x);};
  mas('filo','lanza'); mas('castigo','lanza','maza'); mas('perdicion','lanza','maza');
  mas('retroceso','lanza'); mas('aspectoIgneo','lanza','maza'); mas('botin','lanza');
  mas('irrompibilidad','ballesta','tridente','cana','escudo','maza','lanza','elitros');
  mas('reparacion','ballesta','tridente','cana','escudo','lanza');
  mas('desaparicion','ballesta','tridente','cana','escudo','lanza','elitros');
}
// Encantamientos que la mesa no pone en ciertos objetos (solo con el yunque)
const SOLO_YUNQUE={filo:['hacha'],castigo:['hacha','maza'],perdicion:['hacha','maza'],aspectoIgneo:['maza'],
  espinas:['casco','pantalones','botas']};

/* ---------- Peso y rango de poder de cada nivel (valores del original) ----------
   [peso, mínimo base, mínimo por nivel, máximo base, máximo por nivel] */
const PODER={
  proteccion:[10,1,11,12,11], protFuego:[5,10,8,18,8], caidaPluma:[5,5,6,11,6], protExplosion:[2,5,8,13,8],
  protProyectiles:[5,3,6,9,6], respiracion:[2,10,10,40,10], afinidadAcuatica:[2,1,0,41,0], espinas:[1,10,20,60,20],
  agilidadAcuatica:[2,10,10,25,10], pasoHelado:[2,10,10,25,10], ligamiento:[1,25,0,50,0], velocidadAlmas:[1,10,10,25,10],
  sigilo:[1,25,25,75,25], filo:[10,1,11,21,11], castigo:[5,5,8,25,8], perdicion:[5,5,8,25,8], retroceso:[5,5,20,55,20],
  aspectoIgneo:[2,10,20,60,20], botin:[2,15,9,65,9], barrido:[2,5,9,20,9], eficiencia:[10,1,10,51,10],
  toqueSeda:[1,15,0,65,0], irrompibilidad:[5,5,8,55,8], fortuna:[2,15,9,65,9], poder:[10,1,10,16,10],
  impacto:[2,12,20,37,20], llama:[2,20,0,50,0], infinidad:[1,20,0,50,0], suerteMarina:[2,15,9,65,9],
  atraccion:[2,15,9,65,9], lealtad:[5,12,7,50,0], empalamiento:[2,1,8,21,8], impulso:[2,17,7,50,0],
  canalizacion:[1,25,0,50,0], multidisparo:[2,20,0,50,0], cargaRapida:[5,12,20,50,0], perforacion:[10,1,10,50,0],
  densidad:[5,5,8,25,8], brecha:[2,15,9,65,9], rafaga:[2,15,9,65,9], reparacion:[2,25,25,75,25],
  desaparicion:[1,25,0,50,0], estocada:[5,5,8,25,8],
};
const pesoEnc=k=>(PODER[k]||[1])[0];
const costeMinEnc=(k,l)=>{const p=PODER[k]||[1,1,10,50,10];return p[1]+p[2]*(l-1);};
const costeMaxEnc=(k,l)=>{const p=PODER[k]||[1,1,10,50,10];return p[3]+p[4]*(l-1);};
const multRareza=k=>({10:1,5:2,2:4,1:8})[pesoEnc(k)]||8;

function admiteEnMesa(k,id){
  const d=ENCANTOS[k]; if(!d||d.tesoro||d.maldicion)return false;
  const cats=categoriasItem(id);
  if(cats.includes('libro'))return true;
  if(!d.para.some(c=>cats.includes(c)))return false;
  if(SOLO_YUNQUE[k]&&SOLO_YUNQUE[k].some(c=>cats.includes(c)))return false;
  if(k==='espinas'&&!(ITEMS[id].armadura&&ITEMS[id].armadura.pieza===1))return false;
  return true;
}
function elegirPorPeso(lista,r){
  let t=0; for(const o of lista)t+=pesoEnc(o.k);
  let x=Math.floor(r()*t);
  for(const o of lista){x-=pesoEnc(o.k);if(x<0)return o;}
  return lista[lista.length-1];
}
// Lista de encantamientos posibles para un poder (el nivel más alto que cae dentro de su rango)
function encantosDisponibles(id,poder,tesoro){
  const res=[], cats=categoriasItem(id);
  for(const k in ENCANTOS){
    const d=ENCANTOS[k];
    if(tesoro){if(d.maldicion||(k==='velocidadAlmas'||k==='sigilo'||k==='rafaga'))continue;
      if(!cats.includes('libro')&&!d.para.some(c=>cats.includes(c)))continue;}
    else if(!admiteEnMesa(k,id))continue;
    for(let l=d.max;l>=1;l--)if(poder>=costeMinEnc(k,l)&&poder<=costeMaxEnc(k,l)){res.push({k,l});break;}
  }
  return res;
}
// Algoritmo del original: poder modificado por la encantabilidad y un ±15 % al azar
function elegirEncantos(id,nivel,r,tesoro){
  const e=Math.max(1,encantabilidad(id)||1);
  let poder=nivel+1+Math.floor(r()*(Math.floor(e/4)+1))+Math.floor(r()*(Math.floor(e/4)+1));
  const f=(r()+r()-1)*.15;
  poder=Math.max(1,Math.round(poder+poder*f));
  let lista=encantosDisponibles(id,poder,tesoro);
  const res=[];
  if(!lista.length)return res;
  res.push(elegirPorPeso(lista,r));
  while(Math.floor(r()*50)<=poder){
    lista=lista.filter(o=>!res.some(x=>x.k===o.k||conflictoEnc(x.k,o.k)));
    if(!lista.length)break;
    res.push(elegirPorPeso(lista,r));
    poder=Math.floor(poder/2);
  }
  return res;
}
const aObjetoEnc=lista=>{const o={};for(const {k,l} of lista)o[k]=l;return o;};

/* ---------- La mesa de encantamientos ---------- */
opcionesEncantar=function(p){
  const libs=contarLibrerias(ui&&ui.clave), e=encantabilidad(p.id);
  if(!e)return [];
  const r=mulberry32(semillaEnc);
  const base=1+Math.floor(r()*8)+(libs>>1)+Math.floor(r()*(libs+1));
  const costes=[Math.max(Math.floor(base/3),1),Math.floor(base*2/3)+1,Math.max(base,libs*2)];
  return costes.map((c,i)=>{
    if(c<i+1)return null;
    const rr=mulberry32((semillaEnc+i*7919)>>>0);
    let lista=elegirEncantos(p.id,c,rr,false);
    if((p.id===248)&&lista.length>1)lista.splice(Math.floor(rr()*lista.length),1);
    const pista=lista.length?lista[Math.floor(mulberry32((semillaEnc^(i+1)*104729)>>>0)()*lista.length)]:null;
    return {coste:c,lapis:i+1,niveles:i+1,enc:aObjetoEnc(lista),pista};
  });
};
generarEncantos=function(id,coste,r){return aObjetoEnc(elegirEncantos(id,coste,r,false));};
libroAleatorio=function(rnd){  // libros de los cofres: nivel 30 con encantamientos de tesoro
  const l=elegirEncantos(248,5+Math.floor(rnd()*26),rnd,true);
  return l.length?aObjetoEnc(l):{irrompibilidad:1};
};

// Texto en alfabeto galáctico estándar (como las runas de la mesa)
const SGA={a:'ᔑ',b:'ʖ',c:'ᓵ',d:'↸',e:'ᒷ',f:'⎓',g:'⊣',h:'⍑',i:'╎',j:'⋮',k:'ꖌ',l:'ꖎ',m:'ᒲ',n:'リ',o:'フ',p:'¡',q:'ᑑ',r:'∷',s:'ᓭ',t:'ℸ',u:'⚍',v:'⍊',w:'∴',x:'/',y:'‖',z:'⨅'};
const PALABRAS_ENC='the elder scrolls klaatu berata niktu xyzzy bless curse light darkness fire air earth water hot dry cold wet ignite snuff embiggen twist shorten stretch fiddle destroy imbue galvanize enchant free limited range of towards inside sphere cube self other ball mental physical grow shrink demon elemental spirit animal creature beast humanoid undead fresh stale phnglui mglwnafh cthulhu rlyeh wgahnagl fhtagn baguette'.split(' ');
function textoGalactico(seed){
  const r=mulberry32(seed>>>0), n=3+Math.floor(r()*2), pal=[];
  for(let i=0;i<n;i++)pal.push(PALABRAS_ENC[Math.floor(r()*PALABRAS_ENC.length)]);
  return pal.join(' ').replace(/[a-z]/g,c=>SGA[c]);
}
pintarOpcionesEnc=function(){
  const cont=document.getElementById('opcionesEnc'); if(!cont)return;
  const p=ui.enc.item; cont.innerHTML='';
  const lapis=ui.enc.lapis?ui.enc.lapis.n:0;
  const ops=p&&!p.enc?opcionesEncantar(p):[null,null,null];
  ops.forEach((o,i)=>{
    const b=document.createElement('button');b.className='opcionEnc';
    if(!o){b.disabled=true;b.classList.add('vacia');cont.appendChild(b);return;}
    const tieneNivel=xp.nivel>=o.coste, puede=!supervivencia()||(tieneNivel&&lapis>=o.lapis);
    b.disabled=!puede;
    b.innerHTML=`<span class="lapisEnc n${i+1}">${i+1}</span><span class="runas">${textoGalactico(semillaEnc+i*31)}</span><b class="costeEnc">${o.coste}</b>`;
    const pista=o.pista?`${ENCANTOS[o.pista.k].nombre} ${ROMANOS[o.pista.l]} . . . ?`:'';
    let req='';
    if(supervivencia()){
      if(!tieneNivel)req=`\nNivel de experiencia necesario: ${o.coste}`;
      else req=`\n${o.lapis} lapislázuli${lapis<o.lapis?' (te falta)':''}\n${o.niveles} ${o.niveles>1?'niveles':'nivel'} de experiencia`;
    }
    b.dataset.tip=pista+req;
    b.onmousedown=e=>{e.preventDefault();e.stopPropagation();if(!puede||!Object.keys(o.enc).length)return;
      p.enc={...o.enc}; if(p.id===248)p.id=546;
      if(supervivencia()){ui.enc.lapis.n-=o.lapis;if(ui.enc.lapis.n<=0)ui.enc.lapis=null;gastarNiveles(o.niveles);}
      semillaEnc=Math.floor(Math.random()*1e9); sonar('encantar'); refrescarUI();};
    cont.appendChild(b);
  });
  if(!p){const d=document.createElement('div');d.className='pista';d.textContent='Coloca un objeto encantable y lapislázuli.';cont.appendChild(d);}
};
{ // aspecto de los botones como en el original
  const s=document.createElement('style');
  s.textContent=`
.opcionEnc{flex-direction:row!important;align-items:center;gap:8px!important;min-height:40px;padding:4px 8px!important;
  background:#c9b58e!important;box-shadow:inset 2px 2px 0 #e6d7b4,inset -2px -2px 0 #85724f!important;border-radius:0!important;color:#685e4a;}
.opcionEnc:not(:disabled):hover{background:#dccb9f!important;color:#ffff80;}
.opcionEnc:disabled{opacity:1!important;background:#6f6353!important;box-shadow:inset 2px 2px 0 #857865,inset -2px -2px 0 #4a4136!important;color:#3a3226;}
.opcionEnc.vacia{min-height:40px;}
.opcionEnc .runas{flex:1;font:13px/1.25 serif;letter-spacing:1px;text-align:left;overflow:hidden;max-height:34px;}
.opcionEnc .costeEnc{font:16px var(--pixel,monospace);color:#80ff20;text-shadow:2px 2px 0 #203f08;align-self:flex-end;}
.opcionEnc:disabled .costeEnc{color:#407f10;text-shadow:none;}
.lapisEnc{width:22px;height:22px;flex:none;display:grid;place-items:center;font:12px var(--pixel,monospace);color:#fff;
  background:#2c4fb8;box-shadow:inset 2px 2px 0 #5a7fe0,inset -2px -2px 0 #16296a;text-shadow:1px 1px 0 #000;}
.opcionEnc:disabled .lapisEnc{background:#3a4258;box-shadow:none;color:#8a8a8a;}
.pista.xpAf{color:#80ff20;}`;
  document.head.appendChild(s);
}

/* ---------- Libro flotante y runas de las librerías ---------- */
const mesasEnc=new Map();
let escanearMesasT=0;
const matTapa=new THREE.MeshLambertMaterial({color:0x7a3b1e}), matHoja=new THREE.MeshLambertMaterial({color:0xf2ead2});
function crearLibroMesa(){
  const raiz=new THREE.Group(), cuerpo=new THREE.Group(); raiz.add(cuerpo); cuerpo.rotation.x=-.35;
  const W=.3,H=.4, tapas=[], hojas=[];
  [-1,1].forEach(s=>{
    const piv=new THREE.Group(); cuerpo.add(piv);
    const t=new THREE.Mesh(new THREE.BoxGeometry(W,H,.025),matTapa); t.position.set(s*W/2,0,-.02); piv.add(t);
    const h=new THREE.Mesh(new THREE.BoxGeometry(W*.9,H*.9,.05),matHoja); h.position.set(s*W*.46,0,.02); piv.add(h);
    piv.userData.s=s; tapas.push(piv);
  });
  const lomo=new THREE.Mesh(new THREE.BoxGeometry(.04,H,.06),matTapa); lomo.position.z=-.01; cuerpo.add(lomo);
  const pag=new THREE.Group(); cuerpo.add(pag);
  const pm=new THREE.Mesh(new THREE.PlaneGeometry(W*.88,H*.86),new THREE.MeshLambertMaterial({color:0xfaf3dc,side:THREE.DoubleSide}));
  pm.position.x=W*.44; pag.add(pm); hojas.push(pag);
  escena.add(raiz);
  return {raiz,tapas,hojas,abierto:0,giro:Math.random()*6,pagina:0,libs:[]};
}
function libreriasDeMesa(x,y,z){
  const res=[];
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){if(Math.max(Math.abs(dx),Math.abs(dz))!==2)continue;
    for(let dy=0;dy<=1;dy++){const mx=Math.sign(dx),mz=Math.sign(dz);
      if(getBloque(x+dx,y+dy,z+dz)===B.estanteria&&!getBloque(x+(Math.abs(dx)===2?mx:0),y+dy,z+(Math.abs(dz)===2?mz:0)))res.push([x+dx,y+dy,z+dz]);}}
  return res;
}
function escanearMesas(){
  const j=jugador.pos, px=Math.floor(j.x), py=Math.floor(j.y), pz=Math.floor(j.z), vistas=new Set();
  for(let x=px-10;x<=px+10;x++)for(let z=pz-10;z<=pz+10;z++)for(let y=py-5;y<=py+5;y++){
    if(getBloqueSiCargado(x,y,z)!==B.mesaEncantar)continue;
    const k=x+','+y+','+z; vistas.add(k);
    let m=mesasEnc.get(k); if(!m){m=crearLibroMesa();m.x=x;m.y=y;m.z=z;mesasEnc.set(k,m);}
    m.libs=libreriasDeMesa(x,y,z);
  }
  for(const [k,m] of mesasEnc)if(!vistas.has(k)){escena.remove(m.raiz);mesasEnc.delete(k);}
}
// Runas pixeladas que vuelan de las librerías al libro
const texRunas=[...Array(12)].map((_,i)=>{
  const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d'),r=mulberry32(900+i);
  x.fillStyle='#fff';
  for(let yy=1;yy<7;yy++)for(let xx=1;xx<7;xx++)if(r()<.38)x.fillRect(xx,yy,1,1);
  x.fillRect(1+Math.floor(r()*5),1,1,5);
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;return t;});
const runas=[];
function lanzarRuna(desde,hasta){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texRunas[Math.floor(Math.random()*texRunas.length)],color:0xd8c8ff,transparent:true,fog:false,depthWrite:false}));
  s.scale.setScalar(.14); escena.add(s);
  runas.push({s,a:desde,b:hasta,t:0,d:1+Math.random()*.6,alto:.6+Math.random()*.8});
}
function actualizarMesasEnc(dt){
  escanearMesasT-=dt; if(escanearMesasT<=0){escanearMesasT=1;escanearMesas();}
  const j=jugador.pos;
  for(const m of mesasEnc.values()){
    const cx=m.x+.5, cy=m.y+.75, cz=m.z+.5, dx=j.x-cx, dz=j.z-cz, d=Math.hypot(dx,dz)+Math.abs(j.y-m.y)*.5;
    const cerca=d<3.2&&estado!=='menu';
    m.abierto+=((cerca?1:0)-m.abierto)*Math.min(1,dt*3);
    const obj=cerca?Math.atan2(dx,dz):m.giro+dt*.4;
    const g=((obj-m.giro+Math.PI*3)%(Math.PI*2))-Math.PI; m.giro+=g*Math.min(1,dt*(cerca?4:.6));
    m.raiz.position.set(cx,cy+.42+Math.sin(tiempoJuego*1.6+m.x)*.05,cz);
    m.raiz.rotation.y=m.giro;
    const cierre=(1-m.abierto)*Math.PI/2*.96;
    m.tapas.forEach(t=>t.rotation.y=-t.userData.s*cierre);
    // Pasar páginas mientras está abierto
    if(m.abierto>.6){m.pagina+=dt*(ui&&ui.tipo==='encantar'?1.4:.5);}
    const f=(m.pagina%1);
    m.hojas[0].rotation.y=-cierre*.5-(m.abierto>.6?f*Math.PI*.9:0);
    m.hojas[0].visible=m.abierto>.3;
    if(cerca&&m.libs.length&&Math.random()<dt*Math.min(6,m.libs.length*.5)){
      const [lx,ly,lz]=m.libs[Math.floor(Math.random()*m.libs.length)];
      lanzarRuna(new THREE.Vector3(lx+.5,ly+.9+Math.random()*.4,lz+.5),new THREE.Vector3(cx,cy+.5,cz));
    }
  }
  for(let i=runas.length-1;i>=0;i--){const r=runas[i];r.t+=dt/r.d;
    if(r.t>=1){escena.remove(r.s);r.s.material.dispose();runas.splice(i,1);continue;}
    const t=r.t, e=1-Math.pow(1-t,2);
    r.s.position.lerpVectors(r.a,r.b,e); r.s.position.y+=Math.sin(t*Math.PI)*r.alto;
    r.s.material.opacity=t<.1?t*10:t>.8?(1-t)*5:1;}
}

/* ---------- Afiladora ---------- */
const soloMaldiciones=enc=>{if(!enc)return undefined;const o={};for(const k in enc)if(ENCANTOS[k].maldicion)o[k]=enc[k];return Object.keys(o).length?o:undefined;};
const xpDeEncantos=enc=>{let s=0;if(enc)for(const k in enc)if(!ENCANTOS[k].maldicion)s+=costeMinEnc(k,enc[k]);return s;};
function resultadoAfiladora(a,b){
  if(a&&b){
    if(a.id!==b.id||!ITEMS[a.id].dur||a.id===546)return null;
    const it=ITEMS[a.id], dur=Math.min(it.dur,a.dur+b.dur+Math.floor(it.dur*.05));
    const enc=Object.assign({},soloMaldiciones(b.enc),soloMaldiciones(a.enc));
    return {pila:{id:a.id,n:1,dur,enc:Object.keys(enc).length?enc:undefined},xp:xpDeEncantos(a.enc)+xpDeEncantos(b.enc)};
  }
  const p=a||b; if(!p||!p.enc)return null;
  const quedan=soloMaldiciones(p.enc);
  if(quedan&&Object.keys(quedan).length===Object.keys(p.enc).length)return null;
  const out={...p,enc:quedan}; delete out.rep;
  if(p.id===546&&!quedan){out.id=248;delete out.enc;}
  return {pila:out,xp:xpDeEncantos(p.enc)};
}
const aceptaAfiladora=p=>!!ITEMS[p.id].dur||p.id===546||!!p.enc;
UI_EXTRA.afiladora={
  abrir(u){u.afil={a:null,b:null};},
  construir(titulo,fila){
    titulo('REPARAR Y DESENCANTAR');
    const z=fila(), h=ui.afil;
    const col=document.createElement('div');col.className='hornoCol';
    crearSlot(col,refObj(h,'a',{max:1,acepta:aceptaAfiladora,shift:aJugador}));
    crearSlot(col,refObj(h,'b',{max:1,acepta:aceptaAfiladora,shift:aJugador}));
    z.appendChild(col);
    const fl=document.createElement('div');fl.className='flecha';fl.textContent='➜';z.appendChild(fl);
    const tomar=()=>{const r=resultadoAfiladora(h.a,h.b);if(!r)return;
      h.a=null;h.b=null;
      if(r.xp>0){const v=Math.ceil(r.xp/2),t=v+Math.floor(Math.random()*v);soltarXP(t,jugador.pos.x,jugador.pos.y+.5,jugador.pos.z);}
      sonar('afiladora');};
    crearSlot(z,{tipo:'salida',get:()=>{const r=resultadoAfiladora(h.a,h.b);return r?r.pila:null;},
      set:v=>{if(v)return;tomar();},
      shift:p=>{const r=aJugador(p);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);return null;},
      acepta:()=>false},true);
    const c=document.createElement('div');c.className='pista';c.id='pistaAfil';elSup.appendChild(c);
  },
  refrescar(){
    const c=document.getElementById('pistaAfil'); if(!c)return;
    const h=ui.afil, r=resultadoAfiladora(h.a,h.b);
    c.textContent=r?(r.xp?'Quita los encantamientos (no las maldiciones) y devuelve experiencia.':'Une dos objetos iguales: suma su durabilidad y un 5 % extra.')
      :'Pon un objeto encantado o dos objetos iguales dañados.';
  },
  shift(p){const h=ui.afil;if(!aceptaAfiladora(p))return p;if(!h.a){h.a=p;return null;}if(!h.b){h.b=p;return null;}return p;},
  cerrar(u,devolver){devolver(u.afil.a);devolver(u.afil.b);},
};

/* ---------- Yunque como en el original ---------- */
const _materialReparacionBase=materialReparacion;
materialReparacion=function(id){
  if(id===597)return B.tablones;
  if(id===611||id===612||id===613)return 0;
  return _materialReparacionBase(id);
};
resultadoYunque=function(a,b){
  if(!a||!b)return null;
  const it=ITEMS[a.id]; if(!it.dur&&a.id!==546)return null;
  const out={...a,enc:a.enc?{...a.enc}:undefined};
  const penal=(1<<(a.rep||0))-1+(1<<(b.rep||0))-1;
  let coste=0, cambia=false, usa=1;
  if(it.dur&&b.id===materialReparacion(a.id)){
    if(a.dur>=it.dur)return null;
    const q=Math.max(1,Math.floor(it.dur/4));
    usa=Math.min(b.n,Math.ceil((it.dur-a.dur)/q));
    out.dur=Math.min(it.dur,a.dur+q*usa); coste=usa; cambia=true;
  }else{
    if(b.id!==a.id&&b.id!==546)return null;
    if(it.dur&&b.id===a.id&&a.dur<it.dur){out.dur=Math.min(it.dur,a.dur+b.dur+Math.floor(it.dur*.12));coste+=2;cambia=true;}
    if(b.enc){
      out.enc=out.enc||{};
      const cats=categoriasItem(a.id), libro=b.id===546;
      for(const k in b.enc){
        const vale=a.id===546||ENCANTOS[k].para.some(c=>cats.includes(c));
        const choca=Object.keys(out.enc).some(o=>o!==k&&conflictoEnc(o,k));
        if(!vale||choca){coste+=1;continue;}
        const act=out.enc[k]||0, nv=act===b.enc[k]?Math.min(ENCANTOS[k].max,act+1):Math.max(act,b.enc[k]);
        if(nv!==act){out.enc[k]=nv;cambia=true;}
        coste+=nv*Math.max(1,libro?multRareza(k)/2:multRareza(k));
      }
      if(!Object.keys(out.enc).length)out.enc=undefined;
    }
  }
  if(!cambia)return null;
  out.rep=Math.max(a.rep||0,b.rep||0)+1;
  return {pila:out,coste:coste+penal,usa};
};

/* ---------- Libros encantados de los bibliotecarios ---------- */
const _ofertasProfesionBase=ofertasProfesion;
ofertasProfesion=function(pr,r){
  const lista=_ofertasProfesionBase(pr,r);
  if(pr==='bibliotecario'){
    const ks=Object.keys(ENCANTOS).filter(k=>!['velocidadAlmas','sigilo','rafaga'].includes(k));
    for(let n=0;n<1+(r()<.5?1:0);n++){
      const k=ks[Math.floor(r()*ks.length)], l=1+Math.floor(r()*ENCANTOS[k].max);
      let precio=2+Math.floor(r()*(5+l*10))+3*l; if(ENCANTOS[k].tesoro)precio*=2;
      lista.push({costo:[I.esmeralda,Math.min(64,precio)],costo2:[I.libro,1],da:[546,1],enc:{[k]:l},usos:0,max:12});
    }
  }
  return lista;
};
pintarOfertas=function(){
  const cont=document.getElementById('ofertas'); if(!cont)return;
  cont.innerHTML='';
  for(const o of ui.aldeano.ofertas||[]){
    const agotada=o.usos>=o.max, tiene=contarEnInv(o.costo[0])>=o.costo[1]&&(!o.costo2||contarEnInv(o.costo2[0])>=o.costo2[1]);
    const b=document.createElement('button');b.className='oferta';b.disabled=agotada||!tiene;
    const pila=(id,n)=>`<span class="pila"><img src="${ICONOS[id]}" alt=""><b>${n>1?n:''}</b></span>`;
    const nombre=o.enc?Object.keys(o.enc).map(k=>ENCANTOS[k].nombre+' '+ROMANOS[o.enc[k]]).join(', '):ITEMS[o.da[0]].nombre;
    b.innerHTML=pila(o.costo[0],o.costo[1])+(o.costo2?pila(o.costo2[0],o.costo2[1]):'')+`<span class="flechita">➜</span>`+pila(o.da[0],o.da[1])+
      `<em>${agotada?'Agotado':nombre}</em>`;
    b.dataset.tip=`${o.costo[1]} × ${ITEMS[o.costo[0]].nombre}${o.costo2?` + ${o.costo2[1]} × ${ITEMS[o.costo2[0]].nombre}`:''} por ${ITEMS[o.da[0]].nombre}${o.enc?'\n'+nombre:''}`;
    b.onmousedown=e=>{e.preventDefault();e.stopPropagation();
      if(agotada||contarEnInv(o.costo[0])<o.costo[1]||(o.costo2&&contarEnInv(o.costo2[0])<o.costo2[1]))return;
      quitarDeInv(o.costo[0],o.costo[1]); if(o.costo2)quitarDeInv(o.costo2[0],o.costo2[1]);
      let n=o.da[1];while(n>0){const k=Math.min(n,maxPila(o.da[0]));n-=k;const p=crearPila(o.da[0],k);if(o.enc)p.enc={...o.enc};
        const r=insertar(p,inv,IDX_INV);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}
      o.usos++; soltarXP(azar(1,3),ui.aldeano.pos.x,ui.aldeano.pos.y+1,ui.aldeano.pos.z); sonar('aldeano',ui.aldeano.pos); refrescarUI();};
    cont.appendChild(b);
  }
};

/* ---------- Clic derecho: ballesta, tridente y caña ---------- */
let ballestaCarga=-1, tridenteCarga=-1, impulsoT=0, boya=null;
const ID_BALLESTA_CARGADA=9911;
LIENZOS[ID_BALLESTA_CARGADA]=ICONO_BALLESTA_CARGADA;
const ICONO_BALLESTA_CARGADA_URL=ICONO_BALLESTA_CARGADA.toDataURL();
const _htmlPilaEnc=htmlPila;
htmlPila=function(p){const h=_htmlPilaEnc(p);return p&&p.id===611&&p.cargada?h.replace(ICONOS[611],ICONO_BALLESTA_CARGADA_URL):h;};
const _nombrePilaEnc=nombrePila;
nombrePila=function(p){const t=_nombrePilaEnc(p);return p&&p.id===611&&p.cargada?t.replace(ITEMS[611].nombre,ITEMS[611].nombre+'\nProyectil: Flecha'):t;};

const tiempoCargaBallesta=p=>Math.max(0,1.25-.25*nivelEnc(p,'cargaRapida'));
function mojado(){
  const j=jugador;
  if(j.enAgua)return true;
  if(!lloviendo||dim!==DIMS.superficie)return false;
  const x=Math.floor(j.pos.x),z=Math.floor(j.pos.z);
  for(let y=Math.floor(j.pos.y+1.8);y<CY;y++){const b=getBloque(x,y,z);if(b&&OPAC_LUZ[b]>0)return false;}
  return true;
}
function usarDerechoEnc(p,id){
  if(id===611){
    if(p.cargada){dispararBallesta(p);cdUso=.25;return true;}
    if(!supervivencia()||inv.some((s,i)=>s&&s.id===I.flecha&&i<36)||(inv[40]&&inv[40].id===I.flecha))ballestaCarga=0;
    return true;
  }
  if(id===612){
    if(nivelEnc(p,'impulso')&&!mojado())return true;
    tridenteCarga=0; return true;
  }
  if(id===613){if(boya)recogerCana(p);else lanzarCana(p);balancearMano();cdUso=.3;return true;}
  return false;
}
const _usarDerechoCompletoEnc=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){if(p&&usarDerechoEnc(p,id))return true;return _usarDerechoCompletoEnc(p,id,it);};

/* ---------- Ballesta ---------- */
function dispararBallesta(p){
  camara.getWorldDirection(dirVista);
  const origen=camara.position.clone().addScaledVector(dirVista,.4);
  const multi=nivelEnc(p,'multidisparo'), perf=nivelEnc(p,'perforacion'), eje=new THREE.Vector3(0,1,0);
  (multi?[0,-.17,.17]:[0]).forEach((a,i)=>{
    const d=dirVista.clone().applyAxisAngle(eje,a);
    dispararFlecha(origen,d,62,{dueno:'jugador',critico:true,dano:1,perfora:perf,recogible:supervivencia()&&i===0&&!p.flechaInfinita});
  });
  p.cargada=false; delete p.flechaInfinita;
  sonar('ballesta');
  if(supervivencia())gastarObjetoEnMano(multi?3:1);
  actualizarHUD();
}
function cargarBallesta(p){
  if(supervivencia()){
    const i=inv[40]&&inv[40].id===I.flecha?40:inv.findIndex((s,k)=>s&&s.id===I.flecha&&k<36);
    if(i<0)return false;
    if(--inv[i].n<=0)inv[i]=null;
  }else p.flechaInfinita=true;
  p.cargada=true; sonar('ballestaLista'); actualizarHUD(); return true;
}

/* ---------- Tridente ---------- */
const geoTridente=()=>geoExtruida(612,1.15);
function mallaTridente(){
  const g=new THREE.Group(), m=new THREE.Mesh(geoTridente(),matExtruido());
  m.rotation.set(0,-Math.PI/2,-Math.PI/4); g.add(m); return g;
}
function lanzarTridente(p){
  if(supervivencia()){gastarObjetoEnMano(1);p=enMano();if(!p||p.id!==612)return;}
  camara.getWorldDirection(dirVista);
  agregarEnt({tipo:'tridente',pos:camara.position.clone().addScaledVector(dirVista,.5),vel:dirVista.clone().multiplyScalar(50),
    edad:0,malla:mallaTridente(),dueno:'jugador',pila:supervivencia()?{...p}:null,ranura,lealtad:nivelEnc(p,'lealtad'),
    empala:nivelEnc(p,'empalamiento'),conduce:nivelEnc(p,'canalizacion'),estado:'vuelo'});
  if(supervivencia())inv[ranura]=null;
  sonar('tridente'); actualizarHUD();
}
const MOBS_ACUATICOS=new Set(['guardian','guardianAnciano','calamar','calamarBrillante','delfin','tortuga','ajolote','bacalao','salmon','pezTropical','pezGlobo']);
function actualizarTridente(e,dt){
  e.edad+=dt;
  const j=jugador, ojo=new THREE.Vector3(j.pos.x,j.pos.y+1.2,j.pos.z);
  if(e.estado==='vuelve'){
    const d=ojo.clone().sub(e.pos), l=d.length();
    e.vel.copy(d.normalize().multiplyScalar(8+6*e.lealtad+e.edad*4));
    e.pos.addScaledVector(e.vel,dt);
    e.malla.position.copy(e.pos); e.malla.lookAt(e.pos.clone().sub(e.vel));
    if(l<1.2||estado==='muerto'){e.muerta=true;
      if(e.pila&&estado!=='muerto'){if(!inv[e.ranura])inv[e.ranura]=e.pila;else{const r=insertarInv(e.pila);if(r)soltarItem(r,j.pos.x,j.pos.y+1,j.pos.z,false);}}
      sonar('tridenteVuelve'); actualizarHUD();}
    return;
  }
  if(e.estado==='clavado'){
    if(e.lealtad&&e.edad>.4){e.estado='vuelve';e.edad=0;sonar('tridenteVuelve',e.pos,.6);return;}
    if(e.edad>300){e.muerta=true;return;}
    if(e.dueno==='jugador'&&estado!=='muerto'&&e.edad>.5&&e.pos.distanceTo(ojo)<1.6){
      if(e.pila){const r=insertarInv(e.pila);if(r)return;} e.muerta=true; sonar('recoger');}
    if(e.dueno!=='jugador'&&e.edad>3)e.muerta=true;
    return;
  }
  e.vel.y-=20*dt; e.vel.multiplyScalar(Math.pow(.82,dt));
  e.enAgua=esAgua(getBloque(Math.floor(e.pos.x),Math.floor(e.pos.y),Math.floor(e.pos.z)));
  if(e.pos.y<-64){if(e.lealtad){e.estado='vuelve';e.edad=0;}else e.muerta=true;return;}
  const choque=trazarProyectil(e,dt,.15);
  e.malla.position.copy(e.pos); if(e.vel.lengthSq()>.01)e.malla.lookAt(e.pos.clone().add(e.vel));
  if(!choque){if(e.edad>40)e.muerta=true;return;}
  const vl=e.vel.length()||1, dir={x:e.vel.x/vl,z:e.vel.z/vl};
  if(choque.bloque){e.estado='clavado';e.edad=0;e.vel.set(0,0,0);sonar('tridenteGolpe',e.pos,.7);return;}
  if(choque.jugador){danarJugador(8,'mob',dir);e.muerta=true;return;}
  if(choque.mob){
    const m=choque.mob; let dano=8;
    if(e.empala&&MOBS_ACUATICOS.has(m.tipo))dano+=2.5*e.empala;
    herirMob(m,dano,dir,e.dueno==='jugador'?'jugador':'mob',0);
    if(e.conduce&&tormenta&&dim===DIMS.superficie&&expuestoAlCielo(m)){
      caerRayo(Math.floor(m.pos.x),Math.floor(m.pos.z)); if(!m.muerto){herirMob(m,5,null,'rayo');m.fuego=Math.max(m.fuego,8);}}
  }else if(choque.dragon)dragon.herir(8,'jugador');
  else if(choque.cristal)romperCristal(choque.cristal);
  sonar('tridenteGolpe',e.pos);
  // rebota y cae (con lealtad vuelve enseguida)
  e.vel.set(-e.vel.x*.01,-e.vel.y*.1,-e.vel.z*.01);
  if(e.lealtad){e.estado='vuelve';e.edad=0;}
  else if(e.dueno!=='jugador')e.muerta=true;
  else e.golpeo=true;
}
ACT_ENT.tridente=(e,dt)=>{
  if(e.golpeo&&e.estado==='vuelo'){ // tras golpear cae sin volver a dañar
    e.edad+=dt; e.vel.y-=20*dt;
    const nx=e.pos.clone().addScaledVector(e.vel,dt);
    if(SOLIDO[getBloque(Math.floor(nx.x),Math.floor(nx.y),Math.floor(nx.z))]){e.estado='clavado';e.edad=0;e.vel.set(0,0,0);}
    else e.pos.copy(nx);
    e.malla.position.copy(e.pos); return;
  }
  actualizarTridente(e,dt);
};
function soltarTridente(p){
  const carga=tridenteCarga; tridenteCarga=-1;
  if(carga<.5||!p||p.id!==612)return;
  const imp=nivelEnc(p,'impulso');
  if(imp){
    if(!mojado())return;
    camara.getWorldDirection(dirVista);
    const f=10+8*imp;
    jugador.vel.set(dirVista.x*f,dirVista.y*f,dirVista.z*f);
    if(jugador.suelo)jugador.pos.y+=.3;
    impulsoT=1; golpeadosImpulso.clear(); sonar('impulso');
    if(supervivencia())gastarObjetoEnMano(1);
    return;
  }
  lanzarTridente(p);
}
// Propulsión acuática: el jugador sale disparado girando y no recibe daño de caída
const golpeadosImpulso=new Set();
const _fisicaEspecialEnc=fisicaEspecial;
fisicaEspecial=function(j,dt,entrada){
  if(impulsoT>0&&!j.montura){
    impulsoT-=dt;
    if(!j.enAgua)j.vel.y-=14*dt;
    j.vel.multiplyScalar(Math.pow(.55,dt));
    pasoFisico(j,dt); j.maxY=j.pos.y;
    for(const m of mobs)if(!m.muerto&&!golpeadosImpulso.has(m)&&m.pos.distanceTo(j.pos)<1.4){
      golpeadosImpulso.add(m);herirMob(m,8,{x:j.vel.x/(j.vel.length()||1),z:j.vel.z/(j.vel.length()||1)},'jugador',1);}
    if(j.suelo&&impulsoT<.75)impulsoT=0;
    if(Math.random()<.5)emitirParticulas(j.pos.x,j.pos.y+.9,j.pos.z,0x9ad8ff,2,1.5,.4,0);
    return true;
  }
  return _fisicaEspecialEnc(j,dt,entrada);
};

/* ---------- Caña de pescar ---------- */
const matLinea=new THREE.LineBasicMaterial({color:0x222222});
function lanzarCana(p){
  camara.getWorldDirection(dirVista);
  const g=new THREE.Group();
  const a=new THREE.Mesh(new THREE.BoxGeometry(.12,.08,.12),new THREE.MeshBasicMaterial({color:0xd02020}));a.position.y=.04;g.add(a);
  const b=new THREE.Mesh(new THREE.BoxGeometry(.12,.06,.12),new THREE.MeshBasicMaterial({color:0xf0f0f0}));b.position.y=-.03;g.add(b);
  const lineaGeo=new THREE.BufferGeometry(); lineaGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12*3),3));
  const linea=new THREE.Line(lineaGeo,matLinea); linea.frustumCulled=false; escena.add(linea);
  const vel=dirVista.clone().multiplyScalar(15); vel.y+=3;
  boya=agregarEnt({tipo:'boya',pos:camara.position.clone().addScaledVector(dirVista,.6),vel,edad:0,malla:g,dueno:'jugador',
    estado:'vuelo',linea,espera:0,picando:0,acercando:0,suerte:nivelEnc(p,'suerteMarina'),atrae:nivelEnc(p,'atraccion')});
  sonar('lanzarCana');
}
function esperaPesca(e){return Math.max(1,5+Math.random()*25-5*e.atrae)*(lloviendo&&dim===DIMS.superficie?.8:1);}
function quitarBoya(){if(!boya)return;boya.muerta=true;escena.remove(boya.linea);boya.linea.geometry.dispose();boya=null;}
function botinPesca(suerte){
  const r=Math.random(), tesoro=.05+.021*suerte, basura=Math.max(0,.1-.0195*suerte);
  const tirada=lista=>{let t=0;for(const x of lista)t+=x[1];let v=Math.random()*t;for(const x of lista){v-=x[1];if(v<0)return x[0]();}return lista[0][0]();};
  if(r<tesoro)return tirada([
    [()=>{const p=crearPila(I.arco);p.dur=Math.ceil(p.dur*(.1+Math.random()*.15));p.enc=aObjetoEnc(elegirEncantos(I.arco,30,Math.random,true));return p;},1],
    [()=>{const p=crearPila(546);p.enc=aObjetoEnc(elegirEncantos(248,30,Math.random,true));return p;},1],
    [()=>{const p=crearPila(613);p.dur=Math.ceil(p.dur*(.1+Math.random()*.15));p.enc=aObjetoEnc(elegirEncantos(613,30,Math.random,true));return p;},1],
    [()=>crearPila(598),1],[()=>crearPila(B.nenufar),1]]);
  if(r<tesoro+basura)return tirada([
    [()=>crearPila(B.nenufar),17],[()=>crearPila(252),10],[()=>crearPila(I.cuero),10],
    [()=>{const p=crearPila(430);p.dur=Math.ceil(p.dur*(.1+Math.random()*.8));return p;},10],
    [()=>crearPila(I.carnePodrida),10],[()=>crearPila(200),5],[()=>crearPila(219),5],[()=>crearPila(501),10],[()=>crearPila(222),10],
    [()=>{const p=crearPila(613);p.dur=Math.ceil(p.dur*(.1+Math.random()*.8));return p;},2]]);
  return tirada([[()=>crearPila(614),60],[()=>crearPila(616),25],[()=>crearPila(619),13],[()=>crearPila(618),2]]);
}
function recogerCana(p){
  const e=boya; if(!e)return;
  const j=jugador, dx=j.pos.x-e.pos.x, dy=j.pos.y+1-e.pos.y, dz=j.pos.z-e.pos.z;
  let gasto=0;
  if(e.enganchado&&!e.enganchado.muerto){
    const m=e.enganchado; m.vel.x+=dx*.8; m.vel.z+=dz*.8; m.vel.y+=Math.min(8,3+Math.hypot(dx,dz)*.25); gasto=5;
  }else if(e.estado==='agua'&&e.picando>0){
    const pila=botinPesca(e.suerte), T=.9;
    soltarItem(pila,e.pos.x,e.pos.y+.4,e.pos.z,false,new THREE.Vector3(dx/T,dy/T+10*T,dz/T));
    soltarXP(azar(1,6),j.pos.x,j.pos.y+.5,j.pos.z);
    emitirParticulas(e.pos.x,e.pos.y+.1,e.pos.z,0x9ad8ff,10,2,.5,8); sonar('chapoteo',e.pos,.7);
    gasto=1;
  }else if(e.estado==='suelo')gasto=2;
  quitarBoya(); sonar('recogerCana');
  if(gasto&&supervivencia())gastarObjetoEnMano(gasto);
}
function puntaCana(){
  if(vistaTercera){const j=jugador,s=Math.sin(j.yaw),c=Math.cos(j.yaw);return new THREE.Vector3(j.pos.x-c*.35-s*.6,j.pos.y+1.9,j.pos.z+s*.35-c*.6);}
  return new THREE.Vector3(.32,.12,-.75).applyMatrix4(camara.matrixWorld);
}
function actualizarBoya(e,dt){
  e.edad+=dt;
  if(e!==boya){escena.remove(e.linea);e.muerta=true;return;}
  const j=jugador;
  if(enManoId()!==613||estado==='muerto'||e.pos.distanceTo(j.pos)>32){quitarBoya();return;}
  const bAqui=getBloque(Math.floor(e.pos.x),Math.floor(e.pos.y),Math.floor(e.pos.z));
  if(e.enganchado){
    const m=e.enganchado; if(m.muerto||!mobs.includes(m)){e.enganchado=null;e.estado='vuelo';}
    else e.pos.set(m.pos.x,m.pos.y+m.alto*.6,m.pos.z);
  }else if(e.estado==='vuelo'){
    e.vel.y-=14*dt; e.vel.multiplyScalar(Math.pow(.6,dt));
    if(esAgua(bAqui)){e.estado='agua';e.vel.set(0,0,0);e.espera=esperaPesca(e);
      let y=Math.floor(e.pos.y);while(esAgua(getBloque(Math.floor(e.pos.x),y+1,Math.floor(e.pos.z))))y++;e.superficie=y+.88;
      sonar('chapoteo',e.pos,.4);}
    else{const c=trazarProyectil(e,dt,.1);
      if(c&&c.bloque){e.estado='suelo';e.vel.set(0,0,0);}
      else if(c&&c.mob){e.enganchado=c.mob;herirMob(c.mob,0,null,'jugador',0);}}
  }else if(e.estado==='agua'){
    if(!esAgua(bAqui)&&!esAgua(getBloque(Math.floor(e.pos.x),Math.floor(e.pos.y-.3),Math.floor(e.pos.z)))){e.estado='vuelo';}
    if(e.picando>0){
      e.picando-=dt; if(e.picando<=0){e.espera=esperaPesca(e);}
    }else if(e.acercando>0){
      e.acercando-=dt;
      const a=e.angulo, d=Math.max(0,e.acercando)*1.6;
      if(Math.random()<.6)emitirParticulas(e.pos.x+Math.sin(a)*d,e.superficie+.05,e.pos.z+Math.cos(a)*d,0xdfeeff,1,.4,.4,0);
      if(e.acercando<=0){e.picando=.9+Math.random()*.9;sonar('pica',e.pos);
        emitirParticulas(e.pos.x,e.superficie+.05,e.pos.z,0xffffff,8,1.6,.5,6);}
    }else{
      e.espera-=dt;
      if(e.espera<=0){e.acercando=1+Math.random()*3;e.angulo=Math.random()*Math.PI*2;}
    }
    e.pos.y=e.superficie-.1+Math.sin(e.edad*3)*.03-(e.picando>0?.25:0);
  }
  e.malla.position.copy(e.pos);
  // Línea con un poco de comba
  const a=puntaCana(), b=e.pos, pos=e.linea.geometry.attributes.position, n=pos.count;
  const comba=e.estado==='agua'||e.estado==='suelo'?Math.min(1.2,a.distanceTo(b)*.08):.1;
  for(let i=0;i<n;i++){const t=i/(n-1);
    pos.setXYZ(i,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*comba,a.z+(b.z-a.z)*t);}
  pos.needsUpdate=true;
}
ACT_ENT.boya=actualizarBoya;

/* ---------- Ahogado ---------- */
DEF_MOB.ahogado={...DEF_MOB.zombi,ia:'ahogado',sonido:'zombi',vel:2.1,
  suelta:b=>[[I.carnePodrida,azar(0,2+b)],[I.lingoteCobre,prob(.11)?1:0]]};
NOMBRE_MOB.ahogado='Ahogado';
MODELOS_EXTRA.ahogado=({pon,parte,humanoide,ojos,brazos,extra,opc})=>{
  humanoide(0x4f8f86,0x5a9a8e,0x3b5a66,0x4f8f86);
  pon(parte(.52,.2,.3,0x2f6a70),0,.95,0); pon(parte(.3,.12,.3,0x7ab8a8),.05,1.9,.02);
  ojos(1.78,.26,.12,0x7ff0ff);
  if(opc.tridente&&brazos[1]){const t=new THREE.Mesh(geoTridente(),matExtruido());t.scale.setScalar(.8);
    t.rotation.set(0,Math.PI/2,Math.PI/4+Math.PI);t.position.set(0,-.6,.25);brazos[1].add(t);extra.tridente=t;}
};
IA_EXTRA.ahogado=(m,dt,c)=>{
  const agua=esAgua(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+.5),Math.floor(m.pos.z)));
  if(agua&&(!c.persigue||c.dy<.5))m.vel.y-=30*dt;   // no flota: nada hacia abajo
  if(c.persigue){
    m.yawObj=Math.atan2(c.dx,c.dz);
    if(m.tridente&&c.dist3>3&&c.dist3<16&&m.cd<=0&&hayLineaVision(c.eye,c.ojoJ)){
      m.cd=3; m.golpeT=.5;
      const dir=new THREE.Vector3(c.dx,c.dy+1.1-m.alto*.85+c.dist*.08,c.dz).normalize();
      agregarEnt({tipo:'tridente',pos:c.eye.clone().addScaledVector(dir,.6),vel:dir.multiplyScalar(30),edad:0,malla:mallaTridente(),
        dueno:'mob',duenoMob:m,pila:null,lealtad:0,estado:'vuelo'});
      sonar('tridente',m.pos,.8);
      return true;
    }
    mover(m,c.dx,c.dz,m.def.vel*(agua?1.2:1));
    if(c.dist<m.ancho+1.1&&Math.abs(c.dy)<1.8&&m.cd<=0){m.cd=1;m.golpeT=.35;danarJugador(m.def.dano,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});}
  }else{m.t-=dt;if(m.t<=0){m.t=2+Math.random()*5;m.mover=Math.random()<.5;m.yawObj=Math.random()*Math.PI*2;}}
  return true;
};
const _crearMobEnc=crearMob;
crearMob=function(tipo,x,y,z,opc={}){
  if(tipo==='ahogado'&&opc.tridente===undefined)opc={...opc,tridente:Math.random()<.15};
  const m=_crearMobEnc(tipo,x,y,z,opc);
  if(tipo==='ahogado')m.tridente=!!opc.tridente;
  return m;
};
const _alMorirEnc=alMorirMob;
alMorirMob=function(m){
  if(m.tipo==='ahogado'&&m.tridente&&m.porJugador&&tiempoJuego-m.porJugador<5&&Math.random()<.085+.01*nivelEnc(enMano(),'botin')){
    const p=crearPila(612);p.dur=Math.max(1,Math.floor(p.dur*(.1+Math.random()*.7)));soltarItem(p,m.pos.x,m.pos.y+1,m.pos.z,true);}
  return _alMorirEnc(m);
};
// Aparecen en ríos y océanos, sobre todo de noche
const _aparicionFinalEnc=aparicionFinal;
aparicionFinal=function(x,z){
  if(dim===DIMS.superficie&&!(mundoEstado&&mundoEstado.oneBlock)&&Math.random()<(sol<-.05?.35:.08)){
    const inf=infoColumna(x,z);
    if((esOceano(inf.bioma)||inf.bioma===BIOMA.rio)&&contar(m=>m.tipo==='ahogado')<6&&Math.hypot(x-jugador.pos.x,z-jugador.pos.z)>20){
      let y=CY-2; while(y>0&&!getBloque(x,y,z))y--;
      if(esAgua(getBloque(x,y,z))){let yy=y;while(yy>1&&esAgua(getBloque(x,yy-1,z))&&y-yy<4)yy--;
        if(esAgua(getBloque(x,yy+1,z))){const m=crearMob('ahogado',x+.5,yy,z+.5);m.origen.set(x,yy,z);return true;}}
    }
  }
  return _aparicionFinalEnc(x,z);
};
// Los zombis y ahogados tienen 2 de armadura; la Brecha la ignora en un 15 % por nivel
const ARMADURA_MOB={zombi:2,ahogado:2,zombiAldeano:2,husk:2,momia:2,piglinBruto:0,wither:4};
let golpeCuerpo=false;
const _herirMobEnc=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  if(m&&d>0){
    const p=golpeCuerpo?enMano():null;
    if(p&&p.id===612&&MOBS_ACUATICOS.has(m.tipo))d+=2.5*nivelEnc(p,'empalamiento');
    let arm=m.armadura!==undefined?m.armadura:ARMADURA_MOB[m.tipo]||0;
    if(p&&ITEMS[p.id].herr&&ITEMS[p.id].herr.tipo==='maza')arm*=Math.max(0,1-.15*nivelEnc(p,'brecha'));
    if(arm>0)d*=1-Math.min(20,Math.max(arm/5,arm-d/2))/25;
  }
  return _herirMobEnc(m,d,dir,fuente,empuje);
};
const _atacarEnc=atacar;
atacar=function(){
  const p=enMano(), h=p&&ITEMS[p.id].herr, carga=cargaAtaque();
  golpeCuerpo=true;
  let r; try{r=_atacarEnc();}finally{golpeCuerpo=false;}
  // Embestida: la lanza impulsa al jugador hacia delante (gasta hambre)
  const lv=nivelEnc(p,'estocada');
  if(r&&h&&h.tipo==='lanza'&&lv&&carga>.9&&!jugador.montura&&(!supervivencia()||hambre>6)){
    camara.getWorldDirection(dirVista); const f=4+2.5*lv, l=Math.hypot(dirVista.x,dirVista.z)||1;
    jugador.vel.x+=dirVista.x/l*f; jugador.vel.z+=dirVista.z/l*f; if(jugador.suelo)jugador.vel.y=Math.max(jugador.vel.y,3);
    if(supervivencia())agotamiento+=lv;
  }
  return r;
};

/* ---------- Manos y poses ---------- */
let geoBallestaMano=0;
const _actualizarManoEnc=actualizarMano;
actualizarMano=function(id,brillo,dt,agachado){
  _actualizarManoEnc(id,brillo,dt,agachado);
  if(!manoObjeto||!manoObjeto.isMesh)return;
  if(id===611){const p=enMano(), f=p&&p.cargada?ID_BALLESTA_CARGADA:611;
    if(geoBallestaMano!==f){geoBallestaMano=f;manoObjeto.geometry=geoExtruida(f,.44);}
    if(ballestaCarga>=0){const t=Math.min(1,ballestaCarga/Math.max(.05,tiempoCargaBallesta(p)));
      manoObjeto.position.x-=.08*t; manoObjeto.position.y+=.05*t+Math.sin(tiempoJuego*40)*.004*t; manoObjeto.rotation.z+=.3*t;}
    else if(p&&p.cargada){manoObjeto.position.x-=.1;manoObjeto.rotation.z+=.35;}
  }else geoBallestaMano=0;
  if(id===612&&tridenteCarga>=0){const t=Math.min(1,tridenteCarga/.5);
    manoObjeto.position.y+=.12*t; manoObjeto.position.z+=.15*t; manoObjeto.rotation.x-=1.1*t;}
};
const _modeloJugadorEnc=actualizarModeloJugador;
actualizarModeloJugador=function(dt){
  _modeloJugadorEnc(dt);
  const M=modeloJugador, p=M.p; if(!M.g.visible)return;
  const e=enMano();
  if(e&&e.id===611&&(ballestaCarga>=0||e.cargada)){p.brazoD.rotation.x=-1.5;p.brazoI.rotation.x=-1.4;p.brazoI.rotation.y=.6;}
  if(tridenteCarga>=0){p.brazoD.rotation.x=-2.9;}
  if(impulsoT>0){M.g.rotation.x=-Math.PI/2+Math.max(-1,Math.min(1,jugador.pitch));M.g.rotation.y+=tiempoJuego*20%(Math.PI*2);}
};

/* ---------- Cada fotograma ---------- */
const _actualizarFinalEnc=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalEnc(dt);
  actualizarMesasEnc(dt);
  const p=enMano();
  if(ballestaCarga>=0){
    if(estado!=='jugando'||!clicDer||!p||p.id!==611||p.cargada)ballestaCarga=-1;
    else{const antes=ballestaCarga;ballestaCarga+=dt;const T=tiempoCargaBallesta(p);
      if(Math.floor(antes/(T/3+.01))!==Math.floor(ballestaCarga/(T/3+.01)))sonar('ballestaCarga');
      if(ballestaCarga>=T){ballestaCarga=-1;cargarBallesta(p);}}
  }
  if(tridenteCarga>=0){
    if(estado!=='jugando'||!p||p.id!==612)tridenteCarga=-1;
    else if(!clicDer)soltarTridente(p);
    else tridenteCarga+=dt;
  }
  if(boya&&(enManoId()!==613))quitarBoya();
};
// Al abrir una pantalla se cancela lo que se estaba cargando
const _abrirUIEnc=abrirUI;
abrirUI=function(tipo,pos,extra){ballestaCarga=-1;tridenteCarga=-1;return _abrirUIEnc(tipo,pos,extra);};
