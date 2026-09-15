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
      let slice = st.to===null ? all : all.slice(st.from, st.to+1);
      if (global.__serverMax) slice = slice.slice(0, global.__serverMax);
      return { data: slice, error:null, count: (st.count && !global.__noCount) ? all.length : null };
    });
  }
  return thenable;
}
w.supabase = { from:(t)=>q(t), auth:{ getSession:async()=>({data:{session:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
  storage:{ from:()=>({upload:async()=>({error:null}), getPublicUrl:()=>({data:{publicUrl:''}})}) } };
w.__setEnv(w.supabase, { user:{ id:'u' } });


// ---- stale-while-revalidate の確認 ----
(async () => {
  const ok=[], ng=[];
  const t=(name,cond)=>{(cond?ok:ng).push(name); console.log((cond?'  ok  ':'  NG  ')+name);};

  // renderRoute が裏の取り直しで呼び直されるかを見る
  let refreshes = 0;
  const origRR = w.renderRoute;
  w.renderRoute = (p) => { refreshes++; return origRR(p); };

  // 1) 冷えた状態で読む
  w.__reset();
  await w.fetchStudyLogs();
  const n0 = (await w.fetchStudyLogs()).length;
  t('1回目で全件そろう (' + n0 + '件)', n0 === N_LOGS);

  // 2) キャッシュが効いている間はネットワークに行かない
  calls = 0; await w.fetchStudyLogs();
  t('30秒以内は0リクエスト', calls === 0);

  // 3) 期限切れ: すぐ返ってくる（待たない）
  w.__age(60000);
  calls = 0; refreshes = 0;
  const t0 = Date.now(); const stale = await w.fetchStudyLogs(); const dt = Date.now() - t0;
  t('期限切れでも待たずに返る (' + dt + 'ms)', dt < LAT / 2);
  t('期限切れでも中身は揃っている', stale.length === N_LOGS);

  // 4) 裏で取り直している。中身が同じなら描き直さない
  await new Promise(r => setTimeout(r, LAT * 4));
  t('裏で取り直している', calls > 0);
  t('中身が同じなら描き直さない', refreshes === 0);

  // 5) サーバ側が変わったら、裏の取り直しで描き直される
  rows.study_logs.unshift({ id: 999999, user_id:'u', subject_name:'新しいログ', duration_minutes:30,
    started_at:new Date().toISOString(), ended_at:new Date().toISOString(), focus_level:3, location:'自宅' });
  w.__age(60000);
  refreshes = 0;
  const before = await w.fetchStudyLogs();
  t('変更後もまず古いほうを即返す', before.length === N_LOGS);
  await new Promise(r => setTimeout(r, LAT * 6 + 700));   // 描き直しは500msまとめてから
  t('変わっていたら描き直しが走る', refreshes > 0);
  const after = await w.fetchStudyLogs();
  t('取り直した結果が入っている', after.length === N_LOGS + 1);

  // 6) 同じ取得が重なっても1回にまとめる
  await new Promise(r => setTimeout(r, LAT * 8));   // 裏の取り直しが終わるのを待つ
  // 1回ぶんの往復 = 件数を聞く1回 + 残りページ（並列）
  const total = rows.study_logs.length;
  const expect = 1 + Math.max(0, Math.ceil(total / 500) - 1);
  w.__reset(); calls = 0;
  await Promise.all([w.fetchStudyLogs(), w.fetchStudyLogs(), w.fetchStudyLogs()]);
  t('同時に3回呼んでも取得は1回ぶん (' + calls + '/' + expect + 'req・まとめなければ' + (expect * 3) + ')', calls === expect);

  // 7) 書き換えたらその場で捨てて取り直す
  w.invalidateCache('study_logs'); calls = 0;
  await w.fetchStudyLogs();
  t('invalidateCache のあとは取り直す', calls > 0);

  // 8) サーバ側の行数上限で1ページが短く返っても全件そろう
  const N = rows.study_logs.length;
  global.__serverMax = 137;
  w.__reset(); await w.fetchStudyLogs();
  const capped = await w.fetchStudyLogs();
  t('1ページが上限で切られても全件そろう (' + capped.length + '/' + N + ')', capped.length === N);
  global.__serverMax = 0;

  // 9) 件数が取れない環境でも全件そろう（順に取るほうへ落ちる）
  global.__noCount = true;
  w.__reset(); await w.fetchStudyLogs();
  const nocount = await w.fetchStudyLogs();
  t('件数が取れなくても全件そろう (' + nocount.length + '/' + N + ')', nocount.length === N);
  global.__noCount = false;

  console.log('\n' + ok.length + ' passed, ' + ng.length + ' failed');
  process.exit(ng.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
