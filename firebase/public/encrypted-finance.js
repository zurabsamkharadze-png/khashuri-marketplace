// Encrypted private financial archive, produced only inside the chairman's browser.
// Never transmit or persist the passphrase. Not a full Firestore database backup.
const enc=new TextEncoder();
const dec=new TextDecoder();
function b64(bytes){
 let result='';
 for(let pos=0;pos<bytes.length;pos+=8192){
   result+=String.fromCharCode(...bytes.subarray(pos,pos+8192));
 }
 return btoa(result);
}
function fromB64(value){
 const binary=atob(value);
 return Uint8Array.from(binary,char=>char.charCodeAt(0));
}
async function derive(pass,salt,iterations,cryptoEngine){
 const key=await cryptoEngine.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
 return cryptoEngine.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,
   {name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptFinanceSnapshot(data,passphrase,cryptoEngine=globalThis.crypto){
 if(typeof passphrase!=='string'||passphrase.length<14||passphrase.length>1024)
   throw Error('Passphrase must contain 14–1024 characters.');
 if(!cryptoEngine?.subtle||!cryptoEngine.getRandomValues)
   throw Error('Web Crypto is unavailable. Open the site over HTTPS.');
 const salt=cryptoEngine.getRandomValues(new Uint8Array(16));
 const iv=cryptoEngine.getRandomValues(new Uint8Array(12));
 const iterations=250000;
 const key=await derive(passphrase,salt,iterations,cryptoEngine);
 const body=enc.encode(JSON.stringify(data));
 if(body.length>12*1024*1024)throw Error('Financial archive exceeds 12 MB.');
 const cipher=new Uint8Array(await cryptoEngine.subtle.encrypt({name:'AES-GCM',iv},key,body));
 return JSON.stringify({
   format:'chveni-korpusi-finance-aes-v1',cipher:'AES-256-GCM',
   kdf:'PBKDF2-SHA256',iterations,salt:b64(salt),iv:b64(iv),
   payload:b64(cipher)
 });
}
// Verify/read an archived file locally. No automatic import into Firestore.
export async function decryptFinanceSnapshot(text,passphrase,cryptoEngine=globalThis.crypto){
 const p=JSON.parse(text);
 if(!p||p.format!=='chveni-korpusi-finance-aes-v1'||
    p.cipher!=='AES-256-GCM'||p.kdf!=='PBKDF2-SHA256'||p.iterations!==250000)
    throw Error('Unrecognized financial backup version.');
 const salt=fromB64(p.salt),iv=fromB64(p.iv),cipher=fromB64(p.payload);
 if(salt.length!==16||iv.length!==12||cipher.length<16||cipher.length>12*1024*1024+32)
   throw Error('Invalid archive structure.');
 const key=await derive(passphrase,salt,p.iterations,cryptoEngine);
 const raw=await cryptoEngine.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
 return JSON.parse(dec.decode(raw));
}
