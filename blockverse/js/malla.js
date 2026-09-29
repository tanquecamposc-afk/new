"use strict";
/* =========================================================
   Mallado de chunks: cubos con oclusión ambiental e
   iluminación suave, plantas en cruz, antorchas, líquidos
   y portales. Se trabaja sobre una copia del chunk con un
   borde de 1 bloque de los vecinos (acceso por índice).
   ========================================================= */
const PW=CX+2, PS=PW*PW;
const CARAS=[
  {dir:[-1,0,0],sombra:.8,ld:'lado', c:[[0,1,0,0,1],[0,0,0,0,0],[0,1,1,1,1],[0,0,1,1,0]]},
  {dir:[ 1,0,0],sombra:.8,ld:'lado', c:[[1,1,1,0,1],[1,0,1,0,0],[1,1,0,1,1],[1,0,0,1,0]]},
  {dir:[0,-1,0],sombra:.5,ld:'abajo',c:[[1,0,1,1,0],[0,0,1,0,0],[1,0,0,1,1],[0,0,0,0,1]]},
  {dir:[0, 1,0],sombra:1, ld:'arriba',c:[[0,1,1,1,1],[1,1,1,0,1],[0,1,0,1,0],[1,1,0,0,0]]},
  {dir:[0,0,-1],sombra:.68,ld:'lado', c:[[1,0,0,0,0],[0,0,0,1,0],[1,1,0,0,1],[0,1,0,1,1]]},
  {dir:[0,0, 1],sombra:.68,ld:'lado', c:[[0,0,1,0,0],[1,0,1,1,0],[0,1,1,0,1],[1,1,1,1,1]]},
];
const PASO=[1,PS,PW]; // x, y, z
CARAS.forEach(f=>{
  f.offN=f.dir[0]*PASO[0]+f.dir[1]*PASO[1]+f.dir[2]*PASO[2];
  const ej=f.dir[0]?[1,2]:f.dir[1]?[0,2]:[0,1];
  f.vert=f.c.map(c=>{const da=c[ej[0]]*2-1, db=c[ej[1]]*2-1;
    const oa=f.offN+PASO[ej[0]]*da, ob=f.offN+PASO[ej[1]]*db;
    return {c,oa,ob,oc:oa+PASO[ej[1]]*db};});
});
const NIVEL_AO=[.5,.68,.84,1];
const EPS=0.0007;
const UVT=[];for(let t=0;t<NT;t++){const q=uvTile(t);UVT.push([q.u0,q.u1,q.v0,q.v1]);}
function alturaLiquido(id,arriba){
  if(esLiquido(arriba)&&(esAgua(arriba)===esAgua(id)))return 1;
  const l=nivelLiquido(id);
  return l===0?14/16:Math.max(1.5/16,(8-l)/8*14/16);
}
let _pb=new Uint8Array(PS*(CY+2)), _pl=new Uint8Array(PS*(CY+2));
function rellenarRelleno(ch,y0,y1){
  const d=ch.dim, H=y1-y0+3;
  const cielo=d.cielo?240:0;
  for(let pz=0;pz<PW;pz++)for(let px=0;px<PW;px++){
    const lx=px-1, lz=pz-1;
    const dcx=lx<0?-1:lx>=CX?1:0, dcz=lz<0?-1:lz>=CZ?1:0;
    const v=(dcx||dcz)?obtenerChunkD(d,ch.cx+dcx,ch.cz+dcz):ch;
    const luz=asegurarLuz(v), datos=v.datos;
    const sx=lx-dcx*CX, sz=lz-dcz*CZ;
    for(let py=0;py<H;py++){
      const y=y0-1+py, i=(py*PW+pz)*PW+px;
      if(y<0){_pb[i]=B.lecho;_pl[i]=0;}
      else if(y>=CY){_pb[i]=0;_pl[i]=cielo;}
      else{const k=idx(sx,y,sz);_pb[i]=datos[k];_pl[i]=luz[k];}
    }
  }
}
function construirGeometria(ch){
  asegurarLuz(ch);
  const y0=Math.max(0,ch.ymin-1), y1=Math.min(CY-1,ch.ymax+1);
  rellenarRelleno(ch,y0,y1);
  const P=_pb, L=_pl;
  const Op=[],Ou=[],Ol=[],Oi=[], Tp=[],Tu=[],Tl=[],Ti=[];
  const ao=[0,0,0,0], lz=[[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
  const quad=(pos,uv,luz,ind,v,u,l)=>{const n=pos.length/3;
    for(let k=0;k<4;k++){pos.push(v[k][0],v[k][1],v[k][2]);uv.push(u[k][0],u[k][1]);luz.push(l[k][0],l[k][1],l[k][2]);}
    ind.push(n,n+1,n+2,n+2,n+1,n+3);};
  for(let y=y0;y<=y1;y++){
    const py=y-y0+1;
    for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
      const i=(py*PW+z+1)*PW+x+1, b=P[i]; if(!b)continue;
      const def=BLOQUES[b], forma=FORMA[b];
      if(forma<=1){
        const alto=forma===1?def.altura:1;
        for(const f of CARAS){
          if(y===0&&f.dir[1]<0)continue;
          const n=P[i+f.offN];
          if(!(forma===1&&f.dir[1]>0)){
            if(OPACO[n])continue;
            if(n===b&&(TRANS[b]||forma===1))continue;
          }
          const q=UVT[def[f.ld]];
          const oOpaco=OPACO[n], base=oOpaco?L[i]:L[i+f.offN];
          const n0=Op.length/3;
          for(let k=0;k<4;k++){
            const vt=f.vert[k], c=vt.c;
            Op.push(x+c[0],y+c[1]*alto,z+c[2]);
            const vv=(f.dir[1]===0&&forma===1)?(c[4]?q[2]+(q[3]-q[2])*alto:q[2]):(c[4]?q[3]:q[2]);
            Ou.push(c[3]?q[1]-EPS:q[0]+EPS, c[4]?vv-EPS:vv+EPS);
            const ba=P[i+vt.oa],bb=P[i+vt.ob],bc=P[i+vt.oc];
            const s1=OCLUYE[ba],s2=OCLUYE[bb],s3=OCLUYE[bc];
            ao[k]=(s1&&s2)?0:3-(s1+s2+s3);
            let ss=base>>4,sb=base&15,cnt=1;
            if(!OPACO[ba]){const l=L[i+vt.oa];ss+=l>>4;sb+=l&15;cnt++;}
            if(!OPACO[bb]){const l=L[i+vt.ob];ss+=l>>4;sb+=l&15;cnt++;}
            if(!OPACO[bc]&&!(s1&&s2)){const l=L[i+vt.oc];ss+=l>>4;sb+=l&15;cnt++;}
            Ol.push(ss/cnt/15,sb/cnt/15,f.sombra*NIVEL_AO[ao[k]]);
          }
          if(ao[0]+ao[3]>ao[1]+ao[2])Oi.push(n0,n0+1,n0+3,n0,n0+3,n0+2);
          else Oi.push(n0,n0+1,n0+2,n0+2,n0+1,n0+3);
        }
      }else if(forma===2){ // plantas en cruz
        const q=UVT[def.lado], l=L[i], LL=[(l>>4)/15,(l&15)/15,.95], LA=[LL,LL,LL,LL];
        const a=.15,c=.85;
        for(const [ax,az,bx,bz] of [[a,a,c,c],[a,c,c,a]]){
          const v=[[x+ax,y+1,z+az],[x+ax,y,z+az],[x+bx,y+1,z+bz],[x+bx,y,z+bz]];
          const u=[[q[0],q[3]],[q[0],q[2]],[q[1],q[3]],[q[1],q[2]]];
          quad(Op,Ou,Ol,Oi,v,u,LA);
          quad(Op,Ou,Ol,Oi,[v[2],v[3],v[0],v[1]],[u[2],u[3],u[0],u[1]],LA);
        }
      }else if(forma===3){ // antorcha
        const q=UVT[def.lado], l=L[i], LL=[(l>>4)/15,(l&15)/15,1], LA=[LL,LL,LL,LL];
        const w=q[1]-q[0], h=q[3]-q[2];
        const u0=q[0]+w*7/16,u1=q[0]+w*9/16,vb=q[2],vt=q[2]+h*13/16;
        const x0=x+7/16,x1=x+9/16,z0=z+7/16,z1=z+9/16,yt=y+10/16;
        const U=[[u0,vt],[u0,vb],[u1,vt],[u1,vb]];
        quad(Op,Ou,Ol,Oi,[[x0,yt,z0],[x0,y,z0],[x0,yt,z1],[x0,y,z1]],U,LA);
        quad(Op,Ou,Ol,Oi,[[x1,yt,z1],[x1,y,z1],[x1,yt,z0],[x1,y,z0]],U,LA);
        quad(Op,Ou,Ol,Oi,[[x1,yt,z0],[x1,y,z0],[x0,yt,z0],[x0,y,z0]],U,LA);
        quad(Op,Ou,Ol,Oi,[[x0,yt,z1],[x0,y,z1],[x1,yt,z1],[x1,y,z1]],U,LA);
        const v2=q[2]+h*11/16;
        quad(Op,Ou,Ol,Oi,[[x0,yt,z1],[x1,yt,z1],[x0,yt,z0],[x1,yt,z0]],[[u0,v2],[u1,v2],[u0,vt],[u1,vt]],LA);
      }else{ // líquido o portal
        const liquido=forma===4;
        const alto=liquido?alturaLiquido(b,P[i+PS]):1;
        const q=UVT[def.lado], lp=L[i];
        for(const f of CARAS){
          const n=P[i+f.offN];
          if(OPACO[n])continue;
          if(liquido&&esLiquido(n)&&esAgua(n)===esAgua(b))continue;
          if(!liquido&&n===b)continue;
          if(liquido&&f.dir[1]<0&&SOLIDO[n])continue;
          const ln=L[i+f.offN], s=Math.max(ln>>4,lp>>4), bl=Math.max(ln&15,lp&15);
          const LL=[s/15,bl/15,f.sombra];
          const v=f.c.map(c=>[x+c[0],y+c[1]*alto,z+c[2]]), u=f.c.map(c=>[c[3]?q[1]:q[0],c[4]?q[3]:q[2]]);
          quad(Tp,Tu,Tl,Ti,v,u,[LL,LL,LL,LL]);
        }
      }
    }
  }
  const crear=(pos,uv,luz,ind)=>{
    if(!ind.length)return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setAttribute('luz',new THREE.Float32BufferAttribute(luz,3));
    g.setIndex(ind); g.computeBoundingSphere(); return g;
  };
  return {opaca:crear(Op,Ou,Ol,Oi),trans:crear(Tp,Tu,Tl,Ti)};
}
function construirMallaChunk(ch){
  const g=construirGeometria(ch);
  ch.sucio=false;
  const poner=(clave,geo,mat)=>{
    if(ch[clave]){ch[clave].geometry.dispose();if(geo)ch[clave].geometry=geo;else{escena.remove(ch[clave]);ch[clave]=null;}}
    else if(geo){const m=new THREE.Mesh(geo,mat);m.position.set(ch.cx*CX,0,ch.cz*CZ);escena.add(m);ch[clave]=m;}
  };
  poner('mallaO',g.opaca,matOpaco);
  poner('mallaT',g.trans,matTrans);
  if(ch.mallaT)ch.mallaT.renderOrder=1;
  ch.malla=true;
}
function quitarMallaChunk(ch){
  for(const k of ['mallaO','mallaT'])if(ch[k]){escena.remove(ch[k]);ch[k].geometry.dispose();ch[k]=null;}
  ch.malla=null;
}
function quitarTodasLasMallas(d){for(const ch of d.chunks.values())quitarMallaChunk(ch);}
