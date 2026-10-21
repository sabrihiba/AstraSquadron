const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function harness() {
  class Param {
    constructor() { this.value = 0; }
    setTargetAtTime(value) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
  }
  class Node {
    constructor() { this.gain = new Param(); this.connections = []; }
    connect(node) { this.connections.push(node); }
    disconnect() { this.connections = []; }
  }
  class Source extends Node {
    start(time, offset) { this.started = true; this.offset = offset; }
    stop() { this.stopped = true; }
  }
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = new Node(); }
    async resume() { this.state = 'running'; }
    createGain() { return new Node(); }
    createBiquadFilter() { const node = new Node(); node.frequency = new Param(); return node; }
    createDynamicsCompressor() {
      const node = new Node();
      for (const name of ['threshold', 'ratio', 'attack', 'release']) node[name] = new Param();
      return node;
    }
    createAnalyser() { return new Node(); }
    createBufferSource() { return new Source(); }
    async decodeAudioData() { return { duration: 16 }; }
    async close() { this.state = 'closed'; }
  }
  const context = vm.createContext({ console, Uint8Array, Map, Set, Math, Number, Promise,
    window: { AudioContext: Context }, atob: s => Buffer.from(s, 'base64').toString('binary'),
    GAME_CONFIG: { audio: { music: 0.38, effects: 0.55, maxVoices: 10 } },
    AUDIO_DATA: Object.fromEntries(['orion-ambient', 'orion-pulse', 'friendly-shot', 'impact', 'level', 'defeat'].map(name => [name, 'AAAA'])) });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/audio.js'), 'utf8'), context);
  return vm.runInContext('new GameAudio()', context);
}
test('audio : pas de contexte avant interaction, décodage unique et lecture après déverrouillage', async () => {
  const sound = harness(); assert.equal(sound.context, null); sound.setPlaying(true); assert.equal(sound.playing, false);
  await sound.unlock(); const context = sound.context; assert.equal(sound.buffers.size, 6);
  await sound.unlock(); assert.equal(sound.context, context);
  sound.setPlaying(true); assert.equal(sound.musicSources.length, 2);
  const original = sound.musicSources[0]; sound.setPlaying(true); assert.equal(sound.musicSources[0], original);
});
test('audio : bus indépendants, valeurs bornées, mute master et intensité par niveau', async () => {
  const sound = harness(); await sound.unlock(); sound.setVolume('music', 0.2);
  assert.equal(sound.musicGain.gain.value, 0.2); assert.equal(sound.effectsGain.gain.value, 0.55);
  sound.setVolume('effects', 0.7); assert.equal(sound.musicGain.gain.value, 0.2);
  sound.setVolume('music', 8); assert.equal(sound.musicVolume, 1);
  sound.setVolume('effects', NaN); assert.equal(sound.effectsVolume, 0);
  sound.setMuted(true); assert.equal(sound.master.gain.value, 0); assert.equal(sound.play('level'), false);
  sound.setMuted(false); assert.ok(sound.master.gain.value > 0);
  sound.setLevel(1); const low = sound.pulseGain.gain.value; sound.setLevel(6);
  assert.ok(sound.pulseGain.gain.value > low && sound.pulseGain.gain.value <= 0.85);
});
test('audio : limitation des tirs et des voix, arrêt/déconnexion en pause, reprise au même temps musical', async () => {
  const sound = harness(); await sound.unlock(); sound.setPlaying(true);
  for (let i = 0; i < 100; i++) sound.play('friendly-shot');
  assert.equal(sound.voices.size, 1);
  for (let i = 0; i < 30; i++) { sound.context.currentTime += 0.1; sound.play('impact'); }
  assert.equal(sound.voices.size, 10);
  const music = [...sound.musicSources], effects = [...sound.voices];
  sound.setPlaying(false);
  assert.equal(sound.voices.size, 0); assert.equal(sound.musicSources.length, 0);
  for (const source of [...music, ...effects]) { assert.ok(source.stopped); assert.equal(source.connections.length, 0); }
  sound.context.currentTime = 20; sound.setPlaying(true);
  assert.ok(Math.abs(sound.musicSources[0].offset - 3) < 1e-8);
  await sound.dispose(); assert.equal(sound.context.state, 'closed'); assert.equal(sound.buffers.size, 0);
});
test('audio : fondu thématique pondéré, filtre musical et volumes indépendants', async () => {
  const sound = harness(); await sound.unlock();
  const layers = [
    { weight: 0.75, theme: { music: { ambient: 0.8, pulse: 0.12, filter: 1500 } } },
    { weight: 0.25, theme: { music: { ambient: 0.6, pulse: 0.82, filter: 5000 } } }
  ];
  sound.setThemeMix(layers);
  assert.ok(Math.abs(sound.ambientGain.gain.value - 0.75) < 1e-9);
  assert.ok(Math.abs(sound.pulseGain.gain.value - 0.295) < 1e-9);
  assert.equal(sound.musicFilter.frequency.value, 2375);
  assert.equal(sound.musicGain.gain.value, 0.38); assert.equal(sound.effectsGain.gain.value, 0.55);
  sound.setLevel(6); assert.equal(sound.musicFilter.frequency.value, 2375);
  sound.setThemeMix([{ weight: 1, theme: layers[1].theme }]);
  assert.equal(sound.pulseGain.gain.value, 0.82); assert.equal(sound.musicFilter.frequency.value, 5000);
});
test('15 ressources WAV originales cohérentes avec la copie intégrée, PCM audible et sans écrêtage', () => {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'js/audio-data.js'), 'utf8'), ctx);
  const data = vm.runInContext('AUDIO_DATA', ctx); assert.equal(Object.keys(data).length, 15);
  for (const [name, encoded] of Object.entries(data)) {
    const bytes = fs.readFileSync(path.join(root, 'assets/audio', name + '.wav'));
    assert.deepEqual(Buffer.from(encoded, 'base64'), bytes);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.readUInt32LE(24), 22050);
    assert.equal(bytes.readUInt16LE(34), 16);
    let square = 0, peak = 0;
    for (let i = 44; i < bytes.length; i += 2) {
      const sample = bytes.readInt16LE(i) / 32768;
      square += sample ** 2; peak = Math.max(peak, Math.abs(sample));
    }
    assert.ok(Math.sqrt(square / ((bytes.length - 44) / 2)) > 0.01, name);
    assert.ok(peak <= 0.61, name);
  }
});
