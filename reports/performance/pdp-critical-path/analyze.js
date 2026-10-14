// usage: node analyze.js <label> ...  -> appends rows to stdout CSV files via files: lcp-breakdown.csv, api-timings.csv, timeline.csv
const fs=require('fs');
const med=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const labels=process.argv.slice(2);const pages=['prodA2','prodB3','prodC4'];
const lcpRows=['label,page,run,valid,score,fcp_ms,lcp_ms,cls,tbt_ms,obs_fcp_ms,obs_lcp_ms,lcp_ttfb_ms,lcp_load_delay_ms,lcp_load_duration_ms,lcp_render_delay_ms,lcp_priority_hinted,lcp_element'];
const apiRows=['label,page,run,endpoint,start_ms,ttfb_ms_from_send,headers_at_ms,end_ms,total_ms,transfer_bytes,resource_bytes'];
const tlRows=['label,page,run,html_end,js_all_end,index_js_end,route_chunk_start,route_chunk_end,settings_start,settings_end,product_api_start,product_api_end,main_img_start,main_img_end,main_img_variant,main_img_bytes,obs_fcp,obs_lcp,long_tasks_count,long_tasks_total_ms,script_eval_ms'];
for(const L of labels)for(const p of pages)for(let i=1;i<=5;i++){
  const f=`raw/lighthouse/${L}/${p}-${i}.json`;if(!fs.existsSync(f)){continue}
  const r=JSON.parse(fs.readFileSync(f));if(r.runtimeError){lcpRows.push([L,p,i,'INVALID:'+r.runtimeError.code].join(','));continue}
  const a=r.audits,nr=a['network-requests'].details.items,t0=Math.min(...nr.map(x=>x.networkRequestTime));
  const rel=x=>Math.round(x-t0);const lb=a['lcp-breakdown-insight']?.details?.items||[{items:[]}];const sp={};lb[0].items.forEach(s=>sp[s.subpart]=s.duration);
  const m=a['metrics'].details.items[0];const lcpEl=(lb.find(x=>x.type==='node')||{}).snippet||'';
  const pr=a['lcp-discovery-insight']?.details?.items?.[0]?.items?.priorityHinted?.value??'n/a';
  lcpRows.push([L,p,i,'valid',Math.round(r.categories.performance.score*100),a['first-contentful-paint'].numericValue|0,a['largest-contentful-paint'].numericValue|0,a['cumulative-layout-shift'].numericValue.toFixed(4),a['total-blocking-time'].numericValue|0,m.observedFirstContentfulPaint,m.observedLargestContentfulPaint,sp.timeToFirstByte|0,sp.resourceLoadDelay|0,sp.resourceLoadDuration|0,sp.elementRenderDelay|0,pr,JSON.stringify(lcpEl.slice(0,50)).replace(/,/g,';')].join(','));
  // devtools log for API timings
  const dl=JSON.parse(fs.readFileSync(`raw/artifacts/${L}/${p}-${i}/devtoolslog.json`));const rs={};
  dl.forEach(e=>{if(e.method==='Network.responseReceived'){rs[e.params.requestId]=e.params.response.timing}});
  const byUrl={};dl.forEach(e=>{if(e.method==='Network.requestWillBeSent')byUrl[e.params.requestId]=e.params.request.url});
  const find=re=>nr.find(x=>re.test(x.url));
  for(const [name,re] of [['product',/\/api\/v1\/products\/[0-9a-f]{24}$/],['settings',/\/api\/v1\/settings$/],['related',/products\?limit=4/],['reviews',/reviews\/product/]]){
    const x=find(re);if(!x)continue;const id=Object.keys(byUrl).find(k=>byUrl[k]===x.url);const t=rs[id];
    const ttfb=t?(t.receiveHeadersEnd-t.sendEnd):'';
    apiRows.push([L,p,i,name,rel(x.networkRequestTime),ttfb===''?'':ttfb.toFixed(0),ttfb===''?'':rel(x.networkRequestTime)+Math.round(t.sendEnd-(t.requestTime?0:0))*0+ '' ,rel(x.networkEndTime),Math.round(x.networkEndTime-x.networkRequestTime),x.transferSize,x.resourceSize].join(','));}
  const doc=find(/\/product\/|\/mens\/|\/combo-offers\//);const idx=nr.find(x=>/assets\/index-.*\.js/.test(x.url));
  const chunk=nr.find(x=>/assets\/ProductDetails-.*\.js/.test(x.url));const sets=find(/\/api\/v1\/settings$/),prod=find(/\/api\/v1\/products\/[0-9a-f]{24}$/);
  const img=nr.filter(x=>/media\/v1\/.*\/(400|800|1200|1600)\.webp/.test(x.url)).sort((x,y)=>x.networkRequestTime-y.networkRequestTime)[0];
  const jsEnd=Math.max(...nr.filter(x=>x.resourceType==='Script'&&/127\.0\.0\.1/.test(x.url)).map(x=>x.networkEndTime));
  const lt=(a['long-tasks'].details?.items||[]);const boot=(a['mainthread-work-breakdown']?.details?.items||[]).find(x=>x.group==='scriptEvaluation');
  tlRows.push([L,p,i,rel(doc.networkEndTime),rel(jsEnd),rel(idx.networkEndTime),chunk?rel(chunk.networkRequestTime):'',chunk?rel(chunk.networkEndTime):'',sets?rel(sets.networkRequestTime):'',sets?rel(sets.networkEndTime):'',prod?rel(prod.networkRequestTime):'',prod?rel(prod.networkEndTime):'',img?rel(img.networkRequestTime):'',img?rel(img.networkEndTime):'',img?img.url.split('/').pop():'',img?img.transferSize:'',m.observedFirstContentfulPaint,m.observedLargestContentfulPaint,lt.length,Math.round(lt.reduce((s,x)=>s+x.duration,0)),boot?Math.round(boot.duration):''].join(','));
}
fs.writeFileSync('lcp-breakdown.csv',lcpRows.join('\n'));fs.writeFileSync('api-timings.csv',apiRows.join('\n'));fs.writeFileSync('timeline.csv',tlRows.join('\n'));
