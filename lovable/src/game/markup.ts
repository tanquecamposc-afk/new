// Generado por tools/build-lovable.py — no editar a mano.
// Marcado del HUD (barras, paneles, hotbar, minimapa, pantalla de inicio).
export const GAME_HTML = `<div id="app">
  <canvas id="stage"></canvas>
  <div class="hud">
    <div class="top">
      <div class="frame pcard">
        <div class="prow">
          <div class="rankbadge" id="rank">E</div>
          <div style="flex:1;min-width:0">
            <div class="pname" id="title">Cazador Novato</div>
            <div class="psub"><span id="lvl">Nv 1</span> · <span id="rebirth">Renacer 0</span></div>
          </div>
        </div>
        <div class="bar hp"><i id="hpbar" style="width:100%"></i><span id="hptxt">100 / 100</span></div>
        <div class="bar mana"><i id="mpbar" style="width:100%"></i><span id="mptxt">100 / 100</span></div>
        <div class="bar xp"><i id="xpbar"></i><span id="xptxt">0 / 150</span></div>
      </div>
      <div class="frame target" id="targetbar" hidden>
        <div class="trow">
          <div class="lvd"><i id="t-lv">1</i></div>
          <span class="tname" id="t-name">Enemigo</span>
          <span class="tdps" id="t-dps">0 DPS</span>
        </div>
        <div class="bar hp"><i id="t-hp" style="width:100%"></i><span id="t-hptxt">0 / 0</span></div>
      </div>
      <div class="frame infocard">
        <b id="isle">Seúl · Distrito de Guardias</b>
        <span id="portal">Portal en 1:40</span>
        <span id="nextRegion" style="color:var(--spec)"></span>
        <span id="quest" style="color:var(--gold)"></span>
        <span id="fps" style="color:var(--dim)"></span>
        <span id="qualityTag" style="color:var(--dim);cursor:pointer;pointer-events:auto" title="Clic para cambiar la calidad">Calidad alta (auto)</span>
        <span id="soundTag" style="color:var(--dim);cursor:pointer;pointer-events:auto" title="Clic para silenciar">Sonido: on</span>
        <span id="cloudTag" style="color:var(--dim)" title="Dónde se guarda tu progreso">💾 Local</span>
      </div>
    </div>

    <div class="hexwrap">
      <div class="hexrow"><button class="hex hx-stats" id="b-stats" title="Atributos (1)">🗡</button><button class="hex hx-shadow" id="b-shadows" title="Sombras (2)">👥</button></div>
      <div class="hexrow odd"><button class="hex hx-shop" id="b-shop" title="Tienda (3)">🛒</button><button class="hex hx-items" id="b-items" title="Inventario (4)">🎒</button></div>
      <div class="hexrow"><button class="hex hx-map" id="b-map" title="Mapa (5)">🗺</button><button class="hex hx-help" id="b-help" title="Ayuda (H)">?</button></div>
    </div>

    <div class="lane" id="lane"></div>
    <div id="hunterHint" hidden style="position:absolute;left:50%;bottom:190px;transform:translateX(-50%);
      padding:8px 16px;border-radius:12px;font-size:13px;pointer-events:none;
      background:linear-gradient(180deg,rgba(24,41,92,.96),rgba(9,16,38,.96));border:2px solid var(--line);
      box-shadow:0 8px 22px rgba(0,0,0,.5)"></div>

    <div class="bottom">
      <div class="wallet">
        <div class="coin c-cash stroke"><i>💵</i><span id="cash">0</span></div>
        <div class="coin c-gem stroke"><i>💎</i><span id="gems">0</span></div>
        <div class="coin c-tk stroke"><i>🎟</i><span id="tickets">0</span></div>
      </div>
      <div class="dock">
        <div class="squad" id="squad"></div>
        <div class="hotbar">
          <button class="act a-punch" id="a-attack"><kbd>M1</kbd><span class="ic">👊</span><span class="lb">Golpe</span></button>
          <button class="act a-weapon" id="a-skill"><kbd>V</kbd><span class="ic">🌊</span><span class="lb">Arma</span><i class="cd" id="cd-skill" style="transform:scaleY(0)"></i></button>
          <button class="act a-arise" id="a-arise"><kbd>B</kbd><span class="ic">💠</span><span class="lb">Arise</span></button>
          <button class="act a-dash" id="a-dash"><kbd>Q</kbd><span class="ic">💨</span><span class="lb">Dash</span><i class="cd" id="cd-dash" style="transform:scaleY(0)"></i></button>
          <button class="act a-auto" id="a-auto"><kbd>R</kbd><span class="ic">🔁</span><span class="lb">Auto</span><span class="st">OFF</span></button>
          <button class="act a-mount" id="a-mount"><kbd>M</kbd><span class="ic">🐎</span><span class="lb">Montura</span><span class="st">OFF</span></button>
          <button class="act a-form" id="a-form" hidden><kbd>T</kbd><span class="ic">👹</span><span class="lb">Monarca</span><span class="st t"></span><i class="cd" id="cd-form" style="transform:scaleY(0)"></i></button>
          <button class="act a-portal" id="a-portal" hidden><kbd>F</kbd><span class="ic">🌀</span><span class="lb">Portal</span></button>
        </div>
      </div>
      <div style="width:96px" aria-hidden="true"></div>
    </div>
  </div>
  <!-- objetivo actual, siempre una sola línea -->
  <div id="objective" class="frame" hidden></div>
  <!-- minimapa -->
  <div id="mapwrap"><canvas id="minimap" width="150" height="150"></canvas><span id="mapregion"></span></div>
  <!-- pantalla de inicio -->
  <div id="startScreen">
    <div class="start-card">
      <h1>ARISE<span>crossover</span></h1>
      <p class="tag">Cazas. Extraes su sombra. Tu ejército crece.</p>
      <button class="btn big" id="btn-play">Jugar</button>
      <p id="cloudStart" style="margin:8px 0 0;font-size:13px;color:var(--dim)">💾 Guardado en este dispositivo</p>
      <div class="keys">
        <span><b>W A S D</b> moverse</span><span><b>Clic izq.</b> golpear (mantén)</span><span><b>B</b> extraer</span>
        <span><b>Q</b> dash</span><span><b>Espacio</b> saltar</span><span><b>G</b> hablar</span>
        <span><b>Ratón</b> girar cámara</span><span><b>1-5</b> menús</span>
      </div>
      <p class="foot">Tu partida se guarda sola en este navegador.</p>
    </div>
  </div>
  <div id="crossFlash"></div>
  <div id="crossName"><b></b><small></small></div>
  <div id="deathOverlay" hidden></div>
  <div id="dialog" hidden></div>
  <div id="banner"></div>
  <div id="modal" hidden></div>
</div>`;
