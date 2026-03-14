
// ══════════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://mxduoksramvwosgmwkzq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVva3NyYW12d29zZ213a3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTczMzksImV4cCI6MjA4ODEzMzMzOX0.dtyacnrX4tAuGoiNEv36bsVcfxhrdkdu92UFT6MMDYc';

const SB = {
  async query(table, method='GET', body=null, params='') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
    const opts = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method==='POST' ? 'return=representation' : (method==='PATCH'||method==='DELETE' ? 'return=representation' : '')
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) { const e=await r.text(); console.error('SB error:',e); throw new Error(e); }
    if (method==='DELETE') return true;
    const txt = await r.text();
    return txt ? JSON.parse(txt) : [];
  },
  get:    (t,p='') => SB.query(t,'GET',null,p),
  post:   (t,b)    => SB.query(t,'POST',b),
  patch:  (t,p,b)  => SB.query(t,'PATCH',b,p),
  delete: (t,p)    => SB.query(t,'DELETE',null,p),
  upsert: async (t,b) => {
    const url = `${SUPABASE_URL}/rest/v1/${t}`;
    const r = await fetch(url, {method:'POST', headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'}, body:JSON.stringify(b)});
    return r.ok;
  },
};


function safeLSGetJSON(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; }
}
function safeLSSetJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}
function notesCacheKey(){ return 'nh_notes_cache_' + String(activeHotelId || 'all'); }
function incidentsCacheKey(){ return 'nh_incidents_cache_' + String(activeHotelId || 'all'); }
function alarmsCacheKey(){ return 'nh_alarms_cache_' + String(activeHotelId || 'all'); }
function usersCacheKey(){ return 'nh_users_cache_' + String(activeHotelId || 'all'); }
function templatesCacheKey(){ return 'nh_templates_cache_' + String(activeHotelId || 'all'); }
function cacheNotesToLocal(){ safeLSSetJSON(notesCacheKey(), NOTES || {}); }
function loadNotesFromLocal(){ NOTES = safeLSGetJSON(notesCacheKey(), NOTES || {}) || {}; }
function cacheHotelDataToLocal(){
  safeLSSetJSON(usersCacheKey(), USERS || []);
  safeLSSetJSON(templatesCacheKey(), TEMPLATES || []);
  safeLSSetJSON(incidentsCacheKey(), INCIDENTS || []);
  safeLSSetJSON(alarmsCacheKey(), ALARMS || []);
}
function loadHotelDataFromLocal(){
  USERS = safeLSGetJSON(usersCacheKey(), USERS || []) || [];
  TEMPLATES = safeLSGetJSON(templatesCacheKey(), TEMPLATES || []) || [];
  INCIDENTS = safeLSGetJSON(incidentsCacheKey(), INCIDENTS || []) || [];
  ALARMS = safeLSGetJSON(alarmsCacheKey(), ALARMS || []) || [];
}
async function sbGetFlexible(table, hotelId, orderClause){
  const suffix = orderClause || '';
  try{
    const rows = await SB.get(table, `?hotel_id=eq.${hotelId}${suffix ? '&' + suffix : ''}`);
    if(rows && rows.length) return rows;
  }catch(e){}
  try{
    const rows = await SB.get(table, `${suffix ? '?' + suffix : ''}`);
    if(!Array.isArray(rows)) return [];
    return rows.filter(r => (typeof r.hotel_id === 'undefined' || r.hotel_id === null || String(r.hotel_id) === String(hotelId)));
  }catch(e){ return []; }
}

// ══════════════════════════════════════════════════════════════
// DATA (in-memory cache, loaded from Supabase on init)
// ══════════════════════════════════════════════════════════════
const DEPTS = ['Recepción','Housekeeping','Mantenimiento','F&B','Administración'];
const D_ICONS = {Recepción:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',Housekeeping:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 012 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>',Mantenimiento:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>','F&B':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',Administración:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',Dirección:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'};
const D_COLORS = {Recepción:'#2e4a1e',Housekeeping:'#4a2e6e',Mantenimiento:'#2e3a5c','F&B':'#6e3a1e',Administración:'#3a3a2e',Dirección:'#8a6d2e'};

let USERS = [
  {id:1, name:'Christian', email:'christian@noctishotel.es', pwd:'NoctisAsturias1982!', dept:'Dirección', role:'SUPER_ADMIN', active:true}
]; // resto se carga desde Supabase
let TEMPLATES = [];
let CHK = {};       // key: "tplId-YYYY-MM-DD-itemIdx" → {user, time, dbId}
let ARCHIVE = {};
let INCIDENTS = [];
let ALARMS = [];
let HOTELS = [];
let NOTIFICATIONS = [];
let cu = null;
let firedAlarms = new Set();
let alarmCheckerInterval = null;
let incFilter = 'all';
let incDeptFilter = 'all';
let teamDeptFilter = 'all';
let adminTabActive = 'users';
let IDS = {user:14,inc:6,alarm:4,tpl:9,hotel:2,notif:1};

// ══════════════════════════════════════════════════════════════
// INIT — Load all data from Supabase
// ══════════════════════════════════════════════════════════════
async function loadAllData() {
  try {
    // 1. Cargar lista de hoteles
    const hotels = await SB.get('nh_hotels', '?order=id');
    if(hotels && hotels.length > 0){
      HOTELS = hotels;
      IDS.hotel = Math.max(...hotels.map(h=>h.id)) + 1;
      // Si aún no hay hotel activo, usar el primero activo
      if(!activeHotelId){
        const first = hotels.find(h=>h.active) || hotels[0];
        if(first){ activeHotelId = first.id; activeHotelName = first.name; }
      } else {
        const cur = hotels.find(h=>h.id===activeHotelId);
        if(cur) activeHotelName = cur.name;
      }
    }

    // 2. Cargar datos del hotel activo
    await loadHotelData();

    setTimeout(syncAlarmsToSW, 1000);
  } catch(e) {
    console.warn('Supabase no disponible, usando datos locales:', e.message);
  }
}

function showLoading(on) { /* disabled */ }
function showDbError() { /* disabled */ }


// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
async function doLogin(userObj){
  var u = userObj;
  if (!u) {
    var email = document.getElementById('l-email').value.trim().toLowerCase();
    var pwd   = document.getElementById('l-pwd').value.trim();

    // Fallback hardcoded super admin — always works even if Supabase fails
    if(email==='christian@noctishotel.es' && pwd==='NoctisAsturias1982!'){
      u = {id:1,name:'Christian',email:'christian@noctishotel.es',pwd:'NoctisAsturias1982!',dept:'Dirección',role:'SUPER_ADMIN',active:true};
    }

    if(!u){
      u = USERS.find(function(x){ return x.email.toLowerCase()===email && (x.pwd||'').trim()===pwd && x.active; });
    }

    if (!u) {
      // Try searching across ALL hotels — same person can work in multiple hotels
      try {
        const allUsers = await SB.get('nh_users', `?email=eq.${encodeURIComponent(email)}&active=eq.true`);
        if(allUsers && allUsers.length > 0){
          // First try: match pwd in current hotel
          const matchCurrent = allUsers.find(x => x.hotel_id===activeHotelId && (x.pwd||'').trim()===pwd);
          // Second try: match pwd in any hotel
          const matchAny = allUsers.find(x => (x.pwd||'').trim()===pwd);
          const match = matchCurrent || matchAny;
          if(match){
            u = {...match};
            // Switch to matched user's hotel automatically
            if(match.hotel_id && match.hotel_id !== activeHotelId){
              activeHotelId = match.hotel_id;
              const hData = await SB.get('nh_hotels', `?id=eq.${match.hotel_id}`);
              if(hData && hData[0]) activeHotelName = hData[0].name;
            }
          } else if(allUsers.some(x => x.email.toLowerCase()===email)){
            alert('Contraseña incorrecta para este usuario');
            return;
          }
        }
      } catch(searchErr){ /* ignore, fall through */ }
    }
    if (!u) {
      const emailExists = USERS.find(function(x){ return x.email && x.email.toLowerCase()===email; });
      if(emailExists && !emailExists.pwd) {
        alert('Este usuario no tiene contraseña configurada. Contacta al administrador.');
      } else if(USERS.length===0){
        alert('Error de conexión con la base de datos. Comprueba tu conexión a internet e inténtalo de nuevo.');
      } else {
        alert('Email o contraseña incorrectos');
      }
      return;
    }
  }
  cu = u;
  const rememberMe = document.getElementById('remember-me')?.checked !== false;
  try { if(rememberMe) localStorage.setItem('noctis_session', JSON.stringify({email:u.email, pwd:u.pwd})); } catch(e) {}
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').style.visibility = 'hidden';
  document.getElementById('app').style.opacity = '0';
  document.body.classList.add('app-loading');
  document.body.classList.remove('app-ready');
  const emergencyReadyTimer = setTimeout(()=>{ revealAppNow(); }, 1200);
  try{
    Promise.resolve().then(()=>initApp()).catch(function(err){
      console.error('initApp error', err);
      alert('La app ha entrado, pero hubo un error al cargar algunos datos: ' + (err?.message || String(err)));
    }).finally(function(){
      clearTimeout(emergencyReadyTimer);
      revealAppNow();
    });
  } catch(err) {
    clearTimeout(emergencyReadyTimer);
    revealAppNow();
    console.error('login init wrapper', err);
  }
}

function doLogout(){
  if(alarmCheckerInterval){ clearInterval(alarmCheckerInterval); alarmCheckerInterval=null; }
  if(_swHeartbeat){ clearInterval(_swHeartbeat); _swHeartbeat=null; }
  swPost({ type: 'SYNC_ALARMS', alarms: [] });
  stopRealtime();
  stopConfigRefresh();
  cu = null;
  try { localStorage.removeItem('noctis_session'); } catch(e) {}
  document.getElementById('app').style.display = 'none';
  document.getElementById('app').style.visibility = 'hidden';
  document.getElementById('app').style.opacity = '0';
  document.getElementById('login-screen').style.display = 'flex';
  document.body.classList.remove('app-loading');
  document.body.classList.add('app-ready');
}

// ── STARTUP ──────────────────────────────────────────────────
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    const fs = document.getElementById('note-fullscreen-overlay');
    if(fs && fs.classList.contains('open')){ closeNoteFullscreen(); }
  }
  // Ctrl+S / Cmd+S to save in fullscreen
  if((e.ctrlKey||e.metaKey) && e.key==='s'){
    const fs = document.getElementById('note-fullscreen-overlay');
    if(fs && fs.classList.contains('open')){ e.preventDefault(); saveNoteFullscreen(); }
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  // Try to load from Supabase in background (login works regardless)
  try { await loadAllData(); } catch(e) {}

  // Try auto-login from localStorage
  try {
    const saved = localStorage.getItem('noctis_session');
    if (saved) {
      const {email, pwd} = JSON.parse(saved);
      // Check hardcoded superadmin first
      if(email==='christian@noctishotel.es' && pwd==='NoctisAsturias1982!'){
        const u = {id:1,name:'Christian',email:'christian@noctishotel.es',pwd:'NoctisAsturias1982!',dept:'Dirección',role:'SUPER_ADMIN',active:true};
        doLogin(u); return;
      }
      const u = USERS.find(x => x.email.toLowerCase()===email.toLowerCase() && x.pwd===pwd && x.active);
      if (u) { doLogin(u); return; }
      else localStorage.removeItem('noctis_session');
    }
  } catch(e) {}
  // Login screen already visible by default - nothing to do
});

function revealAppNow(){
  const app=document.getElementById('app');
  if(app){ app.style.visibility='visible'; app.style.opacity='1'; }
  document.body.classList.remove('app-loading');
  document.body.classList.add('app-ready');
}

async function initApp(){
  const isS = cu.role==='SUPER_ADMIN';
  const isA = cu.role==='ADMIN';
  const isE = cu.role==='EMPLOYEE';
  document.getElementById('top-name').textContent = cu.name;
  document.getElementById('top-role').textContent = roleLabel(cu.role);
  document.getElementById('top-avatar').textContent = cu.name[0];
  // Update hotel indicator in topbar
  const topHotel = document.getElementById('top-hotel');
  if(topHotel){
    const hName = activeHotelName || (HOTELS.find(h=>h.id===activeHotelId)||{}).name || '';
    topHotel.textContent = hName ? hName : '';
    topHotel.style.display = hName ? '' : 'none';
  }

  const navNotes = document.getElementById('nav-notes');
  if(navNotes) navNotes.style.display = 'none';
  // SuperAdmin only items
  ['nsec-admin','nav-admin','nav-hotels','nav-archive'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isS ? '' : 'none';
  });
  // Admin + SuperAdmin items
  ['nav-reports','nav-team'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (isS||isA) ? '' : 'none';
  });

  populateSelects();
  buildNotifications();
  // Show/hide menu button based on screen size
  const mb=document.getElementById('menu-btn');
  if(mb) mb.style.display=window.innerWidth<=768?'block':'none';
  // Populate sidebar user info
  const sName=document.getElementById('sidebar-user-name');
  const sRole=document.getElementById('sidebar-user-role');
  if(sName) sName.textContent=cu.name||cu.email||'Usuario';
  if(sRole) sRole.textContent={SUPER_ADMIN:'Super Admin',ADMIN:'Admin Dpto.',EMPLEADO:'Empleado'}[cu.role]||cu.role;
  // Show WhatsApp summary button for admin+
  const wabtn = document.getElementById('btn-whatsapp-summary');
  if(wabtn) wabtn.style.display = (isS||isA) ? '' : 'none';
  // Cargar configuración antes de pintar el dashboard para evitar el cambio visual feo al entrar
  try{ await applyConfigFromDB(); }catch(e){ console.warn('applyConfigFromDB',e); }
  navTo('dashboard');
  try{ renderDashboard(); }catch(e){}
  revealAppNow();
  startAlarmChecker();
  startConfigRefresh();
  startRealtime();
  requestNotifPermission();
  registerServiceWorker();
}

async function applyConfigFromDB(){
  try {
    // Try with hotel_id filter first; fall back to no filter if column doesn't exist
    let allCfg;
    try {
      allCfg = await SB.get('nh_config', `?hotel_id=eq.${activeHotelId}&order=id.desc`);
    } catch(e) {
      allCfg = await SB.get('nh_config', `?order=id.desc`);
    }
    if(!allCfg||!allCfg.length) return;
    // Deduplicate: keep only the FIRST (most recent) row per key
    const seen = new Set();
    const cfg = allCfg.filter(row => { if(seen.has(row.key)) return false; seen.add(row.key); return true; });
    const colorMap={color_forest:'forest',color_topbar:'topbar',color_gold:'gold',color_red:'red',color_cream:'cream','color_forest-light':'forest-light',color_amber:'amber',color_blue:'blue',color_forest2:'forest2',color_border:'border'};
    cfg.forEach(row => {
      if(row.key==='font_family'){ applyFont(row.value); const el=document.getElementById('cfg-font');if(el)el.value=row.value; }
      if(row.key==='font_size'){ applyFontSize(row.value); const el=document.getElementById('cfg-fontsize');if(el){el.value=row.value;} const ev=document.getElementById('cfg-fontsize-val');if(ev)ev.textContent=row.value+'px'; }
      if(colorMap[row.key]) {
        applyColor(colorMap[row.key], row.value);
        const el=document.getElementById('cfg-'+colorMap[row.key]);
        if(el) el.value=row.value;
      }
      if(row.key==='hotel_name'&&row.value){ const el=document.getElementById('cfg-hotel');if(el)el.value=row.value; }
      if(row.key==='kpi_colors'&&row.value){
        try{ applyAllKpiColors(JSON.parse(row.value)); }catch(e){}
      }
      if(row.key==='logo_color1'&&row.value){
        const el=document.getElementById('cfg-logo1');if(el)el.value=row.value;
        const el2=document.getElementById('logo-noctis');if(el2)el2.style.color=row.value;
        const val=document.getElementById('cfg-logo1-val');if(val)val.textContent=row.value;
      }
      if(row.key==='logo_color2'&&row.value){
        const el=document.getElementById('cfg-logo2');if(el)el.value=row.value;
        const el2=document.getElementById('logo-hub');if(el2)el2.style.color=row.value;
        const val=document.getElementById('cfg-logo2-val');if(val)val.textContent=row.value;
      }
      if(row.key==='app_name'&&row.value){
        const el=document.getElementById('cfg-appname');if(el)el.value=row.value;
        const topEl=document.querySelector('.topbar-logo');
        if(topEl&&row.value) topEl.innerHTML=row.value.replace(' ','<br>').replace(' ','<br>');
      }
    });
  } catch(e){ console.warn('applyConfigFromDB error:',e.message); }
}

function buildNotifications(){
  const isS=cu.role==='SUPER_ADMIN';
  // Keep existing read states by alarmId/incId
  const readAlarms=new Set(NOTIFICATIONS.filter(n=>n.read&&n.alarmId).map(n=>n.alarmId));
  const readIncs=new Set(NOTIFICATIONS.filter(n=>n.read&&n.incId).map(n=>n.incId));
  NOTIFICATIONS=[];
  IDS.notif=1;
  // Alarms: super sees all, others see their dept or own
  const myAlarms=isS ? ALARMS : ALARMS.filter(a=>a.dept===cu.dept||a.created_by===cu.id);
  myAlarms.filter(a=>!a.done).forEach(a=>{
    NOTIFICATIONS.push({id:IDS.notif++,type:'alarm',title:a.title,sub:a.note||(a.alarm_time?a.alarm_time.replace('T',' '):''),color:'#d4830a',read:readAlarms.has(a.id),alarmId:a.id});
  });
  // Critical incidents: super sees all, others see their dept only
  const myCrit=isS ? INCIDENTS : INCIDENTS.filter(i=>i.dept===cu.dept);
  myCrit.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').forEach(i=>{
    NOTIFICATIONS.push({id:IDS.notif++,type:'incident',title:'CRÍTICA: '+i.title,sub:i.dept+' · '+i.at,color:'#8b1a1a',read:readIncs.has(i.id),incId:i.id});
  });
}

function populateSelects(){
  const allDepts=['Dirección',...DEPTS];
  const isS=cu.role==='SUPER_ADMIN';
  const isA=cu.role==='ADMIN';
  const myDepts=isS?allDepts:[cu.dept];
  const userDepts=isS?allDepts:(isA?[cu.dept]:allDepts);
  const tplDepts=isS?DEPTS:(isA?[cu.dept]:DEPTS);

  [['inc-f-dept',myDepts],['uf-dept',userDepts],['tf-dept',tplDepts],
   ['chk-dept-sel',['Todos',...DEPTS]],['arc-dept-sel',['Todos',...DEPTS]]
  ].forEach(([id,list])=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.innerHTML='';
    list.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;el.appendChild(o);});
  });
}

function updateBadges(){
  const isS=cu.role==='SUPER_ADMIN';
  const myInc=isS ? INCIDENTS : INCIDENTS.filter(i=>i.dept===cu.dept||(cu.role==='EMPLOYEE'&&i.by===cu.id));
  const myAlarms=isS ? ALARMS : ALARMS.filter(a=>a.dept===cu.dept||a.created_by===cu.id);
  const openInc=myInc.filter(i=>i.status==='ABIERTA').length;
  const pendAlarms=myAlarms.filter(a=>!a.done).length;
  const unread=NOTIFICATIONS.filter(n=>!n.read).length;

  document.getElementById('nav-inc-badge').textContent=openInc;
  document.getElementById('nav-inc-badge').style.display=openInc>0?'':'none';
  document.getElementById('mob-inc-badge').textContent=openInc;
  document.getElementById('mob-inc-badge').style.display=openInc>0?'':'none';
  document.getElementById('nav-alarm-badge').textContent=pendAlarms;
  document.getElementById('nav-alarm-badge').style.display=pendAlarms>0?'':'none';
  document.getElementById('bell-dot').textContent=unread;
  document.getElementById('bell-dot').style.display=unread>0?'':'none';
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function navTo(page,el){
  // Page access control
  const isS=cu&&cu.role==='SUPER_ADMIN';
  const isA=cu&&cu.role==='ADMIN';
  const superOnly=['admin','hotels','archive'];
  const adminPlus=['reports','team'];
  if(superOnly.includes(page)&&!isS){toast('✗ Acceso restringido');return;}
  if(adminPlus.includes(page)&&!isS&&!isA){toast('✗ Acceso restringido');return;}
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el)el.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  closeSidebar();
  const renders={dashboard:renderDashboard,checklists:renderChecklists,incidents:renderIncidents,alarms:renderAlarms,team:renderTeam,reports:function(){ renderReportStats(); },admin:renderAdmin,hotels:renderHotels,archive:function(){ arcSetRange(7); },notes:function(){ loadNotes().then(function(){ navTo('agenda', document.getElementById('nav-agenda')); }); },agenda:function(){ loadNotes().then(function(){ renderAgenda(); }); }};
  if(renders[page])renders[page]();
}

function setMobActive(el){
  document.querySelectorAll('.mob-nav-item').forEach(m=>m.classList.remove('active'));
  el.classList.add('active');
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

function toggleMobileMenu(){
  const isOpen=document.getElementById('sidebar').classList.contains('mobile-open');
  isOpen?closeSidebar():toggleSidebar();
}

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
function toggleNotifDropdown(e){
  if(e) e.stopPropagation();
  const dd=document.getElementById('notif-dropdown');
  dd.classList.toggle('open');
  if(dd.classList.contains('open')){buildNotifications();updateBadges();renderNotifDropdown();}
}

function renderNotifDropdown(){
  const list=document.getElementById('notif-list');
  if(!NOTIFICATIONS.length){list.innerHTML='<div class="notif-empty"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg> Sin notificaciones pendientes</div>';return;}
  list.innerHTML=NOTIFICATIONS.map(n=>`
    <div class="notif-entry" onclick="handleNotifClick(${n.id})">
      <div class="notif-entry-dot" style="background:${n.color}"></div>
      <div class="notif-entry-body">
        <div class="notif-entry-title">${n.title}</div>
        <div class="notif-entry-sub">${n.sub||''}</div>
      </div>
      ${!n.read?'<div style="width:8px;height:8px;border-radius:50%;background:#8b1a1a;flex-shrink:0;margin-top:5px"></div>':''}
    </div>
  `).join('');
}

function handleNotifClick(id){
  const n=NOTIFICATIONS.find(x=>x.id===id);
  if(!n)return;
  n.read=true;
  document.getElementById('notif-dropdown').classList.remove('open');
  updateBadges();
  if(n.type==='alarm')navTo('alarms',document.getElementById('nav-alarms'));
  if(n.type==='incident'){navTo('incidents',document.getElementById('nav-incidents'));setTimeout(()=>openIncidentDetail(n.incId),200);}
}

function clearAllNotifs(){
  NOTIFICATIONS.forEach(n=>n.read=true);
  updateBadges();
  renderNotifDropdown();
}

// Close dropdown when clicking outside
document.addEventListener('click',e=>{
  const dd=document.getElementById('notif-dropdown');
  const btn=document.getElementById('bell-btn');
  if(dd&&btn&&!dd.contains(e.target)&&!btn.contains(e.target))dd.classList.remove('open');
});

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function renderDashboard(){
  const now=new Date();
  document.getElementById('dash-date').textContent=now.toLocaleDateString('es-ES',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const hotelBadge = document.getElementById('dash-hotel-badge');
  if(hotelBadge){
    const hName = activeHotelName || (HOTELS.find(h=>h.id===activeHotelId)||{}).name || '';
    hotelBadge.innerHTML = hName ? `<span style="display:inline-flex;align-items:center;gap:5px;background:var(--forest);color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">🏨 ${hName}</span>` : '';
  }
  const today=now.toISOString().slice(0,10);

  // Urgent — filter by role
  const isS_d=cu.role==='SUPER_ADMIN';
  const allCrit=INCIDENTS.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA');
  const crit=isS_d ? allCrit : allCrit.filter(i=>i.dept===cu.dept);
  document.getElementById('dash-urgent').innerHTML=crit.map(i=>`
    <div class="urgent-banner" onclick="openIncidentDetail(${i.id})">
      <div class="banner-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div><div class="banner-title" style="color:var(--red)">CRÍTICA: ${i.title}</div><div class="banner-sub" style="color:var(--red)">${i.dept} · ${i.at}</div></div>
    </div>`).join('');

  // Alarms today
  const allTodayAlarms=ALARMS.filter(a=>!a.done&&a.time&&a.time.startsWith(today));
  const todayAlarms=isS_d ? allTodayAlarms : allTodayAlarms.filter(a=>a.dept===cu.dept||a.created_by===cu.id);
  document.getElementById('dash-alarms').innerHTML=todayAlarms.map(a=>`
    <div class="alarm-banner" style="justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:flex-start;gap:12px;flex:1;min-width:0">
        <div class="banner-icon" style="flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
        <div style="min-width:0">
          <div class="banner-title" style="color:var(--amber)">${a.title}</div>
          <div class="banner-sub" style="color:var(--amber)">${a.note||''} · ${(a.time||'').slice(11,16)}</div>
        </div>
      </div>
      <button onclick="markAlarmDoneFromDash(${a.id})" style="flex-shrink:0;margin-left:12px;padding:5px 12px;font-size:0.78rem;font-weight:700;background:#2e4a1e;color:white;border:none;border-radius:20px;cursor:pointer;white-space:nowrap">✓ Hecho</button>
    </div>`).join('');

  // KPIs
  let chkDone=0;
  TEMPLATES.forEach(t=>{
    const allDone=t.items.every((_,i)=>CHK[`${t.id}-${today}-${i}`]);
    if(allDone&&t.items.length>0)chkDone++;
  });
  const kpiScope = cu.role==='SUPER_ADMIN' ? INCIDENTS : INCIDENTS.filter(i=>i.dept===cu.dept);
  const kpiUsers = cu.role==='SUPER_ADMIN' ? USERS : USERS.filter(u=>u.dept===cu.dept);
  document.getElementById('kpi-chk').textContent=chkDone;
  document.getElementById('kpi-open').textContent=kpiScope.filter(i=>i.status==='ABIERTA').length;
  document.getElementById('kpi-crit').textContent=kpiScope.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').length;
  document.getElementById('kpi-staff').textContent=kpiUsers.filter(u=>u.active).length;

  // Dept table
  document.getElementById('dept-table').innerHTML=DEPTS.map(d=>{
    const tpls=TEMPLATES.filter(t=>t.dept===d);
    let done=0;
    tpls.forEach(t=>{if(t.items.every((_,i)=>CHK[`${t.id}-${today}-${i}`])&&t.items.length>0)done++;});
    const pct=tpls.length>0?Math.round(done/tpls.length*100):0;
    const oi=INCIDENTS.filter(i=>i.dept===d&&i.status==='ABIERTA').length;
    const statusLabel=pct===100?'<span class="badge badge-green">✓ Al día</span>':pct>0?'<span class="badge badge-amber">En Curso</span>':'<span class="badge badge-gray">Pendiente</span>';
    return `<tr>
      <td><span class="dept-name-nowrap">${D_ICONS[d]||''}<span>${d}</span></span></td>
      <td style="cursor:pointer" onclick="incDeptFilter='all';navTo('checklists',document.getElementById('nav-checklists'))"><div style="display:flex;align-items:center;gap:7px"><div class="progress-bg" style="width:70px;height:6px"><div class="progress-fill" style="width:${pct}%"></div></div><span style="font-size:11px;color:var(--ink-muted)">${pct}%</span></div></td>
      <td style="cursor:pointer" onclick="incDeptFilter='${d}';navTo('incidents',document.getElementById('nav-incidents'))">${oi>0?`<span class="badge badge-red" style="cursor:pointer">${oi}</span>`:`<span class="badge badge-green">0</span>`}</td>
      <td>${statusLabel}</td>
    </tr>`;
  }).join('');

  // Recent incidents
  const recentScope = cu.role==='SUPER_ADMIN' ? INCIDENTS : INCIDENTS.filter(i=>i.dept===cu.dept);
  document.getElementById('dash-recent-inc').innerHTML=recentScope.slice(0,4).map(i=>incCard(i)).join('');

  // Bars
  const maxInc=Math.max(1,...DEPTS.map(d=>INCIDENTS.filter(i=>i.dept===d).length));
  document.getElementById('dash-chk-bars').innerHTML=DEPTS.map(d=>{
    const tpls=TEMPLATES.filter(t=>t.dept===d);
    let ai=0,di=0;
    tpls.forEach(t=>{ai+=t.items.length;di+=t.items.filter((_,i)=>CHK[`${t.id}-${today}-${i}`]).length;});
    const pct=ai>0?Math.round(di/ai*100):0;
    return `<div class="dept-bar"><div class="dept-bar-top"><span class="dept-bar-name">${D_ICONS[d]||''} ${d}</span><span class="dept-bar-pct">${di}/${ai}</span></div><div class="progress-bg"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');
  document.getElementById('dash-inc-bars').innerHTML=DEPTS.map(d=>{
    const c=INCIDENTS.filter(i=>i.dept===d).length;
    const pct=Math.round(c/maxInc*100);
    return `<div class="dept-bar"><div class="dept-bar-top"><span class="dept-bar-name">${D_ICONS[d]||''} ${d}</span><span class="dept-bar-pct">${c} incidencias</span></div><div class="progress-bg"><div class="progress-fill" style="width:${pct}%;background:var(--amber)"></div></div></div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// CHECKLISTS
// ══════════════════════════════════════════════════════════════
function renderChecklists(){
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('chk-date-label').textContent=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});

  const isS=cu.role==='SUPER_ADMIN';
  const isA=cu.role==='ADMIN';
  document.getElementById('btn-new-tpl').style.display=(isS||isA)?'':'none';

  const deptSel=document.getElementById('chk-dept-sel').value||'Todos';
  let tpls=TEMPLATES;
  if(!isS) tpls=tpls.filter(t=>t.dept===cu.dept);
  if(deptSel!=='Todos') tpls=tpls.filter(t=>t.dept===deptSel);

  const container=document.getElementById('chk-content');
  if(!tpls.length){container.innerHTML='<div class="empty"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg></div><div class="empty-text">No hay plantillas disponibles</div><div class="empty-sub">Crea una nueva desde el botón de arriba</div></div>';return;}

  const byDept={};
  tpls.forEach(t=>{if(!byDept[t.dept])byDept[t.dept]=[];byDept[t.dept].push(t);});

  container.innerHTML=Object.entries(byDept).map(([dept,dtpls])=>`
    <div style="margin-bottom:26px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:24px">${D_ICONS[dept]||'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'}</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700">${dept}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
        ${dtpls.map(t=>renderChkCard(t,today)).join('')}
      </div>
    </div>`).join('');
}

// Calcula la "fecha de referencia" según el tipo de checklist:
// - Diario y turnos: fecha de hoy → se resetea cada día a las 00:00
// - Semanal: lunes de la semana actual → se resetea cada lunes
// - Mensual: primer día del mes actual → se resetea el día 1 de cada mes
function getChkDate(shift){
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  if(shift==='Semanal'){
    const day = now.getDay(); // 0=dom, 1=lun...
    const diff = (day===0) ? -6 : 1-day; // retroceder al lunes
    const mon = new Date(now); mon.setDate(now.getDate()+diff);
    return mon.toISOString().slice(0,10);
  }
  if(shift==='Mensual'){
    return today.slice(0,8)+'01';
  }
  return today; // diario, turnos, apertura, cierre...
}

function renderChkCard(t,today){
  const chkDate = getChkDate(t.shift);
  const isS=cu.role==='SUPER_ADMIN';
  const isA=cu.role==='ADMIN';
  // done/pct solo sobre items reales (no títulos ##)
  const realItems = t.items.map((item,i)=>({item,i})).filter(({item})=>!item.startsWith('##'));
  const done=realItems.filter(({i})=>CHK[`${t.id}-${chkDate}-${i}`]).length;
  const pct=realItems.length?Math.round(done/realItems.length*100):0;
  const items=t.items.map((item,i)=>{
    // Título de sección — sin checkbox
    if(item.startsWith('##')){
      const title=item.replace(/^##\s*/,'');
      return `<div class="chk-section-header"><div class="chk-section-title">${title}</div></div>`;
    }
    const ck=`${t.id}-${chkDate}-${i}`;
    const c=CHK[ck];
    const canToggle=isS||(cu.dept===t.dept);
    return `<div class="chk-item${c?' done':''}" ${canToggle?`onclick="toggleChk('${ck}')"`:'style="cursor:default"'}>
      <span class="chk-box">${c?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}</span>
      <div style="flex:1;min-width:0">
        <div class="chk-text${c?' done':''}">${item}</div>
        ${c?`<div class="chk-meta-text" style="font-size:0.72rem;color:var(--ink-muted);margin-top:3px;display:flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="0.8em" height="0.8em" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${c.user} · ${c.time}</div>`:''}
      </div>
    </div>`;
  }).join('');

  const chkNoteKey = `chk:${t.id}:${chkDate}`;
  const chkNote = NOTES[chkNoteKey];
  const chkNoteText = chkNote && chkNote.content ? chkNote.content : '';
  const canNote = isS || isA || (cu.dept === t.dept);

  // Determine if collapsed by default based on completion
  const isCollapsed = pct === 100; // completed cards start collapsed

  return `<div class="card">
    <div class="card-header" style="cursor:pointer;user-select:none" onclick="toggleChkCard('chk-body-${t.id}','chk-arr-${t.id}',event)">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span id="chk-arr-${t.id}" style="font-size:12px;color:var(--ink-muted);transition:transform 0.2s;display:inline-block;flex-shrink:0">${isCollapsed?'▶':'▼'}</span>
          <div>
            <div class="card-title">${t.name}</div>
            <div style="font-size:11px;color:var(--ink-muted);margin-top:2px">${t.shift} · ${done}/${realItems.length} completados</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center" onclick="event.stopPropagation()">
        <span class="badge ${pct===100?'badge-green':pct>0?'badge-amber':'badge-gray'}">${pct}%</span>
        ${(isS||isA)?`<button class="btn btn-outline btn-sm" onclick="editTemplate(${t.id})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`:''}
        ${isS?`<button class="btn btn-red btn-sm" onclick="deleteTemplate(${t.id})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`:''}
      </div>
    </div>
    <div id="chk-body-${t.id}" style="display:${isCollapsed?'none':'block'}">
    <div class="card-body" style="padding-top:6px">
      <div class="progress-bg" style="margin-bottom:14px"><div class="progress-fill" style="width:${pct}%"></div></div>
      ${items}
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--cream-dark)">
        <div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px">📝 Nota del turno</div>
        ${canNote
          ? `<div style="display:flex;gap:6px;align-items:flex-start">
              <textarea id="chknote-${t.id}" rows="2" placeholder="Añade una nota o comentario para este turno…"
                style="flex:1;min-width:0;resize:vertical;padding:7px 10px;font-size:0.8rem;line-height:1.5;border:1px solid var(--border);border-radius:8px;background:white;color:var(--ink);font-family:inherit;outline:none"
                onfocus="this.style.borderColor='var(--forest)'" onblur="this.style.borderColor='var(--border)'"
              >${chkNoteText}</textarea>
              <button style="flex-shrink:0;padding:5px 10px;font-size:0.75rem;font-weight:600;background:var(--cream);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--ink);white-space:nowrap;line-height:1.4" onclick="saveChkNote(${t.id},'${chkDate}')">💾</button>
            </div>
            ${chkNote && chkNote.updatedAt ? `<div style="font-size:0.7rem;color:var(--ink-muted);margin-top:3px">Guardado: ${new Date(chkNote.updatedAt).toLocaleString('es-ES')}${chkNote.author?' · '+chkNote.author:''}</div>` : ''}`
          : (chkNoteText
              ? `<div style="font-size:0.82rem;line-height:1.5;color:var(--ink);background:var(--cream);border-radius:8px;padding:8px 10px">${chkNoteText}</div>
                 ${chkNote && chkNote.updatedAt ? `<div style="font-size:0.7rem;color:var(--ink-muted);margin-top:4px">${new Date(chkNote.updatedAt).toLocaleString('es-ES')} · ${chkNote.author||''}</div>` : ''}`
              : `<div style="font-size:0.82rem;color:var(--ink-muted);font-style:italic">Sin notas para este turno</div>`)
        }
      </div>
    </div>
    </div>
  </div>`;
}

function toggleChkCard(bodyId, arrId, event){
  if(event && event.target.closest('button')) return; // don't collapse when clicking buttons
  const body = document.getElementById(bodyId);
  const arr = document.getElementById(arrId);
  if(!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if(arr) arr.textContent = open ? '▶' : '▼';
}

async function toggleChk(ck){
  const m=ck.match(/^(\d+)-(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if(!m)return;
  const tplId=m[1], date=m[2], idx=parseInt(m[3]);
  const tpl=TEMPLATES.find(t=>String(t.id)===tplId);
  // Solo se puede modificar checklists del propio departamento (SA puede todo)
  if(tpl && cu.role!=='SUPER_ADMIN' && tpl.dept!==cu.dept){toast('✗ No puedes modificar checklists de otro departamento');return;}
  if(CHK[ck]){
    delete CHK[ck];
    try{ await SB.delete('nh_checklist','?template_id=eq.'+tplId+'&date=eq.'+date+'&item_index=eq.'+idx); }catch(e){}
  } else {
    const now=new Date();
    const timeStr=now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    CHK[ck]={user:cu.name,time:timeStr};
    try{
      await SB.post('nh_checklist',{hotel_id:activeHotelId,template_id:parseInt(tplId),date:date,item_index:idx,user_id:cu.id,user_name:cu.name,completed_at:now.toISOString()});
    }catch(e){}
  }
  saveArchiveSnapshot();
  renderChecklists();
}

async function saveChkNote(tplId, date){
  const el = document.getElementById('chknote-'+tplId);
  if(!el) return;
  const key = `chk:${tplId}:${date}`;
  const content = el.value.trim();
  if(!content){
    // Delete note if empty
    try{
      const enc = encodeURIComponent(key);
      await SB.delete('nh_notes', `?dept=eq.${enc}&hotel_id=eq.${activeHotelId}`);
      delete NOTES[key];
    }catch(e){}
    toast('✓ Nota eliminada');
  } else {
    await persistNote(key, content, cu.name);
    toast('✓ Nota del turno guardada');
  }
  renderChecklists();
}

function sendWhatsAppSummary(){
  const today=new Date().toISOString().slice(0,10);
  const dateLabel=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  const isS=cu.role==='SUPER_ADMIN';
  const dept=isS?null:cu.dept;

  const lines=[];
  lines.push('*Noctis Hub \u2014 Resumen de Turno*');
  lines.push(dateLabel);
  lines.push('Responsable: '+cu.name+(dept?' ('+dept+')':''));
  lines.push('');

  // Checklists
  const myTpls=dept?TEMPLATES.filter(t=>t.dept===dept):TEMPLATES;
  if(myTpls.length){
    lines.push('*Checklists:*');
    myTpls.forEach(t=>{
      const done=t.items.filter((_,i)=>CHK[t.id+'-'+today+'-'+i]).length;
      const pct=t.items.length?Math.round(done/t.items.length*100):0;
      const bar=pct===100?'\u2705':pct>50?'\u26a0\ufe0f':'\u274c';
      lines.push(bar+' '+t.name+': '+done+'/'+t.items.length+' ('+pct+'%)');
    });
    lines.push('');
  }

  // Incidencias del departamento
  const deptInc=dept?INCIDENTS.filter(i=>i.dept===dept):INCIDENTS;
  if(deptInc.length){
    const open=deptInc.filter(i=>i.status==='ABIERTA').length;
    const inPr=deptInc.filter(i=>i.status==='EN_PROCESO').length;
    const res=deptInc.filter(i=>i.status==='RESUELTA').length;
    lines.push('*Incidencias:*');
    lines.push('\u2022 Abiertas: '+open+' | En proceso: '+inPr+' | Resueltas: '+res);
    const crit=deptInc.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA');
    if(crit.length) lines.push('\u26a0\ufe0f Cr\xedticas pendientes: '+crit.map(i=>i.title).join(', '));
    lines.push('');
  }

  lines.push('_Enviado desde Noctis Hub_');

  const msg=lines.join('\n');
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

async function requestNotifPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    const result = await Notification.requestPermission();
    if(result === 'granted'){
      toast('✓ Notificaciones activadas — recibirás alertas de alarmas');
    } else {
      toast('⚠ Notificaciones bloqueadas — actívalas en ajustes del navegador');
    }
  } else if(Notification.permission === 'denied'){
    // Show a persistent banner explaining how to re-enable
    console.warn('Notifications blocked by user');
  }
}

function startAlarmChecker(){
  if(alarmCheckerInterval) clearInterval(alarmCheckerInterval);
  checkAlarms(); // check immediately
  alarmCheckerInterval = setInterval(checkAlarms, 30000); // every 30 seconds
}

function checkAlarms(){
  if(!ALARMS || !ALARMS.length) return;
  const now = new Date();
  ALARMS.filter(a => !a.done).forEach(a => {
    if(!a.alarm_time) return;
    const alarmTime = new Date(a.alarm_time);
    const diffMs = alarmTime - now;
    const alarmKey = a.id + '-' + a.alarm_time;
    // Fire if within the next 60 seconds or up to 2 min past
    if(diffMs <= 60000 && diffMs >= -120000 && !firedAlarms.has(alarmKey)){
      firedAlarms.add(alarmKey);
      triggerAlarmNotification(a);
    }
  });
}

function triggerAlarmNotification(alarm){
  // 1. Bell badge
  buildNotifications();
  // 2. Sound — gentle soft chime (3 descending sine tones)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 698, 523]; // A5 → F5 → C5 — soft descending chime
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.18;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t); osc.stop(t + 0.65);
    });
  } catch(e){}
  // 3. Web Push Notification (if permission granted)
  if('Notification' in window && Notification.permission === 'granted'){
    try {
      new Notification('🔔 Noctis Hub — ' + alarm.title, {
        body: alarm.note || 'Alarma programada',
        icon: '/noctis-hub/icon-192.png',
        badge: '/noctis-hub/icon-192.png',
        tag: 'alarm-' + alarm.id
      });
    } catch(e){}
  }
  // 4. Toast visible in app
  toast('🔔 ALARMA: ' + alarm.title);
}

function saveArchiveSnapshot(){
  const today=new Date().toISOString().slice(0,10);
  ARCHIVE[today]=TEMPLATES.map(t=>({
    tplId:t.id,tplName:t.name,dept:t.dept,shift:t.shift,
    items:t.items.map((text,i)=>{const ck=CHK[`${t.id}-${today}-${i}`];return{text,done:!!ck,user:ck?ck.user:'',time:ck?ck.time:''};})
  }));
}

// ══════════════════════════════════════════════════════════════
// ARCHIVE
// ══════════════════════════════════════════════════════════════
function arcSetRange(days){
  const to=new Date().toISOString().slice(0,10);
  const from=days===0?to:(()=>{const d=new Date();d.setDate(d.getDate()-(days-1));return d.toISOString().slice(0,10);})();
  const fromEl=document.getElementById('arc-date-from');
  const toEl=document.getElementById('arc-date-to');
  if(fromEl) fromEl.value=from;
  if(toEl) toEl.value=to;
  renderArchive();
}

async function renderArchive(){
  const deptSel=document.getElementById('arc-dept-sel')?document.getElementById('arc-dept-sel').value:'Todos';
  const fromDate=document.getElementById('arc-date-from')?document.getElementById('arc-date-from').value:'';
  const toDate=document.getElementById('arc-date-to')?document.getElementById('arc-date-to').value:'';
  const container=document.getElementById('archive-content');
  const isS=cu.role==='SUPER_ADMIN';

  // Default: last 7 days if no filter set
  const today=new Date().toISOString().slice(0,10);
  const defFrom=fromDate||(()=>{const d=new Date();d.setDate(d.getDate()-6);return d.toISOString().slice(0,10);})();
  const defTo=toDate||today;

  container.innerHTML=`<div style="padding:20px;text-align:center;color:var(--ink-muted)">🔄 Cargando historial...</div>`;

  try {
    // Build Supabase query with date range
    let q=`?hotel_id=eq.${activeHotelId}&date=gte.${defFrom}&date=lte.${defTo}&order=date.desc`;
    const rows = await SB.get('nh_checklist', q);

    if(!rows || !rows.length){
      container.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin registros en este período</div><div class="empty-sub">${defFrom===defTo?'No hay datos para el '+new Date(defFrom+'T12:00').toLocaleDateString('es-ES'):'No hay datos del '+new Date(defFrom+'T12:00').toLocaleDateString('es-ES')+' al '+new Date(defTo+'T12:00').toLocaleDateString('es-ES')}</div></div>`;
      return;
    }

    // Group by date
    const byDate={};
    rows.forEach(row=>{
      const key=`${row.template_id}-${row.date}-${row.item_index}`;
      if(!byDate[row.date]) byDate[row.date]={};
      byDate[row.date][key]={user:row.user_name, time:row.completed_at?new Date(row.completed_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'', dbId:row.id};
    });

    const allDates=Object.keys(byDate).sort().reverse();

    container.innerHTML=allDates.map(date=>{
      const chkDay=byDate[date];
      const dateLabel=new Date(date+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      let tpls=TEMPLATES;
      if(!isS) tpls=tpls.filter(t=>t.dept===cu.dept);
      if(deptSel!=='Todos') tpls=tpls.filter(t=>t.dept===deptSel);

      const tplRows=tpls.map(t=>{
        const done=t.items.filter((_,i)=>chkDay[`${t.id}-${date}-${i}`]).length;
        const total=t.items.length;
        if(done===0) return ''; // skip templates with no activity this day
        const pct=total?Math.round(done/total*100):0;
        const pctColor=pct===100?'var(--forest)':pct>0?'var(--amber)':'var(--red)';
        const workers=[...new Set(t.items.map((_,i)=>chkDay[`${t.id}-${date}-${i}`]?.user).filter(Boolean))];
        return `<tr>
          <td style="padding:8px 10px"><strong>${t.name}</strong><br><small style="color:var(--ink-muted)">${D_ICONS[t.dept]||''} ${t.dept} · ${t.shift}</small></td>
          <td style="padding:8px;text-align:center;font-weight:700;color:${pctColor}">${done}/${total}</td>
          <td style="padding:8px;text-align:center;font-weight:700;color:${pctColor}">${pct}%</td>
          <td style="padding:8px;font-size:0.75rem;color:var(--ink-muted)">${workers.join(', ')||'—'}</td>
        </tr>`;
      }).join('');

      if(!tplRows.trim()) return '';

      const totalDone=tpls.reduce((s,t)=>s+t.items.filter((_,i)=>chkDay[`${t.id}-${date}-${i}`]).length,0);
      const totalAll=tpls.reduce((s,t)=>s+t.items.length,0);
      const dayPct=totalAll?Math.round(totalDone/totalAll*100):0;
      const dayColor=dayPct===100?'var(--forest)':dayPct>50?'var(--amber)':'var(--red)';

      return `<div class="archive-entry">
        <div class="archive-entry-head" onclick="this.nextElementSibling.classList.toggle('open')">
          <div style="flex:1">
            <div style="font-weight:700;font-size:0.95rem;text-transform:capitalize">${dateLabel}</div>
            <div style="font-size:0.78rem;color:var(--ink-muted);margin-top:2px">${totalDone} tareas completadas de ${totalAll}</div>
          </div>
          <div style="font-weight:800;font-size:1rem;color:${dayColor};flex-shrink:0">${dayPct}%</div>
          <div style="font-size:0.75rem;color:var(--ink-muted);flex-shrink:0;margin-left:8px">▼</div>
        </div>
        <div class="archive-entry-body">
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
            <thead><tr style="background:var(--cream-dark)">
              <th style="padding:8px 10px;text-align:left">Plantilla</th>
              <th style="padding:8px;text-align:center">Tareas</th>
              <th style="padding:8px;text-align:center">%</th>
              <th style="padding:8px;text-align:left">Realizado por</th>
            </tr></thead>
            <tbody>${tplRows}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    // If after filtering by dept nothing shows
    if(!container.innerHTML.trim()){
      container.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin actividad en este período</div><div class="empty-sub">No hay checklists con tareas completadas para los filtros seleccionados</div></div>`;
    }
  } catch(e) {
    container.innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Error al cargar historial</div><div class="empty-sub">${e.message||e}</div></div>`;
  }
}

// ══════════════════════════════════════════════════════════════
// NOTES — Bloc de notas por departamento
// ══════════════════════════════════════════════════════════════
let NOTES = {}; // key: dept → {content, updatedAt}
let notesDept = null;
let _noteAutoSave = null;

async function loadNotes(){
  try{
    let rows = [];
    try{
      rows = await SB.get('nh_notes', `?hotel_id=eq.${activeHotelId}`);
    }catch(e){ rows = []; }
    if(!rows || !rows.length){
      try{
        rows = await SB.get('nh_notes','');
        rows = (rows||[]).filter(r => !r.hotel_id || String(r.hotel_id)===String(activeHotelId));
      }catch(e2){ rows = []; }
    }
    NOTES = {};
    (rows||[]).forEach(r=>{ NOTES[r.dept]={content:r.content,raw:(String(r.dept||'').indexOf('agenda:')===0 ? (r.content||'') : ''),updatedAt:r.updated_at,author:r.author||''}; });
    cacheNotesToLocal();
    if(!Object.keys(NOTES).length) loadNotesFromLocal();
  }catch(e){
    loadNotesFromLocal();
  }
}

// ── NOTES HELPERS ──────────────────────────────────────────────
async function persistNote(key, content, author){
  const nowIso = new Date().toISOString();
  NOTES[key] = {content:content, raw:(String(key||'').indexOf('agenda:')===0 ? content : ''), updatedAt: nowIso, author: author||''};
  cacheNotesToLocal();
  const makeBody = (includeAuthor=true, includeHotel=true) => {
    const base = {dept:key, content:content, updated_at:nowIso};
    if(includeAuthor && author) base.author = author;
    if(includeHotel && activeHotelId) base.hotel_id = activeHotelId;
    return base;
  };
  const keyVariants = [String(key||''), encodeURIComponent(String(key||''))];
  let lastErr = null;
  for(const k of keyVariants){
    for(const includeHotel of [true,false]){
      for(const includeAuthor of [true,false]){
        try{
          const filter = `?dept=eq.${k}` + (includeHotel && activeHotelId ? `&hotel_id=eq.${activeHotelId}` : '');
          let existing = [];
          try{ existing = await SB.get('nh_notes', filter); }catch(e){ existing = []; }
          const body = makeBody(includeAuthor, includeHotel);
          if(existing && existing.length && existing[0].id){
            await SB.patch('nh_notes', `?id=eq.${existing[0].id}`, body);
          } else if(existing && existing.length){
            await SB.patch('nh_notes', filter, body);
          } else {
            await SB.post('nh_notes', body);
          }
          return true;
        }catch(e){ lastErr = e; }
      }
    }
  }
  console.warn('Notes save fallback local only:', lastErr);
  return true;
}

async function deleteNoteByKey(key){
  try{
    const enc = encodeURIComponent(key);
    await SB.delete('nh_notes', `?dept=eq.${enc}&hotel_id=eq.${activeHotelId}`);
    delete NOTES[key];
  }catch(e){ console.warn('Notes delete error:', e); }
}

function renderNotes(){
  const isS = cu.role==='SUPER_ADMIN';
  const subtitle = document.getElementById('notes-subtitle');
  const tabs = document.getElementById('notes-dept-tabs');
  const allDepts = DEPTS.slice(); // use actual configured departments
  const D_LABELS = {'Recepción':'🛎️','Housekeeping':'🛏️','Mantenimiento':'🔧','F&B':'☕','Administración':'📁','Dirección':'🏠'};
  const saView = document.getElementById('notes-sa-view');
  const editor = document.getElementById('notepad-editor');
  const toolbar = document.getElementById('notepad-toolbar-wrap');
  const lastSaved = document.getElementById('notepad-last-saved');
  const saveBtn = document.getElementById('notes-save-btn');

  if(isS){
    saView.style.display = 'block';
    editor.style.display = 'none';
    if(toolbar) toolbar.style.display = 'none';
    if(saveBtn) saveBtn.style.display = 'none';
    lastSaved.textContent = '';
    subtitle.textContent = 'Tu bloc + notas de cada empleado por departamento';
    if(!notesDept || !['SA',...allDepts].includes(notesDept)) notesDept = 'SA';
    tabs.innerHTML = '';
    const saBtn = document.createElement('div');
    saBtn.className = 'chip' + (notesDept==='SA' ? ' active' : '');
    saBtn.innerHTML = '📋 Mi nota';
    saBtn.addEventListener('click', function(){ notesDept='SA'; renderNotes(); });
    tabs.appendChild(saBtn);
    allDepts.forEach(function(d){
      const btn = document.createElement('div');
      btn.className = 'chip' + (notesDept===d ? ' active' : '');
      btn.textContent = (D_LABELS[d]||'📝')+' '+d;
      btn.addEventListener('click', function(){ notesDept=d; renderNotes(); });
      tabs.appendChild(btn);
    });
    const expandBtn2 = document.getElementById('notes-expand-btn');
    if(expandBtn2) expandBtn2.style.display = notesDept==='SA' ? '' : 'none';
    if(notesDept === 'SA'){
      const saNote = NOTES['SA'];
      saView.innerHTML = `
        <div style="margin-bottom:12px;font-size:0.82rem;color:var(--ink-muted)">Esta nota la verán todos tus empleados en su bloc.</div>
        <div id="sa-own-editor" contenteditable="true" spellcheck="true"
          style="min-height:300px;padding:20px 24px;font-size:15px;line-height:1.9;outline:none;background:white;font-family:'Georgia',serif;color:#1a1208;border:1px solid var(--border);border-radius:8px"
          >${saNote ? saNote.content : ''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
          <span style="font-size:0.75rem;color:var(--ink-muted)">${saNote && saNote.updatedAt ? 'Guardado: '+new Date(saNote.updatedAt).toLocaleString('es-ES') : 'Sin guardar aún'}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="openNoteFullscreen()">⛶ Expandir</button>
            <button class="btn btn-green btn-sm" onclick="saveSANote()">💾 Guardar</button>
          </div>
        </div>`;
    } else {
      const usersInDept = USERS.filter(u => u.dept === notesDept && u.active !== false);
      if(!usersInDept.length){ saView.innerHTML = `<div style="color:var(--ink-muted);font-style:italic;padding:20px 0">Sin empleados en este departamento</div>`; return; }
      let html = '';
      usersInDept.forEach(function(u){
        const key = u.role==='SUPER_ADMIN' ? 'SA' : u.dept+':'+u.id;
        const note = NOTES[key];
        const hasNote = note && note.content && note.content.replace(/<[^>]*>/g,'').trim();
        const safeKey = key.replace(/'/g,"\\'");
        const safeName = u.name.replace(/'/g,"\\'");
        html += `<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--cream-dark)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:34px;height:34px;border-radius:50%;background:${D_COLORS[u.dept]||'#2e4a1e'};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.85rem;flex-shrink:0">${u.name[0]}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.9rem">${u.name}</div>
              <div style="font-size:0.72rem;color:var(--ink-muted)">${note && note.updatedAt ? 'Actualizado: '+new Date(note.updatedAt).toLocaleString('es-ES') : 'Sin notas aún'}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-outline btn-sm" onclick="openNoteModal('${safeKey}','${safeName}',true)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Abrir
              </button>
            </div>
          </div>
          ${hasNote
            ? `<div style="font-size:0.85rem;line-height:1.7;background:var(--cream);border-radius:8px;padding:12px 14px;max-height:80px;overflow:hidden;position:relative;pointer-events:none;user-select:none">${note.content}<div style="position:absolute;bottom:0;left:0;right:0;height:32px;background:linear-gradient(transparent,var(--cream));border-radius:0 0 8px 8px"></div></div>`
            : `<div style="font-size:0.82rem;color:var(--ink-muted);font-style:italic;padding:4px 0">Sin notas aún</div>`
          }
        </div>`;
      });
      saView.innerHTML = html;
    }
  } else {
    saView.style.display = 'none';
    editor.style.display = '';
    if(toolbar) toolbar.style.display = '';
    subtitle.textContent = 'Tu bloc personal + la nota del administrador';
    const expandBtn = document.getElementById('notes-expand-btn');
    if(expandBtn) expandBtn.style.display = '';
    tabs.innerHTML = '';
    if(!notesDept) notesDept = 'my';
    const saTab = document.createElement('div');
    saTab.className = 'chip' + (notesDept==='SA' ? ' active' : '');
    saTab.innerHTML = '📋 Nota Admin';
    saTab.addEventListener('click', function(){ saveNote(true); notesDept='SA'; renderNotes(); });
    tabs.appendChild(saTab);
    const myTab = document.createElement('div');
    myTab.className = 'chip' + (notesDept!=='SA' ? ' active' : '');
    myTab.innerHTML = '✏️ Mi nota';
    myTab.addEventListener('click', function(){ saveNote(true); notesDept='my'; renderNotes(); });
    tabs.appendChild(myTab);
    const expandBtnEmp = document.getElementById('notes-expand-btn');
    if(notesDept==='SA'){
      const saNote = NOTES['SA'];
      editor.innerHTML = saNote && saNote.content ? saNote.content : '<em style="color:var(--ink-muted)">El administrador no ha escrito ninguna nota todavía</em>';
      editor.setAttribute('contenteditable','false');
      editor.style.background = 'var(--cream)';
      editor.style.cursor = 'default';
      lastSaved.textContent = saNote && saNote.updatedAt ? 'Publicado: '+new Date(saNote.updatedAt).toLocaleString('es-ES') : '';
      if(saveBtn) saveBtn.style.display = 'none';
      if(toolbar) toolbar.style.display = 'none';
      if(expandBtnEmp) expandBtnEmp.style.display = 'none';
    } else {
      const noteKey = cu.dept+':'+cu.id;
      const note = NOTES[noteKey];
      editor.innerHTML = note ? note.content : '';
      editor.setAttribute('contenteditable','true');
      editor.style.background = 'white';
      editor.style.cursor = 'text';
      lastSaved.textContent = note && note.updatedAt ? 'Último guardado: '+new Date(note.updatedAt).toLocaleString('es-ES') : 'Sin guardar aún';
      if(saveBtn) saveBtn.style.display = '';
      if(toolbar) toolbar.style.display = '';
      if(expandBtnEmp) expandBtnEmp.style.display = '';
    }
  }
}

async function saveSANote(){
  const el = document.getElementById('sa-own-editor');
  if(!el) return;
  await persistNote('SA', el.innerHTML);
  renderNotes();
  toast('✓ Nota guardada');
}

async function saveNote(silent){
  if(!cu || cu.role==='SUPER_ADMIN') return;
  if(notesDept==='SA') return;
  const editorEl = document.getElementById('notepad-editor');
  if(!editorEl) return;
  const noteContent = editorEl.innerHTML;
  const noteKey = cu.dept+':'+cu.id;
  await persistNote(noteKey, noteContent);
  const lastSaved = document.getElementById('notepad-last-saved');
  if(lastSaved) lastSaved.textContent = 'Último guardado: '+new Date().toLocaleString('es-ES');
  if(!silent){
    const savedEl = document.getElementById('notepad-saved');
    if(savedEl){ savedEl.classList.add('show'); setTimeout(function(){savedEl.classList.remove('show');},2000); }
    toast('✓ Nota guardada');
  }
}

function switchNotesDept(dept){ saveNote(true); notesDept=dept; renderNotes(); }

// ── FULLSCREEN NOTE ───────────────────────────────────────────
let _noteFs = { active: false, key: null, isSA: false };

function openNoteFullscreen(){
  const overlay = document.getElementById('note-fullscreen-overlay');
  const fsEditor = document.getElementById('note-fs-editor');
  const fsTitle = document.getElementById('note-fs-title');
  const fsSaved = document.getElementById('note-fs-saved-label');
  if(!overlay || !fsEditor) return;
  // Determine current note context
  if(cu.role === 'SUPER_ADMIN'){
    _noteFs.key = 'SA';
    _noteFs.isSA = true;
    fsTitle.textContent = 'Mi nota (Super Admin)';
    const saEl = document.getElementById('sa-own-editor');
    fsEditor.innerHTML = saEl ? saEl.innerHTML : (NOTES['SA']?.content || '');
  } else {
    _noteFs.key = cu.dept+':'+cu.id;
    _noteFs.isSA = false;
    fsTitle.textContent = cu.name + ' — ' + cu.dept;
    const mainEditor = document.getElementById('notepad-editor');
    fsEditor.innerHTML = mainEditor ? mainEditor.innerHTML : (NOTES[_noteFs.key]?.content || '');
  }
  const note = NOTES[_noteFs.key];
  fsSaved.textContent = note?.updatedAt ? 'Último guardado: '+new Date(note.updatedAt).toLocaleString('es-ES') : 'Sin guardar aún';
  overlay.classList.add('open');
  // Focus editor after animation
  setTimeout(()=>{ fsEditor.focus(); const r=document.createRange();const s=window.getSelection();r.selectNodeContents(fsEditor);r.collapse(false);s.removeAllRanges();s.addRange(r); }, 250);
  // Auto-save on input
  fsEditor._autoSave = setInterval(()=>{ if(fsEditor.innerHTML !== _noteFs._lastSaved){ saveNoteFullscreen(true); } }, 30000);
  _noteFs._lastSaved = fsEditor.innerHTML;
}

async function saveNoteFullscreen(silent){
  const fsEditor = document.getElementById('note-fs-editor');
  const fsSaved = document.getElementById('note-fs-saved-label');
  if(!fsEditor || !_noteFs.key) return;
  const content = fsEditor.innerHTML;
  await persistNote(_noteFs.key, content, cu.name);
  _noteFs._lastSaved = content;
  const now = new Date().toLocaleString('es-ES');
  if(fsSaved) fsSaved.textContent = 'Guardado: '+now;
  // Sync back to main editor
  const mainEditor = document.getElementById('notepad-editor');
  const saEditor = document.getElementById('sa-own-editor');
  if(_noteFs.isSA && saEditor) saEditor.innerHTML = content;
  else if(mainEditor) mainEditor.innerHTML = content;
  const lastSavedEl = document.getElementById('notepad-last-saved');
  if(lastSavedEl) lastSavedEl.textContent = 'Último guardado: '+now;
  if(!silent) toast('✓ Nota guardada');
}

async function closeNoteFullscreen(){
  const overlay = document.getElementById('note-fullscreen-overlay');
  const fsEditor = document.getElementById('note-fs-editor');
  if(fsEditor._autoSave){ clearInterval(fsEditor._autoSave); fsEditor._autoSave=null; }
  // Save before closing
  await saveNoteFullscreen(true);
  overlay.classList.remove('open');
  renderNotes();
}

// Override noteCmd to support fullscreen editor target
const _origNoteCmd = typeof noteCmd === 'function' ? noteCmd : null;

function openNoteModal(key, userName, canEdit){
  const note = NOTES[key];
  document.getElementById('modal-note-view-title').textContent = userName;
  document.getElementById('modal-note-view-sub').textContent = note && note.updatedAt ? 'Última edición: '+new Date(note.updatedAt).toLocaleString('es-ES') : 'Sin notas aún';
  const contentEl = document.getElementById('modal-note-view-content');
  const safeKey = key.replace(/'/g,"\\'");
  const safeName = userName.replace(/'/g,"\\'");
  if(canEdit && cu && cu.role==='SUPER_ADMIN'){
    contentEl.innerHTML = `<div id="modal-note-editor" contenteditable="true" spellcheck="true"
      style="min-height:200px;padding:16px 18px;font-size:15px;line-height:1.9;outline:none;background:white;font-family:'Georgia',serif;color:#1a1208;border:1px solid var(--border);border-radius:8px"
      >${note ? note.content : ''}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        ${note && note.content && note.content.replace(/<[^>]*>/g,'').trim() ? `<button class="btn btn-red btn-sm" onclick="deleteEmployeeNote('${safeKey}','${safeName}')">🗑 Borrar nota</button>` : ''}
        <button class="btn btn-green btn-sm" onclick="saveEmployeeNoteFromModal('${safeKey}','${safeName}')">💾 Guardar cambios</button>
      </div>`;
  } else {
    contentEl.innerHTML = note && note.content ? `<div style="font-size:0.92rem;line-height:1.8">${note.content}</div>` : `<div style="color:var(--ink-muted);font-style:italic">Sin contenido</div>`;
  }
  openModal('modal-note-view');
}

async function saveEmployeeNoteFromModal(key, userName){
  const el = document.getElementById('modal-note-editor');
  if(!el) return;
  await persistNote(key, el.innerHTML);
  toast('✓ Nota de '+userName+' guardada');
  closeModal('modal-note-view');
  renderNotes();
}

async function deleteEmployeeNote(key, userName){
  if(!confirm('¿Borrar la nota de '+userName+'? Esta acción no se puede deshacer.')) return;
  await deleteNoteByKey(key);
  toast('✓ Nota de '+userName+' borrada');
  closeModal('modal-note-view');
  renderNotes();
}

// ══════════════════════════════════════════════════════════════
// INCIDENTS
// ══════════════════════════════════════════════════════════════
function renderIncidents(){
  // Dept filter chips
  const isS=cu.role==='SUPER_ADMIN';
  const dc=document.getElementById('inc-dept-chips');
  if(isS){
    const depts=['all',...DEPTS];
    dc.innerHTML=depts.map(d=>`<div class="chip${incDeptFilter===d?' active':''}" onclick="filterIncDept('${d}',this)">${d==='all'?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Todos los Departamentos':D_ICONS[d]+' '+d}</div>`).join('');
  } else { dc.innerHTML=''; }

  let list=INCIDENTS;
  if(cu.role==='EMPLOYEE') list=list.filter(i=>i.dept===cu.dept||i.by===cu.id);
  else if(cu.role==='ADMIN') list=list.filter(i=>i.dept===cu.dept);
  if(incFilter!=='all') list=list.filter(i=>i.status===incFilter);
  if(isS&&incDeptFilter!=='all') list=list.filter(i=>i.dept===incDeptFilter);

  const container=document.getElementById('inc-list');
  if(!list.length){container.innerHTML='<div class="empty"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg></div><div class="empty-text">Sin incidencias con este filtro</div></div>';return;}
  container.innerHTML=list.map(i=>incCard(i,true)).join('');
}

function incCard(inc,full=false){
  const prBadge={BAJA:'badge-gray',MEDIA:'badge-blue',ALTA:'badge-amber',CRITICA:'badge-red'}[inc.prio]||'badge-gray';
  const stBadge={ABIERTA:'badge-red',EN_PROCESO:'badge-amber',RESUELTA:'badge-green'}[inc.status]||'badge-gray';
  const stLabel={ABIERTA:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0" style="vertical-align:-0.15em;flex-shrink:0"><circle cx="12" cy="12" r="9"/></svg> Abierta',EN_PROCESO:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><circle cx="12" cy="12" r="9"/></svg> En Proceso',RESUELTA:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><circle cx="12" cy="12" r="9"/></svg> Resuelta'}[inc.status]||inc.status;
  const assignedIds=inc.assigned_to?JSON.parse(inc.assigned_to||'[]'):[];
  const assignedNames=assignedIds.map(id=>{const u=USERS.find(x=>x.id===id);return u?u.name:'?';});
  const assignedHtml=assignedIds.length?`<div style="font-size:0.706rem;color:var(--ink-muted);margin-top:4px;display:flex;align-items:center;gap:4px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="0.85em" height="0.85em" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${assignedNames.join(', ')}</div>`:'';
  return `<div class="inc-item" onclick="openIncidentDetail(${inc.id})">
    <div class="inc-top">
      <div><div class="inc-title-text">${inc.title}</div><div class="inc-meta">${D_ICONS[inc.dept]||''} ${inc.dept} · ${new Date(inc.at).toLocaleDateString('es-ES')}</div></div>
      <div class="inc-badges"><span class="badge ${prBadge}">${inc.prio}</span><span class="badge ${stBadge}">${stLabel}</span></div>
    </div>
    ${assignedHtml}
    ${full?`<div class="inc-desc">${inc.desc}</div>`:''}
  </div>`;
}

function filterInc(f,el){
  incFilter=f;
  document.querySelectorAll('#inc-chips .chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderIncidents();
}
function filterIncDept(d,el){
  incDeptFilter=d;
  document.querySelectorAll('#inc-dept-chips .chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderIncidents();
}

function openNewIncident(){
  document.getElementById('inc-f-id').value='';
  document.getElementById('inc-f-title').value='';
  document.getElementById('inc-f-desc').value='';
  document.getElementById('inc-f-prio').value='MEDIA';
  document.getElementById('inc-f-status').value='ABIERTA';
  document.getElementById('inc-f-alarm').value='';
  document.getElementById('inc-update-section').style.display='none';
  document.getElementById('modal-inc-title').textContent='Nueva Incidencia';
  // Lock dept and status for employees
  const deptSel = document.getElementById('inc-f-dept');
  const statusSel = document.getElementById('inc-f-status');
  if(cu.role==='EMPLOYEE'){
    deptSel.value = cu.dept;
    deptSel.disabled = true;
    statusSel.disabled = true;
  } else {
    deptSel.disabled = false;
    statusSel.disabled = false;
  }
  populateAssignedSelect([]);
  openModal('modal-incident');
}

function populateAssignedSelect(selectedIds){
  const sel = document.getElementById('inc-f-assigned');
  if(!sel) return;
  const isS = cu.role==='SUPER_ADMIN';
  // SUPER_ADMIN sees everyone; others only see their own department
  const eligible = USERS.filter(u => u.active && (isS || u.dept === cu.dept));
  sel.innerHTML = eligible.map(u=>
    `<option value="${u.id}" ${selectedIds.includes(u.id)?'selected':''}>${u.name} — ${roleLabel(u.role)}</option>`
  ).join('');
}

function editIncident(id){
  const inc=INCIDENTS.find(i=>i.id===id);
  if(!inc)return;
  // Only superadmin, admin of same dept, or the creator can edit
  const canEdit=cu.role==='SUPER_ADMIN'||(cu.role==='ADMIN'&&inc.dept===cu.dept)||inc.by==cu.id;
  if(!canEdit){toast('✗ No tienes permiso para editar esta incidencia');return;}
  document.getElementById('inc-f-id').value=id;
  document.getElementById('inc-f-title').value=inc.title;
  document.getElementById('inc-f-dept').value=inc.dept;
  document.getElementById('inc-f-prio').value=inc.prio;
  document.getElementById('inc-f-status').value=inc.status;
  document.getElementById('inc-f-desc').value=inc.desc||'';
  document.getElementById('inc-f-note').value='';
  document.getElementById('inc-update-section').style.display='block';
  document.getElementById('modal-inc-title').textContent='Editar Incidencia';
  closeModal('modal-inc-detail');
  document.getElementById('inc-f-alarm').value='';
  const assignedIds=inc.assigned_to?JSON.parse(inc.assigned_to||'[]'):[];
  populateAssignedSelect(assignedIds);
  // Lock dept and status for employees
  const deptSel2 = document.getElementById('inc-f-dept');
  const statusSel2 = document.getElementById('inc-f-status');
  if(cu.role==='EMPLOYEE'){
    deptSel2.disabled = true;
    statusSel2.disabled = false; // employee CAN update status on their own incidents
  } else {
    deptSel2.disabled = false;
    statusSel2.disabled = false;
  }
  openModal('modal-incident');
}


async function persistIncidentRow(mode, payload, id){
  let lastErr = null;
  const variants = [];
  const parsedAssigned = Array.isArray(payload.assigned_to) ? payload.assigned_to : (function(){ try { return JSON.parse(payload.assigned_to || '[]'); } catch(e){ return []; } })();
  const bases = [ {...payload}, {...payload, assigned_to: parsedAssigned} ];
  bases.forEach(base => {
    variants.push(base);
    variants.push(Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'updated_at')));
    variants.push(Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'assigned_to')));
    variants.push(Object.fromEntries(Object.entries(base).filter(([k]) => !['updated_at','assigned_to'].includes(k))));
    variants.push(Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'hotel_id')));
    variants.push(Object.fromEntries(Object.entries(base).filter(([k]) => !['hotel_id','updated_at'].includes(k))));
    variants.push(Object.fromEntries(Object.entries(base).filter(([k]) => !['hotel_id','assigned_to'].includes(k))));
  });
  for(const body of variants){
    try{
      const rows = mode === 'create'
        ? await SB.post('nh_incidents', body)
        : await SB.patch('nh_incidents','?id=eq.'+id, body);
      return Array.isArray(rows) ? rows[0] : rows;
    }catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('No se pudo guardar la incidencia');
}

async function saveIncident(){
  try{
    const id=parseInt(document.getElementById('inc-f-id').value)||0;
    const title=(document.getElementById('inc-f-title').value||'').trim();
    const deptEl=document.getElementById('inc-f-dept');
    const dept=(cu.role==='EMPLOYEE'||cu.role==='ADMIN') ? cu.dept : ((deptEl&&deptEl.value)||cu.dept||'');
    const prio=document.getElementById('inc-f-prio').value;
    const status=(document.getElementById('inc-f-status').value||'ABIERTA').toUpperCase();
    const desc=(document.getElementById('inc-f-desc').value||'').trim();
    const note=(document.getElementById('inc-f-note').value||'').trim();
    const assignedSel=document.getElementById('inc-f-assigned');
    const assignedIds=assignedSel?Array.from(assignedSel.selectedOptions).map(o=>parseInt(o.value)).filter(Boolean):[];
    const alarmTime=document.getElementById('inc-f-alarm')?.value||'';
    if(!title){toast('✗ Escribe un título');return;}
    if(!activeHotelId){toast('✗ No hay hotel activo seleccionado');return;}
    if(cu.role==='EMPLOYEE' && dept !== cu.dept){toast('✗ Solo puedes crear incidencias de tu departamento');return;}
    if(cu.role==='ADMIN' && dept !== cu.dept){toast('✗ Solo puedes gestionar incidencias de tu departamento');return;}

    const assignedAsString = JSON.stringify(assignedIds);

    if(id){
      const inc=INCIDENTS.find(i=>i.id===id);if(!inc)return;
      const prevStatus=inc.status;
      Object.assign(inc,{title,dept,prio,status,desc,assigned_to:assignedAsString});
      if(!Array.isArray(inc.history)) inc.history = [];
      if(note) inc.history.push({date:nowStr(),text:note+' — '+cu.name});
      if(status!==prevStatus) inc.history.push({date:nowStr(),text:'Estado: '+prevStatus+' → '+status+' por '+cu.name});
      const updatePayload = {title,dept,prio,status,description:desc,assigned_to:assignedAsString,updated_at:new Date().toISOString(),history:inc.history};
      await persistIncidentRow('update', updatePayload, id);
      safeLSSetJSON(incidentsCacheKey(), INCIDENTS);
      toast('✓ Incidencia actualizada');
    } else {
      const createdIso=new Date().toISOString();
      const newInc={title,dept,prio,status:'ABIERTA',desc,history:[{date:nowStr(),text:'Creada por '+cu.name}],at:createdIso,by:cu.id,id:IDS.inc++,assigned_to:assignedAsString};
      const createPayload = {hotel_id:activeHotelId,title,dept,prio,status:'ABIERTA',description:desc,assigned_to:assignedAsString,created_by:cu.id,created_at:createdIso,updated_at:createdIso,history:newInc.history};
      const saved = await persistIncidentRow('create', createPayload);
      if(saved){ newInc.id=saved.id||newInc.id; newInc.at=saved.created_at||createdIso; }
      INCIDENTS.unshift(newInc);
      safeLSSetJSON(incidentsCacheKey(), INCIDENTS);
      toast('✓ Incidencia creada');
    }

    if(alarmTime){
      const alarmObj={hotel_id:activeHotelId,title:'[Inc] '+title,note:dept+' — '+(desc||'').slice(0,80),alarm_time:alarmTime,dept:dept,done:false,created_by:cu.id};
      try{
        const sa=await SB.post('nh_alarms',alarmObj);
        const row=(Array.isArray(sa)&&sa[0])?sa[0]:null;
        ALARMS.unshift({...alarmObj,id:row?row.id:Date.now()});
        safeLSSetJSON(alarmsCacheKey(), ALARMS);
      }catch(e){ console.warn('Alarm create error', e); }
    }

    try{ if(document.activeElement && typeof document.activeElement.blur==='function') document.activeElement.blur(); }catch(_){}
    closeModal('modal-incident');
    buildNotifications();
    updateBadges();
    setTimeout(()=>{ try{ renderIncidents(); }catch(_){} try{ renderDashboard(); }catch(_){}; window.scrollTo({top:0,left:0,behavior:'instant'}); }, 60);
  }catch(e){
    console.error('saveIncident error', e);
    alert('Error al guardar la incidencia: ' + (e?.message || JSON.stringify(e)));
  }
}

async function quickStatus(id, status) {
  const inc = INCIDENTS.find(x => x.id===id);
  if (!inc) return;
  const canEdit=cu.role==='SUPER_ADMIN'||(cu.role==='ADMIN'&&inc.dept===cu.dept)||inc.by==cu.id;
  if(!canEdit){toast('✗ No tienes permiso para cambiar el estado');return;}
  inc.status = status;
  inc.history.push({ date: nowStr(), text: `Estado cambiado a ${status} por ${cu.name}` });
  try {
    await SB.patch('nh_incidents', `?id=eq.${id}`, { status, history: inc.history, updated_at: new Date().toISOString() });
  } catch(e) { toast('✗ Error al actualizar'); return; }
  buildNotifications();
  updateBadges();
  renderIncidents();
  renderDashboard();
  toast(` Estado → ${status}`);
}
function renderAlarms(){
  const container=document.getElementById('alarms-list');
  const isS=cu.role==='SUPER_ADMIN';
  // Employees and admins only see their department's alarms
  let visibleAlarms = isS ? ALARMS : ALARMS.filter(a => a.dept===cu.dept || a.created_by===cu.id);
  if(!visibleAlarms.length){container.innerHTML='<div class="empty"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div><div class="empty-text">Sin alarmas programadas</div><div class="empty-sub">Crea un recordatorio con el botón de arriba</div></div>';return;}
  container.innerHTML=visibleAlarms.map(a=>`
    <div class="alarm-item${a.done?' done':''}" onclick="openEditAlarm(${a.id})">
      <div class="alarm-left">
        <span style="font-size:20px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>
        <div>
          <div class="alarm-title-text">${a.title}${a.done?' <span style="font-weight:400;opacity:0.6">— Completada</span>':''}</div>
          <div class="alarm-note-text">${a.note||''}</div>
          <div class="alarm-time-text"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${a.time?a.time.replace('T',' '):a.alarm_time?a.alarm_time.replace('T',' '):''} · <span class="badge badge-gray" style="font-size:10px;padding:2px 7px">${a.dept||cu.dept}</span></div>
        </div>
      </div>
      <div class="alarm-actions">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openEditAlarm(${a.id})">Editar</button>
        ${!a.done?`<button class="btn btn-green btn-sm" onclick="event.stopPropagation();doneAlarm(${a.id})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg> Hecho</button>`:''}
        <button class="btn btn-outline btn-sm" onclick="deleteAlarm(${a.id})" style="padding:7px 10px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>`).join('');
}


function openNewAlarm(){
  document.getElementById('af-id').value='0';
  document.getElementById('modal-alarm-title').textContent='Nueva Alarma';
  document.getElementById('af-save-btn').textContent='Crear Alarma';
  document.getElementById('af-title').value='';
  document.getElementById('af-note').value='';
  const n=new Date();n.setMinutes(0);n.setSeconds(0);
  document.getElementById('af-time').value=n.toISOString().slice(0,16);
  const deptSel=document.getElementById('af-dept');
  const isS=cu.role==='SUPER_ADMIN';
  const opts=isS?['Todos',...DEPTS]:[cu.dept];
  deptSel.innerHTML=opts.map(d=>`<option value="${d}">${d}</option>`).join('');
  deptSel.value=cu.dept;
  deptSel.disabled=!isS;
  openModal('modal-alarm');
}

function openEditAlarm(id){
  const a = ALARMS.find(x => x.id===id);
  if(!a) return;
  const canEdit = cu.role==='SUPER_ADMIN' || a.created_by===cu.id || a.dept===cu.dept;
  if(!canEdit){ toast('✗ No tienes permiso para editar esta alarma'); return; }
  document.getElementById('af-id').value=String(id);
  document.getElementById('modal-alarm-title').textContent='Editar Alarma';
  document.getElementById('af-save-btn').textContent='Guardar cambios';
  document.getElementById('af-title').value=a.title||'';
  document.getElementById('af-note').value=a.note||'';
  document.getElementById('af-time').value=(a.alarm_time||a.time||'').slice(0,16);
  const deptSel=document.getElementById('af-dept');
  const isS=cu.role==='SUPER_ADMIN';
  const opts=isS?['Todos',...DEPTS]:[cu.dept];
  deptSel.innerHTML=opts.map(d=>`<option value="${d}">${d}</option>`).join('');
  deptSel.value=a.dept||cu.dept;
  deptSel.disabled=!isS;
  openModal('modal-alarm');
}

async function saveAlarm(){
  const alarmId=parseInt(document.getElementById('af-id').value)||0;
  const title=document.getElementById('af-title').value.trim();
  const note=document.getElementById('af-note').value.trim();
  const time=document.getElementById('af-time').value;
  const deptVal=document.getElementById('af-dept')?.value||cu.dept;
  if(!title){toast('✗ Escribe un título');return;}
  if(!time){toast('✗ Selecciona fecha y hora');return;}

  if(alarmId){
    const existingLocal = ALARMS.find(x=>x.id===alarmId);
    if(!existingLocal) { toast('✗ No se encuentra la alarma'); return; }
    const canEdit = cu.role==='SUPER_ADMIN' || existingLocal.created_by===cu.id || existingLocal.dept===cu.dept;
    if(!canEdit){ toast('✗ No tienes permiso para editar esta alarma'); return; }
    const body={title,note,alarm_time:time,dept:deptVal,updated_at:new Date().toISOString()};
    try{
      await SB.patch('nh_alarms', `?id=eq.${alarmId}`, body);
      Object.assign(existingLocal, body, {time});
    }catch(e){toast('✗ Error al guardar la alarma');return;}
    closeModal('modal-alarm');
    buildNotifications();updateBadges();renderAlarms();renderDashboard();syncAlarmsToSW();
    toast('✓ Alarma actualizada');
    return;
  }

  const targetDepts=deptVal==='Todos'?[...DEPTS,'Dirección']:[deptVal];
  try{
    for(const dept of targetDepts){
      const obj={hotel_id:activeHotelId,title,note,alarm_time:time,dept,done:false,created_by:cu.id};
      const[saved]=await SB.post('nh_alarms',obj);
      ALARMS.unshift({...obj,id:saved?saved.id:IDS.alarm++,time});
    }
  }catch(e){toast('✗ Error Supabase');return;}
  closeModal('modal-alarm');
  buildNotifications();updateBadges();renderAlarms();renderDashboard();
  syncAlarmsToSW();
  toast('✓ Alarma creada'+(deptVal==='Todos'?' para todos los departamentos':''));
}

// ── AGENDA PRIVADA ───────────────────────────────────────────
let agendaUserId = null;
let agendaDate = todayLocalISO();
function agendaKeyFor(userId, dateStr){ return 'agenda:'+String(userId)+':'+String(dateStr||agendaDate); }
function agendaDateObj(){ return new Date((agendaDate||todayLocalISO())+'T12:00:00'); }
function agendaDateTitle(dateStr){
  const d = new Date((dateStr||agendaDate||todayLocalISO())+'T12:00:00');
  return d.toLocaleDateString('es-ES',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
}
function agendaDateSub(dateStr){
  const d = new Date((dateStr||agendaDate||todayLocalISO())+'T12:00:00');
  const week = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
  return 'Página diaria · Semana '+week;
}
function agendaEditorEl(){ return document.getElementById('agenda-editor-html'); }
function renderAgenda(){
  const isS = cu.role==='SUPER_ADMIN';
  const tabs = document.getElementById('agenda-sa-tabs');
  const meta = document.getElementById('agenda-meta');
  const subtitle = document.getElementById('agenda-subtitle');
  const titleEl = document.getElementById('agenda-date-title');
  const subEl = document.getElementById('agenda-date-sub');
  const editor = agendaEditorEl();
  if(!tabs||!editor||!meta) return;
  if(isS){
    const users = [cu, ...USERS.filter(u=>u.active!==false && String(u.id)!==String(cu.id))];
    if(!agendaUserId || !users.some(u=>String(u.id)===String(agendaUserId))) agendaUserId = cu.id;
    tabs.innerHTML = users.map(u=>`<div class="chip${String(agendaUserId)===String(u.id)?' active':''}" onclick="selectAgendaUser(${u.id})">${String(u.id)===String(cu.id)?'Mi agenda':u.name}</div>`).join('');
    subtitle.textContent = 'Agenda diaria privada. Cada empleado solo ve la suya y tú como Super Admin puedes revisar todas, incluida la tuya.';
  } else {
    agendaUserId = cu.id;
    tabs.innerHTML = '';
    subtitle.textContent = 'Tu agenda diaria privada. Solo la ves tú y el Super Admin.';
  }
  const key = agendaKeyFor(agendaUserId, agendaDate);
  const note = NOTES[key];
  editor.innerHTML = note && note.content ? note.content : '';
  titleEl.textContent = agendaDateTitle(agendaDate).replace(/^./,m=>m.toUpperCase());
  subEl.textContent = agendaDateSub(agendaDate);
  const currentUser = USERS.find(u=>String(u.id)===String(agendaUserId)) || (String(agendaUserId)===String(cu.id)?cu:cu);
  meta.textContent = note?.updatedAt ? `${currentUser.name} · Guardado: ${new Date(note.updatedAt).toLocaleString('es-ES')}` : `${currentUser.name} · ${agendaDate} · Sin guardar aún`;
}
function selectAgendaUser(userId){ agendaUserId = userId; renderAgenda(); }
function agendaMoveDay(delta){ const d=agendaDateObj(); d.setDate(d.getDate()+delta); agendaDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; renderAgenda(); }
function agendaJumpToday(){ agendaDate = todayLocalISO(); renderAgenda(); }
function agendaFocus(){ const el=agendaEditorEl(); if(el) el.focus(); }
function agendaCmd(cmd, value=null){ agendaFocus(); try{ document.execCommand(cmd,false,value); }catch(e){ console.warn('agendaCmd',e); } }
function agendaColor(color){ agendaCmd('styleWithCSS', true); agendaCmd('foreColor', color); }
function agendaHighlight(color){ agendaCmd('styleWithCSS', true); agendaCmd('hiliteColor', color); }
function agendaHeading(){ agendaFocus(); try{ document.execCommand('formatBlock', false, 'h2'); }catch(e){} agendaColor('#2e4a1e'); }
async function saveAgenda(){
  const editor = agendaEditorEl();
  if(!editor){ alert('No se ha encontrado el editor de agenda.'); return; }
  const targetUserId = (cu.role==='SUPER_ADMIN' && agendaUserId) ? agendaUserId : cu.id;
  const key = agendaKeyFor(targetUserId, agendaDate);
  const html = editor.innerHTML || '';
  try{
    await persistNote(key, html, cu.name);
    NOTES[key] = Object.assign({}, NOTES[key]||{}, {content:html, raw:html, updatedAt:new Date().toISOString(), author:cu.name});
    cacheNotesToLocal();
    const meta = document.getElementById('agenda-meta');
    const targetUser = USERS.find(u=>String(u.id)===String(targetUserId)) || (String(targetUserId)===String(cu.id)?cu:cu);
    if(meta) meta.textContent = `${targetUser.name} · Guardado: ${new Date().toLocaleString('es-ES')}`;
    toast('✓ Agenda guardada');
  }catch(e){
    console.error('saveAgenda error', e);
    alert('No se ha podido guardar la agenda: ' + (e?.message || JSON.stringify(e)));
  }
}
window.agendaMoveDay = agendaMoveDay;
window.agendaJumpToday = agendaJumpToday;
window.saveAgenda = saveAgenda;
window.selectAgendaUser = selectAgendaUser;
document.addEventListener('click', function(ev){
  const t = ev.target.closest('[data-agenda-action]');
  if(!t) return;
  const a=t.getAttribute('data-agenda-action');
  if(a==='today') agendaJumpToday();
  if(a==='save') saveAgenda();
});

async function doneAlarm(id){
  const a = ALARMS.find(x => x.id===id);
  if (!a) return;
  const canAct=cu.role==='SUPER_ADMIN'||a.dept===cu.dept||a.created_by===cu.id;
  if(!canAct){toast('✗ No tienes permiso para modificar esta alarma');return;}
  a.done = true;
  try { await SB.patch('nh_alarms', `?id=eq.${id}`, { done: true }); } catch(e) {}
  NOTIFICATIONS = NOTIFICATIONS.filter(n => n.alarmId !== id);
  updateBadges();
  renderAlarms();
  syncAlarmsToSW();
  toast('✓ Alarma completada');
}

async function markAlarmDoneFromDash(id){
  await doneAlarm(id);
  renderDashboard();
}

async function deleteAlarm(id){
  const a = ALARMS.find(x => x.id===id);
  if(!a) return;
  const canAct=cu.role==='SUPER_ADMIN'||a.dept===cu.dept||a.created_by===cu.id;
  if(!canAct){toast('✗ No tienes permiso para eliminar esta alarma');return;}
  try { await SB.delete('nh_alarms', `?id=eq.${id}`); } catch(e) { toast('✗ Error'); return; }
  ALARMS = ALARMS.filter(x => x.id !== id);
  NOTIFICATIONS = NOTIFICATIONS.filter(n => n.alarmId !== id);
  updateBadges();
  renderAlarms();
  syncAlarmsToSW();
}

function renderTeam(){
  const isS=cu.role==='SUPER_ADMIN';
  const isA=cu.role==='ADMIN';
  let users=USERS.filter(u=>u.active);
  if(!isS)users=users.filter(u=>u.dept===cu.dept);
  document.getElementById('team-sub').textContent=`${users.length} miembro${users.length!==1?'s':''} activos`;

  const depts=['Todos',...new Set(users.map(u=>u.dept))];
  document.getElementById('team-chips').innerHTML=depts.map(d=>`<div class="chip${teamDeptFilter===d?' active':''}" onclick="setTeamDept('${d}',this)">${d==='Todos'?d:D_ICONS[d]+' '+d}</div>`).join('');

  let filtered=teamDeptFilter==='Todos'?users:users.filter(u=>u.dept===teamDeptFilter);
  document.getElementById('team-grid').innerHTML=filtered.map(u=>`
    <div class="emp-card">
      <div class="emp-avatar" style="background:${D_COLORS[u.dept]||'#2e4a1e'}">${u.name[0]}</div>
      <div class="emp-info">
        <div class="emp-name">${u.name}</div>
        <div class="emp-dept">${D_ICONS[u.dept]||''} ${u.dept}</div>
        <div style="margin-top:6px"><span class="badge ${roleBadge(u.role)}">${roleLabel(u.role)}</span></div>
      </div>
      ${(isS||isA)?`<button class="btn btn-outline btn-sm" onclick="editUser(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`:''}
    </div>`).join('');
}

function setTeamDept(d,el){teamDeptFilter=d;document.querySelectorAll('#team-chips .chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderTeam();}

async function saveUserWithFeedback(){
  const btn = document.getElementById('btn-save-user');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Guardando...'; }
  try { await saveUser(); } finally {
    if(btn){ btn.disabled=false; btn.textContent='Guardar'; }
  }
}

function openAddUser(){
  document.getElementById('uf-id').value='';
  document.getElementById('uf-name').value='';
  document.getElementById('uf-email').value='';
  document.getElementById('uf-pwd').value='';
  document.getElementById('uf-role').value='EMPLOYEE';
  const deptSel0=document.getElementById('uf-dept');
  if(deptSel0 && deptSel0.options.length) deptSel0.selectedIndex=0;
  document.getElementById('modal-user-title').textContent='Nuevo Usuario';
  document.getElementById('pwd-optional').style.display='none';
  // Lock dept for ADMIN and hide SUPER_ADMIN option
  const deptSel=document.getElementById('uf-dept');
  const roleSel=document.getElementById('uf-role');
  if(cu.role==='ADMIN'){
    deptSel.value=cu.dept; deptSel.disabled=true;
    // Remove SUPER_ADMIN option if present
    Array.from(roleSel.options).forEach(o=>{if(o.value==='SUPER_ADMIN')o.disabled=true;});
  } else {
    deptSel.disabled=false;
    Array.from(roleSel.options).forEach(o=>o.disabled=false);
  }
  openModal('modal-user');
}

function editUser(id){
  const u=USERS.find(x=>x.id===id);if(!u)return;
  document.getElementById('uf-id').value=id;
  document.getElementById('uf-name').value=u.name;
  document.getElementById('uf-email').value=u.email;
  document.getElementById('uf-pwd').value='';
  document.getElementById('uf-dept').value=u.dept;
  document.getElementById('uf-role').value=u.role;
  document.getElementById('modal-user-title').textContent='Editar Usuario';
  document.getElementById('pwd-optional').style.display='';
  const deptSel=document.getElementById('uf-dept');
  const roleSel=document.getElementById('uf-role');
  if(cu.role==='ADMIN'){
    deptSel.disabled=true;
    Array.from(roleSel.options).forEach(o=>{if(o.value==='SUPER_ADMIN')o.disabled=true;});
  } else {
    deptSel.disabled=false;
    Array.from(roleSel.options).forEach(o=>o.disabled=false);
  }
  openModal('modal-user');
}

async function saveUser(){
  const id=parseInt(document.getElementById('uf-id').value)||0;
  const name=document.getElementById('uf-name').value.trim();
  const email=document.getElementById('uf-email').value.trim().toLowerCase();
  const dept=document.getElementById('uf-dept').value;
  const role=document.getElementById('uf-role').value;
  const pwd=document.getElementById('uf-pwd').value.trim();
  if(!name||!email){toast('✗ Nombre y email son obligatorios');return;}
  // ADMIN cannot create or assign SUPER_ADMIN role
  if(cu.role==='ADMIN' && role==='SUPER_ADMIN'){toast('✗ No tienes permiso para asignar el rol de Super Admin');return;}
  // ADMIN can only manage users in their own department
  if(cu.role==='ADMIN' && dept !== cu.dept){toast('✗ Solo puedes gestionar usuarios de tu departamento');return;}
  // Check for duplicate email only within the SAME hotel
  const emailExists = USERS.find(u => u.email && u.email.toLowerCase()===email && u.id!==id && u.hotel_id===activeHotelId);
  if(emailExists){toast('✗ Ya existe un usuario con ese email en este hotel: '+emailExists.name);return;}
  if(id){
    const u=USERS.find(x=>x.id===id);if(!u)return;
    const upd={name,email,dept,role};
    if(pwd) upd.pwd=pwd;
    try{
      await SB.patch('nh_users','?id=eq.'+id,upd);
      Object.assign(u,upd);
    }catch(e){
      const msg=e.message||'';
      if(msg.includes('duplicate')||msg.includes('unique')){toast('✗ Ese email ya está en uso');}
      else{toast('✗ Error al guardar: '+(msg.slice(0,80)||'Supabase'));}
      return;
    }
    toast('✓ Usuario actualizado');
  }else{
    if(!pwd){toast('✗ La contraseña es obligatoria para nuevos usuarios');return;}
    if(pwd.length < 4){toast('✗ La contraseña debe tener al menos 4 caracteres');return;}
    const newU={name,email,dept,role,pwd,active:true,hotel_id:activeHotelId,id:IDS.user++};
    try{
      const result=await SB.post('nh_users',{hotel_id:activeHotelId,name,email,dept,role,pwd,active:true});
      const saved=Array.isArray(result)?result[0]:result;
      if(saved && saved.id) newU.id=saved.id;
    }catch(e){
      const msg=(e.message||'').toLowerCase();
      if(msg.includes('duplicate')||msg.includes('unique')||msg.includes('23505')){
        // This happens if Supabase has a global UNIQUE on email — needs to be UNIQUE(hotel_id,email)
        toast('✗ Email duplicado en BD. Ve a Supabase → nh_users → elimina el índice único de "email" y crea uno en (hotel_id, email)');
      } else if(msg.includes('hotel_id')||msg.includes('foreign')){
        toast('✗ Error de hotel. Recarga la página e intenta de nuevo.');
      } else if(msg.includes('null')&&msg.includes('hotel')){
        toast('✗ Error: no hay hotel activo. Ve a Hoteles y selecciona uno.');
      } else {
        toast('✗ Error al crear usuario: '+(e.message||'').slice(0,100)||'Error de conexión');
      }
      console.error('saveUser error:', e.message||e);
      return;
    }
    USERS.push(newU);
    toast('✓ Usuario '+name+' creado correctamente');
  }
  closeModal('modal-user');renderAdmin();renderTeam();
}

// ══════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════
function renderAdmin(){
  const usersHtml = USERS.filter(u=>u.active).map(u=>`
    <tr>
      <td><strong>${u.name}</strong></td>
      <td style="font-size:12px;color:var(--ink-muted)">${u.email}</td>
      <td>${D_ICONS[u.dept]||''} ${u.dept}</td>
      <td><span class="badge ${roleBadge(u.role)}">${roleLabel(u.role)}</span></td>
      <td><div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="editUser(${u.id})">✎ Editar</button>
        ${u.id!==cu.id?`<button class="btn btn-red btn-sm" onclick="deleteUser(${u.id})">Eliminar</button>`:''}
      </div></td>
    </tr>`).join('');

  const mobileCardsHtml = USERS.filter(u=>u.active).map(u=>`
    <div class="user-card-mobile">
      <div class="ucm-name">${u.name}</div>
      <div class="ucm-email">${u.email}</div>
      <div class="ucm-row">${D_ICONS[u.dept]||''} <span>${u.dept}</span> · <span class="badge ${roleBadge(u.role)}" style="font-size:11px">${roleLabel(u.role)}</span></div>
      <div class="ucm-actions">
        <button class="btn btn-outline btn-sm" onclick="editUser(${u.id})">✎ Editar</button>
        ${u.id!==cu.id?`<button class="btn btn-red btn-sm" onclick="deleteUser(${u.id})">Eliminar</button>`:''}
      </div>
    </div>`).join('');

  document.getElementById('admin-users-table').innerHTML=usersHtml;
  // Insert mobile cards right after the table wrap
  const mobileContainer = document.getElementById('admin-users-mobile');
  if(mobileContainer) mobileContainer.innerHTML = mobileCardsHtml;

  // Group by dept for admin template list
  const tplByDept = {};
  TEMPLATES.forEach(t=>{ if(!tplByDept[t.dept]) tplByDept[t.dept]=[]; tplByDept[t.dept].push(t); });
  document.getElementById('admin-tpl-list').innerHTML = Object.entries(tplByDept).map(([dept,dtpls])=>`
    <div style="margin-bottom:20px">
      <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:8px;padding:4px 0;border-bottom:1px solid var(--border)">${dept} · ${dtpls.length} plantilla${dtpls.length!==1?'s':''}</div>
      ${dtpls.map(t=>{
        const realCount = t.items.filter(i=>!i.startsWith('##')).length;
        return `<div class="card" style="margin-bottom:8px">
          <div class="card-header" style="cursor:pointer;user-select:none" onclick="toggleAdminTpl(${t.id})">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <span id="admin-tpl-arrow-${t.id}" style="font-size:12px;color:var(--ink-muted);transition:transform 0.2s;display:inline-block">▶</span>
                <div class="card-title" style="font-size:15px">${t.name}</div>
              </div>
              <div style="font-size:11px;color:var(--ink-muted);margin-top:2px;padding-left:20px">${t.shift} · ${realCount} tareas</div>
            </div>
            <div style="display:flex;gap:8px" onclick="event.stopPropagation()">
              <button class="btn btn-outline btn-sm" onclick="editTemplate(${t.id})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>
              <button class="btn btn-red btn-sm" onclick="deleteTemplate(${t.id})">Eliminar</button>
            </div>
          </div>
          <div id="admin-tpl-body-${t.id}" style="display:none">
            <div class="card-body" style="padding-top:6px">
              ${t.items.map(item=>item.startsWith('##')
                ? `<div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--forest);padding:8px 0 4px">${item.replace(/^##\s*/,'')}</div>`
                : `<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--cream-dark);color:var(--ink-light);line-height:1.5">• ${item}</div>`
              ).join('')}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function toggleAdminTpl(id){
  const body = document.getElementById('admin-tpl-body-'+id);
  const arrow = document.getElementById('admin-tpl-arrow-'+id);
  if(!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if(arrow) arrow.style.transform = open ? '' : 'rotate(90deg)';
}

function adminTab(tab,el){
  ['users','templates','config','diagnostics'].forEach(t=>{
    const el2=document.getElementById('admin-'+t);
    if(el2) el2.style.display=t===tab?'':'none';
  });
  document.querySelectorAll('.tab-bar .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  adminTabActive=tab;
  if(tab==='diagnostics') runDiagnostics();
}

// ══════════════════════════════════════════════════════════════
// SUPABASE DIAGNOSTICS
// ══════════════════════════════════════════════════════════════
async function purgeInactiveUsers(){
  if(cu.role!=='SUPER_ADMIN'){toast('✗ Solo Super Admin');return;}
  if(!confirm('¿Eliminar DEFINITIVAMENTE todos los usuarios con active=false de este hotel?\nEsto no se puede deshacer.'))return;
  try{
    await SB.delete('nh_users',`?hotel_id=eq.${activeHotelId}&active=eq.false`);
    USERS=USERS.filter(u=>u.active!==false);
    renderAdmin();renderTeam();
    toast('✓ Usuarios inactivos eliminados de la base de datos');
  }catch(e){toast('✗ Error: '+(e.message||e));}
}

async function runDiagnostics(){
  const container = document.getElementById('diag-results');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-muted)">⏳ Ejecutando tests...</div>';

  const tables = [
    { name:'nh_users',     label:'Usuarios',             write:false },
    { name:'nh_incidents', label:'Incidencias',           write:true  },
    { name:'nh_checklist', label:'Checklists',            write:false },
    { name:'nh_alarms',    label:'Alarmas',              write:false },
    { name:'nh_templates', label:'Plantillas',            write:false },
    { name:'nh_notes',     label:'Agenda / notas privadas',        write:false },
    { name:'nh_hotels',    label:'Hoteles',              write:false },
    { name:'nh_config',    label:'Configuración',        write:true  },
  ];

  const results = [];

  // 1. Connectivity check
  const t0 = Date.now();
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
    });
    results.push({ label:'Conexión a Supabase', ok: r.ok || r.status===400, detail:`HTTP ${r.status} · ${Date.now()-t0}ms`, type:'conn' });
  } catch(e) {
    results.push({ label:'Conexión a Supabase', ok:false, detail:`Error de red: ${e.message}`, type:'conn' });
  }

  // 2. Table READ tests
  for(const tbl of tables){
    const t1 = Date.now();
    try {
      const rows = await SB.get(tbl.name, `?limit=1`);
      const ok = Array.isArray(rows);
      results.push({
        label: `Lectura: ${tbl.label} (${tbl.name})`,
        ok,
        detail: ok ? `✓ ${rows.length} filas devueltas · ${Date.now()-t1}ms` : `Respuesta inesperada`,
        type:'read'
      });
    } catch(e) {
      results.push({ label:`Lectura: ${tbl.label} (${tbl.name})`, ok:false, detail:`${e.message}`, type:'read' });
    }
  }

  // 3. Detect if hotel_id column exists in nh_config
  let configHasHotelId = false;
  try {
    await SB.get('nh_config', `?hotel_id=eq.${activeHotelId}&limit=1`);
    configHasHotelId = true;
  } catch(e) { configHasHotelId = false; }

  // Add hotel_id status as a result
  results.push({
    label: 'Columna hotel_id en nh_config',
    ok: configHasHotelId,
    detail: configHasHotelId
      ? '✓ Columna existe — soporte multi-hotel activo'
      : '⚠️ Columna no existe — guarda configuración igualmente pero sin separación por hotel. Ejecuta el SQL del botón de abajo para activarla.',
    type: 'write'
  });

  // 4. WRITE test on nh_config (safe - just insert a test key and delete it)
  const t2 = Date.now();
  try {
    const testKey = '_diag_test_'+Date.now();
    const testVal = 'ok_'+Date.now();
    const keyFilter = configHasHotelId ? `?key=eq.${testKey}&hotel_id=eq.${activeHotelId}` : `?key=eq.${testKey}`;
    const existing = await SB.get('nh_config', keyFilter);
    let writeOk = false;
    if(existing && existing.length > 0){
      await SB.patch('nh_config', keyFilter, {value: testVal});
      writeOk = true;
    } else {
      const body = configHasHotelId ? {key:testKey, value:testVal, hotel_id:activeHotelId} : {key:testKey, value:testVal};
      const r = await SB.post('nh_config', body);
      writeOk = Array.isArray(r) && r.length > 0;
    }
    const verify = await SB.get('nh_config', keyFilter);
    const verified = verify && verify[0] && verify[0].value === testVal;
    results.push({
      label:'Escritura + Verificación (nh_config)',
      ok: writeOk && verified,
      detail: verified ? `✓ Dato escrito y leído correctamente · ${Date.now()-t2}ms` : `✗ Escritura no verificada`,
      type:'write'
    });
    // Clean up
    if(!existing || existing.length === 0){
      await SB.delete('nh_config', keyFilter);
    }
  } catch(e) {
    results.push({ label:'Escritura + Verificación (nh_config)', ok:false, detail:`${e.message}`, type:'write' });
  }

  // 5. PATCH test
  const t3 = Date.now();
  try {
    const existing = await SB.get('nh_config', `?limit=1`);
    if(existing && existing.length > 0){
      const row = existing[0];
      const r = await fetch(`${SUPABASE_URL}/rest/v1/nh_config?key=eq.${encodeURIComponent(row.key)}`, {
        method:'PATCH',
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'},
        body: JSON.stringify({value: row.value})
      });
      results.push({
        label:'PATCH (actualizar config existente)',
        ok: r.ok,
        detail: r.ok ? `✓ HTTP ${r.status} · ${Date.now()-t3}ms` : `✗ HTTP ${r.status}`,
        type:'write'
      });
    } else {
      results.push({ label:'PATCH (actualizar config existente)', ok:true, detail:'Sin filas — se usará POST al guardar', type:'write' });
    }
  } catch(e) {
    results.push({ label:'PATCH (actualizar config existente)', ok:false, detail:`${e.message}`, type:'write' });
  }

  // 6. Realtime — wait up to 3s for channels to be ready
  let rtOk = false;
  for(let i=0; i<6; i++){
    if(realtimeChannels && realtimeChannels.length > 0){ rtOk=true; break; }
    await new Promise(r=>setTimeout(r,500));
  }
  results.push({
    label:'WebSocket Realtime',
    ok: rtOk,
    detail: rtOk ? `✓ ${realtimeChannels.length} canales activos` : '✗ Sin canales — prueba recargar la página',
    type:'realtime'
  });

  // Render results
  const icons = { conn:'🌐', read:'📖', write:'✏️', realtime:'⚡' };
  const allOk = results.every(r=>r.ok);
  container.innerHTML = `
    <div style="padding:12px 16px;border-radius:10px;background:${allOk?'#e4eed8':'#fde8e8'};border:1px solid ${allOk?'#b8d4a0':'#f0c0c0'};font-weight:700;font-size:0.9rem;color:${allOk?'var(--forest)':'var(--red)'}">
      ${allOk ? '✅ Todos los tests pasaron correctamente' : '⚠️ Algunos tests fallaron — ver detalles abajo'}
    </div>
    ${results.map(r=>`
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:10px;background:${r.ok?'white':'#fff5f5'};border:1px solid ${r.ok?'var(--border)':'#f0c0c0'}">
        <span style="font-size:1.1rem;flex-shrink:0">${icons[r.type]||'🔹'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.88rem;font-weight:600;color:var(--ink);margin-bottom:3px">${r.label}</div>
          <div style="font-size:0.78rem;color:${r.ok?'var(--ink-muted)':'var(--red)'}">${r.detail}</div>
        </div>
        <span style="font-size:1.1rem;flex-shrink:0">${r.ok?'✅':'❌'}</span>
      </div>`).join('')}
  `;

  // Show config state
  try {
    const cfg = await SB.get('nh_config', `?hotel_id=eq.${activeHotelId}&order=id.desc`);
    const configCard = document.getElementById('diag-config-card');
    const configBody = document.getElementById('diag-config-body');
    configCard.style.display = '';
    if(!cfg || !cfg.length){
      configBody.innerHTML = '<div style="color:var(--ink-muted);font-size:0.88rem">No hay configuración guardada en la base de datos para este hotel. Los colores y fuente son los valores por defecto.</div>';
    } else {
      const seen = new Set();
      const deduped = cfg.filter(r=>{ if(seen.has(r.key)) return false; seen.add(r.key); return true; });
      const hasDups = cfg.length > deduped.length;
      configBody.innerHTML = `
        ${hasDups ? `<div style="padding:10px 14px;background:#fef3e2;border:1px solid #f0d0a0;border-radius:8px;font-size:0.82rem;color:var(--amber);margin-bottom:14px">
          ⚠️ Se detectaron <strong>${cfg.length - deduped.length} filas duplicadas</strong> en nh_config. La app las gestiona correctamente (usa siempre la más reciente), pero puedes limpiarlas desde el SQL Editor de Supabase.
          <br><br><code style="font-size:0.75rem;background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:4px">DELETE FROM nh_config WHERE id NOT IN (SELECT MAX(id) FROM nh_config GROUP BY key, hotel_id);</code>
        </div>` : ''}
        <div style="font-size:0.78rem;color:var(--ink-muted);margin-bottom:10px">${deduped.length} claves configuradas · ${cfg.length} filas totales en BD</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${deduped.map(r=>`
            <div style="padding:8px 12px;background:var(--cream);border-radius:8px;border:1px solid var(--border)">
              <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted)">${r.key}</div>
              <div style="font-size:0.85rem;color:var(--ink);margin-top:3px;display:flex;align-items:center;gap:6px">
                ${r.key.startsWith('color_') ? `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${r.value};border:1px solid var(--border);flex-shrink:0"></span>` : ''}
                ${r.value}
              </div>
            </div>`).join('')}
        </div>`;
    }
  } catch(e){}
}

// ══════════════════════════════════════════════════════════════
// USERS — Supabase version
// ══════════════════════════════════════════════════════════════

async function deleteUser(id){
  if(cu.role!=='SUPER_ADMIN'&&cu.role!=='ADMIN'){toast('✗ No tienes permiso');return;}
  const u = USERS.find(x => x.id===id);
  if(!u){toast('✗ Usuario no encontrado');return;}
  if(u.role==='SUPER_ADMIN'){toast('✗ No puedes eliminar al Super Admin');return;}
  if(cu.role==='ADMIN'&&(u.dept!==cu.dept||u.role==='SUPER_ADMIN')){toast('✗ No puedes eliminar a este usuario');return;}
  if(!confirm(`¿Eliminar a ${u.name} del sistema?\n\nEsta acción no se puede deshacer.`)) return;
  try {
    await SB.delete('nh_users', `?id=eq.${id}`);
    USERS = USERS.filter(x => x.id !== id);
    renderAdmin();
    renderTeam();
    toast('✓ Usuario eliminado del sistema');
  } catch(e) { toast('✗ Error al eliminar: '+(e.message||e)); }
}


// ══════════════════════════════════════════════════════════════
// TEMPLATES — Supabase version
// ══════════════════════════════════════════════════════════════
function openNewTemplate(){
  document.getElementById('tf-id').value='';
  document.getElementById('tf-name').value='';
  document.getElementById('tf-items').value='';
  document.getElementById('tf-shift').value='Turno Mañana';
  document.getElementById('modal-tpl-title').textContent='Nueva Plantilla';
  // Lock dept for ADMIN
  const deptSel=document.getElementById('tf-dept');
  if(cu.role==='ADMIN'){deptSel.value=cu.dept;deptSel.disabled=true;}
  else deptSel.disabled=false;
  openModal('modal-template');
}
function editTemplate(id){
  const t=TEMPLATES.find(x=>x.id===id);if(!t)return;
  document.getElementById('tf-id').value=id;
  document.getElementById('tf-name').value=t.name;
  document.getElementById('tf-dept').value=t.dept;
  document.getElementById('tf-shift').value=t.shift;
  document.getElementById('tf-items').value=t.items.join('\n');
  document.getElementById('modal-tpl-title').textContent='Editar Plantilla';
  const deptSel=document.getElementById('tf-dept');
  if(cu.role==='ADMIN'){deptSel.value=cu.dept;deptSel.disabled=true;}
  else deptSel.disabled=false;
  openModal('modal-template');
}

async function saveTemplate(){
  if(cu.role==='EMPLOYEE'){toast('✗ No tienes permiso para crear o editar plantillas');return;}
  const id=parseInt(document.getElementById('tf-id').value)||0;
  const name=document.getElementById('tf-name').value.trim();
  const dept=document.getElementById('tf-dept').value;
  const shift=document.getElementById('tf-shift').value;
  const rawItems=document.getElementById('tf-items').value;
  const items=rawItems.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!name){toast('✗ Escribe un nombre');return;}
  if(!items.length){toast('✗ Añade al menos un item');return;}
  if(id){
    const t=TEMPLATES.find(x=>x.id===id);if(!t)return;
    Object.assign(t,{name,dept,shift,items});
    try{await SB.patch('nh_templates','?id=eq.'+id,{name,dept,shift,items});}
    catch(e){toast('✗ Error Supabase');return;}
    toast('✓ Plantilla actualizada');
  }else{
    const newT={name,dept,shift,items,id:IDS.tpl++};
    try{
      const[saved]=await SB.post('nh_templates',{hotel_id:activeHotelId,name,dept,shift,items});
      if(saved) newT.id=saved.id;
    }catch(e){toast('✗ Error Supabase');return;}
    TEMPLATES.push(newT);
    toast('✓ Plantilla creada');
  }
  closeModal('modal-template');renderAdmin();renderChecklists();
}

// ══════════════════════════════════════════════════════════════
// HOTELS
// ══════════════════════════════════════════════════════════════
// activeHotelId defined above near hotel context section

function renderHotels(){
  const grid=document.getElementById('hotels-grid');
  grid.innerHTML=HOTELS.map(h=>`
    <div class="hotel-card" style="${activeHotelId===h.id?'border-color:var(--forest);border-width:2px;background:var(--forest-light)':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap">
        <div style="font-size:32px;line-height:1;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="#2e4a1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-outline btn-sm" onclick="editHotel(${h.id})">✎ Editar</button>
          <button class="btn btn-red btn-sm" onclick="toggleHotelActive(${h.id})">${h.active?'Desactivar':'Activar'}</button>
        </div>
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;margin-bottom:8px;word-break:normal;overflow-wrap:normal;white-space:normal;line-height:1.3">${h.name}</div>
      <div style="font-size:13px;color:var(--ink-muted);line-height:1.8;margin-bottom:14px">
        📍 ${h.city||'—'}<br>
        🛏️ ${h.rooms||0} habitaciones<br>
        👤 Director/a: ${h.manager||'—'}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="badge ${h.active?'badge-green':'badge-gray'}">${h.active?'✓ Activo':'Inactivo'}</span>
        ${activeHotelId===h.id
          ? `<span class="badge badge-gold">★ Hotel activo</span>`
          : h.active ? `<button class="btn btn-green btn-sm" onclick="switchToHotel(${h.id})">→ Ir a este hotel</button>` : ''}
      </div>
    </div>`).join('')+`
    <div class="hotel-card" style="border:2px dashed var(--border);background:transparent;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;cursor:pointer;min-height:180px" onclick="openAddHotel()">
      <div style="font-size:40px;color:var(--ink-muted)">+</div>
      <div style="font-size:14px;font-weight:600;color:var(--ink-muted)">Añadir Nuevo Hotel</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// HOTEL CONTEXT — qué hotel está activo ahora mismo
// ══════════════════════════════════════════════════════════════
let activeHotelId = 1; // empieza en hotel 1 (Noctis Soria / primer hotel)
let activeHotelName = '';

async function switchToHotel(id){
  const h = HOTELS.find(x => x.id === id);
  if(!h) return;
  if(!confirm(`¿Cambiar al hotel "${h.name}"?\n\nSe cargarán los empleados, checklists e incidencias de ese hotel.`)) return;
  activeHotelId = id;
  activeHotelName = h.name;
  // Update topbar
  const topHotel = document.getElementById('top-hotel');
  if(topHotel){ topHotel.textContent = h.name; topHotel.style.display=''; }
  toast('⏳ Cargando datos de ' + h.name + '...');
  try {
    await loadHotelData();
    await loadNotes();
    applyConfigFromDB && await applyConfigFromDB();
    startRealtime();
    renderHotels();
    populateSelects();
    navTo('dashboard', document.getElementById('nav-dashboard'));
    toast('✓ Ahora gestionando: ' + h.name);
  } catch(e) {
    toast('✗ Error al cargar hotel: '+(e.message||e));
  }
}

// Carga solo los datos del hotel activo (usuarios, plantillas, incidencias, alarmas, checklists)
async function loadHotelData(){
  const hid = activeHotelId;
  const today = new Date().toISOString().slice(0,10);
  const weekStart = getChkDate('Semanal');
  const monthStart = today.slice(0,8)+'01';
  const datesToLoad = [...new Set([today, weekStart, monthStart])];
  try {
    const chkQueries = datesToLoad.map(d => SB.get('nh_checklist', `?hotel_id=eq.${hid}&date=eq.${d}`).catch(()=>[]));
    const [users, templates, incidents, alarms, ...chkResults] = await Promise.all([
      sbGetFlexible('nh_users', hid, 'active=eq.true&order=id'),
      sbGetFlexible('nh_templates', hid, 'order=id'),
      sbGetFlexible('nh_incidents', hid, 'order=id.desc'),
      sbGetFlexible('nh_alarms', hid, 'order=id.desc'),
      ...chkQueries,
    ]);
    if(users && users.length) USERS = users.map(u=>({...u}));
    else USERS = safeLSGetJSON(usersCacheKey(), USERS || []) || [];
    if(templates && templates.length) TEMPLATES = templates.map(t=>({...t, items: Array.isArray(t.items)?t.items:JSON.parse(t.items||'[]')}));
    else TEMPLATES = safeLSGetJSON(templatesCacheKey(), TEMPLATES || []) || [];
    if(incidents && incidents.length) INCIDENTS = incidents.map(i=>({...i, desc:i.description, by:i.created_by, at:i.created_at, assigned_to:i.assigned_to||'[]', history:Array.isArray(i.history)?i.history:JSON.parse(i.history||'[]')}));
    else INCIDENTS = safeLSGetJSON(incidentsCacheKey(), INCIDENTS || []) || [];
    if(alarms && alarms.length) ALARMS = alarms.map(a=>({...a, time:a.alarm_time}));
    else ALARMS = safeLSGetJSON(alarmsCacheKey(), ALARMS || []) || [];
    CHK = {};
    chkResults.forEach(rows=>{
      if(!rows) return;
      rows.forEach(row=>{
        const key=`${row.template_id}-${row.date}-${row.item_index}`;
        CHK[key]={user:row.user_name, time:row.completed_at?new Date(row.completed_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'', dbId:row.id};
      });
    });
    if(USERS.length)      IDS.user  = Math.max(...USERS.map(u=>u.id))+1;
    if(INCIDENTS.length)  IDS.inc   = Math.max(...INCIDENTS.map(i=>i.id))+1;
    if(ALARMS.length)     IDS.alarm = Math.max(...ALARMS.map(a=>a.id))+1;
    if(TEMPLATES.length)  IDS.tpl   = Math.max(...TEMPLATES.map(t=>t.id))+1;
    cacheHotelDataToLocal();
    syncAlarmsToSW();
  } catch(e){
    console.warn('loadHotelData error:', e.message);
    loadHotelDataFromLocal();
  }
  try { await loadNotes(); } catch(e){ loadNotesFromLocal(); }
}

function openAddHotel(){
  document.getElementById('hf-id').value='';
  ['hf-name','hf-city','hf-manager'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('hf-rooms').value='';
  document.getElementById('hf-active').value='true';
  document.getElementById('modal-hotel-title').textContent='Añadir Hotel';
  document.getElementById('btn-save-hotel').textContent='Añadir Hotel';
  openModal('modal-hotel');
}

function editHotel(id){
  const h=HOTELS.find(x=>x.id===id);if(!h)return;
  document.getElementById('hf-id').value=id;
  document.getElementById('hf-name').value=h.name;
  document.getElementById('hf-city').value=h.city||'';
  document.getElementById('hf-rooms').value=h.rooms||'';
  document.getElementById('hf-manager').value=h.manager||'';
  document.getElementById('hf-active').value=String(h.active);
  document.getElementById('modal-hotel-title').textContent='Editar Hotel';
  document.getElementById('btn-save-hotel').textContent='Guardar Cambios';
  openModal('modal-hotel');
}

async function saveHotel(){
  const name=document.getElementById('hf-name').value.trim();
  if(!name){toast('Nombre del hotel obligatorio');return;}
  const editId=parseInt(document.getElementById('hf-id').value);
  const data={name,city:document.getElementById('hf-city').value,rooms:parseInt(document.getElementById('hf-rooms').value)||0,manager:document.getElementById('hf-manager').value,active:document.getElementById('hf-active').value==='true'};
  if(editId){
    try{await SB.patch('nh_hotels',`?id=eq.${editId}`,data);const h=HOTELS.find(x=>x.id===editId);if(h)Object.assign(h,data);}
    catch(e){toast('✗ Error al guardar');return;}
  } else {
    try{const[saved]=await SB.post('nh_hotels',data);HOTELS.push(saved);}
    catch(e){toast('✗ Error al guardar');return;}
  }
  closeModal('modal-hotel');renderHotels();toast(editId?'✓ Hotel actualizado':'✓ Hotel añadido');
}

async function toggleHotelActive(id){
  const h=HOTELS.find(x=>x.id===id);if(!h)return;
  h.active=!h.active;
  try{await SB.patch('nh_hotels','?id=eq.'+id,{active:h.active});}
  catch(e){toast('✗ Error Supabase');return;}
  renderHotels();
  toast(h.active?'✓ Hotel activado':'✓ Hotel desactivado');
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// CONFIG / COLORS
// ══════════════════════════════════════════════════════════════
function applyColor(key, val){
  const map={
    forest:    '--forest',
    topbar:    '--topbar-bg',
    gold:      '--gold',
    red:       '--red',
    cream:     '--cream',
    'forest-light': '--forest-light',
    amber:     '--amber',
    blue:      '--blue',
    forest2:   '--forest-ok',   // separate var for "OK green" badges/checklists
    border:    '--border'
  };
  if(map[key]) document.documentElement.style.setProperty(map[key], val);
  // Also update red-light when red changes (derived color)
  if(key==='red'){
    // lighten red for backgrounds — just set opacity version
    document.documentElement.style.setProperty('--red-light', val+'22');
  }
  const valEl=document.getElementById('cfg-'+key+'-val');
  if(valEl) valEl.textContent=val;
}

function applyKpiColor(idx, val){
  const cards = document.querySelectorAll('.kpi-card');
  if(cards[idx]){
    cards[idx].style.background = val;
    cards[idx].style.borderColor = val;
  }
  const ids = ['cfg-kpi1','cfg-kpi2','cfg-kpi3','cfg-kpi4'];
  const valEl = document.getElementById(ids[idx]+'-val');
  if(valEl) valEl.textContent = val;
  // Store in memory for save
  if(!window._kpiColors) window._kpiColors = ['#2e4a1e','#8b1a1a','#7a4a0a','#6b4f1a'];
  window._kpiColors[idx] = val;
}

function applyLogoColors(){
  const c1 = document.getElementById('cfg-logo1')?.value || '#ffffff';
  const c2 = document.getElementById('cfg-logo2')?.value || '#8a6d2e';
  const el1 = document.getElementById('logo-noctis');
  const el2 = document.getElementById('logo-hub');
  if(el1) el1.style.color = c1;
  if(el2) el2.style.color = c2;
  const v1 = document.getElementById('cfg-logo1-val');
  const v2 = document.getElementById('cfg-logo2-val');
  if(v1) v1.textContent = c1;
  if(v2) v2.textContent = c2;
}

function applyAllKpiColors(colors){
  if(!colors || !colors.length) return;
  const cards = document.querySelectorAll('.kpi-card');
  colors.forEach((c,i)=>{
    if(cards[i] && c){ cards[i].style.background=c; cards[i].style.borderColor=c; }
    const inp = document.getElementById('cfg-kpi'+(i+1));
    const val = document.getElementById('cfg-kpi'+(i+1)+'-val');
    if(inp) inp.value = c;
    if(val) val.textContent = c;
  });
  window._kpiColors = colors;
}

async function saveConfigWithConfirm(){
  if(cu.role!=='SUPER_ADMIN'){toast('✗ Solo el Super Admin puede cambiar la configuración');return;}
  if(!confirm('¿Guardar la configuración?\n\nLos cambios de colores y tipografía se aplicarán a todos los usuarios en su próxima sesión.')) return;
  await saveConfig();
}

async function saveConfig(){
  if(cu.role!=='SUPER_ADMIN'){toast('✗ Solo el Super Admin puede cambiar la configuración');return;}
  const fontVal = document.getElementById('cfg-font')?.value || 'Inter,sans-serif';
  const fontSizeVal = document.getElementById('cfg-fontsize')?.value || '17';
  const hotelNameVal = document.getElementById('cfg-hotel')?.value || '';
  const appNameVal = document.getElementById('cfg-appname')?.value || 'Noctis Hub';
  const keys=['forest','topbar','gold','red','cream','forest-light','amber','blue','forest2','border'];
  const kpiColors = [
    document.getElementById('cfg-kpi1')?.value||'#2e4a1e',
    document.getElementById('cfg-kpi2')?.value||'#8b1a1a',
    document.getElementById('cfg-kpi3')?.value||'#7a4a0a',
    document.getElementById('cfg-kpi4')?.value||'#6b4f1a',
  ];
  const logo1 = document.getElementById('cfg-logo1')?.value||'#ffffff';
  const logo2 = document.getElementById('cfg-logo2')?.value||'#8a6d2e';
  const allUpdates = [
    {key:'font_family', value:fontVal},
    {key:'font_size', value:fontSizeVal},
    {key:'hotel_name', value:hotelNameVal},
    {key:'app_name', value:appNameVal},
    {key:'kpi_colors', value:JSON.stringify(kpiColors)},
    {key:'logo_color1', value:logo1},
    {key:'logo_color2', value:logo2},
    ...keys.map(k=>({key:'color_'+k, value:document.getElementById('cfg-'+k)?.value||''})).filter(u=>u.value)
  ];
  try {
    // Detect if hotel_id column exists by checking first read
    let hasHotelId = false;
    let existing = [];
    try {
      existing = await SB.get('nh_config', `?hotel_id=eq.${activeHotelId}`) || [];
      hasHotelId = true;
    } catch(e) {
      // Column doesn't exist yet — read all rows
      existing = await SB.get('nh_config', ``) || [];
      hasHotelId = false;
    }
    const existingKeys = new Set(existing.map(r=>r.key));

    for(const u of allUpdates){
      const body = hasHotelId ? {...u, hotel_id: activeHotelId} : {...u};
      // Use raw key in filter — encodeURIComponent breaks hyphenated keys like color_forest-light
      const keyFilter = `?key=eq.${u.key}`;
      const filter = hasHotelId
        ? `${keyFilter}&hotel_id=eq.${activeHotelId}`
        : keyFilter;
      if(existingKeys.has(u.key)){
        await SB.patch('nh_config', filter, body);
      } else {
        await SB.post('nh_config', body);
      }
    }
    toast('✓ Configuración guardada — se aplica en todos los dispositivos');
  } catch(e){
    console.warn('saveConfig error:', e);
    toast('✗ Error al guardar: ' + (e.message||e));
  }
}

// Refresh config every 60 seconds so all devices pick up changes automatically
let _configRefreshTimer = null;
function startConfigRefresh(){
  if(_configRefreshTimer) clearInterval(_configRefreshTimer);
  _configRefreshTimer = setInterval(async ()=>{
    if(!cu) return;
    await applyConfigFromDB();
  }, 60000);
}
function stopConfigRefresh(){
  if(_configRefreshTimer){ clearInterval(_configRefreshTimer); _configRefreshTimer=null; }
}

// REPORTS
// ══════════════════════════════════════════════════════════════
let reportPeriod='total';

async function refreshReportData(){
  const btn = document.getElementById('btn-refresh-report');
  if(btn){ btn.disabled=true; btn.innerHTML = '⏳ Cargando...'; }
  try {
    await loadHotelData();
    renderReportStats();
    toast('✓ Datos actualizados — '+INCIDENTS.length+' incidencias cargadas');
  } catch(e){
    toast('✗ Error al cargar datos: '+e.message);
  }
  if(btn){ btn.disabled=false; btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Recargar datos'; }
}

function renderReportStats(){
  const el = document.getElementById('report-live-stats');
  if(!el) return;
  const total = INCIDENTS.length;
  const abiertas = INCIDENTS.filter(i=>i.status==='ABIERTA').length;
  const enProceso = INCIDENTS.filter(i=>i.status==='EN_PROCESO').length;
  const resueltas = INCIDENTS.filter(i=>i.status==='RESUELTA').length;
  const criticas = INCIDENTS.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').length;
  if(!total){ el.innerHTML = `<div style="background:#fdf6e8;border:1px solid #e8d5a0;border-radius:10px;padding:12px 16px;font-size:0.82rem;color:#7a4a0a">⚠️ No hay incidencias cargadas. Pulsa <strong>Recargar datos</strong> para sincronizar con Supabase.</div>`; return; }
  el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:0.82rem">
    <span style="color:var(--ink-muted);font-weight:600">Datos en memoria:</span>
    <span class="badge badge-gray">${total} incidencias total</span>
    <span class="badge badge-red" style="background:#fdf0f0;color:#8b1a1a">${abiertas} abiertas</span>
    <span class="badge badge-amber">${enProceso} en proceso</span>
    <span class="badge badge-green">${resueltas} resueltas</span>
    ${criticas?`<span class="badge" style="background:#8b1a1a;color:white">⚠ ${criticas} críticas</span>`:''}
  </div>`;
}

function setReportPeriod(p,el){
  reportPeriod=p;
  document.querySelectorAll('.chip[id^="rp-"]').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  const cd=document.getElementById('rp-custom-dates');
  cd.style.display=p==='personalizado'?'flex':'none';
}

function getReportDateRange(){
  const now=new Date();
  if(reportPeriod==='total'){
    // No date filter - return very wide range
    return{from:'2020-01-01',to:'2099-12-31',label:'Todo el historial'};
  }
  if(reportPeriod==='hoy'){
    const d=now.toISOString().slice(0,10);return{from:d,to:d,label:'Hoy '+now.toLocaleDateString('es-ES')};
  }
  if(reportPeriod==='semana'){
    const day=now.getDay()||7;
    const mon=new Date(now);mon.setDate(now.getDate()-day+1);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    return{from:mon.toISOString().slice(0,10),to:sun.toISOString().slice(0,10),label:`Semana del ${mon.toLocaleDateString('es-ES')} al ${sun.toLocaleDateString('es-ES')}`};
  }
  if(reportPeriod==='mes'){
    const from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
    const to=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);
    return{from,to,label:now.toLocaleDateString('es-ES',{month:'long',year:'numeric'})};
  }
  const from=document.getElementById('rp-from').value||now.toISOString().slice(0,10);
  const to=document.getElementById('rp-to').value||now.toISOString().slice(0,10);
  return{from,to,label:`${from} — ${to}`};
}

function buildCSV(rows,headers){
  const sep=';'; // semicolon for Excel/Sheets Spanish locale
  const fmt=v=>{
    if(!v && v!==0) return '""';
    let s=String(v);
    // Format ISO dates nicely
    if(s.match(/^\d{4}-\d{2}-\d{2}T/)) s=new Date(s).toLocaleString('es-ES');
    else if(s.match(/^\d{4}-\d{2}-\d{2} \d{2}/)) s=s.slice(0,16).replace('T',' ');
    return '"'+s.replace(/"/g,'""')+'"';
  };
  return '\uFEFF'+headers.map(h=>'"'+h+'"').join(sep)+'\n'+rows.map(r=>r.map(fmt).join(sep)).join('\n');
}

function downloadCSV(content,filename){
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function downloadSheets(rows, headers, filename){
  // Build CSV content and open in Google Sheets via import
  const content = buildCSV(rows, headers);
  const blob = new Blob([content], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  // Download CSV then show instructions to import to Sheets
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace('.xls','.csv');
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  // Also open Google Sheets new sheet
  setTimeout(()=>{
    const sheetsUrl = 'https://sheets.new';
    window.open(sheetsUrl,'_blank');
    toast('✓ CSV descargado — Arrastra el archivo al Google Sheets que se abrió');
  }, 500);
}

async function downloadReport(type,format){
  // Cargar incidencias frescas de Supabase antes de generar
  try {
    const freshInc = await SB.get('nh_incidents', `?hotel_id=eq.${activeHotelId}&order=created_at.desc`);
    if(freshInc && freshInc.length > 0){
      INCIDENTS = freshInc.map(r=>({
        id:r.id, title:r.title, dept:r.dept, prio:r.priority||r.prio||'MEDIA',
        status:r.status, at:r.created_at||r.at, updated_at:r.updated_at,
        by:r.created_by||r.by, desc:r.description||r.desc||'',
        assigned_to:r.assigned_to||'[]',
        history:r.history ? (typeof r.history==='string'?JSON.parse(r.history):r.history) : []
      }));
    }
  } catch(e){ /* usar datos en memoria si falla */ }

  const {from,to,label}=getReportDateRange();
  const hotelName=(document.getElementById('cfg-hotel')||{}).value||'Noctis Hotel';
  const generado=new Date().toLocaleString('es-ES');

  // ── Helpers ──────────────────────────────────────────────────
  function avgResolutionHours(incidents){
    const resolved=incidents.filter(i=>i.status==='RESUELTA'&&i.history&&i.history.length>1);
    if(!resolved.length)return null;
    const hours=resolved.map(i=>{
      const open=new Date(i.at);
      const closeEntry=i.history.slice().reverse().find(h=>h.text&&h.text.includes('RESUELTA'));
      if(!closeEntry)return null;
      const closeDate=new Date(i.at); // fallback: use updated_at if available
      return null; // we don't have exact close timestamp — mark as n/a
    }).filter(h=>h!==null);
    if(!hours.length)return null;
    return Math.round(hours.reduce((a,b)=>a+b,0)/hours.length);
  }
  function inRange(inc){
    if(!from||!to||reportPeriod==='total')return true;
    const d=(inc.at||'').slice(0,10);
    return d>=from&&d<=to;
  }
  function incInRange(){return INCIDENTS.filter(inRange);}
  function pctBar(pct,width=60){
    const color=pct===100?'#2e4a1e':pct>=70?'#5a7a3a':pct>=40?'#8a6d2e':'#8b1a1a';
    return `<div style="display:inline-flex;align-items:center;gap:6px"><div style="width:${width}px;height:8px;background:#e8e0d0;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div></div><span style="font-size:11px;font-weight:700;color:${color}">${pct}%</span></div>`;
  }
  function statusPill(s){
    const cfg={ABIERTA:{c:'#8b1a1a',bg:'#fdf0f0'},EN_PROCESO:{c:'#7a4a0a',bg:'#fdf6e8'},RESUELTA:{c:'#2e4a1e',bg:'#f0f6ec'}};
    const x=cfg[s]||{c:'#666',bg:'#f0f0f0'};
    return`<span style="background:${x.bg};color:${x.c};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${s}</span>`;
  }
  function prioPill(p){
    const cfg={BAJA:{c:'#1a3a5c',bg:'#edf3fb'},MEDIA:{c:'#2e4a1e',bg:'#f0f6ec'},ALTA:{c:'#7a4a0a',bg:'#fdf6e8'},CRITICA:{c:'#8b1a1a',bg:'#fdf0f0'}};
    const x=cfg[p]||{c:'#666',bg:'#f0f0f0'};
    return`<span style="background:${x.bg};color:${x.c};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${p}</span>`;
  }

  if(format==='csv'){
    let content='', filename='';
    if(type==='incidencias'){
      const rows=incInRange().map(i=>{
        const assignedIds=i.assigned_to?JSON.parse(i.assigned_to||'[]'):[];
        const assignedNames=assignedIds.map(id=>{const u=USERS.find(x=>x.id===id);return u?u.name:'?';}).join(', ');
        const creator=USERS.find(u=>u.id===i.by);
        return[i.id,i.title,i.dept,i.prio,i.status,i.at||'',i.updated_at||'',creator?creator.name:'',assignedNames,i.desc||''];
      });
      content=buildCSV(rows,['ID','Título','Departamento','Prioridad','Estado','Fecha Apertura','Última Actualización','Creada Por','Asignada A','Descripción']);
      filename=`noctis-incidencias-${from}.csv`;
    } else if(type==='empleados'){
      const rows=USERS.filter(u=>u.active).map(u=>{
        const myInc=incInRange().filter(i=>String(i.by)===String(u.id));
        const incCreadas=myInc.length;
        const incResueltas=myInc.filter(i=>i.status==='RESUELTA').length;
        const incAsignadas=incInRange().filter(i=>{const ids=Array.isArray(i.assigned_to)?i.assigned_to:(i.assigned_to?JSON.parse(i.assigned_to||'[]'):[]);return ids.includes(u.id);}).length;
        const chkDone=Object.values(CHK).filter(c=>c.user===u.name).length;
        const deptTpls=TEMPLATES.filter(t=>t.dept===u.dept);
        const totalChk=deptTpls.reduce((s,t)=>s+t.items.length,0);
        const chkPct=totalChk>0?Math.round(chkDone/totalChk*100):0;
        const tasaRes=incCreadas>0?Math.round(incResueltas/incCreadas*100):0;
        return[u.name,u.dept,roleLabel(u.role),incCreadas,incResueltas,`${tasaRes}%`,incAsignadas,`${chkDone}/${totalChk}`,`${chkPct}%`];
      });
      content=buildCSV(rows,['Empleado','Departamento','Rol','Inc. Abiertas','Inc. Resueltas','Tasa Resolución','Inc. Asignadas','Tareas Hoy','% Checklists']);
      filename=`noctis-empleados-${from}.csv`;
    } else if(type==='checklists'){
      const rows=TEMPLATES.flatMap(t=>t.items.map((item,i)=>{
        const ck=CHK[`${t.id}-${from}-${i}`];
        return[t.dept,t.name,t.shift,item,ck?'Completado':'Pendiente',ck?ck.user:'—',ck?ck.time:'—'];
      }));
      content=buildCSV(rows,['Departamento','Plantilla','Turno','Tarea','Estado','Responsable','Hora']);
      filename=`noctis-checklists-${from}.csv`;
    } else {
      const rows=DEPTS.map(d=>{
        const tpls=TEMPLATES.filter(t=>t.dept===d);
        const total=tpls.reduce((s,t)=>s+t.items.length,0);
        const done=tpls.reduce((s,t)=>s+t.items.filter((_,i)=>CHK[`${t.id}-${from}-${i}`]).length,0);
        const pct=total?Math.round(done/total*100):0;
        const dInc=incInRange().filter(i=>i.dept===d);
        const staff=USERS.filter(u=>u.dept===d&&u.active).length;
        const tasaRes=dInc.length>0?Math.round(dInc.filter(i=>i.status==='RESUELTA').length/dInc.length*100):0;
        return[d,staff,tpls.length,`${pct}%`,dInc.filter(i=>i.status==='ABIERTA').length,dInc.filter(i=>i.status==='RESUELTA').length,dInc.filter(i=>i.prio==='CRITICA').length,`${tasaRes}%`];
      });
      content=buildCSV(rows,['Departamento','Empleados','Plantillas','% Checklists','Inc. Abiertas','Inc. Resueltas','Inc. Críticas','Tasa Resolución']);
      filename=`noctis-departamentos-${from}.csv`;
    }
    if(content){downloadCSV(content,filename);toast('✓ Informe descargado CSV');}
    return;
  }

  if(format==='excel'||format==='sheets'){
    const {from}=getReportDateRange();
    let rows=[], headers=[], filename='';
    if(type==='incidencias'){
      headers=['ID','Título','Descripción','Departamento','Prioridad','Estado','Fecha Apertura','Creada Por','Asignada A','Notas Historial'];
      rows=incInRange().map(i=>{
        const assignedIds=i.assigned_to?JSON.parse(i.assigned_to||'[]'):[];
        const assignedNames=assignedIds.map(id=>{const u=USERS.find(x=>x.id===id);return u?u.name:'?';}).join(', ');
        const creator=USERS.find(u=>u.id===i.by);
        const histNotes=(i.history||[]).map(h=>h.text||'').filter(Boolean).join(' | ');
        return[i.id,i.title,i.desc||'',i.dept,i.prio,i.status,i.at?new Date(i.at).toLocaleDateString('es-ES'):'',creator?creator.name:'',assignedNames,histNotes];
      });
      filename='noctis-incidencias-'+from;
    } else if(type==='empleados'){
      headers=['Empleado','Email','Departamento','Rol','Inc. Creadas','Inc. Resueltas','Tasa Resolución','Inc. Asignadas','Tareas Checklist','% Completado'];
      rows=USERS.filter(u=>u.active).map(u=>{
        const myInc=incInRange().filter(i=>String(i.by)===String(u.id));
        const incResueltas=myInc.filter(i=>i.status==='RESUELTA').length;
        const incAsignadas=incInRange().filter(i=>{const ids=Array.isArray(i.assigned_to)?i.assigned_to:(i.assigned_to?JSON.parse(i.assigned_to||'[]'):[]);return ids.includes(u.id);}).length;
        const chkDone=Object.values(CHK).filter(c=>c.user===u.name).length;
        const totalChk=TEMPLATES.filter(t=>t.dept===u.dept).reduce((s,t)=>s+t.items.length,0);
        const pct=totalChk>0?Math.round(chkDone/totalChk*100):0;
        const tasa=myInc.length>0?Math.round(incResueltas/myInc.length*100)+'%':'—';
        return[u.name,u.email,u.dept,roleLabel(u.role),myInc.length,incResueltas,tasa,incAsignadas,chkDone+'/'+totalChk,pct+'%'];
      });
      filename='noctis-empleados-'+from;
    } else if(type==='checklists'){
      headers=['Departamento','Plantilla','Turno','Tarea','Estado','Completado Por','Hora'];
      rows=TEMPLATES.flatMap(t=>t.items.map((item,i)=>{
        const ck=CHK[`${t.id}-${from}-${i}`];
        return[t.dept,t.name,t.shift,item,ck?'Completado':'Pendiente',ck?ck.user:'—',ck?ck.time:'—'];
      }));
      filename='noctis-checklists-'+from;
    } else {
      headers=['Departamento','Personal','Plantillas','% Checklists','Inc. Abiertas','Inc. En Proceso','Inc. Resueltas','Inc. Críticas','Tasa Resolución','Estado'];
      rows=DEPTS.map(d=>{
        const tpls=TEMPLATES.filter(t=>t.dept===d);
        const total=tpls.reduce((s,t)=>s+t.items.length,0);
        const done=tpls.reduce((s,t)=>s+t.items.filter((_,i)=>CHK[`${t.id}-${from}-${i}`]).length,0);
        const pct=total?Math.round(done/total*100):0;
        const di=incInRange().filter(i=>i.dept===d);
        const staff=USERS.filter(u=>u.dept===d&&u.active).length;
        const abierta=di.filter(i=>i.status==='ABIERTA').length;
        const enProceso=di.filter(i=>i.status==='EN_PROCESO').length;
        const res=di.filter(i=>i.status==='RESUELTA').length;
        const crit=di.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').length;
        const tr=di.length?Math.round(res/di.length*100):null;
        const estado=crit>0?'⚠ Crítico':abierta>3?'Atención':pct<50?'Revisar':'✓ Operativo';
        return[d,staff,tpls.length,pct+'%',abierta,enProceso,res,crit,tr+'%',estado];
      });
      filename='noctis-departamentos-'+from;
    }
    downloadSheets(rows,headers,filename+'.csv');
    toast('✓ CSV descargado — Se abrirá Google Sheets para importar');
    return;
  }

  // ── PDF reports ───────────────────────────────────────────────
  const titles={
    checklists:'Informe Operativo de Checklists',
    incidencias:'Informe de Gestión de Incidencias',
    empleados:'Informe de Rendimiento del Equipo',
    departamentos:'Informe Ejecutivo por Departamento',
    semanal:'Informe Semanal de Operaciones',
    mensual:'Informe Mensual de Operaciones'
  };
  const reportTitle=titles[type]||'Informe Operativo';
  const allInc=incInRange();

  // ── Shared KPI block ──────────────────────────────────────────
  function kpiBlock(kpis){
    return`<div style="display:grid;grid-template-columns:repeat(${kpis.length},1fr);gap:14px;margin-bottom:28px">
      ${kpis.map(k=>`<div style="border:1px solid #d6c9b0;border-radius:10px;padding:18px 14px;text-align:center;background:${k.bg||'#fafaf7'}">
        <div style="font-size:32px;font-weight:700;color:${k.color||'#2e4a1e'}">${k.val}</div>
        <div style="font-size:11px;color:#7a6a52;margin-top:5px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase">${k.label}</div>
        ${k.sub?`<div style="font-size:10px;color:#9a8e7e;margin-top:3px">${k.sub}</div>`:''}
      </div>`).join('')}
    </div>`;
  }

  let tableHTML='';

  if(type==='incidencias'){
    const open=allInc.filter(i=>i.status==='ABIERTA').length;
    const enProceso=allInc.filter(i=>i.status==='EN_PROCESO').length;
    const resuelta=allInc.filter(i=>i.status==='RESUELTA').length;
    const criticas=allInc.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').length;
    const tasaGlobal=allInc.length?Math.round(resuelta/allInc.length*100):0;
    tableHTML=kpiBlock([
      {val:allInc.length,label:'Total Incidencias',color:'#2c2416'},
      {val:open,label:'Abiertas',color:'#8b1a1a',bg:'#fdf0f0'},
      {val:enProceso,label:'En Proceso',color:'#7a4a0a',bg:'#fdf6e8'},
      {val:resuelta,label:'Resueltas',color:'#2e4a1e',bg:'#f0f6ec'},
      {val:criticas,label:'Críticas Pendientes',color:'#8b1a1a',bg:'#fdf0f0'},
      {val:tasaGlobal+'%',label:'Tasa de Resolución',color:tasaGlobal>=70?'#2e4a1e':'#8b1a1a'}
    ]);
    // By dept summary
    tableHTML+=`<h3 style="font-family:Georgia,serif;color:#2e4a1e;margin:0 0 10px">Resumen por Departamento</h3>`;
    tableHTML+=`<table><thead><tr><th>Departamento</th><th style="text-align:center">Total</th><th style="text-align:center">Abiertas</th><th style="text-align:center">En Proceso</th><th style="text-align:center">Resueltas</th><th style="text-align:center">Críticas</th><th style="text-align:center">Tasa Resolución</th></tr></thead><tbody>`;
    tableHTML+=DEPTS.map(d=>{
      const di=allInc.filter(i=>i.dept===d);
      const tr=di.length?Math.round(di.filter(i=>i.status==='RESUELTA').length/di.length*100):0;
      return`<tr><td><strong>${d}</strong></td><td style="text-align:center">${di.length}</td><td style="text-align:center;color:#8b1a1a;font-weight:${di.filter(i=>i.status==='ABIERTA').length>0?'700':'400'}">${di.filter(i=>i.status==='ABIERTA').length}</td><td style="text-align:center;color:#7a4a0a">${di.filter(i=>i.status==='EN_PROCESO').length}</td><td style="text-align:center;color:#2e4a1e;font-weight:700">${di.filter(i=>i.status==='RESUELTA').length}</td><td style="text-align:center;color:${di.filter(i=>i.prio==='CRITICA').length>0?'#8b1a1a':'#2e4a1e'};font-weight:700">${di.filter(i=>i.prio==='CRITICA').length}</td><td style="text-align:center">${pctBar(tr,50)}</td></tr>`;
    }).join('');
    tableHTML+=`</tbody></table>`;
    tableHTML+=`<h3 style="font-family:Georgia,serif;color:#2e4a1e;margin:24px 0 10px">Detalle de Incidencias</h3>`;
    tableHTML+=`<table><thead><tr><th style="width:30px">ID</th><th>Título y Descripción</th><th>Depto.</th><th>Prioridad</th><th>Estado</th><th>Apertura</th><th>Asignada a</th></tr></thead><tbody>`;
    tableHTML+=allInc.map(i=>{
      const assignedIds=i.assigned_to?JSON.parse(i.assigned_to||'[]'):[];
      const assignedNames=assignedIds.map(id=>{const u=USERS.find(x=>x.id===id);return u?u.name:'?';}).join(', ')||'—';
      return`<tr><td style="text-align:center;color:#9a8e7e;font-size:11px">#${i.id}</td><td><strong style="font-size:12px">${i.title}</strong>${i.desc?`<br><span style="font-size:11px;color:#7a6a52">${i.desc.slice(0,120)}${i.desc.length>120?'…':''}</span>`:''}</td><td><span style="font-size:11px">${i.dept}</span></td><td>${prioPill(i.prio)}</td><td>${statusPill(i.status)}</td><td style="font-size:11px;white-space:nowrap">${i.at?new Date(i.at).toLocaleDateString('es-ES'):'-'}</td><td style="font-size:11px">${assignedNames}</td></tr>`;
    }).join('');
    tableHTML+=`</tbody></table>`;

  } else if(type==='empleados'){
    const activeUsers=USERS.filter(u=>u.active);
    const totalInc=allInc.length||1;
    tableHTML=kpiBlock([
      {val:activeUsers.length,label:'Empleados Activos',color:'#2c2416'},
      {val:activeUsers.filter(u=>u.role==='ADMIN').length,label:'Jefes de Dpto.',color:'#2e4a1e'},
      {val:activeUsers.filter(u=>u.role==='EMPLOYEE').length,label:'Empleados',color:'#5a7a3a'},
      {val:allInc.filter(i=>i.status==='RESUELTA').length,label:'Incidencias Resueltas',color:'#2e4a1e',bg:'#f0f6ec'},
      {val:allInc.filter(i=>i.status==='ABIERTA').length,label:'Incidencias Abiertas',color:'#8b1a1a',bg:'#fdf0f0'}
    ]);
    tableHTML+=`<table><thead><tr><th>Empleado</th><th>Dpto. / Rol</th><th style="text-align:center">Inc. Creadas</th><th style="text-align:center">Inc. Resueltas</th><th style="text-align:center">Inc. Asignadas</th><th style="text-align:center">Tasa Resolución</th><th style="text-align:center">Checklists Hoy</th></tr></thead><tbody>`;
    tableHTML+=activeUsers.map(u=>{
      const myInc=allInc.filter(i=>String(i.by)===String(u.id));
      const incCreadas=myInc.length;
      const incResueltas=myInc.filter(i=>i.status==='RESUELTA').length;
      const incAsignadas=allInc.filter(i=>{const ids=Array.isArray(i.assigned_to)?i.assigned_to:(i.assigned_to?JSON.parse(i.assigned_to||'[]'):[]);return ids.includes(u.id);}).length;
      const chkDone=Object.values(CHK).filter(c=>c.user===u.name).length;
      const deptTpls=TEMPLATES.filter(t=>t.dept===u.dept);
      const totalChk=deptTpls.reduce((s,t)=>s+t.items.length,0);
      const chkPct=totalChk>0?Math.round(chkDone/totalChk*100):0;
      const tasaRes=incCreadas>0?Math.round(incResueltas/incCreadas*100):0;
      return`<tr><td><strong>${u.name}</strong></td><td><span style="font-size:11px;color:#7a6a52">${u.dept}</span><br><span style="font-size:10px;background:#f0f0e8;padding:1px 6px;border-radius:10px">${roleLabel(u.role)}</span></td><td style="text-align:center">${incCreadas}</td><td style="text-align:center;font-weight:700;color:#2e4a1e">${incResueltas}</td><td style="text-align:center">${incAsignadas}</td><td style="text-align:center">${incCreadas>0?pctBar(tasaRes,50):'<span style="color:#9a8e7e;font-size:11px">—</span>'}</td><td style="text-align:center">${totalChk>0?pctBar(chkPct,50):'<span style="color:#9a8e7e;font-size:11px">Sin tareas</span>'}</td></tr>`;
    }).join('');
    tableHTML+=`</tbody></table>`;

  } else if(type==='checklists'){
    const today=from;
    let totalItems=0, doneItems=0;
    TEMPLATES.forEach(t=>{totalItems+=t.items.length;doneItems+=t.items.filter((_,i)=>CHK[`${t.id}-${today}-${i}`]).length;});
    const globalPct=totalItems?Math.round(doneItems/totalItems*100):0;
    const tplsAl100=TEMPLATES.filter(t=>t.items.length&&t.items.every((_,i)=>CHK[`${t.id}-${today}-${i}`])).length;
    tableHTML=kpiBlock([
      {val:TEMPLATES.length,label:'Plantillas Activas',color:'#2c2416'},
      {val:tplsAl100,label:'Plantillas al 100%',color:'#2e4a1e',bg:'#f0f6ec'},
      {val:doneItems,label:'Tareas Completadas',color:'#2e4a1e'},
      {val:totalItems-doneItems,label:'Tareas Pendientes',color:totalItems-doneItems>0?'#8b1a1a':'#2e4a1e',bg:totalItems-doneItems>0?'#fdf0f0':'#f0f6ec'},
      {val:globalPct+'%',label:'Cumplimiento Global',color:globalPct===100?'#2e4a1e':globalPct>=70?'#5a7a3a':'#8b1a1a'}
    ]);
    tableHTML+=`<table><thead><tr><th>Dpto.</th><th>Plantilla</th><th>Turno</th><th style="text-align:center">Items</th><th style="text-align:center">Completados</th><th style="text-align:center">Cumplimiento</th><th>Responsable (Admin)</th><th>Ejecutado Por</th></tr></thead><tbody>`;
    tableHTML+=TEMPLATES.map(t=>{
      const done=t.items.filter((_,i)=>CHK[`${t.id}-${today}-${i}`]).length;
      const pct=t.items.length?Math.round(done/t.items.length*100):0;
      const ejecutadoPor=[...new Set(t.items.map((_,i)=>CHK[`${t.id}-${today}-${i}`]?.user).filter(Boolean))].join(', ')||'—';
      const adminUser=USERS.find(u=>u.dept===t.dept&&u.active&&(u.role==='ADMIN'||u.role==='SUPER_ADMIN'));
      const responsable=adminUser?adminUser.name:'—';
      return`<tr><td style="font-size:11px">${t.dept}</td><td><strong>${t.name}</strong></td><td style="font-size:11px">${t.shift}</td><td style="text-align:center">${t.items.length}</td><td style="text-align:center;font-weight:700;color:${done===t.items.length?'#2e4a1e':'#8b1a1a'}">${done}</td><td style="text-align:center">${pctBar(pct,60)}</td><td style="font-size:11px;font-weight:600">${responsable}</td><td style="font-size:11px">${ejecutadoPor}</td></tr>`;
    }).join('');
    tableHTML+=`</tbody></table>`;
    // Detail by dept
    // Resumen compacto por departamento (sin listar todas las tareas)
    tableHTML+=`<h3 style="font-family:Georgia,serif;color:#2e4a1e;margin:24px 0 10px">Resumen por Departamento</h3>`;
    tableHTML+=`<table><thead><tr><th>Departamento</th><th style="text-align:center">Plantillas</th><th style="text-align:center">Tareas Completadas</th><th style="text-align:center">Tareas Pendientes</th><th style="text-align:center">Cumplimiento</th><th>Responsable (Admin)</th></tr></thead><tbody>`;
    DEPTS.forEach(d=>{
      const dTpls=TEMPLATES.filter(t=>t.dept===d);
      if(!dTpls.length) return;
      const dTotal=dTpls.reduce((s,t)=>s+t.items.length,0);
      const dDone=dTpls.reduce((s,t)=>s+t.items.filter((_,i)=>CHK[`${t.id}-${today}-${i}`]).length,0);
      const dPct=dTotal?Math.round(dDone/dTotal*100):0;
      const dPending=dTotal-dDone;
      const adminUser=USERS.find(u=>u.dept===d&&u.active&&(u.role==='ADMIN'||u.role==='SUPER_ADMIN'));
      const responsable=adminUser?adminUser.name:'—';
      tableHTML+=`<tr><td><strong>${d}</strong></td><td style="text-align:center">${dTpls.length}</td><td style="text-align:center;color:#2e4a1e;font-weight:700">${dDone}</td><td style="text-align:center;color:${dPending>0?'#8b1a1a':'#2e4a1e'};font-weight:700">${dPending}</td><td style="text-align:center">${pctBar(dPct,60)}</td><td style="font-size:11px">${responsable}</td></tr>`;
    });
    tableHTML+=`</tbody></table>`;

  } else {
    // Departamentos / semanal / mensual — Executive report
    const open=allInc.filter(i=>i.status==='ABIERTA').length;
    const criticas=allInc.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').length;
    const resuelta=allInc.filter(i=>i.status==='RESUELTA').length;
    const tasaGlobal=allInc.length?Math.round(resuelta/allInc.length*100):0;
    let totalItems=0,doneItems=0;
    TEMPLATES.forEach(t=>{
      totalItems+=t.items.length;
      const d=from;
      doneItems+=t.items.filter((_,i)=>CHK[`${t.id}-${d}-${i}`]).length;
    });
    const chkGlobal=totalItems?Math.round(doneItems/totalItems*100):0;
    tableHTML=kpiBlock([
      {val:allInc.length,label:'Incidencias Totales',color:'#2c2416'},
      {val:open,label:'Abiertas',color:'#8b1a1a',bg:'#fdf0f0'},
      {val:criticas,label:'Críticas Activas',color:'#8b1a1a',bg:'#fdf0f0'},
      {val:resuelta,label:'Resueltas',color:'#2e4a1e',bg:'#f0f6ec'},
      {val:tasaGlobal+'%',label:'Tasa Resolución',color:tasaGlobal>=70?'#2e4a1e':'#8b1a1a'},
      {val:chkGlobal+'%',label:'Cumplimiento Checklists',color:chkGlobal>=80?'#2e4a1e':chkGlobal>=50?'#7a4a0a':'#8b1a1a'}
    ]);
    tableHTML+=`<h3 style="font-family:Georgia,serif;color:#2e4a1e;margin:0 0 10px">Análisis por Departamento</h3>`;
    tableHTML+=`<table><thead><tr><th>Departamento</th><th>Responsable</th><th style="text-align:center">Personal</th><th style="text-align:center">Checklists</th><th style="text-align:center">Inc. Abiertas</th><th style="text-align:center">Inc. En Proceso</th><th style="text-align:center">Inc. Resueltas</th><th style="text-align:center">Críticas</th><th style="text-align:center">Tasa Resolución</th><th style="text-align:center">Estado</th></tr></thead><tbody>`;
    tableHTML+=DEPTS.map(d=>{
      const tpls=TEMPLATES.filter(t=>t.dept===d);
      const total=tpls.reduce((s,t)=>s+t.items.length,0);
      const done=tpls.reduce((s,t)=>s+t.items.filter((_,i)=>CHK[`${t.id}-${from}-${i}`]).length,0);
      const chkPct=total?Math.round(done/total*100):0;
      const di=allInc.filter(i=>i.dept===d);
      const staff=USERS.filter(u=>u.dept===d&&u.active).length;
      const abierta=di.filter(i=>i.status==='ABIERTA').length;
      const enProceso=di.filter(i=>i.status==='EN_PROCESO').length;
      const res=di.filter(i=>i.status==='RESUELTA').length;
      const crit=di.filter(i=>i.prio==='CRITICA'&&i.status!=='RESUELTA').length;
      const tr=di.length?Math.round(res/di.length*100):null;
      const adminUser=USERS.find(u=>u.dept===d&&u.active&&(u.role==='ADMIN'||u.role==='SUPER_ADMIN'));
      const responsable=adminUser?adminUser.name:'—';
      const operativo=crit>0?'<span style="color:#8b1a1a;font-weight:700">⚠ Crítico</span>':abierta>3?'<span style="color:#7a4a0a;font-weight:700">Atención</span>':chkPct<50?'<span style="color:#7a4a0a;font-weight:700">Revisar</span>':'<span style="color:#2e4a1e;font-weight:700">✓ Operativo</span>';
      return`<tr><td><strong>${d}</strong></td><td style="font-size:11px;font-weight:600">${responsable}</td><td style="text-align:center">${staff}</td><td style="text-align:center">${pctBar(chkPct,50)}</td><td style="text-align:center;color:${abierta>0?'#8b1a1a':'#2e4a1e'};font-weight:700">${abierta}</td><td style="text-align:center;color:#7a4a0a">${enProceso}</td><td style="text-align:center;color:#2e4a1e;font-weight:700">${res}</td><td style="text-align:center;color:${crit>0?'#8b1a1a':'#2e4a1e'};font-weight:700">${crit}</td><td style="text-align:center">${tr!==null?pctBar(tr,50):'<span style="color:#9a8e7e;font-size:11px">—</span>'}</td><td style="text-align:center">${operativo}</td></tr>`;
    }).join('');
    tableHTML+=`</tbody></table>`;
    // Incidencias críticas y abiertas
    const urgentes=allInc.filter(i=>i.status!=='RESUELTA'&&(i.prio==='CRITICA'||i.prio==='ALTA'));
    if(urgentes.length){
      tableHTML+=`<h3 style="font-family:Georgia,serif;color:#8b1a1a;margin:24px 0 10px">⚠ Incidencias Prioritarias Pendientes</h3>`;
      tableHTML+=`<table><thead><tr><th>ID</th><th>Título</th><th>Dpto.</th><th>Prioridad</th><th>Estado</th><th>Fecha Apertura</th></tr></thead><tbody>`;
      tableHTML+=urgentes.map(i=>`<tr><td style="color:#9a8e7e;font-size:11px">#${i.id}</td><td><strong>${i.title}</strong>${i.desc?`<br><small style="color:#7a6a52">${i.desc.slice(0,100)}…</small>`:''}</td><td>${i.dept}</td><td>${prioPill(i.prio)}</td><td>${statusPill(i.status)}</td><td style="font-size:11px">${i.at?new Date(i.at).toLocaleDateString('es-ES'):'-'}</td></tr>`).join('');
      tableHTML+=`</tbody></table>`;
    }
  }

  // ── Build HTML ──────────────────────────────────────────────
  const reportHTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${reportTitle} — ${hotelName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Arial,sans-serif;padding:32px 36px;color:#1a1208;max-width:1100px;margin:0 auto;background:#fff}
    .report-header{border-bottom:3px solid #2e4a1e;padding-bottom:20px;margin-bottom:28px}
    .report-logo{font-size:13px;font-weight:700;color:#2e4a1e;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px}
    h1{font-family:Georgia,'Times New Roman',serif;color:#1a1208;font-size:26px;font-weight:700;margin-bottom:4px;line-height:1.2}
    .report-sub{font-size:14px;color:#5a7a3a;font-weight:600;margin-bottom:4px}
    .report-meta{font-size:11px;color:#9a8e7e;margin-top:6px}
    h3{font-family:Georgia,serif;color:#2e4a1e;font-size:15px;margin:24px 0 10px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12px}
    thead tr{background:#f0ece4}
    th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#5a4a2e;letter-spacing:0.04em;text-transform:uppercase;border-bottom:2px solid #d6c9b0}
    td{padding:9px 12px;border-bottom:1px solid #ede5d6;vertical-align:middle;line-height:1.4}
    tr:last-child td{border-bottom:none}
    .report-footer{margin-top:32px;padding-top:16px;border-top:1px solid #d6c9b0;font-size:10px;color:#9a8e7e;display:flex;justify-content:space-between}
    @media print{body{padding:20px 24px}@page{margin:1.5cm}}
  </style></head><body>
  <div class="report-header">
    <div class="report-logo">Noctis Hub · Sistema de Gestión Hotelera</div>
    <h1>${reportTitle}</h1>
    <div class="report-sub">${hotelName}</div>
    <div class="report-meta">Período: <strong>${label}</strong> &nbsp;·&nbsp; Generado: ${generado} &nbsp;·&nbsp; Por: ${cu.name} (${roleLabel(cu.role)})</div>
  </div>
  ${tableHTML}
  <div class="report-footer">
    <span>Noctis Hub — Confidencial · Uso interno</span>
    <span>Generado el ${generado}</span>
  </div>
  </body></html>`;

  // Detect iPad/iOS — use in-app modal instead of window.open
  const isIpad = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  if(isIpad){
    document.getElementById('modal-report-title').textContent = reportTitle;
    const iframe = document.getElementById('report-iframe');
    iframe.srcdoc = reportHTML;
    const rm = document.getElementById('modal-report');
    rm.style.display = 'flex';
  } else {
    const w = window.open('','_blank');
    if(!w){ toast('✗ El navegador bloqueó la ventana emergente'); return; }
    w.document.write(reportHTML);
    w.document.close();
    setTimeout(()=>w.print(),600);
  }
  toast('✓ Informe generado');
}

function printReportModal(){
  const iframe = document.getElementById('report-iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.print();
  }
}
function closeReportModal(){
  const rm = document.getElementById('modal-report');
  if(rm) rm.style.display = 'none';
}
function exportToSheets(type){
  const {from,label}=getReportDateRange();
  let csv='';
  if(type==='incidencias'){
    const rows=INCIDENTS.map(i=>[i.id,i.title,i.dept,i.prio,i.status,i.at,i.desc]);
    csv=buildCSV(rows,['ID','Título','Departamento','Prioridad','Estado','Fecha','Descripción']);
  } else {
    const rows=DEPTS.map(d=>{
      const tpls=TEMPLATES.filter(t=>t.dept===d);
      const total=tpls.reduce((s,t)=>s+t.items.length,0);
      const done=tpls.reduce((s,t)=>s+t.items.filter((_,i)=>CHK[`${t.id}-${from}-${i}`]).length,0);
      const pct=total?Math.round(done/total*100):0;
      return[d,USERS.filter(u=>u.dept===d&&u.active).length,tpls.length,pct+'%',INCIDENTS.filter(i=>i.dept===d&&i.status==='ABIERTA').length,INCIDENTS.filter(i=>i.dept===d&&i.status==='RESUELTA').length];
    });
    csv=buildCSV(rows,['Departamento','Empleados','Plantillas','% Checklists','Inc. Abiertas','Inc. Resueltas']);
  }
  // Download CSV and show Google Sheets import instructions
  downloadCSV(csv,`noctis-${type}-${from}.csv`);
  setTimeout(()=>{
    toast('✓ Descargado correctamente');
  },500);
}

// ══════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════
function openModal(id){document.body.classList.add('modal-open');document.getElementById(id).classList.add('open');}
async function deleteTemplate(id){
  if(cu.role!=='SUPER_ADMIN'){toast('✗ Solo el Super Admin puede eliminar plantillas');return;}
  if(!confirm('¿Eliminar esta plantilla?'))return;
  try{await SB.delete('nh_templates','?id=eq.'+id);}catch(e){toast('✗ Error Supabase');return;}
  TEMPLATES=TEMPLATES.filter(t=>t.id!==id);
  renderAdmin();renderChecklists();
  toast('✓ Plantilla eliminada');
}

function resetColors(){
  const defaults={forest:'#2e4a1e',topbar:'#2c2416',gold:'#8a6d2e',red:'#8b1a1a',cream:'#f5f0e8','forest-light':'#e4eed8'};
  Object.entries(defaults).forEach(([k,v])=>{
    applyColor(k,v);
    const el=document.getElementById('cfg-'+k);if(el)el.value=v;
  });
  toast('✓ Colores restablecidos');
}

function applyFont(val){
  if(!val) return;
  document.documentElement.style.setProperty('--font-body', val);
  document.body.style.fontFamily = val;
  document.querySelectorAll('body,.topbar,.sidebar,.nav-item').forEach(el => el.style.fontFamily = val);
  const sel = document.getElementById('cfg-font');
  if(sel) sel.value = val;
  const preview = document.getElementById('font-preview');
  if(preview) preview.style.fontFamily = val;
}

function applyFontSize(val){
  document.querySelector('html').style.fontSize = val + 'px';
  const fsVal = document.getElementById('cfg-fontsize-val');
  if(fsVal) fsVal.textContent = val + 'px';
  const preview = document.getElementById('font-preview');
  if(preview) preview.style.fontSize = val + 'px';
}

function resetFont(){
  applyFont('Inter,sans-serif');
  applyFontSize(17);
  const sz = document.getElementById('cfg-fontsize');
  if(sz) sz.value = 17;
  toast('✓ Tipografía restablecida');
}

function openIncidentDetail(id){
  const inc=INCIDENTS.find(i=>i.id===id);if(!inc)return;
  const prBadge={BAJA:'badge-blue',MEDIA:'badge-amber',ALTA:'badge-red',CRITICA:'badge-red'}[inc.prio]||'badge-gray';
  const stBadge={ABIERTA:'badge-red',EN_PROCESO:'badge-amber',RESUELTA:'badge-green'}[inc.status]||'badge-gray';
  const stLabel={ABIERTA:'Abierta',EN_PROCESO:'En Proceso',RESUELTA:'Resuelta'}[inc.status]||inc.status;
  const prLabel={BAJA:'Baja',MEDIA:'Media',ALTA:'Alta',CRITICA:'Crítica'}[inc.prio]||inc.prio;
  function fmtDate(s){ try{ return new Date(s).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return s||'—'; } }
  const createdBy = (USERS.find(u=>u.id===inc.by)||{}).name || '—';
  document.getElementById('detail-title').textContent=inc.title;
  document.getElementById('detail-body').innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <span class="badge ${prBadge}">${prLabel}</span>
      <span class="badge ${stBadge}">${stLabel}</span>
      <span class="badge badge-gray">${inc.dept}</span>
    </div>
    <div style="background:var(--cream);border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:0.9rem;line-height:1.7;color:var(--ink-light)">${inc.desc||'<em style="color:var(--ink-muted)">Sin descripción</em>'}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.78rem;color:var(--ink-muted);margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--cream-dark)">
      <span>📅 Creada: <strong>${fmtDate(inc.at)}</strong></span>
      <span>👤 Por: <strong>${createdBy}</strong></span>
    </div>
    <div style="font-weight:700;font-size:0.85rem;margin-bottom:10px;color:var(--ink)">Historial de cambios</div>
    <div>${(inc.history||[]).map(h=>`
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--cream-dark);font-size:0.8rem">
        <span style="color:var(--ink-muted);flex-shrink:0">${fmtDate(h.date)}</span>
        <span style="color:var(--ink)">${h.text}</span>
      </div>`).join('')||'<div style="color:var(--ink-muted);font-size:0.82rem;font-style:italic">Sin historial de cambios</div>'}
    </div>`;
  const canEdit=cu.role==='SUPER_ADMIN'||(cu.role==='ADMIN'&&inc.dept===cu.dept)||inc.by==cu.id;
  const canDelete=cu.role==='SUPER_ADMIN'||(cu.role==='ADMIN'&&inc.dept===cu.dept);
  document.getElementById('detail-foot').innerHTML=`
    <button class="btn btn-outline btn-close-full" onclick="closeModal('modal-inc-detail')">Cerrar</button>
    ${canEdit&&inc.status!=='RESUELTA'?`<button class="btn btn-amber" onclick="quickStatus(${inc.id},'EN_PROCESO');closeModal('modal-inc-detail')">→ En Proceso</button>`:''}
    ${canEdit&&inc.status!=='RESUELTA'?`<button class="btn btn-green" onclick="quickStatus(${inc.id},'RESUELTA');closeModal('modal-inc-detail')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg> Resolver</button>`:''}
    ${canEdit?`<button class="btn btn-outline" onclick="editIncident(${inc.id})"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.15em;flex-shrink:0"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>`:''}
    ${canDelete?`<button class="btn btn-red" onclick="deleteIncident(${inc.id})">🗑 Eliminar</button>`:''}`;
  openModal('modal-inc-detail');
}

async function deleteIncident(id){
  if(cu.role!=='SUPER_ADMIN'&&cu.role!=='ADMIN'){toast('✗ Sin permiso para eliminar');return;}
  const inc=INCIDENTS.find(x=>x.id===id);
  if(!inc)return;
  if(cu.role==='ADMIN'&&inc.dept!==cu.dept){toast('✗ Solo puedes eliminar incidencias de tu departamento');return;}
  if(!confirm('¿Eliminar esta incidencia permanentemente?\nEsta acción no se puede deshacer.'))return;
  try{
    await SB.delete('nh_incidents','?id=eq.'+id);
    INCIDENTS=INCIDENTS.filter(x=>x.id!==id);
    closeModal('modal-inc-detail');
    renderIncidents();
    renderDashboard();
    toast('✓ Incidencia eliminada');
  }catch(e){toast('✗ Error al eliminar: '+(e.message||e));}
}

function closeModal(id){document.getElementById(id).classList.remove('open');if(!document.querySelector('.modal-ov.open')) document.body.classList.remove('modal-open');}
document.querySelectorAll('.modal-ov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

let _toastTimer;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.style.opacity='1';
  clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>t.style.opacity='0',3200);
}

function nowStr(){return new Date().toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','');}
function todayLocalISO(){ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }

function roleLabel(r){return{SUPER_ADMIN:'Super Admin',ADMIN:'Admin Dpto.',EMPLOYEE:'Empleado'}[r]||r;}
function roleBadge(r){return{SUPER_ADMIN:'badge-gold',ADMIN:'badge-blue',EMPLOYEE:'badge-gray'}[r]||'badge-gray';}

// Responsive: show/hide menu button
window.addEventListener('resize',()=>{
  const mb=document.getElementById('menu-btn');
  if(mb)mb.style.display=window.innerWidth<=768?'block':'none';
  if(window.innerWidth>768)closeSidebar();
});

// ══════════════════════════════════════════════════════════════
// SERVICE WORKER — Notificaciones con app cerrada
// ══════════════════════════════════════════════════════════════
let _swReg = null;
let _swHeartbeat = null;

async function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  try {
    _swReg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    // Receive messages from SW (e.g. ALARM_FIRED)
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    // Send initial alarm sync
    syncAlarmsToSW();
    // Heartbeat every 20s to keep SW alive and restart its interval if suspended
    if(_swHeartbeat) clearInterval(_swHeartbeat);
    _swHeartbeat = setInterval(()=>{
      swPost({ type: 'HEARTBEAT' });
    }, 20000);
  } catch(e){
    console.warn('[NoctisHub] SW registration failed:', e);
  }
}

function swPost(msg){
  if(!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage(msg);
}

function syncAlarmsToSW(){
  if(!ALARMS || !ALARMS.length) return;
  const pending = ALARMS.filter(a => !a.done);
  swPost({ type: 'SYNC_ALARMS', alarms: pending });
}

function onSwMessage(event){
  const { type, alarmId, title } = event.data || {};
  if(type === 'ALARM_FIRED'){
    // SW fired a notification while app was closed/hidden — update UI on return
    buildNotifications();
    updateBadges();
    // If app is visible, also show toast
    if(!document.hidden){
      toast('🔔 ALARMA: ' + (title || ''));
    }
  }
}

// Call registerServiceWorker after login (alarms are loaded by then)
// Also re-sync whenever alarms are created or modified

// ══════════════════════════════════════════════════════════════
// REALTIME — sincronización instantánea entre dispositivos
// ══════════════════════════════════════════════════════════════
let realtimeWS = null;
let realtimeChannels = [];
let realtimeReconnectTimer = null;

function startRealtime() {
  if (realtimeWS) stopRealtime();

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + SUPABASE_KEY + '&vsn=1.0.0';

  try {
    realtimeWS = new WebSocket(wsUrl);
  } catch(e) {
    console.warn('Realtime WebSocket failed:', e.message);
    scheduleRealtimeReconnect();
    return;
  }

  realtimeWS.onopen = () => {
    console.log('🔴 Realtime conectado');
    // Join channel for each table
    const tables = ['nh_incidents','nh_checklist','nh_alarms','nh_users','nh_notes','nh_templates','nh_config'];
    realtimeChannels = tables; // mark channels as active for diagnostics
    tables.forEach((table, i) => {
      const topic = `realtime:public:${table}`;
      const joinMsg = {
        topic,
        event: 'phx_join',
        payload: { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table }] } },
        ref: String(i + 1)
      };
      realtimeWS.send(JSON.stringify(joinMsg));
    });
    // Heartbeat every 25s
    realtimeWS._hb = setInterval(() => {
      if (realtimeWS && realtimeWS.readyState === WebSocket.OPEN) {
        realtimeWS.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null }));
      }
    }, 25000);
  };

  realtimeWS.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.event === 'postgres_changes') {
        const change = msg.payload?.data;
        if (!change) return;
        const table = change.table;
        const type  = change.type; // INSERT / UPDATE / DELETE
        const rec   = change.record || change.old_record || {};

        // Ignore changes for other hotels
        if (rec.hotel_id && rec.hotel_id !== activeHotelId) return;

        handleRealtimeChange(table, type, rec, change);
      }
    } catch(e) {}
  };

  realtimeWS.onclose = (e) => {
    console.warn('Realtime desconectado, reconectando...');
    if (realtimeWS && realtimeWS._hb) clearInterval(realtimeWS._hb);
    realtimeWS = null;
    realtimeChannels = [];
    scheduleRealtimeReconnect();
  };

  realtimeWS.onerror = () => {
    if (realtimeWS) realtimeWS.close();
  };
}

function scheduleRealtimeReconnect() {
  if (realtimeReconnectTimer) clearTimeout(realtimeReconnectTimer);
  realtimeReconnectTimer = setTimeout(() => {
    if (cu) startRealtime(); // solo reconectar si hay sesión activa
  }, 5000);
}

function stopRealtime() {
  if (realtimeReconnectTimer) clearTimeout(realtimeReconnectTimer);
  if (realtimeWS) {
    if (realtimeWS._hb) clearInterval(realtimeWS._hb);
    realtimeWS.onclose = null; // evitar reconexión al hacer logout
    realtimeWS.close();
    realtimeWS = null;
  }
}

// Indicador visual de sincronización
let realtimeSyncTimer = null;
function showSyncDot() {
  let dot = document.getElementById('rt-sync-dot');
  if (!dot) return;
  dot.style.opacity = '1';
  if (realtimeSyncTimer) clearTimeout(realtimeSyncTimer);
  realtimeSyncTimer = setTimeout(() => { dot.style.opacity = '0'; }, 1500);
}

function handleRealtimeChange(table, type, rec, change) {
  showSyncDot();
  const today = new Date().toISOString().slice(0, 10);

  if (table === 'nh_incidents') {
    if (type === 'INSERT') {
      const exists = INCIDENTS.find(i => i.id === rec.id);
      if (!exists) {
        INCIDENTS.unshift({ ...rec, desc: rec.description, by: rec.created_by, at: rec.created_at, assigned_to: rec.assigned_to || '[]', history: Array.isArray(rec.history) ? rec.history : JSON.parse(rec.history || '[]') });
        toast('🔔 Nueva incidencia: ' + rec.title);
      }
    } else if (type === 'UPDATE') {
      const idx = INCIDENTS.findIndex(i => i.id === rec.id);
      if (idx >= 0) INCIDENTS[idx] = { ...INCIDENTS[idx], ...rec, desc: rec.description, by: rec.created_by, at: rec.created_at, assigned_to: rec.assigned_to || '[]', history: Array.isArray(rec.history) ? rec.history : JSON.parse(rec.history || '[]') };
    } else if (type === 'DELETE') {
      const old = change.old_record || {};
      INCIDENTS = INCIDENTS.filter(i => i.id !== old.id);
    }
    renderIncidents();
    renderDashboard();
    buildNotifications(); updateBadges();

  } else if (table === 'nh_checklist') {
    if (type === 'INSERT' || type === 'UPDATE') {
      if (rec.date === today) {
        const key = `${rec.template_id}-${rec.date}-${rec.item_index}`;
        CHK[key] = { user: rec.user_name, time: rec.completed_at ? new Date(rec.completed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '', dbId: rec.id };
      }
    } else if (type === 'DELETE') {
      const old = change.old_record || {};
      const key = `${old.template_id}-${old.date}-${old.item_index}`;
      delete CHK[key];
    }
    renderChecklists();
    renderDashboard();

  } else if (table === 'nh_alarms') {
    if (type === 'INSERT') {
      const exists = ALARMS.find(a => a.id === rec.id);
      if (!exists) ALARMS.unshift({ ...rec, time: rec.alarm_time });
    } else if (type === 'UPDATE') {
      const idx = ALARMS.findIndex(a => a.id === rec.id);
      if (idx >= 0) ALARMS[idx] = { ...ALARMS[idx], ...rec, time: rec.alarm_time };
    } else if (type === 'DELETE') {
      const old = change.old_record || {};
      ALARMS = ALARMS.filter(a => a.id !== old.id);
    }
    renderAlarms();
    renderDashboard();
    buildNotifications(); updateBadges();
    syncAlarmsToSW();

  } else if (table === 'nh_users') {
    if (type === 'INSERT') {
      const exists = USERS.find(u => u.id === rec.id);
      if (!exists) USERS.push({ ...rec });
    } else if (type === 'UPDATE') {
      const idx = USERS.findIndex(u => u.id === rec.id);
      if (idx >= 0) USERS[idx] = { ...USERS[idx], ...rec };
    } else if (type === 'DELETE') {
      const old = change.old_record || {};
      USERS = USERS.filter(u => u.id !== old.id);
    }
    renderAdmin();
    renderTeam();

  } else if (table === 'nh_templates') {
    if (type === 'INSERT') {
      const exists = TEMPLATES.find(t => t.id === rec.id);
      if (!exists) TEMPLATES.push({ ...rec, items: Array.isArray(rec.items) ? rec.items : JSON.parse(rec.items || '[]') });
    } else if (type === 'UPDATE') {
      const idx = TEMPLATES.findIndex(t => t.id === rec.id);
      if (idx >= 0) TEMPLATES[idx] = { ...TEMPLATES[idx], ...rec, items: Array.isArray(rec.items) ? rec.items : JSON.parse(rec.items || '[]') };
    } else if (type === 'DELETE') {
      const old = change.old_record || {};
      TEMPLATES = TEMPLATES.filter(t => t.id !== old.id);
    }
    renderChecklists();
    renderAdmin();

  } else if (table === 'nh_notes') {
    // Reload notes silently
    loadNotes().then(() => { if (document.getElementById('page-agenda') && document.getElementById('page-agenda').classList.contains('active')) renderAgenda(); });
  } else if (table === 'nh_config') {
    // Config changed by SuperAdmin — apply instantly on ALL devices
    applyConfigFromDB();
  }
}

