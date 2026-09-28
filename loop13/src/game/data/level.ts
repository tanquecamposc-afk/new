/**
 * ORPHEUS facility layout — the single source of truth for geometry.
 * Physics colliders, navigation grid, room culling and rendering are all
 * derived from this data. Units are metres; +x east, +z south, y up.
 */
import type { AreaId } from '../core/types';

export type Rect = [x0: number, z0: number, x1: number, z1: number];

export interface RoomDef {
  id: string;
  name: string;
  area: AreaId;
  rect: Rect;
  height: number;
  floor: 'concrete' | 'tile' | 'grate' | 'carpet' | 'lab' | 'metal';
  wall: 'panel' | 'concrete' | 'lab' | 'dark' | 'tally' | 'warm';
  lamp: string; // hex colour of ceiling lamps
  lampIntensity: number;
  lampSpacing?: number;
  corridor?: boolean;
}

export type DoorKind =
  | 'arch' | 'auto' | 'timed' | 'keypad' | 'keycard' | 'power' | 'jammed' | 'elevator' | 'core' | 'hidden';

export interface DoorDef {
  id: string;
  rooms: [string, string];
  x: number;
  z: number;
  /** 'x' → the wall runs along x (door sits in a north/south wall). */
  axis: 'x' | 'z';
  width: number;
  kind: DoorKind;
  label: string;
  height?: number;
}

export const ROOMS: RoomDef[] = [
  { id: 'HUB', name: 'Central Hub', area: 'HUB', rect: [-10, -8, 10, 8], height: 4.2, floor: 'tile', wall: 'panel', lamp: '#dfe8ff', lampIntensity: 7, lampSpacing: 5 },
  { id: 'W_CORR', name: 'West Corridor', area: 'HUB', rect: [-13, -1.5, -10, 1.5], height: 3, floor: 'concrete', wall: 'concrete', lamp: '#dfe8ff', lampIntensity: 4, corridor: true },
  { id: 'E_CORR', name: 'East Corridor', area: 'HUB', rect: [10, -1.5, 14, 1.5], height: 3, floor: 'concrete', wall: 'concrete', lamp: '#cfe0ff', lampIntensity: 4, corridor: true },
  { id: 'DORM', name: 'Dormitory', area: 'DORMITORY', rect: [-24, -7, -13, 7], height: 3.2, floor: 'carpet', wall: 'warm', lamp: '#ffd6a0', lampIntensity: 5, lampSpacing: 5 },
  { id: 'SERVICE', name: 'Service Tunnel', area: 'MAINTENANCE', rect: [-19, 7, -16, 18], height: 3, floor: 'grate', wall: 'dark', lamp: '#ffb46b', lampIntensity: 3.5, corridor: true },
  { id: 'MAINT', name: 'Maintenance Tunnels', area: 'MAINTENANCE', rect: [-19, 18, 17, 21.5], height: 3, floor: 'grate', wall: 'dark', lamp: '#ffb46b', lampIntensity: 3.5, lampSpacing: 6, corridor: true },
  { id: 'MEDICAL', name: 'Medical Bay', area: 'MEDICAL', rect: [-10, 8, -3, 18], height: 3.2, floor: 'lab', wall: 'lab', lamp: '#e6fff4', lampIntensity: 5.5, lampSpacing: 4 },
  { id: 'LAB', name: 'Laboratory', area: 'LABORATORY', rect: [-3, 8, 4, 18], height: 3.4, floor: 'lab', wall: 'lab', lamp: '#eef4ff', lampIntensity: 6, lampSpacing: 4 },
  { id: 'SECURITY', name: 'Security', area: 'SECURITY', rect: [4, 8, 10, 16], height: 3.2, floor: 'metal', wall: 'dark', lamp: '#b8ccff', lampIntensity: 3.5, lampSpacing: 4 },
  { id: 'ARCHIVES', name: 'Archives', area: 'ARCHIVES', rect: [-10, -20, -2, -8], height: 3.4, floor: 'carpet', wall: 'warm', lamp: '#ffe2b0', lampIntensity: 4, lampSpacing: 4 },
  { id: 'ELEVATOR', name: 'Main Exit', area: 'HUB', rect: [-1.5, -10.5, 1.5, -8], height: 3.2, floor: 'metal', wall: 'dark', lamp: '#ffffff', lampIntensity: 2 },
  { id: 'ANTE', name: 'Core Antechamber', area: 'TEMPORAL_CORE', rect: [3, -14, 8, -8], height: 3.4, floor: 'metal', wall: 'dark', lamp: '#9fb4ff', lampIntensity: 3.5, lampSpacing: 4 },
  { id: 'CORE', name: 'Temporal Core', area: 'TEMPORAL_CORE', rect: [-1, -32, 16, -14], height: 8, floor: 'metal', wall: 'dark', lamp: '#8a7dff', lampIntensity: 6, lampSpacing: 6 },
  { id: 'RESTRICTED', name: 'Restricted Sector', area: 'RESTRICTED', rect: [14, -8, 24, 8], height: 3.4, floor: 'metal', wall: 'panel', lamp: '#d8e2ff', lampIntensity: 4.5, lampSpacing: 4.5 },
  { id: 'RR_CORR', name: 'Reactor Access', area: 'RESTRICTED', rect: [19, 8, 22, 10], height: 3, floor: 'grate', wall: 'dark', lamp: '#ffb46b', lampIntensity: 3, corridor: true },
  { id: 'REACTOR', name: 'Reactor', area: 'REACTOR', rect: [17, 10, 31, 26], height: 6, floor: 'grate', wall: 'dark', lamp: '#ffc890', lampIntensity: 7, lampSpacing: 5.5 },
  { id: 'UNKNOWN', name: 'Sector 7', area: 'UNKNOWN', rect: [24, -6, 34, 4], height: 3, floor: 'concrete', wall: 'tally', lamp: '#ffe9c4', lampIntensity: 4, lampSpacing: 6 },
];

export const DOORS: DoorDef[] = [
  { id: 'd_hub_w', rooms: ['HUB', 'W_CORR'], x: -10, z: 0, axis: 'z', width: 2.4, kind: 'auto', label: 'DORMITORY' },
  { id: 'd_dorm', rooms: ['W_CORR', 'DORM'], x: -13, z: 0, axis: 'z', width: 2, kind: 'auto', label: 'DORMITORY' },
  { id: 'd_hub_e', rooms: ['HUB', 'E_CORR'], x: 10, z: 0, axis: 'z', width: 2.4, kind: 'auto', label: 'EAST WING' },
  { id: 'd_restricted', rooms: ['E_CORR', 'RESTRICTED'], x: 14, z: 0, axis: 'z', width: 2.2, kind: 'power', label: 'RESTRICTED SECTOR' },
  { id: 'd_archives', rooms: ['HUB', 'ARCHIVES'], x: -5.5, z: -8, axis: 'x', width: 2, kind: 'timed', label: 'ARCHIVES' },
  { id: 'd_elevator', rooms: ['HUB', 'ELEVATOR'], x: 0, z: -8, axis: 'x', width: 2.2, kind: 'elevator', label: 'MAIN EXIT' },
  { id: 'd_ante', rooms: ['HUB', 'ANTE'], x: 5.5, z: -8, axis: 'x', width: 2.2, kind: 'auto', label: 'CORE ACCESS' },
  { id: 'd_core', rooms: ['ANTE', 'CORE'], x: 5.5, z: -14, axis: 'x', width: 3, kind: 'core', label: 'TEMPORAL CORE', height: 3.2 },
  { id: 'd_medical', rooms: ['HUB', 'MEDICAL'], x: -6.5, z: 8, axis: 'x', width: 2, kind: 'auto', label: 'MEDICAL' },
  { id: 'd_lab', rooms: ['HUB', 'LAB'], x: 0.5, z: 8, axis: 'x', width: 2.2, kind: 'auto', label: 'LABORATORY' },
  { id: 'd_security', rooms: ['HUB', 'SECURITY'], x: 7, z: 8, axis: 'x', width: 1.8, kind: 'keypad', label: 'SECURITY' },
  { id: 'd_lab_maint', rooms: ['LAB', 'MAINT'], x: 2, z: 18, axis: 'x', width: 1.6, kind: 'keycard', label: 'MAINTENANCE' },
  { id: 'd_service_top', rooms: ['DORM', 'SERVICE'], x: -17.5, z: 7, axis: 'x', width: 2.4, kind: 'auto', label: 'SERVICE TUNNEL' },
  { id: 'd_service_bot', rooms: ['SERVICE', 'MAINT'], x: -17.5, z: 18, axis: 'x', width: 3, kind: 'arch', label: 'MAINTENANCE' },
  { id: 'd_reactor_w', rooms: ['MAINT', 'REACTOR'], x: 17, z: 19.75, axis: 'z', width: 2.6, kind: 'auto', label: 'REACTOR' },
  { id: 'd_rr_top', rooms: ['RESTRICTED', 'RR_CORR'], x: 20.5, z: 8, axis: 'x', width: 1.8, kind: 'jammed', label: 'REACTOR ACCESS' },
  { id: 'd_rr_bot', rooms: ['RR_CORR', 'REACTOR'], x: 20.5, z: 10, axis: 'x', width: 3, kind: 'arch', label: 'REACTOR' },
  { id: 'd_unknown', rooms: ['RESTRICTED', 'UNKNOWN'], x: 24, z: -1, axis: 'z', width: 2, kind: 'hidden', label: '???' },
];

/** Props: `rot` is quarter turns; rot 0 faces +z, 1 faces +x, 2 faces −z, 3 faces −x. */
export type PropType =
  | 'desk' | 'labBench' | 'chair' | 'serverRack' | 'shelf' | 'lockerRow' | 'locker' | 'bunk' | 'medBed'
  | 'filing' | 'medCabinet' | 'crateStack' | 'barrel' | 'generator' | 'reactor' | 'temporalCore' | 'table'
  | 'bench' | 'pillar' | 'plant' | 'fridge' | 'console' | 'coreConsole' | 'reception' | 'storage' | 'pod'
  | 'cot' | 'cart' | 'ivStand' | 'monitorStand' | 'anchor' | 'crate' | 'toolbox' | 'rug';

export interface PropDef {
  type: PropType;
  x: number;
  z: number;
  y?: number;
  rot?: number;
  room: string;
  id?: string;
  h?: number;
  variant?: number;
}

/** Collider footprint (w along x, h, d along z) per prop type, before rotation. null = no collision. */
export const PROP_SIZE: Record<PropType, [number, number, number] | null> = {
  desk: [1.6, 0.76, 0.8],
  labBench: [3.0, 0.92, 0.9],
  chair: null,
  serverRack: [0.8, 2.1, 1.0],
  shelf: [2.4, 2.2, 0.55],
  lockerRow: [2.5, 1.95, 0.5],
  locker: [0.55, 1.95, 0.5],
  bunk: [2.0, 1.75, 0.95],
  medBed: [2.1, 0.9, 1.0],
  filing: [0.5, 1.3, 0.62],
  medCabinet: [1.2, 1.9, 0.45],
  crateStack: [0.75, 1.5, 0.75],
  barrel: [0.62, 0.95, 0.62],
  generator: [2.2, 1.6, 1.0],
  reactor: [5.2, 6, 5.2],
  temporalCore: [5.4, 8, 5.4],
  table: [1.8, 0.76, 0.9],
  bench: [1.8, 0.46, 0.5],
  pillar: [0.7, 10, 0.7],
  plant: [0.5, 1.2, 0.5],
  fridge: [0.9, 1.9, 0.7],
  console: [3.2, 1.0, 0.9],
  coreConsole: [2.4, 1.1, 0.9],
  reception: [2.8, 1.1, 0.9],
  storage: [1.0, 2.2, 0.7],
  pod: [1.5, 2.6, 1.5],
  cot: [1.9, 0.45, 0.8],
  cart: [0.7, 0.9, 0.45],
  ivStand: null,
  monitorStand: null,
  anchor: [0.8, 2.6, 0.8],
  crate: [1.1, 1.1, 1.1],
  toolbox: null,
  rug: null,
};

export const PROPS: PropDef[] = [
  // ── CENTRAL HUB ─────────────────────────────────────────────
  { type: 'pillar', x: -5, z: -3, room: 'HUB', h: 4.2 },
  { type: 'pillar', x: 5, z: -3, room: 'HUB', h: 4.2 },
  { type: 'pillar', x: -5, z: 3, room: 'HUB', h: 4.2 },
  { type: 'pillar', x: 5, z: 3, room: 'HUB', h: 4.2 },
  { type: 'table', x: 0, z: 0, room: 'HUB', id: 'hub_table' },
  { type: 'chair', x: -1.25, z: 0, rot: 1, room: 'HUB' },
  { type: 'chair', x: 1.25, z: 0.2, rot: 3, room: 'HUB' },
  { type: 'reception', x: -8.2, z: -4.2, rot: 1, room: 'HUB' },
  { type: 'chair', x: -9.1, z: -4.2, rot: 1, room: 'HUB' },
  { type: 'bench', x: -3.2, z: 6.9, rot: 2, room: 'HUB' },
  { type: 'bench', x: 3.8, z: 6.9, rot: 2, room: 'HUB' },
  { type: 'plant', x: -9.2, z: 7.2, room: 'HUB' },
  { type: 'plant', x: 9.2, z: 7.2, room: 'HUB' },
  { type: 'plant', x: -9.2, z: -7.2, room: 'HUB' },
  { type: 'storage', x: 9.4, z: -6.9, rot: 3, room: 'HUB', id: 'hub_storage' },
  { type: 'crateStack', x: 8.45, z: -7.3, room: 'HUB' },
  { type: 'rug', x: 0, z: 0, room: 'HUB' },

  // ── DORMITORY ───────────────────────────────────────────────
  { type: 'bunk', x: -22.4, z: -6.25, room: 'DORM' },
  { type: 'bunk', x: -19.4, z: -6.25, room: 'DORM', id: 'kane_bunk' },
  { type: 'bunk', x: -16.4, z: -6.25, room: 'DORM' },
  { type: 'bunk', x: -22.6, z: 6.25, rot: 2, room: 'DORM', id: 'maya_bunk' },
  { type: 'bunk', x: -14.6, z: 6.25, rot: 2, room: 'DORM' },
  { type: 'lockerRow', x: -23.5, z: 0, rot: 1, room: 'DORM' },
  { type: 'locker', x: -13.5, z: -4.2, rot: 3, room: 'DORM', id: 'strange_locker' },
  { type: 'table', x: -18.5, z: 0, room: 'DORM' },
  { type: 'chair', x: -19.3, z: 0.8, rot: 2, room: 'DORM' },
  { type: 'chair', x: -17.7, z: -0.8, rot: 0, room: 'DORM' },
  { type: 'rug', x: -18.5, z: 0, room: 'DORM', variant: 1 },

  // ── MEDICAL ─────────────────────────────────────────────────
  { type: 'medBed', x: -8.65, z: 10.3, room: 'MEDICAL' },
  { type: 'medBed', x: -8.65, z: 13.3, room: 'MEDICAL', id: 'wake_bed' },
  { type: 'medBed', x: -8.65, z: 16.3, room: 'MEDICAL' },
  { type: 'monitorStand', x: -9.35, z: 11.35, room: 'MEDICAL' },
  { type: 'monitorStand', x: -9.35, z: 14.35, room: 'MEDICAL' },
  { type: 'ivStand', x: -7.3, z: 9.6, room: 'MEDICAL' },
  { type: 'ivStand', x: -7.3, z: 15.6, room: 'MEDICAL' },
  { type: 'cart', x: -7.2, z: 12.05, room: 'MEDICAL' },
  { type: 'desk', x: -3.65, z: 16.5, rot: 3, room: 'MEDICAL' },
  { type: 'chair', x: -4.5, z: 16.5, rot: 1, room: 'MEDICAL' },
  { type: 'medCabinet', x: -3.48, z: 11, rot: 3, room: 'MEDICAL' },

  // ── LABORATORY ──────────────────────────────────────────────
  { type: 'labBench', x: -1.6, z: 12, rot: 1, room: 'LAB' },
  { type: 'labBench', x: 2.4, z: 12, rot: 1, room: 'LAB' },
  { type: 'fridge', x: 3.4, z: 16.6, rot: 3, room: 'LAB' },
  { type: 'serverRack', x: -2.2, z: 17.2, room: 'LAB' },
  { type: 'chair', x: 1.4, z: 13.2, rot: 1, room: 'LAB' },

  // ── SECURITY ────────────────────────────────────────────────
  { type: 'console', x: 7, z: 15.25, rot: 2, room: 'SECURITY' },
  { type: 'chair', x: 7, z: 14.2, rot: 0, room: 'SECURITY' },
  { type: 'desk', x: 4.65, z: 10.2, rot: 1, room: 'SECURITY' },
  { type: 'lockerRow', x: 9.5, z: 11.2, rot: 3, room: 'SECURITY' },
  { type: 'serverRack', x: 4.8, z: 13.6, rot: 1, room: 'SECURITY' },

  // ── ARCHIVES ────────────────────────────────────────────────
  { type: 'shelf', x: -8.45, z: -11.5, room: 'ARCHIVES' },
  { type: 'shelf', x: -5.05, z: -11.5, room: 'ARCHIVES' },
  { type: 'shelf', x: -8.45, z: -14.5, room: 'ARCHIVES' },
  { type: 'shelf', x: -5.05, z: -14.5, room: 'ARCHIVES' },
  { type: 'shelf', x: -8.45, z: -17.5, room: 'ARCHIVES' },
  { type: 'shelf', x: -5.05, z: -17.5, room: 'ARCHIVES' },
  { type: 'desk', x: -2.65, z: -18.5, rot: 3, room: 'ARCHIVES' },
  { type: 'chair', x: -3.5, z: -18.5, rot: 1, room: 'ARCHIVES' },
  { type: 'filing', x: -9.44, z: -9.3, rot: 1, room: 'ARCHIVES' },
  { type: 'filing', x: -9.44, z: -9.95, rot: 1, room: 'ARCHIVES' },

  // ── ANTECHAMBER / CORE ──────────────────────────────────────
  { type: 'bench', x: 3.55, z: -10.5, rot: 1, room: 'ANTE' },
  { type: 'temporalCore', x: 7.5, z: -24.5, room: 'CORE' },
  { type: 'coreConsole', x: 5.5, z: -18.3, room: 'CORE' },
  { type: 'anchor', x: 2.6, z: -20.5, room: 'CORE', id: 'anchor_0' },
  { type: 'anchor', x: 12.4, z: -20.5, room: 'CORE', id: 'anchor_1' },
  { type: 'anchor', x: 12.4, z: -28.5, room: 'CORE', id: 'anchor_2' },
  { type: 'anchor', x: 2.6, z: -28.5, room: 'CORE', id: 'anchor_3' },

  // ── RESTRICTED ──────────────────────────────────────────────
  { type: 'desk', x: 20.5, z: -7.1, room: 'RESTRICTED' },
  { type: 'chair', x: 20.5, z: -6.2, rot: 2, room: 'RESTRICTED' },
  { type: 'shelf', x: 16.4, z: -7.45, room: 'RESTRICTED' },
  { type: 'pod', x: 16.1, z: 5.6, room: 'RESTRICTED', id: 'pod' },
  { type: 'serverRack', x: 22.3, z: 7.1, room: 'RESTRICTED' },
  { type: 'serverRack', x: 23.2, z: 7.1, room: 'RESTRICTED' },
  { type: 'table', x: 18.8, z: 0.5, room: 'RESTRICTED' },
  { type: 'filing', x: 23.4, z: -7.3, room: 'RESTRICTED' },

  // ── MAINTENANCE ─────────────────────────────────────────────
  { type: 'generator', x: -11, z: 20.7, room: 'MAINT', id: 'gen_0' },
  { type: 'generator', x: 9, z: 20.7, room: 'MAINT', id: 'gen_1' },
  { type: 'crate', x: -15.2, z: 20.6, room: 'MAINT' },
  { type: 'barrel', x: 13.2, z: 20.85, room: 'MAINT' },
  { type: 'barrel', x: 13.9, z: 20.8, room: 'MAINT' },
  { type: 'crate', x: -6.6, z: 20.65, room: 'MAINT', id: 'radio_crate' },
  { type: 'toolbox', x: 4.5, z: 20.9, room: 'MAINT' },
  { type: 'barrel', x: -18.4, z: 12.5, room: 'SERVICE' },
  { type: 'crate', x: -18.35, z: 9.2, room: 'SERVICE' },

  // ── REACTOR ─────────────────────────────────────────────────
  { type: 'reactor', x: 24.5, z: 18, room: 'REACTOR' },
  { type: 'generator', x: 30.25, z: 23.9, rot: 3, room: 'REACTOR', id: 'gen_2' },
  { type: 'barrel', x: 18, z: 25, room: 'REACTOR' },
  { type: 'barrel', x: 18.7, z: 25.1, room: 'REACTOR' },
  { type: 'barrel', x: 30.1, z: 11, room: 'REACTOR' },
  { type: 'desk', x: 17.65, z: 13, rot: 1, room: 'REACTOR' },
  { type: 'crate', x: 29.9, z: 14.5, room: 'REACTOR' },

  // ── SECTOR 7 ────────────────────────────────────────────────
  { type: 'cot', x: 26, z: -5.2, room: 'UNKNOWN' },
  { type: 'cot', x: 28.4, z: -5.2, room: 'UNKNOWN' },
  { type: 'cot', x: 32.8, z: 2.8, rot: 1, room: 'UNKNOWN' },
  { type: 'desk', x: 27.5, z: 3.25, rot: 2, room: 'UNKNOWN' },
  { type: 'chair', x: 31.2, z: -3.2, rot: 2, room: 'UNKNOWN' },
];

/** Dynamic, pushable crates (physics). Reset every loop. */
export const DYNAMIC_CRATES: { x: number; z: number; size: number }[] = [
  { x: 6.6, z: -4.4, size: 0.75 },
  { x: 7.5, z: -5.6, size: 0.75 },
  { x: -1.5, z: 20.3, size: 0.7 },
  { x: 28.5, z: 12.2, size: 0.75 },
];

export interface CctvDef {
  id: string;
  name: string;
  room: string;
  pos: [number, number, number];
  target: [number, number, number];
  secret?: boolean;
}

export const CCTV: CctvDef[] = [
  { id: 'CAM-01', name: 'CENTRAL HUB', room: 'HUB', pos: [9.4, 3.9, 7.5], target: [-2, 0.5, -3] },
  { id: 'CAM-02', name: 'LABORATORY', room: 'LAB', pos: [3.55, 3.1, 8.5], target: [-1, 0.6, 15] },
  { id: 'CAM-03', name: 'ARCHIVES', room: 'ARCHIVES', pos: [-2.6, 2.95, -19.45], target: [-9.7, 1.6, -18.3] },
  { id: 'CAM-04', name: 'REACTOR', room: 'REACTOR', pos: [30.4, 5.4, 10.6], target: [22, 0.5, 20] },
  { id: 'CAM-05', name: 'CORE ACCESS', room: 'ANTE', pos: [3.5, 3.1, -8.5], target: [6, 1, -13.8] },
  { id: 'CAM-06', name: 'DORMITORY', room: 'DORM', pos: [-13.5, 2.95, 6.6], target: [-20, 0.3, -4] },
  { id: 'CAM-07', name: 'MAINTENANCE', room: 'MAINT', pos: [-0.6, 2.7, 21.1], target: [-14, 0.4, 19] },
  { id: 'CAM-08', name: '▒▒▒ SECTOR 7', room: 'UNKNOWN', pos: [33.4, 2.8, 3.4], target: [27, 0.4, -3], secret: true },
];

/** Spot the player wakes up on (lying on the medical bed) and stands up at. */
export const SPAWN = { x: -7.05, z: 13.3, yaw: Math.PI / 2 };

export function roomById(id: string): RoomDef {
  const r = ROOMS.find((room) => room.id === id);
  if (!r) throw new Error(`Unknown room ${id}`);
  return r;
}

/** Returns the room containing a point (first match; rooms don't overlap). */
export function roomAt(x: number, z: number): RoomDef | undefined {
  for (const r of ROOMS) {
    const [x0, z0, x1, z1] = r.rect;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r;
  }
  return undefined;
}

/** Rooms adjacent through a door. */
export function neighbours(roomId: string): string[] {
  const out: string[] = [];
  for (const d of DOORS) {
    if (d.rooms[0] === roomId) out.push(d.rooms[1]);
    else if (d.rooms[1] === roomId) out.push(d.rooms[0]);
  }
  return out;
}

/** Ceiling lamp positions generated per room. */
export interface LampDef { id: string; room: string; x: number; y: number; z: number; color: string; intensity: number; }

export const LAMPS: LampDef[] = (() => {
  const lamps: LampDef[] = [];
  for (const r of ROOMS) {
    if (r.id === 'ELEVATOR') continue;
    const [x0, z0, x1, z1] = r.rect;
    const w = x1 - x0, d = z1 - z0;
    const sp = r.lampSpacing ?? 4.5;
    const nx = Math.max(1, Math.round(w / sp));
    const nz = Math.max(1, Math.round(d / sp));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x = x0 + (w / nx) * (i + 0.5);
        const z = z0 + (d / nz) * (j + 0.5);
        lamps.push({ id: `${r.id}_${i}_${j}`, room: r.id, x, y: r.height - 0.08, z, color: r.lamp, intensity: r.lampIntensity });
      }
    }
  }
  return lamps;
})();
