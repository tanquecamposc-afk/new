"use strict";
/* =========================================================
   FPS estables: sin tirones al cargar terreno
   Antes, al llegar a una zona nueva, un solo fotograma podía
   generar hasta 16 chunks, calcular la luz de 9 y armar una
   malla (cientos de milisegundos de golpe → bajones a 20 FPS).
   Ahora el trabajo se reparte: cada fotograma hace pasos
   sueltos (generar UN chunk, calcular UNA luz o armar UNA
   malla), siempre el más cercano primero, hasta gastar unos
   pocos milisegundos. Las pantallas de carga siguen usando su
   presupuesto grande.
   ========================================================= */
let presupuestoJuego50=4.5;   // ms por fotograma para el terreno mientras se juega
const necesitaLuz50=ch=>!ch.luz;
// Un paso: deja el chunk (cx,cz) listo para armar su malla, o la arma. Devuelve true si hizo algo.
function pasoChunk50(d,cx,cz){
  // 1) Terreno de la zona 5x5 (la luz de los vecinos lo necesita)
  for(let r=0;r<=2;r++)for(let ox=-r;ox<=r;ox++)for(let oz=-r;oz<=r;oz++){
    if(Math.max(Math.abs(ox),Math.abs(oz))!==r)continue;
    if(!d.chunks.get(claveChunk(cx+ox,cz+oz))){generarChunk(d,cx+ox,cz+oz);return true;}
  }
  // 2) Luz de la zona 3x3 (la malla la usa en los bordes)
  for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){
    const v=d.chunks.get(claveChunk(cx+ox,cz+oz));
    if(v&&necesitaLuz50(v)){calcularLuzChunk(v);return true;}
  }
  // 3) La malla, por partes: cada paso arma unas capas y sigue en el siguiente
  const ch=d.chunks.get(claveChunk(cx,cz));
  if(ch&&!ch.malla){
    if(G50.gen&&G50.ch!==ch&&G50.ch.malla)return false;   // se está rehaciendo otro: no se interrumpe
    if(!G50.gen||G50.ch!==ch){G50.ch=ch;G50.gen=construirGeometriaPasos(ch);}
    const r=G50.gen.next();
    if(r.done){G50.gen=null;G50.ch=null;ch._geoLista50=r.value;construirMallaChunk(ch);}
    return true;
  }
  return false;
}
// Malla a medio armar (solo una a la vez: usa memoria compartida)
const G50={gen:null,ch:null,ver:0};
// Cada cambio en un chunk sube su versión: una malla armada por partes con datos viejos se descarta
const _marcarSucio50=marcarSucio;
marcarSucio=function(ch){if(ch)ch.v50=(ch.v50||0)+1;return _marcarSucio50.apply(this,arguments);};
const _construirGeometria50=construirGeometria;
construirGeometria=function(ch){
  if(ch._geoLista50){const g=ch._geoLista50;ch._geoLista50=null;return g;}
  // Una construcción completa pisa la memoria compartida: la que estaba a medias empieza de nuevo
  G50.gen=null;G50.ch=null;
  return _construirGeometria50.apply(this,arguments);
};
gestionarChunks=function(presupuestoMs,px,pz){
  const d=dim, pcx=Math.floor(px/CX), pcz=Math.floor(pz/CZ);
  if(G50.ch&&G50.ch.dim!==d){G50.gen=null;G50.ch=null;}
  const t0=performance.now();
  const lim=estado==='jugando'&&presupuestoMs<=10?Math.min(presupuestoMs,presupuestoJuego50):presupuestoMs;
  // Bloques cambiados por el jugador: primero (se nota al momento)
  // Los de al lado del jugador se rehacen al momento; los lejanos (agua que fluye, etc.) por partes
  if(chunksSucios.size){
    const lista=[...chunksSucios].sort((a,b)=>((a.cx-pcx)**2+(a.cz-pcz)**2)-((b.cx-pcx)**2+(b.cz-pcz)**2));
    for(const ch of lista){
      if(!ch.malla||ch.dim!==d){chunksSucios.delete(ch);continue;}
      if(Math.max(Math.abs(ch.cx-pcx),Math.abs(ch.cz-pcz))<=1||presupuestoMs>10){chunksSucios.delete(ch);construirMallaChunk(ch);}
      else{
        if(G50.gen&&G50.ch!==ch)break;   // ya hay otra malla a medias: se termina primero
        if(!G50.gen){G50.ch=ch;G50.gen=construirGeometriaPasos(ch);G50.ver=ch.v50||0;}
        let r;do{r=G50.gen.next();}while(!r.done&&performance.now()-t0<=lim);
        if(!r.done)break;
        G50.gen=null;G50.ch=null;
        if((ch.v50||0)===G50.ver){chunksSucios.delete(ch);ch._geoLista50=r.value;construirMallaChunk(ch);}
      }
      if(performance.now()-t0>lim+6)break;
    }
  }
  // Terreno nuevo: pasos sueltos, del más cercano al más lejano
  let hecho=0;
  if(performance.now()-t0<=lim)for(const [ox,oz] of offsets){
    const ch=d.chunks.get(claveChunk(pcx+ox,pcz+oz));
    if(ch&&ch.malla)continue;
    while(pasoChunk50(d,pcx+ox,pcz+oz)){
      hecho++;
      if(performance.now()-t0>lim)break;
    }
    if(performance.now()-t0>lim)break;
  }
  // Descargar lo que queda lejos
  const limR=radio+2;
  for(const [k,ch] of d.chunks){
    const dx=Math.abs(ch.cx-pcx),dz=Math.abs(ch.cz-pcz);
    if(ch.malla&&(dx>limR||dz>limR))quitarMallaChunk(ch);
    if(dx>limR+3||dz>limR+3){quitarMallaChunk(ch);d.chunks.delete(k);chunksSucios.delete(ch);}
  }
  return hecho;
};

/* ---------- Reflejo del agua más barato ----------
   Antes se dibujaba el mundo entero otra vez en cada fotograma. Ahora: solo los chunks
   cercanos (los lejanos apenas se ven reflejados) y, si la cámara está casi quieta, se
   reutiliza el reflejo del fotograma anterior. */
const _pasoReflejo50=pasoReflejo, _camReflPrev50=new THREE.Vector3(1e9,0,0), _dirReflPrev50=new THREE.Vector3(), _dirTmp50=new THREE.Vector3();
let reflejoSaltado50=0;
pasoReflejo=function(){
  const c=camara.position;camara.getWorldDirection(_dirTmp50);
  const quieta=_camReflPrev50.distanceToSquared(c)<.04&&_dirReflPrev50.dot(_dirTmp50)>.9997;
  const usando=matOpaco.uniforms.uUsaReflejo.value>0||matTrans.uniforms.uUsaReflejo.value>0;
  if(quieta&&usando&&reflejoSaltado50<3&&OPC.reflejos&&dim===DIMS.superficie){reflejoSaltado50++;return;}
  reflejoSaltado50=0;_camReflPrev50.copy(c);_dirReflPrev50.copy(_dirTmp50);
  // Solo lo cercano en el reflejo
  const lejos=[],R2=(3*CX)*(3*CX);
  for(const ch of dim.chunks.values())for(const k of ['mallaO','mallaT']){const m=ch[k];if(!m||!m.visible)continue;
    const dx=m.position.x+CX/2-c.x,dz=m.position.z+CZ/2-c.z;if(dx*dx+dz*dz>R2){m.visible=false;lejos.push(m);}}
  try{return _pasoReflejo50.apply(this,arguments);}finally{for(const m of lejos)m.visible=true;}
};

/* ---------- Sombras del sol: no se redibujan por chunks que quedan fuera de su alcance ---------- */
const _construirMallaChunk50=construirMallaChunk;
construirMallaChunk=function(ch){
  const antes=typeof sombraSucia!=='undefined'?sombraSucia:true;
  const r=_construirMallaChunk50.apply(this,arguments);
  if(!antes&&typeof R_SOMBRA!=='undefined'&&ch){
    const c=camara.position,dx=ch.cx*CX+CX/2-c.x,dz=ch.cz*CZ+CZ/2-c.z;
    if(Math.hypot(dx,dz)>R_SOMBRA+CX*1.5)sombraSucia=false;
  }
  return r;
};
