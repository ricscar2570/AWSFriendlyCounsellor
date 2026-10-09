import assert from 'node:assert/strict';
import {
  normalizeDiscoveryBundle,
  discoverySummary,
  buildArchitectureGraph,
  DISCOVERY_FORMAT,
  DISCOVERY_VERSION
} from '../js/discovery.js';

const sample={
  format:DISCOVERY_FORMAT,
  format_version:DISCOVERY_VERSION,
  collector_version:'test-m5a2',
  generated_at:'2026-10-09T17:00:00Z',
  account:{id:'123456789012',arn:'arn:aws:iam::123456789012:role/ReadOnly'},
  regions:['eu-central-1','eu-central-1'],
  resources:[
    {service:'ec2',type:'vpc',id:'vpc-1',region:'eu-central-1'},
    {service:'ec2',type:'subnet',id:'subnet-1',region:'eu-central-1',metadata:{vpc_id:'vpc-1'}},
    {service:'lambda',type:'function',id:'hello',region:'eu-central-1',arn:'arn:aws:lambda:eu-central-1:123456789012:function:hello',metadata:{subnet_ids:['subnet-1']}},
    {service:'lambda',type:'function',id:'hello',region:'eu-central-1',arn:'arn:aws:lambda:eu-central-1:123456789012:function:hello'},
    {service:'apigateway',type:'v2-api',id:'api-1',region:'eu-central-1'}
  ],
  relationships:[
    {
      source:{service:'apigateway',type:'v2-api',id:'api-1',region:'eu-central-1'},
      target:{service:'lambda',type:'function',id:'hello',region:'eu-central-1'},
      kind:'invokes',
      confidence:'observed',
      evidence:'API Gateway v2 integration'
    },
    {
      source:{service:'lambda',type:'function',id:'hello',region:'eu-central-1'},
      target:{service:'external',type:'dns-name',id:'example.internal',region:'global'},
      kind:'calls',
      confidence:'observed',
      evidence:'test external target'
    }
  ],
  errors:[{scope:'eu-west-1:rds',message:'AccessDenied'}]
};

const b=normalizeDiscoveryBundle(sample);
assert.equal(b.resources.length,4,'deduplicates resources');
assert.deepEqual(b.regions,['eu-central-1']);
assert.equal(b.normalized_format_version,2);
assert.ok(b.relationships.some(x=>x.kind==='invokes'),'explicit relationship retained');
assert.ok(b.relationships.some(x=>x.kind==='uses-subnet'),'metadata relationship derived');
assert.ok(b.relationships.some(x=>x.kind==='member-of-vpc'),'subnet-to-vpc relationship derived');

const g=buildArchitectureGraph(b);
assert.equal(g.nodes.length,4);
assert.ok(g.edges.length>=4);
assert.equal(g.unresolved.length,1,'external target remains unresolved rather than fabricated');

const s=discoverySummary(b);
assert.equal(s.resource_count,4);
assert.equal(s.relationship_count,g.edges.length);
assert.equal(s.unresolved_relationship_count,1);
assert.equal(s.error_count,1);
assert.ok(s.relationship_types.some(([kind])=>kind==='invokes'));

// M5-A2 keeps M5-A1/v1 inventory bundles backward compatible and derives basic topology.
const legacy=normalizeDiscoveryBundle({...sample,format_version:1,relationships:undefined});
assert.equal(legacy.format_version,1);
assert.ok(legacy.relationships.some(x=>x.kind==='uses-subnet'));

assert.throws(()=>normalizeDiscoveryBundle({...sample,account:{id:'123'}}),/12-digit/);
assert.throws(()=>normalizeDiscoveryBundle({...sample,accessKeyId:'AKIA'+'0'.repeat(16)}),/credential-like/i);
assert.throws(()=>normalizeDiscoveryBundle({...sample,format:'other'}),/Unsupported discovery format/);
assert.throws(()=>normalizeDiscoveryBundle({...sample,format_version:99}),/Unsupported discovery format version/);
console.log('DISCOVERY RELATIONSHIP SMOKE PASS');
