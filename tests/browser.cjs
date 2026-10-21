// Validation sans dépendance externe : Chrome headless + protocole CDP.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const server = require('../server.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let child, socket;
(async () => {
  console.log('Démarrage du serveur et de Chrome headless…');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const port = 9337;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-browser-'));
  child = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  child.on('error', e => { console.error(e); });
  let tabs;
  for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1000) })).json(); break; } catch { await delay(100); } }
  assert.ok(tabs, 'Chrome doit exposer le protocole de test');
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map(), errors = [];
  socket.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const task = pending.get(msg.id); if (task) { pending.delete(msg.id); msg.error ? task.reject(msg.error) : task.resolve(msg.result); } }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text + ' ' + msg.params.exceptionDetails.exception?.description);
    if (msg.method === 'Network.loadingFailed') errors.push(msg.params.errorText);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const seq = ++id;
    const timer = setTimeout(() => { pending.delete(seq); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(seq, { resolve: x => { clearTimeout(timer); resolve(x); }, reject: e => { clearTimeout(timer); reject(e); } });
    socket.send(JSON.stringify({ id: seq, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const audioReady = async () => {
    for (let i = 0; i < 80; i++) {
      if (await evaluate('astra.sound.buffers.size === 15 && astra.sound.playing')) return;
      await delay(50);
    }
    throw new Error('Audio non initialisé après Jouer');
  };
  const rms = () => evaluate(`new Promise(resolve => {
    const samples = new Float32Array(astra.sound.analyser.fftSize);
    let energy = 0, peak = 0, count = 0;
    const sample = () => {
      astra.sound.analyser.getFloatTimeDomainData(samples);
      for (const value of samples) { energy += value * value; peak = Math.max(peak, Math.abs(value)); }
      if (++count === 10) resolve({ rms: Math.sqrt(energy / (samples.length * count)), peak });
      else setTimeout(sample, 20);
    }; sample();
  })`);
  const key = async key => { await call('Input.dispatchKeyEvent', { type: 'keyDown', key }); await call('Input.dispatchKeyEvent', { type: 'keyUp', key }); };
  const click = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'nearest' })`);
    const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
  };
  await call('Runtime.enable'); await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: pathToFileURL(path.join(__dirname, '..', 'index.html')).href });
  for (let i = 0; i < 100; i++) { if (await evaluate('!!window.astra')) break; await delay(100); }
  assert.equal(await evaluate('astra.game.state'), 'ready');
  assert.equal(await evaluate('astra.sound.context'), null);
  await click('#start'); await audioReady();
  let initialSignal = await rms();
  for (let i = 0; i < 5 && initialSignal.rms <= 0.0001; i++) {
    await delay(100); initialSignal = await rms();
  }
  assert.ok(initialSignal.rms > 0.0001, 'musique audible en ouverture file:// : ' + JSON.stringify(initialSignal));
  console.log('Ouverture directe du fichier index.html : OK.');
  await call('Page.navigate', { url: origin });
  console.log('Page chargée ; vérification des interactions…');
  for (let i = 0; i < 100; i++) { if (await evaluate('!!window.astra')) break; await delay(100); }
  assert.equal(await evaluate('astra.game.state'), 'ready');
  fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
  const screenshot = async name => {
    const result = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'screenshots', name + '.png'), Buffer.from(result.data, 'base64'));
  };
  await screenshot('01-accueil');
  await click('#start'); await delay(200);
  await audioReady();
  assert.equal(await evaluate('astra.game.state'), 'playing');
  await key('h'); assert.equal(await evaluate('astra.game.mode'), 'normal');
  const before = await evaluate('astra.game.leader.pos.x');
  const box = await evaluate(`(() => {const r = document.querySelector('canvas').getBoundingClientRect(); return { x:r.x+r.width*.65, y:r.y+r.height*.55 };})()`);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...box }); await delay(500);
  assert.ok(await evaluate(`astra.game.leader.pos.x > ${before} + 5`));
  await evaluate('astra.game.leader.pos.set(640, 500); astra.game.leader.vel.set(0, 0); astra.game.projectiles = []');
  const screenPoint = (x, y) => evaluate(`(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x + r.width * ${x} / 1280, y: r.y + r.height * ${y} / 800 }; })()`);
  const right = await screenPoint(1100, 500);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...right, button: 'left', clickCount: 1 });
  await delay(350);
  assert.equal(await evaluate('astra.game.aiming && astra.game.firing'), true);
  assert.ok(await evaluate('Math.abs(astra.game.leader.pos.x - 640) < 2'));
  assert.ok(await evaluate('astra.game.projectiles.some(p => p.vel.x > 11 && Math.abs(p.vel.y) < 0.01)'));
  const below = await screenPoint(300, 720);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...below, button: 'left', buttons: 1 }); await delay(200);
  assert.ok(await evaluate('astra.game.projectiles.some(p => p.vel.x < 0 && p.vel.y > 0)'),
    JSON.stringify(await evaluate('({aiming:astra.game.aiming, firing:astra.game.firing, aim:astra.game.aimPointer, pos:astra.game.leader.pos, shots:astra.game.projectiles.map(p=>({x:p.vel.x,y:p.vel.y})), state:astra.game.state})')));
  assert.ok(await evaluate('astra.game.leader.aimDirection.x < 0 && astra.game.leader.aimDirection.y > 0'));
  await screenshot('06-visee-360');
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...below, button: 'left', clickCount: 1 });
  assert.equal(await evaluate('astra.game.aiming || astra.game.firing'), false);
  const releaseX = await evaluate('astra.game.leader.pos.x'); await delay(250);
  assert.ok(await evaluate(`astra.game.leader.pos.x < ${releaseX} - 3`));
  await key('t'); assert.equal(await evaluate('astra.game.firing'), false);
  assert.ok(await evaluate('astra.game.projectiles.length > 0'));
  // Cas contrôlé : collecte par la vraie boucle du jeu avec p5.Vector réel.
  await evaluate(`astra.game.bonuses.push(new Bonus(astra.game.leader.pos.x, astra.game.leader.pos.y, 'recruit'))`);
  await delay(100); assert.equal(await evaluate('astra.game.allies.length'), 1);
  await key('h'); assert.equal(await evaluate('astra.game.mode'), 'protection');
  await evaluate('astra.game.leader.hp = 40; astra.game.bonuses.push(new Bonus(astra.game.leader.pos.x, astra.game.leader.pos.y, "heal"))');
  await delay(100); assert.equal(await evaluate('astra.game.leader.hp'), 72);
  await key('i'); assert.equal(await evaluate('astra.game.mode'), 'normal');
  await key('d'); assert.equal(await evaluate('astra.game.debug && document.querySelector("#debug").checked'), true);
  await click('#settings-toggle'); assert.equal(await evaluate('document.querySelector("#settings").hidden'), false);
  await evaluate('document.querySelector("#setting-speed").value = 7; document.querySelector("#setting-speed").dispatchEvent(new Event("input"))');
  assert.equal(await evaluate('astra.game.settings.speed'), 7);
  await click('#defaults'); assert.equal(await evaluate('astra.game.settings.speed'), 5.8);
  await click('#settings-close'); await click('#help-toggle');
  assert.equal(await evaluate('document.querySelector("#help").hidden'), false);
  await click('#help-close'); await key('Escape'); await delay(100);
  const frame = await evaluate('astra.game.frame'); await delay(150);
  assert.equal(await evaluate('astra.game.frame'), frame);
  assert.equal(await evaluate('astra.sound.musicSources.length + astra.sound.voices.size'), 0);
  assert.ok((await rms()).rms < 0.00001, 'pause : signal audio silencieux');
  await key('Escape'); await delay(100); assert.ok(await evaluate(`astra.game.frame > ${frame}`));
  assert.equal(await evaluate('astra.sound.musicSources.length'), 2);
  await click('#mute');
  // Laisser passer la latence du périphérique et la fenêtre de l'analyseur.
  await delay(250);
  assert.equal(await evaluate('astra.sound.muted && astra.sound.master.gain.value === 0'), true);
  const mutedSignal = await rms();
  assert.ok(mutedSignal.rms < 0.00001, 'mute coupe réellement le mix : ' + JSON.stringify(mutedSignal));
  await click('#mute'); await delay(150);
  assert.ok((await rms()).rms > 0.0001, 'unmute restaure le signal');
  await click('#settings-toggle');
  await evaluate('document.querySelector("#music-volume").value = 0; document.querySelector("#music-volume").dispatchEvent(new Event("input")); document.querySelector("#effects-volume").value = 0; document.querySelector("#effects-volume").dispatchEvent(new Event("input"))');
  await delay(300); assert.ok((await rms()).rms < 0.00001, 'deux volumes nuls : silence');
  await evaluate('document.querySelector("#effects-volume").value = 75; document.querySelector("#effects-volume").dispatchEvent(new Event("input"))');
  assert.equal(await evaluate('astra.sound.effectsVolume'), 0.75);
  assert.equal(await evaluate('astra.sound.musicVolume'), 0);
  await evaluate('astra.sound.play("level")');
  const effectSignal = await rms(); assert.ok(effectSignal.rms > 0.0001 && effectSignal.peak < 1);
  await click('#defaults'); await click('#settings-close');
  // Progression sans interrompre la simulation ; grand ennemi et avertissement réels.
  await evaluate('astra.game.score = 1500'); await delay(100);
  assert.equal(await evaluate('astra.game.level'), 3);
  assert.equal(await evaluate('document.querySelector("#level-banner").hidden'), false);
  assert.ok(await evaluate('document.querySelector("#next-threshold").textContent.includes("3")'));
  await evaluate('astra.game.enemies = []; const heavy = new HeavyEnemy(650, 180, astra.game.difficulty, astra.game.config.heavy); heavy.missileTimer = 0; astra.game.enemies.push(heavy)');
  await delay(100); assert.ok(await evaluate('astra.game.enemies[0].warningRemaining > 0'));
  await screenshot('05-niveau-missile');
  await delay(1100); assert.ok(await evaluate('astra.game.projectiles.some(p => p.missile)'));
  // S piloté au clavier : menace contrôlée, recharge et H/I sans perdre les ailiers.
  await evaluate('astra.game.enemies = []; astra.game.projectiles = []; astra.game.leader.invulnerable = 0; const p = new Projectile(new Enemy(0, 0), astra.game.leader.pos); p.pos.set(astra.game.leader.pos.x - 120, astra.game.leader.pos.y); p.vel = p5.Vector.sub(astra.game.leader.pos, p.pos).setMag(5); astra.game.projectiles.push(p)');
  await key('s'); await delay(100);
  assert.ok(await evaluate('astra.game.leader.dodgeRemaining > 0'));
  assert.equal(await evaluate('astra.game.leader.invulnerable'), 0);
  await key('h'); assert.equal(await evaluate('astra.game.mode'), 'protection');
  await key('i'); assert.equal(await evaluate('astra.game.mode'), 'normal');
  await delay(650); assert.equal(await evaluate('astra.game.leader.dodgeRemaining'), 0);
  assert.ok(await evaluate('astra.game.leader.dodgeCooldown > 0'));
  assert.ok(await evaluate('document.querySelector("#dodge-status-text").textContent.includes("RECHARGE")'));
  await evaluate(`astra.game.enemies.push(new Enemy(400, 200), new Enemy(800, 150)); astra.game.obstacles.push(new Obstacle(660, 320, 38)); astra.game.bonuses.push(new Bonus(350, 350, 'heal')); astra.game.recruit(); astra.game.recruit();`);
  await key('h'); await delay(500); await screenshot('02-mission-debug');
  await key('d'); await delay(250); await screenshot('03-mission');
  await evaluate('astra.game.leader.hp = 0'); await delay(100);
  assert.equal(await evaluate('astra.game.state'), 'over'); await click('#start'); await delay(100);
  assert.equal(await evaluate('astra.game.state'), 'playing'); assert.equal(await evaluate('astra.game.allies.length'), 0);
  assert.equal(await evaluate('astra.game.leader.hp'), 100);
  assert.equal(await evaluate('astra.game.level'), 1); assert.equal(await evaluate('astra.game.leader.dodgeCooldown'), 0);
  // Galerie de scénarios contrôlés : rendu réel, sans faire combattre le joueur pendant les captures.
  await evaluate(`noLoop(); accumulator = -1000000; astra.game.leader.pos.set(640, 560); astra.game.leader.hp = 72;
    astra.game.recruit(); astra.game.allies[0].pos.set(590, 620);
    astra.game.obstacles = [new Obstacle(430, 320, 39, 0.4), new Obstacle(780, 460, 32, 0.7)];
    astra.game.bonuses = [new Bonus(320, 530, 'heal')];
    window.themeAudit = { leader: astra.game.leader, ally: astra.game.allies[0], obstacle: astra.game.obstacles[0] }; draw();`);
  const fingerprint = () => evaluate(`(() => {
    const data = document.querySelector('canvas').getContext('2d').getImageData(90, 160, 1050, 400).data;
    let hash = 2166136261; for (let i = 0; i < data.length; i += 64) hash = Math.imul(hash ^ data[i], 16777619);
    return hash >>> 0;
  })()`);
  const signatures = [];
  for (let level = 1; level <= 6; level++) {
    const beforeTheme = await fingerprint();
    await evaluate(`astra.game.score = GAME_CONFIG.levels[${level - 1}].score; astra.game.updateLevel(); draw()`);
    assert.equal(await fingerprint(), beforeTheme, 'aucune rupture au premier instant du fondu, niveau ' + level);
    assert.ok(await evaluate('astra.game.leader === themeAudit.leader && astra.game.allies[0] === themeAudit.ally && astra.game.obstacles[0] === themeAudit.obstacle && astra.game.leader.hp === 72'));
    if (level === 2) {
      await evaluate('for(let i=0;i<90;i++) astra.game.theme.step(); draw()');
      assert.equal(await evaluate('astra.game.theme.layers().length'), 2);
      assert.equal(await evaluate('astra.game.theme.layers()[0].weight'), 0.5);
      await screenshot('13-theme-fondu');
    }
    await evaluate('for(let i=0;i<180;i++) astra.game.theme.step(); draw()');
    assert.equal(await evaluate('astra.game.theme.layers().length'), 1);
    assert.equal(await evaluate('astra.sound.themeMusic.filter === astra.game.theme.target.music.filter'), true);
    assert.equal(await evaluate('document.querySelector("#stage-theme").textContent === astra.game.theme.target.name.toLocaleUpperCase("fr-FR")'), true);
    await screenshot(`${String(level + 6).padStart(2, '0')}-theme-${level}`);
    signatures.push(await fingerprint());
  }
  assert.equal(new Set(signatures).size, 6, 'six rendus visuellement distincts');
  const averageDraw = await evaluate('(() => { const start = performance.now(); for(let i=0;i<30;i++) astra.renderer.draw(astra.game); return (performance.now()-start)/30; })()');
  assert.ok(averageDraw < 50, 'rendu mis en cache trop lent : ' + averageDraw);
  console.log('Six thèmes distincts, fondu continu, identité/vie/obstacles conservés ; rendu moyen en cache : ' + averageDraw.toFixed(2) + ' ms.');
  await evaluate('astra.game.reset(); astra.game.start(); accumulator = 0; loop()');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(100); await screenshot('04-mobile');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  assert.equal(await evaluate('Math.abs(document.querySelector("canvas").getBoundingClientRect().width - document.querySelector("#canvas-host").getBoundingClientRect().width) < 1'), true);
  assert.deepEqual(errors, []);
  console.log('Navigateur : gameplay, 360°, six thèmes et fondu, musique thématique, missiles, S, H/I, audio mesuré, redémarrage et mobile : OK. Aucune erreur JavaScript/réseau.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 99999, method: 'Browser.close' })); socket.close(); }
  server.close(); if (child) { await delay(500); child.kill(); }
});
