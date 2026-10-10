import assert from 'node:assert/strict';
import { buildDesiredVsActual, ASSESSMENT_FORMAT } from '../js/assessment.js';
import { normalizeDiscoveryBundle, buildArchitectureGraph } from '../js/discovery.js';

const project={id:'project-1',name:'Payments API',region:'eu-central-1'};
const analysisVersion={
  version:3,
  result:{
    services:[
      {id:'api-gateway'},{id:'lambda'},{id:'rds'},{id:'waf'},{id:'cloudwatch'}
    ],
    scenarios:[
      {name:'essential',service_ids:['api-gateway','lambda','rds']},
      {name:'balanced',service_ids:['api-gateway','lambda','rds','waf','cloudwatch']},
      {name:'resilient',service_ids:['api-gateway','lambda','rds','waf','cloudwatch']}
    ]
  }
};
const tag={AWSFCProjectId:'project-1'};
const discovery=normalizeDiscoveryBundle({
  format:'awsfc-aws-discovery',
  format_version:2,
  collector_version:'assessment-test',
  generated_at:new Date().toISOString(),
  account:{id:'123456789012'},
  regions:['eu-central-1'],
  resources:[
    {service:'apigateway',type:'v2-api',id:'api-1',region:'eu-central-1',tags:tag},
    {service:'lambda',type:'function',id:'fn-1',region:'eu-central-1',tags:tag},
    {service:'rds',type:'db-instance',id:'db-1',region:'eu-central-1',tags:tag,metadata:{multi_az:false}},
    {service:'ec2',type:'vpc',id:'vpc-1',region:'eu-central-1'}
  ],
  relationships:[
    {source:{service:'apigateway',type:'v2-api',id:'api-1',region:'eu-central-1'},target:{service:'lambda',type:'function',id:'fn-1',region:'eu-central-1'},kind:'invokes',evidence:'test'}
  ],
  errors:[]
});
const graph=buildArchitectureGraph(discovery);
const a=buildDesiredVsActual({project,analysisVersion,discovery,graph,scenario:'resilient'});
assert.equal(a.format,ASSESSMENT_FORMAT);
assert.equal(a.scope.mode,'project-tagged');
assert.equal(a.scope.confidence,'high');
assert.equal(a.summary.observed,3);
assert.equal(a.summary.missing,2);
assert.equal(a.summary.alignment_percent,60);
assert.ok(a.findings.some(f=>f.id==='waf-public-ingress'&&f.severity==='high'),'WAF gap expected');
assert.ok(a.findings.some(f=>f.id==='cloudwatch-no-alarms'),'CloudWatch alarm finding expected');
assert.ok(a.findings.some(f=>f.id==='rds-single-az'),'Resilient RDS finding expected');

const gapDiscovery=normalizeDiscoveryBundle({
  ...discovery,
  errors:[{scope:'eu-central-1:wafv2',message:'AccessDenied'}]
});
const gapAssessment=buildDesiredVsActual({project,analysisVersion,discovery:gapDiscovery,graph:buildArchitectureGraph(gapDiscovery),scenario:'balanced'});
const waf=gapAssessment.service_alignment.find(x=>x.service_id==='waf');
assert.equal(waf.status,'unknown','WAF must be unknown when discovery coverage is incomplete');
assert.ok(!gapAssessment.findings.some(f=>f.id==='waf-public-ingress'),'do not assert WAF gap through AccessDenied');

const noTag=normalizeDiscoveryBundle({
  ...discovery,
  resources:discovery.resources.map(r=>({...r,tags:{}})),
  errors:[]
});
const fallback=buildDesiredVsActual({project,analysisVersion,discovery:noTag,graph:buildArchitectureGraph(noTag),scenario:'balanced'});
assert.equal(fallback.scope.mode,'regional-account-fallback');
assert.equal(fallback.scope.confidence,'low');
assert.equal(fallback.summary.alignment_percent,null);
assert.ok(fallback.service_alignment.some(x=>x.status==='candidate'));
assert.equal(fallback.findings.length,0,'regional fallback must not produce project-specific gap findings');

console.log('ASSESSMENT SMOKE PASS',JSON.stringify({
  alignment:a.summary.alignment_percent,
  findings:a.findings.length,
  scope:a.scope.mode,
  coverageAware:waf.status
}));
