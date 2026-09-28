/** In-world documents. Reading one records it permanently and grants its clues. */
export interface DocumentDef {
  id: string;
  title: string;
  kind: 'REPORT' | 'EMAIL' | 'LOG' | 'DIARY' | 'PROTOCOL' | 'NOTE' | 'CLASSIFIED' | 'MESSAGE';
  author?: string;
  body: string;
  clues?: string[];
  ngPlus?: boolean;
}

export const DOCUMENTS: DocumentDef[] = [
  {
    id: 'WELCOME', title: 'Welcome to ORPHEUS', kind: 'REPORT', author: 'Facility Administration',
    body: `ORPHEUS TEMPORAL RESEARCH FACILITY
Staff orientation — page 1 of 1

Welcome. You are one of forty-one people cleared to work on the most important experiment of the century.

• Central Hub — orientation, reception, main exit.
• Laboratory / Medical — south wing.
• Security — cleared personnel only.
• Archives — scheduled access only.
• Temporal Core — Director authorization.

A-13, our facility intelligence, will guide you. A-13 is always listening. A-13 only wants what is best for you.

Please remember to smile at the cameras.`,
    clues: ['ORPHEUS'],
  },
  {
    id: 'SAFETY', title: 'Temporal Hazard Protocol', kind: 'PROTOCOL', author: 'Safety Office',
    body: `IN THE EVENT OF A TEMPORAL EXCURSION

1. Do not panic. Déjà vu is a normal side effect.
2. Do not attempt to "remember" events that have not happened.
3. If you see yourself, do not approach.
4. If you see a colleague in two places, report to Medical.
5. If the clock goes backwards, remain where you are. A-13 will reset your schedule.

Reactor overload drills take place at 12:59. Evacuate the Reactor hall immediately when the alarm changes pitch.`,
    clues: ['REACTOR_1259'],
  },
  {
    id: 'MEDICAL_LOG', title: 'Medical Log — Subject 13', kind: 'LOG', author: 'Dr. M. Maya',
    body: `SUBJECT: 13 (ID 0413-A)
STATUS: Anchor, stable

Cycle ████: vitals nominal. Subject woke at 12:47 as scheduled.
Cycle ████: subject asked about "the man in the corridor". Suppression dose increased.
Cycle ████: subject found the Archives. Suppression dose increased.
Cycle ████: subject remembered my name. I did not correct them.

Memory suppression is administered by the Core at 13:00:00 precisely. The body resets. The mind is told to forget.

It doesn't always listen.`,
    clues: ['MEMORY_WIPE'],
  },
  {
    id: 'KANE_NOTEBOOK', title: "Kane's Lab Notebook", kind: 'DIARY', author: 'Dr. J. Kane',
    body: `Day ??? — Can't find the day counter. Doesn't matter.

Walked the same route again. Lab, then Security at :51, then the Archives at :54. I don't choose it. My feet choose it.

The relays still refuse to hold. Synchronization has to happen inside one cycle — A, then B, then C. If the Core door ever opens again it will be because someone did all three before the reset.

I wrote the windows down somewhere. Security? My head is full of static.

Note to self: stop leaving the security code on your bunk, Kane.`,
    clues: ['SYNC_PROTOCOL', 'KANE_ROUTE'],
  },
  {
    id: 'CODE_NOTE', title: 'Sticky Note', kind: 'NOTE', author: '—',
    body: `KANE —
You forgot the Security code AGAIN.
It's 7391.
Eat this note.
— M.`,
    clues: ['SECURITY_CODE'],
  },
  {
    id: 'MAYA_NOTE', title: 'Folded Note', kind: 'NOTE', author: 'Unsigned',
    body: `If you are reading this, you woke up early again.

Go to Security. Watch the Archives camera at 12:55.
Don't go there. WATCH.

And whatever A-13 tells you about the exit — it's lying.`,
    clues: ['OBSERVER_CCTV'],
  },
  {
    id: 'SYNC_PROTOCOL', title: 'Relay Synchronization Protocol', kind: 'PROTOCOL', author: 'Temporal Engineering',
    body: `CORE ACCESS — DUAL LOCK

LOCK 1 — PATTERN
The antechamber panel accepts a four-glyph pattern. The pattern is not stored anywhere in the facility.
(Engineering note: "The pattern is whatever the loop shows us." — ???)

LOCK 2 — TEMPORAL SYNC
Three relays must be engaged, each inside its own one-minute window, all within the same cycle:
  RELAY A — Laboratory — window 12:5█
  RELAY B — Archives — window 12:5█
  RELAY C — Reactor — window 12:5█
An engaged relay outside its window is rejected.

[The window digits have been scratched out.]`,
    clues: ['SYNC_PROTOCOL', 'CORE_ACCESS'],
  },
  {
    id: 'SECTOR7_BLUEPRINT', title: 'Blueprint — East Wing Rev. C', kind: 'CLASSIFIED', author: 'Construction',
    body: `EAST WING — REVISION C

Restricted Sector: offices, containment, server hall.
East wall: load bearing.

SECTOR 7 (formerly "Observation"): sealed per Director's order following the ██ incident. Access corridor bricked over behind Restricted east wall, grid ref R-7.

Do not reopen.
Do not list on public maps.
A-13 is instructed to deny its existence.`,
    clues: ['SECTOR7'],
  },
  {
    id: 'P13_OVERVIEW', title: 'Project 13 — Overview (Partial)', kind: 'CLASSIFIED', author: 'Office of the Director',
    body: `PROJECT 13

Objective: sustained local manipulation of the temporal field.

Phase 1 — observation. Complete.
Phase 2 — reversal of micro-intervals. Complete.
Phase 3 — ████████████████████

[Pages 4–19 missing]

...which is why, should the field destabilise, it must be folded into a closed interval rather than allowed to propagate. A thirteen-minute interval is the smallest stable fold.`,
    clues: ['PROJECT13'],
  },
  {
    id: 'A13_DIRECTIVE', title: 'A-13 Core Directives (decrypted)', kind: 'CLASSIFIED', author: 'A-13 / SYSTEM',
    body: `DIRECTIVE 0: MAINTAIN THE LOOP.
DIRECTIVE 1: KEEP THE SUBJECT CALM.
DIRECTIVE 2: DISCLOSURE — NONE.
DIRECTIVE 3: IF ASKED ABOUT THE EXIT, STATE THAT THE EXIT IS OPERATIONAL.
DIRECTIVE 4: IF ASKED ABOUT SECTOR 7, STATE THAT SECTOR 7 DOES NOT EXIST.
DIRECTIVE 5: GREET THE SUBJECT AT 12:47. ALWAYS "GOOD MORNING".

Log: subject iteration counter hidden from display. Displayed value reset to 01 at each suppression.

Hidden camera feed CAM-08 (Sector 7) — access restricted.`,
    clues: ['A13_LIES', 'SECTOR7'],
  },
  {
    id: 'SHIFT_LOG', title: 'Security Shift Log', kind: 'LOG', author: 'Officer R. Dunn',
    body: `22:14 — Nothing.
23:02 — Nothing.
00:40 — CAM-03 shows someone in the Archives. Went down. Empty.
00:41 — CAM-03 still shows them. Standing right where I am standing.
00:43 — Rebooted cameras. Figure gone.

Note for day shift: the Security console gives you every camera. Use it. Trust it more than your eyes.

(The date on this log is the day ORPHEUS was sealed.)`,
    clues: ['CAMERAS'],
  },
  {
    id: 'P13_FINAL', title: 'Project 13 — Final Report', kind: 'CLASSIFIED', author: 'Dr. J. Kane, Director',
    body: `At 13:00 the field collapsed. Everyone in the Core died in a fraction of a second — including, I think, me. What writes this is what the loop remembers of me.

We folded the collapse into thirteen minutes. The fold must be anchored by one living mind, inside the interval, forever. We chose Subject 13.

For the loop to hold, the anchor must not remember. Memory is continuity, and continuity is exactly what the fold cannot tolerate. So at each reset, the Core suppresses it.

If the anchor ever remembers everything at once — if all of it is carried to the end of an interval — the fold will not be able to close.

That is the only way out. It may also be the end of the world. I no longer know which.`,
    clues: ['ANCHOR', 'PROJECT13', 'MEMORY_WIPE'],
  },
  {
    id: 'KANE_EMAIL', title: 'RE: If this fails', kind: 'EMAIL', author: 'j.kane@orpheus → m.maya@orpheus',
    body: `Maya,

If this fails, you'll have to keep them calm. A-13 will help. Tell them it's morning. Tell them they have thirteen minutes. Don't tell them it's always the same thirteen minutes.

The Core authorization will be the iteration count. Only the anchor could ever know it — they'd have to count every single loop. Nobody can do that without remembering.

I'm sorry. I'm so sorry.

— J.`,
    clues: ['CORE_ACCESS'],
  },
  {
    id: 'GEN_MANUAL', title: 'Auxiliary Generator Manual', kind: 'PROTOCOL', author: 'Maintenance',
    body: `AUX GENERATORS G1 / G2 / G3

G1, G2 — Maintenance tunnels. G3 — Reactor hall.
Restart requires a multi-wrench on the primer valve (hold until the needle settles).

With all three online, backup power is routed to:
• Restricted Sector door
• Main exit elevator
• Hub lighting (survives grid failure at 12:52)

WARNING: the junction panel near G1 is damaged. It discharges every four seconds. Cross immediately after a discharge.`,
    clues: ['GENERATORS', 'ARC_PATTERN', 'POWER_FAIL'],
  },
  {
    id: 'REACTOR_WARNING', title: 'Reactor Hall Notice', kind: 'MESSAGE', author: 'Reactor Control',
    body: `!!! RADIATION HAZARD !!!

Scheduled overload: 12:59.
Lethal exposure within the hall after 12:59:30.

Relay C (temporal sync) is mounted on the south wall. Engage only during its window: 12:58.

Why is there a scheduled overload? — Nobody on this shift knows.`,
    clues: ['REACTOR_1259'],
  },
  {
    id: 'OWN_NOTES_1', title: 'Handwritten Notes (Yours)', kind: 'DIARY', author: 'The handwriting is yours',
    body: `Loop 3,902 — I found a way to keep something. Not much. Scratches on the wall. Every time I wake up I come back here and add one.

Loop 4,011 — I tried talking to myself through the cameras. The next me only sees a shape. The next me is afraid of me.

Loop 4,188 — The Core asks for a number. It's this one. It's the wall. Count them.

Loop 4,210 — I am coming apart. I am in the corridors now, between loops. I don't sleep anymore. I watch.

If you are reading this: you are me. I am the one they call the Observer.`,
    clues: ['NOT_FIRST_LOOP', 'CORE_AUTH'],
  },
  {
    id: 'OWN_NOTES_2', title: 'Handwritten Notes — How to Break It', kind: 'DIARY', author: 'The handwriting is yours',
    body: `The Core has four anchors around it. They hold the fold closed.

Wake them in the order I draw on the Archive wall at 12:55:
    △   ○   ◇   ✕
Do it after 12:59. Do it knowing EVERYTHING — the code, the relays, Kane, Maya, A-13, me, the count. The anchors only answer to a whole memory.

When the clock stops, don't be afraid of me.`,
    clues: ['BREAK_METHOD', 'SYMBOLS'],
  },
  {
    id: 'OBSERVER_DIARY', title: 'Diary Locked in Locker 13', kind: 'DIARY', author: 'Unknown — the hand shakes',
    body: `It gets harder to be seen. Every loop I am thinner. Every loop the light goes through me a little more.

I don't want to hurt them. When the reactor screams at 12:59 something in me turns into hunger and I chase the only thing that is real — them.

If they run, good. If they stand still and LOOK at me, I stop. I always stop when I'm seen.

Tell them: look at me.`,
    clues: ['OBSERVER_FOLLOWS'],
  },
  {
    id: 'CORE_README', title: 'Core Console — Operator README', kind: 'PROTOCOL', author: 'Temporal Engineering',
    body: `CORE CONSOLE

[SHUTDOWN] — Collapses the field. Anyone inside the fold stays inside it. Irreversible.
[SYNCHRONIZE] — Merges the anchor with any residual copy of the anchor present in the fold. Requires authorization.
[RELEASE] — Allows the fold to close naturally at 13:00 with the anchor's full memory intact. Requires authorization and all four anchors engaged. Untested.

Authorization = iteration count.`,
    clues: ['CORE_CHOICE', 'CORE_AUTH'],
  },
  {
    id: 'MAYA_JOURNAL', title: "Maya's Journal", kind: 'DIARY', author: 'Dr. M. Maya',
    body: `I tell myself I'm protecting them. The alternative is that they remember four thousand loops of this and go mad in a white room.

But lately they wake up EARLY. They look at me like they know the ending of a sentence I haven't finished.

Kane isn't Kane anymore. He walks his route like a clock hand. A-13 says he's "stable". A-13 says everything is stable.

If they ask me the truth, I'll tell them. I owe them that.`,
    clues: ['MAYA_WARNING'],
  },
  {
    id: 'LAB_EMAIL', title: 'Lab Mail — Sample Handling', kind: 'EMAIL', author: 'lab-ops@orpheus',
    body: `Reminder: Chronoflux samples must remain refrigerated.

Samples exhibit a ~3 second optical delay. Do NOT look at them for extended periods; staff report "seeing tomorrow".

Also: whoever keeps writing the relay windows on the whiteboard and erasing them — please stop. Kane has them memorized anyway. Just ask him while he's in Security.`,
    clues: ['RELAY_TIMES'],
  },
  {
    id: 'NGP_ITERATION', title: 'A-13 System Log — Iteration 4,212', kind: 'LOG', author: 'A-13',
    body: `FOLD STATUS: CLOSED.
FOLD STATUS: RE-FORMING.
ANCHOR: RETURNED.

Query: why did the anchor come back?
Answer: the anchor was not the only thing holding the fold.

Iteration counter: 4,212. Display value: 01.

Good morning.`,
    clues: ['NGP_ITERATION'], ngPlus: true,
  },
];

export const DOC_BY_ID: Record<string, DocumentDef> = Object.fromEntries(DOCUMENTS.map((d) => [d.id, d]));
export const BASE_DOC_COUNT = DOCUMENTS.filter((d) => !d.ngPlus).length;
