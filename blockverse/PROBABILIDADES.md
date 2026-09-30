# Probabilidades de Blockverse

Generado a partir del código del juego (las tablas de botín se miden simulando 3.000 cofres de cada tipo). En el juego: `/probabilidades` y `/botin <tipo>`.

## Probabilidades de las estructuras

| Estructura | Dónde | Probabilidad | Frecuencia |
|---|---|---|---|
| Aldea | llanuras, desierto, sabana, taiga y nieve | 60 % por región de 320×320 bloques | ≈ 1 cada 170.000 bloques² |
| Mazmorra | bajo tierra (altura 18-68), cualquier bioma | 3,5 % por chunk | ≈ 1 cada 29 chunks |
| Mina abandonada | bajo tierra | 22 % por región de 5×5 chunks | ≈ 1 cada 114 chunks |
| Portal en ruinas | superficie, cualquier bioma | 0,6 % por chunk | ≈ 1 cada 167 chunks |
| Pozo del desierto | desierto | 1 % por chunk de desierto | ≈ 1 cada 100 chunks de desierto |
| Pirámide del desierto | desierto | 50 % por región de 256×256 si el centro cae en desierto | ≈ 1 cada 512 chunks (solo en desierto) |
| Templo de la jungla | jungla | 0,8 % por chunk de jungla | ≈ 1 cada 125 chunks de jungla |
| Cabaña de bruja | pantano y manglar | 1,8 % por chunk | ≈ 1 cada 56 chunks de pantano |
| Iglú | llanura nevada | 3,5 % por chunk (50 % con sótano) | ≈ 1 cada 29 chunks nevados |
| Puesto de saqueadores | superficie | 0,4 % por chunk | ≈ 1 cada 250 chunks |
| Naufragio | playa y océano | 1,2 % por chunk | ≈ 1 cada 83 chunks de mar |
| Ruinas oceánicas | océanos | 4 % por chunk | ≈ 1 cada 25 chunks de mar |
| Tesoro enterrado | playa | 5 % por chunk de playa | ≈ 1 cada 20 chunks de playa |
| Monumento oceánico | océano profundo | 60 % por región de 448×448 | ≈ 1 cada 1.300 chunks |
| Ruinas del sendero | bosques, taiga, jungla y cerezos | 0,7 % por chunk | ≈ 1 cada 143 chunks de bosque |
| Roca del bosque | taiga | 12 % por chunk | ≈ 1 cada 8 chunks de taiga |
| Geoda de amatista | bajo tierra | 3,5 % por chunk | ≈ 1 cada 29 chunks |
| Fósil | desierto y pantano (enterrado) | 3 % por chunk | ≈ 1 cada 33 chunks |
| Mansión del bosque | bosque oscuro | 50 % por región de 480×480 | ≈ 1 cada 1.800 chunks (si hay bosque oscuro) |
| Ciudad antigua | bajo tierra profunda | 65 % por región de 288×288 | ≈ 1 cada 500 chunks |
| Cámara de prueba | bajo tierra | 55 % por región de 320×320 | ≈ 1 cada 720 chunks |
| Fortaleza | una por mundo, lejos del origen | 100 % | única |
| Fortaleza del Nether | Nether | 80 % por región de 176×176 | ≈ 1 cada 150 chunks del Nether |
| Bastión en ruinas | Nether | 45 % por región de 240×240 | ≈ 1 cada 500 chunks del Nether |
| Ghast seco | valle de almas | 12 % por chunk | común en el valle |
| Ciudad del End | islas exteriores del End | 55 % por región de 96×96 (con barco y élitros al azar) | ≈ 1 cada 64 chunks del End |

Generador de las mazmorras: Zombi 50 % · Esqueleto 25 % · Araña 25 %. Tamaño: 7×7, 7×9 o 9×9 (25 %/50 %/25 %); 1 cofre (50 %) o 2 (50 %).
Desgaste: ladrillos de piedra → musgosos 14 %, agrietados 10 %; adoquín bajo tierra → musgoso 18 %; ladrillos del Nether → agrietados 8 %; telarañas junto a la madera de las minas 3,5 %.

## Botín de los cofres

Cada cofre tira varios grupos. «Prob.» es la probabilidad de encontrar el objeto en un cofre; «Media» es cuántos salen de media cuando sale.

### Mazmorra

Grupos: 1-3 tiradas + 1-4 tiradas + 3 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Cuerda | 58 % | 5.9 |
| Carne podrida | 58 % | 5.7 |
| Pólvora | 58 % | 5.8 |
| Hueso | 57 % | 5.9 |
| Trigo | 34 % | 2.9 |
| Pan | 34 % | 1.2 |
| Etiqueta | 29 % | 1.1 |
| Silla de montar | 29 % | 1.1 |
| Carbón | 28 % | 2.8 |
| Polvo de redstone | 26 % | 2.8 |
| Disco de música (cat) | 23 % | 1.1 |
| Disco de música (13) | 23 % | 1.1 |
| Manzana dorada | 23 % | 1.1 |
| Armadura de caballo de hierro | 22 % | 1.1 |
| Semillas de remolacha | 19 % | 3.2 |
| Cubo | 19 % | 1.1 |
| Lingote de hierro | 19 % | 2.7 |
| Semillas de sandía | 18 % | 3.3 |
| Semillas de calabaza | 18 % | 3.3 |
| Armadura de caballo de oro | 14 % | 1.1 |
| Libro encantado | 14 % | 1.1 |
| Lingote de oro | 10 % | 2.6 |
| Armadura de caballo de diamante | 7.0 % | 1.1 |

### Mina abandonada

Grupos: 1 tirada + 2-4 tiradas + 3 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Raíl | 87 % | 10.1 |
| Antorcha | 77 % | 12.7 |
| Etiqueta | 42 % | 1.0 |
| Bayas brillantes | 39 % | 5.4 |
| Pan | 38 % | 2.4 |
| Raíl propulsor | 33 % | 2.8 |
| Manzana dorada | 29 % | 1.0 |
| Carbón | 28 % | 6.2 |
| Semillas de calabaza | 28 % | 3.3 |
| Lingote de hierro | 27 % | 3.4 |
| Semillas de sandía | 27 % | 3.4 |
| Semillas de remolacha | 26 % | 3.4 |
| Polvo de redstone | 15 % | 6.8 |
| Lapislázuli | 14 % | 7.0 |
| Lingote de oro | 14 % | 2.1 |
| Libro encantado | 14 % | 1.0 |
| Diamante | 9.1 % | 1.6 |
| Pico de hierro | 8.1 % | 1.0 |

### Pirámide del desierto

Grupos: 2-4 tiradas + 4 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Hueso | 72 % | 7.5 |
| Carne podrida | 70 % | 7.3 |
| Cuerda | 60 % | 6.1 |
| Pólvora | 59 % | 6.1 |
| Arena | 59 % | 6.2 |
| Ojo de araña | 28 % | 2.3 |
| Manzana dorada | 25 % | 1.1 |
| Libro encantado | 24 % | 1.1 |
| Silla de montar | 23 % | 1.1 |
| Lingote de oro | 18 % | 4.8 |
| Esmeralda | 18 % | 2.2 |
| Armadura de caballo de hierro | 18 % | 1.1 |
| Lingote de hierro | 16 % | 3.2 |
| Armadura de caballo de oro | 12 % | 1.1 |
| Diamante | 6.3 % | 2.0 |
| Armadura de caballo de diamante | 6.0 % | 1.0 |

### Templo de la jungla

Grupos: 2-6 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Hueso | 66 % | 7.6 |
| Carne podrida | 57 % | 6.9 |
| Lingote de oro | 56 % | 6.1 |
| Lingote de hierro | 39 % | 3.7 |
| Flecha | 33 % | 5.3 |
| Diamante | 15 % | 2.1 |
| Silla de montar | 13 % | 1.1 |
| Esmeralda | 9.8 % | 2.1 |
| Armadura de caballo de oro | 5.2 % | 1.0 |
| Armadura de caballo de hierro | 4.9 % | 1.0 |
| Libro encantado | 4.8 % | 1.0 |
| Armadura de caballo de diamante | 4.2 % | 1.0 |

### Fortaleza (pasillo)

Grupos: 2-3 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Pan | 34 % | 2.4 |
| Manzana | 33 % | 2.3 |
| Perla de ender | 24 % | 1.1 |
| Lingote de hierro | 23 % | 3.4 |
| Lingote de oro | 13 % | 2.1 |
| Espada de hierro | 13 % | 1.1 |
| Pechera de hierro | 12 % | 1.0 |
| Polvo de redstone | 12 % | 6.8 |
| Pico de hierro | 12 % | 1.0 |
| Botas de hierro | 11 % | 1.0 |
| Pantalones de hierro | 11 % | 1.0 |
| Casco de hierro | 10 % | 1.0 |
| Diamante | 8.0 % | 2.1 |
| Silla de montar | 2.9 % | 1.0 |
| Libro encantado | 2.6 % | 1.0 |
| Manzana dorada | 2.6 % | 1.0 |
| Armadura de caballo de oro | 2.4 % | 1.0 |
| Armadura de caballo de hierro | 2.3 % | 1.0 |
| Armadura de caballo de diamante | 2.3 % | 1.0 |

### Casa de aldea

Grupos: 3-8 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Pan | 68 % | 4.0 |
| Manzana | 67 % | 4.7 |
| Patata | 66 % | 4.7 |
| Trigo | 48 % | 6.0 |
| Brote de roble | 41 % | 1.9 |
| Antorcha | 34 % | 5.3 |
| Esmeralda | 19 % | 2.8 |
| Diente de león | 18 % | 1.1 |
| Pluma | 10 % | 1.1 |
| Libro | 9.9 % | 1.1 |
| Amapola | 9.6 % | 1.0 |
| Pepita de oro | 9.0 % | 2.1 |

### Herrería de aldea

Grupos: 3-8 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Pan | 62 % | 3.0 |
| Manzana | 59 % | 3.0 |
| Lingote de hierro | 45 % | 3.8 |
| Espada de hierro | 27 % | 1.2 |
| Pico de hierro | 26 % | 1.1 |
| Pechera de hierro | 26 % | 1.2 |
| Obsidiana | 26 % | 5.7 |
| Brote de roble | 26 % | 5.6 |
| Pantalones de hierro | 26 % | 1.1 |
| Casco de hierro | 26 % | 1.2 |
| Botas de hierro | 25 % | 1.1 |
| Lingote de oro | 25 % | 2.3 |
| Silla de montar | 16 % | 1.1 |
| Diamante | 15 % | 2.1 |
| Armadura de caballo de oro | 5.6 % | 1.0 |
| Armadura de caballo de hierro | 5.4 % | 1.0 |
| Armadura de caballo de diamante | 5.0 % | 1.0 |

### Portal en ruinas

Grupos: 4-8 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Pedernal | 55 % | 3.4 |
| Mechero | 55 % | 1.4 |
| Obsidiana | 55 % | 2.1 |
| Casco de oro | 27 % | 1.1 |
| Pala de oro | 27 % | 1.1 |
| Espada de oro | 27 % | 1.1 |
| Azada de oro | 27 % | 1.1 |
| Pechera de oro | 27 % | 1.1 |
| Botas de oro | 26 % | 1.1 |
| Hacha de oro | 26 % | 1.1 |
| Pantalones de oro | 25 % | 1.1 |
| Manzana dorada | 24 % | 1.1 |
| Pepita de oro | 24 % | 15.6 |
| Pico de oro | 24 % | 1.1 |
| Armadura de caballo de oro | 9.9 % | 1.0 |
| Lingote de oro | 9.8 % | 5.2 |
| Reloj | 9.6 % | 1.0 |
| Zanahoria dorada | 9.4 % | 8.3 |
| Rodaja de sandía reluciente | 7.8 % | 8.4 |
| Campana | 2.0 % | 1.0 |
| Bloque de oro | 1.6 % | 1.5 |

### Ciudad del End

Grupos: 2-6 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Lingote de oro | 53 % | 6.1 |
| Lingote de hierro | 39 % | 7.6 |
| Diamante | 22 % | 5.1 |
| Semillas de remolacha | 20 % | 6.0 |
| Espada de diamante | 14 % | 1.1 |
| Pico de hierro | 14 % | 1.1 |
| Pechera de hierro | 14 % | 1.1 |
| Botas de hierro | 14 % | 1.1 |
| Casco de diamante | 14 % | 1.0 |
| Botas de diamante | 14 % | 1.1 |
| Pala de hierro | 13 % | 1.1 |
| Casco de hierro | 13 % | 1.1 |
| Pantalones de hierro | 13 % | 1.1 |
| Pico de diamante | 13 % | 1.1 |
| Pechera de diamante | 13 % | 1.1 |
| Pantalones de diamante | 12 % | 1.1 |
| Pala de diamante | 12 % | 1.1 |
| Silla de montar | 12 % | 1.0 |
| Espada de hierro | 12 % | 1.1 |
| Esmeralda | 8.3 % | 4.3 |
| Armadura de caballo de hierro | 5.2 % | 1.0 |
| Armadura de caballo de diamante | 4.8 % | 1.0 |
| Armadura de caballo de oro | 4.0 % | 1.0 |

### Fortaleza del Nether

Grupos: 2-4 tiradas + 1 tirada

| Objeto | Prob. | Media |
|---|---|---|
| Lingote de oro | 51 % | 2.5 |
| Silla de montar | 35 % | 1.2 |
| Armadura de caballo de oro | 27 % | 1.1 |
| Armadura de caballo de hierro | 20 % | 1.0 |
| Pechera de oro | 20 % | 1.1 |
| Espada de oro | 19 % | 1.1 |
| Verruga del Nether | 19 % | 5.4 |
| Diamante | 19 % | 2.2 |
| Lingote de hierro | 19 % | 3.3 |
| Mechero | 18 % | 1.1 |
| Armadura de caballo de diamante | 11 % | 1.0 |
| Obsidiana | 8.3 % | 3.1 |
| Plantilla de mejora de netherite | 6.4 % | 1.0 |

### Bastión en ruinas

Grupos: 1 tirada + 2 tiradas + 3-4 tiradas + 1 tirada

| Objeto | Prob. | Media |
|---|---|---|
| Flecha | 47 % | 13.4 |
| Crema de magma | 47 % | 5.0 |
| Piedra negra | 27 % | 11.1 |
| Pepita de oro | 27 % | 5.5 |
| Chuleta de cerdo cocinada | 26 % | 1.1 |
| Bloque de hueso | 26 % | 5.2 |
| Obsidiana | 26 % | 5.5 |
| Cuerda | 26 % | 5.5 |
| Cadena | 26 % | 6.8 |
| Obsidiana llorosa | 25 % | 3.3 |
| Pantalones de oro | 20 % | 1.1 |
| Lingote de hierro | 20 % | 3.6 |
| Bloque de hierro | 19 % | 1.1 |
| Espada de hierro | 18 % | 1.0 |
| Casco de oro | 18 % | 1.1 |
| Bloque de oro | 18 % | 1.0 |
| Lingote de oro | 17 % | 3.7 |
| Pechera de oro | 17 % | 1.0 |
| Zanahoria dorada | 17 % | 11.3 |
| Espada de oro | 16 % | 1.0 |
| Restos ancestrales | 15 % | 1.0 |
| Ballesta | 15 % | 1.1 |
| Libro encantado | 14 % | 1.0 |
| Flecha espectral | 14 % | 16.2 |
| Manzana dorada | 12 % | 1.0 |
| Hacha de oro | 10 % | 1.0 |
| Plantilla de mejora de netherite | 9.7 % | 1.0 |
| Botas de oro | 9.1 % | 1.0 |
| Pala de diamante | 8.3 % | 1.0 |
| Pico de diamante | 7.3 % | 1.0 |
| Chatarra de netherite | 5.5 % | 1.0 |

### Naufragio

Grupos: 3-10 tiradas + 3-6 tiradas + 1 tirada

| Objeto | Prob. | Media |
|---|---|---|
| Lingote de hierro | 98 % | 8.5 |
| Esmeralda | 76 % | 5.0 |
| Estofado de champiñones | 55 % | 1.4 |
| Papel | 46 % | 8.7 |
| Patata venenosa | 43 % | 5.3 |
| Bloque de musgo | 42 % | 3.2 |
| Patata | 42 % | 5.2 |
| Trigo | 42 % | 18.4 |
| Zanahoria | 41 % | 7.7 |
| Carbón | 36 % | 6.3 |
| Carne podrida | 32 % | 17.3 |
| Lingote de oro | 27 % | 3.3 |
| Pechera de cuero | 21 % | 1.1 |
| Casco de cuero | 21 % | 1.1 |
| Pólvora | 21 % | 3.4 |
| Pantalones de cuero | 21 % | 1.2 |
| Botas de cuero | 21 % | 1.1 |
| Mapa | 18 % | 1.0 |
| Brújula | 17 % | 1.0 |
| Reloj | 16 % | 1.0 |
| Bambú | 15 % | 2.2 |
| Diamante | 14 % | 1.1 |
| Calabaza | 13 % | 2.2 |
| Dinamita | 7.4 % | 1.6 |

### Tesoro enterrado

Grupos: 1 tirada + 5-8 tiradas + 1-3 tiradas + 0-1 tiradas + 2 tiradas + 0-2 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Corazón del mar | 100 % | 1.0 |
| Lingote de hierro | 100 % | 9.4 |
| Lingote de oro | 88 % | 5.2 |
| Bacalao cocinado | 75 % | 4.0 |
| Salmón cocinado | 75 % | 4.0 |
| Poción rara | 68 % | 1.5 |
| Dinamita | 63 % | 2.3 |
| Esmeralda | 54 % | 7.6 |
| Cristales de prismarina | 52 % | 3.8 |
| Diamante | 51 % | 1.9 |
| Espada de hierro | 26 % | 1.0 |
| Pechera de cuero | 24 % | 1.0 |

### Iglú

Grupos: 2-8 tiradas + 1 tirada

| Objeto | Prob. | Media |
|---|---|---|
| Manzana dorada | 100 % | 1.0 |
| Manzana | 70 % | 3.3 |
| Carbón | 69 % | 4.3 |
| Pepita de oro | 56 % | 2.9 |
| Carne podrida | 56 % | 1.4 |
| Trigo | 55 % | 3.6 |
| Hacha de piedra | 16 % | 1.1 |
| Esmeralda | 7.5 % | 1.1 |

### Ruinas oceánicas

Grupos: 2-8 tiradas + 1 tirada

| Objeto | Prob. | Media |
|---|---|---|
| Trigo | 73 % | 4.5 |
| Carbón | 72 % | 4.4 |
| Mapa | 58 % | 1.0 |
| Libro encantado | 50 % | 1.3 |
| Pepita de oro | 47 % | 2.7 |
| Carne podrida | 46 % | 1.3 |
| Caña de pescar | 30 % | 1.0 |
| Hacha de piedra | 24 % | 1.1 |
| Manzana dorada | 12 % | 1.1 |
| Esmeralda | 11 % | 1.0 |
| Casco de oro | 6.3 % | 1.0 |
| Pechera de cuero | 5.9 % | 1.0 |

### Puesto de saqueadores

Grupos: 0-1 tiradas + 2-3 tiradas + 1-3 tiradas + 2-3 tiradas + 1 tirada

| Objeto | Prob. | Media |
|---|---|---|
| Tronco de roble oscuro | 100 % | 5.0 |
| Trigo | 73 % | 5.7 |
| Flecha | 63 % | 6.0 |
| Cuerda | 62 % | 4.7 |
| Patata | 57 % | 4.4 |
| Zanahoria | 56 % | 5.2 |
| Lingote de hierro | 51 % | 2.5 |
| Cuerno de cabra | 50 % | 1.0 |
| Ballesta | 50 % | 1.0 |
| Libro encantado | 19 % | 1.1 |

### Mansión del bosque

Grupos: 1-3 tiradas + 1-4 tiradas + 3 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Cuerda | 58 % | 5.9 |
| Carne podrida | 58 % | 5.7 |
| Pólvora | 58 % | 5.8 |
| Hueso | 57 % | 5.9 |
| Trigo | 34 % | 2.9 |
| Pan | 34 % | 1.2 |
| Etiqueta | 29 % | 1.1 |
| Rienda | 29 % | 1.1 |
| Carbón | 28 % | 2.8 |
| Polvo de redstone | 26 % | 2.8 |
| Disco de música (cat) | 23 % | 1.1 |
| Disco de música (13) | 23 % | 1.1 |
| Manzana dorada | 23 % | 1.1 |
| Azada de diamante | 22 % | 1.1 |
| Semillas de remolacha | 19 % | 3.2 |
| Cubo | 19 % | 1.1 |
| Lingote de hierro | 19 % | 2.7 |
| Semillas de sandía | 18 % | 3.3 |
| Semillas de calabaza | 18 % | 3.3 |
| Pechera de hierro | 14 % | 1.1 |
| Libro encantado | 14 % | 1.1 |
| Lingote de oro | 10 % | 2.6 |
| Pechera de diamante | 7.0 % | 1.1 |

### Ciudad antigua

Grupos: 5-10 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Carbón | 57 % | 14.9 |
| Hueso | 47 % | 10.6 |
| Polvo de hueso | 45 % | 10.0 |
| Farol de almas | 45 % | 10.4 |
| Libro | 44 % | 8.5 |
| Fragmento de eco | 38 % | 2.5 |
| Manzana dorada | 37 % | 1.9 |
| Sensor de sculk | 30 % | 2.4 |
| Sculk | 29 % | 8.4 |
| Fragmento de amatista | 29 % | 8.8 |
| Perla de ender | 22 % | 2.2 |
| Catalizador de sculk | 21 % | 1.6 |
| Azada de diamante | 21 % | 1.1 |
| Disco de música (cat) | 21 % | 1.1 |
| Etiqueta | 21 % | 1.1 |
| Brújula | 21 % | 1.1 |
| Pantalones de diamante | 21 % | 1.1 |
| Bola de nieve | 21 % | 9.1 |
| Rienda | 20 % | 1.1 |
| Disco de música (13) | 19 % | 1.1 |

### Cámara de prueba

Grupos: 1-3 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Carga de viento | 24 % | 2.2 |
| Toba | 24 % | 15.2 |
| Perla de ender | 18 % | 1.6 |
| Pico de piedra | 17 % | 1.1 |
| Flecha | 17 % | 9.8 |
| Antorcha | 17 % | 4.8 |
| Andamio | 17 % | 4.7 |
| Hacha de piedra | 17 % | 1.1 |
| Bambú | 16 % | 4.8 |
| Hacha de hierro | 8.7 % | 1.0 |
| Panal | 8.3 % | 4.6 |

### Cabaña de bruja

Grupos: 2-5 tiradas

| Objeto | Prob. | Media |
|---|---|---|
| Ojo de araña | 57 % | 2.7 |
| Polvo de piedra luminosa | 43 % | 3.1 |
| Polvo de redstone | 42 % | 3.1 |
| Frasco de vidrio | 42 % | 2.5 |
| Azúcar | 41 % | 3.1 |
| Verruga del Nether | 26 % | 2.3 |
| Poción rara | 19 % | 1.1 |
| Libro encantado | 14 % | 1.1 |
