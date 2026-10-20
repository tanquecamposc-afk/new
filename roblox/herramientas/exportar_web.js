// Exporta los datos del juego web Blockverse para la versión de Roblox
const {abrir}=require('./rec_base.js');const fs=require('fs');
const OUT='export/';
(async()=>{const p=await abrir(1);
 const datos=await p.evaluate(()=>{
  const limpio=(v,prof=0)=>{
    if(v===Infinity)return -1; if(v===-Infinity)return -2;
    if(typeof v==='function')return undefined;
    if(v&&typeof v==='object'){if(prof>4)return undefined;
      if(Array.isArray(v))return v.map(x=>limpio(x,prof+1));
      if(v.isColor)return [v.r,v.g,v.b];
      const o={};for(const k in v){const r=limpio(v[k],prof+1);if(r!==undefined)o[k]=r;}return o;}
    return v;};
  const muestrear=(fn,arg,n=400)=>{const est={};let ok=0;
    for(let i=0;i<n;i++){let l;try{l=fn(typeof arg==='function'?arg():arg);}catch(e){return {error:String(e)};}
      if(!Array.isArray(l))continue;ok++;
      for(const [id,c] of l){if(!(c>0))continue;const e=est[id]||(est[id]={min:c,max:c,veces:0});e.min=Math.min(e.min,c);e.max=Math.max(e.max,c);e.veces++;}}
    return Object.entries(est).map(([id,e])=>[+id,e.min,e.max,+(e.veces/n).toFixed(4)]);};
  // Nombres de las texturas
  const nombresT={};for(const k in T)nombresT[k]=T[k];
  const bloques=[];
  BLOQUES.forEach((b,id)=>{if(!b)return;const o=limpio(b);
    if(typeof b.suelta==='function')o.sueltaMuestra=muestrear(b.suelta,()=>({fortuna:0}));
    bloques.push(o);});
  const items=[];ITEMS.forEach((it,id)=>{if(!it)return;const o=limpio(it);o.id=id;items.push(o);});
  const recetas=RECETAS.map(r=>limpio(r));
  const mobs={};
  for(const tipo in DEF_MOB){const d=DEF_MOB[tipo];const o=limpio(d);
    if(typeof d.suelta==='function')o.sueltaMuestra=muestrear(d.suelta,0);
    try{
      const m=modeloMob(tipo,{});m.g.updateMatrixWorld(true);
      const inv=new THREE.Matrix4().copy(m.g.matrixWorld).invert();
      const raices=[];m.piernas.forEach((o,i)=>raices.push({o,tipo:'pierna',i,s:o.userData.s||0}));m.brazos.forEach((o,i)=>raices.push({o,tipo:'brazo',i,s:o.userData.s||0}));
      if(m.extra&&m.extra.cabeza)raices.push({o:m.extra.cabeza,tipo:'cabeza',i:0,s:0});
      const partes=[];
      m.g.traverse(ob=>{if(!ob.isMesh)return;const geo=ob.geometry;if(!geo.boundingBox)geo.computeBoundingBox();
        const bb=geo.boundingBox,c=new THREE.Vector3(),t=new THREE.Vector3();bb.getCenter(c);bb.getSize(t);
        let raiz=null;for(let a=ob;a&&a!==m.g;a=a.parent){const r=raices.find(x=>x.o===a);if(r){raiz=r;break;}}
        const M=new THREE.Matrix4().multiplyMatrices(inv,ob.matrixWorld);
        const mat=Array.isArray(ob.material)?ob.material[0]:ob.material;
        let col=mat.color?mat.color.getHex():0xffffff;
        const parte={tam:[t.x,t.y,t.z],centro:[c.x,c.y,c.z],m:M.elements.map(v=>+v.toFixed(5)),col,tex:mat.map?(Object.keys(TEX_MOB).find(k=>TEX_MOB[k]===mat.map)||'otra'):null,
          transp:mat.transparent?mat.opacity:1,emis:mat.emissive&&mat.emissive.getHex()||0};
        if(raiz){const R=new THREE.Matrix4().multiplyMatrices(inv,raiz.o.matrixWorld);parte.raiz={tipo:raiz.tipo,i:raiz.i,s:raiz.s,m:R.elements.map(v=>+v.toFixed(5))};}
        partes.push(parte);});
      o.partes=partes;
    }catch(e){o.errorModelo=String(e);}
    mobs[tipo]=o;}
  const biomas={nombres:NOMBRES_BIOMA,claves:BIOMA,colores:COLOR_BIOMA,abedul:COLOR_ABEDUL,abeto:COLOR_ABETO};
  return {nombresT,NT,ATW,ATH,TS,bloques,items,recetas,fundir:FUNDIR,combustible:COMBUSTIBLE,tiempoFundir:TIEMPO_FUNDIR,mobs,biomas,
    tinteIcono:TINTE_ICONO,cocinado:limpio(COCINADO),B:limpio(B),I:limpio(I),constantes:{CX,CZ,CY,OY,NIVEL_MAR}};
 });
 fs.writeFileSync(OUT+'datos.json',JSON.stringify(datos));
 console.log('bloques',datos.bloques.length,'items',datos.items.length,'recetas',datos.recetas.length,'mobs',Object.keys(datos.mobs).length);
 // Atlas (sin teñir) e iconos
 const atlas=await p.evaluate(()=>{const c=atlas.getContext('2d').getImageData(0,0,atlas.width,atlas.height);return {w:atlas.width,h:atlas.height,d:Array.from(c.data)};});
 fs.writeFileSync(OUT+'atlas.bin',Buffer.from(atlas.d));fs.writeFileSync(OUT+'atlas.json',JSON.stringify({w:atlas.w,h:atlas.h}));
 const iconos=await p.evaluate(()=>{const r=[];LIENZOS.forEach((c,id)=>{if(!c)return;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;r.push({id,w:c.width,h:c.height,d:Array.from(d)});});return r;});
 const ib=[];const idx=[];let off=0;for(const ic of iconos){ib.push(Buffer.from(ic.d));idx.push([ic.id,ic.w,ic.h,off]);off+=ic.d.length;}
 fs.writeFileSync(OUT+'iconos.bin',Buffer.concat(ib));fs.writeFileSync(OUT+'iconos.json',JSON.stringify(idx));
 console.log('iconos',iconos.length,'atlas',atlas.w,atlas.h);
 console.log('errores pagina',p.errs.slice(0,3));
 await p.b.close();})();
