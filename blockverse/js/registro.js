"use strict";
/* =========================================================
   Registro de bloques
   ========================================================= */
const BLOQUES=[], B={aire:0};
function bloque(id,clave,nombre,tex,props={}){
  const t=typeof tex==='string'?{arriba:T[tex],abajo:T[tex],lado:T[tex]}:{arriba:T[tex.arriba],abajo:T[tex.abajo],lado:T[tex.lado]};
  const forma=props.forma||'cubo';
  const cubo=forma==='cubo'||forma==='losa';
  const def=Object.assign({id,clave,nombre,forma,solido:cubo,opaco:cubo&&!props.trans&&forma==='cubo',trans:false,luz:0,
    dureza:1,herr:null,nivel:0,altura:forma==='losa'?.5625:1,resistencia:null,reemplazable:!cubo,inflamable:false},t,props);
  if(def.resistencia===null)def.resistencia=def.dureza===Infinity?3600000:def.dureza*3;
  def.opacidadLuz=props.opacidadLuz!==undefined?props.opacidadLuz:(def.opaco?15:0);
  BLOQUES[id]=def; B[clave]=id;
}
const tx=(arriba,abajo,lado)=>({arriba,abajo,lado});
const sueltaOre=(item,min,max)=>ctx=>{let n=azar(min,max);if(ctx.fortuna)n*=Math.max(1,azar(0,ctx.fortuna+1));return [[item,n]];};

bloque(1,'cesped','Bloque de césped',tx('grassTop','dirt','grassSide'),{dureza:.6,herr:'pala',suelta:2,resistencia:.6});
bloque(2,'tierra','Tierra','dirt',{dureza:.5,herr:'pala',resistencia:.5});
bloque(3,'piedra','Piedra','stone',{dureza:1.5,herr:'pico',nivel:1,suelta:8,resistencia:6});
bloque(4,'tronco','Tronco de roble',tx('logTop','logTop','logSide'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(5,'hojas','Hojas de roble','leaves',{dureza:.2,herr:'azada',trans:true,opaco:false,opacidadLuz:1,inflamable:true,resistencia:.2,
  suelta:ctx=>{const r=[];if(prob(.05*(1+ctx.fortuna*.25)))r.push([88,1]);if(prob(.005*(1+ctx.fortuna)))r.push([205,1]);if(prob(.02))r.push([200,azar(1,2)]);return r;}});
bloque(6,'arena','Arena','sand',{dureza:.5,herr:'pala',gravedad:true,resistencia:.5});
bloque(7,'tablones','Tablones de roble','planks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(8,'roca','Roca','cobble',{dureza:2,herr:'pico',nivel:1,resistencia:6});
bloque(9,'ladrillos','Ladrillos','brick',{dureza:2,herr:'pico',nivel:1,resistencia:6});
bloque(10,'vidrio','Vidrio','glass',{dureza:.3,trans:true,opaco:false,suelta:0,sinSombra:true,resistencia:.3});
bloque(11,'cespedNevado','Césped nevado',tx('snow','dirt','snowSide'),{dureza:.6,herr:'pala',suelta:2,resistencia:.6});
bloque(12,'lecho','Roca madre','bedrock',{dureza:Infinity});
bloque(13,'menaCarbon','Mena de carbón','coalOre',{dureza:3,herr:'pico',nivel:1,suelta:sueltaOre(201,1,1),xp:[0,2]});
bloque(14,'menaHierro','Mena de hierro','ironOre',{dureza:3,herr:'pico',nivel:2,suelta:sueltaOre(202,1,1)});
bloque(15,'menaDiamante','Mena de diamante','diamondOre',{dureza:3,herr:'pico',nivel:3,suelta:sueltaOre(204,1,1),xp:[3,7]});
bloque(16,'mesa','Mesa de trabajo',tx('craftTop','planks','craftSide'),{dureza:2.5,herr:'hacha',inter:'mesa',inflamable:true});
bloque(17,'horno','Horno',tx('furnaceTop','furnaceTop','furnaceFront'),{dureza:3.5,herr:'pico',nivel:1,inter:'horno',resistencia:3.5});
bloque(18,'cofre','Cofre',tx('chestTop','chestTop','chestSide'),{dureza:2.5,herr:'hacha',inter:'cofre'});
bloque(19,'grava','Grava','gravel',{dureza:.6,herr:'pala',gravedad:true,resistencia:.6,
  suelta:ctx=>[[prob(ctx.fortuna?[.1,.14,.25,1][ctx.fortuna]:.1)?218:19,1]]});
bloque(20,'pizarra','Pizarra profunda',tx('deepslateTop','deepslateTop','deepslate'),{dureza:3,herr:'pico',nivel:1,resistencia:6});
bloque(21,'menaOro','Mena de oro','goldOre',{dureza:3,herr:'pico',nivel:3,suelta:sueltaOre(209,1,1)});
bloque(22,'menaRedstone','Mena de redstone','redstoneOre',{dureza:3,herr:'pico',nivel:3,suelta:sueltaOre(214,4,5),xp:[1,5]});
bloque(23,'menaLapis','Mena de lapislázuli','lapisOre',{dureza:3,herr:'pico',nivel:2,suelta:sueltaOre(215,4,9),xp:[2,5]});
bloque(24,'menaEsmeralda','Mena de esmeralda','emeraldOre',{dureza:3,herr:'pico',nivel:3,suelta:sueltaOre(216,1,1),xp:[3,7]});
bloque(25,'menaCobre','Mena de cobre','copperOre',{dureza:3,herr:'pico',nivel:2,suelta:sueltaOre(212,2,5)});
bloque(26,'pCarbon','Mena de carbón de pizarra','dsCoal',{dureza:4.5,herr:'pico',nivel:1,suelta:sueltaOre(201,1,1),xp:[0,2]});
bloque(27,'pHierro','Mena de hierro de pizarra','dsIron',{dureza:4.5,herr:'pico',nivel:2,suelta:sueltaOre(202,1,1)});
bloque(28,'pOro','Mena de oro de pizarra','dsGold',{dureza:4.5,herr:'pico',nivel:3,suelta:sueltaOre(209,1,1)});
bloque(29,'pRedstone','Mena de redstone de pizarra','dsRedstone',{dureza:4.5,herr:'pico',nivel:3,suelta:sueltaOre(214,4,5),xp:[1,5]});
bloque(30,'pLapis','Mena de lapislázuli de pizarra','dsLapis',{dureza:4.5,herr:'pico',nivel:2,suelta:sueltaOre(215,4,9),xp:[2,5]});
bloque(31,'pDiamante','Mena de diamante de pizarra','dsDiamond',{dureza:4.5,herr:'pico',nivel:3,suelta:sueltaOre(204,1,1),xp:[3,7]});
bloque(32,'pCobre','Mena de cobre de pizarra','dsCopper',{dureza:4.5,herr:'pico',nivel:2,suelta:sueltaOre(212,2,5)});
bloque(33,'obsidiana','Obsidiana','obsidian',{dureza:50,herr:'pico',nivel:4,resistencia:1200});
bloque(34,'antorcha','Antorcha','torch',{forma:'antorcha',dureza:0,luz:14,resistencia:0});
bloque(35,'cama','Cama',tx('bedTop','planks','bedSide'),{forma:'losa',dureza:.2,inter:'cama',opaco:false,inflamable:true});
bloque(36,'tnt','Dinamita',tx('tntTop','tntTop','tntSide'),{dureza:0,resistencia:0,inflamable:true});
bloque(37,'lana','Lana blanca','wool',{dureza:.8,inflamable:true,resistencia:.8});
bloque(38,'hierbaAlta','Hierba alta','tallGrass',{forma:'cruz',dureza:0,inflamable:true,suelta:ctx=>prob(.125)?[[235,1]]:[]});
bloque(39,'florAmarilla','Diente de león','flowerY',{forma:'cruz',dureza:0});
bloque(40,'florRoja','Amapola','flowerR',{forma:'cruz',dureza:0});
for(let e=0;e<8;e++)bloque(41+e,'trigo'+e,'Trigo','wheat'+e,{forma:'cruz',dureza:0,
  suelta:e===7?()=>[[236,1],[235,azar(0,3)]]:()=>[[235,1]]});
bloque(49,'cultivo','Tierra de cultivo',tx('farmland','dirt','dirt'),{dureza:.6,herr:'pala',suelta:2,altura:.9375});
bloque(50,'cactus','Cactus',tx('cactusTop','cactusTop','cactusSide'),{dureza:.4,trans:true,opaco:false,resistencia:.4});
bloque(51,'hielo','Hielo','ice',{dureza:.5,herr:'pico',opaco:false,trans:true,opacidadLuz:2,suelta:0,resbala:true,resistencia:.5});
bloque(52,'arenisca','Arenisca',tx('sandstoneTop','sandstoneTop','sandstoneSide'),{dureza:.8,herr:'pico',nivel:1,resistencia:.8});
bloque(53,'agua','Agua','water',{forma:'liquido',dureza:Infinity,opacidadLuz:2,liquido:'agua',nivelL:0});
for(let k=1;k<=7;k++)bloque(53+k,'agua'+k,'Agua','water',{forma:'liquido',dureza:Infinity,opacidadLuz:2,liquido:'agua',nivelL:k});
bloque(61,'lava','Lava','lava',{forma:'liquido',dureza:Infinity,luz:15,liquido:'lava',nivelL:0});
for(let k=1;k<=7;k++)bloque(61+k,'lava'+k,'Lava','lava',{forma:'liquido',dureza:Infinity,luz:15,liquido:'lava',nivelL:k});
bloque(69,'netherrack','Netherrack','netherrack',{dureza:.4,herr:'pico',nivel:1,resistencia:.4,eterno:true});
bloque(70,'arenaAlmas','Arena de almas','soulSand',{dureza:.5,herr:'pala',resistencia:.5,lento:true});
bloque(71,'piedraLuminosa','Piedra luminosa','glowstone',{dureza:.3,luz:15,resistencia:.3,
  suelta:ctx=>[[246,Math.min(4,azar(2,4)+azar(0,ctx.fortuna))]]});
bloque(72,'menaCuarzo','Mena de cuarzo del Nether','quartzOre',{dureza:3,herr:'pico',nivel:1,suelta:sueltaOre(217,1,1),xp:[2,5]});
bloque(73,'ladrilloNether','Ladrillos del Nether','netherBrick',{dureza:2,herr:'pico',nivel:1,resistencia:6});
bloque(74,'portalNether','Portal del Nether','netherPortal',{forma:'portal',dureza:Infinity,luz:11,resistencia:0});
bloque(75,'piedraEnd','Piedra del End','endStone',{dureza:3,herr:'pico',nivel:1,resistencia:9});
bloque(76,'marcoEnd','Marco del portal del End',tx('endFrameTop','endStone','endFrameSide'),{dureza:Infinity,altura:.8125});
bloque(77,'marcoEndOjo','Marco del portal del End',tx('endFrameTopEye','endStone','endFrameSide'),{dureza:Infinity,luz:1,altura:.8125});
bloque(78,'portalEnd','Portal del End','endPortal',{forma:'portal',dureza:Infinity,luz:15,resistencia:3600000});
bloque(79,'ladrillosPiedra','Ladrillos de piedra','stoneBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(80,'ladrillosMusgo','Ladrillos de piedra musgosos','mossyStoneBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(81,'bloqueHierro','Bloque de hierro','ironBlock',{dureza:5,herr:'pico',nivel:2,resistencia:6});
bloque(82,'bloqueOro','Bloque de oro','goldBlock',{dureza:3,herr:'pico',nivel:3,resistencia:6});
bloque(83,'bloqueDiamante','Bloque de diamante','diamondBlock',{dureza:5,herr:'pico',nivel:3,resistencia:6});
bloque(84,'bloqueCarbon','Bloque de carbón','coalBlock',{dureza:5,herr:'pico',nivel:1,resistencia:6});
bloque(85,'huevoDragon','Huevo de dragón','dragonEgg',{dureza:3,luz:1,resistencia:9,opaco:false});
bloque(86,'fuego','Fuego','fire',{forma:'cruz',dureza:0,luz:15,suelta:0});
bloque(87,'menaOroNether','Mena de oro del Nether','netherGoldOre',{dureza:3,herr:'pico',nivel:1,suelta:sueltaOre(211,2,6),xp:[0,1]});
bloque(88,'brote','Brote de roble','sapling',{forma:'cruz',dureza:0});
bloque(89,'cana','Caña de azúcar','sugarCane',{forma:'cruz',dureza:0});
bloque(90,'mesaEncantar','Mesa de encantamientos',tx('enchantTop','obsidian','enchantSide'),{forma:'losa',altura:.75,dureza:5,herr:'pico',nivel:1,inter:'encantar',luz:7,resistencia:1200,opaco:false});
bloque(91,'generador','Generador de criaturas','spawner',{dureza:5,herr:'pico',nivel:1,trans:true,opaco:false,suelta:0,xp:[15,43]});
bloque(92,'bloqueNieve','Bloque de nieve','snow',{dureza:.2,herr:'pala',resistencia:.2});
bloque(93,'heno','Bala de heno',tx('hayTop','hayTop','hayTop'),{dureza:.5,herr:'azada',inflamable:true});
const NB=BLOQUES.length;
const SOLIDO=new Uint8Array(NB), OPACO=new Uint8Array(NB), TRANS=new Uint8Array(NB), LUZB=new Uint8Array(NB),
      OPAC_LUZ=new Uint8Array(NB), OCLUYE=new Uint8Array(NB), FORMA=new Uint8Array(NB), REEMPL=new Uint8Array(NB);
const FORMAS={cubo:0,losa:1,cruz:2,antorcha:3,liquido:4,portal:5};
BLOQUES.forEach((b,i)=>{if(!b)return;SOLIDO[i]=b.solido?1:0;OPACO[i]=b.opaco?1:0;TRANS[i]=b.trans?1:0;LUZB[i]=b.luz;
  OPAC_LUZ[i]=b.opacidadLuz;OCLUYE[i]=(b.forma==='cubo'&&!b.sinSombra)?1:0;FORMA[i]=FORMAS[b.forma];REEMPL[i]=b.reemplazable?1:0;});
REEMPL[0]=1;
const esAgua=id=>id>=53&&id<=60, esLava=id=>id>=61&&id<=68, esLiquido=id=>id>=53&&id<=68;
const nivelLiquido=id=>BLOQUES[id].nivelL;

/* =========================================================
   Registro de objetos
   ========================================================= */
const ITEMS=[], I={};
BLOQUES.forEach((b,i)=>{if(b&&!b.liquido&&b.forma!=='portal'&&i!==86&&!(i>=41&&i<=48))ITEMS[i]={nombre:b.nombre,bloque:true,max:64,clave:b.clave};});
function item(id,clave,nombre,props){ITEMS[id]=Object.assign({nombre,max:64,clave},props);I[clave]=id;}
item(200,'palo','Palo'); item(201,'carbon','Carbón'); item(202,'hierroBruto','Hierro en bruto'); item(203,'lingoteHierro','Lingote de hierro');
item(204,'diamante','Diamante'); item(205,'manzana','Manzana',{comida:[4,2.4]});
item(206,'cerdoCrudo','Chuleta de cerdo cruda',{comida:[3,1.8]}); item(207,'cerdoAsado','Chuleta de cerdo cocinada',{comida:[8,12.8]});
item(208,'carnePodrida','Carne podrida',{comida:[4,.8],efecto:['hambre',30,.8]});
item(209,'oroBruto','Oro en bruto'); item(210,'lingoteOro','Lingote de oro'); item(211,'pepitaOro','Pepita de oro');
item(212,'cobreBruto','Cobre en bruto'); item(213,'lingoteCobre','Lingote de cobre'); item(214,'redstone','Polvo de redstone');
item(215,'lapis','Lapislázuli'); item(216,'esmeralda','Esmeralda'); item(217,'cuarzo','Cuarzo del Nether'); item(218,'pedernal','Pedernal');
item(219,'cuerda','Cuerda'); item(220,'pluma','Pluma'); item(221,'polvora','Pólvora'); item(222,'hueso','Hueso'); item(223,'harinaHueso','Polvo de hueso');
item(224,'flecha','Flecha'); item(225,'arco','Arco',{max:1,dur:384,tipoHerr:'arco'});
item(226,'cubo','Cubo',{max:16}); item(227,'cuboAgua','Cubo de agua',{max:1}); item(228,'cuboLava','Cubo de lava',{max:1});
item(229,'mechero','Mechero',{max:1,dur:64,tipoHerr:'mechero'});
item(230,'varaBlaze','Vara de blaze'); item(231,'polvoBlaze','Polvo de blaze'); item(232,'perlaEnder','Perla de ender',{max:16});
item(233,'ojoEnder','Ojo de ender'); item(234,'lagrimaGhast','Lágrima de ghast'); item(235,'semillas','Semillas de trigo'); item(236,'trigo','Trigo');
item(237,'pan','Pan',{comida:[5,6]}); item(238,'polloCrudo','Pollo crudo',{comida:[2,1.2],efecto:['hambre',30,.3]}); item(239,'polloAsado','Pollo asado',{comida:[6,7.2]});
item(240,'corderoCrudo','Cordero crudo',{comida:[2,1.2]}); item(241,'corderoAsado','Cordero asado',{comida:[6,9.6]});
item(242,'manzanaDorada','Manzana dorada',{comida:[4,9.6],efecto:['regeneracion',5,1],siempre:true});
item(243,'cuero','Cuero'); item(244,'resCruda','Filete crudo',{comida:[3,1.8]}); item(245,'filete','Filete',{comida:[8,12.8]});
item(246,'polvoLuminoso','Polvo de piedra luminosa'); item(247,'papel','Papel'); item(248,'libro','Libro');
item(249,'ojoArana','Ojo de araña',{comida:[2,3.2],efecto:['veneno',4,1]});

const MATS=[
  {n:'madera',nivel:1,vel:2,dur:59,enc:15,col:[176,138,82]},
  {n:'piedra',nivel:2,vel:4,dur:131,enc:5,col:[132,132,134]},
  {n:'hierro',nivel:3,vel:6,dur:250,enc:14,col:[226,226,226]},
  {n:'oro',nivel:1,vel:12,dur:32,enc:22,col:[250,214,70]},
  {n:'diamante',nivel:4,vel:8,dur:1561,enc:10,col:[84,232,222]},
];
const HERRS=[
  {tipo:'pico',nom:'Pico',dano:[2,3,4,2,5],cad:[1.2,1.2,1.2,1.2,1.2]},
  {tipo:'hacha',nom:'Hacha',dano:[7,9,9,7,9],cad:[.8,.8,.9,1,1]},
  {tipo:'pala',nom:'Pala',dano:[2.5,3.5,4.5,2.5,5.5],cad:[1,1,1,1,1]},
  {tipo:'espada',nom:'Espada',dano:[4,5,6,4,7],cad:[1.6,1.6,1.6,1.6,1.6]},
  {tipo:'azada',nom:'Azada',dano:[1,1,1,1,1],cad:[1,2,3,1,4]},
];
HERRS.forEach((h,ti)=>MATS.forEach((m,k)=>item(300+ti*10+k,h.tipo+'_'+m.n,`${h.nom} de ${m.n}`,
  {max:1,dur:m.dur,tipoHerr:h.tipo,herr:{tipo:h.tipo,nivel:m.nivel,vel:m.vel,dano:h.dano[k],cad:h.cad[k],mat:k,enc:m.enc}})));
const ARM_MATS=[
  {n:'cuero',mult:5,def:[1,3,2,1],dureza:0,enc:15,col:[150,94,56]},
  {n:'oro',mult:7,def:[2,5,3,1],dureza:0,enc:25,col:[250,214,70]},
  {n:'hierro',mult:15,def:[2,6,5,2],dureza:0,enc:9,col:[216,216,216]},
  {n:'diamante',mult:33,def:[3,8,6,3],dureza:2,enc:10,col:[84,232,222]},
];
const PIEZAS=[{n:'casco',nom:'Casco',dur:11},{n:'pechera',nom:'Pechera',dur:16},{n:'pantalones',nom:'Pantalones',dur:15},{n:'botas',nom:'Botas',dur:13}];
PIEZAS.forEach((p,pi)=>ARM_MATS.forEach((m,k)=>item(400+pi*10+k,p.n+'_'+m.n,`${p.nom} de ${m.n}`,
  {max:1,dur:p.dur*m.mult,tipoHerr:'armadura',armadura:{pieza:pi,def:m.def[pi],dureza:m.dureza,mat:k,enc:m.enc}})));
const maxPila=id=>ITEMS[id]?ITEMS[id].max:64;
function crearPila(id,n=1){const it=ITEMS[id];return it&&it.dur?{id,n:1,dur:it.dur}:{id,n};}
const mismaPila=(a,b)=>a&&b&&a.id===b.id&&maxPila(a.id)>1&&!a.enc&&!b.enc;

/* ---------- Encantamientos ---------- */
const ENCANTOS={
  eficiencia:{nombre:'Eficiencia',max:5,para:['pico','hacha','pala','azada']},
  irrompibilidad:{nombre:'Irrompibilidad',max:3,para:['pico','hacha','pala','azada','espada','arco','armadura']},
  fortuna:{nombre:'Fortuna',max:3,para:['pico','hacha','pala','azada'],excluye:'toqueSeda'},
  toqueSeda:{nombre:'Toque de seda',max:1,para:['pico','hacha','pala','azada'],excluye:'fortuna'},
  filo:{nombre:'Filo',max:5,para:['espada','hacha']},
  retroceso:{nombre:'Empuje',max:2,para:['espada']},
  aspectoIgneo:{nombre:'Aspecto ígneo',max:2,para:['espada']},
  botin:{nombre:'Botín',max:3,para:['espada']},
  poder:{nombre:'Poder',max:5,para:['arco']},
  llama:{nombre:'Fuego',max:1,para:['arco']},
  infinidad:{nombre:'Infinidad',max:1,para:['arco']},
  proteccion:{nombre:'Protección',max:4,para:['armadura']},
  caidaPluma:{nombre:'Caída de pluma',max:4,para:['botas']},
  respiracion:{nombre:'Respiración',max:3,para:['casco']},
};
const ROMANOS=['','I','II','III','IV','V'];
const nivelEnc=(p,k)=>p&&p.enc&&p.enc[k]||0;
function categoriasItem(id){
  const it=ITEMS[id]; if(!it)return [];
  if(it.armadura){const c=['armadura'];if(it.armadura.pieza===0)c.push('casco');if(it.armadura.pieza===3)c.push('botas');return c;}
  if(it.tipoHerr)return [it.tipoHerr];
  return [];
}
function encantabilidad(id){const it=ITEMS[id];return it.herr?it.herr.enc:it.armadura?it.armadura.enc:it.tipoHerr==='arco'?1:0;}

/* =========================================================
   Recetas
   ========================================================= */
const RECETAS=[];
function receta(patron,clave,id,n=1){RECETAS.push({patron,clave,id,n});}
function recetaSin(ingredientes,id,n=1){RECETAS.push({sin:ingredientes.slice().sort((a,b)=>a-b),id,n});}
recetaSin([B.tronco],B.tablones,4);
receta(['P','P'],{P:B.tablones},I.palo,4);
receta(['PP','PP'],{P:B.tablones},B.mesa);
receta(['PPP','P.P','PPP'],{P:B.tablones},B.cofre);
receta(['CCC','C.C','CCC'],{C:B.roca},B.horno);
receta(['C','S'],{C:I.carbon,S:I.palo},B.antorcha,4);
receta(['SS','SS'],{S:B.piedra},B.ladrillosPiedra,4);
receta(['SS','SS'],{S:B.arena},B.arenisca);
receta(['GSG','SGS','GSG'],{G:I.polvora,S:B.arena},B.tnt);
receta(['LLL','PPP'],{L:B.lana,P:B.tablones},B.cama);
receta(['CC','CC'],{C:I.cuerda},B.lana);
receta(['GG','GG'],{G:I.polvoLuminoso},B.piedraLuminosa);
receta(['CCC'],{C:B.cana},I.papel,3);
recetaSin([I.papel,I.papel,I.papel,I.cuero],I.libro);
receta(['.L.','DOD','OOO'],{L:I.libro,D:I.diamante,O:B.obsidiana},B.mesaEncantar);
receta(['.SC','S.C','.SC'],{S:I.palo,C:I.cuerda},I.arco);
receta(['P','S','F'],{P:I.pedernal,S:I.palo,F:I.pluma},I.flecha,4);
receta(['I.I','.I.'],{I:I.lingoteHierro},I.cubo);
recetaSin([I.lingoteHierro,I.pedernal],I.mechero);
receta(['TTT'],{T:I.trigo},I.pan);
receta(['TTT','TTT','TTT'],{T:I.trigo},B.heno);
recetaSin([B.heno],I.trigo,9);
receta(['GGG','GAG','GGG'],{G:I.lingoteOro,A:I.manzana},I.manzanaDorada);
recetaSin([I.varaBlaze],I.polvoBlaze,2);
recetaSin([I.polvoBlaze,I.perlaEnder],I.ojoEnder);
recetaSin([I.hueso],I.harinaHueso,3);
receta(['NNN','NNN','NNN'],{N:I.pepitaOro},I.lingoteOro);
recetaSin([I.lingoteOro],I.pepitaOro,9);
[[I.lingoteHierro,B.bloqueHierro],[I.lingoteOro,B.bloqueOro],[I.diamante,B.bloqueDiamante],[I.carbon,B.bloqueCarbon]].forEach(([a,b])=>{
  receta(['MMM','MMM','MMM'],{M:a},b); recetaSin([b],a,9);});
[B.tablones,B.roca,I.lingoteHierro,I.lingoteOro,I.diamante].forEach((m,k)=>{const c={M:m,S:I.palo};
  receta(['MMM','.S.','.S.'],c,300+k); receta(['MM','MS','.S'],c,310+k);
  receta(['M','S','S'],c,320+k); receta(['M','M','S'],c,330+k); receta(['MM','.S','.S'],c,340+k);});
[I.cuero,I.lingoteOro,I.lingoteHierro,I.diamante].forEach((m,k)=>{const c={M:m};
  receta(['MMM','M.M'],c,400+k); receta(['M.M','MMM','MMM'],c,410+k);
  receta(['MMM','M.M','M.M'],c,420+k); receta(['M.M','M.M'],c,430+k);});

function buscarReceta(grid,w){
  const ids=grid.filter(Boolean);
  if(!ids.length)return null;
  const orden=ids.slice().sort((a,b)=>a-b);
  let x0=w,x1=-1,y0=w,y1=-1;
  for(let y=0;y<w;y++)for(let x=0;x<w;x++)if(grid[y*w+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const gw=x1-x0+1, gh=y1-y0+1;
  for(const r of RECETAS){
    if(r.sin){if(r.sin.length===orden.length&&r.sin.every((v,i)=>v===orden[i]))return r;continue;}
    if(r.patron.length!==gh||r.patron[0].length!==gw)continue;
    for(const espejo of [false,true]){
      let ok=true;
      for(let y=0;y<gh&&ok;y++)for(let x=0;x<gw;x++){
        const ch=r.patron[y][espejo?gw-1-x:x], quiere=ch==='.'?0:r.clave[ch];
        if(grid[(y+y0)*w+x+x0]!==quiere){ok=false;break;}}
      if(ok)return r;}
  }
  return null;
}
const FUNDIR={
  [I.hierroBruto]:I.lingoteHierro,[I.oroBruto]:I.lingoteOro,[I.cobreBruto]:I.lingoteCobre,
  [B.menaHierro]:I.lingoteHierro,[B.menaOro]:I.lingoteOro,[B.menaCobre]:I.lingoteCobre,[B.menaDiamante]:I.diamante,
  [B.menaCarbon]:I.carbon,[B.menaLapis]:I.lapis,[B.menaRedstone]:I.redstone,[B.menaEsmeralda]:I.esmeralda,[B.menaCuarzo]:I.cuarzo,
  [B.pHierro]:I.lingoteHierro,[B.pOro]:I.lingoteOro,[B.pCobre]:I.lingoteCobre,[B.pDiamante]:I.diamante,
  [B.roca]:B.piedra,[B.arena]:B.vidrio,[B.tronco]:I.carbon,[B.cactus]:B.cactus,
  [I.cerdoCrudo]:I.cerdoAsado,[I.resCruda]:I.filete,[I.polloCrudo]:I.polloAsado,[I.corderoCrudo]:I.corderoAsado,
};
const COMBUSTIBLE={[I.carbon]:80,[B.bloqueCarbon]:800,[I.cuboLava]:1000,[I.varaBlaze]:120,[B.tablones]:15,[B.tronco]:15,
  [I.palo]:5,[B.mesa]:15,[B.cofre]:15,[B.brote]:5,[B.lana]:5,[I.arco]:15,[B.heno]:5,300:10,310:10,320:10,330:10,340:10};
const TIEMPO_FUNDIR=10;
