class Obstacle extends Vehicle {
  constructor(x, y, radius, variant = 0) {
    super(x, y);
    this.r = radius;
    this.variant = variant;
    this.maxSpeed = 1.15;
    this.maxForce = 0.08;
    this.target = createVector(x, 6000);
  }
  step() { this.applyForce(super.seek(this.target)); super.update(); }
}
