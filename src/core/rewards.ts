export interface Ledger { balance:number; processedEventIds:readonly string[] }
export function grantCurrencyOnce(ledger:Ledger,eventId:string,amount:number):Ledger {
  if(!eventId || !Number.isInteger(amount) || amount<0)throw new Error('invalid grant');
  if(ledger.processedEventIds.includes(eventId))return ledger;
  return {balance:ledger.balance+amount,processedEventIds:[...ledger.processedEventIds,eventId]};
}
export function spendCurrency(ledger:Ledger,amount:number):Ledger {
  if(!Number.isInteger(amount) || amount<0 || amount>ledger.balance)throw new Error('invalid spend');
  return {...ledger,balance:ledger.balance-amount};
}
export interface PlayerProgress { xp:number; level:number; }
/** Linear XP for demo only, replace with season versioned table later. */
export function earnXp(previous:PlayerProgress,award:number,xpPerLevel=1000):PlayerProgress {
  if(!Number.isInteger(award)||award<0||xpPerLevel<=0)throw new Error('invalid XP award');
  const total=previous.xp+award;
  return {xp:total,level:Math.floor(total/xpPerLevel)+1};
}
