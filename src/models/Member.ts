import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    groupUrl: { type: String, required: true, index: true },
    groupTitle: { type: String },
    member: { type: mongoose.Schema.Types.Mixed, required: true },
    scrapedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export default mongoose.models.Member || mongoose.model("Member", MemberSchema);

