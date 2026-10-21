# ASTRA · Squadron

Jeu spatial à la souris, construit à partir des comportements du cours. Recrutez jusqu’à huit ailiers, esquivez les tirs et les astéroïdes, puis placez votre escadrille en protection pour chercher des soins.

## Lancer

**Ouvrir `index.html` dans un navigateur récent**, puis cliquer sur **Jouer · lancer la mission**. Tout est inclus : aucune installation, connexion Internet ou compilation nécessaire. Vous pouvez copier ce dossier seul dans un nouveau dépôt, ou publier son contenu sur GitHub Pages.

Option serveur local, avec Node.js 22 ou ultérieur :

```powershell
node server.cjs
```

Ouvrir <http://127.0.0.1:8080>. La variable `PORT` permet de choisir un autre port. Arrêter le serveur avec Ctrl+C.

## Jouer

| Commande | Action |
| --- | --- |
| Souris sans clic maintenu | Destination du leader, suivie progressivement avec Arrive |
| Clic gauche maintenu | Viser et tirer à 360° vers le curseur ; suivi suspendu |
| Relâcher le clic gauche | Arrêter le tir et reprendre le déplacement vers la souris |
| H | Les ailiers passent devant le leader |
| I | Retour en formation Delta derrière le leader |
| S | Fuite temporaire : 0,6 seconde, puis recharge de 4 secondes |
| Bouton ♫ | Couper ou rétablir tout le son |
| D | Cibles, rayons et vecteurs de diagnostic |
| Échap / bouton Ⅱ | Pause ou reprise |
| Aide / Réglages | Ouvrir ou fermer les panneaux |

Les balises **bleues ✧** recrutent un ailier ; les diamants **verts +** rendent 32 points de vie, avec un maximum de 100. Les ailiers tirent automatiquement sur les ennemis à portée. Les tirs ennemis sont corail, les tirs amis cyan. Les ailiers peuvent être détruits et interceptent les projectiles ennemis avec leur coque. H sans ailier affiche une indication. Après une défaite, **Nouvelle mission** remet la scène à zéro. Une perte de focus met automatiquement en pause.

La zone de destination conserve une marge pour que les formations restent visibles. Le décor défile ; le leader peut rester immobile lorsque sa cible est atteinte. L’évitement est réactif et ne garantit pas un passage sans collision dans un amas d’obstacles.

Pendant la visée, le leader freine progressivement avec l’Arrive existant vers sa propre position. Il conserve l’évitement d’obstacles, la sécurité de bord et l’esquive S : il peut donc encore bouger pour ces raisons. Le réticule montre le point visé et le canon s’oriente indépendamment de la coque. Chaque projectile part sur la droite entre le centre actuel de l’avion et le curseur au moment du tir ; sa direction reste ensuite fixe. Le curseur peut viser toute la scène, y compris hors de la marge réservée au déplacement. Exactement sur l’avion, la dernière direction valide est conservée (vers le haut avant la première visée). Les ailiers ciblent les ennemis à portée dans toutes les directions. Le tir au clavier T est remplacé par le clic maintenu.

## Niveaux, missiles et esquive

Le HUD affiche le niveau, le score, le prochain seuil et la disponibilité de S. Les seuils absolus sont **600 / 1 500 / 3 000 / 5 200 / 8 000 points** ; le dernier palier reste plafonné. Une annonce animée et une courte sonnerie accompagnent chaque montée sans suspendre le vol.

La fréquence des ennemis et des astéroïdes, la vitesse, les PV des nouveaux ennemis et la cadence ennemie augmentent par palier. Au maximum : 16 ennemis dont 2 grands avions. Les réglages de vol servent de valeurs de base, auxquelles les niveaux appliquent des multiplicateurs bornés.

Dès le **niveau 3**, des avions lourds orange à larges ailes apparaissent. Un repère orange annonce durant **1 seconde** le point visé par leur missile. Le missile suit ensuite cette direction fixe : sortez de la ligne annoncée. Les ailiers peuvent l’intercepter avec leur coque. Un grand ennemi rapporte 350 points ; sa base de 140 PV est multipliée par la résistance du niveau.

**S** réutilise directement `Vehicle.flee()` face au tir ou missile proche qui se rapproche de vous. Sans danger pertinent, aucune fuite ni recharge consommée. L’action ne téléporte pas, ne donne aucune invulnérabilité et conserve le radar dans les deux formations. Après 0,6 seconde, l’arrivée vers la souris reprend avec la vitesse restante ; la recharge dure ensuite 4 secondes. Une menace détruite coupe la fuite sans annuler la recharge. Les bords privilégient une arrivée vers l’intérieur : S peut donc être moins efficace près des limites.

**Configuration :** [js/config.js](js/config.js) centralise les seuils, les cinq multiplicateurs, le niveau d’arrivée des grands avions, leur fréquence, les missiles, l’avertissement, ainsi que la durée, la recharge et la perception de S. Les durées sont en pas de 1/60 seconde. Aucun `vehicle.js` n’a été modifié pour ces ajouts.

## Ambiances par niveau

| Niveau | Seuil | Ambiance |
| --- | --- | --- |
| 1 | 0 | Espace profond : nuit bleue, étoiles et cyan |
| 2 | 600 | Nébuleuse violette : nuages roses et poussières lumineuses |
| 3 | 1 500 | Champ d’astéroïdes : tons orangés, ceinture de roches et petits débris |
| 4 | 3 000 | Planète glacée : planète bleue, cristaux et neige spatiale |
| 5 | 5 200 | Zone volcanique : planète rouge, lave et braises |
| 6 | 8 000 | Base ennemie : station métallique et signaux rouges |

Le décor, les particules, les obstacles existants et le mix musical changent par un **fondu de trois secondes**, sans réinitialiser le vol. La pause fige aussi ce fondu. Les petits éléments de fond sont purement décoratifs ; seuls les gros obstacles aux contours lumineux provoquent des collisions. Les couleurs des tirs, des avions et des bonus restent stables pour faciliter leur identification.

[js/themes.js](js/themes.js) centralise les palettes, formes d’obstacles, particules, durées et ambiances musicales. Le champ `theme` dans `js/config.js` associe une ambiance à chaque niveau. Deux variantes supplémentaires, **Voile d’émeraude** et **Chantier abandonné**, sont prêtes pour les niveaux ajoutés ; la liste `variants` choisit l’ambiance d’un niveau supplémentaire sans clé explicite. Cela n’ajoute pas de niveaux et ne change pas les seuils existants.

## Musique et effets

L’audio démarre après le clic sur Jouer. Une boucle originale de 16 secondes et une couche rythmique synchronisée sont mixées selon le thème : gains et filtre musical évoluent avec le fondu visuel. Les deux pistes originales sont conservées, sans téléchargement de nouveaux sons. Tirs, avertissement, missiles, impacts, explosions, bonus, soins, recrutement, protection, esquive, niveau et défaite possèdent leurs effets.

Dans **Réglages**, les volumes **Musique** et **Effets** sont indépendants. Le bouton **♫** coupe le mix entier. La pause arrête et déconnecte les sources, puis la musique reprend au même endroit. Les tirs sont regroupés au niveau sonore ; le nombre de voix est limité et un compresseur protège le mix.

Les **15 fichiers WAV originaux** sont inclus dans `assets/audio/`, sous CC0-1.0, avec leur licence. Leur copie intégrée dans `js/audio-data.js` permet le double-clic sur `index.html` sans requête audio `file://`. Pour les recréer avec Python standard :

```powershell
python source/generate_audio.py
```

## Vérification

Depuis ce dossier :

```powershell
node --test tests/*.test.cjs
node tests/browser.cjs
```

La première commande exécute 43 tests déterministes, sans paquet à installer. La seconde lance Chrome sans fenêtre avec le vrai p5.js, teste les interactions et enregistre treize captures dans `tests/screenshots/`, dont les six ambiances et un fondu intermédiaire. Par défaut, Chrome est recherché à `C:/Program Files/Google/Chrome/Application/chrome.exe` ; définir `CHROME_PATH` pour un autre chemin. Le profil temporaire du navigateur est isolé du profil personnel. Les tests navigateur utilisent le port de diagnostic local 9337.

Les scripts npm équivalents sont `npm test`, `npm start` et `npm run test:browser`. Si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` ou les commandes Node ci-dessus.

Validation effectuée : 43 tests unitaires réussis et parcours Chrome réussi (fichier local et serveur, pilotage, visée à 360°, suivi suspendu/repris au clic, bonus, H/I/S, niveaux, six thèmes distincts, continuité du fondu, conservation du monde, missiles, réglages, pause, défaite, redémarrage et mise en page mobile). Le signal audio est mesuré : musique, effets seuls, volumes nuls, mute et pause/reprise ; le mix thématique et le filtre sont contrôlés. Le jeu est conçu en priorité pour souris et clavier sur ordinateur.

## Sources

Voir [specifications.md](specifications.md) pour la correspondance des comportements, les adaptations et l’architecture ; [ATTRIBUTION.md](ATTRIBUTION.md) pour les crédits.
Les dessins des avions, astéroïdes, bonus, effets et du décor sont procéduraux ; aucune ressource de ZType n’est utilisée.
