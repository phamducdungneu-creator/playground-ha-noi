// Turn scripts/.cache/osm-raw.json into src/data/osm-places.json for the website.
//  - drops private places
//  - looks up phường/xã + quận/huyện for every place (Overpass is_in, cached)
//  - maps OSM surface / playground equipment tags to the app's surface & facility ids
//  - names unnamed places from their kind + ward
//
// Data © OpenStreetMap contributors, ODbL.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const CACHE = new URL("./.cache/", import.meta.url);
const OUT = new URL("../src/data/osm-places.json", import.meta.url);
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const raw = JSON.parse(await readFile(new URL("osm-raw.json", CACHE), "utf8")).elements;

// ---------- 1. places ----------
const KIND = {
  playground: { label: "Sân chơi trẻ em", icon: "🛝", unnamed: "Sân chơi khu dân cư" },
  park: { label: "Công viên", icon: "🌳", unnamed: "Công viên" },
  garden: { label: "Vườn hoa", icon: "🌷", unnamed: "Vườn hoa" },
  recreation_ground: { label: "Khu vui chơi", icon: "⚽", unnamed: "Khu vui chơi" },
  common: { label: "Bãi đất chung", icon: "🌾", unnamed: "Bãi đất chung" },
};
const HIDDEN_ACCESS = new Set(["private", "no"]);

const places = raw
  .filter((e) => e.tags && !e.tags.playground && (KIND[e.tags.leisure] || KIND[e.tags.landuse]))
  .filter((e) => !HIDDEN_ACCESS.has(e.tags.access))
  .map((e) => ({
    osm: `${e.type}/${e.id}`,
    lat: e.lat ?? e.center?.lat,
    lng: e.lon ?? e.center?.lon,
    tags: e.tags,
    kind: KIND[e.tags.leisure] ? e.tags.leisure : e.tags.landuse,
  }))
  .filter((p) => p.lat && p.lng);

// ---------- 2. administrative areas (cached) ----------
const adminFile = new URL("admin.json", CACHE);
const admin = existsSync(adminFile) ? JSON.parse(await readFile(adminFile, "utf8")) : {};

async function overpass(query) {
  for (let round = 0; round < 5; round++) {
    if (round) await sleep(10000 * 2 ** (round - 1));
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PlaygroundHaNoi/0.1" },
          body: "data=" + encodeURIComponent(query),
        });
        if (res.ok) return (await res.json()).elements;
        console.warn(url, res.status);
      } catch (e) {
        console.warn(url, e.message);
      }
    }
  }
  throw new Error("Overpass unavailable");
}

const todo = places.filter((p) => !admin[p.osm]);
for (let i = 0; i < todo.length; i += 250) {
  const batch = todo.slice(i, i + 250);
  // a "make" marker before each lookup lets us pair the returned areas with the place
  const q =
    "[out:json][timeout:180];\n" +
    batch
      .map(
        (p) =>
          `make m osm="${p.osm}"; out;\nis_in(${p.lat},${p.lng})->.a; area.a["boundary"="administrative"]["admin_level"~"^(6|7|8)$"]; out tags;`,
      )
      .join("\n");
  const els = await overpass(q);
  let cur = null;
  for (const el of els) {
    if (el.type === "m") {
      cur = el.tags.osm;
      admin[cur] = {};
    } else if (cur && el.tags) {
      admin[cur][el.tags.admin_level] = el.tags.name;
    }
  }
  await writeFile(adminFile, JSON.stringify(admin));
  console.log(`admin lookup ${Math.min(i + 250, todo.length)}/${todo.length}`);
}

// ---------- 3. surfaces & equipment ----------
const SURFACE = {
  sand: "bai_cat", grass: "co_tu_nhien", dirt: "dat_go_ghe", ground: "dat_go_ghe", earth: "dat_go_ghe", mud: "dat_go_ghe",
  pebblestone: "soi_cuoi", gravel: "soi_cuoi", fine_gravel: "soi_cuoi",
  concrete: "be_tong", asphalt: "be_tong", paved: "be_tong", paving_stones: "gach_men", sett: "gach_men", tiles: "gach_men",
};
const EQUIPMENT = {
  seesaw: "bap_benh", balancebeam: "cau_thang_bang", climbingframe: "khung_leo_day", climbing_wall: "khung_leo_day",
  structure: "khung_leo_day", rope_traverse: "cau_day_lac_lu", net: "cau_day_lac_lu", rope_bridge: "cau_day_lac_lu",
  tyre: "lop_xe", basketswing: "xich_du_lop", horizontal_bar: "xa_don", monkey_bars: "xa_don",
};
const EQUIPMENT_LABEL = {
  slide: "🛝 Cầu trượt", swing: "Xích đu", seesaw: "Bập bênh", sandpit: "🏖️ Hố cát", climbingframe: "🧗 Khung leo",
  structure: "🧗 Nhà leo liên hoàn", playhouse: "🏠 Nhà chơi", springy: "Thú nhún", roundabout: "Mâm xoay",
};
const equipment = raw.filter((e) => e.type === "node" && e.tags?.playground);
const distM = (a, b) => {
  const k = 111320;
  return Math.hypot((a.lat - b.lat) * k, (a.lng - b.lng) * k * Math.cos((a.lat * Math.PI) / 180));
};

// ---------- 4. exercises by kind (age groups 1-3 / 4-6 / 7-10) ----------
const EXERCISES = {
  playground: [
    ["1-3", "Leo lên, trượt xuống cầu trượt 3 lần"],
    ["4-6", "Đu xích đu tự lấy đà 10 lần"],
    ["7-10", "Leo hết khung leo không chạm đất"],
  ],
  park: [
    ["1-3", "Đi chân trần 20 bước trên cỏ"],
    ["4-6", "Chạy zic-zac qua 5 gốc cây"],
    ["7-10", "Chạy 200 mét không nghỉ"],
  ],
  garden: [
    ["1-3", "Nhặt 5 chiếc lá khác màu"],
    ["4-6", "Bò như gấu 10 mét trên cỏ"],
    ["7-10", "Giữ thăng bằng 1 chân 30 giây"],
  ],
  recreation_ground: [
    ["1-3", "Đuổi bóng 2 vòng sân"],
    ["4-6", "Nhảy chụm chân qua 5 vạch"],
    ["7-10", "Chạy nước rút 3 lần 20 mét"],
  ],
};
EXERCISES.common = EXERCISES.park;

// Since the 2025 two-tier reform OSM puts phường/xã at admin_level 6 (no more quận/huyện);
// older-style data may still have districts at 6 and wards at 8.
const isDistrict = (n) => /^(Quận|Huyện|Thị xã)\s/.test(n ?? "");
const ward = (a) => a?.["8"] ?? a?.["7"] ?? (isDistrict(a?.["6"]) ? undefined : a?.["6"]);
const district = (a) => (isDistrict(a?.["6"]) ? a["6"] : null);
const out = places.map((p) => {
  const t = p.tags;
  const a = admin[p.osm] ?? {};
  const k = KIND[p.kind];
  const surfaces = new Set(SURFACE[t.surface] ? [SURFACE[t.surface]] : []);
  const facilities = new Set();
  const gear = new Set();
  for (const n of equipment) {
    if (p.kind !== "playground" || distM(p, { lat: n.lat, lng: n.lon }) > 60) continue;
    if (n.tags.playground === "sandpit") surfaces.add("bai_cat");
    if (EQUIPMENT[n.tags.playground]) facilities.add(EQUIPMENT[n.tags.playground]);
    if (EQUIPMENT_LABEL[n.tags.playground]) gear.add(EQUIPMENT_LABEL[n.tags.playground]);
  }
  const area = [ward(a), district(a)].filter(Boolean);
  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const name = t.name || t["name:vi"] || `${k.unnamed}${ward(a) ? " · " + ward(a) : ""}`;
  const fee = t.fee && t.fee !== "no" ? true : t.fee === "no" ? false : null;
  const id = `osm-${p.osm.replace("/", "-")}`;
  return {
    id,
    name,
    address: [street, ...area].filter(Boolean).join(", ") || "Hà Nội",
    lat: +p.lat.toFixed(6),
    lng: +p.lng.toFixed(6),
    free: fee === null ? null : !fee,
    kind: p.kind,
    ward: ward(a) ?? null,
    district: district(a),
    named: !!t.name,
    source: "osm",
    osm: p.osm,
    surfaces: [...surfaces],
    facilities: [...facilities],
    tags: [{ icon: k.icon, label: k.label }, ...[...gear].map((g) => ({ icon: "", label: g }))],
    exercises: EXERCISES[p.kind].map(([group, text], i) => ({ id: `${id}-${i}`, group, text })),
  };
});

await writeFile(OUT, JSON.stringify(out));
const by = (f) => Object.entries(out.reduce((m, p) => ((m[f(p) ?? "?"] = (m[f(p) ?? "?"] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
console.log("places written:", out.length, "→", OUT.pathname);
console.log("by kind:", by((p) => p.kind));
console.log("with ward:", out.filter((p) => p.ward).length, " with district:", out.filter((p) => p.district).length);
const wards = by((p) => p.ward);
console.log("distinct wards:", wards.length, " top 15:", wards.slice(0, 15));
console.log("named:", out.filter((p) => p.named).length, " with surface/equipment data:", out.filter((p) => p.surfaces.length || p.facilities.length).length);
