/**
 * Apercu SVG : vue en elevation d'une travee type (poteaux, empilement des
 * lames, lisses) et vue en plan du trace.
 */

const NS = 'http://www.w3.org/2000/svg';

function el(nom, attrs = {}) {
  const noeud = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs)) noeud.setAttribute(k, String(v));
  return noeud;
}

/**
 * Vue en elevation d'une travee.
 * @param {object} calepinage resultat de `calepiner()`
 * @param {string} couleur couleur des lames
 */
export function apercuElevation(calepinage, couleur = '#3b3f44') {
  const { config, gamme, hauteurs } = calepinage;
  const entraxe = calepinage.longueurs.entraxe;
  const hauteurPoteau = Math.max(hauteurs.hauteurHorsSol, 1);
  const hauteurMuret = config.pose === 'muret' ? config.hauteurMuret : 0;

  const largeurMm = entraxe + 900;
  const hauteurMm = hauteurPoteau + hauteurMuret + 300;
  const svg = el('svg', {
    class: 'apercu',
    viewBox: `0 0 ${largeurMm} ${hauteurMm}`,
    role: 'img',
    'aria-label': `Elevation d'une travee : ${config.nbLames} lames, ${hauteurs.empilement} mm de hauteur`,
  });

  const sol = hauteurMm - 120;
  const basPanneau = sol - hauteurMuret;
  const x0 = 520;

  // Sol et muret.
  svg.append(el('line', { x1: 0, y1: sol, x2: largeurMm, y2: sol, stroke: 'currentColor', 'stroke-width': 6, opacity: .35 }));
  if (hauteurMuret > 0) {
    svg.append(el('rect', {
      x: 60, y: basPanneau, width: largeurMm - 120, height: hauteurMuret,
      fill: 'currentColor', opacity: .12, rx: 6,
    }));
  }

  // Empilement : on rejoue le detail calcule par le moteur, du bas vers le haut.
  let y = basPanneau;
  for (const poste of hauteurs.detailEmpilement) {
    const estLame = /lame/i.test(poste.poste);
    const estEntretoise = /entretoise/i.test(poste.poste);
    for (let i = 0; i < poste.quantite; i++) {
      const h = poste.hauteur;
      y -= h;
      svg.append(el('rect', {
        x: x0 + 20, y, width: entraxe - 40, height: Math.max(h - 2, 1), rx: estLame ? 3 : 1,
        fill: estLame ? couleur : 'currentColor',
        opacity: estLame ? 1 : estEntretoise ? .3 : .55,
      }));
    }
  }

  // Poteaux (+ capot) et platines.
  const hautPoteau = basPanneau - hauteurPoteau;
  for (const x of [x0, x0 + entraxe - 60]) {
    svg.append(el('rect', { x, y: hautPoteau, width: 60, height: hauteurPoteau, rx: 5, fill: 'currentColor', opacity: .78 }));
    svg.append(el('rect', { x: x - 4, y: hautPoteau - 18, width: 68, height: 18, rx: 4, fill: 'currentColor' }));
    if (config.pose !== 'scellement') {
      svg.append(el('rect', { x: x - 26, y: basPanneau - 23, width: 112, height: 23, rx: 3, fill: 'currentColor', opacity: .5 }));
    } else {
      svg.append(el('rect', { x: x - 10, y: sol, width: 80, height: 110, rx: 4, fill: 'currentColor', opacity: .18 }));
    }
  }

  // Cotes.
  const cote = (x, y1, y2, texte) => {
    svg.append(el('line', { x1: x, y1, x2: x, y2, stroke: 'currentColor', 'stroke-width': 4, opacity: .6 }));
    const t = el('text', { x: x - 24, y: (y1 + y2) / 2, 'font-size': 76, fill: 'currentColor', 'text-anchor': 'end' });
    t.textContent = texte;
    svg.append(t);
  };
  cote(x0 - 70, basPanneau, basPanneau - calepinage.hauteurs.empilement, `${calepinage.hauteurs.empilement} mm`);

  const legende = el('text', { x: x0 + entraxe / 2, y: sol + 95, 'font-size': 78, fill: 'currentColor', 'text-anchor': 'middle', opacity: .75 });
  legende.textContent = `entraxe ${entraxe} mm - ${gamme.notice}`;
  svg.append(legende);

  return svg;
}

/** Vue en plan du trace (segments et angles). */
export function apercuPlan(calepinage) {
  const segments = calepinage.config.segments.filter((s) => Number(s.longueur) > 0);
  const svg = el('svg', { class: 'apercu', viewBox: '0 0 400 220', role: 'img', 'aria-label': 'Vue en plan du trace' });
  if (!segments.length) return svg;

  // Trace en zigzag a 90 degres, direction alternee (droite puis bas).
  const total = segments.reduce((t, s) => t + Number(s.longueur), 0);
  let x = 40;
  let y = 60;
  let horizontal = true;
  const points = [[x, y]];
  for (const s of segments) {
    const l = (Number(s.longueur) / total) * 280;
    if (horizontal) x += l; else y += l;
    points.push([x, y]);
    horizontal = !horizontal;
  }

  const chemin = el('polyline', {
    points: points.map((p) => p.join(',')).join(' '),
    fill: 'none', stroke: 'currentColor', 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    opacity: .8,
  });
  svg.append(chemin);

  points.forEach(([px, py], i) => {
    svg.append(el('circle', { cx: px, cy: py, r: 6, fill: 'currentColor' }));
    const t = el('text', { x: px + 10, y: py - 10, 'font-size': 11, fill: 'currentColor', opacity: .7 });
    if (i < segments.length) t.textContent = `${Number(segments[i].longueur) / 1000} m`;
    svg.append(t);
  });
  return svg;
}
