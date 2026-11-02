// ===== shared.js: connects to Supabase and holds small helper functions =====
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = (s, r = document) => r.querySelector(s);
// esc() makes text safe to show on a page (stops people injecting HTML)
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// safeUrl() only allows http/https links
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : '';
function toast(msg, bad) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.append(t); }
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(t.timer); t.timer = setTimeout(() => t.className = '', 3500);
}
// Uploads one file to the "club-media" storage bucket and returns its public link
async function upload(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('File is larger than 10 MB: ' + file.name);
  const path = Date.now() + '-' + file.name.replace(/[^\w.-]/g, '_');
  const { error } = await db.storage.from('club-media').upload(path, file);
  if (error) throw error;
  return db.storage.from('club-media').getPublicUrl(path).data.publicUrl;
}
