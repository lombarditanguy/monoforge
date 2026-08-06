# -*- coding: utf-8 -*-
"""Second tri, sur le résultat du détourage plutôt que sur le masque.

Deux défauts subsistaient après le premier contrôle, tous deux invisibles à
l'échelle d'une vignette de planche mais criants sur fond sombre :

  * l'ombre portée sous la jante, restée accrochée parce qu'elle est en dégradé
    et que le remplissage s'arrête à sa lisière — elle apparaît en traînée
    claire sous la roue ;
  * un objet parasite gardé avec le sujet : socle, palette, carton du
    fournisseur, qui forme une seconde tache séparée.
"""
import numpy as np
from PIL import Image
from scipy import ndimage


def defauts(chemin):
    im = Image.open(chemin).convert("RGBA")
    a = np.array(im.getchannel("A"))
    rgb = np.array(im.convert("RGB")).astype(float)
    opaque = a > 128
    if not opaque.any():
        return "vide"

    ys, xs = np.where(opaque)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()

    # 1) Traînée claire sous la jante. Une jante blanche monte à ~40 % ; une
    #    ombre résiduelle dépasse 50 %. Le seuil est calé sur des cas jugés.
    bande = max(2, int((y1 - y0) * 0.12))
    zone = opaque[y1 - bande : y1 + 1, x0 : x1 + 1]
    if zone.any():
        lum = rgb[y1 - bande : y1 + 1, x0 : x1 + 1] @ [0.299, 0.587, 0.114]
        part = (lum[zone] > 188).mean()
        if part > 0.45:
            return f"ombre portée conservée ({part*100:.0f}% du bas clair)"

    # 2) Objet parasite. Une jante détourée est d'un seul tenant ; tout second
    #    amas notable est un socle, une palette ou un carton.
    lab, n = ndimage.label(opaque)
    if n > 1:
        tailles = np.bincount(lab.ravel())[1:]
        tailles.sort()
        if tailles[-2] > 0.03 * tailles[-1]:
            return f"objet parasite ({tailles[-2]/tailles[-1]*100:.0f}% du sujet)"
    return None


def morsures(chemin, part_mini=0.008, seuil=0.60):
    """Troisième défaut, et le plus sournois : les jantes à face en aluminium
    brossé sont exactement aussi claires que le fond du studio. Le remplissage
    y entre et arrache des morceaux de matière. Aucun seuil de couleur ne peut
    les distinguer — mais la forme, si : une fenêtre entre bâtons est lisse,
    une morsure est déchiquetée, donc son périmètre est démesuré pour sa
    surface. Mesuré sur des cas jugés : 0,14 à 0,35 pour les abîmées, 0,96 à
    1,00 pour les propres.
    """
    import numpy as np
    from PIL import Image
    from scipy import ndimage

    a = np.array(Image.open(chemin).convert("RGBA").getchannel("A")) > 128
    lab, n = ndimage.label(~a)
    if n == 0:
        return None
    bords = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    for i in range(1, n + 1):
        if i in bords:
            continue
        trou = lab == i
        A = trou.sum()
        if A < part_mini * a.size:
            continue
        P = (trou & ~ndimage.binary_erosion(trou)).sum()
        if P == 0:
            continue
        c = 4 * np.pi * A / (P * P)
        if c < seuil:
            return f"matière arrachée (compacité {c:.2f})"
    return None
