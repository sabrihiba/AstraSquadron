class Bonus extends Vehicle {
  constructor(x, y, kind) {
    super(x, y);
    this.kind = kind;
    this.r = 18;
    this.maxSpeed = 0.85;
    this.maxForce = 0.08;
    this.target = createVector(x, 6000);
  }
  step() { this.applyForce(super.seek(this.target)); super.update(); }
}
