const fs=require('fs');
const med=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const load=d=>fs.readdirSync(d).filter(f=>f.endsWith('.json')).map(f=>{const r=JSON.parse(fs.readFileSync(d+'/'+f));if(r.runtimeError)return null;const a=r.audits,nr=a['network-requests'].details.items;
 const im=nr.filter(x=>x.resourceType==='Image'&&x.url.includes('/media/v1/'));const w={};im.forEach(x=>{const k=x.url.split('/').pop();w[k]=(w[k]||0)+1});
 const lb=a['lcp-breakdown-insight'].details.items[0].items;
 return {page:f.split('-')[0],score:r.categories.performance.score*100,lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,imgB:im.reduce((s,x)=>s+x.transferSize,0),imgN:im.length,w,disc:JSON.stringify(a['lcp-discovery-insight'].details.items[0].items),ld:lb.find(x=>x.subpart=='resourceLoadDelay')?.duration}}).filter(Boolean);
for(const d of ['w-control','w-after2']){const rs=load(d);console.log('==',d,rs.length,'valid');
 for(const p of ['prodA2','prodB3','prodC4']){const r=rs.filter(x=>x.page==p);const m=k=>med(r.map(x=>x[k]));
  console.log(p,'n',r.length,'score',m('score'),'LCP',(m('lcp')/1000).toFixed(1),'(min-max',(Math.min(...r.map(x=>x.lcp))/1000).toFixed(1)+'-'+(Math.max(...r.map(x=>x.lcp))/1000).toFixed(1)+')','CLS',m('cls'),'TBT',m('tbt').toFixed(0),'imgMB',(m('imgB')/1e6).toFixed(2),'imgN',m('imgN'),'loadDelay',m('ld').toFixed(0),'variants',JSON.stringify(r[0].w),r[0].disc.includes('"priorityHinted":{"label":"fetchpriority=high should be applied","value":true}')?'prio':'noprio')}}
