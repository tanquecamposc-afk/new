"use strict";
/* =========================================================
   Iconos de todos los objetos
   ========================================================= */
const PALO=[124,90,50];
const sombra=(c,f)=>c.map(v=>v*f);
function dibujarHerramienta(it){
  const h=it.herr,m=MATS[h.mat].col,osc=sombra(m,.72),cla=sombra(m,1.18);
  return lienzo16(it.clave.length*97+h.mat,({P,linea,elipse})=>{
    if(h.tipo==='pico'){linea(2,13,10,5,PALO);
      const pts=[[3,3],[5,2],[9,2],[11,3],[12,4],[13,6],[13,10],[12,12]];
      for(let i=0;i<pts.length-1;i++)linea(pts[i][0]-1,pts[i][1]+1,pts[i+1][0]-1,pts[i+1][1]+1,osc);
      for(let i=0;i<pts.length-1;i++)linea(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],m);}
    else if(h.tipo==='hacha'){
      for(let y=1;y<=7;y++){const xa=Math.max(6,9-y),xb=Math.min(12,14-y);for(let x=xa;x<=xb;x++)P(x,y,x===xa?cla:(x===xb?osc:m));}
      linea(2,13,12,3,PALO);}
    else if(h.tipo==='pala'){linea(2,13,9,6,PALO);elipse(11.5,4.5,2.9,2.9,m,10);P(10,3,cla);}
    else if(h.tipo==='azada'){linea(2,13,11,4,PALO);linea(8,2,12,2,m);linea(8,3,10,3,osc);P(12,3,m);}
    else{linea(6,9,13,2,m);linea(6,8,12,2,cla);linea(3,8,7,12,osc);linea(2,13,4,11,PALO);}
  });
}
function dibujarArmadura(it){
  const a=it.armadura,m=ARM_MATS[a.mat].col,osc=sombra(m,.7),cla=sombra(m,1.2);
  return lienzo16(400+a.pieza*10+a.mat,({P,rect})=>{
    if(a.pieza===0){rect(3,4,12,6,m);rect(3,7,4,10,m);rect(11,7,12,10,m);rect(4,4,11,4,cla);rect(3,10,4,10,osc);rect(11,10,12,10,osc);}
    else if(a.pieza===1){rect(2,3,5,6,m);rect(10,3,13,6,m);rect(4,5,11,13,m);rect(6,3,9,4,[0,0,0]);for(let y=3;y<=4;y++)for(let x=6;x<=9;x++)P(x,y,null);
      rect(4,13,11,13,osc);rect(7,6,8,12,cla);}
    else if(a.pieza===2){rect(4,3,11,5,m);rect(4,6,6,13,m);rect(9,6,11,13,m);rect(4,3,11,3,cla);rect(4,13,6,13,osc);rect(9,13,11,13,osc);}
    else{rect(3,8,6,12,m);rect(9,8,12,12,m);rect(2,11,6,13,m);rect(9,11,13,13,m);rect(3,8,6,8,cla);rect(9,8,12,8,cla);}
  });
}
function polvo(P,rnd,col,col2){for(let i=0;i<34;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*5;P(8+Math.cos(a)*d*1.1,10+Math.sin(a)*d*.55-(5-d)*.4,rnd()<.3?col2:col);}}
function lingote(P,rect,c){rect(4,6,11,6,sombra(c,1.15));rect(3,7,12,9,c);rect(3,10,12,10,sombra(c,.7));}
function gema(P,c,c2){for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(Math.abs(x+.5-8)/6+Math.abs(y+.5-8)/6.5<=1)P(x,y,y<8?c:c2);P(6,5,[240,255,255]);P(7,4,[240,255,255]);}
function carne(elipse,linea,P,c,c2,hueso){elipse(8.5,8,6,4.2,c,14);linea(5,7,12,9,c2);if(hueso){P(2,10,[236,230,214]);P(1,11,[236,230,214]);P(2,12,[236,230,214]);}}
function muslo(elipse,linea,P,c){elipse(9,7,4.5,4,c,12);linea(5,10,3,13,[236,230,214]);P(2,13,[236,230,214]);P(3,14,[236,230,214]);}
function dibujarItem(id){
  const it=ITEMS[id];
  if(it.herr&&!it.iconoPropio)return dibujarHerramienta(it);
  if(it.armadura)return dibujarArmadura(it);
  return lienzo16(id*31,({P,linea,elipse,rect,rnd})=>{
    switch(id){
      case I.palo: linea(4,12,12,4,PALO); linea(4,11,11,4,[156,116,66]); break;
      case I.carbon: elipse(8,8.5,5.5,4.5,[44,44,50],18); for(let k=0;k<5;k++)P(5+rnd()*6,6+rnd()*5,[100,100,108]); break;
      case I.hierroBruto: elipse(8,8.5,5,4.5,[206,176,146],18); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[158,118,88]); break;
      case I.oroBruto: elipse(8,8.5,5,4.5,[240,200,60],18); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[190,140,30]); break;
      case I.cobreBruto: elipse(8,8.5,5,4.5,[216,130,80],18); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[110,190,150]); break;
      case I.lingoteHierro: lingote(P,rect,[210,210,212]); break;
      case I.lingoteOro: lingote(P,rect,[250,210,60]); break;
      case I.lingoteCobre: lingote(P,rect,[216,120,74]); break;
      case I.pepitaOro: elipse(8,9,2.6,2.2,[250,214,70],20); break;
      case I.diamante: gema(P,[150,248,242],[58,196,190]); break;
      case I.esmeralda: gema(P,[120,240,150],[30,160,80]); break;
      case I.lapis: gema(P,[80,120,240],[30,50,160]); break;
      case I.cuarzo: for(let k=0;k<3;k++)linea(5+k*3,12,6+k*3,4+k,[240,236,228]); linea(4,13,12,13,[200,190,180]); break;
      case I.redstone: polvo(P,rnd,[200,20,20],[255,80,80]); break;
      case I.polvora: polvo(P,rnd,[90,90,90],[140,140,140]); break;
      case I.harinaHueso: polvo(P,rnd,[236,236,230],[200,200,190]); break;
      case I.polvoLuminoso: polvo(P,rnd,[240,200,80],[255,240,160]); break;
      case I.polvoBlaze: polvo(P,rnd,[250,150,30],[255,220,80]); break;
      case I.pedernal: for(let y=3;y<=12;y++){const a=Math.floor(Math.abs(y-7)/2);for(let x=5+a;x<=10-a;x++)P(x,y,y<7?[80,80,86]:[50,50,56]);} break;
      case I.cuerda: for(let x=2;x<=13;x++)P(x,8+Math.round(Math.sin(x*.9)*2),[240,240,240]); break;
      case I.pluma: linea(3,13,12,3,[220,220,220]); for(let k=0;k<7;k++){P(6+k,8-k+1,[250,250,250]);P(5+k,8-k,[235,235,235]);} break;
      case I.hueso: linea(4,11,11,4,[236,230,214]); P(3,12,[236,230,214]);P(3,10,[236,230,214]);P(12,5,[236,230,214]);P(12,3,[236,230,214]); break;
      case I.flecha: linea(3,12,12,3,[140,110,70]); linea(11,2,13,4,[180,180,190]); P(13,2,[180,180,190]); linea(2,11,2,13,[240,240,240]); linea(2,13,4,13,[240,240,240]); break;
      case I.arco: for(let t=0;t<=20;t++){const a=-Math.PI/4+t/20*Math.PI;P(7+Math.cos(a+Math.PI/2)*-6+2,8-Math.sin(a+Math.PI/2)*6+ -1,[124,90,50]);} linea(3,3,12,12,[230,230,230]); break;
      case I.cubo: case I.cuboAgua: case I.cuboLava:
        for(let y=4;y<=13;y++){const a=Math.floor((y-4)/4);for(let x=3+a;x<=12-a;x++)P(x,y,[170,170,176]);} rect(3,4,12,4,[210,210,214]);
        if(id!==I.cubo)rect(4,5,11,6,id===I.cuboAgua?[50,90,220]:[240,120,20]); break;
      case I.mechero: elipse(6,7,3.5,3.5,[150,150,156],8); elipse(6,7,1.8,1.8,[0,0,0],0); for(let x=4;x<=8;x++)for(let y=5;y<=9;y++)if(Math.hypot(x-6,y-7)<1.8)P(x,y,null);
        rect(9,9,12,13,[70,70,76]); break;
      case I.varaBlaze: linea(4,12,12,4,[250,190,40]); linea(5,12,12,5,[220,120,20]); break;
      case I.perlaEnder: elipse(8,8,5,5,[20,90,80],14); P(6,6,[120,220,200]); P(7,6,[80,180,160]); break;
      case I.ojoEnder: elipse(8,8,5,5,[40,120,60],14); elipse(8,8,2.2,3,[20,40,20],4); P(6,6,[160,230,140]); break;
      case I.lagrimaGhast: for(let y=3;y<=13;y++){const w=y<8?(y-3)*.6:4-(y-8)*.5;for(let x=Math.round(8-w);x<=Math.round(8+w);x++)P(x,y,[200,236,250]);} P(7,9,[255,255,255]); break;
      case I.semillas: for(let k=0;k<7;k++)P(4+rnd()*8,6+rnd()*6,[70+rnd()*40,150,50]); break;
      case I.trigo: for(let k=0;k<4;k++){linea(4+k*2,14,6+k*2,3,[200,170,60]);P(6+k*2,3,[230,200,90]);} break;
      case I.pan: elipse(8,9,6,3.5,[190,130,60],12); linea(4,8,12,8,[220,170,90]); break;
      case I.manzana: case I.manzanaDorada: {const c=id===I.manzana?[214,36,36]:[250,210,60];
        elipse(8,9.5,5,4.8,c,20); P(6,7,[255,240,200]); linea(8,2,8,5,[100,70,30]); P(9,3,[60,160,40]);P(10,3,[60,160,40]);P(10,2,[60,160,40]); break;}
      case I.cerdoCrudo: carne(elipse,linea,P,[236,140,140],[250,190,180],false); break;
      case I.cerdoAsado: carne(elipse,linea,P,[170,100,60],[210,150,90],false); break;
      case I.resCruda: carne(elipse,linea,P,[200,50,50],[240,160,150],true); break;
      case I.filete: carne(elipse,linea,P,[120,70,40],[170,110,60],true); break;
      case I.corderoCrudo: carne(elipse,linea,P,[210,80,80],[245,190,180],true); break;
      case I.corderoAsado: carne(elipse,linea,P,[140,80,50],[190,130,80],true); break;
      case I.polloCrudo: muslo(elipse,linea,P,[240,200,180]); break;
      case I.polloAsado: muslo(elipse,linea,P,[190,120,60]); break;
      case I.carnePodrida: elipse(8.5,8,6,4.2,[126,116,66],18); for(let k=0;k<6;k++)P(4+rnd()*9,6+rnd()*4,[84,100,44]); break;
      case I.ojoArana: elipse(8,8,4.5,4.5,[150,30,40],10); elipse(8,8,1.5,1.5,[40,0,0],0); break;
      case I.cuero: rect(4,4,11,12,[150,94,56]); rect(3,6,3,10,[150,94,56]); rect(12,6,12,10,[150,94,56]); rect(5,5,10,5,[180,120,70]); break;
      case I.papel: for(let y=3;y<=12;y++)for(let x=4+(y%3===0?1:0);x<=12;x++)P(x,y,[240,240,236]); break;
      case I.libro: rect(4,3,11,12,[110,60,30]); rect(11,4,12,12,[240,240,236]); rect(5,4,6,11,[140,80,40]); break;
      case 500: case 501: case 502: case 503: case 504: case 505: case 506: case 507: case 510: case 511: case 512: case 513: case 514:{
        const it=ITEMS[id], col=it.pocion?[(it.pocion.color>>16)&255,(it.pocion.color>>8)&255,it.pocion.color&255]:id===501?[60,100,230]:id===502?[80,110,220]:null;
        rect(7,2,8,4,[200,220,230]); rect(6,1,9,1,[140,100,60]);
        for(let y=5;y<=13;y++){const w=y<7?2:y<12?4:3;for(let x=8-w;x<8+w;x++)P(x,y,col&&y>6?col:[210,230,240]);}
        if(it.pocion&&it.pocion.arrojadiza){P(5,6,[230,230,230]);P(10,6,[230,230,230]);}P(6,8,[255,255,255]);break;}
      case 515: for(let k=0;k<4;k++)elipse(5+k*2,9+(k%2)*2,1.8,1.8,[170,30,30],10); break;
      case 516: polvo(P,rnd,[248,248,248],[220,220,230]); break;
      case 517: for(let y=4;y<=12;y++){const w=Math.floor((y-3)*.8);for(let x=8-w;x<=7+w;x++)P(x,y,y>=11?[240,200,60]:y>=10?[255,240,150]:[230,120,60]);} P(7,7,[255,230,90]); break;
      case 518: elipse(8,9,4.5,3.5,[230,120,30],12); P(7,8,[255,220,80]); P(9,10,[255,200,60]); break;
      case 519: elipse(8,9,4.5,4.5,[140,90,150],14); P(6,7,[200,160,210]); break;
      case 526: elipse(8,9,4.5,4.5,[190,140,190],10); P(6,7,[230,200,235]); break;
      case 525: elipse(8,8.5,4.5,4,[110,200,90],10); P(6,7,[180,255,160]); break;
      case 520: rect(2,7,13,12,[110,110,116]); rect(3,8,12,11,[60,60,64]); P(4,13,[40,40,40]);P(11,13,[40,40,40]); break;
      case 521: for(let y=8;y<=12;y++){const w=y<12?6:5;for(let x=8-w;x<8+w;x++)P(x,y,y===8?[190,150,90]:[150,110,60]);} break;
      case 522: for(let y=2;y<=14;y++){const w=Math.floor((y-1)*.5);P(7-w,y,[150,150,170]);P(8+w,y,[150,150,170]);for(let x=7-w+1;x<8+w;x++)if(x<7||x>8)P(x,y,[120,120,145]);} break;
      case 523: linea(7,14,7,4,[180,40,40]); rect(6,4,8,8,[200,50,50]); P(7,3,[240,240,240]); linea(7,14,7,15,[120,90,50]); break;
      case I.ladrillo: for(let y=6;y<=10;y++)for(let x=3;x<=12;x++)P(x,y,y===6?[200,110,90]:y===10?[120,50,40]:[170,76,58]); break;
      case I.bolaArcilla: elipse(8,8.5,4.5,4,[160,168,182],12); break;
      case I.cuenco: for(let y=7;y<=11;y++){const w=6-Math.floor((y-7)*1.2);for(let x=8-w;x<=7+w;x++)P(x,y,y===7?[150,110,70]:[124,90,52]);} break;
      case I.estofado: for(let y=7;y<=11;y++){const w=6-Math.floor((y-7)*1.2);for(let x=8-w;x<=7+w;x++)P(x,y,y===7?[190,140,90]:[124,90,52]);} rect(4,6,11,7,[170,120,80]); P(6,6,[210,40,40]); P(9,6,[160,120,80]); break;
      case I.rodajaSandia: for(let y=4;y<=12;y++){const w=Math.floor((y-3)*.8);for(let x=8-w;x<=7+w;x++)P(x,y,y>=11?[70,150,50]:y>=10?[230,240,200]:[220,50,60]);} P(7,7,[20,20,20]);P(9,8,[20,20,20]);P(6,9,[20,20,20]); break;
      case 528: linea(3,13,9,7,[140,100,60]); linea(4,13,9,8,[110,78,44]); rect(9,4,12,7,[200,120,70]); for(let x=8;x<=13;x++)linea(x,1,x+1,4,[240,236,220]); break;
      case 529: case 530: case 531: case 532:{const c=[[170,90,60],[180,100,64],[160,84,56],[176,96,62]][id-529];
        for(let y=3;y<=12;y++)for(let x=3+(y%4===0?1:0);x<=12-(y===3?2:0);x++)P(x,y,c);
        const d=[[50,30,20]]; if(id===529){linea(5,6,10,6,d[0]);linea(6,9,9,9,d[0]);linea(7,5,7,10,d[0]);}
        else if(id===530){elipse(8,8,2.5,2.5,d[0],0);P(8,8,c);}else if(id===531){linea(5,10,8,5,d[0]);linea(8,5,11,10,d[0]);linea(5,10,11,10,d[0]);}
        else{elipse(6,7,1,1,d[0],0);elipse(10,7,1,1,d[0],0);linea(5,10,11,10,d[0]);} break;}
      case 533: rect(3,2,12,13,[50,60,70]); rect(4,3,11,12,[80,88,96]); rect(6,5,9,10,[110,70,60]); P(7,6,[220,120,80]); break;
      case 534: elipse(8,9,5,4,[92,70,64],16); for(let k=0;k<6;k++)P(5+rnd()*6,6+rnd()*5,[140,110,96]); break;
      case 535: lingote(P,rect,[82,74,80]); break;
      case 536: for(let y=3;y<=13;y++){const w=Math.round(3-Math.abs(y-8)*.5);for(let x=8-w;x<=8+w;x++)P(x,y,[20,60+y*6,80+y*6]);} P(8,6,[140,250,255]); break;
      case 542: elipse(8,10,5.5,4.5,[150,94,56],12); rect(6,3,10,5,[170,110,66]); linea(6,5,10,5,[230,220,200]); P(8,4,[120,70,40]); break;
      case 543: elipse(8,9,4.5,4,[236,120,30],14); P(6,7,[255,200,120]); P(10,11,[190,80,20]); break;
      case 544: for(let y=6;y<=10;y++)for(let x=3;x<=12;x++)P(x,y,y===6?[240,150,70]:y===10?[150,70,20]:[214,110,36]); break;
      case 545: rect(3,5,12,10,[150,94,56]); rect(4,6,11,9,[120,70,40]); rect(6,4,9,5,[180,200,220]); rect(2,7,3,8,[200,200,210]); rect(12,7,13,8,[200,200,210]); break;
      case 538: elipse(8,8,5,5,[190,230,240],10); elipse(8,8,3,3,[120,190,220],8); linea(5,8,11,8,[240,255,255]); P(8,5,[240,255,255]); break;
      case 539: linea(4,12,12,4,[210,240,250]); linea(5,12,12,5,[140,190,220]); break;
      case 540: linea(3,13,10,6,[120,90,60]); linea(4,13,10,7,[90,64,40]); rect(9,2,14,7,[110,112,122]); rect(10,3,13,6,[150,154,166]); P(14,2,[200,204,214]); break;
      case 541: elipse(5,6,3,3,[230,160,70],8); for(let x=7;x<=13;x++)P(x,9,[230,160,70]); P(12,10,[230,160,70]); P(10,10,[230,160,70]); P(5,6,[60,40,20]); break;
      default: elipse(8,8,4,4,[200,0,200],0);
    }
  });
}
const LIENZOS=[], ICONOS=[];
ITEMS.forEach((it,id)=>{
  if(!it)return;
  const bq=BLOQUES[id];
  if(it.bloque){const f=FORMA[id];
    if(bq.texCaras)LIENZOS[id]=iconoCubo(bq.texCaras[3],bq.texCaras[1]);
    else if(f===0||f===1)LIENZOS[id]=iconoCubo(bq.arriba,bq.lado,f===1?bq.altura:1);
    else if(f===6&&!bq.trepable&&id!==B.nenufar){const alto=Math.max(...bq.cajas.map(c=>c[4]));LIENZOS[id]=iconoCubo(bq.arriba,bq.lado,alto);}
    else if(id===B.valla)LIENZOS[id]=lienzo16(id,({rect})=>{rect(3,2,5,15,[168,133,84]);rect(10,2,12,15,[168,133,84]);rect(5,5,10,6,[150,118,72]);rect(5,10,10,11,[150,118,72]);});
    else LIENZOS[id]=lienzoTile(bq.lado);}
  else if(it.coloca==='puerta'){const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');
    x.drawImage(atlasIconos,(T.doorTop%ATW)*TS,Math.floor(T.doorTop/ATW)*TS,TS,TS,4,0,8,8);x.drawImage(atlasIconos,(T.doorBottom%ATW)*TS,Math.floor(T.doorBottom/ATW)*TS,TS,TS,4,8,8,8);LIENZOS[id]=c;}
  else LIENZOS[id]=dibujarItem(id);
  ICONOS[id]=LIENZOS[id].toDataURL();
});
function iconoEstado(plantilla,colores){
  const c=document.createElement('canvas');c.width=c.height=9;const x=c.getContext('2d');
  plantilla.forEach((fila,y)=>[...fila].forEach((ch,i)=>{const col=colores(ch,i);if(col){x.fillStyle=col;x.fillRect(i,y,1,1);}}));
  return c.toDataURL();
}
const P_CORAZON=['.kk...kk.','krrk.krrk','krwrkrrrk','krrrrrrrk','krrrrrrrk','.krrrrrk.','..krrrk..','...krk...','....k....'];
const P_COMIDA=['....kkk..','...kbbbk.','..kbbbbbk','..kbbbbbk','..kbbbbk.','.kkkkkk..','kwk......','kwk......','.k.......'];
const P_ARMADURA=['kk.....kk','kbbk.kbbk','kbbbkbbbk','.kbbbbbk.','.kbbbbbk.','.kbwbbbk.','.kbbbbbk.','.kbbbbbk.','..kkkkk..'];
const P_BURBUJA=['.........','..kkkk...','.kwwbbk..','.kwbbbk..','.kbbbbk..','.kbbbbk..','..kkkk...','.........','.........'];
function tresIconos(p,lleno,brillo){
  const vacio='#3a3434';
  const f=(modo)=>iconoEstado(p,(ch,i)=>{if(ch==='.')return null;if(ch==='k')return '#141010';
    const on=modo==='lleno'||(modo==='medio'&&i<=4);return on?(ch==='w'?brillo:lleno):vacio;});
  return {lleno:f('lleno'),medio:f('medio'),vacio:f('vacio')};
}
const IC_VIDA=tresIconos(P_CORAZON,'#e0202c','#ffc8c8'), IC_VENENO=tresIconos(P_CORAZON,'#8a9a2a','#d8e8a0'),
  IC_COMIDA=tresIconos(P_COMIDA,'#b8703a','#f0f0e8'), IC_HAMBRE=tresIconos(P_COMIDA,'#6a8a3a','#d0e0a0'),
  IC_ARMADURA=tresIconos(P_ARMADURA,'#c8c8d0','#ffffff'),
  IC_BURBUJA=iconoEstado(P_BURBUJA,ch=>ch==='.'?null:ch==='k'?'#1c3a6a':ch==='w'?'#ffffff':'#6ab0ff');
