// robots.txt — note: crawlers only read it at the domain root, so on GitHub Pages
// (site under /playground-ha-noi/) it takes effect only after moving to an own domain.
// Until then, pages opt out with <meta name="robots" content="noindex">.
import type { APIRoute } from "astro";
import { absUrl } from "../config/site";

export const GET: APIRoute = () => {
  const base = import.meta.env.BASE_URL;
  const body = `User-agent: *
Allow: ${base}
Disallow: ${base}admin
Disallow: ${base}dang-nhap

Sitemap: ${absUrl("sitemap.xml")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
