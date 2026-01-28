import { Router, Request, Response } from "express";
import { scrapeGroup, RawPost, RawComment } from "../services/apify";
import { extractJobFromText, extractJobFromImage, cleanOcrText, StructuredJob } from "../services/gemini";
import { Job, IAttachment, IComment } from "../models/Job";
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

function extractAuthorName(c: RawComment): string {
  // Handle string values
  if (typeof c.author === "string" && c.author) return c.author;
  if (typeof c.name === "string" && c.name) return c.name;
  if (typeof c.commenter === "string" && c.commenter) return c.commenter;

  // Handle nested objects
  if (typeof c.author === "object" && c.author?.name) return c.author.name;
  if (typeof c.commenter === "object" && c.commenter?.name) return c.commenter.name;
  if (c.from?.name) return c.from.name;
  if (c.user?.name) return c.user.name;

  return "";
}

function extractAuthorId(c: RawComment): string {
  if (c.authorId) return c.authorId;
  if (c.userId) return c.userId;
  if (typeof c.author === "object" && c.author?.id) return c.author.id;
  if (typeof c.commenter === "object" && c.commenter?.id) return c.commenter.id;
  if (c.from?.id) return c.from.id;
  if (c.user?.id) return c.user.id;
  return "";
}

function extractAuthorPicture(c: RawComment): string {
  if (c.authorProfilePicture) return c.authorProfilePicture;
  if (c.profilePicture) return c.profilePicture;
  if (c.profilePic) return c.profilePic;
  if (typeof c.author === "object" && c.author?.profilePicture) return c.author.profilePicture;
  return "";
}

function getTopComments(post: RawPost): IComment[] {
  if (!post.topComments || post.topComments.length === 0) return [];
  return post.topComments.map((c: RawComment) => ({
    id: c.id || "",
    text: c.text || "",
    author: extractAuthorName(c),
    authorId: extractAuthorId(c),
    authorProfilePicture: extractAuthorPicture(c),
    date: c.date || c.timestamp || "",
    likesCount: c.likesCount || c.likes || 0,
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
  topComments: IComment[];
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
    topComments: getTopComments(post),
  };
}

async function cleanMetadataOcr(metadata: PostMetadata): Promise<PostMetadata> {
  // Clean OCR texts array
  const cleanedOcrTexts: string[] = [];
  for (const ocrText of metadata.ocrTexts) {
    const cleaned = await cleanOcrText(ocrText);
    if (cleaned) {
      cleanedOcrTexts.push(cleaned);
    }
  }

  // Clean OCR in attachments
  const cleanedAttachments: IAttachment[] = [];
  for (const attachment of metadata.attachments) {
    const cleanedOcr = attachment.ocrText ? await cleanOcrText(attachment.ocrText) : "";
    cleanedAttachments.push({
      ...attachment,
      ocrText: cleanedOcr,
    });
  }

  return {
    ...metadata,
    ocrTexts: cleanedOcrTexts,
    attachments: cleanedAttachments,
  };
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;

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
    const rawPosts = await scrapeGroup(url);

    if (!rawPosts || rawPosts.length === 0) {
      res.status(422).json({
        error: "No posts could be retrieved. This may be a private group. Only public groups can be scraped.",
      });
      return;
    }

    console.log(`Processing ${rawPosts.length} posts with Gemini...`);

    // Process posts concurrently in batches of 5
    const batchSize = 5;
    const results: Array<{ job: StructuredJob; metadata: PostMetadata }> = [];

    for (let i = 0; i < rawPosts.length; i += batchSize) {
      const batch = rawPosts.slice(i, i + batchSize);
      const promises = batch.map(async (post) => {
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

        return job ? { job, metadata } : null;
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        if (r) results.push(r);
      }
    }

    console.log(`Found ${results.length} job postings out of ${rawPosts.length} posts`);

    // Save jobs to MongoDB with upsert (dedup on sourceUrl)
    let totalSaved = 0;
    for (const { job, metadata } of results) {
      try {
        const category = categorizeJob(job.jobTitle, job.description, job.rawText);
        // Clean OCR text before saving
        const cleanedMetadata = await cleanMetadataOcr(metadata);
        await Job.findOneAndUpdate(
          { sourceUrl: job.sourceUrl },
          {
            ...job,
            category,
            groupUrl: url,
            scrapedAt: new Date(),
            ...cleanedMetadata,
          },
          { upsert: true, new: true }
        );
        totalSaved++;
      } catch (err) {
        console.error("Error saving job to DB:", err);
      }
    }

    console.log(`Saved ${totalSaved} jobs to MongoDB`);
    res.json({ jobs: results.map((r) => r.job), totalSaved });
  } catch (error: unknown) {
    console.error("Scrape error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    res.status(500).json({ error: message });
  }
});

export default router;
