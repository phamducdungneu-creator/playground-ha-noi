// Download playgrounds, parks and gardens inside Hà Nội from OpenStreetMap (Overpass API).
// Output: scripts/.cache/osm-raw.json  (run scripts/build-places.mjs afterwards)
//
// Data © OpenStreetMap contributors, ODbL — attribution is shown on the map.
import { mkdir, writeFile } from "node:fs/promises";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const ROUNDS = 4; // public servers are often busy: retry every endpoint with exponential backoff
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERY = `
[out:json][timeout:180];
area["ISO3166-2"="VN-HN"]->.hn;
(
  nwr["leisure"="playground"](area.hn);
  nwr["leisure"="park"](area.hn);
  nwr["leisure"="garden"]["access"!="private"](area.hn);
  nwr["landuse"="recreation_ground"](area.hn);
  nwr["leisure"="common"](area.hn);
)->.places;
.places out center tags;
// individual play equipment, joined to the nearest playground later
node["playground"](area.hn);
out body;
`;

async function run() {
  let lastErr;
  for (let round = 0; round < ROUNDS; round++) {
   if (round) {
     console.log(`all servers busy, waiting ${15 * 2 ** (round - 1)}s…`);
     await sleep(15000 * 2 ** (round - 1));
   }
   for (const url of ENDPOINTS) {
    try {
      console.log("querying", url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PlaygroundHaNoi/0.1 (playground finder)" },
        body: "data=" + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
      const json = await res.json();
      await mkdir(new URL("./.cache/", import.meta.url), { recursive: true });
      await writeFile(new URL("./.cache/osm-raw.json", import.meta.url), JSON.stringify(json));
      console.log("elements:", json.elements.length);
      return;
    } catch (e) {
      lastErr = e;
      console.warn("failed:", e.message.split("\n")[0]);
    }
   }
  }
  throw lastErr;
}
await run();
