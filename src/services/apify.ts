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
  id?: string;
  text?: string;
  // Apify may use different field names - can be string or nested object
  author?: string | { name?: string; id?: string; profilePicture?: string };
  name?: string;
  commenter?: string | { name?: string; id?: string };
  from?: { name?: string; id?: string };
  user?: { name?: string; id?: string };
  authorId?: string;
  userId?: string;
  authorProfilePicture?: string;
  profilePicture?: string;
  profilePic?: string;
  date?: string;
  timestamp?: string;
  likesCount?: number;
  likes?: number;
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
    maxComments: 10,
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

  // Log first post's comments structure for debugging
  if (items.length > 0) {
    const firstPost = items[0] as RawPost;
    if (firstPost.topComments && firstPost.topComments.length > 0) {
      console.log("Sample comment structure:", JSON.stringify(firstPost.topComments[0], null, 2));
    }
  }

  console.log(`Fetched ${items.length} posts from Apify`);

  return items as RawPost[];
}
