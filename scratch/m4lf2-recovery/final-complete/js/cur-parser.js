// Streaming CUR/actual-cost parser for browser file imports.
// CSV and NDJSON are processed incrementally and aggregated so very large files
// do not need to be kept in memory. JSON arrays remain supported for smaller exports.

const DATE_KEYS=['date','usage_date','line_item_usage_start_date','lineitem_usagestartdate','identity_time_interval'];
const SERVICE_KEYS=['service','product_product_name','product_servicename','line_item_product_code','lineitem_productcode'];
const COST_KEYS=['amount','cost','line_item_unblended_cost','lineitem_unblendedcost','line_item_net_unblended_cost','lineitem_netunblendedcost'];
const CURRENCY_KEYS=['currency','pricing_currency','line_item_currency_code','lineitem_currencycode'];
const ESTIMATED_KEYS=['estimated','is_estimated'];

function normKey(k){return String(k||'').trim().toLowerCase().replace(/[\s./-]+/g,'_');}
function pick(obj,keys){for(const k of keys){if(obj[k]!==undefined&&obj[k]!==null&&obj[k]!=='')return obj[k]}return undefined;}
function bool(v){return v===true||v===1||/^(true|1|yes)$/i.test(String(v||''));}
function day(v,fallback=''){const s=String(v||fallback);const m=s.match(/\d{4}-\d{2}-\d{2}/);return m?m[0]:fallback;}

export function normalizeCostRow(input,{fallbackDate='',currency='USD'}={}){
  const obj={}; for(const [k,v] of Object.entries(input||{}))obj[normKey(k)]=v;
  const amount=Number(pick(obj,COST_KEYS));
  if(!Number.isFinite(amount))return null;
  const service=String(pick(obj,SERVICE_KEYS)||'Unspecified service').trim()||'Unspecified service';
  return {date:day(pick(obj,DATE_KEYS),fallbackDate),service,amount,currency:String(pick(obj,CURRENCY_KEYS)||currency||'USD'),estimated:bool(pick(obj,ESTIMATED_KEYS))};
}

export function createCostAggregator({fallbackDate='',currency='USD'}={}){
  const map=new Map(); let inputRows=0,acceptedRows=0,rejectedRows=0;
  return {
    add(raw){inputRows++;const row=normalizeCostRow(raw,{fallbackDate,currency});if(!row){rejectedRows++;return}acceptedRows++;const key=`${row.date}\u0000${row.service}\u0000${row.currency}\u0000${row.estimated?1:0}`;const old=map.get(key);if(old)old.amount+=row.amount;else map.set(key,{...row});},
    result(){return {rows:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.service.localeCompare(b.service)),stats:{input_rows:inputRows,accepted_rows:acceptedRows,rejected_rows:rejectedRows,aggregated_rows:map.size}};}
  };
}

export function parseCsvRecord(line){
  const out=[];let cur='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;
    }else if(ch===','&&!quoted){out.push(cur);cur='';}else cur+=ch;
  }
  out.push(cur);return out;
}

// Return the first RFC-4180-style record boundary outside quoted fields.
// This deliberately rescans the incomplete buffer so quote pairs split across
// stream chunks are interpreted correctly on the next pass. It also means
// quoted embedded newlines do not split a CUR row.
function csvRecordBoundary(text){
  let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){i++;continue;}
      quoted=!quoted;
      continue;
    }
    if(ch==='\n'&&!quoted)return i;
  }
  return -1;
}

export async function parseCostFile(file,{fallbackDate='',currency='USD',onProgress=()=>{}}={}){
  const originalName=String(file?.name||'').toLowerCase(),gzip=originalName.endsWith('.gz'),name=gzip?originalName.slice(0,-3):originalName; const agg=createCostAggregator({fallbackDate,currency});
  if(name.endsWith('.parquet'))throw new Error('Parquet CUR is not decoded in this dependency-free browser build. Export CSV/NDJSON or use the optional AWS connector.');
  if(gzip&&typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress gzip streams. Use an uncompressed CSV/NDJSON file or the optional AWS connector.');
  if(gzip&&name.endsWith('.json')&&!name.endsWith('.ndjson'))throw new Error('Gzipped JSON arrays are intentionally rejected; use CSV.gz or NDJSON.gz for streaming import.');
  if(name.endsWith('.json')&&!name.endsWith('.ndjson')){
    if(Number(file.size||0)>100*1024*1024)throw new Error('JSON arrays above 100 MB are intentionally rejected; use CSV or NDJSON for streaming import.');
    const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed))throw new Error('JSON CUR file must contain an array of rows.');
    for(const row of parsed)agg.add(row);onProgress({bytes:file.size||0,total:file.size||0,rows:parsed.length});return agg.result();
  }
  const sourceStream=gzip?file.stream().pipeThrough(new DecompressionStream('gzip')):file.stream();
  const reader=sourceStream.getReader(),decoder=new TextDecoder();let buffer='',bytes=0,header=null;
  const ndjson=name.endsWith('.ndjson')||name.endsWith('.jsonl');
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;buffer+=decoder.decode(value,{stream:true});let idx;
    while((idx=(ndjson?buffer.indexOf('\n'):csvRecordBoundary(buffer)))>=0){let line=buffer.slice(0,idx);buffer=buffer.slice(idx+1);if(line.endsWith('\r'))line=line.slice(0,-1);if(!line.trim())continue;
      if(ndjson)agg.add(JSON.parse(line));
      else {const cells=parseCsvRecord(line);if(!header){header=cells.map(normKey);continue;}const obj={};for(let i=0;i<header.length;i++)obj[header[i]]=cells[i]??'';agg.add(obj);}
    }
    onProgress({bytes,total:gzip?0:(file.size||0),compressed:gzip}); await Promise.resolve();
  }
  buffer+=decoder.decode();if(buffer.trim()){
    if(name.endsWith('.ndjson')||name.endsWith('.jsonl'))agg.add(JSON.parse(buffer));
    else {const cells=parseCsvRecord(buffer);if(!header)header=cells.map(normKey);else{const obj={};for(let i=0;i<header.length;i++)obj[header[i]]=cells[i]??'';agg.add(obj);}}
  }
  onProgress({bytes:gzip?bytes:(file.size||bytes),total:gzip?0:(file.size||bytes),compressed:gzip});return agg.result();
}
