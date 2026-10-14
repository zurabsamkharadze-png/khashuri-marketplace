import { before, beforeEach, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment, assertFails, assertSucceeds
} from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, serverTimestamp
} from 'firebase/firestore';

let env;
const resId='residentA', otherId='residentB', chairId='chairA';
const profile=first=>({first,last:'Demo',phone:'000000000',createdAt:new Date()});

const fs=uid=>env.authenticatedContext(uid,{email_verified:true}).firestore();
const ctx=(uid,verified=false)=>env.authenticatedContext(uid,{email_verified:verified}).firestore();
const anonymous=()=>env.unauthenticatedContext().firestore();

before(async()=>{
  env=await initializeTestEnvironment({
    projectId:'demo-chveni-korpusi',
    firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
  });
});
after(async()=>{if(env)await env.cleanup()});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    const d=context.firestore();
    await setDoc(doc(d,'roles',chairId),{chairman:true});
    await setDoc(doc(d,'profiles',resId),profile('Resident'));
    await setDoc(doc(d,'profiles',otherId),profile('Other'));
    await setDoc(doc(d,'profiles',chairId),profile('Chair'));
    await setDoc(doc(d,'members',resId),{
      uid:resId,apartment:1,entrance:1,floor:2,relation:'resident',approvedAt:new Date()
    });
    await setDoc(doc(d,'units','1'),{apartment:1,entrance:1,floor:2});
  });
});

test('unauthenticated users cannot read private resident profiles',async()=>{
  await assertFails(getDoc(doc(anonymous(),'profiles',resId)));
});

test('residents can see only their own profile, chairman only associated applicants',async()=>{
  await assertSucceeds(getDoc(doc(fs(resId),'profiles',resId)));
  await assertFails(getDoc(doc(fs(otherId),'profiles',resId)));
  await assertSucceeds(getDoc(doc(fs(chairId),'profiles',resId)));
  await assertFails(getDoc(doc(fs(chairId),'profiles',otherId)));
});

test('residents cannot promote themselves to chairman',async()=>{
  await assertFails(setDoc(doc(fs(resId),'roles',resId),{chairman:true}));
  await assertFails(updateDoc(doc(fs(resId),'roles',chairId),{chairman:false}));
});

test('only verified email holders can submit their own pending apartment request',async()=>{
  const valid={
    uid:otherId,apartment:2,entrance:1,floor:2,
    relation:'resident',status:'pending',createdAt:serverTimestamp()
  };
  await assertFails(setDoc(doc(ctx(otherId,false),'applications',otherId),valid));
  await assertSucceeds(setDoc(doc(fs(otherId),'applications',otherId),valid));
  await assertFails(setDoc(doc(fs(resId),'applications','another-account'),{
    ...valid,uid:'another-account'
  }));
});

test('only chairman can list pending applications and approved member profiles',async()=>{
  await assertFails(getDocs(collection(fs(resId),'members')));
  await assertFails(getDocs(collection(fs(resId),'applications')));
  await assertSucceeds(getDocs(collection(fs(chairId),'members')));
});

test('only chairman can publish resident announcements',async()=>{
  const notice={title:'Meeting update',body:'Residents meeting Saturday',authorUid:chairId,createdAt:serverTimestamp()};
  await assertFails(addDoc(collection(fs(resId),'announcements'),notice));
  const wrote=await assertSucceeds(addDoc(collection(fs(chairId),'announcements'),notice));
  await assertSucceeds(getDoc(doc(fs(resId),'announcements',wrote.id)));
  await assertFails(getDoc(doc(ctx(otherId,true),'announcements',wrote.id)));
});

test('repair creation requires verified approved membership; only chairman can update status',async()=>{
  const ticket={
    authorUid:resId,apartment:1,title:'Broken stair light',
    details:'The light on floor 2 is broken',status:'open',
    createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  };
  await assertFails(addDoc(collection(ctx(otherId,true),'repairs'),{
    ...ticket,authorUid:otherId
  }));
  const written=await assertSucceeds(addDoc(collection(fs(resId),'repairs'),ticket));
  await assertFails(updateDoc(doc(fs(resId),'repairs',written.id),{
    status:'done',updatedAt:serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(fs(chairId),'repairs',written.id),{
    status:'progress',updatedAt:serverTimestamp()
  }));
  await assertFails(getDoc(doc(fs(otherId),'repairs',written.id)));
});

test('only chairman can change unit locations; residents cannot edit them',async()=>{
  await assertFails(setDoc(doc(fs(resId),'units','2'),{
    apartment:2,entrance:1,floor:3
  }));
  await assertSucceeds(setDoc(doc(fs(chairId),'units','2'),{
    apartment:2,entrance:1,floor:3
  }));
});

test('residents cannot change an application decision',async()=>{
  await env.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(context.firestore(),'applications',otherId),{
      uid:otherId,apartment:3,entrance:2,floor:3,
      relation:'owner',status:'pending',createdAt:new Date()
    });
  });
  await assertFails(updateDoc(doc(fs(otherId),'applications',otherId),{
    status:'approved',reviewedBy:otherId,reviewedAt:serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(fs(chairId),'applications',otherId),{
    status:'rejected',reviewedBy:chairId,reviewedAt:serverTimestamp()
  }));
});

test('a verified approved resident can read fee only, but only chairman fixes monthly charge',async()=>{
  const month='2026-10';
  const charge={month,amountTetri:1250,createdBy:chairId,createdAt:serverTimestamp()};
  await assertFails(setDoc(doc(fs(resId),'months',month),{
    ...charge,createdBy:resId
  }));
  await assertSucceeds(setDoc(doc(fs(chairId),'months',month),charge));
  await assertSucceeds(getDoc(doc(fs(resId),'months',month)));
  await assertFails(getDoc(doc(fs(otherId),'months',month)));
  await assertFails(updateDoc(doc(fs(chairId),'months',month),{amountTetri:1500}));
  await assertFails(setDoc(doc(fs(chairId),'months','2026-99'),{...charge,month:'2026-99'}));
});

test('manual receipts are immutable, private to the apartment, and chairman-only to create',async()=>{
  const p={
    apartment:1,month:'2026-10',amountTetri:950,note:'Sample paid in cash',
    createdBy:chairId,createdAt:serverTimestamp()
  };
  await assertFails(addDoc(collection(fs(resId),'payments'),{...p,createdBy:resId}));
  const saved=await assertSucceeds(addDoc(collection(fs(chairId),'payments'),p));
  await assertSucceeds(getDoc(doc(fs(resId),'payments',saved.id)));
  await assertFails(getDoc(doc(fs(otherId),'payments',saved.id)));
  await assertSucceeds(getDocs(query(collection(fs(resId),'payments'),where('apartment','==',1))));
  await assertFails(getDocs(collection(fs(resId),'payments')));
  await assertFails(updateDoc(doc(fs(chairId),'payments',saved.id),{amountTetri:100}));
  await assertFails(addDoc(collection(fs(chairId),'payments'),{
    ...p,month:'2026-99'
  }));
});

test('residents must not see other apartment receipts even if amount and month match',async()=>{
  await env.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(context.firestore(),'payments','another-flat'),{
      apartment:22,month:'2026-10',amountTetri:1500,note:'',
      createdBy:chairId,createdAt:new Date()
    });
  });
  await assertFails(getDoc(doc(fs(resId),'payments','another-flat')));
  await assertSucceeds(getDoc(doc(fs(chairId),'payments','another-flat')));
});
