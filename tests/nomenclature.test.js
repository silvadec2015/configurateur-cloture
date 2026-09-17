import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG_DEFAUT, calepiner } from '../src/core/calepinage.js';
import { construireNomenclature, nomenclatureVersCSV } from '../src/core/nomenclature.js';
import { TARIF_DEMO } from '../src/data/tarifs.js';

const projet = calepiner({
  ...CONFIG_DEFAUT,
  gamme: 'pu11',
  nbLames: 8,
  pose: 'platine',
  segments: [{ longueur: 9000 }],
});

test('Chaque quantite du calepinage se retrouve dans la nomenclature', () => {
  const n = construireNomenclature(projet, TARIF_DEMO);
  const ligne = (ref) => n.lignes.find((l) => l.ref === ref);
  assert.equal(ligne('lame_pu11').quantite, projet.quantites.nbLamesTotal);
  assert.equal(ligne('platine').quantite, projet.quantites.nbPlatines);
  assert.equal(ligne('goujon').quantite, projet.quantites.nbGoujons);
  assert.equal(ligne('lisse_haute').quantite, projet.quantites.nbLisseHaute);
  assert.equal(ligne('connecteur').quantite, projet.quantites.nbConnecteurs);
});

test('Le total correspond a la somme des lignes', () => {
  const n = construireNomenclature(projet, TARIF_DEMO);
  const somme = n.lignes.reduce((t, l) => t + l.total, 0);
  assert.ok(Math.abs(n.total - somme) < 0.05);
});

test('Sans tarif, les prix sont nuls et le total masque', () => {
  const n = construireNomenclature(projet, null);
  assert.equal(n.total, null);
  assert.ok(n.lignes.every((l) => l.prixUnitaire === null));
});

test('Aucune ligne a quantite nulle ou negative', () => {
  const n = construireNomenclature(projet, TARIF_DEMO);
  assert.ok(n.lignes.every((l) => l.quantite > 0));
});

test('Export CSV : un en-tete, une ligne par article et un total', () => {
  const n = construireNomenclature(projet, TARIF_DEMO);
  const lignes = nomenclatureVersCSV(n).split('\n');
  assert.equal(lignes.length, n.lignes.length + 2);
  assert.ok(lignes[0].startsWith('Reference;Designation'));
  assert.ok(lignes.at(-1).includes('TOTAL HT'));
});

test('Le tarif de demonstration est explicitement marque comme non reel', () => {
  assert.equal(TARIF_DEMO.reel, false);
});
