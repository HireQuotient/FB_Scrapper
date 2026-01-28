import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import scrapeRouter from "./routes/scrape";
import jobsRouter from "./routes/jobs";
import postsRouter from "./routes/posts";

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration - allow all origins
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: false,
}));

// Handle preflight requests explicitly
app.options("*", cors());

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
