"use strict";
/* =========================================================
   Bed Wars en red. El anfitrión manda: reparte los equipos
   (cada jugador conectado ocupa el hueco de un bot), simula
   los bots, lleva el reloj, las camas y las eliminaciones y
   decide quién gana. Cada jugador juega en su máquina y se
   comparten los bloques, los golpes entre jugadores (y a los
   bots), las camas rotas, las muertes y las explosiones.
   ========================================================= */
let bwRedT=0, bwEstadoT=0, recibiendoBoom=false;
// El anfitrión empieza: reparte equipos y avisa a todos
const _iniciarBedwarsRed=iniciarBedwars;
iniciarBedwars=function(opc={}){
  if(typeof RED!=='undefined'&&RED.conectado&&RED.rol==='anfitrion'&&!opc.cliente){
    const ids=[...RED.pares.keys()];
    const porEquipo=clamp(opc.porEquipo||1,1,4), plazas=[];
    for(let k=1;k<porEquipo;k++)plazas.push(0);
    for(let k=0;k<porEquipo;k++)for(let e=1;e<EQUIPOS_BW.length;e++)plazas.push(e);
    plazas.sort((a,b)=>porEquipo===1?a-b:0);
    const remotos={};ids.forEach((id,i)=>{remotos[id]=i<plazas.length?plazas[i]:null;});
    _iniciarBedwarsRed(Object.assign({},opc,{remotos}));
    enviarRed({t:'bwInicio',porEquipo,dificultad:opc.dificultad||'normal',remotos,equipos:EQUIPOS_BW.length,tema:opc.tema});
    for(const [id,eq] of Object.entries(remotos)){const r=RED.remotos.get(id);if(r){r.equipo=eq;r.bwVivo=eq!=null;}}
    return;
  }
  return _iniciarBedwarsRed(opc);
};
// Mensajes de Bed Wars
const _recibirRedBW=recibirRed;
recibirRed=function(texto){
  let m;try{m=JSON.parse(texto);}catch(e){return;}
  if(!m||m.de===RED.id||!/^bw/.test(m.t||''))return _recibirRedBW(texto);
  RED.conectado=true;
  switch(m.t){
    case 'bwInicio':{
      if(RED.rol==='anfitrion')return;
      const eq=m.remotos[RED.id];
      if(BW&&BW.activo){BW.activo=false;}
      document.getElementById('bwFin')?.remove();
      iniciarBedwars({porEquipo:m.porEquipo,dificultad:m.dificultad,cliente:true,equipo:eq===undefined?null:eq,remotos:m.remotos,equipos:m.equipos,tema:m.tema});
      for(const [id,e] of Object.entries(m.remotos)){const r=RED.remotos.get(id);if(r){r.equipo=e;r.bwVivo=e!=null;}}
      empezar();escribirChat(eq==null?'La partida ya estaba llena: miras como espectador':`Juegas en el equipo ${EQUIPOS_BW[eq].nombre}`);
      break;}
    case 'bwBots':
      if(!BW||!BW.cliente)return;
      {const vivos=new Set();
      for(const [id,e,x,y,z,yaw,nombre] of m.l){const k='bot:'+id;vivos.add(k);actualizarRemoto({de:k,nombre,p:[x,y,z,yaw,0],dim:'superficie',equipo:e,esBot:true});}
      for(const k of [...RED.remotos.keys()])if(String(k).startsWith('bot:')&&!vivos.has(k))quitarRemoto(k);}
      break;
    case 'bwEstado':
      if(!BW||!BW.cliente)return;
      BW.t=m.tt;BW.ev=m.ev;
      m.camas.forEach((c,i)=>{if(!c&&BW.equipos[i].cama)romperCamaBW(i,'',true);});
      m.vivos.forEach((v,i)=>BW.equipos[i].vivos=v);
      if(m.fin&&!BW.fin)terminarBW(m.ganador);
      break;
    case 'bwGolpe':
      if(m.a!==RED.id||!BW||!BW.activo)return;
      BW.yo.ultimoGolpe={nombre:m.por,t:tiempoJuego,m:null};
      danarJugador(m.dano,'mob',{x:m.dx,z:m.dz});jugador.vel.x+=m.dx*4;jugador.vel.z+=m.dz*4;jugador.vel.y=Math.max(jugador.vel.y,4);
      break;
    case 'bwGolpeBot':
      if(!BW||BW.cliente)return;
      {const bot=BW.bots.find(o=>o.bwId===m.id);if(bot&&bot.bw.equipo!==m.equipo){bot.bw.ultimoGolpe={remoto:m.de,nombre:m.nombre,t:tiempoJuego};herirMob(bot,m.dano,{x:m.dx,z:m.dz},'jugadorRemoto');}}
      break;
    case 'bwCama': if(BW&&BW.activo)romperCamaBW(m.equipo,m.quien,true); break;
    case 'bwMuerte':
      if(!BW||!BW.activo)return;
      {const r=RED.remotos.get(m.de);if(r&&m.final)r.bwVivo=false;
      escribirChat(`${m.nombre} ${m.por?'fue eliminado por '+m.por:'murió'}${m.final?'. ¡ELIMINACIÓN FINAL!':''}`);
      if(m.por===RED.nombre){BW.yo[m.final?'finales':'bajas']++;sonar('xp',null,.6);}
      if(!BW.cliente&&m.final){BW.equipos[m.equipo].vivos=Math.max(0,BW.equipos[m.equipo].vivos-1);comprobarFinBW();}}
      break;
    case 'bwBoom':
      recibiendoBoom=true;try{explosion(m.x,m.y,m.z,m.p,{sinBloques:true});}finally{recibiendoBoom=false;}
      break;
  }
};
// Muertes de bots causadas por jugadores remotos
const _muerteBotRed=muerteBot;
muerteBot=function(m,causa){
  const g=m.bw.ultimoGolpe;
  if(g&&g.remoto&&tiempoJuego-g.t<12){const final=!BW.equipos[m.bw.equipo].cama;
    enviarRed({t:'bwMuerte',equipo:m.bw.equipo,final,nombre:m.bw.nombre,por:g.nombre});m.bw.ultimoGolpe=null;}
  return _muerteBotRed(m,causa);
};
// Las explosiones: quien la provoca rompe los bloques (y los comparte); los demás solo ven el efecto y reciben el daño
const _explosionRed=explosion;
explosion=function(x,y,z,p,opc={}){
  if(typeof RED!=='undefined'&&RED.conectado&&!recibiendoBoom&&BW&&BW.activo)enviarRed({t:'bwBoom',x,y,z,p});
  return _explosionRed(x,y,z,p,opc);
};
const _setBloqueRedBW=setBloque;
setBloque=function(x,y,z,id,opc){const r=_setBloqueRedBW(x,y,z,id,opc);
  if(explosionBW&&!id&&typeof RED!=='undefined'&&RED.conectado&&!RED.aplicando&&!getBloque(x,y,z))enviarRed({t:'bloque',x,y,z,b:0});return r;};
// Golpear a jugadores remotos (y a los bots, que en los invitados son figuras)
function remotoApuntado(){
  if(typeof RED==='undefined'||!RED.remotos.size)return null;
  const dir=new THREE.Vector3();camara.getWorldDirection(dir);
  let mejor=null,dm=3.6;
  for(const [id,r] of RED.remotos){if(!r.g.visible)continue;
    const c=r.g.position.clone();c.y+=1;const v=c.sub(camara.position),d=v.length();if(d>dm)continue;
    const lado=v.clone().sub(dir.clone().multiplyScalar(v.dot(dir)));if(v.dot(dir)<0||lado.length()>.75)continue;
    if(apuntado&&!apuntadoEnt){const db=Math.hypot(apuntado.x+.5-camara.position.x,apuntado.y+.5-camara.position.y,apuntado.z+.5-camara.position.z);if(db<d-.6)continue;}
    dm=d;mejor={id,r,d};}
  return mejor;
}
const _atacarRed=atacar;
atacar=function(){
  if(BW&&BW.activo&&typeof RED!=='undefined'&&RED.conectado&&!apuntadoEnt&&!BW.yo.espectador){
    const o=remotoApuntado();
    if(o&&o.r.equipo!==BW.yo.equipo&&o.r.equipo!=null){
      const carga=cargaAtaque();ultimoAtaque=tiempoJuego;balancearMano();
      const p=enMano(),h=p&&ITEMS[p.id].herr;let dano=(h?h.dano:1)*(.2+.8*carga*carga);
      const filo=nivelEnc(p,'filo')+(BW.equipos[BW.yo.equipo].mejoras.filo?1:0);if(filo)dano+=(.5*filo+.5)*carga;
      const dx=o.r.g.position.x-jugador.pos.x,dz=o.r.g.position.z-jugador.pos.z,l=Math.hypot(dx,dz)||1;
      if(o.r.esBot)enviarRed({t:'bwGolpeBot',id:+String(o.id).slice(4),dano,dx:dx/l,dz:dz/l,equipo:BW.yo.equipo,nombre:RED.nombre});
      else enviarRed({t:'bwGolpe',a:o.id,dano,dx:dx/l,dz:dz/l,por:RED.nombre});
      sonar('golpe',o.r.g.position,.8);emitirParticulas(o.r.g.position.x,o.r.g.position.y+1.2,o.r.g.position.z,0xaa2020,5,1.5,.4,6);
      return true;
    }
  }
  return _atacarRed();
};
// El estado de cada jugador incluye su equipo y si sigue vivo
const _estadoLocalBW=estadoLocal;
estadoLocal=function(){const e=_estadoLocalBW();if(BW&&BW.activo){e.equipo=BW.yo.equipo;e.bwVivo=BW.yo.vivo&&!BW.yo.espectador;}return e;};
const _actualizarRemotoBW=actualizarRemoto;
actualizarRemoto=function(m){
  let r=RED.remotos.get(m.de);
  // Rehacer la figura con el color del equipo cuando se conoce (o cambia)
  if(r&&m.equipo!==undefined&&r.colEquipo!==m.equipo){quitarRemoto(m.de);r=null;}
  if(!r&&m.equipo!=null&&EQUIPOS_BW[m.equipo]){
    const E=EQUIPOS_BW[m.equipo],mod=modeloMob('botBW',{color:E.hex});
    const s=cartelTexto(m.nombre||'Jugador',E.col,320);s.scale.multiplyScalar(.7);s.position.set(0,2.45,0);mod.g.add(s);
    escena.add(mod.g);r={g:mod.g,piernas:mod.piernas,brazos:mod.brazos,cabeza:mod.extra.cabeza,obj:new THREE.Vector3(m.p[0],m.p[1],m.p[2]),yaw:0,pitch:0,fase:0,nombre:m.nombre,t:0,colEquipo:m.equipo};
    r.g.position.copy(r.obj);RED.remotos.set(m.de,r);
  }
  _actualizarRemotoBW(m);
  r=RED.remotos.get(m.de);
  if(r){if(m.equipo!==undefined){r.equipo=m.equipo;r.colEquipo=r.colEquipo??m.equipo;}if(m.bwVivo!==undefined)r.bwVivo=m.bwVivo;r.esBot=!!m.esBot;
    if(m.bwVivo===false&&BW&&BW.activo&&!m.esBot)r.g.visible=false;}
};
// El anfitrión reparte posiciones de los bots y el estado de la partida
const _actualizarFinalBWRed=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinalBWRed(dt);
  if(!(BW&&BW.activo)||typeof RED==='undefined'||!RED.conectado||BW.cliente)return;
  if((bwRedT-=dt)<=0){bwRedT=.1;enviarRed({t:'bwBots',l:BW.bots.filter(o=>!o.muerto).map(o=>[o.bwId,o.bw.equipo,+o.pos.x.toFixed(2),+o.pos.y.toFixed(2),+o.pos.z.toFixed(2),+o.yaw.toFixed(2),o.bw.nombre])});}
  if((bwEstadoT-=dt)<=0){bwEstadoT=1;enviarRed({t:'bwEstado',tt:BW.t,ev:BW.ev,camas:BW.equipos.map(q=>q.cama),vivos:BW.equipos.map(q=>q.vivos),fin:BW.fin,ganador:BW.ganador??null});}
};
const _terminarBWRed=terminarBW;
terminarBW=function(g){if(BW)BW.ganador=g;if(BW&&!BW.cliente&&typeof RED!=='undefined'&&RED.conectado)enviarRed({t:'bwEstado',tt:BW.t,ev:BW.ev,camas:BW.equipos.map(q=>q.cama),vivos:BW.equipos.map(q=>q.vivos),fin:true,ganador:g});return _terminarBWRed(g);};
// Si alguien entra con la partida empezada, la ve como espectador
const _recibirRedHola=recibirRed;
recibirRed=function(texto){
  _recibirRedHola(texto);
  let m;try{m=JSON.parse(texto);}catch(e){return;}
  if(m&&m.t==='hola'&&m.de!==RED.id&&RED.rol==='anfitrion'&&BW&&BW.activo&&!BW.cliente)enviarRed({t:'bwInicio',porEquipo:BW.porEquipo,dificultad:BW.dificultad,remotos:Object.assign({},BW.remotos,{[m.de]:null}),equipos:EQUIPOS_BW.length,tema:BW.tema});
};
// Aviso en la pantalla de Bed Wars si hay jugadores conectados
setInterval(()=>{const c=document.getElementById('pantallaBedwars');if(!c||c.classList.contains('oculto'))return;
  let p=c.querySelector('#bwRedInfo');if(!p){p=document.createElement('p');p.id='bwRedInfo';p.className='pista';c.querySelector('.tarjeta').insertBefore(p,c.querySelector('#bwEmpezar'));}
  const n=typeof RED!=='undefined'&&RED.conectado?RED.pares.size:0;
  p.textContent=!n?'Sin jugadores conectados: juegas contra bots. Para jugar con amigos, conéctate antes en «Multijugador».':RED.rol==='anfitrion'?`${n} jugador(es) conectado(s): entrarán en la partida ocupando el sitio de un bot.`:'Estás conectado como invitado: espera a que el anfitrión empiece la partida.';
  c.querySelector('#bwEmpezar').disabled=!!(n&&RED.rol!=='anfitrion');},500);
