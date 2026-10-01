"use strict";
/* =========================================================
   Objetos en la mano en tercera persona (F5)
   - Herramientas y armas agarradas por el mango, con la
     punta hacia delante y arriba, como en el original.
   - Objetos sueltos (comida, cubos, antorchas…) de pie en el
     puño, más pequeños; bloques como un cubito girado.
   - Lanza y tridente en vertical, arco de lado, escudo y
     maza con su modelo 3D.
   - La mano secundaria (objeto de la izquierda) también se ve.
   - Los objetos reciben la luz del entorno (ya no brillan de
     noche) y los encantados tienen su brillo morado.
   ========================================================= */
function claseObjeto34(id){
  const it=ITEMS[id]; if(!it)return 'nada';
  if(id===597)return 'escudo';
  if(id===540)return 'maza';
  if(esCuboItem(id))return 'bloque';
  const t=it.herr?it.herr.tipo:it.tipoHerr;
  if(t==='lanza'||t==='tridente')return 'lanza';
  if(id===I.arco||t==='arco'||id===611)return 'arco';
  if(it.herr||esHerramientaMano(id))return 'herramienta';
  return 'objeto';
}
// izq: en la mano izquierda se refleja la colocación
function objetoTercera34(id,izq){
  if(!id||id<=0)return null;
  const clase=claseObjeto34(id), sx=izq?1:-1;   // sx: hacia fuera del cuerpo (la derecha está en -x)
  let o=null;
  if(clase==='escudo'){o=modeloEscudo();o.scale.setScalar(.72);o.position.set(sx*.07,.12,.2);o.rotation.set(0,sx*.12,0);}
  else if(clase==='maza'){o=modeloMaza();o.scale.setScalar(1.25);o.position.set(0,.06,.08);o.rotation.set(.9,0,0);}
  else if(clase==='bloque'){o=new THREE.Mesh(geoCuboItem(id,.26),new THREE.MeshLambertMaterial({map:texIconos,alphaTest:.5}));
    o.position.set(0,-.02,.13);o.rotation.set(.3,.78,0);}
  else if(LIENZOS[id]){
    const tam={herramienta:.64,lanza:.9,arco:.6,objeto:.42}[clase];
    o=new THREE.Mesh(geoExtruida(id,tam),matExtruido());
    o.rotation.order='YXZ';
    if(clase==='herramienta'){o.rotation.set(-.2,-Math.PI/2-sx*.32,0);o.position.set(sx*.07,.19,.2);}
    else if(clase==='lanza'){o.rotation.set(-.2,-Math.PI/2-sx*.2,-Math.PI/4*.6);o.position.set(sx*.07,.3,.18);}
    else if(clase==='arco'){o.rotation.set(0,-sx*.25,-Math.PI/4);o.position.set(sx*.06,.05,.12);}
    else{o.rotation.set(0,-Math.PI/2-sx*.75,0);o.position.set(sx*.05,.06,.14);}
  }
  if(o)o.userData.clase34=clase;
  return o;
}
// Luz del entorno y brillo de encantamiento
function iluminar34(o,br,pila){
  if(!o)return;
  const enc=pila&&pila.enc&&Object.keys(pila.enc).length, s=enc?(Math.sin(tiempoJuego*3.2)+1)/2*.45:0;
  o.traverse(m=>{if(!m.isMesh||!m.material||!m.material.color)return;
    if(!m.userData.c34)m.userData.c34=m.material.color.clone();
    m.material.color.copy(m.userData.c34).multiplyScalar(br);
    if(enc)m.material.color.setRGB(m.material.color.r*(1+.35*s),m.material.color.g*(1-.08*s),m.material.color.b*(1+.7*s));});
}
const _modeloJugador34=actualizarModeloJugador;
actualizarModeloJugador=function(dt){
  _modeloJugador34(dt);
  const M=modeloJugador, p=M.p; if(!M.g.visible)return;
  // Mano derecha: se sustituye lo que puso el modelo antiguo
  const id=enManoId();
  if(M.id34!==id||p.mano.children.length&&!p.mano.children[0].userData.clase34&&id>0){
    M.id34=id; p.mano.clear(); M.faseArco=0;
    const o=objetoTercera34(id,false); if(o)p.mano.add(o);
  }
  // Mano izquierda
  if(!p.mano2){p.mano2=new THREE.Group();p.mano2.position.set(0,-.7,.08);p.brazoI.add(p.mano2);}
  const s=typeof secundaria==='function'?secundaria():inv[40], id2=s?s.id:0;
  if(M.id2_34!==id2){M.id2_34=id2;p.mano2.clear();const o=objetoTercera34(id2,true);if(o)p.mano2.add(o);}
  // El brazo izquierdo se adelanta un poco si lleva algo (y más con el escudo levantado)
  if(id2&&!(typeof escudoArriba!=='undefined'&&escudoArriba&&typeof escudoEnSecundaria==='function'&&escudoEnSecundaria()))p.brazoI.rotation.x+=-.12;
  if(id>0&&!golpe32)p.brazoD.rotation.x+=-.12;
  const br=Math.max(.2,brilloEn(jugador.pos.x,jugador.pos.y+1.2,jugador.pos.z));
  iluminar34(p.mano.children[0],br,enMano()); iluminar34(p.mano2.children[0],br,s);
};
