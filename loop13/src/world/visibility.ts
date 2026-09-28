/** Room-based occlusion culling: only the camera's room and rooms two doors away are drawn. */
import { DOORS, ROOMS, roomAt } from '../game/data/level';
import { view } from '../game/core/view';

const adj = new Map<string, string[]>();
for (const r of ROOMS) adj.set(r.id, []);
for (const d of DOORS) { adj.get(d.rooms[0])!.push(d.rooms[1]); adj.get(d.rooms[1])!.push(d.rooms[0]); }

export const visibleRooms = new Set<string>(ROOMS.map((r) => r.id));
let lastRoom = '';

export function updateVisibility(force = false): void {
  const room = roomAt(view.camPos.x, view.camPos.z)?.id;
  if (!room) { if (force || lastRoom !== '*') { ROOMS.forEach((r) => visibleRooms.add(r.id)); lastRoom = '*'; } return; }
  if (room === lastRoom && !force) return;
  lastRoom = room;
  visibleRooms.clear();
  const frontier = [room];
  visibleRooms.add(room);
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const r of frontier) for (const n of adj.get(r) ?? []) if (!visibleRooms.has(n)) { visibleRooms.add(n); next.push(n); }
    frontier.splice(0, frontier.length, ...next);
  }
  // long sight lines through the Hub
  if (visibleRooms.has('HUB')) ['W_CORR', 'E_CORR', 'ANTE', 'MEDICAL', 'LAB', 'SECURITY', 'ARCHIVES'].forEach((r) => visibleRooms.add(r));
}
