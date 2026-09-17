/**
 * Configurateur clôture & portillon — couche interface.
 *
 * Le parcours suit celui du configurateur du fabricant : dimensions, puis
 * composition de la clôture, pose, décors et récapitulatif. L'état est un
 * simple objet de configuration ; à chaque modification on relance le moteur
 * de calepinage puis on redessine l'étape courante et la synthèse.
 */

import {
  POSES, DECORS, OUVRANTS, FINITIONS_ACCESSOIRES, HAUTEURS_CLOTURE, A_VALIDER,
  gammesProposees, getGamme, getOuvrant, hauteurEnMetres,
} from '../data/catalogue.js';
import { calepiner } from '../core/calepinage.js';
import { construireNomenclature, nomenclatureVersCSV } from '../core/nomenclature.js';
import { TARIF_ACTIF } from '../data/tarifs.js';
import { apercuElevation, apercuPlan } from './apercu.js';
import { chargerEtat, sauverEtat, lienPartage } from './etat.js';

const $ = (sel) => document.querySelector(sel);
const conteneurEtape = $('#etape-contenu');
const conteneurSynthese = $('#synthese');
const conteneurEtapes = $('#etapes');

const nf = new Intl.NumberFormat('fr-FR');
const ef = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const mm = (v) => `${nf.format(Math.round(v))} mm`;
const metres = (v) => `${nf.format(Math.round(v) / 1000)} m`;
const euro = (v) => (v === null || v === undefined ? '—' : ef.format(v));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let etat = chargerEtat();
let etapeCourante = 0;

const ETAPES = [
  { id: 'dimensions', titre: 'Dimensions', rendu: etapeDimensions },
  { id: 'composition', titre: 'Composition', rendu: etapeComposition },
  { id: 'pose', titre: 'Pose', rendu: etapePose },
  { id: 'decors', titre: 'Décors & accessoires', rendu: etapeDecors },
  { id: 'devis', titre: 'Récapitulatif', rendu: etapeDevis },
];

/* --------------------------------------------------- Étape 1 : dimensions */
function etapeDimensions() {
  const calc = calepiner(etat);
  const cotes = etat.segments.map((s, i) => {
    const longueur = Number(s.longueur) || 0;
    return `
      <div class="cote">
        <p class="cote__titre">Côté ${i + 1}</p>
        <div class="cote__champs">
          <label class="visuellement-cache" for="cote-m-${i}">Mètres du côté ${i + 1}</label>
          <input id="cote-m-${i}" type="number" min="0" max="200" step="1" data-cote="${i}" data-unite="m"
            value="${Math.floor(longueur / 1000)}">
          <span class="cote__unite">m.</span>
          <label class="visuellement-cache" for="cote-cm-${i}">Centimètres du côté ${i + 1}</label>
          <input id="cote-cm-${i}" type="number" min="0" max="99" step="1" data-cote="${i}" data-unite="cm"
            value="${Math.round((longueur % 1000) / 10)}">
          <span class="cote__unite">cm.</span>
        </div>
      </div>`;
  }).join('');

  return `
    <h2>Bienvenue sur le logiciel de calepinage de votre clôture</h2>
    <p class="etape__intro">Décrivez-nous précisément votre projet en remplissant les champs ci-dessous.
      Vous obtiendrez la liste des éléments nécessaires à la réalisation de votre clôture. L'ensemble des
      produits et accessoires en aluminium sont disponibles en finition sablée.</p>

    <fieldset>
      <legend>Hauteur de clôture hors sol</legend>
      <div style="max-width:220px">
        <select name="hauteurCible" id="hauteurCible" aria-label="Hauteur de clôture hors sol">
          ${HAUTEURS_CLOTURE.map((h) => `
            <option value="${h.valeur}" ${etat.hauteurCible === h.valeur ? 'selected' : ''}>${h.libelle}</option>`).join('')}
        </select>
      </div>
      <p class="aide">Hauteur maximale : ${hauteurEnMetres(1800)}. La hauteur réellement obtenue dépend de
        l'habillage choisi, chaque lame ayant sa propre épaisseur.</p>
    </fieldset>

    <fieldset>
      <legend>Type de clôture</legend>
      <div class="choix-liste">
        ${choix('typeTrace', 'lineaire', 'Linéaire', 'Une seule ligne droite', etat.typeTrace === 'lineaire')}
        ${choix('typeTrace', 'angulaire', 'Angulaire', 'Plusieurs côtés, angles à 90 degrés', etat.typeTrace === 'angulaire')}
      </div>
      ${etat.typeTrace === 'angulaire' ? `
        <div style="margin-top:14px;max-width:220px">
          <label for="nbCotes">Nombre de côtés</label>
          <select id="nbCotes" name="nbCotes">
            ${[2, 3, 4, 5].map((n) => `<option value="${n}" ${etat.segments.length === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>` : ''}
    </fieldset>

    <fieldset>
      <legend>Longueurs</legend>
      <div class="cotes">${cotes}</div>
      <p class="resultat">La longueur de votre clôture sera de :
        <strong>${nf.format(Math.round(calc.longueurs.longueurTotale) / 1000)}</strong> mètres</p>
    </fieldset>`;
}

/* ------------------------------------------------- Étape 2 : composition */
function etapeComposition() {
  const calc = calepiner(etat);
  const choisies = new Set(etat.habillages.map((h) => h.gamme));
  const multiple = choisies.size > 1;

  const cartes = gammesProposees().map((g) => {
    const actif = choisies.has(g.id);
    const composition = calc.compositions.find((c) => c.gamme.id === g.id);
    const details = [
      `${g.famille}`,
      g.garantie ? `garantie ${g.garantie}` : null,
      composition ? `${composition.nbLames} lames → ${hauteurEnMetres(composition.hauteur)}` : null,
    ].filter(Boolean).join(' — ');
    return `
      <label class="choix ${actif ? 'choix--actif' : ''}">
        <input type="checkbox" name="habillage" value="${g.id}" ${actif ? 'checked' : ''}>
        <span class="choix__titre">${escapeHtml(g.produit)}</span>
        <span class="choix__detail">${escapeHtml(details)}</span>
      </label>`;
  }).join('');

  const repartition = multiple ? `
    <fieldset>
      <legend>Répartition des panneaux</legend>
      <div class="grille">
        ${calc.compositions.map((c) => `
          <div>
            <label for="part-${c.gamme.id}">${escapeHtml(c.gamme.nom)}</label>
            <input id="part-${c.gamme.id}" type="number" min="0" max="${calc.longueurs.nbPanneauxLames}" step="1"
              data-habillage="${c.gamme.id}" value="${c.nbPanneaux}">
          </div>`).join('')}
      </div>
      <p class="aide">${calc.longueurs.nbPanneauxLames} panneaux à répartir. Les panneaux composite et
        aluminium se combinent librement sur une même clôture.</p>
    </fieldset>` : '';

  const coloris = calc.compositions.map((c) => {
    const g = c.gamme;
    if (!g.coloris.length) {
      return `<p class="message message--avertissement">${escapeHtml(g.produit)} : coloris à renseigner.</p>`;
    }
    const choisi = etat.coloris[g.id] || g.coloris[0].id;
    return `
      <div style="margin-bottom:14px">
        <p class="aide" style="margin:0 0 6px;font-weight:600;color:var(--texte)">${escapeHtml(g.produit)}</p>
        <div class="pastilles">
          ${g.coloris.map((c2) => `
            <label class="pastille ${choisi === c2.id ? 'pastille--actif' : ''}">
              <input type="radio" name="coloris-${g.id}" value="${c2.id}" ${choisi === c2.id ? 'checked' : ''}>
              <span class="pastille__couleur" style="background:${c2.hex}"></span>${escapeHtml(c2.nom)}
            </label>`).join('')}
        </div>
      </div>`;
  }).join('');

  const alu = calc.compositions.find((c) => c.gamme.id === 'aluminium');

  return `
    <h2>Composez votre clôture</h2>
    <p class="etape__intro">Choisissez un ou plusieurs habillages : les lames composite, aluminium et
      persienne se montent sur les mêmes poteaux et peuvent alterner d'un panneau à l'autre.</p>

    <fieldset>
      <legend>Habillage de votre clôture</legend>
      <div class="choix-liste">${cartes}</div>
    </fieldset>

    ${repartition}

    ${alu ? `
    <fieldset>
      <legend>Montage des panneaux aluminium</legend>
      <div class="choix-liste">
        ${choix('variante', 'plein', 'Panneau plein', 'Lames empilées directement, occultation totale', etat.variante === 'plein')}
        ${choix('variante', 'ajoure', 'Panneau ajouré', 'Lames séparées par des entretoises de 15 mm', etat.variante === 'ajoure')}
      </div>
      ${etat.variante === 'ajoure' ? `
        <div style="margin-top:12px;max-width:280px">
          <label for="entretoisesEmpilees">Entretoises empilées par interstice</label>
          <input id="entretoisesEmpilees" type="number" name="entretoisesEmpilees" min="1" max="4" step="1" value="${etat.entretoisesEmpilees}">
          <p class="aide">Les entretoises de 15 mm se cumulent pour élargir les claires-voies.</p>
        </div>` : ''}
    </fieldset>` : ''}

    <fieldset>
      <legend>Coloris des lames</legend>
      ${coloris}
    </fieldset>

    <fieldset>
      <legend>Finition des accessoires aluminium</legend>
      <div class="pastilles">
        ${FINITIONS_ACCESSOIRES.map((f) => `
          <label class="pastille ${etat.finitionAccessoires === f.id ? 'pastille--actif' : ''}">
            <input type="radio" name="finitionAccessoires" value="${f.id}" ${etat.finitionAccessoires === f.id ? 'checked' : ''}>
            <span class="pastille__couleur" style="background:${f.hex}"></span>${escapeHtml(f.nom)}
            <span class="aide" style="margin:0">${escapeHtml(f.ral)}${f.statut === A_VALIDER ? ' — à confirmer' : ''}</span>
          </label>`).join('')}
      </div>
      <p class="aide">Poteaux, lisses, capots, platines et décors : aluminium thermolaqué finition sablée.</p>
    </fieldset>
    ${messages(calc.alertes)}`;
}

/* -------------------------------------------------------- Étape 3 : pose */
function etapePose() {
  const calc = calepiner(etat);
  const composite = calc.compositions.some((c) => c.gamme.lisseBasse.obligatoire && c.nbPanneaux > 0);

  return `
    <h2>Type de pose</h2>
    <p class="etape__intro">La pose détermine la longueur des poteaux : sur platines, en scellement béton
      ou sur muret.</p>

    <fieldset>
      <legend>Fixation</legend>
      <div class="choix-liste">
        ${Object.values(POSES).map((p) => choix('pose', p.id, p.nom, p.aide, etat.pose === p.id)).join('')}
      </div>
      ${etat.pose === 'muret' ? `
        <div style="margin-top:12px;max-width:260px">
          <label for="hauteurMuret">Hauteur du muret (mm)</label>
          <input id="hauteurMuret" type="number" name="hauteurMuret" min="0" max="1500" step="10" value="${etat.hauteurMuret}">
        </div>` : ''}
      <p class="aide">Poteau à recouper : <strong>${mm(calc.hauteurs.longueurPoteau || 0)}</strong>
        (fourni en 2 315 mm, chute de ${mm(calc.hauteurs.decoupeParPoteau || 0)} par poteau).</p>
    </fieldset>

    ${composite ? `
    <fieldset>
      <legend>Bas de panneau composite</legend>
      <div class="choix-liste">
        ${choix('soubassement', 'lisse_basse', 'Lisse basse', 'Lisse posée au sol sous la première lame', etat.soubassement === 'lisse_basse')}
        ${choix('soubassement', 'plaque_soubassement', 'Plaque de soubassement', 'Simplifie la pose sur terrain pentu et crée une surface plane', etat.soubassement === 'plaque_soubassement')}
      </div>
    </fieldset>` : ''}

    <fieldset>
      <legend>Portillon</legend>
      <div class="grille">
        <div>
          <label for="ouvrant">Modèle</label>
          <select id="ouvrant" name="ouvrant">
            ${OUVRANTS.map((o) => `<option value="${o.id}" ${etat.ouvrant === o.id ? 'selected' : ''}>${escapeHtml(o.nom)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="nbOuvrants">Quantité</label>
          <input id="nbOuvrants" type="number" name="nbOuvrants" min="0" max="10" step="1" value="${etat.nbOuvrants}"
            ${etat.ouvrant === 'aucun' ? 'disabled' : ''}>
        </div>
      </div>
      ${renduPosesOuvrant()}
    </fieldset>
    ${messages(calc.alertes)}`;
}

function renduPosesOuvrant() {
  const ouvrant = getOuvrant(etat.ouvrant);
  if (!ouvrant.type) return '';
  return `
    <h3>Type de pose du portillon</h3>
    <div class="choix-liste">
      ${ouvrant.poses.map((p) => choix('poseOuvrant', p.id, p.nom,
        `Emprise de ${p.emprise} mm sur le tracé, ${p.poteauxDedies ? `${p.poteauxDedies} poteaux ${ouvrant.poteau.section}` : 'aucun poteau Silvadec'}`,
        etat.poseOuvrant === p.id)).join('')}
    </div>
    <p class="aide">Vantail ${ouvrant.vantail.largeur} x ${ouvrant.vantail.hauteur} x ${ouvrant.vantail.epaisseur} mm,
      largeur entre poteaux ${ouvrant.largeurEntrePoteaux} mm, passage utile ${ouvrant.passageUtile} mm.
      ${escapeHtml(ouvrant.normeAccessibilite)}. Coloris : ${ouvrant.coloris.map((c) => escapeHtml(c.nom)).join(', ')}.</p>`;
}

/* ------------------------------------------------------ Étape 4 : décors */
function etapeDecors() {
  const calc = calepiner(etat);
  const persienne = calc.compositions.some((c) => c.gamme.id === 'persienne' && c.nbPanneaux > 0);
  return `
    <h2>Décors et accessoires</h2>
    <p class="etape__intro">Un décor horizontal de 300 mm remplace 2 lames empilées ; un décor vertical
      occupe un panneau dédié de 855 mm entre deux poteaux.</p>

    <fieldset>
      <legend>Décors</legend>
      <div class="grille">
        <div>
          <label for="decorsHorizontaux">Panneaux avec décor horizontal</label>
          <input id="decorsHorizontaux" type="number" name="decorsHorizontaux" min="0" max="${calc.longueurs.nbPanneauxLames}" step="1" value="${etat.decorsHorizontaux}">
          <p class="aide">Maximum ${calc.longueurs.nbPanneauxLames} (nombre de panneaux en lames).
            ${persienne ? "Sur la lame persienne, le décor s'insère entre 2 lames début/fin : il en faut 4 au lieu de 2." : "Le décor doit rester encadré par une lame de part et d'autre."}</p>
          <p class="aide">${DECORS.horizontaux.map((d) => escapeHtml(d.nom)).join(', ')}.</p>
        </div>
        <div>
          <label for="decorsVerticaux">Panneaux de décor vertical (855 mm)</label>
          <input id="decorsVerticaux" type="number" name="decorsVerticaux" min="0" max="10" step="1" value="${etat.decorsVerticaux}">
          <p class="aide">Ni lisse ni connecteur nécessaire.</p>
          <p class="aide">${DECORS.verticaux.map((d) => escapeHtml(d.nom)).join(', ')}.</p>
        </div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Finitions</legend>
      <label class="interrupteur">
        <input type="checkbox" name="baguetteFinition" ${etat.baguetteFinition ? 'checked' : ''}>
        Baguettes de finition en bout de clôture (27 x 9,5 x 1845 mm)
      </label>
      <div style="margin-top:14px;max-width:300px">
        <label for="poteauxMuraux">Départs contre un mur</label>
        <input id="poteauxMuraux" type="number" name="poteauxMuraux" min="0" max="20" step="1" value="${etat.poteauxMuraux}">
        <p class="aide">Chaque départ mural utilise un demi-poteau et un demi-capot au lieu d'un poteau entier.</p>
      </div>
    </fieldset>
    ${messages(calc.alertes)}`;
}

/* ------------------------------------------------- Étape 5 : récapitulatif */
function etapeDevis() {
  const calc = calepiner(etat);
  const nomenclature = construireNomenclature(calc, TARIF_ACTIF);
  const q = calc.quantites;

  const lignes = nomenclature.lignes.map((l) => `
    <tr>
      <td>${escapeHtml(l.designation)}${l.detail ? `<span class="detail-ligne">${escapeHtml(l.detail)}</span>` : ''}</td>
      <td class="nombre">${nf.format(l.quantite)} ${escapeHtml(l.unite)}</td>
      <td class="nombre">${euro(l.prixUnitaire)}</td>
      <td class="nombre">${euro(l.total)}</td>
    </tr>`).join('');

  const habillages = calc.compositions.filter((c) => c.nbPanneaux > 0)
    .map((c) => `${c.nbPanneaux} × ${escapeHtml(c.gamme.produit)} (${c.nbLames} lames, ${hauteurEnMetres(c.hauteur)})`)
    .join(' · ');

  return `
    <h2>Récapitulatif et nomenclature</h2>
    <p class="etape__intro">${habillages || 'Aucun habillage sélectionné'} — clôture de
      ${metres(calc.longueurs.longueurTotale)}, pose ${escapeHtml(POSES[etat.pose].nom.toLowerCase())}.</p>

    <div class="tableau-conteneur">
      <table>
        <thead><tr><th>Désignation</th><th class="nombre">Qté</th><th class="nombre">PU HT</th><th class="nombre">Total HT</th></tr></thead>
        <tbody>${lignes}</tbody>
        ${nomenclature.total !== null ? `<tfoot><tr><td colspan="3">Total HT estimé</td><td class="nombre">${euro(nomenclature.total)}</td></tr></tfoot>` : ''}
      </table>
    </div>

    <h3>Points de vigilance chantier</h3>
    <div class="rappel">
      <p style="margin:0 0 6px"><strong>Calepinage :</strong> ${nf.format(calc.longueurs.panneauxPleins)} panneaux à l'entraxe
      ${mm(calc.longueurs.entraxe)}${calc.longueurs.panneauRecoupe ? ` + 1 panneau recoupé de ${mm(calc.longueurs.panneauRecoupe.largeur)}` : ''}.</p>
      <p style="margin:0 0 6px"><strong>Poteaux :</strong> ${nf.format(q.nbPoteauxCloture)} poteaux de clôture dont
      ${nf.format(q.nbPoteauxAngle)} en angle${q.nbPoteauxOuvrant ? ` et ${nf.format(q.nbPoteauxOuvrant)} poteaux de portillon` : ''},
      à recouper à ${mm(calc.hauteurs.longueurPoteau || 0)}.</p>
      <p style="margin:0"><strong>Hauteur obtenue :</strong> ${hauteurEnMetres(calc.hauteurs.empilement)}
      (${mm(calc.hauteurs.empilement)}) pour une hauteur visée de ${hauteurEnMetres(calc.hauteurs.cible)}.</p>
    </div>

    ${messages(calc.alertes)}

    ${TARIF_ACTIF && !TARIF_ACTIF.reel ? `
      <div class="message message--avertissement" style="margin-top:16px">
        Les prix affichés proviennent d'une grille de <strong>démonstration</strong>
        (<code>src/data/tarifs.js</code>). Remplacez-la par votre tarif avant toute diffusion commerciale.
      </div>` : ''}

    <div class="actions">
      <button type="button" class="bouton bouton--primaire" data-action="imprimer">Imprimer / PDF</button>
      <button type="button" class="bouton bouton--fantome" data-action="csv">Télécharger le CSV</button>
      <button type="button" class="bouton bouton--fantome" data-action="json">Télécharger le JSON</button>
      <button type="button" class="bouton bouton--fantome" data-action="lien">Copier le lien du projet</button>
    </div>`;
}

/* ------------------------------------------------------------- Fragments */
function choix(nom, valeur, titre, detail, actif) {
  return `
    <label class="choix ${actif ? 'choix--actif' : ''}">
      <input type="radio" name="${nom}" value="${escapeHtml(valeur)}" ${actif ? 'checked' : ''}>
      <span class="choix__titre">${escapeHtml(titre)}</span>
      <span class="choix__detail">${escapeHtml(detail)}</span>
    </label>`;
}

function messages(alertes) {
  if (!alertes.length) return '';
  const ordre = { erreur: 0, avertissement: 1, info: 2 };
  const tri = [...alertes].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  return `<div class="messages">${tri.map((a) => `
    <p class="message message--${a.niveau}">${escapeHtml(a.message)}</p>`).join('')}</div>`;
}

/* -------------------------------------------------------------- Synthèse */
function rendreSynthese() {
  const calc = calepiner(etat);
  const nomenclature = construireNomenclature(calc, TARIF_ACTIF);
  const q = calc.quantites;
  const erreurs = calc.alertes.filter((a) => a.niveau === 'erreur').length;
  const principale = calc.compositions.find((c) => c.nbPanneaux > 0) || calc.compositions[0];
  const coloris = principale
    ? (principale.gamme.coloris.find((c) => c.id === etat.coloris[principale.gamme.id]) || principale.gamme.coloris[0])
    : null;

  conteneurSynthese.innerHTML = `
    <p class="synthese__titre">Votre projet</p>
    <div id="apercu-elevation"></div>
    <div id="apercu-plan"></div>
    <ul class="chiffres">
      ${calc.compositions.filter((c) => c.nbPanneaux > 0).map((c) => `
        <li><span>${escapeHtml(c.gamme.nom)}</span><span>${nf.format(c.nbPanneaux)} panneaux · ${hauteurEnMetres(c.hauteur)}</span></li>`).join('')}
      <li><span>Hauteur visée</span><span>${hauteurEnMetres(calc.hauteurs.cible)}</span></li>
      <li><span>Longueur de clôture</span><span>${metres(calc.longueurs.longueurTotale)}</span></li>
      <li><span>Panneaux</span><span>${nf.format(calc.longueurs.nbPanneauxTotal)}</span></li>
      <li><span>Poteaux</span><span>${nf.format(q.nbPoteaux)} (dont ${nf.format(q.nbPoteauxAngle)} angle)</span></li>
      <li><span>Lames</span><span>${nf.format(q.nbLamesTotal)}</span></li>
      <li><span>Longueur de poteau</span><span>${mm(calc.hauteurs.longueurPoteau || 0)}</span></li>
    </ul>
    ${nomenclature.total !== null ? `
      <div class="total">
        <div class="total__montant">${euro(nomenclature.total)} HT</div>
        <p class="total__mention">Estimation fournitures, hors pose et livraison${TARIF_ACTIF.reel ? '' : ' — tarif de démonstration'}.</p>
      </div>` : ''}
    ${erreurs ? `<p class="message message--erreur" style="margin-top:14px">${erreurs} point(s) bloquant(s) à corriger.</p>` : ''}`;

  $('#apercu-elevation').append(apercuElevation(calc, coloris ? coloris.hex : '#4a4e51'));
  const plan = $('#apercu-plan');
  plan.style.marginTop = '12px';
  plan.append(apercuPlan(calc));
}

/* ----------------------------------------------------------------- Rendu */
function rendreEtapes() {
  if (!conteneurEtapes.children.length) {
    conteneurEtapes.innerHTML = ETAPES.map((e, i) => `
      <button type="button" class="etapes__item" data-etape="${i}">
        <span class="etapes__num">${i + 1}</span>${escapeHtml(e.titre)}
      </button>`).join('');
  }
  [...conteneurEtapes.children].forEach((bouton, i) => {
    if (i === etapeCourante) bouton.setAttribute('aria-current', 'step');
    else bouton.removeAttribute('aria-current');
  });
}

function repereFocus() {
  const actif = document.activeElement;
  if (!actif || !conteneurEtape.contains(actif)) return null;
  let debut = null;
  let fin = null;
  try { debut = actif.selectionStart; fin = actif.selectionEnd; } catch { /* champ sans sélection */ }
  return {
    id: actif.id, name: actif.name, type: actif.type,
    cote: actif.dataset.cote, unite: actif.dataset.unite, habillage: actif.dataset.habillage,
    debut, fin,
  };
}

function restaureFocus(repere) {
  if (!repere) return;
  let champ = null;
  if (repere.id) champ = conteneurEtape.querySelector(`#${CSS.escape(repere.id)}`);
  if (!champ && repere.cote !== undefined && repere.unite) {
    champ = conteneurEtape.querySelector(`[data-cote="${repere.cote}"][data-unite="${repere.unite}"]`);
  }
  if (!champ && repere.habillage) champ = conteneurEtape.querySelector(`[data-habillage="${repere.habillage}"]`);
  if (!champ && repere.name) {
    champ = [...conteneurEtape.querySelectorAll(`[name="${CSS.escape(repere.name)}"]`)]
      .find((c) => c.type === repere.type) || null;
  }
  if (!champ) return;
  champ.focus();
  if (repere.debut !== null) {
    try { champ.setSelectionRange(repere.debut, repere.fin); } catch { /* type sans sélection */ }
  }
}

function rendre() {
  const repere = repereFocus();
  conteneurEtape.innerHTML = ETAPES[etapeCourante].rendu();
  rendreEtapes();
  rendreSynthese();
  $('#precedent').disabled = etapeCourante === 0;
  $('#suivant').disabled = etapeCourante === ETAPES.length - 1;
  sauverEtat(etat);
  history.replaceState(null, '', lienPartage(etat));
  restaureFocus(repere);
}

/* ------------------------------------------------------------- Écouteurs */
const CHAMPS_NOMBRE = new Set([
  'nbOuvrants', 'hauteurMuret', 'decorsHorizontaux', 'decorsVerticaux',
  'poteauxMuraux', 'entretoisesEmpilees',
]);

function majDepuisChamp(cible) {
  const nom = cible.name;

  // Longueur d'un côté, saisie en mètres et centimètres.
  if (cible.dataset.cote !== undefined) {
    const i = Number(cible.dataset.cote);
    const actuel = Number(etat.segments[i]?.longueur) || 0;
    const m = cible.dataset.unite === 'm' ? Number(cible.value) || 0 : Math.floor(actuel / 1000);
    const cm = cible.dataset.unite === 'cm' ? Number(cible.value) || 0 : Math.round((actuel % 1000) / 10);
    etat.segments[i] = { longueur: Math.max(0, m * 1000 + cm * 10) };
    return true;
  }

  // Répartition des panneaux entre habillages.
  if (cible.dataset.habillage) {
    const id = cible.dataset.habillage;
    const entree = etat.habillages.find((h) => h.gamme === id);
    if (entree) entree.panneaux = Math.max(0, Number(cible.value) || 0);
    return true;
  }

  if (!nom) return false;

  if (nom === 'habillage') {
    const id = cible.value;
    if (cible.checked) {
      if (!etat.habillages.some((h) => h.gamme === id)) etat.habillages.push({ gamme: id, panneaux: null });
    } else if (etat.habillages.length > 1) {
      etat.habillages = etat.habillages.filter((h) => h.gamme !== id);
    }
    // Une seule gamme : on repasse en répartition automatique.
    if (etat.habillages.length === 1) etat.habillages[0].panneaux = null;
    for (const h of etat.habillages) {
      const g = getGamme(h.gamme);
      if (g.coloris.length && !etat.coloris[h.gamme]) etat.coloris[h.gamme] = g.coloris[0].id;
    }
    etat.soubassement = etat.habillages.some((h) => getGamme(h.gamme).lisseBasse.obligatoire)
      ? (etat.soubassement === 'aucun' ? 'lisse_basse' : etat.soubassement)
      : 'aucun';
    return true;
  }

  if (nom.startsWith('coloris-')) {
    etat.coloris = { ...etat.coloris, [nom.slice('coloris-'.length)]: cible.value };
    return true;
  }

  if (nom === 'hauteurCible') {
    etat.hauteurCible = Number(cible.value) || 1800;
    return true;
  }

  if (nom === 'typeTrace') {
    etat.typeTrace = cible.value;
    if (etat.typeTrace === 'lineaire') etat.segments = [etat.segments[0] || { longueur: 0 }];
    else if (etat.segments.length < 2) etat.segments = [...etat.segments, { longueur: 0 }];
    return true;
  }

  if (nom === 'nbCotes') {
    const n = Number(cible.value) || 2;
    const segments = [...etat.segments];
    while (segments.length < n) segments.push({ longueur: 0 });
    etat.segments = segments.slice(0, n);
    return true;
  }

  if (CHAMPS_NOMBRE.has(nom)) etat[nom] = Math.max(0, Number(cible.value) || 0);
  else if (cible.type === 'checkbox') etat[nom] = cible.checked;
  else etat[nom] = cible.value;

  if (nom === 'ouvrant') etat.nbOuvrants = cible.value === 'aucun' ? 0 : Math.max(1, etat.nbOuvrants);
  return true;
}

// Les champs numériques sont traités sur `input` : leur événement `change`
// (déclenché par la perte de focus) redessinerait l'étape au moment même du
// clic suivant, et le bouton visé serait détaché avant de recevoir l'événement.
const TRAITE_SUR_INPUT = new Set(['number', 'range']);

$('#formulaire').addEventListener('change', (ev) => {
  if (TRAITE_SUR_INPUT.has(ev.target.type)) return;
  if (majDepuisChamp(ev.target)) rendre();
});

$('#formulaire').addEventListener('input', (ev) => {
  if (!TRAITE_SUR_INPUT.has(ev.target.type)) return;
  if (majDepuisChamp(ev.target)) rendre();
});

$('#formulaire').addEventListener('click', async (ev) => {
  const bouton = ev.target.closest('[data-action]');
  if (!bouton) return;
  const calc = calepiner(etat);
  switch (bouton.dataset.action) {
    case 'imprimer':
      window.print();
      break;
    case 'csv':
      telecharger('nomenclature-cloture.csv', nomenclatureVersCSV(construireNomenclature(calc, TARIF_ACTIF)), 'text/csv;charset=utf-8');
      break;
    case 'json':
      telecharger('projet-cloture.json', JSON.stringify({ configuration: etat, calepinage: calc, nomenclature: construireNomenclature(calc, TARIF_ACTIF) }, null, 2), 'application/json');
      break;
    case 'lien': {
      const lien = lienPartage(etat);
      try {
        await navigator.clipboard.writeText(lien);
        bouton.textContent = 'Lien copié !';
        setTimeout(() => { bouton.textContent = 'Copier le lien du projet'; }, 2000);
      } catch {
        prompt('Copiez le lien de votre projet :', lien);
      }
      break;
    }
  }
});

conteneurEtapes.addEventListener('click', (ev) => {
  const bouton = ev.target.closest('[data-etape]');
  if (!bouton) return;
  etapeCourante = Number(bouton.dataset.etape);
  rendre();
});

$('#precedent').addEventListener('click', () => { etapeCourante = Math.max(0, etapeCourante - 1); rendre(); });
$('#suivant').addEventListener('click', () => { etapeCourante = Math.min(ETAPES.length - 1, etapeCourante + 1); rendre(); });

function telecharger(nomFichier, contenu, type) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  a.click();
  URL.revokeObjectURL(url);
}

rendre();
