import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import mkcert from "vite-plugin-mkcert";
import { parseBuyerAppBaseUrl } from "./src/lib/buyerAppBaseUrl";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Every buyer payment link is built from this origin, so a bundle without a valid one must never be produced.
  if (mode !== "test") {
    parseBuyerAppBaseUrl(loadEnv(mode, process.cwd(), "VITE_").VITE_BUYER_APP_BASE_URL);
  }

  return {
    plugins: [react(), mkcert()],
    optimizeDeps: {
      include: [
        "@fullcalendar/core",
        "@fullcalendar/daygrid",
        "@fullcalendar/interaction",
        "@fullcalendar/react",
        "@fullcalendar/timegrid",
        "react-device-frameset",
        "react-is",
      ],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "happy-dom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
      env: {
        VITE_BUYER_APP_BASE_URL: "https://pay.example.test",
      },
      environmentOptions: {
        // A real browser never loads sub-resources out of a DOMParser document; happy-dom will try,
        // so hostile markup under test must not be able to reach the network.
        happyDOM: {
          settings: {
            disableIframePageLoading: true,
            disableJavaScriptFileLoading: true,
            disableCSSFileLoading: true,
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      host: "localhost",
      https: {
        key: fs.readFileSync("./ssl/key.pem"),
        cert: fs.readFileSync("./ssl/cert.pem"),
      },
    },
  };
});
