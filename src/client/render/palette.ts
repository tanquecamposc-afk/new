/**
 * Colour identity of NEXUS ROYALE: a warm golden-hour world — ink-blue zenith, peach horizon,
 * amber and turquoise accents with a touch of coral. Everything visible is generated from these
 * values; there are no imported textures or models.
 */
export const PALETTE = Object.freeze({
  ink: 0x0c1a24,
  amber: 0xffb547,
  turquoise: 0x2fd6c3,
  coral: 0xff6b5e,
  cream: 0xf4ead8,

  skyTop: 0x1d4a73,
  skyMid: 0x5fa3c4,
  skyHorizon: 0xffd2a6,
  sunDisc: 0xfff3d6,
  fog: 0xf0c9a4,

  sunLight: 0xffe0b5,
  skyLight: 0xb9d6f2,
  groundLight: 0x7a6650,

  grassA: 0x4f9a62,
  grassB: 0x79b85c,
  dirt: 0xcfae82,
  sand: 0xe0c794,
  rock: 0x7d7f90,

  concrete: 0xdcd4c6,
  wall: 0xe9dfcf,
  platform: 0xc5d0d3,
  roof: 0x3e7580,
  crate: 0xe3a94f,
  containerA: 0x2aa398,
  containerB: 0xdc6a55,
  pillar: 0x9da3b1,
  ramp: 0xcbc3b3,
  stone: 0x8f8b99,
  outline: 0x1a2733,

  trunk: 0x6a4a35,
  pine: 0x2f7a5b,
  pineLight: 0x58a86a,
  leaf: 0x6cb659,
  leafWarm: 0xd9a441,
  bush: 0x4f9d63,

  laneLine: 0xfdf3df,
  laneStart: 0x2fd6c3,
  laneFinish: 0xffb547,
});

/** Sun direction (from the scene toward the sun), normalised. Low sun = long golden shadows. */
export const SUN_DIRECTION = Object.freeze({ x: -0.55, y: 0.52, z: 0.65 });
