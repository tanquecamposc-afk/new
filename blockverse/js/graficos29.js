"use strict";
/* =========================================================
   Calidad gráfica: Baja, Media, Alta y Ultra.
   · Resolución de dibujo (Ultra hace supermuestreo).
   · Antialiasing MSAA 4x (con los shaders y WebGL2).
   · Mipmaps del atlas hechos a mano: cada nivel conserva la
     transparencia dominante y el canal de tinte de hojas y
     césped, así que de lejos no hay parpadeo ni muaré y las
     hojas no pierden su color. Filtrado anisótropo para que
     el suelo se vea nítido en ángulos rasantes.
   ========================================================= */
// Sin tarjeta gráfica (renderizado por software) o en móvil se empieza en Media; con GPU, en Alta
function gpuPorSoftware(){try{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const r=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);return /swiftshader|llvmpipe|software|basic render/i.test(String(r));}catch(e){return false;}}
if(OPC.calidad===undefined)OPC.calidad=(('ontouchstart' in window&&navigator.maxTouchPoints>0)||gpuPorSoftware())?1:2;
const CALIDADES=[
  {n:'Baja',escala:.75,msaa:0,aniso:1},
  {n:'Media',escala:1,msaa:0,aniso:2},
  {n:'Alta',escala:1,msaa:4,aniso:8},
  {n:'Ultra',escala:1.5,msaa:4,aniso:16},
];
// Mipmaps: alfa por mayoría (0, tinte 250, opaco 255, o el del agua) y color medio de los píxeles visibles
function mipsAtlas(img){
  const niveles=[], w0=img.width, h0=img.height;
  let c=document.createElement('canvas');c.width=w0;c.height=h0;c.getContext('2d').drawImage(img,0,0);niveles.push(c);
  let d=c.getContext('2d').getImageData(0,0,w0,h0), w=w0, h=h0;
  while(w>1||h>1){
    const nw=Math.max(1,w>>1), nh=Math.max(1,h>>1), o=new ImageData(nw,nh), s=d.data, t=o.data;
    for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){
      let r=0,g=0,b=0,n=0;const cuenta=new Map();
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const sx=Math.min(w-1,x*2+dx),sy=Math.min(h-1,y*2+dy),k=(sy*w+sx)*4,a=s[k+3];
        if(a>=128){r+=s[k];g+=s[k+1];b+=s[k+2];n++;cuenta.set(a,(cuenta.get(a)||0)+1);}}
      const k=(y*nw+x)*4;
      if(n>=2){let am=255,mx=0;for(const [a,cnt] of cuenta)if(cnt>mx){mx=cnt;am=a;}t[k]=r/n;t[k+1]=g/n;t[k+2]=b/n;t[k+3]=am;}
      else if(n===1){t[k]=r;t[k+1]=g;t[k+2]=b;t[k+3]=0;}
      else{let a=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const sx=Math.min(w-1,x*2+dx),sy=Math.min(h-1,y*2+dy);a+=s[(sy*w+sx)*4+3];}t[k+3]=a/4|0;}
    }
    const cv=document.createElement('canvas');cv.width=nw;cv.height=nh;cv.getContext('2d').putImageData(o,0,0);niveles.push(cv);
    d=o;w=nw;h=nh;
  }
  return niveles;
}
let _imgMips=null,_verMips=-1;
function prepararAtlas(){
  if(!renderer.capabilities.isWebGL2)return;   // en WebGL1 el atlas no es potencia de dos
  const img=texAtlas.image; if(!img||!img.width)return;
  texAtlas.mipmaps=mipsAtlas(img); texAtlas.generateMipmaps=false;
  texAtlas.minFilter=THREE.NearestMipmapNearestFilter;  // sin mezclar niveles: el alfa de tinte (250) se conserva exacto texAtlas.magFilter=THREE.NearestFilter;
  texAtlas.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),CALIDADES[OPC.calidad].aniso);
  texAtlas.needsUpdate=true; _imgMips=img; _verMips=texAtlas.version;
}
function aplicarCalidad(){
  const C=CALIDADES[OPC.calidad]||CALIDADES[2];
  renderer.setPixelRatio(Math.min(3,Math.max(.5,(devicePixelRatio||1)*C.escala)));
  renderer.setSize(innerWidth,innerHeight);
  if(typeof PP!=='undefined'&&PP.rtEscena.isWebGLMultisampleRenderTarget&&PP.rtEscena.samples!==C.msaa){PP.rtEscena.samples=C.msaa;PP.rtEscena.dispose();}
  if(_imgMips){texAtlas.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),C.aniso);texAtlas.needsUpdate=true;_verMips=texAtlas.version;}
}
prepararAtlas(); aplicarCalidad();
// Si un paquete de texturas cambia el atlas, se rehacen los mipmaps
setInterval(()=>{if(texAtlas.image!==_imgMips||texAtlas.version!==_verMips&&texAtlas.mipmaps&&texAtlas.mipmaps[0]&&texAtlas.mipmaps[0].width!==texAtlas.image.width)prepararAtlas();},1000);
const _aplicarOpcG=aplicarOpc;
aplicarOpc=function(){_aplicarOpcG();aplicarCalidad();};
(function(){
  const rej=document.querySelector('.rejillaOpc'); if(!rej)return;
  const b=botonOpc(()=>OPC.calidad,()=>{OPC.calidad=(OPC.calidad+1)%CALIDADES.length;},v=>'Calidad gráfica: '+CALIDADES[v].n);
  b.dataset.tip='Resolución, antialiasing y nitidez de las texturas a lo lejos (Ultra: supermuestreo)';
  rej.insertBefore(b,rej.firstChild);
})();
