/**
 * Construction de la nomenclature (liste de colisage / devis) a partir du
 * resultat de calepinage, puis valorisation avec la grille tarifaire active.
 */

import { TARIF_ACTIF, prixUnitaire } from '../data/tarifs.js';

/**
 * @param {object} calepinage resultat de `calepiner()`
 * @param {object|null} tarif grille tarifaire (null = quantites seules)
 * @returns {{lignes:Array, total:number|null, tarif:object|null}}
 */
export function construireNomenclature(calepinage, tarif = TARIF_ACTIF) {
  const { gamme, config, ouvrant, quantites: q, hauteurs, longueurs } = calepinage;
  const lignes = [];

  const ajoute = (ref, designation, quantite, unite = 'u', detail = '') => {
    if (!quantite || quantite <= 0) return;
    const pu = prixUnitaire(ref, tarif);
    lignes.push({
      ref,
      designation,
      detail,
      quantite: Math.round(quantite * 100) / 100,
      unite,
      prixUnitaire: pu,
      total: pu === null ? null : Math.round(pu * quantite * 100) / 100,
    });
  };

  // --- Structure -----------------------------------------------------------
  ajoute(
    'poteau',
    'Poteau aluminium (droit / depart-fin)',
    q.nbPoteaux - q.nbPoteauxAngle,
    'u',
    `A recouper a ${hauteurs.longueurPoteau} mm (fourni en ${gamme.poteau.longueurFournie} mm)`
  );
  ajoute(
    'poteau_angle',
    'Poteau 3 en 1 pour angle a 90 degres',
    q.nbPoteauxAngle,
    'u',
    'Haubanage imperatif des poteaux d angle'
  );
  ajoute('platine', 'Platine double coque', q.nbPlatines, 'u', 'Sur dalle beton pleine de 20 cm mini');
  ajoute('goujon', 'Goujon d ancrage inox M10', q.nbGoujons, 'u', '4 par platine');
  ajoute('capot', 'Capot de poteau', q.nbCapots, 'u');
  ajoute('capot_mural', 'Capot mural / fixation murale', q.nbCapotsMuraux, 'u');
  ajoute('baguette_finition', 'Baguette de finition', q.nbBaguettes, 'u');
  ajoute('beton_L', 'Beton de scellement (estimation)', q.volumeBeton_L, 'L', 'Trou 300 x 300 x 600 mm par poteau');

  // --- Remplissage ---------------------------------------------------------
  if (gamme.id === 'pu41') {
    ajoute('lame_debut_fin_pu41', 'Lame debut / fin persienne', q.lamesDebutFin, 'u');
    ajoute('lame_pu41', 'Lame persienne aluminium', q.lamesCourantes, 'u', `Longueur ${gamme.longueurLame} mm`);
  } else {
    const ref = gamme.id === 'pu36' ? 'lame_pu36' : 'lame_pu11';
    const nom = gamme.id === 'pu36' ? 'Lame aluminium' : 'Lame bois composite';
    ajoute(ref, nom, q.nbLamesTotal, 'u', `Longueur ${gamme.longueurLame} mm`);
  }
  ajoute('entretoise', 'Entretoise (cote A / cote B)', q.nbEntretoises, 'u');
  ajoute('lisse_haute', 'Lisse haute (pose imperative)', q.nbLisseHaute, 'u');
  ajoute('lisse_basse', 'Lisse basse', q.nbLisseBasse, 'u');
  ajoute('lisse_intermediaire', 'Lisse intermediaire', q.nbLisseInter, 'u', 'Maxi 3 lames entre 2 lisses');
  ajoute('plaque_soubassement', 'Plaque de soubassement aluminium', q.nbPlaqueSoubassement, 'u');
  ajoute('connecteur', 'Connecteur de lisse', q.nbConnecteurs, 'u', '2 par lisse haute / basse');

  // --- Decors et ouvrants --------------------------------------------------
  ajoute('decor_horizontal', 'Decor horizontal (Mineral / Vegetal / Urbain)', q.decorsHorizontaux, 'u', 'Remplace 2 lames empilees');
  ajoute('decor_vertical', 'Decor vertical (panneau)', q.decorsVerticaux, 'u', `Entraxe poteaux 855 mm - ${gamme.decorVertical.panneau}`);
  if (ouvrant.type) {
    ajoute(ouvrant.type, ouvrant.nom, q.nbOuvrants, 'u', 'Cotes et quincaillerie a confirmer au catalogue');
  }

  const valorisable = lignes.every((l) => l.prixUnitaire !== null);
  const total = tarif && valorisable
    ? Math.round(lignes.reduce((t, l) => t + (l.total || 0), 0) * 100) / 100
    : null;

  return {
    lignes,
    total,
    tarif,
    resume: {
      gamme: gamme.nom,
      notice: gamme.notice,
      hauteurClaustra: hauteurs.empilement,
      longueurPoteau: hauteurs.longueurPoteau,
      longueurClaustra: longueurs.longueurClaustra,
      nbTravees: longueurs.nbTraveesTotal,
      pose: config.pose,
      coloris: config.coloris,
    },
  };
}

/** Export CSV de la nomenclature (separateur point-virgule, compatible Excel FR). */
export function nomenclatureVersCSV(nomenclature) {
  const entete = ['Reference', 'Designation', 'Detail', 'Quantite', 'Unite', 'PU HT', 'Total HT'];
  const lignes = nomenclature.lignes.map((l) =>
    [l.ref, l.designation, l.detail, l.quantite, l.unite, l.prixUnitaire ?? '', l.total ?? '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(';')
  );
  if (nomenclature.total !== null) {
    lignes.push(['', 'TOTAL HT', '', '', '', '', nomenclature.total].map((v) => `"${v}"`).join(';'));
  }
  return [entete.join(';'), ...lignes].join('\n');
}
