const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { load, Vector: V } = require('./helpers.cjs');
const lib = load();
const { Game, Leader, Enemy, Ally, Bonus, Obstacle, Projectile, Vehicle, calculateMultiRayAvoidance: radar, DEFAULT_SETTINGS: settings } = lib;
const zero = () => new V();
test('base originale inchangée et calcul radar extrait exactement de la pièce jointe', () => {
  const root = path.join(__dirname, '..');
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'source/provenance.json')));
  const bytes = fs.readFileSync(path.join(root, 'source/vehicle.js'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), provenance.vehicle.sha256);
  const source = fs.readFileSync(path.join(root, 'source/preview-comportement-6.html'), 'utf8');
  const fn = source.slice(source.indexOf('    function calculateMultiRayAvoidance('), source.indexOf('\n    function seek(')).trim();
  assert.ok(fs.readFileSync(path.join(root, 'js/radar.js'), 'utf8').includes(fn));
});
test('toutes les entités du monde héritent de Vehicle', () => {
  const g = new Game();
  for (const item of [g.leader, new Ally(1, 1), new Enemy(1, 1), new Bonus(1, 1, 'heal'), new Obstacle(1, 1, 20), new Projectile(g.leader, zero())]) assert.ok(item instanceof Vehicle);
});
test('arrive hérité ralentit, freine la vitesse résiduelle et préserve les entrées', () => {
  const ship = new Leader(0, 0), target = new V(10, 0);
  ship.maxForce = 10; ship.maxSpeed = 5; ship.rayonZoneDeFreinage = 100;
  assert.equal(ship.arrive(target).x, 0.5);
  ship.vel.set(2, 0); assert.equal(ship.arrive(zero()).x, -2);
  assert.equal(target.x, 10); assert.equal(ship.vel.x, 2);
});
test('leader rejoint la cible sans téléportation et respecte les limites', () => {
  const g = new Game(); g.start(); g.pointer.set(900, 400);
  const before = g.leader.pos.copy(); g.tick();
  assert.ok(g.leader.pos.dist(before) > 0 && g.leader.pos.dist(before) <= settings.speed);
  for (let i = 0; i < 300; i++) g.leader.steer(g.pointer, [], settings);
  assert.ok(g.leader.pos.dist(g.pointer) < 0.01);
  assert.ok(g.leader.lastForce.mag() <= settings.force + 1e-9);
  assert.ok(g.leader.vel.mag() <= settings.speed);
});
test('radar : trois points, force moyenne, seuil strict et absence de mutation', () => {
  const pos = zero(), vel = new V(2, 0), obstacle = { pos: new V(20, 3), r: 2 };
  const result = radar(pos, vel, [obstacle], 1, 2, 0.3, 20);
  assert.equal(result.rays[0].ahead2.x, 20);
  assert.ok(result.rays[0].threatened); assert.ok(result.force.y < 0);
  assert.ok(Math.abs(Math.hypot(result.force.x, result.force.y) - 0.15) < 1e-9);
  assert.equal(pos.x, 0); assert.equal(vel.x, 2); assert.equal(obstacle.pos.y, 3);
  obstacle.pos.y = 4; assert.equal(radar(pos, vel, [obstacle], 1, 2, 0.3, 20).rays[0].threatened, false);
});
test('radar : vitesse nulle, aucun obstacle, comptage invalide et superposition', () => {
  for (const count of [0, -1, NaN, Infinity]) assert.equal(radar(zero(), new V(1, 0), [], count, 4, 0.3, 20).rays.length, 0);
  assert.equal(radar(zero(), zero(), [], 5, 4, 0.3, 20).rays.length, 0);
  const result = radar(zero(), new V(1, 0), [{ pos: zero(), r: 20 }], 5, 4, 0.3, 20);
  assert.ok(Number.isFinite(result.force.x)); assert.ok(Math.hypot(result.force.x, result.force.y) <= 0.15);
  assert.equal(radar(zero(), new V(1, 0), [], 100, 4, 0.3, 20).rays.length, 31);
});
test('recrutement, soin plafonné, collecte unique et score', () => {
  const g = new Game(); g.leader.hp = 85;
  g.bonuses.push(new Bonus(g.leader.pos.x, g.leader.pos.y, 'heal'));
  g.resolveCollisions(); g.resolveCollisions(); assert.equal(g.score, 50); assert.equal(g.leader.hp, 100);
  for (let i = 0; i < 10; i++) g.recruit();
  assert.equal(g.allies.length, 8); assert.equal(g.score, 350);
});
test('H sans allié, protection mobile puis retour Delta sans changer les identités', () => {
  const g = new Game(); g.setMode('protection'); assert.equal(g.mode, 'normal');
  g.recruit(); const ally = g.allies[0], before = ally.pos.copy();
  g.setMode('protection'); const target = g.formationTarget(0);
  assert.ok(target.y < g.leader.pos.y); assert.equal(ally.pos.dist(before), 0);
  g.leader.pos.x += 120; assert.equal(g.formationTarget(0).x - target.x, 120);
  for (let i = 0; i < 500; i++) ally.steer(g.formationTarget(0), [], settings);
  assert.ok(ally.pos.dist(g.formationTarget(0)) < 0.1);
  g.setMode('normal'); assert.ok(g.formationTarget(0).y > g.leader.pos.y);
  assert.equal(g.allies[0], ally);
});
test('un ailier évite un obstacle en Delta et en protection puis retrouve sa cible', () => {
  for (const mode of ['normal', 'protection']) {
    const g = new Game(); g.recruit(); g.setMode(mode);
    const ship = g.allies[0], target = g.formationTarget(0);
    ship.pos.set(target.x - 260, target.y); ship.vel.set(3, 0);
    const obstacle = new Obstacle(target.x - 130, target.y + 15, 27);
    let threatened = false, minDistance = Infinity;
    for (let i = 0; i < 900; i++) {
      ship.steer(target, [obstacle], settings);
      threatened ||= ship.radar.rays.some(r => r.threatened);
      minDistance = Math.min(minDistance, ship.pos.dist(obstacle.pos));
    }
    assert.ok(threatened); assert.ok(minDistance > obstacle.r + ship.r, `distance ${minDistance}`);
    assert.ok(ship.pos.dist(target) < 1, `distance cible ${ship.pos.dist(target)}`);
  }
});
test('cadence du leader, tirs ennemis et tirs automatiques alliés', () => {
  const g = new Game(); g.start(); g.firing = true;
  const shots = new Set();
  for (let i = 0; i < 60; i++) { g.tick(); g.projectiles.forEach(p => shots.add(p)); }
  assert.equal(shots.size, 8);
  g.recruit(); const ally = g.allies[0]; ally.pos.set(500, 500);
  const enemy = new Enemy(500, 300); enemy.cooldown = 0; g.enemies = [enemy]; g.tick();
  assert.ok(g.projectiles.some(p => p.team === 'enemy')); assert.ok(ally.cooldown > 0);
});
test('collisions : dégâts, destruction, score et écran des ailiers', () => {
  const g = new Game(); const enemy = new Enemy(600, 300); g.enemies.push(enemy);
  const shot = new Projectile(g.leader, enemy.pos); shot.pos.set(600, 300); g.projectiles = [shot];
  g.resolveCollisions(); assert.equal(enemy.hp, 17);
  enemy.invulnerable = 0; g.projectiles = [new Projectile(g.leader, enemy.pos)]; g.projectiles[0].pos.set(600, 300);
  g.resolveCollisions(); assert.equal(g.score, 100); assert.equal(enemy.hp, 0);
  g.recruit(); const ally = g.allies[0]; ally.pos.set(500, 400);
  const incoming = new Projectile(new Enemy(500, 300), g.leader.pos); incoming.pos.set(500, 400); g.projectiles = [incoming];
  g.resolveCollisions(); assert.equal(ally.hp, 43); assert.equal(g.leader.hp, 100); assert.equal(incoming.life, 0);
});
test('pause gèle le monde, défaite arrête les tirs et reset nettoie la scène', () => {
  const g = new Game(); g.start(); g.tick(); g.togglePause(); const frame = g.frame;
  g.tick(); assert.equal(g.frame, frame);
  g.togglePause(); g.leader.hp = 0; g.tick(); assert.equal(g.state, 'over');
  g.recruit(); g.reset(); assert.equal(g.leader.hp, 100); assert.equal(g.allies.length, 0); assert.equal(g.frame, 0); assert.equal(g.state, 'ready');
});
test('réglages appliqués à la prochaine étape et simulation reproductible prolongée', () => {
  const g = new Game(1280, 800, () => 0.35); g.start(); g.settings.speed = 3; g.settings.force = 0.2; g.firing = true;
  for (let i = 0; i < 2400; i++) {
    if (g.state === 'over') break;
    g.tick();
    for (const ship of [g.leader, ...g.allies, ...g.enemies]) {
      assert.ok(Number.isFinite(ship.pos.x) && Number.isFinite(ship.pos.y));
      assert.ok(ship.lastForce.mag() <= 0.2 + 1e-8);
    }
  }
  assert.equal(g.leader.maxSpeed, 3); assert.ok(g.frame > 500);
});
