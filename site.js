// ===== site.js: the public, read-only website =====
// 1) load everything from the database  2) draw the page for the current #link
const D = {settings: {}};
const ORDER = {members:['name',true], projects:['created_at',false], gallery:['created_at',false],
  achievements:['achieved_on',false], events:['event_date',false], announcements:['posted_on',false], resources:['title',true]};
const today = new Date().toISOString().slice(0, 10);
let projFilter = 'All', galCat = 'All';
const S = k => esc(D.settings[k] || '');
const img = (u, name) => safeUrl(u) ? `<img src="${esc(u)}" alt="${esc(name)}" loading="lazy">` : `<div class="ph">${esc((name||'?')[0])}</div>`;
const lines = t => esc(t).split('\n').filter(Boolean).map(l => `<li>${l}</li>`).join('');

async function load() {
  const names = Object.keys(ORDER);
  const res = await Promise.all([
    ...names.map(t => db.from(t).select('*').order(ORDER[t][0], {ascending: ORDER[t][1]})),
    db.from('settings').select('*')]);
  const bad = res.find(r => r.error);
  if (bad) throw bad.error;
  names.forEach((t, i) => D[t] = res[i].data);
  res[names.length].data.forEach(r => D.settings[r.key] = r.value);
}

const annCard = a => `<div class="card"><div class="pad"><h3>${a.pinned ? '📌 ' : ''}${esc(a.title)}</h3><p>${esc(a.body)}</p><span class="muted">${fmt(a.posted_on)}</span></div></div>`;
const projCard = p => { const k = (p.status||'').replace(/\s/g,''); return `<div class="card ${k}">${img(p.photo_url,p.title)}<div class="pad">
  <span class="tag ${k}">${esc(p.status)}</span> <span class="muted">${esc(p.category)}</span>
  <h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
  <div class="bar"><i style="width:${+p.progress||0}%"></i></div><span class="muted">${+p.progress||0}% done · ${fmt(p.start_date)} to ${fmt(p.end_date)}</span>
  ${p.students ? `<p class="muted"><b>Team:</b> ${esc(p.students)}</p>` : ''}
  ${p.milestones ? `<ul class="muted">${lines(p.milestones)}</ul>` : ''}</div></div>`; };
const achCard = a => `<div class="card">${safeUrl(a.photo_url) ? img(a.photo_url,a.title) : ''}<div class="pad"><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><span class="muted">${fmt(a.achieved_on)}</span></div></div>`;
const evCard = e => `<div class="card">${safeUrl(e.photo_url) ? img(e.photo_url,e.title) : ''}<div class="pad"><span class="tag">${esc(e.kind)}</span><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><span class="muted">${fmt(e.event_date)} ${e.location ? '· ' + esc(e.location) : ''}</span></div></div>`;
const empty = t => `<p class="muted">${t}</p>`;
const page = (title, body) => `<section class="blk"><div class="wrap"><h2>${title}</h2>${body}</div></section>`;

const routes = {
  home() {
    const done = D.projects.filter(p => p.status === 'Completed').length;
    const active = D.projects.filter(p => p.status === 'In Progress').length;
    const past = D.events.filter(e => e.event_date <= today).length;
    const stat = (n, l) => `<div class="stat"><b>${n}</b>${l}</div>`;
    const feat = D.projects.filter(p => p.status !== 'Not Started').slice(0, 3);
    const fa = D.achievements.filter(a => a.featured).slice(0, 3);
    return `<section class="hero"><div class="wrap"><small>${S('school_name')}</small>
      <h1>Young minds learning to build with AI</h1><p>${S('welcome')}</p><p>${S('mission')}</p></div></section>
      <div class="wrap"><div class="stats">${stat(D.members.length,'Club members')}${stat(active,'Active projects')}${stat(done,'Completed projects')}${stat(D.achievements.length,'Achievements')}${stat(past,'Events held')}</div></div>
      <section class="blk"><div class="wrap"><h2>Latest announcements</h2><div class="grid">${D.announcements.slice(0,3).map(annCard).join('') || empty('No announcements yet.')}</div></div></section>
      <section class="blk"><div class="wrap"><h2>Featured projects</h2><div class="grid">${feat.map(projCard).join('') || empty('Projects will appear here.')}</div></div></section>
      <section class="blk"><div class="wrap"><h2>Recent activity and achievements</h2><div class="grid">${fa.map(achCard).join('')}${D.events.filter(e=>e.event_date<=today).slice(0,2).map(evCard).join('')}</div></div></section>`;
  },
  about() {
    const b = (t, k) => D.settings[k] ? `<div class="card"><div class="pad"><h3>${t}</h3><p>${S(k)}</p></div></div>` : '';
    return page('About the AI Club', `<p>${S('welcome')}</p><div class="grid">
      ${b('Vision','vision')}${b('Mission','mission')}
      <div class="card"><div class="pad"><h3>Objectives</h3><ul>${lines(D.settings.objectives)}</ul></div></div>
      ${b('Why AI education matters','importance')}${b('HP India (donor)','role_hp')}${b('Learning Links Foundation (partner)','role_llf')}${b('School and AI Club Trainer','role_school')}</div>`);
  },
  members() {
    return page('Club members', `<div class="grid">${D.members.map(m => `<div class="card">${img(m.photo_url,m.name)}<div class="pad">
      <h3>${esc(m.name)}</h3><span class="tag">${esc(m.role)}</span><p class="muted">Class ${esc(m.class_div)} · Joined ${fmt(m.joined_on)}</p>
      <p>${esc(m.intro)}</p>${m.interests ? `<p class="muted"><b>Interests:</b> ${esc(m.interests)}</p>` : ''}</div></div>`).join('') || empty('No members yet.')}</div>`);
  },
  projects() {
    const f = {All: () => true, Ongoing: p => ['In Progress','On Hold'].includes(p.status), Upcoming: p => p.status === 'Not Started', Completed: p => p.status === 'Completed'};
    const chips = Object.keys(f).map(k => `<button class="ghost ${k === projFilter ? 'on' : ''}" data-proj="${k}">${k}</button>`).join('');
    return page('Projects and tasks', `<div class="chips">${chips}</div><div class="grid">${D.projects.filter(f[projFilter]).map(projCard).join('') || empty('No projects in this view.')}</div>`);
  },
  gallery() {
    const cats = ['All', ...new Set(D.gallery.map(g => g.category).filter(Boolean))];
    if (!cats.includes(galCat)) galCat = 'All';
    const chips = cats.map(c => `<button class="ghost ${c === galCat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    const items = D.gallery.filter(g => galCat === 'All' || g.category === galCat);
    return page('Gallery', `<div class="chips">${chips}</div><div class="grid">${items.map(g => `<div class="card" style="cursor:pointer" data-big="${esc(g.image_url)}" data-cap="${esc(g.caption)}">${img(g.image_url,g.caption)}<div class="pad"><b>${esc(g.caption)}</b><br><span class="muted">${esc(g.description)}</span></div></div>`).join('') || empty('No photos yet.')}</div>`);
  },
  achievements() { return page('Achievements and recognition', `<div class="grid">${D.achievements.map(achCard).join('') || empty('No achievements yet.')}</div>`); },
  events() {
    const up = D.events.filter(e => e.event_date >= today).reverse(), past = D.events.filter(e => e.event_date < today);
    return page('Upcoming events', `<div class="grid">${up.map(evCard).join('') || empty('No upcoming events right now.')}</div>`) +
      page('Past events', `<div class="grid">${past.map(evCard).join('') || empty('No past events yet.')}</div>`);
  },
  announcements() { return page('Announcements', `<div class="list">${[...D.announcements].sort((a,b) => b.pinned - a.pinned).map(annCard).join('') || empty('No announcements yet.')}</div>`); },
  resources() {
    return page('Learning and resources', `<div class="grid">${D.resources.map(r => `<div class="card"><div class="pad"><span class="tag">${esc(r.kind)}</span><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p>${safeUrl(r.url) ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Open</a>` : ''}</div></div>`).join('') || empty('No resources yet.')}</div>`);
  },
  contact() {
    return page('Contact and feedback', `<div class="row"><div><p><b>${S('school_name')}</b><br>${S('contact_address')}</p><p>Phone: ${S('contact_phone')}<br>Email: ${S('contact_email')}</p></div>
      <form id="fb"><label>Your name<input name="name" required maxlength="80"></label><label>Email (optional)<input name="email" type="email" maxlength="120"></label>
      <label>Feedback or question<textarea name="message" rows="4" required minlength="5" maxlength="2000"></textarea></label><button>Send feedback</button></form></div>`);
  }
};

function render() {
  const name = location.hash.slice(1) || 'home';
  $('#view').innerHTML = (routes[name] || routes.home)();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.hash === '#' + name));
  scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-proj],[data-cat],[data-big]'); if (!t) return;
  if (t.dataset.proj) { projFilter = t.dataset.proj; render(); }
  if (t.dataset.cat) { galCat = t.dataset.cat; render(); }
  if (t.dataset.big && safeUrl(t.dataset.big)) { const lb = $('#lb'); $('img', lb).src = t.dataset.big; $('p', lb).textContent = t.dataset.cap; lb.showModal(); }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'fb') return;
  e.preventDefault(); const f = e.target, btn = $('button', f); btn.disabled = true; btn.textContent = 'Sending…';
  const { error } = await db.from('feedback').insert({name: f.name.value.trim(), email: f.email.value.trim() || null, message: f.message.value.trim()});
  btn.disabled = false; btn.textContent = 'Send feedback';
  if (error) return toast('Could not send feedback. Please try again.', true);
  f.reset(); toast('Thank you! Your feedback was sent to the trainer.');
});
window.addEventListener('hashchange', render);

load().then(() => {
  $('#foot').innerHTML = `<p><b>${S('club_name')}</b> at ${S('school_name')}</p>
    <p>Supported by <b>${S('donor')}</b> · Implemented and managed by <b>${S('partner')}</b> · Website managed by ${S('managed_by')}</p>
    <p><a href="admin.html">Trainer login</a></p>`;
  render();
}).catch(err => { console.error(err); $('#view').innerHTML = '<div class="loading">Could not load the portal. Check config.js and that setup.sql was run.</div>'; });
