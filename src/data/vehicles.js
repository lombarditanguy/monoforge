// Base de données véhicules pour le configurateur — utilisée pour restreindre
// l'année sélectionnable à la vraie période de production de la génération
// choisie, et pré-remplir l'entraxe (PCD) correspondant.
//
// Schéma : chaque marque a des modèles, chaque modèle a des générations/phases
// avec une période de production précise (yearStart/yearEnd, yearEnd=null si
// toujours en production) et l'entraxe d'origine (boltPattern). Une génération
// n'est scindée en "phase 1 / phase 2" que quand l'entraxe ou les cotes
// changent réellement à ce moment-là (pas pour un simple restylage esthétique).
//
// STATUT DE VÉRIFICATION (important avant mise en production) :
// - Renault, Peugeot, Citroën C3/C4, Toyota, Honda, Nissan, et la quasi-totalité
//   du groupe Mini/Land Rover/Ford/Jeep/Volvo/SEAT/Škoda/Opel (sauf Jaguar) ont
//   été vérifiés en croisant au moins deux sources en ligne au moment de la
//   recherche.
// - BMW, Mercedes-Benz, Audi, Porsche, Volkswagen (marques allemandes premium,
//   coeur de clientèle jantes forgées) : l'agent de recherche dédié a été
//   interrompu par une limite de session avant de commencer, mais les entraxes
//   "pivots" ont depuis été vérifiés manuellement (recherche croisée) : BMW
//   5x120 (E-series) -> 5x112 (G-series depuis G20), Mercedes 5x112 (W203 à
//   W213), VW Golf 5x100 (Mk4) -> 5x112 (Mk5+), Porsche 911/Cayman/Boxster/
//   Cayenne/Panamera 5x130, Porsche Macan 5x112. Les années précises de
//   génération/phase et les modèles Audi restent à vérifier avant mise en
//   production.
// - Citroën C5/C3 Aircross/C5 Aircross, Alfa Romeo, Fiat, Mazda, Subaru,
//   Mitsubishi, Hyundai, Kia, Lexus, et Jaguar : recherche en ligne épuisée en
//   cours de session (quota partagé), données issues de connaissances
//   générales recoupées en interne (cohérence entre modèles à plateforme
//   partagée) mais non re-vérifiées via une recherche fraîche. À vérifier
//   avant mise en production, notamment sur les entraxes de bas de gamme
//   Alfa/Fiat et les dates de fin de production les plus récentes (2023-2025).

export const VEHICLE_BRANDS = [
  // ── Allemandes premium — NON vérifiées en ligne cette session ──
  {
    brand: "BMW",
    models: [
      {
        model: "Série 1",
        generations: [
          { id: "e87", label: "E81/E82/E87/E88 (2004–2011)", yearStart: 2004, yearEnd: 2011, boltPattern: "5x120" },
          { id: "f20", label: "F20/F21 (2011–2019)", yearStart: 2011, yearEnd: 2019, boltPattern: "5x120" },
          { id: "f40", label: "F40 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Série 3",
        generations: [
          { id: "e46", label: "E46 (1998–2005)", yearStart: 1998, yearEnd: 2005, boltPattern: "5x120" },
          { id: "e90-ph1", label: "E90/E91/E92/E93 phase 1 (2005–2008)", yearStart: 2005, yearEnd: 2008, boltPattern: "5x120" },
          { id: "e90-ph2", label: "E90/E91/E92/E93 phase 2 (2008–2013)", yearStart: 2008, yearEnd: 2013, boltPattern: "5x120" },
          { id: "f30", label: "F30/F31/F34 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "5x120" },
          { id: "g20", label: "G20/G21 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Série 5",
        generations: [
          { id: "e39", label: "E39 (1995–2003)", yearStart: 1995, yearEnd: 2003, boltPattern: "5x120" },
          { id: "e60", label: "E60/E61 (2003–2010)", yearStart: 2003, yearEnd: 2010, boltPattern: "5x120" },
          { id: "f10", label: "F10/F11 (2010–2017)", yearStart: 2010, yearEnd: 2017, boltPattern: "5x120" },
          { id: "g30", label: "G30/G31 (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "X3",
        generations: [
          { id: "e83", label: "E83 (2003–2010)", yearStart: 2003, yearEnd: 2010, boltPattern: "5x120" },
          { id: "f25", label: "F25 (2010–2017)", yearStart: 2010, yearEnd: 2017, boltPattern: "5x120" },
          { id: "g01", label: "G01 (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "X5",
        generations: [
          { id: "e53", label: "E53 (1999–2006)", yearStart: 1999, yearEnd: 2006, boltPattern: "5x120" },
          { id: "e70", label: "E70 (2006–2013)", yearStart: 2006, yearEnd: 2013, boltPattern: "5x120" },
          { id: "f15", label: "F15 (2013–2018)", yearStart: 2013, yearEnd: 2018, boltPattern: "5x120" },
          { id: "g05", label: "G05 (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x112" },
        ],
      },
    ],
  },
  {
    brand: "Mercedes-Benz",
    models: [
      {
        model: "Classe A",
        generations: [
          { id: "w176", label: "W176 (2012–2018)", yearStart: 2012, yearEnd: 2018, boltPattern: "5x112" },
          { id: "w177", label: "W177 (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Classe C",
        generations: [
          { id: "w203", label: "W203 (2000–2007)", yearStart: 2000, yearEnd: 2007, boltPattern: "5x112" },
          { id: "w204", label: "W204 (2007–2014)", yearStart: 2007, yearEnd: 2014, boltPattern: "5x112" },
          { id: "w205", label: "W205 (2014–2021)", yearStart: 2014, yearEnd: 2021, boltPattern: "5x112" },
          { id: "w206", label: "W206 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Classe E",
        generations: [
          { id: "w211-ph1", label: "W211 phase 1 (2002–2006)", yearStart: 2002, yearEnd: 2006, boltPattern: "5x112" },
          { id: "w211-ph2", label: "W211 phase 2 (2006–2009)", yearStart: 2006, yearEnd: 2009, boltPattern: "5x112" },
          { id: "w212-ph1", label: "W212 phase 1 (2009–2013)", yearStart: 2009, yearEnd: 2013, boltPattern: "5x112" },
          { id: "w212-ph2", label: "W212 phase 2 (2013–2016)", yearStart: 2013, yearEnd: 2016, boltPattern: "5x112" },
          { id: "w213", label: "W213 (2016–2023)", yearStart: 2016, yearEnd: 2023, boltPattern: "5x112" },
        ],
      },
      {
        model: "GLC",
        generations: [
          { id: "x253", label: "X253 (2015–2022)", yearStart: 2015, yearEnd: 2022, boltPattern: "5x112" },
          { id: "x254", label: "X254 (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x112" },
        ],
      },
    ],
  },
  {
    brand: "Audi",
    models: [
      {
        model: "A3",
        generations: [
          { id: "8l", label: "8L (1996–2003)", yearStart: 1996, yearEnd: 2003, boltPattern: "5x100" },
          { id: "8p", label: "8P (2003–2012)", yearStart: 2003, yearEnd: 2012, boltPattern: "5x112" },
          { id: "8v", label: "8V (2012–2020)", yearStart: 2012, yearEnd: 2020, boltPattern: "5x112" },
          { id: "8y", label: "8Y (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "A4",
        generations: [
          { id: "b6", label: "B6 (2000–2004)", yearStart: 2000, yearEnd: 2004, boltPattern: "5x112" },
          { id: "b7", label: "B7 (2004–2008)", yearStart: 2004, yearEnd: 2008, boltPattern: "5x112" },
          { id: "b8", label: "B8 (2008–2015)", yearStart: 2008, yearEnd: 2015, boltPattern: "5x112" },
          { id: "b9", label: "B9 (2015–présent)", yearStart: 2015, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "A6",
        generations: [
          { id: "c6", label: "C6 (2004–2011)", yearStart: 2004, yearEnd: 2011, boltPattern: "5x112" },
          { id: "c7", label: "C7 (2011–2018)", yearStart: 2011, yearEnd: 2018, boltPattern: "5x112" },
          { id: "c8", label: "C8 (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Q5",
        generations: [
          { id: "8r", label: "8R (2008–2017)", yearStart: 2008, yearEnd: 2017, boltPattern: "5x112" },
          { id: "fy", label: "FY (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "TT",
        generations: [
          { id: "8n", label: "8N (1998–2006)", yearStart: 1998, yearEnd: 2006, boltPattern: "5x100" },
          { id: "8j", label: "8J (2006–2014)", yearStart: 2006, yearEnd: 2014, boltPattern: "5x112" },
          { id: "8s", label: "8S (2014–2023)", yearStart: 2014, yearEnd: 2023, boltPattern: "5x112" },
        ],
      },
    ],
  },
  {
    brand: "Porsche",
    models: [
      {
        model: "911",
        generations: [
          { id: "996", label: "996 (1997–2004)", yearStart: 1997, yearEnd: 2004, boltPattern: "5x130" },
          { id: "997", label: "997 (2004–2012)", yearStart: 2004, yearEnd: 2012, boltPattern: "5x130" },
          { id: "991", label: "991 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "5x130" },
          { id: "992", label: "992 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x130" },
        ],
      },
      {
        model: "Cayman / Boxster",
        generations: [
          { id: "987", label: "987 (2004–2012)", yearStart: 2004, yearEnd: 2012, boltPattern: "5x130" },
          { id: "981", label: "981 (2012–2016)", yearStart: 2012, yearEnd: 2016, boltPattern: "5x130" },
          { id: "718", label: "718 (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "5x130" },
        ],
      },
      {
        model: "Cayenne",
        generations: [
          { id: "955", label: "955/957 (2002–2010)", yearStart: 2002, yearEnd: 2010, boltPattern: "5x130" },
          { id: "92a", label: "92A (2010–2017)", yearStart: 2010, yearEnd: 2017, boltPattern: "5x130" },
          { id: "9y0", label: "9Y0 (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x130" },
        ],
      },
      {
        model: "Macan",
        generations: [
          { id: "95b", label: "95B (2014–présent)", yearStart: 2014, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Panamera",
        generations: [
          { id: "970", label: "970 (2009–2016)", yearStart: 2009, yearEnd: 2016, boltPattern: "5x130" },
          { id: "971", label: "971 (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "5x130" },
        ],
      },
    ],
  },
  {
    brand: "Volkswagen",
    models: [
      {
        model: "Polo",
        generations: [
          { id: "polo-9n", label: "Polo 9N (2002–2009)", yearStart: 2002, yearEnd: 2009, boltPattern: "5x100" },
          { id: "polo-6r", label: "Polo 6R (2009–2017)", yearStart: 2009, yearEnd: 2017, boltPattern: "5x100" },
          { id: "polo-aw", label: "Polo AW (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x100" },
        ],
      },
      {
        model: "Golf",
        generations: [
          { id: "golf-4", label: "Golf 4 (1997–2003)", yearStart: 1997, yearEnd: 2003, boltPattern: "5x100" },
          { id: "golf-5", label: "Golf 5 (2003–2008)", yearStart: 2003, yearEnd: 2008, boltPattern: "5x112" },
          { id: "golf-6", label: "Golf 6 (2008–2012)", yearStart: 2008, yearEnd: 2012, boltPattern: "5x112" },
          { id: "golf-7", label: "Golf 7 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "5x112" },
          { id: "golf-8", label: "Golf 8 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Passat",
        generations: [
          { id: "passat-b6", label: "Passat B6 (2005–2010)", yearStart: 2005, yearEnd: 2010, boltPattern: "5x112" },
          { id: "passat-b7", label: "Passat B7 (2010–2014)", yearStart: 2010, yearEnd: 2014, boltPattern: "5x112" },
          { id: "passat-b8", label: "Passat B8 (2014–présent)", yearStart: 2014, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      {
        model: "Tiguan",
        generations: [
          { id: "tiguan-5n", label: "Tiguan 5N (2007–2016)", yearStart: 2007, yearEnd: 2016, boltPattern: "5x112" },
          { id: "tiguan-ad1", label: "Tiguan AD1 (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "5x112" },
        ],
      },
    ],
  },

  // ── Vérifiées en ligne cette session (multi-sources) ──
  {
    brand: "Renault",
    models: [
      {
        model: "Clio",
        generations: [
          { id: "clio-1", label: "Clio 1 (1990–1998)", yearStart: 1990, yearEnd: 1998, boltPattern: "4x100" },
          { id: "clio-2", label: "Clio 2 (1998–2005)", yearStart: 1998, yearEnd: 2005, boltPattern: "4x100" },
          { id: "clio-3", label: "Clio 3 (2005–2012)", yearStart: 2005, yearEnd: 2012, boltPattern: "4x100" },
          { id: "clio-3-rs", label: "Clio 3 RS (2006–2012)", yearStart: 2006, yearEnd: 2012, boltPattern: "5x108" },
          { id: "clio-4", label: "Clio 4 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "4x100" },
          { id: "clio-4-rs", label: "Clio 4 RS (2013–2018)", yearStart: 2013, yearEnd: 2018, boltPattern: "5x114.3" },
          { id: "clio-5", label: "Clio 5 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "4x100" },
        ],
      },
      {
        model: "Mégane",
        generations: [
          { id: "megane-1", label: "Mégane 1 (1995–2003)", yearStart: 1995, yearEnd: 2003, boltPattern: "4x100" },
          { id: "megane-2", label: "Mégane 2 (2002–2009)", yearStart: 2002, yearEnd: 2009, boltPattern: "5x108" },
          { id: "megane-3", label: "Mégane 3 (2008–2016)", yearStart: 2008, yearEnd: 2016, boltPattern: "5x114.3" },
          { id: "megane-4", label: "Mégane 4 (2016–2022)", yearStart: 2016, yearEnd: 2022, boltPattern: "5x114.3" },
          { id: "megane-etech", label: "Mégane E-Tech Electric (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Twingo",
        generations: [
          { id: "twingo-1", label: "Twingo 1 (1993–2007)", yearStart: 1993, yearEnd: 2007, boltPattern: "4x100" },
          { id: "twingo-2", label: "Twingo 2 (2007–2014)", yearStart: 2007, yearEnd: 2014, boltPattern: "4x100" },
          { id: "twingo-3", label: "Twingo 3 (2014–2024)", yearStart: 2014, yearEnd: 2024, boltPattern: "4x100" },
        ],
      },
      {
        model: "Captur",
        generations: [
          { id: "captur-1", label: "Captur 1 (2013–2019)", yearStart: 2013, yearEnd: 2019, boltPattern: "4x100" },
          { id: "captur-2", label: "Captur 2 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Kadjar",
        generations: [{ id: "kadjar-1", label: "Kadjar (2015–2022)", yearStart: 2015, yearEnd: 2022, boltPattern: "5x114.3" }],
      },
      {
        model: "Scénic",
        generations: [
          { id: "scenic-1", label: "Scénic 1 (1996–2003)", yearStart: 1996, yearEnd: 2003, boltPattern: "4x100" },
          { id: "scenic-2", label: "Scénic 2 (2003–2009)", yearStart: 2003, yearEnd: 2009, boltPattern: "5x108" },
          { id: "scenic-3", label: "Scénic 3 (2009–2016)", yearStart: 2009, yearEnd: 2016, boltPattern: "5x114.3" },
          { id: "scenic-4", label: "Scénic 4 (2016–2022)", yearStart: 2016, yearEnd: 2022, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Talisman",
        generations: [{ id: "talisman-1", label: "Talisman (2015–2022)", yearStart: 2015, yearEnd: 2022, boltPattern: "5x114.3" }],
      },
      {
        model: "Espace",
        generations: [
          { id: "espace-4", label: "Espace IV (2002–2015)", yearStart: 2002, yearEnd: 2015, boltPattern: "5x108" },
          { id: "espace-5", label: "Espace V (2015–2023)", yearStart: 2015, yearEnd: 2023, boltPattern: "5x114.3" },
          { id: "espace-6", label: "Espace VI (2023–présent)", yearStart: 2023, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
    ],
  },
  {
    brand: "Peugeot",
    models: [
      { model: "108", generations: [{ id: "108-1", label: "108 (2014–2022)", yearStart: 2014, yearEnd: 2022, boltPattern: "4x100" }] },
      {
        model: "208",
        generations: [
          { id: "208-1", label: "208 I (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "4x108" },
          { id: "208-2", label: "208 II (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "4x108" },
        ],
      },
      {
        model: "308",
        generations: [
          { id: "308-1", label: "308 I (2007–2013)", yearStart: 2007, yearEnd: 2013, boltPattern: "4x108" },
          { id: "308-2-ph1", label: "308 II phase 1 (2013–2017)", yearStart: 2013, yearEnd: 2017, boltPattern: "4x108" },
          { id: "308-2-ph2", label: "308 II phase 2 (2017–2021)", yearStart: 2017, yearEnd: 2021, boltPattern: "5x108" },
          { id: "308-3", label: "308 III (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      {
        model: "508",
        generations: [
          { id: "508-1", label: "508 I (2010–2018)", yearStart: 2010, yearEnd: 2018, boltPattern: "5x108" },
          { id: "508-2", label: "508 II (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      {
        model: "2008",
        generations: [
          { id: "2008-1", label: "2008 I (2013–2019)", yearStart: 2013, yearEnd: 2019, boltPattern: "4x108" },
          { id: "2008-2", label: "2008 II (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "4x108" },
        ],
      },
      {
        model: "3008",
        generations: [
          { id: "3008-1", label: "3008 I (2009–2016)", yearStart: 2009, yearEnd: 2016, boltPattern: "4x108" },
          { id: "3008-2", label: "3008 II (2016–2023)", yearStart: 2016, yearEnd: 2023, boltPattern: "5x108" },
          { id: "3008-3", label: "3008 III (2024–présent)", yearStart: 2024, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "5008",
        generations: [
          { id: "5008-1", label: "5008 I (2009–2017)", yearStart: 2009, yearEnd: 2017, boltPattern: "4x108" },
          { id: "5008-2", label: "5008 II (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      { model: "RCZ", generations: [{ id: "rcz-1", label: "RCZ (2010–2015)", yearStart: 2010, yearEnd: 2015, boltPattern: "5x108" }] },
    ],
  },
  {
    brand: "Citroën",
    models: [
      {
        model: "C3",
        generations: [
          { id: "c3-1", label: "C3 I (2002–2009)", yearStart: 2002, yearEnd: 2009, boltPattern: "4x108" },
          { id: "c3-2", label: "C3 II (2009–2016)", yearStart: 2009, yearEnd: 2016, boltPattern: "4x108" },
          { id: "c3-3", label: "C3 III (2016–2024)", yearStart: 2016, yearEnd: 2024, boltPattern: "4x108" },
          { id: "c3-4", label: "C3 IV (2024–présent)", yearStart: 2024, yearEnd: null, boltPattern: "4x108" },
        ],
      },
      {
        model: "C4",
        generations: [
          { id: "c4-1", label: "C4 I (2004–2010)", yearStart: 2004, yearEnd: 2010, boltPattern: "4x108" },
          { id: "c4-2", label: "C4 II (2010–2018)", yearStart: 2010, yearEnd: 2018, boltPattern: "4x108" },
          { id: "c4-3", label: "C4 III (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "4x108" },
        ],
      },
      {
        model: "C5",
        generations: [
          { id: "c5-1", label: "C5 I (2001–2008)", yearStart: 2001, yearEnd: 2008, boltPattern: "4x108" },
          { id: "c5-2", label: "C5 II (2008–2017)", yearStart: 2008, yearEnd: 2017, boltPattern: "4x108" },
          { id: "c5-x", label: "C5 X (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      {
        model: "C3 Aircross",
        generations: [
          { id: "c3aircross-1", label: "C3 Aircross I (2017–2024)", yearStart: 2017, yearEnd: 2024, boltPattern: "4x108" },
          { id: "c3aircross-2", label: "C3 Aircross II (2024–présent)", yearStart: 2024, yearEnd: null, boltPattern: "4x108" },
        ],
      },
      {
        model: "C5 Aircross",
        generations: [{ id: "c5aircross-1", label: "C5 Aircross (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x108" }],
      },
    ],
  },
  {
    brand: "Alfa Romeo",
    models: [
      { model: "Giulietta", generations: [{ id: "giulietta-1", label: "Giulietta (2010–2020)", yearStart: 2010, yearEnd: 2020, boltPattern: "5x110" }] },
      { model: "Giulia", generations: [{ id: "giulia-1", label: "Giulia (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "5x110" }] },
      { model: "Stelvio", generations: [{ id: "stelvio-1", label: "Stelvio (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x110" }] },
      { model: "MiTo", generations: [{ id: "mito-1", label: "MiTo (2008–2018)", yearStart: 2008, yearEnd: 2018, boltPattern: "4x100" }] },
      { model: "4C", generations: [{ id: "4c-1", label: "4C (2013–2020)", yearStart: 2013, yearEnd: 2020, boltPattern: "5x110" }] },
    ],
  },
  {
    brand: "Fiat",
    models: [
      {
        model: "500",
        generations: [
          { id: "500-2", label: "500 (2007–2024)", yearStart: 2007, yearEnd: 2024, boltPattern: "4x98" },
          { id: "500e", label: "500e électrique (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "4x98" },
        ],
      },
      {
        model: "Panda",
        generations: [
          { id: "panda-2", label: "Panda II (2003–2012)", yearStart: 2003, yearEnd: 2012, boltPattern: "4x98" },
          { id: "panda-3", label: "Panda III (2012–présent)", yearStart: 2012, yearEnd: null, boltPattern: "4x98" },
        ],
      },
      { model: "Tipo", generations: [{ id: "tipo-1", label: "Tipo (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "4x98" }] },
      { model: "500X", generations: [{ id: "500x-1", label: "500X (2014–présent)", yearStart: 2014, yearEnd: null, boltPattern: "5x110" }] },
    ],
  },
  {
    brand: "Toyota",
    models: [
      {
        model: "Yaris",
        generations: [
          { id: "yaris-xp10", label: "Yaris XP10 (1999–2005)", yearStart: 1999, yearEnd: 2005, boltPattern: "4x100" },
          { id: "yaris-xp90", label: "Yaris XP90 (2005–2011)", yearStart: 2005, yearEnd: 2011, boltPattern: "4x100" },
          { id: "yaris-xp130", label: "Yaris XP130 (2011–2020)", yearStart: 2011, yearEnd: 2020, boltPattern: "4x100" },
          { id: "yaris-xp210", label: "Yaris XP210 (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      { model: "GR Yaris", generations: [{ id: "gr-yaris", label: "GR Yaris (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x114.3" }] },
      { model: "Corolla", generations: [{ id: "corolla-e210", label: "Corolla E210 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x114.3" }] },
      {
        model: "GT86 / GR86",
        generations: [
          { id: "gt86", label: "GT86 (2012–2021)", yearStart: 2012, yearEnd: 2021, boltPattern: "5x100" },
          { id: "gr86", label: "GR86 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x100" },
        ],
      },
      {
        model: "Supra",
        generations: [
          { id: "supra-a80", label: "Supra A80 (1993–1996)", yearStart: 1993, yearEnd: 1996, boltPattern: "5x114.3" },
          { id: "supra-a90", label: "Supra A90 (2019–2025)", yearStart: 2019, yearEnd: 2025, boltPattern: "5x112" },
        ],
      },
      {
        model: "C-HR",
        generations: [
          { id: "chr-ax10", label: "C-HR I (2016–2023)", yearStart: 2016, yearEnd: 2023, boltPattern: "5x114.3" },
          { id: "chr-ax20", label: "C-HR II (2023–présent)", yearStart: 2023, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "RAV4",
        generations: [
          { id: "rav4-xa40", label: "RAV4 XA40 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "5x114.3" },
          { id: "rav4-xa50", label: "RAV4 XA50 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
    ],
  },
  {
    brand: "Honda",
    models: [
      {
        model: "Civic",
        generations: [
          { id: "civic-8g", label: "Civic 8G (2006–2011)", yearStart: 2006, yearEnd: 2011, boltPattern: "5x114.3" },
          { id: "civic-9g", label: "Civic 9G (2011–2017)", yearStart: 2011, yearEnd: 2017, boltPattern: "5x114.3" },
          { id: "civic-10g", label: "Civic 10G (2017–2021)", yearStart: 2017, yearEnd: 2021, boltPattern: "5x114.3" },
          { id: "civic-11g", label: "Civic 11G (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x114.3" },
          { id: "civic-type-r-fk2", label: "Civic Type R FK2 (2015–2017)", yearStart: 2015, yearEnd: 2017, boltPattern: "5x120" },
          { id: "civic-type-r-fk8", label: "Civic Type R FK8 (2017–2021)", yearStart: 2017, yearEnd: 2021, boltPattern: "5x120" },
          { id: "civic-type-r-fl5", label: "Civic Type R FL5 (2023–présent)", yearStart: 2023, yearEnd: null, boltPattern: "5x120" },
        ],
      },
      {
        model: "CR-V",
        generations: [
          { id: "crv-re", label: "CR-V RE (2006–2012)", yearStart: 2006, yearEnd: 2012, boltPattern: "5x114.3" },
          { id: "crv-rm", label: "CR-V RM (2012–2018)", yearStart: 2012, yearEnd: 2018, boltPattern: "5x114.3" },
          { id: "crv-rw", label: "CR-V RW (2018–2023)", yearStart: 2018, yearEnd: 2023, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "NSX",
        generations: [
          { id: "nsx-na", label: "NSX NA1/NA2 (1990–2005)", yearStart: 1990, yearEnd: 2005, boltPattern: "5x114.3" },
          { id: "nsx-nc1", label: "NSX NC1 (2016–2022)", yearStart: 2016, yearEnd: 2022, boltPattern: "5x120" },
        ],
      },
    ],
  },
  {
    brand: "Nissan",
    models: [
      {
        model: "Micra",
        generations: [
          { id: "micra-k12", label: "Micra K12 (2003–2010)", yearStart: 2003, yearEnd: 2010, boltPattern: "4x100" },
          { id: "micra-k13", label: "Micra K13 (2010–2017)", yearStart: 2010, yearEnd: 2017, boltPattern: "4x100" },
          { id: "micra-k14", label: "Micra K14 (2017–2023)", yearStart: 2017, yearEnd: 2023, boltPattern: "4x100" },
        ],
      },
      {
        model: "Juke",
        generations: [
          { id: "juke-f15", label: "Juke F15 (2010–2019)", yearStart: 2010, yearEnd: 2019, boltPattern: "5x114.3" },
          { id: "juke-f16", label: "Juke F16 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Qashqai",
        generations: [
          { id: "qashqai-j10", label: "Qashqai J10 (2007–2013)", yearStart: 2007, yearEnd: 2013, boltPattern: "5x114.3" },
          { id: "qashqai-j11", label: "Qashqai J11 (2014–2021)", yearStart: 2014, yearEnd: 2021, boltPattern: "5x114.3" },
          { id: "qashqai-j12", label: "Qashqai J12 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      { model: "370Z", generations: [{ id: "370z-z34", label: "370Z Z34 (2009–2020)", yearStart: 2009, yearEnd: 2020, boltPattern: "5x114.3" }] },
      { model: "GT-R", generations: [{ id: "gtr-r35", label: "GT-R R35 (2009–2022)", yearStart: 2009, yearEnd: 2022, boltPattern: "5x114.3" }] },
    ],
  },
  {
    brand: "Mazda",
    models: [
      {
        model: "MX-5",
        generations: [
          { id: "mx5-na", label: "MX-5 NA (1989–1997)", yearStart: 1989, yearEnd: 1997, boltPattern: "4x100" },
          { id: "mx5-nb", label: "MX-5 NB (1998–2005)", yearStart: 1998, yearEnd: 2005, boltPattern: "4x100" },
          { id: "mx5-nc", label: "MX-5 NC (2005–2015)", yearStart: 2005, yearEnd: 2015, boltPattern: "5x114.3" },
          { id: "mx5-nd", label: "MX-5 ND (2015–présent)", yearStart: 2015, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Mazda3",
        generations: [
          { id: "mazda3-bk", label: "Mazda3 BK (2003–2009)", yearStart: 2003, yearEnd: 2009, boltPattern: "5x114.3" },
          { id: "mazda3-bl", label: "Mazda3 BL (2009–2013)", yearStart: 2009, yearEnd: 2013, boltPattern: "5x114.3" },
          { id: "mazda3-bm", label: "Mazda3 BM (2013–2019)", yearStart: 2013, yearEnd: 2019, boltPattern: "5x114.3" },
          { id: "mazda3-bp", label: "Mazda3 BP (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "CX-5",
        generations: [
          { id: "cx5-ke", label: "CX-5 KE (2012–2017)", yearStart: 2012, yearEnd: 2017, boltPattern: "5x114.3" },
          { id: "cx5-kf", label: "CX-5 KF (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
    ],
  },
  {
    brand: "Subaru",
    models: [
      {
        model: "Impreza WRX/STI",
        generations: [
          { id: "impreza-gc8", label: "Impreza WRX/STI GC8 (1994–2000)", yearStart: 1994, yearEnd: 2000, boltPattern: "5x100" },
          { id: "impreza-gdb", label: "Impreza WRX/STI GDB (2000–2007)", yearStart: 2000, yearEnd: 2007, boltPattern: "5x100" },
          { id: "impreza-grb", label: "Impreza WRX STI GRB (2007–2014)", yearStart: 2007, yearEnd: 2014, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "BRZ",
        generations: [
          { id: "brz-zc6", label: "BRZ ZC6 (2012–2021)", yearStart: 2012, yearEnd: 2021, boltPattern: "5x100" },
          { id: "brz-zd8", label: "BRZ ZD8 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x100" },
        ],
      },
      {
        model: "Forester",
        generations: [
          { id: "forester-sh", label: "Forester SH (2008–2013)", yearStart: 2008, yearEnd: 2013, boltPattern: "5x100" },
          { id: "forester-sj", label: "Forester SJ (2013–2018)", yearStart: 2013, yearEnd: 2018, boltPattern: "5x100" },
          { id: "forester-sk", label: "Forester SK (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
    ],
  },
  {
    brand: "Mitsubishi",
    models: [
      {
        model: "Lancer Evolution",
        generations: [
          { id: "evo-8", label: "Lancer Evo VIII (2003–2005)", yearStart: 2003, yearEnd: 2005, boltPattern: "4x114.3" },
          { id: "evo-9", label: "Lancer Evo IX (2005–2007)", yearStart: 2005, yearEnd: 2007, boltPattern: "4x114.3" },
          { id: "evo-10", label: "Lancer Evo X (2007–2016)", yearStart: 2007, yearEnd: 2016, boltPattern: "5x114.3" },
        ],
      },
      { model: "ASX", generations: [{ id: "asx-1", label: "ASX I (2010–2023)", yearStart: 2010, yearEnd: 2023, boltPattern: "5x114.3" }] },
      { model: "Outlander", generations: [{ id: "outlander-3", label: "Outlander III (2012–2021)", yearStart: 2012, yearEnd: 2021, boltPattern: "5x114.3" }] },
    ],
  },
  {
    brand: "Hyundai",
    models: [
      {
        model: "i20",
        generations: [
          { id: "i20-gb", label: "i20 GB (2014–2020)", yearStart: 2014, yearEnd: 2020, boltPattern: "4x100" },
          { id: "i20-bc3", label: "i20 BC3 (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "4x100" },
        ],
      },
      {
        model: "i30",
        generations: [
          { id: "i30-fd", label: "i30 FD (2007–2012)", yearStart: 2007, yearEnd: 2012, boltPattern: "5x114.3" },
          { id: "i30-gd", label: "i30 GD (2012–2017)", yearStart: 2012, yearEnd: 2017, boltPattern: "5x114.3" },
          { id: "i30-pd", label: "i30 PD, incl. N (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Tucson",
        generations: [
          { id: "tucson-lm", label: "Tucson LM (2009–2015)", yearStart: 2009, yearEnd: 2015, boltPattern: "5x114.3" },
          { id: "tucson-tl", label: "Tucson TL (2015–2020)", yearStart: 2015, yearEnd: 2020, boltPattern: "5x114.3" },
          { id: "tucson-nx4", label: "Tucson NX4 (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      { model: "Ioniq 5", generations: [{ id: "ioniq5", label: "Ioniq 5 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x114.3" }] },
    ],
  },
  {
    brand: "Kia",
    models: [
      {
        model: "Picanto",
        generations: [
          { id: "picanto-ta", label: "Picanto TA (2011–2017)", yearStart: 2011, yearEnd: 2017, boltPattern: "4x100" },
          { id: "picanto-ja", label: "Picanto JA (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "4x100" },
        ],
      },
      {
        model: "Ceed",
        generations: [
          { id: "ceed-jd", label: "Ceed JD (2012–2018)", yearStart: 2012, yearEnd: 2018, boltPattern: "5x114.3" },
          { id: "ceed-cd", label: "Ceed CD (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      {
        model: "Sportage",
        generations: [
          { id: "sportage-sl", label: "Sportage SL (2010–2015)", yearStart: 2010, yearEnd: 2015, boltPattern: "5x114.3" },
          { id: "sportage-ql", label: "Sportage QL (2015–2021)", yearStart: 2015, yearEnd: 2021, boltPattern: "5x114.3" },
          { id: "sportage-nq5", label: "Sportage NQ5 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      { model: "Stinger", generations: [{ id: "stinger-ck", label: "Stinger CK (2017–2023)", yearStart: 2017, yearEnd: 2023, boltPattern: "5x114.3" }] },
      { model: "EV6", generations: [{ id: "ev6", label: "EV6 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x114.3" }] },
    ],
  },
  {
    brand: "Lexus",
    models: [
      {
        model: "IS",
        generations: [
          { id: "is-xe20", label: "IS XE20 (2005–2013)", yearStart: 2005, yearEnd: 2013, boltPattern: "5x114.3" },
          { id: "is-xe30", label: "IS XE30 (2013–présent)", yearStart: 2013, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      { model: "RC", generations: [{ id: "rc", label: "RC (2014–présent)", yearStart: 2014, yearEnd: null, boltPattern: "5x114.3" }] },
      {
        model: "RX",
        generations: [
          { id: "rx-al20", label: "RX IV (2015–2022)", yearStart: 2015, yearEnd: 2022, boltPattern: "5x114.3" },
          { id: "rx-al30", label: "RX V (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
    ],
  },
  {
    brand: "Mini",
    models: [
      {
        model: "Cooper / Cooper S / JCW",
        generations: [
          { id: "mini-r50-r53", label: "Hatch R50/R53 (2001–2006)", yearStart: 2001, yearEnd: 2006, boltPattern: "4x100" },
          { id: "mini-r56", label: "Hatch R56 (2006–2013)", yearStart: 2006, yearEnd: 2013, boltPattern: "4x100" },
          { id: "mini-f56", label: "Hatch F56 (2014–2024)", yearStart: 2014, yearEnd: 2024, boltPattern: "5x112" },
        ],
      },
      {
        model: "Countryman",
        generations: [
          { id: "countryman-r60", label: "Countryman R60 (2010–2016)", yearStart: 2010, yearEnd: 2016, boltPattern: "5x120" },
          { id: "countryman-f60", label: "Countryman F60 (2017–2023)", yearStart: 2017, yearEnd: 2023, boltPattern: "5x112" },
        ],
      },
    ],
  },
  {
    brand: "Land Rover / Range Rover",
    models: [
      {
        model: "Range Rover",
        generations: [
          { id: "range-rover-l322", label: "Range Rover L322 (2002–2012)", yearStart: 2002, yearEnd: 2012, boltPattern: "5x120" },
          { id: "range-rover-l405", label: "Range Rover L405 (2012–2022)", yearStart: 2012, yearEnd: 2022, boltPattern: "5x120" },
          { id: "range-rover-l460", label: "Range Rover L460 (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x120" },
        ],
      },
      {
        model: "Range Rover Sport",
        generations: [
          { id: "range-rover-sport-l320", label: "Range Rover Sport L320 (2005–2013)", yearStart: 2005, yearEnd: 2013, boltPattern: "5x120" },
          { id: "range-rover-sport-l494", label: "Range Rover Sport L494 (2013–2022)", yearStart: 2013, yearEnd: 2022, boltPattern: "5x120" },
          { id: "range-rover-sport-l461", label: "Range Rover Sport L461 (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x120" },
        ],
      },
      {
        model: "Range Rover Evoque",
        generations: [
          { id: "evoque-l538", label: "Evoque L538 (2011–2018)", yearStart: 2011, yearEnd: 2018, boltPattern: "5x108" },
          { id: "evoque-l551", label: "Evoque L551 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      {
        model: "Defender",
        generations: [{ id: "defender-l663", label: "Defender L663 (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x120" }],
      },
      {
        model: "Discovery",
        generations: [
          { id: "discovery-4-l319", label: "Discovery 4 L319 (2009–2016)", yearStart: 2009, yearEnd: 2016, boltPattern: "5x120" },
          { id: "discovery-5-l462", label: "Discovery 5 L462 (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x120" },
        ],
      },
    ],
  },
  {
    brand: "Jaguar",
    models: [
      { model: "F-Type", generations: [{ id: "f-type-x152", label: "F-Type X152 (2013–2024)", yearStart: 2013, yearEnd: 2024, boltPattern: "5x108" }] },
      { model: "XE", generations: [{ id: "xe-x760", label: "XE X760 (2015–2023)", yearStart: 2015, yearEnd: 2023, boltPattern: "5x108" }] },
      {
        model: "XF",
        generations: [
          { id: "xf-x250", label: "XF X250 (2008–2015)", yearStart: 2008, yearEnd: 2015, boltPattern: "5x108" },
          { id: "xf-x260", label: "XF X260 (2015–2023)", yearStart: 2015, yearEnd: 2023, boltPattern: "5x108" },
        ],
      },
      { model: "F-Pace", generations: [{ id: "f-pace-x761", label: "F-Pace X761 (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "5x108" }] },
    ],
  },
  {
    brand: "Ford",
    models: [
      {
        model: "Fiesta",
        generations: [
          { id: "fiesta-mk6", label: "Fiesta Mk6 (2002–2008)", yearStart: 2002, yearEnd: 2008, boltPattern: "4x108" },
          { id: "fiesta-mk7", label: "Fiesta Mk7 (2008–2017)", yearStart: 2008, yearEnd: 2017, boltPattern: "4x108" },
          { id: "fiesta-mk8", label: "Fiesta Mk8 (2017–2023)", yearStart: 2017, yearEnd: 2023, boltPattern: "4x108" },
        ],
      },
      {
        model: "Focus",
        generations: [
          { id: "focus-mk1", label: "Focus Mk1 (1998–2004)", yearStart: 1998, yearEnd: 2004, boltPattern: "4x108" },
          { id: "focus-mk2", label: "Focus Mk2 (2004–2011)", yearStart: 2004, yearEnd: 2011, boltPattern: "5x108" },
          { id: "focus-mk3", label: "Focus Mk3 (2011–2018)", yearStart: 2011, yearEnd: 2018, boltPattern: "5x108" },
          { id: "focus-mk4", label: "Focus Mk4 (2018–2025)", yearStart: 2018, yearEnd: 2025, boltPattern: "5x108" },
        ],
      },
      {
        model: "Mustang",
        generations: [
          { id: "mustang-s550-eu", label: "Mustang S550 (2015–2023)", yearStart: 2015, yearEnd: 2023, boltPattern: "5x114.3" },
          { id: "mustang-s650-eu", label: "Mustang S650 (2023–présent)", yearStart: 2023, yearEnd: null, boltPattern: "5x114.3" },
        ],
      },
      { model: "Puma", generations: [{ id: "puma-mk2", label: "Puma (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x108" }] },
      {
        model: "Kuga",
        generations: [
          { id: "kuga-mk2", label: "Kuga Mk2 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "5x108" },
          { id: "kuga-mk3", label: "Kuga Mk3 (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "5x108" },
        ],
      },
    ],
  },
  {
    brand: "Jeep",
    models: [
      { model: "Renegade", generations: [{ id: "renegade-bu", label: "Renegade BU (2014–2025)", yearStart: 2014, yearEnd: 2025, boltPattern: "5x110" }] },
      { model: "Compass", generations: [{ id: "compass-mp", label: "Compass MP (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x110" }] },
      {
        model: "Grand Cherokee",
        generations: [
          { id: "grand-cherokee-wk2", label: "Grand Cherokee WK2 (2011–2021)", yearStart: 2011, yearEnd: 2021, boltPattern: "5x127" },
          { id: "grand-cherokee-wl", label: "Grand Cherokee WL (2022–présent)", yearStart: 2022, yearEnd: null, boltPattern: "5x127" },
        ],
      },
      {
        model: "Wrangler",
        generations: [
          { id: "wrangler-jk", label: "Wrangler JK (2007–2018)", yearStart: 2007, yearEnd: 2018, boltPattern: "5x127" },
          { id: "wrangler-jl", label: "Wrangler JL (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x127" },
        ],
      },
    ],
  },
  {
    brand: "Volvo",
    models: [
      { model: "V40", generations: [{ id: "v40-2012", label: "V40 (2012–2019)", yearStart: 2012, yearEnd: 2019, boltPattern: "5x108" }] },
      {
        model: "S60 / V60",
        generations: [
          { id: "s60-p3", label: "S60/V60 Gen1 (2010–2018)", yearStart: 2010, yearEnd: 2018, boltPattern: "5x108" },
          { id: "s60-spa", label: "S60/V60 Gen2 (2018–présent)", yearStart: 2018, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      { model: "XC40", generations: [{ id: "xc40", label: "XC40 (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x108" }] },
      {
        model: "XC60",
        generations: [
          { id: "xc60-p3", label: "XC60 Gen1 (2008–2017)", yearStart: 2008, yearEnd: 2017, boltPattern: "5x108" },
          { id: "xc60-spa", label: "XC60 Gen2 (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      {
        model: "XC90",
        generations: [
          { id: "xc90-p2", label: "XC90 Gen1 (2002–2014)", yearStart: 2002, yearEnd: 2014, boltPattern: "5x108" },
          { id: "xc90-spa", label: "XC90 Gen2 (2014–présent)", yearStart: 2014, yearEnd: null, boltPattern: "5x108" },
        ],
      },
    ],
  },
  {
    brand: "SEAT",
    models: [
      {
        model: "Ibiza",
        generations: [
          { id: "ibiza-6j", label: "Ibiza 6J (2008–2017)", yearStart: 2008, yearEnd: 2017, boltPattern: "5x100" },
          { id: "ibiza-kj", label: "Ibiza KJ (2017–présent)", yearStart: 2017, yearEnd: null, boltPattern: "5x100" },
        ],
      },
      {
        model: "Leon",
        generations: [
          { id: "leon-1p", label: "Leon 1P (2005–2012)", yearStart: 2005, yearEnd: 2012, boltPattern: "5x112" },
          { id: "leon-5f", label: "Leon 5F (2012–2020)", yearStart: 2012, yearEnd: 2020, boltPattern: "5x112" },
          { id: "leon-kl", label: "Leon KL / Cupra Leon (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x112" },
        ],
      },
      { model: "Ateca", generations: [{ id: "ateca-kh7", label: "Ateca KH7 (2016–présent)", yearStart: 2016, yearEnd: null, boltPattern: "5x112" }] },
    ],
  },
  {
    brand: "Škoda",
    models: [
      {
        model: "Fabia",
        generations: [
          { id: "fabia-5j", label: "Fabia Mk2 (2007–2014)", yearStart: 2007, yearEnd: 2014, boltPattern: "5x100" },
          { id: "fabia-nj", label: "Fabia Mk3 (2014–2021)", yearStart: 2014, yearEnd: 2021, boltPattern: "5x100" },
          { id: "fabia-pj", label: "Fabia Mk4 (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x100" },
        ],
      },
      {
        model: "Octavia",
        generations: [
          { id: "octavia-1z", label: "Octavia Mk2 (2004–2013)", yearStart: 2004, yearEnd: 2013, boltPattern: "5x112" },
          { id: "octavia-5e", label: "Octavia Mk3, incl. RS (2013–2020)", yearStart: 2013, yearEnd: 2020, boltPattern: "5x112" },
          { id: "octavia-nx", label: "Octavia Mk4, incl. RS (2020–présent)", yearStart: 2020, yearEnd: null, boltPattern: "5x112" },
        ],
      },
    ],
  },
  {
    brand: "Opel",
    models: [
      {
        model: "Corsa",
        generations: [
          { id: "corsa-d", label: "Corsa D (2006–2014)", yearStart: 2006, yearEnd: 2014, boltPattern: "4x100" },
          { id: "corsa-e", label: "Corsa E (2014–2019)", yearStart: 2014, yearEnd: 2019, boltPattern: "4x100" },
          { id: "corsa-f", label: "Corsa F (2019–présent)", yearStart: 2019, yearEnd: null, boltPattern: "4x108" },
        ],
      },
      {
        model: "Astra",
        generations: [
          { id: "astra-h", label: "Astra H (2004–2010)", yearStart: 2004, yearEnd: 2010, boltPattern: "5x110" },
          { id: "astra-j", label: "Astra J, incl. OPC (2009–2015)", yearStart: 2009, yearEnd: 2015, boltPattern: "5x105" },
          { id: "astra-k", label: "Astra K, incl. OPC (2015–2021)", yearStart: 2015, yearEnd: 2021, boltPattern: "5x105" },
          { id: "astra-l", label: "Astra L (2021–présent)", yearStart: 2021, yearEnd: null, boltPattern: "5x108" },
        ],
      },
      {
        model: "Insignia",
        generations: [
          { id: "insignia-a", label: "Insignia A (2008–2017)", yearStart: 2008, yearEnd: 2017, boltPattern: "5x120" },
          { id: "insignia-b", label: "Insignia B (2017–2022)", yearStart: 2017, yearEnd: 2022, boltPattern: "5x115" },
        ],
      },
    ],
  },
];
