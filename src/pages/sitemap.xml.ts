// sitemap.xml — every page we want Google to index. New articles appear here automatically
// once their status is "drafted"; new ward pages once a ward has enough places.
import type { APIRoute } from "astro";
import { absUrl } from "../config/site";
import { clinicalReferenceDatabase } from "../data/clinicalReference";
import { wards } from "../data/placeDirectory";

export const GET: APIRoute = () => {
  const paths = [
    "",
    "bai-viet/",
    ...clinicalReferenceDatabase.filter((a) => a.status === "drafted").map((a) => `bai-viet/${a.slug}`),
    "san-choi/",
    ...wards.filter((w) => w.hasPage).map((w) => `san-choi/${w.slug}`),
    "phan-tich",
    "gioi-thieu",
    "quyen-rieng-tu",
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${absUrl(p)}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
