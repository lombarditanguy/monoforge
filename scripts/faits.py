# -*- coding: utf-8 -*-
"""Extraction des faits propres à chaque jante.

Les 457 fiches produit ne se distinguaient que par un code et une photo : même
titre, même description, même corps de texte. C'est le motif que les moteurs
traitent comme du contenu mince, et une IA n'a rien à y citer.

De la matière propre à chaque référence existe pourtant, à deux endroits :

  * le nom de l'annonce du fournisseur, qui énumère les diamètres, les entraxes
    et les véhicules visés. On n'en reprend jamais le texte — il est en anglais,
    il porte la marque du fournisseur, et il est écrit pour une place de marché.
    On n'en tire que des faits ;
  * la photo elle-même, dont on peut compter les bâtons. Le motif d'une jante
    est périodique autour de son axe : en relevant la luminance le long d'un
    cercle centré sur le moyeu, on obtient un signal dont la fréquence dominante
    est le nombre de bâtons. Vérifié à la main sur plusieurs références.

Le comptage n'est publié que lorsque plusieurs rayons de mesure tombent
d'accord. Une donnée fausse sur une fiche produit coûte plus cher que pas de
donnée du tout.
"""
import json
import re
from collections import Counter

import numpy as np
from PIL import Image

DIAMETRES = re.compile(r"\b(1[5-9]|2[0-6])\b")
ENTRAXES = re.compile(r"\b(\d)\s*[xX]\s*(\d{3}(?:\.\d)?|\d{2}(?:\.\d)?)\b")
MARQUES = {
    "bmw": "BMW", "audi": "Audi", "porsche": "Porsche", "tesla": "Tesla",
    "benz": "Mercedes-Benz", "mercedes": "Mercedes-Benz", "amg": "Mercedes-AMG",
    "toyota": "Toyota", "ford": "Ford", "range rover": "Range Rover",
    "land rover": "Land Rover", "golf": "Volkswagen Golf", "honda": "Honda",
    "lexus": "Lexus", "nissan": "Nissan", "subaru": "Subaru",
}
TRAITS = [
    ("deep concave", "profil très concave"),
    ("concave", "profil concave"),
    ("brushed", "finition brossée"),
    ("polished", "finition polie"),
    ("matte", "finition mate"),
    ("gloss", "finition brillante"),
    ("two-tone", "finition deux tons"),
    ("bronze", "teinte bronze"),
    ("beadlock", "ceinture type beadlock"),
    ("carbon", "structure carbone"),
    ("step lip", "rebord à gradin"),
    ("deep dish", "dish profond"),
]


def faits_du_nom(nom):
    """Diamètres, entraxes, véhicules visés et traits de dessin. Jamais de texte."""
    n = nom or ""
    diam = sorted({int(d) for d in DIAMETRES.findall(n)})
    ent = sorted({f"{a}x{b}" for a, b in ENTRAXES.findall(n)},
                 key=lambda s: float(s.split("x")[1]))
    marques = sorted({v for k, v in MARQUES.items() if k in n.lower()})
    traits, vus = [], set()
    bas = n.lower()
    for cle, libelle in TRAITS:
        if cle in bas and libelle not in vus:
            # « deep concave » l'emporte sur « concave » : on ne veut pas les deux.
            if libelle == "profil concave" and "profil très concave" in vus:
                continue
            traits.append(libelle); vus.add(libelle)
    return {"diametres": diam, "entraxes": ent, "vehicules": marques, "traits": traits}


def compter_batons(chemin, accord_mini=3):
    """Nombre de bâtons, ou None si les rayons de mesure ne s'accordent pas.

    On relève la luminance le long de plusieurs cercles concentriques et on
    prend la fréquence dominante de chacun. Un dessin franc donne le même
    nombre sur tous les rayons ; une photo de trois-quarts, une jante posée de
    profil ou un fond chargé donnent des réponses dispersées, et on préfère
    alors ne rien annoncer.
    """
    try:
        im = Image.open(chemin).convert("L")
    except OSError:
        return None
    a = np.array(im).astype(float)
    h, w = a.shape
    cy, cx = h / 2, w / 2
    rayon = min(h, w) * 0.30
    theta = np.linspace(0, 2 * np.pi, 720, endpoint=False)

    votes = []
    for f in np.linspace(0.72, 1.28, 15):
        r = rayon * f
        ys = np.clip((cy + r * np.sin(theta)).astype(int), 0, h - 1)
        xs = np.clip((cx + r * np.cos(theta)).astype(int), 0, w - 1)
        p = a[ys, xs]
        if p.std() < 8:
            continue
        spectre = np.abs(np.fft.rfft(p - p.mean()))
        k = 4 + int(np.argmax(spectre[4:31]))
        # Le second harmonique domine souvent : 20 lobes = 10 bâtons à deux
        # arêtes. On ramène au fondamental quand il est nettement présent.
        if k % 2 == 0 and spectre[k // 2] > 0.55 * spectre[k]:
            k //= 2
        votes.append(k)

    if not votes:
        return None
    n, occurrences = Counter(votes).most_common(1)[0]
    return n if occurrences >= accord_mini and 4 <= n <= 30 else None


def phrase(code, famille, faits, batons):
    """Une phrase factuelle, propre à la référence, pour la fiche et le résumé."""
    bouts = []
    if batons:
        bouts.append(f"dessin à {batons} bâtons")
    if faits["traits"]:
        bouts.append(faits["traits"][0])
    if faits["diametres"]:
        d = faits["diametres"]
        bouts.append(f"déclinée de {d[0]}″ à {d[-1]}″" if len(d) > 1 else f"déclinée en {d[0]}″")
    if faits["entraxes"]:
        bouts.append("entraxes " + ", ".join(faits["entraxes"]))
    return f"{code} — {famille}, " + ", ".join(bouts) + "." if bouts else f"{code} — {famille}."


if __name__ == "__main__":
    import sys
    src = open("src/data/catalog.js").read()
    items = re.findall(
        r'code:\s*"([^"]+)".*?family:\s*"([^"]+)".*?image:\s*"([^"]+)".*?supplierName:\s*"([^"]*)"',
        src, re.S)
    print(f"{len(items)} références lues", file=sys.stderr)
    out = {}
    for i, (code, fam, img, nom) in enumerate(items):
        f = faits_du_nom(nom)
        f["batons"] = compter_batons("public" + img)
        out[code] = f
        if i % 60 == 0:
            print(f"  {i}/{len(items)}", file=sys.stderr)
    json.dump(out, open("scripts/faits.json", "w"), ensure_ascii=False, indent=0)
    avec = sum(1 for v in out.values() if v["batons"])
    print(f"terminé · {len(out)} références · {avec} avec comptage de bâtons", file=sys.stderr)
