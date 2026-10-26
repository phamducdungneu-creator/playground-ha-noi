// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// Static output: the whole site builds into dist/, which Capacitor will later
// use as its webDir when we package the Android / iOS apps.
// BASE_PATH is set by the GitHub Pages workflow ("/playground-ha-noi/"); root everywhere else.
export default defineConfig({
  output: "static",
  base: process.env.BASE_PATH || "/",
  build: { format: "file" },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
