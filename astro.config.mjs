// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// Static output: the whole site builds into dist/, which Capacitor will later
// use as its webDir when we package the Android / iOS apps.
export default defineConfig({
  output: "static",
  build: { format: "file" },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
