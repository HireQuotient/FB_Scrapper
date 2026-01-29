import express from "express";
import { ApifyClient } from "apify-client";
import MemberModel from "../models/Member";
import GroupModel from "../models/Group";

const router = express.Router();

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.warn("APIFY_TOKEN not set — extract-members actor calls will fail without a token.");
}

const client = new ApifyClient({
  token: APIFY_TOKEN,
});

// Helper to run actor for a single group
async function runActorForGroup(groupUrl: string, maxItems = 10) {
  const input = {
    groupUrls: [groupUrl],
    maxItems,
  };
  const run = await client.actor("DxousIWHdXTeG79fr").call(input);
  console.log("Actor run response:", { id: run?.id, defaultDatasetId: run?.defaultDatasetId, buildId: run?.buildId });
  // fetch items from dataset (if present)
  let items: any[] = [];
  try {
    if (run?.defaultDatasetId) {
      const list = await client.dataset(run.defaultDatasetId).listItems();
      items = list.items ?? [];
    } else {
      console.log("No defaultDatasetId on run; dataset may not have been created.");
    }
  } catch (err) {
    console.error("Failed to list dataset items for run:", err);
  }

  return items || [];
}

// Limit concurrency
async function processInBatches<T, R>(items: T[], batchSize: number, fn: (t: T) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // run batch in parallel
    const res = await Promise.allSettled(batch.map(fn));
    for (const r of res) {
      if (r.status === "fulfilled") results.push(r.value);
      else console.error("Batch item failed:", r.reason);
    }
  }
  return results;
}

router.post("/", async (req, res) => {
  const { urls } = req.body as { urls?: unknown[] };
  if (!Array.isArray(urls) || urls.length === 0 || !urls.every((u) => typeof u === "string")) {
    res.status(400).json({ error: "urls must be a non-empty array of strings" });
    return;
  }

  // Process groups with limited concurrency (2 at a time)
  try {
    await processInBatches<string, any>(urls, 2, async (groupUrl) => {
      console.log("Starting actor for group:", groupUrl);
      const items = await runActorForGroup(groupUrl, 10);
      console.log(`Actor returned ${items.length} items for ${groupUrl}`);
      if (!items || items.length === 0) {
        console.log(`No items returned for ${groupUrl}`);
        // optional mock fallback for development
        if (process.env.MOCK_MEMBER_ON_EMPTY === "true") {
          console.log("Using MOCK_MEMBER_ON_EMPTY fallback to create sample members.");
          const now = new Date();
          const sample = [
            {
              groupUrl,
              member: {
                id: `mock-${Date.now()}`,
                name: "Mock Member",
                profileUrl: "https://facebook.com/mock",
                isVerified: false,
                profilePicture: "",
                bio: { text: "Mock location" },
                groupInfo: {},
              },
              scrapedAt: now,
            },
          ];
          // insert sample
          await MemberModel.create(sample);
          // update group
          await GroupModel.findOneAndUpdate({ url: groupUrl }, { url: groupUrl, lastScrapedAt: new Date() }, { upsert: true });
          console.log(`Inserted ${sample.length} mock items for ${groupUrl}`);
          return { groupUrl, count: sample.length };
        }
      }
      // Save items to DB: each item will be stored as Member record
      const now = new Date();
      const ops = items.map((itm: any) => {
        return MemberModel.create({
          groupUrl,
          groupTitle: itm?.groupInfo?.groupName || undefined,
          member: itm.member ?? itm,
          scrapedAt: itm.scrapedAt ? new Date(itm.scrapedAt) : now,
        });
      });
      await Promise.allSettled(ops);
      // update group record
      await GroupModel.findOneAndUpdate(
        { url: groupUrl },
        { url: groupUrl, lastScrapedAt: now },
        { upsert: true }
      );
      console.log(`Saved ${items.length} items for ${groupUrl}`);
      return { groupUrl, count: items.length };
    });

    res.json({ ok: true, processed: urls.length });
  } catch (err) {
    console.error("extract-members error:", err);
    res.status(500).json({ error: "extract-members failed" });
  }
});

export default router;

