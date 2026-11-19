import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Cloudflare Pages serves `404.html` (with HTTP 404) for paths that match no file and
 * no `_redirects` rule. Ship the SPA shell as 404.html so unknown URLs get a real 404
 * status while still rendering the app's NotFound page.
 */
function spaNotFoundPage() {
    return {
        name: "spa-404-page",
        apply: "build",
        writeBundle(options) {
            const dir = options.dir;
            if (!dir) return;
            copyFileSync(join(dir, "index.html"), join(dir, "404.html"));
        },
    };
}

export default defineConfig({
    plugins: [react(), spaNotFoundPage()],
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
            },
            "/auth": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
            },
        },
    },
    build: {
        emptyOutDir: true,
        outDir: "dist/app",
    },
});
