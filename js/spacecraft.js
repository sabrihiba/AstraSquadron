// La locomotion et arrive/seek restent celles du Vehicle original du cours.
class Spacecraft extends Vehicle {
  constructor(x, y, team = 'leader') {
    super(x, y);
    this.team = team;
    this.hp = team === 'leader' ? 100 : team === 'ally' ? 55 : 35;
    this.maxHp = this.hp;
    this.r = team === 'leader' ? 17 : 14;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.target = this.pos.copy();
    this.aimDirection = createVector(0, team === 'enemy' ? 1 : -1);
    this.radar = { force: { x: 0, y: 0 }, rays: [] };
    this.lastForce = createVector(0, 0);
    this.trail = [];
    this.rayonZoneDeFreinage = 65;
  }

  steer(destination, obstacles, settings, arrival = true) {
    this.maxSpeed = this.team === 'enemy' ? settings.speed * 0.38 * (this.speedFactor || 1) : settings.speed;
    this.maxForce = settings.force;
    this.target = destination.copy();
    const tracking = this.trackingForce(destination, arrival);
    this.radar = calculateMultiRayAvoidance(this.pos, this.vel, obstacles,
      settings.rays, this.r + settings.clearance, this.maxForce, settings.ahead);
    const avoidance = createVector(this.radar.force.x, this.radar.force.y);
    // Pondération du preview fourni ; priorité au radar en présence d'une menace.
    let force = tracking.mult(this.radar.rays.some(ray => ray.threatened) ? 0.2 : 1)
      .add(avoidance.mult(settings.avoidWeight)).limit(this.maxForce);
    force = this.flightSafety(force, settings);
    this.lastForce = force.copy();
    this.applyForce(force);
    super.update();
    this.cooldown = Math.max(0, this.cooldown - 1);
    this.invulnerable = Math.max(0, this.invulnerable - 1);
    this.trail.push(this.pos.copy());
    if (this.trail.length > 16) this.trail.shift();
  }

  trackingForce(destination, arrival) {
    return arrival ? super.arrive(destination) : super.seek(destination);
  }

  flightSafety(force) { return force; }

  // Orientation de combat uniquement : aucun effet sur la locomotion.
  aimAt(position) {
    const direction = p5.Vector.sub(position, this.pos);
    if (direction.magSq() > 1e-12) this.aimDirection = direction.normalize();
    return this.aimDirection;
  }

  damage(amount) {
    if (this.invulnerable > 0 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerable = this.team === 'enemy' ? 2 : 26;
    return true;
  }
}
