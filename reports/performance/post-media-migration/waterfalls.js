const fs=require('fs');const pages=['home','shop','category','prodA2','prodB3','prodC4'];
const w=['page,form,type,status,priority,mime,transfer_bytes,resource_bytes,start_ms,end_ms,duration_ms,render_blocking,url'];
const im=['page,form,url,variant,mime,transfer_bytes,decoded_bytes,status,start_ms,end_ms,priority,duplicate'];
const jq=u=>u.replace(/https:\/\//,'').replace(/\?.*$/,m=>'?'+m.slice(1,40)).replace(/,/g,';');
for(const p of pages)for(const f of ['mobile','desktop']){
  const r=JSON.parse(fs.readFileSync(`lighthouse/${p}-${f}-1.report.json`));const nr=r.audits['network-requests'].details.items;
  const seen={};
  nr.forEach(x=>{w.push([p,f,x.resourceType,x.statusCode,x.priority,x.mimeType,x.transferSize,x.resourceSize,Math.round(x.networkRequestTime),Math.round(x.networkEndTime),Math.round(x.networkEndTime-x.networkRequestTime),x.isLinkPreload?'preload':'',jq(x.url)].join(','));
   if(x.resourceType==='Image'||x.resourceType==='Media'){const v=(x.url.match(/\/(\d+)\.webp/)||[])[1]||(/\.mp4/.test(x.url)?'legacy-mp4':/\.webp/.test(x.url)?'static-webp':'other');seen[x.url]=(seen[x.url]||0)+1;
   im.push([p,f,jq(x.url),v,x.mimeType,x.transferSize,x.resourceSize,x.statusCode,Math.round(x.networkRequestTime),Math.round(x.networkEndTime),x.priority,seen[x.url]>1].join(','))}});
}
fs.writeFileSync('request-waterfalls.csv',w.join('\n'));fs.writeFileSync('image-delivery-audit.csv',im.join('\n'));
