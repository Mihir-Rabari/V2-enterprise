const fs=require('fs');const med=a=>{a=a.filter(x=>x!==''&&!isNaN(x)).map(Number).sort((x,y)=>x-y);const n=a.length;if(!n)return NaN;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const rows=[];const hdr='mode,variant,page,run,score,fcp,lcp,cls,tbt,lcp_ttfb,lcp_load_delay,lcp_load_duration,lcp_render_delay,main_img_start,main_img_end,gtm_start,gtm_end,gtm_bytes,fbevents_start,fbevents_end,fbevents_bytes,fbconfig_start,fbconfig_end,fbconfig_bytes,pageview_hit_start,birchub_start,tp_main_thread_ms,long_tasks_n,long_tasks_total_ms,long_tasks_3p_ms,script_eval_ms,total_bytes,requests,console_error_NA';
for(const mode of ['dt','sim'])for(const v of ['ctl','meta','gtm'])for(const p of ['prodA2','prodB3','prodC4'])for(let i=1;i<=5;i++){
 const f=`raw/lighthouse/tp-${mode}-${v}/${p}-${i}.json`;if(!fs.existsSync(f))continue;const r=JSON.parse(fs.readFileSync(f));if(r.runtimeError){rows.push([mode,v,p,i,'INVALID'].join(','));continue}
 const a=r.audits,nr=a['network-requests'].details.items,t0=Math.min(...nr.map(x=>x.networkRequestTime)),rel=x=>x?Math.round(x.networkRequestTime-t0):'',end=x=>x?Math.round(x.networkEndTime-t0):'';
 const sp={};(a['lcp-breakdown-insight']?.details?.items?.[0]?.items||[]).forEach(s=>sp[s.subpart]=s.duration|0);
 const gtm=nr.find(x=>/gtm\.js/.test(x.url)),fb=nr.find(x=>/fbevents\.js/.test(x.url)),cfg=nr.find(x=>/signals\/config/.test(x.url)),tr=nr.find(x=>/facebook\.com\/tr/.test(x.url)),bh=nr.find(x=>/birchub/.test(x.url));
 const img=nr.filter(x=>/\/800\.webp/.test(x.url))[0];
 const tp=(a['third-parties-insight']?.details?.items||[]).filter(x=>/Facebook|Google Tag/.test(x.entity)).reduce((s,x)=>s+(x.mainThreadTime||0),0);
 const lt=a['long-tasks'].details?.items||[];const lt3=lt.filter(x=>/facebook|googletag/.test(x.url)).reduce((s,x)=>s+x.duration,0);
 const se=(a['mainthread-work-breakdown']?.details?.items||[]).find(x=>x.group==='scriptEvaluation');
 rows.push([mode,v,p,i,Math.round(r.categories.performance.score*100),a['first-contentful-paint'].numericValue|0,a['largest-contentful-paint'].numericValue|0,a['cumulative-layout-shift'].numericValue.toFixed(4),a['total-blocking-time'].numericValue|0,sp.timeToFirstByte??'',sp.resourceLoadDelay??'',sp.resourceLoadDuration??'',sp.elementRenderDelay??'',rel(img),end(img),rel(gtm),end(gtm),gtm?.transferSize??'',rel(fb),end(fb),fb?.transferSize??'',rel(cfg),end(cfg),cfg?.transferSize??'',rel(tr),rel(bh),tp|0,lt.length,Math.round(lt.reduce((s,x)=>s+x.duration,0)),Math.round(lt3),se?Math.round(se.duration):'',a['total-byte-weight'].numericValue,nr.length,'NA'].join(','));
}
fs.writeFileSync('runs.csv',hdr+'\n'+rows.join('\n'));
// medians table
const data=rows.filter(x=>!x.includes('INVALID')).map(x=>x.split(','));const H=hdr.split(',');const metrics=['score','fcp','lcp','tbt','cls','lcp_load_delay','lcp_load_duration','main_img_start','main_img_end','gtm_start','gtm_end','fbevents_start','fbevents_end','fbconfig_end','pageview_hit_start','tp_main_thread_ms','long_tasks_3p_ms','long_tasks_total_ms','script_eval_ms','total_bytes'];
const out=['mode,variant,page,n,metric,median,min,max'];
for(const mode of ['dt','sim'])for(const v of ['ctl','meta','gtm'])for(const p of ['prodA2','prodB3','prodC4']){const r=data.filter(x=>x[0]==mode&&x[1]==v&&x[2]==p);for(const m of metrics){const vals=r.map(x=>x[H.indexOf(m)]).filter(x=>x!==''&&!isNaN(x)).map(Number);if(!vals.length)continue;out.push([mode,v,p,vals.length,m,med(vals).toFixed(m=='cls'?4:0),Math.min(...vals),Math.max(...vals)].join(','))}}
fs.writeFileSync('before-after.csv',out.join('\n'));
