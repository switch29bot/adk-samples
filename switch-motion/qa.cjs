#!/usr/bin/env node
/*
 * Contrôle automatique des règles du brief, image par image (810 images, sans capture) :
 *  - taille des textes (titres ≥ 81 px, autres ≥ 47 px) ;
 *  - chaque texte entre en ≤ 0,4 s puis reste immobile et lisible ≥ 1,5 s ;
 *  - 7 mots maximum par écran hors carton final (titres ; les étiquettes d’usages
 *    et l’étiquette suivie sont des objets du storyboard, comptées à part) ;
 *  - aucune image vide ;
 *  - image immobile pendant les 2 dernières secondes.
 * Écrit out/qa.md et sort en erreur si une règle n’est pas tenue.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname, W = 1080, H = 1350, FPS = 30, DUR = 27, N = FPS * DUR;
const asset = f => (fs.existsSync(path.join(ROOT, 'assets', f)) ? 'assets/' + f : null);

(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.addInitScript(a => { window.ASSETS = a; }, {
    switchscope: asset('switchscope-fragment.png'), livret: asset('livret-switch-school.png'), photo: asset('photo-equipe.jpg'),
  });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.evaluate(() => window.ready);

  // Recense les textes
  const meta = await page.evaluate(() => {
    const items = [];
    const add = (e, kind) => { e.dataset.qa = items.length; items.push({ text: e.textContent.trim(), kind, size: parseFloat(getComputedStyle(e).fontSize) }); };
    document.querySelectorAll('.brand .main').forEach(e => add(e, 'titre'));
    document.querySelectorAll('#p1 .t, #p2 .t, #titles .t').forEach(e => add(e, /agenceswitch/.test(e.textContent) ? 'autre' : 'titre'));
    document.querySelectorAll('.lab').forEach(e => add(e, 'étiquette'));
    add(document.querySelector('#hero'), 'étiquette suivie');
    document.querySelectorAll('.ph').forEach(e => add(e, 'repère [VISUEL À FOURNIR]'));
    window.__qaEls = [...document.querySelectorAll('[data-qa]')].sort((x, y) => x.dataset.qa - y.dataset.qa);
    return items;
  });

  // État de chaque texte à chaque image
  const states = [];
  const busy = [];
  for (let f = 0; f < N; f++) {
    const s = await page.evaluate(t => {
      window.seek(t);
      const out = [];
      window.__qaEls.forEach(e => {
        let op = 1, filt = '', node = e, shown = e.getClientRects().length > 0 && getComputedStyle(e).visibility === 'visible';
        while (node && node.id !== 'stage') { const cs = getComputedStyle(node); op *= parseFloat(cs.opacity); if (cs.filter !== 'none') filt += cs.filter; if (cs.display === 'none') shown = false; node = node.parentElement; }
        const r = e.getBoundingClientRect();
        const onScreen = r.right > 0 && r.left < 1080 && r.bottom > 0 && r.top < 1350;
        const vis = shown && op > .02 && onScreen;
        out.push(vis ? [1, `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}|${op.toFixed(3)}|${filt}`] : [0, '']);
      });
      // Contenu non textuel visible (symbole, cadres, schéma)
      const vis = id => getComputedStyle(document.getElementById(id)).visibility === 'visible';
      const frames = [...document.querySelectorAll('#frames .fr')].some(e => getComputedStyle(e).visibility === 'visible');
      return { out, gfx: vis('sym') || frames || vis('deploy') };
    }, f / FPS);
    states.push(s.out);
    busy.push(s.gfx || s.out.some(x => x[0]));
  }

  // Analyse
  const fails = [];
  const rows = [];
  meta.forEach((m, i) => {
    const minSize = m.kind === 'titre' ? 81 : 47;
    if (m.size < minSize) fails.push(`Taille : « ${m.text} » ${m.size}px < ${minSize}px`);
    // segments visibles
    let f = 0;
    while (f < N) {
      if (!states[f][i][0]) { f++; continue; }
      const start = f; while (f < N && states[f][i][0]) f++;
      const end = f;   // exclu
      // runs immobiles
      const runs = []; let a = start;
      for (let k = start + 1; k <= end; k++) if (k === end || states[k][i][1] !== states[a][i][1]) { runs.push([a, k]); a = k; }
      // première tenue : premier run immobile ≥ 3 images
      const holds = runs.filter(r => r[1] - r[0] >= 3);
      if (!holds.length) { fails.push(`« ${m.text} » jamais immobile (${(start / FPS).toFixed(2)} s)`); continue; }
      // vérifie chaque entrée/déplacement : mouvement ≤ 0,4 s puis tenue ≥ 1,5 s (sauf sortie finale)
      let prevEnd = start;
      holds.forEach((h, j) => {
        const move = (h[0] - prevEnd) / FPS, hold = (h[1] - h[0]) / FPS;
        if (move > .4 + 1e-6) fails.push(`« ${m.text} » : entrée/déplacement de ${move.toFixed(2)} s à ${(prevEnd / FPS).toFixed(2)} s`);
        if (hold < 1.5 - 1e-6) fails.push(`« ${m.text} » : immobile seulement ${hold.toFixed(2)} s à ${(h[0] / FPS).toFixed(2)} s`);
        rows.push([m.kind, m.text, m.size, (prevEnd / FPS).toFixed(2), move.toFixed(2), (h[0] / FPS).toFixed(2), hold.toFixed(2)]);
        prevEnd = h[1];
      });
    }
  });

  // Mots par écran (titres seulement)
  const plans = [['Plan 1', 0, 2.5], ['Plan 2', 2.5, 5], ['Plan 3', 5, 8], ['Plan 4', 8, 11.5], ['Plan 5', 11.5, 15], ['Plan 6', 15, 18.5], ['Plan 7', 18.5, 22], ['Carton final', 22, 27]];
  const words = plans.map(([name, a, b]) => {
    let max = 0, extra = 0;
    for (let f = Math.round(a * FPS); f < Math.round(b * FPS); f++) {
      let n = 0, x = 0;
      meta.forEach((m, i) => { if (!states[f][i][0]) return; const w = m.text.split(/\s+/).filter(Boolean).length; if (m.kind === 'titre' || m.kind === 'autre') n += w; else x += w; });
      max = Math.max(max, n); extra = Math.max(extra, x);
    }
    if (name !== 'Carton final' && max > 7) fails.push(`${name} : ${max} mots à l’écran`);
    return [name, max, extra];
  });

  // Images vides
  const empty = busy.map((b, f) => (b ? null : f)).filter(x => x !== null);
  if (empty.length) fails.push(`Images vides : ${empty.slice(0, 10).join(', ')}…`);

  // Immobilité des 2 dernières secondes
  const lastA = await page.evaluate(() => { window.seek(25.0); return document.getElementById('stage').innerHTML; });
  const lastB = await page.evaluate(() => { window.seek(26.97); return document.getElementById('stage').innerHTML; });
  const still = lastA === lastB;
  if (!still) fails.push('Les 2 dernières secondes ne sont pas immobiles');
  await browser.close();

  const md = [
    '# Contrôle automatique — « Une tâche, quatre gestes »', '',
    `Résultat : **${fails.length ? 'ÉCHEC' : 'conforme'}**`, '',
    ...(fails.length ? ['## Écarts', '', ...fails.map(x => '- ' + x), ''] : []),
    '## Textes : entrée et tenue', '',
    '| Type | Texte | Taille | Début mvt (s) | Durée mvt (s) | Immobile dès (s) | Tenue (s) |', '|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.join(' | ')} |`), '',
    '## Mots par écran', '',
    '| Plan | Mots des titres (max) | Mots d’étiquettes / repères (max) |', '|---|---|---|',
    ...words.map(w => `| ${w.join(' | ')} |`), '',
    `Images vides : ${empty.length} · Dernières 2 s immobiles : ${still ? 'oui' : 'non'}`, '',
  ].join('\n');
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'out', 'qa.md'), md);
  console.log(fails.length ? fails.join('\n') : 'Toutes les règles contrôlées sont tenues.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
