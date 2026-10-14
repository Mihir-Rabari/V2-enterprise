// Usage: node summarize.js <dir-of-reports> > lighthouse-results.csv
const fs=require('fs'),path=require('path');
const dir=process.argv[2];
const rows=[];
const hdr='page,form,run,score,fcp_ms,lcp_ms,cls,tbt_ms,si_ms,ttfb_ms,total_bytes,requests,img_bytes,img_reqs,script_bytes,script_reqs,css_bytes,media_bytes,font_bytes,third_party_bytes,failed_reqs,lcp_element,lcp_url,lcp_ttfb_ms,lcp_loaddelay_ms,lcp_loadtime_ms,lcp_renderdelay_ms,console_errors,runWarnings,ua';
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.report.json')).sort()){
  const r=JSON.parse(fs.readFileSync(path.join(dir,f)));const a=r.audits;
  const [page,form,run]=f.replace('.report.json','').split('-');
  const nr=a['network-requests'].details.items;
  const sum=t=>nr.filter(x=>x.resourceType===t);
  const bytes=l=>l.reduce((s,x)=>s+(x.transferSize||0),0);
  const lcpd=(a['lcp-breakdown-insight'].details.items||[]).find(x=>x.type==='node')||{};
  const lcpurl=((lcpd.snippet||'').match(/src=\"([^\"]+)/)||[])[1]||'';
  // LCP breakdown from insight if present
  const ins=r.audits['lcp-breakdown-insight']?.details?.items?.[0]?.items||[];
  const sub={};(ins||[]).forEach(s=>sub[s.subpart]=s.duration);
  const ttfbReq=nr.find(x=>x.resourceType==='Document');
  const tp=a['third-party-summary']?.details?.items||[];
  const row=[page,form,run,Math.round(r.categories.performance.score*100),
    a['first-contentful-paint'].numericValue.toFixed(0),a['largest-contentful-paint'].numericValue.toFixed(0),
    a['cumulative-layout-shift'].numericValue.toFixed(3),a['total-blocking-time'].numericValue.toFixed(0),
    a['speed-index'].numericValue.toFixed(0),a['server-response-time']?.numericValue?.toFixed(0)??'',
    a['total-byte-weight'].numericValue,nr.length,bytes(sum('Image')),sum('Image').length,
    bytes(sum('Script')),sum('Script').length,bytes(sum('Stylesheet')),bytes(sum('Media')),bytes(sum('Font')),
    tp.reduce((s,x)=>s+(x.transferSize||0),0),nr.filter(x=>x.statusCode>=400||x.statusCode<0).length,
    JSON.stringify((lcpd.snippet||'').slice(0,40)).replace(/,/g,';'),lcpurl.slice(0,120),
    sub['timeToFirstByte']?.toFixed(0)??'',sub['resourceLoadDelay']?.toFixed(0)??'',sub['resourceLoadDuration']?.toFixed(0)??'',sub['elementRenderDelay']?.toFixed(0)??'',
    'NOT_COLLECTED',JSON.stringify((r.runWarnings||[]).join('|')).slice(0,100).replace(/,/g,';'),
    JSON.stringify(r.environment.hostUserAgent).replace(/,/g,";")];
  rows.push(row.join(','));
}
console.log(hdr+'\n'+rows.join('\n'));
