# Especificación de físicas

Valores de diseño propios para una sensación arcade; **no** son afirmaciones sobre
la física exacta de ningún juego comercial. Todos son editables en
`scripts/physics/physics_config.gd` (`PhysicsConfig`).

## Mundo
| Parámetro | Valor |
|---|---|
| Tick | 120 Hz fijo |
| Gravedad | 6,5 m/s² |
| Estadio | 82 × 102,4 × 20,44 m; esquinas verticales r = 11 m; transición suelo-pared r = 3 m |
| Portería | 17,86 m de ancho × 6,43 m de alto × 8,8 m de fondo |

## Coche
| Parámetro | Valor |
|---|---|
| Masa | 180 kg; inercia/masa (cabeceo, guiñada, alabeo) = 0,127 / 0,175 / 0,07 m² |
| Hitbox | 0,84 × 0,36 × 1,18 m, desplazado 0,2 m arriba y 0,14 m adelante |
| Suspensión | 4 rayos, reposo 0,17 m, máx. 0,32 m, k = 156 s⁻², amortiguación 12 s⁻¹ |
| Adherencia | 3,25 m/s² hacia la superficie (permite paredes y techo) |
| Acelerador | 16 m/s² a 0 → 1,6 m/s² a 14 m/s → 0 a 14,1 m/s |
| Freno / inercia | 35 / 5,25 m/s² |
| Turbo | +9,92 m/s², consumo 33,3 /s, inicio 33 |
| Velocidad máx. / supersónico | 23 / 22 m/s (sale < 21) |
| Curvatura de giro | 0,69 m⁻¹ a 0 m/s → 0,088 m⁻¹ a 23 m/s |
| Fricción lateral | 30 s⁻¹ (derrape: 1,6 s⁻¹, giro ×1,35) |
| Salto | impulso 2,92 m/s + 14,58 m/s² mientras se mantiene (máx. 0,2 s) |
| Doble salto | 2,92 m/s, ventana 1,45 s |
| Esquive | 5,0 m/s (atrás 5,33), lateral escala con la velocidad, rotación 5,5 rad/s durante 0,65 s, amortigua la subida 0,15 s |
| Control aéreo | par 12,46 / 9,11 / 38,34 rad/s²; amortiguación 2,80 / 1,89 / 4,47 s⁻¹; ω máx. 5,5 rad/s |

## Balón
| Parámetro | Valor |
|---|---|
| Radio / masa | 0,9125 m / 30 kg |
| Restitución | 0,6 (0 si la velocidad normal < 0,6 m/s → reposo estable) |
| Fricción de contacto | 0,35 (acopla giro y traslación) |
| Arrastre | 0,03 s⁻¹ |
| Velocidad máx. / ω máx. | 60 m/s / 6 rad/s |

## Interacción coche–balón
1. Impulso rígido (restitución 0) con la inercia del coche.
2. Impulso extra en un solo toque por contacto (2 ticks de enfriamiento):
   dirección = (balón − coche) con la componente vertical local × 0,35;
   magnitud = velocidad relativa × (0,65 hasta 23 m/s → 0,55 a 46 m/s).

## Mecánicas emergentes (no son animaciones)
- **Aéreos rápidos:** salto mantenido + doble salto + turbo con morro arriba.
- **Half-flip:** esquive hacia atrás + cancelación (empujar hacia delante) + giro aéreo.
- **Wave dash:** esquive justo antes de aterrizar (la aterrizada mata la vertical, la horizontal se conserva).
- **Flip reset:** ≥ 3 ruedas a ≤ 0,42 m del balón en el aire restauran el esquive.
- **Paredes/techo:** adherencia + alineación por normal media de contacto.
- **Tortuga:** saltar apoyado sobre el techo del coche lo vuelve a poner de pie.

## Depuración
`F3` en partida muestra posición, velocidad, aceleración, ω local, contactos,
fuerza de suspensión, distancias por rueda, estado de salto/esquive/flip reset,
turbo, colisión de carrocería y tiempos de frame y de tick de física.
