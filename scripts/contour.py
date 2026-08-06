# -*- coding: utf-8 -*-
"""Détourage par silhouette, pour les photos que le remplissage par couleur abîme.

Le remplissage par couleur (voir detourage.py) part du fond et avance tant que la
teinte reste proche. Sur une jante à face brossée, aussi claire que le studio, il
entre dans la matière et y arrache des morceaux. La forme, elle, reste lisible :
une jante est un objet compact aux bords nets. On cherche donc sa silhouette au
lieu de sa couleur.

GrabCut fait ça : on lui donne un rectangle « le sujet est là-dedans » et il
sépare l'avant-plan du fond en s'appuyant sur les discontinuités. Mais il ne rend
qu'une silhouette pleine — les fenêtres entre les bâtons, qui sont du fond
enfermé dans le sujet, restent opaques. Sur la planche-contact en vignettes ça ne
se voit pas (du blanc sur du blanc) ; sur la carte sombre du site, chaque fenêtre
devient une tache. Il faut donc les rouvrir ensuite, une par une, et n'accepter
que celles dont la forme est celle d'une fenêtre : lisse et compacte. Une
déchirure dans la matière, elle, est déchiquetée — c'est ce qui la trahit.

Ce que ça donne, mesuré : la méthode récupère les jantes sombres ou colorées,
dont la matière se détache du studio. Elle échoue sur les faces polies et
brossées, et l'échec est de principe, pas de réglage : sur ces rendus, les
reflets spéculaires valent exactement 255 comme le fond. Aucune règle sur la
valeur du pixel ne peut les séparer — ouvrir les fenêtres troue la jante,
préserver la jante bouche les fenêtres. Trois méthodes ont été essayées
(remplissage par couleur, silhouette seule, silhouette + fenêtres) et butent au
même endroit. Pour ces références-là, la seule vraie sortie est de redemander
les rendus au fournisseur avec leur couche alpha.

residu_de_fond ci-dessous est le contrôle qui manquait au premier essai : il
mesure ce qui reste du studio et il est calé sur les détourages déjà validés.
"""
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SENTINELLE = (255, 0, 255)


def couleur_du_fond(a):
    """Teinte du studio, prise sur les quatre coins."""
    h, w = a.shape[:2]
    c = 12
    coins = np.concatenate([
        a[:c, :c].reshape(-1, 3), a[:c, -c:].reshape(-1, 3),
        a[-c:, :c].reshape(-1, 3), a[-c:, -c:].reshape(-1, 3),
    ])
    return np.median(coins, axis=0)


def _cadre_du_sujet(im, seuil=40, marge=0.04):
    """Rectangle englobant grossier, obtenu en retirant le fond depuis les coins.

    Approximatif : le remplissage mord parfois dans la jante. Peu importe, on ne
    lui demande qu'un cadre, et la marge rattrape ce qu'il a mangé.
    """
    trav = im.copy()
    w, h = trav.size
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(trav, xy, SENTINELLE, thresh=seuil)
    fond = np.all(np.array(trav) == SENTINELLE, axis=2)
    ys, xs = np.where(~fond)
    if len(xs) == 0:
        return None
    mx, my = int(w * marge), int(h * marge)
    return (max(0, xs.min() - mx), max(0, ys.min() - my),
            min(w - 1, xs.max() + mx), min(h - 1, ys.max() + my))


def _silhouette(bgr, rect, iterations=5):
    x0, y0, x1, y1 = rect
    masque = np.zeros(bgr.shape[:2], np.uint8)
    cv2.grabCut(bgr, masque, (x0, y0, x1 - x0, y1 - y0),
                np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64),
                iterations, cv2.GC_INIT_WITH_RECT)
    plein = ((masque == cv2.GC_FGD) | (masque == cv2.GC_PR_FGD)).astype(np.uint8)

    # GrabCut laisse des pixels isolés le long des arêtes ; sur fond sombre une
    # découpe crénelée se voit. On ferme, puis on ne garde que la pièce
    # principale — un éclat détaché du sujet est du fond mal classé.
    plein = cv2.morphologyEx(plein, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    lab, n = ndimage.label(plein)
    if n == 0:
        return None
    tailles = ndimage.sum(plein, lab, range(1, n + 1))
    return (lab == (int(np.argmax(tailles)) + 1))


def _fenetres(a, silhouette, fond, tol=26, compacite_min=0.55, part_max=0.55):
    """Rouvre le fond enfermé dans la silhouette : fenêtres entre les bâtons.

    On part des pixels de la teinte du studio situés à l'intérieur, et on les
    prend région par région. Une fenêtre est un trou franc, lisse et compact.
    Une déchirure dans une face brossée — celle qui a fait échouer le
    remplissage par couleur — serpente le long des reflets et se reconnaît à sa
    compacité effondrée. Le seuil vient de mesures : 0,14 à 0,35 pour les
    déchirures, au-delà de 0,90 pour les fenêtres franches.
    """
    proche = np.all(np.abs(a.astype(int) - fond) < tol, axis=2) & silhouette
    if not proche.any():
        return np.zeros_like(silhouette)

    lab, n = ndimage.label(proche)
    garde = np.zeros_like(silhouette)
    aire_sujet = silhouette.sum()
    for i in range(1, n + 1):
        region = (lab == i)
        aire = int(region.sum())
        if aire < 40:
            # Poussière et liseré : on retire sans discuter, c'est trop petit
            # pour être de la matière.
            garde |= region
            continue
        if aire > part_max * aire_sujet:
            # Une région qui couvre la moitié du sujet n'est pas une fenêtre :
            # le remplissage s'est échappé dans la jante.
            continue
        contours, _ = cv2.findContours(region.astype(np.uint8), cv2.RETR_EXTERNAL,
                                       cv2.CHAIN_APPROX_NONE)
        p = sum(cv2.arcLength(c, True) for c in contours)
        if p <= 0:
            continue
        if 4 * np.pi * aire / (p * p) >= compacite_min:
            garde |= region
    return garde


def detourer_contour(chemin, iterations=5):
    im = Image.open(chemin).convert("RGB")
    a = np.array(im)
    rect = _cadre_du_sujet(im)
    if rect is None or rect[2] - rect[0] < 20 or rect[3] - rect[1] < 20:
        return None
    sil = _silhouette(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), rect, iterations)
    if sil is None:
        return None

    fond = couleur_du_fond(a)
    garde = sil & ~_fenetres(a, sil, fond)

    # Un pixel d'érosion avant le flou : la frontière de GrabCut passe au ras du
    # sujet et garde une rangée de pixels mi-jante mi-studio. Sur une jante
    # noire, cette rangée forme un halo clair qui se voit de loin.
    garde = cv2.erode(garde.astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
    masque = Image.fromarray(garde).filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert("RGBA")
    out.putalpha(masque)
    return out, masque


def residu_de_fond(image, tol=22):
    """Part des pixels opaques restés à la teinte du studio, en %.

    C'est le contrôle qui manquait au premier essai. Mesuré sur les détourages
    déjà validés, il ne dépasse jamais 0,7 % ; les silhouettes brutes, fenêtres
    encore bouchées, montaient à 20 %. Le résidu est invisible sur la planche en
    vignettes — fond blanc sur fond blanc — et criant sur la carte du site.
    """
    a = np.array(image)
    opaque = a[..., 3] > 200
    if not opaque.any():
        return 100.0
    fond = couleur_du_fond(a[..., :3])
    if fond.min() < 200:
        return 100.0  # fond sombre ou chargé : hors sujet pour ce détourage
    reste = np.all(np.abs(a[..., :3].astype(int) - fond) < tol, axis=2) & opaque
    return 100.0 * reste.sum() / opaque.sum()
