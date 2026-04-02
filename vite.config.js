import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // automatically update service worker
      manifest: {
        name: "Return calculator",
        short_name: "Return calc",
        description: "Calculate your investment returns",
        theme_color: "#1E3A8A", // Tailwind blue-800
        background_color: "#ffffff",
        display: "standalone",
        start_url: "./",
        icons: [
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(js|css|png|svg|jpg|jpeg|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\/api\/.*$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-responses",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: "./",
  server: {
    port: 3000,
    open: true,
  },
});
