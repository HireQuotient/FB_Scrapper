import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  const { url, title } = req.body as { url?: unknown; title?: unknown };
  if (typeof url !== "string" || url.trim() === "") {
    res.status(400).json({ error: "url must be a non-empty string" });
    return;
  }

  // For now just log the selected group and return success.
  console.log("Selected group received from frontend:", { url, title });

  res.json({ ok: true, url, title });
});

export default router;

