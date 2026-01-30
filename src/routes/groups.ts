import express from "express";
import GroupModel from "../models/Group";
import MemberModel from "../models/Member";

const router = express.Router();

// GET /api/groups -> list groups with member counts
router.get("/", async (_req, res) => {
  try {
    // Aggregate groups from Members, normalizing URLs and deduplicating by member name
    const memberGroups = await MemberModel.aggregate([
      {
        $addFields: {
          normalizedUrl: {
            $replaceOne: {
              input: "$groupUrl",
              find: "://facebook.com/",
              replacement: "://www.facebook.com/",
            },
          },
        },
      },
      // Deduplicate: same member name within the same normalized group = 1 person
      {
        $group: {
          _id: { url: "$normalizedUrl", name: "$member.name" },
          groupTitle: { $first: "$groupTitle" },
          lastScrapedAt: { $max: "$scrapedAt" },
          originalUrl: { $first: "$groupUrl" },
        },
      },
      // Now count unique members per group
      {
        $group: {
          _id: "$_id.url",
          count: { $sum: 1 },
          groupTitle: { $first: "$groupTitle" },
          lastScrapedAt: { $max: "$lastScrapedAt" },
          originalUrl: { $first: "$originalUrl" },
        },
      },
      { $sort: { lastScrapedAt: -1, groupTitle: 1 } },
    ]);

    // Also fetch Group records for any extra metadata (title)
    const groupDocs = await GroupModel.find().lean();
    const groupMeta: Record<string, { title?: string }> = {};
    for (const g of groupDocs) {
      groupMeta[g.url] = { title: g.title };
    }

    const out = memberGroups.map((mg) => ({
      url: mg.originalUrl,
      title: mg.groupTitle || groupMeta[mg._id]?.title || groupMeta[mg.originalUrl]?.title || mg._id,
      memberCount: mg.count,
      lastScrapedAt: mg.lastScrapedAt,
    }));

    res.json({ groups: out });
  } catch (err) {
    console.error("groups list error:", err);
    res.status(500).json({ error: "failed to list groups" });
  }
});

export default router;

