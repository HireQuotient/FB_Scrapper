import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import scrapeRouter from "./routes/scrape";
import jobsRouter from "./routes/jobs";
import postsRouter from "./routes/posts";
import searchRouter from "./routes/search";
import selectedGroupRouter from "./routes/selectedGroup";
import extractMembersRouter from "./routes/extractMembers";
import membersRouter from "./routes/members";
import groupsRouter from "./routes/groups";

const app = express();
const PORT = process.env.PORT || 5001;

// Explicitly load .env from project root to ensure variables are available
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Diagnostic: log whether env vars are present and where .env is expected
try {
  const envPath = path.resolve(process.cwd(), ".env");
  const exists = fs.existsSync(envPath);
  console.log("ENV .env path:", envPath, "exists:", exists);
} catch (e) {
  // ignore
}
console.log("GOOGLE_API_KEY present:", !!process.env.GOOGLE_API_KEY, "GOOGLE_CX present:", !!process.env.GOOGLE_CX, "cwd:", process.cwd());

// For local development enable CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  })
);

app.use(express.json());

app.use("/api/scrape", scrapeRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/search", searchRouter);
app.use("/api/selected-group", selectedGroupRouter);
app.use("/api/extract-members", extractMembersRouter);
app.use("/api/members", membersRouter);
app.use("/api/groups", groupsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
});
