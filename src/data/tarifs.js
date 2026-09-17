/**
 * Grille tarifaire de DEMONSTRATION (euros HT).
 *
 * ATTENTION : ces montants ne proviennent d’aucun tarif fabricant. Ils servent
 * uniquement a faire fonctionner l’estimation du configurateur. Remplacez-les
 * par votre propre tarif avant toute utilisation commerciale, ou passez
 * `TARIF_ACTIF = null` pour n’afficher que les quantites.
 *
 * Les cles correspondent aux references utilisees par `nomenclature.js`.
 */

export const TARIF_DEMO = {
  devise: 'EUR',
  libelle: 'Tarif de démonstration (a remplacer)',
  reel: false,
  prix: {
    // Structure
    poteau: 89.0,
    demi_poteau_mural: 64.0,
    poteau_portillon: 119.0,
    platine: 46.0,
    goujon: 2.4,
    capot: 7.5,
    demi_capot_mural: 6.0,
    baguette_finition: 12.0,
    beton_L: 0.25,
    // Lames
    lame_atmosphere: 34.0,
    lame_elegance: 31.0,
    lame_aluminium: 39.0,
    lame_persienne: 44.0,
    lame_persienne_debut_fin: 38.0,
    entretoise_aluminium: 3.2,
    entretoise_persienne: 4.1,
    // Lisses et connecteurs
    lisse: 21.0,
    lisse_intermediaire: 14.0,
    connecteur: 4.5,
    plaque_soubassement: 58.0,
    kit_pose_verticale: 19.0,
    // Décors
    decor_horizontal: 129.0,
    decor_vertical: 189.0,
    // Ouvrants
    portillon_aluminium: 690.0,
  },
};

/** Tarif utilise par l’application. Mettre a `null` pour masquer les prix. */
export const TARIF_ACTIF = TARIF_DEMO;

export function prixUnitaire(ref, tarif = TARIF_ACTIF) {
  if (!tarif) return null;
  const p = tarif.prix[ref];
  return typeof p === 'number' ? p : null;
}
