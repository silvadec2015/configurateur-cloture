# Configurateur clôture & portillon

Calculette web qui transforme un projet de clôture en **calepinage**,
**nomenclature complète** et **estimation chiffrée**, sur le modèle des
configurateurs de devis en ligne.

Deux sources alimentent le configurateur, sans jamais être mélangées :

- les **notices de montage** `PU11 V23` (bois composite), `PU36 V3` (aluminium)
  et `PU41 V1` (persienne aluminium) pour les cotes d'assemblage ;
- les **fiches produit** du catalogue Silvadec pour les noms commerciaux, les
  coloris, les dimensions de lame, les garanties, le portillon, les décors et
  les accessoires.

Chaque valeur est tracée dans [`docs/regles-techniques.md`](docs/regles-techniques.md)
avec sa source. Ce qui n'a pas été confirmé est marqué `A_VALIDER` dans le code
et signalé dans l'interface.

## Démarrer

Aucune dépendance, aucun build : le projet est un site statique en modules ES.
Il faut simplement le servir en HTTP (les modules ES ne se chargent pas en
`file://`).

```bash
npm start            # http://localhost:8080
# ou
python3 -m http.server 8080
npm test             # 39 tests du moteur de calcul (node --test)
```

## Mise en ligne

Le site est statique : il n'y a ni build ni dépendance à installer, l'hébergeur
sert les fichiers tels quels.

### Vercel

Le fichier [`vercel.json`](vercel.json) fixe déjà la configuration (aucun build,
racine du dépôt comme dossier de sortie, URLs sans `.html`). Il suffit donc
d'importer le dépôt :

1. Sur [vercel.com](https://vercel.com), se connecter avec GitHub.
2. *Add New… → Project*, puis importer `configurateur-cloture`. Si le dépôt
   n'apparaît pas, cliquer sur *Adjust GitHub App Permissions* pour l'autoriser.
3. Laisser les réglages proposés : `vercel.json` les impose de toute façon.
4. *Deploy*. L'URL obtenue ressemble à `configurateur-cloture.vercel.app`.

Ensuite chaque push sur `main` redéploie automatiquement, et chaque branche de
pull request reçoit sa propre URL de prévisualisation.

### GitHub Pages

Alternative sans service supplémentaire : `Settings` → `Pages` → *Deploy from a
branch* → `main` / `/ (root)`. L'URL est alors
`silvadec2015.github.io/configurateur-cloture`. Pas d'URL de prévisualisation
par branche, et `vercel.json` y est simplement ignoré.

### À savoir avant de publier

- **L'URL est publique** : toute personne qui la connaît voit le configurateur,
  donc la grille tarifaire embarquée. Tant qu'il s'agit du tarif de
  démonstration c'est sans conséquence ; avec un tarif réel, il faut choisir
  entre une URL assumée comme publique, une protection par mot de passe (plan
  payant chez Vercel) et la diffusion des seules quantités
  (`TARIF_ACTIF = null`).
- **Pas d'empreinte dans les noms de fichiers** : `app.js` garde son nom d'une
  version à l'autre. Les en-têtes de cache imposent donc une revalidation à
  chaque chargement, ce qui évite de servir un module à jour à côté d'un module
  périmé après un déploiement.

## Le parcours

Il reprend celui du configurateur du fabricant, en cinq étapes, avec synthèse et
aperçu permanents :

1. **Dimensions** — hauteur de clôture hors sol choisie dans la liste du
   catalogue (`1m05` à `1m80`), type de clôture linéaire ou angulaire, nombre de
   côtés et longueur de chaque côté en mètres et centimètres.
2. **Composition** — un ou plusieurs habillages, qui peuvent se mélanger sur une
   même clôture : lame écran Atmosphère, lame écran Aluminium (panneau plein ou
   ajouré, entretoises de 15 mm cumulables) et lame persienne. Répartition des
   panneaux entre habillages, coloris de chaque lame et finition des accessoires.
3. **Pose** — platines, scellement béton ou muret, bas de panneau composite,
   portillon et son type de pose.
4. **Décors & accessoires** — décors horizontaux (300 mm, en remplacement de
   2 lames) et verticaux (panneau dédié de 855 mm), baguettes de finition,
   départs muraux en demi-poteau.
5. **Récapitulatif** — nomenclature valorisée, points de vigilance chantier,
   export CSV / JSON, impression PDF et lien de partage du projet.

Les hauteurs sont exprimées en mètres (`1m65`) comme au catalogue ; le détail en
millimètres reste affiché là où il engage le chantier (longueur de poteau,
recoupe des lames).

### Mélanger les habillages

Une même clôture peut alterner composite, aluminium et persienne d'un panneau à
l'autre. Comme les lames n'ont pas la même hauteur, le nombre de lames est
calculé habillage par habillage pour approcher la hauteur visée : à `1m80`, le
composite atteint 1787 mm, l'aluminium 1764 mm et la persienne 1745 mm. Le
configurateur signale l'écart quand il dépasse 20 mm, et retient pour les poteaux
l'habillage le plus haut.

### Calculs couverts

- hauteur d'empilement lame par lame (lames, entretoises, lisses haute, basse et
  intermédiaires, plaque de soubassement) ;
- nombre de lisses intermédiaires (au minimum une toutes les trois lames) ;
- longueur de poteau à recouper et chute par poteau, partie enterrée en
  scellement ; la table du fabricant prime sur le calcul quand elle couvre le
  nombre de lames choisi ;
- découpage en panneaux à l'entraxe de 1800 mm plus un panneau recoupé, avec la
  longueur de recoupe des lames et le jeu de dilatation ;
- quantités : poteaux grand vent 3 en 1, demi-poteaux de départ mural, platines,
  goujons, capots et demi-capots, lames, entretoises (référence dédiée pour la
  persienne), lisses, connecteurs, décors, poteaux de portillon, béton de
  scellement ;
- contrôles bloquants : hauteur maximale annoncée par la fiche produit (1,80 m),
  limite de hauteur sur platines, muret + clôture ≤ 2,20 m, poteau plus long que
  la longueur fournie, portillons plus larges que le tracé, reliquat de panneau
  trop faible ;
- écarts signalés : hauteur de portillon très différente de celle de la clôture,
  finition d'accessoires indisponible sur le portillon, divergences entre fiche
  produit et notice.

## Architecture

```
index.html                 page unique (parcours + synthèse)
assets/css/styles.css      thème clair / sombre, impression
src/data/catalogue.js      cotes des notices + données produit (gammes, coloris,
                           décors, accessoires, portillon)
src/data/tarifs.js         grille tarifaire (DÉMONSTRATION — à remplacer)
src/core/calepinage.js     moteur de calcul (fonctions pures, testées)
src/core/nomenclature.js   nomenclature valorisée + export CSV
src/ui/app.js              parcours en étapes, rendu, événements
src/ui/apercu.js           aperçus SVG (élévation d'un panneau, vue en plan)
src/ui/etat.js             persistance locale et lien de partage
tests/                     tests node:test du moteur et de la nomenclature
vercel.json                configuration d'hébergement statique
```

La séparation `core` / `ui` permet de réutiliser le moteur ailleurs (API,
back-office, script de chiffrage) : `calepiner()` et `construireNomenclature()`
ne dépendent ni du DOM ni d'un framework.

## Adapter à votre catalogue

| Besoin | Fichier |
|--------|---------|
| Prix | `src/data/tarifs.js` — remplacer `TARIF_DEMO` par votre tarif et passer `reel: true`, ou mettre `TARIF_ACTIF = null` pour n'afficher que les quantités |
| Gammes, cotes de lame, hauteurs maxi | `src/data/catalogue.js` (`GAMMES`) |
| Coloris, décors, accessoires, portillon | `src/data/catalogue.js` (`FINITIONS_ACCESSOIRES`, `DECORS`, `ACCESSOIRES`, `OUVRANTS`) |
| Règles de calcul | `src/core/calepinage.js` |

## Limites connues

- **Les prix affichés sont des prix de démonstration**, ils ne proviennent
  d'aucun tarif fabricant.
- La gamme **Élégance** est citée par la notice PU11 mais sa fiche produit n'a
  pas été consultée : elle reste dans le catalogue (`proposeAuConfigurateur:
  false`) sans être proposée au client, comme dans le configurateur du fabricant.
- Aucun **portail** n'est proposé : seule la fiche du portillon aluminium est
  documentée. L'emprise en pose sur poteaux (1260 mm) additionne la largeur
  entre poteaux et deux poteaux de 100 mm, ce qui reste une interprétation de la
  fiche.
- Deux **incohérences du catalogue** sont signalées plutôt que tranchées :
  coloris d'accessoires (nuancier contre texte) et caractère optionnel des
  lisses sur les lames aluminium (fiche contre notice).
- Les angles sont traités à **90 degrés** (poteau grand vent 3 en 1) ; un autre
  angle demande une étude spécifique, comme l'indiquent les notices.
- Le **volume de béton** par poteau scellé est une estimation (trou de
  300 x 300 x 600 mm) et non une valeur de notice.
- L'estimation porte sur les **fournitures** : ni pose, ni livraison, ni
  terrassement, ni évacuation des chutes.
- Le configurateur ne remplace pas la lecture intégrale des notices de montage
  avant chantier.
