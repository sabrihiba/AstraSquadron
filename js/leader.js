class Leader extends Spacecraft {
  constructor(x, y) {
    super(x, y, 'leader');
    this.dodgeRemaining = 0; this.dodgeCooldown = 0; this.dodgeThreat = null;
    this.flightBounds = null;
  }
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

  beginDodge(projectiles, config) {
    if (this.dodgeCooldown > 0 || this.dodgeRemaining > 0) return false;
    // Sélection seulement : projectile vivant, proche et se rapprochant du leader.
    const candidates = projectiles.filter(p => {
      if (p.team !== 'enemy' || p.life <= 0) return false;
      const offset = p5.Vector.sub(this.pos, p.pos);
      const relativeVelocity = p5.Vector.sub(p.vel, this.vel);
      return offset.mag() > 1e-6 && offset.mag() <= config.detectionRadius &&
        offset.x * relativeVelocity.x + offset.y * relativeVelocity.y > 0;
    }).sort((a, b) => a.pos.dist(this.pos) - b.pos.dist(this.pos));
    if (!candidates.length) return false;
    this.dodgeThreat = candidates[0];
    this.dodgeRemaining = config.durationFrames;
    this.dodgeCooldown = config.durationFrames + config.cooldownFrames;
    return true;
  }

  trackingForce(destination, arrival) {
    if (this.dodgeRemaining > 0 && this.dodgeThreat?.life > 0) {
      this.target = this.dodgeThreat.pos.copy();
      return super.flee(this.dodgeThreat.pos);
    }
    return super.trackingForce(destination, arrival);
  }

  flightSafety(force, settings) {
    if (!this.flightBounds) return force;
    const { width, height, margin, boundaryLookahead } = this.flightBounds;
    // Sélection d'action de bord : Arrive vers un point intérieur, jamais de correction de position.
    // Le freinage utilise le budget de force réel, même avec les curseurs extrêmes.
    const horizon = Math.max(boundaryLookahead, this.maxSpeed / this.maxForce + 5);
    const future = this.pos.copy().add(this.vel.copy().mult(horizon));
    const outside = p => p.x < margin || p.x > width - margin || p.y < margin || p.y > height - margin;
    if (!outside(this.pos) && !outside(future)) return force;
    const safeTarget = createVector(clamp(this.pos.x, margin + 100, width - margin - 100),
      clamp(this.pos.y, margin + 100, height - margin - 100));
    this.target = safeTarget.copy();
    const safeForce = super.arrive(safeTarget);
    const radarForce = createVector(this.radar.force.x, this.radar.force.y).mult(settings.avoidWeight);
    // Conserver l'évitement compatible avec le retour intérieur ; le bord est prioritaire sinon.
    if (safeForce.x * radarForce.x + safeForce.y * radarForce.y >= 0) safeForce.add(radarForce);
    return safeForce.limit(this.maxForce);
  }

  steer(destination, obstacles, settings, arrival = true) {
    super.steer(destination, obstacles, settings, arrival);
    if (this.dodgeRemaining > 0) this.dodgeRemaining--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (!this.dodgeRemaining || this.dodgeThreat?.life <= 0) {
      this.dodgeRemaining = 0; this.dodgeThreat = null;
    }
  }
}
