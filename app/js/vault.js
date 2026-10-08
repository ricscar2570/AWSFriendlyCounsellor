// Local-first persistence layer. IndexedDB is primary; localStorage is a fallback
// for restricted environments and Node-based smoke tests.
const DB_NAME='awsfc-local-vault';
const DB_VERSION=1;
const STORE='kv';
const STATE_KEY='state';
const FALLBACK_KEY='awsfc.standalone.v1';
const LEGACY_DEMO_KEY='awsfc.demo.v2';

export function emptyVault(){return {
  schema_version:1,
  created_at:new Date().toISOString(),
  updated_at:new Date().toISOString(),
  tenant:null,
  memberships:[],
  projects:[],
  analyses:{},
  audit:[],
  accountEstimates:{},
  accountEstimateRevisions:{},
  actualCosts:{},
  actualCostRevisions:{},
  privacyRequests:[],
  pricingCatalog:{version:'awsfc-embedded-pricing-2026-10-08',source:'embedded_snapshot',currency:'USD',updated_at:'2026-10-08T00:00:00Z',rates:{lambda:.0000023,'api-gateway':.000001,dynamodb:.00000075,s3:.023,cloudfront:.000001,cognito:.0055,cloudwatch:.5,waf:.0000006,sqs:.0000004,eventbridge:.000001,ses:.0001},region_multipliers:{'us-east-1':1,'eu-west-1':1.08,'eu-central-1':1.1,'ap-southeast-1':1.16}}
};}
function normalize(v){const base=emptyVault(), x=(v&&typeof v==='object')?v:{};return {...base,...x,schema_version:1,updated_at:x.updated_at||base.updated_at,memberships:Array.isArray(x.memberships)?x.memberships:[],projects:Array.isArray(x.projects)?x.projects:[],analyses:x.analyses&&typeof x.analyses==='object'?x.analyses:{},audit:Array.isArray(x.audit)?x.audit:[],accountEstimates:x.accountEstimates&&typeof x.accountEstimates==='object'?x.accountEstimates:{},accountEstimateRevisions:x.accountEstimateRevisions&&typeof x.accountEstimateRevisions==='object'?x.accountEstimateRevisions:{},actualCosts:x.actualCosts&&typeof x.actualCosts==='object'?x.actualCosts:{},actualCostRevisions:x.actualCostRevisions&&typeof x.actualCostRevisions==='object'?x.actualCostRevisions:{},privacyRequests:Array.isArray(x.privacyRequests)?x.privacyRequests:[]};}
function fallbackRead(){try{const raw=localStorage.getItem(FALLBACK_KEY)||localStorage.getItem(LEGACY_DEMO_KEY);return raw?normalize(JSON.parse(raw)):emptyVault()}catch{return emptyVault()}}
function fallbackWrite(state){const value=normalize({...state,updated_at:new Date().toISOString()});localStorage.setItem(FALLBACK_KEY,JSON.stringify(value));return value}
function canUseIndexedDB(){return typeof indexedDB!=='undefined'&&indexedDB&&typeof indexedDB.open==='function'}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'))})}
async function idbGet(){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(STATE_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{db.close()}}
async function idbPut(value){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,STATE_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'))})}finally{db.close()}}
async function idbDelete(){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(STATE_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}}

export async function loadVault(){if(!canUseIndexedDB())return fallbackRead();try{let state=await idbGet();if(!state){state=fallbackRead();await idbPut(state)}return normalize(state)}catch{return fallbackRead()}}
export async function saveVault(state){const value=normalize({...state,updated_at:new Date().toISOString()});if(canUseIndexedDB()){try{await idbPut(value)}catch{fallbackWrite(value)}}else fallbackWrite(value);return value}
export async function resetVault(){if(canUseIndexedDB()){try{await idbDelete()}catch{}}try{localStorage.removeItem(FALLBACK_KEY);localStorage.removeItem(LEGACY_DEMO_KEY)}catch{}return emptyVault()}
export async function exportVault(){const state=await loadVault();return {format:'awsfc-local-backup',format_version:1,exported_at:new Date().toISOString(),application:'AWS Friendly Counsellor',web_milestone:'M4-LF1',state};}
export async function importVault(payload){const data=typeof payload==='string'?JSON.parse(payload):payload;if(!data||typeof data!=='object')throw new Error('Backup is not a JSON object.');const state=data.format==='awsfc-local-backup'?data.state:data;if(!state||typeof state!=='object')throw new Error('Backup does not contain application state.');return saveVault(normalize(state))}
export async function vaultInfo(){return {storage:canUseIndexedDB()?'IndexedDB':'localStorage fallback',database:canUseIndexedDB()?DB_NAME:FALLBACK_KEY,schema_version:1,network_required:false}}
