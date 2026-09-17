/**
 * Moteur de calepinage : a partir d'une configuration utilisateur, calcule la
 * hauteur d'empilement, la hauteur de poteau necessaire, le decoupage en
 * travees et les quantites elementaires.
 *
 * Toutes les cotes sont en millimetres. Les fonctions sont pures : elles ne
 * touchent ni au DOM ni a l'etat global, ce qui les rend testables avec
 * `node --test`.
 */

import { GAMMES, REGLES_COMMUNES, getGamme, getOuvrant } from '../data/catalogue.js';

/** Configuration par defaut du configurateur. */
export const CONFIG_DEFAUT = {
  gamme: 'pu11',
  variante: 'plein', // 'plein' | 'ajoure' (PU36 uniquement)
  pose: 'platine',
  hauteurMuret: 0,
  nbLames: 8,
  soubassement: 'lisse_basse', // 'lisse_basse' | 'plaque_soubassement' | 'aucun'
  segments: [{ longueur: 12000 }],
  ouvrant: 'aucun',
  nbOuvrants: 0,
  decorsHorizontaux: 0,
  decorsVerticaux: 0,
  coloris: 'gris_anthracite',
  baguetteFinition: false,
  poteauxMuraux: 0,
};

const round = (v) => Math.round(v);

/**
 * Nombre de lisses intermediaires necessaires.
 * PU11 p.6 : jamais plus de 3 lames empilees sans lisse intermediaire.
 */
export function nbLissesIntermediaires(gamme, nbLames) {
  const max = gamme.empilement.lamesMaxEntreLisses;
  if (!Number.isFinite(max) || nbLames <= max) return 0;
  return Math.ceil(nbLames / max) - 1;
}

/**
 * Hauteur d'empilement d'un panneau (du sol au dessus de la lisse haute).
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
  const ajoure = gamme.id === 'pu36' && config.variante === 'ajoure';
  if (ajoure) {
    const a = e.ajoure;
    ajoute('Lames (entre entretoises)', nbLames, a.lameEntreEntretoises);
    ajoute('Entretoises', Math.max(0, nbLames - 1), a.entretoise);
  } else {
    ajoute('Premiere lame', 1, e.premiereLame);
    ajoute('Lames suivantes', nbLames - 1, e.lameSuivante);
  }

  // Lisses intermediaires.
  const nbInter = nbLissesIntermediaires(gamme, nbLames);
  ajoute('Lisses intermediaires', nbInter, e.lisseIntermediaire);

  // Lisse haute (pose imperative sur les trois gammes).
  ajoute('Lisse haute', 1, e.lisseHaute);

  return { hauteur: round(total), detail, nbLissesIntermediaires: nbInter };
}

/**
 * Nombre de lames le plus proche d'une hauteur de claustra visee.
 * @returns {{nbLames:number, hauteur:number, alternatives:Array}}
 */
export function nbLamesPourHauteur(config, hauteurCible) {
  let meilleur = null;
  const alternatives = [];
  for (let n = 1; n <= 30; n++) {
    const h = hauteurEmpilement({ ...config, nbLames: n }).hauteur;
    alternatives.push({ nbLames: n, hauteur: h });
    const ecart = Math.abs(h - hauteurCible);
    if (!meilleur || ecart < meilleur.ecart) meilleur = { nbLames: n, hauteur: h, ecart };
  }
  return { nbLames: meilleur.nbLames, hauteur: meilleur.hauteur, alternatives };
}

/**
 * Hauteur de poteau necessaire selon le type de pose.
 *
 * Deux valeurs sont produites :
 *  - `longueurPoteauCalculee` : derivee des cotes de calepinage de la notice
 *    (support de platine + empilement + jeu haut de poteau, plus la partie
 *    enterree en scellement) ;
 *  - `longueurPoteau` : valeur retenue. Lorsque la table du fabricant couvre
 *    le nombre de lames choisi, c'est elle qui fait foi (les notices donnent
 *    des hauteurs de poteau minimales legerement differentes du calcul).
 */
export function calculPoteau(config, hauteurClaustra) {
  const gamme = getGamme(config.gamme);
  const e = gamme.empilement;
  const p = gamme.poteau;
  const alertes = [];

  const surPlatine = config.pose === 'platine' || config.pose === 'muret';
  const hauteurClaustraHorsSol = round((surPlatine ? e.supportPlatine : 0) + hauteurClaustra);
  const hauteurHorsSolCalculee = round(hauteurClaustraHorsSol + e.jeuHautPoteau);
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

  // La table du fabricant valide d'office la pose sur platines qu'elle decrit.
  const platineValideeParTable = Boolean(surPlatine && reference && reference.poteauPlatine);
  if (surPlatine && !platineValideeParTable && hauteurHorsSol > p.hauteurMaxPlatine) {
    alertes.push({
      niveau: 'erreur',
      message:
        `La pose sur platines double coque est limitee a ${p.hauteurMaxPlatine} mm de poteau hors sol ` +
        `(${gamme.notice}). Hauteur necessaire : ${hauteurHorsSol} mm. Passez en scellement beton ou ` +
        `reduisez le nombre de lames.`,
    });
  }
  if (longueurPoteau > p.longueurFournie) {
    alertes.push({
      niveau: 'erreur',
      message:
        `Le poteau necessaire (${longueurPoteau} mm) depasse la longueur fournie de ${p.longueurFournie} mm.`,
    });
  }
  if (config.pose === 'muret') {
    const total = config.hauteurMuret + hauteurClaustra;
    if (total > REGLES_COMMUNES.hauteurMaxMuretPlusClaustra) {
      alertes.push({
        niveau: 'erreur',
        message:
          `Securite : muret + claustra = ${total} mm, au-dela du maximum de ` +
          `${REGLES_COMMUNES.hauteurMaxMuretPlusClaustra} mm (PU41 p.3).`,
      });
    }
  }
  if (hauteurClaustra > 1815 && config.pose !== 'scellement') {
    alertes.push({
      niveau: 'info',
      message:
        `La tenue au vent annoncee (${REGLES_COMMUNES.ventMaxKmH} km/h en site normal) couvre les claustras ` +
        `jusqu'a 1815 mm de hauteur avec scellement beton.`,
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
    hauteurClaustraHorsSol,
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
 * Decoupage d'une longueur en travees : des travees pleines a l'entraxe
 * nominal (1800 mm) plus, si necessaire, une travee recoupee.
 */
export function decoupeTravees(longueur, entraxe = REGLES_COMMUNES.entraxePoteaux) {
  const alertes = [];
  if (longueur <= 0) return { pleines: 0, reste: 0, traveeRecoupee: null, alertes };

  const pleines = Math.floor(longueur / entraxe);
  const reste = round(longueur - pleines * entraxe);
  let traveeRecoupee = null;

  if (reste > 0) {
    if (reste >= REGLES_COMMUNES.largeurTraveeMini) {
      traveeRecoupee = { largeur: reste };
    } else {
      alertes.push({
        niveau: 'avertissement',
        message:
          `Reliquat de ${reste} mm trop faible pour une travee (mini ${REGLES_COMMUNES.largeurTraveeMini} mm). ` +
          `Repartissez ce reliquat sur les travees voisines en reduisant leur entraxe.`,
      });
    }
  }
  return { pleines, reste, traveeRecoupee, alertes };
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

  const nbOuvrants = ouvrant.type ? Math.max(0, config.nbOuvrants) : 0;
  const longueurOuvrants = nbOuvrants * ouvrant.passage;
  const longueurDecorsVerticaux = config.decorsVerticaux * REGLES_COMMUNES.entraxeDecorVertical;
  const longueurClaustra = round(longueurTotale - longueurOuvrants - longueurDecorsVerticaux);

  if (longueurClaustra < 0) {
    alertes.push({
      niveau: 'erreur',
      message:
        `Les ouvrants (${longueurOuvrants} mm) et decors verticaux (${longueurDecorsVerticaux} mm) ` +
        `depassent la longueur totale du trace (${longueurTotale} mm).`,
    });
  }

  const decoupe = decoupeTravees(Math.max(0, longueurClaustra));
  alertes.push(...decoupe.alertes);

  const nbTraveesClaustra = decoupe.pleines + (decoupe.traveeRecoupee ? 1 : 0);
  const nbTraveesTotal = nbTraveesClaustra + config.decorsVerticaux;
  const nbPoteaux = nbTraveesTotal > 0 || nbOuvrants > 0 ? nbTraveesTotal + 1 + nbOuvrants : 0;
  const nbPoteauxAngle = Math.min(nbAngles, Math.max(0, nbPoteaux - 2));
  const nbPoteauxExtremite = nbPoteaux > 0 ? 2 : 0;
  const nbPoteauxIntermediaires = Math.max(0, nbPoteaux - nbPoteauxAngle - nbPoteauxExtremite);

  if (nbAngles > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `Poteaux 3 en 1 en angle : uniquement pour une intersection a 90 degres, et haubanage ` +
        `IMPERATIF des poteaux d'angle (${gamme.notice}).`,
    });
  }

  // --- Lames et decors ----------------------------------------------------
  const decorsHorizontaux = Math.min(config.decorsHorizontaux, nbTraveesClaustra);
  const lamesRemplacees = decorsHorizontaux * gamme.decorHorizontal.remplaceLames;
  const lamesEncadrementSupp = decorsHorizontaux * (gamme.decorHorizontal.lamesEncadrementSupp || 0);

  let nbLamesTotal = nbTraveesClaustra * config.nbLames - lamesRemplacees + lamesEncadrementSupp;
  nbLamesTotal = Math.max(0, nbLamesTotal);

  const lamesRecoupees = decoupe.traveeRecoupee ? config.nbLames : 0;
  const longueurLameRecoupee = decoupe.traveeRecoupee
    ? round(decoupe.traveeRecoupee.largeur - (REGLES_COMMUNES.entraxePoteaux - gamme.longueurLame))
    : 0;

  // Repartition debut/fin vs persiennes pour la gamme PU41.
  const lamesDebutFin = gamme.id === 'pu41' ? nbTraveesClaustra * 2 + lamesEncadrementSupp : 0;
  const lamesCourantes = Math.max(0, nbLamesTotal - lamesDebutFin);

  // --- Lisses, entretoises, accessoires -----------------------------------
  const e = gamme.empilement;
  const ajoure = gamme.id === 'pu36' && config.variante === 'ajoure';
  const entretoisesParLame = ajoure ? e.ajoure.entretoisesParLame : e.entretoisesParLame;
  const nbEntretoises = entretoisesParLame * nbLamesTotal;

  const nbLisseHaute = nbTraveesClaustra;
  const utiliseLisseBasse = gamme.lisseBasse.obligatoire && config.soubassement === 'lisse_basse';
  const nbLisseBasse = utiliseLisseBasse ? nbTraveesClaustra : 0;
  const nbPlaqueSoubassement =
    config.soubassement === 'plaque_soubassement' ? nbTraveesClaustra : 0;
  const nbLisseInter = empilement.nbLissesIntermediaires * nbTraveesClaustra;
  const nbConnecteurs = (nbLisseHaute + nbLisseBasse) * REGLES_COMMUNES.connecteursParLisse;

  const surPlatine = config.pose === 'platine' || config.pose === 'muret';
  const nbPlatines = surPlatine ? nbPoteaux : 0;
  const nbGoujons = nbPlatines * REGLES_COMMUNES.goujonsParPlatine;
  const nbPoteauxScelles = config.pose === 'scellement' ? nbPoteaux : 0;
  const volumeBeton_L = nbPoteauxScelles * REGLES_COMMUNES.volumeBetonParPoteau_L;

  if (poteau.decoupeParPoteau > 0 && nbPoteaux > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `Poteaux a recouper : ${poteau.decoupeParPoteau} mm par poteau (fournis en ` +
        `${gamme.poteau.longueurFournie} mm). Conserver au minimum ${e.jeuHautPoteau} mm de jeu ` +
        `entre le capot et la lisse haute.`,
    });
  }
  if (decoupe.traveeRecoupee) {
    alertes.push({
      niveau: 'info',
      message:
        `1 travee recoupee de ${decoupe.traveeRecoupee.largeur} mm : ${lamesRecoupees} lames a recouper ` +
        `a ${longueurLameRecoupee} mm (jeu de dilatation de ${gamme.jeuDilatationLongueur} mm a repartir ` +
        `de chaque cote).`,
    });
  }
  if (nbOuvrants > 0) {
    alertes.push({
      niveau: 'avertissement',
      message:
        `Les portillons et portails ne figurent pas dans les notices PU11/PU36/PU41 : cotes de passage ` +
        `et quincaillerie a confirmer au catalogue avant commande.`,
    });
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
      longueurClaustra: Math.max(0, longueurClaustra),
      entraxe: REGLES_COMMUNES.entraxePoteaux,
      traveesPleines: decoupe.pleines,
      traveeRecoupee: decoupe.traveeRecoupee,
      nbTraveesClaustra,
      nbTraveesTotal,
    },
    quantites: {
      nbPoteaux,
      nbPoteauxExtremite,
      nbPoteauxAngle,
      nbPoteauxIntermediaires,
      nbLamesTotal,
      lamesCourantes,
      lamesDebutFin,
      lamesRecoupees,
      longueurLameRecoupee,
      nbEntretoises,
      nbLisseHaute,
      nbLisseBasse,
      nbLisseInter,
      nbPlaqueSoubassement,
      nbConnecteurs,
      nbPlatines,
      nbGoujons,
      nbCapots: nbPoteaux,
      nbBaguettes: config.baguetteFinition ? nbPoteaux : 0,
      nbCapotsMuraux: config.poteauxMuraux,
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
