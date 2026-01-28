import mongoose, { Schema, Document } from "mongoose";

export interface IAttachment {
  thumbnail?: string;
  type?: string;
  photoUrl?: string;
  photoHeight?: number;
  photoWidth?: number;
  url?: string;
  id?: string;
  ocrText?: string;
}

export interface IComment {
  id?: string;
  text?: string;
  author?: string;
  authorId?: string;
  authorProfilePicture?: string;
  date?: string;
  likesCount?: number;
}

export interface IJob extends Document {
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
  category: string;
  groupUrl: string;
  scrapedAt: Date;
  // Facebook post metadata
  facebookUrl: string;
  postTime: string;
  userName: string;
  userId: string;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  topReactionsCount: number;
  groupTitle: string;
  facebookId: string;
  attachments: IAttachment[];
  ocrTexts: string[];
  topComments: IComment[];
}

const AttachmentSchema = new Schema(
  {
    thumbnail: { type: String, default: "" },
    type: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    photoHeight: { type: Number, default: 0 },
    photoWidth: { type: Number, default: 0 },
    url: { type: String, default: "" },
    id: { type: String, default: "" },
    ocrText: { type: String, default: "" },
  },
  { _id: false }
);

const CommentSchema = new Schema(
  {
    id: { type: String, default: "" },
    text: { type: String, default: "" },
    author: { type: String, default: "" },
    authorId: { type: String, default: "" },
    authorProfilePicture: { type: String, default: "" },
    date: { type: String, default: "" },
    likesCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const JobSchema = new Schema<IJob>(
  {
    jobTitle: { type: String, required: true },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    salary: { type: String, default: "" },
    jobType: { type: String, default: "" },
    description: { type: String, default: "" },
    requirements: { type: [String], default: [] },
    contactInfo: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    postedDate: { type: String, default: "" },
    sourceUrl: { type: String, required: true, unique: true },
    rawText: { type: String, default: "" },
    category: { type: String, default: "other", index: true },
    groupUrl: { type: String, default: "" },
    scrapedAt: { type: Date, default: Date.now, index: true },
    // Facebook post metadata
    facebookUrl: { type: String, default: "" },
    postTime: { type: String, default: "" },
    userName: { type: String, default: "" },
    userId: { type: String, default: "" },
    likesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    topReactionsCount: { type: Number, default: 0 },
    groupTitle: { type: String, default: "" },
    facebookId: { type: String, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },
    ocrTexts: { type: [String], default: [] },
    topComments: { type: [CommentSchema], default: [] },
  },
  { timestamps: true }
);

JobSchema.index(
  { jobTitle: "text", company: "text", description: "text", rawText: "text" },
  {
    weights: { jobTitle: 10, company: 5, description: 3, rawText: 1 },
    name: "job_text_search",
  }
);

export const Job = mongoose.model<IJob>("job_datas", JobSchema);
