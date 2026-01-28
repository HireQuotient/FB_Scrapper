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

export interface RawComment {
  text?: string;
  author?: string;
  authorId?: string;
  timestamp?: string;
  likesCount?: number;
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
  topComments?: RawComment[];
}

export async function scrapeGroup(groupUrl: string): Promise<RawPost[]> {
  const input = {
    startUrls: [{ url: groupUrl }],
    resultsLimit: 10,
    viewOption: "CHRONOLOGICAL",
    maxComments: 0,
    maxRequestRetries: 1,
  };

  console.log("Starting Apify actor run for:", groupUrl);

  const apify = getClient();
  const run = await apify.actor("apify/facebook-groups-scraper").call(input);

  console.log("Apify actor run finished, fetching results...");
  // const limit = 10;
  // const offset = 0;
  // const chunkSize = 10;


  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  console.log(items)

  console.log(`Fetched ${items.length} posts from Apify`);

  return items as RawPost[];
}
