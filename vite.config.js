import { defineConfig } from "vite";

export default defineConfig({
  plugins: [{
    name: "http-preview-csp",
    apply: "serve",
    // Production keeps HTTPS upgrades; the supervised preview is HTTP-only.
    transformIndexHtml(html) { return html.replace("; upgrade-insecure-requests", ""); }
  }],
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
});
