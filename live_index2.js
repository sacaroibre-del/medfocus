(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function o(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(s){if(s.ep)return;s.ep=!0;const n=o(s);fetch(s.href,n)}})();const mo={};console.log("DEBUG: app.js loaded");let $=null,Ot="",Mt="";function Oo(){const e=localStorage.getItem("medfocus-supabase-url"),t=localStorage.getItem("medfocus-supabase-key");Ot=e||(typeof mo<"u"?"https://toxcmlpkpsbmogemwnxp.supabase.co":"")||"",Mt=t||(typeof mo<"u"?"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRveGNtbHBrcHNibW9nZW13bnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzA5OTAsImV4cCI6MjA4OTQ0Njk5MH0.M2HibKcwpAK4miUE2OvR6VSnXizx-IrKuakcoB8toaE":"")||"";try{console.log("DEBUG: Initializing Supabase with URL:",Ot?"PRESENT":"MISSING"),Ot&&Mt&&!Ot.includes("your-project")&&Mt!=="your-anon-key"?window.supabase?($=window.supabase.createClient(Ot,Mt),console.log("DEBUG: Supabase client created")):(console.warn("DEBUG: Supabase global not found (window.supabase is undefined)"),$=null):(console.log("DEBUG: Supabase bypassing (missing or placeholder config)"),$=null)}catch(o){console.error("DEBUG: Supabase initialization error:",o),$=null}}Oo();console.log("DEBUG: Browser check - Safari:",/^((?!chrome|android).)*safari/i.test(navigator.userAgent));console.log("DEBUG: LocalStorage available:",(()=>{try{return localStorage.setItem("test","1"),localStorage.removeItem("test"),!0}catch{return!1}})());async function go(e){if(!$)return null;const{data:t,error:o}=await $.from("profiles").select("*").eq("id",e).single();return o?(console.warn("Profile not found, creating default:",o),null):t}console.log("DEBUG: State initializing");let E=null,et="/",Ge=null;function Io(){try{Ge||(Ge=new(window.AudioContext||window.webkitAudioContext)),Ge.state==="suspended"&&Ge.resume()}catch{}}function Co(){if(localStorage.getItem("medfocus_sound")!=="false")try{Io();const t=(o,a,s)=>{const n=Ge.createOscillator(),l=Ge.createGain();n.type="sine",n.frequency.setValueAtTime(o,Ge.currentTime+a),l.gain.setValueAtTime(.3,Ge.currentTime+a),l.gain.exponentialRampToValueAtTime(.01,Ge.currentTime+a+s),n.connect(l),l.connect(Ge.destination),n.start(Ge.currentTime+a),n.stop(Ge.currentTime+a+s)};t(1046.5,0,.1),t(1046.5,.15,.1),t(1046.5,.3,.2)}catch(t){console.warn("Audio play failed",t)}}const L={id:"",name:"未設定",email:"",university:"未設定",grade:1,bio:"",daily_goal:60,login_id:""},u={_s:(e,t="")=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;flex-shrink:0" ${t}>${e}</svg>`,_m:(e,t="")=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;flex-shrink:0;margin-right:6px" ${t}>${e}</svg>`,get flame(){return this._s('<path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/>')},get chart(){return this._m('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>')},get clock(){return this._m('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')},get book(){return this._m('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')},get brain(){return this._m('<path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2"/>')},get target(){return this._m('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>')},get trophy(){return this._m('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V16.5a.5.5 0 0 0-.5-.5h-1a4 4 0 0 1-4-4V4h16v8a4 4 0 0 1-4 4h-1a.5.5 0 0 0-.5.5V22"/>')},get list(){return this._m('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>')},get bell(){return this._m('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>')},get stats(){return this._m('<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>')},get calendar(){return this._m('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')},get shield(){return this._m('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>')},get users(){return this._m('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>')},get home(){return this._s('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')},get building(){return this._s('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10M9 6h.01M15 6h.01M9 10h.01M15 10h.01"/>')},get coffee(){return this._s('<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>')},get school(){return this._s('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>')},get train(){return this._s('<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>')},get pin(){return this._s('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>')},get check(){return this._s('<polyline points="20 6 9 17 4 12"/>')},get x(){return this._s('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')},get warn(){return this._s('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>')},get star(){return this._s('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>')},get starEmpty(){return this._s('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>')},get timer(){return this._s('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')},get tomato(){return this._s('<circle cx="12" cy="14" r="8"/><path d="M12 6V2"/><path d="M8 6c2-2 6-2 8 0"/>')},get question(){return this._s('<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>')},get megaphone(){return this._s('<path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>')},get crown(){return this._s('<path d="M2 4l3 12h14l3-12-5 4-5-4-5 4z" fill="currentColor"/>')},get globe(){return this._s('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>')},get lock(){return this._s('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>')}};function Be(e){return e==="自宅"?u.home:e==="図書館"?u.book:e==="カフェ"?u.coffee:e==="大学"?u.school:e==="移動中"?u.train:u.pin}function No(e){const t=Number(e);return t>=4.5||t>=3.5?"★":(t>=2.5||t>=1.5,"☆")}function Ha(e){const t=[5,4.5,4,3.5,3,2.5,2,1.5,1],o={5:"5.0 最高の集中",4.5:"4.5",4:"4.0 かなり集中",3.5:"3.5",3:"3.0 普通",2.5:"2.5",2:"2.0 やや散漫",1.5:"1.5",1:"1.0 集中できず"};return t.map(a=>`<option value="${a}" ${Number(e)==a?"selected":""}>${o[a]}</option>`).join("")}const qo=[300,180,180,180,180,180,300];function wa(){const e=localStorage.getItem("medfocus_weekly_goals");if(e)try{return JSON.parse(e)}catch{}return[...qo]}function Go(e){localStorage.setItem("medfocus_weekly_goals",JSON.stringify(e)),$&&E&&$.from("profiles").update({weekly_goals:JSON.stringify(e)}).eq("id",E.user.id).then(({error:t})=>{t&&console.warn("weekly_goals sync error:",t.message)})}function fa(){const e=ye(new Date),t=ve(e),o=localStorage.getItem("medfocus_daily_override_"+t);return o?parseInt(o):wa()[e.getDay()]}function Gt(){try{return JSON.parse(localStorage.getItem("medfocus_sleep_log")||"[]")}catch{return[]}}function Fa(e){localStorage.setItem("medfocus_sleep_log",JSON.stringify(e))}function Pa(e){return Gt().find(t=>t.date===e)||null}function Uo(e){const t=new Date,o=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0"),a=ye(t),s=ve(a),n=Gt();let l=n.find(p=>p.date===s);return l||(l={date:s},n.push(l)),l[e]=o,Fa(n),o}function va(){const e=ye(new Date),t=ve(e),o=Pa(t);return!o||!o.wake_up?"wake_up":"bedtime"}function Ro(e){if(!e||e.length===0)return 0;const t=e.length,a=e.reduce((n,l)=>n+l,0)/t;if(a===0)return 0;const s=e.reduce((n,l)=>n+Math.pow(l-a,2),0)/t;return Math.sqrt(s)/a}function Xe(e){const[t,o]=e.split(":").map(Number);let s=t*60+o-300;return s<0&&(s+=1440),s}function vo(e){return e>=5&&e<11?"morning":e>=11&&e<17?"afternoon":e>=17&&e<23?"evening":"night"}function Wo(e){return e==="morning"?"朝":e==="afternoon"?"昼":e==="evening"?"夜":"深夜"}function yo(e){const t=ye(new Date),o=ve(t);localStorage.setItem("medfocus_daily_override_"+o,e.toString());const a="medfocus_daily_snapshot_"+o,s=localStorage.getItem(a);if(s)try{const n=JSON.parse(s);n.goal_minutes=e,n.achievement_rate=e>0?Math.round(n.actual_minutes/e*100):0,localStorage.setItem(a,JSON.stringify(n))}catch{}if($&&E){const n=JSON.parse(localStorage.getItem("medfocus_daily_overrides_map")||"{}");n[o]=e;const l=Object.keys(n).sort();for(;l.length>30;)delete n[l.shift()];localStorage.setItem("medfocus_daily_overrides_map",JSON.stringify(n)),$.from("profiles").update({daily_overrides:JSON.stringify(n)}).eq("id",E.user.id).then(({error:p})=>{p&&console.warn("daily_overrides sync error:",p.message)})}}function ya(e){const t=ve(e),o=localStorage.getItem("medfocus_daily_override_"+t);if(o)return parseInt(o);try{const n=JSON.parse(localStorage.getItem("medfocus_daily_overrides_map")||"{}");if(n[t])return parseInt(n[t])}catch{}const a=localStorage.getItem("medfocus_daily_snapshot_"+t);if(a)try{return JSON.parse(a).goal_minutes}catch{}return wa()[e.getDay()]}function Jo(e,t,o){const a={goal_minutes:t,actual_minutes:o,achievement_rate:t>0?Math.round(o/t*100):0,saved_at:new Date().toISOString()};localStorage.setItem("medfocus_daily_snapshot_"+e,JSON.stringify(a))}function Vo(e){return e>=100?"#10b981":e>=80?"#ef4444":e>=60?"#f59e0b":e>=30?"#3b82f6":"#64748b"}let Qe=[],$a=[];const Me=[{id:"cat-vol1",name:"vol.1 基礎医学",color:"#4ECDC4",subjects:[{id:"1A",name:"1A 細胞生物学"},{id:"1B",name:"1B 組織・解剖"},{id:"1C",name:"1C 生理学"},{id:"1D",name:"1D 生化学"},{id:"1E",name:"1E 分子生物学"},{id:"1F",name:"1F 発生"},{id:"1G",name:"1G 微生物"},{id:"1H",name:"1H 免疫"},{id:"1I",name:"1I 薬理学"},{id:"1J",name:"1J 病理学総論"}]},{id:"cat-vol2",name:"vol.2 臨床医学",color:"#45B7D1",subjects:[{id:"2A",name:"2A 消化管"},{id:"2B",name:"2B 肝・胆・膵"},{id:"2C",name:"2C 循環器"},{id:"2D",name:"2D 代謝・内分泌"},{id:"2E",name:"2E 腎・泌尿器"},{id:"2F",name:"2F 免疫・膠原病"},{id:"2G",name:"2G 血液"},{id:"2H",name:"2H 感染症"},{id:"2I",name:"2I 呼吸器"},{id:"2J",name:"2J 神経"},{id:"2K",name:"2K 中毒"},{id:"2L",name:"2L 救急"},{id:"2M",name:"2M 麻酔科"},{id:"2N",name:"2N 老年医学"},{id:"2O",name:"2O 小児科"},{id:"2P",name:"2P 婦人科・乳腺外科"},{id:"2Q",name:"2Q 産科"},{id:"2R",name:"2R 眼科"},{id:"2S",name:"2S 耳鼻咽喉科"},{id:"2T",name:"2T 整形外科"},{id:"2U",name:"2U 精神科"},{id:"2V",name:"2V 皮膚科"},{id:"2W",name:"2W 泌尿器科"},{id:"2X",name:"2X 放射線科"}]},{id:"cat-vol3",name:"vol.3 医学総論・公衆衛生",color:"#F1948A",subjects:[{id:"3A",name:"3A 症候・病態"},{id:"3B",name:"3B 診療の知識・技能"},{id:"3C",name:"3C 身体診察"},{id:"3D",name:"3D 公衆衛生"}]},{id:"cat-other",name:"その他",color:"#94a3b8",subjects:[{id:"anki",name:"Anki"}]}],Oa={};Me.forEach(e=>e.subjects.forEach(t=>{Oa[t.name.toLowerCase()]=t.name,Oa[t.id.toLowerCase()]=t.name}));function yt(e){return e?Oa[e.toLowerCase()]||e:"未設定"}const Ut=[],Ko=[];let nt=localStorage.getItem("medfocus-theme")!=="light";function Ua(){nt?document.documentElement.classList.remove("light"):document.documentElement.classList.add("light");try{localStorage.setItem("medfocus-theme",nt?"dark":"light")}catch(e){console.warn("localStorage not available",e)}if(typeof Chart<"u"){const e=nt?"#94a3b8":"#3d6380",t=nt?"rgba(148,163,184,0.12)":"rgba(43,181,171,0.15)";Chart.defaults.color=e,Chart.defaults.borderColor=t}}function Bo(){nt=!nt,Ua(),at()}Ua();function k(e){let t=document.getElementById("toast-notif");t||(t=document.createElement("div"),t.id="toast-notif",t.className="toast",document.body.appendChild(t)),t.innerHTML=e,requestAnimationFrame(()=>{t.classList.add("show")}),clearTimeout(t._timer),t._timer=setTimeout(()=>{t.classList.remove("show")},2800)}function ye(e){const t=new Date(e);return t.getHours()<5&&t.setDate(t.getDate()-1),t}function ve(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function we(e){const t=Math.floor(e/60),o=e%60;return t===0?`${o}分`:o===0?`${t}時間`:`${t}時間${o}分`}function Qo(e){return Math.max(0,Math.ceil((new Date(e)-new Date)/(1e3*60*60*24)))}function fo(e){const t=new Date-new Date(e),o=Math.floor(t/6e4),a=Math.floor(t/36e5),s=Math.floor(t/864e5);return o<1?"たった今":o<60?`${o}分前`:a<24?`${a}時間前`:s<7?`${s}日前`:new Date(e).toLocaleDateString("ja-JP")}function dt(e){if(!e)return"?";const t=e.split(" ");return t.length>=2?t[0][0]+t[1][0]:e.slice(0,2)}const ho=["#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#F7DC6F","#BB8FCE","#85C1E9","#F1948A","#82E0AA","#F0B27A","#AED6F1"];function ht(e){let t=0;for(let o=0;o<e.length;o++)t=e.charCodeAt(o)+((t<<5)-t);return ho[Math.abs(t)%ho.length]}const Lt={};function Ea(e){Lt[e]&&(Lt[e].destroy(),delete Lt[e])}function bt(){Object.keys(Lt).forEach(Ea)}typeof Chart<"u"?(Chart.defaults.color="#94a3b8",Chart.defaults.borderColor="rgba(148,163,184,0.12)",Chart.defaults.font.family="'Inter','Noto Sans JP',sans-serif"):console.warn("DEBUG: Chart.js not loaded. Charts will be skipped.");function Yo(){return Math.random().toString(36).substring(2,8).toUpperCase()}async function ha(){if(!$)return;const e=Ra("countdowns");if(e){$a=e;return}const{data:t,error:o}=await $.from("exam_countdowns").select("*").order("exam_date",{ascending:!0});!o&&t&&($a=t,Wa("countdowns",t))}async function Rt(){if(!$||!E)return;const{data:e,error:t}=await $.from("group_members").select("role, groups(*)").eq("user_id",E.user.id).order("joined_at",{ascending:!0});!t&&e&&(Qe=e.map(o=>({...o.groups,role:o.role})))}const bo=[{category:"基礎医学: 解剖学",color:"#4ECDC4",topics:["骨格系","筋系","循環器系","呼吸器系","消化器系","神経系","感覚器系","泌尿生殖器系"]},{category:"基礎医学: 生理学",color:"#4ECDC4",topics:["細胞生理","神経生理","筋収縮","循環生理","呼吸生理","腎生理・体液","消化吸収","内分泌・代謝","体温調節","感覚・特殊感覚"]},{category:"基礎医学: 生化学",color:"#4ECDC4",topics:["糖代謝","脂質代謝","タンパク質・アミノ酸代謝","核酸代謝","ビタミン・補酵素","酵素論","エネルギー代謝（TCA・酸化的リン酸化）"]},{category:"基礎医学: 病理学",color:"#4ECDC4",topics:["細胞障害・適応","炎症","修復・再生","循環障害","腫瘍総論","感染病理","免疫病理"]},{category:"基礎医学: 微生物学",color:"#4ECDC4",topics:["細菌（グラム陽性・陰性）","ウイルス（DNA・RNA）","真菌・寄生虫","消毒・滅菌","感染防御"]},{category:"基礎医学: 免疫学",color:"#4ECDC4",topics:["自然免疫","獲得免疫","抗原抗体反応","アレルギー分類","免疫不全","自己免疫疾患"]},{category:"基礎医学: 薬理学",color:"#4ECDC4",topics:["薬物動態","薬力学","自律神経薬","循環器薬","抗菌薬","抗悪性腫瘍薬","中枢神経薬","内分泌・代謝薬"]},{category:"内科系: 循環器",color:"#45B7D1",topics:["虚血性心疾患","不整脈","心不全","弁膜症","大動脈疾患","高血圧","心筋症・心膜炎"]},{category:"内科系: 呼吸器",color:"#45B7D1",topics:["肺炎","COPD","喘息","肺癌","間質性肺炎","胸膜疾患","呼吸不全"]},{category:"内科系: 消化器",color:"#45B7D1",topics:["消化管（食道・胃・腸）疾患","肝臓疾患","胆道系疾患","膵臓疾患","消化管出血","腸閉塞・腸重積"]},{category:"内科系: 腎臓・泌尿器",color:"#45B7D1",topics:["急性・慢性腎不全","ネフローゼ・腎炎症候群","電解質異常","尿路感染","腎癌・膀胱癌"]},{category:"内科系: 内分泌・代謝",color:"#45B7D1",topics:["甲状腺疾患","副腎疾患","下垂体疾患","糖尿病","脂質異常症","骨代謝疾患"]},{category:"内科系: 血液",color:"#45B7D1",topics:["貧血（鉄欠乏・溶血等）","白血病","リンパ腫","多発性骨髄腫","凝固・出血疾患","輸血"]},{category:"内科系: 神経",color:"#45B7D1",topics:["脳血管障害","変性疾患（ALS・パーキンソン等）","認知症","てんかん","脱髄疾患","末梢神経障害","頭痛"]},{category:"内科系: 膠原病・免疫",color:"#45B7D1",topics:["関節リウマチ","SLE","強皮症・多発筋炎","シェーグレン","血管炎症候群"]},{category:"内科系: 感染症",color:"#45B7D1",topics:["細菌感染（敗血症等）","ウイルス感染（HIV等）","性感染症","院内感染・抗菌薬適正使用"]},{category:"外科系: 外科総論",color:"#96CEB4",topics:["術前・術後管理","輸液・輸血","ショック対応","創傷・感染管理","麻酔"]},{category:"外科系: 消化器外科",color:"#96CEB4",topics:["消化器癌（胃・大腸・膵・肝）","虫垂炎","ヘルニア","急性腹症"]},{category:"外科系: 胸部外科",color:"#96CEB4",topics:["肺癌手術","縦隔腫瘍","食道外科","心臓外科"]},{category:"外科系: 脳神経外科",color:"#96CEB4",topics:["頭部外傷","脳腫瘍","脳血管手術","水頭症"]},{category:"外科系: 整形外科",color:"#96CEB4",topics:["骨折・脱臼","脊椎疾患","変形性関節症","スポーツ傷害","骨腫瘍"]},{category:"外科系: 泌尿器科",color:"#96CEB4",topics:["前立腺癌・肥大","腎・膀胱腫瘍","尿路結石","男性不妊"]},{category:"産科・婦人科: 産科",color:"#F7DC6F",topics:["正常妊娠・分娩","妊娠高血圧症候群","前置胎盤・常位胎盤早期剥離","早産・流産","胎児発育不全","多胎妊娠"]},{category:"産科・婦人科: 婦人科",color:"#F7DC6F",topics:["子宮癌（頸癌・体癌）","卵巣腫瘍","子宮内膜症","月経異常","更年期障害","不妊症"]},{category:"小児・精神: 小児科",color:"#BB8FCE",topics:["発達・発育","先天奇形・染色体異常","新生児疾患","小児感染症","先天性心疾患","小児腫瘍","予防接種"]},{category:"小児・精神: 精神科",color:"#BB8FCE",topics:["統合失調症","気分障害（双極・うつ）","不安障害","認知症（精神科的側面）","物質依存","児童精神（発達障害）","向精神薬"]},{category:"社会医学: 公衆衛生",color:"#F1948A",topics:["疫学（コホート・症例対照等）","スクリーニング","感染症法","予防医学（一次〜三次）","死亡統計・人口動態"]},{category:"社会医学: 医療制度・倫理",color:"#F1948A",topics:["医療保険制度","医の倫理（インフォームドコンセント等）","医師法・医療法","介護保険","産業保健"]},{category:"救急・集中: 救急総論",color:"#82E0AA",topics:["ACLS・BLS","外傷初期対応（JATEC）","中毒","熱中症・凍傷","溺水・電撃傷"]},{category:"救急・集中: ICU管理",color:"#82E0AA",topics:["人工呼吸管理","血行動態モニタリング","ARDS・DIC","栄養管理","鎮静・鎮痛"]}],xo=[{category:"国試基礎: 解剖・生理・生化学",color:"#4ECDC4",topics:["体表解剖・断面像（CT/MRI読影）","神経解剖（脳神経・脊髄路）","血管走行・分布","リンパ節・リンパ流","組織像（病理との連携）","心電図・不整脈生理","肺気量・換気・拡散能","GFR・クリアランス","ホルモンフィードバック","自律神経調節","先天性代謝異常（PKU・ガラクトース血症等）","ビタミン欠乏症","微量元素","栄養評価（NRS・SGA）","輸液の組成と適応"]},{category:"国試基礎: 病態生理",color:"#4ECDC4",topics:["ショックの分類と治療","DIC機序","電解質・酸塩基平衡異常","全身炎症反応（SIRS・敗血症）","腫瘍マーカーと病態"]},{category:"国試内科: 循環器・呼吸器",color:"#45B7D1",topics:["急性冠症候群（診断・治療）","心電図判読（ST変化・ブロック等）","心不全（HFrEF・HFpEF）","弁膜症（AS・MR・MS等）","不整脈（AF・VT・WPW等）","高血圧緊急症","大動脈解離・大動脈瘤","心タンポナーデ","先天性心疾患（成人含む）","肺塞栓症","肺炎（市中・院内・非定型）","COPD（診断・増悪管理）","気管支喘息（ステップ治療）","肺癌（病型・治療選択）","間質性肺炎（UIP・NSIP等）","胸膜炎・膿胸","気胸","呼吸不全（I型・II型）","睡眠時無呼吸症候群","サルコイドーシス"]},{category:"国試内科: 消化器・肝・腎",color:"#45B7D1",topics:["食道癌・食道炎","胃癌・胃潰瘍・H.pylori","炎症性腸疾患（UC・CD）","大腸癌・ポリポーシス","急性膵炎・慢性膵炎","膵癌","胆石・胆嚢炎・胆管炎","消化管出血（上部・下部）","腸閉塞・腸重積","虚血性腸疾患","ウイルス性肝炎（B・C型）","肝硬変・合併症","肝細胞癌","自己免疫性肝炎・PBC・PSC","アルコール性肝疾患","NAFLD/NASH","肝不全・肝移植適応","急性腎障害（AKI）","慢性腎臓病（CKD）・透析","ネフローゼ症候群（一次・二次）","腎炎症候群（IgA腎症等）","電解質異常（Na・K・Ca・P）","酸塩基平衡異常","腎血管性高血圧"]},{category:"国試内科: 代謝・血液・神経",color:"#45B7D1",topics:["1型・2型糖尿病（診断基準・合併症・治療）","甲状腺疾患（バセドウ・橋本・癌）","副腎疾患（クッシング・アジソン・褐色細胞腫）","下垂体・視床下部疾患","副甲状腺・Ca代謝","脂質異常症・メタボリック症候群","高尿酸血症・痛風","鉄欠乏性・巨赤芽球性・溶血性貧血","再生不良性貧血・MDS","急性・慢性白血病（分類・治療）","悪性リンパ腫（ホジキン・非ホジキン）","多発性骨髄腫","凝固・出血（血友病・ITP・TTP）","輸血療法・副反応","脳梗塞・TIA（rtPA適応・二次予防）","脳出血・くも膜下出血","変性疾患（ALS・パーキンソン・MSA等）","認知症（AD・DLB・FTD・VaD）","てんかん（分類・薬物選択）","多発性硬化症・視神経脊髄炎","末梢神経障害・ギラン・バレー","髄膜炎・脳炎","頭痛（片頭痛・群発・二次性）"]},{category:"国試内科: 膠原病・感染症",color:"#45B7D1",topics:["関節リウマチ（診断・生物学的製剤）","SLE（分類・臓器病変）","強皮症・多発筋炎/皮膚筋炎","シェーグレン症候群","血管炎（GPA・MPA・大動脈炎等）","抗リン脂質抗体症候群","成人Still病","敗血症・敗血症性ショック","市中・院内感染の管理","HIV/AIDS（診断・治療・日和見感染）","結核（診断・治療・接触者対応）","性感染症","マラリア・寄生虫","抗菌薬の選択と耐性（MRSA・ESBL等）","ワクチン予防可能疾患"]},{category:"国試外科: 外科総論・消化器・胸部",color:"#96CEB4",topics:["術前評価（心肺・肝腎機能）","周術期管理・輸液","麻酔の種類と管理","創傷治癒・感染管理","ドレーン管理","術後合併症（肺塞栓・縫合不全等）","消化管癌の術式（食道・胃・大腸・直腸）","肝・胆・膵の手術適応","急性腹症の鑑別と処置","虫垂炎・腹膜炎","ヘルニア（鼠経・腹壁等）","消化管穿孔","肺癌の病期・術式","縦隔腫瘍・胸腺腫","食道癌の集学的治療","弁膜症・CABG適応","大動脈外科（解離・瘤）"]},{category:"国試外科: 脳神・整形・泌尿・皮膚",color:"#96CEB4",topics:["頭部外傷（硬膜外・硬膜下血腫）","脳腫瘍（グリオーマ・転移性）","脳動脈瘤・AVM","正常圧水頭症","腰椎・頚椎手術","骨折の分類・治療原則","脊椎疾患（椎間板・脊柱管狭窄）","変形性関節症・人工関節","関節リウマチ整形外科的治療","骨腫瘍（良性・悪性）","スポーツ傷害","腎癌・膀胱癌・前立腺癌","前立腺肥大症","尿路結石","尿路感染（腎盂腎炎・膀胱炎）","男性不妊・ED","皮膚癌（基底細胞・有棘細胞・悪性黒色腫）","熱傷（程度・面積・治療）","皮膚炎・湿疹","感染性皮膚疾患（帯状疱疹等）","乾癬・天疱瘡"]},{category:"国試外科: 眼科・耳鼻科",color:"#96CEB4",topics:["緑内障・白内障・網膜疾患","眼感染症・ぶどう膜炎","難聴（伝音・感音）","めまい（メニエール・BPPVほか）","副鼻腔炎・鼻ポリープ","頭頸部癌"]},{category:"国試産科・婦人科",color:"#F7DC6F",topics:["正常妊娠・分娩・産褥","妊娠高血圧症候群（PIH）","前置胎盤・常位胎盤早期剥離","早産・切迫早産・流産","胎児発育不全・胎児機能不全","多胎妊娠","産科的DIC","新生児蘇生法（NCPR）","先天異常の出生前診断","妊娠中の薬物投与","子宮頸癌（HPV・検診・治療）","子宮体癌（診断・治療）","卵巣腫瘍（良性・悪性・境界）","子宮内膜症・子宮腺筋症","子宮筋腫","月経異常（無月経・月経困難症）","更年期障害・HRT","不妊症の原因と治療","性感染症（産婦人科的側面）"]},{category:"国試小児科",color:"#BB8FCE",topics:["正常新生児の管理","新生児仮死・蘇生","新生児黄疸","低出生体重児の管理","発達・発育の評価","発達障害（ASD・ADHD・LD）","先天性心疾患（VSD・ASD・TOF・PDA等）","小児感染症（麻疹・風疹・水痘・手足口病等）","川崎病","小児悪性腫瘍（白血病・神経芽腫・Wilms腫瘍）","気管支喘息（小児）","1型糖尿病","染色体・先天異常症候群（ダウン等）","予防接種（定期・任意・スケジュール）","熱性痙攣・てんかん（小児）","アレルギー疾患（食物・アトピー）"]},{category:"国試精神科",color:"#BB8FCE",topics:["統合失調症（陽性・陰性症状・治療）","双極性障害（I型・II型）","うつ病・持続性抑うつ","不安症・パニック症・社交不安症","強迫症・PTSD","身体症状症","摂食障害（拒食・過食）","物質使用障害（アルコール・薬物）","認知症の精神科的管理","自殺リスク評価と対応","向精神薬（抗精神病薬・抗うつ薬・気分安定薬）","電気けいれん療法（ECT）","精神科救急","精神保健福祉法（入院形態）","措置入院・医療保護入院"]},{category:"国試救急・集中治療",color:"#82E0AA",topics:["BLS・ACLS（一次・二次救命処置）","外傷初期対応（JATEC・ATLS）","多発外傷・外傷性脳損傷","急性中毒（薬物・CO・農薬等）","熱中症・低体温症","溺水・電撃傷-高山病","急性腹症の鑑別","アナフィラキシー","人工呼吸管理（設定・ウィーニング）","血行動態モニタリング","敗血症管理（バンドル）","ARDS","DIC治療","急性腎障害のICU管理","栄養管理（経腸・経静脈）","鎮痛・鎮静・せん妄（PADガイドライン）"]},{category:"国試社会医学・公衆衛生",color:"#F1948A",topics:["疫学・統計","行政・法律","社会保障・保健","感染症法（1〜5類・指定感染症）","医師法・医療法・薬機法","個人情報保護・守秘義務","医療保険制度（国保・被用者保険・後期高齢）","介護保険（要介護認定・サービス）","母子保健（母子健康手帳・乳幼児健診）","がん検診・特定健診","予防医学（一次・二次・三次）","相対危険度・オッズ比・寄与危険度"]},{category:"国試臨床倫理・医療安全",color:"#F1948A",topics:["インフォームドコンセント","患者の自律性・意思能力","終末期医療・ACP（事前ケア計画）","DNR・DNAR","臓器提供・脳死","安楽死・尊厳死の倫理","研究倫理（ヘルシンキ宣言）","医療事故の定義と報告","インシデントレポート","チーム医療・多職種連携","医療訴訟・過失の概念","感染管理（標準予防策・PPE）"]}];let ja=[];async function Mo(){if(!$||!E)return[];const e=Ra("checklists");if(e)return ja=e,e;const{data:t,error:o}=await $.from("user_checklist_progress").select("category, topic, completed").eq("user_id",E.user.id);return!o&&t&&(ja=t,Wa("checklists",t)),ja}async function Xo(e,t=null){if(!$||!E)return;const o=Yo(),{data:a,error:s}=await $.from("groups").insert([{name:e,invite_code:o,created_by:E.user.id,icon_url:t}]).select().single();if(s){k(u.x+" グループ作成失敗: "+s.message),console.error("Group create error:",s);return}const{error:n}=await $.from("group_members").insert([{group_id:a.id,user_id:E.user.id,role:"admin"}]);n?k(u.x+" メンバー追加失敗: "+n.message):(k(u.check+" グループを作成しました！"),await Rt(),Vt())}async function Zo(e,t,o){if(!$||!E)return;const{error:a}=await $.from("groups").update({name:t,icon_url:o}).eq("id",e).eq("created_by",E.user.id);if(a){k(u.x+" 更新に失敗しました: "+a.message);return}k(u.check+" グループ情報を更新しました"),await Rt(),Vt()}async function Ta(e,t="avatars"){if(!$||!E)return null;const o=e.name.split(".").pop(),a=`${E.user.id}/${Date.now()}.${o}`,{error:s}=await $.storage.from(t).upload(a,e);if(s)return console.error("Upload error:",s),k(u.x+" アップロードに失敗しました: "+s.message),null;const{data:{publicUrl:n}}=$.storage.from(t).getPublicUrl(a);return n}async function es(e){if(!$||!E)return;const{data:t,error:o}=await $.from("groups").select("*").eq("invite_code",e.trim().toUpperCase()).single();if(o||!t){k(u.x+" 無効な招待コードです");return}const{error:a}=await $.from("group_members").insert([{group_id:t.id,user_id:E.user.id}]);a?a.code==="23505"?k(u.warn+" 既に参加しているグループです"):k(u.x+" 参加に失敗しました"):(k(u.check+" グループに参加しました！"),await Rt(),Vt())}async function ts(e){if(!$||!E)return;const{error:t}=await $.from("group_members").delete().match({group_id:e,user_id:E.user.id});t?k(u.x+" 退室に失敗しました"):(k(u.check+" 退室しました"),await Rt(),Vt())}async function as(e,t){if(!$)return[];const{data:o,error:a}=await $.from("group_members").select("user_id, profiles(full_name)").eq("group_id",e);if(a||!o)return[];const s=o.map(w=>w.user_id);if(s.length===0)return[];const l=ye(new Date),p=new Date(l);if(t==="weekly"){const w=l.getDay(),v=w===0?6:w-1;p.setDate(l.getDate()-v),p.setHours(5,0,0,0)}else p.setHours(5,0,0,0);const{data:c,error:b}=await $.from("study_logs").select("user_id, duration_minutes").in("user_id",s).gte("started_at",p.toISOString()),_=b||!c?[]:c,f={};return s.forEach(w=>f[w]=0),_.forEach(w=>{f[w.user_id]+=w.duration_minutes}),o.map(w=>{var v;return{userId:w.user_id,name:((v=w.profiles)==null?void 0:v.full_name)||"名前未設定",total:f[w.user_id]}}).sort((w,v)=>v.total-w.total)}const na={},os=3e4;function Ra(e){const t=na[e];return t&&Date.now()-t.ts<os?t.data:null}function Wa(e,t){na[e]={data:t,ts:Date.now()}}function da(e){e?delete na[e]:Object.keys(na).forEach(t=>delete na[t])}async function Da(){if(!$||!E)return[];const e=Ra("study_logs");if(e)return e;const{data:t,error:o}=await $.from("study_logs").select("*").eq("user_id",E.user.id).order("started_at",{ascending:!1}),a=o?[]:t;return Wa("study_logs",a),a}async function Lo(e,t,o,a=2,s="未設定",n=null,l=null,p=null){if(!$||!E)return!0;try{const c=new Date().toISOString(),b={user_id:E.user.id,subject_name:e,duration_minutes:t,memo:o||null,focus_level:a,location:s,started_at:n||c,ended_at:l||c};p&&p.length>0&&(b.breaks=JSON.stringify(p));const{error:_}=await $.from("study_logs").insert([b]);if(_)return console.error("Supabase save error:",_),k(u.x+" 保存に失敗しました: "+_.message),!1;{da("study_logs");const f=ye(new Date),w=ve(f),v=fa(),S=await Da(),D=new Date(f);D.setHours(5,0,0,0);const d=new Date(f);d.setHours(28,59,59,999);const m=S.filter(y=>{const h=new Date(y.started_at);return h>=D&&h<=d}).reduce((y,h)=>y+h.duration_minutes,0);return Jo(w,v,m),k(u.check+" 勉強記録を保存しました！"),!0}}catch(c){return console.error("saveStudyLog exception:",c),k(u.x+" エラーが発生しました"),!1}}async function ss(e,t,o,a,s,n=2,l="未設定",p=null){if(!$||!E)return;if(!p&&a){const _=new Date(a);_.setMinutes(_.getMinutes()+o),p=_.toISOString()}const c={subject_name:t,duration_minutes:o,started_at:a,memo:s||null,focus_level:n,location:l};p&&(c.ended_at=p);const{error:b}=await $.from("study_logs").update(c).eq("id",e);b?k(u.x+" 更新に失敗しました"):(da("study_logs"),k(u.check+" 記録を更新しました！"))}async function is(e){if(!$||!E)return;const{error:t}=await $.from("study_logs").delete().eq("id",e);t?k(u.x+" 削除に失敗しました"):(da("study_logs"),k(u.check+" 記録を削除しました！"))}async function ns(){if(!$)return Ut;let{data:e,error:t}=await $.from("posts").select("*, profiles(full_name), groups(name), post_replies(*, profiles(full_name))").order("created_at",{ascending:!1});if(t){console.warn("DEBUG: fetchPosts joined query failed. Trying robust secondary fetching strategy. Error:",t);let o;if(t.message&&t.message.includes("group_id")?o=await $.from("posts").select("*, profiles(full_name), post_replies(*, profiles(full_name))").order("created_at",{ascending:!1}):o=await $.from("posts").select("*").order("created_at",{ascending:!1}),o.error)return console.error("DEBUG: fetchPosts cannot even fetch base posts:",o.error),[];e=o.data}return console.log("DEBUG: fetchPosts raw data:",e),e}async function rs(e){if(!$||!E){const a=Ut.findIndex(s=>s.id===e);a!==-1&&(Ut.splice(a,1),k(u.check+" 投稿を削除しました（デモ）"),await ft());return}const{error:t}=await $.from("post_replies").delete().eq("post_id",e),{error:o}=await $.from("posts").delete().match({id:e,user_id:E.user.id});o?k(u.x+" 削除に失敗しました: "+o.message):(k(u.check+" 投稿を削除しました"),await ft())}async function ls(e){if(!$||!E){Ut.forEach(o=>{if(o.post_replies){const a=o.post_replies.findIndex(s=>s.id===e);a!==-1&&o.post_replies.splice(a,1)}}),k(u.check+" 返信を削除しました（デモ）"),await ft();return}const{error:t}=await $.from("post_replies").delete().match({id:e,user_id:E.user.id});t?k(u.x+" 削除に失敗しました: "+t.message):(k(u.check+" 返信を削除しました"),await ft())}async function cs(e,t,o){var s;if(!$||!E){const n=Ut.find(l=>l.id===e);return n?(n.post_replies||(n.post_replies=[]),n.post_replies.push({id:"reply-"+Date.now(),created_at:new Date().toISOString(),user_id:((s=E==null?void 0:E.user)==null?void 0:s.id)||L.id,body:t,is_anonymous:o,profiles:{full_name:L.name}}),k(u.check+" 返信しました（デモ）"),!0):!1}let{error:a}=await $.from("post_replies").insert([{post_id:e,user_id:E.user.id,body:t,is_anonymous:o}]);return a&&a.code==="42703"&&(a=(await $.from("post_replies").insert([{post_id:e,user_id:E.user.id,body:t}])).error),a?(console.error("DEBUG: Supabase savePostReply failed:",a),k(u.x+" 返信の失敗: "+(a.message||"エラーが発生しました")),!1):(k(u.check+" 返信を投稿しました！"),!0)}async function ds(e,t,o,a,s=null){var l;if(!$||!E){const p={id:"local-"+Date.now(),created_at:new Date().toISOString(),user_id:((l=E==null?void 0:E.user)==null?void 0:l.id)||L.id,title:e,body:t,type:o,is_anonymous:a,group_id:s,likes:0,post_replies:[],profiles:{full_name:L.name}};Ut.unshift(p),k(" 投稿しました！(デモ)");return}console.log("DEBUG: savePost called",{title:e,body:t,type:o,isAnonymous:a,groupId:s});let{error:n}=await $.from("posts").insert([{user_id:E.user.id,title:e,body:t,type:o,is_anonymous:a,group_id:s}]);n&&console.warn("DEBUG: savePost first attempt error:",n),n&&n.message&&(n.message.includes("is_anonymous")||n.code==="42703")&&(console.warn("DEBUG: is_anonymous column missing or ambiguous. retrying without it."),n=(await $.from("posts").insert([{user_id:E.user.id,title:e,body:t,type:o,group_id:s}])).error),n&&(console.error("DEBUG: Supabase savePost failed:",n),k(" 投稿に失敗しました: "+(n.message||"データベースエラー")))}async function us(e,t,o,a){if(!$||!E)return console.log("DEBUG: saveFeedback (local/demo mode)",{title:e,body:t,category:o,isAnonymous:a}),k(" 貴重なご意見ありがとうございます！（デモ）"),!0;const{error:s}=await $.from("feedbacks").insert([{user_id:E.user.id,title:e,body:t,category:o,is_anonymous:a}]);return s?(console.error("DEBUG: Supabase saveFeedback failed:",s),k(" 送信に失敗しました: "+(s.message||"Error")),!1):(k(" 貴重なご意見ありがとうございます！"),!0)}document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&(ee||Jt)&&jo()});typeof Chart<"u"&&(Chart.defaults.color="#94a3b8",Chart.defaults.borderColor="rgba(148,163,184,0.12)",Chart.defaults.font.family="'Inter','Noto Sans JP',sans-serif");let ra=null,ne=0,ee=!1,se=!1,Z=0,_e=0,Jt=!1,Le=!1,Je="study",$e=!1,Ve="study",qe=1,Re=6,Fe=60,rt=10,ua=0,Na=0,mt=0,Ue=0,xe="",lt="",Ce="自宅",jt=2,We=0,Tt=null,Ke=[];function Pe(){localStorage.setItem("medfocus_timer_v2",JSON.stringify({isRunning:ee,isCountdown:se,isPomodoro:Le,pomodoroPhase:Je,elapsedSeconds:ne,countdownSeconds:Z,isSimulation:$e,simulationPhase:Ve,simulationBlockCurrent:qe,simulationBlockTotal:Re,simulationStudyMin:Fe,simulationBreakMin:rt,isConfirmingLog:Jt,pendingLogDuration:ua,selectedSubjectId:xe,selectedSubjectCustom:lt,selectedLocation:Ce,selectedFocusLevel:jt,cumulativeStudySeconds:We,sessionStartedAt:Tt,sessionBreaks:Ke,lastUpdate:Date.now()}))}function jo(){const e=localStorage.getItem("medfocus_timer_v2");if(!e)return;const t=JSON.parse(e);ee=t.isRunning,se=t.isCountdown,Le=t.isPomodoro||!1,Je=t.pomodoroPhase||"study",$e=t.isSimulation||!1,Ve=t.simulationPhase||"study",qe=t.simulationBlockCurrent||1,Re=t.simulationBlockTotal||6,Fe=t.simulationStudyMin||60,rt=t.simulationBreakMin||10,Jt=t.isConfirmingLog||!1,ua=t.pendingLogDuration||0,xe=t.selectedSubjectId||"",lt=t.selectedSubjectCustom||"",Ce=t.selectedLocation||"自宅",jt=t.selectedFocusLevel||2,We=t.cumulativeStudySeconds||0,Tt=t.sessionStartedAt||null,Ke=t.sessionBreaks||[];const o=Math.floor((Date.now()-t.lastUpdate)/1e3);if(ee){if(ne=t.elapsedSeconds+o,se&&(Z=Math.max(0,t.countdownSeconds-o),Z===0)){ee=!1,Ia();return}ct()}else ne=t.elapsedSeconds,Z=t.countdownSeconds}let gt=null,Nt=null,ka=null,_a=null,tt=!1,Ne=null;const qa=[{id:"navy",label:"🟦",bg:"#1e293b",text:"#f1f5f9",sub:"#cbd5e1",track:"#334155",accent:"#4ecdc4"},{id:"forest",label:"🟩",bg:"#14532d",text:"#dcfce7",sub:"#bbf7d0",track:"#166534",accent:"#4ade80"},{id:"purple",label:"🟪",bg:"#2e1065",text:"#f3e8ff",sub:"#ddd6fe",track:"#4c1d95",accent:"#a78bfa"},{id:"rose",label:"🟥",bg:"#4c1d2a",text:"#ffe4e6",sub:"#fecdd3",track:"#881337",accent:"#fb7185"},{id:"mono",label:"⬛",bg:"#27272a",text:"#fafafa",sub:"#d4d4d8",track:"#3f3f46",accent:"#a1a1aa"},{id:"light",label:"⬜",bg:"#f8fafc",text:"#0f172a",sub:"#475569",track:"#e2e8f0",accent:"#3b82f6"}];let ba=parseInt(localStorage.getItem("medfocus_pip_theme")||"0");function la(){return qa[ba%qa.length]}function ps(){ba=(ba+1)%qa.length,localStorage.setItem("medfocus_pip_theme",ba)}function ms(){if(Nt)return;const e=Math.max(window.devicePixelRatio||1,2);Nt=document.createElement("canvas"),Nt.width=640*e,Nt.height=240*e,ka=Nt.getContext("2d"),ka.scale(e,e),gt=document.createElement("video"),gt.muted=!0,gt.autoplay=!0,gt.playsInline=!0}function To(){if(xe==="custom")return lt||"自由入力";if(xe){const t=Me.flatMap(o=>o.subjects).find(o=>o.id===xe);return t?t.name:xe}return""}function Ao(){return $e?`模試 B${qe}/${Re}`:Le?Je==="study"?"ポモドーロ":"休憩":se?"タイマー":"ストップウォッチ"}function Ja(){if(!ka)return;const e=ka,t=640,o=240,a=la();e.clearRect(0,0,t,o),e.fillStyle=a.bg,e.fillRect(0,0,t,o);const s=v=>String(v).padStart(2,"0"),n=se?Z:ne,l=Math.floor(n/3600),p=Math.floor(n%3600/60),c=n%60,b=l>0?`${s(l)}:${s(p)}:${s(c)}`:`${s(p)}:${s(c)}`,_=To(),f=Ao(),w=_?`${f}  ·  ${_}`:f;if(e.fillStyle=a.accent,e.font="600 28px -apple-system, sans-serif",e.textAlign="center",e.fillText(w,t/2,38),e.fillStyle=ee?a.text:a.sub,e.font='bold 80px ui-monospace, "SF Mono", monospace',e.fillText(b,t/2,130),se&&_e>0){const v=Z/_e,S=40,D=160,d=t-80,m=10;e.fillStyle=a.track,e.beginPath(),e.roundRect(S,D,d,m,5),e.fill(),e.fillStyle=a.accent,e.beginPath(),e.roundRect(S,D,Math.max(m,d*v),m,5),e.fill()}e.fillStyle=a.accent,e.font="600 24px -apple-system, sans-serif",e.fillText(ee?"⏸ 一時停止":"▶ 開始",t/2,210)}async function gs(){const e=la();Ne=await window.documentPictureInPicture.requestWindow({width:380,height:200}),tt=!0;const t=Ne.document;t.title="MedFocus Timer",t.head.innerHTML=`<style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:-apple-system,'Helvetica Neue',sans-serif;background:${e.bg};color:${e.text};display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden;user-select:none;}
    .info{font-size:14px;color:${e.accent};font-weight:700;margin-bottom:3px;letter-spacing:0.3px;}
    .label{font-size:13px;color:${e.sub};font-weight:500;margin-bottom:4px;}
    .time{font-size:52px;font-weight:800;font-family:ui-monospace,'SF Mono',monospace;letter-spacing:-2px;line-height:1;}
    .time.paused{opacity:0.45;}
    .bar-wrap{width:85%;height:8px;background:${e.track};border-radius:4px;margin:10px 0;overflow:hidden;}
    .bar-fill{height:100%;border-radius:4px;background:${e.accent};transition:width 0.3s;}
    .controls{display:flex;gap:10px;margin-top:6px;}
    .btn{padding:6px 20px;border:none;border-radius:20px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;}
    .btn-start{background:${e.accent};color:${e.bg};}
    .btn-stop{background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.3);}
    .btn-stop:hover{background:rgba(239,68,68,0.35);}
    .btn-start:hover{filter:brightness(1.15);}
  </style>`,t.body.innerHTML=`
    <div class="info" id="pip-info"></div>
    <div class="label" id="pip-label"></div>
    <div class="time" id="pip-time"></div>
    <div class="bar-wrap" id="pip-bar-wrap" style="display:none;"><div class="bar-fill" id="pip-bar"></div></div>
    <div class="controls">
      <button class="btn btn-start" id="pip-toggle">▶ 開始</button>
      <button class="btn btn-stop" id="pip-finish">⏹ 終了</button>
    </div>`,t.getElementById("pip-toggle").addEventListener("click",()=>{ee?pa():ct(),Sa()}),t.getElementById("pip-finish").addEventListener("click",()=>{ee&&Ia(!0),Ne.close()}),Ne.addEventListener("pagehide",()=>{tt=!1,Ne=null}),zo(),k(u.check+" ミニタイマーをフローティング表示しました")}function zo(){if(!Ne||Ne.closed){tt=!1,Ne=null;return}const e=Ne.document,t=d=>String(d).padStart(2,"0"),o=se?Z:ne,a=Math.floor(o/3600),s=Math.floor(o%3600/60),n=o%60,l=a>0?`${t(a)}:${t(s)}:${t(n)}`:`${t(s)}:${t(n)}`,p=e.getElementById("pip-info"),c=e.getElementById("pip-label"),b=e.getElementById("pip-time"),_=e.getElementById("pip-toggle"),f=e.getElementById("pip-bar-wrap"),w=e.getElementById("pip-bar"),v=To(),S=Ao();p&&(p.textContent=v?`${S}  ·  ${v}`:S);let D=se?"残り時間":"経過時間";c&&(c.textContent=D),b&&(b.textContent=l,b.className=ee?"time":"time paused"),_&&(_.textContent=ee?"⏸ 一時停止":"▶ 開始",_.className="btn btn-start"),se&&_e>0?(f&&(f.style.display="block"),w&&(w.style.width=`${Z/_e*100}%`)):f&&(f.style.display="none")}async function vs(){if(tt){Ne&&!Ne.closed?Ne.close():document.pictureInPictureElement&&await document.exitPictureInPicture().catch(()=>{}),tt=!1,k(u.check+" ミニタイマーを閉じました");return}if("documentPictureInPicture"in window)try{await gs();return}catch(e){console.warn("Doc PiP failed:",e)}try{ms(),Ja(),_a=Nt.captureStream(0),gt.srcObject=_a,await gt.play(),await gt.requestPictureInPicture(),tt=!0,k(u.check+" ミニタイマーをフローティング表示しました"),"mediaSession"in navigator&&(navigator.mediaSession.metadata=new MediaMetadata({title:"MedFocus Timer",artist:"学習タイマー"}),navigator.mediaSession.setActionHandler("play",()=>{ee||ct()}),navigator.mediaSession.setActionHandler("pause",()=>{ee&&pa(),Sa()})),gt.addEventListener("leavepictureinpicture",()=>{tt=!1},{once:!0})}catch(e){console.warn("PiP not supported:",e),k(" このブラウザではPiPがサポートされていません")}}function Sa(){if(Ne&&!Ne.closed){zo();return}if(!tt||!_a)return;Ja();const e=_a.getVideoTracks()[0];e&&e.requestFrame&&e.requestFrame()}function Ho(){if(!ee){document.title="MedFocus";return}const e=n=>String(n).padStart(2,"0"),t=se?Z:ne,o=Math.floor(t/60),a=t%60,s="";document.title=`${s} ${e(o)}:${e(a)} - MedFocus`}function ct(){if(!(ee&&!ra)){if(ee)return}Tt||(Tt=new Date().toISOString()),Ke.length>0&&!Ke[Ke.length-1].end&&(Ke[Ke.length-1].end=new Date().toISOString()),ee=!0,Na=Date.now(),mt=ne,Ue=Z,Pe(),ra=setInterval(()=>{const e=Math.floor((Date.now()-Na)/1e3);ne=mt+e,se&&(Z=Math.max(0,Ue-e),Z===0&&ee&&(Co(),Ia())),ne%5===0&&Pe();const t=document.getElementById("timer-display");if(t){const a=ia(se?Z:ne);t.innerHTML!==a&&(t.innerHTML=a)}const o=document.getElementById("timer-ring");if(o){const a=2*Math.PI*140;let s,n;se&&_e>0?(s=Z/_e,n=s*120,n=s*360%360,o.style.strokeDashoffset=a-s*a,o.style.stroke=`hsl(${n}, 80%, 60%)`):se||(s=ne%1800/1800,n=s*360%360,o.style.strokeDashoffset=a-s*a,o.style.stroke=`hsl(${n}, 80%, 60%)`)}Sa(),Ho()},200)}function Ia(e=!1){if(pa(),e)Le&&Je==="study"||$e&&Ve==="study"?We+=ne:!Le&&!$e&&(We=ne);else{if($e)if(Ve==="study"){We+=ne,k(u.check+` ブロック${qe}完了！休憩に入ります。`),qe>=Re?(k(u.check+" 全ブロック完了！お疲れ様でした！"),$e=!1,qe=1):(Ve="break",Z=rt*60,Ue=rt*60,_e=rt*60,ne=0,mt=0,Pe(),ct()),(et==="/study"||window.location.pathname==="/study")&&be();return}else{qe++,k(u.check+` 休憩終了！ブロック${qe}開始！`),Ve="study",Z=Fe*60,Ue=Fe*60,_e=Fe*60,ne=0,mt=0,Pe(),ct(),(et==="/study"||window.location.pathname==="/study")&&be();return}if(Le)if(Je==="study"){We+=ne,k(u.tomato+" 25分の集中完了！5分休憩に入ります。"),Je="break",Z=5*60,Ue=5*60,_e=5*60,ne=0,mt=0,Pe(),ct(),(et==="/study"||window.location.pathname==="/study")&&be();return}else{k("🚀 休憩終了！ポモドーロ再開！"),Je="study",Z=25*60,Ue=25*60,_e=25*60,ne=0,mt=0,Pe(),ct(),(et==="/study"||window.location.pathname==="/study")&&be();return}}e||(!Le&&!$e?We=ne:(Le&&Je==="study"||$e&&Ve==="study")&&(We+=ne)),ua=Math.floor(We/60),Jt=!0,Pe();const t=document.querySelector(".stopwatch-card");if(t){let o=document.getElementById("session-finish-overlay");o||(o=document.createElement("div"),o.id="session-finish-overlay",o.className="timer-overlay animate-fade-in",o.style="position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:var(--space-md); text-align:center; background:var(--color-bg-primary);",t.appendChild(o)),Me.flatMap(n=>n.subjects.map(l=>({...l}))),o.innerHTML=`
      <div class="confirm-card animate-slide-up">
        <div class="celebration-icon" style="margin-bottom:var(--space-md);"><span style="font-size:2rem;color:var(--color-accent-teal)">${u.check}</span></div>
        <h2 style="font-size:1.5rem; font-weight:700; color:var(--color-primary); margin-bottom:var(--space-xs);">お疲れ様でした！</h2>
        <p style="color:var(--color-text-secondary); margin-bottom:var(--space-lg); font-size:0.9rem;">今日の学習を記録しましょう</p>
        
        <div class="confirm-form" style="width:100%; display:flex; flex-direction:column; gap:16px; text-align:left;">
          <div class="field">
            <label>学習時間 (分)</label>
            <input type="number" id="confirm-duration" value="${ua}" style="width:100%; font-size:1.2rem; font-weight:700; text-align:center;" />
          </div>
          <div class="field">
            <label>学習内容</label>
            <div id="confirm-subject-wrapper">
              <select id="confirm-subject" style="width:100%;">
                <option value="">-- 未選択 --</option>
                ${Me.map(n=>`<optgroup label="${n.name}">${n.subjects.map(l=>`<option value="${l.id}" ${xe===l.id?"selected":""}>${l.name}</option>`).join("")}</optgroup>`).join("")}
                <option value="custom" ${xe==="custom"?"selected":""}>自由入力</option>
              </select>
              <input type="text" id="confirm-subject-custom" placeholder="具体的な学習内容..." value="${lt}" style="width:100%; margin-top:8px; display:${xe==="custom"?"block":"none"};" />
            </div>
          </div>
          <div class="field">
            <label>振り返りメモ</label>
            <textarea id="confirm-memo" placeholder="学んだことや一言..." style="width:100%; min-height:80px;"></textarea>
          </div>
          <div style="display:flex; gap:12px;">
            <div class="field" style="flex:1;">
              <label>場所</label>
              <select id="confirm-location" style="width:100%;">
                <option value="自宅" ${Ce==="自宅"?"selected":""}>${Be("自宅")} 自宅</option>
                <option value="図書館" ${Ce==="図書館"?"selected":""}>${Be("図書館")} 図書館</option>
                <option value="カフェ" ${Ce==="カフェ"?"selected":""}>${Be("カフェ")} カフェ</option>
                <option value="大学" ${Ce==="大学"?"selected":""}>${Be("大学")} 大学</option>
                <option value="移動中" ${Ce==="移動中"?"selected":""}>${Be("移動中")} 移動中</option>
                <option value="その他" ${Ce==="その他"?"selected":""}>${u.pin} その他</option>
              </select>
            </div>
            <div class="field" style="flex:1;">
              <label>集中度</label>
              <select id="confirm-focus" style="width:100%;">
                ${Ha(jt)}
              </select>
            </div>
          </div>
          <div style="display:flex; gap:12px; margin-top:8px;">
            <button class="btn btn-secondary" id="btn-discard-log-sync" style="flex:1; justify-content:center;">破棄</button>
            <button class="btn btn-primary" id="btn-confirm-save-sync" style="flex:2; justify-content:center;">記録を保存</button>
          </div>
        </div>
      </div>
    `;const a=o.querySelector("#confirm-subject"),s=o.querySelector("#confirm-subject-custom");a.addEventListener("change",n=>{s.style.display=n.target.value==="custom"?"block":"none"}),o.querySelector("#btn-discard-log-sync").onclick=()=>{o.remove(),ca(),be()},o.querySelector("#btn-confirm-save-sync").onclick=async n=>{n.preventDefault();const l=n.currentTarget,p=o.querySelector("#confirm-duration").value,c=parseInt(p,10),b=a.value,_=s.value,f=b==="custom"?_.trim()||"その他":b,w=o.querySelector("#confirm-memo").value.trim(),v=o.querySelector("#confirm-location").value,S=parseFloat(o.querySelector("#confirm-focus").value);if(isNaN(c)||c<=0){k(" 正しい時間を入力してください");return}if(!f){k(" 学習内容を入力してください");return}l.disabled=!0,l.textContent="保存中...",l.style.opacity="0.7";try{xe=b,lt=_,Ce=v,jt=S,Pe();const D=new Date().toISOString();await Lo(f,c,w,S,v,Tt||D,D,Ke)?(document.body.contains(o)&&o.remove(),ca(),be()):(l.disabled=!1,l.textContent="記録を保存",l.style.opacity="1")}catch(D){console.error("Session finish error:",D),k(" 予期せぬエラーが発生しました"),l.disabled=!1,l.textContent="記録を保存",l.style.opacity="1"}}}else et==="/study"||window.location.pathname==="/study"?be():k(u.check+" 学習セッションが終了しました！記録を確認してください。")}function pa(){if(ee){const e=Math.floor((Date.now()-Na)/1e3);ne=mt+e,se&&(Z=Math.max(0,Ue-e)),Ke.push({start:new Date().toISOString(),end:null})}ee=!1,ra&&(clearInterval(ra),ra=null),Pe(),Ho(),Sa()}function ca(){pa(),ne=0,Z=0,mt=0,Ue=0,We=0,Tt=null,Ke=[],Jt=!1,Je="study",Ve="study",qe=1,Pe()}function ia(e){const t=Math.floor(e/3600),o=Math.floor(e%3600/60),a=e%60,s=n=>String(n).padStart(2,"0");return t>0?`${s(t)}:${s(o)}<span class="seconds">:${s(a)}</span>`:`${s(o)}<span class="seconds">:${s(a)}</span>`}function wo(){return"mf-"+Math.random().toString(36).substring(2,9)}function xt(){document.getElementById("app"),document.body.classList.add("hide-sidebar");let e=document.getElementById("auth-overlay");e||(e=document.createElement("div"),e.id="auth-overlay",e.style.position="fixed",e.style.inset="0",e.style.zIndex="9999",e.style.backgroundColor="var(--color-bg-primary)",document.body.appendChild(e)),e.style.display="flex",e.innerHTML=`
    <div class="auth-container" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding: 20px;">
      <div class="auth-card" style="width:100%; max-width:400px; padding: 32px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); background: var(--color-bg-card);">
        <div class="auth-header" style="text-align:center; margin-bottom:24px;">
          <div class="auth-logo" style="width:48px; height:48px; background:var(--gradient-primary); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800; color:#0e1525; margin:0 auto 16px;">M</div>
          <h1 class="auth-title" style="font-size:1.5rem; font-weight:700; margin-bottom:8px;">MedFocus</h1>
          <p class="auth-subtitle" style="font-size:0.9rem; color:var(--color-text-secondary);">自分に合った方法で始めましょう</p>
        </div>

        <div class="auth-tabs" style="display:flex; gap:4px; margin-bottom:20px; background:var(--color-bg-elevated); padding:4px; border-radius:12px;">
          <button id="tab-join" style="flex:1; padding:8px; border-radius:8px; font-weight:600; font-size:0.75rem; background:var(--color-bg-primary);">新規登録</button>
          <button id="tab-login" style="flex:1; padding:8px; border-radius:8px; font-weight:600; font-size:0.75rem;">IDログイン</button>
          <button id="tab-legacy" style="flex:1; padding:8px; border-radius:8px; font-weight:600; font-size:0.75rem;">旧アカウント</button>
        </div>

        <form class="auth-form" id="auth-form" style="display:flex; flex-direction:column; gap:16px;">
          <div id="field-name" class="auth-field">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">お名前</label>
            <input type="text" id="auth-name" placeholder="例: 田中 太郎" style="width:100%;" />
          </div>
          <div id="field-id" class="auth-field" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">ログインID</label>
            <input type="text" id="auth-id" placeholder="例: mf-x1y2z3" style="width:100%;" />
          </div>
          <div id="field-legacy-email" class="auth-field" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">メールアドレス</label>
            <input type="email" id="auth-legacy-email" placeholder="以前登録したメールアドレス" style="width:100%;" />
          </div>
          <div id="field-legacy-pass" class="auth-field" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">パスワード</label>
            <input type="password" id="auth-legacy-pass" placeholder="以前設定したパスワード" style="width:100%;" />
          </div>
          <button type="submit" id="btn-auth-submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:1.1rem; border-radius:12px;">
            はじめる
          </button>
        </form>
        
        <div id="id-announcement" style="display:none; margin-top:20px; padding:16px; background:rgba(78,205,196,0.1); border:1px dashed var(--color-accent-teal); border-radius:12px; text-align:center;">
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-bottom:8px;">あなたのログインIDを発行しました：</p>
          <div id="generated-id-display" style="font-size:1.4rem; font-weight:800; color:var(--color-accent-teal); font-family:monospace; margin-bottom:12px;"></div>
          <p style="font-size:0.75rem; color:var(--color-accent-pink);">⚠️ このIDは忘れないようにメモしてください！</p>
          <button id="btn-start-after-id" class="btn btn-primary" style="margin-top:16px; width:100%; justify-content:center;">スタートする</button>
        </div>

        <div id="rescue-section" style="display:none; margin-top:20px; padding:16px; background:rgba(241,148,138,0.1); border:1px solid rgba(241,148,138,0.2); border-radius:12px;">
          <p style="font-size:0.85rem; font-weight:600; margin-bottom:12px; color:var(--color-accent-pink);">${u._s('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>')} IDを検索・復旧する</p>
          <div style="display:flex; gap:8px;">
            <input type="text" id="rescue-name" placeholder="以前使っていたお名前" style="flex:1; font-size:0.85rem;" />
            <button id="btn-rescue-search" class="btn btn-secondary btn-sm">検索</button>
          </div>
          <div id="rescue-result" style="margin-top:12px; font-size:0.8rem; display:none;"></div>
        </div>

        <div style="text-align:center; margin-top:24px; display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; color:var(--color-accent-teal); cursor:pointer; text-decoration:underline;" id="btn-forgot-id">IDを忘れた・以前のアカウントを探す</div>
          <div style="font-size:12px; color:var(--color-text-tertiary); cursor:pointer;" id="demo-login">(デモモードで試す)</div>
        </div>
      </div>
    </div>
  `;let t="join";const o=document.getElementById("tab-join"),a=document.getElementById("tab-login"),s=document.getElementById("field-name"),n=document.getElementById("field-id"),l=document.getElementById("btn-auth-submit"),p=document.getElementById("tab-legacy"),c=document.getElementById("field-legacy-email"),b=document.getElementById("field-legacy-pass");function _(f){t=f,o.style.background=f==="join"?"var(--color-bg-primary)":"transparent",a.style.background=f==="login"?"var(--color-bg-primary)":"transparent",p.style.background=f==="legacy"?"var(--color-bg-primary)":"transparent",s.style.display=f==="join"?"block":"none",n.style.display=f==="login"?"block":"none",c.style.display=f==="legacy"?"block":"none",b.style.display=f==="legacy"?"block":"none",l.textContent=f==="join"?"はじめる":"ログイン",document.getElementById("btn-forgot-id").style.display=f==="login"?"block":"none"}o.onclick=()=>_("join"),a.onclick=()=>_("login"),p.onclick=()=>_("legacy"),document.getElementById("btn-forgot-id").onclick=()=>{const f=document.getElementById("rescue-section");f.style.display=f.style.display==="none"?"block":"none"},document.getElementById("btn-rescue-search").onclick=async()=>{const f=document.getElementById("rescue-name").value.trim(),w=document.getElementById("rescue-result");if(f){w.style.display="block",w.innerHTML='<span style="color:var(--color-text-tertiary);">検索中...</span>';try{if(!$)throw new Error("接続エラー (Supabase未初期化)");const{data:v,error:S}=await $.from("profiles").select("full_name, login_id").ilike("full_name",`%${f}%`);if(S)throw S;if(!v||v.length===0)w.innerHTML='<span style="color:var(--color-accent-pink);">⚠️ 一致するアカウントが見つかりません</span>';else{const{data:D,error:d}=await $.from("profiles").select("full_name, login_id, university, grade").ilike("full_name",`%${f}%`),m=d?v:D,y=m.map(h=>{const P=!h.login_id,H=h.login_id||encodeURIComponent(h.full_name),N=h.university?`<br><span style="font-size:0.75rem; color:var(--color-text-tertiary);">${h.university} ${h.grade||""}</span>`:"";return`<div style="padding:10px; background:var(--color-bg-elevated); border-radius:8px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
            <span style="flex:1; margin-right:8px;">
              <b>${h.full_name}</b>さん ${N}<br>
              ID: <code style="color:var(--color-accent-teal); font-size:1rem;">${H}</code>
              ${P?'<br><span style="font-size:0.7rem; color:var(--color-accent-pink);">※旧方式のアカウント</span>':""}
            </span>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('auth-id').value='${H}'; document.getElementById('rescue-section').style.display='none'; showToast(' IDをセットしました')">セット</button>
          </div>`}).join("");w.innerHTML=`<p style="color:var(--color-text-secondary); margin-bottom:4px;">${m.length}件見つかりました：</p>${y}`}}catch(v){console.error("ID Rescue Error:",v),w.innerHTML=`<div style="color:var(--color-accent-pink); margin-top:8px;">❌ 検索エラーが発生しました<br><span style="font-size:0.7rem; opacity:0.8;">理由: ${v.message||"不明なエラー"}</span></div>`}}},document.getElementById("demo-login").onclick=()=>{e&&(e.style.display="none"),Aa("demo@example.com")},document.getElementById("auth-form").onsubmit=async f=>{var S;f.preventDefault();const w=document.getElementById("btn-auth-submit"),v=w?w.textContent:"...";w&&(w.textContent="処理中...",w.disabled=!0);try{if(t==="legacy"){const h=document.getElementById("auth-legacy-email").value.trim(),P=document.getElementById("auth-legacy-pass").value;if(!h||!P){k(" メールアドレスとパスワードを入力してください"),w&&(w.disabled=!1,w.textContent=v);return}if(!$||Mt==="your-anon-key"){Aa(h),e&&(e.style.display="none"),pt();return}const{error:H}=await $.auth.signInWithPassword({email:h,password:P});if(H)k(" ログイン失敗: "+(H.message||"認証エラー")),w&&(w.disabled=!1,w.textContent=v);else{const{data:N}=await $.auth.getSession();if((S=N==null?void 0:N.session)!=null&&S.user){const Q=N.session.user.id,{data:ge}=await $.from("profiles").select("login_id").eq("id",Q).single();if(ge!=null&&ge.login_id)L.login_id=ge.login_id;else{const ie=wo();await $.from("profiles").update({login_id:ie}).eq("id",Q),L.login_id=ie,document.getElementById("auth-form").style.display="none";const fe=document.getElementById("id-announcement");fe.querySelector("p").textContent="次回からはこのIDでログインできます：",fe.style.display="block",document.getElementById("generated-id-display").textContent=ie,document.getElementById("btn-start-after-id").onclick=()=>{e&&(e.style.display="none"),pt()};return}}k(" おかえりなさい！"),e&&(e.style.display="none"),pt()}return}let D="",d="";if(t==="join"){if(d=document.getElementById("auth-name").value.trim(),!d){k(" 名前を入力してください"),w&&(w.disabled=!1,w.textContent=v);return}D=wo()}else if(D=document.getElementById("auth-id").value.trim().toLowerCase(),!D){k(" ログインIDを入力してください"),w&&(w.disabled=!1,w.textContent=v);return}const m=D+"@medfocus.app",y="medfocus-fixed-pass-v2";if(!$||Mt==="your-anon-key"||Ot.includes("your-project")){if(Aa(m),d&&(L.full_name=d),L.login_id=D,t==="join"){document.getElementById("auth-form").style.display="none";const h=document.getElementById("id-announcement");h.style.display="block",document.getElementById("generated-id-display").textContent=D,document.getElementById("btn-start-after-id").onclick=()=>{e&&(e.style.display="none"),pt()}}else k(" デモモード："+(d||D)+"として開始します"),e&&(e.style.display="none"),pt();return}if(t==="join"){const{data:h,error:P}=await $.auth.signUp({email:m,password:y,options:{data:{full_name:d}}});if(P)throw P;const H=h.user;H&&await $.from("profiles").insert([{id:H.id,full_name:d,login_id:D}]),document.getElementById("auth-form").style.display="none";const N=document.getElementById("id-announcement");N.style.display="block",document.getElementById("generated-id-display").textContent=D,document.getElementById("btn-start-after-id").onclick=()=>{e&&(e.style.display="none"),pt()}}else{const h=["medfocus-fixed-pass-v2","medfocus-fixed-pass","medfocus-fixed-password","medfocus-pass"],P=[D+"@medfocus.app",D.toLowerCase()+"@medfocus.app"];let H=null,N=!1;for(const Q of P){if(N)break;for(const ge of h){console.log(`DEBUG: Trying login for ${Q} with candidate password...`);const{error:ie}=await $.auth.signInWithPassword({email:Q,password:ge});if(ie){if(H=ie,ie.status===429)break}else{N=!0;break}}}if(N)document.querySelector(".toast")||k(" ログインに成功しました"),e&&(e.style.display="none"),pt();else{const Q=H?H.message||H.error_description||"原因不明":"ログイン情報が正しくありません";k(`❌ ログイン失敗: ${Q}`),console.error("Login verbose error:",H),w&&(w.disabled=!1,w.textContent=v)}}}catch(D){console.error("Submit Error:",D),k(u.x+" エラーが発生しました: "+(D.message||"不明なエラー")),w&&(w.disabled=!1,w.textContent=v)}}}function ys(){$&&Mt!=="your-anon-key"?$.auth.signOut():(E=null,location.reload())}function Aa(e){E={user:{email:e,id:"user-001"}},L.id="user-001",L.name=e.split("@")[0];const t=document.getElementById("auth-overlay");t&&(t.style.display="none"),k(" ログインしました（デモモード）"),Wt(et)}const fs=[{route:"/",label:"ダッシュボード",icon:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'},{route:"/study",label:"学習記録",icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>'},{route:"/insights",label:"インサイト",icon:'<svg viewBox="0 0 24 24"><path d="M21 12c0 1.2-4 6-9 6s-9-4.8-9-6c0-1.2 4-6 9-6s9 4.8 9 6z"/><circle cx="12" cy="12" r="3"/></svg>'},{route:"/qb",label:"QB進捗",icon:'<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>'},{route:"/countdown",label:"カウントダウン",icon:'<svg viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M10 14l2 2 4-4"/></svg>'},{route:"/community",label:"質問広場",icon:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},{route:"/ranking",label:"ランキング",icon:'<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>'},{route:"/settings",label:"設定",icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'}];function at(){const e=document.getElementById("sidebar"),t=et,o=ht(L.id),a=dt(L.name),s=nt?u._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'):u._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'),n=nt?"ダークモード":"ライトモード";let l=`<div class="sidebar-avatar" style="background:${o}">${a}</div>`;L.avatar_url&&L.avatar_url.startsWith("http")&&(l=`<div class="sidebar-avatar" style="background:var(--color-bg-elevated); overflow:hidden;"><img src="${L.avatar_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${a}'"/></div>`),e.innerHTML=`<div class="sidebar-header"><div class="sidebar-logo"><div class="sidebar-logo-icon">M</div><span class="sidebar-logo-text">MedFocus</span></div></div>
    <nav class="sidebar-nav">${fs.map(p=>`<div class="nav-item ${t===p.route?"active":""}" data-route="${p.route}"><div class="nav-item-icon">${p.icon}</div><span>${p.label}</span></div>`).join("")}</nav>
    <div class="sidebar-theme-row"><span class="sidebar-theme-label">${s} ${n}</span><button class="theme-toggle" id="theme-btn" title="テーマ切り替え"></button></div>
    <div class="sidebar-profile" id="logout-btn" title="クリックでログアウト" style="cursor:pointer">
      ${l}
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name">${L.name}</div>
        <div class="sidebar-profile-role">${L.university} ${L.grade}年</div>
        <div class="sidebar-profile-id" style="font-size:0.65rem; color:var(--color-text-tertiary); margin-top:2px;">ID: ${L.login_id||"---"}</div>
      </div>
    </div>`,document.getElementById("theme-btn").addEventListener("click",Bo),document.getElementById("logout-btn").addEventListener("click",()=>{confirm("ログアウトしますか？")&&ys()})}const Ga={};function wt(e,t){Ga[e]=t}function hs(e){et!==e&&(window.history.pushState({},"",e),Wt(e))}function Wt(e){et=e;const t=Ga[e]||Ga["/"];t&&t(),document.querySelectorAll(".nav-item").forEach(o=>o.classList.toggle("active",o.dataset.route===e))}function $o(e){var D,d,m,y,h;const t=e.user_id===((D=E==null?void 0:E.user)==null?void 0:D.id)||e.user_id===L.id,o=e.is_anonymous,a=o?"匿名ユーザー":((d=e.profiles)==null?void 0:d.full_name)||(t?L.name:"名前未設定");let s=o?"#64748b":ht(e.user_id),n=o?"?":dt(a),l=`<div class="avatar" style="background:${s}">${n}</div>`;const p=!o&&t?L.avatar_url:(m=e.profiles)==null?void 0:m.avatar_url;!o&&p&&p.startsWith("http")?l=`<div class="avatar" style="background:var(--color-bg-elevated);overflow:hidden;"><img src="${p}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${n}'"/></div>`:o&&(l='<div class="avatar" style="background:rgba(148,163,184,0.15);color:var(--color-text-tertiary);font-size:1.2rem;">?</div>');const c=e.type==="activity"?'<span class="post-type-badge post-type-activity">'+u.megaphone+" アクティビティ</span>":'<span class="post-type-badge post-type-question">'+u.question+" 質問</span>";let b=(y=e.groups)==null?void 0:y.name,_=(h=e.groups)==null?void 0:h.icon_url;if(!b&&e.group_id&&Array.isArray(Qe)){const P=Qe.find(H=>H.id===e.group_id);P&&(b=P.name,_=P.icon_url)}let f="";_&&_.startsWith("http")&&(f=`<img src="${_}" style="width:14px;height:14px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-right:4px;" />`);const w=b?`<span class="post-type-badge" style="background:rgba(187,143,206,0.1);color:var(--color-accent-purple);border:1px solid rgba(187,143,206,0.2);font-weight:700">${f}${u.lock} ${b} 限定</span>`:`<span class="post-type-badge" style="background:rgba(78,205,196,0.08);color:var(--color-accent-teal);border:1px solid rgba(78,205,196,0.2)">${u.globe} 全体</span>`;let v="";const S=e.post_replies||[];{const P=S.map(H=>{var fe,Oe;const N=H.user_id===((fe=E==null?void 0:E.user)==null?void 0:fe.id)||H.user_id===L.id,Q=H.is_anonymous?"匿名ユーザー":((Oe=H.profiles)==null?void 0:Oe.full_name)||"名前未設定",ge=H.is_anonymous?"#64748b":ht(H.user_id),ie=H.is_anonymous?"匿":dt(Q);return`<div class="post-reply" style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.12);">
        <div class="avatar avatar-sm" style="background:${ge};width:24px;height:24px;font-size:0.7rem;">${ie}</div>
        <div class="reply-content" style="flex:1;">
          <div class="reply-header" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
            <span class="reply-name" style="font-size:0.8rem;font-weight:600;color:var(--color-text-secondary);">${Q}</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="reply-time" style="font-size:0.7rem;color:var(--color-text-tertiary);">${fo(H.created_at)}</span>
              ${N?`<button class="btn-delete-reply" data-id="${H.id}" style="background:none;border:none;color:var(--color-accent-pink);font-size:0.65rem;cursor:pointer;padding:0;text-decoration:underline;">削除</button>`:""}
            </div>
          </div>
          <div class="reply-body" style="font-size:0.85rem;color:var(--color-text-primary);line-height:1.4;">${H.body}</div>
        </div>
      </div>`}).join("");v=`<div class="post-replies-section" style="margin-top:16px;">
      ${S.length>0?`<div class="post-replies-list">${P}</div>`:""}
      <div class="post-reply-input-wrapper" style="flex-direction:column; gap:8px; margin-top:12px; display:flex;">
        <div style="display:flex;gap:8px;">
          <input type="text" class="post-reply-input" placeholder="返信を入力..." style="flex:1;font-size:0.85rem;padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text-primary);" />
          <button class="btn btn-primary btn-sm btn-submit-reply" data-post-id="${e.id}">送信</button>
        </div>
        <label style="font-size:0.7rem;color:var(--color-text-secondary);display:flex;align-items:center;gap:4px;cursor:pointer;">
          <input type="checkbox" class="post-reply-anonymous" /> 匿名で返信する
        </label>
      </div>
    </div>`}return`<article class="post-card animate-slide-up">
    <div class="post-card-header">
      ${l}
      <div class="post-author-info">
        <div class="post-author-name">${a} ${c} ${w}</div>
        <div class="post-author-meta">${fo(e.created_at)}</div>
      </div>
      ${t?`<button class="btn-delete-post" data-id="${e.id}" style="background:rgba(241,148,138,0.1);border:1px solid rgba(241,148,138,0.2);color:#f1948a;padding:4px 10px;border-radius:var(--radius-sm);font-size:0.75rem;cursor:pointer;" title="投稿を削除">削除</button>`:""}
    </div>
    ${e.title?`<h3 class="post-card-title">${e.title}</h3>`:""}
    <div class="post-card-body">${e.body}</div>
    <div class="post-card-actions">
      <button class="post-action" data-action="like">❤️ <span>${e.likes||0}</span></button>
      <button class="post-action">💬 <span>${(e.post_replies||[]).length}</span></button>
    </div>
    ${v}
  </article>`}let Bt="daily";function bs(e,t,o,a,s,n){if(typeof Chart>"u")return;Ea(e);const l=document.getElementById(e);if(l)try{Lt[e]=new Chart(l,{type:"bar",data:{labels:t,datasets:[{type:"bar",label:s||"実績(分)",data:o,backgroundColor:p=>{const{ctx:c,chartArea:b}=p.chart;if(!b)return"#4ECDC4";const _=c.createLinearGradient(0,b.bottom,0,b.top);return _.addColorStop(0,"rgba(78,205,196,0.4)"),_.addColorStop(1,"rgba(69,183,209,0.8)"),_},borderRadius:6,borderSkipped:!1,maxBarThickness:40,order:2},{type:"line",label:n||"目標(分)",data:a,borderColor:"#f59e0b",borderWidth:2,borderDash:[6,3],pointBackgroundColor:"#f59e0b",pointRadius:3,fill:!1,tension:.1,order:1}]},options:{responsive:!0,maintainAspectRatio:!0,scales:{x:{grid:{display:!1}},y:{beginAtZero:!0,grid:{color:"rgba(148,163,184,0.06)"}}},plugins:{legend:{display:!0,labels:{boxWidth:12,padding:16,font:{size:11}}},tooltip:{backgroundColor:"#1a2332",titleColor:"#f0f4f8",bodyColor:"#94a3b8",borderColor:"rgba(78,205,196,0.3)",borderWidth:1,cornerRadius:8}},animation:{duration:800,easing:"easeOutQuart"}}})}catch(p){console.error("DEBUG: createMixedChart error:",p)}}async function qt(){var Ht,Et,Xt,Dt,Zt;const e=document.getElementById("page-container"),t=await Da(),o=await Mo(),a=bo.reduce((g,x)=>g+x.topics.length,0),s=xo.reduce((g,x)=>g+x.topics.length,0),n=a+s,l=o.filter(g=>g.completed).length,p=n>0?Math.round(l/n*100):0,c=ye(new Date),b=new Date(c);b.setHours(5,0,0,0);const _=new Date(c);_.setHours(28,59,59,999);const f=t.reduce((g,x)=>g+x.duration_minutes,0);let w=0;const v=new Set(t.map(g=>ye(new Date(g.started_at)).toLocaleDateString()));let S=new Date(c);for(;v.has(S.toLocaleDateString());)w++,S.setDate(S.getDate()-1);const D=t.filter(g=>{const x=new Date(g.started_at);return x>=b&&x<=_}).reduce((g,x)=>g+x.duration_minutes,0),d=fa(),m=d>0?Math.min(150,Math.round(D/d*100)):0,y=Vo(m),h=Math.max(0,d-D),P=t.length>0?Math.round(f/Math.max(1,v.size)):0,H={};for(let g=0;g<24;g++)H[g]={min:0,sumF:0,countF:0};t.forEach(g=>{const x=new Date(g.started_at),T=g.duration_minutes;if(!T||T<=0)return;const F=new Date(x.getTime()+T*6e4);let R=new Date(x),O=T;for(;O>0&&R<F;){const J=R.getHours(),A=new Date(R);A.setMinutes(0,0,0),A.setHours(A.getHours()+1);const U=Math.min(O,(A-R)/6e4);U>0&&H[J]&&(H[J].min+=Math.round(U*10)/10,g.focus_level&&(H[J].sumF+=Number(g.focus_level)*(U/T),H[J].countF+=U/T)),O-=U,R=A}});const N=105,Q=2*Math.PI*N,ge=Q-Math.min(m,100)/100*Q;["基礎医学","内科系","外科系","産婦人科","小児科","精神科","社会医学","救急科"].map(g=>{let x=0,T=0;return[...bo,...xo].forEach(F=>{let R="";const O=F.category;O.includes("基礎医学")||O.includes("国試基礎")?R="基礎医学":O.includes("内科系")||O.includes("国試内科")?R="内科系":O.includes("外科系")||O.includes("国試外科")?R="外科系":O.includes("産科・婦人科")||O.includes("国試産科")?R="産婦人科":O.includes("小児科")?R="小児科":O.includes("精神科")?R="精神科":O.includes("社会医学")||O.includes("公衆衛生")||O.includes("臨床倫理")?R="社会医学":(O.includes("救急")||O.includes("集中治療"))&&(R="救急科"),R===g&&(x+=F.topics.length,T+=o.filter(J=>J.category===F.category&&J.completed).length)}),{name:g,value:x>0?Math.round(T/x*100):0}});const fe=["#4ECDC4","#45B7D1","#FF6B6B","#F7DC6F","#BB8FCE","#F1948A","#F0B27A","#82E0AA","#5DADE2","#AF7AC5","#F39C12","#E74C3C","#1ABC9C","#3498DB","#9B59B6","#E67E22","#2ECC71","#E91E63","#00BCD4","#FF9800","#8BC34A","#673AB7","#009688","#FF5722","#607D8B"],Oe={};let I=0;function C(){try{return JSON.parse(localStorage.getItem("medfocus_subject_colors")||"{}")}catch{return{}}}function ae(g,x){const T=C();T[g.toLowerCase()]=x,localStorage.setItem("medfocus_subject_colors",JSON.stringify(T))}function q(g){const x=g.toLowerCase(),T=C();if(T[x])return T[x];const F=fe[I%fe.length];return I++,F}Me.flatMap(g=>g.subjects.map(x=>({...x,categoryColor:g.color}))),t.forEach(g=>{const x=yt(g.subject_name),T=x.toLowerCase();Oe[T]||(Oe[T]={name:x,minutes:0,color:q(x)}),Oe[T].minutes+=g.duration_minutes});const G=Object.values(Oe).filter(g=>g.minutes>0).sort((g,x)=>x.minutes-g.minutes),ue=G.length>0?G[0].minutes:1;let le=0,pe=0;const de={};t.forEach(g=>{if(g.focus_level){le+=Number(g.focus_level),pe++;const x=g.location||"未設定";de[x]||(de[x]={sum:0,count:0}),de[x].sum+=Number(g.focus_level),de[x].count++}});const je=pe>0?(le/pe).toFixed(1):"-",me=Object.entries(de).map(([g,x])=>({loc:g,avg:(x.sum/x.count).toFixed(1),count:x.count})).sort((g,x)=>x.count-g.count),ce=me.length>0?me[0]:null,Ee=98,Te=ye(new Date);Te.setHours(0,0,0,0);const he=new Date(Te);for(he.setDate(Te.getDate()-Ee+1);he.getDay()!==1;)he.setDate(he.getDate()-1);const ut=Math.round((Te-he)/(1e3*60*60*24))+1,At=Math.ceil(ut/7);let kt="";for(let g=0;g<At;g++)for(let x=0;x<7;x++){const T=new Date(he);if(T.setDate(T.getDate()+g*7+x),T>Te){kt+='<div style="width:14px;height:14px"></div>';continue}const F=new Date(T);F.setHours(5,0,0,0);const R=new Date(T);R.setHours(28,59,59,999);const O=t.filter(U=>{const W=new Date(U.started_at);return W>=F&&W<=R}).reduce((U,W)=>U+W.duration_minutes,0);let J=0;O>0&&(J=1),O>=60&&(J=2),O>=180&&(J=3),O>=300&&(J=4);const A=`${T.toLocaleDateString("ja-JP")} : ${we(O)}`;kt+=`<div class="heatmap-cell" data-level="${J}" title="${A}"></div>`}const Kt=(D/60).toFixed(1),_t=(d/60).toFixed(1),Qt=(h/60).toFixed(1);e.innerHTML=`<div class="page-header"><h1 class="page-title">ダッシュボード</h1><p class="page-subtitle">学習進捗の全体像を把握しよう</p></div>

    <!-- Sleep Toggle -->
    <div class="sleep-toggle-card animate-slide-up">
      <button class="sleep-toggle-btn ${va()==="wake_up"?"is-wakeup":"is-bedtime"}" id="sleep-toggle-btn">
        <span class="sleep-toggle-icon">${va()==="wake_up"?u._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'):u._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}</span>
        <span class="sleep-toggle-label">${va()==="wake_up"?"起床":"就寝"}</span>
      </button>
      <span class="sleep-toggle-info" id="sleep-info-container">
        ${(()=>{const g=Pa(ve(c));return g&&g.wake_up?`起床 ${g.wake_up}${g.bedtime?" / 就寝 "+g.bedtime:""}`:"睡眠未記録"})()}
        <button class="sleep-edit-btn" id="sleep-edit-modal-trigger" title="睡眠記録を編集/追加">
          ${u._s('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path>')}
        </button>
      </span>
    </div>

    <!-- HERO: Goal Ring -->
    <div class="card goal-ring-hero animate-slide-up">
      ${w>0?`<div class="goal-ring-streak"><span style="display:inline-flex;align-items:center;gap:4px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg> 連続達成 ${w}日目</span></div>`:""}
      <div class="goal-ring-container ${m>=100?"achieved":""}" id="goal-ring-wrap">
        <svg viewBox="0 0 240 240">
          <circle class="goal-ring-bg" cx="120" cy="120" r="${N}"/>
          <circle class="goal-ring-glow" cx="120" cy="120" r="${N}"
            stroke="${y}" stroke-dasharray="${Q}" stroke-dashoffset="${Q}" id="goal-ring-glow"/>
          <circle class="goal-ring-progress" cx="120" cy="120" r="${N}"
            stroke="${y}" stroke-dasharray="${Q}" stroke-dashoffset="${Q}" id="goal-ring-arc"/>
        </svg>
        <div class="goal-ring-text">
          <div class="goal-ring-current" style="color:${y}">${Kt}h</div>
          <div class="goal-ring-target">/ ${_t}h</div>
          <div class="goal-ring-remaining">${m>=100?u.check+" 達成！":`残り ${Qt}h`}</div>
        </div>
      </div>
      <div class="goal-adjuster" id="goal-adjuster">
        <button class="goal-adjuster-btn" id="goal-dec">−</button>
        <div class="goal-adjuster-label">今日の目標: ${_t}h</div>
        <button class="goal-adjuster-btn" id="goal-inc">＋</button>
      </div>
    </div>

    <!-- Mini Stats -->
    <div class="mini-stats-row animate-slide-up" style="animation-delay:.1s">
      <div class="mini-stat">
        <div class="mini-stat-value" style="color:var(--color-accent-teal)">${Math.floor(f/60)}<span style="font-size:.75rem;font-weight:500;color:var(--color-text-secondary)">h</span></div>
        <div class="mini-stat-label">総学習時間</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-value" style="color:var(--color-accent-blue)">${we(P)}</div>
        <div class="mini-stat-label">1日平均</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-value" style="color:var(--color-accent-green)">${p}<span style="font-size:.75rem;font-weight:500;color:var(--color-text-secondary)">%</span></div>
        <div class="mini-stat-label">総合進捗率</div>
      </div>
    </div>

    <!-- Study Trend Chart -->
    <div class="card animate-slide-up" style="animation-delay:.15s">
      <div class="card-header">
        <div class="card-title">${u.chart}学習推移</div>
        <div class="period-tabs" id="period-tabs">
          <button class="period-tab ${Bt==="daily"?"active":""}" data-period="daily">最近7日</button>
          <button class="period-tab ${Bt==="thisweek"?"active":""}" data-period="thisweek">今週</button>
          <button class="period-tab ${Bt==="weekly"?"active":""}" data-period="weekly">週</button>
          <button class="period-tab ${Bt==="monthly"?"active":""}" data-period="monthly">月</button>
        </div>
      </div>
      <div id="trend-summary" style="font-size:.8125rem;color:var(--color-text-secondary);margin-bottom:var(--space-sm)"></div>
      <div class="chart-container"><canvas id="trendMixedChart"></canvas></div>
    </div>

    <!-- Continuous Heatmap -->
    <div class="card animate-slide-up" style="animation-delay:.20s; margin-top:var(--space-md);">
      <div class="card-header"><div class="card-title">${u.calendar}継続ヒートマップ</div></div>
      <div class="heatmap-container">
        <div class="heatmap-scroll">
          <div class="heatmap-wrapper">
            <div class="heatmap-month-labels"></div> <!-- Future use for month labels -->
            <div class="heatmap-day-labels">
              <div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div><div>日</div>
            </div>
            <div class="heatmap-grid" id="heatmap-grid">
              ${kt}
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:4px; font-size:10px; color:var(--color-text-tertiary);">
          <span>Less</span>
          <div class="heatmap-cell" data-level="0"></div>
          <div class="heatmap-cell" data-level="1"></div>
          <div class="heatmap-cell" data-level="2"></div>
          <div class="heatmap-cell" data-level="3"></div>
          <div class="heatmap-cell" data-level="4"></div>
          <span>More</span>
        </div>
      </div>
    </div>

    <!-- Bottom Grid -->
    <div class="dashboard-bottom" style="margin-top:var(--space-xl)">
      <div class="card animate-slide-up" style="animation-delay:.25s"><div class="card-header"><div class="card-title">${u.clock}科目別学習時間</div><span style="font-size:0.75rem;color:var(--color-text-tertiary)">${G.length}科目</span></div>
        <div class="category-progress-list">
          ${G.length>0?(()=>{const g=G.slice(0,10),x=G.slice(10),T=F=>`
              <div class="category-progress-item">
                <div class="category-progress-header">
                  <span class="category-progress-name" style="position:relative;display:inline-flex;align-items:center;">
                    <input type="color" class="subject-color-picker" data-subject="${F.name}" value="${F.color}" style="position:absolute;opacity:0;width:16px;height:16px;left:0;cursor:pointer;z-index:2;"/>
                    <span class="dot subject-color-dot" style="background:${F.color};width:10px;height:10px;border-radius:50%;margin-right:8px;z-index:1;"></span>
                    ${F.name}
                  </span>
                  <span class="category-progress-value">${we(F.minutes)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width:0%; background:${F.color}" data-width="${Math.round(F.minutes/ue*100)}"></div>
                </div>
              </div>`;return g.map(T).join("")+(x.length>0?`
              <details class="subject-expand-details">
                <summary class="subject-expand-btn">
                  ${u._s('<polyline points="6 9 12 15 18 9"/>')} 他 ${x.length}科目を表示
                </summary>
                <div class="subject-expand-content">
                  ${x.map(T).join("")}
                </div>
              </details>`:"")})():'<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-md)">まだ学習記録がありません</p>'}
        </div>
      </div>

      <!-- Environment & Analytics -->
      <div style="display:flex; flex-direction:column; gap:var(--space-md);">
        <div class="card animate-slide-up" style="animation-delay:.3s"><div class="card-header"><div class="card-title">${u.book}QB進捗サマリー</div></div>
          <div style="padding:var(--space-md);padding-top:0;">
            ${(()=>{const g=vt();return Me.filter(x=>x.id.startsWith("cat-vol")).map(x=>{let T=0,F=0,R=0;x.subjects.forEach(A=>{const U=g[A.id]||{};Object.values(U).forEach(W=>{T+=W.done||0,F+=W.total||0,R+=W.correct||0})});const O=F>0?Math.round(T/F*100):0,J=T>0?Math.round(R/T*100):0;return`<div style="margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;">
                    <span style="font-weight:600;">${x.name}</span>
                    <span style="font-weight:700;color:${O>=80?"#10b981":O>=50?"#f59e0b":"var(--color-text-secondary)"};">${O}%</span>
                  </div>
                  <div style="height:8px;background:var(--color-bg-elevated);border-radius:4px;overflow:hidden;margin-bottom:2px;">
                    <div style="height:100%;width:${O}%;background:linear-gradient(90deg,#4ECDC4,#45B7D1);border-radius:4px;transition:width 0.5s;"></div>
                  </div>
                  <div style="font-size:0.7rem;color:var(--color-text-tertiary);">${T}/${F}問  正答率 ${T>0?J+"%":"---"}</div>
                </div>`}).join("")})()}
          </div>
        </div>

        <div class="card animate-slide-up" style="animation-delay:.35s"><div class="card-header"><div class="card-title">${u.target}集中度と環境分析</div></div>
          <div style="padding:var(--space-md); padding-top:0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-sm);">
              <span style="color:var(--color-text-secondary); font-size:0.9rem;">平均集中度:</span>
              <span style="font-weight:bold; font-size:1.1rem;">
                ${je!=="-"?`${je} / 5.0`:"データなし"}
              </span>
            </div>
            ${ce?`
              <div style="margin-bottom:var(--space-md);">
                <span style="color:var(--color-text-secondary); font-size:0.9rem;">頻出の場所:</span>
                <span style="font-weight:bold;">${ce.loc} (平均集中度 ${ce.avg})</span>
              </div>
              <div style="display:grid; gap:8px;">
                ${me.map(g=>`
                  <div style="display:flex; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px;">
                    <div style="flex:1;">${g.loc}</div>
                    <div style="font-size:0.9rem; margin-right:12px; color:var(--color-text-secondary);">${g.count}回</div>
                    <div style="font-weight:bold;">${g.avg}★</div>
                  </div>
                `).join("")}
              </div>
            `:'<p style="text-align:center; color:var(--color-text-tertiary);">データなし</p>'}
          </div>

          <div style="padding:var(--space-md); border-top:1px solid var(--color-border);">
            <div style="font-weight:bold; font-size:0.9rem; margin-bottom:12px;">${u.clock}時間帯別のパフォーマンス</div>
            <div class="chart-container" style="min-height:180px; position:relative;">
              <canvas id="todLevelChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,setTimeout(()=>{const g=document.getElementById("goal-ring-arc"),x=document.getElementById("goal-ring-glow");g&&(g.style.strokeDashoffset=ge),x&&(x.style.strokeDashoffset=ge)},100);function zt(g){const x=[],T=[],F=[],R=ye(new Date);if(g==="daily"){const O=["日","月","火","水","木","金","土"];for(let U=6;U>=0;U--){const W=new Date(R);W.setDate(W.getDate()-U);const Y=new Date(W);Y.setHours(5,0,0,0);const oe=new Date(W);oe.setHours(28,59,59,999);const re=t.filter(X=>{const te=new Date(X.started_at);return te>=Y&&te<=oe}).reduce((X,te)=>X+te.duration_minutes,0);T.push(re),F.push(ya(W)),x.push(`${W.getMonth()+1}/${W.getDate()}(${O[W.getDay()]})`)}const J=F.reduce((U,W,Y)=>U+(W>0?Math.min(100,Math.round(T[Y]/W*100)):0),0)/Math.max(1,F.filter(U=>U>0).length),A=document.getElementById("trend-summary");A&&(A.textContent=`最近7日間の平均達成率: ${Math.round(J)}%`)}else if(g==="thisweek"){const O=R.getDay(),J=O===0?6:O-1,A=new Date(R);A.setDate(R.getDate()-J);const U=["月","火","水","木","金","土","日"];for(let oe=0;oe<7;oe++){const re=new Date(A);re.setDate(A.getDate()+oe);const X=new Date(re);X.setHours(5,0,0,0);const te=new Date(re);te.setHours(28,59,59,999);let Ae=0;re<=R&&(Ae=t.filter(ot=>{const Ft=new Date(ot.started_at);return Ft>=X&&Ft<=te}).reduce((ot,Ft)=>ot+Ft.duration_minutes,0)),T.push(Ae),F.push(ya(re)),x.push(U[oe])}const W=T.reduce((oe,re)=>oe+re,0),Y=document.getElementById("trend-summary");Y&&(Y.textContent=`今週の合計: ${we(W)}`)}else if(g==="weekly"){for(let J=4;J>=0;J--){const A=new Date(R);A.setDate(A.getDate()-J*7);const U=A.getDay(),W=U===0?6:U-1,Y=new Date(A);Y.setDate(A.getDate()-W),Y.setHours(5,0,0,0);const oe=new Date(Y);oe.setDate(Y.getDate()+6),oe.setHours(28,59,59,999);const re=t.filter(te=>{const Ae=new Date(te.started_at);return Ae>=Y&&Ae<=oe}).reduce((te,Ae)=>te+Ae.duration_minutes,0);let X=0;for(let te=0;te<7;te++){const Ae=new Date(Y);Ae.setDate(Y.getDate()+te),X+=ya(Ae)}T.push(re),F.push(X),x.push(`${Y.getMonth()+1}/${Y.getDate()}~`)}const O=document.getElementById("trend-summary");O&&(O.textContent="週次推移 (月〜日 単位)")}else{for(let J=5;J>=0;J--){const A=new Date(R);A.setMonth(R.getMonth()-J);const U=new Date(A.getFullYear(),A.getMonth(),1);U.setHours(5,0,0,0);const W=new Date(A.getFullYear(),A.getMonth()+1,0),Y=new Date(W);Y.setHours(28,59,59,999);const oe=t.filter(X=>{const te=new Date(X.started_at);return te>=U&&te<=Y}).reduce((X,te)=>X+te.duration_minutes,0);let re=0;for(let X=0;X<W.getDate();X++){const te=new Date(U);te.setDate(U.getDate()+X),re+=ya(te)}T.push(oe),F.push(re),x.push(`${U.getFullYear()}/${U.getMonth()+1}`)}const O=document.getElementById("trend-summary");O&&(O.textContent="月間推移 (5時境界)")}bs("trendMixedChart",x,T,F,"実績(分)","目標(分)")}setTimeout(()=>{if(zt(Bt),typeof Chart<"u"){const T=document.getElementById("todLevelChart");if(T){Ea("todLevelChart");const F=[];for(let A=5;A<24;A++)F.push(A);for(let A=0;A<5;A++)F.push(A);const R=F.map(A=>`${A}時`),O=F.map(A=>H[A].min),J=F.map(A=>H[A].countF>0?(H[A].sumF/H[A].countF).toFixed(1):0);Lt.todLevelChart=new Chart(T,{type:"bar",data:{labels:R,datasets:[{label:"学習時間(分)",data:O,backgroundColor:"rgba(78, 205, 196, 0.5)",borderColor:"#4ECDC4",borderWidth:1,borderRadius:2,order:2,yAxisID:"y"},{label:"平均集中度",data:J,type:"line",borderColor:"#FF6B6B",backgroundColor:"#FF6B6B",borderWidth:2,pointRadius:2,pointBackgroundColor:"#FF6B6B",tension:.3,order:1,yAxisID:"yFocus"}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{display:!0,grid:{color:"rgba(148,163,184,0.06)"},ticks:{font:{size:9},callback:A=>A+"m"}},x:{display:!0,grid:{display:!1},ticks:{font:{size:8},maxRotation:0,autoSkip:!1,callback:function(A,U){const W=F[U];return W%3===0||W===5?this.getLabelForValue(A):""}}},yFocus:{position:"right",min:0,max:5,display:!1,grid:{display:!1}}},plugins:{legend:{display:!0,position:"bottom",labels:{boxWidth:10,font:{size:9}}},tooltip:{mode:"index",intersect:!1,callbacks:{title:A=>{const U=F[A[0].dataIndex],W=(U+1)%24;return`${U}:00 〜 ${W}:00 の活動`},label:A=>{const U=A.dataset.label||"";return U.includes("集中度")?`${U}: ${A.parsed.y}★`:`${U}: ${A.parsed.y}分`}}}}}})}}document.querySelectorAll(".progress-bar-fill").forEach((T,F)=>{const R=T.getAttribute("data-width");R!==null&&setTimeout(()=>{T.style.width=R+"%"},F*20)});const x=document.querySelector(".heatmap-scroll");x&&(x.scrollLeft=x.scrollWidth)},200),(Ht=document.getElementById("period-tabs"))==null||Ht.addEventListener("click",g=>{const x=g.target.closest(".period-tab");x&&(Bt=x.dataset.period,document.querySelectorAll(".period-tab").forEach(T=>T.classList.remove("active")),x.classList.add("active"),zt(Bt))}),(Et=document.getElementById("goal-dec"))==null||Et.addEventListener("click",()=>{const g=fa(),x=Math.max(0,g-30);yo(x),qt()}),(Xt=document.getElementById("goal-inc"))==null||Xt.addEventListener("click",()=>{const x=fa()+30;yo(x),qt()}),(Dt=document.getElementById("sleep-toggle-btn"))==null||Dt.addEventListener("click",()=>{const g=va(),x=Uo(g);k(g==="wake_up"?u._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>')+` 起床を記録しました（${x}）`:u._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')+` 就寝を記録しました（${x}）`),qt()}),(Zt=document.getElementById("sleep-edit-modal-trigger"))==null||Zt.addEventListener("click",()=>{Yt()});function Yt(){const g=document.createElement("div");g.className="modal-overlay animate-fade-in",g.style.zIndex="2000";const x=ve(new Date);g.innerHTML=`
      <div class="modal-content animate-slide-up" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title">睡眠記録の編集・追加</div>
          <button class="modal-close" id="close-sleep-modal">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-bottom:16px;">
            起床・就寝ボタンの押し忘れや、過去の記録を修正・追加できます。
          </p>
          
          <div class="settings-field" style="margin-bottom:12px;">
            <label>日付</label>
            <input type="date" id="sleep-edit-date" value="${x}" max="${x}" />
          </div>
          
          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <div class="settings-field" style="flex:1;">
              <label>起床時間</label>
              <input type="time" id="sleep-edit-wakeup" />
            </div>
            <div class="settings-field" style="flex:1;">
              <label>就寝時間</label>
              <input type="time" id="sleep-edit-bedtime" />
            </div>
          </div>
          
          <button class="btn btn-primary" id="btn-save-sleep-edit" style="width:100%; margin-bottom:16px;">
            記録を保存する
          </button>

          <hr style="border:none; border-top:1px solid var(--color-border); margin:16px 0;" />

          <div style="font-weight:700; font-size:0.85rem; margin-bottom:8px;">最近の睡眠記録</div>
          <div class="sleep-history-list" id="sleep-history-container">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>
    `,document.body.appendChild(g);const T=g.querySelector("#sleep-edit-date"),F=g.querySelector("#sleep-edit-wakeup"),R=g.querySelector("#sleep-edit-bedtime"),O=g.querySelector("#sleep-history-container"),J=()=>{const W=T.value,Y=Pa(W);F.value=Y&&Y.wake_up?Y.wake_up:"",R.value=Y&&Y.bedtime?Y.bedtime:""},A=()=>{const Y=[...Gt()].sort((oe,re)=>re.date.localeCompare(oe.date));if(Y.length===0){O.innerHTML='<div style="text-align:center; padding:12px; color:var(--color-text-tertiary); font-size:0.8rem;">記録がありません</div>';return}O.innerHTML=Y.map(oe=>`
        <div class="sleep-history-item">
          <div>
            <span class="sleep-history-date">${oe.date}</span>
            <span class="sleep-history-times" style="margin-left:8px;">
              起床: ${oe.wake_up||"--:--"} / 就寝: ${oe.bedtime||"--:--"}
            </span>
          </div>
          <button class="sleep-history-delete" data-date="${oe.date}">削除</button>
        </div>
      `).join(""),O.querySelectorAll(".sleep-history-delete").forEach(oe=>{oe.addEventListener("click",re=>{const X=re.target.dataset.date;if(confirm(`${X} の睡眠記録を削除しますか？`)){const Ae=Gt().filter(ot=>ot.date!==X);Fa(Ae),A(),J(),k("睡眠記録を削除しました")}})})};T.addEventListener("change",J),g.querySelector("#btn-save-sleep-edit").onclick=()=>{const W=T.value,Y=F.value,oe=R.value;if(!W){alert("日付を選択してください");return}const re=Gt();let X=re.find(te=>te.date===W);if(X||(X={date:W},re.push(X)),Y?X.wake_up=Y:delete X.wake_up,oe?X.bedtime=oe:delete X.bedtime,!X.wake_up&&!X.bedtime){const te=re.indexOf(X);te>-1&&re.splice(te,1)}Fa(re),k("睡眠記録を保存しました"),g.remove(),qt()},J(),A();const U=()=>g.remove();g.querySelector("#close-sleep-modal").onclick=U,g.onclick=W=>{W.target===g&&U()}}document.querySelectorAll(".subject-color-picker").forEach(g=>{g.addEventListener("input",x=>{var J;const T=x.target.dataset.subject,F=x.target.value;ae(T,F);const R=x.target.parentElement.querySelector(".dot");R&&(R.style.background=F);const O=(J=x.target.closest(".category-progress-item"))==null?void 0:J.querySelector(".progress-bar-fill");O&&(O.style.background=F)})})}async function be(){var v,S,D,d,m,y,h,P,H,N,Q,ge,ie,fe,Oe;const e=document.getElementById("page-container");if(!e)return;const[t,o]=await Promise.all([Da(),Mo()]),a=ye(new Date),s=Me.flatMap(I=>I.subjects.map(C=>({...C,category:I.name}))),n={};for(let I=0;I<7;I++){const C=new Date(a);C.setDate(a.getDate()-I);const ae=C.toLocaleDateString("ja-JP",{month:"short",day:"numeric",weekday:"short"}),q=new Date(C);q.setHours(5,0,0,0);const G=new Date(C);G.setHours(28,59,59,999),n[ae]=t.filter(ue=>{const le=new Date(ue.started_at);return le>=q&&le<=G})}e.innerHTML=`<div class="page-header"><h1 class="page-title">学習記録</h1><p class="page-subtitle">集中して勉強時間を記録しよう</p></div>
    <div class="study-layout">
      <!-- Timer Main Card -->
      <div class="stopwatch-card card animate-slide-up" style="position:relative; overflow:hidden;">
        <!-- Mode Switcher -->
        <div class="timer-mode-switcher" style="display:flex; justify-content:center; gap:8px; margin-bottom:var(--space-md); background:var(--color-bg-elevated); padding:4px; border-radius:var(--radius-md);">
          <button class="mode-tab ${!se&&!Le&&!$e?"active":""}" id="mode-up">ストップウォッチ</button>
          <button class="mode-tab ${se&&!Le&&!$e?"active":""}" id="mode-down">タイマー</button>
          <button class="mode-tab ${Le?"active":""}" id="mode-pomodoro">ポモドーロ</button>
          <button class="mode-tab ${$e?"active":""}" id="mode-simulation">本番模試</button>
        </div>

        <svg width="0" height="0"><defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4ECDC4"/><stop offset="100%" stop-color="#45B7D1"/></linearGradient></defs></svg>
        <div class="stopwatch-subject-selector">
          <select id="study-subject">
            <option value="">-- 科目を選択 --</option>
            ${Me.map(I=>`<optgroup label="${I.name}">${I.subjects.map(C=>`<option value="${C.id}" ${xe===C.id?"selected":""}>${C.name}</option>`).join("")}</optgroup>`).join("")}
            <option value="custom" ${xe==="custom"?"selected":""}>その他・自由入力</option>
          </select>
        </div>
        <div id="study-subject-custom-row" style="display:${xe==="custom"?"block":"none"}; margin-bottom:var(--space-md);">
          <input type="text" id="study-subject-custom" placeholder="具体的な学習内容..." value="${lt}" style="width:100%;max-width:300px;text-align:center;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-primary);padding:5px;" />
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons-container" style="position:absolute; top:16px; right:16px; display:flex; gap:8px; z-index:10; background:rgba(148,163,184,0.1); padding:4px; border-radius:24px; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);">
          <!-- Sound Toggle Button -->
          <button id="btn-sound-toggle" class="stopwatch-btn" title="通知音のON/OFF" style="font-size:1.1rem; background:transparent; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            ${localStorage.getItem("medfocus_sound")!=="false"?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'}
          </button>
          <div style="width:1px; background:var(--color-border); margin:6px 0;"></div>
          <!-- Zen Mode Button -->
          <button id="btn-zen-mode" class="stopwatch-btn" title="集中(フルスクリーン)モード" style="font-size:1.1rem; background:transparent; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h6l3-9 4 18 3-9h6"/></svg></button>
        </div>

        <!-- Countdown Settings (only if not running) -->
        ${se&&!ee&&!$e?`
          <div class="countdown-settings animate-fade-in" style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:var(--space-md);">
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm preset-btn" data-min="25">25分</button>
              <button class="btn btn-secondary btn-sm preset-btn" data-min="50">50分</button>
              <button class="btn btn-secondary btn-sm preset-btn" data-min="90">90分</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" id="custom-min" placeholder="分" style="width:60px; text-align:center; background:var(--color-bg-input); border:1px solid var(--color-border); color:var(--color-text-primary); border-radius:var(--radius-sm); padding:4px;" />
              <span style="font-size:0.8rem; color:var(--color-text-secondary);">分に設定</span>
            </div>
          </div>
        `:""}

        <!-- Simulation Settings (only if not running) -->
        ${$e&&!ee?`
          <div class="simulation-settings animate-fade-in" style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:var(--space-md);">
            <div style="font-weight:bold; font-size:0.9rem; color:var(--color-text-primary);">試験シミュレーションを選択</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button class="btn btn-secondary btn-sm sim-preset-btn" data-type="cbt" style="${Re===6?"border-color:var(--color-primary); color:var(--color-primary);":""}">CBT形式 (60分×6ブロック)</button>
              <button class="btn btn-secondary btn-sm sim-preset-btn" data-type="kokushi" style="${Re===3?"border-color:var(--color-primary); color:var(--color-primary);":""}">国試形式 (120分×3ブロック)</button>
            </div>
            <div style="font-size:0.8rem; color:var(--color-text-secondary);">現在: ブロック毎 ${Fe}分 / 休憩 ${rt}分 / 全${Re}ブロック</div>
          </div>
        `:""}


        <div class="stopwatch-display">
          <div class="stopwatch-ring">
            <svg viewBox="0 0 300 300">
              <circle class="ring-bg" cx="150" cy="150" r="140"/>
              <circle class="ring-progress" id="timer-ring" cx="150" cy="150" r="140" style="stroke:${se?"var(--color-accent-pink)":"var(--color-primary)"}"/>
            </svg>
            <div class="stopwatch-time" id="timer-display">${ia(se?ee?Z:Z||1500:ne)}</div>
          </div>
        </div>

        <div class="stopwatch-controls">
          <button class="stopwatch-btn stopwatch-btn-reset" id="btn-reset" title="リセット">↺</button>
          <button class="stopwatch-btn ${ee?"stopwatch-btn-pause":"stopwatch-btn-start"}" id="btn-toggle">${ee?"⏸":"▶"}</button>
          <button class="stopwatch-btn stopwatch-btn-stop" id="btn-save" title="記録する">⏹</button>
        </div>
        ${document.pictureInPictureEnabled||"documentPictureInPicture"in window?`<div style="display:flex;align-items:center;gap:6px;margin-top:8px;justify-content:center;">
          <button id="btn-pip" style="background:none;border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-secondary);padding:4px 12px;font-size:0.8rem;cursor:pointer;" title="ミニタイマーをフローティング表示">${tt?"PiP 閉じる":"PiP"}</button>
          <button id="btn-pip-color" style="background:none;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:4px 8px;font-size:0.9rem;cursor:pointer;" title="PiPの色を変更">${la().label}</button>
        </div>`:""}
        <div class="stopwatch-status ${ee?"recording":""}" id="timer-status">${ee?Le&&Je==="break"?'<span class="status-dot"></span>休憩中...':$e?Ve==="break"?`<span class="status-dot"></span>休憩中... (次: ブロック${qe})`:`<span class="status-dot"></span>ブロック${qe}/${Re} 挑戦中...`:'<span class="status-dot"></span>集中記録中...':"準備ができたら開始しましょう"}</div>
        <div class="stopwatch-memo" style="margin-top:var(--space-md);"><input type="text" id="study-memo" placeholder="メモ（任意）..." style="width:100%;max-width:300px;text-align:center;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-primary);padding:5px;" maxlength="100"/></div>

        <!-- Confirmation Overlay -->
        ${Jt?`
          <div class="timer-overlay animate-fade-in" style="position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:var(--space-md); text-align:center;">
            <div class="confirm-card animate-slide-up">
              <div class="celebration-icon" style="margin-bottom:var(--space-md);"><span style="font-size:2rem;color:var(--color-accent-teal)">${u.check}</span></div>
              <h2 style="font-size:1.5rem; font-weight:700; color:var(--color-primary); margin-bottom:var(--space-xs);">お疲れ様でした！</h2>
              <p style="color:var(--color-text-secondary); margin-bottom:var(--space-lg); font-size:0.9rem;">今日の学習を記録しましょう</p>
              
              <div class="confirm-form" style="width:100%; display:flex; flex-direction:column; gap:16px; text-align:left;">
                <div class="field">
                  <label>学習時間 (分)</label>
                  <input type="number" id="confirm-duration" value="${ua}" style="width:100%; font-size:1.2rem; font-weight:700; text-align:center;" />
                </div>
                <div class="field">
                  <label>学習内容</label>
                  <div id="confirm-subject-wrapper">
                    <select id="confirm-subject" style="width:100%;">
                      <option value="">-- 未選択 --</option>
                      ${Me.map(I=>`<optgroup label="${I.name}">${I.subjects.map(C=>`<option value="${C.id}" ${xe===C.id?"selected":""}>${C.name}</option>`).join("")}</optgroup>`).join("")}
                      <option value="custom" ${xe==="custom"?"selected":""}>自由入力</option>
                    </select>
                    <input type="text" id="confirm-subject-custom" placeholder="具体的な学習内容..." value="${lt}" style="width:100%; margin-top:8px; display:${xe==="custom"?"block":"none"};" />
                  </div>
                </div>
                <div class="field">
                  <label>振り返りメモ</label>
                  <textarea id="confirm-memo" placeholder="学んだことや一言..." style="width:100%; min-height:80px;"></textarea>
                </div>
                <div style="display:flex; gap:12px;">
                  <div class="field" style="flex:1;">
                    <label>場所</label>
                    <select id="confirm-location" style="width:100%;">
                      <option value="自宅" ${Ce==="自宅"?"selected":""}>${Be("自宅")} 自宅</option>
                      <option value="図書館" ${Ce==="図書館"?"selected":""}>${Be("図書館")} 図書館</option>
                      <option value="カフェ" ${Ce==="カフェ"?"selected":""}>${Be("カフェ")} カフェ</option>
                      <option value="大学" ${Ce==="大学"?"selected":""}>${Be("大学")} 大学</option>
                      <option value="移動中" ${Ce==="移動中"?"selected":""}>${Be("移動中")} 移動中</option>
                      <option value="その他" ${Ce==="その他"?"selected":""}>${u.pin} その他</option>
                    </select>
                  </div>
                  <div class="field" style="flex:1;">
                    <label>集中度</label>
                    <select id="confirm-focus" style="width:100%;">
                      ${Ha(jt)}
                    </select>
                  </div>
                </div>
                <div style="display:flex; gap:12px; margin-top:8px;">
                  <button class="btn btn-secondary" id="btn-discard-log" style="flex:1; justify-content:center;">破棄</button>
                  <button class="btn btn-primary" id="btn-confirm-save" style="flex:2; justify-content:center;">記録を保存</button>
                </div>
              </div>
            </div>
          </div>
        `:""}
      </div>
      <div class="study-log-card card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">${u.list}最近の学習ログ</div></div>
        <div class="study-log-list">${Object.entries(n).map(([I,C])=>{if(!C.length)return"";const ae=C.reduce((q,G)=>q+G.duration_minutes,0);return`<div class="study-log-day"><div class="study-log-day-header">${I} <span class="day-total">(計 ${we(ae)})</span></div>${C.map(q=>{const G=s.find(je=>je.id===q.subject_name);let ue,le;q.ended_at?(ue=new Date(q.started_at),le=new Date(q.ended_at)):(le=new Date(q.started_at),ue=new Date(le.getTime()-q.duration_minutes*6e4));const pe=ue.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),de=le.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});return`<div class="study-log-entry" data-id="${q.id}">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:var(--space-sm);flex-wrap:wrap;">
                  <span class="study-log-subject">${(G==null?void 0:G.name)||q.subject_name}</span>
                  <span class="study-log-duration">${we(q.duration_minutes)}</span>
                  <span class="study-log-time">${pe}〜${de}</span>
                  ${q.location&&q.location!=="未設定"?`<span class="study-log-location" style="font-size:0.75rem; margin-left:4px; color:var(--color-text-tertiary)" title="${q.location}">${Be(q.location)} ${q.location}</span>`:""}
                  ${q.focus_level?`<span class="study-log-focus" style="font-size:0.8rem; margin-left:2px;" title="集中度: ${q.focus_level}">${No(q.focus_level)} ${q.focus_level}</span>`:""}
                </div>
                ${q.memo?`<div class="study-log-memo" style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${q.memo}</div>`:""}
              </div>
              <div class="study-log-actions">
                <button class="btn-log-action edit" data-id="${q.id}" data-subject="${(G==null?void 0:G.name)||q.subject_name}" data-duration="${q.duration_minutes}" data-startedat="${ue.toISOString()}" data-endedat="${le.toISOString()}" data-memo="${q.memo||""}" data-location="${q.location||""}" data-focus="${q.focus_level||""}" title="編集" style="font-size:0.75rem;padding:2px 8px;">編集</button>
                <button class="btn-log-action delete" data-id="${q.id}" title="削除" style="font-size:0.75rem;padding:2px 8px;color:var(--color-accent-pink);">削除</button>
              </div>
            </div>`}).join("")}</div>`}).join("")}</div></div>
    </div>
    
    <div class="study-check-card card animate-slide-up" style="animation-delay:.2s;margin-top:var(--space-lg);">
      <div class="card-header" style="border-bottom:1px solid rgba(148,163,184,0.1);padding-bottom:var(--space-sm);">
        <div class="card-title">${u.stats}QB × 学習分析</div>
      </div>
      <div style="padding:var(--space-md);">
        ${(()=>{const I=vt(),C={};t.forEach(G=>{const ue=yt(G.subject_name);C[ue]=(C[ue]||0)+G.duration_minutes});const q=Me.flatMap(G=>G.subjects).map(G=>{const ue=I[G.id]||{};let le=0,pe=0,de=0;Object.values(ue).forEach(Ee=>{le+=Ee.done||0,pe+=Ee.total||0,de+=Ee.correct||0});const je=C[G.name]||0;if(le===0&&pe===0&&je===0)return null;const me=pe>0?Math.round(le/pe*100):0,ce=le>0?Math.round(de/le*100):0;return{name:G.name,done:le,total:pe,pct:me,acc:ce,studyMin:je}}).filter(Boolean).sort((G,ue)=>ue.studyMin-G.studyMin);return q.length===0?'<div style="text-align:center;padding:var(--space-lg);color:var(--color-text-tertiary);font-size:0.9rem;">学習記録またはQB進捗を登録すると分析が表示されます</div>':q.map(G=>`
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(148,163,184,0.06);">
              <div>
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;">${G.name}</div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <span style="font-size:0.75rem;color:var(--color-text-tertiary);">${u.timer} ${we(G.studyMin)}</span>
                  ${G.total>0?`<span style="font-size:0.75rem;color:var(--color-text-tertiary);">${u.list} ${G.done}/${G.total}問</span>
                  <span style="font-size:0.75rem;color:${G.acc>=80?"#10b981":G.acc>=60?"#f59e0b":"#ef4444"};">正答率 ${G.acc}%</span>`:""}
                </div>
              </div>
              <div style="width:52px;height:52px;position:relative;">
                <svg viewBox="0 0 36 36" style="width:52px;height:52px;transform:rotate(-90deg);">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-bg-elevated)" stroke-width="3"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="${G.pct>=80?"#10b981":G.pct>=50?"#f59e0b":"#4ecdc4"}" stroke-width="3" stroke-dasharray="${G.pct*.88} 88" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;">${G.pct}%</div>
              </div>
            </div>
          `).join("")})()}
      </div>
    </div>`;const l=document.getElementById("timer-display"),p=document.getElementById("timer-ring"),c=document.getElementById("timer-status"),b=document.getElementById("btn-toggle"),_=2*Math.PI*140;function f(I){l.innerHTML=ia(I);const C=2*Math.PI*140;let ae,q;se&&_e>0?(ae=I/_e,q=ae*360%360,p.style.strokeDashoffset=C-ae*C,p.style.stroke=`hsl(${q}, 80%, 60%)`):se||(ae=I%1800/1800,q=ae*360%360,p.style.strokeDashoffset=C-ae*C,p.style.stroke=`hsl(${q}, 80%, 60%)`)}ee?(p.style.strokeDasharray=_,ct()):(se?Z>0:ne>0)&&(p.style.strokeDasharray=_,f(se?Z:ne)),b.addEventListener("click",()=>{if(p.style.strokeDasharray=_,ee)pa(),b.className="stopwatch-btn stopwatch-btn-start",b.textContent="▶",c.className="stopwatch-status",c.textContent="一時停止中";else{if(se&&Z===0){k(" 時間をセットしてください");return}Io(),ct(),b.className="stopwatch-btn stopwatch-btn-pause",b.textContent="⏸",c.className="stopwatch-status recording",c.innerHTML='<span class="status-dot"></span>記録中...',se&&!ee&&be()}}),document.getElementById("btn-reset").addEventListener("click",()=>{ca(),l.innerHTML=ia(se?Z||1500:0),p.style.strokeDashoffset=_,b.className="stopwatch-btn stopwatch-btn-start",b.textContent="▶",c.className="stopwatch-status",c.textContent="準備ができたら開始しましょう",be()}),document.getElementById("btn-save").addEventListener("click",()=>{ne>0||We>0?Ia(!0):k(" 記録する時間がありません")}),(v=document.getElementById("btn-pip"))==null||v.addEventListener("click",()=>{vs()}),(S=document.getElementById("btn-pip-color"))==null||S.addEventListener("click",I=>{ps(),I.target.textContent=la().label,tt&&Ja(),k(`🎨 PiPテーマ: ${la().id}`)}),(D=document.getElementById("btn-zen-mode"))==null||D.addEventListener("click",()=>{document.body.classList.toggle("zen-mode")}),(d=document.getElementById("btn-sound-toggle"))==null||d.addEventListener("click",I=>{const C=I.currentTarget;let ae=localStorage.getItem("medfocus_sound")!=="false";ae=!ae,localStorage.setItem("medfocus_sound",ae),C.innerHTML=ae?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',ae?(k(u.check+" 通知音をオンにしました"),Co()):k(u.check+" 通知音をミュートにしました")}),(m=document.getElementById("mode-up"))==null||m.addEventListener("click",()=>{ee||(se=!1,Le=!1,$e=!1,be())}),(y=document.getElementById("mode-down"))==null||y.addEventListener("click",()=>{ee||(se=!0,Le=!1,$e=!1,Z===0&&(Z=25*60,Ue=25*60,_e=25*60),be())}),(h=document.getElementById("mode-pomodoro"))==null||h.addEventListener("click",()=>{ee||(se=!0,Le=!0,$e=!1,Je="study",Z=25*60,Ue=25*60,_e=25*60,be())}),(P=document.getElementById("mode-simulation"))==null||P.addEventListener("click",()=>{ee||(se=!0,Le=!1,$e=!0,Ve="study",qe=1,Re=6,Fe=60,rt=10,Z=Fe*60,Ue=Fe*60,_e=Fe*60,be())}),document.querySelectorAll(".preset-btn").forEach(I=>{I.addEventListener("click",()=>{Z=parseInt(I.dataset.min)*60,_e=Z,ne=0,be()})}),document.querySelectorAll(".sim-preset-btn").forEach(I=>{I.addEventListener("click",C=>{if(ee)return;C.target.dataset.type==="cbt"?(Re=6,Fe=60,rt=10):(Re=3,Fe=120,rt=15),qe=1,Ve="study",Z=Fe*60,Ue=Fe*60,_e=Fe*60,be()})}),(H=document.getElementById("custom-min"))==null||H.addEventListener("input",I=>{const C=parseInt(I.target.value);C>0&&(Z=C*60,_e=Z,ne=0,l&&(l.innerHTML=ia(Z)))}),(N=document.getElementById("confirm-subject"))==null||N.addEventListener("change",I=>{xe=I.target.value;const C=document.getElementById("confirm-subject-custom");C&&(C.style.display=xe==="custom"?"block":"none"),Pe()}),(Q=document.getElementById("confirm-subject-custom"))==null||Q.addEventListener("input",I=>{lt=I.target.value,Pe()}),(ge=document.getElementById("btn-confirm-save"))==null||ge.addEventListener("click",async I=>{const C=I.currentTarget,ae=document.getElementById("confirm-duration"),q=document.getElementById("confirm-subject"),G=document.getElementById("confirm-memo"),ue=document.getElementById("confirm-location"),le=document.getElementById("confirm-focus"),pe=parseInt(ae.value),de=q.value,je=document.getElementById("confirm-subject-custom"),me=de==="custom"?(je==null?void 0:je.value.trim())||"その他":de,ce=G.value.trim(),Ee=ue?ue.value:Ce,Te=le?parseFloat(le.value):jt;if(isNaN(pe)||pe<=0){k(" 正しい時間を入力してください");return}if(!me){k(" 学習内容を入力してください");return}C.disabled=!0,C.textContent="保存中...",C.style.opacity="0.7";try{Ce=Ee,jt=Te,Pe();const he=new Date().toISOString();await Lo(me,pe,ce,Te,Ee,Tt||he,he,Ke)?(ca(),be()):(C.disabled=!1,C.textContent="記録を保存",C.style.opacity="1")}catch(he){console.error("Static save error:",he),C.disabled=!1,C.textContent="記録を保存",C.style.opacity="1"}}),(ie=document.getElementById("btn-discard-log"))==null||ie.addEventListener("click",()=>{confirm("この記録を破棄しますか？")&&(ca(),be())}),document.querySelectorAll(".btn-log-action.delete").forEach(I=>I.addEventListener("click",async C=>{const ae=C.currentTarget.dataset.id;confirm("本当にこの記録を削除しますか？")&&(await is(ae),be())}));async function w(I){const C=document.createElement("div");C.className="modal-overlay animate-fade-in",C.style.zIndex="2000";const ae=new Date(I.startedat),q=I.endedat?new Date(I.endedat):new Date(ae.getTime()+I.duration*6e4),G=ae.toISOString().split("T")[0],ue=ae.toTimeString().split(" ")[0].substring(0,5),le=q.toTimeString().split(" ")[0].substring(0,5);C.innerHTML=`
      <div class="modal-content animate-slide-up" style="max-width:400px;">
        <div class="modal-header">
          <div class="modal-title">学習記録の編集</div>
          <button class="modal-close" id="close-edit-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="settings-field" style="margin-bottom:12px;">
            <label>日付</label>
            <input type="date" id="edit-log-date" value="${G}" />
          </div>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="settings-field" style="flex:1;">
              <label>開始時刻</label>
              <input type="time" id="edit-log-time" value="${ue}" />
            </div>
            <div class="settings-field" style="flex:1;">
              <label>終了時刻</label>
              <input type="time" id="edit-log-end-time" value="${le}" />
            </div>
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>学習時間 (分)</label>
            <input type="number" id="edit-log-duration" value="${I.duration}" />
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>学習内容</label>
            <select id="edit-log-subject">
              ${Me.map(me=>`<optgroup label="${me.name}">${me.subjects.map(ce=>`<option value="${ce.id}" ${ce.name===I.subject?"selected":""}>${ce.name}</option>`).join("")}</optgroup>`).join("")}
              <option value="custom" ${Me.some(me=>me.subjects.some(ce=>ce.name===I.subject))?"":"selected"}>その他/自由入力</option>
            </select>
            <input type="text" id="edit-log-subject-custom" value="${Me.some(me=>me.subjects.some(ce=>ce.name===I.subject))?"":I.subject}" style="margin-top:8px; display:${Me.some(me=>me.subjects.some(ce=>ce.name===I.subject))?"none":"block"};" placeholder="内容を入力..." />
          </div>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="settings-field" style="flex:1;">
              <label>場所</label>
              <select id="edit-log-location" style="width:100%;">
                <option value="自宅" ${I.location==="自宅"?"selected":""}>${Be("自宅")} 自宅</option>
                <option value="図書館" ${I.location==="図書館"?"selected":""}>${Be("図書館")} 図書館</option>
                <option value="カフェ" ${I.location==="カフェ"?"selected":""}>${Be("カフェ")} カフェ</option>
                <option value="大学" ${I.location==="大学"?"selected":""}>${Be("大学")} 大学</option>
                <option value="移動中" ${I.location==="移動中"?"selected":""}>${Be("移動中")} 移動中</option>
                <option value="その他" ${I.location==="その他"||!I.location?"selected":""}>${u.pin} その他</option>
              </select>
            </div>
            <div class="settings-field" style="flex:1;">
              <label>集中度</label>
              <select id="edit-log-focus" style="width:100%;">
                ${Ha(I.focus)}
              </select>
            </div>
          </div>
          <div class="settings-field">
            <label>メモ</label>
            <textarea id="edit-log-memo" style="width:100%; min-height:60px;">${I.memo}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-edit-log">キャンセル</button>
          <button class="btn btn-primary" id="save-edit-log">保存する</button>
        </div>
      </div>
    `,document.body.appendChild(C);const pe=()=>C.remove();document.getElementById("close-edit-modal").onclick=pe,document.getElementById("cancel-edit-log").onclick=pe;const de=document.getElementById("edit-log-subject"),je=document.getElementById("edit-log-subject-custom");de.onchange=()=>{je.style.display=de.value==="custom"?"block":"none"},document.getElementById("save-edit-log").onclick=async()=>{const me=document.getElementById("edit-log-date").value,ce=document.getElementById("edit-log-time").value,Ee=document.getElementById("edit-log-end-time").value,Te=parseInt(document.getElementById("edit-log-duration").value),he=de.value==="custom"?je.value:de.options[de.selectedIndex].text,ut=document.getElementById("edit-log-memo").value,At=document.getElementById("edit-log-location").value,kt=parseFloat(document.getElementById("edit-log-focus").value);if(!me||!ce||isNaN(Te)||Te<=0||!he){k(" 全ての項目を正しく入力してください");return}const Kt=new Date(`${me}T${ce}`).toISOString(),_t=Ee?new Date(`${me}T${Ee}`).toISOString():null;await ss(I.id,he,Te,Kt,ut,kt,At,_t),pe(),be()}}document.querySelectorAll(".btn-log-action.edit").forEach(I=>I.addEventListener("click",C=>{w(C.currentTarget.dataset)})),(fe=document.getElementById("study-subject"))==null||fe.addEventListener("change",I=>{xe=I.target.value;const C=document.getElementById("study-subject-custom-row");C&&(C.style.display=xe==="custom"?"block":"none"),Pe()}),(Oe=document.getElementById("study-subject-custom"))==null||Oe.addEventListener("input",I=>{lt=I.target.value,Pe()})}async function ft(){const e=document.getElementById("page-container"),t=ht(L.id),o=dt(L.name),a=await ns(),s=Qe.map(c=>c.id),l=[...a.filter(c=>!c.group_id||s.includes(c.group_id))].sort((c,b)=>new Date(b.created_at)-new Date(c.created_at));e.innerHTML=`<div class="page-header"><h1 class="page-title">質問広場</h1><p class="page-subtitle">仲間と知識を共有し、疑問を解決しよう</p></div>
    <div class="filter-tabs"><button class="filter-tab active" data-filter="all">すべて</button><button class="filter-tab" data-filter="question">${u.question} 質問</button><button class="filter-tab" data-filter="activity">${u.megaphone} アクティビティ</button></div>
    <div class="community-layout"><div class="community-main">
      <div class="post-creator-input" id="open-post-modal"><div class="avatar" style="background:${t}">${o}</div><span class="post-creator-placeholder">質問内容や近況を書いてください...</span></div>
      <div class="post-feed" id="post-feed">${l.map(c=>$o(c)).join("")}</div></div>
      <div class="community-sidebar">
        <div class="card"><div class="card-header"><div class="card-title">${u.bell}最新アクティビティ</div></div><div class="activity-list">${Ko.slice(0,5).map(c=>`<div class="activity-item"><div class="activity-icon">${c.icon}</div><div class="activity-content"><div class="activity-name">${c.name}</div><div class="activity-action">${c.action}</div></div><div class="activity-time">${c.time}</div></div>`).join("")}</div></div>
        <div class="card"><div class="card-header"><div class="card-title">${u.stats}広場の統計</div></div><div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">質問数</span><span style="font-weight:700;color:#45B7D1">${a.filter(c=>c.type==="question").length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">回答数</span><span style="font-weight:700;color:#82E0AA">${a.reduce((c,b)=>{var _;return c+(((_=b.comments)==null?void 0:_.length)||0)},0)}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">いいね</span><span style="font-weight:700;color:#F1948A">${a.reduce((c,b)=>c+b.likes,0)}</span></div></div></div>
      </div>
    </div>
    <div class="modal-overlay" id="post-modal" style="display:none"><div class="modal-content"><div class="modal-header"><div class="modal-title">新しい投稿</div><button class="modal-close" id="close-post-modal">✕</button></div>
    <div class="modal-body">
      <div class="settings-field" style="margin-bottom:var(--space-md)">
        <label style="font-size:0.75rem;color:var(--color-text-tertiary);display:block;margin-bottom:4px;">投稿先</label>
        <select id="post-group-select" style="width:100%;background:var(--color-bg-input);border:1px solid var(--color-border);color:var(--color-text-primary);padding:8px;border-radius:var(--radius-sm);">
          <option value="">${u.globe} 全体 (質問広場)</option>
          ${Qe.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}
        </select>
      </div>
      <input type="text" id="post-title-input" placeholder="タイトル（質問の場合）"/><textarea id="post-body-input" placeholder="質問内容や近況を書いてください..."></textarea></div><div class="modal-footer"><label class="anonymous-toggle"><input type="checkbox" id="post-anonymous"/> 匿名で投稿</label><button class="btn btn-primary" id="submit-post">投稿する</button></div></div></div>`;const p=document.getElementById("post-modal");document.getElementById("open-post-modal").addEventListener("click",()=>p.style.display="flex"),document.getElementById("close-post-modal").addEventListener("click",()=>p.style.display="none"),p.addEventListener("click",c=>{c.target===p&&(p.style.display="none")}),document.getElementById("submit-post").addEventListener("click",async()=>{const c=document.getElementById("post-body-input").value,b=document.getElementById("post-title-input").value,_=document.getElementById("post-anonymous").checked,f=document.getElementById("post-group-select").value||null;c.trim()&&(console.log("DEBUG: Submitting post from UI",{t:b,b:c,anon:_,gid:f}),await ds(b||null,c,b?"question":"activity",_,f),p.style.display="none",ft())}),document.querySelectorAll(".filter-tab").forEach(c=>c.addEventListener("click",()=>{document.querySelectorAll(".filter-tab").forEach(f=>f.classList.remove("active")),c.classList.add("active");const b=c.dataset.filter,_=b==="all"?l:l.filter(f=>f.type===b);document.getElementById("post-feed").innerHTML=_.map(f=>$o(f)).join("")})),document.getElementById("post-feed").addEventListener("click",async c=>{const b=c.target.closest('[data-action="like"]');if(b){b.classList.toggle("liked");const v=b.querySelector("span"),S=parseInt(v.textContent);v.textContent=b.classList.contains("liked")?S+1:S-1}const _=c.target.closest(".btn-delete-post");if(_){const v=_.dataset.id;confirm("本当にこの投稿を削除しますか？")&&(await rs(v),ft())}const f=c.target.closest(".btn-submit-reply");if(f){const v=f.dataset.postId,S=f.closest(".post-reply-input-wrapper"),D=S.querySelector(".post-reply-input"),d=S.querySelector(".post-reply-anonymous"),m=D.value.trim(),y=d?d.checked:!1;if(!m)return;f.disabled=!0,f.textContent="...",await cs(v,m,y)?(D.value="",ft()):(f.disabled=!1,f.textContent="送信")}const w=c.target.closest(".btn-delete-reply");if(w){const v=w.dataset.id;confirm("この返信を削除しますか？")&&await ls(v)}})}let sa=null;async function xs(){const e=document.getElementById("page-container");let t="weekly";Qe.length>0&&!sa&&(sa=Qe[0].id);function o(n){return n===0?"gold":n===1?"silver":n===2?"bronze":"normal"}async function a(n,l){if(Qe.length===0)return'<div class="card"><div class="card-body" style="padding:var(--space-2xl);text-align:center;color:var(--color-text-secondary)">設定画面からグループを作成または参加すると<br>ランキングが表示されます。</div></div>';if(!l)return'<div class="card"><div class="card-body" style="padding:var(--space-2xl);text-align:center;color:var(--color-text-secondary)">グループを選択してください。</div></div>';const p=await as(l,n),c=`<div class="tabs" style="margin-bottom:var(--space-lg);overflow-x:auto;white-space:nowrap;justify-content:flex-start;scrollbar-width:none">
      ${Qe.map(v=>`<button class="tab ${v.id===l?"active":""}" data-group="${v.id}" style="flex:none">${v.name}</button>`).join("")}</div>`;if(p.length===0)return c+'<div class="card"><div class="card-body" style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">データが見つかりません</div></div>';const b=p.slice(0,3),_=b.length>=3?[b[1],b[0],b[2]]:b,f=`<div class="card animate-slide-up"><div class="card-header"><div class="card-title">${u.trophy}表彰台</div>
      <div class="tabs" style="max-width:240px;margin:0"><button class="tab ${n==="daily"?"active":""}" data-period="daily">今日</button><button class="tab ${n==="weekly"?"active":""}" data-period="weekly">今週</button></div></div>
      <div class="ranking-podium">${_.map((v,S)=>{var H,N;const D=S===0?_.length>1?2:1:S===1?1:3,d=D===1?u.crown:"",m=ht(v.userId),y=dt(v.name),h=v.userId===(((H=E==null?void 0:E.user)==null?void 0:H.id)||L.id)?L.avatar_url:v.avatarUrl||((N=v.profiles)==null?void 0:N.avatar_url);let P=`<div class="avatar avatar-lg" style="background:${m}">${y}</div>`;return h&&h.startsWith("http")&&(P=`<div class="avatar avatar-lg" style="background:var(--color-bg-elevated); overflow:hidden;"><img src="${h}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${y}'"/></div>`),`<div class="podium-item"><div class="podium-avatar">${d?`<span class="podium-crown">${d}</span>`:""}
          ${P}</div>
          <div class="podium-name">${v.name}</div><div class="podium-time">${we(v.total)}</div>
          <div class="podium-bar">${D}</div></div>`}).join("")}</div></div>`,w=`<div class="card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">${u.list}メンバーランキング</div></div>
        ${p.map((v,S)=>{var P,H;const D=v.userId===(((P=E==null?void 0:E.user)==null?void 0:P.id)||L.id),d=ht(v.userId),m=dt(v.name),y=D?L.avatar_url:v.avatarUrl||((H=v.profiles)==null?void 0:H.avatar_url);let h=`<div class="avatar avatar-sm" style="background:${d}">${m}</div>`;return y&&y.startsWith("http")&&(h=`<div class="avatar avatar-sm" style="background:var(--color-bg-elevated); overflow:hidden;"><img src="${y}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${m}'"/></div>`),`<div class="ranking-row ${D?"is-me":""}"><div class="ranking-position ${o(S)}">${S+1}</div>${h}<div class="ranking-user-info"><div class="ranking-user-name">${v.name} ${D?'<span class="badge badge-teal">あなた</span>':""}</div></div><div class="ranking-time">${we(v.total)}</div></div>`}).join("")}</div>`;return c+f+w}e.innerHTML=`<div class="page-header"><h1 class="page-title">ランキング</h1><p class="page-subtitle">グループメンバーと学習時間を競い合おう</p></div>
    <div id="ranking-main"><div style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">読み込み中...</div></div>`;const s=document.getElementById("ranking-main");s.innerHTML=await a(t,sa),s.addEventListener("click",async n=>{const l=n.target.closest("[data-period]"),p=n.target.closest("[data-group]");l&&(t=l.dataset.period),p&&(sa=p.dataset.group),(l||p)&&(s.innerHTML='<div style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">よみこみ中...</div>',s.innerHTML=await a(t,sa))})}async function ws(){var a;const e=document.getElementById("page-container");await ha();function t(){return $a.length===0?'<div class="card" style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">登録されているカウントダウンはありません。下から追加しましょう！</div>':$a.map(s=>{const n=Qo(s.exam_date),l=new Date(s.exam_date).toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"}),p=n===0&&new Date(s.exam_date)<new Date;return`<div class="countdown-card animate-slide-up" style="position:relative">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${p?"var(--color-text-tertiary)":s.color||"#4ECDC4"}"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div class="countdown-name">${s.name}</div>
                <div class="countdown-date">${l}</div>
              </div>
              <button class="btn-log-action delete btn-delete-cd" data-id="${s.id}" title="削除">✕</button>
            </div>
            <div class="countdown-days">
              <span class="countdown-number" style="color:${p?"var(--color-text-tertiary)":s.color||"#4ECDC4"}">${p?"終了":n}</span>
              ${p?"":'<span class="countdown-label">日</span>'}
            </div>
          </div>`}).join("")}e.innerHTML=`<div class="page-header"><h1 class="page-title">${u.calendar}試験カウントダウン</h1><p class="page-subtitle">目標の試験日までの残り日数を管理しよう</p></div>
    <div id="cd-list-container" style="display:flex;flex-direction:column;gap:var(--space-md);margin-bottom:var(--space-xl)">
      ${t()}
    </div>
    <div class="card" style="padding:var(--space-lg)">
      <div style="font-size:1rem;font-weight:600;margin-bottom:var(--space-md);color:var(--color-accent-teal)">＋ 新しいカウントダウンを追加</div>
      <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
        <input type="text" id="cd-title-input" placeholder="イベント名（例: 国家試験、CBT）" style="width:100%" />
        <input type="date" id="cd-date-input" style="width:100%;font-family:inherit" />
        <button class="btn btn-primary" id="btn-submit-cd" style="width:100%;justify-content:center">追加する</button>
      </div>
    </div>
  `,(a=document.getElementById("btn-submit-cd"))==null||a.addEventListener("click",async function(){const s=this,n=document.getElementById("cd-title-input"),l=document.getElementById("cd-date-input"),p=n==null?void 0:n.value.trim(),c=l==null?void 0:l.value;if(!p){k(u.warn+" イベント名を入力してください");return}if(!c){k(u.warn+" 日付を選択してください");return}s.textContent="保存中...",s.disabled=!0;try{if($){const b={name:p,exam_date:c};E!=null&&E.user&&(b.user_id=E.user.id);const{error:_}=await $.from("exam_countdowns").insert([b]);if(_)throw _;k(u.check+" カウントダウンを追加しました！"),da("countdowns"),await ha();const f=document.getElementById("cd-list-container");f&&(f.innerHTML=t()),n&&(n.value=""),l&&(l.value=""),o()}}catch(b){k(u.x+" 追加失敗: "+(b.message||"Error")),console.error("Countdown add error:",b)}finally{s.textContent="追加する",s.disabled=!1}});function o(){document.querySelectorAll(".btn-delete-cd").forEach(s=>{s.addEventListener("click",async function(){const n=this.dataset.id;if(confirm("このカウントダウンを削除しますか？"))try{if($){const{error:l}=await $.from("exam_countdowns").delete().eq("id",n);if(l)throw l;k(u.check+" 削除しました"),da("countdowns"),await ha();const p=document.getElementById("cd-list-container");p&&(p.innerHTML=t()),o()}}catch(l){k(u.x+" 削除失敗: "+(l.message||"Error"))}})})}o()}let ko=!1;function vt(){try{return JSON.parse(localStorage.getItem("medfocus_qb_progress")||"{}")}catch{return{}}}async function $s(){if(!(!$||!E||ko))try{const{data:e,error:t}=await $.from("profiles").select("qb_progress").eq("id",E.user.id).single();if(t)console.warn("qb load error:",t.message),console.warn("QB同期にはDBカラム追加が必要です");else if(e!=null&&e.qb_progress){const o=typeof e.qb_progress=="string"?JSON.parse(e.qb_progress):e.qb_progress,a=vt(),s={...o};Object.entries(a).forEach(([n,l])=>{s[n]?Object.entries(l).forEach(([p,c])=>{(!s[n][p]||(c.done||0)>(s[n][p].done||0))&&(s[n][p]=c)}):s[n]=l}),localStorage.setItem("medfocus_qb_progress",JSON.stringify(s))}else{const o=vt();Object.keys(o).length>0&&await $.from("profiles").update({qb_progress:JSON.stringify(o)}).eq("id",E.user.id)}ko=!0}catch(e){console.warn("qb load error:",e)}}function za(e){localStorage.setItem("medfocus_qb_progress",JSON.stringify(e)),$&&E&&$.from("profiles").update({qb_progress:JSON.stringify(e)}).eq("id",E.user.id).then(({error:t})=>{t&&(console.warn("qb sync error:",t.message),t.message.includes("qb_progress")&&console.warn("QB save: qb_progressカラムがありません"))})}async function xa(){await $s();const e=document.getElementById("page-container"),t=vt(),o={};Me.filter(a=>a.id.startsWith("cat-vol")).forEach(a=>{let s=0,n=0;a.subjects.forEach(l=>{const p=t[l.id]||{};Object.values(p).forEach(c=>{s+=c.done||0,n+=c.total||0})}),o[a.name]={done:s,total:n,pct:n>0?Math.round(s/n*100):0}}),e.innerHTML=`<div style="max-width:900px;margin:0 auto;">
    <div class="page-header"><h1 class="page-title">${u.book}QB進捗トラッカー</h1><p class="page-subtitle">各科目の問題集進捗を管理</p></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
      ${Object.entries(o).map(([a,s])=>`<div class="card" style="padding:14px;text-align:center;">
        <div style="font-size:0.75rem;color:var(--color-text-tertiary);">${a}</div>
        <div style="font-size:1.8rem;font-weight:800;color:${s.pct>=80?"#10b981":s.pct>=50?"#f59e0b":"var(--color-text-primary)"};">${s.pct}%</div>
        <div style="font-size:0.7rem;color:var(--color-text-tertiary);">${s.done}/${s.total}問</div>
        <div style="margin-top:6px;height:5px;background:var(--color-bg-elevated);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${s.pct}%;background:linear-gradient(90deg,#4ECDC4,#45B7D1);border-radius:3px;"></div>
        </div>
      </div>`).join("")}
    </div>
    ${Me.filter(a=>a.id.startsWith("cat-vol")).map(a=>{var n;const s=((n=o[a.name])==null?void 0:n.pct)||0;return`
      <div class="card" style="margin-bottom:16px;overflow:hidden;">
        <details>
          <summary style="padding:10px 14px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;">
            <span>${a.name}</span>
            <span style="font-size:0.8rem;font-weight:600;color:${s>=80?"#10b981":s>=50?"#f59e0b":"var(--color-text-tertiary)"};">${s}%</span>
          </summary>
          <div style="padding:4px;border-top:1px solid var(--color-border);">
          ${a.subjects.map(l=>{const p=t[l.id]||{},c=Object.keys(p).sort(),b=c.length>0?parseInt(c[c.length-1])+1:1;return`<div style="padding:8px 6px;border-bottom:1px solid var(--color-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-weight:600;font-size:0.85rem;">${l.name}</span>
                <button class="qb-add-round" data-sub="${l.id}" data-round="${b}" style="font-size:0.7rem;padding:3px 8px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-secondary);cursor:pointer;">+ ${b}周目</button>
              </div>
              ${c.length>0?c.map(_=>{const f=p[_],w=f.total>0?Math.round(f.done/f.total*100):0,v=f.correct||0,S=f.done>0?Math.round(v/f.done*100):0;return`<div style="margin:0 0 8px 0;padding:8px;background:var(--color-bg-elevated);border-radius:8px;font-size:0.8rem;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-weight:700;color:var(--color-text-secondary);">${_}周目</span>
                    <button class="qb-del-round" data-sub="${l.id}" data-round="${_}" style="font-size:0.65rem;padding:1px 6px;background:none;border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-tertiary);cursor:pointer;">✕</button>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
                    <span style="font-size:0.7rem;color:var(--color-text-tertiary);min-width:28px;">進捗</span>
                    <input type="number" class="qb-done" data-sub="${l.id}" data-round="${_}" value="${f.done}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <span>/</span>
                    <input type="number" class="qb-total" data-sub="${l.id}" data-round="${_}" value="${f.total}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${w}%;background:${w>=80?"#10b981":w>=50?"#f59e0b":"#ef4444"};border-radius:3px;"></div>
                    </div>
                    <span style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;">${w}%</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:0.7rem;color:var(--color-text-tertiary);min-width:28px;">正答</span>
                    <input type="number" class="qb-correct" data-sub="${l.id}" data-round="${_}" value="${v}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <span style="font-size:0.7rem;color:var(--color-text-tertiary);">/ ${f.done}</span>
                    <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${S}%;background:${S>=80?"#3b82f6":S>=60?"#8b5cf6":"#ec4899"};border-radius:3px;"></div>
                    </div>
                    <span style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;color:${S>=80?"#3b82f6":S>=60?"#8b5cf6":"#ec4899"};">${f.done>0?S+"%":"---"}</span>
                  </div>
                </div>`}).join(""):'<div style="font-size:0.75rem;color:var(--color-text-tertiary);padding:4px 8px;">未登録</div>'}
            </div>`}).join("")}
          </div>
        </details>
      </div>
    `}).join("")}
  </div>`,e.querySelectorAll(".qb-add-round").forEach(a=>{a.addEventListener("click",()=>{const s=a.dataset.sub,n=a.dataset.round,l=vt();l[s]||(l[s]={}),l[s][n]={done:0,total:0,correct:0},za(l),xa()})}),e.querySelectorAll(".qb-del-round").forEach(a=>{a.addEventListener("click",()=>{if(!confirm(`${a.dataset.round}周目を削除しますか？`))return;const s=vt();s[a.dataset.sub]&&delete s[a.dataset.sub][a.dataset.round],za(s),xa()})}),e.querySelectorAll(".qb-done,.qb-total,.qb-correct").forEach(a=>{a.addEventListener("change",()=>{const s=a.dataset.sub,n=a.dataset.round,l=vt();l[s]||(l[s]={}),l[s][n]||(l[s][n]={done:0,total:0,correct:0}),a.classList.contains("qb-done")?l[s][n].done=parseInt(a.value)||0:a.classList.contains("qb-total")?l[s][n].total=parseInt(a.value)||0:a.classList.contains("qb-correct")&&(l[s][n].correct=parseInt(a.value)||0),za(l),xa()})})}const z={preset:"all",dateFrom:"",dateTo:"",subjects:[],location:"",timeSlot:"",focusLevel:"",sessionLength:""};function ks(e){let t=[...e];const o=ye(new Date);if(z.preset==="today"){const a=new Date(o);a.setHours(5,0,0,0);const s=new Date(o);s.setHours(28,59,59,999),t=t.filter(n=>{const l=new Date(n.started_at);return l>=a&&l<=s})}else if(z.preset==="week"){const a=o.getDay(),s=a===0?6:a-1,n=new Date(o);n.setDate(o.getDate()-s),n.setHours(5,0,0,0),t=t.filter(l=>new Date(l.started_at)>=n)}else if(z.preset==="month"){const a=new Date(o.getFullYear(),o.getMonth(),1);a.setHours(5,0,0,0),t=t.filter(s=>new Date(s.started_at)>=a)}else if(z.preset==="lastmonth"){const a=new Date(o.getFullYear(),o.getMonth()-1,1);a.setHours(5,0,0,0);const s=new Date(o.getFullYear(),o.getMonth(),0);s.setHours(28,59,59,999),t=t.filter(n=>{const l=new Date(n.started_at);return l>=a&&l<=s})}else if(z.preset==="custom"){if(z.dateFrom){const a=new Date(z.dateFrom);a.setHours(5,0,0,0),t=t.filter(s=>new Date(s.started_at)>=a)}if(z.dateTo){const a=new Date(z.dateTo);a.setHours(28,59,59,999),t=t.filter(s=>new Date(s.started_at)<=a)}}if(z.subjects.length>0&&(t=t.filter(a=>z.subjects.includes(yt(a.subject_name)))),z.location&&(t=t.filter(a=>(a.location||"未設定")===z.location)),z.timeSlot&&(t=t.filter(a=>{const s=new Date(a.started_at).getHours();return z.timeSlot==="morning"?s>=5&&s<11:z.timeSlot==="afternoon"?s>=11&&s<17:z.timeSlot==="evening"?s>=17&&s<23:z.timeSlot==="night"?s>=23||s<5:!0})),z.focusLevel){const a=parseInt(z.focusLevel);t=t.filter(s=>s.focus_level&&Number(s.focus_level)>=a)}return z.sessionLength&&(t=t.filter(a=>z.sessionLength==="short"?a.duration_minutes<=30:z.sessionLength==="medium"?a.duration_minutes>30&&a.duration_minutes<=60:z.sessionLength==="long"?a.duration_minutes>60:!0)),t}function _s(){z.preset="all",z.dateFrom="",z.dateTo="",z.subjects=[],z.location="",z.timeSlot="",z.focusLevel="",z.sessionLength=""}const it={trend:'<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',subject:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h20"/></svg>',clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',location:'<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',list:'<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',ai:'<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',focus:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'};async function Ze(){var Za,eo,to,ao,oo,so,io,no,ro,lo,co,uo;const e=document.getElementById("page-container"),t=await Da(),o=ks(t),a=ye(new Date);[...new Set(t.map(i=>yt(i.subject_name)))].sort();const s=[...new Set(t.map(i=>i.location||"未設定"))].sort(),n=o.reduce((i,r)=>i+r.duration_minutes,0),l=o.length,c=new Set(o.map(i=>ve(ye(new Date(i.started_at))))).size,b=o.filter(i=>i.focus_level),_=b.length>0?(b.reduce((i,r)=>i+Number(r.focus_level),0)/b.length).toFixed(1):"-",f=l>0?Math.round(n/l):0,w={};o.forEach(i=>{const r=yt(i.subject_name);w[r]=(w[r]||0)+i.duration_minutes});const v=Object.entries(w).sort((i,r)=>r[1]-i[1]),S=["日","月","火","水","木","金","土"],D=[0,0,0,0,0,0,0];o.forEach(i=>{const r=ye(new Date(i.started_at)).getDay();D[r]+=i.duration_minutes});const d=Math.max(...D,1),m={};o.forEach(i=>{const r=i.location||"未設定";m[r]||(m[r]={min:0,focusSum:0,focusCount:0,count:0}),m[r].min+=i.duration_minutes,m[r].count++,i.focus_level&&(m[r].focusSum+=Number(i.focus_level),m[r].focusCount++)});const y=Object.entries(m).sort((i,r)=>r[1].min-i[1].min),h=y.length>0?y[0][1].min:1,P={};o.forEach(i=>{const r=new Date(i.started_at),B=i.duration_minutes;if(!B||B<=0)return;const j=new Date(r.getTime()+B*6e4);let M=new Date(r),K=B;for(;K>0&&M<j;){const V=M.getHours(),De=ye(new Date(M)).getDay(),Se=new Date(M);Se.setMinutes(0,0,0),Se.setHours(Se.getHours()+1);const Ie=Math.min(K,(Se-M)/6e4),ze=`${De}-${V}`;P[ze]=(P[ze]||0)+Ie,K-=Ie,M=Se}});const H=Math.max(...Object.values(P),1);let N=new Date(a),Q=new Date(a);if(z.preset==="today")N.setDate(a.getDate()-6);else if(z.preset==="week"){const i=a.getDay(),r=i===0?6:i-1;N.setDate(a.getDate()-r)}else if(z.preset==="month")N=new Date(a.getFullYear(),a.getMonth(),1);else if(z.preset==="lastmonth")N=new Date(a.getFullYear(),a.getMonth()-1,1),Q=new Date(a.getFullYear(),a.getMonth(),0);else if(z.preset==="custom"){if(z.dateFrom)N=new Date(z.dateFrom);else if(t.length>0){const i=t.map(r=>new Date(r.started_at)).sort((r,B)=>r-B);N=ye(i[0])}else N.setDate(a.getDate()-29);z.dateTo&&(Q=new Date(z.dateTo))}else if(t.length>0){const i=t.map(r=>new Date(r.started_at)).sort((r,B)=>r-B);N=ye(i[0])}else N.setDate(a.getDate()-29);if(N>Q){const i=N;N=Q,Q=i}const ge=24*60*60*1e3;let ie=Math.round((Q-N)/ge)+1,fe=new Date(N);ie>90&&(fe=new Date(Q),fe.setDate(fe.getDate()-89),ie=90),ie<7&&(fe.setDate(fe.getDate()-(7-ie)),ie=7);const Oe=[],I=[];for(let i=0;i<ie;i++){const r=new Date(fe);r.setDate(r.getDate()+i);const B=new Date(r);B.setHours(5,0,0,0);const j=new Date(r);j.setHours(28,59,59,999);const M=o.filter(K=>{const V=new Date(K.started_at);return V>=B&&V<=j}).reduce((K,V)=>K+V.duration_minutes,0);I.push(M),Oe.push(`${r.getMonth()+1}/${r.getDate()}`)}const C=["#4ECDC4","#45B7D1","#FF6B6B","#F7DC6F","#BB8FCE","#F1948A","#F0B27A","#82E0AA","#5DADE2","#AF7AC5","#F39C12","#E74C3C","#1ABC9C"],ae=v.reduce((i,[,r])=>i+r,0)||1;let q="",G=0;const ue=60,le=2*Math.PI*ue;v.slice(0,10).forEach(([i,r],B)=>{const j=r/ae,M=le*j,K=C[B%C.length];q+=`<circle cx="80" cy="80" r="${ue}" fill="none" stroke="${K}" stroke-width="20" stroke-dasharray="${M} ${le-M}" stroke-dashoffset="${-G}" transform="rotate(-90 80 80)"/>`,G+=M});const pe=[];for(let i=5;i<24;i++)pe.push(i);for(let i=0;i<5;i++)pe.push(i);let de='<div class="tod-heatmap-label"></div>';pe.forEach((i,r)=>{r%3===0?de+=`<div class="tod-heatmap-label">${i}</div>`:de+='<div class="tod-heatmap-label" style="font-size:0"></div>'}),[1,2,3,4,5,6,0].forEach(i=>{de+=`<div class="tod-heatmap-label">${S[i]}</div>`,pe.forEach(r=>{const B=P[`${i}-${r}`]||0,j=H>0?B/H:0,M=Math.min(1,j*1.2),K=B>0?`rgba(78,205,196,${.15+M*.85})`:"",V=M>.7?`box-shadow:0 0 4px rgba(78,205,196,${M*.5})`:"";de+=`<div class="tod-heatmap-cell" style="${B>0?"background:"+K+";"+V:""}" title="${S[i]} ${r}時: ${Math.round(B)}分"></div>`})});const me={all:"全期間",today:"今日",week:"今週",month:"今月",lastmonth:"先月",custom:"カスタム"},ce=[],Ee=[];for(let i=0;i<7;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=new Date(r);B.setHours(5,0,0,0);const j=new Date(r);j.setHours(28,59,59,999);const M=t.filter(K=>{const V=new Date(K.started_at);return V>=B&&V<=j});ce.push(...M)}for(let i=7;i<14;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=new Date(r);B.setHours(5,0,0,0);const j=new Date(r);j.setHours(28,59,59,999);const M=t.filter(K=>{const V=new Date(K.started_at);return V>=B&&V<=j});Ee.push(...M)}function Te(i,r){const B=[];for(let j=0;j<7;j++){const M=new Date(a);M.setDate(M.getDate()-r-j);const K=new Date(M);K.setHours(5,0,0,0);const V=new Date(M);V.setHours(28,59,59,999);const De=i.filter(Se=>{const Ie=new Date(Se.started_at);return Ie>=K&&Ie<=V});if(De.length>0){const Se=De.reduce((Ie,ze)=>{const ke=new Date(ze.started_at);return ke<Ie?ke:Ie},new Date(De[0].started_at));B.push(Xe(String(Se.getHours()).padStart(2,"0")+":"+String(Se.getMinutes()).padStart(2,"0")))}}return B.length===0?null:Math.round(B.reduce((j,M)=>j+M,0)/B.length)}const he=Te(ce,0),ut=Te(Ee,7);function At(i){let r=(i+300)%1440;return String(Math.floor(r/60)).padStart(2,"0")+":"+String(r%60).padStart(2,"0")}const kt=ce.reduce((i,r)=>i+r.duration_minutes,0),Kt=Ee.reduce((i,r)=>i+r.duration_minutes,0),_t=Math.round(kt/7),Qt=Math.round(Kt/7),zt=Qt>0?Math.round((_t-Qt)/Qt*100):0,Yt=ce.filter(i=>i.focus_level),Ht=Ee.filter(i=>i.focus_level),Et=Yt.length>0?Yt.reduce((i,r)=>i+Number(r.focus_level),0)/Yt.length:null,Xt=Ht.length>0?Ht.reduce((i,r)=>i+Number(r.focus_level),0)/Ht.length:null,Dt=Et!==null&&Xt!==null?Et-Xt:null;function Zt(i){const r=i.reduce((j,M)=>j+M.duration_minutes,0);if(r===0)return 0;const B=i.filter(j=>{const M=new Date(j.started_at).getHours();return M>=23||M<5}).reduce((j,M)=>j+M.duration_minutes,0);return Math.round(B/r*100)}const g=Zt(ce),x=Zt(Ee),T=g-x,F=he!==null&&ut!==null?he-ut:0;let R="good",O="良好";Math.abs(F)>=90||T>=15?(R="danger",O="要注意"):(Math.abs(F)>=45||T>=5)&&(R="warning",O="警戒");const J=[];for(let i=0;i<30;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=new Date(r);B.setHours(5,0,0,0);const j=new Date(r);j.setHours(28,59,59,999);const M=t.filter(K=>{const V=new Date(K.started_at);return V>=B&&V<=j});J.push(...M)}const A={morning:0,afternoon:0,evening:0,night:0};J.forEach(i=>{const r=new Date(i.started_at).getHours();A[vo(r)]+=i.duration_minutes});const U=Object.values(A).reduce((i,r)=>i+r,0)||1,W=Math.round(A.morning/U*100),Y=Math.round((A.evening+A.night)/U*100);let oe="オールラウンダー",re=u._s('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>'),X="var(--color-accent-teal)";W>=40?(oe="朝型スプリンター",re=u._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>'),X="#f59e0b"):Y>=50&&(oe="夜型ディープフォーカス",re=u._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),X="#8b5cf6");const te=[];for(let i=0;i<30;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=new Date(r);B.setHours(5,0,0,0);const j=new Date(r);j.setHours(28,59,59,999);const M=t.filter(K=>{const V=new Date(K.started_at);return V>=B&&V<=j}).reduce((K,V)=>K+V.duration_minutes,0);te.push(M)}const Ae=Ro(te),ot=Ae<.6,Ft=ot?"コツコツ習慣化タイプ":"追い込み集中タイプ",Fo=ot?u._s('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'):u._s('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/>'),Va=ot?"#22c55e":"#f59e0b",ea={};J.forEach(i=>{if(!i.focus_level)return;const r=i.location||"未設定",B=new Date(i.started_at).getHours(),j=Wo(vo(B)),M=`${r} × ${j}`;ea[M]||(ea[M]={sum:0,count:0}),ea[M].sum+=Number(i.focus_level),ea[M].count++});const Ka=Object.entries(ea).filter(([,i])=>i.count>=3).map(([i,r])=>({name:i,avg:(r.sum/r.count).toFixed(1),count:r.count})).sort((i,r)=>r.avg-i.avg),ta=Ka.length>0?Ka[0]:null,St=Gt(),ma=[];for(let i=0;i<7;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=ve(r),j=St.find(M=>M.date===B);j&&j.wake_up&&ma.push(j)}let It=null,aa=null;if(ma.length>=3){const i=ma.filter(r=>r.wake_up).map(r=>Xe(r.wake_up));if(i.length>=3){const r=i.reduce((j,M)=>j+M,0)/i.length,B=i.reduce((j,M)=>j+Math.pow(M-r,2),0)/i.length;aa=Math.round(Math.sqrt(B)),aa<30?It="good":aa<60?It="warning":It="danger"}}function Qa(i,r){const B=[];for(let j=0;j<i;j++){const M=new Date(a);M.setDate(M.getDate()-r-j);const K=ve(M),V=St.find(He=>He.date===K);if(!V||!V.wake_up)continue;const De=new Date(M);De.setHours(5,0,0,0);const Se=new Date(M);Se.setHours(28,59,59,999);const Ie=t.filter(He=>{const Ct=new Date(He.started_at);return Ct>=De&&Ct<=Se});if(Ie.length===0)continue;const ze=Ie.reduce((He,Ct)=>{const po=new Date(Ct.started_at);return po<He?po:He},new Date(Ie[0].started_at)),ke=Xe(V.wake_up);let Ye=Xe(String(ze.getHours()).padStart(2,"0")+":"+String(ze.getMinutes()).padStart(2,"0"))-ke;Ye<0&&(Ye+=1440),Ye<720&&B.push(Ye)}return B.length===0?null:Math.round(B.reduce((j,M)=>j+M,0)/B.length)}const Pt=Qa(7,0),ga=Qa(7,7);let oa=null;const Ca={"<6h":{sum:0,count:0},"6-7h":{sum:0,count:0},"7-8h":{sum:0,count:0},"8h+":{sum:0,count:0}};for(let i=0;i<30;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=ve(r),j=new Date(r);j.setDate(j.getDate()-1);const M=ve(j),K=St.find(He=>He.date===B),V=St.find(He=>He.date===M);if(!K||!K.wake_up||!V||!V.bedtime)continue;const De=Xe(K.wake_up),Se=Xe(V.bedtime);let Ie=De-Se;Ie<0&&(Ie+=1440);const ze=Ie/60;let ke;ze<6?ke="<6h":ze<7?ke="6-7h":ze<8?ke="7-8h":ke="8h+";const st=new Date(r);st.setHours(5,0,0,0);const Ye=new Date(r);Ye.setHours(28,59,59,999),t.filter(He=>{const Ct=new Date(He.started_at);return Ct>=st&&Ct<=Ye&&He.focus_level}).forEach(He=>{Ca[ke].sum+=Number(He.focus_level),Ca[ke].count++})}const Ya=Object.entries(Ca).filter(([,i])=>i.count>=2).map(([i,r])=>({slot:i,avg:r.sum/r.count,count:r.count})).sort((i,r)=>r.avg-i.avg);oa=Ya.length>0?Ya[0]:null;let Ba=0;for(let i=0;i<7;i++){const r=new Date(a);r.setDate(r.getDate()-i);const B=ve(r),j=St.find(ke=>ke.date===B);if(!j||!j.bedtime)continue;const M=new Date(r);M.setHours(5,0,0,0);const K=new Date(r);K.setHours(28,59,59,999);const V=t.filter(ke=>{const st=new Date(ke.started_at);return st>=M&&st<=K});if(V.length===0)continue;const De=V.reduce((ke,st)=>{const Ye=new Date(new Date(st.started_at).getTime()+st.duration_minutes*6e4);return Ye>ke?Ye:ke},new Date(0)),Se=Xe(String(De.getHours()).padStart(2,"0")+":"+String(De.getMinutes()).padStart(2,"0"));let ze=Xe(j.bedtime)-Se;ze<0&&(ze+=1440),ze<30&&Ba++}const Ma=Ba>=3;let Xa=!1;const La=St.filter(i=>i.bedtime).map(i=>Xe(i.bedtime));if(La.length>=10){const i=Math.round(La.reduce((B,j)=>B+j,0)/La.length);let r=0;for(let B=0;B<3;B++){const j=new Date(a);j.setDate(j.getDate()-B);const M=ve(j),K=St.find(V=>V.date===M);if(K&&K.bedtime){let De=Xe(K.bedtime)-i;De<-720&&(De+=1440),De>=90&&r++}}Xa=r>=3}const Po=ma.length>=3;e.innerHTML=`
    <div class="page-header">
      <h1 class="page-title">インサイト</h1>
      <p class="page-subtitle">学習データを分析して最適な勉強法を見つけよう</p>
    </div>

    <!-- Filter Bar -->
    <div class="insights-filter-bar animate-slide-up">
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">期間</span>
          <div class="filter-chips" id="filter-preset-chips">
            ${["all","today","week","month","lastmonth","custom"].map(i=>`<button class="filter-chip ${z.preset===i?"active":""}" data-preset="${i}">${me[i]}</button>`).join("")}
          </div>
        </div>
      </div>
      <div class="filter-row" id="custom-date-row" style="display:${z.preset==="custom"?"flex":"none"}">
        <span class="filter-label">日付</span>
        <input type="date" class="filter-date-input" id="filter-date-from" value="${z.dateFrom}">
        <span class="filter-sep">〜</span>
        <input type="date" class="filter-date-input" id="filter-date-to" value="${z.dateTo}">
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">場所</span>
          <select class="filter-select" id="filter-location">
            <option value="">全て</option>
            ${s.map(i=>`<option value="${i}" ${z.location===i?"selected":""}>${i}</option>`).join("")}
          </select>
        </div>
        <div class="filter-group">
          <span class="filter-label">時間帯</span>
          <div class="filter-chips" id="filter-timeslot-chips">
            ${[{v:"",l:"全て"},{v:"morning",l:"朝"},{v:"afternoon",l:"昼"},{v:"evening",l:"夜"},{v:"night",l:"深夜"}].map(i=>`<button class="filter-chip ${z.timeSlot===i.v?"active":""}" data-slot="${i.v}">${i.l}</button>`).join("")}
          </div>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">集中度</span>
          <div class="filter-chips" id="filter-focus-chips">
            ${[{v:"",l:"全て"},{v:"3",l:"★3+"},{v:"4",l:"★4+"},{v:"5",l:"★5"}].map(i=>`<button class="filter-chip ${z.focusLevel===i.v?"active":""}" data-focus="${i.v}">${i.l}</button>`).join("")}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">時間</span>
          <div class="filter-chips" id="filter-session-chips">
            ${[{v:"",l:"全て"},{v:"short",l:"〜30分"},{v:"medium",l:"30-60分"},{v:"long",l:"60分〜"}].map(i=>`<button class="filter-chip ${z.sessionLength===i.v?"active":""}" data-len="${i.v}">${i.l}</button>`).join("")}
          </div>
        </div>
      </div>
      <div class="filter-actions">
        <button class="filter-reset-btn" id="filter-reset">リセット</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="insight-summary-grid animate-slide-up" style="animation-delay:.1s">
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-teal)">${Math.floor(n/60)}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">h${n%60>0?" "+n%60+"m":""}</span></div>
        <div class="insight-summary-label">総学習時間</div>
        <div class="insight-summary-sub">${l}セッション</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-blue)">${c}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">日</span></div>
        <div class="insight-summary-label">学習日数</div>
        <div class="insight-summary-sub">平均 ${we(c>0?Math.round(n/c):0)}/日</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-purple)">${_!=="-"?_:"-"}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">${_!=="-"?"/5":""}</span></div>
        <div class="insight-summary-label">平均集中度</div>
        <div class="insight-summary-sub">${b.length}件のデータ</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-green)">${we(f)}</div>
        <div class="insight-summary-label">平均セッション</div>
        <div class="insight-summary-sub">${v.length}科目</div>
      </div>
    </div>
    <!-- Section A: Recent Rhythm & Trends -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.12s">
      <div class="section-header" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div class="section-icon-wrap" style="color:var(--color-accent-yellow)">${it.clock}</div>
          <div><div class="section-title">生活リズムと最近の傾向</div><div class="section-subtitle">先週との比較で変化をチェック</div></div>
        </div>
        <span class="rhythm-status-badge ${R}">${O}</span>
      </div>
      <div class="rhythm-stat-grid">
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${u.timer} 平均勉強開始</div>
          <div class="rhythm-stat-value">${he!==null?At(he):"--:--"}</div>
          ${he!==null&&ut!==null?`<div class="rhythm-stat-change ${F>30?"change-negative":F<-30?"change-positive":"change-neutral"}">${F>0?"+":""}${F}分${F>30?" (後退)":F<-30?" (早起き化)":""}</div>`:'<div class="rhythm-stat-change change-neutral">先週データなし</div>'}
        </div>
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${u.clock} 1日平均学習</div>
          <div class="rhythm-stat-value">${we(_t)}</div>
          <div class="rhythm-stat-change ${zt>=0?"change-positive":"change-negative"}">${zt>=0?"+":""}${zt}%</div>
        </div>
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${u.target} 平均集中度</div>
          <div class="rhythm-stat-value">${Et!==null?"★"+Et.toFixed(1):"--"}</div>
          ${Dt!==null?`<div class="rhythm-stat-change ${Dt>=0?"change-positive":"change-negative"}">${Dt>=0?"+":""}${Dt.toFixed(1)}</div>`:'<div class="rhythm-stat-change change-neutral">--</div>'}
        </div>
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${u._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')} 深夜学習割合</div>
          <div class="rhythm-stat-value">${g}%</div>
          <div class="rhythm-stat-change ${T>=5?"change-warning":T<=-5?"change-positive":"change-neutral"}">${T>=0?"+":""}${T}%</div>
        </div>
      </div>
    </div>

    <!-- Section B: Personal Analysis -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.14s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${it.focus}</div>
        <div><div class="section-title">学習タイプ自己分析</div><div class="section-subtitle">直近30日間のデータから診断</div></div>
      </div>
      ${U>1?`
      <div class="personal-type-grid">
        <div class="personal-type-item">
          <div class="personal-type-icon" style="background:${X}22;color:${X}">${re}</div>
          <div class="personal-type-name">${oe}</div>
          <div class="personal-type-detail">朝${W}% / 夜${Y}%</div>
        </div>
        <div class="personal-type-item">
          <div class="personal-type-icon" style="background:${Va}22;color:${Va}">${Fo}</div>
          <div class="personal-type-name">${Ft}</div>
          <div class="personal-type-detail">CV: ${Ae.toFixed(2)}</div>
        </div>
        <div class="personal-type-item">
          <div class="personal-type-icon" style="background:rgba(78,205,196,0.13);color:var(--color-accent-teal)">${u._s('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>')}</div>
          <div class="personal-type-name">${ta?ta.name:"分析中..."}</div>
          <div class="personal-type-detail">${ta?"★"+ta.avg+"（"+ta.count+"件）":"データ蓄積中"}</div>
        </div>
      </div>
      `:'<div class="data-collecting-msg">データを蓄積中です...</div>'}
    </div>

    <!-- Section C: Sleep Correlation -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.16s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${u._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}</div>
        <div><div class="section-title">睡眠と学習の相関</div><div class="section-subtitle">起床・就寝データから分析</div></div>
      </div>
      ${Po?`
      <div class="sleep-insight-grid">
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${u.timer} 起床リズム安定度</div>
          <div class="sleep-insight-value">
            ${It?`<span class="rhythm-status-badge ${It}">${It==="good"?"安定":It==="warning"?"やや不安定":"不安定"}</span>`:"--"}
          </div>
          ${aa!==null?`<div class="sleep-insight-note">標準偏差: ${aa}分</div>`:""}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${u.clock} 初動タイムラグ</div>
          <div class="sleep-insight-value">${Pt!==null?Pt+"分":"--"}</div>
          ${Pt!==null&&ga!==null?`<div class="sleep-insight-note">先週比: <span class="${Pt-ga<=0?"change-positive":"change-negative"}">${Pt-ga>=0?"+":""}${Pt-ga}分</span></div>`:""}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${u.star} ベスト睡眠時間</div>
          <div class="sleep-insight-value">${oa?oa.slot:"--"}</div>
          ${oa?`<div class="sleep-insight-note">翌日の平均集中度: ★${oa.avg.toFixed(1)}</div>`:'<div class="sleep-insight-note">データ蓄積中</div>'}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${u.shield} クールダウン</div>
          <div class="sleep-insight-value">${Ma?'<span class="change-warning">要注意</span>':'<span class="change-positive">良好</span>'}</div>
          <div class="sleep-insight-note">${Ma?"直近7日中"+Ba+"日が就寝直前まで勉強":"適切なクールダウン時間を確保"}</div>
        </div>
      </div>
      ${Ma?'<div class="sleep-alert-box alert-warning">'+u.warn+" 就寝直前まで勉強する傾向があり、睡眠の質を下げている可能性があります。勉強終了後は30分以上のクールダウンを心がけましょう。</div>":""}
      ${Xa?'<div class="sleep-alert-box alert-danger">'+u.warn+" 3日連続で就寝が大幅に後退しています。夜型化の兆候です。</div>":""}
      `:'<div class="data-collecting-msg">ダッシュボードの起床/就寝ボタンでデータを蓄積しましょう（3日分以上必要）</div>'}
    </div>

    <!-- Trend Chart + Subject Donut -->
    <div class="insights-grid animate-slide-up" style="animation-delay:.15s">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-teal)">${it.trend}</div>
          <div><div class="section-title">学習推移</div><div class="section-subtitle">日別の学習時間</div></div>
        </div>
        <div class="chart-container"><canvas id="insightTrendChart"></canvas></div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${it.subject}</div>
          <div><div class="section-title">科目分布</div><div class="section-subtitle">学習時間の内訳</div></div>
        </div>
        ${v.length>0?`
          <div style="display:flex;align-items:center;gap:var(--space-lg)">
            <svg viewBox="0 0 160 160" style="width:140px;height:140px;flex-shrink:0">
              <circle cx="80" cy="80" r="${ue}" fill="none" stroke="var(--color-bg-elevated)" stroke-width="20"/>
              ${q}
              <text x="80" y="76" text-anchor="middle" fill="var(--color-text-primary)" font-size="16" font-weight="800">${Math.floor(ae/60)}h</text>
              <text x="80" y="94" text-anchor="middle" fill="var(--color-text-tertiary)" font-size="10">合計</text>
            </svg>
            <div style="flex:1;font-size:0.75rem;display:flex;flex-direction:column;gap:4px">
              ${v.slice(0,7).map(([i,r],B)=>`
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${C[B%C.length]};flex-shrink:0"></span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i}</span>
                  <span style="font-weight:700;color:var(--color-text-secondary)">${we(r)}</span>
                </div>
              `).join("")}
              ${v.length>7?`<div style="color:var(--color-text-tertiary)">...他${v.length-7}科目</div>`:""}
            </div>
          </div>
        `:'<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-xl)">データなし</p>'}
      </div>
    </div>

    <!-- TOD Heatmap + Location -->
    <div class="insights-grid animate-slide-up" style="animation-delay:.2s">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-yellow)">${it.clock}</div>
          <div><div class="section-title">時間帯 × 曜日</div><div class="section-subtitle">いつ勉強しているか</div></div>
        </div>
        <div class="tod-heatmap-grid">${de}</div>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10px;color:var(--color-text-tertiary);margin-top:8px">
          <span>少</span>
          <div style="width:12px;height:12px;border-radius:2px;background:var(--color-bg-elevated)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(78,205,196,0.3)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(78,205,196,0.6)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(78,205,196,1)"></div>
          <span>多</span>
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-green)">${it.location}</div>
          <div><div class="section-title">場所別の分析</div><div class="section-subtitle">学習時間と集中度</div></div>
        </div>
        ${y.length>0?y.map(([i,r])=>{const B=r.focusCount>0?(r.focusSum/r.focusCount).toFixed(1):"-";return`<div class="location-stat-row">
            <div class="location-name">${i}</div>
            <div class="location-bar-wrap"><div class="location-bar-fill" style="width:${Math.round(r.min/h*100)}%;background:var(--gradient-primary)" data-width="${Math.round(r.min/h*100)}"></div></div>
            <div class="location-stat-meta">${we(r.min)} / ${B}★</div>
          </div>`}).join(""):'<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-xl)">データなし</p>'}
      </div>
    </div>

    <!-- DOW Chart + Session List -->
    <div class="insights-grid animate-slide-up" style="animation-delay:.25s">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-orange)">${it.calendar}</div>
          <div><div class="section-title">曜日別学習時間</div><div class="section-subtitle">曜日ごとの傾向</div></div>
        </div>
        <div class="dow-chart">
          ${[1,2,3,4,5,6,0].map(i=>`
            <div class="dow-bar-wrap">
              <div class="dow-bar-value">${D[i]>0?we(D[i]):""}</div>
              <div class="dow-bar" style="height:${Math.max(2,Math.round(D[i]/d*100))}%"></div>
              <div class="dow-bar-label">${S[i]}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-pink)">${it.list}</div>
          <div><div class="section-title">セッション一覧</div><div class="section-subtitle">${l}件</div></div>
        </div>
        <div class="session-list">
          <div class="session-row session-row-header">
            <div>日時</div><div>科目</div><div style="text-align:right">時間</div><div style="text-align:center">集中</div><div style="text-align:right">場所</div>
          </div>
          ${o.slice(0,50).map(i=>{const r=new Date(i.started_at);return`<div class="session-row">
              <div class="session-date">${`${r.getMonth()+1}/${r.getDate()} ${String(r.getHours()).padStart(2,"0")}:${String(r.getMinutes()).padStart(2,"0")}`}</div>
              <div class="session-subject">${yt(i.subject_name)}</div>
              <div class="session-duration">${we(i.duration_minutes)}</div>
              <div class="session-focus">${i.focus_level?"★".repeat(Number(i.focus_level)):"-"}</div>
              <div class="session-location">${i.location||"未設定"}</div>
            </div>`}).join("")}
          ${o.length>50?`<div style="text-align:center;padding:var(--space-md);color:var(--color-text-tertiary);font-size:var(--font-size-xs)">他 ${o.length-50} 件</div>`:""}
          ${o.length===0?'<div style="text-align:center;padding:var(--space-xl);color:var(--color-text-tertiary)">該当するセッションがありません</div>':""}
        </div>
      </div>
    </div>

    <!-- AI Advisor -->
    <div class="card animate-slide-up" style="animation-delay:.3s;overflow:hidden">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${it.ai}</div>
        <div><div class="section-title">AI学習アドバイザー</div><div class="section-subtitle">AIに学習データを分析してもらう</div></div>
      </div>
      <div style="margin-bottom:12px">
        <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
          <button class="ai-model-btn ${(localStorage.getItem("medfocus_ai_model")||"gemini")==="gemini"?"active":""}" data-model="gemini" style="padding:6px 14px;border-radius:20px;font-size:0.8rem;cursor:pointer;border:1px solid var(--color-border);background:${(localStorage.getItem("medfocus_ai_model")||"gemini")==="gemini"?"var(--color-primary)":"var(--color-bg-elevated)"};color:${(localStorage.getItem("medfocus_ai_model")||"gemini")==="gemini"?"#fff":"var(--color-text-secondary)"}">Gemini</button>
          <button class="ai-model-btn ${localStorage.getItem("medfocus_ai_model")==="claude"?"active":""}" data-model="claude" style="padding:6px 14px;border-radius:20px;font-size:0.8rem;cursor:pointer;border:1px solid var(--color-border);background:${localStorage.getItem("medfocus_ai_model")==="claude"?"#d97706":"var(--color-bg-elevated)"};color:${localStorage.getItem("medfocus_ai_model")==="claude"?"#fff":"var(--color-text-secondary)"}">Claude</button>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <input type="password" id="ai-api-key" placeholder="${(localStorage.getItem("medfocus_ai_model")||"gemini")==="claude"?"sk-ant-...":"AIza..."}" value="${(localStorage.getItem("medfocus_ai_model")||"gemini")==="claude"?localStorage.getItem("medfocus_claude_key")||"":localStorage.getItem("medfocus_gemini_key")||""}" style="flex:1;min-width:180px;padding:6px 10px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-primary);font-size:0.8rem">
          <button id="btn-save-api-key" class="btn" style="font-size:0.8rem;padding:6px 12px">保存</button>
        </div>
        <p style="color:var(--color-text-tertiary);font-size:0.7rem;margin:0" id="ai-key-hint">${(localStorage.getItem("medfocus_ai_model")||"gemini")==="claude"?'<a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:var(--color-primary)">Anthropic Console</a> でAPIキーを取得':'<a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--color-primary)">Google AI Studio</a> で無料取得'}</p>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">
        <button id="btn-ai-ask" class="btn btn-primary" style="font-size:0.85rem">AIにアドバイスを聞く</button>
        <button id="btn-ai-export-week" class="btn" style="font-size:0.8rem">今週コピー</button>
        <button id="btn-ai-export-all" class="btn" style="font-size:0.8rem">全期間コピー</button>
      </div>
      <div id="ai-response" style="display:none;padding:12px;background:var(--color-bg-elevated);border-radius:var(--radius-md);font-size:0.85rem;line-height:1.6;white-space:pre-wrap;max-height:400px;overflow-y:auto"></div>
    </div>
  `,setTimeout(()=>{if(typeof Chart<"u"&&I.some(i=>i>0)){Ea("insightTrendChart");const i=document.getElementById("insightTrendChart");i&&(Lt.insightTrendChart=new Chart(i,{type:"bar",data:{labels:Oe,datasets:[{label:"学習時間(分)",data:I,backgroundColor:r=>{const{ctx:B,chartArea:j}=r.chart;if(!j)return"#4ECDC4";const M=B.createLinearGradient(0,j.bottom,0,j.top);return M.addColorStop(0,"rgba(78,205,196,0.3)"),M.addColorStop(1,"rgba(69,183,209,0.8)"),M},borderRadius:4,borderSkipped:!1,maxBarThickness:24}]},options:{responsive:!0,maintainAspectRatio:!0,scales:{x:{grid:{display:!1},ticks:{font:{size:9},maxRotation:45}},y:{beginAtZero:!0,grid:{color:"rgba(148,163,184,0.06)"},ticks:{font:{size:9},callback:r=>r+"m"}}},plugins:{legend:{display:!1},tooltip:{backgroundColor:"#1a2332",titleColor:"#f0f4f8",bodyColor:"#94a3b8",borderColor:"rgba(78,205,196,0.3)",borderWidth:1,cornerRadius:8}},animation:{duration:800,easing:"easeOutQuart"}}}))}},200),(Za=document.getElementById("filter-preset-chips"))==null||Za.addEventListener("click",i=>{const r=i.target.closest(".filter-chip");r&&(z.preset=r.dataset.preset,Ze())}),(eo=document.getElementById("filter-date-from"))==null||eo.addEventListener("change",i=>{z.dateFrom=i.target.value,z.preset="custom",Ze()}),(to=document.getElementById("filter-date-to"))==null||to.addEventListener("change",i=>{z.dateTo=i.target.value,z.preset="custom",Ze()}),(ao=document.getElementById("filter-location"))==null||ao.addEventListener("change",i=>{z.location=i.target.value,Ze()}),(oo=document.getElementById("filter-timeslot-chips"))==null||oo.addEventListener("click",i=>{const r=i.target.closest(".filter-chip");r&&(z.timeSlot=r.dataset.slot,Ze())}),(so=document.getElementById("filter-focus-chips"))==null||so.addEventListener("click",i=>{const r=i.target.closest(".filter-chip");r&&(z.focusLevel=r.dataset.focus,Ze())}),(io=document.getElementById("filter-session-chips"))==null||io.addEventListener("click",i=>{const r=i.target.closest(".filter-chip");r&&(z.sessionLength=r.dataset.len,Ze())}),(no=document.getElementById("filter-reset"))==null||no.addEventListener("click",()=>{_s(),Ze()}),e.querySelectorAll(".ai-model-btn").forEach(i=>{i.addEventListener("click",()=>{localStorage.setItem("medfocus_ai_model",i.dataset.model),Ze()})}),(ro=document.getElementById("btn-save-api-key"))==null||ro.addEventListener("click",()=>{const i=document.getElementById("ai-api-key").value.trim(),B=(localStorage.getItem("medfocus_ai_model")||"gemini")==="claude"?"medfocus_claude_key":"medfocus_gemini_key";i?(localStorage.setItem(B,i),k(u.check+" APIキーを保存しました")):(localStorage.removeItem(B),k(u.check+" APIキーを削除しました"))}),(lo=document.getElementById("btn-ai-export-week"))==null||lo.addEventListener("click",()=>Eo(t,"week")),(co=document.getElementById("btn-ai-export-all"))==null||co.addEventListener("click",()=>Eo(t,"all")),(uo=document.getElementById("btn-ai-ask"))==null||uo.addEventListener("click",()=>Es(t))}async function Es(e){var n,l,p,c,b,_,f;const t=localStorage.getItem("medfocus_ai_model")||"gemini",o=t==="claude"?localStorage.getItem("medfocus_claude_key"):localStorage.getItem("medfocus_gemini_key");if(!o){k(`⚠️ まず${t==="claude"?"Claude":"Gemini"} APIキーを設定してください`);return}const a=document.getElementById("ai-response");a.style.display="block",a.textContent=`🔄 ${t==="claude"?"Claude":"Gemini"}が分析中...`;const s=Ds(e);try{if(t==="claude"){const v=await(await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":o,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2048,messages:[{role:"user",content:s}]})})).json();(l=(n=v.content)==null?void 0:n[0])!=null&&l.text?a.textContent=v.content[0].text:v.error?a.textContent=_o("Claude",v.error):a.textContent="❌ 予期しないレスポンス"}else{const v=await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${o}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:s}]}],generationConfig:{temperature:.7,maxOutputTokens:2048}})})).json();(f=(_=(b=(c=(p=v.candidates)==null?void 0:p[0])==null?void 0:c.content)==null?void 0:b.parts)==null?void 0:_[0])!=null&&f.text?a.textContent=v.candidates[0].content.parts[0].text:v.error?a.textContent=_o("Gemini",v.error):a.textContent="❌ 予期しないレスポンス"}}catch(w){a.textContent="❌ 通信エラー: "+w.message}}function _o(e,t){const o=t.code||t.status||"",a=t.message||JSON.stringify(t);if(o===429||a.includes("rate")||a.includes("quota")||a.includes("RESOURCE_EXHAUSTED")){const s=a.match(/retry in (\d+)/i),n=s?s[1]:"数十";return`${e}のレート制限に達しました。

${n}秒後に再度お試しください。

ヒント:
• 無料枠には1日/1分あたりのリクエスト数制限があります
• Claude Pro をお持ちなら「Claude」に切り替えてみてください
• 「コピー」ボタンで手動でAIに貼り付けることもできます`}return o===401||o===403||a.includes("API key")||a.includes("authentication")?`🔑 ${e}のAPIキーが無効です。

正しいキーを設定してください。`:`❌ ${e}エラー (${o}): ${a.slice(0,200)}`}function Ds(e){const t=ye(new Date),o=(t.getDay()+6)%7,a=new Date(t);a.setDate(t.getDate()-o),a.setHours(5,0,0,0);const s=e.filter(S=>new Date(S.started_at)>=a),n=s.reduce((S,D)=>S+D.duration_minutes,0),l={};s.forEach(S=>{const D=yt(S.subject_name);l[D]=(l[D]||0)+S.duration_minutes});const p=Object.entries(l).sort((S,D)=>D[1]-S[1]),c=s.filter(S=>S.focus_level),b=c.length>0?(c.reduce((S,D)=>S+Number(D.focus_level),0)/c.length).toFixed(1):"N/A",_={};c.forEach(S=>{const D=new Date(S.started_at).getHours();_[D]||(_[D]={s:0,c:0}),_[D].s+=Number(S.focus_level),_[D].c++});const f=Object.entries(_).map(([S,D])=>({h:S,avg:(D.s/D.c).toFixed(1)})).sort((S,D)=>D.avg-S.avg),w=JSON.parse(localStorage.getItem("medfocus_qb_progress")||"{}");let v="";return Object.entries(w).forEach(([S,D])=>{Object.entries(D).forEach(([d,m])=>{m.total>0&&(v+=`${S} ${d}周目: ${m.done}/${m.total}問完了, 正答${m.correct||0}問(${m.done>0?Math.round((m.correct||0)/m.done*100):0}%)
`)})}),`あなたは医学部の国試対策アドバイザーです。以下の学習データを分析して、具体的で実践的なアドバイスを日本語で提供してください。

【今週の学習データ (${ve(a)} 〜 ${ve(t)})】
総学習時間: ${we(n)}
平均集中度: ${b}/5.0
${f.length>0?`最も集中できる時間帯: ${f[0].h}時台(${f[0].avg})`:""}

■ 科目別学習時間:
${p.map(([S,D])=>`- ${S}: ${we(D)}`).join(`
`)}

${v?`■ QB進捗:
${v}`:""}

以下の観点からアドバイスしてください:
1. 科目バランスの改善点
2. 集中度を上げるための具体的な提案
3. 学習が不足している分野の指摘
4. 今後1週間の推奨学習プラン`}function Eo(e,t){const o=ye(new Date);let a=e,s="全期間";if(t==="week"){const y=(o.getDay()+6)%7,h=new Date(o);h.setDate(o.getDate()-y),h.setHours(5,0,0,0),a=e.filter(P=>new Date(P.started_at)>=h),s=`${ve(h)} 〜 ${ve(o)}`}const n=a.reduce((y,h)=>y+h.duration_minutes,0),l={};a.forEach(y=>{const h=yt(y.subject_name);l[h]=(l[h]||0)+y.duration_minutes});const p=Object.entries(l).sort((y,h)=>h[1]-y[1]),c=a.filter(y=>y.focus_level),b=c.length>0?(c.reduce((y,h)=>y+Number(h.focus_level),0)/c.length).toFixed(1):"N/A",_={};c.forEach(y=>{const h=new Date(y.started_at).getHours();_[h]||(_[h]={s:0,c:0}),_[h].s+=Number(y.focus_level),_[h].c++});const f=Object.entries(_).map(([y,h])=>({h:y,avg:(h.s/h.c).toFixed(1)})).sort((y,h)=>h.avg-y.avg),w=new Set(e.map(y=>ve(ye(new Date(y.started_at)))));let v=0;const S=new Date(o);for(;w.has(ve(S));)v++,S.setDate(S.getDate()-1);const D=JSON.parse(localStorage.getItem("medfocus_qb_progress")||"{}"),d={};Object.entries(D).forEach(([y,h])=>{const P=y.startsWith("1")?"vol.1":y.startsWith("2")?"vol.2":y.startsWith("3")?"vol.3":"other";d[P]||(d[P]={done:0,total:0}),Object.values(h).forEach(H=>{d[P].done+=H.done||0,d[P].total+=H.total||0})});let m=`【MedFocus 学習レポート】
期間: ${s}
総学習時間: ${we(n)}
連続記録: ${v}日

■ 科目別学習時間
`;p.forEach(([y,h],P)=>{m+=`${P+1}. ${y}: ${we(h)}
`}),m+=`
■ 集中度分析
平均集中度: ${b}/5.0
`,f.length>0&&(m+=`最高集中時間帯: ${f[0].h}時台 (${f[0].avg})
`),Object.keys(d).length>0&&(m+=`
■ QB進捗
`,Object.entries(d).forEach(([y,h])=>{m+=`${y}: ${h.done}/${h.total} (${h.total>0?Math.round(h.done/h.total*100):0}%)
`})),m+=`
このデータを元に、学習計画の改善アドバイスをお願いします。`,navigator.clipboard.writeText(m).then(()=>k(" クリップボードにコピーしました！AIに貼り付けてください")).catch(()=>k(" コピーに失敗しました"))}function Vt(){var _,f,w,v,S,D;const e=document.getElementById("page-container"),t=ht(L.id),o=dt(L.name),a=Qe.length===0?'<div style="text-align:center;padding:var(--space-xl);color:var(--color-text-secondary);border:1px dashed var(--color-border);border-radius:var(--radius-lg)">現在参加しているグループはありません。下から作成するか参加してください。</div>':Qe.map(d=>{var m;return`
      <div class="settings-card" style="border-color:var(--color-border);margin-bottom:var(--space-sm);padding:var(--space-md) var(--space-lg)">
        <div class="settings-row">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="avatar" style="background:var(--color-bg-elevated);width:32px;height:32px;font-size:0.9rem; overflow:hidden;">
              ${d.icon_url?d.icon_url.startsWith("http")?`<img src="${d.icon_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='G'"/>`:d.icon_url:u._s('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>')}
            </div>
          <div>
            <h4 style="margin:0;font-size:1.1rem;font-weight:600">${d.name}</h4>
            <div style="font-size:0.85rem;color:var(--color-text-secondary)">招待コード: <span style="font-weight:700;letter-spacing:1px;color:var(--color-text-primary)">${d.invite_code}</span></div>
          </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${d.created_by===(((m=E==null?void 0:E.user)==null?void 0:m.id)||L.id)?`<button class="btn btn-secondary btn-sm edit-group-btn" data-id="${d.id}" data-name="${d.name}" data-icon="${d.icon_url||""}">編集</button>`:""}
            ${d.role==="admin"?'<span class="badge badge-teal" style="font-weight:700">管理者</span>':`<button class="btn btn-secondary btn-sm btn-leave-group" data-id="${d.id}" style="color:var(--color-accent-pink);border-color:rgba(241,148,138,0.3)">退出</button>`}
          </div>
        </div>
      </div>
    `}).join("");e.innerHTML=`
  <div class="page-header">
    <h1 class="page-title">設定</h1>
    <p class="page-subtitle">プロフィールとグループの管理</p>
  </div>
  <div class="settings-layout">

    <!-- Profile Hero Card -->
    <div class="settings-card animate-slide-up">
      <div class="settings-profile-header">
        <div class="avatar avatar-xl" id="settings-avatar" style="background:${L.avatar_url?"var(--color-bg-elevated)":t}">
          ${L.avatar_url?`<img src="${L.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.parentElement.innerHTML='${o}'"/>`:o}
        </div>
        <div class="settings-profile-info">
          <h2 id="display-name">${L.name}</h2>
          <p id="display-role">${L.university} 医学部${L.grade}年</p>
          <p style="color:var(--color-text-tertiary);font-size:.75rem" id="display-email">${L.email}</p>
        </div>
      </div>
    </div>

    <!-- Profile Edit -->
    <div class="settings-card animate-slide-up" style="animation-delay:.08s">
      <h3 class="settings-section-title">👤 プロフィール設定</h3>
      <div class="settings-form">
        <div class="settings-field">
          <label>アイコン（画像URL）</label>
          <input type="text" id="input-avatar" value="${L.avatar_url||""}" placeholder="https://..."/>
          <div style="margin-top:8px">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('input-avatar-file').click()" style="width:100%">📷 画像を選択・アップロード</button>
            <input type="file" id="input-avatar-file" accept="image/*" style="display:none" />
          </div>
        </div>
        <div class="settings-field"><label>表示名</label><input type="text" id="input-name" value="${L.name}" placeholder="例: 田中 太郎"/></div>
        <div class="settings-field">
          <label>ログインID (変更不可)</label>
          <div style="padding:10px; background:var(--color-bg-elevated); border-radius:var(--radius-sm); font-family:monospace; font-weight:700; color:var(--color-accent-teal); display:flex; justify-content:space-between; align-items:center;">
            <span>${L.login_id||"---"}</span>
            <span style="font-size:0.7rem; color:var(--color-text-tertiary); font-weight:normal;">※次回ログイン用</span>
          </div>
        </div>
        <div class="settings-field"><label>メールアドレス</label><input type="email" id="input-email" value="${L.email}" placeholder="ログイン共通" disabled style="opacity:0.6"/></div>
        <div class="settings-field"><label>大学・所属名</label><input type="text" id="input-univ" value="${L.university}" placeholder="例: 東京大学医学部"/></div>
        <div class="settings-field"><label>学年</label>
          <select id="input-grade">${[1,2,3,4,5,6].map(d=>`<option value="${d}" ${d===L.grade?"selected":""}>${d}年</option>`).join("")}</select>
        </div>
        <div class="settings-field"><label>${u.flame} 曜日別 学習目標 (分)</label>
          <div class="weekly-goal-grid" id="weekly-goal-grid">
            ${["日","月","火","水","木","金","土"].map((d,m)=>{const y=wa();return`<div class="weekly-goal-day">
                <label>${d}</label>
                <input type="number" min="0" max="1440" value="${y[m]}" data-day="${m}" class="weekly-goal-input"/>
              </div>`}).join("")}
          </div>
        </div>
        <div class="settings-row">
          <button class="btn btn-primary" id="save-profile-btn" style="width:100%;justify-content:center">💾 プロフィールを保存</button>
        </div>
      </div>
    </div>

    <!-- Group Manage -->
    <div class="settings-card animate-slide-up" style="animation-delay:.16s">
      <h3 class="settings-section-title">${u.users}所属グループ管理</h3>
      <div style="margin-bottom:var(--space-lg)">${a}</div>
      <div style="display:flex; flex-direction:column; gap:var(--space-xl); border-top:1px solid var(--color-border); padding-top:var(--space-lg)">
        <div>
          <label style="font-size:var(--font-size-xs);font-weight:600;color:var(--color-text-secondary);display:block;margin-bottom:12px">➕ 新しいグループを作成</label>
          <div style="display:flex;flex-direction:column;gap:12px;background:var(--color-bg-elevated);padding:var(--space-md);border-radius:var(--radius-md)">
            <div style="display:grid;grid-template-columns:50px 1fr;gap:16px;align-items:center">
              <div id="new-group-icon-preview" class="avatar" style="background:var(--color-bg-input);width:50px;height:50px;font-size:1.5rem;display:flex;align-items:center;justify-content:center;overflow:hidden;">G</div>
              <div>
                <input type="hidden" id="new-group-icon" value="" />
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('new-group-icon-file').click()" style="width:100%;font-size:0.75rem">📷 画像を選択・アップロード</button>
                <input type="file" id="new-group-icon-file" accept="image/*" style="display:none" />
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <input type="text" id="new-group-name" placeholder="グループ名..." style="flex:1;font-size:0.9rem" />
              <button class="btn btn-primary btn-sm" id="btn-create-group" style="padding:0 20px">作成</button>
            </div>
          </div>
        </div>
        <div>
          <label style="font-size:var(--font-size-xs);font-weight:600;color:var(--color-text-secondary);display:block;margin-bottom:12px">🤝 既存のグループに参加</label>
          <div style="display:flex;gap:12px;background:var(--color-bg-elevated);padding:var(--space-md);border-radius:var(--radius-md);align-items:center">
            <input type="text" id="join-group-code" placeholder="招待コード (6文字)" style="flex:1;text-transform:uppercase;font-size:0.9rem;background:var(--color-bg-input)" />
            <button class="btn btn-secondary btn-sm" id="btn-join-group" style="padding:0 20px">参加</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Privacy Settings -->
    <div class="settings-card animate-slide-up" style="animation-delay:.20s">
      <h3 class="settings-section-title">${u.shield}プライバシー設定</h3>
      <div class="settings-row" style="padding:0">
        <div style="flex:1">
          <div style="font-size:var(--font-size-base);font-weight:500;margin-bottom:var(--space-xs)">プロフィールを公開する</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">オンにすると、他のユーザーがランキングなどで進捗を確認できます</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="input-public" ${L.is_public!==!1?"checked":""}>
          <span class="slider round"></span>
        </label>
      </div>
    </div>

    <!-- Appearance -->
    <div class="settings-card animate-slide-up" style="animation-delay:.24s">
      <h3 class="settings-section-title">🎨 外観設定</h3>
      <div class="settings-row" style="padding:0">
        <div>
          <div style="font-size:var(--font-size-base);font-weight:500;margin-bottom:var(--space-xs)">${nt?"ダークモード":"ライトモード"}</div>
        </div>
        <button class="theme-toggle" id="theme-btn-settings"></button>
      </div>
    </div>

    <!-- Edit Group Modal -->
    <div id="group-edit-modal" class="modal-overlay" style="display:none">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header"><h3 class="modal-title">グループ情報を編集</h3><button class="modal-close" id="btn-close-edit-modal">✕</button></div>
        <div class="modal-body">
          <div class="settings-field">
            <label>グループ名</label>
            <input type="text" id="edit-group-name" placeholder="グループ名を入力..." />
          </div>
          <div class="settings-field">
            <label>アイコン</label>
            <div style="display:grid;grid-template-columns:60px 1fr;gap:16px;align-items:center;margin-top:8px">
              <div id="edit-group-icon-preview" class="avatar avatar-lg" style="background:var(--color-bg-elevated);overflow:hidden">G</div>
              <div>
                <button class="btn btn-secondary btn-sm" id="btn-trigger-edit-file" style="width:100%">📷 画像を変更</button>
                <input type="file" id="edit-group-icon-file" accept="image/*" style="display:none" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="flex-direction:column;gap:8px">
          <button class="btn btn-primary" id="btn-save-group-edit" style="width:100%;justify-content:center">💾 変更を保存</button>
          <button class="btn btn-secondary" id="btn-cancel-group-edit" style="width:100%;justify-content:center">キャンセル</button>
        </div>
      </div>
    </div>
    
    <!-- Feedback / Suggestion Box -->
    <div class="settings-card animate-slide-up" style="animation-delay:.30s">
      <h3 class="settings-section-title">📮 製作者への意見箱</h3>
      <p style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:var(--space-md)">
        不具合の報告や、追加してほしい機能など、開発者へ直接メッセージを送れます。
      </p>
      <div class="settings-form">
        <div class="settings-field">
          <label>カテゴリ</label>
          <select id="feedback-category">
            <option value="機能要望">機能要望</option>
            <option value="バグ報告">🐛 バグ報告</option>
            <option value="その他">💬 その他</option>
          </select>
        </div>
        <div class="settings-field"><label>件名</label><input type="text" id="feedback-title" placeholder="（例）タイマーの音を消したい"/></div>
        <div class="settings-field"><label>内容</label><textarea id="feedback-body" placeholder="具体的な内容を教えてください..." style="min-height:100px;width:100%;background:var(--color-bg-input);color:var(--color-text-primary);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px"></textarea></div>
        <div class="settings-row" style="margin-bottom:var(--space-md)">
          <label class="anonymous-toggle" style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer"><input type="checkbox" id="feedback-anonymous"/> 匿名で送信する</label>
        </div>
        <button class="btn btn-primary" id="btn-submit-feedback" style="width:100%;justify-content:center">🚀 フィードバックを送信</button>
      </div>
    </div>
    
    <div style="text-align:center;padding:40px 0;"><button id="btn-logout" class="btn btn-secondary" style="border-color:rgba(241,148,138,0.4);color:var(--color-accent-pink)">ログアウト</button></div>
  </div>`,document.getElementById("input-name").addEventListener("input",d=>{if(document.getElementById("display-name").textContent=d.target.value||"（名前未設定）",!document.getElementById("input-avatar").value){const m=dt(d.target.value||"?");document.getElementById("settings-avatar").textContent=m}});const s=d=>{const m=document.getElementById("settings-avatar");if(!d||!d.startsWith("http")){m.textContent=dt(document.getElementById("input-name").value||"?"),m.style.background=ht(L.id);return}m.innerHTML=`<img src="${d}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='?'"/>`,m.style.display="flex",m.style.alignItems="center",m.style.justifyContent="center",m.style.overflow="hidden"};document.getElementById("input-avatar").addEventListener("input",d=>s(d.target.value)),document.getElementById("input-avatar-file").addEventListener("change",async d=>{const m=d.target.files[0];if(!m)return;const y=d.target.previousElementSibling,h=y.textContent;y.textContent="アップロード中...",y.disabled=!0;const P=await Ta(m);y.textContent=h,y.disabled=!1,P&&(document.getElementById("input-avatar").value=P,s(P),k(" 画像をアップロードしました"))});const n=()=>{const d=document.getElementById("input-univ").value||"大学未設定",m=document.getElementById("input-grade").value||"?";document.getElementById("display-role").textContent=`${d} 医学部${m}年`};document.getElementById("input-univ").addEventListener("input",n),document.getElementById("input-grade").addEventListener("change",n),document.getElementById("input-email").addEventListener("input",d=>{document.getElementById("display-email").textContent=d.target.value}),document.getElementById("save-profile-btn").addEventListener("click",async d=>{const m=document.getElementById("input-name").value.trim(),y=document.getElementById("input-avatar").value.trim(),h=document.getElementById("input-univ").value.trim(),P=parseInt(document.getElementById("input-grade").value),H=document.getElementById("input-public").checked,N=wa();if(document.querySelectorAll(".weekly-goal-input").forEach(Q=>{const ge=parseInt(Q.dataset.day),ie=parseInt(Q.value);!isNaN(ge)&&!isNaN(ie)&&ie>=0&&(N[ge]=ie)}),Go(N),!m){document.getElementById("input-name").focus(),k(" 名前を入力してください");return}if(d.target.textContent="保存中...",$&&E){const{error:Q}=await $.from("profiles").upsert({id:E.user.id,full_name:m,avatar_url:y,university:h,grade:P,is_public:H,daily_goal:N[new Date().getDay()],weekly_goals:JSON.stringify(N),login_id:L.login_id});if(Q){k(u.x+" 保存に失敗しました: "+Q.message),d.target.textContent="💾 プロフィールを保存";return}}L.name=m,L.avatar_url=y,L.university=h||"未設定",L.grade=P,L.is_public=H,L.daily_goal=N[new Date().getDay()],at(),k(" プロフィールを保存しました！"),d.target.textContent="💾 プロフィールを保存",qt()});const l=d=>{const m=document.getElementById("new-group-icon-preview");if(m){if(!d||!d.startsWith("http")){m.innerHTML="G";return}m.innerHTML=`<img src="${d}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='?'"/>`}};(_=document.getElementById("new-group-icon"))==null||_.addEventListener("input",d=>l(d.target.value)),document.getElementById("new-group-icon-file").addEventListener("change",async d=>{const m=d.target.files[0];if(!m)return;const y=d.target.previousElementSibling,h=y.textContent;y.textContent="処理中...",y.disabled=!0;const P=await Ta(m);y.textContent=h,y.disabled=!1,P&&(document.getElementById("new-group-icon").value=P,l(P),k(" 画像を準備しました"))});const p=document.getElementById("group-edit-modal");let c=null,b="";document.querySelectorAll(".edit-group-btn").forEach(d=>{d.addEventListener("click",()=>{c=d.dataset.id,document.getElementById("edit-group-name").value=d.dataset.name,b=d.dataset.icon;const m=document.getElementById("edit-group-icon-preview");b&&b.startsWith("http")?m.innerHTML=`<img src="${b}" style="width:100%;height:100%;object-fit:cover;" />`:m.innerHTML="G",p.style.display="flex"})}),document.getElementById("btn-close-edit-modal").onclick=()=>p.style.display="none",document.getElementById("btn-cancel-group-edit").onclick=()=>p.style.display="none",document.getElementById("btn-trigger-edit-file").onclick=()=>document.getElementById("edit-group-icon-file").click(),document.getElementById("edit-group-icon-file").onchange=async d=>{const m=d.target.files[0];if(!m)return;document.getElementById("edit-group-icon-preview").innerHTML='<div class="loading-spinner" style="width:20px;height:20px"></div>';const y=await Ta(m,"avatars");y&&(b=y,document.getElementById("edit-group-icon-preview").innerHTML=`<img src="${y}" style="width:100%;height:100%;object-fit:cover;" />`)},document.getElementById("btn-save-group-edit").addEventListener("click",async()=>{const d=document.getElementById("edit-group-name").value.trim();d&&(await Zo(c,d,b),p.style.display="none")}),(f=document.getElementById("btn-create-group"))==null||f.addEventListener("click",async d=>{const m=document.getElementById("new-group-name").value.trim(),y=document.getElementById("new-group-icon").value.trim();if(!m){k(" グループ名を入力してください");return}const h=d.target,P=h.textContent;h.textContent="作成中...",h.disabled=!0;try{await Xo(m,y)}finally{h.textContent=P,h.disabled=!1}}),(w=document.getElementById("btn-join-group"))==null||w.addEventListener("click",async d=>{const m=document.getElementById("join-group-code").value.trim();if(m.length<4){k(" 正しい招待コードを入力してください");return}const y=d.target,h=y.textContent;y.textContent="参加中...",y.disabled=!0;try{await es(m)}finally{y.textContent=h,y.disabled=!1}}),document.querySelectorAll(".btn-leave-group").forEach(d=>{d.addEventListener("click",async m=>{if(confirm("本当にこのグループから退出しますか？")){const y=m.target,h=y.textContent;y.textContent="処理中...",y.disabled=!0;try{await ts(y.dataset.id)}finally{y.textContent=h,y.disabled=!1}}})}),(v=document.getElementById("btn-logout"))==null||v.addEventListener("click",async()=>{confirm("ログアウトしますか？")&&($?await $.auth.signOut():(E=null,Wt("/")))}),(S=document.getElementById("theme-btn-settings"))==null||S.addEventListener("click",()=>{Bo(),Vt()}),(D=document.getElementById("btn-submit-feedback"))==null||D.addEventListener("click",async d=>{const m=document.getElementById("feedback-title"),y=document.getElementById("feedback-body"),h=document.getElementById("feedback-category"),P=document.getElementById("feedback-anonymous"),H=m.value.trim(),N=y.value.trim(),Q=h.value,ge=P.checked;if(!N){k(" 内容を入力してください");return}const ie=d.target;ie.disabled=!0;const fe=ie.textContent;ie.textContent="送信中...",await us(H||"無題",N,Q,ge)&&(m.value="",y.value=""),ie.disabled=!1,ie.textContent=fe})}console.log("DEBUG: Registering routes and starting app");function $t(){const e=document.getElementById("app");document.getElementById("sidebar")||(e.innerHTML=`
      <aside id="sidebar"></aside>
      <main id="main-content">
        <div id="page-container"></div>
      </main>
    `)}wt("/",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),qt()});wt("/study",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),be()});wt("/insights",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),Ze()});wt("/qb",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),xa()});wt("/community",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),ft()});wt("/countdown",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),ws()});wt("/ranking",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),xs()});wt("/settings",()=>{if(!E){xt();return}$t(),document.body.classList.remove("hide-sidebar"),bt(),at(),Vt()});async function pt(){if(console.log("DEBUG: initApp started"),Ua(),$){jo();try{await ha();const{data:e,error:t}=await $.auth.getSession();if(!t&&e&&(E=e.session),E){const o=await go(E.user.id).catch(a=>(console.error("DEBUG: Profile fetch failed:",a),null));o&&(L.id=o.id,L.name=o.full_name||"名前未設定",L.university=o.university||"未設定",L.grade=o.grade||1,L.avatar_url=o.avatar_url||"",L.daily_goal=o.daily_goal||60,L.login_id=o.login_id||""),await Rt().catch(a=>console.warn("DEBUG: Group fetch failed:",a))}$.auth.onAuthStateChange(async(o,a)=>{if(console.log("DEBUG: Auth state changed:",o),E=a,E){const s=await go(E.user.id).catch(()=>null);if(s){if(L.id=s.id,L.name=s.full_name||"名前未設定",L.university=s.university||"未設定",L.grade=s.grade||1,L.avatar_url=s.avatar_url||"",L.daily_goal=s.daily_goal||60,L.login_id=s.login_id||"",s.weekly_goals)try{const n=JSON.parse(s.weekly_goals);Array.isArray(n)&&n.length===7&&localStorage.setItem("medfocus_weekly_goals",JSON.stringify(n))}catch{}if(s.daily_overrides)try{const n=JSON.parse(s.daily_overrides);typeof n=="object"&&(localStorage.setItem("medfocus_daily_overrides_map",JSON.stringify(n)),Object.entries(n).forEach(([l,p])=>{localStorage.setItem("medfocus_daily_override_"+l,p.toString())}))}catch{}}await Rt().catch(()=>{})}Wt(et)})}catch(e){console.error("DEBUG: Auth/Supabase init error:",e)}}window.removeEventListener("popstate",Do),window.addEventListener("popstate",Do),document.removeEventListener("click",So),document.addEventListener("click",So),console.log("DEBUG: App initial route render:",window.location.pathname),Wt(window.location.pathname)}function Do(){Wt(window.location.pathname)}function So(e){const t=e.target.closest("[data-route]");t&&(e.preventDefault(),hs(t.dataset.route))}window.onerror=function(e,t,o){console.error("CRITICAL ERROR: "+e+" at "+o);const a=document.getElementById("app");a&&a.innerHTML.trim()===""&&(a.innerHTML=`<div style="padding: 40px; text-align: center; color: white;">
      <h2>⚠️ アプリの起動中にエラーが発生しました</h2>
      <p style="opacity: 0.7;">${e}</p>
      <button onclick="localStorage.clear(); location.reload();" style="margin-top: 20px; padding: 10px 20px; background: #4ECDC4; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">再読み込み・キャッシュクリア</button>
    </div>`)};pt();console.log("DEBUG: app.js finished executing");
