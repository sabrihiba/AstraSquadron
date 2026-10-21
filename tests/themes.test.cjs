const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { Game, Obstacle, ThemeTransition, THEME_CONFIG, GAME_CONFIG, themeForLevel } = load();

test('six niveaux avec palettes, particules, obstacles et ambiances distinctes', () => {
  const ids = GAME_CONFIG.levels.map((definition, index) => themeForLevel(index + 1, definition));
  assert.equal(new Set(ids).size, 6);
  assert.equal(new Set(ids.map(id => THEME_CONFIG.themes[id].base)).size, 6);
  assert.equal(new Set(ids.map(id => THEME_CONFIG.themes[id].music.filter)).size, 6);
  assert.equal(THEME_CONFIG.themes.ice.obstacle.kind, 'crystal');
  assert.equal(THEME_CONFIG.themes.volcano.obstacle.kind, 'slag');
  assert.equal(THEME_CONFIG.themes.base.obstacle.kind, 'metal');
  for (const id of ids) {
    const theme = THEME_CONFIG.themes[id];
    assert.ok(theme.particles.count <= 60); assert.ok(theme.particles.opacity <= 0.5);
    assert.ok(theme.obstacle.rim); assert.equal(theme.name, GAME_CONFIG.levels[ids.indexOf(id)].name);
  }
});
test('fondu sur 180 pas : continuité, poids normalisés, mélange intermédiaire et fin exacte', () => {
  const transition = new ThemeTransition(); transition.select('nebula');
  assert.equal(transition.layers()[0].id, 'deep'); assert.equal(transition.layers()[0].weight, 1);
  for (let i = 0; i < 90; i++) transition.step();
  const halfway = transition.layers(); assert.equal(halfway.length, 2);
  assert.equal(halfway[0].weight, 0.5); assert.equal(halfway[1].weight, 0.5);
  for (let i = 0; i < 90; i++) {
    transition.step(); assert.ok(Math.abs(transition.layers().reduce((sum, item) => sum + item.weight, 0) - 1) < 1e-8);
  }
  assert.equal(transition.layers().length, 1); assert.equal(transition.layers()[0].id, 'nebula');
});
test('second changement pendant un fondu : mélange courant conservé sans saut', () => {
  const transition = new ThemeTransition(); transition.select('nebula');
  for (let i = 0; i < 45; i++) transition.step();
  const snapshot = transition.layers().map(({ id, weight }) => ({ id, weight }));
  transition.select('ice');
  assert.deepEqual(transition.layers().map(({ id, weight }) => ({ id, weight })), snapshot);
  transition.select('ice'); assert.equal(transition.elapsed, 0);
  for (let i = 0; i < 180; i++) transition.step();
  assert.equal(transition.layers()[0].id, 'ice');
});
test('seuil de score : changement sans réinitialiser le monde ni ajouter de collision décorative', () => {
  const g = new Game(); g.start(); g.recruit();
  const leader = g.leader, ally = g.allies[0], obstacle = new Obstacle(50, 50, 20);
  g.obstacles = [obstacle]; leader.hp = 72; g.score = 600;
  g.updateLevel(); assert.equal(g.theme.targetId, 'nebula');
  assert.equal(g.leader, leader); assert.equal(g.allies[0], ally); assert.equal(g.obstacles[0], obstacle);
  assert.equal(leader.hp, 72); assert.equal(g.score, 600); assert.equal(g.state, 'playing');
  assert.equal(obstacle.r, 20); assert.equal(g.enemies.length, 0); assert.equal(g.projectiles.length, 0);
  g.tick(); const elapsed = g.theme.elapsed; g.togglePause(); g.tick(); assert.equal(g.theme.elapsed, elapsed);
  g.togglePause(); g.tick(); assert.equal(g.theme.elapsed, elapsed + 1);
  g.reset(); assert.equal(g.theme.targetId, 'deep'); assert.equal(g.theme.progress, 1);
});
test('variantes futures configurables et seuils multiples sélectionnent le thème final', () => {
  assert.equal(themeForLevel(7), 'emerald'); assert.equal(themeForLevel(8), 'derelict');
  assert.equal(themeForLevel(9, { theme: 'ice' }), 'ice');
  assert.equal(themeForLevel(9, { theme: 'inconnu' }), 'deep');
  const cfg = { ...THEME_CONFIG, transitionFrames: 30, variants: ['ice', 'base'] };
  assert.equal(themeForLevel(7, {}, cfg), 'ice'); assert.equal(themeForLevel(8, {}, cfg), 'base');
  const transition = new ThemeTransition(cfg); transition.select('base');
  for (let i = 0; i < 30; i++) transition.step(); assert.equal(transition.progress, 1);
  const g = new Game(); g.score = 9000; g.updateLevel(); assert.equal(g.theme.targetId, 'base');
  assert.equal(g.theme.layers()[0].id, 'deep'); assert.equal(g.drainEvents().length, 1);
});
