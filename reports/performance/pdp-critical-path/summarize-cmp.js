const fs=require('fs');const med=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const rows=fs.readFileSync('lcp-breakdown.csv','utf8').trim().split('\n').slice(1).map(l=>l.split(','));
const tl=fs.readFileSync('timeline.csv','utf8').trim().split('\n').slice(1).map(l=>l.split(','));
const hdr=fs.readFileSync('timeline.csv','utf8').split('\n')[0].split(',');
const out=['label,page,n,metric,median,min,max'];
const f=(rs,i)=>rs.map(x=>+x[i]).filter(x=>!isNaN(x));
for(const L of process.argv.slice(2))for(const p of ['prodA2','prodB3','prodC4']){
 const r=rows.filter(x=>x[0]==L&&x[1]==p&&x[3]=='valid'),t=tl.filter(x=>x[0]==L&&x[1]==p);
 const add=(name,arr)=>out.push([L,p,arr.length,name,med(arr).toFixed(name=='cls'?4:0),Math.min(...arr).toFixed(name=='cls'?4:0),Math.max(...arr).toFixed(name=='cls'?4:0)].join(','));
 add('score',f(r,4));add('fcp_ms',f(r,5));add('lcp_ms',f(r,6));add('tbt_ms',f(r,8));add('obs_lcp_ms',f(r,10));add('lcp_load_delay_ms',f(r,12));add('lcp_load_duration_ms',f(r,13));add('lcp_render_delay_ms',f(r,14));
 for(const k of ['product_api_start','product_api_end','main_img_start','main_img_end','route_chunk_start','long_tasks_total_ms','script_eval_ms'])add(k,f(t,hdr.indexOf(k)));
}
fs.writeFileSync('before-after.csv',out.join('\n'));
