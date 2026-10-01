"use strict";
/* =========================================================
   BED WARS 2.0 (inspirado en el Bed Wars de Hypixel)
   · 8 equipos (Solos y Dúos) o 4 (Tríos, Cuartetos y 4×1),
     con islas decoradas: plataforma de aparición, cama de dos
     bloques de su color, generador vallado, casetas de la
     TIENDA y las MEJORAS, cofre de equipo, farolas y árboles.
   · Cuatro mapas con su ambiente: Jardín, Invierno, Infierno
     y Desierto (o uno al azar).
   · Sala de espera de cristal con cuenta atrás.
   · Bloques de diamante y esmeralda girando sobre los
     generadores, con holograma del nivel y la cuenta atrás.
   · Compra rápida y objetos nuevos: torre compacta, chinche,
     defensor de los sueños y leche mágica.
   · Bots con nombre de jugador que hablan, protegen su cama
     con lana y terracota, lanzan bolas de fuego y empujan.
   · Niveles con estrellas [N✫], estadísticas guardadas, chat
     de colores, marcador como el original, fuegos
     artificiales al ganar y avisos de equipo eliminado.
   ========================================================= */
const EQUIPOS_TODOS_BW=[
  {nombre:'Rojo',letra:'R',lana:'rojo',col:'#ff5555',hex:0xd03030},
  {nombre:'Azul',letra:'A',lana:'azul',col:'#5577ff',hex:0x3050d0},
  {nombre:'Verde',letra:'V',lana:'lima',col:'#55ff55',hex:0x40b040},
  {nombre:'Amarillo',letra:'Am',lana:'amarillo',col:'#ffff55',hex:0xe0c020},
  {nombre:'Aguamarina',letra:'Ag',lana:'cian',col:'#55ffff',hex:0x30b0b0},
  {nombre:'Blanco',letra:'B',lana:'blanco',col:'#ffffff',hex:0xe8e8e8},
  {nombre:'Rosa',letra:'Ro',lana:'rosa',col:'#ff77dd',hex:0xe070b0},
  {nombre:'Gris',letra:'G',lana:'gris',col:'#aaaaaa',hex:0x707070},
];
const TEMAS_BW={
  jardin:{nombre:'Jardín',sup:'cesped',sub:'tierra',roca:'piedra',deco:'arbol',medio:'ladrillosPiedra',luz:'farol',hora:.25},
  invierno:{nombre:'Invierno',sup:'bloqueNieve',sub:'hieloCompacto',roca:'piedra',deco:'abeto',medio:'hieloCompacto',luz:'farol',hora:.3},
  infierno:{nombre:'Infierno',sup:'netherrack',sub:'netherrack',roca:'piedraNegra',deco:'hongo',medio:'ladrilloNether',luz:'piedraLuminosa',hora:.47},
  desierto:{nombre:'Desierto',sup:'arena',sub:'arenisca',roca:'arenisca',deco:'cactus',medio:'areniscaCortada',luz:'farol',hora:.22},
};
let TEMA_BW=TEMAS_BW.jardin, ultimaOpcBW={equipos:8,porEquipo:1,tema:'azar',dificultad:'normal'};
const NOMBRES_BOT_BW=['xXProGamerXx','NoobMaster69','Pepito_PvP','ElRusherYT','Camila_BW','DarkSoul','MrClutch','Tryhard77','LaBestia','SrPuentes','NinjaKid','ChoriPan','ZeroLag','Bedbreaker','Kiwi_Craft','Zorrito','ElPanaMiguel','Luna_Pixel','Toby2010','CapitanCama','Wachin_PE','MegaBuilder','FrostByte','Rayo_Mc'];
Object.assign(SND,{
  killBW:v=>{tonoSnd(1568,1568,.09,'square',.06*v);tonoSnd(2093,2093,.12,'square',.05*v,.07);},
  cuentaBW:v=>tonoSnd(880,880,.12,'square',.05*v),
  inicioBW:v=>{tonoSnd(392,392,.25,'sawtooth',.06*v);tonoSnd(523,523,.25,'sawtooth',.06*v,.12);tonoSnd(784,784,.5,'sawtooth',.06*v,.24);},
  victoriaBW:v=>{[523,659,784,1047,784,1047].forEach((f,i)=>tonoSnd(f,f,.22,'triangle',.08*v,i*.16));},
  derrotaBW:v=>{[392,349,311,262].forEach((f,i)=>tonoSnd(f,f*.98,.3,'triangle',.07*v,i*.22));},
  fuegoArtificial:v=>{ruidoSnd(.5,1800,.25*v,'highpass');tonoSnd(200,1200,.3,'sine',.04*v);},
});

/* ---------- Equipos y mapa ---------- */
function prepararEquiposBW(n){
  const R=n===8?62:48; EQUIPOS_BW.length=0;
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n-Math.PI/2;EQUIPOS_BW.push(Object.assign({id:i,isla:[Math.round(Math.cos(a)*R),Math.round(Math.sin(a)*R)]},EQUIPOS_TODOS_BW[i]));}
}
construirMapaBW=function(){
  const T=TEMA_BW, M=new Map(), pon=(x,y,z,b)=>{if(b)M.set(clBW(x,y,z),b);}, K=k=>B[k]||B.piedra;
  const gens=[], camas=[], tiendas=[], cofres=[];
  const n=EQUIPOS_BW.length;
  // Árboles y decoración según el mapa
  const decorar=(x,z,tipo,s)=>{const y=BW_Y+1;
    if(tipo==='arbol'){for(let k=0;k<4;k++)pon(x,y+k,z,B.tronco);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=2;dy<=4;dy++)if(Math.abs(dx)+Math.abs(dz)+(dy===4?2:0)<=3&&!(dx===0&&dz===0&&dy<4))pon(x+dx,y+dy,z+dz,B.hojas);pon(x,y+5,z,B.hojas);}
    else if(tipo==='abeto'){for(let k=0;k<5;k++)pon(x,y+k,z,B.troncoAbeto);for(let dy=1;dy<=5;dy++){const r=dy<3?2:dy<5?1:0;for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.abs(dx)+Math.abs(dz)<=r&&(dx||dz))pon(x+dx,y+dy,z+dz,B.hojasAbeto);}pon(x,y+5,z,B.hojasAbeto);pon(x,y+6,z,B.capaNieve||B.hojasAbeto);}
    else if(tipo==='hongo'){for(let k=0;k<4;k++)pon(x,y+k,z,B.talloCarmesi);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)+Math.abs(dz)<=3)pon(x+dx,y+4,z+dz,B.verrugaBloque);pon(x,y+5,z,B.verrugaBloque);pon(x+1,y+3,z,B.luzHongo);}
    else if(tipo==='cactus'){for(let k=0;k<3;k++)pon(x,y+k,z,B.cactus);pon(x+1,y,z+1,B.arbustoSeco||B.cactus);}
  };
  const farola=(x,z)=>{if(T.luz==='piedraLuminosa'){pon(x,BW_Y,z,B.piedraLuminosa);return;}pon(x,BW_Y+1,z,B.valla);pon(x,BW_Y+2,z,B.valla);pon(x,BW_Y+3,z,B.farol||B.antorcha);};
  for(const E of EQUIPOS_BW){
    const [cx,cz]=E.isla, ux=-cx, uz=-cz, f=Math.abs(ux)>=Math.abs(uz)?[Math.sign(ux),0]:[0,Math.sign(uz)], sd=[-f[1],f[0]];
    const W=(a,b)=>[cx+a*f[0]+b*sd[0],cz+a*f[1]+b*sd[1]];
    const L=B['lana_'+E.lana], TC=B['terracota_'+E.lana]||L, rnd=mulberry32(E.id*977+4242);
    // Plataforma con los bordes redondeados y la parte de abajo colgando
    for(let a=-8;a<=8;a++)for(let b=-8;b<=8;b++){const d=Math.max(Math.abs(a),Math.abs(b));if(d>8||Math.abs(a)+Math.abs(b)>13)continue;const [x,z]=W(a,b);
      pon(x,BW_Y,z,K(T.sup));for(let k=1;k<=7;k++)if(d<=8-k+(rnd()<.45?1:0))pon(x,BW_Y-k,z,k<=2?K(T.sub):K(T.roca));}
    // Aparición: losa de lana del equipo con un anillo de terracota
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const [x,z]=W(a,b);pon(x,BW_Y,z,Math.max(Math.abs(a),Math.abs(b))===2?TC:L);}
    // Cama de dos bloques (cabecera mirando al centro) sobre terracota
    for(let a=3;a<=6;a++)for(let b=-1;b<=1;b++){const [x,z]=W(a,b);pon(x,BW_Y,z,TC);}
    const [hx,hz]=W(5,0),[px,pz]=W(4,0);
    pon(hx,BW_Y+1,hz,B['camaBW_'+E.lana+'_cab']||B.cama);pon(px,BW_Y+1,pz,B['camaBW_'+E.lana+'_pie']||B.cama);
    camas.push({equipo:E.id,x:hx,y:BW_Y+1,z:hz,x2:px,z2:pz});
    // Generador detrás, vallado
    const [gx,gz]=W(-5,0);
    for(let a=-6;a<=-4;a++)for(let b=-1;b<=1;b++){const [x,z]=W(a,b);pon(x,BW_Y,z,B.bloqueHierro);}
    for(const [a,b] of [[-7,-2],[-7,2],[-3,-2],[-3,2]]){const [x,z]=W(a,b);pon(x,BW_Y+1,z,B.valla);}
    for(const b of [-2,-1,1,2]){const [x,z]=W(-7,b);pon(x,BW_Y+1,z,B.valla);}
    gens.push({tipo:'equipo',equipo:E.id,x:gx+.5,y:BW_Y+1.2,z:gz+.5,tH:0,tO:0,tE:0});
    // Casetas de las tiendas con techo del color del equipo
    for(const [lado,tipo] of [[5,'objetos'],[-5,'mejoras']]){
      for(let a=-2;a<=0;a++)for(let b=lado-1;b<=lado+1;b++){const [x,z]=W(a,b);pon(x,BW_Y,z,B.tablones);pon(x,BW_Y+3,z,TC);}
      for(const [a,b] of [[-2,lado-1],[-2,lado+1],[0,lado-1],[0,lado+1]]){const [x,z]=W(a,b);pon(x,BW_Y+1,z,B.valla);pon(x,BW_Y+2,z,B.valla);}
      const [tx,tz]=W(-1,lado);tiendas.push({equipo:E.id,tipo,x:tx+.5,z:tz+.5});}
    // Cofre del equipo, farolas y decoración
    {const [x,z]=W(-3,3);pon(x,BW_Y+1,z,B.cofre);cofres.push([x,BW_Y+1,z]);}
    for(const [a,b] of [[2,4],[2,-4]]){const [x,z]=W(a,b);farola(x,z);}
    for(const [a,b] of [[-6,6],[-6,-6],[6,-6]]){const [x,z]=W(a,b);decorar(x,z,T.deco);}
    for(let k=0;k<10;k++){const a=Math.floor(rnd()*13)-6,b=Math.floor(rnd()*13)-6;if(Math.abs(a)<=2&&Math.abs(b)<=2||Math.abs(b)>=4&&a<=0&&a>=-2)continue;const [x,z]=W(a,b);
      if(M.has(clBW(x,BW_Y+1,z))||M.get(clBW(x,BW_Y,z))!==K(T.sup))continue;
      pon(x,BW_Y+1,z,T.deco==='arbol'?(rnd()<.5?B.florAmarilla:B.hierbaAlta):T.deco==='abeto'?B.capaNieve:T.deco==='hongo'?B.raicesCarmesi:B.arbustoSeco);}
  }
  // Islas de diamante
  for(let k=0;k<4;k++){const a=(k*90+(n===8?22.5:45))*Math.PI/180,R=n===8?38:30,cx=Math.round(Math.cos(a)*R),cz=Math.round(Math.sin(a)*R),rnd=mulberry32(k*31+777);
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){const d=Math.hypot(dx,dz);if(d>4.3)continue;pon(cx+dx,BW_Y,cz+dz,K(T.sup));for(let q=1;q<=4;q++)if(d<=4.3-q+rnd())pon(cx+dx,BW_Y-q,cz+dz,K(T.roca));}
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)pon(cx+dx,BW_Y,cz+dz,B.bloqueDiamante);
    pon(cx+3,BW_Y+1,cz,K(T.roca));pon(cx+3,BW_Y+2,cz,K(T.roca));pon(cx-3,BW_Y+1,cz+1,K(T.roca));
    gens.push({tipo:'diamante',x:cx+.5,y:BW_Y+1.2,z:cz+.5,t:0});}
  // Centro: dos alturas, generadores de esmeralda y un faro
  for(let dx=-12;dx<=12;dx++)for(let dz=-12;dz<=12;dz++){const d=Math.hypot(dx,dz);if(d>12.3)continue;
    pon(dx,BW_Y,dz,d<6?K(T.medio):K(T.sup));for(let q=1;q<=6;q++)if(d<=12.3-q*1.6)pon(dx,BW_Y-q,dz,K(T.roca));
    if(d<5.3)for(let q=1;q<=3;q++)pon(dx,BW_Y+q,dz,q===3?K(T.medio):K(T.roca));}
  pon(0,BW_Y+4,0,B.farolMarino||B.piedraLuminosa);for(let q=5;q<=7;q++)pon(0,BW_Y+q,0,B.vidrio);
  const esm=n===8?[[8,0],[-8,0],[0,8],[0,-8]]:[[8,0],[-8,0]];
  for(const [dx,dz] of esm){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)pon(dx+a,BW_Y,dz+b,B.bloqueEsmeralda);gens.push({tipo:'esmeralda',x:dx+.5,y:BW_Y+1.2,z:dz+.5,t:0});}
  // Sala de espera de cristal muy por encima del centro
  const LY=BW_Y+46;
  for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){const borde=Math.abs(dx)===6||Math.abs(dz)===6;
    pon(dx,LY,dz,borde?B.vidrio:((dx+dz)&1?B.piedraLisa||B.piedra:B.ladrillosPiedra));pon(dx,LY+5,dz,B.vidrio);
    if(borde)for(let q=1;q<=4;q++)pon(dx,LY+q,dz,B.vidrio);}
  for(const [dx,dz] of [[-5,-5],[5,-5],[-5,5],[5,5]])pon(dx,LY+1,dz,B.farol||B.antorcha);
  const porChunk=new Map();
  for(const [k,b] of M){const [x,y,z]=k.split(',').map(Number),ck=Math.floor(x/CX)+','+Math.floor(z/CZ);(porChunk.get(ck)||porChunk.set(ck,[]).get(ck)).push([x,y,z,b]);}
  return {porChunk,gens,camas,tiendas,cofres,sala:{x:.5,y:LY+1.01,z:.5}};
};

/* ---------- Inicio: tema, equipos, sala de espera y hologramas ---------- */
const _iniciarBedwars2=iniciarBedwars;
iniciarBedwars=function(opc={}){
  opc=Object.assign({},ultimaOpcBW,opc);
  const nEq=opc.equipos||(opc.porEquipo>=3?4:8);
  const clave=opc.tema&&opc.tema!=='azar'&&TEMAS_BW[opc.tema]?opc.tema:Object.keys(TEMAS_BW)[Math.floor(Math.random()*4)];
  TEMA_BW=TEMAS_BW[clave]; opc.temaReal=clave;
  ultimaOpcBW={equipos:nEq,porEquipo:opc.porEquipo,tema:opc.tema||'azar',dificultad:opc.dificultad||'normal'};
  prepararEquiposBW(nEq);
  // Limpiar restos de la partida anterior
  if(BW){for(const s of BW.carteles||[])escena.remove(s);for(const g of BW.gens||[])if(g.holo){escena.remove(g.holo);escena.remove(g.bloque);}}
  document.getElementById('bwFin')?.remove();
  _iniciarBedwars2(Object.assign({},opc,{equipos:nEq,tema:clave}));
  BW.tema=clave; BW.hora=TEMA_BW.hora; BW.eliminados=new Set(); BW.cola=[]; BW.aliados=[];
  BW.lobby=opc.sinSala?0:(typeof RED!=='undefined'&&RED.conectado?10:6);
  // Hologramas y bloques giratorios sobre los generadores del medio
  for(const g of BW.gens)if(g.tipo!=='equipo'){
    if(g.cartel){escena.remove(g.cartel);g.cartel=null;}
    const holo=cartelMultiBW(['',''],g.tipo==='diamante'?'#7ff':'#5f5');holo.position.set(g.x,g.y+2.9,g.z);escena.add(holo);g.holo=holo;
    const m=new THREE.Mesh(new THREE.BoxGeometry(.62,.62,.62),new THREE.MeshBasicMaterial({map:texTile(g.tipo==='diamante'?'diamondBlock':'emeraldBlock')}));
    m.position.set(g.x,g.y+1.9,g.z);escena.add(m);g.bloque=m;}
  // Nombres de jugador para los bots
  const usados=new Set();for(const m of BW.bots){let nm;do{nm=NOMBRES_BOT_BW[Math.floor(Math.random()*NOMBRES_BOT_BW.length)];}while(usados.has(nm)&&usados.size<NOMBRES_BOT_BW.length);usados.add(nm);renombrarBot(m,nm);}
  if(BW.lobby>0){const s=MAPA_BW.sala;jugador.pos.set(s.x,s.y,s.z);jugador.vel.set(0,0,0);jugador.maxY=s.y;}
  escribirChat(`Mapa: ${TEMA_BW.nombre} · ${nEq} equipos · ${BW.porEquipo>1?BW.porEquipo+' por equipo':'Solos'}`);
};
function renombrarBot(m,nm){
  m.bw.nombre=nm; const E=EQUIPOS_BW[m.bw.equipo];
  m.grupo.children.filter(o=>o.isSprite).forEach(o=>m.grupo.remove(o));
  const s=cartelTexto(`[${E.letra}] ${nm}`,E.col,360);s.scale.multiplyScalar(.75);s.position.set(0,2.45,0);m.grupo.add(s);
}
// Los bots que reaparecen conservan su nombre
const _crearBotBW2=crearBotBW;
crearBotBW=function(equipo,k,dif){const m=_crearBotBW2(equipo,k,dif);const prev=BW&&BW.nombresBots&&BW.nombresBots[equipo+':'+k];if(prev)renombrarBot(m,prev);return m;};
function cartelMultiBW(lineas,col){
  const c=document.createElement('canvas');c.width=320;c.height=40*lineas.length+8;
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));
  s.scale.set(320/48*.55,c.height/48*.55,1);s.userData={lienzo:c,col};escribirCartelBW(s,lineas);return s;
}
function escribirCartelBW(s,lineas){const c=s.userData.lienzo,x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.textAlign='center';x.textBaseline='middle';
  lineas.forEach((l,i)=>{x.font=i===0?'bold 30px monospace':'26px monospace';x.lineWidth=5;x.strokeStyle='rgba(0,0,0,.75)';x.strokeText(l,c.width/2,24+i*40);x.fillStyle=i===0?s.userData.col:i===1?'#ff5':'#fff';x.fillText(l,c.width/2,24+i*40);});
  s.material.map.needsUpdate=true;}

/* ---------- Bucle: sala de espera, hologramas, cola de construcción, aliados y avisos ---------- */
const _actualizarBW2=actualizarBW;
actualizarBW=function(dt){
  if(!BW||!BW.activo)return;
  tiempoDia=BW.hora??.25;
  if(BW.lobby>0){
    hambre=20;salud=20;
    const antes=Math.ceil(BW.lobby);BW.lobby-=dt;const ahora=Math.ceil(BW.lobby);
    if(ahora!==antes&&ahora>0){tituloBW('BED WARS',`Empieza en ${ahora}`,ahora<=3?'#ff5555':'#ffff55',1.1);sonar('cuentaBW');}
    if(jugador.pos.y<MAPA_BW.sala.y-3){const s=MAPA_BW.sala;jugador.pos.set(s.x,s.y,s.z);jugador.vel.set(0,0,0);}
    if(BW.lobby<=0){
      const E=EQUIPOS_BW[BW.yo.equipo]||EQUIPOS_BW[0];
      if(BW.yo.vivo&&!BW.yo.espectador){jugador.pos.set(E.isla[0]+.5,BW_Y+1.01,E.isla[1]+.5);jugador.vel.set(0,0,0);jugador.maxY=jugador.pos.y;}
      sonar('inicioBW');tituloBW('¡A JUGAR!','Protege tu cama y destruye las enemigas','#55ff55',3);
      escribirChat('▶ ¡La partida ha empezado! Compra con hierro y oro en la TIENDA; los diamantes son para las MEJORAS.');
      defensasInicialesBots();
    }
    if(BW.avisoT!==undefined&&(BW.avisoT-=dt)<=0){BW.avisoT=.5;pintarMarcadorBW();}
    return;
  }
  _actualizarBW2(dt);
  if(!BW.activo||BW.fin)return;
  // Hologramas y bloques que giran
  const nv=NIVEL_GEN();
  for(const g of BW.gens)if(g.bloque){g.bloque.rotation.y+=dt*1.8;g.bloque.position.y=g.y+1.9+Math.sin(tiempoJuego*2+g.x)*.12;
    if((g._h=(g._h||0)-dt)<=0){g._h=.5;const lv=g.tipo==='diamante'?nv.d:nv.e,iv=g.tipo==='diamante'?[30,23,15][lv]:[65,50,35][lv];
      escribirCartelBW(g.holo,[g.tipo==='diamante'?'Diamante':'Esmeralda',`Nivel ${['I','II','III'][lv]}`,`Aparece en ${Math.max(0,Math.ceil(iv-g.t))} s`]);}}
  // Bloques que se colocan poco a poco (defensas de los bots y torres compactas)
  for(let i=BW.cola.length-1;i>=0;i--){const q=BW.cola[i];q.t-=dt;if(q.t>0)continue;BW.cola.splice(i,1);
    if(!getBloque(q.x,q.y,q.z)||q.forzar){bwSet(q.x,q.y,q.z,q.b);BW.colocados.add(clBW(q.x,q.y,q.z));if(q.sonido)sonar('poner',{x:q.x,y:q.y,z:q.z},.5);}}
  // Aliados (chinches y defensores)
  for(let i=BW.aliados.length-1;i>=0;i--){const a=BW.aliados[i];a.bwVida-=dt;if(a.bwVida<=0||a.muerto){if(!a.muerto)quitarMob(a);BW.aliados.splice(i,1);}}
  // Reaparición con título grande y equipos eliminados
  if(estado==='muerto'&&BW.yo.espera>0)tituloBW('¡HAS MUERTO!',`Reapareces en ${Math.ceil(BW.yo.espera)} s`,'#ff5555',.6);
  for(const q of BW.equipos)if(!q.cama&&q.vivos<=0&&!(q.id===BW.yo.equipo&&BW.yo.vivo)&&!BW.eliminados.has(q.id)){BW.eliminados.add(q.id);
    escribirChat(`EQUIPO ELIMINADO > ¡El equipo ${EQUIPOS_BW[q.id].nombre} ha sido eliminado!`);}
  // Bots: bolas de fuego cuando atacan una cama protegida
  for(const m of BW.bots){const b=m.bw;if(b.estado!=='atacar'||b.objetivo==null||m.muerto)continue;b.fuegoT=(b.fuegoT??(8+Math.random()*12))-dt;
    const c=BW.camas.find(q=>q.equipo===b.objetivo);if(!c||!BW.equipos[b.objetivo].cama)continue;const d=Math.hypot(c.x-m.pos.x,c.z-m.pos.z);
    if(b.fuegoT<=0&&d<26&&d>6&&b.res.h>=40){b.fuegoT=18+Math.random()*10;b.res.h-=40;
      const o=new THREE.Vector3(m.pos.x,m.pos.y+1.5,m.pos.z),dir=new THREE.Vector3(c.x+.5,c.y+.5,c.z+.5).sub(o).normalize();
      const s=new THREE.Sprite(matSprite(714));s.scale.set(.6,.6,.6);agregarEnt({tipo:'bolaGhast',pos:o.addScaledVector(dir,.8),vel:dir.multiplyScalar(13),edad:0,malla:s,duenoMob:m});}}
};
const _iaBot2=IA_EXTRA.botBW;
IA_EXTRA.botBW=(m,dt,c)=>{if(BW&&BW.lobby>0){m.mover=false;return;}return _iaBot2(m,dt,c);};
// Los bots de cada equipo cubren su cama con lana y terracota al empezar
function defensasInicialesBots(){
  if(!BW||BW.cliente)return;
  for(const E of EQUIPOS_BW){
    if(!BW.bots.some(m=>m.bw.equipo===E.id))continue;
    if(E.id===BW.yo.equipo&&Math.random()<.5)continue;
    const c=BW.camas.find(q=>q.equipo===E.id), L=B['lana_'+E.lana], TC=B['terracota_'+E.lana]||L;
    const capas=[[1,L],[2,TC]], celdas=[[c.x,c.z],[c.x2,c.z2]];let t=1+Math.random()*2;
    for(const [r,blq] of capas)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)for(let dy=0;dy<=r;dy++){
      const x0=Math.min(c.x,c.x2),x1=Math.max(c.x,c.x2),z0=Math.min(c.z,c.z2),z1=Math.max(c.z,c.z2);
      for(const [bx,bz] of celdas){const x=bx+dx,z=bz+dz,y=c.y+dy;
        const dist=Math.max(Math.max(x0-x,x-x1,0),Math.max(z0-z,z-z1,0))+dy;
        if(dist!==r||(x>=x0&&x<=x1&&z>=z0&&z<=z1&&dy===0))continue;
        if(!BW.cola.some(q=>q.x===x&&q.y===y&&q.z===z))BW.cola.push({x,y,z,b:blq,t:t+=.06,sonido:Math.random()<.2});}}
  }
}

/* ---------- Tienda: compra rápida y objetos nuevos ---------- */
(function(){
  const util=TIENDA_BW.find(t=>t[0]==='Utilidad')[1];
  util.push({n:'Torre compacta',id:()=>716,c:1,p:[MH,24]},{n:'Chinche (lepisma aliada)',id:()=>719,c:1,p:[MH,24]},
    {n:'Defensor de los sueños (gólem)',id:()=>717,c:1,p:[MH,120]},{n:'Leche mágica (sin trampas 30 s)',id:()=>718,c:1,p:[MO,4]});
  const buscar=n=>{for(const [,l] of TIENDA_BW)for(const o of l)if(o.n===n)return o;};
  const rapida=['Lana','Espada de piedra','Armadura de cota (permanente)','Pico (mejora)','Tablones de roble','Piedra del End','Manzana dorada','Bola de fuego','Dinamita (se enciende sola)','Flechas','Arco','Torre compacta','Perla de ender','Espada de hierro','Armadura de hierro (permanente)','Huevo puente'].map(buscar).filter(Boolean);
  TIENDA_BW.unshift(['Compra rápida',rapida]);
})();
const _usarDerechoBW2=usarDerecho;
usarDerecho=function(){
  if(BW&&BW.activo&&!BW.yo.espectador){
    if(BW.lobby>0)return;
    const p=enMano();
    if(p&&p.id===716){construirTorre();consumirEnMano();cdUso=.5;return;}
    if(p&&p.id===717){const d=new THREE.Vector3();camara.getWorldDirection(d);invocarAliado('golem',jugador.pos.x+d.x*2,jugador.pos.y,jugador.pos.z+d.z*2,240,'Defensor de los sueños');consumirEnMano();sonar('golemHierro',null,.8);cdUso=.5;return;}
    if(p&&p.id===718){BW.yo.leche=BW.t+30;consumirEnMano();sonar('beber',null,.8);mostrarMensaje('Leche mágica: las trampas no te afectan durante 30 s');cdUso=.5;return;}
    if(p&&p.id===719){const dir=new THREE.Vector3();camara.getWorldDirection(dir);const s=new THREE.Sprite(matSprite(719));s.scale.set(.3,.3,.3);
      agregarEnt({tipo:'chincheBW',pos:camara.position.clone().addScaledVector(dir,.6),vel:dir.multiplyScalar(18),edad:0,malla:s});consumirEnMano();sonar('lanzarCana',null,.5);cdUso=.4;return;}
  }
  return _usarDerechoBW2();
};
// Torre compacta: anillo de lana de 9 bloques de alto con escalera y almenas, que se monta sola en un segundo
function construirTorre(){
  const d=new THREE.Vector3();camara.getWorldDirection(d);
  const fx=Math.abs(d.x)>Math.abs(d.z)?Math.sign(d.x):0, fz=fx?0:Math.sign(d.z)||1;
  const cx=Math.floor(jugador.pos.x)+fx*2, cz=Math.floor(jugador.pos.z)+fz*2, y0=Math.floor(jugador.pos.y), L=lanaYo();
  let t=0;
  for(let h=0;h<9;h++){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;
      const x=cx+a,z=cz+b;if(a===-fx&&b===-fz&&h<2)continue;  // entrada
      if(a===fx&&b===fz){BW.cola.push({x,y:y0+h,z,b:L,t:t+=.012});continue;}
      BW.cola.push({x,y:y0+h,z,b:L,t:t+=.012,sonido:h%3===0&&a===0});}
    BW.cola.push({x:cx,y:y0+h,z:cz,b:B.escaleraMano||B.escaleraMano1,t:t+=.012});}
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(Math.max(Math.abs(a),Math.abs(b))===2&&(a+b)%2===0)BW.cola.push({x:cx+a,y:y0+9,z:cz+b,b:L,t:t+=.01});
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(Math.max(Math.abs(a),Math.abs(b))===2)BW.cola.push({x:cx+a,y:y0+8,z:cz+b,b:L,t:t+=.008});
}
// Aliados: chinches (lepismas, 15 s) y defensores (gólem de hierro, 4 min) que atacan a los enemigos
function invocarAliado(tipo,x,y,z,seg,nombre){
  if(!DEF_MOB[tipo])return null;
  const m=crearMob(tipo,x,y+.2,z);m.def=Object.assign({},m.def,{ia:'aliadoBW',tipo:'pasivo'});m.domado=true;m.bwAliado=BW.yo.equipo;m.bwVida=seg;
  if(tipo==='golem')m.vida=100;
  const E=EQUIPOS_BW[BW.yo.equipo],s=cartelTexto(`${nombre} (${E.nombre})`,E.col,420);s.scale.multiplyScalar(.6);s.position.set(0,(m.alto||1)+.6,0);m.grupo.add(s);
  BW.aliados.push(m);return m;
}
IA_EXTRA.aliadoBW=(m,dt)=>{
  if(!BW||!BW.activo){m.mover=false;return;}
  let obj=null,dm=14;for(const o of BW.bots){if(o.muerto||o.bw.equipo===m.bwAliado)continue;const d=o.pos.distanceTo(m.pos);if(d<dm){dm=d;obj=o;}}
  if(!obj){m.mover=false;return;}
  const dx=obj.pos.x-m.pos.x,dz=obj.pos.z-m.pos.z,l=Math.hypot(dx,dz)||1;mover(m,dx,dz,m.tipo==='golem'?3:4.5);if(m.chocoH&&m.suelo)m.vel.y=7;
  m.cdA=(m.cdA||0)-dt;
  if(l<(m.tipo==='golem'?2.4:1.4)&&m.cdA<=0){m.cdA=m.tipo==='golem'?1.2:.8;m.golpeT=.35;obj.bw.ultimoGolpe={jugador:true,t:tiempoJuego};
    herirMob(obj,m.tipo==='golem'?7:2,{x:dx/l,z:dz/l},'aliadoBW');if(m.tipo==='golem')obj.vel.y=8;}
};
const _herirMobAliado=herirMob;
herirMob=function(m,d,dir,fuente,empuje){if(m&&m.bwAliado!==undefined&&BW&&m.bwAliado===BW.yo.equipo&&(fuente==='jugador'||fuente==='flechaJugador'))return;return _herirMobAliado(m,d,dir,fuente,empuje);};
ACT_ENT.chincheBW=(e,dt)=>{
  e.edad+=dt;e.vel.y-=18*dt;const ant=e.pos.clone();e.pos.addScaledVector(e.vel,dt);if(e.malla)e.malla.position.copy(e.pos);
  const b=getBloque(Math.floor(e.pos.x),Math.floor(e.pos.y),Math.floor(e.pos.z));
  if(SOLIDO[b]||e.edad>4){e.muerta=true;if(e.malla)escena.remove(e.malla);
    if(BW&&BW.activo){invocarAliado(DEF_MOB.lepisma?'lepisma':'arana',ant.x,ant.y,ant.z,15,'Chinche');emitirParticulas(ant.x,ant.y,ant.z,0xffffff,8,1.4,.5,4);}}
};
// La leche mágica protege de las trampas
const _actualizarTrampas2=actualizarTrampas;
actualizarTrampas=function(dt){
  if(BW&&BW.yo.leche&&BW.t<BW.yo.leche){const guard=efectos.lentitud,guard2=efectos.oscuridad,guard3=efectos.fatigaMinera;_actualizarTrampas2(dt);
    if(!guard)delete efectos.lentitud;if(!guard2)delete efectos.oscuridad;if(!guard3)delete efectos.fatigaMinera;return;}
  return _actualizarTrampas2(dt);
};

/* ---------- Bots que hablan y empujan más ---------- */
const FRASES_BW={mata:['gg','ez','jajaja','¡a casa!','sin cama no hay paraíso','otra más 😎','muy fácil','¿lag?'],muere:['lag','noooo','bruh','me lagueé','ya verás','gg'],cama:['¡cama rota! 😈','adiós camita','esa cama era mía','siguiente…']};
function hablaBot(m,tipo,prob=.4){if(!m||!m.bw||Math.random()>prob)return;const l=FRASES_BW[tipo],E=EQUIPOS_BW[m.bw.equipo];
  setTimeout(()=>{if(BW&&BW.activo)escribirChat(`[${E.letra}] ${m.bw.nombre}: ${l[Math.floor(Math.random()*l.length)]}`);},400+Math.random()*1500);}
const _romperCamaBW2=romperCamaBW;
romperCamaBW=function(equipo,quien,desdeRed){
  const bot=BW&&BW.bots.find(m=>m.bw.nombre===quien);
  _romperCamaBW2(equipo,quien,desdeRed);
  if(bot)hablaBot(bot,'cama',.7);
  if(BW&&!desdeRed&&quien==='Tú')sonar('killBW');
};
const _muerteBot2=muerteBot;
muerteBot=function(m,causa){
  const b=m.bw, porJ=b.ultimoGolpe&&b.ultimoGolpe.jugador&&tiempoJuego-b.ultimoGolpe.t<12;
  if(BW&&BW.nombresBots===undefined)BW.nombresBots={};if(BW)BW.nombresBots[b.equipo+':'+b.k]=b.nombre;
  _muerteBot2(m,causa);
  if(porJ){sonar('killBW');mostrarAvisoBW(BW.equipos[b.equipo].cama?'+1 baja':'¡BAJA FINAL!',BW.equipos[b.equipo].cama?'#fff':'#5ff');}
  hablaBot(m,'muere',.25);
};
const _danarJugadorBW2=danarJugador;
danarJugador=function(n,tipo,dir){
  const r=_danarJugadorBW2(n,tipo,dir);
  // Los golpes de los bots empujan más (el clásico «combo» hacia el vacío)
  if(BW&&BW.activo&&tipo==='mob'&&dir&&BW.yo.ultimoGolpe&&BW.yo.ultimoGolpe.m&&tiempoJuego-BW.yo.ultimoGolpe.t<.1){jugador.vel.x+=dir.x*2.2;jugador.vel.z+=dir.z*2.2;}
  return r;
};
const _morirBW2=morir;
morir=function(causa){
  const g=BW&&BW.activo&&BW.yo.ultimoGolpe&&BW.yo.ultimoGolpe.m&&tiempoJuego-BW.yo.ultimoGolpe.t<12?BW.yo.ultimoGolpe.m:null;
  const r=_morirBW2(causa); if(g)hablaBot(g,'mata',.5); return r;
};

/* ---------- Chat de colores ---------- */
const _escribirChatBW2=escribirChat;
escribirChat=function(t){
  _escribirChatBW2(t);
  if(!BW||!BW.activo)return;
  const d=elChatLog.lastElementChild;if(!d)return;
  const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  let h=esc(d.textContent);
  h=h.replace(/^(CAMA DESTRUIDA|EQUIPO ELIMINADO) &gt;/,'<b style="color:#fff">$1 &gt;</b>').replace(/¡ELIMINACIÓN FINAL!/g,'<b style="color:#55ffff">¡ELIMINACIÓN FINAL!</b>').replace(/^▶/,'<b style="color:#ff5">▶</b>');
  for(const E of EQUIPOS_BW)h=h.replace(new RegExp(`\\b(equipo ${E.nombre}|\\[${E.letra}\\])`,'g'),`<span style="color:${E.col}">$1</span>`);
  d.innerHTML=h;
};

/* ---------- Estadísticas, niveles con estrellas y recompensas ---------- */
function statsBW(){try{return Object.assign({partidas:0,victorias:0,bajas:0,finales:0,camas:0,muertes:0,xp:0,racha:0,mejorRacha:0},JSON.parse(localStorage.getItem('blockverse-bw-stats')||'{}'));}catch(e){return {partidas:0,victorias:0,bajas:0,finales:0,camas:0,muertes:0,xp:0,racha:0,mejorRacha:0};}}
const nivelBW=xp=>1+Math.floor(xp/500);
const estrellaBW=xp=>{const n=nivelBW(xp),col=n>=100?'#ff55ff':n>=50?'#55ffff':n>=20?'#ffaa00':n>=10?'#ffff55':'#aaaaaa';return `<span style="color:${col}">[${n}✫]</span>`;};
const _terminarBW2=terminarBW;
terminarBW=function(g){
  const yaFin=BW&&BW.fin; _terminarBW2(g); if(yaFin||!BW)return;
  const gano=g===BW.yo.equipo, s=statsBW(), y=BW.yo;
  const xpGanada=10+y.bajas*5+y.finales*10+y.camas*20+(gano?50:0);
  s.partidas++;s.bajas+=y.bajas;s.finales+=y.finales;s.camas+=y.camas;s.muertes+=y.muertes;
  const nivelAntes=nivelBW(s.xp); s.xp+=xpGanada; if(gano){s.victorias++;s.racha++;s.mejorRacha=Math.max(s.mejorRacha,s.racha);}else s.racha=0;
  try{localStorage.setItem('blockverse-bw-stats',JSON.stringify(s));}catch(e){}
  sonar(gano?'victoriaBW':'derrotaBW');
  const t=document.querySelector('#bwFin .tarjeta');
  if(t){const p=document.createElement('div');const prog=(s.xp%500)/5;
    p.innerHTML=`<p>Recompensas: <b style="color:#5ff">+${xpGanada} XP de Bed Wars</b>${nivelBW(s.xp)>nivelAntes?` · <b style="color:#ff5">¡Subes al nivel ${nivelBW(s.xp)}!</b>`:''}</p>
      <p>${estrellaBW(s.xp)} <span style="display:inline-block;width:160px;height:8px;background:#333;vertical-align:middle"><i style="display:block;height:100%;width:${prog}%;background:#5ff"></i></span> ${s.xp%500}/500</p>
      <p style="opacity:.8">Racha de victorias: ${s.racha} · Victorias: ${s.victorias} · Partidas: ${s.partidas}</p>`;
    t.insertBefore(p,t.querySelector('button'));}
  if(gano){let n=0;const f=setInterval(()=>{if(++n>14||!BW){clearInterval(f);return;}
    const cols=[0xff5555,0x55ff55,0x5577ff,0xffff55,0xff77dd,0x55ffff];const a=Math.random()*Math.PI*2;
    emitirParticulas(jugador.pos.x+Math.cos(a)*6,jugador.pos.y+8+Math.random()*5,jugador.pos.z+Math.sin(a)*6,cols[n%cols.length],40,7,1.2,4);sonar('fuegoArtificial',null,.5);},420);}
};

/* ---------- Marcador como el original ---------- */
pintarMarcadorBW=function(){
  const el=document.getElementById('bwMarcador');if(!el||!BW)return;
  const ev=EVENTOS_BW[BW.ev], fmt=s=>`${Math.floor(Math.max(0,s)/60)}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
  const hoy=new Date(),fecha=`${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${String(hoy.getFullYear()).slice(2)}`;
  let h=`<b class="tit">BED WARS</b><span style="color:#888">${fecha} m${(semilla%900)+100}</span><br><br>`;
  h+=BW.lobby>0?`Empieza en <b style="color:#5f5">${Math.ceil(BW.lobby)}</b><br>Mapa: <span style="color:#5f5">${TEMA_BW.nombre}</span><br><br>`:ev?`${ev[1]} en <b style="color:#5f5">${fmt(ev[0]-BW.t)}</b><br><br>`:'<br>';
  for(const q of BW.equipos){const E=EQUIPOS_BW[q.id], yoAqui=q.id===BW.yo.equipo;
    const est=q.cama?'<span style="color:#5f5">✔</span>':q.vivos>0||(yoAqui&&BW.yo.vivo)?`<span style="color:#ff5">${Math.max(q.vivos,yoAqui&&BW.yo.vivo?1:0)}</span>`:'<span style="color:#f55">✘</span>';
    h+=`<b style="color:${E.col}">${E.letra}</b> ${E.nombre}: ${est}${yoAqui?' <span style="color:#888">TÚ</span>':''}<br>`;}
  h+=`<br>Bajas: <b style="color:#5f5">${BW.yo.bajas}</b><br>Bajas finales: <b style="color:#5f5">${BW.yo.finales}</b><br>Camas rotas: <b style="color:#5f5">${BW.yo.camas}</b><br><br><span style="color:#ff5">www.blockverse.net</span>`;
  el.innerHTML=h;
};

/* ---------- Menú nuevo de Bed Wars ---------- */
(function(){
  const capa=document.getElementById('pantallaBedwars');if(!capa)return;
  const tar=capa.querySelector('.tarjeta');
  const MODOS=[[8,1,'Solos · 8 equipos'],[8,2,'Dúos · 8 equipos de 2'],[4,3,'Tríos · 4 equipos de 3'],[4,4,'Cuartetos · 4 equipos de 4'],[4,1,'4 equipos · 1 por equipo']];
  const MAPAS=[['azar','Al azar'],['jardin','Jardín'],['invierno','Invierno'],['infierno','Infierno'],['desierto','Desierto']];
  const DIFS=[['facil','Fácil'],['normal','Normal'],['dificil','Difícil']];
  let mi=0,ma=0,di=1;
  tar.innerHTML=`<h2 style="color:#ff5555">BED WARS</h2><div id="bwStats" class="pista"></div>
    <p class="pista">Protege tu cama, junta recursos en tu generador, compra en la TIENDA y mejora a tu equipo. Rompe las camas enemigas: sin cama nadie reaparece. ¡El último equipo en pie gana!</p>
    <button id="bwModo"></button><button id="bwMapa"></button><button id="bwDif"></button>
    <button id="bwEmpezar">¡Jugar!</button><button id="bwVolver" class="secundario">Volver</button>`;
  const $c=id=>tar.querySelector('#'+id);
  const pintar=()=>{$c('bwModo').textContent='Modo: '+MODOS[mi][2];$c('bwMapa').textContent='Mapa: '+MAPAS[ma][1];$c('bwDif').textContent='Bots: '+DIFS[di][1];
    const s=statsBW(),ratio=(s.finales/Math.max(1,s.muertes)).toFixed(2);
    $c('bwStats').innerHTML=`${estrellaBW(s.xp)} Nivel ${nivelBW(s.xp)} · ${s.xp%500}/500 XP<br>Victorias <b>${s.victorias}</b> · Partidas <b>${s.partidas}</b> · Bajas <b>${s.bajas}</b> · Finales <b>${s.finales}</b> · Camas <b>${s.camas}</b> · FKDR <b>${ratio}</b> · Racha <b>${s.racha}</b>`;};
  pintar();
  document.getElementById('btnBedwars').addEventListener('click',pintar);
  $c('bwModo').onclick=()=>{mi=(mi+1)%MODOS.length;pintar();};
  $c('bwMapa').onclick=()=>{ma=(ma+1)%MAPAS.length;pintar();};
  $c('bwDif').onclick=()=>{di=(di+1)%DIFS.length;pintar();};
  $c('bwVolver').onclick=()=>{capa.classList.add('oculto');document.getElementById('menu').classList.remove('oculto');};
  $c('bwEmpezar').onclick=()=>{capa.classList.add('oculto');
    const o={equipos:MODOS[mi][0],porEquipo:MODOS[mi][1],tema:MAPAS[ma][0],dificultad:DIFS[di][0]};
    if(typeof cargarTerreno==='function'){mostrarCarga('Preparando Bed Wars');setTimeout(()=>{iniciarBedwars(o);cargarTerreno(empezar);},40);}else{iniciarBedwars(o);empezar();}};
})();
