/* NEXO ARCADE — platform/lexicon.js
   Vocabulario en español compartido por los juegos de palabras. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});

  /* Palabras de cinco letras sin tildes ni ñ: base del juego de deducción. */
  const W5 = ('abeja abono abrir acero acido actor aguja ahora aires album algas alero altar amigo ancla andar angel '
    + 'anexo animo antes apoyo arbol archi arena armas aroma arroz asilo astro atajo audio aulas autor avena aviso '
    + 'ayuda azote azul barco barro basta bebes bella besos bicho bingo bocas bolsa bombo bonos boton brazo brisa '
    + 'broma bruja buque burro busca cable cabra cacao cadiz caida calor calle campo canal canoa cargo carne carta '
    + 'casco caspa cauce cebra cerca cerdo cesta chile choza cielo cifra circo clase clave clima cobre cocos codigo '
    + 'colas color combo comer conde copia coral corre corte costa crema crisis cruce cuadro cuero culpa curso danza '
    + 'datos dedos delta denso deseo dieta diosa disco dobla dolor dorso draga dueno dulce duque duros ebano echar '
    + 'edad eje ejemplo elegir elite email enano enero envio epoca error espia estar etapa exito extra facil falda '
    + 'falso fecha ferro fibra ficha fiera fiesta filas filme final firma fisco flaco flauta flora fluir focos fondo '
    + 'forma forro fosil freno frase fresa frito fruta fuego fuera fuerza fugaz fumar furia futbol gafas gallo ganar '
    + 'ganso garra gasto gatos gemas genio globo golfo golpe goma gorra grado grano grasa grava grieta grifo gripe '
    + 'gris grito grupo guante guapo guiso gustar habla hacer hadas halcon harina hasta hecho helado hielo hierro '
    + 'hijos hilos hogar hojas hombro honor horno hotel hueco huevo humor huerto humo idea idiom iglesia igual '
    + 'imagen indio islas jabon jamon jarra jaula jefes joyas juego jugar junio junta justo labio lados lagos lamer '
    + 'lanza largo lasca latir lavar leche lejos lento leon letra libro licor lider limon linea lirio lista litro '
    + 'lobos local lomos lucha luego lugar lunes lupas macro madre magia maleta malla mando manos mapas marca mares '
    + 'marco marea masas mayor media melon menos mente mesas metal metro miedo miel mimo minas mirar mitad moda mojar '
    + 'molde monje monte moral morir motor mover mudar muela muros museo musgo nacer nadar naipe nariz nave nieve '
    + 'nivel noble noche nomad norte notas nube nudos nuevo numero nunca obras ocaso ocupa oeste ojos olas oliva olvido '
    + 'ondas opera orden oreja orilla oro oscuro otono padre pagar pajar palma palo panel papel pardo pared parque '
    + 'pasos pasta pauta pecho pedal pedir pelea pelos penal pena perla perro pesca peso piano picos piedra pilar '
    + 'pinar pinta pinza pista placa plano plata playa plaza pleno pluma pobre poder polvo pomelo poner porte posar '
    + 'pozos prado premio presa primo prisa prosa prueba pulga pulir punta punto queso quien quiso radio rama rango '
    + 'rapaz rasgo ratos rayos razon recto redes regla reino reloj remar renta reyes ricos riego rigor rimas rincon '
    + 'rinon risas ritmo rival roble rocas rojo ronda ropa rosal rotor rubio rueda ruido rumbo saber sabio sacar '
    + 'sacos salir salsa salto salud sabor sangre santo sauce secar secta selva senda sena senal sepia serie servir '
    + 'seta siglo signo silla silva simio sitio sobre socio solar sombra sonar sopa sorbo suave subir sucio sueno '
    + 'suelo suerte sumar surco tabla tacon talla tallo tapiz tarde tarea tasa techo tecla tejas telas tema temor '
    + 'tenis tenso tesis texto tibio tienda tigre timbre tinta tirar titulo tocar todos tomar tonos torre torta '
    + 'total traer trama trapo trato treinta tren tribu trigo triple trono tropa trozo tubos tumba turno ultimo '
    + 'union urgente usar usual valle vapor vaqui varon vasos vecino vela vello venda vender veneno venir ventana '
    + 'verde verso viaje vidrio viejo viento vigor villa vinos violin virus visor vital vivir vocal volar voltio '
    + 'votos vuelo yegua yema yerba yeso yodo zafiro zanja zarza zonas zorro zumo').split(/\s+/)
    .filter((w) => w.length === 5);

  /* Vocabulario temático para sopa de letras y ahorcado. */
  const TEMAS = {
    'Animales': ['ELEFANTE', 'JIRAFA', 'TIBURON', 'PINGUINO', 'CABALLO', 'TORTUGA', 'DELFIN', 'AGUILA', 'ZORRO',
      'LEOPARDO', 'CANGURO', 'ERIZO', 'BALLENA', 'MURCIELAGO', 'LAGARTO', 'ARDILLA', 'PANTERA', 'FLAMENCO'],
    'Comida': ['CHOCOLATE', 'AGUACATE', 'LENTEJAS', 'TORTILLA', 'PIMIENTO', 'SANDIA', 'CANELA', 'ALMENDRA',
      'GAZPACHO', 'CALABAZA', 'MEMBRILLO', 'ESPINACA', 'MERLUZA', 'GARBANZO', 'ALCACHOFA', 'MANDARINA'],
    'Deportes': ['BALONCESTO', 'NATACION', 'ATLETISMO', 'CICLISMO', 'ESGRIMA', 'BALONMANO', 'VOLEIBOL',
      'PIRAGUISMO', 'GIMNASIA', 'BOXEO', 'SURF', 'ESCALADA', 'PATINAJE', 'TRIATLON', 'RUGBY', 'HALTEROFILIA'],
    'Países': ['ARGENTINA', 'COLOMBIA', 'PORTUGAL', 'MARRUECOS', 'AUSTRALIA', 'NORUEGA', 'ISLANDIA', 'FILIPINAS',
      'URUGUAY', 'ETIOPIA', 'VIETNAM', 'ECUADOR', 'GRECIA', 'CANADA', 'TAILANDIA', 'PARAGUAY'],
    'Ciencia': ['GRAVEDAD', 'MOLECULA', 'GALAXIA', 'NEURONA', 'PROTEINA', 'ELECTRON', 'VOLCAN', 'MAGNETISMO',
      'BACTERIA', 'ENZIMA', 'PLASMA', 'ORBITA', 'FOTOSINTESIS', 'CROMOSOMA', 'ISOTOPO', 'NEBULOSA'],
    'Música': ['GUITARRA', 'TROMPETA', 'VIOLONCHELO', 'ACORDEON', 'BATERIA', 'ARMONIA', 'MELODIA', 'SINFONIA',
      'PARTITURA', 'SAXOFON', 'CLARINETE', 'PANDERETA', 'ORQUESTA', 'RITMO', 'CORCHEA', 'MAESTRO'],
    'Tecnología': ['ORDENADOR', 'TECLADO', 'PANTALLA', 'INTERNET', 'ALGORITMO', 'MEMORIA', 'SERVIDOR', 'ROBOTICA',
      'SOFTWARE', 'IMPRESORA', 'BATERIA', 'ANTENA', 'CODIGO', 'SATELITE', 'PROCESADOR', 'CONSOLA'],
    'Naturaleza': ['MONTANA', 'CASCADA', 'DESIERTO', 'GLACIAR', 'PRADERA', 'ARRECIFE', 'ACANTILADO', 'MANANTIAL',
      'TORMENTA', 'ARCOIRIS', 'BOSQUE', 'PANTANO', 'DUNA', 'LAGUNA', 'SELVA', 'MAREA'],
  };

  /* Palabras cortas y frecuentes para el juego de mecanografía. */
  const RAPIDAS = ('casa perro gato libro mesa silla verde rojo azul salto correr jugar nube sol luna mar rio '
    + 'flor arbol hoja piedra fuego agua tierra aire luz sombra tiempo hora dia noche calle plaza puente coche '
    + 'tren avion barco mano pie ojo boca nariz pelo cabeza dedo brazo pierna sonrisa risa juego meta punto nivel '
    + 'record combo turbo rayo chispa cohete estrella planeta galaxia robot dragon castillo espada escudo llave '
    + 'puerta ventana techo suelo pared campo bosque montana valle isla playa arena concha pez ave nido huevo '
    + 'miel abeja hormiga arana mariposa tigre lobo oso zorro conejo raton pajaro pluma nieve hielo lluvia viento').split(/\s+/);

  NX.LEX = {
    W5,
    TEMAS,
    RAPIDAS,
    temas() { return Object.keys(TEMAS); },
    /* Devuelve una palabra al azar de cinco letras. */
    word5(rng) { return (rng ? rng.pick(W5) : W5[Math.floor(Math.random() * W5.length)]).toUpperCase(); },
    has5(w) { return W5.indexOf(w.toLowerCase()) >= 0; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
