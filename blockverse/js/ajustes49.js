"use strict";
/* =========================================================
   Que todas las opciones funcionen bien
   - Brillo: ahora también aclara u oscurece a las criaturas,
     los objetos y la mano (antes solo el terreno).
   - Música: al quitarla o bajar el volumen a cero se calla al
     momento (antes terminaba la pieza que estaba sonando).
   - Sensibilidad: también en los controles táctiles.
   - Shaders: la descripción explica todo lo que activan.
   ========================================================= */
// Brillo como en el original: «Brillante» levanta mucho las zonas oscuras y «Oscuro» las hunde
const U49={uGamma49:{value:0},uOscuro49:{value:1}};
function valoresBrillo49(){const br=window.BRILLO??.5;return br>=.5?[(br-.5)*1.7,1]:[0,.62+.76*br];}
for(const m of [matOpaco,matTrans]){
  const a='l=pow(max(l,vec3(uAmb)),vec3(0.72));';
  if(!m.fragmentShader.includes(a))continue;
  m.fragmentShader='uniform float uGamma49; uniform float uOscuro49;\n'+m.fragmentShader.replace(a,a+' l=mix(l,vec3(1.0)-pow(vec3(1.0)-min(l,vec3(1.0)),vec3(4.0)),uGamma49)*uOscuro49;');
  m.uniforms.uGamma49=U49.uGamma49;m.uniforms.uOscuro49=U49.uOscuro49;m.needsUpdate=true;
}
const _aplicarOpc49=aplicarOpc;
aplicarOpc=function(){_aplicarOpc49.apply(this,arguments);const [g,o]=valoresBrillo49();U49.uGamma49.value=g;U49.uOscuro49.value=o;};
{const [g,o]=valoresBrillo49();U49.uGamma49.value=g;U49.uOscuro49.value=o;}
const _brilloEn49=brilloEn;
brilloEn=function(x,y,z){
  const b=_brilloEn49(x,y,z), [g,o]=valoresBrillo49();
  return (g>0?b+(1-Math.pow(1-Math.min(1,b),4)-b)*g:b)*o;
};
let musicaPrev49=null;
const _actualizarFinal49=actualizarFinal;
actualizarFinal=function(dt){
  _actualizarFinal49(dt);
  const on=OPC.musica&&(window.VOLUMEN??1)>.01;
  if(on!==musicaPrev49&&typeof AU!=='undefined'&&AU&&AU.musica&&typeof actx!=='undefined'&&actx){
    AU.musica.gain.setTargetAtTime(on?1:0,actx.currentTime,.15);musicaPrev49=on;}
};
// Descripciones más claras en Opciones
setTimeout(()=>{for(const b of document.querySelectorAll('button')){
  if(/^Shaders:/.test(b.textContent))b.dataset.tip='Resplandor, rayos de sol, color cinematográfico, calor en el Nether y luz de la antorcha que llevas en la mano';
  if(/^Gráficos: /.test(b.textContent)&&!b.dataset.tip)b.dataset.tip='Vibrantes: sombras del sol en el terreno, las criaturas y los objetos, luz del sol que cambia con la hora y hojas que se mecen';
}},0);

/* ---------- Sin rayas oscuras entre bloques ----------
   Al mirar el suelo en ángulo, la tarjeta gráfica mezcla píxeles del borde de cada
   textura con los de su vecina en el atlas. Los píxeles transparentes del atlas eran
   negros, y esa mezcla dejaba una raya oscura entre bloques. Ahora los píxeles
   transparentes llevan el color de sus vecinos (dentro de la misma textura) y el
   atlas se sube como datos sin premultiplicar, así ese color no se pierde. Además el
   filtrado anisótropo se limita a 4x. */
function dilatarDatos49(d,W,H){
  const tiene=new Uint8Array(W*H);for(let i=0;i<W*H;i++)tiene[i]=d[i*4+3]>0?1:0;
  for(let pasada=0;pasada<8;pasada++){
    const nuevos=[];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(tiene[i])continue;
      let r=0,g=0,b=0,n=0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;
        if(X<0||Y<0||X>=W||Y>=H||(X>>4)!==(x>>4)||(Y>>4)!==(y>>4))continue;   // solo dentro de la misma textura
        const j=Y*W+X;if(!tiene[j])continue;r+=d[j*4];g+=d[j*4+1];b+=d[j*4+2];n++;}
      if(n)nuevos.push(i,r/n,g/n,b/n);}
    if(!nuevos.length)break;
    for(let k=0;k<nuevos.length;k+=4){const i=nuevos[k];d[i*4]=nuevos[k+1];d[i*4+1]=nuevos[k+2];d[i*4+2]=nuevos[k+3];tiene[i]=1;}
  }
}
function mipsDatos49(nivel0){
  const niveles=[nivel0];let d=nivel0.data,w=nivel0.width,h=nivel0.height;
  while(w>1||h>1){
    const nw=Math.max(1,w>>1),nh=Math.max(1,h>>1),o=new ImageData(nw,nh),t=o.data;
    for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){
      let r=0,g=0,b=0,n=0,R=0,G=0,Bc=0,A=0;const cuenta=new Map();
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const sx=Math.min(w-1,x*2+dx),sy=Math.min(h-1,y*2+dy),k=(sy*w+sx)*4,a=d[k+3];
        R+=d[k];G+=d[k+1];Bc+=d[k+2];A+=a;
        if(a>=128){r+=d[k];g+=d[k+1];b+=d[k+2];n++;cuenta.set(a,(cuenta.get(a)||0)+1);}}
      const k=(y*nw+x)*4;
      if(n>=2){let am=255,mx=0;for(const [a,c] of cuenta)if(c>mx){mx=c;am=a;}t[k]=r/n;t[k+1]=g/n;t[k+2]=b/n;t[k+3]=am;}
      else{t[k]=R/4;t[k+1]=G/4;t[k+2]=Bc/4;t[k+3]=n===1?0:A/4|0;}
    }
    niveles.push(o);d=t;w=nw;h=nh;
  }
  return niveles;
}
if(typeof CALIDADES!=='undefined')for(const c of CALIDADES)c.aniso=Math.min(c.aniso,4);
if(typeof prepararAtlas==='function'){
  prepararAtlas=function(){
    if(!renderer.capabilities.isWebGL2)return;
    const img=texAtlas.image;if(!img||!img.width)return;
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
    const datos=x.getImageData(0,0,c.width,c.height);
    dilatarDatos49(datos.data,c.width,c.height);
    texAtlas.mipmaps=mipsDatos49(datos);texAtlas.generateMipmaps=false;
    texAtlas.minFilter=THREE.NearestMipmapNearestFilter;texAtlas.magFilter=THREE.NearestFilter;
    texAtlas.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),(CALIDADES[OPC.calidad]||CALIDADES[2]).aniso);
    texAtlas.needsUpdate=true;_imgMips=img;_verMips=texAtlas.version;
  };
  prepararAtlas();
}

/* ---------- Más luz de antorchas y de todo lo que ilumina ----------
   La luz de los bloques (antorchas, faroles, lava, piedra luminosa, fuego…) caía muy
   rápido con la distancia. Ahora cae más suave y es algo más intensa: alumbra más
   lejos y más fuerte, en el terreno, las criaturas, los objetos y la mano. */
for(const m of [matOpaco,matTrans]){
  const a='float b=curva(vLuz.g);';
  if(!m.fragmentShader.includes(a)||m.userData.luz51)continue;
  m.fragmentShader='float curvaB51(float l){return l<0.01?0.0:min(1.0,pow(0.88,(1.0-l)*15.0)*1.2);}\n'+m.fragmentShader.replace(a,'float b=curvaB51(vLuz.g);');
  m.userData.luz51=true;m.needsUpdate=true;
}
const _brilloEn51=brilloEn;
brilloEn=function(x,y,z){
  const b=_brilloEn51(x,y,z);
  const bl=luzEn(Math.floor(x),Math.floor(y),Math.floor(z))&15;
  return bl>0?Math.max(b,Math.pow(Math.min(1,Math.pow(.88,15-bl)*1.2),.72)):b;
};
