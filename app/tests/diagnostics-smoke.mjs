const mem=new Map();
globalThis.localStorage={
  getItem:k=>mem.has(k)?mem.get(k):null,
  setItem:(k,v)=>mem.set(k,String(v)),
  removeItem:k=>mem.delete(k)
};
if(typeof globalThis.navigator==='undefined'){
  Object.defineProperty(globalThis,'navigator',{value:{
    onLine:true,
    userAgent:'AWSFC diagnostic smoke',
    storage:{estimate:async()=>({usage:1024,quota:1024*1024})}
  },configurable:true});
}
const d=await import('../js/diagnostics.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

d.clearDiagnostics();
d.recordDiagnostic(
  'request-error',
  'Bearer super-secret-token access_token=very-secret-value code=oauth-code',
  {authorization:'Bearer hidden',description:'private workload text',safe:'visible'}
);
const snap=await d.diagnosticSnapshot({
  settings:{webVersion:'M4-LF2',authMode:'standalone'},
  health:{status:'healthy'},
  storage:{storage:'IndexedDB'}
});
const text=JSON.stringify(snap);
assert(snap.format==='awsfc-local-diagnostics','diagnostic format');
assert(snap.events.length===1,'diagnostic event retained');
assert(!text.includes('super-secret-token'),'bearer token must be redacted');
assert(!text.includes('very-secret-value'),'URL/token value must be redacted');
assert(!text.includes('oauth-code'),'OAuth code must be redacted');
assert(!text.includes('private workload text'),'content-like context must be redacted');
assert(text.includes('[redacted]'),'redaction marker expected');
d.clearDiagnostics();
assert(d.diagnostics().length===0,'diagnostic clear');
console.log('DIAGNOSTICS SMOKE PASS');
