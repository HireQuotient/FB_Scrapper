import { PipelineStage } from "mongoose";

export interface JobQueryParams {
  filter?: string;   // "newest" | "oldest" | "relevance"
  category?: string;
  search?: string;
  jobType?: string;
  location?: string;
  page?: number;
  limit?: number;
  includeAllFields?: boolean;
}

export function buildJobPipeline(params: JobQueryParams): PipelineStage[] {
  const {
    filter = "newest",
    category,
    search,
    jobType,
    location,
    page = 1,
    limit = 20,
    includeAllFields = false,
  } = params;

  const pipeline: PipelineStage[] = [];

  // $match stage
  const matchConditions: Record<string, unknown> = {};

  if (category && category !== "all") {
    matchConditions.category = category;
  }

  if (jobType) {
    matchConditions.jobType = jobType;
  }

  if (location) {
    matchConditions.location = { $regex: location, $options: "i" };
  }

  if (search) {
    matchConditions.$text = { $search: search };
  }

  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions });
  }

  // $addFields for text score when searching
  if (search) {
    pipeline.push({ $addFields: { textScore: { $meta: "textScore" } } });
  }

  // $sort stage
  let sortStage: Record<string, 1 | -1 | { $meta: "textScore" }>;
  switch (filter) {
    case "oldest":
      sortStage = { scrapedAt: 1 };
      break;
    case "relevance":
      sortStage = search
        ? { textScore: { $meta: "textScore" }, scrapedAt: -1 }
        : { scrapedAt: -1 };
      break;
    case "newest":
    default:
      sortStage = { scrapedAt: -1 };
      break;
  }
  pipeline.push({ $sort: sortStage as Record<string, 1 | -1> });

  // $facet for pagination metadata + results
  const skip = (page - 1) * limit;

  const projectStage = includeAllFields
    ? { $project: { __v: 0 } }
    : { $project: { rawText: 0, __v: 0 } };

  pipeline.push({
    $facet: {
      metadata: [{ $count: "totalCount" }],
      jobs: [
        { $skip: skip },
        { $limit: limit },
        projectStage,
      ],
    },
  });

  return pipeline;
}

export function buildCategoryCountsPipeline(): PipelineStage[] {
  return [
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 as const },
    },
  ];
}
