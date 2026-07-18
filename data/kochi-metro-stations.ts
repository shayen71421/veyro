/**
 * Verified: 2026-07-17.
 * Distances are official KMRL GTFS shape_dist_traveled values, normalized so Aluva is 0 km.
 * Primary source: KMRL Open Data GTFS static feed (published 2024-08-09).
 * Contains data provided by Kochi Metro Rail Limited.
 */
export type KochiMetroStation = {
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  routeOrder: number;
  latitude: number;
  longitude: number;
  distanceToNextKm: number | null;
  cumulativeDistanceKm: number;
  distanceType: "official" | "coordinate-estimate";
  line: string;
  operational: boolean;
};

const station = (
  id: string, name: string, shortName: string | undefined, aliases: string[], routeOrder: number,
  latitude: number, longitude: number, cumulativeDistanceKm: number, distanceToNextKm: number | null,
): KochiMetroStation => ({ id, name, shortName, aliases, routeOrder, latitude, longitude,
  cumulativeDistanceKm, distanceToNextKm, distanceType: "official", line: "Kochi Metro Line 1", operational: true });

export const kochiMetroStations: KochiMetroStation[] = [
  station("aluva", "Aluva", undefined, ["aluva", "alwaye"], 0, 10.1099, 76.3495, 0, 1.73),
  station("pulinchodu", "Pulinchodu", undefined, ["pulinchodu", "pulin chodu"], 1, 10.0951, 76.3466, 1.73, 0.96),
  station("companypady", "Companypady", "Companypadi", ["companypady", "companypadi", "company pady"], 2, 10.0873, 76.3428, 2.69, 0.99),
  station("ambattukavu", "Ambattukavu", undefined, ["ambattukavu", "ambattu kavu"], 3, 10.0793, 76.3389, 3.68, 0.94),
  station("muttom", "Muttom", undefined, ["muttom", "muttam"], 4, 10.0727, 76.3336, 4.62, 2.05),
  station("kalamassery", "Kalamassery", "Kalamassery Town", ["kalamassery", "kalamassery town", "kalamasery"], 5, 10.0586, 76.322, 6.67, 1.39),
  station("cochin-university", "Cochin University", "CUSAT", ["cochin university", "cusat", "cochin univ", "university"], 6, 10.0467, 76.3182, 8.06, 1.24),
  station("pathadipalam", "Pathadipalam", undefined, ["pathadipalam", "pathadi palam", "pathadippalam"], 7, 10.0361, 76.3144, 9.30, 1.39),
  station("edapally", "Edapally", undefined, ["edapally", "edappally", "edapalli"], 8, 10.0251, 76.3083, 10.69, 1.30),
  station("changampuzha-park", "Changampuzha Park", "Changampuzha Pk", ["changampuzha park", "changampuzha pk", "changampuzha", "changampuzha par"], 9, 10.0152, 76.3023, 11.99, 1.02),
  station("palarivattom", "Palarivattom", undefined, ["palarivattom", "palarivatom"], 10, 10.0064, 76.3048, 13.01, 1.10),
  station("jln-stadium", "JLN Stadium", "JLN", ["jln stadium", "j l n stadium", "jawaharlal nehru stadium", "jln"], 11, 10.0002, 76.2989, 14.11, 1.05),
  station("kaloor", "Kaloor", undefined, ["kaloor", "kalur"], 12, 9.9943, 76.2914, 15.16, 0.47),
  station("town-hall", "Town Hall", undefined, ["town hall", "townhall", "lissie", "lisie"], 13, 9.9913775, 76.2883601, 15.63, 1.20),
  station("mg-road", "MG Road", "M.G Road", ["mg road", "m g road", "m.g. road"], 14, 9.9834, 76.2823, 16.83, 1.18),
  station("maharajas-college", "Maharaja's College", "Maharajas College", ["maharajas college", "maharaja's college", "maharaja college", "maharajas"], 15, 9.9732, 76.2851, 18.01, 0.87),
  station("ernakulam-south", "Ernakulam South", "South", ["ernakulam south", "south", "ernakulam junction"], 16, 9.9686042, 76.2895744, 18.88, 1.16),
  station("kadavanthra", "Kadavanthra", undefined, ["kadavanthra", "kadavanthara"], 17, 9.9665809, 76.2981877, 20.04, 1.17),
  station("elamkulam", "Elamkulam", undefined, ["elamkulam", "elamkulam metro"], 18, 9.9671248, 76.3084899, 21.21, 1.40),
  station("vyttila", "Vyttila", undefined, ["vyttila", "vytilla", "vytila"], 19, 9.9675457, 76.3203664, 22.61, 1.05),
  station("thykoodam", "Thykoodam", "Thaikoodam", ["thykoodam", "thaikoodam", "thykkoodam"], 20, 9.9600311, 76.3236762, 23.66, 1.14),
  station("petta", "Petta", "Pettah", ["petta", "pettah"], 21, 9.9524842, 76.3302101, 24.80, 1.20),
  station("vadakkekotta", "Vadakkekotta", undefined, ["vadakkekotta", "vadakke kotta", "vadakkekota"], 22, 9.952838, 76.3394827, 26.00, 0.73),
  station("sn-junction", "SN Junction", "SN Jn", ["sn junction", "s n junction", "sn jn", "s.n. junction"], 23, 9.9547532, 76.3458505, 26.73, 1.00),
  station("tripunithura-terminal", "Tripunithura Terminal", "Tripunithura", ["tripunithura terminal", "thrippunithura terminal", "tripunithura", "thrippunithura"], 24, 9.95078, 76.35183, 27.73, null),
];

export const stationById = new Map(kochiMetroStations.map((item) => [item.id, item]));
