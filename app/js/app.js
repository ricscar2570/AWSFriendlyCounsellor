import { api } from './api.js';
import { beginLogin, handleCallback, isSignedIn, logout } from './auth.js';
import { loadSettings, saveSettings, resetSettings, setTenantId } from './config.js';
import { $, $$, currentRoute, queryParams, routeTo, toast, esc, download, encodeHtmlReport } from './utils.js';
import { zipFiles } from './zip.js';
import * as V from './views.js';

const app=$('#app');
const state={settings:loadSettings(),identity:null,health:null,healthCheckedAt:0,tenant:null,projects:[],projectsHasMore:false,analyses:[],members:[],audit:[],project:null,lastRequest:null,lastAnalysis:null,lastIac:null,lastReport:null};
const templates={
  SaaS:'A multi-tenant SaaS web application with customer login, account administration, REST APIs, file uploads, background jobs, notifications and an analytics dashboard.',
  'E-commerce':'An e-commerce storefront with customer accounts, product browsing, checkout integration, order processing, images, transactional notifications and operational analytics.',
  API:'A public REST API used by web and mobile clients with authentication, tenant-scoped data, asynchronous jobs, webhook processing, monitoring and rate protection.',
  Data:'A data platform that ingests files and events, validates and transforms data, stores durable history and exposes analytics to an internal dashboard.',
  ML:'A web application that accepts user input, runs machine-learning inference asynchronously, stores results, exposes history and requires observability and access control.'
};

function formObject(form){const fd=new FormData(form),o=Object.fromEntries(fd.entries());for(const c of form.querySelectorAll('input[type=checkbox]'))o[c.name]=c.checked;return o}
function analysisRequest(o){return {description:String(o.description||'').trim(),estimated_users:Number(o.estimated_users),budget:o.budget,region:o.region,advanced_guide:o.advanced_guide!==false&&o.advanced_guide!=='false'}}
function projectPayload(o){return {name:String(o.name||'').trim(),description:String(o.description||'').trim(),estimated_users:Number(o.estimated_users),budget:o.budget,region:o.region,status:o.status||'draft'}}
function showBusy(button,label='Working…'){if(!button)return()=>{};const old=button.innerHTML;button.disabled=true;button.innerHTML=`<span class="spinner"></span>${label}`;return()=>{button.disabled=false;button.innerHTML=old}}
function handleError(e,context='Request failed'){console.error(e);toast(`${context}: ${e.message}`, 'error');}

async function bootstrapCommon({force=false}={}){state.settings=loadSettings();const now=Date.now();if(force||!state.health||now-state.healthCheckedAt>30000){try{state.health=await api.health()}catch{state.health=null}state.healthCheckedAt=now}if(isSignedIn()){if(force||!state.identity){try{state.identity=await api.me()}catch(e){if(state.settings.authMode==='cognito'&&e.status===401)state.identity=null}}if(state.settings.tenantId){if(force||!state.tenant||state.tenant.id!==state.settings.tenantId){try{state.tenant=(await api.getTenant(state.settings.tenantId)).tenant}catch{state.tenant=null}}}else state.tenant=null}}
async function loadProjects({limit=25,cursor=null}={}){if(!state.settings.tenantId){state.projects=[];state.projectsHasMore=false;return {projects:[],next_cursor:null}}try{const page=await api.listProjects({limit,cursor});state.projects=page.projects;state.projectsHasMore=!!page.next_cursor;return page}catch(e){state.projects=[];state.projectsHasMore=false;throw e}}
async function loadLatest(){let latest=null;for(const p of state.projects.slice(0,5)){try{const x=(await api.listProjectAnalyses(p.id,{limit:1})).analysis_versions[0];if(x&&(!latest||new Date(x.created_at)>new Date(latest.created_at)))latest=x}catch{}}return latest}

async function render(){state.settings=loadSettings();const route=currentRoute();if(route==='/'||route==='/login'){app.innerHTML=V.landing(state.settings);return}if(route==='/settings'){app.innerHTML=V.shell({route,settings:state.settings,identity:state.identity,health:state.health,body:V.settingsPage(state.settings)});return}if(route==='/about'){app.innerHTML=V.shell({route,settings:state.settings,identity:state.identity,health:state.health,body:V.aboutPage(state.settings)});return}if(state.settings.authMode==='cognito'&&!isSignedIn()){app.innerHTML=V.landing(state.settings);toast('Sign in to open the application.','info');return}try{await bootstrapCommon()}catch(e){handleError(e,'Connection')}if(!state.settings.tenantId||!state.tenant){app.innerHTML=V.shell({route,settings:state.settings,identity:state.identity,health:state.health,body:V.onboarding(state.settings)});return}
  let body='';
  try{
    if(route==='/dashboard'){await loadProjects({limit:5});body=V.dashboard({tenant:state.tenant,projects:state.projects,projectsHasMore:state.projectsHasMore,health:state.health,identity:state.identity,latest:await loadLatest()})}
    else if(route==='/advisor')body=V.advisor(state.lastRequest||{});
    else if(route==='/projects'){const q=queryParams();const page=await loadProjects({limit:50,cursor:q.get('cursor')});body=V.projectsPage(page.projects,page.next_cursor)}
    else if(route.startsWith('/project/')){const id=decodeURIComponent(route.slice('/project/'.length));state.project=(await api.getProject(id)).project;const q=queryParams();const page=await api.listProjectAnalyses(id,{limit:50,cursor:q.get('analysis_cursor')});state.analyses=page.analysis_versions;body=V.projectDetail(state.project,state.analyses,page.next_cursor)}
    else if(route==='/team'){const q=queryParams();const page=await api.listMemberships(state.settings.tenantId,{limit:50,cursor:q.get('cursor')});state.members=page.memberships;body=V.teamPage(state.members,page.next_cursor)}
    else if(route==='/audit'){const q=queryParams();const page=await api.listAudit(state.settings.tenantId,{limit:50,cursor:q.get('cursor')});state.audit=page.audit_events;body=V.auditPage(state.audit,page.next_cursor)}
    else {body=V.errorCard('Page not found',route)}
  }catch(e){body=V.errorCard('Unable to load this page',e.message)}
  app.innerHTML=V.shell({route,settings:state.settings,identity:state.identity,health:state.health,body});
}

function terraformOutput(iac){state.lastIac=iac;const t=iac.terraform;return `<section class="panel generated"><div class="panel-head"><div><div class="eyebrow">Infrastructure as code</div><h2>Terraform baseline</h2></div><span class="pill ${t.status==='baseline_ready'?'active':'info'}">${esc(t.status)}</span></div><p class="muted">${t.supported_services.length} supported service mappings · ${t.deferred_services.length} deferred.</p><div class="file-tabs">${Object.entries(t.files).map(([n,c],i)=>`<details ${i===0?'open':''}><summary>${esc(n)} <span>${c.split('\n').length} lines</span></summary><pre><code>${esc(c)}</code></pre></details>`).join('')}</div><div class="form-actions"><button class="btn primary" data-action="download-terraform">Download Terraform ZIP</button><button class="btn ghost" data-action="copy-main-tf">Copy main.tf</button></div><ol class="compact">${t.instructions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section>`}
function reportOutput(report){state.lastReport=report;const safeDoc=`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;padding:32px;line-height:1.55;color:#172033}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}h1,h2,h3{color:#0b203d}</style></head><body>${report.narrative_html}</body></html>`;return `<section class="panel generated"><div class="panel-head"><div><div class="eyebrow">Human-readable report</div><h2>Architecture report</h2></div><div><button class="btn mini" data-action="download-report">Download HTML</button> <button class="btn mini ghost" data-action="print-report">Print / PDF</button></div></div><iframe class="report-frame" sandbox="allow-modals" title="Architecture report" srcdoc="${esc(safeDoc)}"></iframe></section>`}
async function generateIac(req,target='#generated-output'){const out=$(target);if(out)out.innerHTML='<div class="loading-card"><span class="spinner"></span> Generating Terraform…</div>';try{const r=await api.iac(req);if(out)out.innerHTML=terraformOutput(r)}catch(e){if(out)out.innerHTML=V.errorCard('Terraform generation failed',e.message)}}
async function generateReport(req,target='#generated-output'){const out=$(target);if(out)out.innerHTML='<div class="loading-card"><span class="spinner"></span> Generating report…</div>';try{const r=await api.narrative(req);if(out)out.innerHTML=reportOutput(r)}catch(e){if(out)out.innerHTML=V.errorCard('Report generation failed',e.message)}}
function requestFromProject(p){return {description:p.description,estimated_users:p.estimated_users,budget:p.budget,region:p.region,advanced_guide:true}}

app.addEventListener('submit',async e=>{
  const f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();
  if(f.id==='settings-form'){const o=formObject(f);state.settings=saveSettings(o);state.identity=null;state.tenant=null;state.health=null;toast('Settings saved','success');await bootstrapCommon({force:true});await render();return}
  if(f.id==='create-tenant-form'){const done=showBusy(f.querySelector('button[type=submit]'),'Creating…');try{const o=formObject(f);const payload={name:String(o.name||'').trim()};const slug=String(o.slug||'').trim();if(slug)payload.slug=slug;const r=await api.createTenant(payload);setTenantId(r.tenant.id);state.tenant=r.tenant;toast('Workspace created','success');routeTo('/dashboard')}catch(x){handleError(x,'Create workspace')}finally{done()}return}
  if(f.id==='connect-tenant-form'){const id=formObject(f).tenantId.trim();setTenantId(id);try{await bootstrapCommon();if(!state.tenant)throw new Error('Tenant not found or not accessible');toast('Workspace connected','success');routeTo('/dashboard')}catch(x){setTenantId('');handleError(x,'Connect workspace')}return}
  if(f.id==='advisor-form'){const b=f.querySelector('button[type=submit]'),done=showBusy(b,'Analyzing…');try{state.lastRequest=analysisRequest(formObject(f));state.lastAnalysis=await api.analyze(state.lastRequest);$('#advisor-result').innerHTML=V.analysisResult(state.lastAnalysis);$('#advisor-result').scrollIntoView({behavior:'smooth',block:'start'});toast('Analysis ready','success')}catch(x){handleError(x,'Analysis')}finally{done()}return}
  if(f.id==='project-create-form'){const done=showBusy(f.querySelector('button[type=submit]'),'Creating…');try{const r=await api.createProject(projectPayload(formObject(f)));toast('Project created','success');routeTo(`/project/${r.project.id}`)}catch(x){handleError(x,'Create project')}finally{done()}return}
  if(f.id==='project-edit-form'){const o=formObject(f),p={expected_revision:Number(o.expected_revision),name:o.name.trim(),description:o.description.trim(),estimated_users:Number(o.estimated_users),budget:o.budget,region:o.region,status:o.status};const done=showBusy(f.querySelector('button[type=submit]'),'Saving…');try{await api.updateProject(state.project.id,p);toast('Project updated','success');await render()}catch(x){handleError(x,'Update project')}finally{done()}return}
  if(f.id==='member-create-form'){const o=formObject(f),done=showBusy(f.querySelector('button[type=submit]'),'Granting…');try{await api.createMembership(state.settings.tenantId,{subject:o.subject.trim(),role:o.role});toast('Membership created','success');await render()}catch(x){handleError(x,'Create membership')}finally{done()}return}
  if(f.id==='member-edit-form'){const o=formObject(f),done=showBusy(f.querySelector('button[type=submit]'),'Updating…');try{await api.updateMembership(state.settings.tenantId,o.subject,{expected_revision:Number(o.expected_revision),role:o.role,status:o.status});toast('Membership updated','success');await render()}catch(x){handleError(x,'Update membership')}finally{done()}return}
});

app.addEventListener('click',async e=>{const el=e.target.closest('[data-action],[data-template]');if(!el)return;
  if(el.dataset.template){const ta=$('#advisor-form textarea[name=description]');if(ta)ta.value=templates[el.dataset.template]||'';return}
  const a=el.dataset.action;
  if(a==='login'){try{await beginLogin()}catch(x){handleError(x,'Sign in')}}
  else if(a==='logout')logout();
  else if(a==='toggle-menu')document.body.classList.toggle('menu-open');
  else if(a==='show-project-form')$('#project-create-slot').innerHTML=V.projectCreateForm();
  else if(a==='hide-project-form')$('#project-create-slot').innerHTML='';
  else if(a==='save-analysis-project'){if(!state.lastRequest)return;const name=prompt('Project name','New advised project');if(!name)return;try{const r=await api.createProject({name,description:state.lastRequest.description,estimated_users:state.lastRequest.estimated_users,budget:state.lastRequest.budget,region:state.lastRequest.region,status:'active'});await api.createProjectAnalysis(r.project.id,{advanced_guide:state.lastRequest.advanced_guide});toast('Project and first immutable analysis saved','success');routeTo(`/project/${r.project.id}`)}catch(x){handleError(x,'Save project')}}
  else if(a==='generate-iac'){if(state.lastRequest)await generateIac(state.lastRequest)}
  else if(a==='generate-report'){if(state.lastRequest)await generateReport(state.lastRequest)}
  else if(a==='run-project-analysis'){const done=showBusy(el,'Running…');try{const r=await api.createProjectAnalysis(state.project.id,{advanced_guide:true});state.lastAnalysis=r.analysis_version.result;toast(`Analysis v${r.analysis_version.version} persisted`,'success');await render();setTimeout(()=>{const slot=$('#analysis-version-slot');if(slot)slot.innerHTML=V.analysisResult(state.lastAnalysis,{showPersist:false})},20)}catch(x){handleError(x,'Persist analysis')}finally{done()}}
  else if(a==='project-iac')await generateIac(requestFromProject(state.project),'#project-output');
  else if(a==='project-report')await generateReport(requestFromProject(state.project),'#project-output');
  else if(a==='open-analysis'){try{const r=await api.getProjectAnalysis(state.project.id,Number(el.dataset.version));$('#analysis-version-slot').innerHTML=V.analysisResult(r.analysis_version.result,{showPersist:false});$('#analysis-version-slot').scrollIntoView({behavior:'smooth'})}catch(x){handleError(x,'Open analysis')}}
  else if(a==='edit-member'){$('#member-edit-slot').innerHTML=V.memberEditForm({subject:el.dataset.subject,role:el.dataset.role,status:el.dataset.status,revision:Number(el.dataset.revision)});$('#member-edit-slot').scrollIntoView({behavior:'smooth'})}
  else if(a==='download-terraform'&&state.lastIac){download('aws-friendly-counsellor-terraform.zip',zipFiles(state.lastIac.terraform.files),'application/zip')}
  else if(a==='copy-main-tf'&&state.lastIac){navigator.clipboard?.writeText(state.lastIac.terraform.files['main.tf']||'').then(()=>toast('main.tf copied','success'))}
  else if(a==='download-report'&&state.lastReport){download('aws-friendly-counsellor-report.html',encodeHtmlReport('AWS Friendly Counsellor report',state.lastReport.narrative_html),'text/html;charset=utf-8')}
  else if(a==='print-report'){const fr=$('.report-frame');if(fr?.contentWindow)fr.contentWindow.print()}
  else if(a==='print')window.print();
  else if(a==='test-connection'){try{const h=await api.health();toast(`Backend ready: ${h.environment} / ${h.version}`,'success')}catch(x){handleError(x,'Connection test')}}
  else if(a==='reset-settings'){if(confirm('Reset browser settings?')){resetSettings();state.settings=loadSettings();state.identity=null;state.tenant=null;state.health=null;toast('Settings reset','success');await render()}}
});

window.addEventListener('hashchange',()=>{document.body.classList.remove('menu-open');render()});
window.addEventListener('online',()=>toast('Back online','success'));window.addEventListener('offline',()=>toast('Offline: cached demo UI remains available','info'));

(async function init(){try{await handleCallback()}catch(e){handleError(e,'Login callback')}await bootstrapCommon();await render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});})();
