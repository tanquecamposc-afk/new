"use strict";
/* =========================================================
   Dimensiones y chunks
   ========================================================= */
const DIMS={
  superficie:{clave:'superficie',nombre:'Superficie',cielo:true,amb:.018,chunks:new Map(),ediciones:{}},
  nether:{clave:'nether',nombre:'El Nether',cielo:false,amb:.28,niebla:0x3a100a,chunks:new Map(),ediciones:{}},
  end:{clave:'end',nombre:'El End',cielo:false,amb:.48,niebla:0x0c0a16,chunks:new Map(),ediciones:{}},
};
let dim=DIMS.superficie;
let semilla=1+Math.floor(Math.random()*1e6);
let hornos={}, cofres={};          // "dim:x,y,z" -> estado
let mundoEstado={dragonMuerto:false,cristalesRotos:[],fin:false};
const idx=(x,y,z)=>x+z*CX+y*CX*CZ;
const claveChunk=(cx,cz)=>cx+','+cz;
const claveCont=(x,y,z)=>dim.clave+':'+clavePos(x,y,z);

function obtenerChunkD(d,cx,cz){return d.chunks.get(claveChunk(cx,cz))||generarChunk(d,cx,cz);}
function obtenerChunk(cx,cz){return obtenerChunkD(dim,cx,cz);}
function chunkSiExiste(cx,cz){return dim.chunks.get(claveChunk(cx,cz));}
function getBloque(x,y,z){
  if(y<0)return B.lecho; if(y>=CY)return 0;
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ);
  return obtenerChunk(cx,cz).datos[idx(x-cx*CX,y,z-cz*CZ)];
}
function getBloqueSiCargado(x,y,z){
  if(y<0||y>=CY)return 0;
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ), ch=chunkSiExiste(cx,cz);
  return ch?ch.datos[idx(x-cx*CX,y,z-cz*CZ)]:-1;
}

function generarChunk(d,cx,cz){
  const datos=new Uint16Array(CX*CY*CZ);
  const ch={cx,cz,dim:d,datos,luz:null,malla:null,mallaT:null,sucio:false,ymin:0,ymax:CY-1,generadores:[]};
  if(d===DIMS.superficie)generarSuperficie(ch);
  else if(d===DIMS.nether)generarNether(ch);
  else generarEnd(ch);
  const ed=d.ediciones[claveChunk(cx,cz)];
  if(ed)for(const k in ed){const [x,y,z]=k.split(',').map(Number);datos[idx(x,y,z)]=ed[k];
    if(ed[k]===B.sensorSculk||ed[k]===B.chillador)(ch.sculk||(ch.sculk=[])).push([x,y,z]);}
  let ymin=CY,ymax=0;
  for(let y=0;y<CY;y++){const o=y*CX*CZ;for(let i=0;i<256;i++){const b=datos[o+i];if(b){if(y<ymin)ymin=y;ymax=y;if(b===B.generador)ch.generadores.push([i&15,y,i>>4]);}}}
  ch.ymin=ymin===CY?0:ymin; ch.ymax=ymax;
  d.chunks.set(claveChunk(cx,cz),ch);
  return ch;
}

/* ---------- Colocar bloques ---------- */
let chunksSucios=new Set();
function marcarSucio(ch){if(ch&&ch.malla){ch.sucio=true;chunksSucios.add(ch);}}
function marcarSucioPos(x,z){
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ), lx=x-cx*CX, lz=z-cz*CZ;
  marcarSucio(chunkSiExiste(cx,cz));
  const bx=lx===0?-1:lx===CX-1?1:0, bz=lz===0?-1:lz===CZ-1?1:0;
  if(bx)marcarSucio(chunkSiExiste(cx+bx,cz)); if(bz)marcarSucio(chunkSiExiste(cx,cz+bz)); if(bx&&bz)marcarSucio(chunkSiExiste(cx+bx,cz+bz));
}
function setBloque(x,y,z,id,opc={}){
  if(y<0||y>=CY)return;
  const cx=Math.floor(x/CX), cz=Math.floor(z/CZ), lx=x-cx*CX, lz=z-cz*CZ;
  const ch=obtenerChunk(cx,cz), i=idx(lx,y,lz), anterior=ch.datos[i];
  if(anterior===id)return;
  ch.datos[i]=id;
  if(id&&y>ch.ymax)ch.ymax=y; if(id&&y<ch.ymin)ch.ymin=y;
  if(id===B.generador)ch.generadores.push([lx,y,lz]);
  if((anterior===B.horno||anterior===B.cofre||anterior===B.cofreAbierto)&&id!==B.cofre&&id!==B.cofreAbierto)vaciarContenedor(x,y,z);
  const k=claveChunk(cx,cz); (dim.ediciones[k]||(dim.ediciones[k]={}))[lx+','+y+','+lz]=id;
  marcarSucioPos(x,z);
  if(ch.luz)actualizarLuz(x,y,z);
  if(!opc.sinAviso)notificarCambio(x,y,z,anterior,id);
}

/* ---------- Contenedores ---------- */
function obtenerHorno(k){return hornos[k]||(hornos[k]={entrada:null,combustible:null,salida:null,quema:0,quemaMax:0,prog:0});}
function obtenerCofre(k){return cofres[k]||(cofres[k]=new Array(27).fill(null));}
function vaciarContenedor(x,y,z){
  const k=claveCont(x,y,z), pilas=[];
  if(hornos[k]){const h=hornos[k];pilas.push(h.entrada,h.combustible,h.salida);delete hornos[k];}
  if(cofres[k]){pilas.push(...cofres[k]);delete cofres[k];}
  if(typeof ui!=='undefined'&&ui&&ui.clave===k)cerrarUI();
  for(const p of pilas)if(p)soltarItem(p,x+.5,y+.5,z+.5,true);
}
function actualizarHornos(dt){
  for(const k in hornos){
    const h=hornos[k], res=h.entrada&&FUNDIR[h.entrada.id];
    const cabe=res&&(!h.salida||(h.salida.id===res&&h.salida.n<maxPila(res)));
    if(h.quema>0)h.quema-=dt;
    if(h.quema<=0&&cabe&&h.combustible&&COMBUSTIBLE[h.combustible.id]){
      h.quema=h.quemaMax=COMBUSTIBLE[h.combustible.id];
      if(h.combustible.id===I.cuboLava)h.combustible=crearPila(I.cubo);
      else if(--h.combustible.n<=0)h.combustible=null;
    }
    if(h.quema>0&&cabe){
      h.prog+=dt;
      if(h.prog>=TIEMPO_FUNDIR){h.prog=0;
        if(--h.entrada.n<=0)h.entrada=null;
        if(h.salida)h.salida.n++;else h.salida=crearPila(res);
        h.xp=(h.xp||0)+.35;}
    }else h.prog=Math.max(0,h.prog-dt*2);
    if(h.quema<0)h.quema=0;
  }
}
/* Botín de cofres generados */
function generarBotin(tipo,rnd){
  const tablas={
    mazmorra:[[I.pan,1,3,15],[I.lingoteHierro,1,4,10],[I.lingoteOro,1,4,5],[I.carnePodrida,1,8,10],[I.hueso,1,8,10],[I.polvora,1,8,10],
      [I.cuerda,1,8,10],[I.trigo,1,4,10],[I.cubo,1,1,5],[I.manzanaDorada,1,1,2],[I.redstone,1,4,5],[I.diamante,1,2,2],[I.semillas,2,4,8]],
    fortaleza:[[I.perlaEnder,1,2,10],[I.pan,1,3,15],[I.manzana,1,3,15],[I.lingoteHierro,1,5,10],[I.lingoteOro,1,3,5],[I.redstone,4,9,5],
      [I.diamante,1,3,3],[I.lingoteHierro+0,1,1,0],[410+2,1,1,2],[300+2,1,1,3],[330+2,1,1,3],[I.libro,1,3,5]],
    aldea:[[I.pan,1,4,15],[I.manzana,1,5,15],[I.trigo,2,7,10],[I.semillas,2,5,10],[I.esmeralda,1,4,6],[I.lingoteHierro,1,3,5],[B.antorcha,1,8,8],[I.cuero,1,3,6]],
    herreria:[[I.lingoteHierro,1,5,15],[I.pan,1,3,15],[I.manzana,1,3,15],[B.obsidiana,3,7,5],[302,1,1,5],[332,1,1,5],[412,1,1,5],[I.diamante,1,3,3],[I.lingoteOro,1,3,5]],
    portalRuinas:[[B.obsidiana,1,2,20],[I.pedernal,1,4,10],[I.mechero,1,1,10],[I.pepitaOro,4,24,15],[I.lingoteOro,2,8,5],[I.manzanaDorada,1,1,4],[333,1,1,5],[403,1,1,3],[I.carneAsada||I.cerdoAsado,1,3,8]],
    ciudadEnd:[[I.diamante,2,7,5],[I.lingoteHierro,4,8,10],[I.lingoteOro,2,7,15],[I.esmeralda,2,6,2],[I.hierroBruto?I.lingoteHierro:I.lingoteHierro,1,1,0],
      [344,1,1,3],[423,1,1,3],[314,1,1,3],[304,1,1,3],[433,1,1,3],[I.cohete||523,2,6,6],[I.perlaEnder,1,2,4]],
    fortalezaNether:[[I.diamante,1,3,5],[I.lingoteHierro,1,5,5],[I.lingoteOro,1,3,15],[330+3,1,1,5],[410+1,1,1,5],[I.mechero,1,1,5],
      [B.obsidiana,2,4,2],[I.polvoBlaze,1,3,6],[I.cuerda,2,6,6],[533,1,1,6],[534,1,1,2]],
    mina:[[I.pan,1,3,15],[I.lingoteHierro,1,5,10],[I.lingoteOro,1,3,5],[I.redstone,4,9,5],[I.lapis,4,9,5],[I.diamante,1,2,3],[I.carbon,3,8,10],
      [I.semillas,2,4,10],[B.riel,4,8,8],[B.riel10,1,4,1],[546,1,1,10],[I.manzanaDorada,1,1,2]],
    iglu:[[I.manzana,1,3,15],[I.carbon,1,4,15],[I.pepitaOro,1,3,10],[I.trigo,2,3,10],[B.piedra,1,1,5],[I.manzanaDorada,1,1,1],[546,1,1,4]],
    templo:[[I.hueso,4,6,20],[I.carnePodrida,3,7,16],[I.lingoteHierro,1,5,15],[I.lingoteOro,2,7,15],[I.esmeralda,1,3,10],[I.diamante,1,3,3],[546,1,1,6],[I.flecha,4,12,8]],
    bruja:[[I.ojoArana,1,3,15],[I.polvoLuminoso,1,4,10],[I.azucar||516,1,4,10],[I.redstone,1,4,10],[I.frasco||500,1,3,10],[I.verrugaNether||515,1,3,6],[546,1,1,3]],
    puesto:[[I.trigo,3,5,15],[I.flecha,4,12,10],[I.lingoteHierro,1,3,8],[B.tronco,2,3,10],[I.papel,1,3,8],[546,1,1,5],[I.esmeralda,1,2,6]],
    naufragio:[[I.esmeralda,1,5,15],[I.lingoteHierro,1,5,15],[I.lingoteOro,1,5,10],[I.pan,1,3,10],[I.papel,1,5,10],[I.carbon,2,8,10],[I.diamante,1,1,2],[546,1,1,4],[I.brujula||I.papel,1,1,0]],
    piramide:[[I.hueso,4,6,25],[I.carnePodrida,3,7,16],[I.polvora,1,8,10],[B.arena,1,8,10],[I.cuerda,1,8,10],[I.lingoteHierro,1,5,15],
      [I.lingoteOro,2,7,15],[I.esmeralda,1,3,15],[I.diamante,1,3,5],[I.manzanaDorada,1,1,6],[I.libro,1,1,5],[304,1,1,2],[403,1,1,2]],
    ciudadAntigua:[[I.manzanaDorada,1,2,6],[536,1,3,12],[B.sensorSculk,1,3,10],[B.catalizador,1,2,5],[I.hueso,1,15,20],[I.harinaHueso,1,15,10],
      [I.carbon,6,15,10],[B.farolAlmas,1,4,8],[423,1,1,3],[344,1,1,4],[I.perlaEnder,1,3,6],[I.lingoteHierro,1,4,6],[533,1,1,1]],
  }[tipo]||[[I.pan,1,2,1]];
  const cofre=new Array(27).fill(null), total=tablas.reduce((a,t)=>a+t[3],0);
  const n=4+Math.floor(rnd()*5);
  for(let i=0;i<n;i++){
    let r=rnd()*total,t=tablas[0];
    for(const e of tablas){r-=e[3];if(r<=0){t=e;break;}}
    const p=crearPila(t[0],t[1]+Math.floor(rnd()*(t[2]-t[1]+1)));
    if(p.id===546)p.enc=libroAleatorio(rnd);
    cofre[Math.floor(rnd()*27)]=p;
  }
  return cofre;
}
function registrarCofre(d,x,y,z,tipo){
  const k=d.clave+':'+clavePos(x,y,z);
  if(!cofres[k])cofres[k]=generarBotin(tipo,mulberry32(Math.floor(hash3(x,y,z,semilla)*1e9)));
}

/* =========================================================
   Generación de la Superficie
   ========================================================= */
const BIOMA={oceano:0,playa:1,llanura:2,bosque:3,desierto:4,nevado:5,montana:6,taiga:7,abedul:8,jungla:9,sabana:10,pantano:11,badlands:12,rio:13,cerezo:14,manglar:15,jardinPalido:16,
  bosqueOscuro:17,taigaNevada:18,prado:19,picosNevados:20,oceanoCalido:21,oceanoHelado:22,
  champinones:23,bosqueFlores:24,espigasHielo:25,junglaBambu:26,badlandsErosionados:27,taigaGigante:28,oceanoProfundo:29,picosPiedra:30,llanuraGirasoles:31};
const esOceano=b=>b===0||b===21||b===22||b===29, esBiomaFrio=b=>b===5||b===18||b===20||b===22||b===25, esBadlands=b=>b===12||b===27;
const NOMBRES_BIOMA=['Océano','Playa','Llanura','Bosque','Desierto','Tundra nevada','Montañas','Taiga','Bosque de abedules','Jungla','Sabana','Pantano','Badlands','Río','Arboleda de cerezos','Manglar','Jardín pálido',
  'Bosque oscuro','Taiga nevada','Prado','Picos nevados','Océano cálido','Océano helado',
  'Campos de champiñones','Bosque de flores','Espigas de hielo','Jungla de bambú','Badlands erosionados','Taiga de árboles gigantes','Océano profundo','Picos pedregosos','Llanura de girasoles'];
const hex3=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
// Colores de cada bioma: césped, follaje y agua
const COLOR_BIOMA=[
  [0x8eb971,0x71a74d,0x3f76e4],[0x91bd59,0x77ab2f,0x3f76e4],[0x91bd59,0x77ab2f,0x3f76e4],[0x79c05a,0x59ae30,0x3f76e4],
  [0xbfb755,0xaea42a,0x32a598],[0x80b497,0x60a17b,0x3d57d6],[0x8ab689,0x6da36b,0x3f76e4],[0x86b783,0x68a464,0x3d57d6],
  [0x88bb67,0x6ba941,0x3f76e4],[0x59c93c,0x30bb0b,0x45adf2],[0xbfb755,0xaea42a,0x3f76e4],[0x6a7039,0x6a7039,0x617b64],
  [0x90814d,0x9e814d,0x3f76e4],[0x91bd59,0x77ab2f,0x3f76e4],[0xb6db61,0xb6db61,0x5db7ef],[0x6a7039,0x8db127,0x3a7a6a],[0x778272,0x878d76,0x76889d],
  [0x507a32,0x3f8f24,0x3f76e4],[0x80b497,0x60a17b,0x3d57d6],[0x83bb6d,0x63a948,0x0e6ecf],[0x80b497,0x60a17b,0x3d57d6],[0x8eb971,0x71a74d,0x43c8e8],[0x80b497,0x60a17b,0x3938c9],
  [0x55c93f,0x2bbb0f,0x3f76e4],[0x79c05a,0x59ae30,0x3f76e4],[0x80b497,0x60a17b,0x3938c9],[0x59c93c,0x30bb0b,0x45adf2],[0x90814d,0x9e814d,0x3f76e4],
  [0x86b87f,0x68a55f,0x3d57d6],[0x8eb971,0x71a74d,0x3d57d6],[0x9abe4b,0x82ac1e,0x3f76e4],[0x91bd59,0x77ab2f,0x3f76e4]].map(c=>c.map(hex3));
const COLOR_ABEDUL=hex3(0x80a755), COLOR_ABETO=hex3(0x619961);
function infoColumna(x,z){
  const s=semilla;
  const c=fbm(x*.0022,z*.0022,s,4);
  const colinas=fbm(x*.012,z*.012,s+50,4);
  const montes=clamp((fbm(x*.005,z*.005,s+90,3)-.52)*3.2,0,1);
  const temp=fbm(x*.0014,z*.0014,s+500,3)+(valueNoise(x*.05,z*.05,s+510)-.5)*.03;
  const hum=fbm(x*.0014,z*.0014,s+600,3)+(valueNoise(x*.05,z*.05,s+610)-.5)*.03;
  const rara=fbm(x*.003,z*.003,s+1700,2);   // variantes poco comunes: bosque oscuro, jardín pálido, badlands
  // Costa continua: las colinas y montañas crecen poco a poco tierra adentro (deja playas suaves)
  let h;
  if(c<.43)h=NIVEL_MAR-1-(.43-c)*150+(colinas-.5)*6*clamp((.43-c)/.02,0,1);
  else{const k=smooth(clamp((c-.43)/.05,0,1));h=NIVEL_MAR-1+(c-.43)*55+((colinas-.5)*12+7)*k+montes*montes*70*k;}
  // Bioma según temperatura y humedad (proporciones parecidas a las del original)
  let bioma;
  const tierra=h>=NIVEL_MAR-1;
  const isla=fbm(x*.0028,z*.0028,s+2100,2);
  if(!tierra&&c>.3&&isla>.73&&temp>.35&&temp<.64){h=NIVEL_MAR+1+Math.min(7,(isla-.73)*120);bioma=BIOMA.champinones;}
  else if(!tierra)bioma=temp<.33?BIOMA.oceanoHelado:temp>.64?BIOMA.oceanoCalido:c<.33?BIOMA.oceanoProfundo:BIOMA.oceano;
  else if(c<.452&&montes<.3&&h<NIVEL_MAR+3.5)bioma=temp<.33?BIOMA.nevado:BIOMA.playa;
  else if(montes>.45&&h>150)bioma=temp<.45?BIOMA.picosNevados:temp>.58&&h>162?BIOMA.picosPiedra:BIOMA.montana;
  else if(temp<.33)bioma=hum>.5?BIOMA.taigaNevada:rara>.63?BIOMA.espigasHielo:BIOMA.nevado;
  else if(temp<.405)bioma=montes>.28&&h>NIVEL_MAR+24&&hum<.46?BIOMA.prado:hum>.47&&rara>.52?BIOMA.taigaGigante:BIOMA.taiga;
  else if(temp<.6){
    if(montes>.18&&hum<.5&&h>NIVEL_MAR+12&&rara<.47)bioma=BIOMA.cerezo;
    else if(montes>.22&&h>NIVEL_MAR+20&&rara>.53)bioma=BIOMA.prado;
    else if(hum>.67)bioma=BIOMA.pantano;
    else if(hum>.55)bioma=rara>.64&&montes<.15?BIOMA.jardinPalido:rara>.49?BIOMA.bosqueOscuro:BIOMA.bosque;
    else if(hum>.48)bioma=rara<.36?BIOMA.bosqueFlores:BIOMA.bosque;
    else if(hum>.44)bioma=BIOMA.abedul;
    else bioma=rara>.62?BIOMA.llanuraGirasoles:BIOMA.llanura;
  }else if(temp<.67){
    if(hum>.64&&montes<.1)bioma=BIOMA.manglar;else if(hum>.55)bioma=rara<.38?BIOMA.junglaBambu:BIOMA.jungla;else bioma=BIOMA.sabana;
  }else{
    if(hum>.6)bioma=BIOMA.jungla;else if(rara>.6||(montes>.2&&rara>.5))bioma=rara>.68?BIOMA.badlandsErosionados:BIOMA.badlands;else bioma=BIOMA.desierto;
  }
  if(bioma===BIOMA.pantano)h=NIVEL_MAR+(h-NIVEL_MAR)*.22-.4;
  if(bioma===BIOMA.manglar)h=NIVEL_MAR+(h-NIVEL_MAR)*.15-.9;
  if(bioma===BIOMA.desierto)h=NIVEL_MAR+1+(h-NIVEL_MAR-1)*.7;
  if(esBadlands(bioma)){h+=montes*18+colinas*6;const t=Math.floor(h/5)*5;h=t+Math.min(5,(h-t)*2.5);}
  // Ríos
  const rio=Math.abs(fbm(x*.0035,z*.0035,s+70,3)-.5);
  if(tierra&&bioma!==BIOMA.montana&&bioma!==BIOMA.picosNevados&&bioma!==BIOMA.picosPiedra&&bioma!==BIOMA.champinones&&rio<.022&&h<160){
    const f=1-rio/.022;
    h=h-(h-(NIVEL_MAR-3))*Math.min(1,f*2.2);
    if(h<NIVEL_MAR)bioma=BIOMA.rio;
  }
  h=Math.round(clamp(h,70,188));
  return {h,bioma,montes,temp};
}
function alturaSuperficie(x,z){return infoColumna(x,z).h;}

// Cuevas: se muestrea en una rejilla gruesa (4x4x4) y se interpola
const GR=4, GNY=CY/GR+1;
const _rejA=new Float32Array(5*5*GNY), _rejV=new Float32Array(5*5*GNY);
function prepararCuevas(bx,bz,s){
  for(let gx=0;gx<5;gx++)for(let gz=0;gz<5;gz++)for(let gy=0;gy<GNY;gy++){
    const x=bx+gx*GR,z=bz+gz*GR,y=gy*GR, i=(gy*5+gz)*5+gx;
    _rejA[i]=valueNoise3(x/30,y/18,z/30,s+300)*.65+valueNoise3(x/11,y/11,z/11,s+301)*.35;
    const b=valueNoise3(x/26,y/15,z/26,s+302), c=valueNoise3(x/26,y/15,z/26,s+303);
    _rejV[i]=.5-Math.max(Math.abs(b-.5),Math.abs(c-.5));
  }
}
function muestraRejilla(rej,x,y,z){
  const gx=x/GR,gy=y/GR,gz=z/GR,x0=Math.min(3,gx|0),y0=Math.min(GNY-2,gy|0),z0=Math.min(3,gz|0);
  const fx=gx-x0,fy=gy-y0,fz=gz-z0;
  const v=(i,j,k)=>rej[((y0+j)*5+z0+k)*5+x0+i];
  const a=lerp(lerp(v(0,0,0),v(1,0,0),fx),lerp(v(0,0,1),v(1,0,1),fx),fz);
  const b=lerp(lerp(v(0,1,0),v(1,1,0),fx),lerp(v(0,1,1),v(1,1,1),fx),fz);
  return lerp(a,b,fy);
}
function esCuevaLocal(lx,y,lz,h,oceano){
  if(y<5)return false;
  if(oceano&&y>h-6)return false;
  const a=muestraRejilla(_rejA,lx,y,lz), v=muestraRejilla(_rejV,lx,y,lz);
  if(y>h-4)return a>.76||v>.48;
  return a>.675||v>.462;
}
/* ---------- Vetas de mineral al estilo Minecraft ---------- */
// [bloque, variante de pizarra, intentos, tamaño, forma de distribución, Y mín, Y máx]
const VETAS=[
  [B.menaCarbon,B.pCarbon,20,17,'tri',0,192],
  [B.menaCobre,B.pCobre,16,10,'tri',-16,112],
  [B.menaHierro,B.pHierro,10,9,'tri',-24,56],
  [B.menaHierro,B.pHierro,10,4,'uni',-64,72],
  [B.menaOro,B.pOro,3,9,'tri',-64,32],
  [B.menaOro,B.pOro,.5,9,'uni',-64,-48],
  [B.menaRedstone,B.pRedstone,4,8,'uni',-64,15],
  [B.menaRedstone,B.pRedstone,8,8,'tri',-96,-32],
  [B.menaLapis,B.pLapis,2,7,'tri',-32,32],
  [B.menaLapis,B.pLapis,2,7,'uni',-64,64],
  [B.menaDiamante,B.pDiamante,7,3,'tri',-144,16],
  [B.menaDiamante,B.pDiamante,.11,8,'tri',-144,16],
  [B.menaDiamante,B.pDiamante,1,5,'tri',-144,16],
  [B.tierra,B.tierra,7,33,'uni',0,160],
  [B.grava,B.grava,14,33,'uni',-64,127],
  [B.granito,B.granito,2,64,'uni',0,60],
  [B.diorita,B.diorita,2,64,'uni',0,60],
  [B.andesita,B.andesita,2,64,'uni',0,60],
];
function colocarVeta(datos,r,lx,y,lz,tam,id,ds){
  const a=r()*Math.PI, f=tam/8;
  const x0=lx+Math.sin(a)*f, x1=lx-Math.sin(a)*f, z0=lz+Math.cos(a)*f, z1=lz-Math.cos(a)*f;
  const y0=y+r()*3-1, y1=y+r()*3-1;
  for(let i=0;i<tam;i++){
    const t=i/tam, cx=lerp(x0,x1,t), cy=lerp(y0,y1,t), cz=lerp(z0,z1,t);
    const rad=((Math.sin(Math.PI*t)+1)*r()*tam/16+1)/2;
    for(let X=Math.floor(cx-rad);X<=Math.ceil(cx+rad);X++){if(X<0||X>=CX)continue;
      for(let Y=Math.floor(cy-rad);Y<=Math.ceil(cy+rad);Y++){if(Y<1||Y>=CY)continue;
        for(let Z=Math.floor(cz-rad);Z<=Math.ceil(cz+rad);Z++){if(Z<0||Z>=CZ)continue;
          const dx=(X+.5-cx)/rad,dy=(Y+.5-cy)/rad,dz=(Z+.5-cz)/rad;
          if(dx*dx+dy*dy+dz*dz>=1)continue;
          const i2=idx(X,Y,Z),b=datos[i2];
          if(b===B.piedra||b===B.granito||b===B.diorita||b===B.andesita)datos[i2]=id;
          else if(b===B.pizarra&&ds!==B.tierra&&ds!==B.granito&&ds!==B.diorita&&ds!==B.andesita)datos[i2]=ds;
        }}}
  }
}
function generarVetas(ch,montana){
  const r=mulberry32(Math.floor(hash2(ch.cx,ch.cz,semilla+4000)*4294967296));
  const lista=montana?VETAS.concat([[B.menaEsmeralda,B.menaEsmeralda,12,3,'uni',-16,127],[B.menaHierro,B.pHierro,90,9,'tri',80,384]]):VETAS;
  for(const [id,ds,intentos,tam,forma,y0,y1] of lista){
    let n=Math.floor(intentos)+(r()<intentos%1?1:0);
    for(let k=0;k<n;k++){
      const my=forma==='tri'?Math.round(y0+(r()+r())/2*(y1-y0)):Math.round(y0+r()*(y1-y0));
      const y=my+OY; if(y<1||y>=CY-1)continue;
      colocarVeta(ch.datos,r,Math.floor(r()*16),y,Math.floor(r()*16),tam,id,ds);
    }
  }
}

/* ---------- Árboles ---------- */
function ponerArbolTipo(poner,tipo,wx,h,wz,r){
  const tronco=(x,y,z,id)=>poner(x,y,z,id,false);
  const hoja=(x,y,z,id)=>poner(x,y,z,id,true);
  const bola=(cx,cy,cz,rad,id)=>{for(let dx=-Math.ceil(rad);dx<=rad;dx++)for(let dy=-Math.ceil(rad);dy<=rad;dy++)for(let dz=-Math.ceil(rad);dz<=rad;dz++)
    if(dx*dx+dy*dy*1.6+dz*dz<=rad*rad+r()*.8)hoja(cx+dx,cy+dy,cz+dz,id);};
  const copaRoble=(cima,id)=>{for(let y=cima-2;y<=cima+1;y++){const rad=y>=cima?1:2;
    for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++){
      if(Math.abs(dx)===rad&&Math.abs(dz)===rad&&(y===cima+1||r()<.5))continue;hoja(wx+dx,y,wz+dz,id);}}};
  if(tipo==='roble'||tipo==='abedul'||tipo==='pantano'){
    const alto=(tipo==='abedul'?5:4)+Math.floor(r()*3), cima=h+alto, hojaId=tipo==='abedul'?B.hojasAbedul:B.hojas;
    if(tipo==='pantano'){for(let y=cima-2;y<=cima+1;y++){const rad=y>=cima?2:3;for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++)
      if(!(Math.abs(dx)===rad&&Math.abs(dz)===rad))hoja(wx+dx,y,wz+dz,hojaId);}}
    else copaRoble(cima,hojaId);
    for(let y=h+1;y<=cima;y++)tronco(wx,y,wz,tipo==='abedul'?B.troncoAbedul:B.tronco);
  }else if(tipo==='robleGrande'){
    const alto=7+Math.floor(r()*4), cima=h+alto;
    for(let y=h+1;y<=cima;y++)tronco(wx,y,wz,B.tronco);
    bola(wx,cima,wz,2.6,B.hojas);
    const ramas=2+Math.floor(r()*2);
    for(let k=0;k<ramas;k++){const a=r()*Math.PI*2,l=2+Math.floor(r()*2),by=h+Math.floor(alto*.55)+k;
      let bx=wx,bz=wz;for(let i=1;i<=l;i++){bx=wx+Math.round(Math.cos(a)*i);bz=wz+Math.round(Math.sin(a)*i);tronco(bx,by+Math.floor(i/2),bz,B.tronco);}
      bola(bx,by+Math.floor(l/2)+1,bz,2,B.hojas);}
  }else if(tipo==='abeto'){
    const alto=7+Math.floor(r()*5), cima=h+alto;
    let rad=0;
    for(let y=cima+1;y>=h+2+Math.floor(r()*2);y--){
      for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++)if(Math.abs(dx)+Math.abs(dz)<=rad+(rad>1?1:0))hoja(wx+dx,y,wz+dz,B.hojasAbeto);
      rad=rad>=((cima-y)/3|0)+1?(rad>1?rad-1:rad+1):rad+1; if(rad>3)rad=1;
    }
    hoja(wx,cima+2,wz,B.hojasAbeto);
    for(let y=h+1;y<=cima;y++)tronco(wx,y,wz,B.troncoAbeto);
  }else if(tipo==='jungla'){
    const alto=9+Math.floor(r()*7), cima=h+alto;
    bola(wx,cima,wz,3.2,B.hojasJungla);
    for(let y=h+4;y<cima-2;y+=2+Math.floor(r()*3)){const a=r()*Math.PI*2;bola(wx+Math.round(Math.cos(a)*2),y,wz+Math.round(Math.sin(a)*2),1.3,B.hojasJungla);}
    for(let y=h+1;y<=cima;y++)tronco(wx,y,wz,B.troncoJungla);
  }else if(tipo==='arbusto'){
    tronco(wx,h+1,wz,B.troncoJungla);bola(wx,h+2,wz,1.8,B.hojasJungla);
  }else if(tipo==='acacia'){
    const alto=4+Math.floor(r()*2), a=Math.floor(r()*4), [dx,dz]=DIRF[a];
    let x=wx,z=wz,y=h;
    for(let i=1;i<=alto;i++){y++;tronco(x,y,z,B.troncoAcacia);}
    for(let i=0;i<2+Math.floor(r()*2);i++){x+=dx;z+=dz;y++;tronco(x,y,z,B.troncoAcacia);}
    for(let ddx=-3;ddx<=3;ddx++)for(let ddz=-3;ddz<=3;ddz++){const d=Math.abs(ddx)+Math.abs(ddz);
      if(d<=4)hoja(x+ddx,y+1,z+ddz,B.hojasAcacia);if(d<=2)hoja(x+ddx,y+2,z+ddz,B.hojasAcacia);}
  }else if(tipo==='cerezo'){
    const alto=4+Math.floor(r()*3); let y=h;
    for(let i=1;i<=alto;i++){y++;tronco(wx,y,wz,B.troncoCerezo);}
    const copas=[[wx,y,wz]], nr=1+Math.floor(r()*2), usadas=new Set();
    for(let k=0;k<nr;k++){let d=Math.floor(r()*4);while(usadas.has(d))d=(d+1)%4;usadas.add(d);
      const [dx,dz]=DIRF[d];let bx2=wx,by=y-1-Math.floor(r()*2),bz2=wz;
      for(let i=0;i<3;i++){bx2+=dx;bz2+=dz;if(i>0)by++;tronco(bx2,by,bz2,B.troncoCerezo);}
      copas.push([bx2,by,bz2]);}
    for(const [cx2,cy2,cz2] of copas){
      for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)for(let dy=-1;dy<=2;dy++){
        const d=(dx*dx+dz*dz)/10.5+(dy-.5)*(dy-.5)/2.2;if(d<=1+r()*.15)hoja(cx2+dx,cy2+dy,cz2+dz,B.hojasCerezo);}
      for(let k=0;k<5;k++)hoja(cx2+Math.floor(r()*5)-2,cy2-2,cz2+Math.floor(r()*7)-3,B.hojasCerezo);
    }
  }else if(tipo==='palido'){
    const alto=6+Math.floor(r()*3), cima=h+alto;
    for(let y=h+1;y<=cima;y++)for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]])tronco(wx+a,y,wz+b,B.troncoPalido);
    if(r()<.14)tronco(wx+Math.floor(r()*2),h+2+Math.floor(r()*3),wz+Math.floor(r()*2),B.corazonCreaking);
    for(let dx=-3;dx<=4;dx++)for(let dz=-3;dz<=4;dz++)for(let dy=-1;dy<=1;dy++){const d=Math.hypot(dx-.5,dz-.5);
      if(d<=3.7-(dy===1?1.4:0)+r()*.4)hoja(wx+dx,cima+dy,wz+dz,B.hojasPalidas);}
    for(let k=0;k<12;k++){const hx=wx+Math.floor(r()*8)-3,hz=wz+Math.floor(r()*8)-3,l=1+Math.floor(r()*3);
      for(let q=0;q<l;q++)hoja(hx,cima-2-q,hz,B.musgoColgante);}
  }else if(tipo==='robleOscuro'){
    // Tronco de 2x2 y copa ancha y plana: juntos forman el techo del bosque oscuro
    const alto=5+Math.floor(r()*3), cima=h+alto, H=B.hojasRobleOscuro;
    for(let y=h+1;y<=cima;y++)for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]])tronco(wx+a,y,wz+b,B.troncoRobleOscuro);
    for(let k=0;k<2+Math.floor(r()*2);k++){const [dx,dz]=DIRF[Math.floor(r()*4)];
      const bx2=wx+(dx>0?2:dx<0?-1:Math.floor(r()*2)), bz2=wz+(dz>0?2:dz<0?-1:Math.floor(r()*2));
      tronco(bx2,cima-1,bz2,B.troncoRobleOscuro);tronco(bx2+dx,cima,bz2+dz,B.troncoRobleOscuro);}
    for(let dx=-3;dx<=4;dx++)for(let dz=-3;dz<=4;dz++){const d=Math.hypot(dx-.5,dz-.5);
      if(d<=3.8+r()*.5)hoja(wx+dx,cima,wz+dz,H);
      if(d<=2.8+r()*.4)hoja(wx+dx,cima+1,wz+dz,H);
      if(d>1.6&&d<=3.4&&r()<.45)hoja(wx+dx,cima-1,wz+dz,H);}
  }else if(tipo==='setaRoja'||tipo==='setaMarron'){
    const alto=4+Math.floor(r()*3), cima=h+alto;
    for(let y=h+1;y<cima;y++)tronco(wx,y,wz,B.talloSeta);
    if(tipo==='setaRoja'){
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){if(Math.abs(dx)===2&&Math.abs(dz)===2)continue;
        hoja(wx+dx,cima,wz+dz,B.setaRojaGigante);
        if(Math.abs(dx)===2||Math.abs(dz)===2)for(let dy=1;dy<=3;dy++)hoja(wx+dx,cima-dy,wz+dz,B.setaRojaGigante);}
    }else{
      for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if(!(Math.abs(dx)===3&&Math.abs(dz)===3))hoja(wx+dx,cima,wz+dz,B.setaMarronGigante);
    }
  }else if(tipo==='mangle'){
    const base=h+2+Math.floor(r()*2), cima=base+5+Math.floor(r()*4);
    const nr=4+Math.floor(r()*3);
    for(let k=0;k<nr;k++){const a=k/nr*Math.PI*2+r()*.6;
      for(let y=base;y>=h-2;y--){const t=(base-y)/(base-h+2);tronco(wx+Math.round(Math.cos(a)*t*2.4),y,wz+Math.round(Math.sin(a)*t*2.4),B.raicesMangle);}}
    for(let y=base;y<=cima;y++)tronco(wx,y,wz,B.troncoMangle);
    bola(wx,cima,wz,2.8,B.hojasMangle); bola(wx+Math.round(r()*2-1),cima-2,wz+Math.round(r()*2-1),2.2,B.hojasMangle);
    for(let k=0;k<3;k++)if(r()<.6){const [dx,dz]=DIRF[Math.floor(r()*4)];tronco(wx+dx,cima-1-k,wz+dz,B.troncoMangle);}
  }
}
const ARBOLES_BIOMA=[
  null,null,[.003,r=>r<.15?'robleGrande':'roble'],[.05,r=>r<.2?'abedul':r<.3?'robleGrande':'roble'],null,[.004,()=>'abeto'],[.006,()=>'abeto'],
  [.045,()=>'abeto'],[.05,r=>r<.08?'roble':'abedul'],[.1,r=>r<.45?'arbusto':r<.55?'robleGrande':'jungla'],[.006,()=>'acacia'],[.014,()=>'pantano'],null,null,
  [.012,()=>'cerezo'],[.075,()=>'mangle'],[.06,()=>'palido'],
  [.1,r=>r<.05?'setaRoja':r<.1?'setaMarron':r<.82?'robleOscuro':r<.95?'roble':'abedul'],[.035,()=>'abeto'],[.0012,r=>r<.6?'roble':'abedul'],null,null,null,
  [.012,r=>r<.5?'setaRoja':'setaMarron'],[.03,r=>r<.3?'abedul':r<.4?'robleGrande':'roble'],null,[.02,r=>r<.7?'arbusto':'jungla'],null,[.075,()=>'abeto'],null,null,[.0015,()=>'roble']];

/* ---------- Superficie ---------- */
function generarSuperficie(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla;
  prepararCuevas(bx,bz,s);
  const info=[]; ch.bioma=new Uint8Array(256);
  let montana=false;
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){const inf=infoColumna(bx+x,bz+z);info.push(inf);ch.bioma[z*CX+x]=inf.bioma;if(inf.bioma===BIOMA.montana)montana=true;}
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x, wz=bz+z, {h,bioma}=info[z*CX+x];
    const agua=h<NIVEL_MAR;
    const top=Math.max(h,NIVEL_MAR);
    const frio=esBiomaFrio(bioma)||(bioma===BIOMA.rio&&info[z*CX+x].temp<.33);
    // Icebergs en el océano helado
    let iceberg=0;
    if(bioma===BIOMA.oceanoHelado){const v=fbm(wx*.035,wz*.035,s+1800,2);if(v>.66)iceberg=Math.floor((v-.66)*90);}
    if(iceberg>0)for(let y=NIVEL_MAR-Math.min(6,iceberg);y<=NIVEL_MAR+iceberg;y++)if(y>h)datos[idx(x,y,z)]=y>NIVEL_MAR+iceberg-2&&hash3(wx,y,wz,s+36)<.4?B.bloqueNieve:B.hieloCompacto;
    for(let y=0;y<=top;y++){
      let id;
      if(y<=4&&(y===0||hash3(wx,y,wz,s+5)<(5-y)/5))id=B.lecho;
      else if(y>h){if(datos[idx(x,y,z)])continue;id=(frio&&y===NIVEL_MAR&&(bioma!==BIOMA.oceanoHelado||fbm(wx*.07,wz*.07,s+37,2)<.64))?B.hielo:B.agua;}
      else if(esCuevaLocal(x,y,z,h,agua))id=y<=10?B.lava:0;
      else if(y===h){
        if(bioma===BIOMA.desierto||bioma===BIOMA.playa)id=B.arena;
        else if(esBadlands(bioma))id=B.arenaRoja;
        else if(bioma===BIOMA.manglar)id=h>NIVEL_MAR&&hash2(wx,wz,s+34)<.35?B.cesped:B.barro;
        else if(bioma===BIOMA.jardinPalido&&!agua)id=hash2(wx,wz,s+35)<.4?B.musgoPalido:B.cesped;
        else if(agua&&bioma===BIOMA.oceanoCalido)id=B.arena;
        else if(agua)id=bioma===BIOMA.rio?(hash2(wx,wz,s+31)<.2?B.arcilla:hash2(wx,wz,s+32)<.5?B.arena:B.grava):(h<NIVEL_MAR-8?B.grava:B.arena);
        else if(bioma===BIOMA.montana)id=h>172?B.bloqueNieve:h>158?B.piedra:B.cesped;
        else if(bioma===BIOMA.picosNevados)id=hash2(wx,wz,s+38)<.1?B.hieloCompacto:B.bloqueNieve;
        else if(bioma===BIOMA.champinones)id=B.micelio;
        else if(bioma===BIOMA.espigasHielo)id=B.bloqueNieve;
        else if(bioma===BIOMA.picosPiedra)id=hash2(wx,wz,s+39)<.25?B.calcita:B.piedra;
        else if((bioma===BIOMA.taigaGigante&&hash2(wx,wz,s+40)<.6)||(bioma===BIOMA.junglaBambu&&hash2(wx,wz,s+41)<.35))id=B.podzol;
        else if(frio)id=B.cespedNevado;
        else id=B.cesped;
      }else if(y>h-4){
        if(bioma===BIOMA.desierto)id=y>h-3?B.arena:B.arenisca;
        else if(esBadlands(bioma))id=B.terracota;
        else if(bioma===BIOMA.manglar)id=B.barro;
        else if(bioma===BIOMA.playa||agua)id=B.arena;
        else if(bioma===BIOMA.montana&&h>158)id=B.piedra;
        else if(bioma===BIOMA.picosNevados)id=y>h-2?B.bloqueNieve:B.piedra;
        else if(bioma===BIOMA.picosPiedra)id=B.piedra;
        else id=B.tierra;
      }else if(esBadlands(bioma)&&y>h-18&&y>NIVEL_MAR-4){
        const banda=Math.floor(hash2(Math.floor(y/2),7,s+33)*8);id=banda<6?B.terracota0+banda:B.terracota;
      }else{
        const pizarra=y<OY||(y<OY+8&&hash3(wx,y,wz,s+6)<(OY+8-y)/8);
        id=pizarra?B.pizarra:B.piedra;
      }
      if(id)datos[idx(x,y,z)]=id;
    }
  }
  generarVetas(ch,montana);
  const rc=mulberry32(Math.floor(hash2(cx,cz,s+4100)*4294967296));
  lagos(ch,info,rc);
  // Árboles (también los de columnas vecinas que asoman a este chunk)
  const poner=(x,y,z,id,soloAire)=>{const lx=x-bx,lz=z-bz;
    if(lx<0||lz<0||lx>=CX||lz>=CZ||y<0||y>=CY)return;const i=idx(lx,y,lz);const b=datos[i];
    if(soloAire&&b&&!REEMPL[b])return;if(!soloAire&&b&&SOLIDO[b]&&!esHojas(b)&&!esTronco(b)&&b!==B.tierra&&b!==B.cesped)return;datos[i]=id;};
  for(let wx=bx-4;wx<bx+CX+4;wx++)for(let wz=bz-4;wz<bz+CZ+4;wz++){
    const rh=hash2(wx,wz,s+777); if(rh>.1)continue;
    const dentro=wx>=bx&&wx<bx+CX&&wz>=bz&&wz<bz+CZ;
    const inf=dentro?info[(wz-bz)*CX+wx-bx]:infoColumna(wx,wz);
    const def=ARBOLES_BIOMA[inf.bioma]; if(!def||rh>=def[0])continue;
    const {h}=inf, mangle=inf.bioma===BIOMA.manglar; if(h<=NIVEL_MAR-(mangle?3:0))continue;
    if(dentro){const sup=datos[idx(wx-bx,h,wz-bz)];if(sup!==B.cesped&&sup!==B.cespedNevado&&sup!==B.tierra&&sup!==B.barro&&sup!==B.musgoPalido)continue;}
    const r=mulberry32(Math.floor(hash2(wx,wz,s+778)*4294967296));
    ponerArbolTipo(poner,def[1](r()),wx,h,wz,r);
    if(dentro&&!mangle)datos[idx(wx-bx,h,wz-bz)]=B.tierra;
  }
  // Vegetación
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x,wz=bz+z,{h,bioma}=info[z*CX+x];
    const sup=datos[idx(x,h,z)], arriba=h+1<CY?datos[idx(x,h+1,z)]:1;
    const r2=hash2(wx,wz,s+779), r3=hash2(wx,wz,s+780);
    const poner1=(id)=>{if(!arriba)datos[idx(x,h+1,z)]=id;};
    if(bioma===BIOMA.cerezo&&sup===B.cesped&&r2<.16){poner1(r3<.85?B.petalos:B.hierbaAlta);continue;}
    if(esBiomaFrio(bioma)){  // nieve sobre las copas de los árboles
      for(let y=Math.min(CY-2,h+24);y>h;y--){const b=datos[idx(x,y,z)];if(!b)continue;if(esHojas(b)&&!datos[idx(x,y+1,z)])datos[idx(x,y+1,z)]=B.capaNieve;break;}}
    if(sup===B.cesped&&!arriba){
      if(bioma===BIOMA.prado&&r2<.3){datos[idx(x,h+1,z)]=r3<.45?B.hierbaAlta:[B.florAmarilla,B.florRoja,B.aciano,B.margarita,B.floresSilvestres,B.aciano][Math.floor(r3*13)%6];continue;}
      if(bioma===BIOMA.llanura&&fbm(wx*.02,wz*.02,s+1900,2)>.64&&r2<.12){datos[idx(x,h+1,z)]=B.girasol;continue;}
      if(bioma===BIOMA.bosqueOscuro&&r2<.03){datos[idx(x,h+1,z)]=r3<.5?B.champinonRojo:B.champinonMarron;continue;}
    }
    if((bioma===BIOMA.pantano||bioma===BIOMA.manglar)&&h<NIVEL_MAR&&!datos[idx(x,NIVEL_MAR+1,z)]&&datos[idx(x,NIVEL_MAR,z)]===B.agua&&r2<.08){datos[idx(x,NIVEL_MAR+1,z)]=B.nenufar;continue;}
    const r4=hash2(wx,wz,s+781);
    if(bioma===BIOMA.jardinPalido&&(sup===B.cesped||sup===B.musgoPalido)&&!arriba){
      if(r4<.2){datos[idx(x,h+1,z)]=B.alfombraMusgo;continue;} if(r4<.225){datos[idx(x,h+1,z)]=B.floresOjo;continue;}}
    if(sup===B.cesped&&!arriba){
      if(bioma===BIOMA.bosque&&r4<.05){datos[idx(x,h+1,z)]=B.hojarasca;continue;}
      if((bioma===BIOMA.abedul&&r4<.04)||(bioma===BIOMA.llanura&&r4<.008)){datos[idx(x,h+1,z)]=B.floresSilvestres;continue;}
      if((bioma===BIOMA.llanura||bioma===BIOMA.bosque||bioma===BIOMA.taiga)&&r4>.985){datos[idx(x,h+1,z)]=B.arbusto;continue;}
      if((bioma===BIOMA.pantano||bioma===BIOMA.manglar||bioma===BIOMA.bosque)&&r4>.975&&h<=NIVEL_MAR+3){datos[idx(x,h+1,z)]=B.arbustoLuciernagas;continue;}
    }
    if(sup===B.cesped){
      const pasto={2:.25,3:.1,8:.1,9:.3,10:.3,11:.1,7:.05,6:.05,13:.1,17:.08,19:.2}[bioma]||.05;
      const flor={2:.03,3:.015,8:.02,11:.02,9:.01}[bioma]||0;
      if(r2<pasto)poner1(bioma===BIOMA.taiga||bioma===BIOMA.jungla&&r3<.4?B.helecho:B.hierbaAlta);
      else if(r2<pasto+flor){const f=bioma===BIOMA.pantano?B.orquidea:[B.florAmarilla,B.florRoja,B.aciano,B.margarita][Math.floor(r3*4)];poner1(f);}
      else if((bioma===BIOMA.taiga||bioma===BIOMA.bosque||bioma===BIOMA.pantano)&&r2<pasto+flor+.008)poner1(r3<.5?B.champinonRojo:B.champinonMarron);
      else if(bioma===BIOMA.llanura&&r2>.9985)poner1(B.calabaza);
      else if(bioma===BIOMA.jungla&&r2>.996)poner1(B.sandia);
      else if(bioma===BIOMA.taiga&&r2<.05+pasto)poner1(B.helecho);
    }else if(sup===B.cespedNevado||((bioma===BIOMA.nevado||bioma===BIOMA.taigaNevada)&&SOLIDO[sup]&&OPACO[sup])){if(!arriba)datos[idx(x,h+1,z)]=B.capaNieve;}
    else if((bioma===BIOMA.desierto||bioma===BIOMA.badlands)&&(sup===B.arena||sup===B.arenaRoja)){
      if(r2<.008){const a=1+Math.floor(r3*3);let ok=true;for(let k=1;k<=a;k++)if(datos[idx(x,h+k,z)])ok=false;
        if(ok&&x>0&&x<15&&z>0&&z<15)for(let k=1;k<=a;k++)datos[idx(x,h+k,z)]=B.cactus;}
      else if(r2<.02)poner1(B.arbustoSeco);
    }
    if(h===NIVEL_MAR&&(sup===B.arena||sup===B.cesped||sup===B.tierra)&&r2>.88){
      const cerca=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const X=x+a,Z=z+b;if(X<0||Z<0||X>=CX||Z>=CZ)return false;return esAgua(datos[idx(X,NIVEL_MAR,Z)]);});
      if(cerca){const a=1+Math.floor(r3*3);for(let k=1;k<=a;k++)if(!datos[idx(x,h+k,z)])datos[idx(x,h+k,z)]=B.cana;}
    }
  }
  estructurasSuperficie(ch,info,rc);
  generarV120(ch,info);
}
function lagos(ch,info,r){
  const {datos}=ch;
  if(r()<.035){
    const cx=5+Math.floor(r()*6),cz=5+Math.floor(r()*6),{h,bioma}=info[cz*CX+cx];
    if(h<=NIVEL_MAR+1||bioma===BIOMA.desierto||bioma===BIOMA.badlands||bioma===BIOMA.montana)return;
    const lava=r()<.1, rx=3+r()*2.5, rz=3+r()*2.5, prof=2+Math.floor(r()*2);
    for(let x=0;x<CX;x++)for(let z=0;z<CZ;z++){
      const d=((x-cx)/rx)**2+((z-cz)/rz)**2; if(d>=1)continue;
      const hh=info[z*CX+x].h; if(Math.abs(hh-h)>3)continue;
      const fondo=h-1-Math.floor((1-d)*prof);
      for(let y=fondo;y<=hh+3;y++){if(y<1||y>=CY)continue;const i=idx(x,y,z);
        if(y<h)datos[i]=lava?B.lava:(esBiomaFrio(info[z*CX+x].bioma)&&y===h-1?B.hielo:B.agua);
        else if(!esTronco(datos[i]))datos[i]=0;}
      if(lava)for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+a,Z=z+b;if(X>=0&&Z>=0&&X<CX&&Z<CZ){const i=idx(X,h-1,Z);if(datos[i]&&datos[i]!==B.lava)datos[i]=B.piedra;}}
      if(!lava&&fondo>0&&datos[idx(x,fondo-1,z)]===B.tierra)datos[idx(x,fondo-1,z)]=r()<.3?B.arcilla:B.arena;
    }
  }
}
/* ---------- Fortaleza (con el portal del End) y mazmorras ---------- */
function posFortaleza(){
  const a=hash2(1,2,semilla)*Math.PI*2, d=520+hash2(3,4,semilla)*260;
  return {x:Math.round(Math.cos(a)*d),y:40,z:Math.round(Math.sin(a)*d)};
}
function bloqueFortaleza(x,y,z,f,s){
  const rx=x-f.x, ry=y-f.y, rz=z-f.z;
  const piedra=()=>{const h=hash3(x,y,z,s+40);return h<.25?B.ladrillosMusgo:B.ladrillosPiedra;};
  // Sala del portal: interior x[-4,4] z[-7,7] y[1,6]
  if(Math.abs(rx)<=5&&Math.abs(rz)<=8&&ry>=0&&ry<=7){
    const borde=Math.abs(rx)===5||Math.abs(rz)===8||ry===0||ry===7;
    const puerta=(Math.abs(rz)===8||Math.abs(rx)===5)&&ry>=1&&ry<=3&&(Math.abs(rx)<=1&&Math.abs(rz)===8||Math.abs(rz)<=1&&Math.abs(rx)===5);
    if(borde&&!puerta)return piedra();
    if(ry===1&&Math.abs(rx)<=2&&rz>=1&&rz<=5){
      if(Math.abs(rx)<=1&&rz>=2&&rz<=4)return B.lava;
      return piedra();
    }
    if(ry===2){
      const marco=(Math.abs(rx)===2&&rz>=2&&rz<=4)||((rz===1||rz===5)&&Math.abs(rx)<=1);
      if(marco)return hash3(x,y,z,s+41)<.1?B.marcoEndOjo:B.marcoEnd;
    }
    if(ry===1&&rz===-5&&rx===3)return B.generador;
    return 0;
  }
  // Pasillos: hacia -z, +x y -x
  const pasillo=(u,v,len)=>{ // u: eje a lo largo, v: eje transversal
    if(u<0||u>len)return -1;
    if(Math.abs(v)>2||ry<0||ry>4)return -1;
    // sala final
    return (Math.abs(v)===2||ry===0||ry===4)?piedra():0;
  };
  const salaFinal=(u,v,len)=>{
    const du=u-len-3;
    if(Math.abs(du)>3||Math.abs(v)>3||ry<0||ry>5)return -1;
    if(Math.abs(du)===3||Math.abs(v)===3||ry===0||ry===5){
      if(du===-3&&Math.abs(v)<=1&&ry>=1&&ry<=3)return 0;
      return piedra();
    }
    if(du===2&&v===0&&ry===1)return B.cofre;
    return 0;
  };
  for(const [u,v,len] of [[-rz-9,rx,26],[rx-6,rz,22],[-rx-6,rz,30]]){
    let b=pasillo(u,v,len); if(b>=0)return b;
    b=salaFinal(u,v,len); if(b>=0)return b;
  }
  return -1;
}
/* ---------- Aldeas ---------- */
const _cacheAldeas=new Map();
function aldeaEnRegion(rx,rz){
  const k=rx+','+rz+':'+semilla; if(_cacheAldeas.has(k))return _cacheAldeas.get(k);
  let res=null;
  const s=semilla+12000;
  if(hash2(rx,rz,s)<.6){
    const x=rx*320+60+Math.floor(hash2(rx,rz,s+1)*200), z=rz*320+60+Math.floor(hash2(rx,rz,s+2)*200);
    const inf=infoColumna(x,z);
    const estilos={[BIOMA.llanura]:'llanura',[BIOMA.desierto]:'desierto',[BIOMA.sabana]:'sabana',[BIOMA.taiga]:'taiga',[BIOMA.nevado]:'taiga',[BIOMA.abedul]:'llanura',[BIOMA.taigaNevada]:'taiga',[BIOMA.prado]:'llanura'};
    if(estilos[inf.bioma]&&inf.h>NIVEL_MAR+1){
      const r=mulberry32(Math.floor(hash2(rx,rz,s+3)*4294967296));
      const al={x,z,y:inf.h,estilo:estilos[inf.bioma],brazos:[],edificios:[],farolas:[]};
      const ocupa=[[x-3,z-3,x+3,z+3]];
      const libre=(a)=>!ocupa.some(o=>a[0]<=o[2]+1&&a[2]>=o[0]-1&&a[1]<=o[3]+1&&a[3]>=o[1]-1);
      for(let d=0;d<4;d++){
        const len=16+Math.floor(r()*12); al.brazos.push({d,len});
        const [dx,dz]=DIRF[d], px=-dz, pz=dx;
        for(let dist=7;dist<len-2;dist+=8){
          if(r()<.35){const fx=x+dx*dist+px*2,fz=z+dz*dist+pz*2;al.farolas.push([fx,fz]);}
          for(const lado of [-1,1]){
            if(r()>.8)continue;
            const tipo=['casa','casa','casaGrande','granja','herreria','casa'][Math.floor(r()*6)];
            const [w,p]={casa:[5,5],casaGrande:[7,6],granja:[7,9],herreria:[6,6]}[tipo];
            const off=3+Math.ceil(Math.max(w,p)/2);
            const cx=x+dx*dist+px*lado*off, cz=z+dz*dist+pz*lado*off;
            const x0=cx-Math.floor(w/2),z0=cz-Math.floor(p/2),caja=[x0,z0,x0+w-1,z0+p-1];
            if(!libre(caja))continue;
            const hc=infoColumna(cx,cz).h; if(hc<=NIVEL_MAR||Math.abs(hc-inf.h)>8)continue;
            ocupa.push(caja);
            // la puerta mira hacia el camino
            const vx=-px*lado, vz=-pz*lado, puerta=vz<0?0:vx>0?1:vz>0?2:3;
            al.edificios.push({tipo,x0,z0,w,p,y:hc,puerta,r:Math.floor(r()*1e9)});
          }
        }
      }
      al.caja=ocupa.reduce((a,o)=>[Math.min(a[0],o[0]),Math.min(a[1],o[1]),Math.max(a[2],o[2]),Math.max(a[3],o[3])],[x-30,z-30,x+30,z+30]);
      res=al;
    }
  }
  _cacheAldeas.set(k,res); return res;
}
function aldeasCerca(x,z){
  const rx=Math.floor(x/320),rz=Math.floor(z/320),res=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const al=aldeaEnRegion(rx+a,rz+b);if(al)res.push(al);}
  return res;
}
function materialesAldea(estilo){
  return {
    llanura:{pared:B.tablones,esquina:B.tronco,suelo:B.roca,techo:B.tablones,losa:B.losaMadera},
    desierto:{pared:B.arenisca,esquina:B.arenisca,suelo:B.arenisca,techo:B.arenisca,losa:B.losaPiedra},
    sabana:{pared:B.tablones,esquina:B.troncoAcacia,suelo:B.roca,techo:B.tablones,losa:B.losaMadera},
    taiga:{pared:B.tablones,esquina:B.troncoAbeto,suelo:B.roca,techo:B.tablones,losa:B.losaMadera},
  }[estilo];
}
function construirEdificio(e,estilo,set,alt,cofre){
  const M=materialesAldea(estilo), {x0,z0,w,p,y}=e, x1=x0+w-1, z1=z0+p-1;
  const r=mulberry32(e.r);
  // cimientos y limpieza del terreno
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    const h=alt(x,z);
    for(let yy=Math.min(h,y-1);yy<y;yy++)set(x,yy,z,M.suelo);
    for(let yy=y+1;yy<=Math.max(h,y)+2;yy++)set(x,yy,z,0);
  }
  if(e.tipo==='granja'){
    const mid=x0+Math.floor(w/2);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      const borde=x===x0||x===x1||z===z0||z===z1;
      if(borde){set(x,y,z,M.esquina===B.arenisca?B.arenisca:B.tronco);continue;}
      if(x===mid){set(x,y,z,B.agua);continue;}
      set(x,y,z,B.cultivo); set(x,y+1,z,B.trigo0+Math.floor(r()*8));
    }
    return;
  }
  const alto=4;
  const [pdx,pdz]=DIRF[e.puerta];
  const puertaX=pdx? (pdx>0?x1:x0) : x0+Math.floor(w/2), puertaZ=pdz? (pdz>0?z1:z0) : z0+Math.floor(p/2);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    set(x,y,z,M.suelo);
    const bx=x===x0||x===x1, bz=z===z0||z===z1, esquina=bx&&bz;
    for(let yy=y+1;yy<y+alto;yy++){
      if(esquina)set(x,yy,z,M.esquina);
      else if(bx||bz){
        const ventana=yy===y+2&&((bx&&(z-z0)%2===0&&z!==z0&&z!==z1)||(bz&&(x-x0)%2===0&&x!==x0&&x!==x1));
        set(x,yy,z,ventana?B.panel:(e.tipo==='herreria'?B.roca:M.pared));
      }else set(x,yy,z,0);
    }
  }
  // techo escalonado
  for(let x=x0-1;x<=x1+1;x++)for(let z=z0-1;z<=z1+1;z++){
    const borde=x<x0||x>x1||z<z0||z>z1;
    set(x,y+alto,z,borde?M.losa:M.techo);
  }
  for(let x=x0+1;x<=x1-1;x++)for(let z=z0+1;z<=z1-1;z++)set(x,y+alto+1,z,M.losa);
  // puerta
  const fPuerta=[2,3,0,1][e.puerta];
  set(puertaX,y+1,puertaZ,149+fPuerta*4); set(puertaX,y+2,puertaZ,149+fPuerta*4+1);
  set(puertaX+pdx,y,puertaZ+pdz,M.suelo); set(puertaX+pdx,y+1,puertaZ+pdz,0); set(puertaX+pdx,y+2,puertaZ+pdz,0);
  // interior
  const ix=x0+1,iz=z0+1;
  if(e.tipo==='herreria'){
    set(x1-1,y+1,z1-1,B.horno); set(x1-2,y+1,z1-1,B.horno); set(x0+1,y,z1-1,B.lava);
    set(x0+1,y+1,z0+1,B.cofre); cofre(x0+1,y+1,z0+1,'herreria');
  }else{
    set(ix,y+1,iz,B.cama); set(x1-1,y+1,iz,B.mesa);
    if(e.tipo==='casaGrande'){set(x1-1,y+1,z1-1,B.cofre);cofre(x1-1,y+1,z1-1,'aldea');}
  }
  set(x0+Math.floor(w/2),y+3,z0+Math.floor(p/2),0);
  // antorcha interior en el suelo
  set(x0+Math.floor(w/2)+(pdx?-pdx:0),y+1,z0+Math.floor(p/2)+(pdz?-pdz:0),B.antorcha);
}
function estampar(ch,x0,z0,x1,z1,fn){
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  if(x1<bx||x0>bx+CX-1||z1<bz||z0>bz+CZ-1)return false;
  const set=(x,y,z,id)=>{const lx=x-bx,lz=z-bz;if(lx<0||lz<0||lx>=CX||lz>=CZ||y<1||y>=CY)return;ch.datos[idx(lx,y,lz)]=id;};
  fn(set);return true;
}
function estructuraAldea(ch,al,info){
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  const alt=(x,z)=>(x>=bx&&x<bx+CX&&z>=bz&&z<bz+CZ)?info[(z-bz)*CX+x-bx].h:infoColumna(x,z).h;
  const cofre=(x,y,z,t)=>{if(x>=bx&&x<bx+CX&&z>=bz&&z<bz+CZ)registrarCofre(DIMS.superficie,x,y,z,t);};
  // Caminos
  for(const {d,len} of al.brazos){
    const [dx,dz]=DIRF[d],px=-dz,pz=dx;
    for(let i=2;i<=len;i++)for(let k=-1;k<=1;k++){
      const x=al.x+dx*i+px*k, z=al.z+dz*i+pz*k;
      if(x<bx||x>=bx+CX||z<bz||z>=bz+CZ)continue;
      const h=alt(x,z),i2=idx(x-bx,h,z-bz),b=ch.datos[i2];
      if(b===B.cesped||b===B.tierra||b===B.arena||b===B.cespedNevado||b===B.arenaRoja){ch.datos[i2]=B.senda;const a=idx(x-bx,h+1,z-bz);if(REEMPL[ch.datos[a]])ch.datos[a]=0;}
      else if(esAgua(b))ch.datos[i2]=B.tablones;
    }
  }
  // Pozo central
  estampar(ch,al.x-2,al.z-2,al.x+1,al.z+1,set=>{
    const y=al.y;
    for(let x=al.x-2;x<=al.x+1;x++)for(let z=al.z-2;z<=al.z+1;z++){
      const dentro=x>al.x-2&&x<al.x+1&&z>al.z-2&&z<al.z+1;
      set(x,y-2,z,B.roca);
      if(dentro){set(x,y-1,z,B.agua);set(x,y,z,B.agua);set(x,y+1,z,0);}
      else{set(x,y-1,z,B.roca);set(x,y,z,B.roca);set(x,y+1,z,B.roca);}
      const esq=(x===al.x-2||x===al.x+1)&&(z===al.z-2||z===al.z+1);
      for(let yy=y+2;yy<=y+3;yy++)set(x,yy,z,esq?B.valla:0);
      set(x,y+4,z,B.losaRoca);
    }
  });
  for(const e of al.edificios)estampar(ch,e.x0-1,e.z0-1,e.x0+e.w,e.z0+e.p,set=>construirEdificio(e,al.estilo,set,alt,cofre));
  for(const [fx,fz] of al.farolas)estampar(ch,fx,fz,fx,fz,set=>{const h=alt(fx,fz);set(fx,h+1,fz,B.valla);set(fx,h+2,fz,B.valla);set(fx,h+3,fz,B.linternaCalabaza);});
}
/* ---------- Estructuras de la Superficie ---------- */
function estructurasSuperficie(ch,info,r){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla;
  const f=posFortaleza();
  if(bx+CX>f.x-45&&bx<f.x+45&&bz+CZ>f.z-45&&bz<f.z+45){
    for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)for(let y=f.y;y<=f.y+7;y++){
      const b=bloqueFortaleza(bx+x,y,bz+z,f,s);
      if(b>=0){datos[idx(x,y,z)]=b;if(b===B.cofre)registrarCofre(DIMS.superficie,bx+x,y,bz+z,'fortaleza');}
    }
  }
  // Mazmorra
  if(hash2(cx,cz,s+900)<.035){
    const cy=18+Math.floor(hash2(cx,cz,s+901)*50), oz=bz+8;
    for(let z=3;z<=13;z++)for(let x=3;x<=13;x++)for(let y=cy;y<=cy+5;y++){
      const rx=x-8,rz=z-8,ry=y-cy,i=idx(x,y,z);
      const borde=Math.abs(rx)===5||Math.abs(rz)===5||ry===0||ry===5;
      if(borde){if(datos[i])datos[i]=ry===0&&hash3(x,y,z,s+44)<.5?B.rocaMusgo:B.roca;}
      else datos[i]=0;
    }
    datos[idx(8,cy+1,8)]=B.generador;
    datos[idx(4,cy+1,8)]=B.cofre; registrarCofre(DIMS.superficie,bx+4,cy+1,oz,'mazmorra');
    if(hash2(cx,cz,s+902)<.5){datos[idx(12,cy+1,8)]=B.cofre;registrarCofre(DIMS.superficie,bx+12,cy+1,oz,'mazmorra');}
  }
  const centro=info[8*CX+8], hC=centro.h;
  // Portal en ruinas
  if(hash2(cx,cz,s+950)<.006&&hC>NIVEL_MAR){
    const rr=mulberry32(Math.floor(hash2(cx,cz,s+951)*4294967296));
    for(let k=0;k<30;k++){const x=4+Math.floor(rr()*8),z=4+Math.floor(rr()*8),h=info[z*CX+x].h;if(Math.abs(h-hC)<3)datos[idx(x,h,z)]=rr()<.8?B.netherrack:B.bloqueOro;}
    for(let a=-1;a<=2;a++)for(let hh=0;hh<=4;hh++){
      const marco=a===-1||a===2||hh===0||hh===4; const x=6+a,y=hC+hh,z=8;
      if(marco){if(rr()<.72)datos[idx(x,y,z)]=rr()<.2?B.obsidianaLlorosa:B.obsidiana;}
      else datos[idx(x,y,z)]=0;
    }
    for(let k=0;k<3;k++){const x=4+Math.floor(rr()*8),z=4+Math.floor(rr()*8),h=info[z*CX+x].h;datos[idx(x,h+1,z)]=B.obsidiana;}
    datos[idx(5,hC+1,11)]=B.cofre; registrarCofre(DIMS.superficie,bx+5,hC+1,bz+11,'portalRuinas');
  }
  // Pozo del desierto
  if(centro.bioma===BIOMA.desierto&&hash2(cx,cz,s+960)<.01){
    for(let x=6;x<=10;x++)for(let z=6;z<=10;z++){datos[idx(x,hC,z)]=B.arenisca;for(let y=hC+1;y<=hC+5;y++)datos[idx(x,y,z)]=0;}
    datos[idx(8,hC,8)]=B.agua; datos[idx(8,hC-1,8)]=B.agua;
    for(let x=7;x<=9;x++)for(let z=7;z<=9;z++){if(x!==8||z!==8)datos[idx(x,hC+1,z)]=B.arenisca;datos[idx(x,hC+4,z)]=B.arenisca;}
    for(const [x,z] of [[7,7],[9,7],[7,9],[9,9]])for(let y=hC+2;y<=hC+3;y++)datos[idx(x,y,z)]=B.arenisca;
  }
  for(const al of aldeasCerca(bx+8,bz+8)){const c=al.caja;if(bx+CX>c[0]&&bx<=c[2]&&bz+CZ>c[1]&&bz<=c[3])estructuraAldea(ch,al,info);}
}

/* =========================================================
   Generación del Nether
   ========================================================= */
const _rejN=new Float32Array(5*5*GNY);
const BN={desierto:0,carmesi:1,distorsionado:2,valle:3,deltas:4};
const NOMBRES_BIOMA_NETHER=['Desiertos del Nether','Bosque carmesí','Bosque distorsionado','Valle de almas','Deltas de basalto'];
const NIEBLA_NETHER=[0x3a100a,0x4a0808,0x0e2a30,0x1a2a36,0x3a3440];
function biomaNether(x,z){
  const s=semilla+7100, v1=fbm(x*.009,z*.009,s,3), v2=fbm(x*.009,z*.009,s+1,3);
  if(v1>.57)return BN.carmesi; if(v1<.43)return BN.distorsionado;
  if(v2>.57)return BN.valle; if(v2<.43)return BN.deltas;
  return BN.desierto;
}
function generarNether(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla+7000;
  for(let gx=0;gx<5;gx++)for(let gz=0;gz<5;gz++)for(let gy=0;gy<GNY;gy++){
    const x=bx+gx*GR,z=bz+gz*GR,y=gy*GR;
    _rejN[(gy*5+gz)*5+gx]=valueNoise3(x/26,y/16,z/26,s)*.7+valueNoise3(x/9,y/9,z/9,s+1)*.3;
  }
  ch.biomaN=new Uint8Array(256);
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x,wz=bz+z, bio=biomaNether(wx,wz); ch.biomaN[z*CX+x]=bio;
    const almas=fbm(wx*.04,wz*.04,s+5,2)>.6;
    for(let y=OY;y<CY;y++){
      let id=0;
      if(y<=OY+4&&(y===OY||hash3(wx,y,wz,s+2)<(OY+5-y)/5))id=B.lecho;
      else if(y>=CY-5&&(y===CY-1||hash3(wx,y,wz,s+3)<(y-(CY-6))/5))id=B.lecho;
      else{
        const t=(y-OY)/127;
        const d=muestraRejilla(_rejN,x,y,z)+Math.max(0,.24-t)*3+Math.max(0,t-.8)*3;
        if(d>.6){
          id=B.netherrack;
          const r=hash3(wx,y,wz,s+4);
          if(bio===BN.deltas)id=r<.45?B.basalto:r<.9?B.piedraNegra:B.netherrack;
          else if(bio===BN.valle&&y<OY+60)id=r<.5?B.arenaAlmas:B.sueloAlmas;
          else if(almas&&y<OY+45&&bio===BN.desierto)id=B.arenaAlmas;
          if(id===B.netherrack||id===B.piedraNegra){
            if(hash3(wx>>1,y>>1,wz>>1,s+6)<.03&&r<.6)id=B.menaCuarzo;
            else if(hash3(wx>>1,y>>1,wz>>1,s+7)<.012&&r<.5)id=B.menaOroNether;}
        }else if(y<=OY+31)id=bio===BN.deltas&&hash3(wx,y,wz,s+9)<.3&&y===OY+31?B.bloqueMagma:B.lava;
      }
      if(id)datos[idx(x,y,z)]=id;
    }
  }
  // Restos ancestrales (Y 8-22, muy escasos y ocultos)
  const rd=mulberry32(Math.floor(hash2(cx,cz,s+60)*4294967296));
  for(let k=0;k<2;k++){
    const x=Math.floor(rd()*16),z=Math.floor(rd()*16),y=OY+8+Math.round((rd()+rd())/2*14), n=rd()<.35?2:1;
    for(let q=0;q<n;q++){const X=Math.min(15,x+q),i=idx(X,y,z);if(datos[i]===B.netherrack||datos[i]===B.basalto||datos[i]===B.piedraNegra)datos[i]=B.restosAncestrales;}
  }
  // Superficies y vegetación de cada bioma
  const r=mulberry32(Math.floor(hash2(cx,cz,s+50)*4294967296));
  const hongoGigante=(x,y,z,dist)=>{
    const alto=4+Math.floor(r()*5), tallo=dist?B.talloDistorsionado:B.talloCarmesi, verr=dist?B.verrugaDistBloque:B.verrugaBloque;
    const set=(X,Y,Z,id,solo)=>{if(X<0||Z<0||X>=CX||Z>=CZ||Y>=CY-5)return;const i=idx(X,Y,Z);if(solo&&datos[i])return;datos[i]=id;};
    for(let k=1;k<=alto;k++)set(x,y+k,z,tallo,false);
    const rad=2+Math.floor(r()*2);
    for(let dy=-2;dy<=1;dy++)for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++){
      const borde=Math.abs(dx)===rad||Math.abs(dz)===rad;
      if(dy===1&&(Math.abs(dx)>rad-1||Math.abs(dz)>rad-1))continue;
      if(dy<1&&!borde)continue;
      if(dy<0&&r()<.4)continue;
      set(x+dx,y+alto+dy,z+dz,r()<.08?B.luzHongo:verr,true);
    }
  };
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const bio=ch.biomaN[z*CX+x];
    for(let y=OY+6;y<CY-8;y++){
      const i=idx(x,y,z), abajo=datos[idx(x,y-1,z)];
      if(datos[i]||!abajo||esLiquido(abajo)||abajo===B.lecho)continue;
      // superficie
      if(bio===BN.carmesi&&abajo===B.netherrack)datos[idx(x,y-1,z)]=B.nilioCarmesi;
      if(bio===BN.distorsionado&&abajo===B.netherrack)datos[idx(x,y-1,z)]=B.nilioDistorsionado;
      const rr=r();
      if(bio===BN.carmesi||bio===BN.distorsionado){
        const dist=bio===BN.distorsionado;
        if(rr<.012&&x>2&&x<13&&z>2&&z<13)hongoGigante(x,y-1,z,dist);
        else if(rr<.12)datos[i]=dist?B.raicesDist:B.raicesCarmesi;
        else if(rr<.16)datos[i]=dist?B.hongoDist:B.hongoCarmesi;
      }else if(bio===BN.deltas){
        if(rr<.03){const h=2+Math.floor(r()*5);for(let k=0;k<h&&!datos[idx(x,y+k,z)];k++)datos[idx(x,y+k,z)]=B.basalto;}
        else if(rr<.12&&abajo!==B.lava)datos[idx(x,y-1,z)]=B.bloqueMagma;
      }else if(bio===BN.valle){
        if(rr<.006){const h=3+Math.floor(r()*4);for(let k=0;k<h&&!datos[idx(x,y+k,z)];k++)datos[idx(x,y+k,z)]=B.bloqueHueso;}
        else if(rr<.02&&(abajo===B.arenaAlmas||abajo===B.sueloAlmas))datos[i]=B.fuegoAlmas;
      }else if(rr<.004&&abajo===B.netherrack)datos[i]=B.fuego;
    }
  }
  // Piedra luminosa colgando del techo
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)for(let y=OY+80;y<CY-6;y++){
    const i=idx(x,y,z);
    if(datos[i]===0&&datos[idx(x,y+1,z)]===B.netherrack&&hash3(bx+x,y,bz+z,s+8)<.006){
      const n=2+Math.floor(hash3(bx+x,y,bz+z,s+9)*5);
      for(let k=0;k<n;k++){
        const dx=k?Math.floor(hash3(k,x,y,s)*3)-1:0,dz=k?Math.floor(hash3(k,z,y,s+1)*3)-1:0,dy=-Math.floor(k/2);
        const X=x+dx,Z=z+dz,Y=y+dy; if(X<0||Z<0||X>=CX||Z>=CZ)continue;
        if(!datos[idx(X,Y,Z)])datos[idx(X,Y,Z)]=B.piedraLuminosa;}
    }
  }
  // Cascadas de lava que caen del techo
  for(let k=0;k<2;k++){
    if(hash2(cx*7+k,cz,s+80)>.28)continue;
    const x=1+Math.floor(hash2(cx,cz*5+k,s+81)*14),z=1+Math.floor(hash2(cx+k,cz,s+82)*14);
    for(let y=CY-7;y>OY+40;y--){
      const i=idx(x,y,z);
      if(datos[i]||datos[idx(x,y+1,z)]!==B.netherrack)continue;
      let fondo=y; while(fondo>OY+6&&!datos[idx(x,fondo-1,z)])fondo--;
      if(y-fondo<6)break;
      datos[idx(x,y+1,z)]=B.lava;
      for(let yy=y;yy>=fondo;yy--)datos[idx(x,yy,z)]=B.lava+1;
      break;
    }
  }
  estructurasNether(ch);
  // Ghasts secos en el valle de almas (1.21.6)
  if(hash2(cx,cz,s+70)<.12){const x=2+Math.floor(hash2(cx,cz,s+71)*12),z=2+Math.floor(hash2(cx,cz,s+72)*12);
    if(ch.biomaN[z*CX+x]===BN.valle)for(let y=OY+34;y<OY+90;y++){const a=datos[idx(x,y,z)],b=datos[idx(x,y+1,z)];
      if((a===B.arenaAlmas||a===B.sueloAlmas)&&!b){datos[idx(x,y+1,z)]=B.ghastSeco;(ch.fantasmas||(ch.fantasmas=[])).push([x,y+1,z]);break;}}}
}
function fortalezaNetherEn(rx,rz){
  const s=semilla+8000;
  if(hash2(rx,rz,s)>.8)return null;
  return {x:rx*176+40+Math.floor(hash2(rx,rz,s+1)*96),y:OY+64,z:rz*176+40+Math.floor(hash2(rx,rz,s+2)*96)};
}
function fortalezasCerca(x,z){
  const rx=Math.floor(x/176),rz=Math.floor(z/176),res=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const f=fortalezaNetherEn(rx+a,rz+b);if(f)res.push(f);}
  return res;
}
function bloqueFortalezaNether(x,y,z,f){
  const rx=x-f.x, ry=y-f.y, rz=z-f.z;
  const L=46;
  const enX=Math.abs(rz)<=2&&Math.abs(rx)<=L, enZ=Math.abs(rx)<=2&&Math.abs(rz)<=L;
  const plaza=Math.abs(rx)<=7&&Math.abs(rz)<=7;
  if(!(enX||enZ||plaza))return -1;
  if(ry===0)return (plaza&&rx<=-4&&rx>=-6&&rz>=4&&rz<=6)?B.arenaAlmas:B.ladrilloNether;
  if(ry<0){
    const pilar=(enX&&Math.abs(rz)<=1&&((rx%8)+8)%8===0)||(enZ&&Math.abs(rx)<=1&&((rz%8)+8)%8===0)||(plaza&&Math.abs(rx)===7&&Math.abs(rz)===7);
    return pilar&&ry>-60?B.ladrilloNether:-1;
  }
  if(ry>5)return -1;
  if(plaza){
    const borde=Math.abs(rx)===7||Math.abs(rz)===7;
    const abertura=(Math.abs(rx)<=2&&Math.abs(rz)===7)||(Math.abs(rz)<=2&&Math.abs(rx)===7);
    if(borde&&!abertura)return ry<=2?B.ladrilloNether:0;
    if(ry===1&&rx===0&&rz===0)return B.generador;
    if(ry===1&&rx===5&&rz===5)return B.cofre;
    if(ry===1&&rx<=-4&&rx>=-6&&rz>=4&&rz<=6)return B.verruga0+Math.floor(hash3(x,y,z,semilla)*4);
    if(ry===5)return B.ladrilloNether;
    return 0;
  }
  const lado=enX?Math.abs(rz)===2:Math.abs(rx)===2;
  if(lado)return ry===1?B.ladrilloNether:0;
  const extremo=enX?Math.abs(rx)===L:Math.abs(rz)===L;
  if(extremo&&ry===1&&(rx===0||rz===0))return B.generador;
  return 0;
}
function estructurasNether(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ;
  for(const f of fortalezasCerca(bx+8,bz+8)){
    if(bx+CX<f.x-50||bx>f.x+50||bz+CZ<f.z-50||bz>f.z+50)continue;
    for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)for(let y=f.y-60;y<=f.y+5;y++){
      const b=bloqueFortalezaNether(bx+x,y,bz+z,f);
      if(b>=0){datos[idx(x,y,z)]=b;if(b===B.cofre)registrarCofre(DIMS.nether,bx+x,y,bz+z,'fortalezaNether');}
    }
  }
}

/* =========================================================
   Generación del End
   ========================================================= */
const END_TOP=OY+60;   // superficie de la isla (Y 60)
const EPY=END_TOP+3;   // base del portal de salida
const PILARES=Array.from({length:10},(_,i)=>{const a=Math.PI*2*i/10+.3;
  return {x:Math.round(Math.cos(a)*42),z:Math.round(Math.sin(a)*42),r:2+(i*7)%4,alto:OY+76+3*((i*3)%10)};});
function generarEnd(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla+9000;
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x,wz=bz+z,d=Math.hypot(wx,wz);
    const R=76+fbm(wx*.02,wz*.02,s,2)*26;
    if(d<R){
      const f=1-d/R;
      const top=END_TOP+Math.round(f*3+fbm(wx*.08,wz*.08,s+1,2)*2);
      const bot=top-Math.round(4+f*46*(.6+.4*fbm(wx*.05,wz*.05,s+2,2)));
      for(let y=bot;y<=top;y++)datos[idx(x,y,z)]=B.piedraEnd;
    }
    for(const p of PILARES){
      const dd=(wx-p.x)**2+(wz-p.z)**2;
      if(dd<=p.r*p.r+p.r*.5)for(let y=END_TOP-20;y<=p.alto;y++)datos[idx(x,y,z)]=B.obsidiana;
      if(wx===p.x&&wz===p.z)datos[idx(x,p.alto+1,z)]=B.lecho;
    }
    // Portal de salida (inactivo hasta vencer al dragón)
    const r=Math.hypot(wx,wz);
    if(r<3.5){
      datos[idx(x,EPY,z)]=B.lecho;
      for(let y=EPY+1;y<=EPY+8;y++)datos[idx(x,y,z)]=0;
      if(r>=2.5)datos[idx(x,EPY+1,z)]=B.lecho;
      if(wx===0&&wz===0)for(let y=EPY+1;y<=EPY+4;y++)datos[idx(x,y,z)]=B.lecho;
    }
    if(d>600)generarIslaExterior(datos,x,z,wx,wz);
    // Plataforma de obsidiana de llegada
    if(Math.abs(wx-100)<=2&&Math.abs(wz)<=2){
      datos[idx(x,OY+48,z)]=B.obsidiana;
      for(let y=OY+49;y<=OY+51;y++)datos[idx(x,y,z)]=0;
    }
  }
  if(Math.hypot(bx+8,bz+8)>620)construirCiudadEnd(ch);
}

/* ---------- Islas exteriores del End ---------- */
function salidaAcceso(){const a=(semilla%628)/100;return [Math.round(Math.cos(a)*1000),Math.round(Math.sin(a)*1000)];}
function columnaEnd(wx,wz){
  const s=semilla+9100;
  let m=fbm(wx*.011,wz*.011,s,3)*1.25-.62+fbm(wx*.04,wz*.04,s+3,2)*.12;
  const [px,pz]=salidaAcceso(), dp=Math.hypot(wx-px,wz-pz);
  if(dp<24)m=Math.max(m,.28*(1-dp/24)+.05);
  if(m<=0)return null;
  const top=END_TOP-4+Math.round(m*14+fbm(wx*.06,wz*.06,s+5,2)*2);
  return {top,bot:top-Math.round(3+m*55),m};
}
function generarIslaExterior(datos,x,z,wx,wz){
  const c=columnaEnd(wx,wz); if(!c)return;
  for(let y=Math.max(1,c.bot);y<=c.top;y++)datos[idx(x,y,z)]=B.piedraEnd;
  // Plantas coro
  if(c.m>.08&&hash2(wx,wz,semilla+77)<.004){
    const r=mulberry32(Math.floor(hash2(wx,wz,semilla+78)*1e9));
    const alto=3+Math.floor(r()*5);
    for(let y=1;y<=alto;y++)datos[idx(x,c.top+y,z)]=B.plantaCoro;
    datos[idx(x,c.top+alto+1,z)]=B.florCoro;
    for(let k=0;k<3;k++){if(r()<.5)continue;const [dx,dz]=DIRF[Math.floor(r()*4)];const nx=x+dx,nz=z+dz;if(nx<0||nx>=CX||nz<0||nz>=CZ)continue;
      const y0=c.top+2+Math.floor(r()*(alto-1));const l=1+Math.floor(r()*3);
      for(let y=y0;y<y0+l;y++)datos[idx(nx,y,nz)]=B.plantaCoro;datos[idx(nx,y0+l,nz)]=B.florCoro;}
  }
}
// Ciudades del End: una por región de 96x96 bloques en las islas exteriores
function ciudadesCerca(cx,cz){
  const res=[],R=96,x0=Math.floor((cx*CX-60)/R),x1=Math.floor((cx*CX+CX+60)/R),z0=Math.floor((cz*CZ-60)/R),z1=Math.floor((cz*CZ+CZ+60)/R);
  for(let rx=x0;rx<=x1;rx++)for(let rz=z0;rz<=z1;rz++){
    const h=hash2(rx,rz,semilla+555); if(h>.55)continue;
    const x=rx*R+16+Math.floor(hash2(rx,rz,semilla+556)*64), z=rz*R+16+Math.floor(hash2(rx,rz,semilla+557)*64);
    if(Math.hypot(x,z)<750)continue;
    const c=columnaEnd(x,z); if(!c||c.m<.1)continue;
    res.push({x,z,y:c.top+1,alto:14+Math.floor(hash2(rx,rz,semilla+558)*14),rnd:mulberry32(Math.floor(h*1e9))});
  }
  return res;
}
// Datos de la ciudad que se usan también al jugar (barco, shulkers)
function datosCiudadEnd(c){
  const t=c.y+4+c.alto, barco=hash2(c.x,c.z,semilla+559)<.65;
  return {t,barco,bx:c.x-26,by:t+8,bz:c.z};
}
function construirCiudadEnd(ch){
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  for(const c of ciudadesCerca(ch.cx,ch.cz)){
    const pon=(x,y,z,b)=>{const lx=x-bx,lz=z-bz;if(lx<0||lx>=CX||lz<0||lz>=CZ||y<1||y>=CY)return;ch.datos[idx(lx,y,lz)]=b;
      if(b===B.cofre)registrarCofre(DIMS.end,x,y,z,'ciudadEnd');};
    const caja=(x0,y0,z0,x1,y1,z1,borde,dentro)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
      const b=(x===x0||x===x1||z===z0||z===z1||y===y0||y===y1);pon(x,y,z,b?borde:dentro);}};
    const VM=VIDRIO_COLOR[10], D=datosCiudadEnd(c), t=D.t;
    const esquinas=(x0,z0,x1,z1,y0,y1,b)=>{for(let y=y0;y<=y1;y++)for(const [x,z] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]])pon(x,y,z,b);};
    const varas=(x0,z0,x1,z1,y)=>{for(const [x,z,dx,dz] of [[x0,z0,-1,-1],[x1,z0,1,-1],[x0,z1,-1,1],[x1,z1,1,1]]){pon(x+dx,y,z,B.varaEnd);pon(x,y,z+dz,B.varaEnd);}};
    // Cimientos escalonados
    for(let x=c.x-7;x<=c.x+7;x++)for(let z=c.z-7;z<=c.z+7;z++){const d=Math.max(Math.abs(x-c.x),Math.abs(z-c.z));
      for(let y=c.y-6;y<c.y;y++)if(d<=7-Math.max(0,c.y-1-y))pon(x,y,z,B.ladrillosEnd);}
    // Casa de la base
    caja(c.x-5,c.y,c.z-5,c.x+5,c.y+4,c.z+5,B.purpur,0);
    esquinas(c.x-5,c.z-5,c.x+5,c.z+5,c.y,c.y+4,B.pilarPurpur);
    for(let x=c.x-4;x<=c.x+4;x++)for(let z=c.z-4;z<=c.z+4;z++)pon(x,c.y,z,((x+z)&1)?B.ladrillosEnd:B.purpur);
    for(const dx of [-2,2])for(const dz of [-5,5]){pon(c.x+dx,c.y+2,c.z+dz,VM);pon(c.x+dx,c.y+3,c.z+dz,VM);}
    for(let y=c.y+1;y<=c.y+3;y++){pon(c.x,y,c.z-5,0);pon(c.x-1,y,c.z-5,0);}
    varas(c.x-5,c.z-5,c.x+5,c.z+5,c.y+4);
    // Torre principal
    const r=3, y0=c.y+4;
    caja(c.x-r,y0,c.z-r,c.x+r,t,c.z+r,B.purpur,0);
    esquinas(c.x-r,c.z-r,c.x+r,c.z+r,y0,t,B.pilarPurpur);
    for(let y=y0;y<t;y++)pon(c.x+r-1,y,c.z,146);
    for(let y=y0+5;y<t;y+=5){
      for(let x=c.x-r+1;x<c.x+r;x++)for(let z=c.z-r+1;z<c.z+r;z++)if(x!==c.x+r-1||z!==c.z)pon(x,y,z,B.purpur);
      for(const [x,z] of [[c.x-r,c.z],[c.x,c.z+r],[c.x,c.z-r]]){pon(x,y+2,z,VM);pon(x,y+3,z,VM);}
      varas(c.x-r,c.z-r,c.x+r,c.z+r,y);
    }
    // Rama con puente y torre secundaria
    const ym=y0+5*Math.max(1,Math.floor(c.alto/10));
    for(let x=c.x+r;x<=c.x+r+9;x++)for(let z=c.z-1;z<=c.z+1;z++){pon(x,ym,z,B.purpur);if(Math.abs(z-c.z)===1)pon(x,ym+1,z,B.ladrillosEnd);}
    for(let y=ym+1;y<=ym+2;y++)pon(c.x+r,y,c.z,0);
    const sx=c.x+r+12;
    caja(sx-2,ym-6,c.z-2,sx+2,ym+6,c.z+2,B.purpur,0);
    esquinas(sx-2,c.z-2,sx+2,c.z+2,ym-6,ym+6,B.pilarPurpur);
    for(let y=ym+1;y<=ym+2;y++)pon(sx-2,y,c.z,0);
    for(let x=sx-1;x<=sx+1;x++)for(let z=c.z-1;z<=c.z+1;z++)pon(x,ym,z,B.purpur);
    pon(sx,ym+1,c.z+1,B.cofre); pon(sx+1,ym+1,c.z-1,B.varaEnd);
    for(let y=ym+7;y<=ym+9;y++)pon(sx,y,c.z,y===ym+9?B.varaEnd:B.pilarPurpur);
    varas(sx-2,c.z-2,sx+2,c.z+2,ym+6);
    // Sala superior con ventanas y tejado piramidal
    caja(c.x-5,t,c.z-5,c.x+5,t+6,c.z+5,B.purpur,0);
    for(let x=c.x-4;x<=c.x+4;x++)for(let z=c.z-4;z<=c.z+4;z++)pon(x,t,z,(Math.abs(x-c.x)+Math.abs(z-c.z))%3===0?B.purpur:B.ladrillosEnd);
    pon(c.x+r-1,t,c.z,0);
    for(let k=-3;k<=3;k++)for(const [x,z] of [[c.x+k,c.z-5],[c.x+k,c.z+5],[c.x-5,c.z+k],[c.x+5,c.z+k]]){pon(x,t+3,z,VM);if(Math.abs(k)<=1)pon(x,t+4,z,VM);}
    esquinas(c.x-5,c.z-5,c.x+5,c.z+5,t,t+6,B.pilarPurpur);
    for(let L=0;L<=5;L++)for(let x=c.x-5+L;x<=c.x+5-L;x++)for(let z=c.z-5+L;z<=c.z+5-L;z++)
      if(x===c.x-5+L||x===c.x+5-L||z===c.z-5+L||z===c.z+5-L)pon(x,t+7+L,z,B.purpur);
    for(let y=t+13;y<=t+15;y++)pon(c.x,y,c.z,B.varaEnd);
    for(const [dx,dz] of [[-4,-4],[4,-4],[-4,4],[4,4]])pon(c.x+dx,t+1,c.z+dz,B.varaEnd);
    pon(c.x-2,t+1,c.z+4,B.cofre);pon(c.x+2,t+1,c.z+4,B.cofre);
    if(!D.barco){ // sin barco: los élitros esperan en la sala superior
      pon(c.x,t+1,c.z,B.obsidiana);pon(c.x,t+2,c.z,B.cofre);
      const k=DIMS.end.clave+':'+clavePos(c.x,t+2,c.z);
      if(!cofres[k]){const cf=new Array(27).fill(null);cf[13]=crearPila(I.elitros);cf[4]=crearPila(I.cohete,8);cofres[k]=cf;}
    }
    // Barco del End flotando junto a la ciudad
    if(D.barco){
      const X0=D.bx-10, Y=D.by, Z=D.bz;
      for(let u=0;u<=21;u++){
        const w=u<3?1:u>17?Math.max(0,21-u):3, x=X0+u;
        for(let v=-w;v<=w;v++){
          pon(x,Y,Z+v,B.purpur);
          if(Math.abs(v)===w){pon(x,Y+1,Z+v,B.purpur);if(u%3===0)pon(x,Y+2,Z+v,B.varaEnd);}
          else pon(x,Y+1,Z+v,0);
          if(Math.abs(v)<w&&u>2&&u<18){pon(x,Y-1,Z+v,B.purpur);if(Math.abs(v)<w-1)pon(x,Y-2,Z+v,B.obsidiana);}
        }
      }
      // Camarote bajo cubierta
      for(let x=X0+6;x<=X0+14;x++)for(let z=Z-2;z<=Z+2;z++)for(let y=Y-3;y<=Y-1;y++){
        const borde=x===X0+6||x===X0+14||Math.abs(z-Z)===2||y===Y-3;pon(x,y,z,borde?B.ladrillosEnd:0);}
      pon(X0+10,Y,Z,0); for(let y=Y-2;y<=Y;y++)pon(X0+10,y,Z+1,145+1);
      pon(X0+8,Y-2,Z-1,B.cofre); pon(X0+12,Y-2,Z-1,B.cofre); pon(X0+7,Y-2,Z+1,B.varaEnd); pon(X0+13,Y-2,Z+1,B.varaEnd);
      // Mástil y velas
      for(let y=Y+1;y<=Y+12;y++)pon(X0+10,y,Z,B.pilarPurpur);
      for(let y=Y+5;y<=Y+10;y++)for(let v=-3;v<=3;v++)if(v)pon(X0+10,y,Z+v,LANA_COLOR[15]);
      for(let y=Y+1;y<=Y+4;y++)pon(X0+17,y,Z,B.pilarPurpur);
      for(let y=Y+2;y<=Y+4;y++)for(let v=-2;v<=2;v++)if(v)pon(X0+17,y,Z+v,LANA_COLOR[15]);
      pon(X0+21,Y+1,Z,B.cabezaDragon);
    }
  }
}

/* =========================================================
   Carga y descarga alrededor del jugador
   ========================================================= */
let radio=6, offsets=[];
function calcularOffsets(){
  offsets=[];for(let x=-radio;x<=radio;x++)for(let z=-radio;z<=radio;z++)if(x*x+z*z<=radio*radio+1)offsets.push([x,z,x*x+z*z]);
  offsets.sort((a,b)=>a[2]-b[2]);
}
function gestionarChunks(presupuestoMs,px,pz){
  const pcx=Math.floor(px/CX), pcz=Math.floor(pz/CZ);
  const t0=performance.now();
  for(const [ox,oz] of offsets){
    const ch=obtenerChunk(pcx+ox,pcz+oz);
    if(!ch.malla){construirMallaChunk(ch);if(performance.now()-t0>presupuestoMs)break;}
  }
  // Chunks sucios (bloques cambiados)
  if(chunksSucios.size){
    const lista=[...chunksSucios].sort((a,b)=>((a.cx-pcx)**2+(a.cz-pcz)**2)-((b.cx-pcx)**2+(b.cz-pcz)**2));
    for(const ch of lista){
      chunksSucios.delete(ch);
      if(ch.malla&&ch.dim===dim)construirMallaChunk(ch);
      if(performance.now()-t0>presupuestoMs+8)break;
    }
  }
  const lim=radio+2;
  for(const [k,ch] of dim.chunks){
    const dx=Math.abs(ch.cx-pcx),dz=Math.abs(ch.cz-pcz);
    if(ch.malla&&(dx>lim||dz>lim))quitarMallaChunk(ch);
    if(dx>lim+3||dz>lim+3){quitarMallaChunk(ch);dim.chunks.delete(k);chunksSucios.delete(ch);}
  }
}
