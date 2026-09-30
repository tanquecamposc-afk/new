"use strict";
/* =========================================================
   Estructuras que faltaban (según la guía de estructuras):
   roca del bosque, geodas de amatista, fósiles, ruinas
   oceánicas, tesoro enterrado, sótano del iglú, mansión del
   bosque (con vindicadores y evocadores) y bastión en ruinas
   en el Nether (con piglins brutos y oro).
   ========================================================= */
const TABLAS27={
  tesoroEnterrado:[[663,1,1,20],[I.lingoteHierro,1,4,20],[I.lingoteOro,1,4,10],[I.esmeralda,4,8,10],[I.diamante,1,2,5],[B.tnt,1,2,5],[615,2,4,10],[617,2,4,10],[I.pocionRara||502,1,1,5]],
  ruinasOceano:[[I.carbon,1,4,10],[I.trigo,2,3,10],[I.esmeralda,1,1,8],[I.lingoteOro,1,3,6],[655,1,1,5],[546,1,1,5],[613,1,1,5],[662,1,1,3],[431,1,1,3]],
  mansion:[[I.lingoteHierro,1,4,15],[I.lingoteOro,1,4,10],[I.carbon,1,4,10],[I.diamante,1,2,4],[546,1,1,10],[I.manzanaDorada,1,1,4],[I.redstone,1,4,10],[I.cuerda,1,4,10],[I.pan,1,4,12],[668,1,1,2],[669,1,1,2]],
  bastion:[[I.lingoteOro,2,8,20],[B.bloqueOro,1,2,6],[534,1,2,6],[533,1,1,3],[611,1,1,5],[I.flecha,5,17,10],[207,2,6,10],[I.diamante,1,2,3],[B.piedraNegra,5,15,8],[I.cuerda,2,6,6]],
  igluSotano:[[I.manzanaDorada,1,1,15],[I.carbon,1,4,15],[I.manzana,1,3,15],[I.trigo,2,3,10],[I.pepitaOro,1,3,10],[I.carnePodrida,1,4,10],[I.esmeralda,1,1,5]],
};
const _generarBotinE27=generarBotin;
generarBotin=function(tipo,rnd){
  const t=TABLAS27[tipo]; if(!t)return _generarBotinE27(tipo,rnd);
  const cofre=new Array(27).fill(null), total=t.reduce((a,e)=>a+e[3],0);
  for(let i=0,n=4+Math.floor(rnd()*5);i<n;i++){let r=rnd()*total,e=t[0];for(const x of t){r-=x[3];if(r<=0){e=x;break;}}
    const p=crearPila(e[0],e[1]+Math.floor(rnd()*(e[2]-e[1]+1)));if(p.id===546)p.enc=libroAleatorio(rnd);if(ITEMS[e[0]]&&ITEMS[e[0]].dur)p.dur=Math.max(1,Math.floor(p.dur*(.2+rnd()*.7)));cofre[Math.floor(rnd()*27)]=p;}
  return cofre;
};

/* ---------- Estructuras pequeñas (dentro de un chunk) ---------- */
function estructuras27(ch,info){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla+27000;
  const P=(x,y,z,b)=>{if(x>=0&&x<CX&&z>=0&&z<CZ&&y>0&&y<CY)datos[idx(x,y,z)]=b;};
  const G=(x,y,z)=>x>=0&&x<CX&&z>=0&&z<CZ&&y>0&&y<CY?datos[idx(x,y,z)]:0;
  const cofre=(x,y,z,t)=>{P(x,y,z,B.cofre);registrarCofre(DIMS.superficie,bx+x,y,bz+z,t);};
  const centro=info[8*CX+8], hC=centro.h, bio=centro.bioma;
  const r=mulberry32(Math.floor(hash2(cx,cz,s)*4294967296));
  // Roca del bosque: montones de roca musgosa en la taiga
  if((bio===BIOMA.taiga||bio===BIOMA.taigaNevada)&&r()<.12){
    const x0=3+Math.floor(r()*10),z0=3+Math.floor(r()*10),h=info[z0*CX+x0].h;
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<=2;dy++)if(dx*dx+dz*dz+dy*dy*1.4<=4.5+r())P(x0+dx,h+dy,z0+dz,r()<.75?B.rocaMusgo:B.roca);
  }
  // Geoda de amatista bajo tierra
  if(hash2(cx,cz,s+1)<.035){
    const cy=OY+14+Math.floor(hash2(cx,cz,s+2)*40);
    if(cy<hC-10)for(let x=2;x<=13;x++)for(let z=2;z<=13;z++)for(let y=cy-6;y<=cy+6;y++){
      const d=Math.hypot(x-7.5,(y-cy)*1.1,z-7.5)+(hash3(bx+x,y,bz+z,s+3)-.5)*.6;
      if(d>5.6)continue;
      if(d>5)P(x,y,z,B.basaltoLiso);else if(d>4.2)P(x,y,z,B.calcita);else if(d>3.4)P(x,y,z,hash3(bx+x,y,bz+z,s+4)<.1?B.amatistaBrotante:B.bloqueAmatista);
      else{const h=hash3(bx+x,y,bz+z,s+5);P(x,y,z,d>2.6&&h<.18?[B.racimoAmatista,B.broteAmatistaGrande,B.broteAmatistaMediano,B.broteAmatistaPequeno][Math.floor(h*22)%4]:0);}
    }
  }
  // Fósiles en el desierto y el pantano
  if((bio===BIOMA.desierto||bio===BIOMA.pantano)&&hash2(cx,cz,s+6)<.03){
    const y0=hC-10-Math.floor(r()*8), eje=r()<.5, largo=6+Math.floor(r()*4);
    for(let k=0;k<largo;k++){const x=eje?4+k:8,z=eje?8:4+k;P(x,y0,z,B.bloqueHueso);
      if(k%2===0)for(let a=1;a<=3;a++){const ox=eje?0:a,oz=eje?a:0;P(x+ox,y0+Math.min(a,2),z+oz,B.bloqueHueso);P(x-ox,y0+Math.min(a,2),z-oz,B.bloqueHueso);}
      if(r()<.12)P(x,y0-1,z,B.menaCarbon);}
  }
  // Tesoro enterrado en la playa
  if(bio===BIOMA.playa&&hash2(cx,cz,s+7)<.05){const x=4+Math.floor(r()*8),z=4+Math.floor(r()*8),h=info[z*CX+x].h;
    for(let y=h-3;y<=h;y++)if(G(x,y,z))P(x,y,z,B.arena); cofre(x,h-2,z,'tesoroEnterrado');}
  // Ruinas oceánicas
  if(esOceano(bio)&&hash2(cx,cz,s+8)<.04){
    const calida=bio===BIOMA.oceanoCalido, x0=3,z0=3,w=5+Math.floor(r()*4),p=5+Math.floor(r()*4);
    let fondo=hC; while(fondo>2&&(esAgua(G(8,fondo,8))||!G(8,fondo,8)))fondo--;
    const mat=()=>calida?(r()<.7?B.arenisca:B.areniscaCortada||B.arenisca):(r()<.5?B.ladrillosPiedra:r()<.5?B.ladrillosMusgo:B.ladrillosAgrietados||B.rocaMusgo);
    for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+p;z++){P(x,fondo,z,mat());const borde=x===x0||x===x0+w-1||z===z0||z===z0+p-1;
      if(borde)for(let y=fondo+1;y<=fondo+3;y++)if(r()<.62-(y-fondo)*.12)P(x,y,z,mat());}
    if(r()<.7)cofre(x0+1,fondo+1,z0+1,'ruinasOceano');
    for(let k=0;k<6;k++){const x=Math.floor(r()*16),z=Math.floor(r()*16);let y=hC;while(y>2&&(esAgua(G(x,y,z))||!G(x,y,z)))y--;if(esAgua(G(x,y+1,z)))P(x,y+1,z,calida?B['coral_'+['tubo','cerebro','burbuja','fuego','cuerno'][k%5]]:B.alga);}
  }
  // Sótano del iglú (la mitad de los iglús)
  if(bio===BIOMA.nevado&&hash2(cx,cz,semilla+9900)<.035&&hC>NIVEL_MAR&&hash2(cx,cz,s+9)<.5&&G(9,hC+1,9)===B.cama){
    const fondo=hC-9;
    for(let y=fondo+1;y<=hC;y++){P(7,y,7,0);P(7,y,6,B.piedra);P(8,y,7,B.escaleraMano+2);}
    for(let x=3;x<=12;x++)for(let z=3;z<=12;z++)for(let y=fondo-4;y<=fondo;y++){const borde=x===3||x===12||z===3||z===12||y===fondo-4||y===fondo;
      P(x,y,z,borde?(r()<.3?B.rocaMusgo:B.ladrillosPiedra):0);}
    P(7,fondo,7,0);
    P(5,fondo-3,5,B.soporte); cofre(9,fondo-3,5,'igluSotano'); P(6,fondo-3,9,B.antorcha); P(10,fondo-3,9,B.antorcha);
    for(const x0 of [4,9])for(let x=x0;x<=x0+2;x++)for(let y=fondo-3;y<=fondo-1;y++)P(x,y,11,B.valla);
  }
}

/* ---------- Mansión del bosque (varios chunks) ---------- */
const MANS_W=32, MANS_P=24;
function mansionEn(rx,rz){
  const s=semilla+27500; if(hash2(rx,rz,s)>.5)return null;
  const x=rx*480+80+Math.floor(hash2(rx,rz,s+1)*320), z=rz*480+80+Math.floor(hash2(rx,rz,s+2)*320);
  const inf=infoColumna(x+16,z+12); if(inf.bioma!==BIOMA.bosqueOscuro||inf.h<=NIVEL_MAR)return null;
  return {x,z,y:inf.h+1};
}
function mansionesCerca(x,z){const rx=Math.floor(x/480),rz=Math.floor(z/480),res=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const m=mansionEn(rx+a,rz+b);if(m)res.push(m);}return res;}
function bloqueMansion(lx,y,lz,M,cofres){
  const y0=M.y, rel=y-y0;
  if(rel<0)return y>=y0-4?B.roca:-1;
  const piso=Math.floor(rel/6), ry=rel%6;
  if(piso>=3){ // tejado escalonado
    const L=rel-18; if(L>6)return -1;
    const bordeX=Math.min(lx,MANS_W-1-lx), bordeZ=Math.min(lz,MANS_P-1-lz), m=Math.min(bordeX,bordeZ);
    if(m<L)return -1; if(m===L||L===6)return B.tablonesRobleOscuro; return 0;}
  const perim=lx===0||lx===MANS_W-1||lz===0||lz===MANS_P-1;
  if(ry===0)return piso===0?B.roca:B.tablonesRobleOscuro;
  if(perim){
    const esquina=(lx%6===0||lx===MANS_W-1)&&(lz%6===0||lz===MANS_P-1);
    if(esquina)return B.troncoRobleOscuro;
    if(piso===0&&lz===0&&(lx===15||lx===16)&&ry<=3)return 0;           // puerta
    if((ry===2||ry===3)&&((lx%6===3)||(lz%6===3)))return B.panel;
    return piso===0?B.roca:B.tablonesRobleOscuro;
  }
  // Tabiques con puertas
  if((lx===10||lx===21)&&!(lz%8===4&&ry<=2))return ry===5?B.tablonesRobleOscuro:B.tablonesRobleOscuro;
  if(lz===12&&!(lx%10===5&&ry<=2))return B.tablonesRobleOscuro;
  if(ry===1){
    if(piso===1&&lx>10&&lx<21)return ALFOMBRA[14]||0;
    if(piso===2&&lz<12&&lx<10&&(lx+lz)%7===0)return B.estanteria;
    const h=hash3(M.x+lx,y,M.z+lz,semilla+27501);
    if(h<.012){cofres.push([lx,y,lz]);return B.cofre;}
    if(h<.03)return B.antorcha;
  }
  return 0;
}
function estampaMansiones(ch){
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  for(const M of mansionesCerca(bx+8,bz+8)){
    if(bx+CX<=M.x||bx>=M.x+MANS_W||bz+CZ<=M.z||bz>=M.z+MANS_P)continue;
    const cofresM=[];
    for(let x=Math.max(bx,M.x);x<Math.min(bx+CX,M.x+MANS_W);x++)for(let z=Math.max(bz,M.z);z<Math.min(bz+CZ,M.z+MANS_P);z++)
      for(let y=M.y-4;y<=M.y+25&&y<CY;y++){const b=bloqueMansion(x-M.x,y,z-M.z,M,cofresM);if(b>=0)ch.datos[idx(x-bx,y,z-bz)]=b;}
    for(const [lx,y,lz] of cofresM)registrarCofre(DIMS.superficie,M.x+lx,y,M.z+lz,'mansion');
  }
}

/* ---------- Bastión en ruinas (Nether, varios chunks) ---------- */
const BAST=26;
function bastionEn(rx,rz){const s=semilla+27600; if(hash2(rx,rz,s)>.45)return null;
  return {x:rx*240+60+Math.floor(hash2(rx,rz,s+1)*120),z:rz*240+60+Math.floor(hash2(rx,rz,s+2)*120),y:OY+36};}
function bastionesCerca(x,z){const rx=Math.floor(x/240),rz=Math.floor(z/240),res=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const m=bastionEn(rx+a,rz+b);if(m)res.push(m);}return res;}
function bloqueBastion(lx,y,lz,Bs,cofres){
  const rel=y-Bs.y, h=hash3(Bs.x+lx,y,Bs.z+lz,semilla+27601);
  if(rel<-3||rel>16)return -1;
  if(rel<0)return B.piedraNegra;
  const perim=lx===0||lx===BAST-1||lz===0||lz===BAST-1, dentroPatio=lx>7&&lx<18&&lz>7&&lz<18;
  if(rel===0)return dentroPatio&&lx>10&&lx<15&&lz>10&&lz<15?(h<.5?B.bloqueOro:B.piedraNegra):B.piedraNegra;
  if(perim){if(h<.08&&rel>6)return 0;return rel%5===0?B.basalto:B.piedraNegra;}
  if(rel===6||rel===11){if(dentroPatio)return 0;return h<.05?0:B.piedraNegra;}   // pisos con huecos (en ruinas)
  if((lx===7||lx===18||lz===7||lz===18)&&!((lx===12||lx===13||lz===12||lz===13)&&(rel%6)<4))return rel>11&&h<.3?0:B.piedraNegra;
  if(dentroPatio&&rel===1&&lx===12&&lz===12){cofres.push([lx,y,lz]);return B.cofre;}
  if(rel===1&&!dentroPatio&&h<.01){cofres.push([lx,y,lz]);return B.cofre;}
  if(rel===1&&dentroPatio&&h<.1)return B.bloqueOro;
  if(rel===7&&!dentroPatio&&h<.02)return B.lava;
  return 0;
}
function estampaBastiones(ch){
  const bx=ch.cx*CX,bz=ch.cz*CZ;
  for(const Bs of bastionesCerca(bx+8,bz+8)){
    if(bx+CX<=Bs.x||bx>=Bs.x+BAST||bz+CZ<=Bs.z||bz>=Bs.z+BAST)continue;
    const cf=[];
    for(let x=Math.max(bx,Bs.x);x<Math.min(bx+CX,Bs.x+BAST);x++)for(let z=Math.max(bz,Bs.z);z<Math.min(bz+CZ,Bs.z+BAST);z++)
      for(let y=Bs.y-3;y<=Bs.y+16;y++){const b=bloqueBastion(x-Bs.x,y,z-Bs.z,Bs,cf);if(b>=0)ch.datos[idx(x-bx,y,z-bz)]=b;}
    for(const [lx,y,lz] of cf)registrarCofre(DIMS.nether,Bs.x+lx,y,Bs.z+lz,'bastion');
  }
}

/* ---------- Enganches con la generación ---------- */
const _estructurasCompletoE27=estructurasCompleto;
estructurasCompleto=function(ch,info){_estructurasCompletoE27(ch,info);estructuras27(ch,info);estampaMansiones(ch);};
const _estructurasNetherE27=estructurasNether;
estructurasNether=function(ch){_estructurasNetherE27(ch);estampaBastiones(ch);};

/* ---------- Habitantes: illagers en la mansión y piglins brutos en el bastión ---------- */
function aparicionEstructuras27(x,z){
  if(Math.random()>.35)return false;
  if(dim===DIMS.superficie){
    for(const M of mansionesCerca(x,z)){if(x<M.x+1||x>M.x+MANS_W-2||z<M.z+1||z>M.z+MANS_P-2)continue;
      const piso=Math.floor(Math.random()*3), y=M.y+piso*6+1;
      if(getBloque(x,y,z)||getBloque(x,y+1,z))continue;
      const nv=contar(m=>m.tipo==='vindicador'&&Math.hypot(m.pos.x-M.x-16,m.pos.z-M.z-12)<30), ne=contar(m=>m.tipo==='evocador'&&Math.hypot(m.pos.x-M.x-16,m.pos.z-M.z-12)<30);
      if(ne<2&&Math.random()<.3){const m=crearMob('evocador',x+.5,y,z+.5);m.origen.set(M.x+16,y,M.z+12);return true;}
      if(nv<6){const m=crearMob('vindicador',x+.5,y,z+.5);m.origen.set(M.x+16,y,M.z+12);return true;}
    }
  }else if(dim===DIMS.nether){
    for(const Bs of bastionesCerca(x,z)){if(x<Bs.x+1||x>Bs.x+BAST-2||z<Bs.z+1||z>Bs.z+BAST-2)continue;
      const y=Bs.y+1+[0,6,11][Math.floor(Math.random()*3)];
      if(getBloque(x,y,z)||getBloque(x,y+1,z))continue;
      if(contar(m=>m.tipo==='piglinBruto')<4){const m=crearMob('piglinBruto',x+.5,y,z+.5);m.origen.set(Bs.x+13,y,Bs.z+13);return true;}}
  }
  return false;
}
const _aparicionFinalE27=aparicionFinal;
aparicionFinal=function(x,z){if(aparicionEstructuras27(x,z))return true;return _aparicionFinalE27(x,z);};
const _intentoAparicionE27=intentoAparicion;
intentoAparicion=function(){
  if(dim===DIMS.nether&&Math.random()<.25){const j=jugador.pos,a=Math.random()*Math.PI*2,d=10+Math.random()*24;
    const x=Math.floor(j.x+Math.cos(a)*d),z=Math.floor(j.z+Math.sin(a)*d);if(aparicionEstructuras27(x,z))return;}
  return _intentoAparicionE27();
};
// /locate mansion y /locate bastion
const _ejecutarComandoE27=ejecutarComando;
ejecutarComando=function(t){
  const a=t.replace(/^\//,'').trim().split(/\s+/);
  if(a[0]==='locate'&&(a[1]==='mansion'||a[1]==='mansión'||a[1]==='bastion'||a[1]==='bastión')){
    const bast=/^bast/.test(a[1]), j=jugador.pos; let mejor=null,d=1e9;
    const rango=bast?240:480;
    for(let rx=Math.floor(j.x/rango)-3;rx<=Math.floor(j.x/rango)+3;rx++)for(let rz=Math.floor(j.z/rango)-3;rz<=Math.floor(j.z/rango)+3;rz++){
      const m=bast?bastionEn(rx,rz):mansionEn(rx,rz);if(!m)continue;const e=Math.hypot(m.x-j.x,m.z-j.z);if(e<d){d=e;mejor=m;}}
    mostrarMensaje(mejor?`${bast?'Bastión':'Mansión del bosque'} más cercano: ${mejor.x+13} ${mejor.y-OY} ${mejor.z+12} (a ${Math.round(d)} bloques)`:'No hay ninguno cerca.');
    return;
  }
  return _ejecutarComandoE27(t);
};
