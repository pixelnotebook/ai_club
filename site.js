// ===== site.js: the public one-page website (Home, Members, Gallery, Achievements) =====
// Steps: 1) read data from the database  2) build the whole page  3) add small interactions
const D = {settings: {}};
const S = k => esc(D.settings[k] || '');
const img = (u, n) => safeUrl(u) ? `<img src="${esc(u)}" alt="${esc(n)}" loading="lazy">` : '';
let galCat = 'All', shown = [], lbIndex = 0;

async function load() {
  const [m, g, a, p, s] = await Promise.all([
    db.from('members').select('*').order('name'),
    db.from('gallery').select('*').order('created_at', {ascending: false}),
    db.from('achievements').select('*').order('achieved_on', {ascending: false}),
    db.from('projects').select('id', {count: 'exact', head: true}),
    db.from('settings').select('*')]);
  const bad = [m, g, a, p, s].find(r => r.error);
  if (bad) throw bad.error;
  D.members = m.data; D.gallery = g.data; D.achievements = a.data; D.projectCount = p.count || 0;
  s.data.forEach(r => D.settings[r.key] = r.value);
}

// small decorative "neural network" picture for the hero
const NET = `<svg class="net" viewBox="0 0 320 300" aria-hidden="true">
  <g><line x1="40" y1="60" x2="140" y2="40"/><line x1="40" y1="60" x2="130" y2="150"/><line x1="40" y1="150" x2="140" y2="40"/><line x1="40" y1="150" x2="130" y2="150"/>
  <line x1="40" y1="150" x2="130" y2="250"/><line x1="40" y1="240" x2="130" y2="150"/><line x1="40" y1="240" x2="130" y2="250"/>
  <line x1="140" y1="40" x2="240" y2="95"/><line x1="130" y1="150" x2="240" y2="95"/><line x1="130" y1="150" x2="240" y2="205"/><line x1="130" y1="250" x2="240" y2="205"/>
  <line x1="140" y1="40" x2="240" y2="205"/><line x1="240" y1="95" x2="300" y2="150"/><line x1="240" y1="205" x2="300" y2="150"/></g>
  <circle cx="40" cy="60" r="9"/><circle cx="40" cy="150" r="9"/><circle cx="40" cy="240" r="9"/>
  <circle class="b" cx="140" cy="40" r="11"/><circle class="a" cx="130" cy="150" r="13"/><circle class="b" cx="130" cy="250" r="11"/>
  <circle cx="240" cy="95" r="10"/><circle cx="240" cy="205" r="10"/><circle class="a" cx="300" cy="150" r="12"/></svg>`;

function build() {
  const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  const about = [['Our mission','mission'],['Our vision','vision'],['Why it matters','importance']]
    .filter(([, k]) => D.settings[k]).map(([t, k]) => `<div><h3>${t}</h3><p>${S(k)}</p></div>`).join('');

  const members = D.members.map(m => `<article class="m rv"><div class="av">${safeUrl(m.photo_url) ? img(m.photo_url, m.name) : `<div>${esc((m.name || '?')[0])}</div>`}</div>
    <h3>${esc(m.name)}</h3>${m.role ? `<span class="role">${esc(m.role)}</span>` : ''}<div class="cls">Class ${esc(m.class_div)}</div>
    ${m.intro ? `<p>${esc(m.intro)}</p>` : ''}
    ${m.interests ? `<div class="tags">${m.interests.split(',').map(t => `<i>${esc(t.trim())}</i>`).join('')}</div>` : ''}</article>`).join('');

  const cats = ['All', ...new Set(D.gallery.map(g => g.category).filter(Boolean))];
  const chips = cats.length > 2 ? `<div class="chips">${cats.map(c => `<button class="chip ${c === galCat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : '';

  const ach = D.achievements.map(a => `<article class="a rv ${a.featured ? 'f' : ''}"><div class="ico">${a.featured ? '🏆' : '⭐'}</div>
    <div><h3>${esc(a.title)}</h3><small>${fmt(a.achieved_on)}</small><p>${esc(a.description)}</p>${img(a.photo_url, a.title)}</div></article>`).join('');

  $('#view').innerHTML = `
  <section class="hero" id="home"><div class="wrap"><div>
    <span class="pill">${S('school_name')}</span>
    <h1>Young minds building with <em>AI</em></h1>
    <p>${S('welcome')}</p>
    <div class="cta"><a class="btn" href="#members">Meet the members</a><a class="btn line" href="#gallery">See the gallery</a></div>
  </div>${NET}</div></section>
  <div class="wrap"><div class="stats">${stat(D.members.length, 'Club members')}${stat(D.projectCount, 'Projects')}${stat(D.achievements.length, 'Achievements')}${stat(D.gallery.length, 'Photos')}</div></div>
  ${about ? `<section class="blk"><div class="wrap"><div class="about rv">${about}</div></div></section>` : ''}

  <section class="blk" id="members"><div class="wrap"><div class="head"><small>The team</small><h2>Club members</h2><p>The curious students who build, test and share AI projects together.</p></div>
    <div class="members">${members || '<div class="empty">Members will appear here soon.</div>'}</div></div></section>

  <section class="blk" id="gallery"><div class="wrap"><div class="head"><small>Moments</small><h2>Gallery</h2><p>Sessions, workshops, demos and celebrations from our AI Club.</p></div>
    ${chips}<div class="masonry" id="mas"></div></div></section>

  <section class="blk" id="achievements"><div class="wrap"><div class="head"><small>Proud moments</small><h2>Achievements</h2><p>Milestones and recognition earned by our students and the club.</p></div>
    <div class="ach">${ach || '<div class="empty">Achievements will appear here soon.</div>'}</div></div></section>`;
  drawGallery(); watch();
}

function drawGallery() {
  shown = D.gallery.filter(g => galCat === 'All' || g.category === galCat);
  $('#mas').innerHTML = shown.map((g, i) => `<figure class="g" style="margin-left:0;margin-right:0" tabindex="0" data-i="${i}">${img(g.image_url, g.caption)}<span>${esc(g.caption)}</span></figure>`).join('') || '<div class="empty">Photos will appear here soon.</div>';
}
function openLb(i) {
  if (!shown.length) return;
  lbIndex = (i + shown.length) % shown.length; const g = shown[lbIndex], lb = $('#lb');
  $('img', lb).src = safeUrl(g.image_url); $('img', lb).alt = g.caption; $('p', lb).textContent = [g.caption, g.description].filter(Boolean).join(' · ');
  if (!lb.open) lb.showModal();
}

// highlight the current section in the menu + gentle fade-in
function watch() {
  const links = [...document.querySelectorAll('#nav a')];
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id)); }), {rootMargin: '-45% 0px -50% 0px'});
  document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
  const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), {threshold: .12});
  document.querySelectorAll('.rv').forEach(el => rv.observe(el));
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-cat]'), g = e.target.closest('.g'), l = e.target.closest('[data-lb]');
  if (c) { galCat = c.dataset.cat; document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); drawGallery(); }
  if (g) openLb(+g.dataset.i);
  if (l) { const a = l.dataset.lb; a === 'close' ? $('#lb').close() : openLb(lbIndex + (a === 'next' ? 1 : -1)); }
  if (e.target.id === 'lb') $('#lb').close();   // click on the dark background closes it
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('g')) openLb(+e.target.dataset.i);
  if ($('#lb').open && e.key === 'ArrowRight') openLb(lbIndex + 1);
  if ($('#lb').open && e.key === 'ArrowLeft') openLb(lbIndex - 1);
});

load().then(() => {
  build();
  $('#foot').innerHTML = `<h3 style="color:#fff">${S('club_name')} · ${S('school_name')}</h3>
    <div class="partners"><span>Supported by ${S('donor')}</span><span>Managed by ${S('partner')}</span></div>
    <p>Website managed by ${S('managed_by')}. ${S('contact_email') ? 'Contact: ' + S('contact_email') : ''}</p>
    <p><a href="admin.html">Trainer login</a></p>`;
}).catch(err => { console.error(err); $('#view').innerHTML = '<div class="loading">Could not load the website. Please try again later.</div>'; });
