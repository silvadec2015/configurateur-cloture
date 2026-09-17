/**
 * Moteur de calepinage : a partir d’une configuration utilisateur, calcule la
 * hauteur d’empilement, la hauteur de poteau nécessaire, le decoupage en
 * panneaux et les quantites elementaires.
 *
 * Toutes les cotes sont en millimetres. Les fonctions sont pures : elles ne
 * touchent ni au DOM ni a l’etat global, ce qui les rend testables avec
 * `node --test`.
 */

import { GAMMES, REGLES_COMMUNES, getGamme, getOuvrant, getPoseOuvrant } from '../data/catalogue.js';

/** Configuration par defaut du configurateur. */
export const CONFIG_DEFAUT = {
  gamme: 'atmosphere',
  variante: 'plein', // 'plein' | 'ajoure' (gamme aluminium uniquement)
  /** Nombre d’entretoises empilées entre deux lames en panneau ajouré. */
  entretoisesEmpilees: 1,
  pose: 'platine',
  hauteurMuret: 0,
  nbLames: 8,
  soubassement: 'lisse_basse', // 'lisse_basse' | 'plaque_soubassement' | 'aucun'
  segments: [{ longueur: 12000 }],
  ouvrant: 'aucun',
  poseOuvrant: 'sur_poteaux',
  nbOuvrants: 0,
  decorsHorizontaux: 0,
  decorsVerticaux: 0,
  coloris: 'gris_anthracite',
  finitionLame: null,
  finitionAccessoires: 'gris_anthracite',
  baguetteFinition: false,
  poteauxMuraux: 0,
};

const round = (v) => Math.round(v);

/**
 * Nombre de lisses intermédiaires nécessaires.
 * PU11 p.6 : jamais plus de 3 lames empilées sans lisse intermédiaire.
 */
export function nbLissesIntermediaires(gamme, nbLames) {
  const max = gamme.empilement.lamesMaxEntreLisses;
  if (!Number.isFinite(max) || nbLames <= max) return 0;
  return Math.ceil(nbLames / max) - 1;
}

/**
 * Hauteur d’empilement d’un panneau (du sol au dessus de la lisse haute).
 * @returns {{hauteur:number, detail:Array<{poste:string, quantite:number, hauteur:number, total:number}>}}
 */
export function hauteurEmpilement(config) {
  const gamme = getGamme(config.gamme);
  const e = gamme.empilement;
  const nbLames = Math.max(1, config.nbLames);
  const detail = [];
  let total = 0;

  const ajoute = (poste, quantite, hauteur) => {
    if (!quantite || !hauteur) return;
    const t = quantite * hauteur;
    detail.push({ poste, quantite, hauteur, total: round(t) });
    total += t;
  };

  // Soubassement (PU11 : lisse basse ou plaque de soubassement).
  if (gamme.lisseBasse.obligatoire || config.soubassement === 'plaque_soubassement') {
    if (config.soubassement === 'plaque_soubassement') {
      ajoute('Plaque de soubassement (hors sol)', 1, e.plaqueSoubassementHorsSol);
    } else if (config.soubassement !== 'aucun') {
      ajoute('Lisse basse', 1, e.lisseBasse);
    }
  }

  // Lames.
  const ajoure = gamme.id === 'aluminium' && config.variante === 'ajoure';
  if (ajoure) {
    const a = e.ajoure;
    // La fiche produit aluminium permet de cumuler les entretoises pour élargir
    // les claires-voies : chaque interstice en recoit `entretoisesEmpilees`.
    const parInterstice = Math.max(1, config.entretoisesEmpilees || 1);
    ajoute('Lames (entre entretoises)', nbLames, a.lameEntreEntretoises);
    ajoute('Entretoises', Math.max(0, nbLames - 1) * parInterstice, a.entretoise);
  } else {
    ajoute('Premiere lame', 1, e.premiereLame);
    ajoute('Lames suivantes', nbLames - 1, e.lameSuivante);
  }

  // Lisses intermédiaires.
  const nbInter = nbLissesIntermediaires(gamme, nbLames);
  ajoute('Lisses intermédiaires', nbInter, e.lisseIntermediaire);

  // Lisse haute (pose impérative sur les trois gammes).
  ajoute('Lisse haute', 1, e.lisseHaute);

  return { hauteur: round(total), detail, nbLissesIntermediaires: nbInter };
}

/**
 * Nombre de lames le plus proche d’une hauteur de claustra visée.
 * @returns {{nbLames:number, hauteur:number, alternatives:Array}}
 */
export function nbLamesPourHauteur(config, hauteurCible) {
  let meilleur = null;
  const alternatives = [];
  for (let n = 1; n <= 30; n++) {
    const h = hauteurEmpilement({ ...config, nbLames: n }).hauteur;
    alternatives.push({ nbLames: n, hauteur: h });
    const écart = Math.abs(h - hauteurCible);
    if (!meilleur || écart < meilleur.écart) meilleur = { nbLames: n, hauteur: h, écart };
  }
  return { nbLames: meilleur.nbLames, hauteur: meilleur.hauteur, alternatives };
}

/**
 * Hauteur de poteau nécessaire selon le type de pose.
 *
 * Deux valeurs sont produites :
 *  - `longueurPoteauCalculee` : dérivée des cotes de calepinage de la notice
 *    (support de platine + empilement + jeu haut de poteau, plus la partie
 *    enterrée en scellement) ;
 *  - `longueurPoteau` : valeur retenue. Lorsque la table du fabricant couvre
 *    le nombre de lames choisi, c’est elle qui fait foi (les notices donnent
 *    des hauteurs de poteau minimales légèrement différentes du calcul).
 */
export function calculPoteau(config, hauteurCloture) {
  const gamme = getGamme(config.gamme);
  const e = gamme.empilement;
  const p = gamme.poteau;
  const alertes = [];

  const surPlatine = config.pose === 'platine' || config.pose === 'muret';
  const hauteurClotureHorsSol = round((surPlatine ? e.supportPlatine : 0) + hauteurCloture);
  const hauteurHorsSolCalculee = round(hauteurClotureHorsSol + e.jeuHautPoteau);
  const longueurPoteauCalculee = round(
    hauteurHorsSolCalculee + (config.pose === 'scellement' ? p.profondeurScellement : 0)
  );

  // Table constructeur : prioritaire sur le calcul quand elle couvre le cas.
  const reference = gamme.tableConstructeur.find((r) => r.nbLames === config.nbLames) || null;
  const valeurTable = reference
    ? (config.pose === 'scellement' ? reference.poteauScellement : reference.poteauPlatine)
    : null;
  const longueurPoteau = valeurTable ?? longueurPoteauCalculee;
  const sourceHauteur = valeurTable ? `table ${gamme.notice}` : 'calcul de calepinage';
  const hauteurHorsSol = config.pose === 'scellement'
    ? round(longueurPoteau - p.profondeurScellement)
    : longueurPoteau;

  // La table du fabricant valide d’office la pose sur platines qu’elle decrit.
  const platineValideeParTable = Boolean(surPlatine && reference && reference.poteauPlatine);
  if (surPlatine && !platineValideeParTable && hauteurHorsSol > p.hauteurMaxPlatine) {
    alertes.push({
      niveau: 'erreur',
      message:
        `La pose sur platines double coque est limitée a ${p.hauteurMaxPlatine} mm de poteau hors sol ` +
        `(${gamme.notice}). Hauteur nécessaire : ${hauteurHorsSol} mm. Passez en scellement béton ou ` +
        `reduisez le nombre de lames.`,
    });
  }
  if (longueurPoteau > p.longueurFournie) {
    alertes.push({
      niveau: 'erreur',
      message:
        `Le poteau nécessaire (${longueurPoteau} mm) dépasse la longueur fournie de ${p.longueurFournie} mm.`,
    });
  }
  if (config.pose === 'muret') {
    const total = config.hauteurMuret + hauteurCloture;
    if (total > REGLES_COMMUNES.hauteurMaxMuretPlusCloture) {
      alertes.push({
        niveau: 'erreur',
        message:
          `Sécurité : muret + claustra = ${total} mm, au-dela du maximum de ` +
          `${REGLES_COMMUNES.hauteurMaxMuretPlusCloture} mm (PU41 p.3).`,
      });
    }
  }
  if (hauteurCloture > 1815 && config.pose !== 'scellement') {
    alertes.push({
      niveau: 'info',
      message:
        `La tenue au vent annoncée (${REGLES_COMMUNES.ventMaxKmH} km/h en site normal) couvre les claustras ` +
        `jusqu’à 1815 mm de hauteur avec scellement béton.`,
    });
  }
  if (reference && Math.abs(longueurPoteauCalculee - longueurPoteau) > 5) {
    alertes.push({
      niveau: 'info',
      message:
        `Hauteur de poteau retenue : ${longueurPoteau} mm (${sourceHauteur}). Le calcul de calepinage ` +
        `donne ${longueurPoteauCalculee} mm : conservez la valeur la plus haute en cas de doute.`,
    });
  }

  return {
    hauteurClotureHorsSol,
    hauteurHorsSol,
    longueurPoteau,
    longueurPoteauCalculee,
    sourceHauteur,
    decoupeParPoteau: Math.max(0, round(p.longueurFournie - longueurPoteau)),
    jeuHautPoteau: e.jeuHautPoteau,
    alertes,
    referenceConstructeur: reference,
  };
}

/**
 * Decoupage d’une longueur en panneaux : des panneaux pleins à l’entraxe
 * nominal (1800 mm) plus, si nécessaire, un panneau recoupé.
 */
export function decoupePanneaux(longueur, entraxe = REGLES_COMMUNES.entraxePoteaux) {
  const alertes = [];
  if (longueur <= 0) return { pleines: 0, reste: 0, panneauRecoupe: null, alertes };

  const pleines = Math.floor(longueur / entraxe);
  const reste = round(longueur - pleines * entraxe);
  let panneauRecoupe = null;

  if (reste > 0) {
    if (reste >= REGLES_COMMUNES.largeurPanneauMini) {
      panneauRecoupe = { largeur: reste };
    } else {
      alertes.push({
        niveau: 'avertissement',
        message:
          `Reliquat de ${reste} mm trop faible pour un panneau (mini ${REGLES_COMMUNES.largeurPanneauMini} mm). ` +
          `Répartissez ce reliquat sur les panneaux voisins en reduisant leur entraxe.`,
      });
    }
  }
  return { pleines, reste, panneauRecoupe, alertes };
}

/**
 * Calepinage complet du projet.
 */
export function calepiner(configUtilisateur) {
  const config = { ...CONFIG_DEFAUT, ...configUtilisateur };
  const gamme = getGamme(config.gamme);
  const ouvrant = getOuvrant(config.ouvrant);
  const alertes = [];

  // --- Hauteurs -----------------------------------------------------------
  const empilement = hauteurEmpilement(config);
  const poteau = calculPoteau(config, empilement.hauteur);
  alertes.push(...poteau.alertes);

  // --- Longueurs ----------------------------------------------------------
  const segments = (config.segments || []).filter((s) => Number(s.longueur) > 0);
  const longueurTotale = segments.reduce((t, s) => t + Number(s.longueur), 0);
  const nbAngles = Math.max(0, segments.length - 1);

  const poseOuvrant = getPoseOuvrant(ouvrant, config.poseOuvrant);
  const nbOuvrants = ouvrant.type ? Math.max(0, config.nbOuvrants) : 0;
  const longueurOuvrants = nbOuvrants * poseOuvrant.emprise;
  const longueurDecorsVerticaux = config.decorsVerticaux * REGLES_COMMUNES.entraxeDecorVertical;
  const longueurCloture = round(longueurTotale - longueurOuvrants - longueurDecorsVerticaux);

  if (longueurCloture < 0) {
    alertes.push({
      niveau: 'erreur',
      message:
        `Les ouvrants (${longueurOuvrants} mm) et décors verticaux (${longueurDecorsVerticaux} mm) ` +
        `dépassent la longueur totale du trace (${longueurTotale} mm).`,
    });
  }

  const decoupe = decoupePanneaux(Math.max(0, longueurCloture));
  alertes.push(...decoupe.alertes);

  const nbPanneauxLames = decoupe.pleines + (decoupe.panneauRecoupe ? 1 : 0);
  const nbPanneauxTotal = nbPanneauxLames + config.decorsVerticaux;
  const nbPoteaux = nbPanneauxTotal > 0 || nbOuvrants > 0 ? nbPanneauxTotal + 1 + nbOuvrants : 0;
  // En pose sur poteaux, les 2 poteaux du portillon (100 x 100 mm) remplacent
  // des poteaux de clôture ; en pose entre piliers maçonnés, l’ouvrant n’apporte
  // aucun poteau et la clôture se termine de part et d’autre sur ses propres poteaux.
  const nbPoteauxOuvrant = nbOuvrants * poseOuvrant.poteauxDedies;
  const nbPoteauxCloture = Math.max(0, nbPoteaux - nbPoteauxOuvrant);
  const nbPoteauxAngle = Math.min(nbAngles, Math.max(0, nbPoteauxCloture - 2));
  const nbPoteauxExtremite = nbPoteauxCloture > 0 ? 2 : 0;
  const nbPoteauxIntermediaires = Math.max(0, nbPoteauxCloture - nbPoteauxAngle - nbPoteauxExtremite);

  // Un départ contre un mur consomme un demi-poteau au lieu d’un poteau entier.
  const nbDemiPoteauxMuraux = Math.min(config.poteauxMuraux, nbPoteauxCloture);
  const nbPoteauxPleins = Math.max(0, nbPoteauxCloture - nbDemiPoteauxMuraux);

  if (gamme.hauteurMaxCloture && empilement.hauteur > gamme.hauteurMaxCloture) {
    alertes.push({
      niveau: 'erreur',
      message:
        `La fiche produit ${gamme.produit} annonce une clôture réalisable jusqu’à ` +
        `${gamme.hauteurMaxCloture} mm ; la configuration atteint ${empilement.hauteur} mm.`,
    });
  }
  if (gamme.famille === 'Clôture aluminium') {
    alertes.push({
      niveau: 'info',
      message:
        `La page accessoires présente les lisses comme optionnelles sur les lames aluminium, alors ` +
        `que la notice ${gamme.notice} rend la lisse haute impérative. Le chiffrage suit la notice.`,
    });
  }
  if (nbAngles > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `Angles : le poteau grand vent 3 en 1 ne convient qu’a une intersection a 90 degrés, et son ` +
        `haubanage est IMPÉRATIF en angle (${gamme.notice}).`,
    });
  }

  // --- Lames et décors ----------------------------------------------------
  const decorsHorizontaux = Math.min(config.decorsHorizontaux, nbPanneauxLames);
  const lamesRemplacees = decorsHorizontaux * gamme.decorHorizontal.remplaceLames;
  const lamesEncadrementSupp = decorsHorizontaux * (gamme.decorHorizontal.lamesEncadrementSupp || 0);

  let nbLamesTotal = nbPanneauxLames * config.nbLames - lamesRemplacees + lamesEncadrementSupp;
  nbLamesTotal = Math.max(0, nbLamesTotal);

  const lamesRecoupees = decoupe.panneauRecoupe ? config.nbLames : 0;
  const longueurLameRecoupee = decoupe.panneauRecoupe
    ? round(decoupe.panneauRecoupe.largeur - (REGLES_COMMUNES.entraxePoteaux - gamme.longueurLame))
    : 0;

  // Repartition lames début/fin vs lames persiennes (2 début/fin par panneau).
  const lamesDebutFin = gamme.id === 'persienne' ? nbPanneauxLames * 2 + lamesEncadrementSupp : 0;
  const lamesCourantes = Math.max(0, nbLamesTotal - lamesDebutFin);

  // --- Lisses, entretoises, accessoires -----------------------------------
  const e = gamme.empilement;
  const ajoure = gamme.id === 'aluminium' && config.variante === 'ajoure';
  const typeEntretoise = gamme.id === 'persienne' ? 'entretoise_persienne' : 'entretoise_aluminium';
  const entretoisesEmpilees = ajoure ? Math.max(1, config.entretoisesEmpilees || 1) : 1;
  const entretoisesParLame = ajoure ? e.ajoure.entretoisesParLame : e.entretoisesParLame;
  const nbEntretoises = entretoisesParLame * entretoisesEmpilees * nbLamesTotal;

  const nbLisseHaute = nbPanneauxLames;
  const utiliseLisseBasse = gamme.lisseBasse.obligatoire && config.soubassement === 'lisse_basse';
  const nbLisseBasse = utiliseLisseBasse ? nbPanneauxLames : 0;
  const nbPlaqueSoubassement =
    config.soubassement === 'plaque_soubassement' ? nbPanneauxLames : 0;
  const nbLisseInter = empilement.nbLissesIntermediaires * nbPanneauxLames;
  const nbConnecteurs = (nbLisseHaute + nbLisseBasse) * REGLES_COMMUNES.connecteursParLisse;

  const surPlatine = config.pose === 'platine' || config.pose === 'muret';
  const nbPlatines = surPlatine ? nbPoteauxCloture : 0;
  const nbGoujons = nbPlatines * REGLES_COMMUNES.goujonsParPlatine;
  const nbPoteauxScelles = config.pose === 'scellement' ? nbPoteauxCloture : 0;
  const volumeBeton_L = nbPoteauxScelles * REGLES_COMMUNES.volumeBetonParPoteau_L;

  if (poteau.decoupeParPoteau > 0 && nbPoteaux > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `Poteaux à recouper : ${poteau.decoupeParPoteau} mm par poteau (fournis en ` +
        `${gamme.poteau.longueurFournie} mm). Conserver au minimum ${e.jeuHautPoteau} mm de jeu ` +
        `entre le capot et la lisse haute.`,
    });
  }
  if (decoupe.panneauRecoupe) {
    alertes.push({
      niveau: 'info',
      message:
        `1 panneau recoupé de ${decoupe.panneauRecoupe.largeur} mm : ${lamesRecoupees} lames à recouper ` +
        `a ${longueurLameRecoupee} mm (jeu de dilatation de ${gamme.jeuDilatationLongueur} mm a répartir ` +
        `de chaque côté).`,
    });
  }
  if (nbOuvrants > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `${ouvrant.nom} : vantail de ${ouvrant.vantail.largeur} x ${ouvrant.vantail.hauteur} mm, ` +
        `${poseOuvrant.nom.toLowerCase()}, emprise de ${poseOuvrant.emprise} mm sur le trace. ` +
        `${ouvrant.normeAccessibilite}.`,
    });
    const écart = ouvrant.vantail.hauteur - empilement.hauteur;
    if (Math.abs(écart) > 100) {
      alertes.push({
        niveau: 'avertissement',
        message:
          `Le portillon mesure ${ouvrant.vantail.hauteur} mm de haut alors que la clôture en fait ` +
          `${empilement.hauteur} mm : l’écart de ${Math.abs(écart)} mm sera visible en limite de propriété.`,
      });
    }
    const colorisOuvrant = ouvrant.coloris.map((c) => c.id);
    if (!colorisOuvrant.includes(config.finitionAccessoires)) {
      alertes.push({
        niveau: 'avertissement',
        message:
          `${ouvrant.nom} n’est propose qu’en ${ouvrant.coloris.map((c) => c.nom).join(', ')} : ` +
          `la finition d’accessoires choisie ne pourra pas être tenue sur l’ouvrant.`,
      });
    }
  }

  return {
    config,
    gamme,
    ouvrant,
    hauteurs: {
      empilement: empilement.hauteur,
      detailEmpilement: empilement.detail,
      ...poteau,
    },
    longueurs: {
      longueurTotale,
      longueurOuvrants,
      longueurDecorsVerticaux,
      longueurCloture: Math.max(0, longueurCloture),
      entraxe: REGLES_COMMUNES.entraxePoteaux,
      panneauxPleins: decoupe.pleines,
      panneauRecoupe: decoupe.panneauRecoupe,
      nbPanneauxLames,
      nbPanneauxTotal,
    },
    quantites: {
      nbPoteaux,
      nbPoteauxCloture,
      nbPoteauxOuvrant,
      nbPoteauxExtremite,
      nbPoteauxAngle,
      nbPoteauxIntermediaires,
      nbLamesTotal,
      lamesCourantes,
      lamesDebutFin,
      lamesRecoupees,
      longueurLameRecoupee,
      nbEntretoises,
      typeEntretoise,
      nbLisseHaute,
      nbLisseBasse,
      nbLisseInter,
      nbPlaqueSoubassement,
      nbConnecteurs,
      nbPlatines,
      nbGoujons,
      nbPoteauxPleins,
      nbDemiPoteauxMuraux,
      nbCapots: nbPoteauxPleins,
      nbBaguettes: config.baguetteFinition ? nbPoteauxCloture : 0,
      nbDemiCapotsMuraux: nbDemiPoteauxMuraux,
      nbPoteauxScelles,
      volumeBeton_L,
      decorsHorizontaux,
      decorsVerticaux: config.decorsVerticaux,
      nbOuvrants,
    },
    alertes,
  };
}

export { GAMMES };
