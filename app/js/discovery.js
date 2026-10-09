export const DISCOVERY_FORMAT = 'awsfc-aws-discovery';
export const DISCOVERY_VERSION = 2;
export const SUPPORTED_DISCOVERY_VERSIONS = new Set([1,2]);
export const MAX_DISCOVERY_RESOURCES = 100000;
export const MAX_DISCOVERY_RELATIONSHIPS = 250000;
export const MAX_DISCOVERY_ERRORS = 2000;

const SECRET_KEY = /(secret.?access.?key|access.?key.?id|session.?token|password|authorization|credential|private.?key)/i;
const SECRET_VALUE = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

function obj(v){return v && typeof v === 'object' && !Array.isArray(v)}
function text(v,max=500){return String(v ?? '').trim().slice(0,max)}
function iso(v){const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null}
function clone(v){return JSON.parse(JSON.stringify(v))}
function resourceKey(r){return [text(r.service,80).toLowerCase(),text(r.type,160),text(r.region||'global',80),text(r.id,1024)].join('|')}

function assertNoSecrets(value,path='bundle',depth=0){
  if(depth>14) throw new Error('Discovery bundle nesting is too deep.');
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
    metadata:obj(r.metadata)?clone(r.metadata):{}
  };
}

function normalizeEndpoint(v,label){
  if(!obj(v)) throw new Error(`Relationship ${label} endpoint is not an object.`);
  const service=text(v.service,80).toLowerCase(),type=text(v.type,160),id=text(v.id,1024),region=text(v.region||'global',80);
  if(!service||!type||!id) throw new Error(`Relationship ${label} endpoint requires service, type and id.`);
  return {service,type,id,region};
}

function normalizeRelationship(r,index){
  if(!obj(r)) throw new Error(`Relationship ${index+1} is not an object.`);
  const source=normalizeEndpoint(r.source,`${index+1} source`);
  const target=normalizeEndpoint(r.target,`${index+1} target`);
  const kind=text(r.kind,120).toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
  if(!kind) throw new Error(`Relationship ${index+1} requires kind.`);
  return {
    source,
    target,
    kind,
    confidence:['observed','inferred'].includes(r.confidence)?r.confidence:'observed',
    evidence:text(r.evidence||'collector metadata',1000),
    metadata:obj(r.metadata)?clone(r.metadata):{}
  };
}

function endpoint(service,type,id,region){return {service,type,id,region:region||'global'}}

function derivedRelationships(resources){
  const rel=[];
  const add=(source,target,kind,evidence,confidence='observed',metadata={})=>{
    if(!source?.service||!source?.type||!source?.id||!target?.service||!target?.type||!target?.id)return;
    rel.push({source,target,kind,evidence,confidence,metadata});
  };
  for(const r of resources){
    const m=r.metadata||{},src=endpoint(r.service,r.type,r.id,r.region);
    if(m.vpc_id) add(src,endpoint('ec2','vpc',m.vpc_id,r.region),'member-of-vpc','resource metadata vpc_id');
    if(m.subnet_id) add(src,endpoint('ec2','subnet',m.subnet_id,r.region),'uses-subnet','resource metadata subnet_id');
    for(const id of Array.isArray(m.subnet_ids)?m.subnet_ids:[]) add(src,endpoint('ec2','subnet',id,r.region),'uses-subnet','resource metadata subnet_ids');
    for(const id of Array.isArray(m.security_group_ids)?m.security_group_ids:[]) add(src,endpoint('ec2','security-group',id,r.region),'protected-by-security-group','resource metadata security_group_ids');
    if(m.db_subnet_group) add(src,endpoint('rds','db-subnet-group',m.db_subnet_group,r.region),'uses-db-subnet-group','RDS DB subnet group metadata');
    if(m.cluster_arn) add(src,endpoint('ecs','cluster',m.cluster_arn,r.region),'member-of-cluster','ECS service metadata cluster_arn');
    if(m.load_balancer_arn) add(src,endpoint('elasticloadbalancing','load-balancer',m.load_balancer_arn,r.region),'attached-to-load-balancer','load balancer metadata');
    for(const o of Array.isArray(m.origins)?m.origins:[]){
      if(o?.target?.service) add(src,normalizeEndpoint(o.target,'origin'),'routes-to',text(o.evidence||'CloudFront origin metadata',1000),'observed');
    }
  }
  return rel;
}

function dedupeRelationships(items){
  const out=new Map();
  for(const r of items){
    const x=normalizeRelationship(r,out.size);
    const key=[resourceKey(x.source),x.kind,resourceKey(x.target)].join('=>');
    if(!out.has(key)) out.set(key,x);
  }
  return [...out.values()];
}

export function normalizeDiscoveryBundle(input){
  const parsed=typeof input==='string'?JSON.parse(input):input;
  if(!obj(parsed)) throw new Error('Discovery bundle must be a JSON object.');
  assertNoSecrets(parsed);
  if(parsed.format!==DISCOVERY_FORMAT) throw new Error(`Unsupported discovery format: ${text(parsed.format)||'(missing)'}`);
  const version=Number(parsed.format_version);
  if(!SUPPORTED_DISCOVERY_VERSIONS.has(version)) throw new Error(`Unsupported discovery format version: ${parsed.format_version}`);
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
    const key=resourceKey(item);
    if(!dedup.has(key)) dedup.set(key,item);
  });
  const normalizedResources=[...dedup.values()];
  const supplied=Array.isArray(parsed.relationships)?parsed.relationships:[];
  if(supplied.length>MAX_DISCOVERY_RELATIONSHIPS) throw new Error(`Discovery bundle exceeds ${MAX_DISCOVERY_RELATIONSHIPS} relationships.`);
  const relationships=dedupeRelationships([...derivedRelationships(normalizedResources),...supplied]);
  if(relationships.length>MAX_DISCOVERY_RELATIONSHIPS) throw new Error(`Discovery bundle exceeds ${MAX_DISCOVERY_RELATIONSHIPS} normalized relationships.`);
  const errors=(Array.isArray(parsed.errors)?parsed.errors:[]).slice(0,MAX_DISCOVERY_ERRORS).map((e,i)=>{
    if(!obj(e)) return {scope:'unknown',message:text(e,1000),index:i};
    return {scope:text(e.scope||'unknown',300),message:text(e.message||'Unknown discovery error',1200),code:text(e.code,120)||null};
  });
  const regions=[...new Set((Array.isArray(parsed.regions)?parsed.regions:[]).map(x=>text(x,80)).filter(Boolean))].sort();
  return {
    format:DISCOVERY_FORMAT,
    format_version:version,
    normalized_format_version:DISCOVERY_VERSION,
    collector_version:text(parsed.collector_version||'unknown',80),
    generated_at:generatedAt,
    account:{id:accountId,arn:text(account.arn,2048)||null,partition:text(account.partition||'aws',32)},
    regions,
    resources:normalizedResources,
    relationships,
    errors,
    source:'local-readonly-collector'
  };
}

export function buildArchitectureGraph(bundle){
  const b=normalizeDiscoveryBundle(bundle);
  const nodes=b.resources.map(r=>({...r,key:resourceKey(r)}));
  const known=new Map(nodes.map(n=>[n.key,n]));
  const edges=b.relationships.map((r,index)=>{
    const source_key=resourceKey(r.source),target_key=resourceKey(r.target);
    return {...r,id:`edge-${index+1}`,source_key,target_key,source_resolved:known.has(source_key),target_resolved:known.has(target_key)};
  });
  const unresolved=edges.filter(e=>!e.source_resolved||!e.target_resolved);
  return {nodes,edges,unresolved};
}

export function discoverySummary(bundle){
  const b=normalizeDiscoveryBundle(bundle);
  const graph=buildArchitectureGraph(b);
  const byService={},byRegion={},byType={},byRelation={};
  for(const r of b.resources){
    byService[r.service]=(byService[r.service]||0)+1;
    byRegion[r.region]=(byRegion[r.region]||0)+1;
    const k=`${r.service}:${r.type}`;byType[k]=(byType[k]||0)+1;
  }
  for(const e of graph.edges)byRelation[e.kind]=(byRelation[e.kind]||0)+1;
  const sort=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return {
    account_id:b.account.id,
    generated_at:b.generated_at,
    resource_count:b.resources.length,
    relationship_count:graph.edges.length,
    unresolved_relationship_count:graph.unresolved.length,
    service_count:Object.keys(byService).length,
    region_count:Object.keys(byRegion).length,
    error_count:b.errors.length,
    services:sort(byService),
    regions:sort(byRegion),
    types:sort(byType),
    relationship_types:sort(byRelation)
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
    relationships:b.relationships,
    errors:b.errors
  });
}
