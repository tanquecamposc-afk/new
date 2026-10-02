"use strict";
/* =========================================================
   Cofres menos cuadrados
   - Esquinas verticales biseladas (se recorta 1 píxel en cada
     esquina), tapa con un pequeño borde que sobresale del
     cuerpo y parte de arriba redondeada con un escalón.
   - Vale para cofres sencillos, dobles (las esquinas de la
     unión no se recortan) y para la tapa animada al abrirlos.
   ========================================================= */
const BISEL47=.0625, BORDE47=.0125;
// Caja en cruz: dos cajas que juntas dejan las esquinas recortadas (salvo en los lados de la unión)
function cruz47([x0,y0,z0,x1,y1,z1],u,i){
  const ix0=u.x0?0:i, ix1=u.x1?0:i, iz0=u.z0?0:i, iz1=u.z1?0:i;
  return [[x0+ix0,y0,z0,x1-ix1,y1,z1],[x0,y0,z0+iz0,x1,y1,z1-iz1]];
}
function cajasCofre47(c,abierto){
  const [x0,,z0,x1,,z1]=c, u={x0:x0===0,x1:x1===1,z0:z0===0,z1:z1===1};
  const fuera=(v,lado,s)=>u[lado]?v:v+s*BORDE47;
  // Cuerpo
  const cajas=cruz47([x0,0,z0,x1,.625,z1],u,BISEL47);
  if(abierto)return cajas;
  // Tapa algo más ancha que el cuerpo
  cajas.push(...cruz47([fuera(x0,'x0',-1),.625,fuera(z0,'z0',-1),fuera(x1,'x1',1),.8125,fuera(z1,'z1',1)],u,BISEL47));
  // Escalón de arriba: redondea el borde superior
  const s=.0625;
  cajas.push([u.x0?x0:x0+s,.8125,u.z0?z0:z0+s,u.x1?x1:x1-s,.875,u.z1?z1:z1-s]);
  return cajas;
}
{
  const C=BLOQUES[B.cofre];if(C)C.cajas=cajasCofre47([.0625,0,.0625,.9375,.875,.9375],false);
  const A=BLOQUES[B.cofreAbierto];if(A)A.cajas=cajasCofre47([.0625,0,.0625,.9375,.625,.9375],true);
  if(typeof CAJAS_COFRE_DOBLE!=='undefined')CAJAS_COFRE_DOBLE.forEach((c,d)=>{
    const D=BLOQUES[B['cofreDoble'+d]], DA=BLOQUES[B['cofreDobleAbierto'+d]];
    if(D)D.cajas=cajasCofre47(c,false);
    if(DA)DA.cajas=cajasCofre47(c,true);
  });
}

/* ---------- Tapa animada con la misma forma ---------- */
function redondearTapa47(piv){
  const l=piv&&piv.children.find(o=>o.isMesh&&o.geometry&&o.geometry.parameters&&Math.abs(o.geometry.parameters.height-.25)<1e-6);
  if(!l)return;
  const {width:w,depth:d}=l.geometry.parameters, mats=l.material;
  const g=new THREE.Group();g.position.copy(l.position);
  const caja=(bw,bh,bd,y)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mats);m.position.y=y;g.add(m);};
  const h=.1875, o=BORDE47*2, b=BISEL47*2;
  caja(w+o-b,h,d+o,-.125+h/2);   // parte baja de la tapa en cruz (sobresale un poco)
  caja(w+o,h,d+o-b,-.125+h/2);
  caja(w-.125,.0625,d-.125,.125-.03125);  // escalón de arriba
  piv.remove(l);l.geometry.dispose();piv.add(g);
}
const _abrirTapaCofre47=abrirTapaCofre;
abrirTapaCofre=function(){const r=_abrirTapaCofre47.apply(this,arguments);if(tapa&&tapa.piv&&!tapa.redonda47){redondearTapa47(tapa.piv);tapa.redonda47=true;}return r;};
if(typeof abrirTapaDoble==='function'){
  const _abrirTapaDoble47=abrirTapaDoble;
  abrirTapaDoble=function(){const r=_abrirTapaDoble47.apply(this,arguments);if(tapa&&tapa.piv&&!tapa.redonda47){redondearTapa47(tapa.piv);tapa.redonda47=true;}return r;};
}
// Los trozos de mundo ya construidos se rehacen con la forma nueva
if(typeof dim!=="undefined"&&dim&&dim.chunks)for(const ch of dim.chunks.values())marcarSucio(ch);
