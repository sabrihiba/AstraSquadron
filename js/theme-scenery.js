// Rendu d'ambiance seulement. Aucun Vehicle, rayon de collision ou force ici.
class ThemeScenery {
  constructor(ctx) {
    this.ctx = ctx; this.cache = new Map();
    this.layer = this.canvas();
    this.stars = Array.from({ length: 230 }, (_, i) => ({ x: (i * 7919) % 1280, y: (i * 3571) % 800, z: 0.25 + (i % 7) / 7 }));
  }
  canvas() {
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 800;
    return canvas;
  }
  haze(c, x, y, radius, color, opacity = '55') {
    const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color + opacity); gradient.addColorStop(1, color + '00');
    c.fillStyle = gradient; c.fillRect(0, 0, 1280, 800);
  }
  background(id, theme) {
    if (this.cache.has(id)) return this.cache.get(id);
    const canvas = this.canvas(), c = canvas.getContext('2d');
    c.fillStyle = theme.base; c.fillRect(0, 0, 1280, 800);
    theme.haze.forEach((color, i) => this.haze(c, 930 - i * 170, 220 + i * 210, 570, color, theme.landmark === 'nebula' ? 'aa' : '66'));
    if (theme.landmark === 'nebula') {
      for (let i = 0; i < 23; i++) this.haze(c, 620 + Math.sin(i * 0.4) * 350, i * 39 - 60, 100 + i % 5 * 15, theme.haze[i % 3], '20');
      c.save(); c.strokeStyle = theme.accent + '0e'; c.lineWidth = 27;
      for (let i = 0; i < 5; i++) {
        c.beginPath(); c.moveTo(1000 + i * 30, -50); c.bezierCurveTo(500, 240, 1250, 500, 600 + i * 40, 850); c.stroke();
      }
      c.restore();
    }
    this.planet(c, theme, theme.landmark === 'nebula' ? 78 : 155);
    if (theme.landmark === 'belt') {
      c.save(); c.translate(990, 300); c.rotate(-0.45);
      for (let i = 0; i < 90; i++) {
        const angle = i * 2.399, r = 225 + (i % 7) * 5;
        c.fillStyle = theme.particles.color + (i % 3 === 0 ? '30' : '16');
        this.polygon(c, Math.cos(angle) * r, Math.sin(angle) * r * 0.38, 3 + i % 6, 7, i); c.fill();
      }
      c.restore();
    }
    if (theme.landmark === 'ice') {
      c.save(); c.globalAlpha = 0.12; c.strokeStyle = theme.accent;
      for (const [x, y, size] of [[63, 450, 35], [1210, 570, 50], [1140, 110, 24]]) {
        c.fillStyle = theme.haze[0]; this.polygon(c, x, y, size, 5, 0); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x, y - size); c.lineTo(x, y + size); c.moveTo(x - size, y); c.lineTo(x + size, y); c.stroke();
      }
      c.restore();
    }
    if (theme.landmark === 'base') this.station(c, theme);
    this.cache.set(id, canvas);
    return canvas;
  }
  polygon(c, x, y, r, count, seed) {
    c.beginPath();
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2, radius = r * (0.82 + Math.sin(i * 7 + seed) * 0.18);
      const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
  }
  planet(c, theme, r) {
    c.save(); c.translate(1005, 305); c.rotate(-0.35);
    c.shadowColor = theme.accent; c.shadowBlur = 24;
    const gradient = c.createRadialGradient(-r * 0.5, -r * 0.6, 0, 0, 0, r);
    gradient.addColorStop(0, theme.planet[0]); gradient.addColorStop(0.5, theme.planet[1]); gradient.addColorStop(1, theme.planet[2]);
    c.fillStyle = gradient; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; c.clip();
    for (let i = 0; i < 22; i++) {
      c.strokeStyle = theme.accent + '0c'; c.lineWidth = 1 + i % 4;
      c.beginPath(); c.ellipse(-20, -r + i * r / 10, r * 1.1, 14 + i % 11, 0.1, 0, Math.PI * 2); c.stroke();
    }
    if (theme.landmark === 'ice' || theme.landmark === 'volcano') {
      c.strokeStyle = theme.landmark === 'ice' ? '#d3faff66' : '#ff9347aa';
      c.shadowColor = theme.accent; c.shadowBlur = theme.landmark === 'volcano' ? 10 : 0;
      for (let i = 0; i < 9; i++) {
        c.lineWidth = 1 + i % 2; c.beginPath();
        for (let j = 0; j < 9; j++) {
          const x = -r + j * r / 4, y = -r + i * 40 + Math.sin(i * 3 + j * 9) * 28;
          if (j) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
      if (theme.landmark === 'ice') {
        c.fillStyle = '#d7f8ff44'; c.beginPath(); c.ellipse(-15, -r * 0.76, r * 0.72, r * 0.17, 0.1, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }
  station(c, theme) {
    c.save(); c.translate(1000, 310); c.rotate(-0.25);
    c.fillStyle = '#101722'; c.strokeStyle = '#7a819333'; c.lineWidth = 2;
    c.fillRect(-47, -235, 94, 470); c.strokeRect(-47, -235, 94, 470);
    for (const side of [-1, 1]) {
      c.fillStyle = '#0c1522'; c.fillRect(side < 0 ? -250 : 55, -125, 195, 250);
      c.strokeRect(side < 0 ? -250 : 55, -125, 195, 250);
      for (let row = 0; row < 7; row++) for (let col = 0; col < 4; col++) {
        const x = (side < 0 ? -240 : 65) + col * 45, y = -115 + row * 34;
        c.fillStyle = '#27354b44'; c.fillRect(x, y, 37, 25); c.strokeStyle = '#6b7a8f25'; c.strokeRect(x, y, 37, 25);
      }
    }
    c.strokeStyle = theme.accent + '55'; c.fillStyle = '#28303e';
    c.beginPath(); c.arc(0, 0, 75, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#100e1a'; c.beginPath(); c.arc(0, 0, 48, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 10; i++) {
      c.fillStyle = i % 2 ? '#ff677d66' : '#ff677d22'; c.fillRect(-30, -220 + i * 46, 10, 4); c.fillRect(20, -220 + i * 46, 10, 4);
    }
    c.restore();
  }
  draw(game, layers) {
    const c = this.ctx, work = this.layer.getContext('2d');
    let total = 0;
    for (const layer of layers) {
      work.globalAlpha = 1; work.drawImage(this.background(layer.id, layer.theme), 0, 0);
      this.atmosphere(work, layer.theme, game.frame);
      total += layer.weight;
      c.save(); c.globalAlpha = layer.weight / total;
      c.drawImage(this.layer, 0, 0, game.width, game.height); c.restore();
    }
  }
  atmosphere(c, theme, frame) {
    c.save(); c.fillStyle = theme.stars;
    for (const star of this.stars) {
      c.globalAlpha = 0.17 + star.z * 0.38;
      c.fillRect(star.x, (star.y + frame * star.z * 0.55) % 800, star.z > 0.95 ? 1.8 : 1, 1 + star.z * 1.8);
    }
    const p = theme.particles;
    c.fillStyle = p.color; c.strokeStyle = p.color; c.lineWidth = 0.8;
    for (let i = 0; i < p.count; i++) {
      const x = ((i * 733 + Math.sin(frame * 0.005 + i) * 17) % 1280 + 1280) % 1280;
      const movement = p.kind === 'embers' ? -frame : frame;
      const y = ((i * 271 + movement * p.speed * (0.5 + i % 3 * 0.2)) % 800 + 800) % 800;
      const size = p.size * (0.4 + i % 4 / 5);
      c.globalAlpha = p.opacity * (0.5 + Math.sin(i + frame * 0.012) * 0.25);
      if (p.kind === 'debris') { this.polygon(c, x, y, size, 5, i); c.fill(); }
      else if (p.kind === 'snow' && i % 3 === 0) {
        c.beginPath(); c.moveTo(x - size, y); c.lineTo(x + size, y); c.moveTo(x, y - size); c.lineTo(x, y + size); c.stroke();
      } else if (p.kind === 'sparks' || p.kind === 'embers') c.fillRect(x, y, 1.4, size * 2);
      else { c.beginPath(); c.arc(x, y, size, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
}
