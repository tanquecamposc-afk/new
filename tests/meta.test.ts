import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSave,
  defaultSettings,
  findBindingConflicts,
  formatTicks,
  parseSave,
  recordCourseResult,
  recordSkirmishResult,
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

test('save file: version 1 is migrated, skirmish stats are validated and recorded', () => {
  // A phase 1 save keeps everything it had and gains the new fields at their defaults.
  const migrated = sanitizeSave({
    schemaVersion: 1,
    updatedAt: 99,
    settings: { locale: 'en', controls: { bindings: { jump: ['KeyJ'] } } },
    profile: { alias: 'Vieja', coursesCompleted: 4, bestCourseTicks: { training_grounds: 2862 } },
  });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.profile.alias, 'Vieja');
  assert.deepEqual(migrated.profile.bestCourseTicks, { training_grounds: 2862 });
  assert.deepEqual(migrated.profile.skirmish, { played: 0, wins: 0, eliminations: 0, bestPlacement: null });
  assert.deepEqual(migrated.profile.skirmishOptions, { bots: 5, difficulty: 'easy' });
  assert.equal(migrated.profile.lastMode, 'course');
  // Old bindings survive and the actions that did not exist yet get their defaults.
  assert.deepEqual(migrated.settings.controls.bindings.jump, ['KeyJ']);
  assert.deepEqual(migrated.settings.controls.bindings.fire, ['Mouse0']);
  assert.deepEqual(migrated.settings.controls.bindings.reload, ['KeyR']);
  assert.equal(migrated.settings.controls.toggleAim, false);

  // Tampered statistics are repaired: no more wins than matches, no impossible values.
  const tampered = sanitizeSave({
    schemaVersion: 2,
    profile: {
      skirmish: { played: 3, wins: 50, eliminations: -4, bestPlacement: 0 },
      skirmishOptions: { bots: 400, difficulty: 'impossible' },
      lastMode: 'royale',
    },
  });
  assert.deepEqual(tampered.profile.skirmish, { played: 3, wins: 3, eliminations: 0, bestPlacement: null });
  assert.deepEqual(tampered.profile.skirmishOptions, { bots: 5, difficulty: 'easy' });
  assert.equal(tampered.profile.lastMode, 'course');

  const start = defaultSave().profile;
  const lost = recordSkirmishResult(start, { placement: 4, eliminations: 2 });
  assert.deepEqual(lost.profile.skirmish, { played: 1, wins: 0, eliminations: 2, bestPlacement: 4 });
  assert.equal(lost.isBestPlacement, true);
  const won = recordSkirmishResult(lost.profile, { placement: 1, eliminations: 5 });
  assert.deepEqual(won.profile.skirmish, { played: 2, wins: 1, eliminations: 7, bestPlacement: 1 });
  const worse = recordSkirmishResult(won.profile, { placement: 6, eliminations: 0 });
  assert.deepEqual([worse.isBestPlacement, worse.profile.skirmish.bestPlacement, worse.profile.skirmish.played], [false, 1, 3]);
  assert.deepEqual(start.skirmish, { played: 0, wins: 0, eliminations: 0, bestPlacement: null }, 'the input is not mutated');
  assert.throws(() => recordSkirmishResult(start, { placement: 0, eliminations: 0 }));
  assert.throws(() => recordSkirmishResult(start, { placement: 1.5, eliminations: 0 }));
  assert.throws(() => recordSkirmishResult(start, { placement: 2, eliminations: -1 }));
  // A round trip through JSON keeps a valid save intact.
  const save = { ...defaultSave(), profile: won.profile, updatedAt: 5 };
  assert.deepEqual(parseSave(JSON.stringify(save)), save);
});

test('time formatting', () => {
  assert.equal(formatTicks(0), '00:00.00');
  assert.equal(formatTicks(60), '00:01.00');
  assert.equal(formatTicks(3725), '01:02.08');
  assert.equal(formatTicks(-5), '00:00.00');
});
