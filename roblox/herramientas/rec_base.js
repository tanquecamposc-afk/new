const { chromium } = require('playwright');const fs=require('fs');
const RELOJ=`(()=>{let vt=0;const cola=[];
  window.requestAnimationFrame=f=>{cola.push(f);return cola.length;};window.cancelAnimationFrame=()=>{};
  performance.now=()=>vt; const D=Date.now.bind(Date),d0=D(); Date.now=()=>d0+vt;
  window.__paso=dt=>{vt+=dt*1000;const fs=cola.splice(0);for(const f of fs){try{f(vt);}catch(e){console.error('raf',e&&e.message);}}};})();`;
async function abrir(escala=1.5){
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:escala});
  p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.addInitScript(RELOJ);
  await p.route('**/three.min.js',r=>r.fulfill({path:'package/build/three.min.js',contentType:'text/javascript'}));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  await p.goto('file:///home/user/new/blockverse/index.html');
  await p.evaluate(()=>{localStorage.clear();});
  for(let i=0;i<20;i++)await p.evaluate(()=>__paso(1/30));
  p.b=b;
  p.paso=async(n=1,dt=1/30)=>{for(let i=0;i<n;i++)await p.evaluate(dt=>__paso(dt),dt);};
  p.grabar=async(nombre,n,cada)=>{const dir='ad/clips/'+nombre;fs.mkdirSync(dir,{recursive:true});const t0=Date.now();
    for(let i=0;i<n;i++){if(cada)await p.evaluate(cada,i);await p.evaluate(()=>__paso(1/30));
      await p.screenshot({path:`${dir}/${String(i).padStart(3,'0')}.jpg`,type:'jpeg',quality:90});}
    console.log('clip',nombre,n,'frames',((Date.now()-t0)/n/1000).toFixed(2)+'s/frame');};
  return p;
}
module.exports={abrir};
module.exports.preparar=async p=>{
  await p.evaluate(()=>{pausar=()=>{};OPC.resDinamica=false;window.__nr=false;
    const rf=renderizarFinal;renderizarFinal=function(){if(!window.__nr)rf();};
    if(typeof pasoSombras==='function'){const ps=pasoSombras;pasoSombras=function(){if(!window.__nr)ps();};}
    window.suelo=(x,z)=>{for(let y=CY-1;y>0;y--){const b=getBloque(Math.floor(x),y,Math.floor(z));if(b&&!esAgua(b))return y+1;}return NIVEL_MAR;};
    const st=document.createElement('style');st.textContent='body.cine #hud,body.cine #mira,body.cine #filasEstado,body.cine #barraXP,body.cine #nivelXP,body.cine #barra,body.cine #cargaAtaque,body.cine #chat,body.cine #mensaje,body.cine #nombreBloque{display:none!important}';document.head.appendChild(st);
    window.hud=v=>document.body.classList.toggle('cine',!v);
    const sd=$('selDistancia');if(sd){sd.value='9';sd.onchange&&sd.onchange();}
    window.fw=y=>[-Math.sin(y),-Math.cos(y)];});
  p.calentar=async n=>{await p.evaluate(()=>{window.__nr=true;});await p.paso(n);await p.evaluate(()=>{window.__nr=false;});};
};
