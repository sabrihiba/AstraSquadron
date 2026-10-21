// Seule configuration de progression : seuils absolus, multiplicateurs bornés.
const GAME_CONFIG = Object.freeze({
  levels: Object.freeze([
    { score: 0, name: 'Espace profond', theme: 'deep', spawn: 1, speed: 1, health: 1, fire: 1, obstacles: 1 },
    { score: 600, name: 'Nébuleuse violette', theme: 'nebula', spawn: 1.12, speed: 1.08, health: 1.15, fire: 1.10, obstacles: 1.12 },
    { score: 1500, name: 'Champ d’astéroïdes', theme: 'asteroids', spawn: 1.26, speed: 1.16, health: 1.30, fire: 1.22, obstacles: 1.25 },
    { score: 3000, name: 'Planète glacée', theme: 'ice', spawn: 1.40, speed: 1.24, health: 1.50, fire: 1.35, obstacles: 1.40 },
    { score: 5200, name: 'Zone volcanique', theme: 'volcano', spawn: 1.55, speed: 1.32, health: 1.75, fire: 1.50, obstacles: 1.60 },
    { score: 8000, name: 'Base ennemie', theme: 'base', spawn: 1.70, speed: 1.42, health: 2, fire: 1.65, obstacles: 1.80 }
  ].map(Object.freeze)),
  maxEnemies: 16,
  minEnemyInterval: 60, // pas de 1/60 s
  minObstacleInterval: 120,
  heavy: Object.freeze({ fromLevel: 3, chance: 0.24, maxAlive: 2, hp: 140, score: 350,
    speedFactor: 0.65, warningFrames: 60, missileInterval: 270, missileSpeed: 4.2, missileDamage: 22 }),
  dodge: Object.freeze({ durationFrames: 36, cooldownFrames: 240, detectionRadius: 190,
    margin: 45, boundaryLookahead: 30 }),
  audio: Object.freeze({ music: 0.38, effects: 0.55, maxVoices: 10 })
});
