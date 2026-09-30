"use strict";
/* =========================================================
   Atlas de texturas procedurales: baldosas de 16x16 en una
   rejilla de 16 columnas. Los píxeles con alfa 250 se tiñen
   con el color del bioma (césped, hojas); el shader lo usa.
   ========================================================= */
const TS=16, ATW=16, TINTE_A=250;
const T={};
const _genTiles=[];
function tile(nombre,gen){T[nombre]=_genTiles.length;_genTiles.push(gen);}

(function definirBaldosas(){
  const n=(r,v)=>(r()-.5)*v;
  const cada=f=>{for(let y=0;y<TS;y++)for(let x=0;x<TS;x++)f(x,y);};
  // Ruido de valor periódico (se repite cada 16 píxeles, sin costuras)
  const pn=(x,y,celdas,s)=>{const f=16/celdas,gx=x/f,gy=y/f,x0=Math.floor(gx),y0=Math.floor(gy),fx=smooth(gx-x0),fy=smooth(gy-y0),m=v=>((v%celdas)+celdas)%celdas;
    const a=hash2(m(x0),m(y0),s),b=hash2(m(x0+1),m(y0),s),c=hash2(m(x0),m(y0+1),s),d=hash2(m(x0+1),m(y0+1),s);
    const ab=a+(b-a)*fx;return ab+((c+(d-c)*fx)-ab)*fy;};
  const semi={v:1};
  const S=()=>semi.v++*97;
  // ---- materiales base ----
  const piedra=(p,r,s=S())=>cada((x,y)=>{const b=pn(x,y,4,s)*22+pn(x,y,8,s+1)*14;let k=n(r,10)+b-18;
    if(pn(x,y,8,s+2)>.78)k-=16;p(x,y,128+k,128+k,130+k);});
  const tierra=(p,r,s=S())=>cada((x,y)=>{const b=pn(x,y,8,s)*20;let k=n(r,16)+b-10;if(r()<.07)k-=22;if(r()<.04)k+=18;
    p(x,y,134+k,95+k*.9,66+k*.8);});
  const pizarra=(p,r,s=S())=>cada((x,y)=>{const b=pn(x,y,4,s)*14;let k=n(r,10)+b;if((x*3+Math.floor(y/2)*5)%11===0)k-=14;
    if(y%5===0&&r()<.4)k-=8;p(x,y,70+k,70+k,78+k);});
  const netherrack=(p,r,s=S())=>cada((x,y)=>{const b=pn(x,y,8,s)*30;let k=n(r,24)+b-15;if(r()<.1)k-=25;
    p(x,y,114+k,44+k*.5,42+k*.45);});
  // Mineral: grupos de píxeles con borde oscuro y brillo
  // Mineral al estilo del original: vetas de formas irregulares con borde oscuro abajo a la derecha,
  // canto iluminado arriba a la izquierda y algún destello
  const FORMAS_MENA=[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1],[1,2]],
    [[0,0],[1,0],[1,1],[2,1],[2,2]],[[0,0],[0,1],[1,1],[1,2],[2,1]],[[0,0],[1,0],[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,0],[1,1],[2,0],[2,1]]];
  const mena=(base,col,osc,brillo)=>(p,r)=>{base(p,r);
    const usados=[], nv=5+Math.floor(r()*2);
    for(let k=0;k<nv;k++){
      let cx=0,cy=0,t=0;
      do{cx=1+Math.floor(r()*12);cy=1+Math.floor(r()*12);t++;}while(t<30&&usados.some(([a,b])=>Math.abs(a-cx)<4&&Math.abs(b-cy)<4));
      usados.push([cx,cy]);
      const f=FORMAS_MENA[Math.floor(r()*FORMAS_MENA.length)], en=new Set(f.map(([a,b])=>(cx+a)+','+(cy+b)));
      const esta=(x,y)=>en.has(x+','+y);
      for(const [a,b] of f){const x=cx+a,y=cy+b;
        for(const [dx,dy] of [[1,0],[0,1],[1,1]])if(!esta(x+dx,y+dy))p(x+dx,y+dy,osc[0]*.85,osc[1]*.85,osc[2]*.85);}
      const chispa=Math.floor(r()*f.length);
      f.forEach(([a,b],i)=>{const x=cx+a,y=cy+b, k2=n(r,16), canto=!esta(x,y-1)||!esta(x-1,y);
        if(i===chispa)p(x,y,...brillo);
        else if(canto)p(x,y,(col[0]+brillo[0])/2+k2,(col[1]+brillo[1])/2+k2,(col[2]+brillo[2])/2+k2);
        else p(x,y,col[0]+k2,col[1]+k2,col[2]+k2);});
    }};
  const tablones=(p,r,col=[168,133,84],s=S())=>cada((x,y)=>{
    const tabla=Math.floor(y/4), off=(tabla*5)%16;
    let k=n(r,8)+(pn(x+off,tabla*4,4,s+tabla)-.5)*22;
    if(y%4===3)k-=34; if(y%4===0)k+=6;
    if(((x+off)%16)===15)k-=26;
    if(((x*7+tabla*3)%13)===0&&y%4===1)k-=10;
    p(x,y,col[0]+k,col[1]+k*.9,col[2]+k*.8);});
  const corteza=(col,oscuro,rayas)=>(p,r,s=S())=>cada((x,y)=>{
    const surco=pn(x*2,y*.5,8,s)>.62||x%4===0&&pn(x,y,8,s+1)>.4;
    let k=n(r,12)+(pn(x,y,8,s+2)-.5)*16;
    if(rayas){const raya=(y%5===Math.floor(pn(x,0,4,s+3)*5))&&r()<.7;if(raya)return p(x,y,40+k,40+k,40+k);}
    if(surco)p(x,y,oscuro[0]+k,oscuro[1]+k,oscuro[2]+k);else p(x,y,col[0]+k,col[1]+k,col[2]+k);});
  const anillos=(corte,borde)=>(p,r)=>cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5);const e=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));const k=n(r,10);
    if(e>6.6)return p(x,y,borde[0]+k,borde[1]+k,borde[2]+k);
    const anillo=Math.floor(d*1.1)%2;const f=anillo?.86:1;p(x,y,corte[0]*f+k,corte[1]*f+k,corte[2]*f+k);});
  const ladrillos=(p,r,col,mortero,alto=4,ancho=8)=>cada((x,y)=>{const fila=Math.floor(y/alto),off=(fila%2)*(ancho/2);const k=n(r,14)+(hash2(Math.floor((x+off)/ancho),fila,7)-.5)*24;
    if(y%alto===alto-1||(x+off)%ancho===ancho-1)p(x,y,mortero[0]+k*.3,mortero[1]+k*.3,mortero[2]+k*.3);
    else{const lx=(x+off)%ancho,ly=y%alto;const b=(lx===0||ly===0)?10:0;p(x,y,col[0]+k+b,col[1]+k+b,col[2]+k+b);}});
  const bloqueMetal=(col,s=S())=>(p,r)=>cada((x,y)=>{const borde=x===0||y===0||x===15||y===15;const bis=x===1||y===1;
    const k=n(r,6)+(pn(x,y,4,s)-.5)*10;const f=borde?.66:bis?1.12:1;p(x,y,col[0]*f+k,col[1]*f+k,col[2]*f+k);});
  const planta=(dibujar)=>(p,r)=>{cada((x,y)=>p(x,y,0,0,0,0));dibujar(p,r);};
  const tallo=(p,x0,y0,y1,col,a=255)=>{for(let y=y0;y<=y1;y++)p(x0,y,...col,a);};
  const hojas=(densidad,s=S())=>(p,r)=>cada((x,y)=>{
    const g=pn(x,y,8,s)*50+n(r,40);
    if(r()<densidad)return p(x,y,0,0,0,0);
    const v=clamp(165+g,70,240);
    const brillo=r()<.08?30:0;p(x,y,v+brillo,v+brillo,v+brillo,TINTE_A);});
  const florSimple=(petalo,centro,alto=8)=>planta((p,r)=>{
    tallo(p,7,16-alto,15,[70,140,40]); p(6,13,60,150,40); p(8,12,60,150,40); p(5,12,50,130,35);
    const cy=16-alto-1;
    for(const [a,b] of [[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1],[0,-2],[-2,0],[2,0]])if(Math.abs(a)+Math.abs(b)<3)p(7+a,cy+b,petalo[0]+n(r,20),petalo[1]+n(r,20),petalo[2]+n(r,20));
    p(7,cy,...centro);});
  const cruzPasto=(alfa)=>planta((p,r)=>{for(let b=0;b<9;b++){const x0=1+Math.floor(r()*14),h=5+Math.floor(r()*10);
    for(let y=15;y>15-h;y--){const v=150+((15-y)/h)*80+n(r,20);p(clamp(x0+Math.round((15-y)*(r()-.5)*.35),0,15),y,v,v,v,alfa);}}});

  /* ---- Superficie ---- */
  tile('grassTop',(p,r)=>{const s=S();cada((x,y)=>{const v=clamp(196+(pn(x,y,8,s)-.5)*36+n(r,30)+(r()<.1?18:0),120,250);p(x,y,v,v,v,TINTE_A);});});
  tile('grassSide',(p,r)=>{tierra(p,r);const s=S();for(let x=0;x<TS;x++){let h=2+Math.floor(pn(x,0,4,s)*3);if(r()<.25)h+=1+Math.floor(r()*2);
    for(let y=0;y<h;y++){const v=clamp(192+n(r,36),120,245);p(x,y,v,v,v,TINTE_A);}}});
  tile('dirt',tierra);
  tile('stone',piedra);
  tile('logSide',corteza([106,82,50],[72,54,32]));
  tile('logTop',anillos([176,140,88],[98,76,46]));
  tile('leaves',hojas(.16));
  tile('sand',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,14)+(pn(x,y,8,s)-.5)*12+(r()<.06?-18:0);p(x,y,220+k,206+k,160+k);});});
  tile('planks',(p,r)=>tablones(p,r));
  tile('cobble',(p,r)=>{const pts=[];for(let i=0;i<8;i++)pts.push([r()*TS,r()*TS,r()]);
    cada((x,y)=>{let d1=1e9,d2=1e9,id=0;
      for(const q of pts)for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const dx=x+.5-(q[0]+ox*TS),dy=y+.5-(q[1]+oy*TS),dd=Math.hypot(dx,dy);
        if(dd<d1){d2=d1;d1=dd;id=q[2];}else if(dd<d2)d2=dd;}
      const k=n(r,12);if(d2-d1<1.2)p(x,y,72+k,72+k,74+k);else{const b=100+id*56+k-d1*3+(d2-d1<2.2?-10:0);p(x,y,b,b,b+2);}});});
  tile('brick',(p,r)=>ladrillos(p,r,[150,68,52],[186,180,168]));
  tile('glass',(p,r)=>cada((x,y)=>{const borde=x===0||y===0||x===15||y===15;
    const brillo=(x-y===6&&x>7&&x<12)||(x-y===4&&x>3&&x<7)||(x-y===5&&x>4&&x<11)||(x===2&&y===2);
    if(borde)p(x,y,200+(x+y)%3*12,228,238);else if(brillo)p(x,y,250,252,255);else p(x,y,0,0,0,0);}));
  tile('snow',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,8)+(pn(x,y,8,s)-.5)*10;p(x,y,242+k,246+k,252);});});
  tile('snowSide',(p,r)=>{tierra(p,r);for(let x=0;x<TS;x++){const h=3+Math.floor(r()*2)+(r()<.2?2:0);for(let y=0;y<h;y++){const k=n(r,10);p(x,y,240+k,244+k,250);}}});
  tile('bedrock',(p,r)=>{const s=S();cada((x,y)=>{let v=60+pn(x,y,4,s)*70+n(r,40);if(r()<.25)v=24;p(x,y,v,v,v+3);});});
  // Menas
  tile('coalOre',mena(piedra,[34,34,38],[20,20,22],[78,78,84]));
  tile('ironOre',mena(piedra,[218,172,132],[150,112,84],[244,212,180]));
  tile('goldOre',mena(piedra,[252,212,48],[190,130,20],[255,250,170]));
  tile('diamondOre',mena(piedra,[80,226,214],[20,120,110],[210,255,252]));
  tile('redstoneOre',mena(piedra,[210,20,20],[110,0,0],[255,110,110]));
  tile('lapisOre',mena(piedra,[34,64,196],[14,30,110],[90,130,245]));
  tile('emeraldOre',mena(piedra,[36,206,96],[10,110,44],[160,255,190]));
  tile('copperOre',mena(piedra,[222,128,74],[140,70,40],[120,210,170]));
  tile('deepslate',pizarra);
  tile('deepslateTop',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,4,s)-.5)*14;const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,76+k-(d>6?10:0),76+k-(d>6?10:0),84+k);});});
  tile('dsCoal',mena(pizarra,[28,28,32],[14,14,16],[66,66,72]));
  tile('dsIron',mena(pizarra,[206,162,124],[130,98,72],[236,204,172]));
  tile('dsGold',mena(pizarra,[246,206,50],[170,120,20],[255,245,160]));
  tile('dsRedstone',mena(pizarra,[196,20,20],[100,0,0],[255,96,96]));
  tile('dsLapis',mena(pizarra,[34,64,196],[14,30,110],[90,130,245]));
  tile('dsDiamond',mena(pizarra,[80,226,214],[20,120,110],[210,255,252]));
  tile('dsCopper',mena(pizarra,[210,118,70],[130,66,38],[120,210,170]));
  tile('gravel',(p,r)=>{const pts=[];for(let i=0;i<22;i++)pts.push([r()*TS,r()*TS,r()]);
    cada((x,y)=>{let d1=1e9,id=0,d2=1e9;for(const q of pts)for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const dd=Math.hypot(x+.5-(q[0]+ox*TS),y+.5-(q[1]+oy*TS));if(dd<d1){d2=d1;d1=dd;id=q[2];}else if(dd<d2)d2=dd;}
      const k=n(r,10);const base=id<.3?[140,122,112]:id<.6?[118,114,114]:[150,146,144];const f=d2-d1<.9?.62:1;p(x,y,base[0]*f+k,base[1]*f+k,base[2]*f+k);});});
  tile('obsidian',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,8)+pn(x,y,4,s)*10;const b=pn(x,y,8,s+1)>.72;p(x,y,(b?64:18)+k,(b?36:12)+k,(b?96:28)+k);});});
  tile('craftTop',(p,r)=>{tablones(p,r);cada((x,y)=>{const k=n(r,10);
    if(x===0||y===0||x===15||y===15)p(x,y,92+k,66+k,38+k);else if(x===1||y===1||x===14||y===14)p(x,y,120+k,90+k,54+k);
    else if((x===5||x===10)||(y===5||y===10))p(x,y,110+k,82+k,50+k);});});
  tile('craftSide',(p,r)=>{tablones(p,r);cada((x,y)=>{const k=n(r,8);
    if(y<3||x===0||x===15)p(x,y,96+k,70+k,42+k);
    if(y>=6&&y<=8&&x>=2&&x<=6)p(x,y,(y===6?180:150)+k,(y===6?180:150)+k,(y===6?186:156)+k);
    if(x>=7&&x<=8&&y>=6&&y<=9)p(x,y,70+k,48+k,28+k);
    if(y>=5&&y<=6&&x>=10&&x<=13)p(x,y,140+k,140+k,146+k);
    if(x===11&&y>=7&&y<=13)p(x,y,86+k,60+k,34+k);});});
  tile('furnaceFront',(p,r)=>{piedra(p,r);cada((x,y)=>{const k=n(r,10);
    if(y===7&&x>=3&&x<=12)p(x,y,78+k,78+k,80+k);
    if(y>=8&&y<=13&&x>=4&&x<=11)p(x,y,22+k*.4,20+k*.4,20+k*.4);
    if(y===13&&x>=5&&x<=10&&r()<.5)p(x,y,90,40,20);
    if(x===0||x===15||y===0||y===15)p(x,y,90+k,90+k,92+k);});});
  tile('furnaceTop',(p,r)=>{piedra(p,r);cada((x,y)=>{if(x===0||y===0||x===15||y===15)p(x,y,92,92,94);});});
  tile('chestTop',(p,r)=>{tablones(p,r,[164,112,52]);cada((x,y)=>{const b=x===0||y===0||x===15||y===15;if(b)p(x,y,74,46,20);});});
  tile('chestSide',(p,r)=>{tablones(p,r,[164,112,52]);cada((x,y)=>{const b=x===0||y===0||x===15||y===15||y===5||y===6;
    if(b)p(x,y,74,46,20);if(x>=7&&x<=8&&y>=4&&y<=8){const c=(x===7&&y>4&&y<8)?214:128;p(x,y,c,c,c+6);}});});
  tile('torch',planta((p,r)=>{tallo(p,7,6,15,[128,92,52]);tallo(p,8,6,15,[98,70,38]);
    p(7,5,255,190,70);p(8,5,255,160,40);p(7,4,255,230,120);p(8,4,255,210,90);p(7,3,255,252,210);p(8,3,255,236,150);p(7,2,255,255,230);}));
  tile('bedTop',(p,r)=>cada((x,y)=>{const k=n(r,8);if(y<5)p(x,y,236+k,236+k,240+k);else{const f=(x+y)%4===0?.9:1;p(x,y,(176+k)*f,(30+k*.5)*f,(34+k*.5)*f);}
    if(x===0||x===15)p(x,y,140+k,110+k,70+k);}));
  tile('bedSide',(p,r)=>cada((x,y)=>{const k=n(r,8);
    if(y<7)p(x,y,0,0,0,0);else if(y<11)p(x,y,176+k,30+k*.5,34+k*.5);else if(y<13)p(x,y,150+k,116+k,70+k);
    else if(x<3||x>12)p(x,y,120+k,90+k,55+k);else p(x,y,0,0,0,0);}));
  tile('tntSide',(p,r)=>cada((x,y)=>{const k=n(r,10);
    if(y>=5&&y<=10){p(x,y,236+k,236+k,230+k);
      const letras=['###.#..#.###','.#..##.#..#.','.#..#.##..#.','.#..#..#..#.'];
      const fy=y-6,fx=x-2;if(fy>=0&&fy<4&&fx>=0&&fx<12&&letras[fy][fx]==='#')p(x,y,30,30,30);}
    else{const raya=x%4===0?-20:0;p(x,y,200+k+raya,40+k*.4,30+k*.4);}}));
  tile('tntTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const c=Math.hypot(x-7.5,y-7.5)<3;p(x,y,c?80:200+k,c?80:40+k*.4,c?80:30+k*.4);if(Math.hypot(x-7.5,y-7.5)<1)p(x,y,40,40,40);}));
  tile('wool',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,8,s)-.5)*12+((x+y*3)%5===0?-8:0);p(x,y,232+k,232+k,232+k);});});
  tile('tallGrass',cruzPasto(TINTE_A));
  tile('flowerY',florSimple([250,220,40],[220,160,20]));
  tile('flowerR',florSimple([220,30,30],[60,20,20],7));
  for(let e=0;e<8;e++)tile('wheat'+e,planta((p,r)=>{const alto=2+e*1.7, madura=e===7;
    for(let c=0;c<5;c++){const x0=1+c*3+Math.floor(r()*2);
      for(let y=15;y>15-alto;y--){const k=n(r,18);const arriba=y<15-alto+4;
        if(madura&&arriba)p(x0,y,206+k,172+k,64+k*.5);else if(e>4&&arriba)p(x0,y,150+k,170+k,60);else p(x0,y,70+k*.5,150+k,40+k*.4);}
      if(madura)p(x0+1,Math.floor(15-alto+1),220,190,80);}}));
  tile('farmland',(p,r)=>cada((x,y)=>{const k=n(r,14);const surco=y%4===0||y%4===1&&r()<.3;p(x,y,(surco?66:96)+k,(surco?42:62)+k,(surco?26:38)+k);}));
  tile('cactusSide',(p,r)=>cada((x,y)=>{const k=n(r,10);const borde=x===0||x===15;const linea=x%4===2;
    if(borde)return p(x,y,0,0,0,0);p(x,y,(linea?34:54)+k,(linea?112:142)+k,(linea?30:42)+k);if(linea&&y%4===1)p(x,y,230,230,190);}));
  tile('cactusTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x===0||y===0||x===15||y===15;
    if(b)return p(x,y,0,0,0,0);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,(d<3?90:64)+k,(d<3?170:146)+k,(d<3?60:44)+k);}));
  tile('ice',(p,r)=>cada((x,y)=>{const k=n(r,8);const raya=(x+y*2)%11===0||(x*2-y+30)%13===0;p(x,y,(raya?220:146)+k,(raya?240:190)+k,252);}));
  tile('sandstoneSide',(p,r)=>cada((x,y)=>{const k=n(r,8);const b=y<3?-6:y>12?-14:(y%4===0?-6:0);p(x,y,216+k+b,200+k+b,150+k+b);}));
  tile('sandstoneTop',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,8)+(pn(x,y,4,s)-.5)*10;p(x,y,222+k,206+k,156+k);});});
  tile('water',(p,r)=>{const s=S();cada((x,y)=>{const w=pn(x,y,4,s)*.6+pn(x,y,8,s+1)*.4;const v=clamp(150+w*80+n(r,10),120,245);p(x,y,v,v,v,170);});});
  tile('lava',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s)*.7+pn(x,y,8,s+1)*.3;const k=n(r,14);
    if(v<.32)p(x,y,150+k,40+k*.3,10);else p(x,y,226+k,96+v*130+k,20+v*40);});});
  tile('netherrack',netherrack);
  tile('soulSand',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,16)+(pn(x,y,4,s)-.5)*16;
    const cara=((x%8===2||x%8===5)&&y%8===3)||(y%8===5&&x%8>=2&&x%8<=5);p(x,y,(cara?56:90)+k,(cara?40:68)+k,(cara?30:52)+k);});});
  tile('glowstone',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);const k=n(r,24);const borde=pn(x,y,8,s+1)>.66;
    p(x,y,(borde?150:200+v*55)+k*.3,(borde?96:150+v*90)+k*.4,(borde?50:70+v*70)+k*.3);});});
  tile('quartzOre',mena(netherrack,[236,228,218],[180,160,150],[255,255,255]));
  tile('netherBrick',(p,r)=>ladrillos(p,r,[60,26,32],[28,12,16],4,8));
  tile('netherPortal',(p,r)=>cada((x,y)=>{const v=Math.sin(x*.9+Math.cos(y*.7)*2)*.5+.5;const w=Math.sin((x+y)*.5)*.5+.5;p(x,y,90+v*90,20+w*30,170+v*80,200);}));
  tile('netherGoldOre',mena(netherrack,[252,204,48],[170,110,20],[255,244,150]));
  tile('endStone',(p,r)=>{const s=S();cada((x,y)=>{let k=n(r,10)+(pn(x,y,4,s)-.5)*14;if(r()<.08)k-=16;p(x,y,222+k,224+k,166+k);});});
  tile('endFrameSide',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,4,s)-.5)*10;if(y<4)p(x,y,46+k,92+k,82+k);else p(x,y,214+k,218+k,160+k);});});
  tile('endFrameTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));
    p(x,y,d<4?16:46+k,d<4?26:92+k,d<4?26:82+k);if(d>=4&&d<5)p(x,y,30,60,54);}));
  tile('endFrameTopEye',(p,r)=>cada((x,y)=>{const k=n(r,10);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));
    if(d<4){const c=Math.hypot(x-7.5,y-7.5);p(x,y,c<1.5?10:40,c<1.5?40:150+k,c<1.5?20:80);}else p(x,y,46+k,92+k,82+k);}));
  tile('endPortal',(p,r)=>cada((x,y)=>{const e=r()<.07;const c=[[120,220,200],[200,120,240],[250,250,250],[100,160,255]][Math.floor(r()*4)];
    p(x,y,e?c[0]:8,e?c[1]:12,e?c[2]:22);}));
  tile('stoneBricks',(p,r)=>{piedra(p,r);cada((x,y)=>{const fila=Math.floor(y/8),off=(fila%2)*8;
    if(y%8===7||(x+off)%16===15)p(x,y,84,84,86);else if(y%8===0||(x+off)%16===0)p(x,y,150,150,152);});});
  tile('mossyStoneBricks',(p,r)=>{piedra(p,r);const s=S();cada((x,y)=>{const fila=Math.floor(y/8),off=(fila%2)*8;
    if(y%8===7||(x+off)%16===15)p(x,y,84,84,86);else if(y%8===0||(x+off)%16===0)p(x,y,150,150,152);
    if(pn(x,y,4,s)>.58){const k=n(r,20);p(x,y,74+k,112+k,54+k);}});});
  tile('ironBlock',bloqueMetal([222,222,224]));
  tile('goldBlock',bloqueMetal([252,212,64]));
  tile('diamondBlock',bloqueMetal([104,234,226]));
  tile('coalBlock',bloqueMetal([34,34,38]));
  tile('dragonEgg',(p,r)=>cada((x,y)=>{const k=n(r,8);const e=r()<.07;p(x,y,e?120:14+k,e?40:8+k,e?160:22+k);}));
  tile('fire',planta((p,r)=>{const s=S();for(let x=0;x<TS;x++){const h=5+Math.floor(pn(x,0,4,s)*8+r()*3);
    for(let y=15;y>15-h;y--){const f=(15-y)/h;p(x,y,255,clamp(230-f*180,40,255),f<.3?90:20,r()<.08?0:235);}}}));
  tile('sapling',planta((p,r)=>{tallo(p,7,9,15,[100,70,40]);tallo(p,8,10,15,[90,62,34]);
    for(let i=0;i<34;i++){const a=r()*Math.PI*2,d=r()*5;p(Math.round(7.5+Math.cos(a)*d),Math.round(6+Math.sin(a)*d*.8),50+n(r,30),130+n(r,40),40);}}));
  tile('sugarCane',planta((p,r)=>{for(const x0 of [3,7,11]){for(let y=0;y<16;y++){const k=n(r,16);p(x0,y,124+k,192+k,94+k);p(x0+1,y,100+k,170+k,70+k);if(y%5===0)p(x0,y,86,150,60);}
    p(x0+2,6+x0%5,110,180,80);p(x0-1,10-x0%4,110,180,80);}}));
  tile('enchantTop',(p,r)=>cada((x,y)=>{const k=n(r,8);const esq=(x<3||x>12)&&(y<3||y>12);
    if(esq)p(x,y,90,230,220);else if(x===0||y===0||x===15||y===15)p(x,y,30,20,40);else p(x,y,168+k,30+k*.4,40+k*.4);
    if(x>=6&&x<=9&&y>=5&&y<=10)p(x,y,236,230,210);if(x===7&&y>=5&&y<=10)p(x,y,120,70,40);}));
  tile('enchantSide',(p,r)=>cada((x,y)=>{const k=n(r,8);
    if(y<5)p(x,y,168+k,30+k*.4,40+k*.4);else{const b=r()<.08;p(x,y,(b?64:18)+k,(b?36:12)+k,(b?96:28)+k);}}));
  tile('spawner',(p,r)=>cada((x,y)=>{const barra=x%4===0||y%4===0;const k=n(r,16);
    if(barra)p(x,y,44+k,54+k,64+k);else p(x,y,0,0,0,0);}));
  tile('hayTop',(p,r)=>cada((x,y)=>{const k=n(r,16);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,(d>6.5?150:200)+k,(d>6.5?120:170)+k,40+k*.5);}));
  /* ---- Nuevos ---- */
  tile('haySide',(p,r)=>cada((x,y)=>{const k=n(r,16);const banda=(y>=3&&y<=4)||(y>=11&&y<=12);
    p(x,y,(banda?140:204)+k,(banda?60:170)+k,(banda?30:44)+k*.5);if(x%3===0&&!banda)p(x,y,180+k,146+k,36);}));
  tile('birchSide',corteza([222,220,212],[190,186,176],true));
  tile('birchTop',anillos([206,186,130],[210,206,196]));
  tile('spruceSide',corteza([72,52,32],[46,32,20]));
  tile('spruceTop',anillos([130,98,58],[66,46,28]));
  tile('jungleSide',(p,r)=>{corteza([100,78,40],[74,56,28])(p,r);cada((x,y)=>{if(r()<.05)p(x,y,70,110,40);});});
  tile('jungleTop',anillos([176,132,86],[92,70,36]));
  tile('acaciaSide',corteza([108,100,90],[82,76,68]));
  tile('acaciaTop',anillos([196,106,56],[108,100,90]));
  tile('spruceLeaves',(p,r)=>{const s=S();cada((x,y)=>{const g=pn(x,y,8,s)*40+n(r,30);if(r()<.1)return p(x,y,0,0,0,0);
    const v=clamp(150+g-((x+y)%4===0?20:0),60,225);p(x,y,v,v,v,TINTE_A);});});
  tile('birchSapling',planta((p,r)=>{tallo(p,7,9,15,[220,220,210]);for(let i=0;i<30;i++){const a=r()*Math.PI*2,d=r()*4.5;p(Math.round(7.5+Math.cos(a)*d),Math.round(6+Math.sin(a)*d*.8),100+n(r,30),150+n(r,30),70);}}));
  tile('spruceSapling',planta((p,r)=>{tallo(p,7,4,15,[70,50,30]);for(let y=4;y<13;y++){const w=Math.floor((y-3)/2.5);for(let x=7-w;x<=7+w;x++)if(r()<.8)p(x,y,40+n(r,20),80+n(r,20),50);}}));
  tile('jungleSapling',planta((p,r)=>{tallo(p,7,9,15,[100,78,40]);for(let i=0;i<40;i++){const a=r()*Math.PI*2,d=r()*5.5;p(Math.round(7.5+Math.cos(a)*d),Math.round(6+Math.sin(a)*d*.7),30+n(r,20),140+n(r,40),20);}}));
  tile('acaciaSapling',planta((p,r)=>{tallo(p,7,8,15,[108,100,90]);for(let x=2;x<14;x++)for(let y=4;y<8;y++)if(r()<.7)p(x,y,120+n(r,30),140+n(r,30),40);}));
  tile('fern',planta((p,r)=>{for(let h=0;h<3;h++){const x0=3+h*5;for(let y=15;y>3;y--){const w=Math.floor((y-3)/4);p(x0,y,170,170,170,TINTE_A);if(y%2===0)for(let k=1;k<=w;k++){p(x0-k,y-k*.5,150+n(r,30),150+n(r,30),150+n(r,30),TINTE_A);p(x0+k,y-k*.5,150+n(r,30),150+n(r,30),150+n(r,30),TINTE_A);}}}}));
  tile('deadBush',planta((p,r)=>{const rama=(x,y,dx,dy,l)=>{for(let i=0;i<l;i++){p(Math.round(x+dx*i),Math.round(y+dy*i),120+n(r,20),84+n(r,20),46);}};
    rama(7,15,0,-1,6);rama(7,10,-.8,-1,6);rama(7,11,.9,-1,6);rama(7,9,.3,-1,6);rama(4,7,-.6,-.6,3);rama(11,7,.6,-.8,3);}));
  tile('cornflower',florSimple([70,110,230],[240,240,120]));
  tile('orchid',florSimple([60,180,240],[200,240,255]));
  tile('daisy',florSimple([244,244,244],[240,200,30],7));
  tile('mushRed',planta((p,r)=>{tallo(p,7,10,15,[230,220,200]);tallo(p,8,10,15,[210,200,180]);
    for(let x=3;x<=12;x++)for(let y=5;y<=9;y++){const d=Math.hypot((x-7.5)/4.6,(y-9)/4.2);if(d<1&&y<=9)p(x,y,210,30,30);}
    for(const [a,b] of [[5,7],[9,6],[7,5],[11,8]])p(a,b,250,250,250);}));
  tile('mushBrown',planta((p,r)=>{tallo(p,7,11,15,[230,220,200]);tallo(p,8,11,15,[210,200,180]);
    for(let x=3;x<=12;x++)for(let y=8;y<=10;y++)p(x,y,150+n(r,20),110+n(r,20),80);for(let x=5;x<=10;x++)p(x,7,160,120,90);}));
  tile('pumpkinSide',(p,r)=>cada((x,y)=>{const k=n(r,10);const surco=x%4===0;p(x,y,(surco?190:230)+k,(surco?100:128)+k,(surco?20:30)+k*.4);}));
  tile('pumpkinTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const d=Math.hypot(x-7.5,y-7.5);
    if(d<1.6)p(x,y,90,70,30);else{const surco=Math.floor(Math.atan2(y-7.5,x-7.5)*1.3)%2;p(x,y,(surco?210:230)+k,(surco?110:128)+k,26);}}));
  tile('jackFace',(p,r)=>cada((x,y)=>{const k=n(r,10);const surco=x%4===0;p(x,y,(surco?190:230)+k,(surco?100:128)+k,30);
    const ojo=(y>=4&&y<=6)&&((x>=3&&x<=5)||(x>=10&&x<=12));const boca=(y>=9&&y<=11&&x>=3&&x<=12)&&!(y===9&&(x===5||x===10));
    if(ojo||boca)p(x,y,255,220-(y-4)*6,80);}));
  tile('melonSide',(p,r)=>cada((x,y)=>{const k=n(r,10);const raya=(x+Math.floor(y/3))%4===0;p(x,y,(raya?80:110)+k,(raya?150:180)+k,(raya?40:50)+k);}));
  tile('melonTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const d=Math.hypot(x-7.5,y-7.5);p(x,y,(d<2?120:100)+k,(d<2?170:170)+k,50);}));
  tile('lilyPad',planta((p,r)=>{for(let y=1;y<15;y++)for(let x=1;x<15;x++){const d=Math.hypot(x-7.5,y-7.5);const corte=x>7&&Math.abs(y-7.5)<1.2;
    if(d<6.8&&!corte){const v=120+n(r,30)+((x+y)%5===0?-20:0);p(x,y,v*.4,v,v*.35);}}}));
  tile('clay',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,8)+(pn(x,y,4,s)-.5)*10;p(x,y,160+k,166+k,178+k);});});
  tile('redSand',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,14)+(pn(x,y,8,s)-.5)*12;p(x,y,190+k,102+k*.7,36+k*.4);});});
  const TERR=[[152,94,68],[162,84,38],[186,134,36],[142,60,46],[76,50,36],[210,178,160],[134,106,98]];
  ['terracotta','terr0','terr1','terr2','terr3','terr4','terr5'].forEach((nom,i)=>tile(nom,(p,r)=>{const c=TERR[i];cada((x,y)=>{const k=n(r,8);p(x,y,c[0]+k,c[1]+k,c[2]+k);});}));
  tile('mossyCobble',(p,r)=>{_genTiles[T.cobble](p,r);const s=S();cada((x,y)=>{if(pn(x,y,4,s)>.56){const k=n(r,20);p(x,y,70+k,110+k,50+k);}});});
  tile('cryingObsidian',(p,r)=>{_genTiles[T.obsidian](p,r);const s=S();cada((x,y)=>{if(pn(x,y,4,s)>.62)p(x,y,120+n(r,30),40,220);});});
  tile('bookshelf',(p,r)=>{tablones(p,r);const cols=[[150,40,40],[40,70,150],[40,120,60],[160,120,40],[110,60,130]];
    for(const fila of [1,9])for(let x=1;x<15;){const w=1+Math.floor(r()*2),c=cols[Math.floor(r()*cols.length)],h=5+Math.floor(r()*2);
      for(let a=0;a<w&&x+a<15;a++)for(let y=fila;y<fila+h;y++)p(x+a,y+(6-h),c[0]+n(r,16),c[1]+n(r,16),c[2]+n(r,16));x+=w;}});
  tile('ladder',planta((p,r)=>{for(let y=0;y<16;y++){p(2,y,120,90,50);p(3,y,100,74,40);p(12,y,120,90,50);p(13,y,100,74,40);}
    for(const y of [2,6,10,14])for(let x=2;x<=13;x++){p(x,y,136,102,58);p(x,y+1,98,72,40);}}));
  tile('doorTop',(p,r)=>{tablones(p,r);cada((x,y)=>{if(x===0||x===15||y===0)p(x,y,110,82,48);
    if(x>=3&&x<=6&&y>=3&&y<=11||x>=9&&x<=12&&y>=3&&y<=11)p(x,y,0,0,0,0);});});
  tile('doorBottom',(p,r)=>{tablones(p,r);cada((x,y)=>{if(x===0||x===15||y===15)p(x,y,110,82,48);
    if((x===3||x===12)&&y>2&&y<13)p(x,y,120,90,52);if(x===12&&y===4)p(x,y,60,60,60);});});
  tile('pathTop',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,8,s)-.5)*14;p(x,y,148+k,122+k,66+k);});});
  const piedraColor=(c,manchas,cm)=>(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,8,s);let k=n(r,12)+(v-.5)*20;const m=pn(x,y,4,s+1)>manchas;
    const col=m?cm:c;p(x,y,col[0]+k,col[1]+k,col[2]+k);});};
  tile('granite',piedraColor([150,104,86],.6,[176,124,104]));
  tile('diorite',piedraColor([188,188,190],.62,[228,228,230]));
  tile('andesite',piedraColor([134,134,136],.64,[112,112,114]));
  /* ---- Nether: biomas ---- */
  const nilio=(c)=>(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,24)+(pn(x,y,4,s)-.5)*30;p(x,y,c[0]+k,c[1]+k*.8,c[2]+k*.8);});};
  const nilioLado=(c)=>(p,r)=>{netherrack(p,r);for(let x=0;x<16;x++){const h=3+Math.floor(r()*3);for(let y=0;y<h;y++){const k=n(r,24);p(x,y,c[0]+k,c[1]+k*.8,c[2]+k*.8);}}};
  tile('crimsonNylium',nilio([150,24,30])); tile('crimsonNyliumSide',nilioLado([150,24,30]));
  tile('warpedNylium',nilio([26,130,118])); tile('warpedNyliumSide',nilioLado([26,130,118]));
  const talloN=(c,o)=>(p,r)=>cada((x,y)=>{const k=n(r,14);const raya=(x+Math.floor(y/3))%4===0;p(x,y,(raya?o[0]:c[0])+k,(raya?o[1]:c[1])+k,(raya?o[2]:c[2])+k);if(r()<.04)p(x,y,c[0]+60,c[1]+60,c[2]+60);});
  tile('crimsonStem',talloN([110,32,48],[70,20,34])); tile('crimsonStemTop',anillos([150,60,80],[110,32,48]));
  tile('warpedStem',talloN([48,90,94],[26,60,64])); tile('warpedStemTop',anillos([60,150,140],[48,90,94]));
  const verruga=(c)=>(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);const k=n(r,20);p(x,y,c[0]*(0.7+v*.5)+k,c[1]*(0.7+v*.5)+k,c[2]*(0.7+v*.5)+k);});};
  tile('netherWartBlock',verruga([140,10,14])); tile('warpedWartBlock',verruga([20,120,110]));
  tile('shroomlight',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);const k=n(r,14);p(x,y,240+k,150+v*80+k,60+v*60);});});
  const raices=(c)=>planta((p,r)=>{for(let k=0;k<6;k++){let x=2+Math.floor(r()*12);for(let y=15;y>6+Math.floor(r()*4);y--){if(r()<.25)x+=r()<.5?-1:1;p(clamp(x,0,15),y,c[0]+n(r,30),c[1]+n(r,30),c[2]+n(r,30));}}});
  tile('crimsonRoots',raices([150,20,40])); tile('warpedRoots',raices([30,150,130]));
  const hongo=(c,pie)=>planta((p,r)=>{tallo(p,7,10,15,pie);tallo(p,8,10,15,pie);for(let x=3;x<=12;x++)for(let y=5;y<=9;y++){if(Math.hypot((x-7.5)/4.6,(y-9)/4)<1)p(x,y,c[0]+n(r,24),c[1]+n(r,24),c[2]+n(r,24));}p(5,6,255,200,90);p(10,7,255,200,90);});
  tile('crimsonFungus',hongo([160,20,30],[220,200,170])); tile('warpedFungus',hongo([30,150,140],[240,120,40]));
  tile('soulSoil',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,16)+(pn(x,y,4,s)-.5)*18;p(x,y,78+k,58+k,46+k);});});
  tile('boneSide',(p,r)=>cada((x,y)=>{const k=n(r,8);p(x,y,(x%5===2?206:226)+k,(x%5===2?200:220)+k,(x%5===2?178:196)+k);}));
  tile('boneTop',(p,r)=>cada((x,y)=>{const k=n(r,8);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,(d>5?226:190)+k,(d>5?220:184)+k,(d>5?196:160)+k);}));
  tile('basaltSide',(p,r)=>cada((x,y)=>{const k=n(r,12);const raya=x%4===0||x%4===3;p(x,y,(raya?60:84)+k,(raya?60:84)+k,(raya?66:90)+k);}));
  tile('basaltTop',(p,r)=>cada((x,y)=>{const k=n(r,12);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,(d>6?60:90)+k,(d>6?60:90)+k,(d>6?66:96)+k);}));
  tile('blackstone',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,14)+(pn(x,y,4,s)-.5)*16;p(x,y,40+k,34+k,40+k);});});
  tile('magma',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);const k=n(r,14);if(v>.55)p(x,y,90+k,30,20);else if(v>.45)p(x,y,240,130+k,30);else p(x,y,110+k,40+k*.3,20);});});
  for(let e=0;e<4;e++)tile('wart'+e,planta((p,r)=>{for(let c=0;c<4;c++){const x0=2+c*4;for(let y=15;y>13-e*2;y--)p(x0,y,120,30,30);
    for(let k=0;k<=e;k++)p(x0+(k%2),13-e*2+k,200,40,40);}}));
  tile('soulFire',planta((p,r)=>{const s=S();for(let x=0;x<TS;x++){const h=5+Math.floor(pn(x,0,4,s)*8+r()*3);
    for(let y=15;y>15-h;y--){const f=(15-y)/h;p(x,y,clamp(120-f*80,30,200),clamp(230-f*60,60,255),255,r()<.08?0:235);}}}));
  /* ---- Redstone ---- */
  tile('redstoneDust',planta((p,r)=>{for(let i=2;i<14;i++){p(i,7,200,200,200);p(i,8,230,230,230);p(7,i,200,200,200);p(8,i,230,230,230);}
    for(let k=0;k<20;k++){p(5+r()*6,5+r()*6,160,160,160);}}));
  tile('redTorchOn',planta((p,r)=>{tallo(p,7,6,15,[128,92,52]);tallo(p,8,6,15,[98,70,38]);for(const [x,y] of [[7,4],[8,4],[7,5],[8,5],[7,3],[8,3]])p(x,y,255,40+n(r,40),30);p(7,2,255,160,140);}));
  tile('redTorchOff',planta((p,r)=>{tallo(p,7,6,15,[128,92,52]);tallo(p,8,6,15,[98,70,38]);for(const [x,y] of [[7,4],[8,4],[7,5],[8,5],[7,3],[8,3]])p(x,y,90,20,20);}));
  tile('lever',(p,r)=>{piedra(p,r);cada((x,y)=>{if(x===0||y===0||x===15||y===15)p(x,y,90,90,92);});});
  tile('redstoneBlock',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,20)+(pn(x,y,4,s)-.5)*30;const b=x===0||y===0||x===15||y===15;p(x,y,(b?140:190)+k,18+k*.2,14);});});
  tile('lampOff',(p,r)=>cada((x,y)=>{const k=n(r,12);const borde=x<2||y<2||x>13||y>13;const cruz=x===7||x===8||y===7||y===8;
    p(x,y,borde?70+k:cruz?80+k:120+k,borde?50+k:cruz?40+k:70+k,borde?30+k:30);}));
  tile('lampOn',(p,r)=>cada((x,y)=>{const k=n(r,12);const borde=x<2||y<2||x>13||y>13;const cruz=x===7||x===8||y===7||y===8;
    p(x,y,borde?140+k:cruz?250:250,borde?100+k:cruz?210+k:230+k,borde?60:cruz?140:170+k);}));
  tile('pistonTop',(p,r)=>{tablones(p,r);cada((x,y)=>{if(x<2||y<2||x>13||y>13)p(x,y,110,110,112);});});
  tile('pistonTopSticky',(p,r)=>{tablones(p,r);const s=S();cada((x,y)=>{if(x<2||y<2||x>13||y>13)p(x,y,110,110,112);else if(pn(x,y,4,s)>.35)p(x,y,110+n(r,20),190+n(r,20),90);});});
  tile('pistonSide',(p,r)=>{piedra(p,r);cada((x,y)=>{if(y<4){const k=n(r,10);p(x,y,160+k,128+k,82+k);}if(x>=6&&x<=9&&y>=4&&y<=12)p(x,y,150,150,152);});});
  tile('pistonBottom',(p,r)=>{piedra(p,r);cada((x,y)=>{if(x>=5&&x<=10&&y>=5&&y<=10)p(x,y,90,90,92);});});
  tile('pressurePlate',(p,r)=>{piedra(p,r);cada((x,y)=>{if(x===0||y===0||x===15||y===15)p(x,y,96,96,98);});});
  tile('rail',planta((p,r)=>{for(let y=0;y<16;y++){p(2,y,150,150,156);p(3,y,120,120,126);p(12,y,150,150,156);p(13,y,120,120,126);}
    for(const y of [1,5,9,13])for(let x=1;x<=14;x++){p(x,y,110,80,46);p(x,y+1,90,64,36);}for(let y=0;y<16;y++){p(2,y,160,160,166);p(13,y,130,130,136);}}));
  tile('railCurve',planta((p,r)=>{for(let a=0;a<=40;a++){const t=a/40*Math.PI/2;for(const R of [2.5,3.5,12.5,13.5])p(Math.round(15.5-Math.cos(t)*R),Math.round(15.5-Math.sin(t)*R),150,150,156);}
    for(let a=0;a<4;a++){const t=(a+.5)/4*Math.PI/2;for(let R=1;R<15;R++)p(Math.round(15.5-Math.cos(t)*R),Math.round(15.5-Math.sin(t)*R),110,80,46);}
    for(let a=0;a<=40;a++){const t=a/40*Math.PI/2;for(const R of [2.5,12.5])p(Math.round(15.5-Math.cos(t)*R),Math.round(15.5-Math.sin(t)*R),160,160,166);}}));
  tile('railPowered',planta((p,r)=>{for(const y of [1,5,9,13])for(let x=1;x<=14;x++){p(x,y,110,80,46);p(x,y+1,90,64,36);}
    for(let y=0;y<16;y++){p(2,y,230,190,50);p(3,y,200,160,40);p(12,y,230,190,50);p(13,y,200,160,40);p(7,y,120,20,20);p(8,y,120,20,20);}}));
  tile('railPoweredOn',planta((p,r)=>{for(const y of [1,5,9,13])for(let x=1;x<=14;x++){p(x,y,110,80,46);p(x,y+1,90,64,36);}
    for(let y=0;y<16;y++){p(2,y,240,200,60);p(3,y,210,170,50);p(12,y,240,200,60);p(13,y,210,170,50);p(7,y,255,50,40);p(8,y,255,70,50);}}));
  /* ---- Pociones, yunque y End ---- */
  tile('brewingBase',(p,r)=>{piedra(p,r);});
  tile('brewingStand',planta((p,r)=>{tallo(p,7,1,15,[200,180,90]);tallo(p,8,1,15,[170,150,70]);for(let x=2;x<14;x++){p(x,4,200,180,90);}p(7,0,230,50,50);p(8,0,230,50,50);}));
  tile('anvil',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,4,s)-.5)*14;p(x,y,64+k,64+k,68+k);});});
  tile('purpur',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,4,s)-.5)*14;const b=x%8===7||y%8===7;p(x,y,(b?140:170)+k,(b?100:124)+k,(b?140:170)+k);});});
  tile('purpurPillar',(p,r)=>cada((x,y)=>{const k=n(r,8);const raya=x%4===0;p(x,y,(raya?140:172)+k,(raya?100:126)+k,(raya?140:172)+k);}));
  tile('endBricks',(p,r)=>ladrillos(p,r,[226,228,170],[180,182,130],8,8));
  tile('endRod',planta((p,r)=>{tallo(p,7,0,15,[250,248,240]);tallo(p,8,0,15,[230,226,214]);for(let x=5;x<=10;x++){p(x,14,200,190,180);p(x,15,180,170,160);}}));
  tile('endGateway',(p,r)=>cada((x,y)=>{const e=r()<.06;const c=[[120,220,200],[200,120,240],[250,250,250],[100,160,255]][Math.floor(r()*4)];p(x,y,e?c[0]:6,e?c[1]:10,e?c[2]:18);}));
  tile('chorusPlant',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,14)+(pn(x,y,4,s)-.5)*20;p(x,y,94+k,58+k,94+k);});});
  tile('chorusFlower',(p,r)=>cada((x,y)=>{const k=n(r,14);const borde=x<2||y<2||x>13||y>13;p(x,y,(borde?150:196)+k,(borde?110:160)+k,(borde?150:200)+k);}));
  tile('ironGolemTile',(p,r)=>cada((x,y)=>p(x,y,200,200,196)));
  /* ---- 1.19: Deep Dark ---- */
  const sculkBase=(p,r,s=S())=>cada((x,y)=>{const v=pn(x,y,4,s),w=pn(x,y,8,s+1);let k=n(r,10);
    if(w>.72&&r()<.7)return p(x,y,40+k,190+k,200+k);
    p(x,y,10+v*16+k*.4,30+v*24+k,38+v*26+k);});
  tile('sculk',sculkBase);
  tile('sculkVein',planta((p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);if(v>.55)p(x,y,14+n(r,10),48+n(r,14),56+n(r,14));if(v>.72&&r()<.3)p(x,y,50,200,210);});}));
  tile('sculkSensorTop',(p,r)=>{sculkBase(p,r);cada((x,y)=>{const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));if(d<4)p(x,y,20,70+n(r,20),80+n(r,20));if(d<2)p(x,y,30,120,130);});});
  tile('sculkSensorSide',(p,r)=>{sculkBase(p,r);cada((x,y)=>{if(y<5){p(x,y,0,0,0,0);}else if(y<7)p(x,y,20,90,100);});});
  tile('sculkSensorOn',(p,r)=>{sculkBase(p,r);cada((x,y)=>{const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));if(d<4)p(x,y,60,230,240);if(d<2)p(x,y,200,255,255);});});
  tile('sculkShriekerTop',(p,r)=>{sculkBase(p,r);cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5);if(d<5.5&&d>3)p(x,y,220,220,200);if(d<=3)p(x,y,20,40,44);});});
  tile('sculkShriekerSide',(p,r)=>{sculkBase(p,r);cada((x,y)=>{if(y<8&&(x%5===1||x%5===2))p(x,y,215,212,190+n(r,10));});});
  tile('sculkCatalystTop',(p,r)=>{sculkBase(p,r);cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5);if(d<3)p(x,y,120,240,250);});});
  tile('sculkCatalystSide',(p,r)=>cada((x,y)=>{const k=n(r,10);if(y<5)return p(x,y,14+k,44+k,52+k);const hueso=(x%4===1)||(y%5===2);p(x,y,(hueso?210:180)+k,(hueso?205:172)+k,(hueso?184:150)+k);}));
  tile('deepslateBricks',(p,r)=>ladrillos(p,r,[78,78,84],[44,44,48],4,8));
  tile('deepslateTiles',(p,r)=>ladrillos(p,r,[60,60,66],[34,34,38],4,4));
  tile('reinforcedTop',(p,r)=>cada((x,y)=>{const k=n(r,8);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,(d>6?60:d>3?96:40)+k,(d>6?64:d>3?100:48)+k,(d>6?60:d>3?96:50)+k);}));
  tile('reinforcedSide',(p,r)=>cada((x,y)=>{const k=n(r,8);const b=x<2||x>13;p(x,y,(b?150:58)+k,(b?144:60)+k,(b?120:64)+k);}));
  tile('soulLantern',planta((p,r)=>{for(let y=4;y<=13;y++)for(let x=4;x<=11;x++){const borde=x===4||x===11||y===4||y===13;p(x,y,borde?50:90,borde?56:220,borde?66:230);}
    for(let y=1;y<=3;y++){p(7,y,60,60,70);p(8,y,60,60,70);}}));
  /* ---- 1.20: cerezos ---- */
  tile('cherryLog',corteza([60,34,44],[40,22,30],false)); tile('cherryTop',anillos([222,162,160],[60,34,44]));
  tile('cherryLeaves',(p,r)=>{const s=S();cada((x,y)=>{if(r()<.18)return p(x,y,0,0,0,0);const v=pn(x,y,8,s);const k=n(r,24);
    p(x,y,236+k*.3,160+v*50+k,196+v*30+k);});});
  tile('cherryPlanks',(p,r)=>tablones(p,r,[226,178,172]));
  tile('cherrySapling',planta((p,r)=>{tallo(p,7,9,15,[80,44,52]);for(let k=0;k<22;k++){const a=r()*6.28,d=r()*4;p(7.5+Math.cos(a)*d,6+Math.sin(a)*d*.8,240,170+n(r,40),200);}}));
  // Roble oscuro, setas gigantes, hielo compacto y girasol
  tile('darkOakLog',corteza([66,50,30],[42,30,18],false)); tile('darkOakTop',anillos([98,74,46],[60,44,26]));
  tile('darkOakLeaves',hojas(.1));
  tile('darkOakPlanks',(p,r)=>tablones(p,r,[74,50,26]));
  tile('darkOakSapling',planta((p,r)=>{tallo(p,7,9,15,[60,44,26]);for(let k=0;k<26;k++){const a=r()*6.28,d=r()*4.2;p(7.5+Math.cos(a)*d,6+Math.sin(a)*d*.8,40+n(r,20),92+n(r,30),30);}}));
  tile('mushBlockRed',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,4,s)-.5)*14;p(x,y,186+k,34+k*.4,30+k*.4);});
    for(const [cx,cy,rr] of [[4,4,2],[11,3,1.6],[12,11,2.2],[4,12,1.5],[8,8,1.2]])cada((x,y)=>{if(Math.hypot(x-cx,y-cy)<=rr){const k=n(r,10);p(x,y,236+k,232+k,226+k);}});});
  tile('mushBlockBrown',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,4,s)-.5)*16;p(x,y,150+k,112+k*.9,82+k*.8);});});
  tile('mushStem',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x*.5,y*2,8,s)-.5)*14;p(x,y,214+k,208+k,196+k);});});
  tile('packedIce',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,8)+(pn(x,y,4,s)-.5)*18;const g=pn(x,y,8,s+1)>.7?14:0;p(x,y,150+k+g,184+k+g,236+k*.5);});});
  tile('sunflower',planta((p,r)=>{tallo(p,7,7,15,[70,140,40]);tallo(p,8,8,15,[60,124,36]);p(5,12,70,150,40);p(6,11,70,150,40);p(10,13,70,150,40);p(9,12,70,150,40);
    for(let y=0;y<8;y++)for(let x=3;x<13;x++){const d=Math.hypot(x-7.5,y-3.5);if(d<2.2)p(x,y,110+n(r,20),70+n(r,14),20);else if(d<4.4&&r()>.1)p(x,y,250,200+n(r,30),30);}}));
  tile('pinkPetals',planta((p,r)=>{for(let k=0;k<9;k++){const cx=2+r()*12,cy=2+r()*12;for(const [a,b] of [[0,0],[1,0],[0,1],[-1,0],[0,-1]])p(cx+a,cy+b,240,150+n(r,40),190,255);p(cx,cy,250,220,120);}}));
  /* ---- 1.19: manglar ---- */
  tile('mangroveLog',corteza([84,38,34],[58,26,24],false)); tile('mangroveTop',anillos([116,50,44],[84,38,34]));
  tile('mangroveLeaves',hojas(.14));
  tile('mangroveRoots',planta((p,r)=>{for(let k=0;k<5;k++){let x=r()*16;for(let y=0;y<16;y++){x+=r()<.3?(r()<.5?-1:1):0;p(clamp(x,0,15),y,88,58,40);p(clamp(x+1,0,15),y,70,44,30);}}
    for(let y=0;y<16;y+=5)for(let x=0;x<16;x++)if(r()<.7)p(x,y,90,60,40);}));
  tile('mud',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,4,s)-.5)*14;p(x,y,62+k,56+k,56+k);});});
  tile('mudBricks',(p,r)=>ladrillos(p,r,[150,112,80],[110,82,58],4,8));
  tile('mangrovePlanks',(p,r)=>tablones(p,r,[120,52,48]));
  tile('propagule',planta((p,r)=>{for(let y=2;y<=14;y++){p(7,y,110,160,60);p(8,y,90,140,50);}for(let x=4;x<=11;x++)p(x,3,80,160,60);p(7,15,200,200,100);}));
  /* ---- 1.20: arqueología ---- */
  tile('suspiciousSand',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,14)+(pn(x,y,8,s)-.5)*16;p(x,y,220+k,206+k,160+k);});cada((x,y)=>{if(pn(x,y,4,s+9)>.7&&r()<.5)p(x,y,190,170,120);});});
  tile('suspiciousGravel',(p,r)=>cada((x,y)=>{const k=n(r,40);const b=hash2(Math.floor(x/3),Math.floor(y/3),5)<.4;p(x,y,(b?110:140)+k,(b?104:132)+k,(b?100:128)+k);if(r()<.05)p(x,y,190,160,120);}));
  tile('decoratedPot',(p,r)=>cada((x,y)=>{const k=n(r,8);const f=(y===0||y===15)?.7:1;const deco=(x+y)%6===0&&y>2&&y<13;p(x,y,(deco?90:170)*f+k,(deco?50:90)*f+k,(deco?40:60)*f+k);}));
  /* ---- 1.16: netherite y herrería ---- */
  tile('ancientDebrisSide',(p,r)=>cada((x,y)=>{const k=n(r,14);const a=Math.floor(pn(x,y,4,7)*4);const col=[[86,62,56],[108,78,70],[70,50,46],[130,98,86]][a];
    if(Math.abs(Math.sin(x*1.3+y*.4))<.12)return p(x,y,150+k,120+k,100+k);p(x,y,col[0]+k,col[1]+k,col[2]+k);}));
  tile('ancientDebrisTop',(p,r)=>cada((x,y)=>{const k=n(r,14);const d=Math.hypot(x-7.5,y-7.5);const a=Math.floor(d)%3;p(x,y,[92,66,60][a]+k,[70,50,44][a]+k,[66,46,40][a]+k);}));
  tile('netheriteBlock',bloqueMetal([70,64,68]));
  tile('smithingTop',(p,r)=>cada((x,y)=>{const k=n(r,8);const b=x<1||y<1||x>14||y>14;p(x,y,(b?40:60)+k,(b?40:58)+k,(b?48:66)+k);}));
  tile('smithingSide',(p,r)=>{tablones(p,r,[120,86,60]);cada((x,y)=>{if(y<4)p(x,y,60+n(r,8),58+n(r,8),66+n(r,8));if(y>=4&&y<6)p(x,y,190,70,60);});});
  /* ---- 1.21: cámaras de prueba ---- */
  tile('tuff',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,4,s)-.5)*18;const g=r()<.06?-18:0;p(x,y,108+k+g,110+k+g,100+k+g);});});
  tile('tuffBricks',(p,r)=>ladrillos(p,r,[112,116,104],[70,72,64],4,8));
  tile('cutCopper',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x%8===7||y%8===7||x%8===0||y%8===0;p(x,y,(b?170:200)+k,(b?90:110)+k,(b?60:74)+k);}));
  tile('copperBulb',(p,r)=>cada((x,y)=>{const k=n(r,8);const borde=x<2||y<2||x>13||y>13;const cen=Math.hypot(x-7.5,y-7.5)<4.5;
    p(x,y,borde?190+k:cen?255:236,borde?100+k:cen?236:170+k,borde?66+k:cen?150:90);}));
  tile('trialSpawner',(p,r)=>cada((x,y)=>{const k=n(r,8);const reja=x%4===0||y%4===0;const borde=x<1||y<1||x>14||y>14;
    if(borde)return p(x,y,60+k,64+k,58+k);if(reja)p(x,y,90+k,96+k,86+k);else p(x,y,Math.hypot(x-7.5,y-7.5)<4?230:40,Math.hypot(x-7.5,y-7.5)<4?140:30,30,Math.hypot(x-7.5,y-7.5)<4?255:0);}));
  tile('trialSpawnerOff',(p,r)=>cada((x,y)=>{const k=n(r,8);const reja=x%4===0||y%4===0;const borde=x<1||y<1||x>14||y>14;
    if(borde)return p(x,y,60+k,64+k,58+k);if(reja)p(x,y,90+k,96+k,86+k);else p(x,y,0,0,0,0);}));
  tile('vault',(p,r)=>cada((x,y)=>{const k=n(r,8);const borde=x<2||y<2||x>13||y>13;const ojo=Math.hypot(x-7.5,y-7.5)<3;
    p(x,y,borde?70+k:ojo?120:44+k,borde?74+k:ojo?220:48+k,borde?66+k:ojo?255:44+k);}));
  tile('vaultOpen',(p,r)=>cada((x,y)=>{const k=n(r,8);const borde=x<2||y<2||x>13||y>13;p(x,y,borde?70+k:30,borde?74+k:32,borde?66+k:30);}));
  tile('heavyCore',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x%5===0||y%5===0;p(x,y,(b?60:88)+k,(b?62:90)+k,(b?70:100)+k);}));
  /* ---- 1.21.4: jardín pálido ---- */
  tile('paleLog',corteza([200,192,186],[150,140,136],false)); tile('paleTop',anillos([232,222,214],[190,182,176]));
  tile('paleLeaves',(p,r)=>{const s=S();cada((x,y)=>{if(r()<.07)return p(x,y,0,0,0,0);const v=pn(x,y,8,s);const k=n(r,12);p(x,y,132+v*34+k,146+v*32+k,128+v*28+k);});});
  tile('palePlanks',(p,r)=>tablones(p,r,[228,218,210]));
  tile('paleMoss',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);const k=n(r,16);p(x,y,118+v*40+k,126+v*40+k,112+v*34+k);});});
  tile('hangingMoss',planta((p,r)=>{for(let k=0;k<6;k++){const x0=1+Math.floor(r()*14),l=6+Math.floor(r()*10);for(let y=0;y<l;y++)p(x0+(y%5===4?1:0),y,120+n(r,30),130+n(r,30),116+n(r,30));}}));
  const corazon=(on)=>(p,r)=>{corteza([200,192,186],[150,140,136],false)(p,r);cada((x,y)=>{
    if(x>=4&&x<=11&&y>=3&&y<=12){const k=n(r,10);p(x,y,90+k,76+k,70+k);}
    if((x===6||x===9)&&(y===6||y===7))p(x,y,on?255:70,on?150:60,on?30:50);});};
  tile('creakingHeart',corazon(false)); tile('creakingHeartOn',corazon(true));
  tile('eyeblossomClosed',planta((p,r)=>{tallo(p,7,8,15,[90,110,80]);for(let y=4;y<=8;y++)for(let x=6;x<=9;x++)p(x,y,130+n(r,16),120+n(r,16),130+n(r,16));}));
  tile('eyeblossomOpen',planta((p,r)=>{tallo(p,7,8,15,[90,110,80]);for(const [a,b] of [[0,-2],[-2,0],[2,0],[0,2],[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[-1,0],[1,0],[0,1]])p(7+a,6+b,240,230,236);p(7,6,255,150,40);p(8,6,255,190,60);}));
  tile('resinBlock',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s);const k=n(r,14);p(x,y,220+k,110+v*60+k,30+k*.3);});});
  tile('resinBricks',(p,r)=>ladrillos(p,r,[214,110,36],[150,70,20],4,8));
  /* ---- 1.21.5: primavera ---- */
  tile('leafLitter',planta((p,r)=>{for(let k=0;k<14;k++){const cx=r()*16,cy=r()*16,c=[[150,100,40],[180,120,50],[120,80,40],[170,140,60]][Math.floor(r()*4)];
    for(const [a,b] of [[0,0],[1,0],[0,1],[1,1],[-1,0]])p(cx+a,cy+b,c[0]+n(r,20),c[1]+n(r,20),c[2]+n(r,20));}}));
  tile('wildflowers',planta((p,r)=>{for(let k=0;k<10;k++){const cx=1+r()*14,cy=1+r()*14,c=r()<.5?[250,210,70]:[240,160,200];
    for(const [a,b] of [[0,-1],[-1,0],[1,0],[0,1]])p(cx+a,cy+b,...c);p(cx,cy,250,250,230);}for(let k=0;k<16;k++)p(r()*16,r()*16,90,150,50);}));
  tile('fireflyBush',planta((p,r)=>{for(let b=0;b<12;b++){const x0=1+Math.floor(r()*14),h=5+Math.floor(r()*10);for(let y=15;y>15-h;y--)p(x0+(y%4===0?(r()<.5?-1:1):0),y,70+n(r,20),110+n(r,20),50+n(r,20));}
    for(let k=0;k<5;k++)p(2+r()*12,2+r()*8,255,240,120);}));
  tile('bush',planta((p,r)=>{for(let y=5;y<16;y++)for(let x=1;x<15;x++)if(Math.hypot((x-7.5)/7,(y-11)/6)<1&&r()<.85){const v=clamp(150+n(r,50),80,220);p(x,y,v,v,v,TINTE_A);}}));
  /* ---- 1.21.6: ghast seco ---- */
  tile('driedGhast',(p,r)=>cada((x,y)=>{const k=n(r,12);const cara=(y===6||y===7)&&(x===4||x===5||x===10||x===11)||(y===10&&x>=6&&x<=9);p(x,y,cara?60+k:170+k,cara?56+k:158+k,cara?54+k:150+k);}));
  /* ---- 1.21.9: la edad del cobre ---- */
  tile('copperChestTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x===0||y===0||x===15||y===15;p(x,y,(b?150:204)+k,(b?80:112)+k,(b?50:70)+k);}));
  tile('copperChestSide',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x===0||y===0||x===15||y===15||y===5;const cerr=x>=7&&x<=8&&y>=4&&y<=7;
    p(x,y,cerr?90:(b?150:204)+k,cerr?200:(b?80:112)+k,cerr?160:(b?50:70)+k);}));
  tile('paleSapling',planta((p,r)=>{tallo(p,7,8,15,[150,140,130]);for(let k=0;k<20;k++){const a=r()*6.28,d=r()*4;p(7.5+Math.cos(a)*d,6+Math.sin(a)*d*.8,170,176,160);}}));
  /* ---- Bloques de colores (16 tintes) ---- */
  COLORES16.forEach(([clave,,,c])=>{
    tile('lana_'+clave,(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,8,s)-.5)*14+(((x+y*3)%4===0)?-10:0);p(x,y,c[0]+k,c[1]+k,c[2]+k);});});
    tile('hormigon_'+clave,(p,r)=>cada((x,y)=>{const k=n(r,5);p(x,y,c[0]*.92+k,c[1]*.92+k,c[2]*.92+k);}));
    tile('vidrio_'+clave,(p,r)=>cada((x,y)=>{const borde=x===0||y===0||x===15||y===15;const brillo=(x-y===4||x-y===5)&&x>2&&x<12;
      p(x,y,c[0]*(borde?.8:1)+(brillo?50:0),c[1]*(borde?.8:1)+(brillo?50:0),c[2]*(borde?.8:1)+(brillo?50:0),borde?235:brillo?190:120);}));
  });
  /* ---- Piedras, maderas y bloques decorativos ---- */
  tile('smoothStone',(p,r)=>cada((x,y)=>{const k=n(r,6);const b=x===0||y===0||x===15||y===15;p(x,y,(b?140:160)+k,(b?140:160)+k,(b?142:162)+k);}));
  const pulido=(c)=>(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,8)+(pn(x,y,4,s)-.5)*10;const b=x===0||y===0||x===15||y===15;const l=x===1||y===1;
    p(x,y,c[0]*(b?.78:l?1.12:1)+k,c[1]*(b?.78:l?1.12:1)+k,c[2]*(b?.78:l?1.12:1)+k);});};
  tile('polishedGranite',pulido([160,110,90])); tile('polishedDiorite',pulido([200,200,202])); tile('polishedAndesite',pulido([134,136,136]));
  tile('polishedDeepslate',pulido([72,72,78])); tile('cobbledDeepslate',(p,r)=>{const s=S();cada((x,y)=>{const v=hash2(Math.floor((x+(y>>2&1)*2)/4),Math.floor(y/4),9);const k=n(r,10);
    const borde=(x+(y>>2&1)*2)%4===0||y%4===0;p(x,y,(borde?46:62+v*24)+k,(borde?46:62+v*24)+k,(borde?52:70+v*24)+k);});});
  tile('crackedBricks',(p,r)=>{ladrillos(p,r,[122,122,122],[82,82,82],8,8);for(let k=0;k<3;k++){let x=r()*16,y=r()*16;for(let q=0;q<9;q++){p(x,y,50,50,52);x+=r()<.5?1:-1;y+=r()<.6?1:0;}}});
  tile('chiseledStone',(p,r)=>cada((x,y)=>{const k=n(r,8);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,(d>6.5?100:d>5?140:d>2.5?120:150)+k,(d>6.5?100:d>5?140:d>2.5?120:150)+k,(d>6.5?100:d>5?140:d>2.5?120:152)+k);}));
  tile('cutSandstone',(p,r)=>cada((x,y)=>{const k=n(r,8);const b=y===0||y===15||y===7;p(x,y,(b?200:222)+k,(b?186:206)+k,(b?140:160)+k);}));
  tile('quartz',pulido([236,230,222])); tile('quartzPillar',(p,r)=>cada((x,y)=>{const k=n(r,6);const b=x%5===0;p(x,y,(b?210:238)+k,(b?204:232)+k,(b?196:224)+k);}));
  tile('netherBricks',(p,r)=>ladrillos(p,r,[70,34,40],[36,16,20],4,8));
  tile('lapisBlock',bloqueMetal([40,70,170])); tile('emeraldBlock',bloqueMetal([60,200,110]));
  tile('birchPlanks',(p,r)=>tablones(p,r,[214,196,140])); tile('sprucePlanks',(p,r)=>tablones(p,r,[118,86,52]));
  tile('junglePlanks',(p,r)=>tablones(p,r,[170,122,86])); tile('acaciaPlanks',(p,r)=>tablones(p,r,[176,94,52]));
  tile('lantern',planta((p,r)=>{for(let y=4;y<=13;y++)for(let x=4;x<=11;x++){const borde=x===4||x===11||y===4||y===13;p(x,y,borde?54:255,borde?56:200,borde?66:90);}
    for(let y=1;y<=3;y++){p(7,y,60,60,70);p(8,y,60,60,70);}}));
  tile('barrelTop',(p,r)=>{tablones(p,r,[140,100,60]);cada((x,y)=>{if(x<2||y<2||x>13||y>13)p(x,y,80,60,40);if(x>=6&&x<=9&&y>=6&&y<=9)p(x,y,50,36,24);});});
  tile('barrelSide',(p,r)=>{tablones(p,r,[140,100,60]);cada((x,y)=>{if(y===2||y===13)p(x,y,70,70,74);});});
  tile('cobweb',planta((p,r)=>{for(let a=0;a<8;a++){const t=a/8*Math.PI*2;for(let d=0;d<8;d++)p(7.5+Math.cos(t)*d,7.5+Math.sin(t)*d,230,230,236,200);}
    for(const R of [3,5.5,7.5])for(let a=0;a<40;a++){const t=a/40*Math.PI*2;p(7.5+Math.cos(t)*R,7.5+Math.sin(t)*R,220,220,226,180);}}));
  tile('enchantedBook',(p,r)=>cada((x,y)=>p(x,y,100,50,140)));
  /* ---- Monumento oceánico ---- */
  tile('prismarine',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s),w=pn(x,y,8,s+1);const k=n(r,10);p(x,y,70+v*30+k,140+w*40+k,130+v*30+k);});});
  tile('prismarineBricks',(p,r)=>ladrillos(p,r,[100,170,150],[60,110,100],4,8));
  tile('darkPrismarine',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x%8===0||y%8===0;p(x,y,(b?30:50)+k,(b?60:88)+k,(b?50:74)+k);}));
  tile('seaLantern',(p,r)=>cada((x,y)=>{const k=n(r,8);const b=x<2||y<2||x>13||y>13;const c=Math.hypot(x-7.5,y-7.5)<3.5;p(x,y,b?150+k:c?250:210+k,b?200+k:c?255:235+k,b?190+k:c?250:230+k);}));
  tile('sponge',(p,r)=>cada((x,y)=>{const k=n(r,14);const hueco=hash2(x>>1,y>>1,31)<.25;p(x,y,(hueco?170:214)+k,(hueco?160:204)+k,(hueco?60:80)+k);}));
  tile('wetSponge',(p,r)=>cada((x,y)=>{const k=n(r,14);const hueco=hash2(x>>1,y>>1,31)<.25;p(x,y,(hueco?120:170)+k,(hueco?130:170)+k,(hueco?40:60)+k);}));
  /* ---- End: cabeza de dragón y cofre abierto ---- */
  tile('dragonHead',(p,r)=>cada((x,y)=>{const k=n(r,10);const ojo=(y===5||y===6)&&(x===4||x===11);p(x,y,ojo?200:30+k,ojo?60:24+k,ojo?220:36+k);}));
  tile('vacio',(p,r)=>cada((x,y)=>p(x,y,0,0,0,0)));
  tile('grindstoneSide',(p,r)=>{const s=S();cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5),k=n(r,10)+(pn(x,y,4,s)-.5)*14;
    if(d<=7.4)p(x,y,(d>6.4?104:140)+k,(d>6.4?104:140)+k,(d>6.4?108:144)+k);else p(x,y,0,0,0,0);});});
  tile('grindstoneTop',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,4,s)-.5)*16;p(x,y,134+k,134+k,138+k);});});
  tile('grindstonePivot',(p,r)=>tablones(p,r,[150,112,70]));
  tile('pathSide',(p,r)=>{tierra(p,r);cada((x,y)=>{if(y<2){const k=n(r,12);p(x,y,148+k,122+k,66+k);}});});
})();

const NT=_genTiles.length, ATH=Math.ceil(NT/ATW);
const atlas=document.createElement('canvas'); atlas.width=TS*ATW; atlas.height=TS*ATH;
(function construirAtlas(){
  const ctx=atlas.getContext('2d'), img=ctx.createImageData(atlas.width,atlas.height), d=img.data, r=mulberry32(1337);
  const cl=v=>Math.max(0,Math.min(255,v|0));
  _genTiles.forEach((gen,t)=>{
    const ox=(t%ATW)*TS, oy=Math.floor(t/ATW)*TS;
    const p=(x,y,R,G,B,A=255)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=TS||y>=TS)return;const i=((oy+y)*atlas.width+ox+x)*4;d[i]=cl(R);d[i+1]=cl(G);d[i+2]=cl(B);d[i+3]=A;};
    gen(p,r);
  });
  ctx.putImageData(img,0,0);
})();
// Atlas para iconos, objetos sueltos y partículas: el tinte ya aplicado
const TINTE_ICONO={grassTop:[.57,.74,.35],grassSide:[.57,.74,.35],tallGrass:[.57,.74,.35],fern:[.52,.72,.36],leaves:[.47,.67,.18],spruceLeaves:[.38,.6,.38],mangroveLeaves:[.55,.69,.15],bush:[.47,.67,.18]};
const atlasIconos=document.createElement('canvas'); atlasIconos.width=atlas.width; atlasIconos.height=atlas.height;
(function(){
  const ctx=atlasIconos.getContext('2d'); ctx.drawImage(atlas,0,0);
  const img=ctx.getImageData(0,0,atlas.width,atlas.height), d=img.data;
  for(const nom in TINTE_ICONO){const t=T[nom],c=TINTE_ICONO[nom],ox=(t%ATW)*TS,oy=Math.floor(t/ATW)*TS;
    for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const i=((oy+y)*atlas.width+ox+x)*4;if(d[i+3]===TINTE_A){d[i]*=c[0];d[i+1]*=c[1];d[i+2]*=c[2];d[i+3]=255;}}}
  {const t=T.water,ox=(t%ATW)*TS,oy=Math.floor(t/ATW)*TS;for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const i=((oy+y)*atlas.width+ox+x)*4;d[i]*=.25;d[i+1]*=.46;d[i+2]*=.9;}}
  ctx.putImageData(img,0,0);
})();
function uvTile(t){const c=t%ATW, f=Math.floor(t/ATW);return {u0:c/ATW,u1:(c+1)/ATW,v0:1-(f+1)/ATH,v1:1-f/ATH};}

/* ---------- Iconos de objetos (16x16 dibujados) ---------- */
function lienzo16(semillaDib,fn){
  const G=new Array(256).fill(null), rnd=mulberry32(semillaDib);
  const P=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<16&&y<16)G[y*16+x]=c;};
  const linea=(x0,y0,x1,y1,c)=>{const m=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;
    for(let i=0;i<=m;i++)P(x0+(x1-x0)*i/m,y0+(y1-y0)*i/m,c);};
  const elipse=(cx,cy,rx,ry,c,v=16)=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;
    if(dx*dx+dy*dy<=1){const q=(rnd()-.5)*v;const luz=(-dx-dy)*14;P(x,y,[c[0]+q+luz,c[1]+q+luz,c[2]+q+luz]);}}};
  const rect=(x0,y0,x1,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)P(x,y,c);};
  fn({P,linea,elipse,rect,rnd});
  const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d'),img=ctx.createImageData(16,16);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const i=y*16+x;let col=G[i];
    const hay=(X,Y)=>X>=0&&Y>=0&&X<16&&Y<16&&!!G[Y*16+X];
    if(!col){const v=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>hay(x+a,y+b));
      if(v)col=[28,22,18];}
    else{ // relieve: luz arriba a la izquierda, sombra abajo a la derecha
      const f=(!hay(x,y-1)||!hay(x-1,y))?1.22:(!hay(x,y+1)||!hay(x+1,y))?.74:1;
      if(f!==1)col=[col[0]*f+(f>1?12:0),col[1]*f+(f>1?12:0),col[2]*f+(f>1?12:0)];}
    if(col){img.data[i*4]=clamp(col[0],0,255);img.data[i*4+1]=clamp(col[1],0,255);img.data[i*4+2]=clamp(col[2],0,255);img.data[i*4+3]=255;}
  }
  ctx.putImageData(img,0,0);return c;
}
function lienzoTile(t){
  const c=document.createElement('canvas');c.width=c.height=16;
  c.getContext('2d').drawImage(atlasIconos,(t%ATW)*TS,Math.floor(t/ATW)*TS,TS,TS,0,0,16,16);return c;
}
function iconoCubo(arriba,lado,alto=1){
  const c=document.createElement('canvas');c.width=48;c.height=48;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const dy=(1-alto)*24;
  const cara=(t,m,osc,recorte)=>{x.setTransform(...m);
    x.drawImage(atlasIconos,(t%ATW)*TS,Math.floor(t/ATW)*TS+(recorte?TS*(1-alto):0),TS,recorte?TS*alto:TS,0,0,TS,recorte?TS*alto:TS);
    if(osc){x.globalCompositeOperation='source-atop';x.fillStyle=`rgba(0,0,0,${osc})`;x.fillRect(0,0,TS,TS);x.globalCompositeOperation='source-over';}};
  cara(lado,[1.25,.625,0,1.5,4,12+dy],.22,true);
  cara(lado,[1.25,-.625,0,1.5,24,22+dy],.38,true);
  cara(arriba,[1.25,-.625,1.25,.625,4,12+dy],0,false);
  // Aristas iluminadas y contorno suave
  x.setTransform(1,0,0,1,0,0);
  x.strokeStyle='rgba(255,255,255,.28)';x.lineWidth=1;x.beginPath();
  x.moveTo(4,12+dy);x.lineTo(24,22+dy);x.lineTo(44,12+dy);x.moveTo(24,22+dy);x.lineTo(24,46);x.stroke();
  const d=x.getImageData(0,0,48,48),o=new Uint8ClampedArray(d.data);
  for(let yy=0;yy<48;yy++)for(let xx=0;xx<48;xx++){const k=(yy*48+xx)*4;if(d.data[k+3])continue;
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=xx+a,Y=yy+b;if(X<0||Y<0||X>=48||Y>=48)continue;
      if(d.data[(Y*48+X)*4+3]>200){o[k]=20;o[k+1]=16;o[k+2]=14;o[k+3]=150;break;}}}
  x.putImageData(new ImageData(o,48,48),0,0);
  return c;
}
