// Small server for the cookbook: serves the site and saves/deletes recipe files.
// Usage: node serve.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const ROOT = __dirname;
const RECIPES = path.join(ROOT, 'recipes');
const INDEX = path.join(RECIPES, 'index.json');
const PORT = 8080;

const readIndex = () => JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const writeIndex = (files) => fs.writeFileSync(INDEX, JSON.stringify(files, null, 2) + '\n');

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function saveRecipe(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let r;
    try { r = JSON.parse(body); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    if (!r.title || !r.category || !Array.isArray(r.ingredients) || !Array.isArray(r.steps)) {
      return send(res, 400, { error: 'Missing fields' });
    }
    const recipe = {
      title: String(r.title), category: String(r.category),
      time: Number(r.time), servings: Number(r.servings),
      ingredients: r.ingredients.map(String), steps: r.steps.map(String),
    };
    // Pick a filename that isn't taken: pancakes.json, pancakes-2.json, ...
    const base = slugify(recipe.title);
    let file = `${base}.json`;
    for (let n = 2; fs.existsSync(path.join(RECIPES, file)); n++) file = `${base}-${n}.json`;

    fs.writeFileSync(path.join(RECIPES, file), JSON.stringify(recipe, null, 2) + '\n');
    writeIndex([...readIndex(), file]);
    send(res, 201, { file });
  });
}

function deleteRecipe(file, res) {
  const files = readIndex();
  if (!files.includes(file)) return send(res, 404, { error: 'Not found' });
  fs.rmSync(path.join(RECIPES, file), { force: true });
  writeIndex(files.filter((f) => f !== file));
  send(res, 200, { ok: true });
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (req.method === 'POST' && urlPath === '/api/recipes') return saveRecipe(req, res);
  if (req.method === 'DELETE' && urlPath.startsWith('/api/recipes/')) {
    return deleteRecipe(urlPath.slice('/api/recipes/'.length), res);
  }

  const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Cookbook running at http://localhost:${PORT}`));
