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

// POST /api/jobs/bulk — save multiple scraped jobs after user clicks "Add to DB"
// Optimized with bulkWrite for faster performance
router.post("/bulk", async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobs, groupUrl } = req.body as {
      jobs: any[];
      groupUrl?: string;
    };

    if (!Array.isArray(jobs) || jobs.length === 0) {
      res.status(400).json({ error: "jobs must be a non-empty array" });
      return;
    }

    // Validate all jobs have sourceUrl
    const validJobs: any[] = [];
    const validationErrors: { sourceUrl?: string; message: string }[] = [];

    for (const rawJob of jobs) {
      if (!rawJob.sourceUrl) {
        validationErrors.push({
          sourceUrl: undefined,
          message: "sourceUrl is required for each job",
        });
      } else {
        validJobs.push(rawJob);
      }
    }

    if (validJobs.length === 0) {
      res.status(400).json({
        error: "No valid jobs to save",
        errorCount: validationErrors.length,
        errors: validationErrors,
      });
      return;
    }

    // Build bulk operations
    const operations = validJobs.map((rawJob) => {
      const category = categorizeJob(
        rawJob.jobTitle || "",
        rawJob.description || ""
      );

      return {
        updateOne: {
          filter: { sourceUrl: rawJob.sourceUrl },
          update: {
            $set: {
              ...rawJob,
              category,
              groupUrl: rawJob.groupUrl || groupUrl || "",
              scrapedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    // Execute bulk write
    const result = await Job.bulkWrite(operations, { ordered: false });

    const savedCount = result.upsertedCount + result.modifiedCount;

    res.json({
      savedCount,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      errorCount: validationErrors.length,
      errors: validationErrors,
    });
  } catch (error) {
    console.error("Bulk save error:", error);

    // Handle partial success in bulk write errors
    if (error && typeof error === "object" && "result" in error) {
      const bulkError = error as {
        result: { nUpserted: number; nModified: number };
        writeErrors?: Array<{ errmsg: string; op?: { q?: { sourceUrl?: string } } }>;
      };
      const writeErrors = bulkError.writeErrors || [];

      res.json({
        savedCount: bulkError.result.nUpserted + bulkError.result.nModified,
        upsertedCount: bulkError.result.nUpserted,
        modifiedCount: bulkError.result.nModified,
        errorCount: writeErrors.length,
        errors: writeErrors.map((e) => ({
          sourceUrl: e.op?.q?.sourceUrl,
          message: e.errmsg,
        })),
      });
      return;
    }

    res.status(500).json({ error: "Failed to save jobs" });
  }
});

export default router;
