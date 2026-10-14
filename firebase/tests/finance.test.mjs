import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amountToTetri,computeBalance,validMonth} from '../public/finance-math.js';
const m=[
 {month:'2026-09',amountTetri:1000},
 {month:'2026-10',amountTetri:1200},
 {month:'2026-11',amountTetri:1500}
];
const payments=[
 {id:'p1',month:'2026-09',apartment:1,amountTetri:1400},
 {id:'p2',month:'2026-10',apartment:1,amountTetri:500},
 {id:'p3',month:'2026-10',apartment:2,amountTetri:10000}
];
test('parses monetary amounts in integer tetri without rounding extra decimals',()=>{
 assert.equal(amountToTetri('12.34'),1234);
 assert.equal(amountToTetri('0.09'),9);
 assert.equal(amountToTetri('0'),0);
 assert.equal(amountToTetri('0.1'),10);
 for(const x of ['1.001','-1','3e2','NaN','','01.00'])assert.ok(Number.isNaN(amountToTetri(x)));
});
test('validates strict accounting month',()=>{
 assert.equal(validMonth('2026-10'),true);
 for(const x of ['2026-13','2026-0','October 2026','2099-00'])assert.equal(validMonth(x),false);
});
test('carries prior overpayment against the following month debt',()=>{
 const b=computeBalance(1,'2026-10',m,payments,[]);
 assert.deepEqual(b,{opening:-400,dueCurrent:1200,paidCurrent:500,closing:300,debt:300,credit:0});
});
test('does not include charges or payments beyond selected month',()=>{
 const b=computeBalance(1,'2026-09',m,payments,[]);
 assert.equal(b.dueCurrent,1000);assert.equal(b.paidCurrent,1400);
 assert.equal(b.closing,-400);
});
test('correcting prior month payment raises next month debt',()=>{
 const corrections=[{paymentId:'p1',month:'2026-09',apartment:1,amountTetri:-1400}];
 const b=computeBalance(1,'2026-10',m,payments,corrections);
 assert.equal(b.opening,1000);assert.equal(b.closing,1700);
});
test('correcting current month payment and replacing it is reflected correctly',()=>{
 const corrections=[{paymentId:'p2',month:'2026-10',apartment:1,amountTetri:-500}];
 const next=[...payments,{id:'p4',month:'2026-10',apartment:1,amountTetri:700}];
 const b=computeBalance(1,'2026-10',m,next,corrections);
 assert.equal(b.paidCurrent,700);assert.equal(b.closing,100);
});
test('each apartment is isolated',()=>{
 const b=computeBalance(2,'2026-10',m,payments,[]);
 assert.equal(b.paidCurrent,10000);assert.equal(b.closing,-7800);
});
test('empty history is zero',()=>{
 assert.deepEqual(computeBalance(1,'2026-10',[],[],[]),{
   opening:0,dueCurrent:0,paidCurrent:0,closing:0,debt:0,credit:0
 });
});
