class HeavyEnemy extends Enemy {
  constructor(x, y, difficulty, config) {
    super(x, y, difficulty);
    this.heavy = true; this.r = 33;
    this.hp = this.maxHp = Math.ceil(config.hp * difficulty.health);
    this.speedFactor *= config.speedFactor;
    this.reward = config.score;
    this.station = createVector(x, 180);
    this.warningRemaining = 0; this.missileTimer = 100; this.lockTarget = null;
  }
  attack(game) {
    if (this.pos.y < 40 || this.hp <= 0) return;
    const config = game.config.heavy;
    if (this.warningRemaining > 0) {
      if (--this.warningRemaining === 0) {
        game.projectiles.push(new Missile(this, this.lockTarget, config));
        game.emit('missile');
        this.lockTarget = null;
        this.missileTimer = Math.max(120, config.missileInterval / this.fireFactor);
      }
    } else if (--this.missileTimer <= 0) {
      this.lockTarget = game.leader.pos.copy();
      this.warningRemaining = config.warningFrames;
      game.emit('warning');
    }
  }
}
