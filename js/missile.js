class Missile extends Projectile {
  constructor(ship, destination, config) {
    super(ship, destination);
    this.missile = true; this.r = 8;
    this.damage = config.missileDamage;
    this.maxSpeed = config.missileSpeed;
    this.vel.setMag(this.maxSpeed);
    this.life = 360;
  }
  // step() hérité de Projectile : Seek original vers la cible fixée au lancement.
  // Aucun algorithme génétique, aucune prédiction ni correction de trajectoire.
}
