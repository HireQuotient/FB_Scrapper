import express from "express";
import MemberModel from "../models/Member";
import { Job } from "../models/Job";

const router = express.Router();

// Normalize Facebook URLs to www.facebook.com
function normalizeFbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = "www.facebook.com";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url;
  }
}

// POST /api/members/query { urls: string[] } -> returns members for those groups
router.post("/query", async (req, res) => {
  const { urls } = req.body as { urls?: unknown[] };
  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "urls must be a non-empty array" });
    return;
  }

  try {
    // Query both the original URL and normalized variant to catch all members
    const allVariants = (urls as string[]).flatMap((u) => {
      const norm = normalizeFbUrl(u);
      const withoutWww = norm.replace("://www.facebook.com", "://facebook.com");
      return [u, norm, withoutWww];
    });
    const unique = [...new Set(allVariants)];
    const members = await MemberModel.find({ groupUrl: { $in: unique } }).sort({ scrapedAt: -1 }).lean().limit(1000);
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

// POST /api/members/enrich -> cross-reference members with job postings to populate email/phone
router.post("/enrich", async (req, res) => {
  const { urls } = req.body as { urls?: string[] };

  try {
    // Fetch members, optionally scoped to specific groups
    const filter: Record<string, unknown> = {};
    if (Array.isArray(urls) && urls.length > 0) {
      filter.groupUrl = { $in: urls };
    }
    const members = await MemberModel.find(filter).lean();

    if (members.length === 0) {
      res.json({ total: 0, matched: 0, enriched: 0 });
      return;
    }

    // Fetch jobs that have contact info, scoped to the same groups
    const jobFilter: Record<string, unknown> = {
      $or: [
        { contactEmail: { $ne: "" } },
        { contactPhone: { $ne: "" } },
      ],
    };
    if (Array.isArray(urls) && urls.length > 0) {
      jobFilter.groupUrl = { $in: urls };
    }
    const jobs = await Job.find(jobFilter)
      .select("userName userId contactEmail contactPhone groupUrl")
      .lean();

    if (jobs.length === 0) {
      res.json({ total: members.length, matched: 0, enriched: 0 });
      return;
    }

    // Build lookup maps for fast matching
    // Key by lowercase name+groupUrl and by userId+groupUrl
    const jobsByNameGroup = new Map<string, typeof jobs>();
    const jobsByIdGroup = new Map<string, typeof jobs>();

    for (const job of jobs) {
      if (job.userName) {
        const key = `${job.userName.toLowerCase()}::${job.groupUrl}`;
        const arr = jobsByNameGroup.get(key) || [];
        arr.push(job);
        jobsByNameGroup.set(key, arr);
      }
      if (job.userId) {
        const key = `${job.userId}::${job.groupUrl}`;
        const arr = jobsByIdGroup.get(key) || [];
        arr.push(job);
        jobsByIdGroup.set(key, arr);
      }
    }

    // Match members to jobs and build bulk updates
    const bulkOps: Parameters<typeof MemberModel.bulkWrite>[0] = [];
    let matched = 0;

    for (const member of members) {
      const m = member.member as Record<string, unknown> | undefined;
      if (!m) continue;

      const name = typeof m.name === "string" ? m.name : "";
      const id = typeof m.id === "string" ? m.id : "";
      const groupUrl = member.groupUrl || "";

      // Find matching jobs
      const matchedJobs: typeof jobs = [];
      if (name) {
        const byName = jobsByNameGroup.get(`${name.toLowerCase()}::${groupUrl}`);
        if (byName) matchedJobs.push(...byName);
      }
      if (id) {
        const byId = jobsByIdGroup.get(`${id}::${groupUrl}`);
        if (byId) matchedJobs.push(...byId);
      }

      if (matchedJobs.length === 0) continue;

      // Collect unique emails and phones from all matched jobs
      const emails = new Set<string>();
      const phones = new Set<string>();
      for (const job of matchedJobs) {
        if (job.contactEmail) emails.add(job.contactEmail);
        if (job.contactPhone) phones.add(job.contactPhone);
      }

      if (emails.size === 0 && phones.size === 0) continue;

      matched++;
      const setFields: Record<string, string> = {};
      if (emails.size > 0) {
        setFields["member.contactEmail"] = [...emails].join(", ");
      }
      if (phones.size > 0) {
        setFields["member.contactPhone"] = [...phones].join(", ");
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: member._id },
          update: { $set: setFields },
        },
      });
    }

    let enriched = 0;
    if (bulkOps.length > 0) {
      const result = await MemberModel.bulkWrite(bulkOps);
      enriched = result.modifiedCount;
    }

    res.json({ total: members.length, matched, enriched });
  } catch (err) {
    console.error("members enrich error:", err);
    res.status(500).json({ error: "failed to enrich members" });
  }
});

export default router;


