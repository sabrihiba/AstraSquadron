const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
// Adaptateur p5 minimal : les tests navigateur utilisent ensuite p5.js réel.
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { return this.mult(1 / n); }
  mag() { return Math.hypot(this.x, this.y); }
  magSq() { return this.x ** 2 + this.y ** 2; }
  normalize() { const m = this.mag(); if (m) this.div(m); return this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return a.copy().sub(b); }
  static dist(a, b) { return a.dist(b); }
}
const files = ['source/vehicle.js', 'js/config.js', 'js/themes.js', 'js/radar.js', 'js/spacecraft.js', 'js/leader.js', 'js/ally.js', 'js/enemy.js', 'js/heavy-enemy.js', 'js/projectile.js', 'js/missile.js', 'js/obstacle.js', 'js/bonus.js', 'js/game.js'];
function load() {
  const context = vm.createContext({ console, Math, p5: { Vector }, createVector: (x, y) => new Vector(x, y), map: (n, a, b, x, y) => x + (n - a) / (b - a) * (y - x) });
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  return vm.runInContext('({ Game, Leader, Ally, Enemy, HeavyEnemy, Missile, Obstacle, Bonus, Projectile, Spacecraft, Vehicle, calculateMultiRayAvoidance, DEFAULT_SETTINGS, GAME_CONFIG, THEME_CONFIG, ThemeTransition, themeForLevel })', context);
}
module.exports = { load, Vector, files };
