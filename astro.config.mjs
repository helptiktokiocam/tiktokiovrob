import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { autolinkConfig } from "./plugins/rehype-autolink-config";
import rehypeSlug from "rehype-slug";
import alpinejs from "@astrojs/alpinejs";
import solidJs from "@astrojs/solid-js";
import AstroPWA from "@vite-pwa/astro";
import icon from "astro-icon";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static", 
  site: "https://tiktokio.cam",
  adapter: vercel(),
  // Add Astro's built-in i18n configuration
  i18n: {
    defaultLocale: "en",
    locales: ["en", "it", "ar", "fr", "de", "es", "hi", "id", "ru", "pt", "ko", "tl", "nl", "ms", "tr"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __DATE__: `'${new Date().toISOString()}'`, // Fixed the typo
    },
    // Minimal configuration - just exclude the problematic library from client build
    ssr: {
      external: ["@tobyg74/tiktok-api-dl"],
    },
    optimizeDeps: {
      exclude: ["@tobyg74/tiktok-api-dl"],
    },
  },
  integrations: [
    sitemap({
      filter(page) {
        const url = new URL(page, 'https://tiktokio.cam');
        const nonEnglishLangs = ['ar', 'it', 'de', 'es', 'fr', 'hi', 'id', 'ko', 'ms', 'nl', 'pt', 'ru', 'tl', 'tr'];
        const shouldExclude =
          nonEnglishLangs.some(lang =>
            url.pathname.startsWith(`/${lang}/blog/`) &&
            url.pathname !== `/${lang}/blog/`
          ) ||
          /\/blog\/\d+\//.test(url.pathname) ||
          url.pathname.includes('/tag/') ||
          url.pathname.includes('/category/');
        return !shouldExclude;
      },
    }),
    alpinejs(),
    solidJs(),
    AstroPWA({
      mode: "production",
      base: "/",
      scope: "/",
      includeAssets: ["favicon.svg"],
      registerType: "autoUpdate",
      manifest: {
        name: "Tiktokio - TikTok Downloader - Download TikTok Videos Without Watermark",
        short_name: "Astros",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.webp",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.webp",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.webp",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/404",
        globPatterns: ["*.js"],
      },
      devOptions: {
        enabled: false,
        navigateFallbackAllowlist: [/^\/404$/],
        suppressWarnings: true,
      },
    }),
    icon(),
  ],
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, autolinkConfig],
    ],
  },
  security: {
    csp: {
      directives: {
        "script-src": [
          "'self'", 
          "https://pagead2.googlesyndication.com",
          "https://partner.googleadservices.com",
          "https://tpc.googlesyndication.com",
          "https://googleads.g.doubleclick.net"
        ],
        "connect-src": [
          "'self'", 
          "https://googleads.g.doubleclick.net",
          "https://stats.g.doubleclick.net",
          "https://cm.g.doubleclick.net",
          "https://pagead2.googlesyndication.com"
        ],
        "frame-src": [
          "'self'",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com"
        ],
        "img-src": [
          "'self'", 
          "data:", 
          "https://googleads.g.doubleclick.net",
          "https://pagead2.googlesyndication.com",
          "https://tpc.googlesyndication.com",
          "https://stats.g.doubleclick.net"
        ],
        "style-src": [
          "'self'", 
          "'unsafe-inline'"
        ],
      },
    },
  },
});
