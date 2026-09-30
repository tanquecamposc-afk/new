"use strict";
/* =========================================================
   Estructuras más variadas y botín como en la edición Java.
   · Cofres con tablas de botín por «grupos» (pools): cada
     grupo hace un número aleatorio de tiradas y cada tirada
     elige una entrada según su peso (con entradas vacías).
     Las pilas se reparten en trozos por huecos al azar, las
     armas y armaduras pueden salir encantadas o gastadas.
   · Desgaste aleatorio: ladrillos de piedra musgosos o
     agrietados, adoquín musgoso bajo tierra, telarañas en las
     minas y ladrillos del Nether agrietados.
   · Mazmorras de 7x7, 7x9 o 9x9 con 1 o 2 cofres en paredes
     al azar y generador de zombi (50 %), esqueleto (25 %) o
     araña (25 %).
   · /probabilidades y /botin <tipo> muestran todas las
     probabilidades (y el README las recoge).
   ========================================================= */
const KB=k=>typeof k==='number'?k:(I[k]??B[k]??idClave(k));
// Entrada: [clave, mín, máx, peso, extra]  extra: 'enc' encantado al azar, número = encantar con ese nivel, 'gastado' durabilidad al azar
const LOOT={
  mazmorra:[
    {t:[1,3],e:[['silla',1,1,20],['manzanaDorada',1,1,15],['disco_13',1,1,15],['disco_cat',1,1,15],['etiqueta',1,1,20],['armaduraCaballo_oro',1,1,10],['armaduraCaballo_hierro',1,1,15],['armaduraCaballo_diamante',1,1,5],['libroEncantado',1,1,10,'enc']]},
    {t:[1,4],e:[['lingoteHierro',1,4,10],['lingoteOro',1,4,5],['pan',1,1,20],['trigo',1,4,20],['cubo',1,1,10],['redstone',1,4,15],['carbon',1,4,15],['semillasSandia',2,4,10],['semillasCalabaza',2,4,10],['semillasRemolacha',2,4,10]]},
    {t:[3,3],e:[['hueso',1,8,10],['polvora',1,8,10],['carnePodrida',1,8,10],['cuerda',1,8,10]]}],
  mina:[
    {t:[1,1],e:[['manzanaDorada',1,1,20],['etiqueta',1,1,30],['libroEncantado',1,1,10,'enc'],['pico_hierro',1,1,5],['nada',1,1,5]]},
    {t:[2,4],e:[['lingoteHierro',1,5,10],['lingoteOro',1,3,5],['redstone',4,9,5],['lapis',4,9,5],['diamante',1,2,3],['carbon',3,8,10],['pan',1,3,15],['bayasBrillantes',3,6,15],['semillasSandia',2,4,10],['semillasCalabaza',2,4,10],['semillasRemolacha',2,4,10]]},
    {t:[3,3],e:[['riel',4,8,20],['riel10',1,4,5],['antorcha',1,16,15]]}],
  piramide:[
    {t:[2,4],e:[['diamante',1,3,5],['lingoteHierro',1,5,15],['lingoteOro',2,7,15],['esmeralda',1,3,15],['hueso',4,6,25],['ojoArana',1,3,25],['carnePodrida',3,7,25],['silla',1,1,20],['armaduraCaballo_hierro',1,1,15],['armaduraCaballo_oro',1,1,10],['armaduraCaballo_diamante',1,1,5],['libroEncantado',1,1,20,'enc'],['manzanaDorada',1,1,20],['nada',1,1,15]]},
    {t:[4,4],e:[['hueso',1,8,10],['polvora',1,8,10],['carnePodrida',1,8,10],['cuerda',1,8,10],['arena',1,8,10]]}],
  templo:[
    {t:[2,6],e:[['diamante',1,3,3],['lingoteHierro',1,5,10],['lingoteOro',2,7,15],['esmeralda',1,3,2],['hueso',4,6,20],['carnePodrida',3,7,16],['silla',1,1,3],['armaduraCaballo_hierro',1,1,1],['armaduraCaballo_oro',1,1,1],['armaduraCaballo_diamante',1,1,1],['libroEncantado',1,1,1,30],['flecha',2,7,8]]}],
  fortaleza:[
    {t:[2,3],e:[['perlaEnder',1,1,10],['diamante',1,3,3],['lingoteHierro',1,5,10],['lingoteOro',1,3,5],['redstone',4,9,5],['pan',1,3,15],['manzana',1,3,15],['pico_hierro',1,1,5],['espada_hierro',1,1,5],['pechera_hierro',1,1,5],['casco_hierro',1,1,5],['pantalones_hierro',1,1,5],['botas_hierro',1,1,5],['manzanaDorada',1,1,1],['silla',1,1,1],['armaduraCaballo_hierro',1,1,1],['armaduraCaballo_oro',1,1,1],['armaduraCaballo_diamante',1,1,1],['libroEncantado',1,1,1,30]]}],
  aldea:[
    {t:[3,8],e:[['pepitaOro',1,3,1],['florAmarilla',1,1,2],['florRoja',1,1,1],['patata',1,5,10],['pan',1,4,10],['manzana',1,5,10],['libro',1,1,1],['pluma',1,1,1],['esmeralda',1,4,2],['brote',1,2,5],['trigo',2,7,6],['antorcha',1,8,4]]}],
  herreria:[
    {t:[3,8],e:[['diamante',1,3,3],['lingoteHierro',1,5,10],['lingoteOro',1,3,5],['pan',1,3,15],['manzana',1,3,15],['pico_hierro',1,1,5],['espada_hierro',1,1,5],['pechera_hierro',1,1,5],['casco_hierro',1,1,5],['pantalones_hierro',1,1,5],['botas_hierro',1,1,5],['obsidiana',3,7,5],['brote',3,7,5],['silla',1,1,3],['armaduraCaballo_hierro',1,1,1],['armaduraCaballo_oro',1,1,1],['armaduraCaballo_diamante',1,1,1]]}],
  portalRuinas:[
    {t:[4,8],e:[['obsidiana',1,2,40],['pedernal',1,4,40],['mechero',1,1,40],['manzanaDorada',1,1,15],['pepitaOro',4,24,15],['espada_oro',1,1,15,'enc'],['hacha_oro',1,1,15,'enc'],['azada_oro',1,1,15,'enc'],['pala_oro',1,1,15,'enc'],['pico_oro',1,1,15,'enc'],['botas_oro',1,1,15,'enc'],['pechera_oro',1,1,15,'enc'],['casco_oro',1,1,15,'enc'],['pantalones_oro',1,1,15,'enc'],['melonBrillante',4,12,5],['armaduraCaballo_oro',1,1,5],['zanahoriaDorada',4,12,5],['reloj',1,1,5],['lingoteOro',2,8,5],['campana',1,1,1],['bloqueOro',1,2,1]]}],
  ciudadEnd:[
    {t:[2,6],e:[['diamante',2,7,5],['lingoteHierro',4,8,10],['lingoteOro',2,7,15],['esmeralda',2,6,2],['semillasRemolacha',1,10,5],['silla',1,1,3],['armaduraCaballo_hierro',1,1,1],['armaduraCaballo_oro',1,1,1],['armaduraCaballo_diamante',1,1,1],
      ['espada_diamante',1,1,3,30],['botas_diamante',1,1,3,30],['pechera_diamante',1,1,3,30],['pantalones_diamante',1,1,3,30],['casco_diamante',1,1,3,30],['pico_diamante',1,1,3,30],['pala_diamante',1,1,3,30],
      ['espada_hierro',1,1,3,30],['botas_hierro',1,1,3,30],['pechera_hierro',1,1,3,30],['pantalones_hierro',1,1,3,30],['casco_hierro',1,1,3,30],['pico_hierro',1,1,3,30],['pala_hierro',1,1,3,30]]}],
  fortalezaNether:[
    {t:[2,4],e:[['diamante',1,3,5],['lingoteHierro',1,5,5],['lingoteOro',1,3,15],['espada_oro',1,1,5],['pechera_oro',1,1,5],['mechero',1,1,5],['verrugaNether',3,7,5],['silla',1,1,10],['armaduraCaballo_oro',1,1,8],['armaduraCaballo_hierro',1,1,5],['armaduraCaballo_diamante',1,1,3],['obsidiana',2,4,2]]},
    {t:[1,1],e:[['plantillaNetherite',1,1,1],['nada',1,1,14]]}],
  bastion:[
    {t:[1,1],e:[['pico_diamante',1,1,6,'enc'],['pala_diamante',1,1,6,'enc'],['ballesta',1,1,6,'enc'],['restosAncestrales',1,1,12],['chatarraNetherite',1,1,4],['flechaEspectral',10,22,10],['zanahoriaDorada',6,17,12],['manzanaDorada',1,1,9],['libroEncantado',1,1,10,'enc']]},
    {t:[2,2],e:[['espada_hierro',1,1,2,'enc'],['bloqueHierro',1,1,2],['botas_oro',1,1,1,'enc'],['hacha_oro',1,1,1,'enc'],['bloqueOro',1,1,2],['ballesta',1,1,1],['lingoteOro',1,6,2],['lingoteHierro',1,6,2],['espada_oro',1,1,2],['pechera_oro',1,1,2],['casco_oro',1,1,2],['pantalones_oro',1,1,2]]},
    {t:[3,4],e:[['obsidianaLlorosa',1,5,1],['cadena',2,10,1],['cremaMagma',2,6,2],['bloqueHueso',3,6,1],['obsidiana',4,6,1],['pepitaOro',2,8,1],['cuerda',4,6,1],['flecha',5,17,2],['cerdoAsado',1,1,1],['piedraNegra',5,15,1]]},
    {t:[1,1],e:[['plantillaNetherite',1,1,1],['nada',1,1,9]]}],
  naufragio:[
    {t:[3,10],e:[['papel',1,12,8],['patata',2,6,7],['bloqueMusgo',1,4,7],['patataVenenosa',2,6,7],['zanahoria',4,8,7],['trigo',8,21,7],['estofado',1,1,10],['carbon',2,8,6],['carnePodrida',5,24,5],['calabaza',1,3,2],['bambu',1,3,2],['polvora',1,5,3],['tnt',1,2,1],['casco_cuero',1,1,3,'enc'],['pechera_cuero',1,1,3,'enc'],['pantalones_cuero',1,1,3,'enc'],['botas_cuero',1,1,3,'enc']]},
    {t:[3,6],e:[['lingoteHierro',1,5,90],['lingoteOro',1,5,10],['esmeralda',1,5,40],['diamante',1,1,5]]},
    {t:[1,1],e:[['mapa',1,1,1],['brujula',1,1,1],['reloj',1,1,1],['nada',1,1,3]]}],
  tesoroEnterrado:[
    {t:[1,1],e:[['corazonMar',1,1,1]]},
    {t:[5,8],e:[['lingoteHierro',1,4,20],['lingoteOro',1,4,10],['tnt',1,2,5]]},
    {t:[1,3],e:[['esmeralda',4,8,5],['diamante',1,2,5],['cristalPrismarina',1,5,5]]},
    {t:[0,1],e:[['pechera_cuero',1,1,1],['espada_hierro',1,1,1]]},
    {t:[2,2],e:[['bacalaoCocinado',2,4,1],['salmonCocinado',2,4,1]]},
    {t:[0,2],e:[['pocionRara',1,1,1]]}],
  iglu:[
    {t:[2,8],e:[['manzana',1,3,15],['carbon',1,4,15],['pepitaOro',1,3,10],['hacha_piedra',1,1,2],['carnePodrida',1,1,10],['esmeralda',1,1,1],['trigo',2,3,10]]},
    {t:[1,1],e:[['manzanaDorada',1,1,1]]}],
  ruinasOceano:[
    {t:[2,8],e:[['carbon',1,4,10],['hacha_piedra',1,1,2],['carnePodrida',1,1,5],['esmeralda',1,1,1],['trigo',2,3,10],['pepitaOro',1,3,5],['manzanaDorada',1,1,1],['libroEncantado',1,1,5,'enc']]},
    {t:[1,1],e:[['pechera_cuero',1,1,1],['casco_oro',1,1,1],['canaPescar',1,1,5,'enc'],['mapa',1,1,10]]}],
  puesto:[
    {t:[0,1],e:[['ballesta',1,1,1]]},
    {t:[2,3],e:[['trigo',3,5,7],['patata',2,5,5],['zanahoria',3,5,5]]},
    {t:[1,3],e:[['troncoRobleOscuro',2,3,1]]},
    {t:[2,3],e:[['cuerda',1,6,4],['flecha',2,7,4],['lingoteHierro',1,3,3],['libroEncantado',1,1,1,'enc']]},
    {t:[1,1],e:[['cuernoCabra',1,1,1],['nada',1,1,1]]}],
  mansion:[
    {t:[1,3],e:[['rienda',1,1,20],['manzanaDorada',1,1,15],['disco_13',1,1,15],['disco_cat',1,1,15],['etiqueta',1,1,20],['pechera_hierro',1,1,10],['azada_diamante',1,1,15],['pechera_diamante',1,1,5],['libroEncantado',1,1,10,'enc']]},
    {t:[1,4],e:[['lingoteHierro',1,4,10],['lingoteOro',1,4,5],['pan',1,1,20],['trigo',1,4,20],['cubo',1,1,10],['redstone',1,4,15],['carbon',1,4,15],['semillasSandia',2,4,10],['semillasCalabaza',2,4,10],['semillasRemolacha',2,4,10]]},
    {t:[3,3],e:[['hueso',1,8,10],['polvora',1,8,10],['carnePodrida',1,8,10],['cuerda',1,8,10]]}],
  ciudadAntigua:[
    {t:[5,10],e:[['brujula',1,1,2],['catalizador',1,2,2],['disco_13',1,1,2],['disco_cat',1,1,2],['rienda',1,1,2],['etiqueta',1,1,2],['fragmentoAmatista',1,15,3],['hueso',1,15,5],['farolAlmas',1,15,5],['sculk',4,10,3],['sensorSculk',1,3,3],['harinaHueso',1,15,5],['carbon',6,15,7],['fragmentoEco',1,3,4],['manzanaDorada',1,2,4],['libro',3,10,5],['azada_diamante',1,1,2,30],['pantalones_diamante',1,1,2,30],['perlaEnder',1,3,2],['bolaNieve',1,15,2]]}],
  camaraPrueba:[
    {t:[1,3],e:[['hacha_hierro',1,1,1],['panal',1,8,1],['hacha_piedra',1,1,2],['pico_piedra',1,1,2],['perlaEnder',1,2,2],['bambu',3,6,2],['toba',8,20,3],['andamio',3,6,2],['antorcha',3,6,2],['flecha',4,14,2],['cargaViento',1,3,3]]}],
  bruja:[
    {t:[2,5],e:[['ojoArana',1,3,15],['polvoLuminoso',1,4,10],['azucar',1,4,10],['redstone',1,4,10],['frasco',1,3,10],['verrugaNether',1,3,6],['pocionRara',1,1,4],['libroEncantado',1,1,3,'enc']]}],
};
LOOT.igluSotano=LOOT.iglu;
// Nombre para mostrar de cada tipo de cofre
const NOMBRE_COFRE={mazmorra:'Mazmorra',mina:'Mina abandonada',piramide:'Pirámide del desierto',templo:'Templo de la jungla',fortaleza:'Fortaleza (pasillo)',aldea:'Casa de aldea',
  herreria:'Herrería de aldea',portalRuinas:'Portal en ruinas',ciudadEnd:'Ciudad del End',fortalezaNether:'Fortaleza del Nether',bastion:'Bastión en ruinas',naufragio:'Naufragio',
  tesoroEnterrado:'Tesoro enterrado',iglu:'Iglú',igluSotano:'Sótano del iglú',ruinasOceano:'Ruinas oceánicas',puesto:'Puesto de saqueadores',mansion:'Mansión del bosque',
  ciudadAntigua:'Ciudad antigua',camaraPrueba:'Cámara de prueba',bruja:'Cabaña de bruja'};

function tirarGrupo(g,rnd,res){
  const n=g.t[0]+Math.floor(rnd()*(g.t[1]-g.t[0]+1)), total=g.e.reduce((a,x)=>a+x[3],0);
  for(let i=0;i<n;i++){
    let r=rnd()*total,e=g.e[0];for(const x of g.e){r-=x[3];if(r<0){e=x;break;}}
    if(e[0]==='nada')continue;
    const id=KB(e[0]); if(!id||!ITEMS[id])continue;
    const p=crearPila(id,Math.min(maxPila(id),e[1]+Math.floor(rnd()*(e[2]-e[1]+1))));
    const ex=e[4];
    if(id===I.libroEncantado||id===546)p.enc=typeof ex==='number'?aObjetoEnc(elegirEncantos(248,ex,rnd,true)):libroAleatorio(rnd);
    else if(ex==='enc'||typeof ex==='number'){const lista=elegirEncantos(id,typeof ex==='number'?ex:5+Math.floor(rnd()*26),rnd,true);if(lista.length)p.enc=aObjetoEnc(ex==='enc'?[lista[0]]:lista);}
    if(ITEMS[id].dur&&(ex==='gastado'||(ex==='enc'&&rnd()<.6)))p.dur=Math.max(1,Math.floor(ITEMS[id].dur*(.15+rnd()*.8)));
    res.push(p);
  }
}
// Como en Java: las pilas se parten en trozos para ocupar huecos libres y todo se reparte al azar
function repartirEnCofre(pilas,rnd){
  const cofre=new Array(27).fill(null);
  const libres=[...Array(27).keys()];for(let i=26;i>0;i--){const j=Math.floor(rnd()*(i+1));[libres[i],libres[j]]=[libres[j],libres[i]];}
  pilas=pilas.slice(0,27);
  let huecos=27-pilas.length;
  for(let k=0;k<pilas.length&&huecos>0;k++){const p=pilas[k];
    while(p.n>1&&huecos>0&&rnd()<.5){const m=1+Math.floor(rnd()*(p.n/2));p.n-=m;const q=crearPila(p.id,m);if(p.enc)q.enc=p.enc;if(p.dur!==undefined)q.dur=p.dur;pilas.push(q);huecos--;}}
  pilas.forEach((p,i)=>{if(i<27)cofre[libres[i]]=p;});
  return cofre;
}
function botinDe(tipo,rnd){const tabla=LOOT[tipo];if(!tabla)return null;const pilas=[];for(const g of tabla)tirarGrupo(g,rnd,pilas);return repartirEnCofre(pilas,rnd);}
const _generarBotinE28=generarBotin;
generarBotin=function(tipo,rnd){return botinDe(tipo,rnd)||_generarBotinE28(tipo,rnd);};

/* ---------- Desgaste aleatorio de las estructuras ---------- */
function desgastar(ch,sub){
  const d=ch.datos, s=semilla+28000, bx=ch.cx*CX, bz=ch.cz*CZ;
  const LP=B.ladrillosPiedra, LM=B.ladrillosMusgo, LA=B.ladrillosAgrietados, R=B.roca, RM=B.rocaMusgo, TEL=B.telarana, LN=B.ladrilloNether;
  const LNA=B.ladrillosNetherAgrietados;
  const bajo=NIVEL_MAR-6;
  for(let y=1;y<CY-1;y++)for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const i=idx(x,y,z), b=d[i]; if(!b)continue;
    const h=hash3(bx+x,y,bz+z,s);
    if(b===LP){if(h<.14)d[i]=LM;else if(h<.24&&LA)d[i]=LA;}
    else if(b===R&&sub&&y<bajo){if(h<.18)d[i]=RM;}
    else if(b===LN&&LNA&&h<.08)d[i]=LNA;
    // Telarañas en las esquinas de las minas (junto a tablones o vallas, bajo tierra)
    if(sub&&TEL&&y<bajo&&(b===B.tablones||b===B.valla)&&h>.965){const a=idx(x,y-1,z);if(y>1&&!d[a])d[a]=TEL;}
  }
}
const _generarSuperficieE28=generarSuperficie;
generarSuperficie=function(ch){_generarSuperficieE28(ch);if(typeof esOneBlock==='function'&&esOneBlock())return;desgastar(ch,true);};
const _generarNetherE28=generarNether;
generarNether=function(ch){_generarNetherE28(ch);desgastar(ch,false);};

/* ---------- Probabilidades de aparición de las estructuras ---------- */
// [nombre, dónde, probabilidad, frecuencia aproximada]
const PROB_ESTRUCTURAS=[
  ['Aldea','llanuras, desierto, sabana, taiga y nieve','60 % por región de 320×320 bloques','≈ 1 cada 170.000 bloques²'],
  ['Mazmorra','bajo tierra (altura 18-68), cualquier bioma','3,5 % por chunk','≈ 1 cada 29 chunks'],
  ['Mina abandonada','bajo tierra','22 % por región de 5×5 chunks','≈ 1 cada 114 chunks'],
  ['Portal en ruinas','superficie, cualquier bioma','0,6 % por chunk','≈ 1 cada 167 chunks'],
  ['Pozo del desierto','desierto','1 % por chunk de desierto','≈ 1 cada 100 chunks de desierto'],
  ['Pirámide del desierto','desierto','50 % por región de 256×256 si el centro cae en desierto','≈ 1 cada 512 chunks (solo en desierto)'],
  ['Templo de la jungla','jungla','0,8 % por chunk de jungla','≈ 1 cada 125 chunks de jungla'],
  ['Cabaña de bruja','pantano y manglar','1,8 % por chunk','≈ 1 cada 56 chunks de pantano'],
  ['Iglú','llanura nevada','3,5 % por chunk (50 % con sótano)','≈ 1 cada 29 chunks nevados'],
  ['Puesto de saqueadores','superficie','0,4 % por chunk','≈ 1 cada 250 chunks'],
  ['Naufragio','playa y océano','1,2 % por chunk','≈ 1 cada 83 chunks de mar'],
  ['Ruinas oceánicas','océanos','4 % por chunk','≈ 1 cada 25 chunks de mar'],
  ['Tesoro enterrado','playa','5 % por chunk de playa','≈ 1 cada 20 chunks de playa'],
  ['Monumento oceánico','océano profundo','60 % por región de 448×448','≈ 1 cada 1.300 chunks'],
  ['Ruinas del sendero','bosques, taiga, jungla y cerezos','0,7 % por chunk','≈ 1 cada 143 chunks de bosque'],
  ['Roca del bosque','taiga','12 % por chunk','≈ 1 cada 8 chunks de taiga'],
  ['Geoda de amatista','bajo tierra','3,5 % por chunk','≈ 1 cada 29 chunks'],
  ['Fósil','desierto y pantano (enterrado)','3 % por chunk','≈ 1 cada 33 chunks'],
  ['Mansión del bosque','bosque oscuro','50 % por región de 480×480','≈ 1 cada 1.800 chunks (si hay bosque oscuro)'],
  ['Ciudad antigua','bajo tierra profunda','65 % por región de 288×288','≈ 1 cada 500 chunks'],
  ['Cámara de prueba','bajo tierra','55 % por región de 320×320','≈ 1 cada 720 chunks'],
  ['Fortaleza','una por mundo, lejos del origen','100 %','única'],
  ['Fortaleza del Nether','Nether','80 % por región de 176×176','≈ 1 cada 150 chunks del Nether'],
  ['Bastión en ruinas','Nether','45 % por región de 240×240','≈ 1 cada 500 chunks del Nether'],
  ['Ghast seco','valle de almas','12 % por chunk','común en el valle'],
  ['Ciudad del End','islas exteriores del End','55 % por región de 96×96 (con barco y élitros al azar)','≈ 1 cada 64 chunks del End'],
];
const PROB_GENERADOR=[['Zombi',50],['Esqueleto',25],['Araña',25]];
// Probabilidad de cada objeto en un cofre de un tipo (simulando muchos cofres)
function probabilidadesBotin(tipo,n=3000){
  const tabla=LOOT[tipo]; if(!tabla)return null;
  const r=mulberry32(12345), cuenta=new Map(), total=new Map();
  for(let k=0;k<n;k++){const vistos=new Set();const pilas=[];for(const g of tabla)tirarGrupo(g,r,pilas);
    for(const p of pilas){total.set(p.id,(total.get(p.id)||0)+p.n);vistos.add(p.id);}for(const id of vistos)cuenta.set(id,(cuenta.get(id)||0)+1);}
  return [...cuenta.entries()].map(([id,c])=>({id,nombre:ITEMS[id].nombre,prob:c/n,media:total.get(id)/c})).sort((a,b)=>b.prob-a.prob);
}
function informeProbabilidades(){
  const L=[];
  L.push('## Probabilidades de las estructuras\n','| Estructura | Dónde | Probabilidad | Frecuencia |','|---|---|---|---|');
  for(const [n,d,p,f] of PROB_ESTRUCTURAS)L.push(`| ${n} | ${d} | ${p} | ${f} |`);
  L.push('\nGenerador de las mazmorras: '+PROB_GENERADOR.map(([m,p])=>`${m} ${p} %`).join(' · ')+'. Tamaño: 7×7, 7×9 o 9×9 (25 %/50 %/25 %); 1 cofre (50 %) o 2 (50 %).');
  L.push('Desgaste: ladrillos de piedra → musgosos 14 %, agrietados 10 %; adoquín bajo tierra → musgoso 18 %; ladrillos del Nether → agrietados 8 %; telarañas junto a la madera de las minas 3,5 %.\n');
  L.push('## Botín de los cofres\n','Cada cofre tira varios grupos. «Prob.» es la probabilidad de encontrar el objeto en un cofre; «Media» es cuántos salen de media cuando sale.\n');
  for(const t of Object.keys(LOOT)){if(t==='igluSotano')continue;const pr=probabilidadesBotin(t);
    L.push(`### ${NOMBRE_COFRE[t]||t}\n`);
    L.push('Grupos: '+LOOT[t].map(g=>g.t[0]===g.t[1]?`${g.t[0]} tirada${g.t[0]===1?'':'s'}`:`${g.t[0]}-${g.t[1]} tiradas`).join(' + ')+'\n');
    L.push('| Objeto | Prob. | Media |','|---|---|---|');
    for(const e of pr)L.push(`| ${e.nombre} | ${(e.prob*100).toFixed(e.prob<.1?1:0)} % | ${e.media.toFixed(1)} |`);
    L.push('');}
  return L.join('\n');
}
const _ejecutarComandoE28=ejecutarComando;
ejecutarComando=function(t){
  const a=t.replace(/^\//,'').trim().split(/\s+/), c=(a[0]||'').toLowerCase();
  if(c==='probabilidades'||c==='estructuras'){
    escribirChat('Probabilidades de aparición:');for(const [n,,p] of PROB_ESTRUCTURAS)escribirChat(`· ${n}: ${p}`);
    escribirChat('Botín: /botin '+Object.keys(LOOT).filter(k=>k!=='igluSotano').join(' | '));return;}
  if(c==='botin'||c==='botín'){
    const tipo=Object.keys(LOOT).find(k=>k.toLowerCase()===(a[1]||'').toLowerCase()||(NOMBRE_COFRE[k]||'').toLowerCase().startsWith((a.slice(1).join(' ')||'#').toLowerCase()));
    if(!tipo){escribirChat('Uso: /botin '+Object.keys(LOOT).filter(k=>k!=='igluSotano').join(' | '));return;}
    const pr=probabilidadesBotin(tipo,1500);escribirChat(`Botín de ${NOMBRE_COFRE[tipo]} (probabilidad por cofre):`);
    escribirChat(pr.map(e=>`${e.nombre} ${(e.prob*100).toFixed(e.prob<.1?1:0)} %`).join(' · '));return;}
  return _ejecutarComandoE28(t);
};
