// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// Static output: the whole site builds into dist/, which Capacitor will later
// use as its webDir when we package the Android / iOS apps.
// BASE_PATH stays configurable for a sub-path host; the live site is at the domain root.
// site: the domain only, used for canonical URLs and the sitemap.
export default defineConfig({
  site: "https://playground.com.vn",
  output: "static",
  base: process.env.BASE_PATH || "/",
  build: { format: "preserve" }, // x.astro → x.html, x/index.astro → x/index.html
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
