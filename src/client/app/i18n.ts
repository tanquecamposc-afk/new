/**
 * UI strings. Nothing visible to the player is hard-coded in components: every label comes from
 * these dictionaries (es-PE is the reference language, en is the fallback translation).
 */
import type { Locale } from '../../core/meta/settings.js';

type Dictionary = Record<string, string>;

const es: Dictionary = {
  'app.title': 'NEXUS ROYALE',
  'app.tagline': 'Corredores del Nexo',
  'app.build': 'Fase 1 · movimiento y colisiones',
  'app.localProgress': 'Progreso local: se guarda solo en este navegador.',

  'map.training_grounds': 'Campo de Pruebas',
  'mode.training.name': 'Circuito de Anclas',
  'mode.training.description': 'Recorre las 8 anclas en orden lo más rápido que puedas. Práctica en solitario, sin enemigos.',
  'mode.training.tag': 'Práctica local',

  'lobby.play': 'JUGAR',
  'lobby.settings': 'Ajustes',
  'lobby.best': 'Mejor tiempo',
  'lobby.noBest': 'Aún sin tiempo registrado',
  'lobby.runs': 'Circuitos completados',
  'lobby.controls': 'Controles',
  'lobby.roadmap': 'En desarrollo',
  'lobby.soon': 'Próximamente',
  'lobby.loading': 'Preparando el campo…',

  'roadmap.combat': 'Armas, escudo, inventario y bots',
  'roadmap.royale': 'Royale: botín, zona, construcción y victoria',
  'roadmap.modes': 'Recarga, Pilares y clasificatorias',
  'roadmap.meta': 'Taquilla, tienda, pase y misiones',
  'roadmap.creative': 'Estudio Creativo y multijugador',
  'roadmap.phase': 'Fase {n}',

  'play.clickToStart': 'Haz clic para tomar el control',
  'play.clickHint': 'El ratón controla la cámara. Pulsa Esc para liberarlo y pausar.',
  'play.dragLook': 'Sin captura de ratón: arrastra para mirar o usa las flechas.',

  'hud.anchors': 'Anclas',
  'hud.time': 'Tiempo',
  'hud.best': 'Mejor',
  'hud.speed': 'm/s',
  'hud.next': 'Siguiente ancla',
  'hud.distance': '{m} m',
  'hud.fps': 'FPS',
  'hud.help': 'Ayuda',
  'hud.waiting': 'Muévete para iniciar el cronómetro',
  'hud.checkpoint': 'Ancla {n}/{total} · {time}',
  'hud.contextLost': 'Se perdió el contexto gráfico. Recuperando…',

  'state.idle': 'Quieto',
  'state.walk': 'Caminando',
  'state.sprint': 'Esprintando',
  'state.crouch': 'Agachado',
  'state.slide': 'Deslizando',
  'state.air': 'En el aire',
  'state.mantle': 'Trepando',

  'hint.sprint': 'Esprinta por la pista hasta la primera ancla (mantén Mayús).',
  'hint.steps': 'Sube los escalones. El bordillo bajo se sube andando; el alto necesita salto.',
  'hint.mantle': 'Salta contra el contenedor y sigue avanzando para trepar al borde.',
  'hint.hill': 'Sube la colina: esta pendiente sí se puede caminar.',
  'hint.crouch': 'Cruza la puerta y agáchate (C) para entrar al túnel.',
  'hint.gap': 'Sube la rampa, esprinta y salta el hueco entre plataformas.',
  'hint.roof': 'Sube por la rampa exterior de la casa hasta la azotea.',
  'hint.anchor': 'Última ancla: escala los pilares del centro.',

  'zone.sprint': 'PISTA',
  'zone.steps': 'ESCALONES',
  'zone.crates': 'CAJAS',
  'zone.hill': 'COLINA',
  'zone.door': 'PUERTA',
  'zone.tunnel': 'TÚNEL',
  'zone.ramps': 'RAMPAS',
  'zone.house': 'CASA',
  'zone.anchor': 'ANCLA CENTRAL',
  'zone.slope': 'PENDIENTE 60°',

  'pause.title': 'Pausa',
  'pause.resume': 'Reanudar',
  'pause.restart': 'Reiniciar circuito',
  'pause.settings': 'Ajustes',
  'pause.lobby': 'Volver al lobby',

  'results.title': 'Circuito completado',
  'results.time': 'Tu tiempo',
  'results.newBest': 'Nuevo mejor tiempo',
  'results.previousBest': 'Mejor anterior',
  'results.splits': 'Parciales',
  'results.again': 'Repetir',
  'results.lobby': 'Volver al lobby',

  'settings.title': 'Ajustes',
  'settings.video': 'Vídeo',
  'settings.audio': 'Audio',
  'settings.controls': 'Controles',
  'settings.accessibility': 'Accesibilidad',
  'settings.quality': 'Calidad gráfica',
  'settings.quality.low': 'Baja',
  'settings.quality.medium': 'Media',
  'settings.quality.high': 'Alta',
  'settings.quality.epic': 'Épica',
  'settings.renderScale': 'Escala de render',
  'settings.maxFps': 'Límite de FPS',
  'settings.maxFps.unlimited': 'Sin límite',
  'settings.fov': 'Campo de visión',
  'settings.showFps': 'Mostrar FPS',
  'settings.master': 'Volumen general',
  'settings.sfx': 'Efectos',
  'settings.ambience': 'Ambiente',
  'settings.ui': 'Interfaz',
  'settings.sensitivity': 'Sensibilidad del ratón',
  'settings.invertY': 'Invertir eje vertical',
  'settings.toggleCrouch': 'Agacharse con pulsación (alternar)',
  'settings.reducedMotion': 'Reducir movimiento de cámara',
  'settings.uiScale': 'Tamaño de la interfaz',
  'settings.language': 'Idioma',
  'settings.apply': 'Aplicar',
  'settings.cancel': 'Cancelar',
  'settings.reset': 'Restablecer',
  'settings.preview': 'Los cambios se previsualizan al instante; «Aplicar» los guarda.',
  'settings.on': 'Sí',
  'settings.off': 'No',

  'controls.move': 'Moverse',
  'controls.look': 'Mirar',
  'controls.jump': 'Saltar / trepar',
  'controls.sprint': 'Esprintar',
  'controls.crouch': 'Agacharse / deslizarse',
  'controls.pause': 'Pausa',
  'controls.restart': 'Reiniciar circuito',
  'controls.help': 'Mostrar u ocultar ayuda',
  'controls.mouse': 'Ratón',
  'controls.slideTip': 'Deslizarse: agáchate mientras esprintas.',

  'error.webgl.title': 'No se pudo iniciar el motor 3D',
  'error.webgl.body': 'Este navegador o dispositivo no ofrece WebGL 2. Prueba con una versión reciente de Chrome, Edge o Firefox y con la aceleración por hardware activada.',
  'error.generic': 'Algo falló ({code}). Puedes volver al lobby y reintentar.',
};

const en: Dictionary = {
  'app.title': 'NEXUS ROYALE',
  'app.tagline': 'Runners of the Nexus',
  'app.build': 'Phase 1 · movement and collisions',
  'app.localProgress': 'Local progress: saved only in this browser.',

  'map.training_grounds': 'Proving Grounds',
  'mode.training.name': 'Anchor Circuit',
  'mode.training.description': 'Reach all 8 anchors in order as fast as you can. Solo practice, no enemies.',
  'mode.training.tag': 'Local practice',

  'lobby.play': 'PLAY',
  'lobby.settings': 'Settings',
  'lobby.best': 'Best time',
  'lobby.noBest': 'No time recorded yet',
  'lobby.runs': 'Circuits completed',
  'lobby.controls': 'Controls',
  'lobby.roadmap': 'In development',
  'lobby.soon': 'Coming soon',
  'lobby.loading': 'Preparing the grounds…',

  'roadmap.combat': 'Weapons, shield, inventory and bots',
  'roadmap.royale': 'Royale: loot, zone, building and victory',
  'roadmap.modes': 'Reload, Pillars and ranked queues',
  'roadmap.meta': 'Locker, shop, pass and quests',
  'roadmap.creative': 'Creative Studio and multiplayer',
  'roadmap.phase': 'Phase {n}',

  'play.clickToStart': 'Click to take control',
  'play.clickHint': 'The mouse controls the camera. Press Esc to release it and pause.',
  'play.dragLook': 'Mouse capture unavailable: drag to look or use the arrow keys.',

  'hud.anchors': 'Anchors',
  'hud.time': 'Time',
  'hud.best': 'Best',
  'hud.speed': 'm/s',
  'hud.next': 'Next anchor',
  'hud.distance': '{m} m',
  'hud.fps': 'FPS',
  'hud.help': 'Help',
  'hud.waiting': 'Move to start the clock',
  'hud.checkpoint': 'Anchor {n}/{total} · {time}',
  'hud.contextLost': 'Graphics context lost. Recovering…',

  'state.idle': 'Idle',
  'state.walk': 'Walking',
  'state.sprint': 'Sprinting',
  'state.crouch': 'Crouched',
  'state.slide': 'Sliding',
  'state.air': 'Airborne',
  'state.mantle': 'Climbing',

  'hint.sprint': 'Sprint down the lane to the first anchor (hold Shift).',
  'hint.steps': 'Climb the steps. The low kerb is walked up; the tall one needs a jump.',
  'hint.mantle': 'Jump against the container and keep pushing forward to climb the ledge.',
  'hint.hill': 'Go up the hill: this slope is walkable.',
  'hint.crouch': 'Go through the doorway and crouch (C) to enter the tunnel.',
  'hint.gap': 'Take the ramp, sprint and jump the gap between the decks.',
  'hint.roof': 'Use the ramp outside the house to reach the roof.',
  'hint.anchor': 'Last anchor: climb the pillars in the centre.',

  'zone.sprint': 'LANE',
  'zone.steps': 'STEPS',
  'zone.crates': 'CRATES',
  'zone.hill': 'HILL',
  'zone.door': 'DOORWAY',
  'zone.tunnel': 'TUNNEL',
  'zone.ramps': 'RAMPS',
  'zone.house': 'HOUSE',
  'zone.anchor': 'CENTRAL ANCHOR',
  'zone.slope': '60° SLOPE',

  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart circuit',
  'pause.settings': 'Settings',
  'pause.lobby': 'Back to lobby',

  'results.title': 'Circuit complete',
  'results.time': 'Your time',
  'results.newBest': 'New best time',
  'results.previousBest': 'Previous best',
  'results.splits': 'Splits',
  'results.again': 'Run again',
  'results.lobby': 'Back to lobby',

  'settings.title': 'Settings',
  'settings.video': 'Video',
  'settings.audio': 'Audio',
  'settings.controls': 'Controls',
  'settings.accessibility': 'Accessibility',
  'settings.quality': 'Graphics quality',
  'settings.quality.low': 'Low',
  'settings.quality.medium': 'Medium',
  'settings.quality.high': 'High',
  'settings.quality.epic': 'Epic',
  'settings.renderScale': 'Render scale',
  'settings.maxFps': 'FPS limit',
  'settings.maxFps.unlimited': 'Unlimited',
  'settings.fov': 'Field of view',
  'settings.showFps': 'Show FPS',
  'settings.master': 'Master volume',
  'settings.sfx': 'Effects',
  'settings.ambience': 'Ambience',
  'settings.ui': 'Interface',
  'settings.sensitivity': 'Mouse sensitivity',
  'settings.invertY': 'Invert vertical axis',
  'settings.toggleCrouch': 'Toggle crouch',
  'settings.reducedMotion': 'Reduce camera motion',
  'settings.uiScale': 'Interface size',
  'settings.language': 'Language',
  'settings.apply': 'Apply',
  'settings.cancel': 'Cancel',
  'settings.reset': 'Reset',
  'settings.preview': 'Changes preview instantly; "Apply" saves them.',
  'settings.on': 'On',
  'settings.off': 'Off',

  'controls.move': 'Move',
  'controls.look': 'Look',
  'controls.jump': 'Jump / climb',
  'controls.sprint': 'Sprint',
  'controls.crouch': 'Crouch / slide',
  'controls.pause': 'Pause',
  'controls.restart': 'Restart circuit',
  'controls.help': 'Show or hide help',
  'controls.mouse': 'Mouse',
  'controls.slideTip': 'Slide: crouch while sprinting.',

  'error.webgl.title': 'The 3D engine could not start',
  'error.webgl.body': 'This browser or device does not provide WebGL 2. Try a recent Chrome, Edge or Firefox with hardware acceleration enabled.',
  'error.generic': 'Something went wrong ({code}). You can return to the lobby and retry.',
};

const dictionaries: Record<Locale, Dictionary> = { 'es-PE': es, en };

/** Translates a key; `{name}` placeholders are replaced from `vars`. Missing keys show the key. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let text = dictionaries[locale][key] ?? es[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

/** Keys present in one language but not the other (used by a unit test to keep them in sync). */
export function missingTranslations(): string[] {
  const missing: string[] = [];
  for (const key of Object.keys(es)) if (!(key in en)) missing.push(`en:${key}`);
  for (const key of Object.keys(en)) if (!(key in es)) missing.push(`es-PE:${key}`);
  return missing;
}

const KEY_NAMES: Record<Locale, Record<string, string>> = {
  'es-PE': {
    Space: 'Espacio',
    ShiftLeft: 'Mayús',
    ShiftRight: 'Mayús der.',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl der.',
    Backspace: 'Retroceso',
    Escape: 'Esc',
    Enter: 'Intro',
  },
  en: {
    Space: 'Space',
    ShiftLeft: 'Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Right Ctrl',
    Backspace: 'Backspace',
    Escape: 'Esc',
    Enter: 'Enter',
  },
};

const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };

/** Human label for a KeyboardEvent.code. */
export function keyLabel(code: string, locale: Locale): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return KEY_NAMES[locale][code] ?? ARROWS[code] ?? code;
}
