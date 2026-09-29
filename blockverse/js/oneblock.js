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
  setTimeout(()=>mostrarMensaje('One Block: rompe el bloque y verás qué aparece. ¡No te caigas!'),600);
}

/* ---------- Regenerar el bloque mágico ---------- */
function elegirBloqueOB(F){let r=Math.random()*F.total;for(const [id,p] of F.ids){r-=p;if(r<=0)return id;}return F.ids[0][0];}
function regenerarOB(ob){
  ob.n++;
  const f=faseOB(ob.n), F=FASES_OB[f];
  if(f!==ob.fase){
    ob.fase=f; sonar('nivel'); mostrarMensaje(`¡Nueva fase: ${F.nombre}!`);
    emitirParticulas(OB.x+.5,OB.y+1.2,OB.z+.5,0xffe060,24,4,1.2,2);
    if(F.nombre==='El End'&&!ob.portal){ob.portal=true;construirPortalOB();}
  }
  const {x,y,z}=OB;
  const cofre=ob.n===F.n+10||(ob.n>5&&Math.random()<.025);
  if(cofre){
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

/* ---------- Marcador en pantalla ---------- */
const hudOB=document.createElement('div');
hudOB.id='hudOneBlock'; hudOB.className='oculto';
hudOB.style.cssText='position:fixed;left:10px;top:10px;min-width:190px;padding:8px 10px;background:rgba(0,0,0,.55);border:2px solid #000;'+
  'box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.6);font:14px/1.3 var(--pixel,sans-serif);color:#fff;pointer-events:none;text-shadow:1px 1px 0 #000;';
hudOB.innerHTML='<div style="color:#ffe060;font-weight:700">ONE BLOCK</div><div id="obFase"></div>'+
  '<div style="height:8px;background:#222;border:1px solid #000;margin-top:4px"><i id="obBarra" style="display:block;height:100%;width:0"></i></div><div id="obCuenta" style="font-size:12px;color:#ccc;margin-top:2px"></div>';
document.body.appendChild(hudOB);
let obHudT=0;
function actualizarHudOB(ob){
  const f=ob.fase, F=FASES_OB[f], sig=FASES_OB[f+1];
  document.getElementById('obFase').textContent=`Fase ${f+1}: ${F.nombre}`;
  const barra=document.getElementById('obBarra'); barra.style.background=F.col;
  barra.style.width=(sig?Math.min(100,(ob.n-F.n)/(sig.n-F.n)*100):100)+'%';
  document.getElementById('obCuenta').textContent=sig?`${ob.n-F.n} / ${sig.n-F.n} bloques · total ${ob.n}`:`Bloques rotos: ${ob.n}`;
}

function actualizarOneBlock(dt){
  const ob=mundoEstado&&mundoEstado.oneBlock;
  hudOB.classList.toggle('oculto',!ob||estado==='menu');
  if(!ob)return;
  obHudT-=dt; if(obHudT<=0){obHudT=.2;actualizarHudOB(ob);}
  if(dim!==DIMS.superficie)return;
  const b=getBloqueSiCargado(OB.x,OB.y,OB.z); if(b<0)return;
  if(b===0||esLiquido(b))regenerarOB(ob);
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
