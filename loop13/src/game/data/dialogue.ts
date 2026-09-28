/** Conversation selection: what each character says depends on loop, time, place and knowledge. */
import { world } from '../core/world';
import { G } from '../core/store';
import type { Line, Choice } from '../systems/Dialogue';

const has = (id: string) => G().run.clues.includes(id);
const K = (text: string): Line => ({ speaker: 'KANE', text });
const M = (text: string): Line => ({ speaker: 'MAYA', text });
const O = (text: string): Line => ({ speaker: 'THE OBSERVER', text });
const Y = (text: string): Line => ({ speaker: 'YOU', text });

export interface ConvDef { lines: Line[]; grant?: string[]; choices?: Choice[]; choiceLines?: Record<string, { lines: Line[]; grant?: string[] }>; }

export function kaneConversation(): ConvDef {
  const task = world.kane.task;
  if (G().run.ngPlus > 0 && !has('NGP_KANE')) {
    return { lines: [K('You.'), K('You broke it. I remember the light — and then 12:47. Again.'), K('Why did you come back? Why did it let you come back?')], grant: ['NGP_KANE'] };
  }
  if (has('NOT_FIRST_LOOP') && !has('KANE_ECHO')) {
    return {
      lines: [
        K('How many times now? Four thousand? I can see it in your face.'),
        Y('You know about the loops.'),
        K("I'm not really here, am I. I'm what the Core remembers of me. A route. A clock hand."),
        K('The real Jonah Kane died at 13:00 on the first day. He was standing next to the Core when it folded.'),
      ],
      grant: ['KANE_ECHO', 'KANE_REMEMBERS'],
    };
  }
  if (task === 'security' && has('SYNC_PROTOCOL') && !has('RELAY_TIMES')) {
    return {
      lines: [
        K("The relays? You shouldn't even know about… fine. Fine."),
        K('A at 12:50, in the Lab. B at 12:54, the Archives. C at 12:58, down in the Reactor.'),
        K('Same loop, or nothing holds. And the door still wants its pattern.'),
      ],
      grant: ['RELAY_TIMES', 'KANE_ROUTE'],
    };
  }
  if (task === 'security') {
    return { lines: [K('The cameras are the only honest thing in this building.'), K('If you ever get in here without me — watch the Archives. Around 12:55.')], grant: ['CAMERAS'] };
  }
  if (G().run.loop >= 5 && !has('KANE_REMEMBERS')) {
    return { lines: [K("We've had this conversation before, haven't we?"), K('…No. Forget I said that. Forgetting is easier. Ask Maya.')], grant: ['KANE_REMEMBERS', 'KANE_MET'] };
  }
  if (!has('KANE_MET')) {
    return {
      lines: [K("You're up? You should be in Medical."), K("Go back to bed, it's — what time is it? 12:4… it's always nearly one."), K("I'm Kane. Director Kane. I have somewhere to be.")],
      grant: ['KANE_MET'],
      choices: [{ id: 'orpheus', text: 'What is this place?' }, { id: 'bye', text: 'Leave him be.' }],
      choiceLines: { orpheus: { lines: [K('ORPHEUS. Temporal research. We were so close.'), K('Now we are just… punctual.')], grant: ['ORPHEUS'] } },
    };
  }
  if (has('PROJECT13') && !has('ANCHOR')) {
    return { lines: [K('You found the report.'), K('We folded the collapse into thirteen minutes. Somebody had to hold it closed from inside.'), K("Don't look at me like that. You volunteered. You just don't remember volunteering.")], grant: ['ANCHOR'] };
  }
  if (task === 'archives') {
    return { lines: [K('I keep reading the same page. Do you ever feel that?'), K('Like the words are waiting for you to finish them.')] };
  }
  if (task === 'lab') return { lines: [K('Not now. The relays won\'t hold. They never hold.')] };
  return { lines: [K("Excuse me. I'm… expected somewhere. I'm always expected somewhere.")] };
}

export function mayaConversation(): ConvDef {
  if (G().run.ngPlus > 0) {
    return { lines: [M("You're back."), M("I didn't wipe you this time. I didn't have to. You came back on your own."), M('Something outside pulled you in again. Or someone.')] };
  }
  if (has('PROJECT13') && !has('MAYA_TRUTH')) {
    return {
      lines: [
        M('So you read it.'),
        M('Yes. It\'s me. Every reset the Core suppresses you, and I make sure it takes.'),
        M('Four thousand times. I thought forgetting was mercy.'),
        M("I'm not sure anymore. You're remembering anyway. You always do, a little."),
      ],
      grant: ['MAYA_TRUTH', 'MEMORY_WIPE'],
    };
  }
  if (!has('MAYA_WARNING')) {
    return {
      lines: [M("You're awake. That's… earlier than usual."), M('Listen. Don\'t trust A-13. It was built to keep you calm, not safe.'), M("And don't tell it we spoke.")],
      grant: ['MAYA_WARNING'],
    };
  }
  if (has('CORE_ACCESS') && !has('BREAK_METHOD')) {
    return { lines: [M('If you reach the Core… shut it down. Stay.'), M('Please. Whatever is folded in there, the world outside cannot take it.'), M('…Or maybe that\'s just what I need to believe.')] };
  }
  if (has('OBSERVER_CCTV') && !has('OBSERVER_IDENTITY')) {
    return { lines: [M('You saw it on the cameras.'), M('It\'s not trying to hurt you. I think it\'s trying to teach you.'), M('Look at it. Really look.')] };
  }
  return { lines: [M("Go. You're wasting minutes. You always waste the first minutes.")] };
}

export function observerConversation(): ConvDef {
  if (G().run.ngPlus > 0) {
    return {
      lines: [O('…'), O('You broke it once. It grew back around us.'), O('Take this. I carried it out of the light.')],
      choices: [{ id: 'hand', text: 'Take its hand.' }, { id: 'gift', text: 'Take what it offers.' }],
    };
  }
  return {
    lines: [
      O("Don't run."),
      O("You're me. You've always been me. I'm what's left of every loop you forgot."),
      O('Four anchors around the Core. Wake them in my order. After the relays. Before one o\'clock.'),
      O('And remember everything. Everything. The fold cannot close around a whole memory.'),
    ],
    grant: ['BREAK_METHOD', 'OBSERVER_IDENTITY'],
    choices: [{ id: 'hand', text: 'Take its hand.' }, { id: 'no', text: 'Not yet.' }],
  };
}

export function phoneConversation(): ConvDef {
  const loop = G().run.loop;
  if (G().run.ngPlus > 0) {
    return { lines: [{ speaker: 'PHONE', text: '…hello? Is this — it is. It\'s me.' }, { speaker: 'PHONE', text: "It's 13:01 out here. It's so quiet. Why did you go back?" }], grant: ['PHONE', 'NGP_VOICE'] };
  }
  if (loop >= 6) {
    return { lines: [{ speaker: 'PHONE', text: '[static]' }, { speaker: 'PHONE', text: '…turn around.' }], grant: ['PHONE'] };
  }
  return { lines: [{ speaker: 'PHONE', text: '[static]' }, { speaker: 'PHONE', text: '…breathing. Someone is breathing on the line. Then: a click.' }], grant: ['PHONE'] };
}
