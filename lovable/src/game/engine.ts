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
  // mundo ampliado: cada región mide 2400 de ancho (antes 1400)
  WORLD:{ w:64000, h:64000, cx:32000, cy:32000 },
  RING_WIDTH:2400, RING_SAFE:120,
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

/* Rango de cada enemigo, de E a S, tirado al aparecer. Cuanto más alto, más
   vida y daño, más botín, más difícil de extraer y más fuerte su sombra. Las
   probabilidades suman 1; la suerte de Arise desplaza un poco hacia arriba. */
const MOB_RANKS = [
  { r:"E",   p:.47,    hp:1,   dmg:1,    loot:1,   sh:1,    arise:1,   col:"#9aa6b8" },
  { r:"D",   p:.30,    hp:1.7, dmg:1.25, loot:1.7, sh:1.4,  arise:.92, col:"#7ee07a" },
  { r:"C",   p:.15,    hp:2.8, dmg:1.55, loot:2.8, sh:2,    arise:.82, col:"#5ad2ff" },
  { r:"B",   p:.055,   hp:4.5, dmg:1.9,  loot:4.5, sh:3,    arise:.7,  col:"#bb8cff" },
  { r:"A",   p:.0139,  hp:7.5, dmg:2.4,  loot:8,   sh:4.6,  arise:.56, col:"#ffd24a" },
  { r:"S",   p:.01,    hp:14,  dmg:3.2,  loot:18,  sh:8,    arise:.42, col:"#ff5d6c" },
  // los dos rangos míticos: rarísimos, durísimos y con premio enorme
  { r:"SS",  p:.001,   hp:40,  dmg:4.6,  loot:80,  sh:22,   arise:.3,  col:"#ff3af0", myth:true },
  { r:"SSS", p:.0001,  hp:120, dmg:6.5,  loot:400, sh:70,   arise:.2,  col:"#fff27a", myth:true },
];
const mobRank = r => MOB_RANKS.find(x => x.r === r) || MOB_RANKS[0];
const pctTxt = p => { const v = p * 100; return (v >= 1 ? +v.toFixed(1) : v >= .1 ? v.toFixed(1) : v.toFixed(2)).toString().replace(".", ",") + "%"; };
const rankIdxOf = r => Math.max(0, MOB_RANKS.findIndex(m => m.r === (r || "E")));
function rollMobRank(){
  // la suerte solo mueve probabilidad de E hacia D–A; S, SS y SSS no se tocan
  const luck = clamp((typeof ariseLuck === "function" ? ariseLuck() : 0) / 100, 0, 1);
  const w = MOB_RANKS.map((m, i) => i === 0 ? m.p * (1 - luck * .3) : i <= 4 ? m.p * (1 + luck * .3 * (MOB_RANKS[0].p / .47) * (i / 4)) : m.p);
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++){ x -= w[i]; if (x <= 0) return MOB_RANKS[i].r; }
  return "E";
}
const TIER_ORDER_BASE = ["C", "B", "A", "S", "S Elite", "Monarch"];
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
/* Kit de cada arma: modelo, color, habilidad propia (tecla V) y pasiva al
   golpear. Ninguna comparte la misma combinación. */
const WEAPON_KIT = {
  HunterKnife:   { kind:"dagger",  color:"#cfd6e0",             skill:"estocada",  sname:"Puñalada veloz",         passive:"crit",      pv:.08 },
  SteelShort:    { kind:"sword",   color:"#dfe6f2",             skill:"tajo",      sname:"Tajo de acero",          passive:"bleed",     pv:.3 },
  KasakaFang:    { kind:"dagger",  color:"#9dff6a", glow:true,  skill:"veneno",    sname:"Mordida de Kasaka",      passive:"poison",    pv:.15 },
  IronMace:      { kind:"hammer",  color:"#8a9098",             skill:"terremoto", sname:"Golpe sísmico",          passive:"stun",      pv:.12 },
  TempleBlade:   { kind:"sword",   color:"#ffe39a", glow:true,  skill:"tajo",      sname:"Juicio del Templo",      passive:"holy",      pv:.25, big:true },
  GuardianAxe:   { kind:"axe",     color:"#b8a888",             skill:"torbellino",sname:"Remolino del Guardián",  passive:"lifesteal", pv:.012 },
  KnightKiller:  { kind:"sword",   color:"#c8d0dc",             skill:"iaido",     sname:"Ejecución",              passive:"execute",   pv:1 },
  RedKnightSword:{ kind:"greatsword", color:"#ff4a4a", glow:true, skill:"fuego",   sname:"Tajo carmesí",           passive:"burn",      pv:.4 },
  BarukaDagger:  { kind:"dagger",  color:"#7fb8ff", glow:true,  skill:"iaido",     sname:"Sombra de Baruka",       passive:"crit",      pv:.12 },
  KargalganAxe:  { kind:"axe",     color:"#b08cff", glow:true,  skill:"terremoto", sname:"Ira del Chamán",         passive:"chain",     pv:.25, chain:true },
  FrostSpear:    { kind:"spear",   color:"#9fe8ff", glow:true,  skill:"estocada",  sname:"Lanza de escarcha",      passive:"frost",     pv:.3, freeze:true },
  CrimsonBlade:  { kind:"sword",   color:"#ff3a5a", glow:true,  skill:"tajo",      sname:"Luna carmesí",           passive:"bleed",     pv:.45 },
  QueenStinger:  { kind:"dagger",  color:"#ffd24a", glow:true,  skill:"veneno",    sname:"Aguijón real",           passive:"poison",    pv:.25 },
  EliteBlade:    { kind:"sword",   color:"#8fff6a",             skill:"garra",     sname:"Frenesí de la Élite",    passive:"lifesteal", pv:.015 },
  ShinjukuKatana:{ kind:"katana",  color:"#eef2ff",             skill:"iaido",     sname:"Iaido de Shinjuku",      passive:"crit",      pv:.15 },
  DemonNaginata: { kind:"spear",   color:"#ff7a3a", glow:true,  skill:"torbellino",sname:"Danza demoníaca",        passive:"burn",      pv:.35, burn:true },
  BaranLongsword:{ kind:"greatsword", color:"#9fd8ff", glow:true, skill:"tajo",    sname:"Relámpago de Baran",     passive:"chain",     pv:.3, chain:true, big:true },
  KamishWrath:   { kind:"greatsword", color:"#ff8a2a", glow:true, skill:"meteoro", sname:"Aliento de Kamish",      passive:"burn",      pv:.5 },
  GlacialEdge:   { kind:"sword",   color:"#bff0ff", glow:true,  skill:"hielo",     sname:"Filo glacial",           passive:"frost",     pv:.35 },
  FrostScepter:  { kind:"staff",   color:"#8fe8ff", glow:true,  skill:"hielo",     sname:"Tormenta de escarcha",   passive:"frost",     pv:.4, big:true },
  MonarchClaw:   { kind:"claw",    color:"#ffb45a", glow:true,  skill:"garra",     sname:"Frenesí bestial",        passive:"lifesteal", pv:.02 },
  BeastMaul:     { kind:"hammer",  color:"#c07a3a",             skill:"terremoto", sname:"Rugido bestial",         passive:"stun",      pv:.2, big:true },
  ArchitectStaff:{ kind:"staff",   color:"#9fa8ff", glow:true,  skill:"meteoro",   sname:"Runa del Arquitecto",    passive:"chain",     pv:.35 },
  LivingRune:    { kind:"orb",     color:"#c9a8ff", glow:true,  skill:"meteoro",   sname:"Runas vivas",            passive:"execute",   pv:1, multi:3 },
  ShadowDaggers: { kind:"dagger",  color:"#b07cff", glow:true,  skill:"sombra",    sname:"Danza de sombras",       passive:"crit",      pv:.18 },
  AshbornBlade:  { kind:"greatsword", color:"#8a5aff", glow:true, skill:"sombra",  sname:"Juicio de Ashborn",      passive:"lifesteal", pv:.025, big:true },
};
const kitOf = id => WEAPON_KIT[id] || WEAPON_KIT.HunterKnife;
const SKILL_INFO = {
  estocada:  { cd:5,  mana:25, startup:.12, desc:"Te lanzas hacia delante y atraviesas a todo lo que hay en la línea" },
  tajo:      { cd:6,  mana:30, startup:.2,  desc:"Onda cortante en arco delante de ti" },
  torbellino:{ cd:8,  mana:35, startup:.1,  desc:"Giras con el arma durante medio segundo golpeando a tu alrededor" },
  terremoto: { cd:9,  mana:40, startup:.3,  desc:"Saltas y golpeas el suelo: onda de choque que aturde" },
  veneno:    { cd:6,  mana:28, startup:.14, desc:"Nube tóxica en cono que envenena durante 4 s" },
  iaido:     { cd:8,  mana:35, startup:.1,  desc:"Cinco cortes relámpago saltando entre los enemigos cercanos" },
  fuego:     { cd:7,  mana:32, startup:.18, desc:"Llamarada en cono que deja a los enemigos ardiendo" },
  hielo:     { cd:9,  mana:40, startup:.2,  desc:"Nova de hielo que congela a todo lo que te rodea" },
  meteoro:   { cd:9,  mana:42, startup:.25, desc:"Invocas un impacto que cae sobre el enemigo más cercano" },
  garra:     { cd:7,  mana:30, startup:.08, desc:"Seis zarpazos seguidos que te curan un poco" },
  sombra:    { cd:12, mana:50, startup:.3,  desc:"Anillo de dagas de sombra; tus sombras pegan +30% durante 8 s" },
};
const PASSIVE_INFO = {
  crit:"Más probabilidad de crítico", bleed:"Los golpes pueden hacer sangrar", poison:"Envenena en cada golpe",
  stun:"Puede aturdir al golpear", holy:"Daño extra contra jefes", lifesteal:"Cada golpe te cura",
  execute:"Doble daño a enemigos con poca vida", burn:"Puede prender fuego", chain:"El golpe puede saltar a otros dos enemigos",
  frost:"Ralentiza a los enemigos",
};

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
/* Una sombra por cada enemigo: el común y el bruto de cada región dan su
   propia sombra, con la forma de ese enemigo hecha de oscuridad; el jefe sigue
   dando su sombra con nombre (Igris, Beru, Kaisel…). */
const MOB_SHADOW_TIER = ["C", "C", "B", "B", "A", "A", "A", "S", "S", "S", "S Elite", "S Elite", "Monarch"];
ISLANDS.forEach((isle, i) => {
  const base = SHADOWS[isle.shadow] || SHADOWS.Soldier;
  for (const [k, src, mult] of [["n", isle.enemy, 1], ["b", isle.brute, 1.6]]){
    const tierI = Math.min(5, TIER_ORDER_BASE.indexOf(MOB_SHADOW_TIER[i]) + (k === "b" ? 1 : 0));
    SHADOWS[`${isle.id}_${k}`] = {
      id:`${isle.id}_${k}`, name:`${src.name} sombrío`, tier:TIER_ORDER_BASE[tierI],
      dmg: base.dmg * mult, hp: base.hp * mult, rate: Math.max(.05, (.5 - i * .03) * (k === "b" ? .6 : 1)),
      gems: Math.ceil(base.gems * mult), glyph: k === "b" ? "💠" : "🌑", mob:{ isle:isle.id, brute:k === "b" },
    };
  }
});
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

// Poder único de cada reliquia, además de su bono pasivo.
const RELIC_POWER = {
  ClawboundRing:"Cada 12 golpes, una garra demoníaca estalla alrededor del objetivo",
  SilentVeil:   "Tras un dash eres invisible 1,5 s y tu siguiente golpe es crítico",
  InkOfDepth:   "Los enemigos que matas dejan un charco de tinta que sigue dañando",
  FlickerCrest: "10% al golpear: nova de fuego que quema",
  PulseEmblem:  "Cada 8 s emites un pulso del Sistema que daña a tu alrededor",
  NenCore:      "Con menos del 30% de vida, escudo que absorbe la mitad del daño (30 s de recarga)",
  BlackMonarch: "Cada ARISE logrado te cura un 20% y te da +30% de daño durante 5 s",
  EyeAscension: "Cada crítico te devuelve 5 de maná",
};
let relicHits = 0, pulseT = 8;
function relicOnHit(e, dmg){
  relicHits++;
  if (P.relics.ClawboundRing && relicHits % 12 === 0){
    hitCircle(e.x, e.y, 140, baseDamage() * 3); ring(e.x, e.y, 140, "#ff3a5a", .5, 20); burst(e.x, e.y, 18, "#ff3a5a", 40);
  }
  if (P.relics.FlickerCrest && Math.random() < .1){
    hitCircle(e.x, e.y, 120, dmg * 1.5, o => addDot(o, "burn", dmg * .3, 3)); ring(e.x, e.y, 120, "#ff8a2a", .45, 10);
  }
}
function relicOnKill(e){
  if (!P.relics.InkOfDepth) return;
  const x = e.x, y = e.y;
  for (let i = 0; i < 3; i++) later(.4 + i * .5, () => { hitCircle(x, y, 90, baseDamage() * .8); ring(x, y, 90, "#1a1030", .5, 3); });
}
function relicOnArise(){
  if (!P.relics.BlackMonarch) return;
  player.hp = Math.min(maxHP(), player.hp + maxHP() * .2); player.dmgBuffUntil = now() + 5;
  note("Sigilo del Monarca: +30% de daño", "--monarch");
}
function relicTick(dt){
  if (!P.relics.PulseEmblem || player.dead > 0) return;
  pulseT -= dt;
  if (pulseT <= 0){ pulseT = 8; if (enemies.length){ hitCircle(player.x, player.y, 220, baseDamage() * 1.5); ring(player.x, player.y, 220, "#6ef0ff", .6); } }
}
/* ------------------------------- runas ----------------------------------- */
const RUNES = {
  Health:{ id:"Health", name:"Runa de Salud", desc:"Vida enemiga −5%", glyph:"❤" },
  Gems:  { id:"Gems",   name:"Runa de Gemas", desc:"Gemas +10%",       glyph:"💎" },
  Time:  { id:"Time",   name:"Runa de Tiempo",desc:"Temporizador +60s",glyph:"⏱" },
  Cash:  { id:"Cash",   name:"Runa de Oro",   desc:"Oro +10%",         glyph:"💵" },
  // épicas: cada copia da un bono permanente (hasta 10)
  Void:     { id:"Void",     name:"Runa del Vacío",     desc:"+5% de daño por copia (máx. 10)", glyph:"🕳", rar:"epica" },
  Eternity: { id:"Eternity", name:"Runa de la Eternidad",desc:"+5% de gemas por copia (máx. 10)", glyph:"♾", rar:"epica" },
  // legendarias y mítica: rarísimas y muy fuertes
  Greed:    { id:"Greed",    name:"Runa de la Codicia",  desc:"+40% de oro y gemas por copia (máx. 3)", glyph:"💰", rar:"legend" },
  Chrono:   { id:"Chrono",   name:"Runa del Tiempo Roto",desc:"−15% de recarga de habilidad por copia (máx. 3)", glyph:"⌛", rar:"legend" },
  Monarch:  { id:"Monarch",  name:"Runa del Monarca",    desc:"+30% de daño y +30% de vida por copia (máx. 3)", glyph:"👁", rar:"mitica" },
};
for (const k of ["Health", "Gems", "Time", "Cash"]) RUNES[k].rar = "comun";
const RUNE_RARITY = { comun:{ name:"Común", col:"#b9c9e8" }, epica:{ name:"Épica", col:"#bb8cff" },
                      legend:{ name:"Legendaria", col:"#ffd24a" }, mitica:{ name:"Mítica", col:"#ff3af0" } };
/* Tirada de runa: se llama solo cuando ya ha tocado dar una (y eso es raro).
   Dentro, lo normal es una común; las buenas casi nunca. `tier` sube el
   techo: 0 = solo comunes, 1 = hasta épicas, 2 = hasta legendarias,
   3 = hasta la mítica. */
function rollRune(tier){
  const x = Math.random();
  let pool;
  if (tier >= 3 && x < .01) pool = ["Monarch"];
  else if (tier >= 2 && x < .06) pool = ["Greed", "Chrono"];
  else if (tier >= 1 && x < .22) pool = ["Void", "Eternity"];
  else pool = ["Health", "Gems", "Cash", "Time"];
  const r = pool[Math.floor(Math.random() * pool.length)];
  P.runes[r] = (P.runes[r] || 0) + 1;
  const R = RUNE_RARITY[RUNES[r].rar];
  if (RUNES[r].rar !== "comun") banner(`RUNA ${R.name.toUpperCase()}: ${RUNES[r].name.toUpperCase()}`, R.col);
  return r;
}
const runeN = (id, max) => Math.min(max, P.runes?.[id] || 0);

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
/* 20 clases ordenadas por rareza. No se eligen: salen de la ruleta de clases
   (los giros solo se consiguen con códigos). Las que ya tienes se pueden
   cambiar cuando quieras. La mejor, Monarca de las Sombras, sale un 0,5%. */
const CLASS_RARITY = {
  comun:     { name:"Común",      col:"#b9c9e8" },
  pococomun: { name:"Poco común", col:"#7ee07a" },
  raro:      { name:"Rara",       col:"#5ad2ff" },
  epico:     { name:"Épica",      col:"#bb8cff" },
  legend:    { name:"Legendaria", col:"#ffd24a" },
  mitico:    { name:"Mítica",     col:"#ff3af0" },
};
const CLASSES = {
  Novice:   { id:"Novice",   name:"Novato",          rar:"comun",     p:12,  glyph:"🔰", bonus:{ dmg:0.05, hp:0.05 },                         desc:"+5% daño y +5% vida." },
  Warrior:  { id:"Warrior",  name:"Guerrero",        rar:"comun",     p:10,  glyph:"🛡", bonus:{ dmg:0.15, hp:0.20 },                         desc:"+15% daño y +20% vida." },
  Scout:    { id:"Scout",    name:"Explorador",      rar:"comun",     p:9,   glyph:"🧭", bonus:{ speed:0.20, crit:0.05 },                     desc:"+20% velocidad y +5% crítico." },
  Healer:   { id:"Healer",   name:"Sanador",         rar:"comun",     p:9,   glyph:"✚", bonus:{ hp:0.30, mana:0.30 },                        desc:"+30% vida y +30% maná." },
  Mage:     { id:"Mage",     name:"Mago",            rar:"comun",     p:8,   glyph:"🪄", bonus:{ skill:0.50, mana:0.40 },                     desc:"+50% daño de habilidad y +40% maná." },
  Assassin: { id:"Assassin", name:"Asesino",         rar:"pococomun", p:7,   glyph:"🗡", bonus:{ crit:0.15, speed:0.20, dmg:0.05 },           desc:"+15% crítico, +20% velocidad y +5% daño." },
  Tank:     { id:"Tank",     name:"Tanque",          rar:"pococomun", p:7,   glyph:"🧱", bonus:{ hp:0.70, armor:0.35 },                       desc:"+70% vida y −35% daño recibido." },
  Berserker:{ id:"Berserker",name:"Berserker",       rar:"pococomun", p:6,   glyph:"🪓", bonus:{ dmg:0.35, armor:-0.10 },                     desc:"+35% daño, pero recibes un 10% más." },
  Summoner: { id:"Summoner", name:"Invocador",       rar:"pococomun", p:5.5, glyph:"🌀", bonus:{ shadow:0.35, luck:0.05 },                    desc:"+35% daño de sombras y +5% suerte Arise." },
  Knight:   { id:"Knight",   name:"Caballero",       rar:"pococomun", p:4.5, glyph:"⚜", bonus:{ hp:0.40, armor:0.20, dmg:0.10 },            desc:"+40% vida, −20% daño recibido y +10% daño." },
  Wind:     { id:"Wind",     name:"Espada del Viento",rar:"raro",     p:4,   glyph:"🌪", bonus:{ dmg:0.30, speed:0.25, crit:0.08 },           desc:"+30% daño, +25% velocidad y +8% crítico." },
  IceMage:  { id:"IceMage",  name:"Mago de Hielo",   rar:"raro",      p:3.5, glyph:"❄", bonus:{ skill:0.90, mana:0.50, armor:0.10 },          desc:"+90% habilidad, +50% maná y −10% daño recibido." },
  Slayer:   { id:"Slayer",   name:"Cazadragones",    rar:"raro",      p:3,   glyph:"🐲", bonus:{ dmg:0.45, hp:0.25 },                         desc:"+45% daño y +25% vida." },
  Paladin:  { id:"Paladin",  name:"Paladín",         rar:"raro",      p:2.5, glyph:"🔆", bonus:{ hp:0.80, armor:0.30, dmg:0.15 },            desc:"+80% vida, −30% daño recibido y +15% daño." },
  Necro:    { id:"Necro",    name:"Nigromante",      rar:"raro",      p:2,   glyph:"💀", bonus:{ shadow:0.70, luck:0.10 },                    desc:"+70% daño de sombras y +10% suerte Arise." },
  WeaponMaster:{ id:"WeaponMaster", name:"Maestro de Armas", rar:"epico", p:2, glyph:"⚔", bonus:{ dmg:0.70, crit:0.15, speed:0.15 },    desc:"+70% daño, +15% crítico y +15% velocidad." },
  Archmage: { id:"Archmage", name:"Archimago",       rar:"epico",     p:1.5, glyph:"🔮", bonus:{ skill:1.40, mana:1.00, dmg:0.15 },           desc:"+140% habilidad, +100% maná y +15% daño." },
  Warlord:  { id:"Warlord",  name:"Señor de la Guerra",rar:"epico",   p:1.1, glyph:"🏴", bonus:{ dmg:0.60, hp:0.60, armor:0.25 },            desc:"+60% daño, +60% vida y −25% daño recibido." },
  Monarch:  { id:"Monarch",  name:"Monarca",         rar:"legend",    p:1.9, glyph:"👑", bonus:{ shadow:0.80, luck:0.20, dmg:0.30 },           desc:"+80% sombras, +20% suerte Arise y +30% daño." },
  ShadowMonarch:{ id:"ShadowMonarch", name:"Monarca de las Sombras", rar:"mitico", p:0.5, glyph:"🌑",
    bonus:{ dmg:0.80, hp:0.50, shadow:1.20, luck:0.30, crit:0.15, speed:0.20, skill:0.50, armor:0.20 },
    desc:"La mejor clase: +80% daño, +50% vida, +120% sombras, +30% suerte, +15% crítico, +20% velocidad, +50% habilidad y −20% daño recibido." },
};
function rollClass(){
  let x = Math.random() * Object.values(CLASSES).reduce((a, c) => a + c.p, 0);
  for (const c of Object.values(CLASSES)){ x -= c.p; if (x <= 0) return c.id; }
  return "Novice";
}
const TALENTS = {
  power:   { id:"power",   name:"Poder",      desc:"+8% de daño por nivel",            max:10, cost:lv => 250 * Math.pow(2, lv) },
  haste:   { id:"haste",   name:"Celeridad",  desc:"+6% de velocidad de ataque",       max:10, cost:lv => 300 * Math.pow(2, lv) },
  crit:    { id:"crit",    name:"Crítico",    desc:"+3% de probabilidad crítica",      max:10, cost:lv => 400 * Math.pow(2, lv) },
  legion:  { id:"legion",  name:"Legión",     desc:"+15% de daño de sombras",          max:10, cost:lv => 350 * Math.pow(2, lv) },
  fortune: { id:"fortune", name:"Fortuna",    desc:"+12% de suerte de extracción",     max:10, cost:lv => 500 * Math.pow(2, lv) },
  vigor:   { id:"vigor",   name:"Vigor",      desc:"+10% de vida máxima",              max:10, cost:lv => 300 * Math.pow(2, lv) },
};
// Diez códigos (20 giros en total). Dan sobre todo giros de la ruleta de clases y un empujón
// pequeño de recursos; ninguno rompe la progresión.
const CODES = {
  ARISE:   { cash:2000,  gems:20,  tickets:1, spins:2 },
  SOMBRAS: { cash:0,     gems:50,  tickets:0, spins:1 },
  MONARCA: { cash:0,     gems:0,   tickets:0, spins:3 },
  IGRIS:   { cash:5000,  gems:0,   tickets:1, spins:1 },
  RULETA:  { cash:0,     gems:0,   tickets:0, spins:2 },
  // códigos de lanzamiento: entre todos suman 20 giros
  RELEASE:    { cash:10000, gems:100, tickets:1, spins:3 },
  UPDATE10:   { cash:0,     gems:80,  tickets:0, spins:2 },
  GRACIAS:    { cash:3000,  gems:30,  tickets:0, spins:2 },
  LEVELUP:    { cash:0,     gems:0,   tickets:1, spins:2 },
  SHADOWARMY: { cash:0,     gems:60,  tickets:0, spins:2 },
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
/* ------------------------- aspecto del cazador ---------------------------
   Todo se desbloquea jugando: nivel, rango, bajas, Despertar o haber vencido a
   un enemigo SS / SSS. Los conjuntos de ropa dan además un pequeño bono. */
const LOOKS = {
  outfit: [
    { id:"shadowcoat", name:"Abrigo del Cazador de Sombras", c:{ shirt:"#eceae6", sleeve:"#15151a", pants:"#141418", boots:"#0f0f14", plate:"#15151a", trim:"#3a3a44" }, coat:true },
    { id:"hunter",  name:"Cazador",          c:{ shirt:"#23407e", sleeve:"#2d51a0", pants:"#2a3350", boots:"#1d2438", plate:"#3f6ac0", trim:"#8fc0ff" } },
    { id:"night",   name:"Noche",            need:{ level:25 },  bonus:{ spd:.04 }, c:{ shirt:"#1a1c2a", sleeve:"#242838", pants:"#14161f", boots:"#0e1018", plate:"#3a3f55", trim:"#9fb0ff" } },
    { id:"crimson", name:"Carmesí",          need:{ kills:2000 }, bonus:{ dmg:.07 }, c:{ shirt:"#5a1420", sleeve:"#6e1a28", pants:"#2a1418", boots:"#1a0c10", plate:"#8a2030", trim:"#ff7a8a" } },
    { id:"elite",   name:"Blanco de Élite",  need:{ rank:"B", level:150 }, bonus:{ hp:.1, dmg:.04 },  c:{ shirt:"#dfe6f2", sleeve:"#c8d2e2", pants:"#3a4258", boots:"#262c3a", plate:"#eef2fa", trim:"#6ef0ff" } },
    { id:"gold",    name:"Dorado de Rango S",need:{ rank:"S", kills:10000 }, bonus:{ dmg:.16, hp:.08 }, c:{ shirt:"#2a2418", sleeve:"#3a3020", pants:"#1e1a12", boots:"#14110c", plate:"#c9a33a", trim:"#ffe39a" } },
    { id:"monarch", name:"Monarca",          need:{ awakened:true, level:300 }, bonus:{ dmg:.25, hp:.12, spd:.04 }, c:{ shirt:"#0b0a16", sleeve:"#120f22", pants:"#0b0a16", boots:"#080714", plate:"#171233", trim:"#a86cff" } },
    { id:"legend",  name:"Leyenda SSS",      need:{ sss:3, level:600 }, bonus:{ dmg:.5, hp:.3, spd:.1 }, c:{ shirt:"#1a1408", sleeve:"#241c0c", pants:"#120e06", boots:"#0c0a04", plate:"#fff27a", trim:"#ffffff" } },
  ],
  armor: [
    { id:"light", name:"Arnés ligero" }, { id:"plate", name:"Placas", need:{ rank:"C" } },
    { id:"heavy", name:"Armadura pesada", need:{ rank:"A", level:250 }, bonus:{ hp:.08 } }, { id:"coat", name:"Abrigo largo", need:{ awakened:true, rank:"S" }, bonus:{ dmg:.06, spd:.03 } },
  ],
  hair: [
    { id:"messy", name:"Revuelto con flequillo" }, { id:"hood", name:"Capucha" }, { id:"short", name:"Corto" }, { id:"spiky", name:"En púas", need:{ level:30 } },
    { id:"long", name:"Largo", need:{ level:120 } },
  ],
  hairColor: [
    { id:"#121218", name:"Negro azabache" }, { id:"#15121f", name:"Negro" }, { id:"#5a3a1a", name:"Castaño", need:{ level:10 } }, { id:"#e8e8ec", name:"Blanco", need:{ level:400 } },
    { id:"#b0242e", name:"Rojo", need:{ kills:5000 } }, { id:"#7a4ae0", name:"Violeta", need:{ awakened:true, level:200 } },
  ],
  eyes: [
    { id:"#4a5a78", name:"Grises" }, { id:"#3aa8ff", name:"Azul brillante", glow:true },
    { id:"#c9a6ff", name:"Violeta del Monarca", need:{ awakened:true }, glow:true, bonus:{ dmg:.03 } }, { id:"#ff3a4a", name:"Rojo sangre", need:{ ss:3 }, glow:true, bonus:{ dmg:.08 } },
    { id:"#ffd24a", name:"Oro SSS", need:{ sss:2, level:500 }, glow:true, bonus:{ dmg:.15, hp:.05 } },
  ],
  cape: [
    { id:"none", name:"Sin capa" }, { id:"short", name:"Capa corta", need:{ rank:"D" } }, { id:"long", name:"Capa larga", need:{ rank:"A" }, bonus:{ hp:.04 } },
    { id:"shadow", name:"Capa de sombras", need:{ awakened:true, kills:20000 }, bonus:{ dmg:.08, hp:.06 } },
  ],
  aura: [
    { id:"none", name:"Sin aura" }, { id:"#4aa8ff", name:"Azul", need:{ level:120 } }, { id:"#a86cff", name:"Violeta", need:{ awakened:true, level:250 }, bonus:{ dmg:.05 } },
    { id:"#ff8a2a", name:"Fuego", need:{ ss:2 }, bonus:{ dmg:.1 } }, { id:"#ffd24a", name:"Dorada", need:{ rank:"S", kills:25000 }, bonus:{ dmg:.12, hp:.08 } }, { id:"#ffffff", name:"Luz SSS", need:{ sss:5, level:800 }, bonus:{ dmg:.4, hp:.25, spd:.08 } },
  ],
};
Object.assign(LOOKS, {
  skin: [
    { id:"#f0c9a0", name:"Clara (cazador)" }, { id:"#e8b98a", name:"Clara" }, { id:"#f5d0a9", name:"Muy clara" }, { id:"#c68e5e", name:"Morena" },
    { id:"#8d5a3a", name:"Oscura" }, { id:"#5a3a26", name:"Muy oscura" }, { id:"#c9d8f0", name:"Espectral", need:{ awakened:true } },
  ],
  height: [
    { id:"1.06", name:"Normal" }, { id:"0.98", name:"Bajo" }, { id:"1.14", name:"Alto", need:{ level:40 } },
    { id:"1.24", name:"Gigante", need:{ rank:"S" }, bonus:{ hp:.05 } },
  ],
  head: [
    { id:"none", name:"Nada" }, { id:"band", name:"Cinta", need:{ level:10 } }, { id:"mask", name:"Máscara", need:{ kills:3000 } },
    { id:"helm", name:"Yelmo", need:{ rank:"A" }, bonus:{ hp:.04 } }, { id:"horns", name:"Cuernos", need:{ ss:1 }, bonus:{ dmg:.04 } },
    { id:"crown", name:"Corona", need:{ rank:"S", level:500 }, bonus:{ dmg:.08 } },
  ],
  back: [
    { id:"none", name:"Nada" }, { id:"sword", name:"Espada a la espalda", need:{ level:50 } }, { id:"spikes", name:"Púas", need:{ rank:"B" } },
    { id:"wings", name:"Alas de sombra", need:{ awakened:true, level:200 }, bonus:{ spd:.05 } },
  ],
  weaponStyle: [
    { id:"auto", name:"El modelo de tu arma" }, { id:"monarchblade", name:"Espadón de hoja cian" },
  ],
  weaponGlow: [
    { id:"auto", name:"El de tu arma" }, { id:"#26e0ff", name:"Cian del Monarca" }, { id:"#6ef0ff", name:"Cian claro", need:{ level:20 } }, { id:"#ff3a4a", name:"Carmesí", need:{ kills:1500 } },
    { id:"#8fff6a", name:"Veneno", need:{ level:150 } }, { id:"#ffd24a", name:"Dorado", need:{ rank:"A" } }, { id:"#b07cff", name:"Sombra", need:{ awakened:true } },
  ],
});
const LOOK_CAT = { outfit:"Conjunto", armor:"Armadura", hair:"Peinado", hairColor:"Color de pelo", eyes:"Ojos", skin:"Piel",
                   height:"Altura", head:"Cabeza", back:"Espalda", weaponStyle:"Modelo del arma", weaponGlow:"Brillo del arma", cape:"Capa", aura:"Aura" };
// Aspecto de partida: el cazador de pelo negro revuelto, ojos azules,
// abrigo largo negro con capucha sobre camiseta blanca y el espadón cian.
const LOOK_DEFAULT = { outfit:"shadowcoat", armor:"light", hair:"messy", hairColor:"#121218", eyes:"#3aa8ff", cape:"none", aura:"none",
                       skin:"#f0c9a0", height:"1.06", head:"none", back:"none", weaponStyle:"monarchblade", weaponGlow:"#26e0ff" };
function needMet(n){
  if (!n) return true;
  if (n.level && P.level < n.level) return false;
  if (n.rank && rankIdx(P.rank) < rankIdx(n.rank)) return false;
  if (n.kills && P.kills < n.kills) return false;
  if (n.awakened && !P.awakened) return false;
  if (n.ss && ((P.rankKills?.SS || 0) + (P.rankKills?.SSS || 0)) < n.ss) return false;
  if (n.sss && (P.rankKills?.SSS || 0) < n.sss) return false;
  if (n.ss && n.ss > 1 && ((P.rankKills?.SS || 0) + (P.rankKills?.SSS || 0)) < n.ss) return false;
  return true;
}
function needText(n){
  if (!n) return "Disponible";
  return [n.level && `Nivel ${n.level}`, n.rank && `Rango ${n.rank}`, n.kills && `${fmt(n.kills)} bajas`, n.awakened && "Despertar",
          n.ss && (n.ss > 1 ? `Vencer a ${n.ss} SS` : "Vencer a un SS"), n.sss && (n.sss > 1 ? `Vencer a ${n.sss} SSS` : "Vencer a un SSS")].filter(Boolean).join(" · ");
}
const lookItem = cat => LOOKS[cat].find(o => o.id === P.look?.[cat]) || LOOKS[cat][0];
// bono total de todo lo que llevas puesto: lo más difícil de conseguir es lo que más da
const lookBonus = k => Object.keys(LOOKS).reduce((a, cat) => a + (lookItem(cat).bonus?.[k] || 0), 0);
function checkLookUnlocks(){
  let fresh = [];
  for (const cat in LOOKS) for (const o of LOOKS[cat]){
    if (!o.need) continue;
    const key = `${cat}:${o.id}`;
    if (needMet(o.need) && !P.lookSeen.includes(key)){ P.lookSeen.push(key); fresh.push(o.name); }
  }
  if (fresh.length){ banner("NUEVO ASPECTO", "#ffd24a"); note(`Desbloqueado: ${fresh.join(", ")} · menú Atributos › Aspecto`, "--gold"); save(); }
}
/* -------------------------------- monturas --------------------------------
   Cada montura tiene su criatura, sus colores y su velocidad. Salvo el lobo
   inicial, se encuentran: caen de los enemigos de su región como un orbe
   brillante que hay que recoger antes de que se apague. */
// Una montura por isla (más la inicial y dos premios de rango). Cuanto más
// lejos está su isla, más rápida es: las mejores solo salen en las últimas.
const MOUNTS = {
  ShadowWolf: { name:"Lobo sombrío",          body:"wolf",    skin:"#1a1230", dark:"#0c0918", hair:"#2a1a4a", eyes:"#b07cff", scale:1.45, speed:2.1,  src:"Montura inicial" },
  StreetHound:{ name:"Sabueso de la Puerta",  body:"wolf",    skin:"#5a5f6a", dark:"#2a2d34", hair:"#8a8f99", eyes:"#ffcc33", scale:1.3,  speed:2.15, isle:"Seoul", chance:.025 },
  Kasaka:     { name:"Kasaka domada",         body:"serpent", skin:"#3f5a48", dark:"#1c2a22", hair:"#c8b98a", eyes:"#c8ff4a", scale:1.15, speed:2.2,  isle:"Hongdae", chance:.02 },
  StoneGolem: { name:"Gólem del Templo",      body:"golem",   skin:"#8f8674", dark:"#4a4438", hair:"#6a604e", eyes:"#ffb45a", scale:1.1,  speed:2.25, isle:"Temple", chance:.02 },
  RedSteed:   { name:"Corcel del Caballero Rojo", body:"wolf",skin:"#3a1418", dark:"#1a0a0c", hair:"#ff3a3a", eyes:"#ff3a3a", scale:1.6,  speed:2.3,  isle:"Reawaken", chance:.018, features:["crystals"] },
  WarBoar:    { name:"Jabalí de guerra",      body:"wolf",    skin:"#5a3a24", dark:"#2a1a10", hair:"#1a120c", eyes:"#ff6a2a", scale:1.5,  speed:2.35, isle:"HighOrcs", chance:.018, features:["tusks"] },
  FrostFang:  { name:"Colmillo de Escarcha",  body:"wolf",    skin:"#9fb4c8", dark:"#3e4e62", hair:"#eef6ff", eyes:"#6fd8ff", scale:1.6,  speed:2.4,  isle:"RedGate", chance:.016, features:["crystals"] },
  WingedAnt:  { name:"Hormiga alada",         body:"ant",     skin:"#241d2c", dark:"#120e18", hair:"#1a1420", eyes:"#b8ff3a", scale:1.35, speed:2.5,  isle:"Jeju", chance:.015, features:["wings"] },
  Kitsune:    { name:"Kitsune de Shinjuku",   body:"wolf",    skin:"#f0e6dc", dark:"#b8a898", hair:"#ff7a5a", eyes:"#ff5a5a", scale:1.5,  speed:2.6,  isle:"Japan", chance:.013, features:["tail", "halo"] },
  Nightmare:  { name:"Corcel infernal",       body:"wolf",    skin:"#2a0f14", dark:"#140608", hair:"#ff6a1a", eyes:"#ffb03a", scale:1.7,  speed:2.7,  isle:"DemonCastle", chance:.012, horns:true, features:["tail"] },
  FrostBear:  { name:"Oso Glacial",           body:"wolf",    skin:"#cfe9ff", dark:"#5f7f9f", hair:"#ffffff", eyes:"#9fe8ff", scale:1.9,  speed:2.8,  isle:"IceMonarch", chance:.01, features:["mane", "crystals"] },
  WarTiger:   { name:"Tigre de guerra",       body:"wolf",    skin:"#c07a3a", dark:"#2a1a10", hair:"#f0e0c0", eyes:"#ffd24a", scale:1.65, speed:2.9,  isle:"BeastMonarch", chance:.009 },
  SystemDisc: { name:"Disco del Sistema",     body:"disc",    skin:"#4a4a86", dark:"#1f1f44", hair:"#9fa8ff", eyes:"#9fa8ff", scale:1.2,  speed:3.1,  isle:"Architect", chance:.008, fly:true },
  ObsidianDragon:{ name:"Dragón de Obsidiana",body:"wolf",    skin:"#0e0a1c", dark:"#060410", hair:"#c08cff", eyes:"#c08cff", scale:2.2,  speed:3.6,  isle:"ShadowRealm", chance:.006, fly:true, horns:true,
                features:["wings", "tail", "halo"] },
  SkyDragon:  { name:"Dragón de Kaisel",      body:"wolf",    skin:"#241a3a", dark:"#120c20", hair:"#3a2a5a", eyes:"#ff5d6c", scale:1.95, speed:3.3,  fly:true, horns:true,
                features:["wings", "tail"], src:"25% al vencer a un SS o SSS en las tres últimas regiones" },
  GoldenWolf: { name:"Lobo dorado",           body:"wolf",    skin:"#c9a33a", dark:"#6a5418", hair:"#fff27a", eyes:"#ffffff", scale:1.7,  speed:3.45, features:["halo"], src:"Garantizado al vencer a un SSS en las cuatro últimas regiones" },
};
const mountOf = () => MOUNTS[P.mount] || MOUNTS.ShadowWolf;
function mountSource(id){
  const m = MOUNTS[id];
  return m.src || `${(m.chance * 100).toFixed(1).replace(".", ",")}% al vencer enemigos de ${isleOf(m.isle).name} (más con rangos altos)`;
}
function mountConfig(id){
  const m = MOUNTS[id] || MOUNTS.ShadowWolf;
  return { body: m.body === "disc" ? "wraith" : m.body, skin:m.skin, pants:m.dark, hair:m.hair, eyes:m.eyes, scale:m.scale,
           features:(m.features || []).slice(), horns:!!m.horns, hornColor:m.eyes };
}
let mountDrops = [];
function rollMountDrop(e){
  const reg = regionAt(e.x, e.y), R = mobRank(e.rank), ri = rankIdxOf(e.rank);
  const give = (id, why) => { if (P.mounts.includes(id) || mountDrops.some(d => d.id === id)) return false;
    mountDrops.push({ id, x:e.x, y:e.y, t:60 }); banner("¡UNA MONTURA HA CAÍDO!", MOUNTS[id].eyes); note(`${MOUNTS[id].name} · recógela antes de 60 s${why ? " · " + why : ""}`, "--gold"); return true; };
  const ring = ringAt(e.x, e.y);
  if (e.rank === "SSS" && ring >= 9) give("GoldenWolf", "SSS");
  if (R.myth && ring >= 10 && Math.random() < .25) give("SkyDragon");
  for (const id in MOUNTS){
    const m = MOUNTS[id];
    if (m.isle === reg.id && Math.random() < m.chance * (1 + ri * .5)) give(id);
  }
}
function syncMountDrops(dt){
  for (const d of mountDrops){
    d.t -= dt;
    if (Math.hypot(d.x - player.x, d.y - player.y) < 70){
      d.t = -1; P.mounts.push(d.id); P.mount = d.id;
      banner(`NUEVA MONTURA: ${MOUNTS[d.id].name.toUpperCase()}`, MOUNTS[d.id].eyes);
      note("Pulsa M para montarla · menú Atributos › Monturas", "--gold"); SFX.levelUp(); burst(d.x, d.y, 40, MOUNTS[d.id].eyes, 30); save();
    }
  }
  mountDrops = mountDrops.filter(d => d.t > 0);
}
/* ------------------------------ expediciones ------------------------------
   Mandas sombras de tu colección a misiones que duran horas reales. Corren con
   el reloj del sistema, así que avanzan aunque cierres el juego. Las que
   aparecen dependen de tu nivel y de tu mejor DPS, y las difíciles pagan más. */
const EXPEDITIONS = [
  { id:"patrol",  name:"Patrulla por Seúl",           hours:1,  lvl:1,    dps:0,     need:60,     cash:3000,  gems:20,    tickets:0, rune:0,   icon:"🏙" },
  { id:"sewers",  name:"Alcantarillas de Hongdae",    hours:2,  lvl:15,   dps:500,   need:800,    cash:4e4,   gems:80,    tickets:1, rune:0,   icon:"🐍" },
  { id:"temple",  name:"Ruinas del Templo",            hours:3,  lvl:45,   dps:2e4,   need:2e4,    cash:1.2e6, gems:400,   tickets:1, rune:.05, icon:"🗿" },
  { id:"prison",  name:"Pasillos de la Cárcel",        hours:4,  lvl:90,   dps:8e5,   need:6e5,    cash:6e7,   gems:1800,  tickets:2, rune:.1,  icon:"⛓" },
  { id:"glacier", name:"Glaciar de los Orcos",         hours:6,  lvl:180,  dps:3e7,   need:2e7,    cash:4e9,   gems:9000,  tickets:2, rune:.15, icon:"🧊" },
  { id:"redgate", name:"Más allá de la Puerta Roja",   hours:8,  lvl:320,  dps:1e9,   need:8e8,    cash:3e11,  gems:4e4,   tickets:3, rune:.2,  icon:"🟥" },
  { id:"hive",    name:"Nido de la Reina de Jeju",     hours:10, lvl:480,  dps:5e10,  need:4e10,   cash:2e13,  gems:2e5,   tickets:4, rune:.25, icon:"🐜" },
  { id:"castle",  name:"Asedio al Castillo del Demonio",hours:12,lvl:780,  dps:5e13,  need:4e13,   cash:3e16,  gems:3e6,   tickets:5, rune:.35, icon:"🏰" },
  { id:"rift",    name:"Grieta de los Monarcas",       hours:16, lvl:1100, dps:1e17,  need:8e16,   cash:5e19,  gems:6e7,   tickets:6, rune:.5,  icon:"🌑" },
];
const EXP_SLOTS = 3, EXP_MAX_SHADOWS = 4;
const expUnlocked = x => P.level >= x.lvl && (P.bestDps || 0) >= x.dps;
const expPower = uuids => uuids.reduce((a, u) => a + (P.shadows[u] ? shadowDmgOf(P.shadows[u]) : 0), 0);
const expChance = (x, uuids) => clamp(.35 + .65 * expPower(uuids) / x.need, .35, 1);
function startExpedition(id, uuids){
  const x = EXPEDITIONS.find(e => e.id === id);
  if (!x || !expUnlocked(x)) return note("Esa expedición aún no está disponible", "--hp");
  if ((P.expeditions || []).length >= EXP_SLOTS) return note("No tienes huecos de expedición libres", "--hp");
  uuids = uuids.filter(u => P.shadows[u] && !P.shadows[u].busy).slice(0, EXP_MAX_SHADOWS);
  if (!uuids.length) return note("Elige al menos una sombra", "--hp");
  const t0 = Date.now();
  const ex = { uid:uid(), id, uuids, start:t0, end:t0 + x.hours * 3600e3, chance:expChance(x, uuids) };
  for (const u of uuids){ P.shadows[u].busy = ex.uid; const i = P.squad.indexOf(u); if (i >= 0) P.squad.splice(i, 1); }
  P.expeditions.push(ex); rebuildSquad(); save();
  note(`${x.name}: ${uuids.length} sombra(s) en marcha · vuelven en ${x.hours} h`, "--monarch");
}
function claimExpedition(euid){
  const ex = (P.expeditions || []).find(e => e.uid === euid);
  if (!ex || Date.now() < ex.end) return;
  const x = EXPEDITIONS.find(e => e.id === ex.id);
  const ok = Math.random() < ex.chance, k = ok ? 1 : .3;
  // la recompensa crece con tu nivel para que las viejas no se queden en nada
  const lv = 1 + P.level * .01;
  const cash = Math.floor(x.cash * k * lv), gems = Math.floor(x.gems * k * lv), tickets = ok ? x.tickets : 0;
  P.cash += cash; P.gems += gems; P.tickets += tickets;
  let extra = "";
  if (ok && Math.random() < x.rune * .4){
    const r = rollRune(x.hours >= 12 ? 2 : x.hours >= 6 ? 1 : 0); extra = ` · ${RUNES[r].name}`;
  }
  for (const u of ex.uuids) if (P.shadows[u]) delete P.shadows[u].busy;
  P.expeditions = P.expeditions.filter(e => e !== ex);
  banner(ok ? "EXPEDICIÓN CON ÉXITO" : "EXPEDICIÓN FALLIDA", ok ? "#5ce8a6" : "#ff8d97");
  note(`${x.name}: +${fmt(cash)} oro · +${fmt(gems)} gemas${tickets ? ` · +${tickets} tickets` : ""}${extra}`, ok ? "--cash" : "--dim");
  save(); dirty = true;
}
const hms = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s2 = t % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m}:${String(s2).padStart(2, "0")}`; };
let expSel = null, expPick = [];
function panelExpeditions(nav){
  const nowT = Date.now(), act = P.expeditions || [];
  const slots = Array.from({ length:EXP_SLOTS }, (_, i) => {
    const ex = act[i];
    if (!ex) return `<div class="xslot empty"><span>Hueco libre</span></div>`;
    const x = EXPEDITIONS.find(e => e.id === ex.id), done = nowT >= ex.end, pct = clamp((nowT - ex.start) / (ex.end - ex.start), 0, 1) * 100;
    return `<div class="xslot ${done ? "done" : ""}"><b>${x.icon} ${x.name}</b>
      <small>${ex.uuids.map(u => P.shadows[u]?.name || "?").join(" · ")} · éxito ${Math.round(ex.chance * 100)}%</small>
      <div class="sbar xp"><i style="width:${pct}%" data-xbar="${ex.uid}"></i><em data-xleft="${ex.uid}">${done ? "¡Lista!" : hms(ex.end - nowT)}</em></div>
      ${done ? `<button class="btn green" data-xclaim="${ex.uid}">Recoger recompensa</button>` : ""}</div>`;
  }).join("");
  const list = EXPEDITIONS.map(x => { const un = expUnlocked(x);
    return `<button class="card ${expSel === x.id ? "sel" : ""} ${un ? "" : "lock"}" data-xsel="${x.id}" style="--tc:${un ? "var(--monarch)" : "var(--line)"}">
      <span class="cg">${un ? x.icon : "🔒"}</span><b>${x.name}</b><small>${x.hours} h · ${un ? `+${fmt(x.cash * (1 + P.level * .01))} oro` : `Nv ${x.lvl} · ${fmt(x.dps)} DPS`}</small></button>`; }).join("");
  let pick = "";
  const x = EXPEDITIONS.find(e => e.id === expSel);
  if (x && expUnlocked(x)){
    const free = Object.values(P.shadows).filter(sh => !sh.busy).sort((a, b) => shadowDmgOf(b) - shadowDmgOf(a)).slice(0, 40);
    expPick = expPick.filter(u => free.some(f => f.uuid === u));
    pick = `<div class="sheet" style="--tc:var(--monarch)"><b class="sname">${x.icon} ${x.name}</b>
      <span class="lv">${x.hours} horas · poder recomendado ${fmt(x.need)} · recompensa ${fmt(x.cash * (1 + P.level * .01))} oro, ${fmt(x.gems * (1 + P.level * .01))} gemas${x.tickets ? `, ${x.tickets} tickets` : ""}${x.rune ? `, ${Math.round(x.rune * 40)}% de runa` : ""}</span>
      <div class="chips">${free.map(sh => `<button class="chip ${expPick.includes(sh.uuid) ? "sel" : ""}" data-xpick="${sh.uuid}">${SHADOWS[sh.id]?.glyph || "👤"} ${sh.name} <em>${mobRank(sh.rank).r}</em></button>`).join("") || `<span class="hint">No tienes sombras libres.</span>`}</div>
      <div class="sbar"><small>Poder</small><i style="width:${clamp(expPower(expPick) / x.need, 0, 1) * 100}%"></i><em>${fmt(expPower(expPick))} / ${fmt(x.need)} · éxito ${Math.round(expChance(x, expPick) * 100)}%</em></div>
      <div class="sact"><button class="btn" data-xauto="1">Elegir las mejores</button>
        <button class="btn green" data-xgo="${x.id}" ${expPick.length && act.length < EXP_SLOTS ? "" : "disabled"}>Enviar (${expPick.length}/${EXP_MAX_SHADOWS})</button></div></div>`;
  }
  return shell("Expediciones", nav + `<div class="xslots">${slots}</div>
    <h3 class="subh">Destinos · tu mejor DPS: ${fmt(P.bestDps || 0)}</h3><div class="cards">${list}</div>${pick}
    <p class="kbhelp">Las sombras enviadas salen del escuadrón hasta que vuelvan. El tiempo corre aunque cierres el juego. Si fallan, traen solo un 30% del botín.</p>`);
}
/* --------------------------- recompensas diarias --------------------------
   Un calendario de 7 días: se reclama una vez por día natural. Si pasas un día
   entero sin entrar, la racha vuelve al día 1. Crece con tu nivel. */
const DAILY = [
  { cash:1, gems:1,   tickets:0, label:"Oro y gemas" },
  { cash:1.5, gems:1.5, tickets:0, label:"Más oro y gemas" },
  { cash:0, gems:3,   tickets:1, label:"Gemas y 1 ticket" },
  { cash:3, gems:2,   tickets:0, label:"Mucho oro" },
  { cash:2, gems:4,   tickets:1, label:"Gemas y 1 ticket" },
  { cash:5, gems:5,   tickets:1, label:"Gran cofre" },
  { cash:10, gems:12, tickets:3, label:"Cofre del Monarca", big:true },
];
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const dayNum = key => { const [y, m, d] = key.split("-").map(Number); return Math.round(new Date(y, m - 1, d).getTime() / 864e5); };
function dailyState(){
  const D = P.daily || (P.daily = { last:null, streak:0 });
  const today = dayKey();
  const gap = D.last ? dayNum(today) - dayNum(D.last) : 99;
  const can = D.last !== today;
  const next = !D.last || gap > 1 ? 0 : D.streak % 7;             // racha rota → día 1
  return { can, next, streak: gap > 1 ? 0 : D.streak, broke: D.last && gap > 1 };
}
// Base de cada día; lo que sale de verdad se tira al reclamar.
function dailyAmount(i){
  const r = DAILY[i], lv = 1 + P.level * .05;
  return { cash: Math.floor(2500 * r.cash * lv * (1 + P.level * .02)), gems: Math.floor(25 * r.gems * lv), tickets: r.tickets };
}
/* Tirada del cofre diario: cantidades que varían de ×0,5 a ×2,5, a veces un
   golpe de suerte ×5, y botín extra al azar. El día 7 es un cofre aparte:
   mucho más grande, runa segura, opción de runa exclusiva y de una montura. */
function rollDaily(i){
  const base = dailyAmount(i), big = DAILY[i].big, out = { cash:0, gems:0, tickets:0, extras:[] };
  const luck = Math.random() < (big ? .15 : .06) ? 5 : 1;
  const k = () => (0.5 + Math.random() * 2) * luck;
  if (big){
    out.cash = Math.floor(base.cash * 2.5 * k()); out.gems = Math.floor(base.gems * 2.5 * k()); out.tickets = 3 + Math.floor(Math.random() * 5);
    if (Math.random() < .35){ const r = rollRune(2); out.extras.push(`${RUNES[r].glyph} ${RUNES[r].name}`); }
    const missing = Object.keys(MOUNTS).filter(m => !P.mounts.includes(m) && MOUNTS[m].isle && P.islands.includes(MOUNTS[m].isle)
      && ISLANDS.findIndex(i => i.id === MOUNTS[m].isle) <= 6);
    if (missing.length && Math.random() < .12){
      const m = missing[Math.floor(Math.random() * missing.length)]; P.mounts.push(m); out.extras.push(`🐺 Montura: ${MOUNTS[m].name}`);
    }
  } else {
    out.cash = Math.random() < .85 ? Math.floor(base.cash * k() + base.gems * 50 * Math.random()) : 0;
    out.gems = Math.floor(base.gems * k());
    out.tickets = base.tickets + (Math.random() < .2 ? 1 : 0);
    if (Math.random() < .04){ const r = rollRune(0); out.extras.push(`${RUNES[r].glyph} ${RUNES[r].name}`); }
  }
  if (luck > 1) out.extras.unshift("✨ ¡Golpe de suerte ×5!");
  return out;
}
function claimDaily(){
  const st = dailyState(); if (!st.can) return;
  const a = rollDaily(st.next);
  P.cash += a.cash; P.gems += a.gems; P.tickets += a.tickets;
  P.daily = { last:dayKey(), streak: st.next + 1, total:(P.daily?.total || 0) + 1,
              lastRoll:{ day:st.next + 1, ...a } };
  banner(DAILY[st.next].big ? "¡COFRE DEL MONARCA!" : `DÍA ${st.next + 1} RECLAMADO`, DAILY[st.next].big ? "#ffd24a" : "#5ce8a6");
  note([a.cash && `+${fmt(a.cash)} oro`, a.gems && `+${fmt(a.gems)} gemas`, a.tickets && `+${a.tickets} tickets`, ...a.extras].filter(Boolean).join(" · "), "--cash");
  if (DAILY[st.next].big){ burst(player.x, player.y, 60, "#ffd24a", 40); camImpulse(.6); }
  SFX.levelUp?.(); save(); dirty = true;
}
function panelDaily(nav){
  const st = dailyState();
  const cells = DAILY.map((r, i) => { const a = dailyAmount(i), done = i < st.next || (!st.can && i === st.next - 0 && false), cur = i === st.next;
    const claimed = st.can ? i < st.next : i < ((P.daily.streak - 1) % 7) + 1;
    return `<div class="dcell ${claimed ? "done" : ""} ${cur && st.can ? "cur" : ""} ${r.big ? "big" : ""}">
      <small>Día ${i + 1}</small><span class="dic">${claimed ? "✔" : r.big ? "👑" : r.tickets ? "🎟" : "🎁"}</span>
      <b>${r.label}</b><em>${r.big ? `${fmt(a.gems * 1.25)}–${fmt(a.gems * 6.25)} gemas · 3–7 🎟 · 35% runa (puede ser legendaria) · 12% montura`
        : `~${fmt(a.gems * .5)}–${fmt(a.gems * 2.5)} gemas${a.tickets ? ` · ${a.tickets}+ 🎟` : ""} · 4% runa`}</em></div>`; }).join("");
  const L = P.daily?.lastRoll;
  const last = L ? `<div class="dlast"><small>Último cofre · día ${L.day}</small><b>${[L.cash && `${fmt(L.cash)} oro`, L.gems && `${fmt(L.gems)} gemas`, L.tickets && `${L.tickets} tickets`, ...(L.extras || [])].filter(Boolean).join(" · ")}</b></div>` : "";
  return shell("Recompensas diarias", nav + `<div class="daily">
      <div class="dhead"><div><small>Racha</small><b>${st.can ? st.next : ((P.daily.streak - 1) % 7) + 1} / 7</b></div>
        <div><small>Días reclamados</small><b>${P.daily?.total || 0}</b></div></div>
      ${st.broke ? `<p class="codemsg bad">Te saltaste un día: la racha empieza de nuevo.</p>` : ""}
      <div class="dgrid">${cells}</div>${last}
      <button class="btn gold big-w" id="daily-btn" ${st.can ? "" : "disabled"}>${st.can ? `Reclamar día ${st.next + 1}` : "Vuelve mañana"}</button>
      <p class="kbhelp">Cada cofre es una tirada: la cantidad cambia cada vez y a veces sale un golpe de suerte ×5. Crece con tu nivel. El día 7 es el Cofre del Monarca, mucho mejor que el resto.</p></div>`);
}
function newProfile(){
  return {
    schema:9, level:1, xp:0, rank:"E", rebirths:0,
    cash:0, gems:0, tickets:0,
    stats:{ STR:0, INT:0, SDW:0, VIT:0, AGI:0, MNA:0, points:5 },
    weapon:START_WEAPON, weapons:{ [START_WEAPON]:1 }, weaponLv:{},
    class:"Novice", classes:["Novice"], spins:0, talents:{}, codes:{}, quests:{ active:null, done:0 },
    shadows:{}, squad:[], relics:{}, runes:{},
    islands:["Seoul"], island:"Seoul",
    title:"Cazador Novato", awakened:false, index:{},
    kills:0, arisen:0, dungeonsCleared:0, ledger:[], tutorial:0, chapter:0,
    pos:null,
    look:{ ...LOOK_DEFAULT }, lookSeen:[], rankKills:{}, mounts:["ShadowWolf"], mount:"ShadowWolf", lore:[],
    expeditions:[], bestDps:0, infBest:0, daily:{ last:null, streak:0, total:0 },
  };
}
function reconcile(d){
  const base = newProfile();
  const p = Object.assign(base, d || {});
  p.stats = Object.assign(base.stats, d?.stats || {});
  for (const k of ["weapons","weaponLv","shadows","relics","runes","index","talents","codes"])
    if (typeof p[k] !== "object" || !p[k]) p[k] = {};
  if (!CLASSES[p.class]) p.class = "Novice";
  if (!Array.isArray(p.classes)) p.classes = [p.class];     // partidas viejas conservan la clase que tenían
  p.classes = p.classes.filter(c => CLASSES[c]); if (!p.classes.includes(p.class)) p.classes.push(p.class);
  p.spins = Math.max(0, Math.round(Number(p.spins) || 0));
  if (typeof p.quests !== "object" || !p.quests) p.quests = { active:null, done:0 };
  if (typeof p.tutorial !== "number") p.tutorial = 0;
  p.muted = !!p.muted;
  if (typeof p.chapter !== "number") p.chapter = 0;
  p.blessing = 0;   // el reloj se reinicia en cada carga
  if (!Array.isArray(p.squad)) p.squad = [];
  if (!Array.isArray(p.islands) || !p.islands.length) p.islands = ["Seoul"];
  if (!Array.isArray(p.ledger)) p.ledger = [];
  p.look = Object.assign({ ...LOOK_DEFAULT }, typeof d?.look === "object" && d.look ? d.look : {});
  for (const cat in LOOKS) if (!LOOKS[cat].some(o => o.id === p.look[cat])) p.look[cat] = LOOK_DEFAULT[cat];
  if (d && !d.look){
    // partidas anteriores al vestidor: se viste al cazador según lo ya logrado
    const ri = RANKS.findIndex(r => r.name === p.rank);
    p.look.armor = p.awakened ? "coat" : ri >= 4 ? "heavy" : ri >= 2 ? "plate" : "light";
    p.look.outfit = p.awakened ? "monarch" : "hunter";
    p.look.hair = p.awakened ? "spiky" : "hood";
    if (p.awakened){ p.look.eyes = "#c9a6ff"; p.look.cape = "none"; }
  }
  if (!Array.isArray(p.lookSeen)) p.lookSeen = [];
  if (!Array.isArray(p.lore)) p.lore = [];
  if (!p.lookV3){ Object.assign(p.look, { outfit:"shadowcoat", hair:"messy", hairColor:"#121218", eyes: p.look.eyes === "#4a5a78" ? "#3aa8ff" : p.look.eyes,
    skin:"#f0c9a0", weaponStyle:"monarchblade", weaponGlow:"#26e0ff", armor:"light", head:"none" }); p.lookV3 = true; }
  if (!Array.isArray(p.expeditions)) p.expeditions = [];
  if (typeof p.daily !== "object" || !p.daily) p.daily = { last:null, streak:0, total:0 };
  p.expeditions = p.expeditions.filter(e => e && EXPEDITIONS.some(x => x.id === e.id) && Array.isArray(e.uuids) && Number.isFinite(e.end));
  p.bestDps = Math.max(0, Number(p.bestDps) || 0); p.infBest = Math.max(0, Math.round(Number(p.infBest) || 0));
  if (typeof p.rankKills !== "object" || !p.rankKills) p.rankKills = {};
  if (!Array.isArray(p.mounts)) p.mounts = ["ShadowWolf"];
  p.mounts = p.mounts.filter(m => MOUNTS[m]); if (!p.mounts.includes("ShadowWolf")) p.mounts.unshift("ShadowWolf");
  if (!p.mounts.includes(p.mount)) p.mount = "ShadowWolf";
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
const baseDamage  = () => FORMULA.physicalDamage(weaponDmg(), P.stats.STR) * (blessed() ? 1.4 : 1) * (formActive() ? FORM.dmg : 1)
  * (1 + rankMult() + classBonus("dmg") + talentLv("power") * 0.08)
  * (1 + P.level * 0.012) * (now() < (player.dmgBuffUntil || 0) ? 1.3 : 1) * (1 + lookBonus("dmg"))
  * (1 + Math.min(10, P.runes?.Void || 0) * .05) * (1 + runeN("Monarch", 3) * .3);
const relicBonus  = effect => Object.keys(P.relics).reduce((a, id) => a + (RELICS[id]?.effect === effect ? RELICS[id].value : 0), 0);
const shadowMult  = () => 1 + relicBonus("shadowDmg") + classBonus("shadow") + talentLv("legion") * 0.15;
const ariseLuck   = () => rankOf(P.rank).luck + P.stats.INT * 0.35 + relicBonus("ariseLuck")
  + (P.awakened ? 60 : 0) + classBonus("luck") * 100 + talentLv("fortune") * 12;
const maxHP       = () => FORMULA.maxHP(100 + P.level * 6 + P.rebirths * 500, P.stats.VIT) * (1 + lookBonus("hp")) * (1 + runeN("Monarch", 3) * .3)
  * (1 + classBonus("hp") + talentLv("vigor") * 0.1);
const maxMana     = () => FORMULA.maxMana(P.stats.MNA) * (1 + classBonus("mana"));
// El daño de una sombra acompaña al tuyo: antes salía solo de su tabla y a
// partir del nivel 100 se quedaba en un 1–5% de tu golpe. Ahora es una parte
// de tu daño según su clase y su rango (raíz del multiplicador, para que un
// SSS sea enorme sin romper el juego); con 6 sombras el escuadrón hace más o
// menos lo mismo que tú. Si la tabla da más, se queda la tabla.
const SHADOW_TIER_RATIO = { C:.15, B:.21, A:.3, S:.4, "S Elite":.5, Monarch:.62 };
const shadowDmgOf = s => {
  const table = FORMULA.shadowDamage(SHADOWS[s.id].dmg * (1 + (s.level - 1) * 0.1) * mobRank(s.rank).sh, P.stats.SDW);
  const tied = baseDamage() * (SHADOW_TIER_RATIO[SHADOWS[s.id].tier] || .2) * Math.sqrt(mobRank(s.rank).sh)
    * (1 + (s.level - 1) * 0.1) * (1 + P.stats.SDW * 0.0015);
  return Math.max(table, tied) * shadowMult() * (now() < (player.shadowBuffUntil || 0) ? 1.3 : 1) * (s.shiny ? 2 : 1);
};
const shadowHPOf  = s => FORMULA.shadowHP(SHADOWS[s.id].hp * (1 + (s.level - 1) * 0.1) * mobRank(s.rank).sh, P.stats.SDW) * (s.shiny ? 2 : 1);

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
    boss:!!d.boss, phase:1, telegraph:null, moveCd:0, born:now(),
  };
  // Rango del enemigo: los jefes siempre son S; el resto tira los dados.
  e.rank = e.boss ? "S" : rollMobRank();
  const R = mobRank(e.rank);
  if (!e.boss){
    e.hp = e.maxHp = d.hp * R.hp; e.dmgMult = R.dmg;
    e.level = d.lvl + MOB_RANKS.indexOf(R) * 2;
  }
  e.elite = !e.boss && rankIdxOf(e.rank) >= 4;
  if (!e.boss && R.myth){
    banner(`¡RANGO ${e.rank} DETECTADO!`, R.col);
    note(`Ha aparecido ${e.name} de rango ${e.rank}`, R.col); SFX.bossPhase && SFX.bossPhase(4);
  }
  enemies.push(e);
  return e;
}

/* -------------------------------- daño ------------------------------------ */
function dealDamage(e, amount, opts){
  if (!e || e.hp <= 0) return;
  const o = opts || {};
  const critChance = CFG.CRIT_CHANCE + classBonus("crit") + talentLv("crit") * 0.03
    + (!o.shadow && kitOf(P.weapon).passive === "crit" ? kitOf(P.weapon).pv : 0);
  const crit = o.crit ?? (Math.random() < critChance);
  const dmg = amount * (crit ? CFG.CRIT_MULT : 1);
  if (crit && !o.shadow && P.relics.EyeAscension) player.mana = Math.min(maxMana(), player.mana + 5);
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
// Qué sombra deja cada cuerpo: el jefe, la suya con nombre; el resto, la de
// su propia especie, y de vez en cuando (8%) la sombra con nombre de la región.
function corpseShadowId(e){
  const isleId = e.isle || regionAt(e.x, e.y).id, isle = isleOf(isleId);
  if (e.boss) return e.def.shadow || isle.shadow;
  const own = `${isleId}_${e.def.kind === "brute" ? "b" : "n"}`;
  if (!SHADOWS[own] || Math.random() < .08) return e.def.shadow || isle.shadow;
  return own;
}
function killEnemy(e){
  enemies = enemies.filter(x => x !== e);
  if (target === e) target = null;
  P.kills++;
  const R = mobRank(e.rank), loot = e.boss ? 1 : R.loot;
  gainXP(FORMULA.expReward(e.level, P.rebirths) * loot);
  const cash = Math.max(1, Math.floor(e.level * 12 * loot * (1 + P.rebirths * 0.3) * (dungeon?.runes?.Cash ? 1.1 : 1) * (1 + runeN("Greed", 3) * .4)));
  if (!e.boss && MOB_RANKS.indexOf(R) >= 3){
    const gems = Math.round(3 * MOB_RANKS.indexOf(R) ** 2 * (R.myth ? R.loot / 10 : 1));
    if (R.myth) banner(`${e.rank} DERROTADO`, R.col);
    P.gems += gems; note(`Rango ${e.rank} derrotado · +${fmt(cash)} oro · +${gems} gemas`, R.col); ring(e.x, e.y, 170, R.col, .6);
  }
  P.cash += cash;
  burst(e.x, e.y, 22, e.def.color || "#ffd9a8", 40);
  ring(e.x, e.y, 120, "#8fd0ff", .5);
  SFX.kill();
  // CorpseToken (contrato 07)
  while (corpses.length >= FLAGS.MAX_CORPSES) corpses.shift();
  corpses.push({
    CorpseId:uid(), EnemyId:e.def.name, ShadowDefinitionId: corpseShadowId(e), rank:e.rank || "E",
    OwnerPlayerId:1, SpawnedAt:now(), ExpiresAt:now() + FLAGS.CORPSE_LIFETIME,
    AttemptsRemaining:FLAGS.ARISE_ATTEMPTS, Consumed:false,
    x:e.x, y:e.y, level:e.level, phase:0, boss:e.boss,
  });
  if (dungeon) dungeon.onKill(e);
  relicOnKill(e);
  if (e.rank && !e.boss){ P.rankKills[e.rank] = (P.rankKills[e.rank] || 0) + 1; }
  rollMountDrop(e);
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
  if (player.dead > 0) return;
  if (player.phase !== "idle"){
    // en pleno golpe (o en AUTO, que encadena golpes sin parar) la habilidad
    // se guarda y sale en cuanto termina el golpe actual
    const k0 = kitOf(P.weapon), i0 = SKILL_INFO[k0.skill];
    if (player.skillCd <= 0 && player.mana >= i0.mana) player.skillQueued = now();
    return;
  }
  player.skillQueued = 0;
  if (player.skillCd > 0) return note("Habilidad en enfriamiento", "--dim");
  const kit = kitOf(P.weapon), info = SKILL_INFO[kit.skill];
  if (player.mana < info.mana) return note("Maná insuficiente", "--mana");
  player.mana -= info.mana;
  player.skillCd = player.skillCdMax = info.cd * (1 - runeN("Chrono", 3) * .15);
  player.atkDef = { ...SKILL, startup:info.startup, mult:0, skill:true, cam:SKILL.feedback.cam, hitstop:SKILL.feedback.hitstop };
  player.phase = "startup"; player.phaseT = info.startup; player.hitDone = false;
  banner(kit.sname.toUpperCase(), kit.color);
  SFX.skill(); tutState.skilled = true;
}
function resolveHit(){
  const def = player.atkDef;
  if (!def) return;
  if (def.skill){ castWeaponSkill(); return; }
  const reach = CFG.ATTACK_RANGE * (formActive() ? FORM.reach : 1);
  const e = nearestEnemy(player.x, player.y, reach);
  if (e) player.yaw = Math.atan2(e.x - player.x, e.y - player.y);
  slashFx(def.id === "M1_4" ? "finisher" : "normal");     // el tajo se ve aunque falles
  if (!e){ return; }
  if (formActive()){
    // transformado, cada golpe barre todo lo que hay en un cono de 130°
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    for (const o of enemies.slice()){
      const dx = o.x - player.x, dz = o.y - player.y, d = Math.hypot(dx, dz) || 1;
      if (d > reach) continue;
      if ((dx * fx + dz * fz) / d < Math.cos(65 * Math.PI / 180)) continue;
      dealDamage(o, baseDamage() * def.mult, { cam:def.cam, hitstop:def.hitstop });
    }
    return;
  }
  playerHit(e, baseDamage() * def.mult, { cam:def.cam, hitstop:def.hitstop });
}
/* ------------------- habilidades y pasivas de las armas -------------------- */
let pendingFx = [], lookT = 0;
const later = (t, fn) => pendingFx.push({ t, fn });
const skillBase = () => (weaponDmg() * SKILL.damage.weapon + P.stats.STR * SKILL.damage.str * 1.5)
  * (1 + rankMult()) * (1 + classBonus("skill")) * (kitOf(P.weapon).big ? 1.2 : 1);
const fwd = () => ({ x:Math.sin(player.yaw), z:Math.cos(player.yaw) });
function hitCircle(x, y, r, dmg, onHit){
  let n = 0;
  for (const e of enemies.slice()){
    if (Math.hypot(e.x - x, e.y - y) > r + (e.def.r || 18)) continue;
    dealDamage(e, dmg, { cam:.25, hitstop:.02 }); if (onHit && e.hp > 0) onHit(e); n++;
  }
  return n;
}
function hitCone(r, deg, dmg, onHit){
  const f = fwd(); let n = 0;
  for (const e of enemies.slice()){
    const dx = e.x - player.x, dz = e.y - player.y, d = Math.hypot(dx, dz) || 1;
    if (d > r + (e.def.r || 18)) continue;
    if (d > 30 && (dx * f.x + dz * f.z) / d < Math.cos(deg / 2 * Math.PI / 180)) continue;
    dealDamage(e, dmg, { cam:.3, hitstop:.02 }); if (onHit && e.hp > 0) onHit(e); n++;
  }
  return n;
}
function addDot(e, kind, dps, dur){
  e.dots = e.dots || {};
  const cur = e.dots[kind];
  e.dots[kind] = { dps: Math.max(dps, cur?.dps || 0), t: dur, tick: cur?.tick || .5 };
}
const DOT_COL = { poison:"#8fff6a", burn:"#ff8a3a", bleed:"#ff4a5a" };
function freezeEnemy(e, t){
  e.stun = Math.max(e.stun, e.boss ? t * .35 : t); e.slowT = Math.max(e.slowT || 0, t + 1.5);
  ring(e.x, e.y, 50 * ((e.def.r || 18) / 18), "#bff0ff", .6, 10);
}
function chainFrom(e, dmg, n){
  let last = e; const hit = new Set([e]);
  for (let i = 0; i < n; i++){
    let best = null, bd = 260;
    for (const o of enemies){ if (hit.has(o)) continue; const d = Math.hypot(o.x - last.x, o.y - last.y); if (d < bd){ bd = d; best = o; } }
    if (!best) break;
    for (let k = 0; k <= 6; k++){ const f = k / 6; parts.push({ x:last.x + (best.x - last.x) * f + rnd(-8, 8), y:last.y + (best.y - last.y) * f + rnd(-8, 8),
      h:50 + rnd(-10, 10), vx:0, vy:0, vh:0, life:.25, color:"#bfe6ff", size:5, ghost:true }); }
    dealDamage(best, dmg, { shadow:true }); hit.add(best); last = best;
  }
}
// golpe básico del jugador: aplica la pasiva del arma y los poderes de reliquias
function playerHit(e, amount, opts){
  const k = kitOf(P.weapon);
  let dmg = amount;
  if (k.passive === "holy" && e.boss) dmg *= 1 + k.pv;
  if (k.passive === "execute" && e.hp / e.maxHp < .25) dmg *= 2;
  if (player.veilCrit){ player.veilCrit = false; opts = { ...opts, crit:true }; }
  dealDamage(e, dmg, opts);
  relicOnHit(e, dmg);
  if (e.hp <= 0) return;
  const R = Math.random();
  if (k.passive === "bleed" && R < k.pv) addDot(e, "bleed", dmg * .25, 3);
  else if (k.passive === "poison") addDot(e, "poison", dmg * k.pv, 4);
  else if (k.passive === "burn" && R < k.pv) addDot(e, "burn", dmg * .3, 3);
  else if (k.passive === "stun" && R < k.pv){ e.stun = Math.max(e.stun, e.boss ? .2 : .7); ring(e.x, e.y, 40, "#ffe39a", .35, 70); }
  else if (k.passive === "frost" && R < k.pv){ e.slowT = 2.5; spark(e.x, e.y, 40, 6, "#bff0ff"); }
  else if (k.passive === "chain" && R < k.pv) chainFrom(e, dmg * .5, 2);
  else if (k.passive === "lifesteal") player.hp = Math.min(maxHP(), player.hp + maxHP() * k.pv);
}
function castWeaponSkill(){
  const k = kitOf(P.weapon), B = skillBase(), col = k.color, f = fwd();
  player.skillAnim = { kind:k.skill, t:0 };
  SFX.skill(); camImpulse(.5);
  switch (k.skill){
    case "estocada": {
      const len = 250, x0 = player.x, y0 = player.y;
      player.x = clamp(player.x + f.x * len, 80, CFG.WORLD.w - 80); player.y = clamp(player.y + f.z * len, 80, CFG.WORLD.h - 80);
      for (let i = 0; i <= 12; i++){ const t = i / 12; parts.push({ x:x0 + (player.x - x0) * t, y:y0 + (player.y - y0) * t, h:40, vx:0, vy:0, vh:0, life:.35, color:col, size:7, ghost:true }); }
      for (const e of enemies.slice()){
        const ax = e.x - x0, az = e.y - y0, along = ax * f.x + az * f.z;
        if (along < -20 || along > len + 40) continue;
        if (Math.abs(ax * f.z - az * f.x) > 60 + (e.def.r || 18)) continue;
        dealDamage(e, B * 1.5, { cam:.4, hitstop:.03 });
        if (k.freeze && e.hp > 0) freezeEnemy(e, 1.6);
      }
      slashFx("skill"); break;
    }
    case "tajo": {
      const r = k.big ? 250 : 200;
      hitCone(r, 80, B * 1.25, e => { if (k.chain) chainFrom(e, B * .4, 2); if (k.passive === "bleed") addDot(e, "bleed", B * .15, 3); });
      if (k.passive === "holy") player.hp = Math.min(maxHP(), player.hp + maxHP() * .1);
      ring(player.x + f.x * 90, player.y + f.z * 90, r, col, .5, 30); slashFx("skill"); break;
    }
    case "torbellino":
      for (let i = 0; i < 5; i++) later(i * .12, () => {
        hitCircle(player.x, player.y, 170, B * .42, k.burn ? (e => addDot(e, "burn", B * .12, 3)) : null);
        ring(player.x, player.y, 170, col, .25, 30); slashFx("finisher");
      });
      player.spinT = .62; break;
    case "terremoto":
      player.vh = Math.max(player.vh, 420);
      later(.34, () => {
        const n = hitCircle(player.x, player.y, 250, B * 1.7, e => { e.stun = Math.max(e.stun, e.boss ? .4 : 1.3); if (k.chain) chainFrom(e, B * .35, 3); });
        for (let i = 0; i < 3; i++) later(i * .08, () => ring(player.x, player.y, 120 + i * 90, col, .45));
        burst(player.x, player.y, 40, "#8a7a6a", 6); camImpulse(1.1); hitstop = Math.max(hitstop, n ? .06 : .02);
      });
      break;
    case "veneno":
      hitCone(190, 95, B * .7, e => addDot(e, "poison", B * .45, 4));
      for (let i = 0; i < 26; i++){ const a = player.yaw + rnd(-.8, .8), d = rnd(30, 190);
        parts.push({ x:player.x + Math.sin(a) * d, y:player.y + Math.cos(a) * d, h:rnd(10, 50), vx:0, vy:0, vh:rnd(10, 40), life:rnd(.6, 1.1), color:col, size:rnd(5, 9) }); }
      break;
    case "iaido": {
      const near = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) < 300).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
      for (let i = 0; i < 5; i++) later(.05 + i * .07, () => {
        const alive = near.filter(e => e.hp > 0); const e = alive[i % Math.max(1, alive.length)];
        if (!e) return;
        player.x = e.x - Math.sin(player.yaw) * 40; player.y = e.y - Math.cos(player.yaw) * 40;
        player.yaw = Math.atan2(e.x - player.x, e.y - player.y);
        dealDamage(e, B * .75, { cam:.3, hitstop:.035 });
        spark(e.x, e.y, 50, 10, col); slashFx(i === 4 ? "finisher" : "normal");
      });
      player.flickerT = .45; break;
    }
    case "fuego":
      hitCone(230, 70, B * .95, e => addDot(e, "burn", B * .35, 3));
      for (let i = 0; i < 30; i++){ const a = player.yaw + rnd(-.55, .55), d = rnd(20, 230);
        parts.push({ x:player.x + Math.sin(a) * d, y:player.y + Math.cos(a) * d, h:rnd(10, 45), vx:0, vy:0, vh:rnd(60, 160), life:rnd(.3, .6), color: Math.random() < .5 ? col : "#ffd27a", size:rnd(4, 8) }); }
      slashFx("skill"); break;
    case "hielo":
      hitCircle(player.x, player.y, k.big ? 260 : 210, B * 1.1, e => freezeEnemy(e, 2));
      for (let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2;
        parts.push({ x:player.x + Math.cos(a) * 40, y:player.y + Math.sin(a) * 40, h:20, vx:Math.cos(a) * 420, vy:Math.sin(a) * 420, vh:120, life:.5, color:col, size:6 }); }
      ring(player.x, player.y, k.big ? 260 : 210, col, .7, 6); break;
    case "meteoro": {
      const targets = enemies.slice().sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, k.multi || 1);
      const spots = targets.length ? targets.map(e => ({ x:e.x, y:e.y })) : [{ x:player.x + f.x * 200, y:player.y + f.z * 200 }];
      spots.forEach((sp, i) => {
        ring(sp.x, sp.y, 150, col, .6 + i * .15, 3);
        for (let j = 0; j < 10; j++) parts.push({ x:sp.x + rnd(-10, 10), y:sp.y + rnd(-10, 10), h:420 - j * 30, vx:0, vy:0, vh:-700, life:.55 + i * .15, color:col, size:9 });
        later(.55 + i * .15, () => {
          hitCircle(sp.x, sp.y, 160, B * 2.1, k.passive === "burn" ? (e => addDot(e, "burn", B * .3, 3)) : null);
          burst(sp.x, sp.y, 34, col, 20); ring(sp.x, sp.y, 190, "#ffffff", .35); camImpulse(.7);
        });
      });
      break;
    }
    case "garra": {
      const e0 = nearestEnemy(player.x, player.y, 220);
      for (let i = 0; i < 6; i++) later(i * .08, () => {
        const e = e0 && e0.hp > 0 ? e0 : nearestEnemy(player.x, player.y, 220);
        if (!e) return;
        player.yaw = Math.atan2(e.x - player.x, e.y - player.y);
        dealDamage(e, B * .45, { cam:.2, hitstop:.02 });
        player.hp = Math.min(maxHP(), player.hp + maxHP() * .02);
        slashFx(i % 2 ? "normal" : "finisher"); spark(e.x, e.y, 50, 8, col);
      });
      break;
    }
    case "sombra": {
      const r = k.big ? 380 : 300;
      for (let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2;
        parts.push({ x:player.x + Math.cos(a) * 60, y:player.y + Math.sin(a) * 60, h:50, vx:Math.cos(a) * r * 2, vy:Math.sin(a) * r * 2, vh:0, life:.5, color:col, size:8 }); }
      later(.25, () => { hitCircle(player.x, player.y, r, B * (k.big ? 2.6 : 1.8)); ring(player.x, player.y, r, col, .7); camImpulse(.9); });
      player.shadowBuffUntil = now() + 8; note("Tus sombras pegan +30% durante 8 s", "--monarch");
      break;
    }
  }
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
  if (P.relics.SilentVeil){ player.veilUntil = now() + 1.5; player.veilCrit = true; }
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
const corpseRate = c => FORMULA.effectiveRate(SHADOWS[c.ShadowDefinitionId]?.rate ?? 0.3, ariseLuck()) * mobRank(c.rank).arise;
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
    const shadow = { uuid:uid(), id:def.id, name:def.name, tier:def.tier, level:1, xp:0, lock:false, rank:c.rank || "E" };
    // mutación shiny: 1% en las de rango A o superior; doble de fuerza y otro brillo
    if (rankIdxOf(shadow.rank) >= 4 && Math.random() < .01){
      shadow.shiny = true;
      setTimeout(() => { banner(`✨ ¡${def.name.toUpperCase()} SHINY! ✨`, "#fff27a"); note("Mutación shiny: esta sombra es el doble de fuerte", "--gold"); }, 600);
    }
    P.shadows[shadow.uuid] = shadow;
    P.index[def.id] = (P.index[def.id] || 0) + 1;
    P.arisen++;
    const replaced = autoEquip(shadow);
    P.ledger.push({ tx:uid(), type:"ShadowCreated", id:def.id, at:Date.now() });
    if (P.ledger.length > 50) P.ledger.shift();
    consumeCorpse(c, true);
    rebuildSquad(); save(); dirty = true;
    relicOnArise();
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
      uuid, id:data.id, slot:i, state:"IDLE_FOLLOW", atkCd:0, step:rnd(0,6), swing:0, rank:data.rank,
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
  // quota: enemigos que hay que matar en cada sala para pasar a la siguiente
  Standard:      { name:"Estándar",         rooms:3, mult:1.6,  reward:1.5, color:"#6aa8ff", quota:12 },
  RedGate:       { name:"Puerta Roja",      rooms:4, mult:3.2,  reward:3.0, color:"#ff5d6c", quota:25 },
  DoubleDungeon: { name:"Double Dungeon",   rooms:2, mult:5.0,  reward:6.0, color:"#bb8cff", quota:18 },
  BossRush:      { name:"Boss Rush",        rooms:5, mult:2.4,  reward:4.0, color:"#ffd24a", quota:6 },
  // oleadas sin fin: cada una más dura; cuanto más lejos, más runas
  Infinite:      { name:"Modo Infinito",    rooms:1e9, mult:1.0, reward:1.0, color:"#6ef0ff", infinite:true },
};
// Probabilidad de runa al superar una oleada del modo infinito
function infRuneChance(w){ return w < 10 ? 0 : w < 20 ? .03 : w < 30 ? .06 : w < 50 ? .1 : .15; }
function infWaveClear(d){
  const w = d.room;
  const gems = Math.floor(8 * w * (1 + P.level * .01)), cash = Math.floor(d.isle.enemy.hp * .05 * w);
  P.gems += gems; P.cash += cash;
  d.timer = Math.min(d.timer + 35, 120);
  if (Math.random() < infRuneChance(w)){
    // cuanto más lejos, más alto el techo: épicas desde la 20, legendarias
    // desde la 40 y la mítica solo desde la oleada 60
    const r = rollRune(w >= 60 ? 3 : w >= 40 ? 2 : w >= 20 ? 1 : 0);
    note(`${RUNES[r].glyph} ${RUNES[r].name} (oleada ${w})`, "--gem");
  }
  if (w > (P.infBest || 0)){ P.infBest = w; if (w % 5 === 0) note(`Nuevo récord infinito: oleada ${w}`, "--gold"); }
  save();
}
function endInfinite(reason){
  const d = dungeon; if (!d || !d.mode.infinite || d.ended) return;
  d.ended = true;
  const w = d.room - 1;
  banner(`FIN · OLEADA ${w}`, "#6ef0ff");
  note(`${reason} · récord: oleada ${P.infBest || w}`, "--gem");
  save();
  setTimeout(() => { if (dungeon === d) exitDungeon(); }, 2600);
}
let returnPoint = null;   // sitio del mundo abierto al que se vuelve al salir de una mazmorra
function makeDungeon(modeId){
  const mode = DUNGEON_MODES[modeId] || DUNGEON_MODES.Standard;
  const isle = isleOf(P.island);
  const seed = Math.floor(Math.random() * 1e9);
  const runeKeys = mode.infinite ? [] : ["Health", "Gems", "Time", "Cash"].filter(() => Math.random() < 0.4);
  const d = {
    id:uid(), modeId, mode, seed, isle, room:1, rooms:mode.rooms, phase:"Wave", quota:mode.quota || 10, roomKills:0,
    timeLimit:180, timer:mode.infinite ? 90 : 180 + (runeKeys.includes("Time") ? 60 : 0),
    runes:Object.fromEntries(runeKeys.map(k => [k, true])),
    bossState:null, cleared:false, rewardTx:null,
  };
  d.enemyDef = kind => {
    const base = kind === "brute" ? isle.brute : isle.enemy;
    const hpMult = mode.infinite ? Math.pow(1.13, d.room - 1) * .8 : mode.mult * (d.runes.Health ? 0.95 : 1) * (d.room * 0.9);
    return { ...base, name:`${base.name} de la Puerta`, hp:base.hp*hpMult, dmg:base.dmg*(mode.infinite ? Math.pow(1.07, d.room - 1) : mode.mult),
             lvl:Math.floor(base.lvl*1.2), isle:isle.id, shadow:isle.shadow, kind, r: kind === "brute" ? 24 : 18 };
  };
  d.onKill = e => {
    if (mode.infinite){
      if (!enemies.length && !d.ended){ infWaveClear(d); d.room++; later(1.2, () => { if (dungeon === d && !d.ended) nextRoom(); }); }
      return;
    }
    if (e.boss){
      if (d.room >= d.rooms){ clearDungeon(); }
      else { d.room++; nextRoom(); }
    } else if (d.phase === "Wave"){
      // cada baja cuenta; al llegar a la cuota de la sala se pasa a la siguiente
      d.roomKills = (d.roomKills || 0) + 1;
      if (d.roomKills >= d.quota){
        banner("¡SALA SUPERADA!", d.mode.color);
        later(1, () => { if (dungeon !== d) return; d.room < d.rooms ? (d.room++, nextRoom()) : spawnBoss(); });
      }
    }
  };
  return d;
}
function nextRoom(){
  const d = dungeon; if (!d) return;
  enemies = []; corpses = [];
  if (d.mode.infinite){
    // cada 10 oleadas un jefe acompañado; si no, una horda que crece
    d.phase = "Wave";
    banner(d.room % 10 === 0 ? `OLEADA ${d.room} · JEFE` : `OLEADA ${d.room}`, d.mode.color);
    const n = Math.min(12, 4 + Math.floor(d.room / 3));
    for (let i = 0; i < n; i++) spawnEnemy(d.enemyDef(i % 3 === 0 ? "brute" : "normal"));
    if (d.room % 10 === 0){
      const b = d.isle.boss;
      spawnEnemy({ name:`${b.name} del Abismo`, lvl:b.lvl + d.room, hp:b.hp * .15 * Math.pow(1.13, d.room - 1), dmg:b.dmg * .3 * Math.pow(1.07, d.room - 1),
        shadow:b.shadow, isle:d.isle.id, kind:"boss", r:38, boss:true, color:"#6ef0ff" }, player.x, player.y - 380);
    }
    return;
  }
  d.phase = d.room >= d.rooms ? "Boss" : "Wave";
  d.roomKills = 0;
  banner(d.phase === "Boss" ? "SALA DEL JEFE" : `SALA ${d.room} / ${d.rooms} · MATA ${d.quota}`, d.mode.color);
  if (d.phase === "Boss") spawnBoss();
  else for (let i=0;i<Math.min(6, d.quota);i++) spawnEnemy(d.enemyDef(i % 3 === 0 ? "brute" : "normal"));
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
  if (BOSS_LINES[d.isle.id]) setTimeout(() => note(`${b.name}: ${BOSS_LINES[d.isle.id]}`, "--hp"), 900);
}
function clearDungeon(){
  const d = dungeon; if (!d || d.cleared) return;
  d.cleared = true; d.rewardTx = uid();
  P.dungeonsCleared++;
  const gems = Math.floor(400 * d.mode.reward * (1 + P.level*0.02) * (d.runes.Gems ? 1.1 : 1) * (1 + Math.min(10, P.runes?.Eternity || 0) * .05) * (1 + runeN("Greed", 3) * .4));
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
  if (Math.random() < .25) rollRune(d.modeId === "DoubleDungeon" || d.modeId === "RedGate" ? 1 : 0);
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
  thunder(){ this.noise(1.3, .32, 120, .6); this.tone(55, 1.1, "sine", .2, 30); },
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
  form(){ this.arp([98, 147, 196, 294, 392], .09, "sawtooth", .32); this.noise(.8, .22, 180, .5); },
  cross(ok){ this.arp(ok ? [392, 523, 659] : [330, 262, 196], .11, "triangle", .26);
              this.noise(.5, .1, 500, .6); },
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
/* Cruce de región: velo del color de la zona, su nombre en grande, sonido y
   un par de segundos de gracia, para que pasar de una isla a otra se note y no
   te reciban a golpes en el primer frame. */
function crossRegion(reg, first){
  const th = THEMES[reg.theme] || THEMES.city;
  const flash = document.getElementById("crossFlash");
  const name = document.getElementById("crossName");
  const puedes = P.level >= reg.level;
  if (flash){
    flash.style.setProperty("--cross", th.sky1);
    flash.classList.add("on");
    setTimeout(() => flash.classList.remove("on"), 260);
  }
  if (name){
    name.querySelector("b").textContent = reg.name;
    name.querySelector("small").textContent =
      `${first ? "Región descubierta" : "Región"} · nivel recomendado ${fmt(reg.level)}`;
    name.classList.add("on");
    clearTimeout(crossRegion._t);
    crossRegion._t = setTimeout(() => name.classList.remove("on"), 2600);
  }
  note(puedes ? `Has entrado en ${reg.name}`
              : `${reg.name} · zona de nivel ${reg.level}: aquí golpean muy fuerte`,
       puedes ? "--spec" : "--hp");
  if (first) banner("NUEVA REGIÓN", th.sky1);
  tellRegionLore(reg);
  SFX.cross(puedes);
  player.invuln = Math.max(player.invuln || 0, now() + 1.8);
  camImpulse(0.4);
  ring(player.x, player.y, 320, th.sky1, .7);
}
function banner(text, color){
  const el = document.getElementById("banner");
  el.innerHTML = `<div class="banner stroke" style="color:${color}">${text}</div>`;
  clearTimeout(banner._t);
  banner._t = setTimeout(() => { el.innerHTML = ""; }, 1900);
}
// Contadores del HUD que ruedan hasta su valor y dan un saltito al subir.
const rollShown = {};
function rollCounter(id, value){
  const el = $(id); if (!el) return;
  let v = rollShown[id];
  if (v === undefined || !isFinite(v)) v = value;
  const up = value > v + .5;
  v = Math.abs(value - v) < Math.max(1, Math.abs(value) * .004) ? value : v + (value - v) * .45;
  rollShown[id] = v;
  el.textContent = fmt(Math.round(v));
  if (up && !el.classList.contains("bump")){
    el.classList.add("bump");
    setTimeout(() => el.classList.remove("bump"), 460);
  }
  if (v !== value) dirty = true;
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
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){ if (k === "escape"){ closePanel(); } return; }
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  if (k === "escape"){ closePanel(); closeArise(); return; }
  if (panelKind && panelKey(k, e)) return;
  if (e.repeat) return;
  if (modalOpen() && k !== "b") return;
  keys.add(k);
  if (k === " ") requestJump();
  if (k === "v") requestSkill();
  if (k === "b") openArise();
  if (k === "q") requestDash();
  if (k === "r") setAuto(!auto);
  if (k === "m") toggleMount();
  if (k === "t") activateForm();
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
/* Transformación del Monarca de las Sombras. Se desbloquea con el Despertar:
   durante 15 s el cazador se convierte en la bestia acorazada — más grande,
   golpes que barren todo lo que tiene delante, más daño y menos daño recibido —
   y después necesita un minuto para volver a hacerlo. */
const FORM = { dur:15, cd:60, dmg:1.6, reach:1.4, armor:0.6, speed:1.15 };
const formActive = () => (player.formUntil || 0) > now();
function activateForm(){
  if (!P.awakened) return note("Necesitas el Despertar del Double Dungeon", "--dim");
  if (player.dead > 0 || formActive()) return;
  const t = now();
  if ((player.formReady || 0) > t)
    return note(`Transformación disponible en ${Math.ceil(player.formReady - t)} s`, "--dim");
  player.formUntil = t + FORM.dur;
  player.formReady = t + FORM.dur + FORM.cd;
  banner("MONARCA DE LAS SOMBRAS", "#b07cff");
  note("Te transformas · +60% daño, golpes en barrido, −40% daño recibido", "--monarch");
  burst(player.x, player.y, 70, "#b07cff", 60);
  ring(player.x, player.y, 360, "#d05aff", 1);
  camImpulse(0.9); hitstop = Math.max(hitstop, 0.08);
  SFX.form();
  dirty = true;
}
function toggleMount(){
  player.mounted = !player.mounted;
  const b = document.getElementById("a-mount");
  b.classList.toggle("on", player.mounted);
  b.querySelector(".st").textContent = player.mounted ? "ON" : "OFF";
  note(player.mounted ? `${mountOf().name} invocada` : "Montura guardada", "--monarch");
}

/* -------------------------------- update ---------------------------------- */
function update(dt){
  const t = now();
  cameraKeys(dt);
  updateCameraBasis();
  // hitstop: congela la simulación, no la cámara
  if (hitstop > 0){ hitstop -= dt; dt *= 0.06; }

  // ---- jugador
  const speed = FORMULA.walkSpeed(P.stats.AGI) * 11 * (player.mounted ? mountOf().speed : 1) * (formActive() ? FORM.speed : 1) * (1 + lookBonus("spd"));
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
  // efectos diferidos de habilidades (golpes en cadena, impactos que caen)
  if (pendingFx.length){
    const due = [];
    for (const f of pendingFx){ f.t -= dt; if (f.t <= 0) due.push(f); }
    pendingFx = pendingFx.filter(f => f.t > 0);
    for (const f of due) f.fn();
  }
  player.spinT = Math.max(0, (player.spinT || 0) - dt);
  player.flickerT = Math.max(0, (player.flickerT || 0) - dt);
  relicTick(dt);
  syncMountDrops(dt);
  lookT = (lookT || 0) + dt; if (lookT > 1){ lookT = 0; checkLookUnlocks(); }
  player.mana = Math.min(maxMana(), player.mana + maxMana() * 0.08 * dt);
  // aura de la transformación y aviso al terminar
  if (formActive()){
    player.wasForm = true;
    if (Math.random() < .7)
      parts.push({ x:player.x + rnd(-40, 40), y:player.y + rnd(-40, 40), h:rnd(10, 90),
                   vx:rnd(-20, 20), vy:rnd(-20, 20), vh:rnd(40, 110), life:rnd(.4, .8),
                   color: Math.random() < .5 ? "#b07cff" : "#ff5ad8", size:rnd(3, 6) });
  } else if (player.wasForm){
    player.wasForm = false;
    note("La transformación se desvanece · vuelve a estar lista en 1 min", "--dim");
    burst(player.x, player.y, 30, "#b07cff", 30);
    dirty = true;
  }
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
    // primero la habilidad pendiente (pulsada durante un golpe, válida 1,5 s)
    if (player.skillQueued && now() - player.skillQueued < 1.5) requestSkill();
    else {
      player.skillQueued = 0;
      // AUTO también usa la habilidad del arma: con un jefe o 2+ enemigos cerca
      if (auto && player.skillCd <= 0 && player.mana >= SKILL_INFO[kitOf(P.weapon).skill].mana){
        const near = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) < 260);
        if (near.length >= 2 || near.some(e => e.boss || e.elite)) requestSkill();
      }
      if (player.phase === "idle" && (auto || drag.attacking)) requestAttack();
    }
  }

  // ---- región actual del mundo abierto
  if (!dungeon){
    const reg = regionAt(player.x, player.y);
    if (reg.id !== P.island){
      const first = !P.islands.includes(reg.id);
      P.island = reg.id;
      if (first) P.islands.push(reg.id);
      crossRegion(reg, first);
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
  if (dungeon && !dungeon.mode.infinite){
    const d = dungeon, left = d.quota - (d.roomKills || 0);
    if (d.phase === "Wave" && spawnT <= 0 && left > enemies.length && enemies.length < 6){
      spawnEnemy(d.enemyDef(Math.random() < .3 ? "brute" : "normal")); spawnT = .6;
    }
  } else if (dungeon){ /* el modo infinito lanza sus oleadas él solo */ }
  else if (spawnT <= 0 && enemies.length < pop){
    // repone la horda con rapidez: el farmeo del original es continuo
    const batch = Math.min(2, pop - enemies.length);
    for (let i=0;i<batch;i++) spawnEnemy();
    spawnT = dungeon ? 1.4 : 1.1;
  }
  for (const e of enemies){
    e.hurt = Math.max(0, e.hurt - dt);
    e.stun = Math.max(0, e.stun - dt);
    e.slowT = Math.max(0, (e.slowT || 0) - dt);
    if (e.dots){
      for (const kind in e.dots){
        const D = e.dots[kind];
        D.t -= dt; D.tick -= dt;
        if (D.tick <= 0 && e.hp > 0){
          D.tick = .5; dealDamage(e, D.dps * .5, { shadow:true, crit:false });
          spark(e.x, e.y, 40, 4, DOT_COL[kind] || "#fff");
        }
        if (D.t <= 0) delete e.dots[kind];
      }
      if (e.hp <= 0) continue;
    }
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
      const sp = (98 + Math.min(60, e.level * 0.05)) * (e.boss ? 0.8 + e.phase*0.12 : 1) * (e.slowT > 0 ? .5 : 1);
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
        if (dentro && player.h < 60) hitPlayer(e.def.dmg * (e.dmgMult || 1) * (tg.mult || 2.2));
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
        if (d <= stop + 26 && player.h < 50) hitPlayer(e.def.dmg * (e.dmgMult || 1));
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
    if (dungeon.timer <= 0 && !dungeon.cleared){
      if (dungeon.mode.infinite) endInfinite("Tiempo agotado"); else { note("Tiempo agotado", "--hp"); exitDungeon(); }
    }
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
  if (player.dps.since >= 1){ player.dps.shown = player.dps.total / player.dps.since; player.dps.total = 0; player.dps.since = 0;
    if (player.dps.shown > (P.bestDps || 0)){ P.bestDps = player.dps.shown; } }

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
  if ((player.veilUntil || 0) > now()) return;              // Velo del Asesino: no te ven
  if (P.relics.NenCore && player.hp < maxHP() * .3 && now() > (player.shieldCd || 0)){
    player.shieldUntil = now() + 5; player.shieldCd = now() + 30;
    note("Núcleo de Monarca: escudo activo", "--monarch"); ring(player.x, player.y, 90, "#c9a8ff", .8, 40);
  }
  const shield = (player.shieldUntil || 0) > now() ? .5 : 1;
  const dmg = Math.max(1, raw * shield * CFG.CONTACT_SCALE * (1 - classBonus("armor")) * (formActive() ? FORM.armor : 1));
  player.hp -= dmg; player.hurt = 0.22; player.lastHit = now(); SFX.hurt();
  const ph = floaters.find(f => f.src === player);
  if (ph){ ph.amount += dmg; ph.text = `-${fmt(ph.amount)}`; ph.life = .9; }
  else floaters.push({ src:player, amount:dmg, x:player.x, y:player.y, h:100,
                       text:`-${fmt(dmg)}`, color:"#ff8d97", life:.9 });
  camImpulse(0.25);
  if (player.hp <= 0){
    player.hp = 0; player.dead = 2.4; SFX.death();
    if (dungeon?.mode.infinite) endInfinite("Has caído");
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
  QUALITY.motes = q >= 2;
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
  if (WEAPON_KIT[id]) return WEAPON_KIT[id].kind;
  const n = (WEAPONS[id]?.name || "").toLowerCase();
  if (n.includes("axe")) return "axe";
  if (n.includes("scythe")) return "scythe";
  if (n.includes("staff") || n.includes("rod")) return "staff";
  if (n.includes("naginata") || n.includes("trident") || n.includes("maul")) return "polearm";
  return "sword";
}
let scene, camera, renderer, sunLight, hemiLight, groundMesh, skyMesh;
const views = { enemies:new Map(), shadows:new Map(), corpses:new Map() };
let playerView = null, npcView = null, portalView = null, mountView = null, dropViews = [];
function buildMountView(id){
  const m = MOUNTS[id] || MOUNTS.ShadowWolf;
  let v;
  if (m.body === "disc"){
    // disco flotante del Sistema: anillos que giran y runas encendidas
    v = new THREE.Group();
    const detail = new THREE.Group(); v.add(detail); v.detail = detail;
    const disc = new THREE.Group(); detail.add(disc); v.disc = disc;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(46 * m.scale, 40 * m.scale, 6, 24), mat(m.skin)); disc.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(46 * m.scale, 3, 6, 32), mat(m.hair, { emissive:m.hair, emissiveIntensity:1.2 }));
    rim.rotation.x = Math.PI / 2; disc.add(rim);
    for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; const r = part(6, 3, 6, m.eyes, { emissive:m.eyes, emissiveIntensity:1.4 });
      r.position.set(Math.cos(a) * 30 * m.scale, 4, Math.sin(a) * 30 * m.scale); disc.add(r); }
    v.legs = [new THREE.Group(), new THREE.Group()]; v.arms = [new THREE.Group(), new THREE.Group()];
    v.torso = new THREE.Group(); v.neck = new THREE.Group(); v.scaleRef = m.scale;
  } else v = buildCharacter(mountConfig(id));
  v.userData.id = id;
  decorateMount(v, id);
  return v;
}
/* Adornos y efectos de las monturas de las islas altas: silla, armadura,
   crines de fuego, colas de kitsune, cristales, runas... Cada pieza animada
   queda en userData.mfx y animateMount la mueve cada fotograma. */
function decorateMount(v, id){
  const m = MOUNTS[id], s = v.scaleRef || 1, d = v.detail || v, fx = [];
  const B = (w, h, dd, c, x, y, z, glow, parent) => { const o = part(w * s, h * s, dd * s, c, glow ? { emissive:c, emissiveIntensity: glow === true ? 1.1 : glow } : undefined);
    o.position.set(x * s, y * s, z * s); (parent || d).add(o); return o; };
  const spr = (col, sc, x, y, z, parent) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(col), transparent:true, depthWrite:false,
    blending:THREE.AdditiveBlending, opacity:.7 })); o.scale.set(sc * s, sc * s, 1); o.position.set(x * s, y * s, z * s); (parent || d).add(o); return o; };
  const wolfy = m.body === "wolf";
  const top = m.body === "ant" ? 36 : 48;
  const late = ["FrostFang", "WingedAnt", "Kitsune", "Nightmare", "FrostBear", "WarTiger", "SystemDisc", "ObsidianDragon", "SkyDragon", "GoldenWolf"];
  if (!late.includes(id)) return;
  // silla de montar con borde encendido y estribos
  if (m.body !== "disc"){
    B(18, 4, 22, "#2a1a10", 0, top, 0); B(19, 1.5, 23, m.eyes, 0, top + 2.5, 0, .9);
    B(14, 6, 4, "#2a1a10", 0, top + 4, -10);
    for (const sd of [-1, 1]){ B(2, 12, 2, "#5a4a3a", sd * 10, top - 6, 2); B(5, 2, 6, m.eyes, sd * 10, top - 12, 2, .6); }
  }
  switch (id){
    case "FrostFang":
      for (let i = 0; i < 5; i++){ const c = B(4, 9 + (i % 2) * 5, 4, "#bff0ff", 0, top + 4, 16 - i * 7, .7); c.rotation.x = -.35; fx.push({ o:c, kind:"shine", ph:i }); }
      fx.push({ kind:"breath", col:"#dff4ff", z:40, y:30, rate:.35 }, { kind:"trail", col:"#bff0ff", rate:.5 });
      break;
    case "WingedAnt":
      for (let i = 0; i < 3; i++){ const b = B(24, 2, 3, "#b8ff3a", 0, 32 - i * 1.5, -20 - i * 8, 1.2); fx.push({ o:b, kind:"pulse", ph:i }); }
      fx.push({ kind:"buzz" }, { kind:"trail", col:"#b8ff3a", rate:.3 });
      break;
    case "Kitsune": {
      // nueve colas en abanico que ondulan, y fuegos fatuos orbitando
      const fan = new THREE.Group(); fan.position.set(0, 38 * s, -22 * s); d.add(fan);
      if (d.userData.tail) d.userData.tail.visible = false;
      for (let i = 0; i < 9; i++){
        const t = new THREE.Group(); t.rotation.set(.5, 0, (i - 4) * .22); fan.add(t);
        for (let k = 0; k < 3; k++){ const seg = part((6 - k * 1.3) * s, (6 - k * 1.3) * s, 9 * s, k === 2 ? m.hair : m.skin, k === 2 ? { emissive:m.hair, emissiveIntensity:.8 } : undefined);
          seg.position.set(0, k * 2 * s, -k * 8 * s); t.add(seg); }
        fx.push({ o:t, kind:"tail", ph:i * .5 });
      }
      const orb = new THREE.Group(); orb.position.y = 50 * s; d.add(orb);
      for (let i = 0; i < 3; i++){ const w = spr("#ff7a5a", 22, Math.cos(i * 2.1) * 26, 0, Math.sin(i * 2.1) * 26, orb); fx.push({ o:w, kind:"flick" }); }
      fx.push({ o:orb, kind:"orbit", sp:1.6 });
      break;
    }
    case "Nightmare":
      // crin y cola de fuego, cascos que dejan brasas
      for (let i = 0; i < 6; i++){ const f = spr(i % 2 ? "#ff6a1a" : "#ffb03a", 22, 0, top + 2 + (i % 2) * 3, 22 - i * 6); fx.push({ o:f, kind:"flick" }); }
      for (let i = 0; i < 3; i++){ const f = spr("#ff6a1a", 18, 0, 36 - i * 3, -26 - i * 7); fx.push({ o:f, kind:"flick" }); }
      for (const sd of [-1, 1]){ B(10, 3, 18, "#1a0808", sd * 11, 34, 6); }
      fx.push({ kind:"trail", col:"#ff6a1a", rate:.8 }, { kind:"breath", col:"#ff8a2a", z:42, y:26, rate:.25 });
      break;
    case "FrostBear":
      for (const sd of [-1, 1]){ B(12, 12, 20, "#9fd4f5", sd * 12, 40, 4, .3); }
      B(22, 6, 18, "#9fd4f5", 0, 46, 14, .3);
      for (let i = 0; i < 4; i++){ const c = B(3.5, 12, 3.5, "#e8f6ff", (i - 1.5) * 5, top + 8, 6, .8); fx.push({ o:c, kind:"shine", ph:i }); }
      fx.push({ kind:"breath", col:"#ffffff", z:44, y:26, rate:.4 }, { kind:"ring", col:"#9fe8ff" });
      break;
    case "WarTiger":
      for (let i = 0; i < 6; i++) for (const sd of [-1, 1]){ const st = B(1.6, 12, 3, "#1a0e06", sd * 10.6, 36, 14 - i * 6); st.rotation.x = .2; }
      for (const sd of [-1, 1]){ B(3, 10, 16, "#c9a33a", sd * 11.5, 38, 8, .25); }
      { const pole = B(2, 34, 2, "#3a2a1a", 0, top + 20, -12); const flag = B(1, 12, 14, "#b0242e", 0, top + 30, -19); fx.push({ o:flag, kind:"flag" }); }
      break;
    case "SystemDisc": {
      for (let i = 0; i < 3; i++){
        const rg = new THREE.Mesh(new THREE.TorusGeometry((22 + i * 12) * s, 1.2 * s, 6, 40), mat(m.eyes, { emissive:m.eyes, emissiveIntensity:1.3 }));
        rg.rotation.x = Math.PI / 2; rg.position.y = (8 + i * 6) * s; d.add(rg); fx.push({ o:rg, kind:"spinring", sp:(i % 2 ? -1 : 1) * (1 + i * .6) });
      }
      const cone = new THREE.Mesh(new THREE.ConeGeometry(40 * s, 60 * s, 24, 1, true), new THREE.MeshBasicMaterial({ color:0x9fa8ff, transparent:true, opacity:.14,
        side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending })); cone.position.y = -30 * s; cone.rotation.x = Math.PI; d.add(cone); fx.push({ o:cone, kind:"pulsem" });
      fx.push({ kind:"trail", col:"#9fa8ff", rate:.5 });
      break;
    }
    case "ObsidianDragon":
      for (let i = 0; i < 7; i++){ const c = B(4, 10 - Math.abs(i - 3), 4, "#c08cff", 0, top + 4, 20 - i * 7, 1.2); c.rotation.x = -.4; fx.push({ o:c, kind:"shine", ph:i }); }
      for (const sd of [-1, 1]) B(12, 4, 20, "#1a1030", sd * 10, 44, 8);
      fx.push({ kind:"breath", col:"#c08cff", z:46, y:32, rate:.5 }, { kind:"trail", col:"#5a2ab0", rate:.9 }, { kind:"bigwings" });
      break;
    case "SkyDragon":
      fx.push({ kind:"trail", col:"#ffd0d8", rate:.6, streak:true }, { kind:"bigwings" }, { kind:"breath", col:"#ff5d6c", z:44, y:30, rate:.2 });
      for (const sd of [-1, 1]) B(3, 3, 3, "#ff5d6c", sd * 5, 40, 34, 1.4);
      break;
    case "GoldenWolf": {
      for (const sd of [-1, 1]){ B(3, 12, 20, "#fff27a", sd * 11.5, 38, 6, .5); }
      B(20, 4, 10, "#fff27a", 0, 50, 22, .6);
      const halo = spr("#fff27a", 120, 0, 40, 0); fx.push({ o:halo, kind:"flick" });
      fx.push({ kind:"sparkle" }, { kind:"trail", col:"#fff27a", rate:.7 });
      break;
    }
  }
  v.userData.mfx = fx;
}
function animateMount(v, dt, moving, x, y){
  const fx = v.userData.mfx; if (!fx) return;
  const t = now(), s = v.scaleRef || 1;
  const wx = x ?? v.position.x, wz = y ?? v.position.z;
  const fwd = { x:Math.sin(v.rotation.y), z:Math.cos(v.rotation.y) };
  for (const f of fx){
    switch (f.kind){
      case "shine": f.o.scale.y = 1 + Math.sin(t * 4 + f.ph) * .15; break;
      case "pulse": f.o.material.emissiveIntensity = .8 + Math.sin(t * 5 + f.ph) * .6; break;
      case "flick": f.o.material.opacity = .45 + Math.random() * .45; f.o.scale.y = f.o.scale.x * (1.1 + Math.random() * .5); break;
      case "tail": f.o.rotation.y = Math.sin(t * (moving ? 6 : 2.4) + f.ph) * .35; f.o.rotation.x = .5 + Math.sin(t * 1.8 + f.ph) * .12; break;
      case "orbit": f.o.rotation.y += dt * f.sp; break;
      case "spinring": f.o.rotation.z += dt * f.sp; break;
      case "pulsem": f.o.material.opacity = .1 + Math.sin(t * 3) * .06; break;
      case "flag": f.o.rotation.y = Math.sin(t * (moving ? 9 : 3)) * .5; break;
      case "buzz": if (v.detail?.userData.wings) for (const w of v.detail.userData.wings) w.rotation.y = w.userData.side * (Math.sin(t * 40) * .5); break;
      case "bigwings": if (v.detail?.userData.wings) for (const w of v.detail.userData.wings){ const fl = Math.sin(t * (moving ? 7 : 3)); w.rotation.y = w.userData.side * (fl * .7 - .2); w.rotation.z = w.userData.side * fl * .3; w.scale.setScalar(1.35); } break;
      case "ring": if (Math.random() < .08) ring(wx, wz, 60 * s, f.col, .5); break;
      case "sparkle": if (Math.random() < .5) parts.push({ x:wx + rnd(-30, 30) * s, y:wz + rnd(-30, 30) * s, h:rnd(10, 70) * s, vx:0, vy:0, vh:rnd(20, 60), life:rnd(.4, .8),
        color:`hsl(${45 + Math.random() * 15},100%,${70 + Math.random() * 20}%)`, size:rnd(3, 6) }); break;
      case "breath": if (Math.random() < f.rate) parts.push({ x:wx + fwd.x * f.z * s, y:wz + fwd.z * f.z * s, h:f.y * s, vx:fwd.x * rnd(40, 90), vy:fwd.z * rnd(40, 90), vh:rnd(10, 40),
        life:rnd(.3, .6), color:f.col, size:rnd(4, 7) }); break;
      case "trail": if (moving && Math.random() < f.rate) parts.push({ x:wx - fwd.x * 20 * s + rnd(-10, 10), y:wz - fwd.z * 20 * s + rnd(-10, 10), h:f.streak ? rnd(20, 60) * s : 6,
        vx:0, vy:0, vh:f.streak ? 0 : rnd(20, 50), life:rnd(.4, .8), color:f.col, size:f.streak ? 8 : rnd(3, 6), ghost:!!f.streak }); break;
    }
  }
}
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
// Cara del protagonista: cejas firmes, ojos con iris, brillo y párpado,
// sombra de nariz, boca y un poco de rubor. Se ve a la distancia de juego.
function heroFaceTexture(iris, glow, skin, scar){
  const k = `hero|${iris}|${glow ? 1 : 0}|${skin}|${scar ? 1 : 0}`;
  let t = faceTexCache.get(k);
  if (t) return t;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = skin; x.fillRect(0, 0, 128, 128);
  // sombreado suave en los bordes y bajo el pelo
  const sh = x.createLinearGradient(0, 0, 0, 128); sh.addColorStop(0, "rgba(40,20,10,.28)"); sh.addColorStop(.25, "rgba(40,20,10,0)");
  sh.addColorStop(.85, "rgba(40,20,10,0)"); sh.addColorStop(1, "rgba(40,20,10,.22)"); x.fillStyle = sh; x.fillRect(0, 0, 128, 128);
  // cejas inclinadas (mirada decidida)
  x.fillStyle = "#1a1420";
  x.beginPath(); x.moveTo(24, 40); x.lineTo(54, 45); x.lineTo(54, 51); x.lineTo(26, 46); x.fill();
  x.beginPath(); x.moveTo(104, 40); x.lineTo(74, 45); x.lineTo(74, 51); x.lineTo(102, 46); x.fill();
  for (const ex of [40, 88]){
    // esclerótica almendrada
    x.fillStyle = "#f4f0ea";
    x.beginPath(); x.ellipse(ex, 62, 13, 8, 0, 0, Math.PI * 2); x.fill();
    // iris y pupila
    if (glow){ x.shadowColor = iris; x.shadowBlur = 14; }
    x.fillStyle = iris; x.beginPath(); x.ellipse(ex + (ex < 64 ? 2 : -2), 63, 7, 8, 0, 0, Math.PI * 2); x.fill();
    x.shadowBlur = 0;
    x.fillStyle = glow ? "#ffffff" : "#0a0a12"; x.beginPath(); x.ellipse(ex + (ex < 64 ? 2 : -2), 63, 3, 4, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,255,255,.95)"; x.fillRect(ex + (ex < 64 ? 3 : -1), 58, 3, 3);
    // párpado superior
    x.strokeStyle = "#1a1420"; x.lineWidth = 3.5; x.beginPath(); x.ellipse(ex, 62, 13, 8, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
  }
  // nariz y boca
  x.strokeStyle = "rgba(90,45,25,.55)"; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 70); x.lineTo(60, 84); x.lineTo(66, 86); x.stroke();
  x.strokeStyle = "#6a2a24"; x.lineWidth = 3.5; x.lineCap = "round";
  x.beginPath(); x.moveTo(52, 100); x.quadraticCurveTo(64, 104, 76, 99); x.stroke();
  x.fillStyle = "rgba(230,110,100,.22)"; x.beginPath(); x.ellipse(28, 84, 9, 5, 0, 0, 6.3); x.fill(); x.beginPath(); x.ellipse(100, 84, 9, 5, 0, 0, 6.3); x.fill();
  if (scar){ x.strokeStyle = "rgba(150,60,60,.8)"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(94, 42); x.lineTo(84, 76); x.stroke(); }
  t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; SHARED.add(t); faceTexCache.set(k, t);
  return t;
}
function faceTexture(eye, glow, skin, grin){
  const k = `${eye}|${glow ? 1 : 0}|${skin}|${grin || ""}`;
  let t = faceTexCache.get(k);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  // Base opaca del color de la piel. Sin esto el lienzo quedaba transparente
  // salvo en ojos y boca, y se veía a través de la cara hasta el interior de
  // la cabeza.
  x.fillStyle = skin || "#e8b98a";
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = eye;
  if (glow){ x.shadowColor = eye; x.shadowBlur = 18; }
  x.fillRect(34, 46, 16, 22);
  x.fillRect(78, 46, 16, 22);
  x.shadowBlur = 0;
  if (!glow){
    x.fillStyle = "rgba(255,255,255,.9)";
    x.fillRect(37, 49, 6, 7); x.fillRect(81, 49, 6, 7);
  }
  if (grin){
    // boca de bestia: una sonrisa en zigzag que brilla, de oreja a oreja
    x.fillStyle = grin; x.shadowColor = grin; x.shadowBlur = 14;
    x.beginPath(); x.moveTo(14, 78);
    for (let i = 0; i <= 10; i++) x.lineTo(14 + i * 10, i % 2 ? 100 : 82);
    x.lineTo(114, 78); x.lineTo(104, 92);
    for (let i = 10; i >= 0; i--) x.lineTo(14 + i * 10, i % 2 ? 96 : 106);
    x.closePath(); x.fill();
    x.shadowBlur = 0;
  } else {
    x.strokeStyle = eye; x.lineWidth = 6; x.lineCap = "round";
    x.beginPath(); x.arc(64, 74, 22, .22 * Math.PI, .78 * Math.PI); x.stroke();
  }
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
/* Rasgos de criatura. Sin esto, dos regiones con el mismo tipo de cuerpo se
   distinguían solo por el color. Cada isla monta su combinación: melenas,
   alas, cristales, caparazón, colmillos, ojos de más, cola o halo.          */
function addFeatures(detail, cfg, s, opts){
  const list = cfg.features;
  if (!list || !list.length) return;
  const glow = cfg.eyes || "#ffd24a";
  const dark = cfg.pants || "#1b2340";
  const P0 = (w, h, d, c, o) => part(w*s, h*s, d*s, c, o || opts);
  const G = c => ({ ...opts, emissive:c, emissiveIntensity:1.1 });
  for (const f of list){
    if (f === "mane"){                                   // melena de púas al cuello
      for (let i = 0; i < 8; i++){
        const a = (i / 8) * Math.PI * 2;
        const sp = P0(4.5, 13, 4.5, cfg.hair || dark);
        sp.position.set(Math.cos(a) * 15 * s, 54 * s, Math.sin(a) * 14 * s);
        sp.rotation.set(Math.sin(a) * .6, 0, -Math.cos(a) * .6);
        detail.add(sp);
      }
    } else if (f === "wings"){                           // alas membranosas que baten
      detail.userData.wings = [];
      for (const side of [-1, 1]){
        const pivot = new THREE.Group();
        pivot.position.set(side * 12 * s, 52 * s, -8 * s); pivot.userData.side = side;
        const w1 = P0(26, 34, 3, dark, { ...opts, opacity:(opts.opacity ?? 1) * .92 });
        w1.position.set(side * 12 * s, -2 * s, -2 * s);
        w1.rotation.set(.2, side * -.5, side * -.35);
        pivot.add(w1);
        const w2 = P0(18, 22, 3, dark, { ...opts, opacity:(opts.opacity ?? 1) * .85 });
        w2.position.set(side * 28 * s, 10 * s, -8 * s);
        w2.rotation.set(.2, side * -.7, side * -.6);
        pivot.add(w2);
        const bone = P0(3, 34, 3, glow, G(glow));
        bone.position.set(side * 10 * s, 0, -1 * s);
        bone.rotation.z = side * -.35; pivot.add(bone);
        detail.add(pivot); detail.userData.wings.push(pivot);
      }
    } else if (f === "crystals"){                        // cristales en la espalda
      let i = 0;
      for (const [dx, h2] of [[-9, 16], [0, 22], [9, 16]]){
        const c = P0(6, h2, 6, glow, G(glow));
        c.position.set(dx * s, (46 + h2 / 2) * s, -9 * s);
        c.rotation.z = (i - 1) * .3; c.rotation.x = -.25;
        detail.add(c); i++;
      }
    } else if (f === "carapace"){                        // caparazón segmentado
      let y = 52;
      for (const w of [26, 22, 17]){
        const pl = P0(w, 5, 12, dark); pl.position.set(0, y * s, -7 * s);
        pl.rotation.x = .3; detail.add(pl); y -= 7;
      }
    } else if (f === "tusks"){                           // colmillos
      for (const side of [-1, 1]){
        const tk = P0(3.5, 11, 3.5, "#efe6cf");
        tk.position.set(side * 6 * s, 62 * s, 9 * s);
        tk.rotation.x = .35; tk.rotation.z = side * .2;
        detail.add(tk);
      }
    } else if (f === "extraEyes"){                       // ojos de más
      for (const [dx, dy] of [[-8, 74], [8, 74], [-4, 80], [4, 80]]){
        const e = P0(3, 3, 2, glow, G(glow));
        e.position.set(dx * s, dy * s, 9.5 * s); detail.add(e);
      }
    } else if (f === "tail"){                            // cola segmentada que se mece
      const pivot = new THREE.Group(); pivot.position.set(0, 30 * s, -12 * s);
      let z = 0, w = 8;
      for (let i = 0; i < 4; i++){
        const seg = P0(w, w, 10, dark);
        seg.position.set(0, -i * 2 * s, z * s); pivot.add(seg);
        z -= 9; w -= 1.2;
      }
      const tip = P0(4, 10, 4, glow, G(glow));
      tip.position.set(0, -6 * s, (z + 2) * s); tip.rotation.x = .6; pivot.add(tip);
      detail.add(pivot); detail.userData.tail = pivot;
    } else if (f === "halo"){                            // anillo flotante que gira
      const ring = new THREE.Group(); ring.position.y = 86 * s; ring.userData.y0 = 86 * s;
      for (let i = 0; i < 8; i++){
        const a = (i / 8) * Math.PI * 2;
        const seg = P0(5, 2.5, 5, glow, G(glow));
        seg.position.set(Math.cos(a) * 13 * s, 0, Math.sin(a) * 13 * s);
        seg.rotation.y = -a;
        ring.add(seg);
      }
      detail.add(ring); detail.userData.halo = ring;
    }
  }
}
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
    // estatua del templo: máscara tallada, hombreras de losa, runas que
    // recorren los brazos, falda de piedra y el halo de las estatuas de dios
    const mask = P0(16, 11, 3, dark); mask.position.set(0, 5*s, 10*s); neck.add(mask);
    const mouth = P0(8, 2, 1.5, glow, glowOpts(glow)); mouth.position.set(0, 1*s, 11.8*s); neck.add(mouth);
    const brow = P0(18, 3, 4, dark); brow.position.set(0, 11*s, 9*s); neck.add(brow);
    for (const side of [-1, 1]){
      const slab = P0(22, 7, 22, dark); slab.position.set(side*28*s, 56*s, 0); slab.rotation.z = side*-.2; detail.add(slab);
      const rune = P0(2, 18, 17, glow, glowOpts(glow)); rune.position.set(side*7.6*s, -14*s, 0); g.arms[side>0?1:0].add(rune);
      const band = P0(17, 3, 18, glow, glowOpts(glow)); band.position.y = -24*s; g.arms[side>0?1:0].add(band);
    }
    for (const [w, y] of [[40, 22], [36, 16]]){ const sk = P0(w, 5, 30, dark); sk.position.y = (y-41)*s; torso.add(sk); }
    const core = P0(12, 12, 4, glow, glowOpts(glow)); core.position.set(0, (42-41)*s, 15.5*s); torso.add(core);
    const haloR = new THREE.Group(); haloR.position.set(0, 12*s, -12*s); neck.add(haloR);
    for (let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; const hs = P0(4, 4, 2, glow, glowOpts(glow)); hs.position.set(Math.cos(a) * 17*s, Math.sin(a) * 17*s, 0); haloR.add(hs); }
    g.spinHalo = haloR;
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
  } else if (body === "goblin"){
    // goblin: pequeño, encorvado, orejas largas, nariz ganchuda y daga oxidada
    g.gait = [];
    for (const side of [-1, 1]){
      const hip = new THREE.Group(); hip.position.set(side*5*s, 19*s, 0); detail.add(hip);
      const th = P0(7, 10, 7, dark); th.position.y = -5*s; hip.add(th);
      const knee = new THREE.Group(); knee.position.y = -10*s; hip.add(knee);
      const sh = P0(6, 8, 6, main); sh.position.y = -4*s; knee.add(sh);
      const ft = P0(7, 3, 11, dark); ft.position.set(0, -8.5*s, 2.5*s); knee.add(ft);
      g.legs[side>0?1:0].parent.remove(g.legs[side>0?1:0]); g.legs[side>0?1:0] = hip;
      g.gait.push({ n:knee, ph:side > 0 ? Math.PI + 1.3 : 1.3, amp:.45, base:.35, axis:"x", pos:false });
    }
    const loin = P0(17, 7, 12, "#4a3a22"); loin.position.y = (19-41)*s; torso.add(loin);
    const flap = P0(9, 9, 1.5, "#3a2c18"); flap.position.set(0, (13-41)*s, 6.2*s); torso.add(flap);
    const belly = P0(17, 12, 12, main); belly.position.set(0, (27-41)*s, 1*s); torso.add(belly);
    const chest = P0(19, 12, 12, main); chest.position.set(0, (36-41)*s, 4*s); chest.rotation.x = .45; torso.add(chest);
    const strap = P0(20, 2.5, 13, "#2a2016"); strap.position.set(0, (33-41)*s, 3*s); strap.rotation.set(.45, 0, .5); torso.add(strap);
    for (const side of [-1, 1]){
      const arm = new THREE.Group(); arm.position.set(side*11*s, 39*s, 6*s); detail.add(arm);
      const up = P0(5, 10, 5, main); up.position.y = -5*s; arm.add(up);
      const fo = P0(5, 10, 5, main); fo.position.set(0, -14*s, 1*s); arm.add(fo);
      const cl = P0(6, 5, 6, dark); cl.position.set(0, -20*s, 1.5*s); arm.add(cl);
      if (side > 0){
        const bl = P0(2.5, 15, 1.5, "#8f8a80"); bl.position.set(0, -24*s, 8*s); bl.rotation.x = 1.35; arm.add(bl);
        const hi = P0(3, 4, 3, "#3a2a1a"); hi.position.set(0, -22*s, 2.5*s); hi.rotation.x = 1.35; arm.add(hi);
      }
      g.arms[side>0?1:0].parent.remove(g.arms[side>0?1:0]); g.arms[side>0?1:0] = arm;
    }
    const hd = new THREE.Group(); hd.position.set(0, -11*s, 9*s); neck.add(hd);
    const skull = P0(15, 12, 13, main); hd.add(skull);
    const brow = P0(15, 3, 3, dark); brow.position.set(0, 3*s, 6.4*s); brow.rotation.x = .25; hd.add(brow);
    const nose = P0(4, 4, 8, main); nose.position.set(0, -1*s, 9*s); nose.rotation.x = .35; hd.add(nose);
    const mouth = P0(9, 2, 1, "#1a0c0c"); mouth.position.set(0, -4.5*s, 6.6*s); hd.add(mouth);
    for (const side of [-1, 1]){
      const ear = P0(13, 5, 2, main); ear.position.set(side*12*s, 2*s, -1*s); ear.rotation.set(0, side*-.25, side*.45); hd.add(ear);
      const eye = P0(3.5, 3, 1.5, glow, glowOpts(glow)); eye.position.set(side*3.8*s, 1*s, 6.8*s); hd.add(eye);
      const tooth = P0(1.6, 2.6, 1.2, "#e8dcc0"); tooth.position.set(side*2.6*s, -5.4*s, 6.9*s); hd.add(tooth);
    }
    g.hunch = .32;
  } else if (body === "serpent"){
    // serpiente gigante (Kasaka): cuerpo de anillos que ondula, capucha y colmillos
    g.spine = [];
    const H = [50, 40, 28, 17, 10, 7, 6, 5.5, 5, 4.5];
    let w = 17;
    for (let i = 0; i < H.length; i++){
      const seg = new THREE.Group(); seg.position.set(0, H[i]*s, (16 - i*10)*s); detail.add(seg);
      const m = P0(w, w*.82, 13, main); seg.add(m);
      const belly = P0(w*.7, 2.2, 12.6, cfg.hair || "#d8c9a0"); belly.position.set(0, -w*.41*s, 1*s); seg.add(belly);
      if (i % 2 === 0){ const sc = P0(w*.55, 1.6, 6, dark); sc.position.set(0, w*.42*s, 0); seg.add(sc); }
      if (i === 1){
        for (const side of [-1, 1]){
          const hood = P0(14, 20, 2.5, dark); hood.position.set(side*10*s, 4*s, -1*s); hood.rotation.set(-.15, side*-.55, side*-.2); seg.add(hood);
          const rim = P0(2, 18, 2.8, glow, glowOpts(glow)); rim.position.set(side*16*s, 4*s, -3.5*s); rim.rotation.y = side*-.55; seg.add(rim);
        }
      }
      if (i === 0){
        const skull = P0(15, 9, 17, main); skull.position.set(0, 3*s, 6*s); seg.add(skull);
        const jaw = new THREE.Group(); jaw.position.set(0, -1*s, 2*s); seg.add(jaw); g.jaw = jaw;
        const lj = P0(12, 3, 14, dark); lj.position.z = 6*s; jaw.add(lj);
        for (const side of [-1, 1]){
          const fang = P0(1.8, 6, 1.8, "#f4ecd8"); fang.position.set(side*4*s, -1*s, 13*s); seg.add(fang);
          const eye = P0(3.5, 2.5, 3, glow, glowOpts(glow)); eye.position.set(side*6.2*s, 5*s, 10*s); seg.add(eye);
        }
      }
      g.spine.push(seg);
      w = Math.max(6, w - 1.3);
    }
    const tip = P0(3, 3, 10, glow, glowOpts(glow)); tip.position.set(0, 0, -7*s); g.spine[g.spine.length-1].add(tip);
  } else if (body === "wolf"){
    // lobo: pecho alto, lomo con pelo erizado, patas articuladas y hocico largo
    g.gait = [];
    const chest = P0(21, 20, 20, main); chest.position.set(0, (37-41)*s, 9*s); torso.add(chest);
    const ruff = P0(24, 22, 10, cfg.hair || dark); ruff.position.set(0, (39-41)*s, 17*s); torso.add(ruff);
    const hind = P0(17, 16, 22, main); hind.position.set(0, (35-41)*s, -11*s); torso.add(hind);
    const bel = P0(14, 5, 30, dark); bel.position.set(0, (27-41)*s, 0); torso.add(bel);
    for (let i = 0; i < 5; i++){
      const hk = P0(4, 7 - i*.7, 5, cfg.hair || dark); hk.position.set(0, (48-41 - i*.8)*s, (12 - i*6)*s); hk.rotation.x = -.6; torso.add(hk);
    }
    for (const [sx, sz, ph] of [[-1, 13, 0], [1, 13, Math.PI], [-1, -15, Math.PI], [1, -15, 0]]){
      const hip = new THREE.Group(); hip.position.set(sx*8*s, 30*s, sz*s); detail.add(hip);
      const up = P0(7, 14, 9, main); up.position.y = -6*s; hip.add(up);
      const knee = new THREE.Group(); knee.position.set(0, -13*s, sz < 0 ? -2*s : 1*s); hip.add(knee);
      const lo = P0(5, 13, 5, dark); lo.position.y = -6*s; knee.add(lo);
      const paw = P0(7, 3.5, 9, dark); paw.position.set(0, -13*s, 2*s); knee.add(paw);
      g.gait.push({ n:hip, ph, amp:.6, base:0, axis:"x" });
      g.gait.push({ n:knee, ph:ph + 1.4, amp:.4, base: sz < 0 ? -.25 : .2, axis:"x" });
    }
    const tail = new THREE.Group(); tail.position.set(0, 38*s, -22*s); detail.add(tail);
    for (let i = 0; i < 3; i++){ const t = P0(7 - i*1.4, 7 - i*1.4, 9, cfg.hair || main); t.position.set(0, -i*2.5*s, -i*8*s); t.rotation.x = .35; tail.add(t); }
    detail.userData.tail = tail;
    const hd = new THREE.Group(); hd.position.set(0, -17*s, 26*s); neck.add(hd); g.head = hd;
    const skull = P0(15, 13, 14, main); hd.add(skull);
    const snout = P0(9, 7, 13, main); snout.position.set(0, -2.5*s, 12*s); hd.add(snout);
    const nose = P0(5, 3.5, 3, "#0c0c10"); nose.position.set(0, -.5*s, 19*s); hd.add(nose);
    const jaw = new THREE.Group(); jaw.position.set(0, -6*s, 5*s); hd.add(jaw); g.jaw = jaw;
    const lj = P0(8, 3, 12, dark); lj.position.z = 6*s; jaw.add(lj);
    for (const side of [-1, 1]){
      const ear = P0(4.5, 10, 3, main); ear.position.set(side*5*s, 10*s, -3*s); ear.rotation.z = side*-.2; hd.add(ear);
      const eye = P0(4, 2.2, 2, glow, glowOpts(glow)); eye.position.set(side*4.3*s, 2*s, 7.2*s); eye.rotation.z = side*.25; hd.add(eye);
      const fang = P0(1.4, 3.5, 1.4, "#f4ecd8"); fang.position.set(side*3*s, -6*s, 17*s); hd.add(fang);
    }
  } else if (body === "ant"){
    // hormiga de Jeju: caparazón brillante, mandíbulas y seis patas en trípode
    g.gait = [];
    const thorax = P0(20, 15, 22, main); thorax.position.set(0, (33-41)*s, 4*s); torso.add(thorax);
    const waist = P0(8, 8, 8, dark); waist.position.set(0, (32-41)*s, -9*s); torso.add(waist);
    const abd = P0(26, 22, 30, main); abd.position.set(0, (36-41)*s, -27*s); abd.rotation.x = -.25; torso.add(abd);
    for (let i = 0; i < 3; i++){
      const band = P0(27, 3, 3, glow, glowOpts(glow)); band.position.set(0, (38-41 + i*1.5)*s, (-18 - i*8)*s); band.rotation.x = -.25; torso.add(band);
    }
    const ridge = P0(6, 4, 20, dark); ridge.position.set(0, (41-41)*s, 4*s); torso.add(ridge);
    let li = 0;
    for (const sz of [13, 3, -7]){
      for (const side of [-1, 1]){
        const hip = new THREE.Group(); hip.position.set(side*10*s, 30*s, sz*s); detail.add(hip);
        const fem = P0(15, 3.5, 3.5, dark); fem.position.set(side*7*s, 4*s, 0); fem.rotation.z = side*.5; hip.add(fem);
        const tib = P0(3, 22, 3, dark); tib.position.set(side*15*s, -7*s, 0); tib.rotation.z = side*-.2; hip.add(tib);
        const ph = (li % 2 === 0) === (side < 0) ? 0 : Math.PI;
        g.gait.push({ n:hip, ph, amp:.45, base:0, axis:"y" });
        g.gait.push({ n:hip, ph:ph + Math.PI/2, amp:.18, base:0, axis:"z", sign:side });
      }
      li++;
    }
    const hd = new THREE.Group(); hd.position.set(0, -20*s, 19*s); neck.add(hd);
    const skull = P0(17, 13, 14, main); hd.add(skull);
    const crest = P0(12, 3, 10, glow, glowOpts(glow)); crest.position.set(0, 7*s, 0); hd.add(crest);
    g.mandibles = [];
    for (const side of [-1, 1]){
      const mj = new THREE.Group(); mj.position.set(side*5*s, -4*s, 7*s); hd.add(mj); mj.userData.side = side;
      const m1 = P0(3.5, 3.5, 12, dark); m1.position.z = 6*s; mj.add(m1);
      const m2 = P0(6, 3, 3, dark); m2.position.set(-side*2.5*s, 0, 12*s); mj.add(m2);
      g.mandibles.push(mj);
      const eye = P0(6, 6, 3, glow, glowOpts(glow)); eye.position.set(side*7*s, 2*s, 4*s); hd.add(eye);
      const ant = P0(2, 16, 2, dark); ant.position.set(side*4*s, 12*s, 3*s); ant.rotation.set(-.7, 0, side*.35); hd.add(ant);
    }
  } else {
    // espectro: flota, sin piernas, capucha y jirones; máscara del Sistema,
    // cadenas espectrales y fragmentos de runa orbitando a su alrededor
    const hood = P0(22, 18, 20, dark); hood.position.y = 4*s; neck.add(hood);
    const hoodTip = P0(14, 8, 14, dark); hoodTip.position.set(0, 14*s, -4*s); hoodTip.rotation.x = -.4; neck.add(hoodTip);
    const face = P0(15, 11, 3, "#05070f"); face.position.set(0, 1*s, 10*s); neck.add(face);
    const mask = P0(13, 9, 1.5, "#d8dcf0"); mask.position.set(0, 1*s, 11.8*s); neck.add(mask);
    for (const side of [-1, 1]){
      const eye = P0(4, 1.8, 2, glow, glowOpts(glow)); eye.position.set(side*3.5*s, 2.5*s, 12.8*s); eye.rotation.z = side*.25; neck.add(eye);
    }
    const mline = P0(1.5, 6, 1, glow, glowOpts(glow)); mline.position.set(0, -1*s, 12.8*s); neck.add(mline);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++){
      const link = P0(3, 3, 3, "#5a5f7a"); link.position.set(side*(12 - i)*s, (-4 - i*6)*s, 6*s); link.rotation.z = .7; torso.add(link);
    }
    const orbit = new THREE.Group(); orbit.position.y = 44*s; detail.add(orbit);
    for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2; const sh2 = P0(5, 9, 2, glow, glowOpts(glow));
      sh2.position.set(Math.cos(a) * 26*s, (i % 2 ? 6 : -4)*s, Math.sin(a) * 26*s); sh2.rotation.y = -a; orbit.add(sh2); }
    g.orbit = orbit;
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
  addFeatures(detail, cfg, s, opts);
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
    if (cfg.laces){
      // botas altas con cordones cruzados
      const shaft = P0(13, 7, 14, cfg.boots); shaft.position.set(0, -18.5 * s, 1 * s); hip.add(shaft);
      for (let k = 0; k < 3; k++){ const lc = P0(8, 1, 1, cfg.laces); lc.position.set(0, (-26 + k * 3.2) * s, 9.6 * s); lc.rotation.z = k % 2 ? .35 : -.35; hip.add(lc); }
      const sole = P0(14.5, 2, 17.5, "#0a0a10"); sole.position.set(0, -28.6 * s, 1.5 * s); hip.add(sole);
    }
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
    if (cfg.capeLong){ cape.scale.y = 1.45; cape.position.y = 34 * s; }
  }
  // brazos
  g.arms = [];
  for (const side of [-1, 1]){
    const sh = new THREE.Group();
    sh.position.set(side * 17 * s, 54 * s, 0);
    const sleeve = P0(10.5, 11, 12, cfg.sleeve || shirt);
    sleeve.position.y = -5 * s;
    const arm = P0(9.5, 15, 11, cfg.armColor || skin);
    arm.position.y = -17 * s;
    const hand = P0(10, 6, 11.5, cfg.glove || skin);
    hand.position.y = -27 * s;
    sh.add(sleeve, arm, hand);
    detail.add(sh); g.arms.push(sh);
  }
  if (cfg.shield){
    // escudo de torre en el brazo izquierdo, con blasón encendido
    const sg = new THREE.Group(); sg.position.set(-6 * s, -18 * s, 4 * s); g.arms[0].add(sg);
    const board = P0(3.5, 26, 18, cfg.shield); sg.add(board);
    const rim = P0(4, 27.5, 2, cfg.pauldron || "#1a1826"); rim.position.z = 9 * s; sg.add(rim);
    const rim2 = P0(4, 27.5, 2, cfg.pauldron || "#1a1826"); rim2.position.z = -9 * s; sg.add(rim2);
    if (cfg.shieldGlow){
      const em = P0(1.5, 8, 5, cfg.shieldGlow, { ...opts, emissive:cfg.shieldGlow, emissiveIntensity:1.2 });
      em.position.x = -2 * s; sg.add(em);
    }
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
    const c2 = P0(5, 5, 2.5, cfg.core, { ...opts, emissive:cfg.core, emissiveIntensity:1.1 });
    c2.position.set(0, 41 * s, 9.2 * s); detail.add(c2);
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
  // La cara solo entra en la pasada transparente si de verdad lo es: marcarla
  // siempre como transparente la hacía traslúcida y desordenaba la profundidad.
  const faceAlpha = opts.opacity ?? 1;
  const faceMat = new THREE.MeshLambertMaterial({
    map: cfg.hero ? heroFaceTexture(cfg.iris || "#4a5a78", !!cfg.glowEyes, skin, cfg.scar)
                  : faceTexture(cfg.eyes || "#12172b", !!cfg.glowEyes, skin, cfg.grin),
    transparent: faceAlpha < 1, opacity: faceAlpha,
  });
  const headMat = [mat(skin, opts), mat(skin, opts), mat(skin, opts), mat(skin, opts),
                   faceMat, mat(skin, opts)];
  const head = new THREE.Mesh(boxGeo(19*s, 18*s, 17.5*s), headMat);
  head.castShadow = true; head.position.y = 12 * s;
  neck.add(head);
  if (cfg.hero){
    // nariz y orejas en relieve: la cabeza deja de ser un cubo liso
    const nose = P0(2.6, 3.5, 2, cfg.noseColor || "#d9a57c"); nose.position.set(0, 10 * s, 9.4 * s); neck.add(nose);
    for (const sd of [-1, 1]){ const ear = P0(2.5, 6, 4, skin); ear.position.set(sd * 10.3 * s, 12 * s, 0); neck.add(ear); }
  }
  if (cfg.headband){
    const hb = P0(20, 3, 18.5, cfg.headband, { ...opts, emissive:cfg.headband, emissiveIntensity:.5 }); hb.position.y = 17 * s; neck.add(hb);
    const tail = P0(3, 10, 2, cfg.headband); tail.position.set(4 * s, 13 * s, -10 * s); tail.rotation.z = .3; neck.add(tail);
  }
  if (cfg.mask){
    const mk = P0(19.5, 7, 2, cfg.mask); mk.position.set(0, 7 * s, 9.2 * s); neck.add(mk);
    const ml = P0(12, 1, 1, "#ff3a4a", { ...opts, emissive:"#ff3a4a", emissiveIntensity:1 }); ml.position.set(0, 8 * s, 10.4 * s); neck.add(ml);
  }
  if (cfg.backSword){
    const bs = new THREE.Group(); bs.position.set(0, 42 * s, -10 * s); bs.rotation.z = .6; detail.add(bs);
    const bl = P0(5, 40, 2, cfg.backSword, { ...opts, emissive:cfg.backSword, emissiveIntensity:.6 }); bl.position.y = 8 * s; bs.add(bl);
    const gd = P0(14, 3, 5, "#2a2438"); gd.position.y = -13 * s; bs.add(gd);
    const gp = P0(3.5, 9, 3.5, "#1a1426"); gp.position.y = -19 * s; bs.add(gp);
  }
  if (cfg.longHair && !cfg.helm && !cfg.hood){
    const mane = P0(18.5, 18, 4, cfg.longHair); mane.position.set(0, 8 * s, -9 * s); neck.add(mane);
    for (const sd of [-1, 1]){ const lock = P0(3, 14, 6, cfg.longHair); lock.position.set(sd * 9.5 * s, 11 * s, 4 * s); neck.add(lock); }
  }
  if (cfg.hair && !cfg.helm && !cfg.hood && !cfg.spikyHair){
    const top = P0(19.5, 4, 18, cfg.hair); top.position.y = 22 * s; neck.add(top);
    const back = P0(18.5, 9, 3, cfg.hair); back.position.set(0, 15 * s, -8 * s); neck.add(back);
    const fringe = P0(18.5, 4.5, 3, cfg.hair); fringe.position.set(0, 19 * s, 8 * s); neck.add(fringe);
  }
  if (cfg.coat && cfg.coatOpen){
    // abrigo largo abierto: dos faldones a los lados del pecho (se ve la
    // camiseta), espalda hasta los tobillos, cuello alto y capucha caída
    for (const sd of [-1, 1]){
      const pan = P0(8.5, 44, 3.5, cfg.coat); pan.position.set(sd * 10.2 * s, 32 * s, 8.4 * s); detail.add(pan);
      const hem = P0(9, 20, 3, cfg.coat); hem.position.set(sd * 10.4 * s, 5 * s, 9 * s); hem.rotation.x = -.12; hem.rotation.z = sd * .08; detail.add(hem); g.coatHems = (g.coatHems || []).concat(hem);
      const lap = P0(4, 14, 2, cfg.coat); lap.position.set(sd * 6.5 * s, 49 * s, 9.6 * s); lap.rotation.z = sd * -.25; detail.add(lap);
      const flank = P0(3.5, 50, 17, cfg.coat); flank.position.set(sd * 14.5 * s, 29 * s, 0); detail.add(flank);
    }
    const back = P0(28, 56, 3.5, cfg.coat); back.position.set(0, 26 * s, -9 * s); detail.add(back); g.coatBack = back;
    const hoodB = P0(20, 12, 7, cfg.coat); hoodB.position.set(0, 58 * s, -9 * s); hoodB.rotation.x = .3; detail.add(hoodB);
    const collar = P0(22, 6, 18, cfg.coat); collar.position.y = 55 * s; detail.add(collar);
  } else if (cfg.coat){
    // Abrigo largo de faldones: dos delante y uno detrás, con las líneas
    // encendidas que recorren la tela. Es la silueta del cazador despertado.
    for (const [dx, w] of [[-7, 12], [7, 12]]){
      const panel = P0(w, 30, 3.5, cfg.coat);
      panel.position.set(dx * s, 14 * s, 8.6 * s); detail.add(panel);
      if (cfg.trim){
        const line = P0(2, 26, 1.2, cfg.trim, { ...opts, emissive:cfg.trim, emissiveIntensity:1.1 });
        line.position.set(dx * s, 14 * s, 10.4 * s); detail.add(line);
      }
    }
    const back = P0(27, 34, 3.5, cfg.coat);
    back.position.set(0, 12 * s, -9 * s); detail.add(back);
    g.coatBack = back;
    for (const side of [-1, 1]){
      const flank = P0(3.5, 28, 17, cfg.coat);
      flank.position.set(side * 14.5 * s, 14 * s, 0); detail.add(flank);
    }
  }
  if (cfg.trim){
    // vetas de energía: pecho, hombros y antebrazos
    for (const dx of [-5.5, 5.5]){
      const v = P0(1.8, 22, 1.2, cfg.trim, { ...opts, emissive:cfg.trim, emissiveIntensity:1.2 });
      v.position.set(dx * s, 44 * s, 8.6 * s); detail.add(v);
    }
    const belt2 = P0(24, 2, 1.5, cfg.trim, { ...opts, emissive:cfg.trim, emissiveIntensity:1.2 });
    belt2.position.set(0, 31 * s, 8.8 * s); detail.add(belt2);
    for (let i = 0; i < 2; i++){
      const band = P0(11.5, 2, 12.5, cfg.trim, { ...opts, emissive:cfg.trim, emissiveIntensity:1 });
      band.position.y = -13 * s; g.arms[i].add(band);
    }
  }
  if (cfg.tatters){
    // Jirones de sombra: tiras largas que cuelgan de la espalda y ondean.
    g.tatters = [];
    const col = cfg.tatters;
    let i = 0;
    for (const dx of [-9, -3, 3, 9]){
      const len = 26 + ((i % 2) ? 10 : 0);
      const strip = P0(5.5, len, 2.5, col, { ...opts, opacity:(opts.opacity ?? 1) * (.85 - i * .06) });
      strip.position.set(dx * s, (48 - len / 2) * s, -9.5 * s);
      detail.add(strip); g.tatters.push(strip);
      i++;
    }
    const collar = P0(24, 7, 8, col, { ...opts, opacity:(opts.opacity ?? 1) * .95 });
    collar.position.set(0, 55 * s, -6 * s); detail.add(collar);
  }
  if (cfg.messyHair){
    // pelo negro revuelto: casquete, mechones de punta hacia atrás y los lados,
    // y un flequillo largo que cae sobre los ojos
    const H = cfg.messyHair;
    const cap = P0(20.5, 6, 19.5, H); cap.position.y = 21 * s; neck.add(cap);
    const backH = P0(20, 12, 5, H); backH.position.set(0, 15 * s, -8.5 * s); neck.add(backH);
    for (const sd of [-1, 1]){ const side = P0(3, 11, 15, H); side.position.set(sd * 10 * s, 15 * s, -1 * s); neck.add(side);
      const burn = P0(2.5, 6, 3, H); burn.position.set(sd * 9.8 * s, 10 * s, 5 * s); neck.add(burn); }
    const tufts = [[-7,-3,8,-.7,-.5],[-2,-6,9,-.2,-.8],[4,-5,8,.4,-.7],[8,-1,7,.9,-.3],[-8,3,6,-1,.2],[2,1,8,.1,-.3],[6,4,6,.8,.3],[-4,-1,9,-.4,-.4],[0,-8,7,0,-1.1]];
    for (const [dx, dz, h, tz, tx] of tufts){ const t = P0(4.2, h, 4.2, H); t.position.set(dx * s, (23 + h / 2) * s, dz * s); t.rotation.set(tx, 0, tz); neck.add(t); }
    // flequillo: mechones que tapan la frente y bajan entre los ojos
    for (const [dx, h, tz] of [[-6.5, 7, .25], [-2.5, 9, .1], [1.5, 10, -.12], [5.5, 7, -.3]]){
      const f = P0(4.5, h, 3, H); f.position.set(dx * s, (20.5 - h / 2 + 2) * s, 9.2 * s); f.rotation.z = tz; f.rotation.x = -.18; neck.add(f); }
  }
  if (cfg.spikyHair){
    // pelo en púas: mechones inclinados en vez de un bloque liso
    const base = P0(19.5, 5, 18, cfg.spikyHair); base.position.y = 21 * s; neck.add(base);
    let n = 0;
    for (const [dx, dz, h, tilt] of [[-6,-4,6,-.6], [0,-6,7,-.4], [6,-4,6,.6],
                                     [-4,4,5,-.9], [4,4,5,.9], [0,0,7,0]]){
      const sp = P0(4 - (n % 2) * .8, h, 4, cfg.spikyHair);
      sp.position.set(dx * s, (23 + h / 2) * s, dz * s);
      sp.rotation.z = tilt; sp.rotation.x = -dz * .04;
      neck.add(sp); n++;
    }
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
    if (!cfg.hero){ const scarf = P0(20, 6, 18, cfg.hood2 || cfg.hood); scarf.position.y = 5 * s; neck.add(scarf); }
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
    } else if (kind === "dagger"){
      const gl = cfg.weaponGlow ? { ...opts, emissive:cfg.weapon, emissiveIntensity:1.3 } : opts;
      const blade = P0(4.5, 20, 2, cfg.weapon, gl); blade.position.y = 18 * s; wg.add(blade);
      const tip = P0(2.5, 5, 1.6, cfg.weapon, gl); tip.position.y = 30 * s; wg.add(tip);
      const guard = P0(10, 2.5, 4, "#3a3040"); guard.position.y = 7.5 * s; wg.add(guard);
      const grip = P0(3.5, 8, 3.5, "#2a2018"); grip.position.y = 2 * s; wg.add(grip);
    } else if (kind === "katana"){
      const blade = P0(3, 44, 1.4, cfg.weapon, { ...opts, emissive:cfg.weapon, emissiveIntensity:.25 });
      blade.position.set(0, 30 * s, .8 * s); blade.rotation.x = .05; wg.add(blade);
      const tsuba = P0(8, 1.8, 8, "#c9a33a"); tsuba.position.y = 8 * s; wg.add(tsuba);
      const tsuka = P0(3.2, 13, 3.2, "#1a1426"); tsuka.position.y = 1 * s; wg.add(tsuka);
      for (let i = 0; i < 3; i++){ const wr = P0(3.6, 1, 3.6, "#e8e0cc"); wr.position.y = (-3 + i * 4) * s; wg.add(wr); }
    } else if (kind === "monarchblade"){
      // espadón de hoja cian que brilla, con vetas negras como raíces y una
      // guarda negra de púas
      const G = cfg.weapon;
      const blade = P0(9, 66, 2.2, G, { ...opts, emissive:G, emissiveIntensity:1.5 }); blade.position.y = 44 * s; wg.add(blade);
      const tip = P0(7, 8, 2, G, { ...opts, emissive:G, emissiveIntensity:1.5 }); tip.position.set(1.5 * s, 80 * s, 0); tip.rotation.z = -.55; wg.add(tip);
      for (const [dx, y, h, rz] of [[-1.5, 22, 14, .15], [1.2, 34, 12, -.25], [-.8, 46, 16, .2], [1.6, 60, 10, -.3], [0, 70, 7, .1]]){
        const vein = P0(1.2, h, 2.6, "#0c0c14"); vein.position.set(dx * s, y * s, 0); vein.rotation.z = rz; wg.add(vein); }
      const guard = P0(20, 5, 7, "#101018"); guard.position.y = 11 * s; wg.add(guard);
      for (const sd of [-1, 1]){ const sp = P0(4, 10, 4, "#101018"); sp.position.set(sd * 10 * s, 14 * s, 0); sp.rotation.z = sd * -.6; wg.add(sp); }
      const grip = P0(4, 16, 4, "#101018"); grip.position.y = 1 * s; wg.add(grip);
      const pom = P0(6, 4, 6, "#101018"); pom.position.y = -8 * s; wg.add(pom);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(G), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.45 }));
      halo.scale.set(40 * s, 90 * s, 1); halo.position.y = 44 * s; wg.add(halo);
    } else if (kind === "greatsword"){
      const gl = cfg.weaponGlow ? { ...opts, emissive:cfg.weapon, emissiveIntensity:1.2 } : opts;
      const blade = P0(10, 54, 3, cfg.weapon, gl); blade.position.y = 37 * s; wg.add(blade);
      const fuller = P0(2.5, 44, 3.4, "#14101e"); fuller.position.y = 35 * s; wg.add(fuller);
      const guard = P0(22, 5, 7, "#1b1230"); guard.position.y = 9 * s; wg.add(guard);
      for (const sd of [-1, 1]){ const hk = P0(4, 7, 4, cfg.weapon, gl); hk.position.set(sd * 11 * s, 12 * s, 0); wg.add(hk); }
      const grip = P0(5, 13, 5, "#0e0a1c"); grip.position.y = 1 * s; wg.add(grip);
    } else if (kind === "hammer"){
      const haft = P0(4.5, 36, 4.5, "#5a4028"); haft.position.y = 16 * s; wg.add(haft);
      const head2 = P0(22, 14, 14, cfg.weapon); head2.position.y = 36 * s; wg.add(head2);
      for (const sd of [-1, 1]){ const cap = P0(4, 16, 16, "#2a2a30"); cap.position.set(sd * 12 * s, 36 * s, 0); wg.add(cap); }
      const spike = P0(4, 8, 4, "#2a2a30"); spike.position.y = 46 * s; wg.add(spike);
    } else if (kind === "spear"){
      const gl = cfg.weaponGlow ? { ...opts, emissive:cfg.weapon, emissiveIntensity:1.2 } : opts;
      const haft = P0(3.5, 60, 3.5, "#3a3a4a"); haft.position.y = 26 * s; wg.add(haft);
      const tip = P0(5, 18, 2.5, cfg.weapon, gl); tip.position.y = 64 * s; wg.add(tip);
      for (const sd of [-1, 1]){ const wing = P0(3, 8, 2, cfg.weapon, gl); wing.position.set(sd * 4 * s, 55 * s, 0); wing.rotation.z = sd * .5; wg.add(wing); }
      const ring2 = P0(6, 3, 6, "#c9a33a"); ring2.position.y = 53 * s; wg.add(ring2);
    } else if (kind === "claw"){
      const gl = { ...opts, emissive:cfg.weapon, emissiveIntensity:1.1 };
      const gaunt = P0(11, 8, 12, "#3a2418"); gaunt.position.y = 3 * s; wg.add(gaunt);
      for (const dx of [-3.5, 0, 3.5]){ const cl = P0(2, 16, 2, cfg.weapon, gl); cl.position.set(dx * s, 13 * s, 5 * s); cl.rotation.x = .35; wg.add(cl); }
    } else if (kind === "orb"){
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(8 * s, 0),
        mat(cfg.weapon, { ...opts, emissive: cfg.weapon, emissiveIntensity:1 }));
      orb.position.y = 16 * s; wg.add(orb); g.orb = orb;
      for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2; const r2 = P0(3, 3, 3, cfg.weapon, { ...opts, emissive:cfg.weapon, emissiveIntensity:1.4 });
        r2.position.set(Math.cos(a) * 13 * s, 16 * s, Math.sin(a) * 13 * s); wg.add(r2); }
    } else {
      const glowing = !!cfg.weaponGlow;
      const bopts = glowing ? { ...opts, emissive:cfg.weapon, emissiveIntensity:1.4 } : opts;
      const blade = P0(6, 38, 3, cfg.weapon, bopts); blade.position.y = 30 * s; wg.add(blade);
      const edge = P0(2.2, 40, 1.4, glowing ? "#ffffff" : cfg.weapon,
                      { ...opts, emissive: glowing ? cfg.weapon : 0, emissiveIntensity: glowing ? 1.8 : 0 });
      edge.position.set(2.6 * s, 31 * s, 0); wg.add(edge);
      const guard = P0(16, 4, 7, glowing ? "#1b1230" : "#8a7a5a"); guard.position.y = 11 * s; wg.add(guard);
      const grip = P0(5, 11, 5, glowing ? "#0e0a1c" : "#4a3a2a"); grip.position.y = 3 * s; wg.add(grip);
      if (glowing){
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture(cfg.weapon), transparent:true, depthWrite:false,
          blending:THREE.AdditiveBlending, opacity:.55 }));
        halo.scale.set(44 * s, 44 * s, 1); halo.position.y = 30 * s; wg.add(halo);
      }
    }
    wg.traverse(o => { if (o.isMesh){ o.castShadow = true; } });
    g.arms[1].add(wg);
    wg.position.set(0, -26 * s, 4 * s);
    g.weapon = wg;
  }
  addFeatures(detail, cfg, s, opts);
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
  const s = v.scaleRef, t = now();
  const U = v.userData.pose || (v.userData.pose = { lean:0, twist:0, sway:0, seed:Math.random() * 6.28 });
  const mv = o.moving ? 1 : 0;
  const walk = Math.sin(o.step);
  const breathe = Math.sin(t * 2.1 + U.seed);
  const atk = o.attack || 0, hurt = o.hurt || 0, air = o.air ? 1 : 0, dash = o.dash ? 1 : 0;
  // piernas: zancada al andar, recogidas en el aire
  if (air){
    v.legs[0].rotation.x += (-.75 - v.legs[0].rotation.x) * .3;
    v.legs[1].rotation.x += (.4 - v.legs[1].rotation.x) * .3;
  } else {
    const stride = mv ? walk * (.62 + dash * .3) : Math.sin(o.step * .5) * .06;
    v.legs[0].rotation.x = stride; v.legs[1].rotation.x = -stride;
  }
  // brazos: contrabalanceo, un poco abiertos y respirando en reposo
  const armOpen = mv ? .1 : .07 + breathe * .025;
  v.arms[0].rotation.z = -armOpen; v.arms[1].rotation.z = armOpen;
  v.arms[0].rotation.x = air ? -1.1 : dash ? .9 : -walk * .55 * mv + (mv ? 0 : breathe * .04);
  let twistT = 0;
  if (o.swing > 0){
    // golpe del jugador en tres tiempos: carga, tajo y recogida
    const dir = o.swingDir || 1, w = o.swing;
    if (w < .35){ const k = w / .35;  v.arms[1].rotation.x = -1.1 - 1.5 * k; twistT = .5 * k * dir; }
    else if (w < .75){ const k = (w - .35) / .4; v.arms[1].rotation.x = -2.6 + 2.4 * k; twistT = (.5 - 1.15 * k) * dir; }
    else { const k = (w - .75) / .25; v.arms[1].rotation.x = -.2 - .3 * (1 - k); twistT = -.65 * (1 - k) * dir; }
    v.arms[0].rotation.x = -.5 - twistT * .6 * dir;
  } else if (atk > 0){
    v.arms[1].rotation.x = -2.1 + (1 - atk) * .7;
    twistT = atk * .25;
  } else {
    v.arms[1].rotation.x = air ? -1.1 : dash ? .9 : walk * .55 * mv + (mv ? 0 : -breathe * .04);
  }
  // cuerpo entero: se inclina al correr y al hacer dash, se echa atrás al encajar
  const leanT = (v.hunch || 0) + mv * .12 + dash * .32 - hurt * .35 + (atk > 0 && !o.swing ? .12 : 0);
  U.lean += (leanT - U.lean) * .25;
  U.twist += (twistT - U.twist) * .45;
  U.sway += ((mv ? walk * .05 : 0) - U.sway) * .3;
  if (v.detail){
    v.detail.rotation.x = U.lean;
    v.detail.rotation.y = U.twist;
    v.detail.rotation.z = U.sway;
    v.detail.position.y = v.float ? (Math.sin(t * 2.4 + U.seed) * 3 + 2) * s : 0;
    v.detail.position.z = v.gait || v.spine ? atk * 9 * s : 0;       // embestida al atacar
  }
  // criaturas: patas articuladas, cuerpo de serpiente, mandíbulas
  if (v.gait){
    const k = mv ? 1 : .07;
    for (const G of v.gait){
      const val = (G.base || 0) + Math.sin(o.step * 1.15 + G.ph) * G.amp * k * (G.sign || 1);
      G.n.rotation[G.axis || "x"] = val;
    }
  }
  if (v.spine){
    const sp = mv ? 5 : 2, amp = (mv ? 7 : 3) * s;
    for (let i = 0; i < v.spine.length; i++){
      const sg = v.spine[i], f = Math.min(1, i / 2 + .25), ph = t * sp - i * .8 + U.seed;
      sg.position.x = Math.sin(ph) * amp * f;
      sg.rotation.y = Math.cos(ph) * .35 * f;
    }
    v.spine[0].rotation.x = -atk * .55 - hurt * .3 + Math.sin(t * 1.3 + U.seed) * .05;
    v.spine[1].rotation.x = -atk * .25;
  }
  if (v.jaw) v.jaw.rotation.x = .08 + atk * .7 + hurt * .35 + (mv ? 0 : Math.max(0, Math.sin(t * .9 + U.seed)) * .12);
  if (v.head) v.head.rotation.x = (mv ? Math.sin(o.step * 2.3) * .06 : Math.sin(t * .8 + U.seed) * .08) - atk * .2;
  if (v.spinHalo) v.spinHalo.rotation.z = t * .8;
  if (v.orbit){ v.orbit.rotation.y = t * 1.6 + U.seed; v.orbit.position.y = (44 + Math.sin(t * 2) * 3) * s; }
  if (v.mandibles) for (const mj of v.mandibles)
    mj.rotation.y = mj.userData.side * (.12 + Math.abs(Math.sin(t * (atk ? 16 : 3) + U.seed)) * (atk ? .55 : .14));
  const bob = o.moving ? Math.abs(Math.sin(o.step)) * 1.8 * s : breathe * .5 * s;
  v.torso.position.y = (41 * s) + bob;
  v.torso.scale.y = 1 + (mv ? 0 : breathe * .018);
  v.neck.position.y = (56 * s) + bob;
  v.neck.rotation.x = -U.lean * .5 + (mv ? 0 : Math.sin(t * .7 + U.seed) * .04);
  v.neck.rotation.y = -U.twist * .4 + (mv ? 0 : Math.sin(t * .45 + U.seed) * .12);
  const F = v.detail && v.detail.userData;
  if (F){
    if (F.wings) for (const w of F.wings){
      const flap = Math.sin(t * (mv ? 9 : 4.5) + U.seed);
      w.rotation.y = w.userData.side * (flap * .45 - .1);
      w.rotation.z = w.userData.side * flap * .12;
    }
    if (F.tail){ F.tail.rotation.y = Math.sin(t * (mv ? 6 : 2.6) + U.seed) * .45; F.tail.rotation.x = Math.sin(t * 1.7) * .1; }
    if (F.halo){ F.halo.rotation.y = t * 1.4; F.halo.position.y = F.halo.userData.y0 + Math.sin(t * 2 + U.seed) * 2.5 * s; }
  }
  if (v.cape) v.cape.rotation.x = -.08 - U.lean * .8 - dash * .5
    + (o.moving ? Math.sin(o.step * 1.2) * .12 : Math.sin(t * 1.5) * .04);
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
/* Detalle pintado en la loseta de suelo según el bioma: matas de hierba,
   grietas de hielo, vetas de lava, losas de templo, circuitos de neón... */
function groundDetail(x, th){
  const R = Math.random, kind = th.prop;
  const blobs = (n, col, r0, r1, a) => { x.globalAlpha = a; x.fillStyle = col;
    for (let i = 0; i < n; i++){ x.beginPath(); x.arc(R()*256, R()*256, r0 + R()*(r1-r0), 0, 6.3); x.fill(); } };
  const cracks = (n, col, w, a) => { x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = w;
    for (let i = 0; i < n; i++){ let px = R()*256, py = R()*256; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++){ px += (R()-.5)*50; py += (R()-.5)*50; x.lineTo(px, py); } x.stroke(); } };
  const tufts = (n, col, a) => { x.globalAlpha = a; x.fillStyle = col;
    for (let i = 0; i < n; i++){ const px = R()*256, py = R()*256;
      for (let k = -1; k <= 1; k++) x.fillRect(px + k*3, py - 4 - Math.abs(k)*-2, 2, 6 - Math.abs(k)*2); } };
  if (kind === "forest" || kind === "royal" || kind === "shrine" || kind === "city" || kind === "guild"){
    blobs(18, "rgba(0,0,0,1)", 10, 26, .06);
    blobs(14, "rgba(255,255,160,1)", 8, 20, .07);
    tufts(70, "#2c6e2c", .45);
    if (kind === "royal" || kind === "shrine") blobs(26, kind === "shrine" ? "#ff9fbf" : "#fff3a0", 1.5, 3, .9);
  } else if (kind === "ice"){
    blobs(12, "#a8d8f5", 12, 30, .25);
    cracks(10, "#8cc4ea", 1.5, .6);
    blobs(40, "#ffffff", 1, 2.2, .95);
  } else if (kind === "volcano" || kind === "dragon"){
    blobs(16, "#000000", 10, 24, .18);
    cracks(kind === "volcano" ? 12 : 6, "#ff6a2a", 2.6, .85);
    cracks(kind === "volcano" ? 12 : 6, "#ffd27a", 1, .7);
  } else if (kind === "dark" || kind === "mystic" || kind === "dungeon"){
    blobs(20, "#000000", 10, 30, .16);
    tufts(40, kind === "dark" ? "#243324" : "#2a2250", .6);
    blobs(18, kind === "dark" ? "#9fb0ff" : "#c9a8ff", 1.2, 2.4, .8);
    if (kind !== "dark"){ x.globalAlpha = .35; x.strokeStyle = "#b08cff"; x.lineWidth = 1.5;
      for (let i = 0; i < 3; i++){ x.beginPath(); x.arc(R()*256, R()*256, 10 + R()*10, 0, 6.3); x.stroke(); } }
  } else if (kind === "storm"){
    blobs(22, "#2a3848", 8, 22, .25);
    blobs(10, "#9fb4c8", 6, 14, .3);
    cracks(5, "#3a4858", 1.5, .5);
  } else if (kind === "cyber"){
    x.globalAlpha = .55; x.strokeStyle = "#6ef0ff"; x.lineWidth = 1.5;
    for (let i = 0; i < 6; i++){ let px = Math.floor(R()*8)*32, py = Math.floor(R()*8)*32;
      x.beginPath(); x.moveTo(px, py); px += 32 * (R() < .5 ? 1 : -1); x.lineTo(px, py); py += 32; x.lineTo(px, py); x.stroke();
      x.fillStyle = "#ff5ad8"; x.fillRect(px - 2, py - 2, 4, 4); }
  } else if (kind === "urban"){
    blobs(14, "#5a6272", 6, 18, .3);
    cracks(6, "#4a5262", 1.2, .5);
  }
  x.globalAlpha = 1;
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
  groundDetail(x, th);
  x.globalAlpha = .14; x.fillStyle = "#ffffff";
  for (let i = 0; i < 220; i++) x.fillRect(Math.random()*256, Math.random()*256, 3, 3);
  x.globalAlpha = 1;
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
  // Islas flotantes: trozos de tierra colgados del cielo, con hierba arriba y
  // la roca acabando en punta. Acompañan al jugador como las nubes.
  for (let i = 0; i < 11; i++){
    const isle = new THREE.Group();
    const w = rnd(140, 320), d = w * rnd(.6, 1);
    const top = part(w, 24, d, "#57b94f"); top.position.y = 0; isle.add(top);
    const rock = part(w * .86, 46, d * .86, "#7a6a54"); rock.position.y = -34; isle.add(rock);
    const tip = part(w * .42, 54, d * .42, "#6b5c48"); tip.position.y = -80; isle.add(tip);
    const point = part(w * .16, 40, d * .16, "#5d5040"); point.position.y = -120; isle.add(point);
    // un par de árboles encima
    for (let t = 0; t < 2; t++){
      const tx = rnd(-w * .3, w * .3), tz = rnd(-d * .3, d * .3);
      const trunk = part(9, 26, 9, "#7a4a24"); trunk.position.set(tx, 25, tz); isle.add(trunk);
      const leaf = part(34, 26, 34, "#3ec24e"); leaf.position.set(tx, 48, tz); isle.add(leaf);
    }
    isle.traverse(o => { if (o.isMesh){ o.castShadow = false; o.receiveShadow = false; } });
    const a = (i / 11) * Math.PI * 2 + rnd(-.25, .25), rad = rnd(1250, 2600);
    isle.position.set(Math.cos(a) * rad, rnd(430, 900), Math.sin(a) * rad);
    isle.userData.skyIsle = true;
    scene.add(isle);
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

  // clima de cada bioma: nieve, ascuas, luciérnagas, pétalos, lluvia...
  const MOTES_N = 260;
  const moteGeo = new THREE.BufferGeometry();
  const mp = new Float32Array(MOTES_N * 3);
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color:0xffffff, size:6, map: dotTexture(), transparent:true, opacity:.8, depthWrite:false, alphaTest:.02 }));
  motes.frustumCulled = false;
  motes.userData.seeds = Array.from({ length:MOTES_N }, () => ({
    x:rnd(-900, 900), z:rnd(-900, 900), y:rnd(0, 520), ph:rnd(0, 6.28), sp:rnd(.6, 1.4) }));
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
  // El hash del mundo ya viene filtrado por `h % 5 === 0` al elegir las
  // casillas con prop, y eso sesgaba cualquier reparto sacado de sus bits:
  // salía siempre la misma variante. Se vuelve a mezclar antes de repartir.
  const mix = (n, salt) => {
    let r = (n ^ salt) >>> 0;
    r = Math.imul(r ^ (r >>> 16), 2246822507) >>> 0;
    r = Math.imul(r ^ (r >>> 13), 3266489909) >>> 0;
    return (r ^ (r >>> 16)) >>> 0;
  };
  const roll = mix(h, 0x9e37) % 10;            // reparto de variantes por bioma
  const pick = arr => arr[mix(h, 0x85eb) % arr.length];
  const add = (w, ht, d, col, x, y, z, o) => {
    const m = part(w, ht, d, col, o); m.position.set(x, y + ht/2, z); g.add(m); return m;
  };
  const glowOpts = c => ({ emissive:c, emissiveIntensity:1.1 });
  switch (kind){
    case "city": {
      // La ciudad mezcla: no todo son rascacielos. Según el hash sale una
      // torre, un árbol, una casa baja o un monumento, como en una isla real.
      if (roll < 3){                                   // árbol de ciudad
        add(11, 30, 11, "#7a4a24", 0, 0, 0);
        add(44, 30, 44, "#3ea84a", 0, 28, 0);
        add(30, 22, 30, "#4ec25c", 0, 54, 0);
        break;
      }
      if (roll < 5){                                   // casa baja de colores
        const c2 = pick(["#f2c14e","#e8734f","#4fa3e8","#8a6bd8","#4fc99a"]);
        add(78, 8, 78, "#b9c2d2", 0, 0, 0);
        add(70, 46, 70, c2, 0, 8, 0);
        add(82, 9, 82, "#e9eef7", 0, 54, 0);
        for (const dz of [37, -37]) add(40, 12, 2, "#ffe9a8", 0, 24, dz, glowOpts("#ffe9a8"));
        add(20, 16, 3, "#6b4a2a", 0, 8, 36);
        break;
      }
      if (roll === 5){                                 // monumento con arcos
        add(120, 10, 90, "#d8d2c2", 0, 0, 0);
        for (const dx of [-44, -15, 15, 44]) add(13, 62, 13, "#efe9da", dx, 10, 0);
        add(128, 14, 96, "#cfc7b4", 0, 72, 0);
        add(36, 26, 36, "#b9b09a", 0, 86, 0);
        add(10, 30, 10, "#7fd6ff", 0, 112, 0, glowOpts("#3ba9d6"));
        break;
      }
      // rascacielos con ventanas encendidas en las cuatro caras
      const body = pick(["#f2c14e","#e8734f","#4fa3e8","#8a6bd8","#4fc99a","#e85f8a","#f0f3ff"]);
      const floors = 3 + (v % 5), ht = 70 + floors * 26;
      add(96, 8, 96, "#b9c2d2", 0, 0, 0);
      add(88, ht, 88, body, 0, 8, 0);
      add(100, 10, 100, "#e9eef7", 0, 8 + ht, 0);
      const win = v % 2 ? "#ffe9a8" : "#9fe4ff";
      for (let i = 0; i < floors; i++){
        const y = 26 + i * 26;
        add(62, 12, 2, win, 0, y, 45, glowOpts(win));
        add(62, 12, 2, win, 0, y, -45, glowOpts(win));
        add(2, 12, 62, win, 45, y, 0, glowOpts(win));
        add(2, 12, 62, win, -45, y, 0, glowOpts(win));
      }
      add(26, 14, 26, "#cfd8e8", 0, 18 + ht, 0);
      add(5, 34, 5, "#8f9bb0", 0, 32 + ht, 0);
      add(8, 8, 8, "#ff5a6a", 0, 66 + ht, 0, glowOpts("#ff5a6a"));
      break;
    }
    case "forest": {
      if (roll < 3){                                   // árbol frondoso
        add(16, 46, 16, "#7a4a24", 0, 0, 0);
        add(70, 34, 70, "#2b9a3c", 0, 40, 0);
        add(52, 26, 52, "#3ec24e", 0, 70, 0);
        add(30, 18, 30, "#4ed45e", 0, 92, 0);
        break;
      }
      if (roll === 3){                                 // roca con musgo y matorral
        add(54, 26, 48, "#7c8a76", 0, 0, 0);
        add(34, 18, 30, "#8d9c86", 12, 24, -6);
        add(30, 10, 28, "#3ea84a", -14, 24, 8);
        break;
      }
      if (roll === 4){                                 // tronco caído con setas
        const log = add(22, 22, 84, "#6b4224", 0, 0, 0);
        log.rotation.y = (v % 60) * Math.PI / 180;
        add(9, 4, 9, "#d8d0b8", 6, 22, 18);
        add(12, 5, 12, "#c9503f", -8, 22, -14);
        break;
      }
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
      add(9, 9, 9, "#c98a3a", tx, topY - 6, 8);
      break;
    }
    case "ice": {
      if (roll < 3){                                   // aguja de hielo
        add(30, 70 + v, 30, "#dff3ff", 0, 0, 0, { opacity:.92 });
        add(18, 46, 18, "#ffffff", 4, 60 + v, -2, { opacity:.9 });
        add(10, 30, 10, "#bfe8ff", -8, 40, 6, { opacity:.85 });
        break;
      }
      if (roll === 3){                                 // arco helado
        for (const dx of [-30, 30]) add(16, 76, 20, "#e6f6ff", dx, 0, 0, { opacity:.93 });
        add(88, 16, 24, "#ffffff", 0, 76, 0, { opacity:.93 });
        add(12, 18, 12, "#7fd6ff", 0, 60, 0, glowOpts("#7fd6ff"));
        break;
      }
      if (roll === 4){                                 // bloque de hielo agrietado
        add(72, 40, 60, "#e9f7ff", 0, 0, 0, { opacity:.95 });
        add(74, 3, 62, "#8fd6ff", 0, 22, 0, glowOpts("#8fd6ff"));
        break;
      }
      add(16, 44, 16, "#6d4b2e", 0, 0, 0);             // abeto nevado
      add(68, 40, 68, "#dff3ff", 0, 40, 0);
      add(44, 32, 44, "#ffffff", 0, 74, 0);
      break;
    }
    case "urban": {
      if (roll < 2){                                   // nave baja con tejado
        add(120, 10, 96, "#6b7688", 0, 0, 0);
        add(110, 44, 88, "#98a3b5", 0, 10, 0);
        add(118, 8, 96, "#5c6676", 0, 54, 0);
        for (const dx of [-36, 0, 36]) add(22, 20, 2, "#cfe4ff", dx, 18, 45, glowOpts("#7fb7e8"));
        break;
      }
      if (roll === 2){                                 // torre de antenas
        add(48, 12, 48, "#5c6676", 0, 0, 0);
        add(20, 150 + v, 20, "#8592a6", 0, 12, 0);
        for (const y of [60, 100, 140]) add(56, 5, 56, "#6b7688", 0, y, 0);
        add(8, 30, 8, "#ff6a8a", 0, 162 + v, 0, glowOpts("#ff6a8a"));
        break;
      }
      if (roll === 3){                                 // valla publicitaria
        for (const dx of [-26, 26]) add(9, 70, 9, "#4a5364", dx, 0, 0);
        add(84, 44, 6, "#1d2534", 0, 62, 0);
        add(74, 34, 3, pick(["#ff6a8a","#4ff0ff","#ffd24a"]), 0, 67, 4,
            glowOpts(pick(["#ff6a8a","#4ff0ff","#ffd24a"])));
        break;
      }
      const ht2 = 110 + v * 1.6;                       // bloque de pisos
      add(104, 10, 104, "#7c8698", 0, 0, 0);
      add(94, ht2, 94, v % 2 ? "#9aa6b8" : "#8592a6", 0, 10, 0);
      for (let i = 0; i < 4 + (v % 3); i++){
        const y = 30 + i * 28;
        add(70, 13, 2, "#cfe4ff", 0, y, 48, glowOpts("#7fb7e8"));
        add(2, 13, 70, "#cfe4ff", -48, y, 0, glowOpts("#7fb7e8"));
      }
      add(10, 44, 3, "#ff6a8a", 40, 40, 49, glowOpts("#ff6a8a"));
      add(104, 12, 104, "#6b7688", 0, 10 + ht2, 0);
      break;
    }
    case "royal": {
      if (roll < 3){                                   // seto recortado con estatua
        add(70, 26, 70, "#4f9a55", 0, 0, 0);
        add(54, 16, 54, "#5cb063", 0, 26, 0);
        add(16, 30, 16, "#e8e2d0", 0, 42, 0);
        add(20, 10, 20, "#d4ccb6", 0, 72, 0);
        break;
      }
      if (roll === 3){                                 // fuente
        add(92, 12, 92, "#e8e2d0", 0, 0, 0);
        add(70, 10, 70, "#4aa8e8", 0, 12, 0, { opacity:.85 });
        add(20, 34, 20, "#d4ccb6", 0, 22, 0);
        add(30, 8, 30, "#efe9da", 0, 56, 0);
        break;
      }
      if (roll === 4){                                 // arco de entrada
        for (const dx of [-40, 40]) add(20, 96, 24, "#efe9da", dx, 0, 0);
        add(112, 20, 30, "#d8d0b8", 0, 96, 0);
        add(40, 22, 22, "#b8443f", 0, 116, 0);
        break;
      }
      add(84, 170 + v, 84, "#e8e2d0", 0, 0, 0);        // torre de palacio
      add(100, 24, 100, "#c9bfa4", 0, 170 + v, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(58, 70, 8), mat("#b8443f"));
      cone.position.y = 170 + v + 24 + 35; cone.castShadow = true; g.add(cone);
      break;
    }
    case "shrine": {
      if (roll < 3){                                   // farol de piedra
        add(30, 14, 30, "#9a9182", 0, 0, 0);
        add(14, 34, 14, "#b0a693", 0, 14, 0);
        add(34, 18, 34, "#c9c0ac", 0, 48, 0);
        add(20, 14, 20, "#ffcf7a", 0, 50, 0, glowOpts("#ffb347"));
        add(40, 8, 40, "#8e8576", 0, 66, 0);
        break;
      }
      if (roll === 3){                                 // pagoda de tres pisos
        add(86, 12, 86, "#9a9182", 0, 0, 0);
        let w2 = 70, y2 = 12;
        for (let i = 0; i < 3; i++){
          add(w2, 30, w2, "#d8b48a", 0, y2, 0);
          add(w2 + 26, 10, w2 + 26, "#b32f2f", 0, y2 + 30, 0);
          y2 += 40; w2 -= 14;
        }
        add(10, 26, 10, "#d33b3b", 0, y2, 0);
        break;
      }
      if (roll === 4){                                 // campana bajo pórtico
        for (const dx of [-30, 30]) add(12, 70, 12, "#8e7a5a", dx, 0, 0);
        add(84, 12, 26, "#6b5a3a", 0, 70, 0);
        add(30, 36, 30, "#c9a74a", 0, 30, 0, { emissive:"#6b5220", emissiveIntensity:.3 });
        break;
      }
      add(12, 112, 12, "#d33b3b", -34, 0, 0);          // torii
      add(12, 112, 12, "#d33b3b", 34, 0, 0);
      add(104, 12, 20, "#b32f2f", 0, 106, 0);
      add(122, 10, 24, "#d33b3b", 0, 120, 0);
      break;
    }
    case "dark": {
      if (roll < 3){                                   // muro derruido
        add(96, 44, 18, "#3a3a2e", 0, 0, 0);
        add(54, 26, 18, "#33332a", -18, 44, 0);
        add(20, 14, 18, "#2b2a24", 34, 44, 0);
        break;
      }
      if (roll === 3){                                 // torre con barrotes
        add(66, 100 + v, 66, "#2f2f28", 0, 0, 0);
        for (const dx of [-14, 0, 14]) add(4, 30, 4, "#5a5a4c", dx, 40, 34);
        add(74, 14, 74, "#23231d", 0, 100 + v, 0);
        add(10, 12, 10, "#ffb84d", 0, 60, 34, glowOpts("#ff9a2d"));
        break;
      }
      if (roll === 4){                                 // brasero
        add(34, 16, 34, "#3a3a2e", 0, 0, 0);
        add(16, 40, 16, "#2b2a24", 0, 16, 0);
        add(30, 12, 30, "#4a4a3c", 0, 56, 0);
        add(20, 14, 20, "#ff9a2d", 0, 62, 0, glowOpts("#ff6a1d"));
        break;
      }
      add(14, 72, 14, "#2b2a24", 0, 0, 0);             // árbol seco
      add(56, 12, 56, "#3a3a2e", 0, 68, 0);
      add(10, 14, 10, "#ffb84d", 24, 72, 0, glowOpts("#ff9a2d"));
      break;
    }
    case "dragon": {
      if (roll < 3){                                   // columna rota
        add(46, 70 + v, 46, "#6b5240", 0, 0, 0);
        add(54, 12, 54, "#59422f", 0, 70 + v, 0);
        add(26, 20, 26, "#4a3626", 10, 82 + v, -8);
        break;
      }
      if (roll === 3){                                 // grieta de lava
        add(90, 10, 70, "#241a1a", 0, 0, 0);
        add(70, 5, 50, "#ff5a1e", 0, 10, 0, glowOpts("#ff5a1e"));
        for (const dx of [-30, 26]) add(18, 30, 18, "#3a2a24", dx, 12, 0);
        break;
      }
      if (roll === 4){                                 // arco de hueso
        for (const dx of [-34, 34]) add(14, 80, 14, "#d8cfae", dx, 0, 0);
        add(96, 14, 18, "#c9bf9a", 0, 80, 0);
        add(24, 20, 20, "#b5ab86", 0, 94, 0);
        break;
      }
      add(72, 120 + v, 72, "#6b5240", 0, 0, 0);        // torre de roca
      add(46, 42, 46, "#59422f", 0, 120 + v, 0);
      break;
    }
    case "cyber": {
      if (roll < 3){                                   // panel holográfico
        add(40, 12, 40, "#1b2238", 0, 0, 0);
        for (const dx of [-16, 16]) add(7, 70, 7, "#2f3a5c", dx, 12, 0);
        const neon = pick(["#4ff0ff","#ff4fd0","#b98cff"]);
        add(66, 46, 4, neon, 0, 60, 0, glowOpts(neon));
        break;
      }
      if (roll === 3){                                 // bloque de servidores
        add(88, 14, 72, "#1b2238", 0, 0, 0);
        add(78, 56, 62, "#232b46", 0, 14, 0);
        for (let i = 0; i < 4; i++) add(70, 3, 2, "#4ff0ff", 0, 22 + i * 12, 32, glowOpts("#4ff0ff"));
        break;
      }
      if (roll === 4){                                 // antena de datos
        add(36, 10, 36, "#232b46", 0, 0, 0);
        add(12, 130 + v, 12, "#2f3a5c", 0, 10, 0);
        for (const y of [50, 90, 130]) add(44, 4, 4, "#ff4fd0", 0, y, 0, glowOpts("#ff4fd0"));
        add(14, 14, 14, "#4ff0ff", 0, 142 + v, 0, glowOpts("#4ff0ff"));
        break;
      }
      add(90, 210 + v*2, 90, "#232b46", 0, 0, 0);      // torre de neón
      for (let i = 0; i < 4; i++)
        add(58, 8, 2, i % 2 ? "#ff4fd0" : "#4ff0ff", 0, 40 + i*46, 46,
            glowOpts(i % 2 ? "#ff4fd0" : "#4ff0ff"));
      add(16, 40, 16, "#4ff0ff", 0, 210 + v*2, 0, glowOpts("#4ff0ff"));
      break;
    }
    case "volcano": {
      if (roll < 3){                                   // aguja de obsidiana
        add(34, 90 + v, 34, "#1c1418", 0, 0, 0);
        add(18, 40, 18, "#2a1e22", 8, 80 + v, -4);
        add(10, 20, 10, "#ff5a1e", 0, 40, 18, glowOpts("#ff5a1e"));
        break;
      }
      if (roll === 3){                                 // géiser de lava
        add(70, 16, 70, "#241a1a", 0, 0, 0);
        add(46, 26, 46, "#3a2420", 0, 16, 0);
        add(30, 18, 30, "#ff7a2a", 0, 42, 0, glowOpts("#ff5a1e"));
        add(14, 46, 14, "#ffb07a", 0, 58, 0, { emissive:"#ff7a2a", emissiveIntensity:1.3, opacity:.8 });
        break;
      }
      if (roll === 4){                                 // cráter humeante
        add(110, 14, 110, "#2a1e1e", 0, 0, 0);
        add(78, 10, 78, "#ff5a1e", 0, 14, 0, glowOpts("#ff5a1e"));
        for (const [dx, dz] of [[-44,0],[44,0],[0,-44],[0,44]]) add(24, 26, 24, "#241a1a", dx, 14, dz);
        break;
      }
      add(82, 60 + v, 82, "#241a1a", 0, 0, 0);         // roca volcánica
      add(46, 16, 46, "#ff5a1e", 0, 60 + v, 0, glowOpts("#ff5a1e"));
      break;
    }
    case "guild": {
      if (roll < 3){                                   // casa del gremio
        add(90, 10, 80, "#a9b4c6", 0, 0, 0);
        add(80, 50, 70, "#e3e9f3", 0, 10, 0);
        add(92, 12, 82, "#6b7a94", 0, 60, 0);
        add(24, 26, 3, "#6b4a2a", 0, 10, 36);
        add(40, 10, 3, "#3f7fd0", 0, 46, 37, glowOpts("#3f7fd0"));
        break;
      }
      if (roll === 3){                                 // muñeco de entrenamiento
        add(34, 10, 34, "#8a7a5a", 0, 0, 0);
        add(12, 54, 12, "#6b5a3a", 0, 10, 0);
        add(34, 26, 20, "#c9a06a", 0, 46, 0);
        add(18, 18, 16, "#b08a5a", 0, 72, 0);
        break;
      }
      if (roll === 4){                                 // postes con estandartes
        for (const dx of [-34, 34]){
          add(10, 92, 10, "#6b7a94", dx, 0, 0);
          add(26, 44, 3, "#3f7fd0", dx, 40, 6, glowOpts("#3f7fd0"));
        }
        add(88, 8, 12, "#c9d4e4", 0, 92, 0);
        break;
      }
      add(112, 122, 112, "#c9d4e4", 0, 0, 0);          // salón del gremio
      add(128, 20, 128, "#6b7a94", 0, 122, 0);
      add(8, 60, 8, "#8a97b0", -40, 142, 0);
      add(34, 26, 2, "#3f7fd0", -24, 168, 4, glowOpts("#3f7fd0"));
      break;
    }
    case "mystic": {
      if (roll < 3){                                   // obelisco rúnico
        add(40, 14, 40, "#3a3468", 0, 0, 0);
        add(26, 96 + v, 26, "#4b428c", 0, 14, 0);
        for (const y of [40, 70, 100]) add(28, 4, 28, "#c0a8ff", 0, y, 0, glowOpts("#8a6bff"));
        break;
      }
      if (roll === 3){                                 // arco de runas
        for (const dx of [-32, 32]) add(16, 78, 16, "#4b428c", dx, 0, 0);
        add(88, 14, 20, "#5b4fa8", 0, 78, 0);
        add(24, 24, 6, "#c0a8ff", 0, 54, 0, glowOpts("#8a6bff"));
        break;
      }
      if (roll === 4){                                 // piedra flotante
        add(46, 26, 40, "#3e3a72", 0, 40, 0, { opacity:.95 });
        add(26, 10, 24, "#8a6bff", 0, 36, 0, glowOpts("#8a6bff"));
        add(18, 30, 18, "#5b46b0", 0, 4, 0, { opacity:.7 });
        g.userData.spin = true;
        break;
      }
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(30),
        mat("#8a6bff", { emissive:"#6b4cff", emissiveIntensity:.7, opacity:.92 }));
      crystal.position.y = 70 + v; crystal.castShadow = true; g.add(crystal);
      add(16, 32, 16, "#5b46b0", 0, 18, 0, { opacity:.8 });
      g.userData.spin = true;
      break;
    }
    case "storm": {
      if (roll < 3){                                   // pararrayos
        add(44, 12, 44, "#4e5e6c", 0, 0, 0);
        add(14, 120 + v, 14, "#8b98a8", 0, 12, 0);
        add(30, 6, 30, "#6b7a8c", 0, 70, 0);
        add(8, 22, 8, "#dfe8f5", 0, 132 + v, 0, glowOpts("#bcd8ff"));
        break;
      }
      if (roll === 3){                                 // molino
        add(60, 14, 60, "#5a6b7a", 0, 0, 0);
        add(40, 90, 40, "#8b98a8", 0, 14, 0);
        add(48, 16, 48, "#c3cedd", 0, 104, 0);
        for (let a = 0; a < 4; a++){
          const bl = part(70, 8, 6, "#dfe8f5");
          bl.position.set(0, 86, 26); bl.rotation.z = a * Math.PI / 2;
          g.add(bl);
        }
        break;
      }
      if (roll === 4){                                 // columna partida
        add(40, 60 + v, 40, "#6b7a8c", 0, 0, 0);
        add(46, 10, 46, "#8b98a8", 0, 60 + v, 0);
        add(24, 26, 24, "#5a6b7a", 12, 70 + v, -6);
        break;
      }
      add(98, 30, 98, "#6b7a8c", 0, 0, 0);             // torre de vigía
      add(14, 92, 14, "#8b98a8", 0, 30, 0);
      add(82, 10, 18, "#c3cedd", 0, 120, 0);
      break;
    }
    case "dungeon": {
      if (roll < 3){                                   // jaula
        add(56, 8, 56, "#241a33", 0, 0, 0);
        for (const [dx, dz] of [[-22,-22],[22,-22],[-22,22],[22,22]]) add(6, 60, 6, "#3a2a4f", dx, 8, dz);
        add(60, 8, 60, "#241a33", 0, 68, 0);
        add(18, 18, 18, "#ff4646", 0, 24, 0, glowOpts("#ff2222"));
        break;
      }
      if (roll === 3){                                 // altar
        add(72, 14, 72, "#2b1f3d", 0, 0, 0);
        add(48, 22, 48, "#3a2a4f", 0, 14, 0);
        add(26, 10, 26, "#ff4646", 0, 36, 0, glowOpts("#ff2222"));
        for (const dx of [-30, 30]) add(8, 40, 8, "#241a33", dx, 14, 0);
        break;
      }
      if (roll === 4){                                 // muro de púas
        add(90, 20, 20, "#241a33", 0, 0, 0);
        for (const dx of [-32, -11, 11, 32]) add(8, 34, 8, "#5a4a6f", dx, 20, 0);
        break;
      }
      add(48, 200, 48, "#241a33", 0, 0, 0);            // pilar
      add(62, 18, 62, "#3a2a4f", 0, 200, 0);
      add(12, 56, 2, "#ff4646", 0, 110, 25, glowOpts("#ff2222"));
      break;
    }
  }
  return g;
}
/* ---------------------------------------------------------------------------
   Frontera entre regiones. Antes cruzar de zona era un cambio de tema
   instantáneo y nada más: no se veía venir. Ahora cada anillo tiene un muro
   de portales — pilares con una cortina de energía del color de la región de
   destino y un cartel con su nombre y nivel — que solo se construye en el
   trozo de círculo que tienes delante.
   --------------------------------------------------------------------------- */
const borderPool = [];
let borderRing = -1, borderSignLabel = null;
function buildBorderGate(color){
  const g = new THREE.Group();
  const col = new THREE.Color(color);
  for (const dx of [-95, 95]){
    const post = part(22, 250, 22, "#141a30", { emissive:color, emissiveIntensity:.35 });
    post.position.set(dx, 125, 0); g.add(post);
    // franjas encendidas para que el poste se lea de lejos
    for (const y of [60, 130, 200]){
      const band = part(28, 10, 28, color, { emissive:color, emissiveIntensity:1.3 });
      band.position.set(dx, y, 0); g.add(band);
    }
    const cap = part(34, 18, 34, color, { emissive:color, emissiveIntensity:1.4 });
    cap.position.set(dx, 258, 0); g.add(cap);
  }
  const beam = part(212, 18, 24, "#141a30", { emissive:color, emissiveIntensity:.5 });
  beam.position.y = 244; g.add(beam);
  // línea encendida en el suelo: marca la frontera aunque estés lejos
  const strip = part(230, 4, 14, color, { emissive:color, emissiveIntensity:1.5 });
  strip.position.y = 3; g.add(strip);
  // cortina de energía que late
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(190, 236),
    new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.3,
                                  side:THREE.DoubleSide, depthWrite:false,
                                  blending:THREE.AdditiveBlending }));
  curtain.position.y = 122; g.add(curtain); g.curtain = curtain;
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
/* Monumentos de cada isla: tres piezas únicas por anillo que se ven de lejos
   y dicen dónde estás sin mirar el mapa. Se construyen al acercarte y se
   liberan al alejarte. */
const LANDMARKS = [];
for (let i = 0; i < 13; i++) for (let k = 0; k < 5; k++){
  const a = i * 1.37 + k * (Math.PI * 2 / 5) + .4;
  const r = i === 0 ? 1100 + (k % 2) * 400 : i * CFG.RING_WIDTH + CFG.RING_WIDTH * (.3 + (k % 3) * .2);
  LANDMARKS.push({ ring:i, k, x:0, y:0, a, r, view:null });
}
function landmarkPos(L){ return [CFG.WORLD.cx + Math.cos(L.a) * L.r, CFG.WORLD.cy + Math.sin(L.a) * L.r]; }
function buildLandmark(id, k){
  const g = new THREE.Group(), anim = [];
  const B = (w, h, d, col, x, y, z, glow, ry) => {
    const m = part(w, h, d, col, glow ? { emissive:col, emissiveIntensity: glow === true ? 1 : glow } : undefined);
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = false; g.add(m); return m;
  };
  const halo = (col, sc, y) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(col), transparent:true,
    depthWrite:false, blending:THREE.AdditiveBlending, opacity:.7 })); sp.scale.set(sc, sc, 1); sp.position.y = y; g.add(sp); anim.push({ o:sp, pulse:true }); return sp; };
  switch (id){
    case "Seoul": { // torre de la Asociación de Cazadores
      B(150, 560, 150, "#2a3c5e", 0, 280, 0); B(156, 8, 156, "#6ef0ff", 0, 140, 0, true); B(156, 8, 156, "#6ef0ff", 0, 300, 0, true);
      B(156, 8, 156, "#6ef0ff", 0, 460, 0, true); B(110, 60, 110, "#1e2c46", 0, 590, 0); B(8, 120, 8, "#cfd6e0", 0, 680, 0);
      for (const sx of [-1, 1]) for (let y = 40; y < 540; y += 36) B(4, 20, 152, "#9fd8ff", sx * 76, y, 0, .5);
      B(90, 60, 4, "#ffd24a", 0, 520, 76, true); halo("#6ef0ff", 200, 740); break;
    }
    case "Hongdae": { // puerta dimensional de clase D
      for (const sx of [-1, 1]){ B(40, 300, 40, "#3a3f52", sx * 120, 150, 0); B(52, 30, 52, "#2a2f40", sx * 120, 15, 0); }
      B(300, 40, 44, "#3a3f52", 0, 310, 0);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(110, 32), new THREE.MeshBasicMaterial({ color:0x4aa8ff, transparent:true, opacity:.7, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false }));
      disc.position.y = 150; g.add(disc); anim.push({ o:disc, spinZ:.8 }); halo("#4aa8ff", 380, 150); break;
    }
    case "Temple": { // estatua de dios sentada, con los ojos encendidos
      B(260, 80, 200, "#8f8674", 0, 40, 0); B(160, 180, 110, "#a89a86", 0, 170, -20); B(120, 100, 100, "#a89a86", 0, 310, -20);
      B(20, 12, 4, "#ffb45a", -26, 320, 31, true); B(20, 12, 4, "#ffb45a", 26, 320, 31, true);
      for (const sx of [-1, 1]){ B(50, 150, 50, "#9a8e7a", sx * 110, 170, 10); B(56, 40, 90, "#9a8e7a", sx * 110, 90, 50); }
      B(90, 120, 12, "#6b604e", 110, 150, 70); B(70, 20, 60, "#c9b88a", 0, 372, -20); halo("#ffb45a", 160, 320); break;
    }
    case "Reawaken": { // torre-prisión con ventanas rojas y cadenas
      B(130, 480, 130, "#1c1a24", 0, 240, 0); B(170, 40, 170, "#2a2630", 0, 500, 0);
      for (let i = 0; i < 8; i++) B(24, 10, 24, "#2a2630", -72 + i * 20.5, 530, 0);
      for (let y = 80; y < 460; y += 70) for (const sx of [-1, 1]) B(4, 26, 14, "#ff3a3a", sx * 66, y, 0, true);
      for (let i = 0; i < 6; i++){ const c = B(8, 8, 8, "#5a5a66", 70 + i * 22, 300 - i * 45, 0); c.rotation.z = .6; }
      halo("#ff3a3a", 140, 540); break;
    }
    case "HighOrcs": { // campamento: tótems, chozas de piel y hoguera
      for (let i = 0; i < 3; i++){ const x = (i - 1) * 130;
        B(30, 190, 30, "#5a3a24", x, 95, -80); B(52, 34, 36, "#7a4a2a", x, 150, -80); B(12, 10, 4, "#ff6a2a", x - 10, 160, -61, true); B(12, 10, 4, "#ff6a2a", x + 10, 160, -61, true); }
      for (const [x, z] of [[-150, 80], [140, 90]]){ const hut = new THREE.Mesh(new THREE.ConeGeometry(70, 110, 6), mat("#8a6a4a")); hut.position.set(x, 55, z); g.add(hut); }
      B(60, 10, 60, "#3a2a1c", 0, 5, 60); const fire = B(26, 40, 26, "#ff8a2a", 0, 28, 60, 1.4); anim.push({ o:fire, flicker:true }); halo("#ff8a2a", 180, 40); break;
    }
    case "RedGate": { // agujas de cristal rojo sobre la escarcha
      for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2, rr = i === 0 ? 0 : 90;
        const c = new THREE.Mesh(new THREE.ConeGeometry(i === 0 ? 50 : 26, i === 0 ? 380 : 170 + (i % 3) * 50, 5), mat("#ff3a4a", { emissive:"#ff3a4a", emissiveIntensity:.8 }));
        c.position.set(Math.cos(a) * rr, i === 0 ? 190 : 90, Math.sin(a) * rr); c.rotation.z = i ? Math.cos(a) * .25 : 0; c.rotation.x = i ? Math.sin(a) * .25 : 0; g.add(c); }
      B(300, 6, 300, "#dff4ff", 0, 3, 0); halo("#ff3a4a", 320, 200); break;
    }
    case "Jeju": { // hormiguero gigante con túneles brillantes
      let w = 360;
      for (let y = 0; y < 5; y++){ B(w, 60, w, y % 2 ? "#5a4228" : "#6b4e30", 0, 30 + y * 58, 0, 0, y * .4); w -= 62; }
      for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; B(30, 24, 6, "#b8ff3a", Math.cos(a) * 150, 40 + (i % 2) * 60, Math.sin(a) * 150, true, -a + Math.PI / 2); }
      halo("#b8ff3a", 200, 320); break;
    }
    case "Japan": { // torii y linternas de piedra
      for (const sx of [-1, 1]) B(26, 280, 26, "#c8322a", sx * 110, 140, 0);
      B(320, 26, 34, "#1a1414", 0, 290, 0); B(280, 20, 28, "#c8322a", 0, 250, 0);
      for (const sx of [-1, 1]) for (const z of [90, 200]){ B(26, 60, 26, "#9a948a", sx * 170, 30, z); B(34, 24, 34, "#fff0c0", sx * 170, 72, z, .8); B(40, 10, 40, "#7a746a", sx * 170, 90, z); }
      halo("#ffd27a", 120, 72); break;
    }
    case "DemonCastle": { // castillo de agujas negras sobre un foso de lava
      B(360, 12, 360, "#ff5a1a", 0, 4, 0, 1.2);
      B(240, 200, 200, "#2a0f14", 0, 110, 0);
      for (const [x, z, h] of [[-120, -90, 420], [120, -90, 380], [-120, 90, 340], [120, 90, 360], [0, 0, 520]]){
        B(56, h, 56, "#3a1418", x, h / 2, z); const sp = new THREE.Mesh(new THREE.ConeGeometry(40, 110, 4), mat("#1a0808")); sp.position.set(x, h + 55, z); g.add(sp);
        B(10, 18, 4, "#ffb03a", x, h - 60, z + 29, true); }
      halo("#ff5a1a", 420, 20); break;
    }
    case "IceMonarch": { // trono de hielo rodeado de estalagmitas
      B(160, 40, 140, "#bfe6ff", 0, 20, 0); B(140, 60, 120, "#9fd4f5", 0, 70, -10); B(140, 220, 30, "#cfefff", 0, 180, -60, .3);
      for (let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2;
        const c = new THREE.Mesh(new THREE.ConeGeometry(22, 120 + (i % 3) * 60, 5), mat("#9fe8ff", { emissive:"#6fd8ff", emissiveIntensity:.5, opacity:.85 }));
        c.position.set(Math.cos(a) * 190, 60 + (i % 3) * 30, Math.sin(a) * 190); g.add(c); }
      halo("#9fe8ff", 260, 200); break;
    }
    case "BeastMonarch": { // arco de un cráneo colosal con colmillos
      B(240, 160, 200, "#e8dcc0", 0, 260, 0); B(60, 50, 10, "#1a1010", -55, 280, 101); B(60, 50, 10, "#1a1010", 55, 280, 101);
      B(14, 12, 4, "#ffb45a", -55, 280, 107, true); B(14, 12, 4, "#ffb45a", 55, 280, 107, true);
      for (const sx of [-1, 1]){ const t = B(34, 200, 34, "#f4ecd8", sx * 100, 100, 80); t.rotation.z = sx * .15; B(40, 180, 40, "#d8ccb0", sx * 130, 90, -60); }
      halo("#ffb45a", 160, 280); break;
    }
    case "Architect": { // cubos rúnicos flotando sobre un círculo del Sistema
      const ringM = new THREE.Mesh(new THREE.RingGeometry(150, 170, 48), new THREE.MeshBasicMaterial({ color:0x9fa8ff, transparent:true, opacity:.7, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false }));
      ringM.rotation.x = -Math.PI / 2; ringM.position.y = 3; g.add(ringM); anim.push({ o:ringM, spinZ:.3 });
      for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2, c = B(i ? 60 : 110, i ? 60 : 110, i ? 60 : 110, i ? "#4a4a86" : "#9fa8ff", i ? Math.cos(a) * 160 : 0, i ? 160 + (i % 3) * 50 : 260, i ? Math.sin(a) * 160 : 0, i ? .3 : 1);
        anim.push({ o:c, spin:.6 + i * .1, bob:i }); }
      halo("#9fa8ff", 300, 260); break;
    }
    default: { // trono de obsidiana del Rey de las Sombras
      B(260, 50, 220, "#12122a", 0, 25, 0); B(200, 80, 160, "#1a1a3a", 0, 90, 0); B(180, 320, 40, "#0e0e22", 0, 260, -70);
      for (const sx of [-1, 1]){ B(40, 60, 150, "#1a1a3a", sx * 110, 150, 0); const f = B(26, 50, 26, "#c08cff", sx * 150, 220, 60, 1.4); anim.push({ o:f, flicker:true });
        B(10, 140, 10, "#2a2a4a", sx * 150, 120, 60); B(60, 160, 4, "#3a1a6a", sx * 60, 300, -48); }
      halo("#c08cff", 360, 300);
    }
  }
  g.userData.anim = anim;
  return g;
}
/* Cofres escondidos por todo el mapa: ocho por región, con un brillo que se
   ve de lejos. Dan oro y gemas según la región y se rellenan cada día. */
const CHESTS = [];
for (let i = 0; i < 13; i++) for (let k = 0; k < 8; k++){
  const h = Math.sin((i + 1) * 91.7 + k * 13.3) * 43758.5453, fr = h - Math.floor(h);
  const a = k * (Math.PI / 4) + fr * .6 + i * .5;
  const r = i * CFG.RING_WIDTH + CFG.RING_WIDTH * (.15 + fr * .7) + (i === 0 ? 500 : 0);
  CHESTS.push({ id:`${i}-${k}`, ring:i, x:CFG.WORLD.cx + Math.cos(a) * r, y:CFG.WORLD.cy + Math.sin(a) * r, view:null });
}
function chestOpened(c){ const D = P.chests || {}; return D.day === dayKey() && D.open?.includes(c.id); }
function openChest(c){
  if (chestOpened(c)) return;
  if (!P.chests || P.chests.day !== dayKey()) P.chests = { day:dayKey(), open:[] };
  P.chests.open.push(c.id);
  const isle = ISLANDS[c.ring], lv = 1 + P.level * .02;
  const cash = Math.floor(isle.enemy.hp * rnd(2, 6) * lv), gems = Math.floor((20 + c.ring * 30) * rnd(.6, 1.8) * lv);
  P.cash += cash; P.gems += gems;
  let extra = "";
  if (Math.random() < .08){ P.tickets++; extra = " · +1 ticket"; }
  if (Math.random() < .015){ const r = rollRune(c.ring >= 8 ? 2 : 1); extra += ` · ${RUNES[r].name}`; }
  banner("¡COFRE!", "#ffd24a"); note(`Cofre de ${isle.name}: +${fmt(cash)} oro · +${fmt(gems)} gemas${extra}`, "--gold");
  burst(c.x, c.y, 30, "#ffd24a", 20); SFX.levelUp?.(); save(); dirty = true;
}
function syncChests(dt){
  const t = now();
  for (const c of CHESTS){
    const d = Math.hypot(c.x - player.x, c.y - player.y), open = chestOpened(c);
    if (dungeon || d > 2600){ if (c.view){ scene.remove(c.view); disposeView(c.view); c.view = null; } continue; }
    if (!c.view){
      const g = new THREE.Group();
      const base = part(40, 22, 28, "#6b4424"); base.position.y = 11; g.add(base);
      const band = part(42, 4, 30, "#c9a33a", { emissive:"#c9a33a", emissiveIntensity:.4 }); band.position.y = 16; g.add(band);
      const lid = new THREE.Group(); lid.position.set(0, 22, -14); g.add(lid); g.lid = lid;
      const top = part(40, 9, 28, "#7a5230"); top.position.set(0, 4.5, 14); lid.add(top);
      const lock = part(7, 8, 3, "#ffd24a", { emissive:"#ffd24a", emissiveIntensity:1 }); lock.position.set(0, 14, 15); g.add(lock);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("#ffd24a"), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.6 }));
      glow.scale.set(120, 120, 1); glow.position.y = 22; g.add(glow); g.glow = glow;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(8, 14, 300, 8, 1, true), new THREE.MeshBasicMaterial({ color:0xffd24a, transparent:true,
        opacity:.14, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending })); beam.position.y = 150; g.add(beam); g.beam = beam;
      g.position.set(c.x, terrainH(c.x, c.y), c.y); g.rotation.y = (c.x + c.y) % 6;
      scene.add(g); c.view = g;
    }
    c.view.lid.rotation.x = open ? -1.6 : Math.sin(t * 3 + c.x) * .03;
    c.view.glow.visible = c.view.beam.visible = !open;
    if (!open){ c.view.glow.material.opacity = .45 + Math.sin(t * 3) * .2; if (d < 70) openChest(c); }
  }
}
function syncLandmarks(dt){
  const t = now();
  for (const L of LANDMARKS){
    const [x, y] = landmarkPos(L);
    const d = Math.hypot(x - player.x, y - player.y);
    if (dungeon || d > 4200){ if (L.view){ scene.remove(L.view); disposeView(L.view); L.view = null; } continue; }
    if (!L.view){
      L.view = buildLandmark(ISLANDS[L.ring].id, L.k);
      L.view.position.set(x, terrainH(x, y), y); L.view.rotation.y = -L.a + Math.PI / 2;
      scene.add(L.view);
    }
    for (const A of L.view.userData.anim){
      if (A.spin) A.o.rotation.y += dt * A.spin;
      if (A.spinZ) A.o.rotation.z += dt * A.spinZ;
      if (A.bob !== undefined) A.o.position.y += Math.sin(t * 1.4 + A.bob) * dt * 12;
      if (A.flicker) A.o.scale.set(1, .8 + Math.random() * .45, 1);
      if (A.pulse) A.o.material.opacity = .5 + Math.sin(t * 2 + L.k) * .2;
    }
  }
}
function syncBorder(dt){
  if (dungeon){
    for (const b of borderPool){ b.obj.visible = false; }
    if (borderSignLabel) borderSignLabel.visible = false;
    return;
  }
  const idx = ringAt(player.x, player.y);
  const next = ISLANDS[idx + 1];
  if (!next){
    for (const b of borderPool){ b.obj.visible = false; }
    if (borderSignLabel) borderSignLabel.visible = false;
    return;
  }
  const rad = (idx + 1) * CFG.RING_WIDTH;
  const th = THEMES[next.theme] || THEMES.city;
  const color = th.sky1;
  // el muro se reconstruye solo al cambiar de anillo
  if (borderRing !== idx){
    borderRing = idx;
    for (const b of borderPool){ scene.remove(b.obj); disposeView(b.obj); }
    borderPool.length = 0;
    for (let i = 0; i < 16; i++){
      const obj = buildBorderGate(color);
      obj.visible = false; scene.add(obj);
      borderPool.push({ obj });
    }
    if (borderSignLabel){ scene.remove(borderSignLabel); disposeView(borderSignLabel); }
    borderSignLabel = null;
  }
  // se reparten las puertas por el arco que tienes delante
  const ang0 = Math.atan2(player.y - CFG.WORLD.cy, player.x - CFG.WORLD.cx);
  const step = 230 / rad;                        // separación angular entre puertas
  const pulse = .30 + Math.sin(now() * 2.2) * .12;
  for (let i = 0; i < borderPool.length; i++){
    const k = i - (borderPool.length - 1) / 2;
    const a = ang0 + k * step;
    const x = CFG.WORLD.cx + Math.cos(a) * rad, y = CFG.WORLD.cy + Math.sin(a) * rad;
    const b = borderPool[i];
    const d = Math.hypot(x - player.x, y - player.y);
    b.obj.visible = d < 1700;
    if (!b.obj.visible) continue;
    b.obj.position.set(x, terrainH(x, y), y);
    b.obj.rotation.y = -a + Math.PI / 2;         // la puerta mira al centro
    b.obj.curtain.material.opacity = pulse;
    // cartel con el nombre de la región, solo sobre la puerta más cercana
    if (i === Math.floor(borderPool.length / 2)){
      if (!borderSignLabel){
        borderSignLabel = labelSprite(next.name, "#ffffff", 44);
        borderSignLabel.scale.set(290, 72, 1);
        scene.add(borderSignLabel);
      }
      borderSignLabel.visible = true;
      borderSignLabel.position.set(x, terrainH(x, y) + 320, y);
    }
  }
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
      // se deja un pasillo limpio en la frontera: si no, los edificios tapan
      // las puertas y no se ve dónde acaba una región y empieza la otra
      if (!dungeon){
        const dc2 = Math.hypot(x - CFG.WORLD.cx, z - CFG.WORLD.cy);
        const borde = Math.round(dc2 / CFG.RING_WIDTH) * CFG.RING_WIDTH;
        if (borde > 0 && Math.abs(dc2 - borde) < 190) continue;
      }
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
// La bestia acorazada de la transformación: más grande, púas por todas
// partes, cara oscura con ojos y sonrisa dentada encendidos, núcleo en el
// pecho, jirones de sombra y la hoja de energía.
function monarchFormConfig(){
  return {
    scale:1.5, skin:"#1a0f33", eyes:"#ff5ad8", glowEyes:true, grin:"#ff5ad8",
    shirt:"#140b28", sleeve:"#1d1238", pants:"#110a22", boots:"#0b0716", belt:"#140b28",
    buckle:"#b07cff",
    armor:"#2a1752", armorGlow:0, core:"#ff5ad8",
    pauldron:"#2a1752", pauldron2:"#3a2170", spikes:"#b07cff",
    gauntlet:"#2a1752", tassets:"#2a1752", greaves:"#2a1752",
    backSpikes:"#b07cff", tatters:"#3d1e7a", trim:"#b07cff",
    spikyHair:"#2a1752", horns:true, hornColor:"#d05aff", hornBase:"#2a1752",
    glove:"#b07cff",
    weapon:"#d05aff", weaponGlow:true, weaponKind:"sword",
    key:`form|${P.weapon}`,
  };
}
function playerConfig(){
  if (typeof formActive === "function" && formActive()) return monarchFormConfig();
  // El aspecto lo elige el jugador en el vestidor (Atributos › Aspecto) entre
  // lo que ya ha desbloqueado; la cara siempre queda a la vista.
  const L = P.look || LOOK_DEFAULT;
  const out = lookItem("outfit").c, armor = lookItem("armor").id, hair = lookItem("hair").id;
  const eyeI = lookItem("eyes"), capeI = lookItem("cape").id;
  const heavy = armor === "heavy", plate = armor === "plate" || heavy, coat = armor === "coat";
  const glowEye = !!eyeI.glow;
  return {
    scale:+lookItem("height").id, skin:lookItem("skin").id, hero:true,
    headband: lookItem("head").id === "band" ? out.trim : null, mask: lookItem("head").id === "mask" ? out.plate : null,
    horns: lookItem("head").id === "horns", hornColor: out.trim,
    backSword: lookItem("back").id === "sword" ? kitOf(P.weapon).color : null,
    features: lookItem("back").id === "wings" ? ["wings"] : [], iris:eyeI.id, glowEyes: glowEye, eyes: glowEye ? eyeI.id : "#12172b",
    shirt: out.shirt, sleeve: out.sleeve, pants: out.pants, boots: out.boots,
    armColor: lookItem("outfit").coat ? out.sleeve : null, laces: lookItem("outfit").coat ? "#3a3a44" : null,
    coatOpen: !!lookItem("outfit").coat, messyHair: hair === "messy" ? L.hairColor : null,
    belt: lookItem("outfit").coat ? "#101014" : "#1a1428", buckle: lookItem("outfit").coat ? "#2a2a30" : out.trim,
    spikyHair: hair === "spiky" ? L.hairColor : null,
    hair: hair === "short" || hair === "long" ? L.hairColor : null, longHair: hair === "long" ? L.hairColor : null,
    hood: hair === "hood" ? out.plate : null, hood2: hair === "hood" ? out.trim : null,
    rig: armor === "light" && !lookItem("outfit").coat ? "#0f1526" : null, rig2: out.trim,
    kneepads: armor === "light" && !lookItem("outfit").coat ? "#0f1526" : null,
    coat: lookItem("outfit").coat ? out.sleeve : coat ? out.shirt : null,
    trim: coat || heavy ? out.trim : null,
    armor: coat || lookItem("outfit").coat ? null : out.plate, armorGlow: 0,
    core: plate || coat ? out.trim : null,
    pauldron: lookItem("outfit").coat && !plate ? null : out.plate, pauldron2: plate || coat ? out.trim : null,
    spikes: heavy || (coat && P.awakened) || lookItem("back").id === "spikes" ? out.trim : null,
    gauntlet: lookItem("outfit").coat && !plate ? null : out.plate,
    glove: lookItem("outfit").coat ? null : out.trim,
    tassets: plate ? out.plate : null,
    greaves: heavy ? out.plate : null,
    backSpikes: (coat && rankIdx(P.rank) >= 5) || lookItem("back").id === "spikes" ? out.trim : null,
    helm: lookItem("head").id === "helm" ? out.plate : null, helm2: lookItem("head").id === "helm" ? out.trim : null,
    visor: lookItem("head").id === "helm" ? out.trim : null, crest: heavy ? out.trim : null,
    cape: capeI === "none" ? null : capeI === "shadow" ? "#120c24" : out.plate, capeLong: capeI === "long" || capeI === "shadow",
    crown: lookItem("head").id === "crown" ? "#ffd24a" : null,
    weapon: lookItem("weaponGlow").id === "auto" ? kitOf(P.weapon).color : lookItem("weaponGlow").id,
    weaponGlow: P.awakened || !!kitOf(P.weapon).glow || lookItem("weaponGlow").id !== "auto",
    weaponKind: lookItem("weaponStyle").id === "monarchblade" ? "monarchblade" : weaponKind(P.weapon),
    key: `${JSON.stringify(L)}|${P.rank}|${P.weapon}|${P.awakened}`,
  };
}
function ensurePlayerView(){
  const cfg = playerConfig();
  if (playerView && playerView.userData.key === cfg.key) return playerView;
  if (playerView){ scene.remove(playerView); disposeView(playerView); }
  playerView = buildCharacter(cfg);
  // contorno de cómic: la silueta del protagonista se lee sobre cualquier fondo
  addOutline(playerView, 0x07060d, 1.05);
  playerView.userData.key = cfg.key;
  scene.add(playerView);
  return playerView;
}
// Cada región tiene su familia de criatura, con su paleta y su brillo.
const MOB_LOOK = {
  // Cada región monta su propio bicho: tipo de cuerpo, paleta y rasgos, para
  // que dos zonas con el mismo cuerpo no se parezcan en nada.
  // Criaturas inspiradas en las mazmorras de la obra: goblins en las puertas
  // bajas, la serpiente de Kasaka, estatuas del Doble Dungeon, caballeros del
  // Castillo, altos orcos, lobos de hielo, hormigas de Jeju, demonios...
  Seoul:       { body:"goblin",   skin:"#6f8a55", dark:"#3a3226", glow:"#ffcc33", features:[] },
  Hongdae:     { body:"serpent",  skin:"#3f5a48", dark:"#1c2a22", glow:"#c8ff4a", hair:"#c8b98a", features:[] },
  Temple:      { body:"golem",    skin:"#8f8674", dark:"#4a4438", glow:"#ffb45a", features:[] },
  Reawaken:    { body:"humanoid", skin:"#2a2630", dark:"#1c1a24", glow:"#ff3a3a", features:[],
                 kit:{ helm:"#2e2a36", helm2:"#5a1420", visor:"#ff3a3a", shield:"#3a3440", shieldGlow:"#ff3a3a",
                       cape:"#5a1420", weapon:"#b8bcc8", weaponKind:"sword", greaves:"#2e2a36" } },
  HighOrcs:    { body:"humanoid", skin:"#5f7f4a", dark:"#3a2a1c", glow:"#ff6a2a", hair:"#1a1410",
                 features:["tusks"], kit:{ weapon:"#8a8f96", weaponKind:"axe", pauldron:"#6a4a2a", pauldron2:"#8a6a3a",
                       armor:null, shirt:"#4a3624", hair:"#1a1410", glowEyes:true } },
  RedGate:     { body:"wolf",     skin:"#8fa4ba", dark:"#3e4e62", glow:"#6fd8ff", hair:"#d6e6f5", features:[] },
  Jeju:        { body:"ant",      skin:"#241d2c", dark:"#120e18", glow:"#b8ff3a", features:[] },
  Japan:       { body:"humanoid", skin:"#c9a58a", dark:"#23202c", glow:"#ff5a5a", features:[],
                 kit:{ hood:"#1a1824", hood2:"#ff5a5a", tatters:"#2a2436", weapon:"#e8ecf6", weaponKind:"katana", armor:null,
                       cape:"#3a1a24", capeLong:true, gauntlet:"#2a2436", kneepads:"#1a1824", rig:"#3a1a24", rig2:"#ff5a5a" } },
  DemonCastle: { body:"humanoid", skin:"#7a2a2a", dark:"#2a0f14", glow:"#ffb03a", features:["wings", "tail"],
                 kit:{ horns:true, hornColor:"#1a1010", weapon:"#6a1a1a", weaponKind:"polearm", spikes:"#ffb03a" } },
  IceMonarch:  { body:"humanoid", skin:"#d8e8f5", dark:"#3a5a7a", glow:"#8fe8ff", features:["crystals"],
                 kit:{ helm:"#9fc4e8", helm2:"#e8f6ff", visor:"#8fe8ff", weapon:"#cfefff", weaponKind:"polearm", cape:"#5f8fbf" } },
  BeastMonarch:{ body:"wolf",     skin:"#4a3a30", dark:"#241a14", glow:"#ffb45a", hair:"#2a1e18", features:[] },
  Architect:   { body:"wraith",   skin:"#4a4a86", dark:"#1f1f44", glow:"#9fa8ff",
                 features:["halo", "crystals"] },
  ShadowRealm: { body:"humanoid", skin:"#2a2a4a", dark:"#12122a", glow:"#c08cff",
                 features:["wings", "halo", "extraEyes"],
                 kit:{ coat:"#0e0e22", trim:"#c08cff", horns:true, hornColor:"#c08cff", spikes:"#c08cff", backSpikes:"#c08cff",
                       weapon:"#c08cff", weaponGlow:true, weaponKind:"greatsword", armor:null, helm:null } },
};
function enemyConfig(e){
  const L = e.look || {};
  const boss = e.boss, brute = e.def.kind === "brute";
  const reg = MOB_LOOK[(e.isle || regionAt(e.x, e.y).id)] || MOB_LOOK.Seoul;
  // los jefes rompen el molde de su región: siempre humanoides acorazados
  const body = boss ? "humanoid" : reg.body;
  const glow = reg.glow;
  // los brutos añaden caparazón y los jefes, además, halo: se distinguen de
  // lejos sin cambiarles el color
  const features = (reg.features || []).slice();
  if (brute && !features.includes("carapace")) features.push("carapace");
  if (boss || e.elite){
    if (!features.includes("halo")) features.push("halo");
    if (!features.includes("crystals")) features.push("crystals");
  }
  const cfg = {
    body, features,
    scale: (e.def.r / 18) * (boss ? 1.75 : brute ? 1.25 : (L.height || 1)) * (1 + rankIdxOf(e.rank) * .05 + (mobRank(e.rank).myth ? .15 : 0))
      * (body === "serpent" ? 1.3 : body === "goblin" ? 1.1 : 1),
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
    ...(boss ? {} : (reg.kit || {})),
  };
}
/* Cada sombra conserva la forma de lo que fue: el oso Tank, el dragón Kaisel,
   la hormiga Beru, el caballero Igris con su penacho... todo hecho de sombra
   (negro violáceo translúcido) con el brillo de su clase en ojos, filos y vetas. */
const SHADOW_LOOK = {
  Soldier:  { lore:"Soldado raso del ejército de sombras. Siempre en primera línea." },
  Iron:     { kit:{ helm:"#1a1230", visor:true, shield:"#140f26", greaves:"#1a1230", weaponKind:"hammer" }, scale:1.18,
              lore:"Coloso con escudo de torre. Aguanta lo que ningún otro." },
  Tank:     { body:"wolf", scale:1.55, features:["mane"], lore:"Oso de sombra. Embiste y arrastra a los enemigos." },
  Igris:    { kit:{ helm:"#1a1230", visor:true, crest:"#ff3a4a", cape:"#4a0f1c", weaponKind:"greatsword", greaves:"#1a1230" },
              glow:"#ff3a4a", lore:"El Caballero Rojo. Leal hasta el fin, su penacho arde como sangre." },
  Tusk:     { kit:{ weaponKind:"staff", hood:"#160f2b" }, features:["tusks"], scale:1.12, lore:"Chamán alto orco. Su bastón guarda fuego de sombra." },
  Kaisel:   { body:"wolf", scale:1.7, features:["wings", "tail"], horns:true, lore:"Dragón volador. Montura y arma a la vez." },
  Greed:    { kit:{ weaponKind:"dagger", hood:"#160f2b" }, features:["extraEyes"], lore:"Asesino silencioso. Golpea desde el borde de la luz." },
  Baruka:   { kit:{ weaponKind:"dagger", helm:"#1a1f3a" }, features:["crystals"], glow:"#9fe8ff", lore:"Jefe de los elfos de hielo. Su filo congela el aire." },
  Beru:     { body:"ant", scale:1.5, features:["wings"], glow:"#b8ff3a", lore:"El Rey Hormiga. Hambre y velocidad sin fin." },
  Bellion:  { kit:{ helm:"#1a1230", visor:true, weaponKind:"spear", spikes:true, greaves:"#1a1230", cape:"#2a1060" }, features:["wings", "halo"], scale:1.25,
              lore:"Gran Mariscal del ejército. Ninguna sombra le supera." },
  Kamish:   { body:"wolf", scale:2.1, features:["wings", "tail", "crystals"], horns:true, glow:"#ff8a2a", lore:"El dragón que hizo temblar el mundo, ahora a tus órdenes." },
  Antares:  { kit:{ weaponKind:"greatsword", spikes:true, cape:"#3a0a1a" }, features:["wings", "tail"], horns:true, crown:true, glow:"#ff4a4a", scale:1.3,
              lore:"Rey de los Dragones. Su llama es negra y roja." },
  Architect:{ body:"wraith", features:["halo", "crystals"], scale:1.2, lore:"Una conciencia hecha de runas del Sistema." },
  Ashborn:  { kit:{ coat:"#0b0a16", weaponKind:"greatsword", spikes:true, backSpikes:true }, features:["halo"], crown:true, scale:1.35, glow:"#b07cff",
              lore:"El primer Monarca de las Sombras. Su sola presencia oscurece el cielo." },
};
// Versión de sombra de un enemigo: su mismo cuerpo, rasgos y equipo, pero
// hecho de negro violáceo translúcido y con el brillo de su clase.
function mobShadowConfig(d){
  const src = SHADOWS[d.id].mob, reg = MOB_LOOK[src.isle] || MOB_LOOK.Seoul;
  // vetas con el color de su región; los ojos con el de su clase
  const tierC = getComputedStyle(document.documentElement).getPropertyValue(TIER_VAR[d.tier] || "--t-C").trim() || reg.glow;
  const glow = reg.glow;
  const key = `__sh_${d.id}`;
  if (!MOB_LOOK[key]){
    const kit = {};
    for (const [k, v] of Object.entries(reg.kit || {})) kit[k] = typeof v === "string" && v.startsWith("#") ? (/weapon|visor|Glow|hood2|helm2|spikes|trim|hornColor/.test(k) ? glow : "#1a1230") : v;
    MOB_LOOK[key] = { ...reg, skin:"#1a1232", dark:"#0b0818", hair:"#241a40", glow, kit, features:[...(reg.features || []), "halo"] };
  }
  const cfg = enemyConfig({ def:{ kind: src.brute ? "brute" : "normal", r:18 }, isle:key, look:{}, rank:d.rank, x:0, y:0 });
  cfg.opts = { opacity:.92 };
  cfg.eyes = tierC;
  if (cfg.body === "humanoid"){ Object.assign(cfg, { glowEyes:true, eyes:tierC, skin:"#1a1232", armorGlow:glow, core:glow, trim: cfg.trim ? glow : cfg.trim }); }
  cfg.scale *= 1 + rankIdxOf(d.rank) * .03;
  return cfg;
}
// Shiny: la misma sombra, pero de cristal dorado-violeta, sin transparencia y
// con todas las vetas encendidas en oro claro.
function shinyfy(cfg){
  const G = "#fff27a";
  const out = { ...cfg, opts:{}, skin:"#3a2a66", shirt:"#2a1f4a", sleeve:"#342660", pants:"#221a3e", boots:"#1a1430",
    eyes:G, glowEyes:true, glove:G, hornColor:G, hood2: cfg.hood ? G : cfg.hood2, trim:G, armorGlow:G, core:G, pauldron2:G,
    weapon:G, weaponGlow:true, crown: cfg.crown ? G : cfg.crown, spikes: cfg.spikes ? G : cfg.spikes, hair:"#4a3a80" };
  out.features = [...new Set([...(cfg.features || []), "halo"])];
  out.scale = (cfg.scale || 1) * 1.08;
  return out;
}
function shadowConfig(sh){
  const c = shadowConfigBase(sh);
  return sh.data?.shiny ? shinyfy(c) : c;
}
function shadowConfigBase(sh){
  const d = sh.data, tier = d.tier, L = SHADOW_LOOK[d.id] || {};
  if (SHADOWS[d.id]?.mob) return mobShadowConfig(d);
  const tierGlow = getComputedStyle(document.documentElement).getPropertyValue(TIER_VAR[tier] || "--t-C").trim() || "#b9c9e8";
  const glow = L.glow || tierGlow;
  const elite = tier === "S" || tier === "S Elite" || tier === "Monarch";
  const monarch = tier === "Monarch";
  const myth = mobRank(d.rank).myth;
  const scale = (L.scale || (monarch ? 1.14 : elite ? 1.05 : .97)) * (1 + rankIdxOf(d.rank) * .03);
  const base = {
    body: L.body, features: (L.features || []).slice(), scale, opts:{ opacity:.93 },
    skin:"#140f26", shirt:"#0c0918", sleeve:"#110d20", pants:"#080611", boots:"#060510",
    belt:"#0c0918", hair:"#1a1230", glove: glow, eyes: glow, glowEyes:true,
    horns: !!L.horns, hornColor: glow, crown: L.crown || monarch ? glow : null,
  };
  if (myth && !base.features.includes("halo")) base.features.push("halo");
  if (L.body) return base;
  const k = L.kit || {};
  return {
    ...base,
    hood: k.hood !== undefined ? k.hood : (k.helm || k.coat ? null : "#160f2b"), hood2: glow,
    tatters: monarch ? "#4a2394" : elite ? "#3d1e7a" : "#2c1659",
    trim: elite || k.coat ? glow : null, coat: k.coat || null,
    armor: k.coat ? null : "#1a1230", armorGlow: glow, core: elite ? glow : null,
    pauldron:"#1a1230", pauldron2: elite ? glow : null,
    spikes: k.spikes || monarch ? glow : null, backSpikes: k.backSpikes ? glow : null,
    gauntlet:"#1a1230", greaves: k.greaves || null,
    helm: k.helm || null, helm2: k.helm ? glow : null, visor: k.visor ? glow : null, crest: k.crest || null,
    cape: k.cape || null, shield: k.shield || null, shieldGlow: k.shield ? glow : null,
    weapon: glow, weaponGlow:true, weaponKind: k.weaponKind || (monarch ? "scythe" : "sword"),
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
function syncGroup(list, map, buildCfg, keyOf, onRemove){
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
    if (!alive.has(key)){
      map.delete(key);
      if (onRemove && onRemove(v)) continue;
      scene.remove(v); disposeView(v);
    }
  }
}
// Vistas de enemigos que acaban de morir: caen de espaldas, se hunden y se
// deshacen en humo antes de liberarse.
let dyingViews = [];
function startDeath(v){
  if (dyingViews.length > 12) return false;
  if (v.hud) v.hud.visible = false;
  if (v.userData.flash) v.userData.flash.visible = false;
  if (v.userData.aura) v.userData.aura.visible = false;
  v.userData.dieT = 0;
  v.userData.dieSide = Math.random() < .5 ? -1 : 1;
  dyingViews.push(v);
  return true;
}
function syncDying(dt){
  const keep = [];
  for (const v of dyingViews){
    const u = v.userData;
    u.dieT += dt;
    const k = clamp(u.dieT / .75, 0, 1), e = 1 - Math.pow(1 - Math.min(1, k * 1.6), 3);
    if (v.detail){ v.detail.rotation.x = -e * 1.35; v.detail.rotation.z = u.dieSide * e * .25; }
    const sc = 1 - Math.max(0, k - .45) / .55;
    v.scale.set(sc, sc, sc);
    v.position.y -= dt * 30 * k;
    if (Math.random() < .5){
      const a = Math.random() * 6.28, r = 16 * (v.scaleRef || 1);
      parts.push({ x:v.position.x + Math.cos(a) * r, y:v.position.z + Math.sin(a) * r, h:rnd(6, 40),
                   vx:0, vy:0, vh:rnd(40, 110), life:rnd(.4, .8), color:"#2a1d3d", size:4 });
    }
    if (k >= 1){ scene.remove(v); disposeView(v); } else keep.push(v);
  }
  dyingViews = keep;
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
  // estela blanca que baja detrás de la vida: se ve cuánto se acaba de quitar
  const chip = new THREE.Sprite(new THREE.SpriteMaterial({ color:0xfff1d0, depthTest:false }));
  chip.scale.set(76, 7, 1);
  g.add(bg, chip, fill);
  g.fill = fill; g.chipPct = 1;
  g.setPct = (pct, color) => {
    const p = clamp(pct, 0, 1), w = 76 * p;
    fill.scale.set(Math.max(0.001, w), 7, 1);
    fill.position.x = -(76 - w) / 2;
    fill.material.color.set(color);
    g.chipPct = g.chipPct < p ? p : g.chipPct + (p - g.chipPct) * .06;
    const cw = 76 * g.chipPct;
    chip.scale.set(Math.max(0.001, cw), 7, 1);
    chip.position.x = -(76 - cw) / 2;
  };
  return g;
}
let AURA_GEO_ = null;
const auraGeo = () => AURA_GEO_ || (SHARED.add(AURA_GEO_ = new THREE.RingGeometry(26, 40, 32, 1, 0, Math.PI * 1.7)), AURA_GEO_);
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
// Avance continuo del golpe del jugador (0..1) para animar carga, tajo y recogida.
function playerSwing(){
  const d = player.atkDef;
  if (!d || player.phase === "idle") return 0;
  const f = (T, dur) => clamp(1 - T / Math.max(dur || .1, .001), 0, 1);
  if (player.phase === "startup") return .02 + f(player.phaseT, d.startup) * .33;
  if (player.phase === "active") return .35 + f(player.phaseT, d.active) * .4;
  return .75 + f(player.phaseT, d.recovery) * .25;
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
  syncBorder(dt);
  syncLandmarks(dt);
  syncChests(dt);
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
  // montura bajo el jugador
  const mo = mountOf();
  if (player.mounted){
    if (!mountView || mountView.userData.id !== P.mount){
      if (mountView){ scene.remove(mountView); disposeView(mountView); }
      mountView = buildMountView(P.mount); scene.add(mountView);
    }
    mountView.visible = true;
    const fly = mo.fly ? 26 + Math.sin(now() * 2) * 5 : 0;
    poseEntity(mountView, player.x, player.y, player.yaw, { step:player.step * 1.3, moving:(player.moveAmt || 0) > .05, lift: player.h + fly });
    if (mountView.disc) mountView.disc.rotation.y += dt * 3;
    animateMount(mountView, dt, (player.moveAmt || 0) > .05, player.x, player.y);
  } else if (mountView) mountView.visible = false;
  const saddle = player.mounted ? (mo.body === "disc" ? 14 : mo.body === "serpent" ? 30 : mo.body === "ant" ? 30 : mo.body === "golem" ? 58 : 33) * mo.scale + (mo.fly ? 26 + Math.sin(now() * 2) * 5 : 0) - 14 : 0;
  poseEntity(pv, player.x, player.y, player.yaw, {
    step:player.step, moving:(player.moveAmt || 0) > .05,
    swing: playerSwing(), swingDir: (player.combo % 2) ? -1 : 1,
    lift: player.h + saddle, air: !player.mounted && player.h > 3, dash: player.dashT > 0,
    hurt: clamp(player.hurt / 0.22, 0, 1),
  });
  pv.visible = player.dead <= 0 || Math.sin(now() * 20) > 0;
  if (player.mounted){                                  // sentado a horcajadas
    pv.legs[0].rotation.set(-1.25, 0, -.35); pv.legs[1].rotation.set(-1.25, 0, .35);
  } else { pv.legs[0].rotation.z = 0; pv.legs[1].rotation.z = 0; }
  // aura elegida en el vestidor
  const auraC = lookItem("aura").id;
  if (auraC !== "none"){
    if (!pv.userData.lookAura || pv.userData.lookAuraC !== auraC){
      if (pv.userData.lookAura){ pv.remove(pv.userData.lookAura); disposeView(pv.userData.lookAura); }
      const au = new THREE.Mesh(auraGeo(), new THREE.MeshBasicMaterial({ color:new THREE.Color(auraC), transparent:true, opacity:.5,
        depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide }));
      au.rotation.x = -Math.PI / 2; au.position.y = 2; au.scale.setScalar(1.3); pv.add(au);
      pv.userData.lookAura = au; pv.userData.lookAuraC = auraC;
    }
    pv.userData.lookAura.visible = true; pv.userData.lookAura.rotation.z = now() * 2;
    if (Math.random() < .35) parts.push({ x:player.x + rnd(-22, 22), y:player.y + rnd(-22, 22), h:rnd(5, 70) + saddle, vx:0, vy:0, vh:rnd(40, 110),
      life:rnd(.4, .8), color: auraC === "#ffffff" ? `hsl(${(now() * 120) % 360},90%,70%)` : auraC, size:rnd(3, 6) });
  } else if (pv.userData.lookAura) pv.userData.lookAura.visible = false;
  // animaciones de habilidad: giro del torbellino, parpadeo del iaido
  if (player.spinT > 0 && pv.detail) pv.detail.rotation.y = (1 - player.spinT / .62) * Math.PI * 4;
  if (player.flickerT > 0) pv.visible = Math.sin(now() * 70) > -.2;
  if (pv.orb) pv.orb.rotation.set(now() * 1.3, now() * 2, 0);
  if (!pv.userData.shieldFx){
    const sf = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("#c9a8ff"), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.5 }));
    sf.scale.set(150, 170, 1); sf.position.y = 45; pv.add(sf); pv.userData.shieldFx = sf;
  }
  pv.userData.shieldFx.visible = (player.shieldUntil || 0) > now() || (player.veilUntil || 0) > now();
  if ((player.veilUntil || 0) > now()) pv.visible = Math.sin(now() * 30) > .6;

  // enemigos + barra de vida y nombre
  syncGroup(enemies, views.enemies, enemyConfig, e => e.guid, startDeath);
  syncDying(dt);
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
    poseEntity(v, e.x, e.y, e.yaw || 0, { step:e.step, moving:!e.stun, attack: e.telegraph ? .6 : 0,
      hurt: clamp(e.hurt / 0.14, 0, 1) });
    if (e.boss && !v.userData.outline) addOutline(v, 0x1a0e18, 1.06);
    if (e.elite && !v.userData.outline) addOutline(v, new THREE.Color(mobRank(e.rank).col).multiplyScalar(.35).getHex(), 1.07);
    // SS y SSS: columna de luz que se ve desde lejos
    if (mobRank(e.rank).myth && !v.userData.beam){
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(20, 34, 520, 12, 1, true), new THREE.MeshBasicMaterial({ color:new THREE.Color(mobRank(e.rank).col),
        transparent:true, opacity:.22, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending }));
      bm.position.y = 260; v.add(bm); v.userData.beam = bm;
    }
    if (v.userData.beam) v.userData.beam.material.opacity = .15 + Math.sin(now() * 3) * .08;
    // aura en el suelo con el color del rango (de C para arriba) y la de jefe
    const rIdx = MOB_RANKS.findIndex(m => m.r === e.rank);
    if ((rIdx >= 2 || e.boss) && !v.userData.aura){
      const au = new THREE.Mesh(auraGeo(), new THREE.MeshBasicMaterial({ color: new THREE.Color(e.boss ? "#ff5d6c" : mobRank(e.rank).col),
        transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide }));
      au.rotation.x = -Math.PI / 2; au.position.y = 2; au.scale.setScalar((v.scaleRef || 1) * (e.boss ? 1.4 : .8 + rIdx * .1));
      v.add(au); v.userData.aura = au;
    }
    if (v.userData.aura){
      const au = v.userData.aura;
      au.rotation.z = now() * 1.6;
      au.material.opacity = .35 + Math.sin(now() * 4) * .15;
    }
    if (!v.hud){
      const hud = new THREE.Group();
      const bar = healthBar();
      bar.scale.setScalar(e.boss ? 1.25 : .62);
      hud.add(bar); hud.bar = bar;
      const nameSp = labelSprite(`[${e.rank || "E"}] ${e.name} · Nv ${e.level}`, e.boss ? "#ffe9a8" : mobRank(e.rank).col, 46);
      nameSp.scale.set(e.boss ? 150 : 104, e.boss ? 37 : 26, 1);
      nameSp.position.y = 15;
      hud.add(nameSp); hud.name = nameSp;
      hud.position.y = (e.boss ? 132 : 86) * (e.def.r / 18);
      v.add(hud); v.hud = hud;
    }
    v.hud.bar.setPct(e.hp / e.maxHp, e.boss ? 0xffd24a : 0xff4d61);
    const dp = Math.hypot(e.x - player.x, e.y - player.y);
    v.hud.visible = (e.boss || e === target || dp < 300) && e.hp > 0;
    v.hud.name.visible = e.boss || e === target || e.elite;
    v.hud.rotation.y = -v.rotation.y;                     // el HUD siempre de frente
    // Destello al recibir daño. Antes se escribía el emissive de los
    // materiales, pero son compartidos entre todos los personajes del mismo
    // color: pegarle a uno hacía brillar a todos, y al acabar el destello se
    // apagaban los ojos, núcleos y cristales encendidos de todos los enemigos
    // (desde el primer frame, de hecho). Ahora es un halo propio de cada vista.
    if (!v.userData.flash){
      const f = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture("#ff6a6a"), transparent:true, depthWrite:false,
        blending:THREE.AdditiveBlending, opacity:0 }));
      const sc = (v.scaleRef || 1) * 150;
      f.scale.set(sc, sc, 1); f.position.y = 42 * (v.scaleRef || 1);
      f.visible = false; v.add(f); v.userData.flash = f;
    }
    // resplandor de los ojos: se lee de lejos quién te está mirando
    if (!v.userData.eyeGlow && v.neck){
      const L = MOB_LOOK[(e.isle || regionAt(e.x, e.y).id)] || MOB_LOOK.Seoul;
      const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(L.glow || "#ffd24a"), transparent:true,
        depthWrite:false, blending:THREE.AdditiveBlending, opacity:.7 }));
      const sc = (v.scaleRef || 1);
      eg.scale.set(34 * sc, 22 * sc, 1); eg.position.set(0, 8 * sc, 11 * sc);
      v.neck.add(eg); v.userData.eyeGlow = eg;
    }
    if (v.userData.eyeGlow){
      v.userData.eyeGlow.visible = !e.__lodFar;
      v.userData.eyeGlow.material.opacity = (e.telegraph ? 1 : .55) + Math.sin(now() * 5 + e.step) * .15;
    }
    const hurtK = clamp(e.hurt / 0.14, 0, 1);
    v.userData.flash.visible = hurtK > 0;
    v.userData.flash.material.opacity = hurtK * .9;
    const pop = 1 + hurtK * .07;                          // pequeño aplastamiento al encajar
    // aparición: brota del suelo con un rebote en el primer medio segundo
    const age = now() - (e.born || 0);
    let grow = 1;
    if (age < .5){
      const k = clamp(age / .5, 0, 1);
      grow = 1 + Math.sin(k * Math.PI) * .18 - (1 - k) * (1 - k) * .9;
      if (!v.userData.spawnFx){ v.userData.spawnFx = true; ring(e.x, e.y, 70 * (v.scaleRef || 1), e.elite ? "#ffd24a" : "#b07cff", .5); burst(e.x, e.y, 10, "#3a2a55", 6); }
    }
    v.scale.set(pop * grow, (2 - pop) * grow, pop * grow);
  }
  // sombras
  syncGroup(shadows, views.shadows, shadowConfig, sh => sh.uuid);
  for (const sh of shadows){
    const dS = Math.hypot(sh.x - player.x, sh.y - player.y);
    if (sh.__view.setLod) sh.__view.setLod(dS > QUALITY.charDetail);
    const bob = Math.sin(sh.step * .8) * 2.2;
    const v = sh.__view;
    const flying = (SHADOW_LOOK[sh.id] || {}).features?.includes("wings") && (SHADOW_LOOK[sh.id] || {}).body;
    poseEntity(v, sh.x, sh.y, sh.yaw || 0, {
      step:sh.step, moving: sh.state !== "IDLE_FOLLOW", attack: sh.swing > 0 ? 1 : 0, lift: (flying ? 34 : 4) + bob * (flying ? 3 : 1),
    });
    // presencia de sombra: aura en el suelo con el color de su rango, ojos que
    // arden y humo negro que se desprende al moverse
    if (!v.userData.sAura){
      const R = mobRank(sh.data.rank);
      const au = new THREE.Mesh(auraGeo(), new THREE.MeshBasicMaterial({ color:new THREE.Color(R.col), transparent:true, opacity:.4,
        depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide }));
      au.rotation.x = -Math.PI / 2; au.position.y = 2; au.scale.setScalar((v.scaleRef || 1) * (.7 + rankIdxOf(sh.data.rank) * .08)); v.add(au); v.userData.sAura = au;
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("#5a2ab0"), transparent:true, depthWrite:false,
        blending:THREE.AdditiveBlending, opacity:.35 }));
      fl.scale.set(90 * (v.scaleRef || 1), 120 * (v.scaleRef || 1), 1); fl.position.y = 40 * (v.scaleRef || 1); v.add(fl); v.userData.sFlame = fl;
    }
    if (sh.data.shiny && !v.userData.shinyFx){
      v.userData.shinyFx = true;
      addOutline(v, 0xc9a33a, 1.06);
      v.userData.sAura.material.color.set("#fff27a");
      v.userData.sFlame.material.map = glowTexture("#ffe98a"); v.userData.sFlame.material.needsUpdate = true;
    }
    if (sh.data.shiny && dS < 900 && Math.random() < .6){
      const sc = v.scaleRef || 1;
      parts.push({ x:sh.x + rnd(-20, 20) * sc, y:sh.y + rnd(-20, 20) * sc, h:rnd(10, 80) * sc, vx:0, vy:0, vh:rnd(20, 60),
                   life:rnd(.4, .9), color:`hsl(${(now() * 160 + Math.random() * 80) % 360},100%,75%)`, size:rnd(3, 6) });
    }
    v.userData.sAura.rotation.z = -now() * 1.2 - sh.slot;
    v.userData.sAura.visible = dS < 900;
    v.userData.sFlame.material.opacity = .25 + Math.sin(now() * 3 + sh.slot) * .1 + (sh.swing > 0 ? .25 : 0);
    if (dS < 700 && Math.random() < (sh.state !== "IDLE_FOLLOW" ? .5 : .15)){
      const sc = v.scaleRef || 1;
      parts.push({ x:sh.x + rnd(-12, 12) * sc, y:sh.y + rnd(-12, 12) * sc, h:rnd(10, 60) * sc, vx:0, vy:0, vh:rnd(30, 80),
                   life:rnd(.4, .8), color: Math.random() < .7 ? "#1a0f33" : "#7a4ae0", size:rnd(4, 7) });
    }
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

  // orbes de montura caídos: huevo brillante con columna de luz
  const aliveD = new Set();
  for (const d of mountDrops){
    aliveD.add(d);
    if (!d.view){
      const g = new THREE.Group(), col = MOUNTS[d.id].eyes;
      const egg = new THREE.Mesh(new THREE.IcosahedronGeometry(18, 1), mat(col, { emissive:col, emissiveIntensity:.9 })); egg.position.y = 30; g.add(egg); g.egg = egg;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 420, 10, 1, true), new THREE.MeshBasicMaterial({ color:new THREE.Color(col), transparent:true,
        opacity:.25, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending })); beam.position.y = 210; g.add(beam);
      const tag = labelSprite(MOUNTS[d.id].name, col, 44); tag.scale.set(150, 37, 1); tag.position.y = 80; g.add(tag);
      scene.add(g); d.view = g;
    }
    d.view.position.set(d.x, terrainH(d.x, d.y), d.y);
    d.view.egg.rotation.y += dt * 2; d.view.egg.position.y = 30 + Math.sin(now() * 3) * 6;
    d.view.visible = d.t > 5 || Math.sin(now() * 12) > 0;
  }
  for (const v of dropViews) if (![...aliveD].some(d => d.view === v)){ scene.remove(v); disposeView(v); }
  dropViews = mountDrops.map(d => d.view).filter(Boolean);

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
  syncSlashes(dt);
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
  if (scene.userData.motes) syncWeather(dt);
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
    if (o.userData.skyIsle){
      if (o.userData.ox === undefined){ o.userData.ox = o.position.x; o.userData.oz = o.position.z; }
      o.position.set(player.x + o.userData.ox, o.position.y, player.y + o.userData.oz);
      o.visible = !dungeon;
      continue;
    }
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
/* Clima por bioma. Cada partícula vive en una caja de 1800 alrededor del
   jugador y se recicla por el lado contrario al salir, así el efecto nunca se
   acaba ni cuesta más con el mundo. */
const WEATHER = {
  city:    { kind:"dust",    color:"#fff6d8", size:4,  n:90,  add:false },
  guild:   { kind:"dust",    color:"#fff6d8", size:4,  n:90,  add:false },
  urban:   { kind:"dust",    color:"#d8dde8", size:4,  n:120, add:false },
  forest:  { kind:"firefly", color:"#d8ff7a", size:9,  n:150, add:true  },
  ice:     { kind:"snow",    color:"#ffffff", size:8,  n:260, add:false },
  royal:   { kind:"petal",   color:"#ffd0e2", size:8,  n:140, add:false },
  shrine:  { kind:"petal",   color:"#ff9fbf", size:8,  n:200, add:false },
  dark:    { kind:"wisp",    color:"#9fb0ff", size:10, n:120, add:true  },
  mystic:  { kind:"wisp",    color:"#c9a8ff", size:10, n:170, add:true  },
  dragon:  { kind:"ember",   color:"#ffb060", size:7,  n:200, add:true  },
  volcano: { kind:"ember",   color:"#ff7a3a", size:8,  n:260, add:true  },
  storm:   { kind:"rain",    color:"#bcd6ff", size:5,  n:260, add:false },
  cyber:   { kind:"data",    color:"#6ef0ff", size:6,  n:180, add:true  },
  dungeon: { kind:"wisp",    color:"#ff8ab8", size:9,  n:140, add:true  },
};
let weatherKey = null, lightning = 0, lightningT = 8;
function syncWeather(dt){
  const m = scene.userData.motes;
  m.visible = QUALITY.motes;
  const key = dungeon ? "dungeon" : regionAt(player.x, player.y).theme;
  const W = WEATHER[key] || WEATHER.city;
  if (weatherKey !== key){
    weatherKey = key;
    m.material.color.set(W.color);
    m.material.size = W.size;
    m.material.blending = W.add ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.material.opacity = W.add ? .95 : .8;
    m.material.needsUpdate = true;
  }
  // relámpagos en la tormenta: la luz del cielo da un latigazo
  if (key === "storm" && !dungeon){
    lightningT -= dt;
    if (lightningT <= 0){ lightning = 1; lightningT = rnd(6, 14); SFX.thunder && SFX.thunder(); }
  }
  lightning = Math.max(0, lightning - dt * 3.2);
  hemiLight.intensity = .42 + lightning * (Math.random() < .5 ? 1.6 : .8);
  if (!m.visible) return;
  const pos = m.geometry.attributes.position, t = now();
  const seeds = m.userData.seeds, n = Math.min(W.n, seeds.length);
  for (let i = 0; i < seeds.length; i++){
    const p = seeds[i];
    if (i >= n){ pos.setXYZ(i, 0, -9999, 0); continue; }
    switch (W.kind){
      case "snow":    p.y -= 45 * p.sp * dt; p.x += Math.sin(t * .8 + p.ph) * 18 * dt; break;
      case "rain":    p.y -= 620 * p.sp * dt; p.x += 60 * dt; break;
      case "petal":   p.y -= 32 * p.sp * dt; p.x += (Math.sin(t * 1.3 + p.ph) * 40 + 20) * dt; p.z += Math.cos(t + p.ph) * 20 * dt; break;
      case "ember":   p.y += 70 * p.sp * dt; p.x += Math.sin(t * 2 + p.ph) * 25 * dt; break;
      case "wisp":    p.y += 14 * p.sp * dt; p.x += Math.sin(t * .6 + p.ph) * 22 * dt; p.z += Math.cos(t * .5 + p.ph) * 22 * dt; break;
      case "data":    p.y += 55 * p.sp * dt; break;
      case "firefly": p.y += Math.sin(t * 1.4 + p.ph) * 20 * dt; p.x += Math.cos(t * .9 + p.ph) * 26 * dt; p.z += Math.sin(t * .7 + p.ph) * 26 * dt; break;
      default:        p.y += Math.sin(t * .5 + p.ph) * 6 * dt; p.x += 8 * dt;
    }
    const top = W.kind === "firefly" ? 160 : 520;
    if (p.y < 0) p.y += top; else if (p.y > top) p.y -= top;
    // coordenadas del mundo: al andar las atraviesas, y las que quedan atrás
    // reaparecen delante
    if (p.x - player.x < -900) p.x += 1800; else if (p.x - player.x > 900) p.x -= 1800;
    if (p.z - player.y < -900) p.z += 1800; else if (p.z - player.y > 900) p.z -= 1800;
    const wx = p.x, wz = p.z;
    const blink = W.kind === "firefly" && Math.sin(t * 3 + p.ph * 5) < -.4;
    pos.setXYZ(i, wx, blink ? -9999 : terrainH(wx, wz) + p.y + 4, wz);
  }
  pos.needsUpdate = true;
}
let dotTex = null;
function dotTexture(){
  if (dotTex) return dotTex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 32;
  const x = cv.getContext("2d");
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  dotTex = new THREE.CanvasTexture(cv); SHARED.add(dotTex);
  return dotTex;
}
const telePool = [];
/* Tajos. Antes el golpe no dejaba rastro: solo se veía el número de daño.
   Cada ataque dibuja ahora una media luna aditiva delante del personaje, que
   alterna la diagonal según el golpe del combo y se agranda en el remate. */
const slashPool = [], SLASH_GEO = {};
function slashGeo(kind){
  if (SLASH_GEO[kind]) return SLASH_GEO[kind];
  const [r0, r1] = kind === "skill" ? [60, 210] : kind === "finisher" ? [50, 175] : [44, 138];
  const g = new THREE.RingGeometry(r0, r1, 28, 1, -Math.PI * .46, Math.PI * .92);
  SHARED.add(g); SLASH_GEO[kind] = g;
  return g;
}
let slashFlip = 1;
function slashFx(kind){
  if (!scene) return;
  let rec = slashPool.find(r => !r.busy);
  if (!rec){
    const m = new THREE.Mesh(slashGeo(kind), new THREE.MeshBasicMaterial({
      transparent:true, opacity:.9, side:THREE.DoubleSide, depthWrite:false,
      blending:THREE.AdditiveBlending }));
    m.rotation.order = "YXZ"; m.visible = false; scene.add(m);
    rec = { mesh:m, busy:false, life:0, max:1 };
    slashPool.push(rec);
  }
  const color = formActive() ? "#ff5ad8" : P.awakened ? "#b07cff" : "#bfe6ff";
  rec.busy = true;
  rec.max = rec.life = kind === "skill" ? .32 : kind === "finisher" ? .26 : .17;
  rec.mesh.geometry = slashGeo(kind);
  rec.mesh.material.color.set(color);
  const sc = formActive() ? 1.35 : 1;
  rec.mesh.scale.set(sc, sc, sc);
  slashFlip = -slashFlip;
  rec.mesh.position.set(player.x, terrainH(player.x, player.y) + (kind === "skill" ? 30 : 48) * sc, player.y);
  rec.mesh.rotation.set(-Math.PI / 2 + (kind === "skill" ? 0 : slashFlip * .38), player.yaw - Math.PI / 2, 0);
  rec.mesh.visible = true;
}
function syncSlashes(dt){
  for (const r of slashPool){
    if (!r.busy) continue;
    r.life -= dt;
    if (r.life <= 0){ r.busy = false; r.mesh.visible = false; continue; }
    const k = r.life / r.max;
    r.mesh.material.opacity = .95 * k;
    const grow = 1 + (1 - k) * .25;
    r.mesh.scale.multiplyScalar(1 + (grow - 1) * dt * 6);
  }
}
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

let expNoticeT = 0;
function syncExpeditions(){
  const nowT = Date.now();
  if (panelKind === "shadows" && panelTab === "Exped"){
    for (const ex of P.expeditions || []){
      const l = modal.querySelector(`[data-xleft="${ex.uid}"]`), b = modal.querySelector(`[data-xbar="${ex.uid}"]`);
      if (l) l.textContent = nowT >= ex.end ? "¡Lista!" : hms(ex.end - nowT);
      if (b) b.style.width = `${clamp((nowT - ex.start) / (ex.end - ex.start), 0, 1) * 100}%`;
      if (nowT >= ex.end && !modal.querySelector(`[data-xclaim="${ex.uid}"]`)) renderPanel();
    }
  }
  if (nowT > expNoticeT){
    expNoticeT = nowT + 60e3;
    const ready = (P.expeditions || []).filter(e => nowT >= e.end).length;
    if (ready) note(`${ready} expedición(es) de vuelta · menú Sombras › Expediciones`, "--monarch");
  }
}
function syncHud(){
  syncExpeditions();
  $("rank").textContent = P.rank;
  $("title").textContent = P.title;
  $("lvl").textContent = `Nv ${P.level}`;
  $("rebirth").textContent = `Renacer ${P.rebirths}`;
  rollCounter("cash", P.cash);
  rollCounter("gems", P.gems);
  rollCounter("tickets", P.tickets);
  $("isle").textContent = dungeon ? `${dungeon.mode.name} · ${dungeon.isle.name}` : regionAt(player.x, player.y).name;
  const nx = dungeon ? null : distanceToNextRegion();
  $("nextRegion").textContent = nx ? `${nx.next.name} a ${Math.round(nx.dist)} m` : "";
  $("portal").textContent = dungeon
    ? (dungeon.mode.infinite ? `Oleada ${dungeon.room} · récord ${P.infBest || 0} · ${Math.max(0,Math.floor(dungeon.timer))}s`
                             : dungeon.phase === "Boss" ? `Sala del jefe · ${Math.max(0,Math.floor(dungeon.timer))}s`
                             : `Sala ${dungeon.room}/${dungeon.rooms} · ${dungeon.roomKills || 0}/${dungeon.quota} bajas · ${Math.max(0,Math.floor(dungeon.timer))}s`)
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

  $("cd-skill").style.transform = `scaleY(${player.skillCd / (player.skillCdMax || SKILL_INFO[kitOf(P.weapon).skill].cd)})`;
  $("a-skill").title = `${kitOf(P.weapon).sname} (V)`;
  {
    // botón de transformación: solo con el Despertar; muestra lo que queda
    // de transformación o de enfriamiento
    const fb = $("a-form");
    fb.hidden = !P.awakened;
    if (P.awakened){
      const t = now(), act = formActive();
      fb.classList.toggle("on", act);
      const cdLeft = Math.max(0, (player.formReady || 0) - t);
      fb.querySelector(".st").textContent = act ? `${Math.ceil(player.formUntil - t)}s`
                                               : cdLeft > 0 ? `${Math.ceil(cdLeft)}s` : "LISTO";
      $("cd-form").style.transform = `scaleY(${act ? 0 : cdLeft / FORM.cd})`;
    }
  }
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
  panelTab = kind === "items" ? "Relics" : kind === "stats" ? "Stats" : kind === "shadows" ? "Army" : "Weapons";
  panelEnter = true;
  if (kind === "shop") shopSel = null;
  if (kind === "shadows") shadowShown = 60;
  if (kind === "map"){ mapSel = null; mapTab = "Regions"; mobKind = "enemy"; }
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
  const tabs = [["Stats","Atributos"],["Look","Aspecto"],["Mounts","Monturas"],["Class","Clase"],["Talents","Talentos"],["Codes","Códigos"]];
  const nav = `<div class="tabs">${tabs.map(([id,label]) =>
    `<button class="tab ${panelTab===id?"sel":""}" data-tab="${id}">${label}</button>`).join("")}</div>`;
  if (panelTab === "Look"){
    const rows = Object.keys(LOOKS).map(cat => `<div class="lookrow"><span class="lk-cat">${LOOK_CAT[cat]}</span><div class="chips">${
      LOOKS[cat].map(o => { const un = needMet(o.need), on = P.look[cat] === o.id, sw = cat === "hairColor" || cat === "eyes" || cat === "skin" || (cat === "weaponGlow" && o.id !== "auto") || (cat === "aura" && o.id !== "none");
        return `<button class="chip lchip ${on ? "sel" : ""} ${un ? "" : "lk"}" data-look="${cat}|${o.id}" ${un ? "" : "aria-disabled=\"true\""}
          title="${un ? o.name : "Se desbloquea con: " + needText(o.need)}">${sw ? `<i class="sw" style="background:${o.id}"></i>` : ""}${un ? "" : "🔒 "}${o.name}${
          o.bonus ? ` <em>${Object.entries(o.bonus).map(([k, v]) => `+${Math.round(v * 100)}% ${k === "dmg" ? "daño" : k === "hp" ? "vida" : "vel."}`).join(" ")}</em>` : ""}</button>`; }).join("")}</div></div>`).join("");
    const total = Object.values(LOOKS).reduce((a, l) => a + l.length, 0), got = Object.values(LOOKS).reduce((a, l) => a + l.filter(o => needMet(o.need)).length, 0);
    const bon = ["dmg", "hp", "spd"].map(k => [k, lookBonus(k)]).filter(([, v]) => v > 0);
    return shell("Aspecto del cazador", nav + `<div class="inv"><aside class="inv-side"><div class="pv" data-pv="player" style="--tc:var(--arise)"></div>
      <div class="sheet"><b class="sname">Bono de tu aspecto</b><span class="lv">${bon.length ? bon.map(([k, v]) =>
        `+${Math.round(v * 100)}% ${k === "dmg" ? "daño" : k === "hp" ? "vida" : "velocidad"}`).join(" · ") : "Sin bono: equipa piezas raras para ganarlo"}</span></div>
      <div class="collect"><span>Desbloqueado</span><div class="sbar xp"><i style="width:${got / total * 100}%"></i><em>${got} / ${total}</em></div></div></aside>
      <div class="inv-main">${rows}</div></div>
      <p class="kbhelp">Pasa el ratón o mantén pulsado un 🔒 para ver cómo se desbloquea. Los conjuntos dan un pequeño bono mientras los llevas.</p>`);
  }
  if (panelTab === "Mounts"){
    if (!MOUNTS[mountSel]) mountSel = P.mount;
    const cards = Object.entries(MOUNTS).map(([id, m], i) => { const own = P.mounts.includes(id);
      return `<button class="card ${id === mountSel ? "sel" : ""} ${own ? "" : "lock"} ${P.mount === id ? "eq" : ""}" data-mpick="${id}" role="option" aria-selected="${id === mountSel}"
        style="--tc:${m.eyes};--i:${i}"><span class="cg">${own ? (m.fly ? "🐉" : m.body === "serpent" ? "🐍" : m.body === "ant" ? "🐜" : "🐺") : "❔"}</span>
        <b>${own ? m.name : "???"}</b><small>velocidad ×${m.speed}</small>${m.fly ? `<i class="ctier">VUELA</i>` : ""}${P.mount === id ? `<i class="cbadge">EN USO</i>` : ""}</button>`; }).join("");
    const m = MOUNTS[mountSel], own = P.mounts.includes(mountSel);
    const side = `<div class="pv" data-pv="mount" style="--tc:${m.eyes}"></div>
      <div class="sheet" style="--tc:${m.eyes}"><b class="sname">${own ? m.name : "Montura desconocida"}</b>
        <span class="tchip">×${m.speed} de velocidad${m.fly ? " · vuela" : ""}</span>
        <p class="lore">${own ? "Ya es tuya." : "Cómo conseguirla: " + mountSource(mountSel)}</p>
        <div class="sact"><button class="btn green" data-mount="${mountSel}" ${own && P.mount !== mountSel ? "" : "disabled"}>${P.mount === mountSel ? "En uso" : own ? "Usar esta montura" : "Bloqueada"}</button></div></div>`;
    return shell(`Monturas · ${P.mounts.length}/${Object.keys(MOUNTS).length}`, nav + `<div class="inv"><aside class="inv-side">${side}</aside>
      <div class="inv-main"><div class="cards" role="listbox" aria-label="Monturas">${cards}</div></div></div>
      <p class="kbhelp">Las monturas caen como un orbe brillante con columna de luz: acércate para recogerlo antes de 60 s. <kbd>M</kbd> monta y desmonta.</p>`);
  }
  if (panelTab === "Class"){
    const list = Object.values(CLASSES);
    const reel = `<div class="reelwrap"><div class="reelmark"></div><div class="reel" id="reel">${
      Array.from({ length:5 }, () => list.map(c => `<span class="rcell" style="--rc:${CLASS_RARITY[c.rar].col}">${c.glyph}<small>${c.name}</small></span>`).join("")).join("")}</div></div>`;
    const cur = CLASSES[P.class];
    const rows = list.map(c => { const own = P.classes.includes(c.id), R = CLASS_RARITY[c.rar];
      return `<div class="item ${own ? "" : "locked"}" style="border-color:${own ? R.col : ""}"><span class="g" style="border-color:${R.col}">${own ? c.glyph : "❔"}</span>
        <span class="meta"><b>${own ? c.name : "???"} <span class="tier" style="color:${R.col}">${R.name} · ${String(c.p).replace(".", ",")}%</span></b>
        <span>${own ? c.desc : "Sale en la ruleta de clases"}</span></span>
        ${own ? `<button class="btn ${P.class === c.id ? "green" : ""}" data-class="${c.id}" ${P.class === c.id ? "disabled" : ""}>${P.class === c.id ? "Activa" : "Usar"}</button>` : ""}</div>`; }).join("");
    return shell("Clase", nav + `<div class="spinbox">
        <div class="spinhead"><div><small>Clase activa</small><b style="color:${CLASS_RARITY[cur.rar].col}">${cur.glyph} ${cur.name}</b></div>
          <div class="spins"><small>Giros</small><b>${P.spins}</b></div></div>
        ${reel}
        <button class="btn gold big-w" id="spin-btn" ${P.spins > 0 && !spinning ? "" : "disabled"}>${spinning ? "Girando…" : P.spins > 0 ? "🎰 Girar la ruleta (1 giro)" : "Sin giros · consíguelos con códigos"}</button>
        <p class="codemsg" id="spin-msg" role="status"></p></div>
      <h3 class="subh">Clases · ${P.classes.length}/${list.length} · ordenadas por rareza</h3>
      <div class="list">${rows}</div>
      <p class="hint">Las clases que ya tienes se cambian gratis cuando quieras. Si la ruleta te da una repetida, la conviertes en gemas.</p>`);
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
    // Los códigos no se muestran: hay que conocerlos y escribirlos.
    const used = Object.keys(P.codes).filter(c => P.codes[c] && CODES[c]);
    const body = used.length ? used.map(c => `<div class="item locked"><span class="g">✔</span><span class="meta"><b>${c}</b>
      <span>${[CODES[c].spins && `${CODES[c].spins} giros`, CODES[c].cash && `${fmt(CODES[c].cash)} oro`, CODES[c].gems && `${fmt(CODES[c].gems)} gemas`, CODES[c].tickets && `${CODES[c].tickets} ticket`].filter(Boolean).join(" · ")}</span></span></div>`).join("")
      : `<p class="hint">Todavía no has canjeado ningún código.</p>`;
    return shell("Códigos", nav + `<form class="codebox" id="code-form" autocomplete="off">
        <label for="code-in">Escribe un código</label>
        <div class="coderow"><input id="code-in" maxlength="24" spellcheck="false" placeholder="CÓDIGO" aria-label="Código">
          <button class="btn gold" type="submit" id="code-go">Canjear</button></div>
        <p class="codemsg" id="code-msg" role="status"></p></form>
      <h3 class="subh">Canjeados</h3><div class="list">${body}</div>
      <p class="hint">Los códigos no se revelan dentro del juego. Mayúsculas y minúsculas dan igual.</p>`);
  }
  const s = P.stats, next = RANKS[rankIdx(P.rank)+1];
  const rows = Object.keys(STAT_INFO).map(k => `
    <div class="statrow"><span class="k">${k}</span>
      <span class="d"><b>${STAT_INFO[k][0]}</b><br>${STAT_INFO[k][1]}</span>
      <span class="v" data-bump="stat-${k}">${fmt(s[k])}</span>
      <span class="pls">
        <button class="plus" data-stat="${k}" data-n="1" ${s.points > 0 ? "" : "disabled"} aria-label="+1 ${k}">+</button>
        <button class="plus sm" data-stat="${k}" data-n="5" ${s.points > 0 ? "" : "disabled"}>+5</button>
        <button class="plus sm" data-stat="${k}" data-n="max" ${s.points > 0 ? "" : "disabled"}>MAX</button>
      </span>
      <i class="sfill" style="width:${Math.min(100, s[k] / Math.max(1, spentPoints() + s.points) * 100)}%"></i></div>`).join("");
  const need = FORMULA.expRequired(P.level);
  const hero = `<div class="hero"><div class="pv" data-pv="player" style="--tc:var(${P.awakened ? "--monarch" : "--arise"})"></div>
    <div class="hmeta"><small>${CLASSES[P.class].name} · Rango ${P.rank}${P.awakened ? " · Despertado" : ""}</small>
      <b>${P.title}</b><span>Nivel ${P.level}${P.rebirths ? ` · Renacer ${P.rebirths}` : ""}</span>
      <div class="sbar xp"><small>EXP</small><i style="width:${clamp(P.xp / need * 100, 0, 100)}%"></i><em>${fmt(P.xp)} / ${fmt(need)}</em></div>
      <div class="pts ${s.points ? "live" : ""}">${s.points} puntos por repartir</div></div></div>`;
  const rebirthCost = 1e6 * Math.pow(10, P.rebirths);
  return shell(`Atributos · ${s.points} puntos`, nav + hero + `
    <div class="statgrid">${rows}</div>
    <div class="derived">
      <div class="kv"><small>Daño M1</small><b>${fmt(baseDamage())}</b></div>
      <div class="kv"><small>Habilidad · ${kitOf(P.weapon).sname}</small><b>${fmt(skillBase())}</b></div>
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
/* Inventario de sombras: rejilla de tarjetas con el color de su rango,
   filtros, orden y una ficha lateral con la sombra en 3D girando. */
let shadowFilter = "all", shadowSort = "dmg", shadowSel = null;
const TIER_ORDER = ["C", "B", "A", "S", "S Elite", "Monarch"];
// Daño y vida de cada sombra, calculados una vez por repintado: antes se
// recalculaban cientos de veces al ordenar y el menú se trababa.
let shadowCache = null, shadowShown = 60;
function shadowStats(){
  const dmg = new Map(), hp = new Map();
  let maxD = 1, maxH = 1;
  for (const s of Object.values(P.shadows)){
    const d = shadowDmgOf(s), h = shadowHPOf(s);
    dmg.set(s.uuid, d); hp.set(s.uuid, h);
    if (d > maxD) maxD = d; if (h > maxH) maxH = h;
  }
  return (shadowCache = { dmg, hp, maxD, maxH });
}
function shadowSideHTML(){
  const C = shadowCache || shadowStats();
  const sel = P.shadows[shadowSel];
  if (!sel) return `<div class="pv" data-pv="shadow"></div><p class="hint">Sin sombras todavía. Derrota a un enemigo y pulsa <b>B</b> sobre su cuerpo.</p>`;
  const eq = P.squad.includes(sel.uuid), SR = mobRank(sel.rank), look = SHADOW_LOOK[sel.id] || {};
  return `<div class="pv" data-pv="shadow" style="--tc:var(${TIER_VAR[sel.tier]})"></div>
      <div class="sheet" style="--tc:var(${TIER_VAR[sel.tier]})">
        <b class="sname">${sel.shiny ? "✨ " : ""}${sel.name}${sel.shiny ? ` <span class="shinytag">SHINY ×2</span>` : ""}</b>
        <span class="rkrow"><span class="rkbig" style="--rc:${SR.col}">${SR.r}</span><span class="tchip">${sel.tier}</span>
          <span class="lv">Poder ×${SR.sh} por rango</span></span>
        ${look.lore ? `<p class="lore">${look.lore}</p>` : ""}
        <div class="sbar"><small>Daño</small><i style="width:${C.dmg.get(sel.uuid) / C.maxD * 100}%"></i><em>${fmt(C.dmg.get(sel.uuid))}</em></div>
        <div class="sbar hp"><small>Vida</small><i style="width:${C.hp.get(sel.uuid) / C.maxH * 100}%"></i><em>${fmt(C.hp.get(sel.uuid))}</em></div>
        <div class="sact">
          <button class="btn ${eq ? "" : "green"}" data-equip="${sel.uuid}">${eq ? "Quitar del escuadrón" : "Equipar"}</button>
        </div>
      </div>`;
}
// Cambio rápido de selección: solo se tocan la tarjeta y la ficha lateral.
function selectShadowFast(uuid){
  shadowSel = uuid;
  const side = modal.querySelector(".inv-side");
  if (!side || panelKind !== "shadows") return renderPanel();
  modal.querySelectorAll(".card.sel").forEach(c => { c.classList.remove("sel"); c.setAttribute("aria-selected", "false"); });
  const c = modal.querySelector(`.card[data-pick="${uuid}"]`);
  if (c){ c.classList.add("sel"); c.setAttribute("aria-selected", "true"); c.scrollIntoView?.({ block:"nearest" }); if (kbNav) c.focus({ preventScroll:true }); }
  side.innerHTML = shadowSideHTML();
  mountPreview();
}
function panelShadows(){
  const snav = `<div class="tabs"><button class="tab ${panelTab !== "Exped" ? "sel" : ""}" data-tab="Army">Ejército</button>
    <button class="tab ${panelTab === "Exped" ? "sel" : ""}" data-tab="Exped">Expediciones${(P.expeditions || []).some(e => Date.now() >= e.end) ? " ✅" : (P.expeditions || []).length ? ` (${P.expeditions.length})` : ""}</button></div>`;
  if (panelTab === "Exped") return panelExpeditions(snav);
  const C = shadowStats();
  let list = Object.values(P.shadows);
  if (shadowFilter === "eq") list = list.filter(s => P.squad.includes(s.uuid));
  else if (shadowFilter !== "all") list = list.filter(s => (s.rank || "E") === shadowFilter);
  const rk = x => rankIdxOf(x.rank);
  const D = x => C.dmg.get(x.uuid);
  const by = { dmg:(a, b) => D(b) - D(a), lvl:(a, b) => rk(b) - rk(a) || D(b) - D(a),
               tier:(a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier) || D(b) - D(a) };
  list.sort(by[shadowSort] || by.dmg);
  if (!P.shadows[shadowSel]) shadowSel = (list[0] || Object.values(P.shadows)[0])?.uuid || null;
  const tiersHave = MOB_RANKS.map(m => m.r).filter(r => Object.values(P.shadows).some(s => (s.rank || "E") === r));
  const chip = (attr, val, cur, label) => `<button class="chip ${cur === val ? "sel" : ""}" data-${attr}="${val}">${label}</button>`;
  const filters = `<div class="chips"><button class="btn gold" data-autoequip="1" title="Llena el escuadrón con las sombras de más daño">⚡ Equipar las mejores</button>${chip("sfilter", "all", shadowFilter, "Todas")}${chip("sfilter", "eq", shadowFilter, "Equipadas")}${
    tiersHave.map(t => chip("sfilter", t, shadowFilter, t)).join("")}<span class="grow"></span>${
    chip("ssort", "dmg", shadowSort, "Daño")}${chip("ssort", "lvl", shadowSort, "Rango E–S")}${chip("ssort", "tier", shadowSort, "Clase")}</div>`;
  const total = list.length;
  const selIdx = list.findIndex(x => x.uuid === shadowSel);
  if (selIdx >= shadowShown) shadowShown = Math.ceil((selIdx + 1) / 60) * 60;
  const cards = list.slice(0, shadowShown).map((s, i) => {
    const eq = P.squad.includes(s.uuid), R = mobRank(s.rank);
    return `<button class="card ${eq ? "eq" : ""} ${s.uuid === shadowSel ? "sel" : ""} ${R.myth ? "myth" : ""} ${s.shiny ? "shiny" : ""}" data-pick="${s.uuid}" role="option"
      aria-selected="${s.uuid === shadowSel}" aria-label="${s.name}, rango ${R.r}, ${eq ? "equipada" : "sin equipar"}"
      style="--tc:var(${TIER_VAR[s.tier]});--i:${Math.min(i, 20)}">
      <span class="cg">${SHADOWS[s.id]?.glyph || "👤"}</span>
      <b>${s.shiny ? "✨ " : ""}${s.name}</b><small>${fmt(D(s))} de daño</small><i class="crank" style="--rc:${R.col}">${R.r}</i>
      <i class="ctier">${s.tier}</i>${eq ? `<i class="cbadge">EQ</i>` : ""}
      <i class="cbar" style="width:${Math.max(6, D(s) / C.maxD * 100)}%"></i></button>`;
  }).join("") + (total > shadowShown ? `<button class="chip more" data-more="1">Ver ${Math.min(60, total - shadowShown)} más (${total - shadowShown} restantes)</button>` : "");
  const side = shadowSideHTML();
  return shell(`Sombras · ${P.squad.length}/${squadCap()}`, snav + `
    <div class="inv"><aside class="inv-side">${side}</aside>
      <div class="inv-main">${filters}
        <div class="cards" role="listbox" aria-label="Sombras">${cards || `<p class="hint">Ninguna sombra con este filtro.</p>`}</div></div></div>
    <p class="kbhelp">⌨ Flechas para elegir · <kbd>Enter</kbd> equipa o quita · 📱 toca otra vez la tarjeta elegida para equiparla</p>
    <p class="hint">Arrastra la figura para girarla. Escuadrón lleno: una extracción mejor <b>desequipa automáticamente la sombra de menor daño</b>.
    Las de rango <b>A</b> o superior tienen un <b>1%</b> de salir ✨ shiny: el doble de fuertes y doradas.
    Cada enemigo nace con un rango de <b>E</b> a <b>SSS</b>: cuanto más alto, más cuesta vencerlo y extraerlo, y más fuerte sale su sombra.</p>
    <div class="odds">${MOB_RANKS.map(m => `<span style="--rc:${m.col}"><b>${m.r}</b>${pctTxt(m.p)}</span>`).join("")}</div>`);
}
let shopSel = null, mountSel = null;
function panelShop(){
  const cur = WEAPONS[P.weapon];
  const avail = Object.values(WEAPONS).filter(w => P.islands.includes(w.isle));
  // al abrir, la ficha muestra la siguiente mejora que aún no tienes
  if (!avail.some(w => w.id === shopSel))
    shopSel = (avail.filter(w => !(P.weapons[w.id] > 0) && w.dmg > (cur?.dmg || 0)).sort((x, y) => x.cost - y.cost)[0] || cur || avail[0]).id;
  const cards = avail.map((w, i) => {
    const owned = (P.weapons[w.id] || 0) > 0, eq = P.weapon === w.id, copies = P.weapons[w.id] || 0;
    const delta = cur ? (w.dmg / cur.dmg - 1) * 100 : 0;
    const dTxt = eq ? "equipada" : `${delta >= 0 ? "+" : ""}${delta >= 1000 ? fmt(delta) : delta.toFixed(0)}%`;
    return `<button class="card ${eq ? "eq" : ""} ${w.id === shopSel ? "sel" : ""} ${!owned && P.cash < w.cost ? "poor" : ""}" data-wpick="${w.id}" role="option" aria-selected="${w.id === shopSel}"
      style="--tc:${eq ? "var(--gold)" : delta > 0 ? "var(--cash)" : "var(--line-hi)"};--i:${i}">
      <span class="cg">${w.glyph}</span><b>${w.name}${copies > 1 ? ` ×${copies}` : ""}</b>
      <small>${kitOf(w.id).sname}</small><small>${owned ? "en tu arsenal" : fmt(w.cost) + " oro"}</small>
      <i class="ctier ${delta > 0 && !eq ? "up" : ""}">${dTxt}</i>${eq ? `<i class="cbadge">EQ</i>` : ""}
      ${copies >= FLAGS.MERGE_COPIES ? `<i class="cbadge m">×3</i>` : ""}</button>`;
  }).join("");
  const w = WEAPONS[shopSel];
  const owned = (P.weapons[w.id] || 0) > 0, eq = P.weapon === w.id, copies = P.weapons[w.id] || 0;
  const maxD = Math.max(...avail.map(a => a.dmg));
  const side = `<div class="pv" data-pv="weapon" style="--tc:var(--gold)"></div>
    <div class="sheet" style="--tc:var(--gold)">
      <b class="sname">${w.glyph} ${w.name}</b>
      <span class="tchip">${isleOf(w.isle).name}</span>
      <div class="sbar"><small>Daño</small><i style="width:${Math.max(4, Math.log10(w.dmg + 1) / Math.log10(maxD + 1) * 100)}%"></i><em>${fmt(w.dmg)}</em></div>
      <div class="skillbox" style="--tc:${kitOf(w.id).color}"><b>V · ${kitOf(w.id).sname}</b>
        <span>${SKILL_INFO[kitOf(w.id).skill].desc}. ${SKILL_INFO[kitOf(w.id).skill].cd} s · ${SKILL_INFO[kitOf(w.id).skill].mana} maná</span>
        <b>Pasiva</b><span>${PASSIVE_INFO[kitOf(w.id).passive]}</span></div>
      ${cur && !eq ? `<p class="cmp ${w.dmg >= cur.dmg ? "up" : "down"}">${w.dmg >= cur.dmg ? "▲" : "▼"} ${fmt(Math.abs(w.dmg - cur.dmg))} respecto a ${cur.name}</p>` : ""}
      <div class="sact">
        ${copies >= FLAGS.MERGE_COPIES ? `<button class="btn green" data-wmerge="${w.id}">Fusionar ×3</button>` : ""}
        <button class="btn ${owned ? "" : "gold"}" data-weapon="${w.id}" ${eq || (!owned && P.cash < w.cost) ? "disabled" : ""}>${
          eq ? "Equipada" : owned ? "Equipar" : `Comprar · ${fmt(w.cost)}`}</button>
      </div>
    </div>`;
  return shell("Armería", `<div class="gearbar"><button class="btn gold" data-bestgear="1">⚡ Equipar lo mejor · arma y clase</button>
      <span class="hint">Equipa tu arma más fuerte y tu clase más rara de las que ya tienes.</span></div><div class="inv"><aside class="inv-side">${side}</aside>
    <div class="inv-main"><div class="cards" role="listbox" aria-label="Armas">${cards}</div></div></div>
    <p class="kbhelp">⌨ Flechas para elegir · <kbd>Enter</kbd> compra o equipa · 📱 toca otra vez la tarjeta elegida</p>
    <p class="hint">Oro: <b class="price">${fmt(P.cash)}</b>. Tres copias de un arma se fusionan y suben su rango (+25% de daño).
    Las armas se desbloquean al llegar a su isla.</p>`);
}
let beastSel = null;
function panelItems(){
  const tabs = ["Daily","Story","Relics","Runes","Index","Beasts"];
  const nav = `<div class="tabs">${tabs.map(t => `<button class="tab ${panelTab===t?"sel":""}" data-tab="${t}">${
    t === "Daily" ? `Diario${dailyState().can ? " 🎁" : ""}` : t === "Story" ? "Historia" : t === "Relics" ? "Reliquias" : t === "Runes" ? "Runas" : t === "Index" ? "Índice" : "Bestiario"}</button>`).join("")}</div>`;
  if (panelTab === "Daily") return panelDaily(nav);
  const card = (o, i) => `<div class="card ${o.locked ? "lock" : ""}" style="--tc:${o.tc};--i:${i}"><span class="cg">${o.g}</span>
    <b>${o.name}</b><small>${o.sub}</small>${o.power ? `<p class="cpow">${o.power}</p>` : ""}${o.tag ? `<i class="ctier">${o.tag}</i>` : ""}</div>`;
  if (panelTab === "Beasts"){
    if (!beastSel || !ISLANDS.some(i => i.id === beastSel)) beastSel = regionAt(player.x, player.y).id;
    const cards = ISLANDS.map((isle, i) => {
      const un = regionUnlocked(isle), th = THEMES[isle.theme] || THEMES.city;
      return `<button class="card ${isle.id === beastSel ? "sel" : ""} ${un ? "" : "lock"}" data-beast="${isle.id}" style="--tc:${th.g1};--i:${i}">
        <span class="cg">${un ? "👁" : "🔒"}</span><b>${un ? isle.enemy.name : "???"}</b><small>${isle.name}</small><i class="ctier">Nv ${isle.enemy.lvl}</i></button>`;
    }).join("");
    const isle = isleOf(beastSel), un = regionUnlocked(isle), th = THEMES[isle.theme] || THEMES.city;
    const look = MOB_LOOK[isle.id] || {};
    const side = un ? `<div class="pv" data-pv="beast" style="--tc:${th.g1}"></div>
      <div class="sheet" style="--tc:${th.g1}"><b class="sname">${isle.enemy.name}</b>
        <span class="tchip">${isle.name}</span>
        <span class="lv">Especie: ${({ goblin:"goblin", serpent:"serpiente", golem:"estatua viviente", wolf:"lobo", ant:"hormiga", wraith:"espectro", humanoid:"humanoide" })[look.body] || look.body}</span>
        <div class="sbar hp"><small>Vida</small><i style="width:${Math.min(100, (Math.log10(isle.enemy.hp) / 20) * 100)}%"></i><em>${fmt(isle.enemy.hp)}</em></div>
        <div class="sbar"><small>Daño</small><i style="width:${Math.min(100, (Math.log10(isle.enemy.dmg) / 17) * 100)}%"></i><em>${fmt(isle.enemy.dmg)}</em></div>
        <p class="hint">Bruto: <b>${isle.brute.name}</b> · Jefe: <b>${isle.boss.name}</b></p></div>`
      : `<div class="pv locked-pv"><span>🔒</span></div><p class="hint">Llega al nivel ${isle.level} para descubrir esta criatura.</p>`;
    return shell("Inventario", nav + `<div class="inv"><aside class="inv-side">${side}</aside>
      <div class="inv-main"><div class="cards">${cards}</div></div></div>`);
  }
  let body = "";
  if (panelTab === "Story"){
    body = CAMPAIGN.map((c, i) => {
      const state = i < P.chapter ? "cerrado" : i === P.chapter ? "en curso" : "bloqueado";
      const color = i < P.chapter ? "var(--cash)" : i === P.chapter ? "var(--gold)" : "var(--dim)";
      return `<div class="item ${i > P.chapter ? "locked" : ""}"><span class="g">${i < P.chapter ? "✔" : i === P.chapter ? "▶" : "·"}</span>
        <span class="meta"><b>${i + 1}. ${c.title}</b><span>${i <= P.chapter ? c.goal : "Sigue avanzando para desbloquearlo"}</span>
        ${i < P.chapter ? `<span class="quote">${c.speaker}: «${c.dialog}»</span>` : ""}</span>
        <span class="tier" style="color:${color}">${state}</span></div>`;
    }).join("");
    const known = ISLANDS.filter(is => is.id === "Seoul" || (P.lore || []).includes(is.id));
    const chron = ISLANDS.map(is => { const L = REGION_LORE[is.id], k = known.includes(is);
      return `<details class="chron ${k ? "" : "locked"}" ${k ? "" : "aria-disabled=\"true\""}><summary><b>${k ? is.name : "Región sin descubrir"}</b>
        <span>${k ? L.who : "🔒"}</span></summary>${k ? `<p>${L.text}</p>` : ""}</details>`; }).join("");
    return shell("Historia", nav + `<div class="list">${body}</div>
      <h3 class="subh">Crónicas de las regiones · ${known.length}/${ISLANDS.length}</h3><div class="list">${chron}</div>
      <p class="hint">Juego de fan, sin relación oficial con la obra. Personajes y lugares se usan como homenaje;
      todos los modelos y el arte son originales de este proyecto.</p>`);
  }
  let got = 0, total = 0;
  if (panelTab === "Relics"){
    const all = Object.values(RELICS); total = all.length;
    body = all.map((r, i) => { const has = !!P.relics[r.id]; if (has) got++;
      return card({ locked:!has, tc: has ? "var(--gold)" : "var(--line)", g:r.glyph, name:r.name, tag: has ? "ACTIVA" : "🔒",
        sub: `${r.effect === "shadowDmg" ? `Sombras +${(r.value*100).toFixed(0)}%` : r.effect === "ariseLuck" ? `Arise +${r.value}%` : `Rango +${r.value}%`} · ${isleOf(r.isle)?.name || r.isle}`,
        power: RELIC_POWER[r.id] }, i); }).join("");
  } else if (panelTab === "Runes"){
    const all = Object.values(RUNES); total = all.length;
    body = all.map((r, i) => { const n = P.runes[r.id] || 0; if (n) got++;
      const R = RUNE_RARITY[r.rar || "comun"];
      return card({ locked:!n, tc: n ? R.col : "var(--line)", g: n || r.rar === "comun" ? r.glyph : "❔", name: n || r.rar === "comun" ? r.name : "Runa desconocida",
        sub: n || r.rar === "comun" ? r.desc : "Muy rara", tag:`${R.name} ×${fmt(n)}` }, i); }).join("");
  } else {
    const all = Object.values(SHADOWS); total = all.length;
    body = all.map((s, i) => { const n = P.index[s.id] || 0; if (n) got++;
      return card({ locked:!n, tc:`var(${TIER_VAR[s.tier]})`, g: n ? s.glyph : "❔", name: n ? s.name : "???",
        sub: `daño ${fmt(s.dmg)} · tasa ${(s.rate*100).toFixed(1)}%`, tag: n ? `${s.tier} ×${n}` : s.tier }, i); }).join("");
  }
  const pct = total ? got / total * 100 : 0;
  return shell("Inventario", nav + `<div class="collect"><span>Colección</span><div class="sbar xp"><i style="width:${pct}%"></i><em>${got} / ${total}</em></div></div>
    <div class="cards grid-only">${body}</div>
    <p class="hint">Las reliquias caen en mazmorras de su isla. Las runas modifican la siguiente mazmorra (activación del líder).</p>`);
}
/* Mapa del mundo interactivo: anillos concéntricos con el color de su bioma,
   tu posición real, el portal y los cazadores. Tocar un anillo abre su ficha
   con el enemigo típico en 3D y el botón de viaje. */
let mapSel = null, mapTab = "Regions", mobKind = "enemy";
function regionUnlocked(i){ return P.level >= i.level || P.islands.includes(i.id); }
function worldMapSVG(){
  const N = ISLANDS.length, R = 150, band = R / N, cur = ringAt(player.x, player.y);
  const toMap = (x, y) => { const k = R / (N * CFG.RING_WIDTH); return [160 + (x - CFG.WORLD.cx) * k, 160 + (y - CFG.WORLD.cy) * k]; };
  let rings = "";
  for (let i = N - 1; i >= 0; i--){
    const isle = ISLANDS[i], th = THEMES[isle.theme] || THEMES.city, un = regionUnlocked(isle);
    rings += `<circle class="ring ${un ? "" : "lk"} ${i === mapSel ? "sel" : ""} ${i === cur ? "cur" : ""}" data-mring="${i}"
      cx="160" cy="160" r="${(i + .5) * band}" stroke="${th.g1}" stroke-width="${band - 1}" fill="none"><title>${isle.name}</title></circle>`;
  }
  const labels = ISLANDS.map((isle, i) => `<text x="160" y="${160 - (i + .5) * band + 3}" class="rlbl">${i}</text>`).join("");
  const [px, py] = toMap(player.x, player.y);
  const hunters = HUNTERS.map(h => { const [hx, hy] = toMap(h.x, h.y); return `<circle cx="${hx}" cy="${hy}" r="3" class="hpin"><title>${h.name}</title></circle>`; }).join("");
  const port = portal ? (() => { const [qx, qy] = toMap(portal.x, portal.y); return `<circle cx="${qx}" cy="${qy}" r="5" class="ppin"><title>Portal</title></circle>`; })() : "";
  return `<svg class="wmap" viewBox="0 0 320 320" role="img" aria-label="Mapa del mundo">
    <defs><radialGradient id="wmg"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    ${rings}${labels}<circle cx="160" cy="160" r="150" fill="url(#wmg)" pointer-events="none"/>
    ${hunters}${port}
    <g class="me" transform="translate(${px} ${py})"><circle r="9" class="mepulse"/><circle r="4.5" class="medot"/></g>
  </svg>`;
}
function panelMap(){
  const cur = ringAt(player.x, player.y);
  if (mapSel === null || !ISLANDS[mapSel]) mapSel = cur;
  const isle = ISLANDS[mapSel], un = regionUnlocked(isle), th = THEMES[isle.theme] || THEMES.city;
  const r = Math.round(ringRadius(mapSel)), here = mapSel === cur;
  const dist = Math.round(Math.abs(Math.hypot(player.x - CFG.WORLD.cx, player.y - CFG.WORLD.cy) - r));
  const tabs = [["Regions","Región"],["Hunters","Cazadores"],["Gates","Puertas"]];
  const nav = `<div class="tabs">${tabs.map(([id, l]) => `<button class="tab ${mapTab === id ? "sel" : ""}" data-maptab="${id}">${l}</button>`).join("")}</div>`;
  let right = "";
  if (mapTab === "Regions"){
    right = `<div class="rcard" style="--tc:${th.g1};--sky:${th.sky1}">
      <div class="rhead"><small>Anillo ${mapSel} · ${isle.theme}</small><b>${isle.name}</b>
        <span>${here ? "📍 Estás aquí" : un ? `a ${fmt(dist)} m` : `🔒 Requiere nivel ${isle.level}`}</span></div>
      ${un && (isle.id === "Seoul" || (P.lore || []).includes(isle.id)) ? `<p class="lore">«${REGION_LORE[isle.id].text.split(". ")[0]}.»</p>` : ""}
      <div class="pv" data-pv="mob" style="--tc:${th.g1}"></div>
      <div class="chips">${["enemy","brute","boss"].map(k => `<button class="chip ${mobKind === k ? "sel" : ""}" data-mobkind="${k}">${
        k === "enemy" ? isle.enemy.name : k === "brute" ? isle.brute.name : "👑 " + isle.boss.name}</button>`).join("")}</div>
      <div class="derived">
        <div class="kv"><small>Nivel recomendado</small><b>${isle.level}</b></div>
        <div class="kv"><small>Vida típica</small><b>${fmt(isle[mobKind].hp)}</b></div>
        <div class="kv"><small>Daño</small><b>${fmt(isle[mobKind].dmg)}</b></div>
        <div class="kv"><small>Sombras</small><b style="font-size:12px">${[SHADOWS[isle.id + "_n"], SHADOWS[isle.id + "_b"], SHADOWS[isle.boss.shadow]].filter(Boolean).map(x => x.name).join(" · ")}</b></div>
      </div>
      <button class="btn ${here ? "" : "green"} big-w" data-ring="${mapSel}" ${!un || here ? "disabled" : ""}>${here ? "Estás aquí" : un ? "Viajar ahora" : "Bloqueada"}</button>
    </div>`;
  } else if (mapTab === "Hunters"){
    right = `<div class="list">${HUNTERS.map(h => `<div class="item"><span class="g">🛡</span>
      <span class="meta"><b>${h.name} <span style="opacity:.6">Rango ${h.rank}</span></b>
      <span>${h.role === "forja" ? "Templa tu arma a cambio de oro" : h.role === "sanar" ? "Cura completa y bendición de daño"
        : h.role === "entrenar" ? "Entrena por gemas y da puntos de atributo" : "Consulta el índice de sombras"} · anillo ${h.ring}</span></span>
      <button class="btn green" data-hunter="${h.id}">Ir</button></div>`).join("")}</div>`;
  } else {
    right = `<div class="list">${Object.entries(DUNGEON_MODES).map(([id, m]) => m.infinite ? `<div class="item inf"><span class="g">♾</span>
      <span class="meta"><b>${m.name}</b><span>Oleadas sin fin, cada una más dura · jefe cada 10 · runas raras desde la oleada 10 (épicas desde la 20, legendarias desde la 40, la mítica desde la 60) · récord: oleada ${P.infBest || 0}</span></span>
      <button class="btn" data-dungeon="Infinite">Entrar gratis</button></div>` : `<div class="item"><span class="g">🌀</span>
      <span class="meta"><b>${m.name}</b><span>${m.rooms} salas · ${m.quota} bajas por sala · enemigos ×${m.mult} · recompensa ×${m.reward}${id === "DoubleDungeon" ? " · otorga el Despertar" : ""}</span></span>
      <button class="btn violet" data-dungeon="${id}" ${P.tickets > 0 || id === "Standard" ? "" : "disabled"}>${id === "Standard" ? "Entrar" : "1 🎟"}</button></div>`).join("")}</div>`;
  }
  const strip = `<div class="rstrip" role="listbox" aria-label="Regiones">
    <button class="rstep" data-mstep="-1" aria-label="Región anterior">◀</button>
    <div class="rpills">${ISLANDS.map((is, i) => { const t2 = THEMES[is.theme] || THEMES.city, u = regionUnlocked(is);
      return `<button class="rpill ${i === mapSel ? "sel" : ""} ${u ? "" : "lk"} ${i === cur ? "cur" : ""}" data-mring="${i}" role="option"
        aria-selected="${i === mapSel}" aria-label="${is.name}${u ? "" : ", bloqueada"}" style="--tc:${t2.g1}">${u ? i : "🔒"}</button>`; }).join("")}</div>
    <button class="rstep" data-mstep="1" aria-label="Región siguiente">▶</button></div>`;
  return shell("Mapa del mundo", `${strip}<div class="mapwrap2">
      <div class="mapside">${worldMapSVG()}
        <div class="legend"><span><i class="lg me"></i>Tú</span><span><i class="lg hp"></i>Cazador</span><span><i class="lg pp"></i>Portal</span><span><i class="lg lk"></i>Bloqueada</span></div>
        <p class="kbhelp">Toca un anillo o un número · ⌨ <kbd>←</kbd><kbd>→</kbd> cambian de región · <kbd>Enter</kbd> viaja</p></div>
      <div class="mapinfo">${nav}${right}</div></div>`);
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
      <div class="kv"><small>Transformación (despertado)</small><b>T</b></div>
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
/* Navegación de los menús con teclado (y mando de flechas): las flechas mueven
   la selección por la rejilla o por las regiones y Enter hace la acción
   principal de la ficha. */
let kbNav = false;
function panelPrimary(){
  const btn = modal.querySelector(".sheet [data-equip], .sheet [data-weapon]:not([disabled]), .sheet [data-mount]:not([disabled]), .rcard [data-ring]:not([disabled])");
  if (btn){ btn.click(); return true; }
  return false;
}
function mapStep(d){
  mapSel = clamp((mapSel ?? 0) + d, 0, ISLANDS.length - 1); mapTab = "Regions"; SFX.ui(); renderPanel();
}
function panelKey(k, e){
  const arrows = ["arrowleft", "arrowright", "arrowup", "arrowdown"];
  if (k === "enter"){
    const f = document.activeElement;
    if (f && modal.contains(f) && f.tagName === "BUTTON" && !f.classList.contains("card") && !f.classList.contains("rpill")) return false;
    e.preventDefault(); return panelPrimary();
  }
  if (!arrows.includes(k)) return false;
  e.preventDefault(); kbNav = true;
  const dx = k === "arrowleft" ? -1 : k === "arrowright" ? 1 : 0, dy = k === "arrowup" ? -1 : k === "arrowdown" ? 1 : 0;
  if (panelKind === "map"){ mapStep(dx || dy); return true; }
  const cards = [...modal.querySelectorAll(".cards .card[data-pick], .cards .card[data-wpick], .cards .card[data-beast], .cards .card[data-mpick]")];
  if (!cards.length) return true;
  let i = cards.findIndex(c => c.classList.contains("sel")); if (i < 0) i = 0;
  const cols = Math.max(1, Math.round(cards[0].parentElement.clientWidth / (cards[0].offsetWidth + 9)));
  const j = clamp(i + dx + dy * cols, 0, cards.length - 1);
  const c = cards[j];
  if (c.dataset.pick){ SFX.ui(); selectShadowFast(c.dataset.pick); return true; }
  if (c.dataset.wpick) shopSel = c.dataset.wpick; else if (c.dataset.mpick) mountSel = c.dataset.mpick; else beastSel = c.dataset.beast;
  SFX.ui(); renderPanel();
  return true;
}
function redeemCode(){
  const inp = document.getElementById("code-in"), msg = document.getElementById("code-msg");
  if (!inp) return;
  const c = inp.value.trim().toUpperCase().replace(/\s+/g, "");
  const say = (t, ok) => { if (msg){ msg.textContent = t; msg.className = "codemsg " + (ok ? "ok" : "bad"); } };
  if (!c) return say("Escribe un código primero.");
  if (!CODES[c]){ SFX.ariseFail?.(); inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); return say("Ese código no existe."); }
  if (P.codes[c]) return say("Ya canjeaste ese código.");
  P.codes[c] = true;
  P.cash += CODES[c].cash; P.gems += CODES[c].gems; P.tickets += CODES[c].tickets; P.spins += CODES[c].spins || 0;
  banner("CÓDIGO CANJEADO", "#ffd24a");
  note(`${c}: ${[CODES[c].spins && `+${CODES[c].spins} giros de clase`, CODES[c].cash && `+${fmt(CODES[c].cash)} oro`, CODES[c].gems && `+${fmt(CODES[c].gems)} gemas`, CODES[c].tickets && `+${CODES[c].tickets} ticket`].filter(Boolean).join(" · ")}`, "--gold");
  SFX.levelUp?.(); save(); dirty = true; renderPanel();
  const m2 = document.getElementById("code-msg"); if (m2){ m2.textContent = `¡${c} canjeado!`; m2.className = "codemsg ok"; }
}
let spinning = false;
function spinClass(){
  if (spinning || P.spins <= 0) return;
  P.spins--; spinning = true; save();
  const got = rollClass(), list = Object.keys(CLASSES);
  const reel = document.getElementById("reel"), btn = document.getElementById("spin-btn");
  if (btn){ btn.disabled = true; btn.textContent = "Girando…"; }
  const sp = document.querySelector(".spins b"); if (sp) sp.textContent = P.spins;
  SFX.ui();
  const finish = () => {
    spinning = false;
    const c = CLASSES[got], R = CLASS_RARITY[c.rar], fresh = !P.classes.includes(got);
    if (fresh){ P.classes.push(got); P.class = got; }
    else { const g = [10, 25, 60, 150, 400, 1500][Object.keys(CLASS_RARITY).indexOf(c.rar)]; P.gems += g; }
    save(); dirty = true;
    banner(`${c.glyph} ${c.name.toUpperCase()}`, R.col);
    if (fresh && (c.rar === "legend" || c.rar === "mitico")){ SFX.levelUp(); burst(player.x, player.y, 60, R.col, 40); camImpulse(.8); }
    renderPanel();
    // la cinta se queda sobre la clase ganadora, resaltada
    const r2 = document.getElementById("reel");
    if (r2){
      const cells = r2.querySelectorAll(".rcell"), w2 = cells[0] ? cells[0].offsetWidth + 6 : 96, i2 = 3 * list.length + list.indexOf(got);
      r2.style.transition = "none"; r2.style.transform = `translateX(${-(i2 * w2) + r2.parentElement.clientWidth / 2 - w2 / 2}px)`;
      cells[i2]?.classList.add("win");
    }
    const m = document.getElementById("spin-msg");
    if (m){ m.className = "codemsg ok"; m.textContent = fresh ? `¡Nueva clase ${R.name.toLowerCase()}: ${c.name}! Ya está activa.`
      : `${c.name} repetida · convertida en gemas.`; }
  };
  if (!reel){ finish(); return; }
  // la cinta da varias vueltas y frena sobre la clase que ha salido
  const cell = reel.querySelector(".rcell"), w = cell ? cell.offsetWidth + 6 : 96;
  const idx = 3 * list.length + list.indexOf(got);
  const mid = reel.parentElement.clientWidth / 2 - w / 2;
  reel.style.transition = "none"; reel.style.transform = "translateX(0)";
  void reel.offsetWidth;
  reel.style.transition = "transform 3.2s cubic-bezier(.12,.72,.18,1)";
  reel.style.transform = `translateX(${-(idx * w) + mid}px)`;
  let ticks = 0; const tick = setInterval(() => { if (++ticks > 18) clearInterval(tick); else SFX.ui(); }, 150);
  setTimeout(finish, 3300);
}
let panelEnter = false, bumpPrev = new Map();
function renderPanel(){
  if (!panelKind){ modal.hidden = true; modal.innerHTML = ""; bumpPrev.clear(); return; }
  const scroll = modal.querySelector(".panel")?.scrollTop || 0;
  const cardScroll = modal.querySelector(".cards")?.scrollTop || 0;
  modal.innerHTML = panelKind === "stats" ? panelStats()
    : panelKind === "shadows" ? panelShadows()
    : panelKind === "shop" ? panelShop()
    : panelKind === "items" ? panelItems()
    : panelKind === "map" ? panelMap() : panelHelp();
  modal.hidden = false;
  const scrim = modal.querySelector(".scrim");
  if (panelEnter){ scrim?.classList.add("enter"); panelEnter = false; }
  else {
    const pn = modal.querySelector(".panel"); if (pn) pn.scrollTop = scroll;
    const cs = modal.querySelector(".cards"); if (cs) cs.scrollTop = cardScroll;
  }
  // escalonado de entrada de filas y tarjetas
  modal.querySelectorAll(".item,.kv,.statrow").forEach((el, i) => el.style.setProperty("--i", Math.min(i, 24)));
  // los números que cambian dan un saltito
  const next = new Map();
  modal.querySelectorAll(".kv").forEach(kv => { const k = kv.querySelector("small")?.textContent; if (k) kv.dataset.bump = "kv-" + k; });
  modal.querySelectorAll("[data-bump]").forEach(el => {
    const k = el.dataset.bump, v = el.textContent.trim();
    next.set(k, v);
    if (bumpPrev.has(k) && bumpPrev.get(k) !== v) el.classList.add("bump");
  });
  bumpPrev = next;
  mountPreview();
  // la tarjeta elegida queda a la vista y con el foco del teclado
  const selc = modal.querySelector(".card.sel, .rpill.sel");
  if (selc){ selc.scrollIntoView?.({ block:"nearest", inline:"nearest" }); if (kbNav) selc.focus({ preventScroll:true }); }
}
/* Vista 3D de los menús: un segundo renderer pequeño con su propia escena,
   un pedestal y luz de estudio. El lienzo se reutiliza entre repintados del
   panel y se puede girar arrastrando. */
const PV = { r:null, scene:null, cam:null, obj:null, key:null, cv:null, spin:0, drag:null, ped:null };
function previewInit(){
  if (PV.r) return true;
  if (!THREE_OK) return false;
  try {
    PV.cv = document.createElement("canvas"); PV.cv.className = "pv-canvas";
    PV.r = new THREE.WebGLRenderer({ canvas:PV.cv, antialias:true, alpha:true });
    PV.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    PV.r.setSize(240, 260, false);
    PV.scene = new THREE.Scene();
    PV.scene.add(new THREE.HemisphereLight(0xe6eeff, 0x2a1d44, .75));
    const key = new THREE.DirectionalLight(0xffffff, .95); key.position.set(90, 170, 140); PV.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9f7cff, .8); rim.position.set(-140, 90, -160); PV.scene.add(rim);
    const ped = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(54, 60, 10, 40), new THREE.MeshLambertMaterial({ color:0x1c2656 }));
    top.position.y = -5; ped.add(top);
    const glow = new THREE.Mesh(new THREE.RingGeometry(46, 56, 48),
      new THREE.MeshBasicMaterial({ color:0x2fe4ff, transparent:true, opacity:.7, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = .6; ped.add(glow); ped.glow = glow;
    PV.scene.add(ped); PV.ped = ped;
    PV.cam = new THREE.PerspectiveCamera(30, 240 / 260, 1, 3000);
    const move = x => { if (PV.drag === null) return; PV.spin += (x - PV.drag) * .012; PV.drag = x; };
    PV.cv.addEventListener("pointerdown", e => { PV.drag = e.clientX; PV.cv.setPointerCapture?.(e.pointerId); });
    PV.cv.addEventListener("pointermove", e => move(e.clientX));
    const up = () => { PV.drag = null; };
    PV.cv.addEventListener("pointerup", up); PV.cv.addEventListener("pointercancel", up);
  } catch (err){ PV.r = null; return false; }
  return true;
}
function previewConfig(kind){
  if (kind === "shadow"){
    const d = P.shadows[shadowSel];
    return d ? { cfg: shadowConfig({ data:d }), key:`sh|${d.id}|${d.tier}|${d.rank}|${d.shiny ? 1 : 0}` } : null;
  }
  if (kind === "mount"){
    const id = mountSel || P.mount;
    return { build: () => buildMountView(id), key:`mount|${id}|${P.mounts.includes(id)}`, dark: !P.mounts.includes(id) };
  }
  if (kind === "mob" || kind === "beast"){
    const isle = kind === "beast" ? (isleOf(beastSel) || ISLANDS[0]) : ISLANDS[mapSel ?? 0];
    const k = kind === "beast" ? "enemy" : mobKind;
    const def = { ...isle[k], kind: k === "brute" ? "brute" : "normal", r:18, boss: k === "boss" };
    return { cfg: enemyConfig({ def, isle:isle.id, look:{}, boss: k === "boss", x:0, y:0 }), key:`mob|${isle.id}|${k}` };
  }
  if (kind === "weapon"){
    const w = WEAPONS[shopSel] || WEAPONS[P.weapon];
    const base = playerConfig();
    return { cfg:{ ...base, weaponKind: weaponKind(w.id), weapon: base.weaponGlow ? base.weapon : "#e8eefc" }, key:`wp|${base.key}|${weaponKind(w.id)}` };
  }
  const c = playerConfig();
  return { cfg:c, key:`pl|${c.key}` };
}
function mountPreview(){
  const slot = modal.querySelector("[data-pv]");
  if (!slot || !previewInit()) return;
  const pc = previewConfig(slot.dataset.pv);
  if (!pc) return;
  if (PV.key !== pc.key){
    if (PV.obj){ PV.scene.remove(PV.obj); disposeView(PV.obj); }
    PV.obj = pc.build ? pc.build() : buildCharacter(pc.cfg);
    if (pc.dark) PV.obj.traverse(o => { if (o.isMesh){ o.material = new THREE.MeshBasicMaterial({ color:0x05060d }); } });
    addOutline(PV.obj, 0x07060d, 1.05);
    PV.scene.add(PV.obj); PV.key = pc.key;
    const sc = PV.obj.scaleRef || 1;
    PV.cam.position.set(0, 64 * sc, 300 * sc);
    PV.cam.lookAt(0, 38 * sc, 0);
    PV.ped.scale.setScalar(sc);
  }
  // el lienzo toma la forma de su hueco (ficha alta o banda panorámica)
  const w = Math.max(80, Math.round(slot.clientWidth || 240)), h = Math.max(80, Math.round(slot.clientHeight || 260));
  if (PV.w !== w || PV.h !== h){ PV.w = w; PV.h = h; PV.r.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); }
  const col = getComputedStyle(slot).getPropertyValue("--tc").trim();
  if (col) try { PV.ped.glow.material.color.set(col); } catch (err){}
  slot.appendChild(PV.cv);
}
function previewTick(dt){
  if (!PV.r || !PV.obj || !PV.cv.isConnected) return;
  PV.acc = (PV.acc || 0) + dt;
  if (PV.acc < 1 / 30) return;                 // la vista 3D va a 30 fps como mucho
  dt = PV.acc; PV.acc = 0;
  if (PV.drag === null) PV.spin += dt * .7;
  PV.obj.rotation.y = PV.spin;
  poseCharacter(PV.obj, { step: now() * 2, moving:false, attack:0 });
  if (PV.obj.userData.mfx) animateMount(PV.obj, dt, true, 1e9, 1e9);
  PV.ped.glow.material.opacity = .5 + Math.sin(now() * 3) * .2;
  PV.r.render(PV.scene, PV.cam);
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
modal.addEventListener("submit", e => { if (e.target.id === "code-form"){ e.preventDefault(); redeemCode(); } });
modal.addEventListener("click", e => {
  // las tarjetas y botones llevan texto e iconos dentro: se busca el botón
  const t = e.target.closest("button") || e.target;
  kbNav = false;
  if (t.dataset.close !== undefined && (t.classList.contains("scrim") || t.classList.contains("x"))){ closePanel(); closeArise(); return; }
  if (t.dataset.tab){ panelTab = t.dataset.tab; panelEnter = true; SFX.ui(); renderPanel(); return; }
  if (t.dataset.pick){
    // segundo toque sobre la tarjeta ya elegida = equipar / quitar
    if (shadowSel === t.dataset.pick){ panelPrimary(); return; }
    SFX.ui(); selectShadowFast(t.dataset.pick); return;
  }
  if (t.dataset.mstep){ mapStep(+t.dataset.mstep); return; }
  if (t.dataset.more){ shadowShown += 60; renderPanel(); return; }
  if (t.dataset.bestgear){
    const wd = id => Math.max(6, WEAPONS[id].dmg) * Math.pow(1.25, weaponLv(id) - 1);
    const bestW = Object.keys(P.weapons).filter(id => P.weapons[id] > 0 && WEAPONS[id]).sort((a, b) => wd(b) - wd(a))[0];
    const rk = Object.keys(CLASS_RARITY);
    const bestC = P.classes.slice().sort((a, b) => rk.indexOf(CLASSES[b].rar) - rk.indexOf(CLASSES[a].rar)
      || Object.values(CLASSES[b].bonus).reduce((x, y) => x + y, 0) - Object.values(CLASSES[a].bonus).reduce((x, y) => x + y, 0))[0];
    const changed = (bestW && bestW !== P.weapon) || (bestC && bestC !== P.class);
    if (bestW) P.weapon = bestW; if (bestC) P.class = bestC;
    player.hp = Math.min(player.hp, maxHP()); save(); dirty = true; SFX.ui();
    note(changed ? `Equipado: ${WEAPONS[P.weapon].name} · clase ${CLASSES[P.class].name}` : "Ya llevas lo mejor que tienes", "--gold");
    renderPanel(); return;
  }
  if (t.dataset.autoequip){
    // las de más daño que no estén de expedición, hasta llenar el escuadrón
    const best = Object.values(P.shadows).filter(x => !x.busy).sort((a, b) => shadowDmgOf(b) - shadowDmgOf(a)).slice(0, squadCap()).map(x => x.uuid);
    const same = best.length === P.squad.length && best.every(u => P.squad.includes(u));
    P.squad = best; rebuildSquad(); save(); dirty = true; SFX.ui();
    note(same ? "Ya llevas las mejores sombras" : `Escuadrón: ${best.length} sombras más fuertes equipadas`, "--monarch");
    renderPanel(); return;
  }
  if (t.dataset.xsel){ expSel = t.dataset.xsel; expPick = []; SFX.ui(); renderPanel(); return; }
  if (t.dataset.xpick){ const u = t.dataset.xpick, i = expPick.indexOf(u);
    if (i >= 0) expPick.splice(i, 1); else if (expPick.length < EXP_MAX_SHADOWS) expPick.push(u); SFX.ui(); renderPanel(); return; }
  if (t.dataset.xauto){ expPick = Object.values(P.shadows).filter(sh => !sh.busy).sort((a, b) => shadowDmgOf(b) - shadowDmgOf(a)).slice(0, EXP_MAX_SHADOWS).map(sh => sh.uuid); renderPanel(); return; }
  if (t.dataset.xgo){ startExpedition(t.dataset.xgo, expPick); expPick = []; renderPanel(); return; }
  if (t.dataset.xclaim){ claimExpedition(t.dataset.xclaim); renderPanel(); return; }
  if (t.dataset.look){
    const [cat, id] = t.dataset.look.split("|"), o = LOOKS[cat].find(x => x.id === id);
    if (!needMet(o.need)){ note(`Se desbloquea con: ${needText(o.need)}`, "--dim"); return; }
    P.look[cat] = id; save(); dirty = true; SFX.ui(); renderPanel(); return;
  }
  if (t.dataset.mpick){
    if (mountSel === t.dataset.mpick){ panelPrimary(); return; }
    mountSel = t.dataset.mpick; SFX.ui(); renderPanel(); return;
  }
  if (t.dataset.mount){
    if (!P.mounts.includes(t.dataset.mount)) return;
    P.mount = t.dataset.mount; note(`Montura: ${MOUNTS[P.mount].name}`, "--gold"); save(); SFX.ui(); renderPanel(); return;
  }
  const ringEl = e.target.closest("[data-mring]");
  if (ringEl){ mapSel = +ringEl.dataset.mring; mapTab = "Regions"; SFX.ui(); renderPanel(); return; }
  if (t.dataset.maptab){ mapTab = t.dataset.maptab; SFX.ui(); renderPanel(); return; }
  if (t.dataset.mobkind){ mobKind = t.dataset.mobkind; SFX.ui(); renderPanel(); return; }
  if (t.dataset.beast){ beastSel = t.dataset.beast; SFX.ui(); renderPanel(); return; }
  if (t.dataset.wpick){
    if (shopSel === t.dataset.wpick){ panelPrimary(); return; }
    shopSel = t.dataset.wpick; SFX.ui(); renderPanel(); return;
  }
  if (t.dataset.sfilter){ shadowFilter = t.dataset.sfilter; SFX.ui(); renderPanel(); return; }
  if (t.dataset.ssort){ shadowSort = t.dataset.ssort; SFX.ui(); renderPanel(); return; }
  if (t.dataset.stat){
    const k = t.dataset.stat;
    const n = t.dataset.n === "max" ? P.stats.points : Math.min(P.stats.points, +t.dataset.n || 1);
    if (n > 0){ P.stats.points -= n; P.stats[k] += n; rebuildSquad(); save(); dirty = true; SFX.ui(); renderPanel(); }
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
    if (!P.classes.includes(t.dataset.class)) return;
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
  if (t.id === "code-go"){ e.preventDefault(); redeemCode(); return; }
  if (t.id === "spin-btn"){ spinClass(); return; }
  if (t.id === "daily-btn"){ claimDaily(); renderPanel(); return; }
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
    if (i < 0 && P.shadows[u]?.busy) return note("Esa sombra está de expedición", "--hp");
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
    shadowSel = merged.uuid;
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
    // el viaje rápido usa la misma transición que cruzar a pie
    const nuevo = !P.islands.includes(isle.id);
    P.island = isle.id;
    if (nuevo) P.islands.push(isle.id);
    crossRegion(isle, nuevo);
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
    if (id !== "Standard" && id !== "Infinite"){
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
$("a-form").onclick = activateForm;
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
  // ---- epílogo: lo que viene después de la corona
  { id:"ruler", title:"Los Gobernantes",
    goal:"Consigue una sombra de rango SS o superior",
    done:() => Object.values(P.shadows).some(x => rankIdxOf(x.rank) >= 6),
    speaker:"SISTEMA", dialog:"Los Gobernantes observan. Ninguna sombra de ese poder había vuelto a obedecer a nadie desde la primera guerra.",
    reward:() => { P.gems += 5e6; note("+5M gemas", "--gem"); } },
  { id:"legion", title:"La Legión sin fin",
    goal:"Reúne 100 sombras",
    done:() => Object.keys(P.shadows).length >= 100,
    speaker:"Bellion", dialog:"Mi señor, la legión está formada. Cien espadas esperan su orden. Mil vendrán después.",
    reward:() => { P.tickets += 10; note("+10 tickets de puerta", "--ticket"); } },
  { id:"rider", title:"Jinete de sombras",
    goal:"Consigue 4 monturas distintas",
    done:() => (P.mounts || []).length >= 4,
    speaker:"Yoo Jinho", dialog:"¿Ahora también dragones? Jefe, la próxima vez avíseme antes de aterrizar en la sede del gremio.",
    reward:() => { P.cash += 1e12; note("+1T de oro", "--cash"); } },
  { id:"sss", title:"Lo que no debería existir",
    goal:"Derrota a un enemigo de rango SSS",
    done:() => (P.rankKills?.SSS || 0) >= 1,
    speaker:"Thomas Andre", dialog:"Vi la columna de luz desde Estados Unidos. Todos los gremios del mundo la vieron. Y después, silencio. ¿Fuiste tú?",
    reward:() => { P.gems += 5e7; banner("CAZADOR DE LEYENDAS", "#fff27a"); } },
  { id:"rebirth", title:"El ciclo del Monarca",
    goal:"Renace por primera vez",
    done:() => P.rebirths >= 1,
    speaker:"Ashborn", dialog:"Yo también empecé de nuevo muchas veces. La fuerza no es no caer: es volver a levantarse sabiendo lo que cuesta.",
    reward:() => { P.stats.points += 50; note("+50 puntos de atributo", "--gem"); } },
  { id:"end", title:"Arise",
    goal:"Alcanza el nivel 1000",
    done:() => P.level >= 1000,
    speaker:"SISTEMA", dialog:"No queda nada que el Sistema pueda enseñarte. A partir de aquí, la historia la escribes tú. Levántate, Monarca.",
    reward:() => { P.title = "Monarca Eterno"; banner("MONARCA ETERNO", "#fff27a"); } },
];
function currentChapter(){ return CAMPAIGN[P.chapter] || null; }
/* Crónicas de las regiones: se cuentan la primera vez que pisas cada una y
   quedan guardadas en Inventario › Historia. */
const REGION_LORE = {
  Seoul:       { who:"Woo Jinchul", text:"Hace diez años se abrieron las primeras puertas sobre Seúl. Desde entonces la ciudad vive con un ojo en el cielo. Los gnomos de las puertas bajas son lo primero que aprende a matar un cazador… o lo último." },
  Hongdae:     { who:"Yoo Jinho", text:"En Hongdae se abrió una puerta de clase D que nadie consiguió cerrar. Dentro vive Kasaka, una serpiente que tiñe de verde el agua. Su colmillo vale una fortuna en el mercado de la Asociación." },
  Temple:      { who:"SISTEMA", text:"Mandamiento uno: adora a tu dios. Mandamiento dos: alaba a tu dios. Mandamiento tres: demuestra tu fe. En el Doble Dungeon las estatuas sonríen mientras cuentan a los que no salen." },
  Reawaken:    { who:"SISTEMA", text:"La Cárcel de Reawakening guarda a los caballeros que juraron lealtad a un rey muerto. El Caballero Rojo aún patrulla sus pasillos, esperando a alguien digno de su espada." },
  HighOrcs:    { who:"Baek Yoonho", text:"Los altos orcos no son bestias: tienen chamanes, estandartes y un código. Baruka, el jefe de los elfos de hielo que les sirve, ha cazado a más cazadores de rango A que cualquier gremio." },
  RedGate:     { who:"Cha Hae-In", text:"Una puerta roja no se cierra hasta que alguien mata a su señor. Dentro nieva siempre, y el tiempo corre distinto: tres días aquí son una hora fuera. Los lobos huelen el miedo." },
  Jeju:        { who:"Choi Jong-In", text:"La isla Jeju fue abandonada tras la primera marea de hormigas. Treinta cazadores de rango S cayeron intentando recuperarla. Dicen que el Rey Hormiga aprendió a hablar comiéndose a los que lo intentaban." },
  Japan:       { who:"Thomas Andre", text:"Cuando la gran puerta se abrió sobre Shinjuku, los cazadores de Japón fueron los primeros en caer. Algunos siguen ahí, vacíos, empuñando katanas contra quien entre." },
  DemonCastle: { who:"SISTEMA", text:"El Castillo del Demonio tiene cien pisos y en la cima espera el Rey Demonio Baran. Más arriba aún, en el cielo rojo, duerme Kamish: el dragón que mató a cuatro cazadores de rango nacional en una sola noche." },
  IceMonarch:  { who:"SISTEMA", text:"El Monarca de la Escarcha no odia a la humanidad: simplemente la considera un error. Su dominio es silencio blanco, y quien se detiene demasiado se convierte en una estatua más." },
  BeastMonarch:{ who:"Go Gunhee", text:"El Monarca de los Colmillos gobierna a todas las bestias. En sus tierras no hay caminos, solo rastros. Cada cráneo del arco de la entrada perteneció a un cazador que se creyó cazador." },
  Architect:   { who:"SISTEMA", text:"Esta sala no debería existir. El Arquitecto construyó el Sistema, y el Sistema te construyó a ti. Todo lo que ves es un examen, y la nota es sobrevivir." },
  ShadowRealm: { who:"Ashborn", text:"Yo también fui un Monarca que eligió proteger a quienes debía destruir. Ahora el trono es tuyo. Mira bien a tu ejército: cada uno murió por algo. Asegúrate de que tú también sepas por qué luchas." },
};
// Lo que dice cada jefe al aparecer
const BOSS_LINES = {
  Seoul:"«Otro humano… pequeño y ruidoso.»", Hongdae:"«Tu veneno no me alcanza, cazador. El mío a ti sí.»",
  Temple:"«¿Has recitado los mandamientos? Entonces arrodíllate.»", Reawaken:"«Mi rey me ordenó guardar esta puerta. Él no ha vuelto.»",
  HighOrcs:"«Eres demasiado débil para morir a manos de Baruka.»", RedGate:"«El frío es eterno. Tú no.»",
  Jeju:"«Tengo hambre… tanta hambre.»", Japan:"«Esta ciudad ya es mía. Todos sus cazadores me pertenecen.»",
  DemonCastle:"«¿Un humano que llega hasta aquí? Qué divertido.»", IceMonarch:"«Te convertiré en un recuerdo helado.»",
  BeastMonarch:"«Las bestias no se inclinan. Tampoco yo.»", Architect:"«Ejecutando prueba final. Probabilidad de éxito: 0,0001%.»",
  ShadowRealm:"«El Rey de las Sombras… por fin nos vemos.»",
};
function tellRegionLore(reg){
  const L = REGION_LORE[reg.id]; if (!L) return;
  P.lore = P.lore || [];
  if (P.lore.includes(reg.id)) return;
  P.lore.push(reg.id); save();
  setTimeout(() => showDialog(L.who, L.text, `Crónica · ${reg.name}`), 1400);
}
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
  for (const c of CHESTS) if (!chestOpened(c) && Math.hypot(c.x - player.x, c.y - player.y) < 1800) put(c.x, c.y, "#ffd24a", 3);
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
  // partidas del mundo pequeño: se lleva la posición al mundo nuevo
  // conservando el anillo y el ángulo en el que estabas
  if (P.pos && (P.worldV || 1) < 2 && isFinite(P.pos.x)){
    const ox = P.pos.x - 17000, oy = P.pos.y - 17000, k = 2400 / 1400;
    P.pos = { x:CFG.WORLD.cx + ox * k, y:CFG.WORLD.cy + oy * k };
  }
  P.worldV = 2;
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
    // recompensa del día: se abre sola si está disponible (tras el tutorial)
    setTimeout(() => { if (dailyState().can && P.tutorial >= 2 && !panelKind){ openPanel("items"); panelTab = "Daily"; renderPanel(); } }, 1500);
    if (dailyState().can) setTimeout(() => note("🎁 Tienes una recompensa diaria · Inventario › Diario", "--gold"), 2500);
    if (P.chapter === 0 && P.kills === 0){
      showDialog("SISTEMA", "Seúl, año 2026. Las puertas siguen abriéndose y alguien tiene que entrar. Eres el cazador más débil de la humanidad… por ahora.", "Capítulo 1");
    }
  };
  let last = performance.now(), hudT = 0, fpsT = 0, frames = 0, menuSkip = 0;
  function frame(t){
    const dt = Math.min((t - last)/1000, 0.1); last = t;   // con pocos fps el juego iba a cámara lenta
    if (!document.hidden && !paused){
      update(dt);
      // con un menú abierto la escena de fondo se dibuja a un tercio del ritmo:
      // el menú y su vista 3D van fluidos incluso en móvil
      menuSkip = panelKind ? (menuSkip + 1) % 3 : 0;
      if (!menuSkip) render(panelKind ? dt * 3 : dt);
      previewTick(dt);
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
