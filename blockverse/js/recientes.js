"use strict";
/* =========================================================
   Actualizaciones posteriores a la 1.21:
   1.21.2 saquitos · 1.21.4 jardín pálido, creaking y resina ·
   1.21.5 variantes de animales, luciérnagas y hojas que caen ·
   1.21.6 ghast seco, ghastito y ghast feliz con arnés ·
   1.21.9 herramientas, armadura y cofre de cobre y gólem de cobre.
   Además: descripción emergente de los objetos al estilo clásico.
   ========================================================= */
Object.assign(SND,{
  creaking:v=>{ruidoSnd(.35,600,.18*v,'bandpass');tonoSnd(140,90,.3,'square',.04*v);},
  crujido:v=>{ruidoSnd(.18,1200,.3*v,'bandpass');ruidoSnd(.3,500,.2*v);},
  ghastFeliz:v=>{tonoSnd(700,900,.4,'sine',.06*v);tonoSnd(900,1100,.3,'sine',.04*v,.2);},
  saquito:v=>ruidoSnd(.12,1400,.2*v,'bandpass'),
  golemCobre:v=>{tonoSnd(900,1300,.08,'square',.03*v);tonoSnd(1300,900,.08,'square',.03*v,.1);},
});

/* ---------- Descripción emergente ---------- */
const elTip=document.createElement('div'); elTip.id='tip'; elTip.className='oculto'; document.body.appendChild(elTip);
let tipObj=null;
function pintarTip(texto){
  const lineas=texto.split('\n');
  elTip.innerHTML=lineas.map((l,i)=>{const cls=i===0?'t1':/^(Filo|Eficiencia|Protección|Irrompibilidad|Fortuna|Toque|Poder|Llama|Infinidad|Retroceso|Aspecto|Botín|Respiración|Caída)/.test(l)?'enc':'t2';
    return `<div class="${cls}">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;}).join('');
}
document.addEventListener('mouseover',e=>{
  const s=e.target.closest&&e.target.closest('[data-tip]');
  if(!s||!s.dataset.tip){tipObj=null;elTip.classList.add('oculto');return;}
  tipObj=s; pintarTip(s.dataset.tip); elTip.classList.remove('oculto');
});
document.addEventListener('mousemove',e=>{
  if(!tipObj)return;
  if(!document.body.contains(tipObj)||!tipObj.dataset.tip||(estado!=='ui'&&!tipObj.closest('#paleta'))){tipObj=null;elTip.classList.add('oculto');return;}
  pintarTip(tipObj.dataset.tip);
  const w=elTip.offsetWidth,h=elTip.offsetHeight;
  elTip.style.left=Math.min(innerWidth-w-4,e.clientX+14)+'px'; elTip.style.top=Math.max(4,Math.min(innerHeight-h-4,e.clientY-h-10))+'px';
});
document.addEventListener('mousedown',()=>{if(cursor){elTip.classList.add('oculto');tipObj=null;}},true);

/* ---------- Saquitos (1.21.2) ---------- */
const pesoUnidad=id=>Math.max(1,Math.round(64/maxPila(id)));
function pesoSaquito(b){return (b.contenido||[]).reduce((a,c)=>a+(c.id===542?4+pesoSaquito(c):pesoUnidad(c.id)*c.n),0);}
function meterEnSaquito(b,p){
  if(p.id===542&&p.contenido&&p.contenido.length)return 0;
  const libre=64-pesoSaquito(b), n=Math.min(p.n,Math.floor(libre/pesoUnidad(p.id)));
  if(n<=0)return 0;
  b.contenido=b.contenido||[];
  const igual=b.contenido.find(c=>mismaPila(c,p)&&c.n<maxPila(c.id));
  if(igual&&!ITEMS[p.id].dur){const k=Math.min(n,maxPila(p.id)-igual.n);igual.n+=k;if(k<n)b.contenido.push({...p,n:n-k});}
  else b.contenido.push({...p,n});
  sonar('saquito');
  return n;
}
function sacarDeSaquito(b){if(!b.contenido||!b.contenido.length)return null;sonar('saquito');return b.contenido.pop();}
function clicSaquito(ref,boton){
  if(boton!==2)return false;
  const s=ref.get();
  if(cursor&&cursor.id===542&&s&&s.id!==542){const n=meterEnSaquito(cursor,s);if(n){s.n-=n;ref.set(s.n>0?s:null);}return true;}
  if(s&&s.id===542){
    if(cursor&&cursor.id!==542){const n=meterEnSaquito(s,cursor);if(n){cursor.n-=n;if(cursor.n<=0)cursor=null;}ref.set(s);return true;}
    if(!cursor){const saca=sacarDeSaquito(s);if(saca){cursor=saca;ref.set(s);return true;}}
  }
  return false;
}
function vaciarSaquito(p){
  if(!p.contenido||!p.contenido.length)return false;
  camara.getWorldDirection(dirVista);
  for(const c of p.contenido)soltarItem(c,jugador.pos.x+dirVista.x*.6,jugador.pos.y+1.3,jugador.pos.z+dirVista.z*.6,false,
    new THREE.Vector3(dirVista.x*3+(Math.random()-.5),2,dirVista.z*3+(Math.random()-.5)));
  p.contenido=[]; sonar('saquito'); actualizarHUD(); return true;
}

/* ---------- Jardín pálido: corazones de creaking ---------- */
function registrarCorazones(ch){
  if(!ch.bioma||!ch.bioma.includes(BIOMA.jardinPalido))return;
  const d=ch.datos;
  for(let i=0;i<d.length;i++)if(d[i]===B.corazonCreaking){const x=i%CX,z=Math.floor(i/CX)%CZ,y=Math.floor(i/(CX*CZ));
    (ch.corazones||(ch.corazones=[])).push([x,y,z]);}
}
const creakingsDe=new Map();
function actualizarCorazones(){
  if(dim!==DIMS.superficie)return;
  const j=jugador.pos, pcx=Math.floor(j.x/CX), pcz=Math.floor(j.z/CZ), noche=sol<-.05;
  const vistos=new Set();
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){
    const ch=chunkSiExiste(pcx+a,pcz+b); if(!ch||!ch.corazones)continue;
    for(const [lx,y,lz] of ch.corazones){
      const x=ch.cx*CX+lx,z=ch.cz*CZ+lz,k=clavePos(x,y,z),id=getBloque(x,y,z);
      vistos.add(k);
      let m=creakingsDe.get(k); if(m&&(m.muerto||!mobs.includes(m))){creakingsDe.delete(k);m=null;}
      if(id!==B.corazonCreaking&&id!==B.corazonCreakingOn){if(m)desmoronar(m);continue;}
      // El corazón solo está activo de noche y rodeado de troncos pálidos
      const activo=noche&&getBloque(x,y+1,z)===B.troncoPalido||noche&&getBloque(x,y-1,z)===B.troncoPalido;
      if(activo!==(id===B.corazonCreakingOn))setBloque(x,y,z,activo?B.corazonCreakingOn:B.corazonCreaking,{sinAviso:true});
      if(!activo){if(m)desmoronar(m);continue;}
      const d=Math.hypot(x-j.x,z-j.z);
      if(!m&&d<32&&d>6&&Math.random()<.35){
        for(let q=0;q<10;q++){const ox=x+azar(-8,8),oz=z+azar(-8,8),oy=buscarSuelo(ox,y+6,oz,14,3);
          if(oy>0){const c=crearMob('creaking',ox+.5,oy,oz+.5);c.corazon=[x,y,z];creakingsDe.set(k,c);
            emitirParticulas(ox+.5,oy+1.3,oz+.5,0x8a7a6a,12,1.2,.6,4);sonar('crujido',{x:ox,y:oy,z:oz});break;}}
      }
      if(m&&Math.hypot(m.pos.x-x,m.pos.z-z)>34){m.pos.set(x+.5,y,z+.5);}
    }
  }
  for(const [k,m] of creakingsDe)if(!vistos.has(k)){quitarMob(m);creakingsDe.delete(k);}
}
function desmoronar(m){
  if(m.muerto)return;
  emitirParticulas(m.pos.x,m.pos.y+1.3,m.pos.z,0x9a8a7a,30,2,.9,6);
  emitirParticulas(m.pos.x,m.pos.y+2.4,m.pos.z,0xff9a30,6,1,.6,2);
  sonar('crujido',m.pos,1); quitarMob(m);
}
function golpeInvulnerable(m,fuente){
  m.flash=.2; sonar('crujido',m.pos,.7);
  emitirParticulas(m.pos.x,m.pos.y+1.4,m.pos.z,0xa89888,8,1.5,.5,6);
  if(m.corazon&&fuente==='jugador'){
    const [x,y,z]=m.corazon;
    // Rastro hacia el corazón y resina que brota del tronco
    const n=8;for(let k=1;k<=n;k++){const f=k/n;emitirParticulas(m.pos.x+(x+.5-m.pos.x)*f,m.pos.y+1.5+(y+.5-m.pos.y-1.5)*f,m.pos.z+(z+.5-m.pos.z)*f,0xff8a20,1,.2,.8,0);}
    if(prob(.3))soltarItem(crearPila(543,1),x+.5,y+.5,z+.5,true);
  }
}

/* ---------- Criaturas nuevas ---------- */
Object.assign(DEF_MOB,{
  creaking:{vida:1,ancho:.45,alto:2.7,vel:3.3,tipo:'hostil',ia:'creaking',dano:3,xp:[0,0],sonido:'creaking',invulnerable:true,suelta:()=>[]},
  ghastito:{vida:5,ancho:.5,alto:1,vel:1.4,tipo:'pasivo',ia:'ghastito',vuela:true,xp:[0,0],sonido:'ghastFeliz',comida:I.bolaNieve||-1,suelta:()=>[]},
  ghastFeliz:{vida:20,ancho:2,alto:4,vel:1.6,tipo:'pasivo',ia:'ghastFeliz',vuela:true,xp:[1,3],sonido:'ghastFeliz',montable:true,suelta:()=>[]},
  golemCobre:{vida:12,ancho:.35,alto:1,vel:1.5,tipo:'pasivo',ia:'golemCobre',xp:[0,0],sonido:'golemCobre',suelta:()=>[[B.cobreCortado,1]]},
});
Object.assign(NOMBRE_MOB,{creaking:'Creaking',ghastito:'Ghastito',ghastFeliz:'Ghast feliz',golemCobre:'Gólem de cobre'});
Object.assign(MODELOS_EXTRA,{
  creaking({pon,parte,piernas,brazos,extra}){
    const c=0x6e625a, o=0x4e443e;
    [-1,1].forEach(s=>{const p=pon(parte(.22,1.2,.22,o,true,'corteza'),s*.14,1.2,0);p.userData.s=s;piernas.push(p);});
    pon(parte(.48,.95,.3,c,false,'corteza'),0,1.65,0);
    extra.cabeza=pon(parte(.46,.62,.46,c,false,'corteza'),0,2.43,0);
    extra.ojos=[pon(parte(.09,.06,.02,0xff9a20),-.11,2.46,.24),pon(parte(.09,.06,.02,0xff9a20),.11,2.46,.24)];
    extra.ojos.forEach(e=>delete e.userData.base);
    for(const [x,y,h] of [[-.16,2.78,.25],[.1,2.84,.35],[.2,2.75,.2]])pon(parte(.07,h,.07,o),x,y,0);
    [-1,1].forEach(s=>{const b=pon(parte(.16,1.3,.16,o,true,'corteza'),s*.33,2.1,0);b.userData.s=s;brazos.push(b);});
  },
  ghastito({pon,parte,extra}){
    extra.cabeza=pon(parte(1,1,1,0xf4f4f4),0,.6,0);
    pon(parte(.14,.18,.02,0x333333),-.22,.66,.51); pon(parte(.14,.18,.02,0x333333),.22,.66,.51);
    pon(parte(.16,.08,.02,0xf0a0b0),-.34,.5,.51); pon(parte(.16,.08,.02,0xf0a0b0),.34,.5,.51);
    for(let i=0;i<4;i++)pon(parte(.12,.3,.12,0xe8e8e8,true),(i%2-.5)*.5,.1,(Math.floor(i/2)-.5)*.5);
  },
  ghastFeliz({g,pon,parte,piernas,extra,opc}){
    extra.cabeza=pon(parte(4,4,4,0xf6f6f6),0,2.6,0);
    pon(parte(.5,.7,.05,0x333333),-.9,2.9,2.01); pon(parte(.5,.7,.05,0x333333),.9,2.9,2.01);
    pon(parte(.6,.25,.05,0xf2a4b4),-1.45,2.35,2.01); pon(parte(.6,.25,.05,0xf2a4b4),1.45,2.35,2.01);
    pon(parte(.7,.2,.05,0x555555),0,2.1,2.01);
    for(let i=0;i<9;i++){const p=pon(parte(.3,1.1+(i%3)*.4,.3,0xebebeb,true),(i%3-1)*1.2,.6,(Math.floor(i/3)-1)*1.2);p.userData.s=i%2?1:-1;piernas.push(p);}
    const arnes=new THREE.Group();
    const cuero=new THREE.MeshLambertMaterial({color:0x8a5a34,map:TEX_MOB.pelo}), vid=new THREE.MeshLambertMaterial({color:0xb8e0f0,transparent:true,opacity:.6});
    const cj=(w,h,d,x,y,z,m)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);arnes.add(b);};
    cj(4.1,.35,4.1,0,4.45,0,cuero); cj(4.1,4.1,.3,0,2.6,0,cuero); cj(1.2,.5,.12,-.9,4.8,1.6,vid); cj(1.2,.5,.12,.9,4.8,1.6,vid);
    arnes.visible=!!opc.arnes; g.add(arnes); extra.arnes=arnes;
  },
  golemCobre({pon,parte,piernas,brazos,extra}){
    const c=0xd8844e, o=0xb8683a;
    [-1,1].forEach(s=>{const p=pon(parte(.16,.3,.18,o,true),s*.1,.3,0);p.userData.s=s;piernas.push(p);});
    pon(parte(.44,.34,.3,c),0,.47,0);
    extra.cabeza=pon(parte(.5,.36,.4,c),0,.82,0);
    pon(parte(.12,.1,.02,0x40e0d0),-.12,.84,.21); pon(parte(.12,.1,.02,0x40e0d0),.12,.84,.21);
    pon(parte(.1,.16,.12,o),0,.74,.24);
    pon(parte(.06,.22,.06,o),0,1.1,0); pon(parte(.12,.12,.12,0xe8a060),0,1.25,0);
    [-1,1].forEach(s=>{const b=pon(parte(.12,.36,.12,o,true),s*.28,.62,0);b.userData.s=s;brazos.push(b);});
  },
});
function observadoPorJugador(m){
  if(estado==='muerto')return false;
  const dv=new THREE.Vector3(); camara.getWorldDirection(dv);
  const al=new THREE.Vector3(m.pos.x,m.pos.y+1.6,m.pos.z).sub(camara.position), d=al.length(); al.divideScalar(d);
  return d<48&&dv.dot(al)>.76&&hayLineaVision(camara.position,new THREE.Vector3(m.pos.x,m.pos.y+1.6,m.pos.z));
}
Object.assign(IA_EXTRA,{
  creaking(m,dt,c){
    const visto=observadoPorJugador(m);
    if(m.extra.ojos)m.extra.ojos.forEach(e=>e.material.color.setHex(visto?0x7a4a10:0xff9a20));
    if(visto){m.mover=false;m.vel.x=m.vel.z=0;m.quieto=true;return false;}
    m.quieto=false;
    if(c.persigue||(c.dist3<24&&objetivoValido())){
      mover(m,c.dist>1.2?c.dx:0,c.dist>1.2?c.dz:0,3.3);m.yawObj=Math.atan2(c.dx,c.dz);
      if(c.dist<1.6&&Math.abs(c.dy)<2&&m.cd<=0){m.cd=1.5;m.golpeT=.35;danarJugador(m.def.dano,'mob',{x:c.dx/(c.dist||1),z:c.dz/(c.dist||1)});}
    }else{m.t-=dt;if(m.t<=0){m.t=3+Math.random()*4;m.mover=Math.random()<.4;m.yawObj=Math.random()*6.28;}}
    return true;
  },
  ghastito(m,dt,c){
    m.edadGhast=(m.edadGhast||0)+dt;
    if(m.edadGhast>150){const g=crearMob('ghastFeliz',m.pos.x,m.pos.y,m.pos.z);g.origen.copy(m.pos);sonar('ghastFeliz',m.pos,1);
      emitirParticulas(m.pos.x,m.pos.y+1,m.pos.z,0xffffff,20,2,.8,0);quitarMob(m);return false;}
    const obj=new THREE.Vector3(jugador.pos.x+Math.sin(tiempoJuego*.5)*2,jugador.pos.y+2.5,jugador.pos.z+Math.cos(tiempoJuego*.5)*2);
    const v=obj.sub(m.pos); const d=v.length();
    if(d<16&&d>2)m.vel.lerp(v.normalize().multiplyScalar(2),dt*2);else m.vel.multiplyScalar(Math.pow(.3,dt));
    m.yawObj=Math.atan2(c.dx,c.dz);
    return true;
  },
  ghastFeliz(m,dt,c){
    if(m.extra.arnes)m.extra.arnes.visible=!!m.arnes;
    if(m===jugador.montura){
      const d=new THREE.Vector3(); camara.getWorldDirection(d);
      let v=new THREE.Vector3();
      if(estado==='jugando'){
        if(teclas.KeyW)v.add(d); if(teclas.KeyS)v.sub(d);
        const der=new THREE.Vector3(-d.z,0,d.x).normalize();
        if(teclas.KeyD)v.add(der); if(teclas.KeyA)v.sub(der);
        if(teclas.Space)v.y+=1;
      }
      if(v.lengthSq()>0)v.normalize().multiplyScalar(6);
      m.vel.lerp(v,Math.min(1,dt*3)); m.yawObj=jugador.yaw+Math.PI;
      return true;
    }
    m.vel.multiplyScalar(Math.pow(.4,dt));
    m.t-=dt;if(m.t<=0){m.t=4+Math.random()*5;const a=Math.random()*6.28;
      const ob=new THREE.Vector3(m.origen.x+Math.cos(a)*8,m.origen.y+Math.random()*4,m.origen.z+Math.sin(a)*8);m.objetivo=ob;}
    if(m.objetivo){const v=m.objetivo.clone().sub(m.pos);if(v.length()>1){m.vel.lerp(v.normalize().multiplyScalar(1.2),dt);m.yawObj=Math.atan2(v.x,v.z);}}
    return true;
  },
  golemCobre(m,dt){
    m.pensarT=(m.pensarT||0)-dt;
    if(m.pensarT<=0){m.pensarT=4;buscarCofresCobre(m);}
    const ir=(p)=>{const ox=p[0]+.5-m.pos.x,oz=p[2]+.5-m.pos.z,d=Math.hypot(ox,oz);if(d>1.6){mover(m,ox,oz,1.6);return false;}m.mover=false;m.yawObj=Math.atan2(ox,oz);return true;};
    if(!m.carga&&m.origenCofre){
      if(ir(m.origenCofre)){const arr=cofres[claveCont(...m.origenCofre)];const i=arr?arr.findIndex(Boolean):-1;
        if(i>=0){m.carga=arr[i];arr[i]=null;m.golpeT=.35;sonar('golemCobre',m.pos);m.destino=elegirCofreDestino(m,m.carga);}
        else m.origenCofre=null;}
    }else if(m.carga){
      if(!m.destino)m.destino=elegirCofreDestino(m,m.carga);
      if(!m.destino){m.t-=dt;if(m.t<=0){m.t=3;m.mover=Math.random()<.4;m.yawObj=Math.random()*6.28;}}
      else if(ir(m.destino)){const arr=obtenerCofre(claveCont(...m.destino));const resto=insertar(m.carga,arr,rango(0,27));
        m.carga=resto;m.destino=null;m.golpeT=.35;sonar('golemCobre',m.pos);
        if(resto){m.destino=elegirCofreDestino(m,resto,true);if(!m.destino&&m.origenCofre){const a2=obtenerCofre(claveCont(...m.origenCofre));m.carga=insertar(resto,a2,rango(0,27));}}}
    }else{m.t-=dt;if(m.t<=0){m.t=3+Math.random()*4;m.mover=Math.random()<.5;m.yawObj=Math.random()*6.28;}}
    if(m.extra.cargaVis)m.extra.cargaVis.visible=!!m.carga;
    else if(m.carga){const s=new THREE.Sprite(matSprite(m.carga.id));s.scale.set(.35,.35,.35);s.position.set(0,.7,.3);m.grupo.add(s);m.extra.cargaVis=s;}
    if(m.extra.cargaVis&&m.carga&&m.extra.cargaId!==m.carga.id){m.extra.cargaVis.material=matSprite(m.carga.id);m.extra.cargaId=m.carga.id;}
    return true;
  },
});
function buscarCofresCobre(m){
  const x0=Math.floor(m.pos.x),y0=Math.floor(m.pos.y),z0=Math.floor(m.pos.z);
  m.cobres=[];m.cofresN=[];
  for(let x=x0-12;x<=x0+12;x++)for(let y=y0-4;y<=y0+4;y++)for(let z=z0-12;z<=z0+12;z++){
    const b=getBloqueSiCargado(x,y,z);
    if(b===B.cofreCobre)m.cobres.push([x,y,z]);else if(b===B.cofre)m.cofresN.push([x,y,z]);
  }
  if(!m.carga&&!m.origenCofre)m.origenCofre=m.cobres.find(p=>{const a=cofres[claveCont(...p)];return a&&a.some(Boolean);})||null;
}
function elegirCofreDestino(m,p,soloVacio){
  const lista=m.cofresN||[];
  if(!soloVacio){const igual=lista.find(q=>{const a=cofres[claveCont(...q)];return a&&a.some(s=>s&&s.id===p.id&&s.n<maxPila(s.id));});if(igual)return igual;}
  return lista.find(q=>{const a=cofres[claveCont(...q)];return !a||a.some(s=>!s);})||null;
}
// Gólem de cobre: calabaza sobre un bloque de cobre
const _comprobarGolemBase=comprobarGolem;
comprobarGolem=function(x,y,z){
  const b=getBloque(x,y,z);
  if((b===B.calabaza||b===B.linternaCalabaza)&&getBloque(x,y-1,z)===B.cobreCortado){
    setBloque(x,y,z,0);setBloque(x,y-1,z,0);
    crearMob('golemCobre',x+.5,y-1,z+.5);emitirParticulas(x+.5,y,z+.5,0xe0905a,14,1.5,.6,5);
    sonar('golemCobre',{x,y,z});mostrarMensaje('¡Has creado un gólem de cobre! Ordena los cofres de cobre cercanos.');return;
  }
  _comprobarGolemBase(x,y,z);
};

/* ---------- Ghast seco ---------- */
function registrarFantasma(x,y,z){const ch=chunkSiExiste(Math.floor(x/CX),Math.floor(z/CZ));if(ch)(ch.fantasmas||(ch.fantasmas=[])).push([x-ch.cx*CX,y,z-ch.cz*CZ]);}
const hidratacion=new Map(); let fantasmaT=0;
function actualizarFantasmas(dt){
  fantasmaT-=dt; if(fantasmaT>0)return; fantasmaT=2;
  const j=jugador.pos,pcx=Math.floor(j.x/CX),pcz=Math.floor(j.z/CZ);
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){
    const ch=chunkSiExiste(pcx+a,pcz+b); if(!ch||!ch.fantasmas)continue;
    for(const [lx,y,lz] of ch.fantasmas){
      const x=ch.cx*CX+lx,z=ch.cz*CZ+lz; if(getBloque(x,y,z)!==B.ghastSeco)continue;
      const k=clavePos(x,y,z), agua=DIR6.some(([dx,dy,dz])=>esAgua(getBloque(x+dx,y+dy,z+dz)));
      if(!agua){hidratacion.delete(k);continue;}
      const t=(hidratacion.get(k)||0)+2; hidratacion.set(k,t);
      emitirParticulas(x+.5,y+.9,z+.5,0xc0e8ff,2,.5,.6,-1);
      if(t>=60){hidratacion.delete(k);setBloque(x,y,z,0);const g=crearMob('ghastito',x+.5,y+.2,z+.5);sonar('ghastFeliz',{x,y,z},1);
        emitirParticulas(x+.5,y+.5,z+.5,0xffffff,16,1.5,.7,0);mostrarMensaje('¡Ha nacido un ghastito!');}
    }
  }
}

/* ---------- Partículas: hojas que caen y luciérnagas ---------- */
let hojaT=0;
const COLOR_HOJA={[B.hojasPalidas]:0xc8ccc0,[B.hojasCerezo]:0};
function particulasAmbiente(dt){
  hojaT-=dt; if(hojaT>0||dim!==DIMS.superficie)return; hojaT=.1;
  const noche=sol<-.05;
  for(let k=0;k<5;k++){
    const x=Math.floor(jugador.pos.x+(Math.random()-.5)*24),z=Math.floor(jugador.pos.z+(Math.random()-.5)*24),y=Math.floor(jugador.pos.y+Math.random()*12-3);
    const b=getBloqueSiCargado(x,y,z);
    if(esHojas(b)&&b!==B.hojasCerezo&&!getBloque(x,y-1,z)&&Math.random()<.35){
      const col=COLOR_HOJA[b]||(b===B.hojasAbeto?0x4a7a4a:b===B.hojasAbedul?0x8aa860:0x5e9a38);
      emitirParticulas(x+Math.random(),y-.05,z+Math.random(),col,1,.3,4,.5);
    }else if(b===B.arbustoLuciernagas&&noche){
      for(let q=0;q<2;q++)emitirParticulas(x+.5+(Math.random()-.5)*3,y+Math.random()*2.5,z+.5+(Math.random()-.5)*3,Math.random()<.5?0xfff080:0xc8ff60,1,.25,1.8,-.1);
    }else if(b===B.floresOjoOn&&Math.random()<.4){
      emitirParticulas(x+.5,y+.7,z+.5,0xffa040,1,.15,1,-.2);
    }
  }
}

/* ---------- Clic derecho ---------- */
function usarDerechoRecientes(p,id,it){
  if(usarDerechoCompleto(p,id,it))return true;
  const m=apuntadoEnt&&apuntadoEnt.mob;
  if(m&&m.tipo==='ghastFeliz'){
    if(id===545&&!m.arnes){m.arnes=true;m.domado=true;consumirEnMano();sonar('poner',m.pos);mostrarMensaje('Arnés colocado: clic derecho para montar');return true;}
    if(m.arnes&&!jugador.agachado){montar(m);return true;}
  }
  if(id===542&&p&&p.contenido&&p.contenido.length){vaciarSaquito(p);balancearMano();return true;}
  return false;
}

/* ---------- Bucle ---------- */
let corazonT=0;
function actualizarRecientes(dt){
  corazonT-=dt; if(corazonT<=0){corazonT=1;actualizarCorazones();}
  actualizarFantasmas(dt);
  actualizarCompleto(dt);
  actualizarFinal(dt);
  particulasAmbiente(dt);
}
