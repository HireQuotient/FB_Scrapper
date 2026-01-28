import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db";
import scrapeRouter from "./routes/scrape";
import jobsRouter from "./routes/jobs";
import postsRouter from "./routes/posts";

const app = express();
const PORT = process.env.PORT || 5001;

// CORS is handled by nginx - no Express CORS middleware needed

app.use(express.json());

app.use("/api/scrape", scrapeRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/posts", postsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
});
