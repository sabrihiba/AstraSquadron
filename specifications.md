# Spécifications — ASTRA Squadron

## Concept et règles

Un jeu spatial en vue de dessus, avec progression suggérée par les étoiles en parallaxe. Le joueur guide un leader avec la souris sans clic ; le clic gauche maintenu suspend le suivi pour viser et tirer à 360° vers le curseur. Le relâchement reprend le déplacement normal et arrête les tirs. Les ennemis légers apparaissent en haut, cherchent le leader et tirent vers sa position observée au lancement. Leur intervalle diminue par niveau, selon le score, avec une densité et une fréquence plafonnées. Les projectiles et missiles ne sont pas à tête chercheuse.

Le leader commence avec 100 PV. Un ennemi léger possède 35 PV au niveau 1, puis reçoit le multiplicateur de résistance de son niveau d’apparition ; un ailier possède 55 PV. Les projectiles amis infligent 18 dégâts, les tirs ennemis 12, les missiles lourds 22 ; les astéroïdes infligent 16 dégâts au contact et les collisions avec un ennemi 22. Une courte invulnérabilité après impact évite une perte de vie à chaque pas. L’esquive S n’en ajoute aucune. Les tirs sont consommés au contact, même pendant cette invulnérabilité. Les astéroïdes absorbent les tirs.

Un ennemi détruit par tir rapporte 100 points. Chaque collecte rapporte 50 points. Une balise bleue recrute un ailier, jusqu’à huit ; une balise collectée avec une escadrille complète rapporte 150 points supplémentaires. Un diamant vert restaure 32 PV sans dépasser 100. Les bonus réguliers arrivent toutes les sept secondes ; un premier recrutement apparaît tôt au centre pour faciliter la découverte. Les soins sont favorisés lorsque la vie est basse.

Les ennemis, bonus et astéroïdes sont supprimés après sortie de l’écran ; les projectiles expirent ou sont supprimés hors champ. Le leader détruit termine la mission. Le redémarrage nettoie les entités, le score, les temporisations et les entrées, en conservant les paramètres choisis. Aucun envoi de données ni stockage externe.

## Commandes et interface

| Entrée | Fonction |
| --- | --- |
| Souris sans clic | Définir la destination du leader dans la zone de vol |
| Clic gauche maintenu | Viser et tirer à 360° à cadence limitée, suivi suspendu |
| Relâcher le clic gauche | Arrêter le tir et reprendre l’arrivée vers la souris |
| H | Protection mobile devant le leader |
| I | Formation Delta derrière le leader |
| S | Fuite temporaire face à un projectile proche qui se rapproche |
| Bouton ♫ | Couper ou rétablir le mix audio complet |
| D | Activer/désactiver le debug, synchronisé avec la case des réglages |
| Échap / bouton Pause | Geler/reprendre la simulation |
| Boutons Aide et Réglages | Afficher/masquer les panneaux |

Le HUD affiche vie, score, niveau, prochain seuil, disponibilité de S, nombre d’ailiers et formation. Le mode protection ajoute une arche violette autour du leader. Un message confirme chaque transition et indique l’absence d’ailiers. La perte de focus ou le masquage de l’onglet met en pause et relâche le tir. La reprise est explicite.

La destination de déplacement est bornée à x ∈ [115,1165], y ∈ [190,635] dans un monde de 1280 × 800, afin de réserver de la place aux formations et au HUD. La visée utilise séparément les coordonnées du curseur dans toute la scène, x ∈ [0,1280], y ∈ [0,800]. Ce sont des cibles qui sont bornées ; le leader n’est pas téléporté. Le canvas est mis à l’échelle dans l’espace disponible et les coordonnées du pointeur sont converties dans son repère. Le jeu conserve le même monde après un redimensionnement.

### Visée et combat à 360°

`Game.setPointer()` actualise deux vecteurs distincts : la destination bornée du vol et `aimPointer`, position du curseur dans la scène. `beginAim()` active visée et tir uniquement pendant une partie ; `endAim()` les désactive au relâchement, à l’annulation du pointeur, à la perte de capture, en pause, à la perte de focus et à la défaite. Le redémarrage remet les entrées à zéro. L’ancienne commande T est retirée.

Pendant la visée, la cible de locomotion devient la position actuelle du leader. L’Arrive hérité fournit donc un freinage de sa vitesse résiduelle, sans attraction vers l’ennemi visé ni retour forcé à une ancienne position. Le radar, la sécurité de bord et S conservent leurs calculs et leurs priorités. La reprise au relâchement utilise la position actuelle et l’Arrive vers la dernière destination de souris, sans téléportation.

`Spacecraft.aimAt()` conserve un vecteur de canon normalisé, indépendant de la vitesse et de la rotation de la coque. Une cible confondue avec l’avion conserve le dernier vecteur valide ; l’orientation initiale est vers le haut pour le leader et les ailiers. Ce calcul relève du combat et ne retourne aucune force de déplacement. Il actualise le canon même entre deux tirs.

Pour chaque `Projectile`, la direction est calculée **depuis le centre actuel de l’avion vers le curseur ou l’ennemi**, puis sa position initiale est décalée de `ship.r + 10` sur cette droite jusqu’à la bouche du canon. Un point fixe situé à 4 000 px dans le même sens sert au Seek hérité. Cela permet les tirs vers le bas, les côtés et les diagonales, y compris si le curseur est plus près que la bouche du canon. Les vecteurs de la cible et de la vitesse de l’avion ne sont pas modifiés. Un changement de visée agit seulement sur les prochains tirs.

Les ailiers recherchent l’ennemi vivant le plus proche à moins de 650 px **sans filtre d’angle ou de hauteur**. Ils orientent leur canon et tirent indépendamment de leur mouvement de formation. Le réticule est discret en pilotage, agrandi et annoté « VISÉE 360° » en tir ; le HUD indique que le suivi est suspendu. Les missiles héritent de la même construction rectiligne, en conservant le point annoncé avant leur lancement.

## Inventaire vérifié du projet fourni

Les numéros correspondent aux dossiers réellement inspectés, pas à un catalogue supposé.

| Numéro | Dossiers / fichiers observés | Rôle dans ASTRA |
| --- | --- | --- |
| 1 | `1-Seek/vehicle.js` : recherche d’une cible, avec variantes ajoutées localement | Principe Seek utilisé via sa version présente dans la base originale du n°3 |
| 2 | `2-PursueEvade/vehicle.js`, version `_correction` : poursuite et évitement d’une cible mobile | Non utilisé ; les ennemis utilisent Seek vers la position courante, sans prédiction |
| 3 | `3-Arrival/vehicle.js`, `3-Arrival_correction/vehicle.js` : Seek avec freinage d’arrivée | Base historique originale sélectionnée pour tous les véhicules |
| 4 | `4-Wander/vehicle.js` : cible sur cercle et perturbation angulaire persistante | Non utilisé ; aucun déplacement aléatoire inventé |
| 5 | `5-1-ScalarProjection`, `5-2-PathFollowing/vehicle.js`, `5-3-PathFollowingComplex/vehicle.js` : projection, suivi de segment/chemin et composition | Non utilisé ; aucune route fixe nécessaire |
| 6 | `6-ObstacleAvoidance/vehicle.js`, aperçu local, et pièce jointe explicitement fournie | Variante multi-rayons de la pièce jointe utilisée pour le leader et les ailiers |
| 7 | `7-Boids/boids.js` : alignement, séparation, cohésion, autres méthodes | Non utilisé ; l’espacement vient de cibles de formation distinctes |
| 8 | `8-EvolutionarySteeringBehavior/vehicle.js` : steering évolutif, nourriture/poison, ADN | Non utilisé |
| 9 | `9-VoitureSuitCircuit genetic algo/vehicle.js` : capteurs Ray, réseau de neurones, checkpoints, évolution ; variante `9b` présente | Non utilisé |
| 10 | `10-missiles genetic algo/rocket.js`, `sketch.js` : générations de fusées, ADN de forces et sélection | Non utilisé ; ce n’est pas une implémentation nécessaire au tir rectiligne du jeu |

La base a été extraite du commit `9104084` (« ajout exercices 5-7 », auteur Git `micbuffa`), depuis `3-Arrival_correction/vehicle.js`, et copiée intégralement dans `source/vehicle.js`. Lors de cet ajout, la vérification confirme qu’elle contient déjà `flee()` sous la forme vitesse désirée opposée à la menace, moins vitesse courante, limitée à `maxForce`. S réutilise directement cette méthode. Les bases pédagogiques et la copie autonome restent intactes ; les empreintes existantes sont conservées.

## Correspondance des situations avec les comportements

| Situation | Comportement et numéro | Source locale autonome | Appel effectif |
| --- | --- | --- | --- |
| Leader vers la souris | Arrive, n°3 | `source/vehicle.js`, provenance `3-Arrival_correction/vehicle.js@9104084` | `Spacecraft.steer()` → `super.arrive(destination)` |
| Ailier vers sa place Delta | Arrive, n°3 | Même source | `Ally` hérite de `Spacecraft`, qui appelle Arrive |
| Passage devant / retour derrière | Arrive, n°3 | Même source | `Game.formationTarget()` choisit les coordonnées ; le même steering suit la cible |
| Ennemi vers le leader | Seek, n°1, version incluse dans le n°3 | `source/vehicle.js`, méthode `seek()` | `Spacecraft.steer(..., false)` → `super.seek(destination)` |
| Obstacles devant leader / ailiers | Avoidance multi-rayons, n°6 modifié par l’utilisateur | `js/radar.js` + archive `source/preview-comportement-6.html` | `Spacecraft.steer()` → `calculateMultiRayAvoidance()` |
| Esquive S | Flee, famille du n°2, version incluse dans la base n°3 | `source/vehicle.js`, méthode `flee()` | `Leader.trackingForce()` → `super.flee(threat.pos)` |
| Station des grands ennemis | Arrive, n°3 | `source/vehicle.js` | `HeavyEnemy` hérite de `Spacecraft.steer()` vers sa station |
| Missile lourd rectiligne | Seek, n°1, fourni dans le n°3 | `source/vehicle.js` | `Missile extends Projectile`, `step()` hérité, cible fixe |
| Retour intérieur près des bords | Arrive, n°3 | `source/vehicle.js` | `Leader.flightSafety()` choisit un point intérieur |
| Tir rectiligne | Seek, n°1, méthode fournie dans le n°3 | `source/vehicle.js` | `Projectile.step()` → `super.seek(target)` ; cible fixée loin sur la ligne de tir |
| Défilement astéroïdes / bonus | Seek, n°1, méthode fournie dans le n°3 | `source/vehicle.js` | `Obstacle.step()` / `Bonus.step()` → `super.seek(target)` vers le bas, hors champ |

Il n’y a ni flocking ajouté, ni algorithme de formation autonome, ni suivi de chemin créé pour le jeu. La formation est une sélection de cibles : rangées espacées de 49 px, décalages latéraux de 46 px par rang en Delta. En protection, première rangée 65 px devant le leader, puis 43 px entre rangées, décalages latéraux de 49 px par rang. Ces positions sont recalculées par rapport au leader actuel. Les identités et positions des ailiers sont conservées lors de H/I. Leur déplacement vers la nouvelle cible passe toujours par Arrive.

## Identification et intégration du comportement 6

La référence retenue est **le second fichier joint dans cette conversation**, identifiant `4209b19f-8ac8-4e20-bc71-ea602ba4c247`, intitulé **Obstacle Avoidance — Radar multi-rayons**. L’aperçu du dossier du cours n’est pas utilisé comme substitut. Une copie complète de la pièce jointe est conservée dans `source/preview-comportement-6.html`.

La fonction `calculateMultiRayAvoidance` et ses aides mathématiques ont été extraites sans modification dans `js/radar.js`. Les tests comparent textuellement cette fonction à l’archive. Ses règles restent celles du fichier fourni :

- éventail de 120°, orienté selon la vitesse ;
- 1 à 31 rayons au niveau du calcul, 1 à 15 dans l’interface ;
- longueur = vitesse × anticipation ;
- trois échantillons : position, ahead2 à mi-distance, ahead ;
- sélection de l’obstacle/échantillon ayant la distance minimale pour chaque rayon ;
- menace si distance strictement inférieure à rayon d’obstacle + marge ;
- force par rayon = direction d’éloignement normalisée × `maxForce / 2`, avec secours perpendiculaire en cas de superposition ;
- moyenne sur **tous** les rayons, y compris ceux dont la force est nulle ;
- vitesse nulle : force nulle et aucun rayon.

L’adaptation au jeu se fait **autour** du calcul : `Spacecraft` fournit ses vecteurs compatibles `{x,y}`, les obstacles `{pos,r}`, et une marge égale au rayon physique du vaisseau + marge réglable. Le résultat est converti en `p5.Vector`. En présence d’une menace, la force d’arrivée est pondérée à 0,2, comme dans l’aperçu ; sinon elle conserve son poids 1 pour un pilotage plus réactif. La moyenne d’évitement reçoit un poids réglable, 5 par défaut. La somme finale est limitée à `maxForce`, appliquée avec `applyForce()`, puis intégrée une seule fois par `super.update()`.

Cette version teste trois points discrets et peut manquer un obstacle entre ces points. Les forces de rayons peuvent s’annuler ; le choix de l’obstacle le plus proche n’est pas nécessairement celui dont le rayon est le plus grand. Ces propriétés sont conservées pour rester fidèle à la pièce jointe. Il n’y a pas de correction de position pour simuler un contournement. Les collisions restent des règles de jeu distinctes. Le défilement lent des astéroïdes et une zone de manœuvre large facilitent l’évitement réactif sans prétendre le rendre infaillible.

## Architecture et responsabilités

```text
Vehicle                          source/vehicle.js, original protégé
├── Spacecraft                   js/spacecraft.js : composition Arrive/Seek + radar, santé
│   ├── Leader                   js/leader.js : soins, fuite S, temporisations et sécurité de bord
│   ├── Ally                     js/ally.js : rôle d’ailier
│   └── Enemy                    js/enemy.js : ennemi léger, paramètres de niveau
│       └── HeavyEnemy           js/heavy-enemy.js : station et avertissement missile
├── Projectile                   js/projectile.js : cible de tir, Seek, durée de vie
│   └── Missile                  js/missile.js : vitesse et dégâts propres
├── Obstacle                     js/obstacle.js : rayon, défilement avec Seek
└── Bonus                        js/bonus.js : type et défilement avec Seek

Game                             js/game.js : règles, apparitions, cibles de formation,
                                 collisions, score, transitions, réinitialisation
Renderer                         js/renderer.js : canvas, décor, effets, debug
GameAudio                        js/audio.js : bus, sources, pause et mix
GAME_CONFIG                      js/config.js : niveaux, grands ennemis, S, audio
THEME_CONFIG / ThemeTransition   js/themes.js : ambiances et fondu en temps simulé
ThemeScenery                    js/theme-scenery.js : fonds en cache et particules décoratives
setup / draw                     js/sketch.js : entrées, UI, boucle temporelle
```

Le chargement suit p5 → base → configuration → calcul radar → sous-classes → jeu → rendu → données audio et service → initialisation. L’audio utilise Web Audio natif, sans bibliothèque supplémentaire ni moteur physique. Le fond est mis en cache et les étoiles défilent en fonction du temps simulé. Les explosions sont des effets décoratifs bornés à 65 et 30 pas de durée, sans entités de gameplay. Le radar n’est pas recalculé pendant le dessin ; les traces et forces conservées par `Spacecraft` alimentent le diagnostic.

Le temps est un accumulateur à **60 pas fixes par seconde**. Chaque pas conserve les unités par image de la base pédagogique : forces puis intégration héritée. Une frame graphique est plafonnée à 100 ms pour éviter une énorme reprise après ralentissement. La pause fige le temps du jeu et du décor.

Ordre d’un pas : apparitions → leader → cibles des ailiers et intégration → ennemis et tirs → locomotion des autres entités → collisions → nettoyage → défaite. Les ailiers se calent sur la nouvelle position du leader du même pas. Les vitesses restent limitées dans la base. Les corps ne rebouclent pas : `edges()` n’est pas appelé, car un rebouclage serait incohérent avec ce champ de bataille. Leurs sorties et apparitions sont des règles de cycle de vie explicites.

## Paramètres du panneau

| Paramètre | Défaut | Plage | Effet |
| --- | --- | --- | --- |
| Vitesse maximale | 5,8 | 2–9 px/pas | Leader et ailiers ; ennemis à 38 % de cette vitesse |
| Force maximale | 0,30 | 0,10–0,70 | Budget de force final des avions |
| Rayons | 5 | 1–15 | Nombre de rayons du radar |
| Anticipation | 20 | 10–40 pas | Portée du radar = vitesse × ce paramètre |
| Marge | 12 | 4–35 px | Ajoutée au rayon physique pour la perception |
| Poids évitement | 5 | 3–10 | Multiplicateur de la moyenne radar |
| Cadence alliée | 8 | 2–12 tirs/s | Leader et ailiers ; arrondie au prochain pas fixe |
| Intervalle ennemis | 2,8 | 1–6 s | Prochain cycle, divisé par le multiplicateur du niveau |
| Intervalle astéroïdes | 5 | 2–10 s | Prochain cycle, divisé par le multiplicateur du niveau |
| Volume musique | 38 % | 0–100 % | Bus musical indépendant |
| Volume effets | 55 % | 0–100 % | Bus des effets indépendant |

Les curseurs utilisent l’événement `input` et mettent à jour la valeur affichée immédiatement. Les paramètres de mouvement s’appliquent dès le pas suivant. Les périodes d’apparition sont prises en compte au rechargement du compteur courant ; la cadence modifiée s’applique aux prochains tirs après le cooldown en cours. Le bouton de rétablissement remet toutes les valeurs par défaut. Le panneau peut être fermé sans réinitialiser le vol.

## Niveaux et difficulté

Tous les seuils et paramètres se trouvent dans `js/config.js`, objet `GAME_CONFIG`. `levels` est une liste ordonnée par score absolu, avec un premier seuil à zéro. Pour ajouter ou déplacer un palier, modifier cette liste ; l’interface et la sélection du niveau la lisent directement.

| Niveau | Seuil | Apparitions ennemies | Vitesse ennemie | Résistance | Cadence ennemie | Apparitions obstacles |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | ×1 | ×1 | ×1 | ×1 | ×1 |
| 2 | 600 | ×1,12 | ×1,08 | ×1,15 | ×1,10 | ×1,12 |
| 3 | 1 500 | ×1,26 | ×1,16 | ×1,30 | ×1,22 | ×1,25 |
| 4 | 3 000 | ×1,40 | ×1,24 | ×1,50 | ×1,35 | ×1,40 |
| 5 | 5 200 | ×1,55 | ×1,32 | ×1,75 | ×1,50 | ×1,60 |
| 6 | 8 000 | ×1,70 | ×1,42 | ×2 | ×1,65 | ×1,80 |

Les intervalles de base du panneau sont divisés par le multiplicateur correspondant. Le plancher est de 60 pas entre ennemis et 120 pas entre obstacles. Le plafond est de 16 ennemis vivants, dont au maximum 2 lourds. Les avions ennemis utilisent la vitesse réglée ×0,38 ×multiplicateur du niveau ; les lourds reçoivent encore ×0,65. La résistance multiplie uniquement les PV des nouveaux avions. Les avions déjà présents reçoivent la nouvelle vitesse et cadence sans récupérer de PV. La cadence légère est de `max(55,105/fire)` pas entre tirs.

Le score est contrôlé avant et après les collisions de chaque pas. Un saut de plusieurs seuils sélectionne directement le dernier niveau atteint, avec une seule annonce et un seul son. Les compteurs d’apparition sont raccourcis au besoin, sans apparition immédiate d’une vague entière. Le dernier palier est un niveau de survie plafonné, affiché « NIVEAU MAXIMUM ». Le changement de niveau ne met jamais en pause. Son annonce dure 150 pas, avec fondu et translation calculés selon le temps simulé ; le mode de réduction des animations supprime la translation.

## Thèmes associés aux niveaux

`js/themes.js` centralise `THEME_CONFIG` : durée du fondu, thèmes, ordre et variantes futures. Les associations explicites sont dans `GAME_CONFIG.levels[].theme` ; seuils, difficultés, commandes et comportements restent ceux du jeu existant. Les noms des six niveaux correspondent désormais à leur ambiance.

| Niveau | Seuil | Clé | Palette et décor | Particules décoratives | Apparence des vrais obstacles |
| --- | --- | --- | --- | --- | --- |
| 1 — Espace profond | 0 | `deep` | Bleu nuit, planète sombre, éclairage cyan | Poussières bleues | Roches bleu-gris |
| 2 — Nébuleuse violette | 600 | `nebula` | Nuages et rubans violets/roses, petite lune | Motes roses | Roches mauves |
| 3 — Champ d’astéroïdes | 1 500 | `asteroids` | Teintes cuivrées, planète rocheuse, ceinture lointaine | Petits débris assombris | Roches orangées aux contours clairs |
| 4 — Planète glacée | 3 000 | `ice` | Bleu clair sur fond sombre, planète gelée et fractures | Flocons et poussières de glace | Cristaux à six facettes |
| 5 — Zone volcanique | 5 200 | `volcano` | Rouge sombre, planète striée de lave | Braises montantes | Scories aux fissures lumineuses |
| 6 — Base ennemie | 8 000 | `base` | Station métallique, panneaux, balises rouges | Étincelles rouges | Débris métalliques à facettes |

Le fond reste assez sombre pour distinguer avions, tirs, bonus et menaces. Ces entités conservent leur code couleur stable. Les obstacles physiques possèdent un contour nettement plus clair que les particules et débris décoratifs. Leur forme reste inscrite dans le rayon physique existant ; le thème ne modifie ni `pos`, ni `r`, ni santé, vitesse ou collision. Les obstacles déjà présents changent d’apparence avec le fondu.

**Séparation du décor et de la simulation :** planète, station, cristaux lointains, ceinture et particules sont exclusivement dessinés par `ThemeScenery`. Ils ne sont jamais insérés dans `Game.obstacles`, `enemies`, `projectiles` ou `bonuses` et ne participent ni à l’évitement ni aux collisions. Leurs variations visuelles ne constituent pas de nouveaux comportements de déplacement autonome. Toutes les entités de gameplay gardent leur héritage et leur locomotion.

Chaque thème définit `base`, trois couleurs `haze`, `accent`, `stars`, les couleurs `planet` et le type de `landmark`, une configuration `particles` (type, couleur, nombre, vitesse, taille, opacité), `obstacle` (forme, palette et contour), et `music` (gain ambiant, gain rythmique, fréquence de filtre). `transitionFrames` vaut **180 pas**, soit trois secondes. Les particules restent bornées à 58 par thème, en plus des 230 étoiles. Les décors détaillés et dégradés sont mis en cache, un canvas par thème visité ; un seul canvas intermédiaire est réutilisé pour le compositage.

`ThemeTransition` appartient à `Game`. Le passage du seuil sélectionne la nouvelle clé sans modifier les populations, la vie, les positions ou le score. Le compteur avance une fois par pas de simulation et se fige en pause. L’interpolation utilise `p²(3−2p)` pour des départs et arrivées doux ; les poids restent normalisés. Si un second niveau survient avant la fin, le mélange visible courant devient le départ du nouveau fondu, sans saut. Un saut de plusieurs niveaux sélectionne directement le thème du dernier palier atteint. Le redémarrage revient à Espace profond.

Le numéro et le nom sont annoncés dans la bannière existante. Le nom d’environnement est aussi visible dans le bandeau et sur le bord de la scène. Le gameplay continue pendant la transition. Le mode de réduction des animations conserve le fondu de couleur et supprime la translation de la bannière.

**Extensions :** deux thèmes complets sont prêts, `emerald` (Voile d’émeraude) et `derelict` (Chantier abandonné). Un niveau supplémentaire peut indiquer sa clé `theme`, ou utiliser successivement la liste configurable `variants`. Cette liste alterne ensuite des ambiances existantes ; elle peut être enrichie pour rendre chaque nouveau palier unique. Aucun seuil ni niveau supplémentaire n’est ajouté par ce changement esthétique. Une clé inconnue revient au thème de base.

## Grands avions et missiles

`GAME_CONFIG.heavy` contient `fromLevel` (3), `chance` (0,24 par apparition admissible), `maxAlive` (2), `hp` (140 avant multiplicateur), `score` (350), `speedFactor` (0,65), `warningFrames` (60), `missileInterval` (270), `missileSpeed` (4,2 px/pas) et `missileDamage` (22). Les durées doivent être positives.

`HeavyEnemy extends Enemy extends Spacecraft extends Vehicle`. Sa silhouette orange est élargie, avec une coque différente, un rayon physique de 33 px et une barre de vie. Il rejoint une station à y=180 avec l’Arrive du professeur. Il n’utilise pas un nouvel algorithme d’attaque ou de déplacement. Les ennemis légers continuent à suivre le leader avec Seek.

Avant de tirer, l’avion lourd fige une copie de la position du leader. Pendant 60 pas, un anneau de charge, une ligne pointillée et une mire orange montrent le point visé ; un bref signal sonore complète cet avertissement. Aucun missile ne part avant la fin. Le délai suivant est `max(120,270/fire)` pas, auquel s’ajoute l’avertissement suivant. Un avion détruit ne peut plus lancer de missile.

`Missile extends Projectile extends Vehicle`. Il hérite de `Projectile.step()` : `super.seek(target)`, `applyForce()`, puis un `super.update()` par pas. Le point cible est fixé à 4 000 px dans la direction du point annoncé. Le missile n’est donc pas autoguidé ; une fois lancé, il ne suit pas le leader. Sa vitesse plus lente, son délai de lancement, ses flammes orange et ses ailettes permettent de le distinguer. Il expire après 360 pas ou sort du champ ; son impact consomme le missile et peut toucher un ailier faisant écran.

Le n°10 du projet a été vérifié : il fait évoluer des générations de fusées avec un ADN de forces et une fonction de fitness. Ce fonctionnement ne correspond pas au tir réactif de ce jeu. Aucun algorithme génétique n’a été importé ni transformé en missile guidé.

## Esquive S : fuite et limites

`GAME_CONFIG.dodge` centralise `durationFrames` (36), `cooldownFrames` (240), `detectionRadius` (190 px), `margin` (45 px) et `boundaryLookahead` (30 pas minimum). La durée et la recharge sont positives, en pas de 1/60 s. La recharge affichée pendant la fuite comprend sa durée restante, puis indique les 4 secondes suivant sa fin normale.

`Game.dodge()` laisse `Leader.beginDodge()` choisir, parmi les tirs et missiles ennemis vivants, la menace la plus proche à distance inférieure ou égale au rayon de perception et dont la vitesse relative indique un rapprochement. Cette sélection ne calcule pas une force. Les tirs qui s’éloignent, expirés, amis, lointains ou exactement superposés sont ignorés. Aucun danger pertinent ne consomme la recharge et ne change la vitesse. Les répétitions de la touche maintenue sont ignorées.

Pendant l’action, `Leader.trackingForce()` appelle **`super.flee(threat.pos)`**. La formule héritée est inchangée : direction opposée à la menace, vitesse désirée à `maxSpeed`, soustraction de la vitesse courante, limitation à `maxForce`. Le contrôleur n’a pas recopié cette formule. Le radar du comportement 6 est toujours calculé et composé comme pendant le pilotage normal ; la force finale reste limitée et intégrée par la locomotion héritée. Le leader ne reçoit aucune invulnérabilité ni hausse de vitesse. La formation et les ailiers continuent leurs mises à jour, en Delta comme en protection.

La référence à la menace choisie reste stable pendant l’action : pas de changement aléatoire de cible en plein vol. Si elle est détruite ou expire, la fuite s’arrête, mais le compteur de recharge restant continue. Après épuisement de la durée, la même vitesse est conservée et Arrive reprend vers la destination actuelle de la souris. Aucun réarmement automatique ; un nouveau S est nécessaire après recharge. Pause et perte de focus figent les compteurs avec le reste de la simulation. Le redémarrage recrée un leader avec S disponible.

Près des bords, `Leader.flightSafety()` examine la position et une position extrapolée avec la vitesse courante ; l’horizon tient compte du rapport vitesse/force. Si une sortie est anticipée, la sélection d’action privilégie **l’Arrive existant vers un point intérieur**. Une force radar orientée dans le même sens intérieur peut encore être ajoutée ; une force opposée à ce retour cède la priorité au bord. Il n’y a ni modification directe des coordonnées, ni rebouclage, ni téléportation. Cette priorité s’applique aussi hors esquive pour éviter une sortie provoquée par le radar.

Limite assumée : Flee s’éloigne radialement de la menace ; ce n’est pas un déplacement latéral garanti ni une prédiction d’interception. Une fuite face à plusieurs tirs, vers un obstacle ou près d’un bord peut donc échouer. Le jeu préserve cette mécanique compatible avec le cours, au lieu d’inventer un déplacement instantané ou une immunité.

## Audio original et cycle de vie

`Game` émet des événements sonores sans dépendre d’un navigateur. `sketch.js` les transmet à `GameAudio`. Les événements couvrent tir ami, tir ennemi, avertissement, missile, impact, explosion, bonus, soin, recrutement, protection, esquive, niveau et défaite. La file est bornée à 64 événements. Le service limite les sons répétés par catégorie et le nombre de voix à 10 ; les tirs similaires sont regroupés à au moins 85 ms d’intervalle. Le jeu conserve sa cadence de projectiles indépendante de cette limitation sonore.

Deux WAV musicaux originaux de 16 secondes restent lus en boucle et en phase. Aucun nouveau fichier ni piste externe n’est ajouté. Le mix des couches et un filtre passe-bas évoluent selon le thème, en reprenant les poids du fondu visuel. Un lissage audio de 80 ms évite les ruptures entre pas. Les sources ne redémarrent pas lors d’un changement de thème : leur phase et la position musicale sont conservées. Les gains Musique (0,38 par défaut) et Effets (0,55) restent indépendants. Le filtre n’agit que sur la musique ; les effets de combat gardent leur timbre et leur lisibilité.

| Thème | Couche ambiante | Couche rythmique | Fréquence du passe-bas |
| --- | --- | --- | --- |
| Espace profond | 0,80 | 0,12 | 1 500 Hz |
| Nébuleuse violette | 0,95 | 0,24 | 2 200 Hz |
| Champ d’astéroïdes | 0,68 | 0,48 | 3 000 Hz |
| Planète glacée | 0,90 | 0,28 | 1 200 Hz |
| Zone volcanique | 0,65 | 0,70 | 3 800 Hz |
| Base ennemie | 0,60 | 0,82 | 5 000 Hz |

Les bus passent dans un compresseur (seuil −16 dB, ratio 8), puis dans le gain général de 0,8 et l’analyseur. Le bouton muet force ce dernier gain à zéro, y compris pour un effet déjà lancé. La pause arrête les sources comme auparavant, tout en conservant le mélange thématique du temps simulé pour la reprise.

Le contexte audio n’est créé qu’après une interaction explicite : Jouer ou réactivation du son. Le décodage est effectué une seule fois. En pause, les sources musicales et les effets sont arrêtés et déconnectés ; l’offset musical est conservé pour la reprise. La défaite arrête la musique et laisse entendre son effet propre. Le redémarrage réinitialise l’offset et les sources, en conservant les volumes et le choix muet. `pagehide` ferme le contexte et libère les buffers. Un échec audio affiche un message dans les réglages et n’empêche pas de jouer.

Tous les sons sont synthétisés pour ce projet, sans échantillon tiers. Les 15 fichiers PCM mono 22 050 Hz / 16 bits sont dans `assets/audio/`, avec une dédicace CC0-1.0 dans `LICENSE.txt`. Le générateur reproductible `source/generate_audio.py` utilise seulement Python standard. `js/audio-data.js` contient les mêmes octets WAV en base64 pour le lancement direct `file://`, sans requête bloquée par CORS. Les tests vérifient l’identité des ressources intégrées et des WAV, leur énergie et leur crête sans écrêtage. Il n’y a aucune dépendance audio réseau.

## Debug et validation

Le debug affiche cibles et segments en or, vitesse en bleu, force finale en or et force moyenne du radar en vert. Les rayons deviennent rouges lorsqu’une menace est détectée, les trois points sont marqués et la zone autour de l’obstacle menacé est visible. Le diagnostic est un rendu indépendant des branches de dessin intégrées au Vehicle original ; son booléen statique reste faux pour éviter les dessins pendant les tests de simulation.

Quarante-trois tests unitaires exécutent les vraies méthodes avec un adaptateur vectoriel minimal : intégrité des sources, héritage, arrivée et freinage, limites, radar et seuils, non-mutation, bonus, formations, contournement et retour, tirs, collisions, pause, défaite, réinitialisation et simulation prolongée. Les ajouts couvrent les seuils exacts, sauts de niveaux, plafonds, difficulté, arrivée des lourds configurable, avertissement complet, trajectoire du missile, choix de menace, durée/recharge, non-réarmement, absence d’invulnérabilité, contribution du radar pendant S et quatre bords avec les réglages extrêmes. Huit tests de visée vérifient huit directions de tir, origine et bouche alignées, cible proche ou confondue, absence de mutation, cadence, changement de visée, suivi suspendu/repris, alliés dans quatre quadrants, radar et S dans les deux formations, pause et réinitialisation. Les tests audio couvrent les bus et le cycle de vie avec un adaptateur, puis les données PCM réelles.

Le test Chrome utilise **p5.js 1.7.0 et Web Audio réels**, sans bibliothèque de test externe. Il vérifie le lancement `file://` puis HTTP, le clic maintenu, la suspension du suivi, le changement de direction en tir, la reprise au relâchement, les commandes H/I/S/D, les collectes, les niveaux, l’avertissement et le lancement d’un missile, la recharge, les panneaux, pause, défaite et redémarrage. Le signal en sortie est mesuré par l’analyseur : musique après interaction, effets seuls, deux volumes nuls, mute, pause silencieuse et reprise. Treize captures sont enregistrées, dont les six thèmes et un fondu intermédiaire, ainsi que l’avertissement lourd et la visée à 360° ; l’absence d’erreurs JavaScript et la largeur mobile sont contrôlées. Le jeu vise souris et clavier sur ordinateur.

Référence d’architecture consultée : Craig W. Reynolds, [Steering Behaviors For Autonomous Characters, GDC 1999](https://www.red3d.com/cwr/steer/gdc99/), séparation sélection d’action / steering / locomotion. Les formules utilisées proviennent des fichiers du cours et de la pièce jointe, pas de cette référence externe.

Les tests thématiques vérifient les six configurations, les poids normalisés, le fondu à mi-parcours et à sa fin, les changements interrompus, la pause, les variantes et la conservation des entités. Chrome compare les pixels au début du fondu, contrôle six signatures de décor distinctes, puis mesure le coût du rendu en cache. Le test audio vérifie les gains pondérés et le filtre musical, sans changement des volumes du joueur.

