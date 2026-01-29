import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true },
    title: { type: String },
    lastScrapedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model("Group", GroupSchema);

