import { loadSettings } from './config.js';
import { getBearerToken } from './auth.js';
import { demoApi } from './demo.js';
import { standaloneApi } from './standalone.js';

async function request(path,{method='GET',body,tenant=true}={}){
  const s=loadSettings(); if(s.authMode==='demo'||s.authMode==='standalone') throw new Error('INTERNAL_LOCAL_DISPATCH');
  if(!s.apiBaseUrl) throw new Error('API base URL is not configured.');
  const headers={'Accept':'application/json','X-Request-ID':crypto.randomUUID?.()||String(Date.now())};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(tenant&&s.tenantId)headers['X-Tenant-ID']=s.tenantId;
  if(s.authMode==='cognito'){const token=await getBearerToken();if(!token)throw Object.assign(new Error('Sign in with Cognito first.'),{status:401});headers.Authorization=`Bearer ${token}`}
  if(s.authMode==='local'){headers['X-Debug-Subject']=s.localSubject;headers['X-Debug-Username']=s.localUsername}
  let r; try{r=await fetch(`${s.apiBaseUrl}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}catch(e){throw Object.assign(new Error(`Cannot reach API: ${e.message}`),{status:0})}
  const data=await r.json().catch(()=>null);if(!r.ok){const detail=data?.error?.message||data?.detail||`HTTP ${r.status}`;const err=new Error(typeof detail==='string'?detail:JSON.stringify(detail));err.status=r.status;err.details=data;throw err} return data;
}
function call(localName,path,opt){const s=loadSettings();if(s.authMode==='standalone')return standaloneApi[localName](...(opt?.demoArgs||[]));if(s.authMode==='demo')return demoApi[localName](...(opt?.demoArgs||[]));return request(path,opt)}
function query(path,{limit=50,cursor=null}={}){const q=new URLSearchParams();q.set('limit',String(limit));if(cursor)q.set('cursor',cursor);return `${path}?${q}`}

export const api={
  health:()=>loadSettings().authMode==='standalone'?standaloneApi.health():loadSettings().authMode==='demo'?demoApi.health():request('/health/ready',{tenant:false}),
  me:()=>call('me','/api/v1/me',{tenant:false}),
  createTenant:p=>call('createTenant','/api/v1/tenants',{method:'POST',body:p,tenant:false,demoArgs:[p]}),
  getTenant:id=>call('getTenant',`/api/v1/tenants/${encodeURIComponent(id)}`,{demoArgs:[id]}),
  listMemberships:(id,page={})=>call('listMemberships',query(`/api/v1/tenants/${encodeURIComponent(id)}/memberships`,page),{demoArgs:[id,page]}),
  createMembership:(id,p)=>call('createMembership',`/api/v1/tenants/${encodeURIComponent(id)}/memberships`,{method:'POST',body:p,demoArgs:[id,p]}),
  updateMembership:(id,sub,p)=>call('updateMembership',`/api/v1/tenants/${encodeURIComponent(id)}/memberships/${encodeURIComponent(sub)}`,{method:'PATCH',body:p,demoArgs:[id,sub,p]}),
  listAudit:(id,page={})=>call('listAudit',query(`/api/v1/tenants/${encodeURIComponent(id)}/audit`,page),{demoArgs:[id,page]}),
  createProject:p=>call('createProject','/api/v1/projects',{method:'POST',body:p,demoArgs:[p]}),
  listProjects:(page={})=>call('listProjects',query('/api/v1/projects',page),{demoArgs:[page]}),
  getProject:id=>call('getProject',`/api/v1/projects/${encodeURIComponent(id)}`,{demoArgs:[id]}),
  updateProject:(id,p)=>call('updateProject',`/api/v1/projects/${encodeURIComponent(id)}`,{method:'PATCH',body:p,demoArgs:[id,p]}),
  createProjectAnalysis:(id,p={})=>call('createProjectAnalysis',`/api/v1/projects/${encodeURIComponent(id)}/analyses`,{method:'POST',body:p,demoArgs:[id,p]}),
  listProjectAnalyses:(id,page={})=>call('listProjectAnalyses',query(`/api/v1/projects/${encodeURIComponent(id)}/analyses`,page),{demoArgs:[id,page]}),
  getProjectAnalysis:(id,v)=>call('getProjectAnalysis',`/api/v1/projects/${encodeURIComponent(id)}/analyses/${v}`,{demoArgs:[id,v]}),
  analyze:p=>call('analyze','/api/v1/analyze',{method:'POST',body:p,tenant:false,demoArgs:[p]}),
  iac:p=>call('iac','/api/v1/iac',{method:'POST',body:p,tenant:false,demoArgs:[p]}),
  narrative:p=>call('narrative','/api/v1/narrative',{method:'POST',body:p,tenant:false,demoArgs:[p]}),
  pricingStatus:()=>call('pricingStatus','/api/v1/pricing/status',{tenant:false}),
  pricingQuote:p=>call('pricingQuote','/api/v1/pricing/quote',{method:'POST',body:p,tenant:false,demoArgs:[p]}),
  simulateRegions:p=>call('simulateRegions','/api/v1/simulations/regions',{method:'POST',body:p,tenant:false,demoArgs:[p]}),
  getWorkspace:(id,v)=>call('getWorkspace',`/api/v1/projects/${encodeURIComponent(id)}/analysis-workspaces/${v}`,{demoArgs:[id,v]}),
  getReportBundle:(id,v)=>call('getReportBundle',`/api/v1/projects/${encodeURIComponent(id)}/analysis-workspaces/${v}/report-bundle`,{demoArgs:[id,v]}),
  createAccountEstimate:(id,v,p)=>call('createAccountEstimate',`/api/v1/projects/${encodeURIComponent(id)}/analysis-workspaces/${v}/pricing-calculator-estimate`,{method:'POST',body:p,demoArgs:[id,v,p]}),
  listAccountEstimates:(id,page={})=>call('listAccountEstimates',query(`/api/v1/projects/${encodeURIComponent(id)}/pricing-calculator-estimates`,page),{demoArgs:[id,page]}),
  listAccountEstimateRevisions:(id,eid)=>call('listAccountEstimateRevisions',`/api/v1/projects/${encodeURIComponent(id)}/pricing-calculator-estimates/${encodeURIComponent(eid)}/revisions`,{demoArgs:[id,eid]}),
  refreshAccountEstimate:(id,eid)=>call('refreshAccountEstimate',`/api/v1/projects/${encodeURIComponent(id)}/pricing-calculator-estimates/${encodeURIComponent(eid)}/refresh`,{method:'POST',demoArgs:[id,eid]}),
  extendAccountEstimate:(id,eid,p)=>call('extendAccountEstimate',`/api/v1/projects/${encodeURIComponent(id)}/pricing-calculator-estimates/${encodeURIComponent(eid)}/extend`,{method:'POST',body:p,demoArgs:[id,eid,p]}),
  listActualCosts:(id,page={})=>call('listActualCosts',query(`/api/v1/projects/${encodeURIComponent(id)}/actual-cost-snapshots`,page),{demoArgs:[id,page]}),
  listActualCostRevisions:(id,sid)=>call('listActualCostRevisions',`/api/v1/projects/${encodeURIComponent(id)}/actual-cost-snapshots/${encodeURIComponent(sid)}/revisions`,{demoArgs:[id,sid]}),
  refreshActualCost:(id,sid)=>call('refreshActualCost',`/api/v1/projects/${encodeURIComponent(id)}/actual-cost-snapshots/${encodeURIComponent(sid)}/refresh`,{method:'POST',demoArgs:[id,sid]}),
  createActualCost:(id,p)=>call('createActualCost',`/api/v1/projects/${encodeURIComponent(id)}/actual-cost-snapshots`,{method:'POST',body:p,demoArgs:[id,p]}),
  importCur2:(id,p)=>call('importCur2',`/api/v1/projects/${encodeURIComponent(id)}/actual-cost-snapshots/import-cur`,{method:'POST',body:p,demoArgs:[id,p]}),
  gamification:id=>call('gamification',`/api/v1/tenants/${encodeURIComponent(id)}/gamification`,{demoArgs:[id]}),
  privacyExport:()=>call('privacyExport','/api/v1/privacy/export'),
  privacyDelete:()=>call('privacyDelete','/api/v1/privacy/deletion-requests',{method:'POST'}),
  awsDiscoveryGet:()=>loadSettings().authMode==='standalone'?standaloneApi.awsDiscoveryGet():loadSettings().authMode==='demo'?Promise.resolve({discovery:null,summary:null,security_boundary:'Demo mode does not import real AWS account evidence.'}):request('/api/v1/aws/discovery'),
  awsDiscoveryImport:p=>loadSettings().authMode==='standalone'?standaloneApi.awsDiscoveryImport(p):loadSettings().authMode==='demo'?Promise.reject(new Error('AWS discovery import is disabled in Demo mode.')):request('/api/v1/aws/discovery',{method:'POST',body:p}),
  awsDiscoveryClear:()=>loadSettings().authMode==='standalone'?standaloneApi.awsDiscoveryClear():loadSettings().authMode==='demo'?Promise.reject(new Error('AWS discovery is not persisted in Demo mode.')):request('/api/v1/aws/discovery',{method:'DELETE'}),
  backupExport:()=>loadSettings().authMode==='standalone'?standaloneApi.backupExport():Promise.reject(new Error('Full local backup is available in Standalone mode.')),
  backupExportEncrypted:p=>loadSettings().authMode==='standalone'?standaloneApi.backupExportEncrypted(p):Promise.reject(new Error('Encrypted local backup is available in Standalone mode.')),
  backupImport:(p,passphrase='')=>loadSettings().authMode==='standalone'?standaloneApi.backupImport(p,passphrase):Promise.reject(new Error('Full local restore is available in Standalone mode.')),
  backupStatus:()=>loadSettings().authMode==='standalone'?standaloneApi.backupStatus():Promise.resolve({recommended:false,critical:false}),
  recoveryList:()=>loadSettings().authMode==='standalone'?standaloneApi.recoveryList():Promise.resolve({checkpoints:[]}),
  recoveryRestore:id=>loadSettings().authMode==='standalone'?standaloneApi.recoveryRestore(id):Promise.reject(new Error('Recovery checkpoints are available in Standalone mode.')),
  requestPersistentStorage:()=>loadSettings().authMode==='standalone'?standaloneApi.requestPersistentStorage():Promise.resolve({supported:false,persisted:false}),
  resetLocalData:()=>loadSettings().authMode==='standalone'?standaloneApi.resetLocalData():Promise.reject(new Error('Local reset is available in Standalone mode.')),
  storageInfo:()=>loadSettings().authMode==='standalone'?standaloneApi.storageInfo():Promise.resolve({storage:'remote backend',network_required:true}),
  pricingCatalog:()=>loadSettings().authMode==='standalone'?standaloneApi.pricingCatalog():Promise.reject(new Error('Local pricing catalog is available in Standalone mode.')),
  importPricingCatalog:p=>loadSettings().authMode==='standalone'?standaloneApi.importPricingCatalog(p):Promise.reject(new Error('Local pricing catalog import is available in Standalone mode.'))
};
