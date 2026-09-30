"use strict";
/* =========================================================
   Pestaña «Bloques de construcción» ordenada como en la
   edición Java: maderas (tablones, escaleras, losas, vallas),
   piedra y sus variantes, pizarra, ladrillos, arenisca,
   prismarina, Nether, End, cuarzo, cobre y bloques de metal.
   Las plantas y suelos que se colaban aquí pasan a la
   pestaña de bloques naturales.
   ========================================================= */
const ORDEN_CONSTRUCCION=('tablones escaleraMadera losaMadera valla tablonesAbeto escaleraAbeto losaAbeto tablonesAbedul tablonesJungla tablonesAcacia '+
  'tablonesRobleOscuro tablonesMangle tablonesCerezo tablonesPalidos talloCarmesi talloDistorsionado '+
  'piedra losaPiedra piedraLisa ladrillosPiedra ladrillosMusgo ladrillosAgrietados piedraCincelada roca escaleraRoca losaRoca rocaMusgo '+
  'granito granitoPulido diorita dioritaPulida andesita andesitaPulida '+
  'pizarra pizarraAdoquinada escaleraPizarra losaPizarra pizarraPulida ladrillosPizarra baldosasPizarra pizarraReforzada toba ladrillosToba '+
  'ladrillos escaleraLadrillos losaLadrillos escaleraLadrillo losaLadrillo ladrillosBarro '+
  'arenisca areniscaCortada escaleraArenisca losaArenisca arenaRoja '+
  'prismarina ladrillosPrismarina prismarinaOscura farolMarino '+
  'netherrack ladrilloNether ladrillosNether basalto basaltoLiso piedraNegra escaleraPiedraNegra losaPiedraNegra bloqueMagma arenaAlmas sueloAlmas piedraLuminosa luzHongo verrugaBloque verrugaDistBloque bloqueHueso '+
  'piedraEnd ladrillosEnd purpur pilarPurpur varaEnd '+
  'bloqueCuarzo pilarCuarzo escaleraCuarzo losaCuarzo '+
  'bloqueCobre cobreExpuesto cobreErosionado cobreOxidado cobreCortado cobreCortadoExpuesto cobreCortadoErosionado cobreCortadoOxidado bombillaCobre '+
  'bloqueCarbon bloqueHierro bloqueOro bloqueLapis bloqueEsmeralda bloqueDiamante bloqueNetherite restosAncestrales '+
  'obsidiana obsidianaLlorosa vidrio panel hieloCompacto bloqueResina ladrillosResina bloqueMiel bloquePanal heno esponja esponjaMojada').split(' ');
const RANGO_CONSTR=new Map(ORDEN_CONSTRUCCION.map((k,i)=>[k,i]));
const A_NATURALEZA=new Set(['cultivo','nenufar','capaNieve','petalos','hojarasca','floresSilvestres','plantaCoro','florCoro','vetaSculk','alfombraMusgo',
  'micelio','podzol','bloqueMusgo','cespedNevado','raicesMangle','setaRojaGigante','setaMarronGigante','talloSeta','nilioCarmesi','nilioDistorsionado','senda','arenaSospechosa','gravaSospechosa']);
const _categoriaItemB28=categoriaItem;
categoriaItem=function(id){const c=_categoriaItemB28(id);
  if(c==='construccion'&&BLOQUES[id]&&A_NATURALEZA.has(BLOQUES[id].clave))return 'naturaleza';return c;};
const _idsPestanaB28=idsPestana;
idsPestana=function(k){const ids=_idsPestanaB28(k);if(k!=='construccion')return ids;
  const rango=i=>{const r=RANGO_CONSTR.get(ITEMS[i].clave);return r===undefined?1e4+i:r;};
  return ids.slice().sort((a,b)=>rango(a)-rango(b));};
