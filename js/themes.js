// Décor uniquement : aucune donnée de ce fichier n'entre dans les collisions.
// Les niveaux peuvent nommer une clé avec `theme`; les niveaux supplémentaires
// sans clé utilisent successivement `variants`, sans changer la difficulté.
const THEME_CONFIG = Object.freeze({
  transitionFrames: 180,
  order: ['deep', 'nebula', 'asteroids', 'ice', 'volcano', 'base'],
  variants: ['emerald', 'derelict', 'nebula', 'ice', 'volcano', 'deep'],
  themes: {
    deep: { name: 'Espace profond', base: '#040b1c', haze: ['#18376c', '#222045', '#10536a'], accent: '#8deaff', stars: '#c3deff',
      planet: ['#5b84ab', '#1e3451', '#050e20'], landmark: 'planet',
      particles: { kind: 'dust', color: '#7dcfe7', count: 30, speed: 0.35, size: 1.5, opacity: 0.3 },
      obstacle: { kind: 'rock', colors: ['#697d95', '#354457', '#172438'], rim: '#b7cddd' }, music: { ambient: 0.8, pulse: 0.12, filter: 1500 } },
    nebula: { name: 'Nébuleuse violette', base: '#130a26', haze: ['#7f37a5', '#ab397a', '#493a9b'], accent: '#d6a6ff', stars: '#efd8ff',
      planet: ['#aa77bc', '#4d295d', '#1b102f'], landmark: 'nebula',
      particles: { kind: 'motes', color: '#efabd9', count: 48, speed: 0.42, size: 2, opacity: 0.25 },
      obstacle: { kind: 'rock', colors: ['#9782ad', '#55435f', '#251c39'], rim: '#d5b5ec' }, music: { ambient: 0.95, pulse: 0.24, filter: 2200 } },
    asteroids: { name: 'Champ d’astéroïdes', base: '#170f0d', haze: ['#8b5428', '#5b3026', '#353944'], accent: '#ffc48a', stars: '#ffe0b7',
      planet: ['#a27a50', '#523b2d', '#1d1719'], landmark: 'belt',
      particles: { kind: 'debris', color: '#bb916d', count: 40, speed: 0.65, size: 5, opacity: 0.2 },
      obstacle: { kind: 'rock', colors: ['#b69370', '#6a5141', '#302724'], rim: '#ffe0b7' }, music: { ambient: 0.68, pulse: 0.48, filter: 3000 } },
    ice: { name: 'Planète glacée', base: '#0a1c2b', haze: ['#2e6b89', '#305370', '#397f8c'], accent: '#b3f5ff', stars: '#e0fbff',
      planet: ['#b9e8f1', '#47839f', '#142c43'], landmark: 'ice',
      particles: { kind: 'snow', color: '#d3faff', count: 58, speed: 0.45, size: 2.5, opacity: 0.4 },
      obstacle: { kind: 'crystal', colors: ['#b8edfa', '#5798ba', '#214962'], rim: '#e2fbff' }, music: { ambient: 0.9, pulse: 0.28, filter: 1200 } },
    volcano: { name: 'Zone volcanique', base: '#1b090f', haze: ['#8f281e', '#6c172e', '#7a481f'], accent: '#ffb16d', stars: '#ffcab7',
      planet: ['#ba4e34', '#591d27', '#220e20'], landmark: 'volcano',
      particles: { kind: 'embers', color: '#ff9d54', count: 52, speed: 0.9, size: 2.5, opacity: 0.45 },
      obstacle: { kind: 'slag', colors: ['#69535a', '#372633', '#1c1724'], rim: '#ffd394' }, music: { ambient: 0.65, pulse: 0.7, filter: 3800 } },
    base: { name: 'Base ennemie', base: '#100c16', haze: ['#522739', '#3c202b', '#233548'], accent: '#ffa0a3', stars: '#d9d9ec',
      planet: ['#785b69', '#342533', '#17131e'], landmark: 'base',
      particles: { kind: 'sparks', color: '#ff686d', count: 36, speed: 1.1, size: 2.5, opacity: 0.3 },
      obstacle: { kind: 'metal', colors: ['#80899a', '#465064', '#202937'], rim: '#e8efff' }, music: { ambient: 0.6, pulse: 0.82, filter: 5000 } },
    emerald: { name: 'Voile d’émeraude', base: '#071d20', haze: ['#216a5e', '#24666e', '#363b76'], accent: '#9ef3cf', stars: '#c9ffec',
      planet: ['#90c6c5', '#346766', '#112b32'], landmark: 'nebula',
      particles: { kind: 'motes', color: '#9fffd2', count: 44, speed: 0.5, size: 2, opacity: 0.3 },
      obstacle: { kind: 'crystal', colors: ['#a4d4c8', '#548e8c', '#25484e'], rim: '#d3fff2' }, music: { ambient: 0.9, pulse: 0.38, filter: 1800 } },
    derelict: { name: 'Chantier abandonné', base: '#141325', haze: ['#48496a', '#5f3f5e', '#2e4e61'], accent: '#c1b7ff', stars: '#dfd9f5',
      planet: ['#8a819a', '#413e57', '#1a192b'], landmark: 'base',
      particles: { kind: 'debris', color: '#a99ebb', count: 30, speed: 0.6, size: 4, opacity: 0.25 },
      obstacle: { kind: 'metal', colors: ['#9290a8', '#535268', '#282b41'], rim: '#e9dfff' }, music: { ambient: 0.75, pulse: 0.58, filter: 2700 } }
  }
});

function themeForLevel(level, definition = {}, config = THEME_CONFIG) {
  const id = definition.theme || (level <= config.order.length ? config.order[level - 1] :
    config.variants[(level - config.order.length - 1) % config.variants.length]);
  return config.themes[id] ? id : config.order[0];
}

class ThemeTransition {
  constructor(config = THEME_CONFIG, id = config.order[0]) {
    this.config = config; this.duration = Math.max(1, config.transitionFrames);
    this.targetId = id; this.elapsed = this.duration; this.from = [{ id, weight: 1 }];
  }
  get target() { return this.config.themes[this.targetId]; }
  get progress() { return Math.min(1, this.elapsed / this.duration); }
  layers() {
    const p = this.progress, mix = p * p * (3 - 2 * p);
    const weights = new Map(this.from.map(layer => [layer.id, layer.weight * (1 - mix)]));
    weights.set(this.targetId, (weights.get(this.targetId) || 0) + mix);
    return Array.from(weights, ([id, weight]) => ({ id, theme: this.config.themes[id], weight })).filter(layer => layer.weight > 1e-8);
  }
  select(id) {
    if (!this.config.themes[id] || id === this.targetId) return;
    // Capturer le mélange visible en cas de second palier pendant le fondu.
    this.from = this.layers().map(({ id, weight }) => ({ id, weight }));
    this.targetId = id; this.elapsed = 0;
  }
  step() {
    if (this.elapsed < this.duration) this.elapsed++;
    if (this.elapsed === this.duration) this.from = [{ id: this.targetId, weight: 1 }];
  }
}
