/**
 * Etat du configurateur : valeurs par defaut, persistance dans l'URL
 * (lien de partage) et dans le stockage local.
 */

import { CONFIG_DEFAUT } from '../core/calepinage.js';

const CLE_STOCKAGE = 'configurateur-cloture:v1';

function encode(config) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/=+$/, '');
}

function decode(chaine) {
  return JSON.parse(decodeURIComponent(escape(atob(chaine))));
}

export function chargerEtat() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const c = hash.get('c');
  if (c) {
    try { return { ...CONFIG_DEFAUT, ...decode(c) }; } catch { /* lien invalide : on ignore */ }
  }
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) return { ...CONFIG_DEFAUT, ...JSON.parse(brut) };
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
