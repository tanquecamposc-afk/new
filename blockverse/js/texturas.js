"use strict";
/* =========================================================
   Atlas de texturas procedurales: baldosas de 16x16 en
   una rejilla de 16 columnas.
   ========================================================= */
const TS=16, ATW=16;
const T={};
const _genTiles=[];
function tile(nombre,gen){T[nombre]=_genTiles.length;_genTiles.push(gen);}

(function definirBaldosas(){
  const n=(r,v)=>(r()-.5)*v;
  const cada=f=>{for(let y=0;y<TS;y++)for(let x=0;x<TS;x++)f(x,y);};
  // ayudantes reutilizables
  const tierra=(p,r)=>cada((x,y)=>{let k=n(r,28);if(r()<.08)k-=25;p(x,y,134+k,96+k,67+k);});
  const piedra=(p,r)=>cada((x,y)=>{let k=n(r,24);if(r()<.07)k-=30;p(x,y,126+k,126+k,128+k);});
  const pizarra=(p,r)=>cada((x,y)=>{let k=n(r,18);if((x+Math.floor(y/3))%5===0)k-=14;p(x,y,74+k,74+k,82+k);});
  const netherrack=(p,r)=>cada((x,y)=>{let k=n(r,34);if(r()<.12)k-=30;p(x,y,112+k,46+k*.5,44+k*.5);});
  const mena=(base,col,brillo)=>(p,r)=>{base(p,r);
    for(let k=0;k<5;k++){const cx=2+Math.floor(r()*11), cy=2+Math.floor(r()*11);
      for(const [a,b] of [[0,0],[1,0],[0,1],[1,1],[-1,0],[0,-1]])if(r()<.75){const q=n(r,30);p(cx+a,cy+b,col[0]+q,col[1]+q,col[2]+q);}
      p(cx,cy,...brillo);}};
  const tablones=(p,r,R=170,G=135,B=84)=>cada((x,y)=>{let k=n(r,14);const banda=y>>2;
    if(y%4===3)k-=40;if(x===((banda*7+3)%16))k-=35;p(x,y,R+k,G+k,B+k);});
  const ladrillos=(p,r,col,mortero,alto=4,ancho=8)=>cada((x,y)=>{const off=(Math.floor(y/alto)%2)*(ancho/2);const k=n(r,20);
    if(y%alto===alto-1||(x+off)%ancho===ancho-1)p(x,y,mortero[0]+k*.3,mortero[1]+k*.3,mortero[2]+k*.3);else p(x,y,col[0]+k,col[1]+k,col[2]+k);});
  const bloqueMetal=(col)=>(p,r)=>cada((x,y)=>{const b=x===0||y===0||x===15||y===15;const k=n(r,10)+(x+y<10?14:0);
    const f=b?.7:1;p(x,y,col[0]*f+k,col[1]*f+k,col[2]*f+k);});
  const planta=(dibujar)=>(p,r)=>{cada((x,y)=>p(x,y,0,0,0,0));dibujar(p,r);};
  const tallo=(p,x0,y0,y1,col)=>{for(let y=y0;y<=y1;y++)p(x0,y,...col);};

  tile('grassTop',(p,r)=>cada((x,y)=>{let k=n(r,34);if(r()<.1)k+=18;p(x,y,92+k,160+k,52+k*.6);}));
  tile('grassSide',(p,r)=>{tierra(p,r);for(let x=0;x<TS;x++){const h=3+Math.floor(r()*3);for(let y=0;y<h;y++){const k=n(r,30);p(x,y,92+k,160+k,52+k*.6);}}});
  tile('dirt',tierra);
  tile('stone',piedra);
  tile('logSide',(p,r)=>cada((x,y)=>{let k=n(r,16);if(x%4===0)k-=22;if(r()<.05)k-=20;p(x,y,104+k,80+k,50+k);}));
  tile('logTop',(p,r)=>cada((x,y)=>{const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));const k=n(r,12);
    if(d>6.5)p(x,y,98+k,76+k,48+k);else if(Math.floor(d)%2)p(x,y,150+k,116+k,72+k);else p(x,y,178+k,142+k,92+k);}));
  tile('leaves',(p,r)=>cada((x,y)=>{const k=n(r,44);p(x,y,58+k*.6,128+k,40+k*.5,r()<.18?0:255);}));
  tile('sand',(p,r)=>cada((x,y)=>{const k=n(r,18);p(x,y,220+k,207+k,160+k);}));
  tile('planks',(p,r)=>tablones(p,r));
  tile('cobble',(p,r)=>{const pts=[];for(let i=0;i<7;i++)pts.push([r()*TS,r()*TS,r()]);
    cada((x,y)=>{let d1=1e9,d2=1e9,id=0;
      for(const q of pts)for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const dx=x+.5-(q[0]+ox*TS),dy=y+.5-(q[1]+oy*TS),dd=Math.hypot(dx,dy);
        if(dd<d1){d2=d1;d1=dd;id=q[2];}else if(dd<d2)d2=dd;}
      const k=n(r,14);if(d2-d1<1.3)p(x,y,78+k,78+k,80+k);else{const b=112+id*48+k-d1*2;p(x,y,b,b,b+2);}});});
  tile('brick',(p,r)=>ladrillos(p,r,[152,66,50],[190,184,172]));
  tile('glass',(p,r)=>cada((x,y)=>{const borde=x===0||y===0||x===15||y===15;
    const brillo=(x-y===6&&x>7&&x<12)||(x-y===4&&x>3&&x<7)||(x-y===5&&x>4&&x<11);
    if(borde)p(x,y,214,236,244);else if(brillo)p(x,y,250,252,255);else p(x,y,0,0,0,0);}));
  tile('snow',(p,r)=>cada((x,y)=>{const k=n(r,12);p(x,y,240+k,244+k,250+k);}));
  tile('snowSide',(p,r)=>{tierra(p,r);for(let x=0;x<TS;x++){const h=3+Math.floor(r()*3);for(let y=0;y<h;y++){const k=n(r,12);p(x,y,240+k,244+k,250+k);}}});
  tile('bedrock',(p,r)=>cada((x,y)=>{let v=70+n(r,70);if(r()<.3)v=28;p(x,y,v,v,v+3);}));
  tile('coalOre',mena(piedra,[38,38,42],[80,80,86]));
  tile('ironOre',mena(piedra,[214,168,128],[240,205,172]));
  tile('goldOre',mena(piedra,[250,210,50],[255,245,150]));
  tile('diamondOre',mena(piedra,[70,222,212],[200,255,250]));
  tile('redstoneOre',mena(piedra,[200,20,20],[255,90,90]));
  tile('lapisOre',mena(piedra,[30,60,190],[80,120,240]));
  tile('emeraldOre',mena(piedra,[30,200,90],[150,255,180]));
  tile('copperOre',mena(piedra,[210,120,70],[120,200,160]));
  tile('deepslate',pizarra);
  tile('deepslateTop',(p,r)=>cada((x,y)=>{const k=n(r,16);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));p(x,y,78+k-(d>6?10:0),78+k-(d>6?10:0),86+k);}));
  tile('dsCoal',mena(pizarra,[30,30,34],[70,70,76]));
  tile('dsIron',mena(pizarra,[204,160,122],[235,200,170]));
  tile('dsGold',mena(pizarra,[245,205,50],[255,240,150]));
  tile('dsRedstone',mena(pizarra,[190,20,20],[255,80,80]));
  tile('dsLapis',mena(pizarra,[30,60,190],[80,120,240]));
  tile('dsDiamond',mena(pizarra,[70,222,212],[200,255,250]));
  tile('dsCopper',mena(pizarra,[200,115,70],[120,200,160]));
  tile('gravel',(p,r)=>cada((x,y)=>{const k=n(r,40);const c=r()<.3?[140,120,110]:[126,122,122];p(x,y,c[0]+k,c[1]+k,c[2]+k);}));
  tile('obsidian',(p,r)=>cada((x,y)=>{const k=n(r,12);const b=r()<.08;p(x,y,(b?70:20)+k,(b?40:14)+k,(b?100:30)+k);}));
  tile('craftTop',(p,r)=>cada((x,y)=>{const k=n(r,14);
    if(x===0||y===0||x===15||y===15)p(x,y,96+k,70+k,42+k);
    else if(x===5||x===10||y===5||y===10)p(x,y,128+k,96+k,58+k);else p(x,y,178+k,142+k,90+k);}));
  tile('craftSide',(p,r)=>{tablones(p,r);cada((x,y)=>{const k=n(r,10);
    if(y<3||x===0||x===15)p(x,y,100+k,72+k,44+k);
    if(y>=6&&y<=8&&x>=2&&x<=6)p(x,y,160+k,160+k,165+k);
    if(x>=7&&x<=8&&y>=6&&y<=9)p(x,y,70+k,48+k,28+k);
    if(y>=5&&y<=6&&x>=10&&x<=13)p(x,y,150+k,150+k,155+k);
    if(x===11&&y>=7&&y<=13)p(x,y,86+k,60+k,34+k);});});
  tile('furnaceFront',(p,r)=>cada((x,y)=>{const k=n(r,18);const off=((y>>2)%2)*3;
    const v=(y%4===3||(x+off)%6===5)?92:124; p(x,y,v+k,v+k,v+k+2);
    if(y===7&&x>=3&&x<=12)p(x,y,84+k,84+k,86+k);
    if(y>=8&&y<=13&&x>=4&&x<=11)p(x,y,24+k*.4,22+k*.4,22+k*.4);}));
  tile('furnaceTop',(p,r)=>cada((x,y)=>{const k=n(r,14);const b=x===0||y===0||x===15||y===15;p(x,y,(b?96:140)+k,(b?96:140)+k,(b?98:142)+k);}));
  tile('chestTop',(p,r)=>cada((x,y)=>{const k=n(r,16);const b=x===0||y===0||x===15||y===15;
    if(b)p(x,y,78+k,50+k,22+k);else p(x,y,164+k,112+k,52+k*.6);}));
  tile('chestSide',(p,r)=>cada((x,y)=>{const k=n(r,16);const b=x===0||y===0||x===15||y===15||y===5||y===6;
    if(b)p(x,y,78+k,50+k,22+k);else p(x,y,164+k,112+k,52+k*.6);
    if(x>=7&&x<=8&&y>=4&&y<=8){const c=(x===7&&y>4&&y<8)?210:130;p(x,y,c,c,c+5);}}));
  tile('torch',planta((p,r)=>{tallo(p,7,6,15,[120,86,48]);tallo(p,8,6,15,[96,68,36]);
    p(7,4,255,230,120);p(8,4,255,200,80);p(7,5,255,180,60);p(8,5,255,160,40);p(7,3,255,250,200);p(8,3,255,220,120);}));
  tile('bedTop',(p,r)=>cada((x,y)=>{const k=n(r,10);if(y<5)p(x,y,236+k,236+k,240+k);else p(x,y,178+k,30+k*.5,34+k*.5);
    if(x===0||x===15)p(x,y,140+k,110+k,70+k);}));
  tile('bedSide',(p,r)=>cada((x,y)=>{const k=n(r,10);
    if(y<7)p(x,y,0,0,0,0);else if(y<11)p(x,y,178+k,30+k*.5,34+k*.5);else if(y<13)p(x,y,150+k,116+k,70+k);
    else if(x<3||x>12)p(x,y,120+k,90+k,55+k);else p(x,y,0,0,0,0);}));
  tile('tntSide',(p,r)=>cada((x,y)=>{const k=n(r,14);
    if(y>=5&&y<=10){p(x,y,236+k,236+k,230+k);
      const letras=['###.#..#.###','.#..##.#..#.','.#..#.##..#.','.#..#..#..#.'];
      const fy=y-6,fx=x-2;if(fy>=0&&fy<4&&fx>=0&&fx<12&&letras[fy][fx]==='#')p(x,y,30,30,30);}
    else p(x,y,200+k,40+k*.4,30+k*.4);}));
  tile('tntTop',(p,r)=>cada((x,y)=>{const k=n(r,14);const c=Math.hypot(x-7.5,y-7.5)<3;p(x,y,c?90:200+k,c?90:40+k*.4,c?90:30+k*.4);}));
  tile('wool',(p,r)=>cada((x,y)=>{const k=n(r,14)+((x+y)%4===0?-8:0);p(x,y,234+k,234+k,234+k);}));
  tile('tallGrass',planta((p,r)=>{for(let b=0;b<7;b++){const x0=1+Math.floor(r()*14),h=6+Math.floor(r()*8);
    for(let y=15;y>15-h;y--){const k=n(r,30);p(clamp(x0+Math.round((15-y)*(r()-.5)*.3),0,15),y,70+k*.5,140+k,40+k*.4);}}}));
  tile('flowerY',planta((p,r)=>{tallo(p,7,8,15,[60,140,40]);p(6,11,60,160,40);p(8,12,60,160,40);
    for(const [a,b] of [[7,5],[6,6],[8,6],[7,7],[6,4],[8,4],[5,5],[9,5],[5,7],[9,7]])p(a,b,250,220,40);p(7,6,200,140,20);}));
  tile('flowerR',planta((p,r)=>{tallo(p,7,8,15,[60,140,40]);p(8,11,60,160,40);p(6,13,60,160,40);
    for(const [a,b] of [[7,5],[6,6],[8,6],[7,7],[6,4],[8,4],[7,3],[6,7],[8,7],[5,5],[9,5]])p(a,b,220,30,30);p(7,6,60,20,20);}));
  for(let e=0;e<8;e++)tile('wheat'+e,planta((p,r)=>{const alto=3+e*1.6, madura=e===7;
    for(let c=0;c<5;c++){const x0=1+c*3+Math.floor(r()*2);
      for(let y=15;y>15-alto;y--){const k=n(r,20);if(madura&&y<15-alto+4)p(x0,y,200+k,170+k,60+k*.5);else p(x0,y,e>4?120+k:60+k*.5,150+k,40+k*.4);}}}));
  tile('farmland',(p,r)=>cada((x,y)=>{const k=n(r,18);const surco=y%4===0;p(x,y,(surco?70:100)+k,(surco?46:66)+k,(surco?28:40)+k);}));
  tile('cactusSide',(p,r)=>cada((x,y)=>{const k=n(r,14);const borde=x===0||x===15;const linea=x%4===2;
    if(borde)p(x,y,0,0,0,0);else p(x,y,(linea?30:50)+k,(linea?110:140)+k,(linea?30:40)+k);if(!borde&&r()<.05)p(x,y,220,220,180);}));
  tile('cactusTop',(p,r)=>cada((x,y)=>{const k=n(r,14);const b=x===0||y===0||x===15||y===15;
    if(b)p(x,y,0,0,0,0);else p(x,y,70+k,150+k,50+k);}));
  tile('ice',(p,r)=>cada((x,y)=>{const k=n(r,10);const raya=(x+y*2)%11===0;p(x,y,(raya?220:150)+k,(raya?240:195)+k,250);}));
  tile('sandstoneSide',(p,r)=>cada((x,y)=>{const k=n(r,10);const b=y<3?-8:y>12?-14:0;p(x,y,216+k+b,200+k+b,150+k+b);}));
  tile('sandstoneTop',(p,r)=>cada((x,y)=>{const k=n(r,10);p(x,y,222+k,206+k,156+k);}));
  tile('water',(p,r)=>cada((x,y)=>{const k=n(r,16)+Math.sin((x+y)*.8)*8;p(x,y,48+k,90+k,210+k,180);}));
  tile('lava',(p,r)=>cada((x,y)=>{const v=valueNoise(x/4,y/4,77);const k=n(r,20);p(x,y,220+k,90+v*120+k,20+v*30,255);}));
  tile('netherrack',netherrack);
  tile('soulSand',(p,r)=>cada((x,y)=>{const k=n(r,22);const cara=((x%8===2||x%8===5)&&y%8===3)||(y%8===5&&x%8>=2&&x%8<=5);
    p(x,y,(cara?60:92)+k,(cara?44:70)+k,(cara?34:54)+k);}));
  tile('glowstone',(p,r)=>cada((x,y)=>{const k=n(r,40);const v=valueNoise(x/3,y/3,9);p(x,y,200+v*55+k*.3,150+v*80+k*.5,70+v*60+k*.3);}));
  tile('quartzOre',mena(netherrack,[235,225,215],[255,255,255]));
  tile('netherBrick',(p,r)=>ladrillos(p,r,[60,24,30],[30,12,16],4,8));
  tile('netherPortal',(p,r)=>cada((x,y)=>{const v=Math.sin(x*.9+Math.cos(y*.7)*2)*.5+.5;p(x,y,90+v*80,20+v*30,170+v*70,190);}));
  tile('netherGoldOre',mena(netherrack,[250,200,50],[255,240,140]));
  tile('endStone',(p,r)=>cada((x,y)=>{let k=n(r,14);if(r()<.08)k-=18;p(x,y,222+k,224+k,166+k);}));
  tile('endFrameSide',(p,r)=>cada((x,y)=>{const k=n(r,12);if(y<4)p(x,y,50+k,90+k,80+k);else p(x,y,214+k,218+k,160+k);}));
  tile('endFrameTop',(p,r)=>cada((x,y)=>{const k=n(r,12);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));
    p(x,y,d<4?20:50+k,d<4?30:90+k,d<4?30:80+k);}));
  tile('endFrameTopEye',(p,r)=>cada((x,y)=>{const k=n(r,12);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));
    if(d<4){const c=Math.hypot(x-7.5,y-7.5);p(x,y,c<1.5?10:40,c<1.5?40:140+k,c<1.5?20:70);}else p(x,y,50+k,90+k,80+k);}));
  tile('endPortal',(p,r)=>cada((x,y)=>{const e=r()<.06;const c=[[120,220,200],[200,120,240],[250,250,250]][Math.floor(r()*3)];
    p(x,y,e?c[0]:10,e?c[1]:14,e?c[2]:22);}));
  tile('stoneBricks',(p,r)=>ladrillos(p,r,[124,124,124],[88,88,90],8,16));
  tile('mossyStoneBricks',(p,r)=>{ladrillos(p,r,[124,124,124],[88,88,90],8,16);
    cada((x,y)=>{if(valueNoise(x/3,y/3,31)>.55){const k=n(r,20);p(x,y,80+k,120+k,60+k);}});});
  tile('ironBlock',bloqueMetal([220,220,222]));
  tile('goldBlock',bloqueMetal([250,210,60]));
  tile('diamondBlock',bloqueMetal([100,232,224]));
  tile('coalBlock',bloqueMetal([36,36,40]));
  tile('dragonEgg',(p,r)=>cada((x,y)=>{const k=n(r,10);const e=r()<.07;p(x,y,e?120:14+k,e?40:8+k,e?160:22+k);}));
  tile('fire',planta((p,r)=>{for(let x=0;x<TS;x++){const h=6+Math.floor(r()*9);
    for(let y=15;y>15-h;y--){const f=(15-y)/h;p(x,y,255,clamp(220-f*170,40,255),f<.3?80:20,r()<.1?0:230);}}}));
  tile('sapling',planta((p,r)=>{tallo(p,7,9,15,[100,70,40]);tallo(p,8,10,15,[90,62,34]);
    for(let i=0;i<30;i++){const a=r()*Math.PI*2,d=r()*5;p(Math.round(7.5+Math.cos(a)*d),Math.round(6+Math.sin(a)*d*.8),50+n(r,30),130+n(r,40),40);}}));
  tile('sugarCane',planta((p,r)=>{for(const x0 of [3,7,11]){for(let y=0;y<16;y++){const k=n(r,20);p(x0,y,120+k,190+k,90+k);p(x0+1,y,100+k,170+k,70+k);if(y%5===0)p(x0,y,90,150,60);}
    p(x0+2,6+x0%5,110,180,80);}}));
  tile('enchantTop',(p,r)=>cada((x,y)=>{const k=n(r,10);const esq=(x<3||x>12)&&(y<3||y>12);
    if(esq)p(x,y,90,230,220);else if(x===0||y===0||x===15||y===15)p(x,y,30,20,40);else p(x,y,170+k,30+k*.4,40+k*.4);}));
  tile('enchantSide',(p,r)=>cada((x,y)=>{const k=n(r,10);
    if(y<4)p(x,y,170+k,30+k*.4,40+k*.4);else{const b=r()<.08;p(x,y,(b?70:20)+k,(b?40:14)+k,(b?100:30)+k);}}));
  tile('spawner',(p,r)=>cada((x,y)=>{const barra=x%4===0||y%4===0;const k=n(r,20);
    if(barra)p(x,y,40+k,50+k,60+k);else p(x,y,0,0,0,0);}));
  tile('hayTop',(p,r)=>cada((x,y)=>{const k=n(r,20);p(x,y,200+k,170+k,40+k*.5);}));
})();

const NT=_genTiles.length, ATH=Math.ceil(NT/ATW);
const atlas=document.createElement('canvas'); atlas.width=TS*ATW; atlas.height=TS*ATH;
(function construirAtlas(){
  const ctx=atlas.getContext('2d'), img=ctx.createImageData(atlas.width,atlas.height), d=img.data, r=mulberry32(1337);
  const cl=v=>Math.max(0,Math.min(255,v|0));
  _genTiles.forEach((gen,t)=>{
    const ox=(t%ATW)*TS, oy=Math.floor(t/ATW)*TS;
    const p=(x,y,R,G,B,A=255)=>{if(x<0||y<0||x>=TS||y>=TS)return;const i=((oy+y)*atlas.width+ox+x)*4;d[i]=cl(R);d[i+1]=cl(G);d[i+2]=cl(B);d[i+3]=A;};
    gen(p,r);
  });
  ctx.putImageData(img,0,0);
})();
// Coordenadas UV (flipY de three: v=1 arriba)
function uvTile(t){const c=t%ATW, f=Math.floor(t/ATW);return {u0:c/ATW,u1:(c+1)/ATW,v0:1-(f+1)/ATH,v1:1-f/ATH};}

/* ---------- Iconos de objetos (16x16 dibujados) ---------- */
function lienzo16(semillaDib,fn){
  const G=new Array(256).fill(null), rnd=mulberry32(semillaDib);
  const P=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<16&&y<16)G[y*16+x]=c;};
  const linea=(x0,y0,x1,y1,c)=>{const m=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;
    for(let i=0;i<=m;i++)P(x0+(x1-x0)*i/m,y0+(y1-y0)*i/m,c);};
  const elipse=(cx,cy,rx,ry,c,v=16)=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;
    if(dx*dx+dy*dy<=1){const q=(rnd()-.5)*v;P(x,y,[c[0]+q,c[1]+q,c[2]+q]);}}};
  const rect=(x0,y0,x1,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)P(x,y,c);};
  fn({P,linea,elipse,rect,rnd});
  const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d'),img=ctx.createImageData(16,16);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const i=y*16+x;let col=G[i];
    if(!col){const v=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const X=x+a,Y=y+b;return X>=0&&Y>=0&&X<16&&Y<16&&G[Y*16+X];});
      if(v)col=[28,22,18];}
    if(col){img.data[i*4]=clamp(col[0],0,255);img.data[i*4+1]=clamp(col[1],0,255);img.data[i*4+2]=clamp(col[2],0,255);img.data[i*4+3]=255;}
  }
  ctx.putImageData(img,0,0);return c;
}
function lienzoTile(t){
  const c=document.createElement('canvas');c.width=c.height=16;
  c.getContext('2d').drawImage(atlas,(t%ATW)*TS,Math.floor(t/ATW)*TS,TS,TS,0,0,16,16);return c;
}
function iconoCubo(arriba,lado){
  const c=document.createElement('canvas');c.width=48;c.height=48;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const cara=(t,m,osc)=>{x.setTransform(...m);x.drawImage(atlas,(t%ATW)*TS,Math.floor(t/ATW)*TS,TS,TS,0,0,TS,TS);
    if(osc){x.globalCompositeOperation='source-atop';x.fillStyle=`rgba(0,0,0,${osc})`;x.fillRect(0,0,TS,TS);x.globalCompositeOperation='source-over';}};
  cara(lado,[1.25,.625,0,1.5,4,12],.22);
  cara(lado,[1.25,-.625,0,1.5,24,22],.38);
  cara(arriba,[1.25,-.625,1.25,.625,4,12],0);
  return c;
}
