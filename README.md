# Configurateur cloture & portillon

Calculette web qui transforme un projet de cloture (claustra + portillon) en
**calepinage**, **nomenclature complete** et **estimation chiffree**, sur le
modele des configurateurs de devis en ligne.

Le moteur de calcul applique les regles des notices de montage fournies :
`PU11 V23` (claustra bois composite), `PU36 V3` (claustra aluminium) et
`PU41 V1` (claustra persienne aluminium). Chaque cote utilisee est tracee dans
[`docs/regles-techniques.md`](docs/regles-techniques.md) avec sa page d'origine.

## Demarrer

Aucune dependance, aucun build : le projet est un site statique en modules ES.
Il faut simplement le servir en HTTP (les modules ES ne se chargent pas en
`file://`).

```bash
npm start            # http://localhost:8080
# ou
python3 -m http.server 8080
npm test             # 27 tests du moteur de calcul (node --test)
```

## Ce que fait le configurateur

Un parcours en 5 etapes, avec synthese et apercu permanents :

1. **Gamme** — bois composite, aluminium (occultation totale ou panneau ajoure),
   persienne aluminium ; coloris.
2. **Trace** — saisie des segments de la cloture (chaque changement de direction
   cree un angle a 90 degres), portillon ou portail et sa largeur de passage.
3. **Hauteur & pose** — nombre de lames ou hauteur visee, bas de panneau
   (lisse basse ou plaque de soubassement), pose sur platines, scellement beton
   ou sur muret.
4. **Options** — decors horizontaux et verticaux, baguettes de finition,
   fixations murales.
5. **Recapitulatif** — nomenclature valorisee, points de vigilance chantier,
   export CSV / JSON, impression PDF et lien de partage du projet.

### Calculs couverts

- hauteur d'empilement lame par lame (lames, entretoises, lisses haute, basse et
  intermediaires, plaque de soubassement) ;
- nombre de lisses intermediaires (jamais plus de 3 lames empilees sans lisse) ;
- longueur de poteau a recouper et chute par poteau, partie enterree en
  scellement, hauteur hors sol ;
- decoupage en travees a l'entraxe de 1800 mm + travee recoupee, avec la
  longueur de recoupe des lames et le jeu de dilatation ;
- quantites : poteaux droits, poteaux d'angle 3 en 1, platines, goujons, capots,
  lames, entretoises, lisses, connecteurs, decors, beton de scellement ;
- controles bloquants : limite de hauteur sur platines, muret + claustra
  <= 2,20 m, poteau plus long que la longueur fournie, ouvrants plus larges que
  le trace, reliquat de travee trop faible.

## Architecture

```
index.html                 page unique (wizard + synthese)
assets/css/styles.css      theme clair / sombre, impression
src/data/catalogue.js      cotes des notices PU11 / PU36 / PU41, poses, coloris, decors
src/data/tarifs.js         grille tarifaire (DEMONSTRATION - a remplacer)
src/core/calepinage.js     moteur de calcul (fonctions pures, testees)
src/core/nomenclature.js   nomenclature valorisee + export CSV
src/ui/app.js              parcours en etapes, rendu, evenements
src/ui/apercu.js           apercus SVG (elevation d'une travee, vue en plan)
src/ui/etat.js             persistance locale et lien de partage
tests/                     tests node:test du moteur et de la nomenclature
```

La separation `core` / `ui` permet de reutiliser le moteur ailleurs (API,
back-office, script de chiffrage) : `calepiner()` et `construireNomenclature()`
ne dependent ni du DOM ni d'un framework.

## Adapter a votre catalogue

| Besoin | Fichier |
|--------|---------|
| Prix | `src/data/tarifs.js` — remplacer `TARIF_DEMO` par votre tarif et passer `reel: true`, ou mettre `TARIF_ACTIF = null` pour n'afficher que les quantites |
| Cotes, gammes, hauteurs maxi | `src/data/catalogue.js` |
| Coloris, decors, portillons | `src/data/catalogue.js` (`COLORIS`, `DECORS`, `OUVRANTS`) |
| Regles de calcul | `src/core/calepinage.js` |

## Limites connues

- **Les prix affiches sont des prix de demonstration**, ils ne proviennent
  d'aucun tarif fabricant. Ils servent uniquement a faire fonctionner
  l'estimation.
- Les **portillons et portails** ne figurent pas dans les notices PU11/PU36/PU41 :
  leurs cotes et leur quincaillerie sont marquees `A_VALIDER` dans le catalogue.
- Les angles sont traites a **90 degres** (poteau 3 en 1) ; un autre angle
  demande une etude specifique, comme l'indiquent les notices.
- Le **volume de beton** par poteau scelle est une estimation (trou de
  300 x 300 x 600 mm) et non une valeur de notice.
- L'estimation porte sur les **fournitures** : ni pose, ni livraison, ni
  terrassement, ni evacuation des chutes.
- Le configurateur ne remplace pas la lecture integrale des notices de montage
  avant chantier.
