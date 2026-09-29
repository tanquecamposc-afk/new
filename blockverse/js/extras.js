"use strict";
/* =========================================================
   Extras: pociones y soporte para pociones, yunque,
   vehículos (barcos y vagonetas), élitros y cohetes,
   gólems, fruta coro y portales de acceso del End.
   ========================================================= */
Object.assign(SND,{
  piston:v=>{ruidoSnd(.12,700,.3*v);tonoSnd(180,120,.1,'square',.05*v);},
  beber:v=>ruidoSnd(.12,500,.18*v,'bandpass'),
  cristal:v=>{ruidoSnd(.25,4000,.3*v,'highpass');tonoSnd(1800,900,.15,'sine',.06*v);},
  cohete:v=>{ruidoSnd(.6,2200,.25*v,'bandpass');tonoSnd(300,900,.4,'sawtooth',.04*v);},
  yunque:v=>{tonoSnd(1400,1300,.35,'triangle',.12*v);tonoSnd(2100,2000,.3,'sine',.05*v);},
  soporte:v=>{tonoSnd(500,700,.2,'sine',.06*v);ruidoSnd(.2,1500,.1*v,'bandpass');},
  golem:v=>tonoSnd(90,60,.4,'square',.06*v),
});

/* ---------- Efectos de pociones ---------- */
function aplicarPocion(ef,mult=1){
  if(ef==='curacion'){salud=Math.min(20,salud+4*mult);emitirParticulas(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z,0xff5050,8,1,.8,-1);actualizarHUD();return;}
  const t=Math.round((DURACION_POCION[ef]||30)*mult);
  if(!efectos[ef]||efectos[ef].t<t)efectos[ef]={t,n:1};
  sonar('nivel',null,.3);
}
function beberPila(it){
  if(it.pocion)aplicarPocion(it.pocion.efecto);
  sonar('beber');
  if(!supervivencia())return;
  const p=enMano(); if(!p)return;
  if(p.n>1){p.n--;const r=insertarInv(crearPila(500));if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}
  else inv[ranura]=crearPila(500);
  actualizarHUD();
}
function lanzarPocion(id){
  const dir=new THREE.Vector3(); camara.getWorldDirection(dir);
  const p=camara.position.clone().addScaledVector(dir,.4);
  const s=new THREE.Sprite(matSprite(id)); s.scale.set(.32,.32,.32);
  agregarEnt({tipo:'pocion',id,pos:p,vel:dir.multiplyScalar(14).add(new THREE.Vector3(0,2.5,0)),edad:0,malla:s,dueno:'jugador'});
}
ACT_ENT.pocion=(e,dt)=>{
  e.edad+=dt; e.vel.y-=20*dt;
  const ch=trazarProyectil(e,dt,.15);
  e.malla.position.copy(e.pos); e.malla.material.rotation=e.edad*8;
  if(!ch&&e.edad<15)return;
  e.muerta=true;
  const po=ITEMS[e.id].pocion, p=e.pos;
  sonar('cristal',p);
  emitirParticulas(p.x,p.y,p.z,po.color,30,3.5,1,2);
  emitirParticulas(p.x,p.y,p.z,0xffffff,8,2,.4,6);
  const d=Math.hypot(jugador.pos.x-p.x,jugador.pos.y+1-p.y,jugador.pos.z-p.z);
  if(d<4&&estado!=='muerto')aplicarPocion(po.efecto,1-d/4*.75);
  for(const m of mobs){if(m.muerto||m.pos.distanceTo(p)>4)continue;
    const noMuerto=m.tipo==='zombi'||m.tipo==='esqueleto'||m.tipo==='piglin';
    if(po.efecto==='curacion'){if(noMuerto)herirMob(m,6,null,'magia');else m.vida=Math.min(m.def.vida,m.vida+4);}
  }
};

/* ---------- HUD de efectos ---------- */
const elEfectos=document.createElement('div');
elEfectos.id='efectosHUD';
elEfectos.style.cssText='position:fixed;right:10px;top:10px;display:flex;flex-direction:column;gap:4px;pointer-events:none;font:12px/1.2 ui-monospace,Consolas,monospace;z-index:5';
document.body.appendChild(elEfectos);
const COLOR_EFECTO={fuerza:'#c84040',rapidez:'#7cafc6',regeneracion:'#cd5cab',resistenciaFuego:'#e49a3a',veneno:'#4e9331',hambre:'#587653',oscuridad:'#292929'};
let hudEfT=0;
function pintarEfectos(){
  const ks=Object.keys(efectos);
  elEfectos.innerHTML=ks.map(k=>{const t=Math.ceil(efectos[k].t),m=Math.floor(t/60),s=String(t%60).padStart(2,'0');
    return `<div style="background:rgba(16,16,16,.72);border:2px solid #000;box-shadow:inset 2px 2px 0 rgba(255,255,255,.1);border-left:6px solid ${COLOR_EFECTO[k]||'#aaa'};padding:4px 9px;color:#fff;font-family:var(--pixel);font-size:13px;text-shadow:1px 1px 0 #333">${NOMBRE_EFECTO[k]||k}${efectos[k].n>1?' II':''} <span style="opacity:.7">${m}:${s}</span></div>`;}).join('');
}

/* ---------- Soporte para pociones ---------- */
const TIEMPO_FERMENTAR=20;
function datosSoporte(k){
  if(!cofres[k]||cofres[k].length!==5)cofres[k]=[null,null,null,null,null];
  const est=mundoEstado.soportes||(mundoEstado.soportes={});
  if(!est[k])est[k]={comb:0,prog:0};
  return {slots:cofres[k],est:est[k]};
}
function puedeFermentar(sl){
  const ing=sl[3]; if(!ing)return false;
  for(let i=0;i<3;i++)if(sl[i]&&resultadoFermentar(sl[i].id,ing.id))return true;
  return false;
}
function actualizarSoportes(dt){
  const est=mundoEstado.soportes; if(!est)return;
  for(const k in est){
    if(!k.startsWith(dim.clave+':'))continue;
    const sl=cofres[k]; if(!sl||sl.length!==5){delete est[k];continue;}
    const e=est[k];
    if(!puedeFermentar(sl)){e.prog=0;continue;}
    if(e.comb<=0){const f=sl[4];if(f&&f.id===I.polvoBlaze){e.comb=20;if(--f.n<=0)sl[4]=null;}else{e.prog=0;continue;}}
    e.prog+=dt;
    if(Math.random()<dt*3){const [x,y,z]=k.split(':')[1].split(',').map(Number);emitirParticulas(x+.5,y+.9,z+.5,0xc8a0ff,1,.3,.8,-1);}
    if(e.prog>=TIEMPO_FERMENTAR){
      e.prog=0; e.comb--;
      const ing=sl[3];
      for(let i=0;i<3;i++)if(sl[i]){const r=resultadoFermentar(sl[i].id,ing.id);if(r)sl[i]=crearPila(r);}
      if(--ing.n<=0)sl[3]=null;
      const [x,y,z]=k.split(':')[1].split(',').map(Number);sonar('soporte',{x,y,z});
    }
  }
}
const esFrasco=id=>id===500||id===501||id===502||!!(ITEMS[id]&&ITEMS[id].pocion);

/* ---------- Yunque ---------- */
const MAT_REPARA_HERR=[B.tablones,B.roca,I.lingoteHierro,I.lingoteOro,I.diamante,535,I.lingoteCobre], MAT_REPARA_ARM=[I.cuero,I.lingoteOro,I.lingoteHierro,I.diamante,535,I.lingoteCobre];
function materialReparacion(id){
  const it=ITEMS[id]; if(it.elitros)return I.cuero; if(id===540)return 539;
  if(it.herr)return MAT_REPARA_HERR[it.herr.mat];
  if(it.armadura)return MAT_REPARA_ARM[it.armadura.mat];
  return 0;
}
function resultadoYunque(a,b){
  if(!a||!b)return null;
  const it=ITEMS[a.id]; if(!it.dur)return null;
  const out={...a,enc:a.enc?{...a.enc}:undefined};
  if(b.id===materialReparacion(a.id)){
    if(a.dur>=it.dur)return null;
    const q=Math.max(1,Math.floor(it.dur/4)), n=Math.min(b.n,Math.ceil((it.dur-a.dur)/q));
    out.dur=Math.min(it.dur,a.dur+q*n);
    return {pila:out,coste:n+(a.enc?Object.keys(a.enc).length:0),usa:n};
  }
  if(b.id!==a.id)return null;
  let coste=0;
  if(a.dur<it.dur){out.dur=Math.min(it.dur,a.dur+b.dur+Math.floor(it.dur*.12));coste+=2;}
  if(b.enc){
    out.enc=out.enc||{};
    for(const k in b.enc){
      if(Object.keys(out.enc).some(o=>o!==k&&(ENCANTOS[o].excluye===k||ENCANTOS[k].excluye===o)))continue;
      const act=out.enc[k]||0, nv=act===b.enc[k]?Math.min(ENCANTOS[k].max,act+1):Math.max(act,b.enc[k]);
      if(nv!==act){out.enc[k]=nv;coste+=nv*2;}
    }
    if(!Object.keys(out.enc).length)out.enc=undefined;
  }
  if(!coste)return null;
  return {pila:out,coste:coste+(a.enc?Object.keys(a.enc).length:0),usa:1};
}

/* ---------- Pantallas del soporte y del yunque ---------- */
const UI_EXTRA={
  pociones:{
    abrir(u){const d=datosSoporte(u.clave);u.soporte=d.slots;u.estSoporte=d.est;},
    construir(titulo,fila){
      titulo('SOPORTE PARA POCIONES');
      const z=fila(), s=ui.soporte;
      const izq=document.createElement('div');izq.className='hornoCol';
      crearSlot(izq,refArr(s,4,{acepta:p=>p.id===I.polvoBlaze,shift:aJugador}),false,'polvo');
      const comb=document.createElement('div');comb.className='progreso fuego';comb.innerHTML='<i id="barCombSoporte"></i>';izq.appendChild(comb);
      const centro=document.createElement('div');centro.className='hornoCol';
      crearSlot(centro,refArr(s,3,{acepta:p=>!esFrasco(p.id),shift:aJugador}),false,'ingrediente');
      const pr=document.createElement('div');pr.className='progreso';pr.style.transform='rotate(90deg)';pr.innerHTML='<i id="barFermentar"></i>';centro.appendChild(pr);
      const frascos=document.createElement('div');frascos.className='zonaCraft';
      for(let i=0;i<3;i++)crearSlot(frascos,refArr(s,i,{acepta:p=>esFrasco(p.id),max:1,shift:aJugador}),false,'frasco');
      centro.appendChild(frascos);
      z.append(izq,centro);
    },
    refrescar(){
      const e=ui.estSoporte, a=document.getElementById('barFermentar'), c=document.getElementById('barCombSoporte');
      if(a)a.style.width=(e.prog/TIEMPO_FERMENTAR*100)+'%'; if(c)c.style.width=(e.comb/20*100)+'%';
    },
    shift(p){
      const s=ui.soporte;
      if(p.id===I.polvoBlaze&&(!s[4]||s[4].id===p.id)){p=insertarEn(s,4,p);if(!p)return null;}
      if(esFrasco(p.id)){for(let i=0;i<3&&p;i++)if(!s[i]){s[i]={...p,n:1};p.n--;if(p.n<=0)p=null;}return p;}
      return insertarEn(s,3,p);
    },
  },
  yunque:{
    abrir(u){u.yunque={a:null,b:null};},
    construir(titulo,fila){
      titulo('YUNQUE');
      const z=fila(), y=ui.yunque;
      crearSlot(z,refObj(y,'a',{max:1,acepta:p=>!!ITEMS[p.id].dur,shift:aJugador}));
      const mas=document.createElement('div');mas.className='flecha';mas.textContent='+';z.appendChild(mas);
      crearSlot(z,refObj(y,'b',{shift:aJugador}));
      const fl=document.createElement('div');fl.className='flecha';fl.textContent='➜';z.appendChild(fl);
      crearSlot(z,{tipo:'salida',
        get:()=>{const r=resultadoYunque(y.a,y.b);return r&&(r.coste<40||!supervivencia())&&(xp.nivel>=r.coste||!supervivencia())?r.pila:null;},
        set:v=>{if(v)return;const r=resultadoYunque(y.a,y.b);if(!r)return;
          if(supervivencia())gastarNiveles(r.coste);
          y.a=null; y.b.n-=r.usa; if(y.b.n<=0)y.b=null; sonar('yunque');},
        shift:p=>{const r=aJugador(p);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);return null;},
        acepta:()=>false},true);
      const c=document.createElement('div');c.className='pista';c.id='costeYunque';elSup.appendChild(c);
    },
    refrescar(){
      const c=document.getElementById('costeYunque'); if(!c)return;
      const y=ui.yunque, r=resultadoYunque(y.a,y.b);
      if(!r){c.textContent=y.a?'Combina con el mismo objeto o con su material para reparar.':'Coloca una herramienta, arma o armadura.';c.style.color='';return;}
      const caro=r.coste>=40&&supervivencia(), falta=xp.nivel<r.coste&&supervivencia();
      c.textContent=caro?'¡Demasiado caro!':`Coste de encantamiento: ${r.coste}`; c.style.color=caro||falta?'#ff6060':'#80ff80';
    },
    shift(p){const y=ui.yunque;if(!y.a&&ITEMS[p.id].dur){y.a=p;return null;}return insertarEn(y,'b',p);},
    cerrar(u,devolver){devolver(u.yunque.a);devolver(u.yunque.b);},
  },
};

/* ---------- Vehículos ---------- */
const matMaderaV=new THREE.MeshLambertMaterial({color:0x9a7040}), matMaderaOsc=new THREE.MeshLambertMaterial({color:0x6e4e2a}),
  matHierroV=new THREE.MeshLambertMaterial({color:0x8a8a90}), matHierroOsc=new THREE.MeshLambertMaterial({color:0x4a4a50});
function cajaV(g,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m;}
function mallaBarco(){
  const g=new THREE.Group();
  cajaV(g,1.2,.1,1.9,0,.05,0,matMaderaOsc);
  cajaV(g,.1,.4,1.9,-.6,.25,0,matMaderaV); cajaV(g,.1,.4,1.9,.6,.25,0,matMaderaV);
  cajaV(g,1.3,.4,.1,0,.25,-.95,matMaderaV); cajaV(g,1.3,.4,.1,0,.25,.95,matMaderaV);
  cajaV(g,1.1,.08,.25,0,.3,.2,matMaderaOsc);
  const remos=[cajaV(g,.08,.08,1,-.75,.4,0,matMaderaOsc),cajaV(g,.08,.08,1,.75,.4,0,matMaderaOsc)];
  g.userData.remos=remos;
  return g;
}
function mallaVagoneta(){
  const g=new THREE.Group();
  cajaV(g,.9,.08,1.2,0,.12,0,matHierroOsc);
  cajaV(g,.08,.55,1.2,-.45,.38,0,matHierroV); cajaV(g,.08,.55,1.2,.45,.38,0,matHierroV);
  cajaV(g,.98,.55,.08,0,.38,-.6,matHierroV); cajaV(g,.98,.55,.08,0,.38,.6,matHierroV);
  for(const [x,z] of [[-.4,-.35],[.4,-.35],[-.4,.35],[.4,.35]])cajaV(g,.1,.18,.18,x,.06,z,matHierroOsc);
  return g;
}
function crearVehiculo(tipo,x,y,z,yaw=0){
  const barco=tipo==='barco';
  const e=agregarEnt({tipo,vehiculo:true,pos:new THREE.Vector3(x,y,z),vel:new THREE.Vector3(),edad:0,yaw,
    ancho:barco?.65:.49,alto:barco?.55:.7,subir:false,malla:barco?mallaBarco():mallaVagoneta(),s:0,u:.5,golpes:0,luzT:0});
  e.malla.position.copy(e.pos);
  return e;
}
function colocarVehiculo(tipo){
  camara.getWorldDirection(dirVista);
  if(tipo==='barco'){
    const r=lanzarRayo(camara.position,dirVista,5,true); if(!r)return false;
    const agua=esAgua(r.b);
    const y=agua?r.y+.9:r.y+(r.n?r.n[1]:1);
    crearVehiculo('barco',r.x+.5,agua?r.y+.7:r.y+1,r.z+.5,jugador.yaw);
    sonar('poner',{x:r.x,y,z:r.z});return true;
  }
  if(!apuntado||!esRiel(apuntado.b))return false;
  const e=crearVehiculo('vagoneta',apuntado.x+.5,apuntado.y+.0625,apuntado.z+.5);
  sonar('poner',apuntado);
  e.rb=null; return true;
}
function montar(e){
  if(jugador.montura||estado!=='jugando')return;
  jugador.montura=e; e.jinete=true; jugador.vel.set(0,0,0); jugador.planeando=false;
  mostrarMensaje('Pulsa Mayús para bajar');
}
function desmontar(){
  const e=jugador.montura; if(!e)return;
  jugador.montura=null; e.jinete=false;
  const opciones=e.def?[[1.3,0,0],[-1.3,0,0],[0,0,1.3],[0,0,-1.3],[0,e.alto+.05,0]]:[[0,e.alto+.05,0],[1.2,0,0],[-1.2,0,0],[0,0,1.2],[0,0,-1.2],[0,1.2,0]];
  for(const [dx,dy,dz] of opciones){
    const p={x:e.pos.x+dx,y:e.pos.y+dy+.05,z:e.pos.z+dz};
    if(!choca(p,jugador.ancho,jugador.alto)){jugador.pos.set(p.x,p.y,p.z);break;}
  }
  jugador.vel.set(0,0,0); jugador.maxY=jugador.pos.y;
}
function golpearVehiculo(e){
  e.golpes++; e.golpeT=.3; sonar('golpe',e.pos,.6);
  e.s*=.5; e.vel.multiplyScalar(.5);
  if(!supervivencia()||e.golpes>=3){
    if(jugador.montura===e)desmontar();
    e.muerta=true;
    if(supervivencia())soltarItem(crearPila(e.tipo==='barco'?I.barco:I.vagoneta),e.pos.x,e.pos.y+.5,e.pos.z,true);
  }
}
function asientoJinete(e){
  if(jugador.montura!==e)return;
  const off=e.tipo==='barco'?-.35:e.tipo==='camello'?(e.sentado?.55:1.15):e.tipo==='ghastFeliz'?4.02:-.25;
  jugador.pos.set(e.pos.x,e.pos.y+off,e.pos.z); jugador.vel.set(0,0,0); jugador.maxY=jugador.pos.y;
}
function dirEntradaCamara(){
  let fx=0,fz=0;
  if(teclas.KeyW)fz-=1; if(teclas.KeyS)fz+=1; if(teclas.KeyA)fx-=1; if(teclas.KeyD)fx+=1;
  const s=Math.sin(jugador.yaw),c=Math.cos(jugador.yaw);
  return {x:fx*c+fz*s,z:-fx*s+fz*c,f:fz};
}
ACT_ENT.barco=(e,dt)=>{
  e.edad+=dt; if(e.golpeT>0)e.golpeT-=dt;
  const bx=Math.floor(e.pos.x),bz=Math.floor(e.pos.z);
  let wy=Math.floor(e.pos.y+.35), flota=false;
  if(esAgua(getBloque(bx,wy,bz))){let k=0;while(k<4&&esAgua(getBloque(bx,wy+1,bz))){wy++;k++;}flota=true;}
  const hielo=getBloque(bx,Math.floor(e.pos.y-.1),bz)===B.hielo;
  if(flota){const obj=wy+.72;e.vel.y+=((obj-e.pos.y)*8-e.vel.y)*Math.min(1,dt*6);}
  else e.vel.y=Math.max(-30,e.vel.y-20*dt);
  let quiere=0;
  if(e.jinete&&estado==='jugando'){
    const d=dirEntradaCamara();
    if(d.f<0)quiere=1; else if(d.f>0)quiere=-.5;
    let dy=jugador.yaw-e.yaw; while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;
    e.yaw+=dy*Math.min(1,dt*3);
    if(teclas.KeyA)e.yaw+=dt*2; if(teclas.KeyD)e.yaw-=dt*2;
  }
  const max=flota?8:hielo?20:.8, fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw);
  if(quiere){e.vel.x+=fx*quiere*max*dt*1.6;e.vel.z+=fz*quiere*max*dt*1.6;}
  const hs=Math.hypot(e.vel.x,e.vel.z);if(hs>max){e.vel.x*=max/hs;e.vel.z*=max/hs;}
  const fr=Math.pow(flota?.55:hielo?.9:.02,dt); e.vel.x*=fr; e.vel.z*=fr;
  pasoFisico(e,dt);
  if(e.chocoH&&hs>6&&supervivencia()){  // choque fuerte: se rompe
    if(jugador.montura===e)desmontar(); e.muerta=true;
    for(let i=0;i<3;i++)soltarItem(crearPila(B.tablones),e.pos.x,e.pos.y+.5,e.pos.z,true);
    for(let i=0;i<2;i++)soltarItem(crearPila(I.palo),e.pos.x,e.pos.y+.5,e.pos.z,true);
    sonar('romper',e.pos); return;
  }
  // empujar criaturas
  for(const m of mobs)if(!m.muerto&&Math.abs(m.pos.x-e.pos.x)<.9&&Math.abs(m.pos.z-e.pos.z)<.9&&Math.abs(m.pos.y-e.pos.y)<1){
    const dx=m.pos.x-e.pos.x,dz=m.pos.z-e.pos.z,l=Math.hypot(dx,dz)||1;m.vel.x+=dx/l*dt*20;m.vel.z+=dz/l*dt*20;}
  e.malla.position.set(e.pos.x,e.pos.y+Math.sin(e.edad*2)*(flota?.03:0),e.pos.z);
  e.malla.rotation.set(0,e.yaw,Math.sin(e.edad*1.5)*(flota?.02:0));
  if(quiere&&flota){const r=e.malla.userData.remos;const a=Math.sin(e.edad*6);r[0].rotation.x=a*.6;r[1].rotation.x=a*.6;
    if(Math.random()<dt*6)emitirParticulas(e.pos.x-fx*.9,e.pos.y+.2,e.pos.z-fz*.9,0xd0e8ff,1,1,.4,4);}
  sombrearVehiculo(e,dt);
  asientoJinete(e);
};
function sombrearVehiculo(e,dt){
  e.luzT-=dt; if(e.luzT>0)return; e.luzT=.25;
  const l=Math.max(.15,brilloEn(e.pos.x,e.pos.y+.5,e.pos.z))*(e.golpeT>0?1.5:1);
  e.malla.traverse(o=>{if(o.isMesh){if(!o.userData.propio){o.material=o.material.clone();o.userData.propio=true;o.userData.c0=o.material.color.clone();}
    o.material.color.copy(o.userData.c0).multiplyScalar(l);}});
}
function railBajo(e){
  const bx=Math.floor(e.pos.x),bz=Math.floor(e.pos.z),y=Math.floor(e.pos.y+.2);
  for(const dy of [0,-1]){const b=getBloque(bx,y+dy,bz);if(esRiel(b))return [bx,y+dy,bz,b];}
  return null;
}
function entrarRiel(e,r,rumbo){
  const [x,y,z,b]=r, cn=BLOQUES[b].riel;
  const desde=(rumbo+2)%4;
  if(cn[0]===desde||cn[1]===desde){e.ent=desde;e.sal=cn[0]===desde?cn[1]:cn[0];}
  else if(cn[0]===rumbo||cn[1]===rumbo){e.sal=rumbo;e.ent=cn[0]===rumbo?cn[1]:cn[0];}
  else{e.ent=cn[0];e.sal=cn[1];e.s=0;}
  e.rb=[x,y,z];
}
function posEnRiel(e){
  const [x,y,z]=e.rb, d=BLOQUES[getBloque(x,y,z)], u=e.u;
  let ox,oz;
  if(u<.5){const [dx,dz]=DIRF[e.ent];ox=dx*(.5-u);oz=dz*(.5-u);}
  else{const [dx,dz]=DIRF[e.sal];ox=dx*(u-.5);oz=dz*(u-.5);}
  let py=y+.0625;
  if(d&&d.sube!==undefined){const [sx,sz]=DIRF[d.sube];py+=ox*sx+oz*sz+.5;}
  e.pos.set(x+.5+ox,py,z+.5+oz);
}
ACT_ENT.vagoneta=(e,dt)=>{
  e.edad+=dt; if(e.golpeT>0)e.golpeT-=dt;
  if(!e.rb){const r=railBajo(e);
    if(r){const hs=Math.hypot(e.vel.x,e.vel.z);
      const rumbo=hs>.1?(Math.abs(e.vel.x)>Math.abs(e.vel.z)?(e.vel.x>0?1:3):(e.vel.z>0?2:0)):facingJugador();
      e.s=hs; e.u=.5; entrarRiel(e,r,rumbo);
      const [x,,z]=r, ox=e.pos.x-(x+.5), oz=e.pos.z-(z+.5), [sx,sz]=DIRF[e.sal];
      e.u=clamp(.5+ox*sx+oz*sz,0,1);
    }else{
      e.vel.y=Math.max(-40,e.vel.y-25*dt); pasoFisico(e,dt);
      if(e.suelo){const f=Math.pow(.1,dt);e.vel.x*=f;e.vel.z*=f;}
      e.malla.position.copy(e.pos); sombrearVehiculo(e,dt); asientoJinete(e); return;
    }
  }
  const pasos=Math.max(1,Math.ceil(Math.abs(e.s)*dt/.2)), h=dt/pasos;
  for(let i=0;i<pasos&&e.rb;i++){
    const [x,y,z]=e.rb, b=getBloque(x,y,z), d=BLOQUES[b];
    if(!esRiel(b)){e.rb=null;const [dx,dz]=DIRF[e.sal];e.vel.set(dx*e.s,0,dz*e.s);break;}
    if(d.sube!==undefined){if(e.sal===d.sube)e.s-=11*h;else if(e.ent===d.sube)e.s+=11*h;}
    if(d.propulsor){
      if(d.encendido){
        if(Math.abs(e.s)<.05){const [dx,dz]=DIRF[e.sal];if(SOLIDO[getBloque(x+dx,y,z+dz)]){const t=e.ent;e.ent=e.sal;e.sal=t;e.u=1-e.u;}e.s=1;}
        e.s=Math.min(8,e.s+(e.s>=0?30:-30)*h);
      }else e.s*=Math.pow(.0005,h);
    }
    if(e.jinete&&estado==='jugando'){const di=dirEntradaCamara();if(di.x||di.z){
      const [dx,dz]=e.u<.5?[-DIRF[e.ent][0],-DIRF[e.ent][1]]:DIRF[e.sal];e.s+=(di.x*dx+di.z*dz)*3*h;}}
    // empuje del jugador al caminar contra ella
    if(!e.jinete){const px=jugador.pos.x-e.pos.x,pz=jugador.pos.z-e.pos.z;
      if(Math.abs(px)<.8&&Math.abs(pz)<.8&&Math.abs(jugador.pos.y-e.pos.y)<1.2){
        const [dx,dz]=e.u<.5?[-DIRF[e.ent][0],-DIRF[e.ent][1]]:DIRF[e.sal];e.s-=(px*dx+pz*dz)*12*h;}}
    e.s*=Math.pow(e.jinete?.9:.75,h);
    if(Math.abs(e.s)>8)e.s=Math.sign(e.s)*8;
    if(e.s<0){const t=e.ent;e.ent=e.sal;e.sal=t;e.u=1-e.u;e.s=-e.s;}
    e.u+=e.s*h;
    if(e.u>=1){
      const [dx,dz]=DIRF[e.sal], sube=d.sube===e.sal;
      let r=null;
      for(const dy of sube?[1,0,-1]:[0,-1,1]){const nb=getBloque(x+dx,y+dy,z+dz);if(esRiel(nb)){r=[x+dx,y+dy,z+dz,nb];break;}}
      if(r){const s=e.s;entrarRiel(e,r,e.sal);e.u-=1;if(e.s===0)e.u=.5;else e.s=s;}
      else if(SOLIDO[getBloque(x+dx,y+(sube?1:0),z+dz)]){e.u=1;e.s=0;}
      else{posEnRiel(e);e.rb=null;e.vel.set(dx*e.s,sube?e.s*.7:0,dz*e.s);e.pos.x+=dx*.05;e.pos.z+=dz*.05;break;}
    }
    if(e.rb)posEnRiel(e);
  }
  // criaturas atropelladas se suben / empujan
  for(const m of mobs)if(!m.muerto&&Math.abs(m.pos.x-e.pos.x)<.7&&Math.abs(m.pos.z-e.pos.z)<.7&&Math.abs(m.pos.y-e.pos.y)<1){
    const dx=m.pos.x-e.pos.x,dz=m.pos.z-e.pos.z,l=Math.hypot(dx,dz)||1;m.vel.x+=dx/l*dt*(10+e.s*6);m.vel.z+=dz/l*dt*(10+e.s*6);}
  e.malla.position.copy(e.pos);
  if(e.rb){
    const [dx,dz]=e.u<.5?[-DIRF[e.ent][0],-DIRF[e.ent][1]]:DIRF[e.sal];
    const obj=Math.atan2(-dx,-dz); let dy=obj-e.yaw; while(dy>Math.PI/2)dy-=Math.PI; while(dy<-Math.PI/2)dy+=Math.PI;
    e.yaw+=dy*Math.min(1,dt*12);
    const d=BLOQUES[getBloque(...e.rb)], pend=d&&d.sube!==undefined?(DIRF[d.sube][0]*dx+DIRF[d.sube][1]*dz)*.785:0;
    e.malla.rotation.set(0,e.yaw,0); e.malla.rotateX(pend);
    if(e.s>5&&Math.random()<dt*10)emitirParticulas(e.pos.x,e.pos.y+.05,e.pos.z,0xffd080,1,1.5,.25,10);
  }
  sombrearVehiculo(e,dt);
  asientoJinete(e);
};
function vehiculoApuntado(){
  camara.getWorldDirection(dirVista);
  let mejor=null,tm=3.5;
  for(const e of entidades){if(!e.vehiculo||e.muerta)continue;
    const t=rayoCaja(camara.position,dirVista,{x:e.pos.x-e.ancho,y:e.pos.y,z:e.pos.z-e.ancho},{x:e.pos.x+e.ancho,y:e.pos.y+e.alto,z:e.pos.z+e.ancho});
    if(t!==null&&t<tm){tm=t;mejor=e;}}
  return mejor;
}

/* ---------- Élitros y cohetes ---------- */
let espacioAntes=false, coheteT=0, elitroDurT=0, acumPlaneo=0;
function tieneElitros(){const p=inv[37];return !!(p&&ITEMS[p.id].elitros&&p.dur>1);}
// Devuelve true si se encarga del movimiento del jugador este fotograma
function fisicaEspecial(j,dt,entrada){
  if(j.montura){
    if(j.montura.muerta||j.montura.muerto){j.montura=null;return false;}
    if(entrada&&(teclas.ShiftLeft||teclas.ShiftRight)){desmontar();return true;}
    asientoJinete(j.montura); j.suelo=true; j.enAgua=false; return true;
  }
  const esp=!!(entrada&&teclas.Space);
  if(!j.planeando&&esp&&!espacioAntes&&tieneElitros()&&!j.suelo&&!j.vuela&&!j.enAgua&&!j.enLava&&!j.enEscalera&&j.vel.y<0)
    {j.planeando=true;acumPlaneo=0;}
  espacioAntes=esp;
  if(!j.planeando)return false;
  if(!tieneElitros()||j.suelo||j.enAgua||j.enLava||j.vuela){j.planeando=false;return false;}
  acumPlaneo+=dt;
  let vx=j.vel.x/20,vy=j.vel.y/20,vz=j.vel.z/20;
  const cp=Math.cos(j.pitch);
  const lx=-Math.sin(j.yaw)*cp, ly=Math.sin(j.pitch), lz=-Math.cos(j.yaw)*cp;
  const f=-j.pitch;
  while(acumPlaneo>=.05){
    acumPlaneo-=.05;
    const d=Math.hypot(lx,lz), d1=Math.hypot(vx,vz), f1=Math.cos(f)**2;
    vy+=-.08+f1*.06;
    if(vy<0&&d>0){const d5=vy*-.1*f1;vx+=lx*d5/d;vy+=d5;vz+=lz*d5/d;}
    if(f<0&&d>0){const d9=d1*-Math.sin(f)*.04;vx+=-lx*d9/d;vy+=d9*3.2;vz+=-lz*d9/d;}
    if(d>0){vx+=(lx/d*d1-vx)*.1;vz+=(lz/d*d1-vz)*.1;}
    vx*=.99;vy*=.98;vz*=.99;
    if(coheteT>0){vx+=lx*.1+(lx*1.5-vx)*.5;vy+=ly*.1+(ly*1.5-vy)*.5;vz+=lz*.1+(lz*1.5-vz)*.5;}
  }
  if(coheteT>0){coheteT-=dt;if(Math.random()<dt*30)emitirParticulas(j.pos.x,j.pos.y+.4,j.pos.z,prob(.5)?0xffe070:0xff8030,1,.8,.5,0);}
  const antes=Math.hypot(vx,vz);
  j.vel.set(vx*20,vy*20,vz*20);
  pasoFisico(j,dt);
  if(j.chocoH){const dano=antes*10-3;if(dano>0)danarJugador(Math.ceil(dano),'choque',null);j.vel.x=j.vel.z=0;}
  if(vy>-.5)j.maxY=j.pos.y;
  if(j.suelo){const caida=j.maxY-j.pos.y;if(caida>3.2&&supervivencia())danarJugador(Math.ceil(caida-3),'caida',null);j.maxY=j.pos.y;j.planeando=false;}
  if(supervivencia()){elitroDurT+=dt;if(elitroDurT>=1){elitroDurT=0;const p=inv[37];p.dur--;if(p.dur<=1)mostrarMensaje('Tus élitros están rotos.');}}
  if(j.pos.y<-40&&supervivencia())danarJugador(4,'vacio',null);
  return true;
}

/* ---------- Gólems ---------- */
function comprobarGolem(x,y,z){
  const b=getBloque(x,y,z); if(b!==B.calabaza&&b!==B.linternaCalabaza)return;
  const H=B.bloqueHierro;
  if(getBloque(x,y-1,z)===H&&getBloque(x,y-2,z)===H){
    for(const [dx,dz] of [[1,0],[0,1]]){
      if(getBloque(x+dx,y-1,z+dz)===H&&getBloque(x-dx,y-1,z-dz)===H){
        for(const [px,py,pz] of [[x,y,z],[x,y-1,z],[x,y-2,z],[x+dx,y-1,z+dz],[x-dx,y-1,z-dz]]){
          emitirParticulas(px+.5,py+.5,pz+.5,0xd8d8d8,8,2,.6,6);setBloque(px,py,pz,0);}
        const g=crearMob('golem',x+.5,y-2,z+.5); g.creadoJugador=true;
        sonar('golem',{x,y,z}); mostrarMensaje('¡Has creado un gólem de hierro!');
        return;
      }
    }
  }
  if(B.bloqueNieve&&getBloque(x,y-1,z)===B.bloqueNieve&&getBloque(x,y-2,z)===B.bloqueNieve&&DEF_MOB.golemNieve){
    for(const dy of [0,1,2])setBloque(x,y-dy,z,0);
    crearMob('golemNieve',x+.5,y-2,z+.5);
  }
}

/* ---------- Fruta coro ---------- */
function teletransporteCoro(){
  const j=jugador.pos;
  for(let k=0;k<16;k++){
    const x=Math.floor(j.x+(Math.random()-.5)*16), z=Math.floor(j.z+(Math.random()-.5)*16);
    const y=buscarSuelo(x,Math.floor(j.y)+8,z,16,2);
    if(y>0){emitirParticulas(j.x,j.y+1,j.z,0x9050d0,16,2,.8,0);jugador.pos.set(x+.5,y+.01,z+.5);jugador.vel.set(0,0,0);jugador.maxY=jugador.pos.y;
      sonar('portal',null,.35);return;}
  }
}

/* ---------- Portales de acceso del End ---------- */
function crearAccesoPrincipal(){
  const a=(semilla%628)/100, gx=Math.round(Math.cos(a)*96), gz=Math.round(Math.sin(a)*96), gy=END_TOP+22;
  setBloque(gx,gy,gz,B.portalAcceso,{sinAviso:true});
  setBloque(gx,gy-2,gz,B.lecho,{sinAviso:true}); setBloque(gx,gy+2,gz,B.lecho,{sinAviso:true});
  mundoEstado.acceso=[gx,gy,gz];
}
let accesoT=0;
function comprobarAcceso(dt){
  accesoT=Math.max(0,accesoT-dt);
  if(dim!==DIMS.end||accesoT>0||jugador.montura)return;
  const p=jugador.pos;
  let en=false;
  for(const dy of [.1,1,1.7])if(getBloque(Math.floor(p.x),Math.floor(p.y+dy),Math.floor(p.z))===B.portalAcceso)en=true;
  if(!en)return;
  accesoT=3; sonar('portal');
  const lejos=Math.hypot(p.x,p.z)>500;
  let tx,tz;
  if(lejos){tx=0;tz=0;const a=mundoEstado.acceso;if(a){tx=a[0]*.6;tz=a[2]*.6;}}
  else{[tx,tz]=salidaAcceso();}
  tx=Math.floor(tx);tz=Math.floor(tz);
  let y=CY-2; while(y>1&&!SOLIDO[getBloque(tx,y,tz)])y--;
  if(y<=1){y=END_TOP;for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)setBloque(tx+dx,y,tz+dz,B.piedraEnd);}
  if(!lejos){const k=clavePos(tx,y+10,tz);if(getBloque(tx,y+10,tz)!==B.portalAcceso){setBloque(tx,y+10,tz,B.portalAcceso,{sinAviso:true});setBloque(tx,y+8,tz,B.lecho,{sinAviso:true});setBloque(tx,y+12,tz,B.lecho,{sinAviso:true});}
    mostrarMensaje('Has llegado a las islas exteriores del End.');}
  jugador.pos.set(tx+.5+2,y+1.01,tz+.5); jugador.vel.set(0,0,0); jugador.maxY=jugador.pos.y; jugador.planeando=false;
  if(lejos){let y2=CY-2;const x2=Math.floor(jugador.pos.x);while(y2>1&&!SOLIDO[getBloque(x2,y2,tz)])y2--;jugador.pos.y=y2+1.01;}
}

/* ---------- Uso con clic derecho (antes que el uso general) ---------- */
function usarDerechoExtra(p,id,it){
  if(usarDerechoV120(p,id,it))return true;
  if(!it)return false;
  if(id===500){
    camara.getWorldDirection(dirVista);
    const r=lanzarRayo(camara.position,dirVista,5,true);
    if(r&&esAgua(r.b)){sonar('agua',r,.6);
      if(supervivencia()){if(p.n>1){p.n--;const q=insertarInv(crearPila(501));if(q)soltarItem(q,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}else inv[ranura]=crearPila(501);actualizarHUD();}
      else insertarInv(crearPila(501));
      balancearMano();return true;}
    return false;
  }
  if(it.pocion&&it.pocion.arrojadiza){lanzarPocion(id);consumirEnMano();sonar('arco',null,.5);balancearMano();cdUso=.5;return true;}
  if(id===I.cohete){
    if(jugador.planeando){coheteT=1.2;consumirEnMano();sonar('cohete');return true;}
    if(apuntado){const q=posColocar();if(q){fuegoArtificial(q[0]+.5,q[1]+.1,q[2]+.5);consumirEnMano();return true;}}
    return false;
  }
  if(it.coloca==='barco'||it.coloca==='vagoneta'){if(colocarVehiculo(it.coloca)){consumirEnMano();balancearMano();}return true;}
  if(it.coloca==='cable'){if(colocarBloque(B.cable0))consumirEnMano();return true;}
  if(it.coloca==='verruga'){
    if(apuntado&&apuntado.b===B.arenaAlmas&&!getBloque(apuntado.x,apuntado.y+1,apuntado.z)){setBloque(apuntado.x,apuntado.y+1,apuntado.z,B.verruga0);consumirEnMano();balancearMano();sonar('poner',apuntado);}
    return true;
  }
  return false;
}
function fuegoArtificial(x,y,z){
  sonar('cohete',{x,y,z});
  const s=new THREE.Sprite(matSprite(I.cohete));s.scale.set(.3,.3,.3);
  agregarEnt({tipo:'cohete',pos:new THREE.Vector3(x,y,z),vel:new THREE.Vector3((Math.random()-.5),14,(Math.random()-.5)),edad:0,malla:s});
}
ACT_ENT.cohete=(e,dt)=>{
  e.edad+=dt; e.pos.addScaledVector(e.vel,dt); e.vel.y+=4*dt; e.malla.position.copy(e.pos);
  if(Math.random()<dt*40)emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0xffd070,1,.4,.4,2);
  if(e.edad>1.3){e.muerta=true;sonar('explosion',e.pos,.25);
    const cols=[0xff4040,0x40ff60,0x4080ff,0xffe040,0xff60ff,0x60ffff];const c=cols[Math.floor(Math.random()*cols.length)];
    emitirParticulas(e.pos.x,e.pos.y,e.pos.z,c,60,9,1.4,3);emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0xffffff,20,6,.9,3);}
};

/* ---------- Bucle ---------- */
let extrasT=0;
function actualizarExtras(dt){
  actualizarSoportes(dt);
  actualizarV120(dt);
  comprobarAcceso(dt);
  if(dim===DIMS.end&&mundoEstado.dragonMuerto&&!mundoEstado.acceso)crearAccesoPrincipal();
  hudEfT-=dt; if(hudEfT<=0){hudEfT=.5;pintarEfectos();}
  extrasT-=dt;
  if(extrasT<=0){extrasT=.2;if(ui&&ui.tipo==='pociones')refrescarUI();}
  if(jugador.planeando){camara.rotation.z=0;}
}
