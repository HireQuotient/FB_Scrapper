import { ApifyClient } from "apify-client";

let client: ApifyClient;

function getClient(): ApifyClient {
  if (!client) {
    client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  }
  return client;
}

export interface RawPostAttachment {
  thumbnail?: string;
  __typename?: string;
  photo_image?: { uri?: string; height?: number; width?: number };
  __isMedia?: string;
  accent_color?: string;
  photo_product_tags?: unknown[];
  url?: string;
  id?: string;
  ocrText?: string;
}

export interface RawPost {
  text?: string;
  message?: string;
  imageUrls?: string[];
  media?: Array<{ thumbnail?: string; photo_image?: { uri?: string } }>;
  attachments?: RawPostAttachment[];
  author?: string;
  user?: { id?: string; name?: string };
  date?: string;
  time?: string;
  timestamp?: string;
  url?: string;
  postUrl?: string;
  facebookUrl?: string;
  inputUrl?: string;
  id?: string;
  legacyId?: string;
  facebookId?: string;
  likesCount?: number;
  sharesCount?: number;
  commentsCount?: number;
  topReactionsCount?: number;
  groupTitle?: string;
  feedbackId?: string;
}

export interface ScrapeOptions {
  resultsLimit?: number;
}

export async function scrapeGroup(groupUrl: string, options?: ScrapeOptions): Promise<RawPost[]> {
  const input = {
    startUrls: [{ url: groupUrl }],
    resultsLimit: options?.resultsLimit ?? 100,
    viewOption: "CHRONOLOGICAL",
    maxComments: 0,
    maxRequestRetries: 1,
  };

  console.log("Starting Apify actor run for:", groupUrl);

  const apify = getClient();
  const run = await apify.actor("apify/facebook-groups-scraper").call(input);

  console.log("Apify actor run finished, fetching results...");

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  console.log(`Fetched ${items.length} posts from Apify`);

  return items as RawPost[];
}

/**
 * Scrape multiple groups in parallel with concurrency control
 */
export async function scrapeMultipleGroups(
  groupUrls: string[],
  options?: ScrapeOptions & { concurrency?: number }
): Promise<Map<string, RawPost[]>> {
  const concurrency = options?.concurrency ?? 3; // Default 3 concurrent Apify calls
  const results = new Map<string, RawPost[]>();

  // Process URLs in chunks to control concurrency
  for (let i = 0; i < groupUrls.length; i += concurrency) {
    const chunk = groupUrls.slice(i, i + concurrency);

    const chunkResults = await Promise.allSettled(
      chunk.map(async (url) => {
        const posts = await scrapeGroup(url, options);
        return { url, posts };
      })
    );

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.set(result.value.url, result.value.posts);
      } else {
        console.error("Failed to scrape group:", result.reason);
        results.set(chunk[chunkResults.indexOf(result)], []);
      }
    }
  }

  return results;
}
