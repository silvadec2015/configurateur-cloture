/**
 * Construction de la nomenclature (liste de colisage / devis) à partir du
 * résultat de calepinage, puis valorisation avec la grille tarifaire active.
 *
 * Les désignations reprennent celles des fiches produit et de la page
 * "Accessoires de montage clôture".
 */

import { ACCESSOIRES, getPoseOuvrant } from '../data/catalogue.js';
import { TARIF_ACTIF, prixUnitaire } from '../data/tarifs.js';

/**
 * @param {object} calepinage résultat de `calepiner()`
 * @param {object|null} tarif grille tarifaire (null = quantités seules)
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

  const a = ACCESSOIRES;

  // --- Structure -----------------------------------------------------------
  ajoute(
    'poteau',
    a.poteau.nom,
    q.nbPoteauxPleins,
    'u',
    `${a.poteau.detail}. À recouper à ${hauteurs.longueurPoteau} mm (fourni en ${gamme.poteau.longueurFournie} mm)`
  );
  ajoute('demi_poteau_mural', a.demi_poteau_mural.nom, q.nbDemiPoteauxMuraux, 'u', a.demi_poteau_mural.detail);
  ajoute('platine', a.platine.nom, q.nbPlatines, 'u', 'Sur dalle béton pleine de 20 cm mini');
  ajoute('goujon', a.goujon.nom, q.nbGoujons, 'u', a.goujon.detail);
  ajoute('capot', a.capot.nom, q.nbCapots, 'u', a.capot.detail);
  ajoute('demi_capot_mural', a.demi_capot_mural.nom, q.nbDemiCapotsMuraux, 'u', a.demi_capot_mural.detail);
  ajoute('baguette_finition', a.baguette_finition.nom, q.nbBaguettes, 'u', a.baguette_finition.detail);
  ajoute('beton_L', 'Béton de scellement (estimation)', q.volumeBeton_L, 'L', 'Trou 300 x 300 x 600 mm par poteau');

  // --- Remplissage, habillage par habillage ------------------------------
  for (const c of calepinage.compositions.filter((x) => x.nbPanneaux > 0)) {
    const g = c.gamme;
    const q = c.quantites;
    const cote = `${g.lame.hauteur} x ${g.lame.epaisseur ?? '?'} x ${g.lame.longueur} mm`;
    const panneaux = `${c.nbPanneaux} panneau${c.nbPanneaux > 1 ? 'x' : ''} de ${c.nbLames} lames`;

    if (g.id === 'persienne') {
      ajoute('lame_persienne_debut_fin', 'Lame persienne début / fin', q.lamesDebutFin, 'u',
        '2 par panneau, une en bas et une en haut');
      ajoute('lame_persienne', g.produit, q.lamesCourantes, 'u', `${cote} — ${panneaux}`);
    } else {
      ajoute(`lame_${g.id}`, g.produit, q.nbLamesTotal, 'u', `${cote} — ${panneaux}`);
    }
    ajoute(q.typeEntretoise, ACCESSOIRES[q.typeEntretoise].nom, q.nbEntretoises, 'u',
      ACCESSOIRES[q.typeEntretoise].detail);
    ajoute('lisse', `${a.lisse.nom} (${g.nom})`, q.nbLisseHaute + q.nbLisseBasse, 'u', a.lisse.detail);
    ajoute('lisse_intermediaire', `${a.lisse_intermediaire.nom} (${g.nom})`, q.nbLisseInter, 'u',
      a.lisse_intermediaire.detail);
    ajoute('plaque_soubassement', a.plaque_soubassement.nom, q.nbPlaqueSoubassement, 'u',
      a.plaque_soubassement.detail);
  }
  ajoute('connecteur', a.connecteur.nom, calepinage.quantites.nbConnecteurs, 'u', a.connecteur.detail);

  // --- Décors et ouvrants --------------------------------------------------
  ajoute('decor_horizontal', 'Décor horizontal en aluminium', q.decorsHorizontaux, 'u', 'Hauteur 300 mm, remplace 2 lames empilées');
  ajoute('decor_vertical', 'Décor vertical en aluminium', q.decorsVerticaux, 'u', `Panneau dédié, entraxe 855 mm - ${gamme.decorVertical.panneau}`);
  if (ouvrant.type) {
    const pose = getPoseOuvrant(ouvrant, config.poseOuvrant);
    ajoute(
      ouvrant.id,
      ouvrant.nom,
      q.nbOuvrants,
      'u',
      `Vantail ${ouvrant.vantail.largeur} x ${ouvrant.vantail.hauteur} mm, ${pose.nom.toLowerCase()}`
    );
    ajoute(
      'poteau_portillon',
      'Poteau de portillon',
      q.nbPoteauxOuvrant,
      'u',
      `${ouvrant.poteau.section}, longueur ${ouvrant.poteau.longueur} mm`
    );
  }

  // Deux habillages peuvent produire la meme reference : on regroupe.
  const regroupees = [];
  for (const ligne of lignes) {
    const jumelle = regroupees.find((l) => l.ref === ligne.ref && l.designation === ligne.designation);
    if (jumelle) {
      jumelle.quantite = Math.round((jumelle.quantite + ligne.quantite) * 100) / 100;
      jumelle.total = jumelle.prixUnitaire === null
        ? null
        : Math.round(jumelle.prixUnitaire * jumelle.quantite * 100) / 100;
    } else {
      regroupees.push(ligne);
    }
  }
  lignes.length = 0;
  lignes.push(...regroupees);

  const valorisable = lignes.every((l) => l.prixUnitaire !== null);
  const total = tarif && valorisable
    ? Math.round(lignes.reduce((t, l) => t + (l.total || 0), 0) * 100) / 100
    : null;

  return {
    lignes,
    total,
    tarif,
    resume: {
      habillages: calepinage.compositions
        .filter((c) => c.nbPanneaux > 0)
        .map((c) => ({ gamme: c.gamme.nom, produit: c.gamme.produit, panneaux: c.nbPanneaux, lames: c.nbLames })),
      gamme: gamme.nom,
      produit: gamme.produit,
      notice: gamme.notice,
      hauteurCloture: hauteurs.empilement,
      longueurPoteau: hauteurs.longueurPoteau,
      longueurCloture: longueurs.longueurCloture,
      nbPanneaux: longueurs.nbPanneauxTotal,
      pose: config.pose,
      coloris: config.coloris,
      finitionAccessoires: config.finitionAccessoires,
    },
  };
}

/** Export CSV de la nomenclature (separateur point-virgule, compatible Excel FR). */
export function nomenclatureVersCSV(nomenclature) {
  const entete = ['Référence', 'Désignation', 'Détail', 'Quantité', 'Unité', 'PU HT', 'Total HT'];
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
