// Generado por tools/build-lovable.py — no editar a mano.
// Hoja de estilo del HUD, extraida de arise-3d.html.
export const GAME_CSS = `:root{
  --void:#04070f; --panel:#101c3f; --panel-2:#18295c; --line:#32509e; --line-hi:#7aa8ff;
  --ink:#f3f7ff; --muted:#a6bce9; --dim:#7789b8;
  --spec:#5ea8ff; --arise:#2fe4ff; --monarch:#bb8cff;
  --cash:#7ee07a; --gem:#5ae2ff; --ticket:#ffc65a; --gold:#ffd24a;
  --xp:#5ce8a6; --hp:#ff4d61; --mana:#4aa8ff;
  --t-C:#b9c9e8; --t-B:#7ee07a; --t-A:#5ad2ff; --t-S:#bb8cff; --t-SE:#ffd24a; --t-M:#ff6b8a;
  --f-display:'Cinzel',Georgia,serif; --f-ui:'Fredoka','Segoe UI',system-ui,sans-serif;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--void);color:var(--ink);font-family:var(--f-ui);overflow:hidden;
     -webkit-tap-highlight-color:transparent;user-select:none}
#app{position:relative;height:100%;width:100%;overflow:hidden;background:var(--void)}
canvas#stage{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
/* viñeta de acabado sobre la escena 3D */
#app::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;
  background:radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 46%, rgba(4,8,18,.42) 100%)}
.hud{position:absolute;inset:0;pointer-events:none;
     padding:calc(10px + env(safe-area-inset-top,0px)) 12px calc(10px + env(safe-area-inset-bottom,0px))}
.stroke{paint-order:stroke fill;-webkit-text-stroke:3.5px rgba(3,7,18,.92)}
.frame{background:linear-gradient(180deg,rgba(24,41,92,.94),rgba(10,17,42,.94));border:2px solid var(--line);
       border-radius:14px;box-shadow:inset 0 1px 0 rgba(150,190,255,.32),0 8px 22px rgba(0,0,0,.5)}

/* --- top --- */
.top{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:12px;right:12px;
     display:flex;gap:10px;align-items:flex-start;justify-content:space-between}
.pcard{padding:9px 11px 10px;display:grid;gap:5px;min-width:238px}
.prow{display:flex;align-items:center;gap:9px}
.rankbadge{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:12px;
  font-family:var(--f-display);font-weight:800;font-size:19px;color:#0a1020;
  background:linear-gradient(180deg,#ffe692,#ffb43d);border:2px solid #8a5714;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.62),0 3px 0 #6f4510}
.pname{font-weight:600;font-size:15px;line-height:1.15}
.psub{font-size:11.5px;color:var(--muted)}
.bar{height:15px;border-radius:99px;background:#09102a;border:2px solid #09102a;position:relative;
     box-shadow:inset 0 2px 5px rgba(0,0,0,.65)}
.bar>i{display:block;height:100%;max-width:100%;border-radius:99px;transition:width .16s ease;
       box-shadow:inset 0 2px 0 rgba(255,255,255,.36)}
.bar>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;
          font-weight:600;line-height:1;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.95)}
.bar.hp>i{background:linear-gradient(180deg,#ff8d99,#dc1f34)}
.bar.mana>i{background:linear-gradient(180deg,#8ccaff,#1f6fd0)}
.bar.xp>i{background:linear-gradient(180deg,#96f8cd,#1fae74)}
.target{flex:1;max-width:430px;display:grid;gap:4px;padding:8px 12px;margin-top:56px}
.trow{display:flex;align-items:center;gap:9px}
.lvd{width:34px;height:34px;flex:none;display:grid;place-items:center;transform:rotate(45deg);border-radius:8px;
     background:linear-gradient(180deg,#2c4079,#141f4c);border:2px solid #86a2e0}
.lvd>i{transform:rotate(-45deg);font-style:normal;font-size:12px;font-weight:700}
.tname{flex:1;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tdps{font-size:11px;color:var(--gold);font-variant-numeric:tabular-nums}
.thp{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;text-align:right}
.infocard{padding:8px 12px;text-align:right;display:grid;gap:2px;min-width:158px}
.infocard b{font-size:13.5px;color:#cfe6ff;font-weight:600}
.infocard span{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}

/* --- hex cluster --- */
.hexwrap{position:absolute;left:10px;top:50%;transform:translateY(-50%);display:grid;gap:5px;pointer-events:auto}
.hexrow{display:flex;gap:5px}
.hexrow.odd{margin-left:27px}
.hex{width:52px;height:58px;display:grid;place-items:center;cursor:pointer;border:0;padding:0;
  clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);
  font-size:20px;color:#0a1020;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55));
  transition:transform .08s ease,filter .15s}
.hex:hover{filter:drop-shadow(0 3px 4px rgba(0,0,0,.55)) brightness(1.13)}
.hex:active{transform:translateY(2px)}
.hex:focus-visible{outline:3px solid var(--arise);outline-offset:2px}
.hx-shop{background:linear-gradient(180deg,#ffd68a,#e08a1e)}
.hx-items{background:linear-gradient(180deg,#ffa3a3,#d42b3f)}
.hx-shadow{background:linear-gradient(180deg,#c9a9ff,#7a3fe0)}
.hx-stats{background:linear-gradient(180deg,#9be0ff,#1f86d8)}
.hx-map{background:linear-gradient(180deg,#a6f0ba,#25a95c)}
.hx-help{background:linear-gradient(180deg,#d7dff0,#7f8db0)}

/* --- bottom --- */
.bottom{position:absolute;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom,0px));
        display:flex;align-items:flex-end;gap:12px;justify-content:space-between}
.wallet{display:grid;gap:5px;pointer-events:none}
.coin{display:flex;align-items:center;gap:8px;padding:4px 13px 4px 8px;border-radius:99px;font-size:21px;
  font-weight:700;font-variant-numeric:tabular-nums;background:linear-gradient(180deg,rgba(24,41,92,.9),rgba(8,15,36,.9));
  border:2px solid var(--line);box-shadow:inset 0 1px 0 rgba(150,190,255,.3),0 6px 16px rgba(0,0,0,.45)}
.coin i{font-style:normal;font-size:18px}
.c-cash{color:var(--cash)} .c-gem{color:var(--gem)} .c-tk{color:var(--ticket)}
.dock{display:grid;gap:7px;justify-items:center;flex:1}
.squad{display:flex;gap:6px;pointer-events:none}
.slot{width:52px;height:56px;border-radius:12px;display:grid;place-items:center;gap:1px;
  background:linear-gradient(180deg,rgba(28,46,102,.96),rgba(10,18,44,.96));border:2px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(150,190,255,.3);position:relative;overflow:hidden}
.slot.empty{opacity:.4;border-style:dashed}
.slot .g{font-size:18px;line-height:1}
.slot .n{font-size:8.5px;font-weight:600;max-width:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slot .d{font-size:9px;color:#bfe2ff;font-variant-numeric:tabular-nums}
.hotbar{display:flex;gap:7px;align-items:flex-end;pointer-events:auto;flex-wrap:wrap;justify-content:center}
[hidden]{display:none !important}
.act{position:relative;width:64px;height:62px;border-radius:14px;cursor:pointer;border:2px solid rgba(6,12,28,.85);
  display:grid;place-items:center;gap:1px;color:#0a1020;font-family:var(--f-ui);overflow:hidden;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 4px 0 rgba(5,10,24,.8),0 8px 16px rgba(0,0,0,.45);
  transition:transform .07s ease,filter .15s}
.act:hover{filter:brightness(1.1)}
.act:active{transform:translateY(3px);box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 1px 0 rgba(5,10,24,.8)}
.act:focus-visible{outline:3px solid var(--arise);outline-offset:3px}
.act .ic{font-size:20px;line-height:1}
.act .lb{font-size:8.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}
.act kbd{position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-family:var(--f-ui);font-size:9px;
  font-weight:600;padding:1px 6px;border-radius:6px;background:#0c1634;color:#cfe0ff;border:1px solid var(--line)}
.act .st{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;
  padding:1px 6px;border-radius:6px;background:#0c1634;color:var(--dim);border:1px solid var(--line)}
.act.on .st{color:#0a1020;background:var(--arise);border-color:#0b5f70}
.act .cd{position:absolute;inset:0;background:rgba(4,8,20,.72);transform-origin:bottom;pointer-events:none}
.a-punch{background:linear-gradient(180deg,#ff9f9f,#d62b3f)}
.a-weapon{background:linear-gradient(180deg,#a9c6ff,#3c5fd6)}
.a-arise{background:linear-gradient(180deg,#9ae9ff,#1fa5dd)}
.a-dash{background:linear-gradient(180deg,#ffe08a,#e0a41e)}
.a-auto{background:linear-gradient(180deg,#a9f0ba,#28a75e)}
.a-mount{background:linear-gradient(180deg,#d3b2ff,#7a45e0)}
.a-portal{background:linear-gradient(180deg,#8af0ff,#17b9d8)}
.a-form{background:linear-gradient(180deg,#f0b8ff,#6a22c8)}
.a-form.on{box-shadow:0 0 0 3px #f0b8ff,0 0 26px #b07cff}
.act .st.t{font-variant-numeric:tabular-nums}

/* --- notificaciones --- */
.lane{position:absolute;left:12px;top:calc(150px + env(safe-area-inset-top,0px));display:grid;gap:6px;justify-items:start;pointer-events:none;max-width:260px;z-index:4}
.note{padding:7px 13px;border-radius:11px;font-size:12.5px;font-weight:600;border:2px solid var(--line);
  background:linear-gradient(180deg,rgba(24,41,92,.96),rgba(9,16,38,.96));box-shadow:0 6px 18px rgba(0,0,0,.5);
  animation:slide .32s ease both}
@keyframes slide{from{opacity:0;transform:translateX(-26px)}to{opacity:1;transform:none}}
.banner{position:absolute;left:50%;top:22%;transform:translateX(-50%);text-align:center;pointer-events:none;
  font-family:var(--f-display);font-weight:800;font-size:34px;letter-spacing:.1em;
  animation:bpop .5s ease both}
@keyframes bpop{from{opacity:0;transform:translateX(-50%) scale(.82)}to{opacity:1;transform:translateX(-50%) scale(1)}}

/* --- caída del jugador --- */
#deathOverlay{position:absolute;inset:0;z-index:14;display:grid;place-items:center;pointer-events:none;
  background:radial-gradient(ellipse at 50% 45%, rgba(90,10,20,.35), rgba(4,6,14,.82))}
.dead-card{text-align:center;padding:24px 34px;border-radius:18px;
  background:linear-gradient(180deg,rgba(60,14,26,.94),rgba(12,8,18,.94));border:2px solid #ff5d6c;
  box-shadow:0 0 50px rgba(255,80,100,.25)}
.dead-card h2{margin:0;font-family:var(--f-display);font-size:30px;letter-spacing:.16em;color:#ff8d97}
.dead-card p{margin:8px 0 12px;font-size:13px;color:var(--muted)}
.dead-card .count{font-size:40px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}

/* --- diálogo de personaje / mensajes del Sistema --- */
#dialog{position:absolute;left:50%;bottom:216px;transform:translateX(-50%);z-index:12;width:min(560px,90vw);
  padding:16px 18px;border-radius:16px;text-align:left;
  background:linear-gradient(180deg,rgba(24,41,92,.97),rgba(9,16,38,.97));border:2px solid var(--line);
  box-shadow:0 18px 50px rgba(0,0,0,.6);animation:pop .25s ease both}
#dialog .who{font-family:var(--f-display);font-weight:800;letter-spacing:.08em;color:var(--gold);font-size:15px}
#dialog .chapter{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:2px}
#dialog p{margin:10px 0 12px;font-size:14px;line-height:1.5;color:var(--ink)}
#dialog.system{border-color:#31e4ff;box-shadow:0 0 40px rgba(49,228,255,.25),0 18px 50px rgba(0,0,0,.6)}
#dialog.system .who{color:#7ff0ff;font-family:var(--f-ui);letter-spacing:.24em}
#dialog.system p{color:#cdf6ff}
@media (max-width:680px){ #dialog{bottom:260px;font-size:13px} }

/* --- objetivo, minimapa y pantalla de inicio --- */
#objective{position:absolute;z-index:5;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);
  padding:9px 18px;border-radius:12px;font-size:14px;font-weight:600;z-index:3;pointer-events:none;
  display:flex;align-items:center;gap:12px;max-width:min(680px,90vw);line-height:1.35}
#objective b{color:var(--gold)}
#objective .step{flex:none;font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.06em;text-transform:uppercase}
#mapwrap{position:absolute;right:12px;top:calc(158px + env(safe-area-inset-top,0px));width:150px;z-index:3;
  pointer-events:none;display:grid;justify-items:center;gap:4px}
#minimap{width:150px;height:150px;border-radius:50%;border:2px solid var(--line);
  background:rgba(8,14,34,.82);box-shadow:0 8px 22px rgba(0,0,0,.5)}
#mapregion{font-size:11px;font-weight:600;color:var(--muted);text-shadow:0 1px 3px rgba(0,0,0,.8)}
#startScreen{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:20px;
  background:radial-gradient(ellipse at 50% 40%, rgba(24,44,110,.9), rgba(3,6,16,.97));backdrop-filter:blur(6px)}
.start-card{width:min(520px,100%);text-align:center;padding:26px 24px;border-radius:20px;
  background:linear-gradient(180deg,rgba(22,39,85,.96),rgba(8,14,34,.96));border:2px solid var(--line);
  box-shadow:0 30px 80px rgba(0,0,0,.6)}
.start-card h1{margin:0;font-family:var(--f-display);font-size:42px;font-weight:800;letter-spacing:.14em;
  color:#bfe2ff;text-shadow:0 0 30px rgba(90,170,255,.6)}
.start-card h1 span{display:block;font-family:var(--f-ui);font-size:15px;font-weight:600;letter-spacing:.42em;
  color:var(--muted);margin-top:4px}
.start-card .tag{margin:14px 0 20px;font-size:14px;color:var(--muted)}
.btn.big{font-size:17px;padding:13px 40px;border-radius:14px}
.start-card .keys{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:22px 0 10px;
  font-size:12px;color:var(--muted)}
.start-card .keys b{color:var(--ink)}
.start-card .foot{margin:6px 0 0;font-size:11px;color:var(--dim)}
@media (max-width:680px){ #mapwrap{width:104px;top:auto;bottom:210px} #minimap{width:104px;height:104px}
  #objective{font-size:12px;padding:7px 12px} .start-card h1{font-size:32px} }

/* --- paneles --- */
.scrim{position:absolute;inset:0;background:rgba(3,7,18,.84);display:grid;place-items:center;
       padding:16px;pointer-events:auto;z-index:20}
.panel{width:min(820px,100%);max-height:min(86vh,760px);overflow:auto;border-radius:18px;
  background:linear-gradient(180deg,#152755,#0a1230);border:2px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(150,190,255,.3),0 26px 70px rgba(0,0,0,.66)}
.panel header{position:sticky;top:0;z-index:2;padding:13px 16px;display:flex;gap:12px;align-items:center;
  justify-content:space-between;background:linear-gradient(180deg,#1c3070,#152755);border-bottom:2px solid var(--line)}
.panel h2{margin:0;font-family:var(--f-display);font-size:18px;font-weight:800;letter-spacing:.05em}
.panel .body{padding:14px 16px 18px;display:grid;gap:11px}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tab{cursor:pointer;font-family:var(--f-ui);font-size:12px;font-weight:600;padding:6px 12px;border-radius:9px;
  border:2px solid var(--line);background:rgba(16,28,63,.9);color:var(--muted)}
.tab.sel{background:linear-gradient(180deg,#9be0ff,#1f86d8);color:#0a1020;border-color:#11507f}
.x{cursor:pointer;width:34px;height:34px;border-radius:10px;font-size:16px;color:#0a1020;border:2px solid #7a1f2b;
   background:linear-gradient(180deg,#ff9f9f,#d62b3f);box-shadow:inset 0 2px 0 rgba(255,255,255,.5)}
.btn{pointer-events:auto;cursor:pointer;font-family:var(--f-ui);font-weight:600;font-size:12.5px;color:#0a1020;
  padding:8px 13px;border-radius:11px;border:2px solid rgba(6,12,28,.8);white-space:nowrap;
  background:linear-gradient(180deg,#9ed8ff,#2f8ddf);box-shadow:inset 0 2px 0 rgba(255,255,255,.55),0 3px 0 rgba(5,10,24,.8)}
.btn:hover{filter:brightness(1.1)} .btn:active{transform:translateY(2px)}
.btn:disabled{opacity:.42;cursor:not-allowed}
.btn:focus-visible{outline:3px solid var(--arise);outline-offset:3px}
.btn.gold{background:linear-gradient(180deg,#ffdf94,#e0a22a)}
.btn.green{background:linear-gradient(180deg,#a9f0ba,#28a75e)}
.btn.violet{background:linear-gradient(180deg,#d3b2ff,#7a45e0)}
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr));gap:9px}
.statrow{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;
  background:linear-gradient(180deg,rgba(28,46,102,.8),rgba(11,19,45,.8));border:2px solid var(--line)}
.statrow .k{font-family:var(--f-display);font-weight:800;width:40px;color:var(--gold)}
.statrow .d{flex:1;font-size:11.5px;color:var(--muted);line-height:1.3}
.statrow .v{font-variant-numeric:tabular-nums;font-weight:700;font-size:17px;min-width:44px;text-align:right}
.plus{cursor:pointer;width:32px;height:32px;border-radius:10px;font-size:17px;font-weight:700;color:#0a1020;
  border:2px solid rgba(6,12,28,.8);background:linear-gradient(180deg,#a9f0ba,#28a75e);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 3px 0 rgba(5,10,24,.8)}
.plus:disabled{opacity:.3;cursor:not-allowed}
.derived{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:9px}
.kv{padding:8px 11px;border-radius:12px;border:2px solid var(--line);
    background:linear-gradient(180deg,rgba(28,46,102,.7),rgba(11,19,45,.7))}
.kv small{display:block;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600}
.kv b{font-size:17px;font-variant-numeric:tabular-nums}
.list{display:grid;gap:8px}
.item{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:12px;border:2px solid var(--line);
      background:linear-gradient(180deg,rgba(28,46,102,.78),rgba(11,19,45,.78))}
.item .g{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:11px;font-size:19px;
  background:linear-gradient(180deg,#254080,#122045);border:2px solid var(--line)}
.item .meta{flex:1;min-width:0}
.item .meta b{display:block;font-size:14px;font-weight:600}
.item .meta span{font-size:11.5px;color:var(--muted)}
.item .price{font-variant-numeric:tabular-nums;font-weight:700;color:var(--cash)}
.tier{font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:700}
.locked{opacity:.45}
.hint{font-size:12px;color:var(--dim);line-height:1.5;margin:0}
.hint b{color:var(--muted)}
/* --- menús vivos: entrada, tarjetas, vista 3D --- */
.scrim.enter{animation:scrimIn .22s ease both}
.scrim.enter .panel{animation:panelIn .32s cubic-bezier(.2,1.3,.4,1) both}
.scrim.enter .item,.scrim.enter .kv,.scrim.enter .statrow,.scrim.enter .card{animation:rowIn .34s ease both;
  animation-delay:calc(var(--i,0) * 22ms + 60ms)}
@keyframes scrimIn{from{opacity:0}to{opacity:1}}
@keyframes panelIn{from{opacity:0;transform:translateY(18px) scale(.95)}to{opacity:1;transform:none}}
@keyframes rowIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.panel{position:relative}
.panel header::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;
  background:linear-gradient(90deg,transparent,var(--arise),var(--monarch),transparent);background-size:200% 100%;animation:sweep 4s linear infinite}
@keyframes sweep{from{background-position:200% 0}to{background-position:-200% 0}}
.item,.kv,.statrow{transition:transform .15s ease,border-color .15s,box-shadow .15s}
.item:hover,.statrow:hover{transform:translateY(-2px);border-color:var(--line-hi);box-shadow:0 8px 20px rgba(0,0,0,.35),0 0 0 1px rgba(122,168,255,.25)}
.tab{transition:background .15s,color .15s,transform .1s}
.tab:hover{color:var(--ink);transform:translateY(-1px)}
.tab.sel{box-shadow:0 0 14px rgba(47,228,255,.35)}
.btn{position:relative;overflow:hidden;transition:transform .08s,filter .15s}
.btn::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-60%;transform:skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transition:left .45s ease}
.btn:not(:disabled):hover::after{left:130%}
.btn:not(:disabled):active{transform:translateY(2px) scale(.97)}
.bump{animation:bump .45s ease}
@keyframes bump{0%{transform:scale(1)}35%{transform:scale(1.28);color:var(--cash);text-shadow:0 0 12px rgba(126,224,122,.8)}100%{transform:scale(1)}}
.kv b,.statrow .v,.coin span{display:inline-block}
.chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.chips .grow{flex:1}
.chip{cursor:pointer;font:600 11.5px var(--f-ui);padding:5px 11px;border-radius:999px;border:2px solid var(--line);
  background:rgba(16,28,63,.9);color:var(--muted);transition:all .15s}
.chip:hover{color:var(--ink);border-color:var(--line-hi)}
.chip.sel{background:linear-gradient(180deg,#c6b0ff,#6f45d8);color:#0a1020;border-color:#3b2380}
.inv{display:grid;grid-template-columns:250px 1fr;gap:14px;align-items:start}
.inv-side{position:sticky;top:64px;display:grid;gap:10px}
.inv-main{display:grid;gap:10px;min-width:0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:9px;max-height:52vh;overflow:auto;padding:4px 4px 6px}
.card{--tc:var(--line-hi);position:relative;cursor:pointer;text-align:left;display:grid;gap:2px;padding:10px 10px 12px;
  border-radius:14px;color:var(--ink);font-family:var(--f-ui);overflow:hidden;
  border:2px solid color-mix(in srgb,var(--tc) 55%,transparent);
  background:radial-gradient(120% 90% at 50% 0%,color-mix(in srgb,var(--tc) 22%,transparent),transparent 70%),
             linear-gradient(180deg,rgba(28,46,102,.9),rgba(11,19,45,.95));
  transition:transform .15s ease,box-shadow .15s,border-color .15s}
.card:hover{transform:translateY(-3px) rotate(-.4deg);box-shadow:0 10px 22px rgba(0,0,0,.4),0 0 18px color-mix(in srgb,var(--tc) 40%,transparent)}
.card.sel{border-color:var(--tc);box-shadow:0 0 0 2px var(--tc),0 0 24px color-mix(in srgb,var(--tc) 55%,transparent)}
.card.poor{opacity:.6}
.card .cg{font-size:26px;line-height:1.1;filter:drop-shadow(0 0 8px color-mix(in srgb,var(--tc) 70%,transparent))}
.card b{font-size:12.5px;font-weight:600;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card small{font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card{align-content:start;grid-auto-rows:min-content}
.card .ctier{position:absolute;top:7px;right:8px;font:700 9.5px var(--f-ui);font-style:normal;letter-spacing:.06em;color:var(--tc)}
.card .ctier.up{color:var(--cash)}
.card .cbadge{position:absolute;top:28px;right:6px;font:700 8.5px var(--f-ui);font-style:normal;padding:2px 5px;border-radius:6px;
  background:var(--gold);color:#0a1020}
.card .cbadge.m{top:auto;bottom:10px;background:var(--cash)}
.card .cbar{position:absolute;left:0;bottom:0;height:3px;background:var(--tc);box-shadow:0 0 8px var(--tc)}
.card.eq::before{content:"";position:absolute;inset:0;border-radius:12px;pointer-events:none;
  background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.12) 45%,transparent 60%);background-size:250% 100%;animation:sweep 3s linear infinite}
.pv{--tc:var(--arise);position:relative;aspect-ratio:240/260;border-radius:16px;overflow:hidden;border:2px solid var(--line);
  background:radial-gradient(70% 60% at 50% 42%,color-mix(in srgb,var(--tc) 30%,transparent),transparent 70%),
             linear-gradient(180deg,#0d1636,#050918)}
.pv::after{content:"⟲ arrastra";position:absolute;bottom:6px;right:9px;font-size:9.5px;color:var(--dim);pointer-events:none}
.pv-canvas{width:100%;height:100%;display:block;cursor:grab;touch-action:none}
.pv-canvas:active{cursor:grabbing}
.sheet{--tc:var(--line-hi);display:grid;gap:7px;padding:11px;border-radius:14px;border:2px solid var(--line);
  background:linear-gradient(180deg,rgba(28,46,102,.8),rgba(11,19,45,.85))}
.sheet .sname{font-family:var(--f-display);font-size:16px;letter-spacing:.03em}
.tchip{justify-self:start;font:700 10px var(--f-ui);letter-spacing:.06em;padding:3px 8px;border-radius:999px;
  color:#0a1020;background:var(--tc)}
.sheet .lv{font-size:11.5px;color:var(--muted)}
.sbar{position:relative;height:22px;border-radius:8px;background:rgba(3,7,18,.7);border:1px solid var(--line);overflow:hidden}
.sbar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ff9f5a,#ffd24a);transition:width .4s ease}
.sbar.hp i{background:linear-gradient(90deg,#ff4d61,#ff8d97)}
.sbar.xp i{background:linear-gradient(90deg,#2aa876,#5ce8a6)}
.sbar small,.sbar em{position:relative;z-index:1;font:600 10.5px var(--f-ui);font-style:normal;line-height:20px;padding:0 8px;
  text-shadow:0 1px 2px #000}
.sbar em{position:absolute;right:0;top:0}
.sact{display:flex;gap:7px;flex-wrap:wrap}
.cmp{margin:0;font-size:11.5px;font-weight:600}
.cmp.up{color:var(--cash)} .cmp.down{color:var(--hp)}
.hero{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center;padding:10px;border-radius:16px;border:2px solid var(--line);
  background:linear-gradient(120deg,rgba(47,228,255,.08),rgba(187,140,255,.1)),linear-gradient(180deg,rgba(28,46,102,.8),rgba(11,19,45,.85))}
.hero .hmeta{display:grid;gap:5px}
.hero small{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.hero b{font-family:var(--f-display);font-size:20px}
.hero span{font-size:12px;color:var(--muted)}
.pts{justify-self:start;font:700 11.5px var(--f-ui);padding:4px 10px;border-radius:999px;border:2px solid var(--line);color:var(--dim)}
.pts.live{color:#0a1020;background:var(--gold);border-color:#8a6a12;animation:glowp 1.4s ease-in-out infinite}
@keyframes glowp{50%{box-shadow:0 0 16px rgba(255,210,74,.7)}}
.statrow{position:relative;overflow:hidden}
.statrow .sfill{position:absolute;left:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--gold),var(--cash));transition:width .35s}
.pls{display:flex;gap:4px}
.plus.sm{width:auto;padding:0 7px;font-size:10.5px;height:32px}
.plus{transition:transform .08s}
.plus:not(:disabled):active{transform:scale(.9)}
@media (max-width:680px){
  .inv{grid-template-columns:1fr} .inv-side{position:static;grid-template-columns:130px 1fr;align-items:start}
  .hero{grid-template-columns:110px 1fr} .cards{max-height:none}
  .pls .plus.sm{height:28px;padding:0 5px;font-size:9.5px}
}
.skillbox{--tc:var(--gold);display:grid;gap:3px;padding:9px 10px;border-radius:12px;border:1px solid color-mix(in srgb,var(--tc) 50%,transparent);
  background:linear-gradient(90deg,color-mix(in srgb,var(--tc) 18%,transparent),transparent)}
.skillbox b{font-size:12px;color:var(--tc)} .skillbox span{font-size:11.5px;color:var(--muted);line-height:1.35}
.cpow{margin:4px 0 0;font-size:10.5px;line-height:1.35;color:var(--ink);opacity:.85;white-space:normal}
.crank{position:absolute;left:8px;top:6px;font:800 12px var(--f-display);font-style:normal;color:var(--rc);text-shadow:0 0 8px var(--rc)}
.card .cg{margin-left:14px}
.rkrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.rkbig{display:grid;place-items:center;min-width:34px;padding:0 7px;height:34px;border-radius:9px;font:800 20px var(--f-display);color:#0a1020;
  background:var(--rc);box-shadow:0 0 16px var(--rc)}
.odds{display:flex;gap:6px;flex-wrap:wrap}
.odds span{padding:4px 9px;border-radius:999px;border:1px solid var(--rc);font-size:11px;color:var(--muted)}
.odds b{color:var(--rc);margin-right:5px;font-family:var(--f-display)}
.lookrow{display:grid;gap:6px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:rgba(11,19,45,.6)}
.lk-cat{font:700 11px var(--f-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lchip{display:inline-flex;align-items:center;gap:6px}
.lchip em{font-style:normal;font-size:10px;color:var(--cash)}
.lchip.lk{opacity:.5;border-style:dashed}
.lchip .sw{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.6);display:inline-block}
.lore{margin:0;font-size:11.5px;line-height:1.45;color:var(--muted);font-style:italic}
/* --- accesibilidad de menús --- */
.card.myth{border-color:var(--rc,#ff3af0);animation:mythGlow 2s ease-in-out infinite}
@keyframes mythGlow{50%{box-shadow:0 0 22px color-mix(in srgb,var(--tc) 70%,transparent),0 0 0 2px #fff3}}

.kbhelp{margin:0;font-size:11.5px;color:var(--muted);line-height:1.6}
.kbhelp kbd{display:inline-block;min-width:20px;padding:1px 6px;margin:0 2px;border-radius:6px;border:1px solid var(--line-hi);
  background:rgba(16,28,63,.9);font:700 10.5px var(--f-ui);color:var(--ink);text-align:center}
.card:focus-visible,.rpill:focus-visible,.chip:focus-visible,.tab:focus-visible,.rstep:focus-visible{outline:3px solid var(--arise);outline-offset:2px}
.card{min-height:84px}
.chip{min-height:34px;padding:6px 13px}
.tab{min-height:36px}
.rstrip{display:flex;gap:6px;align-items:center}
.rpills{flex:1;display:flex;gap:5px;overflow-x:auto;padding:3px 2px;scrollbar-width:thin}
.rpill{--tc:var(--line-hi);flex:none;min-width:40px;height:40px;border-radius:12px;cursor:pointer;font:700 14px var(--f-ui);color:#0a1020;
  border:2px solid rgba(5,10,24,.7);background:var(--tc);transition:transform .12s,box-shadow .12s}
.rpill:hover{transform:translateY(-2px)}
.rpill.lk{background:rgba(16,28,63,.9);color:var(--dim);border-color:var(--line)}
.rpill.cur{box-shadow:inset 0 0 0 3px var(--arise)}
.rpill.sel{transform:translateY(-2px) scale(1.08);box-shadow:0 0 0 3px #fff,0 0 16px var(--tc)}
.rstep{flex:none;width:40px;height:40px;border-radius:12px;cursor:pointer;font-size:15px;color:var(--ink);
  border:2px solid var(--line);background:rgba(16,28,63,.9)}
.rstep:hover{border-color:var(--line-hi)}
.wmap .ring{stroke-linecap:butt}
@media (max-width:680px){
  .inv-side .sact,.rcard > .big-w{position:sticky;bottom:0;z-index:3;padding:8px 0 2px;background:linear-gradient(0deg,#0a1230 70%,transparent)}
  .sact .btn,.big-w{min-height:46px;font-size:14px;flex:1}
  .card{min-height:96px}
}
/* --- mapa interactivo y bestiario --- */
.mapwrap2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:14px;align-items:start}
.mapside{display:grid;gap:8px}
.wmap{width:100%;max-width:420px;justify-self:center;filter:drop-shadow(0 10px 26px rgba(0,0,0,.5))}
.wmap .ring{cursor:pointer;opacity:.85;transition:opacity .15s,stroke-width .15s,filter .15s}
.wmap .ring:hover{opacity:1;filter:brightness(1.35)}
.wmap .ring.lk{opacity:.22;filter:saturate(.3)}
.wmap .ring.lk:hover{opacity:.4}
.wmap .ring.cur{filter:brightness(1.15)}
.wmap .ring.sel{opacity:1;filter:brightness(1.5) drop-shadow(0 0 6px #fff);animation:ringPulse 1.6s ease-in-out infinite}
@keyframes ringPulse{50%{filter:brightness(1.8) drop-shadow(0 0 10px #fff)}}
.wmap .rlbl{font:700 7px var(--f-ui);fill:rgba(5,10,24,.75);text-anchor:middle;pointer-events:none}
.wmap .hpin{fill:var(--gold);stroke:#0a1020;stroke-width:1.2}
.wmap .ppin{fill:var(--monarch);stroke:#fff;stroke-width:1.2;animation:blink 1s steps(2) infinite}
.wmap .medot{fill:var(--arise);stroke:#fff;stroke-width:1.5}
.wmap .mepulse{fill:none;stroke:var(--arise);stroke-width:2;transform-origin:center;animation:mePulse 1.6s ease-out infinite}
@keyframes mePulse{from{r:4;opacity:1}to{r:16;opacity:0}}
@keyframes blink{50%{opacity:.35}}
.legend{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:11px;color:var(--muted)}
.legend .lg{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.lg.me{background:var(--arise)} .lg.hp{background:var(--gold)} .lg.pp{background:var(--monarch)} .lg.lk{background:#1a2140;border:1px solid var(--line)}
.mapinfo{display:grid;gap:10px;min-width:0}
.rcard{--tc:var(--line-hi);display:grid;gap:10px;padding:12px;border-radius:16px;border:2px solid color-mix(in srgb,var(--tc) 60%,transparent);
  background:linear-gradient(180deg,color-mix(in srgb,var(--sky,#1a2a5a) 35%,transparent),rgba(11,19,45,.92) 45%);animation:rowIn .3s ease both}
.rhead{display:grid;gap:2px}
.rhead small{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.rhead b{font-family:var(--f-display);font-size:19px}
.rhead span{font-size:12px;color:var(--muted)}
.rcard .pv{aspect-ratio:16/10;max-height:240px}
.big-w{width:100%;padding:11px;font-size:14px}
.card.lock{opacity:.5;filter:grayscale(.6)}
.card.lock:hover{transform:none}
div.card{cursor:default}
.collect{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;font:600 12px var(--f-ui);color:var(--muted)}
.cards.grid-only{max-height:none}
.locked-pv{display:grid;place-items:center;font-size:42px;opacity:.6}
.locked-pv::after{content:none}
@media (max-width:680px){ .mapwrap2{grid-template-columns:1fr} }
.arise-box{width:min(430px,100%);text-align:center;padding:20px 18px;border-radius:20px;
  background:linear-gradient(180deg,#0f3a5e,#06162e);border:2px solid #2fe4ff;
  box-shadow:0 0 62px rgba(47,228,255,.3),0 26px 70px rgba(0,0,0,.6)}
.arise-box h3{font-family:var(--f-display);margin:0;font-size:27px;font-weight:800;letter-spacing:.2em;color:#9beeff;
  text-shadow:0 0 22px rgba(47,228,255,.8)}
.arise-box .sub{font-size:12.5px;color:var(--muted);margin-bottom:8px}
.chance{font-size:46px;font-weight:700;line-height:1;margin:8px 0 2px;color:#7ff0ff;font-variant-numeric:tabular-nums}
.pips{display:flex;gap:7px;justify-content:center;margin:12px 0 14px}
.pip{width:30px;height:7px;border-radius:99px;background:#1a2c5e;border:1px solid #32509e}
.pip.live{background:linear-gradient(180deg,#9beeff,#1fa5dd);box-shadow:0 0 12px #2fe4ff}
.arise-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.log{margin-top:10px;font-size:12.5px;color:var(--muted);min-height:18px}
/* destello al cruzar de región: un velo del color de la zona que entra */
#crossFlash{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;
  background:radial-gradient(circle at 50% 55%,transparent 35%,var(--cross,#8fd0ff) 140%);
  transition:opacity .5s ease}
#crossFlash.on{opacity:.85;transition:opacity .12s ease}
#crossName{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:21;
  pointer-events:none;text-align:center;opacity:0;transition:opacity .4s ease}
#crossName.on{opacity:1}
#crossName b{display:block;font-family:var(--f-display);font-weight:800;font-size:34px;
  letter-spacing:.08em;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.7)}
#crossName small{display:block;margin-top:6px;font-size:13px;letter-spacing:.22em;
  text-transform:uppercase;color:#dbe8ff;text-shadow:0 2px 10px rgba(0,0,0,.7)}
@media (max-width:680px){ #crossName b{font-size:22px} #crossName small{font-size:11px} }
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media (max-width:680px){
  /* Teléfono: el HUD se aparta para dejar libre el centro de la pantalla,
     que es donde se arrastra para mover y girar la cámara. */
  .top{gap:4px;padding:6px}
  .pcard{min-width:0;max-width:46vw;font-size:11px;padding:6px 8px}
  .infocard{min-width:0;max-width:46vw;font-size:11px;padding:6px 8px}
  .target{display:none}
  .pcard .bar,.infocard .bar{height:12px}
  /* Los menús pasan a una fila centrada: las esquinas inferiores son para los pulgares. */
  .hexwrap{top:auto;bottom:118px;left:50%;right:auto;transform:translateX(-50%);display:flex;flex-direction:row;gap:4px}
  .hexrow{display:flex;flex-direction:row;gap:4px;margin:0}
  .hex{width:36px;height:41px;font-size:15px} .hexrow.odd{margin-left:0}
  .squad{display:none}
  .wallet{gap:3px;font-size:11px;position:absolute;left:6px;bottom:64px;flex-direction:row!important;margin:0}
  .coin{font-size:11px;padding:2px 6px}
  .dock{width:100%}
  .bottom{padding:0 2px 6px;justify-content:center} .bottom > div[aria-hidden]{display:none}
  .hotbar{gap:4px;flex-wrap:nowrap;justify-content:center;width:100%}
  .act{width:min(46px,12vw);height:52px;padding-bottom:2px} .act .lb{font-size:8px} .act .ic{font-size:17px} .act kbd{display:none}
  .lane{top:auto;bottom:190px;max-width:165px;font-size:11px}
  .banner{font-size:22px}
  #mapwrap{display:none}
  #dialog{bottom:120px;font-size:13px;max-height:46vh;overflow:auto}
  #objective{font-size:11px;top:auto;bottom:166px;left:50%;max-width:88vw;width:max-content;
    flex-wrap:wrap;justify-content:center;text-align:center;line-height:1.35}
  .start-card .keys{display:none}
}`;
