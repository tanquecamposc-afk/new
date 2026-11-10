import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage, computeHitDamage, heal, outsideCircle, lerpCircle, stormDamagePerTick, startPillarsRound, eliminateFromPillars, advancePillars, canRespawnReload, decreaseRebootTimer, grantCurrencyOnce, spendCurrency, earnXp, makeRng, weightedPick, findMode } from '../src/core/index.js';
import type { WeaponSpec } from '../src/core/index.js';
const weapon:WeaponSpec={id:'starter-ar',category:'ar',baseDamage:25,headshotMultiplier:1.8,magazine:30,reloadSeconds:2,shotsPerSecond:8,rangeMeters:60};
test('damage consumes shield before health, then eliminates',()=>{
 const a=applyDamage({health:100,shield:30,maxHealth:100,maxShield:100,alive:true},50);
 assert.deepEqual([a.next.shield,a.next.health,a.eliminated],[0,80,false]);
 const b=applyDamage(a.next,100);
 assert.deepEqual([b.next.health,b.next.alive,b.eliminated],[0,false,true]);
 assert.equal(applyDamage(b.next,100).eliminated,false);
});
test('headshots, distance, heal caps and invalid damage',()=>{
 assert.equal(computeHitDamage(weapon,true,20),45);
 assert.ok(computeHitDamage(weapon,false,150)<25);
 assert.equal(heal({health:95,shield:10,maxHealth:100,maxShield:100,alive:true},10,'health').health,100);
 assert.throws(()=>applyDamage({health:100,shield:0,maxHealth:100,maxShield:100,alive:true},-1));
});
test('storm geometry and fixed step damage',()=>{
 assert.equal(outsideCircle({x:10,z:0},{x:0,z:0,r:9}),true);
 assert.equal(outsideCircle({x:8,z:0},{x:0,z:0,r:9}),false);
 assert.equal(lerpCircle({x:0,z:0,r:10},{x:20,z:0,r:4},0.5).r,7);
 assert.equal(stormDamagePerTick(5,0.1),0.5);
});
test('pillars drop interval, 1 winner, duplicate elimination ignored',()=>{
 const start=startPillarsRound(['a','b','c'],5);
 const stepped=advancePillars(start,12,5);
 assert.equal(stepped.drops,2);
 const afterB=eliminateFromPillars(stepped.round,'b');
 const afterC=eliminateFromPillars(afterB,'c');
 assert.equal(afterC.winnerId,'a');
 assert.equal(afterC.roundOver,true);
 assert.equal(eliminateFromPillars(afterC,'a'),afterC);
});
test('reload respawns only while a teammate remains and before lockout',()=>{
 assert.equal(canRespawnReload({livingTeammates:1,rebootAllowedUntilSecond:500},499),true);
 assert.equal(canRespawnReload({livingTeammates:0,rebootAllowedUntilSecond:500},499),false);
 assert.equal(canRespawnReload({livingTeammates:1,rebootAllowedUntilSecond:500},500),false);
 assert.equal(decreaseRebootTimer(4,6),0);
});
test('currency grant idempotency and validation',()=>{
 const a=grantCurrencyOnce({balance:0,processedEventIds:[]},'victory-123',100);
 const b=grantCurrencyOnce(a,'victory-123',100);
 assert.equal(b.balance,100);
 assert.equal(spendCurrency(b,40).balance,60);
 assert.throws(()=>spendCurrency(b,101));
});
test('xp progress and deterministic seeded random',()=>{
 assert.deepEqual(earnXp({xp:900,level:1},200),{xp:1100,level:2});
 assert.equal(makeRng(42)(),makeRng(42)());
 assert.equal(weightedPick([{value:'only',weight:1}],makeRng(42)),'only');
});
test('mode registry preserves distinct pillars configs',()=>{
 assert.equal(findMode('pillars_nexiph')?.maxPlayers,8);
 assert.equal(findMode('pillars_nexiph')?.itemEverySeconds,5);
 assert.equal(findMode('pillars_hive')?.itemEverySeconds,6);
 assert.equal(findMode('zero_build')?.build,false);
});
