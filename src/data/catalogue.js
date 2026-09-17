/**
 * Catalogue produit et règles techniques.
 *
 * Deux sources distinctes, jamais melangees :
 *
 * 1. Les COTES DE MONTAGE viennent des notices fournies (chapitre "Éléments
 *    techniques / Aide au calepinage") :
 *      - PU11 V23 : clôtures bois composite (lames Atmosphère et Élégance)
 *      - PU36 V3  : clôture aluminium
 *      - PU41 V1  : claustra persienne aluminium
 *
 * 2. Les DONNEES COMMERCIALES (noms de gammes, coloris, finitions, references)
 *    viennent des fiches produit du site fr.silvadec.com.
 *
 * Chaque bloc porte sa `source`. Ce qui n’a pas ete confirme par une fiche
 * produit est marque `A_VALIDER` et signale dans l’interface : il ne faut pas
 * le presenter a un client en l’etat.
 */

export const A_VALIDER = 'A_VALIDER';

/**
 * Hauteurs de clôture hors sol proposées au client, par pas de 150 mm.
 * Source : sélecteur « Hauteur de clôture hors sols » du configurateur Silvadec.
 * 1,80 m est le maximum, cohérent avec les fiches produit.
 */
export const HAUTEURS_CLOTURE = [
  { valeur: 1050, libelle: '1m05' },
  { valeur: 1200, libelle: '1m20' },
  { valeur: 1350, libelle: '1m35' },
  { valeur: 1500, libelle: '1m50' },
  { valeur: 1650, libelle: '1m65' },
  { valeur: 1800, libelle: '1m80' },
];

export const HAUTEUR_MAX_CLOTURE = 1800;

/** Formate une hauteur en millimètres à la manière du catalogue : 1m80. */
export function hauteurEnMetres(mm) {
  const metres = Math.floor(mm / 1000);
  const centimetres = Math.round((mm - metres * 1000) / 10);
  return `${metres}m${String(centimetres).padStart(2, '0')}`;
}

/** Contraintes de pose communes (notices PU11/PU36/PU41 p.1 a p.4). */
export const REGLES_COMMUNES = {
  entraxePoteaux: 1800,
  entraxeDecorVertical: 855,
  longueurPoteauFournie: 2315,
  profondeurScellement: 500,
  jeuMiniCapot: 15,
  hauteurMaxMuretPlusCloture: 2200,
  goujonsParPlatine: 4,
  connecteursParLisse: 2,
  /** Largeur mini d’un panneau recoupé acceptee par le configurateur. */
  largeurPanneauMini: 300,
  /** Volume de béton indicatif par poteau scelle (trou 300 x 300 x 600 mm). */
  volumeBetonParPoteau_L: 54,
  ventMaxKmH: 100,
};

/**
 * Finitions des profiles aluminium sablés (poteaux, lisses, capots, platines).
 * Source : fiches produit et page "Accessoires de montage clôture".
 *
 * Les nuanciers affichés sur les fiches montrent gris anthracite et noir ; les
 * textes de ces mêmes pages citent tantot "gris anthracite, gris métal et
 * blanc", tantot le noir. Les deux coloris confirmes par un nuancier sont donc
 * seuls actifs, le gris métal (présente sur la lame écran aluminium) reste a
 * confirmer pour les accessoires, et le blanc paraît obsolète.
 *
 * "RAL 2100" n’existe pas au nuancier RAL classique (la famille 2000 regroupe
 * les oranges) : c’est la désignation Silvadec, reprise telle quelle.
 * Les codes hexadecimaux sont des equivalences d’écran, pas un nuancier.
 */
export const FINITIONS_ACCESSOIRES = [
  { id: 'gris_anthracite', nom: 'Gris anthracite', ral: 'RAL 7016 mat', hex: '#383e42' },
  { id: 'noir', nom: 'Noir', ral: 'RAL 2100 mat', hex: '#2a2422' },
  { id: 'gris_metal', nom: 'Gris métal', ral: 'RAL 7042 mat', hex: '#8d948d', statut: A_VALIDER },
];

/**
 * Accessoires de montage (page "Accessoires de montage clôture").
 * Tous en aluminium thermolaqué finition sablée.
 */
export const ACCESSOIRES = {
  poteau: {
    nom: 'Poteau grand vent 3 en 1',
    detail: 'Se positionne en début, milieu et fin de clôture',
    section: '64 x 70 mm (notice PU11 p.8)',
  },
  demi_poteau_mural: {
    nom: 'Demi-poteau de départ mural',
    detail: 'Poteau en demi-lune pour démarrer la clôture contre un mur',
  },
  platine: {
    nom: 'Platine double coque',
    detail: 'Dediee au poteau grand vent 3 en 1, pose sur platine jusqu’à 1,80 m',
  },
  capot: { nom: 'Capot', detail: 'Dimensions 65 x 70 mm' },
  demi_capot_mural: { nom: 'Demi-capot de départ mural', detail: 'Dimensions 70 x 35 mm' },
  lisse: {
    nom: 'Lisse haute ou basse',
    detail: 'Deux lisses par panneau : une en haut et une en bas du claustra',
  },
  lisse_intermediaire: {
    nom: 'Lisse intermédiaire',
    detail: 'Au minimum une lisse intermédiaire toutes les trois lames',
  },
  connecteur: { nom: 'Connecteur de lisse', detail: 'Connecteurs multifonctions, 2 par lisse' },
  plaque_soubassement: {
    nom: 'Plaque de soubassement',
    detail: 'Simplifie la pose sur terrain pentu et crée une surface plane',
  },
  baguette_finition: {
    nom: 'Baguette de finition',
    detail: 'Dimensions 27 x 9,5 x 1845 mm, finition esthétique en bout de clôture',
  },
  entretoise_aluminium: {
    nom: 'Entretoise aluminium',
    detail: 'Ajoure les lames écran aluminium, non compatible avec les lames composite',
  },
  entretoise_persienne: {
    nom: 'Entretoise pour lame persienne aluminium',
    detail: 'Obligatoire pour installer les lames persiennes',
  },
  kit_pose_verticale: {
    nom: 'Kit pour pose verticale',
    detail: 'Kit de fixation pour pose verticale des lames écran aluminium',
  },
  goujon: { nom: "Goujon d’ancrage inox M10", detail: '4 par platine (notices p.2)' },
};

/** Règles de montage communes aux clôtures bois composite (notice PU11 V23). */
const MONTAGE_COMPOSITE = {
  notice: 'PU11 V23',
  jeuDilatationLongueur: 7,
  empilement: {
    premiereLame: 150, // lame hors tout
    lameSuivante: 146, // lame empilée sur une autre lame
    lisseHaute: 10,
    lisseBasse: 12,
    lisseIntermediaire: 3,
    supportPlatine: 23,
    jeuHautPoteau: 15,
    // PU11 p.6 : ne jamais empiler plus de 3 lames sans lisse intermédiaire.
    lamesMaxEntreLisses: 3,
    entretoisesParLame: 0,
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
};

export const GAMMES = {
  atmosphere: {
    id: 'atmosphere',
    nom: 'Atmosphère',
    produit: 'Lame écran Atmosphère coextrudée',
    famille: 'Clôture bois composite',
    materiau: 'Lames bois composite coextrudees, profiles aluminium sablés',
    argumentaire:
      'Lame coextrudée recto-verso a la couleur permanente, encadree de poteaux et ' +
      "d’accessoires aluminium. Garantie 25 ans, imputrescible, sans grisaillement.",
    sourceProduit: 'Fiche produit "Lame écran Atmosphère coextrudée" (fr.silvadec.com)',
    lame: { hauteur: 150, epaisseur: 21, longueur: 1783 },
    longueurLame: 1783,
    finitionsLame: ['1 face lisse, 1 face structuree', 'Lisse', 'Brossee'],
    // Coloris relevés sur la fiche produit consultée. La fiche evoque une
    // "palette de bruns et de gris" : d’autres coloris existent probablement.
    coloris: [
      { id: 'gris_anthracite', nom: 'Gris anthracite', hex: '#4a4e51', ref: 'SICLOT1404' },
      { id: 'gris_clair', nom: 'Gris clair', hex: '#9ba09b', ref: null },
    ],
    colorisComplets: false,
    /** Fiche produit : installable jusqu’à 1,80 m de hauteur. */
    hauteurMaxCloture: 1800,
    garantie: '25 ans',
    ...MONTAGE_COMPOSITE,
  },

  elegance: {
    id: 'elegance',
    nom: 'Élégance',
    produit: 'Lame écran Élégance',
    famille: 'Clôture bois composite',
    materiau: 'Lames bois composite, profiles aluminium sablés',
    argumentaire:
      'Lame bois composite de la gamme Élégance. La notice PU11 deconseille sa pose ' +
      'sur muret a revetement poreux (risque de coulures) et oriente alors vers Atmosphère.',
    sourceProduit: 'Gamme citée par la notice PU11 V23 p.2 — fiche produit non consultée',
    /** Absente du configurateur tant que sa fiche produit n'est pas intégrée. */
    proposeAuConfigurateur: false,
    lame: { hauteur: 150, epaisseur: null, longueur: 1783 },
    longueurLame: 1783,
    finitionsLame: [],
    coloris: [],
    colorisComplets: false,
    statutProduit: A_VALIDER,
    hauteurMaxCloture: null,
    garantie: null,
    ...MONTAGE_COMPOSITE,
  },

  aluminium: {
    id: 'aluminium',
    nom: 'Clôture aluminium',
    produit: 'Lame écran Aluminium',
    famille: 'Clôture aluminium',
    materiau: 'Lames et profiles aluminium thermolaqués, finition mat sablée',
    argumentaire:
      'Lame structurelle en aluminium thermolaqué label Qualicoat, a monter en panneaux ' +
      "pleins ou ajourés grâce aux entretoises. Compatible avec tous les accessoires et " +
      'décors de la gamme, y compris en alternance avec des panneaux composite.',
    sourceProduit: 'Fiche produit "Lame écran Aluminium" (fr.silvadec.com)',
    notice: 'PU36 V3',
    lame: { hauteur: 148, epaisseur: 21, longueur: 1797 },
    longueurLame: 1797,
    jeuDilatationLongueur: 3,
    finitionsLame: ['Mat sablée'],
    /**
     * Coloris relevés sur le selecteur de la fiche produit. Le texte de la même
     * page cite "gris anthracite, gris métal et blanc" : cette mention paraît
     * obsolète, le selecteur et la gamme d’accessoires donnant tous deux du noir.
     * A confirmer avant diffusion commerciale.
     */
    coloris: [
      { id: 'gris_anthracite', nom: 'Gris anthracite', hex: '#383e42', ref: null },
      { id: 'gris_metal', nom: 'Gris métal', hex: '#8d948d', ref: null },
      { id: 'noir', nom: 'Noir', hex: '#1c1c1c', ref: null },
    ],
    colorisComplets: true,
    label: 'Qualicoat',
    /** Fiche produit : clôture réalisable jusqu’à 1,80 m de hauteur. */
    hauteurMaxCloture: 1800,
    garantie: '10 ans',
    empilement: {
      // PU36 p.2 : lame hors tout 148 mm (fiche produit : 148 x 21 x 1797),
      // 146 mm une fois empilée sur une autre lame.
      premiereLame: 148,
      lameSuivante: 146,
      lisseHaute: 10,
      lisseBasse: 0,
      lisseIntermediaire: 5,
      supportPlatine: 23,
      jeuHautPoteau: 15,
      lamesMaxEntreLisses: Infinity, // PU36 p.5 : pas de lisse intermédiaire en pose pleine
      entretoisesParLame: 0,
      /**
       * Variante panneau ajouré (PU36 p.2). La fiche produit précise que les
       * entretoises de 15 mm peuvent être cumulees pour ajuster la hauteur et
       * la largeur des claires-voies.
       */
      ajoure: {
        lameEntreEntretoises: 148,
        entretoise: 15,
        entretoisesParLame: 2, // côté A + côté B
        empilementMaxEntretoises: 4,
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
      { nbLames: 8, hauteurCloture: 1200, poteauPlatine: 1260, poteauScellement: null },
      { nbLames: 12, hauteurCloture: 1800, poteauPlatine: 1845, poteauScellement: 2315 },
    ],
  },

  persienne: {
    id: 'persienne',
    nom: 'Lame persienne',
    produit: 'Lame persienne en Aluminium',
    famille: 'Clôture aluminium',
    materiau: 'Lames persiennes aluminium thermolaqué, finition mat sablée',
    argumentaire:
      "Conception ajourée et asymétrique : selon le sens de pose, la face légèrement " +
      'ajourée privilégie la transparence, la face couvrante la discrétion. Laisse passer ' +
      "la lumière, le vent et la petite faune, ce qui repond aux exigences de certains PLU.",
    sourceProduit: 'Fiche produit "Lame persienne en Aluminium" (fr.silvadec.com)',
    notice: 'PU41 V1',
    lame: { hauteur: 127, epaisseur: 21, longueur: 1797 },
    longueurLame: 1797,
    jeuDilatationLongueur: 3,
    finitionsLame: ['Mat sablée'],
    coloris: [
      { id: 'gris_anthracite', nom: 'Gris anthracite', hex: '#383e42', ral: 'RAL 7016 mat', ref: null },
      { id: 'noir', nom: 'Noir', hex: '#1c1c1c', ral: 'RAL Noir 2100 mat', ref: null },
    ],
    colorisComplets: true,
    label: 'Qualicoat',
    /** Fiche produit : pose sur poteaux scelles ou en habillage de muret, jusqu’à 1,80 m. */
    hauteurMaxCloture: 1800,
    garantie: '10 ans',
    /** Fiche produit : 2 modeles de lame, début/fin (une en bas, une en haut) et persienne. */
    modelesLame: ['Lame début et fin', 'Lame persienne'],
    empilement: {
      // PU41 p.2 : lame hors tout 127 mm (fiche produit : 127 x 21 x 1797),
      // lisse haute 10 mm, support platine 23 mm, jeu mini de 30 mm en haut de poteau.
      hauteurLameHorsTout: 127,
      /**
       * Pas d’empilement reel (lame + entretoises réglables) : cale sur la table
       * constructeur PU41 p.1 -> 12 lames (10 persiennes + 2 début/fin) = 1745 mm,
       * lisse haute comprise.
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
      entretoisesParLame: 2, // côté A + côté B
    },
    poteau: {
      // PU41 p.1 et p.3 : platine double coque limitée a 1745 mm de poteau hors sol.
      hauteurMaxPlatine: 1745,
      longueurFournie: REGLES_COMMUNES.longueurPoteauFournie,
      profondeurScellement: REGLES_COMMUNES.profondeurScellement,
    },
    lisseBasse: { obligatoire: false, alternatives: [] },
    decorVertical: { entraxe: 855, panneau: '845 x 1791 mm', source: 'PU41 V1 p.7' },
    // PU41 p.7 et fiche produit : le décor horizontal s’insere entre 2 lames début/fin,
    // il faut donc 4 lames début/fin au lieu de 2.
    decorHorizontal: { remplaceLames: 2, lamesEncadrementSupp: 2, source: 'PU41 V1 p.7' },
    tableConstructeur: [
      { nbLames: 12, hauteurCloture: 1745, poteauPlatine: 1760, poteauScellement: 2245 },
    ],
  },
};

/** Types de pose disponibles (notices p.2 a p.4). */
export const POSES = {
  platine: {
    id: 'platine',
    nom: 'Fixation sur platines double coque',
    aide: 'Dalle béton pleine, plane, 20 cm de large minimum. Support creux proscrit.',
    source: 'PU11/PU36/PU41 p.2-p.3',
  },
  scellement: {
    id: 'scellement',
    nom: 'Scellement béton',
    aide: 'Poteau enterré de 500 mm, entraxe de 1800 mm à contrôler pendant le séchage.',
    source: 'PU11/PU36/PU41 p.3-p.4',
  },
  muret: {
    id: 'muret',
    nom: 'Platines sur muret',
    aide: 'Hauteur totale muret + clôture limitée à 2,20 m pour des raisons de sécurité.',
    source: 'PU41 V1 p.3',
  },
};

/**
 * Décors (page "Décors de clôture"). Les décors horizontaux s’inserent dans
 * l’empilement des lames ; les décors verticaux occupent un panneau dédié.
 */
export const DECORS = {
  horizontaux: [
    {
      id: 'végétal',
      nom: 'Décor végétal en aluminium',
      ambiance: 'Végétale',
      hauteur: 300,
      detail: 'Herbes fines et effilées, légèrement ajouré',
    },
    {
      id: 'minéral',
      nom: 'Décor minéral en aluminium',
      ambiance: 'Minérale',
      hauteur: 300,
      detail: 'Formes arrondies ajourées qui laissent passer la lumière',
    },
    {
      id: 'urbain',
      nom: 'Décor urbain en aluminium',
      ambiance: 'Contemporaine',
      hauteur: null,
      detail: "Style moderne et épuré, s’associe aux lames composite",
      statut: A_VALIDER, // hauteur non indiquee sur la page consultée
    },
  ],
  verticaux: [
    {
      id: 'vertical_mineral',
      nom: 'Décor vertical en aluminium - ambiance minérale',
      detail: "S’insère entre deux panneaux",
    },
    {
      id: 'vertical_vegetal',
      nom: 'Décor vertical en aluminium - ambiance végétale',
      detail: "S’insère entre deux panneaux",
    },
    {
      id: 'panneau_botanique',
      nom: 'Panneau botanique en aluminium',
      detail: 'Treillis en acier galvanisé à végétaliser, se pose sur les poteaux Silvadec',
    },
  ],
};

/**
 * Ouvrants. Seul le portillon aluminium est documente par une fiche produit ;
 * les portails ne le sont pas et ne sont donc pas proposes.
 *
 * `largeurEntrePoteaux` est la cote annoncée par la fiche produit. L’emprise
 * retenue pour le calepinage ajoute les deux poteaux de 100 mm en pose sur
 * poteaux : c’est une interpretation (la fiche ne précise pas si la cote est
 * prise entre nus intérieurs ou d’axe en axe) a confirmer avant commande.
 */
export const OUVRANTS = [
  {
    id: 'aucun',
    nom: 'Aucun',
    type: null,
    poses: [{ id: 'aucune', nom: '-', emprise: 0, poteauxDedies: 0 }],
  },
  {
    id: 'portillon_aluminium',
    nom: 'Portillon Aluminium',
    type: 'portillon',
    sourceProduit: 'Fiche produit "Portillon Aluminium" (fr.silvadec.com)',
    vantail: { largeur: 975, hauteur: 1750, epaisseur: 60 },
    largeurEntrePoteaux: 1060,
    poteau: { section: '100 x 100 mm', longueur: 2250 },
    passageUtile: 900,
    normeAccessibilite: 'Passage utile de 90 cm, au-delà des 83 cm exigés pour les PMR',
    coloris: [{ id: 'gris_anthracite', nom: 'Gris anthracite', hex: '#383e42' }],
    garantie: '10 ans',
    poses: [
      {
        id: 'sur_poteaux',
        nom: 'Pose sur poteaux, inséré dans la clôture',
        emprise: 1260, // 1060 mm entre poteaux + 2 poteaux de 100 mm
        poteauxDedies: 2,
      },
      {
        id: 'entre_piliers',
        nom: 'Pose directe entre deux piliers maçonnés',
        emprise: 1060,
        poteauxDedies: 0,
      },
    ],
  },
];

/** Habillages proposés au client dans le configurateur. */
export function gammesProposees() {
  return Object.values(GAMMES).filter((g) => g.proposeAuConfigurateur !== false);
}

export function getGamme(id) {
  const g = GAMMES[id];
  if (!g) throw new Error(`Gamme inconnue : ${id}`);
  return g;
}

export function getOuvrant(id) {
  return OUVRANTS.find((o) => o.id === id) || OUVRANTS[0];
}

/** Type de pose d’un ouvrant (premier type par defaut). */
export function getPoseOuvrant(ouvrant, poseId) {
  return ouvrant.poses.find((p) => p.id === poseId) || ouvrant.poses[0];
}

export function getFinitionAccessoire(id) {
  return FINITIONS_ACCESSOIRES.find((f) => f.id === id) || FINITIONS_ACCESSOIRES[0];
}

/** Coloris de lame d’une gamme, ou liste vide si la fiche produit manque. */
export function colorisDe(gammeId) {
  return getGamme(gammeId).coloris;
}
