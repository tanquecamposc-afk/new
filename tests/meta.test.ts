import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSave,
  defaultSettings,
  findBindingConflicts,
  formatTicks,
  parseSave,
  recordCourseResult,
  sanitizeSave,
  sanitizeSettings,
} from '../src/core/index.js';

test('settings: defaults are valid and survive a JSON round trip unchanged', () => {
  const defaults = defaultSettings();
  assert.deepEqual(sanitizeSettings(JSON.parse(JSON.stringify(defaults))), defaults);
  assert.deepEqual(findBindingConflicts(defaults.controls.bindings), {});
});

test('settings: garbage, wrong types and out-of-range values are repaired, never trusted', () => {
  const defaults = defaultSettings();
  for (const junk of [null, undefined, 42, 'x', [], { display: 'nope', audio: [], controls: 7 }]) {
    assert.deepEqual(sanitizeSettings(junk), defaults);
  }
  const repaired = sanitizeSettings({
    locale: 'tlh',
    display: { qualityPreset: 'ultra', renderScale: 9, maxFps: 61, fov: 500, showFps: 'yes' },
    audio: { master: -3, sfx: Number.NaN, ambience: 2, ui: 0.25 },
    controls: {
      mouseSensitivity: 1e9,
      invertY: true,
      toggleCrouch: 1,
      bindings: { jump: ['KeyJ', 'KeyJ', '<script>', 5, 'KeyK'], sprint: [], moveForward: 'KeyW', hack: ['KeyX'] },
    },
    accessibility: { reducedMotion: true, uiScale: 0.1 },
    extra: { anything: true },
  });
  assert.equal(repaired.locale, 'es-PE');
  assert.deepEqual(repaired.display, { qualityPreset: 'medium', renderScale: 1, maxFps: 60, fov: 100, showFps: false });
  assert.deepEqual(repaired.audio, { master: 0, sfx: 0.9, ambience: 1, ui: 0.25 });
  assert.equal(repaired.controls.mouseSensitivity, 3);
  assert.equal(repaired.controls.invertY, true);
  assert.equal(repaired.controls.toggleCrouch, false);
  assert.deepEqual(repaired.controls.bindings.jump, ['KeyJ', 'KeyK']);
  assert.deepEqual(repaired.controls.bindings.sprint, defaults.controls.bindings.sprint, 'an empty binding list falls back');
  assert.deepEqual(repaired.controls.bindings.moveForward, ['KeyW']);
  assert.equal('hack' in repaired.controls.bindings, false);
  assert.equal('extra' in repaired, false);
  assert.deepEqual(repaired.accessibility, { reducedMotion: true, uiScale: 0.8 });
});

test('settings: binding conflicts are reported per key', () => {
  const settings = defaultSettings();
  settings.controls.bindings.help = ['KeyC'];
  assert.deepEqual(findBindingConflicts(settings.controls.bindings), { KeyC: ['crouch', 'help'] });
});

test('save file: malformed or foreign data starts fresh, valid data is preserved', () => {
  assert.deepEqual(parseSave(null), defaultSave());
  assert.deepEqual(parseSave('{not json'), defaultSave());
  assert.deepEqual(parseSave('[]'), defaultSave());
  assert.deepEqual(sanitizeSave({ schemaVersion: 99, profile: { alias: 'Future' } }), defaultSave());

  const loaded = parseSave(
    JSON.stringify({
      schemaVersion: 1,
      updatedAt: 1234,
      settings: { locale: 'en', display: { fov: 90 } },
      profile: {
        alias: '  <b>Ráfaga_7</b>  ',
        coursesCompleted: 3,
        bestCourseTicks: { training_grounds: 2500, 'bad id!': 10, negative: -5, huge: 1e12, float: 12.5 },
      },
    }),
  );
  assert.equal(loaded.updatedAt, 1234);
  assert.equal(loaded.settings.locale, 'en');
  assert.equal(loaded.settings.display.fov, 90);
  assert.equal(loaded.settings.display.qualityPreset, 'medium', 'missing fields are filled with defaults');
  assert.equal(loaded.profile.alias, 'bRáfaga_7b');
  assert.equal(loaded.profile.coursesCompleted, 3);
  assert.deepEqual(loaded.profile.bestCourseTicks, { training_grounds: 2500 });
});

test('course records: only a faster time replaces the best, every finish is counted', () => {
  const start = defaultSave().profile;
  const first = recordCourseResult(start, 'training_grounds', 3000);
  assert.deepEqual([first.isNewBest, first.previousBestTicks, first.profile.bestCourseTicks['training_grounds']], [true, null, 3000]);
  const slower = recordCourseResult(first.profile, 'training_grounds', 3400);
  assert.deepEqual([slower.isNewBest, slower.previousBestTicks, slower.profile.bestCourseTicks['training_grounds']], [false, 3000, 3000]);
  const faster = recordCourseResult(slower.profile, 'training_grounds', 2800);
  assert.deepEqual([faster.isNewBest, faster.profile.bestCourseTicks['training_grounds'], faster.profile.coursesCompleted], [true, 2800, 3]);
  // The input profile is not mutated.
  assert.deepEqual(start.bestCourseTicks, {});
  assert.throws(() => recordCourseResult(start, 'training_grounds', 0));
  assert.throws(() => recordCourseResult(start, 'training_grounds', 1.5));
  assert.throws(() => recordCourseResult(start, '../etc', 100));
});

test('time formatting', () => {
  assert.equal(formatTicks(0), '00:00.00');
  assert.equal(formatTicks(60), '00:01.00');
  assert.equal(formatTicks(3725), '01:02.08');
  assert.equal(formatTicks(-5), '00:00.00');
});
