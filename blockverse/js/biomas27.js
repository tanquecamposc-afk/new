"use strict";
/* =========================================================
   Decoración de los biomas nuevos y de las cuevas:
   campos de champiñones, bosque de flores, llanura de
   girasoles, espigas de hielo, jungla de bambú, badlands
   erosionados (agujas de terracota), taiga de árboles
   gigantes, arrecifes de coral en el océano cálido, algas y
   pasto marino en los océanos, cuevas frondosas (musgo,
   azaleas, raíces, flores de esporas) y cuevas de
   espeleotemas.
   ========================================================= */
const TERRACOTAS_AGUJA=()=>['naranja','amarillo','blanco','marron','rojo','grisClaro'].map(c=>B['terracota_'+c]).filter(Boolean);
function decorarBiomas(ch){
  const {datos,cx,cz}=ch, bx=cx*CX, bz=cz*CZ, s=semilla+31000;
  const G=(x,y,z)=>datos[idx(x,y,z)], P=(x,y,z,b)=>{if(x>=0&&x<CX&&z>=0&&z<CZ&&y>0&&y<CY)datos[idx(x,y,z)]=b;};
  const cima=(x,z)=>{for(let y=CY-2;y>1;y--){const b=G(x,y,z);if(b&&!esHojas(b)&&!esLiquido(b)&&BLOQUES[b].forma!=='cruz'&&!esTronco(b))return y;}return 0;};
  const FLORES=[B.florAmarilla,B.florRoja,B.aciano,B.margarita,B.orquidea,B.floresSilvestres,B.girasol].filter(Boolean);
  const agujas=TERRACOTAS_AGUJA();
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const bio=ch.bioma[z*CX+x], wx=bx+x, wz=bz+z, r=hash2(wx,wz,s), r2=hash2(wx,wz,s+1);
    const y=cima(x,z); if(!y)continue;
    const sup=G(x,y,z), libre=!G(x,y+1,z);
    if(bio===BIOMA.champinones&&sup===B.micelio&&libre&&r<.05)P(x,y+1,z,r2<.5?B.champinonRojo:B.champinonMarron);
    else if(bio===BIOMA.bosqueFlores&&sup===B.cesped&&libre&&r<.3)P(x,y+1,z,FLORES[Math.floor(r2*FLORES.length)]);
    else if(bio===BIOMA.llanuraGirasoles&&sup===B.cesped&&libre&&r<.09)P(x,y+1,z,B.girasol);
    else if(bio===BIOMA.junglaBambu&&(sup===B.cesped||sup===B.podzol)&&libre&&r<.16){const h=4+Math.floor(r2*10);for(let k=1;k<=h&&!G(x,y+k,z);k++)P(x,y+k,z,B.bambu);}
    else if(bio===BIOMA.espigasHielo&&r<.004&&x>1&&x<14&&z>1&&z<14){  // espigas de hielo compacto
      const alto=8+Math.floor(r2*22), grosor=r2>.7?2:1;
      for(let k=0;k<alto;k++){const g=k<alto*.3?grosor:k<alto*.7?Math.min(1,grosor):0;for(let a=-g;a<=g;a++)for(let b=-g;b<=g;b++)if(Math.abs(a)+Math.abs(b)<=g)P(x+a,y+1+k,z+b,B.hieloCompacto);}
    }
    else if(bio===BIOMA.badlandsErosionados&&r<.006&&x>0&&x<15&&z>0&&z<15){  // agujas (hoodoos)
      const alto=10+Math.floor(r2*20);for(let k=1;k<=alto;k++){const b=agujas[Math.floor((y+k)/2)%agujas.length]||B.terracota;P(x,y+k,z,b);if(k<alto*.5){P(x+1,y+k,z,b);P(x,y+k,z+1,b);}}
    }
    else if(bio===BIOMA.taigaGigante&&sup===B.podzol&&libre&&r<.03)P(x,y+1,z,B.helecho||B.hierbaAlta);
    // Océanos: arrecifes de coral en el cálido; algas y pasto marino en los demás
    if(esOceano(bio)&&esAgua(G(x,y+1,z))&&G(x,y+2,z)&&esAgua(G(x,y+2,z))){
      if(bio===BIOMA.oceanoCalido){
        const rv=fbm(wx*.08,wz*.08,s+5,2);
        if(rv>.52){const k=Math.floor(hash2(wx>>2,wz>>2,s+6)*5), t=['tubo','cerebro','burbuja','fuego','cuerno'][k];
          P(x,y,z,B['bloqueCoral_'+t]); if(r<.35)P(x,y+1,z,r2<.5?B['coral_'+t]:B['abanicoCoral_'+t]); else if(r<.4)P(x,y+1,z,B.pepinoMar);
          if(r>.9&&esAgua(G(x,y+2,z))){P(x,y+1,z,B['bloqueCoral_'+t]);if(esAgua(G(x,y+3,z)))P(x,y+2,z,B['coral_'+t]);}}
        else if(r<.2)P(x,y+1,z,B.pastoMarino);
      }else if(bio!==BIOMA.oceanoHelado||r>.5){
        if(r<.06){const prof=NIVEL_MAR-y, alto=Math.max(1,Math.floor(prof*(.4+r2*.5)));for(let k=1;k<=alto&&esAgua(G(x,y+k,z));k++)P(x,y+k,z,B.alga);}
        else if(r<.22)P(x,y+1,z,B.pastoMarino);
      }
    }
  }
  // Cuevas frondosas y de espeleotemas (según un ruido a gran escala)
  const nc=fbm((bx+8)*.006,(bz+8)*.006,s+7,2), tipo=nc>.63?'frondosa':nc<.35?'espeleotema':null;
  if(!tipo)return;
  for(let z=0;z<CZ;z++)for(let x=0;x<CX;x++){
    const wx=bx+x,wz=bz+z, techo=cima(x,z)-8;
    for(let y=4;y<techo;y++){
      const b=G(x,y,z); if(b)continue;
      const abajo=G(x,y-1,z), arriba=G(x,y+1,z), h=hash3(wx,y,wz,s+8);
      const piedra=q=>q===B.piedra||q===B.pizarra||q===B.andesita||q===B.diorita||q===B.granito||q===B.toba;
      if(tipo==='frondosa'){
        if(piedra(abajo)){P(x,y-1,z,h<.12?B.arcilla:B.bloqueMusgo);if(h>.93)P(x,y,z,h>.985?B.azaleaFlorida:B.azalea);else if(h>.8)P(x,y,z,B.alfombraMusgo);}
        else if(piedra(arriba)){if(h<.5)P(x,y+1,z,B.bloqueMusgo);if(h>.97)P(x,y,z,B.floresEsporas);else if(h>.86)P(x,y,z,B.raicesColgantes);}
      }else{
        if(piedra(abajo)){if(h<.45)P(x,y-1,z,B.bloqueEspeleotema);if(h>.9)P(x,y,z,B.espeleotema);}
        else if(piedra(arriba)){if(h<.45)P(x,y+1,z,B.bloqueEspeleotema);if(h>.88)P(x,y,z,B.espeleotema);}
      }
    }
  }
}
const _generarSuperficieBio=generarSuperficie;
generarSuperficie=function(ch){
  _generarSuperficieBio(ch);
  if(typeof esOneBlock==='function'&&esOneBlock())return;
  if(ch.bioma)decorarBiomas(ch);
};
// Champiñacas en los campos de champiñones
const _aparicionFinalBio=aparicionFinal;
aparicionFinal=function(x,z){
  if(dim===DIMS.superficie&&Math.random()<.08&&infoColumna(x,z).bioma===BIOMA.champinones&&contar(m=>m.tipo==='champinaca')<6&&Math.hypot(x-jugador.pos.x,z-jugador.pos.z)>20){
    const y=buscarSuelo(x,infoColumna(x,z).h+3,z,6,2);if(y>0){for(let k=0;k<azar(2,4);k++)crearMob('champinaca',x+.5+k*.6,y,z+.5);return true;}}
  return _aparicionFinalBio(x,z);
};
