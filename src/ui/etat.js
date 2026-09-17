/**
 * Etat du configurateur : valeurs par defaut, persistance dans l’URL
 * (lien de partage) et dans le stockage local.
 */

import { CONFIG_DEFAUT } from '../core/calepinage.js';
import { GAMMES, HAUTEURS_CLOTURE } from '../data/catalogue.js';

const CLE_STOCKAGE = 'configurateur-cloture:v3';

function encode(config) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/=+$/, '');
}

function decode(chaine) {
  return JSON.parse(decodeURIComponent(escape(atob(chaine))));
}

/**
 * Un lien ou un stockage antérieur peut porter une gamme qui n'existe plus ou
 * une structure plus ancienne : on repart alors de la configuration par défaut
 * plutôt que de planter.
 */
function assainir(config) {
  const propre = { ...CONFIG_DEFAUT, ...config };

  const habillages = (propre.habillages || []).filter((h) => h && GAMMES[h.gamme]);
  propre.habillages = habillages.length ? habillages : CONFIG_DEFAUT.habillages.map((h) => ({ ...h }));

  const coloris = { ...CONFIG_DEFAUT.coloris, ...(propre.coloris || {}) };
  for (const [id, gamme] of Object.entries(GAMMES)) {
    if (gamme.coloris.length && !gamme.coloris.some((c) => c.id === coloris[id])) {
      coloris[id] = gamme.coloris[0].id;
    }
  }
  propre.coloris = coloris;

  if (!Array.isArray(propre.segments) || !propre.segments.length) {
    propre.segments = CONFIG_DEFAUT.segments.map((s) => ({ ...s }));
  }
  if (!HAUTEURS_CLOTURE.some((h) => h.valeur === propre.hauteurCible)) {
    propre.hauteurCible = CONFIG_DEFAUT.hauteurCible;
  }
  return propre;
}

export function chargerEtat() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const c = hash.get('c');
  if (c) {
    try { return assainir(decode(c)); } catch { /* lien invalide : on ignore */ }
  }
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) return assainir(JSON.parse(brut));
  } catch { /* stockage indisponible */ }
  return { ...CONFIG_DEFAUT };
}

export function sauverEtat(config) {
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(config)); } catch { /* ignore */ }
}

export function lienPartage(config) {
  const url = new URL(location.href);
  url.hash = `c=${encode(config)}`;
  return url.toString();
}
