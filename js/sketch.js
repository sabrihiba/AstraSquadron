let game, renderer, sound, accumulator = 0, previousState = '';
const $ = id => document.getElementById(id);
const CONTROLS = [
  ['speed', 'Vitesse maximale', 2, 9, 0.2, 'px/pas'],
  ['force', 'Force maximale', 0.1, 0.7, 0.02, ''],
  ['rays', 'Rayons du radar', 1, 15, 1, ''],
  ['ahead', 'Anticipation', 10, 40, 1, 'pas'],
  ['clearance', 'Marge de détection', 4, 35, 1, 'px'],
  ['avoidWeight', 'Poids de l’évitement', 3, 10, 0.5, ''],
  ['fireRate', 'Cadence alliée', 2, 12, 1, 'tirs/s'],
  ['enemyInterval', 'Intervalle ennemis', 1, 6, 0.2, 's'],
  ['obstacleInterval', 'Intervalle astéroïdes', 2, 10, 0.5, 's']
];
function setup() {
  const canvas = createCanvas(1280, 800);
  canvas.parent('canvas-host'); pixelDensity(1);
  // p5 pose des dimensions CSS en pixels : les remplacer pour suivre la scène.
  canvas.elt.style.width = '100%'; canvas.elt.style.height = '100%';
  describe('Jeu spatial : guidez le leader avec la souris ; maintenez le clic gauche pour suspendre le suivi et tirer vers le curseur à 360 degrés. H protège le leader, S esquive.');
  game = new Game(); renderer = new Renderer(canvas.elt); sound = new GameAudio();
  window.astra = { game, renderer, sound }; // Inspection pédagogique et validation navigateur.
  for (const bus of ['music', 'effects']) {
    const input = $(`${bus}-volume`);
    input.value = Math.round((bus === 'music' ? sound.musicVolume : sound.effectsVolume) * 100);
    input.addEventListener('input', () => {
      sound.setVolume(bus, input.value / 100); $(`${bus}-value`).textContent = input.value + ' %';
    });
  }
  $('mute').onclick = async () => {
    sound.setMuted(!sound.muted);
    if (!sound.muted) await sound.unlock();
  };
  for (const [key, name, min, max, step, unit] of CONTROLS) {
    const row = document.createElement('div'); row.className = 'setting';
    row.innerHTML = `<label for="setting-${key}">${name}<output id="value-${key}"></output></label><input id="setting-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
    $('sliders').appendChild(row);
    const input = $(`setting-${key}`); input.value = game.settings[key];
    const sync = () => { game.settings[key] = Number(input.value); $(`value-${key}`).textContent = `${input.value} ${unit}`; };
    input.addEventListener('input', sync); sync();
  }
  const panel = (name, show) => {
    $(name).hidden = !show; $(`${name}-toggle`).setAttribute('aria-expanded', String(show));
  };
  for (const name of ['help', 'settings']) {
    $(`${name}-toggle`).onclick = () => panel(name, $(name).hidden);
    $(`${name}-close`).onclick = () => panel(name, false);
  }
  $('debug').onchange = e => { game.debug = e.target.checked; };
  $('defaults').onclick = () => {
    Object.assign(game.settings, DEFAULT_SETTINGS);
    for (const [key] of CONTROLS) { $(`setting-${key}`).value = game.settings[key]; $(`setting-${key}`).dispatchEvent(new Event('input')); }
    for (const bus of ['music', 'effects']) {
      $(`${bus}-volume`).value = Math.round(GAME_CONFIG.audio[bus] * 100);
      $(`${bus}-volume`).dispatchEvent(new Event('input'));
    }
  };
  $('pause').onclick = () => game.togglePause();
  $('start').onclick = () => {
    if (game.state === 'over') { game.reset(); sound.reset(); }
    if (game.state === 'paused') game.togglePause(); else game.start();
    accumulator = 0; canvas.elt.focus();
    sound.unlock();
  };
  canvas.elt.tabIndex = 0;
  canvas.elt.style.cursor = 'none';
  const pointer = event => {
    const box = canvas.elt.getBoundingClientRect();
    game.setPointer((event.clientX - box.left) / box.width * game.width,
      (event.clientY - box.top) / box.height * game.height);
  };
  canvas.elt.addEventListener('pointermove', pointer);
  canvas.elt.addEventListener('pointerdown', event => {
    if (event.button !== 0 || game.state !== 'playing') return;
    pointer(event); game.beginAim(); canvas.elt.setPointerCapture(event.pointerId); event.preventDefault();
  });
  window.addEventListener('pointerup', event => { if (event.button === 0) game.endAim(); });
  window.addEventListener('pointercancel', () => game.endAim());
  canvas.elt.addEventListener('lostpointercapture', () => game.endAim());
  window.addEventListener('keydown', event => {
    if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') { event.preventDefault(); game.togglePause(); }
    if (key === 'd' && !event.repeat) { game.debug = !game.debug; $('debug').checked = game.debug; }
    if (game.state !== 'playing') return;
    if (key === 'h') game.setMode('protection');
    if (key === 'i') game.setMode('normal');
    if (key === 's' && !event.repeat) game.dodge();
  });
  window.addEventListener('blur', () => { if (game.state === 'playing') game.togglePause(); game.endAim(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') game.togglePause(); });
  window.addEventListener('pagehide', () => sound.dispose(), { once: true });
}
function draw() {
  // Pas fixe : les forces du professeur conservent leurs unités par image.
  accumulator = game.state === 'playing' ? accumulator + Math.min(deltaTime, 100) : 0;
  while (accumulator >= 1000 / 60) { game.tick(); accumulator -= 1000 / 60; }
  renderer.draw(game);
  sound.setLevel(game.level); sound.setThemeMix(game.theme.layers()); sound.setPlaying(game.state === 'playing');
  if ($('stage-theme').dataset.theme !== game.theme.targetId) {
    $('stage-theme').dataset.theme = game.theme.targetId;
    $('stage-theme').textContent = game.theme.target.name.toLocaleUpperCase('fr-FR');
    $('sector-theme').textContent = game.theme.target.name.toLocaleUpperCase('fr-FR');
    $('stage-theme').style.color = game.theme.target.accent;
  }
  for (const event of game.drainEvents()) if (game.state === 'playing' || event === 'defeat') sound.play(event);
  if ($('mute').dataset.muted !== String(sound.muted)) {
    // Préserver le nœud sous le pointeur entre pointerdown et pointerup.
    $('mute').dataset.muted = String(sound.muted);
    $('mute').innerHTML = sound.muted ? '♪ <span>Son coupé</span>' : '♫ <span>Son actif</span>';
    $('mute').setAttribute('aria-pressed', String(sound.muted));
    $('mute').setAttribute('aria-label', sound.muted ? 'Rétablir le son' : 'Couper tout le son');
  }
  $('audio-status').textContent = sound.error || (sound.context ? 'Ambiance originale · deux couches musicales adaptatives.' : 'Le son démarre après votre premier clic sur Jouer.');
  $('level').textContent = 'NIVEAU ' + String(game.level).padStart(2, '0');
  $('next-threshold').textContent = game.nextThreshold === null ? 'NIVEAU MAXIMUM' : `PROCHAIN : ${game.nextThreshold.toLocaleString('fr-FR')} PTS`;
  const baseScore = game.difficulty.score;
  $('level-fill').style.width = (game.nextThreshold === null ? 100 : clamp((game.score - baseScore) / (game.nextThreshold - baseScore) * 100, 0, 100)) + '%';
  const leader = game.leader;
  $('dodge-status-text').textContent = leader.dodgeRemaining > 0 ? 'ESQUIVE ACTIVE' : leader.dodgeCooldown > 0 ? `RECHARGE ${(leader.dodgeCooldown / 60).toFixed(1)} S` : 'ESQUIVE PRÊTE';
  $('dodge-status').dataset.state = leader.dodgeRemaining > 0 ? 'active' : leader.dodgeCooldown > 0 ? 'charging' : 'ready';
  $('level-banner').hidden = game.levelAnnouncement <= 0 || game.state !== 'playing';
  if (game.levelAnnouncement > 0) {
    $('level-banner-title').textContent = `NIVEAU ${String(game.level).padStart(2, '0')}`;
    $('level-banner-name').textContent = game.difficulty.name;
    const elapsed = 150 - game.levelAnnouncement;
    $('level-banner').style.opacity = Math.min(1, elapsed / 15, game.levelAnnouncement / 25);
    $('level-banner').style.transform = `translateX(-50%) translateY(${Math.max(0, 15 - elapsed)}px)`;
  }
  $('health').innerHTML = `${Math.ceil(game.leader.hp)}<span>%</span>`;
  $('health-fill').style.width = game.leader.hp + '%';
  $('health-fill').style.background = game.leader.hp < 35 ? '#ff927e' : '#90edff';
  $('score').textContent = String(game.score).padStart(6, '0');
  $('allies').innerHTML = `${String(game.allies.length).padStart(2, '0')} <small>/ 08</small>`;
  $('formation').textContent = game.mode === 'protection' ? '◇ PROTECTION' : '↘ DELTA';
  $('formation').style.color = game.mode === 'protection' ? '#b6b9ff' : '#90edff';
  $('notice').textContent = game.frame < game.noticeUntil && game.state === 'playing' ? game.notice : '';
  $('state-label').textContent = game.state === 'playing' && game.aiming ? 'VISÉE 360° · SUIVI SUSPENDU' : { playing: 'MISSION EN COURS', ready: 'EN ATTENTE DU PILOTE', paused: 'MISSION EN PAUSE', over: 'SIGNAL PERDU' }[game.state];
  $('debug-label').textContent = game.debug ? 'DEBUG · BLEU : VITESSE / OR : FORCE / VERT : RADAR' : 'VOL ASSISTÉ · ARRIVE + RADAR MULTI-RAYONS';
  $('pause').disabled = !['playing', 'paused'].includes(game.state);
  $('pause').textContent = game.state === 'paused' ? '▷' : 'Ⅱ';
  $('pause').setAttribute('aria-label', game.state === 'paused' ? 'Reprendre' : 'Mettre en pause');
  if (previousState !== game.state) {
    $('overlay').hidden = game.state === 'playing';
    if (game.state !== 'ready') {
      $('overlay-eyebrow').textContent = game.state === 'over' ? 'FIN DE TRANSMISSION' : 'LE TEMPS EST SUSPENDU';
      $('overlay-title').innerHTML = game.state === 'over' ? 'Chaque vol<br>vous rend <em>meilleur.</em>' : 'L’espace peut<br><em>attendre.</em>';
      $('overlay-copy').innerHTML = game.state === 'over' ? `Score : ${game.score} · ${game.kills} ennemis détruits.<br>Une nouvelle escadrille vous attend.` : 'Votre escadrille vous attend.<br>Reprenez lorsque vous êtes prêt.';
      $('start').innerHTML = game.state === 'over' ? 'Nouvelle mission <span>↗</span>' : 'Reprendre le vol <span>↗</span>';
    }
    previousState = game.state;
  }
}
