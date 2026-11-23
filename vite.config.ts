import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type Plugin } from "vite";

const DATA_REPO = path.resolve(__dirname, "../spoonscarpets-data");

function localCarpetAssetsPlugin(): Plugin {
  return {
    name: "local-carpet-assets",
    configureServer(server) {
      server.middlewares.use("/assets", (req, res, next) => {
        const cleanUrl = (req.url || "/").split("?")[0];
        let filePath: string | null = null;
        let contentType = "application/octet-stream";

        if (cleanUrl === "/carpets.json") {
          filePath = path.join(DATA_REPO, "data", "carpets.json");
          contentType = "application/json; charset=utf-8";
        } else if (cleanUrl.startsWith("/patterns/") && cleanUrl.endsWith(".svg")) {
          filePath = path.join(DATA_REPO, "patterns", path.basename(cleanUrl));
          contentType = "image/svg+xml; charset=utf-8";
        } else if (cleanUrl.startsWith("/floors/") && cleanUrl.endsWith(".svg")) {
          filePath = path.join(DATA_REPO, "floors", path.basename(cleanUrl));
          contentType = "image/svg+xml; charset=utf-8";
        } else if (cleanUrl.startsWith("/thumbs/") && cleanUrl.endsWith(".webp")) {
          filePath = path.join(DATA_REPO, "dist", "thumbs", path.basename(cleanUrl));
          contentType = "image/webp";
        }

        if (filePath && fs.existsSync(filePath)) {
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "no-cache");
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localCarpetAssetsPlugin()],
});
