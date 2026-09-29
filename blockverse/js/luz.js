"use strict";
/* =========================================================
   Iluminación por bloques (0-15): luz del cielo y luz de bloques.
   Cada chunk guarda un byte por bloque: cielo<<4 | bloque.
   Al cargar se calcula con un margen de los chunks vecinos y
   luego se actualiza de forma incremental al cambiar bloques.
   ========================================================= */
const MARGEN=8, RW=CX+2*MARGEN, RD=CZ+2*MARGEN, RCOL=RW*RD;
const _reg=new Uint8Array(RCOL*CY), _cielo=new Uint8Array(RCOL*CY), _bloq=new Uint8Array(RCOL*CY);
const _topes=new Int16Array(RCOL);
const _cola=new Int32Array(RCOL*CY);

function calcularLuzChunk(ch){
  const d=ch.dim, cielo=d.cielo;
  // Copiar los datos de la región (chunk + margen)
  let ymax=0;
  for(let dcx=-1;dcx<=1;dcx++)for(let dcz=-1;dcz<=1;dcz++){
    const vc=obtenerChunkD(d,ch.cx+dcx,ch.cz+dcz);
    if(vc.ymax>ymax)ymax=vc.ymax;
    const x0=Math.max(0,dcx*CX+MARGEN-0), rx0=dcx*CX+MARGEN;
    const lx0=Math.max(0,-rx0), lx1=Math.min(CX,RW-rx0);
    const lz0=Math.max(0,-(dcz*CZ+MARGEN)), lz1=Math.min(CZ,RD-(dcz*CZ+MARGEN));
    if(lx1<=lx0||lz1<=lz0)continue;
    for(let y=0;y<=Math.min(CY-1,vc.ymax);y++)for(let lz=lz0;lz<lz1;lz++){
      const src=idx(lx0,y,lz), rz=dcz*CZ+MARGEN+lz;
      _reg.set(vc.datos.subarray(src,src+(lx1-lx0)),(y*RD+rz)*RW+rx0+lx0);
    }
  }
  const YM=Math.min(CY-1,ymax+1), tam=RCOL*(YM+1);
  _cielo.fill(0,0,tam); _bloq.fill(0,0,tam);
  // Limpiar lo que quedó por encima de ymax de otras regiones
  for(let dcx=-1;dcx<=1;dcx++)for(let dcz=-1;dcz<=1;dcz++){
    const vc=obtenerChunkD(d,ch.cx+dcx,ch.cz+dcz);
    if(vc.ymax<YM){
      const rx0=dcx*CX+MARGEN, lx0=Math.max(0,-rx0), lx1=Math.min(CX,RW-rx0);
      const lz0=Math.max(0,-(dcz*CZ+MARGEN)), lz1=Math.min(CZ,RD-(dcz*CZ+MARGEN));
      for(let y=vc.ymax+1;y<=YM;y++)for(let lz=lz0;lz<lz1;lz++){const o=(y*RD+dcz*CZ+MARGEN+lz)*RW+rx0;_reg.fill(0,o+lx0,o+lx1);}
    }
  }
  let ini=0,fin=0;
  const Q=_cola;
  if(cielo){
    for(let c=0;c<RCOL;c++){
      let l=15,tope=-1;
      for(let y=YM;y>=0;y--){
        const i=y*RCOL+c, op=OPAC_LUZ[_reg[i]];
        if(op){if(tope<0)tope=y;l=op>=15?0:Math.max(0,l-op);}
        _cielo[i]=l;
      }
      _topes[c]=tope;
    }
    // Semillas: celdas iluminadas junto a columnas más altas (bajo salientes, bocas de cueva)
    for(let z=0;z<RD;z++)for(let x=0;x<RW;x++){
      const c=z*RW+x;
      let m=-1;
      if(x>0)m=Math.max(m,_topes[c-1]); if(x<RW-1)m=Math.max(m,_topes[c+1]);
      if(z>0)m=Math.max(m,_topes[c-RW]); if(z<RD-1)m=Math.max(m,_topes[c+RW]);
      for(let y=Math.min(m,YM);y>=0;y--){const i=y*RCOL+c;if(_cielo[i]>1)Q[fin++]=i;}
    }
    fin=propagarRegion(_cielo,Q,ini,fin,YM);
  }
  ini=0;fin=0;
  for(let i=0;i<tam;i++){const e=LUZB[_reg[i]];if(e){_bloq[i]=e;Q[fin++]=i;}}
  propagarRegion(_bloq,Q,0,fin,YM);
  // Extraer el centro
  const luz=ch.luz||new Uint8Array(CX*CY*CZ);
  for(let y=0;y<CY;y++)for(let z=0;z<CZ;z++){
    const o=idx(0,y,z);
    if(y>YM){luz.fill(cielo?240:0,o,o+CX);continue;}
    const r=(y*RD+z+MARGEN)*RW+MARGEN;
    for(let x=0;x<CX;x++)luz[o+x]=(_cielo[r+x]<<4)|_bloq[r+x];
  }
  ch.luz=luz;
}
function propagarRegion(L,Q,ini,fin,YM){
  while(ini<fin){
    const i=Q[ini++], l=L[i]; if(l<=1)continue;
    const y=(i/RCOL)|0, c=i-y*RCOL, z=(c/RW)|0, x=c-z*RW;
    for(let k=0;k<6;k++){
      let n;
      if(k===0){if(x===0)continue;n=i-1;}else if(k===1){if(x===RW-1)continue;n=i+1;}
      else if(k===2){if(z===0)continue;n=i-RW;}else if(k===3){if(z===RD-1)continue;n=i+RW;}
      else if(k===4){if(y===0)continue;n=i-RCOL;}else{if(y>=YM)continue;n=i+RCOL;}
      const op=OPAC_LUZ[_reg[n]]; if(op>=15)continue;
      const nl=l-1-op;
      if(nl>L[n]){L[n]=nl;if(fin<Q.length)Q[fin++]=n;}
    }
  }
  return fin;
}
function asegurarLuz(ch){if(!ch.luz)calcularLuzChunk(ch);return ch.luz;}
function luzEn(x,y,z){
  if(y>=CY)return dim.cielo?240:0; if(y<0)return 0;
  const cx=Math.floor(x/CX),cz=Math.floor(z/CZ),ch=chunkSiExiste(cx,cz);
  if(!ch)return dim.cielo?240:0;
  return asegurarLuz(ch)[idx(x-cx*CX,y,z-cz*CZ)];
}

/* ---------- Actualización incremental ---------- */
const DIR6=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]];
function _chLuz(x,z){const cx=Math.floor(x/CX),cz=Math.floor(z/CZ),ch=chunkSiExiste(cx,cz);return ch&&ch.luz?ch:null;}
function _getL(x,y,z,canal){
  if(y>=CY)return canal?(dim.cielo?15:0):0; if(y<0)return 0;
  const ch=_chLuz(x,z); if(!ch)return -1;
  const v=ch.luz[idx(x-ch.cx*CX,y,z-ch.cz*CZ)];
  return canal?v>>4:v&15;
}
function _setL(x,y,z,canal,l){
  const ch=_chLuz(x,z); if(!ch)return;
  const i=idx(x-ch.cx*CX,y,z-ch.cz*CZ), v=ch.luz[i];
  ch.luz[i]=canal?(l<<4)|(v&15):(v&240)|l;
  marcarSucioPos(x,z);
}
function actualizarLuz(x,y,z){
  const id=getBloque(x,y,z);
  for(const canal of [0,1]){
    if(canal===1&&!dim.cielo)continue;
    const quitar=[], poner=[];
    const actual=_getL(x,y,z,canal);
    if(actual<0)continue;
    if(actual>0){_setL(x,y,z,canal,0);quitar.push([x,y,z,actual]);}
    // Oscurecer lo que dependía de esta celda
    while(quitar.length){
      const [qx,qy,qz,ql]=quitar.pop();
      for(const [dx,dy,dz] of DIR6){
        const nx=qx+dx,ny=qy+dy,nz=qz+dz; if(ny<0||ny>=CY)continue;
        const nl=_getL(nx,ny,nz,canal); if(nl<=0)continue;
        const depende=nl<ql||(canal===1&&dy===-1&&ql===15&&nl===15);
        if(depende){_setL(nx,ny,nz,canal,0);quitar.push([nx,ny,nz,nl]);}
        else poner.push([nx,ny,nz]);
      }
    }
    // Fuente nueva
    if(canal===0&&LUZB[id]){_setL(x,y,z,0,LUZB[id]);poner.push([x,y,z]);}
    if(canal===1&&y===CY-1&&OPAC_LUZ[id]<15){_setL(x,y,z,1,15);poner.push([x,y,z]);}
    if(OPAC_LUZ[id]<15)for(const [dx,dy,dz] of DIR6)poner.push([x+dx,y+dy,z+dz]);
    // Rellenar
    let guard=0;
    while(poner.length&&guard++<200000){
      const [px,py,pz]=poner.pop();
      if(py<0||py>=CY)continue;
      const l=_getL(px,py,pz,canal); if(l<=0&&!(canal===1&&py===CY-1))continue;
      const lo=l<0?0:l;
      for(const [dx,dy,dz] of DIR6){
        const nx=px+dx,ny=py+dy,nz=pz+dz; if(ny<0||ny>=CY)continue;
        const nid=getBloqueSiCargado(nx,ny,nz); if(nid<0)continue;
        const op=OPAC_LUZ[nid]; if(op>=15)continue;
        let nl=lo-1-op;
        if(canal===1&&dy===-1&&lo===15&&op===0)nl=15;
        if(nl>0&&nl>_getL(nx,ny,nz,canal)){_setL(nx,ny,nz,canal,nl);poner.push([nx,ny,nz]);}
      }
    }
  }
}
// Brillo (0-1) de una posición, para criaturas y objetos
function curvaLuz(l){return l<=0?0:Math.pow(.8,15-l);}
function brilloEn(x,y,z){
  const v=luzEn(Math.floor(x),Math.floor(y),Math.floor(z));
  return Math.pow(Math.max(curvaLuz(v>>4)*factorCielo,curvaLuz(v&15),dim.amb,.02),.72);
}
let factorCielo=1;
