// Mod de ejemplo para Blockverse
// /dia hace de día, /kit da herramientas de piedra y romper hojas a veces suelta manzanas.
Blockverse.comando('dia', () => { tiempoDia = .28; return 'Ahora es de día.'; });
Blockverse.comando('kit', () => { ['pico_piedra','hacha_piedra','pala_piedra','espada_piedra'].forEach(o => Blockverse.darObjeto(o)); return 'Kit de piedra entregado.'; });
Blockverse.recetaSin(['arena','arena','arena','arena'], 'arenisca', 1);
Blockverse.alRomperBloque((x, y, z, bloque) => { if (bloque === 'hojas' && Math.random() < .1) Blockverse.darObjeto('manzana'); });
