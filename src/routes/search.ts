import express from "express";
import { searchFacebookGroups } from "../searchGroups";

const router = express.Router();

router.post("/", async (req, res) => {
  const { keywords } = req.body as { keywords?: unknown };
  if (
    !Array.isArray(keywords) ||
    keywords.length === 0 ||
    !keywords.every((k): k is string => typeof k === "string" && k.trim() !== "")
  ) {
    res.status(400).json({ error: "keywords must be a non-empty array of strings" });
    return;
  }

  try {
    const groups = await searchFacebookGroups(keywords);
    res.json({ groups });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Search failed:", message);
    res.status(500).json({ error: message });
  }
});

export default router;

