"use strict";
/* =========================================================
   One Block: empiezas sobre un único bloque flotando en el
   vacío. Cada vez que lo rompes aparece otro, siguiendo
   fases cada vez más avanzadas (llanuras, subterráneo,
   tundra, jungla, océano, desierto, cavernas profundas,
   Nether, ciudad antigua y el End), con cofres de botín y
   criaturas. Al llegar al End se construye su portal.
   ========================================================= */
const OB={x:0,y:NIVEL_MAR+10,z:0};
const FASES_OB=[
  {nombre:'Llanuras',n:0,col:'#6fc04a',botin:'aldea',mobs:['cerdo','vaca','oveja','gallina'],
    bloques:[['cesped',30],['tierra',20],['tronco',18],['hojas',8],['piedra',8],['arena',5],['arcilla',3],['calabaza',2],['sandia',2]],
    extra:()=>[[I.cuboAgua,1],[88,2],[I.semillas,4],[I.harinaHueso,3]]},
  {nombre:'Subterráneo',n:80,col:'#8a8a8a',botin:'mina',mobs:['zombi','esqueleto','arana'],
    bloques:[['piedra',30],['roca',14],['grava',8],['andesita',6],['granito',6],['diorita',6],['menaCarbon',12],['menaHierro',9],['menaCobre',6],['menaOro',2],['tierra',4]],
    extra:()=>[[I.cuboLava,1],[B.antorcha,8]]},
  {nombre:'Tundra helada',n:200,col:'#bfe4ff',botin:'iglu',mobs:['oveja','zombi','esqueleto'],
    bloques:[['bloqueNieve',18],['hielo',14],['hieloCompacto',12],['cespedNevado',14],['troncoAbeto',16],['hojasAbeto',6],['piedra',10],['menaLapis',4]],
    extra:()=>[[103,2],[I.pan,4]]},
  {nombre:'Jungla',n:330,col:'#2fa82a',botin:'templo',mobs:['gallina','creeper','arana'],
    bloques:[['troncoJungla',22],['hojasJungla',12],['cesped',16],['tierra',10],['sandia',6],['troncoRobleOscuro',10],['troncoCerezo',8],['barro',6],['troncoMangle',6]],
    extra:()=>[[104,2],[1466,2],[1297,1]]},
  {nombre:'Océano',n:460,col:'#3a8ad8',botin:'naufragio',mobs:['zombi','bruja'],
    bloques:[['arena',24],['arcilla',14],['grava',12],['prismarina',14],['ladrillosPrismarina',6],['prismarinaOscura',4],['farolMarino',3],['esponja',2]],
    extra:()=>[[I.cuboAgua,1],[I.esmeralda,3]]},
  {nombre:'Desierto',n:600,col:'#e0c870',botin:'piramide',mobs:['camello','zombi','esqueleto'],
    bloques:[['arena',24],['arenisca',18],['arenaRoja',14],['terracota',14],['grava',6],['menaOro',4],['arcilla',4]],
    extra:()=>[[B.cactus,2],[B.cana,3]]},
  {nombre:'Cavernas profundas',n:760,col:'#4a4a58',botin:'mazmorra',mobs:['creeper','esqueleto','enderman','slime'],
    bloques:[['pizarra',28],['pHierro',10],['pOro',6],['pRedstone',8],['pDiamante',3],['menaLapis',5],['obsidiana',6],['toba',8],['menaEsmeralda',2]],
    extra:()=>[[I.diamante,2],[I.cuboAgua,1]]},
  {nombre:'Nether',n:940,col:'#b03a2a',botin:'fortalezaNether',mobs:['piglin','cuboMagma','blaze'],
    bloques:[['netherrack',30],['arenaAlmas',12],['sueloAlmas',8],['basalto',10],['piedraNegra',10],['menaCuarzo',10],['menaOroNether',8],['piedraLuminosa',6],['bloqueMagma',5],['nilioCarmesi',5],['talloCarmesi',6],['restosAncestrales',1]],
    extra:()=>[[B.obsidiana,10],[I.mechero,1]]},
  {nombre:'Ciudad antigua',n:1140,col:'#0f5a60',botin:'ciudadAntigua',mobs:['esqueleto','zombi'],
    bloques:[['sculk',26],['pizarra',20],['sensorSculk',8],['catalizador',3],['pDiamante',4],['toba',6],['piedraNegra',6]],
    extra:()=>[[I.perlaEnder,4],[I.polvoBlaze,4]]},
  {nombre:'El End',n:1300,col:'#c8b8f0',botin:'ciudadEnd',mobs:['enderman','shulker'],
    bloques:[['piedraEnd',40],['purpur',14],['ladrillosEnd',12],['obsidiana',10]],
    extra:()=>[[I.ojoEnder,4],[I.perlaEnder,2]]},
  {nombre:'Infinito',n:1500,col:'#ffd84a',botin:'fortaleza',mobs:['cerdo','vaca','zombi','creeper','enderman'],bloques:null,
    extra:()=>[[I.diamante,3],[I.manzanaDorada,1]]},
];
// Bloques de cada fase como ids (se ignoran los que no existan); la fase final mezcla todas
FASES_OB.forEach(F=>{if(F.bloques)F.ids=F.bloques.filter(([k])=>B[k]).map(([k,p])=>[B[k],p]);});
FASES_OB[FASES_OB.length-1].ids=FASES_OB.slice(0,-1).flatMap(F=>F.ids);
FASES_OB.forEach(F=>{F.total=F.ids.reduce((a,e)=>a+e[1],0);F.mobs=F.mobs.filter(t=>DEF_MOB[t]);});

let obPendiente=false;
const esOneBlock=()=>obPendiente||!!(typeof mundoEstado!=='undefined'&&mundoEstado&&mundoEstado.oneBlock);
function faseOB(n){let f=0;for(let i=0;i<FASES_OB.length;i++)if(n>=FASES_OB[i].n)f=i;return f;}

// Generación: todo vacío salvo el bloque mágico sobre roca madre
const _generarSuperficieBase=generarSuperficie;
generarSuperficie=function(ch){
  if(!esOneBlock())return _generarSuperficieBase(ch);
  ch.bioma=new Uint8Array(256).fill(BIOMA.llanura);
  if(ch.cx===Math.floor(OB.x/CX)&&ch.cz===Math.floor(OB.z/CZ)){
    const lx=OB.x-ch.cx*CX, lz=OB.z-ch.cz*CZ;
    ch.datos[idx(lx,OB.y,lz)]=B.cesped; ch.datos[idx(lx,OB.y-1,lz)]=B.lecho;
  }
};
const _aparecerBase=aparecer;
aparecer=function(){if(esOneBlock()&&!spawnMundo)spawnMundo=[OB.x+.5,OB.z+.5];_aparecerBase();};

function nuevoOneBlock(){
  obPendiente=true;
  try{nuevoMundo();}finally{obPendiente=false;}
  mundoEstado.oneBlock={n:0,fase:0,portal:false};
  jugador.pos.set(OB.x+.5,OB.y+1.01,OB.z+.5); jugador.maxY=jugador.pos.y;
  guardarPartida();
  setTimeout(()=>tituloOB('ONE BLOCK','Rompe el bloque','#ffe060',3.5),400);
}

/* ---------- Regenerar el bloque mágico ---------- */
function elegirBloqueOB(F){let r=Math.random()*F.total;for(const [id,p] of F.ids){r-=p;if(r<=0)return id;}return F.ids[0][0];}
function regenerarOB(ob){
  ob.n++;
  const f=faseOB(ob.n), F=FASES_OB[f];
  if(f!==ob.fase){
    ob.fase=f; sonar('nivel'); tituloOB(`Fase ${f+1}`,F.nombre,F.col);
    emitirParticulas(OB.x+.5,OB.y+1.2,OB.z+.5,0xffe060,24,4,1.2,2);
    emitirParticulas(OB.x+.5,OB.y+1.2,OB.z+.5,new THREE.Color(F.col),24,5,1.4,1);
    if(F.nombre==='El End'&&!ob.portal){ob.portal=true;construirPortalOB();}
  }
  const {x,y,z}=OB;
  const raro=ob.n>20&&Math.random()<.006;
  const cofre=raro||ob.n===F.n+10||(ob.n>5&&Math.random()<.025);
  if(raro){  // cofre raro: botín de la fase siguiente y un tesoro extra
    const Fs=FASES_OB[Math.min(FASES_OB.length-1,f+1)];
    delete cofres[claveCont(x,y,z)];
    setBloque(x,y,z,B.cofre); registrarCofre(DIMS.superficie,x,y,z,Fs.botin);
    const c=cofres[claveCont(x,y,z)];
    if(c)for(const [id,n] of [[I.diamante,azar(2,4)],[I.manzanaDorada,1],[546,1],[I.esmeralda,azar(3,8)]]){const i=c.findIndex(q=>!q);if(i>=0){c[i]=crearPila(id,n);if(id===546)c[i].enc=libroAleatorio(Math.random);}}
    sonar('nivel',OB); tituloOB('','¡Cofre raro!','#ffd84a',1.8);
    emitirParticulas(x+.5,y+1,z+.5,0xffd84a,30,4,1.5,1);
  }else if(cofre){
    delete cofres[claveCont(x,y,z)];
    setBloque(x,y,z,B.cofre);
    registrarCofre(DIMS.superficie,x,y,z,F.botin);
    if(ob.n===F.n+10){const c=cofres[claveCont(x,y,z)];
      if(c)for(const [id,n] of F.extra()){if(!ITEMS[id])continue;const i=c.findIndex(s=>!s);if(i>=0)c[i]=crearPila(id,n);}}
    sonar('cofreAbrir',OB,.7);
  }else setBloque(x,y,z,elegirBloqueOB(F));
  // Los objetos que había en el hueco suben encima del bloque nuevo
  for(const e of entidades)if(e.tipo==='item'&&!e.muerta&&Math.abs(e.pos.x-x-.5)<1&&Math.abs(e.pos.z-z-.5)<1&&e.pos.y>y-1.5&&e.pos.y<y+1.05){e.pos.y=y+1.1;e.vel.y=0;}
  emitirParticulas(x+.5,y+.5,z+.5,new THREE.Color(F.col),6,1.5,.5,4);
  if(!cofre&&F.mobs.length&&ob.n>8&&Math.random()<.045&&mobs.length<40){
    const t=F.mobs[Math.floor(Math.random()*F.mobs.length)];
    crearMob(t,x+.5,y+1.05,z+.5,{tam:t==='slime'||t==='cuboMagma'?0:undefined});
  }
}
// Portal del End: anillo de marcos (dos con ojo) sobre una plataforma unida a la isla
function construirPortalOB(){
  const cx=OB.x+8, cz=OB.z, y=OB.y;
  for(let x=OB.x+1;x<=cx-3;x++)setBloque(x,y-1,cz,B.piedraEnd);
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)setBloque(cx+a,y-1,cz+b,B.piedraEnd);
  const anillo=[];for(let a=-1;a<=1;a++)anillo.push([cx+a,cz-2],[cx+a,cz+2],[cx-2,cz+a],[cx+2,cz+a]);
  anillo.forEach(([px,pz],i)=>setBloque(px,y,pz,i%5===0?B.marcoEndOjo:B.marcoEnd));
  sonar('portal',{x:cx,y,z:cz},.6);
  setTimeout(()=>mostrarMensaje('Ha aparecido un portal del End: llénalo de ojos de ender.'),2500);
}

/* ---------- Barra de jefe con la fase y títulos grandes ---------- */
const hudOB=document.createElement('div');
hudOB.id='hudOneBlock'; hudOB.className='oculto';
hudOB.style.cssText='position:fixed;left:50%;top:8px;transform:translateX(-50%);width:min(440px,calc(100vw - 32px));text-align:center;pointer-events:none;'+
  'font:15px/1.2 var(--pixel,sans-serif);color:#fff;text-shadow:2px 2px 0 #3f3f3f;transition:top .3s;';
hudOB.innerHTML='<div id="obFase"></div><div style="position:relative;height:10px;margin-top:3px;background:#2a2a2a;border:2px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.15)">'+
  '<i id="obBarra" style="display:block;height:100%;width:0;transition:width .25s"></i>'+
  '<b style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 2px),rgba(0,0,0,.45) calc(10% - 2px) 10%)"></b></div>'+
  '<div id="obCuenta" style="font-size:12px;color:#ddd;margin-top:2px"></div>';
document.body.appendChild(hudOB);
const tituloEl=document.createElement('div');
tituloEl.style.cssText='position:fixed;left:0;right:0;top:24%;text-align:center;pointer-events:none;opacity:0;transition:opacity .5s;font-family:var(--pixel,sans-serif);text-shadow:3px 3px 0 #2a2a2a;padding:0 16px;';
tituloEl.innerHTML='<div id="obTitulo" style="font-size:22px;color:#fff"></div><div id="obSub" style="font-size:52px;font-weight:700"></div>';
document.body.appendChild(tituloEl);
let tituloT=0;
function tituloOB(arriba,grande,col,seg=3){
  document.getElementById('obTitulo').textContent=arriba; const g=document.getElementById('obSub'); g.textContent=grande; g.style.color=col||'#fff';
  tituloEl.style.opacity=1; tituloT=seg;
}
let obHudT=0;
function actualizarHudOB(ob){
  const f=ob.fase, F=FASES_OB[f], sig=FASES_OB[f+1];
  document.getElementById('obFase').innerHTML=`<span style="color:${F.col}">■</span> One Block · Fase ${f+1}: ${F.nombre}`;
  const barra=document.getElementById('obBarra'); barra.style.background=`linear-gradient(180deg,${F.col},${F.col} 50%,rgba(0,0,0,.25) 50%),${F.col}`;
  barra.style.width=(sig?Math.min(100,(ob.n-F.n)/(sig.n-F.n)*100):100)+'%';
  document.getElementById('obCuenta').textContent=sig?`${ob.n-F.n} / ${sig.n-F.n} bloques · siguiente: ${sig.nombre}`:`Bloques rotos: ${ob.n}`;
  const jefe=document.getElementById('jefe'); hudOB.style.top=jefe&&!jefe.classList.contains('oculto')?'52px':'8px';
}
// Destellos alrededor del bloque mágico
let chispaT=0;
function chispasOB(dt,ob){
  chispaT-=dt; if(chispaT>0)return; chispaT=.18;
  const F=FASES_OB[ob.fase], c=new THREE.Color(F.col), k=Math.floor(Math.random()*4), t=Math.random();
  const px=OB.x+(k===0?-.05:k===1?1.05:t), pz=OB.z+(k===2?-.05:k===3?1.05:t);
  emitirParticulas(px,OB.y+.2+Math.random()*.8,pz,Math.random()<.3?0xffffff:c,1,.25,1.3,-1.2);
}

// El bloque reaparece en el mismo instante en que se rompe, para no caer por el hueco
let obRegenerando=false;
const _setBloqueBase=setBloque;
setBloque=function(x,y,z,id,opc){
  const r=_setBloqueBase(x,y,z,id,opc);
  if(x===OB.x&&y===OB.y&&z===OB.z&&!obRegenerando&&(id===0||esLiquido(id))&&dim===DIMS.superficie&&mundoEstado&&mundoEstado.oneBlock){
    obRegenerando=true;
    try{regenerarOB(mundoEstado.oneBlock);}finally{obRegenerando=false;}
  }
  return r;
};
// Red de seguridad: si el jugador queda metido en el bloque mágico, sube encima
function sostenerJugadorOB(){
  const j=jugador.pos;
  if(Math.abs(j.x-OB.x-.5)<.8&&Math.abs(j.z-OB.z-.5)<.8&&j.y>OB.y-.9&&j.y<OB.y+1&&SOLIDO[getBloque(OB.x,OB.y,OB.z)]){
    j.y=OB.y+1; if(jugador.vel.y<0)jugador.vel.y=0; jugador.maxY=j.y; jugador.suelo=true;
  }
}
function actualizarOneBlock(dt){
  const ob=mundoEstado&&mundoEstado.oneBlock;
  hudOB.classList.toggle('oculto',!ob||estado==='menu');
  if(!ob)return;
  obHudT-=dt; if(obHudT<=0){obHudT=.2;actualizarHudOB(ob);}
  if(tituloT>0){tituloT-=dt;if(tituloT<=0)tituloEl.style.opacity=0;}
  if(estado==='jugando'&&dim===DIMS.superficie)chispasOB(dt,ob);
  if(dim!==DIMS.superficie)return;
  const b=getBloqueSiCargado(OB.x,OB.y,OB.z); if(b<0)return;
  if(b===0||esLiquido(b)){obRegenerando=true;try{regenerarOB(ob);}finally{obRegenerando=false;}}
  sostenerJugadorOB();
}
const _actualizarFinalOB=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalOB(dt);actualizarOneBlock(dt);};

/* ---------- Botón del menú ---------- */
(function(){
  const btn=document.getElementById('btnOneBlock'); if(!btn)return;
  let confirmar=0;
  btn.onclick=()=>{
    if(guardado&&!confirmar){btn.textContent='Pulsa otra vez: se borrará este mundo';
      confirmar=setTimeout(()=>{confirmar=0;btn.textContent='One Block';},3000);return;}
    clearTimeout(confirmar);confirmar=0;btn.textContent='One Block';
    nuevoOneBlock(); empezar();
  };
})();
