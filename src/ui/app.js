/**
 * Configurateur clôture & portillon - couche interface.
 *
 * L’etat est un simple objet de configuration ; a chaque modification on
 * relance le moteur de calepinage puis on redessine l’etape courante et la
 * synthese. Aucune dependance externe.
 */

import {
  GAMMES, POSES, DECORS, OUVRANTS, FINITIONS_ACCESSOIRES, A_VALIDER,
  getGamme, getOuvrant, getPoseOuvrant,
} from '../data/catalogue.js';
import { calepiner, hauteurEmpilement, nbLamesPourHauteur } from '../core/calepinage.js';
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
  { id: 'gamme', titre: 'Lames', rendu: etapeGamme },
  { id: 'trace', titre: 'Trace', rendu: etapeTrace },
  { id: 'hauteur', titre: 'Hauteur & pose', rendu: etapeHauteur },
  { id: 'options', titre: 'Décors & accessoires', rendu: etapeOptions },
  { id: 'devis', titre: 'Récapitulatif', rendu: etapeDevis },
];

/* ---------------------------------------------------------------- Etape 1 */
function etapeGamme() {
  const gamme = getGamme(etat.gamme);
  const cartes = Object.values(GAMMES).map((g) => {
    const details = [g.famille, g.garantie ? `garantie ${g.garantie}` : null, g.label]
      .filter(Boolean).join(' — ');
    return choix('gamme', g.id, g.produit, details, etat.gamme === g.id);
  }).join('');

  const coloris = gamme.coloris;
  if (coloris.length && !coloris.some((c) => c.id === etat.coloris)) etat.coloris = coloris[0].id;

  return `
    <h2>1. Vos lames de clôture</h2>
    <p class="etape__intro">${escapeHtml(gamme.argumentaire)}</p>

    <fieldset>
      <legend>Gamme de lames</legend>
      <div class="choix-liste">${cartes}</div>
      <p class="aide">${escapeHtml(gamme.produit)} :
        ${gamme.lame.hauteur} x ${gamme.lame.épaisseur ?? '?'} x ${gamme.lame.longueur} mm.
        Montage selon la notice ${escapeHtml(gamme.notice)}.</p>
    </fieldset>

    ${gamme.id === 'aluminium' ? `
    <fieldset>
      <legend>Montage du panneau</legend>
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

    ${gamme.finitionsLame.length > 1 ? `
    <fieldset>
      <legend>Finition de lame</legend>
      <div class="pastilles">
        ${gamme.finitionsLame.map((f) => `
          <label class="pastille ${etat.finitionLame === f ? 'pastille--actif' : ''}">
            <input type="radio" name="finitionLame" value="${escapeHtml(f)}" ${etat.finitionLame === f ? 'checked' : ''}>
            ${escapeHtml(f)}
          </label>`).join('')}
      </div>
    </fieldset>` : ''}

    <fieldset>
      <legend>Coloris de lame</legend>
      ${coloris.length ? `
        <div class="pastilles">
          ${coloris.map((c) => `
            <label class="pastille ${etat.coloris === c.id ? 'pastille--actif' : ''}">
              <input type="radio" name="coloris" value="${c.id}" ${etat.coloris === c.id ? 'checked' : ''}>
              <span class="pastille__couleur" style="background:${c.hex}"></span>${escapeHtml(c.nom)}
              ${c.ral ? `<span class="aide" style="margin:0">${escapeHtml(c.ral)}</span>` : ''}
            </label>`).join('')}
        </div>
        ${gamme.colorisComplets ? '' : `<p class="aide">Coloris relevés sur la fiche produit consultée : la gamme peut en compter d’autres.</p>`}`
      : `<p class="message message--avertissement">Coloris non renseignés pour cette gamme : fiche produit à intégrer.</p>`}
    </fieldset>

    <fieldset>
      <legend>Finition des accessoires aluminium</legend>
      <div class="pastilles">
        ${FINITIONS_ACCESSOIRES.map((f) => `
          <label class="pastille ${etat.finitionAccessoires === f.id ? 'pastille--actif' : ''}">
            <input type="radio" name="finitionAccessoires" value="${f.id}" ${etat.finitionAccessoires === f.id ? 'checked' : ''}>
            <span class="pastille__couleur" style="background:${f.hex}"></span>${escapeHtml(f.nom)}
            <span class="aide" style="margin:0">${escapeHtml(f.ral)}${f.statut === A_VALIDER ? ' — a confirmer' : ''}</span>
          </label>`).join('')}
      </div>
      <p class="aide">Poteaux, lisses, capots, platines et décors : aluminium thermolaqué finition sablée.</p>
    </fieldset>`;
}

/* ---------------------------------------------------------------- Etape 2 */
function etapeTrace() {
  const ouvrant = getOuvrant(etat.ouvrant);
  const segments = etat.segments.map((s, i) => `
    <div class="segment">
      <div class="segment__champ">
        <label class="segment__label" for="seg-${i}">Segment ${i + 1} (mm)</label>
        <input id="seg-${i}" type="number" min="0" step="10" data-segment="${i}" value="${Number(s.longueur) || 0}">
      </div>
      <button type="button" class="bouton bouton--fantome bouton--petit" data-action="supprimer-segment" data-index="${i}"
        ${etat.segments.length === 1 ? 'disabled' : ''}>Supprimer</button>
    </div>`).join('');

  const total = etat.segments.reduce((t, s) => t + (Number(s.longueur) || 0), 0);

  return `
    <h2>2. Le trace de votre clôture</h2>
    <p class="etape__intro">Saisissez chaque ligne droite. Chaque changement de direction crée un angle
      a 90 degrés, ou le poteau grand vent 3 en 1 doit impérativement être haubané.</p>

    <fieldset>
      <legend>Segments</legend>
      ${segments}
      <button type="button" class="bouton bouton--fantome bouton--petit" data-action="ajouter-segment">+ Ajouter un segment</button>
      <p class="aide">Longueur totale du trace : <strong>${metres(total)}</strong> — ${etat.segments.length - 1} angle(s).</p>
    </fieldset>

    <fieldset>
      <legend>Portillon</legend>
      <div class="grille">
        <div>
          <label for="ouvrant">Modele</label>
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
      ${ouvrant.type ? `
        <h3>Type de pose du portillon</h3>
        <div class="choix-liste">
          ${ouvrant.poses.map((p) => choix('poseOuvrant', p.id, p.nom,
            `Emprise de ${p.emprise} mm sur le trace, ${p.poteauxDedies ? `${p.poteauxDedies} poteaux ${ouvrant.poteau.section}` : 'aucun poteau Silvadec'}`,
            etat.poseOuvrant === p.id)).join('')}
        </div>
        <p class="aide">Vantail ${ouvrant.vantail.largeur} x ${ouvrant.vantail.hauteur} x ${ouvrant.vantail.épaisseur} mm,
          largeur entre poteaux ${ouvrant.largeurEntrePoteaux} mm, passage utile ${ouvrant.passageUtile} mm.
          ${escapeHtml(ouvrant.normeAccessibilite)}. Coloris : ${ouvrant.coloris.map((c) => escapeHtml(c.nom)).join(', ')}.</p>` : ''}
    </fieldset>`;
}

/* ---------------------------------------------------------------- Etape 3 */
function etapeHauteur() {
  const gamme = getGamme(etat.gamme);
  const calc = calepiner(etat);
  const simulation = [];
  for (let n = Math.max(1, etat.nbLames - 3); n <= etat.nbLames + 3; n++) {
    simulation.push({ n, h: hauteurEmpilement({ ...etat, nbLames: n }).hauteur });
  }
  const soubassementDispo = gamme.lisseBasse.obligatoire;
  const ref = calc.hauteurs.referenceConstructeur;

  return `
    <h2>3. Hauteur et type de pose</h2>
    <p class="etape__intro">La hauteur se construit lame par lame : ajustez le nombre de lames, la hauteur
      de clôture et la longueur de poteau se recalculent automatiquement.</p>

    <fieldset>
      <legend>Nombre de lames</legend>
      <input type="range" name="nbLames" min="1" max="20" step="1" value="${etat.nbLames}">
      <div class="grille">
        <div>
          <label for="nbLamesNum">Lames</label>
          <input id="nbLamesNum" type="number" name="nbLames" min="1" max="20" step="1" value="${etat.nbLames}">
        </div>
        <div>
          <label for="hauteurCible">Hauteur visée (mm)</label>
          <input id="hauteurCible" type="number" name="hauteurCible" min="200" max="2200" step="10"
            value="${calc.hauteurs.empilement}">
          <p class="aide">Le nombre de lames le plus proche est appliqué.</p>
        </div>
      </div>
      <p class="aide">Hauteur obtenue : <strong>${mm(calc.hauteurs.empilement)}</strong>
        ${ref ? ` — table constructeur ${escapeHtml(gamme.notice)} : ${mm(ref.hauteurCloture)} pour ${ref.nbLames} lames
        (poteau mini ${mm(ref.poteauPlatine)} sur platines).` : ''}
        ${gamme.hauteurMaxCloture ? ` Hauteur maximale annoncée par la fiche produit : ${mm(gamme.hauteurMaxCloture)}.` : ''}</p>
      <div class="tableau-conteneur">
        <table>
          <thead><tr><th>Lames</th>${simulation.map((s) => `<th class="nombre">${s.n}</th>`).join('')}</tr></thead>
          <tbody><tr><td>Hauteur</td>${simulation.map((s) => `<td class="nombre">${nf.format(s.h)}</td>`).join('')}</tr></tbody>
        </table>
      </div>
    </fieldset>

    ${soubassementDispo ? `
    <fieldset>
      <legend>Bas de panneau</legend>
      <div class="choix-liste">
        ${choix('soubassement', 'lisse_basse', 'Lisse basse', 'Lisse posée au sol sous la première lame', etat.soubassement === 'lisse_basse')}
        ${choix('soubassement', 'plaque_soubassement', 'Plaque de soubassement', 'Simplifie la pose sur terrain pentu et crée une surface plane', etat.soubassement === 'plaque_soubassement')}
      </div>
    </fieldset>` : ''}

    <fieldset>
      <legend>Type de pose</legend>
      <div class="choix-liste">
        ${Object.values(POSES).map((p) => choix('pose', p.id, p.nom, p.aide, etat.pose === p.id)).join('')}
      </div>
      ${etat.pose === 'muret' ? `
        <div style="margin-top:12px;max-width:260px">
          <label for="hauteurMuret">Hauteur du muret (mm)</label>
          <input id="hauteurMuret" type="number" name="hauteurMuret" min="0" max="1500" step="10" value="${etat.hauteurMuret}">
        </div>` : ''}
      <p class="aide">Poteau à recouper : <strong>${mm(calc.hauteurs.longueurPoteau)}</strong>
        (fourni en ${mm(gamme.poteau.longueurFournie)}, chute de ${mm(calc.hauteurs.decoupeParPoteau)} par poteau).</p>
    </fieldset>
    ${messages(calc.alertes)}`;
}

/* ---------------------------------------------------------------- Etape 4 */
function etapeOptions() {
  const gamme = getGamme(etat.gamme);
  const calc = calepiner(etat);
  return `
    <h2>4. Décors et accessoires</h2>
    <p class="etape__intro">Un décor horizontal de 300 mm remplace 2 lames empilées ; un décor vertical
      occupe un panneau dédié de 855 mm entre deux poteaux.</p>

    <fieldset>
      <legend>Décors</legend>
      <div class="grille">
        <div>
          <label for="decorsHorizontaux">Panneaux avec décor horizontal</label>
          <input id="decorsHorizontaux" type="number" name="decorsHorizontaux" min="0" max="${calc.longueurs.nbPanneauxLames}" step="1" value="${etat.decorsHorizontaux}">
          <p class="aide">Maximum ${calc.longueurs.nbPanneauxLames} (nombre de panneaux en lames).
            ${gamme.decorHorizontal.lamesEncadrementSupp ? "Sur la lame persienne, le décor s’insère entre 2 lames début/fin : il en faut 4 au lieu de 2." : "Le décor doit rester encadré par une lame de part et d’autre."}</p>
          <p class="aide">${DECORS.horizontaux.map((d) => escapeHtml(d.nom)).join(', ')}.</p>
        </div>
        <div>
          <label for="decorsVerticaux">Panneaux de décor vertical (855 mm)</label>
          <input id="decorsVerticaux" type="number" name="decorsVerticaux" min="0" max="10" step="1" value="${etat.decorsVerticaux}">
          <p class="aide">Panneau ${escapeHtml(gamme.decorVertical.panneau)}, ni lisse ni connecteur.</p>
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
        <p class="aide">Chaque départ mural utilise un demi-poteau et un demi-capot au lieu d’un poteau entier.</p>
      </div>
    </fieldset>
    ${messages(calc.alertes)}`;
}

/* ---------------------------------------------------------------- Etape 5 */
function etapeDevis() {
  const calc = calepiner(etat);
  const nomenclature = construireNomenclature(calc, TARIF_ACTIF);
  const q = calc.quantites;

  const lignes = nomenclature.lignes.map((l) => `
    <tr>
      <td>${escapeHtml(l.désignation)}${l.detail ? `<span class="detail-ligne">${escapeHtml(l.detail)}</span>` : ''}</td>
      <td class="nombre">${nf.format(l.quantite)} ${escapeHtml(l.unite)}</td>
      <td class="nombre">${euro(l.prixUnitaire)}</td>
      <td class="nombre">${euro(l.total)}</td>
    </tr>`).join('');

  return `
    <h2>5. Récapitulatif et nomenclature</h2>
    <p class="etape__intro">${escapeHtml(calc.gamme.produit)} — ${nf.format(calc.longueurs.nbPanneauxTotal)} panneaux,
      ${mm(calc.hauteurs.empilement)} de hauteur, pose ${escapeHtml(POSES[etat.pose].nom.toLowerCase())}.</p>

    <div class="tableau-conteneur">
      <table>
        <thead><tr><th>Désignation</th><th class="nombre">Qté</th><th class="nombre">PU HT</th><th class="nombre">Total HT</th></tr></thead>
        <tbody>${lignes}</tbody>
        ${nomenclature.total !== null ? `<tfoot><tr><td colspan="3">Total HT estimé</td><td class="nombre">${euro(nomenclature.total)}</td></tr></tfoot>` : ''}
      </table>
    </div>

    <h3>Points de vigilance chantier</h3>
    <div class="rappel">
      <p style="margin:0 0 6px"><strong>Calepinage :</strong> ${nf.format(calc.longueurs.panneauxPleins)} panneaux à l’entraxe
      ${mm(calc.longueurs.entraxe)}${calc.longueurs.panneauRecoupe ? ` + 1 panneau recoupé de ${mm(calc.longueurs.panneauRecoupe.largeur)}` : ''}.</p>
      <p style="margin:0 0 6px"><strong>Poteaux :</strong> ${nf.format(q.nbPoteauxCloture)} poteaux de clôture dont
      ${nf.format(q.nbPoteauxAngle)} en angle${q.nbPoteauxOuvrant ? ` et ${nf.format(q.nbPoteauxOuvrant)} poteaux de portillon` : ''},
      à recouper à ${mm(calc.hauteurs.longueurPoteau)}.</p>
      <p style="margin:0"><strong>Jeu de dilatation :</strong> ${mm(calc.gamme.jeuDilatationLongueur)} en longueur de lame et
      ${mm(calc.hauteurs.jeuHautPoteau)} minimum entre le capot et la lisse haute (${escapeHtml(calc.gamme.notice)}).</p>
    </div>

    ${messages(calc.alertes)}

    ${TARIF_ACTIF && !TARIF_ACTIF.reel ? `
      <div class="message message--avertissement" style="margin-top:16px">
        Les prix affichés proviennent d’une grille de <strong>démonstration</strong>
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

/* -------------------------------------------------------------- Synthese */
function rendreSynthese() {
  const calc = calepiner(etat);
  const nomenclature = construireNomenclature(calc, TARIF_ACTIF);
  const gamme = calc.gamme;
  const coloris = gamme.coloris.find((c) => c.id === etat.coloris) || gamme.coloris[0];
  const q = calc.quantites;
  const erreurs = calc.alertes.filter((a) => a.niveau === 'erreur').length;

  conteneurSynthese.innerHTML = `
    <p class="synthese__titre">Votre projet</p>
    <div id="apercu-élévation"></div>
    <div id="apercu-plan"></div>
    <ul class="chiffres">
      <li><span>Lame</span><span>${escapeHtml(gamme.produit)}</span></li>
      <li><span>Coloris</span><span>${escapeHtml(coloris ? coloris.nom : 'à définir')}</span></li>
      <li><span>Hauteur de clôture</span><span>${mm(calc.hauteurs.empilement)}</span></li>
      <li><span>Longueur en lames</span><span>${metres(calc.longueurs.longueurCloture)}</span></li>
      <li><span>Panneaux</span><span>${nf.format(calc.longueurs.nbPanneauxTotal)}</span></li>
      <li><span>Poteaux</span><span>${nf.format(q.nbPoteaux)} (dont ${nf.format(q.nbPoteauxAngle)} angle)</span></li>
      <li><span>Lames</span><span>${nf.format(q.nbLamesTotal)}</span></li>
      <li><span>Longueur de poteau</span><span>${mm(calc.hauteurs.longueurPoteau)}</span></li>
    </ul>
    ${nomenclature.total !== null ? `
      <div class="total">
        <div class="total__montant">${euro(nomenclature.total)} HT</div>
        <p class="total__mention">Estimation fournitures, hors pose et livraison${TARIF_ACTIF.reel ? '' : ' — tarif de démonstration'}.</p>
      </div>` : ''}
    ${erreurs ? `<p class="message message--erreur" style="margin-top:14px">${erreurs} point(s) bloquant(s) à corriger.</p>` : ''}`;

  $('#apercu-élévation').append(apercuElevation(calc, coloris ? coloris.hex : '#4a4e51'));
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
  // On met a jour les attributs sans recreer les boutons : un noeud detache
  // pendant un clic ne declencherait pas l’evenement.
  [...conteneurEtapes.children].forEach((bouton, i) => {
    if (i === etapeCourante) bouton.setAttribute('aria-current', 'step');
    else bouton.removeAttribute('aria-current');
  });
}

/** Memorise le champ actif pour le restaurer après un rendu complet. */
function repereFocus() {
  const actif = document.activeElement;
  if (!actif || !conteneurEtape.contains(actif)) return null;
  let début = null;
  let fin = null;
  try { début = actif.selectionStart; fin = actif.selectionEnd; } catch { /* champ sans selection */ }
  return { id: actif.id, name: actif.name, type: actif.type, segment: actif.dataset.segment, début, fin };
}

function restaureFocus(repere) {
  if (!repere) return;
  let champ = null;
  if (repere.id) champ = conteneurEtape.querySelector(`#${CSS.escape(repere.id)}`);
  if (!champ && repere.segment !== undefined) champ = conteneurEtape.querySelector(`[data-segment="${repere.segment}"]`);
  if (!champ && repere.name) {
    champ = [...conteneurEtape.querySelectorAll(`[name="${CSS.escape(repere.name)}"]`)]
      .find((c) => c.type === repere.type) || null;
  }
  if (!champ) return;
  champ.focus();
  if (repere.début !== null) {
    try { champ.setSelectionRange(repere.début, repere.fin); } catch { /* type sans selection */ }
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

/* -------------------------------------------------------------- Ecouteurs */
const CHAMPS_NOMBRE = new Set([
  'nbLames', 'nbOuvrants', 'hauteurMuret', 'decorsHorizontaux', 'decorsVerticaux',
  'poteauxMuraux', 'entretoisesEmpilees',
]);

function majDepuisChamp(cible) {
  const nom = cible.name;
  if (cible.dataset.segment !== undefined) {
    etat.segments[Number(cible.dataset.segment)] = { longueur: Number(cible.value) || 0 };
    return true;
  }
  if (!nom) return false;
  if (nom === 'hauteurCible') {
    etat.nbLames = nbLamesPourHauteur(etat, Number(cible.value) || 0).nbLames;
    return true;
  }
  if (CHAMPS_NOMBRE.has(nom)) etat[nom] = Math.max(0, Number(cible.value) || 0);
  else if (cible.type === 'checkbox') etat[nom] = cible.checked;
  else etat[nom] = cible.value;

  if (nom === 'ouvrant') etat.nbOuvrants = cible.value === 'aucun' ? 0 : Math.max(1, etat.nbOuvrants);
  if (nom === 'gamme') {
    const g = getGamme(etat.gamme);
    etat.soubassement = g.lisseBasse.obligatoire ? 'lisse_basse' : 'aucun';
    if (g.id !== 'aluminium') etat.variante = 'plein';
    etat.finitionLame = g.finitionsLame[0] || null;
    etat.coloris = g.coloris.length ? g.coloris[0].id : null;
  }
  return true;
}

// Les champs numeriques sont traites sur `input` : leur evenement `change`
// (declenche par la perte de focus) redessinerait l’etape au moment même du
// clic suivant, et le bouton vise serait detache avant de recevoir l’evenement.
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
    case 'ajouter-segment':
      etat.segments = [...etat.segments, { longueur: 3600 }];
      rendre();
      break;
    case 'supprimer-segment':
      etat.segments = etat.segments.filter((_, i) => i !== Number(bouton.dataset.index));
      if (!etat.segments.length) etat.segments = [{ longueur: 0 }];
      rendre();
      break;
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
