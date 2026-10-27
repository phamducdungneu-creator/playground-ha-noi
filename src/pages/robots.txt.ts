// robots.txt — crawlers only read it at the domain root (fine on playground.com.vn).
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
