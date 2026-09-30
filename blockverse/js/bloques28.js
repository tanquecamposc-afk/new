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

/* =========================================================
   Cofres dobles: al poner un cofre junto a otro sencillo se
   unen en un cofre grande de 54 huecos (agachado se pone
   suelto, como en el original). Cada mitad guarda sus 27
   huecos; al romper una, la otra vuelve a ser un cofre
   sencillo y la rota suelta lo suyo. La tapa se abre entera.
   ========================================================= */
const DIR_DOBLE=[[1,0],[-1,0],[0,1],[0,-1]];
const COFRE_DOBLE=1638, COFRE_DOBLE_ABIERTO=1642;
const dirCofreDoble=b=>b>=1638&&b<=1645?(b-1638)%4:-1;
const abiertoDoble=b=>b>=1642&&b<=1645;
for(let i=1638;i<=1645;i++)if(typeof INAMOVIBLE!=='undefined')INAMOVIBLE.add(i);
function parejaCofre(x,y,z){
  const d=dirCofreDoble(getBloque(x,y,z)); if(d<0)return null;
  const [dx,dz]=DIR_DOBLE[d], X=x+dx, Z=z+dz;
  return dirCofreDoble(getBloque(X,y,Z))===(d^1)?{x:X,y,z:Z,d}:null;
}
// Unir un cofre recién puesto con un vecino sencillo (primero el que queda a la izquierda al mirarlo)
function unirCofre(x,y,z){
  if(getBloque(x,y,z)!==B.cofre)return false;
  for(let d=0;d<4;d++){const [dx,dz]=DIR_DOBLE[d];
    if(getBloque(x+dx,y,z+dz)!==B.cofre)continue;
    setBloque(x,y,z,COFRE_DOBLE+d,{sinAviso:true}); setBloque(x+dx,y,z+dz,COFRE_DOBLE+(d^1),{sinAviso:true});
    return true;}
  return false;
}
const _colocarBloqueB28=colocarBloque;
colocarBloque=function(id){
  const q=id===B.cofre?posColocar():null;
  const ok=_colocarBloqueB28(id);
  if(ok&&q&&!jugador.agachado)unirCofre(q[0],q[1],q[2]);
  return ok;
};
// Al romper una mitad, la otra vuelve a ser un cofre sencillo
const _setBloqueB28=setBloque;
setBloque=function(x,y,z,id,opc){
  const ant=getBloque(x,y,z), d=dirCofreDoble(ant);
  if(d>=0&&dirCofreDoble(id)!==d){
    const [dx,dz]=DIR_DOBLE[d], X=x+dx, Z=z+dz;
    _setBloqueB28(x,y,z,id,opc);
    if(dirCofreDoble(getBloque(X,y,Z))===(d^1)){
      if(tapa&&tapa.doble)cerrarTapaCofre(true);
      if(typeof ui!=='undefined'&&ui&&ui.tipo==='cofre'&&ui.doble)cerrarUI();
      _setBloqueB28(X,y,Z,B.cofre,{sinAviso:true});}
    return;
  }
  return _setBloqueB28(x,y,z,id,opc);
};
// Contenido de la pantalla: las dos mitades seguidas (la de menor coordenada arriba)
obtenerCofreUI=function(pos,k){
  const par=pos&&parejaCofre(pos.x,pos.y,pos.z);
  if(!par)return obtenerCofre(k);
  const kp=claveCont(par.x,par.y,par.z), primero=(par.x+par.z)>(pos.x+pos.z);
  const A=obtenerCofre(primero?k:kp), Bm=obtenerCofre(primero?kp:k);
  const arr=new Proxy(new Array(54).fill(null),{
    get:(t,p)=>{if(p==='length')return 54;if(typeof p==='string'&&/^\d+$/.test(p)){const i=+p;return i<27?A[i]:Bm[i-27];}
      if(p==='forEach')return f=>{for(let i=0;i<54;i++)f(i<27?A[i]:Bm[i-27],i);};
      return Reflect.get(t,p);},
    set:(t,p,v)=>{if(typeof p==='string'&&/^\d+$/.test(p)){const i=+p;if(i<27)A[i]=v;else Bm[i-27]=v;return true;}return Reflect.set(t,p,v);}
  });
  return arr;
};
/* ---- Tapa grande animada ---- */
function abrirTapaDoble(x,y,z){
  const par=parejaCofre(x,y,z); if(!par)return;
  cerrarTapaCofre(true);
  const d=par.d, ejeX=d<2;
  const cx=(x+par.x)/2+.5, cz=(z+par.z)/2+.5;
  setBloque(x,y,z,COFRE_DOBLE_ABIERTO+d,{sinAviso:true}); setBloque(par.x,y,par.z,COFRE_DOBLE_ABIERTO+(d^1),{sinAviso:true});
  const dx=jugador.pos.x-cx, dz=jugador.pos.z-cz;
  const ang=ejeX?(dz>0?0:Math.PI):(dx>0?Math.PI/2:-Math.PI/2);
  const g=new THREE.Group(); g.position.set(cx,y+.625,cz); g.rotation.y=ang;
  const piv=new THREE.Group(); piv.position.z=-.4375; g.add(piv);
  const rep=n=>{const t=texTile(n).clone();t.needsUpdate=true;t.wrapS=THREE.RepeatWrapping;t.repeat.set(2,1);return t;};
  const mats=[texTile('chestSideEnd'),texTile('chestSideEnd'),rep('chestTop'),rep('chestTop'),rep('chestSideEnd'),rep('chestSideEnd')].map(t=>new THREE.MeshLambertMaterial({map:t}));
  const l=new THREE.Mesh(new THREE.BoxGeometry(1.875,.25,.875),mats); l.position.set(0,.125,.4375); piv.add(l);
  const cerrojo=new THREE.Mesh(new THREE.BoxGeometry(.14,.2,.06),new THREE.MeshLambertMaterial({color:0xb0b0b8})); cerrojo.position.set(0,.02,.89); piv.add(cerrojo);
  escena.add(g);
  const br=Math.max(.25,brilloEn(cx,y+1,cz)); g.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(m=>m.color.setScalar(br));});
  tapa={g,piv,x,y,z,t:0,abierta:true,doble:{x2:par.x,z2:par.z,d}};
  sonar('cofreAbrir',{x:cx,y,z:cz});
}
const _cerrarTapaCofreB28=cerrarTapaCofre;
cerrarTapaCofre=function(inmediato){
  if(tapa&&tapa.doble&&inmediato){const t=tapa,{x2,z2,d}=t.doble;escena.remove(t.g);tapa=null;
    if(getBloque(t.x,t.y,t.z)===COFRE_DOBLE_ABIERTO+d)_setBloqueB28(t.x,t.y,t.z,COFRE_DOBLE+d,{sinAviso:true});
    if(getBloque(x2,t.y,z2)===COFRE_DOBLE_ABIERTO+(d^1))_setBloqueB28(x2,t.y,z2,COFRE_DOBLE+(d^1),{sinAviso:true});
    return;}
  return _cerrarTapaCofreB28(inmediato);
};
const _abrirUIB28=abrirUI;
abrirUI=function(tipo,pos,extra){
  // Si quedó una tapa abierta a medias, se devuelve a su forma cerrada
  if(pos&&!tapa){const b=getBloque(pos.x,pos.y,pos.z);if(abiertoDoble(b)){const par=parejaCofre(pos.x,pos.y,pos.z);
    _setBloqueB28(pos.x,pos.y,pos.z,b-4,{sinAviso:true});if(par&&abiertoDoble(getBloque(par.x,par.y,par.z)))_setBloqueB28(par.x,par.y,par.z,getBloque(par.x,par.y,par.z)-4,{sinAviso:true});}}
  const doble=tipo==='cofre'&&pos&&dirCofreDoble(getBloque(pos.x,pos.y,pos.z))>=0&&!!parejaCofre(pos.x,pos.y,pos.z);
  _abrirUIB28(tipo,pos,extra);
  if(doble&&ui&&ui.tipo==='cofre'){ui.doble=true;abrirTapaDoble(pos.x,pos.y,pos.z);}
};
