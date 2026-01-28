import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return genAI;
}

export interface StructuredJob {
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
  description: string;
  requirements: string[];
  contactInfo: string;
  contactEmail: string;
  contactPhone: string;
  postedDate: string;
  sourceUrl: string;
  rawText: string;
}

const EXTRACTION_PROMPT = `You are a job posting analyzer. Extract structured job information from the following Facebook group post.
The post may include text content and/or OCR text extracted from attached images. Use ALL available text (post text + OCR text) to extract the most complete information.

Return a JSON object with these fields:
- jobTitle: The job title (string, use "" if not found)
- company: The company or employer name (string, use "" if not found)
- location: The job location (string, use "" if not found)
- salary: The salary or pay range (string, use "" if not found)
- jobType: One of "full-time", "part-time", "contract", "remote", or "" if unknown
- description: A clean summary of the job description (string)
- requirements: An array of requirements/qualifications (string array, empty array if none)
- contactInfo: How to apply or contact info (string, use "" if not found)
- contactEmail: Email address for applying/contact (string, use "" if not found)
- contactPhone: Phone number for applying/contact (string, use "" if not found)

IMPORTANT:
- If the post is NOT a job posting (e.g., it's a discussion, question, or unrelated content), return null.
- Return ONLY the JSON object or null, no markdown formatting, no code blocks.
- Extract email and phone separately from any contact information found in the text or OCR text.

Post text:
`;

export async function extractJobFromText(
  text: string,
  sourceUrl: string,
  postedDate: string,
  ocrTexts?: string[]
): Promise<StructuredJob | null> {
  const combinedText = buildCombinedText(text, ocrTexts);
  if (!combinedText || combinedText.trim().length === 0) {
    return null;
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(EXTRACTION_PROMPT + combinedText);
    const response = result.response.text().trim();

    if (response === "null" || response === "NULL") {
      return null;
    }

    // Strip markdown code block if present
    let jsonStr = response;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.jobTitle) {
      return null;
    }

    return {
      ...parsed,
      requirements: parsed.requirements || [],
      contactEmail: parsed.contactEmail || "",
      contactPhone: parsed.contactPhone || "",
      postedDate: postedDate || "",
      sourceUrl: sourceUrl || "",
      rawText: text,
    };
  } catch (error) {
    console.error("Gemini extraction error:", error);
    return null;
  }
}

function buildCombinedText(text: string, ocrTexts?: string[]): string {
  let combined = text || "";
  if (ocrTexts && ocrTexts.length > 0) {
    const ocrBlock = ocrTexts.filter(Boolean).join("\n");
    if (ocrBlock) {
      combined += "\n\n[OCR Text from attached images]:\n" + ocrBlock;
    }
  }
  return combined;
}

const OCR_CLEANUP_PROMPT = `You are a text cleaner. The following text is OCR output from a Facebook image.

Facebook often adds auto-generated descriptions like:
- "may be an image of text"
- "may be an image of 1 person"
- "may be an image of food and text"
- "No photo description available"

Your task:
1. Remove any Facebook auto-generated image descriptions
2. Keep ONLY the actual readable text content from the image (job details, contact info, requirements, etc.)
3. If there's no meaningful text content (only auto-descriptions), return an empty string
4. Clean up formatting but preserve the essential information
5. Return ONLY the cleaned text, nothing else (no explanations, no quotes)

OCR Text:
`;

export async function cleanOcrText(ocrText: string): Promise<string> {
  if (!ocrText || ocrText.trim().length === 0) {
    return "";
  }

  // Quick check - if it's just a short auto-description, skip the API call
  const lowerText = ocrText.toLowerCase();
  if (
    lowerText.startsWith("may be an image of") ||
    lowerText === "no photo description available" ||
    ocrText.trim().length < 20
  ) {
    // Check if there's actual text content after the description
    if (!lowerText.includes("text") || ocrText.length < 50) {
      return "";
    }
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(OCR_CLEANUP_PROMPT + ocrText);
    const cleaned = result.response.text().trim();

    // If Gemini returns something indicating no content, return empty
    if (
      cleaned.toLowerCase() === "empty" ||
      cleaned.toLowerCase() === "none" ||
      cleaned === '""' ||
      cleaned === "''"
    ) {
      return "";
    }

    return cleaned;
  } catch (error) {
    console.error("OCR cleanup error:", error);
    // Return original if cleanup fails, but remove obvious auto-descriptions
    if (lowerText.startsWith("may be an image of")) {
      return "";
    }
    return ocrText;
  }
}

export async function extractJobFromImage(
  imageUrl: string,
  text: string,
  sourceUrl: string,
  postedDate: string,
  ocrTexts?: string[]
): Promise<StructuredJob | null> {
  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to fetch image:", imageUrl);
      return extractJobFromText(text, sourceUrl, postedDate, ocrTexts);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });

    const combinedText = buildCombinedText(text, ocrTexts);
    const prompt =
      EXTRACTION_PROMPT + (combinedText || "(see image for job details)");

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const response = result.response.text().trim();

    if (response === "null" || response === "NULL") {
      return null;
    }

    let jsonStr = response;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.jobTitle) {
      return null;
    }

    return {
      ...parsed,
      requirements: parsed.requirements || [],
      contactEmail: parsed.contactEmail || "",
      contactPhone: parsed.contactPhone || "",
      postedDate: postedDate || "",
      sourceUrl: sourceUrl || "",
      rawText: text || "",
    };
  } catch (error) {
    console.error("Gemini image extraction error:", error);
    // Fall back to text-only extraction
    return extractJobFromText(text, sourceUrl, postedDate, ocrTexts);
  }
}
