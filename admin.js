// ===== admin.js: trainer login + add/edit/delete for every module =====
// Security note: the real protection is in the database (see setup.sql).
// Even if someone edits this file in their browser, the database refuses changes from non-trainers.

// Each module: table, columns shown in the list, and form fields.
// Field format: [column, label, type, required?, options]
const MODULES = {
  members: {label: 'Manage Members', table: 'members', order: 'name', asc: true, cols: ['photo_url','name','class_div','role','joined_on'], fields: [
    ['name','Student name','text',1],['class_div','Class and division','text',1],['photo_url','Photograph','upload'],
    ['role','Role in the club','text'],['interests','Areas of interest','text'],['joined_on','Joining date','date'],['intro','Short introduction','textarea']]},
  projects: {label: 'Manage Projects & Tasks', table: 'projects', order: 'created_at', cols: ['photo_url','title','category','status','progress'], fields: [
    ['title','Project title','text',1],['description','Description','textarea'],['students','Students involved','text'],['category','Category','text'],
    ['start_date','Start date','date'],['end_date','Expected completion date','date'],
    ['status','Status','select',1,['Not Started','In Progress','Completed','On Hold']],['progress','Progress (0 to 100)','progress'],
    ['photo_url','Photo or document','upload'],['milestones','Milestones and updates (one per line)','textarea']]},
  gallery: {label: 'Manage Gallery', table: 'gallery', order: 'created_at', cols: ['image_url','caption','category','taken_on'], fields: [
    ['caption','Caption','text',1],['category','Category (e.g. Workshop, Competition)','text'],['description','Description','textarea'],
    ['taken_on','Date','date'],['image_url','Photographs (choose several to add many at once)','uploads']]},
  achievements: {label: 'Manage Achievements', table: 'achievements', order: 'achieved_on', cols: ['photo_url','title','achieved_on','featured'], fields: [
    ['title','Title','text',1],['description','Description','textarea'],['achieved_on','Date','date'],['photo_url','Photo or certificate','upload'],['featured','Show on home page','check']]},
  events: {label: 'Manage Events', table: 'events', order: 'event_date', cols: ['title','kind','event_date','location'], fields: [
    ['title','Event title','text',1],['kind','Type','select',1,['Workshop','Training session','AI awareness','Competition','Demonstration','Other']],
    ['event_date','Date','date',1],['location','Location','text'],['description','Description','textarea'],['photo_url','Photo','upload']]},
  announcements: {label: 'Manage Announcements', table: 'announcements', order: 'posted_on', cols: ['title','posted_on','pinned'], fields: [
    ['title','Title','text',1],['body','Message','textarea',1],['posted_on','Date','date',1],['pinned','Pin to top','check']]},
  resources: {label: 'Manage Learning Resources', table: 'resources', order: 'title', asc: true, cols: ['title','kind','url'], fields: [
    ['title','Title','text',1],['kind','Type','select',1,['Website','Tutorial','Tool','Document','Presentation','Reference']],
    ['description','Description','textarea'],['url','Link or uploaded file','upload']]},
  feedback: {label: 'Manage Feedback', table: 'feedback', order: 'created_at', cols: ['name','email','message','created_at'], readOnly: true, fields: []}
};
const SETTINGS = [['school_name','School name'],['club_name','Club name'],['donor','Donor'],['partner','Implementation partner'],['managed_by','Website managed by'],
  ['welcome','Welcome message','t'],['mission','Mission','t'],['vision','Vision','t'],['objectives','Objectives (one per line)','t'],['importance','Why AI education matters','t'],
  ['role_hp','Role of HP India','t'],['role_llf','Role of Learning Links Foundation','t'],['role_school','Role of school and trainer','t'],
  ['contact_address','Address','t'],['contact_phone','Phone'],['contact_email','Email']];

const app = $('#app'), dlg = $('#dlg');
let current = 'overview';
const loading = () => $('#main').innerHTML = '<div class="loading">Loading…</div>';

// ---------- login / logout ----------
function showLogin(msg) {
  app.innerHTML = `<form class="login" id="lf"><h2>Trainer login</h2><p class="muted">${esc(msg || 'Sign in to manage the AI Club portal.')}</p>
    <label>Email<input name="email" type="email" required autocomplete="username"></label>
    <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
    <button>Sign in</button> <a href="index.html" class="muted">Back to website</a></form>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const f = e.target, b = $('button', f); b.disabled = true; b.textContent = 'Signing in…';
    const { error } = await db.auth.signInWithPassword({email: f.email.value.trim(), password: f.password.value});
    if (error) { showLogin('Wrong email or password. Please try again.'); return; }
    start();
  };
}
async function start() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return showLogin();
  // Only accounts listed in the "trainers" table are allowed in
  const { data } = await db.from('trainers').select('user_id').maybeSingle();
  if (!data) { await db.auth.signOut(); return showLogin('This account is not registered as a trainer.'); }
  const menu = [['overview','Dashboard Overview'], ...Object.entries(MODULES).map(([k, m]) => [k, m.label]), ['settings','Website Settings']];
  app.innerHTML = `<div class="shell"><aside class="side"><h3>AI Club Admin</h3>
    ${menu.map(([k, l]) => `<a data-go="${k}">${l}</a>`).join('')}<a href="index.html">View public site</a><a id="out">Logout</a></aside><div class="main" id="main"></div></div>`;
  app.onclick = e => { const a = e.target.closest('[data-go]'); if (a) go(a.dataset.go); };
  $('#out').onclick = async () => { await db.auth.signOut(); showLogin('You have been logged out.'); };
  go('overview');
}

// ---------- navigation ----------
function go(k) {
  current = k;
  document.querySelectorAll('[data-go]').forEach(a => a.classList.toggle('on', a.dataset.go === k));
  if (k === 'overview') return overview();
  if (k === 'settings') return settings();
  listView(k);
}

async function overview() {
  loading();
  const keys = Object.keys(MODULES);
  const res = await Promise.all(keys.map(k => db.from(MODULES[k].table).select('*', {count: 'exact'}).order(k === 'feedback' ? 'created_at' : 'updated_at', {ascending: false}).limit(3)));
  let recent = [];
  res.forEach((r, i) => (r.data || []).forEach(x => recent.push({k: keys[i], t: x.title || x.name || x.caption || x.message, at: x.updated_at || x.created_at})));
  recent.sort((a, b) => new Date(b.at) - new Date(a.at));
  $('#main').innerHTML = `<h2>Dashboard overview</h2><div class="grid">${keys.map((k, i) => `<div class="stat"><b>${res[i].count ?? 0}</b>${MODULES[k].label.replace('Manage ', '')}</div>`).join('')}</div>
    <h3 style="margin-top:24px">Recently updated</h3><table><tr><th>Section</th><th>Record</th><th>When</th></tr>
    ${recent.slice(0, 8).map(r => `<tr><td>${esc(r.k)}</td><td>${esc((r.t || '').slice(0, 70))}</td><td>${fmt(r.at)}</td></tr>`).join('') || '<tr><td colspan=3>Nothing yet.</td></tr>'}</table>`;
}

// ---------- list + search ----------
async function listView(k) {
  const m = MODULES[k]; loading();
  const { data, error } = await db.from(m.table).select('*').order(m.order, {ascending: !!m.asc});
  if (error) return toast(error.message, true);
  const cell = (r, c) => /photo_url|image_url/.test(c) ? (safeUrl(r[c]) ? `<img src="${esc(r[c])}" alt="">` : '') : typeof r[c] === 'boolean' ? (r[c] ? 'Yes' : 'No') : /_on$|_date$|_at$/.test(c) ? fmt(r[c]) : esc(String(r[c] ?? '').slice(0, 90));
  const draw = q => {
    const rows = data.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
    $('#rows').innerHTML = rows.map(r => `<tr>${m.cols.map(c => `<td>${cell(r, c)}</td>`).join('')}<td style="white-space:nowrap">
      ${m.readOnly ? '' : `<button class="ghost" data-edit="${r.id}">Edit</button> `}<button class="danger" data-del="${r.id}">Delete</button></td></tr>`).join('') || `<tr><td colspan="${m.cols.length + 1}">No records found.</td></tr>`;
  };
  $('#main').innerHTML = `<div class="row" style="align-items:center"><h2>${m.label.replace('Manage ', '')}</h2><div style="text-align:right">${m.readOnly ? '' : '<button id="add">Add new</button>'}</div></div>
    <input id="q" placeholder="Search…"><table><tr>${m.cols.map(c => `<th>${esc(c.replace(/_/g, ' '))}</th>`).join('')}<th>Actions</th></tr><tbody id="rows"></tbody></table>`;
  draw('');
  $('#q').oninput = e => draw(e.target.value);
  if (!m.readOnly) $('#add').onclick = () => form(k, null);
  $('#rows').onclick = async e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) form(k, data.find(r => r.id === ed.dataset.edit));
    if (del && confirm('Delete this record? This cannot be undone.')) {
      const { error } = await db.from(m.table).delete().eq('id', del.dataset.del);
      if (error) return toast(error.message, true);
      toast('Deleted'); listView(k);
    }
  };
}

// ---------- add / edit form ----------
function fieldHtml([k, label, type, req, opts], v) {
  v = v ?? ''; const r = req ? 'required' : '';
  let i;
  if (type === 'textarea') i = `<textarea name="${k}" rows="3" ${r}>${esc(v)}</textarea>`;
  else if (type === 'select') i = `<select name="${k}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (type === 'check') i = `<input type="checkbox" name="${k}" ${v ? 'checked' : ''}>`;
  else if (type === 'upload' || type === 'uploads') i = `<input type="text" name="${k}" value="${esc(v)}" placeholder="Paste a link, or choose a file below"><input type="file" name="file_${k}" ${type === 'uploads' ? 'multiple accept="image/*"' : ''}>`;
  else if (type === 'progress') i = `<input type="number" name="${k}" min="0" max="100" value="${esc(v || 0)}">`;
  else i = `<input type="${type}" name="${k}" value="${esc(v)}" ${r}>`;
  return `<label>${label}${i}</label>`;
}
function form(k, row) {
  const m = MODULES[k];
  dlg.innerHTML = `<form id="ef"><h3>${row ? 'Edit' : 'Add'} record</h3>${m.fields.map(f => fieldHtml(f, row?.[f[0]])).join('')}
    <button>Save changes</button> <button type="button" class="ghost" id="cx">Cancel</button></form>`;
  dlg.showModal(); $('#cx').onclick = () => dlg.close();
  $('#ef').onsubmit = async e => {
    e.preventDefault(); const f = e.target, b = $('button', f); b.disabled = true; b.textContent = 'Saving…';
    try {
      const rec = {}, copies = [];
      for (const [c, , type] of m.fields) {
        if (type === 'check') rec[c] = f[c].checked;
        else if (type === 'upload' || type === 'uploads') {
          const files = [...f['file_' + c].files]; rec[c] = f[c].value.trim() || null;
          if (files.length) { const urls = []; for (const fl of files) urls.push(await upload(fl)); rec[c] = urls[0]; if (type === 'uploads' && !row) copies.push(...urls.slice(1)); }
        } else { const v = f[c].value.trim(); rec[c] = v === '' ? null : type === 'progress' ? Number(v) : v; }
      }
      if (k === 'gallery' && !rec.image_url) throw new Error('Please choose at least one photograph.');
      const recs = [rec, ...copies.map(u => ({...rec, image_url: u}))];
      const { error } = row ? await db.from(m.table).update(rec).eq('id', row.id) : await db.from(m.table).insert(recs);
      if (error) throw error;
      dlg.close(); toast('Saved'); listView(k);
    } catch (err) { toast(err.message || 'Could not save', true); b.disabled = false; b.textContent = 'Save changes'; }
  };
}

// ---------- website settings ----------
async function settings() {
  loading();
  const { data } = await db.from('settings').select('*'); const s = Object.fromEntries((data || []).map(r => [r.key, r.value]));
  $('#main').innerHTML = `<h2>Website settings</h2><form id="sf">${SETTINGS.map(([k, l, t]) => `<label>${l}${t ? `<textarea name="${k}" rows="3">${esc(s[k])}</textarea>` : `<input name="${k}" value="${esc(s[k])}">`}</label>`).join('')}<button>Save changes</button></form>`;
  $('#sf').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const { error } = await db.from('settings').upsert(SETTINGS.map(([k]) => ({key: k, value: f[k].value.trim()})));
    toast(error ? error.message : 'Saved', !!error);
  };
}

start();
