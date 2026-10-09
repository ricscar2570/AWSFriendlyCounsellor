import {gzipSync} from 'node:zlib';
const {parseCostFile,normalizeCostRow}=await import('../js/cur-parser.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const csv='line_item_usage_start_date,product_product_name,line_item_unblended_cost,line_item_currency_code\n2026-10-01T01:00:00Z,AWS Lambda,1.25,USD\n2026-10-01T02:00:00Z,AWS Lambda,2.75,USD\n2026-10-02T01:00:00Z,Amazon S3,3.50,USD\n';
const c=await parseCostFile(new File([csv],'cur.csv',{type:'text/csv'}));
assert(c.stats.input_rows===3&&c.stats.accepted_rows===3,'csv row stats');
assert(c.rows.length===2,'csv aggregation');
assert(c.rows.find(x=>x.service==='AWS Lambda').amount===4,'lambda aggregation');
const nd='{"date":"2026-10-01","service":"AWS Lambda","amount":1}\n{"date":"2026-10-01","service":"AWS Lambda","amount":2}\n';
const n=await parseCostFile(new File([nd],'cur.ndjson',{type:'application/x-ndjson'}));
assert(n.rows.length===1&&n.rows[0].amount===3,'ndjson aggregation');
assert(normalizeCostRow({'lineItem/UnblendedCost':'4.2','lineItem/UsageStartDate':'2026-10-03T00:00:00Z','product/ProductName':'Amazon S3'}).amount===4.2,'AWS-style normalized keys');
let rejected=false;try{await parseCostFile(new File(['x'],'cur.parquet'))}catch(e){rejected=/Parquet/.test(e.message)}assert(rejected,'parquet rejection must be explicit');
console.log('CUR PARSER SMOKE PASS',JSON.stringify({csv:c.stats,ndjson:n.stats}));

// RFC-4180 quoted fields may legally contain newlines. The streaming parser
// must keep that physical newline inside the same logical CUR record.
const csvQuoted='date,service,amount,note\n2026-10-03,AWS Lambda,1.25,"first line\nsecond line"\n2026-10-03,AWS Lambda,2.75,plain\n';
const quotedResult=await parseCostFile(new File([csvQuoted],'quoted.csv',{type:'text/csv'}));
assert(quotedResult.stats.input_rows===2,'quoted-newline input rows');
assert(quotedResult.rows.length===1&&quotedResult.rows[0].amount===4,'quoted-newline aggregation');
console.log('CUR QUOTED NEWLINE PASS',JSON.stringify(quotedResult.stats));

if(typeof DecompressionStream!=='undefined'){
  const gzBytes=gzipSync(Buffer.from(csv));
  const gz=await parseCostFile(new File([gzBytes],'cur.csv.gz',{type:'application/gzip'}));
  assert(gz.rows.length===2&&gz.rows.find(x=>x.service==='AWS Lambda').amount===4,'gzip CSV streaming import');
  console.log('CUR GZIP STREAM PASS',JSON.stringify(gz.stats));
}
