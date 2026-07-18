import { z } from "zod";
import { exploreSeed } from "../data/explore-seed.ts";
import { exploreSeedSources } from "../data/explore-seed-sources.ts";
import { kochiMetroStations } from "../data/kochi-metro-stations.ts";

const categories = ["food","park","culture","shopping","quick_activity","quiet_spot","photo_spot","museum","recreation","student_friendly","useful_service"];
const sourceTypes = ["official_venue","government","official_tourism","official_transport","reliable_secondary","maps"];
const seedSchema = z.object({
  id:z.string().regex(/^[a-z0-9-]+$/).max(120), title:z.string().min(3).max(70),
  description:z.string().min(30).max(500), stationId:z.string(), stationName:z.string(),
  category:z.enum(categories), walkingMinutes:z.number().int().min(1).max(25),
  walkingTimeType:z.enum(["verified","estimated"]), costType:z.enum(["free","paid","varies","unknown"]),
  bestTimes:z.array(z.enum(["morning","afternoon","evening","night","weekday","weekend"])).max(6),
  environment:z.enum(["indoor","outdoor","mixed","unknown"]),
  latitude:z.number().min(9.85).max(10.2), longitude:z.number().min(76.2).max(76.45),
  accessibilityNote:z.string().max(200).nullable(), verifiedAt:z.string().date(),
  seedVersion:z.number().int().min(1),
}).strict();
const sourceSchema = z.object({
  findId:z.string(), sources:z.array(z.object({
    title:z.string().min(3), url:z.string().url().refine((url) => !url.includes("example.com")),
    sourceType:z.enum(sourceTypes), informationUsed:z.string().min(5), accessedAt:z.string().date(),
  }).strict()).min(2), locationVerified:z.literal(true), stationProximityVerified:z.literal(true),
  walkingTimeVerified:z.boolean(), notes:z.string().min(5),
}).strict();

export function validateExploreSeed() {
  const records = exploreSeed.map((item) => seedSchema.parse(item));
  const sources = exploreSeedSources.map((item) => sourceSchema.parse(item));
  const stationMap = new Map(kochiMetroStations.filter((item) => item.operational).map((item) => [item.id, item]));
  const unique = (values, label) => {
    if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label} found.`);
  };
  unique(records.map((item) => item.id), "Find ID");
  unique(records.map((item) => item.title.toLowerCase()), "title");
  unique(records.map((item) => `${item.latitude.toFixed(6)},${item.longitude.toFixed(6)}`), "coordinates");
  unique(sources.map((item) => item.findId), "source record");
  const sourceIds = new Set(sources.map((item) => item.findId));
  for (const record of records) {
    const station = stationMap.get(record.stationId);
    if (!station || station.name !== record.stationName) throw new Error(`Invalid station for ${record.id}.`);
    if (!sourceIds.has(record.id)) throw new Error(`Missing source record for ${record.id}.`);
    if (/placeholder|todo|example place/i.test(`${record.title} ${record.description}`)) throw new Error(`Placeholder text in ${record.id}.`);
  }
  if (sources.some((item) => !records.some((record) => record.id === item.findId))) throw new Error("Orphan source record found.");
  return { records, sources, stations: new Set(records.map((item) => item.stationId)).size, categories: new Set(records.map((item) => item.category)).size };
}
