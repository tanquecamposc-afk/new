"use strict";
/* =========================================================
   Contenido de 1.21 "Tricky Trials": cámaras de prueba con
   generadores de pruebas y bóvedas, el Breeze, las cargas de
   viento, el núcleo pesado y la maza.
   ========================================================= */
Object.assign(SND,{
  breeze:v=>{ruidoSnd(.5,1800,.12*v,'bandpass');tonoSnd(500,900,.3,'sine',.03*v);},
  viento:v=>{ruidoSnd(.45,900,.35*v,'bandpass');ruidoSnd(.3,3000,.15*v,'highpass');},
  maza:v=>{tonoSnd(120,50,.4,'square',.2*v);ruidoSnd(.5,400,.5*v);},
  pruebas:v=>{tonoSnd(300,600,.4,'triangle',.08*v);tonoSnd(450,900,.4,'triangle',.06*v,.2);},
});

/* ---------- Generación de las cámaras ---------- */
const R_CAMARA=320, F_CAMARA=OY-28;
function camarasPruebaCerca(x0,z0,x1,z1){
  const res=[];
  for(let rx=Math.floor((x0-48)/R_CAMARA);rx<=Math.floor((x1+48)/R_CAMARA);rx++)
    for(let rz=Math.floor((z0-48)/R_CAMARA);rz<=Math.floor((z1+48)/R_CAMARA);rz++){
      if(hash2(rx,rz,semilla+9300)>.55)continue;
      res.push({x:rx*R_CAMARA+60+Math.floor(hash2(rx,rz,semilla+9301)*(R_CAMARA-120)),z:rz*R_CAMARA+60+Math.floor(hash2(rx,rz,semilla+9302)*(R_CAMARA-120)),y:F_CAMARA});
    }
  return res;
}
const TIPOS_PRUEBA=['zombi','esqueleto','arana','slime','breeze'];
function construirCamarasPrueba(ch){
  const bx=ch.cx*CX,bz=ch.cz*CZ,d=ch.datos,s=semilla;
  for(const c of camarasPruebaCerca(bx,bz,bx+CX-1,bz+CZ-1)){
    if(bx+CX<c.x-47||bx>c.x+47||bz+CZ<c.z-47||bz>c.z+47)continue;
    const F=c.y;
    const pon=(x,y,z,b)=>{if(x<bx||x>=bx+CX||z<bz||z>=bz+CZ||y<1||y>=CY)return;d[idx(x-bx,y,z-bz)]=b;
      if(b===B.cofre)registrarCofre(DIMS.superficie,x,y,z,'camaraPrueba');
      if(b===B.generadorPruebas||b===B.boveda)(ch.pruebas||(ch.pruebas=[])).push([x-bx,y,z-bz]);};
    const sala=(x0,z0,x1,z1,alto,techoLuz)=>{
      for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(let y=F-1;y<=F+alto;y++){
        const borde=x===x0||x===x1||z===z0||z===z1||y===F-1||y===F+alto;
        let b=0;
        if(borde){b=B.ladrillosToba;
          if(y===F-1&&((x+z)%6===0))b=B.cobreCortado;
          if(y===F+alto&&techoLuz&&(x-x0)%5===2&&(z-z0)%5===2)b=B.bombillaCobre;
          if(y>F-1&&y<F+alto&&(y-F)%4===3)b=B.cobreCortado;}
        pon(x,y,z,b);
      }
    };
    // Pasillos
    for(const [ux,uz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      for(let u=9;u<=35;u++)for(let v=-3;v<=3;v++)for(let y=F-1;y<=F+5;y++){
        const x=c.x+ux*u+uz*v, z=c.z+uz*u+ux*v, borde=Math.abs(v)===3||y===F-1||y===F+5;
        pon(x,y,z,borde?(y===F+5&&v===0&&u%7===0?B.bombillaCobre:y===F-1?B.toba:B.ladrillosToba):0);
      }
    }
    // Sala central con el generador de breezes y dos bóvedas
    sala(c.x-9,c.z-9,c.x+9,c.z+9,9,true);
    for(const [ux,uz] of [[1,0],[-1,0],[0,1],[0,-1]])for(let v=-2;v<=2;v++)for(let y=F;y<=F+4;y++)pon(c.x+ux*9+uz*v,y,c.z+uz*9+ux*v,0);
    pon(c.x,F,c.z,B.ladrillosToba); pon(c.x,F+1,c.z,B.generadorPruebas);
    pon(c.x-6,F,c.z-7,B.boveda); pon(c.x+6,F,c.z-7,B.boveda); pon(c.x,F,c.z+7,B.cofre);
    for(const [ox,oz] of [[-7,6],[7,6],[-7,-4],[7,-4]])pon(c.x+ox,F,c.z+oz,B.vasija);
    // Salas laterales
    for(const [ux,uz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const rx=c.x+ux*41, rz=c.z+uz*41;
      sala(rx-6,rz-6,rx+6,rz+6,7,true);
      for(let v=-2;v<=2;v++)for(let y=F;y<=F+4;y++)pon(rx-ux*6+uz*v,y,rz-uz*6+ux*v,0);
      pon(rx,F,rz,B.generadorPruebas);
      pon(rx+uz*4+ux*4,F,rz+ux*4+uz*4,B.boveda);
      if(hash2(rx,rz,s+9303)<.6)pon(rx-uz*4+ux*4,F,rz-ux*4+uz*4,B.cofre);
      pon(rx+3,F,rz-4,B.vasija); pon(rx-4,F,rz+3,B.vasija);
    }
  }
}
function tipoPrueba(x,y,z){
  for(const c of camarasPruebaCerca(x,z,x,z))if(Math.abs(x-c.x)<3&&Math.abs(z-c.z)<3)return 'breeze';
  return TIPOS_PRUEBA[Math.floor(hash3(x,y,z,semilla+9304)*TIPOS_PRUEBA.length)];
}

/* ---------- Generadores de pruebas ---------- */
const estadoPruebas=new Map();
let pruebaT=0;
function actualizarPruebas(dt){
  pruebaT-=dt; if(pruebaT>0||dim!==DIMS.superficie)return; pruebaT=.5;
  const j=jugador.pos, pcx=Math.floor(j.x/CX), pcz=Math.floor(j.z/CZ);
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){
    const ch=chunkSiExiste(pcx+a,pcz+b); if(!ch||!ch.pruebas)continue;
    for(const [lx,y,lz] of ch.pruebas){
      const x=ch.cx*CX+lx,z=ch.cz*CZ+lz,id=getBloque(x,y,z);
      if(id!==B.generadorPruebas&&id!==B.generadorPruebasOff)continue;
      const k=clavePos(x,y,z); let e=estadoPruebas.get(k);
      if(!e){e={fase:id===B.generadorPruebasOff?'enfriando':'espera',t:id===B.generadorPruebasOff?120:0,tipo:tipoPrueba(x,y,z),creados:0,vivos:[]};estadoPruebas.set(k,e);}
      const d=Math.hypot(x+.5-j.x,y-j.y,z+.5-j.z);
      if(Math.random()<.5&&d<24)emitirParticulas(x+.5,y+.6,z+.5,e.fase==='activo'?0xff8030:0xffc070,1,.5,.6,-1);
      if(e.fase==='espera'){
        if(d<14&&supervivencia()&&estado!=='muerto'){e.fase='activo';e.total=6+azar(0,2);e.creados=0;e.vivos=[];e.t=0;sonar('pruebas',{x,y,z});}
      }else if(e.fase==='activo'){
        e.vivos=e.vivos.filter(m=>!m.muerto&&mobs.includes(m));
        e.t-=.5;
        if(e.creados<e.total&&e.vivos.length<2&&e.t<=0){
          e.t=1.5;
          for(let q=0;q<8;q++){const ox=x+azar(-4,4),oz=z+azar(-4,4),oy=buscarSuelo(ox,y+3,oz,6,2);
            if(oy>0){const m=crearMob(e.tipo,ox+.5,oy,oz+.5,{tam:1});m.prueba=k;m.enfadado=60;e.vivos.push(m);e.creados++;
              emitirParticulas(ox+.5,oy+.8,oz+.5,0xff9030,14,1.5,.6,0);sonar('portal',{x:ox,y:oy,z:oz},.3);break;}}
        }
        if(e.creados>=e.total&&!e.vivos.length){
          e.fase='enfriando';e.t=1800;setBloque(x,y,z,B.generadorPruebasOff,{sinAviso:true});sonar('nivel',{x,y,z});
          const premio=[[541,1],[I.esmeralda,azar(1,4)],[I.flecha,azar(3,8)],[I.pan,azar(1,3)],[538,azar(1,3)]];
          for(const [iid,n] of premio)if(iid===541||prob(.5))soltarItem(crearPila(iid,n),x+.5,y+1.2,z+.5,true);
          soltarXP(azar(8,14),x+.5,y+1,z+.5);
        }
        if(d>40){for(const m of e.vivos)quitarMob(m);e.fase='espera';e.vivos=[];}
      }else if(e.fase==='enfriando'){
        e.t-=.5; if(e.t<=0){e.fase='espera';setBloque(x,y,z,B.generadorPruebas,{sinAviso:true});}
      }
    }
  }
}
// Bóvedas: se abren una vez con una llave de prueba
const BOTIN_BOVEDA=[[I.esmeralda,4,20],[I.diamante,1,6],[538,4,14],[I.flecha,8,10],[I.manzanaDorada,1,6],[B.nucleoPesado,1,4],[I.perlaEnder,2,6],[344,1,3],[413,1,3],[I.lingoteHierro,4,10]];
function abrirBoveda(x,y,z){
  setBloque(x,y,z,B.bovedaAbierta); sonar('pruebas',{x,y,z}); sonar('nivel',{x,y,z},.6);
  const n=azar(2,4);
  for(let k=0;k<n;k++){const t=BOTIN_BOVEDA.map(([id,,w])=>[id,w]);const id=elegirPeso(t);const e=BOTIN_BOVEDA.find(q=>q[0]===id);
    setTimeout(()=>{soltarItem(crearPila(id,ITEMS[id].dur?1:azar(1,e[1])),x+.5,y+1.1,z+.5,false,new THREE.Vector3((Math.random()-.5)*2,3,(Math.random()-.5)*2));
      emitirParticulas(x+.5,y+1,z+.5,0x80e0ff,8,1.2,.6,-1);},k*450);}
}

/* ---------- Breeze ---------- */
Object.assign(DEF_MOB,{breeze:{vida:30,ancho:.3,alto:1.77,vel:2.2,tipo:'hostil',ia:'breeze',xp:[10,10],sonido:'breeze',
  suelta:b=>[[539,azar(1,2+b)]]}});
NOMBRE_MOB.breeze='Breeze';
MODELOS_EXTRA.breeze=({pon,parte,extra})=>{
  extra.cabeza=pon(parte(.55,.5,.55,0xb8d8ec),0,1.45,0);
  pon(parte(.14,.1,.02,0x2a4a8a),-.13,1.5,.28); pon(parte(.14,.1,.02,0x2a4a8a),.13,1.5,.28);
  extra.remolino=[];for(let i=0;i<3;i++){const r=pon(parte(.7-i*.18,.22,.7-i*.18,0xd8ecf8),0,1.05-i*.3,0);r.material.transparent=true;r.material.opacity=.75;extra.remolino.push(r);}
  extra.varas=[];for(let i=0;i<4;i++){const v=pon(parte(.08,.5,.08,0x9fc8e0),0,1.2,0);extra.varas.push(v);}
};
IA_EXTRA.breeze=(m,dt,c)=>{
  m.mover=false;
  if(m.extra.remolino)m.extra.remolino.forEach((r,i)=>{r.rotation.y=tiempoJuego*(4+i*2)*(i%2?-1:1);});
  if(m.extra.varas)m.extra.varas.forEach((v,i)=>{const a=tiempoJuego*3+i*Math.PI/2;v.position.set(Math.cos(a)*.45,1.1+Math.sin(tiempoJuego*4+i)*.1,Math.sin(a)*.45);});
  if(c.persigue){
    m.yawObj=Math.atan2(c.dx,c.dz);
    m.saltoT=(m.saltoT||1+Math.random())-dt;
    if(m.suelo&&m.saltoT<=0){m.saltoT=1.8+Math.random()*1.5;
      const lejos=c.dist>9, cerca=c.dist<4, a=Math.atan2(c.dx,c.dz)+(lejos?0:cerca?Math.PI:(Math.random()<.5?1:-1)*Math.PI/2);
      m.vel.x=Math.sin(a)*5;m.vel.z=Math.cos(a)*5;m.vel.y=9;sonar('breeze',m.pos,.6);}
    if(m.cd<=0&&c.dist3<16&&hayLineaVision(c.eye,c.ojoJ)){m.cd=2.5+Math.random();
      const dir=new THREE.Vector3(c.dx,c.dy+1.2-m.alto*.7,c.dz).normalize();
      lanzarViento(c.eye.clone().addScaledVector(dir,.6),dir,{dueno:'mob',duenoMob:m});}
  }else{m.t-=dt;if(m.t<=0&&m.suelo){m.t=3+Math.random()*4;const a=Math.random()*6.28;m.vel.x=Math.sin(a)*3;m.vel.z=Math.cos(a)*3;m.vel.y=7;}}
  return true;
};

/* ---------- Cargas de viento ---------- */
function lanzarViento(pos,dir,opc){
  const s=new THREE.Sprite(matSprite(538)); s.scale.set(.35,.35,.35);
  agregarEnt(Object.assign({tipo:'viento',pos:pos.clone(),vel:dir.clone().multiplyScalar(opc.dueno==='jugador'?24:14),edad:0,malla:s},opc));
}
ACT_ENT.viento=(e,dt)=>{
  e.edad+=dt;
  const ch=trazarProyectil(e,dt,.25);
  e.malla.position.copy(e.pos); e.malla.material.rotation=e.edad*10;
  if(Math.random()<dt*30)emitirParticulas(e.pos.x,e.pos.y,e.pos.z,0xe0f4ff,1,.3,.3,0);
  if(!ch&&e.edad<4)return;
  e.muerta=true;
  let p=e.pos.clone(); if(ch&&ch.bloque)p.addScaledVector(e.vel.clone().normalize(),-.4);
  estallidoViento(p,ch,e);
};
function estallidoViento(p,ch,e){
  sonar('viento',p);
  emitirParticulas(p.x,p.y,p.z,0xe8f6ff,26,5,.5,0); emitirParticulas(p.x,p.y,p.z,0xa8d8f0,10,3,.7,-1);
  const R=2.6;
  const empujar=(obj,ancho,alto,fuerza)=>{
    const cx=obj.pos.x,cy=obj.pos.y+alto*.5,cz=obj.pos.z,dx=cx-p.x,dy=cy-p.y,dz=cz-p.z,d=Math.hypot(dx,dy,dz);
    if(d>R+ancho)return false;
    const f=fuerza*(1-Math.min(1,d/(R+ancho))*.6), l=d||1;
    obj.vel.x+=dx/l*f; obj.vel.z+=dz/l*f; obj.vel.y=Math.max(obj.vel.y,Math.max(0,dy/l)*f+f*.55);
    return true;
  };
  if(estado!=='muerto'&&empujar(jugador,.3,1.8,e.dueno==='jugador'?14:10)){
    if(jugador.montura)desmontar();
    jugador.alturaViento=jugador.pos.y; jugador.suelo=false;
    if(ch&&ch.jugador)danarJugador(1,'mob',null);
  }
  for(const m of mobs){if(m.muerto||m===e.duenoMob)continue;if(empujar(m,m.ancho,m.alto,11)&&ch&&ch.mob===m)herirMob(m,1,null,e.dueno==='jugador'?'jugador':'mob');}
  for(const o of entidades)if(o.tipo==='item'&&o.pos.distanceTo(p)<R)o.vel.addScaledVector(o.pos.clone().sub(p).normalize(),6);
  // Accionar puertas, palancas y botones cercanos
  const x0=Math.floor(p.x),y0=Math.floor(p.y),z0=Math.floor(p.z), hechas=new Set();
  for(let x=x0-2;x<=x0+2;x++)for(let y=y0-2;y<=y0+2;y++)for(let z=z0-2;z<=z0+2;z++){
    const b=getBloque(x,y,z), d=BLOQUES[b]; if(!d)continue;
    if(d.puerta){const by=d.puerta.m?y-1:y,k=clavePos(x,by,z);if(!hechas.has(k)){hechas.add(k);alternarPuerta(x,by,z);}}
    else if(d.redstone==='palanca'||d.redstone==='boton')usarRedstone(x,y,z,b);
  }
}

/* ---------- Maza ---------- */
function impactoMaza(objetivo){
  const j=jugador, caida=j.maxY-j.pos.y;
  if(caida<=1.5||j.suelo||j.vel.y>=0)return 0;
  const p=enMano();
  const extra=4*Math.min(3,caida)+2*clamp(caida-3,0,5)+Math.max(0,caida-8)+.5*caida*nivelEnc(p,'densidad');
  j.maxY=j.pos.y; j.vel.y=Math.max(j.vel.y,4+nivelEnc(p,'rafaga')*5); j.alturaViento=undefined;
  sonar('maza',j.pos,1);
  const c=objetivo?objetivo.pos:j.pos;
  emitirParticulas(c.x,c.y+.2,c.z,0x8a7a6a,30,5,.6,8);
  if(caida>5)for(const m of mobs)if(m!==objetivo&&!m.muerto&&m.pos.distanceTo(c)<3.5){
    const dx=m.pos.x-c.x,dz=m.pos.z-c.z,l=Math.hypot(dx,dz)||1;m.vel.x+=dx/l*7;m.vel.z+=dz/l*7;m.vel.y=6;}
  return extra;
}

/* ---------- Uso con clic derecho ---------- */
function usarDerechoV121(p,id,it){
  if(id===538){
    const dir=new THREE.Vector3(); camara.getWorldDirection(dir);
    lanzarViento(camara.position.clone().addScaledVector(dir,.5),dir,{dueno:'jugador'});
    consumirEnMano(); sonar('arco',null,.5); balancearMano(); cdUso=.5; return true;
  }
  if(id===541&&apuntado&&apuntado.b===B.boveda){abrirBoveda(apuntado.x,apuntado.y,apuntado.z);consumirEnMano();balancearMano();return true;}
  return false;
}
function localizarV121(q){
  if(!(q.startsWith('trial')||q.startsWith('camara')||q.startsWith('cámara')))return null;
  const j=jugador.pos;
  const l=camarasPruebaCerca(j.x-2000,j.z-2000,j.x+2000,j.z+2000).sort((a,b)=>Math.hypot(a.x-j.x,a.z-j.z)-Math.hypot(b.x-j.x,b.z-j.z));
  return l.length?`Cámara de pruebas cerca de X ${l[0].x}, Z ${l[0].z} (Y ${l[0].y-OY}).`:'No hay cámaras de pruebas cerca.';
}
