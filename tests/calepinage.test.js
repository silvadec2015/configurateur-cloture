import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIG_DEFAUT,
  calepiner,
  decoupePanneaux,
  hauteurEmpilement,
  nbLamesPourHauteur,
  nbLissesIntermediaires,
  calculPoteau,
} from '../src/core/calepinage.js';
import { GAMMES, REGLES_COMMUNES } from '../src/data/catalogue.js';

const config = (surcharge) => ({ ...CONFIG_DEFAUT, ...surcharge });

test('Composite : 8 lames = 2 lisses intermédiaires, 11 lames = 3 (notice p.6)', () => {
  assert.equal(nbLissesIntermediaires(GAMMES.atmosphere, 8), 2);
  assert.equal(nbLissesIntermediaires(GAMMES.atmosphere, 11), 3);
  assert.equal(nbLissesIntermediaires(GAMMES.atmosphere, 3), 0);
});

test('Aluminium et persienne : aucune lisse intermédiaire imposee', () => {
  assert.equal(nbLissesIntermediaires(GAMMES.aluminium, 12), 0);
  assert.equal(nbLissesIntermediaires(GAMMES.persienne, 12), 0);
});

test('Composite : empilement 8 lames + lisse basse + lisse haute = 1200 mm', () => {
  const { hauteur } = hauteurEmpilement(config({ gamme: 'atmosphere', nbLames: 8 }));
  assert.equal(hauteur, 1200);
});

test('Persienne : 12 lames = 1745 mm (table constructeur PU41 p.1)', () => {
  const { hauteur } = hauteurEmpilement(config({ gamme: 'persienne', nbLames: 12 }));
  assert.equal(hauteur, GAMMES.persienne.tableConstructeur[0].hauteurCloture);
});

test('Aluminium ajoure : les entretoises augmentent la hauteur d empilement', () => {
  const plein = hauteurEmpilement(config({ gamme: 'aluminium', nbLames: 10, variante: 'plein' })).hauteur;
  const ajoure = hauteurEmpilement(config({ gamme: 'aluminium', nbLames: 10, variante: 'ajoure' })).hauteur;
  assert.ok(ajoure > plein, `${ajoure} devrait depasser ${plein}`);
});

test('La hauteur visée retourne le nombre de lames le plus proche', () => {
  const { nbLames, hauteur } = nbLamesPourHauteur(config({ gamme: 'atmosphere' }), 1200);
  assert.equal(nbLames, 8);
  assert.equal(hauteur, 1200);
});

test('Poteau : la table constructeur prime sur le calcul', () => {
  const p = calculPoteau(config({ gamme: 'persienne', nbLames: 12, pose: 'scellement' }), 1745);
  assert.equal(p.longueurPoteau, 2245);
  assert.match(p.sourceHauteur, /table/);
  assert.equal(p.alertes.filter((a) => a.niveau === 'erreur').length, 0);
});

test('Poteau : pose sur platines refusee au-dela de la limite de la notice', () => {
  const p = calculPoteau(config({ gamme: 'persienne', nbLames: 16, pose: 'platine' }), 2324);
  assert.ok(p.alertes.some((a) => a.niveau === 'erreur' && /platines double coque/.test(a.message)));
});

test('Muret : muret + claustra limites a 2200 mm', () => {
  const p = calculPoteau(config({ gamme: 'atmosphere', nbLames: 8, pose: 'muret', hauteurMuret: 1100 }), 1200);
  assert.ok(p.alertes.some((a) => a.niveau === 'erreur' && /2200/.test(a.message)));
});

test('Panneaux : 12 m = 6 panneaux pleines de 1800 mm + 1 panneau recoupée de 1200 mm', () => {
  const d = decoupePanneaux(12000);
  assert.equal(d.pleines, 6);
  assert.equal(d.reste, 1200);
  assert.equal(d.panneauRecoupe.largeur, 1200);
});

test('Panneaux : un reliquat trop faible declenche un avertissement', () => {
  const d = decoupePanneaux(3700);
  assert.equal(d.pleines, 2);
  assert.equal(d.panneauRecoupe, null);
  assert.equal(d.alertes[0].niveau, 'avertissement');
});

test('Panneaux : multiple exact de l entraxe, pas de recoupe', () => {
  const d = decoupePanneaux(9000);
  assert.equal(d.pleines, 5);
  assert.equal(d.panneauRecoupe, null);
  assert.equal(d.alertes.length, 0);
});

test('Projet complet : poteaux = panneaux + 1 (+ 1 par ouvrant)', () => {
  const r = calepiner(config({
    gamme: 'atmosphere', nbLames: 8, segments: [{ longueur: 9000 }, { longueur: 5400 }],
    ouvrant: 'portillon_aluminium', nbOuvrants: 1,
  }));
  // 14 400 mm de trace - 1 260 mm d’emprise du portillon pose sur poteaux
  assert.equal(r.longueurs.longueurCloture, 13140);
  assert.equal(r.longueurs.nbPanneauxLames, 8); // 7 pleins + 1 recoupe de 1 140 mm
  assert.equal(r.quantites.nbPoteaux, r.longueurs.nbPanneauxTotal + 1 + 1);
  assert.equal(r.quantites.nbPoteauxOuvrant, 2);
  assert.equal(r.quantites.nbPoteauxCloture, r.quantites.nbPoteaux - 2);
  assert.equal(r.quantites.nbPoteauxAngle, 1);
});

test('Projet complet : platines et goujons suivent le nombre de poteaux', () => {
  const r = calepiner(config({ gamme: 'aluminium', nbLames: 12, pose: 'platine', segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbPlatines, r.quantites.nbPoteauxCloture);
  assert.equal(r.quantites.nbGoujons, r.quantites.nbPoteauxCloture * REGLES_COMMUNES.goujonsParPlatine);
  assert.equal(r.quantites.volumeBeton_L, 0);
});

test('Scellement : pas de platine, volume de béton estimé par poteau', () => {
  const r = calepiner(config({ gamme: 'aluminium', nbLames: 12, pose: 'scellement', segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbPlatines, 0);
  assert.equal(r.quantites.volumeBeton_L, r.quantites.nbPoteaux * REGLES_COMMUNES.volumeBetonParPoteau_L);
});

test('Décor horizontal : remplace 2 lames par panneau equipee', () => {
  const base = calepiner(config({ gamme: 'atmosphere', nbLames: 8, segments: [{ longueur: 9000 }] }));
  const avecDecor = calepiner(config({ gamme: 'atmosphere', nbLames: 8, segments: [{ longueur: 9000 }], decorsHorizontaux: 2 }));
  assert.equal(avecDecor.quantites.nbLamesTotal, base.quantites.nbLamesTotal - 4);
  assert.equal(avecDecor.quantites.decorsHorizontaux, 2);
});

test('Décor horizontal Persienne : 4 lames début/fin au lieu de 2', () => {
  const r = calepiner(config({ gamme: 'persienne', nbLames: 12, segments: [{ longueur: 1800 }], decorsHorizontaux: 1 }));
  assert.equal(r.quantites.lamesDebutFin, 4);
});

test('Décor vertical : consomme 855 mm et ne porte ni lisse ni lame', () => {
  const r = calepiner(config({ gamme: 'aluminium', nbLames: 12, segments: [{ longueur: 10455 }], decorsVerticaux: 1 }));
  assert.equal(r.longueurs.longueurCloture, 9600);
  assert.equal(r.longueurs.nbPanneauxTotal, r.longueurs.nbPanneauxLames + 1);
  assert.equal(r.quantites.nbLisseHaute, r.longueurs.nbPanneauxLames);
});

test('Persienne : 2 entretoises par lame', () => {
  const r = calepiner(config({ gamme: 'persienne', nbLames: 12, segments: [{ longueur: 1800 }] }));
  assert.equal(r.quantites.nbLamesTotal, 12);
  assert.equal(r.quantites.nbEntretoises, 24);
});

test('Ouvrants trop larges pour le trace : erreur bloquante', () => {
  const r = calepiner(config({ segments: [{ longueur: 2000 }], ouvrant: 'portillon_aluminium', nbOuvrants: 2 }));
  assert.ok(r.alertes.some((a) => a.niveau === 'erreur' && /dépassent la longueur totale/.test(a.message)));
});

test('Connecteurs : 2 par lisse haute et par lisse basse', () => {
  const r = calepiner(config({ gamme: 'atmosphere', nbLames: 8, segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbConnecteurs, (r.quantites.nbLisseHaute + r.quantites.nbLisseBasse) * 2);
});

test('Portillon pose entre piliers maçonnés : aucun poteau Silvadec', () => {
  const surPoteaux = calepiner(config({ segments: [{ longueur: 12000 }], ouvrant: 'portillon_aluminium', nbOuvrants: 1, poseOuvrant: 'sur_poteaux' }));
  const entrePiliers = calepiner(config({ segments: [{ longueur: 12000 }], ouvrant: 'portillon_aluminium', nbOuvrants: 1, poseOuvrant: 'entre_piliers' }));
  assert.equal(surPoteaux.quantites.nbPoteauxOuvrant, 2);
  assert.equal(entrePiliers.quantites.nbPoteauxOuvrant, 0);
  assert.ok(entrePiliers.longueurs.longueurCloture > surPoteaux.longueurs.longueurCloture);
});

test('Départ mural : un demi-poteau et un demi-capot au lieu d un poteau', () => {
  const r = calepiner(config({ segments: [{ longueur: 9000 }], poteauxMuraux: 2 }));
  assert.equal(r.quantites.nbDemiPoteauxMuraux, 2);
  assert.equal(r.quantites.nbDemiCapotsMuraux, 2);
  assert.equal(r.quantites.nbPoteauxPleins, r.quantites.nbPoteauxCloture - 2);
  assert.equal(r.quantites.nbCapots, r.quantites.nbPoteauxPleins);
});

test('Panneau ajoure aluminium : les entretoises se cumulent', () => {
  const simple = calepiner(config({ gamme: 'aluminium', variante: 'ajoure', nbLames: 8, segments: [{ longueur: 1800 }] }));
  const double = calepiner(config({ gamme: 'aluminium', variante: 'ajoure', entretoisesEmpilees: 2, nbLames: 8, segments: [{ longueur: 1800 }] }));
  assert.equal(double.quantites.nbEntretoises, simple.quantites.nbEntretoises * 2);
  assert.ok(double.hauteurs.empilement > simple.hauteurs.empilement);
});

test('Entretoises : reference dédiée pour la lame persienne', () => {
  assert.equal(calepiner(config({ gamme: 'persienne', nbLames: 12 })).quantites.typeEntretoise, 'entretoise_persienne');
  assert.equal(calepiner(config({ gamme: 'aluminium', variante: 'ajoure', nbLames: 8 })).quantites.typeEntretoise, 'entretoise_aluminium');
});

test('Hauteur maxi annoncée par la fiche produit : 1,80 m', () => {
  const r = calepiner(config({ gamme: 'atmosphere', nbLames: 13, pose: 'scellement', segments: [{ longueur: 9000 }] }));
  assert.ok(r.hauteurs.empilement > GAMMES.atmosphere.hauteurMaxCloture);
  assert.ok(r.alertes.some((a) => a.niveau === 'erreur' && /1800 mm/.test(a.message)));
});

test('Lame : les cotes du catalogue correspondent aux notices', () => {
  assert.deepEqual(GAMMES.atmosphere.lame, { hauteur: 150, épaisseur: 21, longueur: 1783 });
  assert.deepEqual(GAMMES.aluminium.lame, { hauteur: 148, épaisseur: 21, longueur: 1797 });
  assert.deepEqual(GAMMES.persienne.lame, { hauteur: 127, épaisseur: 21, longueur: 1797 });
});
