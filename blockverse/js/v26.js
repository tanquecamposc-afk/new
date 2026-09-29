"use strict";
/* =========================================================
   Edición 26: saqueadores con ballesta, vindicadores,
   patrullas con capitán, Mal presagio e invasiones de
   aldeas por oleadas; pirámide del desierto al estilo del
   original y ciudades del End con más salas y estandartes.
   ========================================================= */
Object.assign(SND,{
  cuerno:v=>{tonoSnd(140,130,1.4,'sawtooth',.09*v);tonoSnd(210,196,1.4,'sawtooth',.05*v);},
  victoria:v=>{[523,659,784,1046].forEach((f,i)=>tonoSnd(f,f,.25,'triangle',.1*v,i*.14));},
  vindicador:v=>tonoSnd(220,150,.3,'sawtooth',.06*v),
});
Object.assign(NOMBRE_EFECTO,{malPresagio:'Mal presagio',heroe:'Héroe de la aldea'});
Object.assign(COLOR_EFECTO,{malPresagio:'#0b6138',heroe:'#44ff44'});

/* ---------- Saqueador con ballesta y capitán con estandarte ---------- */
function estandarteIllager(parte,g,y){
  const palo=parte(.06,1.6,.06,0x6a4a2a);palo.position.set(0,y+.4,-.3);g.add(palo);
  const tela=parte(.5,.9,.03,0xf0f0f0,false,null);tela.position.set(0,y+.55,-.36);g.add(tela);
  for(const [w,h,px,py,c] of [[.34,.12,0,.78,0x3a3a3a],[.08,.08,-.1,.66,0x111111],[.08,.08,.1,.66,0x111111],[.3,.06,0,.5,0x2a2a2a],[.2,.18,0,.28,0x888888],[.5,.05,0,.95,0x3a3a3a]]){
    const q=parte(w,h,.02,c,false,null);q.position.set(px,y+py,-.38);g.add(q);}
}
MODELOS_EXTRA.saqueador=({g,pon,parte,humanoide,extra,opc})=>{
  humanoide(0x8a8f8f,0x3a3a44,0x2a2a30,0x8a8f8f);
  pon(parte(.12,.24,.1,0x707575),0,1.66,.28);
  pon(parte(.3,.07,.02,0x202020),0,1.84,.26);pon(parte(.08,.06,.025,0x9ad0e0),-.12,1.78,.26);pon(parte(.08,.06,.025,0x9ad0e0),.12,1.78,.26);
  // Ballesta: culata de madera y arco de hierro atravesado
  extra.arco=pon(parte(.08,.08,.46,0x5a3a1a),.3,1.1,.34);
  pon(parte(.56,.05,.06,0x9a9aa4),.3,1.12,.55); pon(parte(.02,.02,.5,0xdddddd),.3,1.12,.54);
  if(opc.capitan)estandarteIllager(parte,g,1.6);
};
DEF_MOB.saqueador.suelta=b=>[[I.flecha,azar(0,2+b)],[I.esmeralda,prob(.2)?1:0]];
DEF_MOB.vindicador={vida:24,ancho:.3,alto:1.95,vel:3.4,tipo:'hostil',dano:9,xp:[5,5],sonido:'vindicador',
  suelta:b=>[[I.esmeralda,azar(0,1+b)],[302,prob(.085)?1:0]]};
NOMBRE_MOB.vindicador='Vindicador';
MODELOS_EXTRA.vindicador=({g,pon,parte,humanoide,extra,opc})=>{
  humanoide(0x8a8f8f,0x2a3a3c,0x222226,0x8a8f8f);
  pon(parte(.12,.24,.1,0x707575),0,1.66,.28);
  pon(parte(.32,.07,.02,0x151515),0,1.85,.26);pon(parte(.08,.06,.025,0x3a2a2a),-.12,1.78,.26);pon(parte(.08,.06,.025,0x3a2a2a),.12,1.78,.26);
  pon(parte(.54,.5,.3,0x1f2d2f),0,1.0,0);                                             // abrigo largo
  extra.hacha=pon(parte(.05,.6,.05,0x6a4a2a),.36,.95,.32); pon(parte(.05,.22,.2,0xb8b8c0),.36,1.18,.42);
  if(opc.capitan)estandarteIllager(parte,g,1.6);
};

// Marcar quién golpea a cada criatura (para saber si el jugador mató al capitán)
const _herirMobV26=herirMob;
herirMob=function(m,d,dir,fuente,empuje){if(m&&(fuente==='jugador'||fuente==='flechaJugador'))m.porJugador=tiempoJuego;return _herirMobV26(m,d,dir,fuente,empuje);};
const _alMorirV26=alMorirMob;
alMorirMob=function(m){
  if(m.capitan&&m.porJugador&&tiempoJuego-m.porJugador<5&&supervivencia()){
    efectoJugador('malPresagio',6000); sonar('cuerno'); mostrarMensaje('Tienes el Mal presagio: si entras en una aldea empezará una invasión.');}
  if(invasion&&m.invasion)setTimeout(actualizarBarraInvasion,0);
  return _alMorirV26(m);
};
function crearIllager(tipo,x,y,z,capitan){
  const m=crearMob(tipo,x,y,z,{capitan});
  m.capitan=!!capitan; return m;
}

/* ---------- Patrullas: un capitán y sus saqueadores ---------- */
let patrullaT=60;
function aparicionPatrulla(x,z){
  if(patrullaT>0||dim!==DIMS.superficie||(mundoEstado&&mundoEstado.oneBlock))return false;
  const inf=infoColumna(x,z); if(esOceano(inf.bioma)||inf.bioma===BIOMA.rio)return false;
  if(Math.hypot(x-jugador.pos.x,z-jugador.pos.z)<24)return false;
  patrullaT=300+Math.random()*300;
  if(Math.random()>.5)return false;
  const y=buscarSuelo(x,inf.h+6,z,20,2); if(y<0)return false;
  const n=azar(2,4);
  for(let k=0;k<n;k++){const ox=x+azar(-2,2),oz=z+azar(-2,2),oy=buscarSuelo(ox,y+4,oz,10,2);
    if(oy>0)crearIllager(k===1&&Math.random()<.4?'vindicador':'saqueador',ox+.5,oy,oz+.5,k===0);}
  return true;
}
const _aparicionFinalV26=aparicionFinal;
aparicionFinal=function(x,z){if(aparicionPatrulla(x,z))return true;return _aparicionFinalV26(x,z);};
// En los puestos de avanzada aparecen también vindicadores y un capitán
const _aparicionCompletoV26=aparicionCompleto;
aparicionCompleto=function(x,z){
  const antes=mobs.length, r=_aparicionCompletoV26(x,z);
  if(r&&mobs.length>antes){const m=mobs[mobs.length-1];
    if(m.tipo==='saqueador'){
      if(!mobs.some(o=>o.capitan&&o.pos.distanceTo(m.pos)<40)&&Math.random()<.5){const c=crearIllager('saqueador',m.pos.x,m.pos.y,m.pos.z,true);c.origen.copy(m.origen);quitarMob(m);}
      else if(Math.random()<.3){const v=crearIllager('vindicador',m.pos.x,m.pos.y,m.pos.z,false);v.origen.copy(m.origen);quitarMob(m);}
    }}
  return r;
};

/* ---------- Invasiones ---------- */
let invasion=null, invasionT=0;
const barraInv=document.createElement('div');
barraInv.className='oculto';
barraInv.style.cssText='position:fixed;left:50%;top:8px;transform:translateX(-50%);width:min(440px,calc(100vw - 32px));text-align:center;pointer-events:none;font:15px var(--pixel,sans-serif);color:#fff;text-shadow:2px 2px 0 #3f3f3f;z-index:2;';
barraInv.innerHTML='<div id="invTexto">Invasión</div><div style="height:10px;margin-top:3px;background:#2a2a2a;border:2px solid #000"><i id="invBarra" style="display:block;height:100%;width:100%;background:#c23030"></i></div>';
document.body.appendChild(barraInv);
function vivosInvasion(){return invasion?invasion.mobs.filter(m=>!m.muerto&&mobs.includes(m)):[];}
function actualizarBarraInvasion(){
  if(!invasion){barraInv.classList.add('oculto');return;}
  const v=vivosInvasion().length;
  barraInv.classList.toggle('oculto',estado==='menu');
  document.getElementById('invTexto').textContent=invasion.espera>0?`Invasión · Oleada ${invasion.ola+1}/${invasion.olas} en camino`:`Invasión · Oleada ${invasion.ola}/${invasion.olas} · ${v} enemigos`;
  document.getElementById('invBarra').style.width=(invasion.espera>0?100:Math.max(3,v/Math.max(1,invasion.total)*100))+'%';
}
function empezarInvasion(al){
  const nivel=efectos.malPresagio?efectos.malPresagio.n||1:1;
  delete efectos.malPresagio;
  invasion={x:al.x,z:al.z,y:al.y,ola:0,olas:3+Math.min(2,nivel-1),mobs:[],total:1,espera:4};
  sonar('cuerno'); mostrarMensaje('¡Una invasión se acerca a la aldea!');
}
function lanzarOla(){
  const inv=invasion; inv.ola++; inv.mobs=[];
  const a=Math.random()*Math.PI*2, cx=Math.round(inv.x+Math.cos(a)*28), cz=Math.round(inv.z+Math.sin(a)*28);
  const n=3+inv.ola*2;
  for(let k=0;k<n;k++){
    const x=cx+azar(-3,3), z=cz+azar(-3,3), y=buscarSuelo(x,inv.y+30,z,60,2); if(y<0)continue;
    const tipo=k%3===2?'vindicador':'saqueador';
    const m=crearIllager(tipo,x+.5,y,z+.5,inv.ola===inv.olas&&k===0);
    m.invasion=true; m.enfadado=9999; m.origen.set(inv.x,inv.y,inv.z); inv.mobs.push(m);
  }
  inv.total=Math.max(1,inv.mobs.length); sonar('cuerno');
}
function actualizarInvasion(dt){
  invasionT-=dt; if(invasionT>0)return; invasionT=.5;
  patrullaT-=.5;
  if(dim!==DIMS.superficie||estado!=='jugando'){actualizarBarraInvasion();return;}
  // El Mal presagio despierta una invasión al entrar en una aldea
  if(!invasion&&efectos.malPresagio){
    const al=aldeasCerca(jugador.pos.x,jugador.pos.z).find(a=>Math.hypot(a.x-jugador.pos.x,a.z-jugador.pos.z)<48);
    if(al)empezarInvasion(al);
  }
  if(!invasion){actualizarBarraInvasion();return;}
  const inv=invasion;
  if(Math.hypot(inv.x-jugador.pos.x,inv.z-jugador.pos.z)>140){mostrarMensaje('La invasión ha terminado: te alejaste de la aldea.');invasion=null;actualizarBarraInvasion();return;}
  if(inv.espera>0){inv.espera-=.5;if(inv.espera<=0)lanzarOla();}
  else if(!vivosInvasion().length){
    if(inv.ola>=inv.olas){
      sonar('victoria'); efectoJugador('heroe',2400); mostrarMensaje('¡Victoria! Has salvado la aldea. Eres el Héroe de la aldea.');
      for(let k=0;k<3+inv.olas;k++)soltarItem(crearPila(I.esmeralda,azar(1,3)),jugador.pos.x,jugador.pos.y+1,jugador.pos.z,true);
      invasion=null;
    }else inv.espera=6;
  }
  actualizarBarraInvasion();
}
const _actualizarFinalV26=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalV26(dt);actualizarInvasion(dt);};

/* ---------- Pirámide del desierto (21x21, varios chunks) ---------- */
const _cachePir=new Map();
function piramideEnRegion(rx,rz){
  const k=rx+','+rz+':'+semilla; if(_cachePir.has(k))return _cachePir.get(k);
  let res=null;
  if(hash2(rx,rz,semilla+9810)<.5){
    const x=rx*256+30+Math.floor(hash2(rx,rz,semilla+9811)*190), z=rz*256+30+Math.floor(hash2(rx,rz,semilla+9812)*190);
    let ok=true, hs=[];
    for(const [dx,dz] of [[10,10],[0,0],[20,0],[0,20],[20,20]]){const inf=infoColumna(x+dx,z+dz);if(inf.bioma!==BIOMA.desierto)ok=false;hs.push(inf.h);}
    if(ok&&Math.max(...hs)-Math.min(...hs)<=4)res={x,z,y:hs[0]};
  }
  _cachePir.set(k,res); return res;
}
function piramidesCerca(x,z){const rx=Math.floor(x/256),rz=Math.floor(z/256),r=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const p=piramideEnRegion(rx+a,rz+b);if(p)r.push(p);}return r;}
function bloquePiramide(dx,y,dz,h){
  // dx,dz: 0..20 · h: suelo · devuelve un bloque, 0 para aire o -1 para no tocar
  const A=B.arenisca, C=B.areniscaCortada||B.arenisca, N=B.terracota0, Z=HORMIGON[11], R=h-14;
  const ry=y-h;
  // Torres de la fachada (esquinas delanteras)
  const torre=(dz<=4)&&(dx<=4||dx>=16);
  if(torre){const tx=dx<=4?dx:dx-16, borde=tx===0||tx===4||dz===0||dz===4;
    if(ry<0&&ry>=-4)return A;
    if(ry>=0&&ry<=12){
      if(ry===12)return borde&&((tx+dz)%2===0)?B.losaArenisca||C:(borde?0:C);
      if(!borde)return ry===0?A:0;
      if(dz===0&&tx===2&&ry>=6&&ry<=10)return ry===8?Z:N;          // franja naranja con rombo azul
      if(dz===0&&(tx===1||tx===3)&&ry===8)return N;
      if(ry===11||ry===5)return C;
      if(dz===4&&tx===2&&ry>=1&&ry<=2&&dx<=4)return 0;                // paso hacia el interior
      if(dz===4&&tx===2&&ry>=1&&ry<=2)return 0;
      return A;}
    return -1;}
  // Cuerpo escalonado
  if(ry<0&&ry>=-4)return A;
  if(ry>=0&&ry<=10){
    const L=ry, dentro=dx>=L&&dx<=20-L&&dz>=L&&dz<=20-L;
    if(!dentro)return -1;
    const borde=dx===L||dx===20-L||dz===L||dz===20-L;
    if(L===0){ // suelo: estrella de terracota en el centro y agujero al tesoro
      if(dx===10&&dz===10)return 0;
      const ax=Math.abs(dx-10),az=Math.abs(dz-10);
      if(ax+az<=1)return Z; if((ax===0||az===0)&&ax+az<=3)return N; if(ax===az&&ax<=2)return N;
      return A;}
    if(borde){
      // Entrada de la fachada (tres de ancho, tres de alto)
      if(dz===L&&dx>=9&&dx<=11&&ry>=1&&ry<=3)return 0;
      if(dz===L&&(dx===8||dx===12)&&ry<=4)return N;
      if(dz===L&&dx>=8&&dx<=12&&ry===4)return C;
      // Entradas laterales pequeñas
      if((dx===L||dx===20-L)&&dz>=9&&dz<=11&&ry>=1&&ry<=2&&L===1)return 0;
      return L%3===2?C:A;}
    // Interior hueco con columnas
    if(ry<=4&&(dx===6||dx===14)&&(dz===6||dz===14))return C;
    return 0;}
  // Pozo y sala del tesoro
  if(y<h&&y>R+4&&dx===10&&dz===10)return 0;
  if(y>=R-2&&y<=R+4&&dx>=6&&dx<=14&&dz>=6&&dz<=14){
    const borde=dx===6||dx===14||dz===6||dz===14;
    if(y===R-1&&dx>=9&&dx<=11&&dz>=9&&dz<=11)return B.tnt;
    if(y<=R||y===R+4)return y===R?((Math.abs(dx-10)+Math.abs(dz-10))%3===0?N:A):A;
    if(borde)return (y===R+2&&(dx===10||dz===10))?N:C;
    if(y===R+1&&dx===10&&dz===10)return B.placa;
    if(y===R+1&&((dx===10&&(dz===7||dz===13))||(dz===10&&(dx===7||dx===13))))return B.cofre;
    return 0;}
  return -1;
}
function construirPiramides(ch){
  if(ch.dim!==DIMS.superficie||(mundoEstado&&mundoEstado.oneBlock))return;
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  for(const p of piramidesCerca(bx+8,bz+8)){
    if(p.x>bx+CX||p.x+20<bx||p.z>bz+CZ||p.z+20<bz)continue;
    for(let lx=0;lx<CX;lx++)for(let lz=0;lz<CZ;lz++){
      const dx=bx+lx-p.x, dz=bz+lz-p.z; if(dx<0||dx>20||dz<0||dz>20)continue;
      for(let y=p.y-20;y<=p.y+13;y++){if(y<1||y>=CY)continue;
        const b=bloquePiramide(dx,y,dz,p.y); if(b<0)continue;
        ch.datos[idx(lx,y,lz)]=b;
        if(b===B.cofre)registrarCofre(DIMS.superficie,bx+lx,y,bz+lz,'piramide');}
      // Arena sospechosa en el suelo del interior
      if(dx>=3&&dx<=17&&dz>=6&&dz<=17&&hash2(bx+lx,bz+lz,semilla+9813)<.05&&ch.datos[idx(lx,p.y,lz)]===B.arenisca)ch.datos[idx(lx,p.y,lz)]=B.arenaSospechosa;
    }
  }
}
piramide=function(){};   // la pirámide pequeña de antes se sustituye por la nueva
const _estructurasCompletoV26=estructurasCompleto;
estructurasCompleto=function(ch,info){_estructurasCompletoV26(ch,info);construirPiramides(ch);};

/* ---------- Ciudades del End: segunda rama con sala colgante y estandartes ---------- */
const _construirCiudadEndV26=construirCiudadEnd;
construirCiudadEnd=function(ch){
  _construirCiudadEndV26(ch);
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  for(const c of ciudadesCerca(ch.cx,ch.cz)){
    const pon=(x,y,z,b)=>{const lx=x-bx,lz=z-bz;if(lx<0||lx>=CX||lz<0||lz>=CZ||y<1||y>=CY)return;ch.datos[idx(lx,y,lz)]=b;
      if(b===B.cofre)registrarCofre(DIMS.end,x,y,z,'ciudadEnd');};
    const D=datosCiudadEnd(c), t=D.t, r=3, y0=c.y+4, VM=VIDRIO_COLOR[10], MAG=LANA_COLOR[2];
    const ym2=Math.min(t-4,y0+5*Math.max(2,Math.floor(c.alto/7)));
    // Puente hacia el norte (−Z)
    for(let z=c.z-r-10;z<=c.z-r;z++)for(let x=c.x-1;x<=c.x+1;x++){pon(x,ym2,z,B.purpur);if(Math.abs(x-c.x)===1)pon(x,ym2+1,z,B.ladrillosEnd);}
    for(let y=ym2+1;y<=ym2+2;y++)pon(c.x,y,c.z-r,0);
    // Sala ancha colgante
    const sz=c.z-r-14;
    for(let x=c.x-3;x<=c.x+3;x++)for(let z=sz-3;z<=sz+3;z++)for(let y=ym2;y<=ym2+5;y++){
      const borde=Math.abs(x-c.x)===3||Math.abs(z-sz)===3, techo=y===ym2+5, suelo=y===ym2;
      pon(x,y,z,suelo?((x+z)&1?B.ladrillosEnd:B.purpur):techo||borde?((Math.abs(x-c.x)===3&&Math.abs(z-sz)===3)?B.pilarPurpur:B.purpur):0);}
    for(let k=-1;k<=1;k++){pon(c.x+k,ym2+2,sz-3,VM);pon(c.x+k,ym2+3,sz-3,VM);pon(c.x-3,ym2+2,sz+k,VM);pon(c.x+3,ym2+2,sz+k,VM);}
    for(let y=ym2+1;y<=ym2+2;y++)pon(c.x,y,sz+3,0);
    pon(c.x+2,ym2+1,sz-2,B.cofre); pon(c.x-2,ym2+1,sz-2,B.varaEnd);
    // Estandartes magenta colgando de la sala y de la sala superior
    for(const [x,z] of [[c.x-3,sz-4],[c.x+3,sz-4],[c.x-4,sz],[c.x+4,sz]])for(let y=ym2+1;y<=ym2+3;y++)pon(x,y,z,y===ym2+1?B.lanaNegra||MAG:MAG);
    for(const [x,z] of [[c.x-6,c.z],[c.x+6,c.z],[c.x,c.z+6]])for(let y=t+2;y<=t+4;y++)pon(x,y,z,y===t+2?LANA_COLOR[15]:MAG);
    for(let y=ym2-3;y<ym2;y++)pon(c.x,y,sz,B.varaEnd);
  }
};
