import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "DevFest Lagos Connect",
        short_name: "Connect",
        description: "Meet the people around you at DevFest Lagos.",
        theme_color: "#171717",
        background_color: "#FFF5D4",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/photos\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/photos/"),
            handler: "CacheFirst",
            options: { cacheName: "photos", expiration: { maxEntries: 300, maxAgeSeconds: 7 * 86400 } },
          },
          {
            urlPattern: ({ url }) => /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fonts" },
          },
        ],
      },
    }),
  ],
});
