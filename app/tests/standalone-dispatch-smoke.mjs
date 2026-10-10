const local=new Map(),session=new Map();
globalThis.window={AWSFC_CONFIG:{webVersion:'M5-B',authMode:'standalone',apiBaseUrl:'',tenantId:'',cognitoDomain:'',cognitoClientId:'',cognitoScopes:'openid email profile',localSubject:'local-owner',localUsername:'Local Owner'}};
globalThis.location={origin:'https://example.invalid',pathname:'/app/',hash:'',search:'',assign:()=>{throw new Error('navigation not expected')}};
globalThis.history={replaceState:()=>{}};
globalThis.localStorage={getItem:k=>local.has(k)?local.get(k):null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)};
globalThis.sessionStorage={getItem:k=>session.has(k)?session.get(k):null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)};
if(!globalThis.crypto)globalThis.crypto=(await import('node:crypto')).webcrypto;
if(!globalThis.btoa)globalThis.btoa=s=>Buffer.from(s,'binary').toString('base64');
if(!globalThis.atob)globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
let fetchCalls=0;globalThis.fetch=async()=>{fetchCalls++;throw new Error('Standalone mode attempted network access')};
const {api}=await import('../js/api.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const h=await api.health();assert(h.environment==='standalone','health dispatch');
const t=(await api.createTenant({name:'No Network'})).tenant;assert(t.id,'tenant');
const a=await api.analyze({description:'A SaaS API with login, uploads and background jobs.',estimated_users:1000,budget:'low',region:'eu-central-1',advanced_guide:true});assert(a.scenarios.length===3,'analysis');
const project=(await api.createProject({name:'Scoped project',description:'A SaaS API with login, uploads and background jobs.',estimated_users:1000,budget:'low',region:'eu-central-1',status:'active'})).project;
const persisted=await api.createProjectAnalysis(project.id,{advanced_guide:true});assert(persisted.analysis_version.version===1,'persisted analysis');
const discovery=await api.awsDiscoveryImport({
  format:'awsfc-aws-discovery',format_version:2,collector_version:'dispatch-smoke',generated_at:'2026-10-09T17:00:00Z',
  account:{id:'123456789012'},regions:['eu-central-1'],
  resources:[
    {service:'apigateway',type:'v2-api',id:'api',region:'eu-central-1',tags:{AWSFCProjectId:project.id}},
    {service:'lambda',type:'function',id:'fn',region:'eu-central-1',tags:{AWSFCProjectId:project.id}}
  ],
  relationships:[{source:{service:'apigateway',type:'v2-api',id:'api',region:'eu-central-1'},target:{service:'lambda',type:'function',id:'fn',region:'eu-central-1'},kind:'invokes',evidence:'dispatch smoke'}],
  errors:[]
});
assert(discovery.summary.relationship_count===1,'relationship graph');
assert(discovery.graph.edges[0].target_resolved===true,'resolved relationship');
const assessment=(await api.assessProject(project.id,1,'balanced')).assessment;
assert(assessment.scope.confidence==='high','project-tagged assessment');
assert(assessment.findings.some(x=>x.id==='waf-public-ingress'),'WAF finding');
const b=await api.backupExport();assert(b.format==='awsfc-local-backup','backup');
assert(fetchCalls===0,`network used ${fetchCalls} times`);
console.log('STANDALONE DISPATCH PASS',JSON.stringify({fetchCalls,environment:h.environment,tenant:t.id,scenarios:a.scenarios.length,relationships:discovery.summary.relationship_count,assessment_findings:assessment.findings.length}));
