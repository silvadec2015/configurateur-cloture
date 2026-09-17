/**
 * Configurateur cloture & portillon - couche interface.
 *
 * L'etat est un simple objet de configuration ; a chaque modification on
 * relance le moteur de calepinage puis on redessine l'etape courante et la
 * synthese. Aucune dependance externe.
 */

import { GAMMES, POSES, COLORIS, DECORS, OUVRANTS, getGamme } from '../data/catalogue.js';
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
  { id: 'gamme', titre: 'Gamme', rendu: etapeGamme },
  { id: 'trace', titre: 'Trace', rendu: etapeTrace },
  { id: 'hauteur', titre: 'Hauteur & pose', rendu: etapeHauteur },
  { id: 'options', titre: 'Options', rendu: etapeOptions },
  { id: 'devis', titre: 'Recapitulatif', rendu: etapeDevis },
];

/* ---------------------------------------------------------------- Etape 1 */
function etapeGamme() {
  const cartes = Object.values(GAMMES).map((g) => choix('gamme', g.id, g.nom, `${g.materiau} — notice ${g.notice}`, etat.gamme === g.id)).join('');
  const varianteVisible = etat.gamme === 'pu36';
  const coloris = COLORIS.filter((c) => c.gammes.includes(etat.gamme));
  if (!coloris.some((c) => c.id === etat.coloris)) etat.coloris = coloris[0].id;

  return `
    <h2>1. Votre gamme de claustra</h2>
    <p class="etape__intro">${escapeHtml(getGamme(etat.gamme).description)}</p>
    <fieldset>
      <legend>Type de lames</legend>
      <div class="choix-liste">${cartes}</div>
    </fieldset>
    ${varianteVisible ? `
    <fieldset>
      <legend>Montage des lames aluminium</legend>
      <div class="choix-liste">
        ${choix('variante', 'plein', 'Occultation totale', 'Lames empilees directement, sans entretoise (PU36 p.5)', etat.variante === 'plein')}
        ${choix('variante', 'ajoure', 'Panneau ajoure', 'Lames separees par des entretoises de 15 mm (PU36 p.2)', etat.variante === 'ajoure')}
      </div>
    </fieldset>` : ''}
    <fieldset>
      <legend>Coloris</legend>
      <div class="pastilles">
        ${coloris.map((c) => `
          <label class="pastille ${etat.coloris === c.id ? 'pastille--actif' : ''}">
            <input type="radio" name="coloris" value="${c.id}" ${etat.coloris === c.id ? 'checked' : ''}>
            <span class="pastille__couleur" style="background:${c.hex}"></span>${escapeHtml(c.nom)}
          </label>`).join('')}
      </div>
      <p class="aide">Nuancier de demonstration : a caler sur votre gamme commerciale.</p>
    </fieldset>`;
}

/* ---------------------------------------------------------------- Etape 2 */
function etapeTrace() {
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
    <h2>2. Le trace de votre cloture</h2>
    <p class="etape__intro">Saisissez chaque ligne droite. Chaque changement de direction cree un angle
      a 90 degres equipe d'un poteau 3 en 1 (haubanage imperatif).</p>
    <fieldset>
      <legend>Segments</legend>
      ${segments}
      <button type="button" class="bouton bouton--fantome bouton--petit" data-action="ajouter-segment">+ Ajouter un segment</button>
      <p class="aide">Longueur totale du trace : <strong>${metres(total)}</strong> — ${etat.segments.length - 1} angle(s).</p>
    </fieldset>
    <fieldset>
      <legend>Portillon / portail</legend>
      <div class="grille">
        <div>
          <label for="ouvrant">Modele</label>
          <select id="ouvrant" name="ouvrant">
            ${OUVRANTS.map((o) => `<option value="${o.id}" ${etat.ouvrant === o.id ? 'selected' : ''}>${escapeHtml(o.nom)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="nbOuvrants">Quantite</label>
          <input id="nbOuvrants" type="number" name="nbOuvrants" min="0" max="10" step="1" value="${etat.nbOuvrants}"
            ${etat.ouvrant === 'aucun' ? 'disabled' : ''}>
        </div>
      </div>
      <p class="aide">La largeur de passage est deduite de la longueur a habiller en lames.
        Les portillons ne figurent pas dans les notices PU11/PU36/PU41 : cotes a confirmer au catalogue.</p>
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

  return `
    <h2>3. Hauteur et type de pose</h2>
    <p class="etape__intro">La hauteur se construit lame par lame : ajustez le nombre de lames, la hauteur
      de claustra et la longueur de poteau se recalculent automatiquement.</p>
    <fieldset>
      <legend>Nombre de lames</legend>
      <input type="range" name="nbLames" min="1" max="20" step="1" value="${etat.nbLames}">
      <div class="grille">
        <div>
          <label for="nbLamesNum">Lames</label>
          <input id="nbLamesNum" type="number" name="nbLames" min="1" max="20" step="1" value="${etat.nbLames}">
        </div>
        <div>
          <label for="hauteurCible">Hauteur visee (mm)</label>
          <input id="hauteurCible" type="number" name="hauteurCible" min="200" max="2200" step="10"
            value="${calc.hauteurs.empilement}">
          <p class="aide">Le nombre de lames le plus proche est applique.</p>
        </div>
      </div>
      <p class="aide">Hauteur obtenue : <strong>${mm(calc.hauteurs.empilement)}</strong>
        ${calc.hauteurs.referenceConstructeur ? ` — table constructeur ${gamme.notice} : ${mm(calc.hauteurs.referenceConstructeur.hauteurClaustra)}
        pour ${calc.hauteurs.referenceConstructeur.nbLames} lames (poteau mini ${mm(calc.hauteurs.referenceConstructeur.poteauPlatine)} sur platines).` : ''}</p>
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
        ${choix('soubassement', 'lisse_basse', 'Lisse basse', 'Lisse posee au sol sous la premiere lame', etat.soubassement === 'lisse_basse')}
        ${choix('soubassement', 'plaque_soubassement', 'Plaque de soubassement', 'Aluminium, obligatoire si la premiere lame est partiellement enterree', etat.soubassement === 'plaque_soubassement')}
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
      <p class="aide">Poteau a recouper : <strong>${mm(calc.hauteurs.longueurPoteau)}</strong>
        (fourni en ${mm(gamme.poteau.longueurFournie)}, chute de ${mm(calc.hauteurs.decoupeParPoteau)} par poteau).</p>
    </fieldset>
    ${messages(calc.alertes)}`;
}

/* ---------------------------------------------------------------- Etape 4 */
function etapeOptions() {
  const gamme = getGamme(etat.gamme);
  const calc = calepiner(etat);
  return `
    <h2>4. Decors et finitions</h2>
    <p class="etape__intro">Les decors Mineral, Vegetal et Urbain s'emboitent sur les lames. Un decor
      horizontal remplace 2 lames empilees, un decor vertical occupe une travee dediee de 855 mm.</p>
    <fieldset>
      <legend>Decors</legend>
      <div class="grille">
        <div>
          <label for="decorsHorizontaux">Travees avec decor horizontal</label>
          <input id="decorsHorizontaux" type="number" name="decorsHorizontaux" min="0" max="${calc.longueurs.nbTraveesClaustra}" step="1" value="${etat.decorsHorizontaux}">
          <p class="aide">Maximum ${calc.longueurs.nbTraveesClaustra} (nombre de travees de claustra).
            ${gamme.decorHorizontal.lamesEncadrementSupp ? 'Sur la gamme persienne, le decor impose 4 lames debut/fin au lieu de 2.' : 'Le decor doit rester encadre par une lame de part et d autre.'}</p>
        </div>
        <div>
          <label for="decorsVerticaux">Travees de decor vertical (855 mm)</label>
          <input id="decorsVerticaux" type="number" name="decorsVerticaux" min="0" max="10" step="1" value="${etat.decorsVerticaux}">
          <p class="aide">Panneau ${escapeHtml(gamme.decorVertical.panneau)}. Ni lisse ni connecteur necessaire.</p>
        </div>
      </div>
      <p class="aide">Decors disponibles : ${DECORS.map((d) => escapeHtml(d.nom)).join(', ')}.</p>
    </fieldset>
    <fieldset>
      <legend>Finitions</legend>
      <label class="interrupteur">
        <input type="checkbox" name="baguetteFinition" ${etat.baguetteFinition ? 'checked' : ''}>
        Baguettes de finition sur les poteaux
      </label>
      <div style="margin-top:14px;max-width:260px">
        <label for="poteauxMuraux">Poteaux fixes contre un mur / muret</label>
        <input id="poteauxMuraux" type="number" name="poteauxMuraux" min="0" max="20" step="1" value="${etat.poteauxMuraux}">
        <p class="aide">Chaque fixation murale demande un capot mural.</p>
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
      <td>${escapeHtml(l.designation)}${l.detail ? `<span class="detail-ligne">${escapeHtml(l.detail)}</span>` : ''}</td>
      <td class="nombre">${nf.format(l.quantite)} ${escapeHtml(l.unite)}</td>
      <td class="nombre">${euro(l.prixUnitaire)}</td>
      <td class="nombre">${euro(l.total)}</td>
    </tr>`).join('');

  return `
    <h2>5. Recapitulatif et nomenclature</h2>
    <p class="etape__intro">${escapeHtml(calc.gamme.nom)} — ${nf.format(calc.longueurs.nbTraveesTotal)} travees,
      ${mm(calc.hauteurs.empilement)} de hauteur, pose ${escapeHtml(POSES[etat.pose].nom.toLowerCase())}.</p>

    <div class="tableau-conteneur">
      <table>
        <thead><tr><th>Designation</th><th class="nombre">Qte</th><th class="nombre">PU HT</th><th class="nombre">Total HT</th></tr></thead>
        <tbody>${lignes}</tbody>
        ${nomenclature.total !== null ? `<tfoot><tr><td colspan="3">Total HT estime</td><td class="nombre">${euro(nomenclature.total)}</td></tr></tfoot>` : ''}
      </table>
    </div>

    <h3>Points de vigilance chantier</h3>
    <div class="rappel">
      <p style="margin:0 0 6px"><strong>Calepinage :</strong> ${nf.format(calc.longueurs.traveesPleines)} travees a l'entraxe
      ${mm(calc.longueurs.entraxe)}${calc.longueurs.traveeRecoupee ? ` + 1 travee recoupee de ${mm(calc.longueurs.traveeRecoupee.largeur)}` : ''}.</p>
      <p style="margin:0 0 6px"><strong>Poteaux :</strong> ${nf.format(q.nbPoteaux)} au total dont ${nf.format(q.nbPoteauxAngle)} en angle,
      a recouper a ${mm(calc.hauteurs.longueurPoteau)}.</p>
      <p style="margin:0"><strong>Jeu de dilatation :</strong> ${mm(calc.gamme.jeuDilatationLongueur)} en longueur de lame et
      ${mm(calc.hauteurs.jeuHautPoteau)} minimum entre le capot et la lisse haute (${escapeHtml(calc.gamme.notice)}).</p>
    </div>

    ${messages(calc.alertes)}

    ${TARIF_ACTIF && !TARIF_ACTIF.reel ? `
      <div class="message message--avertissement" style="margin-top:16px">
        Les prix affiches proviennent d'une grille de <strong>demonstration</strong>
        (<code>src/data/tarifs.js</code>). Remplacez-la par votre tarif avant toute diffusion commerciale.
      </div>` : ''}

    <div class="actions">
      <button type="button" class="bouton bouton--primaire" data-action="imprimer">Imprimer / PDF</button>
      <button type="button" class="bouton bouton--fantome" data-action="csv">Telecharger le CSV</button>
      <button type="button" class="bouton bouton--fantome" data-action="json">Telecharger le JSON</button>
      <button type="button" class="bouton bouton--fantome" data-action="lien">Copier le lien du projet</button>
    </div>`;
}

/* ------------------------------------------------------------- Fragments */
function choix(nom, valeur, titre, detail, actif) {
  return `
    <label class="choix ${actif ? 'choix--actif' : ''}">
      <input type="radio" name="${nom}" value="${valeur}" ${actif ? 'checked' : ''}>
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
  const couleur = (COLORIS.find((c) => c.id === etat.coloris) || COLORIS[0]).hex;
  const q = calc.quantites;
  const erreurs = calc.alertes.filter((a) => a.niveau === 'erreur').length;

  conteneurSynthese.innerHTML = `
    <p class="synthese__titre">Votre projet</p>
    <div id="apercu-elevation"></div>
    <div id="apercu-plan"></div>
    <ul class="chiffres">
      <li><span>Gamme</span><span>${escapeHtml(calc.gamme.nom)}</span></li>
      <li><span>Hauteur de claustra</span><span>${mm(calc.hauteurs.empilement)}</span></li>
      <li><span>Longueur en lames</span><span>${metres(calc.longueurs.longueurClaustra)}</span></li>
      <li><span>Travees</span><span>${nf.format(calc.longueurs.nbTraveesTotal)}</span></li>
      <li><span>Poteaux</span><span>${nf.format(q.nbPoteaux)} (dont ${nf.format(q.nbPoteauxAngle)} angle)</span></li>
      <li><span>Lames</span><span>${nf.format(q.nbLamesTotal)}</span></li>
      <li><span>Longueur de poteau</span><span>${mm(calc.hauteurs.longueurPoteau)}</span></li>
    </ul>
    ${nomenclature.total !== null ? `
      <div class="total">
        <div class="total__montant">${euro(nomenclature.total)} HT</div>
        <p class="total__mention">Estimation fournitures, hors pose et livraison${TARIF_ACTIF.reel ? '' : ' — tarif de demonstration'}.</p>
      </div>` : ''}
    ${erreurs ? `<p class="message message--erreur" style="margin-top:14px">${erreurs} point(s) bloquant(s) a corriger.</p>` : ''}`;

  $('#apercu-elevation').append(apercuElevation(calc, couleur));
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
  // pendant un clic ne declencherait pas l'evenement.
  [...conteneurEtapes.children].forEach((bouton, i) => {
    if (i === etapeCourante) bouton.setAttribute('aria-current', 'step');
    else bouton.removeAttribute('aria-current');
  });
}

/** Memorise le champ actif pour le restaurer apres un rendu complet. */
function repereFocus() {
  const actif = document.activeElement;
  if (!actif || !conteneurEtape.contains(actif)) return null;
  let debut = null;
  let fin = null;
  try { debut = actif.selectionStart; fin = actif.selectionEnd; } catch { /* champ sans selection */ }
  return { id: actif.id, name: actif.name, type: actif.type, segment: actif.dataset.segment, debut, fin };
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
  if (repere.debut !== null) {
    try { champ.setSelectionRange(repere.debut, repere.fin); } catch { /* type sans selection */ }
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
const CHAMPS_NOMBRE = new Set(['nbLames', 'nbOuvrants', 'hauteurMuret', 'decorsHorizontaux', 'decorsVerticaux', 'poteauxMuraux']);

function majDepuisChamp(cible) {
  const nom = cible.name;
  if (cible.dataset.segment !== undefined) {
    etat.segments[Number(cible.dataset.segment)] = { longueur: Number(cible.value) || 0 };
    return true;
  }
  if (!nom) return false;
  if (nom === 'hauteurCible') {
    const cibleMm = Number(cible.value) || 0;
    etat.nbLames = nbLamesPourHauteur(etat, cibleMm).nbLames;
    return true;
  }
  if (CHAMPS_NOMBRE.has(nom)) etat[nom] = Math.max(0, Number(cible.value) || 0);
  else if (cible.type === 'checkbox') etat[nom] = cible.checked;
  else etat[nom] = cible.value;

  if (nom === 'ouvrant' && cible.value !== 'aucun' && etat.nbOuvrants === 0) etat.nbOuvrants = 1;
  if (nom === 'ouvrant' && cible.value === 'aucun') etat.nbOuvrants = 0;
  if (nom === 'gamme') {
    const g = getGamme(etat.gamme);
    etat.soubassement = g.lisseBasse.obligatoire ? 'lisse_basse' : 'aucun';
    if (g.id !== 'pu36') etat.variante = 'plein';
  }
  return true;
}

// Les champs numeriques sont traites sur `input` : leur evenement `change`
// (declenche par la perte de focus) redessinerait l'etape au moment meme du
// clic suivant, et le bouton vise serait detache avant de recevoir l'evenement.
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
        bouton.textContent = 'Lien copie !';
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
