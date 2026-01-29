import express from "express";
import MemberModel from "../models/Member";

const router = express.Router();

// POST /api/members/query { urls: string[] } -> returns members for those groups
router.post("/query", async (req, res) => {
  const { urls } = req.body as { urls?: unknown[] };
  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "urls must be a non-empty array" });
    return;
  }

  try {
    const members = await MemberModel.find({ groupUrl: { $in: urls } }).sort({ scrapedAt: -1 }).lean().limit(1000);
    res.json({ members });
  } catch (err) {
    console.error("members query error:", err);
    res.status(500).json({ error: "failed to query members" });
  }
});

// GET /api/members/all -> return recent members
router.get("/all", async (_req, res) => {
  try {
    const members = await MemberModel.find().sort({ scrapedAt: -1 }).limit(1000).lean();
    res.json({ members });
  } catch (err) {
    console.error("members all error:", err);
    res.status(500).json({ error: "failed to query members" });
  }
});

export default router;


