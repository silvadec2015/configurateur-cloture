/**
 * Catalogue technique des gammes de claustras / clotures.
 *
 * Toutes les cotes sont en millimetres et proviennent des notices de montage
 * fournies (chapitre "Elements techniques / Aide au calepinage") :
 *   - PU11 V23 : claustra bois composite
 *   - PU36 V3  : claustra aluminium (lames pleines ou panneau ajoure a entretoises)
 *   - PU41 V1  : claustra persienne aluminium
 *
 * La propriete `source` de chaque bloc indique la page de la notice d'origine.
 * Les valeurs marquees `A_VALIDER` ne figurent pas dans les notices : elles sont
 * donnees a titre d'hypothese de travail et doivent etre confirmees par le
 * fabricant avant toute exploitation commerciale.
 */

export const A_VALIDER = 'A_VALIDER';

/** Contraintes communes a toutes les gammes (notices PU11/PU36/PU41 p.1 et p.3). */
export const REGLES_COMMUNES = {
  entraxePoteaux: 1800,
  entraxeDecorVertical: 855,
  longueurPoteauFournie: 2315,
  profondeurScellement: 500,
  jeuMiniCapot: 15,
  hauteurMaxMuretPlusClaustra: 2200,
  goujonsParPlatine: 4,
  connecteursParLisse: 2,
  /** Largeur mini d'une travee recoupee acceptee par le configurateur. */
  largeurTraveeMini: 300,
  /** Volume de beton indicatif par poteau scelle (trou 300 x 300 x 600 mm). */
  volumeBetonParPoteau_L: 54,
  ventMaxKmH: 100,
};

export const GAMMES = {
  pu11: {
    id: 'pu11',
    nom: 'Claustra bois composite',
    notice: 'PU11 V23',
    materiau: 'Lames bois composite + poteaux aluminium',
    description:
      "Lames pleines en bois composite empilees dans la gorge des poteaux, avec lisse basse " +
      "(ou plaque de soubassement) et lisses intermediaires obligatoires.",
    source: 'PU11 V23 p.2, p.5, p.6',
    longueurLame: 1783,
    jeuDilatationLongueur: 7,
    empilement: {
      // Hauteurs d'empilement PU11 p.2
      premiereLame: 150, // lame hors tout
      lameSuivante: 146, // lame empilee sur une autre lame
      lisseHaute: 10,
      lisseBasse: 12,
      lisseIntermediaire: 3,
      supportPlatine: 23,
      jeuHautPoteau: 15,
      // PU11 p.6 : ne jamais empiler plus de 3 lames sans lisse intermediaire.
      lamesMaxEntreLisses: 3,
      entretoisesParLame: 0,
      /** Hauteur hors sol retenue pour une plaque de soubassement aluminium. */
      plaqueSoubassementHorsSol: 150,
    },
    poteau: {
      hauteurMaxPlatine: 1845,
      longueurFournie: REGLES_COMMUNES.longueurPoteauFournie,
      profondeurScellement: REGLES_COMMUNES.profondeurScellement,
    },
    lisseBasse: { obligatoire: true, alternatives: ['lisse_basse', 'plaque_soubassement'] },
    decorVertical: { entraxe: 855, panneau: '845 x 1787 mm', source: 'PU11 V23 p.9' },
    decorHorizontal: { remplaceLames: 2, lamesEncadrementSupp: 0, source: 'PU11 V23 p.9' },
    tableConstructeur: [],
  },

  pu36: {
    id: 'pu36',
    nom: 'Claustra aluminium',
    notice: 'PU36 V3',
    materiau: 'Lames et poteaux aluminium',
    description:
      "Lames aluminium empilees directement dans les poteaux (pose pleine, ni lisse basse " +
      "ni lisse intermediaire) ou montees en panneau ajoure avec entretoises.",
    source: 'PU36 V3 p.1, p.2, p.5',
    longueurLame: 1797,
    jeuDilatationLongueur: 3,
    empilement: {
      premiereLame: 150,
      lameSuivante: 146,
      lisseHaute: 10,
      lisseBasse: 0,
      lisseIntermediaire: 5,
      supportPlatine: 23,
      jeuHautPoteau: 15,
      lamesMaxEntreLisses: Infinity, // PU36 p.5 : pas de lisse intermediaire en pose pleine
      entretoisesParLame: 0,
      /** Variante panneau ajoure (PU36 p.2). */
      ajoure: {
        lameEntreEntretoises: 148,
        entretoise: 15,
        entretoisesParLame: 2, // cote A + cote B
      },
    },
    poteau: {
      hauteurMaxPlatine: 1845,
      longueurFournie: REGLES_COMMUNES.longueurPoteauFournie,
      profondeurScellement: REGLES_COMMUNES.profondeurScellement,
    },
    lisseBasse: { obligatoire: false, alternatives: [] },
    decorVertical: { entraxe: 855, panneau: '845 x 1787 mm', source: 'PU36 V3 p.10' },
    decorHorizontal: { remplaceLames: 2, lamesEncadrementSupp: 0, source: 'PU36 V3 p.10' },
    // PU36 p.1 : correspondance nombre de lames / hauteur commerciale.
    tableConstructeur: [
      { nbLames: 8, hauteurClaustra: 1200, poteauPlatine: 1260, poteauScellement: null },
      { nbLames: 12, hauteurClaustra: 1800, poteauPlatine: 1845, poteauScellement: 2315 },
    ],
  },

  pu41: {
    id: 'pu41',
    nom: 'Claustra persienne aluminium',
    notice: 'PU41 V1',
    materiau: 'Lames persiennes aluminium + entretoises',
    description:
      "Lames persiennes posees entre deux entretoises (cote A / cote B), encadrees par une " +
      "lame debut et une lame fin, et fermees par une lisse haute obligatoire.",
    source: 'PU41 V1 p.1, p.2, p.4',
    longueurLame: 1797,
    jeuDilatationLongueur: 3,
    empilement: {
      // PU41 p.2 : lame hors tout 127 mm, lisse haute 10 mm, support platine 23 mm,
      // jeu mini de 30 mm entre le haut de la lisse haute et le haut du poteau.
      hauteurLameHorsTout: 127,
      /**
       * Pas d'empilement reel (lame + entretoises) : cale sur la table constructeur
       * PU41 p.1 -> 12 lames (10 persiennes + 2 debut/fin) = 1745 mm lisse haute comprise.
       */
      pasLameEntretoise: 144.6,
      premiereLame: 144.6,
      lameSuivante: 144.6,
      lisseHaute: 10,
      lisseBasse: 0,
      lisseIntermediaire: 0,
      supportPlatine: 23,
      jeuHautPoteau: 30,
      lamesMaxEntreLisses: Infinity,
      entretoisesParLame: 2,
    },
    poteau: {
      // PU41 p.1 et p.3 : platine double coque limitee a 1745 mm de poteau hors sol.
      hauteurMaxPlatine: 1745,
      longueurFournie: REGLES_COMMUNES.longueurPoteauFournie,
      profondeurScellement: REGLES_COMMUNES.profondeurScellement,
    },
    lisseBasse: { obligatoire: false, alternatives: [] },
    decorVertical: { entraxe: 855, panneau: '845 x 1791 mm', source: 'PU41 V1 p.7' },
    // PU41 p.7 : un decor horizontal impose 4 lames debut/fin au lieu de 2.
    decorHorizontal: { remplaceLames: 2, lamesEncadrementSupp: 2, source: 'PU41 V1 p.7' },
    tableConstructeur: [
      { nbLames: 12, hauteurClaustra: 1745, poteauPlatine: 1760, poteauScellement: 2245 },
    ],
  },
};

/** Types de pose disponibles (notices p.3 et p.8). */
export const POSES = {
  platine: {
    id: 'platine',
    nom: 'Fixation sur platines double coque',
    aide: 'Dalle beton pleine, plane, 20 cm de large minimum. Support creux proscrit.',
    source: 'PU11/PU36/PU41 p.2-p.3',
  },
  scellement: {
    id: 'scellement',
    nom: 'Scellement beton',
    aide: 'Poteau enterre de 500 mm, entraxe de 1800 mm a controler pendant le sechage.',
    source: 'PU11/PU36/PU41 p.3-p.4',
  },
  muret: {
    id: 'muret',
    nom: 'Platines sur muret',
    aide: 'Hauteur totale muret + claustra limitee a 2,20 m pour des raisons de securite.',
    source: 'PU41 V1 p.3',
  },
};

/** Coloris proposes (gamme commerciale : a caler sur votre nuancier). */
export const COLORIS = [
  { id: 'gris_anthracite', nom: 'Gris anthracite', hex: '#3b3f44', gammes: ['pu11', 'pu36', 'pu41'] },
  { id: 'gris_perle', nom: 'Gris perle', hex: '#9aa0a6', gammes: ['pu11', 'pu36', 'pu41'] },
  { id: 'brun_ocre', nom: 'Brun ocre', hex: '#7d5a3c', gammes: ['pu11'] },
  { id: 'chene_clair', nom: 'Nuances chene clair', hex: '#c09a6b', gammes: ['pu11'] },
  { id: 'blanc_sable', nom: 'Blanc sable', hex: '#e2ded5', gammes: ['pu36', 'pu41'] },
];

/** Decors optionnels (notices PU11 p.9, PU36 p.10, PU41 p.7). */
export const DECORS = [
  { id: 'mineral', nom: 'Decor Mineral', horizontal: true, vertical: true },
  { id: 'vegetal', nom: 'Decor Vegetal', horizontal: true, vertical: true },
  { id: 'urbain', nom: 'Decor Urbain', horizontal: true, vertical: false },
];

/**
 * Portillons et portails : non couverts par les notices PU11/PU36/PU41.
 * Cotes de passage donnees a titre d'hypothese -> a confirmer au catalogue.
 */
export const OUVRANTS = [
  { id: 'aucun', nom: 'Aucun', type: null, passage: 0, poteauxDedies: 0, statut: null },
  { id: 'portillon_1000', nom: 'Portillon 1 vantail - passage 1000 mm', type: 'portillon', passage: 1000, poteauxDedies: 2, statut: A_VALIDER },
  { id: 'portillon_1200', nom: 'Portillon 1 vantail - passage 1200 mm', type: 'portillon', passage: 1200, poteauxDedies: 2, statut: A_VALIDER },
  { id: 'portail_3000', nom: 'Portail 2 vantaux - passage 3000 mm', type: 'portail', passage: 3000, poteauxDedies: 2, statut: A_VALIDER },
  { id: 'portail_3500', nom: 'Portail 2 vantaux - passage 3500 mm', type: 'portail', passage: 3500, poteauxDedies: 2, statut: A_VALIDER },
];

export function getGamme(id) {
  const g = GAMMES[id];
  if (!g) throw new Error(`Gamme inconnue : ${id}`);
  return g;
}

export function getOuvrant(id) {
  return OUVRANTS.find((o) => o.id === id) || OUVRANTS[0];
}
