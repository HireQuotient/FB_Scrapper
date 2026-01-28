import { Router, Request, Response } from "express";
import { scrapeGroup, scrapeMultipleGroups, RawPost } from "../services/apify";
import { extractJobFromText, extractJobFromImage, StructuredJob } from "../services/gemini";
import { Job, IAttachment } from "../models/Job";
import { categorizeJob } from "../constants/jobCategories";

const router = Router();

function isValidFacebookGroupUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "www.facebook.com" ||
        parsed.hostname === "facebook.com" ||
        parsed.hostname === "m.facebook.com" ||
        parsed.hostname === "web.facebook.com") &&
      parsed.pathname.includes("/groups/")
    );
  } catch {
    return false;
  }
}

function getPostText(post: RawPost): string {
  return post.text || post.message || "";
}

function getPostImageUrl(post: RawPost): string | null {
  // Try attachments first (they have richer data)
  if (post.attachments && post.attachments.length > 0) {
    const a = post.attachments[0];
    return a.photo_image?.uri || a.thumbnail || null;
  }
  if (post.imageUrls && post.imageUrls.length > 0) {
    return post.imageUrls[0];
  }
  if (post.media && post.media.length > 0) {
    const m = post.media[0];
    return m.photo_image?.uri || m.thumbnail || null;
  }
  return null;
}

function getPostUrl(post: RawPost): string {
  return post.url || post.postUrl || "";
}

function getPostDate(post: RawPost): string {
  return post.date || post.time || post.timestamp || "";
}

function getOcrTexts(post: RawPost): string[] {
  if (!post.attachments || post.attachments.length === 0) return [];
  return post.attachments
    .map((a) => a.ocrText || "")
    .filter(Boolean);
}

function getAttachments(post: RawPost): IAttachment[] {
  if (!post.attachments || post.attachments.length === 0) return [];
  return post.attachments.map((a) => ({
    thumbnail: a.thumbnail || "",
    type: a.__typename || "",
    photoUrl: a.photo_image?.uri || "",
    photoHeight: a.photo_image?.height || 0,
    photoWidth: a.photo_image?.width || 0,
    url: a.url || "",
    id: a.id || "",
    ocrText: a.ocrText || "",
  }));
}

interface PostMetadata {
  facebookUrl: string;
  postTime: string;
  userName: string;
  userId: string;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  topReactionsCount: number;
  groupTitle: string;
  facebookId: string;
  attachments: IAttachment[];
  ocrTexts: string[];
}

function getPostMetadata(post: RawPost): PostMetadata {
  return {
    facebookUrl: post.facebookUrl || post.inputUrl || "",
    postTime: post.time || post.date || post.timestamp || "",
    userName: post.user?.name || post.author || "",
    userId: post.user?.id || "",
    likesCount: post.likesCount || 0,
    sharesCount: post.sharesCount || 0,
    commentsCount: post.commentsCount || 0,
    topReactionsCount: post.topReactionsCount || 0,
    groupTitle: post.groupTitle || "",
    facebookId: post.facebookId || post.id || "",
    attachments: getAttachments(post),
    ocrTexts: getOcrTexts(post),
  };
}

// Process a single post and extract job data
async function processPost(
  post: RawPost,
  groupUrl: string
): Promise<{ job: StructuredJob; metadata: PostMetadata; groupUrl: string } | null> {
  const text = getPostText(post);
  const imageUrl = getPostImageUrl(post);
  const sourceUrl = getPostUrl(post);
  const postedDate = getPostDate(post);
  const ocrTexts = getOcrTexts(post);
  const metadata = getPostMetadata(post);

  let job: StructuredJob | null;
  if (imageUrl) {
    job = await extractJobFromImage(imageUrl, text, sourceUrl, postedDate, ocrTexts);
  } else {
    job = await extractJobFromText(text, sourceUrl, postedDate, ocrTexts);
  }

  return job ? { job, metadata, groupUrl } : null;
}

// Process posts in parallel batches with concurrency control
async function processPostsBatch(
  posts: Array<{ post: RawPost; groupUrl: string }>,
  batchSize: number = 10
): Promise<Array<{ job: StructuredJob; metadata: PostMetadata; groupUrl: string }>> {
  const results: Array<{ job: StructuredJob; metadata: PostMetadata; groupUrl: string }> = [];

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(({ post, groupUrl }) => processPost(post, groupUrl))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }

    console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(posts.length / batchSize)}`);
  }

  return results;
}

// Bulk save jobs to MongoDB using bulkWrite for performance
async function bulkSaveJobs(
  jobsData: Array<{ job: StructuredJob; metadata: PostMetadata; groupUrl: string }>
): Promise<{ saved: number; errors: number }> {
  if (jobsData.length === 0) {
    return { saved: 0, errors: 0 };
  }

  const operations = jobsData.map(({ job, metadata, groupUrl }) => {
    const category = categorizeJob(job.jobTitle, job.description);
    return {
      updateOne: {
        filter: { sourceUrl: job.sourceUrl },
        update: {
          $set: {
            ...job,
            category,
            groupUrl,
            scrapedAt: new Date(),
            ...metadata,
          },
        },
        upsert: true,
      },
    };
  });

  try {
    const result = await Job.bulkWrite(operations, { ordered: false });
    return {
      saved: result.upsertedCount + result.modifiedCount,
      errors: 0,
    };
  } catch (error: unknown) {
    console.error("Bulk save error:", error);
    // Even with errors, some may have succeeded
    if (error && typeof error === "object" && "result" in error) {
      const bulkError = error as { result: { nUpserted: number; nModified: number } };
      return {
        saved: bulkError.result.nUpserted + bulkError.result.nModified,
        errors: jobsData.length - (bulkError.result.nUpserted + bulkError.result.nModified),
      };
    }
    return { saved: 0, errors: jobsData.length };
  }
}

// Single URL endpoint (original)
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { url, resultsLimit } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  if (!isValidFacebookGroupUrl(url)) {
    res.status(400).json({ error: "Invalid Facebook group URL. URL must be from facebook.com and contain /groups/" });
    return;
  }

  try {
    console.log("Scraping public Facebook group:", url);
    const rawPosts = await scrapeGroup(url, { resultsLimit });

    if (!rawPosts || rawPosts.length === 0) {
      res.status(422).json({
        error: "No posts could be retrieved. This may be a private group. Only public groups can be scraped.",
      });
      return;
    }

    console.log(`Processing ${rawPosts.length} posts with Gemini...`);

    const postsWithUrl = rawPosts.map((post) => ({ post, groupUrl: url }));
    const results = await processPostsBatch(postsWithUrl, 10);

    console.log(`Found ${results.length} job postings out of ${rawPosts.length} posts`);

    const { saved, errors } = await bulkSaveJobs(results);

    console.log(`Saved ${saved} jobs to MongoDB (${errors} errors)`);
    res.json({ jobs: results.map((r) => r.job), totalSaved: saved, errors });
  } catch (error: unknown) {
    console.error("Scrape error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    res.status(500).json({ error: message });
  }
});

// Batch URL endpoint - scrape multiple groups efficiently
router.post("/batch", async (req: Request, res: Response): Promise<void> => {
  const { urls, resultsLimit, concurrency } = req.body as {
    urls: string[];
    resultsLimit?: number;
    concurrency?: number;
  };

  // Validate input
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "urls must be a non-empty array of Facebook group URLs" });
    return;
  }

  if (urls.length > 20) {
    res.status(400).json({ error: "Maximum 20 URLs allowed per batch request" });
    return;
  }

  // Validate all URLs first
  const invalidUrls = urls.filter((url) => !isValidFacebookGroupUrl(url));
  if (invalidUrls.length > 0) {
    res.status(400).json({
      error: "Invalid Facebook group URLs found",
      invalidUrls,
    });
    return;
  }

  try {
    const startTime = Date.now();
    console.log(`Starting batch scrape for ${urls.length} groups...`);

    // Step 1: Scrape all groups in parallel with concurrency control
    const groupPostsMap = await scrapeMultipleGroups(urls, {
      resultsLimit,
      concurrency: concurrency ?? 3,
    });

    // Collect all posts with their group URLs
    const allPosts: Array<{ post: RawPost; groupUrl: string }> = [];
    const urlResults: Record<string, { postsFound: number; error?: string }> = {};

    for (const [groupUrl, posts] of groupPostsMap) {
      if (posts.length === 0) {
        urlResults[groupUrl] = { postsFound: 0, error: "No posts retrieved (may be private group)" };
      } else {
        urlResults[groupUrl] = { postsFound: posts.length };
        for (const post of posts) {
          allPosts.push({ post, groupUrl });
        }
      }
    }

    console.log(`Total posts collected: ${allPosts.length} from ${urls.length} groups`);

    if (allPosts.length === 0) {
      res.status(422).json({
        error: "No posts could be retrieved from any group",
        urlResults,
      });
      return;
    }

    // Step 2: Process all posts with Gemini in parallel batches
    console.log("Processing posts with Gemini...");
    const jobResults = await processPostsBatch(allPosts, 15); // Higher batch size for speed

    console.log(`Extracted ${jobResults.length} jobs from ${allPosts.length} posts`);

    // Step 3: Bulk save all jobs to MongoDB
    const { saved, errors } = await bulkSaveJobs(jobResults);

    const totalTime = Date.now() - startTime;
    console.log(`Batch scrape completed in ${totalTime}ms - Saved ${saved} jobs`);

    // Aggregate results by group
    const jobsByGroup: Record<string, StructuredJob[]> = {};
    for (const { job, groupUrl } of jobResults) {
      if (!jobsByGroup[groupUrl]) {
        jobsByGroup[groupUrl] = [];
      }
      jobsByGroup[groupUrl].push(job);
    }

    res.json({
      summary: {
        totalGroups: urls.length,
        totalPostsScraped: allPosts.length,
        totalJobsExtracted: jobResults.length,
        totalJobsSaved: saved,
        totalErrors: errors,
        processingTimeMs: totalTime,
      },
      urlResults,
      jobsByGroup,
      allJobs: jobResults.map((r) => r.job),
    });
  } catch (error: unknown) {
    console.error("Batch scrape error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    res.status(500).json({ error: message });
  }
});

export default router;
