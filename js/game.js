const DEFAULT_SETTINGS = Object.freeze({ speed: 5.8, force: 0.3, rays: 5,
  ahead: 20, clearance: 12, avoidWeight: 5, fireRate: 8, enemyInterval: 2.8, obstacleInterval: 5 });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

class Game {
  constructor(width = 1280, height = 800, rng = Math.random, config = GAME_CONFIG) {
    this.width = width; this.height = height; this.rng = rng;
    this.config = config;
    this.settings = { ...DEFAULT_SETTINGS };
    this.reset();
  }
  reset() {
    this.leader = new Leader(this.width / 2, this.height * 0.7);
    this.leader.flightBounds = { width: this.width, height: this.height, ...this.config.dodge };
    this.pointer = this.leader.pos.copy();
    this.aimPointer = this.leader.pos.copy().add(createVector(0, -150));
    this.aiming = false;
    this.allies = []; this.enemies = []; this.obstacles = []; this.bonuses = [];
    this.projectiles = []; this.effects = [];
    this.frame = 0; this.score = 0; this.kills = 0; this.mode = 'normal';
    this.level = 1; this.levelAnnouncement = 0; this.events = [];
    this.theme = new ThemeTransition(THEME_CONFIG, themeForLevel(1, this.difficulty));
    this.state = 'ready'; this.firing = false; this.debug = false;
    this.enemyTimer = 150; this.obstacleTimer = 270; this.bonusTimer = 510;
    this.notice = 'Recrutez votre escadrille. Protégez votre leader.'; this.noticeUntil = 250;
  }
  start() { this.state = 'playing'; }
  setPointer(x, y) {
    this.aimPointer.set(clamp(x, 0, this.width), clamp(y, 0, this.height));
    this.pointer.set(clamp(x, 115, this.width - 115), clamp(y, 190, this.height - 165));
  }
  beginAim() {
    if (this.state !== 'playing') return;
    this.aiming = true; this.firing = true;
    this.leader.aimAt(this.aimPointer);
  }
  endAim() { this.aiming = false; this.firing = false; }
  get difficulty() { return this.config.levels[this.level - 1]; }
  get nextThreshold() { return this.config.levels[this.level]?.score ?? null; }
  emit(type) { this.events.push(type); if (this.events.length > 64) this.events.shift(); }
  drainEvents() { return this.events.splice(0); }
  updateLevel() {
    let next = this.level;
    while (next < this.config.levels.length && this.score >= this.config.levels[next].score) next++;
    if (next === this.level) return;
    this.level = next; this.levelAnnouncement = 150;
    this.theme.select(themeForLevel(this.level, this.difficulty));
    this.enemyTimer = Math.min(this.enemyTimer, this.enemyInterval());
    this.obstacleTimer = Math.min(this.obstacleTimer, this.obstacleInterval());
    // Les avions déjà présents conservent leurs PV pour éviter une guérison surprise.
    for (const enemy of this.enemies) {
      enemy.speedFactor = this.difficulty.speed * (enemy.heavy ? this.config.heavy.speedFactor : 1);
      enemy.fireFactor = this.difficulty.fire;
    }
    this.notify(`Niveau ${this.level} · ${this.difficulty.name}`);
    this.emit('level');
  }
  enemyInterval() { return Math.max(this.config.minEnemyInterval, this.settings.enemyInterval * 60 / this.difficulty.spawn); }
  obstacleInterval() { return Math.max(this.config.minObstacleInterval, this.settings.obstacleInterval * 60 / this.difficulty.obstacles); }
  spawnEnemy() {
    if (this.enemies.length >= this.config.maxEnemies) return;
    const x = 100 + this.rng() * (this.width - 200), config = this.config.heavy;
    const heavy = this.level >= config.fromLevel && this.enemies.filter(e => e.heavy).length < config.maxAlive && this.rng() < config.chance;
    this.enemies.push(heavy ? new HeavyEnemy(x, -60, this.difficulty, config) : new Enemy(x, -40, this.difficulty));
  }
  dodge() {
    if (this.state !== 'playing') return false;
    if (!this.leader.beginDodge(this.projectiles, this.config.dodge)) {
      this.notify(this.leader.dodgeCooldown > 0 ? 'Esquive en recharge.' : 'Aucun tir menaçant à proximité.');
      return false;
    }
    this.notify('Esquive · éloignement de la menace'); this.emit('dodge'); return true;
  }
  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
    this.endAim();
  }
  setMode(mode) {
    if (mode === 'protection' && !this.allies.length) {
      this.notify('Aucun allié : collectez un bonus de recrutement.'); return;
    }
    this.mode = mode;
    if (mode === 'protection') this.emit('protection');
    this.notify(mode === 'protection' ? 'Protection active · vos alliés passent devant.' : 'Formation Delta · retour en escadrille.');
  }
  notify(message) { this.notice = message; this.noticeUntil = this.frame + 220; }
  formationTarget(index) {
    const row = Math.floor(index / 2) + 1;
    const side = index % 2 === 0 ? -1 : 1;
    const protect = this.mode === 'protection';
    return createVector(clamp(this.leader.pos.x + side * row * (protect ? 49 : 46), 28, this.width - 28),
      clamp(this.leader.pos.y + (protect ? -65 - (row - 1) * 43 : row * 49), 35, this.height - 30));
  }
  recruit() {
    if (this.allies.length >= 8) { this.score += 150; this.notify('Escadrille complète · +150'); return; }
    this.allies.push(new Ally(clamp(this.leader.pos.x + 75, 28, this.width - 28), this.height + 28));
    this.emit('recruit');
    this.notify('Un nouvel ailier rejoint votre escadrille.');
  }
  fire(ship, target) {
    ship.aimAt(target);
    if (ship.cooldown > 0) return;
    this.projectiles.push(new Projectile(ship, target));
    this.emit(ship.team === 'enemy' ? 'enemy-shot' : 'friendly-shot');
    ship.cooldown = ship.team === 'enemy' ? Math.max(55, 105 / (ship.fireFactor || 1)) : 60 / this.settings.fireRate;
  }
  burst(pos, color, size = 28) {
    this.effects.push({ x: pos.x, y: pos.y, color, size, life: 30 });
    if (this.effects.length > 65) this.effects.shift();
  }
  collect(bonus) {
    this.emit(bonus.kind === 'recruit' ? 'bonus' : 'heal');
    if (bonus.kind === 'recruit') this.recruit();
    else { this.leader.heal(32); this.notify('Diamant de soin · +32 points de vie'); }
    this.score += 50;
    this.burst(bonus.pos, bonus.kind === 'recruit' ? '#78aaff' : '#68ffbd', 50);
  }
  tick() {
    if (this.state !== 'playing') return;
    this.frame++;
    this.theme.step();
    if (this.levelAnnouncement > 0) this.levelAnnouncement--;
    this.updateLevel();
    const s = this.settings;
    if (--this.enemyTimer <= 0) {
      this.spawnEnemy();
      this.enemyTimer = this.enemyInterval();
    }
    if (--this.obstacleTimer <= 0) {
      this.obstacles.push(new Obstacle(65 + this.rng() * (this.width - 130), -70, 24 + this.rng() * 20, this.rng()));
      this.obstacleTimer = this.obstacleInterval();
    }
    if (this.frame === 90) this.bonuses.push(new Bonus(this.width / 2 + 65, this.height * 0.4, 'recruit'));
    if (--this.bonusTimer <= 0) {
      this.bonuses.push(new Bonus(140 + this.rng() * (this.width - 280), -25,
        this.leader.hp < 65 || this.rng() < 0.4 ? 'heal' : 'recruit'));
      this.bonusTimer = 420;
    }
    // Arrive à sa propre position freine l'inertie sans poursuivre le curseur.
    // Le radar, la sécurité de bord et l'esquive S conservent leurs priorités.
    this.leader.steer(this.aiming ? this.leader.pos : this.pointer, this.obstacles, s);
    this.leader.aimAt(this.aimPointer);
    for (let index = 0; index < this.allies.length; index++) {
      const ally = this.allies[index];
      ally.steer(this.formationTarget(index), this.obstacles, s);
      const target = this.enemies.filter(e => e.hp > 0 && e.pos.dist(ally.pos) < 650)
        .sort((a, b) => a.pos.dist(ally.pos) - b.pos.dist(ally.pos))[0];
      if (target) this.fire(ally, target.pos);
    }
    for (const enemy of this.enemies) {
      enemy.steer(enemy.heavy ? enemy.station : this.leader.pos, [], s, !!enemy.heavy);
      if (enemy.heavy) enemy.attack(this);
      else if (enemy.pos.y > 0 && enemy.pos.dist(this.leader.pos) < 900) this.fire(enemy, this.leader.pos);
    }
    if (this.firing) this.fire(this.leader, this.aimPointer);
    for (const item of [...this.obstacles, ...this.bonuses, ...this.projectiles]) item.step();
    this.resolveCollisions();
    this.updateLevel();
    for (const effect of this.effects) effect.life--;
    this.effects = this.effects.filter(e => e.life > 0);
    this.enemies = this.enemies.filter(e => e.hp > 0 && e.pos.y < this.height + 80);
    this.allies = this.allies.filter(a => a.hp > 0);
    this.obstacles = this.obstacles.filter(o => o.pos.y < this.height + 90);
    this.bonuses = this.bonuses.filter(b => !b.collected && b.pos.y < this.height + 40);
    this.projectiles = this.projectiles.filter(p => p.life > 0 && p.pos.x > -50 && p.pos.x < this.width + 50 && p.pos.y > -60 && p.pos.y < this.height + 60);
    if (!this.allies.length) this.mode = 'normal';
    if (this.leader.hp <= 0) { this.state = 'over'; this.endAim(); this.burst(this.leader.pos, '#ffad70', 90); this.emit('defeat'); }
  }
  resolveCollisions() {
    const overlap = (a, b) => a.pos.dist(b.pos) < a.r + b.r;
    const friendly = [this.leader, ...this.allies];
    for (const projectile of this.projectiles) {
      if (projectile.life <= 0) continue;
      const targets = projectile.team === 'enemy' ? friendly : this.enemies;
      // Un projectile touche la première coque rencontrée ; les ailiers font écran.
      const ship = targets.filter(t => t.hp > 0 && overlap(t, projectile))
        .sort((a, b) => a.pos.dist(projectile.pos) - b.pos.dist(projectile.pos))[0];
      const obstacle = this.obstacles.find(o => overlap(o, projectile));
      if (ship) {
        const hit = ship.damage(projectile.damage || (projectile.team === 'enemy' ? 12 : 18));
        projectile.life = 0;
        this.burst(projectile.pos, ship.team === 'enemy' ? '#ff886f' : '#70eaff', ship.hp <= 0 ? 55 : 18);
        this.emit(ship.hp <= 0 ? 'explosion' : 'impact');
        if (hit && ship.hp === 0 && ship.team === 'enemy') { this.score += ship.reward || 100; this.kills++; }
      } else if (obstacle) { projectile.life = 0; this.burst(projectile.pos, '#ffc58c', 16); this.emit('impact'); }
    }
    for (const ship of friendly) {
      for (const obstacle of this.obstacles) if (overlap(ship, obstacle) && ship.damage(16)) {
        this.burst(ship.pos, '#ffb277'); this.emit(ship.hp <= 0 ? 'explosion' : 'impact');
      }
      for (const enemy of this.enemies) if (enemy.hp > 0 && overlap(ship, enemy)) {
        ship.damage(22); enemy.hp = 0; this.burst(enemy.pos, '#ff886f', 45);
        this.emit('explosion');
      }
    }
    for (const bonus of this.bonuses) if (!bonus.collected && overlap(this.leader, bonus)) {
      bonus.collected = true; this.collect(bonus);
    }
  }
}
