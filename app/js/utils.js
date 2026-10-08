export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
export const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export const formatDate = value => { try { return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); } catch { return value || '—'; } };
export const num = value => new Intl.NumberFormat().format(Number(value||0));
export const uid = prefix => `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
export const nowIso = () => new Date().toISOString();
export const sleep = ms => new Promise(r=>setTimeout(r,ms));
export function download(name, content, type='text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content],{type});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function toast(message, kind='info') {
  const root=$('#toast-root'); if(!root) return;
  const node=document.createElement('div'); node.className=`toast ${kind}`; node.textContent=message; root.appendChild(node); setTimeout(()=>node.classList.add('show'),10); setTimeout(()=>{node.classList.remove('show');setTimeout(()=>node.remove(),200)},3500);
}
export function copyText(text) { return navigator.clipboard?.writeText(text).then(()=>toast('Copied to clipboard','success')).catch(()=>download('copied.txt',text)); }
export function routeTo(path){ location.hash = `#${path.startsWith('/')?path:'/'+path}`; }
export function currentRoute(){ return (location.hash.replace(/^#/,'') || '/dashboard').split('?')[0]; }
export function queryParams(){ return new URLSearchParams(location.hash.split('?')[1]||''); }
export function encodeHtmlReport(title, body){ return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:system-ui;max-width:960px;margin:40px auto;padding:0 24px;line-height:1.55;color:#172033}h1,h2,h3{color:#0b203d}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}@media print{button{display:none}}</style></head><body>${body}</body></html>`; }
