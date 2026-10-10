export const ASSESSMENT_FORMAT='awsfc-desired-vs-actual';
export const ASSESSMENT_VERSION=1;

const PROJECT_TAG_KEY='AWSFCProjectId';

function text(v,max=500){return String(v??'').trim().slice(0,max)}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)}
function keyOf(r){return [text(r?.service,80).toLowerCase(),text(r?.type,160),text(r?.region||'global',80),text(r?.id,1024)].join('|')}
function lowerTags(tags){const out={};for(const [k,v] of Object.entries(obj(tags)?tags:{}))out[String(k).toLowerCase()]=String(v);return out}
function hasProjectTag(r,projectId){const t=lowerTags(r?.tags);return t[PROJECT_TAG_KEY.toLowerCase()]===String(projectId)}
function uniq(a){return [...new Set(a)]}
function isoAgeDays(v){const t=Date.parse(v);return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null}
function severityRank(s){return ({critical:5,high:4,medium:3,low:2,info:1}[s]||0)}

const RULES={
  cloudfront:{label:'Amazon CloudFront',tokens:['cloudfront'],match:r=>r.service==='cloudfront'&&r.type==='distribution'},
  route53:{label:'Amazon Route 53',tokens:['route53'],match:r=>r.service==='route53'&&r.type==='hosted-zone'},
  'api-gateway':{label:'Amazon API Gateway',tokens:['apigateway','apigatewayv2'],match:r=>r.service==='apigateway'&&['rest-api','v2-api'].includes(r.type)},
  lambda:{label:'AWS Lambda',tokens:['lambda'],match:r=>r.service==='lambda'&&r.type==='function'},
  'ecs-fargate':{
    label:'Amazon ECS on AWS Fargate',tokens:['ecs'],
    match:r=>r.service==='ecs'&&r.type==='service'&&(
      String(r.metadata?.launch_type||'').toUpperCase()==='FARGATE'||
      (r.metadata?.capacity_providers||[]).some(x=>/^FARGATE(?:_SPOT)?$/i.test(String(x)))
    ),
    partial:r=>r.service==='ecs'&&r.type==='service'
  },
  eks:{label:'Amazon EKS',tokens:['eks'],match:r=>r.service==='eks'&&r.type==='cluster'},
  ec2:{label:'Amazon EC2',tokens:['ec2'],match:r=>r.service==='ec2'&&r.type==='instance'},
  dynamodb:{label:'Amazon DynamoDB',tokens:['dynamodb'],match:r=>r.service==='dynamodb'&&r.type==='table'},
  rds:{label:'Amazon RDS',tokens:['rds'],match:r=>r.service==='rds'&&r.type==='db-instance'},
  aurora:{label:'Amazon Aurora',tokens:['rds'],match:r=>r.service==='rds'&&r.type==='db-cluster'&&/^aurora/i.test(String(r.metadata?.engine||''))},
  s3:{label:'Amazon S3',tokens:['s3'],match:r=>r.service==='s3'&&r.type==='bucket'},
  sqs:{label:'Amazon SQS',tokens:['sqs'],match:r=>r.service==='sqs'&&r.type==='queue'},
  sns:{label:'Amazon SNS',tokens:['sns'],match:r=>r.service==='sns'&&r.type==='topic'},
  eventbridge:{label:'Amazon EventBridge',tokens:['eventbridge','events'],match:r=>r.service==='eventbridge'&&r.type==='rule'},
  cognito:{label:'Amazon Cognito',tokens:['cognito-idp','cognito'],match:r=>r.service==='cognito'&&r.type==='user-pool'},
  waf:{label:'AWS WAF',tokens:['wafv2','waf'],match:r=>r.service==='wafv2'&&r.type==='web-acl'},
  cloudwatch:{label:'Amazon CloudWatch',tokens:['cloudwatch'],match:r=>r.service==='cloudwatch'&&['metric-alarm','composite-alarm'].includes(r.type),semantic:'alarm-evidence'}
};

function isTagCoverageScope(scope=''){
  const s=String(scope).toLowerCase();
  return s.includes('resourcegroupstaggingapi')||s.endsWith(':tags')||s.includes(':tags:');
}
function coverageGap(discovery,rule,region){
  if(!rule)return true;
  const errors=Array.isArray(discovery?.errors)?discovery.errors:[];
  return errors.some(e=>{
    const s=String(e?.scope||'').toLowerCase();
    if(isTagCoverageScope(s))return false;
    const tokenHit=(rule.tokens||[]).some(t=>s.includes(String(t).toLowerCase()));
    if(!tokenHit)return false;
    return !region||s.includes(String(region).toLowerCase())||!/^([a-z]{2}-[a-z0-9-]+-\d):/.test(s);
  });
}

function buildScope(project,discovery,graph){
  const resources=Array.isArray(discovery?.resources)?discovery.resources:[];
  const tagCoverageGaps=(Array.isArray(discovery?.errors)?discovery.errors:[]).filter(e=>String(e?.scope||'').toLowerCase().includes('resourcegroupstaggingapi'));
  const tagged=resources.filter(r=>hasProjectTag(r,project.id));
  const allByKey=new Map(resources.map(r=>[keyOf(r),r]));
  if(tagged.length){
    const primary=new Set(tagged.map(keyOf)),evidence=new Set(primary);
    for(const edge of graph?.edges||[]){
      if(primary.has(edge.source_key)||primary.has(edge.target_key)){
        if(allByKey.has(edge.source_key))evidence.add(edge.source_key);
        if(allByKey.has(edge.target_key))evidence.add(edge.target_key);
      }
    }
    const confidence=tagCoverageGaps.length?'medium':'high';
    return {
      mode:'project-tagged',
      confidence,
      tag_coverage_gap_count:tagCoverageGaps.length,
      project_tag_key:PROJECT_TAG_KEY,
      project_tag_value:String(project.id),
      primary_resources:[...primary].map(k=>allByKey.get(k)).filter(Boolean),
      resources:[...evidence].map(k=>allByKey.get(k)).filter(Boolean),
      primary_keys:primary,
      evidence_keys:evidence,
      reason:tagCoverageGaps.length
        ?'Project tags were observed, but some tag-reading calls failed; resources shown are project evidence but absence is not definitive.'
        :'Resources explicitly tagged for this AWS Friendly Counsellor project, plus directly connected AWS resources.'
    };
  }
  const region=String(project.region||'');
  const regional=resources.filter(r=>r.region===region||r.region==='global');
  return {
    mode:'regional-account-fallback',
    confidence:'low',
    tag_coverage_gap_count:tagCoverageGaps.length,
    project_tag_key:PROJECT_TAG_KEY,
    project_tag_value:String(project.id),
    primary_resources:regional,
    resources:regional,
    primary_keys:new Set(regional.map(keyOf)),
    evidence_keys:new Set(regional.map(keyOf)),
    reason:'No project tag was found. Account resources from the project region/global scope are only candidate evidence and are not proof that they belong to this project.'
  };
}

function desiredServiceIds(analysisVersion,scenarioName){
  const result=analysisVersion?.result||{};
  const scenarios=Array.isArray(result.scenarios)?result.scenarios:[];
  const chosen=scenarios.find(x=>x.name===scenarioName)||scenarios.find(x=>x.name==='balanced')||null;
  const ids=chosen?.service_ids?.length?chosen.service_ids:(result.services||[]).map(x=>x.id).filter(Boolean);
  return {scenario:chosen?.name||scenarioName||'balanced',ids:uniq(ids),scenario_record:chosen};
}

function serviceAlignment(ids,scope,discovery,project){
  return ids.map(id=>{
    const rule=RULES[id]||null;
    if(!rule){
      return {service_id:id,label:id,status:'unknown',confidence:'none',reason:'This discovery collector does not yet establish this service reliably.',matches:[]};
    }
    const matches=scope.resources.filter(rule.match);
    const partial=rule.partial?scope.resources.filter(rule.partial):[];
    if(matches.length){
      const projectScoped=scope.mode==='project-tagged';
      return {service_id:id,label:rule.label,status:projectScoped?'observed':'candidate',confidence:scope.confidence,reason:projectScoped?'Observed inside project-tagged evidence scope; tag-read gaps may still limit completeness.':'Observed in regional/account evidence, but project ownership is not proven.',matches:matches.map(r=>({service:r.service,type:r.type,id:r.id,region:r.region,name:r.name||null}))};
    }
    if(partial.length){
      return {service_id:id,label:rule.label,status:'partial',confidence:scope.confidence,reason:'Related AWS resources are observed, but the collector evidence does not prove the exact desired variant.',matches:partial.map(r=>({service:r.service,type:r.type,id:r.id,region:r.region,name:r.name||null}))};
    }
    if(coverageGap(discovery,rule,project.region)){
      return {service_id:id,label:rule.label,status:'unknown',confidence:'incomplete',reason:'Relevant discovery calls had coverage gaps, so absence cannot be asserted.',matches:[]};
    }
    if(scope.confidence!=='high'){
      return {service_id:id,label:rule.label,status:'unknown',confidence:'low',reason:'No project tag establishes a project-specific evidence boundary; absence in regional/account data is not a reliable gap.',matches:[]};
    }
    return {service_id:id,label:rule.label,status:'missing',confidence:'high',reason:'No matching resource was observed in the project-tagged evidence scope.',matches:[]};
  });
}

function publicIngress(resources){
  return resources.filter(r=>
    (r.service==='cloudfront'&&r.type==='distribution')||
    (r.service==='apigateway'&&['rest-api','v2-api'].includes(r.type))||
    (r.service==='elasticloadbalancing'&&r.type==='load-balancer'&&String(r.metadata?.scheme||'')==='internet-facing')
  );
}

function finding(id,severity,category,title,desired,actual,evidence,recommendation,confidence='high'){
  return {id,severity,category,title,desired,actual,evidence,recommendation,confidence,status:'open'};
}

function findings({project,analysisVersion,scenario,scope,discovery,graph,alignment}){
  const out=[];
  if(scope.confidence==='high'){
    for(const a of alignment){
      if(a.status==='missing'&&!['waf','cloudwatch'].includes(a.service_id)){
        out.push(finding(
          `svc-${a.service_id}`,'low','architecture',
          `${a.label} recommended but not observed`,
          `${a.label} is part of the ${scenario} desired architecture.`,
          'No matching project-scoped resource was discovered.',
          'Project-tagged inventory comparison.',
          'Review whether the workload intentionally uses an alternative architecture or whether this component is genuinely absent.',
          'medium'
        ));
      }
    }

    if(alignment.some(a=>a.service_id==='waf')){
      const rule=RULES.waf;
      if(!coverageGap(discovery,rule,project.region)){
        const ingress=publicIngress(scope.resources);
        const protectedKeys=new Set((graph?.edges||[]).filter(e=>e.kind==='protected-by-waf').map(e=>e.source_key));
        const unprotected=ingress.filter(r=>!protectedKeys.has(keyOf(r)));
        if(unprotected.length){
          out.push(finding(
            'waf-public-ingress','high','security',
            'Public ingress without observed WAF association',
            'The desired architecture includes AWS WAF for public-facing endpoints.',
            `${unprotected.length} public ingress resource(s) in the project scope have no observed protected-by-waf edge.`,
            unprotected.map(r=>`${r.service}:${r.type}:${r.id}`),
            'Confirm whether WAF is associated through another path; otherwise add an appropriate Web ACL and validate the association.',
            'high'
          ));
        }
      }
    }

    if(alignment.some(a=>a.service_id==='cloudwatch')){
      const rule=RULES.cloudwatch;
      if(!coverageGap(discovery,rule,project.region)){
        const alarms=scope.resources.filter(rule.match);
        if(!alarms.length){
          out.push(finding(
            'cloudwatch-no-alarms','medium','operational-excellence',
            'No project-scoped CloudWatch alarms observed',
            'The desired architecture includes CloudWatch operational feedback.',
            'No tagged or directly connected CloudWatch metric/composite alarm was observed.',
            'CloudWatch describe-alarms evidence.',
            'Define actionable alarms for the workload. Logs or metrics may still exist; this finding is specifically about alarm evidence.',
            'medium'
          ));
        }
      }
    }

    if(scenario==='resilient'){
      const singleAz=scope.resources.filter(r=>r.service==='rds'&&r.type==='db-instance'&&r.metadata?.multi_az===false);
      if(singleAz.length&&!coverageGap(discovery,RULES.rds,project.region)){
        out.push(finding(
          'rds-single-az','high','reliability',
          'RDS instance is not Multi-AZ in the resilient scenario',
          'The resilient scenario expects stronger recovery and availability controls.',
          `${singleAz.length} RDS DB instance(s) report MultiAZ=false.`,
          singleAz.map(r=>r.id),
          'Review availability requirements and enable Multi-AZ where appropriate; document an intentional exception if single-AZ is acceptable.',
          'high'
        ));
      }
    }

    const scopedUnresolved=(graph?.unresolved||[]).filter(e=>scope.evidence_keys.has(e.source_key)||scope.evidence_keys.has(e.target_key));
    if(scopedUnresolved.length){
      out.push(finding(
        'unresolved-topology','low','evidence-quality',
        'Some project topology edges remain unresolved',
        'Desired-vs-actual comparison benefits from a fully correlated architecture graph.',
        `${scopedUnresolved.length} relationship(s) reference an external or undiscovered endpoint.`,
        scopedUnresolved.slice(0,20).map(e=>({kind:e.kind,source:e.source,target:e.target})),
        'Review coverage gaps and external dependencies before treating the graph as complete.',
        'high'
      ));
    }
  }
  return out.sort((a,b)=>severityRank(b.severity)-severityRank(a.severity)||a.title.localeCompare(b.title));
}

export function buildDesiredVsActual({project,analysisVersion,discovery,graph=null,scenario='balanced'}){
  if(!obj(project)||!project.id)throw new Error('Assessment requires a project.');
  if(!obj(analysisVersion)||!analysisVersion.result)throw new Error('Assessment requires a persisted analysis version.');
  if(!obj(discovery)||!Array.isArray(discovery.resources))throw new Error('Assessment requires imported AWS discovery evidence.');
  const graphValue=graph||{nodes:discovery.resources,edges:discovery.relationships||[],unresolved:[]};
  const desired=desiredServiceIds(analysisVersion,scenario);
  const scope=buildScope(project,discovery,graphValue);
  const alignment=serviceAlignment(desired.ids,scope,discovery,project);
  const actualFindings=findings({project,analysisVersion,scenario:desired.scenario,scope,discovery,graph:graphValue,alignment});
  const observed=alignment.filter(a=>a.status==='observed').length;
  const candidate=alignment.filter(a=>a.status==='candidate').length;
  const partial=alignment.filter(a=>a.status==='partial').length;
  const missing=alignment.filter(a=>a.status==='missing').length;
  const unknown=alignment.filter(a=>a.status==='unknown').length;
  const assessable=observed+missing+partial;
  const score=scope.confidence==='high'&&assessable?Math.round(((observed+partial*.5)/assessable)*100):null;
  const ageDays=isoAgeDays(discovery.generated_at);
  const limitations=[];
  if(scope.mode==='regional-account-fallback')limitations.push(`No resources tagged ${PROJECT_TAG_KEY}=${project.id} were found. Service presence is only candidate account/region evidence and absence is not treated as a project gap.`);
  if(scope.mode==='project-tagged'&&scope.confidence!=='high')limitations.push(`${scope.tag_coverage_gap_count} tag-reading coverage gap(s) prevent a definitive missing-resource assessment even though project tags were observed.`);
  if((discovery.errors||[]).length)limitations.push(`${discovery.errors.length} discovery coverage gap(s) were recorded; affected services are marked unknown rather than missing.`);
  if(ageDays!==null&&ageDays>=7)limitations.push(`Discovery evidence is ${ageDays} day(s) old; refresh it before making deployment or remediation decisions.`);
  if(unknown)limitations.push(`${unknown} desired service(s) cannot currently be verified with this collector/evidence scope.`);
  return {
    format:ASSESSMENT_FORMAT,
    format_version:ASSESSMENT_VERSION,
    generated_at:new Date().toISOString(),
    project:{id:project.id,name:project.name,region:project.region},
    workspace_version:Number(analysisVersion.version),
    scenario:desired.scenario,
    desired:{service_ids:desired.ids,scenario:desired.scenario_record||null},
    actual:{
      account_id:discovery.account?.id||null,
      discovery_generated_at:discovery.generated_at||null,
      collector_version:discovery.collector_version||null,
      discovery_format_version:discovery.format_version||null,
      resource_count:(discovery.resources||[]).length,
      relationship_count:(discovery.relationships||[]).length,
      coverage_gap_count:(discovery.errors||[]).length
    },
    scope:{
      mode:scope.mode,
      confidence:scope.confidence,
      reason:scope.reason,
      project_tag_key:scope.project_tag_key,
      project_tag_value:scope.project_tag_value,
      tag_coverage_gap_count:scope.tag_coverage_gap_count||0,
      primary_resource_count:scope.primary_resources.length,
      evidence_resource_count:scope.resources.length
    },
    summary:{
      alignment_percent:score,
      observed,
      candidate,
      partial,
      missing,
      unknown,
      desired_service_count:alignment.length,
      finding_count:actualFindings.length,
      high_or_critical_findings:actualFindings.filter(f=>['high','critical'].includes(f.severity)).length
    },
    service_alignment:alignment,
    findings:actualFindings,
    limitations
  };
}
