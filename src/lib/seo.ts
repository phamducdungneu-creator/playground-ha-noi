// schema.org JSON-LD builders shared by the public pages (Layout adds "@context").
import { SITE_NAME, absUrl } from "../config/site";

export const publisherLd = { "@type": "Organization", name: SITE_NAME, url: absUrl() };

/** crumbs as in <PageHeader>, plus the current page */
export function breadcrumbLd(crumbs: { name: string; href: string }[], current: { name: string; href: string }) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [...crumbs, current].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absUrl(c.href) })),
  };
}
