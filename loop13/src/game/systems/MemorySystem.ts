/**
 * MEMORY: everything the player *knows*. All discovery functions are idempotent —
 * rewards can never be duplicated by double clicks, reloads, resets or menus.
 */
import { G, useGame } from '../core/store';
import { BASE_CLUE_COUNT, CLUE_BY_ID, DISCOVERIES } from '../data/clues';
import { BASE_DOC_COUNT, DOC_BY_ID } from '../data/documents';
import { ACHIEVEMENTS, SECRETS } from '../data/progress';
import { ITEMS } from '../data/items';
import type { ItemId } from '../core/types';
import { SaveSystem } from './SaveSystem';
import { CCTV, ROOMS } from '../data/level';
import { Audio } from '../audio/AudioEngine';

const add = (arr: string[], v: string) => (arr.includes(v) ? arr : [...arr, v]);

export const Memory = {
  hasClue: (id: string) => G().run.clues.includes(id),
  hasAll: (ids: string[]) => ids.every((id) => G().run.clues.includes(id)),
  hasDoc: (id: string) => G().run.docs.includes(id),
  hasFlag: (id: string) => G().run.flags.includes(id),

  discoverClue(id: string, silent = false): boolean {
    const def = CLUE_BY_ID[id];
    if (!def || Memory.hasClue(id)) return false;
    const before = unlockedDiscoveries();
    G().setRun((r) => ({ ...r, clues: add(r.clues, id) }));
    G().setProfile((p) => ({ ...p, cluesEver: add(p.cluesEver, id) }));
    if (!silent) {
      G().pushNotification({ kind: 'clue', title: `CLUE ${String(def.n).padStart(3, '0')}`, text: def.text });
      Audio.sfx('clue');
    }
    // derived knowledge
    if (Memory.hasClue('SUBJECT13') && Memory.hasClue('OBSERVER_BADGE')) Memory.discoverClue('OBSERVER_IDENTITY');
    const after = unlockedDiscoveries();
    for (const d of after) {
      if (!before.includes(d)) {
        const def2 = DISCOVERIES.find((x) => x.id === d)!;
        G().pushNotification({ kind: 'memory', title: 'MEMORY UPDATED', text: `✓ ${def2.title}` });
      }
    }
    const baseFound = G().run.clues.filter((c) => !CLUE_BY_ID[c]?.ngPlus).length;
    if (baseFound >= BASE_CLUE_COUNT) Achievements.unlock('TRUE_MEMORY');
    SaveSystem.saveSoon();
    return true;
  },

  readDocument(id: string): void {
    const def = DOC_BY_ID[id];
    if (!def) return;
    G().setPanel('document', { docId: id });
    Audio.sfx('paper');
    if (!Memory.hasDoc(id)) {
      G().setRun((r) => ({ ...r, docs: add(r.docs, id) }));
      G().setProfile((p) => ({ ...p, docsEver: add(p.docsEver, id) }));
      G().pushNotification({ kind: 'document', title: 'DOCUMENT FOUND', text: def.title });
      const baseRead = G().profile.docsEver.filter((d) => !DOC_BY_ID[d]?.ngPlus).length;
      if (baseRead >= BASE_DOC_COUNT) Achievements.unlock('ARCHIVIST');
      SaveSystem.saveSoon();
    }
    // clues are granted when the document is closed-read; grant now but after a beat so they stack nicely
    setTimeout(() => def.clues?.forEach((c) => Memory.discoverClue(c)), 600);
  },

  findSecret(id: string): boolean {
    if (G().run.secrets.includes(id)) return false;
    const def = SECRETS.find((s) => s.id === id);
    if (!def) return false;
    G().setRun((r) => ({ ...r, secrets: add(r.secrets, id) }));
    G().setProfile((p) => ({ ...p, secretsEver: add(p.secretsEver, id) }));
    G().pushNotification({ kind: 'secret', title: 'SECRET FOUND', text: def.title });
    Audio.sfx('secret');
    const base = SECRETS.filter((s) => !s.ngPlus).map((s) => s.id);
    if (base.every((s) => G().profile.secretsEver.includes(s))) Achievements.unlock('SECRETKEEPER');
    SaveSystem.saveSoon();
    return true;
  },

  visitRoom(roomId: string): void {
    if (G().run.areas.includes(roomId)) return;
    G().setRun((r) => ({ ...r, areas: add(r.areas, roomId) }));
    const room = ROOMS.find((r) => r.id === roomId);
    if (room && !room.corridor) G().pushNotification({ kind: 'info', title: 'AREA DISCOVERED', text: room.name.toUpperCase() });
    SaveSystem.saveSoon();
  },

  seeCamera(camId: string): void {
    if (G().run.camsSeen.includes(camId)) return;
    G().setRun((r) => ({ ...r, camsSeen: add(r.camsSeen, camId) }));
    const pub = CCTV.filter((c) => !c.secret).map((c) => c.id);
    if (pub.every((c) => G().run.camsSeen.includes(c))) Achievements.unlock('EYES_EVERYWHERE');
    SaveSystem.saveSoon();
  },

  noteAnomaly(id: string, label: string): void {
    useGame.getState().setHud({ anomalyUntil: performance.now() + 4000 });
    Memory.discoverClue('ANOMALIES');
    if (G().run.anomalies.includes(id)) return;
    G().setRun((r) => ({ ...r, anomalies: add(r.anomalies, id) }));
    G().pushNotification({ kind: 'info', title: 'ANOMALY RECORDED', text: label });
    SaveSystem.saveSoon();
  },

  seeMugState(state: string): void {
    if (!G().run.mugStates.includes(state)) {
      G().setRun((r) => ({ ...r, mugStates: add(r.mugStates, state) }));
    }
    if (G().run.mugStates.length >= 2) {
      Memory.discoverClue('DEJA_VU');
      Achievements.unlock('DEJA_VU');
    }
  },

  itemFound(id: ItemId): void {
    if (G().run.itemsFound.includes(id)) return;
    G().setRun((r) => ({ ...r, itemsFound: add(r.itemsFound, id) }));
    G().pushNotification({ kind: 'item', title: 'NEW ITEM', text: `${ITEMS[id].icon} ${ITEMS[id].name}` });
  },

  setFlag(id: string): boolean {
    if (Memory.hasFlag(id)) return false;
    G().setRun((r) => ({ ...r, flags: add(r.flags, id) }));
    SaveSystem.saveSoon();
    return true;
  },
};

function unlockedDiscoveries(): string[] {
  const clues = G().run.clues;
  return DISCOVERIES.filter((d) => d.requires.every((c) => clues.includes(c))).map((d) => d.id);
}

export const Achievements = {
  has: (id: string) => G().profile.achievements.includes(id),
  unlock(id: string): boolean {
    if (Achievements.has(id)) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    G().setProfile((p) => ({ ...p, achievements: add(p.achievements, id) }));
    G().pushNotification({ kind: 'achievement', title: 'ACHIEVEMENT UNLOCKED', text: def.title });
    Audio.sfx('achievement');
    SaveSystem.saveSoon();
    return true;
  },
};
