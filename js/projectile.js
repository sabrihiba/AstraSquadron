class Projectile extends Vehicle {
  constructor(ship, destination) {
    super(ship.pos.x, ship.pos.y);
    const direction = ship.aimAt(destination).copy();
    // La direction vient du centre actuel de l'avion, puis la bouche du canon
    // est décalée sur cette même droite, quelle que soit l'orientation de la coque.
    this.pos.add(direction.copy().mult(ship.r + 10));
    this.team = ship.team === 'enemy' ? 'enemy' : 'friendly';
    this.r = this.team === 'enemy' ? 5 : 4;
    this.maxSpeed = this.team === 'enemy' ? 5 : 12;
    this.maxForce = 1;
    // Destination fixée au tir : aucun guidage après lancement.
    this.target = this.pos.copy().add(direction.copy().mult(4000));
    this.vel = direction.mult(this.maxSpeed);
    this.life = 250;
  }
  step() { this.applyForce(super.seek(this.target)); super.update(); this.life--; }
}
