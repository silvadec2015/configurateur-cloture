/**
 * Fiche récapitulative en JPEG.
 *
 * Le récapitulatif est redessiné dans un canvas — en-tête, aperçus, chiffres
 * clés et nomenclature — puis exporté en image, plus facile à transmettre
 * qu'un JSON ou qu'une capture d'écran.
 */

import { hauteurEnMetres } from '../data/catalogue.js';
import { apercuElevation, apercuPlan } from './apercu.js';

const LARGEUR = 1000;
const MARGE = 48;
const ECHELLE = 2; // rendu en 2x pour rester net à l'impression

const ENCRE = '#16202a';
const ENCRE_DOUCE = '#5b6b7a';
const ACCENT = '#1f7a5a';
const FOND_DOUX = '#eef2f6';

const nf = new Intl.NumberFormat('fr-FR');
const ef = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const police = (taille, graisse = 400) =>
  `${graisse} ${taille}px "Inter", "Segoe UI", system-ui, -apple-system, sans-serif`;

/**
 * Convertit un SVG détaché en image bitmap.
 * `currentColor` n'a aucun sens hors du document : il est remplacé par une
 * couleur explicite avant sérialisation.
 */
function svgVersImage(svg, largeur, hauteur) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('width', largeur);
  clone.setAttribute('height', hauteur);
  const source = new XMLSerializer().serializeToString(clone).replace(/currentColor/g, ENCRE);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** Découpe un texte pour qu'il tienne dans une largeur donnée. */
function decouper(ctx, texte, largeurMax) {
  const mots = String(texte).split(' ');
  const lignes = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (ctx.measureText(essai).width > largeurMax && courante) {
      lignes.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) lignes.push(courante);
  return lignes;
}

/**
 * @returns {Promise<Blob>} la fiche récapitulative au format JPEG
 */
export async function imageRecapitulative(calepinage, nomenclature, options = {}) {
  const couleur = options.couleur || '#4a4e51';
  const lignes = nomenclature.lignes;

  // Hauteur totale calculée avant de dimensionner le canvas.
  const HAUTEUR_APERCU = 250;
  const PAS_CHIFFRE = 36;
  const NB_CHIFFRES = 7;
  // Le bloc du haut doit contenir le plus grand des deux : aperçus ou chiffres.
  const HAUTEUR_BLOC = Math.max(HAUTEUR_APERCU, 18 + NB_CHIFFRES * PAS_CHIFFRE);
  const HAUTEUR_LIGNE = 34;
  const hauteur = 150 + HAUTEUR_BLOC + 60 + (lignes.length + 1) * HAUTEUR_LIGNE + 150;

  const canvas = document.createElement('canvas');
  canvas.width = LARGEUR * ECHELLE;
  canvas.height = hauteur * ECHELLE;
  const ctx = canvas.getContext('2d');
  ctx.scale(ECHELLE, ECHELLE);

  const [elevation, plan] = await Promise.all([
    svgVersImage(apercuElevation(calepinage, couleur), 300, HAUTEUR_APERCU),
    svgVersImage(apercuPlan(calepinage), 300, 165),
  ]);

  // --- Fond et en-tête ----------------------------------------------------
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LARGEUR, hauteur);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, LARGEUR, 8);

  let y = 62;
  ctx.fillStyle = ENCRE;
  ctx.font = police(28, 700);
  ctx.fillText('Récapitulatif de votre projet de clôture', MARGE, y);

  y += 26;
  ctx.font = police(14);
  ctx.fillStyle = ENCRE_DOUCE;
  const habillages = calepinage.compositions
    .filter((c) => c.nbPanneaux > 0)
    .map((c) => `${c.nbPanneaux} × ${c.gamme.produit}`)
    .join(' · ');
  ctx.fillText(habillages || 'Aucun habillage sélectionné', MARGE, y);

  y += 20;
  ctx.fillText(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, MARGE, y);

  // --- Aperçus et chiffres clés ------------------------------------------
  y += 24;
  const hautBloc = y;
  ctx.fillStyle = FOND_DOUX;
  ctx.fillRect(MARGE, hautBloc, 300, HAUTEUR_APERCU);
  if (elevation) ctx.drawImage(elevation, MARGE, hautBloc, 300, HAUTEUR_APERCU);

  const xPlan = MARGE + 316;
  ctx.fillStyle = FOND_DOUX;
  ctx.fillRect(xPlan, hautBloc, 300, 165);
  if (plan) ctx.drawImage(plan, xPlan, hautBloc, 300, 165);

  const q = calepinage.quantites;
  const chiffres = [
    ['Hauteur visée', hauteurEnMetres(calepinage.hauteurs.cible)],
    ['Hauteur obtenue', hauteurEnMetres(calepinage.hauteurs.empilement)],
    ['Longueur de clôture', `${nf.format(Math.round(calepinage.longueurs.longueurTotale) / 1000)} m`],
    ['Panneaux', nf.format(calepinage.longueurs.nbPanneauxTotal)],
    ['Poteaux', nf.format(q.nbPoteaux)],
    ['Lames', nf.format(q.nbLamesTotal)],
    ['Longueur de poteau', `${nf.format(calepinage.hauteurs.longueurPoteau || 0)} mm`],
  ];
  const xChiffres = MARGE + 648;
  let yChiffre = hautBloc + 16;
  for (const [libelle, valeur] of chiffres) {
    ctx.font = police(12);
    ctx.fillStyle = ENCRE_DOUCE;
    ctx.fillText(libelle, xChiffres, yChiffre);
    ctx.font = police(15, 650);
    ctx.fillStyle = ENCRE;
    ctx.fillText(valeur, xChiffres, yChiffre + 16);
    yChiffre += PAS_CHIFFRE;
  }

  // --- Nomenclature -------------------------------------------------------
  y = hautBloc + HAUTEUR_BLOC + 46;
  ctx.font = police(17, 700);
  ctx.fillStyle = ENCRE;
  ctx.fillText('Nomenclature', MARGE, y);

  y += 22;
  const colonnes = { designation: MARGE, quantite: LARGEUR - MARGE - 280, pu: LARGEUR - MARGE - 150, total: LARGEUR - MARGE };
  ctx.font = police(11, 650);
  ctx.fillStyle = ENCRE_DOUCE;
  ctx.textAlign = 'left';
  ctx.fillText('DÉSIGNATION', colonnes.designation, y);
  ctx.textAlign = 'right';
  ctx.fillText('QTÉ', colonnes.quantite, y);
  ctx.fillText('PU HT', colonnes.pu, y);
  ctx.fillText('TOTAL HT', colonnes.total, y);
  ctx.textAlign = 'left';

  y += 10;
  for (const ligne of lignes) {
    ctx.strokeStyle = '#dde4ea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGE, y);
    ctx.lineTo(LARGEUR - MARGE, y);
    ctx.stroke();

    y += 22;
    ctx.font = police(14);
    ctx.fillStyle = ENCRE;
    const titre = decouper(ctx, ligne.designation, colonnes.quantite - MARGE - 24)[0];
    ctx.fillText(titre, colonnes.designation, y);

    ctx.textAlign = 'right';
    ctx.fillText(`${nf.format(ligne.quantite)} ${ligne.unite}`, colonnes.quantite, y);
    ctx.fillText(ligne.prixUnitaire === null ? '—' : ef.format(ligne.prixUnitaire), colonnes.pu, y);
    ctx.font = police(14, 650);
    ctx.fillText(ligne.total === null ? '—' : ef.format(ligne.total), colonnes.total, y);
    ctx.textAlign = 'left';
    y += 12;
  }

  ctx.strokeStyle = ENCRE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGE, y);
  ctx.lineTo(LARGEUR - MARGE, y);
  ctx.stroke();

  if (nomenclature.total !== null) {
    y += 26;
    ctx.font = police(16, 700);
    ctx.fillStyle = ENCRE;
    ctx.fillText('Total HT estimé', MARGE, y);
    ctx.textAlign = 'right';
    ctx.fillText(ef.format(nomenclature.total), colonnes.total, y);
    ctx.textAlign = 'left';
  }

  // --- Mentions -----------------------------------------------------------
  y += 34;
  ctx.font = police(11);
  ctx.fillStyle = ENCRE_DOUCE;
  const mentions = [
    `Estimation des fournitures, hors pose, livraison et terrassement.${
      nomenclature.tarif && !nomenclature.tarif.reel ? ' Tarif de démonstration, sans valeur commerciale.' : ''}`,
    'Cotes de montage issues des notices PU11 V23, PU36 V3 et PU41 V1 ; données produit issues des fiches du catalogue.',
    'Ce récapitulatif ne remplace pas la lecture des notices de montage avant chantier.',
  ];
  for (const mention of mentions) {
    for (const ligne of decouper(ctx, mention, LARGEUR - 2 * MARGE)) {
      ctx.fillText(ligne, MARGE, y);
      y += 16;
    }
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}
