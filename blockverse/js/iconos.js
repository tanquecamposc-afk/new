"use strict";
/* =========================================================
   Iconos de todos los objetos
   ========================================================= */
const PALO=[124,90,50];
const sombra=(c,f)=>c.map(v=>v*f);
// Dibuja una plantilla de 16 filas: cada letra es un color; con espejo se completa la mitad derecha
function plantilla(P,filas,cols,espejo){
  filas.forEach((f,y)=>{for(let x=0;x<f.length;x++){const c=cols[f[x]];if(!c)continue;P(x,y,c);if(espejo)P(15-x,y,cols[f[x]==='l'?'m':f[x]]||c);}});
}
const PALO_OSC=[84,60,32];
const PL_ESPADA=[
"................",
"............llm.",
"...........lmmd.",
"..........lmmd..",
".........lmmd...",
"........lmmd....",
".......lmmd.....",
"..g...lmmd......",
"..gg.lmmd.......",
"...ggmmd........",
"....ggd.........",
"...hHgg.........",
"..hH..gg........",
".hH.............",
"pp..............",
"pp.............."];
const PL_PICO=[
"................",
"....dmmmmmd.....",
"..dmllllllmmd...",
".dml.....hHdmd..",
".md.....hH...md.",
".d.....hH.....d.",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"hH..............",
"................",
"................",
"................"];
const PL_HACHA=[
"................",
".....dmmmd......",
"....dmlllmd.....",
"...dmlllllmd....",
"...mllllmhHd....",
"...mlllmhHmd....",
"...dmlmhHmd.....",
"....dmhHdd......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"hH..............",
"................"];
const PL_PALA=[
"................",
"..........dmmd..",
".........dmllmd.",
".........mllmmd.",
"..........mmmd..",
".........hHdd...",
"........hH......",
".......hH.......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"................",
"................"];
const PL_AZADA=[
"................",
"......dmmmd.....",
".....dmllmmhH...",
"......dd..hH....",
"..........hH....",
".........hH.....",
"........hH......",
".......hH.......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"................",
"................"];
const PL_LANZA=[
"................",
"............dml.",
"...........dmlm.",
"..........dmlmd.",
"...........hmd..",
"..........hH....",
".........hH.....",
"........hH......",
".......hH.......",
"......hH........",
".....hH.........",
"....hH..........",
"...hH...........",
"..hH............",
".hH.............",
"................"];
function dibujarHerramienta(it){
  const h=it.herr,m=MATS[h.mat].col,osc=sombra(m,.66),cla=sombra(m,1.22);
  const pl={espada:PL_ESPADA,pico:PL_PICO,hacha:PL_HACHA,pala:PL_PALA,azada:PL_AZADA,lanza:PL_LANZA}[h.tipo]||PL_ESPADA;
  const guarda=h.mat===0?[104,74,40]:sombra(m,.55);
  return lienzo16(it.clave.length*97+h.mat,({P})=>plantilla(P,pl,{m,l:cla,d:osc,h:PALO,H:PALO_OSC,g:guarda,p:sombra(m,.8)}));
}
const PL_ARM=[
 ["","","....dmmm","...dmlll","..dmlmmm","..mlmmmm","..mld...","..mld...","..mm....","..dd....","","","","","",""],
 ["","",".dmmd...",".mlmmd..",".mlmmmmm",".dlmllmm","..dmlmmm","...mlmmm","...mlmmm","...mlmmm","...mlmmm","...dmmmm","...ddddd","","",""],
 ["","","...dmmmm","...mllll","...mlmmm","...mlmd.","...mlm..","...mlm..","...mlm..","...mlm..","...mlm..","...mlm..","...ddd..","","",""],
 ["","","","","","","..dmmd..","..mllm..","..mlmm..","..mlmm..",".dmlmm..",".mllmmd.",".mlmmmd.",".dddddd.","",""]];
function dibujarArmadura(it){
  const a=it.armadura,m=ARM_MATS[a.mat].col,osc=sombra(m,.7),cla=sombra(m,1.22);
  return lienzo16(400+a.pieza*10+a.mat,({P})=>plantilla(P,PL_ARM[a.pieza],{m,l:cla,d:osc},true));
}
const PL_POCION=["","......gg","......gw","......gw",".....gLL","....gLLL","...gLwLL","..gLwLLL","..gLLLLL","..gLLLLL","..gLLLLL","...gLLLL","....gggg","","",""];
const PL_POCION_ARROJ=["","......gg","......gw",".....gww","....gLLL","...gLLLL","..gLwLLL",".gLwLLLL",".gLLLLLL",".gLLLLLL","..gLLLLL","...ggggg","","","",""];
// Ballesta: culata, arco de madera y cuerda; cargada lleva la flecha puesta
function dibujarBallesta(P,linea,cargada){
  linea(3,13,11,5,[104,74,40]); linea(4,13,11,6,[80,56,30]);
  linea(5,4,13,12,[120,86,50]); linea(6,4,13,11,[150,110,64]); P(5,4,[90,90,96]); P(13,12,[90,90,96]);
  if(cargada){linea(6,6,11,11,[222,222,222]); linea(4,12,11,5,[140,104,62]); P(11,4,[200,200,210]); P(12,4,[170,170,180]); P(11,3,[170,170,180]);}
  else{linea(7,5,12,10,[222,222,222]);}
  P(3,13,[90,90,96]); P(2,14,[90,90,96]);
}
// Arco con la cuerda tensada según la fase (0 en reposo, 1-3 cargando con la flecha)
function dibujarArco(fase){
  return lienzo16(225+fase*7,({P,linea})=>{
    const S1=[3,2],S2=[13,12],C=[15-fase*.4,0+fase*.3];
    const q=(t)=>[(1-t)*(1-t)*S1[0]+2*(1-t)*t*C[0]+t*t*S2[0],(1-t)*(1-t)*S1[1]+2*(1-t)*t*C[1]+t*t*S2[1]];
    const tir=[8-fase*1.3,7+fase*1.3];
    linea(S1[0],S1[1],Math.round(tir[0]),Math.round(tir[1]),[222,222,222]); linea(Math.round(tir[0]),Math.round(tir[1]),S2[0],S2[1],[222,222,222]);
    if(fase>0){const [x0,y0]=tir.map(Math.round);linea(x0,y0,x0+7,y0-7,[150,112,68]);P(x0+7,y0-7,[190,190,200]);P(x0+8,y0-8,[220,220,230]);P(x0+7,y0-8,[160,160,170]);P(x0+8,y0-7,[160,160,170]);
      P(x0,y0,[240,240,240]);P(x0-1,y0,[240,240,240]);P(x0,y0+1,[240,240,240]);}
    for(let k=0;k<=24;k++){const t=k/24,[x,y]=q(t);P(x,y,t>.4&&t<.6?[90,62,34]:[140,98,54]);const [x2,y2]=q(Math.min(1,t+.02));P(x2+1,y2,[112,78,42]);}
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
  if(it.armadura&&!it.elitros)return dibujarArmadura(it);
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
        const it=ITEMS[id], col=it.pocion?[(it.pocion.color>>16)&255,(it.pocion.color>>8)&255,it.pocion.color&255]:id===501||id===502?[56,92,220]:[196,214,232];
        plantilla(P,it.pocion&&it.pocion.arrojadiza?PL_POCION_ARROJ:PL_POCION,{g:[212,224,240],w:[250,252,255],L:col},true);
        if(id===500)for(let y=4;y<=11;y++)for(let x=4;x<=11;x++)if((x+y)%5===0)P(x,y,[236,244,252]);
        break;}
      case 515: for(let k=0;k<4;k++)elipse(5+k*2,9+(k%2)*2,1.8,1.8,[170,30,30],10); break;
      case 516: polvo(P,rnd,[248,248,248],[220,220,230]); break;
      case 517: for(let y=4;y<=12;y++){const w=Math.floor((y-3)*.8);for(let x=8-w;x<=7+w;x++)P(x,y,y>=11?[240,200,60]:y>=10?[255,240,150]:[230,120,60]);} P(7,7,[255,230,90]); break;
      case 518: elipse(8,9,4.5,3.5,[230,120,30],12); P(7,8,[255,220,80]); P(9,10,[255,200,60]); break;
      case 519: elipse(8,9,4.5,4.5,[140,90,150],14); P(6,7,[200,160,210]); break;
      case 526: elipse(8,9,4.5,4.5,[190,140,190],10); P(6,7,[230,200,235]); break;
      case 525: elipse(8,8.5,4.5,4,[110,200,90],10); P(6,7,[180,255,160]); break;
      case 520: rect(2,7,13,12,[110,110,116]); rect(3,8,12,11,[60,60,64]); P(4,13,[40,40,40]);P(11,13,[40,40,40]); break;
      case 521: for(let y=8;y<=12;y++){const w=y<12?6:5;for(let x=8-w;x<8+w;x++)P(x,y,y===8?[190,150,90]:[150,110,60]);} break;
      case 522: // élitros: dos alas membranosas grises con nervios
        for(const s of [-1,1])for(let y=1;y<=14;y++){const ancho=Math.round(1+Math.min(y,9)*.55-(y>11?(y-11)*.9:0));
          for(let k=0;k<ancho;k++){const x=s<0?6-k:9+k;const nervio=k===Math.floor(ancho*.5)||y%4===0;P(x,y,nervio?[112,112,140]:k===ancho-1?[190,192,210]:[152,154,178]);}}
        linea(7,1,7,6,[90,90,110]); linea(8,1,8,6,[90,90,110]); break;
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
      case 540: // maza: mango de vara de breeze y cabeza pesada con pinchos
        linea(2,14,8,8,[120,170,210]); linea(3,14,8,9,[80,120,160]); P(2,13,[60,60,70]);P(3,13,[60,60,70]);
        rect(8,3,13,8,[70,72,80]); rect(9,4,12,7,[110,114,124]); rect(9,4,10,5,[160,164,176]);
        for(const [x,y] of [[7,5],[11,2],[14,5],[11,9],[7,3],[14,8],[7,8],[14,2]])P(x,y,[190,194,204]); P(10,5,[120,200,230]); break;
      case 547: for(let k=0;k<3;k++){const x=4+k*3,y=5+(k%2)*3;for(let q=0;q<3;q++)P(x+q,y+2-q,[110,190,170]);P(x,y+2,[70,140,130]);} break;
      case 548: for(const [x,y] of [[5,6],[8,4],[10,8],[6,10],[9,11]]){P(x,y,[220,240,230]);P(x+1,y,[180,230,220]);P(x,y+1,[160,220,210]);} break;
      case 549: for(let y=4;y<=12;y++){const w=Math.round(5-Math.abs(y-8)*.4);for(let x=8-w;x<=8+w;x++)P(x,y,y<8?[160,100,160]:[130,80,130]);} linea(3,8,13,8,[90,50,90]); break;
      case 597: for(let y=2;y<=14;y++){const w=y<11?5:Math.max(1,5-(y-10)*1.4|0);for(let x=8-w;x<=8+w-1;x++){const borde=x===8-w||x===8+w-1||y===2||y===14;
          P(x,y,borde?[150,156,162]:(x===7||x===8)?[176,182,188]:((x+y)%4===0?[120,84,48]:[140,98,56]));}} P(7,6,[210,214,220]);P(8,6,[210,214,220]); break;
      case 598: for(let x=3;x<=12;x++)for(let y=6;y<=9;y++)P(x,y,y===6?[128,78,40]:[104,62,30]); for(let y=4;y<=6;y++){P(4,y,[92,54,26]);P(5,y,[92,54,26]);}
        for(let y=10;y<=13;y++){P(6,y,[70,44,22]);P(10,y,[70,44,22]);} P(6,14,[170,170,178]);P(10,14,[170,170,178]); break;
      case 607: case 608: case 609: case 610:{const c=ITEMS[id].bardaCaballo.col,o=sombra(c,.7);
        rect(3,5,12,9,c); rect(2,6,2,8,o); rect(4,10,5,13,o); rect(10,10,11,13,o); rect(11,3,13,6,c); rect(12,2,13,2,o); rect(4,5,12,5,sombra(c,1.15)); break;}
      case 611: dibujarBallesta(P,linea,false); break;
      case 612: // tridente: tres puntas de prismarina y mango largo
        linea(2,14,11,5,[70,110,100]); linea(3,14,11,6,[50,84,76]);
        linea(10,2,13,5,[120,200,180]); linea(11,6,14,9,[120,200,180]); linea(9,3,12,6,[150,226,206]); P(13,1,[180,240,224]); P(14,2,[150,226,206]);
        P(9,1,[120,200,180]); P(15,7,[120,200,180]); P(10,2,[180,240,224]); P(14,8,[180,240,224]); break;
      case 613: linea(2,14,12,2,[118,82,44]); linea(3,14,12,3,[90,62,32]); linea(13,2,13,12,[220,220,220]); P(13,13,[160,160,170]); P(12,13,[160,160,170]); P(12,12,[200,40,40]); break;
      case 614: case 615:{const c=id===614?[170,140,100]:[150,110,70]; for(let x=3;x<=11;x++){const w=Math.round(2.4*Math.sin((x-2)/10*Math.PI));for(let y=8-w;y<=8+w;y++)P(x,y,y<8?sombra(c,1.15):c);}
        for(const [x,y] of [[12,6],[13,5],[12,10],[13,11],[12,8]])P(x,y,sombra(c,.8)); P(5,7,[30,30,30]); break;}
      case 616: case 617:{const c=id===616?[190,80,70]:[160,90,60]; for(let x=3;x<=11;x++){const w=Math.round(2.6*Math.sin((x-2)/10*Math.PI));for(let y=8-w;y<=8+w;y++)P(x,y,y<8?[90,110,120]:c);}
        for(const [x,y] of [[12,6],[13,5],[12,10],[13,11],[12,8]])P(x,y,[80,90,100]); P(5,7,[20,20,20]); break;}
      case 618: for(let x=4;x<=11;x++){const w=Math.round(3*Math.sin((x-3)/9*Math.PI));for(let y=8-w;y<=8+w;y++)P(x,y,(x+y)%4<2?[240,120,40]:[250,240,230]);} P(12,6,[240,120,40]);P(12,10,[240,120,40]);P(6,7,[20,20,20]); break;
      case 619: elipse(8,8.5,4.5,4.5,[220,200,80],10); for(const [x,y] of [[3,5],[13,5],[3,12],[13,12],[8,3],[8,14],[2,8],[14,8]])P(x,y,[230,230,200]); P(6,7,[20,20,20]);P(10,7,[20,20,20]); break;
      case 620: case 621:{const c=id===620?[222,150,140]:[190,120,80]; elipse(8,9,5,3.5,c,10); rect(4,6,6,8,sombra(c,1.1)); rect(11,10,13,12,sombra(c,.8)); P(6,12,[240,236,226]);P(7,13,[240,236,226]); break;}
      case 622: rect(6,3,9,10,[200,160,110]); rect(5,10,10,13,[220,190,150]); P(5,13,[120,90,60]);P(7,13,[120,90,60]);P(9,13,[120,90,60]); rect(7,4,8,8,[230,200,160]); break;
      case 623: rect(3,4,12,11,[180,130,90]); rect(4,5,11,10,[200,150,108]); P(12,11,[150,104,70]); rect(5,6,7,7,[220,176,130]); break;
      case 624: elipse(8,9,4.5,4.5,[30,28,40],10); rect(7,3,9,5,[60,56,72]); P(6,7,[90,90,110]); P(10,12,[20,20,26]); break;
      case 625: linea(4,12,11,4,[200,190,170]); linea(5,12,12,4,[170,160,140]); linea(4,13,6,11,[120,110,96]); P(12,3,[230,224,210]); P(11,4,[230,224,210]); break;
      case 541: elipse(5,6,3,3,[230,160,70],8); for(let x=7;x<=13;x++)P(x,9,[230,160,70]); P(12,10,[230,160,70]); P(10,10,[230,160,70]); P(5,6,[60,40,20]); break;
      default:
        if(it.tinte!==undefined){const c=COLORES16[it.tinte][3];elipse(8,9,4.5,4,c,16);P(6,7,c.map(v=>Math.min(255,v+60)));linea(6,4,9,4,[200,200,200]);P(10,5,[200,200,200]);}
        else if(it.huevo){const [a,b2]=HUEVOS[it.huevo].map(h=>[(h>>16)&255,(h>>8)&255,h&255]);
          for(let y=2;y<=14;y++){const w=Math.round(Math.sqrt(Math.max(0,1-((y-9)/7)**2))*5*(y<9?.85:1));for(let x=8-w;x<8+w;x++)P(x,y,a);}
          for(const [x,y] of [[6,6],[9,8],[7,11],[10,12],[5,9]])P(x,y,b2),P(x+1,y,b2);}
        else if(id===546){rect(3,3,11,13,[90,40,110]);rect(11,4,12,13,[240,236,220]);rect(4,4,5,12,[120,60,150]);P(7,6,[220,160,255]);P(9,9,[220,160,255]);P(6,11,[220,160,255]);}
        else elipse(8,8,4,4,[200,0,200],0);
    }
  });
}
const LIENZOS=[], ICONOS=[];
// Fotogramas del arco tensándose (se usan en la mano)
const ARCO_FASES=[1,2,3].map(dibujarArco);
const ICONO_BALLESTA_CARGADA=lienzo16(6111,({P,linea})=>dibujarBallesta(P,linea,true));
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
  else if(id===I.arco)LIENZOS[id]=dibujarArco(0);
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
