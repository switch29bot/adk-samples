#!/usr/bin/env node
/*
 * Rendu image par image de index.html (Chromium headless via Playwright) → MP4 H.264.
 *
 *   node render.cjs                      → out/switch-une-tache-quatre-gestes.mp4 + vignette
 *   node render.cjs --stills 0,3.2,9.5   → out/stills/t-*.png (contrôle rapide)
 *   node render.cjs --sheet              → out/planche.png (planche contact)
 *
 * Les visuels réels sont lus dans assets/ s’ils existent ; sinon un cadre en verre
 * neutre marqué [VISUEL À FOURNIR] les remplace.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const W = 1080, H = 1350, FPS = 30, DUR = 27;
const OUT = path.join(ROOT, 'out');
const NAME = 'switch-une-tache-quatre-gestes';

const asset = f => (fs.existsSync(path.join(ROOT, 'assets', f)) ? 'assets/' + f : null);
const ASSETS = {
  switchscope: asset('switchscope-fragment.png'),
  livret: asset('livret-switch-school.png'),
  photo: asset('photo-equipe.jpg'),
};

async function open() {
  const browser = await chromium.launch({
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('[page]', m.text()); });
  await page.addInitScript(a => { window.ASSETS = a; }, ASSETS);
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.evaluate(() => window.ready);
  return { browser, page };
}
const shot = (page, t) => page.evaluate(x => window.seek(x), t).then(() => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } }));

async function stills(times) {
  const { browser, page } = await open();
  const dir = path.join(OUT, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    const f = path.join(dir, `t-${t.toFixed(2).padStart(5, '0')}.png`);
    fs.writeFileSync(f, await shot(page, t));
    console.log(f);
  }
  await browser.close();
}

async function video() {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page } = await open();
  console.log('Visuels :', ASSETS, '· étiquettes :', await page.evaluate(() => window.__labelCount));
  const mp4 = path.join(OUT, NAME + '.mp4');
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-level', '4.1',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-an', '-movflags', '+faststart', mp4,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  const N = FPS * DUR;
  for (let f = 0; f < N; f++) {
    const buf = await shot(page, f / FPS);
    if (f === 0) fs.writeFileSync(path.join(OUT, NAME + '-vignette.png'), buf);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 90 === 0) console.log(`image ${f}/${N}`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(mp4);
}

async function sheet() {
  const times = [0, 1.2, 2.7, 3.6, 5.25, 6.6, 8.2, 10, 11.7, 13.5, 15.2, 17.6, 18.7, 20.5, 22.4, 26.5];
  const { browser, page } = await open();
  const tiles = [];
  for (const t of times) tiles.push({ t, b64: (await shot(page, t)).toString('base64') });
  const html = `<body style="margin:0;background:#1d2433;display:grid;grid-template-columns:repeat(4,270px);gap:8px;padding:8px;font:14px sans-serif;color:#cfd8ee">${
    tiles.map(x => `<div><img src="data:image/png;base64,${x.b64}" style="width:270px;height:337.5px;display:block"><div style="padding:3px 0">${x.t.toFixed(2)} s</div></div>`).join('')}</body>`;
  const p2 = await browser.newPage({ viewport: { width: 4 * 270 + 5 * 8, height: 400 } });
  await p2.setContent(html);
  await p2.screenshot({ path: path.join(OUT, 'planche.png'), fullPage: true });
  await browser.close();
  console.log(path.join(OUT, 'planche.png'));
}

const arg = process.argv[2];
(arg === '--stills' ? stills(process.argv[3].split(',').map(Number)) : arg === '--sheet' ? sheet() : video())
  .catch(e => { console.error(e); process.exit(1); });
