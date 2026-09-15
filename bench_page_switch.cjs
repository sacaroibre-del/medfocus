// ページ描画のネットワーク往復を数えるベンチ。1往復 = LAT ms とみなす。
const fs = require('fs');
const { JSDOM } = require('jsdom');
const LAT = 60; // 1往復の遅延(ms)

const dom = new JSDOM(`<!DOCTYPE html><html><body>
 <div id="app"><aside id="sidebar"></aside><main id="main-content"><div id="page-container"></div></main></div>
 <div id="toast-notif"></div></body></html>`, { runScripts:"outside-only", url:"http://localhost/" });
const w = dom.window;
global.window = w; global.document = w.document;
const store = {};
global.localStorage = w.localStorage = { getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=String(v)}, removeItem:k=>{delete store[k]}, clear:()=>{} };
global.navigator = { userAgent:'node.js' };
global.Chart = class { constructor(){} destroy(){} };
global.requestAnimationFrame = w.requestAnimationFrame = cb => setTimeout(cb, 0);
w.requestIdleCallback = undefined;

let code = fs.readFileSync('./app.js','utf8').replace(/import\.meta\.env/g,'({})');
// supabase / session はモジュールの let なので、内側から差し込む
code += "\nwindow.__setEnv = (sb, ses) => { supabase = sb; session = ses; isDemoMode = false; };";
code += "\nwindow.__reset = () => { invalidateCache(); _planSyncAt = 0; _planSyncResult = null; qbProgressLoaded = false; videoProgressLoaded = false; };";
code += "\nwindow.__age = (ms) => { Object.values(_dataCache).forEach(e => { e.ts -= ms; }); _planSyncAt -= ms; };";
w.eval(code);

// ---- 偽 Supabase ----
const N_LOGS = Number(process.env.N_LOGS || 1200);
const N_TASKS = Number(process.env.N_TASKS || 1400);
const rows = {
  study_logs: Array.from({length:N_LOGS},(_,i)=>({id:i+1,user_id:'u',subject_name:'内科',duration_minutes:60,
    started_at:new Date(Date.now()-i*36e5).toISOString(), ended_at:new Date(Date.now()-i*36e5+36e5).toISOString(),
    focus_level:3, location:'自宅', activity:'qb', study_purpose:'cbt', questions_solved:10, questions_correct:7})),
  plan_tasks: Array.from({length:N_TASKS},(_,i)=>({id:i+1,user_id:'u',plan_id:'p1',due_date:'2026-09-15',kind:'quota',target_amount:10,done_amount:0,completed:false,seq:i+1})),
  study_plans: [{id:'p1',user_id:'u',title:'内科 QB',status:'active',subject_id:'naika',unit:'q',total_volume:600,start_date:'2026-09-01',due_date:'2026-12-01'}],
  user_checklist_progress: [], exam_countdowns: [], calendar_events: [], sleep_logs: [],
  qb_question_records: [], mock_exams: [], progress_snapshots: [],
  profiles: [{id:'u', qb_progress:null, video_progress:null, video_edition_prefs:null}],
};
let calls = 0, writes = 0;
function q(table, opts) {
  const st = { table, from:0, to:null, count: opts && opts.count };
  const thenable = {
    select(c,o){ if(o&&o.count) st.count=o.count; return thenable; },
    eq(){return thenable;}, neq(){return thenable;}, gte(){return thenable;}, lte(){return thenable;},
    in(){return thenable;}, order(){return thenable;}, limit(){return thenable;},
    range(a,b){ st.from=a; st.to=b; return thenable; },
    single(){ st.single=true; return thenable; },
    insert(){ st.write=true; return thenable; },
    update(){ st.write=true; return thenable; },
    upsert(){ st.write=true; return thenable; },
    delete(){ st.write=true; return thenable; },
    maybeSingle(){ st.single=true; return thenable; },
    then(res,rej){ return exec().then(res,rej); },
    catch(f){ return exec().catch(f); },
    finally(f){ return exec().finally(f); },
  };
  function exec(){
    calls++; if (st.write) writes++;
    return new Promise(r=>setTimeout(r, LAT)).then(()=>{
      const all = rows[st.table] || [];
      if (st.write) return { data: [], error:null };
      if (st.single) return { data: all[0]||null, error:null };
      const slice = st.to===null ? all : all.slice(st.from, st.to+1);
      return { data: slice, error:null, count: st.count ? all.length : null };
    });
  }
  return thenable;
}
w.supabase = { from:(t)=>q(t), auth:{ getSession:async()=>({data:{session:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
  storage:{ from:()=>({upload:async()=>({error:null}), getPublicUrl:()=>({data:{publicUrl:''}})}) } };
w.__setEnv(w.supabase, { user:{ id:'u' } });

(async () => {
  const bench = async (name, fn) => {
    calls = 0; writes = 0; const t0 = Date.now();
    await fn();
    await new Promise(r => setTimeout(r, 0));
    const ms = Date.now() - t0;
    console.log(`${name.padEnd(12)} ${String(calls - writes).padStart(3)} 読 ${String(writes).padStart(3)} 書   ${String(ms).padStart(5)} ms`);
    return { calls, ms };
  };
  console.log(`logs=${N_LOGS} tasks=${N_TASKS} latency=${LAT}ms/req`);
  const pages = [['dashboard',()=>w.renderDashboard()],['study',()=>w.renderStudy()],
                 ['insights',()=>w.renderInsights()],['qb',()=>w.renderQBProgress()],
                 ['calendar',()=>w.renderCalendar()]];
  console.log('-- キャッシュ無し（初回・期限切れ後）--');
  let tot=0, treq=0;
  for (const [n,fn] of pages) { w.__reset(); const r = await bench(n, fn); tot+=r.ms; treq+=r.calls; }
  console.log(`${'合計'.padEnd(10)} ${String(treq).padStart(3)} req         ${String(tot).padStart(5)} ms`);
  console.log('-- 期限切れ（前に開いたことはあるが30秒以上あいた）--');
  w.__reset(); for (const [,fn] of pages) await fn();
  tot=0; treq=0;
  for (const [n,fn] of pages) { w.__age(60000); const r = await bench(n, fn); tot+=r.ms; treq+=r.calls; }
  console.log(`${'合計'.padEnd(10)} ${String(treq).padStart(3)} req         ${String(tot).padStart(5)} ms`);
  console.log('-- キャッシュ有り（30秒以内の切り替え）--');
  w.__reset(); for (const [,fn] of pages) await fn();
  tot=0; treq=0;
  for (const [n,fn] of pages) { const r = await bench(n, fn); tot+=r.ms; treq+=r.calls; }
  console.log(`${'合計'.padEnd(20)} ${String(treq).padStart(3)} req   ${String(tot).padStart(5)} ms`);
  process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
