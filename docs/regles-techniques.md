# Regles techniques extraites des notices de montage

Toutes les valeurs ci-dessous proviennent des trois notices fournies. Elles sont
recopiees telles quelles dans `src/data/catalogue.js`, avec la page d'origine.
Les cotes sont en millimetres.

## Sources

| Code | Produit | Version |
|------|---------|---------|
| PU11 | Claustra bois composite | V23, 12 pages |
| PU36 | Claustra aluminium | V3, 13 pages |
| PU41 | Claustra persienne aluminium | V1, 10 pages |

## Regles communes aux trois gammes

| Regle | Valeur | Source |
|-------|--------|--------|
| Entraxe des poteaux | 1800 mm (a respecter imperativement, meme en angle) | PU11 p.6, PU36 p.4, PU41 p.3 |
| Entraxe pour un decor vertical | 855 mm | PU11 p.9, PU36 p.10, PU41 p.7 |
| Longueur de poteau fournie | 2315 mm | PU11 p.3, PU36 p.3, PU41 p.3 |
| Profondeur de scellement | 500 mm | PU41 p.1 |
| Jeu mini entre capot et lisse haute | 15 mm (30 mm sur PU41) | PU11 p.1, PU36 p.1, PU41 p.2 |
| Goujons d'ancrage inox M10 | 4 par platine, diametre 8 a 12 mm | PU11 p.2, PU36 p.2, PU41 p.2 |
| Connecteurs de lisse | 2 par lisse (un de chaque cote) | PU41 p.4 |
| Pose sur muret | muret + claustra <= 2200 mm | PU41 p.3 |
| Tenue au vent | 100 km/h en site normal jusqu'a 1815 mm avec scellement beton | PU11 p.1, PU36 p.1, PU41 p.1 |
| Poteaux d'angle | Poteau 3 en 1 pour intersection a 90 degres uniquement, haubanage imperatif | PU11 p.8, PU36 p.9, PU41 p.6 |
| Support de pose des platines | Dalle beton pleine, plane, 200 mm de large minimum ; support creux proscrit | PU11 p.2, PU36 p.2, PU41 p.2 |

## Aide au calepinage - hauteurs d'empilement

### PU11 - bois composite (p.2)

| Element | Hauteur |
|---------|---------|
| Lame hors tout | 150 +/- 2 |
| Lame empilee sur une autre lame | 146 +/- 2 |
| Lisse haute | 10 +/- 0,5 |
| Lisse basse | 12 +/- 0,5 |
| Lisse intermediaire | 3 +/- 0,5 |
| Support de platine | 23 +/- 1 |
| Jeu mini haut de poteau | 15 |

Regle de pose (p.6) : **jamais plus de 3 lames empilees sans lisse intermediaire**.
Exemples donnes par la notice : 8 lames + 1 lisse haute + 2 lisses intermediaires
+ 1 lisse basse ; 11 lames + 1 lisse haute + 3 lisses intermediaires + 1 plaque de
soubassement. Le configurateur en deduit `ceil(nbLames / 3) - 1` lisses
intermediaires.

Longueur de lame : 1783 +/- 3 mm, jeu de dilatation en longueur de 7 mm (+/- 4).

### PU36 - aluminium (p.1 et p.2)

| Element | Hauteur |
|---------|---------|
| Lame entre entretoises (panneau ajoure) | 148 +/- 0,5 |
| Lame empilee sur une autre lame | 146 +/- 0,5 |
| Entretoise | 15 +/- 0,5 |
| Lisse haute | 10 +/- 0,5 |
| Lisse intermediaire | 5 +/- 0,5 |

En pose pleine, la clôture tout aluminium ne necessite **ni lisse basse ni lisse
intermediaire** (p.5). Longueur de lame : 1797 +/- 1 mm, jeu de dilatation 1,5 mm
de chaque cote.

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
| 10 persiennes + 2 debut/fin | 1745 | 1760 | 2245 |

Le pas d'empilement reel (lame + entretoises cote A et cote B) n'est pas donne
explicitement par la notice. Le configurateur utilise un pas de **144,6 mm**,
cale sur cette table (12 lames + lisse haute = 1745 mm), et le signale dans le
code (`pasLameEntretoise`).

## Limites de hauteur sur platines double coque

| Gamme | Hauteur de poteau maxi sur platines |
|-------|-------------------------------------|
| PU11 / PU36 | 1845 mm |
| PU41 | 1745 mm |

## Decors

- **Decor horizontal** (Mineral, Vegetal, Urbain) : remplace 2 lames empilees, a
  n'importe quelle hauteur, et doit rester encadre par une lame de part et d'autre.
  Sur PU41, il impose 4 lames debut/fin au lieu de 2 (p.7).
- **Decor vertical** (Mineral, Vegetal) : travee dediee, entraxe poteaux 855 mm,
  ni connecteur ni lisse. Panneau 845 x 1787 mm (PU11/PU36), 845 x 1791 mm (PU41).
- Un decor peut remplacer une lisse intermediaire, sans jamais depasser 3 lames
  empilees entre deux lisses ou decors.

## Points non couverts par les notices

Ces elements sont marques `A_VALIDER` dans le catalogue :

- portillons et portails (cotes de passage, quincaillerie, poteaux dedies) ;
- volume de beton par poteau scelle (le configurateur retient un trou de
  300 x 300 x 600 mm, soit 54 L, a titre indicatif) ;
- nuancier commercial et tarifs.
