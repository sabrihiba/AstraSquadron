class GameAudio {
  constructor(config = GAME_CONFIG.audio) {
    this.musicVolume = config.music; this.effectsVolume = config.effects;
    this.maxVoices = config.maxVoices;
    this.muted = false; this.playing = false; this.context = null;
    this.buffers = new Map(); this.voices = new Set(); this.musicSources = [];
    this.lastPlayed = new Map(); this.offset = 0; this.level = 1;
    this.loading = null; this.error = ''; this.disposed = false;
  }
  async unlock() {
    if (this.disposed) return false;
    try {
      if (!this.context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) { this.error = 'Audio indisponible dans ce navigateur.'; return false; }
        this.context = new Audio();
        const c = this.context;
        this.musicGain = c.createGain(); this.effectsGain = c.createGain();
        this.musicFilter = c.createBiquadFilter(); this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 1500;
        this.ambientGain = c.createGain(); this.pulseGain = c.createGain();
        this.master = c.createGain(); this.compressor = c.createDynamicsCompressor();
        this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024;
        this.compressor.threshold.value = -16; this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.003; this.compressor.release.value = 0.2;
        this.ambientGain.connect(this.musicGain); this.pulseGain.connect(this.musicGain);
        this.musicGain.connect(this.musicFilter); this.musicFilter.connect(this.compressor); this.effectsGain.connect(this.compressor);
        this.compressor.connect(this.master); this.master.connect(this.analyser); this.analyser.connect(c.destination);
        this.applyVolumes();
      }
      // resume() est appelé dans la pile de l'interaction avant tout décodage asynchrone.
      await this.context.resume();
      if (!this.loading) this.loading = Promise.all(Object.entries(AUDIO_DATA).map(async ([name, data]) => {
        const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
        this.buffers.set(name, await this.context.decodeAudioData(bytes.buffer));
      }));
      await this.loading;
      return !this.disposed;
    } catch (error) {
      this.error = 'Le son n’a pas pu démarrer. Utilisez le bouton Son pour réessayer.';
      console.warn(this.error, error);
      return false;
    }
  }
  applyVolumes() {
    if (!this.context) return;
    const time = this.context.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicVolume, time, 0.03);
    this.effectsGain.gain.setTargetAtTime(this.effectsVolume, time, 0.03);
    // Coupure immédiate de tout le mix, y compris une longue explosion.
    this.master.gain.cancelScheduledValues(time);
    this.master.gain.setValueAtTime(this.muted ? 0 : 0.8, time);
  }
  setVolume(bus, value) {
    const volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (bus === 'music') this.musicVolume = volume;
    if (bus === 'effects') this.effectsVolume = volume;
    this.applyVolumes();
  }
  setMuted(muted) { this.muted = !!muted; this.applyVolumes(); }
  setLevel(level) {
    this.level = level;
    if (this.hasThemeMix) return;
    if (this.context) {
      if (this.appliedLevel === level) return;
      this.appliedLevel = level;
      this.ambientGain.gain.setTargetAtTime(0.8, this.context.currentTime, 0.3);
      this.pulseGain.gain.setTargetAtTime(Math.min(0.85, 0.12 + (level - 1) * 0.14), this.context.currentTime, 0.5);
    }
  }
  setThemeMix(layers) {
    const total = layers.reduce((sum, layer) => sum + layer.weight, 0);
    if (total <= 0) return;
    const mix = { ambient: 0, pulse: 0, filter: 0 };
    for (const { theme, weight } of layers) for (const key of Object.keys(mix)) mix[key] += theme.music[key] * weight / total;
    this.themeMusic = mix; this.hasThemeMix = true;
    if (!this.context) return;
    const key = Object.values(mix).map(value => value.toFixed(4)).join('/');
    if (key === this.appliedThemeKey) return;
    this.appliedThemeKey = key;
    // Même mélange que le décor, lissé sur 80 ms pour éviter les ruptures audio.
    this.ambientGain.gain.setTargetAtTime(mix.ambient, this.context.currentTime, 0.08);
    this.pulseGain.gain.setTargetAtTime(mix.pulse, this.context.currentTime, 0.08);
    this.musicFilter.frequency.setTargetAtTime(mix.filter, this.context.currentTime, 0.08);
  }
  setPlaying(playing) {
    playing = !!playing && this.buffers.has('orion-ambient') && !this.disposed;
    if (playing === this.playing) return;
    this.playing = playing;
    if (!playing) {
      this.offset += this.context.currentTime - this.startedAt;
      for (const source of this.musicSources) { source.stop(); source.disconnect(); }
      this.musicSources = [];
      this.stopEffects();
      return;
    }
    this.startedAt = this.context.currentTime;
    for (const [name, gain] of [['orion-ambient', this.ambientGain], ['orion-pulse', this.pulseGain]]) {
      const source = this.context.createBufferSource();
      source.buffer = this.buffers.get(name); source.loop = true;
      source.connect(gain); source.start(0, this.offset % source.buffer.duration);
      this.musicSources.push(source);
    }
    this.setLevel(this.level);
  }
  play(name) {
    if (!this.context || this.context.state !== 'running' || this.muted || this.effectsVolume === 0 || this.disposed) return false;
    const buffer = this.buffers.get(name), now = this.context.currentTime;
    const interval = name.includes('shot') ? 0.085 : name === 'impact' ? 0.07 : 0.04;
    if (!buffer || this.voices.size >= this.maxVoices || now - (this.lastPlayed.get(name) ?? -Infinity) < interval) return false;
    this.lastPlayed.set(name, now);
    const source = this.context.createBufferSource(); source.buffer = buffer;
    source.connect(this.effectsGain); this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); };
    source.start(); return true;
  }
  stopEffects() {
    for (const source of this.voices) { source.stop(); source.disconnect(); }
    this.voices.clear();
  }
  reset() {
    this.setPlaying(false); this.stopEffects(); this.offset = 0; this.lastPlayed.clear();
    this.hasThemeMix = false; this.appliedThemeKey = null; this.appliedLevel = null; this.setLevel(1);
  }
  async dispose() {
    this.reset(); this.disposed = true;
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.buffers.clear();
  }
}
