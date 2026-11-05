// Recipes live in recipes/*.json (listed in recipes/index.json).
// Saving and deleting go through serve.js, which writes those files.
const $ = (id) => document.getElementById(id);

// --- Theme ---
const THEME_KEY = 'cookbook-theme';
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeBtn').textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('themeBtn').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };
}

// --- Recipes ---
async function loadRecipes() {
  const files = await (await fetch('recipes/index.json', { cache: 'no-store' })).json();
  return Promise.all(files.map(async (f) =>
    ({ ...(await (await fetch(`recipes/${f}`, { cache: 'no-store' })).json()), id: f })));
}

let recipes = [];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderCategories() {
  const sel = $('category');
  const current = sel.value;
  const cats = [...new Set(recipes.map((r) => r.category))].sort();
  sel.innerHTML = '<option value="">All categories</option>' +
    cats.map((c) => `<option ${c === current ? 'selected' : ''}>${esc(c)}</option>`).join('');
}

function render() {
  const q = $('search').value.toLowerCase();
  const cat = $('category').value;
  const shown = recipes.filter((r) =>
    (!cat || r.category === cat) &&
    (r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q))));
  $('list').innerHTML = shown.map((r) => `
    <article class="card" data-id="${esc(r.id)}">
      <span class="tag">${esc(r.category)}</span>
      <h3>${esc(r.title)}</h3>
      <div class="meta">${r.time} min · serves ${r.servings}</div>
    </article>`).join('');
  $('empty').hidden = shown.length > 0;
}

function showDetail(id) {
  const r = recipes.find((x) => x.id === id);
  const d = $('detail');
  d.innerHTML = `
    <span class="tag">${esc(r.category)}</span>
    <h2>${esc(r.title)}</h2>
    <div class="meta">${r.time} min · serves ${r.servings}</div>
    <h3>Ingredients</h3><ul>${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    <h3>Steps</h3><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="actions">
      <button type="button" id="del">Delete</button>
      <button id="close">Close</button>
    </div>`;
  d.querySelector('#close').onclick = () => d.close();
  d.querySelector('#del').onclick = async () => {
    if (!confirm(`Delete "${r.title}"? This removes its file.`)) return;
    const res = await fetch(`api/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) return alert('Could not delete the recipe. Is serve.js running?');
    recipes = recipes.filter((x) => x.id !== id);
    renderCategories(); render(); d.close();
  };
  d.showModal();
}

$('list').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) showDetail(card.dataset.id);
});
$('search').addEventListener('input', render);
$('category').addEventListener('change', render);
$('addBtn').onclick = () => { $('form').reset(); $('formDialog').showModal(); };
$('cancel').onclick = () => $('formDialog').close();

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData($('form'));
  const lines = (k) => f.get(k).split('\n').map((s) => s.trim()).filter(Boolean);
  const recipe = {
    title: f.get('title').trim(),
    category: f.get('category').trim(),
    time: Number(f.get('time')),
    servings: Number(f.get('servings')),
    ingredients: lines('ingredients'),
    steps: lines('steps'),
  };
  const res = await fetch('api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) return alert('Could not save the recipe. Is serve.js running?');
  const { file } = await res.json();
  recipes.push({ ...recipe, id: file });
  renderCategories(); render();
  $('formDialog').close();
});

initTheme();
loadRecipes()
  .catch(() => {
    $('empty').textContent = 'Could not load recipes/. Run "node serve.js" and open http://localhost:8080';
    return [];
  })
  .then((loaded) => {
    recipes = loaded;
    renderCategories();
    render();
  });
