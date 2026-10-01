"use strict";
/* =========================================================
   Multijugador para mundos normales y One Block
   - «Abrir a multijugador» en el menú de pausa: comparte el
     mundo en el que estás jugando (como «Abrir a LAN»).
   - El mundo se manda con su tipo: si es One Block, el
     invitado recibe la isla y el estado (bloques rotos, fase,
     portal) y ve lo mismo que el anfitrión.
   - En One Block el anfitrión decide el bloque nuevo cuando
     cualquiera rompe el bloque mágico y lo manda a todos (con
     el contenido de los cofres que salgan y el portal del End).
   - Cofres compartidos: al cerrar un cofre su contenido llega
     a los demás, y el invitado pide al anfitrión los cofres
     que abre.
   - La hora del día se sincroniza con la del anfitrión.
   ========================================================= */
const esInvitado36=()=>RED.conectado&&RED.rol==='invitado';
const esAnfitrion36=()=>RED.conectado&&RED.rol==='anfitrion';

/* ---------- El mundo viaja con su tipo y sus cofres ---------- */
const _enviarRed36=enviarRed;
enviarRed=function(msg){
  if(msg&&msg.t==='mundo'){
    const ob=typeof mundoEstado!=='undefined'&&mundoEstado&&mundoEstado.oneBlock;
    msg.tipoMundo=ob?'oneblock':'normal';
    if(ob)msg.oneBlock={n:ob.n,fase:ob.fase,portal:!!ob.portal};
    const c={};for(const k in cofres)if(k.startsWith(DIMS.superficie.clave+':'))c[k]=cofres[k];
    msg.cofres=c;
  }
  return _enviarRed36(msg);
};
const _cargarMundoRemoto36=cargarMundoRemoto;
cargarMundoRemoto=function(m){
  const ob=m.tipoMundo==='oneblock'&&m.oneBlock;
  if(ob)obPendiente=true;
  try{_cargarMundoRemoto36(m);}finally{obPendiente=false;}
  if(ob){mundoEstado.oneBlock={n:ob.n|0,fase:ob.fase|0,portal:!!ob.portal};
    if(!m.spawn){jugador.pos.set(OB.x+.5,OB.y+1.01,OB.z+.5);jugador.maxY=jugador.pos.y;}
    escribirChat('Mundo One Block del anfitrión: el bloque mágico es compartido');}
  if(m.cofres)for(const k in m.cofres)cofres[k]=m.cofres[k].map(p=>p?{...p}:null);
};

/* ---------- One Block compartido ---------- */
let capturaOB36=null;
const _setBloque36=setBloque;
setBloque=function(x,y,z,id,opc){
  const r=_setBloque36(x,y,z,id,opc);
  if(capturaOB36&&!RED.aplicando)capturaOB36.push([x,y,z,getBloque(x,y,z)]);
  return r;
};
const _regenerarOB36=regenerarOB;
regenerarOB=function(ob){
  if(esInvitado36())return;   // el invitado espera a que el anfitrión mande el bloque nuevo
  if(!esAnfitrion36())return _regenerarOB36(ob);
  capturaOB36=[]; const apl=RED.aplicando; RED.aplicando=false;
  try{_regenerarOB36(ob);}
  finally{
    RED.aplicando=apl; const lista=capturaOB36; capturaOB36=null;
    if(!lista.some(b=>b[0]===OB.x&&b[1]===OB.y&&b[2]===OB.z))lista.push([OB.x,OB.y,OB.z,getBloque(OB.x,OB.y,OB.z)]);
    const kc=DIMS.superficie.clave+':'+clavePos(OB.x,OB.y,OB.z);
    enviarRed({t:'obBloques',lista,ob:{n:ob.n,fase:ob.fase,portal:!!ob.portal},cofre:cofres[kc]?{k:kc,items:cofres[kc]}:null});
  }
};

/* ---------- Cofres compartidos ---------- */
function aplicarCofre36(k,items){
  if(!Array.isArray(items))return;
  const copia=items.map(p=>p?{...p}:null);
  if(cofres[k]){cofres[k].splice(0,cofres[k].length,...copia);}else cofres[k]=copia;
  if(ui&&ui.tipo==='cofre'&&ui.clave===k&&ui.cofre!==cofres[k]&&ui.cofre.length===copia.length)ui.cofre.splice(0,ui.cofre.length,...copia.map(p=>p?{...p}:null));
  if(ui&&ui.tipo==='cofre')refrescarUI();
}
function enviarCofreAbierto36(){
  if(!RED.conectado||!ui||ui.tipo!=='cofre'||!ui.clave||ui.cofre.length>27)return;
  enviarRed({t:'cofre',k:ui.clave,items:ui.cofre});
}
const _cerrarUI36=cerrarUI;
cerrarUI=function(){enviarCofreAbierto36();return _cerrarUI36.apply(this,arguments);};
const _abrirUI36=abrirUI;
abrirUI=function(tipo,pos,extra){
  const r=_abrirUI36.apply(this,arguments);
  if(tipo==='cofre'&&ui&&ui.clave&&esInvitado36())enviarRed({t:'pedirCofre',k:ui.clave});
  return r;
};
// Mientras el cofre está abierto, los cambios se mandan cada medio segundo
let cofreT36=0, cofreFirma36='';
const _actualizarFinal36=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal36(dt);
  if(RED.conectado&&ui&&ui.tipo==='cofre'&&(cofreT36-=dt)<=0){cofreT36=.5;
    const f=JSON.stringify(ui.cofre); if(f!==cofreFirma36){cofreFirma36=f;enviarCofreAbierto36();}}
  // El anfitrión manda la hora cada pocos segundos
  if(esAnfitrion36()&&(horaT36-=dt)<=0){horaT36=5;enviarRed({t:'hora',tiempoDia});}
};
let horaT36=5;

/* ---------- Mensajes nuevos ---------- */
const _recibirRed36=recibirRed;
recibirRed=function(texto){
  let m=null;try{m=JSON.parse(texto);}catch(e){}
  if(m&&m.de!==RED.id&&!(RED.sala&&m.sala&&m.sala!==RED.sala)){
    if(m.t==='obBloques'){
      RED.conectado=true;
      if(!esInvitado36())return;
      RED.aplicando=true;
      try{for(const [x,y,z,b] of m.lista||[])setBloque(x,y,z,b);}finally{RED.aplicando=false;}
      if(m.cofre)aplicarCofre36(m.cofre.k,m.cofre.items);
      if(m.ob&&mundoEstado){const prev=mundoEstado.oneBlock;mundoEstado.oneBlock={n:m.ob.n,fase:m.ob.fase,portal:m.ob.portal};
        if(prev&&m.ob.fase!==prev.fase&&FASES_OB[m.ob.fase]){const F=FASES_OB[m.ob.fase];sonar('nivel');tituloOB(`Fase ${m.ob.fase+1}`,F.nombre,F.col);}}
      return;
    }
    if(m.t==='cofre'){aplicarCofre36(m.k,m.items);return;}
    if(m.t==='pedirCofre'){if(esAnfitrion36()&&cofres[m.k])enviarRed({t:'cofre',k:m.k,items:cofres[m.k]});return;}
    if(m.t==='hora'){if(esInvitado36()&&typeof m.tiempoDia==='number'){const d=((m.tiempoDia-tiempoDia+1.5)%1)-.5;if(Math.abs(d)>.01)tiempoDia=m.tiempoDia;}return;}
  }
  return _recibirRed36(texto);
};

/* ---------- Abrir a multijugador desde la pausa ---------- */
(function(){
  const pausa=document.getElementById('btnOpcionesPausa'), capa=document.getElementById('pantallaRed');
  if(!pausa||!capa)return;
  const b=document.createElement('button');b.id='btnAbrirRed';b.className='secundario';b.textContent='Abrir a multijugador…';
  b.dataset.tip='Comparte este mundo (normal o One Block) con otros jugadores';
  pausa.parentNode.insertBefore(b,pausa);
  let desdePausa=false;
  b.onclick=()=>{desdePausa=true;const cp=pausa.closest('.capa');if(cp)cp.classList.add('oculto');capa.classList.remove('oculto');
    const est=capa.querySelector('#redEstado');
    if(est&&!RED.conectado){const tipo=mundoEstado&&mundoEstado.oneBlock?'One Block':'normal';est.textContent=`Vas a compartir este mundo (${tipo}). Crea una sala o una invitación y pulsa «Jugar».`;}};
  const volver=capa.querySelector('#redVolver'), jugar=capa.querySelector('#redJugar');
  // Si se abrió desde la pausa, «Volver» regresa a la pausa y «Jugar» sigue en el mismo mundo
  volver.addEventListener('click',e=>{if(!desdePausa)return;e.stopImmediatePropagation();desdePausa=false;capa.classList.add('oculto');
    const cp=pausa.closest('.capa');if(cp)cp.classList.remove('oculto');},true);
  jugar.addEventListener('click',e=>{if(!desdePausa)return;e.stopImmediatePropagation();desdePausa=false;capa.classList.add('oculto');empezar();},true);
})();
