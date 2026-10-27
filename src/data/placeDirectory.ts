// Groups places by ward for the public /san-choi pages (one indexable page per ward).
import { slugify } from "../lib/slug";
import { places, type Place } from "./places";

export const KIND_LABEL: Record<string, { label: string; icon: string; schema: string }> = {
  playground: { label: "Sân chơi trẻ em", icon: "🛝", schema: "Playground" },
  park: { label: "Công viên", icon: "🌳", schema: "Park" },
  garden: { label: "Vườn hoa", icon: "🌷", schema: "Park" },
  recreation_ground: { label: "Khu vui chơi", icon: "⚽", schema: "Place" },
  common: { label: "Bãi đất chung", icon: "🌾", schema: "Place" },
};

/** wards with fewer places are listed on /san-choi only — a page with 1–2 rows is too thin to rank */
export const MIN_PLACES_FOR_WARD_PAGE = 3;

export interface Ward {
  name: string;
  slug: string;
  places: Place[];
  hasPage: boolean;
}

const byWard = new Map<string, Place[]>();
for (const p of places) {
  if (p.source !== "osm" || !p.ward) continue;
  byWard.set(p.ward, [...(byWard.get(p.ward) ?? []), p]);
}

// most places first, so the index leads with the biggest areas
export const wards: Ward[] = [...byWard]
  .map(([name, list]) => ({
    name,
    slug: slugify(name),
    // named places first, then playgrounds before parks/gardens
    places: list.sort((a, b) => Number(!!b.named) - Number(!!a.named) || (a.kind === "playground" ? -1 : 0) - (b.kind === "playground" ? -1 : 0)),
    hasPage: list.length >= MIN_PLACES_FOR_WARD_PAGE,
  }))
  .sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name, "vi"));

export const curatedPlaces = places.filter((p) => p.source === "curated");

export const mapsUrl = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

export function kindCounts(list: Place[]) {
  const n: Record<string, number> = {};
  for (const p of list) n[p.kind ?? "park"] = (n[p.kind ?? "park"] ?? 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1]);
}
