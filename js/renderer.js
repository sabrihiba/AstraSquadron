class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.scenery = new ThemeScenery(this.ctx);
  }
  draw(game) {
    const c = this.ctx, t = game.frame, w = game.width, h = game.height;
    c.save(); c.scale(c.canvas.width / w, c.canvas.height / h);
    const themeLayers = game.theme.layers();
    this.scenery.draw(game, themeLayers);
    if (game.state === 'ready') {
      this.ship({ pos: { x: w * 0.74, y: h * 0.65 }, vel: { x: 0, y: 0 }, team: 'leader', invulnerable: 0, trail: [] }, t, 2.1);
      this.ship({ pos: { x: w * 0.64, y: h * 0.8 }, vel: { x: 0, y: 0 }, team: 'ally', invulnerable: 0, trail: [] }, t, 1.15);
      this.ship({ pos: { x: w * 0.84, y: h * 0.8 }, vel: { x: 0, y: 0 }, team: 'ally', invulnerable: 0, trail: [] }, t, 1.15);
    } else {
      if (game.mode === 'protection') {
        c.save(); c.strokeStyle = '#9fafff44'; c.setLineDash([5, 7]);
        c.beginPath(); c.ellipse(game.leader.pos.x, game.leader.pos.y - 30, 105, 75, 0, Math.PI, Math.PI * 2); c.stroke(); c.restore();
      }
      for (const obstacle of game.obstacles) {
        let total = 0;
        for (const layer of themeLayers) {
          total += layer.weight;
          c.save(); c.globalAlpha = layer.weight / total;
          this.asteroid(obstacle, t, layer.theme.obstacle); c.restore();
        }
      }
      for (const bonus of game.bonuses) this.bonus(bonus, t);
      for (const shot of game.projectiles) {
        if (shot.missile) { this.missile(shot, t); continue; }
        const color = shot.team === 'enemy' ? '#ff806e' : '#9cffff';
        c.save(); c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 14; c.lineWidth = shot.team === 'enemy' ? 4 : 3;
        const direction = shot.vel.copy().setMag(shot.team === 'enemy' ? 11 : 21);
        c.beginPath(); c.moveTo(shot.pos.x, shot.pos.y); c.lineTo(shot.pos.x - direction.x, shot.pos.y - direction.y); c.stroke(); c.restore();
      }
      for (const ship of [...game.enemies, ...game.allies, game.leader]) {
        if (game.debug) this.debug(ship);
        if (ship.hp > 0) this.ship(ship, t);
        if (ship.heavy && ship.warningRemaining > 0) this.warning(ship, game.config.heavy.warningFrames);
      }
      if (game.leader.dodgeRemaining > 0) {
        c.save(); c.strokeStyle = '#b2fff099'; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(game.leader.pos.x, game.leader.pos.y, 30, 38, game.leader.vel.heading(), 0.5, Math.PI * 1.7); c.stroke(); c.restore();
      }
      for (const effect of game.effects) this.explosion(effect);
      if (game.state === 'playing') this.reticle(game);
    }
    // Vignette, sans masquer les projectiles au centre.
    const vignette = c.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.75);
    vignette.addColorStop(0, '#02071600'); vignette.addColorStop(1, '#01050d88');
    c.fillStyle = vignette; c.fillRect(0, 0, w, h);
    c.restore();
  }
  planet(x, y, r) {
    const c = this.ctx;
    c.save(); c.translate(x, y); c.rotate(-0.35);
    const glow = c.createRadialGradient(0, 0, r * 0.92, 0, 0, r * 1.15);
    glow.addColorStop(0, '#62c9ff00'); glow.addColorStop(0.5, '#6ca7f126'); glow.addColorStop(1, '#558eff00');
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, r * 1.15, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-r * 0.5, -r * 0.6, 0, 0, 0, r);
    g.addColorStop(0, '#567ba1'); g.addColorStop(0.5, '#243954'); g.addColorStop(0.9, '#0d192d'); g.addColorStop(1, '#030a18');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.clip();
    for (let i = 0; i < 25; i++) {
      c.strokeStyle = '#9bd0ea0c'; c.lineWidth = 1 + i % 4;
      c.beginPath(); c.ellipse(-20, -r + i * r / 11, r * 1.1, 14 + i % 11, 0.1, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }
  ship(ship, t, scale = 1) {
    const c = this.ctx, enemy = ship.team === 'enemy';
    const color = ship.heavy ? '#ffb471' : enemy ? '#ff8b7c' : ship.team === 'ally' ? '#acb6ff' : '#8deaff';
    if (ship.heavy) scale *= 1.6;
    c.save();
    for (let i = 1; i < ship.trail.length; i++) {
      c.strokeStyle = color; c.globalAlpha = i / ship.trail.length * 0.14; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ship.trail[i - 1].x, ship.trail[i - 1].y + (enemy ? -16 : 16)); c.lineTo(ship.trail[i].x, ship.trail[i].y + (enemy ? -16 : 16)); c.stroke();
    }
    c.globalAlpha = ship.invulnerable > 0 && t % 6 < 3 ? 0.45 : 1;
    c.translate(ship.pos.x, ship.pos.y); c.scale(scale, scale);
    c.rotate((enemy ? Math.PI : 0) + clamp(ship.vel.x * 0.035, -0.22, 0.22));
    c.shadowColor = color; c.shadowBlur = 18;
    const flame = 19 + Math.sin(t * 1.4) * 5;
    const g = c.createLinearGradient(0, 12, 0, 23 + flame);
    g.addColorStop(0, '#edffff'); g.addColorStop(0.2, color); g.addColorStop(1, '#73baff00'); c.fillStyle = g;
    for (const x of [-9, 9]) { c.beginPath(); c.moveTo(x - 3, 12); c.quadraticCurveTo(x, 30 + flame, x + 3, 12); c.fill(); }
    c.shadowBlur = 5;
    const hull = c.createLinearGradient(-23, 0, 23, 0);
    hull.addColorStop(0, '#1d344b'); hull.addColorStop(0.5, enemy ? '#675269' : '#6396ad'); hull.addColorStop(1, '#152b43');
    c.fillStyle = hull; c.strokeStyle = color; c.lineWidth = 1;
    c.beginPath();
    if (ship.heavy) {
      c.moveTo(0, -25); c.lineTo(10, -12); c.lineTo(22, -14); c.lineTo(31, 5); c.lineTo(31, 16); c.lineTo(17, 11); c.lineTo(12, 22); c.lineTo(-12, 22); c.lineTo(-17, 11); c.lineTo(-31, 16); c.lineTo(-31, 5); c.lineTo(-22, -14); c.lineTo(-10, -12);
    } else {
      c.moveTo(0, -28); c.lineTo(8, -7); c.lineTo(24, 14); c.lineTo(23, 20); c.lineTo(9, 13); c.lineTo(5, 18); c.lineTo(-5, 18); c.lineTo(-9, 13); c.lineTo(-23, 20); c.lineTo(-24, 14); c.lineTo(-8, -7);
    }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d5f8ff'; c.beginPath(); c.moveTo(0, -15); c.lineTo(4, -2); c.lineTo(0, 5); c.lineTo(-4, -2); c.closePath(); c.fill();
    c.strokeStyle = '#ecfbff88'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, -26); c.lineTo(0, -17); c.moveTo(-18, 13); c.lineTo(-9, 6); c.moveTo(18, 13); c.lineTo(9, 6); c.stroke();
    c.restore();
    if (ship.aimDirection) this.cannon(ship, color);
    if (ship.hp < ship.maxHp && ship.team !== 'leader') {
      c.fillStyle = '#ffffff22'; c.fillRect(ship.pos.x - 16, ship.pos.y + 29, 32, 2);
      c.fillStyle = color; c.fillRect(ship.pos.x - 16, ship.pos.y + 29, 32 * ship.hp / ship.maxHp, 2);
    }
  }
  cannon(ship, color) {
    const c = this.ctx;
    c.save(); c.translate(ship.pos.x, ship.pos.y); c.rotate(ship.aimDirection.heading());
    c.shadowColor = color; c.shadowBlur = 8;
    c.fillStyle = '#132438'; c.strokeStyle = color; c.lineWidth = 1;
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#8fb4c6'; c.fillRect(2, -2, ship.r + 8, 4);
    c.fillStyle = color; c.fillRect(ship.r + 7, -3, 4, 6);
    c.restore();
  }
  reticle(game) {
    const c = this.ctx, point = game.aimPointer;
    c.save(); c.translate(point.x, point.y);
    const radius = game.aiming ? 16 : 10;
    c.strokeStyle = game.aiming ? '#bdffff' : '#94d7e288'; c.lineWidth = game.aiming ? 1.5 : 1;
    c.shadowColor = '#88edff'; c.shadowBlur = game.aiming ? 9 : 0;
    c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      c.moveTo(Math.cos(angle) * (radius - 5), Math.sin(angle) * (radius - 5));
      c.lineTo(Math.cos(angle) * (radius + 5), Math.sin(angle) * (radius + 5));
    }
    c.stroke();
    if (game.aiming) {
      c.font = '9px monospace'; c.textAlign = 'center'; c.fillStyle = '#b9edfa';
      c.fillText('VISÉE 360°', 0, radius + 19);
    }
    c.restore();
  }
  missile(shot, t) {
    const c = this.ctx; c.save(); c.translate(shot.pos.x, shot.pos.y); c.rotate(shot.vel.heading() + Math.PI / 2);
    c.fillStyle = '#ffad62'; c.shadowColor = '#ff8540'; c.shadowBlur = 19;
    c.beginPath(); c.moveTo(-4, 7); c.lineTo(0, 23 + Math.sin(t * 2) * 5); c.lineTo(4, 7); c.fill();
    c.fillStyle = '#ffdfab'; c.strokeStyle = '#ff9a58'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -13); c.lineTo(5, -3); c.lineTo(5, 7); c.lineTo(9, 12); c.lineTo(-9, 12); c.lineTo(-5, 7); c.lineTo(-5, -3); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  warning(ship, duration) {
    const c = this.ctx, target = ship.lockTarget;
    c.save(); c.strokeStyle = '#ffbb72'; c.fillStyle = '#ffd09c'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(ship.pos.x, ship.pos.y, 54, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ship.warningRemaining / duration)); c.stroke();
    c.font = '10px monospace'; c.textAlign = 'center'; c.fillText(`MISSILE · ${(ship.warningRemaining / 60).toFixed(1)} s`, ship.pos.x, ship.pos.y + 68);
    if (target) {
      c.setLineDash([3, 10]); c.globalAlpha = 0.5; c.beginPath(); c.moveTo(ship.pos.x, ship.pos.y); c.lineTo(target.x, target.y); c.stroke();
      c.globalAlpha = 0.9; c.setLineDash([]); c.beginPath(); c.arc(target.x, target.y, 24, 0, Math.PI * 2);
      c.moveTo(target.x - 32, target.y); c.lineTo(target.x + 32, target.y); c.moveTo(target.x, target.y - 32); c.lineTo(target.x, target.y + 32); c.stroke();
    }
    c.restore();
  }
  asteroid(o, t, appearance) {
    const c = this.ctx; c.save(); c.translate(o.pos.x, o.pos.y); c.rotate(t * 0.002 + o.variant * 7);
    const gradient = c.createLinearGradient(-o.r, -o.r, o.r, o.r);
    gradient.addColorStop(0, appearance.colors[0]); gradient.addColorStop(0.45, appearance.colors[1]); gradient.addColorStop(1, appearance.colors[2]);
    c.fillStyle = gradient; c.strokeStyle = appearance.rim + 'bb'; c.lineWidth = 1.5;
    c.beginPath();
    const count = appearance.kind === 'crystal' ? 6 : appearance.kind === 'metal' ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const radius = o.r * (0.85 + Math.sin(i * 7 + o.variant) * 0.15);
      const x = Math.cos(i / count * Math.PI * 2) * radius, y = Math.sin(i / count * Math.PI * 2) * radius;
      if (!i) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath(); c.fill(); c.stroke();
    if (appearance.kind === 'crystal' || appearance.kind === 'metal') {
      c.strokeStyle = appearance.rim + '88'; c.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * o.r * 0.85, Math.sin(a) * o.r * 0.85); c.stroke();
      }
      if (appearance.kind === 'metal') { c.strokeStyle = '#f5b66daa'; c.strokeRect(-o.r * 0.4, -o.r * 0.4, o.r * 0.8, o.r * 0.8); }
    } else {
      for (let i = 0; i < 4; i++) { c.fillStyle = '#07102066'; c.beginPath(); c.ellipse(Math.sin(i * 9) * o.r * 0.5, Math.cos(i * 8) * o.r * 0.4, o.r * 0.17, o.r * 0.13, i, 0, Math.PI * 2); c.fill(); }
      if (appearance.kind === 'slag') {
        c.strokeStyle = '#ffb169'; c.shadowColor = '#ff582e'; c.shadowBlur = 8; c.lineWidth = 1.7;
        c.beginPath(); c.moveTo(-o.r * 0.7, -o.r * 0.3); c.lineTo(0, o.r * 0.1); c.lineTo(o.r * 0.2, -o.r * 0.4); c.lineTo(o.r * 0.7, o.r * 0.1); c.stroke();
      }
    }
    c.restore();
  }
  bonus(b, t) {
    const c = this.ctx, color = b.kind === 'heal' ? '#75ffc2' : '#9aafff';
    c.save(); c.translate(b.pos.x, b.pos.y); c.shadowColor = color; c.shadowBlur = 23;
    c.strokeStyle = color; c.fillStyle = b.kind === 'heal' ? '#123d3e' : '#202a59'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -18); c.lineTo(15, 0); c.lineTo(0, 18); c.lineTo(-15, 0); c.closePath(); c.fill(); c.stroke();
    c.shadowBlur = 0; c.fillStyle = color; c.font = '18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.kind === 'heal' ? '+' : '✧', 0, 0);
    c.globalAlpha = 0.3; c.rotate(t * 0.015); c.setLineDash([7, 6]); c.strokeRect(-22, -22, 44, 44); c.restore();
  }
  explosion(e) {
    const c = this.ctx, progress = 1 - e.life / 30;
    c.save(); c.globalAlpha = (1 - progress) ** 2; c.strokeStyle = e.color; c.fillStyle = e.color; c.shadowColor = e.color; c.shadowBlur = 20;
    c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, 3 + e.size * progress, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i * 2.4; const r = progress * e.size * (0.8 + i % 3 * 0.25); c.fillRect(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 3, 3); }
    c.restore();
  }
  debug(ship) {
    const c = this.ctx; c.save(); c.lineWidth = 1;
    c.strokeStyle = '#f9d17988'; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(ship.pos.x, ship.pos.y); c.lineTo(ship.target.x, ship.target.y); c.stroke();
    c.beginPath(); c.arc(ship.target.x, ship.target.y, 9, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    for (const ray of ship.radar.rays) {
      c.strokeStyle = ray.threatened ? '#ff816d' : '#7bd3e344';
      c.beginPath(); c.moveTo(ship.pos.x, ship.pos.y); c.lineTo(ray.ahead.x, ray.ahead.y); c.stroke();
      for (const point of [ship.pos, ray.ahead2, ray.ahead]) { c.beginPath(); c.arc(point.x, point.y, 3, 0, Math.PI * 2); c.stroke(); }
      if (ray.threatened) { c.strokeStyle = '#ff816d'; c.beginPath(); c.arc(ray.closest.pos.x, ray.closest.pos.y, ray.closest.r + ship.r, 0, Math.PI * 2); c.stroke(); }
    }
    const arrow = (v, scale, color) => { const x = ship.pos.x + v.x * scale, y = ship.pos.y + v.y * scale, a = Math.atan2(v.y, v.x); c.strokeStyle = color; c.beginPath(); c.moveTo(ship.pos.x, ship.pos.y); c.lineTo(x, y); c.lineTo(x - Math.cos(a - 0.5) * 7, y - Math.sin(a - 0.5) * 7); c.moveTo(x, y); c.lineTo(x - Math.cos(a + 0.5) * 7, y - Math.sin(a + 0.5) * 7); c.stroke(); };
    arrow(ship.vel, 10, '#76c8ff'); arrow(ship.lastForce, 200, '#f1ce79'); arrow(ship.radar.force, 450, '#9ef29b');
    c.restore();
  }
}
