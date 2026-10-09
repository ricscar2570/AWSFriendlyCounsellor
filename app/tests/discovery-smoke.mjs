import assert from 'node:assert/strict';
import { normalizeDiscoveryBundle, discoverySummary, DISCOVERY_FORMAT } from '../js/discovery.js';

const sample={
  format:DISCOVERY_FORMAT,
  format_version:1,
  collector_version:'test',
  generated_at:'2026-10-09T17:00:00Z',
  account:{id:'123456789012',arn:'arn:aws:iam::123456789012:role/ReadOnly'},
  regions:['eu-central-1','eu-central-1'],
  resources:[
    {service:'lambda',type:'function',id:'hello',region:'eu-central-1',arn:'arn:aws:lambda:eu-central-1:123456789012:function:hello'},
    {service:'lambda',type:'function',id:'hello',region:'eu-central-1',arn:'arn:aws:lambda:eu-central-1:123456789012:function:hello'},
    {service:'s3',type:'bucket',id:'example-bucket',region:'global'}
  ],
  errors:[{scope:'eu-west-1:rds',message:'AccessDenied'}]
};
const b=normalizeDiscoveryBundle(sample);
assert.equal(b.resources.length,2,'deduplicates resources');
assert.deepEqual(b.regions,['eu-central-1']);
const s=discoverySummary(b);
assert.equal(s.resource_count,2);
assert.equal(s.service_count,2);
assert.equal(s.error_count,1);
assert.equal(s.services[0][1],1);

assert.throws(()=>normalizeDiscoveryBundle({...sample,account:{id:'123'}}),/12-digit/);
assert.throws(()=>normalizeDiscoveryBundle({...sample,accessKeyId:'AKIA'+'0'.repeat(16)}),/credential-like/i);
assert.throws(()=>normalizeDiscoveryBundle({...sample,format:'other'}),/Unsupported discovery format/);
console.log('DISCOVERY SMOKE PASS');
