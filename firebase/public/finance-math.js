// Integer tetri accounting. No browser globals or backend dependencies.
// A correction reverses exactly one prior payment; originals stay immutable.
export const validMonth = x => /^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(String(x));
export function amountToTetri(value) {
  const text=String(value??'').trim();
  if(!/^(0|[1-9][0-9]{0,6})(?:\.[0-9]{1,2})?$/.test(text))return NaN;
  const [lari,kop='']=text.split('.');
  const number=Number(lari)*100+Number(kop.padEnd(2,'0'));
  return Number.isSafeInteger(number)?number:NaN;
}
const safeAmount = value => Number.isSafeInteger(value)?value:0;
export function computeBalance(apartment,selectedMonth,months=[],payments=[],corrections=[]) {
  const previous=key=>key<selectedMonth;
  const included=key=>key<=selectedMonth;
  const fee=(months||[]).filter(m=>validMonth(m.month)&&included(m.month)).reduce(
    (sum,m)=>sum+safeAmount(m.amountTetri),0);
  const dueCurrent=(months||[]).filter(m=>m.month===selectedMonth).reduce(
    (sum,m)=>sum+safeAmount(m.amountTetri),0);
  const monthlyPayments=(payments||[]).filter(p=>p.apartment===apartment&&p.month===selectedMonth).reduce(
    (sum,p)=>sum+safeAmount(p.amountTetri),0);
  const monthlyReversals=(corrections||[]).filter(c=>c.apartment===apartment&&c.month===selectedMonth).reduce(
    (sum,c)=>sum+safeAmount(c.amountTetri),0);
  const historicalPayments=(payments||[]).filter(p=>p.apartment===apartment&&previous(p.month)).reduce(
    (sum,p)=>sum+safeAmount(p.amountTetri),0);
  const historicalReversals=(corrections||[]).filter(c=>c.apartment===apartment&&previous(c.month)).reduce(
    (sum,c)=>sum+safeAmount(c.amountTetri),0);
  const previousDues=(months||[]).filter(m=>validMonth(m.month)&&previous(m.month)).reduce(
    (sum,m)=>sum+safeAmount(m.amountTetri),0);
  const opening=previousDues-historicalPayments-historicalReversals;
  const paidCurrent=monthlyPayments+monthlyReversals;
  const closing=fee-historicalPayments-historicalReversals-paidCurrent;
  return {opening,dueCurrent,paidCurrent,closing,debt:Math.max(0,closing),credit:Math.max(0,-closing)};
}
