"use strict";
/* =========================================================
   Cultivos como en el original: trigo, zanahorias, patatas,
   remolachas, sandías y calabazas (con su tallo) y arbustos
   de bayas dulces. La tierra de cultivo se humedece cerca del
   agua (y crecen el doble de rápido), se seca y vuelve a
   tierra si no tiene nada plantado, y se pisotea al caer
   encima. La harina de hueso adelanta el crecimiento, las
   hileras alternas crecen mejor, y los cultivos maduros
   sueltan más con Fortuna.
   ========================================================= */
Object.assign(SND,{
  arar:v=>{ruidoSnd(.14,700,.3*v,'bandpass');ruidoSnd(.08,1800,.12*v,'bandpass');},
  plantar:v=>{ruidoSnd(.08,1200,.18*v,'bandpass');tonoSnd(500,700,.05,'sine',.02*v);},
  cosechar:v=>{ruidoSnd(.1,2200,.2*v,'bandpass');ruidoSnd(.06,900,.12*v,'bandpass');},
  harinaHueso:v=>{ruidoSnd(.1,2600,.12*v,'highpass');for(let i=0;i<3;i++)tonoSnd(900+i*300,1400+i*300,.08,'sine',.025*v,i*.05);},
  bayas:v=>{ruidoSnd(.08,1500,.2*v,'bandpass');tonoSnd(700,500,.06,'triangle',.03*v);},
  pisotear:v=>ruidoSnd(.12,500,.3*v),
});

/* ---------- Definición de cada cultivo ---------- */
const CULTIVOS=[
  {base:B.trigo0,etapas:8,semilla:I.semillas},
  {base:B.zanahorias0,etapas:4,semilla:640},
  {base:B.patatas0,etapas:4,semilla:641},
  {base:B.remolachas0,etapas:4,semilla:679,lento:true},
];
function cultivoDe(id){for(const c of CULTIVOS)if(id>=c.base&&id<c.base+c.etapas)return c;return null;}
const esCultivo=id=>!!cultivoDe(id);
const esTierraCultivo=id=>id===B.cultivo||id===B.cultivoHumedo;
const esBayas=id=>id>=B.arbustoBayas0&&id<=B.arbustoBayas0+3;
const esTallo=id=>id===B.talloSandia||id===B.talloCalabaza;
// Todo lo plantado necesita su suelo debajo (si falta, se rompe y suelta lo suyo)
for(const c of CULTIVOS)for(let e=0;e<c.etapas;e++)NECESITA_SOPORTE[c.base+e]=esTierraCultivo;
NECESITA_SOPORTE[B.talloSandia]=NECESITA_SOPORTE[B.talloCalabaza]=esTierraCultivo;
for(let e=0;e<4;e++)NECESITA_SOPORTE[B.arbustoBayas0+e]=s=>s===B.cesped||s===B.tierra||s===B.podzol||esTierraCultivo(s)||s===B.cespedNevado;

/* ---------- Crecimiento (como en el original: depende de luz, agua y vecinos) ---------- */
function aguaCercana(x,y,z){for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)for(let dy=0;dy<=1;dy++){const b=getBloqueSiCargado(x+dx,y+dy,z+dz);if(esAgua(b)||ACUATICO[b])return true;}return false;}
function puntosCrecimiento(x,y,z,id){
  const c=cultivoDe(id); let pts=1;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const s=getBloque(x+dx,y-1,z+dz);
    if(esTierraCultivo(s)){let v=s===B.cultivoHumedo?3:1;if(dx||dz)v/=4;pts+=v;}}
  // Filas del mismo cultivo en diagonal o por los dos lados crecen peor (hay que alternarlas)
  if(c){const mismo=(dx,dz)=>cultivoDe(getBloque(x+dx,y,z+dz))===c;
    if((mismo(-1,-1)||mismo(1,-1)||mismo(1,1)||mismo(-1,1))||((mismo(-1,0)||mismo(1,0))&&(mismo(0,-1)||mismo(0,1))))pts/=2;}
  return pts;
}
function crecer(x,y,z,id,pasos=1){
  const c=cultivoDe(id); if(!c)return false;
  const e=id-c.base; if(e>=c.etapas-1)return false;
  setBloque(x,y,z,c.base+Math.min(c.etapas-1,e+pasos)); return true;
}
function tickCultivo(x,y,z,id){
  const luz=luzCieloBloque(x,y+1,z);
  if(esCultivo(id)){
    if(luz<9)return;
    const c=cultivoDe(id), pts=puntosCrecimiento(x,y,z,id);
    if(Math.random()<1/(Math.floor(25/pts)+1)*(c.lento?.66:1)*2.2)crecer(x,y,z,id);
    return;
  }
  if(esTallo(id)){
    if(luz<9||Math.random()>.12)return;
    const fruto=id===B.talloSandia?B.sandia:B.calabaza;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(getBloque(x+dx,y,z+dz)===fruto)return;
    const [dx,dz]=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(Math.random()*4)], s=getBloque(x+dx,y-1,z+dz);
    if(!getBloque(x+dx,y,z+dz)&&(s===B.tierra||s===B.cesped||esTierraCultivo(s)||s===B.podzol)){setBloque(x+dx,y,z+dz,fruto);sonar('plantar',{x,y,z},.5);}
    return;
  }
  if(esBayas(id)){if(id<B.arbustoBayas0+3&&luz>=9&&Math.random()<.2)setBloque(x,y,z,id+1);return;}
  if(esTierraCultivo(id)){
    const arriba=getBloque(x,y+1,z);
    if(OPACO[arriba]){setBloque(x,y,z,B.tierra);return;}
    const mojada=aguaCercana(x,y,z)||(lloviendo&&dim===DIMS.superficie&&(luzEn(x,y+1,z)>>4)===15);
    if(mojada&&id===B.cultivo)setBloque(x,y,z,B.cultivoHumedo);
    else if(!mojada&&id===B.cultivoHumedo)setBloque(x,y,z,B.cultivo);
    else if(!mojada&&!arriba&&Math.random()<.3)setBloque(x,y,z,B.tierra);
  }
}
const _tickBloqueCult=tickBloque;
tickBloque=function(x,y,z,id){
  if(esCultivo(id)||esTallo(id)||esBayas(id)||esTierraCultivo(id)){tickCultivo(x,y,z,id);return;}
  return _tickBloqueCult(x,y,z,id);
};

/* ---------- Plantar, cosechar y harina de hueso ---------- */
const SEMILLA_A_CULTIVO={[I.semillas]:B.trigo0,640:B.zanahorias0,641:B.patatas0,679:B.remolachas0,712:B.talloSandia,713:B.talloCalabaza};
function usarDerechoCultivos(p,id){
  const a=apuntado&&!apuntadoEnt?apuntado:null; if(!a)return false;
  const {x,y,z,b}=a;
  // Recoger bayas maduras
  if(esBayas(b)&&b>=B.arbustoBayas0+2&&id!==I.harinaHueso){
    const n=b===B.arbustoBayas0+3?azar(2,3):azar(1,2);
    soltarItem(crearPila(646,n),x+.5,y+.6,z+.5,true); setBloque(x,y,z,B.arbustoBayas0+1); sonar('bayas',a); balancearMano(); return true;}
  if(!p)return false;
  // Plantar semillas en tierra de cultivo
  if(SEMILLA_A_CULTIVO[id]!==undefined&&esTierraCultivo(b)&&!getBloque(x,y+1,z)){
    setBloque(x,y+1,z,SEMILLA_A_CULTIVO[id]); consumirEnMano(); sonar('plantar',a); balancearMano(); return true;}
  if(id===646&&(b===B.cesped||b===B.tierra||b===B.podzol||esTierraCultivo(b))&&!getBloque(x,y+1,z)){
    setBloque(x,y+1,z,B.arbustoBayas0); consumirEnMano(); sonar('plantar',a); balancearMano(); return true;}
  // Arar con la azada (también el sendero y la tierra gruesa)
  if(ITEMS[id]&&ITEMS[id].tipoHerr==='azada'&&(b===B.cesped||b===B.tierra||b===B.senda)&&!getBloque(x,y+1,z)){
    setBloque(x,y,z,aguaCercana(x,y,z)?B.cultivoHumedo:B.cultivo); gastarObjetoEnMano(); sonar('arar',a); balancearMano();
    particulasBloque(x+.5,y+1,z+.5,BLOQUES[B.tierra].lado,6,1,.4); return true;}
  // Harina de hueso: adelanta 2-5 etapas
  if(id===I.harinaHueso&&(esCultivo(b)||esBayas(b)||esTallo(b))){
    let ok=false;
    if(esCultivo(b)){const c=cultivoDe(b);ok=crecer(x,y,z,b,c.etapas===8?azar(2,5):azar(1,2));}
    else if(esBayas(b)&&b<B.arbustoBayas0+3){setBloque(x,y,z,b+1);ok=true;}
    else if(esTallo(b)){for(let k=0;k<6&&!ok;k++){tickCultivo(x,y,z,b);ok=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const f=getBloque(x+dx,y,z+dz);return f===B.sandia||f===B.calabaza;});}}
    if(ok||supervivencia()){consumirEnMano();emitirParticulas(x+.5,y+.6,z+.5,0x60ff60,10,1,.9,-1);sonar('harinaHueso',a);balancearMano();}
    return true;}
  return false;
}
const _usarDerechoCompletoCult=usarDerechoCompleto;
usarDerechoCompleto=function(p,id,it){if(usarDerechoCultivos(p,id))return true;return _usarDerechoCompletoCult(p,id,it);};

/* ---------- Pisotear la tierra de cultivo y el arbusto de bayas ---------- */
let velCaidaCult=0;
function pisotear(dt){
  const j=jugador;
  if(estado==='jugando'&&!j.vuela){
    if(j.suelo&&velCaidaCult<-6.5){const x=Math.floor(j.pos.x),y=Math.floor(j.pos.y-.2),z=Math.floor(j.pos.z),b=getBloque(x,y,z);
      if(esTierraCultivo(b)&&Math.random()<.8){setBloque(x,y,z,B.tierra);sonar('pisotear',{x,y,z});}}
    // El arbusto de bayas pincha y frena
    const bb=getBloque(Math.floor(j.pos.x),Math.floor(j.pos.y+.1),Math.floor(j.pos.z));
    if(esBayas(bb)&&bb>B.arbustoBayas0){j.vel.x*=.6;j.vel.z*=.6;if(Math.hypot(j.vel.x,j.vel.z)>.4&&Math.random()<dt*3&&supervivencia())danarJugador(1,'bayas',null);}
  }
  velCaidaCult=j.suelo?0:j.vel.y;
  // Las criaturas pesadas también pisotean
  for(const m of mobs)if(m.suelo&&m.vel.y<-7&&m.ancho>.25){const x=Math.floor(m.pos.x),y=Math.floor(m.pos.y-.2),z=Math.floor(m.pos.z);if(esTierraCultivo(getBloque(x,y,z)))setBloque(x,y,z,B.tierra);}
}
const _actualizarFinalCult=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalCult(dt);pisotear(dt);};

/* ---------- Aldeas con huertos variados ---------- */
// Los huertos de las aldeas mezclan trigo, zanahorias, patatas y remolachas (mundo.js)

/* ---------- Pestaña del creativo ---------- */
const _categoriaItemCult=categoriaItem;
categoriaItem=function(id){if(id===679||id===712||id===713)return 'naturaleza';
  if(esCultivo(id)||esTallo(id)||esBayas(id))return 'naturaleza';return _categoriaItemCult(id);};
