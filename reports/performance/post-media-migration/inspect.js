const r=require(process.argv[2]);const a=r.audits;
const nr=a['network-requests'].details.items;
console.log('LCP',a['largest-contentful-paint'].numericValue|0, JSON.stringify(a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet||'').slice(0,250));
console.log(JSON.stringify(a['lcp-breakdown-insight'].details?.items?.[0]?.items?.map(x=>x.subpart+':'+(x.duration|0))));
console.log(JSON.stringify(a['lcp-discovery-insight']?.details||a['lcp-discovery-insight']?.displayValue).slice(0,300));
nr.filter(x=>/Image|Media|Fetch|XHR|Document|Script/.test(x.resourceType)).sort((p,q)=>q.transferSize-p.transferSize).slice(0,+process.argv[3]||18).forEach(x=>console.log(x.resourceType.padEnd(8),String(x.transferSize).padStart(8),String(Math.round(x.networkEndTime-x.networkRequestTime)).padStart(6)+'ms',x.priority,x.url.replace('https://','').slice(0,100)));
const o=nr.filter(x=>/google|facebook|fbevents|gtm|googletagmanager/.test(x.url));console.log('3p',o.map(x=>x.url.slice(8,60)+':'+x.transferSize));
