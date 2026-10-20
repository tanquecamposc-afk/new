// Muestras del generador web para comprobar que la versión Luau da lo mismo
const {abrir}=require('./rec_base.js');const fs=require('fs');
(async()=>{const p=await abrir(1);
 const r=await p.evaluate(()=>{
  const out={hash2:[],hash3:[],mul:[],vn:[],vn3:[],fbm:[],info:[],chunks:{}};
  for(const [x,z,s] of [[0,0,0],[1,2,3],[-5,7,12345],[123456,-98765,4242],[-1,-1,-1],[2147483647,5,9]])out.hash2.push([x,z,s,hash2(x,z,s)]);
  for(const [x,y,z,s] of [[0,0,0,0],[1,2,3,4],[-5,70,12,12345],[99999,-4,-77,31337]])out.hash3.push([x,y,z,s,hash3(x,y,z,s)]);
  for(const s of [0,1,123456789,4294967295,-5]){const r=mulberry32(s);out.mul.push([s,[r(),r(),r(),r()]]);}
  for(const [x,z,s] of [[0.5,0.25,7],[-12.75,33.1,12345],[1000.3,-2000.9,99]])out.vn.push([x,z,s,valueNoise(x,z,s)]);
  for(const [x,y,z,s] of [[0.5,0.25,7.3,7],[-12.75,33.1,4.4,12345]])out.vn3.push([x,y,z,s,valueNoise3(x,y,z,s)]);
  for(const [x,z,s,o] of [[0.5,0.25,7,4],[-12.75,33.1,12345,3]])out.fbm.push([x,z,s,o,fbm(x,z,s,o)]);
  semilla=12345;
  for(let i=0;i<300;i++){const x=Math.round((i*7919)%4001-2000),z=Math.round((i*104729)%4001-2000);const inf=infoColumna(x,z);out.info.push([x,z,inf.h,inf.bioma]);}
  const ae=estructurasSuperficie, av=generarV120;estructurasSuperficie=()=>{};generarV120=()=>{};
  for(const [cx,cz] of [[0,0],[3,-2],[-7,5],[20,20],[-40,13],[61,-33],[5,90],[-100,-100]]){
    const ch={cx,cz,datos:new Uint16Array(CX*CY*CZ),dim:DIMS.superficie,generadores:[]};
    _generarSuperficieBase(ch);out.chunks[cx+','+cz]=Array.from(ch.datos);}
  estructurasSuperficie=ae;generarV120=av;
  return out;});
 fs.writeFileSync('export/muestras.json',JSON.stringify(r));console.log('ok',Object.keys(r.chunks).length,p.errs.slice(0,2));await p.b.close();})();
