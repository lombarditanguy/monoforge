// Recherche du RAL le plus proche d'une couleur libre.
//
// La comparaison se fait en CIEDE2000 sur l'espace Lab, pas en distance RGB.
// La différence est loin d'être théorique ici : le RGB traite les trois canaux
// à poids égal, ce qui écarte mal les gris entre eux — or les gris (anthracite,
// graphite, gunmetal, argent) sont l'essentiel des couleurs de jantes. Lab est
// perceptuellement uniforme, et CIEDE2000 corrige en plus les faiblesses
// connues sur les teintes peu saturées et les bleus.

import { RAL_COLORS } from "../data/ralColors.js";

export function hexToRgb(hex) {
  const clean = String(hex).trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

// sRGB -> XYZ (illuminant D65) -> Lab
export function rgbToLab({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);

  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;

  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const deg = (rad) => (rad * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

// CIEDE2000 (Sharma, Wu & Dalal — formulation de référence)
export function deltaE2000(lab1, lab2) {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.hypot(lab1.a, lab1.b);
  const C2 = Math.hypot(lab2.a, lab2.b);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * lab1.a;
  const a2p = (1 + G) * lab2.a;
  const C1p = Math.hypot(a1p, lab1.b);
  const C2p = Math.hypot(a2p, lab2.b);

  const h1p = C1p === 0 ? 0 : (deg(Math.atan2(lab1.b, a1p)) + 360) % 360;
  const h2p = C2p === 0 ? 0 : (deg(Math.atan2(lab2.b, a2p)) + 360) % 360;

  const dLp = lab2.L - lab1.L;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (lab1.L + lab2.L) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const RT = -RC * Math.sin(rad(2 * dTheta));

  const Lbarp50 = Math.pow(Lbarp - 50, 2);
  const SL = 1 + (0.015 * Lbarp50) / Math.sqrt(20 + Lbarp50);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const dL = dLp / (kL * SL);
  const dC = dCp / (kC * SC);
  const dH = dHp / (kH * SH);

  return Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
}

// Lab pré-calculé une seule fois pour les 213 teintes.
const RAL_LAB = RAL_COLORS.map((c) => ({ ...c, lab: rgbToLab(hexToRgb(c.hex)) }));

/**
 * Renvoie le RAL le plus proche d'une couleur hexadécimale, avec l'écart
 * mesuré. Repère utile sur l'écart : en dessous de ~2 la différence est
 * imperceptible, autour de 5 elle se voit côte à côte, au-delà de 10 ce sont
 * deux teintes distinctes.
 */
export function nearestRal(hex, count = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const lab = rgbToLab(rgb);

  const scored = RAL_LAB.map((c) => ({
    ral: c.ral,
    nom: c.nom,
    hex: c.hex,
    ecart: deltaE2000(lab, c.lab),
  })).sort((a, b) => a.ecart - b.ecart);

  return count === 1 ? scored[0] : scored.slice(0, count);
}
