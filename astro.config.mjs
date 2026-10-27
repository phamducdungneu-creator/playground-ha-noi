// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// Static output: the whole site builds into dist/, which Capacitor will later
// use as its webDir when we package the Android / iOS apps.
// BASE_PATH is set by the GitHub Pages workflow ("/playground-ha-noi/"); root everywhere else.
// site: the domain only, used for canonical URLs and the sitemap. Change it if the site
// moves to its own domain.
export default defineConfig({
  site: "https://phamducdungneu-creator.github.io",
  output: "static",
  base: process.env.BASE_PATH || "/",
  build: { format: "preserve" }, // x.astro → x.html, x/index.astro → x/index.html
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
