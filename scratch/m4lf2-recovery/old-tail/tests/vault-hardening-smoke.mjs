const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
if(!globalThis.crypto)globalThis.crypto=(await import('node:crypto')).webcrypto;
if(!globalThis.btoa)globalThis.btoa=s=>Buffer.from(s,'binary').toString('base64');
if(!globalThis.atob)globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
const v=await import('../js/vault.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
await v.resetVault();
let s=await v.loadVault();assert(s.schema_version===2,'schema v2');
s.tenant={id:'tenant_test',name:'Test'};s.projects=[{id:'p1',name:'One'}];s=await v.saveVault(s);assert(s.state_revision===1,'revision increment');
const stale=JSON.parse(JSON.stringify(s)),fresh=JSON.parse(JSON.stringify(s));fresh.projects.push({id:'p2',name:'Two'});await v.saveVault(fresh);let conflict=false;try{stale.projects.push({id:'p3',name:'Three'});await v.saveVault(stale)}catch(e){conflict=e.status===409}assert(conflict,'stale write conflict');
const recBefore=await v.recoveryList();assert(recBefore.length>=1,'recovery checkpoint');
const backup=await v.exportVault();assert(backup.format_version===2&&backup.payload_sha256.length===64,'checksum backup');
const broken=JSON.parse(JSON.stringify(backup));broken.state.projects[0].name='Tampered';let tamper=false;try{await v.importVault(broken)}catch(e){tamper=/integrity/.test(e.message)}assert(tamper,'tamper detection');
const encrypted=await v.exportEncryptedVault('correct horse battery staple');assert(encrypted.format==='awsfc-local-backup-encrypted','encrypted format');await v.resetVault();let wrong=false;try{await v.importEncryptedVault(encrypted,'wrong passphrase')}catch(e){wrong=/decrypt/.test(e.message)}assert(wrong,'wrong passphrase rejection');const restored=await v.importEncryptedVault(encrypted,'correct horse battery staple');assert(restored.projects.length===2,'encrypted restore');

// Large encrypted backups used to risk a call-stack overflow when binary data
// was spread into String.fromCharCode. Exercise a payload well above that range.
let large=await v.loadVault();
large.large_test_payload='x'.repeat(750_000);
large=await v.saveVault(large);
const largeEncrypted=await v.exportEncryptedVault('large backup passphrase');
assert(largeEncrypted.ciphertext.length>500_000,'large encrypted ciphertext');
await v.resetVault();
const largeRestored=await v.importEncryptedVault(largeEncrypted,'large backup passphrase');
assert(largeRestored.large_test_payload.length===750_000,'large encrypted restore');


// Recovery history is deliberately bounded so local mutations cannot grow browser
// storage forever.
let rolling=await v.loadVault();
for(let i=0;i<12;i++){rolling.recovery_counter=i;rolling=await v.saveVault(rolling)}
const boundedRecovery=await v.recoveryList();assert(boundedRecovery.length<=8,'recovery history cap');

// If IndexedDB is unavailable and localStorage is full, fail with an actionable
// data-safety message instead of silently losing the write.
const savedSetItem=localStorage.setItem;
localStorage.setItem=()=>{const e=new Error('quota');e.name='QuotaExceededError';throw e};
let quotaMessage=false;try{const q=await v.loadVault();q.quota_probe=true;await v.saveVault(q)}catch(e){quotaMessage=/could not save the vault/.test(e.message)}finally{localStorage.setItem=savedSetItem}
assert(quotaMessage,'fallback quota error must be explicit');

const b=v.backupStatus();assert(b.last_backup_at,'backup status');
console.log('VAULT HARDENING PASS',JSON.stringify({revision:restored.state_revision,recovery:recBefore.length,backup_kind:b.last_backup_kind}));
