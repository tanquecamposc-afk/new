/**
 * Todos los números del juego viven aquí. Para reequilibrarlo no hace falta tocar
 * ni el motor ni el render: cambia esta tabla y ya está.
 */
import type { Material, MaterialId, MobDef, MobId, Phase, Tool } from "./types";

export const MATERIALS: Record<MaterialId, Material> = {
  dirt: { name: "Tierra", colors: ["#7a5236", "#5d3f28"] },
  grass: { name: "Hierba", colors: ["#6fb03f", "#5d3f28"] },
  oak: { name: "Roble", colors: ["#8a6034", "#5f4222"] },
  leaves: { name: "Hojas", colors: ["#4f9b33", "#3b7527"] },
  sand: { name: "Arena", colors: ["#e3d6a3", "#c8bb86"] },
  coal: { name: "Carbón", colors: ["#4a4a4a", "#1d1d1d"] },
  stone: { name: "Piedra", colors: ["#8e8e8e", "#6f6f6f"] },
  cobble: { name: "Roca", colors: ["#7d7d7d", "#5c5c5c"] },
  iron: { name: "Hierro", colors: ["#d8cfc4", "#a08a72"] },
  copper: { name: "Cobre", colors: ["#e07a4a", "#a6522f"] },
  gravel: { name: "Grava", colors: ["#8b8279", "#6a635c"] },
  snow: { name: "Nieve", colors: ["#eef6ff", "#cfe0ef"] },
  ice: { name: "Hielo", colors: ["#a5d8f0", "#78b4d8"] },
  blueice: { name: "Hielo azul", colors: ["#6fb6e8", "#3f86bb"] },
  spruce: { name: "Abeto", colors: ["#6b4b2a", "#4a331c"] },
  lapis: { name: "Lapislázuli", colors: ["#2f5fd0", "#1d3f94"] },
  prismarine: { name: "Prismarina", colors: ["#5fbfa8", "#3d8f7d"] },
  kelp: { name: "Alga", colors: ["#3f7a3a", "#2c5528"] },
  clay: { name: "Arcilla", colors: ["#9aa3b2", "#77808d"] },
  lantern: { name: "Farol marino", colors: ["#e8f6d8", "#b9d6a0"] },
  coral: { name: "Coral", colors: ["#e0568a", "#a6335e"] },
  jungle: { name: "Tropical", colors: ["#6a4b1f", "#4a3315"] },
  moss: { name: "Musgo", colors: ["#5a7a2e", "#3d5a1f"] },
  melon: { name: "Sandía", colors: ["#4f9b33", "#7fc44f"], food: 3 },
  emerald: { name: "Esmeralda", colors: ["#31d17a", "#199650"] },
  bamboo: { name: "Bambú", colors: ["#9bc24a", "#6f8f31"] },
  redsand: { name: "Arena roja", colors: ["#c96a3a", "#8e4526"] },
  terracotta: { name: "Terracota", colors: ["#a05b3a", "#7b4229"] },
  cactus: { name: "Cactus", colors: ["#4f8f3a", "#356a26"] },
  gold: { name: "Oro", colors: ["#ffd25e", "#c9992a"] },
  netherrack: { name: "Netherrack", colors: ["#8b2f2f", "#5e1f1f"] },
  quartz: { name: "Cuarzo", colors: ["#efe9df", "#c9c0b2"] },
  basalt: { name: "Basalto", colors: ["#4a4a52", "#33333a"] },
  soul: { name: "Arena de almas", colors: ["#5a4632", "#3d2f21"] },
  obsidian: { name: "Obsidiana", colors: ["#2a1f3d", "#18112a"] },
  scrap: { name: "Chatarra de netherita", colors: ["#8a5a3c", "#5d3a24"] },
  amethyst: { name: "Amatista", colors: ["#9b6bd8", "#6a3fa0"] },
  calcite: { name: "Calcita", colors: ["#e6e4dd", "#c2bfb6"] },
  honey: { name: "Miel", colors: ["#e8a33c", "#b87a1e"], food: 4 },
  dripleaf: { name: "Hoja gotera", colors: ["#5fa347", "#417331"] },
  diamond: { name: "Diamante", colors: ["#5fe8e0", "#28b3ad"] },
  deepslate: { name: "Pizarra", colors: ["#4a4a52", "#2e2e35"] },
  sculk: { name: "Sculk", colors: ["#1d3b3f", "#102225"] },
  echo: { name: "Fragmento de eco", colors: ["#3fd9c7", "#1f8579"] },
  endstone: { name: "Piedra del End", colors: ["#e0e0a8", "#c2c288"] },
  purpur: { name: "Purpur", colors: ["#a86ea8", "#7d4a7d"] },
  chorus: { name: "Chorus", colors: ["#7a4f8f", "#553466"], food: 2 },
  frame: { name: "Marco de portal", colors: ["#3c5a52", "#1f302b"], quest: true },
  eye: { name: "Ojo de ender", colors: ["#3fe0c0", "#12766a"], quest: true },
  bread: { name: "Pan", colors: ["#d8a45e", "#a97a3a"], food: 5 },
  apple: { name: "Manzana", colors: ["#e04a4a", "#2e7d32"], food: 4 },
  fish: { name: "Pescado", colors: ["#e0b07a", "#a87a4a"], food: 6 },
};

/** Las diez fases del OneBlock original, en su orden. */
export const PHASES: Phase[] = [
  {
    id: "plains", name: "Llanuras", at: 0, sky: ["#12321c", "#07090d"], accent: "#6fb03f",
    blocks: [["dirt", 30], ["grass", 22], ["oak", 14], ["sand", 8], ["leaves", 10], ["coal", 8], ["stone", 8]],
    mobs: ["cow", "sheep", "zombie"],
    loot: { common: ["dirt", "oak", "apple"], uncommon: ["bread", "coal", "iron"], rare: ["iron", "apple"], epic: ["diamond", "bread"] },
  },
  {
    id: "underground", name: "Subterráneo", at: 25, sky: ["#1b1b24", "#07090d"], accent: "#9aa3b2",
    blocks: [["stone", 30], ["cobble", 20], ["coal", 14], ["iron", 12], ["copper", 10], ["gravel", 14]],
    mobs: ["zombie", "skeleton", "spider"],
    loot: { common: ["cobble", "coal"], uncommon: ["iron", "bread"], rare: ["iron", "diamond"], epic: ["diamond"] },
  },
  {
    id: "tundra", name: "Tundra Helada", at: 60, sky: ["#12283a", "#07090d"], accent: "#a5d8f0",
    blocks: [["snow", 26], ["ice", 22], ["blueice", 8], ["stone", 14], ["spruce", 14], ["lapis", 16]],
    mobs: ["skeleton", "wolf", "polar"],
    loot: { common: ["snow", "spruce"], uncommon: ["lapis", "bread"], rare: ["blueice", "diamond"], epic: ["diamond", "iron"] },
  },
  {
    id: "ocean", name: "Océano", at: 110, sky: ["#0d2c3a", "#07090d"], accent: "#5fbfa8",
    blocks: [["sand", 22], ["prismarine", 20], ["kelp", 14], ["clay", 14], ["coral", 10], ["lantern", 8], ["gravel", 12]],
    mobs: ["drowned", "squid", "fish"],
    loot: { common: ["kelp", "clay"], uncommon: ["fish", "prismarine"], rare: ["lantern", "coral"], epic: ["diamond", "lantern"] },
  },
  {
    id: "jungle", name: "Jungla", at: 175, sky: ["#123a1e", "#07090d"], accent: "#6a9b2f",
    blocks: [["jungle", 22], ["leaves", 18], ["moss", 16], ["melon", 12], ["bamboo", 12], ["emerald", 8], ["dirt", 12]],
    mobs: ["creeper", "spider", "parrot"],
    loot: { common: ["bamboo", "melon"], uncommon: ["emerald", "melon"], rare: ["emerald", "diamond"], epic: ["diamond", "emerald"] },
  },
  {
    id: "desert", name: "Desierto Rojo", at: 250, sky: ["#3a1d12", "#07090d"], accent: "#c96a3a",
    blocks: [["redsand", 28], ["terracotta", 20], ["cactus", 12], ["gold", 14], ["sand", 14], ["stone", 12]],
    mobs: ["husk", "skeleton", "spider"],
    loot: { common: ["redsand", "cactus"], uncommon: ["gold", "bread"], rare: ["gold", "diamond"], epic: ["diamond", "gold"] },
  },
  {
    id: "nether", name: "El Nether", at: 340, sky: ["#3a0f0f", "#07090d"], accent: "#ff5555",
    blocks: [["netherrack", 28], ["basalt", 16], ["soul", 14], ["quartz", 16], ["gold", 12], ["obsidian", 8], ["scrap", 6]],
    mobs: ["blaze", "piglin", "magma"],
    loot: { common: ["netherrack", "quartz"], uncommon: ["gold", "quartz"], rare: ["obsidian", "scrap"], epic: ["scrap", "diamond"] },
  },
  {
    id: "idyll", name: "Idilio", at: 450, sky: ["#2a1240", "#07090d"], accent: "#c08bff",
    blocks: [["moss", 20], ["amethyst", 18], ["calcite", 14], ["honey", 12], ["dripleaf", 12], ["diamond", 10], ["leaves", 14]],
    mobs: ["bee", "allay", "creeper"],
    loot: { common: ["moss", "honey"], uncommon: ["amethyst", "honey"], rare: ["diamond", "amethyst"], epic: ["diamond", "scrap"] },
  },
  {
    id: "desolation", name: "Tierra Desolada", at: 580, sky: ["#14181c", "#07090d"], accent: "#7d8a92",
    blocks: [["deepslate", 26], ["sculk", 18], ["iron", 14], ["gold", 12], ["diamond", 12], ["echo", 8], ["cobble", 10]],
    mobs: ["pillager", "ravager", "phantom"],
    loot: { common: ["deepslate", "cobble"], uncommon: ["iron", "echo"], rare: ["diamond", "echo"], epic: ["scrap", "diamond"] },
  },
  {
    id: "end", name: "El End", at: 730, sky: ["#1d1030", "#07090d"], accent: "#c07ad8",
    blocks: [["endstone", 30], ["purpur", 18], ["obsidian", 16], ["chorus", 12], ["amethyst", 10], ["endstone", 14]],
    mobs: ["enderman", "shulker", "phantom"],
    loot: { common: ["endstone", "chorus"], uncommon: ["obsidian", "chorus"], rare: ["eye", "frame"], epic: ["frame", "eye"] },
  },
];

/** Bloques picados a partir de los cuales empieza la Fase Infinita. */
export const INFINITE_AT = 900;
/** Bloques por vuelta dentro de la Fase Infinita, solo para que la barra siga contando. */
export const LAP = 100;

export const MOBS: Record<MobId, MobDef> = {
  cow: { name: "Vaca", hp: 6, dmg: 0, colors: ["#c9b6a0", "#4a3a2c"], peaceful: true, drop: "bread" },
  sheep: { name: "Oveja", hp: 6, dmg: 0, colors: ["#e8e4dc", "#c9c2b6"], peaceful: true, drop: "bread" },
  parrot: { name: "Loro", hp: 4, dmg: 0, colors: ["#e04a4a", "#3fa0e0"], peaceful: true, drop: "apple" },
  squid: { name: "Calamar", hp: 5, dmg: 0, colors: ["#3a4a8a", "#22305e"], peaceful: true, drop: "fish" },
  fish: { name: "Pez", hp: 3, dmg: 0, colors: ["#5fbfa8", "#2f7f6a"], peaceful: true, drop: "fish" },
  allay: { name: "Allay", hp: 5, dmg: 0, colors: ["#7fd8ff", "#3a86b0"], peaceful: true, drop: "amethyst" },
  bee: { name: "Abeja", hp: 6, dmg: 1, colors: ["#ffd25e", "#3a3020"], drop: "honey" },
  zombie: { name: "Zombi", hp: 10, dmg: 2, colors: ["#4f7a3a", "#2e4a22"] },
  husk: { name: "Husk", hp: 12, dmg: 2, colors: ["#b5a375", "#7a6d4a"] },
  skeleton: { name: "Esqueleto", hp: 9, dmg: 2, colors: ["#d8d8d0", "#9a9a92"] },
  spider: { name: "Araña", hp: 8, dmg: 2, colors: ["#3a2a2a", "#a01e1e"] },
  creeper: { name: "Creeper", hp: 10, dmg: 5, colors: ["#4fbf5f", "#2e6a37"], explodes: true },
  drowned: { name: "Ahogado", hp: 12, dmg: 3, colors: ["#3a7a6a", "#22504a"] },
  wolf: { name: "Lobo", hp: 8, dmg: 2, colors: ["#c9c2b6", "#7a746a"] },
  polar: { name: "Oso polar", hp: 16, dmg: 4, colors: ["#eef6ff", "#c2cfdc"] },
  blaze: { name: "Blaze", hp: 14, dmg: 4, colors: ["#ffd25e", "#e05a00"] },
  piglin: { name: "Piglin", hp: 14, dmg: 3, colors: ["#e0a08a", "#8a5a4a"] },
  magma: { name: "Cubo de magma", hp: 12, dmg: 3, colors: ["#e05a00", "#7a2a00"] },
  pillager: { name: "Saqueador", hp: 16, dmg: 4, colors: ["#5a6a7a", "#33404a"] },
  ravager: { name: "Devastador", hp: 30, dmg: 7, colors: ["#6a5a4a", "#3a2f26"] },
  phantom: { name: "Fantasma", hp: 12, dmg: 3, colors: ["#4a5a8a", "#2a3355"] },
  enderman: { name: "Enderman", hp: 20, dmg: 5, colors: ["#1a1a22", "#c07ad8"] },
  shulker: { name: "Shulker", hp: 18, dmg: 4, colors: ["#9a7aa8", "#5a3f66"] },
};

export const PICKS: Tool[] = [
  { name: "Pico de madera", power: 1, cost: null },
  { name: "Pico de piedra", power: 1.5, cost: { cobble: 20 } },
  { name: "Pico de hierro", power: 2.2, cost: { iron: 12 } },
  { name: "Pico de diamante", power: 3.4, cost: { diamond: 6 } },
  { name: "Pico de netherita", power: 5, cost: { scrap: 3, diamond: 4 } },
];

export const SWORDS: Tool[] = [
  { name: "Puños", power: 1, cost: null },
  { name: "Espada de piedra", power: 3, cost: { cobble: 15 } },
  { name: "Espada de hierro", power: 5, cost: { iron: 10 } },
  { name: "Espada de diamante", power: 8, cost: { diamond: 5 } },
  { name: "Espada de netherita", power: 13, cost: { scrap: 2, diamond: 3 } },
];

/** Probabilidades de lo que sale al romper el bloque, en porcentaje. */
export const CHANCES = {
  special: 2,
  chest: 12,
  mob: 15,
  legacy: 8,
};

/** Reparto de rarezas de los cofres, en porcentaje acumulado. */
export const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 12, epic: 3 };

/** Objetos necesarios para abrir el portal del End. */
export const PORTAL_COST = { frame: 12, eye: 12 };
