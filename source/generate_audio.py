"""Synthèse originale ASTRA, Python standard uniquement. Aucune source audio externe.
Recrée assets/audio/*.wav et js/audio-data.js (copie intégrée pour le lancement file://).
"""
from pathlib import Path
import base64
import io
import json
import math
import random
import struct
import wave

ROOT = Path(__file__).resolve().parent.parent
RATE = 22050
TAU = math.tau
audio = {}


def save(name, samples, peak=0.6):
    largest = max(abs(s) for s in samples) or 1
    gain = min(1, peak / largest)
    raw = struct.pack('<' + 'h' * len(samples), *(int(max(-1, min(1, s * gain)) * 32767) for s in samples))
    stream = io.BytesIO()
    with wave.open(stream, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(raw)
    data = stream.getvalue()
    (ROOT / 'assets/audio' / (name + '.wav')).write_bytes(data)
    audio[name] = base64.b64encode(data).decode('ascii')


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def music():
    duration = 16
    chords = [(48, 55, 63), (51, 58, 67), (46, 53, 62), (44, 51, 60), (43, 50, 58), (48, 55, 62)]
    ambient, pulse = [], []
    for i in range(RATE * duration):
        t = i / RATE
        chord_index = min(5, int(t / (duration / 6)))
        chord = chords[chord_index]
        local = t % (duration / 6)
        envelope = math.sin(math.pi * local / (duration / 6)) ** 0.7
        pad = sum(math.sin(TAU * note(n) * t + 0.12 * math.sin(t * 0.7)) +
                  0.38 * math.sin(TAU * note(n) * 1.003 * t) for n in chord) / 9
        ambient.append(pad * envelope * 0.75)
        beat = (t * 3) % 1
        pitch = note(chord[int(t * 3) % 3] + 12)
        arp = math.sin(TAU * pitch * t) * math.exp(-beat * 5) * min(1, beat * 60)
        bass = math.sin(TAU * note(chord[0] - 12) * t) * math.exp(-((t * 1.5) % 1) * 6)
        fade = min(1, t * 30, (duration - t) * 30)
        pulse.append((arp * 0.12 + bass * 0.15) * fade)
    # Écho diffus, circulaire pour conserver la continuité de la boucle.
    ambient = [s + ambient[(i - int(RATE * 0.375)) % len(ambient)] * 0.3 for i, s in enumerate(ambient)]
    fade_samples = int(RATE * 0.03)
    for i in range(fade_samples):
        ambient[i] *= i / fade_samples
        ambient[-1-i] *= i / fade_samples
    save('orion-ambient', ambient, 0.45)
    save('orion-pulse', pulse, 0.4)


def effect(name, length, frequencies, noise=0, sweep=0):
    rng = random.Random(174 + len(name))
    samples = []
    filtered_noise = 0
    for i in range(int(length * RATE)):
        t = i / RATE
        progress = t / length
        envelope = min(1, t * 200) * (1-progress) ** 2
        index = min(len(frequencies)-1, int(progress * len(frequencies)))
        freq = frequencies[index]
        tone = math.sin(TAU * (freq * t + sweep * t * t / 2))
        tone += math.sin(TAU * (freq * 1.5 * t + sweep * t * t / 2)) * 0.2
        filtered_noise = 0.72 * filtered_noise + 0.28 * rng.uniform(-1, 1)
        samples.append((tone * (1-noise) * 0.5 + filtered_noise * noise * 2) * envelope)
    save(name, samples)


(ROOT / 'assets/audio').mkdir(parents=True, exist_ok=True)
music()
effect('friendly-shot', 0.12, [1050], 0.1, -5800)
effect('enemy-shot', 0.16, [470], 0.18, -1800)
effect('missile', 0.55, [90], 0.85, 180)
effect('warning', 0.28, [660, 880], 0, 0)
effect('impact', 0.15, [150], 0.8, -300)
effect('explosion', 0.7, [65], 0.93, -50)
effect('bonus', 0.4, [523, 659, 784], 0, 0)
effect('heal', 0.6, [440, 554, 659, 880], 0, 0)
effect('recruit', 0.65, [330, 440, 660], 0, 0)
effect('protection', 0.45, [220, 440], 0.1, 180)
effect('dodge', 0.3, [720], 0.65, -1400)
effect('level', 0.8, [523, 659, 784, 1047], 0, 0)
effect('defeat', 1.2, [330, 261, 196, 130], 0.12, -40)
(ROOT / 'js/audio-data.js').write_text('// Généré par source/generate_audio.py : WAV originaux intégrés pour file://.\nconst AUDIO_DATA = ' + json.dumps(audio, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'{len(audio)} fichiers WAV et leur copie embarquée générés.')
