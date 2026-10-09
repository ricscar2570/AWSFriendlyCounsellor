export const DISCOVERY_FORMAT = 'awsfc-aws-discovery';
export const DISCOVERY_VERSION = 1;
export const MAX_DISCOVERY_RESOURCES = 100000;
export const MAX_DISCOVERY_ERRORS = 2000;

const SECRET_KEY = /(secret.?access.?key|access.?key.?id|session.?token|password|authorization|credential|private.?key)/i;
const SECRET_VALUE = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

function obj(v){return v && typeof v === 'object' && !Array.isArray(v)}
function text(v,max=500){return String(v ?? '').trim().slice(0,max)}
function iso(v){const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null}

function assertNoSecrets(value,path='bundle',depth=0){
  if(depth>12) throw new Error('Discovery bundle nesting is too deep.');
  if(Array.isArray(value)){
    for(let i=0;i<value.length;i++) assertNoSecrets(value[i],`${path}[${i}]`,depth+1);
    return;
  }
  if(obj(value)){
    for(const [k,v] of Object.entries(value)){
      if(SECRET_KEY.test(k)) throw new Error(`Discovery bundle contains forbidden credential-like field at ${path}.${k}`);
      assertNoSecrets(v,`${path}.${k}`,depth+1);
    }
    return;
  }
  if(typeof value==='string' && SECRET_VALUE.test(value)) throw new Error(`Discovery bundle contains credential-like material at ${path}`);
}

function normalizeTags(tags){
  if(!obj(tags)) return {};
  const out={};
  for(const [k,v] of Object.entries(tags).slice(0,100)){
    const key=text(k,128); if(!key) continue;
    out[key]=text(v,512);
  }
  return out;
}

function normalizeResource(r,index){
  if(!obj(r)) throw new Error(`Resource ${index+1} is not an object.`);
  const service=text(r.service,80).toLowerCase();
  const type=text(r.type,160);
  const id=text(r.id,1024);
  const region=text(r.region||'global',80);
  if(!service||!type||!id) throw new Error(`Resource ${index+1} requires service, type and id.`);
  return {
    service,
    type,
    id,
    region,
    arn:text(r.arn,2048)||null,
    name:text(r.name,512)||null,
    state:text(r.state,128)||null,
    tags:normalizeTags(r.tags),
    metadata:obj(r.metadata)?JSON.parse(JSON.stringify(r.metadata)):{} 
  };
}

export function normalizeDiscoveryBundle(input){
  const parsed=typeof input==='string'?JSON.parse(input):input;
  if(!obj(parsed)) throw new Error('Discovery bundle must be a JSON object.');
  assertNoSecrets(parsed);
  if(parsed.format!==DISCOVERY_FORMAT) throw new Error(`Unsupported discovery format: ${text(parsed.format)||'(missing)'}`);
  if(Number(parsed.format_version)!==DISCOVERY_VERSION) throw new Error(`Unsupported discovery format version: ${parsed.format_version}`);
  const account=obj(parsed.account)?parsed.account:{};
  const accountId=text(account.id,32);
  if(!/^\d{12}$/.test(accountId)) throw new Error('Discovery bundle requires a 12-digit AWS account id.');
  const generatedAt=iso(parsed.generated_at);
  if(!generatedAt) throw new Error('Discovery bundle generated_at must be a valid timestamp.');
  const resources=Array.isArray(parsed.resources)?parsed.resources:[];
  if(resources.length>MAX_DISCOVERY_RESOURCES) throw new Error(`Discovery bundle exceeds ${MAX_DISCOVERY_RESOURCES} resources.`);
  const dedup=new Map();
  resources.forEach((r,i)=>{
    const item=normalizeResource(r,i);
    const key=`${item.service}|\u0000${item.type}|\u0000${item.region}|\u0000${item.id}`;
    if(!dedup.has(key)) dedup.set(key,item);
  });
  const errors=(Array.isArray(parsed.errors)?parsed.errors:[]).slice(0,MAX_DISCOVERY_ERRORS).map((e,i)=>{
    if(!obj(e)) return {scope:'unknown',message:text(e,1000),index:i};
    return {scope:text(e.scope||'unknown',300),message:text(e.message||'Unknown discovery error',1200),code:text(e.code,120)||null};
  });
  const regions=[...new Set((Array.isArray(parsed.regions)?parsed.regions:[]).map(x=>text(x,80)).filter(Boolean))].sort();
  const bundle={
    format:DISCOVERY_FORMAT,
    format_version:DISCOVERY_VERSION,
    collector_version:text(parsed.collector_version||'unknown',80),
    generated_at:generatedAt,
    account:{id:accountId,arn:text(account.arn,2048)||null,partition:text(account.partition||'aws',32)},
    regions,
    resources:[...dedup.values()],
    errors,
    source:'local-readonly-collector'
  };
  return bundle;
}

export function discoverySummary(bundle){
  const b=normalizeDiscoveryBundle(bundle);
  const byService={},byRegion={},byType={};
  for(const r of b.resources){
    byService[r.service]=(byService[r.service]||0)+1;
    byRegion[r.region]=(byRegion[r.region]||0)+1;
    const k=`${r.service}:${r.type}`;byType[k]=(byType[k]||0)+1;
  }
  const services=Object.entries(byService).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const regions=Object.entries(byRegion).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const types=Object.entries(byType).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return {
    account_id:b.account.id,
    generated_at:b.generated_at,
    resource_count:b.resources.length,
    service_count:services.length,
    region_count:regions.length,
    error_count:b.errors.length,
    services,
    regions,
    types
  };
}

export function discoveryFingerprintInput(bundle){
  const b=normalizeDiscoveryBundle(bundle);
  return JSON.stringify({
    format:b.format,
    format_version:b.format_version,
    generated_at:b.generated_at,
    account:b.account,
    regions:b.regions,
    resources:b.resources,
    errors:b.errors
  });
}
