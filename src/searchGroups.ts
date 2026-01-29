import "dotenv/config";

export interface FacebookGroup {
  title: string;
  url: string;
  snippet: string;
}

interface GoogleSearchItem {
  title?: string;
  link?: string;
  snippet?: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  queries?: { nextPage?: { startIndex: number }[] };
  error?: { message: string };
}

// Note: read API_KEY/CX inside the function to avoid issues with module-load timing

function buildQuery(keywords: string[]): string {
  const terms = keywords.map((k) => (k.startsWith("#") ? k.slice(1) : k)).join(" ");
  return `site:facebook.com/groups ${terms} -inurl:posts -inurl:permalink`;
}

async function fetchPage(query: string, startIndex: number, apiKey: string, cx: string): Promise<GoogleSearchResponse> {
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    start: String(startIndex),
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<GoogleSearchResponse>;
}

function isFacebookGroupUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname !== "www.facebook.com" && u.hostname !== "facebook.com") return false;
    const segments = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    return segments.length === 2 && segments[0] === "groups";
  } catch {
    return false;
  }
}

export async function searchFacebookGroups(keywords: string[], maxPages = 3): Promise<FacebookGroup[]> {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const CX = process.env.GOOGLE_CX;
  if (!API_KEY || !CX) {
    throw new Error("Missing GOOGLE_API_KEY or GOOGLE_CX in environment variables.");
  }

  const query = buildQuery(keywords);
  const groups: FacebookGroup[] = [];
  const seen = new Set<string>();
  let startIndex = 1;

  for (let page = 0; page < maxPages; page++) {
    const data = await fetchPage(query, startIndex, API_KEY, CX);
    if (data.error) throw new Error(`Google API: ${data.error.message}`);

    for (const item of data.items ?? []) {
      const url = item.link ?? "";
      if (!isFacebookGroupUrl(url) || seen.has(url)) continue;
      seen.add(url);
      groups.push({
        title: item.title ?? "",
        url,
        snippet: item.snippet ?? "",
      });
    }

    const nextPage = data.queries?.nextPage?.[0];
    if (!nextPage) break;
    startIndex = nextPage.startIndex;
  }

  return groups;
}

