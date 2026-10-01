"use strict";
/* =========================================================
   Mallado de chunks: cubos con oclusión ambiental e
   iluminación suave, tinte por bioma, plantas en cruz que
   se mecen, antorchas, líquidos y portales animados, y
   formas con cajas (escaleras, losas, puertas, vallas...).
   Se trabaja sobre una copia del chunk con un borde de un
   bloque de los vecinos (acceso por índice).
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
// Bloques cuya cara de arriba (y de abajo) se gira al azar en cada posición, como en el original, para que no se note la repetición
const ROTAR_CARA=new Uint8Array(BLOQUES.length);
for(const k of ['cesped','tierra','arena','arenaRoja','grava','piedra','bloqueNieve','nieve','netherrack','piedraEnd','arcilla','sueloAlmas','arenaAlmas','micelio','podzol','barro','lecho','pizarra','toba','cespedNevado','tierraGruesa','hielo','bloqueMusgo','arenaSospechosa','gravaSospechosa'])if(B[k])ROTAR_CARA[B[k]]=1;
CARAS.forEach((f,k)=>{
  f.k=k;
  f.offN=f.dir[0]*PASO[0]+f.dir[1]*PASO[1]+f.dir[2]*PASO[2];
  const ej=f.dir[0]?[1,2]:f.dir[1]?[0,2]:[0,1];
  f.vert=f.c.map(c=>{const da=c[ej[0]]*2-1, db=c[ej[1]]*2-1;
    const oa=f.offN+PASO[ej[0]]*da, ob=f.offN+PASO[ej[1]]*db;
    return {c,oa,ob,oc:oa+PASO[ej[1]]*db};});
});
// Coordenada de textura (u,v) de un punto de una cara según su orientación
const UV_CARA=[(x,y,z)=>[z,y],(x,y,z)=>[1-z,y],(x,y,z)=>[x,1-z],(x,y,z)=>[1-x,z],(x,y,z)=>[1-x,y],(x,y,z)=>[x,y]];
const NIVEL_AO=[.5,.68,.84,1];
const EPS=0.0007;
const UVT=[];for(let t=0;t<NT;t++){const q=uvTile(t);UVT.push([q.u0,q.u1,q.v0,q.v1]);}
const T_CURVA=T.railCurve;
function alturaLiquido(id,arriba){
  if(esLiquido(arriba)&&(esAgua(arriba)===esAgua(id)))return 1;
  const l=nivelLiquido(id);
  return l===0?14/16:Math.max(1.5/16,(8-l)/8*14/16);
}
let _pb=new Uint16Array(PS*(CY+2)), _pl=new Uint8Array(PS*(CY+2)), _pbio=new Uint8Array(PS);
const _tintes=[new Float32Array(17*17*3),new Float32Array(17*17*3),new Float32Array(17*17*3)];
function rellenarRelleno(ch,y0,y1){
  const d=ch.dim, H=y1-y0+3;
  const cielo=d.cielo?240:0;
  for(let pz=0;pz<PW;pz++)for(let px=0;px<PW;px++){
    const lx=px-1, lz=pz-1;
    const dcx=lx<0?-1:lx>=CX?1:0, dcz=lz<0?-1:lz>=CZ?1:0;
    const v=(dcx||dcz)?obtenerChunkD(d,ch.cx+dcx,ch.cz+dcz):ch;
    const luz=asegurarLuz(v), datos=v.datos;
    const sx=lx-dcx*CX, sz=lz-dcz*CZ;
    _pbio[pz*PW+px]=v.bioma?v.bioma[sz*CX+sx]:2;
    for(let py=0;py<H;py++){
      const y=y0-1+py, i=(py*PW+pz)*PW+px;
      if(y<0){_pb[i]=B.lecho;_pl[i]=0;}
      else if(y>=CY){_pb[i]=0;_pl[i]=cielo;}
      else{const k=idx(sx,y,sz);_pb[i]=datos[k];_pl[i]=luz[k];}
    }
  }
  // Tinte de cada esquina: media de las 4 columnas que la rodean (mezcla suave entre biomas)
  for(let vz=0;vz<=CZ;vz++)for(let vx=0;vx<=CX;vx++){
    const o=(vz*17+vx)*3;
    for(let t=0;t<3;t++){let r=0,g=0,b=0;
      for(const [a,c] of [[0,0],[1,0],[0,1],[1,1]]){const col=COLOR_BIOMA[_pbio[(vz+c)*PW+vx+a]][t];r+=col[0];g+=col[1];b+=col[2];}
      _tintes[t][o]=r/4;_tintes[t][o+1]=g/4;_tintes[t][o+2]=b/4;}
  }
}
// Devuelve [r,g,b,modo] para un vértice. modo: 0 nada, 1 máscara, 2 total, 3 agua animada, 4 lava, 5 portal; +10 se mece
const BLANCO=[1,1,1,0];
const ES_HOJA=new Uint8Array(4096); for(let i=0;i<4096;i++)if(esHojas(i))ES_HOJA[i]=1;
function tinteVertice(b,vx,vz,out){
  const t=TINTE[b];
  if(!t){out[0]=out[1]=out[2]=1;out[3]=esLava(b)?4:(b===B.portalNether?5:b===B.portalEnd?6:0);return out;}
  if(t===3){out[0]=COLOR_ABEDUL[0];out[1]=COLOR_ABEDUL[1];out[2]=COLOR_ABEDUL[2];out[3]=1;return out;}
  if(t===4){out[0]=COLOR_ABETO[0];out[1]=COLOR_ABETO[1];out[2]=COLOR_ABETO[2];out[3]=1;return out;}
  const g=_tintes[t===1?0:t===2?1:2], o=(clamp(vz,0,16)*17+clamp(vx,0,16))*3;
  out[0]=g[o];out[1]=g[o+1];out[2]=g[o+2];out[3]=t===5?3:1;return out;
}
function cajasConecta(b,P,i){
  const def=BLOQUES[b], valla=def.conecta==='valla';
  const con=k=>{const n=P[i+[-PW,1,PW,-1][k]];return n===b||OPACO[n]||(valla?n===B.valla:(n===B.panel||n===B.vidrio));};
  const c=[];
  if(valla){
    c.push([6/16,0,6/16,10/16,1,10/16]);
    const A=[[7/16,0,9/16,6/16],[10/16,7/16,1,9/16],[7/16,10/16,9/16,1],[0,7/16,6/16,9/16]];
    for(let k=0;k<4;k++)if(con(k)){const [x0,z0,x1,z1]=A[k];c.push([x0,6/16,z0,x1,9/16,z1],[x0,12/16,z0,x1,15/16,z1]);}
  }else{
    c.push([7/16,0,7/16,9/16,1,9/16]);
    const A=[[7/16,0,9/16,7/16],[9/16,7/16,1,9/16],[7/16,9/16,9/16,1],[0,7/16,7/16,9/16]];
    let n=0;for(let k=0;k<4;k++)if(con(k)){const [x0,z0,x1,z1]=A[k];c.push([x0,0,z0,x1,1,z1]);n++;}
    if(!n)c.push([0,0,7/16,1,1,9/16]);
  }
  return c;
}
function construirGeometria(ch){
  asegurarLuz(ch);
  const y0=Math.max(0,ch.ymin-1), y1=Math.min(CY-1,ch.ymax+1);
  rellenarRelleno(ch,y0,y1);
  const P=_pb, L=_pl;
  const O={p:[],u:[],l:[],t:[],i:[]}, TR={p:[],u:[],l:[],t:[],i:[]};
  const ao=[0,0,0,0], tn=[0,0,0,0];
  const quad=(buf,v,u,l,tin,orden)=>{const n=buf.p.length/3;
    for(let k=0;k<4;k++){buf.p.push(v[k][0],v[k][1],v[k][2]);buf.u.push(u[k][0],u[k][1]);buf.l.push(l[k][0],l[k][1],l[k][2]);buf.t.push(tin[k][0],tin[k][1],tin[k][2],tin[k][3]);}
    buf.i.push(n,n+1,n+2,n+2,n+1,n+3);};
  const luzDe=(l,sombra)=>[(l>>4)/15,(l&15)/15,sombra];
  // Caja genérica (escaleras, losas, puertas, vallas...)
  const caja=(buf,b,def,x,y,z,i,cj,tint)=>{
    const [bx0,by0,bz0,bx1,by1,bz1]=cj;
    for(const f of CARAS){
      const enBorde=(f.k===0&&bx0===0)||(f.k===1&&bx1===1)||(f.k===2&&by0===0)||(f.k===3&&by1===1)||(f.k===4&&bz0===0)||(f.k===5&&bz1===1);
      const n=P[i+f.offN];
      if(enBorde&&OPACO[n])continue;
      const q=UVT[def.texCaras?def.texCaras[f.k]:def[f.ld]], l=enBorde?Math.max(L[i+f.offN]>>4,L[i]>>4)<<4|Math.max(L[i+f.offN]&15,L[i]&15):L[i];
      const LL=luzDe(l,f.sombra);
      const v=[],u=[];
      for(const c of f.c){
        const px=c[0]?bx1:bx0,py=c[1]?by1:by0,pz=c[2]?bz1:bz0;
        v.push([x+px,y+py,z+pz]);
        const [uu,vv]=UV_CARA[f.k](px,py,pz);
        u.push([q[0]+(q[1]-q[0])*clamp(uu,.01,.99),q[2]+(q[3]-q[2])*clamp(vv,.01,.99)]);
      }
      const T=tint?[tint,tint,tint,tint]:[BLANCO,BLANCO,BLANCO,BLANCO];
      quad(buf,v,u,[LL,LL,LL,LL],T);
    }
  };
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
          const q=UVT[def.texCaras?def.texCaras[f.k]:def[f.ld]];
          const rot=(f.k>=2&&f.k<=3&&ROTAR_CARA[b])?(hash2(ch.cx*CX+x+y*31,ch.cz*CZ+z,77)*4|0):0;
          const oOpaco=OPACO[n], base=oOpaco?L[i]:L[i+f.offN];
          const n0=O.p.length/3;
          for(let k=0;k<4;k++){
            const vt=f.vert[k], c=vt.c;
            O.p.push(x+c[0],y+c[1]*alto,z+c[2]);
            let cu=c[3],cv=c[4];if(rot===1){cu=c[4];cv=1-c[3];}else if(rot===2){cu=1-c[3];cv=1-c[4];}else if(rot===3){cu=1-c[4];cv=c[3];}
            const vv=(f.dir[1]===0&&forma===1)?(cv?q[2]+(q[3]-q[2])*alto:q[2]):(cv?q[3]:q[2]);
            O.u.push(cu?q[1]-EPS:q[0]+EPS, cv?vv-EPS:vv+EPS);
            const ba=P[i+vt.oa],bb=P[i+vt.ob],bc=P[i+vt.oc];
            const s1=OCLUYE[ba],s2=OCLUYE[bb],s3=OCLUYE[bc];
            ao[k]=(s1&&s2)?0:3-(s1+s2+s3);
            let ss=base>>4,sb=base&15,cnt=1;
            if(!OPACO[ba]){const l=L[i+vt.oa];ss+=l>>4;sb+=l&15;cnt++;}
            if(!OPACO[bb]){const l=L[i+vt.ob];ss+=l>>4;sb+=l&15;cnt++;}
            if(!OPACO[bc]&&!(s1&&s2)){const l=L[i+vt.oc];ss+=l>>4;sb+=l&15;cnt++;}
            O.l.push(ss/cnt/15,sb/cnt/15,f.sombra*NIVEL_AO[ao[k]]);
            tinteVertice(b,x+c[0],z+c[2],tn); O.t.push(tn[0],tn[1],tn[2],tn[3]+(ES_HOJA[b]?20:0));
          }
          if(ao[0]+ao[3]>ao[1]+ao[2])O.i.push(n0,n0+1,n0+3,n0,n0+3,n0+2);
          else O.i.push(n0,n0+1,n0+2,n0+2,n0+1,n0+3);
        }
      }else if(forma===2){ // plantas en cruz que se mecen
        const q=UVT[def.lado], l=L[i], LL=luzDe(l,.95), LA=[LL,LL,LL,LL];
        tinteVertice(b,x,z,tn);
        const abajo=[tn[0],tn[1],tn[2],tn[3]], arriba=[tn[0],tn[1],tn[2],tn[3]+(b===B.fuego?0:10)];
        const TT=[arriba,abajo,arriba,abajo];
        const a=.15,c=.85, alto=b===B.fuego?1:1;
        for(const [ax,az,bx,bz] of [[a,a,c,c],[a,c,c,a]]){
          const v=[[x+ax,y+alto,z+az],[x+ax,y,z+az],[x+bx,y+alto,z+bz],[x+bx,y,z+bz]];
          const u=[[q[0],q[3]],[q[0],q[2]],[q[1],q[3]],[q[1],q[2]]];
          quad(O,v,u,LA,TT);
          quad(O,[v[2],v[3],v[0],v[1]],[u[2],u[3],u[0],u[1]],LA,TT);
        }
      }else if(forma===3){ // antorcha (de pie o inclinada contra la pared)
        const q=UVT[def.lado], l=L[i], LL=luzDe(l,1), LA=[LL,LL,LL,LL], TB=[BLANCO,BLANCO,BLANCO,BLANCO];
        const w=q[1]-q[0], h=q[3]-q[2];
        const u0=q[0]+w*7/16,u1=q[0]+w*9/16,vb=q[2],vt=q[2]+h*13/16;
        const a0=7/16,a1=9/16,yt=10/16;
        let tr=p=>[x+p[0],y+p[1],z+p[2]];
        if(def.cara!==undefined){const [dx,dz]=DIRF[def.cara];
          tr=p=>[x+p[0]+dx*.42-dx*p[1]*.45,y+p[1]+.22,z+p[2]+dz*.42-dz*p[1]*.45];}
        const U=[[u0,vt],[u0,vb],[u1,vt],[u1,vb]];
        const Q=(a,b,c,d,uv)=>quad(O,[tr(a),tr(b),tr(c),tr(d)],uv,LA,TB);
        Q([a0,yt,a0],[a0,0,a0],[a0,yt,a1],[a0,0,a1],U);
        Q([a1,yt,a1],[a1,0,a1],[a1,yt,a0],[a1,0,a0],U);
        Q([a1,yt,a0],[a1,0,a0],[a0,yt,a0],[a0,0,a0],U);
        Q([a0,yt,a1],[a0,0,a1],[a1,yt,a1],[a1,0,a1],U);
        const v2=q[2]+h*11/16;
        Q([a0,yt,a1],[a1,yt,a1],[a0,yt,a0],[a1,yt,a0],[[u0,v2],[u1,v2],[u0,vt],[u1,vt]]);
      }else if(forma===4||forma===5){ // líquido o portal
        const liquido=forma===4;
        const alto=liquido?alturaLiquido(b,P[i+PS]):1;
        const q=UVT[def.lado], lp=L[i];
        for(const f of CARAS){
          const n=P[i+f.offN];
          if(OPACO[n])continue;
          if(liquido&&esLiquido(n)&&esAgua(n)===esAgua(b))continue;
          if(liquido&&ACUATICO[n]&&esAgua(b))continue;
          if(!liquido&&n===b)continue;
          if(liquido&&f.dir[1]<0&&SOLIDO[n])continue;
          const ln=L[i+f.offN], s=Math.max(ln>>4,lp>>4), bl=Math.max(ln&15,lp&15);
          const LL=[s/15,bl/15,f.sombra];
          const v=f.c.map(c=>[x+c[0],y+c[1]*alto,z+c[2]]), u=f.c.map(c=>[c[3]?q[1]-EPS:q[0]+EPS,c[4]?q[3]-EPS:q[2]+EPS]);
          const T=f.c.map(c=>tinteVertice(b,x+c[0],z+c[2],[0,0,0,0]));
          quad(esLava(b)?O:TR,v,u,[LL,LL,LL,LL],T);
        }
      }else if(forma===6){
        const tint=TINTE[b]?tinteVertice(b,x,z,[0,0,0,0]):null;
        for(const cj of def.cajas)caja(O,b,def,x,y,z,i,cj,tint);
      }else if(forma===8){ // polvo de redstone
        const q=UVT[def.lado], l=L[i], LL=luzDe(Math.max(l&240,l&15|(def.potencia>0?Math.min(15,4+def.potencia/2)|0:0)),1);
        const c=[.25+.75*def.potencia/15,.03+.1*def.potencia/15,.02,2], T=[c,c,c,c];
        const h=y+.02;
        quad(O,[[x,h,z+1],[x+1,h,z+1],[x,h,z],[x+1,h,z]],[[q[0],q[2]],[q[1],q[2]],[q[0],q[3]],[q[1],q[3]]],[LL,LL,LL,LL],T);
      }else if(forma===9){ // raíles
        const q=UVT[def.lado], l=L[i], LL=luzDe(l,1), T=[BLANCO,BLANCO,BLANCO,BLANCO];
        const [a1,a2]=def.riel, sube=def.sube;
        // rotación de la textura: recta N-S sin girar; E-O 90º; curvas según las salidas
        let rot=0;
        if(a1===1&&a2===3||a1===3&&a2===1)rot=1;
        if(def.lado===T_CURVA){const par=[a1,a2].sort().join('');rot={'12':0,'01':1,'03':2,'23':3}[par];}
        const esq=[[0,0],[1,0],[1,1],[0,1]];
        const uvRot=k=>{const [u,v]=esq[(k+rot)%4];return [q[0]+(q[1]-q[0])*u,q[3]-(q[3]-q[2])*v];};
        const hs=[.03,.03,.03,.03];
        if(sube!==undefined){const alt={0:[1,1,0,0],1:[0,1,1,0],2:[0,0,1,1],3:[1,0,0,1]}[sube];for(let k=0;k<4;k++)hs[k]=.03+alt[k];}
        const P4=[[x,y+hs[0],z],[x+1,y+hs[1],z],[x+1,y+hs[2],z+1],[x,y+hs[3],z+1]];
        quad(O,[P4[3],P4[2],P4[0],P4[1]],[uvRot(3),uvRot(2),uvRot(0),uvRot(1)],[LL,LL,LL,LL],T);
        quad(O,[P4[0],P4[1],P4[3],P4[2]],[uvRot(0),uvRot(1),uvRot(3),uvRot(2)],[LL,LL,LL,LL],T);
      }else if(forma===7){
        for(const cj of cajasConecta(b,P,i))caja(O,b,def,x,y,z,i,cj,null);
      }
    }
  }
  const crear=buf=>{
    if(!buf.i.length)return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(buf.p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(buf.u,2));
    g.setAttribute('luz',new THREE.Float32BufferAttribute(buf.l,3));
    g.setAttribute('tinte',new THREE.Float32BufferAttribute(buf.t,4));
    g.setIndex(buf.i); g.computeBoundingSphere(); return g;
  };
  return {opaca:crear(O),trans:crear(TR)};
}
function construirMallaChunk(ch){
  const g=construirGeometria(ch);
  ch.sucio=false;
  const poner=(clave,geo,mat)=>{
    if(ch[clave]){ch[clave].geometry.dispose();if(geo)ch[clave].geometry=geo;else{escena.remove(ch[clave]);ch[clave]=null;}}
    else if(geo){const m=new THREE.Mesh(geo,mat);m.position.set(ch.cx*CX,0,ch.cz*CZ);m.layers.enable(1);escena.add(m);ch[clave]=m;}
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
