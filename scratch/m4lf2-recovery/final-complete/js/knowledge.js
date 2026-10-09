// Deterministic AWS knowledge engine used by the standalone advisor.
// It is intentionally explainable: every recommendation is tied to one or more
// detected workload signals rather than an opaque remote model.

export const KNOWLEDGE_VERSION = 'awsfc-knowledge-2026-10-09-v1';

const SERVICES = [
  {id:'cloudfront',name:'Amazon CloudFront',category:'CDN',base:3,patterns:[/website|web app|frontend|static|global|cdn|edge|image|video/i],why:'Edge delivery, TLS termination and caching.',use:'Static assets and cacheable application traffic.'},
  {id:'route53',name:'Amazon Route 53',category:'Networking',base:1,patterns:[/domain|dns|website|web app|public api/i],why:'Managed DNS and health-aware routing.',use:'Public DNS and routing policies.'},
  {id:'acm',name:'AWS Certificate Manager',category:'Security',base:.2,patterns:[/https|tls|domain|website|api/i],why:'Managed public TLS certificates.',use:'HTTPS for public endpoints.'},
  {id:'api-gateway',name:'Amazon API Gateway',category:'API',base:4,patterns:[/api|rest|http endpoint|webhook|mobile backend|serverless/i],why:'Managed HTTPS API entry point, throttling and request routing.',use:'Public REST/HTTP APIs and webhooks.'},
  {id:'appsync',name:'AWS AppSync',category:'API',base:8,patterns:[/graphql|realtime api|subscriptions/i],why:'Managed GraphQL and realtime subscriptions.',use:'GraphQL APIs and synchronized clients.'},
  {id:'lambda',name:'AWS Lambda',category:'Compute',base:3,patterns:[/serverless|api|webhook|background|event|job|function|cron|automation/i],why:'Serverless request and event processing.',use:'APIs, jobs, event handlers and scheduled work.'},
  {id:'ecs-fargate',name:'Amazon ECS on AWS Fargate',category:'Compute',base:25,patterns:[/container|docker|long[- ]running|worker service|microservice/i],why:'Managed container execution without managing EC2 hosts.',use:'Containerized services and workers.'},
  {id:'eks',name:'Amazon EKS',category:'Compute',base:75,patterns:[/kubernetes|\beks\b|k8s/i],why:'Managed Kubernetes control plane.',use:'Kubernetes workloads requiring ecosystem compatibility.'},
  {id:'ec2',name:'Amazon EC2',category:'Compute',base:35,patterns:[/virtual machine|\bec2\b|legacy server|custom os|gpu server/i],why:'General-purpose virtual machines and custom operating-system control.',use:'Legacy or specialized long-running workloads.'},
  {id:'dynamodb',name:'Amazon DynamoDB',category:'Database',base:6,patterns:[/key[- ]value|document database|serverless database|session|profile|high scale|low latency/i],why:'Serverless low-latency key-value/document storage.',use:'Tenant-scoped application state and high-scale access patterns.'},
  {id:'rds',name:'Amazon RDS',category:'Database',base:35,patterns:[/sql|relational|postgres|postgresql|mysql|mariadb|oracle|transactional/i],why:'Managed relational database.',use:'Transactional relational workloads.'},
  {id:'aurora',name:'Amazon Aurora',category:'Database',base:65,patterns:[/aurora|high availability sql|serverless sql|global database/i],why:'Cloud-native relational database with high availability and scaling options.',use:'Production relational workloads needing stronger resilience.'},
  {id:'elasticache',name:'Amazon ElastiCache',category:'Cache',base:18,patterns:[/redis|memcached|cache|session cache|low latency/i],why:'Managed in-memory cache.',use:'Hot-data caching, sessions, rate limiting and queues.'},
  {id:'s3',name:'Amazon S3',category:'Storage',base:2,patterns:[/file|upload|image|document|object storage|archive|backup|data lake|static/i],why:'Durable object storage.',use:'Uploads, reports, backups, static assets and data lakes.'},
  {id:'efs',name:'Amazon EFS',category:'Storage',base:12,patterns:[/shared file|posix|network file|shared filesystem/i],why:'Managed shared POSIX filesystem.',use:'Shared filesystem workloads across compute instances.'},
  {id:'sqs',name:'Amazon SQS',category:'Integration',base:1,patterns:[/queue|async|asynchronous|background job|worker|decouple/i],why:'Durable asynchronous queue.',use:'Background work and decoupling.'},
  {id:'sns',name:'Amazon SNS',category:'Integration',base:1,patterns:[/fanout|push notification|pubsub|pub-sub|topic/i],why:'Managed fan-out notifications and pub/sub.',use:'Fan-out events and notifications.'},
  {id:'eventbridge',name:'Amazon EventBridge',category:'Integration',base:2,patterns:[/event driven|event-driven|event bus|integration|saas event|schedule/i],why:'Managed event bus and routing.',use:'Domain events, SaaS events and schedules.'},
  {id:'step-functions',name:'AWS Step Functions',category:'Integration',base:4,patterns:[/workflow|orchestration|state machine|multi-step|approval/i],why:'Durable workflow orchestration.',use:'Multi-step processes and compensating workflows.'},
  {id:'kinesis',name:'Amazon Kinesis Data Streams',category:'Streaming',base:20,patterns:[/streaming|real[- ]time event|telemetry stream|clickstream/i],why:'Managed high-throughput streaming ingestion.',use:'Realtime event streams and telemetry.'},
  {id:'ses',name:'Amazon SES',category:'Messaging',base:1,patterns:[/email|transactional mail|newsletter|mail notification/i],why:'Managed transactional and bulk email.',use:'Verification, receipts and application email.'},
  {id:'cognito',name:'Amazon Cognito',category:'Identity',base:2,patterns:[/login|user account|customer account|authentication|signup|sign up|mfa|identity/i],why:'Managed user authentication and MFA.',use:'Customer sign-in and identity federation.'},
  {id:'iam-identity-center',name:'AWS IAM Identity Center',category:'Identity',base:1,patterns:[/workforce|employees|internal users|enterprise sso|sso/i],why:'Central workforce access to AWS accounts and applications.',use:'Employee/workforce SSO.'},
  {id:'waf',name:'AWS WAF',category:'Security',base:8,patterns:[/public|internet|website|api|e-commerce|checkout|security|rate limit/i],why:'Layer-7 filtering and rate protection.',use:'Protect public web and API endpoints.'},
  {id:'shield',name:'AWS Shield',category:'Security',base:3,patterns:[/ddos|high profile public|internet facing/i],why:'DDoS protection for public AWS resources.',use:'Internet-facing resilience.'},
  {id:'kms',name:'AWS KMS',category:'Security',base:1,patterns:[/encrypt|encryption|key management|sensitive|pii|financial|health/i],why:'Managed encryption keys and cryptographic controls.',use:'Encryption at rest and key lifecycle.'},
  {id:'secrets-manager',name:'AWS Secrets Manager',category:'Security',base:2,patterns:[/secret|password|database credential|api key|credential/i],why:'Managed secret storage and rotation.',use:'Database passwords and API credentials.'},
  {id:'cloudwatch',name:'Amazon CloudWatch',category:'Observability',base:4,patterns:[/monitor|observability|logs|metrics|alarm|production|api|worker|service/i],why:'Metrics, logs, dashboards and alarms.',use:'Operations and alerting.'},
  {id:'xray',name:'AWS X-Ray',category:'Observability',base:3,patterns:[/trace|distributed|microservice|latency|debug/i],why:'Distributed tracing for request paths.',use:'Latency and dependency troubleshooting.'},
  {id:'opensearch',name:'Amazon OpenSearch Service',category:'Search',base:30,patterns:[/search|full text|full-text|log analytics|opensearch|elasticsearch/i],why:'Managed search and analytics engine.',use:'Application search and log analytics.'},
  {id:'glue',name:'AWS Glue',category:'Analytics',base:15,patterns:[/etl|data catalog|data lake|transform data/i],why:'Managed data catalog and ETL.',use:'Data-lake cataloging and transformation.'},
  {id:'athena',name:'Amazon Athena',category:'Analytics',base:5,patterns:[/sql on s3|data lake|ad hoc query|analytics/i],why:'Serverless SQL over S3.',use:'Ad-hoc analytics over object data.'},
  {id:'redshift',name:'Amazon Redshift',category:'Analytics',base:80,patterns:[/warehouse|data warehouse|bi|business intelligence|olap/i],why:'Managed analytical data warehouse.',use:'Large-scale BI and analytical workloads.'},
  {id:'quicksight',name:'Amazon QuickSight',category:'Analytics',base:10,patterns:[/dashboard|business intelligence|\bbi\b|visualization|reporting/i],why:'Managed BI dashboards and reporting.',use:'Business dashboards and embedded analytics.'},
  {id:'sagemaker',name:'Amazon SageMaker',category:'Machine Learning',base:50,patterns:[/machine learning|\bml\b|training|model hosting|inference/i],why:'Managed ML training, deployment and lifecycle tooling.',use:'Model training and managed inference.'},
  {id:'bedrock',name:'Amazon Bedrock',category:'Generative AI',base:25,patterns:[/generative ai|genai|llm|chatbot|foundation model|rag/i],why:'Managed foundation-model APIs and generative-AI building blocks.',use:'LLM inference, agents and RAG workflows.'},
  {id:'iot-core',name:'AWS IoT Core',category:'IoT',base:15,patterns:[/iot|device|mqtt|sensor|telemetry device/i],why:'Managed device connectivity and messaging.',use:'Secure device messaging and IoT ingestion.'}
];


const NB_TRAINING={
  'e-commerce':['online shop shopping cart checkout product catalog orders payments','e commerce storefront products customers purchases fulfillment'],
  'saas':['multi tenant saas subscription customer workspace billing dashboard','business software users organizations accounts admin portal'],
  'data-platform':['analytics dashboard data pipeline metrics reporting warehouse','business intelligence events reporting data lake etl'],
  'mobile-backend':['mobile app ios android backend push notifications users','mobile application api authentication uploads notifications'],
  'api-service':['public rest api webhooks backend service integrations','graphql api endpoints microservices requests clients'],
  'real-time':['realtime chat websocket collaboration messages live updates','real time messaging presence synchronized clients'],
  'file-storage':['file upload document storage media image video library','documents uploads photos durable object storage'],
  'web-application':['web application website customer portal authentication dashboard','browser based portal forms users content'],
  'generative-ai':['generative ai llm chatbot foundation model rag prompt inference','bedrock agent embeddings retrieval augmented generation'],
  'iot-platform':['iot mqtt sensor devices telemetry fleet gateway','connected device message telemetry mqtt backend']
};
function tokens(text){return String(text||'').toLowerCase().match(/[a-z0-9]+/g)||[];}
const NB_MODEL=(()=>{const counts={},totals={},vocab=new Set();for(const [label,rows] of Object.entries(NB_TRAINING)){const c=new Map(),ts=[];for(const row of rows)ts.push(...tokens(row));for(const t of ts){c.set(t,(c.get(t)||0)+1);vocab.add(t)}counts[label]=c;totals[label]=ts.length}return {counts,totals,vocab:[...vocab]};})();
function nbProbabilities(text){const ts=tokens(text);if(!ts.length)return {'web-application':1};const labels=Object.keys(NB_MODEL.counts),V=Math.max(1,NB_MODEL.vocab.length),prior=1/labels.length,scores={};for(const label of labels){let score=Math.log(prior),total=NB_MODEL.totals[label],c=NB_MODEL.counts[label];for(const t of ts)score+=Math.log(((c.get(t)||0)+1)/(total+V));scores[label]=score}const peak=Math.max(...Object.values(scores)),weights=Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,Math.exp(v-peak)])),denom=Object.values(weights).reduce((a,b)=>a+b,0)||1;return Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,+((v/denom).toFixed(6))]));}

const PROJECT_TYPES = [
  ['e-commerce',/shop|commerce|cart|checkout|store|order/i],
  ['machine-learning',/machine learning|\bml\b|model|inference|training/i],
  ['generative-ai',/generative ai|genai|llm|chatbot|foundation model|rag/i],
  ['data-platform',/data lake|etl|analytics|warehouse|business intelligence|\bbi\b/i],
  ['iot-platform',/iot|mqtt|sensor|device telemetry/i],
  ['mobile-backend',/mobile|ios|android/i],
  ['api-service',/api|backend|webhook/i]
];

const FEATURE_RULES = [
  ['authentication',/login|authentication|signup|sign up|mfa|user account/i],
  ['file-storage',/file|upload|image|document|object storage/i],
  ['asynchronous-work',/queue|async|background|worker|job/i],
  ['relational-data',/sql|relational|postgres|mysql|transaction/i],
  ['search',/search|full[- ]text|elasticsearch|opensearch/i],
  ['events',/event driven|event-driven|event bus|pubsub|pub-sub/i],
  ['streaming',/streaming|clickstream|real[- ]time event/i],
  ['analytics',/analytics|dashboard|warehouse|bi|reporting/i],
  ['sensitive-data',/pii|health|medical|financial|payment|sensitive|secret/i],
  ['containers',/container|docker|kubernetes|k8s/i],
  ['multi-region',/multi[- ]region|global active|disaster recovery|dr\b/i],
  ['realtime',/realtime|real-time|websocket|subscriptions/i],
  ['email',/email|mail/i]
];

function uniq(items){return [...new Set(items)];}

export function analyzeKnowledge(description='') {
  const text=String(description||'');
  const ruleMatches=PROJECT_TYPES.filter(([,re])=>re.test(text));
  const rulePrimary=(ruleMatches[0]||['web-application'])[0];
  const ruleConfidence=Math.min(.96,.45+ruleMatches.length*.12+Math.min(4,tokens(text).length/12)*.08);
  const ml_probabilities=nbProbabilities(text),ml_primary=Object.keys(ml_probabilities).sort((a,b)=>ml_probabilities[b]-ml_probabilities[a])[0]||'web-application',ml_confidence=Number(ml_probabilities[ml_primary]||0);
  const project_type=ruleConfidence>=.62?rulePrimary:ml_primary;
  const confidence=Math.min(.98,Math.max(ruleConfidence,ml_confidence)*.75+Math.min(ruleConfidence,ml_confidence)*.25);
  const features=FEATURE_RULES.filter(([,re])=>re.test(text)).map(([name])=>name);
  const matches=[];
  for(const service of SERVICES){
    const hit=service.patterns.some(re=>re.test(text));
    if(hit)matches.push({...service,signals:service.patterns.filter(re=>re.test(text)).map(re=>re.source)});
  }
  const core=/website|web app|saas|api|backend|mobile|portal|e-commerce|shop|customer/i.test(text)
    ? ['cloudfront','api-gateway','lambda','cloudwatch','waf'] : ['cloudwatch'];
  if(/login|user|customer|account|saas|e-commerce|shop/i.test(text))core.push('cognito');
  if(/saas|profile|session|metadata|api|backend/i.test(text)&&!/sql|relational|postgres|mysql/i.test(text))core.push('dynamodb');
  const byId=new Map(SERVICES.map(s=>[s.id,s]));
  const selected=uniq([...core,...matches.map(m=>m.id)]).map(id=>byId.get(id)).filter(Boolean);
  const risks=[];
  if(/public|website|api|e-commerce|shop|internet/i.test(text)&&!selected.some(s=>s.id==='waf'))risks.push({severity:'high',title:'Public endpoint protection missing',recommendation:'Add WAF/rate limiting and explicit abuse controls.'});
  if(features.includes('sensitive-data')){
    if(!selected.some(s=>s.id==='kms'))risks.push({severity:'high',title:'Sensitive data without explicit key-management plan',recommendation:'Define KMS keys, data classification and retention.'});
    if(!selected.some(s=>s.id==='secrets-manager'))risks.push({severity:'medium',title:'Secret lifecycle not specified',recommendation:'Use a managed secret store and rotation policy.'});
  }
  if(/single region|single-region/i.test(text)&&/mission critical|critical|24\/7|high availability/i.test(text))risks.push({severity:'high',title:'Availability requirement conflicts with stated topology',recommendation:'Add multi-AZ recovery and evaluate multi-region DR.'});
  if(selected.some(s=>s.id==='eks')&&!/kubernetes expertise|platform team|sre|devops team/i.test(text))risks.push({severity:'medium',title:'Kubernetes operational overhead',recommendation:'Confirm a platform-operations need before choosing EKS over ECS/Fargate or serverless.'});
  const wellArchitected=[
    {pillar:'Operational Excellence',status:selected.some(s=>s.id==='cloudwatch')?'covered':'gap',note:'Metrics/logging and operational feedback loop.'},
    {pillar:'Security',status:selected.some(s=>['waf','kms','cognito','secrets-manager'].includes(s.id))?'partial':'gap',note:'Identity, edge controls, encryption and secret lifecycle.'},
    {pillar:'Reliability',status:/backup|disaster recovery|multi[- ]region|high availability/i.test(text)?'partial':'review',note:'Define measured RPO/RTO and recovery drills.'},
    {pillar:'Performance Efficiency',status:selected.some(s=>['cloudfront','elasticache','dynamodb','aurora'].includes(s.id))?'partial':'review',note:'Validate latency targets and scaling characteristics.'},
    {pillar:'Cost Optimization',status:'covered',note:'Explicit usage model and scenario comparison are available.'},
    {pillar:'Sustainability',status:/serverless|managed/i.test(text)?'partial':'review',note:'Prefer right-sized managed services and remove idle capacity.'}
  ];
  return {project_type,confidence:+confidence.toFixed(2),features:uniq([project_type,...features]).slice(0,8),services:selected,risks,wellArchitected,knowledge_version:KNOWLEDGE_VERSION,classifier:'hybrid_rules_nb_v2',ml_primary,ml_probabilities};
}

export function serviceByName(name){return SERVICES.find(s=>s.name===name)||null;}
export function serviceById(id){return SERVICES.find(s=>s.id===id)||null;}
export function knowledgeCatalog(){return SERVICES.map(({patterns,...s})=>s);}
