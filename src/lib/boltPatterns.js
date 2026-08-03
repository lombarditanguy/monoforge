// Entraxes (bolt patterns) par marque/modèle.
//
// Pourquoi une table locale plutôt qu'une API payante : l'entraxe est une
// donnée quasi-fixe par constructeur (Mercedes = 5x112 sur toute la gamme,
// BMW = 5x120 jusqu'aux G-series puis 5x112...), publique et stable. Les API
// de fitment facturent surtout leur configurateur 3D, dont on n'a pas besoin.
//
// IMPORTANT : ces valeurs sont INDICATIVES, destinées à pré-remplir la fiche
// commande pour faire gagner du temps à l'admin. Elles ne remplacent pas la
// vérification des cotes réelles avec le client avant fabrication — c'est
// d'ailleurs déjà la promesse faite sur le site (chaque jante est fabriquée
// aux cotes confirmées du véhicule).
//
// Le déport (ET) n'est volontairement pas dans cette table : sur une jante
// sur mesure c'est un paramètre de conception défini avec le client, pas une
// caractéristique figée du véhicule.

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Marques dont toute la gamme courante partage le même entraxe.
const BY_MAKE = {
  MERCEDES: "5x112",
  MERCEDESBENZ: "5x112",
  AUDI: "5x112",
  VOLKSWAGEN: "5x112",
  VW: "5x112",
  SKODA: "5x112",
  SEAT: "5x112",
  CUPRA: "5x112",
  BENTLEY: "5x112",
  LAMBORGHINI: "5x112",
  VOLVO: "5x108",
  ALFAROMEO: "5x110",
  JAGUAR: "5x108",
  LANDROVER: "5x120",
  RANGEROVER: "5x120",
  TOYOTA: "5x114.3",
  LEXUS: "5x114.3",
  HONDA: "5x114.3",
  MAZDA: "5x114.3",
  HYUNDAI: "5x114.3",
  KIA: "5x114.3",
  NISSAN: "5x114.3",
  INFINITI: "5x114.3",
  MITSUBISHI: "5x114.3",
  MCLAREN: "5x120",
  FERRARI: "5x108",
  MASERATI: "5x114.3",
};

// Cas où l'entraxe dépend du modèle (et parfois de l'année).
// Chaque entrée : test sur le modèle normalisé -> entraxe.
const BY_MODEL = {
  PORSCHE: [
    { match: /MACAN/, entraxe: "5x112" },
    { match: /TAYCAN/, entraxe: "5x112" },
    // Cayenne : 5x130 sur les deux premières générations, 5x112 depuis 2018 (9Y0).
    { match: /CAYENNE/, entraxe: "5x130", entraxeRecent: "5x112", anneeBascule: 2018 },
    { match: /PANAMERA|911|BOXSTER|CAYMAN|718|CARRERA|TAYLOR/, entraxe: "5x130" },
  ],
  TESLA: [
    { match: /MODEL3|MODELY/, entraxe: "5x114.3" },
    { match: /MODELS|MODELX/, entraxe: "5x120" },
  ],
  MINI: [
    // Les MINI F-series (2014+) passent en 5x112, les R-series restent en 4x100.
    { match: /.*/, entraxe: "4x100", entraxeRecent: "5x112", anneeBascule: 2014 },
  ],
  RENAULT: [
    { match: /CLIO|CAPTUR|ZOE|TWINGO|MODUS/, entraxe: "4x100" },
    { match: /MEGANE|SCENIC|TALISMAN|KADJAR|ESPACE|LAGUNA|ARKANA|AUSTRAL/, entraxe: "5x114.3" },
  ],
  DACIA: [
    { match: /SANDERO|LOGAN|SPRING/, entraxe: "4x100" },
    { match: /DUSTER|JOGGER|BIGSTER/, entraxe: "5x114.3" },
  ],
  ALPINE: [{ match: /.*/, entraxe: "5x114.3" }],
  PEUGEOT: [
    { match: /^(106|107|108|205|206|207|208|301|306|307|308|2008)/, entraxe: "4x108" },
    { match: /^(3008|407|408|508|5008|607|807|RIFTER|TRAVELLER)/, entraxe: "5x108" },
  ],
  CITROEN: [
    { match: /^(C1|C2|C3|C4|DS3|DS4|BERLINGO)/, entraxe: "4x108" },
    { match: /^(C5|C6|C8|DS5|DS7|DS9|SPACETOURER)/, entraxe: "5x108" },
  ],
  DS: [
    { match: /^(DS3|DS4)/, entraxe: "4x108" },
    { match: /^(DS7|DS9)/, entraxe: "5x108" },
  ],
  FORD: [
    { match: /MUSTANG/, entraxe: "5x114.3" },
    { match: /RANGER|F150|F250/, entraxe: "6x139.7" },
    { match: /FIESTA|KA/, entraxe: "4x108" },
    { match: /FOCUS|MONDEO|KUGA|PUMA|SMAX|GALAXY/, entraxe: "5x108" },
  ],
  JEEP: [
    { match: /WRANGLER|GLADIATOR/, entraxe: "5x127" },
    { match: /GRANDCHEROKEE/, entraxe: "5x127" },
    { match: /RENEGADE|COMPASS/, entraxe: "5x110" },
  ],
  FIAT: [
    { match: /500|PANDA|PUNTO/, entraxe: "4x98" },
    { match: /TIPO|BRAVO|DOBLO/, entraxe: "5x98" },
  ],
  SUBARU: [
    { match: /IMPREZA|WRX|STI|BRZ|FORESTER|LEVORG|OUTBACK|LEGACY/, entraxe: "5x114.3" },
  ],
  // Les 4x4 japonais s'écartent nettement du 5x114.3 de leurs gammes routières.
  TOYOTA: [
    { match: /PRADO/, entraxe: "6x139.7" },
    {
      match: /LANDCRUISER|TUNDRA|SEQUOIA/,
      entraxe: "5x150",
      confiance: "moyenne",
      note: "Land Cruiser : 5x150 sur les 100/200/300, mais 6x139.7 sur les séries 70 et les Prado — à vérifier.",
    },
    { match: /HILUX|4RUNNER|FORTUNER|FJCRUISER/, entraxe: "6x139.7" },
    { match: /.*/, entraxe: "5x114.3" },
  ],
  NISSAN: [
    { match: /PATROL|NAVARA|TERRANO/, entraxe: "6x139.7" },
    { match: /.*/, entraxe: "5x114.3" },
  ],
  MITSUBISHI: [
    { match: /PAJERO|L200|MONTERO/, entraxe: "6x139.7" },
    { match: /.*/, entraxe: "5x114.3" },
  ],
  OPEL: [
    { match: /CORSA|ADAM|KARL/, entraxe: "4x100" },
    { match: /ASTRA|INSIGNIA|MOKKA|GRANDLAND|CROSSLAND|ZAFIRA/, entraxe: "5x108" },
  ],
};

// BMW : bascule 5x120 -> 5x112 avec les plateformes G (à partir de ~2017 pour
// la Série 5 G30, ~2019 pour la Série 3 G20 et les X3/X5). On prend 2018 comme
// année pivot par défaut, avec un avertissement explicite sur la zone grise.
function bmwEntraxe(modele, annee) {
  const m = normalize(modele);
  if (/^I3$/.test(m)) return { entraxe: "5x112", confiance: "haute" };
  if (!annee) {
    return {
      entraxe: "5x120",
      confiance: "faible",
      note: "Année inconnue — BMW est passé de 5x120 à 5x112 vers 2017-2019 (plateformes G). À vérifier impérativement.",
    };
  }
  const year = Number(annee);
  if (year >= 2020) return { entraxe: "5x112", confiance: "haute" };
  if (year <= 2016) return { entraxe: "5x120", confiance: "haute" };
  return {
    entraxe: year >= 2018 ? "5x112" : "5x120",
    confiance: "faible",
    note: "Millésime dans la zone de transition BMW 5x120 / 5x112 (2017-2019, selon la plateforme) — à vérifier impérativement.",
  };
}

/**
 * Estime l'entraxe d'un véhicule à partir de sa marque/modèle/année.
 * Retourne null si la marque n'est pas connue de la table.
 */
export function guessBoltPattern(marque, modele, annee) {
  const make = normalize(marque);
  if (!make) return null;

  if (make === "BMW") return bmwEntraxe(modele, annee);

  const modelRules = BY_MODEL[make];
  if (modelRules) {
    const m = normalize(modele);
    for (const rule of modelRules) {
      if (!rule.match.test(m)) continue;
      if (rule.entraxeRecent && rule.anneeBascule) {
        if (!annee) {
          return {
            entraxe: rule.entraxe,
            confiance: "faible",
            note: `Année inconnue — cet entraxe change à partir de ${rule.anneeBascule} (${rule.entraxeRecent}). À vérifier.`,
          };
        }
        return {
          entraxe: Number(annee) >= rule.anneeBascule ? rule.entraxeRecent : rule.entraxe,
          confiance: "moyenne",
        };
      }
      return { entraxe: rule.entraxe, confiance: rule.confiance || "haute", note: rule.note };
    }
  }

  const byMake = BY_MAKE[make];
  if (byMake) return { entraxe: byMake, confiance: "haute" };

  return null;
}
