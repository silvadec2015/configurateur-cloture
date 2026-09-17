# Règles techniques et données produit

Toutes les valeurs ci-dessous sont recopiées dans `src/data/catalogue.js` avec
leur source — page de notice ou fiche produit. Les cotes sont en millimètres, et
ce qui n'a pas été confirmé par une source est marqué `A_VALIDER` dans le code
comme dans l'interface.

## Sources

Deux sources, jamais mélangées dans le code : les **notices de montage** pour
les cotes d'assemblage, les **fiches produit** du catalogue Silvadec pour les
noms commerciaux, coloris, dimensions de lame et garanties.

| Code | Produit | Version |
|------|---------|---------|
| PU11 | Claustra bois composite | V23, 12 pages |
| PU36 | Claustra aluminium | V3, 13 pages |
| PU41 | Claustra persienne aluminium | V1, 10 pages |

### Fiches produit intégrées

| Gamme | Produit | Lame (h x ép x long.) | Coloris | Garantie |
|-------|---------|----------------------|---------|----------|
| Atmosphère | Lame écran Atmosphère coextrudée | 150 x 21 x 1783 mm | Gris anthracite, Gris clair | 25 ans |
| Aluminium | Lame écran Aluminium | 148 x 21 x 1797 mm | Gris anthracite, Gris métal, Noir | 10 ans, Qualicoat |
| Persienne | Lame persienne en Aluminium | 127 x 21 x 1797 mm | Gris anthracite, Noir | 10 ans, Qualicoat |
| Élégance | Lame écran Élégance | à confirmer | à confirmer | à confirmer |

Hauteur maximale annoncée par les fiches Atmosphère, Aluminium et Persienne :
**1,80 m**.

### Portillon Aluminium

| Donnée | Valeur |
|--------|--------|
| Vantail | 975 (l) x 1750 (H) x 60 (ép) mm |
| Poteaux | 100 x 100 x 2250 mm |
| Largeur entre poteaux | 1060 mm |
| Passage utile | 900 mm (norme PMR : > 830 mm) |
| Coloris | Gris anthracite |
| Poses | Directe entre deux piliers maçonnés, ou sur poteaux dans une clôture Silvadec |

L'emprise retenue pour le calepinage est de 1060 mm en pose entre piliers et de
1260 mm en pose sur poteaux (1060 + 2 poteaux de 100 mm). Cette addition est une
interprétation : la fiche ne précise pas si la cote est prise entre nus
intérieurs ou d'axe en axe.

### Accessoires (page « Accessoires de montage clôture »)

Aluminium thermolaqué finition sablée. Poteau **grand vent 3 en 1** (début,
milieu et fin de clôture), platine double coque dédiée, capot 65 x 70 mm,
demi-poteau et demi-capot de départ mural (70 x 35 mm), lisse haute ou basse,
lisse intermédiaire, connecteurs, plaque de soubassement, baguette de finition
27 x 9,5 x 1845 mm, entretoises aluminium, **entretoises dédiées pour lame
persienne**, kit pour pose verticale.

### Deux incohérences relevées dans le catalogue

1. **Coloris des accessoires** : les nuanciers affichent gris anthracite et
   noir, tandis que les textes citent « gris anthracite, gris métal et blanc ».
   Le configurateur retient les deux coloris confirmés par un nuancier, garde le
   gris métal en « à confirmer » et ignore le blanc.
2. **Lisses sur les lames aluminium** : la page accessoires les présente comme
   optionnelles, la notice PU36 rend la lisse haute impérative. Le chiffrage
   suit la notice et signale l'écart.

La référence « RAL 2100 » (noir) n'existe pas au nuancier RAL classique ; c'est
la désignation employée par les fiches Silvadec, reprise telle quelle.

## Règles communes aux trois gammes

| Regle | Valeur | Source |
|-------|--------|--------|
| Entraxe des poteaux | 1800 mm (a respecter impérativement, même en angle) | PU11 p.6, PU36 p.4, PU41 p.3 |
| Entraxe pour un décor vertical | 855 mm | PU11 p.9, PU36 p.10, PU41 p.7 |
| Longueur de poteau fournie | 2315 mm | PU11 p.3, PU36 p.3, PU41 p.3 |
| Profondeur de scellement | 500 mm | PU41 p.1 |
| Jeu mini entre capot et lisse haute | 15 mm (30 mm sur PU41) | PU11 p.1, PU36 p.1, PU41 p.2 |
| Goujons d'ancrage inox M10 | 4 par platine, diametre 8 a 12 mm | PU11 p.2, PU36 p.2, PU41 p.2 |
| Connecteurs de lisse | 2 par lisse (un de chaque côté) | PU41 p.4 |
| Pose sur muret | muret + claustra <= 2200 mm | PU41 p.3 |
| Tenue au vent | 100 km/h en site normal jusqu'a 1815 mm avec scellement béton | PU11 p.1, PU36 p.1, PU41 p.1 |
| Poteaux d'angle | Poteau 3 en 1 pour intersection a 90 degrés uniquement, haubanage impératif | PU11 p.8, PU36 p.9, PU41 p.6 |
| Support de pose des platines | Dalle béton pleine, plane, 200 mm de large minimum ; support creux proscrit | PU11 p.2, PU36 p.2, PU41 p.2 |

## Aide au calepinage - hauteurs d'empilement

### PU11 - bois composite (p.2)

| Element | Hauteur |
|---------|---------|
| Lame hors tout | 150 +/- 2 |
| Lame empilée sur une autre lame | 146 +/- 2 |
| Lisse haute | 10 +/- 0,5 |
| Lisse basse | 12 +/- 0,5 |
| Lisse intermédiaire | 3 +/- 0,5 |
| Support de platine | 23 +/- 1 |
| Jeu mini haut de poteau | 15 |

Règle de pose (p.6) : **jamais plus de 3 lames empilées sans lisse intermédiaire**.
Exemples donnés par la notice : 8 lames + 1 lisse haute + 2 lisses intermédiaires
+ 1 lisse basse ; 11 lames + 1 lisse haute + 3 lisses intermédiaires + 1 plaque de
soubassement. Le configurateur en déduit `ceil(nbLames / 3) - 1` lisses
intermédiaires.

Longueur de lame : 1783 +/- 3 mm, jeu de dilatation en longueur de 7 mm (+/- 4).

### PU36 - aluminium (p.1 et p.2)

| Element | Hauteur |
|---------|---------|
| Lame entre entretoises (panneau ajoure) | 148 +/- 0,5 |
| Lame empilée sur une autre lame | 146 +/- 0,5 |
| Entretoise | 15 +/- 0,5 |
| Lisse haute | 10 +/- 0,5 |
| Lisse intermédiaire | 5 +/- 0,5 |

En pose pleine, la clôture tout aluminium ne nécessite **ni lisse basse ni lisse
intermédiaire** (p.5). Longueur de lame : 1797 +/- 1 mm, jeu de dilatation 1,5 mm
de chaque côté.

Table constructeur (p.1) :

| Nb de lames | Hauteur de claustra | Poteau mini sur platines | Poteau mini en scellement |
|-------------|---------------------|--------------------------|---------------------------|
| 8 | 1200 | 1260 | - |
| 12 | 1800 | 1845 | 2315 |

### PU41 - persienne aluminium (p.1 et p.2)

| Element | Hauteur |
|---------|---------|
| Lame hors tout | 127 +/- 0,5 |
| Lisse haute | 10 +/- 0,5 |
| Support de platine | 23 +/- 1 |
| Jeu mini entre lisse haute et haut de poteau | 30 |

Table constructeur (p.1) :

| Nb de lames | Hauteur de claustra | Poteau mini sur platines | Poteau mini en scellement |
|-------------|---------------------|--------------------------|---------------------------|
| 10 persiennes + 2 début/fin | 1745 | 1760 | 2245 |

Le pas d'empilement reel (lame + entretoises cote A et cote B) n'est pas donne
explicitement par la notice. Le configurateur utilise un pas de **144,6 mm**,
calé sur cette table (12 lames + lisse haute = 1745 mm), et le signale dans le
code (`pasLameEntretoise`).

## Limites de hauteur sur platines double coque

| Gamme | Hauteur de poteau maxi sur platines |
|-------|-------------------------------------|
| PU11 / PU36 | 1845 mm |
| PU41 | 1745 mm |

## Décors

- **Décor horizontal** (Minéral, Végétal, Urbain) : remplace 2 lames empilées, a
  n'importe quelle hauteur, et doit rester encadré par une lame de part et d'autre.
  Sur PU41, il impose 4 lames début/fin au lieu de 2 (p.7).
- **Décor vertical** (Minéral, Végétal) : travee dédiée, entraxe poteaux 855 mm,
  ni connecteur ni lisse. Panneau 845 x 1787 mm (PU11/PU36), 845 x 1791 mm (PU41).
- Un décor peut remplacer une lisse intermédiaire, sans jamais depasser 3 lames
  empilées entre deux lisses ou décors.

## Points non couverts par les notices

Ces éléments sont marqués `A_VALIDER` dans le catalogue :

- portillons et portails (cotes de passage, quincaillerie, poteaux dédiés) ;
- volume de béton par poteau scelle (le configurateur retient un trou de
  300 x 300 x 600 mm, soit 54 L, a titre indicatif) ;
- nuancier commercial et tarifs.
