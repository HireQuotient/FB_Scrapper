import { Router, Request, Response } from "express";
import { Job } from "../models/Job";
import {
  buildJobPipeline,
  JobQueryParams,
} from "../services/jobAggregation";

const router = Router();

// GET /api/posts — all posts in tabular format with all fields
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const params: JobQueryParams = {
      filter: (req.query.filter as string) || "newest",
      category: req.query.category as string,
      search: req.query.search as string,
      jobType: req.query.jobType as string,
      location: req.query.location as string,
      page: Math.max(1, parseInt(req.query.page as string) || 1),
      limit: Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50)),
      includeAllFields: true,
    };

    const pipeline = buildJobPipeline(params);
    const [result] = await Job.aggregate(pipeline);

    const totalCount = result.metadata[0]?.totalCount || 0;
    const posts = result.jobs || [];

    res.json({
      posts,
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
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

export default router;
