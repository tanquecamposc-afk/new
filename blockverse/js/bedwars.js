"use strict";
/* =========================================================
   BED WARS: cuatro equipos en islas flotantes. Cada isla
   tiene su cama, su generador (hierro, oro y, con la forja,
   esmeraldas), una tienda de objetos y una de mejoras de
   equipo. Hay islas de diamante y un centro con esmeraldas.
   Mientras tu cama siga en pie reapareces a los 5 segundos;
   sin cama, la muerte es definitiva. Gana el último equipo.
   Los demás equipos (y tus compañeros en dúos, tríos y
   cuartetos) los controlan bots que recogen recursos,
   compran, tienden puentes, rompen camas y pelean.
   ========================================================= */
const BW_Y=140, BW_VACIO=BW_Y-32;
const EQUIPOS_BW=[
  {id:0,nombre:'Rojo',letra:'R',lana:'rojo',col:'#ff5555',hex:0xd03030,isla:[0,-46]},
  {id:1,nombre:'Azul',letra:'A',lana:'azul',col:'#5577ff',hex:0x3050d0,isla:[46,0]},
  {id:2,nombre:'Verde',letra:'V',lana:'lima',col:'#55ff55',hex:0x40b040,isla:[0,46]},
  {id:3,nombre:'Amarillo',letra:'Am',lana:'amarillo',col:'#ffff55',hex:0xe0c020,isla:[-46,0]},
];
const EVENTOS_BW=[[300,'Diamante II'],[600,'Esmeralda II'],[900,'Diamante III'],[1200,'Esmeralda III'],[1500,'Camas destruidas'],[1800,'Fin de la partida']];
let BW=null, bwPendiente=false;
const esBedwars=()=>bwPendiente||!!(BW&&BW.activo);
const clBW=(x,y,z)=>x+','+y+','+z;
Object.assign(SND,{
  camaRota:v=>{ruidoSnd(.6,300,.5*v);for(let i=0;i<4;i++)tonoSnd(600-i*100,300-i*50,.25,'sawtooth',.06*v,i*.12);},
  compraBW:v=>{tonoSnd(880,1320,.08,'square',.05*v);tonoSnd(1320,1760,.08,'square',.04*v,.08);},
  sinDinero:v=>tonoSnd(220,160,.15,'square',.05*v),
  eventoBW:v=>{for(let i=0;i<3;i++)tonoSnd(523+i*131,523+i*131,.18,'triangle',.07*v,i*.15);},
});
Object.assign(NOMBRE_EFECTO,{salto:'Supersalto',prisa:'Prisa minera',invisibilidad:'Invisibilidad'});
Object.assign(COLOR_EFECTO,{salto:'#22ff4c',prisa:'#d9c043',invisibilidad:'#7f8392'});

// Título grande que se oculta solo
function tituloBW(a,g,col,seg=3){tituloOB(a,g,col,seg);clearTimeout(tituloBW._t);tituloBW._t=setTimeout(()=>{if(typeof tituloEl!=='undefined')tituloEl.style.opacity=0;},seg*1000);}
/* ---------- Mapa ---------- */
function construirMapaBW(){
  const M=new Map(), pon=(x,y,z,b)=>M.set(clBW(x,y,z),b);
  const isla=(cx,cz,r,sup,base,prof=4)=>{for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
    const d=Math.max(Math.abs(dx),Math.abs(dz));if(d>r)continue;pon(cx+dx,BW_Y,cz+dz,sup);
    for(let k=1;k<=prof;k++)if(d<=r-k+ (hash2(cx+dx,cz+dz,k)<.5?0:1))pon(cx+dx,BW_Y-k,cz+dz,k===1?base:B.piedra);}};
  const gens=[], camas=[], tiendas=[];
  for(const E of EQUIPOS_BW){
    const [cx,cz]=E.isla, ux=-Math.sign(cx), uz=-Math.sign(cz);   // hacia el centro
    isla(cx,cz,6,B.cesped,B.tierra,5);
    const L=B['lana_'+E.lana];
    for(let k=-6;k<=6;k++){pon(cx+k,BW_Y,cz+6,L);pon(cx+k,BW_Y,cz-6,L);pon(cx+6,BW_Y,cz+k,L);pon(cx-6,BW_Y,cz+k,L);}
    // Generador detrás (lejos del centro) sobre una losa de hierro
    const gx=cx-ux*4, gz=cz-uz*4;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)pon(gx+a,BW_Y,gz+b,B.bloqueHierro);
    gens.push({tipo:'equipo',equipo:E.id,x:gx+.5,y:BW_Y+1.2,z:gz+.5,tH:0,tO:0,tE:0});
    // Cama delante (hacia el centro) con lana de su color alrededor del suelo
    const bx=cx+ux*3, bz=cz+uz*3; pon(bx,BW_Y+1,bz,B.cama); camas.push({equipo:E.id,x:bx,y:BW_Y+1,z:bz});
    // Tiendas a los lados
    const sx=uz, sz=ux;
    tiendas.push({equipo:E.id,tipo:'objetos',x:cx+sx*4+.5,z:cz+sz*4+.5},{equipo:E.id,tipo:'mejoras',x:cx-sx*4+.5,z:cz-sz*4+.5});
  }
  for(const [dx,dz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const cx=dx*30,cz=dz*30;isla(cx,cz,3,B.cesped,B.tierra,3);pon(cx,BW_Y,cz,B.bloqueDiamante);
    gens.push({tipo:'diamante',x:cx+.5,y:BW_Y+1.2,z:cz+.5,t:0});}
  isla(0,0,8,B.piedra,B.piedra,5);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)pon(dx,BW_Y+1,dz,B.piedra);
  for(const [dx,dz] of [[-5,0],[5,0]]){pon(dx,BW_Y,dz,B.bloqueEsmeralda);gens.push({tipo:'esmeralda',x:dx+.5,y:BW_Y+1.2,z:dz+.5,t:0});}
  // Bloques por chunk para la generación
  const porChunk=new Map();
  for(const [k,b] of M){const [x,y,z]=k.split(',').map(Number),ck=Math.floor(x/CX)+','+Math.floor(z/CZ);(porChunk.get(ck)||porChunk.set(ck,[]).get(ck)).push([x,y,z,b]);}
  return {porChunk,gens,camas,tiendas};
}
let MAPA_BW=null;
const _generarSuperficieBW=generarSuperficie;
generarSuperficie=function(ch){
  if(!esBedwars())return _generarSuperficieBW(ch);
  ch.bioma=new Uint8Array(256).fill(BIOMA.llanura);
  const lista=MAPA_BW&&MAPA_BW.porChunk.get(ch.cx+','+ch.cz); if(!lista)return;
  for(const [x,y,z,b] of lista)ch.datos[idx(x-ch.cx*CX,y,z-ch.cz*CZ)]=b;
};
const _aparecerBW=aparecer;
aparecer=function(){if(esBedwars()&&!spawnMundo){const E=EQUIPOS_BW[(BW&&BW.yo.equipo)||0];spawnMundo=[E.isla[0]+.5,E.isla[1]+.5];}_aparecerBW();};
const _generarMobsBW=generarMobs;
generarMobs=function(dt){if(esBedwars())return;return _generarMobsBW(dt);};

/* ---------- Bots y tenderos ---------- */
DEF_MOB.botBW={vida:20,ancho:.3,alto:1.8,vel:4.3,tipo:'pasivo',ia:'botBW',dano:0,xp:[0,0],sonido:'zombi',dims:['superficie'],suelta:()=>[]};
DEF_MOB.tenderoBW={vida:20,ancho:.3,alto:1.95,vel:0,tipo:'pasivo',ia:'tenderoBW',xp:[0,0],sonido:'aldeano',dims:['superficie'],suelta:()=>[],invulnerable:true};
MODELOS_EXTRA.botBW=({humanoide,pon,parte,ojos,opc})=>{const c=opc.color??0xd03030;humanoide(0xd8a47a,c,0x2c2c44,0xd8a47a);ojos(1.78,.26,.12);
  pon(parte(.52,.14,.52,0x3a2a1a),0,2.02,0);};
MODELOS_EXTRA.tenderoBW=({humanoide,pon,parte,ojos,opc})=>{humanoide(0xc89070,opc.mejoras?0x3a6ad0:0x7a4a2a,0x3a3a3a,0xc89070);ojos(1.78,.26,.12);pon(parte(.12,.2,.1,0xb07858),0,1.68,.29);};
function cartelTexto(texto,col='#fff',ancho=256){
  const c=document.createElement('canvas');c.width=ancho;c.height=48;const x=c.getContext('2d');
  x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,ancho,48);x.font='bold 26px monospace';x.textAlign='center';x.textBaseline='middle';x.fillStyle=col;x.fillText(texto,ancho/2,25);
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:true,transparent:true}));
  s.scale.set(ancho/48*.5,.5,1);s.userData.lienzo=c;return s;
}
function cambiarCartel(s,texto,col='#fff'){const c=s.userData.lienzo,x=c.getContext('2d');x.clearRect(0,0,c.width,48);x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,c.width,48);
  x.font='bold 26px monospace';x.textAlign='center';x.textBaseline='middle';x.fillStyle=col;x.fillText(texto,c.width/2,25);s.material.map.needsUpdate=true;}
IA_EXTRA.tenderoBW=(m,dt,{dx,dz})=>{m.mover=false;m.vel.x=m.vel.z=0;m.yawObj=Math.atan2(dx,dz);};

/* ---------- Inicio de la partida ---------- */
function iniciarBedwars(opc={}){
  const porEquipo=clamp(opc.porEquipo||1,1,4), dificultad=opc.dificultad||'normal';
  MAPA_BW=construirMapaBW();
  mundoId=null; metaMundo=null; selModo.value='supervivencia';
  bwPendiente=true;
  BW={activo:true,t:0,ev:0,porEquipo,dificultad,colocados:new Set(),gens:MAPA_BW.gens,camas:MAPA_BW.camas,
    equipos:EQUIPOS_BW.map(E=>({id:E.id,cama:true,vivos:porEquipo,mejoras:{filo:0,prot:0,prisa:0,forja:0,curacion:0},trampas:[],trampaT:0})),
    yo:{equipo:0,vivo:true,espera:0,armadura:0,pico:0,hacha:0,bajas:0,finales:0,camas:0,muertes:0,espectador:false,ultimoGolpe:null},
    bots:[],tenderos:[],carteles:[],fin:false,avisoT:0};
  try{nuevoMundo();}finally{bwPendiente=false;}
  spawnMundo=null; aparecer();
  mundoEstado.bedwars=true; tiempoDia=.25; lloviendo=false;
  for(const g of BW.gens)if(g.tipo!=='equipo'){const s=cartelTexto('',g.tipo==='diamante'?'#7ff':'#5f5');s.position.set(g.x,g.y+2.2,g.z);escena.add(s);g.cartel=s;BW.carteles.push(s);}
  for(const t of MAPA_BW.tiendas){const m=crearMob('tenderoBW',t.x,BW_Y+1,t.z,{mejoras:t.tipo==='mejoras'});m.domado=true;m.bwTienda=t.tipo;m.bwEquipo=t.equipo;BW.tenderos.push(m);
    const s=cartelTexto(t.tipo==='mejoras'?'MEJORAS':'TIENDA',t.tipo==='mejoras'?'#8cf':'#fd5');s.scale.multiplyScalar(.8);s.position.set(t.x,BW_Y+3.3,t.z);escena.add(s);BW.carteles.push(s);}
  // Bots: en tu equipo (si juegas en grupo) y en los demás
  for(const E of EQUIPOS_BW)for(let k=0;k<porEquipo;k++){if(E.id===0&&k===0)continue;crearBotBW(E.id,k,dificultad);}
  kitBW(true);
  jugador.vuela=false; jugador.yaw=Math.atan2(-EQUIPOS_BW[0].isla[0],-EQUIPOS_BW[0].isla[1])+Math.PI; jugador.pitch=-.1;
  salud=20;hambre=20;
  mostrarMarcadorBW(true);
  setTimeout(()=>{tituloBW('BED WARS','¡Protege tu cama!','#ff5555',3.5);escribirChat('§ Bed Wars: destruye las camas enemigas y protege la tuya. Compra en la TIENDA con hierro, oro, diamantes y esmeraldas.');},300);
  sonar('eventoBW');
}
function crearBotBW(equipo,k,dificultad){
  const E=EQUIPOS_BW[equipo],[cx,cz]=E.isla;
  const m=crearMob('botBW',cx+.5+(k-1)*1.2,BW_Y+1.01,cz+.5,{color:E.hex});
  m.domado=true;
  const nivel={facil:.7,normal:1,dificil:1.3}[dificultad]||1;
  m.bw={equipo,k,nivel,rol:k%2===0?'atacante':'defensor',estado:'recolectar',t:20+Math.random()*25,res:{h:0,o:0,d:0,e:0},espada:0,armadura:0,lana:16,
    objetivo:null,minarT:0,golpeT:0,nombre:`Bot ${E.nombre}${BW.porEquipo>1?' '+(k+1):''}`};
  const s=cartelTexto(m.bw.nombre,E.col,320);s.scale.multiplyScalar(.7);s.position.set(0,2.45,0);m.grupo.add(s);
  BW.bots.push(m);return m;
}
// Equipo del jugador: espada de madera, armadura de cuero y la armadura permanente comprada
const ARMAS_BW=['espada_madera','espada_piedra','espada_hierro','espada_diamante'];
const ARMADURA_BW=['cuero','cobre','hierro','diamante'];
const PICO_BW=[null,'pico_madera','pico_hierro','pico_oro','pico_diamante'], HACHA_BW=[null,'hacha_madera','hacha_piedra','hacha_hierro','hacha_diamante'];
function kitBW(inicio){
  const yo=BW.yo;
  inv=new Array(41).fill(null);
  inv[0]=crearPila(idClave('espada_madera'));
  if(yo.pico)inv[1]=crearPila(idClave(PICO_BW[yo.pico]));
  if(yo.hacha)inv[2]=crearPila(idClave(HACHA_BW[yo.hacha]));
  const mat=ARMADURA_BW[yo.armadura];
  inv[36]=crearPila(idClave('casco_cuero'));inv[37]=crearPila(idClave('pechera_cuero'));
  inv[38]=crearPila(idClave('pantalones_'+mat));inv[39]=crearPila(idClave('botas_'+mat));
  for(const i of [36,37,38,39])if(inv[i])inv[i].enc={ligamiento:1};
  ranura=0; actualizarHUD();
}

/* ---------- Generadores ---------- */
const NIVEL_GEN=()=>({d:BW.t>=900?2:BW.t>=300?1:0,e:BW.t>=1200?2:BW.t>=600?1:0});
function contarCerca(g,id,r=2.2){let n=0;for(const e of entidades)if(e.tipo==='item'&&!e.muerta&&e.pila.id===id&&Math.abs(e.pos.x-g.x)<r&&Math.abs(e.pos.z-g.z)<r)n+=e.pila.n;return n;}
function soltarGen(g,id,max){if(contarCerca(g,id)>=max)return;soltarItem(crearPila(id,1),g.x,g.y,g.z,false,new THREE.Vector3(0,0,0));}
function actualizarGensBW(dt){
  const nv=NIVEL_GEN();
  for(const g of BW.gens){
    if(g.tipo==='equipo'){const eq=BW.equipos[g.equipo],f=eq.mejoras.forja,mult=[1,1.5,2,2,3][f];
      if(!eq.cama&&eq.vivos<=0)continue;
      g.tH+=dt*mult;g.tO+=dt*mult;
      if(g.tH>=1.1){g.tH=0;soltarGen(g,I.lingoteHierro,48);}
      if(g.tO>=6){g.tO=0;soltarGen(g,I.lingoteOro,12);}
      if(f>=3){g.tE+=dt;if(g.tE>=40){g.tE=0;soltarGen(g,I.esmeralda,2);}}
    }else{
      const intervalo=g.tipo==='diamante'?[30,23,15][nv.d]:[65,50,35][nv.e];
      g.t+=dt; if(g.t>=intervalo){g.t=0;soltarGen(g,g.tipo==='diamante'?I.diamante:I.esmeralda,g.tipo==='diamante'?4:2);}
      if(g.cartel&&(g._c=(g._c||0)-dt)<=0){g._c=.5;cambiarCartel(g.cartel,`${g.tipo==='diamante'?'Diamante':'Esmeralda'} ${['I','II','III'][g.tipo==='diamante'?nv.d:nv.e]} · ${Math.ceil(intervalo-g.t)}s`,g.tipo==='diamante'?'#7ff':'#5f5');}
    }
  }
  // Los bots cobran de su generador sin quitarte los lingotes, y recogen diamantes y esmeraldas del suelo
  for(const m of BW.bots){if(m.muerto)continue;const g=BW.gens.find(g=>g.tipo==='equipo'&&g.equipo===m.bw.equipo),f=[1,1.5,2,2,3][BW.equipos[m.bw.equipo].mejoras.forja];
    if(g&&Math.hypot(m.pos.x-g.x,m.pos.z-g.z)<5){m.bw.ingT=(m.bw.ingT||0)+dt*f;if(m.bw.ingT>=1.6){m.bw.ingT=0;m.bw.res.h++;if(Math.random()<.18)m.bw.res.o++;}}
    for(const e of entidades){if(e.tipo!=='item'||e.muerta||(e.pila.id!==I.diamante&&e.pila.id!==I.esmeralda))continue;
    if(Math.abs(e.pos.x-m.pos.x)<1.5&&Math.abs(e.pos.z-m.pos.z)<1.5&&Math.abs(e.pos.y-m.pos.y)<2){const id=e.pila.id,r=m.bw.res;
      if(id===I.lingoteHierro)r.h+=e.pila.n;else if(id===I.lingoteOro)r.o+=e.pila.n;else if(id===I.diamante)r.d+=e.pila.n;else if(id===I.esmeralda)r.e+=e.pila.n;else continue;
      e.muerta=true;if(e.malla)escena.remove(e.malla);}}}
}

/* ---------- Tienda de objetos ---------- */
const lanaYo=()=>B['lana_'+EQUIPOS_BW[BW.yo.equipo].lana];
const MH='lingoteHierro',MO='lingoteOro',MD='diamante',ME='esmeralda';
const NOMBRE_MONEDA={lingoteHierro:'hierro',lingoteOro:'oro',diamante:'diamantes',esmeralda:'esmeraldas'};
const COLOR_MONEDA={lingoteHierro:'#ddd',lingoteOro:'#fc3',diamante:'#5ff',esmeralda:'#5f5'};
const TIENDA_BW=[
  ['Bloques',[
    {n:'Lana',id:()=>lanaYo(),c:16,p:[MH,4]},
    {n:'Terracota endurecida',id:()=>B['terracota_'+EQUIPOS_BW[BW.yo.equipo].lana],c:16,p:[MH,12]},
    {n:'Vidrio a prueba de explosiones',id:()=>B['vidrio_'+EQUIPOS_BW[BW.yo.equipo].lana],c:4,p:[MH,12]},
    {n:'Piedra del End',id:()=>B.piedraEnd,c:12,p:[MH,24]},
    {n:'Escalera de mano',id:()=>B.escaleraMano,c:8,p:[MH,4]},
    {n:'Tablones de roble',id:()=>B.tablones,c:16,p:[MO,4]},
    {n:'Obsidiana',id:()=>B.obsidiana,c:4,p:[ME,4]}]],
  ['Combate',[
    {n:'Espada de piedra',id:()=>idClave('espada_piedra'),c:1,p:[MH,10],espada:1},
    {n:'Espada de hierro',id:()=>idClave('espada_hierro'),c:1,p:[MO,7],espada:2},
    {n:'Espada de diamante',id:()=>idClave('espada_diamante'),c:1,p:[ME,4],espada:3},
    {n:'Palo de empuje (Empuje I)',id:()=>I.palo,c:1,p:[MO,5],enc:{retroceso:1}}]],
  ['Armadura',[
    {n:'Armadura de cota (permanente)',id:()=>idClave('botas_cobre'),c:1,p:[MH,24],armadura:1},
    {n:'Armadura de hierro (permanente)',id:()=>idClave('botas_hierro'),c:1,p:[MO,12],armadura:2},
    {n:'Armadura de diamante (permanente)',id:()=>idClave('botas_diamante'),c:1,p:[ME,6],armadura:3}]],
  ['Herramientas',[
    {n:'Pico (mejora)',id:()=>idClave(PICO_BW[Math.min(4,BW.yo.pico+1)]),c:1,p:()=>[[MH,10],[MH,10],[MO,3],[MO,6]][Math.min(3,BW.yo.pico)],pico:true},
    {n:'Hacha (mejora)',id:()=>idClave(HACHA_BW[Math.min(4,BW.yo.hacha+1)]),c:1,p:()=>[[MH,10],[MH,10],[MO,3],[MO,6]][Math.min(3,BW.yo.hacha)],hacha:true}]],
  ['Arcos',[
    {n:'Flechas',id:()=>I.flecha,c:8,p:[MO,2]},
    {n:'Arco',id:()=>I.arco,c:1,p:[MO,12]},
    {n:'Arco (Poder I)',id:()=>I.arco,c:1,p:[MO,20],enc:{poder:1}},
    {n:'Arco (Poder I, Impacto I)',id:()=>I.arco,c:1,p:[ME,6],enc:{poder:1,impacto:1}}]],
  ['Pociones',[
    {n:'Rapidez II (45 s, al momento)',id:()=>505,c:0,p:[ME,1],efecto:['rapidez',45,2]},
    {n:'Supersalto V (45 s, al momento)',id:()=>501,c:0,p:[ME,1],efecto:['salto',45,5]},
    {n:'Invisibilidad (30 s, al momento)',id:()=>500,c:0,p:[ME,2],efecto:['invisibilidad',30,1]}]],
  ['Utilidad',[
    {n:'Manzana dorada',id:()=>I.manzanaDorada,c:1,p:[MO,3]},
    {n:'Bola de fuego',id:()=>714,c:1,p:[MH,40]},
    {n:'Dinamita (se enciende sola)',id:()=>B.tnt,c:1,p:[MO,4]},
    {n:'Perla de ender',id:()=>I.perlaEnder,c:1,p:[ME,4]},
    {n:'Cubo de agua',id:()=>I.cuboAgua,c:1,p:[MO,3]},
    {n:'Huevo puente',id:()=>715,c:1,p:[ME,1]},
    {n:'Esponja',id:()=>B.esponja,c:4,p:[MO,3]}]],
];
function contarInv(id){let n=0;for(let i=0;i<41;i++)if(inv[i]&&inv[i].id===id)n+=inv[i].n;return n;}
function quitarInv(id,n){for(let i=0;i<41&&n>0;i++)if(inv[i]&&inv[i].id===id){const q=Math.min(n,inv[i].n);inv[i].n-=q;n-=q;if(inv[i].n<=0)inv[i]=null;}}
function pagarBW(moneda,n){const id=I[moneda];if(contarInv(id)<n)return false;quitarInv(id,n);return true;}
function darBW(id,n,enc){const p=crearPila(id,n);if(enc)p.enc=Object.assign({},enc);const r=insertarInv(p);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);}
function comprarBW(o){
  const yo=BW.yo, precio=typeof o.p==='function'?o.p():o.p;
  if(o.armadura!==undefined&&yo.armadura>=o.armadura){mostrarMensaje('Ya tienes esa armadura o una mejor');return;}
  if(o.pico&&yo.pico>=4||o.hacha&&yo.hacha>=4){mostrarMensaje('Ya tienes la mejor');return;}
  if(!pagarBW(precio[0],precio[1])){sonar('sinDinero');mostrarMensaje(`Te faltan ${precio[1]-contarInv(I[precio[0]])} de ${NOMBRE_MONEDA[precio[0]]}`);return;}
  sonar('compraBW');
  if(o.armadura!==undefined){yo.armadura=o.armadura;const mat=ARMADURA_BW[o.armadura];inv[38]=crearPila(idClave('pantalones_'+mat));inv[39]=crearPila(idClave('botas_'+mat));aplicarMejorasArmadura();}
  else if(o.pico||o.hacha){const k=o.pico?'pico':'hacha',T=o.pico?PICO_BW:HACHA_BW;
    for(let i=0;i<41;i++)if(inv[i]&&T.includes(ITEMS[inv[i].id].clave))inv[i]=null;yo[k]++;darBW(idClave(T[yo[k]]),1,k==='pico'?{eficiencia:Math.min(3,yo.pico)}:{eficiencia:yo.hacha});}
  else if(o.efecto){const [ef,s,n]=o.efecto;efectos[ef]={t:s,n};}
  else{
    if(o.espada){for(let i=0;i<41;i++)if(inv[i]&&ITEMS[inv[i].id].clave==='espada_madera'){inv[i]=null;break;}}
    darBW(o.id(),o.c,o.enc);
    if(o.espada&&BW.equipos[yo.equipo].mejoras.filo)aplicarFilo();
  }
  mostrarMensaje(`Has comprado: ${o.n}`); actualizarHUD(); if(ui)refrescarUI();
}
let pestanaBW=0;
function precioTexto(p){return `${p[1]} ${NOMBRE_MONEDA[p[0]]}`;}
UI_EXTRA.tiendaBW={
  abrir(u){},
  construir(titulo){
    titulo('TIENDA DE OBJETOS');
    const caja=document.createElement('div');caja.className='tiendaBW';elSup.appendChild(caja);
    const tabs=document.createElement('div');tabs.className='tabsBW';caja.appendChild(tabs);
    TIENDA_BW.forEach(([nom],i)=>{const b=document.createElement('button');b.textContent=nom;b.className=i===pestanaBW?'activa':'';b.onmousedown=e=>{e.preventDefault();pestanaBW=i;construirUI();};tabs.appendChild(b);});
    const lista=document.createElement('div');lista.className='listaBW';caja.appendChild(lista);
    for(const o of TIENDA_BW[pestanaBW][1]){const p=typeof o.p==='function'?o.p():o.p,id=o.id();
      const b=document.createElement('button');b.className='ofertaBW';
      const puede=contarInv(I[p[0]])>=p[1];
      b.innerHTML=`<img src="${ICONOS[id]||''}"><span class="nomBW">${o.n}${o.c>1?' ×'+o.c:''}</span><span class="preBW" style="color:${puede?COLOR_MONEDA[p[0]]:'#f66'}">${precioTexto(p)}</span>`;
      b.onmousedown=e=>{e.preventDefault();comprarBW(o);construirUI();};lista.appendChild(b);}
  }
};
/* ---------- Mejoras de equipo y trampas ---------- */
const MEJORAS_BW=[
  {k:'filo',n:'Espadas afiladas',d:'Filo I en todas las espadas del equipo',precios:[4]},
  {k:'prot',n:'Armadura reforzada',d:'Protección para todo el equipo (I-IV)',precios:[2,4,8,16]},
  {k:'prisa',n:'Minero frenético',d:'Prisa minera permanente (I-II)',precios:[2,4]},
  {k:'forja',n:'Forja',d:'+50 %, +100 %, esmeraldas en tu isla y +200 %',precios:[2,4,6,8]},
  {k:'curacion',n:'Fuente de curación',d:'Regeneración cerca de tu isla',precios:[1]},
];
const TRAMPAS_BW=[
  {k:'trampa',n:'¡Es una trampa!',d:'Ceguera y lentitud al intruso'},
  {k:'contra',n:'Contraofensiva',d:'Rapidez y supersalto a tu equipo'},
  {k:'alarma',n:'Alarma',d:'Revela a los invisibles'},
  {k:'fatiga',n:'Fatiga minera',d:'Fatiga minera al intruso'},
];
function aplicarFilo(){for(let i=0;i<41;i++)if(inv[i]&&/^espada_/.test(ITEMS[inv[i].id].clave))inv[i].enc=Object.assign({},inv[i].enc,{filo:1});}
function aplicarMejorasArmadura(){const n=BW.equipos[BW.yo.equipo].mejoras.prot;if(!n)return;for(let i=36;i<40;i++)if(inv[i])inv[i].enc=Object.assign({},inv[i].enc,{proteccion:n});}
function comprarMejora(eq,k){
  const M=MEJORAS_BW.find(m=>m.k===k), nivel=eq.mejoras[k];if(nivel>=M.precios.length)return false;
  return {coste:M.precios[nivel]};
}
UI_EXTRA.mejorasBW={
  abrir(u){},
  construir(titulo){
    titulo('MEJORAS DEL EQUIPO');
    const eq=BW.equipos[BW.yo.equipo];
    const caja=document.createElement('div');caja.className='tiendaBW';elSup.appendChild(caja);
    const lista=document.createElement('div');lista.className='listaBW';caja.appendChild(lista);
    for(const M of MEJORAS_BW){const nv=eq.mejoras[M.k],max=nv>=M.precios.length,coste=max?0:M.precios[nv];
      const b=document.createElement('button');b.className='ofertaBW';
      b.innerHTML=`<span class="nomBW">${M.n}${M.precios.length>1?' '+['I','II','III','IV'][Math.min(nv,M.precios.length-1)]:''}<small>${M.d}</small></span><span class="preBW" style="color:${max?'#5f5':contarInv(I.diamante)>=coste?'#5ff':'#f66'}">${max?'COMPRADA':coste+' diamantes'}</span>`;
      b.onmousedown=e=>{e.preventDefault();if(max)return;if(!pagarBW(MD,coste)){sonar('sinDinero');mostrarMensaje('Te faltan diamantes');return;}
        eq.mejoras[M.k]++;sonar('compraBW');mostrarMensaje(`Mejora comprada: ${M.n}`);if(M.k==='filo')aplicarFilo();if(M.k==='prot')aplicarMejorasArmadura();construirUI();};
      lista.appendChild(b);}
    const h=document.createElement('div');h.className='pista';h.textContent=`Trampas en cola: ${eq.trampas.length}/3 · la siguiente cuesta ${1<<eq.trampas.length} diamante(s)`;caja.appendChild(h);
    const l2=document.createElement('div');l2.className='listaBW';caja.appendChild(l2);
    for(const T of TRAMPAS_BW){const b=document.createElement('button');b.className='ofertaBW';const coste=1<<eq.trampas.length;
      b.innerHTML=`<span class="nomBW">${T.n}<small>${T.d}</small></span><span class="preBW" style="color:${eq.trampas.length>=3?'#888':contarInv(I.diamante)>=coste?'#5ff':'#f66'}">${eq.trampas.length>=3?'COLA LLENA':coste+' diamante(s)'}</span>`;
      b.onmousedown=e=>{e.preventDefault();if(eq.trampas.length>=3)return;if(!pagarBW(MD,coste)){sonar('sinDinero');return;}eq.trampas.push(T.k);sonar('compraBW');mostrarMensaje(`Trampa preparada: ${T.n}`);construirUI();};
      l2.appendChild(b);}
  }
};
{const st=document.createElement('style');st.textContent=`
.tiendaBW{display:flex;flex-direction:column;gap:6px;max-height:330px;overflow:auto}
.tabsBW{display:flex;flex-wrap:wrap;gap:3px}.tabsBW button{width:auto;margin:0;padding:4px 8px;font-size:12px}.tabsBW button.activa{outline:2px solid #fff}
.listaBW{display:grid;grid-template-columns:1fr;gap:3px}
.ofertaBW{display:flex;align-items:center;gap:6px;margin:0;padding:4px 6px;text-align:left;font-size:12px;width:auto}
.ofertaBW img{width:32px;height:32px;image-rendering:pixelated}.nomBW{flex:1;display:flex;flex-direction:column}.nomBW small{opacity:.7;font-size:10px}
.preBW{font-weight:bold;white-space:nowrap;text-shadow:1px 1px 0 #000}
#bwMarcador{position:fixed;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.42);color:#fff;font:14px monospace;padding:8px 12px;min-width:190px;pointer-events:none;z-index:4;line-height:1.45;text-shadow:1px 1px 0 #000}
#bwMarcador b.tit{display:block;text-align:center;color:#ff5;margin-bottom:4px;letter-spacing:1px}
#bwAviso{position:fixed;left:50%;top:30%;transform:translateX(-50%);color:#fff;font:bold 30px monospace;text-shadow:2px 2px 0 #000;pointer-events:none;z-index:6;text-align:center}
#bwFin{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9}
#bwFin .tarjeta{text-align:center;min-width:320px}
@media (max-width:640px){#bwMarcador{font-size:11px;min-width:140px;top:auto;bottom:90px;transform:none}}`;document.head.appendChild(st);}
const _usarDerechoBW=usarDerecho;
usarDerecho=function(){
  if(BW&&BW.activo){
    if(BW.yo.espectador)return;
    const m=apuntadoEnt&&apuntadoEnt.mob;
    if(m&&m.bwTienda){if(m.bwEquipo!==BW.yo.equipo&&m.bwTienda==='mejoras'){mostrarMensaje('Solo puedes usar las mejoras de tu equipo');return;}abrirUI(m.bwTienda==='mejoras'?'mejorasBW':'tiendaBW');return;}
    if(apuntado&&!apuntadoEnt&&apuntado.b===B.cama&&!enMano()){return;}
    const p=enMano();
    if(p&&p.id===714){usarBolaFuego();return;}
    if(p&&p.id===715){lanzarHuevoPuente();return;}
    if(apuntado&&!apuntadoEnt&&BLOQUES[apuntado.b].inter==='cama'&&!(p&&ITEMS[p.id].bloque))return;
  }
  return _usarDerechoBW();
};
function usarBolaFuego(){
  const dir=new THREE.Vector3();camara.getWorldDirection(dir);const p=camara.position.clone().addScaledVector(dir,.8);
  const s=new THREE.Sprite(matSprite(714));s.scale.set(.6,.6,.6);
  agregarEnt({tipo:'bolaGhast',pos:p,vel:dir.multiplyScalar(14),edad:0,malla:s,dueno:'jugador'});
  consumirEnMano();sonar('arco',null,.8);cdUso=.5;
}
function lanzarHuevoPuente(){
  const dir=new THREE.Vector3();camara.getWorldDirection(dir);dir.y=Math.max(-.15,Math.min(.15,dir.y));dir.normalize();
  const s=new THREE.Sprite(matSprite(715));s.scale.set(.3,.3,.3);
  agregarEnt({tipo:'huevoPuente',pos:camara.position.clone().addScaledVector(dir,.6),vel:dir.multiplyScalar(16),edad:0,malla:s,lana:lanaYo()});
  consumirEnMano();sonar('lanzarCana',null,.6);cdUso=.4;
}
ACT_ENT.huevoPuente=(e,dt)=>{
  e.edad+=dt;e.pos.addScaledVector(e.vel,dt);e.vel.y-=1.2*dt;if(e.malla)e.malla.position.copy(e.pos);
  const x=Math.floor(e.pos.x),y=Math.floor(e.pos.y)-2,z=Math.floor(e.pos.z);
  if(e.edad>.12)for(const [a,b] of [[0,0],[1,0],[0,1]])if(!getBloque(x+a,y,z+b)){setBloque(x+a,y,z+b,e.lana);if(BW)BW.colocados.add(clBW(x+a,y,z+b));}
  if(e.edad>1.9||SOLIDO[getBloque(x,Math.floor(e.pos.y),z)]){e.muerta=true;if(e.malla)escena.remove(e.malla);}
};
const _abrirUIBW=abrirUI;
abrirUI=function(tipo,pos,extra){if(BW&&BW.activo&&tipo==='cama')return;return _abrirUIBW(tipo,pos,extra);};

/* ---------- Construir y romper ---------- */
let avisoMapaT=0;
const _colocarBloqueBW=colocarBloque;
colocarBloque=function(id){
  if(!(BW&&BW.activo))return _colocarBloqueBW(id);
  if(BW.yo.espectador)return false;
  const q=posColocar();if(!q)return false;
  if(q[1]>BW_Y+22||q[1]<BW_Y-14){mostrarMensaje('Límite de construcción');return false;}
  for(const g of BW.gens)if(Math.abs(q[0]+.5-g.x)<1.6&&Math.abs(q[2]+.5-g.z)<1.6&&q[1]<=BW_Y+2){mostrarMensaje('No puedes construir sobre un generador');return false;}
  const ok=_colocarBloqueBW(id);
  if(ok){BW.colocados.add(clBW(q[0],q[1],q[2]));
    if(id===B.tnt){setBloque(q[0],q[1],q[2],0);activarTNT(q[0],q[1],q[2],3);BW.colocados.delete(clBW(q[0],q[1],q[2]));}}
  return ok;
};
function camaDe(x,y,z){return BW.camas.find(c=>c.x===x&&c.y===y&&c.z===z);}
const _romperApuntadoBW=romperApuntado;
romperApuntado=function(){
  if(!(BW&&BW.activo)||!apuntado)return _romperApuntadoBW();
  if(BW.yo.espectador)return;
  const {x,y,z,b}=apuntado;
  if(b===B.cama){const c=camaDe(x,y,z);if(c){if(c.equipo===BW.yo.equipo){mostrarMensaje('¡No puedes romper tu propia cama!');return;}
    setBloque(x,y,z,0);romperCamaBW(c.equipo,'Tú');BW.yo.camas++;return;}}
  if(!BW.colocados.has(clBW(x,y,z))){if(tiempoJuego-avisoMapaT>2){avisoMapaT=tiempoJuego;mostrarMensaje('Solo puedes romper bloques puestos por los jugadores');}return;}
  BW.colocados.delete(clBW(x,y,z));
  return _romperApuntadoBW();
};
// Las explosiones solo rompen lo construido (y nunca el vidrio a prueba de explosiones ni la obsidiana)
let explosionBW=false;
const _explosionBW=explosion;
explosion=function(x,y,z,p,opc={}){if(!(BW&&BW.activo))return _explosionBW(x,y,z,p,opc);explosionBW=true;try{return _explosionBW(x,y,z,p,opc);}finally{explosionBW=false;}};
const _setBloqueBW=setBloque;
setBloque=function(x,y,z,id,opc){
  if(explosionBW&&!id){const k=clBW(x,y,z),b=getBloque(x,y,z);
    if(!BW.colocados.has(k)||b===B.obsidiana||/^vidrio_/.test(BLOQUES[b].clave))return;BW.colocados.delete(k);}
  return _setBloqueBW(x,y,z,id,opc);
};
function romperCamaBW(equipo,quien){
  const eq=BW.equipos[equipo];if(!eq.cama)return;eq.cama=false;
  const E=EQUIPOS_BW[equipo];
  escribirChat(`CAMA DESTRUIDA > ¡La cama del equipo ${E.nombre} ha sido destruida por ${quien}!`);
  sonar('camaRota');
  if(equipo===BW.yo.equipo)tituloBW('¡CAMA DESTRUIDA!','Ya no reaparecerás','#ff5555',3);
  else mostrarAvisoBW(`Cama ${E.nombre} destruida`,E.col);
  const c=BW.camas.find(c=>c.equipo===equipo);if(c&&getBloque(c.x,c.y,c.z)===B.cama)_setBloqueBW(c.x,c.y,c.z,0);
  comprobarFinBW();
}
function mostrarAvisoBW(t,col){let a=document.getElementById('bwAviso');if(!a){a=document.createElement('div');a.id='bwAviso';document.body.appendChild(a);}
  a.textContent=t;a.style.color=col||'#fff';a.style.opacity=1;clearTimeout(a._t);a._t=setTimeout(()=>a.style.opacity=0,2500);}

/* ---------- Combate, muerte y reaparición ---------- */
const _danarJugadorBW=danarJugador;
danarJugador=function(n,tipo,dir){
  if(BW&&BW.activo){if(BW.yo.espectador||estado==='muerto'||!BW.yo.vivo)return;
    const prot=BW.equipos[BW.yo.equipo].mejoras.prot;if(prot)n*=1-.12*prot;}
  return _danarJugadorBW(n,tipo,dir);
};
const _morirBW=morir;
morir=function(causa){
  if(!(BW&&BW.activo))return _morirBW(causa);
  if(estado==='muerto')return;
  const yo=BW.yo, eq=BW.equipos[yo.equipo], g=yo.ultimoGolpe&&tiempoJuego-yo.ultimoGolpe.t<12?yo.ultimoGolpe.m:null;
  yo.muertes++;
  // Los recursos van para quien te mató
  if(g&&!g.muerto){const r=g.bw.res;r.h+=contarInv(I.lingoteHierro);r.o+=contarInv(I.lingoteOro);r.d+=contarInv(I.diamante);r.e+=contarInv(I.esmeralda);}
  const final=!eq.cama;
  escribirChat(`${g?g.bw.nombre+' te ha eliminado':causa==='vacio'?'Has caído al vacío':'Has muerto'}${final?'. ¡ELIMINACIÓN FINAL!':''}`);
  if(ui)cerrarUI(); soltarControles(); efectos={}; fuegoJ=0;
  if(final){yo.vivo=false;eq.vivos=Math.max(0,eq.vivos-1);hacerEspectador();comprobarFinBW();return;}
  estado='muerto'; yo.espera=5; inv=new Array(41).fill(null); actualizarHUD();
  jugador.pos.set(0.5,BW_Y+30,0.5); jugador.vel.set(0,0,0);
  mostrarAvisoBW('¡HAS MUERTO!','#f55');
};
function reaparecerBW(){
  const E=EQUIPOS_BW[BW.yo.equipo];
  salud=20;hambre=20;aire=15;efectos={};
  BW.yo.pico=Math.max(BW.yo.pico?1:0,BW.yo.pico-1);BW.yo.hacha=Math.max(BW.yo.hacha?1:0,BW.yo.hacha-1);
  kitBW(false);aplicarMejorasArmadura();if(BW.equipos[BW.yo.equipo].mejoras.filo)aplicarFilo();
  jugador.pos.set(E.isla[0]+.5,BW_Y+1.01,E.isla[1]+.5);jugador.vel.set(0,0,0);jugador.maxY=jugador.pos.y;
  estado='jugando';mostrarAvisoBW('¡Has reaparecido!','#5f5');actualizarHUD();
}
function hacerEspectador(){
  BW.yo.espectador=true;estado='jugando';inv=new Array(41).fill(null);actualizarHUD();
  jugador.pos.set(0.5,BW_Y+20,0.5);jugador.vel.set(0,0,0);jugador.vuela=true;
  tituloBW('ELIMINADO','Ahora eres espectador','#aaa',3);
}
// Golpes del jugador a los bots: filo de equipo, armadura del bot y recompensa al matarlo
const _herirMobBW=herirMob;
herirMob=function(m,d,dir,fuente,empuje){
  if(BW&&BW.activo&&m.bw){
    if(fuente==='jugador'||fuente==='flechaJugador'){
      if(m.bw.equipo===BW.yo.equipo)return;           // sin fuego amigo
      m.bw.ultimoGolpe={jugador:true,t:tiempoJuego};
      if(BW.equipos[BW.yo.equipo].mejoras.filo&&fuente==='jugador')d+=1.25;
    }
    d*=1-[0,.12,.2,.3][m.bw.armadura]-.1*BW.equipos[m.bw.equipo].mejoras.prot;
  }
  return _herirMobBW(m,d,dir,fuente,empuje);
};
const _alMorirMobBW=alMorirMob;
alMorirMob=function(m){
  if(BW&&BW.activo&&m.bw)muerteBot(m);
  return _alMorirMobBW(m);
};
function muerteBot(m,causa){
  const b=m.bw, eq=BW.equipos[b.equipo], final=!eq.cama;
  const porJugador=b.ultimoGolpe&&b.ultimoGolpe.jugador&&tiempoJuego-b.ultimoGolpe.t<12;
  const asesino=!porJugador&&b.ultimoGolpe&&b.ultimoGolpe.m&&!b.ultimoGolpe.m.muerto?b.ultimoGolpe.m:null;
  if(porJugador){BW.yo[final?'finales':'bajas']++;
    for(const [k,id] of [['h',I.lingoteHierro],['o',I.lingoteOro],['d',I.diamante],['e',I.esmeralda]])if(b.res[k]>0)darBW(id,Math.min(64,b.res[k]));
    sonar('xp',null,.6);}
  else if(asesino){const r=asesino.bw.res;r.h+=b.res.h;r.o+=b.res.o;}
  escribirChat(`${b.nombre} ${causa==='vacio'?'cayó al vacío':porJugador?'fue eliminado por ti':asesino?'fue eliminado por '+asesino.bw.nombre:'murió'}${final?'. ¡ELIMINACIÓN FINAL!':''}`);
  const i=BW.bots.indexOf(m);if(i>=0)BW.bots.splice(i,1);
  if(final){eq.vivos=Math.max(0,eq.vivos-1);comprobarFinBW();return;}
  const datos={equipo:b.equipo,k:b.k,res:{h:0,o:0,d:0,e:0},espada:b.espada,armadura:b.armadura,rol:b.rol};
  setTimeout(()=>{if(!BW||!BW.activo||BW.fin)return;const n=crearBotBW(datos.equipo,datos.k,BW.dificultad);
    Object.assign(n.bw,{espada:Math.max(0,datos.espada-1),armadura:datos.armadura,rol:datos.rol,estado:'recolectar',t:8+Math.random()*10});},5000);
}

/* ---------- IA de los bots ---------- */
const DANO_ESPADA_BW=[4,5,6,7];
function enemigosDe(m){
  const res=[], b=m.bw;
  if(BW.yo.vivo&&!BW.yo.espectador&&estado!=='muerto'&&b.equipo!==BW.yo.equipo&&!(efectos.invisibilidad&&!BW.equipos[b.equipo].trampas.includes('alarma')))res.push({jugador:true,pos:jugador.pos});
  for(const o of BW.bots)if(o!==m&&!o.muerto&&o.bw.equipo!==b.equipo)res.push({m:o,pos:o.pos});
  return res;
}
function moverBot(m,tx,tz,vel,puente){
  const dx=tx-m.pos.x,dz=tz-m.pos.z,d=Math.hypot(dx,dz);if(d<.3){m.mover=false;return d;}
  const ux=dx/d,uz=dz/d;
  // Tender puente: si no hay suelo delante, pone lana de su equipo (como en el original, agachado al borde)
  const nx=Math.floor(m.pos.x+ux*.8),nz=Math.floor(m.pos.z+uz*.8),ny=Math.floor(m.pos.y-.5);
  if(m.suelo&&!getBloque(nx,ny,nz)&&!getBloque(Math.floor(m.pos.x+ux*.4),ny,Math.floor(m.pos.z+uz*.4))){
    if(!puente||m.bw.lana<=0){m.mover=false;if(m.bw.lana<=0&&m.bw.estado==='atacar'){m.bw.estado='recolectar';m.bw.t=15;}return d;}
    if((m.bw.colocarT=(m.bw.colocarT||0)-1/60)<=0){m.bw.colocarT=.18/m.bw.nivel;
      const L=B['lana_'+EQUIPOS_BW[m.bw.equipo].lana];setBloque(nx,ny,nz,L);BW.colocados.add(clBW(nx,ny,nz));m.bw.lana--;}
    mover(m,ux,uz,vel*.35);return d;
  }
  mover(m,ux,uz,vel);
  if(m.chocoH&&m.suelo)m.vel.y=8.6;
  return d;
}
function comprasBot(m){
  const b=m.bw,r=b.res,eq=BW.equipos[b.equipo];
  while(b.lana<64&&r.h>=4){r.h-=4;b.lana+=16;}
  if(b.espada<1&&r.h>=10){r.h-=10;b.espada=1;}
  if(b.armadura<1&&r.h>=24){r.h-=24;b.armadura=1;}
  if(b.espada<2&&r.o>=7){r.o-=7;b.espada=2;}
  if(b.armadura<2&&r.o>=12){r.o-=12;b.armadura=2;}
  if(r.d>=2&&eq.mejoras.prot<2){r.d-=2*(eq.mejoras.prot+1);eq.mejoras.prot++;}
  else if(r.d>=4&&!eq.mejoras.filo){r.d-=4;eq.mejoras.filo=1;}
  else if(r.d>=1&&eq.trampas.length<1){r.d-=1;eq.trampas.push('trampa');}
  if(b.espada<3&&r.e>=4){r.e-=4;b.espada=3;}
  if(b.armadura<3&&r.e>=6){r.e-=6;b.armadura=3;}
}
IA_EXTRA.botBW=(m,dt)=>{
  if(!BW||!BW.activo||BW.fin){m.mover=false;return;}
  const b=m.bw, E=EQUIPOS_BW[b.equipo], eq=BW.equipos[b.equipo];
  if(m.pos.y<BW_VACIO){m.vida=0;b.ultimoGolpe=b.ultimoGolpe&&tiempoJuego-b.ultimoGolpe.t<8?b.ultimoGolpe:null;muerteBotVacio(m);return false;}
  b.t-=dt; b.golpeT-=dt;
  const casa={x:E.isla[0]+.5,z:E.isla[1]+.5}, gen=BW.gens.find(g=>g.tipo==='equipo'&&g.equipo===b.equipo);
  if(Math.hypot(m.pos.x-casa.x,m.pos.z-casa.z)<7)comprasBot(m);
  // ¿Hay enemigos cerca? A pelear
  let obj=null,dmin=b.rol==='defensor'?11:8;
  for(const e of enemigosDe(m)){const d=Math.hypot(e.pos.x-m.pos.x,e.pos.z-m.pos.z);if(d<dmin&&Math.abs(e.pos.y-m.pos.y)<4){dmin=d;obj=e;}}
  // Defender la cama si un enemigo se acerca a ella
  const cama=BW.camas.find(c=>c.equipo===b.equipo);
  if(!obj&&eq.cama)for(const e of enemigosDe(m))if(Math.hypot(e.pos.x-cama.x,e.pos.z-cama.z)<9){obj=e;break;}
  if(obj){
    const d=moverBot(m,obj.pos.x,obj.pos.z,m.def.vel*b.nivel,true);
    if(d<2.6&&b.golpeT<=0&&Math.abs(obj.pos.y-m.pos.y)<2){
      b.golpeT=(.75+Math.random()*.4)/b.nivel; m.golpeT=.35;
      const dano=DANO_ESPADA_BW[b.espada]+(eq.mejoras.filo?1.25:0), dx=obj.pos.x-m.pos.x, dz=obj.pos.z-m.pos.z, l=Math.hypot(dx,dz)||1;
      if(obj.jugador){BW.yo.ultimoGolpe={m,t:tiempoJuego};danarJugador(dano,'mob',{x:dx/l,z:dz/l});jugador.vel.x+=dx/l*4;jugador.vel.z+=dz/l*4;jugador.vel.y=Math.max(jugador.vel.y,4);}
      else{obj.m.bw.ultimoGolpe={m,t:tiempoJuego};herirMob(obj.m,dano,{x:dx/l,z:dz/l},'botBW');}
    }
    return;
  }
  // Máquina de estados: recolectar en el generador, atacar una cama enemiga o defender
  if(b.estado==='recolectar'){
    moverBot(m,gen.x+(b.k%2?.6:-.6),gen.z,m.def.vel*.8,false);
    if(b.t<=0){b.t=60+Math.random()*40;b.estado=b.rol==='atacante'||Math.random()<.35?'atacar':'patrulla';
      const vivos=BW.equipos.filter(q=>q.id!==b.equipo&&(q.cama||q.vivos>0));
      const o=vivos[Math.floor(Math.random()*vivos.length)];b.objetivo=o?o.id:null;}
  }else if(b.estado==='patrulla'){
    const c=cama, a=tiempoJuego*.4+b.k;moverBot(m,c.x+.5+Math.cos(a)*2.5,c.z+.5+Math.sin(a)*2.5,m.def.vel*.6,false);
    if(b.t<=0){b.estado='recolectar';b.t=15+Math.random()*15;}
  }else if(b.estado==='atacar'){
    const oq=b.objetivo!=null?BW.equipos[b.objetivo]:null;
    if(!oq||(!oq.cama&&oq.vivos<=0)){b.estado='recolectar';b.t=10;return;}
    const c=BW.camas.find(q=>q.equipo===oq.id), dest=oq.cama?{x:c.x+.5,z:c.z+.5}:{x:EQUIPOS_BW[oq.id].isla[0]+.5,z:EQUIPOS_BW[oq.id].isla[1]+.5};
    const d=moverBot(m,dest.x,dest.z,m.def.vel*b.nivel,true);
    if(oq.cama&&d<1.8){
      // Romper lo que proteja la cama y luego la cama
      b.minarT+=dt;
      if(b.minarT>1.6/b.nivel){b.minarT=0;
        let roto=false;for(const [ax,ay,az] of [[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){const x=c.x+ax,y=c.y+ay,z=c.z+az;if(BW.colocados.has(clBW(x,y,z))&&getBloque(x,y,z)){BW.colocados.delete(clBW(x,y,z));setBloque(x,y,z,0);roto=true;break;}}
        if(!roto&&getBloque(c.x,c.y,c.z)===B.cama){_setBloqueBW(c.x,c.y,c.z,0);romperCamaBW(oq.id,b.nombre);b.estado='recolectar';b.t=20;}}
    }
    if(b.t<=0){b.estado='recolectar';b.t=20;}
  }
};
function muerteBotVacio(m){m.bw.ultimoGolpe=m.bw.ultimoGolpe&&tiempoJuego-m.bw.ultimoGolpe.t<8?m.bw.ultimoGolpe:null;muerteBot(m,'vacio');quitarMob(m);}

/* ---------- Trampas y fuente de curación ---------- */
function actualizarTrampas(dt){
  for(const eq of BW.equipos){
    eq.trampaT=Math.max(0,eq.trampaT-dt);
    const E=EQUIPOS_BW[eq.id],[cx,cz]=E.isla;
    if(eq.trampas.length&&eq.trampaT<=0){
      let intruso=null;
      if(eq.id!==BW.yo.equipo&&BW.yo.vivo&&!BW.yo.espectador&&estado!=='muerto'&&Math.hypot(jugador.pos.x-cx,jugador.pos.z-cz)<10&&Math.abs(jugador.pos.y-BW_Y)<8)intruso={jugador:true};
      else for(const o of BW.bots)if(o.bw.equipo!==eq.id&&Math.hypot(o.pos.x-cx,o.pos.z-cz)<10){intruso={m:o};break;}
      if(intruso){const t=eq.trampas.shift();eq.trampaT=30;
        if(intruso.jugador){if(t==='trampa'){efectos.lentitud={t:8,n:1};efectos.oscuridad={t:8,n:1};}else if(t==='fatiga')efectos.fatigaMinera={t:10,n:1};else if(t==='alarma')delete efectos.invisibilidad;
          mostrarAvisoBW('¡Has activado una trampa!','#f55');}
        else{intruso.m.vel.multiplyScalar(.2);if(eq.id===BW.yo.equipo){mostrarAvisoBW('¡Trampa activada en tu isla!','#ff5');sonar('eventoBW');}
          if(t==='contra'&&eq.id===BW.yo.equipo){efectos.rapidez={t:15,n:1};efectos.salto={t:15,n:2};}}}
    }
    if(eq.mejoras.curacion&&eq.id===BW.yo.equipo&&Math.hypot(jugador.pos.x-cx,jugador.pos.z-cz)<9&&salud<20&&estado==='jugando'){eq._cur=(eq._cur||0)+dt;if(eq._cur>2.5){eq._cur=0;salud=Math.min(20,salud+1);actualizarHUD();}}
    if(eq.id===BW.yo.equipo&&eq.mejoras.prisa&&estado==='jugando')efectos.prisa={t:2,n:eq.mejoras.prisa};
  }
}

/* ---------- Tiempo, eventos y fin de la partida ---------- */
function comprobarFinBW(){
  if(BW.fin)return;
  const vivos=BW.equipos.filter(q=>q.cama||q.vivos>0||(q.id===BW.yo.equipo&&BW.yo.vivo));
  if(vivos.length<=1)terminarBW(vivos[0]?vivos[0].id:null);
}
function terminarBW(ganador){
  BW.fin=true;
  const gano=ganador===BW.yo.equipo, E=ganador!=null?EQUIPOS_BW[ganador]:null;
  sonar(gano?'totem':'camaRota');
  const d=document.createElement('div');d.id='bwFin';
  d.innerHTML=`<div class="tarjeta"><h2 style="color:${gano?'#ff5':'#f55'}">${gano?'¡VICTORIA!':'FIN DE LA PARTIDA'}</h2>
    <p>${E?`Gana el equipo <b style="color:${E.col}">${E.nombre}</b>`:'Empate'}</p>
    <p>Bajas: <b>${BW.yo.bajas}</b> · Bajas finales: <b>${BW.yo.finales}</b> · Camas rotas: <b>${BW.yo.camas}</b> · Muertes: <b>${BW.yo.muertes}</b></p>
    <p>Tiempo: ${Math.floor(BW.t/60)}:${String(Math.floor(BW.t%60)).padStart(2,'0')}</p>
    <button id="bwOtra">Jugar otra vez</button><button id="bwSalir" class="secundario">Salir al menú</button></div>`;
  document.body.appendChild(d);
  if(document.pointerLockElement)document.exitPointerLock();
  estado='menu';
  d.querySelector('#bwOtra').onclick=()=>{d.remove();iniciarBedwars({porEquipo:BW.porEquipo,dificultad:BW.dificultad});empezar();};
  d.querySelector('#bwSalir').onclick=()=>location.reload();
}
function actualizarBW(dt){
  if(!BW||!BW.activo||BW.fin)return;
  BW.t+=dt; tiempoDia=.25; hambre=20; saturacion=5;
  // Eventos de la partida
  const ev=EVENTOS_BW[BW.ev];
  if(ev&&BW.t>=ev[0]){BW.ev++;sonar('eventoBW');mostrarAvisoBW(ev[1],'#ff5');escribirChat('» '+ev[1]);
    if(ev[1]==='Camas destruidas'){for(const q of BW.equipos)if(q.cama)romperCamaBW(q.id,'el tiempo');}
    if(ev[1]==='Fin de la partida'){const v=BW.equipos.filter(q=>q.vivos>0||(q.id===BW.yo.equipo&&BW.yo.vivo));terminarBW(v.length===1?v[0].id:null);return;}}
  actualizarGensBW(dt); actualizarTrampas(dt);
  // Reaparición del jugador y caída al vacío
  if(estado==='muerto'&&BW.yo.espera>0){BW.yo.espera-=dt;mostrarAvisoBW(`Reapareces en ${Math.ceil(BW.yo.espera)}`,'#ff5');if(BW.yo.espera<=0)reaparecerBW();}
  if(estado==='jugando'&&!BW.yo.espectador&&jugador.pos.y<BW_VACIO)morir('vacio');
  if(BW.yo.espectador)jugador.vuela=true;
  if((BW.avisoT-=dt)<=0){BW.avisoT=.5;pintarMarcadorBW();}
}
const _actualizarFinalBW=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalBW(dt);actualizarBW(dt);};

/* ---------- Marcador ---------- */
function mostrarMarcadorBW(v){let el=document.getElementById('bwMarcador');if(!el&&v){el=document.createElement('div');el.id='bwMarcador';document.body.appendChild(el);}if(el)el.style.display=v?'block':'none';}
function pintarMarcadorBW(){
  const el=document.getElementById('bwMarcador');if(!el)return;
  const ev=EVENTOS_BW[BW.ev], fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  let h=`<b class="tit">BED WARS</b>${ev?`${ev[1]} en <b>${fmt(ev[0]-BW.t)}</b>`:''}<br><br>`;
  for(const q of BW.equipos){const E=EQUIPOS_BW[q.id], yoAqui=q.id===BW.yo.equipo;
    const vivos=q.vivos-(yoAqui&&!BW.yo.vivo?0:0), estadoTxt=q.cama?'<span style="color:#5f5">✔</span>':vivos>0?`<span style="color:#ff5">${vivos}</span>`:'<span style="color:#f55">✘</span>';
    h+=`<span style="color:${E.col}">${E.letra}</span> ${E.nombre} ${estadoTxt}${yoAqui?' <span style="color:#aaa">TÚ</span>':''}<br>`;}
  h+=`<br>Bajas: <b>${BW.yo.bajas}</b><br>Bajas finales: <b>${BW.yo.finales}</b><br>Camas rotas: <b>${BW.yo.camas}</b>`;
  el.innerHTML=h;
}

/* ---------- Menú: pantalla de Bed Wars ---------- */
(function menuBW(){
  const tarjeta=document.querySelector('#menu .pantallaTitulo'), ref=document.getElementById('btnOpcionesTitulo');
  const b=document.createElement('button');b.id='btnBedwars';b.textContent='Bed Wars';ref.parentNode.insertBefore(b,ref);
  const capa=document.createElement('div');capa.id='pantallaBedwars';capa.className='capa oculto';
  capa.innerHTML=`<div class="tarjeta pantallaMC"><h2>Bed Wars</h2>
    <p class="pista">Cuatro equipos (Rojo, Azul, Verde y Amarillo) en islas flotantes. Junta hierro y oro en tu generador, diamantes y esmeraldas en las islas del medio, compra en la TIENDA y mejora a tu equipo. Rompe las camas enemigas: sin cama nadie reaparece.</p>
    <button id="bwModo">Modo: Solos (1 por equipo)</button>
    <button id="bwDif">Bots: Normal</button>
    <button id="bwEmpezar">¡Jugar!</button>
    <button id="bwVolver" class="secundario">Volver</button></div>`;
  document.body.appendChild(capa);
  const modos=[[1,'Solos (1 por equipo)'],[2,'Dúos (2 por equipo)'],[3,'Tríos (3 por equipo)'],[4,'Cuartetos (4 por equipo)']], difs=[['facil','Fácil'],['normal','Normal'],['dificil','Difícil']];
  let mi=0,di=1;
  const pintar=()=>{capa.querySelector('#bwModo').textContent='Modo: '+modos[mi][1];capa.querySelector('#bwDif').textContent='Bots: '+difs[di][1];};
  b.onclick=()=>{document.getElementById('menu').classList.add('oculto');capa.classList.remove('oculto');pintar();};
  capa.querySelector('#bwModo').onclick=()=>{mi=(mi+1)%modos.length;pintar();};
  capa.querySelector('#bwDif').onclick=()=>{di=(di+1)%difs.length;pintar();};
  capa.querySelector('#bwVolver').onclick=()=>{capa.classList.add('oculto');document.getElementById('menu').classList.remove('oculto');};
  capa.querySelector('#bwEmpezar').onclick=()=>{capa.classList.add('oculto');
    const go=()=>{iniciarBedwars({porEquipo:modos[mi][0],dificultad:difs[di][0]});empezar();};
    if(typeof cargarTerreno==='function'){mostrarCarga('Preparando Bed Wars');setTimeout(()=>{iniciarBedwars({porEquipo:modos[mi][0],dificultad:difs[di][0]});cargarTerreno(empezar);},40);}else go();};
  // Si ya hay partida, el menú de pausa ofrece abandonarla
  const sal=document.createElement('button');sal.id='btnSalirBW';sal.className='secundario';sal.textContent='Abandonar Bed Wars';sal.style.display='none';ref.parentNode.insertBefore(sal,ref.nextSibling);
  sal.onclick=()=>location.reload();
  setInterval(()=>{sal.style.display=BW&&BW.activo?'':'none';b.style.display=BW&&BW.activo?'none':'';},500);
})();
// Comando para empezar desde el chat: /bedwars [1-4]
const _ejecutarComandoBW=ejecutarComando;
ejecutarComando=function(t){const a=t.replace(/^\//,'').trim().split(/\s+/);
  if(a[0].toLowerCase()==='bedwars'){iniciarBedwars({porEquipo:+a[1]||1});empezar();return;}
  return _ejecutarComandoBW(t);};
