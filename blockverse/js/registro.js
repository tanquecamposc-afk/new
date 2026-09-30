"use strict";
/* =========================================================
   Registro de bloques
   ========================================================= */
const BLOQUES=[], B={aire:0};
function bloque(id,clave,nombre,tex,props={}){
  const t=typeof tex==='string'?{arriba:T[tex],abajo:T[tex],lado:T[tex]}:{arriba:T[tex.arriba],abajo:T[tex.abajo],lado:T[tex.lado]};
  const forma=props.forma||'cubo';
  const cubo=forma==='cubo'||forma==='losa'||forma==='cajas'||forma==='conecta';
  if(forma==='cable'||forma==='riel')props=Object.assign({solido:false,reemplazable:false},props);
  const def=Object.assign({id,clave,nombre,forma,solido:cubo,opaco:cubo&&!props.trans&&forma==='cubo',trans:false,luz:0,
    dureza:1,herr:null,nivel:0,altura:forma==='losa'?.5625:1,resistencia:null,reemplazable:!cubo,inflamable:false},t,props);
  if(def.resistencia===null)def.resistencia=def.dureza===Infinity?3600000:def.dureza*3;
  def.opacidadLuz=props.opacidadLuz!==undefined?props.opacidadLuz:(def.opaco?15:0);
  BLOQUES[id]=def; B[clave]=id;
}
const tx=(arriba,abajo,lado)=>({arriba,abajo,lado});
const sueltaOre=(item,min,max)=>ctx=>{let n=azar(min,max);if(ctx.fortuna)n*=Math.max(1,azar(0,ctx.fortuna+1));return [[item,n]];};

bloque(1,'cesped','Bloque de césped',tx('grassTop','dirt','grassSide'),{dureza:.6,herr:'pala',suelta:2,resistencia:.6,tinte:'pasto'});
bloque(2,'tierra','Tierra','dirt',{dureza:.5,herr:'pala',resistencia:.5});
bloque(3,'piedra','Piedra','stone',{dureza:1.5,herr:'pico',nivel:1,suelta:8,resistencia:6});
bloque(4,'tronco','Tronco de roble',tx('logTop','logTop','logSide'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
const sueltaHojas=(brote,manzana)=>ctx=>{const r=[];if(prob(.05*(1+ctx.fortuna*.25)))r.push([brote,1]);if(manzana&&prob(.005*(1+ctx.fortuna)))r.push([205,1]);if(prob(.02))r.push([200,azar(1,2)]);return r;};
bloque(5,'hojas','Hojas de roble','leaves',{dureza:.2,herr:'azada',trans:true,opaco:false,opacidadLuz:1,inflamable:true,resistencia:.2,tinte:'follaje',
  suelta:sueltaHojas(88,true)});
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
bloque(18,'cofre','Cofre',tx('chestTop','chestTop','chestSide'),{forma:'cajas',cajas:[[.0625,0,.0625,.9375,.875,.9375]],opaco:false,dureza:2.5,herr:'hacha',inter:'cofre'});
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
bloque(38,'hierbaAlta','Hierba alta','tallGrass',{forma:'cruz',dureza:0,inflamable:true,tinte:'pasto',suelta:ctx=>prob(.125)?[[235,1]]:[]});
bloque(39,'florAmarilla','Diente de león','flowerY',{forma:'cruz',dureza:0});
bloque(40,'florRoja','Amapola','flowerR',{forma:'cruz',dureza:0});
for(let e=0;e<8;e++)bloque(41+e,'trigo'+e,'Trigo','wheat'+e,{forma:'cruz',dureza:0,
  suelta:e===7?()=>[[236,1],[235,azar(0,3)]]:()=>[[235,1]]});
bloque(49,'cultivo','Tierra de cultivo',tx('farmland','dirt','dirt'),{dureza:.6,herr:'pala',suelta:2,altura:.9375});
bloque(50,'cactus','Cactus',tx('cactusTop','cactusTop','cactusSide'),{dureza:.4,trans:true,opaco:false,resistencia:.4});
bloque(51,'hielo','Hielo','ice',{dureza:.5,herr:'pico',opaco:false,trans:true,opacidadLuz:2,suelta:0,resbala:true,resistencia:.5});
bloque(52,'arenisca','Arenisca',tx('sandstoneTop','sandstoneTop','sandstoneSide'),{dureza:.8,herr:'pico',nivel:1,resistencia:.8});
bloque(53,'agua','Agua','water',{forma:'liquido',dureza:Infinity,opacidadLuz:2,liquido:'agua',nivelL:0,tinte:'agua'});
for(let k=1;k<=7;k++)bloque(53+k,'agua'+k,'Agua','water',{forma:'liquido',dureza:Infinity,opacidadLuz:2,liquido:'agua',nivelL:k,tinte:'agua'});
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
bloque(93,'heno','Bala de heno',tx('hayTop','hayTop','haySide'),{dureza:.5,herr:'azada',inflamable:true});
/* ---------- Bloques nuevos ---------- */
const DIRF=[[0,-1],[1,0],[0,1],[-1,0]];
const cajaLado=(f,g)=>[[0,0,0,1,1,g],[1-g,0,0,1,1,1],[0,0,1-g,1,1,1],[0,0,0,g,1,1]][f];
const cajasEscalera=f=>[[0,0,0,1,.5,1],[[0,.5,0,1,1,.5],[.5,.5,0,1,1,1],[0,.5,.5,1,1,1],[0,.5,0,.5,1,1]][f]];
const cajaAntorchaPared=f=>{const a=7/16,b=9/16;return [[a,.2,0,b,.82,.14],[.86,.2,a,1,.82,b],[a,.2,.86,b,.82,1],[0,.2,a,.14,.82,b]][f];};
bloque(94,'troncoAbedul','Tronco de abedul',tx('birchTop','birchTop','birchSide'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(95,'troncoAbeto','Tronco de abeto',tx('spruceTop','spruceTop','spruceSide'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(96,'troncoJungla','Tronco de la jungla',tx('jungleTop','jungleTop','jungleSide'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(97,'troncoAcacia','Tronco de acacia',tx('acaciaTop','acaciaTop','acaciaSide'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
const propHojas={dureza:.2,herr:'azada',trans:true,opaco:false,opacidadLuz:1,inflamable:true,resistencia:.2};
bloque(98,'hojasAbedul','Hojas de abedul','leaves',Object.assign({tinte:'abedul',suelta:sueltaHojas(102,false)},propHojas));
bloque(99,'hojasAbeto','Hojas de abeto','spruceLeaves',Object.assign({tinte:'abeto',suelta:sueltaHojas(103,false)},propHojas));
bloque(100,'hojasJungla','Hojas de la jungla','leaves',Object.assign({tinte:'follaje',suelta:sueltaHojas(104,false)},propHojas));
bloque(101,'hojasAcacia','Hojas de acacia','leaves',Object.assign({tinte:'follaje',suelta:sueltaHojas(105,false)},propHojas));
bloque(102,'broteAbedul','Brote de abedul','birchSapling',{forma:'cruz',dureza:0});
bloque(103,'broteAbeto','Brote de abeto','spruceSapling',{forma:'cruz',dureza:0});
bloque(104,'broteJungla','Brote de la jungla','jungleSapling',{forma:'cruz',dureza:0});
bloque(105,'broteAcacia','Brote de acacia','acaciaSapling',{forma:'cruz',dureza:0});
bloque(106,'helecho','Helecho','fern',{forma:'cruz',dureza:0,inflamable:true,tinte:'pasto',suelta:()=>prob(.125)?[[235,1]]:[]});
bloque(107,'arbustoSeco','Arbusto seco','deadBush',{forma:'cruz',dureza:0,inflamable:true,suelta:()=>[[200,azar(0,2)]]});
bloque(108,'aciano','Aciano','cornflower',{forma:'cruz',dureza:0});
bloque(109,'orquidea','Orquídea azul','orchid',{forma:'cruz',dureza:0});
bloque(110,'margarita','Margarita','daisy',{forma:'cruz',dureza:0});
bloque(111,'champinonRojo','Champiñón rojo','mushRed',{forma:'cruz',dureza:0});
bloque(112,'champinonMarron','Champiñón marrón','mushBrown',{forma:'cruz',dureza:0,luz:1});
bloque(113,'calabaza','Calabaza',tx('pumpkinTop','pumpkinTop','pumpkinSide'),{dureza:1,herr:'hacha',resistencia:1});
bloque(114,'linternaCalabaza','Linterna de calabaza',tx('pumpkinTop','pumpkinTop','jackFace'),{dureza:1,herr:'hacha',luz:15,resistencia:1});
bloque(115,'sandia','Sandía',tx('melonTop','melonTop','melonSide'),{dureza:1,herr:'hacha',resistencia:1,suelta:ctx=>[[254,Math.min(9,azar(3,7)+azar(0,ctx.fortuna))]]});
bloque(116,'nenufar','Nenúfar','lilyPad',{forma:'cajas',cajas:[[0,0,0,1,.06,1]],dureza:0,opaco:false,soloArriba:true});
bloque(117,'capaNieve','Capa de nieve','snow',{forma:'cajas',cajas:[[0,0,0,1,.125,1]],dureza:.1,herr:'pala',suelta:0,opaco:false,reemplazable:true});
bloque(118,'arcilla','Arcilla','clay',{dureza:.6,herr:'pala',suelta:()=>[[251,4]],resistencia:.6});
bloque(119,'arenaRoja','Arena roja','redSand',{dureza:.5,herr:'pala',gravedad:true,resistencia:.5});
bloque(120,'terracota','Terracota','terracotta',{dureza:1.25,herr:'pico',nivel:1,resistencia:4.2});
['naranja','amarilla','roja','marrón','blanca','gris claro'].forEach((c,i)=>bloque(121+i,'terracota'+i,'Terracota '+c,'terr'+i,{dureza:1.25,herr:'pico',nivel:1,resistencia:4.2}));
bloque(127,'valla','Valla de roble','planks',{forma:'conecta',conecta:'valla',dureza:2,herr:'hacha',inflamable:true,opaco:false,colAlta:1.5});
bloque(128,'panel','Panel de vidrio','glass',{forma:'conecta',conecta:'panel',dureza:.3,suelta:0,opaco:false,sinSombra:true});
[['escaleraRoca','Escaleras de roca','cobble',129,'pico'],['escaleraMadera','Escaleras de roble','planks',133,'hacha'],['escaleraLadrillos','Escaleras de ladrillos de piedra','stoneBricks',137,'pico']].forEach(([cl,nom,t,base,h])=>{
  for(let f=0;f<4;f++)bloque(base+f,cl+(f||''),nom,t,{forma:'cajas',cajas:cajasEscalera(f),dureza:2,herr:h,nivel:h==='pico'?1:0,opaco:false,orienta:'escalera',base,resistencia:6,suelta:base,inflamable:h==='hacha'});});
[['losaRoca','Losa de roca','cobble','pico'],['losaMadera','Losa de roble','planks','hacha'],['losaPiedra','Losa de piedra','stone','pico'],['losaLadrillos','Losa de ladrillos de piedra','stoneBricks','pico']].forEach(([cl,nom,t,h],i)=>
  bloque(141+i,cl,nom,t,{forma:'cajas',cajas:[[0,0,0,1,.5,1]],dureza:2,herr:h,nivel:h==='pico'?1:0,opaco:false,resistencia:6,inflamable:h==='hacha'}));
for(let f=0;f<4;f++)bloque(145+f,'escaleraMano'+(f||''),'Escalera de mano','ladder',{forma:'cajas',cajas:[cajaLado(f,3/16)],dureza:.4,herr:'hacha',opaco:false,trepable:true,orienta:'pared',base:145,suelta:145,cara:f,inflamable:true});
for(let f=0;f<4;f++)for(let ab=0;ab<2;ab++)for(let m=0;m<2;m++){const id=149+f*4+ab*2+m;
  bloque(id,'puerta'+(id-149||''),'Puerta de roble',m?'doorTop':'doorBottom',{forma:'cajas',cajas:[cajaLado(ab?(f+1)%4:f,3/16)],dureza:3,herr:'hacha',opaco:false,puerta:{f,ab,m},suelta:m?0:255,inflamable:true});}
for(let f=0;f<4;f++)bloque(165+f,'antorchaPared'+(f||''),'Antorcha','torch',{forma:'antorcha',dureza:0,luz:14,suelta:34,cara:f,resistencia:0});
bloque(169,'senda','Camino de tierra',tx('pathTop','dirt','pathSide'),{forma:'cajas',cajas:[[0,0,0,1,15/16,1]],dureza:.65,herr:'pala',opaco:false,suelta:2,resistencia:.65});
bloque(170,'rocaMusgo','Roca musgosa','mossyCobble',{dureza:2,herr:'pico',nivel:1,resistencia:6});
bloque(171,'obsidianaLlorosa','Obsidiana llorosa','cryingObsidian',{dureza:50,herr:'pico',nivel:4,luz:10,resistencia:1200});
bloque(173,'granito','Granito','granite',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(174,'diorita','Diorita','diorite',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(175,'andesita','Andesita','andesite',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(172,'estanteria','Librería',tx('planks','planks','bookshelf'),{dureza:1.5,herr:'hacha',inflamable:true,suelta:()=>[[248,3]],resistencia:1.5});
/* ---------- Nether: biomas ---------- */
bloque(1176,'nilioCarmesi','Nilio carmesí',tx('crimsonNylium','netherrack','crimsonNyliumSide'),{dureza:.4,herr:'pico',nivel:1,suelta:69,resistencia:.4});
bloque(1177,'nilioDistorsionado','Nilio distorsionado',tx('warpedNylium','netherrack','warpedNyliumSide'),{dureza:.4,herr:'pico',nivel:1,suelta:69,resistencia:.4});
bloque(1178,'talloCarmesi','Tallo carmesí',tx('crimsonStemTop','crimsonStemTop','crimsonStem'),{dureza:2,herr:'hacha',resistencia:2});
bloque(1179,'talloDistorsionado','Tallo distorsionado',tx('warpedStemTop','warpedStemTop','warpedStem'),{dureza:2,herr:'hacha',resistencia:2});
bloque(1180,'verrugaBloque','Bloque de verruga del Nether','netherWartBlock',{dureza:1,herr:'azada',resistencia:1});
bloque(1181,'verrugaDistBloque','Bloque de verruga distorsionada','warpedWartBlock',{dureza:1,herr:'azada',resistencia:1});
bloque(1182,'luzHongo','Luz de hongo','shroomlight',{dureza:1,herr:'azada',luz:15,resistencia:1});
bloque(1183,'raicesCarmesi','Raíces carmesí','crimsonRoots',{forma:'cruz',dureza:0});
bloque(1184,'raicesDist','Raíces distorsionadas','warpedRoots',{forma:'cruz',dureza:0});
bloque(1185,'hongoCarmesi','Hongo carmesí','crimsonFungus',{forma:'cruz',dureza:0});
bloque(1186,'hongoDist','Hongo distorsionado','warpedFungus',{forma:'cruz',dureza:0});
bloque(1187,'sueloAlmas','Tierra de almas','soulSoil',{dureza:.5,herr:'pala',resistencia:.5});
bloque(1188,'bloqueHueso','Bloque de hueso',tx('boneTop','boneTop','boneSide'),{dureza:2,herr:'pico',nivel:1,resistencia:2});
bloque(1189,'basalto','Basalto',tx('basaltTop','basaltTop','basaltSide'),{dureza:1.25,herr:'pico',nivel:1,resistencia:4.2});
bloque(1190,'piedraNegra','Piedra negra','blackstone',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1191,'bloqueMagma','Bloque de magma','magma',{dureza:.5,herr:'pico',nivel:1,luz:3,quema:true,resistencia:.5});
for(let e=0;e<4;e++)bloque(1192+e,'verruga'+e,'Verruga del Nether','wart'+e,{forma:'cruz',dureza:0,suelta:e===3?()=>[[515,azar(2,4)]]:()=>[[515,1]]});
bloque(1196,'fuegoAlmas','Fuego de almas','soulFire',{forma:'cruz',dureza:0,luz:10,suelta:0});
/* ---------- Redstone ---------- */
for(let q=0;q<16;q++)bloque(1197+q,'cable'+q,'Polvo de redstone','redstoneDust',{forma:'cable',dureza:0,suelta:214,potencia:q,redstone:'cable'});
bloque(1213,'antorchaR','Antorcha de redstone','redTorchOn',{forma:'antorcha',dureza:0,luz:7,suelta:1213,redstone:'antorcha'});
bloque(1283,'antorchaROff','Antorcha de redstone','redTorchOff',{forma:'antorcha',dureza:0,suelta:1213,redstone:'antorcha'});
bloque(1215,'palanca','Palanca','lever',{forma:'cajas',cajas:[[.3,0,.25,.7,.19,.75],[.46,.19,.3,.54,.7,.42]],solido:false,opaco:false,dureza:.5,suelta:1215,redstone:'palanca',reemplazable:false});
bloque(1216,'palancaOn','Palanca','lever',{forma:'cajas',cajas:[[.3,0,.25,.7,.19,.75],[.46,.19,.58,.54,.7,.7]],solido:false,opaco:false,dureza:.5,suelta:1215,redstone:'palanca',on:true,reemplazable:false});
bloque(1217,'boton','Botón de piedra','stone',{forma:'cajas',cajas:[[.31,0,.37,.69,.12,.63]],solido:false,opaco:false,dureza:.5,suelta:1217,redstone:'boton',reemplazable:false});
bloque(1218,'botonOn','Botón de piedra','stone',{forma:'cajas',cajas:[[.31,0,.37,.69,.05,.63]],solido:false,opaco:false,dureza:.5,suelta:1217,redstone:'boton',on:true,reemplazable:false});
bloque(1219,'placa','Placa de presión de piedra','pressurePlate',{forma:'cajas',cajas:[[.06,0,.06,.94,.06,.94]],solido:false,opaco:false,dureza:.5,suelta:1219,redstone:'placa',reemplazable:false});
bloque(1220,'placaOn','Placa de presión de piedra','pressurePlate',{forma:'cajas',cajas:[[.06,0,.06,.94,.03,.94]],solido:false,opaco:false,dureza:.5,suelta:1219,redstone:'placa',on:true,reemplazable:false});
bloque(1221,'bloqueRedstone','Bloque de redstone','redstoneBlock',{dureza:5,herr:'pico',nivel:1,redstone:'fuente',resistencia:6});
bloque(1222,'lampara','Lámpara de redstone','lampOff',{dureza:.3,redstone:'lampara'});
bloque(1223,'lamparaOn','Lámpara de redstone','lampOn',{dureza:.3,luz:15,suelta:1222,redstone:'lampara'});
// Pistones: dirección 0..5 = -x,+x,-y,+y,-z,+z (orden de las caras)
const OPUESTA=[1,0,3,2,5,4], VEC6=[[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
function cajaHacia(d,desde,hasta){const c=[0,0,0,1,1,1],eje=d>>1,pos=d&1;
  if(pos){c[eje]=desde;c[eje+3]=hasta;}else{c[eje]=1-hasta;c[eje+3]=1-desde;}return c;}
for(const peg of [0,1]){
  const base=1224+peg*18, nom=peg?'Pistón pegajoso':'Pistón', cara=peg?'pistonTopSticky':'pistonTop';
  for(let d=0;d<6;d++){
    const tc=[0,0,0,0,0,0].map((_,k)=>k===d?T[cara]:k===OPUESTA[d]?T.pistonBottom:T.pistonSide);
    bloque(base+d,(peg?'pistonP':'piston')+d,nom,'pistonSide',{texCaras:tc,dureza:1.5,herr:'pico',suelta:base+3,piston:{d,peg,ext:false},redstone:'piston',resistencia:1.5});
    const tcx=tc.slice(); tcx[d]=T.pistonBottom;
    bloque(base+6+d,(peg?'pistonPExt':'pistonExt')+d,nom,'pistonSide',{forma:'cajas',cajas:[cajaHacia(d,0,.75)],texCaras:tcx,dureza:1.5,herr:'pico',opaco:false,suelta:base+3,piston:{d,peg,ext:true},redstone:'piston',resistencia:1.5});
    bloque(base+12+d,(peg?'cabezaP':'cabeza')+d,nom,cara,{forma:'cajas',cajas:[cajaHacia(OPUESTA[d],.75,1),cajaHacia(OPUESTA[d],-.25,.75).map((v,k)=>{const e=d>>1;return (k%3===e)?v:(k<3?.375:.625);})],dureza:1.5,opaco:false,suelta:0,cabezaPiston:{d,peg},resistencia:1.5});
  }
}
// Raíles: salidas en direcciones DIRF (0 N, 1 E, 2 S, 3 O)
const RIELES={1260:[0,2],1261:[1,3],1262:[0,1],1263:[1,2],1264:[2,3],1265:[3,0],1266:[0,2,0],1267:[1,3,1],1268:[2,0,2],1269:[3,1,3],1270:[0,2],1271:[1,3],1272:[0,2],1273:[1,3]};
for(const id in RIELES){const i=+id,prop=i>=1270;
  bloque(i,'riel'+(i-1260||''),prop?'Raíl propulsor':'Raíl',prop?(i>=1272?'railPoweredOn':'railPowered'):(i>=1262&&i<=1265?'railCurve':'rail'),
    {forma:'riel',solido:false,opaco:false,dureza:.7,herr:'pico',suelta:prop?1270:1260,riel:RIELES[id],sube:RIELES[id][2],propulsor:prop,encendido:i>=1272,redstone:prop?'propulsor':undefined});}
/* ---------- Pociones, yunque y End ---------- */
bloque(1274,'soporte','Soporte para pociones','brewingBase',{forma:'cajas',cajas:[[.1,0,.1,.9,.12,.9],[.44,.12,.44,.56,.88,.56]],dureza:.5,herr:'pico',inter:'pociones',luz:1,opaco:false});
bloque(1275,'yunque','Yunque','anvil',{forma:'cajas',cajas:[[.12,0,.12,.88,.25,.88],[.3,.25,.3,.7,.6,.7],[0,.6,.2,1,1,.8]],dureza:5,herr:'pico',nivel:1,gravedad:true,inter:'yunque',opaco:false,resistencia:1200});
bloque(1276,'purpur','Bloque de púrpur','purpur',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1277,'pilarPurpur','Pilar de púrpur','purpurPillar',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1278,'ladrillosEnd','Ladrillos de piedra del End','endBricks',{dureza:3,herr:'pico',nivel:1,resistencia:9});
bloque(1279,'varaEnd','Vara del End','endRod',{forma:'cajas',cajas:[[.44,0,.44,.56,1,.56]],dureza:0,luz:14,opaco:false});
bloque(1280,'portalAcceso','Portal de acceso del End','endGateway',{forma:'portal',dureza:Infinity,luz:15,resistencia:3600000});
bloque(1281,'plantaCoro','Planta coro','chorusPlant',{forma:'cajas',cajas:[[.19,0,.19,.81,1,.81]],dureza:.4,herr:'hacha',suelta:()=>prob(.5)?[[519,1]]:[],opaco:false});
bloque(1282,'florCoro','Flor coro','chorusFlower',{dureza:.4,herr:'hacha'});
/* ---------- 1.19 "The Wild": Deep Dark y manglares ---------- */
bloque(1284,'sculk','Sculk','sculk',{dureza:.2,herr:'azada',suelta:0,xp:[1,1],resistencia:.2});
bloque(1285,'vetaSculk','Veta de sculk','sculkVein',{forma:'cajas',cajas:[[0,0,0,1,.0625,1]],solido:false,opaco:false,reemplazable:true,dureza:.2,herr:'azada',suelta:0});
bloque(1286,'sensorSculk','Sensor de sculk',tx('sculkSensorTop','sculk','sculkSensorSide'),{forma:'cajas',cajas:[[0,0,0,1,.5,1]],opaco:false,dureza:1.5,herr:'azada',luz:1,suelta:0,xp:[5,5],redstone:'sensor'});
bloque(1287,'sensorSculkOn','Sensor de sculk',tx('sculkSensorOn','sculk','sculkSensorSide'),{forma:'cajas',cajas:[[0,0,0,1,.5,1]],opaco:false,dureza:1.5,herr:'azada',luz:6,suelta:0,redstone:'sensor',on:true});
bloque(1288,'chillador','Chillador de sculk',tx('sculkShriekerTop','sculk','sculkShriekerSide'),{forma:'cajas',cajas:[[0,0,0,1,.5,1]],opaco:false,dureza:3,herr:'azada',suelta:0,xp:[5,5]});
bloque(1289,'catalizador','Catalizador de sculk',tx('sculkCatalystTop','sculk','sculkCatalystSide'),{dureza:3,herr:'azada',luz:6,suelta:0,xp:[5,5]});
bloque(1290,'ladrillosPizarra','Ladrillos de pizarra profunda','deepslateBricks',{dureza:3.5,herr:'pico',nivel:1,resistencia:6});
bloque(1291,'baldosasPizarra','Baldosas de pizarra profunda','deepslateTiles',{dureza:3.5,herr:'pico',nivel:1,resistencia:6});
bloque(1292,'pizarraReforzada','Pizarra profunda reforzada',tx('reinforcedTop','reinforcedTop','reinforcedSide'),{dureza:55,suelta:0,resistencia:1200});
bloque(1293,'farolAlmas','Farol de almas','soulLantern',{forma:'cajas',cajas:[[.3,0,.3,.7,.6,.7]],opaco:false,dureza:3.5,herr:'pico',luz:10});
/* ---------- 1.20 "Trails & Tales": cerezos y arqueología ---------- */
bloque(1294,'troncoCerezo','Tronco de cerezo',tx('cherryTop','cherryTop','cherryLog'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(1295,'hojasCerezo','Hojas de cerezo','cherryLeaves',Object.assign({suelta:sueltaHojas(1297,false)},propHojas));
bloque(1296,'tablonesCerezo','Tablones de cerezo','cherryPlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1297,'broteCerezo','Brote de cerezo','cherrySapling',{forma:'cruz',dureza:0});
bloque(1298,'petalos','Pétalos rosas','pinkPetals',{forma:'cajas',cajas:[[0,0,0,1,.0625,1]],solido:false,opaco:false,reemplazable:true,dureza:0,inflamable:true});
bloque(1299,'troncoMangle','Tronco de mangle',tx('mangroveTop','mangroveTop','mangroveLog'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(1300,'hojasMangle','Hojas de mangle','mangroveLeaves',Object.assign({tinte:'follaje',suelta:sueltaHojas(1304,false)},propHojas));
bloque(1301,'raicesMangle','Raíces de mangle','mangroveRoots',{trans:true,opaco:false,opacidadLuz:1,dureza:.7,herr:'hacha',inflamable:true,resistencia:.7});
bloque(1302,'barro','Barro','mud',{dureza:.5,herr:'pala',resistencia:.5});
bloque(1303,'tablonesMangle','Tablones de mangle','mangrovePlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1304,'propagulo','Propágulo de mangle','propagule',{forma:'cruz',dureza:0});
bloque(1305,'ladrillosBarro','Ladrillos de barro','mudBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:3});
bloque(1306,'arenaSospechosa','Arena sospechosa','suspiciousSand',{dureza:.25,herr:'pala',gravedad:true,suelta:0,sospechoso:'arena',resistencia:.25});
bloque(1307,'gravaSospechosa','Grava sospechosa','suspiciousGravel',{dureza:.25,herr:'pala',gravedad:true,suelta:0,sospechoso:'grava',resistencia:.25});
bloque(1308,'vasija','Vasija decorada','decoratedPot',{forma:'cajas',cajas:[[.12,0,.12,.88,.9,.88]],opaco:false,dureza:0,suelta:()=>prob(.4)?[[529+Math.floor(Math.random()*4),1]]:[[250,azar(2,4)]]});
/* ---------- Netherite y herrería ---------- */
bloque(1309,'restosAncestrales','Restos ancestrales',tx('ancientDebrisTop','ancientDebrisTop','ancientDebrisSide'),{dureza:30,herr:'pico',nivel:4,resistencia:1200});
bloque(1310,'bloqueNetherite','Bloque de netherite','netheriteBlock',{dureza:50,herr:'pico',nivel:4,resistencia:1200});
bloque(1311,'mesaHerreria','Mesa de herrería',tx('smithingTop','planks','smithingSide'),{dureza:2.5,herr:'hacha',inter:'herreria',inflamable:true});
/* ---------- 1.21 "Tricky Trials": cámaras de prueba ---------- */
bloque(1312,'toba','Toba','tuff',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1313,'ladrillosToba','Ladrillos de toba','tuffBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1314,'cobreCortado','Cobre cortado','cutCopper',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1315,'bombillaCobre','Bombilla de cobre','copperBulb',{dureza:3,herr:'pico',nivel:2,luz:15,resistencia:6});
bloque(1316,'generadorPruebas','Generador de pruebas','trialSpawner',{trans:true,opaco:false,dureza:50,herr:'pico',suelta:0,luz:6,resistencia:50});
bloque(1317,'generadorPruebasOff','Generador de pruebas','trialSpawnerOff',{trans:true,opaco:false,dureza:50,herr:'pico',suelta:0,resistencia:50});
bloque(1318,'boveda','Bóveda',tx('vault','tuffBricks','vault'),{dureza:50,herr:'pico',suelta:0,luz:6,resistencia:50});
bloque(1319,'bovedaAbierta','Bóveda',tx('vaultOpen','tuffBricks','vaultOpen'),{dureza:50,herr:'pico',suelta:0,resistencia:50});
bloque(1320,'nucleoPesado','Núcleo pesado','heavyCore',{forma:'cajas',cajas:[[.25,0,.25,.75,.5,.75]],opaco:false,dureza:10,herr:'pico',resistencia:1200});
/* ---------- 1.21.4 "The Garden Awakens": jardín pálido ---------- */
bloque(1321,'troncoPalido','Tronco de roble pálido',tx('paleTop','paleTop','paleLog'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(1322,'hojasPalidas','Hojas de roble pálido','paleLeaves',Object.assign({suelta:sueltaHojas(1339,false)},propHojas));
bloque(1323,'tablonesPalidos','Tablones de roble pálido','palePlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1324,'musgoPalido','Bloque de musgo pálido','paleMoss',{dureza:.1,herr:'azada',resistencia:.1});
bloque(1325,'alfombraMusgo','Alfombra de musgo pálido','paleMoss',{forma:'cajas',cajas:[[0,0,0,1,.0625,1]],solido:false,opaco:false,reemplazable:true,dureza:.1});
bloque(1326,'musgoColgante','Musgo pálido colgante','hangingMoss',{forma:'cruz',dureza:0,reemplazable:true});
bloque(1327,'corazonCreaking','Corazón de creaking',tx('paleTop','paleTop','creakingHeart'),{dureza:10,herr:'hacha',suelta:()=>[[543,azar(1,3)]],resistencia:10});
bloque(1328,'corazonCreakingOn','Corazón de creaking',tx('paleTop','paleTop','creakingHeartOn'),{dureza:10,herr:'hacha',luz:6,suelta:()=>[[543,azar(1,3)]],resistencia:10});
bloque(1329,'floresOjo','Flor de ojo cerrada','eyeblossomClosed',{forma:'cruz',dureza:0});
bloque(1330,'floresOjoOn','Flor de ojo abierta','eyeblossomOpen',{forma:'cruz',dureza:0,luz:4,suelta:1329});
bloque(1331,'bloqueResina','Bloque de resina','resinBlock',{dureza:0,resistencia:0});
bloque(1332,'ladrillosResina','Ladrillos de resina','resinBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
/* ---------- 1.21.5 "Spring to Life" ---------- */
bloque(1333,'hojarasca','Hojarasca','leafLitter',{forma:'cajas',cajas:[[0,0,0,1,.0625,1]],solido:false,opaco:false,reemplazable:true,dureza:0,inflamable:true});
bloque(1334,'floresSilvestres','Flores silvestres','wildflowers',{forma:'cajas',cajas:[[0,0,0,1,.0625,1]],solido:false,opaco:false,reemplazable:true,dureza:0});
bloque(1335,'arbustoLuciernagas','Arbusto de luciérnagas','fireflyBush',{forma:'cruz',dureza:0,luz:2});
bloque(1336,'arbusto','Arbusto','bush',{forma:'cruz',dureza:0,tinte:'pasto',reemplazable:true});
/* ---------- 1.21.6 "Chase the Skies" ---------- */
bloque(1337,'ghastSeco','Ghast seco','driedGhast',{forma:'cajas',cajas:[[.12,0,.12,.88,.8,.88]],opaco:false,dureza:0});
/* ---------- 1.21.9 "The Copper Age" ---------- */
bloque(1338,'cofreCobre','Cofre de cobre',tx('copperChestTop','copperChestTop','copperChestSide'),{dureza:3,herr:'pico',inter:'cofre'});
/* ---------- Bloques de colores ---------- */
const LANA_COLOR=[], HORMIGON=[], VIDRIO_COLOR=[], ALFOMBRA=[];
COLORES16.forEach(([cl,m,f],k)=>{
  if(k>0){bloque(1339+k,'lana_'+cl,'Lana '+f,'lana_'+cl,{dureza:.8,inflamable:true,resistencia:.8});LANA_COLOR[k]=1339+k;}else LANA_COLOR[0]=37;
  bloque(1355+k,'hormigon_'+cl,'Hormigón '+m,'hormigon_'+cl,{dureza:1.8,herr:'pico',nivel:1,resistencia:1.8});HORMIGON[k]=1355+k;
  bloque(1371+k,'vidrio_'+cl,'Vidrio tintado '+m,'vidrio_'+cl,{dureza:.3,trans:true,opaco:false,suelta:0,sinSombra:true,resistencia:.3});VIDRIO_COLOR[k]=1371+k;
  bloque(1387+k,'alfombra_'+cl,'Alfombra '+f,'lana_'+(k?cl:'blanco'),{forma:'cajas',cajas:[[0,0,0,1,.0625,1]],solido:false,opaco:false,dureza:.1,inflamable:true});ALFOMBRA[k]=1387+k;
});
/* ---------- Piedras, maderas y decoración ---------- */
bloque(1403,'piedraLisa','Piedra lisa','smoothStone',{dureza:2,herr:'pico',nivel:1,resistencia:6});
bloque(1404,'granitoPulido','Granito pulido','polishedGranite',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1405,'dioritaPulida','Diorita pulida','polishedDiorite',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1406,'andesitaPulida','Andesita pulida','polishedAndesite',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1407,'pizarraPulida','Pizarra profunda pulida','polishedDeepslate',{dureza:3.5,herr:'pico',nivel:1,resistencia:6});
bloque(1408,'pizarraAdoquinada','Pizarra profunda adoquinada','cobbledDeepslate',{dureza:3.5,herr:'pico',nivel:1,resistencia:6});
BLOQUES[20].suelta=1408;
bloque(1409,'ladrillosAgrietados','Ladrillos de piedra agrietados','crackedBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1410,'piedraCincelada','Ladrillos de piedra cincelados','chiseledStone',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1411,'areniscaCortada','Arenisca cortada',tx('sandstoneTop','sandstoneTop','cutSandstone'),{dureza:.8,herr:'pico',nivel:1,resistencia:.8});
bloque(1412,'bloqueCuarzo','Bloque de cuarzo','quartz',{dureza:.8,herr:'pico',nivel:1,resistencia:.8});
bloque(1413,'pilarCuarzo','Pilar de cuarzo',tx('quartz','quartz','quartzPillar'),{dureza:.8,herr:'pico',nivel:1,resistencia:.8});
bloque(1414,'ladrillosNether','Ladrillos del Nether','netherBricks',{dureza:2,herr:'pico',nivel:1,resistencia:6});
bloque(1415,'bloqueLapis','Bloque de lapislázuli','lapisBlock',{dureza:3,herr:'pico',nivel:2,resistencia:3});
bloque(1416,'bloqueEsmeralda','Bloque de esmeralda','emeraldBlock',{dureza:5,herr:'pico',nivel:3,resistencia:6});
bloque(1417,'tablonesAbedul','Tablones de abedul','birchPlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1418,'tablonesAbeto','Tablones de abeto','sprucePlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1419,'tablonesJungla','Tablones de la jungla','junglePlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1420,'tablonesAcacia','Tablones de acacia','acaciaPlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1421,'farol','Farol','lantern',{forma:'cajas',cajas:[[.3,0,.3,.7,.6,.7]],opaco:false,dureza:3.5,herr:'pico',luz:15});
bloque(1422,'barril','Barril',tx('barrelTop','barrelTop','barrelSide'),{dureza:2.5,herr:'hacha',inter:'cofre',inflamable:true});
bloque(1423,'telarana','Telaraña','cobweb',{forma:'cruz',dureza:4,herr:'espada',suelta:()=>[[I.cuerda||219,1]],telarana:true});
[['escaleraArenisca','Escaleras de arenisca','sandstoneSide','pico'],['escaleraLadrillo','Escaleras de ladrillo','brick','pico'],
 ['escaleraPizarra','Escaleras de ladrillos de pizarra','deepslateBricks','pico'],['escaleraCuarzo','Escaleras de cuarzo','quartz','pico'],
 ['escaleraPiedraNegra','Escaleras de piedra negra','blackstone','pico'],['escaleraAbeto','Escaleras de abeto','sprucePlanks','hacha']].forEach(([cl,nom,t,h],i)=>{
  const base=1424+i*4;
  for(let f=0;f<4;f++)bloque(base+f,cl+(f||''),nom,t,{forma:'cajas',cajas:cajasEscalera(f),dureza:2,herr:h,nivel:h==='pico'?1:0,opaco:false,orienta:'escalera',base,resistencia:6,suelta:base,inflamable:h==='hacha'});
  bloque(1448+i,cl.replace('escalera','losa'),nom.replace('Escaleras','Losa'),t,{forma:'cajas',cajas:[[0,0,0,1,.5,1]],dureza:2,herr:h,nivel:h==='pico'?1:0,opaco:false,resistencia:6,inflamable:h==='hacha'});
});
/* ---------- Monumento oceánico, End y animaciones ---------- */
bloque(1454,'prismarina','Prismarina','prismarine',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1455,'ladrillosPrismarina','Ladrillos de prismarina','prismarineBricks',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1456,'prismarinaOscura','Prismarina oscura','darkPrismarine',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
bloque(1457,'farolMarino','Farol marino','seaLantern',{dureza:.3,luz:15,suelta:()=>[[548,azar(2,3)]],resistencia:.3});
bloque(1458,'esponja','Esponja','sponge',{dureza:.6,herr:'azada',resistencia:.6});
bloque(1459,'esponjaMojada','Esponja mojada','wetSponge',{dureza:.6,herr:'azada',resistencia:.6});
bloque(1460,'cabezaDragon','Cabeza de dragón','dragonHead',{forma:'cajas',cajas:[[.2,0,.2,.8,.5,.8]],opaco:false,dureza:1});
bloque(1461,'cofreAbierto','Cofre',tx('chestTop','chestTop','chestSide'),{forma:'cajas',cajas:[[.0625,0,.0625,.9375,.625,.9375]],opaco:false,dureza:2.5,herr:'hacha',inter:'cofre',suelta:18});
bloque(1462,'puertaAnim','Puerta','vacio',{forma:'cruz',solido:false,opaco:false,dureza:3,suelta:0});
// Bosque oscuro: roble oscuro y setas gigantes
bloque(1463,'troncoRobleOscuro','Tronco de roble oscuro',tx('darkOakTop','darkOakTop','darkOakLog'),{dureza:2,herr:'hacha',inflamable:true,resistencia:2});
bloque(1464,'hojasRobleOscuro','Hojas de roble oscuro','darkOakLeaves',Object.assign({suelta:sueltaHojas(1466,true)},propHojas,{tinte:'follaje'}));
bloque(1465,'tablonesRobleOscuro','Tablones de roble oscuro','darkOakPlanks',{dureza:2,herr:'hacha',inflamable:true,resistencia:3});
bloque(1466,'broteRobleOscuro','Brote de roble oscuro','darkOakSapling',{forma:'cruz',dureza:0});
bloque(1467,'setaRojaGigante','Bloque de champiñón rojo','mushBlockRed',{dureza:.2,herr:'hacha',suelta:ctx=>prob(.2)?[[111,azar(1,2)]]:[],resistencia:.2});
bloque(1468,'setaMarronGigante','Bloque de champiñón marrón','mushBlockBrown',{dureza:.2,herr:'hacha',suelta:ctx=>prob(.2)?[[112,azar(1,2)]]:[],resistencia:.2});
bloque(1469,'talloSeta','Tallo de champiñón','mushStem',{dureza:.2,herr:'hacha',resistencia:.2});
bloque(1470,'hieloCompacto','Hielo compacto','packedIce',{dureza:.5,herr:'pico',suelta:0,resistencia:.5});
bloque(1471,'girasol','Girasol','sunflower',{forma:'cruz',dureza:0});
bloque(1472,'afiladora','Afiladora',tx('grindstoneTop','grindstonePivot','grindstoneSide'),{forma:'cajas',cajas:[[.25,.2,.12,.75,.9,.88],[0,0,.34,.25,.62,.66],[.75,0,.34,1,.62,.66]],opaco:false,dureza:2,herr:'pico',inter:'afiladora',resistencia:6});
bloque(1339,'brotePalido','Brote de roble pálido','paleSapling',{forma:'cruz',dureza:0});
/* ---------- Edición 27: bloques que faltaban ---------- */
COLORES16.forEach(([cl,m,f],k)=>{
  bloque(1480+k,'terracota_'+cl,'Terracota '+f,'terracota_'+cl,{dureza:1.25,herr:'pico',nivel:1,resistencia:4.2});
  bloque(1496+k,'esmaltada_'+cl,'Terracota esmaltada '+f,'esmaltada_'+cl,{dureza:1.4,herr:'pico',nivel:1,resistencia:1.4});
  bloque(1512+k,'polvoHormigon_'+cl,'Hormigón en polvo '+m,'polvoHormigon_'+cl,{dureza:.5,herr:'pala',gravedad:true,resistencia:.5});
  bloque(1528+k,'vela_'+cl,'Vela '+f,'vela_'+cl,{forma:'cajas',cajas:[[7/16,0,7/16,9/16,6/16,9/16]],opaco:false,dureza:.1,luz:3,resistencia:.1});
});
bloque(1544,'vela','Vela','vela_natural',{forma:'cajas',cajas:[[7/16,0,7/16,9/16,6/16,9/16]],opaco:false,dureza:.1,luz:3,resistencia:.1});
bloque(1545,'bloqueAmatista','Bloque de amatista','amethystBlock',{dureza:1.5,herr:'pico',resistencia:1.5});
bloque(1546,'amatistaBrotante','Amatista brotante','buddingAmethyst',{dureza:1.5,herr:'pico',suelta:0,resistencia:1.5});
bloque(1547,'racimoAmatista','Racimo de amatista','amethystCluster',{forma:'cruz',dureza:1.5,herr:'pico',luz:5,suelta:()=>[[661,4]],resistencia:1.5});
bloque(1548,'broteAmatistaGrande','Brote de amatista grande','amethystBudL',{forma:'cruz',dureza:1.5,luz:4,suelta:0});
bloque(1549,'broteAmatistaMediano','Brote de amatista mediano','amethystBudM',{forma:'cruz',dureza:1.5,luz:2,suelta:0});
bloque(1550,'broteAmatistaPequeno','Brote de amatista pequeño','amethystBudS',{forma:'cruz',dureza:1.5,luz:1,suelta:0});
bloque(1551,'calcita','Calcita','calcite',{dureza:.75,herr:'pico',nivel:1,resistencia:.75});
bloque(1552,'basaltoLiso','Basalto liso','smoothBasalt',{dureza:1.25,herr:'pico',nivel:1,resistencia:4.2});
bloque(1553,'bloqueEspeleotema','Bloque de espeleotema','dripstoneBlock',{dureza:1.5,herr:'pico',nivel:1,resistencia:1});
bloque(1554,'espeleotema','Espeleotema puntiagudo','pointedDripstone',{forma:'cruz',dureza:1.5,herr:'pico',resistencia:3});
['tubo','cerebro','burbuja','fuego','cuerno'].forEach((t,k)=>{
  bloque(1555+k,'bloqueCoral_'+t,'Bloque de coral de '+t,'coralBlock_'+k,{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
  bloque(1560+k,'bloqueCoralMuerto_'+t,'Bloque de coral de '+t+' muerto','coralDead',{dureza:1.5,herr:'pico',nivel:1,resistencia:6});
  bloque(1565+k,'coral_'+t,'Coral de '+t,'coral_'+k,{forma:'cruz',dureza:0});
  bloque(1570+k,'abanicoCoral_'+t,'Abanico de coral de '+t,'coralFan_'+k,{forma:'cruz',dureza:0});
});
bloque(1575,'bloqueCobre','Bloque de cobre','copperBlock',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1576,'cobreExpuesto','Cobre expuesto','copperExposed',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1577,'cobreErosionado','Cobre erosionado','copperWeathered',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1578,'cobreOxidado','Cobre oxidado','copperOxidized',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1579,'cobreCortadoExpuesto','Cobre cortado expuesto','copperExposedCut',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1580,'cobreCortadoErosionado','Cobre cortado erosionado','copperWeatheredCut',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1581,'cobreCortadoOxidado','Cobre cortado oxidado','copperOxidizedCut',{dureza:3,herr:'pico',nivel:2,resistencia:6});
bloque(1582,'panalAbejas','Nido de abejas',tx('beeNestTop','beeNestTop','beeNestFront'),{dureza:.3,herr:'hacha',inflamable:true,resistencia:.3});
bloque(1583,'colmena','Colmena',tx('beehiveTop','beehiveTop','beehiveFront'),{dureza:.6,herr:'hacha',inflamable:true,resistencia:.6});
bloque(1584,'bloqueMiel','Bloque de miel','honeyBlock',{dureza:0,opaco:false,trans:true,resistencia:0});
bloque(1585,'bloquePanal','Bloque de panal','honeycombBlock',{dureza:.6,resistencia:.6});
bloque(1586,'campana','Campana','bell',{forma:'cajas',cajas:[[.25,.2,.25,.75,.85,.75],[.19,.2,.19,.81,.35,.81]],opaco:false,dureza:5,herr:'pico',resistencia:5});
bloque(1587,'cadena','Cadena','chain',{forma:'cajas',cajas:[[7/16,0,7/16,9/16,1,9/16]],opaco:false,dureza:5,herr:'pico',resistencia:6});
bloque(1588,'fogata','Fogata','campfireFire',{forma:'cruz',dureza:2,herr:'hacha',luz:15,suelta:()=>[[I.carbon,2]],resistencia:2});
bloque(1589,'fogataAlmas','Fogata de almas','soulCampfireFire',{forma:'cruz',dureza:2,herr:'hacha',luz:10,suelta:()=>[[B.arenaAlmas,1]],resistencia:2});
bloque(1590,'diana','Diana',tx('targetTop','targetTop','targetSide'),{dureza:.5,herr:'azada',resistencia:.5});
bloque(1591,'magnetita','Magnetita',tx('lodestoneTop','lodestoneTop','lodestoneSide'),{dureza:3.5,herr:'pico',resistencia:3.5});
bloque(1592,'anclaReaparicion','Ancla de reaparición',tx('anchorTop','anchorSide','anchorSide'),{dureza:50,herr:'pico',nivel:4,resistencia:1200});
bloque(1593,'andamio','Andamio',tx('scaffoldTop','scaffoldTop','scaffoldSide'),{forma:'cajas',cajas:[[0,0,0,1,1,1]],solido:false,opaco:false,trepable:true,dureza:0,resistencia:0});
bloque(1594,'bambu','Bambú','bamboo',{forma:'cajas',cajas:[[6/16,0,6/16,10/16,1,10/16]],opaco:false,dureza:1,herr:'hacha',resistencia:1});
bloque(1595,'alga','Alga','kelp',{forma:'cruz',dureza:0});
bloque(1596,'pastoMarino','Pasto marino','seagrass',{forma:'cruz',dureza:0,suelta:0});
bloque(1597,'pepinoMar','Pepino de mar','seaPickle',{forma:'cruz',dureza:0,luz:6});
bloque(1598,'azalea','Azalea',tx('azaleaTop','planks','azaleaSide'),{forma:'cajas',cajas:[[0,.5,0,1,1,1],[.4,0,.4,.6,.5,.6]],opaco:false,dureza:0,tinte:'follaje'});
bloque(1599,'azaleaFlorida','Azalea florida',tx('azaleaFlower','planks','azaleaSide'),{forma:'cajas',cajas:[[0,.5,0,1,1,1],[.4,0,.4,.6,.5,.6]],opaco:false,dureza:0,tinte:'follaje'});
bloque(1600,'hojasAzalea','Hojas de azalea','azaleaTop',{dureza:.2,herr:'azada',trans:true,opaco:false,opacidadLuz:1,inflamable:true,resistencia:.2,tinte:'follaje'});
bloque(1601,'hojasAzaleaFlorida','Hojas de azalea florida','azaleaFlower',{dureza:.2,herr:'azada',trans:true,opaco:false,opacidadLuz:1,inflamable:true,resistencia:.2,tinte:'follaje'});
bloque(1602,'floresEsporas','Flor de esporas','sporeBlossom',{forma:'cruz',dureza:0});
bloque(1603,'raicesColgantes','Raíces colgantes','hangingRoots',{forma:'cruz',dureza:0});
bloque(1604,'hieloAzul','Hielo azul','blueIce',{dureza:2.8,herr:'pico',suelta:0,resistencia:2.8});
bloque(1605,'nievePolvo','Nieve en polvo','powderSnow',{solido:false,dureza:.25,suelta:0,resistencia:.25});
bloque(1606,'mesaCartografia','Mesa de cartografía',tx('cartoTop','planks','cartoSide'),{dureza:2.5,herr:'hacha',inflamable:true});
bloque(1607,'telar','Telar',tx('loomTop','planks','loomSide'),{dureza:2.5,herr:'hacha',inflamable:true});
bloque(1608,'ahumador','Ahumador',tx('smokerTop','smokerTop','smokerFront'),{dureza:3.5,herr:'pico',inter:'horno',resistencia:3.5});
bloque(1609,'altoHorno','Alto horno',tx('blastTop','blastTop','blastFront'),{dureza:3.5,herr:'pico',inter:'horno',resistencia:3.5});
bloque(1610,'compostador','Compostador',tx('composterTop','planks','composterSide'),{dureza:.6,herr:'hacha',inflamable:true});
bloque(1611,'cortapiedras','Cortapiedras',tx('stonecutterTop','stonecutterTop','stonecutterSide'),{forma:'cajas',cajas:[[0,0,0,1,9/16,1]],opaco:false,dureza:3.5,herr:'pico'});
bloque(1612,'atril','Atril',tx('lecternTop','planks','lecternSide'),{forma:'cajas',cajas:[[.25,0,.25,.75,.8,.75],[0,0,0,1,.12,1],[0,.8,0,1,.95,1]],opaco:false,dureza:2.5,herr:'hacha',inflamable:true});
bloque(1613,'mesaFlechas','Mesa de flechas',tx('fletchTop','planks','fletchSide'),{dureza:2.5,herr:'hacha',inflamable:true});
bloque(1614,'caldero','Caldero',tx('cauldronTop','cauldronTop','cauldronSide'),{forma:'cajas',cajas:[[0,0,0,1,1,1]],opaco:false,dureza:2,herr:'pico'});
bloque(1615,'tocadiscos','Tocadiscos',tx('jukeboxTop','jukeboxSide','jukeboxSide'),{dureza:2,herr:'hacha',inflamable:true});
const NB=BLOQUES.length;
const SOLIDO=new Uint8Array(NB), OPACO=new Uint8Array(NB), TRANS=new Uint8Array(NB), LUZB=new Uint8Array(NB),
      OPAC_LUZ=new Uint8Array(NB), OCLUYE=new Uint8Array(NB), FORMA=new Uint8Array(NB), REEMPL=new Uint8Array(NB);
const FORMAS={cubo:0,losa:1,cruz:2,antorcha:3,liquido:4,portal:5,cajas:6,conecta:7,cable:8,riel:9};
const TINTES={pasto:1,follaje:2,abedul:3,abeto:4,agua:5};
const TINTE=new Uint8Array(NB), TREPA=new Uint8Array(NB);
BLOQUES.forEach((b,i)=>{if(!b)return;SOLIDO[i]=b.solido?1:0;OPACO[i]=b.opaco?1:0;TRANS[i]=b.trans?1:0;LUZB[i]=b.luz;
  OPAC_LUZ[i]=b.opacidadLuz;OCLUYE[i]=(b.forma==='cubo'&&!b.sinSombra)?1:0;FORMA[i]=FORMAS[b.forma];REEMPL[i]=b.reemplazable?1:0;
  TINTE[i]=TINTES[b.tinte]||0;TREPA[i]=b.trepable?1:0;});
const esTronco=id=>id===4||(id>=94&&id<=97)||id===1294||id===1299||id===1321||id===1463, esHojas=id=>id===5||(id>=98&&id<=101)||id===1295||id===1300||id===1322||id===1464, esPuerta=id=>id>=149&&id<=164;
// Cajas de colisión (coordenadas dentro del bloque)
function cajasColision(id){
  const b=BLOQUES[id];
  if(b.forma==='cajas')return b.cajas;
  if(b.forma==='conecta')return [[0,0,0,1,b.colAlta||1,1]];
  return [[0,0,0,1,b.altura,1]];
}
REEMPL[0]=1;
const esAgua=id=>id>=53&&id<=60, esLava=id=>id>=61&&id<=68, esLiquido=id=>id>=53&&id<=68;
const nivelLiquido=id=>BLOQUES[id].nivelL;

/* =========================================================
   Registro de objetos
   ========================================================= */
const ITEMS=[], I={};
const esVariante=i=>(i>=130&&i<=132)||(i>=134&&i<=136)||(i>=138&&i<=140)||(i>=146&&i<=148)||(i>=149&&i<=168)||(i>=1192&&i<=1212)||i===1283||i===1216||i===1218||i===1220||i===1223||(i>=1224&&i<=1259&&i!==1227&&i!==1245)||(i>=1261&&i<=1269)||(i>=1271&&i<=1273)||i===1287||i===1317||i===1319||i===1328||i===1330||(i>=1424&&i<=1447&&(i-1424)%4!==0)||i===1461||i===1462;
BLOQUES.forEach((b,i)=>{if(b&&!b.liquido&&b.forma!=='portal'&&i!==86&&!(i>=41&&i<=48)&&!esVariante(i))ITEMS[i]={nombre:b.nombre,bloque:true,max:64,clave:b.clave};});
function item(id,clave,nombre,props){ITEMS[id]=Object.assign({nombre,max:64,clave},props);I[clave]=id;}
item(200,'palo','Palo'); item(201,'carbon','Carbón'); item(202,'hierroBruto','Hierro en bruto'); item(203,'lingoteHierro','Lingote de hierro');
item(204,'diamante','Diamante'); item(205,'manzana','Manzana',{comida:[4,2.4]});
item(206,'cerdoCrudo','Chuleta de cerdo cruda',{comida:[3,1.8]}); item(207,'cerdoAsado','Chuleta de cerdo cocinada',{comida:[8,12.8]});
item(208,'carnePodrida','Carne podrida',{comida:[4,.8],efecto:['hambre',30,.8]});
item(209,'oroBruto','Oro en bruto'); item(210,'lingoteOro','Lingote de oro'); item(211,'pepitaOro','Pepita de oro');
item(212,'cobreBruto','Cobre en bruto'); item(213,'lingoteCobre','Lingote de cobre'); item(214,'redstone','Polvo de redstone',{coloca:'cable'});
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
item(250,'ladrillo','Ladrillo'); item(251,'bolaArcilla','Bola de arcilla'); item(252,'cuenco','Cuenco');
item(253,'estofado','Estofado de champiñones',{comida:[6,7.2],max:1,devuelve:252}); item(254,'rodajaSandia','Rodaja de sandía',{comida:[2,1.2]});
item(255,'puerta','Puerta de roble',{coloca:'puerta'});
item(500,'frasco','Frasco de vidrio'); item(501,'frascoAgua','Frasco de agua',{max:1,bebida:true});
item(502,'pocionRara','Poción rara',{max:1,bebida:true});
const POCIONES=[['curacion','Poción de curación',0xf82423],['fuerza','Poción de fuerza',0x932423],['rapidez','Poción de rapidez',0x7cafc6],
  ['regeneracion','Poción de regeneración',0xcd5cab],['resistenciaFuego','Poción de resistencia al fuego',0xe49a3a]];
POCIONES.forEach(([ef,nom,col],k)=>{item(503+k,'pocion_'+ef,nom,{max:1,bebida:true,pocion:{efecto:ef,color:col}});
  item(510+k,'arrojadiza_'+ef,nom.replace('Poción','Poción arrojadiza'),{max:1,pocion:{efecto:ef,color:col,arrojadiza:true}});});
item(515,'verrugaNether','Verruga del Nether',{coloca:'verruga'}); item(516,'azucar','Azúcar'); item(517,'melonBrillante','Rodaja de sandía reluciente');
item(518,'cremaMagma','Crema de magma'); item(519,'frutaCoro','Fruta coro',{comida:[4,2.4],siempre:true,teletransporta:true});
item(520,'vagoneta','Vagoneta',{max:1,coloca:'vagoneta'}); item(521,'barco','Barco de roble',{max:1,coloca:'barco'});
item(522,'elitros','Élitros',{max:1,dur:432,tipoHerr:'armadura',armadura:{pieza:1,def:0,dureza:0,mat:0,enc:1},elitros:true});
item(523,'cohete','Cohete de fuegos artificiales'); item(525,'bolaSlime','Bola de slime'); item(526,'frutaReventada','Fruta coro reventada');
item(527,'hierroGolem','Pepita de hierro');
// 1.19 / 1.20
item(528,'pincel','Pincel',{max:1,dur:64,tipoHerr:'pincel'});
item(529,'fragArquero','Fragmento de cerámica: arquero'); item(530,'fragProsperidad','Fragmento de cerámica: prosperidad');
item(531,'fragPeligro','Fragmento de cerámica: peligro'); item(532,'fragAmigo','Fragmento de cerámica: amigo');
item(533,'plantillaNetherite','Plantilla de mejora de netherite');
item(534,'chatarraNetherite','Chatarra de netherite',{ignifugo:true}); item(535,'lingoteNetherite','Lingote de netherite',{ignifugo:true});
item(536,'fragmentoEco','Fragmento de eco');
// 1.21
item(538,'cargaViento','Carga de viento'); item(539,'varaBreeze','Vara de breeze');
item(540,'maza','Maza',{max:1,dur:500,tipoHerr:'maza',iconoPropio:true,herr:{tipo:'maza',nivel:0,vel:1,dano:6,cad:.6,mat:2,enc:15}});
item(541,'llavePrueba','Llave de prueba');
// 1.21.2 - 1.21.9
item(542,'saquito','Saquito',{max:1,saquito:true}); item(543,'grumoResina','Grumo de resina'); item(544,'ladrilloResina','Ladrillo de resina');
item(545,'arnes','Arnés',{max:1});
item(546,'libroEncantado','Libro encantado',{max:1});
item(547,'fragmentoPrismarina','Fragmento de prismarina'); item(548,'cristalPrismarina','Cristales de prismarina'); item(549,'caparazonShulker','Caparazón de shulker');
item(597,'escudo','Escudo',{max:1,dur:336,escudo:true,tipoHerr:'escudo'});
item(611,'ballesta','Ballesta',{max:1,dur:465,tipoHerr:'ballesta'});
item(612,'tridente','Tridente',{max:1,dur:250,tipoHerr:'tridente',iconoPropio:true,herr:{tipo:'tridente',nivel:0,vel:1,dano:9,cad:1.1,mat:2,enc:1}});
item(613,'canaPescar','Caña de pescar',{max:1,dur:64,tipoHerr:'cana'});
item(614,'bacalaoCrudo','Bacalao crudo',{comida:[2,.4]}); item(615,'bacalaoCocinado','Bacalao cocinado',{comida:[5,6]});
item(616,'salmonCrudo','Salmón crudo',{comida:[2,.4]}); item(617,'salmonCocinado','Salmón cocinado',{comida:[6,9.6]});
item(618,'pezTropical','Pez tropical',{comida:[1,.2]}); item(619,'pezGlobo','Pez globo',{comida:[1,.2],efecto:['veneno',60,1]}); item(598,'silla','Silla de montar',{max:1});
const TINTE_ID=[]; COLORES16.forEach(([cl,m],k)=>{item(550+k,'tinte_'+cl,'Tinte '+m,{tinte:k});TINTE_ID[k]=550+k;});
// Huevos de aparición (modo creativo)
const HUEVOS={cerdo:[0xf0a0a0,0xd06060],vaca:[0x4a3222,0xa8a8a8],oveja:[0xe8e8e8,0xffb0b0],gallina:[0xf0f0f0,0xd02020],zombi:[0x00a8a8,0x6a9a4a],
  esqueleto:[0xc0c0c0,0x4a4a4a],creeper:[0x0da70b,0x111111],arana:[0x342c26,0xa80e0e],enderman:[0x161616,0x000000],aldeano:[0x563c33,0xbd8b72],
  slime:[0x51a03e,0x7ebf6e],golem:[0xdbcfa3,0x74a332],camello:[0xfcc369,0xcb9337],rana:[0xd07444,0xffc77c],warden:[0x0f4649,0x39d6e0],
  breeze:[0xaf94df,0x9166df],creaking:[0x5f5f5f,0xfc7812],ghastFeliz:[0xf9f9f9,0xbcbcbc],golemCobre:[0xd8844e,0x40e0d0],
  piglin:[0xea9393,0x4c7129],saqueador:[0x532f36,0x959b9b],hoglin:[0xc66e55,0x5f6464],blaze:[0xf6b201,0xfff87e],ghast:[0xf9f9f9,0xbcbcbc],caballo:[0xc09e7d,0xeee500]};
Object.keys(HUEVOS).forEach((t,k)=>item(570+k,'huevo_'+t,'Huevo generador de '+t,{huevo:t}));
// Criaturas nuevas: carne de conejo, tinta y cuerno de cabra; sus huevos van en otro rango
item(620,'conejoCrudo','Conejo crudo',{comida:[3,1.8]}); item(621,'conejoCocinado','Conejo cocinado',{comida:[5,6]});
item(622,'pataConejo','Pata de conejo'); item(623,'pielConejo','Piel de conejo'); item(624,'bolsaTinta','Bolsa de tinta');
item(625,'cuernoCabra','Cuerno de cabra',{max:1});
// Edición 27: comida, herramientas y objetos que faltaban
item(640,'zanahoria','Zanahoria',{comida:[3,3.6]}); item(641,'patata','Patata',{comida:[1,.6]}); item(642,'patataAsada','Patata asada',{comida:[5,6]});
item(643,'patataVenenosa','Patata venenosa',{comida:[2,1.2],efecto:['veneno',5,.6]}); item(644,'remolacha','Remolacha',{comida:[1,1.2]});
item(645,'sopaRemolacha','Sopa de remolacha',{max:1,comida:[6,7.2],devuelve:252}); item(646,'bayasDulces','Bayas dulces',{comida:[2,.4]});
item(647,'bayasBrillantes','Bayas brillantes',{comida:[2,.4]}); item(648,'galleta','Galleta',{comida:[2,.4]});
item(649,'pastelCalabaza','Pastel de calabaza',{comida:[8,4.8]}); item(650,'zanahoriaDorada','Zanahoria dorada',{comida:[6,14.4]});
item(651,'botellaMiel','Botella de miel',{max:16,comida:[6,1.2],devuelve:500,siempre:true}); item(652,'estofadoConejo','Estofado de conejo',{max:1,comida:[10,12],devuelve:252});
item(653,'brujula','Brújula',{max:1}); item(654,'reloj','Reloj',{max:1}); item(655,'mapa','Mapa',{max:1});
item(656,'etiqueta','Etiqueta'); item(657,'rienda','Rienda'); item(658,'totem','Tótem de la inmortalidad',{max:1});
item(659,'catalejo','Catalejo',{max:1}); item(660,'panal','Panal'); item(661,'fragmentoAmatista','Fragmento de amatista');
item(662,'caparazonNautilo','Caparazón de nautilo'); item(663,'corazonMar','Corazón del mar'); item(664,'escamaTortuga','Escama de tortuga');
item(665,'membranaPhantom','Membrana de phantom'); item(666,'bolaNieve','Bola de nieve',{max:16}); item(667,'tintaBrillante','Bolsa de tinta brillante');
['13','cat','blocks','chirp','far','mall','mellohi','stal'].forEach((d,k)=>item(668+k,'disco_'+d,'Disco de música ('+d+')',{max:1,disco:k}));
item(676,'flechaEspectral','Flecha espectral'); item(677,'huevo','Huevo',{max:16});
const HUEVOS2={lobo:[0xd7d3d3,0xceaf96,'lobo'],gato:[0xefc88e,0x957256,'gato'],zorro:[0xd5b69f,0xcc6920,'zorro'],conejo:[0x995f40,0x734831,'conejo'],
  calamar:[0x223b4d,0x708899,'calamar'],murcielago:[0x4c3e30,0x0f0f0f,'murciélago'],cabra:[0xa5947c,0x55493e,'cabra'],osoPolar:[0xf2f2f2,0x959590,'oso polar'],
  ahogado:[0x8ff1d7,0x799c65,'ahogado'],vindicador:[0x959b9b,0x275e61,'vindicador']};
Object.keys(HUEVOS2).forEach((t,k)=>{HUEVOS[t]=HUEVOS2[t].slice(0,2);item(630+k,'huevo_'+t,'Huevo generador de '+HUEVOS2[t][2],{huevo:t});});
const HUEVOS3={ajolote:[0xfbc1e3,0xa62d74,'ajolote'],abeja:[0xedc343,0x43241b,'abeja'],loro:[0x0da70b,0xff0000,'loro'],panda:[0xe7e7e7,0x1b1b22,'panda'],
  llama:[0xc09e7d,0x995f40,'llama'],tortuga:[0xe7e7e7,0x00afaf,'tortuga'],delfin:[0x223b4d,0xf9f9f9,'delfín'],bacalao:[0xc1a76a,0xe5c48b,'bacalao'],
  salmon:[0xa00f10,0x0e8474,'salmón'],pezTropical:[0xef6915,0xfff9ef,'pez tropical'],pezGlobo:[0xf6b201,0x37c3f2,'pez globo'],champinaca:[0xa00f10,0xb7b7b7,'champiñaca'],
  ocelote:[0xefde7d,0x564434,'ocelote'],strider:[0x9c3436,0x4d494d,'strider'],sniffer:[0x871e09,0x25ab70,'sniffer'],armadillo:[0xad716d,0x824848,'armadillo'],
  calamarBrillante:[0x095656,0x85f1bc,'calamar brillante'],burro:[0x534539,0x867566,'burro'],mula:[0x1b0200,0x51331d,'mula'],esqueletoErrante:[0x617677,0xdde5e5,'esqueleto errante'],
  momia:[0x797061,0xe6cc94,'momia'],esqueletoWither:[0x141414,0x474d4d,'esqueleto wither'],piglinBruto:[0x592a10,0xf9f3a4,'piglin bruto'],evocador:[0x959b9b,0x1e1c1a,'evocador'],
  vex:[0x7a90a4,0xe8edf1,'vex'],devastador:[0x757470,0x5b5049,'devastador'],phantom:[0x43518a,0x88ff00,'phantom'],lepisma:[0x6e6e6e,0x303030,'lepisma'],
  endermita:[0x161616,0x6e6e6e,'endermita'],golemNieve:[0xd9f2f2,0x81a4a4,'gólem de nieve'],allay:[0x00daff,0x00adff,'allay'],aldeanoZombi:[0x563c33,0x799c65,'aldeano zombi']};
Object.keys(HUEVOS3).forEach((t,k)=>{HUEVOS[t]=HUEVOS3[t].slice(0,2);item(680+k,'huevo_'+t,'Huevo generador de '+HUEVOS3[t][2],{huevo:t});});
item(678,'escamaArmadillo','Escama de armadillo');

const MATS=[
  {n:'madera',nivel:1,vel:2,dur:59,enc:15,col:[176,138,82]},
  {n:'piedra',nivel:2,vel:4,dur:131,enc:5,col:[132,132,134]},
  {n:'hierro',nivel:3,vel:6,dur:250,enc:14,col:[226,226,226]},
  {n:'oro',nivel:1,vel:12,dur:32,enc:22,col:[250,214,70]},
  {n:'diamante',nivel:4,vel:8,dur:1561,enc:10,col:[84,232,222]},
  {n:'netherite',nivel:4,vel:9,dur:2031,enc:15,col:[88,80,86],ignifugo:true},
  {n:'cobre',nivel:2,vel:5,dur:190,enc:13,col:[222,130,84]},
];
const HERRS=[
  {tipo:'pico',nom:'Pico',dano:[2,3,4,2,5,6,3],cad:[1.2,1.2,1.2,1.2,1.2,1.2,1.2]},
  {tipo:'hacha',nom:'Hacha',dano:[7,9,9,7,9,10,9],cad:[.8,.8,.9,1,1,1,.8]},
  {tipo:'pala',nom:'Pala',dano:[2.5,3.5,4.5,2.5,5.5,6.5,3.5],cad:[1,1,1,1,1,1,1]},
  {tipo:'espada',nom:'Espada',dano:[4,5,6,4,7,8,5],cad:[1.6,1.6,1.6,1.6,1.6,1.6,1.6]},
  {tipo:'azada',nom:'Azada',dano:[1,1,1,1,1,1,1],cad:[1,2,3,1,4,4,2]},
];
HERRS.forEach((h,ti)=>MATS.forEach((m,k)=>item(300+ti*10+k,h.tipo+'_'+m.n,`${h.nom} de ${m.n}`,
  {max:1,dur:m.dur,tipoHerr:h.tipo,ignifugo:m.ignifugo,herr:{tipo:h.tipo,nivel:m.nivel,vel:m.vel,dano:h.dano[k],cad:h.cad[k],mat:k,enc:m.enc}})));
// Lanzas: más alcance y golpe de carga que crece con la velocidad (a pie o a caballo)
MATS.forEach((m,k)=>item(600+k,'lanza_'+m.n,`Lanza de ${m.n}`,{max:1,dur:m.dur,tipoHerr:'lanza',ignifugo:m.ignifugo,
  herr:{tipo:'lanza',nivel:0,vel:1,dano:[3,4,5,3,6,7,4][k],cad:1.1,mat:k,enc:m.enc}}));
// Armaduras de caballo
[['cuero',3,[150,94,56]],['hierro',5,[210,210,214]],['oro',7,[250,210,60]],['diamante',11,[84,220,214]]].forEach(([n,d,c],k)=>
  item(607+k,'armaduraCaballo_'+n,`Armadura de caballo de ${n}`,{max:1,bardaCaballo:{def:d,col:c}}));
const ARM_MATS=[
  {n:'cuero',mult:5,def:[1,3,2,1],dureza:0,enc:15,col:[150,94,56]},
  {n:'oro',mult:7,def:[2,5,3,1],dureza:0,enc:25,col:[250,214,70]},
  {n:'hierro',mult:15,def:[2,6,5,2],dureza:0,enc:9,col:[216,216,216]},
  {n:'diamante',mult:33,def:[3,8,6,3],dureza:2,enc:10,col:[84,232,222]},
  {n:'netherite',mult:37,def:[3,8,6,3],dureza:3,enc:15,col:[88,80,86],ignifugo:true},
  {n:'cobre',mult:11,def:[2,4,3,1],dureza:0,enc:8,col:[222,130,84]},
];
const PIEZAS=[{n:'casco',nom:'Casco',dur:11},{n:'pechera',nom:'Pechera',dur:16},{n:'pantalones',nom:'Pantalones',dur:15},{n:'botas',nom:'Botas',dur:13}];
PIEZAS.forEach((p,pi)=>ARM_MATS.forEach((m,k)=>item(400+pi*10+k,p.n+'_'+m.n,`${p.nom} de ${m.n}`,
  {max:1,dur:p.dur*m.mult,tipoHerr:'armadura',ignifugo:m.ignifugo,armadura:{pieza:pi,def:m.def[pi],dureza:m.dureza,mat:k,enc:m.enc}})));
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
  castigo:{nombre:'Castigo',max:5,para:['espada','hacha'],excluye:['filo','perdicion']},
  perdicion:{nombre:'Perdición de los artrópodos',max:5,para:['espada','hacha'],excluye:['filo','castigo']},
  barrido:{nombre:'Filo arrasador',max:3,para:['espada']},
  reparacion:{nombre:'Reparación',max:1,para:['pico','hacha','pala','azada','espada','arco','armadura','maza','elitros'],tesoro:true},
  protFuego:{nombre:'Protección contra el fuego',max:4,para:['armadura'],excluye:['proteccion','protExplosion','protProyectiles']},
  protExplosion:{nombre:'Protección contra explosiones',max:4,para:['armadura'],excluye:['proteccion','protFuego','protProyectiles']},
  protProyectiles:{nombre:'Protección contra proyectiles',max:4,para:['armadura'],excluye:['proteccion','protFuego','protExplosion']},
  espinas:{nombre:'Espinas',max:3,para:['armadura']},
  afinidadAcuatica:{nombre:'Afinidad acuática',max:1,para:['casco']},
  agilidadAcuatica:{nombre:'Agilidad acuática',max:3,para:['botas'],excluye:'pasoHelado'},
  pasoHelado:{nombre:'Paso helado',max:2,para:['botas'],excluye:'agilidadAcuatica',tesoro:true},
  velocidadAlmas:{nombre:'Velocidad de alma',max:3,para:['botas'],tesoro:true},
  sigilo:{nombre:'Sigilo',max:3,para:['pantalones'],tesoro:true},
  impacto:{nombre:'Retroceso',max:2,para:['arco']},
  densidad:{nombre:'Densidad',max:5,para:['maza']},
  rafaga:{nombre:'Ráfaga de viento',max:3,para:['maza'],tesoro:true},
  ligamiento:{nombre:'Maldición de ligamiento',max:1,para:['armadura','elitros'],maldicion:true},
  desaparicion:{nombre:'Maldición de desaparición',max:1,para:['pico','hacha','pala','azada','espada','arco','armadura','maza'],maldicion:true},
};
ENCANTOS.proteccion.excluye=['protFuego','protExplosion','protProyectiles'];
ENCANTOS.filo.excluye=['castigo','perdicion'];
const conflictoEnc=(a,b)=>[].concat(ENCANTOS[a].excluye||[]).includes(b)||[].concat(ENCANTOS[b].excluye||[]).includes(a);
const ROMANOS=['','I','II','III','IV','V'];
const nivelEnc=(p,k)=>p&&p.enc&&p.enc[k]||0;
function categoriasItem(id){
  const it=ITEMS[id]; if(!it)return [];
  if(id===248||id===546)return ['libro'];
  if(it.elitros)return ['elitros'];
  if(it.armadura){const c=['armadura'];if(it.armadura.pieza===0)c.push('casco');if(it.armadura.pieza===2)c.push('pantalones');if(it.armadura.pieza===3)c.push('botas');return c;}
  if(it.tipoHerr)return [it.tipoHerr];
  return [];
}
function encantabilidad(id){const it=ITEMS[id];if(id===248)return 1;return it.herr?it.herr.enc:it.armadura?it.armadura.enc:['arco','ballesta','cana'].includes(it.tipoHerr)?1:0;}

/* =========================================================
   Recetas
   ========================================================= */
const RECETAS=[];
function receta(patron,clave,id,n=1){RECETAS.push({patron,clave,id,n});}
function recetaSin(ingredientes,id,n=1){RECETAS.push({sin:ingredientes.slice().sort((a,b)=>a-b),id,n});}
[B.tronco,B.troncoAbedul,B.troncoAbeto,B.troncoJungla,B.troncoAcacia].forEach(t=>recetaSin([t],B.tablones,4));
[[B.roca,129],[B.tablones,133],[B.ladrillosPiedra,137]].forEach(([m,e])=>receta(['M..','MM.','MMM'],{M:m},e,4));
[[B.roca,141],[B.tablones,142],[B.piedra,143],[B.ladrillosPiedra,144]].forEach(([m,l])=>receta(['MMM'],{M:m},l,6));
receta(['S.S','SSS','S.S'],{S:200},145,3);
receta(['PP','PP','PP'],{P:B.tablones},255,3);
receta(['PSP','PSP'],{P:B.tablones,S:200},B.valla,3);
receta(['GGG','GGG'],{G:B.vidrio},B.panel,16);
recetaSin([B.calabaza,B.antorcha],B.linternaCalabaza);
receta(['P.P','.P.'],{P:B.tablones},252,4);
recetaSin([252,B.champinonRojo,B.champinonMarron],253);
receta(['LL','LL'],{L:250},B.ladrillos);
receta(['BB','BB'],{B:251},B.arcilla);
receta(['PPP','LLL','PPP'],{P:B.tablones,L:248},B.estanteria);
receta(['RRR','RRR','RRR'],{R:254},B.sandia);
receta(['G.G','.G.'],{G:B.vidrio},500,3);
recetaSin([B.cana],516);
receta(['NNN','NRN','NNN'],{N:I.pepitaOro,R:254},517);
recetaSin([I.polvoBlaze,525],518);
receta(['.V.','RRR'],{V:I.varaBlaze,R:B.roca},B.soporte);
receta(['BBB','.I.','III'],{B:B.bloqueHierro,I:I.lingoteHierro},B.yunque);
receta(['R','S'],{R:I.redstone,S:I.palo},B.antorchaR);
receta(['S','C'],{S:I.palo,C:B.roca},B.palanca);
recetaSin([B.piedra],B.boton);
receta(['SS'],{S:B.piedra},B.placa);
receta(['RRR','RRR','RRR'],{R:I.redstone},B.bloqueRedstone); recetaSin([B.bloqueRedstone],I.redstone,9);
receta(['.R.','RGR','.R.'],{R:I.redstone,G:B.piedraLuminosa},B.lampara);
receta(['PPP','CIC','CRC'],{P:B.tablones,C:B.roca,I:I.lingoteHierro,R:I.redstone},B.piston3);
recetaSin([525,B.piston3],B.pistonP3);
receta(['I.I','ISI','I.I'],{I:I.lingoteHierro,S:I.palo},B.riel,16);
receta(['G.G','GSG','GRG'],{G:I.lingoteOro,S:I.palo,R:I.redstone},B.riel10,6);
receta(['I.I','III'],{I:I.lingoteHierro},520);
receta(['P.P','PPP'],{P:B.tablones},521);
recetaSin([I.papel,I.polvora],523,3);
receta(['FF','FF'],{F:526},B.purpur,4);
receta(['P','P'],{P:B.purpur},B.pilarPurpur);
receta(['B','F'],{B:I.varaBlaze,F:526},B.varaEnd,4);
receta(['SS','SS'],{S:B.piedraEnd},B.ladrillosEnd,4);

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
[B.tablones,B.roca,I.lingoteHierro,I.lingoteOro,I.diamante,535,I.lingoteCobre].forEach((m,k)=>{if(m)receta(['..M','.S.','S..'],{M:m,S:I.palo},600+k);});
[I.cuero,I.lingoteHierro,I.lingoteOro,I.diamante].forEach((m,k)=>receta(['M.M','MMM','M.M'],{M:m},607+k));
// 1.19 / 1.20
recetaSin([B.troncoCerezo],B.tablonesCerezo,4); recetaSin([B.troncoRobleOscuro],B.tablonesRobleOscuro,4);
receta(['SHS','CFC','.S.'],{S:I.palo,H:I.lingoteHierro,C:I.cuerda,F:I.lingoteHierro},611); receta(['..S','.SC','S.C'],{S:I.palo,C:I.cuerda},613);
receta(['SLS','T.T'],{S:I.palo,L:143,T:B.tablones},B.afiladora);
receta(['THT','TTT','.T.'],{T:B.tablones,H:I.lingoteHierro},597); receta(['CCC','C.C','.H.'],{C:I.cuero,H:I.lingoteHierro},598); recetaSin([B.girasol],TINTE_ID[4],2); recetaSin([B.troncoMangle],B.tablonesMangle,4);
recetaSin([534,534,534,534,I.lingoteOro,I.lingoteOro,I.lingoteOro,I.lingoteOro],535);
receta(['MMM','MMM','MMM'],{M:535},B.bloqueNetherite); recetaSin([B.bloqueNetherite],535,9);
receta(['II','PP','PP'],{I:I.lingoteHierro,P:B.tablones},B.mesaHerreria);
receta(['F','C','S'],{F:I.pluma,C:I.lingoteCobre,S:I.palo},528);
receta(['DTD','DND','DDD'],{D:I.diamante,T:533,N:B.netherrack},533,2);
receta(['PP','PP'],{P:B.pizarra},B.ladrillosPizarra,4); receta(['PP','PP'],{P:B.ladrillosPizarra},B.baldosasPizarra,4);
receta(['BB','BB'],{B:B.barro},B.ladrillosBarro,4);
receta(['.L.','L.L','.L.'],{L:I.ladrillo},B.vasija);
receta(['.I.','IAI','.I.'],{I:I.lingoteHierro,A:B.arenaAlmas},B.farolAlmas);
receta(['EEE','ECE','EEE'],{E:536,C:I.lingoteCobre},B.catalizador);
receta(['N','V'],{N:B.nucleoPesado,V:539},540);
// 1.21.2 - 1.21.9
receta(['C','L'],{C:I.cuerda,L:I.cuero},542);
// Tintes y bloques de colores
{const T=k=>TINTE_ID[k],C={};COLORES16.forEach(([cl],k)=>C[cl]=k);
 recetaSin([I.harinaHueso],T(C.blanco)); recetaSin([B.florAmarilla],T(C.amarillo)); recetaSin([B.florRoja],T(C.rojo)); recetaSin([B.aciano],T(C.azul));
 recetaSin([B.orquidea],T(C.azulClaro)); recetaSin([B.margarita],T(C.grisClaro)); recetaSin([I.lapis],T(C.azul)); recetaSin([I.carbon],T(C.negro));
 recetaSin([B.champinonMarron],T(C.marron)); recetaSin([B.petalos],T(C.rosa)); recetaSin([B.floresSilvestres],T(C.amarillo),2); recetaSin([B.floresOjoOn],T(C.naranja));
 recetaSin([T(C.rojo),T(C.amarillo)],T(C.naranja),2); recetaSin([T(C.rojo),T(C.blanco)],T(C.rosa),2); recetaSin([T(C.azul),T(C.blanco)],T(C.azulClaro),2);
 recetaSin([T(C.verde),T(C.blanco)],T(C.lima),2); recetaSin([T(C.azul),T(C.verde)],T(C.cian),2); recetaSin([T(C.azul),T(C.rojo)],T(C.morado),2);
 recetaSin([T(C.morado),T(C.rosa)],T(C.magenta),2); recetaSin([T(C.negro),T(C.blanco)],T(C.gris),2); recetaSin([T(C.gris),T(C.blanco)],T(C.grisClaro),2);
 COLORES16.forEach((_,k)=>{
   if(k>0)recetaSin([B.lana,T(k)],LANA_COLOR[k]);
   recetaSin([T(k),B.arena,B.arena,B.arena,B.arena,B.grava,B.grava,B.grava,B.grava],HORMIGON[k],8);
   receta(['GGG','GTG','GGG'],{G:B.vidrio,T:T(k)},VIDRIO_COLOR[k],8);
   receta(['LL'],{L:LANA_COLOR[k]},ALFOMBRA[k],3);
 });}
receta(['SS'],{S:B.losaPiedra},B.piedraLisa);
receta(['PP','PP'],{P:547},B.prismarina); receta(['PPP','PPP','PPP'],{P:547},B.ladrillosPrismarina);
receta(['PPP','PTP','PPP'],{P:547,T:TINTE_ID[15]},B.prismarinaOscura); receta(['PCP','CCC','PCP'],{P:547,C:548},B.farolMarino);
receta(['GG','GG'],{G:B.granito},B.granitoPulido,4); receta(['GG','GG'],{G:B.diorita},B.dioritaPulida,4); receta(['GG','GG'],{G:B.andesita},B.andesitaPulida,4);
receta(['GG','GG'],{G:B.pizarraAdoquinada},B.pizarraPulida,4); receta(['GG','GG'],{G:B.pizarraPulida},B.ladrillosPizarra,4);
receta(['S','S'],{S:B.losaLadrillos},B.piedraCincelada); receta(['SS','SS'],{S:B.arenisca},B.areniscaCortada,4);
receta(['QQ','QQ'],{Q:I.cuarzo},B.bloqueCuarzo); receta(['Q','Q'],{Q:B.bloqueCuarzo},B.pilarCuarzo,2);
receta(['LLL','LLL','LLL'],{L:I.lapis},B.bloqueLapis); recetaSin([B.bloqueLapis],I.lapis,9);
receta(['EEE','EEE','EEE'],{E:I.esmeralda},B.bloqueEsmeralda); recetaSin([B.bloqueEsmeralda],I.esmeralda,9);
recetaSin([B.troncoAbedul],B.tablonesAbedul,4); recetaSin([B.troncoAbeto],B.tablonesAbeto,4); recetaSin([B.troncoJungla],B.tablonesJungla,4); recetaSin([B.troncoAcacia],B.tablonesAcacia,4);
receta(['III','ITI','III'],{I:I.pepitaOro,T:B.antorcha},B.farol); receta(['III','ITI','III'],{I:I.lingoteHierro,T:B.antorcha},B.farol,4);
receta(['PSP','P.P','PSP'],{P:B.tablones,S:B.losaMadera},B.barril);
[[B.escaleraArenisca,B.losaArenisca,B.arenisca],[B.escaleraLadrillo,B.losaLadrillo,B.ladrillos],[B.escaleraPizarra,B.losaPizarra,B.ladrillosPizarra],
 [B.escaleraCuarzo,B.losaCuarzo,B.bloqueCuarzo],[B.escaleraPiedraNegra,B.losaPiedraNegra,B.piedraNegra],[B.escaleraAbeto,B.losaAbeto,B.tablonesAbeto]].forEach(([e,l,m])=>{
  receta(['M..','MM.','MMM'],{M:m},e,4); receta(['MMM'],{M:m},l,6);});
recetaSin([B.troncoPalido],B.tablonesPalidos,4);
receta(['GG','GG'],{G:543},B.bloqueResina); recetaSin([B.bloqueResina],543,9);
receta(['LL','LL'],{L:544},B.ladrillosResina);
receta(['TTT','TST','TTT'],{T:I.lagrimaGhast,S:B.arenaAlmas},B.ghastSeco);
receta(['CCC','VLV'],{C:I.cuero,V:B.vidrio,L:B.lana},545);
receta(['CCC','C.C','CCC'],{C:I.lingoteCobre},B.cofreCobre);
{const c={M:I.lingoteCobre,S:I.palo};receta(['MMM','.S.','.S.'],c,306);receta(['MM','MS','.S'],c,316);receta(['M','S','S'],c,326);receta(['M','M','S'],c,336);receta(['MM','.S','.S'],c,346);
 const a={M:I.lingoteCobre};receta(['MMM','M.M'],a,405);receta(['M.M','MMM','MMM'],a,415);receta(['MMM','M.M','M.M'],a,425);receta(['M.M','M.M'],a,435);} recetaSin([539],538,4);
receta(['TT','TT'],{T:B.toba},B.ladrillosToba,4); receta(['CC','CC'],{C:I.lingoteCobre},B.cobreCortado);
receta(['.C.','CVC','.R.'],{C:B.cobreCortado,V:I.varaBlaze,R:I.redstone},B.bombillaCobre,4);
receta(['PP','PP'],{P:623},I.cuero);
// Recetas de la edición 27
COLORES16.forEach((c,k)=>{receta(['TTT','TDT','TTT'],{T:B.terracota,D:TINTE_ID[k]},1480+k,8);
  recetaSin([TINTE_ID[k],B.arena,B.arena,B.arena,B.arena,B.grava,B.grava,B.grava,B.grava],1512+k,8); recetaSin([1544,TINTE_ID[k]],1528+k);});
receta(['C','P'],{C:I.cuerda,P:660},1544); receta(['AA','AA'],{A:661},1545);
receta(['LLL','LLL','LLL'],{L:I.lingoteCobre},1575); receta(['PPP','HHH','PPP'],{P:B.tablones,H:660},1583);
recetaSin([651,651,651,651],1584); receta(['HH','HH'],{H:660},1585); receta(['L','L','L'],{L:I.lingoteHierro},1587);
receta(['.P.','PCP','TTT'],{P:I.palo,C:I.carbon,T:B.tronco},1588); receta(['.R.','RHR','.R.'],{R:I.redstone,H:B.heno},1590);
receta(['BCB','B.B','B.B'],{B:1594,C:I.cuerda},1593,6); receta(['PPP','PDP','PPP'],{P:B.tablones,D:I.diamante},1615);
receta(['.T.','THT','.T.'],{T:B.tronco,H:B.horno},1608); receta(['HHH','HOH','PPP'],{H:I.lingoteHierro,O:B.horno,P:B.piedraLisa},1609);
receta(['T.T','T.T','TTT'],{T:B.tablones},1610); receta(['.H.','PPP'],{H:I.lingoteHierro,P:B.piedra},1611);
receta(['PPP','.E.','.P.'],{P:B.tablones,E:B.estanteria},1612); receta(['FF','TT','TT'],{F:I.pedernal,T:B.tablones},1613);
receta(['H.H','H.H','HHH'],{H:I.lingoteHierro},1614); receta(['PP','TT','TT'],{P:I.papel,T:B.tablones},1606); receta(['CC','TT'],{C:I.cuerda,T:B.tablones},1607);
receta(['TAT'],{T:I.trigo,A:I.azucar||516},648,8); recetaSin([B.calabaza,I.azucar||516,677],649); receta(['PPP','PZP','PPP'],{P:I.pepitaOro,Z:640},650);
recetaSin([644,644,644,644,644,644,252],645); recetaSin([621,640,642,B.champinonMarron,252],652);
receta(['.H.','HRH','.H.'],{H:I.lingoteHierro,R:I.redstone},653); receta(['.O.','ORO','.O.'],{O:I.lingoteOro,R:I.redstone},654);
receta(['PPP','PBP','PPP'],{P:I.papel,B:653},655); receta(['CC.','CB.','..C'],{C:I.cuerda,B:525},657,2); receta(['A','C','C'],{A:661,C:I.lingoteCobre},659);
receta(['.P.','PFP','.P.'],{P:I.polvoLuminoso,F:I.flecha},676,2); recetaSin([624],TINTE_ID[COLORES16.findIndex(c=>c[0]==='negro')]||I.cuero);
// Los tablones de cerezo y mangle sirven en todas las recetas de madera
const EQUIV_RECETA={[B.tablonesAbedul]:B.tablones,[B.tablonesAbeto]:B.tablones,[B.tablonesJungla]:B.tablones,[B.tablonesAcacia]:B.tablones,[B.barril]:B.cofre,[B.tablonesPalidos]:B.tablones,[B.troncoPalido]:B.tronco,[B.cofreCobre]:B.cofre,[B.tablonesCerezo]:B.tablones,[B.tablonesRobleOscuro]:B.tablones,[B.troncoRobleOscuro]:B.tronco,[B.tablonesMangle]:B.tablones,[B.troncoCerezo]:B.tronco,[B.troncoMangle]:B.tronco};

function buscarReceta(grid,w){
  const exacta=buscarRecetaExacta(grid,w);
  if(exacta||!grid.some(v=>EQUIV_RECETA[v]))return exacta;
  return buscarRecetaExacta(grid.map(v=>EQUIV_RECETA[v]||v),w);
}
function buscarRecetaExacta(grid,w){
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
const FUNDIR={614:615,616:617,620:621,641:642,1480:1496,1481:1497,1482:1498,1483:1499,1484:1500,1485:1501,1486:1502,1487:1503,1488:1504,1489:1505,1490:1506,1491:1507,1492:1508,1493:1509,1494:1510,1495:1511,
  [I.hierroBruto]:I.lingoteHierro,[I.oroBruto]:I.lingoteOro,[I.cobreBruto]:I.lingoteCobre,
  [B.menaHierro]:I.lingoteHierro,[B.menaOro]:I.lingoteOro,[B.menaCobre]:I.lingoteCobre,[B.menaDiamante]:I.diamante,
  [B.menaCarbon]:I.carbon,[B.menaLapis]:I.lapis,[B.menaRedstone]:I.redstone,[B.menaEsmeralda]:I.esmeralda,[B.menaCuarzo]:I.cuarzo,
  [B.pHierro]:I.lingoteHierro,[B.pOro]:I.lingoteOro,[B.pCobre]:I.lingoteCobre,[B.pDiamante]:I.diamante,
  [B.roca]:B.piedra,[B.arena]:B.vidrio,[B.arenaRoja]:B.vidrio,[B.tronco]:I.carbon,[B.troncoAbedul]:I.carbon,[B.troncoAbeto]:I.carbon,[B.troncoJungla]:I.carbon,[B.troncoAcacia]:I.carbon,
  [251]:250,[B.arcilla]:B.terracota,[519]:526,[B.piedraNegra]:B.piedraNegra,
  [I.cerdoCrudo]:I.cerdoAsado,[I.resCruda]:I.filete,[I.polloCrudo]:I.polloAsado,[I.corderoCrudo]:I.corderoAsado,
  [B.restosAncestrales]:534,[B.esponjaMojada]:B.esponja,[B.cactus]:TINTE_ID[13],[B.pizarraAdoquinada]:B.pizarra,[B.ladrillosPiedra]:B.ladrillosAgrietados,[B.arena+0]:B.vidrio,[543]:544,[B.troncoPalido]:I.carbon,[B.troncoCerezo]:I.carbon,[B.troncoRobleOscuro]:I.carbon,[B.troncoMangle]:I.carbon,
};
[B.restosAncestrales,B.bloqueNetherite].forEach(id=>ITEMS[id].ignifugo=true);
const COMBUSTIBLE={1178:15,1179:15,[I.carbon]:80,[B.bloqueCarbon]:800,[I.cuboLava]:1000,[I.varaBlaze]:120,[B.tablones]:15,[B.tronco]:15,
  94:15,95:15,96:15,97:15,[B.valla]:15,133:15,142:7.5,255:10,145:15,[B.estanteria]:15,252:5,
  [I.palo]:5,[B.mesa]:15,[B.cofre]:15,[B.brote]:5,[B.lana]:5,[I.arco]:15,[B.heno]:5,300:10,310:10,320:10,330:10,340:10,
  [B.troncoCerezo]:15,[B.troncoRobleOscuro]:15,[B.tablonesRobleOscuro]:15,[B.troncoMangle]:15,[B.tablonesCerezo]:15,[B.tablonesMangle]:15,[B.raicesMangle]:15,[B.mesaHerreria]:15};
const TIEMPO_FUNDIR=10;

/* ---------- Fermentación de pociones ---------- */
function resultadoFermentar(base,ing){
  if(base===501&&ing===515)return 502;
  if(base===502){const t={516:505,517:503,[I.polvoBlaze]:504,[I.lagrimaGhast]:506,518:507}[ing];if(t)return t;}
  if(base>=503&&base<=507&&ing===I.polvora)return base+7;
  return 0;
}
const DURACION_POCION={curacion:0,fuerza:180,rapidez:180,regeneracion:45,resistenciaFuego:180};
const NOMBRE_EFECTO={fuerza:'Fuerza',rapidez:'Rapidez',regeneracion:'Regeneración',resistenciaFuego:'Resistencia al fuego',veneno:'Veneno',hambre:'Hambre',oscuridad:'Oscuridad'};
