/**
 * Etat du configurateur : valeurs par defaut, persistance dans l’URL
 * (lien de partage) et dans le stockage local.
 */

import { CONFIG_DEFAUT } from '../core/calepinage.js';
import { GAMMES } from '../data/catalogue.js';

const CLE_STOCKAGE = 'configurateur-cloture:v2';

function encode(config) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/=+$/, '');
}

function decode(chaine) {
  return JSON.parse(decodeURIComponent(escape(atob(chaine))));
}

/**
 * Un lien ou un stockage anterieur peut porter une gamme qui n’existe plus :
 * on repart alors de la configuration par defaut plutot que de planter.
 */
function assainir(config) {
  const propre = { ...CONFIG_DEFAUT, ...config };
  if (!GAMMES[propre.gamme]) return { ...CONFIG_DEFAUT };
  const gamme = GAMMES[propre.gamme];
  if (gamme.coloris.length && !gamme.coloris.some((c) => c.id === propre.coloris)) {
    propre.coloris = gamme.coloris[0].id;
  }
  if (!Array.isArray(propre.segments) || !propre.segments.length) {
    propre.segments = CONFIG_DEFAUT.segments;
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
