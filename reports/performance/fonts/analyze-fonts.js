// node analyze-fonts.js <label-prefix> [variants...]  -> runs.csv + before-after.csv
const fs=require('fs');
const med=a=>{a=a.filter(x=>x!==''&&!isNaN(x)).map(Number).sort((x,y)=>x-y);const n=a.length;if(!n)return NaN;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const modes=(process.argv[2]||'dt').split(',');const variants=(process.argv[3]||'ctl,nofonts,preload').split(',');
const H='mode,variant,page,run,score,fcp,lcp,cls,tbt,lcp_load_delay,lcp_load_duration,lcp_render_delay,main_img_start,main_img_end,font_css_end,font_files,font_bytes,font_first_start,font_last_end,inter_latin_start,inter_latin_end,fonts_before_fcp,total_bytes,requests,tp_main_thread_ms,long_tasks_total_ms,script_eval_ms'.split(',');
const rows=[];
for(const mode of modes)for(const v of variants)for(const p of ['prodA2','prodB3','prodC4'])for(let i=1;i<=5;i++){
  const f=`raw/lighthouse/f-${mode}-${v}/${p}-${i}.json`;if(!fs.existsSync(f))continue;const r=JSON.parse(fs.readFileSync(f));
  if(r.runtimeError){rows.push([mode,v,p,i,'INVALID'].join(','));continue}
  const a=r.audits,nr=a['network-requests'].details.items,t0=Math.min(...nr.map(x=>x.networkRequestTime));const rel=x=>x?Math.round(x.networkRequestTime-t0):'',end=x=>x?Math.round(x.networkEndTime-t0):'';
  const sp={};(a['lcp-breakdown-insight']?.details?.items?.[0]?.items||[]).forEach(s=>sp[s.subpart]=s.duration|0);
  const ff=nr.filter(x=>/fonts\.gstatic/.test(x.url)),css=nr.find(x=>/fonts\.googleapis\.com\/css2/.test(x.url)),img=nr.filter(x=>/\/800\.webp/.test(x.url))[0];
  const lat=ff.find(x=>/a1ZL7/.test(x.url));const fcp=a['first-contentful-paint'].numericValue;
  const tp=(a['third-parties-insight']?.details?.items||[]).filter(x=>/Facebook|Google Tag/.test(x.entity)).reduce((s,x)=>s+(x.mainThreadTime||0),0);
  const se=(a['mainthread-work-breakdown']?.details?.items||[]).find(x=>x.group==='scriptEvaluation');
  rows.push([mode,v,p,i,Math.round(r.categories.performance.score*100),fcp|0,a['largest-contentful-paint'].numericValue|0,a['cumulative-layout-shift'].numericValue.toFixed(4),a['total-blocking-time'].numericValue|0,sp.resourceLoadDelay??'',sp.resourceLoadDuration??'',sp.elementRenderDelay??'',rel(img),end(img),end(css),ff.length,ff.reduce((s,x)=>s+x.transferSize,0),ff.length?Math.min(...ff.map(x=>rel(x))):'',ff.length?Math.max(...ff.map(x=>end(x))):'',rel(lat),end(lat),ff.filter(x=>x.networkRequestTime-t0<fcp).length,a['total-byte-weight'].numericValue,nr.length,tp|0,Math.round((a['long-tasks'].details?.items||[]).reduce((s,x)=>s+x.duration,0)),se?Math.round(se.duration):''].join(','));
}
fs.writeFileSync('runs.csv',H.join(',')+'\n'+rows.join('\n'));
const data=rows.filter(x=>!x.includes('INVALID')).map(x=>x.split(','));
const metrics=['score','fcp','lcp','cls','tbt','lcp_load_delay','lcp_load_duration','lcp_render_delay','main_img_start','main_img_end','font_css_end','font_files','font_bytes','font_first_start','font_last_end','fonts_before_fcp','total_bytes','long_tasks_total_ms','script_eval_ms'];
const out=['mode,variant,page,n,metric,median,min,max'];
for(const mode of modes)for(const v of variants)for(const p of ['prodA2','prodB3','prodC4']){const r=data.filter(x=>x[0]==mode&&x[1]==v&&x[2]==p);for(const m of metrics){const vals=r.map(x=>x[H.indexOf(m)]).filter(x=>x!==''&&!isNaN(x)).map(Number);if(!vals.length)continue;out.push([mode,v,p,vals.length,m,med(vals).toFixed(m=='cls'?4:0),Math.min(...vals),Math.max(...vals)].join(','))}}
fs.writeFileSync('before-after.csv',out.join('\n'));
