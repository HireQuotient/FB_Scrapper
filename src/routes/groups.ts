import express from "express";
import GroupModel from "../models/Group";
import MemberModel from "../models/Member";

const router = express.Router();

// GET /api/groups -> list groups with member counts
router.get("/", async (_req, res) => {
  try {
    const groups = await GroupModel.find().sort({ lastScrapedAt: -1 }).lean();
    const urls = groups.map((g) => g.url);
    const counts = await MemberModel.aggregate([
      { $match: { groupUrl: { $in: urls } } },
      { $group: { _id: "$groupUrl", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c) => (countMap[c._id] = c.count));
    const out = groups.map((g) => ({ ...g, memberCount: countMap[g.url] || 0 }));
    res.json({ groups: out });
  } catch (err) {
    console.error("groups list error:", err);
    res.status(500).json({ error: "failed to list groups" });
  }
});

export default router;

