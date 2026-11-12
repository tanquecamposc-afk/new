import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMMO_TYPES,
  BOT_DIFFICULTIES,
  CONSUMABLE_DEFS,
  INPUT_ACTIONS,
  WEAPON_DEFS,
  buildFiringRange,
  buildQuarryArena,
  buildTrainingGrounds,
} from '../src/core/index.js';
import { keyLabel, missingTranslations, translate } from '../src/client/app/i18n.js';

test('i18n: every key exists in both languages', () => {
  assert.deepEqual(missingTranslations(), []);
});

test('i18n: placeholders, fallbacks and key labels', () => {
  assert.equal(translate('es-PE', 'hud.checkpoint', { n: 3, total: 8, time: '00:13.72' }), 'Ancla 3/8 · 00:13.72');
  assert.equal(translate('en', 'hud.checkpoint', { n: 3, total: 8, time: '00:13.72' }), 'Anchor 3/8 · 00:13.72');
  // An unknown key is shown as-is instead of crashing the UI.
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
  assert.equal(keyLabel('KeyW', 'es-PE'), 'W');
  assert.equal(keyLabel('Space', 'es-PE'), 'Espacio');
  assert.equal(keyLabel('Space', 'en'), 'Space');
  assert.equal(keyLabel('ArrowLeft', 'en'), '←');
});

test('i18n: everything the map and the controls reference is translated', () => {
  const map = buildTrainingGrounds();
  const keys = [map.nameKey, ...map.checkpoints.map((c) => c.hintKey), ...map.labels.map((l) => l.key)];
  for (const state of ['idle', 'walk', 'sprint', 'crouch', 'slide', 'air', 'mantle']) keys.push(`state.${state}`);
  for (const key of keys) {
    for (const locale of ['es-PE', 'en'] as const) {
      assert.notEqual(translate(locale, key), key, `missing ${locale} text for ${key}`);
    }
  }
  assert.ok(INPUT_ACTIONS.length >= 10);
});

test('i18n: maps, weapons, items and modes of phase 2 are translated', () => {
  const keys: string[] = [];
  for (const map of [buildQuarryArena(), buildFiringRange()]) keys.push(map.nameKey, ...map.labels.map((label) => label.key));
  for (const weapon of Object.values(WEAPON_DEFS)) keys.push(weapon.nameKey);
  for (const item of Object.values(CONSUMABLE_DEFS)) keys.push(item.nameKey);
  for (const type of AMMO_TYPES) keys.push(`ammo.${type}`);
  for (const difficulty of BOT_DIFFICULTIES) keys.push(`difficulty.${difficulty}`);
  for (const mode of ['training', 'range', 'skirmish']) keys.push(`mode.${mode}.name`, `mode.${mode}.tag`, `mode.${mode}.description`);
  for (const key of keys) {
    for (const locale of ['es-PE', 'en'] as const) {
      assert.notEqual(translate(locale, key), key, `missing ${locale} text for ${key}`);
    }
  }
  // Mouse buttons have readable names, like keys.
  assert.equal(keyLabel('Mouse0', 'es-PE'), 'Clic izq.');
  assert.equal(keyLabel('Mouse2', 'en'), 'Right click');
  assert.equal(translate('es-PE', 'hud.pickup', { item: 'Rifle Estela' }), 'Recoger Rifle Estela');
});
