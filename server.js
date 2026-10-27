import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3e3;
const distPath = path.resolve(__dirname, "dist");
const indexPath = path.join(distPath, "index.html");
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});
app.get("/_health", (_req, res) => {
  res.status(200).send("OK");
});
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: "1h" }));
}
app.get("*", (_req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send("App is building or dist folder not found. Please run npm run build.");
  }
});
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Production Server] Listening on http://0.0.0.0:${PORT}`);
});
process.on("SIGTERM", () => {
  console.log("[Production Server] SIGTERM received, shutting down gracefully...");
  server.close(() => {
    process.exit(0);
  });
});
process.on("SIGINT", () => {
  console.log("[Production Server] SIGINT received, shutting down gracefully...");
  server.close(() => {
    process.exit(0);
  });
});
