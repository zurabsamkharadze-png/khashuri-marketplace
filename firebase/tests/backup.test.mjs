import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {encryptFinanceSnapshot,decryptFinanceSnapshot} from '../public/encrypted-finance.js';

test('encrypted finance backup round-trips without exposing plain receipt notes',async()=>{
 const raw={version:1,months:[{month:'2026-10',amountTetri:1200}],
   payments:[{id:'example',apartment:3,amountTetri:500,note:'private test note'}],
   corrections:[]};
 const encrypted=await encryptFinanceSnapshot(raw,'a-long-private-passphrase-123',webcrypto);
 assert.equal(encrypted.includes('private test note'),false);
 assert.deepEqual(await decryptFinanceSnapshot(encrypted,'a-long-private-passphrase-123',webcrypto),raw);
 await assert.rejects(()=>decryptFinanceSnapshot(encrypted,'incorrect-long-password',webcrypto));
});
test('rejects short passwords or invalid archive metadata',async()=>{
 await assert.rejects(()=>encryptFinanceSnapshot({version:1},'short',webcrypto));
 await assert.rejects(()=>decryptFinanceSnapshot('{"format":"unknown"}','a-long-private-passphrase-123',webcrypto));
});
