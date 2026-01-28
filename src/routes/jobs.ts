import { Router, Request, Response } from "express";
import { Job } from "../models/Job";
import { JOB_CATEGORIES, categorizeJob } from "../constants/jobCategories";
import {
  buildJobPipeline,
  buildCategoryCountsPipeline,
  JobQueryParams,
} from "../services/jobAggregation";

const router = Router();

// GET /api/jobs — list jobs with filtering, search, sort, pagination
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const params: JobQueryParams = {
      filter: (req.query.filter as string) || "newest",
      category: req.query.category as string,
      search: req.query.search as string,
      jobType: req.query.jobType as string,
      location: req.query.location as string,
      page: Math.max(1, parseInt(req.query.page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)),
    };

    const pipeline = buildJobPipeline(params);
    const [result] = await Job.aggregate(pipeline);

    const totalCount = result.metadata[0]?.totalCount || 0;
    const jobs = result.jobs || [];

    res.json({
      jobs,
      pagination: {
        page: params.page!,
        limit: params.limit!,
        totalCount,
        totalPages: Math.ceil(totalCount / params.limit!),
      },
      appliedFilters: {
        filter: params.filter,
        category: params.category || null,
        search: params.search || null,
        jobType: params.jobType || null,
        location: params.location || null,
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// GET /api/jobs/categories — category counts for filter bar
router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await Job.aggregate(buildCategoryCountsPipeline());

    const countMap: Record<string, number> = {};
    let totalCount = 0;
    for (const item of counts) {
      countMap[item._id] = item.count;
      totalCount += item.count;
    }

    const categories = JOB_CATEGORIES.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      count: countMap[cat.slug] || 0,
    }));

    // Add "other" if there are uncategorized jobs
    if (countMap["other"]) {
      categories.push({ slug: "other", name: "Other", count: countMap["other"] });
    }

    res.json({ categories, totalCount });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/jobs/recategorize — re-categorize all existing jobs
router.post("/recategorize", async (_req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find({});
    let updated = 0;
    const changes: Array<{ id: string; title: string; oldCategory: string; newCategory: string }> = [];

    for (const job of jobs) {
      const newCategory = categorizeJob(job.jobTitle, job.description, job.rawText);
      if (newCategory !== job.category) {
        changes.push({
          id: job._id.toString(),
          title: job.jobTitle,
          oldCategory: job.category,
          newCategory,
        });
        job.category = newCategory;
        await job.save();
        updated++;
      }
    }

    console.log(`Re-categorized ${updated} jobs out of ${jobs.length}`);
    res.json({
      message: `Re-categorized ${updated} jobs out of ${jobs.length}`,
      updated,
      total: jobs.length,
      changes,
    });
  } catch (error) {
    console.error("Error re-categorizing jobs:", error);
    res.status(500).json({ error: "Failed to re-categorize jobs" });
  }
});

// GET /api/jobs/:id — single job detail
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ job });
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

export default router;
