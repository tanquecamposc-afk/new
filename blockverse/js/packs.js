"use strict";
/* =========================================================
   Paquetes de recursos y mods.
   · Paquetes de recursos de Minecraft Java (.zip con
     assets/minecraft/textures/block e item): sustituyen las
     texturas de los bloques y los iconos de los objetos.
     Admiten texturas HD (se usan hasta 64 píxeles).
   · Mods en JavaScript con una API sencilla (los mods .jar
     de Java no pueden funcionar dentro de un navegador).
   ========================================================= */

/* ---------- Lector de .zip (sin librerías: usa DecompressionStream) ---------- */
async function leerZip(buf){
  const dv=new DataView(buf); let e=buf.byteLength-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
  if(e<0)throw new Error('El archivo no es un .zip válido.');
  const n=dv.getUint16(e+10,true); let off=dv.getUint32(e+16,true); const files={}, td=new TextDecoder();
  for(let i=0;i<n;i++){
    if(dv.getUint32(off,true)!==0x02014b50)break;
    const metodo=dv.getUint16(off+10,true), csize=dv.getUint32(off+20,true), nl=dv.getUint16(off+28,true), xl=dv.getUint16(off+30,true), cl=dv.getUint16(off+32,true), loff=dv.getUint32(off+42,true);
    files[td.decode(new Uint8Array(buf,off+46,nl)).replace(/\\/g,'/')]={metodo,csize,loff};
    off+=46+nl+xl+cl;
  }
  return {files,async leer(nombre){
    const f=files[nombre]; if(!f)return null;
    const nl=dv.getUint16(f.loff+26,true), xl=dv.getUint16(f.loff+28,true), datos=new Uint8Array(buf,f.loff+30+nl+xl,f.csize);
    if(f.metodo===0)return datos.slice();
    if(f.metodo!==8)return null;
    const s=new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }};
}

/* ---------- Nombres de las texturas en Minecraft ---------- */
const TEX_MC={grassTop:'grass_block_top',grassSide:'grass_block_side',dirt:'dirt',stone:'stone',logSide:'oak_log',logTop:'oak_log_top',leaves:'oak_leaves',sand:'sand',
  planks:'oak_planks',cobble:'cobblestone',brick:'bricks',glass:'glass',snow:'snow',snowSide:'grass_block_snow',bedrock:'bedrock',coalOre:'coal_ore',ironOre:'iron_ore',
  goldOre:'gold_ore',diamondOre:'diamond_ore',redstoneOre:'redstone_ore',lapisOre:'lapis_ore',emeraldOre:'emerald_ore',copperOre:'copper_ore',deepslate:'deepslate',
  deepslateTop:'deepslate_top',dsCoal:'deepslate_coal_ore',dsIron:'deepslate_iron_ore',dsGold:'deepslate_gold_ore',dsRedstone:'deepslate_redstone_ore',
  dsLapis:'deepslate_lapis_ore',dsDiamond:'deepslate_diamond_ore',dsCopper:'deepslate_copper_ore',gravel:'gravel',obsidian:'obsidian',craftTop:'crafting_table_top',
  craftSide:'crafting_table_front',furnaceFront:'furnace_front',furnaceTop:'furnace_top',torch:'torch',tntSide:'tnt_side',tntTop:'tnt_top',wool:'white_wool',
  tallGrass:'short_grass',flowerY:'dandelion',flowerR:'poppy',wheat:'wheat_stage7',farmland:'farmland_moist',cactusSide:'cactus_side',cactusTop:'cactus_top',ice:'ice',
  sandstoneSide:'sandstone',sandstoneTop:'sandstone_top',water:'water_still',lava:'lava_still',netherrack:'netherrack',soulSand:'soul_sand',glowstone:'glowstone',
  quartzOre:'nether_quartz_ore',netherBrick:'nether_bricks',netherPortal:'nether_portal',netherGoldOre:'nether_gold_ore',endStone:'end_stone',
  endFrameSide:'end_portal_frame_side',endFrameTop:'end_portal_frame_top',endFrameTopEye:'end_portal_frame_top',stoneBricks:'stone_bricks',mossyStoneBricks:'mossy_stone_bricks',
  ironBlock:'iron_block',goldBlock:'gold_block',diamondBlock:'diamond_block',coalBlock:'coal_block',dragonEgg:'dragon_egg',fire:'fire_0',sapling:'oak_sapling',
  sugarCane:'sugar_cane',enchantTop:'enchanting_table_top',enchantSide:'enchanting_table_side',spawner:'spawner',hayTop:'hay_block_top',haySide:'hay_block_side',
  birchSide:'birch_log',birchTop:'birch_log_top',spruceSide:'spruce_log',spruceTop:'spruce_log_top',jungleSide:'jungle_log',jungleTop:'jungle_log_top',
  acaciaSide:'acacia_log',acaciaTop:'acacia_log_top',spruceLeaves:'spruce_leaves',birchSapling:'birch_sapling',spruceSapling:'spruce_sapling',jungleSapling:'jungle_sapling',
  acaciaSapling:'acacia_sapling',fern:'fern',deadBush:'dead_bush',cornflower:'cornflower',orchid:'blue_orchid',daisy:'oxeye_daisy',mushRed:'red_mushroom',
  mushBrown:'brown_mushroom',pumpkinSide:'pumpkin_side',pumpkinTop:'pumpkin_top',jackFace:'jack_o_lantern',melonSide:'melon_side',melonTop:'melon_top',lilyPad:'lily_pad',
  clay:'clay',redSand:'red_sand',mossyCobble:'mossy_cobblestone',cryingObsidian:'crying_obsidian',bookshelf:'bookshelf',ladder:'ladder',doorTop:'oak_door_top',
  doorBottom:'oak_door_bottom',pathTop:'dirt_path_top',pathSide:'dirt_path_side',granite:'granite',diorite:'diorite',andesite:'andesite',crimsonNylium:'crimson_nylium',
  crimsonNyliumSide:'crimson_nylium_side',warpedNylium:'warped_nylium',warpedNyliumSide:'warped_nylium_side',crimsonStem:'crimson_stem',crimsonStemTop:'crimson_stem_top',
  warpedStem:'warped_stem',warpedStemTop:'warped_stem_top',netherWartBlock:'nether_wart_block',warpedWartBlock:'warped_wart_block',shroomlight:'shroomlight',
  crimsonRoots:'crimson_roots',warpedRoots:'warped_roots',crimsonFungus:'crimson_fungus',warpedFungus:'warped_fungus',soulSoil:'soul_soil',boneSide:'bone_block_side',
  boneTop:'bone_block_top',basaltSide:'basalt_side',basaltTop:'basalt_top',blackstone:'blackstone',magma:'magma',wart:'nether_wart_stage2',soulFire:'soul_fire_0',
  redTorchOn:'redstone_torch',redTorchOff:'redstone_torch_off',lever:'lever',redstoneBlock:'redstone_block',lampOff:'redstone_lamp',lampOn:'redstone_lamp_on',
  pistonTop:'piston_top',pistonTopSticky:'piston_top_sticky',pistonSide:'piston_side',pistonBottom:'piston_bottom',pressurePlate:'stone',rail:'rail',railCurve:'rail_corner',
  railPowered:'powered_rail',railPoweredOn:'powered_rail_on',brewingBase:'brewing_stand_base',brewingStand:'brewing_stand',anvil:'anvil_top',purpur:'purpur_block',
  purpurPillar:'purpur_pillar',endBricks:'end_stone_bricks',endRod:'end_rod',chorusPlant:'chorus_plant',chorusFlower:'chorus_flower',sculk:'sculk',sculkVein:'sculk_vein',
  sculkSensorTop:'sculk_sensor_top',sculkSensorSide:'sculk_sensor_side',sculkShriekerTop:'sculk_shrieker_top',sculkShriekerSide:'sculk_shrieker_side',
  sculkCatalystTop:'sculk_catalyst_top',sculkCatalystSide:'sculk_catalyst_side',deepslateBricks:'deepslate_bricks',deepslateTiles:'deepslate_tiles',
  reinforcedTop:'reinforced_deepslate_top',reinforcedSide:'reinforced_deepslate_side',soulLantern:'soul_lantern',cherryLog:'cherry_log',cherryTop:'cherry_log_top',
  cherryLeaves:'cherry_leaves',cherryPlanks:'cherry_planks',cherrySapling:'cherry_sapling',darkOakLog:'dark_oak_log',darkOakTop:'dark_oak_log_top',
  darkOakLeaves:'dark_oak_leaves',darkOakPlanks:'dark_oak_planks',darkOakSapling:'dark_oak_sapling',mushBlockRed:'red_mushroom_block',mushBlockBrown:'brown_mushroom_block',
  mushStem:'mushroom_stem',packedIce:'packed_ice',sunflower:'sunflower_front',pinkPetals:'pink_petals',mangroveLog:'mangrove_log',mangroveTop:'mangrove_log_top',
  mangroveLeaves:'mangrove_leaves',mangroveRoots:'mangrove_roots_side',mud:'mud',mudBricks:'mud_bricks',mangrovePlanks:'mangrove_planks',propagule:'mangrove_propagule',
  suspiciousSand:'suspicious_sand_0',suspiciousGravel:'suspicious_gravel_0',ancientDebrisSide:'ancient_debris_side',ancientDebrisTop:'ancient_debris_top',
  netheriteBlock:'netherite_block',smithingTop:'smithing_table_top',smithingSide:'smithing_table_side',tuff:'tuff',tuffBricks:'tuff_bricks',cutCopper:'cut_copper',
  copperBulb:'copper_bulb',trialSpawner:'trial_spawner_side_active',trialSpawnerOff:'trial_spawner_side_inactive',vault:'vault_front_off',vaultOpen:'vault_front_on',
  heavyCore:'heavy_core',paleLog:'pale_oak_log',paleTop:'pale_oak_log_top',paleLeaves:'pale_oak_leaves',palePlanks:'pale_oak_planks',paleMoss:'pale_moss_block',
  hangingMoss:'pale_hanging_moss',creakingHeart:'creaking_heart',creakingHeartOn:'creaking_heart_awake',eyeblossomClosed:'closed_eyeblossom',eyeblossomOpen:'open_eyeblossom',
  resinBlock:'resin_block',resinBricks:'resin_bricks',leafLitter:'leaf_litter',wildflowers:'wildflowers',fireflyBush:'firefly_bush',bush:'bush',paleSapling:'pale_oak_sapling',
  smoothStone:'smooth_stone',polishedGranite:'polished_granite',polishedDiorite:'polished_diorite',polishedAndesite:'polished_andesite',polishedDeepslate:'polished_deepslate',
  cobbledDeepslate:'cobbled_deepslate',crackedBricks:'cracked_stone_bricks',chiseledStone:'chiseled_stone_bricks',cutSandstone:'cut_sandstone',quartz:'quartz_block_side',
  quartzPillar:'quartz_pillar',netherBricks:'nether_bricks',lapisBlock:'lapis_block',emeraldBlock:'emerald_block',birchPlanks:'birch_planks',sprucePlanks:'spruce_planks',
  junglePlanks:'jungle_planks',acaciaPlanks:'acacia_planks',lantern:'lantern',barrelTop:'barrel_top',barrelSide:'barrel_side',cobweb:'cobweb',prismarine:'prismarine',
  prismarineBricks:'prismarine_bricks',darkPrismarine:'dark_prismarine',seaLantern:'sea_lantern',sponge:'sponge',wetSponge:'wet_sponge',terracotta:'terracotta',
  terr0:'orange_terracotta',terr1:'yellow_terracotta',terr2:'red_terracotta',terr3:'brown_terracotta',terr4:'white_terracotta',terr5:'light_gray_terracotta'};
const COLOR_MC={blanco:'white',naranja:'orange',magenta:'magenta',azulClaro:'light_blue',amarillo:'yellow',lima:'lime',rosa:'pink',gris:'gray',grisClaro:'light_gray',
  cian:'cyan',morado:'purple',azul:'blue',marron:'brown',verde:'green',rojo:'red',negro:'black'};
COLORES16.forEach(([c])=>{const m=COLOR_MC[c];if(!m)return;TEX_MC['lana_'+c]=m+'_wool';TEX_MC['hormigon_'+c]=m+'_concrete';TEX_MC['vidrio_'+c]=m+'_stained_glass';});
const ITEM_MC={palo:'stick',carbon:'coal',hierroBruto:'raw_iron',lingoteHierro:'iron_ingot',diamante:'diamond',manzana:'apple',cerdoCrudo:'porkchop',cerdoAsado:'cooked_porkchop',
  carnePodrida:'rotten_flesh',oroBruto:'raw_gold',lingoteOro:'gold_ingot',pepitaOro:'gold_nugget',cobreBruto:'raw_copper',lingoteCobre:'copper_ingot',redstone:'redstone',
  lapis:'lapis_lazuli',esmeralda:'emerald',cuarzo:'quartz',pedernal:'flint',cuerda:'string',pluma:'feather',polvora:'gunpowder',hueso:'bone',harinaHueso:'bone_meal',
  flecha:'arrow',arco:'bow',cubo:'bucket',cuboAgua:'water_bucket',cuboLava:'lava_bucket',mechero:'flint_and_steel',varaBlaze:'blaze_rod',polvoBlaze:'blaze_powder',
  perlaEnder:'ender_pearl',ojoEnder:'ender_eye',lagrimaGhast:'ghast_tear',semillas:'wheat_seeds',trigo:'wheat',pan:'bread',polloCrudo:'chicken',polloAsado:'cooked_chicken',
  corderoCrudo:'mutton',corderoAsado:'cooked_mutton',manzanaDorada:'golden_apple',cuero:'leather',resCruda:'beef',filete:'cooked_beef',polvoLuminoso:'glowstone_dust',
  papel:'paper',libro:'book',ojoArana:'spider_eye',ladrillo:'brick',bolaArcilla:'clay_ball',cuenco:'bowl',estofado:'mushroom_stew',rodajaSandia:'melon_slice',puerta:'oak_door',
  frasco:'glass_bottle',verrugaNether:'nether_wart',azucar:'sugar',melonBrillante:'glistering_melon_slice',cremaMagma:'magma_cream',frutaCoro:'chorus_fruit',
  vagoneta:'minecart',barco:'oak_boat',elitros:'elytra',cohete:'firework_rocket',bolaSlime:'slime_ball',frutaReventada:'popped_chorus_fruit',pincel:'brush',
  plantillaNetherite:'netherite_upgrade_smithing_template',chatarraNetherite:'netherite_scrap',lingoteNetherite:'netherite_ingot',fragmentoEco:'echo_shard',
  cargaViento:'wind_charge',varaBreeze:'breeze_rod',maza:'mace',llavePrueba:'trial_key',saquito:'bundle',grumoResina:'resin_clump',ladrilloResina:'resin_brick',
  libroEncantado:'enchanted_book',fragmentoPrismarina:'prismarine_shard',cristalPrismarina:'prismarine_crystals',caparazonShulker:'shulker_shell',silla:'saddle'};
{const H={pico:'pickaxe',hacha:'axe',pala:'shovel',espada:'sword',azada:'hoe',lanza:'spear'}, M={madera:'wooden',piedra:'stone',hierro:'iron',oro:'golden',diamante:'diamond',netherite:'netherite',cobre:'copper'};
 for(const h in H)for(const m in M)ITEM_MC[h+'_'+m]=M[m]+'_'+H[h];
 const P={casco:'helmet',pechera:'chestplate',pantalones:'leggings',botas:'boots'}, A={cuero:'leather',oro:'golden',hierro:'iron',diamante:'diamond',netherite:'netherite',cobre:'copper'};
 for(const p in P)for(const a in A)ITEM_MC[p+'_'+a]=A[a]+'_'+P[p];
 for(const a of ['cuero','hierro','oro','diamante'])ITEM_MC['armaduraCaballo_'+a]=A[a]+'_horse_armor';
 COLORES16.forEach(([c])=>{if(COLOR_MC[c])ITEM_MC['tinte_'+c]=COLOR_MC[c]+'_dye';});}

// Nombres antiguos (Java 1.12 y anteriores) y de Bedrock, que usan carpetas «blocks» e «items»
const TEX_ANTIGUO={grassTop:'grass_top',grassSide:'grass_side',logSide:'log_oak',logTop:'log_oak_top',leaves:'leaves_oak',planks:'planks_oak',
  brick:'brick',snowSide:'grass_side_snowed',furnaceFront:'furnace_front_off',wool:'wool_colored_white',tallGrass:'tallgrass',flowerY:'flower_dandelion',
  flowerR:'flower_rose',wheat:'wheat_stage_7',farmland:'farmland_wet',sandstoneSide:'sandstone_normal',quartzOre:'quartz_ore',netherBrick:'nether_brick',
  netherPortal:'portal',stoneBricks:'stonebrick',mossyStoneBricks:'stonebrick_mossy',sapling:'sapling_oak',sugarCane:'reeds',spawner:'mob_spawner',
  birchSide:'log_birch',birchTop:'log_birch_top',spruceSide:'log_spruce',spruceTop:'log_spruce_top',
  jungleSide:'log_jungle',jungleTop:'log_jungle_top',acaciaSide:'log_acacia',acaciaTop:'log_acacia_top',spruceLeaves:'leaves_spruce',birchSapling:'sapling_birch',
  spruceSapling:'sapling_spruce',jungleSapling:'sapling_jungle',acaciaSapling:'sapling_acacia',deadBush:'deadbush',orchid:'flower_blue_orchid',
  daisy:'flower_oxeye_daisy',mushRed:'mushroom_red',mushBrown:'mushroom_brown',jackFace:'pumpkin_face_on',lilyPad:'waterlily',mossyCobble:'cobblestone_mossy',
  doorTop:'door_wood_upper',doorBottom:'door_wood_lower',pathTop:'grass_path_top',pathSide:'grass_path_side',granite:'stone_granite',diorite:'stone_diorite',
  andesite:'stone_andesite',polishedGranite:'stone_granite_smooth',polishedDiorite:'stone_diorite_smooth',polishedAndesite:'stone_andesite_smooth',
  smoothStone:'stone_slab_top',crackedBricks:'stonebrick_cracked',chiseledStone:'stonebrick_carved',cutSandstone:'sandstone_smooth',
  lampOff:'redstone_lamp_off',redTorchOn:'redstone_torch_on',pistonTop:'piston_top_normal',
  railCurve:'rail_normal_turned',rail:'rail_normal',railPowered:'rail_golden',railPoweredOn:'rail_golden_powered',endBricks:'end_bricks',
  wart:'nether_wart_stage_2',fire:'fire_layer_0',terracotta:'hardened_clay',birchPlanks:'planks_birch',sprucePlanks:'planks_spruce',junglePlanks:'planks_jungle',acaciaPlanks:'planks_acacia',
  darkOakLog:'log_big_oak',darkOakTop:'log_big_oak_top',darkOakPlanks:'planks_big_oak',darkOakLeaves:'leaves_big_oak',darkOakSapling:'sapling_roofed_oak',
  mushBlockRed:'mushroom_block_skin_red',mushBlockBrown:'mushroom_block_skin_brown',mushStem:'mushroom_block_skin_stem',packedIce:'ice_packed',
  sunflower:'double_plant_sunflower_front',endFrameSide:'endframe_side',endFrameTop:'endframe_top',endFrameTopEye:'endframe_top',
  prismarine:'prismarine_rough',darkPrismarine:'prismarine_dark',wetSponge:'sponge_wet',cobweb:'web'};
const COLOR_ANTIGUO={white:'white',orange:'orange',magenta:'magenta',light_blue:'light_blue',yellow:'yellow',lime:'lime',pink:'pink',gray:'gray',light_gray:'silver',
  cyan:'cyan',purple:'purple',blue:'blue',brown:'brown',green:'green',red:'red',black:'black'};
COLORES16.forEach(([c])=>{const m=COLOR_MC[c];if(!m)return;const v=COLOR_ANTIGUO[m];
  TEX_ANTIGUO['lana_'+c]='wool_colored_'+v;TEX_ANTIGUO['hormigon_'+c]='concrete_'+v;TEX_ANTIGUO['vidrio_'+c]='glass_'+v;});
[['terr0','orange'],['terr1','yellow'],['terr2','red'],['terr3','brown'],['terr4','white'],['terr5','silver']].forEach(([t,c])=>TEX_ANTIGUO[t]='hardened_clay_stained_'+c);
const ITEM_ANTIGUO={cerdoCrudo:'porkchop_raw',cerdoAsado:'porkchop_cooked',resCruda:'beef_raw',filete:'beef_cooked',
  polloCrudo:'chicken_raw',polloAsado:'chicken_cooked',corderoCrudo:'mutton_raw',corderoAsado:'mutton_cooked',harinaHueso:'dye_powder_white',cubo:'bucket_empty',
  cuboAgua:'bucket_water',cuboLava:'bucket_lava',semillas:'seeds_wheat',libro:'book_normal',rodajaSandia:'melon',melonBrillante:'speckled_melon',
  vagoneta:'minecart_normal',barco:'boat_oak',cohete:'fireworks',bolaSlime:'slimeball',redstone:'redstone_dust',manzanaDorada:'apple_golden',
  frasco:'potion_bottle_empty',libroEncantado:'book_enchanted',frutaReventada:'chorus_fruit_popped',puerta:'door_wood',arco:'bow_standby',lapis:'dye_powder_blue'};
{const H={pico:'pickaxe',hacha:'axe',pala:'shovel',espada:'sword',azada:'hoe'}, M={madera:'wood',piedra:'stone',hierro:'iron',oro:'gold',diamante:'diamond'};
 for(const h in H)for(const m in M)ITEM_ANTIGUO[h+'_'+m]=M[m]+'_'+H[h];
 const P={casco:'helmet',pechera:'chestplate',pantalones:'leggings',botas:'boots'}, A={cuero:'leather',oro:'gold',hierro:'iron',diamante:'diamond'};
 for(const p in P)for(const a in A)ITEM_ANTIGUO[p+'_'+a]=A[a]+'_'+P[p];}
// Versión de Minecraft según el pack_format de pack.mcmeta
function versionPack(f){
  const T=[[1,'1.6–1.8'],[2,'1.9–1.10'],[3,'1.11–1.12'],[4,'1.13–1.14'],[5,'1.15–1.16.1'],[6,'1.16.2–1.16.5'],[7,'1.17'],[8,'1.18'],[9,'1.19–1.19.2'],
    [12,'1.19.3'],[13,'1.19.4'],[15,'1.20–1.20.1'],[18,'1.20.2'],[22,'1.20.3–1.20.4'],[32,'1.20.5–1.20.6'],[34,'1.21–1.21.1'],[42,'1.21.2–1.21.3'],
    [46,'1.21.4'],[55,'1.21.5'],[63,'1.21.6'],[64,'1.21.7–1.21.8'],[69,'1.21.9–1.21.10'],[75,'1.21.11'],[80,'26.x']];
  let v=T[0][1]; for(const [n,t] of T)if(f>=n)v=t; return v;
}

// Qué baldosas se tiñen con el color del bioma (en el atlas original tienen píxeles con alfa 250)
const TINTADA=new Uint8Array(NT);
(function(){const d=atlas.getContext('2d').getImageData(0,0,atlas.width,atlas.height).data;
  for(let t=0;t<NT;t++){const ox=(t%ATW)*TS,oy=Math.floor(t/ATW)*TS;
    for(let y=0;y<TS&&!TINTADA[t];y++)for(let x=0;x<TS;x++)if(d[((oy+y)*atlas.width+ox+x)*4+3]===TINTE_A){TINTADA[t]=1;break;}}})();
const atlasOriginal=document.createElement('canvas'); atlasOriginal.width=atlas.width; atlasOriginal.height=atlas.height;
atlasOriginal.getContext('2d').drawImage(atlas,0,0);
const LIENZOS_ORIG=LIENZOS.slice();

/* ---------- Aplicar un paquete de recursos ---------- */
let packActivo=null;
function lienzoPack(w,h){const c=document.createElement('canvas');c.width=w;c.height=h||w;return c;}
// Dibuja una textura (solo el primer fotograma si es animada) en un cuadrado de S píxeles
function cuadro(img,S,suave){const c=lienzoPack(S),x=c.getContext('2d');x.imageSmoothingEnabled=!!suave&&img.width>S;
  x.drawImage(img,0,0,img.width,Math.min(img.width,img.height),0,0,S,S);return x.getImageData(0,0,S,S);}
function marcarTinte(d,solo){for(let i=0;i<d.data.length;i+=4){if(d.data[i+3]>=128){if(!solo||solo.data[i+3]>=128)d.data[i+3]=TINTE_A;}else if(!solo)d.data[i+3]=0;}}
function texturaFinal(tile,img,overlay,S){
  const d=cuadro(img,S,true), t=T[tile];
  if(overlay){const o=cuadro(overlay,S,true);   // césped lateral: la franja verde se tiñe según el bioma
    for(let i=0;i<d.data.length;i+=4)if(o.data[i+3]>=128){d.data[i]=o.data[i];d.data[i+1]=o.data[i+1];d.data[i+2]=o.data[i+2];d.data[i+3]=TINTE_A;}}
  else if(TINTADA[t])marcarTinte(d);
  return d;
}
function reconstruirAtlasIconos(){
  const ctx=atlasIconos.getContext('2d'); ctx.clearRect(0,0,atlasIconos.width,atlasIconos.height); ctx.drawImage(atlas,0,0);
  const img=ctx.getImageData(0,0,atlas.width,atlas.height), d=img.data;
  for(let t=0;t<NT;t++){if(!TINTADA[t])continue;const c=[.57,.74,.35],ox=(t%ATW)*TS,oy=Math.floor(t/ATW)*TS;
    for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const i=((oy+y)*atlas.width+ox+x)*4;if(d[i+3]===TINTE_A){d[i]*=c[0];d[i+1]*=c[1];d[i+2]*=c[2];d[i+3]=255;}}}
  {const t=T.water,ox=(t%ATW)*TS,oy=Math.floor(t/ATW)*TS;for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const i=((oy+y)*atlas.width+ox+x)*4;d[i]*=.25;d[i+1]*=.46;d[i+2]*=.9;}}
  ctx.putImageData(img,0,0); texIconos.needsUpdate=true;
}
function regenerarIconos(){
  ITEMS.forEach((it,id)=>{
    if(!it||!it.bloque)return;
    const bq=BLOQUES[id], f=FORMA[id]; let L=null;
    if(bq.texCaras)L=iconoCubo(bq.texCaras[3],bq.texCaras[1]);
    else if(f===0||f===1)L=iconoCubo(bq.arriba,bq.lado,f===1?bq.altura:1);
    else if(f===6&&!bq.trepable&&id!==B.nenufar){const alto=Math.max(...bq.cajas.map(c=>c[4]));L=iconoCubo(bq.arriba,bq.lado,alto);}
    else if(id!==B.valla)L=lienzoTile(bq.lado);
    if(L){LIENZOS[id]=L;ICONOS[id]=L.toDataURL();}
  });
  for(const k in geoExtr)delete geoExtr[k];
  for(const k in matSprites)delete matSprites[k];
  for(const k in geoCubos)delete geoCubos[k];
  manoId=-1; actualizarHUD(); if(ui)refrescarUI();
}
function textoMcmeta(j){const d=j&&j.pack&&j.pack.description;if(!d)return '';if(typeof d==='string')return d.replace(/§./g,'');
  const plano=x=>typeof x==='string'?x:Array.isArray(x)?x.map(plano).join(''):(x.text||'')+(x.extra?plano(x.extra):'');return plano(d).replace(/§./g,'');}
async function aplicarPack(buf,nombre){
  const z=await leerZip(buf), nombres=Object.keys(z.files);
  const meta=nombres.find(n=>/(^|\/)pack\.mcmeta$/.test(n)), pref=meta?meta.slice(0,-'pack.mcmeta'.length):(nombres.find(n=>n.includes('assets/minecraft/'))||'').split('assets/minecraft/')[0];
  const base=pref+'assets/minecraft/textures/';
  // Formato: Java moderno (1.13+), Java antiguo (1.12 o anterior, nombres distintos) o Bedrock (.mcpack sin carpeta assets)
  const manif=nombres.find(n=>/(^|\/)manifest\.json$/.test(n));
  const bedrock=!!manif&&!meta&&!nombres.some(n=>n.includes('assets/minecraft/'));
  const prefB=bedrock?manif.slice(0,-'manifest.json'.length):pref;
  let formato=0; try{if(meta)formato=+(JSON.parse(new TextDecoder().decode(await z.leer(meta))).pack.pack_format)||0;}catch(e){}
  const antiguo=bedrock||(formato>0&&formato<4);
  const dirs=tipo=>bedrock?[prefB+'textures/'+tipo+'s/']:[base+tipo+'/',base+tipo+'s/'];
  const ruta=(tipo,...ns)=>{for(const n of ns){if(!n)continue;for(const d of dirs(tipo)){const p=d+n+'.png';if(z.files[p])return p;}}return null;};
  const nomBloque=t=>antiguo?[TEX_ANTIGUO[t],TEX_MC[t]]:[TEX_MC[t],TEX_ANTIGUO[t]];
  const nomItem=c=>antiguo?[ITEM_ANTIGUO[c],ITEM_MC[c]]:[ITEM_MC[c],ITEM_ANTIGUO[c]];
  const omitidas=nombres.filter(n=>/\.tga$/i.test(n)).length;
  const imagen=async p=>{const d=await z.leer(p);if(!d)return null;return await createImageBitmap(new Blob([d],{type:'image/png'}));};
  let desc='',icono=null;
  try{if(meta)desc=textoMcmeta(JSON.parse(new TextDecoder().decode(await z.leer(meta))));}catch(e){}
  try{if(bedrock){const mj=JSON.parse(new TextDecoder().decode(await z.leer(manif)).replace(/^\uFEFF/,''));desc=(mj.header&&(mj.header.name+(mj.header.description?' · '+mj.header.description:'')))||'';desc=desc.replace(/§./g,'');}}catch(e){}
  const iconoP=bedrock?prefB+'pack_icon.png':pref+'pack.png';
  try{const pi=z.files[iconoP]&&await z.leer(iconoP);if(pi){const b=await createImageBitmap(new Blob([pi],{type:'image/png'}));const c=lienzoPack(64);const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(b,0,0,64,64);icono=c.toDataURL();}}catch(e){}
  // Texturas de bloques
  const imgs={}; let S=16;
  for(const tile of new Set([...Object.keys(TEX_MC),...Object.keys(TEX_ANTIGUO)])){if(T[tile]===undefined)continue;const p=ruta('block',...nomBloque(tile));if(!p)continue;
    try{const im=await imagen(p);if(im){imgs[tile]=im;S=Math.max(S,Math.min(64,im.width));}}catch(e){}}
  let overlay=null,ojo=null; try{const p=ruta('block','grass_block_side_overlay','grass_side_overlay');if(p)overlay=await imagen(p);}catch(e){}
  try{const p=ruta('block','end_portal_frame_eye','endframe_eye');if(p)ojo=await imagen(p);}catch(e){}
  if(bedrock){try{const p=ruta('block','grass_side_carried');if(p){imgs.grassSide=await imagen(p);overlay=null;}}catch(e){}}
  // Vuelve al atlas original y encima pone las del paquete
  const ctxA=atlas.getContext('2d'); ctxA.clearRect(0,0,atlas.width,atlas.height); ctxA.drawImage(atlasOriginal,0,0);
  const hd=S>16?lienzoPack(ATW*S,ATH*S):null, ctxH=hd&&hd.getContext('2d');
  if(hd){ctxH.imageSmoothingEnabled=false;ctxH.drawImage(atlas,0,0,hd.width,hd.height);}
  const pegar=(tile,sz,ctx)=>{const t=T[tile],d=texturaFinal(tile,imgs[tile],tile==='grassSide'&&!bedrock?overlay:null,sz);
    if(tile==='endFrameTopEye'&&ojo){const o=cuadro(ojo,sz,true);for(let i=0;i<d.data.length;i+=4)if(o.data[i+3]>=128){d.data[i]=o.data[i];d.data[i+1]=o.data[i+1];d.data[i+2]=o.data[i+2];d.data[i+3]=255;}}
    ctx.putImageData(d,(t%ATW)*sz,Math.floor(t/ATW)*sz);};
  for(const tile in imgs){pegar(tile,TS,ctxA);if(hd)pegar(tile,S,ctxH);}
  texAtlas.image=hd||atlas; texAtlas.needsUpdate=true;
  reconstruirAtlasIconos();
  // Iconos de los objetos
  for(let id=0;id<ITEMS.length;id++)if(LIENZOS_ORIG[id]){LIENZOS[id]=LIENZOS_ORIG[id];ICONOS[id]=LIENZOS[id].toDataURL();}
  regenerarIconos();
  let nItems=0;
  for(let id=0;id<ITEMS.length;id++){const it=ITEMS[id];if(!it||it.bloque)continue;const ns=nomItem(it.clave);if(!ns[0]&&!ns[1])continue;
    const p=ruta('item',...ns);if(!p)continue;
    try{const im=await imagen(p);if(!im)continue;const c=lienzoPack(16),x=c.getContext('2d');x.putImageData(cuadro(im,16,true),0,0);
      if(/^(casco|pechera|pantalones|botas)_cuero$|^armaduraCaballo_cuero$/.test(it.clave)){  // el cuero es gris en Minecraft y se tiñe de marrón
        const d=x.getImageData(0,0,16,16);for(let i=0;i<d.data.length;i+=4){d.data[i]*=.63;d.data[i+1]*=.4;d.data[i+2]*=.25;}x.putImageData(d,0,0);}
      LIENZOS[id]=c;ICONOS[id]=c.toDataURL();nItems++;}catch(e){}}
  // Fotogramas del arco tensándose
  for(let f=0;f<3;f++){try{const p=ruta('item','bow_pulling_'+f);if(p){const im=await imagen(p);const c=lienzoPack(16);c.getContext('2d').putImageData(cuadro(im,16,true),0,0);LIENZOS[9901+f]=c;}}catch(e){}}
  for(const k in geoExtr)delete geoExtr[k]; for(const k in matSprites)delete matSprites[k];
  manoId=-1; actualizarHUD(); if(ui)refrescarUI();
  const version=bedrock?'Bedrock':formato?'Java '+versionPack(formato):'Java';
  packActivo={nombre,desc,icono,bloques:Object.keys(imgs).length,objetos:nItems,resolucion:S,version,formato,omitidas};
  return packActivo;
}
function quitarPack(){
  const ctxA=atlas.getContext('2d'); ctxA.clearRect(0,0,atlas.width,atlas.height); ctxA.drawImage(atlasOriginal,0,0);
  texAtlas.image=atlas; texAtlas.needsUpdate=true; reconstruirAtlasIconos();
  for(let id=0;id<ITEMS.length;id++)if(LIENZOS_ORIG[id]){LIENZOS[id]=LIENZOS_ORIG[id];ICONOS[id]=LIENZOS[id].toDataURL();}
  ARCO_FASES.forEach((c,i)=>{LIENZOS[9901+i]=c;});
  regenerarIconos(); packActivo=null;
}

/* ---------- Guardado del paquete en el navegador (IndexedDB) ---------- */
function abrirIDB(){return new Promise((ok,mal)=>{const r=indexedDB.open('blockverse',1);r.onupgradeneeded=()=>r.result.createObjectStore('packs');r.onsuccess=()=>ok(r.result);r.onerror=()=>mal(r.error);});}
async function idbHacer(modo,fn){const db=await abrirIDB();return new Promise((ok,mal)=>{const t=db.transaction('packs',modo),r=fn(t.objectStore('packs'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>mal(t.error);});}
const guardarPackIDB=(nombre,buf)=>idbHacer('readwrite',s=>s.put({nombre,buf},'actual'));
const leerPackIDB=()=>idbHacer('readonly',s=>s.get('actual'));
const borrarPackIDB=()=>idbHacer('readwrite',s=>s.delete('actual'));
(async()=>{try{const g=await leerPackIDB();if(g&&g.buf){await aplicarPack(g.buf,g.nombre);pintarPacks();}}catch(e){}})();

/* ---------- Mods en JavaScript ---------- */
const COMANDOS_MOD={}, MOD_ACTUALIZAR=[], MOD_ROMPER=[];
const idDe=x=>typeof x==='number'?x:(B[x]??I[x]??CLAVE_A_ID[String(x).toLowerCase()]);
const Blockverse={
  version:'26.1', B, I, BLOQUES, ITEMS,
  receta(patron,clave,resultado,n=1){const c={};for(const k in clave)c[k]=idDe(clave[k]);receta(patron,c,idDe(resultado),n);},
  recetaSin(ingredientes,resultado,n=1){recetaSin(ingredientes.map(idDe),idDe(resultado),n);},
  comando(nombre,fn){COMANDOS_MOD[String(nombre).toLowerCase()]=fn;},
  alActualizar(fn){MOD_ACTUALIZAR.push(fn);},
  alRomperBloque(fn){MOD_ROMPER.push(fn);},
  mensaje(t){mostrarMensaje(String(t));},
  chat(t){escribirChat(String(t));},
  darObjeto(x,n=1){const id=idDe(x);if(ITEMS[id])insertarInv(crearPila(id,n));},
  efecto(nombre,segundos=30){if(!efectos[nombre]||efectos[nombre].t<segundos)efectos[nombre]={t:segundos,n:1};},
  getBloque:(x,y,z)=>getBloque(Math.floor(x),Math.floor(y)+OY,Math.floor(z)),
  setBloque:(x,y,z,b)=>setBloque(Math.floor(x),Math.floor(y)+OY,Math.floor(z),idDe(b)||0),
  invocar:(tipo,x,y,z)=>DEF_MOB[tipo]?crearMob(tipo,x,y+OY,z):null,
  jugador:()=>({x:jugador.pos.x,y:jugador.pos.y-OY,z:jugador.pos.z,salud,hambre}),
};
window.Blockverse=Blockverse;
const _ejecutarComandoMods=ejecutarComando;
ejecutarComando=function(t){
  const [cmd,...a]=t.trim().replace(/^\//,'').split(/\s+/), fn=COMANDOS_MOD[(cmd||'').toLowerCase()];
  if(fn){try{const r=fn(a);if(r!==undefined)escribirChat(String(r));}catch(e){escribirChat('Error del mod: '+e.message);}return;}
  return _ejecutarComandoMods(t);
};
const _romperApuntadoMods=romperApuntado;
romperApuntado=function(){
  const a=apuntado&&{x:apuntado.x,y:apuntado.y-OY,z:apuntado.z,b:apuntado.b};
  _romperApuntadoMods();
  if(a&&MOD_ROMPER.length)for(const f of MOD_ROMPER)try{f(a.x,a.y,a.z,BLOQUES[a.b]?BLOQUES[a.b].clave:a.b);}catch(e){}
};
const _actualizarFinalMods=actualizarFinal;
actualizarFinal=function(dt){_actualizarFinalMods(dt);for(const f of MOD_ACTUALIZAR)try{f(dt);}catch(e){}};
function leerMods(){try{const l=JSON.parse(localStorage.getItem('blockverse-mods')||'[]');return Array.isArray(l)?l:[];}catch(e){return [];}}
function guardarMods(l){try{localStorage.setItem('blockverse-mods',JSON.stringify(l));}catch(e){mostrarMensaje('No cabe el mod en el almacenamiento del navegador.');}}
const errorMod={};
// Versiones: un mod puede pedir una versión mínima con «// @blockverse 26.1» o Blockverse.requiere('26.1')
const cmpVersion=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0;};
Blockverse.api=1;
Blockverse.requiere=v=>{if(cmpVersion(v,Blockverse.version)>0)throw new Error('Este mod necesita Blockverse '+v+' o posterior (tienes '+Blockverse.version+').');};
// Nombres en inglés de la API, por comodidad
Blockverse.addCommand=Blockverse.comando; Blockverse.addRecipe=Blockverse.receta; Blockverse.onBlockBreak=Blockverse.alRomperBloque; Blockverse.onTick=Blockverse.alActualizar; Blockverse.give=Blockverse.darObjeto;
function ejecutarMod(m){
  const req=(m.codigo.match(/@blockverse\s+([\d.]+)/)||[])[1];
  if(req&&cmpVersion(req,Blockverse.version)>0){errorMod[m.nombre]='necesita Blockverse '+req+' o posterior (tienes '+Blockverse.version+')';return;}
  try{new Function('Blockverse',m.codigo)(Blockverse);errorMod[m.nombre]=null;}catch(e){errorMod[m.nombre]=e.message;}
}
for(const m of leerMods())if(m.activo)ejecutarMod(m);
const MOD_EJEMPLO=`// Mod de ejemplo para Blockverse
// /dia hace de día, /kit da herramientas de piedra y romper hojas a veces suelta manzanas.
Blockverse.comando('dia', () => { tiempoDia = .28; return 'Ahora es de día.'; });
Blockverse.comando('kit', () => { ['pico_piedra','hacha_piedra','pala_piedra','espada_piedra'].forEach(o => Blockverse.darObjeto(o)); return 'Kit de piedra entregado.'; });
Blockverse.recetaSin(['arena','arena','arena','arena'], 'arenisca', 1);
Blockverse.alRomperBloque((x, y, z, bloque) => { if (bloque === 'hojas' && Math.random() < .1) Blockverse.darObjeto('manzana'); });`;

/* ---------- Pantallas: paquetes de recursos y mods ---------- */
(function(){
  const div=document.createElement('div');
  div.innerHTML=`
<div id="pantallaPacks" class="capa oculto"><div class="tarjeta pantallaMC">
  <h2>Paquetes de recursos</h2>
  <div id="infoPack" class="cajaPack"></div>
  <input id="archivoPack" type="file" accept=".zip,.mcpack,application/zip" class="oculto">
  <button id="btnCargarPack">Elegir paquete (.zip o .mcpack)…</button>
  <button id="btnQuitarPack" class="secundario">Quitar paquete</button>
  <div class="ayuda">Sirven paquetes de Java de cualquier versión (de la 1.6 a la 1.21 y 26.x, con los nombres antiguos o nuevos de las texturas) y de Bedrock (.mcpack, texturas .png). Se cambian los bloques y los objetos; los paquetes HD se usan hasta 64 píxeles.</div>
  <button id="btnListoPacks" class="secundario">Listo</button>
</div></div>
<div id="pantallaMods" class="capa oculto"><div class="tarjeta pantallaMC">
  <h2>Mods</h2>
  <div id="listaMods"></div>
  <input id="archivoMod" type="file" accept=".js,text/javascript" class="oculto">
  <div class="filaBotones"><button id="btnAnadirMod">Añadir mod (.js)…</button><button id="btnModEjemplo" class="secundario">Instalar mod de ejemplo</button></div>
  <div class="ayuda">Los mods .jar de Minecraft Java no pueden funcionar en un navegador. Blockverse usa mods de JavaScript con la API <b>Blockverse</b>: comando(nombre, fn), receta(patrón, claves, resultado), recetaSin(lista, resultado), alRomperBloque(fn), alActualizar(fn), darObjeto(objeto, n), setBloque/getBloque(x, y, z), invocar(criatura, x, y, z), mensaje(texto). Solo instala mods de gente en la que confíes: tienen acceso total al juego.</div>
  <button id="btnListoMods" class="secundario">Listo</button>
</div></div>`;
  document.body.appendChild(div);
  const css=document.createElement('style');
  css.textContent=`#pantallaPacks .tarjeta,#pantallaMods .tarjeta{background:rgba(24,24,28,.8);color:#e8e8e8;border:2px solid #000;box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.5),0 20px 50px rgba(0,0,0,.55);}
.cajaPack{display:flex;gap:10px;align-items:center;text-align:left;background:rgba(0,0,0,.45);border:2px solid #000;padding:8px;min-height:74px;margin-bottom:6px;}
.cajaPack img{width:64px;height:64px;image-rendering:pixelated;border:1px solid #000;flex:none;} .cajaPack b{color:#fff;font-weight:500;} .cajaPack small{display:block;color:#9a9a9a;font-size:12px;}
#listaMods{max-height:min(240px,34vh);overflow:auto;background:rgba(0,0,0,.45);border:2px solid #000;padding:4px;text-align:left;margin-bottom:6px;}
.modFila{display:flex;align-items:center;gap:8px;padding:6px;} .modFila span{flex:1;color:#fff;} .modFila small{display:block;color:#e07070;font-size:12px;}
.modFila button{width:auto;margin:0;padding:6px 10px;font-size:13px;}`;
  document.head.appendChild(css);
  const listo=document.getElementById('btnListoOpciones');
  for(const [id,txt,dest] of [['btnPacks','Paquetes de recursos…','pantallaPacks'],['btnMods','Mods…','pantallaMods']]){
    const b=document.createElement('button');b.id=id;b.className='secundario';b.textContent=txt;
    b.onclick=()=>{document.getElementById('pantallaOpciones').classList.add('oculto');document.getElementById(dest).classList.remove('oculto');if(dest==='pantallaMods')pintarMods();else pintarPacks();};
    listo.parentNode.insertBefore(b,listo);}
  const volver=id=>{document.getElementById(id).classList.add('oculto');document.getElementById('pantallaOpciones').classList.remove('oculto');};
  document.getElementById('btnListoPacks').onclick=()=>volver('pantallaPacks');
  document.getElementById('btnListoMods').onclick=()=>volver('pantallaMods');
  document.getElementById('btnCargarPack').onclick=()=>document.getElementById('archivoPack').click();
  document.getElementById('archivoPack').onchange=async e=>{
    const f=e.target.files[0]; e.target.value=''; if(!f)return;
    const info=document.getElementById('infoPack'); info.textContent='Cargando '+f.name+'…';
    try{const buf=await f.arrayBuffer();await aplicarPack(buf,f.name.replace(/\.(zip|mcpack)$/i,''));
      try{await guardarPackIDB(packActivo.nombre,buf);}catch(err){}
    }catch(err){info.textContent='No se pudo cargar: '+err.message;return;}
    pintarPacks();
  };
  document.getElementById('btnQuitarPack').onclick=async()=>{quitarPack();try{await borrarPackIDB();}catch(e){}pintarPacks();};
  document.getElementById('btnAnadirMod').onclick=()=>document.getElementById('archivoMod').click();
  document.getElementById('archivoMod').onchange=async e=>{
    const f=e.target.files[0]; e.target.value=''; if(!f)return;
    const m={nombre:f.name.replace(/\.js$/i,''),codigo:await f.text(),activo:true};
    const l=leerMods().filter(x=>x.nombre!==m.nombre); l.push(m); guardarMods(l); ejecutarMod(m); pintarMods();
  };
  document.getElementById('btnModEjemplo').onclick=()=>{
    const m={nombre:'Mod de ejemplo',codigo:MOD_EJEMPLO,activo:true};
    const l=leerMods().filter(x=>x.nombre!==m.nombre); l.push(m); guardarMods(l); ejecutarMod(m); pintarMods();
  };
})();
function pintarPacks(){
  const info=document.getElementById('infoPack'); if(!info)return;
  info.innerHTML='';
  const img=document.createElement('img'); img.alt='';
  const t=document.createElement('div'), n=document.createElement('b'), s=document.createElement('small'), s2=document.createElement('small');
  if(packActivo){img.src=packActivo.icono||ICONOS[B.cesped];n.textContent=packActivo.nombre;s.textContent=packActivo.desc||'';
    s2.textContent=`${packActivo.version||'Java'}${packActivo.formato?' (formato '+packActivo.formato+')':''} · ${packActivo.bloques} texturas de bloques y ${packActivo.objetos} de objetos · ${packActivo.resolucion}×${packActivo.resolucion}`+(packActivo.omitidas?` · ${packActivo.omitidas} en formato .tga no admitido`:'');}
  else{img.src=ICONOS[B.cesped];n.textContent='Predeterminado';s.textContent='Las texturas propias de Blockverse.';}
  t.append(n,s,s2); info.append(img,t);
  document.getElementById('btnQuitarPack').disabled=!packActivo;
}
function pintarMods(){
  const cont=document.getElementById('listaMods'); cont.innerHTML='';
  const l=leerMods();
  if(!l.length){cont.innerHTML='<div class="vacioMundos">No hay mods instalados.</div>';return;}
  l.forEach((m,i)=>{
    const f=document.createElement('div');f.className='modFila';
    const n=document.createElement('span');n.textContent=m.nombre+(m.activo?'':' (desactivado)');
    if(errorMod[m.nombre]){const e=document.createElement('small');e.textContent='Error: '+errorMod[m.nombre];n.appendChild(e);}
    const a=document.createElement('button');a.className='secundario';a.textContent=m.activo?'Desactivar':'Activar';
    a.onclick=()=>{m.activo=!m.activo;guardarMods(l);if(m.activo)ejecutarMod(m);else mostrarMensaje('El mod se desactivará al recargar la página.');pintarMods();};
    const b=document.createElement('button');b.className='secundario';b.textContent='Quitar';
    b.onclick=()=>{l.splice(i,1);guardarMods(l);mostrarMensaje('El mod se quitará del todo al recargar la página.');pintarMods();};
    f.append(n,a,b);cont.appendChild(f);
  });
}
