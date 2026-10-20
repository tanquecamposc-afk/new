// Exporta la geometría y las texturas pintadas de cada criatura
const {abrir}=require('./rec_base.js');const fs=require('fs');
(async()=>{const p=await abrir(1);
 const r=await p.evaluate(()=>{
  const texturas={};const out={};
  for(const tipo in DEF_MOB){
    try{
      const m=modeloMob(tipo,{});m.g.updateMatrixWorld(true);
      const invG=new THREE.Matrix4().copy(m.g.matrixWorld).invert();
      const raices=[];m.piernas.forEach((o,i)=>raices.push({o,tipo:'pierna',i,s:o.userData.s||0}));m.brazos.forEach((o,i)=>raices.push({o,tipo:'brazo',i,s:o.userData.s||0}));
      if(m.extra&&m.extra.cabeza)raices.push({o:m.extra.cabeza,tipo:'cabeza',i:0,s:0});
      const grupos={};
      m.g.traverse(ob=>{if(!ob.isMesh||!ob.visible)return;
        let raiz=null;for(let a=ob;a&&a!==m.g;a=a.parent){const rr=raices.find(x=>x.o===a);if(rr){raiz=rr;break;}}
        const clave=raiz?raiz.tipo+raiz.i:'cuerpo';
        if(!grupos[clave]){const R=raiz?new THREE.Matrix4().multiplyMatrices(invG,raiz.o.matrixWorld):new THREE.Matrix4();
          grupos[clave]={tipo:raiz?raiz.tipo:'cuerpo',i:raiz?raiz.i:0,s:raiz?raiz.s:0,m:R.elements.map(v=>+v.toFixed(5)),mallas:[]};}
        const G=grupos[clave];
        const Rinv=new THREE.Matrix4().fromArray(G.m).invert();
        const M=new THREE.Matrix4().multiplyMatrices(Rinv,new THREE.Matrix4().multiplyMatrices(invG,ob.matrixWorld));
        const geo=ob.geometry,pos=geo.attributes.position,uv=geo.attributes.uv,ind=geo.index;
        const mat=Array.isArray(ob.material)?ob.material[0]:ob.material;
        const v=new THREE.Vector3();const P=[],U=[],I=[];
        for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(M);P.push(+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4));if(uv)U.push(+uv.getX(i).toFixed(5),+uv.getY(i).toFixed(5));}
        if(ind)for(let i=0;i<ind.count;i++)I.push(ind.getX(i));else for(let i=0;i<pos.count;i++)I.push(i);
        let tex=null;
        if(mat.map&&mat.map.image&&mat.map.image.getContext){const im=mat.map.image;tex=mat.map.uuid;
          if(!texturas[tex]){const d=im.getContext('2d').getImageData(0,0,im.width,im.height).data;texturas[tex]={w:im.width,h:im.height,d:Array.from(d)};}}
        G.mallas.push({P,U:tex?U:null,I,tex,col:mat.color?mat.color.getHex():0xffffff,emis:mat.emissive?mat.emissive.getHex():0,op:mat.transparent?mat.opacity:1});
      });
      out[tipo]=Object.values(grupos);
    }catch(e){out[tipo]={error:String(e)};}
  }
  return {out,texturas};
 });
 const tex=r.texturas;const idx={};const bufs=[];let off=0;
 for(const k in tex){idx[k]=[tex[k].w,tex[k].h,off];const b=Buffer.from(tex[k].d);bufs.push(b);off+=b.length;}
 fs.writeFileSync('export/mobs.json',JSON.stringify({modelos:r.out,texturas:idx}));
 fs.writeFileSync('export/mobtex.bin',Buffer.concat(bufs));
 console.log('mobs',Object.keys(r.out).length,'texturas',Object.keys(tex).length,'bytes',off, 'errores',Object.entries(r.out).filter(([k,v])=>v.error).map(([k,v])=>k+':'+v.error).slice(0,5));
 await p.b.close();})();
