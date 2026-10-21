const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, Vector: V } = require('./helpers.cjs');
const { Game, Leader, Ally, Enemy, Projectile, Obstacle, DEFAULT_SETTINGS } = load();

test('projectiles à 360° : huit directions depuis le centre et bouche du canon alignée', () => {
  const ship = new Leader(640, 400); ship.vel.set(3, 2);
  for (let index = 0; index < 8; index++) {
    const angle = index * Math.PI / 4, direction = new V(Math.cos(angle), Math.sin(angle));
    const target = ship.pos.copy().add(direction.copy().mult(200)), original = target.copy();
    const shot = new Projectile(ship, target);
    assert.ok(shot.vel.copy().normalize().dist(direction) < 1e-9);
    assert.ok(V.sub(shot.pos, ship.pos).normalize().dist(direction) < 1e-9);
    assert.ok(Math.abs(shot.pos.dist(ship.pos) - ship.r - 10) < 1e-9);
    for (let i = 0; i < 10; i++) shot.step();
    assert.ok(shot.vel.copy().normalize().dist(direction) < 1e-9);
    assert.equal(target.dist(original), 0); assert.equal(ship.vel.x, 3);
  }
});
test('visée confondue : dernière direction valide conservée, y compris avant le premier tir', () => {
  const ship = new Leader(500, 400);
  const first = new Projectile(ship, ship.pos); assert.equal(first.vel.y, -12);
  ship.aimAt(new V(100, 400));
  const previous = ship.aimDirection.copy(); ship.aimAt(ship.pos);
  const shot = new Projectile(ship, ship.pos);
  assert.equal(ship.aimDirection.dist(previous), 0); assert.equal(shot.vel.x, -12); assert.equal(shot.vel.y, 0);
});
test('cible plus proche que la bouche : le tir continue vers le curseur, sans demi-tour', () => {
  const ship = new Leader(500, 400), target = new V(501, 400);
  const shot = new Projectile(ship, target);
  assert.ok(shot.pos.x > target.x); assert.ok(shot.vel.x > 0);
  shot.step(); assert.equal(shot.vel.x, 12);
});
test('clic maintenu : freinage hérité, aucun suivi de la cible, reprise au relâchement', () => {
  const g = new Game(); g.start(); g.leader.vel.set(3, 0); g.setPointer(1100, 600); g.beginAim();
  const start = g.leader.pos.copy();
  for (let i = 0; i < 90; i++) g.tick();
  assert.ok(g.leader.pos.dist(start) < 20); assert.ok(g.leader.vel.mag() < 1e-9);
  assert.ok(g.projectiles.length > 0); assert.ok(g.aiming);
  g.endAim(); const before = g.leader.pos.copy();
  for (let i = 0; i < 30; i++) g.tick();
  assert.ok(g.leader.pos.x > before.x + 10); assert.equal(g.firing, false);
});
test('visée distincte de la zone de vol, direction et cadence recalculées à chaque tir', () => {
  const g = new Game(); g.start(); g.setPointer(30, 30);
  assert.equal(g.aimPointer.x, 30); assert.equal(g.pointer.x, 115); assert.equal(g.pointer.y, 190);
  g.beginAim(); g.tick(); const first = g.projectiles[0]; assert.ok(first.vel.x < 0 && first.vel.y < 0);
  g.setPointer(1200, 750); const count = g.projectiles.length;
  g.tick(); assert.equal(g.projectiles.length, count); assert.ok(g.leader.aimDirection.x > 0 && g.leader.aimDirection.y > 0);
  for (let i = 0; i < 8; i++) g.tick();
  assert.ok(g.projectiles.some(p => p.vel.x > 0 && p.vel.y > 0));
  assert.ok(first.vel.x < 0 && first.vel.y < 0);
});
test('alliés : sélection et tir dans les quatre quadrants, sans modifier leur mouvement', () => {
  for (const [dx, dy] of [[-120, -90], [120, -90], [-120, 90], [120, 90]]) {
    const g = new Game(); g.start(); const ally = new Ally(400, 450); g.allies.push(ally);
    const enemy = new Enemy(400 + dx, 450 + dy); g.enemies.push(enemy);
    g.tick(); const shot = g.projectiles.find(p => p.team === 'friendly'); assert.ok(shot);
    assert.equal(Math.sign(shot.vel.x), Math.sign(dx)); assert.equal(Math.sign(shot.vel.y), Math.sign(dy));
    assert.ok(ally.vel.mag() <= DEFAULT_SETTINGS.speed);
    assert.ok(ally.aimDirection.copy().normalize().dist(shot.vel.copy().normalize()) < 1e-9);
  }
});
test('visée : le radar et S continuent de déplacer le leader dans les deux formations', () => {
  for (const mode of ['normal', 'protection']) {
    const g = new Game(); g.start(); g.recruit(); g.setMode(mode); g.beginAim();
    g.leader.vel.set(2, 0);
    g.obstacles = [new Obstacle(g.leader.pos.x + 40, g.leader.pos.y + 20, 20)];
    g.tick(); assert.ok(g.leader.radar.rays.some(ray => ray.threatened));
    assert.ok(g.leader.lastForce.y < 0);
    const shot = new Projectile(new Enemy(100, 100), g.leader.pos);
    shot.pos.set(g.leader.pos.x - 100, g.leader.pos.y); shot.vel.set(5, 0);
    g.projectiles = [shot]; assert.ok(g.dodge());
    const before = g.leader.pos.copy(); g.tick();
    assert.ok(g.leader.pos.dist(before) > 0); assert.ok(g.leader.dodgeRemaining > 0);
    assert.equal(g.mode, mode); assert.ok(g.aiming);
  }
});
test('pause, annulation et redémarrage quittent la visée sans réactiver le tir', () => {
  const g = new Game(); g.beginAim(); assert.equal(g.aiming, false);
  g.start(); g.beginAim(); g.togglePause(); assert.equal(g.aiming, false); assert.equal(g.firing, false);
  g.togglePause(); assert.equal(g.aiming, false);
  g.beginAim(); g.endAim(); assert.equal(g.firing, false);
  g.beginAim(); g.reset(); assert.equal(g.aiming, false); assert.equal(g.firing, false);
});
