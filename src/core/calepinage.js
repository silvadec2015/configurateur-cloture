/**
 * Moteur de calepinage : à partir d'une configuration utilisateur, calcule la
 * hauteur d'empilement, la hauteur de poteau nécessaire, le découpage en
 * panneaux et les quantités élémentaires.
 *
 * Une clôture peut mélanger plusieurs habillages (Atmosphère, aluminium,
 * persienne) : chaque panneau appartient à un habillage, et le nombre de lames
 * est calculé habillage par habillage pour atteindre la hauteur demandée.
 *
 * Toutes les cotes sont en millimètres. Les fonctions sont pures : elles ne
 * touchent ni au DOM ni à l'état global, ce qui les rend testables avec
 * `node --test`.
 */

import {
  GAMMES, REGLES_COMMUNES, HAUTEUR_MAX_CLOTURE,
  getGamme, getOuvrant, getPoseOuvrant,
} from '../data/catalogue.js';

/** Configuration par défaut du configurateur. */
export const CONFIG_DEFAUT = {
  /** Hauteur de clôture hors sol visée (voir HAUTEURS_CLOTURE). */
  hauteurCible: 1800,
  typeTrace: 'lineaire', // 'lineaire' | 'angulaire'
  segments: [{ longueur: 12000 }],
  /** Habillages retenus : [{ gamme, panneaux }]. `panneaux: null` = répartition automatique. */
  habillages: [{ gamme: 'atmosphere', panneaux: null }],
  variante: 'plein', // 'plein' | 'ajoure' (habillage aluminium uniquement)
  /** Nombre d'entretoises empilées entre deux lames en panneau ajouré. */
  entretoisesEmpilees: 1,
  pose: 'platine',
  hauteurMuret: 0,
  soubassement: 'lisse_basse', // 'lisse_basse' | 'plaque_soubassement' | 'aucun'
  ouvrant: 'aucun',
  poseOuvrant: 'sur_poteaux',
  nbOuvrants: 0,
  decorsHorizontaux: 0,
  decorsVerticaux: 0,
  coloris: { atmosphere: 'gris_anthracite', aluminium: 'gris_anthracite', persienne: 'gris_anthracite' },
  finitionLame: null,
  finitionAccessoires: 'gris_anthracite',
  baguetteFinition: false,
  poteauxMuraux: 0,
};

const round = (v) => Math.round(v);

/**
 * Nombre de lisses intermédiaires nécessaires.
 * PU11 p.6 et page accessoires : au minimum une lisse toutes les trois lames.
 */
export function nbLissesIntermediaires(gamme, nbLames) {
  const max = gamme.empilement.lamesMaxEntreLisses;
  if (!Number.isFinite(max) || nbLames <= max) return 0;
  return Math.ceil(nbLames / max) - 1;
}

/**
 * Hauteur d'empilement d'un panneau (du sol au dessus de la lisse haute).
 * @returns {{hauteur:number, detail:Array, nbLissesIntermediaires:number}}
 */
export function hauteurEmpilement(config, gammeId, nbLames) {
  const gamme = getGamme(gammeId);
  const e = gamme.empilement;
  const lames = Math.max(1, nbLames);
  const detail = [];
  let total = 0;

  const ajoute = (poste, quantite, hauteur) => {
    if (!quantite || !hauteur) return;
    detail.push({ poste, quantite, hauteur, total: round(quantite * hauteur) });
    total += quantite * hauteur;
  };

  // Soubassement (composite : lisse basse ou plaque de soubassement).
  if (gamme.lisseBasse.obligatoire || config.soubassement === 'plaque_soubassement') {
    if (config.soubassement === 'plaque_soubassement') {
      ajoute('Plaque de soubassement (hors sol)', 1, e.plaqueSoubassementHorsSol);
    } else if (config.soubassement !== 'aucun') {
      ajoute('Lisse basse', 1, e.lisseBasse);
    }
  }

  // Lames.
  const ajoure = estAjoure(config, gamme);
  if (ajoure) {
    const a = e.ajoure;
    const parInterstice = Math.max(1, config.entretoisesEmpilees || 1);
    ajoute('Lames (entre entretoises)', lames, a.lameEntreEntretoises);
    ajoute('Entretoises', Math.max(0, lames - 1) * parInterstice, a.entretoise);
  } else {
    ajoute('Première lame', 1, e.premiereLame);
    ajoute('Lames suivantes', lames - 1, e.lameSuivante);
  }

  const nbInter = nbLissesIntermediaires(gamme, lames);
  ajoute('Lisses intermédiaires', nbInter, e.lisseIntermediaire);
  ajoute('Lisse haute', 1, e.lisseHaute);

  return { hauteur: round(total), detail, nbLissesIntermediaires: nbInter };
}

/** Le panneau ajouré n'existe que sur l'habillage aluminium. */
export function estAjoure(config, gamme) {
  return gamme.id === 'aluminium' && config.variante === 'ajoure';
}

/**
 * Nombre de lames d'un habillage pour approcher au mieux une hauteur visée,
 * sans jamais dépasser la hauteur maximale du catalogue.
 */
export function lamesPourHauteur(config, gammeId, hauteurCible) {
  let meilleur = null;
  for (let n = 1; n <= 20; n++) {
    const { hauteur } = hauteurEmpilement(config, gammeId, n);
    if (hauteur > HAUTEUR_MAX_CLOTURE) break;
    const ecart = Math.abs(hauteur - hauteurCible);
    if (!meilleur || ecart < meilleur.ecart) meilleur = { nbLames: n, hauteur, ecart };
  }
  return meilleur || { nbLames: 1, hauteur: hauteurEmpilement(config, gammeId, 1).hauteur, ecart: 0 };
}

/**
 * Hauteur de poteau nécessaire selon le type de pose.
 *
 * Deux valeurs sont produites :
 *  - `longueurPoteauCalculee` : dérivée des cotes de calepinage de la notice
 *    (support de platine + empilement + jeu haut de poteau, plus la partie
 *    enterrée en scellement) ;
 *  - `longueurPoteau` : valeur retenue. Lorsque la table du fabricant couvre
 *    le nombre de lames choisi, c'est elle qui fait foi.
 */
export function calculPoteau(config, gammeId, nbLames, hauteurCloture) {
  const gamme = getGamme(gammeId);
  const e = gamme.empilement;
  const p = gamme.poteau;
  const alertes = [];

  const surPlatine = config.pose === 'platine' || config.pose === 'muret';
  const hauteurClotureHorsSol = round((surPlatine ? e.supportPlatine : 0) + hauteurCloture);
  const hauteurHorsSolCalculee = round(hauteurClotureHorsSol + e.jeuHautPoteau);
  const longueurPoteauCalculee = round(
    hauteurHorsSolCalculee + (config.pose === 'scellement' ? p.profondeurScellement : 0)
  );

  const reference = gamme.tableConstructeur.find((r) => r.nbLames === nbLames) || null;
  const valeurTable = reference
    ? (config.pose === 'scellement' ? reference.poteauScellement : reference.poteauPlatine)
    : null;
  const longueurPoteau = valeurTable ?? longueurPoteauCalculee;
  const sourceHauteur = valeurTable ? `table ${gamme.notice}` : 'calcul de calepinage';
  const hauteurHorsSol = config.pose === 'scellement'
    ? round(longueurPoteau - p.profondeurScellement)
    : longueurPoteau;

  const platineValideeParTable = Boolean(surPlatine && reference && reference.poteauPlatine);
  if (surPlatine && !platineValideeParTable && hauteurHorsSol > p.hauteurMaxPlatine) {
    alertes.push({
      niveau: 'erreur',
      message:
        `La pose sur platines double coque est limitée à ${p.hauteurMaxPlatine} mm de poteau hors sol ` +
        `(${gamme.notice}). Hauteur nécessaire : ${hauteurHorsSol} mm. Passez en scellement béton ou ` +
        `réduisez la hauteur de clôture.`,
    });
  }
  if (longueurPoteau > p.longueurFournie) {
    alertes.push({
      niveau: 'erreur',
      message:
        `Le poteau nécessaire (${longueurPoteau} mm) dépasse la longueur fournie de ${p.longueurFournie} mm.`,
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
 * Découpage d'une longueur en panneaux : des panneaux pleins à l'entraxe
 * nominal (1800 mm) plus, si nécessaire, un panneau recoupé.
 */
export function decoupePanneaux(longueur, entraxe = REGLES_COMMUNES.entraxePoteaux) {
  const alertes = [];
  if (longueur <= 0) return { pleins: 0, reste: 0, panneauRecoupe: null, alertes };

  const pleins = Math.floor(longueur / entraxe);
  const reste = round(longueur - pleins * entraxe);
  let panneauRecoupe = null;

  if (reste > 0) {
    if (reste >= REGLES_COMMUNES.largeurPanneauMini) {
      panneauRecoupe = { largeur: reste };
    } else {
      alertes.push({
        niveau: 'avertissement',
        message:
          `Reliquat de ${reste} mm trop faible pour un panneau (mini ${REGLES_COMMUNES.largeurPanneauMini} mm). ` +
          `Répartissez ce reliquat sur les panneaux voisins en réduisant leur entraxe.`,
      });
    }
  }
  return { pleins, reste, panneauRecoupe, alertes };
}

/**
 * Répartit les panneaux entre les habillages retenus. Les habillages sans
 * nombre imposé se partagent le solde à parts égales, le reste de la division
 * revenant au premier.
 */
export function repartirPanneaux(habillages, total) {
  const retenus = (habillages || []).filter((h) => h && GAMMES[h.gamme]);
  if (!retenus.length) return [];

  const imposes = retenus.filter((h) => Number.isFinite(h.panneaux));
  const libres = retenus.filter((h) => !Number.isFinite(h.panneaux));

  let restant = total;
  const parts = new Map();
  for (const h of imposes) {
    const n = Math.max(0, Math.min(h.panneaux, restant));
    parts.set(h, n);
    restant -= n;
  }
  if (libres.length) {
    const base = Math.floor(restant / libres.length);
    libres.forEach((h, i) => parts.set(h, base + (i === 0 ? restant - base * libres.length : 0)));
    restant = 0;
  } else if (restant > 0 && imposes.length) {
    parts.set(imposes[0], parts.get(imposes[0]) + restant);
    restant = 0;
  }

  return retenus.map((h) => ({ gamme: h.gamme, nbPanneaux: parts.get(h) || 0 }));
}

/**
 * Calepinage complet du projet.
 */
export function calepiner(configUtilisateur) {
  const config = { ...CONFIG_DEFAUT, ...configUtilisateur };
  const ouvrant = getOuvrant(config.ouvrant);
  const alertes = [];

  // --- Longueurs ----------------------------------------------------------
  const segments = (config.segments || []).filter((s) => Number(s.longueur) > 0);
  const longueurTotale = segments.reduce((t, s) => t + Number(s.longueur), 0);
  const nbAngles = config.typeTrace === 'angulaire' ? Math.max(0, segments.length - 1) : 0;

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
        `dépassent la longueur totale du tracé (${longueurTotale} mm).`,
    });
  }

  const decoupe = decoupePanneaux(Math.max(0, longueurCloture));
  alertes.push(...decoupe.alertes);

  const nbPanneauxLames = decoupe.pleins + (decoupe.panneauRecoupe ? 1 : 0);
  const nbPanneauxTotal = nbPanneauxLames + config.decorsVerticaux;

  // --- Habillages ---------------------------------------------------------
  const repartition = repartirPanneaux(config.habillages, nbPanneauxLames);
  if (!repartition.length) {
    alertes.push({ niveau: 'erreur', message: 'Aucun habillage sélectionné pour la clôture.' });
  }

  let decorsRestants = Math.min(config.decorsHorizontaux, nbPanneauxLames);
  const compositions = repartition.map((part) => {
    const gamme = getGamme(part.gamme);
    const { nbLames, hauteur } = lamesPourHauteur(config, part.gamme, config.hauteurCible);
    const empilement = hauteurEmpilement(config, part.gamme, nbLames);
    const poteau = calculPoteau(config, part.gamme, nbLames, hauteur);

    // Décors horizontaux : attribués aux habillages dans l'ordre.
    const decors = Math.min(decorsRestants, part.nbPanneaux);
    decorsRestants -= decors;
    const lamesRemplacees = decors * gamme.decorHorizontal.remplaceLames;
    const lamesEncadrementSupp = decors * (gamme.decorHorizontal.lamesEncadrementSupp || 0);

    const nbLamesTotal = Math.max(0, part.nbPanneaux * nbLames - lamesRemplacees + lamesEncadrementSupp);
    const lamesDebutFin = gamme.id === 'persienne' ? part.nbPanneaux * 2 + lamesEncadrementSupp : 0;
    const lamesCourantes = Math.max(0, nbLamesTotal - lamesDebutFin);

    const e = gamme.empilement;
    const ajoure = estAjoure(config, gamme);
    const entretoisesEmpilees = ajoure ? Math.max(1, config.entretoisesEmpilees || 1) : 1;
    const entretoisesParLame = ajoure ? e.ajoure.entretoisesParLame : e.entretoisesParLame;

    const utiliseLisseBasse = gamme.lisseBasse.obligatoire && config.soubassement === 'lisse_basse';
    const utilisePlaque = gamme.lisseBasse.obligatoire && config.soubassement === 'plaque_soubassement';

    return {
      gamme,
      nbPanneaux: part.nbPanneaux,
      nbLames,
      hauteur,
      ecartHauteur: hauteur - config.hauteurCible,
      detailEmpilement: empilement.detail,
      poteau,
      decorsHorizontaux: decors,
      quantites: {
        nbLamesTotal,
        lamesCourantes,
        lamesDebutFin,
        nbEntretoises: entretoisesParLame * entretoisesEmpilees * nbLamesTotal,
        typeEntretoise: gamme.id === 'persienne' ? 'entretoise_persienne' : 'entretoise_aluminium',
        nbLisseHaute: part.nbPanneaux,
        nbLisseBasse: utiliseLisseBasse ? part.nbPanneaux : 0,
        nbPlaqueSoubassement: utilisePlaque ? part.nbPanneaux : 0,
        nbLisseInter: empilement.nbLissesIntermediaires * part.nbPanneaux,
      },
    };
  });

  const actives = compositions.filter((c) => c.nbPanneaux > 0);
  const reference = actives[0] || compositions[0] || null;

  // Le poteau doit satisfaire l'habillage le plus exigeant.
  const poteau = actives.reduce(
    (max, c) => (!max || c.poteau.longueurPoteau > max.longueurPoteau ? c.poteau : max),
    null
  ) || (reference ? reference.poteau : null);
  const hauteurCloture = actives.reduce((max, c) => Math.max(max, c.hauteur), 0);

  for (const c of actives) {
    for (const a of c.poteau.alertes) {
      if (!alertes.some((existante) => existante.message === a.message)) alertes.push(a);
    }
  }

  if (actives.length > 1) {
    const mini = Math.min(...actives.map((c) => c.hauteur));
    const maxi = Math.max(...actives.map((c) => c.hauteur));
    if (maxi - mini > 20) {
      alertes.push({
        niveau: 'avertissement',
        message:
          `Les habillages mélangés n'atteignent pas la même hauteur : ${mini} mm contre ${maxi} mm. ` +
          `Le décalage sera visible d'un panneau à l'autre ; ajustez la hauteur visée ou le nombre de lames.`,
      });
    }
  }
  if (config.hauteurCible > HAUTEUR_MAX_CLOTURE) {
    alertes.push({
      niveau: 'erreur',
      message: `Les fiches produit annoncent une clôture réalisable jusqu'à ${HAUTEUR_MAX_CLOTURE} mm.`,
    });
  }
  if (config.pose === 'muret') {
    const total = config.hauteurMuret + hauteurCloture;
    if (total > REGLES_COMMUNES.hauteurMaxMuretPlusCloture) {
      alertes.push({
        niveau: 'erreur',
        message:
          `Sécurité : muret + clôture = ${total} mm, au-delà du maximum de ` +
          `${REGLES_COMMUNES.hauteurMaxMuretPlusCloture} mm (PU41 p.3).`,
      });
    }
  }
  if (hauteurCloture > 1815 && config.pose !== 'scellement') {
    alertes.push({
      niveau: 'info',
      message:
        `La tenue au vent annoncée (${REGLES_COMMUNES.ventMaxKmH} km/h en site normal) couvre les clôtures ` +
        `jusqu'à 1815 mm de hauteur avec scellement béton.`,
    });
  }
  if (actives.some((c) => c.gamme.famille === 'Clôture aluminium')) {
    alertes.push({
      niveau: 'info',
      message:
        `La page accessoires présente les lisses comme optionnelles sur les lames aluminium, alors ` +
        `que les notices rendent la lisse haute impérative. Le chiffrage suit la notice.`,
    });
  }

  // --- Poteaux ------------------------------------------------------------
  const nbPoteaux = nbPanneauxTotal > 0 || nbOuvrants > 0 ? nbPanneauxTotal + 1 + nbOuvrants : 0;
  const nbPoteauxOuvrant = nbOuvrants * poseOuvrant.poteauxDedies;
  const nbPoteauxCloture = Math.max(0, nbPoteaux - nbPoteauxOuvrant);
  const nbPoteauxAngle = Math.min(nbAngles, Math.max(0, nbPoteauxCloture - 2));
  const nbPoteauxExtremite = nbPoteauxCloture > 0 ? 2 : 0;
  const nbPoteauxIntermediaires = Math.max(0, nbPoteauxCloture - nbPoteauxAngle - nbPoteauxExtremite);
  const nbDemiPoteauxMuraux = Math.min(config.poteauxMuraux, nbPoteauxCloture);
  const nbPoteauxPleins = Math.max(0, nbPoteauxCloture - nbDemiPoteauxMuraux);

  if (nbAngles > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `Angles : le poteau grand vent 3 en 1 ne convient qu'à une intersection à 90 degrés, et son ` +
        `haubanage est IMPÉRATIF en angle.`,
    });
  }

  // --- Accessoires --------------------------------------------------------
  const surPlatine = config.pose === 'platine' || config.pose === 'muret';
  const nbPlatines = surPlatine ? nbPoteauxCloture : 0;
  const nbGoujons = nbPlatines * REGLES_COMMUNES.goujonsParPlatine;
  const nbPoteauxScelles = config.pose === 'scellement' ? nbPoteauxCloture : 0;
  const volumeBeton_L = nbPoteauxScelles * REGLES_COMMUNES.volumeBetonParPoteau_L;

  const somme = (cle) => actives.reduce((t, c) => t + (c.quantites[cle] || 0), 0);
  const nbLisseHaute = somme('nbLisseHaute');
  const nbLisseBasse = somme('nbLisseBasse');
  const nbConnecteurs = (nbLisseHaute + nbLisseBasse) * REGLES_COMMUNES.connecteursParLisse;

  const lamesRecoupees = decoupe.panneauRecoupe && reference ? reference.nbLames : 0;
  const longueurLameRecoupee = decoupe.panneauRecoupe && reference
    ? round(decoupe.panneauRecoupe.largeur - (REGLES_COMMUNES.entraxePoteaux - reference.gamme.longueurLame))
    : 0;

  if (poteau && poteau.decoupeParPoteau > 0 && nbPoteaux > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `Poteaux à recouper : ${poteau.decoupeParPoteau} mm par poteau (fournis en ` +
        `${REGLES_COMMUNES.longueurPoteauFournie} mm). Conserver au minimum ${poteau.jeuHautPoteau} mm de jeu ` +
        `entre le capot et la lisse haute.`,
    });
  }
  if (decoupe.panneauRecoupe && reference) {
    alertes.push({
      niveau: 'info',
      message:
        `1 panneau recoupé de ${decoupe.panneauRecoupe.largeur} mm : ${lamesRecoupees} lames à recouper ` +
        `à ${longueurLameRecoupee} mm (jeu de dilatation de ${reference.gamme.jeuDilatationLongueur} mm ` +
        `à répartir de chaque côté).`,
    });
  }
  if (nbOuvrants > 0) {
    alertes.push({
      niveau: 'info',
      message:
        `${ouvrant.nom} : vantail de ${ouvrant.vantail.largeur} x ${ouvrant.vantail.hauteur} mm, ` +
        `${poseOuvrant.nom.toLowerCase()}, emprise de ${poseOuvrant.emprise} mm sur le tracé. ` +
        `${ouvrant.normeAccessibilite}.`,
    });
    const ecart = ouvrant.vantail.hauteur - hauteurCloture;
    if (Math.abs(ecart) > 100) {
      alertes.push({
        niveau: 'avertissement',
        message:
          `Le portillon mesure ${ouvrant.vantail.hauteur} mm de haut alors que la clôture en fait ` +
          `${hauteurCloture} mm : l'écart de ${Math.abs(ecart)} mm sera visible en limite de propriété.`,
      });
    }
    if (!ouvrant.coloris.some((c) => c.id === config.finitionAccessoires)) {
      alertes.push({
        niveau: 'avertissement',
        message:
          `${ouvrant.nom} n'est proposé qu'en ${ouvrant.coloris.map((c) => c.nom).join(', ')} : ` +
          `la finition d'accessoires choisie ne pourra pas être tenue sur l'ouvrant.`,
      });
    }
  }

  return {
    config,
    ouvrant,
    compositions,
    /** Habillage majoritaire, utilisé pour l'aperçu et les libellés. */
    gamme: reference ? reference.gamme : null,
    hauteurs: {
      cible: config.hauteurCible,
      empilement: hauteurCloture,
      detailEmpilement: reference ? reference.detailEmpilement : [],
      ...(poteau || {}),
    },
    longueurs: {
      longueurTotale,
      longueurOuvrants,
      longueurDecorsVerticaux,
      longueurCloture: Math.max(0, longueurCloture),
      entraxe: REGLES_COMMUNES.entraxePoteaux,
      panneauxPleins: decoupe.pleins,
      panneauRecoupe: decoupe.panneauRecoupe,
      nbPanneauxLames,
      nbPanneauxTotal,
      nbAngles,
    },
    quantites: {
      nbPoteaux,
      nbPoteauxCloture,
      nbPoteauxOuvrant,
      nbPoteauxPleins,
      nbDemiPoteauxMuraux,
      nbPoteauxExtremite,
      nbPoteauxAngle,
      nbPoteauxIntermediaires,
      nbLamesTotal: somme('nbLamesTotal'),
      nbEntretoises: somme('nbEntretoises'),
      nbLisseHaute,
      nbLisseBasse,
      nbLisseInter: somme('nbLisseInter'),
      nbPlaqueSoubassement: somme('nbPlaqueSoubassement'),
      nbConnecteurs,
      nbPlatines,
      nbGoujons,
      nbCapots: nbPoteauxPleins,
      nbDemiCapotsMuraux: nbDemiPoteauxMuraux,
      nbBaguettes: config.baguetteFinition ? nbPoteauxCloture : 0,
      nbPoteauxScelles,
      volumeBeton_L,
      lamesRecoupees,
      longueurLameRecoupee,
      decorsHorizontaux: config.decorsHorizontaux - decorsRestants,
      decorsVerticaux: config.decorsVerticaux,
      nbOuvrants,
    },
    alertes,
  };
}

export { GAMMES };
