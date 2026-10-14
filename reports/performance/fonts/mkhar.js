const fs=require('fs');
for(const lab of ['f-dt-ctl','f-dt-nofonts','f-dt-preload']){const f='prodB3-1';
 const r=JSON.parse(fs.readFileSync('raw/lighthouse/'+lab+'/'+f+'.json'));const nr=r.audits['network-requests'].details.items;const t0=Math.min(...nr.map(x=>x.networkRequestTime));
 const san=u=>u.replace(/\?.*/,'').replace('http://127.0.0.1:310','local-');
 const entries=nr.map(x=>({time:Math.round(x.networkEndTime-x.networkRequestTime),request:{method:'GET',url:san(x.url)},response:{status:x.statusCode,bodySize:x.transferSize,content:{size:x.resourceSize,mimeType:x.mimeType}},_priority:x.priority,_resourceType:x.resourceType,_startMs:Math.round(x.networkRequestTime-t0),_endMs:Math.round(x.networkEndTime-t0)}));
 fs.writeFileSync('raw/har/'+lab+'-'+f+'.sanitized.har.json',JSON.stringify({log:{version:'1.2',creator:{name:'sanitized-from-lighthouse-network-requests',version:r.lighthouseVersion},comment:'No headers/cookies/queries; ms since first request.',entries}}));}
