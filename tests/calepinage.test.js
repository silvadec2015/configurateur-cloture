import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIG_DEFAUT,
  calepiner,
  decoupeTravees,
  hauteurEmpilement,
  nbLamesPourHauteur,
  nbLissesIntermediaires,
  calculPoteau,
} from '../src/core/calepinage.js';
import { GAMMES, REGLES_COMMUNES } from '../src/data/catalogue.js';

const config = (surcharge) => ({ ...CONFIG_DEFAUT, ...surcharge });

test('PU11 : 8 lames = 2 lisses intermediaires, 11 lames = 3 (notice p.6)', () => {
  assert.equal(nbLissesIntermediaires(GAMMES.pu11, 8), 2);
  assert.equal(nbLissesIntermediaires(GAMMES.pu11, 11), 3);
  assert.equal(nbLissesIntermediaires(GAMMES.pu11, 3), 0);
});

test('PU36 et PU41 : aucune lisse intermediaire imposee', () => {
  assert.equal(nbLissesIntermediaires(GAMMES.pu36, 12), 0);
  assert.equal(nbLissesIntermediaires(GAMMES.pu41, 12), 0);
});

test('PU11 : empilement 8 lames + lisse basse + lisse haute = 1200 mm', () => {
  const { hauteur } = hauteurEmpilement(config({ gamme: 'pu11', nbLames: 8 }));
  assert.equal(hauteur, 1200);
});

test('PU41 : 12 lames = 1745 mm (table constructeur PU41 p.1)', () => {
  const { hauteur } = hauteurEmpilement(config({ gamme: 'pu41', nbLames: 12 }));
  assert.equal(hauteur, GAMMES.pu41.tableConstructeur[0].hauteurClaustra);
});

test('PU36 ajoure : les entretoises augmentent la hauteur d empilement', () => {
  const plein = hauteurEmpilement(config({ gamme: 'pu36', nbLames: 10, variante: 'plein' })).hauteur;
  const ajoure = hauteurEmpilement(config({ gamme: 'pu36', nbLames: 10, variante: 'ajoure' })).hauteur;
  assert.ok(ajoure > plein, `${ajoure} devrait depasser ${plein}`);
});

test('La hauteur visee retourne le nombre de lames le plus proche', () => {
  const { nbLames, hauteur } = nbLamesPourHauteur(config({ gamme: 'pu11' }), 1200);
  assert.equal(nbLames, 8);
  assert.equal(hauteur, 1200);
});

test('Poteau : la table constructeur prime sur le calcul', () => {
  const p = calculPoteau(config({ gamme: 'pu41', nbLames: 12, pose: 'scellement' }), 1745);
  assert.equal(p.longueurPoteau, 2245);
  assert.match(p.sourceHauteur, /table/);
  assert.equal(p.alertes.filter((a) => a.niveau === 'erreur').length, 0);
});

test('Poteau : pose sur platines refusee au-dela de la limite de la notice', () => {
  const p = calculPoteau(config({ gamme: 'pu41', nbLames: 16, pose: 'platine' }), 2324);
  assert.ok(p.alertes.some((a) => a.niveau === 'erreur' && /platines double coque/.test(a.message)));
});

test('Muret : muret + claustra limites a 2200 mm', () => {
  const p = calculPoteau(config({ gamme: 'pu11', nbLames: 8, pose: 'muret', hauteurMuret: 1100 }), 1200);
  assert.ok(p.alertes.some((a) => a.niveau === 'erreur' && /2200/.test(a.message)));
});

test('Travees : 12 m = 6 travees pleines de 1800 mm + 1 travee recoupee de 1200 mm', () => {
  const d = decoupeTravees(12000);
  assert.equal(d.pleines, 6);
  assert.equal(d.reste, 1200);
  assert.equal(d.traveeRecoupee.largeur, 1200);
});

test('Travees : un reliquat trop faible declenche un avertissement', () => {
  const d = decoupeTravees(3700);
  assert.equal(d.pleines, 2);
  assert.equal(d.traveeRecoupee, null);
  assert.equal(d.alertes[0].niveau, 'avertissement');
});

test('Travees : multiple exact de l entraxe, pas de recoupe', () => {
  const d = decoupeTravees(9000);
  assert.equal(d.pleines, 5);
  assert.equal(d.traveeRecoupee, null);
  assert.equal(d.alertes.length, 0);
});

test('Projet complet : poteaux = travees + 1 (+ 1 par ouvrant)', () => {
  const r = calepiner(config({
    gamme: 'pu11', nbLames: 8, segments: [{ longueur: 9000 }, { longueur: 5400 }],
    ouvrant: 'portillon_1000', nbOuvrants: 1,
  }));
  assert.equal(r.longueurs.longueurClaustra, 13400);
  assert.equal(r.longueurs.nbTraveesClaustra, 8); // 7 pleines + 1 recoupee de 800 mm
  assert.equal(r.quantites.nbPoteaux, r.longueurs.nbTraveesTotal + 1 + 1);
  assert.equal(r.quantites.nbPoteauxAngle, 1);
});

test('Projet complet : platines et goujons suivent le nombre de poteaux', () => {
  const r = calepiner(config({ gamme: 'pu36', nbLames: 12, pose: 'platine', segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbPlatines, r.quantites.nbPoteaux);
  assert.equal(r.quantites.nbGoujons, r.quantites.nbPoteaux * REGLES_COMMUNES.goujonsParPlatine);
  assert.equal(r.quantites.volumeBeton_L, 0);
});

test('Scellement : pas de platine, volume de beton estime par poteau', () => {
  const r = calepiner(config({ gamme: 'pu36', nbLames: 12, pose: 'scellement', segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbPlatines, 0);
  assert.equal(r.quantites.volumeBeton_L, r.quantites.nbPoteaux * REGLES_COMMUNES.volumeBetonParPoteau_L);
});

test('Decor horizontal : remplace 2 lames par travee equipee', () => {
  const base = calepiner(config({ gamme: 'pu11', nbLames: 8, segments: [{ longueur: 9000 }] }));
  const avecDecor = calepiner(config({ gamme: 'pu11', nbLames: 8, segments: [{ longueur: 9000 }], decorsHorizontaux: 2 }));
  assert.equal(avecDecor.quantites.nbLamesTotal, base.quantites.nbLamesTotal - 4);
  assert.equal(avecDecor.quantites.decorsHorizontaux, 2);
});

test('Decor horizontal PU41 : 4 lames debut/fin au lieu de 2', () => {
  const r = calepiner(config({ gamme: 'pu41', nbLames: 12, segments: [{ longueur: 1800 }], decorsHorizontaux: 1 }));
  assert.equal(r.quantites.lamesDebutFin, 4);
});

test('Decor vertical : consomme 855 mm et ne porte ni lisse ni lame', () => {
  const r = calepiner(config({ gamme: 'pu36', nbLames: 12, segments: [{ longueur: 10455 }], decorsVerticaux: 1 }));
  assert.equal(r.longueurs.longueurClaustra, 9600);
  assert.equal(r.longueurs.nbTraveesTotal, r.longueurs.nbTraveesClaustra + 1);
  assert.equal(r.quantites.nbLisseHaute, r.longueurs.nbTraveesClaustra);
});

test('PU41 : 2 entretoises par lame', () => {
  const r = calepiner(config({ gamme: 'pu41', nbLames: 12, segments: [{ longueur: 1800 }] }));
  assert.equal(r.quantites.nbLamesTotal, 12);
  assert.equal(r.quantites.nbEntretoises, 24);
});

test('Ouvrants trop larges pour le trace : erreur bloquante', () => {
  const r = calepiner(config({ segments: [{ longueur: 2000 }], ouvrant: 'portail_3500', nbOuvrants: 1 }));
  assert.ok(r.alertes.some((a) => a.niveau === 'erreur' && /depassent la longueur totale/.test(a.message)));
});

test('Connecteurs : 2 par lisse haute et par lisse basse', () => {
  const r = calepiner(config({ gamme: 'pu11', nbLames: 8, segments: [{ longueur: 9000 }] }));
  assert.equal(r.quantites.nbConnecteurs, (r.quantites.nbLisseHaute + r.quantites.nbLisseBasse) * 2);
});
