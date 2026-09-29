"use strict";
/* =========================================================
   Contenido de 1.19 "The Wild" y 1.20 "Trails & Tales":
   Deep Dark (sculk, sensores, chilladores, catalizadores,
   Warden y ciudades antiguas), manglares y ranas, cerezos,
   camellos, arqueología (pincel, arena y grava sospechosas,
   pirámides y ruinas de sendero) y mesa de herrería con la
   mejora a netherite.
   ========================================================= */
Object.assign(SND,{
  sculk:v=>{tonoSnd(420,900,.25,'sine',.05*v);ruidoSnd(.15,2500,.05*v,'bandpass');},
  chillido:v=>{tonoSnd(600,1500,1.3,'sawtooth',.07*v);tonoSnd(900,450,1.3,'square',.035*v);},
  latido:v=>{tonoSnd(55,40,.18,'sine',.35*v);tonoSnd(50,35,.18,'sine',.28*v,.22);},
  sonico:v=>{tonoSnd(1300,70,1,'sawtooth',.25*v);ruidoSnd(.9,1500,.4*v,'bandpass');},
  warden:v=>{tonoSnd(70,45,1,'sawtooth',.2*v);ruidoSnd(.7,250,.15*v);},
  camello:v=>tonoSnd(180,120,.4,'triangle',.05*v),
  rana:v=>{tonoSnd(230,160,.1,'square',.035*v);tonoSnd(210,150,.1,'square',.035*v,.14);},
  pincel:v=>ruidoSnd(.15,3500,.1*v,'highpass'),
});

/* =========================================================
   Generación
   ========================================================= */
const esDeepDark=(x,z)=>fbm(x*.0032,z*.0032,semilla+8800,2)>.6;
const Y_CIUDAD=OY-51;            // suelo de las ciudades antiguas (Y -51)
const R_CIUDAD=288;
const ROCA_SCULK=new Set([B.pizarra,B.piedra,B.granito,B.diorita,B.andesita,B.grava,B.tierra]);
function generarV120(ch,info){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla;
  ch.sculk=[];
  // ---- Deep Dark: sculk en suelos y techos de las cuevas profundas ----
  const mask=new Uint8Array(256); let hay=false;
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++)if(esDeepDark(bx+x,bz+z)){mask[z*CX+x]=1;hay=true;}
  if(hay){
    const r=mulberry32(Math.floor(hash2(cx,cz,s+8801)*4294967296));
    for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
      if(!mask[z*CX+x])continue; const wx=bx+x,wz=bz+z;
      for(let y=6;y<OY-2;y++){
        const i=idx(x,y,z); if(!ROCA_SCULK.has(datos[i]))continue;
        const arriba=datos[idx(x,y+1,z)], abajo=datos[idx(x,y-1,z)];
        const v=valueNoise3(wx/7,y/7,wz/7,s+8802);
        if(arriba===0){
          if(v>.42){
            datos[i]=B.sculk; const p=r();
            if(p<.012){datos[idx(x,y+1,z)]=B.sensorSculk;ch.sculk.push([x,y+1,z]);}
            else if(p<.0155){datos[idx(x,y+1,z)]=B.chillador;ch.sculk.push([x,y+1,z]);}
            else if(p<.017)datos[i]=B.catalizador;
          }else if(v>.35)datos[idx(x,y+1,z)]=B.vetaSculk;
        }else if(abajo===0&&v>.5)datos[i]=B.sculk;
      }
    }
  }
  construirCiudadesAntiguas(ch);
  construirCamarasPrueba(ch);
  construirMonumentos(ch);
  registrarCorazones(ch);
  // ---- Superficie: pozos, pirámides y ruinas ----
  const centro=info[8*CX+8], hC=centro.h;
  const pozo=centro.bioma===BIOMA.desierto&&hash2(cx,cz,s+960)<.01;
  if(pozo)for(const [x,z] of [[7,7],[9,9],[7,9],[9,7]])if(hash2(bx+x,bz+z,s+961)<.6)datos[idx(x,hC-1,z)]=B.arenaSospechosa;
  if(!pozo&&centro.bioma===BIOMA.desierto&&hash2(cx,cz,s+9800)<.006&&hC>NIVEL_MAR+1)piramide(datos,hC,bx,bz);
  if([BIOMA.taiga,BIOMA.jungla,BIOMA.bosque,BIOMA.abedul,BIOMA.cerezo,BIOMA.bosqueOscuro,BIOMA.taigaNevada].includes(centro.bioma)&&hash2(cx,cz,s+9700)<.007&&hC>NIVEL_MAR+1)
    ruinasSendero(datos,info,hC,bx,bz);
  estructurasCompleto(ch,info);
}
function piramide(datos,hC,bx,bz){
  const P=(x,y,z,b)=>{if(y>0&&y<CY)datos[idx(x,y,z)]=b;};
  for(let x=1;x<=13;x++)for(let z=1;z<=13;z++)for(let y=hC-3;y<hC;y++)if(!datos[idx(x,y,z)]||!SOLIDO[datos[idx(x,y,z)]])P(x,y,z,B.arenisca);
  for(let L=0;L<=7;L++)for(let x=1+L;x<=13-L;x++)for(let z=1+L;z<=13-L;z++){
    const borde=x===1+L||x===13-L||z===1+L||z===13-L;
    P(x,hC+L,z,L===0||borde||L>=6?B.arenisca:0);
  }
  for(let z=1;z<=4;z++)for(let y=hC+1;y<=hC+2;y++)P(7,y,z,0);            // entrada
  for(const [x,z] of [[7,7],[6,7],[8,7],[7,6],[7,8]])P(x,hC,z,B.terracota0);
  P(7,hC,7,B.terracota4);
  // Sala secreta con la trampa
  const R=hC-12;
  for(let x=3;x<=11;x++)for(let z=3;z<=11;z++)for(let y=R-2;y<=R+5;y++){
    const borde=x===3||x===11||z===3||z===11||y<=R||y===R+5;P(x,y,z,borde?B.arenisca:0);}
  for(let y=R+5;y<hC;y++)P(7,y,7,0);
  for(let x=6;x<=8;x++)for(let z=6;z<=8;z++)P(x,R-1,z,B.tnt);
  P(7,R+1,7,B.placa);
  for(const [x,z] of [[7,4],[7,10],[4,7],[10,7]]){P(x,R+1,z,B.cofre);registrarCofre(DIMS.superficie,bx+x,R+1,bz+z,'piramide');}
  for(let x=4;x<=10;x++)for(let z=4;z<=10;z++)if((x!==7||z!==7)&&hash2(bx+x,bz+z,semilla+9801)<.18)P(x,hC-1,z,B.arenaSospechosa);
}
function ruinasSendero(datos,info,hC,bx,bz){
  const s=semilla;
  for(let x=3;x<=12;x++)for(let z=3;z<=12;z++){
    const borde=x===3||x===12||z===3||z===12, h=info[z*CX+x].h;
    for(let y=hC-6;y<=Math.min(h,hC)-1;y++){
      const k=hash3(bx+x,y,bz+z,s+9701), i=idx(x,y,z);
      if(borde)datos[i]=k<.5?B.ladrillosBarro:k<.8?B.terracota:B.terracota2;
      else datos[i]=k<.14?B.gravaSospechosa:k<.62?B.grava:k<.66?B.ladrillosBarro:B.tierra;
    }
    if(borde&&hash2(bx+x,bz+z,s+9702)<.45){const alto=1+Math.floor(hash2(bx+x,bz+z,s+9703)*3);
      for(let y=h+1;y<=h+alto;y++)datos[idx(x,y,z)]=hash3(bx+x,y,bz+z,s+9704)<.7?B.ladrillosBarro:B.terracota;}
  }
  datos[idx(7,hC-4,8)]=B.vasija;
}
// Ciudades antiguas: una como mucho por región de 288×288, siempre en el Deep Dark
function ciudadesAntiguasCerca(x0,z0,x1,z1){
  const res=[];
  for(let rx=Math.floor((x0-48)/R_CIUDAD);rx<=Math.floor((x1+48)/R_CIUDAD);rx++)
    for(let rz=Math.floor((z0-48)/R_CIUDAD);rz<=Math.floor((z1+48)/R_CIUDAD);rz++){
      if(hash2(rx,rz,semilla+8900)>.65)continue;
      const x=rx*R_CIUDAD+48+Math.floor(hash2(rx,rz,semilla+8901)*(R_CIUDAD-96)), z=rz*R_CIUDAD+48+Math.floor(hash2(rx,rz,semilla+8902)*(R_CIUDAD-96));
      if(!esDeepDark(x,z))continue;
      res.push({x,z,y:Y_CIUDAD});
    }
  return res;
}
function construirCiudadesAntiguas(ch){
  const bx=ch.cx*CX,bz=ch.cz*CZ,d=ch.datos,s=semilla;
  for(const c of ciudadesAntiguasCerca(bx,bz,bx+CX-1,bz+CZ-1)){
    if(bx+CX<c.x-44||bx>c.x+44||bz+CZ<c.z-36||bz>c.z+36)continue;
    const F=c.y;
    const dentro=(x,z)=>x>=bx&&x<bx+CX&&z>=bz&&z<bz+CZ;
    const pon=(x,y,z,b)=>{if(!dentro(x,z)||y<1||y>=CY)return;d[idx(x-bx,y,z-bz)]=b;
      if(b===B.cofre)registrarCofre(DIMS.superficie,x,y,z,'ciudadAntigua');
      if(b===B.sensorSculk||b===B.chillador)ch.sculk.push([x-bx,y,z-bz]);};
    const get=(x,y,z)=>d[idx(x-bx,y,z-bz)];
    // Caverna, suelo, caminos, farolas y sculk
    for(let x=Math.max(bx,c.x-42);x<=Math.min(bx+CX-1,c.x+42);x++)for(let z=Math.max(bz,c.z-34);z<=Math.min(bz+CZ-1,c.z+34);z++){
      const dx=x-c.x,dz=z-c.z,e=(dx/42)**2+(dz/34)**2; if(e>1)continue;
      const techo=F+9+Math.round((1-e)*9+hash2(x,z,s+8910)*2);
      for(let y=F;y<=techo;y++)pon(x,y,z,0);
      const t=get(x,techo+1,z); if(t===0||esLiquido(t))pon(x,techo+1,z,B.pizarra);
      for(let y=F-4;y<F-1;y++){const b=get(x,y,z);if(!b||esLiquido(b))pon(x,y,z,B.pizarra);}
      const camino=Math.abs(dz)<=1||Math.abs(dx)<=1, v=valueNoise(x*.18,z*.18,s+8911);
      pon(x,F-1,z,camino?B.baldosasPizarra:(v>.55?B.sculk:((x^z)&7)===0?B.baldosasPizarra:B.ladrillosPizarra));
      if(!camino&&v>.6){const h=hash2(x,z,s+8912);
        if(h<.035)pon(x,F,z,B.sensorSculk);else if(h<.05)pon(x,F,z,B.chillador);else if(h<.14)pon(x,F,z,B.vetaSculk);}
      if((Math.abs(dz)===3&&dx%8===0&&Math.abs(dx)>13)||(Math.abs(dx)===3&&dz%8===0&&Math.abs(dz)>5)){
        pon(x,F,z,B.baldosasPizarra);pon(x,F+1,z,B.baldosasPizarra);pon(x,F+2,z,B.farolAlmas);}
    }
    // Plataforma y gran portal de pizarra reforzada
    for(let dx=-12;dx<=12;dx++)for(let dz=-4;dz<=4;dz++){
      const x=c.x+dx,z=c.z+dz;
      pon(x,F,z,Math.abs(dx)===12||Math.abs(dz)===4?B.baldosasPizarra:B.ladrillosPizarra);
      for(let y=F+1;y<=F+15;y++)pon(x,y,z,0);
    }
    for(let dx=-9;dx<=9;dx++)for(let y=F+1;y<=F+14;y++){
      const a=Math.abs(dx), marco=(a>=7&&a<=8)||(y>=F+12&&a<=8)||(y===F+11&&a>=5&&a<=8)||(y===F+13&&a===9);
      if(marco)pon(c.x+dx,y,c.z,B.pizarraReforzada);
      if(a===9&&y<=F+4)for(const dz of [-1,0,1])pon(c.x+dx,y,c.z+dz,B.ladrillosPizarra);
    }
    for(const [ox,oz] of [[-10,2],[10,-2]])pon(c.x+ox,F+1,c.z+oz,B.cofre);
    for(const [ox,oz] of [[-5,3],[5,-3],[-5,-3],[5,3]])pon(c.x+ox,F+1,c.z+oz,B.farolAlmas);
    // Casas en ruinas
    for(const [ox,oz] of [[-26,-18],[26,-18],[-26,18],[26,18],[-34,0],[34,0],[0,-24],[0,24]]){
      if(hash2(c.x+ox,c.z+oz,s+8913)<.2)continue;
      const x0=c.x+ox-3,z0=c.z+oz-3;
      for(let x=x0;x<=x0+6;x++)for(let z=z0;z<=z0+6;z++){
        const borde=x===x0||x===x0+6||z===z0||z===z0+6, esq=(x===x0||x===x0+6)&&(z===z0||z===z0+6);
        pon(x,F-1,z,B.baldosasPizarra);
        for(let y=F;y<=F+4;y++){
          if(y===F+4)pon(x,y,z,hash3(x,y,z,s+8916)<.2?0:B.ladrillosPizarra);
          else if(borde)pon(x,y,z,hash3(x,y,z,s+8914)<.15&&y>F+1?0:esq?B.baldosasPizarra:B.ladrillosPizarra);
          else pon(x,y,z,0);
        }
      }
      const px=ox===0?c.x:(ox<0?x0+6:x0), pz=ox===0?(oz<0?z0+6:z0):c.z+oz;
      for(let y=F;y<=F+2;y++)pon(px,y,pz,0);
      pon(x0+3,F,z0+3,B.cofre); pon(x0+1,F,z0+1,B.farolAlmas); pon(x0+5,F,z0+1,B.farolAlmas);
      if(hash2(x0,z0,s+8915)<.6)pon(x0+5,F,z0+5,B.chillador);
      if(hash2(x0,z0,s+8917)<.5)pon(x0+1,F,z0+5,B.sensorSculk);
    }
  }
}
function registrarSculk(x,y,z){
  const ch=chunkSiExiste(Math.floor(x/CX),Math.floor(z/CZ)); if(!ch)return;
  (ch.sculk||(ch.sculk=[])).push([x-ch.cx*CX,y,z-ch.cz*CZ]);
}

/* =========================================================
   Vibraciones, sensores, chilladores y catalizadores
   ========================================================= */
const vibraciones=[];
function registrarVibracion(x,y,z,tipo){
  if(dim!==DIMS.superficie||vibraciones.length>48)return;
  const jug=tipo==='jugador'||Math.hypot(x-jugador.pos.x,y-jugador.pos.y-1,z-jugador.pos.z)<6;
  vibraciones.push({x,y,z,jug});
}
const sensoresActivos=new Map();
let avisoNivel=0, avisoT=0, chilloCD=0, vibT=0, pasoVibT=0, sueloAntes=true;
function procesarVibraciones(dt){
  // Pasos, saltos y aterrizajes del jugador (agachado no hace ruido)
  if(estado==='jugando'&&dim===DIMS.superficie&&!jugador.montura&&supervivencia()){
    const v=Math.hypot(jugador.vel.x,jugador.vel.z);
    pasoVibT-=dt;
    if(jugador.suelo&&v>1&&!jugador.agachado&&pasoVibT<=0){pasoVibT=.5;registrarVibracion(jugador.pos.x,jugador.pos.y+.1,jugador.pos.z,'jugador');}
    if(jugador.suelo!==sueloAntes&&!jugador.agachado)registrarVibracion(jugador.pos.x,jugador.pos.y+.1,jugador.pos.z,'jugador');
    sueloAntes=jugador.suelo;
  }
  chilloCD=Math.max(0,chilloCD-dt);
  avisoT+=dt; if(avisoT>90){avisoT=0;avisoNivel=Math.max(0,avisoNivel-1);}
  for(const [k,s] of sensoresActivos){s.t-=dt;if(s.t<=0){sensoresActivos.delete(k);if(getBloque(s.x,s.y,s.z)===B.sensorSculkOn)setBloque(s.x,s.y,s.z,B.sensorSculk);}}
  vibT-=dt; if(vibT>0)return; vibT=.2;
  const lista=vibraciones.splice(0);
  for(const v of lista){
    // Warden: se orienta hacia la vibración y se enfada si viene del jugador
    for(const m of mobs)if(m.tipo==='warden'&&!m.muerto){const d=Math.hypot(m.pos.x-v.x,m.pos.y-v.y,m.pos.z-v.z);
      if(d<16){m.objetivoPos=new THREE.Vector3(v.x,v.y,v.z);m.calmaT=0;if(v.jug)m.ira=Math.min(150,(m.ira||0)+(d<8?35:20));}}
    const cx0=Math.floor(v.x/CX),cz0=Math.floor(v.z/CZ);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
      const ch=chunkSiExiste(cx0+a,cz0+b); if(!ch||!ch.sculk)continue;
      for(const [lx,y,lz] of ch.sculk){
        const x=ch.cx*CX+lx,z=ch.cz*CZ+lz; if(Math.hypot(x+.5-v.x,y+.5-v.y,z+.5-v.z)>8)continue;
        const id=getBloque(x,y,z);
        if(id===B.sensorSculk){setBloque(x,y,z,B.sensorSculkOn);sonar('sculk',{x,y,z});
          emitirParticulas(x+.5,y+.6,z+.5,0x40e0f0,6,1.2,.6,-1);
          sensoresActivos.set(clavePos(x,y,z),{x,y,z,t:1.5});}
        else if(id===B.sensorSculkOn){const s=sensoresActivos.get(clavePos(x,y,z));if(s)s.t=1.5;}
        else if(id===B.chillador&&v.jug)chillar(x,y,z);
      }
    }
  }
}
function chillar(x,y,z){
  if(chilloCD>0||!supervivencia())return;
  chilloCD=10; sonar('chillido',{x,y,z},1);
  for(let k=0;k<4;k++)setTimeout(()=>emitirParticulas(x+.5,y+.8+k*.3,z+.5,0x60f0ff,10,1.5,.9,-3),k*250);
  efectos.oscuridad={t:12,n:1};
  avisoNivel++; avisoT=0;
  if(avisoNivel===2)mostrarMensaje('Sientes que algo te observa…');
  if(avisoNivel===3)mostrarMensaje('El Warden se acerca…');
  if(avisoNivel>=4){avisoNivel=0;invocarWarden(x,y,z);}
}
function invocarWarden(x,y,z){
  if(mobs.some(m=>m.tipo==='warden'&&m.pos.distanceTo(new THREE.Vector3(x,y,z))<48))return;
  for(let k=0;k<20;k++){
    const px=x+azar(-5,5),pz=z+azar(-5,5),py=buscarSuelo(px,y+4,pz,10,3);
    if(py>0){const w=crearMob('warden',px+.5,py,pz+.5);w.emerger=6.5;w.ira=40;sonar('warden',{x:px,y:py,z:pz},1);return;}
  }
}
// Catalizador de sculk: las muertes cercanas extienden el sculk
function alMorirMob(m){
  if(!m.def||!m.def.xp||m.def.xp[1]<=0)return;
  const x=Math.floor(m.pos.x),y=Math.floor(m.pos.y),z=Math.floor(m.pos.z);
  let cat=null;
  for(let dy=-8;dy<=8&&!cat;dy++)for(let dx=-8;dx<=8&&!cat;dx++)for(let dz=-8;dz<=8;dz++)
    if(getBloqueSiCargado(x+dx,y+dy,z+dz)===B.catalizador){cat=[x+dx,y+dy,z+dz];break;}
  if(!cat)return;
  sonar('sculk',{x:cat[0],y:cat[1],z:cat[2]});
  emitirParticulas(cat[0]+.5,cat[1]+1.1,cat[2]+.5,0x40e0f0,10,1,.8,-2);
  let carga=azar(m.def.xp[0],m.def.xp[1])*2+2;
  for(let k=0;k<carga*4&&carga>0;k++){
    const px=x+azar(-3,3),pz=z+azar(-3,3);
    for(let py=y+1;py>=y-3;py--){
      const b=getBloque(px,py,pz);
      if(SOLIDO[b]&&OPACO[b]&&b!==B.sculk&&b!==B.catalizador&&BLOQUES[b].dureza!==Infinity&&!BLOQUES[b].inter&&getBloque(px,py+1,pz)===0){
        setBloque(px,py,pz,B.sculk,{sinAviso:true});carga--;
        if(prob(.06)&&carga>3){setBloque(px,py+1,pz,B.sensorSculk,{sinAviso:true});registrarSculk(px,py+1,pz);carga-=3;}
        emitirParticulas(px+.5,py+1.05,pz+.5,0x2090a0,2,.4,.5,-1);break;
      }
    }
  }
}

/* =========================================================
   Criaturas nuevas
   ========================================================= */
Object.assign(DEF_MOB,{
  warden:{vida:500,ancho:.45,alto:2.9,vel:1.4,tipo:'neutral',ia:'warden',dano:30,xp:[5,5],sonido:'latido',inmuneFuego:true,
    suelta:()=>[[B.catalizador,1]]},
  camello:{vida:32,ancho:.85,alto:2.3,vel:1.2,tipo:'pasivo',ia:'camello',comida:B.cactus,xp:[1,3],sonido:'camello',montable:true,suelta:()=>[]},
  rana:{vida:10,ancho:.25,alto:.5,vel:1,tipo:'pasivo',ia:'rana',comida:525,xp:[1,3],sonido:'rana',suelta:()=>[]},
});
Object.assign(NOMBRE_MOB,{warden:'Warden',camello:'Camello',rana:'Rana'});
const MODELOS_EXTRA={
  warden({g,pon,parte,piernas,brazos,extra}){
    const col=0x103e44, osc=0x0a2a30;
    [-1,1].forEach(s=>{const p=pon(parte(.42,1,.42,osc,true),s*.3,1,0);p.userData.s=s;piernas.push(p);});
    pon(parte(1.15,1.25,.62,col),0,1.62,0);
    extra.cabeza=pon(parte(.95,.8,.8,col),0,2.65,0);
    pon(parte(.55,.14,.02,0x04141a),0,2.45,.41);
    extra.cuernos=[pon(parte(.12,.55,.1,0x40d8e8),-.55,3.0,0),pon(parte(.12,.55,.1,0x40d8e8),.55,3.0,0)];
    extra.cuernos.forEach(c=>{delete c.userData.base;});
    [-1,1].forEach(s=>{const b=pon(parte(.38,1.35,.38,col,true),s*.77,2.2,0);b.userData.s=s;brazos.push(b);});
    const pecho=new THREE.Mesh(new THREE.BoxGeometry(.55,.45,.04),new THREE.MeshBasicMaterial({color:0x103a40}));
    pecho.position.set(0,1.78,.32); g.add(pecho); extra.pecho=pecho;
    for(const [x,y] of [[-.35,1.3],[.35,1.4],[-.2,2.05],[.3,1.95]]){const r=pon(parte(.12,.12,.02,0x40c8d8),x,y,.32);delete r.userData.base;}
  },
  camello({pon,parte,cuadrupedo,extra}){
    cuadrupedo(.3,.48,1.1,0xc08e52,.24);
    pon(parte(.95,.8,1.7,0xd6a868),0,1.5,0);
    pon(parte(.62,.45,.75,0xcc9c5e),0,2.1,-.1);
    pon(parte(.82,.1,.72,0x8a2a22),0,2.34,-.1);
    pon(parte(.36,.95,.42,0xd6a868),0,2.05,.9);
    extra.cabeza=pon(parte(.42,.42,.75,0xd6a868),0,2.6,1.15);
    pon(parte(.08,.08,.02,0x221810),-.15,2.68,1.53); pon(parte(.08,.08,.02,0x221810),.15,2.68,1.53);
    pon(parte(.1,.4,.1,0xb08048),0,1.35,-.9);
  },
  rana({pon,parte,piernas,extra,opc}){
    const c=[0xd08040,0x6a9a50,0xe8e0c8][opc.variante||0];
    [-1,1].forEach(s=>{const p=pon(parte(.12,.18,.3,c,true),s*.17,.18,-.06);p.userData.s=s;piernas.push(p);});
    pon(parte(.42,.22,.5,c),0,.25,0); extra.cabeza=pon(parte(.42,.14,.42,c),0,.42,.08);
    pon(parte(.1,.1,.1,0x202020),-.14,.53,.12); pon(parte(.1,.1,.1,0x202020),.14,.53,.12);
  },
};
const IA_EXTRA={
  warden(m,dt,c){
    // Emerger del suelo y excavar para irse
    if(m.emerger>0||m.cavar>0){
      const t=m.emerger>0?m.emerger/6.5:1-m.cavar/5;
      if(m.emerger>0)m.emerger-=dt;else{m.cavar-=dt;if(m.cavar<=0){quitarMob(m);return false;}}
      m.inv=1; m.vel.set(0,0,0);
      m.grupo.position.set(m.pos.x,m.pos.y-2.9*t,m.pos.z); m.grupo.rotation.y=m.yaw;
      if(Math.random()<dt*20)emitirParticulas(m.pos.x+(Math.random()-.5),m.pos.y+.1,m.pos.z+(Math.random()-.5),0x2a3a3a,2,1.5,.6,8);
      return false;
    }
    m.ira=Math.max(0,(m.ira||0)-dt*.6);
    if(m.enfadado>0){m.ira=150;m.enfadado=0;}
    m.calmaT=(m.calmaT||0)+dt;
    if(m.calmaT>60&&m.ira<10){m.cavar=5;sonar('warden',m.pos,.8);return false;}
    // Olfato: detecta al jugador cercano aunque no haga ruido
    m.olfatoT=(m.olfatoT||0)-dt;
    if(m.olfatoT<=0){m.olfatoT=5;if(c.dist3<8&&objetivoValido()){m.ira=Math.min(150,m.ira+25);m.calmaT=0;}}
    // Oscuridad pulsante alrededor
    m.oscT=(m.oscT||0)-dt;
    if(m.oscT<=0){m.oscT=6;if(c.dist3<20&&objetivoValido())efectos.oscuridad={t:8,n:1};}
    // Latido
    m.latidoT=(m.latidoT||0)-dt;
    const ritmo=1.4-Math.min(1,m.ira/100)*.9;
    if(m.latidoT<=0){m.latidoT=ritmo;if(c.dist3<20)sonar('latido',m.pos,.8);m.pulso=.25;}
    m.pulso=Math.max(0,(m.pulso||0)-dt);
    if(m.extra.pecho){const b=.2+m.pulso*3;m.extra.pecho.material.color.setRGB(.1*b+.05,.7*b+.1,.8*b+.12);}
    if(m.extra.cuernos)m.extra.cuernos.forEach((k,i)=>{k.rotation.z=Math.sin(tiempoJuego*(3+m.ira/30)+i)*.35*(i?1:-1);});
    if(m.cargaSonico>0){
      m.cargaSonico-=dt; m.mover=false; m.yawObj=Math.atan2(c.dx,c.dz);
      if(Math.random()<dt*30)emitirParticulas(m.pos.x,m.pos.y+1.8,m.pos.z,0x60e0ff,1,.6,.4,-1);
      if(m.cargaSonico<=0&&objetivoValido()&&c.dist3<20){
        sonar('sonico',m.pos,1);
        const n=Math.ceil(c.dist3);for(let k=1;k<=n;k++){const f=k/n;emitirParticulas(m.pos.x+c.dx*f,m.pos.y+1.8+(c.dy-.3)*f,m.pos.z+c.dz*f,0x9ff4ff,2,.3,.5,0);}
        danarJugador(10,'sonico',{x:c.dx/(c.dist||1)*2.5,z:c.dz/(c.dist||1)*2.5});jugador.vel.y=Math.max(jugador.vel.y,6);
      }
      return true;
    }
    m.sonicoCD=Math.max(0,(m.sonicoCD||0)-dt);
    if(m.ira>=80&&objetivoValido()){
      m.calmaT=0;
      mover(m,c.dist>1.4?c.dx:0,c.dist>1.4?c.dz:0,3.1); m.yawObj=Math.atan2(c.dx,c.dz);
      if(c.dist<1.9&&Math.abs(c.dy)<2.6&&m.cd<=0){m.cd=1.4;m.golpeT=.35;sonar('golpe',m.pos,1);
        danarJugador(def_dano(m),'mob',{x:c.dx/(c.dist||1)*1.5,z:c.dz/(c.dist||1)*1.5});}
      if(m.sonicoCD<=0&&c.dist3>3.5&&c.dist3<15&&(m.chocoH||Math.random()<dt*.6)){m.sonicoCD=5;m.cargaSonico=1.7;sonar('warden',m.pos,.7);}
    }else if(m.objetivoPos){
      const ox=m.objetivoPos.x-m.pos.x,oz=m.objetivoPos.z-m.pos.z;
      if(Math.hypot(ox,oz)<1.5)m.objetivoPos=null;else mover(m,ox,oz,m.ira>40?2:1.2);
    }else{
      m.t-=dt;if(m.t<=0){m.t=3+Math.random()*5;m.mover=Math.random()<.4;m.yawObj=Math.random()*Math.PI*2;m.velObj=.9;}
    }
    return true;
  },
  camello(m,dt){
    m.dashCD=Math.max(0,(m.dashCD||0)-dt);
    if(m===jugador.montura){
      const d=dirEntradaCamara();
      if((d.x||d.z)&&estado==='jugando')mover(m,d.x,d.z,jugador.corriendo?6:3.8);else m.mover=false;
      if(teclas.Space&&m.dashCD<=0&&m.suelo&&estado==='jugando'){m.dashCD=2.75;const f=-Math.sin(jugador.yaw),g=-Math.cos(jugador.yaw);
        m.vel.x=f*14;m.vel.z=g*14;m.vel.y=6.5;sonar('camello',m.pos,.8);emitirParticulas(m.pos.x,m.pos.y+.1,m.pos.z,0xd8c090,10,2,.5,6);}
      return true;
    }
    m.t-=dt;if(m.t<=0){m.t=4+Math.random()*8;m.mover=Math.random()<.35;m.yawObj=Math.random()*Math.PI*2;}
    m.velObj=1.2;
    return true;
  },
  rana(m,dt,c){
    m.mover=false;
    const enAgua=esAgua(getBloque(Math.floor(m.pos.x),Math.floor(m.pos.y+.2),Math.floor(m.pos.z)));
    if(enAgua){if(m.cd<=0){m.cd=1;const a=Math.random()*Math.PI*2;m.vel.x=Math.sin(a)*2;m.vel.z=Math.cos(a)*2;m.yawObj=a;}}
    else if(m.suelo&&m.cd<=0){m.cd=1.5+Math.random()*3;
      if(Math.random()<.55){const a=m.def.tipo==='pasivo'&&c.dist<8&&enManoId()===525?Math.atan2(c.dx,c.dz):Math.random()*Math.PI*2;
        m.yawObj=a;m.vel.x=Math.sin(a)*2.6;m.vel.z=Math.cos(a)*2.6;m.vel.y=5.5;}}
    // Lengua: se come los slimes y cubos de magma pequeños
    for(const o of mobs)if((o.tipo==='slime'||o.tipo==='cuboMagma')&&o.tam===0&&!o.muerto&&o.pos.distanceTo(m.pos)<3){
      m.yawObj=Math.atan2(o.pos.x-m.pos.x,o.pos.z-m.pos.z);sonar('rana',m.pos);
      emitirParticulas(o.pos.x,o.pos.y+.3,o.pos.z,0xe06080,6,1,.4,0);quitarMob(o);break;}
    return true;
  },
};
function def_dano(m){return m.def.dano;}
function aparicionExtra(x,z){
  if(aparicionFinal(x,z))return true;
  if(aparicionCompleto(x,z))return true;
  if(Math.random()>.05)return false;
  const bio=infoColumna(x,z).bioma;
  let y=CY-1; while(y>0&&!getBloque(x,y,z))y--;
  const sup=getBloque(x,y,z);
  if((bio===BIOMA.pantano||bio===BIOMA.manglar)&&contar(m=>m.tipo==='rana')<6&&(sup===B.cesped||sup===B.barro)){
    const variante=bio===BIOMA.manglar?2:0, n=azar(2,4);
    for(let k=0;k<n;k++){const ox=x+azar(-2,2),oz=z+azar(-2,2),oy=buscarSuelo(ox,y+3,oz,6,1);if(oy>0)crearMob('rana',ox+.5,oy,oz+.5,{variante});}
    return true;
  }
  if(bio===BIOMA.nevado&&sup===B.cespedNevado&&contar(m=>m.tipo==='rana')<3&&Math.random()<.2){crearMob('rana',x+.5,y+1,z+.5,{variante:1});return true;}
  if(bio===BIOMA.desierto&&sup===B.arena&&contar(m=>m.tipo==='camello')<2&&Math.random()<.25){crearMob('camello',x+.5,y+1,z+.5);return true;}
  return false;
}

/* =========================================================
   Arqueología: el pincel limpia la arena y la grava sospechosas
   ========================================================= */
const BOTIN_ARENA=[[529,10],[530,10],[531,10],[I.esmeralda,12],[I.diamante,4],[I.polvora,12],[B.tnt,6],[I.ladrillo,8],[I.pepitaOro,10]];
const BOTIN_GRAVA=[[532,12],[530,6],[I.esmeralda,10],[I.trigo,10],[I.carbon,10],[I.lingoteOro,4],[B.vasija,4],[I.cuerda,8],[533,1]];
let cepillado=null;
function actualizarPincel(dt){
  if(!(clicDer&&estado==='jugando'&&enManoId()===528&&apuntado&&BLOQUES[apuntado.b]&&BLOQUES[apuntado.b].sospechoso)){cepillado=null;return;}
  const a=apuntado, k=clavePos(a.x,a.y,a.z);
  if(!cepillado||cepillado.k!==k)cepillado={k,t:0,s:0};
  cepillado.t+=dt; cepillado.s-=dt;
  if(cepillado.s<=0){cepillado.s=.3;sonar('pincel',a,.8);balancearMano();
    particulasBloque(a.x+.5+a.n[0]*.55,a.y+.5+a.n[1]*.55,a.z+.5+a.n[2]*.55,BLOQUES[a.b].lado,4,1,.5);}
  if(cepillado.t>=2.2){
    const arena=a.b===B.arenaSospechosa, tabla=arena?BOTIN_ARENA:BOTIN_GRAVA;
    const id=elegirPeso(tabla);
    soltarItem(crearPila(id,1),a.x+.5+a.n[0]*.7,a.y+.5+a.n[1]*.7,a.z+.5+a.n[2]*.7,false,new THREE.Vector3(a.n[0]*2,2,a.n[2]*2));
    setBloque(a.x,a.y,a.z,arena?B.arena:B.grava);
    sonar('recoger'); gastarObjetoEnMano(1); cepillado=null;
  }
}

/* =========================================================
   Mesa de herrería: mejora de diamante a netherite
   ========================================================= */
function mejoraNetherite(id){const it=ITEMS[id];if(!it)return 0;if(it.herr&&it.herr.mat===4)return id+1;if(it.armadura&&it.armadura.mat===3&&!it.elitros)return id+1;return 0;}
function resultadoHerreria(h){
  if(!h.p||!h.o||!h.m||h.p.id!==533||h.m.id!==535)return null;
  const n=mejoraNetherite(h.o.id); if(!n)return null;
  const dano=ITEMS[h.o.id].dur-h.o.dur;
  return {id:n,n:1,dur:Math.max(1,ITEMS[n].dur-dano),enc:h.o.enc?{...h.o.enc}:undefined};
}
UI_EXTRA.herreria={
  abrir(u){u.herr={p:null,o:null,m:null};},
  construir(titulo,fila){
    titulo('MESA DE HERRERÍA');
    const z=fila(), h=ui.herr;
    crearSlot(z,refObj(h,'p',{acepta:p=>p.id===533,shift:aJugador}),false,'plantilla');
    crearSlot(z,refObj(h,'o',{max:1,acepta:p=>!!mejoraNetherite(p.id),shift:aJugador}),false,'objeto');
    crearSlot(z,refObj(h,'m',{acepta:p=>p.id===535,shift:aJugador}),false,'lingote');
    const fl=document.createElement('div');fl.className='flecha';fl.textContent='➜';z.appendChild(fl);
    crearSlot(z,{tipo:'salida',get:()=>resultadoHerreria(h),
      set:v=>{if(v)return;if(!resultadoHerreria(h))return;
        if(--h.p.n<=0)h.p=null; if(--h.m.n<=0)h.m=null; h.o=null; sonar('yunque');},
      shift:p=>{const r=aJugador(p);if(r)soltarItem(r,jugador.pos.x,jugador.pos.y+1,jugador.pos.z,false);return null;},
      acepta:()=>false},true);
    const c=document.createElement('div');c.className='pista';
    c.textContent='Plantilla de mejora + herramienta o armadura de diamante + lingote de netherite';elSup.appendChild(c);
  },
  shift(p){const h=ui.herr;
    if(p.id===533)return insertarEn(h,'p',p);
    if(p.id===535)return insertarEn(h,'m',p);
    if(mejoraNetherite(p.id)&&!h.o){h.o=p;return null;}
    return p;},
  cerrar(u,devolver){devolver(u.herr.p);devolver(u.herr.o);devolver(u.herr.m);},
};

/* ---------- Clic derecho: camellos, barro y pincel ---------- */
function usarDerechoV120(p,id,it){
  if(usarDerechoRecientes(p,id,it))return true;
  if(usarDerechoV121(p,id,it))return true;
  const m=apuntadoEnt&&apuntadoEnt.mob;
  if(m&&m.def.montable&&id!==m.def.comida&&!jugador.agachado){montar(m);return true;}
  if(id===501&&apuntado&&apuntado.b===B.tierra){
    setBloque(apuntado.x,apuntado.y,apuntado.z,B.barro);sonar('agua',apuntado,.6);
    emitirParticulas(apuntado.x+.5,apuntado.y+1,apuntado.z+.5,0x5a8ad0,8,1,.5,4);
    if(supervivencia())inv[ranura]=crearPila(500);actualizarHUD();balancearMano();return true;
  }
  if(id===528)return true;   // el pincel se usa manteniendo pulsado
  return false;
}

/* ---------- Pétalos que caen de los cerezos ---------- */
let petaloT=0;
function particulasCerezo(dt){
  petaloT-=dt; if(petaloT>0||dim!==DIMS.superficie)return; petaloT=.07;
  for(let k=0;k<4;k++){
    const x=Math.floor(jugador.pos.x+(Math.random()-.5)*24),z=Math.floor(jugador.pos.z+(Math.random()-.5)*24),y=Math.floor(jugador.pos.y+Math.random()*12-2);
    if(getBloqueSiCargado(x,y,z)===B.hojasCerezo&&!getBloque(x,y-1,z))
      emitirParticulas(x+Math.random(),y-.05,z+Math.random(),Math.random()<.5?0xf7b5d0:0xffd0e4,1,.35,4,.6);
  }
}

/* ---------- Localizar estructuras y biomas nuevos ---------- */
function localizarV120(q){
  const t=localizarV121(q); if(t)return t;
  const j=jugador.pos;
  if(q.startsWith('anc')||q.startsWith('ciudad')){
    const l=ciudadesAntiguasCerca(j.x-3000,j.z-3000,j.x+3000,j.z+3000).sort((a,b)=>Math.hypot(a.x-j.x,a.z-j.z)-Math.hypot(b.x-j.x,b.z-j.z));
    return l.length?`Ciudad antigua cerca de X ${l[0].x}, Z ${l[0].z} (Y ${l[0].y-OY}).`:'No hay ciudades antiguas cerca.';
  }
  const biomas={pale:BIOMA.jardinPalido,palido:BIOMA.jardinPalido,cherry:BIOMA.cerezo,cerezo:BIOMA.cerezo,mangrove:BIOMA.manglar,manglar:BIOMA.manglar,desierto:BIOMA.desierto,desert:BIOMA.desierto,
    oscuro:BIOMA.bosqueOscuro,dark:BIOMA.bosqueOscuro,prado:BIOMA.prado,meadow:BIOMA.prado,picos:BIOMA.picosNevados,peaks:BIOMA.picosNevados,
    nevada:BIOMA.taigaNevada,snowy:BIOMA.taigaNevada,calido:BIOMA.oceanoCalido,warm:BIOMA.oceanoCalido,helado:BIOMA.oceanoHelado,frozen:BIOMA.oceanoHelado};
  const clave=Object.keys(biomas).find(k=>q.startsWith(k.slice(0,4)));
  if(clave){
    const obj=biomas[clave];
    for(let r=0;r<=2400;r+=40)for(let a=0;a<Math.max(1,r/10);a++){
      const ang=a/Math.max(1,r/10)*Math.PI*2,x=Math.round(j.x+Math.cos(ang)*r),z=Math.round(j.z+Math.sin(ang)*r);
      if(infoColumna(x,z).bioma===obj)return `${NOMBRES_BIOMA[obj]} cerca de X ${x}, Z ${z}.`;
    }
    return 'No se encontró ese bioma cerca.';
  }
  return null;
}

/* ---------- Bucle ---------- */
function actualizarV120(dt){
  procesarVibraciones(dt);
  actualizarRecientes(dt);
  actualizarPruebas(dt);
  actualizarPincel(dt);
  particulasCerezo(dt);
}
