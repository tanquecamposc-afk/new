import type { ItemId } from '../core/types';

export interface ItemDef { id: ItemId; name: string; desc: string; icon: string; }

export const ITEMS: Record<ItemId, ItemDef> = {
  flashlight: { id: 'flashlight', name: 'Flashlight', desc: 'Standard issue. The battery never seems to last. [F] to toggle.', icon: '🔦' },
  battery: { id: 'battery', name: 'Battery', desc: 'A spare cell. Recharges the flashlight when used.', icon: '🔋' },
  keycard: { id: 'keycard', name: 'Keycard', desc: 'Level 1 staff keycard. "MAINTENANCE ACCESS".', icon: '💳' },
  tool: { id: 'tool', name: 'Tool', desc: 'A heavy multi-wrench. Good for stubborn machinery and jammed doors.', icon: '🔧' },
  datadrive: { id: 'datadrive', name: 'Data Drive', desc: 'Encrypted drive labelled "A-13 / DIRECTIVES". Needs a Security terminal.', icon: '💾' },
  strangekey: { id: 'strangekey', name: 'Strange Key', desc: 'Old brass key. Tag: "DORM — 13". It is warm.', icon: '🗝' },
  medkit: { id: 'medkit', name: 'Medical Kit', desc: 'Restores health. Used automatically when needed, or from the inventory.', icon: '✚' },
  accesscard: { id: 'accesscard', name: 'Access Card', desc: 'Director-level card: "KANE, J. — ALL SECTORS". Operates the main exit.', icon: '🪪' },
  sample: { id: 'sample', name: 'Experimental Sample', desc: 'A vial of something that refracts light a few seconds late. Label: "CHRONOFLUX — 13".', icon: '🧪' },
};
