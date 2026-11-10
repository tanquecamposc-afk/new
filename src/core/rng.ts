/** Seeded random to support deterministic tests and gameplay replays; not for cryptographic operations. */
export function makeRng(seed:number):()=>number {
  let state=seed>>>0;
  return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
}
export function weightedPick<T>(items:readonly {value:T;weight:number}[],nextRandom:()=>number):T {
  if(items.length===0 || items.some(i=>i.weight<0||!Number.isFinite(i.weight)))throw new Error('invalid weights');
  const total=items.reduce((acc,i)=>acc+i.weight,0);
  if(total<=0)throw new Error('all weights zero');
  let r=nextRandom()*total;
  for (const item of items){r-=item.weight;if(r<0)return item.value;}
  return items[items.length-1]!.value;
}
