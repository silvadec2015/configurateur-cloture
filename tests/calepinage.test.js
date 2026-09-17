import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIG_DEFAUT,
  calepiner,
  decoupePanneaux,
  hauteurEmpilement,
  lamesPourHauteur,
  nbLissesIntermediaires,
  repartirPanneaux,
  calculPoteau,
} from '../src/core/calepinage.js';
import { GAMMES, REGLES_COMMUNES, HAUTEURS_CLOTURE, HAUTEUR_MAX_CLOTURE, hauteurEnMetres } from '../src/data/catalogue.js';

const config = (surcharge) => ({ ...CONFIG_DEFAUT, ...surcharge });
const habillage = (id) => [{ gamme: id, panneaux: null }];

/* ------------------------------------------------------------- Hauteurs */

test('Composite : 8 lames = 2 lisses intermédiaires, 11 lames = 3 (PU11 V23 p.6)', () => {
  assert.equal(nbLissesIntermediaires(GAMMES.atmosphere, 8), 2);
  assert.equal(nbLissesIntermediaires(GAMMES.atmosphere, 11), 3);
  assert.equal(nbLissesIntermediaires(GAMMES.atmosphere, 3), 0);
});

test('Aluminium et persienne : aucune lisse intermédiaire imposée', () => {
  assert.equal(nbLissesIntermediaires(GAMMES.aluminium, 12), 0);
  assert.equal(nbLissesIntermediaires(GAMMES.persienne, 12), 0);
});

test('Atmosphère : 8 lames + lisse basse + lisse haute = 1200 mm', () => {
  assert.equal(hauteurEmpilement(config(), 'atmosphere', 8).hauteur, 1200);
});

test('Persienne : 12 lames = 1745 mm (table constructeur PU41 p.1)', () => {
  assert.equal(hauteurEmpilement(config(), 'persienne', 12).hauteur, GAMMES.persienne.tableConstructeur[0].hauteurCloture);
});

test('Panneau ajouré : les entretoises augmentent la hauteur', () => {
  const plein = hauteurEmpilement(config({ variante: 'plein' }), 'aluminium', 10).hauteur;
  const ajoure = hauteurEmpilement(config({ variante: 'ajoure' }), 'aluminium', 10).hauteur;
  assert.ok(ajoure > plein, `${ajoure} devrait dépasser ${plein}`);
});

test('Chaque hauteur du catalogue tombe sur un nombre entier de lames composite', () => {
  const attendus = { 1050: 7, 1200: 8, 1350: 9, 1500: 10, 1650: 11, 1800: 12 };
  for (const { valeur } of HAUTEURS_CLOTURE) {
    const { nbLames, hauteur } = lamesPourHauteur(config(), 'atmosphere', valeur);
    assert.equal(nbLames, attendus[valeur], `${valeur} mm`);
    assert.ok(Math.abs(hauteur - valeur) <= 15, `${valeur} mm -> ${hauteur} mm`);
  }
});

test('Aucune hauteur proposée ne dépasse 1,80 m', () => {
  for (const { valeur } of HAUTEURS_CLOTURE) assert.ok(valeur <= HAUTEUR_MAX_CLOTURE);
  for (const id of ['atmosphere', 'aluminium', 'persienne']) {
    const { hauteur } = lamesPourHauteur(config(), id, HAUTEUR_MAX_CLOTURE);
    assert.ok(hauteur <= HAUTEUR_MAX_CLOTURE, `${id} -> ${hauteur}`);
  }
});

test('Les hauteurs s’expriment en mètres comme au catalogue', () => {
  assert.equal(hauteurEnMetres(1800), '1m80');
  assert.equal(hauteurEnMetres(1050), '1m05');
  assert.equal(hauteurEnMetres(1745), '1m75');
});

/* -------------------------------------------------------------- Poteaux */

test('Poteau : la table constructeur prime sur le calcul', () => {
  const p = calculPoteau(config({ pose: 'scellement' }), 'persienne', 12, 1745);
  assert.equal(p.longueurPoteau, 2245);
  assert.match(p.sourceHauteur, /table/);
  assert.equal(p.alertes.filter((a) => a.niveau === 'erreur').length, 0);
});

test('Muret : muret + clôture limités à 2200 mm', () => {
  const r = calepiner(config({ pose: 'muret', hauteurMuret: 1100, hauteurCible: 1800, segments: [{ longueur: 9000 }] }));
  assert.ok(r.alertes.some((a) => a.niveau === 'erreur' && /2200/.test(a.message)));
});

/* ------------------------------------------------------------- Panneaux */

test('Panneaux : 12 m = 6 panneaux pleins + 1 panneau recoupé de 1200 mm', () => {
  const d = decoupePanneaux(12000);
  assert.equal(d.pleins, 6);
  assert.equal(d.panneauRecoupe.largeur, 1200);
});

test('Panneaux : un reliquat trop faible déclenche un avertissement', () => {
  const d = decoupePanneaux(3700);
  assert.equal(d.pleins, 2);
  assert.equal(d.panneauRecoupe, null);
  assert.equal(d.alertes[0].niveau, 'avertissement');
});

test('Panneaux : multiple exact de l’entraxe, pas de recoupe', () => {
  const d = decoupePanneaux(9000);
  assert.equal(d.pleins, 5);
  assert.equal(d.panneauRecoupe, null);
  assert.equal(d.alertes.length, 0);
});

/* ---------------------------------------------------------- Habillages */

test('Répartition automatique : les panneaux se partagent à parts égales', () => {
  const parts = repartirPanneaux([{ gamme: 'atmosphere' }, { gamme: 'aluminium' }], 7);
  assert.deepEqual(parts.map((p) => p.nbPanneaux), [4, 3]);
});

test('Répartition imposée : le solde revient à l’habillage libre', () => {
  const parts = repartirPanneaux([{ gamme: 'atmosphere', panneaux: 2 }, { gamme: 'persienne' }], 7);
  assert.deepEqual(parts.map((p) => p.nbPanneaux), [2, 5]);
});

test('Clôture mixte : chaque habillage a son propre nombre de lames', () => {
  const r = calepiner(config({
    hauteurCible: 1800,
    segments: [{ longueur: 14400 }],
    habillages: [{ gamme: 'atmosphere', panneaux: null }, { gamme: 'persienne', panneaux: null }],
  }));
  const [composite, persienne] = r.compositions;
  assert.equal(composite.nbPanneaux + persienne.nbPanneaux, r.longueurs.nbPanneauxLames);
  assert.equal(composite.hauteur, 1787);
  assert.equal(persienne.hauteur, 1745);
  assert.equal(r.quantites.nbLamesTotal, composite.quantites.nbLamesTotal + persienne.quantites.nbLamesTotal);
});

test('Clôture mixte : l’écart de hauteur entre habillages est signalé', () => {
  const r = calepiner(config({
    hauteurCible: 1800,
    segments: [{ longueur: 14400 }],
    habillages: [{ gamme: 'atmosphere', panneaux: null }, { gamme: 'persienne', panneaux: null }],
  }));
  assert.ok(r.alertes.some((a) => a.niveau === 'avertissement' && /même hauteur/.test(a.message)));
});

test('Clôture mixte : le poteau retenu satisfait l’habillage le plus haut', () => {
  const r = calepiner(config({
    hauteurCible: 1800,
    segments: [{ longueur: 14400 }],
    habillages: [{ gamme: 'atmosphere', panneaux: null }, { gamme: 'persienne', panneaux: null }],
  }));
  const maxi = Math.max(...r.compositions.map((c) => c.poteau.longueurPoteau));
  assert.equal(r.hauteurs.longueurPoteau, maxi);
});

/* --------------------------------------------------- Projet et quantités */

test('Projet complet : poteaux = panneaux + 1 (+ 1 par ouvrant)', () => {
  const r = calepiner(config({
    hauteurCible: 1200,
    typeTrace: 'angulaire',
    segments: [{ longueur: 9000 }, { longueur: 5400 }],
    ouvrant: 'portillon_aluminium', nbOuvrants: 1,
  }));
  assert.equal(r.longueurs.longueurCloture, 13140);
  assert.equal(r.quantites.nbPoteaux, r.longueurs.nbPanneauxTotal + 1 + 1);
  assert.equal(r.quantites.nbPoteauxOuvrant, 2);
  assert.equal(r.quantites.nbPoteauxAngle, 1);
});

test('Tracé linéaire : aucun poteau d’angle', () => {
  const r = calepiner(config({ typeTrace: 'lineaire', segments: [{ longueur: 12000 }] }));
  assert.equal(r.longueurs.nbAngles, 0);
  assert.equal(r.quantites.nbPoteauxAngle, 0);
});

test('Platines et goujons suivent les poteaux de clôture', () => {
  const r = calepiner(config({ habillages: habillage('aluminium'), pose: 'platine', segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbPlatines, r.quantites.nbPoteauxCloture);
  assert.equal(r.quantites.nbGoujons, r.quantites.nbPoteauxCloture * REGLES_COMMUNES.goujonsParPlatine);
  assert.equal(r.quantites.volumeBeton_L, 0);
});

test('Scellement : pas de platine, volume de béton estimé par poteau', () => {
  const r = calepiner(config({ habillages: habillage('aluminium'), pose: 'scellement', segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbPlatines, 0);
  assert.equal(r.quantites.volumeBeton_L, r.quantites.nbPoteauxCloture * REGLES_COMMUNES.volumeBetonParPoteau_L);
});

test('Décor horizontal : remplace 2 lames par panneau équipé', () => {
  const base = calepiner(config({ segments: [{ longueur: 9000 }] }));
  const avec = calepiner(config({ segments: [{ longueur: 9000 }], decorsHorizontaux: 2 }));
  assert.equal(avec.quantites.nbLamesTotal, base.quantites.nbLamesTotal - 4);
  assert.equal(avec.quantites.decorsHorizontaux, 2);
});

test('Décor horizontal persienne : 4 lames début/fin au lieu de 2', () => {
  const r = calepiner(config({
    habillages: habillage('persienne'), segments: [{ longueur: 1800 }], decorsHorizontaux: 1,
  }));
  assert.equal(r.compositions[0].quantites.lamesDebutFin, 4);
});

test('Décor vertical : consomme 855 mm et ne porte ni lisse ni lame', () => {
  const r = calepiner(config({ habillages: habillage('aluminium'), segments: [{ longueur: 10455 }], decorsVerticaux: 1 }));
  assert.equal(r.longueurs.longueurCloture, 9600);
  assert.equal(r.longueurs.nbPanneauxTotal, r.longueurs.nbPanneauxLames + 1);
  assert.equal(r.quantites.nbLisseHaute, r.longueurs.nbPanneauxLames);
});

test('Persienne : 2 entretoises par lame, référence dédiée', () => {
  const r = calepiner(config({ habillages: habillage('persienne'), hauteurCible: 1800, segments: [{ longueur: 1800 }] }));
  assert.equal(r.quantites.nbLamesTotal, 12);
  assert.equal(r.quantites.nbEntretoises, 24);
  assert.equal(r.compositions[0].quantites.typeEntretoise, 'entretoise_persienne');
});

test('Panneau ajouré aluminium : les entretoises se cumulent', () => {
  const base = { habillages: habillage('aluminium'), variante: 'ajoure', segments: [{ longueur: 1800 }] };
  const simple = calepiner(config(base));
  const double = calepiner(config({ ...base, entretoisesEmpilees: 2 }));
  // Empiler les entretoises double leur nombre par lame ; la hauteur visée
  // étant inchangée, le panneau compte alors moins de lames.
  const parLame = (r) => r.quantites.nbEntretoises / r.quantites.nbLamesTotal;
  assert.equal(parLame(double), parLame(simple) * 2);
  assert.ok(double.compositions[0].nbLames < simple.compositions[0].nbLames);
  assert.equal(double.compositions[0].quantites.typeEntretoise, 'entretoise_aluminium');
});

test('Départ mural : un demi-poteau et un demi-capot au lieu d’un poteau', () => {
  const r = calepiner(config({ segments: [{ longueur: 9000 }], poteauxMuraux: 2 }));
  assert.equal(r.quantites.nbDemiPoteauxMuraux, 2);
  assert.equal(r.quantites.nbDemiCapotsMuraux, 2);
  assert.equal(r.quantites.nbPoteauxPleins, r.quantites.nbPoteauxCloture - 2);
  assert.equal(r.quantites.nbCapots, r.quantites.nbPoteauxPleins);
});

test('Portillon posé entre piliers maçonnés : aucun poteau Silvadec', () => {
  const base = { segments: [{ longueur: 12000 }], ouvrant: 'portillon_aluminium', nbOuvrants: 1 };
  const surPoteaux = calepiner(config({ ...base, poseOuvrant: 'sur_poteaux' }));
  const entrePiliers = calepiner(config({ ...base, poseOuvrant: 'entre_piliers' }));
  assert.equal(surPoteaux.quantites.nbPoteauxOuvrant, 2);
  assert.equal(entrePiliers.quantites.nbPoteauxOuvrant, 0);
  assert.ok(entrePiliers.longueurs.longueurCloture > surPoteaux.longueurs.longueurCloture);
});

test('Ouvrants trop larges pour le tracé : erreur bloquante', () => {
  const r = calepiner(config({ segments: [{ longueur: 2000 }], ouvrant: 'portillon_aluminium', nbOuvrants: 2 }));
  assert.ok(r.alertes.some((a) => a.niveau === 'erreur' && /dépassent la longueur totale/.test(a.message)));
});

test('Connecteurs : 2 par lisse haute et par lisse basse', () => {
  const r = calepiner(config({ segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbConnecteurs, (r.quantites.nbLisseHaute + r.quantites.nbLisseBasse) * 2);
});

test('Lames : les cotes du catalogue correspondent aux fiches produit', () => {
  assert.deepEqual(GAMMES.atmosphere.lame, { hauteur: 150, epaisseur: 21, longueur: 1783 });
  assert.deepEqual(GAMMES.aluminium.lame, { hauteur: 148, epaisseur: 21, longueur: 1797 });
  assert.deepEqual(GAMMES.persienne.lame, { hauteur: 127, epaisseur: 21, longueur: 1797 });
});
