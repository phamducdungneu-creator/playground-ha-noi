/**
 * One place for everything search engines see about the site.
 *
 * The domain comes from `site` in astro.config.mjs; the path from BASE_PATH.
 */
export const SITE_ORIGIN = import.meta.env.SITE;

export const SITE_NAME = "Playground Hà Nội";
export const SITE_DESCRIPTION =
  "Bản đồ sân chơi, công viên cho trẻ em ở Hà Nội, cẩm nang cơ – xương – khớp cho cha mẹ và bảng theo dõi thời gian vận động ngoài trời của bé.";

/**
 * Google Search Console → Thêm sản phẩm → Tiền tố URL → Thẻ HTML:
 * copy only the `content="..."` value here, e.g. "AbC123...". Empty = no tag.
 */
export const GOOGLE_SITE_VERIFICATION = "";

/** Absolute URL for a site path like "bai-viet/ban-chan-bet" (no leading slash). */
export function absUrl(path = ""): string {
  return new URL(`${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`, SITE_ORIGIN).href;
}
