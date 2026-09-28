/** Phase/panel transitions shared by all systems. */
import { G } from '../core/store';
import type { GamePhase, Panel } from '../core/types';
import type { PanelData } from '../core/store';
import { exitPointerLock, requestPointerLock, Input } from '../core/input';
import { world } from '../core/world';
import { Audio } from '../audio/AudioEngine';

export const PLAY_PHASES: GamePhase[] = ['PLAYING', 'CHASE', 'DANGER'];
export const isPlayPhase = (p: GamePhase) => PLAY_PHASES.includes(p);

export const Flow = {
  openPanel(panel: Panel, data: PanelData = {}, phase: GamePhase = 'PUZZLE'): void {
    G().setPanel(panel, data);
    G().setPhase(phase);
    exitPointerLock();
    Input.clearPressed();
  },
  closePanel(): void {
    if (G().panel === 'cctv') world.cctv.active = false;
    G().setPanel('none');
    Flow.resume();
  },
  /** Back to free gameplay. */
  resume(): void {
    const ph = G().phase;
    if (['DEATH', 'RESET', 'ENDING', 'MENU', 'LOADING', 'CUTSCENE'].includes(ph)) return;
    G().setPhase('PLAYING');
    Input.clearPressed();
    requestPointerLock();
  },
  pause(): void {
    if (!isPlayPhase(G().phase) && G().phase !== 'PUZZLE' && G().phase !== 'DIALOGUE') return;
    G().setPanel('none');
    world.cctv.active = false;
    G().setPhase('PAUSED');
    Audio.setMuffle(true);
    exitPointerLock();
  },
  openMemory(): void {
    if (!isPlayPhase(G().phase)) return;
    G().setPanel('memory');
    G().setPhase('PAUSED');
    Audio.setMuffle(true);
    exitPointerLock();
  },
  unpause(): void {
    G().setPanel('none');
    Audio.setMuffle(false);
    G().setPhase('PLAYING');
    requestPointerLock();
  },
};
