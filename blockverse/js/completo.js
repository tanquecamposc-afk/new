"use strict";
/* =========================================================
   Inventario completo, encantamientos nuevos, animaciones,
   huevos de aparición, pestañas del modo creativo y
   estructuras: minas abandonadas, iglús, templos de la
   jungla, cabañas de bruja, puestos de avanzada y naufragios.
   ========================================================= */
const NO_MUERTOS=new Set(['zombi','esqueleto','piglin','warden']);

/* ---------- Efectos de los encantamientos ---------- */
function aplicarEspinas(){
  let niv=0; for(let i=36;i<40;i++)niv=Math.max(niv,nivelEnc(inv[i],'espinas'));
  if(!niv||!prob(.15*niv))return;
  let m=null,md=3.5; for(const o of mobs){const d=o.pos.distanceTo(jugador.pos);if(!o.muerto&&d<md){md=d;m=o;}}
  if(m){herirMob(m,azar(1,4),null,'espinas');emitirParticulas(m.pos.x,m.pos.y+m.alto*.6,m.pos.z,0x3a8a2a,6,1.5,.4,4);}
}
function ataqueBarrido(obj,dano,nivel){
  const d=1+dano*(nivel/(nivel+1));
  let alguno=false;
  for(const m of mobs){if(m===obj||m.muerto||m.def.tipo==='pasivo'&&!nivel)continue;
    if(m.pos.distanceTo(obj.pos)<1.8&&Math.abs(m.pos.y-jugador.pos.y)<1.5){
      const dx=m.pos.x-jugador.pos.x,dz=m.pos.z-jugador.pos.z,l=Math.hypot(dx,dz)||1;herirMob(m,d,{x:dx/l*.4,z:dz/l*.4},'jugador');alguno=true;}}
  if(alguno||nivel){camara.getWorldDirection(dirVista);
    for(let k=-3;k<=3;k++){const a=Math.atan2(dirVista.x,dirVista.z)+k*.22;
      emitirParticulas(jugador.pos.x+Math.sin(a)*1.6,jugador.pos.y+1.1,jugador.pos.z+Math.cos(a)*1.6,0xf0f0f0,1,.2,.25,0);}
    sonar('golpe',null,.4);}
}
function repararConXP(valor){
  const cand=[inv[ranura],...inv.slice(36,40)].filter(p=>p&&nivelEnc(p,'reparacion')&&ITEMS[p.id].dur&&p.dur<ITEMS[p.id].dur);
  if(!cand.length)return valor;
  const p=cand[Math.floor(Math.random()*cand.length)], max=ITEMS[p.id].dur, rep=Math.min(max-p.dur,valor*2);
  p.dur+=rep; actualizarHUD();
  return valor-Math.ceil(rep/2);
}
const hieloTemporal=new Map(); let heladoT=0;
function pasoHelado(dt){
  heladoT-=dt; if(heladoT>0)return; heladoT=.15;
  for(const [k,v] of hieloTemporal){v.t-=.15;if(v.t<=0){hieloTemporal.delete(k);if(getBloque(v.x,v.y,v.z)===B.hielo)setBloque(v.x,v.y,v.z,B.agua);}}
  const n=nivelEnc(inv[39],'pasoHelado'); if(!n||!jugador.suelo||jugador.enAgua)return;
  const r=2+n, x0=Math.floor(jugador.pos.x), y=Math.floor(jugador.pos.y-.1)-1+1-1, z0=Math.floor(jugador.pos.z);
  const yy=Math.floor(jugador.pos.y)-1;
  for(let x=x0-r;x<=x0+r;x++)for(let z=z0-r;z<=z0+r;z++){
    if(Math.hypot(x-x0,z-z0)>r)continue;
    if(getBloque(x,yy,z)===B.agua&&!getBloque(x,yy+1,z)){setBloque(x,yy,z,B.hielo);hieloTemporal.set(clavePos(x,yy,z),{x,y:yy,z,t:4+Math.random()*4});}
  }
}
function libroAleatorio(rnd){
  const ks=Object.keys(ENCANTOS).filter(k=>!ENCANTOS[k].maldicion||rnd()<.15);
  const k=ks[Math.floor(rnd()*ks.length)];
  return {[k]:1+Math.floor(rnd()*ENCANTOS[k].max)};
}

/* ---------- Animaciones extra de las criaturas ---------- */
function animarMobExtra(m,dt,sp,dist3){
  // Respiración cuando están quietas
  if(sp<.2&&!m.def.vuela)m.grupo.position.y+=Math.sin(tiempoJuego*2.2+m.origen.x)*.01;
  // Balanceo del cuerpo al caminar
  if(!m.def.vuela&&m.piernas.length>=4)m.grupo.rotation.z=Math.sin(m.fase*2)*.035*Math.min(1,sp);
  // Inclinación al recibir un golpe
  if(m.flash>0)m.grupo.rotation.x=-m.flash*.5; else m.grupo.rotation.x*=.8;
  // Mira a su alrededor cuando no hay nadie cerca
  const cab=m.extra.cabeza;
  if(cab&&(dist3>=10||m.huir>0)&&m.tipo!=='ghast'&&m.tipo!=='blaze'&&m.tipo!=='ghastFeliz'){
    m.miraT=(m.miraT||Math.random()*3)-dt;
    if(m.miraT<=0){m.miraT=2+Math.random()*4;m.miraY=Math.random()<.4?0:(Math.random()-.5)*1.4;m.miraX=Math.random()<.2?.45:(Math.random()-.5)*.3;}
    cab.rotation.y+=((m.miraY||0)-cab.rotation.y)*Math.min(1,dt*3);
    cab.rotation.x+=((m.miraX||0)-cab.rotation.x)*Math.min(1,dt*3);
  }
}

/* ---------- Saqueadores ---------- */
Object.assign(DEF_MOB,{saqueador:{vida:24,ancho:.3,alto:1.95,vel:2.4,tipo:'hostil',ia:'arquero',xp:[5,5],sonido:'aldeano',
  suelta:b=>[[I.flecha,azar(0,2+b)],[I.esmeralda,prob(.2)?1:0]]}});
NOMBRE_MOB.saqueador='Saqueador';
MODELOS_EXTRA.saqueador=({pon,parte,humanoide,extra})=>{
  humanoide(0x8a8f8f,0x3a3a44,0x2a2a30,0x8a8f8f);
  pon(parte(.12,.24,.1,0x707575),0,1.66,.28);
  pon(parte(.3,.07,.02,0x202020),0,1.84,.26);pon(parte(.08,.06,.025,0x9ad0e0),-.12,1.78,.26);pon(parte(.08,.06,.025,0x9ad0e0),.12,1.78,.26);
  extra.arco=pon(parte(.5,.06,.06,0x6a4a2a),.3,1.1,.4);
};

/* ---------- Estructuras ---------- */
function estructurasCompleto(ch,info){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla;
  minaAbandonada(ch);
  const centro=info[8*CX+8], hC=centro.h, bio=centro.bioma;
  const P=(x,y,z,b)=>{if(x>=0&&x<CX&&z>=0&&z<CZ&&y>0&&y<CY)datos[idx(x,y,z)]=b;};
  const cofre=(x,y,z,t)=>{P(x,y,z,B.cofre);registrarCofre(DIMS.superficie,bx+x,y,bz+z,t);};
  const plano=()=>{let mn=999,mx=0;for(let z=3;z<13;z++)for(let x=3;x<13;x++){const h=info[z*CX+x].h;mn=Math.min(mn,h);mx=Math.max(mx,h);}return mx-mn<=3;};
  // Iglú
  if(bio===BIOMA.nevado&&hash2(cx,cz,s+9900)<.035&&hC>NIVEL_MAR&&plano()){
    for(let x=3;x<=12;x++)for(let z=3;z<=12;z++){const dx=x-7.5,dz=z-7.5;
      for(let y=hC-2;y<=hC;y++)P(x,y,z,B.bloqueNieve);
      for(let y=hC+1;y<=hC+5;y++){const d=Math.hypot(dx,dz,(y-hC-.5)*1.1);if(d<=4.6&&d>3.5)P(x,y,z,B.bloqueNieve);else if(d<=3.5)P(x,y,z,0);}}
    for(let y=hC+1;y<=hC+2;y++){P(7,y,3,0);P(7,y,4,0);}
    P(9,hC+1,9,B.cama);P(5,hC+1,9,B.mesa);P(9,hC+1,6,B.horno);P(5,hC+1,6,B.antorcha);
    for(let x=6;x<=9;x++)for(let z=6;z<=9;z++)if(!datos[idx(x,hC+1,z)])P(x,hC+1,z,ALFOMBRA[0]);
    cofre(6,hC+1,10,'iglu');
  }
  // Templo de la jungla
  else if(bio===BIOMA.jungla&&hash2(cx,cz,s+9910)<.008&&hC>NIVEL_MAR){
    const piedra=(x,y,z)=>hash3(bx+x,y,bz+z,s+9911)<.4?B.rocaMusgo:B.roca;
    for(let x=2;x<=13;x++)for(let z=1;z<=14;z++){
      for(let y=hC-3;y<=hC;y++)P(x,y,z,piedra(x,y,z));
      for(let y=hC+1;y<=hC+7;y++){const nivel=y-hC, m=nivel>4?2:0, dentro=x>2+m&&x<13-m&&z>1+m&&z<14-m;
        const borde=x===2+m||x===13-m||z===1+m||z===14-m;
        if(nivel>7)continue;
        if(x<2+m||x>13-m||z<1+m||z>14-m)continue;
        P(x,y,z,(borde||y===hC+4||y===hC+7)?piedra(x,y,z):0);}}
    for(let y=hC+1;y<=hC+3;y++){P(7,y,1,0);P(8,y,1,0);}
    for(let x=4;x<=11;x+=7)for(let y=hC+1;y<=hC+3;y++)P(x,y,7,B.ladrillosPiedra);
    cofre(4,hC+1,12,'templo'); cofre(11,hC+5,10,'templo');
    for(const [x,z] of [[5,4],[10,4]])P(x,hC+1,z,B.antorcha);
    for(let z=3;z<=11;z+=2)P(7,hC+1,z,B.escaleraRoca);
  }
  // Cabaña de bruja
  else if((bio===BIOMA.pantano||bio===BIOMA.manglar)&&hash2(cx,cz,s+9920)<.018){
    const base=Math.max(hC,NIVEL_MAR)+3;
    for(const [x,z] of [[5,5],[10,5],[5,10],[10,10]])for(let y=Math.min(hC,NIVEL_MAR)-1;y<base;y++)P(x,y,z,B.troncoAbeto);
    for(let x=5;x<=10;x++)for(let z=5;z<=10;z++){P(x,base,z,B.tablonesAbeto);
      const borde=x===5||x===10||z===5||z===10;
      for(let y=base+1;y<=base+3;y++)P(x,y,z,borde?((y===base+2&&(x===7||z===7))?B.panel:B.tablonesAbeto):0);
      P(x,base+4,z,B.losaAbeto);}
    for(let x=4;x<=11;x++){P(x,base+4,4,B.losaAbeto);P(x,base+4,11,B.losaAbeto);}
    for(let y=base+1;y<=base+2;y++)P(7,y,5,0);
    P(9,base+1,9,B.mesa);P(6,base+1,9,B.champinonRojo);P(9,base+1,6,B.farol);
    cofre(6,base+1,6,'bruja');
  }
  // Puesto de avanzada de los saqueadores
  else if([BIOMA.llanura,BIOMA.sabana,BIOMA.taiga,BIOMA.desierto].includes(bio)&&esPuestoAvanzada(cx,cz)&&plano()){
    const t=hC+1;
    for(let x=5;x<=10;x++)for(let z=5;z<=10;z++){
      const borde=x===5||x===10||z===5||z===10, esq=(x===5||x===10)&&(z===5||z===10);
      for(let y=hC-2;y<=hC;y++)P(x,y,z,B.roca);
      for(let y=t;y<=t+14;y++){
        if(y===t+5||y===t+10)P(x,y,z,B.tablonesAbeto);
        else if(y===t+14)P(x,y,z,borde?B.valla:0);
        else if(y===t+15)P(x,y,z,0);
        else if(esq)P(x,y,z,B.troncoAbeto);
        else if(borde)P(x,y,z,((y-t)%5===2&&(x===7||z===7))?0:B.tablonesAbeto);
        else P(x,y,z,0);}
      P(x,t+13,z,borde?B.tablonesAbeto:B.losaAbeto);
    }
    for(let y=t;y<=t+12;y++)P(9,y,6,146);
    P(7,t+5,7,0);P(9,t+5,6,146);P(9,t+10,6,146);
    cofre(6,t+11,9,'puesto'); P(8,t+11,8,B.farol);P(6,t+1,6,B.farol);
    for(let y=t;y<=t+2;y++)P(7,y,5,0);
  }
  // Barco naufragado
  else if((bio===BIOMA.playa||bio===BIOMA.oceano)&&hash2(cx,cz,s+9930)<.012&&hC<=NIVEL_MAR+1&&hC>NIVEL_MAR-14){
    const y0=hC+1, roto=hash2(cx,cz,s+9931)<.5, madera=[B.tablones,B.tablonesAbeto,B.tablonesJungla][Math.floor(hash2(cx,cz,s+9932)*3)];
    for(let x=1;x<=14;x++){const f=Math.min(x-1,14-x), ancho=Math.min(3,1+Math.floor(f/1.5));
      for(let z=8-ancho;z<=8+ancho;z++){
        if(roto&&x>10&&hash3(bx+x,0,bz+z,s+9933)<.6)continue;
        P(x,y0,z,madera);
        const borde=z===8-ancho||z===8+ancho;
        for(let y=y0+1;y<=y0+2;y++)if(borde&&!(roto&&hash3(bx+x,y,bz+z,s+9934)<.3))P(x,y,z,madera);else if(!borde)P(x,y,z,y<=NIVEL_MAR?B.agua:0);
        if(x>=3&&x<=12&&!borde)P(x,y0+3,z,x%3===0?0:madera);
      }}
    for(let y=y0+1;y<=y0+7;y++)P(7,y,8,B.troncoAbeto);
    cofre(3,y0+1,8,'naufragio'); cofre(11,y0+1,8,'naufragio');
  }
}
const _puestos=new Map();
function esPuestoAvanzada(cx,cz){
  const k=cx+','+cz; if(_puestos.has(k))return _puestos.get(k);
  const r=hash2(cx,cz,semilla+9940)<.004; _puestos.set(k,r); return r;
}
function puestosCerca(x,z){
  const cx0=Math.floor(x/CX),cz0=Math.floor(z/CZ),res=[];
  for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++)if(esPuestoAvanzada(cx0+a,cz0+b)){
    const inf=infoColumna((cx0+a)*CX+8,(cz0+b)*CZ+8);
    if([BIOMA.llanura,BIOMA.sabana,BIOMA.taiga,BIOMA.desierto].includes(inf.bioma))res.push({x:(cx0+a)*CX+8,z:(cz0+b)*CZ+8,y:inf.h+1});}
  return res;
}
// Minas abandonadas: pasillos en rejilla por regiones de 5×5 chunks
function minaAbandonada(ch){
  const {datos,cx,cz}=ch, s=semilla, rx=Math.floor(cx/5), rz=Math.floor(cz/5);
  if(hash2(rx,rz,s+9950)>.22)return;
  const Y=OY-8+Math.floor(hash2(rx,rz,s+9951)*36), bx=cx*CX, bz=cz*CZ;
  const P=(x,y,z,b)=>{if(x>=0&&x<CX&&z>=0&&z<CZ&&y>0&&y<CY)datos[idx(x,y,z)]=b;};
  const conX=hash2(cx,cz,s+9952)<.75, conZ=hash2(cx,cz,s+9953)<.75;
  const pasillo=(eje)=>{
    for(let u=0;u<16;u++){
      for(let v=7;v<=9;v++){
        const x=eje?u:v, z=eje?v:u;
        for(let y=Y;y<=Y+2;y++)P(x,y,z,0);
        const suelo=datos[idx(x,Y-1,z)]; if(!suelo||esLiquido(suelo))P(x,Y-1,z,B.tablones);
        if(v===8&&(eje?Math.abs(z-8):Math.abs(x-8))===0&&u!==8&&hash3(bx+x,Y,bz+z,s+9954)<.7)P(x,Y,z,eje?1261:1260);
        if(hash3(bx+x,Y+2,bz+z,s+9955)<.05&&v!==8)P(x,Y+2,z,B.telarana);
      }
      if(u%4===2){
        const [a,b]=eje?[[u,7],[u,9]]:[[7,u],[9,u]];
        for(let y=Y;y<=Y+1;y++){P(a[0],y,a[1],B.valla);P(b[0],y,b[1],B.valla);}
        for(let v=7;v<=9;v++)P(eje?u:v,Y+2,eje?v:u,B.tablones);
        if(hash3(bx+u,Y,bz,s+9956)<.12)P(eje?u:8,Y+1,eje?8:u,B.antorcha);
      }
    }
  };
  if(conX)pasillo(true);
  if(conZ)pasillo(false);
  if((conX||conZ)&&hash2(cx,cz,s+9957)<.3){const x=conX?4:9,z=conX?9:4;P(x,Y,z,B.cofre);registrarCofre(DIMS.superficie,bx+x,Y,bz+z,'mina');}
}

/* ---------- Huevos de aparición ---------- */
function usarDerechoCompleto(p,id,it){
  if(it&&it.huevo&&apuntado){
    const q=posColocar(); if(!q)return true;
    const m=crearMob(it.huevo,q[0]+.5,q[1]+(DEF_MOB[it.huevo].vuela?1:0),q[2]+.5,{tam:1});
    emitirParticulas(q[0]+.5,q[1]+.5,q[2]+.5,0xffffff,10,1.5,.6,0);
    if(supervivencia())consumirEnMano(); balancearMano(); return true;
  }
  return false;
}
function aparicionCompleto(x,z){
  if(Math.random()>.12)return false;
  const ps=puestosCerca(x,z).filter(p=>Math.hypot(p.x-x,p.z-z)<40);
  if(!ps.length)return false;
  const p=ps[0];
  if(contar(m=>m.tipo==='saqueador'&&Math.hypot(m.pos.x-p.x,m.pos.z-p.z)<50)>=5)return false;
  const ox=p.x+azar(-12,12),oz=p.z+azar(-12,12),oy=buscarSuelo(ox,p.y+20,oz,30,2);
  if(oy>0){const m=crearMob('saqueador',ox+.5,oy,oz+.5);m.origen.set(p.x,oy,p.z);return true;}
  return false;
}

/* ---------- Pestañas del modo creativo ---------- */
function categoriaItem(id){
  const it=ITEMS[id], b=BLOQUES[id];
  if(it.huevo)return 'huevos';
  if(it.herr&&it.herr.tipo==='espada'||it.tipoHerr==='arco'||id===I.flecha||it.tipoHerr==='maza'||it.armadura||it.pocion&&it.pocion.arrojadiza||id===538)return 'combate';
  if(it.herr||it.tipoHerr||id===I.cubo||id===I.cuboAgua||id===I.cuboLava||id===528||id===542||id===520||id===521||id===545||id===523)return 'herramientas';
  if(it.comida||it.bebida)return 'comida';
  if(it.bloque){
    if(b.redstone||b.piston||b.cabezaPiston||b.riel||id===B.tnt)return 'redstone';
    if(b.inter||id===B.farol||id===B.antorcha||id===B.cama||id===B.cofre||id===B.escaleraMano)return 'utiles';
    if(/lana_|hormigon_|vidrio_|alfombra_|terracota/.test(b.clave)||id===B.lana)return 'colores';
    if(b.forma==='cruz'||esHojas(id)||esTronco(id)||[B.tierra,B.cesped,B.arena,B.grava,B.arcilla,B.barro,B.nieve,B.bloqueNieve,B.hielo,B.cactus,B.calabaza,B.sandia,B.musgoPalido,B.sculk].includes(id)||/mena|^p[A-Z]/.test(b.clave))return 'naturaleza';
    return 'construccion';
  }
  return 'ingredientes';
}
const PESTANAS=[['todo','★','Todo'],['construccion','🧱','Construcción'],['colores','🎨','Colores'],['naturaleza','🌿','Naturaleza'],['utiles','🛠','Útiles'],
  ['redstone','⚡','Redstone'],['herramientas','⛏','Herramientas'],['combate','⚔','Combate'],['comida','🍖','Comida'],['ingredientes','💎','Ingredientes'],['huevos','🥚','Huevos']];
(function crearPestanas(){
  for(const [d] of celdasPaleta){d.dataset.cat=categoriaItem(+d.dataset.id);}
  const barra=document.createElement('div'); barra.id='pestanas';
  barra.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-top:10px';
  for(const [k,ic,nom] of PESTANAS){
    const b=document.createElement('button'); b.textContent=ic; b.dataset.tip=nom; b.dataset.k=k;
    b.style.cssText='width:auto;margin:0;padding:6px 10px;font-size:15px';
    b.onmousedown=e=>{e.preventDefault();pestanaPaleta=k;document.getElementById('buscarPaleta').value='';filtrarPaleta('');
      for(const o of barra.children)o.style.outline=o.dataset.k===k?'2px solid #fff':'';};
    barra.appendChild(b);
  }
  barra.firstChild.style.outline='2px solid #fff';
  rejillaPaleta.parentNode.insertBefore(barra,rejillaPaleta);
})();

/* ---------- Bucle ---------- */
function actualizarCompleto(dt){pasoHelado(dt);}
