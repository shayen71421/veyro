export type MetroDataSource = {
  title: string;
  sourceType: "official" | "secondary";
  sourceUrl: string;
  accessedAt: string;
  informationUsed: string;
};

export const kochiMetroDataSources: MetroDataSource[] = [
  {
    title: "KMRL Open Data – GTFS static feed",
    sourceType: "official",
    sourceUrl: "https://kochimetro.org/open-data/",
    accessedAt: "2026-07-17",
    informationUsed: "Operational stops, official names, coordinates, order, and published shape distances.",
  },
  {
    title: "KMRL Metro Stations",
    sourceType: "official",
    sourceUrl: "https://kochimetro.org/metro-stations/",
    accessedAt: "2026-07-17",
    informationUsed: "Cross-check of operational station order and common station names.",
  },
  {
    title: "KMRL Updated Detailed Project Report (August 2011)",
    sourceType: "official",
    sourceUrl: "https://kochimetro.org/wp-content/uploads/dpr.pdf",
    accessedAt: "2026-07-17",
    informationUsed: "Cross-check of original corridor chainages and inter-station distances.",
  },
  {
    title: "List of Kochi Metro stations",
    sourceType: "secondary",
    sourceUrl: "https://en.wikipedia.org/wiki/List_of_Kochi_Metro_stations",
    accessedAt: "2026-07-17",
    informationUsed: "Secondary cross-check that the current line has 25 operational stations.",
  },
];
