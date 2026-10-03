"use strict";
/* =========================================================
   Mazmorras y Leyendas, versión mejorada
   MAZMORRAS
   · Tres ambientaciones que se turnan por nivel: Catacumbas
     (piedra y musgo), Cripta (pizarra y hueso, faroles de
     almas) y Fortaleza del Nether (ladrillo del Nether,
     basalto, magma). Cada una con sus enemigos y su jefe.
   · Salas cuadradas, redondas y en cruz, con suelo decorado,
     pilares con faroles, estanterías, barriles y telarañas.
     Las paredes del lado de la cámara son bajas para ver
     siempre al héroe. Hay salas secretas de tesoro.
   · Las puertas se cierran con vallas mientras quedan
     enemigos; las salas grandes traen una segunda oleada.
   · Combate: combo de 3 golpes (el tercero es un giro),
     arco de corte visible, flechas que vuelan, números de
     daño, barras de vida sobre los enemigos, enemigos de
     élite y esmeraldas que vuelan hacia ti.
   · El arma y la armadura que encuentras se ven puestas.
   · Cámara suave con zoom (rueda), minimapa y barra de
     acciones con recargas.
   LEYENDAS
   · Aldea de verdad: plaza con pozo, casas con ventanas y
     tejado, caminos con faroles y huertos.
   · Portales piglin con torres, el terreno corrompido
     alrededor y barra de vida encima.
   · Ayudantes (allays) visibles al recoger, brújula hacia el
     portal más cercano, vista previa de lo que construyes,
     mejora de golems con el oro (6).
   CORRECCIONES
   · Los piglins de Leyendas ya dan oro al morir.
   · Los enemigos de los modos no llenan el inventario.
   · Los avisos pequeños ya no tapan la pantalla.
   · El cofre ya no bloquea la entrada de los pasillos.
   ========================================================= */
const TEMAS53=[
  {n:'Catacumbas',dia:.535,abismo:0x0b0a0d,suelo:['ladrillosPiedra','ladrillosPiedra','ladrillosMusgo','ladrillosAgrietados','rocaMusgo'],pared:['ladrillosPiedra','ladrillosPiedra','ladrillosMusgo','ladrillosAgrietados','rocaMusgo'],
    borde:'roca',centro:'pizarraPulida',pilar:'ladrillosPiedra',luz:'farol',deco:['estanteria','barril','telarana','alfombraMusgo'],
    tipos:['zombi','zombi','esqueleto','arana','slime'],elite:['vindicador'],jefe:'vindicador',jefeN:'Rey Vindicador',particula:0x9a9a9a},
  {n:'Cripta',dia:.56,abismo:0x05080e,suelo:['baldosasPizarra','ladrillosPizarra','pizarraPulida','baldosasPizarra'],pared:['ladrillosPizarra','ladrillosPizarra','pizarraAdoquinada','baldosasPizarra'],
    borde:'pizarraPulida',centro:'bloqueHueso',pilar:'bloqueHueso',luz:'farolAlmas',deco:['bloqueHueso','telarana','estanteria','telarana'],
    tipos:['esqueleto','esqueletoErrante','zombi','aldeanoZombi','arana'],elite:['vindicador','esqueleto'],jefe:'evocador',jefeN:'Nigromante',particula:0x7fd8ff},
  {n:'Fortaleza del Nether',dia:.545,abismo:0x1a0603,suelo:['ladrillosNether','ladrillosNether','ladrilloNether','piedraNegra'],pared:['ladrillosNether','ladrilloNether','piedraNegra','ladrillosNether'],
    borde:'piedraNegra',centro:'bloqueMagma',pilar:'basaltoLiso',luz:'luzHongo',deco:['barril','piedraNegra','luzHongo','telarana'],
    tipos:['piglin','esqueletoWither','cuboMagma','piglin','blaze'],elite:['piglinBruto'],jefe:'piglinBruto',jefeN:'Señor de la Forja',particula:0xff7a30},
];
const temaMZ53=()=>TEMAS53[(MZ.nivel-1)%TEMAS53.length];
const b53=(...ks)=>{for(const k of ks)if(k&&B[k])return B[k];return B.piedra;};
const tipoMob53=(t,alt)=>DEF_MOB[t]?t:alt;

/* ---------- Avisos: los pequeños van en una tira, no en grande ---------- */
const toast53=document.createElement('div');toast53.id='toast53';document.body.appendChild(toast53);
function avisoPeq53(tit,txt,col,seg){
  const d=document.createElement('div');d.className='t53';d.style.borderColor=col||'#fff';
  d.innerHTML=(tit?`<b style="color:${col||'#fff'}">${tit}</b>`:'')+`<span>${txt}</span>`;
  toast53.appendChild(d);while(toast53.children.length>4)toast53.firstChild.remove();
  setTimeout(()=>{d.style.opacity=0;setTimeout(()=>d.remove(),400);},(seg||2)*1000);
}
aviso52=function(arriba,grande,col,seg){
  if(!arriba||(grande&&grande.length>30))return avisoPeq53(arriba,grande,col,seg);
  if(typeof tituloOB==='function')tituloOB(arriba,grande,col||'#fff',seg||2.5);
};

/* =========================================================
   MAZMORRAS: generador nuevo
   ========================================================= */
generarMazmorra52=function(nivel){
  const T=TEMAS53[(nivel-1)%TEMAS53.length];
  const r=mulberry32(nivel*7919+Math.floor(Math.random()*1e6));
  const M=new Map(), K=(x,y,z)=>x+','+y+','+z, pon=(x,y,z,b)=>M.set(K(x,y,z),b), quita=(x,y,z)=>M.delete(K(x,y,z)), hay=(x,y,z)=>M.get(K(x,y,z));
  const elige=a=>b53(a[Math.floor(r()*a.length)]);
  // Camino principal de salas en una rejilla (celdas de 26 bloques) y salas de tesoro a un lado
  const n=5+Math.min(nivel,5), celdas=[[0,0]], usadas=new Set(['0,0']);
  while(celdas.length<n){const [cx,cz]=celdas[celdas.length-1];const op=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>!usadas.has((cx+a)+','+(cz+b)));
    if(!op.length)break;const [a,b]=op[Math.floor(r()*op.length)];celdas.push([cx+a,cz+b]);usadas.add((cx+a)+','+(cz+b));}
  const formas=['cuadrada','redonda','cruz'];
  const camino=celdas.map(([i,j],k)=>({x:i*26,z:j*26,i,j,r:k===celdas.length-1?10:5+Math.floor(r()*3),forma:k===0?'cuadrada':k===celdas.length-1?'redonda':formas[Math.floor(r()*3)],
    tipo:k===0?'inicio':k===celdas.length-1?'jefe':'normal',activada:k===0,limpia:k===0,cofre:null,puertas:[]}));
  const enlaces=[];for(let k=1;k<camino.length;k++)enlaces.push([camino[k-1],camino[k]]);
  const extra=[];
  for(let k=1;k<camino.length-1&&extra.length<1+Math.floor(nivel/3);k++){if(r()<.5)continue;const s=camino[k];
    const op=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>!usadas.has((s.i+a)+','+(s.j+b)));if(!op.length)continue;
    const [a,b]=op[Math.floor(r()*op.length)];usadas.add((s.i+a)+','+(s.j+b));
    const t={x:(s.i+a)*26,z:(s.j+b)*26,i:s.i+a,j:s.j+b,r:4,forma:'redonda',tipo:'tesoro',activada:false,limpia:false,cofre:null,puertas:[]};extra.push(t);enlaces.push([s,t]);}
  const salas=[...camino.slice(0,-1),...extra,camino[camino.length-1]];
  const dentro=(s,dx,dz)=>{const a=Math.abs(dx),b=Math.abs(dz);
    if(s.forma==='redonda')return dx*dx+dz*dz<=(s.r+.5)*(s.r+.5);
    if(s.forma==='cruz')return Math.max(a,b)<=s.r&&(Math.min(a,b)<=Math.ceil(s.r*.5)||Math.max(a,b)<=Math.ceil(s.r*.55));
    return a<=s.r&&b<=s.r;};
  const enSala=(x,z)=>salas.some(s=>dentro(s,x-s.x,z-s.z));
  // La cámara mira desde +x,+z: las paredes de ese lado son bajas para no tapar al héroe
  const alturaPared=(ox,oz,alta)=>ox+oz>0?1:alta;
  const suelo=(x,z,b)=>{pon(x,MZ_Y,z,b||elige(T.suelo));pon(x,MZ_Y-1,z,B.piedra);pon(x,MZ_Y-2,z,b53(T.borde));};
  for(const s of salas){
    const R=s.r+1, alta=s.tipo==='jefe'?6:5;
    for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++){
      const x=s.x+dx,z=s.z+dz;
      if(dentro(s,dx,dz)){
        // Suelo con dibujo: borde, anillo y medallón central
        const d=s.forma==='redonda'?Math.hypot(dx,dz):Math.max(Math.abs(dx),Math.abs(dz));
        let b=null;
        if(d<=1.2)b=b53(T.centro);else if(Math.abs(d-Math.round(s.r*.55))<.5)b=b53(T.borde);
        else if(s.tipo==='jefe'&&Math.abs(d-3.2)<.5&&(Math.abs(dx)<1||Math.abs(dz)<1||Math.abs(Math.abs(dx)-Math.abs(dz))<1))b=b53('piedraLuminosa');
        suelo(x,z,b);continue;}
      // ¿Pared? (pegada a la sala)
      let pegada=false;for(let a=-1;a<=1&&!pegada;a++)for(let c=-1;c<=1;c++)if(dentro(s,dx+a,dz+c)){pegada=true;break;}
      if(!pegada)continue;
      suelo(x,z);const h=alturaPared(dx,dz,alta), pilar=((dx+dz)&3)===0&&h>1;
      for(let y=1;y<=h;y++)pon(x,MZ_Y+y,z,pilar?b53(T.pilar):elige(T.pared));
      if(h>1&&!pilar&&((dx^dz)&1))pon(x,MZ_Y+h+1,z,elige(T.pared));   // almenas
      if(pilar)pon(x,MZ_Y+h+1,z,b53(T.luz));
    }
    // Pilares interiores con farol
    if(s.r>=7||s.tipo==='jefe'){const p=s.tipo==='jefe'?6:3;
      const pts=s.tipo==='jefe'?[...Array(8)].map((_,k)=>[Math.round(Math.cos(k*Math.PI/4+.39)*p),Math.round(Math.sin(k*Math.PI/4+.39)*p)]):[[-p,-p],[p,p],[-p,p],[p,-p]];
      for(const [a,b] of pts){const h=a+b>0?1:s.tipo==='jefe'?4:3;for(let y=1;y<=h;y++)pon(s.x+a,MZ_Y+y,s.z+b,b53(T.pilar));pon(s.x+a,MZ_Y+h+1,s.z+b,b53(T.luz));}}
    else for(const [a,b] of [[-1,-1],[1,1],[-1,1],[1,-1]]){const X=s.x+a*(s.r-1),Z=s.z+b*(s.r-1);if(dentro(s,X-s.x,Z-s.z)&&!(a===1&&b===1))pon(X,MZ_Y+1,Z,b53(T.luz));}
    // Decoración junto a las paredes (lejos de las puertas, que están en los ejes)
    for(let dx=-s.r;dx<=s.r;dx++)for(let dz=-s.r;dz<=s.r;dz++){
      if(!dentro(s,dx,dz)||Math.abs(dx)<=2||Math.abs(dz)<=2)continue;
      let junto=false;for(const [a,c] of [[1,0],[-1,0],[0,1],[0,-1]])if(!dentro(s,dx+a,dz+c))junto=true;
      if(!junto||hay(s.x+dx,MZ_Y+1,s.z+dz)||r()>.3)continue;
      const k=T.deco[Math.floor(r()*T.deco.length)];pon(s.x+dx,MZ_Y+1,s.z+dz,b53(k));
      if(k==='estanteria'&&dx+dz<0)pon(s.x+dx,MZ_Y+2,s.z+dz,b53(k));}
    // Cofre sobre un pedestal en una esquina (nunca en la entrada de un pasillo)
    if(s.tipo!=='inicio'&&(s.tipo!=='normal'||r()<.6)){
      const q=s.forma==='redonda'?Math.max(2,Math.floor(s.r*.62)):s.forma==='cruz'?Math.max(2,Math.ceil(s.r*.5)):s.r-1;
      const [a,b]=[[-1,-1],[-1,1],[1,-1]][Math.floor(r()*3)];const X=s.x+a*q,Z=s.z+b*q;
      pon(X,MZ_Y,Z,b53('bloqueOro'));for(const [u,v] of [[1,0],[-1,0],[0,1],[0,-1]])if(dentro(s,X+u-s.x,Z+v-s.z))quita(X+u,MZ_Y+1,Z+v);
      pon(X,MZ_Y+1,Z,B.cofre);s.cofre=[X,MZ_Y+1,Z];}
    if(s.tipo==='inicio'){for(const [a,b] of [[-2,-2],[2,-2],[-2,2]])pon(s.x+a,MZ_Y+1,s.z+b,b53(T.luz));}
  }
  // Pasillos de 3 de ancho; las puertas de cada sala quedan apuntadas para poder cerrarlas
  for(const [a,b] of enlaces){
    const pasos=Math.abs(b.x-a.x)+Math.abs(b.z-a.z),sx=Math.sign(b.x-a.x),sz=Math.sign(b.z-a.z);
    for(let t=0;t<=pasos;t++){const x=a.x+sx*t,z=a.z+sz*t;
      for(let w=-2;w<=2;w++){const X=x+(sz?w:0),Z=z+(sx?w:0);
        if(Math.abs(w)<=1){if(!enSala(X,Z))suelo(X,Z,(t%4===0&&w===0)?b53(T.borde):null);for(let y=1;y<=7;y++)quita(X,MZ_Y+y,Z);}
        else if(!enSala(X,Z)){suelo(X,Z);const h=alturaPared(sz?w:0,sx?w:0,4);for(let y=1;y<=h;y++)pon(X,MZ_Y+y,Z,elige(T.pared));
          if(t%6===3&&h>1)pon(X,MZ_Y+h+1,Z,b53(T.luz));}}}
    for(const s of [a,b]){const o=s===a?b:a,ex=Math.sign(o.x-s.x),ez=Math.sign(o.z-s.z);
      // Primera casilla fuera de la sala en esa dirección
      let d=1;while(d<s.r+3&&dentro(s,ex*d,ez*d))d++;
      s.puertas.push([s.x+ex*d,s.z+ez*d,ez?1:0]);}
  }
  const porChunk=new Map();
  for(const [k,b] of M){const [x,y,z]=k.split(',').map(Number);const c=Math.floor(x/CX)+','+Math.floor(z/CZ);if(!porChunk.has(c))porChunk.set(c,[]);porChunk.get(c).push([x,y,z,b]);}
  return {salas,porChunk,enlaces,tema:T};
};

/* ---------- Puertas que se cierran con la sala en combate ---------- */
function cerrarPuertas53(s,cerrar){
  for(const [x,z,eje] of s.puertas||[])for(let w=-1;w<=1;w++){const X=x+(eje?w:0),Z=z+(eje?0:w);
    for(let y=1;y<=2;y++)setBloque(X,MZ_Y+y,Z,cerrar?B.valla:0,{sinAviso:true});
    emitirParticulas(X+.5,MZ_Y+1.5,Z+.5,cerrar?0x664422:0xcccccc,3,1,.5,0);}
  if(cerrar)sonar('puerta',{x:s.x,y:MZ_Y,z:s.z},.6);
}

/* ---------- Enemigos: por tema, élites y segunda oleada ---------- */
const _enemigoMZ5253=enemigoMZ52;
enemigoMZ52=function(tipo,x,z,elite){
  const m=_enemigoMZ5253(tipo,x,z);if(!m)return m;
  m.def.suelta=()=>[];m.def.xp=[0,0];
  if(elite){m.elite53=true;m.vida*=2.2;m.vidaMax=m.vida;m.def.dano=(m.def.dano||3)*1.4;m.grupo.scale.multiplyScalar(1.18);m.alto*=1.18;}
  // Columna de humo al aparecer
  for(let k=0;k<5;k++)emitirParticulas(x+.5,MZ_Y+1+k*.4,z+.5,elite?0xb050ff:0x442255,4,1,.7,-1);
  return m;
};
activarSala52=function(s){
  s.activada=true;const T=temaMZ53(), sal=Math.max(1,MZ.nivel), tipos=T.tipos.map(t=>tipoMob53(t,'zombi'));
  const sitio=()=>{for(let k=0;k<20;k++){const a=Math.random()*6.28,d=2+Math.random()*(s.r-2.5),dx=Math.round(Math.cos(a)*d),dz=Math.round(Math.sin(a)*d);
    if(!getBloque(s.x+dx,MZ_Y+1,s.z+dz)&&getBloque(s.x+dx,MZ_Y,s.z+dz))return [s.x+dx,s.z+dz];}return [s.x,s.z];};
  if(s.tipo==='jefe'){
    const j=enemigoMZ52(tipoMob53(T.jefe,'vindicador'),s.x,s.z-4);
    if(j){j.vida=j.vidaMax=90+45*MZ.nivel;j.def={...j.def,dano:5+MZ.nivel,vel:(j.def.vel||2.4)*1.1};j.grupo.scale.setScalar(1.7);j.alto*=1.7;j.ancho*=1.4;j.jefe52=true;MZ.jefe=j;}
    for(let k=0;k<2+sal;k++){const [x,z]=sitio();enemigoMZ52(tipos[k%tipos.length],x,z);}
    s.oleada53=1;aviso52('¡JEFE!',T.jefeN,'#ff5555',3);
  }else if(s.tipo==='tesoro'){
    for(let k=0;k<2+Math.floor(sal/2);k++){const [x,z]=sitio();enemigoMZ52(tipos[k%tipos.length],x,z,k===0);}
    avisoPeq53('Sala secreta','¡Hay un tesoro escondido!','#ffd84a',2.5);
  }else{
    const n=3+sal+Math.floor(Math.random()*2);
    for(let k=0;k<n;k++){const [x,z]=sitio();const el=MZ.nivel>=2&&Math.random()<.12+MZ.nivel*.02;
      enemigoMZ52(el?tipoMob53(T.elite[Math.floor(Math.random()*T.elite.length)],'zombi'):tipos[Math.floor(Math.random()*tipos.length)],x,z,el);}
    if(s.r>=7)s.oleada53=1;
  }
  cerrarPuertas53(s,true);s.cerrada53=true;sacudida=Math.max(sacudida,.15);
};
function oleada53(s){
  s.oleada53=0;const T=temaMZ53(),tipos=T.tipos.map(t=>tipoMob53(t,'zombi'));
  avisoPeq53('','¡Otra oleada!','#ff9966',1.6);
  for(let k=0;k<2+MZ.nivel;k++){const a=Math.random()*6.28,d=s.r*.6;enemigoMZ52(tipos[k%tipos.length],Math.round(s.x+Math.cos(a)*d),Math.round(s.z+Math.sin(a)*d),k===0&&MZ.nivel>=2);}
}

/* ---------- Combate: combo, arco de corte, flechas y números ---------- */
const ARCOS53=[];
function arcoCorte53(x,y,z,fx,fz,col,giro,radio){
  const g=new THREE.Group();g.position.set(x,y+.9,z);g.rotation.y=Math.atan2(-fz,fx);
  const geo=new THREE.RingGeometry(radio*.35,radio,28,1,giro?0:-1.15,giro?Math.PI*2:2.3);
  const mat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  const me=new THREE.Mesh(geo,mat);me.rotation.x=-Math.PI/2;g.add(me);escena.add(g);ARCOS53.push({g,mat,geo,t:0,vida:giro?.32:.2,giro});
}
const FLECHAS53=[];
function flechaVisual53(a,b,alLlegar){
  const g=new THREE.Group();
  const palo=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.7),new THREE.MeshBasicMaterial({color:0x8a6236}));g.add(palo);
  const punta=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,.14),new THREE.MeshBasicMaterial({color:0xdddddd}));punta.position.z=.38;g.add(punta);
  g.position.copy(a);g.lookAt(b);escena.add(g);FLECHAS53.push({g,a:a.clone(),b:b.clone(),t:0,dur:Math.max(.06,a.distanceTo(b)/38),fn:alLlegar});
}
let critico53=false;
golpeMZ52=function(){
  if(MZ.cdGolpe>0||estado!=='jugando')return;
  const t=tiempoJuego;MZ.combo53=(t-(MZ.ultGolpe53??-9)<.85)?(MZ.combo53%3)+1:1;MZ.ultGolpe53=t;
  const giro=MZ.combo53===3;MZ.cdGolpe=giro?.5:.3;
  const p=jugador.pos,o=objetivoMZ52(5,true);
  if(o){const dx=o.pos.x-p.x,dz=o.pos.z-p.z,d=Math.hypot(dx,dz)||1;MZ.dir=[dx/d,dz/d];}
  const [fx,fz]=MZ.dir, alc=giro?3.7:3.3;
  arcoCorte53(p.x,p.y,p.z,fx,fz,giro?0xffd060:0xffffff,giro,alc);if(typeof balancearMano==='function')balancearMano();
  sonar('golpe',null,giro?.8:.55);let dio=0;
  for(const m of MZ.enemigos){if(m.muerto)continue;const dx=m.pos.x-p.x,dz=m.pos.z-p.z,d=Math.hypot(dx,dz);
    if(d<alc&&(giro||d<1.3||(dx*fx+dz*fz)/d>.2)){critico53=Math.random()<.2;const dan=(4+MZ.atk*1.6)*(giro?1.5:1)*(critico53?2:1);m.inv=0;
      herirMob(m,dan,{x:dx/(d||1),z:dz/(d||1)},'jugador',giro?2:1);dio++;
      if(critico53){if(typeof chispasCritico==='function')chispasCritico(m.pos.x,m.pos.y+m.alto*.7,m.pos.z,false,12);sonar('critico');}critico53=false;}}
  if(dio)sacudida=Math.max(sacudida,giro?.22:.1);
};
disparoMZ52=function(){
  if(MZ.cdArco>0||estado!=='jugando')return;if(MZ.flechas<=0){avisoPeq53('','Sin flechas','#aaa',1);return;}
  const o=objetivoMZ52(18,false)||objetivoMZ52(10,true);MZ.cdArco=.6;MZ.flechas--;sonar('arco',null,.6);
  const a=jugador.pos.clone();a.y+=1.3;
  if(!o){const [fx,fz]=MZ.dir;flechaVisual53(a,a.clone().add(new THREE.Vector3(fx*12,0,fz*12)));return;}
  const dx=o.pos.x-jugador.pos.x,dz=o.pos.z-jugador.pos.z,d=Math.hypot(dx,dz)||1;MZ.dir=[dx/d,dz/d];
  flechaVisual53(a,o.pos.clone().setY(o.pos.y+o.alto*.6),()=>{if(o.muerto)return;o.inv=0;herirMob(o,3+MZ.atk*1.2,{x:dx/d*.5,z:dz/d*.5},'flechaJugador');});
};
const _esquivaMZ5253=esquivaMZ52;
esquivaMZ52=function(){if(MZ.cdRoll>0||estado!=='jugando')return;_esquivaMZ5253();
  for(let k=0;k<6;k++)emitirParticulas(jugador.pos.x-MZ.dir[0]*k*.4,jugador.pos.y+.2,jugador.pos.z-MZ.dir[1]*k*.4,0xdddddd,2,.6,.35,0);};
// Números de daño en los modos (siempre) y oro/esmeraldas al morir
const _herirMob53=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  const antes=m&&!m.muerto?m.vida:null, crit=critico53;
  const r=_herirMob53.apply(this,arguments);
  if(antes!=null&&enModo52()&&(m.mz52||/LY$/.test(m.tipo))&&antes>m.vida&&typeof numeroDano==='function'){
    const o=OPC.numerosDano;OPC.numerosDano=true;try{numeroDano(m.pos.x,m.pos.y+m.alto+.3,m.pos.z,antes-Math.max(0,m.vida),crit);}finally{OPC.numerosDano=o;}}
  return r;
};
const _matarMob53=matarMob;
matarMob=function(m,fuente){
  if(enModo52()&&(m.mz52||/LY$/.test(m.tipo))){m.def={...m.def,suelta:()=>[],xp:[0,0]};
    if(LY.activo&&(m.tipo==='piglinLY'||m.tipo==='piglinBrutoLY')&&!m.cobrado52){m.cobrado52=true;const o=m.tipo==='piglinBrutoLY'?3:1;LY.oro+=o;gemas53(m.pos,o,0xffd84a);}
    if(MZ.activo&&m.mz52)gemas53(m.pos,m.elite53?5:2,0x44ff66);
    if(m.elite53&&MZ.activo){MZ.esm+=3;if(Math.random()<.5){MZ.pociones++;avisoPeq53('Élite vencido','+1 poción','#d088ff',1.6);}}}
  return _matarMob53.apply(this,arguments);
};
/* ---------- Gemas que vuelan hacia el jugador ---------- */
const GEMAS53=[], geoGema53=new THREE.OctahedronGeometry(.14);
function gemas53(p,n,col){
  for(let k=0;k<Math.min(6,n);k++){const me=new THREE.Mesh(geoGema53,new THREE.MeshBasicMaterial({color:col}));
    me.position.set(p.x,p.y+.8,p.z);escena.add(me);
    GEMAS53.push({me,v:new THREE.Vector3((Math.random()-.5)*4,4+Math.random()*2,(Math.random()-.5)*4),t:0});}
}
/* ---------- Barras de vida sobre enemigos y portales ---------- */
const BARRAS53=new Map(), geoBarra53=new THREE.PlaneGeometry(1,1);
function barra53(clave,ancho,col){
  let b=BARRAS53.get(clave);if(b)return b;
  const g=new THREE.Group();
  const fondo=new THREE.Mesh(geoBarra53,new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.75,depthTest:false,fog:false}));fondo.scale.set(ancho+.06,.16,1);
  const rel=new THREE.Mesh(geoBarra53,new THREE.MeshBasicMaterial({color:col,depthTest:false,fog:false}));rel.scale.set(ancho,.1,1);rel.position.z=.001;
  fondo.renderOrder=997;rel.renderOrder=998;g.add(fondo,rel);escena.add(g);b={g,rel,ancho,vivo:true};BARRAS53.set(clave,b);return b;
}
function ponerBarra53(b,x,y,z,frac){b.vivo=true;b.g.position.set(x,y,z);b.g.quaternion.copy(camara.quaternion);
  const f=Math.max(0,Math.min(1,frac));b.rel.scale.x=Math.max(.001,b.ancho*f);b.rel.position.x=-(b.ancho*(1-f))/2;}
function actualizarBarras53(){
  for(const b of BARRAS53.values())b.vivo=false;
  if(MZ.activo)for(const m of MZ.enemigos){if(m.muerto||m.jefe52||(m.vida>=m.vidaMax&&!m.elite53))continue;
    ponerBarra53(barra53(m,m.elite53?1.1:.8,m.elite53?0xc060ff:0xff4444),m.pos.x,m.pos.y+m.alto+.35,m.pos.z,m.vida/m.vidaMax);}
  if(LY.activo){for(const b of LY.bases)if(b.vida>0)ponerBarra53(barra53(b,3,0xc04cff),b.x+.5,b.y+8,b.z+.5,b.vida/b.vidaMax);
    if(LY.aldea)ponerBarra53(barra53(LY.aldea,3,0x66ff66),LY.aldea.x+.5,LY.aldea.y+7.5,LY.aldea.z+.5,LY.aldea.vida/100);
    for(const m of mobs)if((esGolemLY(m)||esPiglinLY(m))&&m.vidaMax&&m.vida<m.vidaMax)ponerBarra53(barra53(m,.8,esGolemLY(m)?0x66ccff:0xff5544),m.pos.x,m.pos.y+m.alto+.3,m.pos.z,m.vida/m.vidaMax);}
  for(const [k,b] of BARRAS53)if(!b.vivo){escena.remove(b.g);b.g.children.forEach(c=>c.material.dispose());BARRAS53.delete(k);}
}
// Las criaturas de Leyendas recuerdan su vida máxima
const _crearMob53=crearMob;
crearMob=function(tipo){const m=_crearMob53.apply(this,arguments);if(m&&/LY$/.test(tipo))m.vidaMax=m.vida;return m;};

/* ---------- Equipo visible: el arma y la armadura que llevas ---------- */
function equipoMZ53(){
  const espada=MZ.atk>=4?'espada_diamante':MZ.atk>=1?'espada_hierro':'espada_piedra';
  if(ITEMS&&idClave(espada))inv[0]=crearPila(idClave(espada));
  const mat=MZ.def>=6?'diamante':MZ.def>=3?'hierro':MZ.def>=1?'cuero':null;
  const piezas=['casco','pechera','pantalones','botas'];
  for(let i=0;i<4;i++){const id=mat&&idClave(piezas[i]+'_'+mat);inv[36+i]=id?crearPila(id):null;}
  if(typeof actualizarHUD==='function')actualizarHUD();
}
// La armadura es solo de adorno: la defensa de la mazmorra ya la cuenta MZ.def
const _danarJugador53=danarJugador;
danarJugador=function(n,tipo,dir){
  if(!MZ.activo)return _danarJugador53.apply(this,arguments);
  const g=inv.slice(36,40);for(let i=36;i<40;i++)inv[i]=null;
  try{return _danarJugador53.apply(this,arguments);}finally{for(let i=0;i<4;i++)inv[36+i]=g[i];sacudida=Math.min(sacudida,.25);}
};
const _abrirCofreMZ5253=abrirCofreMZ52;
abrirCofreMZ52=function(s){
  if(s.tipo==='tesoro'&&!s.limpia){if(!s.aviso53){s.aviso53=true;avisoPeq53('','Vence a los guardianes para abrir el tesoro','#ffd84a',1.8);}return;}
  const extra=s.tipo==='tesoro';const r=_abrirCofreMZ5253.apply(this,arguments);
  if(extra){MZ.esm+=10+MZ.nivel*2;MZ.pociones++;avisoPeq53('Tesoro',`+${10+MZ.nivel*2} esmeraldas · +1 poción`,'#ffd84a',2.5);}
  equipoMZ53();return r;
};
const _iniciarMazmorras5253=iniciarMazmorras52;
iniciarMazmorras52=function(nivel,conservar){
  for(const id of ['hudLY52','brujula53'])document.getElementById(id)?.remove();
  const r=_iniciarMazmorras5253.apply(this,arguments);
  MZ.zoom53=MZ.zoom53||1;MZ.combo53=0;camMZ53.listo=false;equipoMZ53();mapaMZ53=null;
  const T=temaMZ53();tiempoDia=T.dia;
  setTimeout(()=>avisoPeq53(T.n,'Nivel '+nivel+(nivel%3===0?' · ¡cuidado!':''),'#ffd84a',3),900);
  return r;
};

/* ---------- Cámara suave con zoom ---------- */
const camMZ53={x:0,y:0,z:0,listo:false,t:0};
aplicarCamaraTercera=(function(prev){return function(){
  if(!MZ.activo||estado==='menu')return prev.apply(this,arguments);
  const ahora=performance.now()/1000,dt=Math.min(.1,camMZ53.t?ahora-camMZ53.t:0);camMZ53.t=ahora;
  const p=jugador.pos,z=MZ.zoom53||1,tx=p.x+Math.sin(CAM_AZ52)*9.5*z+MZ.dir[0]*.8,ty=p.y+12.5*z,tz=p.z+Math.cos(CAM_AZ52)*9.5*z+MZ.dir[1]*.8;
  if(!camMZ53.listo){Object.assign(camMZ53,{x:tx,y:ty,z:tz,listo:true});}
  const k=1-Math.exp(-9*dt);camMZ53.x+=(tx-camMZ53.x)*k;camMZ53.y+=(ty-camMZ53.y)*k;camMZ53.z+=(tz-camMZ53.z)*k;
  const s=sacudida*.35;camara.position.set(camMZ53.x+(Math.random()-.5)*s,camMZ53.y+(Math.random()-.5)*s,camMZ53.z);
  camara.lookAt(camMZ53.x-Math.sin(CAM_AZ52)*9.5*z,camMZ53.y-11.5*z,camMZ53.z-Math.cos(CAM_AZ52)*9.5*z);
  mano.visible=false;if(typeof mano2!=='undefined')mano2.visible=false;
};})(aplicarCamaraTercera);
window.addEventListener('wheel',e=>{if(!MZ.activo||estado!=='jugando')return;e.stopImmediatePropagation();
  MZ.zoom53=Math.max(.6,Math.min(1.6,(MZ.zoom53||1)*(e.deltaY>0?1.1:1/1.1)));},{capture:true,passive:true});

/* ---------- Abismo oscuro bajo la mazmorra (no se ve el cielo por debajo) ---------- */
const abismo53=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshBasicMaterial({color:0x0b0a0d,fog:false,depthWrite:true}));
abismo53.rotation.x=-Math.PI/2;abismo53.visible=false;escena.add(abismo53);

/* ---------- Minimapa y barra de acciones ---------- */
let mapaMZ53=null;
function mapaBase53(){
  const c=document.createElement('canvas');c.width=c.height=150;const g=c.getContext('2d');
  const S=MZ.salas;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const s of S){x0=Math.min(x0,s.x-s.r);x1=Math.max(x1,s.x+s.r);z0=Math.min(z0,s.z-s.r);z1=Math.max(z1,s.z+s.r);}
  const esc=136/Math.max(x1-x0,z1-z0,1),ox=7+(136-(x1-x0)*esc)/2,oz=7+(136-(z1-z0)*esc)/2;
  return {c,g,esc,X:x=>ox+(x-x0)*esc,Z:z=>oz+(z-z0)*esc};
}
function pintarMapa53(cv){
  if(!mapaMZ53)mapaMZ53=mapaBase53();const M=mapaMZ53,g=cv.getContext('2d');
  g.clearRect(0,0,150,150);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,150,150);
  g.strokeStyle='rgba(200,190,160,.55)';g.lineWidth=Math.max(2,3*M.esc);
  for(const [a,b] of MZ.mapa.enlaces||[]){if(!a.activada&&!b.activada)continue;g.beginPath();g.moveTo(M.X(a.x),M.Z(a.z));g.lineTo(M.X(b.x),M.Z(b.z));g.stroke();}
  for(const s of MZ.salas){const vista=s.activada||MZ.salas.some(o=>o.activada&&Math.hypot(o.x-s.x,o.z-s.z)<30);if(!vista)continue;
    g.fillStyle=s.tipo==='jefe'?'rgba(220,60,60,.8)':s.tipo==='tesoro'?'rgba(230,190,60,.8)':s.limpia?'rgba(150,150,140,.75)':s.activada?'rgba(230,120,60,.8)':'rgba(90,90,90,.6)';
    const w=s.r*2*M.esc;if(s.forma==='redonda'){g.beginPath();g.arc(M.X(s.x),M.Z(s.z),w/2,0,6.29);g.fill();}else g.fillRect(M.X(s.x)-w/2,M.Z(s.z)-w/2,w,w);
    if(s.cofre){g.fillStyle='#ffd84a';g.fillRect(M.X(s.cofre[0])-2,M.Z(s.cofre[2])-2,4,4);}}
  g.fillStyle='#ff4444';for(const m of MZ.enemigos)if(!m.muerto){g.fillRect(M.X(m.pos.x)-1.5,M.Z(m.pos.z)-1.5,3,3);}
  if(MZ.salida){g.fillStyle='#66ff99';g.beginPath();g.arc(M.X(MZ.salida[0]),M.Z(MZ.salida[1]),4,0,6.29);g.fill();}
  const p=jugador.pos;g.save();g.translate(M.X(p.x),M.Z(p.z));g.rotate(Math.atan2(-MZ.dir[0],MZ.dir[1]));
  g.fillStyle='#fff';g.beginPath();g.moveTo(0,5);g.lineTo(-3.5,-3.5);g.lineTo(3.5,-3.5);g.closePath();g.fill();g.restore();
}
let hudT53=0;
pintarHudMZ52=function(){
  let el=document.getElementById('hudMZ52');
  if(!el){el=document.createElement('div');el.id='hudMZ52';el.className='hud52 hud53';
    el.innerHTML=`<b class="tit52" id="tit53"></b><div id="info53"></div><canvas id="mapa53" width="150" height="150"></canvas>`;document.body.appendChild(el);}
  let bar=document.getElementById('accMZ53');if(!bar){bar=document.createElement('div');bar.id='accMZ53';bar.className='acc53';document.body.appendChild(bar);}
  const T=temaMZ53(),vivos=MZ.enemigos.filter(m=>!m.muerto).length;
  document.getElementById('tit53').textContent=`${T.n.toUpperCase()} · NIVEL ${MZ.nivel}`;
  document.getElementById('info53').innerHTML=`<div class="vid53">${'<i class="c53"></i>'.repeat(MZ.vidas)}${'<i class="c53 no"></i>'.repeat(Math.max(0,3-MZ.vidas))}</div>
    <div><span class="moneda45" style="background:radial-gradient(circle at 35% 30%,#bfffcf 0 18%,#3ad16a 45%,#1a7a3a)"></span><b>${MZ.esm}</b> · ⚔ <b>${MZ.atk}</b> · 🛡 <b>${MZ.def}</b></div>
    <div class="pista52">${vivos?`<span style="color:#f88">Enemigos: ${vivos}</span>`:'Explora la mazmorra'} · Rueda: zoom</div>`;
  pintarMapa53(document.getElementById('mapa53'));
  const cd=(v,max)=>v>0?`<em style="background:conic-gradient(rgba(0,0,0,.65) ${v/max*360}deg,transparent 0)"></em><s>${Math.ceil(v)}</s>`:'';
  const ranura=(tecla,icono,nombre,extra,col,cdv,max,no)=>`<div class="r53${no?' no':''}" style="border-color:${col}"><span class="ic53">${icono}</span>${cd(cdv,max)}<b>${tecla}</b><small>${nombre}${extra!=null?' · '+extra:''}</small></div>`;
  bar.innerHTML=ranura('J','🗡',MZ.combo53>1&&tiempoJuego-(MZ.ultGolpe53??-9)<.85?'Combo '+MZ.combo53:'Espada',null,'#ddd',MZ.cdGolpe,.5)
    +ranura('K','🏹','Arco',MZ.flechas,'#d8c8a0',MZ.cdArco,.6,MZ.flechas<=0)
    +ranura('␣','💨','Esquivar',null,'#9cf',MZ.cdRoll,1.1)
    +ranura('E','🧪','Poción',MZ.pociones,'#f6a',MZ.cdPocion,2,MZ.pociones<=0)
    +MZ.artefactos.map((a,i)=>{const A=ARTEFACTOS52[a.id];return ranura(i+1,{cuerno:'📯',botas:'👢',fuegos:'🎆',totem:'🗿'}[a.id]||'✨',A.n.split(' ')[0],null,A.col,a.cd,A.cd);}).join('');
};
// El HUD se repinta unas 8 veces por segundo, no en cada fotograma
const _pintarHudMZ5253=pintarHudMZ52;
pintarHudMZ52=function(){const t=performance.now();if(t-hudT53<120&&document.getElementById('hudMZ52'))return;hudT53=t;_pintarHudMZ5253();};

/* ---------- Bucle de la mazmorra: oleadas, puertas, ambiente ---------- */
const _actualizarMZ5253=actualizarMZ52;
actualizarMZ52=function(dt){
  const T0=temaMZ53();tiempoDia=T0.dia;abismo53.visible=true;abismo53.material.color.setHex(T0.abismo);abismo53.position.set(jugador.pos.x,MZ_Y-2.6,jugador.pos.z);
  for(const s of MZ.salas){if(!s.activada||s.limpia)continue;
    const vivos=MZ.enemigos.some(m=>!m.muerto&&Math.abs(m.pos.x-s.x)<=s.r+2&&Math.abs(m.pos.z-s.z)<=s.r+2);
    if(!vivos&&s.oleada53)oleada53(s);}
  _actualizarMZ5253(dt);
  const bj=document.querySelector('#jefeMZ52 b');if(bj)bj.textContent=temaMZ53().jefeN+' · Nivel '+MZ.nivel;
  for(const s of MZ.salas)if(s.limpia&&s.cerrada53){s.cerrada53=false;cerrarPuertas53(s,false);avisoPeq53('','Sala despejada','#9f9',1.4);sonar('nivel',null,.4);}
  // Polvo/brasas de ambiente y brillo de los élites
  const T=temaMZ53(),p=jugador.pos;
  if(Math.random()<dt*14)emitirParticulas(p.x+(Math.random()-.5)*16,MZ_Y+1+Math.random()*4,p.z+(Math.random()-.5)*16,T.particula,1,.25,2.2,T.n.includes('Nether')?-1.2:.15);
  for(const m of MZ.enemigos)if(m.elite53&&!m.muerto&&Math.random()<dt*10)emitirParticulas(m.pos.x,m.pos.y+m.alto*.6,m.pos.z,0xc070ff,1,.8,.6,-1);
  if(MZ.jefe&&!MZ.jefe.muerto&&Math.random()<dt*8)emitirParticulas(MZ.jefe.pos.x,MZ.jefe.pos.y+.3,MZ.jefe.pos.z,0xff3322,2,1.2,.6,-1);
};

/* =========================================================
   LEYENDAS: aldea, portales y ayudantes
   ========================================================= */
function rellenarHasta53(x,y,z,b){for(let k=1;k<6;k++){const q=getBloque(x,y-k,z);if(q&&SOLIDO[q]&&!esAgua(q))break;setBloque(x,y-k,z,b);}}
function casaLY53(X,Z,cx,cz){
  const Y=sueloLY52(X,Z);
  // Puerta mirando a la plaza
  const ladoX=Math.abs(cx-X)>Math.abs(cz-Z), sg=ladoX?Math.sign(cx-X):Math.sign(cz-Z);
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){
    setBloque(X+a,Y,Z+b,Math.abs(a)===3||Math.abs(b)===3?B.roca:B.tablones);rellenarHasta53(X+a,Y,Z+b,B.roca);
    for(let y=1;y<=9;y++)setBloque(X+a,Y+y,Z+b,0);}
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){const borde=Math.abs(a)===3||Math.abs(b)===3;if(!borde)continue;
    const esq=Math.abs(a)===3&&Math.abs(b)===3;
    for(let y=1;y<=4;y++){
      const puerta=(ladoX?(a===3*sg&&b===0):(b===3*sg&&a===0))&&y<=2;
      const ventana=y===2&&!esq&&((Math.abs(a)===3&&Math.abs(b)===1)||(Math.abs(b)===3&&Math.abs(a)===1))&&!(ladoX?a===3*sg:b===3*sg);
      setBloque(X+a,Y+y,Z+b,puerta?0:esq?B.tronco:ventana?B.vidrio:y===4?B.tronco:B.tablones);}}
  // Tejado a cuatro aguas con alero
  const teja=b53('tablonesAbeto','tablonesRobleOscuro','tablones');
  for(let i=0;i<=4;i++){const h=4-i;for(let a=-h;a<=h;a++)for(let b=-h;b<=h;b++)if(Math.max(Math.abs(a),Math.abs(b))===h||i===4)setBloque(X+a,Y+5+i,Z+b,i===0?b53('losaMadera','tablones'):teja);}
  setBloque(X+2*(ladoX?-sg:1),Y+7,Z+2*(ladoX?1:-sg),B.ladrillos);setBloque(X+2*(ladoX?-sg:1),Y+8,Z+2*(ladoX?1:-sg),B.ladrillos);
  // Interior y farol junto a la puerta
  setBloque(X-1*(ladoX?sg:1),Y+1,Z-1*(ladoX?1:sg),b53('mesa'));setBloque(X+(ladoX?-sg:-1),Y+1,Z+(ladoX?-1:-sg)*-1,b53('barril'));
  setBloque(X,Y+4,Z,b53('farol'));
  const dX=ladoX?X+4*sg:X+1,dZ=ladoX?Z+1:Z+4*sg;const yd=sueloLY52(dX,dZ);
  setBloque(dX,yd+1,dZ,B.valla);setBloque(dX,yd+2,dZ,b53('farol'));
  crearMob('aldeano',X+.5,Y+1.1,Z+.5);
  return ladoX?[X+4*sg,Z]:[X,Z+4*sg];
}
function caminoLY53(x0,z0,x1,z1){
  const n=Math.max(Math.abs(x1-x0),Math.abs(z1-z0));
  for(let t=0;t<=n;t++){const x=Math.round(x0+(x1-x0)*t/n),z=Math.round(z0+(z1-z0)*t/n);
    for(const [a,b] of [[0,0],[1,0],[0,1]]){const X=x+a,Z=z+b,Y=sueloLY52(X,Z),q=getBloque(X,Y,Z);
      if(q===B.cesped||q===B.tierra||q===B.arena)setBloque(X,Y,Z,Math.random()<.85?b53('senda'):B.grava||B.tierra);}
    if(t%7===4){const X=x+2,Z=z+2,Y=sueloLY52(X,Z);if(!getBloque(X,Y+1,Z)){setBloque(X,Y+1,Z,B.valla);setBloque(X,Y+2,Z,B.valla);setBloque(X,Y+3,Z,b53('farol'));}}}
}
function huertoLY53(X,Z){
  const Y=sueloLY52(X,Z);
  for(let a=-3;a<=3;a++)for(let b=-2;b<=2;b++){const borde=Math.abs(a)===3||Math.abs(b)===2;
    setBloque(X+a,Y,Z+b,borde?B.tronco:b53('cultivoHumedo','cultivo'));rellenarHasta53(X+a,Y,Z+b,B.tierra);
    for(let y=1;y<=3;y++)setBloque(X+a,Y+y,Z+b,0);
    if(!borde)setBloque(X+a,Y+1,Z+b,b53(Math.random()<.7?'trigo7':'trigo5','trigo7'));}
  setBloque(X+3,Y+1,Z+2,B.heno||B.tronco);setBloque(X-3,Y+1,Z-2,B.heno||B.tronco);
}
function plazaLY53(x0,y0,z0){
  for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++){const d=Math.max(Math.abs(a),Math.abs(b));
    setBloque(x0+a,y0,z0+b,d===4?b53('senda'):d===3?B.ladrillosPiedra:(a+b)&1?B.ladrillosPiedra:b53('ladrillosAgrietados','ladrillosPiedra'));rellenarHasta53(x0+a,y0,z0+b,B.roca);
    for(let y=1;y<=7;y++)setBloque(x0+a,y0+y,z0+b,0);}
  // Pozo-corazón: columnas, techo y la piedra luminosa sobre oro
  for(const [a,b] of [[-2,-2],[2,2],[-2,2],[2,-2]]){for(let y=1;y<=3;y++)setBloque(x0+a,y0+y,z0+b,y===1?B.ladrillosPiedra:B.valla);}
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){setBloque(x0+a,y0+4,z0+b,b53('losaMadera','tablones'));if(Math.max(Math.abs(a),Math.abs(b))<=1)setBloque(x0+a,y0+5,z0+b,b53('tablonesAbeto','tablones'));}
  for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]])setBloque(x0+a,y0+1,z0+b,B.ladrillosPiedra);
  setBloque(x0,y0+1,z0,b53('bloqueOro'));setBloque(x0,y0+2,z0,b53('piedraLuminosa'));setBloque(x0,y0+3,z0,b53('cadena','valla'));
  for(const [a,b] of [[-3,-3],[3,3],[-3,3],[3,-3]]){setBloque(x0+a,y0+1,z0+b,B.valla);setBloque(x0+a,y0+2,z0+b,b53('farol'));}
}
function portalLY53(X,Y,Z){
  // Terreno corrompido alrededor
  for(let a=-14;a<=14;a++)for(let b=-14;b<=14;b++){const d=Math.hypot(a,b);if(d<6||d>14||Math.random()>1.15-d/14)continue;
    const y=sueloLY52(X+a,Z+b),q=getBloque(X+a,y,Z+b);if(q&&!esAgua(q)&&!esHojas(q))setBloque(X+a,y,Z+b,Math.random()<.6?B.netherrack:b53('nilioCarmesi','netherrack'));
    if(Math.random()<.03&&!getBloque(X+a,y+1,Z+b))setBloque(X+a,y+1,Z+b,b53('raicesCarmesi','hongoCarmesi'));}
  for(let a=-6;a<=6;a++)for(let b=-6;b<=6;b++){const d=Math.max(Math.abs(a),Math.abs(b));
    setBloque(X+a,Y,Z+b,d===6?b53('ladrillosNether'):(a*7+b*3)%5===0?b53('bloqueMagma'):Math.random()<.25?b53('piedraNegra'):B.netherrack);
    rellenarHasta53(X+a,Y,Z+b,B.netherrack);for(let y=1;y<=9;y++)setBloque(X+a,Y+y,Z+b,0);}
  // Torres en las esquinas con almenas y fuego de almas
  for(const [a,b] of [[-5,-5],[5,5],[-5,5],[5,-5]]){
    for(let u=-1;u<=1;u++)for(let v=-1;v<=1;v++)for(let y=1;y<=6;y++)if(Math.abs(u)+Math.abs(v)<2||y<5)setBloque(X+a+u,Y+y,Z+b+v,y===6?b53('ladrillosNether'):Math.random()<.3?b53('piedraNegra'):b53('ladrillosNether'));
    setBloque(X+a,Y+7,Z+b,b53('luzHongo'));
    for(const [u,v] of [[-1,-1],[1,1],[-1,1],[1,-1]])setBloque(X+a+u,Y+7,Z+b+v,b53('ladrillosNether'));}
  // Marco del portal (5 de ancho) con el interior morado
  for(let y=1;y<=5;y++)for(const a of [-2,2])setBloque(X+a,Y+y,Z,b53('obsidiana'));
  for(const a of [-1,0,1]){setBloque(X+a,Y+1,Z,b53('obsidiana'));setBloque(X+a,Y+5,Z,b53('obsidiana'));}
  for(let y=2;y<=4;y++)for(const a of [-1,0,1])setBloque(X+a,Y+y,Z,b53('bloqueAmatista','verrugaBloque'));
  for(const [a,b] of [[-3,2],[3,-2],[2,3]]){setBloque(X+a,Y+1,Z+b,b53('bloqueOro'));}
  for(const [a,b] of [[-3,-3],[3,3]])for(let y=1;y<=3;y++)setBloque(X+a,Y+y,Z+b,y===3?b53('bloqueMagma'):B.netherrack);
}
// Quita árboles y plantas donde va la aldea
function despejar53(x0,y0,z0,R){
  for(let a=-R;a<=R;a++)for(let b=-R;b<=R;b++){if(a*a+b*b>R*R)continue;
    for(let y=y0+28;y>=y0-6;y--){const q=getBloque(x0+a,y,z0+b);if(!q)continue;const D=BLOQUES[q],c=D&&D.clave||'';
      if(esHojas(q)||/^tronco|^hongo|^tallo|^cactus|^bambu|^enredadera/.test(c)||(D&&D.forma==='cruz'))setBloque(x0+a,y,z0+b,0,{sinAviso:true});}}
}
iniciarLeyendas52=function(){
  if(typeof BW!=='undefined'&&BW&&BW.activo&&typeof salirDeBedwars==='function')salirDeBedwars();
  for(const id of ['finModo52','hudMZ52','jefeMZ52','accMZ53'])document.getElementById(id)?.remove();
  MZ.activo=false;MZ.enemigos=[];MZ.jefe=null;mundoId=null;metaMundo=null;selModo.value='supervivencia';
  window.semillaElegida=1+Math.floor(Math.random()*1e6);
  nuevoMundo();
  Object.assign(LY,{activo:true,madera:20,piedra:20,oro:0,bases:[],golems:[],spawners:[],torres:[],orden:'seguir',raidT:150,cdG:0,cosechado:new Set(),fin:false,piglinT:12,mejora53:0});
  modo='supervivencia';tiempoDia=.27;lloviendo=false;mundoEstado.leyendas=true;
  const x0=Math.floor(jugador.pos.x),z0=Math.floor(jugador.pos.z),y0=sueloLY52(x0,z0);
  LY.aldea={x:x0,y:y0,z:z0,vida:100};
  limpiarZonaLY52(x0,y0,z0,22);despejar53(x0,y0,z0,21);
  plazaLY53(x0,y0,z0);
  for(const [cx,cz] of [[11,-1],[-11,2],[1,12],[-2,-12]]){const p=casaLY53(x0+cx,z0+cz,x0,z0);caminoLY53(x0,z0,p[0],p[1]);}
  huertoLY53(x0+11,z0+11);huertoLY53(x0-11,z0-11);
  for(let k=0;k<3;k++){const [X,Y,Z]=sitioTierraLY52(x0,z0,k/3*Math.PI*2+Math.random()*.5);limpiarZonaLY52(X,Y,Z,9);portalLY53(X,Y,Z);
    LY.bases.push({x:X,y:Y,z:Z,vida:80,vidaMax:80});}
  inv=new Array(41).fill(null);inv[0]=crearPila(idClave('espada_hierro'));ranura=0;salud=20;hambre=20;
  jugador.pos.set(x0+.5,y0+1.01,z0+5.5);jugador.vel.set(0,0,0);vistaTercera=1;fuegoJ=0;efectos={};
  empezar();pintarHudLY52();
  aviso52('LEYENDAS','Protege la aldea','#ffd84a',3.5);
  setTimeout(()=>avisoPeq53('Objetivo','Destruye los 3 portales piglin (sigue la brújula)','#ffd84a',4),1500);
};
/* ---------- Ayudantes (allays) que van a por los recursos ---------- */
const texAllay53=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');
  const r=g.createRadialGradient(16,16,1,16,16,15);r.addColorStop(0,'#fff');r.addColorStop(.35,'#9fe8ff');r.addColorStop(1,'rgba(80,170,255,0)');g.fillStyle=r;g.fillRect(0,0,32,32);
  g.fillStyle='#e8fbff';g.fillRect(14,12,4,7);return new THREE.CanvasTexture(c);})();
const ALLAYS53=[];
function allay53(desde,hasta,col){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texAllay53,color:col||0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  s.scale.set(.7,.7,1);s.position.copy(desde);escena.add(s);ALLAYS53.push({s,a:desde.clone(),b:hasta.clone(),t:-Math.random()*.4,dur:1.6+Math.random()*.6});
}
cosecharLY52=function(){
  if(LY.cdG>0){avisoPeq53('','Los ayudantes vuelven en '+Math.ceil(LY.cdG)+' s','#aaa',1);return;}
  LY.cdG=4;const p=jugador.pos,X=Math.floor(p.x),Y=Math.floor(p.y),Z=Math.floor(p.z);let m=0,s=0;const cab=p.clone().setY(p.y+1.6);
  for(let dx=-10;dx<=10;dx++)for(let dz=-10;dz<=10;dz++)for(let dy=-4;dy<=10;dy++){const k=(X+dx)+','+(Y+dy)+','+(Z+dz);if(LY.cosechado.has(k))continue;
    const b=getBloqueSiCargado(X+dx,Y+dy,Z+dz);if(!b||b<0)continue;const nm=BLOQUES[b]&&BLOQUES[b].clave||'';
    if(m<14&&/^tronco/.test(nm)){m++;LY.cosechado.add(k);if(m%3===1)allay53(cab,new THREE.Vector3(X+dx+.5,Y+dy+.5,Z+dz+.5),0xffe6b0);}
    else if(s<14&&(nm==='piedra'||nm==='roca'||nm==='andesita'||nm==='diorita'||nm==='granito')&&!getBloqueSiCargado(X+dx,Y+dy+1,Z+dz)){s++;LY.cosechado.add(k);if(s%3===1)allay53(cab,new THREE.Vector3(X+dx+.5,Y+dy+1.2,Z+dz+.5),0xd8e8ff);}}
  LY.madera+=m;LY.piedra+=s;sonar('recoger',null,.6);
  avisoPeq53('Ayudantes',m||s?`+${m} madera · +${s} piedra`:'No queda nada cerca: muévete a otra zona','#9fd8ff',1.8);
};
/* ---------- Mejora de golems con oro ---------- */
CONSTRUCCIONES52[6]={n:'Mejorar golems',m:0,p:0,oro:8};
const _construirLY5253=construirLY52;
construirLY52=function(k){
  if(k!==6)return _construirLY5253.apply(this,arguments);
  if(LY.oro<8){avisoPeq53('','Falta: 8 de oro (vence piglins y portales)','#f88',1.6);return;}
  if((LY.mejora53||0)>=3){avisoPeq53('','Los golems ya están al máximo','#aaa',1.4);return;}
  LY.oro-=8;LY.mejora53=(LY.mejora53||0)+1;
  for(const m of mobs)if(esGolemLY(m)){m.vidaMax=(m.vidaMax||m.vida)*1.3;m.vida=m.vidaMax;m.def={...m.def,dano:m.def.dano*1.25};emitirParticulas(m.pos.x,m.pos.y+1,m.pos.z,0xffd84a,10,1.5,.6,-1);}
  sonar('nivel');avisoPeq53('Golems mejorados','Nivel '+LY.mejora53+'/3: más vida y daño','#ffd84a',2);
};
const _crearMobLY53=crearMob;
crearMob=function(tipo){const m=_crearMobLY53.apply(this,arguments);
  if(m&&LY.activo&&LY.mejora53&&(tipo==='golemPiedraLY'||tipo==='golemTablaLY')){const k=Math.pow(1.3,LY.mejora53);m.vida=m.vidaMax=m.vida*k;m.def={...m.def,dano:m.def.dano*Math.pow(1.25,LY.mejora53)};}
  return m;};
/* ---------- Vista previa de construcción ---------- */
const guia53=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.04,3.04,3.04)),new THREE.LineBasicMaterial({color:0x88ff88,transparent:true,opacity:.45,depthTest:false,fog:false}));
guia53.visible=false;guia53.renderOrder=996;escena.add(guia53);
function actualizarGuia53(){
  if(!LY.activo||estado!=='jugando'){guia53.visible=false;return;}
  const fx=-Math.sin(jugador.yaw),fz=-Math.cos(jugador.yaw),X=Math.floor(jugador.pos.x+fx*4),Z=Math.floor(jugador.pos.z+fz*4),Y=sueloLY52(X,Z);
  guia53.position.set(X+.5,Y+2.5,Z+.5);guia53.visible=true;
  const ok=[1,2,3].some(k=>LY.madera>=CONSTRUCCIONES52[k].m&&LY.piedra>=CONSTRUCCIONES52[k].p);guia53.material.color.setHex(ok?0x88ff88:0xff7777);
}
/* ---------- HUD de Leyendas con brújula ---------- */
const _pintarHudLY5253=pintarHudLY52;
let hudLYT53=0;
pintarHudLY52=function(){
  const t=performance.now();if(t-hudLYT53<120&&document.getElementById('hudLY52'))return;hudLYT53=t;
  _pintarHudLY5253();const el=document.getElementById('hudLY52');if(!el)return;el.classList.add('hud53');
  // La tabla de construcciones incluye el coste en oro
  el.querySelectorAll('.arts52 span').forEach(sp=>{const k=+sp.querySelector('b').textContent,C=CONSTRUCCIONES52[k];if(C&&C.oro){sp.querySelector('i').textContent=C.oro+'🟡';sp.className=LY.oro>=C.oro&&(LY.mejora53||0)<3?'':'no52';}});
  let br=document.getElementById('brujula53');if(!br){br=document.createElement('div');br.id='brujula53';br.innerHTML='<i>➤</i><span></span>';document.body.appendChild(br);}
  const vivas=LY.bases.filter(b=>b.vida>0);if(!vivas.length){br.style.display='none';return;}br.style.display='';
  const p=jugador.pos;const b=vivas.sort((a,c)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(c.x-p.x,c.z-p.z))[0];
  const dx=b.x-p.x,dz=b.z-p.z,y=jugador.yaw,fx=-Math.sin(y),fz=-Math.cos(y),rx=Math.cos(y),rz=-Math.sin(y);
  const ang=Math.atan2(dx*rx+dz*rz,dx*fx+dz*fz);
  br.querySelector('i').style.transform=`rotate(${ang-Math.PI/2}rad)`;br.querySelector('span').textContent=`Portal · ${Math.round(Math.hypot(dx,dz))} m`;
};
// Guía: muestra la mejora 6 en la ayuda
/* ---------- Bucle común ---------- */
const _actualizarFinal53=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal53(dt);
  document.body.classList.toggle('modo53',enModo52()&&estado!=='menu');
  if(!MZ.activo){document.getElementById('accMZ53')?.remove();abismo53.visible=false;}
  if(!LY.activo){document.getElementById('brujula53')?.remove();}
  // Arcos de corte
  for(let i=ARCOS53.length-1;i>=0;i--){const a=ARCOS53[i];a.t+=dt;const f=a.t/a.vida;
    a.g.scale.setScalar(.75+f*.4);if(a.giro)a.g.rotation.y+=dt*14;a.mat.opacity=.75*(1-f);
    if(f>=1){escena.remove(a.g);a.geo.dispose();a.mat.dispose();ARCOS53.splice(i,1);}}
  // Flechas
  for(let i=FLECHAS53.length-1;i>=0;i--){const f=FLECHAS53[i];f.t+=dt;const k=Math.min(1,f.t/f.dur);
    f.g.position.lerpVectors(f.a,f.b,k);f.g.position.y+=Math.sin(k*Math.PI)*.25;
    if(k>=1){if(f.fn)f.fn();escena.remove(f.g);f.g.children.forEach(c=>{c.geometry.dispose();c.material.dispose();});FLECHAS53.splice(i,1);}}
  // Gemas
  for(let i=GEMAS53.length-1;i>=0;i--){const g=GEMAS53[i];g.t+=dt;g.me.rotation.y+=dt*6;
    if(g.t<.45){g.v.y-=14*dt;g.me.position.addScaledVector(g.v,dt);}
    else{const o=jugador.pos.clone();o.y+=1;const d=o.sub(g.me.position);const l=d.length();g.me.position.addScaledVector(d.normalize(),Math.min(l,dt*(8+g.t*20)));
      if(l<.4){escena.remove(g.me);g.me.material.dispose();GEMAS53.splice(i,1);sonar('recoger',null,.25);}}
    if(g.t>3){escena.remove(g.me);g.me.material.dispose();GEMAS53.splice(i,1);}}
  // Ayudantes
  for(let i=ALLAYS53.length-1;i>=0;i--){const a=ALLAYS53[i];a.t+=dt;if(a.t<0)continue;const f=a.t/a.dur, ida=f<.5?f*2:2-f*2;
    const o=jugador.pos.clone();o.y+=1.6;a.s.position.lerpVectors(f<.5?a.a:o,a.b,f<.5?ida:ida);a.s.position.y+=Math.sin(f*Math.PI)*1.5+Math.sin(a.t*12)*.08;
    if(f>.45&&f<.55&&Math.random()<.5)emitirParticulas(a.b.x,a.b.y,a.b.z,0xbfefff,2,.8,.4,0);
    if(f>=1){escena.remove(a.s);a.s.material.dispose();ALLAYS53.splice(i,1);}}
  if(estado==='jugando'||estado==='ui'){
    actualizarBarras53();actualizarGuia53();
    if(LY.activo&&LY.aldea&&Math.random()<dt*6)emitirParticulas(LY.aldea.x+.5,LY.aldea.y+3+Math.random()*3,LY.aldea.z+.5,0xffe680,1,.3,1.2,-1.5);
  }else if(!enModo52()){if(BARRAS53.size)actualizarBarras53();guia53.visible=false;}
};
// Al salir del modo se limpia todo lo nuestro
const _salirModo5253=salirModo52;
salirModo52=function(){
  for(const l of [ARCOS53,FLECHAS53,GEMAS53,ALLAYS53])for(const o of l.splice(0))escena.remove(o.g||o.me||o.s);
  for(const id of ['accMZ53','brujula53'])document.getElementById(id)?.remove();
  document.body.classList.remove('modo53');guia53.visible=false;
  const r=_salirModo5253.apply(this,arguments);actualizarBarras53();return r;
};
for(const id of ['btnSalirTitulo','btnMuerteTitulo']){const b=document.getElementById(id);if(b)b.onclick=()=>salirAlTitulo();}
{const st=document.createElement('style');st.textContent=`
body.modo53 #barra{display:none}
#toast53{position:fixed;left:50%;bottom:136px;transform:translateX(-50%);z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:5px}
#toast53 .t53{background:rgba(12,14,22,.82);border-left:3px solid #fff;border-radius:6px;padding:5px 12px;color:#eee;font:13px system-ui,sans-serif;transition:opacity .4s;box-shadow:0 3px 10px rgba(0,0,0,.35);animation:entra53 .25s ease-out}
#toast53 .t53 b{margin-right:8px;letter-spacing:.5px}
@keyframes entra53{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
.hud53{background:linear-gradient(180deg,rgba(18,16,26,.82),rgba(10,10,16,.72));border:1px solid rgba(255,216,74,.28);box-shadow:0 4px 16px rgba(0,0,0,.4)}
.hud53 #mapa53{display:block;margin-top:6px;border:1px solid rgba(255,255,255,.15);border-radius:6px;image-rendering:pixelated}
.hud53 .vid53{display:flex;gap:3px;margin:2px 0 3px}
.hud53 .c53{width:14px;height:13px;background:#e33;clip-path:path('M7 13 L1 6.5 A3.2 3.2 0 0 1 7 2.5 A3.2 3.2 0 0 1 13 6.5 Z');display:inline-block}
.hud53 .c53.no{background:#444}
.acc53{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:5;display:flex;gap:7px;pointer-events:none}
.acc53 .r53{position:relative;width:58px;height:58px;border:2px solid #888;border-radius:10px;background:linear-gradient(180deg,rgba(40,38,52,.9),rgba(16,16,24,.9));overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.45)}
.acc53 .r53.no{opacity:.45}
.acc53 .ic53{position:absolute;left:0;right:0;top:7px;text-align:center;font-size:24px}
.acc53 em{position:absolute;inset:0;border-radius:8px}
.acc53 s{position:absolute;left:0;right:0;top:14px;text-align:center;font:bold 18px system-ui;color:#fff;text-decoration:none;text-shadow:0 1px 3px #000}
.acc53 b{position:absolute;left:4px;top:1px;font:bold 11px monospace;color:#ffd84a}
.acc53 small{position:absolute;left:0;right:0;bottom:2px;text-align:center;font:9.5px system-ui;color:#ddd;white-space:nowrap}
#brujula53{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;background:rgba(12,12,20,.7);border:1px solid rgba(196,76,255,.5);border-radius:20px;padding:4px 14px 4px 8px;color:#eee;font:13px system-ui;display:flex;align-items:center;gap:8px}
#brujula53 i{font-style:normal;color:#d080ff;font-size:20px;display:inline-block;transition:transform .12s}
@media (max-width:700px){.acc53 .r53{width:46px;height:46px}.acc53 .ic53{font-size:18px;top:5px}.acc53 small{display:none}.hud53 #mapa53{width:100px;height:100px}#toast53{bottom:120px}}`;document.head.appendChild(st);}
