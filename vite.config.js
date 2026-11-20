import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { SEO_PAGES } from "./src/utils/appRoutes.ts";

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

const escapeHtml = (v) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Public SEO pages (see SEO_PAGES in src/utils/appRoutes.ts). For each one, emit
 * `<path>.html` = the SPA shell with that page's title / description / canonical /
 * social tags and crawlable no-JS content. Cloudflare Pages serves `/x.html` at `/x`,
 * so no _redirects rule is needed (a rewrite to / would serve the home page's head).
 */
function seoPages() {
    return {
        name: "seo-pages",
        apply: "build",
        writeBundle(options) {
            const dir = options.dir;
            if (!dir) return;
            const shell = readFileSync(join(dir, "index.html"), "utf8");
            for (const page of SEO_PAGES) {
                const url = "https://lardermind.com" + page.path;
                const title = escapeHtml(page.title);
                const description = escapeHtml(page.description);
                const meta = (attr, name) =>
                    new RegExp("(<meta " + attr + '="' + name + '" content=")[^"]*(")');
                const html = shell
                    .replace(/<title>[^<]*<\/title>/, () => "<title>" + title + "</title>")
                    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, a, b) => a + url + b)
                    .replace(meta("name", "description"), (_m, a, b) => a + description + b)
                    .replace(meta("property", "og:url"), (_m, a, b) => a + url + b)
                    .replace(meta("property", "og:title"), (_m, a, b) => a + title + b)
                    .replace(meta("property", "og:description"), (_m, a, b) => a + description + b)
                    .replace(meta("name", "twitter:title"), (_m, a, b) => a + title + b)
                    .replace(meta("name", "twitter:description"), (_m, a, b) => a + description + b)
                    .replace(
                        /<noscript>[\s\S]*?<\/noscript>/,
                        () =>
                            "<noscript><h1>" + escapeHtml(page.h1) + "</h1><p>" + escapeHtml(page.body) + "</p></noscript>",
                    );
                writeFileSync(join(dir, page.path.slice(1) + ".html"), html);
            }
        },
    };
}

export default defineConfig({
    plugins: [react(), spaNotFoundPage(), seoPages()],
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
