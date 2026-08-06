# -*- coding: utf-8 -*-
"""Détourage du catalogue.

Le fond de ces photos est un blanc quasi uniforme. On le retire en deux temps :
le pourtour depuis les quatre coins, puis les fenêtres entre les bâtons, qui
sont closes et donc inatteignables depuis le bord. Un seuil global ferait
l'affaire sur une jante bronze mais mangerait les reflets d'une jante polie.

Chaque résultat passe ensuite un contrôle. Une photo qui l'échoue n'est pas
remplacée : mieux vaut un fond blanc qu'un détourage raté, et la consigne était
explicite — soit c'est propre, soit on n'y touche pas.
"""
from PIL import Image, ImageDraw, ImageFilter
import io

SENTINELLE = (255, 0, 255)


def detourer(chemin, seuil=40, plancher=238, pas=6):
    im = Image.open(chemin).convert("RGB")
    trav = im.copy()
    w, h = trav.size
    px = trav.load()

    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(trav, xy, SENTINELLE, thresh=seuil)

    for y in range(0, h, pas):
        for x in range(0, w, pas):
            p = px[x, y]
            if p != SENTINELLE and min(p) >= plancher:
                ImageDraw.floodfill(trav, (x, y), SENTINELLE, thresh=seuil)

    masque = Image.new("L", (w, h), 255)
    mp = masque.load()
    retires = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] == SENTINELLE:
                mp[x, y] = 0
                retires += 1

    masque = masque.filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert("RGBA")
    out.putalpha(masque)
    return out, masque, retires / (w * h)


def controler(masque, part):
    """Renvoie None si le détourage est bon, sinon la raison du rejet."""
    w, h = masque.size
    mp = masque.load()

    # Trop peu retiré : le fond n'était pas uni, on n'a grignoté que les coins.
    if part < 0.18:
        return f"fond non uni ({part*100:.0f}% retiré)"
    # Trop retiré : le seuil a mangé la jante elle-même.
    if part > 0.80:
        return f"sujet entamé ({part*100:.0f}% retiré)"

    # Sujet minuscule ou éclaté : la boîte englobante doit rester substantielle.
    binaire = masque.point(lambda v: 255 if v > 128 else 0)
    boite = binaire.getbbox()
    if not boite:
        return "rien retenu"
    bw, bh = boite[2] - boite[0], boite[3] - boite[1]
    if bw * bh < 0.25 * w * h:
        return f"sujet trop petit ({bw*bh/(w*h)*100:.0f}% du cadre)"

    # Le contrôle décisif, et le seul qui sépare vraiment. Mesuré sur des cas
    # jugés à l'œil : les jantes correctement détourées remplissent leur boîte
    # englobante à 65-84 %, les photos dont on n'a mordu qu'un bord à 87-98 %.
    # Une jante est ronde et laisse ses quatre coins vides ; Une photo d'atelier ou un tapis carbone dont on n'a mordu que la
    # bordure remplit sa boîte à 95 % — c'est un rectangle, pas un objet. Sans
    # ce test, ces images-là passaient et laissaient une vignette rectangulaire
    # au milieu d'une grille de jantes détourées.
    opaques = sum(binaire.crop(boite).point(lambda v: 1 if v else 0)
                  .getdata())
    remplissage = opaques / (bw * bh)
    if remplissage > 0.85:
        return f"rectangle conservé (boîte remplie à {remplissage*100:.0f}%)"
    return None


def encoder(image, qualite=86):
    b = io.BytesIO()
    image.save(b, "WEBP", quality=qualite, method=5)
    return b.getvalue()
