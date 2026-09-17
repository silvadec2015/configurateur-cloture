/**
 * Grille tarifaire de DEMONSTRATION (euros HT).
 *
 * ATTENTION : ces montants ne proviennent d'aucun tarif fabricant. Ils servent
 * uniquement a faire fonctionner l'estimation du configurateur. Remplacez-les
 * par votre propre tarif avant toute utilisation commerciale, ou passez
 * `TARIF_ACTIF = null` pour n'afficher que les quantites.
 */

export const TARIF_DEMO = {
  devise: 'EUR',
  libelle: 'Tarif de demonstration (a remplacer)',
  reel: false,
  prix: {
    // Poteaux et fixations
    poteau: 89.0,
    poteau_angle: 99.0,
    platine: 46.0,
    goujon: 2.4,
    capot: 7.5,
    capot_mural: 9.0,
    baguette_finition: 12.0,
    beton_L: 0.25,
    // Lames
    lame_pu11: 34.0,
    lame_pu36: 39.0,
    lame_pu41: 44.0,
    lame_debut_fin_pu41: 38.0,
    entretoise: 3.2,
    // Lisses et connecteurs
    lisse_haute: 21.0,
    lisse_basse: 21.0,
    lisse_intermediaire: 14.0,
    connecteur: 4.5,
    plaque_soubassement: 58.0,
    // Decors
    decor_horizontal: 129.0,
    decor_vertical: 189.0,
    // Ouvrants (a confirmer au catalogue)
    portillon: 690.0,
    portail: 1690.0,
  },
};

/** Tarif utilise par l'application. Mettre a `null` pour masquer les prix. */
export const TARIF_ACTIF = TARIF_DEMO;

export function prixUnitaire(ref, tarif = TARIF_ACTIF) {
  if (!tarif) return null;
  const p = tarif.prix[ref];
  return typeof p === 'number' ? p : null;
}
