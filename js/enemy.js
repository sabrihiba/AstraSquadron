class Enemy extends Spacecraft {
  constructor(x, y, difficulty = GAME_CONFIG.levels[0]) {
    super(x, y, 'enemy'); this.cooldown = 70;
    this.hp = this.maxHp = Math.ceil(35 * difficulty.health);
    this.speedFactor = difficulty.speed;
    this.fireFactor = difficulty.fire;
    this.reward = 100;
  }
}
