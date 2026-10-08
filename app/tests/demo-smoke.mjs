const mem=new Map();globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
if(!globalThis.crypto)globalThis.crypto=(await import('node:crypto')).webcrypto;
const {demoApi}=await import('../js/demo.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const health=await demoApi.health();assert(health.status==='healthy','health');
const tenant=(await demoApi.createTenant({name:'Smoke Team'})).tenant;assert(tenant.id,'tenant');
const me=await demoApi.me();assert(me.subject==='demo-owner','identity');
const p=(await demoApi.createProject({name:'Portal',description:'A customer portal with login, uploads, background jobs and analytics dashboard.',estimated_users:12000,budget:'medium',region:'eu-central-1',status:'active'})).project;assert(p.revision===1,'project');
const a=(await demoApi.createProjectAnalysis(p.id,{advanced_guide:true})).analysis_version;assert(a.version===1,'analysis version');assert(a.result.services.length>=7,'services');assert(Object.keys(a.result.marketplace_links||{}).length>=7,'marketplace links');
const list=await demoApi.listProjectAnalyses(p.id);assert(list.analysis_versions.length===1,'analysis list');
const iac=await demoApi.iac(a.request);assert(iac.terraform.files['main.tf'].includes('software_token_mfa_configuration'),'terraform MFA');
const report=await demoApi.narrative(a.request);assert(report.narrative_html.includes('Recommended services'),'report');
const members=await demoApi.listMemberships(tenant.id);assert(members.memberships[0].role==='owner','owner');
const audit=await demoApi.listAudit(tenant.id);assert(audit.audit_events.length>=3,'audit');
console.log('DEMO SMOKE PASS',JSON.stringify({tenant:tenant.id,project:p.id,analysis:a.version,services:a.result.services.length,audit:audit.audit_events.length}));

for(let i=0;i<54;i++) await demoApi.createProject({name:`Extra ${i}`,description:'Additional workload used to prove browser demo pagination behavior.',estimated_users:100+i,budget:'low',region:'eu-central-1',status:'draft'});
const page1=await demoApi.listProjects({limit:50});assert(page1.projects.length===50&&page1.next_cursor,'pagination first page');
const page2=await demoApi.listProjects({limit:50,cursor:page1.next_cursor});assert(page2.projects.length===5&&!page2.next_cursor,'pagination second page');
console.log('DEMO PAGINATION PASS',JSON.stringify({first:page1.projects.length,second:page2.projects.length}));


const workspace=await demoApi.getWorkspace(p.id,a.version);assert(workspace.workspace.result.usage_profile,'workspace usage');
const bundle=await demoApi.getReportBundle(p.id,a.version);assert(bundle.workspace_sha256.length===64,'report hash');assert(bundle.files['PROVENANCE.json']&&bundle.files['report.html'],'report bundle files');
const ps=await demoApi.pricingStatus();assert(ps.source_state==='planning_baseline'&&ps.circuit_open_seconds>0,'pricing status');
const quote=await demoApi.pricingQuote({region:'eu-central-1',usage:a.result.usage_profile,service_ids:['lambda','api-gateway','s3'],transfer_paths:[]});assert(quote.total_monthly>=0&&quote.provenance.length,'pricing quote');
const sim=await demoApi.simulateRegions({usage:a.result.usage_profile,service_ids:['lambda'],regions:['us-east-1','eu-central-1']});assert(sim.simulations.length===2,'region simulation');
const est=(await demoApi.createAccountEstimate(p.id,a.version,{account_id:'123456789012',rate_type:'BEFORE_DISCOUNTS',ttl_days:30})).estimate;assert(est.revision===1,'estimate create');
const est2=(await demoApi.refreshAccountEstimate(p.id,est.estimate_id)).estimate;assert(est2.revision===2,'estimate refresh');
const est3=(await demoApi.extendAccountEstimate(p.id,est.estimate_id,{expected_revision:2,ttl_days:45})).estimate;assert(est3.revision===3,'estimate extend');
const erev=await demoApi.listAccountEstimateRevisions(p.id,est.estimate_id);assert(erev.revisions.length===3,'estimate revisions');
const actual=(await demoApi.createActualCost(p.id,{estimate_id:est.estimate_id,account_id:'123456789012',start_date:'2026-09-01',end_date:'2026-10-01',metric:'UnblendedCost'})).snapshot;assert(actual.revision===1&&actual.status==='final'&&actual.daily_costs.length===1&&actual.api_request_count===1,'actual create');
const actual2=(await demoApi.refreshActualCost(p.id,actual.snapshot_id)).snapshot;assert(actual2.revision===2,'actual refresh');
const arev=await demoApi.listActualCostRevisions(p.id,actual.snapshot_id);assert(arev.revisions.length===2,'actual revisions');
const cur=(await demoApi.importCur2(p.id,{estimate_id:est.estimate_id,account_id:'123456789012',start_date:'2026-09-01',end_date:'2026-10-01',rows:[{service:'AWS Lambda',cost:12.5},{service:'Amazon S3',cost:2.5}]})).snapshot;assert(cur.source==='cur_2_0_import'&&cur.daily_costs.length===2&&cur.api_request_count===0,'CUR import');
const game=await demoApi.gamification(tenant.id);assert(game.leaderboard.length>=1&&game.badges.length>=1,'gamification');
const gdpr=await demoApi.privacyExport();assert(gdpr.subject==='demo-owner','privacy export');
const erase=await demoApi.privacyDelete();assert(erase.deletion_request.status==='blocked_owner','privacy delete flow');
console.log('DEMO M3-R PASS',JSON.stringify({hash:bundle.workspace_sha256.slice(0,12),quote:quote.total_monthly,estimate_revisions:erev.revisions.length,actual_revisions:arev.revisions.length,cur_total:cur.actual_total,badges:game.badges.length}));
