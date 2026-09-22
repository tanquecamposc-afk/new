// @ts-nocheck
// Generado por tools/build-lovable.py desde arise-3d.html — no editar a mano.
//
// Motor de Arise Crossover+. Es codigo imperativo: crea su propia escena de
// three.js, escucha teclado y puntero y pinta el HUD que monta AriseGame.tsx.
// Se expone como una funcion de montaje para que React controle su ciclo de
// vida: `mountArise()` devuelve la funcion que lo desmonta.
import * as THREE from "three";

export function mountArise(): () => void {
  (window as any).THREE = THREE;
  const listeners: Array<[string, EventListener]> = [];
  const origAdd = window.addEventListener.bind(window);
  const addEventListener = (type: string, fn: EventListener, opts?: any) => {
    listeners.push([type, fn]);
    origAdd(type, fn, opts);
  };
  let rafId = 0;
  const origRaf = window.requestAnimationFrame.bind(window);
  const requestAnimationFrame = (cb: FrameRequestCallback) => (rafId = origRaf(cb));
  let disposed = false;



"use strict";
/* ===========================================================================
   ARISE CROSSOVER V9 ULTRA — build web jugable
   Fórmulas, contratos y sistemas tomados del Master Prompt V9:
     PhysicalDamage = WeaponDamage + STR*1.5
     MagicDamage    = INT*1.6*SpellModifier
     ShadowDamage   = Base*(1+SDW*0.012)     ShadowHP = BaseHP*(1+SDW*0.008)
     MaxHP          = HPBase + VIT*15        MaxMana  = 100 + MNA*10
     WalkSpeed      = 16 + AGI*0.05          DashCooldown = 3/(1+AGI*0.005)
     AGI >= 200 -> doble salto
     EXPRequired(N) = 100*N^1.85 + N*50      EXPReward = EnemyLevel*25*(1+Rebirth*0.25)
     effectiveRate  = clamp(BaseAriseRate * (1 + AriseLuck%/100), 0, MaxAriseRate)
   Toda fórmula vive en FORMULA; el resto del juego la consume.
   =========================================================================== */

const FLAGS = {
  VERSION_MODE:"V9_CROSSOVER_BASELINE",
  ENABLE_RED_GATE:true, ENABLE_DOUBLE_DUNGEON:true, ENABLE_BOSS_RUSH:true,
  PORTAL_INTERVAL_SECONDS:110,   // el contrato usa 1800; comprimido para la build web
  MAX_ARISE_RATE:0.95, CORPSE_LIFETIME:11, ARISE_ATTEMPTS:3, MAX_CORPSES:10,
  SQUAD_BASE:6, SQUAD_PER_RANK:2, SQUAD_MAX:16, LEVEL_CAP:1000, MERGE_COPIES:3,
};

// Capacidad de escuadrón: crece con el rango (el juego real te rodea de sombras)
const squadCap = () => Math.min(FLAGS.SQUAD_MAX, FLAGS.SQUAD_BASE + rankIdx(P.rank) * FLAGS.SQUAD_PER_RANK);

const CFG = {
  ATTACK_RANGE:150, ARISE_RANGE:140,
  COMBO_RESET:1.1,
  SHADOW_FOLLOW:215, SHADOW_AGGRO:420, SHADOW_RANGE:78, SHADOW_CD:0.8, SHADOW_SPEED:260, SHADOW_LEASH:700,
  ENEMY_POP:9,
  // Mundo abierto continuo: el centro es la zona inicial y cada anillo de
  // RING_WIDTH unidades es una región nueva, más dura cuanto más te alejas.
  WORLD:{ w:34000, h:34000, cx:17000, cy:17000 },
  RING_WIDTH:1400, RING_SAFE:120,
  CONTACT_SCALE:0.02, GRAVITY:1500, JUMP_V:520,
  DASH_DIST:330, DASH_TIME:0.18,
  CRIT_CHANCE:0.15, CRIT_MULT:2,
};

// Combo M1_1..M1_4 (tabla 04 del V9)
const COMBO = [
  { id:"M1_1", startup:0.06, active:0.05, recovery:0.09, mult:1.00, cam:0.20, hitstop:0.012 },
  { id:"M1_2", startup:0.05, active:0.05, recovery:0.08, mult:1.05, cam:0.22, hitstop:0.014 },
  { id:"M1_3", startup:0.07, active:0.06, recovery:0.10, mult:1.15, cam:0.28, hitstop:0.018 },
  { id:"M1_4", startup:0.09, active:0.07, recovery:0.16, mult:1.45, cam:0.45, hitstop:0.028 },
];
// AttackDefinition del contrato V9
const SKILL = {
  id:"Sword_BladeWave", input:"V", startup:0.22, active:0.08, recovery:0.34,
  hitbox:{ shape:"Arc", radius:190, angle:70 },
  damage:{ weapon:1.75, str:0.90 }, costs:{ mana:30 }, cooldown:7.0,
  feedback:{ cam:0.65, hitstop:0.04 },
};

const RANKS = [
  { name:"E", dmg:0.00, luck:0,   level:1,   gems:0 },
  { name:"D", dmg:0.18, luck:8,   level:25,  gems:120 },
  { name:"C", dmg:0.42, luck:18,  level:80,  gems:600 },
  { name:"B", dmg:0.80, luck:32,  level:180, gems:2600 },
  { name:"A", dmg:1.50, luck:55,  level:330, gems:12000 },
  { name:"S", dmg:2.80, luck:90,  level:560, gems:60000 },
];
const rankIdx = n => Math.max(0, RANKS.findIndex(r => r.name === n));
const rankOf  = n => RANKS[rankIdx(n)] || RANKS[0];

const TIER_VAR = { C:"--t-C", B:"--t-B", A:"--t-A", S:"--t-S", "S Elite":"--t-SE", Monarch:"--t-M" };

/* --------------------------- catálogo de armas ---------------------------
   Nombres, costes y daños base del catálogo suministrado (sección 08.1).   */
/*  Dos armas por región, con progresión acorde a sus enemigos.  */
const WEAPONS = {
  HunterKnife:   { id:"HunterKnife",   name:"Cuchillo de Cazador",        dmg:10,      cost:0,       isle:"Seoul",        glyph:"🔪" },
  SteelShort:    { id:"SteelShort",    name:"Espada Corta de Acero",      dmg:45,      cost:900,     isle:"Seoul",        glyph:"🗡" },
  KasakaFang:    { id:"KasakaFang",    name:"Colmillo Venenoso de Kasaka",dmg:180,     cost:9000,    isle:"Hongdae",      glyph:"🐍" },
  IronMace:      { id:"IronMace",      name:"Maza de Hierro",             dmg:520,     cost:42000,   isle:"Hongdae",      glyph:"🔨" },
  TempleBlade:   { id:"TempleBlade",   name:"Espada del Templo",          dmg:2400,    cost:3.2e5,   isle:"Temple",       glyph:"⚔" },
  GuardianAxe:   { id:"GuardianAxe",   name:"Hacha del Guardián",         dmg:9000,    cost:1.6e6,   isle:"Temple",       glyph:"🪓" },
  KnightKiller:  { id:"KnightKiller",  name:"Matacaballeros",             dmg:42000,   cost:9.4e6,   isle:"Reawaken",     glyph:"🗡" },
  RedKnightSword:{ id:"RedKnightSword",name:"Espada del Caballero Rojo",  dmg:150000,  cost:4.2e7,   isle:"Reawaken",     glyph:"⚔" },
  BarukaDagger:  { id:"BarukaDagger",  name:"Daga de Baruka",             dmg:1.2e6,   cost:3.6e8,   isle:"HighOrcs",     glyph:"🗡" },
  KargalganAxe:  { id:"KargalganAxe",  name:"Hacha de Kargalgan",         dmg:4.6e6,   cost:1.4e9,   isle:"HighOrcs",     glyph:"🪓" },
  FrostSpear:    { id:"FrostSpear",    name:"Lanza de Escarcha",          dmg:2.6e7,   cost:8.2e9,   isle:"RedGate",      glyph:"🔱" },
  CrimsonBlade:  { id:"CrimsonBlade",  name:"Filo Carmesí",               dmg:9.5e7,   cost:3.1e10,  isle:"RedGate",      glyph:"⚔" },
  QueenStinger:  { id:"QueenStinger",  name:"Aguijón de la Reina",        dmg:1.4e9,   cost:4.6e11,  isle:"Jeju",         glyph:"🐝" },
  EliteBlade:    { id:"EliteBlade",    name:"Espada de la Élite",         dmg:5.2e9,   cost:1.7e12,  isle:"Jeju",         glyph:"🗡" },
  ShinjukuKatana:{ id:"ShinjukuKatana",name:"Katana de Shinjuku",         dmg:6.8e10,  cost:2.2e13,  isle:"Japan",        glyph:"🗡" },
  DemonNaginata: { id:"DemonNaginata", name:"Naginata Demoníaca",         dmg:2.4e11,  cost:8.1e13,  isle:"Japan",        glyph:"🔱" },
  BaranLongsword:{ id:"BaranLongsword",name:"Espadón del Rey Demonio",    dmg:4.1e12,  cost:1.3e15,  isle:"DemonCastle",  glyph:"⚔" },
  KamishWrath:   { id:"KamishWrath",   name:"Ira de Kamish",              dmg:1.6e13,  cost:5.2e15,  isle:"DemonCastle",  glyph:"🔥" },
  GlacialEdge:   { id:"GlacialEdge",   name:"Filo Glacial",               dmg:3.2e14,  cost:1.1e17,  isle:"IceMonarch",   glyph:"❄" },
  FrostScepter:  { id:"FrostScepter",  name:"Cetro de Escarcha",          dmg:1.2e15,  cost:4.1e17,  isle:"IceMonarch",   glyph:"🪄" },
  MonarchClaw:   { id:"MonarchClaw",   name:"Garra del Monarca Bestia",   dmg:2.8e16,  cost:9.2e18,  isle:"BeastMonarch", glyph:"🐾" },
  BeastMaul:     { id:"BeastMaul",     name:"Maza Bestial",               dmg:1.05e17, cost:3.4e19,  isle:"BeastMonarch", glyph:"🔨" },
  ArchitectStaff:{ id:"ArchitectStaff",name:"Bastón del Arquitecto",      dmg:2.4e18,  cost:7.8e20,  isle:"Architect",    glyph:"🪄" },
  LivingRune:    { id:"LivingRune",    name:"Runa Viva",                  dmg:9.1e18,  cost:2.9e21,  isle:"Architect",    glyph:"🔮" },
  ShadowDaggers: { id:"ShadowDaggers", name:"Dagas del Monarca de las Sombras", dmg:2.2e20, cost:7.1e22, isle:"ShadowRealm", glyph:"⚜" },
  AshbornBlade:  { id:"AshbornBlade",  name:"Filo de Ashborn",            dmg:8e20,    cost:2.6e23,  isle:"ShadowRealm",  glyph:"🌑" },
};
const START_WEAPON = "HunterKnife";

/* ------------------------------ sombras ---------------------------------- */
const SHADOWS = {
  Soldier:  { id:"Soldier",  name:"Soldado",  tier:"C",       dmg:18,      hp:120,   rate:0.55,  gems:4,     glyph:"👤" },
  Iron:     { id:"Iron",     name:"Iron",     tier:"B",       dmg:120,     hp:900,   rate:0.32,  gems:12,    glyph:"🛡" },
  Tank:     { id:"Tank",     name:"Tank",     tier:"B",       dmg:260,     hp:2600,  rate:0.26,  gems:20,    glyph:"🐻" },
  Igris:    { id:"Igris",    name:"Igris",    tier:"A",       dmg:940,     hp:5200,  rate:0.16,  gems:48,    glyph:"⚔" },
  Tusk:     { id:"Tusk",     name:"Tusk",     tier:"A",       dmg:2600,    hp:9000,  rate:0.11,  gems:110,   glyph:"🔮" },
  Kaisel:   { id:"Kaisel",   name:"Kaisel",   tier:"S",       dmg:16000,   hp:38000, rate:0.07,  gems:320,   glyph:"🐉" },
  Greed:    { id:"Greed",    name:"Greed",    tier:"S",       dmg:92000,   hp:180000,rate:0.05,  gems:900,   glyph:"🗡" },
  Baruka:   { id:"Baruka",   name:"Baruka",   tier:"S",       dmg:520000,  hp:1.1e6, rate:0.038, gems:2800,  glyph:"❄" },
  Beru:     { id:"Beru",     name:"Beru",     tier:"S Elite", dmg:4.2e6,   hp:8.5e6, rate:0.026, gems:9000,  glyph:"🐜" },
  Bellion:  { id:"Bellion",  name:"Bellion",  tier:"S Elite", dmg:3.4e7,   hp:6.8e7, rate:0.02,  gems:36000, glyph:"👹" },
  Kamish:   { id:"Kamish",   name:"Kamish",   tier:"S Elite", dmg:2.6e8,   hp:5.2e8, rate:0.015, gems:140000,glyph:"🔥" },
  Antares:  { id:"Antares",  name:"Antares",  tier:"Monarch", dmg:2.1e9,   hp:4.2e9, rate:0.01,  gems:6e5,   glyph:"👑" },
  Architect:{ id:"Architect",name:"Arquitecto",tier:"Monarch",dmg:1.6e10,  hp:3.2e10,rate:0.008, gems:2.4e6, glyph:"🗿" },
  Ashborn:  { id:"Ashborn",  name:"Ashborn",  tier:"Monarch", dmg:1.2e11,  hp:2.4e11,rate:0.006, gems:9e6,   glyph:"🌑" },
};

/* --------------------------- islas (sección 09) --------------------------- */
/*  Regiones del mundo abierto, siguiendo el recorrido de la historia:
    Seúl → mazmorras de instancia → el Doble Dungeon → los altos orcos →
    Isla Jeju → las Puertas Rojas → la guerra de los Monarcas.            */
const ISLANDS = [
  { id:"Seoul",        name:"Seúl · Distrito de Guardias", level:1,    theme:"city",    enemy:{ name:"Gnomo de Mazmorra", lvl:3,    hp:26,      dmg:10 },    brute:{ name:"Golem de Piedra",  lvl:8,   hp:120,   dmg:26 },    boss:{ name:"Kasaka",                lvl:22,   hp:70000,   dmg:160,   shadow:"Iron" },     shadow:"Soldier",  weapons:["ArchitectStaff","LivingRune"] },
  { id:"Hongdae",      name:"Hongdae · Puerta Clase D",    level:20,   theme:"urban",   enemy:{ name:"Lagarto Kasaka",   lvl:24,   hp:9000,    dmg:140 },   brute:{ name:"Cerbero",          lvl:32,  hp:52000, dmg:420 },   boss:{ name:"Cazador de Élite",      lvl:45,   hp:6.5e5,   dmg:1400,  shadow:"Tank" },     shadow:"Iron",     weapons:["KasakaFang","IronMace"] },
  { id:"Temple",       name:"El Doble Dungeon",            level:50,   theme:"shrine",  enemy:{ name:"Estatua Menor",    lvl:54,   hp:9.2e4,   dmg:900 },   brute:{ name:"Guardián de Piedra",lvl:64, hp:4.6e5, dmg:2600 },  boss:{ name:"Estatua de Dios",       lvl:80,   hp:9.5e6,   dmg:8000,  shadow:"Igris" },    shadow:"Tank",     weapons:["TempleBlade","GuardianAxe"] },
  { id:"Reawaken",     name:"Cárcel de Reawakening",       level:100,  theme:"dark",    enemy:{ name:"Guardia Sombrío",  lvl:104,  hp:1.6e6,   dmg:6200 },  brute:{ name:"Caballero Rojo",   lvl:118, hp:7.4e6, dmg:16000 }, boss:{ name:"Caballero del Templo",  lvl:140,  hp:1.2e8,   dmg:44000, shadow:"Tusk" },     shadow:"Igris",    weapons:["KnightKiller","RedKnightSword"] },
  { id:"HighOrcs",     name:"Isla de los Altos Orcos",     level:200,  theme:"ice",     enemy:{ name:"Alto Orco",        lvl:206,  hp:4.2e7,   dmg:72000 }, brute:{ name:"Chamán Kargalgan", lvl:224, hp:1.9e8, dmg:180000 },boss:{ name:"Baruka",                lvl:250,  hp:2.6e9,   dmg:420000,shadow:"Baruka" },   shadow:"Tusk",     weapons:["BarukaDagger","KargalganAxe"] },
  { id:"RedGate",      name:"La Puerta Roja",              level:350,  theme:"volcano", enemy:{ name:"Lobo de Hielo",    lvl:356,  hp:1.2e9,   dmg:1.8e6 }, brute:{ name:"Gigante de Hielo", lvl:382, hp:5.2e9, dmg:4.1e6 }, boss:{ name:"Rey de los Hielos",     lvl:410,  hp:7.4e10,  dmg:1.1e7, shadow:"Kaisel" },   shadow:"Baruka",   weapons:["FrostSpear","CrimsonBlade"] },
  { id:"Jeju",         name:"Isla Jeju",                   level:500,  theme:"forest",  enemy:{ name:"Hormiga Soldado",  lvl:508,  hp:3.8e10,  dmg:5.6e7 }, brute:{ name:"Hormiga Élite",    lvl:540, hp:1.7e11,dmg:1.2e8 }, boss:{ name:"Rey Hormiga",           lvl:580,  hp:2.4e12,  dmg:3.4e8, shadow:"Beru" },     shadow:"Greed",    weapons:["QueenStinger","EliteBlade"] },
  { id:"Japan",        name:"Puerta de Shinjuku",          level:650,  theme:"royal",   enemy:{ name:"Cazador Caído",    lvl:660,  hp:1.2e12,  dmg:1.8e9 }, brute:{ name:"Demonio Menor",    lvl:700, hp:5.4e12,dmg:4.1e9 }, boss:{ name:"Rey Demonio Baran",     lvl:740,  hp:7.6e13,  dmg:1.1e10,shadow:"Bellion" },  shadow:"Beru",     weapons:["ShinjukuKatana","DemonNaginata"] },
  { id:"DemonCastle",  name:"Castillo del Demonio",        level:800,  theme:"dragon",  enemy:{ name:"Guardia Demoníaco",lvl:812,  hp:3.9e13,  dmg:5.8e10 },brute:{ name:"Caballero Infernal",lvl:860,hp:1.7e14,dmg:1.3e11 },boss:{ name:"Kamish",                lvl:900,  hp:2.4e15,  dmg:3.6e11,shadow:"Kamish" },   shadow:"Bellion",  weapons:["BaranLongsword","KamishWrath"] },
  { id:"IceMonarch",   name:"Dominio del Monarca de Hielo",level:950,  theme:"storm",   enemy:{ name:"Soldado de Escarcha",lvl:962,hp:1.3e15,  dmg:1.8e12 },brute:{ name:"Heraldo Glacial",  lvl:1000,hp:5.6e15,dmg:4.1e12 },boss:{ name:"Monarca de Hielo",      lvl:1040, hp:7.8e16,  dmg:1.2e13,shadow:"Kamish" },   shadow:"Kaisel",   weapons:["GlacialEdge","FrostScepter"] },
  { id:"BeastMonarch", name:"Dominio del Monarca Bestia",  level:1100, theme:"guild",   enemy:{ name:"Bestia Menor",     lvl:1112, hp:4.1e16,  dmg:5.9e13 },brute:{ name:"Bestia Mayor",     lvl:1150,hp:1.8e17,dmg:1.3e14 },boss:{ name:"Monarca de las Bestias",lvl:1190, hp:2.5e18,  dmg:3.8e14,shadow:"Antares" },  shadow:"Antares",  weapons:["MonarchClaw","BeastMaul"] },
  { id:"Architect",    name:"Sala del Arquitecto",         level:1250, theme:"mystic",  enemy:{ name:"Eco del Sistema",  lvl:1262, hp:1.3e18,  dmg:1.9e15 },brute:{ name:"Centinela Rúnico", lvl:1300,hp:5.8e18,dmg:4.2e15 },boss:{ name:"El Arquitecto",         lvl:1340, hp:8.1e19,  dmg:1.2e16,shadow:"Architect" },shadow:"Architect",weapons:["ArchitectStaff","LivingRune"] },
  { id:"ShadowRealm",  name:"Trono del Rey de las Sombras",level:1400, theme:"cyber",   enemy:{ name:"Soberano Caído",   lvl:1412, hp:4.2e19,  dmg:6.1e16 },brute:{ name:"General Monarca",  lvl:1450,hp:1.8e20,dmg:1.4e17 },boss:{ name:"Antares",               lvl:1490, hp:2.6e21,  dmg:3.9e17,shadow:"Ashborn" },  shadow:"Ashborn",  weapons:["ShadowDaggers","AshbornBlade"] },
];
const isleOf = id => ISLANDS.find(i => i.id === id) || ISLANDS[0];
// Región del mundo abierto según la distancia al centro.
function ringAt(x, y){
  const d = Math.hypot(x - CFG.WORLD.cx, y - CFG.WORLD.cy);
  return clamp(Math.floor(d / CFG.RING_WIDTH), 0, ISLANDS.length - 1);
}
const regionAt = (x, y) => ISLANDS[ringAt(x, y)];
const ringRadius = i => i * CFG.RING_WIDTH + CFG.RING_WIDTH * 0.55;
function distanceToNextRegion(){
  const d = Math.hypot(player.x - CFG.WORLD.cx, player.y - CFG.WORLD.cy);
  const idx = ringAt(player.x, player.y);
  if (idx >= ISLANDS.length - 1) return null;
  return { next: ISLANDS[idx + 1], dist: Math.max(0, (idx + 1) * CFG.RING_WIDTH - d) };
}

/* ------------------------------ reliquias -------------------------------- */
const RELICS = {
  ClawboundRing:{ id:"ClawboundRing", name:"Anillo del Demonio", effect:"shadowDmg", value:0.15,   isle:"Seoul", glyph:"💍" },
  SilentVeil:   { id:"SilentVeil",    name:"Velo del Asesino",    effect:"ariseLuck", value:10,     isle:"Hongdae", glyph:"🌫" },
  InkOfDepth:   { id:"InkOfDepth",    name:"Tinta del Abismo",   effect:"shadowDmg", value:0.28,   isle:"HighOrcs", glyph:"🖋" },
  FlickerCrest: { id:"FlickerCrest",  name:"Cresta de Kamish",  effect:"ariseLuck", value:22.5,   isle:"Japan",     glyph:"🔥" },
  PulseEmblem:  { id:"PulseEmblem",   name:"Emblema del Sistema",   effect:"shadowDmg", value:0.45,   isle:"IceMonarch",       glyph:"📡" },
  NenCore:      { id:"NenCore",       name:"Núcleo de Monarca",       effect:"ariseLuck", value:35,     isle:"ShadowRealm",      glyph:"🔮" },
  BlackMonarch: { id:"BlackMonarch",  name:"Black Monarch Sigil", effect:"rankUp", value:25,   isle:"Temple",glyph:"🖤" },
  EyeAscension: { id:"EyeAscension",  name:"Eye of Ascension",    effect:"rankUp", value:40,   isle:"Architect",  glyph:"👁" },
};

/* ------------------------------- runas ----------------------------------- */
const RUNES = {
  Health:{ id:"Health", name:"Runa de Salud", desc:"Vida enemiga −5%", glyph:"❤" },
  Gems:  { id:"Gems",   name:"Runa de Gemas", desc:"Gemas +10%",       glyph:"💎" },
  Time:  { id:"Time",   name:"Runa de Tiempo",desc:"Temporizador +60s",glyph:"⏱" },
  Cash:  { id:"Cash",   name:"Runa de Oro",   desc:"Oro +10%",         glyph:"💵" },
};

/* ---------------------------- FORMULA SERVICE ----------------------------- */
const FORMULA = {
  physicalDamage: (weaponDmg, str) => weaponDmg + str * 1.5,
  magicDamage:    (int, spellMod) => (int * 1.6) * spellMod,
  shadowDamage:   (base, sdw) => base * (1 + sdw * 0.012),
  shadowHP:       (base, sdw) => base * (1 + sdw * 0.008),
  maxHP:          (hpBase, vit) => hpBase + vit * 15,
  maxMana:        mna => 100 + mna * 10,
  walkSpeed:      agi => 16 + agi * 0.05,
  dashCooldown:   agi => 3 / (1 + agi * 0.005),
  doubleJump:     agi => agi >= 200,
  expRequired:    n => Math.floor(100 * Math.pow(n, 1.85) + n * 50),
  expReward:      (enemyLevel, rebirth) => Math.floor(enemyLevel * 25 * (1 + rebirth * 0.25)),
  effectiveRate:  (baseRate, luckPercent) => clamp(baseRate * (1 + luckPercent / 100), 0, FLAGS.MAX_ARISE_RATE),
};

/* ------------------------- clases y talentos ------------------------------ */
const CLASSES = {
  Warrior:  { id:"Warrior",  name:"Guerrero", desc:"Equilibrado. +15% daño y +20% vida.",      bonus:{ dmg:0.15, hp:0.20 },              glyph:"🛡" },
  Assassin: { id:"Assassin", name:"Asesino",  desc:"+35% daño crítico y +20% velocidad.",      bonus:{ crit:0.15, speed:0.20, dmg:0.05 }, glyph:"🗡" },
  Mage:     { id:"Mage",     name:"Mago",     desc:"+50% daño de habilidad y +40% maná.",      bonus:{ skill:0.50, mana:0.40 },           glyph:"🪄" },
  Tank:     { id:"Tank",     name:"Tanque",   desc:"+70% vida y −35% daño recibido.",          bonus:{ hp:0.70, armor:0.35 },             glyph:"🧱" },
  Monarch:  { id:"Monarch",  name:"Monarca",  desc:"+45% daño de sombras y +15% suerte Arise.",bonus:{ shadow:0.45, luck:0.15 },          glyph:"👑" },
};
const TALENTS = {
  power:   { id:"power",   name:"Poder",      desc:"+8% de daño por nivel",            max:10, cost:lv => 250 * Math.pow(2, lv) },
  haste:   { id:"haste",   name:"Celeridad",  desc:"+6% de velocidad de ataque",       max:10, cost:lv => 300 * Math.pow(2, lv) },
  crit:    { id:"crit",    name:"Crítico",    desc:"+3% de probabilidad crítica",      max:10, cost:lv => 400 * Math.pow(2, lv) },
  legion:  { id:"legion",  name:"Legión",     desc:"+15% de daño de sombras",          max:10, cost:lv => 350 * Math.pow(2, lv) },
  fortune: { id:"fortune", name:"Fortuna",    desc:"+12% de suerte de extracción",     max:10, cost:lv => 500 * Math.pow(2, lv) },
  vigor:   { id:"vigor",   name:"Vigor",      desc:"+10% de vida máxima",              max:10, cost:lv => 300 * Math.pow(2, lv) },
};
const CODES = {
  ARISE:      { cash:5000,   gems:50,   tickets:1 },
  SHADOW100K: { cash:250000, gems:400,  tickets:2 },
  MONARCH:    { cash:1e7,    gems:2500, tickets:5 },
  UPDATE9:    { cash:1e6,    gems:900,  tickets:3 },
};

/* ------------------------------ utilidades -------------------------------- */
const SUF = ["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc","Ud","Dd","Td"];
function fmt(v){
  if (!isFinite(v)) return "∞";
  v = Math.floor(v);
  if (v < 1000) return String(v);
  let i = 0, n = v;
  while (n >= 1000 && i < SUF.length - 1){ n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + SUF[i];
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const now = () => performance.now() / 1000;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ------------------------------- perfil ----------------------------------- */
const SAVE_KEY = "arise-crossover-v9/v1";
function newProfile(){
  return {
    schema:9, level:1, xp:0, rank:"E", rebirths:0,
    cash:0, gems:0, tickets:0,
    stats:{ STR:0, INT:0, SDW:0, VIT:0, AGI:0, MNA:0, points:5 },
    weapon:START_WEAPON, weapons:{ [START_WEAPON]:1 }, weaponLv:{},
    class:"Warrior", talents:{}, codes:{}, quests:{ active:null, done:0 },
    shadows:{}, squad:[], relics:{}, runes:{},
    islands:["Seoul"], island:"Seoul",
    title:"Cazador Novato", awakened:false, index:{},
    kills:0, arisen:0, dungeonsCleared:0, ledger:[], tutorial:0, chapter:0,
    pos:null,
  };
}
function reconcile(d){
  const base = newProfile();
  const p = Object.assign(base, d || {});
  p.stats = Object.assign(base.stats, d?.stats || {});
  for (const k of ["weapons","weaponLv","shadows","relics","runes","index","talents","codes"])
    if (typeof p[k] !== "object" || !p[k]) p[k] = {};
  if (!CLASSES[p.class]) p.class = "Warrior";
  if (typeof p.quests !== "object" || !p.quests) p.quests = { active:null, done:0 };
  if (typeof p.tutorial !== "number") p.tutorial = 0;
  p.muted = !!p.muted;
  if (typeof p.chapter !== "number") p.chapter = 0;
  p.blessing = 0;   // el reloj se reinicia en cada carga
  if (!Array.isArray(p.squad)) p.squad = [];
  if (!Array.isArray(p.islands) || !p.islands.length) p.islands = ["Seoul"];
  if (!Array.isArray(p.ledger)) p.ledger = [];
  // Un guardado viejo o manipulado puede traer textos o NaN donde van números:
  // si se cuelan, el oro o la EXP se vuelven NaN y la partida queda inservible.
  const num = (v, def, min) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, n) : def; };
  p.level    = Math.min(FLAGS.LEVEL_CAP, Math.round(num(p.level, 1, 1)));
  p.xp       = num(p.xp, 0, 0);
  p.cash     = num(p.cash, 0, 0);
  p.gems     = num(p.gems, 0, 0);
  p.tickets  = Math.round(num(p.tickets, 0, 0));
  p.rebirths = Math.round(num(p.rebirths, 0, 0));
  p.kills    = Math.round(num(p.kills, 0, 0));
  p.arisen   = Math.round(num(p.arisen, 0, 0));
  p.dungeonsCleared = Math.round(num(p.dungeonsCleared, 0, 0));
  p.tutorial = Math.round(num(p.tutorial, 0, 0));
  p.chapter  = clamp(Math.round(num(p.chapter, 0, 0)), 0, 99);
  for (const k of ["STR","INT","SDW","VIT","AGI","MNA","points"])
    p.stats[k] = Math.round(num(p.stats[k], 0, 0));
  for (const k in p.weapons)  p.weapons[k]  = Math.round(num(p.weapons[k], 1, 0));
  for (const k in p.weaponLv) p.weaponLv[k] = Math.round(num(p.weaponLv[k], 1, 1));
  for (const k in p.talents)  p.talents[k]  = Math.round(num(p.talents[k], 0, 0));
  for (const u in p.shadows){
    const sh = p.shadows[u];
    if (!sh || !SHADOWS[sh.id]){ delete p.shadows[u]; continue; }   // sombra de una versión anterior
    sh.level = Math.round(num(sh.level, 1, 1));
    sh.xp = num(sh.xp, 0, 0);
  }
  for (const k in p.relics) if (!RELICS[k]) delete p.relics[k];
  for (const k in p.runes)  if (!RUNES[k])  delete p.runes[k];
  p.islands = p.islands.filter(id => ISLANDS.some(i => i.id === id));
  if (!p.islands.length) p.islands = ["Seoul"];
  if (!WEAPONS[p.weapon]) p.weapon = START_WEAPON;
  if (!p.weapons[p.weapon]) p.weapons[p.weapon] = 1;
  if (!RANKS.some(r => r.name === p.rank)) p.rank = "E";
  if (!isleOf(p.island)) p.island = "Seoul";
  p.squad = p.squad.filter(u => p.shadows[u]).slice(0, FLAGS.SQUAD_MAX);
  return p;
}
let P = (() => { try { return reconcile(JSON.parse(localStorage.getItem(SAVE_KEY) || "null")); } catch { return newProfile(); } })();
function save(){
  // guarda también dónde estabas, para no reaparecer en el centro del mundo
  if (typeof player !== "undefined" && !dungeon) P.pos = { x:player.x, y:player.y };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch {}
}

/* --------------------------- valores derivados ---------------------------- */
// El nivel de arma (fusión de 3 copias) vive en el perfil, no muta el catálogo.
const weaponLv    = id => P.weaponLv?.[id] || 1;
const weaponDmg   = () => {
  const w = WEAPONS[P.weapon] || WEAPONS[START_WEAPON];
  return Math.max(6, w.dmg) * Math.pow(1.25, weaponLv(w.id) - 1);
};
const rankMult    = () => rankOf(P.rank).dmg + (P.awakened ? 0.25 : 0) + P.rebirths * 0.5;
const classBonus  = k => (CLASSES[P.class] || CLASSES.Warrior).bonus[k] || 0;
const talentLv    = id => P.talents?.[id] || 0;
const blessed     = () => (P.blessing || 0) > now();
const baseDamage  = () => FORMULA.physicalDamage(weaponDmg(), P.stats.STR) * (blessed() ? 1.4 : 1)
  * (1 + rankMult() + classBonus("dmg") + talentLv("power") * 0.08)
  * (1 + P.level * 0.012);
const relicBonus  = effect => Object.keys(P.relics).reduce((a, id) => a + (RELICS[id]?.effect === effect ? RELICS[id].value : 0), 0);
const shadowMult  = () => 1 + relicBonus("shadowDmg") + classBonus("shadow") + talentLv("legion") * 0.15;
const ariseLuck   = () => rankOf(P.rank).luck + P.stats.INT * 0.35 + relicBonus("ariseLuck")
  + (P.awakened ? 60 : 0) + classBonus("luck") * 100 + talentLv("fortune") * 12;
const maxHP       = () => FORMULA.maxHP(100 + P.level * 6 + P.rebirths * 500, P.stats.VIT)
  * (1 + classBonus("hp") + talentLv("vigor") * 0.1);
const maxMana     = () => FORMULA.maxMana(P.stats.MNA) * (1 + classBonus("mana"));
const shadowDmgOf = s => FORMULA.shadowDamage(SHADOWS[s.id].dmg * (1 + (s.level - 1) * 0.1), P.stats.SDW) * shadowMult();
const shadowHPOf  = s => FORMULA.shadowHP(SHADOWS[s.id].hp * (1 + (s.level - 1) * 0.1), P.stats.SDW);

/* ===========================================================================
   MUNDO, COMBATE Y SISTEMAS
   =========================================================================== */
const player = {
  x:CFG.WORLD.cx, y:CFG.WORLD.cy - 40, h:0, vh:0, jumps:0, yaw:Math.PI, moveAmt:0,
  hp:maxHP(), mana:maxMana(), face:1, step:0,
  combo:0, comboAt:0, phase:"idle", phaseT:0, atkDef:null, hitDone:false,
  dashT:0, dashX:0, dashY:0, dashCd:0, skillCd:0, dead:0, hurt:0, mounted:false,
  dps:{ total:0, since:0, shown:0 },
};
let enemies = [], corpses = [], shadows = [], floaters = [], parts = [], rings = [], portal = null, dungeon = null;
let spawnT = 0, portalT = FLAGS.PORTAL_INTERVAL_SECONDS, hitstop = 0, auto = false, dirty = true, paused = false;
const cam = { x:player.x, y:player.y, shake:0, shakeV:0, impulse:0, dist:0, distV:0 };
let target = null;

/* ------------------------------- enemigos --------------------------------- */
function enemyDef(kind){
  const isle = dungeon ? dungeon.isle : regionAt(player.x, player.y);
  if (dungeon) return dungeon.enemyDef(kind);
  const base = kind === "brute" ? isle.brute : isle.enemy;
  // La dificultad sube de forma continua dentro del anillo hacia la región
  // siguiente. Sin esto, cruzar una frontera multiplicaba de golpe por
  // trescientos la vida del enemigo y el salto era un muro.
  const idx = ringAt(player.x, player.y);
  const next = ISLANDS[idx + 1];
  const def = { ...base };
  if (next){
    const d = Math.hypot(player.x - CFG.WORLD.cx, player.y - CFG.WORLD.cy);
    const t = clamp((d - idx * CFG.RING_WIDTH) / CFG.RING_WIDTH, 0, 1);
    const k = t * t;                       // la subida se nota al acercarte al borde
    const nb = kind === "brute" ? next.brute : next.enemy;
    def.lvl = Math.max(1, Math.round(base.lvl + (nb.lvl - base.lvl) * k));
    def.hp  = Math.round(base.hp  * Math.pow(nb.hp  / base.hp,  k));
    def.dmg = Math.round(base.dmg * Math.pow(nb.dmg / base.dmg, k));
    if (t > 0.62) def.name = `${base.name} veterano`;
  }
  return { ...def, isle:isle.id, shadow: isle.shadow, kind, r: kind === "brute" ? 24 : 18 };
}
function spawnEnemy(def, x, y){
  const d = def || enemyDef(Math.random() < 0.25 ? "brute" : "normal");
  const a = rnd(0, Math.PI*2), dist = rnd(300, 560);
  const seed = Math.floor(Math.random() * 1e9);
  const pick = (arr, k) => arr[(seed >> k) % arr.length];
  const look = {
    shirt: pick(["#d8503f","#3f7ad8","#4aa85a","#c06b28","#7a4ac0","#2f8d8d","#b8484a","#5a6b8c"], 3),
    pants: pick(["#2f3a52","#3a4a2f","#4a3a2f","#2f2f3a","#40384a"], 7),
    boots: pick(["#23283a","#2e2418","#1f2b1f"], 11),
    hair:  pick(["#2b1d12","#5a3a1a","#1a1a22","#8a5a2a","#a03a2a","#d8c060"], 13),
    hat:   ((seed >> 17) % 5 === 0) ? pick(["#2f3a52","#8a3030","#2d5a35"], 19) : null,
    backpack: ((seed >> 21) % 6 === 0) ? "#4a3a28" : null,
    height: 0.92 + ((seed >> 23) % 20) / 100,
  };
  const e = {
    guid:uid(), def:d, name:d.name, level:d.lvl, look,
    isle: (dungeon ? regionAt(player.x, player.y) : regionAt(x ?? player.x, y ?? player.y)).id,
    x: x ?? clamp(player.x + Math.cos(a)*dist, 80, CFG.WORLD.w-80),
    y: y ?? clamp(player.y + Math.sin(a)*dist, 80, CFG.WORLD.h-80),
    hp:d.hp, maxHp:d.hp, atkCd:rnd(.6,1.8), hurt:0, step:rnd(0,6), stun:0,
    boss:!!d.boss, phase:1, telegraph:null, moveCd:0,
  };
  enemies.push(e);
  return e;
}

/* -------------------------------- daño ------------------------------------ */
function dealDamage(e, amount, opts){
  if (!e || e.hp <= 0) return;
  const o = opts || {};
  const critChance = CFG.CRIT_CHANCE + classBonus("crit") + talentLv("crit") * 0.03;
  const crit = o.crit ?? (Math.random() < critChance);
  const dmg = amount * (crit ? CFG.CRIT_MULT : 1);
  const applied = Math.min(dmg, e.hp);
  e.hp -= applied; e.hurt = 0.14;
  player.dps.total += applied;
  target = e;
  floaters.push({ x:e.x + rnd(-24,24), y:e.y, h:78 + e.def.r*1.6, text:fmt(applied), life:1,
                  color: crit ? "#ffd24a" : (o.shadow ? "#bfe2ff" : "#fff3c4"), big:!o.shadow, crit });
  spark(e.x, e.y, 52, crit ? 14 : 7, crit ? "#ffe9a8" : (o.shadow ? "#9bdcff" : "#fff1b8"));
  if (crit) ring(e.x, e.y, 90, "#ffd24a", .45);
  SFX.hit(crit);
  if (!o.shadow){ hitstop = Math.max(hitstop, o.hitstop ?? 0.02); camImpulse(o.cam ?? 0.2); }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e){
  enemies = enemies.filter(x => x !== e);
  if (target === e) target = null;
  P.kills++;
  gainXP(FORMULA.expReward(e.level, P.rebirths));
  const cash = Math.max(1, Math.floor(e.level * 12 * (1 + P.rebirths * 0.3) * (dungeon?.runes?.Cash ? 1.1 : 1)));
  P.cash += cash;
  burst(e.x, e.y, 22, e.def.color || "#ffd9a8", 40);
  ring(e.x, e.y, 120, "#8fd0ff", .5);
  SFX.kill();
  // CorpseToken (contrato 07)
  while (corpses.length >= FLAGS.MAX_CORPSES) corpses.shift();
  corpses.push({
    CorpseId:uid(), EnemyId:e.def.name, ShadowDefinitionId:e.def.shadow || isleOf(P.island).shadow,
    OwnerPlayerId:1, SpawnedAt:now(), ExpiresAt:now() + FLAGS.CORPSE_LIFETIME,
    AttemptsRemaining:FLAGS.ARISE_ATTEMPTS, Consumed:false,
    x:e.x, y:e.y, level:e.level, phase:0, boss:e.boss,
  });
  if (dungeon) dungeon.onKill(e);
  dirty = true;
}
function gainXP(amount){
  P.xp += amount;
  let leveled = false;
  while (P.level < FLAGS.LEVEL_CAP && P.xp >= FORMULA.expRequired(P.level)){
    P.xp -= FORMULA.expRequired(P.level);
    P.level++; P.stats.points += 3; leveled = true;
  }
  if (leveled){
    player.hp = maxHP(); player.mana = maxMana();
    note(`Nivel ${P.level} · +3 puntos`, "--xp");
    burst(player.x, player.y, 30, "#5ce8a6", 30); SFX.levelUp();
    for (const isle of ISLANDS){
      if (P.level >= isle.level && !P.islands.includes(isle.id)){
        P.islands.push(isle.id);
        note(`Isla desbloqueada: ${isle.name}`, "--gem");
      }
    }
  }
  dirty = true;
}

/* ------------------------- combate del jugador ---------------------------- */
function nearestEnemy(x, y, range, cone){
  let best = null, bd = range;
  for (const e of enemies){
    const d = Math.hypot(e.x-x, e.y-y);
    if (d < bd){ bd = d; best = e; }
  }
  return best;
}
// M1: cadena de 4 golpes con startup/active/recovery del contrato V9.
function requestAttack(){
  if (player.dead > 0 || player.phase !== "idle") return;
  if (now() - player.comboAt > CFG.COMBO_RESET) player.combo = 0;
  const def = COMBO[player.combo % COMBO.length];
  const haste = 1 / (1 + talentLv("haste") * 0.06 + classBonus("speed"));
  player.atkDef = { ...def, active:def.active * haste, recovery:def.recovery * haste };
  player.phase = "startup"; player.phaseT = def.startup * haste; player.hitDone = false;
  player.combo = (player.combo + 1) % COMBO.length; player.comboAt = now();
}
function requestSkill(){
  if (player.dead > 0 || player.phase !== "idle") return;
  if (player.skillCd > 0) return note("Habilidad en enfriamiento", "--dim");
  if (player.mana < SKILL.costs.mana) return note("Maná insuficiente", "--mana");
  player.mana -= SKILL.costs.mana;
  player.skillCd = SKILL.cooldown;
  player.atkDef = { ...SKILL, mult:0, skill:true, cam:SKILL.feedback.cam, hitstop:SKILL.feedback.hitstop };
  player.phase = "startup"; player.phaseT = SKILL.startup; player.hitDone = false;
  SFX.skill(); tutState.skilled = true;
}
function resolveHit(){
  const def = player.atkDef;
  if (!def) return;
  if (def.skill){
    // Arco: radio 190, 70° al frente (hitbox del AttackDefinition)
    const dmg = weaponDmg() * SKILL.damage.weapon + P.stats.STR * SKILL.damage.str * 1.5;
    const total = dmg * (1 + rankMult());
    let hits = 0;
    const skillDmg = total * (1 + classBonus("skill"));
    for (const e of enemies.slice()){
      if (Math.hypot(e.x-player.x, e.y-player.y) > SKILL.hitbox.radius) continue;
      dealDamage(e, skillDmg, { cam:SKILL.feedback.cam, hitstop:SKILL.feedback.hitstop });
      hits++;
    }
    ring(player.x, player.y, SKILL.hitbox.radius * 1.1, "#7fc6ff", .55);
    camImpulse(SKILL.feedback.cam);
    if (!hits) hitstop = Math.max(hitstop, 0.02);
    return;
  }
  const e = nearestEnemy(player.x, player.y, CFG.ATTACK_RANGE);
  if (!e){ return; }
  player.yaw = Math.atan2(e.x - player.x, e.y - player.y);
  dealDamage(e, baseDamage() * def.mult, { cam:def.cam, hitstop:def.hitstop });
}
function requestDash(){
  if (player.dashCd > 0 || player.dead > 0) return;
  const v = inputVector();
  const dx = v.x || 0, dy = v.y || (v.x ? 0 : -1);
  const len = Math.hypot(dx, dy) || 1;
  player.dashX = dx/len; player.dashY = dy/len;
  player.dashT = CFG.DASH_TIME;
  player.dashCd = FORMULA.dashCooldown(P.stats.AGI);
  camImpulse(0.35); SFX.dash(); tutState.dashed = true;
  for (let i=0;i<10;i++) parts.push({ x:player.x, y:player.y, h:rnd(10,60), vx:rnd(-60,60), vy:rnd(-60,60),
                                      vh:rnd(20,80), life:rnd(.25,.45), color:"#bfe2ff", size:rnd(2,4) });
}
function requestJump(){
  if (player.dead > 0) return;
  const maxJumps = FORMULA.doubleJump(P.stats.AGI) ? 2 : 1;
  if (player.jumps >= maxJumps) return;
  player.jumps++;
  player.vh = CFG.JUMP_V * (player.jumps > 1 ? 0.88 : 1);
  if (player.jumps > 1) ring(player.x, player.y, 60, "#9bdcff", .3, player.h);
}

/* ------------------------- ARISE (contrato 07) ---------------------------- */
let ariseToken = null, ariseAnim = 0;
function nearestCorpse(){
  let best = null, bd = CFG.ARISE_RANGE;
  for (const c of corpses){
    const d = Math.hypot(c.x-player.x, c.y-player.y);
    if (d < bd){ bd = d; best = c; }
  }
  return best;
}
const corpseRate = c => FORMULA.effectiveRate(SHADOWS[c.ShadowDefinitionId]?.rate ?? 0.3, ariseLuck());
// READ -> VALIDATE -> ROLL -> CREATE -> RECORD -> CONSUME -> ACK
function attemptArise(c){
  if (!c || c.Consumed) return { ok:false, code:"CONSUMED" };
  if (c.ExpiresAt < now()) { consumeCorpse(c, false); return { ok:false, code:"EXPIRED" }; }
  if (c.AttemptsRemaining <= 0) return { ok:false, code:"NO_ATTEMPTS" };
  if (Math.hypot(c.x-player.x, c.y-player.y) > CFG.ARISE_RANGE * 1.5) return { ok:false, code:"TOO_FAR" };
  c.AttemptsRemaining--;
  const rate = corpseRate(c);
  ariseAnim = now();
  if (Math.random() <= rate){
    const def = SHADOWS[c.ShadowDefinitionId];
    const shadow = { uuid:uid(), id:def.id, name:def.name, tier:def.tier, level:1, xp:0, lock:false };
    P.shadows[shadow.uuid] = shadow;
    P.index[def.id] = (P.index[def.id] || 0) + 1;
    P.arisen++;
    const replaced = autoEquip(shadow);
    P.ledger.push({ tx:uid(), type:"ShadowCreated", id:def.id, at:Date.now() });
    if (P.ledger.length > 50) P.ledger.shift();
    consumeCorpse(c, true);
    rebuildSquad(); save(); dirty = true;
    burst(c.x, c.y, 54, "#2fe4ff", 20); ring(c.x, c.y, 180, "#2fe4ff", .8);
    SFX.arise();
    camImpulse(0.5);
    return { ok:true, shadow, replaced, rate };
  }
  if (c.AttemptsRemaining <= 0){
    const gems = Math.max(1, Math.floor((SHADOWS[c.ShadowDefinitionId]?.gems ?? 1) * (1 + c.level * 0.05)));
    P.gems += gems; consumeCorpse(c, true); save(); dirty = true;
    return { ok:false, code:"EXHAUSTED", gems, rate };
  }
  burst(c.x, c.y, 16, "#4a5f8a", 16); SFX.ariseFail();
  return { ok:false, code:"FAILED", attempts:c.AttemptsRemaining, rate };
}
function consumeCorpse(c, consumed){
  c.Consumed = true;
  corpses = corpses.filter(x => x !== c);
  if (ariseToken === c) closeArise();
}
function destroyCorpse(c){
  if (!c) return 0;
  const gems = Math.max(1, Math.floor((SHADOWS[c.ShadowDefinitionId]?.gems ?? 1) * (1 + c.level * 0.05)));
  P.gems += gems; consumeCorpse(c, true); save(); dirty = true;
  note(`+${fmt(gems)} gemas`, "--gem");
  return gems;
}
// Capacidad de escuadrón: al estar lleno cae la sombra de menor daño.
function autoEquip(shadow){
  if (P.squad.length < squadCap()){ P.squad.push(shadow.uuid); return null; }
  let worst = null, worstDmg = Infinity;
  for (const u of P.squad){
    const s = P.shadows[u];
    const d = s ? shadowDmgOf(s) : -1;
    if (d < worstDmg){ worstDmg = d; worst = u; }
  }
  if (worst && shadowDmgOf(shadow) > worstDmg){
    P.squad[P.squad.indexOf(worst)] = shadow.uuid;
    return worst;
  }
  return null;
}

/* --------------------- sombras: FSM del contrato 06 ----------------------- */
function rebuildSquad(){
  const keep = new Map(shadows.map(s => [s.uuid, s]));
  const cap = squadCap();
  shadows = P.squad.slice(0, cap).map((uuid, i) => {
    const data = P.shadows[uuid];
    if (!data) return null;
    const prev = keep.get(uuid);
    const a = (i / cap) * Math.PI * 2;
    const base = prev || {
      uuid, id:data.id, slot:i, state:"IDLE_FOLLOW", atkCd:0, step:rnd(0,6), swing:0,
      x:player.x + Math.cos(a)*CFG.SHADOW_FOLLOW, y:player.y + Math.sin(a)*CFG.SHADOW_FOLLOW, target:null,
    };
    base.slot = i; base.data = data; base.dmg = shadowDmgOf(data); base.hp = shadowHPOf(data);
    return base;
  }).filter(Boolean);
  dirty = true;
}
// TargetScore = distancia + amenaza al dueño + foco manual + peso de jefe
function scoreTarget(s, e){
  const d = Math.hypot(e.x-s.x, e.y-s.y);
  if (d > CFG.SHADOW_AGGRO) return -Infinity;
  let score = 100 - d * 0.2;
  if (Math.hypot(e.x-player.x, e.y-player.y) < 160) score += 45;   // ownerThreat
  if (e === target) score += 30;                                    // manualFocus
  if (e.boss) score += 60;                                          // bossWeight
  return score;
}
function stepShadow(s, dt){
  let t = s.target && enemies.includes(s.target) && s.target.hp > 0 ? s.target : null;
  if (!t) s.target = null;
  let dOwner = Math.hypot(s.x-player.x, s.y-player.y);
  // Si el ejército se queda demasiado atrás (viaje rápido, mazmorra, dash,
  // reaparición) tardaba minutos en volver y entretanto no peleaba. Pasado
  // ese punto la sombra reaparece junto a ti, como en el propio Solo Leveling.
  if (dOwner > CFG.SHADOW_LEASH * 3){
    const a = (s.slot / 8) * Math.PI * 2;
    s.x = player.x + Math.cos(a) * CFG.SHADOW_FOLLOW;
    s.y = player.y + Math.sin(a) * CFG.SHADOW_FOLLOW;
    dOwner = CFG.SHADOW_FOLLOW;
    s.state = "IDLE_FOLLOW";
    spark(s.x, s.y, 40, 8, "#31e4ff");
  }
  if (dOwner > CFG.SHADOW_LEASH){ s.state = "RECALLED"; s.target = t = null; }

  if (!t && s.state !== "RECALLED"){
    let best = null, bestScore = -Infinity;
    for (const e of enemies){
      const sc = scoreTarget(s, e);
      if (sc > bestScore){ bestScore = sc; best = e; }
    }
    if (best){ s.target = t = best; s.state = best.boss ? "BOSS_FOCUS" : "TARGET_ACQUIRE"; }
  }
  let dx = 0, dy = 0;
  if (t){
    const d = Math.hypot(t.x-s.x, t.y-s.y);
    if (d <= CFG.SHADOW_RANGE){
      if (s.atkCd <= 0){
        s.state = "ATTACK"; s.atkCd = CFG.SHADOW_CD; s.swing = 0.2;
        dealDamage(t, s.dmg, { shadow:true, crit:Math.random() < 0.1 });
      } else s.state = "RECOVER";
    } else { dx = t.x - s.x; dy = t.y - s.y; }
  } else {
    // formación en anillos concéntricos: con muchas sombras no se apelotonan
    const ringIdx = Math.floor(s.slot / 8), inRing = s.slot % 8;
    const a = (inRing / 8) * Math.PI * 2 + now() * (0.25 - ringIdx * 0.05) + ringIdx * 0.4;
    const rad = CFG.SHADOW_FOLLOW + ringIdx * 105;
    const fx = player.x + Math.cos(a) * rad, fy = player.y + Math.sin(a) * rad;
    dx = fx - s.x; dy = fy - s.y;
    if (Math.hypot(dx, dy) < 8) s.state = "IDLE_FOLLOW";
  }
  const len = Math.hypot(dx, dy);
  if (t) s.yaw = Math.atan2(t.x - s.x, t.y - s.y);
  if (len > 2){
    const sp = CFG.SHADOW_SPEED * (s.state === "RECALLED" ? 1.8 : 1);
    const step = Math.min(sp * dt, len);
    s.x += dx/len * step; s.y += dy/len * step;
    if (!t) s.yaw = Math.atan2(dx, dy);
    s.step += dt * 7;
    if (s.state === "RECALLED" && dOwner < CFG.SHADOW_FOLLOW * 1.5) s.state = "IDLE_FOLLOW";
  } else s.step += dt * 1.4;
  s.atkCd -= dt; s.swing = Math.max(0, s.swing - dt);
}

/* --------------------------- motor de mazmorra ---------------------------- */
const DUNGEON_MODES = {
  Standard:      { name:"Estándar",         rooms:3, mult:1.6,  reward:1.5, color:"#6aa8ff" },
  RedGate:       { name:"Puerta Roja",      rooms:4, mult:3.2,  reward:3.0, color:"#ff5d6c" },
  DoubleDungeon: { name:"Double Dungeon",   rooms:2, mult:5.0,  reward:6.0, color:"#bb8cff" },
  BossRush:      { name:"Boss Rush",        rooms:5, mult:2.4,  reward:4.0, color:"#ffd24a" },
};
let returnPoint = null;   // sitio del mundo abierto al que se vuelve al salir de una mazmorra
function makeDungeon(modeId){
  const mode = DUNGEON_MODES[modeId] || DUNGEON_MODES.Standard;
  const isle = isleOf(P.island);
  const seed = Math.floor(Math.random() * 1e9);
  const runeKeys = Object.keys(RUNES).filter(() => Math.random() < 0.4);
  const d = {
    id:uid(), modeId, mode, seed, isle, room:1, rooms:mode.rooms, phase:"Wave",
    timeLimit:180, timer:180 + (runeKeys.includes("Time") ? 60 : 0),
    runes:Object.fromEntries(runeKeys.map(k => [k, true])),
    bossState:null, cleared:false, rewardTx:null,
  };
  d.enemyDef = kind => {
    const base = kind === "brute" ? isle.brute : isle.enemy;
    const hpMult = mode.mult * (d.runes.Health ? 0.95 : 1) * (d.room * 0.9);
    return { ...base, name:`${base.name} de la Puerta`, hp:base.hp*hpMult, dmg:base.dmg*mode.mult,
             lvl:Math.floor(base.lvl*1.2), isle:isle.id, shadow:isle.shadow, kind, r: kind === "brute" ? 24 : 18 };
  };
  d.onKill = e => {
    if (e.boss){
      if (d.room >= d.rooms){ clearDungeon(); }
      else { d.room++; nextRoom(); }
    } else if (!enemies.length && d.phase === "Wave"){
      d.room < d.rooms ? (d.room++, nextRoom()) : spawnBoss();
    }
  };
  return d;
}
function nextRoom(){
  const d = dungeon; if (!d) return;
  enemies = []; corpses = [];
  d.phase = d.room >= d.rooms ? "Boss" : "Wave";
  banner(d.phase === "Boss" ? "SALA DEL JEFE" : `SALA ${d.room} / ${d.rooms}`, d.mode.color);
  if (d.phase === "Boss") spawnBoss();
  else for (let i=0;i<5;i++) spawnEnemy(d.enemyDef(i % 3 === 0 ? "brute" : "normal"));
}
function spawnBoss(){
  const d = dungeon; if (!d) return;
  d.phase = "Boss";
  const b = d.isle.boss;
  const boss = spawnEnemy({
    name:b.name, lvl:b.lvl, hp:b.hp * d.mode.mult * (d.runes.Health ? 0.95 : 1), dmg:b.dmg * d.mode.mult,
    shadow:b.shadow, isle:d.isle.id, kind:"boss", r:38, boss:true, color:"#ffb36b",
  }, player.x, player.y - 420);
  d.bossState = { phase:1, thresholds:[0.70, 0.40, 0.15] };
  target = boss;
  banner(b.name.toUpperCase(), "#ffd24a");
}
function clearDungeon(){
  const d = dungeon; if (!d || d.cleared) return;
  d.cleared = true; d.rewardTx = uid();
  P.dungeonsCleared++;
  const gems = Math.floor(400 * d.mode.reward * (1 + P.level*0.02) * (d.runes.Gems ? 1.1 : 1));
  const cash = Math.floor(d.isle.enemy.hp * 0.4 * d.mode.reward * (d.runes.Cash ? 1.1 : 1));
  P.gems += gems; P.cash += cash; P.tickets += 1;
  // Recompensas especiales por modo
  if (d.modeId === "DoubleDungeon" && !P.awakened){
    P.awakened = true; P.title = "Awakened";
    P.relics.BlackMonarch = true;
    banner("DESPERTAR", "#bb8cff");
    note("Awakened · +60% suerte de Arise · Black Monarch Sigil", "--monarch");
  }
  const relic = Object.values(RELICS).find(r => r.isle === d.isle.id && !P.relics[r.id]);
  if (relic && Math.random() < 0.5){ P.relics[relic.id] = true; note(`Reliquia: ${relic.name}`, "--gold"); }
  const rune = Object.keys(RUNES)[Math.floor(Math.random()*4)];
  P.runes[rune] = (P.runes[rune] || 0) + 1;
  banner("MAZMORRA COMPLETADA", "#5ce8a6");
  note(`+${fmt(gems)} gemas · +${fmt(cash)} oro · +1 ticket`, "--cash");
  save();
  const runId = d.id;
  setTimeout(() => { if (dungeon && dungeon.id === runId) exitDungeon(); }, 3200);
}
function enterDungeon(modeId){
  if (!portal && !modeId) return;
  const mode = modeId || portal.modeId;
  portal = null;
  dungeon = null;
  dungeon = makeDungeon(mode);
  enemies = []; corpses = []; shadows.forEach(s => { s.target = null; });
  // Se guarda dónde estabas: al salir vuelves ahí, no al centro del mundo.
  returnPoint = { x:player.x, y:player.y };
  player.x = CFG.WORLD.cx; player.y = CFG.WORLD.cy; player.hp = maxHP();
  banner(dungeon.mode.name.toUpperCase(), dungeon.mode.color);
  tutState.entered = true;
  const runeNames = Object.keys(dungeon.runes).map(k => RUNES[k].name).join(" · ");
  if (runeNames) note(`Runas activas: ${runeNames}`, "--gem");
  nextRoom();
  dirty = true;
}
function exitDungeon(){
  dungeon = null; enemies = []; corpses = [];
  if (returnPoint){ player.x = returnPoint.x; player.y = returnPoint.y; returnPoint = null; }
  else { player.x = CFG.WORLD.cx; player.y = CFG.WORLD.cy; }
  P.island = regionAt(player.x, player.y).id;
  portalT = FLAGS.PORTAL_INTERVAL_SECONDS;
  note("De vuelta al mundo abierto", "--spec");
  dirty = true;
}
function spawnPortal(){
  const modes = ["Standard", FLAGS.ENABLE_RED_GATE && "RedGate", FLAGS.ENABLE_DOUBLE_DUNGEON && "DoubleDungeon",
                 FLAGS.ENABLE_BOSS_RUSH && "BossRush"].filter(Boolean);
  const modeId = modes[Math.floor(Math.random()*modes.length)];
  const a = rnd(0, Math.PI*2);
  portal = { modeId, mode:DUNGEON_MODES[modeId], t:0,
             x:clamp(player.x + Math.cos(a)*600, 150, CFG.WORLD.w-150),
             y:clamp(player.y + Math.sin(a)*600, 150, CFG.WORLD.h-150) };
  banner(`PORTAL · ${portal.mode.name}`, portal.mode.color);
  SFX.portal();
  note(`Se abrió un portal (${portal.mode.name})`, "--arise");
  dirty = true;
}

/* -------------------------- misiones de NPC -------------------------------- */
const QUEST_TEMPLATES = [
  { id:"hunt",  text:n => `Derrota a ${n} enemigos`,   goal:() => 10 + Math.floor(P.level/2), type:"kills" },
  { id:"arise", text:n => `Extrae ${n} sombras`,       goal:() => 3 + Math.floor(P.level/20), type:"arisen" },
  { id:"gate",  text:n => `Completa ${n} mazmorra(s)`, goal:() => 1, type:"dungeons" },
];
const npc = { x:CFG.WORLD.cx + 230, y:CFG.WORLD.cy - 210, step:0 };
/*  Elenco propio de cazadores: cada uno vive en un anillo del mapa abierto y
    ofrece un servicio distinto. (Diseños y nombres originales.)  */
const HUNTERS = [
  { id:"jinho", name:"Yoo Jinho", rank:"D", ring:0, angle:1.5, role:"suministros",
    line:"¡Jefe! Le he traído suministros del gremio. Dígame qué necesita.",
    look:{ shirt:"#1f4f8a", sleeve:"#17406f", pants:"#20283a", hair:"#1b1b22", pauldron:"#2f6bd8", armor:"#8fd0ff", weaponKind:"sword", weapon:"#cfd9ee" } },
  { id:"jinchul", name:"Woo Jinchul", rank:"B", ring:0, angle:4.7, role:"asociacion",
    line:"Asociación de Cazadores. Tengo trabajo para ti si lo quieres.",
    look:{ shirt:"#23283a", sleeve:"#1a1f2e", pants:"#181c28", hair:"#14161e", pauldron:"#3a4358", armor:"#7d8aa8", weaponKind:"sword", weapon:"#b9c4d8" } },
  { id:"haein", name:"Cha Hae-In", rank:"S", ring:2, angle:2.2, role:"bendicion",
    line:"Hueles distinto al resto de cazadores. Deja que te cubra la espalda.",
    look:{ shirt:"#f0e6d2", sleeve:"#dccfb4", pants:"#2f3a52", hair:"#f2d06b", pauldron:"#e8d9a8", armor:"#ffe9a8", weaponKind:"sword", weapon:"#fff3c4" } },
  { id:"yoonho", name:"Baek Yoonho", rank:"S", ring:3, angle:0.6, role:"entrenar",
    line:"Los Tigres Blancos entrenamos duro. Enséñame lo que sabes hacer.",
    look:{ shirt:"#3a2a1e", sleeve:"#2d2018", pants:"#241a12", hair:"#e8e2d8", pauldron:"#8a6a44", armor:"#d8c8a8", weaponKind:"axe", weapon:"#c9b898" } },
  { id:"jongin", name:"Choi Jong-In", rank:"S", ring:4, angle:3.6, role:"forja",
    line:"Puedo grabar runas de fuego en tu arma. No será barato.",
    look:{ shirt:"#7a1f2b", sleeve:"#5e1620", pants:"#2a1a1e", hair:"#c93a2a", pauldron:"#b0402f", armor:"#ff7a3a", weaponKind:"staff", weapon:"#ff9a4d" } },
  { id:"gunhee", name:"Go Gunhee", rank:"S", ring:5, angle:5.6, role:"rango",
    line:"Presido esta Asociación desde hace décadas. Veamos de qué eres capaz.",
    look:{ shirt:"#2a2f45", sleeve:"#20243a", pants:"#1a1e2e", hair:"#e8e8ec", pauldron:"#4a5570", armor:"#ffd24a", weaponKind:"staff", weapon:"#ffd24a" } },
  { id:"thomas", name:"Thomas Andre", rank:"Nacional", ring:8, angle:2.9, role:"desafio",
    line:"Rango nacional. Si quieres pelear conmigo, trae a tu ejército entero.",
    look:{ shirt:"#20303f", sleeve:"#18242f", pants:"#141c26", hair:"#c9a33a", pauldron:"#6b7a94", armor:"#9fd8ff", weaponKind:"axe", weapon:"#dfe8f5" } },
];
for (const h of HUNTERS){
  const r = ringRadius(h.ring);
  h.x = CFG.WORLD.cx + Math.cos(h.angle) * r;
  h.y = CFG.WORLD.cy + Math.sin(h.angle) * r;
  h.step = 0; h.yaw = 0; h.cooldown = 0;
}
let hunterNear = null;
function hunterService(h){
  if (h.cooldown > 0) return note(`${h.name} necesita un momento (${Math.ceil(h.cooldown)}s)`, "--dim");
  if (h.role === "suministros"){
    const gain = Math.floor(600 * (1 + P.level * 0.6));
    P.cash += gain; P.tickets += 1;
    note(`Yoo Jinho: suministros entregados · +${fmt(gain)} de oro y 1 ticket`, "--cash");
    h.cooldown = 90;
  } else if (h.role === "asociacion"){
    if (!P.quests.active) takeQuest();
    else note("Woo Jinchul: termina el encargo que ya tienes", "--dim");
  } else if (h.role === "bendicion"){
    player.hp = maxHP(); player.mana = maxMana();
    P.blessing = now() + 30;
    note("Cha Hae-In te cubre · +40% de daño durante 30 s", "--xp");
    banner("BENDICIÓN", "#ffe9a8");
    h.cooldown = 60;
  } else if (h.role === "rango"){
    const next = RANKS[rankIdx(P.rank) + 1];
    if (!next) return note("Go Gunhee: ya no queda rango por encima del tuyo", "--gold");
    if (P.level < next.level) return note(`Go Gunhee: vuelve al nivel ${next.level}`, "--hp");
    if (P.gems < next.gems) return note(`Faltan ${fmt(next.gems - P.gems)} gemas para el examen`, "--hp");
    P.gems -= next.gems; P.rank = next.name;
    banner(`RANGO ${next.name}`, "#ffd24a");
    note(`Go Gunhee: examen superado. Ahora eres rango ${next.name}`, "--gold");
  } else if (h.role === "desafio"){
    if (enemies.some(e => e.boss)) return note("Ya tienes un jefe encima", "--dim");
    const def = regionAt(player.x, player.y).boss;
    spawnEnemy({ name:`${def.name} (desafío)`, lvl:def.lvl, hp:def.hp * 1.5, dmg:def.dmg * 1.2,
                 shadow:def.shadow, kind:"boss", r:38, boss:true, color:"#ffb36b" },
               player.x, player.y - 320);
    banner("DESAFÍO ACEPTADO", "#ff8d97");
    note("Thomas Andre invoca a un jefe para ti", "--hp");
    h.cooldown = 120;
  } else if (h.role === "forja"){
    const cost = Math.floor(1e4 * Math.pow(3, weaponLv(P.weapon) - 1));
    if (P.cash < cost) return note(`Faltan ${fmt(cost - P.cash)} de oro para templar`, "--hp");
    P.cash -= cost; P.weaponLv[P.weapon] = weaponLv(P.weapon) + 1;
    note(`${WEAPONS[P.weapon].name} templada · rango ${P.weaponLv[P.weapon]}`, "--gold");
    banner("ARMA TEMPLADA", "#ffd24a");
  } else if (h.role === "sanar"){
    player.hp = maxHP(); player.mana = maxMana();
    P.blessing = now() + 30;
    note("Curado por completo · bendición +40% de daño (30 s)", "--xp");
    banner("BENDICIÓN", "#5ce8a6");
    h.cooldown = 60;
  } else if (h.role === "entrenar"){
    const cost = 200 + P.level * 20;
    if (P.gems < cost) return note(`Faltan ${fmt(cost - P.gems)} gemas para entrenar`, "--hp");
    P.gems -= cost; P.stats.points += 5;
    note("+5 puntos de atributo", "--gem");
    h.cooldown = 20;
  } else {
    openPanel("items"); panelTab = "Index"; renderPanel();
  }
  save(); dirty = true;
}
function questProgress(){
  const q = P.quests.active; if (!q) return 0;
  const cur = q.type === "kills" ? P.kills : q.type === "arisen" ? P.arisen : P.dungeonsCleared;
  return cur - q.start;
}
function takeQuest(){
  if (P.quests.active) return;
  const t = QUEST_TEMPLATES[Math.floor(Math.random()*QUEST_TEMPLATES.length)];
  const goal = t.goal();
  P.quests.active = { id:t.id, type:t.type, goal, start: t.type === "kills" ? P.kills : t.type === "arisen" ? P.arisen : P.dungeonsCleared,
                      text:t.text(goal) };
  note(`Misión: ${P.quests.active.text}`, "--gold");
  save(); dirty = true;
}
function checkQuest(){
  const q = P.quests.active;
  if (!q || questProgress() < q.goal) return;
  const cash = Math.floor(isleOf(P.island).enemy.hp * 3 * (1 + P.level*0.05));
  const gems = 25 + P.level * 2;
  P.cash += cash; P.gems += gems; P.tickets += 1; P.quests.done++; P.quests.active = null;
  banner("MISIÓN COMPLETADA", "#ffd24a");
  note(`+${fmt(cash)} oro · +${fmt(gems)} gemas · +1 ticket`, "--cash");
  save(); dirty = true;
}

/* -------------------------------- efectos --------------------------------- */
function burst(x, y, n, color, h){
  for (let i=0;i<n;i++){
    const a = rnd(0, Math.PI*2), sp = rnd(50, 260);
    parts.push({ x, y, h:(h ?? 34) + rnd(0,22), vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*0.55,
                 vh:rnd(90, 320), life:rnd(.4,.95), color, size:rnd(1.8,4.6) });
  }
}
function spark(x, y, h, n, color){
  for (let i=0;i<n;i++){
    const a = rnd(0, Math.PI*2), sp = rnd(70, 240);
    parts.push({ x, y, h, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*0.5, vh:rnd(60,220),
                 life:rnd(.22,.45), color, size:rnd(2,4.4) });
  }
}
function ring(x, y, r, color, life, h){
  rings.push({ x, y, r, color, life, max:life, h:h ?? 4 });
}
// Muelle de cámara del contrato 15 (Stiffness 150, Damping 12)
function camImpulse(force){
  cam.shakeV += force * 26;
  cam.distV += force * 90;
}
let banners = [];
/* ---------------------------------------------------------------------------
   Sonido. Todo se sintetiza con WebAudio en el momento: no hay ficheros de
   audio que cargar, así que el juego sigue funcionando sin red y sin pesar
   más. El contexto se crea en el primer gesto del jugador, como exigen los
   navegadores.
   --------------------------------------------------------------------------- */
const SFX = {
  ctx:null, master:null, muted:false, last:{},
  init(){
    if (this.ctx || typeof AudioContext === "undefined") return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : .32;
    this.master.connect(this.ctx.destination);
  },
  setMuted(v){
    this.muted = !!v;
    if (this.master) this.master.gain.value = this.muted ? 0 : .32;
  },
  // limita repeticiones: veinte golpes a la vez no deben saturar
  throttle(id, ms){
    const t = performance.now();
    if (this.last[id] && t - this.last[id] < ms) return false;
    this.last[id] = t; return true;
  },
  tone(freq, dur, type, gain, slideTo){
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain ?? .3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, gain, freq, q){
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = freq || 900; f.Q.value = q || 1.2;
    const g = this.ctx.createGain(); g.gain.value = gain ?? .25;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  arp(notes, step, type, gain){
    if (!this.ctx || this.muted) return;
    notes.forEach((f, i) => setTimeout(() => this.tone(f, step * 1.6, type || "triangle", gain ?? .26), i * step * 1000));
  },
  hit(crit){
    if (!this.throttle("hit", 55)) return;
    this.noise(.09, crit ? .3 : .18, crit ? 1500 : 850, 1.6);
    this.tone(crit ? 330 : 210, .07, "square", crit ? .2 : .12, crit ? 150 : 110);
  },
  kill(){ if (this.throttle("kill", 90)) this.arp([440, 330, 220], .045, "sawtooth", .18); },
  hurt(){ if (this.throttle("hurt", 220)) { this.noise(.16, .3, 320, .9); this.tone(180, .16, "sawtooth", .16, 90); } },
  arise(){ this.arp([392, 523, 659, 880], .07, "triangle", .3); },
  ariseFail(){ this.tone(200, .22, "square", .16, 90); },
  levelUp(){ this.arp([523, 659, 784, 1047], .08, "triangle", .3); },
  rankUp(){ this.arp([392, 494, 587, 784, 988], .09, "triangle", .32); },
  portal(){ this.tone(120, .7, "sine", .22, 520); this.noise(.5, .1, 400, .7); },
  dash(){ if (this.throttle("dash", 120)) this.noise(.14, .16, 1800, .8); },
  skill(){ this.tone(660, .18, "sawtooth", .2, 240); this.noise(.2, .14, 600, 1); },
  death(){ this.arp([392, 294, 220, 147], .12, "sawtooth", .28); },
  ui(){ if (this.throttle("ui", 40)) this.tone(660, .05, "triangle", .12); },
  bossWarn(){ if (this.throttle("bw", 200)) this.tone(150, .3, "sawtooth", .2, 220); },
  bossHit(kind){ this.noise(kind === "wave" ? .4 : .22, .32, kind === "wave" ? 220 : 400, .8);
                 this.tone(90, .3, "square", .24, 45); },
  bossPhase(n){ this.arp(n >= 4 ? [220, 185, 147, 110] : [147, 185, 220], .1, "sawtooth", .3); },
  /* Música. No hay ficheros: una progresión de acordes se va tocando nota a
     nota desde el bucle del juego, con la escala y el tempo de cada región.
     Al vivir en el bucle no deja temporizadores sueltos al desmontar. */
  music:{ t:0, paso:0, escala:null, tempo:2.2 },
  padre(freq, dur, gain){
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o2.type = "triangle";
    o.frequency.value = freq; o2.frequency.value = freq * 1.005;   // leve desafinado: suena más cálido
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g); g.connect(this.master);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  },
  stepMusic(dt, claveRegion, enCombate){
    if (!this.ctx || this.muted) return;
    const m = this.music;
    const esc = MUSIC_SCALES[claveRegion] || MUSIC_SCALES.city;
    if (m.escala !== esc){ m.escala = esc; m.paso = 0; m.t = 0; }
    const tempo = enCombate ? esc.tempo * 0.6 : esc.tempo;
    m.t -= dt;
    if (m.t > 0) return;
    m.t = tempo;
    const acorde = esc.acordes[m.paso % esc.acordes.length];
    acorde.forEach((f, i) => this.padre(f, tempo * 1.7, (i ? .045 : .07) * (enCombate ? 1.25 : 1)));
    // una nota suelta de melodía cada dos compases
    if (m.paso % 2 === 1){
      const nota = esc.melodia[Math.floor(Math.random() * esc.melodia.length)];
      setTimeout(() => this.tone(nota, tempo * 0.5, "triangle", .05), tempo * 400);
    }
    m.paso++;
  },

};
function banner(text, color){
  const el = document.getElementById("banner");
  el.innerHTML = `<div class="banner stroke" style="color:${color}">${text}</div>`;
  clearTimeout(banner._t);
  banner._t = setTimeout(() => { el.innerHTML = ""; }, 1900);
}
function note(text, colorVar){
  const lane = document.getElementById("lane");
  const el = document.createElement("div");
  el.className = "note"; el.textContent = text;
  if (colorVar) el.style.color = colorVar.startsWith("--") ? `var(${colorVar})` : colorVar;
  lane.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 2600);
  setTimeout(() => el.remove(), 3100);
  while (lane.children.length > 2) lane.firstChild.remove();
}

/* ===========================================================================
   ENTRADA Y BUCLE
   =========================================================================== */
const canvas = document.getElementById("stage");
let W = 0, H = 0;
addEventListener("resize", resize);

const keys = new Set();
let pointer = null;
const modalOpen = () => !!panelKind || !!ariseToken;
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  if (k === "escape"){ closePanel(); closeArise(); return; }
  if (e.repeat) return;
  if (modalOpen() && k !== "b") return;
  keys.add(k);
  if (k === " ") requestJump();
  if (k === "v") requestSkill();
  if (k === "b") openArise();
  if (k === "q") requestDash();
  if (k === "r") setAuto(!auto);
  if (k === "m") toggleMount();
  if (k === "g" && hunterNear) hunterService(hunterNear);
  if (k === "f" && portal) enterDungeon();
  if (k === "1") openPanel("stats");
  if (k === "2") openPanel("shadows");
  if (k === "3") openPanel("shop");
  if (k === "4") openPanel("items");
  if (k === "5") openPanel("map");
  if (k === "h") openPanel("help");
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());
// Puntero: la mitad izquierda es un joystick virtual, la derecha orbita la cámara.
const stick = { active:false, x:0, y:0, ox:0, oy:0, id:null };
const drag = { active:false, x:0, y:0, moved:0, id:null };
canvas.addEventListener("pointerdown", e => {
  canvas.setPointerCapture(e.pointerId);
  const touch = e.pointerType !== "mouse";
  // W es el buffer de render; para dividir la pantalla hay que usar px CSS.
  const cssW = canvas.clientWidth || innerWidth;
  if (touch && e.clientX < cssW * 0.45){
    stick.active = true; stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = 0; stick.y = 0;
    return;
  }
  drag.active = true; drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0;
  if (e.button === 0 && !modalOpen()){ drag.attacking = true; requestAttack(); }
});
canvas.addEventListener("pointermove", e => {
  if (stick.active && e.pointerId === stick.id){
    const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const m = Math.hypot(dx, dy) || 1, k = Math.min(1, m / 70);
    stick.x = dx / m * k; stick.y = dy / m * k;
    return;
  }
  if (!drag.active || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  CAM.yaw += dx * 0.006;
  CAM.pitch = clamp(CAM.pitch + dy * 0.003, 0.12, 0.72);
});
const endPointer = e => {
  if (stick.active && e.pointerId === stick.id){ stick.active = false; stick.x = 0; stick.y = 0; }
  if (drag.active && e.pointerId === drag.id){ drag.active = false; drag.attacking = false; }
};
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  CAM.back = clamp(CAM.back + Math.sign(e.deltaY) * 28, CAM.minBack, CAM.maxBack);
}, { passive:false });

function cameraKeys(dt){
  if (keys.has("arrowleft")) CAM.yaw -= 1.8 * dt;
  if (keys.has("arrowright")) CAM.yaw += 1.8 * dt;
  if (keys.has("arrowup")) CAM.back = clamp(CAM.back - 220 * dt, CAM.minBack, CAM.maxBack);
  if (keys.has("arrowdown")) CAM.back = clamp(CAM.back + 220 * dt, CAM.minBack, CAM.maxBack);
}
function inputVector(){
  let f = 0, r = 0;
  if (keys.has("w")) f += 1;
  if (keys.has("s")) f -= 1;
  if (keys.has("d")) r += 1;
  if (keys.has("a")) r -= 1;
  if (!f && !r && stick.active){ f = -stick.y; r = stick.x; }
  if (!f && !r) return { x:0, y:0, amt:0 };
  let x = camFwd.x * f + camRight.x * r;
  let y = camFwd.z * f + camRight.z * r;
  const len = Math.hypot(x, y) || 1;
  return { x:x/len, y:y/len, amt: Math.min(1, Math.hypot(f, r)) };
}
function toggleMount(){
  player.mounted = !player.mounted;
  const b = document.getElementById("a-mount");
  b.classList.toggle("on", player.mounted);
  b.querySelector(".st").textContent = player.mounted ? "ON" : "OFF";
  note(player.mounted ? "Montura invocada" : "Montura guardada", "--monarch");
}

/* -------------------------------- update ---------------------------------- */
function update(dt){
  const t = now();
  cameraKeys(dt);
  updateCameraBasis();
  // hitstop: congela la simulación, no la cámara
  if (hitstop > 0){ hitstop -= dt; dt *= 0.06; }

  // ---- jugador
  const speed = FORMULA.walkSpeed(P.stats.AGI) * 11 * (player.mounted ? 2.1 : 1);
  const v = inputVector();
  if (player.dead > 0){
    player.dead -= dt;
    const el = document.getElementById("deathOverlay");
    if (el){
      el.hidden = false;
      el.innerHTML = `<div class="dead-card"><h2>HAS CAÍDO</h2>
        <p>Tus sombras cubren la retirada</p>
        <div class="count">${Math.ceil(player.dead)}</div></div>`;
    }
    if (player.dead <= 0){
      player.hp = maxHP();
      player.invuln = now() + 2.5;
      if (el) el.hidden = true;
      note("De vuelta en pie · 2 s de gracia", "--xp");
      // un paso atrás para no revivir dentro de la horda: te apartas del
      // enemigo más cercano (dentro de una mazmorra el centro no sirve)
      const near = nearestEnemy(player.x, player.y, 1e9);
      const a = near ? Math.atan2(player.y - near.y, player.x - near.x)
                     : Math.atan2(player.y - CFG.WORLD.cy, player.x - CFG.WORLD.cx);
      player.x += Math.cos(a) * 220; player.y += Math.sin(a) * 220;
      enemies = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) > 260 || e.boss);
    }
  } else if (player.dashT > 0){
    player.dashT -= dt;
    const d = CFG.DASH_DIST / CFG.DASH_TIME;
    player.x += player.dashX * d * dt;
    player.y += player.dashY * d * dt;
    if (Math.random() < 0.6) parts.push({ x:player.x, y:player.y, h:30, vx:0, vy:0, vh:6,
                                          life:.3, color:"#8fc8ff", size:5, ghost:true });
  } else {
    const mv = player.phase === "idle" ? 1 : 0.35;
    let mx = v.x, my = v.y;
    player.moveAmt = v.amt;
    // AUTO: si no hay entrada, el cazador se acerca solo a su objetivo
    if (!mx && !my && auto && !modalOpen()){
      const t2 = nearestEnemy(player.x, player.y, 900);
      if (t2){
        const d = Math.hypot(t2.x-player.x, t2.y-player.y);
        if (d > CFG.ATTACK_RANGE * 0.7){ mx = (t2.x-player.x)/d; my = (t2.y-player.y)/d; }
      }
    }
    player.x += mx * speed * mv * dt;
    player.y += my * speed * mv * dt;
    // Muro blando: más allá del último anillo solo hay vacío, así que el
    // mundo te frena ahí en vez de dejarte caminar indefinidamente.
    if (!dungeon){
      const bx = player.x - CFG.WORLD.cx, by = player.y - CFG.WORLD.cy;
      const d = Math.hypot(bx, by), lim = ISLANDS.length * CFG.RING_WIDTH - CFG.RING_SAFE;
      if (d > lim){
        player.x = CFG.WORLD.cx + bx / d * lim;
        player.y = CFG.WORLD.cy + by / d * lim;
        if (!update._edge || t - update._edge > 6){ update._edge = t; note("El mundo termina aquí", "--dim"); }
      }
    }
    if (mx || my){
      // el personaje gira hacia donde avanza (camino más corto)
      const want = Math.atan2(mx, my);
      let d = want - player.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      player.yaw += d * Math.min(1, dt * 12);
      player.step += Math.hypot(mx, my) * dt * 10;
    } else player.moveAmt = 0;
  }
  // salto y gravedad
  if (player.h > 0 || player.vh !== 0){
    player.vh -= CFG.GRAVITY * dt;
    player.h += player.vh * dt;
    if (player.h <= 0){ player.h = 0; player.vh = 0; player.jumps = 0; }
  }
  // fases del golpe
  if (player.phase !== "idle"){
    player.phaseT -= dt;
    if (player.phaseT <= 0){
      if (player.phase === "startup"){
        player.phase = "active"; player.phaseT = player.atkDef.active;
        resolveHit(); player.hitDone = true;
      } else if (player.phase === "active"){
        player.phase = "recovery"; player.phaseT = player.atkDef.recovery;
      } else { player.phase = "idle"; player.atkDef = null; }
    }
  }
  player.dashCd = Math.max(0, player.dashCd - dt);
  player.skillCd = Math.max(0, player.skillCd - dt);
  player.hurt = Math.max(0, player.hurt - dt);
  player.mana = Math.min(maxMana(), player.mana + maxMana() * 0.08 * dt);
  // la música sigue al bioma y acelera cuando hay enemigos cerca
  SFX.stepMusic(dt, dungeon ? "dungeon" : regionAt(player.x, player.y).theme,
                enemies.some(e => Math.hypot(e.x - player.x, e.y - player.y) < 700));
  // Regeneración fuera de combate: sin esto la vida solo se recuperaba
  // muriendo o pagando a un cazador, y acababas arrastrándote a 1 de vida.
  if (player.dead <= 0 && t - (player.lastHit || 0) > 5){
    const mh = maxHP();
    if (player.hp < mh) player.hp = Math.min(mh, player.hp + mh * 0.06 * dt);
  }
  // golpe: automático con AUTO, o encadenado mientras mantengas el clic
  if (player.phase === "idle" && player.dead <= 0 && !modalOpen()){
    if (auto || drag.attacking) requestAttack();
  }

  // ---- región actual del mundo abierto
  if (!dungeon){
    const reg = regionAt(player.x, player.y);
    if (reg.id !== P.island){
      P.island = reg.id;
      if (!P.islands.includes(reg.id)) P.islands.push(reg.id);
      banner(reg.name.toUpperCase(), P.level >= reg.level ? "#8fd0ff" : "#ff8d97");
      note(P.level >= reg.level ? `Has entrado en ${reg.name}`
        : `${reg.name} · zona de nivel ${reg.level}: aquí golpean muy fuerte`,
        P.level >= reg.level ? "--spec" : "--hp");
      enemies = []; corpses = []; spawnT = 0;
      dirty = true;
    }
    // borde del mundo: se vuelve suavemente hacia dentro
    const dc = Math.hypot(player.x - CFG.WORLD.cx, player.y - CFG.WORLD.cy);
    const maxR = ISLANDS.length * CFG.RING_WIDTH + 600;
    if (dc > maxR){
      const k = maxR / dc;
      player.x = CFG.WORLD.cx + (player.x - CFG.WORLD.cx) * k;
      player.y = CFG.WORLD.cy + (player.y - CFG.WORLD.cy) * k;
    }
  }

  // ---- enemigos
  spawnT -= dt;
  const pop = dungeon ? (dungeon.phase === "Boss" ? 1 : 6)
    : (P.tutorial < 2 ? 3 : P.tutorial < TUTORIAL.length ? 6 : CFG.ENEMY_POP);
  if (spawnT <= 0 && enemies.length < pop && !(dungeon && dungeon.phase === "Boss")){
    // repone la horda con rapidez: el farmeo del original es continuo
    const batch = Math.min(2, pop - enemies.length);
    for (let i=0;i<batch;i++) spawnEnemy();
    spawnT = dungeon ? 1.4 : 1.1;
  }
  for (const e of enemies){
    e.hurt = Math.max(0, e.hurt - dt);
    e.stun = Math.max(0, e.stun - dt);
    if (e.stun > 0) continue;
    const d = Math.hypot(player.x-e.x, player.y-e.y) || 1;
    const stop = e.def.r + (e.boss ? 150 : 128);
    // Fases del jefe. Antes solo las tenían los jefes de mazmorra; ahora
    // cualquier jefe cambia de comportamiento según le baja la vida.
    if (e.boss){
      const pct = e.hp / e.maxHp;
      const th = dungeon?.bossState?.thresholds || [0.70, 0.40, 0.15];
      const newPhase = pct <= th[2] ? 4 : pct <= th[1] ? 3 : pct <= th[0] ? 2 : 1;
      if (newPhase > e.phase){
        e.phase = newPhase;
        banner(newPhase === 4 ? "ENRAGE" : `FASE ${newPhase}`, newPhase === 4 ? "#ff4d61" : "#ffd24a");
        note(newPhase === 4 ? `${e.name} se desata` : `${e.name} cambia de fase`, "--hp");
        camImpulse(0.6); ring(e.x, e.y, 260, "#ff4d61", .9);
        SFX.bossPhase(newPhase);
        e.telegraph = null; e.atkCd = 0.9;
        // al enfurecerse llama a dos secuaces, una sola vez
        if (newPhase === 4 && !e.summoned){
          e.summoned = true;
          for (const side of [-1, 1]){
            const m = spawnEnemy({ ...enemyDef("brute"), name:`Guardia de ${e.name}` },
                                 e.x + side * 190, e.y + 120);
            if (m) m.isle = e.isle;
          }
          note("Invoca a sus guardias", "--hp");
        }
      }
    }
    e.yaw = Math.atan2(player.x - e.x, player.y - e.y);
    if (d > stop){
      const sp = (98 + Math.min(60, e.level * 0.05)) * (e.boss ? 0.8 + e.phase*0.12 : 1);
      e.x += (player.x-e.x)/d * sp * dt; e.y += (player.y-e.y)/d * sp * dt;
      e.step += dt * 6;
    }
    // telegrafía + golpe
    if (e.telegraph){
      e.telegraph.t += dt;
      if (e.telegraph.t >= e.telegraph.dur){
        const tg = e.telegraph;
        const dist = Math.hypot(player.x - tg.x, player.y - tg.y);
        // la onda expansiva solo daña en su anillo exterior: se esquiva
        // quedándote pegado al jefe o saliendo del todo
        const dentro = tg.kind === "wave"
          ? dist > tg.r * 0.45 && dist < tg.r
          : dist < tg.r;
        if (dentro && player.h < 60) hitPlayer(e.def.dmg * (tg.mult || 2.2));
        ring(tg.x, tg.y, tg.r, "#ff4d61", .5);
        burst(tg.x, tg.y, tg.kind === "wave" ? 40 : 26, "#ff8a5c", 20);
        camImpulse(tg.kind === "wave" ? 0.8 : 0.5);
        SFX.bossHit(tg.kind);
        e.telegraph = null;
        // los combos encadenan: el segundo y el tercer golpe caen donde estés
        if (tg.chain > 0){
          e.telegraph = { x:player.x, y:player.y, r:tg.r, t:0, dur:0.45,
                          kind:tg.kind, mult:tg.mult, chain:tg.chain - 1 };
          SFX.bossWarn();
        }
      }
    } else if ((e.atkCd -= dt) <= 0){
      if (e.boss){
        e.atkCd = Math.max(1.0, 2.6 - e.phase * 0.35);
        startBossAttack(e);
      } else {
        e.atkCd = 1.35;
        if (d <= stop + 26 && player.h < 50) hitPlayer(e.def.dmg);
      }
    }
  }
  separate(dt);
  for (const s of shadows) stepShadow(s, dt);

  // ---- cadáveres (expiran por contrato)
  for (const c of corpses.slice()){
    c.phase += dt;
    if (c.ExpiresAt < t) consumeCorpse(c, false);
  }
  if (auto && !ariseToken){
    const c = nearestCorpse();
    if (c){
      const r = attemptArise(c);
      if (r.ok) note(`ARISE · ${r.shadow.name}`, "--arise");
      else if (r.code === "EXHAUSTED") note(`Fallo · +${fmt(r.gems)} gemas`, "--gem");
    }
  }

  // ---- portal / mazmorra
  if (dungeon){
    dungeon.timer -= dt;
    if (dungeon.timer <= 0 && !dungeon.cleared){ note("Tiempo agotado", "--hp"); exitDungeon(); }
  } else {
    if (!portal){
      portalT -= dt;
      if (portalT <= 0) spawnPortal();
    } else {
      portal.t += dt;
      if (portal.t > 60){ portal = null; portalT = FLAGS.PORTAL_INTERVAL_SECONDS; note("El portal se cerró", "--dim"); }
    }
  }
  const nearPortal = portal && Math.hypot(portal.x-player.x, portal.y-player.y) < 120;
  document.getElementById("a-portal").hidden = !nearPortal;

  // ---- efectos
  for (const f of floaters) f.life -= dt;
  floaters = floaters.filter(f => f.life > 0);
  if (floaters.length > 7) floaters.splice(0, floaters.length - 7);
  for (const p of parts){
    p.life -= dt;
    if (!p.ghost){
      p.x += p.vx*dt; p.y += p.vy*dt; p.h += p.vh*dt;
      p.vx *= 0.94; p.vy *= 0.94; p.vh -= 620*dt;
      if (p.h < 2){ p.h = 2; p.vh *= -0.35; }
    }
  }
  parts = parts.filter(p => p.life > 0);
  if (parts.length > 260) parts.splice(0, parts.length - 260);
  for (const r of rings) r.life -= dt;
  rings = rings.filter(r => r.life > 0);

  // ---- cámara (muelle: fuerza = (objetivo-pos)*k - vel*d)
  const stiff = 150, damp = 12;
  cam.shakeV += (0 - cam.shake) * stiff * dt - cam.shakeV * damp * dt;
  cam.shake += cam.shakeV * dt;
  cam.distV += (0 - cam.dist) * stiff * dt - cam.distV * damp * dt;
  cam.dist += cam.distV * dt;
  cam.x += (player.x - cam.x) * Math.min(1, dt * 7);
  cam.y += (player.y - cam.y) * Math.min(1, dt * 7);

  // ---- DPS
  player.dps.since += dt;
  if (player.dps.since >= 1){ player.dps.shown = player.dps.total / player.dps.since; player.dps.total = 0; player.dps.since = 0; }

  tutState.moved += Math.hypot(player.x - (tutState.lastX || player.x), player.y - (tutState.lastY || player.y));
  tutState.lastX = player.x; tutState.lastY = player.y;
  updateObjective(dt);
  drawMinimap(dt);
  checkQuest();
  checkCampaign();

  npc.step += dt;
  npc.yaw = Math.atan2(player.x - npc.x, player.y - npc.y);
  hunterNear = null;
  for (const h of HUNTERS){
    h.cooldown = Math.max(0, h.cooldown - dt);
    h.step += dt;
    const d = Math.hypot(h.x - player.x, h.y - player.y);
    if (d < 170){
      h.yaw = Math.atan2(player.x - h.x, player.y - h.y);
      if (!hunterNear || d < Math.hypot(hunterNear.x - player.x, hunterNear.y - player.y)) hunterNear = h;
    }
  }
  const hint = document.getElementById("hunterHint");
  if (hint){
    hint.hidden = !hunterNear;
    if (hunterNear) hint.innerHTML = `<b>${hunterNear.name}</b> · ${hunterNear.line} <kbd>G</kbd>`;
  }

  saveT -= dt;
  if (saveT <= 0){ save(); saveT = 6; }
}
let saveT = 6;
function hitPlayer(raw){
  if (player.dead > 0 || (player.invuln || 0) > now()) return;
  const dmg = Math.max(1, raw * CFG.CONTACT_SCALE * (1 - classBonus("armor")));
  player.hp -= dmg; player.hurt = 0.22; player.lastHit = now(); SFX.hurt();
  const ph = floaters.find(f => f.src === player);
  if (ph){ ph.amount += dmg; ph.text = `-${fmt(ph.amount)}`; ph.life = .9; }
  else floaters.push({ src:player, amount:dmg, x:player.x, y:player.y, h:100,
                       text:`-${fmt(dmg)}`, color:"#ff8d97", life:.9 });
  camImpulse(0.25);
  if (player.hp <= 0){
    player.hp = 0; player.dead = 2.4; SFX.death();
    note("Has caído · tus sombras te cubren", "--hp");
    burst(player.x, player.y, 34, "#ff4d61", 30);
  }
  dirty = true;
}
/* Ataques de jefe. Cada fase abre un movimiento nuevo, así que la pelea
   cambia de ritmo en vez de ser el mismo golpe repetido:
     fase 1  golpe al suelo donde estás
     fase 2  combo de tres golpes encadenados
     fase 3  onda expansiva que solo daña en su anillo exterior
     fase 4  todo lo anterior, más rápido, tras llamar a sus guardias        */
function startBossAttack(e){
  const ph = e.phase || 1;
  const roll = Math.random();
  let tg;
  if (ph >= 3 && roll < 0.34){
    tg = { x:e.x, y:e.y, r:430, t:0, dur:Math.max(0.85, 1.6 - ph*0.15),
           kind:"wave", mult:2.6, chain:0 };
  } else if (ph >= 2 && roll < 0.62){
    tg = { x:player.x, y:player.y, r:135, t:0, dur:Math.max(0.5, 1.1 - ph*0.12),
           kind:"combo", mult:1.5, chain:2 };
  } else {
    tg = { x:player.x, y:player.y, r:150, t:0, dur:Math.max(0.6, 1.4 - ph*0.18),
           kind:"slam", mult:2.2, chain:0 };
  }
  e.telegraph = tg;
  SFX.bossWarn();
}
function separate(dt){
  for (let i = 0; i < enemies.length; i++){
    const a = enemies[i];
    for (let j = i+1; j < enemies.length; j++){
      const b = enemies[j];
      const dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx, dy) || .001;
      const min = (a.def.r + b.def.r) * 2.4 + 84;
      if (d < min){
        const push = (min-d) * 0.5 * Math.min(1, dt*12);
        a.x -= dx/d*push; a.y -= dy/d*push; b.x += dx/d*push; b.y += dy/d*push;
      }
    }
    const dx = a.x-player.x, dy = a.y-player.y, d = Math.hypot(dx, dy) || .001;
    const min = a.def.r + (a.boss ? 130 : 118);
    if (d < min){ const push = (min-d) * Math.min(1, dt*14); a.x += dx/d*push; a.y += dy/d*push; }
  }
}

/* ===========================================================================
   RENDER 3D — WebGL con Three.js
   Escena con luz direccional y sombras reales, niebla, suelo con textura
   procedural, props por isla y personajes articulados (jerarquía de nodos:
   caderas, torso, hombros y cuello) animados por rotación.
   =========================================================================== */
const THREE_OK = true;   // three llega por import

/*  Calidad adaptativa: el render mide su propio ritmo y baja o sube el nivel de
    detalle para mantener la fluidez. 3 = alta, 2 = media, 1 = baja.  */
const QUALITY = {
  level: 2, auto: true,
  shadows: true, grass: true, props: 1, motes: true, charDetail: 900, maxChars: 26, pixel: 1.5,
};
function applyQuality(){
  const q = QUALITY.level;
  QUALITY.shadows = q >= 3;
  QUALITY.grass = q >= 2;
  QUALITY.props = q >= 3 ? 1 : q === 2 ? 0.6 : 0.35;
  QUALITY.motes = q >= 3;
  QUALITY.charDetail = q >= 3 ? 900 : q === 2 ? 560 : 340;
  QUALITY.maxChars = q >= 3 ? 26 : q === 2 ? 18 : 12;
  QUALITY.pixel = q >= 3 ? 1.5 : q === 2 ? 1.2 : 1;
  if (renderer){
    renderer.shadowMap.enabled = QUALITY.shadows;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY.pixel));
    resize();
  }
  if (sunLight) sunLight.castShadow = QUALITY.shadows;
  if (scene?.userData.motes) scene.userData.motes.visible = QUALITY.motes;
  if (scene?.userData.blades) scene.userData.blades.visible = QUALITY.grass;
  clearProps();
  const el = document.getElementById("qualityTag");
  if (el) el.textContent = `Calidad ${["", "baja", "media", "alta"][QUALITY.level]}${QUALITY.auto ? " (auto)" : ""}`;
}
let fpsWindow = [], qualityCooldown = 0;
function trackPerformance(dt){
  fpsWindow.push(dt);
  if (fpsWindow.length > 70) fpsWindow.shift();
  qualityCooldown -= dt;
  if (!QUALITY.auto || fpsWindow.length < 60 || qualityCooldown > 0) return;
  const avg = fpsWindow.reduce((a, b) => a + b, 0) / fpsWindow.length;
  const fps = 1 / Math.max(avg, 0.0001);
  if (fps < 42 && QUALITY.level > 1){ QUALITY.level--; applyQuality(); qualityCooldown = 6; fpsWindow = []; }
  else if (fps > 58 && QUALITY.level < 3){ QUALITY.level++; applyQuality(); qualityCooldown = 12; fpsWindow = []; }
}
// Tipo de arma según el equipo, para modelarla con varias piezas.
function weaponKind(id){
  const n = (WEAPONS[id]?.name || "").toLowerCase();
  if (n.includes("axe")) return "axe";
  if (n.includes("scythe")) return "scythe";
  if (n.includes("staff") || n.includes("rod")) return "staff";
  if (n.includes("naginata") || n.includes("trident") || n.includes("maul")) return "polearm";
  return "sword";
}
let scene, camera, renderer, sunLight, hemiLight, groundMesh, skyMesh;
const views = { enemies:new Map(), shadows:new Map(), corpses:new Map() };
let playerView = null, npcView = null, portalView = null;
const propPool = [];
let sparkPoints = null, sparkGeo = null;

const glowCache = new Map();
// Recursos de GPU compartidos por muchas vistas: nunca se liberan al
// retirar una entidad de la escena.
const SHARED = new WeakSet();
function glowTexture(color){
  let t = glowCache.get(color);
  if (t) return t;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const x = cv.getContext("2d");
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(.35, color.replace(")", ",.55)").replace("rgb", "rgba"));
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, Math.PI*2); x.fill();
  t = new THREE.CanvasTexture(cv);
  SHARED.add(t);
  glowCache.set(color, t);
  return t;
}

const GEO = new Map();
function boxGeo(w, h, d){
  // Se redondea a medias unidades: dos piezas casi iguales comparten geometría
  // y el catálogo no crece sin fin al variar la escala de cada criatura.
  const q = v => Math.max(0.25, Math.round(v * 2) / 2);
  w = q(w); h = q(h); d = q(d);
  const k = `${w}|${h}|${d}`;
  let g = GEO.get(k);
  if (!g){ g = new THREE.BoxGeometry(w, h, d); SHARED.add(g); GEO.set(k, g); }
  return g;
}
const MAT = new Map();
function mat(color, opts){
  const o = opts || {};
  // MeshToonMaterial no admite flatShading (ya sombrea por bandas planas),
  // asi que no se le pasa: three avisaba por consola en cada material.
  const k = `${color}|${o.emissive||0}|${o.opacity ?? 1}`;
  let m = MAT.get(k);
  if (!m){
    m = new THREE.MeshToonMaterial({
      color: new THREE.Color(color),
      emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: o.emissiveIntensity ?? 1,
      transparent: (o.opacity ?? 1) < 1,
      opacity: o.opacity ?? 1,
    });
    SHARED.add(m);
    MAT.set(k, m);
  }
  return m;
}
function part(w, h, d, color, opts){
  const m = new THREE.Mesh(boxGeo(w, h, d), mat(color, opts));
  m.castShadow = true; m.receiveShadow = false;
  return m;
}
// Textura de cara dibujada en canvas (ojos con brillo y sonrisa).
const faceTexCache = new Map();
function faceTexture(eye, glow){
  const k = `${eye}|${glow ? 1 : 0}`;
  let t = faceTexCache.get(k);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = eye;
  if (glow){ x.shadowColor = eye; x.shadowBlur = 18; }
  x.fillRect(34, 46, 16, 22);
  x.fillRect(78, 46, 16, 22);
  x.shadowBlur = 0;
  if (!glow){
    x.fillStyle = "rgba(255,255,255,.9)";
    x.fillRect(37, 49, 6, 7); x.fillRect(81, 49, 6, 7);
  }
  x.strokeStyle = eye; x.lineWidth = 6; x.lineCap = "round";
  x.beginPath(); x.arc(64, 74, 22, .22 * Math.PI, .78 * Math.PI); x.stroke();
  t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  SHARED.add(t);
  faceTexCache.set(k, t);
  return t;
}

/*  Personaje articulado.
    root
     ├ hips  ── legL/legR (pivote en la cadera)
     ├ torso ── peto, cinturón, capa, hombreras
     │           └ shoulderL/R ── brazo + mano (pivote en el hombro)
     └ neck  ── cabeza, pelo, cara, cuernos/corona            */
/* ---------------------------------------------------------------------------
   Siluetas de criatura. Los mobs ya no son humanos recoloreados: cada familia
   (limo, golem, bestia, insecto, espectro) tiene su propio cuerpo. Todas
   exponen legs/arms/torso/neck para que la animación común siga valiendo.
   --------------------------------------------------------------------------- */
function limbStubs(g, detail){
  g.legs = []; g.arms = [];
  for (let i = 0; i < 2; i++){
    const l = new THREE.Group(); detail.add(l); g.legs.push(l);
    const a = new THREE.Group(); detail.add(a); g.arms.push(a);
  }
}
function buildCreature(cfg){
  const g = new THREE.Group();
  const s = Math.round((cfg.scale ?? 1) * 20) / 20;
  const opts = cfg.opts || {};
  const P0 = (w, h, d, c, o) => part(w*s, h*s, d*s, c, o || opts);
  const glowOpts = c => ({ ...opts, emissive:c, emissiveIntensity:1.1 });
  const detail = new THREE.Group(); g.add(detail); g.detail = detail;
  const simple = new THREE.Group(); simple.visible = false; g.add(simple); g.simple = simple;
  const body = cfg.body;
  const main = cfg.skin, dark = cfg.pants || "#1b2340", glow = cfg.eyes || "#ffd24a";

  // silueta lejana: tres cajas con el volumen aproximado
  const b1 = part(34*s, 20*s, 30*s, main); b1.position.y = 14*s;
  const b2 = part(26*s, 16*s, 24*s, main); b2.position.y = 34*s;
  const b3 = part(16*s, 14*s, 16*s, dark); b3.position.y = 50*s;
  simple.add(b1, b2, b3);

  limbStubs(g, detail);
  const torso = new THREE.Group(); torso.position.y = 41*s; detail.add(torso); g.torso = torso;
  const neck  = new THREE.Group(); neck.position.y  = 56*s; detail.add(neck);  g.neck  = neck;

  if (body === "slime"){
    // limo: cúpula gelatinosa, núcleo brillante dentro y goterones
    const tiers = [[46, 18, 46, 0], [40, 14, 40, 17], [30, 11, 30, 29], [18, 8, 18, 38]];
    for (const [w, h, d, y] of tiers){
      const m = P0(w, h, d, main, { ...opts, opacity:(opts.opacity ?? 1) * 0.82 });
      m.position.y = (y - 41) * s; torso.add(m);
    }
    const core = P0(13, 13, 13, glow, glowOpts(glow));
    core.position.y = (20 - 41) * s; torso.add(core);
    for (const side of [-1, 1]){
      const eye = P0(6, 7, 3, "#10182e"); eye.position.set(side*7*s, (30-41)*s, 20*s); torso.add(eye);
      const drip = P0(5, 9, 5, main, { ...opts, opacity:.75 });
      drip.position.set(side*17*s, (6-41)*s, side*9*s); torso.add(drip);
    }
    g.wobble = torso;
  } else if (body === "golem"){
    // golem: bloques de roca, grietas encendidas y brazos enormes
    const hips = P0(34, 16, 26, dark); hips.position.y = (14-41)*s; torso.add(hips);
    const chest = P0(46, 30, 30, main); chest.position.y = (40-41)*s; torso.add(chest);
    for (const y of [32, 44]){
      const crack = P0(40, 2.4, 31, glow, glowOpts(glow));
      crack.position.y = (y-41)*s; torso.add(crack);
    }
    for (const side of [-1, 1]){
      const leg = P0(14, 20, 16, dark);
      leg.position.set(side*11*s, (-31)*s, 0); g.legs[side>0?1:0].add(leg);
      g.legs[side>0?1:0].position.set(0, 27*s, 0);
      const arm = new THREE.Group(); arm.position.set(side*28*s, 52*s, 0); detail.add(arm);
      const up = P0(15, 24, 16, main); up.position.y = -12*s; arm.add(up);
      const fist = P0(19, 17, 19, dark); fist.position.y = -30*s; arm.add(fist);
      g.arms[side>0?1:0].parent.remove(g.arms[side>0?1:0]);
      g.arms[side>0?1:0] = arm;
    }
    const head = P0(20, 16, 19, main); head.position.y = 6*s; neck.add(head);
    for (const side of [-1, 1]){
      const eye = P0(5, 4, 2.5, glow, glowOpts(glow));
      eye.position.set(side*5*s, 7*s, 10*s); neck.add(eye);
    }
    const crest = P0(6, 11, 6, dark); crest.position.y = 17*s; crest.rotation.z = .3; neck.add(crest);
  } else if (body === "beast"){
    // bestia: cuadrúpedo bajo, hocico, melena y cola
    const trunk = P0(24, 20, 48, main); trunk.position.y = (30-41)*s; torso.add(trunk);
    const mane  = P0(28, 24, 12, cfg.hair || dark); mane.position.set(0, (34-41)*s, 17*s); torso.add(mane);
    for (const [sx, sz, idx] of [[-1,1,0],[1,1,1],[-1,-1,0],[1,-1,1]]){
      const leg = P0(8, 22, 9, dark);
      leg.position.set(sx*9*s, (8-41)*s, sz*16*s); torso.add(leg);
    }
    for (let i = 0; i < 2; i++){ g.legs[i].position.set(0, 30*s, 0); }
    const tail = P0(6, 6, 22, main); tail.position.set(0, (34-41)*s, -30*s); torso.add(tail); g.tail = tail;
    const head = P0(18, 16, 18, main); head.position.set(0, -6*s, 24*s); neck.add(head);
    const snout = P0(11, 9, 12, cfg.hair || dark); snout.position.set(0, -9*s, 36*s); neck.add(snout);
    for (const side of [-1, 1]){
      const ear = P0(5, 8, 3, main); ear.position.set(side*6*s, 4*s, 22*s); neck.add(ear);
      const eye = P0(4.5, 4, 2.5, glow, glowOpts(glow)); eye.position.set(side*5*s, -3*s, 33*s); neck.add(eye);
    }
  } else if (body === "insect"){
    // insecto: tórax, abdomen segmentado, mandíbulas y seis patas
    const thorax = P0(24, 18, 26, main); thorax.position.y = (32-41)*s; torso.add(thorax);
    let z = -18;
    for (const w of [22, 18, 13]){
      const seg = P0(w, w*0.85, w, main); seg.position.set(0, (30-41)*s, z*s); torso.add(seg);
      z -= w * 0.8;
    }
    const plate = P0(20, 4, 20, glow, glowOpts(glow)); plate.position.set(0, (41-41)*s, -20*s); torso.add(plate);
    for (const sz of [-10, 3, 15]){
      for (const side of [-1, 1]){
        const femur = P0(3.5, 3.5, 13, dark);
        femur.position.set(side*13*s, (26-41)*s, sz*s);
        femur.rotation.set(0, side*1.1, side*0.55); torso.add(femur);
        const tibia = P0(3, 14, 3, dark);
        tibia.position.set(side*20*s, (16-41)*s, sz*s);
        tibia.rotation.z = side*0.25; torso.add(tibia);
      }
    }
    for (let i = 0; i < 2; i++) g.legs[i].position.set(0, 30*s, 0);
    const head = P0(16, 14, 16, main); head.position.set(0, -4*s, 22*s); neck.add(head);
    for (const side of [-1, 1]){
      const jaw = P0(3.5, 3.5, 14, dark); jaw.position.set(side*6*s, -9*s, 33*s); jaw.rotation.y = side*0.22; neck.add(jaw);
      const eye = P0(5, 5, 3, glow, glowOpts(glow)); eye.position.set(side*5*s, 0, 30*s); neck.add(eye);
      const ant = P0(2, 12, 2, dark); ant.position.set(side*4*s, 8*s, 26*s); ant.rotation.x = -0.5; neck.add(ant);
    }
  } else {
    // espectro: flota, sin piernas, capucha y jirones
    const hood = P0(22, 18, 20, dark); hood.position.y = 4*s; neck.add(hood);
    const face = P0(15, 11, 3, "#05070f"); face.position.set(0, 1*s, 10*s); neck.add(face);
    for (const side of [-1, 1]){
      const eye = P0(4, 4, 2, glow, glowOpts(glow)); eye.position.set(side*4*s, 2*s, 11.5*s); neck.add(eye);
    }
    const chest = P0(26, 24, 16, main, { ...opts, opacity:(opts.opacity ?? 1) * .92 });
    chest.position.y = 0; torso.add(chest);
    let w = 24;
    for (let i = 0; i < 4; i++){
      const rag = P0(w, 9, w*0.6, main, { ...opts, opacity:.7 - i*.13 });
      rag.position.y = (-14 - i*9) * s; torso.add(rag);
      w -= 4.5;
    }
    for (const side of [-1, 1]){
      const arm = new THREE.Group(); arm.position.set(side*17*s, 50*s, 0); detail.add(arm);
      const sleeve = P0(9, 20, 9, main, { ...opts, opacity:.85 }); sleeve.position.y = -10*s; arm.add(sleeve);
      const claw = P0(8, 8, 8, glow, glowOpts(glow)); claw.position.y = -23*s; arm.add(claw);
      g.arms[side>0?1:0].parent.remove(g.arms[side>0?1:0]);
      g.arms[side>0?1:0] = arm;
    }
    g.float = true;
  }

  if (cfg.crown){
    const c1 = P0(20, 4.5, 19, cfg.crown, glowOpts(cfg.crown)); c1.position.y = 16*s; neck.add(c1);
    for (const dx of [-6, 0, 6]){
      const sp = P0(4, 8, 4, cfg.crown, glowOpts(cfg.crown)); sp.position.set(dx*s, 22*s, 0); neck.add(sp);
    }
  }
  if (cfg.horns){
    for (const side of [-1, 1]){
      const h = P0(4.5, 12, 4.5, cfg.hornColor || glow, glowOpts(cfg.hornColor || glow));
      h.position.set(side*8*s, 16*s, 0); h.rotation.z = side*0.35; neck.add(h);
    }
  }
  g.scaleRef = s;
  g.setLod = far => {
    if (g.__far === far) return;
    g.__far = far; simple.visible = far; detail.visible = !far;
  };
  return g;
}
function buildCharacter(cfg){
  if (cfg.body && cfg.body !== "humanoid") return buildCreature(cfg);
  const g = new THREE.Group();
  const s = Math.round((cfg.scale ?? 1) * 20) / 20;
  // silueta simple para la distancia (3 mallas en vez de ~20)
  const simple = new THREE.Group();
  const sp1 = part(26*s, 26*s, 15*s, cfg.pants); sp1.position.y = 13*s;
  const sp2 = part(28*s, 28*s, 16*s, cfg.shirt); sp2.position.y = 41*s;
  const sp3 = part(19*s, 18*s, 17.5*s, cfg.skin); sp3.position.y = 66*s;
  simple.add(sp1, sp2, sp3);
  simple.visible = false;
  g.add(simple); g.simple = simple;
  const detail = new THREE.Group();
  g.add(detail); g.detail = detail;
  const skin = cfg.skin, shirt = cfg.shirt, pants = cfg.pants;
  const opts = cfg.opts || {};
  const P0 = (w, h, d, c, o) => part(w*s, h*s, d*s, c, o || opts);

  // piernas
  g.legs = [];
  for (const side of [-1, 1]){
    const hip = new THREE.Group();
    hip.position.set(side * 6.5 * s, 27 * s, 0);
    const thigh = P0(12, 21, 13, pants);
    thigh.position.y = -10.5 * s;
    const boot = P0(13.5, 8, 16, cfg.boots || pants);
    boot.position.set(0, -25 * s, 1.5 * s);
    hip.add(thigh, boot);
    detail.add(hip); g.legs.push(hip);
  }
  // torso
  const torso = P0(28, 28, 15.5, shirt);
  torso.position.y = 41 * s;
  detail.add(torso); g.torso = torso;
  const belt = P0(29.5, 5.5, 16.5, cfg.belt || pants);
  belt.position.y = 29.5 * s; detail.add(belt);
  if (cfg.armor){
    const plate = P0(22, 19, 2.5, cfg.armor, { ...opts, emissive: cfg.armorGlow || 0 });
    plate.position.set(0, 43 * s, 8.4 * s); detail.add(plate);
  }
  if (cfg.buckle){
    const b = P0(7, 4.5, 2, cfg.buckle);
    b.position.set(0, 30 * s, 8.8 * s); detail.add(b);
  }
  if (cfg.cape){
    const cape = P0(26, 32, 2.6, cfg.cape);
    cape.position.set(0, 40 * s, -9 * s); detail.add(cape); g.cape = cape;
  }
  // brazos
  g.arms = [];
  for (const side of [-1, 1]){
    const sh = new THREE.Group();
    sh.position.set(side * 17 * s, 54 * s, 0);
    const sleeve = P0(10.5, 11, 12, cfg.sleeve || shirt);
    sleeve.position.y = -5 * s;
    const arm = P0(9.5, 15, 11, skin);
    arm.position.y = -17 * s;
    const hand = P0(10, 6, 11.5, cfg.glove || skin);
    hand.position.y = -27 * s;
    sh.add(sleeve, arm, hand);
    detail.add(sh); g.arms.push(sh);
  }
  if (cfg.pauldron){
    // hombreras en dos capas; con `spikes` salen púas, como la armadura de sombra
    for (const side of [-1, 1]){
      const p2 = P0(14, 7, 15, cfg.pauldron);
      p2.position.set(side * 17 * s, 54 * s, 0);
      p2.rotation.z = side * -0.18;
      detail.add(p2);
      const p3 = P0(16.5, 6, 17, cfg.pauldron2 || cfg.pauldron);
      p3.position.set(side * 18 * s, 58.5 * s, 0);
      p3.rotation.z = side * -0.26;
      detail.add(p3);
      if (cfg.spikes){
        for (const dz of [-4.5, 0, 4.5]){
          const sp = P0(3.2, 9, 3.2, cfg.spikes, { ...opts, emissive:cfg.spikes, emissiveIntensity:.5 });
          sp.position.set(side * 20 * s, 63 * s, dz * s);
          sp.rotation.z = side * -0.5;
          detail.add(sp);
        }
      }
    }
  }
  if (cfg.gauntlet){
    for (let i = 0; i < 2; i++){
      const gt = P0(11.5, 9, 12.5, cfg.gauntlet);
      gt.position.y = -22 * s; g.arms[i].add(gt);
    }
  }
  if (cfg.tassets){
    // faldón de placas colgando del cinturón
    for (const dx of [-9.5, 0, 9.5]){
      const t2 = P0(8.5, 13, 3, cfg.tassets);
      t2.position.set(dx * s, 21 * s, 8.4 * s); detail.add(t2);
    }
    const rear = P0(26, 12, 3, cfg.tassets);
    rear.position.set(0, 21 * s, -8.4 * s); detail.add(rear);
  }
  if (cfg.greaves){
    for (let i = 0; i < 2; i++){
      const gv = P0(14.5, 12, 15, cfg.greaves);
      gv.position.set(0, -16 * s, 1 * s); g.legs[i].add(gv);
    }
  }
  if (cfg.core){
    const c2 = P0(7, 7, 3, cfg.core, { ...opts, emissive:cfg.core, emissiveIntensity:1.3 });
    c2.position.set(0, 45 * s, 9.4 * s); detail.add(c2);
  }
  if (cfg.backSpikes){
    for (const dx of [-8, 0, 8]){
      const bs = P0(3.5, 14 - Math.abs(dx) * .5, 3.5, cfg.backSpikes,
                    { ...opts, emissive:cfg.backSpikes, emissiveIntensity:.6 });
      bs.position.set(dx * s, 54 * s, -9.5 * s);
      bs.rotation.x = 0.35; detail.add(bs);
    }
  }
  // cabeza
  const neck = new THREE.Group();
  neck.position.y = 56 * s;
  const neckM = P0(9.5, 4.5, 9, skin); neckM.position.y = 1 * s; neck.add(neckM);
  const headMat = [mat(skin, opts), mat(skin, opts), mat(skin, opts), mat(skin, opts),
                   new THREE.MeshLambertMaterial({ color:new THREE.Color(skin), map:faceTexture(cfg.eyes || "#12172b", !!cfg.glowEyes), transparent:true, opacity:opts.opacity ?? 1 }),
                   mat(skin, opts)];
  const head = new THREE.Mesh(boxGeo(19*s, 18*s, 17.5*s), headMat);
  head.castShadow = true; head.position.y = 12 * s;
  neck.add(head);
  if (cfg.hair && !cfg.helm && !cfg.hood){
    const top = P0(19.5, 4, 18, cfg.hair); top.position.y = 22 * s; neck.add(top);
    const back = P0(18.5, 9, 3, cfg.hair); back.position.set(0, 15 * s, -8 * s); neck.add(back);
    const fringe = P0(18.5, 4.5, 3, cfg.hair); fringe.position.set(0, 19 * s, 8 * s); neck.add(fringe);
  }
  if (cfg.hood){
    // capucha de cazador: caída trasera, borde frontal y sombra sobre los ojos
    const back = P0(21, 15, 8, cfg.hood); back.position.set(0, 14 * s, -7 * s); neck.add(back);
    const top  = P0(21, 6, 19, cfg.hood); top.position.y = 21 * s; neck.add(top);
    for (const side of [-1, 1]){
      const sidep = P0(3.5, 13, 19, cfg.hood); sidep.position.set(side * 9.2 * s, 14 * s, 0); neck.add(sidep);
    }
    const brim = P0(20, 4, 5, cfg.hood2 || cfg.hood); brim.position.set(0, 18.5 * s, 8.5 * s);
    brim.rotation.x = 0.25; neck.add(brim);
    const scarf = P0(20, 6, 18, cfg.hood2 || cfg.hood); scarf.position.y = 5 * s; neck.add(scarf);
  }
  if (cfg.rig){
    // arnés táctico: correas cruzadas y cargadores
    const strapA = P0(5, 30, 2.5, cfg.rig); strapA.position.set(0, 43 * s, 8.6 * s);
    strapA.rotation.z = 0.5; detail.add(strapA);
    const strapB = P0(5, 30, 2.5, cfg.rig); strapB.position.set(0, 43 * s, 8.6 * s);
    strapB.rotation.z = -0.5; detail.add(strapB);
    for (const dx of [-9, 9]){
      const pouch = P0(7, 8, 3.5, cfg.rig2 || cfg.rig); pouch.position.set(dx * s, 33 * s, 8.8 * s); detail.add(pouch);
    }
  }
  if (cfg.kneepads){
    for (let i = 0; i < 2; i++){
      const kp = P0(13, 6, 4, cfg.kneepads); kp.position.set(0, -15 * s, 7 * s); g.legs[i].add(kp);
    }
  }
  if (cfg.helm){
    // yelmo cerrado: cúpula, visera encendida, mejillas y cresta
    const dome = P0(20.5, 11, 19, cfg.helm); dome.position.y = 19 * s; neck.add(dome);
    const brow = P0(21, 3.5, 20, cfg.helm2 || cfg.helm); brow.position.y = 13.5 * s; neck.add(brow);
    for (const side of [-1, 1]){
      const cheek = P0(3.5, 11, 18, cfg.helm); cheek.position.set(side * 8.5 * s, 8 * s, 0); neck.add(cheek);
    }
    const visor = P0(15, 3.2, 2.5, cfg.visor || "#31e4ff",
                     { ...opts, emissive:cfg.visor || "#31e4ff", emissiveIntensity:1.4 });
    visor.position.set(0, 11 * s, 9.2 * s); neck.add(visor);
    if (cfg.crest){
      for (const [dy, h] of [[26, 7], [30, 5]]){
        const cr = P0(3.5, h, 12, cfg.crest, { ...opts, emissive:cfg.crest, emissiveIntensity:.5 });
        cr.position.y = dy * s; neck.add(cr);
      }
    }
  }
  if (cfg.hat){
    const h1 = P0(21.5, 8, 20, cfg.hat); h1.position.y = 23 * s; neck.add(h1);
    const h2 = P0(20, 2.5, 11, cfg.hat); h2.position.set(0, 21 * s, 8 * s); neck.add(h2);
  }
  if (cfg.horns){
    for (const side of [-1, 1]){
      const h1 = P0(4.5, 7, 4.5, cfg.hornBase || cfg.hair || "#3c2b56");
      h1.position.set(side * 7.5 * s, 21 * s, 0); h1.rotation.x = -0.3; neck.add(h1);
      const h2 = P0(3.4, 6, 3.4, cfg.hornColor || "#ffd27a", { ...opts, emissive: cfg.hornColor || 0, emissiveIntensity:.35 });
      h2.position.set(side * 7.5 * s, 26 * s, -1.5 * s); h2.rotation.x = -0.5; neck.add(h2);
    }
  }
  if (cfg.crown){
    const c1 = P0(20, 4.5, 19, cfg.crown, { ...opts, emissive: cfg.crown, emissiveIntensity:.4 });
    c1.position.y = 24 * s; neck.add(c1);
    for (const dx of [-6, 0, 6]){
      const spike = P0(4, 7, 4, cfg.crown, { ...opts, emissive: cfg.crown, emissiveIntensity:.4 });
      spike.position.set(dx * s, 29 * s, 0); neck.add(spike);
    }
  }
  detail.add(neck); g.neck = neck;
  // arma en la mano derecha
  if (cfg.weapon){
    const wg = new THREE.Group();
    wg.position.set(17 * s, 30 * s, 6 * s);
    const kind = cfg.weaponKind || "sword";
    if (kind === "axe"){
      const haft = P0(4.5, 42, 4.5, "#6b4a2a"); haft.position.y = 21 * s; wg.add(haft);
      const head2 = P0(17, 15, 6, cfg.weapon); head2.position.set(-5*s, 38*s, 0); wg.add(head2);
    } else if (kind === "scythe"){
      const haft = P0(4.5, 50, 4.5, "#4a3a2a"); haft.position.y = 25 * s; wg.add(haft);
      const blade = P0(26, 5, 5, cfg.weapon); blade.position.set(10*s, 48*s, 0); wg.add(blade);
      const tip = P0(5, 13, 5, cfg.weapon); tip.position.set(21*s, 40*s, 0); wg.add(tip);
    } else if (kind === "staff"){
      const haft = P0(4, 50, 4, "#6b5a3a"); haft.position.y = 25 * s; wg.add(haft);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(7*s, 12, 10),
        mat(cfg.weapon, { ...opts, emissive: cfg.weapon, emissiveIntensity:.8 }));
      orb.position.y = 52 * s; wg.add(orb);
    } else if (kind === "polearm"){
      const haft = P0(4.5, 46, 4.5, "#5a4a32"); haft.position.y = 23 * s; wg.add(haft);
      const tip = P0(6, 15, 6, cfg.weapon); tip.position.y = 50 * s; wg.add(tip);
    } else {
      const blade = P0(6, 38, 3, cfg.weapon); blade.position.y = 30 * s; wg.add(blade);
      const guard = P0(16, 4, 7, "#8a7a5a"); guard.position.y = 11 * s; wg.add(guard);
      const grip = P0(5, 11, 5, "#4a3a2a"); grip.position.y = 3 * s; wg.add(grip);
    }
    wg.traverse(o => { if (o.isMesh){ o.castShadow = true; } });
    g.arms[1].add(wg);
    wg.position.set(0, -26 * s, 4 * s);
    g.weapon = wg;
  }
  g.scaleRef = s;
  g.setLod = far => {
    if (g.__far === far) return;
    g.__far = far;
    simple.visible = far;
    detail.visible = !far;
  };
  return g;
}
// Anima un personaje: paso, brazos, golpe, rebote y giro.
function poseCharacter(v, o){
  const s = v.scaleRef;
  const walk = o.moving ? Math.sin(o.step) : Math.sin(o.step * .5) * .12;
  const atk = o.attack || 0;
  v.legs[0].rotation.x = walk * .62;
  v.legs[1].rotation.x = -walk * .62;
  v.arms[0].rotation.x = -walk * .55;
  v.arms[1].rotation.x = atk > 0 ? (-2.1 + (1 - atk) * .7) : walk * .55;
  const bob = o.moving ? Math.abs(Math.sin(o.step)) * 1.6 * s : Math.sin(o.step * .5) * .6 * s;
  v.torso.position.y = (41 * s) + bob;
  v.neck.position.y = (56 * s) + bob;
  if (v.cape) v.cape.rotation.x = -.08 + (o.moving ? Math.sin(o.step * 1.2) * .12 : Math.sin(now() * 1.5) * .04);
}

/* ------------------------------ escena ----------------------------------- */
const THEMES = {
  city:    { g1:"#57b94f", g2:"#4aa845", road:"#3c4356", curb:"#e6ebf5", sky1:"#2f8fe0", sky2:"#cfeeff", fog:"#bfe4ff", sun:"#fff6e0", amp:0,  prop:"city" },
  forest:  { g1:"#3c9c45", g2:"#34883b", sky1:"#2e86c8", sky2:"#cfeeff", fog:"#b9e2ff", sun:"#fff2d8", amp:26, prop:"forest" },
  ice:     { g1:"#e3f4ff", g2:"#c9e7fb", sky1:"#4aa8e8", sky2:"#ecfaff", fog:"#dff4ff", sun:"#ffffff", amp:30, prop:"ice" },
  urban:   { g1:"#8d97a8", g2:"#7f8998", road:"#2f3646", curb:"#b9c2d2", sky1:"#3b6ea8", sky2:"#bcd6ee", fog:"#9fc0de", sun:"#fff4e2", amp:0,  prop:"urban" },
  royal:   { g1:"#77c36a", g2:"#67b25c", sky1:"#3b7fd0", sky2:"#ffe6b8", fog:"#e8dcc0", sun:"#fff0cf", amp:10, prop:"royal" },
  shrine:  { g1:"#7fbf6a", g2:"#6faf5c", sky1:"#e0705a", sky2:"#ffd9c2", fog:"#f0c3ae", sun:"#ffd9b0", amp:20, prop:"shrine" },
  dark:    { g1:"#3a4a3c", g2:"#334233", sky1:"#161a2c", sky2:"#3b3550", fog:"#2b2a42", amp:24, sun:"#9fb0ff", prop:"dark" },
  dragon:  { g1:"#7a5f45", g2:"#6b523b", sky1:"#7a2e20", sky2:"#e6a05a", fog:"#b2703f", sun:"#ffd2a0", amp:52, prop:"dragon" },
  cyber:   { g1:"#2a3350", g2:"#242c46", road:"#171d33", curb:"#4a3a86", sky1:"#0b1030", sky2:"#5a2a86", fog:"#2c1e50", amp:0,  sun:"#b98cff", prop:"cyber" },
  volcano: { g1:"#3a2a2a", g2:"#322424", sky1:"#2a0c0c", sky2:"#e0562a", fog:"#6e2a18", amp:36, sun:"#ffb07a", prop:"volcano" },
  guild:   { g1:"#6fae7a", g2:"#619e6c", road:"#3a4456", curb:"#e0e8f2", sky1:"#2f7fc8", sky2:"#dff0ff", fog:"#c6e3f7", amp:0, sun:"#fff6e0", prop:"guild" },
  mystic:  { g1:"#3e3a72", g2:"#363165", sky1:"#161046", sky2:"#6b4cc0", fog:"#3b2f78", amp:18, sun:"#c0a8ff", prop:"mystic" },
  storm:   { g1:"#5a6b7a", g2:"#4e5e6c", sky1:"#2a3348", sky2:"#8fa4bc", fog:"#61758c", amp:32, sun:"#dfe8f5", prop:"storm" },
  dungeon: { g1:"#3c2c52", g2:"#342749", sky1:"#0e0820", sky2:"#5a1f42", fog:"#2a1533", amp:8,  sun:"#ff9ab0", prop:"dungeon" },
};
/* Una paleta sonora por bioma, igual que hay una paleta de color. Los números
   son frecuencias en Hz: acordes de tres notas y unas pocas notas de melodía. */
const MUSIC_SCALES = {
  city:    { tempo:2.4, acordes:[[131,196,262],[147,220,294],[110,165,220],[147,196,247]], melodia:[523,587,659,784] },
  urban:   { tempo:2.2, acordes:[[123,185,247],[110,165,220],[139,208,277],[110,165,220]], melodia:[494,554,659,740] },
  forest:  { tempo:2.8, acordes:[[110,165,220],[123,185,247],[98,147,196],[131,196,262]], melodia:[440,494,587,659] },
  ice:     { tempo:3.2, acordes:[[131,196,247],[147,220,277],[110,165,208],[123,185,233]], melodia:[587,698,784,880] },
  shrine:  { tempo:3.0, acordes:[[110,147,220],[98,131,196],[123,165,247],[110,147,220]], melodia:[440,523,659,698] },
  dark:    { tempo:3.4, acordes:[[82,123,165],[87,131,175],[73,110,147],[82,123,165]],     melodia:[330,392,440,523] },
  volcano: { tempo:2.0, acordes:[[73,110,147],[82,123,165],[69,104,139],[78,117,156]],     melodia:[294,349,415,466] },
  dragon:  { tempo:2.0, acordes:[[69,104,139],[73,110,147],[62,93,124],[69,104,139]],      melodia:[277,330,392,415] },
  royal:   { tempo:2.6, acordes:[[131,165,196],[147,185,220],[110,139,165],[123,156,185]], melodia:[494,587,659,740] },
  guild:   { tempo:2.6, acordes:[[131,196,262],[110,165,220],[147,220,294],[123,185,247]], melodia:[523,587,698,784] },
  storm:   { tempo:2.8, acordes:[[98,147,185],[87,131,165],[104,156,196],[98,147,185]],    melodia:[392,466,554,622] },
  mystic:  { tempo:3.0, acordes:[[92,138,185],[104,156,208],[87,131,175],[98,147,196]],    melodia:[370,440,554,659] },
  cyber:   { tempo:2.2, acordes:[[87,131,175],[98,147,196],[78,117,156],[87,131,175]],     melodia:[349,415,523,622] },
  dungeon: { tempo:2.4, acordes:[[73,110,139],[78,117,147],[65,98,123],[73,110,139]],      melodia:[294,349,440,523] },
};
const themeNow = () => dungeon ? THEMES.dungeon : (THEMES[regionAt(player.x, player.y).theme] || THEMES.city);
function terrainH(x, z){
  const a = themeNow().amp;
  if (a <= 0.5) return 0;
  return (Math.sin(x*0.0021) * Math.cos(z*0.0017) * .65 + Math.sin((x+z)*0.0009) * .35) * a;
}
const CAM = { back:320, height:160, pitch:0.38, yaw:0, minBack:200, maxBack:700 };
const camFwd = { x:0, z:-1 }, camRight = { x:1, z:0 };
function updateCameraBasis(){
  camFwd.x = -Math.sin(CAM.yaw); camFwd.z = -Math.cos(CAM.yaw);
  camRight.x = Math.cos(CAM.yaw); camRight.z = -Math.sin(CAM.yaw);
}
function groundTexture(th){
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = th.g1; x.fillRect(0, 0, 256, 256);
  x.fillStyle = th.g2; x.fillRect(0, 0, 128, 128); x.fillRect(128, 128, 128, 128);
  if (th.road){
    // Calzada en cruz con línea discontinua y aceras, al estilo de las
    // islas-ciudad: el suelo deja de ser un tablero de ajedrez vacío.
    const road = th.road, curb = th.curb || "#d8dee8";
    x.fillStyle = curb; x.fillRect(0, 96, 256, 64); x.fillRect(96, 0, 64, 256);
    x.fillStyle = road; x.fillRect(0, 102, 256, 52); x.fillRect(102, 0, 52, 256);
    x.fillStyle = "#f5f0c0";
    for (let i = 0; i < 256; i += 32){
      x.fillRect(i + 6, 126, 16, 4);
      x.fillRect(126, i + 6, 4, 16);
    }
    x.fillStyle = "rgba(255,255,255,.25)";
    x.fillRect(0, 100, 256, 2); x.fillRect(0, 154, 256, 2);
    x.fillRect(100, 0, 2, 256); x.fillRect(154, 0, 2, 256);
  }
  x.globalAlpha = .14; x.fillStyle = "#ffffff";
  for (let i = 0; i < 220; i++) x.fillRect(Math.random()*256, Math.random()*256, 3, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(th.road ? 14 : 26, th.road ? 14 : 26);
  return t;
}
let currentThemeKey = null, groundTex = null;
function initScene(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(52, 1, 1, 9000);
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY.pixel));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  hemiLight = new THREE.HemisphereLight(0xbfe0ff, 0x2f4a30, .42);
  scene.add(new THREE.AmbientLight(0xffffff, .22));
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xfff4e0, 1.15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  const sc = sunLight.shadow.camera;
  sc.left = -600; sc.right = 600; sc.top = 600; sc.bottom = -600; sc.near = 10; sc.far = 2200;
  sunLight.shadow.bias = -0.0012;
  scene.add(sunLight, sunLight.target);

  // domo de cielo con degradado
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false,
    uniforms:{ top:{ value:new THREE.Color("#2f8fe0") }, bottom:{ value:new THREE.Color("#cfeeff") } },
    vertexShader:"varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader:"uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp((normalize(vP).y + .18) / 1.1, 0., 1.); gl_FragColor = vec4(mix(bottom, top, h), 1.); }",
  });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(5200, 24, 16), skyMat);
  scene.add(skyMesh);

  // suelo deformable
  const geo = new THREE.PlaneGeometry(4200, 4200, 90, 90);
  geo.rotateX(-Math.PI / 2);
  groundTex = groundTexture(THEMES.city);
  groundMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map:groundTex, color:0xc4c4c4 }));
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // nubes
  for (let i = 0; i < 14; i++){
    const cl = new THREE.Mesh(new THREE.SphereGeometry(rnd(90, 190), 8, 6),
      new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.9 }));
    cl.scale.set(1.8, .5, 1.2);
    cl.position.set(rnd(-2200, 2200), rnd(520, 900), rnd(-2200, 2200));
    cl.userData.cloud = true;
    scene.add(cl);
  }
  // sol visible con destello
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("#fff6d8"), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
  sunSprite.scale.set(900, 900, 1);
  sunSprite.position.set(1400, 1500, -1800);
  scene.add(sunSprite); scene.userData.sun = sunSprite;

  // lámina de agua bajo el mundo
  const water = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000),
    new THREE.MeshLambertMaterial({ color:0x2f7fd0, transparent:true, opacity:.92 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -46;
  scene.add(water); scene.userData.water = water;

  // motas ambientales flotando
  const moteGeo = new THREE.BufferGeometry();
  const mp = new Float32Array(160 * 3);
  for (let i = 0; i < 160; i++){
    mp[i*3] = rnd(-900, 900); mp[i*3+1] = rnd(20, 420); mp[i*3+2] = rnd(-900, 900);
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color:0xffffff, size:4.5, transparent:true, opacity:.45, depthWrite:false }));
  motes.frustumCulled = false;
  scene.add(motes); scene.userData.motes = motes;

  // hierba/roquitas instanciadas alrededor del jugador
  const bladeGeo = new THREE.ConeGeometry(3.2, 13, 4);
  const blades = new THREE.InstancedMesh(bladeGeo, new THREE.MeshLambertMaterial({ color:0x4f9e46 }), 620);
  blades.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blades.castShadow = false; blades.receiveShadow = false;
  scene.add(blades); scene.userData.blades = blades;

  // partículas
  sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(900), 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(900), 3));
  sparkPoints = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size:7, vertexColors:true, transparent:true, opacity:.95, depthWrite:false }));
  sparkPoints.frustumCulled = false;
  scene.add(sparkPoints);

  applyTheme(true);
}
function applyTheme(force){
  const th = themeNow();
  const key = dungeon ? "dungeon" : regionAt(player.x, player.y).theme;
  if (!force && key === currentThemeKey) return;
  currentThemeKey = key;
  skyMesh.material.uniforms.top.value.set(th.sky1);
  skyMesh.material.uniforms.bottom.value.set(th.sky2);
  scene.fog = new THREE.Fog(new THREE.Color(th.fog), 1900, 4600);
  hemiLight.color.set(th.sky2); hemiLight.groundColor.set(th.g2);
  sunLight.color.set(th.sun);
  groundMesh.material.map = groundTexture(th);
  groundMesh.material.needsUpdate = true;
  clearProps();
}

/* ------------------------------- props ----------------------------------- */
function buildProp(kind, h){
  const g = new THREE.Group();
  const v = h % 100;
  const add = (w, ht, d, col, x, y, z, o) => {
    const m = part(w, ht, d, col, o); m.position.set(x, y + ht/2, z); g.add(m); return m;
  };
  switch (kind){
    case "city": {
      // Rascacielos de colores con bandas de ventanas encendidas en las
      // cuatro caras, azotea, antena y zócalo: el skyline de una isla-ciudad.
      const pal = ["#f2c14e","#e8734f","#4fa3e8","#8a6bd8","#4fc99a","#e85f8a","#f0f3ff"];
      const body = pal[v % pal.length];
      const floors = 3 + (v % 5);
      const ht = 70 + floors * 26;
      add(20 + (v % 3) * 4 + 76, 8, 96 + (v % 3) * 4, "#b9c2d2", 0, 0, 0);   // zócalo
      add(88, ht, 88, body, 0, 8, 0);
      add(100, 10, 100, "#e9eef7", 0, 8 + ht, 0);                            // cornisa
      const win = v % 2 ? "#ffe9a8" : "#9fe4ff";
      for (let i = 0; i < floors; i++){
        const y = 26 + i * 26;
        add(62, 12, 2, win, 0, y, 45, { emissive:win, emissiveIntensity:.9 });
        add(62, 12, 2, win, 0, y, -45, { emissive:win, emissiveIntensity:.9 });
        add(2, 12, 62, win, 45, y, 0, { emissive:win, emissiveIntensity:.9 });
        add(2, 12, 62, win, -45, y, 0, { emissive:win, emissiveIntensity:.9 });
      }
      add(26, 14, 26, "#cfd8e8", 0, 18 + ht, 0);                             // caseta
      add(5, 34, 5, "#8f9bb0", 0, 32 + ht, 0);                               // antena
      add(8, 8, 8, "#ff5a6a", 0, 66 + ht, 0, { emissive:"#ff5a6a", emissiveIntensity:1.4 });
      break;
    }
    case "forest": {
      // palmera: tronco inclinado por tramos y hojas radiales
      let off = 0;
      for (let i = 0; i < 6; i++){
        off += (v % 3) - 1;
        add(13 - i, 12, 13 - i, i % 2 ? "#8a5a2e" : "#7a4a24", off * 2.2, i * 12, 0);
      }
      const topY = 72, tx = off * 2.2;
      for (let a = 0; a < 6; a++){
        const ang = (a / 6) * Math.PI * 2 + (v % 7) * .1;
        const leaf = part(38, 5, 13, a % 2 ? "#2fa83f" : "#3ec24e");
        leaf.position.set(tx + Math.cos(ang) * 21, topY + 4 - (a % 2) * 3, Math.sin(ang) * 21);
        leaf.rotation.y = -ang; leaf.rotation.z = .22;
        g.add(leaf);
      }
      add(9, 9, 9, "#c98a3a", tx, topY - 6, 8);                              // cocos
      break;
    }
    case "ice":
      add(16, 44, 16, "#6d4b2e", 0, 0, 0);
      add(68, 40, 68, "#dff3ff", 0, 40, 0);
      add(44, 32, 44, "#ffffff", 0, 74, 0);
      break;
    case "urban": {
      // bloque urbano: hormigón, franjas de ventanas y neón en la fachada
      const ht = 110 + v * 1.6;
      add(104, 10, 104, "#7c8698", 0, 0, 0);
      add(94, ht, 94, v % 2 ? "#9aa6b8" : "#8592a6", 0, 10, 0);
      for (let i = 0; i < 4 + (v % 3); i++){
        const y = 30 + i * 28;
        add(70, 13, 2, "#cfe4ff", 0, y, 48, { emissive:"#7fb7e8", emissiveIntensity:.55 });
        add(2, 13, 70, "#cfe4ff", -48, y, 0, { emissive:"#7fb7e8", emissiveIntensity:.55 });
      }
      add(10, 44, 3, "#ff6a8a", 40, 40, 49, { emissive:"#ff6a8a", emissiveIntensity:1.2 });
      add(104, 12, 104, "#6b7688", 0, 10 + ht, 0);
      break;
    }
    case "royal":
      add(84, 170 + v, 84, "#e8e2d0", 0, 0, 0);
      add(100, 24, 100, "#c9bfa4", 0, 170 + v, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(58, 70, 8), mat("#b8443f"));
      cone.position.y = 170 + v + 24 + 35; cone.castShadow = true; g.add(cone);
      break;
    case "shrine":
      add(12, 112, 12, "#d33b3b", -34, 0, 0);
      add(12, 112, 12, "#d33b3b", 34, 0, 0);
      add(104, 12, 20, "#b32f2f", 0, 106, 0);
      add(122, 10, 24, "#d33b3b", 0, 120, 0);
      break;
    case "dark":
      add(14, 72, 14, "#2b2a24", 0, 0, 0);
      add(56, 12, 56, "#3a3a2e", 0, 68, 0);
      add(10, 14, 10, "#ffb84d", 24, 72, 0, { emissive:"#ff9a2d", emissiveIntensity:1 });
      break;
    case "dragon":
      add(72, 120 + v, 72, "#6b5240", 0, 0, 0);
      add(46, 42, 46, "#59422f", 0, 120 + v, 0);
      break;
    case "cyber":
      add(90, 210 + v*2, 90, "#232b46", 0, 0, 0);
      for (let i = 0; i < 4; i++) add(58, 8, 2, i % 2 ? "#ff4fd0" : "#4ff0ff", 0, 40 + i*46, 46, { emissive:i % 2 ? "#ff4fd0" : "#4ff0ff", emissiveIntensity:1.2 });
      add(16, 40, 16, "#4ff0ff", 0, 210 + v*2, 0, { emissive:"#4ff0ff", emissiveIntensity:1.4 });
      break;
    case "volcano":
      add(82, 60 + v, 82, "#241a1a", 0, 0, 0);
      add(46, 16, 46, "#ff5a1e", 0, 60 + v, 0, { emissive:"#ff5a1e", emissiveIntensity:1.3 });
      break;
    case "guild":
      add(112, 122, 112, "#c9d4e4", 0, 0, 0);
      add(128, 20, 128, "#6b7a94", 0, 122, 0);
      add(8, 60, 8, "#8a97b0", -40, 142, 0);
      add(34, 26, 2, "#3f7fd0", -24, 168, 4);
      break;
    case "mystic":
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(30), mat("#8a6bff", { emissive:"#6b4cff", emissiveIntensity:.7, opacity:.92 }));
      crystal.position.y = 70 + v; crystal.castShadow = true; g.add(crystal);
      add(16, 32, 16, "#5b46b0", 0, 18, 0, { opacity:.8 });
      g.userData.spin = true;
      break;
    case "storm":
      add(98, 30, 98, "#6b7a8c", 0, 0, 0);
      add(14, 92, 14, "#8b98a8", 0, 30, 0);
      add(82, 10, 18, "#c3cedd", 0, 120, 0);
      break;
    case "dungeon":
      add(48, 200, 48, "#241a33", 0, 0, 0);
      add(62, 18, 62, "#3a2a4f", 0, 200, 0);
      add(12, 56, 2, "#ff4646", 0, 110, 25, { emissive:"#ff2222", emissiveIntensity:1.2 });
      break;
  }
  return g;
}
function clearProps(){
  for (const p2 of propPool){ scene.remove(p2.obj); disposeView(p2.obj); }
  propPool.length = 0;
}
const PROP_TILE = 190;
function syncProps(){
  const th = themeNow();
  const seen = new Set();
  const range = QUALITY.level >= 3 ? 1500 : QUALITY.level === 2 ? 1150 : 850;
  const gx0 = Math.floor((player.x - range) / PROP_TILE), gx1 = Math.floor((player.x + range) / PROP_TILE);
  const gz0 = Math.floor((player.y - range) / PROP_TILE), gz1 = Math.floor((player.y + range) / PROP_TILE);
  for (let gz = gz0; gz <= gz1; gz++){
    for (let gx = gx0; gx <= gx1; gx++){
      let h = (gx * 73856093) ^ (gz * 19349663); h = (h ^ (h >>> 13)) >>> 0;
      if (h % 5) continue;
      if (QUALITY.props < 1 && (h % 100) / 100 > QUALITY.props) continue;
      const key = gx + "," + gz;
      seen.add(key);
      if (propPool.some(p2 => p2.key === key)) continue;
      const x = gx * PROP_TILE + (h % 90) - 45, z = gz * PROP_TILE + ((h >> 8) % 90) - 45;
      if (Math.hypot(x - player.x, z - player.y) < 420) continue;
      const obj = buildProp(th.prop, h);
      if (!QUALITY.shadows) obj.traverse(o => { if (o.isMesh) o.castShadow = false; });
      obj.position.set(x, terrainH(x, z), z);
      obj.rotation.y = ((h >> 5) % 360) * Math.PI / 180;
      scene.add(obj);
      propPool.push({ key, obj });
    }
  }
  for (let i = propPool.length - 1; i >= 0; i--){
    if (!seen.has(propPool[i].key)){
      scene.remove(propPool[i].obj); disposeView(propPool[i].obj);
      propPool.splice(i, 1);
    }
  }
}

/* --------------------------- vistas de entidades -------------------------- */
function playerConfig(){
  // El cazador cambia de aspecto según avanza: de chaqueta de novato a
  // armadura completa, y de ahí a la armadura del Monarca de las Sombras.
  const r = rankIdx(P.rank);                       // 0=E … 5=S, 6=Nacional
  const awake = P.awakened;
  const monarch = awake && r >= 4;
  const armored = r >= 2 || awake;
  const heavy = r >= 4 || monarch;
  const base = monarch
    ? { shirt:"#170d33", sleeve:"#241552", pants:"#120a2a", boots:"#0d0720",
        plate:"#3b2178", trim:"#8a5cff", glowC:"#b48cff" }
    : awake
      ? { shirt:"#1b2c62", sleeve:"#25397d", pants:"#16224a", boots:"#101833",
          plate:"#2f4a9e", trim:"#5aa8ff", glowC:"#7fd0ff" }
      : { shirt:"#23407e", sleeve:"#2d51a0", pants:"#2a3350", boots:"#1d2438",
          plate:"#3f6ac0", trim:"#8fc0ff", glowC:"#9fd6ff" };
  return {
    scale:1.06, skin:"#e8b98a", eyes: monarch ? "#b48cff" : "#12172b", glowEyes: monarch,
    shirt: base.shirt, sleeve: base.sleeve, pants: base.pants, boots: base.boots,
    belt:"#1a1428", buckle: base.trim,
    hair: null,
    hood: heavy ? null : (monarch ? "#1b0f3c" : "#141b33"),
    hood2: heavy ? null : base.trim,
    rig: armored ? null : "#0f1526", rig2: armored ? null : base.trim,
    kneepads: heavy ? null : "#0f1526",
    armor: base.plate, armorGlow: monarch ? base.trim : 0,
    core: armored ? base.glowC : null,
    pauldron: base.plate, pauldron2: armored ? base.trim : null,
    spikes: monarch ? base.trim : null,
    gauntlet: base.plate,
    tassets: r >= 1 || awake ? base.plate : null,
    greaves: heavy ? base.plate : null,
    backSpikes: monarch ? base.trim : null,
    helm: heavy ? base.plate : null, helm2: heavy ? base.trim : null,
    visor: heavy ? base.glowC : null, crest: monarch ? base.trim : null,
    glove: base.trim,
    cape: monarch ? "#1b0f3c" : (r >= 3 ? base.plate : null),
    crown: (monarch && r >= 6) ? "#ffd24a" : null,
    weapon: monarch ? "#c8a8ff" : "#dce6f8", weaponKind: weaponKind(P.weapon),
    key: `${awake}|${P.rank}|${P.weapon}`,
  };
}
function ensurePlayerView(){
  const cfg = playerConfig();
  if (playerView && playerView.userData.key === cfg.key) return playerView;
  if (playerView){ scene.remove(playerView); disposeView(playerView); }
  playerView = buildCharacter(cfg);
  playerView.userData.key = cfg.key;
  scene.add(playerView);
  return playerView;
}
// Cada región tiene su familia de criatura, con su paleta y su brillo.
const MOB_LOOK = {
  Seoul:       { body:"slime",    skin:"#6fe0a8", dark:"#1d5a45", glow:"#b7ffe6" },
  Hongdae:     { body:"beast",    skin:"#7a8ad0", dark:"#232b4a", glow:"#ffd24a", hair:"#3a4470" },
  Temple:      { body:"golem",    skin:"#a89a86", dark:"#5b5044", glow:"#ffb45a" },
  Reawaken:    { body:"wraith",   skin:"#3d3358", dark:"#1a1430", glow:"#9f7bff" },
  HighOrcs:    { body:"humanoid", skin:"#6fae6a", dark:"#2a3a28", glow:"#ffe066" },
  RedGate:     { body:"beast",    skin:"#cfe8ff", dark:"#4a6a8a", glow:"#7fe0ff", hair:"#9fc4e8" },
  Jeju:        { body:"insect",   skin:"#2e2a3a", dark:"#15121f", glow:"#8fff6a" },
  Japan:       { body:"humanoid", skin:"#b06a5a", dark:"#3a1f28", glow:"#ff7a5a" },
  DemonCastle: { body:"wraith",   skin:"#5a2438", dark:"#2a0f1c", glow:"#ff5a7a" },
  IceMonarch:  { body:"golem",    skin:"#cfe9ff", dark:"#5f7f9f", glow:"#9fe8ff" },
  BeastMonarch:{ body:"beast",    skin:"#8a5a3a", dark:"#3a2418", glow:"#ffb45a", hair:"#5a3a24" },
  Architect:   { body:"wraith",   skin:"#4a4a86", dark:"#1f1f44", glow:"#9fa8ff" },
  ShadowRealm: { body:"humanoid", skin:"#2a2a4a", dark:"#12122a", glow:"#c08cff" },
};
function enemyConfig(e){
  const L = e.look || {};
  const boss = e.boss, brute = e.def.kind === "brute";
  const reg = MOB_LOOK[(e.isle || regionAt(e.x, e.y).id)] || MOB_LOOK.Seoul;
  // los jefes rompen el molde de su región: siempre humanoides acorazados
  const body = boss ? "humanoid" : reg.body;
  const glow = reg.glow;
  const cfg = {
    body,
    scale: (e.def.r / 18) * (boss ? 1.75 : brute ? 1.25 : (L.height || 1)),
    skin: brute ? reg.dark : reg.skin,
    pants: reg.dark, eyes: glow, hair: reg.hair || reg.dark,
    horns: brute || boss, hornColor: glow,
    crown: boss ? glow : null,
  };
  if (body !== "humanoid") return cfg;
  // humanoide: guerrero con placas, más recargado cuanto más duro es
  return {
    ...cfg,
    skin: boss ? "#c9a06a" : reg.skin,
    shirt: reg.dark, sleeve: reg.dark, boots:"#15182a", belt:"#1a1626",
    glowEyes:true,
    armor: reg.dark, armorGlow: brute || boss ? glow : 0,
    core: boss ? glow : null,
    pauldron: reg.dark, pauldron2: brute || boss ? glow : null,
    spikes: boss ? glow : null,
    gauntlet: brute || boss ? reg.dark : null,
    tassets: boss ? reg.dark : null,
    greaves: boss ? reg.dark : null,
    helm: boss ? reg.dark : null, helm2: boss ? glow : null, visor: boss ? glow : null,
    cape: boss ? reg.dark : null,
    weapon: boss ? glow : (brute ? "#8a7a6a" : null),
    weaponKind: boss ? "scythe" : "sword",
  };
}
function shadowConfig(sh){
  const tier = sh.data.tier;
  const glow = getComputedStyle(document.documentElement).getPropertyValue(TIER_VAR[tier] || "--t-C").trim() || "#b9c9e8";
  const elite = tier === "S" || tier === "S Elite" || tier === "Monarch";
  const monarch = tier === "Monarch";
  return {
    scale: monarch ? 1.12 : elite ? 1.04 : .97, opts:{ opacity:.94 },
    skin:"#2b4f86", shirt:"#14294f", eyes: glow, glowEyes:true,
    sleeve:"#1d3d72", pants:"#0e1c38", boots:"#081428", belt:"#0e1c38",
    hair:null, glove: glow,
    armor:"#1b3866", armorGlow: glow, core: glow,
    pauldron:"#1b3866", pauldron2: glow, spikes: elite ? glow : null,
    gauntlet:"#1b3866", tassets:"#1b3866", greaves:"#1b3866",
    backSpikes: monarch ? glow : null,
    helm:"#1b3866", helm2: glow, visor: glow, crest: elite ? glow : null,
    crown: monarch ? glow : null,
    cape: elite ? "#0d1f3f" : null,
    weapon: glow, weaponKind: monarch ? "scythe" : "sword",
  };
}
// Libera la memoria de GPU de una vista que sale de la escena. Sin esto las
// etiquetas, barras y geometrías propias de cada entidad se acumulaban: en
// partidas largas el número de texturas crecía sin parar y el juego se atascaba.
function disposeView(v){
  if (!v) return;
  v.traverse(o => {
    if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats){
      if (SHARED.has(m)) continue;
      if (m.map && !SHARED.has(m.map)) m.map.dispose();
      if (m.dispose) m.dispose();
    }
  });
}
function syncGroup(list, map, buildCfg, keyOf){
  const alive = new Set();
  for (const item of list){
    const key = keyOf(item);
    alive.add(key);
    let v = map.get(key);
    if (!v){
      v = buildCharacter(buildCfg(item));
      scene.add(v);
      map.set(key, v);
    }
    item.__view = v;
  }
  for (const [key, v] of map){
    if (!alive.has(key)){ scene.remove(v); disposeView(v); map.delete(key); }
  }
}
// ---- cadáveres ----
function buildCorpse(){
  const g = new THREE.Group();
  const body = part(36, 14, 48, "#16284d", { opacity:.95 });
  body.position.y = 7; g.add(body);
  const ring = new THREE.Mesh(new THREE.RingGeometry(30, 46, 28),
    new THREE.MeshBasicMaterial({ color:0x31e4ff, transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 2; g.add(ring); g.ring = ring;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(16, 22, 90, 12, 1, true),
    new THREE.MeshBasicMaterial({ color:0x31e4ff, transparent:true, opacity:.14, side:THREE.DoubleSide, depthWrite:false }));
  pillar.position.y = 45; g.add(pillar); g.pillar = pillar;
  return g;
}
// ---- portal ----
function buildPortal(color){
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(70, 32),
    new THREE.MeshBasicMaterial({ color:new THREE.Color(color), transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false }));
  disc.position.y = 80; g.add(disc); g.disc = disc;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(72, 7, 10, 34), mat(color, { emissive:color, emissiveIntensity:1.2 }));
  ring.position.y = 80; g.add(ring); g.ring = ring;
  const light = new THREE.PointLight(new THREE.Color(color), 2.2, 460);
  light.position.y = 90; g.add(light);
  const base = new THREE.Mesh(new THREE.RingGeometry(40, 96, 28),
    new THREE.MeshBasicMaterial({ color:new THREE.Color(color), transparent:true, opacity:.35, side:THREE.DoubleSide, depthWrite:false }));
  base.rotation.x = -Math.PI / 2; base.position.y = 2; g.add(base);
  return g;
}
// ---- números de daño ----
const floatPool = [];
function getFloatSprite(){
  for (const f of floatPool) if (!f.busy) return f;
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 128;
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthTest:false }));
  sp.scale.set(45, 22, 1);
  sp.visible = false;
  scene.add(sp);
  const rec = { cv, tex, sp, busy:false };
  floatPool.push(rec);
  return rec;
}
function paintFloat(rec, text, color, crit){
  const x = rec.cv.getContext("2d");
  x.clearRect(0, 0, 256, 128);
  x.font = `700 ${crit ? 68 : 56}px Fredoka, sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "rgba(4,8,20,.95)";
  x.strokeText(text, 128, 74); x.fillStyle = color; x.fillText(text, 128, 74);
  if (crit){
    x.font = "700 26px Fredoka, sans-serif";
    x.lineWidth = 7; x.strokeText("CRÍTICO", 128, 24);
    x.fillStyle = "#ffd24a"; x.fillText("CRÍTICO", 128, 24);
  }
  rec.tex.needsUpdate = true;
}
// ---- anillos de impacto ----
const ringPool = [];
function getRing(){
  for (const r of ringPool) if (!r.busy) return r;
  // (cada anillo lleva un destello aditivo asociado)
  const m = new THREE.Mesh(new THREE.RingGeometry(.7, 1, 32),
    new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.8, side:THREE.DoubleSide, depthWrite:false }));
  m.rotation.x = -Math.PI / 2; m.visible = false;
  scene.add(m);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("#ffffff"), transparent:true, depthWrite:false, depthTest:false,
    blending:THREE.AdditiveBlending, opacity:.6 }));
  flash.visible = false;
  scene.add(flash);
  const rec = { mesh:m, flash, busy:false };
  ringPool.push(rec);
  return rec;
}

/* -------------------- etiquetas y barras en la escena --------------------- */
function labelSprite(text, color, size){
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 128;
  const x = cv.getContext("2d");
  x.font = `600 ${size || 56}px Fredoka, sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "rgba(4,8,20,.92)";
  x.strokeText(text, 256, 64); x.fillStyle = color; x.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthTest:false }));
  sp.scale.set(150, 37, 1);
  sp.userData.cv = cv; sp.userData.tex = tex;
  return sp;
}
function repaintLabel(sp, text, color, size){
  const cv = sp.userData.cv, x = cv.getContext("2d");
  x.clearRect(0, 0, 512, 128);
  x.font = `600 ${size || 56}px Fredoka, sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "rgba(4,8,20,.92)";
  x.strokeText(text, 256, 64); x.fillStyle = color; x.fillText(text, 256, 64);
  sp.userData.tex.needsUpdate = true;
}
const BAR_BG = new THREE.SpriteMaterial({ color:0x0a1020, transparent:true, opacity:.85, depthTest:false });
function healthBar(){
  const g = new THREE.Group();
  const bg = new THREE.Sprite(BAR_BG.clone());
  bg.scale.set(80, 11, 1);
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color:0xff4d61, depthTest:false }));
  fill.scale.set(76, 7, 1);
  g.add(bg, fill);
  g.fill = fill;
  g.setPct = (pct, color) => {
    const w = 76 * clamp(pct, 0, 1);
    fill.scale.set(Math.max(0.001, w), 7, 1);
    fill.position.x = -(76 - w) / 2;
    fill.material.color.set(color);
  };
  return g;
}
// Contorno cel: cada pieza lleva dentro una copia invertida algo mayor.
function addOutline(view, color, scale){
  if (view.userData.outline) return;
  const om = new THREE.MeshBasicMaterial({ color: color ?? 0x0a1224, side:THREE.BackSide });
  const targets = [];
  view.traverse(o => { if (o.isMesh && !o.userData.isOutline) targets.push(o); });
  for (const o of targets){
    const m = new THREE.Mesh(o.geometry, om);
    m.scale.setScalar(scale ?? 1.08);
    m.userData.isOutline = true;
    m.castShadow = false; m.receiveShadow = false;
    o.add(m);
  }
  view.userData.outline = true;
}

/* ------------------------------- frame ----------------------------------- */
let groundAnchor = { x:1e9, z:1e9 };
function syncGround(){
  if (Math.hypot(player.x - groundAnchor.x, player.y - groundAnchor.z) < 90) return;
  groundAnchor = { x:player.x, z:player.y };
  groundMesh.position.set(player.x, 0, player.y);
  const pos = groundMesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++){
    const wx = pos.getX(i) + player.x, wz = pos.getZ(i) + player.y;
    pos.setY(i, terrainH(wx, wz));
  }
  pos.needsUpdate = true;
  groundMesh.geometry.computeVertexNormals();
  if (groundTex){
    groundMesh.material.map.offset.set(player.x / 160, -player.y / 160);
  }
}
function updateCamera(dt){
  updateCameraBasis();
  const tx = player.x, tz = player.y, ty = terrainH(tx, tz) + 55;
  const back = CAM.back;
  const height = Math.max(150, back * Math.tan(CAM.pitch) * 1.15 + 95);
  camera.position.set(tx - camFwd.x * back + cam.shake * 2, ty + height, tz - camFwd.z * back);
  camera.lookAt(tx, ty + 34, tz);
  sunLight.position.set(tx + 420, 760, tz + 260);
  sunLight.target.position.set(tx, 0, tz);
  sunLight.target.updateMatrixWorld();
}
function poseEntity(v, x, z, yaw, o){
  v.position.set(x, terrainH(x, z) + (o.lift || 0), z);
  v.rotation.y = yaw;
  poseCharacter(v, o);
}
function render(dt){
  if (!THREE_OK || !renderer) return;
  trackPerformance(dt);
  applyTheme(false);
  syncGround();
  syncProps();
  updateCamera(dt);

  // jugador
  const pv = ensurePlayerView();
  if (!pv.tag){
    pv.tag = labelSprite(`${P.title} · Nv ${P.level}`, "#eaf3ff", 46);
    pv.tag.position.y = 112; pv.tag.scale.set(110, 27, 1); pv.add(pv.tag);
    pv.tagKey = `${P.title}|${P.level}`;
  } else if (pv.tagKey !== `${P.title}|${P.level}`){
    repaintLabel(pv.tag, `${P.title} · Nv ${P.level}`, P.awakened ? "#d9c0ff" : "#eaf3ff", 46);
    pv.tagKey = `${P.title}|${P.level}`;
  }
  pv.tag.rotation.y = -player.yaw;
  poseEntity(pv, player.x, player.y, player.yaw, {
    step:player.step, moving:(player.moveAmt || 0) > .05,
    attack: player.phase === "startup" ? .35 : player.phase === "active" ? 1 : 0,
    lift: player.h,
  });
  pv.visible = player.dead <= 0 || Math.sin(now() * 20) > 0;

  // enemigos + barra de vida y nombre
  syncGroup(enemies, views.enemies, enemyConfig, e => e.guid);
  const lodSorted = enemies.map(e => ({ e, d: Math.hypot(e.x - player.x, e.y - player.y) }))
                           .sort((a, b) => a.d - b.d);
  lodSorted.forEach((row, idx) => {
    const far = !row.e.boss && (row.d > QUALITY.charDetail || idx >= QUALITY.maxChars);
    row.e.__lodFar = far;
  });
  for (const e of enemies){
    const v = e.__view;
    if (v.setLod) v.setLod(!!e.__lodFar);
    const closeEnough = !e.__lodFar && QUALITY.shadows;
    if (v.userData.cast !== closeEnough){
      v.userData.cast = closeEnough;
      v.traverse(o => { if (o.isMesh) o.castShadow = closeEnough; });
    }
    poseEntity(v, e.x, e.y, e.yaw || 0, { step:e.step, moving:true, attack: e.telegraph ? .6 : 0 });
    if (e.boss && !v.userData.outline) addOutline(v, 0x1a0e18, 1.06);
    if (!v.hud){
      const hud = new THREE.Group();
      const bar = healthBar();
      bar.scale.setScalar(e.boss ? 1.25 : .62);
      hud.add(bar); hud.bar = bar;
      const nameSp = labelSprite(`${e.name} · Nv ${e.level}`, e.boss ? "#ffe9a8" : "#eaf3ff", 46);
      nameSp.scale.set(e.boss ? 150 : 104, e.boss ? 37 : 26, 1);
      nameSp.position.y = 15;
      hud.add(nameSp); hud.name = nameSp;
      hud.position.y = (e.boss ? 132 : 86) * (e.def.r / 18);
      v.add(hud); v.hud = hud;
    }
    v.hud.bar.setPct(e.hp / e.maxHp, e.boss ? 0xffd24a : 0xff4d61);
    const dp = Math.hypot(e.x - player.x, e.y - player.y);
    v.hud.visible = (e.boss || e === target || dp < 300) && e.hp > 0;
    v.hud.name.visible = e.boss || e === target;
    v.hud.rotation.y = -v.rotation.y;                     // el HUD siempre de frente
    // destello al recibir daño
    const hurt = e.hurt > 0;
    if (hurt !== v.userData.hurt){
      v.userData.hurt = hurt;
      v.traverse(o => { if (o.isMesh && !o.userData.isOutline && o.material.emissive){
        o.material.emissive.setHex(hurt ? 0x883333 : 0x000000); } });
    }
  }
  // sombras
  syncGroup(shadows, views.shadows, shadowConfig, sh => sh.uuid);
  for (const sh of shadows){
    const dS = Math.hypot(sh.x - player.x, sh.y - player.y);
    if (sh.__view.setLod) sh.__view.setLod(dS > QUALITY.charDetail);
    const bob = Math.sin(sh.step * .8) * 2.2;
    poseEntity(sh.__view, sh.x, sh.y, sh.yaw || 0, {
      step:sh.step, moving: sh.state !== "IDLE_FOLLOW", attack: sh.swing > 0 ? 1 : 0, lift: 4 + bob,
    });
  }
  // cadáveres
  const aliveC = new Set();
  for (const c of corpses){
    aliveC.add(c.CorpseId);
    let v = views.corpses.get(c.CorpseId);
    if (!v){ v = buildCorpse(); scene.add(v); views.corpses.set(c.CorpseId, v); }
    v.position.set(c.x, terrainH(c.x, c.y), c.y);
    const pulse = .55 + Math.sin(c.phase * 3) * .25;
    v.ring.material.opacity = .35 + pulse * .35;
    v.ring.scale.setScalar(.9 + pulse * .2);
    v.pillar.material.opacity = .08 + pulse * .12;
    v.rotation.y += 0.01;
    const nearC = Math.hypot(c.x - player.x, c.y - player.y) < CFG.ARISE_RANGE;
    if (nearC){
      if (!v.tag){ v.tag = labelSprite("[B] ARISE · 3", "#6ef0ff", 50); v.tag.position.y = 96; v.tag.scale.set(110, 27, 1); v.add(v.tag); }
      if (v.tagN !== c.AttemptsRemaining){
        repaintLabel(v.tag, `[B] ARISE · ${c.AttemptsRemaining}`, "#6ef0ff", 50);
        v.tagN = c.AttemptsRemaining;
      }
      v.tag.visible = true;
      v.tag.rotation.y = -v.rotation.y;
    } else if (v.tag) v.tag.visible = false;
  }
  for (const [k, v] of views.corpses){
    if (!aliveC.has(k)){ scene.remove(v); disposeView(v); views.corpses.delete(k); }
  }
  // NPC
  if (false){
    if (!npcView){
      npcView = buildCharacter({ scale:1.04, skin:"#f5cd30", shirt:"#2f8d5a", sleeve:"#276f48",
        pants:"#3a3f52", boots:"#23283a", belt:"#2a2218", buckle:"#c9a33a", hair:"#4a3524",
        eyes:"#12172b", pauldron:"#246b46", cape:"#1f5c3c", armor:"#ffd24a" });
      scene.add(npcView);
    }
    npcView.visible = true;
    poseEntity(npcView, npc.x, npc.y, npc.yaw ?? 0, { step:npc.step * .8, moving:false, attack:0 });
  } else if (npcView) npcView.visible = false;

  // cazadores del elenco
  for (const h of HUNTERS){
    const d = Math.hypot(h.x - player.x, h.y - player.y);
    if (d > 1500){ if (h.__view) h.__view.visible = false; continue; }
    if (!h.__view){
      h.__view = buildCharacter({ scale:1.06, skin:"#f5cd30", boots:"#23283a", belt:"#2a2218",
        buckle:"#c9a33a", eyes:"#12172b", glove:"#e0a83a", cape:h.look.cape || null, ...h.look });
      scene.add(h.__view);
      h.__tag = labelSprite(`${h.name} · ${h.rank}`, "#ffe9a8", 44);
      h.__tag.scale.set(150, 37, 1); h.__tag.position.y = 118;
      h.__view.add(h.__tag);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(26, 34, 260, 12, 1, true),
        new THREE.MeshBasicMaterial({ color:0xffd24a, transparent:true, opacity:.10, side:THREE.DoubleSide, depthWrite:false }));
      beam.position.y = 130; h.__view.add(beam); h.__beam = beam;
    }
    h.__view.visible = true;
    if (h.__view.setLod) h.__view.setLod(d > QUALITY.charDetail);
    h.__tag.rotation.y = -h.yaw;
    h.__beam.material.opacity = .06 + Math.sin(now() * 2 + h.ring) * .04;
    poseEntity(h.__view, h.x, h.y, h.yaw ?? 0, { step:h.step * .7, moving:false, attack:0 });
  }

  // portal
  if (portal){
    if (!portalView || portalView.userData.mode !== portal.modeId){
      if (portalView){ scene.remove(portalView); disposeView(portalView); }
      portalView = buildPortal(portal.mode.color);
      portalView.userData.mode = portal.modeId;
      scene.add(portalView);
    }
    portalView.visible = true;
    portalView.position.set(portal.x, terrainH(portal.x, portal.y), portal.y);
    portalView.rotation.y = now() * .6;
    portalView.disc.material.opacity = .45 + Math.sin(now() * 3) * .12;
  } else if (portalView) portalView.visible = false;

  // telegrafías del jefe y marca de objetivo
  syncTelegraphs();
  syncTargetRing();

  // partículas
  const posAttr = sparkGeo.attributes.position, colAttr = sparkGeo.attributes.color;
  const n = Math.min(parts.length, 300);
  for (let i = 0; i < n; i++){
    const p2 = parts[i];
    posAttr.setXYZ(i, p2.x, terrainH(p2.x, p2.y) + p2.h, p2.y);
    const c = new THREE.Color(p2.color);
    colAttr.setXYZ(i, c.r, c.g, c.b);
  }
  for (let i = n; i < 300; i++) posAttr.setXYZ(i, 0, -9999, 0);
  posAttr.needsUpdate = true; colAttr.needsUpdate = true;

  // números de daño
  for (const rec of floatPool){ rec.busy = false; rec.sp.visible = false; }
  for (const f of floaters){
    const rec = getFloatSprite();
    rec.busy = true; rec.sp.visible = true;
    if (f.__txt !== f.text || f.__crit !== f.crit){
      paintFloat(rec, f.text, f.color, f.crit);
      f.__txt = f.text; f.__crit = f.crit;
    } else paintFloat(rec, f.text, f.color, f.crit);
    const rise = (1 - f.life) * 70;
    rec.sp.position.set(f.x, terrainH(f.x, f.y) + (f.h || 80) + rise, f.y);
    rec.sp.material.opacity = clamp(f.life * 1.6, 0, 1);
    const sc = f.crit ? 52 : (f.big ? 42 : 34);
    rec.sp.scale.set(sc, sc * .5, 1);
  }
  // anillos
  for (const rec of ringPool){ rec.busy = false; rec.mesh.visible = false; rec.flash.visible = false; }
  for (const r of rings){
    const rec = getRing();
    rec.busy = true; rec.mesh.visible = true;
    const k = 1 - r.life / r.max;
    const rad = r.r * (.35 + k * .8);
    rec.mesh.scale.setScalar(rad);
    rec.mesh.position.set(r.x, terrainH(r.x, r.y) + 3 + (r.h || 0), r.y);
    rec.mesh.material.color.set(r.color);
    rec.mesh.material.opacity = (1 - k) * .75;
    rec.flash.visible = true;
    rec.flash.position.set(r.x, terrainH(r.x, r.y) + 40 + (r.h || 0), r.y);
    rec.flash.scale.setScalar(rad * 2.4);
    rec.flash.material.color.set(r.color);
    rec.flash.material.opacity = (1 - k) * .5;
  }
  // hierba, motas, agua y sol siguen al jugador
  const blades = scene.userData.blades;
  if (blades){
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    const baseX = Math.round(player.x / 60) * 60, baseZ = Math.round(player.y / 60) * 60;
    let i = 0;
    for (let gz = -10; gz <= 10 && i < 620; gz++){
      for (let gx = -10; gx <= 10 && i < 620; gx++){
        const x = baseX + gx * 60, z = baseZ + gz * 60;
        let h2 = (Math.floor(x) * 73856093) ^ (Math.floor(z) * 19349663); h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        if (h2 % 2) continue;
        const ox = ((h2 % 50) - 25), oz = (((h2 >> 7) % 50) - 25);
        const wx = x + ox, wz = z + oz;
        sc.set(1, .7 + (h2 % 7) / 10, 1);
        m.compose(new THREE.Vector3(wx, terrainH(wx, wz) + 6, wz), q, sc);
        blades.setMatrixAt(i++, m);
      }
    }
    blades.count = i;
    blades.instanceMatrix.needsUpdate = true;
    const th2 = themeNow();
    blades.material.color.set(th2.g2);
    blades.visible = QUALITY.grass && !dungeon && th2.amp > 4 && !th2.road;
  }
  if (scene.userData.motes && QUALITY.motes){
    scene.userData.motes.position.set(player.x, 0, player.y);
    scene.userData.motes.rotation.y += dt * .04;
  }
  if (scene.userData.water){
    scene.userData.water.position.set(player.x, -46 + Math.sin(now() * .6) * 3, player.y);
    scene.userData.water.material.color.set(themeNow().fog);
    scene.userData.water.visible = !dungeon;
  }
  if (scene.userData.sun){
    scene.userData.sun.position.set(player.x + 1500, 1400, player.y - 1900);
    scene.userData.sun.visible = !dungeon;
  }

  // el cielo acompaña a la cámara y las nubes derivan a su alrededor
  skyMesh.position.set(camera.position.x, 0, camera.position.z);
  for (const o of scene.children){
    if (!o.userData.cloud) continue;
    if (o.userData.ox === undefined){
      o.userData.ox = o.position.x; o.userData.oz = o.position.z;
    }
    o.userData.ox += dt * 5;
    if (o.userData.ox > 2400) o.userData.ox = -2400;
    o.position.set(player.x + o.userData.ox, o.position.y, player.y + o.userData.oz);
  }

  renderer.render(scene, camera);
}
const telePool = [];
function syncTelegraphs(){
  for (const t of telePool){ t.busy = false; t.disc.visible = false; t.ring.visible = false; }
  for (const e of enemies){
    if (!e.telegraph) continue;
    let rec = telePool.find(t => !t.busy);
    if (!rec){
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 36),
        new THREE.MeshBasicMaterial({ color:0xff4d61, transparent:true, opacity:.32, depthWrite:false }));
      disc.rotation.x = -Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.RingGeometry(.93, 1, 36),
        new THREE.MeshBasicMaterial({ color:0xff8d97, transparent:true, opacity:.9, side:THREE.DoubleSide, depthWrite:false }));
      ring.rotation.x = -Math.PI / 2;
      scene.add(disc, ring);
      rec = { disc, ring, busy:false };
      telePool.push(rec);
    }
    rec.busy = true;
    const tg = e.telegraph, k = clamp(tg.t / tg.dur, 0, 1);
    const y = terrainH(tg.x, tg.y) + 3;
    rec.disc.visible = rec.ring.visible = true;
    rec.disc.position.set(tg.x, y, tg.y); rec.disc.scale.setScalar(tg.r * k);
    rec.ring.position.set(tg.x, y + 1, tg.y); rec.ring.scale.setScalar(tg.r);
  }
}
let targetRing = null;
function syncTargetRing(){
  const t = enemies.find(e => e.boss) || (target && enemies.includes(target) ? target : null);
  if (!targetRing){
    targetRing = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 32),
      new THREE.MeshBasicMaterial({ color:0xffd24a, transparent:true, opacity:.8, side:THREE.DoubleSide, depthWrite:false }));
    targetRing.rotation.x = -Math.PI / 2;
    scene.add(targetRing);
  }
  if (!t){ targetRing.visible = false; return; }
  targetRing.visible = true;
  targetRing.position.set(t.x, terrainH(t.x, t.y) + 4, t.y);
  const r = (t.def.r || 18) * 2.6;
  targetRing.scale.setScalar(r + Math.sin(now() * 4) * 2);
}

function resize(){
  W = canvas.clientWidth; H = canvas.clientHeight;
  if (!renderer) return;
  renderer.setSize(W, H, false);
  camera.aspect = W / Math.max(1, H);
  camera.updateProjectionMatrix();
}

/* ===========================================================================
   INTERFAZ
   =========================================================================== */
const $ = id => document.getElementById(id);
const modal = $("modal");
let panelKind = null, panelTab = "Weapons";

function syncHud(){
  $("rank").textContent = P.rank;
  $("title").textContent = P.title;
  $("lvl").textContent = `Nv ${P.level}`;
  $("rebirth").textContent = `Renacer ${P.rebirths}`;
  $("cash").textContent = fmt(P.cash);
  $("gems").textContent = fmt(P.gems);
  $("tickets").textContent = fmt(P.tickets);
  $("isle").textContent = dungeon ? `${dungeon.mode.name} · ${dungeon.isle.name}` : regionAt(player.x, player.y).name;
  const nx = dungeon ? null : distanceToNextRegion();
  $("nextRegion").textContent = nx ? `${nx.next.name} a ${Math.round(nx.dist)} m` : "";
  $("portal").textContent = dungeon
    ? `Sala ${dungeon.room}/${dungeon.rooms} · ${Math.max(0,Math.floor(dungeon.timer))}s`
    : portal ? `Portal ${portal.mode.name} · ${Math.ceil(60-portal.t)}s`
    : `Portal en ${Math.floor(portalT/60)}:${String(Math.floor(portalT%60)).padStart(2,"0")}`;

  const q = P.quests.active;
  $("quest").textContent = q ? `${q.text} · ${Math.min(questProgress(), q.goal)}/${q.goal}`
    : (dungeon ? "" : "Habla con Woo Jinchul (!)");

  const mh = maxHP(), mm = maxMana(), need = FORMULA.expRequired(P.level);
  $("hpbar").style.width = `${clamp(player.hp/mh*100,0,100)}%`;
  $("hptxt").textContent = `${fmt(Math.max(0,player.hp))} / ${fmt(mh)}`;
  $("mpbar").style.width = `${clamp(player.mana/mm*100,0,100)}%`;
  $("mptxt").textContent = `${fmt(player.mana)} / ${fmt(mm)}`;
  $("xpbar").style.width = `${clamp(P.xp/need*100,0,100)}%`;
  $("xptxt").textContent = `${fmt(P.xp)} / ${fmt(need)}`;

  const tb = $("targetbar");
  const tgt = enemies.find(e => e.boss) || (target && enemies.includes(target) ? target : null);
  if (tgt){
    tb.hidden = false;
    $("t-lv").textContent = tgt.level;
    $("t-name").textContent = tgt.name;
    $("t-hp").style.width = `${clamp(tgt.hp/tgt.maxHp*100,0,100)}%`;
    $("t-hptxt").textContent = `${fmt(tgt.hp)} / ${fmt(tgt.maxHp)}`;
    $("t-dps").textContent = `${fmt(player.dps.shown)} DPS`;
  } else tb.hidden = true;

  $("cd-skill").style.transform = `scaleY(${player.skillCd / SKILL.cooldown})`;
  $("cd-dash").style.transform = `scaleY(${player.dashCd / Math.max(.01, FORMULA.dashCooldown(P.stats.AGI))})`;

  const squad = $("squad"); squad.innerHTML = "";
  squad.hidden = P.squad.length === 0;
  const cap = squadCap();
  for (let i=0;i<Math.min(cap, 8);i++){
    const u = P.squad[i], d = u && P.shadows[u];
    const el = document.createElement("div");
    el.className = "slot" + (d ? "" : " empty");
    if (d){
      const col = `var(${TIER_VAR[d.tier]})`;
      el.innerHTML = `<span class="g">${SHADOWS[d.id]?.glyph || "👤"}</span>
        <span class="n" style="color:${col}">${d.name}</span><span class="d">${fmt(shadowDmgOf(d))}</span>`;
      el.style.borderColor = col;
    } else el.innerHTML = `<span class="g" style="opacity:.4">+</span><span class="n">vacío</span>`;
    squad.appendChild(el);
  }
}

/* ------------------------------- paneles ---------------------------------- */
function openPanel(kind){
  SFX.ui();
  closeArise(); panelKind = kind;
  panelTab = kind === "items" ? "Relics" : kind === "stats" ? "Stats" : "Weapons";
  renderPanel();
}
function closePanel(){ panelKind = null; renderPanel(); }
const shell = (title, body) => `<div class="scrim" data-close="1"><div class="panel" role="dialog" aria-label="${title}">
  <header><h2>${title}</h2><button class="x" data-close="1" aria-label="Cerrar">✕</button></header>
  <div class="body">${body}</div></div></div>`;

const STAT_INFO = {
  STR:["Fuerza","Daño físico · Arma + STR×1.5"],
  INT:["Inteligencia","Daño mágico e suerte de Arise"],
  SDW:["Sombras","Daño ×(1+SDW·0.012) y vida ×(1+SDW·0.008)"],
  VIT:["Vitalidad","Vida máxima · base + VIT×15"],
  AGI:["Agilidad","Velocidad, dash y doble salto a 200"],
  MNA:["Maná","Maná máximo · 100 + MNA×10"],
};
// Puntos ya colocados en atributos (todo menos la bolsa sin repartir).
const STAT_KEYS = ["STR", "INT", "SDW", "VIT", "AGI", "MNA"];
const spentPoints = () => STAT_KEYS.reduce((a, k) => a + (P.stats[k] || 0), 0);
function panelStats(){
  const tabs = [["Stats","Atributos"],["Class","Clase"],["Talents","Talentos"],["Codes","Códigos"]];
  const nav = `<div class="tabs">${tabs.map(([id,label]) =>
    `<button class="tab ${panelTab===id?"sel":""}" data-tab="${id}">${label}</button>`).join("")}</div>`;
  if (panelTab === "Class"){
    const body = Object.values(CLASSES).map(c => `<div class="item">
      <span class="g">${c.glyph}</span>
      <span class="meta"><b>${c.name}</b><span>${c.desc}</span></span>
      <button class="btn ${P.class===c.id?"green":""}" data-class="${c.id}" ${P.class===c.id?"disabled":""}>
        ${P.class===c.id?"Activa":"Elegir"}</button></div>`).join("");
    return shell("Clase", nav + `<div class="list">${body}</div>
      <p class="hint">Puedes cambiar de clase cuando quieras; los bonos se aplican al instante.</p>`);
  }
  if (panelTab === "Talents"){
    const body = Object.values(TALENTS).map(t => {
      const lv = talentLv(t.id), cost = t.cost(lv);
      return `<div class="item"><span class="g">✦</span>
        <span class="meta"><b>${t.name} <span style="opacity:.6">${lv}/${t.max}</span></b><span>${t.desc}</span></span>
        <span class="price" style="color:var(--gem)">${lv>=t.max?"MAX":fmt(cost)+" 💎"}</span>
        <button class="btn violet" data-talent="${t.id}" ${lv>=t.max || P.gems<cost?"disabled":""}>Subir</button></div>`;
    }).join("");
    return shell("Talentos", nav + `<div class="list">${body}</div>
      <p class="hint">Gemas disponibles: <b style="color:var(--gem)">${fmt(P.gems)}</b>. Las gemas salen de extracciones fallidas y de mazmorras.</p>`);
  }
  if (panelTab === "Codes"){
    const body = Object.keys(CODES).map(c => `<div class="item ${P.codes[c]?"locked":""}">
      <span class="g">🎁</span><span class="meta"><b>${c}</b>
      <span>${fmt(CODES[c].cash)} oro · ${fmt(CODES[c].gems)} gemas · ${CODES[c].tickets} tickets</span></span>
      <button class="btn gold" data-code="${c}" ${P.codes[c]?"disabled":""}>${P.codes[c]?"Canjeado":"Canjear"}</button></div>`).join("");
    return shell("Códigos", nav + `<div class="list">${body}</div>
      <p class="hint">Códigos de bienvenida de esta build.</p>`);
  }
  const s = P.stats, next = RANKS[rankIdx(P.rank)+1];
  const rows = Object.keys(STAT_INFO).map(k => `
    <div class="statrow"><span class="k">${k}</span>
      <span class="d"><b>${STAT_INFO[k][0]}</b><br>${STAT_INFO[k][1]}</span>
      <span class="v">${fmt(s[k])}</span>
      <button class="plus" data-stat="${k}" ${s.points > 0 ? "" : "disabled"}>+</button></div>`).join("");
  const rebirthCost = 1e6 * Math.pow(10, P.rebirths);
  return shell(`Atributos · ${s.points} puntos`, nav + `
    <div class="statgrid">${rows}</div>
    <div class="derived">
      <div class="kv"><small>Daño M1</small><b>${fmt(baseDamage())}</b></div>
      <div class="kv"><small>Daño habilidad</small><b>${fmt((weaponDmg()*SKILL.damage.weapon + s.STR*SKILL.damage.str*1.5)*(1+rankMult()))}</b></div>
      <div class="kv"><small>Vida</small><b>${fmt(maxHP())}</b></div>
      <div class="kv"><small>Maná</small><b>${fmt(maxMana())}</b></div>
      <div class="kv"><small>Velocidad</small><b>${FORMULA.walkSpeed(s.AGI).toFixed(1)}</b></div>
      <div class="kv"><small>Dash CD</small><b>${FORMULA.dashCooldown(s.AGI).toFixed(2)}s</b></div>
      <div class="kv"><small>Doble salto</small><b>${FORMULA.doubleJump(s.AGI) ? "Sí" : `${s.AGI}/200`}</b></div>
      <div class="kv"><small>Suerte Arise</small><b>+${ariseLuck().toFixed(1)}%</b></div>
      <div class="kv"><small>Daño sombras</small><b>×${shadowMult().toFixed(2)}</b></div>
      <div class="kv"><small>Enemigos</small><b>${fmt(P.kills)}</b></div>
      <div class="kv"><small>Sombras extraídas</small><b>${fmt(P.arisen)}</b></div>
      <div class="kv"><small>Mazmorras</small><b>${fmt(P.dungeonsCleared)}</b></div>
      <div class="kv"><small>Clase</small><b>${CLASSES[P.class].name}</b></div>
      <div class="kv"><small>Escuadrón</small><b>${P.squad.length}/${squadCap()}</b></div>
      <div class="kv"><small>Crítico</small><b>${Math.round((CFG.CRIT_CHANCE + classBonus("crit") + talentLv("crit")*0.03)*100)}%</b></div>
      <div class="kv"><small>Misiones</small><b>${fmt(P.quests.done)}</b></div>
    </div>
    ${next ? `<div class="item"><span class="g">◆</span>
      <span class="meta"><b>Rango ${next.name}</b><span>Nivel ${next.level} · ${fmt(next.gems)} gemas · daño ×${(1+next.dmg).toFixed(2)} · suerte +${next.luck}%</span></span>
      <button class="btn gold" id="rankup" ${P.level>=next.level && P.gems>=next.gems ? "" : "disabled"}>Ascender</button></div>`
     : `<p class="hint">Rango máximo <b>S</b> alcanzado.</p>`}
    <div class="item"><span class="g">↺</span>
      <span class="meta"><b>Reiniciar atributos</b><span>Te devuelve los ${fmt(spentPoints())} puntos repartidos para que los coloques de otra forma · gratis</span></span>
      <button class="btn" id="respec-btn" ${spentPoints() > 0 ? "" : "disabled"}>Reiniciar</button></div>
    <div class="item"><span class="g">🌀</span>
      <span class="meta"><b>Renacer</b><span>Reinicia nivel y atributos · +50% daño permanente por renacer · coste ${fmt(rebirthCost)} oro</span></span>
      <button class="btn violet" id="rebirth-btn" ${P.level>=200 && P.cash>=rebirthCost ? "" : "disabled"}>Renacer</button></div>
    <p class="hint">Fórmulas del contrato V9: <b>EXPRequired(N)=100·N^1.85+N·50</b> · <b>EXPReward=Nivel·25·(1+Renacer·0.25)</b>.</p>`);
}
function panelShadows(){
  const list = Object.values(P.shadows).sort((a,b) => shadowDmgOf(b) - shadowDmgOf(a));
  // merge: 3 copias iguales del mismo nivel -> +1 nivel (regla 08.2)
  const counts = {};
  for (const s of list) counts[`${s.id}|${s.level}`] = (counts[`${s.id}|${s.level}`] || 0) + 1;
  const body = list.length ? list.map(s => {
    const eq = P.squad.includes(s.uuid), col = `var(${TIER_VAR[s.tier]})`;
    const can = counts[`${s.id}|${s.level}`] >= FLAGS.MERGE_COPIES;
    return `<div class="item"><span class="g">${SHADOWS[s.id]?.glyph || "👤"}</span>
      <span class="meta"><b>${s.name} <span style="opacity:.6">Nv ${s.level}</span></b>
        <span><span class="tier" style="color:${col}">${s.tier}</span> · daño ${fmt(shadowDmgOf(s))} · vida ${fmt(shadowHPOf(s))}</span></span>
      ${can ? `<button class="btn green" data-merge="${s.id}|${s.level}">Fusionar ×3</button>` : ""}
      <button class="btn" data-equip="${s.uuid}">${eq ? "Quitar" : "Equipar"}</button></div>`;
  }).join("") : `<p class="hint">Sin sombras todavía. Derrota a un enemigo y pulsa <b>B</b> sobre su cuerpo.</p>`;
  return shell(`Sombras · ${P.squad.length}/${squadCap()}`, `
    <div class="list">${body}</div>
    <p class="hint">Escuadrón lleno: una extracción mejor <b>desequipa automáticamente la sombra de menor daño</b>.
    Tres copias iguales del mismo nivel se fusionan en una de nivel superior.</p>`);
}
function panelShop(){
  const isle = isleOf(P.island);
  const items = Object.values(WEAPONS).filter(w => P.islands.includes(w.isle)).map(w => {
    const owned = (P.weapons[w.id] || 0) > 0, eq = P.weapon === w.id;
    const copies = P.weapons[w.id] || 0;
    return `<div class="item"><span class="g">${w.glyph}</span>
      <span class="meta"><b>${w.name}${copies > 1 ? ` ×${copies}` : ""}</b>
        <span>${isleOf(w.isle).name} · daño base ${fmt(w.dmg)}</span></span>
      ${owned ? "" : `<span class="price">${fmt(w.cost)}</span>`}
      ${copies >= FLAGS.MERGE_COPIES ? `<button class="btn green" data-wmerge="${w.id}">Fusionar ×3</button>` : ""}
      <button class="btn" data-weapon="${w.id}" ${eq ? "disabled" : ""}>${eq ? "Equipada" : owned ? "Equipar" : "Comprar"}</button></div>`;
  }).join("");
  return shell("Armería", `<div class="list">${items}</div>
    <p class="hint">Oro: <b class="price">${fmt(P.cash)}</b>. Tres copias de un arma se fusionan y suben su rango (+25% de daño).
    Las armas se desbloquean al llegar a su isla.</p>`);
}
function panelItems(){
  const tabs = ["Story","Relics","Runes","Index"];
  const nav = `<div class="tabs">${tabs.map(t => `<button class="tab ${panelTab===t?"sel":""}" data-tab="${t}">${
    t === "Story" ? "Historia" : t === "Relics" ? "Reliquias" : t === "Runes" ? "Runas" : "Índice"}</button>`).join("")}</div>`;
  let body = "";
  if (panelTab === "Story"){
    body = CAMPAIGN.map((c, i) => {
      const state = i < P.chapter ? "cerrado" : i === P.chapter ? "en curso" : "bloqueado";
      const color = i < P.chapter ? "var(--cash)" : i === P.chapter ? "var(--gold)" : "var(--dim)";
      return `<div class="item ${i > P.chapter ? "locked" : ""}"><span class="g">${i < P.chapter ? "✔" : i === P.chapter ? "▶" : "·"}</span>
        <span class="meta"><b>${i + 1}. ${c.title}</b><span>${i <= P.chapter ? c.goal : "Sigue avanzando para desbloquearlo"}</span></span>
        <span class="tier" style="color:${color}">${state}</span></div>`;
    }).join("");
    return shell("Historia", nav + `<div class="list">${body}</div>
      <p class="hint">Juego de fan, sin relación oficial con la obra. Personajes y lugares se usan como homenaje;
      todos los modelos y el arte son originales de este proyecto.</p>`);
  }
  if (panelTab === "Relics"){
    body = Object.values(RELICS).map(r => {
      const has = !!P.relics[r.id];
      return `<div class="item ${has?"":"locked"}"><span class="g">${r.glyph}</span>
        <span class="meta"><b>${r.name}</b><span>${r.effect === "shadowDmg" ? `Daño de sombras +${(r.value*100).toFixed(0)}%`
          : r.effect === "ariseLuck" ? `Suerte de Arise +${r.value}%` : `Rank Up +${r.value}%`} · ${isleOf(r.isle)?.name || r.isle}</span></span>
        <span class="tier" style="color:${has?"var(--cash)":"var(--dim)"}">${has ? "ACTIVA" : "BLOQUEADA"}</span></div>`;
    }).join("");
  } else if (panelTab === "Runes"){
    body = Object.values(RUNES).map(r => `<div class="item ${P.runes[r.id]?"":"locked"}"><span class="g">${r.glyph}</span>
      <span class="meta"><b>${r.name}</b><span>${r.desc}</span></span>
      <span class="price">×${fmt(P.runes[r.id] || 0)}</span></div>`).join("");
  } else {
    body = Object.values(SHADOWS).map(s => {
      const n = P.index[s.id] || 0;
      return `<div class="item ${n?"":"locked"}"><span class="g">${s.glyph}</span>
        <span class="meta"><b>${s.name}</b><span><span class="tier" style="color:var(${TIER_VAR[s.tier]})">${s.tier}</span> · daño base ${fmt(s.dmg)} · tasa ${(s.rate*100).toFixed(1)}%</span></span>
        <span class="price">${n ? `×${n}` : "—"}</span></div>`;
    }).join("");
  }
  return shell("Inventario", nav + `<div class="list">${body}</div>
    <p class="hint">Las reliquias caen en mazmorras de su isla. Las runas modifican la siguiente mazmorra (activación del líder).</p>`);
}
function panelMap(){
  const cur = ringAt(player.x, player.y);
  const isles = ISLANDS.map((i, idx) => {
    const un = P.level >= i.level || P.islands.includes(i.id);
    const here = idx === cur;
    const r = Math.round(ringRadius(idx));
    return `<div class="item ${un ? "" : "locked"}"><span class="g">${here ? "📍" : "🧭"}</span>
      <span class="meta"><b>${i.name} <span style="opacity:.6">· anillo ${idx}</span></b>
      <span>${un ? `${i.enemy.name} Nv ${i.enemy.lvl} · jefe ${i.boss.name} · a ${fmt(r)} m del centro`
                 : `Requiere nivel ${i.level} para viajar (puedes llegar caminando)`}</span></span>
      <button class="btn" data-ring="${idx}" ${!un || here ? "disabled" : ""}>${here ? "Aquí" : "Viajar"}</button></div>`;
  }).join("");
  const hunters = HUNTERS.map(h => `<div class="item"><span class="g">🛡</span>
    <span class="meta"><b>${h.name} <span style="opacity:.6">Rango ${h.rank}</span></b>
    <span>${h.role === "forja" ? "Templa tu arma a cambio de oro"
      : h.role === "sanar" ? "Cura completa y bendición de daño"
      : h.role === "entrenar" ? "Entrena por gemas y da puntos de atributo"
      : "Consulta el índice de sombras"} · anillo ${h.ring}</span></span>
    <button class="btn green" data-hunter="${h.id}">Ir</button></div>`).join("");
  const modes = Object.entries(DUNGEON_MODES).map(([id, m]) => `
    <div class="item"><span class="g">🌀</span>
      <span class="meta"><b>${m.name}</b><span>${m.rooms} salas · enemigos ×${m.mult} · recompensa ×${m.reward}${id === "DoubleDungeon" ? " · otorga el Despertar" : ""}</span></span>
      <button class="btn violet" data-dungeon="${id}" ${P.tickets > 0 || id === "Standard" ? "" : "disabled"}>${id === "Standard" ? "Entrar" : "1 🎟"}</button></div>`).join("");
  return shell("Mapa del mundo", `
    <p class="hint">El mundo es <b>abierto y continuo</b>: el centro es Seúl y cada anillo que cruzas
    es una región más dura. Puedes ir caminando a cualquier sitio; el viaje rápido solo pide el nivel de la zona.</p>
    <div class="list">${isles}</div>
    <h3 style="margin:6px 0 0;font-family:var(--f-display);font-size:15px">Cazadores</h3>
    <div class="list">${hunters}</div>
    <h3 style="margin:6px 0 0;font-family:var(--f-display);font-size:15px">Puertas</h3>
    <div class="list">${modes}</div>`);
}
function panelHelp(){
  return shell("Controles y bucle", `
    <div class="derived">
      <div class="kv"><small>Avanzar / retroceder</small><b>W · S</b></div>
      <div class="kv"><small>Lateral</small><b>A · D</b></div>
      <div class="kv"><small>Girar cámara</small><b>← → o arrastrar</b></div>
      <div class="kv"><small>Acercar cámara</small><b>↑ ↓ o rueda</b></div>
      <div class="kv"><small>Golpe</small><b>Clic izq.</b></div>
      <div class="kv"><small>Habilidad</small><b>V</b></div>
      <div class="kv"><small>Arise</small><b>B</b></div>
      <div class="kv"><small>Dash</small><b>Q</b></div>
      <div class="kv"><small>Saltar</small><b>Espacio</b></div>
      <div class="kv"><small>Auto (golpe+arise)</small><b>R</b></div>
      <div class="kv"><small>Montura</small><b>M</b></div>
      <div class="kv"><small>Portal</small><b>F</b></div>
      <div class="kv"><small>Hablar con cazador</small><b>G</b></div>
      <div class="kv"><small>Menús</small><b>1-5 · H</b></div>
    </div>
    <p class="hint"><b>Mundo abierto:</b> no hay pantallas de carga entre zonas. El centro del mapa es Seúl y
    cada anillo que cruzas caminando es una región nueva, con su bioma, sus enemigos y su nivel recomendado. En el mapa
    (tecla 5) puedes ver a qué distancia queda la siguiente y viajar rápido a las que ya tengas nivel para pisar.</p>
    <p class="hint"><b>Cazadores:</b> repartidos por los anillos hay cazadores con nombre propio. Acércate y pulsa
    <b>G</b>: la herrera templa tu arma, la sanadora te cura y te da una bendición de daño, el comandante te entrena por
    gemas y el archivista abre el índice de sombras.</p>
    <p class="hint"><b>Vida y maná:</b> el maná se rellena solo y la vida se regenera cuando llevas 5 segundos
    sin recibir daño. Cha Hae-In te cura del todo y te da una bendición de daño si hablas con ella.</p>
    <p class="hint"><b>Rendimiento:</b> el juego mide su propio ritmo y baja o sube el detalle solo. Puedes fijarlo a
    mano haciendo clic en «Calidad» (arriba a la derecha).</p>
    <p class="hint"><b>Movimiento:</b> el personaje se mueve en relación a la cámara: W avanza hacia donde miras,
    S retrocede, A y D se desplazan a los lados, y el cuerpo gira hacia donde avanza. En móvil, arrastra en la
    mitad izquierda para el joystick y en la derecha para girar la cámara.</p>
    <p class="hint"><b>Bucle:</b> pelea → mata → el cuerpo deja un <b>CorpseToken</b> con 3 intentos → Arise → gestiona el escuadrón
    (su tamaño crece con tu rango) → mejora arma y atributos → desbloquea isla → mazmorra → reliquias y runas → rango y renacer.</p>
    <p class="hint"><b>Combo M1:</b> cuatro golpes encadenados (×1.00, ×1.05, ×1.15, ×1.45) con hitstop e impulso de cámara crecientes.
    <b>Habilidad V:</b> arco de 70° y radio 190, cuesta 30 de maná.</p>
    <p class="hint"><b>Double Dungeon</b> otorga el Despertar: +60% de suerte de Arise y el sigilo Black Monarch.</p>`);
}
function renderPanel(){
  if (!panelKind){ modal.hidden = true; modal.innerHTML = ""; return; }
  modal.innerHTML = panelKind === "stats" ? panelStats()
    : panelKind === "shadows" ? panelShadows()
    : panelKind === "shop" ? panelShop()
    : panelKind === "items" ? panelItems()
    : panelKind === "map" ? panelMap() : panelHelp();
  modal.hidden = false;
}

/* ----------------------------- modal ARISE -------------------------------- */
// Extracción directa: una pulsación, un intento. Sin ventanas que corten el ritmo.
function openArise(){
  const c = nearestCorpse();
  if (!c) return note("No hay ningún cuerpo cerca", "--dim");
  const r = attemptArise(c);
  if (r.ok){
    note(`ARISE · ${r.shadow.name}${r.replaced ? " (sustituye a la más débil)" : ""}`, "--arise");
    banner("ARISE", "#2fe4ff");
  } else if (r.code === "EXHAUSTED"){
    note(`Sin intentos · +${fmt(r.gems)} gemas`, "--gem");
  } else if (r.code === "FAILED"){
    note(`Fallo · quedan ${r.attempts} intentos`, "--hp");
  } else if (r.code === "TOO_FAR"){
    note("Acércate más al cuerpo", "--dim");
  }
}
function closeArise(){ ariseToken = null; if (!panelKind){ modal.hidden = true; modal.innerHTML = ""; } }
function renderArise(log){
  const c = ariseToken; if (!c) return;
  const def = SHADOWS[c.ShadowDefinitionId];
  const rate = corpseRate(c);
  const pips = Array.from({ length:FLAGS.ARISE_ATTEMPTS }, (_, i) =>
    `<span class="pip ${i < c.AttemptsRemaining ? "live" : ""}"></span>`).join("");
  modal.innerHTML = `<div class="scrim" data-close="1"><div class="arise-box" role="dialog" aria-label="Arise">
    <h3>ARISE</h3>
    <div class="sub">${c.EnemyId} · sombra <span style="color:var(${TIER_VAR[def.tier]})">${def.name}</span> (${def.tier})</div>
    <div class="chance">${(rate*100).toFixed(1)}%</div>
    <div class="sub">tasa efectiva · base ${(def.rate*100).toFixed(1)}% × suerte +${ariseLuck().toFixed(0)}%</div>
    <div class="pips">${pips}</div>
    <div class="arise-actions">
      <button class="btn" id="do-arise" ${c.AttemptsRemaining > 0 ? "" : "disabled"}>Extraer (${c.AttemptsRemaining})</button>
      <button class="btn gold" id="do-destroy">Destruir · +gemas</button>
    </div>
    <div class="log">${log}</div></div></div>`;
  modal.hidden = false;
}

/* ------------------------------- eventos ---------------------------------- */
modal.addEventListener("click", e => {
  const t = e.target;
  if (t.dataset.close !== undefined && (t.classList.contains("scrim") || t.classList.contains("x"))){ closePanel(); closeArise(); return; }
  if (t.dataset.tab){ panelTab = t.dataset.tab; renderPanel(); return; }
  if (t.dataset.stat){
    const k = t.dataset.stat;
    if (P.stats.points > 0){ P.stats.points--; P.stats[k]++; rebuildSquad(); save(); dirty = true; renderPanel(); }
    return;
  }
  if (t.id === "rankup"){
    const next = RANKS[rankIdx(P.rank)+1];
    if (next && P.level >= next.level && P.gems >= next.gems){
      P.gems -= next.gems; P.rank = next.name;
      SFX.rankUp();
      banner(`RANGO ${next.name}`, "#ffd24a"); note(`Rango ${next.name}`, "--gold");
      burst(player.x, player.y, 46, "#ffd24a", 34); camImpulse(0.75);
      save(); dirty = true; renderPanel();
    }
    return;
  }
  if (t.id === "respec-btn"){
    // Devuelve los puntos repartidos sin tocar el nivel ni nada más. Es
    // gratis a propósito: probar otra combinación no debería costar una
    // partida entera.
    const back = spentPoints();
    if (back <= 0) return;
    for (const k of STAT_KEYS) P.stats[k] = 0;
    P.stats.points += back;
    player.hp = Math.min(player.hp, maxHP());
    player.mana = Math.min(player.mana, maxMana());
    rebuildSquad();
    note(`Atributos reiniciados · ${fmt(back)} puntos devueltos`, "--gem");
    SFX.ui();
    save(); dirty = true; renderPanel();
    return;
  }
  if (t.id === "rebirth-btn"){
    const cost = 1e6 * Math.pow(10, P.rebirths);
    if (P.level >= 200 && P.cash >= cost){
      P.cash -= cost; P.rebirths++; P.level = 1; P.xp = 0;
      P.stats = { STR:0, INT:0, SDW:0, VIT:0, AGI:0, MNA:0, points:5 };
      player.hp = maxHP(); player.mana = maxMana();
      banner("RENACER", "#bb8cff"); note(`Renacer ${P.rebirths} · +50% de daño permanente`, "--monarch");
      save(); dirty = true; renderPanel();
    }
    return;
  }
  if (t.dataset.class){
    P.class = t.dataset.class;
    player.hp = Math.min(player.hp, maxHP());
    note(`Clase: ${CLASSES[P.class].name}`, "--gem"); save(); dirty = true; renderPanel(); return;
  }
  if (t.dataset.talent){
    const tal = TALENTS[t.dataset.talent], lv = talentLv(tal.id), cost = tal.cost(lv);
    if (lv >= tal.max || P.gems < cost) return;
    P.gems -= cost; P.talents[tal.id] = lv + 1;
    note(`${tal.name} nivel ${lv+1}`, "--monarch"); save(); dirty = true; renderPanel(); return;
  }
  if (t.dataset.code){
    const c = t.dataset.code;
    if (P.codes[c]) return;
    P.codes[c] = true;
    P.cash += CODES[c].cash; P.gems += CODES[c].gems; P.tickets += CODES[c].tickets;
    banner("CÓDIGO CANJEADO", "#ffd24a"); note(`${c}: +${fmt(CODES[c].cash)} oro`, "--cash");
    save(); dirty = true; renderPanel(); return;
  }
  if (t.dataset.equip){
    const u = t.dataset.equip, i = P.squad.indexOf(u);
    if (i >= 0) P.squad.splice(i, 1);
    else if (P.squad.length < squadCap()) P.squad.push(u);
    else return note("Escuadrón lleno", "--hp");
    rebuildSquad(); save(); renderPanel(); return;
  }
  if (t.dataset.merge){
    const [id, lvl] = t.dataset.merge.split("|");
    const pool = Object.values(P.shadows).filter(s => s.id === id && s.level === +lvl).slice(0, FLAGS.MERGE_COPIES);
    if (pool.length < FLAGS.MERGE_COPIES) return;
    for (const s of pool){ delete P.shadows[s.uuid]; const i = P.squad.indexOf(s.uuid); if (i>=0) P.squad.splice(i,1); }
    const def = SHADOWS[id];
    const merged = { uuid:uid(), id, name:def.name, tier:def.tier, level:+lvl + 1, xp:0, lock:false };
    P.shadows[merged.uuid] = merged;
    autoEquip(merged); rebuildSquad(); save();
    note(`${def.name} Nv ${merged.level}`, "--gem"); renderPanel(); return;
  }
  if (t.dataset.wmerge){
    const id = t.dataset.wmerge;
    if ((P.weapons[id] || 0) < FLAGS.MERGE_COPIES) return;
    P.weapons[id] -= FLAGS.MERGE_COPIES - 1;           // 3 copias -> 1 de rango superior
    P.weaponLv[id] = weaponLv(id) + 1;
    note(`${WEAPONS[id].name} rango ${P.weaponLv[id]} · +25% daño`, "--gold");
    save(); dirty = true; renderPanel(); return;
  }
  if (t.dataset.weapon){
    const w = WEAPONS[t.dataset.weapon];
    if (P.weapons[w.id]) P.weapon = w.id;
    else if (P.cash >= w.cost){ P.cash -= w.cost; P.weapons[w.id] = 1; P.weapon = w.id; note(`${w.name} comprada`, "--cash"); }
    else return note(`Faltan ${fmt(w.cost - P.cash)} de oro`, "--hp");
    save(); dirty = true; renderPanel(); return;
  }
  if (t.dataset.ring){
    const idx = +t.dataset.ring, isle = ISLANDS[idx];
    if (P.level < isle.level && !P.islands.includes(isle.id)) return note(`Requiere nivel ${isle.level}`, "--hp");
    const ang = Math.atan2(player.y - CFG.WORLD.cy, player.x - CFG.WORLD.cx) || 0;
    const r = ringRadius(idx);
    player.x = CFG.WORLD.cx + Math.cos(ang) * r;
    player.y = CFG.WORLD.cy + Math.sin(ang) * r;
    enemies = []; corpses = []; spawnT = 0;
    banner(isle.name.toUpperCase(), "#8fd0ff");
    save(); closePanel(); return;
  }
  if (t.dataset.hunter){
    const h = HUNTERS.find(x => x.id === t.dataset.hunter);
    if (!h) return;
    player.x = h.x + 70; player.y = h.y + 70;
    enemies = []; corpses = [];
    note(`Vas al encuentro de ${h.name}`, "--gem");
    closePanel(); return;
  }
  if (t.dataset.isle){
    const isle = isleOf(t.dataset.isle);
    if (P.level < isle.level) return note(`Requiere nivel ${isle.level}`, "--hp");
    P.island = isle.id;
    if (!P.islands.includes(isle.id)) P.islands.push(isle.id);
    enemies = []; corpses = []; spawnT = 0;
    banner(isle.name.toUpperCase(), "#8fd0ff"); save(); closePanel(); return;
  }
  if (t.dataset.dungeon){
    const id = t.dataset.dungeon;
    if (id !== "Standard"){
      if (P.tickets < 1) return note("Necesitas un ticket", "--hp");
      P.tickets--;
    }
    closePanel(); enterDungeon(id); return;
  }
  if (t.id === "do-arise"){
    const c = ariseToken; if (!c) return;
    const r = attemptArise(c);
    if (r.ok){
      note(`ARISE · ${r.shadow.name}${r.replaced ? " (reemplaza a la más débil)" : ""}`, "--arise");
      banner("ARISE", "#2fe4ff"); closeArise();
    } else if (r.code === "EXHAUSTED"){ note(`Sin intentos · +${fmt(r.gems)} gemas`, "--gem"); closeArise(); }
    else if (r.code === "FAILED") renderArise(`<span style="color:var(--hp)">Fallo.</span> Quedan ${r.attempts} intentos.`);
    else closeArise();
    return;
  }
  if (t.id === "do-destroy"){ destroyCorpse(ariseToken); closeArise(); }
});
$("qualityTag").onclick = () => {
  // auto -> alta -> media -> baja -> auto
  if (QUALITY.auto){ QUALITY.auto = false; QUALITY.level = 3; }
  else if (QUALITY.level > 1) QUALITY.level--;
  else { QUALITY.auto = true; QUALITY.level = 3; }
  applyQuality();
  note(`Calidad ${["", "baja", "media", "alta"][QUALITY.level]}${QUALITY.auto ? " (auto)" : ""}`, "--gem");
};
$("b-stats").onclick = () => openPanel("stats");
$("b-shadows").onclick = () => openPanel("shadows");
$("b-shop").onclick = () => openPanel("shop");
$("b-items").onclick = () => openPanel("items");
$("b-map").onclick = () => openPanel("map");
$("b-help").onclick = () => openPanel("help");
$("a-attack").onclick = requestAttack;
$("a-skill").onclick = requestSkill;
$("a-arise").onclick = openArise;
$("a-dash").onclick = requestDash;
$("a-mount").onclick = toggleMount;
$("a-portal").onclick = () => enterDungeon();
function setAuto(v){
  auto = v;
  const b = $("a-auto");
  b.classList.toggle("on", v);
  b.querySelector(".st").textContent = v ? "ON" : "OFF";
}
$("a-auto").onclick = () => setAuto(!auto);

/* ----------------------------- CAMPAÑA -----------------------------------
   Sigue el recorrido de la historia: de cazador de rango E en Seúl al trono
   del Rey de las Sombras. Cada capítulo fija un objetivo, lo anuncia el
   Sistema o un cazador, y al cerrarse da su recompensa.                    */
const CAMPAIGN = [
  { id:"weakest", title:"El cazador más débil de la humanidad",
    goal:"Sobrevive a tu primera cacería: derrota a 10 enemigos en Seúl",
    done:() => P.kills >= 10,
    speaker:"Woo Jinchul", dialog:"Rango E. Estadísticas de rango E. Y aun así sigues entrando en las puertas. Ten cuidado ahí dentro.",
    reward:() => { P.cash += 800; note("+800 de oro", "--cash"); } },
  { id:"double", title:"El Doble Dungeon",
    goal:"Camina hasta el templo del Doble Dungeon (segunda región al alejarte del centro)",
    done:() => ringAt(player.x, player.y) >= 2,
    speaker:"SISTEMA", dialog:"Has entrado en el templo. Las estatuas te observan. Recita los mandamientos o muere.",
    reward:() => { note("El templo reconoce tu presencia", "--arise"); } },
  { id:"system", title:"Has adquirido el Sistema",
    goal:"Alcanza el nivel 10 y reparte tus puntos de atributo",
    done:() => P.level >= 10 && P.stats.points === 0,
    speaker:"SISTEMA", dialog:"Has cumplido los requisitos para ser jugador. ¿Aceptas? La recompensa: la oportunidad de volverte más fuerte.",
    reward:() => { P.stats.points += 5; note("+5 puntos de atributo", "--gem"); } },
  { id:"class", title:"Cambio de clase · Monarca de las Sombras",
    goal:"Extrae tu primera sombra pulsando B sobre un cuerpo",
    done:() => P.arisen >= 1,
    speaker:"SISTEMA", dialog:"Clase adquirida: Nigromante. Corrección… Monarca de las Sombras. Ahora tus enemigos caídos te siguen.",
    reward:() => { P.gems += 60; note("+60 gemas", "--gem"); } },
  { id:"army", title:"Un ejército propio",
    goal:"Forma un escuadrón de 6 sombras",
    done:() => P.squad.length >= 6,
    speaker:"Yoo Jinho", dialog:"¡Jefe, esto ya no es un equipo, es un ejército! ¿De dónde saca usted a tanta gente?",
    reward:() => { P.cash += 25000; note("+25.000 de oro", "--cash"); } },
  { id:"igris", title:"Igris, el Caballero Sangriento",
    goal:"Derrota a la Estatua de Dios en una mazmorra y extrae a Igris",
    done:() => !!P.index.Igris,
    speaker:"SISTEMA", dialog:"El caballero se arrodilla ante ti. Tu primer mariscal.",
    reward:() => { P.tickets += 3; note("+3 tickets de puerta", "--ticket"); } },
  { id:"orcs", title:"Los Altos Orcos",
    goal:"Llega a la Isla de los Altos Orcos y derrota a Baruka",
    done:() => !!P.index.Baruka,
    speaker:"Baek Yoonho", dialog:"Vi lo que hiciste con esos orcos. Nadie de rango S pelea así. ¿Qué eres exactamente?",
    reward:() => { P.gems += 4000; note("+4.000 gemas", "--gem"); } },
  { id:"jeju", title:"La incursión de la Isla Jeju",
    goal:"Cruza hasta Isla Jeju y arrebátale al Rey Hormiga su sombra",
    done:() => !!P.index.Beru,
    speaker:"Cha Hae-In", dialog:"Todos los gremios juntos no pudieron con la isla. Tú entraste solo. Quiero luchar a tu lado.",
    reward:() => { P.cash += 5e8; note("Recompensa de la Asociación", "--cash"); } },
  { id:"kamish", title:"La sombra del dragón",
    goal:"Alcanza el Castillo del Demonio y vence a Kamish",
    done:() => !!P.index.Kamish,
    speaker:"Choi Jong-In", dialog:"Kamish mató a cuatro cazadores de rango nacional. Tú lo traes de vuelta como soldado.",
    reward:() => { P.gems += 2e6; note("+2M gemas", "--gem"); } },
  { id:"monarchs", title:"La guerra de los Monarcas",
    goal:"Llega al Trono del Rey de las Sombras y derrota a Antares",
    done:() => !!P.index.Antares || !!P.index.Ashborn,
    speaker:"SISTEMA", dialog:"El Rey de las Sombras despierta. Levántate. Este mundo aún te necesita.",
    reward:() => { P.title = "Rey de las Sombras"; banner("REY DE LAS SOMBRAS", "#bb8cff"); } },
];
function currentChapter(){ return CAMPAIGN[P.chapter] || null; }
function checkCampaign(){
  const dlg = document.getElementById("dialog");
  if (dlg && !dlg.hidden) return;          // deja leer el capítulo anterior
  const ch = currentChapter();
  if (!ch || !ch.done()) return;
  P.chapter++;
  ch.reward?.();
  showDialog(ch.speaker, ch.dialog, ch.title);
  save(); dirty = true;
}
function showDialog(speaker, text, title){
  const box = document.getElementById("dialog");
  const isSystem = speaker === "SISTEMA";
  box.className = isSystem ? "system" : "";
  box.innerHTML = `<div class="who">${speaker}</div>
    ${title ? `<div class="chapter">${title}</div>` : ""}
    <p>${text}</p><button class="btn" id="dlg-ok">Continuar</button>`;
  box.hidden = false;
  document.getElementById("dlg-ok").onclick = () => { box.hidden = true; };
  clearTimeout(showDialog._t);
  showDialog._t = setTimeout(() => { box.hidden = true; }, 12000);
}

/* ------------------------ objetivo guiado (tutorial) ---------------------- */
// En móvil los controles son otros, así que el tutorial cambia de texto.
// En móvil los controles son otros, así que el tutorial cambia de texto.
const TOUCH = (matchMedia && matchMedia("(pointer:coarse)").matches) || navigator.maxTouchPoints > 0;
// Ocho pasos en vez de tres: el juego tiene demasiados sistemas como para
// soltarte después de la primera extracción.
const TUTORIAL = (TOUCH ? [
  { id:"move",  text:"Arrastra en la <b>mitad izquierda</b> para moverte y en la <b>derecha</b> para girar la cámara",
    done: () => tutState.moved > 120 },
  { id:"fight", text:"Acércate a un enemigo y toca <b>GOLPE</b> (mantén pulsado para encadenar el combo)",
    done: () => P.kills >= 1 },
  { id:"arise", text:"Ponte sobre el cuerpo que deja y toca <b>ARISE</b> para extraer su sombra",
    done: () => P.arisen >= 1 },
  { id:"dash",  text:"Toca <b>DASH</b> para esquivar: eres invulnerable mientras dura",
    done: () => tutState.dashed },
  { id:"skill", text:"Toca <b>ARMA</b> para lanzar la onda de tu arma: cuesta 30 de maná",
    done: () => tutState.skilled },
] : [
  { id:"move",  text:"Muévete con <b>W A S D</b> y gira la cámara arrastrando el ratón",
    done: () => tutState.moved > 120 },
  { id:"fight", text:"Acércate a un enemigo y golpéalo con el <b>clic izquierdo</b> (mantenlo para encadenar el combo)",
    done: () => P.kills >= 1 },
  { id:"arise", text:"Ponte sobre el cuerpo que deja y pulsa <b>B</b> para extraer su sombra",
    done: () => P.arisen >= 1 },
  { id:"dash",  text:"Pulsa <b>Q</b> para esquivar: eres invulnerable mientras dura el impulso",
    done: () => tutState.dashed },
  { id:"skill", text:"Pulsa <b>V</b> para lanzar la onda de tu arma: cuesta 30 de maná",
    done: () => tutState.skilled },
]).concat([
  { id:"stats",  text:"Has ganado puntos al subir de nivel: abre <b>Atributos</b> y repártelos",
    done: () => P.stats.points === 0 && P.level >= 2 },
  { id:"squad",  text:"Reúne <b>3 sombras</b> en tu escuadrón: pelean solas y siguen tus objetivos",
    done: () => P.squad.length >= 3 },
  { id:"shop",   text:"Abre la <b>Armería</b> y compra el arma siguiente: el daño base manda",
    done: () => Object.keys(P.weapons).length >= 2 },
  { id:"hunter", text:"Busca a <b>Woo Jinchul</b> en el mapa y habla con él para un encargo",
    done: () => !!P.quests.active || P.quests.done > 0 },
  { id:"region", text:"Aléjate del centro para llegar a la <b>región siguiente</b>: más nivel, mejores sombras",
    done: () => ringAt(player.x, player.y) >= 1 },
  { id:"portal", text:"Cuando se abra un <b>portal</b>, entra: las mazmorras dan las mejores sombras",
    done: () => P.dungeonsCleared >= 1 || tutState.entered },
]);
const tutState = { moved:0, lastX:0, lastY:0, dashed:false, skilled:false, entered:false };
function tutorialStep(){
  if (P.tutorial >= TUTORIAL.length) return null;
  return TUTORIAL[P.tutorial];
}
function updateObjective(dt){
  const el = $("objective");
  const step = tutorialStep();
  if (step){
    if (step.done()){
      P.tutorial++;
      save();
      const next = tutorialStep();
      banner(next ? "SIGUIENTE PASO" : "¡LISTO!", "#5ce8a6");
      if (!next) note("Tutorial completado · suerte, cazador", "--xp");
    }
    const cur = tutorialStep();
    if (cur){
      el.hidden = false;
      el.innerHTML = `<span class="step">Paso ${P.tutorial + 1}/${TUTORIAL.length}</span> ${cur.text}`;
      return;
    }
  }
  const ch = currentChapter();
  if (ch){
    el.hidden = false;
    el.innerHTML = `<span class="step">Capítulo ${P.chapter + 1}</span> ${ch.goal}`;
    return;
  }
  const q = P.quests.active;
  if (q){
    el.hidden = false;
    el.innerHTML = `<span class="step">Encargo</span> ${q.text} · <b>${Math.min(questProgress(), q.goal)}/${q.goal}</b>`;
  } else if (portal){
    el.hidden = false;
    el.innerHTML = `<span class="step">Evento</span> Portal <b>${portal.mode.name}</b> abierto · pulsa <b>F</b> dentro del círculo`;
  } else {
    el.hidden = false;
    const nx = distanceToNextRegion();
    el.innerHTML = nx
      ? `<span class="step">Rumbo</span> ${nx.next.name} a <b>${Math.round(nx.dist)} m</b> · habla con Woo Jinchul para un encargo`
      : `<span class="step">Rumbo</span> Has llegado al confín del mundo`;
  }
}

/* -------------------------------- minimapa -------------------------------- */
const mini = { cv:null, ctx:null, t:0 };
function drawMinimap(dt){
  if (!mini.cv){
    mini.cv = document.getElementById("minimap");
    if (!mini.cv) return;
    mini.ctx = mini.cv.getContext("2d");
  }
  mini.t -= dt;
  if (mini.t > 0) return;
  mini.t = 0.1;
  const c = mini.ctx, R = 75, scale = 0.055;      // 1 px ≈ 18 unidades
  c.clearRect(0, 0, 150, 150);
  c.save();
  c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI*2); c.clip();
  const th = themeNow();
  c.fillStyle = th.g2; c.globalAlpha = .5; c.fillRect(0, 0, 150, 150); c.globalAlpha = 1;
  // anillo de la región siguiente
  const idx = ringAt(player.x, player.y);
  const dc = Math.hypot(player.x - CFG.WORLD.cx, player.y - CFG.WORLD.cy);
  const ringPx = ((idx + 1) * CFG.RING_WIDTH - dc) * scale;
  if (ringPx < R * 1.6){
    const ang = Math.atan2(CFG.WORLD.cy - player.y, CFG.WORLD.cx - player.x);
    c.strokeStyle = "rgba(143,208,255,.65)"; c.lineWidth = 2; c.setLineDash([5, 5]);
    c.beginPath();
    c.arc(R - Math.cos(ang) * (dc * scale), R - Math.sin(ang) * (dc * scale),
          Math.max(4, (idx + 1) * CFG.RING_WIDTH * scale), 0, Math.PI*2);
    c.stroke(); c.setLineDash([]);
  }
  const put = (x, y, color, size) => {
    const dx = (x - player.x) * scale, dy = (y - player.y) * scale;
    if (Math.hypot(dx, dy) > R - 4) return;
    c.fillStyle = color;
    c.beginPath(); c.arc(R + dx, R + dy, size, 0, Math.PI*2); c.fill();
  };
  for (const e of enemies) put(e.x, e.y, e.boss ? "#ffd24a" : "#ff5d6c", e.boss ? 4.5 : 2.6);
  for (const sh of shadows) put(sh.x, sh.y, "#6aa8ff", 2.4);
  for (const co of corpses) put(co.x, co.y, "#31e4ff", 2.6);
  for (const h of HUNTERS) put(h.x, h.y, "#ffe9a8", 3.4);

  if (portal) put(portal.x, portal.y, portal.mode.color, 5);
  // jugador con su orientación
  c.save();
  c.translate(R, R); c.rotate(player.yaw);
  c.fillStyle = "#ffffff";
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2); c.lineTo(-5, 5); c.closePath(); c.fill();
  c.restore();
  c.restore();
  // norte
  c.fillStyle = "rgba(200,220,255,.7)"; c.font = "600 10px Fredoka, sans-serif"; c.textAlign = "center";
  c.fillText("N", R, 13);
  const reg = document.getElementById("mapregion");
  if (reg) reg.textContent = dungeon ? dungeon.mode.name : regionAt(player.x, player.y).name;
}

/* -------------------------------- arranque -------------------------------- */
function start(restored){
  if (restored?.profile) P = reconcile(restored.profile);
  if (P.pos && isFinite(P.pos.x) && isFinite(P.pos.y)){
    player.x = P.pos.x; player.y = P.pos.y;
    P.island = regionAt(player.x, player.y).id;
    cam.x = player.x; cam.y = player.y;
  }
  player.hp = restored?.hp ?? maxHP();
  player.mana = maxMana();
  if (!THREE_OK){
    console.error("El motor 3D no está disponible");
    document.getElementById("app").insertAdjacentHTML("beforeend",
      '<div class="scrim"><div class="panel"><div class="body"><h2>No se pudo cargar el motor 3D</h2>' +
      '<p class="hint">Recarga la página: la librería de render no llegó a tiempo.</p></div></div></div>');
    return;
  }
  initScene();
  rebuildSquad(); resize(); syncHud();
  paused = true;
  const startEl = document.getElementById("startScreen");
  const soundEl = document.getElementById("soundTag");
  SFX.setMuted(!!P.muted);
  const paintSound = () => { if (soundEl) soundEl.textContent = `Sonido: ${SFX.muted ? "off" : "on"}`; };
  paintSound();
  if (soundEl) soundEl.onclick = () => {
    SFX.init(); SFX.setMuted(!SFX.muted); P.muted = SFX.muted; save(); paintSound();
    if (!SFX.muted) SFX.ui();
  };
  document.getElementById("btn-play").onclick = () => {
    SFX.init();                         // el navegador exige un gesto del jugador
    SFX.setMuted(!!P.muted); paintSound();
    SFX.ui();
    startEl.style.display = "none";
    paused = false;
    if (P.chapter === 0 && P.kills === 0){
      showDialog("SISTEMA", "Seúl, año 2026. Las puertas siguen abriéndose y alguien tiene que entrar. Eres el cazador más débil de la humanidad… por ahora.", "Capítulo 1");
    }
  };
  let last = performance.now(), hudT = 0, fpsT = 0, frames = 0;
  function frame(t){
    const dt = Math.min((t - last)/1000, 0.1); last = t;   // con pocos fps el juego iba a cámara lenta
    if (!document.hidden && !paused){
      update(dt);
      render(dt);
      frames++; fpsT += dt;
      if (fpsT >= 1){ $("fps").textContent = `${Math.round(frames/fpsT)} FPS`; frames = 0; fpsT = 0; }
      hudT += dt;
      if (hudT > 0.1 || dirty){ syncHud(); hudT = 0; dirty = false; }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
window.claude?.hot?.snapshot?.(() => ({ profile:P, hp:player.hp }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? null);
addEventListener("beforeunload", save);


  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    for (const [type, fn] of listeners) window.removeEventListener(type, fn);
    try { renderer && renderer.dispose(); } catch {}
  };
}
