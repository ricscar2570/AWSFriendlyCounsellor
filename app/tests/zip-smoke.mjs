import {writeFile} from 'node:fs/promises';
import {zipFiles} from '../js/zip.js';
const blob=zipFiles({'main.tf':'terraform {}\n','variables.tf':'variable "x" {}\n','README.md':'# Test\n'});
const bytes=new Uint8Array(await blob.arrayBuffer());
if(bytes.length<100)throw new Error('ZIP unexpectedly small');
await writeFile('/tmp/awsfc-terraform.zip',bytes);
console.log('ZIP GENERATED',bytes.length);
