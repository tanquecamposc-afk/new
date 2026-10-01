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
  // Ruido periódico con distinta escala en x e y (vetas horizontales o verticales), azar por píxel y tonos
  const pn2=(x,y,cx,cy,s)=>{const gx=x*cx/16,gy=y*cy/16,x0=Math.floor(gx),y0=Math.floor(gy),fx=smooth(gx-x0),fy=smooth(gy-y0),mx=v=>((v%cx)+cx)%cx,my=v=>((v%cy)+cy)%cy;
    const a=hash2(mx(x0),my(y0),s),b=hash2(mx(x0+1),my(y0),s),c=hash2(mx(x0),my(y0+1),s),d=hash2(mx(x0+1),my(y0+1),s);
    const ab=a+(b-a)*fx;return ab+((c+(d-c)*fx)-ab)*fy;};
  const hp=(x,y,s)=>hash2(((x%16)+16)%16,((y%16)+16)%16,s);
  const tono=(c,f)=>[c[0]*f,c[1]*f,c[2]*f];
  // Paleta escalonada: pocos tonos bien definidos, como las texturas originales de 16x16
  const escala=(v,umbrales,cols)=>{for(let i=0;i<umbrales.length;i++)if(v<umbrales[i])return cols[i];return cols[cols.length-1];};
  // ---- materiales base ----
  const piedra=(p,r,s=S())=>cada((x,y)=>{const v=pn2(x,y,8,4,s)*.5+pn2(x,y,16,8,s+1)*.3+hp(x,y,s+2)*.2;
    const c=escala(v,[.3,.42,.62,.76],[108,118,127,136,145]);p(x,y,c,c,c+1);});
  const tierra=(p,r,s=S())=>cada((x,y)=>{const v=pn2(x,y,8,8,s)*.55+hp(x,y,s+1)*.45,h=hp(x,y,s+3);
    let c=escala(v,[.33,.66],[[118,84,58],[134,96,67],[146,106,74]]);
    if(h<.07)c=[92,64,43];else if(h>.955)c=[176,128,90];p(x,y,...c);});
  const pizarra=(p,r,s=S())=>cada((x,y)=>{const v=pn2(x,y,4,16,s)*.6+hp(x,y,s+1)*.4;
    const c=escala(v,[.3,.5,.75],[56,66,76,86]);p(x,y,c,c,c+6);});
  const netherrack=(p,r,s=S())=>cada((x,y)=>{const v=pn2(x,y,8,8,s)*.45+hp(x,y,s+1)*.55;
    p(x,y,...escala(v,[.22,.45,.72,.9],[[74,26,27],[97,38,38],[112,48,47],[128,58,56],[146,78,74]]));});
  // Mineral: grupos de píxeles con borde oscuro y brillo
  // Mineral al estilo del original: vetas de formas irregulares con borde oscuro abajo a la derecha,
  // canto iluminado arriba a la izquierda y algún destello
  const FORMAS_MENA=[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1],[1,2]],
    [[0,0],[1,0],[1,1],[2,1],[2,2]],[[0,0],[0,1],[1,1],[1,2],[2,1]],[[0,0],[1,0],[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,0],[1,1],[2,0],[2,1]]];
  // Estilos especiales: gemas en rombo (diamante, esmeralda), polvo (redstone) y vetas alargadas (cuarzo)
  const menaEspecial=(estilo,base,col,osc,brillo)=>(p,r)=>{base(p,r);
    const c=(v,k)=>[v[0]+k,v[1]+k,v[2]+k];
    if(estilo==='polvo'){for(let k=0;k<16;k++){const x=1+Math.floor(r()*14),y=1+Math.floor(r()*14);p(x,y,...c(col,n(r,20)));if(r()<.5)p(x+1,y,...c(col,-10));p(x+1,y+1,...osc);if(r()<.2)p(x,y,...brillo);}return;}
    if(estilo==='veta'){for(let k=0;k<6;k++){const x0=1+Math.floor(r()*11),y0=2+Math.floor(r()*12),l=3+Math.floor(r()*3),d=r()<.5?1:-1;
      for(let i=0;i<l;i++){const x=x0+i,y=y0+Math.round(i*d*.5);p(x,y,...c(col,n(r,12)));p(x,y+1,...osc);if(i===1)p(x,y,...brillo);}}return;}
    // gema: rombos de 3x3 con canto claro y sombra
    const usados=[];for(let k=0;k<5;k++){let cx,cy,t=0;do{cx=2+Math.floor(r()*11);cy=2+Math.floor(r()*11);t++;}while(t<30&&usados.some(([a,b])=>Math.abs(a-cx)<4&&Math.abs(b-cy)<4));usados.push([cx,cy]);
      for(const [dx,dy] of [[0,-1],[-1,0],[0,0],[1,0],[0,1]])p(cx+dx,cy+dy,...c(col,n(r,14)));
      p(cx,cy-1,...brillo);p(cx-1,cy,...c(brillo,-30));p(cx+1,cy+1,...osc);p(cx,cy+2,...osc);p(cx+2,cy,...osc);}};
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
  // Tablones: cuatro tablas de 4 píxeles con junta oscura, una unión por tabla y vetas horizontales
  const tablones=(p,r,col=[162,130,78],s=S())=>{const L=tono(col,1.1),D=tono(col,.9),G=tono(col,.8),J=tono(col,.6),cortes=[5,12,2,9];
    cada((x,y)=>{const t=y>>2,fy=y&3;let c;
      if(fy===3)c=J;
      else if(x===cortes[t])c=fy===0?G:J;
      else{const g=pn2(x,y,4,16,s+t*7),h=hp(x,y,s+9);c=g>.7?G:g<.22?L:h<.1?D:col;if(fy===0&&c===col&&h>.7)c=L;}
      p(x,y,c[0],c[1],c[2]);});};
  // Corteza: surcos verticales largos; la del abedul es blanca con marcas negras horizontales
  const corteza=(col,oscuro,rayas)=>(p,r,s=S())=>cada((x,y)=>{
    if(rayas){const v=hp(x,y,s)*.35+pn2(x,y,8,8,s+1)*.65;let c=v<.35?tono(col,.88):v>.75?tono(col,1.04):col;
      const m=pn2(x,y,4,16,s+2);if(m>.74)c=[44,44,40];else if(m>.68)c=tono(oscuro,.8);return p(x,y,...c);}
    const v=pn2(x,y,16,2,s)*.7+hp(x,y,s+1)*.3;
    p(x,y,...(v<.3?tono(oscuro,.88):v<.44?oscuro:v>.78?tono(col,1.12):col));});
  // Corte del tronco: borde de corteza y anillos casi cuadrados
  const anillos=(corte,borde)=>(p,r)=>cada((x,y)=>{const dx=Math.abs(x-7.5),dy=Math.abs(y-7.5),e=Math.max(dx,dy);
    if(e>6.6)return p(x,y,...tono(borde,hp(x,y,51)<.35?.82:1));
    const d=e*.7+Math.hypot(dx,dy)*.3,a=Math.floor(d/1.5);
    p(x,y,...tono(corte,d<1?.8:a%2?.86:hp(x,y,52)<.12?.93:1));});
  // Ladrillos: cada pieza con su tono, canto claro arriba a la izquierda y sombra abajo
  const ladrillos=(p,r,col,mortero,alto=4,ancho=8)=>cada((x,y)=>{const fila=Math.floor(y/alto),off=(fila%2)*(ancho>>1),nb=Math.max(1,16/ancho|0);
    const bid=Math.floor((x+off)/ancho)%nb,lx=(x+off)%ancho,ly=y%alto,h=hp(x,y,71);
    if(ly===alto-1||lx===ancho-1)return p(x,y,...tono(mortero,h<.3?.9:1));
    let f=1+(hash2(bid,fila,7)-.5)*.18;
    if(ly===0||lx===0)f+=.1;else if(ly===alto-2||lx===ancho-2)f-=.08;
    if(h<.12)f-=.08;else if(h>.93)f+=.07;
    p(x,y,...tono(col,f));});
  // Bloques de metal y gemas: bisel claro arriba a la izquierda, sombra abajo a la derecha y paneles
  const bloqueMetal=(col,s=S())=>(p,r)=>cada((x,y)=>{const h=hp(x,y,s);let f=1;
    if(x===15||y===15)f=.7;else if(x===0||y===0)f=1.18;else if(x===14||y===14)f=.86;else if(x===1||y===1)f=1.08;
    else{if(y%5===2&&x>2&&x<13)f=.92;else if(y%5===3&&x>2&&x<13)f=1.05;if(h<.08)f-=.05;}
    p(x,y,...tono(col,f));});
  const planta=(dibujar)=>(p,r)=>{cada((x,y)=>p(x,y,0,0,0,0));dibujar(p,r);};
  const tallo=(p,x0,y0,y1,col,a=255)=>{for(let y=y0;y<=y1;y++)p(x0,y,...col,a);};
  // Hojas: racimos de cuatro tonos con huecos, como las hojas «bonitas» del original
  const hojas=(densidad,s=S())=>(p,r)=>cada((x,y)=>{const h=hp(x,y,s),v=pn2(x,y,8,8,s+1)*.6+hp(x,y,s+2)*.4;
    if(h<densidad)return p(x,y,0,0,0,0);
    const c=escala(v,[.3,.55,.8],[112,146,174,204]);p(x,y,c,c,c,TINTE_A);});
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
  tile('diamondOre',menaEspecial('gema',piedra,[80,226,214],[20,120,110],[210,255,252]));
  tile('redstoneOre',menaEspecial('polvo',piedra,[210,20,20],[110,0,0],[255,110,110]));
  tile('lapisOre',mena(piedra,[34,64,196],[14,30,110],[90,130,245]));
  tile('emeraldOre',menaEspecial('gema',piedra,[36,206,96],[10,110,44],[160,255,190]));
  tile('copperOre',mena(piedra,[222,128,74],[140,70,40],[120,210,170]));
  tile('deepslate',pizarra);
  tile('deepslateTop',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,12)+(pn(x,y,4,s)-.5)*14;const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,76+k-(d>6?10:0),76+k-(d>6?10:0),84+k);});});
  tile('dsCoal',mena(pizarra,[28,28,32],[14,14,16],[66,66,72]));
  tile('dsIron',mena(pizarra,[206,162,124],[130,98,72],[236,204,172]));
  tile('dsGold',mena(pizarra,[246,206,50],[170,120,20],[255,245,160]));
  tile('dsRedstone',menaEspecial('polvo',pizarra,[196,20,20],[100,0,0],[255,96,96]));
  tile('dsLapis',mena(pizarra,[34,64,196],[14,30,110],[90,130,245]));
  tile('dsDiamond',menaEspecial('gema',pizarra,[80,226,214],[20,120,110],[210,255,252]));
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
  // Mitades del cofre doble: sin borde en la unión y con medio cerrojo en ella; caras de los extremos sin cerrojo
  const ladoCofre=(sinIzq,sinDer,cerrojo)=>(p,r)=>{tablones(p,r,[164,112,52]);cada((x,y)=>{
    const b=(x===0&&!sinIzq)||(x===15&&!sinDer)||y===0||y===15||y===5||y===6;if(b)p(x,y,74,46,20);
    if(cerrojo!==undefined&&x===cerrojo&&y>=4&&y<=8){const c=y>4&&y<8?(cerrojo===0?128:214):128;p(x,y,c,c,c+6);}});};
  tile('chestSideL',ladoCofre(true,false,0)); tile('chestSideR',ladoCofre(false,true,15)); tile('chestSideEnd',ladoCofre(false,false));
  const tapaCofre=(sin)=>(p,r)=>{tablones(p,r,[164,112,52]);cada((x,y)=>{const b=(x===0&&sin!=='L')||(x===15&&sin!=='R')||(y===0&&sin!=='U')||(y===15&&sin!=='D');if(b)p(x,y,74,46,20);});};
  for(const k of ['L','R','U','D'])tile('chestTop'+k,tapaCofre(k));
  tile('torch',planta((p,r)=>{tallo(p,7,6,15,[128,92,52]);tallo(p,8,6,15,[98,70,38]);
    p(7,5,255,190,70);p(8,5,255,160,40);p(7,4,255,230,120);p(8,4,255,210,90);p(7,3,255,252,210);p(8,3,255,236,150);p(7,2,255,255,230);}));
  tile('bedTop',(p,r)=>cada((x,y)=>{const k=n(r,8);if(y<5)p(x,y,236+k,236+k,240+k);else{const f=(x+y)%4===0?.9:1;p(x,y,(176+k)*f,(30+k*.5)*f,(34+k*.5)*f);}
    if(x===0||x===15)p(x,y,140+k,110+k,70+k);}));
  // Camas de Bed Wars con el color de cada equipo: cabecera con almohada, pies con la manta doblada y el lateral con patas
  for(const [cl,,,cc] of COLORES16.filter(c=>['rojo','azul','lima','amarillo','cian','blanco','rosa','gris'].includes(c[0]))){
    const tela=(x,y,f=1)=>{const v=((x+y)%4===0?.9:1)*f;return [cc[0]*v,cc[1]*v,cc[2]*v];};
    tile('camaCab_'+cl,(p,r)=>cada((x,y)=>{const k=n(r,6);if(x===0||x===15)return p(x,y,140+k,110+k,70+k);
      if(y>=2&&y<=6&&x>=2&&x<=13)return p(x,y,236+k-(y===6?20:0),236+k-(y===6?20:0),240+k-(y===6?20:0));p(x,y,...tela(x,y).map(v=>v+k));}));
    tile('camaPie_'+cl,(p,r)=>cada((x,y)=>{const k=n(r,6);if(x===0||x===15)return p(x,y,140+k,110+k,70+k);p(x,y,...tela(x,y,y===12?.75:y===11?1.12:1).map(v=>v+k));}));
    tile('camaLado_'+cl,(p,r)=>cada((x,y)=>{const k=n(r,6);
      if(y<7)p(x,y,0,0,0,0);else if(y<11)p(x,y,...tela(x,y,y===7?1.1:1).map(v=>v+k));else if(y<13)p(x,y,150+k,116+k,70+k);else if(x<3||x>12)p(x,y,120+k,90+k,55+k);else p(x,y,0,0,0,0);}));
  }
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
  tile('quartzOre',menaEspecial('veta',netherrack,[236,228,218],[180,160,150],[255,255,255]));
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
  /* ---- Edición 27: bloques que faltaban ---- */
  const liso=(col,v=8,s=S())=>(p,r)=>cada((x,y)=>{const k=n(r,v)+(pn(x,y,4,s)-.5)*v;p(x,y,col[0]+k,col[1]+k,col[2]+k);});
  const mezcla=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
  COLORES16.forEach(([clave,,,c],ci)=>{
    const tc=mezcla(c,[152,94,67],.5).map(v=>v*.82);
    tile('terracota_'+clave,(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,6)+(pn(x,y,4,s)-.5)*8;p(x,y,tc[0]+k,tc[1]+k,tc[2]+k);});});
    tile('polvoHormigon_'+clave,(p,r)=>cada((x,y)=>{const k=n(r,26);p(x,y,c[0]*.95+k,c[1]*.95+k,c[2]*.95+k);}));
    // Terracota esmaltada: dibujo en espiral de 4 cuartos con el color y dos tonos
    const cl=c.map(v=>Math.min(255,v*1.25+30)), os=c.map(v=>v*.55);
    tile('esmaltada_'+clave,(p,r)=>cada((x,y)=>{
      const qx=x<8?x:15-x, qy=y<8?y:15-y, q=(x<8)^(y<8);
      const a=(qx*3+qy*5+ci)%7, d=Math.abs(qx-qy);
      const col=d<1?os:(a<2?cl:(q?c:mezcla(c,cl,.4)));const k=n(r,6);p(x,y,col[0]+k,col[1]+k,col[2]+k);}));
    tile('vela_'+clave,(p,r)=>cada((x,y)=>{const k=n(r,8)+(x===7?10:0);p(x,y,c[0]+k,c[1]+k,c[2]+k);}));
  });
  tile('vela_natural',(p,r)=>cada((x,y)=>{const k=n(r,8);p(x,y,232+k,214+k,170+k);}));
  // Amatista y geodas
  tile('amethystBlock',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s),k=n(r,16),f=((x+y)%5===0)?25:0;p(x,y,130+v*40+k+f,90+v*30+k+f,190+v*40+k+f);});});
  tile('buddingAmethyst',(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,4,s),k=n(r,16),hueco=hash2(x>>1,y>>1,s)<.18;p(x,y,(hueco?80:130+v*40)+k,(hueco?50:90+v*30)+k,(hueco?130:190+v*40)+k);});});
  const cristal=(alto)=>planta((p,r)=>{for(const [x0,h,inc] of [[7,alto,0],[4,alto*.7,-.3],[10,alto*.75,.3],[6,alto*.5,-.15],[9,alto*.55,.15]]){
    for(let y=0;y<h;y++){const x=Math.round(x0+inc*y);p(x,15-y,170+y*4,120+y*4,230,255);if(y<h-1)p(x+1,15-y,130,90,190,255);}}});
  tile('amethystCluster',cristal(12)); tile('amethystBudL',cristal(9)); tile('amethystBudM',cristal(6)); tile('amethystBudS',cristal(4));
  tile('calcite',liso([222,224,220],10)); tile('smoothBasalt',liso([72,72,78],8));
  tile('dripstoneBlock',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x*.5,y*2,4,s)-.5)*26;p(x,y,134+k,108+k,92+k);});});
  tile('pointedDripstone',planta((p,r)=>{for(let y=0;y<16;y++){const w=Math.max(0,Math.round((15-y)/5));for(let x=7-w;x<=8+w;x++)p(x,y,140+n(r,16),110+n(r,12),94+n(r,10));}}));
  // Corales: tubo, cerebro, burbuja, fuego y cuerno
  const CORALES=[[50,90,210],[210,90,160],[160,40,190],[180,40,50],[220,200,60]];
  CORALES.forEach((c,i)=>{
    tile('coralBlock_'+i,(p,r)=>{const s=S();cada((x,y)=>{const v=pn(x,y,8,s),k=n(r,14),hueco=hash2(x,y,s+i)<.12;const f=hueco?.6:.85+v*.3;p(x,y,c[0]*f+k,c[1]*f+k,c[2]*f+k);});});
    tile('coral_'+i,planta((p,r)=>{const ram=(x,y,dx,l)=>{for(let k=0;k<l;k++){p(x+Math.round(dx*k),y-k,c[0]+n(r,20),c[1]+n(r,20),c[2]+n(r,20));}};
      ram(7,15,0,11);ram(7,11,-.5,6);ram(8,9,.6,6);ram(6,13,-.9,4);ram(9,12,.9,4);}));
    tile('coralFan_'+i,planta((p,r)=>{for(let y=4;y<16;y++){const w=Math.round((16-y)*.55);for(let x=8-w;x<=7+w;x++)if((x+y)%3)p(x,y,c[0]+n(r,20),c[1]+n(r,20),c[2]+n(r,20));}}));
  });
  tile('coralDead',liso([130,124,118],14));
  // Cobre que se oxida
  [['copperBlock',[196,108,74]],['copperExposed',[160,120,100]],['copperWeathered',[108,150,110]],['copperOxidized',[80,168,140]]].forEach(([nom,c])=>{
    tile(nom,(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,10)+(pn(x,y,4,s)-.5)*14;const b=x===0||y===0;p(x,y,c[0]*(b?1.1:1)+k,c[1]*(b?1.1:1)+k,c[2]*(b?1.1:1)+k);});});
    tile(nom+'Cut',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=x%8===7||y%8===7||x%8===0||y%8===0;const f=b?.85:1;p(x,y,c[0]*f+k,c[1]*f+k,c[2]*f+k);}));
  });
  // Abejas
  tile('beeNestTop',(p,r)=>cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5),k=n(r,10);p(x,y,(Math.floor(d)%2?196:210)+k,(Math.floor(d)%2?150:170)+k,70+k);}));
  tile('beeNestSide',(p,r)=>cada((x,y)=>{const k=n(r,12)+(y%4===0?-20:0);p(x,y,200+k,158+k,72+k);}));
  tile('beeNestFront',(p,r)=>cada((x,y)=>{const k=n(r,12)+(y%4===0?-20:0);const h=Math.hypot(x-7.5,y-9)<2.5;p(x,y,h?40:200+k,h?30:158+k,h?20:72+k);}));
  tile('beehiveTop',(p,r)=>{tablones(p,r,[190,150,90]);});
  tile('beehiveSide',(p,r)=>{tablones(p,r,[182,140,84]);cada((x,y)=>{if(y===7||y===8)p(x,y,120,90,50);});});
  tile('beehiveFront',(p,r)=>{tablones(p,r,[182,140,84]);cada((x,y)=>{if(y>=9&&y<=11&&x>=5&&x<=10)p(x,y,50,34,20);});});
  tile('honeyBlock',(p,r)=>cada((x,y)=>{const b=x<2||y<2||x>13||y>13,k=n(r,8);p(x,y,(b?240:250)+k,(b?160:190)+k,(b?30:60)+k,210);}));
  tile('honeycombBlock',(p,r)=>cada((x,y)=>{const hx=(x+(Math.floor(y/4)%2)*2)%4, b=hx===0||y%4===0,k=n(r,10);p(x,y,(b?200:236)+k,(b?130:170)+k,(b?30:50)+k);}));
  // Varios
  tile('bell',bloqueMetal([230,190,60]));
  tile('chain',planta((p,r)=>{for(let y=0;y<16;y++){const o=y%4<2;p(7,y,70,74,86);p(8,y,o?110:60,o?114:64,o?128:76);}}));
  tile('campfireLog',(p,r)=>cada((x,y)=>{const k=n(r,12);const corte=y<3||y>12;p(x,y,(corte?150:92)+k,(corte?112:62)+k,(corte?70:38)+k);}));
  tile('campfireFire',planta((p,r)=>{for(let y=2;y<13;y++){const w=Math.round((13-y)*.4);for(let x=8-w;x<=7+w;x++)if(r()<.8)p(x,y,255,120+(13-y)*9,30);}for(let y=13;y<16;y++)for(let x=1;x<15;x++)p(x,y,(y===13?150:92)+n(r,12),(y===13?112:62)+n(r,10),(y===13?70:38)+n(r,8));}));
  tile('soulCampfireFire',planta((p,r)=>{for(let y=2;y<13;y++){const w=Math.round((13-y)*.4);for(let x=8-w;x<=7+w;x++)if(r()<.8)p(x,y,60,180+(13-y)*5,230);}for(let y=13;y<16;y++)for(let x=1;x<15;x++)p(x,y,(y===13?150:92)+n(r,12),(y===13?112:62)+n(r,10),(y===13?70:38)+n(r,8));}));
  tile('targetSide',(p,r)=>cada((x,y)=>{const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5)),k=n(r,8);const rojo=Math.floor(d)%4<2;p(x,y,(rojo?210:230)+k,(rojo?50:220)+k,(rojo?50:200)+k);}));
  tile('targetTop',(p,r)=>cada((x,y)=>{const k=n(r,8);p(x,y,210+k,190+k,150+k);}));
  tile('lodestoneTop',(p,r)=>{piedra(p,r);cada((x,y)=>{if(Math.hypot(x-7.5,y-7.5)<3)p(x,y,90,90,96);});});
  tile('lodestoneSide',(p,r)=>{piedra(p,r);cada((x,y)=>{if(y<3||y>12)p(x,y,150,150,156);});});
  tile('anchorTop',(p,r)=>cada((x,y)=>{const k=n(r,8);const brillo=Math.hypot(x-7.5,y-7.5)<4;p(x,y,brillo?190:40+k,brillo?80:20+k,brillo?240:56+k);}));
  tile('anchorSide',(p,r)=>cada((x,y)=>{const k=n(r,8);const v=((x+y)%6===0);p(x,y,(v?120:40)+k,(v?40:24)+k,(v?200:60)+k);}));
  tile('scaffoldTop',(p,r)=>cada((x,y)=>{const b=x<2||y<2||x>13||y>13||x===y||x===15-y;p(x,y,b?214:0,b?180:0,b?90:0,b?255:0);}));
  tile('scaffoldSide',(p,r)=>cada((x,y)=>{const b=x<2||x>13||y<2||(y>6&&y<9);p(x,y,b?200:0,b?168:0,b?84:0,b?255:0);}));
  tile('bamboo',planta((p,r)=>{for(let y=0;y<16;y++){const nudo=y%6===0;for(let x=6;x<=9;x++)p(x,y,nudo?110:120+(x-6)*12,nudo?150:170+(x-6)*8,nudo?50:60);}p(10,5,90,160,50);p(11,4,90,160,50);p(4,11,90,160,50);p(5,10,90,160,50);}));
  tile('kelp',planta((p,r)=>{for(let y=0;y<16;y++){const x=7+Math.round(Math.sin(y*.7)*1.5);p(x,y,70,130,40);p(x+1,y,90,150,50);if(y%3===0)p(x+2,y,60,120,40);}}));
  tile('seagrass',planta((p,r)=>{for(let b=0;b<7;b++){const x0=2+Math.floor(r()*12),h=6+Math.floor(r()*9);for(let y=15;y>15-h;y--)p(clamp(x0+Math.round((15-y)*(r()-.5)*.3),0,15),y,60+n(r,20),130+(15-y)*4+n(r,20),50);}}));
  tile('seaPickle',planta((p,r)=>{for(const [x0,h] of [[5,6],[9,8],[7,4]])for(let y=16-h;y<16;y++){p(x0,y,110,140,60);p(x0+1,y,90,120,50);}}));
  tile('azaleaTop',hojas(.05)); tile('azaleaSide',(p,r)=>{hojas(.2)(p,r);cada((x,y)=>{if(y>10&&(x===7||x===8))p(x,y,110,80,50);});});
  tile('azaleaFlower',(p,r)=>{hojas(.05)(p,r);for(let k=0;k<10;k++)p(Math.floor(r()*16),Math.floor(r()*16),220,110,200);});
  tile('sporeBlossom',planta((p,r)=>{for(let a=0;a<6;a++){const t=a/6*Math.PI*2;for(let d=1;d<7;d++)p(7.5+Math.cos(t)*d,7.5+Math.sin(t)*d,230,120+d*8,170);}p(7,7,120,170,60);p(8,8,120,170,60);}));
  tile('hangingRoots',planta((p,r)=>{for(let k=0;k<6;k++){const x0=2+Math.floor(r()*12),l=5+Math.floor(r()*9);for(let y=0;y<l;y++)p(x0+(y%4===3?1:0),y,160,110,80);}}));
  tile('blueIce',(p,r)=>cada((x,y)=>{const k=n(r,10);const g=(x+2*y)%9===0;p(x,y,(g?140:110)+k,(g?180:160)+k,245);}));
  tile('powderSnow',(p,r)=>cada((x,y)=>{const k=n(r,12);p(x,y,240+k,244+k,250);}));
  // Bloques de oficio de los aldeanos
  tile('cartoTop',(p,r)=>{tablones(p,r,[150,112,70]);cada((x,y)=>{if(x>2&&x<13&&y>2&&y<13){const k=n(r,8);p(x,y,220+k,210+k,170+k);if((x*y)%7===0)p(x,y,120,100,70);}});});
  tile('cartoSide',(p,r)=>{tablones(p,r,[120,86,52]);});
  tile('loomTop',(p,r)=>{tablones(p,r,[180,140,90]);cada((x,y)=>{if(x>3&&x<12&&y>3&&y<12&&(x+y)%2)p(x,y,220,220,220);});});
  tile('loomSide',(p,r)=>{tablones(p,r,[160,120,76]);cada((x,y)=>{if(y>=5&&y<=10&&x%3===1)p(x,y,230,230,230);});});
  tile('smokerTop',(p,r)=>{piedra(p,r);cada((x,y)=>{if(x>3&&x<12&&y>3&&y<12)p(x,y,60,60,62);});});
  tile('smokerSide',(p,r)=>{tablones(p,r,[100,76,50]);cada((x,y)=>{if(y<4||y>11){const k=n(r,8);p(x,y,90+k,90+k,92+k);}});});
  tile('smokerFront',(p,r)=>{tablones(p,r,[100,76,50]);cada((x,y)=>{if(y>=7&&y<=11&&x>=4&&x<=11)p(x,y,30,24,20);if(y<4){const k=n(r,8);p(x,y,90+k,90+k,92+k);}});});
  tile('blastTop',(p,r)=>{piedra(p,r);cada((x,y)=>{if(Math.hypot(x-7.5,y-7.5)<3)p(x,y,40,40,44);});});
  tile('blastSide',bloqueMetal([150,150,156]));
  tile('blastFront',(p,r)=>{bloqueMetal([150,150,156])(p,r);cada((x,y)=>{if(y>=6&&y<=11&&x>=4&&x<=11)p(x,y,y%2?40:70,40,46);});});
  tile('composterSide',(p,r)=>{tablones(p,r,[160,110,60]);cada((x,y)=>{if(x<2||x>13)p(x,y,110,76,40);});});
  tile('composterTop',(p,r)=>cada((x,y)=>{const b=x<2||y<2||x>13||y>13,k=n(r,12);p(x,y,b?140+k:80+k,b?96+k:70+k,b?54+k:40+k);}));
  tile('stonecutterTop',(p,r)=>{piedra(p,r);cada((x,y)=>{if(y===7||y===8)p(x,y,200,200,210);});});
  tile('stonecutterSide',(p,r)=>{piedra(p,r);cada((x,y)=>{if(y<6)p(x,y,0,0,0,0);});});
  tile('lecternTop',(p,r)=>{tablones(p,r,[170,130,80]);cada((x,y)=>{if(x>3&&x<12&&y>2&&y<13)p(x,y,x===7||x===8?140:236,x===7||x===8?100:230,x===7||x===8?60:210);});});
  tile('lecternSide',(p,r)=>tablones(p,r,[150,112,70]));
  tile('fletchTop',(p,r)=>{tablones(p,r,[200,180,130]);cada((x,y)=>{if(x===y||x===15-y)p(x,y,150,150,150);});});
  tile('fletchSide',(p,r)=>{tablones(p,r,[200,180,130]);cada((x,y)=>{if(y>=6&&y<=8&&x>4&&x<11)p(x,y,240,240,240);});});
  tile('cauldronSide',(p,r)=>{bloqueMetal([70,70,76])(p,r);cada((x,y)=>{if(y>12&&x>3&&x<12)p(x,y,0,0,0,0);});});
  tile('cauldronTop',(p,r)=>cada((x,y)=>{const b=x<2||y<2||x>13||y>13,k=n(r,8);p(x,y,b?80+k:40+k,b?80+k:40+k,b?86+k:46+k);}));
  tile('jukeboxTop',(p,r)=>{tablones(p,r,[120,80,56]);cada((x,y)=>{if(y===7||y===8)p(x,y,30,24,20);});});
  tile('jukeboxSide',(p,r)=>{tablones(p,r,[120,80,56]);cada((x,y)=>{if(x<2||x>13||y<2||y>13)p(x,y,80,54,36);});});
  tile('mudBrickDark',(p,r)=>ladrillos(p,r,[140,110,90],[90,70,56]));
  tile('mycelium',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,14)+(pn(x,y,8,s)-.5)*16;const m=r()<.12;p(x,y,(m?150:112)+k,(m?130:92)+k,(m?150:108)+k);});});
  tile('myceliumSide',(p,r)=>{tierra(p,r);cada((x,y)=>{if(y<3||(y===3&&r()<.5)){const k=n(r,12);p(x,y,112+k,92+k,108+k);}});});
  tile('podzol',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,16)+(pn(x,y,8,s)-.5)*18;const hoja=r()<.2;p(x,y,(hoja?120:92)+k,(hoja?80:62)+k,(hoja?40:28)+k);});});
  tile('podzolSide',(p,r)=>{tierra(p,r);cada((x,y)=>{if(y<3||(y===3&&r()<.5)){const k=n(r,12);p(x,y,92+k,62+k,28+k);}});});
  tile('mossBlock',(p,r)=>{const s=S();cada((x,y)=>{const k=n(r,16)+(pn(x,y,4,s)-.5)*24;p(x,y,86+k,120+k,40+k);});});
  /* ---- Cultivos (edición 28) ---- */
  const brotes=(e,max,colHoja,fruto)=>planta((p,r)=>{const alto=2+Math.round(e/max*8);
    for(let c=0;c<4;c++){const x0=2+c*4;for(let y=15;y>15-alto;y--){const k=n(r,16);p(x0,y,colHoja[0]+k,colHoja[1]+k,colHoja[2]+k);if(y<15-alto+3){p(x0-1,y,colHoja[0]*.85+k,colHoja[1]*.85+k,colHoja[2]*.85+k);p(x0+1,y+1,colHoja[0]*.9,colHoja[1]*.9,colHoja[2]*.9);}}
      if(fruto&&e===max){p(x0,15,...fruto);p(x0+1,15,...fruto);p(x0,14,...fruto.map(v=>v*.85));}}});
  for(let e=0;e<4;e++){tile('carrots'+e,brotes(e,3,[70,160,40],[240,140,30]));tile('potatoes'+e,brotes(e,3,[80,150,50],[200,170,90]));tile('beetroots'+e,brotes(e,3,[70,130,50],[170,30,50]));}
  tile('stem',planta((p,r)=>{for(let y=4;y<16;y++){const x=7+Math.round(Math.sin(y*.6));p(x,y,90,170,40);if(y%4===0){p(x+1,y,80,150,40);p(x+2,y-1,80,150,40);}}}));
  tile('stemRipe',planta((p,r)=>{for(let y=4;y<16;y++){const x=7+Math.round(Math.sin(y*.6));p(x,y,150,120,40);if(y%4===0){p(x+1,y,140,110,40);p(x+2,y-1,140,110,40);}}}));
  for(let e=0;e<4;e++)tile('berryBush'+e,planta((p,r)=>{const t=4+e*3;for(let k=0;k<16+e*14;k++){const x=Math.floor(8+(r()-.5)*t*1.4),y=15-Math.floor(r()*t);p(x,y,40+n(r,20),90+n(r,30),40,255);}
    if(e>=2)for(let k=0;k<(e===3?9:4);k++)p(3+Math.floor(r()*10),16-t+Math.floor(r()*(t-2)),200,20+n(r,20),40);}));
  tile('farmlandWet',(p,r)=>cada((x,y)=>{const k=n(r,10);const surco=y%4===0||y%4===1&&r()<.3;p(x,y,(surco?40:60)+k,(surco?24:36)+k,(surco?14:22)+k);}));
  tile('pathSide',(p,r)=>{tierra(p,r);cada((x,y)=>{if(y<2){const k=n(r,12);p(x,y,148+k,122+k,66+k);}});});
  /* =========================================================
     Retexturizado al estilo de la edición Java: paletas de
     pocos tonos, piezas con canto claro y sombra, y patrones
     reconocibles (adoquín, ladrillos, lana tejida, arenisca por
     capas, purpur en baldosas...). Sustituye a las baldosas
     anteriores con el mismo nombre.
     ========================================================= */
  const re=(nom,gen)=>{if(T[nom]!==undefined)_genTiles[T[nom]]=gen;};
  // Celdas de Voronoi periódicas (adoquín, grava, pizarra empedrada)
  const celdas=(nsem,s)=>{const pts=[];for(let i=0;i<nsem;i++)pts.push([hash2(i,1,s)*16,hash2(i,2,s)*16]);const info=new Int16Array(256);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){let d1=1e9,id=0;for(let i=0;i<nsem;i++){let dx=Math.abs(x+.5-pts[i][0]),dy=Math.abs(y+.5-pts[i][1]);dx=Math.min(dx,16-dx);dy=Math.min(dy,16-dy);const d=dx*dx+dy*dy;if(d<d1){d1=d;id=i;}}info[y*16+x]=id;}
    return (x,y)=>info[(((y%16)+16)%16)*16+(((x%16)+16)%16)];};
  // Piedras con junta: borde oscuro abajo/derecha, luz arriba/izquierda y tono propio por piedra
  const empedrado=(nsem,s,junta,tonos,luz=1.16,sombra=.84)=>(p,r)=>{const C=celdas(nsem,s);cada((x,y)=>{const id=C(x,y);
    if(C(x+1,y)!==id||C(x,y+1)!==id)return p(x,y,...junta);
    let c=tonos[hash2(id,3,s)*tonos.length|0];const h=hp(x,y,s+5);
    if(C(x-1,y)!==id||C(x,y-1)!==id)c=tono(c,luz);else if(C(x+2,y)!==id||C(x,y+2)!==id)c=tono(c,sombra);else if(h<.12)c=tono(c,.92);else if(h>.92)c=tono(c,1.06);
    p(x,y,...c);});};
  re('cobble',empedrado(11,501,[74,74,76],[[122,122,122],[136,136,136],[112,112,112],[150,150,150],[128,128,128]]));
  re('mossyCobble',(p,r)=>{_genTiles[T.cobble](p,r);const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.7+hp(x,y,s+1)*.3;
    if(v>.56)p(x,y,...escala(v,[.64,.74],[[84,104,54],[98,122,62],[112,138,70]]));});});
  re('cobbledDeepslate',empedrado(14,503,[36,36,40],[[76,76,82],[86,86,92],[66,66,72],[96,96,102]]));
  re('gravel',(p,r)=>{const C=celdas(22,507);cada((x,y)=>{const id=C(x,y);const tonos=[[131,127,126],[106,101,100],[156,150,149],[122,112,108],[144,138,136],[92,88,88]];
    let c=tonos[hash2(id,3,507)*tonos.length|0];if(C(x+1,y)!==id&&C(x,y+1)!==id)c=[70,66,66];else if(C(x+1,y)!==id||C(x,y+1)!==id)c=tono(c,.8);else if(C(x-1,y)!==id||C(x,y-1)!==id)c=tono(c,1.12);
    p(x,y,...c);});});
  // Superficie
  re('grassTop',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.5+hp(x,y,s+1)*.5;const c=escala(v,[.26,.5,.78],[150,176,198,222]);p(x,y,c,c,c,TINTE_A);});});
  re('grassSide',(p,r)=>{tierra(p,r);const s=S();for(let x=0;x<TS;x++){const h=3+(hp(x,0,s)<.5?0:1)+(hp(x,1,s)<.3?1:0)+(hp(x,2,s)<.12?1:0);
    for(let y=0;y<h;y++){const v=hp(x,y,s+3);const c=y===h-1?150:escala(v,[.3,.65],[168,192,214]);p(x,y,c,c,c,TINTE_A);}}});
  re('sand',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.4+hp(x,y,s+1)*.6;p(x,y,...escala(v,[.12,.4,.8,.95],[[196,186,132],[212,202,150],[219,211,160],[226,219,172],[234,228,186]]));});});
  re('redSand',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.4+hp(x,y,s+1)*.6;p(x,y,...escala(v,[.12,.4,.8,.95],[[160,80,26],[181,93,32],[190,102,33],[200,112,40],[210,126,52]]));});});
  re('snow',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.5+hp(x,y,s+1)*.5;p(x,y,...escala(v,[.18,.8],[[226,236,238],[242,250,250],[250,255,255]]));});});
  re('clay',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.5+hp(x,y,s+1)*.5;p(x,y,...escala(v,[.2,.45,.8],[[144,150,162],[156,162,175],[162,168,181],[174,180,192]]));});});
  // Piedras naturales moteadas
  const moteado=(tonos,umb,sc=8)=>(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,sc,sc,s)*.6+hp(x,y,s+1)*.4;p(x,y,...escala(v,umb,tonos));});};
  re('granite',moteado([[128,86,70],[149,103,85],[160,114,98],[176,126,108],[190,140,124]],[.25,.5,.7,.86]));
  re('diorite',moteado([[120,120,122],[160,160,162],[188,188,190],[210,210,212],[230,230,232]],[.18,.36,.62,.84]));
  re('andesite',moteado([[108,108,110],[124,124,126],[136,136,136],[150,150,150],[162,162,164]],[.2,.42,.68,.86]));
  re('tuff',moteado([[92,94,86],[106,108,100],[114,116,106],[126,128,118],[98,90,82]],[.2,.45,.75,.92]));
  re('bedrock',moteado([[34,34,34],[54,54,54],[86,86,86],[112,112,112],[140,140,140]],[.22,.44,.66,.86],4));
  re('obsidian',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.6+hp(x,y,s+1)*.4,e=pn2(x+y,y,8,16,s+2);
    let c=escala(v,[.3,.7],[[8,6,14],[16,11,26],[26,18,40]]);if(e>.72)c=e>.82?[62,42,90]:[42,26,64];p(x,y,...c);});});
  // Ladrillos de piedra (y variantes) al estilo original
  const ladrPiedra=(p,r,s)=>cada((x,y)=>{const fila=y>>3,lx=(x+(fila?4:0))%8,ly=y&7,v=pn2(x,y,8,8,s)*.6+hp(x,y,s+1)*.4;
    if(ly===7||lx===7)return p(x,y,86,86,88);
    let c=escala(v,[.3,.66],[112,122,132]);if(ly===0||lx===0)c+=14;else if(ly===6||lx===6)c-=12;p(x,y,c,c,c+1);});
  re('stoneBricks',(p,r)=>ladrPiedra(p,r,S()));
  re('mossyStoneBricks',(p,r)=>{ladrPiedra(p,r,S());const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.7+hp(x,y,s+1)*.3;
    if(v>.58||(y>=6&&y<=8&&v>.46))p(x,y,...escala(v,[.66,.76],[[80,100,52],[96,120,60],[112,138,70]]));});});
  re('crackedBricks',(p,r)=>{ladrPiedra(p,r,S());const s=S();for(let k=0;k<4;k++){let x=hash2(k,1,s)*16|0,y=hash2(k,2,s)*16|0;for(let q=0;q<8;q++){p(x,y,60,60,62);p(x+1,y,98,98,100);x+=hash2(k,q,s+1)<.5?1:-1;y+=1;}}});
  // Ladrillos de arcilla, del Nether, de barro, del End y de prismarina
  re('brick',(p,r)=>ladrillos(p,r,[146,84,68],[168,158,150],4,8));
  re('netherBrick',(p,r)=>ladrillos(p,r,[50,25,30],[22,11,14],4,8));
  re('netherBricks',(p,r)=>ladrillos(p,r,[50,25,30],[22,11,14],4,8));
  re('mudBricks',(p,r)=>ladrillos(p,r,[140,106,78],[102,76,56],4,8));
  re('endBricks',(p,r)=>ladrillos(p,r,[220,224,162],[178,180,128],4,8));
  re('prismarineBricks',(p,r)=>ladrillos(p,r,[100,170,150],[62,104,96],4,8));
  re('deepslateBricks',(p,r)=>ladrillos(p,r,[76,76,82],[40,40,44],4,8));
  re('deepslateTiles',(p,r)=>ladrillos(p,r,[58,58,64],[30,30,34],4,4));
  re('tuffBricks',(p,r)=>ladrillos(p,r,[110,114,102],[68,70,62],4,8));
  // Vidrio: marco claro con reflejos en diagonal
  re('glass',(p,r)=>cada((x,y)=>{const borde=x===0||y===0||x===15||y===15;
    if(borde)return p(x,y,...((x*7+y*3)%5===0?[168,204,214]:[214,238,244]));
    const raya=(x+y===7&&x>=2&&x<=5)||(x+y===8&&x>=3&&x<=4)||(x+y===19&&x>=9&&x<=12)||(x+y===20&&x>=10&&x<=11)||(x===1&&y===1)||(x===14&&y===14);
    if(raya)p(x,y,236,248,250);else if((x===1||y===1)&&(x+y)%4===0)p(x,y,200,226,232);else p(x,y,0,0,0,0);}));
  // Arenisca por capas
  const arenisca=(base,lado)=>(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s),g=pn2(x,y,4,16,s+1);let f;
    if(!lado)f=escala(pn2(x,y,8,8,s+2)*.5+h*.5,[.15,.8],[.94,1,1.04]);
    else if(y<3)f=h<.3?.95:h>.8?1.05:1;else if(y===3)f=.9;else if(y<12)f=g>.76?.96:1;else if(y===12)f=.86;else f=(y%2?.92:.97)+(h-.5)*.06;
    p(x,y,...tono(base,f));});};
  re('sandstoneSide',arenisca([218,206,160],true)); re('sandstoneTop',arenisca([220,208,162],false));
  re('cutSandstone',(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s);let f=(y===0||y===8)?1.04:(y===7||y===15)?.88:h<.1?.96:1;p(x,y,...tono([218,206,160],f));});});
  // Cuarzo, purpur, piedra del End, prismarina y piedra lisa
  re('quartz',(p,r)=>{const s=S();cada((x,y)=>{const v=hp(x,y,s)*.5+pn2(x,y,8,8,s+1)*.5;p(x,y,...escala(v,[.15,.85],[[226,220,212],[236,230,223],[242,238,232]]));});});
  re('quartzPillar',(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s);let f=(x===0||x===8)?1.03:(x===7||x===15)?.9:(x%4===2)?.97:1;if(h<.08)f-=.03;p(x,y,...tono([236,230,223],f));});});
  re('purpur',(p,r)=>{const s=S();cada((x,y)=>{const lx=x&7,ly=y&7,h=hp(x,y,s);let f=escala(pn2(x,y,8,8,s+1)*.5+h*.5,[.25,.75],[.94,1,1.05]);
    if(lx===7||ly===7)f=.8;else if(lx===0||ly===0)f=1.12;else if(lx===6||ly===6)f=.9;p(x,y,...tono([169,125,169],f));});});
  re('purpurPillar',(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s);let f=(x===0||x===15)?.82:(x===1)?1.1:(x===14)?.9:(x%5===3?.94:1);if(h<.1)f-=.04;p(x,y,...tono([171,128,171],f));});});
  re('endStone',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.5+hp(x,y,s+1)*.5,h=hp(x,y,s+2);
    let c=escala(v,[.22,.62,.86],[[204,208,146],[219,222,158],[228,230,168],[236,238,182]]);if(h<.05)c=[176,180,122];p(x,y,...c);});});
  re('prismarine',(p,r)=>{const s=S();cada((x,y)=>{const v=hp(x>>1,y>>1,s)*.6+pn2(x,y,4,4,s+1)*.4;
    p(x,y,...escala(v,[.2,.4,.6,.8],[[78,120,125],[88,139,133],[99,156,151],[116,173,160],[104,144,160]]));});});
  re('darkPrismarine',(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s);const b=(x&7)===0||(y&7)===0;const c=b?[38,68,56]:h<.15?[46,82,68]:h>.9?[64,106,88]:[52,92,76];p(x,y,...c);});});
  re('smoothStone',(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s);const b=y===0||y===15||x===0||x===15;const c=b?(y===15||x===15?124:144):h<.1?152:h>.92?164:158;p(x,y,c,c,c);});});
  // Metales y gemas
  re('ironBlock',bloqueMetal([220,220,220])); re('goldBlock',bloqueMetal([246,208,62])); re('diamondBlock',bloqueMetal([100,228,220]));
  re('emeraldBlock',bloqueMetal([56,196,100])); re('lapisBlock',bloqueMetal([34,66,160])); re('coalBlock',bloqueMetal([30,30,34]));
  // Nether
  re('soulSand',(p,r)=>{const s=S();cada((x,y)=>{const v=pn2(x,y,8,8,s)*.6+hp(x,y,s+1)*.4;let c=escala(v,[.3,.6,.85],[[62,46,36],[82,62,50],[96,74,60],[110,86,70]]);
    const cara=[[4,4],[5,4],[10,4],[11,4],[6,9],[7,10],[8,10],[9,9]].some(([a,b])=>(x===a&&y===b));if(cara)c=[44,32,26];p(x,y,...c);});});
  re('glowstone',(p,r)=>{const C=celdas(12,511);cada((x,y)=>{const id=C(x,y),h=hash2(id,3,511);let c=escala(h,[.3,.6,.85],[[172,120,60],[216,166,92],[246,210,130],[255,238,176]]);
    if(C(x+1,y)!==id||C(x,y+1)!==id)c=[122,80,40];p(x,y,...c);});});
  re('blackstone',moteado([[26,22,28],[36,30,38],[44,38,46],[56,50,58]],[.25,.6,.85]));
  // Madera: colores de cada tipo como en el original
  re('planks',(p,r)=>tablones(p,r,[162,130,78]));
  re('birchPlanks',(p,r)=>tablones(p,r,[196,178,122])); re('sprucePlanks',(p,r)=>tablones(p,r,[115,85,49]));
  re('junglePlanks',(p,r)=>tablones(p,r,[160,115,81])); re('acaciaPlanks',(p,r)=>tablones(p,r,[168,90,50]));
  re('darkOakPlanks',(p,r)=>tablones(p,r,[67,43,21])); re('mangrovePlanks',(p,r)=>tablones(p,r,[117,54,48]));
  re('cherryPlanks',(p,r)=>tablones(p,r,[226,178,172])); re('palePlanks',(p,r)=>tablones(p,r,[228,218,210]));
  re('logSide',corteza([109,85,50],[76,59,34])); re('logTop',anillos([176,140,88],[109,85,50]));
  re('birchSide',corteza([216,215,210],[180,178,170],true)); re('birchTop',anillos([196,178,122],[216,215,210]));
  re('spruceSide',corteza([58,38,17],[40,26,12])); re('spruceTop',anillos([115,85,49],[58,38,17]));
  re('jungleSide',corteza([85,68,25],[62,48,18])); re('jungleTop',anillos([160,115,81],[85,68,25]));
  re('acaciaSide',corteza([103,96,86],[76,70,62])); re('acaciaTop',anillos([168,90,50],[103,96,86]));
  re('bookshelf',(p,r)=>{tablones(p,r);const cols=[[140,40,40],[40,66,140],[46,110,56],[150,112,40],[104,56,120],[120,80,50]];
    for(const y0 of [1,9]){let x=1;while(x<15){const w=hash2(x,y0,91)<.7?1:2,c=cols[hash2(x,y0,92)*cols.length|0],alto=5+(hash2(x,y0,93)<.4?1:0);
      for(let k=0;k<w&&x<15;k++,x++)for(let y=y0+6-alto;y<y0+6;y++)p(x,y,...tono(c,k===0?1.1:.9));if(hash2(x,y0,94)<.25)x++;}
      for(let x2=0;x2<16;x2++){p(x2,y0-1,...tono([162,130,78],.8));p(x2,y0+6,...tono([162,130,78],.62));}}});
  // Lana tejida, hormigón liso y terracota mate (los 16 colores)
  COLORES16.forEach(([clave,,,c])=>{
    re('lana_'+clave,(p,r)=>{const s=S();cada((x,y)=>{const d=((x+y*2)%4+4)%4,h=hp(x,y,s);let f=[1.05,1,.94,.99][d]+(pn2(x,y,4,4,s+1)-.5)*.08;if(h<.08)f-=.06;p(x,y,...tono(c,f));});});
    re('hormigon_'+clave,(p,r)=>{const s=S();cada((x,y)=>{const h=hp(x,y,s);const f=h<.06?.88:h>.96?.95:.92;p(x,y,...tono(c,f));});});
  });
  /* ---- Bloques útiles y de cultivo al estilo del original ---- */
  const C_TAB=[162,130,78];
  re('craftTop',(p,r)=>{tablones(p,r,[178,142,88]);cada((x,y)=>{const borde=x===0||y===0||x===15||y===15,linea=x===5||x===10||y===5||y===10;
    if(borde)p(x,y,...tono(C_TAB,.55));else if(linea)p(x,y,...tono(C_TAB,(x===5||x===10)&&(y===5||y===10)?.5:.68));else if(x===1||y===1)p(x,y,...tono(C_TAB,1.12));});});
  re('craftSide',(p,r)=>{tablones(p,r);cada((x,y)=>{if(y<3)p(x,y,...tono([178,142,88],y===2?.6:1.05));if(x===0||x===15)p(x,y,...tono(C_TAB,.58));});
    // Sierra a la izquierda y martillo a la derecha
    for(let y=5;y<=12;y++){const w=Math.max(1,Math.round(3-(y-5)*.25));for(let x=2;x<2+w;x++)p(x,y,...(x===2?[200,200,206]:[150,150,158]));if(y%2)p(2+w,y,120,120,128);}
    for(let y=3;y<=5;y++){p(2,y,110,74,40);p(3,y,90,60,30);}
    for(let y=6;y<=13;y++){p(11,y,122,86,46);p(12,y,94,64,34);}
    for(let x=9;x<=14;x++){p(x,4,168,168,176);p(x,5,120,120,128);}});
  const hornoBase=(p,r)=>{piedra(p,r);cada((x,y)=>{if(x===0||y===0)p(x,y,150,150,152);else if(x===15||y===15)p(x,y,84,84,86);});};
  re('furnaceTop',(p,r)=>{hornoBase(p,r);cada((x,y)=>{if(x>=3&&x<=12&&y>=3&&y<=12&&(x===3||y===3||x===12||y===12))p(x,y,98,98,100);});});
  re('furnaceFront',(p,r)=>{hornoBase(p,r);cada((x,y)=>{
    if(y>=2&&y<=5&&x>=3&&x<=12)p(x,y,(y===2?150:120)+(x%3?0:-12),(y===2?150:120)+(x%3?0:-12),(y===2?152:122)+(x%3?0:-12));   // repisa
    if(x>=3&&x<=12&&y>=8&&y<=13){const marco=x===3||x===12||y===8||y===13;p(x,y,...(marco?[64,64,66]:(y===12||y===11)&&x%2?[80,80,82]:[24,22,22]));}});});
  const calabaza=(p,r,cara)=>{const s=S();cada((x,y)=>{const gajo=[0,4,8,12].includes(x),v=hp(x,y,s);
    let c=gajo?[196,98,14]:x%4===1?[236,146,32]:[224,128,22];if(v<.08)c=tono(c,.92);if(y===0||y===15)c=tono(c,.86);p(x,y,...c);});
    if(cara){const L=[255,220,90],O=[250,176,40];
      for(const [x,y] of [[3,5],[4,5],[5,5],[4,6],[10,5],[11,5],[12,5],[11,6]])p(x,y,...L);
      for(let x=3;x<=12;x++){p(x,10,...O);if(x%3!==1)p(x,11,...L);}p(3,9,...O);p(12,9,...O);}};
  re('pumpkinSide',(p,r)=>calabaza(p,r,false)); re('jackFace',(p,r)=>calabaza(p,r,true));
  re('pumpkinTop',(p,r)=>{const s=S();cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5),a=Math.atan2(y-7.5,x-7.5),g=Math.abs(Math.sin(a*4))<.2;
    let c=g?[200,100,16]:[228,132,24];if(hp(x,y,s)<.08)c=tono(c,.92);if(d<1.8)c=[96,70,30];else if(d<2.6)c=[140,110,40];p(x,y,...c);});});
  re('melonSide',(p,r)=>{const s=S();cada((x,y)=>{const f=(x+Math.round(Math.sin(y*.8)*1.2)+16)%5,v=hp(x,y,s);
    let c=f===0?[176,196,60]:f===1?[140,176,48]:[94,146,30];if(v<.08)c=tono(c,.9);p(x,y,...c);});});
  re('melonTop',(p,r)=>{const s=S();cada((x,y)=>{const d=Math.hypot(x-7.5,y-7.5),a=Math.atan2(y-7.5,x-7.5),f=Math.abs(Math.sin(a*5+d*.3));
    let c=f<.25?[170,192,58]:[98,148,32];if(d<1.5)c=[120,90,40];if(hp(x,y,s)<.07)c=tono(c,.9);p(x,y,...c);});});
  re('haySide',(p,r)=>{const s=S();cada((x,y)=>{const v=hp(x,y,s),linea=(x+Math.floor(hp(x,0,s+1)*3))%3===0;
    let c=linea?[176,146,36]:v<.3?[206,176,52]:[222,194,70];if(y===3||y===4||y===11||y===12)c=y%2?[150,50,30]:[176,72,40];p(x,y,...c);});});
  re('hayTop',(p,r)=>{const s=S();cada((x,y)=>{const v=hp(x,y,s),d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));
    let c=v<.25?[176,146,36]:v<.6?[206,176,52]:[226,198,74];if(d>6.5)c=tono(c,.8);p(x,y,...c);});});
  re('cactusSide',(p,r)=>{const s=S();cada((x,y)=>{const borde=x===0||x===15,raya=x===4||x===11,v=hp(x,y,s);
    let c=borde?[34,74,24]:raya?[62,112,40]:v<.2?[76,132,48]:[88,148,56];p(x,y,...c);});
    for(const [x,y] of [[2,3],[7,6],[13,2],[5,11],[10,13],[13,9],[2,14]]){p(x,y,236,236,210);p(x,y+1,40,60,30);}});
  re('cactusTop',(p,r)=>{const s=S();cada((x,y)=>{const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5)),v=hp(x,y,s);
    let c=d>6.6?[34,74,24]:d>5.5?[70,124,44]:v<.2?[98,160,62]:[110,172,70];if(Math.abs(x-7.5)<1&&Math.abs(y-7.5)<1)c=[140,190,90];p(x,y,...c);});});
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
const TINTE_ICONO={azaleaTop:[.47,.67,.18],azaleaSide:[.47,.67,.18],azaleaFlower:[.47,.67,.18],grassTop:[.57,.74,.35],grassSide:[.57,.74,.35],tallGrass:[.57,.74,.35],fern:[.52,.72,.36],leaves:[.47,.67,.18],spruceLeaves:[.38,.6,.38],mangroveLeaves:[.55,.69,.15],bush:[.47,.67,.18]};
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
  // Sombreado del inventario original: arriba a plena luz, cara izquierda al 80 % y derecha al 60 %
  cara(lado,[1.25,.625,0,1.5,4,12+dy],.2,true);
  cara(lado,[1.25,-.625,0,1.5,24,22+dy],.4,true);
  cara(arriba,[1.25,-.625,1.25,.625,4,12+dy],0,false);
  x.setTransform(1,0,0,1,0,0);
  return c;
}
