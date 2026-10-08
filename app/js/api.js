import { loadSettings } from './config.js';
import { getBearerToken } from './auth.js';
import { demoApi } from './demo.js';

async function request(path,{method='GET',body,tenant=true}={}){
  const s=loadSettings(); if(s.authMode==='demo') throw new Error('INTERNAL_DEMO_DISPATCH');
  if(!s.apiBaseUrl) throw new Error('API base URL is not configured.');
  const headers={'Accept':'application/json','X-Request-ID':crypto.randomUUID?.()||String(Date.now())};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(tenant&&s.tenantId)headers['X-Tenant-ID']=s.tenantId;
  if(s.authMode==='cognito'){const token=await getBearerToken();if(!token)throw Object.assign(new Error('Sign in with Cognito first.'),{status:401});headers.Authorization=`Bearer ${token}`}
  if(s.authMode==='local'){headers['X-Debug-Subject']=s.localSubject;headers['X-Debug-Username']=s.localUsername}
  let r; try{r=await fetch(`${s.apiBaseUrl}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}catch(e){throw Object.assign(new Error(`Cannot reach API: ${e.message}`),{status:0})}
  const data=await r.json().catch(()=>null);if(!r.ok){const detail=data?.error?.message||data?.detail||`HTTP ${r.status}`;const err=new Error(typeof detail==='string'?detail:JSON.stringify(detail));err.status=r.status;err.details=data;throw err} return data;
}
function call(demoName,path,opt){const s=loadSettings();return s.authMode==='demo'?demoApi[demoName](...(opt?.demoArgs||[])):request(path,opt)}
function query(path,{limit=50,cursor=null}={}){const q=new URLSearchParams();q.set('limit',String(limit));if(cursor)q.set('cursor',cursor);return `${path}?${q}`}

export const api={
  health:()=>loadSettings().authMode==='demo'?demoApi.health():request('/health/ready',{tenant:false}),
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
  narrative:p=>call('narrative','/api/v1/narrative',{method:'POST',body:p,tenant:false,demoArgs:[p]})
};
