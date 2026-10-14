// node analyze-api.js <prefix> <mode> <variants,comma> <pages,comma> [runs=5]
// Produces: runs.csv (per run), before-after.csv (median/min/max), request-inventory.csv (run 1 of each variant/page),
// duplicate-requests.csv (API requests per navigation by endpoint, per variant/page, median).
const fs=require('fs');
const [prefix,mode,variantsArg,pagesArg,runsArg]=process.argv.slice(2);const variants=variantsArg.split(','),pages=pagesArg.split(','),RUNS=+runsArg||5;
const med=a=>{a=a.filter(x=>x!==''&&x!==undefined&&!isNaN(x)).map(Number).sort((x,y)=>x-y);const n=a.length;if(!n)return NaN;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const ep=u=>{const m=u.match(/\/api\/v1\/([^?]*)(\?.*)?$/);if(!m)return null;let p=m[1].replace(/[0-9a-f]{24}/g,':id');const q=m[2]||'';return {name:p,q}};
const H='variant,page,run,score,fcp,lcp,cls,tbt,lcp_load_delay,lcp_load_duration,main_or_lcp_el,api_requests,settings_requests,products_requests,categories_requests,total_bytes,api_bytes,image_bytes,js_bytes,requests_total,last_api_end_ms,products_first_start,products_first_end,products_last_end';
const rows=[],inv=['variant,page,order,method,endpoint,query,status,start_ms,end_ms,duration_ms,wire_bytes,decoded_bytes,priority'],dup={};
for(const v of variants)for(const p of pages)for(let i=1;i<=RUNS;i++){
  const f=`raw/lighthouse/${prefix}-${mode}-${v}/${p}-${i}.json`;if(!fs.existsSync(f))continue;const r=JSON.parse(fs.readFileSync(f));if(r.runtimeError){rows.push([v,p,i,'INVALID'].join(','));continue}
  const a=r.audits,nr=a['network-requests'].details.items,t0=Math.min(...nr.map(x=>x.networkRequestTime));
  const api=nr.filter(x=>/\/api\/v1\//.test(x.url)).sort((x,y)=>x.networkRequestTime-y.networkRequestTime);
  const sp={};(a['lcp-breakdown-insight']?.details?.items?.[0]?.items||[]).forEach(s=>sp[s.subpart]=s.duration|0);
  const node=(a['lcp-breakdown-insight']?.details?.items||[]).find(x=>x.type==='node');
  const prods=api.filter(x=>/\/products\?/.test(x.url));const sum=t=>nr.filter(x=>x.resourceType===t).reduce((s,x)=>s+x.transferSize,0);
  const cnt=re=>api.filter(x=>re.test(x.url)).length;
  rows.push([v,p,i,Math.round(r.categories.performance.score*100),a['first-contentful-paint'].numericValue|0,a['largest-contentful-paint'].numericValue|0,a['cumulative-layout-shift'].numericValue.toFixed(4),a['total-blocking-time'].numericValue|0,sp.resourceLoadDelay??'',sp.resourceLoadDuration??'',JSON.stringify((node?.snippet||'').slice(0,28)).replace(/,/g,';'),api.length,cnt(/\/settings$/),prods.length,cnt(/\/categories$/),a['total-byte-weight'].numericValue,api.reduce((s,x)=>s+x.transferSize,0),sum('Image'),sum('Script'),nr.length,api.length?Math.round(Math.max(...api.map(x=>x.networkEndTime))-t0):'',prods.length?Math.round(prods[0].networkRequestTime-t0):'',prods.length?Math.round(prods[0].networkEndTime-t0):'',prods.length?Math.round(Math.max(...prods.map(x=>x.networkEndTime))-t0):''].join(','));
  const key=v+'|'+p;dup[key]=dup[key]||{};const per={};api.forEach(x=>{const e=ep(x.url);const k=e.name+(e.name==='products'?(/limit=300/.test(e.q)?'?limit=300':/limit=20/.test(e.q)?'?limit=20':/limit=4/.test(e.q)?'?limit=4':'?other'):'');per[k]=(per[k]||0)+1});
  for(const k in per){(dup[key][k]=dup[key][k]||[]).push(per[k])}
  if(i===1)api.forEach((x,idx)=>{const e=ep(x.url);inv.push([v,p,idx+1,'GET',e.name,JSON.stringify(e.q.replace(/search=$/,'').slice(0,90)).replace(/,/g,';'),x.statusCode,Math.round(x.networkRequestTime-t0),Math.round(x.networkEndTime-t0),Math.round(x.networkEndTime-x.networkRequestTime),x.transferSize,x.resourceSize,x.priority].join(','))});
}
fs.writeFileSync('runs.csv',H+'\n'+rows.join('\n'));
const Hs=H.split(',');const data=rows.filter(x=>!x.includes('INVALID')).map(x=>x.split(','));
const metrics=['score','fcp','lcp','cls','tbt','lcp_load_delay','lcp_load_duration','api_requests','settings_requests','products_requests','categories_requests','total_bytes','api_bytes','image_bytes','js_bytes','requests_total','last_api_end_ms','products_first_start','products_first_end','products_last_end'];
const out=['mode,variant,page,n,metric,median,min,max'];
for(const v of variants)for(const p of pages){const r=data.filter(x=>x[0]==v&&x[1]==p);for(const m of metrics){const vals=r.map(x=>x[Hs.indexOf(m)]).filter(x=>x!==''&&!isNaN(x)).map(Number);if(!vals.length)continue;out.push([mode,v,p,vals.length,m,med(vals).toFixed(m=='cls'?4:0),Math.min(...vals),Math.max(...vals)].join(','))}}
fs.writeFileSync('before-after.csv',out.join('\n'));fs.writeFileSync('request-inventory.csv',inv.join('\n'));
const d=['variant,page,endpoint,requests_per_navigation_median,min,max'];for(const key in dup){const [v,p]=key.split('|');for(const k in dup[key]){const a=dup[key][k];d.push([v,p,k,med(a),Math.min(...a),Math.max(...a)].join(','))}}
fs.writeFileSync('duplicate-requests.csv',d.join('\n'));
