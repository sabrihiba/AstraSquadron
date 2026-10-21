const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, Vector: V } = require('./helpers.cjs');
const { Game, Enemy, HeavyEnemy, Missile, Projectile, Obstacle, Vehicle, DEFAULT_SETTINGS, GAME_CONFIG } = load();
const config = changes => ({ ...GAME_CONFIG, ...changes });

test('seuils exacts, saut de plusieurs niveaux, annonce unique et dernier palier borné', () => {
  const g = new Game(); g.score = 599; g.updateLevel(); assert.equal(g.level, 1);
  g.score = 600; g.updateLevel(); assert.equal(g.level, 2); assert.equal(g.nextThreshold, 1500);
  assert.equal(g.levelAnnouncement, 150); assert.deepEqual(Array.from(g.drainEvents()), ['level']);
  g.updateLevel(); assert.equal(g.events.length, 0);
  g.score = 1e9; g.updateLevel(); assert.equal(g.level, GAME_CONFIG.levels.length); assert.equal(g.nextThreshold, null);
  assert.equal(g.drainEvents().length, 1); g.updateLevel(); assert.equal(g.events.length, 0);
});
test('progression monotone des cinq paramètres, limites de densité et PV existants préservés', () => {
  const g = new Game(); let previous = GAME_CONFIG.levels[0];
  const survivor = new Enemy(100, 100); survivor.hp = 12; g.enemies.push(survivor);
  for (const level of GAME_CONFIG.levels) {
    for (const name of ['spawn', 'speed', 'health', 'fire', 'obstacles']) assert.ok(level[name] >= previous[name]);
    g.score = level.score; g.updateLevel();
    assert.ok(g.enemyInterval() >= GAME_CONFIG.minEnemyInterval);
    assert.ok(g.obstacleInterval() >= GAME_CONFIG.minObstacleInterval);
    const e = new Enemy(0, 0, level);
    assert.equal(e.maxHp, Math.ceil(35 * level.health));
    e.steer(new V(200, 200), [], DEFAULT_SETTINGS, false);
    assert.ok(e.vel.mag() <= DEFAULT_SETTINGS.speed * 0.38 * level.speed);
    assert.equal(survivor.hp, 12); previous = level;
  }
  g.settings.enemyInterval = 0.01; assert.equal(g.enemyInterval(), GAME_CONFIG.minEnemyInterval);
  for (let i = 0; i < 40; i++) g.spawnEnemy(); assert.equal(g.enemies.length, GAME_CONFIG.maxEnemies);
});
test('seuil des grands ennemis configurable, fréquence et plafond respectés', () => {
  const cfg = config({ heavy: { ...GAME_CONFIG.heavy, fromLevel: 2, chance: 1, maxAlive: 1 } });
  const g = new Game(1280, 800, () => 0.1, cfg);
  g.spawnEnemy(); assert.equal(g.enemies[0].heavy, undefined);
  g.score = 600; g.updateLevel(); g.spawnEnemy(); g.spawnEnemy();
  const heavies = g.enemies.filter(e => e.heavy); assert.equal(heavies.length, 1);
  assert.ok(heavies[0] instanceof Vehicle); assert.ok(heavies[0].hp > 4 * 35);
});
test('grand ennemi : avertissement complet, position annoncée figée et missile Seek rectiligne', () => {
  const g = new Game(); const heavy = new HeavyEnemy(500, 180, g.difficulty, g.config.heavy);
  heavy.missileTimer = 0; heavy.attack(g); assert.equal(heavy.warningRemaining, 60);
  assert.equal(g.projectiles.length, 0); const lock = heavy.lockTarget.copy();
  g.leader.pos.x += 200;
  for (let i = 0; i < 59; i++) heavy.attack(g);
  assert.equal(g.projectiles.length, 0); assert.equal(heavy.lockTarget.x, lock.x);
  heavy.attack(g); assert.equal(g.projectiles.length, 1);
  const missile = g.projectiles[0], target = missile.target.copy(), direction = missile.vel.copy().normalize();
  assert.ok(missile instanceof Missile && missile instanceof Vehicle);
  assert.equal(missile.damage, 22); assert.equal(missile.r, 8);
  for (let i = 0; i < 30; i++) { g.leader.pos.x -= 2; missile.step(); }
  assert.ok(Math.abs(missile.vel.x / missile.vel.mag() - direction.x) < 1e-8);
  assert.equal(missile.target.x, target.x); assert.ok(missile.vel.mag() <= g.config.heavy.missileSpeed + 1e-8);
  heavy.hp = 0; const timer = heavy.missileTimer; heavy.attack(g); assert.equal(heavy.missileTimer, timer);
});
test('fuite héritée : force opposée à la menace, freinage résiduel, limites et non-mutation', () => {
  const g = new Game(); const leader = g.leader, target = new V(leader.pos.x - 100, leader.pos.y);
  leader.maxSpeed = 6; leader.maxForce = 20; leader.vel.set(8, 0);
  const force = leader.flee(target);
  assert.equal(force.x, -2); assert.equal(target.x, leader.pos.x - 100); assert.equal(leader.vel.x, 8);
  leader.maxForce = 0.3; leader.vel.set(0, 0);
  assert.equal(leader.flee(target).x, 0.3);
  assert.equal(leader.flee(leader.pos).mag(), 0);
});
function threat(g, xOffset = -100, yOffset = 0) {
  const p = new Projectile(new Enemy(0, 0), g.leader.pos);
  p.pos.set(g.leader.pos.x + xOffset, g.leader.pos.y + yOffset);
  p.vel = V.sub(g.leader.pos, p.pos).setMag(5);
  return p;
}
test('S ignore danger absent, distant, expiré, ami, superposé et qui s’éloigne', () => {
  const g = new Game(); g.start(); const leader = g.leader;
  const p = threat(g); p.vel.mult(-1);
  const dead = threat(g); dead.life = 0;
  const friend = threat(g); friend.team = 'friendly';
  const coincident = threat(g, 0, 0);
  g.projectiles = [p, dead, friend, coincident, threat(g, -400)];
  assert.equal(g.dodge(), false); assert.equal(leader.dodgeRemaining, 0); assert.equal(leader.dodgeCooldown, 0);
  assert.equal(leader.vel.mag(), 0); assert.equal(leader.invulnerable, 0);
});
test('S choisit la menace pertinente la plus proche et le seuil inclusif', () => {
  const g = new Game(); g.start(); const far = threat(g, -180), near = threat(g, -100);
  g.projectiles = [far, near]; assert.equal(g.dodge(), true); assert.equal(g.leader.dodgeThreat, near);
  const other = new Game(); other.start(); other.projectiles = [threat(other, -GAME_CONFIG.dodge.detectionRadius)];
  assert.equal(other.dodge(), true);
});
test('S : durée finie, récupération configurable, aucun réarmement automatique ni invulnérabilité', () => {
  const g = new Game(1280, 800, () => 0.5, config({ dodge: { ...GAME_CONFIG.dodge, durationFrames: 12, cooldownFrames: 20 } }));
  g.start(); const p = threat(g); g.projectiles = [p];
  const leader = g.leader, start = leader.pos.copy(); assert.equal(g.dodge(), true);
  assert.equal(leader.pos.dist(start), 0); assert.equal(g.dodge(), false);
  for (let i = 0; i < 12; i++) leader.steer(g.pointer, [], g.settings);
  assert.equal(leader.dodgeRemaining, 0); assert.equal(leader.dodgeCooldown, 20);
  assert.ok(leader.pos.x > start.x); assert.equal(leader.invulnerable, 0);
  assert.ok(leader.damage(12)); assert.equal(leader.hp, 88);
  for (let i = 0; i < 20; i++) leader.steer(g.pointer, [], g.settings);
  assert.equal(leader.dodgeCooldown, 0); assert.equal(leader.dodgeRemaining, 0);
  for (let i = 0; i < 400; i++) leader.steer(g.pointer, [], g.settings);
  assert.ok(leader.pos.dist(g.pointer) < 0.1);
});
test('S dans les deux formations, radar actif, pause et retour à la souris', () => {
  for (const mode of ['normal', 'protection']) {
    const g = new Game(); g.start(); g.recruit(); g.setMode(mode); const identity = g.allies[0];
    g.projectiles = [threat(g)]; assert.equal(g.dodge(), true);
    const obstacle = new Obstacle(g.leader.pos.x + 90, g.leader.pos.y + 20, 28);
    g.obstacles = [obstacle];
    let radar = false;
    for (let i = 0; i < 36; i++) {
      g.tick(); radar ||= g.leader.radar.rays.length > 0;
      assert.ok(g.leader.lastForce.mag() <= g.settings.force + 1e-9);
    }
    assert.ok(radar); assert.equal(g.mode, mode); assert.equal(g.allies[0], identity);
    g.togglePause(); const cooldown = g.leader.dodgeCooldown; g.tick(); assert.equal(g.leader.dodgeCooldown, cooldown);
  }
});
test('S vers les quatre bords : trajectoire continue et coque maintenue dans le champ', () => {
  for (const [x, y, dx, dy] of [[115, 400, 100, 0], [1165, 400, -100, 0], [640, 190, 0, 100], [640, 635, 0, -100]]) {
    const g = new Game(); g.start(); g.leader.pos.set(x, y); g.pointer.set(x, y);
    g.settings.speed = 9; g.settings.force = 0.1; g.projectiles = [threat(g, dx, dy)]; g.dodge();
    for (let i = 0; i < 200; i++) {
      const before = g.leader.pos.copy(); g.leader.steer(g.pointer, [], g.settings);
      assert.ok(g.leader.pos.dist(before) <= 9 + 1e-9);
      assert.ok(g.leader.pos.x >= g.leader.r && g.leader.pos.x <= g.width - g.leader.r);
      assert.ok(g.leader.pos.y >= g.leader.r && g.leader.pos.y <= g.height - g.leader.r);
    }
  }
});
test('menace détruite : fin anticipée sans annuler la recharge ; reset remet niveaux et S à zéro', () => {
  const g = new Game(); g.start(); const p = threat(g); g.projectiles = [p]; g.dodge(); p.life = 0; g.tick();
  assert.equal(g.leader.dodgeRemaining, 0); assert.ok(g.leader.dodgeCooldown > 0);
  g.score = 3000; g.updateLevel(); g.reset();
  assert.equal(g.level, 1); assert.equal(g.leader.dodgeCooldown, 0); assert.equal(g.events.length, 0);
});
test('radar contribue réellement pendant la fuite et les missiles infligent leurs dégâts aux ailiers', () => {
  const g = new Game(); g.start(); g.leader.vel.set(2, 0);
  g.projectiles = [threat(g)]; g.dodge();
  const obstacle = new Obstacle(g.leader.pos.x + 40, g.leader.pos.y + 20, 20);
  g.leader.steer(g.pointer, [obstacle], g.settings);
  assert.ok(g.leader.radar.rays.some(ray => ray.threatened));
  assert.ok(Math.hypot(g.leader.radar.force.x, g.leader.radar.force.y) > 0);
  assert.ok(g.leader.lastForce.y < 0);
  g.recruit(); const ally = g.allies[0]; ally.pos.set(500, 400);
  const heavy = new HeavyEnemy(500, 200, g.difficulty, g.config.heavy);
  const missile = new Missile(heavy, ally.pos, g.config.heavy); missile.pos.set(500, 400);
  g.projectiles = [missile]; g.resolveCollisions(); assert.equal(ally.hp, 33); assert.equal(missile.life, 0);
});
